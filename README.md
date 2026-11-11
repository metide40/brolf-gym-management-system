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

Members you add in the app sign in with their own email and the temporary password set in the member form (8 to 64 characters, with a letter and a number). The seeded members have no password until an administrator or reception opens Edit member and sets one. Administrator, reception and trainer access uses the shared demo accounts above.

## Pages and access

Every screen has its own URL in the form `/<role>/<section>`. Signed-out visitors are sent to `/login`, and a signed-in user who opens another role's URL sees the "No access to this area" page. Signing out returns you to `/login`.

| Role | Pages |
|---|---|
| Administrator | `/admin/overview`, `/admin/members`, `/admin/trainers`, `/admin/billing`, `/admin/classes`, `/admin/equipment`, `/admin/settings` |
| Reception | `/reception/check-in`, `/reception/members`, `/reception/classes`, `/reception/billing` |
| Trainer | `/trainer/roster`, `/trainer/schedule`, `/trainer/equipment` |
| Member | `/member/pass`, `/member/classes`, `/member/programs`, `/member/progress` |

## Features

- **Members and memberships:** add, edit, delete, freeze and renew; search, filter and CSV export; status derived from the end date (Active, Expiring Soon, Expired, Frozen). Name, email, phone and a temporary password are required when adding a member, and an email address can only belong to one member.
- **Member sign-in:** members sign in with their own email and password and see only their own pass, bookings, programs and progress. Administrators and reception set or reset a member's password from the member form.
- **Check-out and who is inside:** reception can check members out from the terminal or from the "In the gym now" list. A member counts as inside for up to three hours after checking in unless they are checked out. When the gym reaches its capacity limit, new check-ins are blocked and the reason is logged.
- **QR check-in:** each member has a real, scannable QR code on their pass that encodes their member code. Reception checks members in by scanning with a handheld or USB scanner (they type the code and press Enter) or by typing the code. Expired and frozen memberships are blocked and the reason is logged.
- **Trainers:** admins add, edit and delete trainers. A trainer who still has members, classes or workout plans cannot be deleted until those are reassigned, and the team always keeps at least one trainer.
- **Classes and bookings:** admin and reception create, edit and cancel classes. Trainer and room clashes are rejected, a class cannot be bigger than the gym capacity, and a class with bookings cannot be moved. Members get capacity limits, double-booking and time-clash checks, a waitlist, and automatic promotion in order when someone cancels. Cancelling a class removes its bookings and posts a notification.
- **Gym capacity:** set in Settings; it limits how large a class can be.
- **Billing:** record payments, view invoices, track paid, pending and overdue amounts, renew memberships, and export the payments list to CSV. CSV exports neutralise cells that spreadsheets could run as formulas.
- **Progress and goals:** members log body measurements and track goals, with charts.
- **Workout programs:** trainers build programs and assign them; members tick off exercises.
- **Notifications:** in-app notification centre with unread count.
- **Equipment:** status tracking across operational, needs service and out of order, with a maintenance log (date, note and resulting status) and history for each unit.
- **Dashboard:** member growth, plan mix, attendance by hour with the busiest hour highlighted, renewals due.

## How it is built

- React 19, TypeScript, Vite, Tailwind CSS, React Router, Recharts, Framer Motion, zod, `qrcode.react`.
- `src/api/mockApi.ts` is the only code that reads or writes storage. Screens call its async functions, so it can be replaced by a real REST API without changing the UI. Business rules (booking checks, waitlist promotion, check-in rules, renewal) are pure functions on a database object so they can be unit tested.
- `src/lib/schemas.ts` holds the zod validation rules for the member, payment and measurement forms. Forms show the first error inline.
- `src/lib/credentials.ts` hashes member passwords with salted PBKDF2 (SHA-256, 100,000 iterations) using the browser's Web Crypto API and checks them in constant time.
- `src/App.tsx` defines the routes, the route guard and the role navigation.
- Theme: charcoal base with a single red accent. Red is used for primary actions and the active menu item; green, amber and blue are reserved for status so they are never confused with the brand colour.

```
src/
  api/mockApi.ts        mock REST-style API and pure business rules
  components/           screens per role area, trainer and class forms, shared Navbar/UI helpers
  lib/schemas.ts        zod validation rules
  lib/credentials.ts    salted password hashing and checks
  lib/csv.ts            CSV export helper
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
- gym capacity setting, check-out, who is currently inside, and blocking entry at capacity
- equipment maintenance log, CSV export, and upgrading older saved data
- password hashing, stored member passwords, duplicate emails and member sign-in
- form validation rules

Settings also has a "Business rules checks" panel that runs a few of the same rules inside the app.

## Deployment

It is a static single-page app. `npm run build` produces `dist/`. `public/_redirects` (Netlify) and `vercel.json` (Vercel) send every path to `index.html` so direct links such as `/admin/members` work after a refresh.

## Security

This is a frontend demo, so the protections below are limited to what a static app can do. They do not replace a real backend.

**Built into the app**
- Input validation with zod on the member, payment and measurement forms, including a required phone number and a password rule (8 to 64 characters with a letter and a number).
- Everything is rendered through React's escaping; the code does not use `dangerouslySetInnerHTML`, `innerHTML` or `eval`.
- CSV exports neutralise cells that spreadsheets could run as formulas.
- Role-based routes: signed-out visitors go to `/login`, and a signed-in user who opens another role's URL sees "No access to this area".
- Member passwords are stored only as salted PBKDF2 hashes, in a separate `localStorage` key. Plain passwords are never saved, and the hashes never enter the app state or the database object.
- One generic sign-in error ("Invalid email or password.") for every failure, and the same hashing work for unknown emails, so the form does not reveal which email addresses exist.
- A member's saved session is only trusted while that member still exists, has the same email and still has a password.
- A member email must be unique and cannot reuse a demo account's email.
- Signing out clears the stored session.
- No secrets are committed, and `.env` files are git-ignored.

**Simulated in this demo**
- Authentication and storage: the demo accounts and their shared password are in the front-end code, and all data, sessions and password hashes live in the browser's `localStorage`, so anyone with access to that browser can read or replace them.
- Role checks happen in the interface only, because there is no server to enforce them.

**Not built yet**
- Staff accounts: administrators, reception and trainers sign in with the shared demo accounts. There is no screen to create staff accounts or give them their own passwords.
- Session expiry or an idle timeout, sign-in lockout, and security headers such as Content-Security-Policy.
- Members cannot change their own password, and there is no invite or password-reset flow.
- The member list does not show which members have a password.

**What a real backend must add**
- Server-side password hashing, sessions or short-lived signed tokens in httpOnly cookies, and authorization checks on every request based on the signed-in user's role.
- Rate limiting and lockout on sign-in, HTTPS, CSRF protection, audit logging, and a password-reset flow.

## Known limitations

- No backend or database: data lives in one browser and is lost if storage is cleared (Settings has "reset demo data").
- Authentication is simulated in the browser. Member passwords are stored as salted hashes in `localStorage`, which anyone with access to that browser can read or replace. A real version needs server-side hashing and sessions or tokens.
- Only members can have their own sign-in. Administrator, reception and trainer access uses the shared demo accounts.
- Sessions do not expire until the user signs out.
- Members cannot change their own password; an administrator or reception sets it.
- QR codes are real, but there is no in-browser camera scanner; use a handheld scanner or type the code.
- Members counted as "inside" rely on check-outs or the three-hour window, so the count is an estimate.
- No AI features in this version.
