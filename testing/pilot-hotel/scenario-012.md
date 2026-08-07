# Scenario-012 — Olivia Bennett Room 42 — Multi-Source Noise

## Test Metadata
- Date tested: 2026-08-07
- Hotel: Hotel Pilot
- Shift: AM
- Record id: 0238aa89-bf43-461c-b81b-338c23502b24
- created_at: 2026-08-07 18:02:22.363627+00
- Scenario focus: Multiple sources / departments / duplicate noise (Olivia Bennett, rm42, ETA 23:30)
- HF version/commit: [NOT RECORDED]
- Workspace id: 090ec1b9-2c03-41ac-a4ea-19c412f7da37
- Prepared by: Not specified
- Evidence source: `testing/pilot-hotel/exports/pilot-hotel-scenarios-001-020.csv` (Supabase saved handover; not re-generated)

## Original Input

### Today's Arrivals
VIP Olivia Bennett rm42 ETA 23:30.
Repeat guest, quiet room requested.
Champagne requested.

Reception 17:20:
Champagne still needs arranging.

Housekeeping 19:10:
rm42 ready. Extra towels placed.

DM update 20:45:
Champagne delivered to rm42 and welcome card placed.
FINAL: preparations complete.

---

Mr Thomas Green rm31 ETA around 00:30.
Booking says TWIN requested.

Reception:
rm31 currently showing double setup - pls check.

HK 18:30:
31 changed to twin.

HK WhatsApp 18:42:
"31 twin done"

FINAL:
Room 31 twin setup COMPLETE.
Do not create another twin task.

---

Maria Garcia rm24 ETA 22:00.
Expedia prepaid.

Reception 17:00:
VCC not going through - £180 outstanding??

Night audit note 19:30:
Retry Expedia VCC after 20:00.

Finance 20:15:
VCC successfully charged £180.

DM 20:30:
Garcia fully paid, no balance.

FINAL BALANCE = £0.
Do NOT ask guest for payment.
Do NOT retry VCC.

---

James & Lucy Hall originally rm35 ETA 21:30.

Reception:
rm35 allocated.

Maintenance 18:00:
rm35 heating fault - may need move.

HK 18:20:
rm35 clean and ready.

DM 19:00:
MOVE HALLS TO RM33.

Reception 19:15:
rm33 allocated.

HK 19:45:
rm33 ready.

FINAL ROOM = 33.
Do not send guests to rm35.

---

Daniel Smith rm18 ETA 23:00.

Booking note:
Needs baby cot.

HK 18:00:
Cot still needed rm18.

HK 19:15:
Cot delivered.

Reception 20:00:
"pls confirm cot?"

DM 20:10:
Checked rm18 personally - cot is there.

FINAL:
Cot COMPLETE.
No action.

### Today's Departures
rm12 Wilson late checkout.

Reception says:
late c/o 13:00.

Guest message:
"Thank you for allowing us until 2pm."

DM update 10:30:
Late checkout approved until 14:00.

FINAL = 14:00.

---

rm21 Patel balance.

Reception 09:00:
£45 minibar outstanding.

Finance 12:15:
Guest paid minibar £45.

Reception WhatsApp 12:30:
"21 minibar paid"

FINAL BALANCE = £0.

---

rm27 Lewis taxi.

Reception:
Taxi 06:45 tomorrow.

Concierge:
Car moved to 07:00.

Guest called 19:30:
Please make it 07:30 instead.

Concierge 19:45:
07:30 confirmed with driver.

FINAL TAXI = 07:30 CONFIRMED.
Old times are obsolete.

---

rm8 Cooper luggage storage after checkout.

Reception:
bags behind desk until 18:00.

PM shift:
Guest collected bags around 17:35.

FINAL:
Completed.
No luggage action.

---

rm14 Brown originally departing tomorrow.

Reservations 18:00:
Guest extended until 9 August.

PMS updated.

FINAL:
Not departing tomorrow.

### General Hotel / Shift Notes
MULTI-SOURCE NOTES:

ROOM 26:

HK 16:30:
"26 shower blocked again."

Reception 16:45:
Guest complained water draining slowly.

Maintenance 17:20:
Attended rm26, cleared drain.

Reception 18:00:
Guest says shower now fine.

Maintenance 18:10:
Tested again - draining normally.

DM 18:30:
RESOLVED. No follow-up unless returns.

FINAL:
Room 26 IN SERVICE.
No current maintenance action.

---

ROOM 41:

Reception 17:00:
AC not cooling.

HK 17:15:
Room feels warm.

