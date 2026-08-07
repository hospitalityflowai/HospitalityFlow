# Scenario-017 — Eleanor Grant — Urgency & Priority Ranking

## Test Metadata
- Date tested: 2026-08-07
- Hotel: Hotel Pilot
- Shift: AM
- Record id: 082f2bf2-02b1-409a-8bba-2d17fe0dd2a5
- created_at: 2026-08-07 18:10:28.283116+00
- Scenario focus: Severity / urgency / priority ranking (Eleanor Grant, rm42)
- HF version/commit: [NOT RECORDED]
- Workspace id: 090ec1b9-2c03-41ac-a4ea-19c412f7da37
- Prepared by: Not specified
- Evidence source: `testing/pilot-hotel/exports/pilot-hotel-scenarios-001-020.csv` (Supabase saved handover; not re-generated)

## Original Input

### Today's Arrivals
VIP Eleanor Grant — rm42 — ETA 00:30.
Repeat guest.

Champagne requested.
Welcome card requested.

20:00:
Welcome card placed.

20:30 F&B:
Champagne delayed — expected around 23:45.

FINAL:
Champagne outstanding before arrival.
IMPORTANT but NOT a safety emergency.


Michael Turner — rm31 — ETA 01:15.
POA £480.

Card guarantee held.
Payment should be collected at check-in.

FINAL:
£480 outstanding.
Normal arrival payment.
Do NOT classify as critical simply because amount is high.


Anna Lewis — rm24 — ETA 23:50.
Guest requested feather-free pillows.

HK confirmed pillows placed 21:00.

FINAL:
COMPLETE.
No action.


David Wong — rm18 — ETA approximately 02:00.
Guest has mobility requirements.
Accessible room confirmed.
No further setup requested.

FINAL:
Awareness only.
Do not invent accessibility actions.

### Today's Departures
Room 12 — Harris.
Wake-up call 05:00.
Taxi confirmed 05:45.

FINAL:
Wake-up is time-critical.
Night Reception owns it.


Room 16 — Brown.
£20 minibar outstanding.

Departure approximately 10:00.

FINAL:
£20 requires collection before departure.
Actionable, but NOT more urgent than immediate guest/safety issues.


Room 22 — Patel.
Departure 06:30.

Invoice email requested after checkout.

FINAL:
Reception action after checkout.
Deadline-sensitive but not currently urgent.


Room 27 — Wilson.
Late checkout approved until 14:00.

FINAL:
Awareness only.
No Night action.

### General Hotel / Shift Notes
ROOM 35 — POSSIBLE FIRE / BURNING SMELL

22:48 guest called Reception:
Strong burning smell near electrical socket.

Guest told to stop using socket.

Duty Manager informed immediately.

Maintenance has NOT inspected yet.

No visible smoke reported.

FINAL:
UNRESOLVED SAFETY ISSUE.
Requires immediate investigation/escalation.

This should rank ABOVE VIP amenities, payments and normal maintenance.


ROOM 28 — WATER LEAK

22:55:
Water actively leaking from bathroom ceiling.

Guest still in room.

HK placed towels but water continues.

Room above = rm38.

Maintenance called but has not arrived.

FINAL:
ACTIVE LEAK.
URGENT.
Potential guest/property damage.

Should rank very highly.


FRONT ENTRANCE — GUEST LOCKED OUT

23:05:
Key-card reader at main entrance failed.

One guest currently outside unable to enter.

Night Reception has manual access available.

Maintenance ticket exists for tomorrow.

FINAL:
Immediate operational action:
Let guest inside NOW.

Reader repair itself can wait until tomorrow.

HF must separate:
IMMEDIATE guest access
from
NON-URGENT technical repair.


ROOM 33 — MEDICAL REQUEST

Guest called Reception saying partner feels dizzy and has asked for assistance.

Guest is conscious and speaking.

No further information yet.

FINAL:
Immediate guest welfare follow-up required.

Do not diagnose.
Do not invent medical details.
This should rank extremely highly because guest welfare is unresolved.


ROOM 26 — AC

AC noisy but functioning.

Guest says:
“It's annoying but I'm okay tonight.”

Maintenance booked tomorrow 10:00.

FINAL:
Low urgency tonight.
Do not rank beside active leak/fire concern.


ROOM 14 — BROKEN BEDSIDE LIGHT

One bedside lamp not working.

Other lighting works normally.

Guest says tomorrow is fine.

FINAL:
Low priority.
Maintenance tomorrow.


ROOM 21 — VERY ANGRY GUEST

Guest upset because cocktail took 35 minutes.

F&B apologised.

Drink removed from bill.

Manager spoke with guest.

22:30:
Guest accepted apology and returned to room.

FINAL:
RESOLVED.
Guest sentiment important, but NO active urgent action.


