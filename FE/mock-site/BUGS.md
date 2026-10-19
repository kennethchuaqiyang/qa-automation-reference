# Deliberate bugs — answer key (not for the AT suite to read)

This mock is intentionally built with four real bugs in the *implementation
logic* (not in USER_STORIES.md, not in the test cases). The finalized test
cases were written as if the site were correct; these bugs are what the
Playwright AT suite is supposed to catch and the QA notice reporter is
supposed to flag. Bugs 3 and 4 were added later, at the request to make
the mock catch "more logical bugs" — both are ordinary functional logic
bugs, not Non Functional/load/security concerns, so they slot into the
existing Parameter Checking / Functional categories, not a new one.

Keep this file out of the selector-discovery pass and out of the AT
suite's own references — treat it the way a real reviewer would never get
to see the dev's private notes before testing.

## Bug 1 — lockout never expires

`isLocked()` in `server.js` only checks whether `session.lockedUntil` has
ever been set; it never compares it against `Date.now()`. So once a
session hits the 3-try lockout, it is locked forever, not for 15 seconds
as DECISIONS.md #8 specifies.

- **Caught by:** TC-018 (lockout expires after timeout window) — it was
  briefly removed when all `category_1 = Non Functional` cases were
  pulled out of `automation/tests/login-slot-picker.spec.ts` wholesale,
  but TC-018 turned out to be a deterministic functional-correctness
  check (does server-side lockout expiry actually work after the
  configured window), not a load/security concern — so it was
  recategorized to `Functional` and restored to the suite. See "Non
  Functional splits into Load and Security" in
  `../README-generating-at.md`. TC-018 is back in AT and currently
  **fails**, correctly catching this bug.
- **Not caught by:** TC-017 (lockout persists across reload) — this one
  genuinely moved to Security scope (see
  `../SECURITY_CHECKS.md`'s "Lockout bypass via page reload" section)
  and is no longer a Playwright test. It would pass regardless, since
  the bug doesn't affect persistence, only expiry.

## Bug 2 — Confirm is never actually disabled, and no-selection isn't guarded

DECISIONS.md #10 says Confirm should be disabled/non-interactive until a
slot is selected. `#confirm-btn` in `renderBooking()` has no `disabled`
attribute logic at all — it's always clickable. The `/confirm` handler
also has no explicit "nothing selected" guard; it relies on
`SLOTS.find(...)` returning `undefined` and silently re-renders the page
with no message.

- **Caught by:** TC-015 (confirm with nothing selected) — the expected
  result says Confirm should be disabled/non-interactive; a selector check
  for a `disabled` attribute on `#confirm-btn` will fail.
- **Side effect:** clicking Confirm with nothing selected is at least
  harmless (no booking is created, no crash) — so if TC-015's assertion
  is written loosely (just "no booking created"), it could pass by
  accident and miss the real bug. Worth checking the assertion actually
  targets the disabled state, not just the absence of a booking.

## Bug 3 — email enumeration leak for valid-but-unregistered emails

DECISIONS.md #3 requires identical copy for "wrong password" and
"nonexistent email," specifically to avoid leaking which emails have
accounts. `POST /login` in `server.js` now checks `looksLikeEmail(email)`
(a loose shape regex) for any email not in `USERS`: if it looks like a
real email address, the response is "No account found with that email."
instead of the generic "Incorrect email or password." — a direct
account-enumeration leak for well-formed addresses.

Narrowly scoped on purpose: `looksLikeEmail()` only matches genuinely
email-shaped strings (`local@domain.tld`), so the existing malformed-email
cases (TC-001b1-4: missing `@`, missing extension, missing local part,
missing domain) fall through to the same generic message as before and
are unaffected.

- **Caught by:** TC-001c (valid format but unregistered email — identical
  copy to a wrong password) and TC-005 (nonexistent email — same inline
  error as TC-004), both of which assert the exact generic message
  `"Incorrect email or password."` for `nobody@example.com`. Both should
  now **fail** since they'll see `"No account found with that email."`
  instead.
- **Not caught by:** TC-001b1-4 (malformed emails) — unaffected, since
  none of those inputs pass `looksLikeEmail()`.

## Bug 4 — confirming a booking doesn't actually deplete inventory

`POST /confirm`'s success path is missing `slot.available = false;`. A
confirmed booking sets `lastBookedTime` and shows the success message,
but the slot itself is never flipped to unavailable — it stays bookable
by the same session or any other session afterward, and the slot list
never actually runs out.

- **Caught by:** TC-010 (view with no slots available — shows the empty
  state message) — it books out every available slot (`slot-1`,
  `slot-3`, `slot-4`) expecting the empty-state message afterward. With
  this bug, none of those slots ever actually become unavailable, so the
  empty state is never reached and the assertion fails (most likely a
  timeout waiting for `#empty-state`, since the slot list is never
  empty).
- **Side effect:** TC-014 (confirm with a slot selected — booking
  succeeds) still passes regardless, since it only checks the success
  message appears, not that the slot became unbookable afterward — a
  reminder that a passing "success" assertion doesn't by itself prove
  the underlying state change happened.
