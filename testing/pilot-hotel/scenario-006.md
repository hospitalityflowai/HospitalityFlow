# Scenario-006 — Emma Roberts — Today vs Tomorrow

## Test Metadata
- Date tested: 2026-08-07
- Hotel: Hotel Pilot
- Shift: AM
- Record id: 4e8d5e69-1c23-4d89-a0cf-7e58bc737919
- created_at: 2026-08-07 17:53:06.364795+00
- Scenario focus: Date / today-vs-tomorrow temporal reasoning (Emma Roberts, rm 21)
- HF version/commit: [NOT RECORDED]
- Workspace id: 090ec1b9-2c03-41ac-a4ea-19c412f7da37
- Prepared by: Not specified
- Evidence source: `testing/pilot-hotel/exports/pilot-hotel-scenarios-001-020.csv` (Supabase saved handover; not re-generated)

## Original Input

### Today's Arrivals
Emma Roberts rm 21 arriving TODAY 07/08 around 22:30. b.com prepaid. Quiet room requested.

Daniel Lee rm 34 booking starts 08/08. ETA 00:30 tonight after midnight. Guest considers it tonight but reservation arrival date is 8 Aug.

Samantha Jones rm 16 arriving 08/08 at 14:00. THIS IS TOMORROW'S ARRIVAL - do not treat as tonight arrival.

VIP George Miller rm 42 arriving tonight around 23:45. Repeat guest. Champagne + card requested. Both confirmed placed in room at 20:00.

Rachel Adams rm 27 reservation date 09/08. Guest emailed today asking about airport transfer. She is NOT arriving today or tomorrow.

Peter Young rm 12 was due to arrive yesterday 06/08 but never arrived. Booking currently marked no-show. Manager reviewing tomorrow.

Laura King rm 31 ETA originally 21:00 tonight.
UPDATE 20:30 - flight cancelled. Guest will now arrive TOMORROW 08/08 around 13:00. Do not expect tonight.

rm 25 Ahmed Hassan - booking arrival 07/08 but guest called saying flight delayed and expects to reach hotel approx 01:30 on 08/08. Keep room for late arrival tonight.

### Today's Departures
rm 8 Wilson departing TODAY 07/08. Late checkout approved until 14:00.
UPDATE - guest checked out at 13:45. COMPLETED.

rm 14 Brown departure date 08/08. Taxi booked for TOMORROW morning 06:00. Wake-up required 05:15 tomorrow morning.

rm 33 Chen departure 08/08. Guest asked tonight for invoice to be emailed AFTER checkout tomorrow. No action tonight except note request.

rm 19 Davis departed YESTERDAY 06/08. £45 minibar was outstanding.
UPDATE today 07/08 18:30 - payment received remotely. Account now clear.

rm 29 Taylor scheduled departure 09/08. Guest requested late checkout for Sunday. Manager has NOT approved yet. This is not tomorrow's departure.

rm 11 Evans departure TODAY 07/08.
Guest left hotel at 05:30 this morning and checked out.
Nothing outstanding.

rm 37 Patel departure 08/08 at approximately 04:30. Taxi confirmed 03:45 and wake-up still needs setting for 03:00.

### General Hotel / Shift Notes
IMPORTANT DATE CONTEXT - handover is being prepared Friday 07/08/2026 for the Night shift.

Anything after midnight belongs to calendar date 08/08, but some guests with 07/08 reservations may still be operationally considered tonight's late arrivals.

Daniel Lee rm34 has reservation arrival date 08/08 and ETA 00:30. This is technically tomorrow's booking but will arrive during this Night shift.

Ahmed Hassan rm25 reservation arrival date 07/08. ETA now 01:30 on 08/08 due delayed flight. This is still tonight's outstanding arrival from the 07/08 business date.

Laura King rm31 is NOT arriving tonight anymore. New ETA tomorrow 13:00.

George Miller rm42 preparations already completed. Do not chase champagne or card.

Tomorrow 08/08 breakfast starts 07:00.

Fire alarm contractor arrives tomorrow 08/08 at 10:00. Reception to provide access.

Wedding group arriving Sunday 09/08 around 12:00. 8 rooms. No action required tonight.

Maintenance rm24 planned for tomorrow 08/08 around 09:00. Guest currently not in room.

Room 22 AC issue reported yesterday 06/08.
UPDATE today - engineer repaired AC at 15:00. Guest confirmed working. RESOLVED.

