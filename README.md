# FitCore

Gym and fitness management web app: memberships, QR check-in, classes and bookings, billing, equipment and member progress, with a separate workspace for each role. Built for the Brolf Tech PLC Remote Internship Challenge 2026 (Project 1, Frontend track).

> **This is a frontend demo.** There is no real backend. Data is stored in the browser's `localStorage` behind a mock API layer, and sign-in is simulated. It is not suitable for real member data.

## Run it

Requires Node.js 20 or newer.

```bash
npm install
npm run dev        # http://localhost:3000
npm run test:run   # unit tests
npm run build      # type-check and production build
```

## Demo accounts

Password for every account: `fitcore123`

| Role | Email |
|---|---|
| Administrator | admin@fitcore.io |
| Reception | reception@fitcore.io |
| Trainer | trainer@fitcore.io |
| Member | member@fitcore.io |

The login screen has one-click buttons for each account. To change role, sign out and sign in with another account.

## Pages and access

Every screen has its own URL in the form `/<role>/<section>`. Signed-out visitors are sent to `/login`, and a signed-in user who opens another role's URL sees an "No access to this area" page.

| Role | Pages |
|---|---|
| Administrator | `/admin/overview`, `/admin/members`, `/admin/trainers`, `/admin/billing`, `/admin/classes`, `/admin/equipment`, `/admin/settings` |
| Reception | `/reception/check-in`, `/reception/members`, `/reception/classes`, `/reception/billing` |
| Trainer | `/trainer/roster`, `/trainer/schedule`, `/trainer/equipment` |
| Member | `/member/pass`, `/member/classes`, `/member/programs`, `/member/progress` |

## Features

- **Members and memberships:** add, edit, delete, freeze and renew; search, filter and CSV export; status derived from the end date (Active, Expiring Soon, Expired, Frozen).
- **QR check-in:** each member has a real, scannable QR code on their pass that encodes their member code. Reception checks members in by scanning with a handheld or USB scanner (they type the code and press Enter) or by typing the code. Expired and frozen memberships are blocked and the reason is logged.
- **Trainers:** admins add, edit and delete trainers. A trainer who still has members, classes or workout plans cannot be deleted until those are reassigned, and the team always keeps at least one trainer.
- **Classes and bookings:** admin and reception create, edit and cancel classes. Trainer and room clashes are rejected, a class cannot be bigger than the gym capacity, and a class with bookings cannot be moved. Members get capacity limits, double-booking and time-clash checks, a waitlist, and automatic promotion in order when someone cancels. Cancelling a class removes its bookings and posts a notification.
- **Gym capacity:** set in Settings; it limits how large a class can be.
- **Billing:** record payments, view invoices, track paid, pending and overdue amounts, renew memberships.
- **Progress and goals:** members log body measurements and track goals, with charts.
- **Workout programs:** trainers build programs and assign them; members tick off exercises.
- **Notifications:** in-app notification centre with unread count.
- **Equipment:** status tracking across operational, needs service and out of order.
- **Dashboard:** member growth, plan mix, attendance by hour with the busiest hour highlighted, renewals due.

## How it is built

- React 19, TypeScript, Vite, Tailwind CSS, React Router, Recharts, Framer Motion, zod, `qrcode.react`.
- `src/api/mockApi.ts` is the only code that reads or writes storage. Screens call its async functions, so it can be replaced by a real REST API without changing the UI. Business rules (booking checks, waitlist promotion, check-in rules, renewal) are pure functions on a database object so they can be unit tested.
- `src/lib/schemas.ts` holds the zod validation rules for the member, payment and measurement forms. Forms show the first error inline.
- `src/App.tsx` defines the routes, the route guard and the role navigation.
- Theme: charcoal base with a single red accent. Red is used for primary actions and the active menu item; green, amber and blue are reserved for status so they are never confused with the brand colour.

```
src/
  api/mockApi.ts        mock REST-style API and pure business rules
  components/           screens per role area, trainer and class forms, shared Navbar/UI helpers
  lib/schemas.ts        zod validation rules
  tests/                Vitest unit tests
  mockData.ts           seed data and demo accounts
  types.ts              shared types
```

## Tests

`npm run test:run` runs the Vitest suite in `src/tests/`:

- membership status and renewal rules
- check-in rules (granted, expiring warning, expired, frozen, unknown code)
- class booking, double-booking, time clash, capacity, waitlist order and promotion
- trainer rules (add, edit, duplicate names, safe deletion, keeping at least one trainer)
- class rules (trainer and room clashes, gym capacity, locked times, cancelling a class)
- gym capacity setting and upgrading older saved data
- form validation rules

Settings also has a "Business rules checks" panel that runs a few of the same rules inside the app.

## Deployment

It is a static single-page app. `npm run build` produces `dist/`. `public/_redirects` (Netlify) and `vercel.json` (Vercel) send every path to `index.html` so direct links such as `/admin/members` work after a refresh.

## Known limitations

- No backend or database: data lives in one browser and is lost if storage is cleared (Settings has "reset demo data").
- Authentication is simulated. A real version needs server-side sessions or tokens and hashed passwords.
- QR codes are real, but there is no in-browser camera scanner; use a handheld scanner or type the code.
- There is no check-out or "currently in the gym" count yet, no equipment maintenance log, and payments cannot be exported.
- No AI features in this version.
