import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
import { ENVIRONMENTS, type EnvName } from "./environments";

/**
 * Target picked two ways:
 *   - TEST_ENV=local|uat|prod   — named environment from environments.ts (default: local)
 *   - DESK_BOOKING_BASE_URL=<url> — direct override, always wins over TEST_ENV
 *
 *   npx playwright test                            # local mock (default)
 *   npm run test:uat                               # named "uat" environment (live Render deploy)
 *   npm run test:prod                              # named "prod" environment
 *   DESK_BOOKING_BASE_URL=https://x npx playwright test   # one-off override, any environment
 */
const envName = (process.env.TEST_ENV as EnvName | undefined) ?? "local";
const namedBaseURL = ENVIRONMENTS[envName];

if (namedBaseURL === undefined) {
  throw new Error(
    `Unknown TEST_ENV="${envName}". Valid values: ${Object.keys(ENVIRONMENTS).join(", ")}.`
  );
}

const baseURL = process.env.DESK_BOOKING_BASE_URL ?? namedBaseURL;

if (!baseURL) {
  throw new Error(
    `No base URL configured for TEST_ENV="${envName}". Set DESK_BOOKING_${envName.toUpperCase()}_URL ` +
      `(see environments.ts), or pass DESK_BOOKING_BASE_URL directly.`
  );
}

// One specific sandbox this project has been developed in has a
// pre-installed Chromium at this fixed path and no network access to
// fetch the revision this @playwright/test version expects by default —
// point launches at that pre-installed binary ONLY when it's actually
// present. Everywhere else (your own machine, a Codespace, CI), this is
// a no-op and Playwright resolves the browser normally — just run
// `npx playwright install chromium` once, same as any other project.
const SANDBOX_CHROMIUM_PATH = "/opt/pw-browsers/chromium";
const launchOptions = existsSync(SANDBOX_CHROMIUM_PATH)
  ? { executablePath: SANDBOX_CHROMIUM_PATH }
  : {};

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false, // tests share mutable server state (desks, bookings) via POST /__reset
  workers: 1,
  retries: 0,
  reporter: [["list"], ["./reporters/qa-notice-reporter.ts"]],
  use: {
    baseURL,
    launchOptions,
  },
});
