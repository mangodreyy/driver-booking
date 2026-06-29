import Redis from "ioredis";
import { promises as fs } from "fs";
import path from "path";

export interface Booking {
  id: string;
  date: string;
  type: "drop_off" | "round_trip";
  picName: string;
  picContact: string;
  totalGuests: number;
  pickupTime: string; // HH:MM 24h
  endTime?: string;   // HH:MM 24h, round trip only
  pickupPoint: string;
  dropOffPoint: string;
  createdAt: string;
}

const KEY = "bookings";
const DATA_FILE = path.join(process.cwd(), "data", "bookings.json");

let redis: Redis | null = null;

function initializeRedis() {
  if (redis) return redis;
  try {
    if (process.env.REDIS_URL) {
      redis = new Redis(process.env.REDIS_URL);
      return redis;
    }
    return null;
  } catch (error) {
    console.error("Failed to initialize Redis:", error);
    return null;
  }
}

export class StorageNotConfiguredError extends Error {
  constructor() {
    super("Booking storage is not set up. Set REDIS_URL environment variable.");
    this.name = "StorageNotConfiguredError";
  }
}

function hasRedisConfig(): boolean {
  return Boolean(process.env.REDIS_URL);
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
  if (hasRedisConfig()) {
    try {
      const redisClient = initializeRedis();
      if (redisClient) {
        const data = await redisClient.get(KEY);
        return data ? JSON.parse(data) : [];
      }
    } catch (error) {
      console.error("Redis read error:", error);
      return readFromFile();
    }
  }
  if (isVercel()) throw new StorageNotConfiguredError();
  return readFromFile();
}

export async function writeBookings(bookings: Booking[]): Promise<void> {
  if (hasRedisConfig()) {
    try {
      const redisClient = initializeRedis();
      if (redisClient) {
        await redisClient.set(KEY, JSON.stringify(bookings));
        return;
      }
    } catch (error) {
      console.error("Redis write error:", error);
      await writeToFile(bookings);
      return;
    }
  }
  if (isVercel()) throw new StorageNotConfiguredError();
  await writeToFile(bookings);
}

/** Convert "HH:MM" to minutes since midnight */
export function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Get the effective blocked range for a booking.
 * Drop off: pickupTime to pickupTime + 60min
 * Round trip: pickupTime to endTime
 */
export function getBlockedRange(b: Booking): { start: number; end: number } {
  const start = toMinutes(b.pickupTime);
  const end =
    b.type === "round_trip" && b.endTime
      ? toMinutes(b.endTime)
      : start + 60;
  return { start, end };
}

/**
 * Returns all booked time ranges for a given date as [start, end] minute pairs.
 * Used by the frontend to filter out unavailable slots.
 */
export function getBookedRanges(date: string, bookings: Booking[]): { start: number; end: number }[] {
  return bookings
    .filter((b) => b.date === date)
    .map(getBlockedRange);
}

/**
 * Check if a proposed booking clashes with any existing one.
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
    end:
      type === "round_trip" && endTime
        ? toMinutes(endTime)
        : toMinutes(pickupTime) + 60,
  };

  const same = existingBookings.filter((b) => b.date === date);

  for (const b of same) {
    const existing = getBlockedRange(b);
    if (proposed.start < existing.end && existing.start < proposed.end) {
      return { clashes: true, clashWith: b };
    }
  }
  return { clashes: false };
}

// ── Office hours & holiday helpers ──────────────────────────────────────────

/** Returns true if date is a weekday (Mon–Fri) */
export function isWeekday(dateStr: string): boolean {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay(); // 0=Sun, 6=Sat
  return day >= 1 && day <= 5;
}

/**
 * Returns the minimum bookable time for a given date.
 * - Future dates: "09:00"
 * - Today: current time rounded up to next 30-min slot, minimum "09:00"
 */
export function getMinPickupTime(dateStr: string): string {
  const todayStr = new Date().toISOString().split("T")[0];
  if (dateStr !== todayStr) return "09:00";

  const now = new Date();
  const totalMinutes = now.getHours() * 60 + now.getMinutes();
  // Round up to next 30-min slot
  const next30 = Math.ceil(totalMinutes / 30) * 30;
  const h = Math.floor(next30 / 60).toString().padStart(2, "0");
  const m = (next30 % 60).toString().padStart(2, "0");
  const slot = `${h}:${m}`;
  // Must be at least 09:00 and no later than 18:00
  if (slot < "09:00") return "09:00";
  return slot;
}
