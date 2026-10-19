import type { Locator, Page } from "@playwright/test";

/**
 * Covers both /login and /login-failed — they're one user-facing flow
 * (login attempt -> either the form again, or the standalone Login
 * Failed page), so one page object for the pair rather than splitting
 * login-failed out on its own. Selectors per ../SELECTORS.md.
 */
export class LoginPage {
  readonly page: Page;

  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly validationError: Locator;
  readonly loginError: Locator;
  readonly loginFailedMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator("#email");
    this.passwordInput = page.locator("#password");
    this.submitButton = page.locator("#login-submit");
    this.validationError = page.locator("#validation-error");
    this.loginError = page.locator("#login-error");
    this.loginFailedMessage = page.locator("#login-failed-message");
  }

  async goto() {
    await this.page.goto("/login");
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async submit() {
    await this.submitButton.click();
  }

  /** Fills both fields and submits in one call, for attempts where the field-by-field path doesn't matter. */
  async login(email: string, password: string) {
    await this.goto();
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }

  /** Submits again from whatever page it's currently on (login form or an already-failed state), without re-navigating. */
  async attempt(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }
}