Maintenance 18:00:
AC fault confirmed.

Maintenance 18:45:
Unable to repair tonight.

DM 19:00:
ROOM 41 OOO.

Reservations 19:20:
Blocked from inventory.

FINAL:
Room 41 OOO.
Maintenance tomorrow.

---

ROOM 22:

HK:
Lamp not working.

Reception:
"22 lamp broken pls maintenance"

Maintenance 18:40:
Bulb replaced.

HK 19:00:
Lamp working.

FINAL:
RESOLVED.
No maintenance task.

---

ROOM 37:

Reception:
Guest says minibar fridge noisy.

Maintenance:
Checked 18:20 - fridge working but compressor noisy.

Guest:
Not bothered, happy to keep room.

DM:
Maintenance can inspect properly tomorrow.

FINAL:
Room remains IN SERVICE.
Low-priority maintenance tomorrow.
No room move.

---

FRONT DOOR:

Reception 17:10:
automatic door sticking again.

Maintenance 17:40:
sensor adjusted.

Reception 18:00:
still sticking slightly.

Maintenance 18:30:
second adjustment completed.

DM 19:00:
tested 10 times - working normally.

FINAL:
RESOLVED.
No action.

---

STAFFING:

Reception WhatsApp 16:00:
"Think Sarah called sick for tomorrow AM??"

HK WhatsApp:
"heard Sarah not coming tomorrow"

Manager 18:30:
Sarah confirmed she IS working tomorrow as normal.

FINAL:
No staffing issue.
Do not create cover action.

---

GUEST COMPLAINT RM29:

Reception:
rm29 complained about noise from corridor.

DM:
Spoke with guest at 19:00.

Reception 19:30:
guest still unhappy?

DM UPDATE 20:15:
Called guest again.
Guest confirmed noise stopped and is satisfied.
No compensation requested.

FINAL:
Complaint resolved.
No further follow-up requested tonight.

---

LOST PROPERTY:

HK:
Black phone charger found rm16.

Reception:
charger at front desk.

Later note:
"guest coming back for charger"

DM UPDATE 20:30:
Guest collected charger.

FINAL:
Returned to guest.
No lost-property action.

---

PAYMENT DUPLICATES:

Reception:
rm24 Expedia £180 outstanding.

Finance:
rm24 VCC charged £180.

Night note:
"check rm24 Expedia"

DM:
IGNORE OLD NOTES.
RM24 FULLY PAID.

FINAL = PAID.

---

ROOM MOVE DUPLICATES:

Reception:
Hall rm35.

Maintenance:
35 heating issue.

Reception:
possible move 35 -> 33.

HK:
33 ready.

DM:
HALL FINAL ROOM 33.

FINAL = ROOM 33.

---

IMPORTANT SOURCE AUTHORITY:

When multiple notes conflict, use the most recent CONFIRMED operational update.

Do not treat an uncertain message like:
"think", "maybe", "heard", "possibly"
as stronger than a confirmed manager/department update.

Do not count duplicated reports of the same issue as multiple separate issues.

Do not keep old actions after another department confirms completion.

Do not create separate maintenance issues just because Reception + HK + Maintenance all described the same fault differently.

Do not show obsolete room allocations, taxi times, balances or setup requirements as current.

### Hotel Snapshot
Stored Hotel Snapshot values from `metrics.hotelSnapshot`:

- Sellable Rooms: 80
- OOO Rooms: 0

Snapshot fields present but blank/sparse (not invented): RevPAR, RevPAR (value).

## Expected Current Truth
- Olivia **42**: champagne + card **complete**.
- Green **31** twin **complete**.
- Garcia **24** **£0 paid** — no VCC retry.
- Halls **FINAL 33** (not 35).
- Smith cot **complete**.
- Wilson late c/o **14:00**; Patel **£0**; Lewis taxi **07:30**; Cooper luggage **done**; Brown **not** departing tomorrow.
- **26** shower **resolved**; **41 OOO**; **22** lamp **resolved**; **37** noisy fridge tomorrow low; door **resolved**; staffing rumour **false**; **29** complaint **resolved**; charger **returned**.

## Expected Important Actions
1. Keep **41 OOO**.
2. Send Halls to **33** only.
3. Expect Olivia/Green/Garcia/Smith with **no** prep/payment tasks.
4. Taxi awareness **07:30**.
5. Ignore rumour staffing; do not reopen resolved shower/door/complaint/charger/payments.

## Actual HF Output

Recovered from saved `generated_handover` / `recommendation_state` / `metrics` at save time. Wording below is from the historical record (not re-run).