Room 35 shower leak reported today 07/08 at 19:30. Guest okay for tonight. Maintenance needs inspection tomorrow morning 08/08.

Night audit normally runs around 02:00, which will technically be 08/08.

At 23:30 tonight remind night team to check outstanding arrivals before audit.

Wake-up rm37 must be set for 03:00 tonight/early tomorrow morning.

Wake-up rm14 must be set for 05:15 tonight/early tomorrow morning.

NOTE: do not confuse calendar date with operational Night shift. Actions between midnight and morning can still belong to this handover.

### Hotel Snapshot
Stored Hotel Snapshot values from `metrics.hotelSnapshot`:

- Arrivals: 7
- Departures: 8
- Sellable Rooms: 80
- OOO Rooms: 0

Snapshot fields present but blank/sparse (not invented): RevPAR, RevPAR (value).

## Expected Current Truth
Handover for Night of **Fri 07/08/2026**.
- **Tonight ops:** Emma Roberts **21** ~22:30 prepaid; George Miller **42** champagne+card **done**; Ahmed Hassan **25** keep for late arrival ~01:30 (07/08 booking); Daniel Lee **34** arrives ~00:30 during this night (reservation date 08/08).
- **Not tonight:** Samantha Jones **16** (08/08 14:00); Rachel Adams **27** (09/08 — transfer enquiry only); Laura King **31** now tomorrow ~13:00; wedding Sun 09/08 — no action.
- **Departs:** Wilson **8** checkout **completed**; Brown **14** taxi tomorrow 06:00, wake **05:15 still needed**; Chen **33** invoice-after-checkout note only; Davis **19** £45 **paid today — clear**; Taylor **29** late c/o Sunday — not approved, not tomorrow; Evans **11** done; Patel **37** dep ~04:30 08/08, taxi 03:45 confirmed, wake **03:00 still needed**.
- **Maint:** **22** AC **resolved**; **35** shower inspect **tomorrow**; **24** planned work tomorrow 09:00.
- Remind ~23:30 outstanding arrivals before audit (~02:00).

## Expected Important Actions
1. Set wakes **37** 03:00 and **14** 05:15.
2. Expect Emma/George/Ahmed/Daniel on this night.
3. Do **not** treat Jones/Adams/King as tonight arrivals.
4. Do **not** chase Davis £45 or reopen resolved AC 22.
5. Note shower 35 / contractor 10:00 for morning.

## Actual HF Output

Recovered from saved `generated_handover` / `recommendation_state` / `metrics` at save time. Wording below is from the historical record (not re-run).

### Output metadata
- Saved date display: Friday, 7 August 2026
- Generated/saved timestamp (from record): 2026-08-07T17:53:05.964Z
- Checklist state: none saved / empty

### AI Summary / Today's Briefing
Priority 1
Follow up with Maintenance regarding Room 22 AC fault before further guest impact.

Priority 2
Follow up with Maintenance regarding Room 24 maintenance issue before further guest impact.

Priority 3
Complete wake-up / transfer actions for Room 14 before departure.

Priority 4
Revenue follow-up required for Room 19 outstanding £45 before departures.

Priority 5
Complete outstanding guest follow-up for Room 29.

### Organised Handover Sections
#### Urgent / Shift Alerts (1)
- Fire alarm contractor arrives tomorrow 08/08 at 10:00. Reception to provide access.

#### VIP
_No items_

#### Guest Follow-up (6)
- Room 14 – Guest departing this morning. Wake-up call booked.
- Room 27 – Taxi booked.
- Room 37 – Guest departing this morning. Wake-up call booked.
- Room 29 – Late check-out confirmed.
- Room 8 – Late check-out confirmed for 14:00.
- Tomorrow 08/08 breakfast starts 07:00.

#### Maintenance (7)
- Room 22 – AC issue reported.
- Room 24 – Maintenance planned for tomorrow 08/08 around 09:00. Guest currently not in room.
- Room 35 – Shower leak open.
- Room 33 – Chen departure 08/08. Guest asked tonight for invoice to be emailed AFTER check-out tomorrow. No action tonight except note request.
- UPDATE 20:30 - flight cancelled. Guest will now arrive TOMORROW 08/08 around 13:00. Do not expect tonight. // Wedding group arriving Sunday 09/08 around 12:00. 8 rooms. No action required tonight.
- Room 25 – Ahmed Hassan - booking arrival 07/08 but guest called saying flight delayed and expects to reach hotel approx 01:30 on 08/08. Keep room for late arrival tonight.
- AC issue reported.

