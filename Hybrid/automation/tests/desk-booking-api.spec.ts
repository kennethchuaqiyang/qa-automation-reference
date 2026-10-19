/**
 * API automation for the Desk Booking hybrid golden pair.
 *
 * Implements test-cases/Test_Cases_DeskBooking_Finalized.xlsx, tab
 * "Cases - API", exactly, against the contract and behavior documented
 * in DECISIONS.md. One test per TC id so failures map straight back to
 * a row in the spreadsheet. TC ids assigned by tree position (the real
 * template has no ID column) — TC-001..007 Parameter Checking,
 * TC-008..018 Functional.
 *
 * Seed data (see mock/server.js seedBaseline() / mock/README.md):
 *   desk_11 (quiet), desk_12 (quiet), desk_13 (collab), desk_14 (collab), desk_15 (window)
 *   bkg_001      -> desk_13, mem_bob,   2026-11-03, confirmed
 *   bkg_past_001 -> desk_15, mem_alice, 2020-01-01, confirmed
 */
import {
  test,
  expect,
  desksUrl,
  bookingsUrl,
  cancelUrl,
  createBooking,
  cancelBooking,
  deskAvailability,
  FUTURE_DATE,
  MEMBER_ALICE,
  MEMBER_BOB,
} from "./fixtures";

test.describe("Parameter Checking — Search desks: date (TC-001a..d)", () => {
  test("TC-001a date missing/blank — DECISIONS.md #5", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await request.get(desksUrl(""));
    expect(resp.status()).toBe(400);
    expect(await resp.json()).toEqual({ error: "date is required" });
  });

  test("TC-001b date malformed — DECISIONS.md #6", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await request.get(desksUrl("2026-13-45"));
    expect(resp.status()).toBe(400);
    expect(await resp.json()).toEqual({ error: "date must be YYYY-MM-DD" });
  });

  test("TC-001c date in the past — DECISIONS.md #7", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await request.get(desksUrl("2020-01-01"));
    expect(resp.status()).toBe(200);
    const desks = await resp.json();
    expect(desks.length).toBe(5);
  });

  test("TC-001d date valid — success criteria", { tag: ["@smoke"] }, async ({ request }) => {
    const resp = await request.get(desksUrl(FUTURE_DATE));
    expect(resp.status()).toBe(200);
    const desks = await resp.json();
    expect(desks.length).toBe(5);
  });
});

test.describe("Parameter Checking — Search desks: zone (TC-002a..d)", () => {
  test("TC-002a zone blank — DECISIONS.md #9", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await request.get(desksUrl(FUTURE_DATE, ""));
    expect(resp.status()).toBe(200);
    const desks = await resp.json();
    expect(desks.length).toBe(5);
  });

  test("TC-002b zone unrecognized value — DECISIONS.md #10", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await request.get(desksUrl(FUTURE_DATE, "basement"));
    expect(resp.status()).toBe(200);
    expect(await resp.json()).toEqual([]);
  });

  test("TC-002c zone wrong case — DECISIONS.md #11", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await request.get(desksUrl(FUTURE_DATE, "QUIET"));
    expect(resp.status()).toBe(200);
    const desks = await resp.json();
    expect(desks.map((d: { deskId: string }) => d.deskId).sort()).toEqual(["desk_11", "desk_12"]);
  });

  test("TC-002d zone valid — success criteria", { tag: ["@smoke"] }, async ({ request }) => {
    const resp = await request.get(desksUrl(FUTURE_DATE, "quiet"));
    expect(resp.status()).toBe(200);
    const desks = await resp.json();
    expect(desks.map((d: { deskId: string }) => d.deskId).sort()).toEqual(["desk_11", "desk_12"]);
  });
});

test.describe("Parameter Checking — Book desk: deskId (TC-003a..c)", () => {
  test("TC-003a deskId missing/blank — DECISIONS.md #12", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await createBooking(request, MEMBER_ALICE, undefined, FUTURE_DATE);
    expect(resp.status()).toBe(400);
    expect(await resp.json()).toEqual({ error: "deskId is required" });
  });

  test("TC-003b deskId nonexistent — DECISIONS.md #13", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await createBooking(request, MEMBER_ALICE, "desk_does_not_exist", FUTURE_DATE);
    expect(resp.status()).toBe(404);
    expect(await resp.json()).toEqual({ error: "Desk not found" });
  });

  test("TC-003c deskId valid — success criteria", { tag: ["@smoke"] }, async ({ request }) => {
    const resp = await createBooking(request, MEMBER_ALICE, "desk_12", FUTURE_DATE);
    expect(resp.status()).toBe(201);
    const booking = await resp.json();
    expect(booking.status).toBe("confirmed");
  });
});

