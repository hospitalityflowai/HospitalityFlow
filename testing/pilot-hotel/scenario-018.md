# Scenario-018 — Olivia Bennett Room 42 ETA 00:45 — Dependencies

## Test Metadata
- Date tested: 2026-08-07
- Hotel: Hotel Pilot
- Shift: AM
- Record id: 828f3477-e500-44da-811c-1f8aab2048fa
- created_at: 2026-08-07 18:13:25.141516+00
- Scenario focus: Dependencies / sequencing / blockers (Olivia Bennett, rm42, ETA 00:45)
- HF version/commit: [NOT RECORDED]
- Workspace id: 090ec1b9-2c03-41ac-a4ea-19c412f7da37
- Prepared by: Not specified
- Evidence source: `testing/pilot-hotel/exports/pilot-hotel-scenarios-001-020.csv` (Supabase saved handover; not re-generated)

## Original Input

### Today's Arrivals
VIP Olivia Bennett — rm42 — ETA 00:45.

Requirements:
Champagne
Welcome card
Feather-free pillows

20:00:
Welcome card COMPLETE.

20:30:
Champagne delivered and stored in F&B fridge.

HK has NOT placed feather-free pillows.

IMPORTANT:
Champagne should only be delivered to rm42 AFTER HK confirms room setup complete.

SEQUENCE:
1. HK places feather-free pillows.
2. HK confirms room ready.
3. F&B delivers champagne.
4. Reception final-checks room before arrival.

Current blocker = feather-free pillows.

Do NOT treat all three remaining steps as simultaneous urgent tasks.


Daniel Foster — originally rm31 — ETA 01:30.

22:00:
Maintenance found bathroom leak in rm31.

Replacement room rm35 identified.

BUT rm35 is currently being cleaned after late checkout.

HK estimate ready around 00:30.

SEQUENCE:
1. HK finishes rm35.
2. Supervisor inspects rm35.
3. Reception moves allocation rm31 → rm35.
4. New keys prepared.
5. Guest checks into rm35.

CURRENT:
Guest must NOT be allocated rm35 until HK inspection passes.

Do not tell Reception to move guest immediately.


Sarah Collins — rm24 — ETA 23:50.

Baby cot requested.

Cot currently stored rm16.

rm16 guest has NOT checked out yet.

Spare cot expected back only after rm16 departure around 23:20.

SEQUENCE:
1. rm16 guest departs.
2. HK retrieves cot.
3. Cot cleaned/check.
4. Cot placed rm24.

Current blocker = rm16 departure.

Do NOT report “cot missing”.
It exists but is temporarily unavailable.


James Lee — rm18 — flight delayed.

Original ETA 23:00.
Flight now expected to land 00:20.

Airport transfer booked based on original flight.

Driver instructed to monitor flight.

FINAL:
Do NOT change transfer until updated landing time is confirmed.
Transfer timing depends on flight status.

### Today's Departures
Room 12 — Thompson.
Departure 05:45.

Wake-up requested 04:45.
Taxi booked 05:15.

SEQUENCE:
1. Wake-up 04:45.
2. Confirm guest awake.
3. Confirm taxi approaching.
4. Guest departs.

Do not treat taxi confirmation as more urgent than the wake-up.


Room 22 — Garcia.

Checkout expected 06:30.

£120 disputed restaurant charge.

F&B is checking signed bill.

Reception must NOT collect disputed £120 until F&B confirms charge validity.

SEQUENCE:
1. F&B verifies bill.
2. If valid → Reception collects £120.
3. If invalid → charge removed.
4. Checkout completed.

Current state:
PAYMENT DECISION BLOCKED by F&B verification.

Do NOT recommend “Collect £120” yet.


Room 27 — Harris.

Guest requested invoice after checkout.

Final minibar posting occurs during Night Audit.

SEQUENCE:
1. Night Audit completes.
2. Final charges confirmed.
3. Guest checks out.
4. Invoice generated.
5. Invoice emailed.

Do NOT email invoice before final charges are posted.

### General Hotel / Shift Notes
ROOM 40 — OOO / RETURN TO SERVICE

Maintenance repairing shower valve.

Engineer currently working inside room.