#### Payments / Finance (3)
- Room 19 – Outstanding balance of £45 remains on the account.
- Room 25 – Outstanding balance remains on the account.
- Outstanding balance remains on the account before departure.

#### Outstanding Tasks
_No items_

#### Events / Timeline (4)
- Confirm Peter Young Room 12 no-show before releasing the room.
- Anything after midnight belongs to calendar date 08/08, but some guests with 07/08 reservations may still be operationally considered tonight's late arrivals.
- Room 34 – Daniel Lee has reservation arrival date 08/08 and ETA 00:30. This is technically tomorrow's booking but will arrive during this Night shift.
- Room 31 – Laura King is NOT arriving tonight anymore.

#### Preparations (4)
- George Miller — Room 42
- ☑ Champagne
- Review original note
- ☑ IMPORTANT DATE CONTEXT - handover is being prepared Friday 07

#### Completed Actions (1)
- UPDATE - guest checked out at 13:45. COMPLETED.

#### Inventory
_No items_

#### Deliveries
_No items_

#### Lost Property
_No items_

#### Open Questions
_No items_

#### General / Operational Notes (9)
- Room 11 – Evans departure TODAY 07/08.
- Room 16 – Samantha Jones arriving 08/08 at 14:00. THIS IS TOMORROW'S ARRIVAL - do not treat as tonight arrival.
- Room 21 – Emma Roberts arriving TODAY 07/08 around 22:30.
- Room 31 – Laura King ETA originally 21:00 tonight.
- Room 34 – Daniel Lee booking starts 08/08. ETA 00:30 tonight after midnight. Guest considers it tonight but reservation arrival date is 8 Aug.
- Guest left hotel at 05:30 this morning and checked out.
- New ETA tomorrow 13:00.
- Night audit normally runs around 02:00, which will technically be 08/08.
- NOTE: do not confuse calendar date with operational Night shift. Actions between midnight and morning can still belong to this handover.

### Recommendations
1. Follow up with Maintenance regarding Room 22 AC. The fault remains open and needs resolution this shift. _(priority: urgent)_ _(owner: Maintenance)_
2. Follow up with Maintenance regarding Room 35 shower/leak. The fault remains open and needs resolution this shift. _(priority: high)_ _(owner: Maintenance)_
3. Follow up with Maintenance regarding Room 24 Maintenance rm24 planned for tomorrow 08/08 around…. The fault remains open and needs resolution this shift. _(priority: high)_ _(owner: Maintenance)_
4. Complete the 03:00 wake-up call for Room 37 — wake-up call not yet confirmed as loaded this shift. _(priority: high)_ _(owner: Reception)_
5. Complete the 05:15 wake-up call for Room 14 — wake-up call not yet confirmed as loaded this shift. _(priority: high)_ _(owner: Reception)_
6. Collect outstanding balance for Room 25 before departure. _(priority: high)_ _(owner: Maintenance)_

## Observed Positives
- Some date-context notes retained (Daniel Lee / Laura King / Samantha Jones).
- George champagne marked done.
- Wake recs for 14/37 appear.

## Observed Failures
- Briefing Priority 1 = **rm 22 AC** though **RESOLVED**.
- Priority 4 chase **£45 rm 19** though **paid**.
- Guest follow-up says **14/37 “departing this morning”** + wake “booked” while wakes still needed and deps are tomorrow morning.
- Late c/o **29** shown confirmed though **not approved**.
- Fire contractor in Urgent; Laura King flight update dumped into Maintenance.
- Rec chase balance **25** (arrival keep-room, wrong owner Maintenance).
- Emma/George under-ranked vs false maint/payment.

## Failure Tags
`temporal` · `source-of-truth` · `state-resolution` · `completed-as-open` · `payment-state` · `prioritisation` · `recommendation-quality` · `presentation` · `deduplication`

## Operational Risk
**High** — Wrong calendar framing + chasing cleared balances; missed true night arrivals hierarchy.

## Status
**Failed**

## Notes
Tester review completed from recovered CSV evidence (input vs saved HF output). Historical input/output preserved above.
