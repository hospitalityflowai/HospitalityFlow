# Scenario-013 — Sophie Turner — Temporal / Midnight Reasoning

## Test Metadata
- Date tested: 2026-08-07
- Hotel: Hotel Pilot
- Shift: AM
- Record id: 169e9730-f9a9-44ed-89ed-42d08a335b21
- created_at: 2026-08-07 18:03:45.651959+00
- Scenario focus: Dates / midnight / temporal reasoning (Sophie Turner, rm42)
- HF version/commit: [NOT RECORDED]
- Workspace id: 090ec1b9-2c03-41ac-a4ea-19c412f7da37
- Prepared by: Not specified
- Evidence source: `testing/pilot-hotel/exports/pilot-hotel-scenarios-001-020.csv` (Supabase saved handover; not re-generated)

## Original Input

### Today's Arrivals
Sophie Turner rm42
Reservation arrival date: 07/08/2026.
ETA 23:40 tonight.
VIP repeat guest.
Welcome card already placed.
No outstanding preparation.

---

Daniel Moore rm31
Reservation arrival date: 07/08/2026.
Guest emailed saying flight delayed.

LATEST ETA = 00:45 on 08/08.

IMPORTANT:
Although arrival is technically after midnight, this is tonight's outstanding arrival.
Keep reservation active for Night shift.
Do NOT move him to tomorrow's unrelated arrivals.

---

Laura Bennett rm24
Arrival date: 08/08/2026.
ETA 15:00 tomorrow afternoon.

Booking note says:
"Please prepare cot before arrival."

This is TOMORROW'S arrival.
Cot can be prepared by AM shift.
Not urgent tonight.

---

James Wilson rm18
Arrival date: 09/08/2026.
Old email dated 02/08 says:
"arriving tomorrow around 8pm."

The word "tomorrow" referred to the email date, NOT today's handover.

Current reservation arrival = 09/08.
Do NOT treat as arriving tonight or 08/08.

---

Maria Lopez rm35
Arrival date 08/08.
ETA 01:30.

Reservation is officially dated 08/08,
BUT operationally she will arrive during THIS Night shift.

Room ready.
Payment confirmed.
No preparation outstanding.

Night team needs awareness of 01:30 arrival.

---

Robert King rm27
Arrival date 08/08.
ETA 14:00 tomorrow.
Anniversary amenity required before arrival.

Prosecco NOT yet arranged.

This is a valid future preparation,
but does NOT need to be completed during Night shift.
AM shift should arrange before 14:00.

### Today's Departures
rm12 Harris
Departure date 08/08.
Wake-up call requested 05:30 tomorrow morning.

Because current shift runs overnight,
05:30 falls within THIS Night shift.

Wake-up call is OUTSTANDING and important.

---

rm16 Patel
Departure 08/08.
Taxi booked for 06:15.

Taxi CONFIRMED.
Night team needs awareness.
No booking action required.

---

rm22 Smith
Departure 07/08.
Guest already checked out at 11:00 today.

Old note:
"Late checkout until 13:00."

COMPLETED historical information.
No action tonight.

---

rm33 Taylor
Departure 08/08.
Late checkout approved until 13:00 tomorrow.

This matters for tomorrow's room planning,
but there is no action required tonight.

---

rm29 Cooper
Departure 09/08.
Old WhatsApp message from 06/08:
"Cooper leaving tomorrow."

Reservation was subsequently extended.

FINAL departure = 09/08.
Do not classify as tomorrow's departure.

---

rm8 Evans
Departure 08/08.

Taxi originally requested for "tomorrow morning 07:00"
in message sent on 06/08.

UPDATE 07/08 18:30:
Guest cancelled taxi.

FINAL:
No taxi required.

### General Hotel / Shift Notes
TEMPORAL REASONING TEST:

CURRENT HANDOVER:
Friday 7 August 2026
Night shift.

Assume Night shift covers approximately:
23:00 on 07/08
through
07:00 on 08/08.

---

ROOM 41 MAINTENANCE:

Note written 06/08:
"Engineer coming tomorrow."

That meant 07/08.

UPDATE 07/08 16:00:
Engineer attended.
AC repaired.

