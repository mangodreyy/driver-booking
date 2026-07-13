import { NextRequest, NextResponse } from "next/server";

// ── Admin protection ────────────────────────────────────────────────────────
// /admin requires a session cookie set after entering the admin password

// ── Booking form access token ───────────────────────────────────────────────
// The booking form at / requires a valid ?token= query param OR a session cookie
// This prevents outsiders who stumble on the URL from submitting bookings

const ADMIN_COOKIE = "admin_session";
const STAFF_COOKIE = "staff_session";

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // ── 1. Protect /admin pages ───────────────────────────────────────────────
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const cookie = req.cookies.get(ADMIN_COOKIE);
    const validSecret = process.env.ADMIN_PASSWORD || "xiaomi-admin";
    if (cookie?.value !== validSecret) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  // ── 2. Protect booking form with staff access token ───────────────────────
  if (pathname === "/") {
    const staffToken = process.env.STAFF_ACCESS_TOKEN || "";

    // If no token configured, skip protection (dev mode)
    if (!staffToken) return NextResponse.next();

    // Check session cookie first
    const sessionCookie = req.cookies.get(STAFF_COOKIE);
    if (sessionCookie?.value === staffToken) return NextResponse.next();

    // Check ?token= in URL
    const urlToken = searchParams.get("token");
    if (urlToken === staffToken) {
      // Valid token — set session cookie and redirect to clean URL
      const res = NextResponse.redirect(new URL("/", req.url));
      res.cookies.set(STAFF_COOKIE, staffToken, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/",
      });
      return res;
    }

    // No valid token — show access denied
    return NextResponse.redirect(new URL("/access-denied", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/admin/:path*"],
};
