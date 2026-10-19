# Open questions flagged while drafting test cases

Surfaced by trying to write concrete test cases against `USER_STORIES.md`
— not guessed at beforehand. Each will be resolved in `DECISIONS.md`.

## Login — field validation

- **TC-001a / TC-002a** — Is a blank email or password treated as a
  client-side validation error (no server hit, doesn't count toward
  lockout), or does it count as a failed login attempt toward the 3-try
  lockout?
- **TC-001b** — Is email format validated client-side before submit, or
  does an invalid-format email just fall through to the generic
  wrong-credentials error?

## Login — error behavior

- **TC-001c / TC-005** — Confirm the exact copy for a nonexistent email
  is identical to a wrong password for a real account (US-2 requires no
  enumeration) — what is that copy?
- **TC-004** — What's the exact error text/state for a wrong password?
- **TC-006** — Does the UI show a remaining-attempts count ("1 try
  left") before lockout, or stay silent about the count?
- **TC-007** — What does the "Login Failed" lockout page actually show —
  just a message, or a retry/contact-support action? Is it a dead end or
  can the patient do anything from there?
- **TC-008** — US-3 says lockout triggers "whatever the mix" of wrong
  email/wrong password across the 3 tries — does an attempt against a
  *different* (nonexistent) email still count toward the *same* lockout
  counter as an attempt against the real account? Not stated.
- **TC-017** — Does reloading the login page reset the attempt counter
  (client-side only), or does the lockout persist server-side regardless
  of reload? Not stated by the user stories at all.

## Slot Picker

- **TC-010** — What does the "no slots available" empty state actually
  say or offer (e.g. pick another date)?
- **TC-015** — Is Confirm disabled/unclickable with nothing selected, or
  clickable but shows a "pick a time first" message? Not stated.
- **TC-016** — Per US-8, the patient must be informed if their selected
  slot gets taken before they confirm — what's the actual message/state
  shown, and is the slot list updated live or only on the next action?
