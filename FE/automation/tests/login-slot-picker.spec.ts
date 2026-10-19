import { test, expect, VALID_EMAIL, VALID_PASSWORD, loginAsAlice } from "./fixtures";

// Strictly implements Test_Cases_LoginSlotPicker_Finalized.xlsx — one
// test per TC id, no extra assertions beyond what that sheet specifies.
// See ../DECISIONS.md and ../SELECTORS.md for the reasoning/selectors
// behind each assertion. Page interactions go through pages/LoginPage.ts
// and pages/BookingPage.ts (POM) rather than raw selectors in the spec.

test.describe("Parameter Checking — Login — email", () => {
  test("TC-001a: email blank — client-side validation error, no submit, no lockout count", { tag: ["@edge"] }, async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.fillPassword("anything");
    await loginPage.submit();
    await expect(page).toHaveURL(/\/login$/);
    await expect(loginPage.validationError).toBeVisible();
    await expect(loginPage.loginError).toBeHidden();
  });

  test("TC-001b1: email missing @ symbol — falls through to generic credential error (DECISIONS.md #2)", { tag: ["@edge"] }, async ({ loginPage }) => {
    await loginPage.login("abc", "anything");
    await expect(loginPage.loginError).toHaveText("Incorrect email or password.");
  });

  test("TC-001b2: email missing domain extension — same generic error (DECISIONS.md #2)", { tag: ["@edge"] }, async ({ loginPage }) => {
    await loginPage.login("a@com", "anything");
    await expect(loginPage.loginError).toHaveText("Incorrect email or password.");
  });

  test("TC-001b3: email missing local part — same generic error (DECISIONS.md #2)", { tag: ["@edge"] }, async ({ loginPage }) => {
    await loginPage.login("@happy.com", "anything");
    await expect(loginPage.loginError).toHaveText("Incorrect email or password.");
  });

  test("TC-001b4: email missing domain entirely — same generic error (DECISIONS.md #2)", { tag: ["@edge"] }, async ({ loginPage }) => {
    await loginPage.login("abc@", "anything");
    await expect(loginPage.loginError).toHaveText("Incorrect email or password.");
  });

  test("TC-001c: valid format but unregistered email — identical copy to a wrong password (DECISIONS.md #3)", { tag: ["@edge"] }, async ({ loginPage }) => {
    await loginPage.login("nobody@example.com", "anything");
    await expect(loginPage.loginError).toHaveText("Incorrect email or password.");
  });

  test("TC-001d: email valid (Valid variant) — login succeeds, reaches booking page", { tag: ["@smoke"] }, async ({ loginPage }) => {
    await loginAsAlice(loginPage);
  });
});

test.describe("Parameter Checking — Login — password", () => {
  test("TC-002a: password blank — client-side validation error, no submit, no lockout count", { tag: ["@edge"] }, async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.fillEmail(VALID_EMAIL);
    await loginPage.submit();
    await expect(page).toHaveURL(/\/login$/);
    await expect(loginPage.validationError).toBeVisible();
    await expect(loginPage.loginError).toBeHidden();
  });

  test("TC-002b: password valid (Valid variant) — login succeeds, reaches booking page", { tag: ["@smoke"] }, async ({ loginPage }) => {
    await loginAsAlice(loginPage);
  });
});

test.describe("Functional — Login", () => {
  test("TC-003: successful login reaches the booking/slot-picker page", { tag: ["@smoke"] }, async ({ loginPage }) => {
    await loginAsAlice(loginPage);
  });

  test("TC-004: wrong password, 1st attempt — inline error, can retry immediately (DECISIONS.md #3)", { tag: ["@smoke"] }, async ({ page, loginPage }) => {
    await loginPage.login(VALID_EMAIL, "wrongpassword");
    await expect(page).toHaveURL(/\/login$/);
    await expect(loginPage.loginError).toHaveText("Incorrect email or password.");
    // can retry immediately, without reloading
    await loginPage.attempt(VALID_EMAIL, VALID_PASSWORD);
    await expect(page).toHaveURL(/\/booking$/);
  });

  test("TC-005: nonexistent email — same inline error as TC-004 (DECISIONS.md #3)", { tag: ["@smoke"] }, async ({ loginPage }) => {
    await loginPage.login("nobody@example.com", "whatever");
    await expect(loginPage.loginError).toHaveText("Incorrect email or password.");
  });

  test("TC-006: 2nd consecutive failed attempt — still the inline retry error, no remaining-attempts count (DECISIONS.md #4)", { tag: ["@smoke"] }, async ({ page, loginPage }) => {
    await loginPage.login(VALID_EMAIL, "wrong1");
    await loginPage.attempt(VALID_EMAIL, "wrong2");
    await expect(page).toHaveURL(/\/login$/);
    await expect(loginPage.loginError).toHaveText("Incorrect email or password.");
  });

  test("TC-007: 3rd consecutive failed attempt — redirected to the standalone Login Failed page (DECISIONS.md #5)", { tag: ["@smoke"] }, async ({ page, loginPage }) => {
    await loginPage.login(VALID_EMAIL, "wrong1");
    await loginPage.attempt(VALID_EMAIL, "wrong2");
    await loginPage.attempt(VALID_EMAIL, "wrong3");
    await expect(page).toHaveURL(/\/login-failed$/);
    await expect(loginPage.loginFailedMessage).toHaveText("Too many failed attempts. Please try again later.");
  });

  test("TC-008: lockout trigger with mixed attempt types — counter is per-session, not per-email (DECISIONS.md #6)", { tag: ["@edge"] }, async ({ page, loginPage }) => {
    await loginPage.login(VALID_EMAIL, "wrong1");
    await loginPage.attempt("someoneelse@example.com", "wrong2");
    await loginPage.attempt(VALID_EMAIL, "wrong3");
    await expect(page).toHaveURL(/\/login-failed$/);
  });

  // Recategorized from Non Functional -> Functional: this is a timing
  // correctness check (does the stated 15s window actually expire), not
  // a load or security concern — see "Non Functional splits into Load
  // and Security" in ../../README-generating-at.md. TC-017 (lockout
  // persists across reload) is genuinely security-relevant — "can the
  // brute-force lockout be bypassed by reloading" — and lives in
  // ../SECURITY_CHECKS.md instead.
  test("TC-018: lockout expires after the 15s timeout window (DECISIONS.md #8) — real-time wait, no seeded-expired-state trick", { tag: ["@edge"] }, async ({
    page,
    loginPage,
  }) => {
    test.setTimeout(30_000);

    await loginPage.login(VALID_EMAIL, "wrong1");
    await loginPage.attempt(VALID_EMAIL, "wrong2");
    await loginPage.attempt(VALID_EMAIL, "wrong3");
    await expect(page).toHaveURL(/\/login-failed$/);

    await page.waitForTimeout(15_500); // real 15s lockout window + margin

    // Navigate fresh rather than reusing the locked-out page, so a still-
    // locked session fails this assertion cleanly instead of timing out
    // later on a fillEmail against a page that has no login form.
    await loginPage.goto();
    await expect(page).toHaveURL(/\/login$/);

    await loginPage.attempt(VALID_EMAIL, VALID_PASSWORD);
    await expect(page).toHaveURL(/\/booking$/);
  });
});

