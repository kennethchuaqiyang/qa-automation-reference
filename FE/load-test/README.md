# Load testing — Login + Slot Picker

Real load testing, kept separate from `../automation/` (functional
Playwright suite) on purpose — see "Non Functional splits into Load and
Security" in `../../README-generating-at.md`. This FE pair didn't have a
dedicated response-time test case the way the API pair's TC-023 did; this
is new coverage, not a migration of an existing TC.

## Run

```bash
npx artillery@latest run load-test.yml           # local (default)
npx artillery@latest run load-test.yml -e uat     # named uat environment
npx artillery@latest run load-test.yml -e prod    # named prod environment
```

`uat`/`prod` have empty targets in `config.environments` until a real
instance exists — edit `load-test.yml` to fill them in, or override
directly:

```bash
npx artillery@latest run load-test.yml --target https://your-deployed-instance
```

Defaults to `http://localhost:4000` — start the mock
(`cd ../mock-site && npm start`) first.

## What it checks

- **Browse login + booking pages** — response time for the two main page
  loads under ramping concurrent traffic.
- **Repeated failed logins** — sustained failed-login traffic from many
  separate sessions (not the same session repeatedly, so this is *not*
  testing whether lockout triggers — that's already covered functionally
  by TC-007/TC-008 in `../automation/`). This checks the server stays
  responsive under that kind of traffic shape, which is the load-relevant
  question.

No pass/fail gate configured yet (no `ensure` thresholds) — add one once
there's a real target and an actual SLA to hold it to.
