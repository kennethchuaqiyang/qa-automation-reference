# Automation_For_QA_Notice

Run finished: **failed**, generated 2026-10-19T03:10:37.160Z

Auto-generated after every `npx playwright test` run (see `reporters/qa-notice-reporter.ts`). Lists every test that did NOT cleanly pass — failed, timed out, skipped, or marked `fixme` — with a best-guess reason. This is a triage aid, not a verdict: always check the referenced DECISIONS.md entry (and BUGS.md, for this pair) and the actual stack trace before concluding anything.

## TC-015: confirm with nothing selected — Confirm is disabled/non-interactive, no booking created (DECISIONS.md #10)

- **File:** `C:\TrainAI\FE\automation\tests\login-slot-picker.spec.ts`
- **Status:** failed
- **Likely reason:** Assertion mismatch — the mock's actual behavior no longer matches what DECISIONS.md documents for this case. Check whether mock-site/server.js changed, cross-reference BUGS.md (two known deliberate bugs exist), or whether this is a genuine new regression worth a decision update.
- **Error:**
  ```
  Error: expect(locator).toBeDisabled() failed
  
  Locator:  locator('#confirm-btn')
  Expected: disabled
  Received: enabled
  Timeout:  5000ms
  
  Call log:
    - Expect "toBeDisabled" locator('#confirm-btn') with timeout 5000ms
    - waiting for locator('#confirm-btn')
  ```

## TC-018: lockout expires after the 15s timeout window (DECISIONS.md #8) — real-time wait, no seeded-expired-state trick

- **File:** `C:\TrainAI\FE\automation\tests\login-slot-picker.spec.ts`
- **Status:** failed
- **Likely reason:** Assertion mismatch — the mock's actual behavior no longer matches what DECISIONS.md documents for this case. Check whether mock-site/server.js changed, cross-reference BUGS.md (two known deliberate bugs exist), or whether this is a genuine new regression worth a decision update.
- **Error:**
  ```
  Error: expect(page).toHaveURL(expected) failed
  
  Expected pattern: /\/login$/
  Received string:  "http://localhost:4000/login-failed"
  Timeout: 5000ms
  
  Call log:
    - Expect "toHaveURL" with timeout 5000ms
      14 × locator resolved to <html lang="en">…</html>
         - unexpected value "http://localhost:4000/login-failed"
  ```
