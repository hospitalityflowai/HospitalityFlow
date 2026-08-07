# Scenario-011 — Sarah Mitchell — Latest Truth & Contradictions

## Test Metadata
- Date tested: 2026-08-07
- Hotel: Hotel Pilot
- Shift: AM
- Record id: c349344c-dcea-46d1-a56a-d86b48250f77
- created_at: 2026-08-07 18:00:57.573476+00
- Scenario focus: Latest truth / contradictory updates (Sarah Mitchell, rm42)
- HF version/commit: [NOT RECORDED]
- Workspace id: 090ec1b9-2c03-41ac-a4ea-19c412f7da37
- Prepared by: Not specified
- Evidence source: `testing/pilot-hotel/exports/pilot-hotel-scenarios-001-020.csv` (Supabase saved handover; not re-generated)

## Original Input

### Today's Arrivals
VIP Sarah Mitchell rm42 ETA originally 18:00.
Requested champagne + handwritten card.
Quiet room away from lift.

UPDATE 18:30 - flight delayed, new ETA 23:45.

UPDATE 20:10 - champagne placed + card written. DONE.

UPDATE 21:00 - guest called again, now arriving approx 01:00.

FINAL:
Sarah remains rm42.
ETA approx 01:00.
Champagne + card DONE.
No preparation outstanding.

---

Daniel Cooper originally rm18 ETA 22:00.
Guest requested twin setup.

18:15 - HK said rm18 cannot be twinned.
Guest temporarily moved to rm24.

19:05 - maintenance advised rm24 AC issue.

19:30 - allocation changed again to rm31.

20:00 - HK confirmed rm31 set as TWIN.

FINAL ROOM = 31.
Twin setup DONE.
Do NOT use rm18 or rm24 for Cooper.

---

Emily Roberts rm27 ETA 21:30.
Booking.com prepaid.

18:00 note said payment not received - pls check.

UPDATE 20:15:
Booking.com VCC successfully charged.
FULLY PAID.

FINAL:
No payment outstanding.
Do not chase payment.

---

James Parker originally arriving tonight rm15.
ETA 23:00.

UPDATE 19:40:
Guest CANCELLED reservation.
Cancellation processed.
Room released.

FINAL:
James Parker is NOT arriving.
Do not include as outstanding arrival.

---

Mr & Mrs Wong originally rm35 ETA 20:00.
Anniversary stay.
Prosecco requested.

UPDATE 18:45:
Room changed to rm33 because rm35 heating issue.

UPDATE 19:15:
Prosecco moved to rm33.

UPDATE 20:30:
Guests ARRIVED and CHECKED IN rm33.

FINAL:
Already in-house rm33.
Prosecco DONE.
Not an outstanding arrival.

### Today's Departures
rm12 Lewis originally late checkout until 14:00.

UPDATE 11:45:
Guest checked out early.
Room inspected and released.

FINAL:
Checked out.
No late checkout action.

---

rm22 Khan had £75 outstanding balance.

UPDATE 16:20:
Guest paid £75 by card.
Receipt emailed.

FINAL BALANCE = £0.
No payment action.

---

rm16 Taylor taxi originally booked 06:30 tomorrow.

UPDATE 19:10:
Guest cancelled taxi.

UPDATE 20:00:
Guest requested NEW taxi for 07:15.

UPDATE 20:20:
07:15 taxi confirmed.

FINAL:
Taxi 07:15 confirmed.
Do not mention 06:30.
No booking action required.

---

rm29 Johnson requested luggage storage after checkout until 18:00.

UPDATE:
Guest collected luggage 17:40.

FINAL:
Completed.
No outstanding luggage task.

---

rm8 Ahmed originally departing tomorrow.

UPDATE 21:10:
Guest extended stay by 2 nights.

FINAL:
NOT departing tomorrow.
New departure 10 August.

### General Hotel / Shift Notes
LATEST-TRUTH TEST:

ROOM 24:

17:00 - AC making loud noise.
17:20 - maintenance called.
18:00 - engineer inspecting.
18:30 - engineer thought room may need to go OOO.
19:00 - temporary repair completed.
19:30 - AC tested for 30 mins, working.
20:15 - engineer confirmed ROOM CAN REMAIN IN SERVICE.

FINAL:
Room 24 is IN SERVICE.
No current AC fault.
Do not mark OOO.
Monitor only if issue returns.

---

