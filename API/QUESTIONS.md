# Open questions flagged while drafting test cases

Surfaced by trying to write concrete test cases against `USER_STORIES.md` —
not guessed at beforehand. Each is resolved in `DECISIONS.md` (reference
given below); this file is the record of what was actually unclear at
draft time.

## Contract shape

- **TC-007** — How is the customer identified on `POST /holds` /
  `PATCH /holds/{holdId}`, and what's the exact rejection response when
  that identification is missing? → DECISIONS.md #2, #7
- **TC-021** — Is there a single update action that could be sent an
  illegal value? The API shape itself isn't specified by the user
  stories. → DECISIONS.md #3

## Behavior — GET /seats

- **TC-003** — What exact response (status code + body) for an
  unrecognized `status` filter value? → DECISIONS.md #4
- **TC-004** — What's the response when the `eventId` itself doesn't
  exist? Not covered by the user stories at all. → DECISIONS.md #5

## Behavior — POST /holds

- **TC-006a/b** — What exact response (status code) for holding an
  already-held seat? Same response for already-sold? → DECISIONS.md #6
- **TC-008** — What's the response for holding a nonexistent seat or
  event? Not covered by the user stories. → DECISIONS.md #8
- **TC-009** — Not covered by the user stories at all — how is a
  missing/invalid seat identifier handled? → DECISIONS.md #9

## Behavior — PATCH /holds/{holdId}

- **TC-011** — Does confirming someone else's hold reveal the hold
  exists (permission-denied style) or hide it (not-found style)?
  → DECISIONS.md #10
- **TC-012** — What's the exact response for acting on a hold already
  in a terminal state? → DECISIONS.md #11
- **TC-013** — Is `released` treated the same as `confirmed` for this
  purpose? → DECISIONS.md #11
- **TC-014** — Distinguishable from TC-012/013, or identical?
  → DECISIONS.md #11
- **TC-016** — Same response shape for confirm and release ownership
  checks? → DECISIONS.md #10
- **TC-017** — Rejected as a conflict, or a harmless no-op since the
  end state is the same (releasing an already-released hold)?
  → DECISIONS.md #11
- **TC-018** — Does releasing an expired hold behave the same as
  confirming one? → DECISIONS.md #11
- **TC-020** — How long is the hold window? Not given a concrete
  duration anywhere. → DECISIONS.md #12

## Parameter boundary variants (surfaced while breaking each Parameter
Checking field down into concrete variants, tree-method style — none of
these are given by the user stories either)

- **TC-003a** — Is an explicitly blank `status` value treated the same as
  no filter at all, or rejected? → DECISIONS.md #18
- **TC-003b** — Is the `status` filter case-sensitive? → DECISIONS.md #19
- **TC-003c** — Is incidental whitespace around a `status` value trimmed,
  or treated as a different value? → DECISIONS.md #19
- **TC-004a** — Does an empty `eventId` path segment reach the handler,
  or get rejected before it does — and with what response? →
  DECISIONS.md #20
- **TC-004b** — Is a malformed / special-character `eventId` treated the
  same as a well-formed but nonexistent one? → DECISIONS.md #21
- **TC-008b** — Is a blank `seatId` treated the same as a missing one? →
  DECISIONS.md #22
- **TC-008c** — Is a wrong-type `seatId` (e.g. a number) treated the same
  as a missing one? → DECISIONS.md #22
- **TC-021a** — Is a missing `status` field on PATCH treated the same as
  an illegal value? → DECISIONS.md #23
- **TC-021b** — Is a blank `status` value treated the same as an illegal
  one? → DECISIONS.md #23
- **TC-021c** — Is a wrong-type `status` value treated the same as an
  illegal string value? → DECISIONS.md #23
- **TC-021d** — Is the `status` value on PATCH case-sensitive? →
  DECISIONS.md #24

## Non-functional (surfaced while filling out that category — not asked
for by the user stories at all)

- **TC-022** — User stories don't address concurrent holds. Is
  exactly-one-winner the right behavior, and should the loser get the
  same 409 as a normal already-held conflict, or something distinct?
  → DECISIONS.md #15
- **TC-023** — No performance SLA stated anywhere. What's an acceptable
  response time threshold, and is a local mock even a meaningful way to
  test this? → DECISIONS.md #16
- **TC-024** — Rate limiting/abuse protection is left genuinely open
  (out of scope). Should this be a documented known gap rather than a
  pass/fail case? → DECISIONS.md #17