test.describe("Functional — Slot Picker", () => {
  test("TC-009: view available slots — mixed state, taken slots are distinct and not selectable", { tag: ["@smoke"] }, async ({ loginPage, bookingPage }) => {
    await loginAsAlice(loginPage);
    await expect(bookingPage.slot("slot-1")).toHaveClass(/available/);
    await expect(bookingPage.slot("slot-2")).toHaveClass(/taken/);
    await expect(bookingPage.slot("slot-2")).toBeDisabled();
  });

  test("TC-010: view with no slots available — shows the empty state message (DECISIONS.md #9)", { tag: ["@smoke"] }, async ({ loginPage, bookingPage }) => {
    await loginAsAlice(loginPage);
    // book out every available slot to reach the empty state
    for (const id of ["slot-1", "slot-3", "slot-4"]) {
      await bookingPage.bookSlot(id);
    }
    await expect(bookingPage.emptyState).toHaveText(
      "No appointment slots available for this date. Try a different date."
    );
  });

  test("TC-011: select an available slot — marked as selected", { tag: ["@smoke"] }, async ({ loginPage, bookingPage }) => {
    await loginAsAlice(loginPage);
    await bookingPage.selectSlot("slot-1");
    await expect(bookingPage.slot("slot-1")).toHaveClass(/selected/);
  });

  test("TC-012: select a different slot — selection moves, previous slot no longer selected", { tag: ["@smoke"] }, async ({ loginPage, bookingPage }) => {
    await loginAsAlice(loginPage);
    await bookingPage.selectSlot("slot-1");
    await bookingPage.selectSlot("slot-3");
    await expect(bookingPage.slot("slot-3")).toHaveClass(/selected/);
    await expect(bookingPage.slot("slot-1")).not.toHaveClass(/selected/);
  });

  test("TC-013: deselect by clicking the selected slot again", { tag: ["@smoke"] }, async ({ loginPage, bookingPage }) => {
    await loginAsAlice(loginPage);
    await bookingPage.selectSlot("slot-1");
    await bookingPage.selectSlot("slot-1");
    await expect(bookingPage.slot("slot-1")).not.toHaveClass(/selected/);
  });

  test("TC-014: confirm with a slot selected — booking succeeds, success state shows the booked time", { tag: ["@smoke"] }, async ({ loginPage, bookingPage }) => {
    await loginAsAlice(loginPage);
    await bookingPage.bookSlot("slot-1");
    await expect(bookingPage.bookingSuccess).toContainText("Mon 10:00 AM");
  });

  test("TC-015: confirm with nothing selected — Confirm is disabled/non-interactive, no booking created (DECISIONS.md #10)", { tag: ["@smoke"] }, async ({ loginPage, bookingPage }) => {
    await loginAsAlice(loginPage);
    await expect(bookingPage.confirmButton).toBeDisabled();
  });

  // Recategorized from Non Functional -> Functional: this is a
  // deterministic correctness check (the mock-side /simulate-taken hook
  // makes it reliable, not a race you're gambling on), not a load test —
  // see "Non Functional splits into Load and Security" in
  // ../../README-generating-at.md.
  test("TC-016: slot taken by someone else mid-decision — inline message, selection clears, list re-renders (DECISIONS.md #11)", { tag: ["@smoke"] }, async ({
    loginPage,
    bookingPage,
    request,
    baseURL,
  }) => {
    await loginAsAlice(loginPage);
    await bookingPage.selectSlot("slot-1");
    await expect(bookingPage.slot("slot-1")).toHaveClass(/selected/);

    // mock-side trigger: another patient books slot-1 before Confirm is clicked
    await request.post(`${baseURL}/simulate-taken`, { form: { slotId: "slot-1" } });

    await bookingPage.confirm();
    await expect(bookingPage.slotTakenMessage).toHaveText(
      "This time is no longer available — please choose another."
    );
    await expect(bookingPage.slot("slot-1")).not.toHaveClass(/selected/);
    await expect(bookingPage.slot("slot-1")).toHaveClass(/taken/);
  });
});
