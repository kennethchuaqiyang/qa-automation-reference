# Open questions flagged while drafting test cases

Surfaced by trying to write concrete test cases against `USER_STORIES.md`
— not guessed at beforehand. Each is resolved in `DECISIONS.md`
(reference given below, filled in once Stage 2 happens); this file is
the record of what was actually unclear at draft time. The sheet itself
is split into two tabs, `Cases - API` and `Cases - UI`, so references
below name the tab + row description rather than a shared TC-id.

## Contract shape — not given by the user stories at all

- **`Cases - API` — Book desk fields (deskId / date / x-member-id)** —
  `POST /api/bookings`'s exact request shape (field names, how the
  member is identified) isn't given by US-2 at all — guessed as
  `deskId` + `date` body fields and an `x-member-id` header, mirroring
  the API golden pair's pattern, but this is an assumption, not a
  decision.
- **`Cases - API` — Cancel booking fields** — same for
  `POST /api/bookings/{bookingId}/cancel` — guessed a path param + the
  same `x-member-id` header.
- **`Cases - API` / `Cases - UI` — "View my bookings"** — US-3 doesn't
  say whether there's a dedicated endpoint at all (e.g.
  `GET /api/bookings?memberId=`) or whether the UI derives this from
  client-side state after booking. Contract shape itself is undecided.

## Behavior — Search

- **`Cases - API` — Search desks: date, missing/blank** — rejected, or
  defaults to "today" / returns everything?
- **`Cases - API` — Search desks: date, in the past** — can a member
  search a past date at all, or is that rejected?
- **`Cases - API` — Search desks: zone, blank** — treated as "no
  filter" (all zones)?
- **`Cases - API` — Search desks: zone, unrecognized value** —
  rejected, or just an empty result set?
- **`Cases - API` — Search desks: zone, wrong case** — is the zone
  filter case-sensitive?
- **`Cases - UI` — Search form: date, left blank** — does the UI's date
  picker block submission client-side before any request is sent
  (mirrors the FE golden pair's blank-field pattern), or forward to the
  API and show whatever the API-tab question above decides?

## Behavior — Book a desk

- **`Cases - API` — Book desk: date (missing/malformed/past)** — same
  three questions as Search's date field, but for the booking date —
  plus: is a desk bookable for a past date at all (US-2 doesn't say)?
- **`Cases - API` — Book a desk already taken** — exact response
  (status + body), and is it distinguishable from "desk doesn't exist"
  (Parameter Checking's nonexistent-deskId case)?
- **`Cases - API` — Concurrent booking attempts on same desk/date** —
  US stories don't address concurrency at all. Is exactly-one-winner
  the right behavior, and what's the loser's exact response?

## Behavior — Cancel a booking

- **`Cases - API` — Cancel someone else's booking** — does it reveal
  the booking exists (permission-denied style) or hide it (not-found
  style)? Same open question as the API golden pair's TC-011.
- **`Cases - API`/`Cases - UI` — Cancel a booking for a date already
  passed** — what exactly counts as "already passed" — calendar-date
  comparison, or a same-day cutoff time? Not given anywhere. For the UI
  specifically: is the Cancel control hidden/disabled for a past
  booking, or clickable but rejected with a message?
- **`Cases - API` — Cancel an already-cancelled booking** — harmless
  no-op, or rejected as a conflict? Mirrors the API golden pair's
  double-release case.
- **`Cases - API` — Re-book immediately after cancelling** — can the
  *same* member immediately re-book the same desk/date right after
  cancelling it themselves? US-4 doesn't say, but seems like the
  natural reading of "frees up for someone else (including me)."

## UI — the booking race (US-5)

- **`Cases - UI` — Booking race** — US-5 only says the UI "must not
  show a false success," not *how* it's surfaced — an inline message
  like the FE pair's "slot taken" case, a silent grid refresh, or
  something else? Also: how do we deterministically trigger this in a
  test without gambling on real concurrency — does the mock need a
  test-only hook like the FE pair's `/simulate-taken`, applied here to
  a desk?

## Scope note — not duplicated across both tabs

Cancelling *someone else's* booking and "concurrent booking attempts"
only appear in `Cases - API` — the UI never lets a member see or click
a booking/desk they don't have a path to in the normal flow, so there's
nothing meaningful to drive through the browser for those; they're
backend-only concerns here, not an oversight.

## Not yet decided — scope note

None of the above are Non Functional / load / security questions —
per standing instruction, this draft doesn't include a Non Functional
category at all this round. If a genuine load or security concern
surfaces later, it goes straight to `load-test/` or `SECURITY_CHECKS.md`
once this pair reaches that stage, never into the Playwright suite as a
category-3 row.
