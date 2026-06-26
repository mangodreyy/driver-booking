import { NextRequest, NextResponse } from "next/server";
import { readBookings, writeBookings } from "@/lib/bookings";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel Cron (not a random visitor)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookings = readBookings();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Keep only future bookings (today and onwards)
  const kept = bookings.filter((b) => new Date(b.date) >= today);
  const removed = bookings.length - kept.length;

  writeBookings(kept);

  console.log(`[cron/clear] Removed ${removed} past booking(s), kept ${kept.length}`);

  return NextResponse.json({
    success: true,
    removed,
    kept: kept.length,
    ranAt: new Date().toISOString(),
  });
}
