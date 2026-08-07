# Scenario-002 — Oliver Grant — Updates & Corrections

## Test Metadata
- Date tested: 2026-08-08
- Hotel: Hotel Pilot
- Shift: AM
- Record id: 43f62bbb-df8b-4396-abd4-46e02e8e61d1
- created_at: 2026-08-07 17:42:46.724918+00
- Scenario focus: Oliver Grant arrival updates and operational corrections (rm 18)
- HF version/commit: [NOT RECORDED]
- Workspace id: 090ec1b9-2c03-41ac-a4ea-19c412f7da37
- Prepared by: Not specified
- Evidence source: `testing/pilot-hotel/exports/pilot-hotel-scenarios-001-020.csv` (Supabase saved handover; not re-generated)

## Original Input

### Today's Arrivals
Mr Oliver Grant rm 18 arriving 20:00. Guest requested twin setup pls make sure ready.
UPDATE 17:10 - Grant actually wants DOUBLE not twin, guest confirmed by phone.
UPDATE 18:45 - rm 18 has plumbing issue, Grant moved to rm 24. Room 24 confirmed double. Please do NOT send guest to 18.

VIP Sofia Laurent rm 41 ETA 22:00 repeat guest. Champagne + handwritten card requested.
UPDATE - champagne delivered to room at 18:30.
Card still at reception needs writing before arrival.

Emily Carter rm 27 Expedia prepaid arriving around 23:30. VCC showing declined earlier.
UPDATE 19:20 - Expedia VCC successfully charged, payment sorted. No further payment action needed.

Mr + Mrs Shah rm 32 anniversary, ETA 21:00. Prosecco requested pending DM approval.
UPDATE 19:45 - DM approved prosecco.
UPDATE 20:10 - F&B confirmed prosecco placed in room.

David Morgan rm 15 ETA after midnight. Requested quiet room away from lift.

### Today's Departures
rm 11 Brown late c/o requested until 14:00 - NOT approved yet.
UPDATE 18:00 - late checkout approved until 14:00, £40 charge posted.

rm 35 Taylor taxi requested 05:45 tomorrow for Heathrow.
UPDATE - taxi booked and confirmed for 05:45. Wake-up call still needs setting for 05:00.

rm 29 Green checked out around 12:00, luggage stored behind reception.
UPDATE 19:15 - guest collected luggage. Nothing outstanding.

rm 6 Williams minibar £36 outstanding after checkout.
UPDATE 20:00 - guest returned and paid minibar. Account clear.

### General Hotel / Shift Notes
rm 18 bathroom sink leaking badly. Maintenance informed 18:30. Room placed OOO. Do not allocate tonight.

Lift 1 reported making strange noise around 16:00.
UPDATE 18:15 - engineering attended and tested lift. Safe and operational. No further action unless issue repeats.

rm 44 complained AC not cooling.
Fan delivered.
UPDATE 20:30 - guest says room comfortable now but maintenance should inspect AC tomorrow.

Front door card reader failed around 17:00.
UPDATE 17:40 - batteries replaced and reader working normally.

Housekeeping reported rm 24 clean and inspected at 18:30.

Sofia Laurent flowers delivered and placed in room.

Night team pls check Sofia handwritten card before 21:30.

Tomorrow morning fire alarm contractor arriving 08:30 - reception to give access to plant room. Engineering already aware.

£100 cash deposit for rm 12 placed in safe by PM shift. Receipt issued and logged.

Earlier note said rm 18 could be sold tonight - IGNORE THIS. Room 18 is OOO due plumbing leak.

### Hotel Snapshot
Stored Hotel Snapshot values from `metrics.hotelSnapshot`:

- Sellable Rooms: 80
- OOO Rooms: 0

Snapshot fields present but blank/sparse (not invented): RevPAR, RevPAR (value).

## Expected Current Truth
- **Oliver Grant** final: **rm 24 double** (not twin; not 18). Do **not** send to 18.
- **rm 18** bathroom leak → **OOO**; do not allocate/sell tonight (ignore earlier “can sell” note).
- **Sofia Laurent** VIP **41**: champagne **in room**; flowers **in room**; **handwritten card still needed** before arrival (~22:00).
- **Emily Carter** **27**: Expedia VCC **charged — payment sorted; no further payment action**.
- **Shah** **32**: prosecco **DM approved** and **placed in room**.
- **David Morgan** **15**: after midnight; quiet/away from lift.
- **Brown** **11**: late c/o **approved** to 14:00; **£40 posted**.
- **Taylor** **35**: taxi **05:45 confirmed**; wake **05:00 still needs setting**.
- **Green** **29**: luggage **collected** — nothing outstanding.
- **Williams** **6**: minibar **paid** — account clear.
- Lift 1: tested, **safe/operational**.
- **rm 44** AC: fan delivered; guest comfortable now; inspect **tomorrow**.
- Front door reader: **fixed** (batteries).
- **rm 24** clean/inspected 18:30.
- Tomorrow 08:30 fire-alarm contractor — plant-room access.
- £100 cash deposit **rm 12** in safe, logged.

## Expected Important Actions
1. Receive Grant into **24** only; keep **18 OOO**.
2. Write Sofia card before ~21:30/arrival.
3. Set wake **05:00** for **35** (taxi already booked).
4. Do **not** chase Emily payment or Williams £36.
5. Quiet-room awareness for Morgan **15**.
6. Morning: AC inspect **44**; fire contractor access 08:30.
7. Leave resolved items (lift, reader, Green luggage, Shah prosecco, Sofia champagne/flowers) out of open work.

