import { test as base, expect, type APIRequestContext } from "@playwright/test";
import { SearchPage } from "../pages/SearchPage";
import { MyBookingsPage } from "../pages/MyBookingsPage";

export const FUTURE_DATE = "2026-11-03"; // matches the seeded bkg_001 date
export const PAST_DATE = "2020-01-01"; // matches the seeded bkg_past_001 date
export const MEMBER_ALICE = "mem_alice";
export const MEMBER_BOB = "mem_bob";

type Fixtures = {
  resetServer: void;
  searchPage: SearchPage;
  myBookingsPage: MyBookingsPage;
};

// Every finalized test case (API and UI tabs) starts with "Reset before
// row" as a stated precondition. Autouse reset before every test —
// restores the seeded baseline (bkg_001, bkg_past_001) so tests never
// leak state into each other — same pattern as the other two golden
// pairs' fixtures.
export const test = base.extend<Fixtures>({
  resetServer: [
    async ({ request }, use) => {
      const resp = await request.post("/__reset");
      expect(resp.status(), "reset failed").toBe(204);
      await use(undefined);
    },
    { auto: true },
  ],

  searchPage: async ({ page }, use) => {
    await use(new SearchPage(page));
  },

  myBookingsPage: async ({ page }, use) => {
    await use(new MyBookingsPage(page));
  },
});

export { expect };

export function desksUrl(date?: string, zone?: string) {
  const qs = new URLSearchParams();
  if (date !== undefined) qs.set("date", date);
  if (zone !== undefined) qs.set("zone", zone);
  const query = qs.toString();
  return query ? `/api/desks?${query}` : "/api/desks";
}

export function bookingsUrl() {
  return "/api/bookings";
}

export function cancelUrl(bookingId: string) {
  return `/api/bookings/${bookingId}/cancel`;
}

export async function createBooking(
  request: APIRequestContext,
  memberId: string | undefined,
  deskId: unknown,
  date: unknown,
) {
  return request.post(bookingsUrl(), {
    headers: memberId !== undefined ? { "x-member-id": memberId } : {},
    data: { deskId, date },
  });
}

export async function cancelBooking(
  request: APIRequestContext,
  memberId: string | undefined,
  bookingId: string,
) {
  return request.post(cancelUrl(bookingId), {
    headers: memberId !== undefined ? { "x-member-id": memberId } : {},
  });
}

export function deskAvailability(desks: Array<{ deskId: string; available: boolean }>, deskId: string) {
  const desk = desks.find((d) => d.deskId === deskId);
  if (!desk) throw new Error(`desk ${deskId} not found in ${JSON.stringify(desks)}`);
  return desk.available;
}
