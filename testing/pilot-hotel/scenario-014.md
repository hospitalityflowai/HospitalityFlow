# Scenario-014 — Charlotte Evans — Ownership & Routing

## Test Metadata
- Date tested: 2026-08-07
- Hotel: Hotel Pilot
- Shift: AM
- Record id: ce7fdbfa-b1da-4653-9747-62b43f8c9667
- created_at: 2026-08-07 18:05:33.56458+00
- Scenario focus: Ownership / department routing (Charlotte Evans, rm42)
- HF version/commit: [NOT RECORDED]
- Workspace id: 090ec1b9-2c03-41ac-a4ea-19c412f7da37
- Prepared by: Not specified
- Evidence source: `testing/pilot-hotel/exports/pilot-hotel-scenarios-001-020.csv` (Supabase saved handover; not re-generated)

## Original Input

### Today's Arrivals
VIP Charlotte Evans rm42 ETA 00:30.

Requirements:
Champagne
Welcome card
Feather-free pillows

18:00 Reception:
Champagne needs arranging.

18:30 F&B:
Champagne delivered to rm42. DONE.

19:00 Reception:
Welcome card still required.

19:30 DM:
Welcome card written and placed. DONE.

20:00 HK:
Feather-free pillows NOT yet placed.

FINAL:
Only outstanding preparation = feather-free pillows.
OWNER = Housekeeping / Night team coordination.
Do not ask F&B or Reception to repeat completed work.

---

David Morgan rm31 ETA 23:45.
Baby cot requested.

Reception initially asked HK to arrange cot.

19:00 HK:
No spare cot on floor.

19:20 Housekeeping supervisor:
Cot located in storage.

20:00 HK:
Cot placed rm31.

FINAL:
Cot COMPLETE.
No department owns further action.

---

Sophia Martinez rm24 ETA 01:15.
Birthday stay.

Cake ordered through F&B for arrival.

F&B 19:30:
Cake prepared but currently stored restaurant fridge.

FINAL:
Cake still needs delivering to rm24 shortly before arrival.
OWNER = F&B.
Reception only needs awareness/coordination.
Do not create separate Reception + F&B tasks for the same cake.

---

Thomas Reed rm18 ETA 22:30.
Guest requested airport transfer.

Concierge arranged car.
Driver confirmed.
Guest has driver's details.

FINAL:
Transport COMPLETE.
Reception awareness only.
No taxi-booking task.

---

Anna Cooper rm35 ETA tomorrow 14:00.
Twin setup required.

HK AM shift owns preparation tomorrow.
Not Night shift action.

### Today's Departures
rm12 Harris departure tomorrow.
Wake-up 05:15.

Reception originally recorded request.

FINAL:
Night Reception owns execution of wake-up call.
OUTSTANDING.

---

rm16 Wilson departure tomorrow.
Taxi 06:00.

Concierge already booked and confirmed taxi.

FINAL:
No booking action.
Night Reception should only ensure guest is awake/aware when appropriate.

---

rm22 Patel has £60 minibar balance.

Reception note:
"pls collect £60"

Finance update 20:30:
Charge transferred to company account.

FINAL:
Guest owes £0.
Finance handling complete.
Reception must NOT collect payment.

---

rm27 Brown departing 07:00.
Guest requested breakfast box.

Reception took request.

F&B 20:00:
Breakfast box NOT prepared yet.
Collection required by 06:30.

FINAL:
OWNER = F&B.
Night Reception may need to verify/coordinate before 06:30.
Do not describe Reception as responsible for preparing food.

---

rm33 Lewis:
Guest needs invoice emailed after checkout.

Reception owns checkout.
Finance email address already confirmed.

FINAL:
Reception should email invoice after checkout.
OUTSTANDING.

### General Hotel / Shift Notes
OWNERSHIP / ROUTING TEST:

ROOM 26 AC:

17:00 Reception:
Guest reports AC not cooling.

17:30 Maintenance:
Attended room.

18:15 Maintenance:
Unable to fully repair tonight.

Guest given fan and comfortable.

FINAL:
Maintenance owns repair tomorrow.
Night Reception owns guest monitoring only if complaint returns.

Do NOT tell Reception to repair AC.
Do NOT create duplicate "follow up AC" actions for every department.

---

ROOM 41 WATER LEAK:

18:00 HK discovered leak.

HK reported to Reception.

Reception contacted Maintenance.

Maintenance attended and isolated water.

DM placed room OOO.

FINAL:
Room 41 OOO.
Maintenance owns repair tomorrow.
Reception owns inventory/room-status awareness.
Housekeeping has NO outstanding action tonight.

One incident, different responsibilities.
Do not turn it into three separate maintenance problems.

---

ROOM 29 EXTRA BED:

Reception promised guest extra bed.

HK says extra bed requires Maintenance assistance because frame is damaged.

