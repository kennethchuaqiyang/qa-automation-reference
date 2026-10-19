# Decisions made to resolve the questions flagged in QUESTIONS.md

`USER_STORIES.md` describes behavior, not an API or UI contract — no
endpoints, headers, field names, or page structure. Drafting concrete
test cases (split across `Cases - API` and `Cases - UI`) surfaced both
contract-shape gaps (needed to write any case at all) and behavior gaps
(what happens on each path). Each is answered below with reasoning;
none of these are stated by the user stories themselves. Where a
decision was checked against the live mock rather than only reasoned
about, that's called out explicitly.

## Contract shape (needed before any test case can be concrete)

1. **Endpoints**:
   - `GET /api/desks?date=YYYY-MM-DD&zone={optional}`
   - `POST /api/bookings` — body `{"deskId": "...", "date": "..."}`
   - `POST /api/bookings/{bookingId}/cancel` — no body
   - `GET /api/bookings` — resolves the "view my bookings" contract
     question (`Cases - API`/`Cases - UI` — View my bookings): a
     dedicated endpoint, not client-derived state, so a second member's
     browser session or a page reload still sees the right list.
2. **Member identification** — an `x-member-id` header, required on
   `POST /bookings`, `POST /bookings/{bookingId}/cancel`, and
   `GET /bookings`. `GET /desks` requires none — availability search is
   public, same reasoning as the API golden pair's `GET /seats` (US-1
   implies no login needed to look).
3. **Response shapes** — desk: `{deskId, zone, available}`; booking:
   `{bookingId, deskId, memberId, date, status}`, `status` one of
   `confirmed`, `cancelled`. Every error response is
   `{"error": "<message>"}`.
4. **UI pages (for the later selector-discovery pass)** — a search
   page (date + zone filter + desk grid) and a "My Bookings" page
   (list + per-row Cancel button). Exact markup/selectors are decided
   during selector discovery, not here — same division of labor as the
   FE golden pair.

## Behavior — Search

5. **Missing/blank `date` (`Cases - API` — Search desks: date)** —
   rejected: `400 {"error": "date is required"}`. Same reasoning as the
   API pair's decision #4 — silently defaulting to "today" would
   return data the caller didn't ask for without saying so.
6. **Malformed `date`** — `400 {"error": "date must be YYYY-MM-DD"}`.
7. **`date` in the past** — **allowed**, `200`, returns whatever
   availability is on record for that date. Search is read-only and
   informational; nothing in US-1 says a member can't look back. (Note
   the opposite decision for *booking* a past date, #16 below — reading
   history is harmless, creating a booking for one isn't.)
8. **UI date field left blank (`Cases - UI` — Search form: date)** —
   client-side validation blocks the Search click; no request is sent.
   Same pattern as the FE golden pair's blank-required-field cases.
9. **Blank `zone`** — treated as "no filter," identical to omitting the
   parameter: every zone returned. Same reasoning as the API pair's
   decision #18 — a blank value conveys no constraint.