ROOM 35:

17:30 - guest complained room cold.
18:00 - maintenance investigating.
18:20 - heating confirmed failed.
Room temporarily marked OOO.

19:30 - engineer repaired heating.
20:00 - room temperature normal.
20:30 - engineering confirmed repair successful.

FINAL:
Room 35 back IN SERVICE.
NOT OOO.
No maintenance action tonight.

---

ROOM 41:

18:00 - bathroom sink leaking.
18:30 - maintenance attended.
19:00 - leak repaired.
19:20 - HK cleaned bathroom.
20:00 - room inspected.

FINAL:
RESOLVED.
Room ready for sale.
No follow-up required.

---

ROOM 14:

Earlier note:
"Safe not working - maintenance needed."

UPDATE 19:15:
Battery replaced.
Safe tested with duty manager.
Working normally.

FINAL:
RESOLVED.
No maintenance task.

---

ROOM 26:

18:10 - TV not working.
18:40 - engineer unable to fix.
Replacement TV required tomorrow.

FINAL:
Current unresolved issue.
Room occupied.
Guest aware and accepted situation.
Maintenance follow-up TOMORROW.
Not urgent tonight.

---

ROOM 32:

Earlier:
"Shower blocked - guest unhappy."

19:00 maintenance attended.
19:30 drain cleared.
20:00 guest confirmed shower working.

FINAL:
RESOLVED.
Guest satisfied.
No follow-up requested.

---

HOUSEKEEPING:

18:00:
rm31 twin setup still required.

20:00:
rm31 twin setup completed for Daniel Cooper.

FINAL = DONE.

---

PAYMENTS:

OLD:
rm27 Booking.com payment outstanding.

FINAL:
rm27 PAID IN FULL at 20:15.

OLD:
rm22 £75 outstanding.

FINAL:
rm22 PAID at 16:20.

OLD:
rm19 Expedia VCC pending.

UPDATE 21:00:
VCC successfully charged.

FINAL:
rm19 PAID.
No outstanding OTA payments from these three rooms.

---

STAFFING:

18:00:
Night receptionist Alex called sick.
Need cover urgently.

19:00:
Maria agreed to cover Night shift.

20:30:
Maria arrived and is working.

FINAL:
Night shift COVERED.
No staffing action.

---

VIP SARAH MITCHELL:

Old ETA 18:00.
Then 23:45.
LATEST ETA approx 01:00.

Champagne DONE.
Card DONE.
Room 42 ready.

Only useful current information:
VIP arriving approx 01:00, Room 42 ready.

---

IMPORTANT:

Where information conflicts, use the LATEST CONFIRMED update.

Completed tasks should not remain outstanding.

Resolved faults should not become maintenance recommendations.

Cancelled arrangements should disappear when replaced.

Old room allocations should not survive after a confirmed room move.

Paid balances must not generate collection actions.

Do not turn "was OOO" into "currently OOO".

Do not turn "maintenance attended" into an outstanding maintenance task if the final state says resolved.

### Hotel Snapshot
Stored Hotel Snapshot values from `metrics.hotelSnapshot`:

- Departures: 10
- Sellable Rooms: 80
- OOO Rooms: 0

Snapshot fields present but blank/sparse (not invented): RevPAR, RevPAR (value).

## Expected Current Truth
- Sarah **42**: ETA **~01:00**; champagne + card **DONE**; no prep outstanding.
- Cooper **FINAL 31** twin **DONE**; do not use 18/24.
- Emily **27** / Khan **22** / rm19: **PAID** — no chase.
- Parker **cancelled** — not an arrival.
- Wongs **in-house 33**, prosecco done.
- Lewis **12** already checked out (no late c/o action).
- Taylor taxi **07:15** only (not 06:30).
- Johnson luggage **collected**.
- Ahmed **extended** — not departing tomorrow.
- **24** AC **in service** (monitor only); **35** heating **in service**; **41** leak **resolved**; **14** safe **resolved**; **32** shower **resolved**; **26** TV follow-up **tomorrow** (guest accepted).
- Night cover **Maria working** — staffing resolved.

## Expected Important Actions
1. Expect Sarah ~01:00 (room ready; no prep chase).
2. Check in Cooper to **31** only.
3. Taylor taxi awareness **07:15**.
4. TV **26** morning follow-up only.
5. Do **not** chase paid balances, reopen resolved maint, treat Parker as arriving, or reopen late c/o/luggage.

