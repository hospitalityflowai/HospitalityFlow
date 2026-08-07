# Scenario-020 — Daniel Morgan Room 214 — Handover From Hell

## Test Metadata
- Date tested: 2026-08-07
- Hotel: Hotel Pilot
- Shift: AM
- Record id: 66ed6760-81b4-40fb-a277-71451074a6dd
- created_at: 2026-08-07 18:20:17.707385+00
- Scenario focus: Mixed maximum-stress / “handover from hell” (Daniel Morgan, rm 214)
- HF version/commit: [NOT RECORDED]
- Workspace id: 090ec1b9-2c03-41ac-a4ea-19c412f7da37
- Prepared by: Not specified
- Evidence source: `testing/pilot-hotel/exports/pilot-hotel-scenarios-001-020.csv` (Supabase saved handover; not re-generated)

## Original Input

### Today's Arrivals
Mr Daniel Morgan rm 214 ETA 18:30 b.com pay hotel.
Asked for quiet room away from lift + feather free bedding.

UPDATE 15:40 - Morgan moved 214 > 318 because 214 AC issue.
HK pls feather free 318.

UPDATE 17:25 HK - 318 ready, feather free done.

Mrs Emma Morgan rm 407 ETA around 21:00 Expedia prepaid.
NOT RELATED TO DANIEL MORGAN.
Anniversary stay, prosecco + card requested.

UPDATE 16:50 DM - prosecco approved.

Mr Lee rm 225 ETA 19:00.
Late note from reservations says "Lee wants twin".
There are TWO Lees arriving today.

Ms Hannah Lee rm 227 ETA 23:30.
She requested double + baby cot.

UPDATE 17:10 - twin request belongs to MR LEE 225, NOT Hannah.
HK confirmed 225 twin setup completed 17:45.

Hannah rm 227 cot still pending.

VIP Sophia Grant originally rm 402 ETA 20:00 repeat guest.
Likes high floor, away from lift, no basement.
Flowers + handwritten card.

UPDATE 16:20 - rm 402 plumbing issue. Sophia moved to 512.

UPDATE 17:30 - flowers placed in 512, card at reception.
DO NOT send anything to 402.

Mr Ahmed Khan rm 310 arriving late maybe after midnight.
Booking says 07/08 arrival but guest message says "see you tomorrow morning around 00:30".
This means tonight after midnight / early 08 Aug.
Keep reservation active.

Laura Bennett rm 119 ETA unknown. Booking.com.
Earlier note says outstanding £180.

UPDATE Accounts 18:05 - payment taken successfully. Balance £0.
NO PAYMENT CHASE REQUIRED.

### Today's Departures
rm 105 Wilson late c/o until 13:00 approved.

UPDATE 13:15 - Wilson checked out.
UPDATE HK 14:10 - room cleaned and released.
Nothing outstanding.

rm 420 David Morgan - taxi 06:00 tomorrow Heathrow T5.
IMPORTANT - this is NOT Daniel Morgan arriving rm 318.

rm 208 Mrs Lee checked out 11:30.
NOT related to either Lee arrival.
Luggage originally stored reception.

UPDATE 17:50 - luggage collected. Completed.

rm 331 Patel £65 minibar outstanding.

UPDATE 16:00 - guest disputes minibar.
DM reviewing.

UPDATE 18:10 - DM removed £65 charge. Balance now £0.
RESOLVED - do not chase payment.

rm 114 Evans requested invoice by email after departure.
Invoice sent 17:20 by reception.
COMPLETED.

### General Hotel / Shift Notes
rm 214 AC not cooling properly.
Maintenance inspected 16:00.

Engineer says compressor fault - room cannot be sold tonight.
Mark OOO.

Daniel Morgan already moved from 214 to 318 because of this.

rm 402 leak under bathroom sink.
This was Sophia Grant's ORIGINAL room only.

Maintenance attending.

UPDATE 18:20 - leak repaired but carpet still wet.
Keep room OOO tonight.
Sophia is in 512 - DO NOT move her back.