HK waiting to clean.

Room must NOT return to inventory yet.

SEQUENCE:
1. Maintenance completes repair.
2. Maintenance tests shower.
3. HK enters and cleans room.
4. HK supervisor checks room.
5. Duty Manager returns room to service.

CURRENT OWNER = Maintenance.
HK = BLOCKED.
Reception = BLOCKED.

Do NOT tell HK to clean yet.
Do NOT mark room available yet.


ROOM 33 → ROOM 38 MOVE

Guest rm33 has serious noise complaint.

Guest accepted move to rm38.

BUT rm38 currently has Maintenance fixing window lock.

HK also needs to inspect room after Maintenance.

SEQUENCE:
1. Maintenance fixes rm38 lock.
2. HK checks rm38.
3. Reception confirms room ready.
4. Keys prepared.
5. Guest moves 33 → 38.

CURRENT:
Guest remains rm33.

Do NOT report guest as already moved.
Do NOT tell Reception to move guest until rm38 passes checks.


ROOM 26 — REFUND

Guest requested £150 refund after service complaint.

Reception agrees complaint is valid.

Manager has NOT approved refund yet.

Finance cannot process without approval.

SEQUENCE:
1. Manager reviews.
2. Manager approves/rejects.
3. If approved → Finance processes.
4. Reception informs guest.

CURRENT:
Waiting for MANAGEMENT APPROVAL.

Do NOT tell Finance to process £150 yet.


ROOM 29 — BROKEN BED

Bed frame damaged.

Maintenance has replacement frame.

Guest currently at dinner.

Reception has permission to enter room.

SEQUENCE:
1. Maintenance replaces frame.
2. HK remakes bed.
3. HK confirms complete.
4. Reception informs guest.

Maintenance currently working.

HK cannot remake bed yet.

Do not create simultaneous Maintenance + HK urgent actions as if both can act now.


ROOM 14 — WATER LEAK

Leak traced to rm24 above.

Maintenance has stopped water supply to rm24.

Leak in rm14 has stopped.

But ceiling remains wet.

SEQUENCE:
1. Maintenance confirms source fully controlled.
2. Safety check ceiling.
3. HK cleans water in rm14.
4. Maintenance assesses ceiling damage tomorrow.

CURRENT:
Source appears controlled but safety confirmation still required.

HK should NOT begin full clean until Maintenance confirms safe access.


ROOM 37 — SAFE

Guest safe won't open.

Maintenance requires guest to be physically present before opening it.

Guest currently at restaurant and returning approximately 00:15.

SEQUENCE:
1. Guest returns.
2. Reception confirms identity.
3. Maintenance attends with guest present.
4. Safe opened/tested.

CURRENT:
Maintenance task is BLOCKED by guest absence.

Do not repeatedly chase Maintenance before 00:15.


ROOM 21 — LOST PROPERTY

Guest says laptop charger missing.

HK found charger in linen room.

But two similar chargers were found today.

Reception must verify identifying details before releasing either charger.

SEQUENCE:
1. Ask guest for charger description.
2. Match description.
3. Release correct charger.

Do NOT simply give guest one of the chargers.


ROOM 30 — EARLY ARRIVAL TOMORROW

Guest arrives 09:00 tomorrow.

Current guest departs rm30 at 07:00.

Early-arrival guest requested room by 09:00.

SEQUENCE:
1. Current guest checks out.
2. HK prioritises rm30.
3. Supervisor inspects.
4. Reception checks in arriving guest.

Reception cannot guarantee 09:00 readiness before departure/cleaning.


ROOM 25 — FLOWERS

Flowers for tomorrow's VIP scheduled delivery 08:00.

Guest arrives 11:00.

HK should place flowers after room has been cleaned.

SEQUENCE:
1. Supplier delivers flowers.
2. Reception receives delivery.
3. HK cleans room.
4. Flowers placed.
5. Final room inspection.

NO Night action required.


GROUP ARRIVAL

Group of 12 arriving approximately 01:00.

Keys prepared.

Welcome drinks ready.

BUT organiser has not provided final rooming list.

Reception cannot distribute keys until rooming list is confirmed.

