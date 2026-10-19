# How automation (AT) gets generated

This is the methodology behind `automation/` in every golden pair in
this workspace. It assumes `test-cases/Test_Cases_<Feature>_Finalized.xlsx`
and `DECISIONS.md` are already approved — automation implements what's
already been decided, it doesn't make new decisions.

## Stack: Playwright (TypeScript)

All automation in this workspace — API and UI — is written in Playwright
with TypeScript, matching the real stack, not a different language per
pair. API-only suites use Playwright's `request` fixture /
`APIRequestContext` directly (no browser needed); UI suites use the
browser-driving APIs on top of the same framework. One tool across all
three golden pairs, not Python for API and JS for FE.

Project shape per pair:

```
automation/
  package.json
  playwright.config.ts
  pages/                # UI pairs only — Page Object Model classes
    <Page>.ts
  tests/
    fixtures.ts        # shared helpers, an auto-reset fixture, and (UI pairs) page-object fixtures
    <feature>.spec.ts   # one test per TC id, grouped by category_1
  reporters/
    qa-notice-reporter.ts
```

## UI pairs: Page Object Model, not raw selectors in the spec

Any suite that drives a browser (FE, and the UI half of Hybrid) uses POM:
one class per page under `pages/`, each wrapping that page's locators and
the actions you can take on it (`loginPage.login(email, password)`,
`bookingPage.selectSlot(id)`). The spec file calls those methods and
reads those locators for assertions — it doesn't hardcode `#email` or
`[data-slot-id=...]` itself. Selectors still come from the
selector-discovery pass (below); POM is where they end up, not a reason
to skip discovering them. `fixtures.ts` instantiates each page object as
a fixture (`loginPage`, `bookingPage`, ...) so tests just destructure
them like any other fixture. One page object per logical page/flow, not
one per TC id — e.g. the standalone Login Failed page is small enough to
live on the same `LoginPage` class as the login form, since they're one
user-facing flow, rather than forcing a separate class for a page with
one locator on it.

## No hallucination — strictly implement the finalized sheet

Automation implements `Test_Cases_<Feature>_Finalized.xlsx`. It does not
add behavior the sheet doesn't state, doesn't invent extra assertions
"while already in there," and doesn't test anything that isn't a row in
the spreadsheet. If a test wants to check something the sheet doesn't
cover, that's a sign a case is missing from the sheet — go add it there
(and resolve it through the usual draft → decide → finalize stages)
rather than letting the automation quietly go further than what was
actually reviewed and approved. The finalized sheet is the single source
of truth for what "correct" means; the suite's job is to faithfully
check it, not to improve on it unasked.

## One test per TC id

Each test's title or a leading comment names the TC id it implements and
the `DECISIONS.md` entry it's checked against (e.g.
`TC-007 hold missing x-customer-id — DECISIONS.md #2/#7`), so a failure
maps straight back to a row in the finalized spreadsheet without having
to go searching.

## Running against named environments (local / uat / prod)

Every suite has an `environments.ts` alongside `playwright.config.ts`:

```ts
export const ENVIRONMENTS = {
  local: "http://localhost:8080",
  uat: process.env.SEAT_HOLD_UAT_URL ?? "",
  prod: process.env.SEAT_HOLD_PROD_URL ?? "",
} as const;
```

`TEST_ENV` picks one (`local` is the default); the config throws a clear
error at startup — not a confusing connection-refused failure mid-run —
if the picked environment has no URL set. The feature-specific
`*_BASE_URL` override (below) still works and always wins over
`TEST_ENV`, for one-off runs against an arbitrary URL.

npm scripts, using `cross-env` so they work identically on Windows,
macOS, and Linux/Codespaces:

```json
"test": "cross-env TEST_ENV=local playwright test",
"test:uat": "cross-env TEST_ENV=uat playwright test",
"test:prod": "cross-env TEST_ENV=prod playwright test"
```

uat/prod have no real deployed instance for any of these golden pairs
yet — set the corresponding `*_UAT_URL` / `*_PROD_URL` env var (shell
profile or CI secret, not committed) once one exists. Nothing in
`environments.ts` is a secret, just base URLs.

