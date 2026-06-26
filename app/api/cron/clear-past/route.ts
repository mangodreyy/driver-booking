import { NextRequest, NextResponse } from "next/server";
import { readBookings, writeBookings } from "@/lib/bookings";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookings = await readBookings();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const kept = bookings.filter((b) => new Date(b.date) >= today);
  const removed = bookings.length - kept.length;

  await writeBookings(kept);

  return NextResponse.json({ success: true, removed, kept: kept.length, ranAt: new Date().toISOString() });
}
