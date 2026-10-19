import type { Locator, Page } from "@playwright/test";

/** The "My Bookings" view (`/my-bookings`). Selectors per ../SELECTORS.md. */
export class MyBookingsPage {
  readonly page: Page;

  readonly bookingsList: Locator;
  readonly noBookings: Locator;
  readonly backToSearchLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.bookingsList = page.locator("#bookings-list");
    this.noBookings = page.locator("#no-bookings");
    this.backToSearchLink = page.getByRole("link", { name: "Back to Search" });
  }

  async goto(memberId: string) {
    await this.page.goto(`/my-bookings?memberId=${encodeURIComponent(memberId)}`);
  }

  row(bookingId: string): Locator {
    // Both the row <div> and its Cancel <button> carry data-booking-id —
    // scope by class too, or this also matches the button.
    return this.page.locator(`.booking-row[data-booking-id="${bookingId}"]`);
  }

  cancelButton(bookingId: string): Locator {
    return this.page.locator(`.cancel-btn[data-booking-id="${bookingId}"]`);
  }

  async cancel(bookingId: string) {
    await this.cancelButton(bookingId).click();
  }
}
