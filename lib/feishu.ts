// lib/feishu.ts
import { Booking } from "@/lib/bookings";

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const FEISHU_EMAIL = process.env.FEISHU_EMAIL || "v-ciaoshileong@xiaomi.com";

// let tenantAccessToken: string | null = null;
// let tokenExpiry: number = 0;
let tenantAccessToken: string = "";
let tokenExpiry: number = 0;

async function getTenantAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (tenantAccessToken && Date.now() < tokenExpiry) {
    return tenantAccessToken;
  }

  try {
    const response = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_id: APP_ID,
        app_secret: APP_SECRET,
      }),
    });

    const data = await response.json();

    if (!data.tenant_access_token) {
      throw new Error("Failed to get FeiShu access token");
    }

    // tenantAccessToken = data.tenant_access_token;
    // tokenExpiry = Date.now() + (data.expire - 600) * 1000; // Refresh 10 min before expiry
    tenantAccessToken = data.tenant_access_token || "";
    tokenExpiry = Date.now() + ((data.expire || 0) - 600) * 1000;

    return tenantAccessToken;
  } catch (error) {
    console.error("FeiShu token error:", error);
    throw error;
  }
}

async function getUserIdByEmail(email: string): Promise<string> {
  const token = await getTenantAccessToken();

  try {
    const response = await fetch(
      `https://open.feishu.cn/open-apis/contact/v3/users/batch_get_id?emails=${email}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!data.data?.user_list || data.data.user_list.length === 0) {
      throw new Error(`User not found for email: ${email}`);
    }

    return data.data.user_list[0].user_id;
  } catch (error) {
    console.error("FeiShu user lookup error:", error);
    throw error;
  }
}

function formatBookingMessage(booking: Booking): string {
  const typeLabel = booking.type === "drop_off" ? "Drop Off" : "Round Trip";
  
  const lines = [
    `${booking.date} ${new Date(booking.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })}`,
    `Type: ${typeLabel}`,
    ``,
    `PIC: ${booking.picName}`,
    `Contact: ${booking.picContact}`,
    `Total Guests: ${booking.totalGuests}`,
    ``,
    `Pick-up Time: ${booking.pickupTime}`,
  ];

  if (booking.endTime) {
    lines.push(`Return Time: ${booking.endTime}`);
  }

  lines.push(
    ``,
    `Pick-up Point: ${booking.pickupPoint}`,
    `Drop-off Point: ${booking.dropOffPoint}`,
    ``,
    `Booking ID: ${booking.id.slice(0, 8).toUpperCase()}`
  );

  return lines.join("\n");
}

export async function sendBookingNotification(booking: Booking): Promise<void> {
  if (!APP_ID || !APP_SECRET) {
    console.warn("FeiShu credentials not configured, skipping notification");
    return;
  }

  try {
    const userId = await getUserIdByEmail(FEISHU_EMAIL);
    const token = await getTenantAccessToken();
    const message = formatBookingMessage(booking);

    const response = await fetch("https://open.feishu.cn/open-apis/im/v1/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        receive_id: userId,
        msg_type: "text",
        content: JSON.stringify({
          text: `New Booking!\n\n${message}`,
        }),
      }),
    });

    const data = await response.json();

    if (!data.data?.message_id) {
      throw new Error("Failed to send FeiShu message");
    }

    console.log("FeiShu notification sent:", data.data.message_id);
  } catch (error) {
    console.error("Error sending FeiShu notification:", error);
    // Don't throw - booking should still succeed even if notification fails
  }
}