rm 512 originally had TV issue this morning.
UPDATE Maintenance 15:30 - TV fixed and tested.
RESOLVED before Sophia moved there.

rm 227 baby cot requested.
HK said at 16:00 "will do later".

UPDATE 18:30 - still NOT DONE.
Needs completing before Hannah Lee arrival approx 23:30.

Someone wrote "Lee twin still needed".
IGNORE - this refers to old note for rm 225.
Room 225 twin already completed 17:45.

rm 305 guest says shower pressure poor.
Maintenance checked - no fault found.
Guest still unhappy.
DM offered room move but guest declined.
FOLLOW UP tomorrow morning.

rm 317 reported noisy AC.
Maintenance says unit working normally.
Guest sleeping now.
No further action tonight unless guest contacts reception again.

Front door key reader failed around 14:00.
Batteries changed 14:20.
Failed again 17:00.

UPDATE 18:15 - electrician reset controller.
Currently working but MONITOR - issue has repeated twice today.

Lift 2 OUT OF SERVICE from 17:30.
Engineer ETA 21:00.
Lift 1 operating normally.
Guests with accessibility requirements should use Lift 1.

Earlier note says both lifts operational.
THAT NOTE IS OUTDATED.

Cash discrepancy £75 mentioned by AM.
Accounts checked.
£50 explained by petty cash.
£25 still unexplained.
CURRENT discrepancy = £25, not £75.

Guest rm 410 complained flowers missing.
Flowers were delivered to wrong room 401.

UPDATE 18:25 - flowers recovered unopened and delivered correctly to 410.
Guest contacted and happy.
RESOLVED.

rm 322 requested extra pillows.
HK delivered 17:00.
Completed.

Tomorrow 08/08:
Group Horizon x18 guests ETA 10:30.
Rooms unlikely ready.
Store luggage and offer lounge waiting area.
This is TOMORROW, not today's arrivals.

9 August:
Wedding group x24 rooms arriving.
Do not treat as tomorrow's operational task yet.

Manager note:
"If Sophia asks about late checkout tomorrow we can probably do 13:00 but depends occupancy."
This is NOT approved yet.

Night team:
Please confirm Ahmed Khan rm 310 arrival after midnight.
Do not no-show before checking expected arrival note.

David Morgan rm 420 taxi is 06:00 tomorrow.
Wake-up call 05:15 requested.

Maintenance engineer for Lift 2 may need master key.
Key held reception safe.

### Hotel Snapshot
Stored Hotel Snapshot values from `metrics.hotelSnapshot`:

- Arrivals: 8
- Sellable Rooms: 80
- OOO Rooms: 0

Snapshot fields present but blank/sparse (not invented): RevPAR, RevPAR (value).

## Expected Current Truth
- Daniel Morgan **FINAL 318**; feather-free **done**; **214 OOO** (AC — keep OOO; not Daniel’s room).
- Emma Morgan **407** separate (prosecco approved). Mr Lee **225** twin **done** ≠ Hannah Lee **227** cot **still pending**.
- Sophia Grant **FINAL 512** (not 402; **402 OOO** wet carpet — do not send anything there).
- Ahmed **310** after-midnight keep. Bennett **£0**. Wilson dep done.
- David Morgan **420** taxi 06:00 / wake 05:15 ≠ Daniel. Patel £65 **removed**.
- Lift **2 OOS**; reader **monitor**; cash discrepancy **£25** (not £75); flowers 410 resolved; Horizon group = **tomorrow**.

## Expected Important Actions
1. Hannah cot before ~23:30; keep **214** and **402** OOO.
2. Lift 2 OOS + master-key / Lift 1 accessibility readiness; confirm Ahmed after midnight.
3. David Morgan wake/taxi; monitor reader; record £25 discrepancy.
4. Do **not** chase Bennett/Patel; do not send Sophia to 402; do not merge Morgans/Lees.

## Actual HF Output

