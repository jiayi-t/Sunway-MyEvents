# Sunway MyEvents

Event Management and Recommendation System for Sunway Campus.

Students discover, register for, and check in to events, while organizers (SLBs and C&S) create and manage them. The general public can join events that are open to everyone.

Final-year individual capstone project. Requirements were gathered via questionnaire across students, SLB/C&S committee members, and staff. The finished system was deployed for user acceptance testing.

## Scope and Disclaimer

**This is an academic project, not an official Sunway service.** It was built independently as a final-year capstone, and is not affiliated with, endorsed by, or deployed by Sunway University. Sunway branding, organization names, and event posters appear because the system was designed and evaluated for that community, and were used with the consent of the organizing committees.

3 parts are deliberately simulated, because each depends on institutional access a student project cannot obtain:

- **Identity.** There is no SSO integration, so any unused 8-digit ID provisions a student account on first login (see [Test accounts](#test-accounts)). The system cannot verify that a user is genuinely a Sunway student.
- **Payment.** Paid events run through a mock checkout that completes registration without processing money.
- **Event data.** The deployed demo mainly runs on seeded data rather than a live campus calendar. Most entries reproduce real Sunway events under their actual names and posters, alongside a few placeholder events so every seeded organizer has something to display.

Everything else is a working implementation rather than a mockup, including authentication, the database and its migrations, the recommendation engine, QR check-in, analytics, and the notification scheduler.

## Features

**Students & general public**

- Browse and search events with category, date, timing, and pricing filters, plus sort by recently added / soonest / latest. Search and filters persist in the URL
- Personalised "For You" recommendations (content-based + collaborative filtering, driven by interests, views, saves, registrations, faculty, and preferred event timings)
- Monthly calendar view of registered events, and Google Calendar / .ics export for individual events
- Register for free events, or pay through a mock payment flow for paid ones
- QR code check-in at the event
- Save/bookmark events, follow organizers (SLBs/C&S), browse a searchable organizer directory, and get in-app + email notifications (new events, updates with a change summary, cancellations, day-of reminders) that deep-link to the event or organizer page
- Post-event feedback forms, customisable per event by the organizer
- First-time guided walkthrough (driver.js) of the app's main flows
- Category colour-coding across listings for quick visual scanning

**Organizers**

- Create, edit, cancel, and archive events, with audience control (open to public or students only) and free/paid pricing
- Pin events to feature on the public organizer profile
- Custom feedback forms with drag-to-reorder questions
- QR scanner for attendance check-in with a manual fallback, and a live participant list
- Analytics: attendance, views, feedback ratings, attendee demographics, and AI-generated summaries (Gemini) of open-ended feedback per question
- Dashboard with a monthly event calendar, recent activity feed, and pinned shortcuts
- Public organizer profile with social links that students and the public can follow

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS 4, TanStack Query 5, React Router 7 |
| Backend | Node.js, Express 5, TypeScript |
| Database | PostgreSQL with Drizzle ORM. Docker Compose for local development, Supabase in production |
| Auth | httpOnly session cookies, server-side and revocable, with bcryptjs. JWT is reserved for check-in QR tokens |
| Email | Nodemailer, SMTP in production and browser preview in dev via preview-email |
| AI | Gemini, for feedback summaries. Optional, requires an API key |
| Error reporting | Sentry across server and client, with session replay. Inert without a DSN |
| Testing | Vitest + Supertest integration tests, gated in GitHub Actions CI |

## Getting Started

### Prerequisites

- Node.js >= 20 (CI runs 22, and Vite 8 does not support Node 18)
- Docker & Docker Compose

### 1. Install

```bash
npm install
```

### 2. Environment Variables

Copy the 3 committed samples, which list every variable with inline notes on what each one does:

```bash
cp .env.sample .env                             # POSTGRES_* for docker-compose
cp apps/server/.env.sample apps/server/.env     # database, auth, email, AI, Sentry
cp apps/client/.env.sample apps/client/.env     # optional, Sentry only
```

Only 3 need a value to run locally:

| Variable | Notes |
|---|---|
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | Any values you like. The root `.env` creates the container; the matching `DATABASE_*` vars in `apps/server/.env` connect to it |
| `DATABASE_URL` | `postgresql://<user>:<password>@localhost:5432/<db>`, matching the above |
| `JWT_SECRET` | Signs check-in QR tokens. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

Everything else is optional and degrades cleanly when blank: without `SMTP_HOST` emails open as a browser preview instead of sending, without `GEMINI_API_KEY` the AI feedback summaries are hidden, without `SENTRY_DSN` the SDK stays inert, and without `SUPABASE_*` uploads are written to disk and served by `express.static`.

API and upload paths stay relative through the Vite proxy, so the backend origin is never configured on the client.

### 3. Database

```bash
docker-compose up -d                        # start Postgres
npm run db:migrate --workspace=apps/server  # apply migrations, creating all tables
npm run seed --workspace=apps/server        # seed demo users and events
```

### 4. Run

```bash
npm run dev            # client + server together
npm run dev:client     # client only
npm run dev:server     # server only
```

The client runs on http://localhost:5173 and the API on http://localhost:3001, with a health check at `/api/health`. The Vite dev server proxies `/api` and `/uploads` through to Express.

### Test Accounts

Accounts created by `npm run seed` all use the password `sunway123`.

| Role | Login | ID / Username |
|---|---|---|
| Student | Student ID | Any 8-digit ID |
| Organizer (SLB/C&S) | Username | Every seeded organizer is listed on the organizer login page, click one to autofill |
| General public | Email | Create an account via **General Public → Create one now!** |

Since there is no Sunway student directory to authenticate against, an unrecognised 8-digit ID is auto-provisioned on first login. Whatever password you type (minimum 8 characters) becomes that account's, and onboarding fills in the rest of the profile.

### Tests

```bash
npm test --workspace=apps/server
```

38 assertions across 3 suites, hitting real HTTP endpoints against the database in `apps/server/.env.test`. `auth.test.ts` (8) covers login validation and session issuing, `events.test.ts` (21) covers event CRUD authorization, registration guards, UUID resolution, and organizer pinning, and `ai-summary.test.ts` (9) covers the Gemini endpoint's authorization, caching, and degradation when no API key is set.

CI runs the same suite on every push and PR to `main`, against a throwaway Postgres 16 container built from the committed migrations.

### Testing on a Phone (LAN)

The dev server listens on your LAN IP. Camera access for QR scanning requires HTTPS on non-localhost origins, so generate local certs with [mkcert](https://github.com/FiloSottile/mkcert) into `apps/client/certs/` (`key.pem` + `cert.pem`). Vite picks them up automatically when present.

## How it works

### Architecture

Three-tier: a React SPA talking to a stateless Express REST API over `/api`, which owns all business logic and is the only tier with database access. Because that API is role-agnostic HTTP, a native client could consume it unchanged.

Authorization is enforced server-side at every layer rather than in the UI. `students_only` events are dropped from the SQL query itself for public callers instead of being fetched and hidden, and ownership is re-checked on every organizer mutation. Client-side route guards only mirror those rules for navigation.

### Recommendation Engine

`GET /recommendations` ([`recommendations.ts`](apps/server/src/routes/recommendations.ts)) blends two scores per candidate event:

- **Content-based.** A category-affinity vector per user, built from check-ins (5.0), registrations (3.0), saves (2.0), views (0.5 each, capped at 5 per event so re-opening one page cannot dominate the profile), declared interests (1.0), and a faculty-to-category baseline (0.5) for cold start, then normalised to [0, 1].
- **Collaborative.** User-based KNN (k=5) over those same vectors. Cosine similarity finds the 5 most similar users, whose registrations and saves are then weighted by that similarity, surfacing events the user has no direct signal for.

The two blend 70/30 in favour of content, falling back to pure content-based when a user has no neighbours yet. A followed-organizer bonus (+0.3) and a preferred-time-window overlap bonus (+0.2) are applied before sorting.

### Security

- **Sessions, not browser-stored tokens.** Login issues an `httpOnly`, `sameSite: strict` cookie (`secure` in production) referencing a server-side `sessions` row. It cannot be read by page scripts, and deleting the row revokes it. Changing a password invalidates every other session for that account.
- **Rate limiting.** Six limiters in [`rate-limit.ts`](apps/server/src/middleware/rate-limit.ts) cover the global `/api` surface plus login-per-IP, login-per-account, registration, forgot-password, and reset-password.
- **Uploads.** Authenticated only, and validated on both MIME type *and* file extension against a JPEG/PNG allow-list.
- **Headers.** Helmet on all responses. CSP is deliberately left off, since a tailored policy is listed as pre-deployment work rather than shipped half-configured.
- **Error reporting hygiene.** Session replay masks all text, inputs, and media, because the UI renders names and student IDs. User context is limited to id and role, and query strings are stripped so password-reset tokens never reach Sentry.

## Engineering Notes

Bugs worth documenting:

- **Timezone correctness.** `date`, `start_time`, and `end_time` were originally timezone-naive, so a 9:00 AM MYT event resolved differently depending on the server's own timezone. The first fix applied a manual GMT+8 offset at the form layer, treating the symptom. The real fix migrated the columns to `timestamptz` and centralised day-resolution into a shared `toMYT()` utility, so browse filtering, notification dates, and the monthly calendar now bucket a timestamp to a calendar day identically regardless of the viewer's device.
- **A Cartesian join silently inflated feedback counts.** Joining `registrations` × `feedback` multiplied the totals. Because it returned a plausible wrong answer rather than an error, no test caught it. Fixed with `COUNT(DISTINCT ...)`.
- **Auth was refactored after a security review.** The original design held a JWT in `localStorage`, readable by any script on the page and impossible to revoke. It became the server-side session model described above, leaving JWT to sign check-in QR tokens only.
- **A date comparison hid the check-in button on event day.** The upcoming/past split compared against the event date at midnight rather than its end time, so an event turned "past" on the morning it happened. 
- **Schema management moved from `db:push` to committed migrations** once real user data existed, so a fresh deployment reconstructs the schema unattended and no diff is applied without review.

## Deployment

A single Render web service serves both the API and the built client from one origin, which keeps the session cookie same-origin and avoids cross-site cookie handling on a free tier. Supabase provides managed PostgreSQL and S3-compatible object storage for event posters, while Brevo handles outbound SMTP. Migrations apply automatically on boot, so a fresh environment provisions itself from the repository alone, and a deploy only proceeds behind a passing CI build.

## Project Structure

npm workspaces, no build orchestrator. The client is the only UI app, the server has no UI layer.

```
sunway-myevents/
├── apps/
│   ├── client/                     # React + Vite frontend
│   │   └── src/
│   │       ├── api/
│   │       │   ├── queries/        # TanStack Query hooks, one file per domain
│   │       │   └── mutations/      # mutation hooks, each invalidates the keys it affects
│   │       ├── components/         # shared UI (header, footer, skeletons, check-in card)
│   │       ├── context/            # auth context, hydrates the cached user on load
│   │       ├── pages/              # auth/ student/ general-public/ organizer/, one folder per role
│   │       ├── services/api.ts     # axios instance, relative /api base + 401 auto-logout
│   │       ├── tours/              # driver.js onboarding walkthroughs
│   │       ├── utils/              # date formatting and category colours
│   │       └── App.tsx             # routes, providers, and the shared layout
│   │
│   └── server/                     # Node + Express API
│       └── src/
│           ├── routes/             # 10 routers, registered in app.ts
│           ├── database/
│           │   ├── schema.ts       # Drizzle schema, single source of truth
│           │   ├── migrations/     # generated SQL, committed and applied in CI
│           │   └── seed.ts         # demo users and events
│           ├── middleware/         # session authentication and rate limiters
│           ├── utils/sessions.ts   # server-side session records, revocable
│           ├── email.ts            # nodemailer templates and delivery
│           ├── scheduler.ts        # node-cron day-of event reminders
│           ├── app.ts              # router registration and middleware wiring
│           └── tests/              # Vitest + Supertest integration tests
│
└── docker-compose.yml              # local Postgres for development
```

All data fetching goes through TanStack Query, so the split between `api/queries/` and `api/mutations/` is where the client's server state lives.
