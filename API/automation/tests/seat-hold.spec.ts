/**
 * Automation for the Event Seat Hold API golden pair.
 *
 * Implements test-cases/cases_finalized.csv exactly, against the contract
 * and behavior documented in DECISIONS.md. One test per TC id so failures
 * map straight back to a row in the spreadsheet.
 *
 * Seed data (see main.go resetState / DECISIONS.md #12):
 *   evt_summer_fest:
 *     A12 (floor)    available
 *     A13 (floor)    held      -> hold_open_001,      cust_bob
 *     A14 (floor)    sold      -> hold_confirmed_001,  cust_alice
 *     A15 (balcony)  available
 *     A20 (balcony)  held, already expired -> hold_expired_001, cust_carol
 */
import { test, expect, seatsUrl, holdsUrl, holdUrl, createHold, patchHold, seatStatus } from "./fixtures";

test.describe("Parameter Checking — status filter on GET /seats (TC-003a..e)", () => {
  test("TC-003a status filter blank — DECISIONS.md #18", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await request.get(`${seatsUrl()}?status=`);
    expect(resp.status()).toBe(200);
    expect((await resp.json()).length).toBe(5);
  });

  test("TC-003b status filter wrong case — DECISIONS.md #19", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await request.get(seatsUrl(undefined, "AVAILABLE"));
    expect(resp.status()).toBe(400);
    expect(await resp.json()).toEqual({ error: "invalid status value" });
  });

  test("TC-003c status filter trailing space — DECISIONS.md #19", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await request.get(`${seatsUrl()}?status=available%20`);
    expect(resp.status()).toBe(400);
    expect(await resp.json()).toEqual({ error: "invalid status value" });
  });

  test("TC-003d status filter unrecognized value — DECISIONS.md #4", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await request.get(seatsUrl(undefined, "bogus"));
    expect(resp.status()).toBe(400);
    expect(await resp.json()).toEqual({ error: "invalid status value" });
  });

  test("TC-003e status filter valid — success criteria, DECISIONS.md #13", { tag: ["@smoke"] }, async ({ request }) => {
    const resp = await request.get(seatsUrl(undefined, "available"));
    expect(resp.status()).toBe(200);
    const ids = (await resp.json()).map((s: { seatId: string }) => s.seatId).sort();
    expect(ids).toEqual(["A12", "A15", "A20"]);
  });
});

test.describe("Parameter Checking — eventId path segment on GET /seats (TC-004a..d)", () => {
  test("TC-004a eventId blank path segment — DECISIONS.md #20", { tag: ["@edge"] }, async ({ request }) => {
    // Router-level 404: // collapses to / (301), then no route matches.
    const resp = await request.get("/api/events//seats");
    expect(resp.status()).toBe(404);
    expect(await resp.json()).toEqual({ error: "not found" });
  });

  test("TC-004b eventId malformed/special characters — DECISIONS.md #21", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await request.get("/api/events/evt%20ghost/seats");
    expect(resp.status()).toBe(404);
    expect(await resp.json()).toEqual({ error: "Event not found" });
  });

  test("TC-004c eventId nonexistent — DECISIONS.md #5", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await request.get(seatsUrl("evt_ghost"));
    expect(resp.status()).toBe(404);
    expect(await resp.json()).toEqual({ error: "Event not found" });
  });

  test("TC-004d eventId valid — success criteria, DECISIONS.md #13", { tag: ["@smoke"] }, async ({ request }) => {
    const resp = await request.get(seatsUrl());
    expect(resp.status()).toBe(200);
    expect((await resp.json()).length).toBe(5);
  });
});

test.describe("Parameter Checking — seatId body field on POST /holds (TC-008a..e)", () => {
  test("TC-008a seatId missing — DECISIONS.md #9", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await request.post(holdsUrl(), {
      headers: { "x-customer-id": "cust_dave" },
      data: {},
    });
    expect(resp.status()).toBe(400);
    expect(await resp.json()).toEqual({ error: "seatId is required" });
  });

  test("TC-008b seatId blank — DECISIONS.md #22", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await createHold(request, "cust_dave", "");
    expect(resp.status()).toBe(400);
    expect(await resp.json()).toEqual({ error: "seatId is required" });
  });

  test("TC-008c seatId invalid type — DECISIONS.md #22", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await createHold(request, "cust_dave", 123);
    expect(resp.status()).toBe(400);
    expect(await resp.json()).toEqual({ error: "seatId is required" });
  });

  test("TC-008d seatId nonexistent — DECISIONS.md #8", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await createHold(request, "cust_dave", "Z99");
    expect(resp.status()).toBe(404);
    expect(await resp.json()).toEqual({ error: "Seat not found" });
  });

  test("TC-008e seatId valid — success criteria, DECISIONS.md #1/#12", { tag: ["@smoke"] }, async ({ request }) => {
    const resp = await createHold(request, "cust_dave", "A12");
    expect(resp.status()).toBe(200);
    expect((await resp.json()).status).toBe("held");
  });
});

