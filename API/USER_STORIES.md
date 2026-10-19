# User Stories — Event Seat Hold API

## US-1: Check seat availability
As a customer browsing an event, I want to see which seats are available,
held, or sold, so I can decide which seat to try to book.

- Acceptance: `GET /api/events/{eventId}/seats` returns every seat's
  current status; filtering by `?status=` returns only matching seats;
  an unrecognized status value is rejected rather than silently ignored.

## US-2: Place a temporary hold on a seat
As a customer, I want to hold a specific seat for a short time, so I have
a window to complete payment without losing it to someone else.

- Acceptance: holding a seat that's genuinely available succeeds and
  returns a hold with an expiry; holding a seat that's already held or
  sold is rejected; holding without identifying myself is rejected.

## US-3: Confirm a hold into a purchase
As a customer who placed a hold, I want to confirm it before it expires,
so the seat becomes mine.

- Acceptance: only the customer who created the hold can confirm it;
  confirming an expired, already-confirmed, or already-released hold is
  rejected, not silently accepted.

## US-4: Release a hold early
As a customer who changed my mind, I want to release my hold before it
expires, so the seat becomes available to others immediately instead of
staying locked until expiry.

- Acceptance: only the customer who created the hold can release it; a
  released seat is immediately available for anyone (including the same
  customer) to hold again.

## US-5: Hold expiry protects inventory
As the ticketing system, holds that aren't confirmed in time must expire
automatically, so seats don't get locked up indefinitely by abandoned
holds.

- Acceptance: an expired hold can no longer be confirmed or released;
  the seat it was holding becomes available again without manual
  intervention.
