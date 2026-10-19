# Automation_For_QA_Notice

Run finished: **failed**, generated 2026-10-19T07:48:14.800Z

Auto-generated after every `npx playwright test` run (see `reporters/qa-notice-reporter.ts`). Lists every test that did NOT cleanly pass — failed, timed out, skipped, or marked `fixme` — with a best-guess reason. This is a triage aid, not a verdict: always check the referenced DECISIONS.md entry and the actual stack trace before concluding anything.

## TC-101a date left blank, Search clicked — client-side blocked, no request sent, DECISIONS.md #8

- **File:** `C:\TrainAI\Hybrid\automation\tests\desk-booking-ui.spec.ts`
- **Status:** failed
- **Likely reason:** Assertion mismatch — the mock's actual response no longer matches what DECISIONS.md documents for this case. Check whether main.go changed, or whether this is a genuine behavior regression worth a new decision.
- **Error:**
  ```
  Error: expect(received).toBe(expected) // Object.is equality
  
  Expected: "https://desk-booking-mock.onrender.com/search"
  Received: "https://desk-booking-mock.onrender.com/search?memberId=mem_alice&date=&zone="
  ```