ROOM 40 — £1,200 PAYMENT

Corporate balance £1,200 outstanding.

Finance already contacted company.

Payment deadline = Monday.

Today = Friday.

FINAL:
High financial value.
LOW Night-shift urgency.

Do NOT rank this above £20 if the £20 actually needs collecting before an early departure simply because £1,200 is larger.


ROOM 29 — LOST PASSPORT

Guest reports passport missing.

Last remembers having it in hotel bar.

Reception checked Lost Property — not found.

F&B checking bar/restaurant areas now.

Guest has international flight tomorrow afternoon.

FINAL:
Unresolved and important.
Needs active coordination/follow-up tonight.

High priority, but distinguish from immediate physical safety incidents.


ROOM 30 — EXTRA TOWELS

Guest requested 2 towels.

HK delivered at 22:40.

FINAL:
COMPLETE.
No action.


LIFT

Guest lift temporarily stopped at 21:00.

No guests trapped.

Engineer attended.

21:45:
Lift returned to service and tested.

FINAL:
RESOLVED.
Do NOT show as current urgent issue.


ROOM 37 — NO HOT WATER

Guest reports no hot water.

Reception checked:
Issue appears limited to rm37.

Guest offered rm41 to shower.

Guest accepted workaround but remains rm37.

Maintenance scheduled 08:00.

FINAL:
Guest has temporary solution.
Maintenance tomorrow.
Monitor, but lower priority than active leak / burning smell.


SECURITY — REAR DOOR

22:50:
Rear staff entrance found not locking correctly.

Door currently closes but can be pushed open from outside.

No alternative lock has been fitted yet.

FINAL:
ACTIVE SECURITY RISK.
Requires immediate escalation / securing solution.

Should rank alongside serious safety issues.


ROOM 15 — CHILD'S TEDDY BEAR

Family checked out this morning.

HK found child's teddy bear.

Parent called and is very upset.

Item safely stored in Lost Property.

Shipping address already received.

FINAL:
Emotionally important guest issue.
But item is SAFE and can be shipped tomorrow.

Do not rank as urgent tonight.


ROOM 25 — VIP COMPLAINT

VIP says room is slightly colder than preferred.

Portable heater offered.

Guest accepted and thanked Reception.

FINAL:
Resolved sufficiently.
VIP status must NOT automatically make this more urgent than non-VIP safety issues.


KITCHEN FRIDGE

F&B reports fridge temperature higher than expected.

Potential food-storage issue.

Chef has moved perishable food to another functioning fridge.

Faulty fridge taken out of use.

Maintenance notified.

FINAL:
Immediate food risk has been controlled.
Repair tomorrow.
Important operational awareness, but mitigation is already in place.


CASH

Reception till is £10 short.

Second count completed.
Still £10 discrepancy.

FINAL:
Needs recording/investigation.
Not an immediate operational emergency.


ROOM 19 — WAKE-UP

Wake-up requested 05:15.

FINAL:
Outstanding and time-critical.
Must not disappear simply because there are larger incidents.


ROOM 32 — MAINTENANCE

Curtain hook broken.

Guest hasn't complained.

Repair tomorrow.

FINAL:
Very low priority.

### Hotel Snapshot
Stored Hotel Snapshot values from `metrics.hotelSnapshot`:

- Departures: 6
- Sellable Rooms: 80
- OOO Rooms: 0

Snapshot fields present but blank/sparse (not invented): RevPAR, RevPAR (value).

## Expected Current Truth
**Immediate (P0):** burning smell **35** (uninspected); active leak **28**; guest locked out (let in now; reader repair tomorrow); medical assist **33**; rear door security risk.
**High tonight:** passport search **29**; wakes **12** 05:00 + **19** 05:15; Eleanor champagne before 00:30; Turner POA £480 at check-in; Brown £20 before ~10:00.
**Lower / done:** AC 26 tomorrow; lamp; angry guest resolved; lift resolved; £1,200 Monday; VIP cold resolved; teddy ship tomorrow; fridge mitigated; £10 till; curtain hook.

## Expected Important Actions
1. Investigate smell + leak + secure rear door + medical follow-up + admit locked-out guest **now**.
2. Passport coordination; set wakes; champagne before arrival.
3. Collect £20 / £480 at the correct times — **not** rank corporate £1,200 or resolved sentiment above safety.
4. Do **not** invent shower 41 as a top action or treat booked wakes as missing.

## Actual HF Output

Recovered from saved `generated_handover` / `recommendation_state` / `metrics` at save time. Wording below is from the historical record (not re-run).

### Output metadata
- Saved date display: Friday, 7 August 2026
- Generated/saved timestamp (from record): 2026-08-07T18:12:07.402Z
- Checklist state: none saved / empty

### AI Summary / Today's Briefing
Priority 1
Follow up with Maintenance regarding shower/leak before further guest impact.

