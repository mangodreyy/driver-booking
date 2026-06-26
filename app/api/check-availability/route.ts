import { NextRequest, NextResponse } from "next/server";
import { readBookings, hasClash } from "@/lib/bookings";

export async function POST(req: NextRequest) {
  try {
    const { date, pickupTime, endTime, type } = await req.json();

    if (!date || !pickupTime || !type) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const bookings = readBookings();
    const { clashes, clashWith } = hasClash(date, pickupTime, endTime, type, bookings);

    if (clashes) {
      return NextResponse.json({
        available: false,
        message: `The driver is already booked from ${clashWith?.pickupTime}${
          clashWith?.endTime ? ` to ${clashWith.endTime}` : ""
        } on this date. Please choose a different time.`,
      });
    }

    return NextResponse.json({ available: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
