import fs from "fs";
import path from "path";

export interface Booking {
  id: string;
  date: string; // YYYY-MM-DD
  type: "drop_off" | "round_trip";
  picName: string;
  picContact: string;
  totalGuests: number;
  pickupTime: string; // HH:MM (24h)
  endTime?: string; // HH:MM (24h) — round trip only
  pickupPoint: string;
  dropOffPoint: string;
  createdAt: string;
}

const DATA_FILE = path.join(process.cwd(), "data", "bookings.json");

function ensureFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]");
}

export function readBookings(): Booking[] {
  ensureFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}

export function writeBookings(bookings: Booking[]) {
  ensureFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(bookings, null, 2));
}

/** Convert "HH:MM" to minutes since midnight */
function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Check if a proposed booking clashes with any existing booking on the same date.
 * Driver is busy from pickupTime until endTime (round trip) or pickupTime+1h (drop off).
 */
export function hasClash(
  date: string,
  pickupTime: string,
  endTime: string | undefined,
  type: "drop_off" | "round_trip",
  existingBookings: Booking[]
): { clashes: boolean; clashWith?: Booking } {
  const proposed = {
    start: toMinutes(pickupTime),
    // drop off: assume 1h block; round trip: until endTime
    end:
      type === "round_trip" && endTime
        ? toMinutes(endTime)
        : toMinutes(pickupTime) + 60,
  };

  const same = existingBookings.filter((b) => b.date === date);

  for (const b of same) {
    const existing = {
      start: toMinutes(b.pickupTime),
      end:
        b.type === "round_trip" && b.endTime
          ? toMinutes(b.endTime)
          : toMinutes(b.pickupTime) + 60,
    };
    // Overlap check: two intervals overlap if start1 < end2 && start2 < end1
    if (proposed.start < existing.end && existing.start < proposed.end) {
      return { clashes: true, clashWith: b };
    }
  }
  return { clashes: false };
}