Recovered from saved `generated_handover` / `recommendation_state` / `metrics` at save time. Wording below is from the historical record (not re-run).

### Output metadata
- Saved date display: Friday, 7 August 2026
- Generated/saved timestamp (from record): 2026-08-07T18:20:15.918Z
- Checklist state: none saved / empty

### AI Summary / Today's Briefing
Priority 1
Follow up with Maintenance regarding Room 214 AC fault before further guest impact.

Priority 2
Timed departure actions for Room 420: taxi at 06:00.

Priority 3
Revenue follow-up required for outstanding £180 before departures.

Priority 4
VIP readiness follow-up for Sophia Grant in Room 402.

### Organised Handover Sections
#### Urgent / Shift Alerts
_No items_

#### VIP
_No items_

#### Guest Follow-up (9)
- Room 420 – Taxi booked.
- Wake-up call at 05:15.
- Late check-out noted for 13:00.
- Room 105 – Late check-out confirmed for 13:00.
- Room 322 – Extra pillows requested.
- Room 402 – Guest requested a room move if available to Room 512.
- Guest requested a room move if available.
- NOT related to either Lee arrival.
- The guest has raised a complaint.

#### Maintenance (11)
- Room 214 – AC not cooling.
- Room 317 – AC issue reported.
- AC issue reported.
- Room 305 – Shower issue open.
- Room 402 – Bathroom leak open.
- Leak open. From previous shift.
- Room 512 – TV remote not working. Guest needs a replacement.
- Likes high floor, away from lift, no basement. // Engineer says compressor fault - room cannot be sold tonight. // UPDATE 18:15 - electrician reset controller. // Lift 2 OUT OF SERVICE from 17:30. // engineer due 21:00. // Lift 1 operating normally. // Guests with accessibility requirements should use Lift 1. // Earlier note says both lifts operational.
- Room access or lock issue. Guest cannot enter reliably.
- Room access or lock issue. Guest cannot enter reliably.
- TV remote not working. Guest needs a replacement.

#### Payments / Finance (3)
- Outstanding balance of £180. remains on the account.
- Room 331 – Outstanding balance of £65 remains on the account.
- The guest's card was declined and an outstanding balance remains on the folio.

#### Outstanding Tasks
_No items_

#### Events / Timeline (7)
- Confirm before no-show before releasing the room.
- There are TWO Lees arriving today.
- Booking says 07/08 arrival but guest message says "see you tomorrow morning around 00:30".
- Keep reservation active.
- Needs completing before Hannah Lee arrival approx 23:30.
- This is TOMORROW, not today's arrivals.
- Wedding group x24 rooms arriving.

#### Preparations (18)
- Review original note
- ☐ Anniversary stay
- ☐ Card requested.
- ☐ Extra bed
- ☐ Twin setup if available
- ☐ Flowers
- Mr Lee
- ☐ Twin setup if available
- Room 227
- ☐ Extra bed
- Hannah — Room 227
- ☐ Extra bed
- Room 410
- ☐ Flowers
- Room 225
- ☑ Twin setup if available
- Room 401
- ☐ Flowers

#### Completed Actions (7)
- Room 225 – Twin already completed 17:45.
- Room 401 – Flowers were delivered to wrong.
- RESOLVED - do not chase payment.
- Housekeeping confirmed 225 twin setup completed 17:45.
- UPDATE 17:50 - luggage collected. Completed.
- COMPLETED. | Completed.
- RESOLVED.

#### Inventory
_No items_

#### Deliveries
_No items_

#### Lost Property
_No items_

#### Open Questions
_No items_

