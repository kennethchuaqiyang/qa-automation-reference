import type { Locator, Page } from "@playwright/test";

/** The desk search / grid / confirm flow (`/search`, `/confirm`). Selectors per ../SELECTORS.md. */
export class SearchPage {
  readonly page: Page;

  readonly searchForm: Locator;
  readonly dateInput: Locator;
  readonly zoneSelect: Locator;
  readonly searchButton: Locator;
  readonly searchError: Locator;
  readonly deskGrid: Locator;
  readonly emptyState: Locator;
  readonly bookingSuccess: Locator;
  readonly deskTakenMessage: Locator;
  readonly myBookingsLink: Locator;

  readonly confirmDetail: Locator;
  readonly deskTakenInline: Locator;
  readonly confirmButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchForm = page.locator("#search-form");
    this.dateInput = page.locator("#date");
    this.zoneSelect = page.locator("#zone");
    this.searchButton = page.locator("#search-submit");
    this.searchError = page.locator("#search-error");
    this.deskGrid = page.locator("#desk-grid");
    this.emptyState = page.locator("#empty-state");
    this.bookingSuccess = page.locator("#booking-success");
    this.deskTakenMessage = page.locator("#desk-taken-message");
    this.myBookingsLink = page.locator("#my-bookings-link");

    this.confirmDetail = page.locator("#confirm-detail");
    this.deskTakenInline = page.locator("#desk-taken-inline");
    this.confirmButton = page.locator("#confirm-btn");
  }

  async goto(params: { date?: string; zone?: string; memberId?: string } = {}) {
    const qs = new URLSearchParams();
    if (params.date !== undefined) qs.set("date", params.date);
    if (params.zone !== undefined) qs.set("zone", params.zone);
    if (params.memberId !== undefined) qs.set("memberId", params.memberId);
    const query = qs.toString();
    await this.page.goto(query ? `/search?${query}` : "/search");
  }

  desk(deskId: string): Locator {
    return this.page.locator(`[data-desk-id="${deskId}"]`);
  }

  async searchByDate(date: string) {
    await this.dateInput.fill(date);
    await this.searchButton.click();
  }

  async searchByDateAndZone(date: string, zone: string) {
    await this.dateInput.fill(date);
    await this.zoneSelect.selectOption(zone);
    await this.searchButton.click();
  }

  /** Clicks an available desk in the grid, landing on /confirm. */
  async selectDesk(deskId: string) {
    await this.desk(deskId).click();
  }

  async confirm() {
    await this.confirmButton.click();
  }

  /** Selects a desk from the grid and confirms the booking end to end. */
  async bookDesk(deskId: string) {
    await this.selectDesk(deskId);
    await this.confirm();
  }
}