test.describe("Parameter Checking — status body field on PATCH /holds/{holdId} (TC-021a..f)", () => {
  test("TC-021a status missing — DECISIONS.md #23", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await request.patch(holdUrl("hold_open_001"), {
      headers: { "x-customer-id": "cust_bob" },
      data: {},
    });
    expect(resp.status()).toBe(400);
    expect(await resp.json()).toEqual({ error: "invalid status" });
  });

  test("TC-021b status blank — DECISIONS.md #23", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await patchHold(request, "hold_open_001", "cust_bob", "");
    expect(resp.status()).toBe(400);
    expect(await resp.json()).toEqual({ error: "invalid status" });
  });

  test("TC-021c status invalid type — DECISIONS.md #23", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await patchHold(request, "hold_open_001", "cust_bob", 123);
    expect(resp.status()).toBe(400);
    expect(await resp.json()).toEqual({ error: "invalid status" });
  });

  test("TC-021d status wrong case — DECISIONS.md #24", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await patchHold(request, "hold_open_001", "cust_bob", "Confirmed");
    expect(resp.status()).toBe(400);
    expect(await resp.json()).toEqual({ error: "invalid status" });
  });

  test("TC-021e status illegal value — DECISIONS.md #3/#11", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await patchHold(request, "hold_open_001", "cust_bob", "banana");
    expect(resp.status()).toBe(400);
    expect(await resp.json()).toEqual({ error: "invalid status" });
  });

  test("TC-021f status valid — success criteria, DECISIONS.md #13", { tag: ["@smoke"] }, async ({ request }) => {
    const resp = await patchHold(request, "hold_open_001", "cust_bob", "confirmed");
    expect(resp.status()).toBe(200);
    expect((await resp.json()).status).toBe("confirmed");
  });
});