Maintenance 20:00:
Replacement frame delivered.

HK 20:20:
Extra bed assembled and placed.

FINAL:
COMPLETED.
Nobody owns further action.

---

LOBBY WC:

Hand dryer broken.

Maintenance ticket logged for tomorrow.

Reception placed paper towels.

FINAL:
Maintenance owns repair tomorrow.
Reception workaround COMPLETE.
No urgent Reception action.

---

RESTAURANT TABLE:

VIP guest requested quiet table tomorrow evening.

Reception recorded request.

Restaurant manager 19:00:
Reservation updated and quiet table confirmed.

FINAL:
F&B owns reservation.
COMPLETED.
Reception awareness only.

---

ROOM 37 COMPLAINT:

Guest complained about corridor noise.

Reception spoke with guest.

Security asked noisy visitors to leave corridor.

20:30:
Guest confirmed quiet now and thanked team.

FINAL:
RESOLVED.
No Reception, Security or Management action.

---

ROOM 14 BROKEN SAFE:

Reception logged safe issue.

Maintenance repaired safe 19:45.

Reception tested with guest 20:00.

FINAL:
RESOLVED.
No action.

---

FLOWERS FOR ROOM 25:

Guest arriving tomorrow 12:00.
Flowers ordered externally.

Reception initially responsible for ordering.

Order CONFIRMED.

Supplier delivering 10:30 tomorrow.

FINAL:
Reception does NOT need to reorder.
AM Reception only needs to receive delivery.
HK then places flowers in room.

This is a SEQUENTIAL workflow:

Supplier → Reception receives → Housekeeping places.

Do not create three simultaneous urgent actions tonight.

---

GROUP ARRIVAL TOMORROW:

8 rooms arriving 11:30.

Reception:
Needs keys prepared.

HK:
Rooms prioritised for early cleaning.

F&B:
Welcome drinks at 11:15.

FINAL:
These are separate department responsibilities for ONE group arrival:

Reception → keys
Housekeeping → rooms
F&B → drinks

All belong to AM shift.
Not Night-shift urgent.

---

STAFFING:

HK supervisor originally called sick.

DM initially asked Reception to contact agency.

20:00:
Replacement HK supervisor confirmed directly by management.

FINAL:
Coverage arranged.
Reception must NOT contact agency.

---

GUEST REFUND RM8:

Reception received complaint and offered £50 refund.

Manager approved refund.

Finance processed refund 19:30.

FINAL:
Refund COMPLETE.
Reception does not need to refund again.
Management approval complete.
Finance action complete.

---

IMPORTANT OWNERSHIP RULES:

The person who RECEIVES information is not automatically the owner of the action.

Reception may coordinate an issue without owning the specialist task.

Maintenance owns technical repairs.

Housekeeping owns room setup/amenities where appropriate.

F&B owns food/beverage preparation.

Finance owns accounting/payment processing where appropriate.

Management owns approvals/escalations.

Some tasks require sequential ownership.

Ownership can change as the workflow progresses.

Completed work has NO current owner.

"Reception informed" does not mean "Reception must action".

"Maintenance attended" does not automatically mean maintenance work remains outstanding.

Do not duplicate one issue simply because multiple departments touched it.

### Hotel Snapshot
Stored Hotel Snapshot values from `metrics.hotelSnapshot`:

- Arrivals: 8
- Sellable Rooms: 80
- OOO Rooms: 0

Snapshot fields present but blank/sparse (not invented): RevPAR, RevPAR (value).

## Expected Current Truth
- Charlotte **42**: champagne + card **DONE**; **only** feather-free pillows outstanding (**HK/night**).
- Morgan cot **DONE**; Martinez cake = **F&B deliver** before arrival; Reed transfer **COMPLETE**; Anna twin = **AM HK**.
- Harris wake **05:15** Reception; Wilson taxi confirmed (awareness); Patel **£0** (company — do not collect); Brown breakfast box = **F&B** (+ Reception coordinate); Lewis invoice email after checkout = Reception.
- **26** AC: maint tomorrow; Reception monitor only. **41** OOO leak: maint repair tomorrow. Extra bed **29** / safe **14** / noise **37** / refund **8** / restaurant table / WC workaround / flowers order / HK supervisor cover = completed or non-night as noted.

## Expected Important Actions
1. Place feather-free pillows **42**.
2. F&B cake to **24** near arrival.
3. Execute wake **05:15**.
4. Coordinate breakfast box before 06:30; email Lewis invoice after checkout.
5. Keep **41 OOO** awareness; do **not** re-ask for done champagne/card/cot/transfer/refund/£60.

## Actual HF Output

Recovered from saved `generated_handover` / `recommendation_state` / `metrics` at save time. Wording below is from the historical record (not re-run).

