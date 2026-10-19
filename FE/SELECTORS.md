# Selector discovery — Login + Slot Picker mock

Required by `README-generating-at.md` before writing any FE automation:
there's no wireframe in the finalized test cases, so selectors are
discovered against the running mock (`mock-site/`, `npm start`,
`http://localhost:4000`), not guessed. Captured by inspecting the actual
HTML returned for each state, via curl against the local mock.

## Login page (`GET /login`)

| Element | Selector |
|---|---|
| Email field | `#email` |
| Password field | `#password` |
| Submit button | `#login-submit` |
| Client-side blank-field validation message | `#validation-error` (hidden via inline `style="display:none"` until shown, text set by `public/login.js`) |
| Inline credential error ("Incorrect email or password.") | `#login-error` (same hidden/shown pattern, server-rendered) |

Both `#validation-error` and `#login-error` exist in the DOM on every
load; visibility (not presence) is what distinguishes "no error" from
"error shown" — assert on `toBeVisible()` / `toBeHidden()`, not on
element existence.

## Login Failed page (`GET /login-failed`, reached by redirect after the
3rd consecutive failed attempt or any page load while locked)

| Element | Selector |
|---|---|
| Message | `#login-failed-message` — exact text: `Too many failed attempts. Please try again later.` |

No form, no retry button on this page (confirms DECISIONS.md #5 — nothing
else to select).

## Booking / slot picker page (`GET /booking`)

| Element | Selector |
|---|---|
| Slot list container | `#slot-list` |
| Individual slot button | `[data-slot-id="<id>"]` (also carries class `slot` + `available`/`taken`, and `selected` when it's the current selection) |
| Available slot | `.slot.available[data-slot-id="<id>"]` — no `disabled` attribute |
| Taken slot | `.slot.taken[data-slot-id="<id>"]` — has `disabled` attribute, not clickable |
| Selected slot | gains class `selected` in addition to `available` |
| Empty state (no available slots) | `#empty-state` — exact text: `No appointment slots available for this date. Try a different date.` (replaces `#slot-list`'s contents entirely, not a sibling) |
| Mid-decision "slot taken" message | `#slot-taken-message` — exact text: `This time is no longer available — please choose another.` (hidden/shown like the login page's error divs) |
| Booking success message | `#booking-success` — text: `Booked! Your appointment is confirmed for <time>.` (hidden/shown) |
| Confirm button | `#confirm-btn` |

Slot ids are stable across a server run: `slot-1`..`slot-4`. A slot
button is itself the submit control for a one-button `<form>` posting to
`/select`; clicking the same selected slot again deselects it
(`POST /select` toggles server-side).

## Known gap vs. DECISIONS.md #10 (flag for the AT, don't fix it here)

`#confirm-btn` never carries a `disabled` attribute, with nothing or a
slot selected — contradicts "Confirm is disabled/non-interactive until a
slot is selected." TC-015's assertion needs to target the `disabled`
state specifically (`expect(confirmBtn).toBeDisabled()`), not just
"no booking was created" — a looser assertion could pass even though the
button is wrongly clickable.

## Test-only hooks (not part of the UI, used directly by the AT)

| Hook | Purpose |
|---|---|
| `POST /simulate-taken` `{ slotId }` | marks a slot unavailable server-side, for TC-016 (another patient books it mid-decision) |
| `POST /__reset` | restores the 4-slot baseline and clears all sessions — call in `beforeEach`/`afterEach` so tests don't leak state into each other |

## Test account

`patient_alice@example.com` / `Password123!`
