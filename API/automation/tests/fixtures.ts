import { test as base, expect, type APIRequestContext } from "@playwright/test";

export const EVENT_ID = "evt_summer_fest";

/**
 * Every test case in cases_finalized.csv starts with "Reset before row"
 * as a stated precondition (except the handful explicitly marked "none").
 * Resetting before every test, unconditionally, is simpler and safer
 * than trying to track which ones opted out.
 */
export const test = base.extend({
  request: async ({ request }, use) => {
    const resp = await request.post("/debug/reset");
    expect(resp.status(), "reset failed").toBe(200);
    await use(request);
  },
});

export { expect };

export function seatsUrl(eventId = EVENT_ID, status?: string) {
  let url = `/api/events/${eventId}/seats`;
  if (status !== undefined) url += `?status=${status}`;
  return url;
}

export function holdsUrl(eventId = EVENT_ID) {
  return `/api/events/${eventId}/holds`;
}

export function holdUrl(holdId: string) {
  return `/api/holds/${holdId}`;
}

export async function createHold(
  request: APIRequestContext,
  customerId: string,
  seatId: unknown,
  eventId = EVENT_ID,
) {
  return request.post(holdsUrl(eventId), {
    headers: customerId ? { "x-customer-id": customerId } : {},
    data: { seatId },
  });
}

export async function patchHold(
  request: APIRequestContext,
  holdId: string,
  customerId: string,
  status: unknown,
) {
  return request.patch(holdUrl(holdId), {
    headers: customerId ? { "x-customer-id": customerId } : {},
    data: { status },
  });
}

export function seatStatus(seats: Array<{ seatId: string; status: string }>, seatId: string) {
  const seat = seats.find((s) => s.seatId === seatId);
  if (!seat) throw new Error(`seat ${seatId} not found in ${JSON.stringify(seats)}`);
  return seat.status;
}
