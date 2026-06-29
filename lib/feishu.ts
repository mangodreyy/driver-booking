import { Booking } from "@/lib/bookings";

const WEBHOOK_URL = process.env.FEISHU_WEBHOOK_URL || "";

function getDayName(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-MY", { weekday: "long" });
}

function fmt12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export async function sendBookingNotification(booking: Booking): Promise<void> {
  if (!WEBHOOK_URL) {
    console.warn("FEISHU_WEBHOOK_URL not set, skipping notification");
    return;
  }

  const typeLabel = booking.type === "drop_off" ? "Drop Off 🚗" : "Round Trip 🔄";
  const timeInfo = booking.type === "round_trip" && booking.endTime
    ? `${fmt12(booking.pickupTime)} → ${fmt12(booking.endTime)}`
    : fmt12(booking.pickupTime);

  const card = {
    msg_type: "interactive",
    card: {
      header: {
        title: {
          tag: "plain_text",
          content: "🗓 New Driver Booking",
        },
        template: "orange",
      },
      elements: [
        {
          tag: "div",
          fields: [
            {
              is_short: true,
              text: {
                tag: "lark_md",
                content: `**Date**\n${booking.date} (${getDayName(booking.date)})`,
              },
            },
            {
              is_short: true,
              text: {
                tag: "lark_md",
                content: `**Type**\n${typeLabel}`,
              },
            },
          ],
        },
        { tag: "hr" },
        {
          tag: "div",
          fields: [
            {
              is_short: true,
              text: {
                tag: "lark_md",
                content: `**PIC**\n${booking.picName}`,
              },
            },
            {
              is_short: true,
              text: {
                tag: "lark_md",
                content: `**Contact**\n${booking.picContact}`,
              },
            },
          ],
        },
        {
          tag: "div",
          fields: [
            {
              is_short: true,
              text: {
                tag: "lark_md",
                content: `**Total Guests**\n${booking.totalGuests} pax`,
              },
            },
            {
              is_short: true,
              text: {
                tag: "lark_md",
                content: `**Pick-up Time**\n${timeInfo}`,
              },
            },
          ],
        },
        { tag: "hr" },
        {
          tag: "div",
          fields: [
            {
              is_short: true,
              text: {
                tag: "lark_md",
                content: `**Pick-up Point**\n${booking.pickupPoint}`,
              },
            },
            {
              is_short: true,
              text: {
                tag: "lark_md",
                content: `**Drop-off Point**\n${booking.dropOffPoint}`,
              },
            },
          ],
        },
        { tag: "hr" },
        {
          tag: "note",
          elements: [
            {
              tag: "plain_text",
              content: `Booking ID: ${booking.id.slice(0, 8).toUpperCase()}  ·  Driver: Azlan (+60 11-3766 3532)`,
            },
          ],
        },
      ],
    },
  };

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(card),
    });
    const data = await res.json();
    if (data.code !== 0) {
      console.error("Feishu webhook error:", data);
    } else {
      console.log("Feishu notification sent successfully");
    }
  } catch (error) {
    console.error("Failed to send Feishu notification:", error);
    // Don't throw — booking should succeed even if notification fails
  }
}
