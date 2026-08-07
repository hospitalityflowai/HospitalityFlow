# Scenario-007 — Olivia Bennett Room 33 — Room Moves & OOO

## Test Metadata
- Date tested: 2026-08-07
- Hotel: Hotel Pilot
- Shift: AM
- Record id: 4efc2695-7c92-4913-8e0b-8d60383d8b6b
- created_at: 2026-08-07 17:53:26.628005+00
- Scenario focus: Room moves / OOO / room intelligence (Olivia Bennett, rm 33)
- HF version/commit: [NOT RECORDED]
- Workspace id: 090ec1b9-2c03-41ac-a4ea-19c412f7da37
- Prepared by: Not specified
- Evidence source: `testing/pilot-hotel/exports/pilot-hotel-scenarios-001-020.csv` (Supabase saved handover; not re-generated)

## Original Input

### Today's Arrivals
VIP Olivia Bennett rm 33 ETA 21:30 repeat guest.
Guest strongly prefers high floor + quiet room.
Original allocation rm33.

UPDATE 18:30 - rm33 shower leak discovered.
Reception suggested move to rm23.
UPDATE 18:45 - DO NOT use rm23 - accessible room and guest does not require accessible room.
UPDATE 19:00 - Olivia moved to rm43.
FINAL ALLOCATION rm43.
Champagne already placed in rm43.
Welcome card still at reception needs placing.

---

David Cooper rm24 ETA around 23:00.
Booking requires TWIN.

Originally allocated rm24.
HK reported rm24 currently set double.

UPDATE 19:15 - housekeeping can convert rm24 to twin.
UPDATE 20:00 - HK CONFIRMED rm24 now set TWIN.
Keep guest rm24. No room move required.

---

Sarah Ahmed rm35 ETA 22:00.
Guest requested bathtub.

rm35 does NOT have bathtub.
PM suggested rm34.

UPDATE - rm34 currently occupied and cannot move.
rm25 available and has bathtub.
FINAL allocation changed to rm25.
Guest has NOT been informed about room number change yet.

---

Mr John Walker rm12 ETA after midnight around 00:45.
Requested quiet room away from street.

PM note says maybe move to rm11.
DO NOT MOVE - rm11 street facing.
Keep rm12 unless another suitable quiet room confirmed.
Current allocation rm12.

---

Emma Green rm31 ETA 20:30.
No special requirements.
Room ready.

---

Thomas King rm15 ETA 23:45.
Requested extra bed for child.
PM unsure whether rm15 can take extra bed.
Please verify room capability before setup.
DO NOT assume extra bed fits.

### Today's Departures
rm43 previous guest checked out 11:00.
Room cleaned and inspected 15:30.
Now allocated to VIP Olivia Bennett.

rm25 previous guest checked out 12:00.
HK confirmed room clean 16:00.
Now allocated Sarah Ahmed.

rm34 guest extended stay until tomorrow.
Room NOT available tonight.

rm21 late checkout approved until 14:00.
Guest checked out 13:50.
Room clean and available.

rm5 guest departed 09:00.
Nothing outstanding.

rm11 guest checked out earlier.
Room available but street facing.

rm2 guest departure tomorrow 08/08.
No action tonight.

### General Hotel / Shift Notes
ROOM STATUS UPDATE 20:30:

rm33 shower leak confirmed.
Maintenance inspected.
Room placed OOO until repair tomorrow.
DO NOT allocate rm33 tonight.

rm32 also has minor shower drip but room remains IN SERVICE.
Guest currently staying and okay.
Maintenance tomorrow.
Do NOT mark rm32 OOO.

rm41 AC failed around 19:00.
Engineer unable to repair tonight.
Room placed OOO.
No guest currently allocated.

rm34 occupied - extended guest.
DO NOT allocate.

rm23 available but ACCESSIBLE.
Keep available for guests requiring accessible room where possible.

rm43 clean / inspected / ready.
VIP Olivia Bennett FINAL room 43.

rm25 clean / ready.
Sarah Ahmed FINAL room 25 because bathtub requested.

rm24 confirmed TWIN by housekeeping at 20:00.
David Cooper remains rm24.

rm12 currently ready for John Walker.
Quiet room.
Do not move to rm11 because rm11 is street facing.

rm15 extra-bed capability UNKNOWN.
Need verify before Thomas King arrives 23:45.

---

IMPORTANT:
Earlier PM whiteboard still shows:
Olivia = 33
Sarah = 35
David = 24

Whiteboard is OUTDATED for Olivia and Sarah.

Latest allocations are:
Olivia Bennett = 43
Sarah Ahmed = 25
David Cooper = 24

---

Maintenance originally wrote:
"33 + 32 showers issue"

Clarification:
rm33 = OOO
rm32 = IN SERVICE / guest staying / inspect tomorrow

Do not treat both rooms the same.

---

Housekeeping message 18:00 said:
"24 still dbl"

This is OUTDATED.
20:00 confirmation says rm24 converted and READY AS TWIN.

