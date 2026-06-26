// import { kv } from "@vercel/kv";
// import { promises as fs } from "fs";
// import path from "path";

// export interface Booking {
//   id: string;
//   date: string;
//   type: "drop_off" | "round_trip";
//   picName: string;
//   picContact: string;
//   totalGuests: number;
//   pickupTime: string;
//   endTime?: string;
//   pickupPoint: string;
//   dropOffPoint: string;
//   createdAt: string;
// }

// const KEY = "bookings";
// const DATA_FILE = path.join(process.cwd(), "data", "bookings.json");

// export class StorageNotConfiguredError extends Error {
//   constructor() {
//     super(
//       "Booking storage is not set up. In Vercel: Project → Storage → Create KV Database → Connect to this project → Redeploy."
//     );
//     this.name = "StorageNotConfiguredError";
//   }
// }

// function hasKvConfig(): boolean {
//   return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
// }

// function isVercel(): boolean {
//   return Boolean(process.env.VERCEL);
// }

// async function readFromFile(): Promise<Booking[]> {
//   try {
//     const raw = await fs.readFile(DATA_FILE, "utf-8");
//     return JSON.parse(raw) as Booking[];
//   } catch {
//     return [];
//   }
// }

// async function writeToFile(bookings: Booking[]): Promise<void> {
//   await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
//   await fs.writeFile(DATA_FILE, JSON.stringify(bookings, null, 2));
// }

// export async function readBookings(): Promise<Booking[]> {
//   if (hasKvConfig()) {
//     const data = await kv.get<Booking[]>(KEY);
//     return data ?? [];
//   }

//   if (isVercel()) {
//     throw new StorageNotConfiguredError();
//   }

//   return readFromFile();
// }

// export async function writeBookings(bookings: Booking[]): Promise<void> {
//   if (hasKvConfig()) {
//     await kv.set(KEY, bookings);
//     return;
//   }

//   if (isVercel()) {
//     throw new StorageNotConfiguredError();
//   }

//   await writeToFile(bookings);
// }

// function toMinutes(t: string): number {
//   const [h, m] = t.split(":").map(Number);
//   return h * 60 + m;
// }

// export function hasClash(
//   date: string,
//   pickupTime: string,
//   endTime: string | undefined,
//   type: "drop_off" | "round_trip",
//   existingBookings: Booking[]
// ): { clashes: boolean; clashWith?: Booking } {
//   const proposed = {
//     start: toMinutes(pickupTime),
//     end:
//       type === "round_trip" && endTime
//         ? toMinutes(endTime)
//         : toMinutes(pickupTime) + 60,
//   };

//   const same = existingBookings.filter((b) => b.date === date);

//   for (const b of same) {
//     const existing = {
//       start: toMinutes(b.pickupTime),
//       end:
//         b.type === "round_trip" && b.endTime
//           ? toMinutes(b.endTime)
//           : toMinutes(b.pickupTime) + 60,
//     };
//     if (proposed.start < existing.end && existing.start < proposed.end) {
//       return { clashes: true, clashWith: b };
//     }
//   }
//   return { clashes: false };
// }

import { Redis } from "@upstash/redis";
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

// Initialize Redis client using REDIS_URL or REST API
let redis: Redis | null = null;

function initializeRedis() {
  if (redis) return redis;

  try {
    // Method 1: Using REDIS_URL (standard Redis connection string)
    if (process.env.REDIS_URL) {
      redis = new Redis({
        url: process.env.REDIS_URL,
      });
      return redis;
    }

    // Method 2: Using Upstash REST API (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)
    if (
      process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
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
    super(
      "Booking storage is not set up. Set REDIS_URL or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN environment variables."
    );
    this.name = "StorageNotConfiguredError";
  }
}

function hasRedisConfig(): boolean {
  return Boolean(
    process.env.REDIS_URL ||
      (process.env.UPSTASH_REDIS_REST_URL &&
        process.env.UPSTASH_REDIS_REST_TOKEN)
  );
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
        const data = await redisClient.get<Booking[]>(KEY);
        return data ?? [];
      }
    } catch (error) {
      console.error("Redis read error:", error);
      // Fallback to file if Redis fails
      return readFromFile();
    }
  }

  if (isVercel()) {
    throw new StorageNotConfiguredError();
  }

  return readFromFile();
}

export async function writeBookings(bookings: Booking[]): Promise<void> {
  if (hasRedisConfig()) {
    try {
      const redisClient = initializeRedis();
      if (redisClient) {
        await redisClient.set(KEY, bookings);
        return;
      }
    } catch (error) {
      console.error("Redis write error:", error);
      // Fallback to file if Redis fails
      await writeToFile(bookings);
      return;
    }
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
