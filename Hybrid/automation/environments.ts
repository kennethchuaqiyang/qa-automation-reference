/**
 * Named environments for the Desk Booking hybrid suite. `TEST_ENV` picks
 * one (defaults to "local"); `DESK_BOOKING_BASE_URL` still works as a
 * direct one-off override and takes priority over everything here — see
 * playwright.config.ts.
 *
 * "uat" here is the live Render deployment
 * (https://desk-booking-mock.onrender.com) — a practice target standing
 * in for a pre-prod/staging environment, not an actual production
 * service. prod has no separate deployed instance; set
 * DESK_BOOKING_PROD_URL if one is ever stood up.
 */
export const ENVIRONMENTS = {
  local: "http://localhost:4200",
  uat: process.env.DESK_BOOKING_UAT_URL ?? "https://desk-booking-mock.onrender.com",
  prod: process.env.DESK_BOOKING_PROD_URL ?? "",
} as const;

export type EnvName = keyof typeof ENVIRONMENTS;
