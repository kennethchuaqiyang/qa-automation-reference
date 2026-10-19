import { test as base, expect } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
import { BookingPage } from "../pages/BookingPage";

export const VALID_EMAIL = "patient_alice@example.com";
export const VALID_PASSWORD = "Password123!";

type Fixtures = {
  resetServer: void;
  loginPage: LoginPage;
  bookingPage: BookingPage;
};

// Autouse reset before every test: restores the 4-slot baseline and
// clears all sessions/lockouts server-side, so tests never leak state
// into each other — same pattern as the API golden pair's /debug/reset.
export const test = base.extend<Fixtures>({
  resetServer: [
    async ({ request, baseURL }, use) => {
      await request.post(`${baseURL}/__reset`);
      await use(undefined);
    },
    { auto: true },
  ],

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  bookingPage: async ({ page }, use) => {
    await use(new BookingPage(page));
  },
});

/** Logs in as the standard test account and asserts the redirect to /booking landed. */
export async function loginAsAlice(loginPage: LoginPage) {
  await loginPage.login(VALID_EMAIL, VALID_PASSWORD);
  await expect(loginPage.page).toHaveURL(/\/booking$/);
}

export { expect };