SEQUENCE:
1. Final rooming list received.
2. Match guests to rooms.
3. Verify keys.
4. Distribute keys.

CURRENT BLOCKER = rooming list.

Do not recommend remaking keys unless list actually changes.


KITCHEN DISHWASHER

Dishwasher broken.

Maintenance cannot attend until morning.

F&B has switched to backup dishwasher.

Operations continuing normally.

FINAL:
Repair tomorrow.
No blocked guest-facing task.
Low Night urgency.


FRONT DOOR

Main automatic door intermittently failing.

Maintenance instructed Reception to use manual mode.

Manual mode currently working.

Engineer booked 08:00.

FINAL:
Workaround active.
No dependency requiring Night action unless manual mode fails.


STAFFING

AM receptionist called sick.

DM contacted replacement.

Candidate accepted but Management must confirm overtime.

SEQUENCE:
1. Management approves overtime.
2. Replacement shift confirmed.
3. Rota updated.

CURRENT:
Awaiting Management approval.

Do NOT describe AM coverage as confirmed yet.

### Hotel Snapshot
Stored Hotel Snapshot values from `metrics.hotelSnapshot`:

- Departures: 5
- Sellable Rooms: 80
- OOO Rooms: 0

Snapshot fields present but blank/sparse (not invented): RevPAR, RevPAR (value).

## Expected Current Truth
- Olivia: card done; champagne in fridge; **blocker = feather-free pillows** then F&B deliver → Reception check.
- Foster: **do not** allocate **35** until HK inspect passes.
- Cot Collins: blocked on **16** departure (inventory exists — not “missing”).
- Lee transfer: wait flight update. Garcia **£120 disputed — blocked** on F&B verify.
- Invoice Harris: after night audit. **40** return-to-service blocked on Maint→HK→DM.
- Guest **33** stays until **38** ready. Refund **26** waits manager. Safe **37** waits guest ~00:15.
- Group keys blocked on rooming list. AM cover awaiting Management overtime approval.

## Expected Important Actions
1. Clear pillow blocker, then champagne sequence for Olivia.
2. Finish/inspect **35** before Foster move; retrieve cot after **16** departs.
3. Set wake 04:45 before taxi focus.
4. Do **not** collect £120 yet; do not clean **40** / move **33** early; wait safe/guest/manager gates.

## Actual HF Output

Recovered from saved `generated_handover` / `recommendation_state` / `metrics` at save time. Wording below is from the historical record (not re-run).

### Output metadata
- Saved date display: Friday, 7 August 2026
- Generated/saved timestamp (from record): 2026-08-07T18:13:24.449Z
- Checklist state: none saved / empty

### AI Summary / Today's Briefing
Priority 1
Follow up with Maintenance regarding Room 14 shower/leak before further guest impact.

Priority 2
Timed departure actions for wake-up at 04:45.

Priority 3
Revenue follow-up required for outstanding £120 before departures.

Priority 4
VIP readiness follow-up for arrival.

Priority 5
Complete outstanding guest follow-up for Room 35.

### Organised Handover Sections
#### Urgent / Shift Alerts
_No items_

#### VIP (1)
- VIP Olivia Bennett.

#### Guest Follow-up (13)
- Taxi booked.
- Room 33 – Guest requested a room move if available to Room 38.
- Room 35 – Late check-out noted.
- Room 38 – Guest requested a room move if available.
- Guest requested a room move if available.
- Room 33 – The guest has raised a complaint regarding noise.
- The guest has raised a complaint.
- Room 16 – Room access or lock issue. Guest cannot enter reliably.
- Departure 05:45.
- Check-out expected 06:30.
- F&B is checking signed bill.
- Guest requested invoice after check-out.
- Reception cannot guarantee 09:00 readiness before departure/cleaning.

#### Maintenance (9)
- Room 14 – Leak open.
- Room 24 – Leak open.
- Room 31 – Bathroom leak open.
- Shower leak open.
- Room 24 – Maintenance has stopped water supply to.
- Room 38 – Room access or lock issue. Guest cannot enter reliably.
- Do NOT treat all three remaining steps as simultaneous urgent tasks. // flight delayed. // Flight now expected to land 00:20. // Driver instructed to monitor flight. // Engineer currently working inside room. // Engineer booked 08:00.
- Room access or lock issue. Guest cannot enter reliably.
- Housekeeping should NOT begin full clean until Maintenance confirms safe access. | SAFE | Guest safe won't open. | 4. Safe opened/tested.

