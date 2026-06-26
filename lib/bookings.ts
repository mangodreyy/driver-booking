import { kv } from "@vercel/kv";

export interface Booking {
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

const KEY = "bookings";

export async function readBookings(): Promise<Booking[]> {
  const data = await kv.get<Booking[]>(KEY);
  return data ?? [];
}

export async function writeBookings(bookings: Booking[]): Promise<void> {
  await kv.set(KEY, bookings);
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function hasClash(
  date: string,
  pickupTime: string,
  endTime: string | undefined,
  type: "drop_off" | "round_trip",
  existingBookings: Booking[]
): { clashes: boolean; clashWith?: Booking } {
  const proposed = {
    start: toMinutes(pickupTime),
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
    if (proposed.start < existing.end && existing.start < proposed.end) {
      return { clashes: true, clashWith: b };
    }
  }
  return { clashes: false };
}
