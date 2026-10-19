# Security checks — Login + Slot Picker

A documented review, not an automated scanner suite — see "Non
Functional splits into Load and Security" in
`../README-generating-at.md`. Findings here are either confirmed by
hand (grep against `mock-site/server.js`) or cross-referenced against
`automation/` where a Playwright test already proves the relevant
behavior.

## Session cookie missing `secure` and `sameSite`

`mock-site/server.js`:

```js
res.cookie("sid", sid, { httpOnly: true });
```

`httpOnly` is set (good — blocks JS/XSS from reading the session
cookie), but no `secure` (cookie would still be sent over plain HTTP)
and no `sameSite` (no CSRF protection — a third-party site could
trigger a cross-site request that rides on this cookie, e.g. submitting
a booking confirmation on the victim's behalf).

**Risk:** acceptable for a local mock with no real HTTPS termination in
front of it, but this is exactly the kind of finding that should be
flagged in a real code review before shipping session-cookie auth.
Would recommend `{ httpOnly: true, secure: true, sameSite: "lax" }` (or
`"strict"`) once there's a real TLS-terminated deployment.

**Not fixed here** — documenting the gap, not patching the mock.

## Lockout bypass via page reload (formerly TC-017)

Previously an automated Playwright test; moved out of
Functional/Playwright because it's really probing a security property
(can a client-side-only state reset defeat a server-side control?) more
than user-facing functional behavior. The underlying bug is **Bug 1**
in `mock-site/BUGS.md` — `isLocked(session)` only checks
`lockedUntil !== null`, never `Date.now()` — so a lockout never expires
server-side; separately, the *session itself* survives a reload (cookie
persists), so a reload does NOT bypass the lockout in the current
implementation. This is now re-verified as a **Functional** correctness
check (TC-018 in `automation/`), not a security-specific test, since it
turned out to be about server-side lockout-expiry logic rather than a
client-can-reset-security-state issue. Documented here for traceability
since the Non Functional category used to carry it.

## No rate limiting on login attempts

`DECISIONS.md`'s lockout rule (5 failed attempts → locked) is the only
throttling in the system, and it's per-account, not per-IP — nothing
stops a distributed attacker from spreading failed attempts across many
different target accounts to avoid any single account's lockout, or
from simply accepting the lockout and moving to the next account.
`load-test/load-test.yml`'s "Repeated failed logins" scenario exercises
the traffic *shape* of this (many virtual users hammering `/login` with
bad passwords) and confirms the server stays responsive under it — but
that's a load/availability finding, not a security control; there's no
IP-level or global rate limit to actually block the behavior.

**Risk:** real credential-stuffing exposure in a production system. Not
exploitable here beyond the mock's own login flow, but worth naming
alongside the API pair's equivalent finding in
`../sampleapiautomation/SECURITY_CHECKS.md`.

## Input validation (positive finding)

The Parameter Checking category in `automation/` (TC-001a/b1-4/c/d,
TC-002a/b) already exercises malformed/boundary input on both login
fields, and none of it causes a server error or unexpected behavior —
every invalid input path returns a clean validation message or login
error. That's a real security property (no input-driven crash), proven
by the existing suite rather than needing separate security tooling.
