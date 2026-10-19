# Decisions made to resolve the questions flagged in test-cases/cases.csv

`USER_STORIES.md` describes behavior, not an API contract — no endpoints,
headers, or field names. Drafting concrete test cases surfaced both kinds
of gaps: contract shape (needed to write any test at all) and behavior
(what happens on each error path). Each is answered below with reasoning;
none of these are stated by the user stories themselves.

## Contract shape (needed before any test case can be concrete)

1. **Endpoints** — three, chosen to exercise different methods/inputs
   per the plan to diversify beyond the first golden pair's POST-only
   shape:
   - `GET /api/events/{eventId}/seats?status={available|held|sold}`
   - `POST /api/events/{eventId}/holds` — body `{"seatId": "..."}`
   - `PATCH /api/holds/{holdId}` — body `{"status": "confirmed"|"released"}`
2. **Customer identification (TC-007)** — an `x-customer-id` header,
   required on `POST /holds` and `PATCH /holds/{holdId}`. `GET /seats`
   requires none — availability is public, per US-1 ("a customer
   browsing" implies no login needed to look).
3. **Legal values for the PATCH status field (TC-021)** — exactly
   `"confirmed"` or `"released"`. Anything else (missing, wrong type,
   unknown string, even `"held"`) is not a legal update.

## Behavior

4. **Unrecognized `status` filter value (TC-003)** — rejected, `400
   {"error": "invalid status value"}`. It's a filter over an enumerated
   field; silently ignoring a typo'd filter would return wrong data
   without telling the caller, which is worse than a loud failure.
5. **`GET /seats` for a nonexistent event (TC-004)** — `404
   {"error": "Event not found"}`.
6. **Holding an already-held or already-sold seat (TC-006)** — same
   `409 {"error": "Seat not available"}` for both. The caller doesn't
   need to distinguish "someone else is deciding" from "already gone" —
   either way, this seat isn't available to them right now.
7. **Missing `x-customer-id` on hold/update actions (TC-007, implied on
   confirm/release too)** — `401 {"error": "Unauthorized"}`.
8. **Holding a nonexistent seat/event (TC-008)** — `404
   {"error": "Seat not found"}`.
9. **Missing/malformed `seatId` in the hold request body (TC-009)** —
   `400 {"error": "seatId is required"}`. Missing field, wrong type, and
   blank string all collapse into this one bucket — none of these
   variants are an enumeration risk worth splitting out.
10. **Non-owner confirm/release (TC-011, TC-016)** — identical `404
    {"error": "Hold not found"}` whether the hold doesn't exist or
    belongs to someone else. Existence of another customer's hold must
    not leak through a different status code or message.
11. **Acting on a hold already in a terminal state — confirmed,
    released, or expired (TC-012, TC-013, TC-014, TC-017, TC-018)** —
    all five of these collapse into one answer: `409
    {"error": "Hold is no longer active"}`. Deliberately not
    special-casing "already released" as a no-op, or "expired" as
    different from "confirmed" — once a hold has left the active
    `held` state for any reason, every further action on it is the same
    kind of conflict. Simpler and more consistent than branching
    behavior per terminal state with no stated reason to.
12. **Hold duration (TC-020)** — 10 minutes from creation. Not
    practically testable by waiting in a normal test run, so seed data
    additionally includes one hold pre-seeded as already past its
    window, making the "can't act on an expired hold" behavior
    deterministic.
13. **Response shape** — holds return `{holdId, eventId, seatId,
    customerId, status, expiresAt}`; `status` is one of `held`,
    `confirmed`, `released`, `expired` — the last is computed (held +
    past `expiresAt`), never a stored value. Every error response is
    `{"error": "<message>"}`.
14. **Check order** — for `POST /holds`: 401 (no actor) → 404 (event/seat
    not found) → 409 (seat not available) → 400 (body field problems).
    For `PATCH /holds/{holdId}`: 401 (no actor) → 404 (not found/not
    owned) → 409 (already terminal) → 400 (illegal status value).
    Existence and ownership resolve before state, and state before body
    validation, in both.

## Non-functional (added after the first pass — none of these are stated
by the user stories either, surfaced while drafting Non Functional cases)

