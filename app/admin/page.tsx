"use client";

import { useEffect, useState } from "react";

interface Booking {
  id: string;
  date: string;
  type: "drop_off" | "round_trip";
  picName: string;
  picContact: string;
  totalGuests: number;
  pickupTime: string;
  endTime?: string;
  pickupPoint: string;
  dropOffPoint: string;
  createdAt: string;
}

function fmt12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export default function AdminPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/bookings");
    const data = await res.json();
    setBookings(data.sort((a: Booking, b: Booking) => a.date.localeCompare(b.date) || a.pickupTime.localeCompare(b.pickupTime)));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = filter ? bookings.filter((b) => b.date === filter) : bookings;

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: "#fff7f0" }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "#ff6900" }}>
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900">All Bookings</h1>
            </div>
            <p className="text-gray-400 text-sm">{bookings.length} total booking{bookings.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="text-sm font-medium px-3 py-1.5 rounded-lg" style={{ color: "#ff6900", background: "#fff0e0" }}>← New Booking</a>
            <button
              onClick={async () => {
                await fetch("/api/admin/login", { method: "DELETE" });
                window.location.href = "/admin/login";
              }}
              className="text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4 mb-4 flex items-center gap-3" style={{ borderColor: "#ffe0c0" }}>
          <label className="text-sm font-medium text-gray-700">Filter by date:</label>
          <input
            type="date"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          {filter && <button onClick={() => setFilter("")} className="text-sm font-medium" style={{ color: "#ff6900" }}>Clear</button>}
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No bookings found.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((b) => (
              <div key={b.id} className="bg-white rounded-xl border shadow-sm p-5" style={{ borderColor: "#ffe8d0" }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={b.type === "round_trip"
                        ? { background: "#f3e8ff", color: "#7c3aed" }
                        : { background: "#fff0e0", color: "#ff6900" }}>
                      {b.type === "round_trip" ? "🔄 Round Trip" : "🚗 Drop Off"}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">#{b.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{b.date}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                  <div><span className="text-gray-400">PIC:</span> <span className="font-medium">{b.picName}</span></div>
                  <div><span className="text-gray-400">Contact:</span> {b.picContact}</div>
                  <div><span className="text-gray-400">Guests:</span> {b.totalGuests}</div>
                  <div><span className="text-gray-400">Time:</span> {fmt12(b.pickupTime)}{b.endTime ? ` → ${fmt12(b.endTime)}` : ""}</div>
                  <div className="col-span-2"><span className="text-gray-400">From:</span> {b.pickupPoint}</div>
                  <div className="col-span-2"><span className="text-gray-400">To:</span> {b.dropOffPoint}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
