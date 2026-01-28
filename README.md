# Ambassador Clock In/Out System

A supervisor-free digital clock-in/clock-out system where ambassadors scan rotating QR codes to record attendance. Includes an admin dashboard, session tracking, audit logging, and monthly Excel export.

## Tech Stack

- **Backend**: Node.js + Express + TypeScript, SQLite (better-sqlite3), JWT auth, bcrypt, zod, exceljs
- **Frontend**: Next.js 14 (App Router) + TypeScript, html5-qrcode, qrcode

## Project Structure

```
/backend     - Express API server
/frontend    - Next.js frontend
```

## Setup & Installation

### Prerequisites
- Node.js 18+
- npm

### 1. Backend

```bash
cd backend
npm install
npm run seed    # Creates admin + sample ambassador
npm run dev     # Starts on http://localhost:3001
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev     # Starts on http://localhost:3000
```

## Default Users (created by seed)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | admin123 |
| Ambassador | ambassador@example.com | ambassador123 |

## Configuration

Backend environment variables (`.env`):

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3001 | Server port |
| JWT_SECRET | (set in .env) | JWT signing secret |
| DB_PATH | ./data/app.db | SQLite database file |
| QR_TOKEN_TTL_SECONDS | 20 | QR token lifetime |
| QR_REFRESH_SECONDS | 15 | How often office screen refreshes |
| CLOCK_COOLDOWN_SECONDS | 20 | Min seconds between scans per user |
| MAX_SHIFT_MINUTES | 720 | Max shift before flagging (12h) |
| OFFICE_IDS | APU_MAIN_OFFICE,APU_SECOND_OFFICE | Comma-separated valid office IDs |
| ENABLE_IP_CHECK | false | Enable IP allowlist checking |
| ALLOWED_IP_RANGES | (empty) | Comma-separated IP prefixes |

Frontend (`.env.local`):

| Variable | Default |
|----------|---------|
| NEXT_PUBLIC_API_BASE | http://localhost:3001/api |

## Office Screen

Open in a browser/kiosk: `http://localhost:3000/office-screen?office_id=APU_MAIN_OFFICE`

This displays a large rotating QR code that ambassadors scan with their phones.

## How It Works

1. **Office Screen** displays a QR code that rotates every 15 seconds (each token valid for 20 seconds)
2. **Ambassador** opens the Scan page on their phone and points camera at the QR
3. System auto-detects whether this is a **Clock In** (no open session) or **Clock Out** (has open session)
4. Every scan attempt (success or failure) is logged in `clock_events` for auditing
5. Tokens are single-use: invalidated immediately after a successful scan
6. **Admin** can view sessions, flags, and export monthly Excel reports

## Anti-Cheat Features

- QR tokens expire in 20 seconds and are single-use
- Cooldown: 20-second minimum between scans per user
- Shifts > 12 hours are auto-flagged as `SHIFT_TOO_LONG`
- Shifts < 1 minute are flagged as `TOO_SHORT_OR_ACCIDENTAL`
- All scan attempts (success/fail) are audit-logged with reason, IP, and device hash
- Optional IP allowlist for office Wi-Fi enforcement

## Excel Export

Admin can download `Timesheets-YYYY-MM.xlsx` with two sheets:
- **Summary**: Per-ambassador totals (shifts, hours, flags count)
- **Detailed Logs**: Every session with clock in/out times, minutes, hours, flags

## API Endpoints

### Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout (client-side)

### Admin
- `POST /api/admin/ambassadors` - Create ambassador
- `GET /api/admin/ambassadors` - List ambassadors
- `GET /api/admin/ambassadors/:id` - Get ambassador
- `PATCH /api/admin/ambassadors/:id` - Update ambassador
- `POST /api/admin/ambassadors/:id/reset-password` - Reset password
- `GET /api/admin/sessions` - List sessions (filterable)
- `GET /api/admin/reports/timesheets?month=YYYY-MM` - JSON report
- `GET /api/admin/reports/timesheets.xlsx?month=YYYY-MM` - Excel download

### Ambassador
- `GET /api/me` - Current user + open session
- `GET /api/me/sessions?month=YYYY-MM` - Own sessions

### QR / Clock
- `GET /api/office/:office_id/qr` - Get current QR token
- `POST /api/clock/scan` - Clock in/out

## Smoke Test Checklist

- [ ] Admin login works (admin@example.com / admin123)
- [ ] Create ambassador works from admin panel
- [ ] Office screen shows rotating QR with countdown
- [ ] Ambassador login works (ambassador@example.com / ambassador123)
- [ ] Ambassador scan -> Clock IN (shows green "Clocked IN")
- [ ] Ambassador scan again -> Clock OUT (shows red "Clocked OUT" with duration)
- [ ] Admin sessions page shows the created session
- [ ] Admin reports page shows monthly totals
- [ ] Excel download opens with correct Summary and Detailed Logs sheets
- [ ] Scanning expired/reused QR shows proper error
- [ ] Rapid re-scan within cooldown shows cooldown error