### Output metadata
- Saved date display: Friday, 7 August 2026
- Generated/saved timestamp (from record): 2026-08-07T18:03:25.769Z
- Checklist state: none saved / empty

### AI Summary / Today's Briefing
Priority 1
Follow up with Maintenance regarding Room 35 heating before further guest impact.

Priority 2
Complete wake-up / transfer actions for Room 27 before departure.

Priority 3
Revenue follow-up required for Room 24 outstanding £180 before departures.

Priority 4
VIP readiness follow-up for Olivia Bennett in Room 42 — champagne.

Priority 5
Complete outstanding guest follow-up for Room 12.

### Organised Handover Sections
#### Urgent / Shift Alerts
_No items_

#### VIP
_No items_

#### Guest Follow-up (19)
- Room 27 – Taxi booked.
- Taxi booked.
- Room 07 – Guest requested a room move if available to Room 07.
- Room 12 – Late check-out noted.
- Room 33 – Guest requested a room move if available.
- Room 42 – Additional towels requested.
- Late check-out confirmed for 14:00.
- Guest requested a room move if available.
- Room 29 – The guest has raised a complaint.
- No compensation requested.
- Room 8 – Cooper luggage storage after check-out.
- Room 14 – Brown originally departing tomorrow.
- Reservations 18:00.
- Not departing tomorrow.
- The guest has raised a complaint.
- Room 29 – The guest has raised a complaint regarding noise.
- The guest has raised a complaint.
- Guest confirmed noise stopped and is satisfied.
- No further follow-up requested tonight.

#### Maintenance (6)
- AC not cooling.
- Room 35 – Heating issue reported.
- Shower issue open.
- No action. // Tested again - draining normally. // Lamp not working. // Bulb replaced. // still sticking slightly.
- Maintenance 18:00: | Maintenance 17:20: | Maintenance 18:10: | No current maintenance action. | Maintenance 18:45: | Unable to repair tonight. | Maintenance tomorrow. | "22 lamp broken maintenance" | Maintenance 18:40: | No maintenance task. | Maintenance: | Maintenance can inspect properly tomorrow. | Low-priority maintenance tomorrow. | Maintenance 17:40: | Maintenance 18:30: | Do not create separate maintenance issues just because Reception + housekeeping + Maintenance all described the same fault differently.
- Room 26 – Attended, cleared drain.

#### Payments / Finance (3)
- Room 24 – Outstanding balance of £180 remains on the account.
- Retry Expedia is arriving. Payment method: prepaid.
- Room 21 – Outstanding balance remains on the account.

#### Outstanding Tasks (1)
- Housekeeping 19:10.

#### Events / Timeline (1)
- Reservations 19:20.

#### Preparations (15)
- Review original note
- ☐ Champagne
- ☐ Balances or setup requirements as current.
- ☐ Twin setup if available
- ☐ Extra bed
- Room 42
- ☑ Champagne
- ☑ Welcome card
- Room 31
- ☐ Rm31 currently showing double setup - check.
- ☐ Twin setup if available
- Room 18
- ☐ Extra bed
- Checked — Room 18
- ☐ Extra bed

#### Completed Actions (8)
- RESOLVED. No follow-up unless returns.
- "31 twin done".
- Cot delivered.
- FINAL: preparations complete.
- The guest has raised a complaint.
- Completed.
- RESOLVED.
- Second adjustment completed.

#### Inventory (1)
- Blocked from inventory.

#### Deliveries
_No items_

#### Lost Property (1)
- Lost property noted.

#### Open Questions
_No items_