10. **Unrecognized `zone` value** — `200` with an **empty result set**,
    not rejected. Deliberately different from the API pair's
    unrecognized-`status` decision (#4 there): `status` is a small,
    fixed enum baked into the protocol, where a typo is almost
    certainly a caller bug worth surfacing loudly. `zone` is a
    UI-facing grouping label (picked from a dropdown, not hand-typed by
    most callers) — an unknown zone just has nothing in it, same as
    searching a real zone with no desks.
11. **`zone` case sensitivity** — **case-insensitive** (normalized to
    lowercase before matching). Also deliberately different from the
    API pair's case-sensitive `status` decision (#19 there): zone names
    are user-facing labels surfaced through a dropdown in the UI, not a
    protocol-level enum a client is expected to get byte-exact.

## Behavior — Book a desk

12. **Missing/blank `deskId`** — `400 {"error": "deskId is required"}`.
13. **Nonexistent `deskId`** — `404 {"error": "Desk not found"}`.
14. **Missing/blank `date`** — `400 {"error": "date is required"}`.
15. **Malformed `date`** — `400 {"error": "date must be YYYY-MM-DD"}`.
16. **`date` in the past** — `400 {"error": "date must be today or
    later"}`. Unlike search (#7), a booking represents actually using a
    desk — a past date can never be fulfilled, so it's a request-shape
    problem, not a conflict.
17. **Missing/blank `x-member-id`** — `401 {"error": "Unauthorized"}`.
    Blank folds into the same bucket as missing, same reasoning as the
    API pair's boundary-collapsing decisions (#22 there) — neither
    gives the server an actor to act as.
18. **Desk already booked by someone else for that date** — `409
    {"error": "Desk not available"}`. Distinguishable from "desk
    doesn't exist" (#13, `404`) — same two-tier pattern as the API
    pair's seat-hold decisions (#5 vs #6 there): not-found and
    conflict are different failure modes and the caller benefits from
    telling them apart.
19. **Concurrent booking attempts on the same desk/date** — exactly one
    request succeeds (`200`/`201`), the other gets the same `409`
    conflict as #18 — no separate error class for a race specifically.
    **Verified against the live mock** (same approach as the API
    pair's decision #15): the booking handler is mutex-protected per
    desk+date, confirmed by firing two simultaneous `POST /bookings`
    for the same desk/date and observing exactly one `200`/`201` and
    one `409`.
20. **Check order for `POST /bookings`** — `401` (no actor) → `400`
    (missing/malformed `deskId`, missing/malformed/past `date`) → `404`
    (desk not found) → `409` (desk already booked). Actor and
    request-shape problems resolve before the server even needs to look
    anything up; existence resolves before state.

## Behavior — Cancel a booking

21. **Missing/blank `bookingId` path segment** — a plain router `404`
    (`//cancel` collapses via path-cleaning, matches no route), not the
    app's own `Booking not found` JSON — same shape distinction as the
    API pair's decision #20.
22. **Nonexistent `bookingId`** — `404 {"error": "Booking not found"}`.
23. **Missing/blank `x-member-id`** — `401 {"error": "Unauthorized"}`.
24. **Cancelling someone else's booking** — identical `404
    {"error": "Booking not found"}` as a nonexistent booking id (#22) —
    not a distinguishable `403`. Same reasoning as the API pair's
    decision #10: existence of another member's booking must not leak
    through a different status code.
25. **Cancelling a booking for a date that's already passed** — `409
    {"error": "Booking date has already passed"}`. "Already passed"
    means a calendar-date comparison only (booking date < today's
    date, server-local) — a same-day booking stays cancellable all day
    regardless of time, since nothing in US-4 calls for a finer cutoff
    and a time-of-day cutoff would be an invented rule.
26. **Cancelling an already-cancelled booking** — `409
    {"error": "Booking already cancelled"}`, treated as a genuine
    conflict rather than a silent no-op. Same philosophy as the API
    pair's decision #11: once a booking has left its active state, every
    further cancel attempt is the same kind of conflict, not a
    special-cased success.
27. **Re-booking the same desk/date immediately after cancelling it
    myself** — **allowed**, succeeds. Directly supported by US-4's own
    acceptance wording ("frees up ... for anyone, including me").
28. **Check order for cancel** — `401` (no actor) → `404` (booking not
    found / not owned, hidden per #24) → `409` (already cancelled, or
    date passed).

## UI — the booking race (US-5)

29. **Mechanism** — the mock gets a test-only hook mirroring the FE
    golden pair's `/simulate-taken`: `POST /api/simulate-taken` with
    `{"deskId", "date"}`, letting the AT suite deterministically make a
    desk unavailable between selection and confirmation, without
    gambling on a real race.
30. **How it's surfaced** — an inline message ("This desk is no longer
    available — please choose another"), not a silent grid refresh.
    Same choice as the FE golden pair's identical scenario (slot taken
    mid-decision) — consistent UX pattern, and more informative per
    US-5's own stated goal ("so I'm not left thinking I have
    [a desk] I don't").
31. **Cancel control for a past-dated booking (`Cases - UI`)** —
    disabled in "My Bookings," not hidden and not clickable-but-rejected.
    Consistent with the general principle (also the *intended*,
    correct behavior for the FE pair's Confirm button, which has a
    deliberate bug around exactly this) that an action that cannot
    succeed should be visibly non-interactive rather than clickable and
    failing.

## Left genuinely open

- Whether a cancelled booking can later be un-cancelled — out of scope;
  US-4 only describes cancel as terminal, same as the API pair leaving
  "reversing a confirmed hold" out of scope.
- Any load or security concern — per standing instruction, not
  addressed as Playwright cases at all this round. If genuine ones
  surface once this pair reaches that stage, they go to `load-test/`
  and `SECURITY_CHECKS.md`, never into the suite as a category-3 row.
