# In-Person Training Attendance (v2)

QR-based attendance for in-person trainings. Admins create a training, show the QR code, participants scan it on their phones and mark themselves present, and the admin exports a 3-column Excel sheet for the LMS.

**What changed from v1**

| v1 problem | v2 fix |
| --- | --- |
| Render free backend slept, first scan took 30–60 s | No separate backend. API runs as Vercel serverless functions inside the same app — no sleeping server |
| QR pointed at `localhost`, only worked on one computer | QR is built from the address the admin page is opened on, so on the live site it is always the public Vercel URL. A warning shows if you ever open it on localhost |
| Two deployments (Render + Vercel) that had to point at each other | One Vercel project, one set of environment variables |
| Default passwords published in the README | No default accounts. The master admin is created once on `/setup` with a secret setup key |

**Stack:** Next.js 15 (App Router) · Prisma · Supabase PostgreSQL · exceljs · qrcode · JWT (jose, httpOnly cookie) + bcrypt

## Features

- Master admin approves or rejects admin signups, and can revoke access later
- Admins see their own trainings; the master admin sees everyone's
- Create a training with date, trainer, location and an **auto-close timer** (15 min – 8 h, or until stopped)
- Live attendance list that refreshes every 5 seconds, plus a full-screen **projector view**
- Stop attendance instantly, or reopen it for a chosen time
- One submission per Employee ID per training
- Optional **roster upload** (Excel/CSV of expected participants) so the export marks people **Absent**, and walk-ins are flagged as "Not on roster"
- Excel export: `Employee ID` | `Employee Name` | `<training date, e.g. 11-May-2026>` with Present/Absent
- Participants' phones remember their ID and name for the next training
- Daily health ping (Vercel cron) so the free Supabase project does not pause from inactivity

---

## Deploy (about 15 minutes)

### 1. Create the Supabase database

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Pick a region close to your users (e.g. **Mumbai / ap-south-1**). Set a database password and save it somewhere safe.
3. When the project is ready, click **Connect** (top of the dashboard) and open the connection strings.
4. Copy two of them, replacing `[YOUR-PASSWORD]` with your database password:
   - **Transaction pooler** (port **6543**) → this is `DATABASE_URL`. Add `?pgbouncer=true&connection_limit=1` to the end.
   - **Session pooler** (port **5432**) → this is `DIRECT_URL`.

   Use the *pooler* strings, not "Direct connection" — the direct one is IPv6-only and Vercel can't reach it.

   If your password contains special characters like `@ # / ?`, URL-encode them (e.g. `@` → `%40`).

### 2. Make two secrets

- `JWT_SECRET`: any long random string (40+ characters). You can generate one at a terminal with `openssl rand -base64 48`, or just mash the keyboard.
- `SETUP_KEY`: a password-like string you will type once on the setup page.

### 3. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New → Project** → import this GitHub repo.
2. Framework preset: **Next.js** (auto-detected). Root directory: leave as the repo root.
3. Open **Environment Variables** and add all four:

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | Transaction pooler URL (6543) ending in `?pgbouncer=true&connection_limit=1` |
   | `DIRECT_URL` | Session pooler URL (5432) |
   | `JWT_SECRET` | your long random string |
   | `SETUP_KEY` | your setup key |

4. Click **Deploy**. The build creates the database tables automatically (`prisma db push`).

### 4. Create the master admin

1. Open `https://<your-app>.vercel.app/setup`.
2. Enter the `SETUP_KEY`, your name, a username and a password.
3. You're signed in. The setup page locks itself after the master admin exists.

Other admins go to `/signup`, then you approve them under **Approvals**.

### 5. Run a training

1. **New training** → fill in name and date → **Create & open attendance**.
2. Click **Show on projector** (or download the QR) and let people scan.
3. When done, **Stop attendance now** (or let the timer close it) → **Export Excel** → upload to the LMS.

---

## Local development (optional)

```bash
npm install
cp .env.example .env      # fill in the same four values
npx prisma db push        # create tables (first time only)
npm run dev               # http://localhost:3000
```

The QR shown on localhost only works on your own computer — test phone scanning on the deployed Vercel URL.

## Project structure

```text
app/
  (app)/            signed-in pages: dashboard, trainings, approvals, account
  attend/[token]/   public page participants open after scanning
  present/[id]/     full-screen projector view
  login, signup, setup
  api/              serverless API routes (auth, trainings, attend, admin, health)
lib/                database, auth, Excel export, roster parsing, helpers
components/         shared UI pieces and QR helpers
prisma/schema.prisma
middleware.js       redirects signed-out users to /login
vercel.json         Mumbai region + daily health ping
```

## API

Public: `GET /api/health` · `GET|POST /api/setup` · `POST /api/auth/login|signup|logout` · `GET|POST /api/attend/:token`

Signed in: `GET /api/auth/me` · `POST /api/auth/password` · `GET|POST /api/trainings` · `GET|DELETE /api/trainings/:id` · `GET /api/trainings/:id/attendance` · `POST /api/trainings/:id/stop|reopen` · `POST|DELETE /api/trainings/:id/roster` · `GET /api/trainings/:id/export`

Master admin: `GET /api/admin/users` · `PATCH /api/admin/users/:id` (`{ "action": "approve" | "reject" }`)

Auth uses an httpOnly session cookie (7 days), so no tokens are stored in the browser.

## Troubleshooting

- **Build fails at `prisma db push`** → check `DIRECT_URL` is the *Session pooler* string (port 5432) and the password is correct/URL-encoded.
- **"Something went wrong on the server" on login** → `JWT_SECRET` missing or shorter than 16 characters; add it and redeploy.
- **Setup page says SETUP_KEY is not set** → add it in Vercel → Settings → Environment Variables, then **Redeploy**.
- **Supabase project paused** → restore it from the Supabase dashboard. The daily `/api/health` ping is meant to prevent this.