15. **Concurrent hold attempts on the same seat** — exactly one request
    succeeds (`200`), the other gets the same `409
    {"error": "Seat not available"}` as a normal already-held conflict —
    no separate error class for a race specifically. Verified against
    the live mock: the handler is mutex-protected, so this holds in
    practice, not just in theory. Not stated by the user stories; added
    because unprotected concurrent holds would silently double-book
    inventory, which is the kind of gap worth deciding deliberately
    rather than leaving to chance.
16. **Response time** — no SLA is stated anywhere, and a local in-process
    mock isn't a meaningful way to measure one. Decision: treat this as
    an illustrative smoke check only (confirm it responds, don't treat
    the number as a real performance result), not a pass/fail gate.
17. **Rate limiting / abuse protection** — deliberately left unimplemented
    in the mock, matching the earlier decision that this is out of
    scope. The Non Functional case for it exists to document the gap
    explicitly (so it's visibly "not done" rather than silently
    untested), not to assert correct throttling behavior.

## Parameter boundary variants (added when breaking each Parameter Checking
field down into concrete variants, per the tree method — each verified
empirically against the live mock, not just reasoned about abstractly)

18. **Blank `status` filter (TC-003a)** — treated as "no filter", identical
    to omitting the parameter entirely: `200`, every seat returned. An
    empty value conveys no constraint, not an invalid one; rejecting it
    would be inconsistent with the already-decided "no param = no filter"
    behavior.
19. **`status` filter case sensitivity / whitespace (TC-003b, TC-003c)** —
    case-sensitive, exact match only. Wrong case (`AVAILABLE`) or
    incidental whitespace (`available `) are bucketed with any other
    unrecognized value (decision #4): same `400
    {"error": "invalid status value"}`. No normalization or trimming —
    silently guessing the caller's intent is worse than a loud, consistent
    rejection.
20. **Blank `eventId` path segment (TC-004a)** — a genuine router-level
    `404`, not the app's `Event not found` JSON. `/api/events//seats`
    first gets a `301` from the router's path-cleaning (`//` collapses to
    `/`), redirecting to `/api/events/seats`, which matches no registered
    route and produces the router's generic `{"error": "not found"}`.
    Verified live: distinguishable in practice from a well-formed-but-
    missing event (decision #5), and not special-cased in the handler —
    documented as a known shape difference rather than patched away.
21. **Malformed / special-character `eventId` (TC-004b)** — treated
    exactly like any other nonexistent event (decision #5): a plain
    string-equality lookup, no format validation, no decoding beyond
    what the router already does. `404 {"error": "Event not found"}`,
    identical to the plain-nonexistent case.
22. **Blank or wrong-type `seatId` (TC-008b, TC-008c)** — both fold into
    the same bucket as a missing `seatId` (decision #9): `400
    {"error": "seatId is required"}`. None of these variants give the
    caller a usable seat identifier; splitting them into separate
    messages wouldn't give the caller more to act on.
23. **Blank or wrong-type `status` on PATCH (TC-021a, TC-021b, TC-021c)** — both
    fold into the same bucket as an illegal status value (decision #3):
    `400 {"error": "invalid status"}`.
24. **`status` wrong case on PATCH (TC-021d)** — case-sensitive, exact
    match only, same reasoning as #19: `"Confirmed"` is not `"confirmed"`,
    same `400` bucket as decision #3.

Each field's **Valid** variant (TC-003e, TC-004d, TC-008e, TC-021f) isn't a
new decision — it confirms decisions #1 (shape), #12 (duration), and #13
(response shape) already cover the happy path for that field in isolation.

## Left genuinely open

- Rate limiting / abuse protection on repeated hold attempts — not
  exercised by any user story.
- Whether a confirmed hold can later be reversed — out of scope; the
  user stories only describe confirm and release as terminal actions.
