import { NextRequest, NextResponse } from "next/server";
import { readBookings, hasClash, getBookedRanges, isWeekday, getMinPickupTime } from "@/lib/bookings";

export async function POST(req: NextRequest) {
  try {
    const { date, pickupTime, endTime, type } = await req.json();

    if (!date || !pickupTime || !type) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Weekend check
    if (!isWeekday(date)) {
      return NextResponse.json({
        available: false,
        message: "Bookings are only available Monday to Friday.",
      });
    }

    // Past time check
    const minTime = getMinPickupTime(date);
    if (pickupTime < minTime) {
      return NextResponse.json({
        available: false,
        message: `Cannot book a past time slot. Earliest available today is ${minTime}.`,
      });
    }

    const bookings = await readBookings();
    const { clashes, clashWith } = hasClash(date, pickupTime, endTime, type, bookings);

    if (clashes) {
      return NextResponse.json({
        available: false,
        message: `Driver is already booked from ${clashWith?.pickupTime}${
          clashWith?.endTime ? ` to ${clashWith.endTime}` : " (1 hour block)"
        } on this date.`,
      });
    }

    return NextResponse.json({ available: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** GET: return all booked ranges for a date so frontend can hide slots */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!date) return NextResponse.json({ ranges: [] });

    const bookings = await readBookings();
    const ranges = getBookedRanges(date, bookings);
    return NextResponse.json({ ranges });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
