# Desk Booking mock — API + UI

A small Node/Express server implementing the Desk Booking feature used
for the Hybrid golden pair: search desks, book one, view "My Bookings",
cancel a booking — same backend serving both the JSON API and the
simple HTML pages on top of it. Behavior matches `../DECISIONS.md`
exactly; nothing here is guessed beyond what that file states.

In-memory state only (desks + bookings), reset by restarting the
process or `POST /__reset`.

## Running it locally

```
npm install
npm start
```

Listens on `http://localhost:4200` (or `$PORT` if set — picked up
automatically on most hosts, including Render).

## API

```
GET  /api/desks?date=YYYY-MM-DD&zone={optional}
POST /api/bookings                          body: {deskId, date}       header: x-member-id
GET  /api/bookings                                                     header: x-member-id
POST /api/bookings/{bookingId}/cancel                                   header: x-member-id
```

## UI pages

```
GET /search        — date + zone search form, desk grid, booking confirmation
GET /my-bookings    — list of the current member's bookings, Cancel per row
```

## Test-only hooks (not part of the real contract)

```
POST /api/simulate-taken   body: {deskId, date}   — makes a desk unavailable,
                            for deterministically testing the booking race (US-5)
POST /__reset               — restores the seeded baseline (bkg_001, bkg_past_001)
```

## Seed data

| deskId   | zone    |
|----------|---------|
| desk_11  | quiet   |
| desk_12  | quiet   |
| desk_13  | collab  |
| desk_14  | collab  |
| desk_15  | window  |

| bookingId      | deskId  | member    | date       | status    |
|----------------|---------|-----------|------------|-----------|
| bkg_001        | desk_13 | mem_bob   | 2026-11-03 | confirmed |
| bkg_past_001   | desk_15 | mem_alice | 2020-01-01 | confirmed |

## Deploying (Render, or any Node host)

This is a stateful server (not a static site), so it needs a real Node
process running — GitHub Pages won't work for it, same lesson as the
FE golden pair's mock.

1. Push this `mock/` folder's contents to its own GitHub repo (web
   upload is fine — same flow as the FE mock: create the repo, drag in
   `server.js`, `package.json`, `public/`, this `README.md`).
2. On [render.com](https://render.com): **New → Web Service** → connect
   that repo.
3. Build Command: `npm install`
   Start Command: `npm start`
4. Render sets `$PORT` automatically — `server.js` already reads
   `process.env.PORT`, no code change needed.
5. Once deployed, the live URL serves both `/search` (UI) and `/api/...`
   (API) — there's nothing separate to deploy for the API, it's the
   same process.

State resets on every redeploy/restart (in-memory only) — expected and
fine for this practice target.