test.describe("Functional", () => {
  test("TC-001 get all seats, no filter", { tag: ["@smoke"] }, async ({ request }) => {
    const resp = await request.get(seatsUrl());
    expect(resp.status()).toBe(200);
    const seats = await resp.json();
    expect(seatStatus(seats, "A12")).toBe("available");
    expect(seatStatus(seats, "A13")).toBe("held");
    expect(seatStatus(seats, "A14")).toBe("sold");
    expect(seatStatus(seats, "A15")).toBe("available");
    expect(seatStatus(seats, "A20")).toBe("available"); // expired hold, no longer held
  });

  test("TC-002 get available seats", { tag: ["@smoke"] }, async ({ request }) => {
    const resp = await request.get(seatsUrl(undefined, "available"));
    expect(resp.status()).toBe(200);
    const ids = (await resp.json()).map((s: { seatId: string }) => s.seatId).sort();
    expect(ids).toEqual(["A12", "A15", "A20"]);
  });

  test("TC-005 hold available seat — DECISIONS.md #1/#12", { tag: ["@smoke"] }, async ({ request }) => {
    const resp = await createHold(request, "cust_dave", "A12");
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.status).toBe("held");
    expect(body.expiresAt).toBeTruthy();
  });

  test("TC-006a hold already-held seat — DECISIONS.md #6", { tag: ["@smoke"] }, async ({ request }) => {
    const resp = await createHold(request, "cust_dave", "A13");
    expect(resp.status()).toBe(409);
    expect(await resp.json()).toEqual({ error: "Seat not available" });
  });

  test("TC-006b hold already-sold seat — DECISIONS.md #6", { tag: ["@smoke"] }, async ({ request }) => {
    const resp = await createHold(request, "cust_dave", "A14");
    expect(resp.status()).toBe(409);
    expect(await resp.json()).toEqual({ error: "Seat not available" });
  });

  test("TC-007 hold missing x-customer-id — DECISIONS.md #2/#7", { tag: ["@smoke"] }, async ({ request }) => {
    const resp = await request.post(holdsUrl(), { data: { seatId: "A12" } });
    expect(resp.status()).toBe(401);
    expect(await resp.json()).toEqual({ error: "Unauthorized" });
  });

  test("TC-010 confirm own active hold", { tag: ["@smoke"] }, async ({ request }) => {
    const resp = await patchHold(request, "hold_open_001", "cust_bob", "confirmed");
    expect(resp.status()).toBe(200);
    expect((await resp.json()).status).toBe("confirmed");
    const seats = await (await request.get(seatsUrl())).json();
    expect(seatStatus(seats, "A13")).toBe("sold");
  });

  test("TC-011 confirm someone else's hold — DECISIONS.md #10", { tag: ["@smoke"] }, async ({ request }) => {
    const resp = await patchHold(request, "hold_open_001", "cust_dave", "confirmed");
    expect(resp.status()).toBe(404);
    expect(await resp.json()).toEqual({ error: "Hold not found" });
  });

  test("TC-012 confirm already-confirmed hold — DECISIONS.md #11", { tag: ["@smoke"] }, async ({ request }) => {
    const resp = await patchHold(request, "hold_confirmed_001", "cust_alice", "confirmed");
    expect(resp.status()).toBe(409);
    expect(await resp.json()).toEqual({ error: "Hold is no longer active" });
  });

  test("TC-013 confirm already-released hold — DECISIONS.md #11", { tag: ["@smoke"] }, async ({ request }) => {
    const created = await createHold(request, "cust_erin", "A15");
    const { holdId } = await created.json();
    await patchHold(request, holdId, "cust_erin", "released");

    const resp = await patchHold(request, holdId, "cust_erin", "confirmed");
    expect(resp.status()).toBe(409);
    expect(await resp.json()).toEqual({ error: "Hold is no longer active" });
  });

  test("TC-014 confirm expired hold — DECISIONS.md #11", { tag: ["@smoke"] }, async ({ request }) => {
    const resp = await patchHold(request, "hold_expired_001", "cust_carol", "confirmed");
    expect(resp.status()).toBe(409);
    expect(await resp.json()).toEqual({ error: "Hold is no longer active" });
  });

  test("TC-015 release own active hold", { tag: ["@smoke"] }, async ({ request }) => {
    const created = await createHold(request, "cust_frank", "A15");
    const { holdId } = await created.json();

    const resp = await patchHold(request, holdId, "cust_frank", "released");
    expect(resp.status()).toBe(200);
    expect((await resp.json()).status).toBe("released");

    const seats = await (await request.get(seatsUrl())).json();
    expect(seatStatus(seats, "A15")).toBe("available");
  });

  test("TC-016 release someone else's hold — DECISIONS.md #10", { tag: ["@smoke"] }, async ({ request }) => {
    const resp = await patchHold(request, "hold_open_001", "cust_dave", "released");
    expect(resp.status()).toBe(404);
    expect(await resp.json()).toEqual({ error: "Hold not found" });
  });

  test("TC-017 release already-released hold — DECISIONS.md #11", { tag: ["@edge"] }, async ({ request }) => {
    const created = await createHold(request, "cust_frank", "A15");
    const { holdId } = await created.json();
    await patchHold(request, holdId, "cust_frank", "released");

    const resp = await patchHold(request, holdId, "cust_frank", "released");
    expect(resp.status()).toBe(409);
    expect(await resp.json()).toEqual({ error: "Hold is no longer active" });
  });

  test("TC-018 release expired hold — DECISIONS.md #11", { tag: ["@edge"] }, async ({ request }) => {
    const resp = await patchHold(request, "hold_expired_001", "cust_carol", "released");
    expect(resp.status()).toBe(409);
    expect(await resp.json()).toEqual({ error: "Hold is no longer active" });
  });

  test("TC-019 re-hold after release — per US-4", { tag: ["@smoke"] }, async ({ request }) => {
    const created = await createHold(request, "cust_frank", "A15");
    const { holdId } = await created.json();
    await patchHold(request, holdId, "cust_frank", "released");

    const resp = await createHold(request, "cust_grace", "A15");
    expect(resp.status()).toBe(200);
    expect((await resp.json()).status).toBe("held");
  });

  test("TC-020 expiry protects inventory — DECISIONS.md #12", { tag: ["@smoke"] }, async ({ request }) => {
    const confirmResp = await patchHold(request, "hold_expired_001", "cust_carol", "confirmed");
    expect(confirmResp.status()).toBe(409);

    const seats = await (await request.get(seatsUrl(undefined, "available"))).json();
    const ids = seats.map((s: { seatId: string }) => s.seatId);
    expect(ids).toContain("A20");
  });

  // Recategorized from Non Functional -> Functional: this is a
  // deterministic correctness check (does the mutex-protected handler
  // serialize two simultaneous holds correctly), not a load test — see
  // "Non Functional splits into Load and Security" in
  // ../../README-generating-at.md.
  test("TC-022 concurrent hold attempts on same seat — DECISIONS.md #15", { tag: ["@smoke"] }, async ({ request }) => {
    const [r1, r2] = await Promise.all([
      createHold(request, "cust_x", "A12"),
      createHold(request, "cust_y", "A12"),
    ]);
    const codes = [r1.status(), r2.status()].sort();
    expect(codes).toEqual([200, 409]);
    const loser = r1.status() === 409 ? r1 : r2;
    expect(await loser.json()).toEqual({ error: "Seat not available" });
  });
});

// TC-023 (response time) and TC-024 (no rate limiting) are real Load /
// Security concerns, not functional correctness checks — moved out of
// this Playwright suite into ../load-test/ (Artillery) and
// ../SECURITY_CHECKS.md respectively. See "Non Functional splits into
// Load and Security" in ../../README-generating-at.md.