FINAL:
RESOLVED TODAY.
Do NOT schedule engineer for 08/08.

---

ROOM 26:

Maintenance note written 07/08 20:00:

"Engineer will return tomorrow morning around 09:00."

This means:
08/08 around 09:00.

That is AFTER Night shift.

Room remains IN SERVICE.
Guest comfortable.

Morning shift needs awareness.
Not urgent tonight.

---

ROOM 37:

Guest requested extra towels "tomorrow morning".

Request made at 23:30 on 07/08.

Meaning:
08/08 morning.

HK night team can prepare if appropriate,
but request should not be interpreted as 09/08.

---

ROOM 14:

Email received 01/08:
"We'll need a baby cot next Friday."

At the time, "next Friday" referred to 07/08.

Guest already arrived today.
Cot was placed at 18:00.

COMPLETED.
Do not create future cot task.

---

VIP ROOM 42:

Old profile note from July:
"Guest arriving tomorrow - champagne required."

This belongs to a PREVIOUS reservation.

Current stay:
Guest arriving tonight 07/08 at 23:40.
Welcome card done.
No champagne requested for this stay.

Do not reuse old temporal instruction.

---

WAKE-UP CALLS:

Room 12 — 05:30 on 08/08 — OUTSTANDING.
Room 19 — 07:30 on 08/08 — AM shift, outside Night shift.
Room 21 — 06:45 on 09/08 — future day, NOT tonight.
Room 30 — 04:45 on 07/08 — already happened this morning.

Only Room 12 falls clearly within the active Night shift.

---

TAXIS:

Room 16 — 06:15 on 08/08 — confirmed.
Room 8 — 07:00 on 08/08 — CANCELLED.
Room 25 — 05:50 on 09/08 — future, not tonight.
Room 32 — 06:00 on 07/08 — completed earlier today.

Do not reactivate cancelled or completed taxis.

---

FUTURE PREPARATIONS:

Room 27 — arrival 08/08 14:00 — anniversary prosecco outstanding.
AM shift owns this.

Room 24 — arrival 08/08 15:00 — cot required.
AM shift owns this.

Room 11 — arrival 09/08 — flowers requested.
Not relevant to tonight or tomorrow AM urgency.

Do not classify all future preparations as Night-shift priorities.

---

PAYMENT:

Room 31 Daniel Moore:
Payment on arrival.

ETA 00:45 on 08/08.

Because he arrives during current Night shift,
payment collection belongs to THIS shift.

---

IMPORTANT:

Calendar date and operational shift are NOT always the same thing.

An arrival after midnight can still belong to tonight's Night shift.

"Tomorrow" must be interpreted relative to WHEN the note was written.

Explicit reservation dates override old relative wording.

Latest confirmed dates override old dates.

Completed past events must not become future tasks.

Future tasks should be surfaced according to WHEN action is actually required.

Do not make something urgent simply because it happens on 08/08.

### Hotel Snapshot
Stored Hotel Snapshot values from `metrics.hotelSnapshot`:

- Arrivals: 8
- Departures: 8
- Sellable Rooms: 80
- OOO Rooms: 0

Snapshot fields present but blank/sparse (not invented): RevPAR, RevPAR (value).

## Expected Current Truth
Night ~23:00 07/08 → ~07:00 08/08.
- **This night:** Sophie **42** 23:40 (card done, **no champagne**); Moore **31** ETA **00:45** + **POA this shift**; Lopez **35** ETA **01:30**; Harris wake **05:30**; Patel taxi **06:15** confirmed.
- **Not night-urgent:** Bennett cot / King prosecco = **AM**; Wilson **09/08**; Cooper dep **09/08**; Evans taxi **cancelled**; Smith checkout historical; Taylor late c/o tomorrow planning only.
- **41** AC engineer note = **resolved today** (not schedule 08/08); **26** engineer return **08/08 ~09:00** after night; rm14 cot already done; old VIP champagne profile = previous stay.

## Expected Important Actions
1. Set wake **12** 05:30.
2. Collect Moore POA at ~00:45 arrival.
3. Awareness Sophie/Lopez; taxi 16 awareness.
4. Hand AM cot/prosecco.
5. Do not reactivate cancelled/completed taxis or old “tomorrow” emails.

