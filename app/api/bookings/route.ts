import { NextRequest, NextResponse } from "next/server";
import { readBookings, writeBookings, hasClash, Booking, StorageNotConfiguredError } from "@/lib/bookings";
import { randomUUID } from "crypto";

function fmt12(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function buildWhatsAppMessage(b: Booking): string {
  const typeLabel = b.type === "drop_off" ? "Drop Off 🚗" : "Round Trip 🔄";
  const lines = [
    `🗓 *New Driver Booking*`,
    ``,
    `📅 Date: ${b.date}`,
    `🚦 Type: ${typeLabel}`,
    ``,
    `👤 PIC: ${b.picName}`,
    `📱 Contact: ${b.picContact}`,
    `👥 Total Guests: ${b.totalGuests}`,
    ``,
    `🕐 Pick-up Time: ${fmt12(b.pickupTime)}`,
    b.endTime ? `🕐 Return Time: ${fmt12(b.endTime)}` : null,
    ``,
    `📍 Pick-up Point: ${b.pickupPoint}`,
    `📍 Drop-off Point: ${b.dropOffPoint}`,
    ``,
    `🆔 Booking ID: ${b.id.slice(0, 8).toUpperCase()}`,
  ]
    .filter((l) => l !== null)
    .join("\n");
  return lines;
}

export async function GET() {
  try {
    const bookings = await readBookings();
    return NextResponse.json(bookings);
  } catch (err) {
    console.error(err);
    if (err instanceof StorageNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, type, picName, picContact, totalGuests, pickupTime, endTime, pickupPoint, dropOffPoint } = body;

    if (!date || !type || !picName || !picContact || !totalGuests || !pickupTime || !pickupPoint || !dropOffPoint) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }
    if (type === "round_trip" && !endTime) {
      return NextResponse.json({ error: "End time is required for round trips." }, { status: 400 });
    }

    const bookings = await readBookings();

    const { clashes, clashWith } = hasClash(date, pickupTime, endTime, type, bookings);
    if (clashes) {
      return NextResponse.json({
        error: `Time clash! Driver is already booked from ${clashWith?.pickupTime}${
          clashWith?.endTime ? ` to ${clashWith.endTime}` : ""
        }. Please choose another time.`,
      }, { status: 409 });
    }

    const newBooking: Booking = {
      id: randomUUID(),
      date,
      type,
      picName,
      picContact,
      totalGuests: Number(totalGuests),
      pickupTime,
      endTime: type === "round_trip" ? endTime : undefined,
      pickupPoint,
      dropOffPoint,
      createdAt: new Date().toISOString(),
    };

    bookings.push(newBooking);
    await writeBookings(bookings);

    const waNumber = process.env.WHATSAPP_NUMBER || "";
    const message = buildWhatsAppMessage(newBooking);
    const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;

    return NextResponse.json({ success: true, booking: newBooking, waLink });
  } catch (err) {
    console.error(err);
    if (err instanceof StorageNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
