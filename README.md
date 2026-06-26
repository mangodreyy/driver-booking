# 🚗 Driver Booking System

A simple web app for employees to book the company driver, with clash detection and WhatsApp notification.

## Features
- Book a **Drop Off** or **Round Trip** with the driver
- Real-time **clash detection** — no double bookings
- Driver hours: **9:00 AM – 6:00 PM**
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

Locally, bookings are saved to `data/bookings.json`.

---

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import this repo
3. **Create Vercel KV storage** (required — without this, bookings will fail with a server error):
   - Vercel dashboard → your project → **Storage** → **Create Database** → **KV**
   - Connect the KV database to this project (Vercel adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically)
4. Under **Environment Variables**, add:
   - `WHATSAPP_NUMBER` = `60XXXXXXXXX`
   - `CRON_SECRET` = any long random string (for the weekly cleanup cron)
5. Click **Deploy** (or redeploy after adding KV)

Live site: https://driver-booking-eosin.vercel.app

---

## Pages
| URL | Description |
|-----|-------------|
| `/` | Booking form for employees |
| `/admin` | View all bookings (no auth — add password protection in Vercel settings if needed) |
