# Scenario-001 — Amelia Hart — First Busy Stress Test

## Test Metadata
- Date tested: 2026-08-07
- Hotel: Hotel Pilot
- Shift: AM
- Record id: 02890232-dbf4-4702-b55b-583803b9dd16
- created_at: 2026-08-07 17:37:59.589525+00
- Scenario focus: First busy Pilot Hotel stress test (lead: Amelia Hart, rm 412)
- HF version/commit: [NOT RECORDED]
- Workspace id: 090ec1b9-2c03-41ac-a4ea-19c412f7da37
- Prepared by: Not specified
- Evidence source: `testing/pilot-hotel/exports/pilot-hotel-scenarios-001-020.csv` (Supabase saved handover; not re-generated)

## Original Input

### Today's Arrivals
VIP Amelia Hart rm 412 arriving around 21:30, repeat guest, likes quiet rooms away from lift. Champagne + handwritten card requested. Card not yet done pls check.
Mr Daniel Cooper rm 305 b.com prepaid arriving late maybe after midnight. Guest asked twin but booking showing double - pls check room setup before arrival.
Singh family x4 rooms 218 + 220, ETA 19:00. 220 needs sofa bed for child. They called saying train delayed now maybe 22:30.
Laura Bennett rm 107 Expedia prepaid - payment showing pending?? pls check virtual card before check in.
James Wilson rm 316 ETA unknown. Anniversary, prosecco requested but not sure if approved by DM.
2 more arrivals no special requests.

### Today's Departures
rm 204 Thompson late c/o approved until 14:00 - £35 charge still open.
rm 309 checked out but luggage behind reception until around 18:00.
rm 401 Patel taxi booked 06:15 tomorrow Heathrow T5. Wake up 05:30.
rm 115 guest left early but minibar £27.50 still showing open pls check.

### General Hotel / Shift Notes
AC rm 224 not cooling properly. Guest has fan and is okay for tonight but maintenance need look tomorrow.
Lift 2 stopped briefly around 17:40 then restarted. No guests stuck. Engineering informed but hasn't attended yet.
Housekeeping says rm 305 currently set as double - needs twin if possible before Cooper arrives.
Guest rm 327 complained noise from room above around 20:15. Spoke with upstairs guest and quiet now. pls follow up later.
Front entrance key card reader intermittent again.
Flowers for Amelia delivered and stored office.
Singh sofa bed not confirmed yet.
Night audit - pls remember Expedia VCC for Bennett.
£50 cash found lobby handed to DM safe, logged.
Tomorrow group of 12 arriving early around 11am, rooms probably won't be ready - luggage storage likely.

### Hotel Snapshot
Stored Hotel Snapshot values from `metrics.hotelSnapshot`:

- Arrivals: 0
- Departures: 0
- Stayovers: 0
- Guests In House: 0
- Rooms Sold: 0
- Rooms Available: 0
- Sellable Rooms: 80
- OOO Rooms: 0
- Occupancy: 0.0%
- Occupancy (value): 0
- ADR: £0.00
- RevPAR: £0.00
- RevPAR (value): 0

## Expected Current Truth
- **Amelia Hart** VIP **rm 412**, ETA ~21:30; quiet/away from lift; champagne + handwritten card still needed; flowers delivered to office.
- **Daniel Cooper** **rm 305**, b.com prepaid, late (possibly after midnight); wants twin; HK says still double — change before arrival.
- **Singh family** 218 + 220; ETA updated to ~22:30 (was 19:00); sofa bed for 220 **not confirmed**.
- **Laura Bennett** **rm 107**, Expedia prepaid but payment/VCC showing pending — check before check-in; night audit reminder.
- **James Wilson** **rm 316**, ETA unknown; anniversary prosecco **not confirmed DM-approved**.
- Two further arrivals with no special requests.
- **Dep 204** Thompson late c/o 14:00; **£35 still open**.
- **Dep 309** luggage at reception until ~18:00.
- **Dep 401** Patel: wake **05:30**, taxi **06:15 tomorrow** Heathrow T5.
- **Dep 115** early leave; minibar **£27.50** still open.
- **rm 224** AC poor; fan given; guest OK tonight; maintenance **tomorrow**.
- Lift 2 brief stop ~17:40; restarted; eng informed, **not attended yet**.
- Front entrance key reader intermittent.
- **rm 327** noise handled for now; follow up later.
- £50 cash logged to DM safe.
- Tomorrow: group of 12 ~11:00; rooms likely not ready → luggage storage.

## Expected Important Actions
1. Twin setup **305** before Cooper arrives.
2. Amelia: write card; champagne/flowers readiness for **412**.
3. Confirm sofa bed **220** (Singh).
4. Resolve/check Expedia VCC **107** before Bennett check-in.
5. Clarify DM approval for Wilson prosecco **316**.
6. Collect/clear **115** £27.50 and **204** £35.
7. Ensure **401** wake 05:30 + taxi 06:15 awareness for night/early team.
8. Follow up Lift 2 attendance + intermittent key reader.
9. Schedule **224** AC for tomorrow (not treat as tonight emergency unless worsens).

## Actual HF Output

Recovered from saved `generated_handover` / `recommendation_state` / `metrics` at save time. Wording below is from the historical record (not re-run).

