/**
 * UI automation for the Desk Booking hybrid golden pair.
 *
 * Implements test-cases/Test_Cases_DeskBooking_Finalized.xlsx, tab
 * "Cases - UI", exactly, against the contract and behavior documented
 * in DECISIONS.md and the selectors confirmed in ../SELECTORS.md. One
 * test per TC id. TC ids assigned by tree position (the real template
 * has no ID column) — TC-101..102 Parameter Checking, TC-103..108
 * Functional. (Prefixed 1xx, distinct from the API tab's TC-0xx, since
 * the two tabs are independent case lists per CLAUDE.md's two-tab split.)
 *
 * Seed data — see desk-booking-api.spec.ts's header comment.
 */
import { test, expect, FUTURE_DATE, PAST_DATE, MEMBER_ALICE, MEMBER_BOB } from "./fixtures";

test.describe("Parameter Checking — Search form: date (TC-101a..b)", () => {
  test("TC-101a date left blank, Search clicked — client-side blocked, no request sent, DECISIONS.md #8", { tag: ["@edge"] }, async ({ searchPage, page }) => {
    await searchPage.goto();
    const startUrl = page.url();
    await searchPage.searchButton.click();
    // Native HTML5 `required` validation blocks the submit — no navigation happens at all.
    expect(page.url()).toBe(startUrl);
    await expect(searchPage.deskGrid).toBeEmpty();
  });

  test("TC-101b date picker valid — success criteria, grid renders", { tag: ["@smoke"] }, async ({ searchPage }) => {
    await searchPage.goto();
    await searchPage.searchByDate(FUTURE_DATE);
    await expect(searchPage.deskGrid.locator("button.desk")).toHaveCount(5);
  });
});

test.describe("Parameter Checking — Search form: zone (TC-102a..b)", () => {
  test("TC-102a zone filter cleared / \"All\" — grid shows desks from every zone", { tag: ["@edge"] }, async ({ searchPage }) => {
    await searchPage.goto();
    await searchPage.searchByDate(FUTURE_DATE); // zone left on its default ("All")
    await expect(searchPage.deskGrid.locator("button.desk")).toHaveCount(5);
  });

  test("TC-102b zone filter valid — success criteria, only that zone's desks returned", { tag: ["@smoke"] }, async ({ searchPage }) => {
    await searchPage.goto();
    await searchPage.searchByDateAndZone(FUTURE_DATE, "quiet");
    await expect(searchPage.deskGrid.locator("button.desk")).toHaveCount(2);
    await expect(searchPage.desk("desk_11")).toBeVisible();
    await expect(searchPage.desk("desk_12")).toBeVisible();
  });
});

test.describe("Functional — Search grid (TC-103)", () => {
  test("TC-103 mixed availability rendered distinctly, US-1 — taken desks not clickable", { tag: ["@smoke"] }, async ({ searchPage, request }) => {
    // bkg_001 (desk_13, mem_bob, FUTURE_DATE, confirmed) is already seeded — desk_13 is taken, the rest available.
    await searchPage.goto();
    await searchPage.searchByDate(FUTURE_DATE);

    const taken = searchPage.desk("desk_13");
    await expect(taken).toHaveClass(/\bdesk\b.*\btaken\b|\btaken\b.*\bdesk\b/);
    await expect(taken).toBeDisabled();

    const available = searchPage.desk("desk_11");
    await expect(available).toHaveClass(/\bdesk\b.*\bavailable\b|\bavailable\b.*\bdesk\b/);
    await expect(available).toBeEnabled();
  });
});

test.describe("Functional — Book a desk (TC-104)", () => {
  test("TC-104 book an available desk via the grid, US-2 — success state, desk no longer offered", { tag: ["@smoke"] }, async ({ searchPage }) => {
    await searchPage.goto();
    await searchPage.searchByDate(FUTURE_DATE);
    await searchPage.bookDesk("desk_11");

    await expect(searchPage.bookingSuccess).toBeVisible();
    await expect(searchPage.bookingSuccess).toContainText("desk_11");

    const rebooked = searchPage.desk("desk_11");
    await expect(rebooked).toHaveClass(/taken/);
    await expect(rebooked).toBeDisabled();
  });
});

