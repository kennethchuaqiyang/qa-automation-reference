/**
 * Named environments for the Event Seat Hold API suite. `TEST_ENV` picks
 * one (defaults to "local"); `SEAT_HOLD_BASE_URL` still works as a direct
 * one-off override and takes priority over everything here — see
 * playwright.config.ts.
 *
 * uat/prod have no real deployed instance yet — set
 * SEAT_HOLD_UAT_URL / SEAT_HOLD_PROD_URL (e.g. in your shell profile or
 * CI secrets) once one exists. Nothing here is a secret; these are just
 * base URLs.
 */
export const ENVIRONMENTS = {
  local: "http://localhost:8080",
  uat: process.env.SEAT_HOLD_UAT_URL ?? "",
  prod: process.env.SEAT_HOLD_PROD_URL ?? "",
} as const;

export type EnvName = keyof typeof ENVIRONMENTS;