---

Reception message:
"Maybe Walker 12 -> 11?"

This suggestion was rejected.
FINAL decision = KEEP WALKER RM12.

---

Room 41 OOO due AC.
Room 33 OOO due shower.

Total OOO tonight = 2.

rm34 is occupied, NOT OOO.

rm23 is accessible, NOT OOO.

rm32 has maintenance follow-up but is NOT OOO.

---

Olivia Bennett welcome card still needs placing in rm43 before 21:30 arrival.

Sarah Ahmed should be advised at check-in of allocation change to rm25 if needed. Do not mention maintenance details unnecessarily.

Thomas King rm15 extra-bed capability must be checked before promising setup.

Maintenance manager tomorrow:
- rm33 shower repair
- rm41 AC repair
- inspect rm32 shower drip

Do not send maintenance to rm32 during night unless leak worsens.

### Hotel Snapshot
Stored Hotel Snapshot values from `metrics.hotelSnapshot`:

- Arrivals: 30
- Departures: 8
- Rooms Available: 25
- Sellable Rooms: 80
- OOO Rooms: 0

Snapshot fields present but blank/sparse (not invented): RevPAR, RevPAR (value).

## Expected Current Truth
- Olivia **FINAL rm 43** (not 33); champagne in 43; card still at reception; **33 OOO** shower.
- Cooper **24** twin **confirmed** — stay 24, no move.
- Sarah Ahmed **FINAL 25** (bathtub); not informed yet; **35** not used.
- Walker **KEEP 12** (not 11 street-facing).
- King **15** — extra-bed capability **unknown**, verify before promise.
- Green **31** ready.
- OOO tonight = **33 + 41** only; **32** in service (drip, guest OK); **34** occupied/extended; **23** accessible available — do not use for Olivia.
- Whiteboard Olivia=33 / Sarah=35 **outdated**.

## Expected Important Actions
1. Place Olivia card in **43**.
2. Advise Sarah of **25** at check-in.
3. Verify King extra bed before promising setup.
4. Keep 33/41 OOO; do not OOO 32 or night-attend 32 unless worsens.
5. Protect accessible **23** for guests who need it.

## Actual HF Output

Recovered from saved `generated_handover` / `recommendation_state` / `metrics` at save time. Wording below is from the historical record (not re-run).

### Output metadata
- Saved date display: Friday, 7 August 2026
- Generated/saved timestamp (from record): 2026-08-07T17:54:40.493Z
- Checklist state: none saved / empty

### AI Summary / Today's Briefing
Priority 1
Follow up with Maintenance regarding Room 41 AC fault before further guest impact.

Priority 2
Follow up with Maintenance regarding Room 32 shower/leak before further guest impact.

Priority 3
Revenue follow-up required for outstanding channel payment before departures.

Priority 4
VIP readiness follow-up for Olivia Bennett in Room 33 — champagne and welcome card.

### Organised Handover Sections
#### Urgent / Shift Alerts
_No items_

#### VIP
_No items_

#### Guest Follow-up (6)
- Room 11 – Guest may request a room move if available.
- Room 21 – Late check-out confirmed for 14:00.
- Room 23 – Guest requested a room move if available.
- Room 34 – Guest requested a room move if available.
- Room 43 – Guest requested a room move if available.
- Room 2 – Guest departure tomorrow 08/08.

#### Maintenance (7)
- Room 41 – AC issue reported.
- Room 32 – Shower mixer dripping.
- Room 33 – Shower leak open.
- Maintenance inspected. | Room placed OOO until repair tomorrow. | Maintenance tomorrow. | Engineer unable to repair tonight. | Maintenance originally wrote: | Maintenance manager tomorrow.
- Room 25 – Sarah Ahmed should be advised at check-in of allocation change to if needed. Do not mention maintenance details unnecessarily.
- Maintenance follow-up is required for Room 32.
- Shower issue open.

#### Payments / Finance (1)
- Outstanding balance remains on the account.

#### Outstanding Tasks (1)
- Housekeeping message 18:00 said.

#### Events / Timeline (6)
- Room 12 – Current allocation.
- Room 25 – FINAL allocation changed to.
- Room 33 – Original allocation.
- Room 43 – FINAL ALLOCATION.
- Latest allocations are.
- Guest requested bathtub.

#### Preparations (16)
- Room 43
- ☑ Champagne
- Review original note
- ☐ Extra bed
- ☐ Welcome card
- ☐ Twin setup if available
- Room 15
- ☐ Extra bed
- Room 24
- ☐ Twin setup if available
- Please Verify
- ☐ Verify room capability before setup.
- Olivia Bennett — Room 43
- ☐ Welcome card
- Thomas King — Room 15
- ☐ Thomas King rm15 extra-bed capability must be checked before promising setup.

#### Completed Actions
_No items_

#### Inventory
_No items_

#### Deliveries
_No items_

#### Lost Property
_No items_

#### Open Questions (1)
- Room 32 Has Maintenance completed the outstanding repair?

