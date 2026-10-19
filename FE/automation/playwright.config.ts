import { defineConfig } from "@playwright/test";
import { ENVIRONMENTS, type EnvName } from "./environments";

/**
 * Target picked two ways:
 *   - TEST_ENV=local|uat|prod        — named environment from environments.ts (default: local)
 *   - LOGIN_SLOT_PICKER_BASE_URL=<url> — direct override, always wins over TEST_ENV
 *
 *   npx playwright test                         # local mock (default)
 *   npm run test:uat                            # named "uat" environment
 *   npm run test:prod                           # named "prod" environment
 *   LOGIN_SLOT_PICKER_BASE_URL=https://x npx playwright test   # one-off override, any environment
 */
const envName = (process.env.TEST_ENV as EnvName | undefined) ?? "local";
const namedBaseURL = ENVIRONMENTS[envName];

if (namedBaseURL === undefined) {
  throw new Error(
    `Unknown TEST_ENV="${envName}". Valid values: ${Object.keys(ENVIRONMENTS).join(", ")}.`
  );
}

const baseURL = process.env.LOGIN_SLOT_PICKER_BASE_URL ?? namedBaseURL;

if (!baseURL) {
  throw new Error(
    `No base URL configured for TEST_ENV="${envName}". Set LOGIN_SLOT_PICKER_${envName.toUpperCase()}_URL ` +
      `(see environments.ts), or pass LOGIN_SLOT_PICKER_BASE_URL directly.`
  );
}

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false, // tests share mutable server state (sessions, slot availability) via POST /__reset
  workers: 1,
  retries: 0,
  reporter: [["list"], ["./reporters/qa-notice-reporter.ts"]],
  use: {
    baseURL,
  },
});