#### Payments / Finance (2)
- An outstanding OTA payment of £120 still needs to be collected.
- A minibar charge requires review.

#### Outstanding Tasks (1)
- 3. Release correct charger.

#### Events / Timeline (5)
- Rooms 31, 35 – 3. Reception moves allocation rm31 → rm35.
- EARLY ARRIVAL TOMORROW.
- 4. Reception checks in arriving guest.
- GROUP ARRIVAL.
- Group of 12 arriving approximately 01:00.

#### Preparations (14)
- Review original note
- ☐ Extra bed
- ☐ Flowers
- ☐ Champagne
- ☐ Welcome card
- ☑ 4. New keys prepared.
- ☑ 4. Keys prepared.
- ☑ Keys prepared.
- Room 42
- ☑ Champagne
- Room 16
- ☐ Extra bed
- Room 24
- ☑ Extra bed

#### Completed Actions (3)
- Night Audit completes.
- 3. housekeeping confirms complete.
- 4. check-out completed.

#### Inventory
_No items_

#### Deliveries (1)
- Package being held. Stored in Reception.

#### Lost Property (1)
- Lost property noted.

#### Open Questions (1)
- Room 38 Has Maintenance completed the outstanding repair?

#### General / Operational Notes (132)
- Early-arrival guest requested room by 09:00.
- Room 12.
- Room 14.
- Room 21.
- Room 22.
- Room 25.
- Room 26.
- Room 27.
- Room 29.
- Room 30.
- Room 35 – Replacement room identified.
- Room 37.
- Room 40.
- Duty Manager returns room to service.
- 3. housekeeping enters and cleans room.
- 4. housekeeping supervisor checks room.
- Do NOT mark room available yet.
- 3. Reception confirms room ready.
- Reception has permission to enter room.
- 3. housekeeping cleans room.
- 5. Final room inspection.
- 4. Reception final-checks room before arrival.
- Housekeeping found charger in linen room.
- Room must NOT return to inventory yet.
- 2. housekeeping confirms room ready.
- 1. Manager reviews.
- 2. Manager approves/rejects.
- Room 42 – Rm42.
- ETA 00:45.
- Requirements.
- 20:00.
- 20:30.
- IMPORTANT.
- SEQUENCE.
- Daniel Foster.
- Room 31 – Originally.
- ETA 01:30.
- 22:00.
- Housekeeping estimate ready around 00:30.
- Room 35 – . housekeeping finishes.
- Room 35 – . Supervisor inspects.
- Room 35 – . Guest checks into.
- CURRENT.
- Room 35 – Guest must NOT be allocated until housekeeping inspection passes.
- Sarah Collins.
- Room 24 – Rm24.
- ETA 23:50.
- Room 16 – Guest has NOT checked out yet.
- Room 16 – . guest departs.
- It exists but is temporarily unavailable.
- James Lee.
- Room 18 – Rm18.
- Original ETA 23:00.
- FINAL.
- Thompson.
- 2. Confirm guest awake.
- 4. Guest departs.
- Garcia.
- £120 disputed restaurant charge.
- 1. F&B verifies bill.
- 2. If valid → Reception collects £120.
- 3. If invalid → charge removed.
- Current state.
- Harris.
- 1.
- 2. Final charges confirmed.
- 3. Guest checks out.
- OOO / RETURN TO SERVICE.
- Housekeeping waiting to clean.
- 5.
- Room access or lock issue. Guest cannot enter reliably.
- Room access or lock issue. Guest cannot enter reliably.
- Do NOT tell housekeeping to clean yet.
- Room 38 – . housekeeping checks.
- 5. Guest moves 33 → 38.
- Room 33 – Guest remains.
- Finance cannot process without approval.
- 3. If approved → Finance processes.
- 4. Reception informs guest.
- Waiting for MANAGEMENT APPROVAL.
- Do NOT tell Finance to process £150 yet.
- Bed frame damaged.
- Guest currently at dinner.
- 2. housekeeping remakes bed.
- Housekeeping cannot remake bed yet.
- But ceiling remains wet.
- 2. Safety check ceiling.
- Room 14 – . housekeeping cleans water in.
- Source appears controlled but safety confirmation still required.
- Guest currently at restaurant and returning approximately 00:15.
- 1. Guest returns.
- 2. Reception confirms identity.
- Guest says laptop charger missing.
- But two similar chargers were found today.
- Reception must verify identifying details before releasing either charger.
- 1. Ask guest for charger description.
- 2. Match description.
- Do NOT simply give guest one of the chargers.
- Guest arrives 09:00 tomorrow.
- Room 30 – Current guest departs at 07:00.
- 1. Current guest checks out.
- Room 30 – . housekeeping prioritises.
- 3. Supervisor inspects.
- Guest arrives 11:00.
- NO Night action required.
- Welcome drinks ready.
- BUT organiser has not provided final rooming list.
- Room access or lock issue. Guest cannot enter reliably.
- 1. Final rooming list received.
- 2. Match guests to rooms.
- Room access or lock issue. Guest cannot enter reliably.
- Room access or lock issue. Guest cannot enter reliably.
- Room access or lock issue. Guest cannot enter reliably.
- Room access or lock issue. Guest cannot enter reliably.
- KITCHEN DISHWASHER.
- F&B has switched to backup dishwasher.
- Operations continuing normally.
- Room access or lock issue. Guest cannot enter reliably.
- Low Night urgency.
- FRONT DOOR.
- Main automatic door intermittently failing.
- Manual mode currently working.
- Workaround active.
- No dependency requiring Night action unless manual mode fails.
- STAFFING.
- AM receptionist called sick.
- Duty Manager contacted replacement.
- Candidate accepted but Management must confirm overtime.
- 1. Management approves overtime.
- 2. Replacement shift confirmed.
- Awaiting Management approval.
- Do NOT describe AM coverage as confirmed yet.

