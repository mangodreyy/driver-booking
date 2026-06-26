"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

const DRIVER_START = "09:00";
const DRIVER_END = "18:00";
const PICKUP_POINT_DEFAULT = "Bangsar South Office Lobby";
const DRIVER_NAME = "Azlan";
const DRIVER_PHONE = "+60 11-3766 3532";

function generateTimeSlots(start: string, end: string, intervalMin = 30): string[] {
  const slots: string[] = [];
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let cur = sh * 60 + sm;
  const endMin = eh * 60 + em;
  while (cur <= endMin) {
    const h = Math.floor(cur / 60).toString().padStart(2, "0");
    const m = (cur % 60).toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
    cur += intervalMin;
  }
  return slots;
}

function fmt12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

const ALL_SLOTS = generateTimeSlots(DRIVER_START, DRIVER_END, 30);

type BookingType = "drop_off" | "round_trip";

interface FormState {
  date: string;
  type: BookingType;
  picName: string;
  picContact: string;
  totalGuests: string;
  pickupTime: string;
  endTime: string;
  pickupPoint: string;
  dropOffPoint: string;
}

const TODAY = new Date().toISOString().split("T")[0];

export default function BookingPage() {
  const [form, setForm] = useState<FormState>({
    date: TODAY,
    type: "drop_off",
    picName: "",
    picContact: "",
    totalGuests: "",
    pickupTime: "",
    endTime: "",
    pickupPoint: PICKUP_POINT_DEFAULT,
    dropOffPoint: "",
  });

  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [availabilityMsg, setAvailabilityMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  const [success, setSuccess] = useState<{ waLink: string; bookingId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const endTimeSlots = form.pickupTime
    ? ALL_SLOTS.filter((s) => s > form.pickupTime)
    : ALL_SLOTS;

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setAvailabilityMsg(null);
    setError(null);
  }

  async function checkAvailability() {
    if (!form.date || !form.pickupTime) return;
    setChecking(true);
    setAvailabilityMsg(null);
    try {
      const res = await fetch("/api/check-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: form.date,
          pickupTime: form.pickupTime,
          endTime: form.type === "round_trip" ? form.endTime : undefined,
          type: form.type,
        }),
      });
      const data = await res.json();
      setAvailabilityMsg({ ok: data.available, msg: data.message || "Time slot is available!" });
    } catch {
      setAvailabilityMsg({ ok: false, msg: "Could not check availability. Try again." });
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (form.pickupTime && (form.type === "drop_off" || form.endTime)) {
      const t = setTimeout(checkAvailability, 600);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.pickupTime, form.endTime, form.date, form.type]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (availabilityMsg && !availabilityMsg.ok) {
      setError("Please fix the time clash before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          totalGuests: Number(form.totalGuests),
          endTime: form.type === "round_trip" ? form.endTime : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit booking.");
      } else {
        setSuccess({ waLink: data.waLink, bookingId: data.booking.id.slice(0, 8).toUpperCase() });
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white";

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#fff7f0" }}>
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#fff0e0" }}>
            <svg className="w-8 h-8" style={{ color: "#ff6900" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
          <p className="text-gray-500 mb-1 text-sm">Booking ID: <span className="font-mono font-semibold text-gray-800">#{success.bookingId}</span></p>
          <p className="text-gray-400 mb-6 text-sm">Slot reserved. Send the details to the driver via WhatsApp.</p>

          {/* Driver info card */}
          <div className="rounded-xl p-4 mb-5 text-left flex items-center gap-3" style={{ background: "#fff7f0", border: "1px solid #ffe0c0" }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ background: "#ff6900" }}>
              {DRIVER_NAME[0]}
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Your Driver</p>
              <p className="font-semibold text-gray-900 text-sm">{DRIVER_NAME}</p>
              <p className="text-sm text-gray-600">{DRIVER_PHONE}</p>
            </div>
          </div>

          <a
            href={success.waLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-xl transition-colors w-full justify-center mb-3"
            style={{ background: "#25d366" }}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Send to Azlan via WhatsApp
          </a>
          <button
            onClick={() => {
              setSuccess(null);
              setForm({ date: TODAY, type: "drop_off", picName: "", picContact: "", totalGuests: "", pickupTime: "", endTime: "", pickupPoint: PICKUP_POINT_DEFAULT, dropOffPoint: "" });
              setAvailabilityMsg(null);
            }}
            className="text-sm hover:underline"
            style={{ color: "#ff6900" }}
          >
            Make another booking
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: "#fff7f0" }}>
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Image
              src="/xiaomi-logo.png"
              alt="Xiaomi Malaysia"
              width={32}
              height={32}
              className="rounded-lg"
              priority
            />
            <span className="text-xs font-semibold tracking-widest uppercase text-gray-400">Xiaomi Malaysia</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Driver Booking</h1>
          <p className="text-gray-500 text-sm">Available daily, 9:00 AM – 6:00 PM</p>
        </div>

        {/* Driver info banner */}
        <div className="rounded-xl p-4 mb-5 flex items-center gap-3" style={{ background: "white", border: "1px solid #ffe0c0" }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: "#ff6900" }}>
            {DRIVER_NAME[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400">Your Driver</p>
            <p className="font-semibold text-gray-900 text-sm">{DRIVER_NAME}</p>
            <p className="text-sm text-gray-500">{DRIVER_PHONE}</p>
          </div>
          <a
            href={`tel:${DRIVER_PHONE.replace(/\s|-/g, "")}`}
            className="text-xs font-medium px-3 py-1.5 rounded-lg flex-shrink-0"
            style={{ background: "#fff0e0", color: "#ff6900" }}
          >
            Call
          </a>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border p-6 space-y-5" style={{ borderColor: "#ffe8d0" }}>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date <span style={{ color: "#ff6900" }}>*</span></label>
            <input
              type="date"
              required
              min={TODAY}
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Trip Type <span style={{ color: "#ff6900" }}>*</span></label>
            <div className="grid grid-cols-2 gap-3">
              {(["drop_off", "round_trip"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { set("type", t); set("endTime", ""); }}
                  className="py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all"
                  style={
                    form.type === t
                      ? { borderColor: "#ff6900", background: "#fff0e0", color: "#ff6900" }
                      : { borderColor: "#e5e7eb", color: "#6b7280" }
                  }
                >
                  {t === "drop_off" ? "🚗 Drop Off" : "🔄 Round Trip"}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              {form.type === "drop_off"
                ? "One-way trip. Driver drops guests off and returns."
                : "Driver drops off and picks guests up again to return to office."}
            </p>
          </div>

          <div className="border-t" style={{ borderColor: "#fff0e0" }} />

          {/* PIC */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PIC Name <span style={{ color: "#ff6900" }}>*</span></label>
              <input type="text" required placeholder="Full name" value={form.picName} onChange={(e) => set("picName", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact No. <span style={{ color: "#ff6900" }}>*</span></label>
              <input type="tel" required placeholder="01X-XXXXXXX" value={form.picContact} onChange={(e) => set("picContact", e.target.value)} className={inputClass} />
            </div>
          </div>

          {/* Total Guests */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Guests <span style={{ color: "#ff6900" }}>*</span></label>
            <input type="number" required min={1} placeholder="e.g. 4" value={form.totalGuests} onChange={(e) => set("totalGuests", e.target.value)} className={inputClass} />
          </div>

          <div className="border-t" style={{ borderColor: "#fff0e0" }} />

          {/* Pick-up Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pick-up Time <span style={{ color: "#ff6900" }}>*</span></label>
            <select
              required
              value={form.pickupTime}
              onChange={(e) => { set("pickupTime", e.target.value); set("endTime", ""); }}
              className={inputClass}
            >
              <option value="">Select time</option>
              {ALL_SLOTS.map((s) => (
                <option key={s} value={s}>{fmt12(s)}</option>
              ))}
            </select>
          </div>

          {/* End Time (round trip only) */}
          {form.type === "round_trip" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Return to Office Time <span style={{ color: "#ff6900" }}>*</span>
                <span className="text-gray-400 font-normal ml-1">(pick-up time to head back)</span>
              </label>
              <select
                required
                value={form.endTime}
                onChange={(e) => set("endTime", e.target.value)}
                disabled={!form.pickupTime}
                className={inputClass + " disabled:bg-gray-50 disabled:text-gray-400"}
              >
                <option value="">Select return time</option>
                {endTimeSlots.map((s) => (
                  <option key={s} value={s}>{fmt12(s)}</option>
                ))}
              </select>
            </div>
          )}

          {/* Availability */}
          {checking && (
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#ff6900", borderTopColor: "transparent" }} />
              Checking availability…
            </div>
          )}
          {availabilityMsg && !checking && (
            <div className={`text-sm px-3 py-2 rounded-lg ${availabilityMsg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {availabilityMsg.ok ? "✅ Time slot is available!" : `⚠️ ${availabilityMsg.msg}`}
            </div>
          )}

          {/* Pick-up Point */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pick-up Point <span style={{ color: "#ff6900" }}>*</span></label>
            <input type="text" required value={form.pickupPoint} onChange={(e) => set("pickupPoint", e.target.value)} className={inputClass} />
          </div>

          {/* Drop-off Point */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Drop-off Point <span style={{ color: "#ff6900" }}>*</span></label>
            <input type="text" required placeholder="Destination address" value={form.dropOffPoint} onChange={(e) => set("dropOffPoint", e.target.value)} className={inputClass} />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting || (!!availabilityMsg && !availabilityMsg.ok)}
            className="w-full text-white font-semibold py-3 rounded-xl transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: submitting || (!!availabilityMsg && !availabilityMsg.ok) ? "#ccc" : "#ff6900" }}
          >
            {submitting ? "Submitting…" : "Confirm Booking"}
          </button>
        </form>
      </div>
    </div>
  );
}