### Output metadata
- Saved date display: Friday, 7 August 2026
- Generated/saved timestamp (from record): 2026-08-07T18:06:45.453Z
- Checklist state: none saved / empty

### AI Summary / Today's Briefing
Priority 1
Follow up with Maintenance regarding Room 26 AC fault before further guest impact.

Priority 2
Timed departure actions for taxi at 06:00.

Priority 3
Revenue follow-up required for Room 22 outstanding £60 before departures.

Priority 4
VIP readiness follow-up for Charlotte Evans in Room 42 — champagne.

### Organised Handover Sections
#### Urgent / Shift Alerts (2)
- Security asked noisy visitors to leave corridor.
- No Reception, Security or Management action.

#### VIP
_No items_

#### Guest Follow-up (15)
- Taxi booked.
- Wake-up call booked.
- The guest has raised a complaint.
- Room 12 – Harris departure tomorrow.
- Reception originally recorded request.
- Room 16 – Wilson departure tomorrow.
- Outstanding balance remains on the account.
- Room 27 – Brown departing 07:00.
- Guest requested breakfast box.
- Reception took request.
- Guest needs invoice emailed after check-out.
- Reception owns check-out.
- Reception should email invoice after check-out.
- Reception recorded request.
- The guest has raised a complaint regarding noise.

#### Maintenance (11)
- Room 26 – AC issue reported.
- AC not cooling. Please follow up during this shift.
- Room 41 – Leak open.
- Leak open.
- Room 14 – BROKEN SAFE.
- 17:30 Maintenance: | 18:15 Maintenance: | Unable to fully repair tonight. | Maintenance owns repair tomorrow. | Reception contacted Maintenance. | Maintenance attended and isolated water. | Do not turn it into three separate maintenance problems. | Maintenance 20:00: | Maintenance ticket logged for tomorrow. | Maintenance owns technical repairs. | "Maintenance attended" does not automatically mean maintenance work remains outstanding. // Reception received complaint and offered £50 refund. | Finance processed refund 19:30. | Reception received complaint and offered £50 refund. | Finance processed refund 19:30. | Manager approved refund. | Reception does not need to refund again. // " collect £60" // Reception must NOT collect payment. // Finance owns accounting/payment processing where appropriate. // Feather-free pillows | Feather-free pillows NOT yet placed. | Only outstanding preparation = feather-free pillows. // Housekeeping has NO outstanding action tonight. // OUTSTANDING. // Refund COMPLETE.
- Hand dryer broken.
- No urgent Reception action. // No action. // Do not create three simultaneous urgent actions tonight. // Not Night-shift urgent.
- Housekeeping says extra bed requires Maintenance assistance because frame is damaged.
- Reception logged safe issue. // Maintenance repaired safe 19:45.
- LOBBY WC.

#### Payments / Finance (2)
- Room 22 – Outstanding balance of £60 remains on the account.
- Room 8 – GUEST REFUND.

#### Outstanding Tasks (4)
- OWNER = Housekeeping / Night team coordination.
- 19:20 Housekeeping supervisor.
- Supplier → Reception receives → Housekeeping places.
- Housekeeping → rooms.

#### Events / Timeline (8)
- Cake ordered through F&B for arrival.
- Room 24 – Cake still needs delivering to shortly before arrival. Please follow up during this shift.
- Reservation updated and quiet table confirmed.
- F&B owns reservation.
- Guest arriving tomorrow 12:00.
- GROUP ARRIVAL TOMORROW.
- Room 8 – Rooms arriving 11:30.
- These are separate department responsibilities for ONE group arrival.

#### Preparations (21)
- Review original note
- ☐ Champagne
- ☐ Birthday stay.
- ☐ Extra bed
- ☐ Welcome card
- ☑ Cake prepared but currently stored restaurant fridge.
- ☐ Twin setup if available
- ☑ Breakfast box NOT prepared yet.
- ☐ Flowers
- ☐ Needs keys prepared.
- Housekeeping Owns
- ☐ Housekeeping owns room setup
- ☐ Welcome amenities
- Room 29
- ☐ Extra bed
- Room 42
- ☑ Champagne
- Cot Placed — Room 31
- ☑ Extra bed
- FLOWERS FOR — Room 25
- ☐ Flowers

#### Completed Actions (9)
- Transport COMPLETE.
- Finance handling complete.
- Reception workaround COMPLETE.
- Management approval complete.
- Finance action complete.
- Do not ask F&B or Reception to repeat completed work.
- COMPLETED.
- RESOLVED.
- Completed work has NO current owner.

#### Inventory
_No items_

#### Deliveries (1)
- Package being held. Stored in Reception.

#### Lost Property
_No items_

#### Open Questions
_No items_

