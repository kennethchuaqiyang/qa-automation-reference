# Decisions made to resolve the questions flagged in test-cases/cases.csv

`USER_STORIES.md` describes behavior and intent, not exact copy, field
validation timing, or page content — there's deliberately no wireframe.
Drafting concrete test cases surfaced the gaps below. Unlike the API
pair, there's no live mock yet to verify these against empirically —
these are reasoned decisions, to be confirmed once the mock site and
automation exist.

## Login — field validation

1. **Blank email or password (TC-001a, TC-002a)** — a client-side
   validation error; the form never submits, so it does **not** count
   toward the 3-try lockout. Treating a blank-field slip the same as a
   genuine failed credential attempt would unfairly inflate lockout risk
   for ordinary typos/misclicks, which isn't what US-3 is protecting
   against.
2. **Malformed email format (TC-001b)** — no client-side format
   validation. Any non-blank email is sent straight to the same generic
   credential check as a wrong password; there's no separate
   "bad format" code path, so nothing about account existence or format
   validity can leak through a different response.

## Login — error behavior

3. **Wrong password / nonexistent email (TC-001c, TC-004, TC-005)** —
   identical copy both ways: `"Incorrect email or password."` Directly
   satisfies US-2's requirement that the error not reveal whether the
   email exists.
4. **Remaining-attempts count (TC-006)** — not shown. Nothing in the
   user stories asks for a countdown, and showing one discloses more
   than necessary about how close an attacker is to triggering the next
   state.
5. **Login Failed page content (TC-007)** — a standalone page (not an
   inline banner), no form on it: `"Too many failed attempts. Please
   try again later."` No retry button or contact-support action, since
   none is specified — kept to what's actually testable rather than
   inventing an unspecified flow.
6. **Mixed-email attempts toward the same lockout (TC-008)** — the
   3-try counter is tracked per browser session, not per attempted
   email: it increments on any failed attempt regardless of which email
   was tried. Matches US-3's explicit "whatever the mix of wrong
   email/wrong password across the 3 tries" wording directly.
7. **Lockout survives reload (TC-017)** — persists across a page
   reload; the counter is not purely client-side state. A counter a
   simple refresh could reset would defeat the entire purpose of the
   brute-force protection in US-3.
8. **Lockout duration (TC-018)** — **15 seconds**, decided specifically
   for testability: short enough that the automation suite can actually
   wait out the real window and verify the unlock for real (no seeded-
   expired-state trick needed, unlike the API pair's 10-minute holds),
   which also keeps reruns fast during rehearsal. After the window
   passes, the attempt counter resets and login works normally again —
   not an instant re-lock on the next single failure.

## Slot Picker

9. **Empty state copy (TC-010)** — `"No appointment slots available
   for this date. Try a different date."` Informational only in this
   mock; actually switching dates is out of scope for this golden pair
   (doctor/date selection is assumed already fixed, per the user
   stories' framing).
10. **Confirm with nothing selected (TC-015)** — Confirm is
    disabled/non-interactive until a slot is selected, rather than
    clickable-with-an-error. Matches US-7's "guard against confirming"
    framing — prevent the mistake, don't just react to it after the
    fact.
11. **Slot taken mid-decision (TC-016)** — on clicking Confirm, if the
    selected slot is no longer available: an inline message (`"This
    time is no longer available — please choose another."`), the
    selection clears, and the slot list re-renders to reflect the new
    state. Matches US-8's acceptance criteria directly.

## Left genuinely open

- Whether a confirmed booking can later be cancelled/rescheduled — not
  covered by any user story.
- Doctor/date selection itself (assumed a fixed precondition for this
  pair, not part of what's tested here).