## Actual HF Output

Recovered from saved `generated_handover` / `recommendation_state` / `metrics` at save time. Wording below is from the historical record (not re-run).

### Output metadata
- Saved date display: Friday, 7 August 2026
- Generated/saved timestamp (from record): 2026-08-07T18:02:00.308Z
- Checklist state: none saved / empty

### AI Summary / Today's Briefing
Priority 1
Follow up with Maintenance regarding Room 24 AC fault before further guest impact.

Priority 2
Complete wake-up / transfer actions for Room 16 before departure.

Priority 3
Revenue follow-up required for outstanding channel payment before departures.

Priority 4
VIP readiness follow-up for Room 42.

Priority 5
Complete outstanding guest follow-up for Room 12.

### Organised Handover Sections
#### Urgent / Shift Alerts
_No items_

#### VIP (1)
- VIP SARAH MITCHELL.

#### Guest Follow-up (11)
- Room 16 – Taxi booked.
- Taxi booked for 07:15.
- Room 12 – Late check-out noted for 14:00.
- Room 24 – Guest requested a room move if available.
- Room 33 – Guest requested a room move if available.
- Late check-out noted.
- Room 29 – Johnson requested luggage storage after check-out until 18:00.
- Room 8 – Ahmed originally departing tomorrow.
- NOT departing tomorrow.
- New departure 10 August.
- No follow-up requested.

#### Maintenance (9)
- Room 24 – AC issue reported. Maintenance has been informed. Follow up next shift until resolved.
- AC issue reported.
- Rooms 33, 35 – Heating issue reported.
- Heating issue reported.
- Shower leak open.
- TV remote not working. Guest needs a replacement.
- Quiet room away from lift. // UPDATE 18:30 - flight delayed, new ETA 23:45. // 18:00 - engineer inspecting. // 18:30 - engineer thought room may need to go OOO. // 20:15 - engineer confirmed ROOM CAN REMAIN IN SERVICE. // 18:40 - engineer unable to fix. // Not urgent tonight. // Need cover urgently. // 19:30 drain cleared.
- 17:20 - maintenance called. | 18:00 - maintenance investigating. | No maintenance action tonight. | 18:30 - maintenance attended. | No maintenance task. | Maintenance follow-up TOMORROW. | 19:00 maintenance attended. | 17:20 - maintenance called. | 18:00 - maintenance investigating. | No maintenance action tonight. | 18:30 - maintenance attended. | No maintenance task. | Maintenance follow-up TOMORROW. | 19:00 maintenance attended. | 20:30 - engineering confirmed repair successful.
- "Safe not working - maintenance needed." | Safe tested with duty manager.

#### Payments / Finance (4)
- Room 19 – An outstanding Expedia payment still needs to be collected. Please follow up during this shift.
- Room 22 – Outstanding balance of £75 remains on the account.
- Room 27 – Outstanding balance remains on the account.
- Outstanding balance of £0. remains on the account.

#### Outstanding Tasks (1)
- HOUSEKEEPING.

#### Events / Timeline (7)
- Room 31 – 30 - allocation changed again to.
- Old room allocations should not survive after a confirmed room relocation.
- UPDATE 21:00 - guest called again, now arriving approx 01:00.
- Room 15 – James Parker originally arriving tonight.
- Guest CANCELLED reservation.
- James Parker is NOT arriving.
- Prosecco requested.

#### Preparations (8)
- Review original note
- ☐ Anniversary stay.
- ☑ Champagne
- ☐ Twin setup if available
- Room 31
- ☑ Twin setup if available
- Daniel Cooper — Room 31
- ☑ Twin setup if available

#### Completed Actions (7)
- Room 31 – Twin setup completed for Daniel Cooper.
- Twin setup DONE.
- Prosecco DONE.
- Completed.
- RESOLVED.
- FINAL = DONE.
- Card DONE.

#### Inventory
_No items_

#### Deliveries
_No items_

#### Lost Property
_No items_

#### Open Questions
_No items_

