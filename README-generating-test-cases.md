# How test cases get generated

This is the methodology behind `test-cases/` in every golden pair in this
workspace, written up once rather than re-explained per pair. It's the
process actually used to build the API golden pair's 40-case set, not a
theoretical description.

## Input: user stories only

The only given input is `USER_STORIES.md` — the way a ticket actually
arrives in practice (per the real Round 1 interview). There is no
separate requirements document. Stories are deliberately loose: behavior
and acceptance criteria, no endpoint shapes, no field names, no exact
error copy, no wireframe for FE work. That looseness is intentional —
closing those gaps is the job test-case drafting does.

## Stage 1 — Draft, flag questions, don't guess

Write concrete test cases straight from the user stories. The discipline
that matters here: **try to write a real, runnable case** (a real curl
command, not "check that the API rejects bad input") before deciding
whether the user stories actually answer what that case needs. Most of
the real gaps only show up this way — reasoning abstractly about "what
might be ambiguous" produces a different, weaker list than actually
trying to write the thing and getting stuck.

Where a case can't be written concretely, flag it **inline**, in the row
itself, not in a separate pass. Leave the expected result as `?`. Collect
every flagged question into its own `QUESTIONS.md` file as well — a
standalone, skimmable list of exactly what's unresolved.

## Stage 2 — Decisions

For each flagged question, propose a concrete answer with reasoning —
and verify it empirically against the live mock wherever that's
possible, rather than just asserting an answer sounds right. Every
decision in `DECISIONS.md` should be traceable to either (a) a real curl
request/response against the mock, or (b) a stated reason tied back to
the user stories, never "because that's what the code happens to do" —
code is implemented *to match* the decision, not consulted to produce
the decision after the fact.

## Stage 3 — Finalize

Resolve every flagged question in the draft into a concrete expected
result, referencing the decision number that resolved it (`DECISIONS.md
#4`, etc.) so every case is traceable back to its reasoning.

## Category taxonomy — fixed, in this order

`category_1` is a closed three-value taxonomy, always in this order:

1. **Parameter Checking** — one field at a time, boundary/shape variants
   (blank, wrong type, wrong case, nonexistent, malformed, trailing
   whitespace, etc.), ending with a **Valid** variant that confirms the
   field accepts a legitimate value (success criteria for that field in
   isolation). This is the tree method: each field gets its own group of
   rows, walking every boundary deliberately rather than one generic
   "invalid input" case.
2. **Functional** — full business-flow cases: the actual user-story
   scenarios, multiple fields held valid at once, real end-to-end
   behavior (create → confirm, create → release → re-hold, etc.).
3. **Non Functional** — concurrency, performance (as an illustrative
   smoke check, not a real SLA gate unless one is actually given),
   security/abuse protection (even when the honest answer is "not
   implemented — documented as a known gap," which is itself a valid,
   useful non-functional case).

Priority is numeric: `0` = core/main flow, `1` = happy path/secondary,
`2` = exceptional/error handling.

## Output format: two xlsx workbooks, no loose CSV in the deliverable

- `Test_Cases_<Feature>.xlsx` — the **draft**: open questions in the
  Details column, expected results as `?`.
- `Test_Cases_<Feature>_Finalized.xlsx` — the **finalized** set: resolved
  expected results, Details column references the deciding `DECISIONS.md`
  entry.

CSV is used as a local intermediate format while iterating (faster to
diff, no xlsx tooling friction mid-draft), generated into the final
`.xlsx` with a short openpyxl script once a stage is approved — but the
CSVs themselves are a working file, never the shipped deliverable.

### Column mapping — verified against the real template, don't guess

This matters: the real template (`Test_Cases_CartDiscount_MODIFIED.xlsx`)
has **no ID column**. Rows are identified by tree position
(category/field/variant), not by a TC-id cell. The actual header row (4)
mapping:

| Col | Meaning          |
|-----|------------------|
| A   | category_1 (merged over consecutive rows) |
| B   | category_2 (merged over consecutive rows) |
| D   | field            |
| E   | variant          |
| J   | Precondition     |
| K   | Steps            |
| L   | Expected Result  |
| M   | Priority         |
| O   | Details          |

Before writing a build script for a new golden pair's workbook, **read
the real template's header row directly** (`openpyxl`, inspect row 4
column-by-column) rather than assuming a prior script's column indices
still apply — a wrong assumption here produces a workbook that looks
right at a glance but has every value shifted into the wrong column.
