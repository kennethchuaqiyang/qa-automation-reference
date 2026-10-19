// Mock backend+UI for the "Desk Booking" hybrid golden pair.
// Implements exactly what DECISIONS.md decided — no extra behavior.
// In-memory state only; reset by restarting the process or POST /__reset.

const express = require("express");
const crypto = require("crypto");

const PORT = process.env.PORT || 4200;

const ZONES = ["quiet", "collab", "window"];

let DESKS = [
  { deskId: "desk_11", zone: "quiet" },
  { deskId: "desk_12", zone: "quiet" },
  { deskId: "desk_13", zone: "collab" },
  { deskId: "desk_14", zone: "collab" },
  { deskId: "desk_15", zone: "window" },
];

// bookingId -> { bookingId, deskId, memberId, date, status }
let BOOKINGS = new Map();

function seedBaseline() {
  BOOKINGS = new Map();
  BOOKINGS.set("bkg_001", {
    bookingId: "bkg_001",
    deskId: "desk_13",
    memberId: "mem_bob",
    date: "2026-11-03",
    status: "confirmed",
  });
  // A past-dated booking can't be created through the normal flow
  // (decision #16 blocks booking a past date outright), so it's seeded
  // directly — needed as a fixture for the "Cancel control disabled for
  // a past-dated booking" UI case (decision #31).
  BOOKINGS.set("bkg_past_001", {
    bookingId: "bkg_past_001",
    deskId: "desk_15",
    memberId: "mem_alice",
    date: "2020-01-01",
    status: "confirmed",
  });
}
seedBaseline();

const app = express();
app.use(express.json());
app.use(express.static(require("path").join(__dirname, "public")));

