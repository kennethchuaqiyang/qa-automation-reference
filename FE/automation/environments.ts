/**
 * Named environments for the Login + Slot Picker suite. `TEST_ENV` picks
 * one (defaults to "local"); `LOGIN_SLOT_PICKER_BASE_URL` still works as
 * a direct one-off override and takes priority over everything here —
 * see playwright.config.ts.
 *
 * uat/prod have no real deployed instance yet — set
 * LOGIN_SLOT_PICKER_UAT_URL / LOGIN_SLOT_PICKER_PROD_URL (e.g. in your
 * shell profile or CI secrets) once one exists. Nothing here is a
 * secret; these are just base URLs.
 */
export const ENVIRONMENTS = {
  local: "http://localhost:4000",
  uat: process.env.LOGIN_SLOT_PICKER_UAT_URL ?? "",
  prod: process.env.LOGIN_SLOT_PICKER_PROD_URL ?? "",
} as const;

export type EnvName = keyof typeof ENVIRONMENTS;
