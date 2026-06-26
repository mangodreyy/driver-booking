import { kv } from "@vercel/kv";
import { promises as fs } from "fs";
import path from "path";

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
const DATA_FILE = path.join(process.cwd(), "data", "bookings.json");

export class StorageNotConfiguredError extends Error {
  constructor() {
    super(
      "Booking storage is not set up. In Vercel: Project → Storage → Create KV Database → Connect to this project → Redeploy."
    );
    this.name = "StorageNotConfiguredError";
  }
}

function hasKvConfig(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function isVercel(): boolean {
  return Boolean(process.env.VERCEL);
}

async function readFromFile(): Promise<Booking[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as Booking[];
  } catch {
    return [];
  }
}

async function writeToFile(bookings: Booking[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(bookings, null, 2));
}

export async function readBookings(): Promise<Booking[]> {
  if (hasKvConfig()) {
    const data = await kv.get<Booking[]>(KEY);
    return data ?? [];
  }

  if (isVercel()) {
    throw new StorageNotConfiguredError();
  }

  return readFromFile();
}

export async function writeBookings(bookings: Booking[]): Promise<void> {
  if (hasKvConfig()) {
    await kv.set(KEY, bookings);
    return;
  }

  if (isVercel()) {
    throw new StorageNotConfiguredError();
  }

  await writeToFile(bookings);
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