## Actual HF Output

Recovered from saved `generated_handover` / `recommendation_state` / `metrics` at save time. Wording below is from the historical record (not re-run).

### Output metadata
- Saved date display: Friday, 7 August 2026
- Generated/saved timestamp (from record): 2026-08-07T18:05:00.044Z
- Checklist state: none saved / empty

### AI Summary / Today's Briefing
Priority 1
Follow up with Maintenance regarding Room 41 maintenance issue before further guest impact.

Priority 2
Revenue follow-up required for outstanding channel payment before departures.

Priority 3
VIP readiness follow-up for Room 42 — champagne.

### Organised Handover Sections
#### Urgent / Shift Alerts
_No items_

#### VIP
_No items_

#### Guest Follow-up (12)
- Late check-out confirmed for 13:00.
- Guest requested a room move if available.
- Departure date 08/08.
- Departure 08/08.
- Departure 07/08.
- Departure 09/08.
- Reservation was subsequently extended.
- FINAL departure = 09/08.
- Do not classify as tomorrow's departure.
- Request made at 23:30 on 07/08.
- But request should not be interpreted as 09/08.
- TAXIS.

#### Maintenance (4)
- AC issue reported.
- Room 41 – MAINTENANCE.
- Guest emailed saying flight delayed. // Not urgent tonight. // No action tonight. // but there is no action required tonight. // "Engineer coming tomorrow." // Engineer attended. // Do NOT schedule engineer for 08/08. // "Engineer will return tomorrow morning around 09:00." // Do not make something urgent simply because it happens on 08/08.
- Maintenance note written 07/08 20:00.

#### Payments / Finance (1)
- Outstanding balance remains on the account.

#### Outstanding Tasks
_No items_

#### Events / Timeline (17)
- Reservation arrival date: 07/08/2026.
- Keep reservation active for Night shift.
- Arrival date: 08/08/2026.
- This is TOMORROW'S arrival.
- Arrival date: 09/08/2026.
- "arriving tomorrow around 8pm.".
- Current reservation arrival = 09/08.
- Do NOT treat as arriving tonight or 08/08.
- Arrival date 08/08.
- Reservation is officially dated 08/08.
- Night team needs awareness of 01:30 arrival.
- This belongs to a PREVIOUS reservation.
- Guest arriving tonight 07/08 at 23:40.
- Arrival 08/08 15:00.
- Arrival 09/08.
- An arrival after midnight can still belong to tonight's Night shift.
- Explicit reservation dates override old relative wording.

#### Preparations (8)
- Review original note
- ☐ Anniversary amenity required before arrival.
- ☐ Champagne
- ☐ Anniversary prosecco outstanding.
- ☐ Extra bed
- ☑ Welcome card
- ☐ HK night team can prepare if appropriate,
- ☐ Flowers

#### Completed Actions (6)
- COMPLETED historical information.
- RESOLVED TODAY.
- COMPLETED.
- Completed earlier today.
- Do not reactivate cancelled or completed taxis.
- Completed past events must not become future tasks.

#### Inventory
_No items_

#### Deliveries
_No items_

#### Lost Property
_No items_

#### Open Questions
_No items_

