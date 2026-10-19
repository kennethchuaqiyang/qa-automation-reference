// Mock frontend for the "Login + Appointment Slot Picker" golden pair.
// Behavior is intentionally driven straight from DECISIONS.md — every
// handler below is commented with the decision it implements.
//
// Four deliberate logic bugs are baked in on purpose (see BUGS.md in this
// folder for the answer key — do not read it before building the AT suite
// if you want to discover them the same way a real reviewer would).

const express = require("express");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");

const PORT = process.env.PORT || 4000;
const LOCKOUT_MS = 15000; // DECISIONS.md #8 — 15s, chosen for testability

const USERS = {
  "patient_alice@example.com": "Password123!",
};

// In-memory per-process state. Reset by restarting the server.
let SLOTS = [
  { id: "slot-1", time: "Mon 10:00 AM", available: true },
  { id: "slot-2", time: "Mon 11:00 AM", available: false },
  { id: "slot-3", time: "Mon 2:00 PM", available: true },
  { id: "slot-4", time: "Tue 9:00 AM", available: true },
];

// sessionId -> session state
const sessions = new Map();

function getSession(req, res) {
  let sid = req.cookies.sid;
  if (!sid || !sessions.has(sid)) {
    sid = crypto.randomUUID();
    sessions.set(sid, {
      failedAttempts: 0,
      lockedUntil: null,
      loggedInEmail: null,
      selectedSlotId: null,
      lastBookedTime: null,
    });
    res.cookie("sid", sid, { httpOnly: true });
  }
  return sessions.get(sid);
}

function looksLikeEmail(str) {
  // Deliberately loose shape check — just enough to tell "this has the
  // shape of an email" from "this is obviously malformed input" (DECISIONS
  // #2's malformed-email cases: missing @, missing domain, missing local
  // part, missing extension all fail this; a real but unregistered address
  // like nobody@example.com passes it). Used only by BUG #3 below.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

function isLocked(session) {
  // DECISIONS.md #7 — lockout persists across reload (it's server-side
  // session state, not client-side), so this check is what every page
  // load and submit relies on.
  //
  // *** BUG (see BUGS.md #1) ***
  // DECISIONS.md #8 says the lockout should expire after 15s and the
  // counter should reset. This only checks whether lockedUntil was ever
  // set — it never compares lockedUntil against Date.now(), so once a
  // session is locked it never unlocks. TC-018 should catch this.
  return session.lockedUntil !== null;
}

const app = express();
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(require("path").join(__dirname, "public")));

