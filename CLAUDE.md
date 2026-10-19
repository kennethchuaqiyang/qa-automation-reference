# Practice workspace — Ordinary Folk Round 2 prep

This workspace holds three separate golden pairs, each practicing a
different shape of automation. They are independent projects — don't
mix user stories, decisions, or code between folders.

- `sampleapiautomation/` — pure API testing (user stories, mock API, Playwright test suite)
- `samplefeautomation/` — pure frontend/UI testing (user stories, mock site, Playwright UI tests)
- `samplehybrid/` — a feature with both an API and a UI in front of it

For the methodology behind each stage, see:
- `README-generating-test-cases.md` — how user stories become test cases
  (tree method, category taxonomy, xlsx template).
- `README-generating-at.md` — how approved test cases become automation
  (Playwright, base URL config, the QA notice reporter, verification
  discipline).

Each folder follows the same internal shape once built:
- `USER_STORIES.md` — the only given input, the way it actually arrives
  in practice (per Round 1): user stories/tickets. There is no separate
  requirements document — don't create one. Deliberately left ambiguous
  in places, same as a real ticket.
- `QUESTIONS.md` — every open question flagged while drafting test cases,
  as its own standalone file (not just a column in the sheet), so the
  draft-time gaps are reviewable on their own.
- `DECISIONS.md` — each question from `QUESTIONS.md` resolved with a
  concrete written answer and a reason, verified against the live mock,
  not just reasoned about abstractly.
- `test-cases/` — see `README-generating-test-cases.md` for the exact
  format (two `.xlsx` workbooks: draft and finalized).
- the mock (Go API server, or a static/mock frontend) to test against
- `automation/` — the Playwright suite; see `README-generating-at.md`.

## Workflow — stop for review at each stage

Work in stages, one folder at a time. After each stage, stop and present
output for review. Do not proceed to the next stage until explicitly told
to continue. This is the exact pipeline, end to end:

1. **Read the user stories (the requirement).** Output: a **draft**
   `Test_Cases_<Feature>.xlsx` (Case Info + Cases tabs populated) and
   `QUESTIONS.md`. Where a case can't be written concretely because the
   stories don't say enough, flag it inline as an open question instead
   of silently deciding it or skipping it — the point is to surface real
   gaps by actually trying to write concrete cases, not to guess at gaps
   in the abstract. Stop. Present the draft + `QUESTIONS.md` for review.
2. **Decisions** — for each flagged question, a concrete answer with
   reasoning, verified empirically against the live mock where possible.
   Output: `DECISIONS.md` and the **updated (finalized)**
   `Test_Cases_<Feature>_Finalized.xlsx`, every flagged question resolved
   into a concrete expected result referencing the decision that resolved
   it. Stop. Wait for approval before writing any automation code.
3. **Automation (AT)** — built to **strictly follow the outcomes defined
   in the finalized test case file. No hallucination**: implement what
   the sheet says, nothing the sheet doesn't say — no invented extra
   assertions, no "while I'm at it" behavior checks that aren't a row in
   the spreadsheet. The base URL is provided as input (an env var), never
   hardcoded, never guessed. Stop. Wait for approval before running.
   - **API** — curl-equivalent / Playwright API tests (`request` fixture),
     one per TC id, wired to the `Automation_For_QA_Notice` reporter.
   - **FE** — first, a **selector-discovery pass**: from the finalized
     test cases, identify what needs to be inspected on the real/mock
     site to get concrete selectors (manual cases are written without a
     wireframe, so this step is not optional — there's nothing to
     automate against until the actual markup is known). Then Playwright
     UI tests built from that, also wired to the
     `Automation_For_QA_Notice` reporter.
   - **Hybrid** — combine both: one suite covering API-level and
     UI-level automation for the same feature, sharing one
     `Automation_For_QA_Notice`.
4. **Run & verify** — run the suite against the live mock, report pass/fail,
   check the generated `Automation_For_QA_Notice.md`, and flag any test
   that passes without a meaningful assertion (a silent pass — green but
   not actually checking anything). Spot-check at least one test by
   deliberately breaking the behavior it covers and confirming it fails.

Never skip a stage or combine two stages without being told to.

When a field in Parameter Checking is broken down into boundary variants
(blank, wrong type, wrong case, nonexistent, etc. — per the tree method),
always add a final **Valid** variant for that field too: a success-criteria
case confirming the field accepts a legitimate value, matching the real
template's pattern (see `README-generating-test-cases.md`).

## Verification discipline

Treat every proposal (test case, selector, assertion, code) as a draft from
a fast but unreliable colleague — useful, never self-certifying. A test is
only trusted once it has been checked against `DECISIONS.md` and shown to
actually fail when the behavior it's supposed to check is broken (not just
shown to pass once).

## Parking finished material

Once a stage's output is approved, copy it to `C:\TrainAI\<pair-name>\`
on Kenneth's machine (via the device bridge) — e.g.
`C:\TrainAI\API\...`, `C:\TrainAI\FE\...`, `C:\TrainAI\Hybrid\...` — so
it's available as reference material in GitHub Codespaces on interview
day. Only the deliverables go there (`.md` docs, the two `.xlsx`
workbooks, the mock source, the automation project) — never the
intermediate `.csv` working files used to generate the xlsx.
`README-generating-test-cases.md` and `README-generating-at.md` get
parked once at `C:\TrainAI\` (workspace root), not duplicated per pair.