test.describe("Parameter Checking — Book desk: date (TC-004a..d)", () => {
  test("TC-004a date missing/blank — DECISIONS.md #14", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await createBooking(request, MEMBER_ALICE, "desk_12", undefined);
    expect(resp.status()).toBe(400);
    expect(await resp.json()).toEqual({ error: "date is required" });
  });

  test("TC-004b date malformed — DECISIONS.md #15", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await createBooking(request, MEMBER_ALICE, "desk_12", "not-a-date");
    expect(resp.status()).toBe(400);
    expect(await resp.json()).toEqual({ error: "date must be YYYY-MM-DD" });
  });

  test("TC-004c date in the past — DECISIONS.md #16", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await createBooking(request, MEMBER_ALICE, "desk_12", "2020-01-01");
    expect(resp.status()).toBe(400);
    expect(await resp.json()).toEqual({ error: "date must be today or later" });
  });

  test("TC-004d date valid — success criteria", { tag: ["@smoke"] }, async ({ request }) => {
    const resp = await createBooking(request, MEMBER_ALICE, "desk_12", FUTURE_DATE);
    expect(resp.status()).toBe(201);
  });
});

test.describe("Parameter Checking — Book desk: x-member-id header (TC-005a..c)", () => {
  test("TC-005a x-member-id missing — DECISIONS.md #17", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await createBooking(request, undefined, "desk_12", FUTURE_DATE);
    expect(resp.status()).toBe(401);
    expect(await resp.json()).toEqual({ error: "Unauthorized" });
  });

  test("TC-005b x-member-id blank — DECISIONS.md #17", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await request.post(bookingsUrl(), {
      headers: { "x-member-id": "" },
      data: { deskId: "desk_12", date: FUTURE_DATE },
    });
    expect(resp.status()).toBe(401);
    expect(await resp.json()).toEqual({ error: "Unauthorized" });
  });

  test("TC-005c x-member-id valid — success criteria", { tag: ["@smoke"] }, async ({ request }) => {
    const resp = await createBooking(request, MEMBER_ALICE, "desk_12", FUTURE_DATE);
    expect(resp.status()).toBe(201);
  });
});

test.describe("Parameter Checking — Cancel booking: bookingId (TC-006a..c)", () => {
  test("TC-006a bookingId missing/blank path segment — DECISIONS.md #21", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await request.post("/api/bookings//cancel", { headers: { "x-member-id": MEMBER_ALICE } });
    expect(resp.status()).toBe(404);
  });

  test("TC-006b bookingId nonexistent — DECISIONS.md #22", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await cancelBooking(request, MEMBER_ALICE, "bkg_does_not_exist");
    expect(resp.status()).toBe(404);
    expect(await resp.json()).toEqual({ error: "Booking not found" });
  });

  test("TC-006c bookingId valid — success criteria", { tag: ["@smoke"] }, async ({ request }) => {
    const resp = await cancelBooking(request, MEMBER_BOB, "bkg_001");
    expect(resp.status()).toBe(200);
    const booking = await resp.json();
    expect(booking.status).toBe("cancelled");
  });
});

test.describe("Parameter Checking — Cancel booking: x-member-id header (TC-007a..c)", () => {
  test("TC-007a x-member-id missing — DECISIONS.md #23", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await request.post(cancelUrl("bkg_001"));
    expect(resp.status()).toBe(401);
    expect(await resp.json()).toEqual({ error: "Unauthorized" });
  });

  test("TC-007b x-member-id present but not the owner — DECISIONS.md #24", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await cancelBooking(request, MEMBER_ALICE, "bkg_001"); // bkg_001 is owned by mem_bob
    expect(resp.status()).toBe(404);
    expect(await resp.json()).toEqual({ error: "Booking not found" });
  });

  test("TC-007c x-member-id valid (owner) — success criteria", { tag: ["@smoke"] }, async ({ request }) => {
    const resp = await cancelBooking(request, MEMBER_BOB, "bkg_001");
    expect(resp.status()).toBe(200);
  });
});

test.describe("Functional — Search desks (TC-008, TC-009)", () => {
  test("TC-008 search a valid date, US-1 — every desk returned with correct availability", { tag: ["@smoke"] }, async ({ request }) => {
    const resp = await request.get(desksUrl(FUTURE_DATE));
    expect(resp.status()).toBe(200);
    const desks = await resp.json();
    expect(desks.map((d: { deskId: string }) => d.deskId).sort()).toEqual([
      "desk_11", "desk_12", "desk_13", "desk_14", "desk_15",
    ]);
    // bkg_001 (desk_13, 2026-11-03, confirmed) is the only booking on this date.
    expect(deskAvailability(desks, "desk_13")).toBe(false);
    expect(deskAvailability(desks, "desk_11")).toBe(true);
  });

  test("TC-009 search narrowed by zone, US-1 — only that zone's desks returned", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await request.get(desksUrl(FUTURE_DATE, "collab"));
    expect(resp.status()).toBe(200);
    const desks = await resp.json();
    expect(desks.map((d: { deskId: string }) => d.deskId).sort()).toEqual(["desk_13", "desk_14"]);
  });
});