function page(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <link rel="stylesheet" href="/style.css" />
</head>
<body>
${body}
</body>
</html>`;
}

// ---------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------
app.get("/", (req, res) => {
  const session = getSession(req, res);
  if (session.loggedInEmail) return res.redirect("/booking");
  res.redirect("/login");
});

// ---------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------
app.get("/login", (req, res) => {
  const session = getSession(req, res);
  if (isLocked(session)) return res.redirect("/login-failed");
  if (session.loggedInEmail) return res.redirect("/booking");
  res.send(renderLogin());
});

app.post("/login", (req, res) => {
  const session = getSession(req, res);

  if (isLocked(session)) return res.redirect("/login-failed");

  const email = (req.body.email ?? "").toString();
  const password = (req.body.password ?? "").toString();

  // DECISIONS.md #1 — blank email/password is a client-side validation
  // error and must NOT count toward the lockout. The login page's own
  // JS blocks the submit before it ever reaches here; this is just a
  // server-side backstop in case JS is disabled/bypassed.
  if (email.trim() === "" || password.trim() === "") {
    return res.send(
      renderLogin({ validationError: "Email and password are required." })
    );
  }

  // DECISIONS.md #2 — no client-side (or server-side) email *format*
  // validation. Any non-blank email goes straight into the same
  // generic credential check as a wrong password.
  const correct = USERS[email] === password;

  if (correct) {
    session.failedAttempts = 0;
    session.lockedUntil = null;
    session.loggedInEmail = email;
    return res.redirect("/booking");
  }

  session.failedAttempts += 1;

  if (session.failedAttempts >= 3) {
    // DECISIONS.md #6 — counter is per-session, any mix of wrong
    // email/wrong password counts toward the same 3.
    session.lockedUntil = Date.now() + LOCKOUT_MS;
    return res.redirect("/login-failed");
  }

  // *** BUG (see BUGS.md #3) ***
  // DECISIONS.md #3 says identical copy for wrong password vs nonexistent
  // email — no account-enumeration leak. This narrowly violates that: a
  // valid-*shaped* but unregistered email (passes looksLikeEmail) gets a
  // different message than a wrong password for a real account, which
  // leaks whether an email has an account. Malformed emails (TC-001b1-4)
  // are untouched since they fail looksLikeEmail and fall through to the
  // generic message below, same as before.
  if (!(email in USERS) && looksLikeEmail(email)) {
    return res.send(
      renderLogin({ credentialError: "No account found with that email." })
    );
  }

  // DECISIONS.md #3 — identical copy for wrong password / nonexistent
  // email. DECISIONS.md #4 — no remaining-attempts count shown.
  return res.send(
    renderLogin({ credentialError: "Incorrect email or password." })
  );
});

app.get("/login-failed", (req, res) => {
  // DECISIONS.md #5 — standalone page, fixed copy, no form, no retry
  // action.
  res.send(
    page(
      "Login Failed",
      `
    <main>
      <h1>Login Failed</h1>
      <div id="login-failed-message">Too many failed attempts. Please try again later.</div>
    </main>`
    )
  );
});

function renderLogin({ validationError, credentialError } = {}) {
  return page(
    "Log In",
    `
  <main>
    <h1>Log In</h1>
    <form id="login-form" method="POST" action="/login" novalidate>
      <label for="email">Email</label>
      <input id="email" name="email" type="text" autocomplete="username" />

      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" />

      <div id="validation-error" style="display:${
        validationError ? "block" : "none"
      };color:#b00020;">${validationError ?? ""}</div>
      <div id="login-error" style="display:${
        credentialError ? "block" : "none"
      };color:#b00020;">${credentialError ?? ""}</div>

      <button id="login-submit" type="submit">Log In</button>
    </form>
  </main>
  <script src="/login.js"></script>`
  );
}

// ---------------------------------------------------------------------
// Booking / slot picker
// ---------------------------------------------------------------------
app.get("/booking", (req, res) => {
  const session = getSession(req, res);
  if (!session.loggedInEmail) return res.redirect("/login");
  res.send(renderBooking(session));
});

app.post("/select", (req, res) => {
  const session = getSession(req, res);
  if (!session.loggedInEmail) return res.redirect("/login");

  const { slotId } = req.body;
  const slot = SLOTS.find((s) => s.id === slotId);

  if (slot && slot.available) {
    session.selectedSlotId =
      session.selectedSlotId === slotId ? null : slotId; // click again -> deselect
  }

  res.redirect("/booking");
});

app.post("/confirm", (req, res) => {
  const session = getSession(req, res);
  if (!session.loggedInEmail) return res.redirect("/login");

  const slotId = session.selectedSlotId;

  // *** BUG (see BUGS.md #2) ***
  // DECISIONS.md #10 says Confirm should be disabled/non-interactive
  // when nothing is selected. The button below is never actually given
  // a disabled attribute, and this handler has no guard for
  // slotId == null before falling through to the "slot taken" branch —
  // it relies on `SLOTS.find` returning undefined and silently no-ops,
  // instead of showing a "pick a time first" message. TC-015 should
  // catch the missing disabled state.
  const slot = SLOTS.find((s) => s.id === slotId);

  if (!slot) {
    // No real guard message here — just re-render as if nothing happened.
    return res.send(renderBooking(session));
  }

  if (!slot.available) {
    // DECISIONS.md #11 — slot taken mid-decision: inline message,
    // selection clears, list re-renders.
    session.selectedSlotId = null;
    return res.send(
      renderBooking(session, {
        slotTakenMessage: "This time is no longer available — please choose another.",
      })
    );
  }

  // *** BUG (see BUGS.md #4) ***
  // A successful confirm is supposed to actually deplete inventory — the
  // slot should no longer be bookable by anyone else afterward. The line
  // that flips it (`slot.available = false;`) is missing, so a "booked"
  // slot stays available and keeps appearing in the list as bookable.
  // TC-010 (book out every slot, expect the empty state) should catch
  // this: the slots never actually run out.
  session.lastBookedTime = slot.time;
  session.selectedSlotId = null;
  res.send(renderBooking(session, { justBooked: slot.time }));
});

// Test-only hook, mirrors the API mock's pattern of a mock-side trigger:
// lets the AT suite simulate "another patient books this slot" between
// selection and confirm (TC-016), without needing a second real session.
app.post("/simulate-taken", (req, res) => {
  const { slotId } = req.body;
  const slot = SLOTS.find((s) => s.id === slotId);
  if (slot) slot.available = false;
  res.sendStatus(204);
});

// Test-only hook: restore the fixed 4-slot baseline between test runs.
app.post("/__reset", (req, res) => {
  SLOTS = [
    { id: "slot-1", time: "Mon 10:00 AM", available: true },
    { id: "slot-2", time: "Mon 11:00 AM", available: false },
    { id: "slot-3", time: "Mon 2:00 PM", available: true },
    { id: "slot-4", time: "Tue 9:00 AM", available: true },
  ];
  sessions.clear();
  res.clearCookie("sid");
  res.sendStatus(204);
});

function renderBooking(session, { slotTakenMessage, justBooked } = {}) {
  const anyAvailable = SLOTS.some((s) => s.available);

  const slotsHtml = anyAvailable
    ? SLOTS.map((s) => {
        const classes = ["slot", s.available ? "available" : "taken"];
        if (s.id === session.selectedSlotId) classes.push("selected");
        return `
      <form method="POST" action="/select" style="display:inline-block">
        <input type="hidden" name="slotId" value="${s.id}" />
        <button
          type="submit"
          class="${classes.join(" ")}"
          data-slot-id="${s.id}"
          ${s.available ? "" : "disabled"}
        >${s.time}${s.available ? "" : " (taken)"}</button>
      </form>`;
      }).join("\n")
    : `<div id="empty-state">No appointment slots available for this date. Try a different date.</div>`;

  return page(
    "Book an Appointment",
    `
  <main>
    <h1>Book an Appointment</h1>
    <div id="slot-list">${slotsHtml}</div>

    <div id="slot-taken-message" style="display:${
      slotTakenMessage ? "block" : "none"
    };color:#b00020;">${slotTakenMessage ?? ""}</div>

    <div id="booking-success" style="display:${
      justBooked ? "block" : "none"
    };color:#15751f;">Booked! Your appointment is confirmed for ${
      justBooked ?? ""
    }.</div>

    <form method="POST" action="/confirm">
      <input type="hidden" name="slotId" value="${
        session.selectedSlotId ?? ""
      }" />
      <button id="confirm-btn" type="submit">Confirm</button>
    </form>
  </main>`
  );
}

app.listen(PORT, () => {
  console.log(`mock FE listening on http://localhost:${PORT}`);
});