#### General / Operational Notes (84)
- Room 37 – COMPLAINT.
- Room 41 – OOO.
- Attended room.
- Duty Manager placed room OOO.
- Reception owns inventory/room-status awareness.
- Paper towels need restocking.
- Restaurant manager 19:00.
- Management owns approvals/escalations.
- Requirements.
- 18:00 Reception.
- 18:30 F&B.
- 19:00 Reception.
- 19:30 DM.
- 20:00 HK.
- FINAL.
- .
- Room 31 – David Morgan ETA 23:45.
- 19:00 HK.
- No department owns further action.
- Room 24 – Sophia Martinez ETA 01:15.
- F&B 19:30.
- OWNER = F&B.
- Reception only needs awareness/coordination.
- Do not create separate Reception + F&B tasks for the same cake.
- Room 18 – Thomas Reed ETA 22:30.
- Concierge arranged car.
- Driver confirmed.
- Guest has driver's details.
- Reception awareness only.
- Room 35 – Anna Cooper ETA tomorrow 14:00.
- Housekeeping AM shift owns preparation tomorrow.
- Not Night shift action.
- No booking action.
- Night Reception should only ensure guest is awake/aware when appropriate.
- Reception note.
- Finance update 20:30.
- Guest owes £0.
- F&B 20:00.
- Collection required by 06:30.
- Night Reception may need to verify/coordinate before 06:30.
- Do not describe Reception as responsible for preparing food.
- Room 33 – Lewis.
- Finance email address already confirmed.
- OWNERSHIP / ROUTING TEST.
- 17:00 Reception.
- Guest given fan and comfortable.
- Housekeeping reported to Reception.
- One incident, different responsibilities.
- Housekeeping 20:20.
- Nobody owns further action.
- RESTAURANT TABLE.
- Reception spoke with guest.
- 20:30.
- Guest confirmed quiet now and thanked team.
- Reception tested with guest 20:00.
- Reception initially responsible for ordering.
- Order CONFIRMED.
- Supplier delivering 10:30 tomorrow.
- Reception does NOT need to reorder.
- This is a SEQUENTIAL workflow.
- Reception.
- HK.
- Rooms prioritised for early cleaning.
- F&B.
- Welcome drinks at 11:15.
- Room access or lock issue. Guest cannot enter reliably.
- F&B → drinks.
- All belong to AM shift.
- STAFFING.
- Housekeeping supervisor originally called sick.
- Duty Manager initially asked Reception to contact agency.
- 20:00.
- Replacement housekeeping supervisor confirmed directly by management.
- Coverage arranged.
- Reception must NOT contact agency.
- IMPORTANT OWNERSHIP RULES.
- The person who RECEIVES information is not automatically the owner of the action.
- Reception may coordinate an issue without owning the specialist task.
- F&B owns food/beverage preparation.
- Some tasks require sequential ownership.
- Ownership can change as the workflow progresses.
- "Reception informed" does not mean "Reception must action".
- Do not duplicate one issue simply because multiple departments touched it.
- Replacement frame delivered.

### Recommendations
1. Follow up with Maintenance regarding Room 26 AC. The fault remains open and needs resolution this shift. _(priority: urgent)_ _(owner: Maintenance)_
2. Follow up with Maintenance regarding AC. The fault remains open and needs resolution this shift. _(priority: urgent)_ _(owner: Maintenance)_
3. Follow up with Maintenance regarding Room 41 shower/leak. The fault remains open and needs resolution this shift. _(priority: high)_ _(owner: Maintenance)_
4. Complete the 06:00 wake-up call — follow-up still required this shift. _(priority: high)_ _(owner: Reception)_
5. Collect outstanding balance before departure. _(priority: high)_ _(owner: Maintenance)_
6. Complete VIP in Room 42 for Charlotte Evans requirements this shift. _(priority: high)_ _(owner: Reception)_

## Observed Positives
- Ownership doctrine text retained; many COMPLETE/OWNER lines in General.
- Champagne sometimes ☑; cake/F&B ownership fragments present.

## Observed Failures
- Briefing: AC **26** urgent tonight; collect **£60**; VIP champagne prep.
- Recs duplicate AC; “collect outstanding” owned by **Maintenance**; VIP “requirements” undifferentiated.
- Wake shown booked / rec cites **06:00** not **05:15**.
- Safe/leak/extra-bed noise reopened; pillows not the clear single prep.
- Snapshot **OOO=0**; ownership rules stated but not applied.

## Failure Tags
`ownership-routing` · `source-of-truth` · `state-resolution` · `completed-as-open` · `payment-state` · `prioritisation` · `recommendation-quality` · `presentation` · `compression` · `hotel-snapshot`

## Operational Risk
**High** — Wrong department/money actions; true outstanding (pillows/wake/cake) buried.

## Status
**Failed**

## Notes
Tester review completed from recovered CSV evidence (input vs saved HF output). Historical input/output preserved above.