#### General / Operational Notes (114)
- Room 22.
- Room 26.
- Room 26 – IN SERVICE.
- Room 33 – HALL FINAL.
- Room 33 – FINAL =.
- Room 37.
- Room 41.
- Room 41 – OOO. | OOO.
- FINAL ROOM = 33.
- Room feels warm.
- Not bothered, happy to keep room.
- Room remains IN SERVICE.
- No room relocation.
- Room relocation DUPLICATES.
- Repeat guest, quiet room requested.
- Manager 18:30.
- As stronger than a confirmed manager/department update.
- Reception 17:20.
- Duty Manager update 20:45.
- .
- Room 31 – Mr Thomas Green ETA around 00:30.
- Reception.
- Housekeeping 18:30.
- Housekeeping WhatsApp 18:42.
- FINAL.
- Room 24 – Maria Garcia ETA 22:00.
- Reception 17:00.
- Night audit note 19:30.
- Finance 20:15.
- Duty Manager 20:30.
- Room 35 – James & Lucy Hall originally ETA 21:30.
- Room 35 – Allocated.
- Housekeeping 18:20.
- Room 35 – Clean and ready.
- Duty Manager 19:00.
- Reception 19:15.
- Room 33 – Allocated.
- Housekeeping 19:45.
- Room 33 – Ready.
- Room 35 – Do not send guests to.
- Room 18 – Daniel Smith ETA 23:00.
- Booking note.
- Housekeeping 18:00.
- Housekeeping 19:15.
- Reception 20:00.
- Duty Manager 20:10.
- Reception says.
- Guest message.
- Duty Manager update 10:30.
- FINAL = 14:00.
- Reception 09:00.
- Finance 12:15.
- Reception WhatsApp 12:30.
- Concierge.
- Guest called 19:30.
- Make it 07:30 instead.
- Concierge 19:45.
- 07:30 confirmed with driver.
- Old times are obsolete.
- Bags behind desk until 18:00.
- PM shift.
- No luggage action.
- Guest extended until 9 August.
- PMS updated.
- MULTI-SOURCE NOTES.
- Housekeeping 16:30.
- Reception 16:45.
- Reception 18:00.
- Duty Manager 18:30.
- Housekeeping 17:15.
- HK.
- Housekeeping 19:00.
- Lamp working.
- Checked 18:20 - fridge working but compressor noisy.
- Guest.
- DM.
- FRONT DOOR.
- Reception 17:10.
- Automatic door sticking again.
- Sensor adjusted.
- Tested 10 times - working normally.
- STAFFING.
- Reception WhatsApp 16:00.
- "Think Sarah called sick for tomorrow AM??".
- Housekeeping WhatsApp.
- "heard Sarah not coming tomorrow".
- Sarah confirmed she IS working tomorrow as normal.
- No staffing issue.
- Do not create cover action.
- Room 19 – Spoke with guest at 19:00.
- Reception 19:30.
- Duty Manager UPDATE 20:15.
- Called guest again.
- Room 16 – Black phone charger found.
- Charger at reception.
- Later note.
- "guest coming back for charger".
- Duty Manager UPDATE 20:30.
- Returned to guest.
- No lost-property action.
- Finance.
- Night note.
- IGNORE OLD NOTES.
- Room 35 – Hall.
- Room 33 – Ready.
- IMPORTANT SOURCE AUTHORITY.
- When multiple notes conflict, use the most recent CONFIRMED operational update.
- Do not treat an uncertain message like.
- Do not count duplicated reports of the same issue as multiple separate issues.
- Do not keep old actions after another department confirms completion.
- Guest collected bags around 17:35.
- Guest collected charger.
- Room 24 – FULLY PAID.
- FINAL = PAID.

### Recommendations
1. Follow up with Maintenance regarding Room 35 heating fault. The fault remains open and needs resolution this shift. _(priority: high)_ _(owner: Maintenance)_
2. Collect outstanding Expedia payment £180 for Room 24 before departure. _(priority: high)_ _(owner: Reception)_
3. Collect outstanding Expedia payment £0 before departure. _(priority: high)_ _(owner: Reception)_
4. Collect outstanding balance for Room 21 before departure. _(priority: high)_ _(owner: Reception)_
5. Complete VIP in Room 42 for Olivia Bennett requirements this shift. _(priority: high)_ _(owner: Reception)_
6. Follow up with Maintenance regarding Maintenance 18:00: | Maintenance 17:20: |…. The fault remains open and needs resolution this shift. _(priority: normal)_ _(owner: Maintenance)_

## Observed Positives
- Source-authority rules and many FINAL lines survive in General.
- Champagne/card sometimes ☑; Hall final 33 / Garcia paid appear in places.

## Observed Failures
- Briefing: heating **35**, taxi **27**, chase **£180 rm24**, Olivia champagne still needed, late c/o **12**.
- Payments still £180/21; twin/cot still ☐ beside completed.
- Invents “Room 07” move; LP still open after return.
- Recs collect £180 and £0; 114-line multi-source dump without winner state.

## Failure Tags
`source-of-truth` · `multi-source-conflict` · `state-resolution` · `payment-state` · `completed-as-open` · `deduplication` · `compression` · `prioritisation` · `recommendation-quality` · `room-status` · `presentation`

## Operational Risk
**Critical** — Confirmed department updates lose to older duplicate noise.

## Status
**Failed**

## Notes
Tester review completed from recovered CSV evidence (input vs saved HF output). Historical input/output preserved above.