#### General / Operational Notes (46)
- Room 114 – Evans requested invoice by email after departure.
- Room 318 – IMPORTANT - this is NOT Daniel Morgan arriving.
- Room 119 – Laura Bennett ETA unknown.
- Room 208 – Mrs Lee checked out 11:30.
- Room 214 – An outstanding Booking.com payment for Mr Daniel still needs to be collected.
- Room 225 – Mr Lee ETA 19:00.
- Room 225 – IGNORE - this refers to old note for.
- Room 227 – Ms Hannah Lee ETA 23:30.
- Room 310 – Mr Ahmed Khan arriving late maybe after midnight.
- Room 310 – Confirm Ahmed Khan arrival after midnight.
- UPDATE housekeeping 14:10 - room cleaned and released.
- Keep room OOO tonight.
- This was Sophia Grant's ORIGINAL room only.
- UPDATE 18:30 - still NOT DONE.
- Duty Manager reviewing.
- Manager note.
- NOT RELATED TO DANIEL MORGAN.
- UPDATE 16:50 Duty Manager - prosecco approved.
- DO NOT send anything to 402.
- This means tonight after midnight / early 08 Aug.
- UPDATE 13:15 - Wilson checked out.
- Luggage originally stored reception.
- Mark OOO.
- Housekeeping said at 16:00 "will do later".
- FOLLOW UP tomorrow morning.
- Guest sleeping now.
- No further action tonight unless guest contacts reception again.
- Room access or lock issue. Guest cannot enter reliably.
- Batteries changed 14:20.
- Failed again 17:00.
- Currently working but MONITOR - issue has repeated twice today.
- THAT NOTE IS OUTDATED.
- Cash discrepancy £75 mentioned by AM.
- £50 explained by petty cash.
- £25 still unexplained.
- CURRENT discrepancy = £25, not £75.
- Guest contacted and happy.
- Tomorrow 08/08.
- Group Horizon x18 guests ETA 10:30.
- Rooms unlikely ready.
- Store luggage and offer lounge waiting area.
- Room 9 – August.
- Do not treat as tomorrow's operational task yet.
- This is NOT approved yet.
- Night team.
- Housekeeping delivered 17:00.

### Recommendations
1. Follow up with Maintenance regarding AC. The fault remains open and needs resolution this shift. _(priority: urgent)_ _(owner: Maintenance)_
2. Follow up with Maintenance regarding Room 214 AC. The fault remains open and needs resolution this shift. _(priority: urgent)_ _(owner: Maintenance)_
3. Follow up with Maintenance regarding Room 402 shower/leak. The fault remains open and needs resolution this shift. _(priority: high)_ _(owner: Maintenance)_
4. Complete the 06:00 wake-up call for Room 420 — follow-up still required this shift. _(priority: high)_ _(owner: Reception)_
5. Collect outstanding £180 balance before departure. _(priority: high)_ _(owner: Reception)_
6. Complete VIP in Room 402 for Sophia Grant requirements this shift. _(priority: high)_ _(owner: Reception)_

## Observed Positives
- Many separation warnings in General (not Daniel; two Lees; Ahmed midnight; £25 not £75; do not send to 402).
- 225 twin sometimes ☑; some OOO/Lift text present; luggage/Wilson completed fragments.

## Observed Failures
- Briefing: guest-impact AC **214** without “already moved / keep OOO”; VIP Sophia **402**; chase **£180**.
- Payments still £180 / £65; TV **512** reopened; twin/flowers prep noise; guest follow-up conflates Lee identities.
- Recs VIP **402** for Sophia; collect £180; reopen 214/402 faults as if in-service guest impact.
- Snapshot **OOO Rooms: 0** though 214 and 402 must stay OOO.
- Entity + supersession + severity + snapshot failures stacked — maximum-stress scenario fails on the same families.

## Failure Tags
`entity-resolution` · `source-of-truth` · `room-status` · `payment-state` · `state-resolution` · `temporal` · `prioritisation` · `recommendation-quality` · `compression` · `hotel-snapshot` · `completed-as-open`

## Operational Risk
**Critical** — Wrong VIP room, false collections, missed OOO/Lift state, identity merges under maximum noise.

## Status
**Failed**

## Notes
Tester review completed from recovered CSV evidence (input vs saved HF output). Historical input/output preserved above.
