# User Stories — Login + Appointment Slot Picker (Patient Portal)

Feature: a patient logs in, then picks an available consultation time
slot and confirms it, from their appointment-booking page. This is the
UI only — assume the auth and booking APIs already exist behind it;
these stories are about what the patient sees and does on the page.

Written the way a ticket actually arrives: behavior and intent, no
wireframe, no element IDs, no exact copy. Deliberately leaves some of
that for us to decide while drafting test cases. Since this is the
golden reference pair, login gets full Parameter Checking treatment
(not just a precondition), same depth as the booking flow itself.

## US-1: Log in with valid credentials

As a patient, I want to log in with my email and password, so I can
reach my appointment booking page.

Acceptance criteria:
- Login form has two fields: email (username) and password.
- Submitting valid credentials takes the patient into the booking flow
  (the slot picker).

## US-2: See an error on incorrect credentials

As a patient, I want to be told clearly when my email or password is
wrong, so I know to retry rather than wonder if something broke.

Acceptance criteria:
- An incorrect email or password does not log the patient in.
- The patient sees an error message and can retry immediately.
- The error does not reveal whether the email itself exists (same
  message either way).

## US-3: Lock out after repeated failed attempts

As a patient, I want my account protected from repeated guessing, so a
third party can't just keep trying passwords against my email.

Acceptance criteria:
- After 3 consecutive unsuccessful attempts, the patient is shown a
  distinct "Login Failed" page/state — not the same inline retry error
  as attempts 1 and 2.
- The 3rd failed attempt is the trigger, whatever the mix of wrong
  email/wrong password across the 3 tries.

## US-4: View available slots

As a patient, I want to see the consultation slots available for my
selected doctor and date, so I can pick a time that works for me.

Acceptance criteria:
- Slots are shown as a list/grid of times.
- A slot that's already taken is visually distinguishable and not
  selectable.
- If there are no available slots for the chosen date, the patient sees
  that clearly instead of an empty-looking page.

## US-5: Select a slot

As a patient, I want to select one of the available times, so I can
confirm my booking in a separate, deliberate step.

Acceptance criteria:
- Clicking an available slot marks it as selected (only one at a time).
- Clicking a different available slot moves the selection to it.
- Clicking the already-selected slot deselects it.

## US-6: Confirm the booking

As a patient, I want to confirm my selected slot, so my appointment is
actually booked.

Acceptance criteria:
- A "Confirm" action is only meaningfully actionable once a slot is
  selected.
- After confirming, the patient sees a clear success state for their
  booked time.
- The confirmed slot is no longer offered to other patients (reflected
  in the slot list).

## US-7: Guard against confirming with nothing selected

As a patient, I want the page to stop me from confirming when I haven't
picked a time, so I don't end up unsure whether I booked something.

Acceptance criteria:
- Trying to confirm with no slot selected does not create a booking.
- The patient gets some indication of why nothing happened.

## US-8: Handle a slot taken by someone else while deciding

As a patient, I want to be told if my selected slot got booked by
someone else before I confirmed, so I'm not left thinking I have an
appointment I don't.

Acceptance criteria:
- If the selected slot becomes unavailable before confirmation, the
  patient is informed rather than seeing a silent failure or a false
  success.
- The slot list reflects the new state so the patient can pick another
  time.
