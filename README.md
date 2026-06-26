# 🚗 Driver Booking System

A simple web app for employees to book the company driver, with clash detection and WhatsApp notification.

## Features
- Book a **Drop Off** or **Round Trip** with the driver
- Real-time **clash detection** — no double bookings
- Driver hours: **9:00 AM – 7:00 PM**
- Sends booking details directly to **WhatsApp**
- Admin view at `/admin` to see all bookings

---

## Setup

### 1. Clone the repo
```bash
git clone https://github.com/mangodreyy/driver-booking.git
cd driver-booking
npm install
```

### 2. Configure environment
```bash
cp .env.local.example .env.local
```
Edit `.env.local` and set your WhatsApp number:
```
WHATSAPP_NUMBER=60123456789
```
Use the country code without `+` (Malaysia: `60`, then the number).

### 3. Run locally
```bash
npm run dev
```
Visit `http://localhost:3000`

---

## Deploy to Vercel

1. Push this repo to GitHub (already set up as private)
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import this repo
3. Under **Environment Variables**, add:
   - `WHATSAPP_NUMBER` = `60XXXXXXXXX`
4. Click **Deploy**

> ⚠️ **Note on storage**: By default, bookings are saved to a local `data/bookings.json` file. This works perfectly on Vercel for testing, but Vercel's file system is ephemeral — bookings reset on each deploy. For production, replace the storage layer with **Vercel KV** or **Supabase** (free tier). See below.

---

## Upgrading Storage (Production)

### Option A: Vercel KV (easiest)
1. In your Vercel dashboard → Storage → Create KV Database
2. Connect it to your project
3. Replace `lib/bookings.ts` with KV reads/writes

### Option B: Supabase (free PostgreSQL)
1. Create a free project at [supabase.com](https://supabase.com)
2. Create a `bookings` table
3. Use the Supabase JS client in the API routes

---

## Pages
| URL | Description |
|-----|-------------|
| `/` | Booking form for employees |
| `/admin` | View all bookings (no auth — add password protection in Vercel settings if needed) |