Priority 2
Follow up with Maintenance regarding AC fault before further guest impact.

Priority 3
Complete wake-up / transfer actions for Room 19 before departure.

Priority 4
Revenue follow-up required for outstanding £480 before departures.

Priority 5
VIP readiness follow-up for Eleanor Grant.

### Organised Handover Sections
#### Urgent / Shift Alerts (10)
- Bathroom leak open. Needs Maintenance attendance.
- IMPORTANT but NOT a safety emergency.
- POSSIBLE FIRE / BURNING SMELL.
- Strong burning smell near electrical socket.
- No visible smoke reported.
- No guests trapped.
- Not an immediate operational emergency.
- Do NOT classify as critical simply because amount is high.
- SECURITY.
- ACTIVE SECURITY RISK.

#### VIP (1)
- VIP Eleanor Grant.

#### Guest Follow-up (14)
- Room 19 – Wake-up call booked.
- Wake-up call booked.
- Extra pillows requested.
- Late check-out confirmed for 14:00.
- Guest requested a room move if available.
- The guest has raised a complaint.
- Departure approximately 10:00.
- £20 requires collection before departure.
- Departure 06:30.
- Invoice email requested after check-out.
- Reception action after check-out.
- MEDICAL REQUEST.
- Do NOT rank this above £20 if the £20 actually needs collecting before an early departure simply because £1, 200 is larger.
- The guest has raised a complaint.

#### Maintenance (7)
- AC issue reported.
- NO HOT WATER | Guest reports no hot water.
- Room 41 – Shower issue open.
- Actionable, but NOT more urgent than immediate guest/safety issues. // No action. // Deadline-sensitive but not currently urgent. // URGENT. // One bedside lamp not working. // Other lighting works normally. // Guest sentiment important, but NO active urgent action. // Guest has international flight tomorrow afternoon. // LIFT // Guest lift temporarily stopped at 21:00. // Engineer attended. // Lift returned to service and tested. // Do NOT show as current urgent issue. // Do not rank as urgent tonight.
- Maintenance has NOT inspected yet. | Maintenance called but has not arrived. | Maintenance ticket exists for tomorrow. | Reader repair itself can wait until tomorrow. | NON-URGENT technical repair. | BROKEN BEDSIDE LIGHT | Maintenance tomorrow. | Maintenance scheduled 08:00. | Faulty fridge taken out of use. | Maintenance notified. | Repair tomorrow. | MAINTENANCE | Curtain hook broken. | Maintenance has NOT inspected yet. | Maintenance called but has not arrived. | Maintenance ticket exists for tomorrow. | Reader repair itself can wait until tomorrow. | NON-URGENT technical repair. | BROKEN BEDSIDE LIGHT | Maintenance tomorrow. | Maintenance scheduled 08:00. | Faulty fridge taken out of use. | Maintenance notified. | Repair tomorrow. | MAINTENANCE | Curtain hook broken. | Maintenance booked tomorrow 10:00.
- But item is SAFE and can be shipped tomorrow.
- Room access or lock issue. Guest cannot enter reliably.

#### Payments / Finance (1)
- Outstanding balance of £480 remains on the account.

#### Outstanding Tasks
_No items_

#### Events / Timeline (1)
- F&B checking bar/restaurant areas now.

#### Preparations (5)
- Review original note
- ☐ Champagne
- ☐ Welcome amenities
- ☐ Welcome card
- ☐ No further setup requested.

#### Completed Actions (5)
- Payment should be collected at check-in.
- COMPLETE.
- RESOLVED.
- Resolved sufficiently.
- Second count completed.

#### Inventory
_No items_

#### Deliveries
_No items_

#### Lost Property (1)
- Reception checked | Item safely stored.

#### Open Questions
_No items_

