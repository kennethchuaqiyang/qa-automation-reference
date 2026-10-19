# Login + Appointment Slot Picker — mock FE

A tiny Node/Express mock implementing the login (email/password, generic
error, 3-try lockout) and appointment slot picker behavior described in
`../USER_STORIES.md` and resolved in `../DECISIONS.md`.

## Run

```bash
npm install
npm start
```

Serves on `http://localhost:4000` (override with `PORT=xxxx npm start`).

## Routes

- `GET /login`, `POST /login` — login form + credential check
- `GET /login-failed` — standalone lockout page
- `GET /booking` — slot list (requires login)
- `POST /select` — select/deselect a slot
- `POST /confirm` — confirm the selected slot
- `POST /simulate-taken` `{ slotId }` — test-only hook: mark a slot taken
  by "another patient" mid-decision, for TC-016
- `POST /__reset` — test-only hook: restore the 4-slot baseline and clear
  all sessions between test runs

## Test account

`patient_alice@example.com` / `Password123!`

## Note for anyone writing the AT suite

This mock has deliberate bugs baked into the logic on purpose — see
`BUGS.md` for the answer key, but try the selector-discovery pass and the
Playwright suite first without reading it.
