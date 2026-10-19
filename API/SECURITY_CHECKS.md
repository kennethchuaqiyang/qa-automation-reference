# Security checks — Event Seat Hold API

A documented review, not an automated scanner suite (no OWASP ZAP or
equivalent in this environment) — see "Non Functional splits into Load
and Security" in `README-generating-at.md`. Findings here are either
confirmed by hand (curl, reading `main.go`) or cross-referenced against
`automation/` where a Playwright test already proves the relevant
behavior.

## TC-024 — No rate limiting (confirmed, documented gap)

`DECISIONS.md #17`. Verified two ways:
- `automation/` previously had TC-024 as 5 sequential `curl` calls, all
  returning 200 — moved out since it isn't a real load scenario.
- `load-test/load-test.yml`'s "Repeated hold attempts" scenario confirms
  the same thing under actual concurrent load: 231 hold attempts in a
  60s run, zero 429s, zero throttling of any kind.

**Risk:** a real deployment with this gap is open to credential
stuffing against `/holds` (no cap on attempts per IP/customer) and to
inventory-exhaustion abuse (repeatedly holding and letting seats expire
to deny other customers). Not exploitable *here* since this is a mock
with no real payment/identity behind it, but worth naming as exactly the
kind of gap that should block a production launch.

**Not re-fixed here** — this documents the gap for the interview
conversation, it isn't a bug being patched in the mock.

## `x-customer-id` is an unauthenticated trust claim

Every `holds` endpoint identifies the customer purely by the
`x-customer-id` header — there's no token, session, or signature tying
it to anything. Anyone can claim to be `cust_bob` and confirm or release
`cust_bob`'s holds (`DECISIONS.md #10`'s 404-not-403 behavior for
"someone else's hold" actually depends on this: the API can't tell real
ownership from a spoofed header, so it just checks whether the claimed
customer matches the hold's stored customer).

**Risk:** this is fine for a mock representing "the real system already
authenticates upstream and forwards a trusted customer ID," which is a
very common real microservice pattern — but it's worth being explicit
that this mock does *not* model or test that upstream auth boundary at
all. Confirming TC-011/TC-016 pass (someone else's hold is rejected)
only proves the *header comparison* logic is correct, not that the
header itself can be trusted.

## No security-relevant response headers

```
$ curl -sD - -o /dev/null http://localhost:8080/api/events/evt_summer_fest/seats
HTTP/1.1 200 OK
Content-Type: application/json
Date: ...
Content-Length: ...
```

No `X-Content-Type-Options`, no CORS headers, no cache-control on
anything. Not a defect in a backend-only mock API (no browser rendering
HTML here to protect), but would be worth a checklist item if this ever
sits behind a browser-facing gateway.

## Input validation (positive finding)

The Parameter Checking category in `automation/` (TC-003a..e, TC-004a..d,
TC-008a..e, TC-021a..f) already exercises malformed/boundary input on
every field across all three endpoints, and none of it causes a crash,
stack trace leak, or unexpected 500 — every invalid input path returns a
clean 400/404 with the documented error shape. That's a real security
property (no input-driven crash or information disclosure), it's just
proven by the existing Functional/Parameter Checking suite rather than
needing separate security tooling.