function isWellFormedDate(str) {
  if (typeof str !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const [y, m, d] = str.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

function todayStr() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

function isPastDate(dateStr) {
  // DECISIONS.md #25 — calendar-date comparison only, server-local "today".
  return dateStr < todayStr();
}

function activeBookingFor(deskId, date) {
  for (const b of BOOKINGS.values()) {
    if (b.deskId === deskId && b.date === date && b.status === "confirmed") {
      return b;
    }
  }
  return null;
}

// ---------------------------------------------------------------------
// GET /api/desks — DECISIONS.md #5-11
// ---------------------------------------------------------------------
app.get("/api/desks", (req, res) => {
  const { date, zone } = req.query;

  if (date === undefined || date === "") {
    return res.status(400).json({ error: "date is required" });
  }
  if (!isWellFormedDate(date)) {
    return res.status(400).json({ error: "date must be YYYY-MM-DD" });
  }
  // #7 — past dates are allowed for search (read-only).

  let desks = DESKS;
  if (zone !== undefined && zone !== "") {
    const wanted = zone.toLowerCase(); // #11 — case-insensitive
    desks = desks.filter((d) => d.zone.toLowerCase() === wanted);
    // #10 — unrecognized zone just yields an empty result, not an error.
  }

  const result = desks.map((d) => ({
    deskId: d.deskId,
    zone: d.zone,
    available: activeBookingFor(d.deskId, date) === null,
  }));

  res.json(result);
});

// ---------------------------------------------------------------------
// POST /api/bookings — DECISIONS.md #12-20
// ---------------------------------------------------------------------
app.post("/api/bookings", (req, res) => {
  const memberId = req.header("x-member-id");
  if (!memberId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { deskId, date } = req.body ?? {};

  if (!deskId) {
    return res.status(400).json({ error: "deskId is required" });
  }
  if (!date) {
    return res.status(400).json({ error: "date is required" });
  }
  if (!isWellFormedDate(date)) {
    return res.status(400).json({ error: "date must be YYYY-MM-DD" });
  }
  if (isPastDate(date)) {
    return res.status(400).json({ error: "date must be today or later" });
  }

  const desk = DESKS.find((d) => d.deskId === deskId);
  if (!desk) {
    return res.status(404).json({ error: "Desk not found" });
  }

  // No await between this check and the write below — Node's single
  // event-loop thread makes this section atomic per request, which is
  // what DECISIONS.md #19's concurrency test actually verifies.
  if (activeBookingFor(deskId, date) !== null) {
    return res.status(409).json({ error: "Desk not available" });
  }

  const bookingId = "bkg_" + crypto.randomUUID().slice(0, 8);
  const booking = { bookingId, deskId, memberId, date, status: "confirmed" };
  BOOKINGS.set(bookingId, booking);
  res.status(201).json(booking);
});

// ---------------------------------------------------------------------
// GET /api/bookings — DECISIONS.md #1 (view my bookings contract)
// ---------------------------------------------------------------------
app.get("/api/bookings", (req, res) => {
  const memberId = req.header("x-member-id");
  if (!memberId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const mine = Array.from(BOOKINGS.values()).filter(
    (b) => b.memberId === memberId
  );
  res.json(mine);
});

// ---------------------------------------------------------------------
// POST /api/bookings/:bookingId/cancel — DECISIONS.md #21-28
// ---------------------------------------------------------------------
app.post("/api/bookings/:bookingId/cancel", (req, res) => {
  const memberId = req.header("x-member-id");
  if (!memberId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { bookingId } = req.params;
  const booking = BOOKINGS.get(bookingId);

  // #24 — someone else's booking gets the identical 404, never a 403.
  if (!booking || booking.memberId !== memberId) {
    return res.status(404).json({ error: "Booking not found" });
  }

  if (booking.status === "cancelled") {
    return res.status(409).json({ error: "Booking already cancelled" });
  }
  if (isPastDate(booking.date)) {
    return res.status(409).json({ error: "Booking date has already passed" });
  }

  booking.status = "cancelled";
  res.json(booking);
});

// ---------------------------------------------------------------------
// Test-only hooks
// ---------------------------------------------------------------------
app.post("/api/simulate-taken", (req, res) => {
  // DECISIONS.md #29 — lets the AT suite deterministically make a desk
  // unavailable between selection and confirmation, mirroring the FE
  // golden pair's /simulate-taken.
  const { deskId, date } = req.body ?? {};
  const desk = DESKS.find((d) => d.deskId === deskId);
  if (desk && date && activeBookingFor(deskId, date) === null) {
    const bookingId = "bkg_sim_" + crypto.randomUUID().slice(0, 8);
    BOOKINGS.set(bookingId, {
      bookingId,
      deskId,
      memberId: "mem_other_simulated",
      date,
      status: "confirmed",
    });
  }
  res.sendStatus(204);
});

app.post("/__reset", (req, res) => {
  seedBaseline();
  res.sendStatus(204);
});

// ---------------------------------------------------------------------
// UI (simple HTML, served from the same process)
// ---------------------------------------------------------------------
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

app.get("/", (req, res) => res.redirect("/search"));

app.get("/search", (req, res) => {
  const date = req.query.date || "";
  const zone = req.query.zone || "";
  const memberId = req.query.memberId || "mem_alice";
  const booked = req.query.booked || "";
  const taken = req.query.taken || "";

  let gridHtml = "";
  let searchError = "";

  if (date) {
    if (!isWellFormedDate(date)) {
      searchError = "date must be YYYY-MM-DD";
    } else {
      let desks = DESKS;
      if (zone) {
        const wanted = zone.toLowerCase();
        desks = desks.filter((d) => d.zone.toLowerCase() === wanted);
      }
      if (desks.length === 0) {
        gridHtml = `<div id="empty-state">No desks found for this search.</div>`;
      } else {
        gridHtml = desks
          .map((d) => {
            const available = activeBookingFor(d.deskId, date) === null;
            const classes = ["desk", available ? "available" : "taken"];
            return `<form method="GET" action="/confirm" style="display:inline-block">
              <input type="hidden" name="deskId" value="${d.deskId}" />
              <input type="hidden" name="date" value="${date}" />
              <input type="hidden" name="memberId" value="${memberId}" />
              <button type="submit" class="${classes.join(" ")}" data-desk-id="${d.deskId}" ${available ? "" : "disabled"}>
                ${d.deskId} (${d.zone})${available ? "" : " (taken)"}
              </button>
            </form>`;
          })
          .join("\n");
      }
    }
  }

  res.send(
    page(
      "Search Desks",
      `
    <main>
      <h1>Search Desks</h1>
      <form id="search-form" method="GET" action="/search">
        <input type="hidden" name="memberId" value="${memberId}" />
        <label for="date">Date</label>
        <input id="date" name="date" type="text" value="${date}" required />
        <label for="zone">Zone</label>
        <select id="zone" name="zone">
          <option value="" ${zone === "" ? "selected" : ""}>All</option>
          ${ZONES.map(
            (z) => `<option value="${z}" ${z === zone ? "selected" : ""}>${z}</option>`
          ).join("")}
        </select>
        <button id="search-submit" type="submit">Search</button>
      </form>
      <div id="search-error" style="display:${searchError ? "block" : "none"};color:#b00020;">${searchError}</div>
      <div id="desk-grid">${gridHtml}</div>
      <div id="booking-success" style="display:${booked ? "block" : "none"};color:#15751f;">Booked! ${booked}</div>
      <div id="desk-taken-message" style="display:${taken ? "block" : "none"};color:#b00020;">This desk is no longer available — please choose another.</div>
      <p><a id="my-bookings-link" href="/my-bookings?memberId=${memberId}">My Bookings</a></p>
    </main>`
    )
  );
});

app.get("/confirm", (req, res) => {
  const { deskId, date, memberId } = req.query;
  const desk = DESKS.find((d) => d.deskId === deskId);
  const available = desk && activeBookingFor(deskId, date) === null;
  res.send(
    page(
      "Confirm Booking",
      `
    <main>
      <h1>Confirm Booking</h1>
      <p id="confirm-detail">${deskId ?? ""} on ${date ?? ""}</p>
      <div id="desk-taken-inline" style="display:${available ? "none" : "block"};color:#b00020;">
        This desk is no longer available — please choose another.
      </div>
      <form method="POST" action="/confirm">
        <input type="hidden" name="deskId" value="${deskId ?? ""}" />
        <input type="hidden" name="date" value="${date ?? ""}" />
        <input type="hidden" name="memberId" value="${memberId ?? ""}" />
        <button id="confirm-btn" type="submit" ${available ? "" : "disabled"}>Confirm</button>
      </form>
    </main>`
    )
  );
});

app.use(express.urlencoded({ extended: true }));

app.post("/confirm", (req, res) => {
  const { deskId, date, memberId } = req.body;
  const desk = DESKS.find((d) => d.deskId === deskId);

  if (!desk || activeBookingFor(deskId, date) !== null) {
    return res.redirect(
      `/search?date=${encodeURIComponent(date)}&memberId=${encodeURIComponent(memberId)}&taken=1`
    );
  }

  const bookingId = "bkg_" + crypto.randomUUID().slice(0, 8);
  BOOKINGS.set(bookingId, { bookingId, deskId, memberId, date, status: "confirmed" });

  res.redirect(
    `/search?date=${encodeURIComponent(date)}&memberId=${encodeURIComponent(memberId)}&booked=${encodeURIComponent(deskId)}`
  );
});

app.get("/my-bookings", (req, res) => {
  const memberId = req.query.memberId || "mem_alice";
  const mine = Array.from(BOOKINGS.values()).filter((b) => b.memberId === memberId);

  const rowsHtml =
    mine.length === 0
      ? `<div id="no-bookings">You have no bookings.</div>`
      : mine
          .map((b) => {
            const past = isPastDate(b.date);
            const cancelled = b.status === "cancelled";
            const disableCancel = past || cancelled;
            return `<div class="booking-row" data-booking-id="${b.bookingId}">
              ${b.deskId} on ${b.date} — ${b.status}
              <form method="POST" action="/my-bookings/cancel" style="display:inline-block">
                <input type="hidden" name="bookingId" value="${b.bookingId}" />
                <input type="hidden" name="memberId" value="${memberId}" />
                <button class="cancel-btn" data-booking-id="${b.bookingId}" type="submit" ${disableCancel ? "disabled" : ""}>Cancel</button>
              </form>
            </div>`;
          })
          .join("\n");

  res.send(
    page(
      "My Bookings",
      `
    <main>
      <h1>My Bookings</h1>
      <div id="bookings-list">${rowsHtml}</div>
      <p><a href="/search?memberId=${memberId}">Back to Search</a></p>
    </main>`
    )
  );
});

app.post("/my-bookings/cancel", (req, res) => {
  const { bookingId, memberId } = req.body;
  const booking = BOOKINGS.get(bookingId);
  if (booking && booking.memberId === memberId && booking.status === "confirmed" && !isPastDate(booking.date)) {
    booking.status = "cancelled";
  }
  res.redirect(`/my-bookings?memberId=${encodeURIComponent(memberId)}`);
});

app.listen(PORT, () => {
  console.log(`desk-booking mock listening on http://localhost:${PORT}`);
});
