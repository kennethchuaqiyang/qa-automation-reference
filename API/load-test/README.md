# Load testing — Event Seat Hold API

Real load/performance testing, kept separate from `../automation/`
(functional Playwright suite) on purpose — see "Non Functional splits
into Load and Security" in `../../README-generating-at.md`. This
replaces what used to be TC-023 (response time) and TC-024 (no rate
limiting) as Playwright tests; those were illustrative single-request
checks, not real load.

## Run

```bash
npx artillery@latest run load-test.yml           # local (default)
npx artillery@latest run load-test.yml -e uat     # named uat environment
npx artillery@latest run load-test.yml -e prod    # named prod environment
```

`uat`/`prod` have empty targets in `config.environments` until a real
instance exists — edit `load-test.yml` to fill them in, or override
directly for a one-off run:

```bash
npx artillery@latest run load-test.yml --target https://your-deployed-instance
```

Defaults to `http://localhost:8080` — start the mock (`go run ../main.go`
or the built binary) first.

## What it checks

- **Browse seats (read-heavy)** — the actual load/response-time check
  that TC-023 used to stand in for, now under a real ramping load profile
  (2 → 20 req/s over 30s, then sustained) instead of one request.
- **Repeated hold attempts (rate-limit probe)** — the same gap TC-024
  documented (no throttling on `POST /holds`), now run as an actual
  sustained burst rather than 5 sequential curl calls. The finding is the
  same either way — see `../SECURITY_CHECKS.md` — but this shows the
  behavior under real concurrent load, not just back-to-back requests.

## Reading the output

Artillery prints p50/p95/p99 response times and a status-code breakdown
per scenario at the end of the run. There's no pass/fail gate configured
(no `ensure` thresholds) — this workspace doesn't have a real SLA to
test against yet; add one (`config.ensure`) once a real target exists
(e.g. `p99 < 500ms`, `http.codes.200 > 95%`).