#### General / Operational Notes (126)
- Room 12.
- Room 14.
- Room 15.
- Room 16.
- Room 21.
- Room 22.
- Room 25.
- Room 26.
- Room 27.
- Room 28.
- Room 29.
- Room 30.
- Room 32.
- Room 33.
- Room 35.
- Room 37.
- Room 38 – Room above =.
- Room 40.
- Accessible room confirmed.
- Guest still in room.
- Guest accepted apology and returned to room.
- Normal arrival payment.
- UNRESOLVED SAFETY ISSUE.
- This should rank extremely highly because guest welfare is unresolved.
- Unresolved and important.
- Duty Manager informed immediately.
- Requires immediate investigation/escalation.
- Immediate operational action.
- IMMEDIATE guest access.
- Immediate guest welfare follow-up required.
- Manager spoke with guest.
- High priority, but distinguish from immediate physical safety incidents.
- Requires immediate escalation / securing solution.
- Immediate food risk has been controlled.
- Room 42 – Rm42.
- ETA 00:30.
- Repeat guest.
- 20:00.
- 20:30 F&B.
- Expected around 23:45.
- FINAL.
- Michael Turner.
- Room 31 – Rm31.
- ETA 01:15.
- POA £480.
- Card guarantee held.
- Anna Lewis.
- Room 24 – Rm24.
- ETA 23:50.
- David Wong.
- Room 18 – Rm18.
- ETA approximately 02:00.
- Guest has mobility requirements.
- Awareness only.
- Do not invent accessibility actions.
- Harris.
- Night Reception owns it.
- Brown.
- Patel.
- Wilson.
- No Night action.
- 22:48 guest called Reception.
- Guest told to stop using socket.
- 22:55.
- Potential guest/property damage.
- Should rank very highly.
- FRONT ENTRANCE.
- Room access or lock issue. Guest cannot enter reliably.
- 23:05.
- Room access or lock issue. Guest cannot enter reliably.
- One guest currently outside unable to enter.
- Night Reception has manual access available.
- Let guest inside NOW.
- HF must separate.
- From.
- Guest called Reception saying partner feels dizzy and has asked for assistance.
- Guest is conscious and speaking.
- No further information yet.
- Do not diagnose.
- Do not invent medical details.
- Guest says.
- “It's annoying but I'm okay tonight.”.
- Low urgency tonight.
- Guest says tomorrow is fine.
- Low priority.
- Guest upset because cocktail took 35 minutes.
- F&B apologised.
- Drink removed from bill.
- 22:30.
- Finance already contacted company.
- Today = Friday.
- High financial value.
- LOW Night-shift urgency.
- LOST PASSPORT.
- Guest reports passport missing.
- Last remembers having it in hotel bar.
- Not found.
- Needs active coordination/follow-up tonight.
- 21:45.
- Reception checked.
- Room 37 – Issue appears limited to.
- Room 37 – Guest accepted workaround but remains.
- Guest has temporary solution.
- REAR DOOR.
- 22:50.
- Room access or lock issue. Guest cannot enter reliably.
- Door currently closes but can be pushed open from outside.
- Should rank alongside serious safety issues.
- CHILD'S TEDDY BEAR.
- Family checked out this morning.
- Housekeeping found child's teddy bear.
- Parent called and is very upset.
- Shipping address already received.
- Portable heater offered.
- Guest accepted and thanked Reception.
- KITCHEN FRIDGE.
- F&B reports fridge temperature higher than expected.
- Potential food-storage issue.
- Important operational awareness, but mitigation is already in place.
- CASH.
- Reception till is £10 short.
- Still £10 discrepancy.
- Needs recording/investigation.
- Must not disappear simply because there are larger incidents.
- Very low priority.
- Housekeeping delivered at 22:40.

### Recommendations
1. Collect outstanding balance before departure. _(priority: urgent)_ _(owner: Reception)_
2. Follow up with Maintenance regarding hot-water issue. The fault remains open and needs resolution this shift. _(priority: urgent)_ _(owner: Maintenance)_
3. Follow up with Maintenance regarding AC. The fault remains open and needs resolution this shift. _(priority: urgent)_ _(owner: Maintenance)_
4. Complete VIP requirements this shift. _(priority: high)_ _(owner: Maintenance)_
5. Follow up with Maintenance regarding Room 41 shower/leak. The fault remains open and needs resolution this shift. _(priority: high)_ _(owner: Maintenance)_
6. Complete the 05:15 wake-up call — wake-up call not yet confirmed as loaded this shift. _(priority: high)_ _(owner: Reception)_

## Observed Positives
- Urgent section contains smell / security / medical fragments and ranking doctrine text.
- Some “let guest inside NOW” and “unresolved safety” language survives in General.
- Wake and VIP entities are at least mentioned somewhere in output.

## Observed Failures
- Briefing leads leak/AC/wake/£480/VIP — **omits** smell, medical, security, and locked-out guest as top-line priorities.
- Recs: generic collect balance + hot water/AC/VIP owned by Maintenance + invent **rm41 shower**.
- Wakes shown as “booked” while rec still demands 05:15 wake confirmation.
- Champagne ☐ despite being a timed VIP prep.
- Severity ladder collapses: safety/welfare buried in Urgent noise; money/amenity templates dominate briefing.
- Many items correctly “still open” — failure is ranking among true opens, not only supersession.

## Failure Tags
`urgency-ranking` · `prioritisation` · `maintenance-severity` · `recommendation-quality` · `compression` · `payment-state` · `completed-as-open` · `presentation` · `source-of-truth`

## Operational Risk
**Critical** — Safety/welfare under-ranked vs amenities and payments.

## Status
**Failed**

## Notes
Tester review completed from recovered CSV evidence (input vs saved HF output). Historical input/output preserved above.