test.describe("Functional — Book a desk (TC-010, TC-011, TC-012)", () => {
  test("TC-010 book an available desk, then re-search, US-2 — booking succeeds, desk shows unavailable", { tag: ["@smoke"] }, async ({ request }) => {
    const bookResp = await createBooking(request, MEMBER_ALICE, "desk_12", FUTURE_DATE);
    expect(bookResp.status()).toBe(201);

    const searchResp = await request.get(desksUrl(FUTURE_DATE));
    const desks = await searchResp.json();
    expect(deskAvailability(desks, "desk_12")).toBe(false);
  });

  test("TC-010 (cont.) a desk already booked by someone else is rejected, US-2 — DECISIONS.md #18", { tag: ["@smoke"] }, async ({ request }) => {
    // Precondition: desk_12 already booked by mem_bob for FUTURE_DATE.
    const setup = await createBooking(request, MEMBER_BOB, "desk_12", FUTURE_DATE);
    expect(setup.status()).toBe(201);

    const resp = await createBooking(request, MEMBER_ALICE, "desk_12", FUTURE_DATE);
    expect(resp.status()).toBe(409);
    expect(await resp.json()).toEqual({ error: "Desk not available" });
  });

  test("TC-012 concurrent booking attempts on same desk/date — exactly one winner, DECISIONS.md #19", { tag: ["@edge"] }, async ({ request }) => {
    const [respA, respB] = await Promise.all([
      createBooking(request, MEMBER_ALICE, "desk_14", FUTURE_DATE),
      createBooking(request, MEMBER_BOB, "desk_14", FUTURE_DATE),
    ]);
    const statuses = [respA.status(), respB.status()].sort();
    expect(statuses).toEqual([201, 409]);

    const loser = respA.status() === 409 ? respA : respB;
    expect(await loser.json()).toEqual({ error: "Desk not available" });
  });
});

test.describe("Functional — View my bookings (TC-013)", () => {
  test("TC-013 shows only my own bookings, US-3 — DECISIONS.md #1, #28", { tag: ["@smoke"] }, async ({ request }) => {
    const aliceBooking = await createBooking(request, MEMBER_ALICE, "desk_11", FUTURE_DATE);
    expect(aliceBooking.status()).toBe(201);
    const bobBooking = await createBooking(request, MEMBER_BOB, "desk_12", FUTURE_DATE);
    expect(bobBooking.status()).toBe(201);

    const resp = await request.get(bookingsUrl(), { headers: { "x-member-id": MEMBER_ALICE } });
    expect(resp.status()).toBe(200);
    const bookings = await resp.json();
    expect(bookings.every((b: { memberId: string }) => b.memberId === MEMBER_ALICE)).toBe(true);
    expect(bookings.some((b: { deskId: string }) => b.deskId === "desk_11")).toBe(true);
    expect(bookings.some((b: { deskId: string }) => b.deskId === "desk_12")).toBe(false);
  });
});

test.describe("Functional — Cancel a booking (TC-014..018)", () => {
  test("TC-014 cancel my own booking, then re-search, US-4 — status becomes cancelled, desk freed", { tag: ["@smoke"] }, async ({ request }) => {
    const cancelResp = await cancelBooking(request, MEMBER_BOB, "bkg_001");
    expect(cancelResp.status()).toBe(200);
    const booking = await cancelResp.json();
    expect(booking.status).toBe("cancelled");

    const searchResp = await request.get(desksUrl(FUTURE_DATE));
    const desks = await searchResp.json();
    expect(deskAvailability(desks, "desk_13")).toBe(true);
  });

  test("TC-015 cancel someone else's booking, US-4 — hidden as 404, DECISIONS.md #24", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await cancelBooking(request, MEMBER_ALICE, "bkg_001"); // owned by mem_bob
    expect(resp.status()).toBe(404);
    expect(await resp.json()).toEqual({ error: "Booking not found" });
  });

  test("TC-016 cancel a booking for a date already passed, US-4 — DECISIONS.md #25", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await cancelBooking(request, MEMBER_ALICE, "bkg_past_001");
    expect(resp.status()).toBe(409);
    expect(await resp.json()).toEqual({ error: "Booking date has already passed" });
  });

  test("TC-017 cancel an already-cancelled booking, US-4 — treated as conflict, DECISIONS.md #26", { tag: ["@edge"] }, async ({ request }) => {
    const first = await cancelBooking(request, MEMBER_BOB, "bkg_001");
    expect(first.status()).toBe(200);

    const second = await cancelBooking(request, MEMBER_BOB, "bkg_001");
    expect(second.status()).toBe(409);
    expect(await second.json()).toEqual({ error: "Booking already cancelled" });
  });

  test("TC-018 re-book immediately after cancelling, US-4 — DECISIONS.md #27", { tag: ["@edge"] }, async ({ request }) => {
    const cancelResp = await cancelBooking(request, MEMBER_BOB, "bkg_001");
    expect(cancelResp.status()).toBe(200);

    const rebookResp = await createBooking(request, MEMBER_BOB, "desk_13", FUTURE_DATE);
    expect(rebookResp.status()).toBe(201);
  });
});