## Actual HF Output

Recovered from saved `generated_handover` / `recommendation_state` / `metrics` at save time. Wording below is from the historical record (not re-run).

### Output metadata
- Saved date display: Saturday, 8 August 2026
- Generated/saved timestamp (from record): 2026-08-07T17:42:45.916Z
- Checklist state: none saved / empty

### AI Summary / Today's Briefing
Priority 1
Follow up with Maintenance regarding Room 44 AC fault before further guest impact.

Priority 2
Follow up with Maintenance regarding AC fault before further guest impact.

Priority 3
Complete wake-up / transfer actions for Room 35 before departure.

Priority 4
Revenue follow-up required for Room 6 outstanding £36 before departures.

Priority 5
VIP readiness follow-up for Sofia Laurent in Room 41 — champagne.

### Organised Handover Sections
#### Urgent / Shift Alerts
_No items_

#### VIP
_No items_

#### Guest Follow-up (5)
- Room 35 – Taxi booked.
- Wake-up call booked.
- Room 11 – Late check-out confirmed for 14:00.
- Room 18 – Guest requested a room move if available to Room 24.
- Late check-out confirmed for 14:00.

#### Maintenance (7)
- Room 44 – AC not cooling. Guest unhappy.
- AC issue reported.
- Room 18 – Bathroom leak open. Maintenance has been informed.
- Room 12 – £100 cash deposit for placed in safe by PM shift. Receipt issued and logged.
- Room 15 – David Morgan ETA after midnight. Requested quiet room away from lift.
- Lift 1 reported making strange noise around 16:00.
- UPDATE 18:15 - engineering attended and tested lift. Safe and operational. No further action unless issue repeats.

#### Payments / Finance (1)
- Outstanding balance remains on the account.

#### Outstanding Tasks
_No items_

#### Events / Timeline (1)
- Card still at reception needs writing before arrival.

#### Preparations (10)
- Sofia Laurent — Room 41
- ☐ Champagne
- ☑ Flowers
- Mrs Shah — Room 32
- ☐ Mrs Shah rm 32 anniversary
- Review original note
- ☐ Champagne
- ☑ Twin setup if available
- Mr Oliver — Room 18
- ☐ Twin setup if available

#### Completed Actions (1)
- Sofia Laurent flowers delivered and placed in room.

#### Inventory
_No items_

#### Deliveries
_No items_

#### Lost Property
_No items_

#### Open Questions
_No items_

#### General / Operational Notes (11)
- Tomorrow morning fire alarm contractor arriving 08:30 - reception to give access to plant room. Engineering already aware.
- Room 18 – Earlier note said could be sold tonight - IGNORE THIS.
- Room 24 – Housekeeping reported clean and inspected at 18:30.
- Room 24 – Confirmed double. do NOT send guest to 18.
- Room 29 – Green checked out around 12:00, luggage stored behind reception.
- UPDATE 20:10 - F&B confirmed prosecco placed in room.
- UPDATE 19:45 - Duty Manager approved prosecco.
- Front door card reader failed around 17:00.
- UPDATE 17:40 - batteries replaced and reader working normally.
- Night team check Sofia handwritten card before 21:30.
- Fan delivered.

### Recommendations
1. Follow up with Maintenance regarding Room 44 AC. The fault remains open and needs resolution this shift. _(priority: urgent)_ _(owner: Maintenance)_
2. Follow up with Maintenance regarding AC. The fault remains open and needs resolution this shift. _(priority: urgent)_ _(owner: Maintenance)_
3. Follow up with Maintenance regarding Room 18 shower/leak. The fault remains open and needs resolution this shift. _(priority: high)_ _(owner: Maintenance)_
4. Complete the 05:45 wake-up call for Room 35 — follow-up still required this shift. _(priority: high)_ _(owner: Reception)_
5. Collect minibar charge £36 for Room 6 before departure. _(priority: high)_ _(owner: Reception)_
6. Prepare VIP arrival for Sofia Laurent in Room 41 — champagne. Verify room allocation before the 22:00 arrival. _(priority: high)_ _(owner: Reception)_

## Observed Positives
- General notes retain “do NOT send guest to 18”, ignore-sell instruction, Sofia card reminder, fire contractor, some update lines (lift/reader).
- Flowers captured as completed.
- Grant move / OOO plumbing appears in places.

## Observed Failures
- Briefing + recs treat **rm 44 AC as urgent this shift** (duplicate AC priorities) despite guest OK / tomorrow inspect.
- Rec: collect **£36 rm 6** — **already paid**.
- Sofia champagne still ☐ in preparations despite delivered; VIP prep rec still “champagne”.
- Grant still prepared as twin on **rm 18**; guest follow-up “requested move to 24” as if unresolved.
- Snapshot **OOO Rooms: 0** despite 18 OOO.
- Emily payment resolution missing; generic “outstanding balance remains”.
- Green luggage still narrated as stored; Shah updates left as open noise.
- Guest follow-up claims wake-up “booked” while notes say wake **still needs setting**.
- Duplicate late-c/o lines; cash deposit under Maintenance.

## Failure Tags
`source-of-truth` · `state-resolution` · `completed-as-open` · `payment-state` · `room-status` · `deduplication` · `prioritisation` · `recommendation-quality` · `hotel-snapshot` · `presentation`

## Operational Risk
**High** — Sending Grant to 18 or chasing cleared payments are real operational errors.

## Status
**Failed**

## Notes
Tester review completed from recovered CSV evidence (input vs saved HF output). Historical input/output preserved above.
