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

  const filtered = filter
    ? bookings.filter((b) => b.date === filter)
    : bookings;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📋 Admin — All Bookings</h1>
            <p className="text-gray-500 text-sm">{bookings.length} total booking{bookings.length !== 1 ? "s" : ""}</p>
          </div>
          <a href="/" className="text-sm text-blue-600 hover:underline">← Back to form</a>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Filter by date:</label>
          <input
            type="date"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {filter && <button onClick={() => setFilter("")} className="text-sm text-blue-600 hover:underline">Clear</button>}
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No bookings found.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((b) => (
              <div key={b.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${b.type === "round_trip" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                      {b.type === "round_trip" ? "🔄 Round Trip" : "🚗 Drop Off"}
                    </span>
                    <span className="ml-2 text-xs text-gray-400">#{b.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{b.date}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                  <div><span className="text-gray-400">PIC:</span> <span className="font-medium">{b.picName}</span></div>
                  <div><span className="text-gray-400">Contact:</span> {b.picContact}</div>
                  <div><span className="text-gray-400">Guests:</span> {b.totalGuests}</div>
                  <div><span className="text-gray-400">Pick-up:</span> {fmt12(b.pickupTime)}{b.endTime ? ` → ${fmt12(b.endTime)}` : ""}</div>
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
