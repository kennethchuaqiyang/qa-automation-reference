# User Stories — Desk Booking (API + UI)

A co-working space lets members search for an available desk on a given
date, book it, view their own bookings, and cancel a booking they made.
The same backend powers both a direct API and a simple web UI on top of
it — this golden pair exercises both.

## US-1: Search desk availability

As a member, I want to search for available desks on a given date
(optionally narrowed to a zone), so I can find a desk to book.

- Acceptance: results show every desk's availability for that date;
  filtering by zone returns only desks in that zone; searching without a
  date, or with a date that isn't a real date, is rejected rather than
  silently defaulting to "today" or ignoring the filter.

## US-2: Book a desk

As a member, I want to book a desk that's available on a given date, so
I have a confirmed place to work that day.

- Acceptance: booking a genuinely available desk succeeds and returns a
  confirmed booking; booking a desk someone else already has for that
  date is rejected; booking without identifying myself is rejected.

## US-3: View my bookings

As a member, I want to see my own current bookings, so I know what I've
already reserved.

- Acceptance: shows bookings I made; never shows another member's
  bookings.

## US-4: Cancel a booking

As a member who changed my plans, I want to cancel a booking I made, so
the desk frees up for someone else and I'm not shown as still booked.

- Acceptance: only the member who made a booking can cancel it;
  cancelling immediately frees the desk for anyone (including me) to
  book again; a booking for a date that has already passed cannot be
  cancelled.

## US-5: The booking grid never shows a false success

As a member browsing the desk grid, I want the page to never let my
click look like it succeeded when it didn't, so I don't walk in
expecting a desk that was actually already taken by someone else between
my page load and my click.

- Acceptance: if a desk is taken by another member in that window, my
  attempt to book it is rejected and the grid reflects the desk's real,
  current state — it never shows my own click as a successful booking
  when the backend rejected it.

## Notes

Written the way a real ticket actually arrives: enough to build against,
with real gaps left in on purpose (what exactly counts as "a date that's
already passed," whether the zone filter rejects an unknown zone or just
returns nothing, what the UI actually does when US-5's race is hit,
whether a cancelled booking can be rebooked by the same member, and so
on). Don't fill these in silently — flag them, decide them deliberately,
write the decision down, and test against it, for both the API layer and
the UI layer.
