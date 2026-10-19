# Selector discovery — Desk Booking mock (UI half)

Required by `README-generating-at.md` before writing the UI half of the
Hybrid automation: the finalized `Cases - UI` cases are written without a
wireframe, so selectors are discovered against the running mock
(`mock/`, `npm start`, `http://localhost:4200`), not guessed. Captured by
inspecting the actual HTML returned for each state, via curl against the
local mock — same method as the FE golden pair's `SELECTORS.md`.

## Search page (`GET /search`)

| Element | Selector |
|---|---|
| Search form | `#search-form` |
| Date field | `#date` (plain text input, not a native date picker — no client-side `required`/type constraint in the markup) |
| Zone filter | `#zone` (`<select>`; options have `value=""` for "All" and `value="quiet"/"collab"/"window"` for each zone) |
| Search button | `#search-submit` |
| Search-level error (malformed date) | `#search-error` — hidden/shown via inline `style="display:none/block"`, text e.g. `date must be YYYY-MM-DD` |
| Desk grid container | `#desk-grid` |
| Individual desk button | `[data-desk-id="<id>"]` (also carries class `desk` + `available`/`taken`) |
| Available desk | `.desk.available[data-desk-id="<id>"]` — no `disabled` attribute, submits a one-button `<form method="GET" action="/confirm">` |
| Taken desk | `.desk.taken[data-desk-id="<id>"]` — has `disabled` attribute, not clickable |
| Empty state (no desks match, e.g. unrecognized zone) | `#empty-state` — exact text: `No desks found for this search.` (replaces `#desk-grid`'s contents entirely, not a sibling) |
| Booking success message | `#booking-success` — text: `Booked! <deskId>` (hidden/shown, driven by the `booked=` query param set on redirect from `POST /confirm`) |
| Desk-taken message (booking a desk that became unavailable) | `#desk-taken-message` — exact text: `This desk is no longer available — please choose another.` (hidden/shown, driven by `taken=1`) |
| My Bookings link | `#my-bookings-link` |

**Found during discovery, fixed before writing automation:** `#date` had
no client-side validation in the markup — a plain text input with no
`required` attribute and no JS blocking an empty submit, contradicting
DECISIONS.md #8 ("client-side validation blocks the click; no request
sent"). Unlike the FE pair's Confirm-button gap (a deliberately planted
bug meant to be caught), this one was never a decided-on bug — just an
oversight in the mock build, since #8 was already reasoned through in
`DECISIONS.md` before the mock existed. Added `required` to `#date` in
`server.js` to match #8 exactly rather than carry a documentation/mock
mismatch into the suite. Native HTML5 validation now blocks the click
client-side with no request sent, same as the FE pair's blank-required-
field cases.

## Confirm page (`GET /confirm`, `POST /confirm`)

| Element | Selector |
|---|---|
| Confirm detail text | `#confirm-detail` — text: `<deskId> on <date>` |
| Taken-inline message | `#desk-taken-inline` — hidden/shown, exact text: `This desk is no longer available — please choose another.` |
| Confirm button | `#confirm-btn` — carries `disabled` when the desk is no longer available at page-load time (correctly implemented here, unlike the FE pair's known Confirm-button gap) |
| Confirm form | plain `<form method="POST" action="/confirm">`, hidden `deskId`/`date`/`memberId` inputs carry the booking forward |

## My Bookings page (`GET /my-bookings`)

| Element | Selector |
|---|---|
| Bookings list container | `#bookings-list` |
| Individual booking row | `.booking-row[data-booking-id="<id>"]` — text: `<deskId> on <date> — <status>` |
| Cancel button | `.cancel-btn[data-booking-id="<id>"]` — carries `disabled` when the booking's date is already past **or** its status is already `cancelled` (same `disabled` attribute either way; distinguish by the row's own status text if a test needs to tell past-but-active apart from already-cancelled) |

**Both the row and its Cancel button carry `data-booking-id`** — a bare
`[data-booking-id="<id>"]` matches both (caught by the AT: a strict-mode
violation on first run). Always scope by class too (`.booking-row[...]`
vs. `.cancel-btn[...]`).
| Empty state (no bookings) | `#no-bookings` — exact text: `You have no bookings.` |
| Back-to-Search link | plain `<a>`, no id — target via text `Back to Search` or `href` prefix `/search` |

Each `Cancel` button is itself the submit control for a one-button
`<form method="POST" action="/my-bookings/cancel">`.

## Test-only hooks (not part of the UI, used directly by the AT)

| Hook | Purpose |
|---|---|
| `POST /api/simulate-taken` `{ deskId, date }` | marks a desk unavailable server-side, for the booking-race case (US-5 / DECISIONS.md #29) |
| `POST /__reset` | restores the seeded baseline (`bkg_001` future/confirmed, `bkg_past_001` past/confirmed) — call before every test so tests don't leak state into each other |

## Test identities

No login/auth UI — member identity flows entirely through the
`memberId` query param / hidden form field (defaults to `mem_alice`
whenever omitted). `mem_alice` and `mem_bob` are the two seeded members;
any string works as a memberId since the mock trusts it outright (same
unauthenticated-trust-claim shape as `x-member-id` on the API side).