test.describe("Functional — View my bookings (TC-105)", () => {
  test("TC-105 shows only my own bookings, US-3 — DECISIONS.md #1, #28", { tag: ["@smoke"] }, async ({ searchPage, myBookingsPage, request }) => {
    const aliceBooking = await request.post("/api/bookings", {
      headers: { "x-member-id": MEMBER_ALICE },
      data: { deskId: "desk_11", date: FUTURE_DATE },
    });
    expect(aliceBooking.status()).toBe(201);
    const { bookingId: aliceBookingId } = await aliceBooking.json();

    const bobBooking = await request.post("/api/bookings", {
      headers: { "x-member-id": MEMBER_BOB },
      data: { deskId: "desk_12", date: FUTURE_DATE },
    });
    expect(bobBooking.status()).toBe(201);
    const { bookingId: bobBookingId } = await bobBooking.json();

    await myBookingsPage.goto(MEMBER_ALICE);
    await expect(myBookingsPage.row(aliceBookingId)).toBeVisible();
    await expect(myBookingsPage.row(bobBookingId)).toHaveCount(0);
  });
});

test.describe("Functional — Cancel a booking (TC-106, TC-107)", () => {
  test("TC-106 cancel my own booking via \"My Bookings\", US-4 — row marked cancelled, desk freed in search", { tag: ["@smoke"] }, async ({ searchPage, myBookingsPage }) => {
    // bkg_001: desk_13, mem_bob, FUTURE_DATE, confirmed (seeded).
    await myBookingsPage.goto(MEMBER_BOB);
    await myBookingsPage.cancel("bkg_001");

    await expect(myBookingsPage.row("bkg_001")).toContainText("cancelled");
    await expect(myBookingsPage.cancelButton("bkg_001")).toBeDisabled();

    await searchPage.goto({ date: FUTURE_DATE });
    const freedDesk = searchPage.desk("desk_13");
    await expect(freedDesk).toHaveClass(/available/);
    await expect(freedDesk).toBeEnabled();
  });

  test("TC-107 Cancel control for a past-dated booking, US-4 — disabled, not hidden, DECISIONS.md #31", { tag: ["@edge"] }, async ({ myBookingsPage }) => {
    // bkg_past_001: desk_15, mem_alice, PAST_DATE, confirmed (seeded).
    await myBookingsPage.goto(MEMBER_ALICE);

    const row = myBookingsPage.row("bkg_past_001");
    await expect(row).toBeVisible();
    await expect(row).toContainText(PAST_DATE);

    const cancelBtn = myBookingsPage.cancelButton("bkg_past_001");
    await expect(cancelBtn).toBeVisible();
    await expect(cancelBtn).toBeDisabled();
  });
});

test.describe("Functional — Booking race (TC-108)", () => {
  test("TC-108 desk taken by someone else mid-decision, US-5 — DECISIONS.md #29, #30", { tag: ["@smoke"] }, async ({ searchPage, request }) => {
    await searchPage.goto();
    await searchPage.searchByDate(FUTURE_DATE);
    await searchPage.selectDesk("desk_11"); // navigates to /confirm, available at this point

    await expect(searchPage.confirmButton).toBeEnabled();
    await expect(searchPage.deskTakenInline).toBeHidden();

    // Another member books the same desk/date via the deterministic test-only
    // hook (DECISIONS.md #29), mirroring the FE golden pair's /simulate-taken.
    const simResp = await request.post("/api/simulate-taken", {
      data: { deskId: "desk_11", date: FUTURE_DATE },
    });
    expect(simResp.status()).toBe(204);

    // The mock has no live polling/JS on the confirm page (confirmed during
    // selector discovery) — re-opening the confirm step is how the mock
    // itself surfaces a state change, same mechanism as reloading after a
    // page revisit. This models "mid-decision" without gambling on a real
    // browser-side race.
    await searchPage.page.reload();

    await expect(searchPage.deskTakenInline).toBeVisible();
    await expect(searchPage.deskTakenInline).toContainText("no longer available");
    await expect(searchPage.confirmButton).toBeDisabled();
  });
});