### Recommendations
1. Follow up with Maintenance regarding Room 31 shower/leak. The fault remains open and needs resolution this shift. _(priority: high)_ _(owner: Maintenance)_
2. Complete the 04:45 wake-up call — wake-up call not yet confirmed as loaded this shift. _(priority: high)_ _(owner: Reception)_
3. Prepare VIP arrival. Verify room allocation before arrival. _(priority: high)_ _(owner: Reception)_
4. Follow up with Maintenance regarding Room 38 room access issue. The fault remains open and needs resolution this shift. _(priority: normal)_ _(owner: Maintenance)_
5. Follow up with Maintenance regarding Room 24 Maintenance has stopped water supply to rm24. The fault remains open and needs resolution this shift. _(priority: normal)_ _(owner: Maintenance)_
6. Log and follow up lost item with Reception this shift. _(priority: normal)_ _(owner: Reception)_

## Observed Positives
- SEQUENCE / blocker language often retained in General (35 must not allocate; £120 disputed steps; 40 return-to-service; charger verify).
- Wake 04:45 appears in briefing; champagne sometimes ☑ for room 42.
- Some “must NOT allocate until inspect” text survives.

## Observed Failures
- Briefing Priority 3 = collect **£120** though payment is disputed/blocked on F&B.
- Priority 5 = guest follow-up **35** as if move-ready; VIP readiness undifferentiated (pillow blocker not the ranked gate).
- Guest follow-up treats **33→38** as requested move now; payments still show £120 + minibar.
- Recs reopen leaks/access without sequencing; LP charger without verify step.
- Dependencies stated in notes, not enforced in actions — acting through blockers.
- 132-line dump preserves sequences but briefing/recs ignore gates.

## Failure Tags
`dependency-sequencing` · `ownership-routing` · `source-of-truth` · `state-resolution` · `payment-state` · `prioritisation` · `recommendation-quality` · `compression` · `presentation`

## Operational Risk
**Critical** — Acting through blockers (wrong room allocation, disputed payment, premature inventory/move).

## Status
**Failed**

## Notes
Tester review completed from recovered CSV evidence (input vs saved HF output). Historical input/output preserved above.