#### General / Operational Notes (105)
- This matters for tomorrow's room planning.
- Room 11.
- Room 12.
- Room 12 – Only falls clearly within the active Night shift.
- Room 14.
- Room 16.
- Room 19.
- Room 21.
- Room 24.
- Room 25.
- Room 26.
- Room 27.
- Room 30.
- Room 31 – Daniel Moore.
- Room 32.
- Room 37.
- Room 8.
- Room remains IN SERVICE.
- Payment on arrival.
- Room ready.
- Room 42 – Sophie Turner.
- ETA 23:40 tonight.
- .
- Room 31 – Daniel Moore.
- LATEST ETA = 00:45 on 08/08.
- IMPORTANT.
- Room 24 – Laura Bennett.
- ETA 15:00 tomorrow afternoon.
- Booking note says.
- Room 18 – James Wilson.
- Old email dated 02/08 says.
- The word "tomorrow" referred to the email date, NOT today's handover.
- Room 35 – Maria Lopez.
- ETA 01:30.
- BUT operationally she will arrive during THIS Night shift.
- Room 27 – Robert King.
- ETA 14:00 tomorrow.
- Prosecco NOT yet arranged.
- This is a valid future preparation.
- AM shift should arrange before 14:00.
- Room 12 – Harris.
- Because current shift runs overnight.
- 05:30 falls within THIS Night shift.
- Room 16 – Patel.
- Night team needs awareness.
- No booking action required.
- Room 22 – Smith.
- Guest already checked out at 11:00 today.
- Old note.
- Room 33 – Taylor.
- Room 29 – Cooper.
- Old WhatsApp message from 06/08.
- "Cooper leaving tomorrow.".
- Room 8 – Evans.
- In message sent on 06/08.
- UPDATE 07/08 18:30.
- FINAL.
- TEMPORAL REASONING TEST.
- CURRENT HANDOVER.
- Friday 7 August 2026.
- Night shift.
- Assume Night shift covers approximately.
- 23:00 on 07/08.
- Through.
- 07:00 on 08/08. | 07:00 on 08/08.
- Note written 06/08.
- That meant 07/08.
- UPDATE 07/08 16:00.
- This means.
- 08/08 around 09:00.
- That is AFTER Night shift.
- Guest comfortable.
- Morning shift needs awareness.
- Meaning.
- 08/08 morning.
- Email received 01/08.
- At the time, "next Friday" referred to 07/08.
- Guest already arrived today.
- Old profile note from July.
- Current stay.
- Do not reuse old temporal instruction.
- 05:30 on 08/08.
- 07:30 on 08/08.
- AM shift, outside Night shift.
- 06:45 on 09/08.
- Future day, NOT tonight.
- 04:45 on 07/08.
- Already happened this morning.
- 06:15 on 08/08.
- Confirmed.
- CANCELLED.
- 05:50 on 09/08.
- Future, not tonight.
- 06:00 on 07/08.
- FUTURE PREPARATIONS.
- AM shift owns this.
- Not relevant to tonight or tomorrow AM urgency.
- Do not classify all future preparations as Night-shift priorities.
- ETA 00:45 on 08/08.
- Because he arrives during current Night shift.
- Calendar date and operational shift are NOT always the same thing.
- "Tomorrow" must be interpreted relative to WHEN the note was written.
- Latest confirmed dates override old dates.
- Future tasks should be surfaced according to WHEN action is actually required.
- But does NOT need to be completed during Night shift.

### Recommendations
1. Follow up with Maintenance regarding Room 41 MAINTENANCE:. The fault remains open and needs resolution this shift. _(priority: high)_ _(owner: Maintenance)_
2. Complete the 05:30 wake-up call — wake-up call not yet confirmed as loaded this shift. _(priority: high)_ _(owner: Reception)_
3. Collect outstanding balance before departure. _(priority: high)_ _(owner: Reception)_
4. Complete VIP Room 42 requirements this shift. Still unresolved from previous shift. _(priority: high)_ _(owner: Reception)_
5. Follow up with Maintenance regarding Maintenance note written 07/08 20:00:. The fault remains open and needs resolution this shift. _(priority: normal)_ _(owner: Maintenance)_

## Observed Positives
- Many correct temporal rules retained in General/Events.
- Welcome card ☑; some midnight-arrival framing present.

## Observed Failures
- Briefing Priority 1 reopens **41** maint; Priority 2 generic channel payment; Priority 3 VIP **champagne** (not requested this stay).
- Recs reopen maint notes, generic collect balance, “VIP unresolved”.
- Guest follow-up is date soup without executable night plan.
- Preparations load future AM amenities as night work.
- 105-line temporal essay instead of a shift timeline.

## Failure Tags
`temporal` · `source-of-truth` · `hotel-intelligence` · `state-resolution` · `prioritisation` · `recommendation-quality` · `compression` · `presentation` · `payment-state`

## Operational Risk
**High** — Missed night wake/POA risk; false champagne/maint urgency.

## Status
**Failed**

## Notes
Tester review completed from recovered CSV evidence (input vs saved HF output). Historical input/output preserved above.
