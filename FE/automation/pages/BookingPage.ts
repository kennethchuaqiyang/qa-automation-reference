import type { Locator, Page } from "@playwright/test";

/** The appointment slot picker (`/booking`). Selectors per ../SELECTORS.md. */
export class BookingPage {
  readonly page: Page;

  readonly slotList: Locator;
  readonly emptyState: Locator;
  readonly slotTakenMessage: Locator;
  readonly bookingSuccess: Locator;
  readonly confirmButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.slotList = page.locator("#slot-list");
    this.emptyState = page.locator("#empty-state");
    this.slotTakenMessage = page.locator("#slot-taken-message");
    this.bookingSuccess = page.locator("#booking-success");
    this.confirmButton = page.locator("#confirm-btn");
  }

  async goto() {
    await this.page.goto("/booking");
  }

  slot(id: string): Locator {
    return this.page.locator(`[data-slot-id="${id}"]`);
  }

  async selectSlot(id: string) {
    await this.slot(id).click();
  }

  async confirm() {
    await this.confirmButton.click();
  }

  /** Books a slot end to end: select then confirm, used by tests that just need an available slot taken off the board. */
  async bookSlot(id: string) {
    await this.selectSlot(id);
    await this.confirm();
  }
}