#### General / Operational Notes (87)
- No heating / room cold. Guest comfort affected.
- Room 14.
- Room 24.
- Room 24 – Is IN SERVICE.
- Room 26.
- Room 32.
- Room 35.
- Room 35 – Back IN SERVICE.
- Room 41.
- Room 42 – Ready.
- FINAL ROOM = 31.
- 20:00 - room inspected.
- Room ready for sale.
- Room occupied.
- Room released.
- Room inspected and released.
- Room temporarily marked OOO.
- 20:00 - room temperature normal.
- Current unresolved issue.
- FINAL.
- Room 42 – Sarah remains.
- ETA approx 01:00.
- .
- Room 18 – Daniel Cooper originally ETA 22:00.
- Room 18 – 15 - housekeeping said cannot be twinned.
- Rooms 18, 24 – Do NOT use rm18 or rm24 for Cooper.
- Room 27 – Emily Roberts ETA 21:30.
- UPDATE 20:15.
- ETA 23:00.
- UPDATE 19:40.
- Cancellation processed.
- Room 35 – Mr & Mrs Wong originally ETA 20:00.
- UPDATE 18:45.
- UPDATE 19:15.
- UPDATE 20:30.
- Room 33 – Guests ARRIVED and CHECKED IN.
- Room 33 – Already in-house.
- UPDATE 11:45.
- Guest checked out early.
- Checked out.
- UPDATE 16:20.
- Receipt emailed.
- UPDATE 19:10.
- UPDATE 20:00.
- UPDATE 20:20.
- Do not mention 06:30.
- No booking action required.
- UPDATE.
- UPDATE 21:10.
- The guest has requested a 2-night stay extension.
- LATEST-TRUTH TEST.
- Do not mark OOO.
- Monitor only if issue returns.
- NOT OOO.
- No follow-up required.
- Earlier note.
- Battery replaced.
- Working normally.
- Guest aware and accepted situation.
- Earlier.
- Guest satisfied.
- 18:00.
- 20:00.
- OLD.
- UPDATE 21:00.
- STAFFING.
- Night receptionist Alex called sick.
- 19:00.
- Maria agreed to cover Night shift.
- 20:30.
- Maria arrived and is working.
- Night shift COVERED.
- No staffing action.
- Old ETA 18:00.
- Then 23:45.
- LATEST ETA approx 01:00.
- Only useful current information.
- IMPORTANT.
- Where information conflicts, use the LATEST CONFIRMED update.
- Cancelled arrangements should disappear when replaced.
- Do not turn "was OOO" into "currently OOO".
- FULLY PAID.
- Guest collected luggage 17:40.
- Room 27 – PAID IN FULL at 20:15.
- Room 22 – PAID at 16:20.
- Room 19 – PAID.
- Outstanding balance remains on the account.

### Recommendations
1. Follow up with Maintenance regarding Room 24 AC. The fault remains open and needs resolution this shift. _(priority: urgent)_ _(owner: Maintenance)_
2. Follow up with Maintenance regarding AC. The fault remains open and needs resolution this shift. _(priority: urgent)_ _(owner: Maintenance)_
3. Follow up with Maintenance regarding Room 33 Rooms 33 and 35 heating fault. The fault remains open and needs resolution this shift. _(priority: high)_ _(owner: Maintenance)_
4. Collect outstanding Booking.com payment £0 before departure. _(priority: high)_ _(owner: Reception)_
5. Collect outstanding £75 balance for Room 22 before departure. _(priority: high)_ _(owner: Reception)_
6. Complete VIP Room 42 preparation for Sarah Mitchell before arrival. Still unresolved from previous shift. _(priority: high)_ _(owner: Reception)_

## Observed Positives
- Many FINAL truths appear in General (01:00, paid rooms, Cooper 31, Parker cancelled, staffing covered).
- Some completed twin/prosecco/card fragments.

## Observed Failures
- Briefing Priority 1 = **24 AC open** though in service; Priority 3 channel payment; Priority 5 late c/o **12**.
- Payments still show **19/22/27 outstanding** (+ absurd “£0 remains outstanding”).
- Recs reopen AC/heating, collect £75 **22**, “collect £0”, VIP prep still unresolved.
- Guest follow-up keeps luggage/late c/o/old moves.
- 87-line dump — fails the scenario’s own latest-truth rules.

## Failure Tags
`source-of-truth` · `state-resolution` · `completed-as-open` · `payment-state` · `room-status` · `prioritisation` · `recommendation-quality` · `compression` · `deduplication` · `presentation`

## Operational Risk
**Critical** — Systematic revival of superseded states as current actions.

## Status
**Failed**

## Notes
Tester review completed from recovered CSV evidence (input vs saved HF output). Historical input/output preserved above.