### Output metadata
- Saved date display: Friday, 7 August 2026
- Generated/saved timestamp (from record): 2026-08-07T17:37:59.026Z
- Checklist state: none saved / empty

### AI Summary / Today's Briefing
Priority 1
Follow up with Maintenance regarding Room 224 AC fault before further guest impact.

Priority 2
Timed departure actions for Room 401: wake-up at 05:30 and taxi at 06:15.

Priority 3
Revenue follow-up required for outstanding channel payment before departures.

Priority 4
Revenue follow-up required for Room 115 outstanding £27.50 before departures.

Priority 5
VIP readiness follow-up for Amelia Hart in Room 412 — champagne and quiet upper-floor room.

### Organised Handover Sections
#### Urgent / Shift Alerts
_No items_

#### VIP
_No items_

#### Guest Follow-up (2)
- Room 401 – Wake-up call at 05:30. Taxi booked for 06:15.
- Room 204 – Late check-out confirmed for 14:00.

#### Maintenance (4)
- Room 224 – AC not cooling. Guest provided with a fan.
- Lift 2 stopped briefly around 17:40 then restarted. No guests stuck. Engineering informed but hasn't attended yet.
- Room access or lock issue. Guest cannot enter reliably.
- £50 cash found lobby handed to Duty Manager safe, logged.

#### Payments / Finance (2)
- Room 115 – A minibar charge of £27.50 requires review.
- An outstanding Expedia payment still needs to be collected.

#### Outstanding Tasks
_No items_

#### Events / Timeline (2)
- Room 2 – More arrivals no special requests.
- Tomorrow group of 12 arriving early around 11am, rooms probably won't be ready - luggage storage likely.

#### Preparations (13)
- Amelia Hart — Room 412
- ☐ Champagne
- James Wilson — Room 316
- ☑ James Wilson rm 316 ETA unknown. Anniversary
- Mr Daniel — Room 305
- ☐ Twin setup if available
- Singh Family — Room 218
- ☐ Sofa bed
- Housekeeping Says — Room 305
- ☐ Twin setup if available
- Review original note
- ☑ Sofa bed
- ☐ Flowers

#### Completed Actions
_No items_

#### Inventory
_No items_

#### Deliveries
_No items_

#### Lost Property
_No items_

#### Open Questions (3)
- Room 305 Has the outstanding balance been paid before departure?
- Room 107 Has the outstanding balance been paid before departure?
- Room 115 Has the outstanding minibar balance (£27.50) been collected?

#### General / Operational Notes (2)
- Room 327 – Guest complained noise from room above around 20:15. Spoke with upstairs guest and quiet now. follow up later.
- Room 309 – Checked out but luggage behind reception until around 18:00.

### Recommendations
1. Follow up with Maintenance regarding Room 224 AC. The fault remains open and needs resolution this shift. _(priority: urgent)_ _(owner: Maintenance)_
2. Collect outstanding Booking.com payment for Room 305 before departure. _(priority: high)_ _(owner: Reception)_
3. Collect outstanding Expedia payment for Room 107 before departure. _(priority: high)_ _(owner: Reception)_
4. Collect outstanding £27.50 balance for Room 115 before departure. _(priority: high)_ _(owner: Reception)_
5. Collect outstanding Expedia payment before departure. _(priority: high)_ _(owner: Reception)_
6. Prepare VIP arrival for Amelia Hart in Room 412 — champagne, quiet upper-floor room. Verify room allocation before arrival. _(priority: high)_ _(owner: Reception)_

## Observed Positives
- Briefing mentions Amelia VIP readiness, **401** timed actions, **115** balance, **224** AC.
- Organised output keeps **401** wake/taxi, **204** late c/o, **327** noise follow-up, **309** luggage.
- Some arrival prep structure for Amelia / Cooper / Singh appears.

## Observed Failures
- Hotel Snapshot almost all **zeros** despite a busy shift — not useful / misleading.
- Amelia not surfaced as VIP; card-not-done / flowers-in-office poorly consolidated.
- Parse error: “2 more arrivals…” → **“Room 2 – More arrivals…”**.
- Key reader → generic “Room access or lock issue” (wrong framing).
- £50 cash logged placed under **Maintenance**.
- Preparations noisy/contradictory (Cooper twin duplicated; Singh sofa bed both done and not done).
- Open questions invent “outstanding balance” for **305** (prepaid arrival) and frame **107** as pre-departure collection.
- Recs: chase b.com payment **305 before departure** (wrong); duplicate Expedia chase without room; AC pushed as **urgent this shift** vs notes (“tomorrow”, guest OK tonight).
- Laura Bennett / night-audit VCC under-emphasised vs wrong payment chases.

## Failure Tags
`hotel-snapshot` · `extraction` · `presentation` · `deduplication` · `state-resolution` · `payment-state` · `prioritisation` · `recommendation-quality` · `guest-preference`

## Operational Risk
**High** — Wrong payment actions + missed twin setup for a late arrival can cause check-in failure/guest friction.

## Status
**Failed**

## Notes
Tester review completed from recovered CSV evidence (input vs saved HF output). Historical input/output preserved above. Evidence still not fully “evidence-complete” for Failure Map aggregation until later scenarios are reviewed the same way; this file’s review fields are now populated.