## Priority tags — @smoke and @edge

Every test carries a tag matching `priority` from the finalized sheet:
priority 0/1 → `@smoke`, priority 2 → `@edge`. Passed as Playwright's
native tag syntax, the second argument to `test()`:

```ts
test("TC-005 ...", { tag: ["@smoke"] }, async ({ request }) => { ... });
```

Run a subset with `--grep`:

```json
"test:smoke": "cross-env TEST_ENV=local playwright test --grep @smoke",
"test:edge": "cross-env TEST_ENV=local playwright test --grep @edge"
```

`@smoke` is the fast, must-pass confidence check (happy paths + the
highest-priority failure modes); `@edge` is the boundary/parameter-level
depth. Both still run in the full `npm test`; the split only matters when
you want a quick subset (e.g. smoke-only against uat/prod before a
deeper local run).

## Base URL is never hardcoded

Every suite reads its target from an environment variable with a
sensible local default, so the same suite runs against the local mock or
a deployed instance without code changes:

```ts
baseURL: process.env.SEAT_HOLD_BASE_URL ?? "http://localhost:8080"
```

(Naming convention: `<FEATURE>_BASE_URL`, feature-specific so running
suites for different golden pairs side-by-side never collides.)

## FE only: selector discovery comes before automation

FE test cases are drafted and finalized without a wireframe — the
manual steps describe behavior and intent ("clicking an available slot
marks it as selected"), not DOM structure. There's a mandatory step
between "test cases finalized" and "write the Playwright suite" that
doesn't exist for pure API work: inspect the real/mock site itself
(`page.locator`, accessibility tree, `codegen`, or just reading the
mock's markup) to find the actual selectors each finalized case needs.
Only once those are known does writing the suite become implementing
rather than guessing. Skipping this and guessing plausible-looking
selectors is exactly the kind of hallucination the previous section
rules out — a selector that was never confirmed against the real page is
not "strictly following the finalized test case," even if it happens to
work by coincidence.

## Hybrid: one suite, one notice

A Hybrid pair's automation combines both of the above in a single
project — API-level checks (`request` fixture) and UI-level checks
(selector discovery + browser automation) for the same feature, sharing
one `playwright.config.ts`, one `reporters/qa-notice-reporter.ts`, and
one `Automation_For_QA_Notice.md` covering the whole suite. Not two
separate automation folders bolted together.

## Shared, mutable mock state → serial execution

The mock keeps in-memory state (holds, seat status) and exposes
`/debug/reset`. Tests that mutate this state can't run in parallel
against each other without stepping on one another, so:
- `workers: 1` and `fullyParallel: false` in `playwright.config.ts`.
- An autouse fixture calls `/debug/reset` before every test, so each
  test starts from known seed data regardless of execution order.

## The QA notice reporter — standing convention

Every automation project in this workspace includes
`reporters/qa-notice-reporter.ts`, registered in `playwright.config.ts`:

```ts
reporter: [["list"], ["./reporters/qa-notice-reporter.ts"]],
```

After every run it writes `Automation_For_QA_Notice.md` — a
triage-oriented summary of anything that did **not** cleanly pass
(failed, timed out, skipped, or `test.fixme()`), each with:
- the test name and the DECISIONS.md reference it checks
- the actual error
- a best-guess *likely reason*, pattern-matched off the error
  (connection/timeout → check the mock is running and `BASE_URL` is
  right; assertion mismatch → check for a real behavior regression vs.
  `DECISIONS.md`; skip/fixme → check the stated reason in the spec)

A clean run writes a one-line "nothing to report." This isn't a
replacement for reading the actual stack trace — every entry says so —
it's a first triage pass so a failure doesn't start from a blank stack
trace, especially useful in a live interview setting where there's no
time to re-derive context from scratch.

When would a test actually carry `test.skip()` or `test.fixme()`?
- `skip` — a condition genuinely doesn't apply here (environment-gated
  behavior, e.g. a cold-start timing check that only makes sense against
  a deployed instance, skipped when pointed at localhost), or a known
  flaky test under active investigation, always with a stated reason.
- `fixme` — a test that's expected to fail right now: a known, tracked
  bug, or a TDD-style test written against a spec before the behavior is
  implemented. It still runs (so it stops being invisible, unlike a
  skip) but doesn't fail the suite.

Neither is a substitute for a documented *decision*. In this workspace,
an intentionally-unimplemented behavior (e.g. rate limiting) is written
as a passing test that asserts the documented gap (see `DECISIONS.md`
and the Non Functional category), not silently skipped — the gap itself
is the thing worth testing for.

## Non Functional splits into Load and Security

`Non Functional` is a category in the test-case sheet (see
`README-generating-test-cases.md`), but it is **not** a category that
belongs inside a Playwright AT suite. A functional suite should answer
"does the behavior work," run in seconds, against one request/action at
a time — load and security concerns need a fundamentally different
shape of check (sustained concurrent traffic; probing for the absence
of a control), and bolting that onto the same suite either makes the
suite slow and flaky or, more often, reduces a real load/security
concern to a single illustrative request that proves nothing at the
scale that actually matters.

So every case originally drafted as `Non Functional` gets re-examined
and lands in exactly one of two places:

1. **Genuinely load- or security-shaped** → moved out of Playwright
   entirely, into dedicated tooling per pair:
   - `load-test/` — an Artillery config (`load-test.yml` +
     `README.md`) with named `local`/`uat`/`prod` targets (same
     environment pattern as the AT suite's `environments.ts`), run
     with `npx artillery@latest run load-test.yml [-e uat|prod]`. This
     is where "does it hold up under concurrent/sustained traffic"
     actually gets answered, with a real ramping load profile instead
     of a handful of sequential requests.
   - `SECURITY_CHECKS.md` — a hand-written, hand-verified findings
     doc (missing security headers/cookie flags, unauthenticated trust
     claims, no-rate-limiting as a security gap rather than a load
     number, etc.), cross-referencing the load test's output and the
     existing Functional/Parameter Checking suite where those already
     happen to prove a security-relevant property (e.g. "no malformed
     input causes a 500" is a security finding, proven by tests that
     already exist for a different reason).
2. **Actually functional correctness, mislabeled** → recategorized to
   `Functional` and kept (or restored) in the Playwright suite. The
   tell: the case is deterministic and about a single request/action's
   correctness under a specific condition (a race between two
   concurrent requests resolving to exactly one 200 and one 409; a
   timing-window check like "does a lockout actually expire after N
   seconds"; a persistence check like "does state survive a page
   reload") — not about volume, scale, or the absence of a
   defensive control. These are ordinary functional bugs that happen
   to need a slightly less trivial setup (two parallel requests
   instead of one; a `setTimeout`/wait instead of an immediate
   assertion), not load or security concerns.

This split matters beyond tidiness: in this workspace it's what
restored real bug coverage. A lockout-expiry bug (`BUGS.md`'s Bug 1)
was briefly undetectable once "remove Non Functional from AT" was
interpreted as "delete those tests," because the one case that caught
it (lockout expires after its timeout window) had been bucketed as Non
Functional purely because the draft-time category taxonomy didn't have
a cleaner bucket for "timing-dependent functional check." Recognizing
it as Functional, not Non Functional, and putting it back fixed that —
the fix was a categorization correction, not new test-writing.
Concretely: API's TC-022 (concurrent hold race) and FE's TC-016/TC-018
(persistence, lockout expiry) moved back to Functional/AT; API's
TC-023/TC-024 and FE's TC-017 moved out to `load-test/` and
`SECURITY_CHECKS.md`, since those are genuinely about scale (response
time under load, no rate limiting) and a security-control gap
(client-side-only state vs. server-side enforcement), not single-request
correctness.

## Verification discipline — mutation-test at least one case

A test suite that has only ever been run against working code hasn't
proven anything about itself. Before calling a suite "verified," break
one real behavior deliberately (flip a status code, swap an error
message) in a throwaway copy of the mock, confirm the suite fails
exactly where expected and nowhere else, then revert and confirm it's
green again. This is cheap to do and is the actual difference between "I
wrote tests" and "I wrote tests that work."