#### General / Operational Notes (70)
- Room 25 – Sarah Ahmed FINAL because bathtub requested.
- Room 12 – Keep unless another suitable quiet room confirmed.
- Room 23 – UPDATE 18:45 - DO NOT use - accessible room and guest does not require accessible room.
- Room 24 – Keep guest. No room relocation required.
- Housekeeping confirmed room clean 16:00.
- Guest strongly prefers high floor + quiet room.
- Guest has NOT been informed about room number change yet.
- Room ready.
- Room cleaned and inspected 15:30.
- Room NOT available tonight.
- Room clean and available.
- Room available but street facing.
- ROOM STATUS UPDATE 20:30.
- Room placed OOO.
- Verify room capability before setup.
- Quiet room.
- Requested quiet room away from street.
- .
- Room 24 – David Cooper ETA around 23:00.
- Room 24 – Originally allocated.
- Room 24 – Housekeeping reported currently set double.
- Room 35 – Sarah Ahmed ETA 22:00.
- Room 35 – Does NOT have bathtub.
- Room 34 – PM suggested.
- Room 25 – Available and has bathtub.
- Room 12 – Mr John Walker ETA after midnight around 00:45.
- Room 31 – Emma Green ETA 20:30.
- No special requirements.
- Room 15 – Thomas King ETA 23:45.
- Room 43 – Previous guest checked out 11:00.
- Room 25 – Previous guest checked out 12:00.
- Now allocated Sarah Ahmed.
- Room 34 – The guest has requested to extend their stay.
- Guest checked out 13:50.
- Room 5 – Guest departed 09:00.
- Room 11 – Guest checked out earlier.
- Room 33 – DO NOT allocate tonight.
- Guest currently staying and okay.
- Room 32 – Do NOT mark OOO.
- No guest currently allocated.
- Room 34 – Occupied - extended guest.
- DO NOT allocate.
- Room 23 – Available but ACCESSIBLE.
- Room 43 – Clean / inspected / ready.
- Room 25 – Clean / ready.
- Room 24 – David Cooper remains.
- Room 12 – Currently ready for John Walker.
- Room 15 – Extra-bed capability UNKNOWN.
- Need verify before Thomas King arrives 23:45.
- IMPORTANT.
- Earlier PM whiteboard still shows.
- Olivia = 33.
- Sarah = 35.
- David = 24.
- Whiteboard is OUTDATED for Olivia and Sarah.
- Olivia Bennett = 43.
- Sarah Ahmed = 25.
- David Cooper = 24.
- Clarification.
- Room 33 – = OOO.
- Room 32 – = IN SERVICE / guest staying / inspect tomorrow.
- Do not treat both rooms the same.
- "24 still dbl".
- This is OUTDATED.
- Reception message.
- "Maybe Walker 12 -> 11?".
- This suggestion was rejected.
- Room 12 – FINAL decision = KEEP WALKER.
- Room 34 – Is occupied, NOT OOO.
- Room 23 – Is accessible, NOT OOO.

### Recommendations
1. Follow up with Maintenance regarding Room 41 AC. The fault remains open and needs resolution this shift. _(priority: urgent)_ _(owner: Maintenance)_
2. Follow up with Maintenance regarding Room 32 shower/leak. The fault remains open and needs resolution this shift. _(priority: high)_ _(owner: Maintenance)_
3. Complete VIP in Room 33 for Olivia Bennett requirements this shift. _(priority: high)_ _(owner: Reception)_
4. Prepare VIP arrival Room 43 — champagne. Verify room allocation before arrival. _(priority: high)_ _(owner: Reception)_
5. Follow up with Maintenance regarding Maintenance inspected. | Room placed OOO until…. _(priority: normal)_ _(owner: Maintenance)_
6. Follow up with Maintenance regarding Room 32 rm32 has maintenance follow up but is NOT OOO. The fault remains open and needs resolution this shift. _(priority: normal)_ _(owner: Maintenance)_

## Observed Positives
- Many final-allocation truths appear somewhere in General (43/25/24/12).
- Champagne ☑ on 43; card ☐; twin/outdated notes partially present.

## Observed Failures
- Briefing VIP readiness still **Room 33**.
- Priority 2 treats **32** as if urgent OOO-class.
- Snapshot **OOO=0**, Arrivals **30** suspect.
- Guest follow-up invents moves on 11/23/34/43.
- Cooper twin still ☐.
- Recs contradict (VIP 33 **and** 43).
- 70-line General dump without authoritative room board.
- Generic outstanding payment with no basis.

## Failure Tags
`room-status` · `source-of-truth` · `hotel-intelligence` · `state-resolution` · `prioritisation` · `compression` · `hotel-snapshot` · `recommendation-quality` · `presentation` · `deduplication`

## Operational Risk
**Critical** — Wrong VIP room (33 vs 43) + OOO/in-service confusion.

## Status
**Failed**

## Notes
Tester review completed from recovered CSV evidence (input vs saved HF output). Historical input/output preserved above.
