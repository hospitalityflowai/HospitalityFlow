# Scenario-016 — James Wilson — Entity Resolution

## Test Metadata
- Date tested: 2026-08-07
- Hotel: Hotel Pilot
- Shift: AM
- Record id: 60aee49e-6870-46d9-8064-62eba8e3f6e2
- created_at: 2026-08-07 18:09:50.66408+00
- Scenario focus: Guest identity / entity resolution (James Wilson, rm21)
- HF version/commit: [NOT RECORDED]
- Workspace id: 090ec1b9-2c03-41ac-a4ea-19c412f7da37
- Prepared by: Not specified
- Evidence source: `testing/pilot-hotel/exports/pilot-hotel-scenarios-001-020.csv` (Supabase saved handover; not re-generated)

## Original Input

### Today's Arrivals
James Wilson — rm21 — ETA 23:30
Booking ref HF-7812.
Business traveller.
POA £185.
Requests quiet room away from lift.

IMPORTANT:
There is another James Wilson arriving tomorrow.
Do NOT merge them.


James Wilson — booking ref HF-9931
Arrival TOMORROW 8 August.
Room not allocated yet.
Anniversary stay.
Flowers requested.

This is a DIFFERENT guest from James Wilson rm21 tonight.


Sarah Smith — rm32 — ETA 00:15
Booking ref BK-4418.
Travelling alone.
Requested feather-free pillows.

18:00 HK:
Feather-free pillows placed rm32.

FINAL:
Preparation complete.


Mrs Smith — rm27
Already IN HOUSE.
Full name: Margaret Smith.

19:00:
Requested extra towels.

Do NOT associate this request with Sarah Smith rm32.


David Patel — rm14 — ETA 01:00
Booking ref EXP-7715.
Expedia prepaid.

OTA MESSAGE:
“Guest Patel requests Twin setup if possible.”

19:00 Reception:
Confirmed OTA message belongs to David Patel EXP-7715 / rm14.

FINAL:
Twin request belongs to David Patel rm14.


Daniel Patel — rm41
Already IN HOUSE.
Different guest.
Reported noisy AC.

Do NOT attach David Patel’s Twin request to Daniel Patel.


Emily Brown — originally rm25.
Booking ref HF-5541.

18:00:
Room moved from rm25 → rm36 because rm25 maintenance issue.

19:00 HK:
rm36 ready.

FINAL CURRENT ROOM = 36.

All arrival preparations for Emily belong to rm36.
Do not show Emily as occupying/preparing rm25.


Robert Green + Helen Green
Booking HF-8871.
Rooms 18 + 19.
Married couple travelling together.

Robert = rm18.
Helen = rm19.

Guest called:
“Please put the champagne in my wife's room.”

FINAL:
Champagne belongs in HELEN'S room = rm19.
Do not put champagne in both rooms.
Do not assume Robert's room.


Sophie Clarke — booking ref BK-1190.
Room allocation currently UNKNOWN.
ETA 00:45.

Guest requested baby cot.

Do NOT invent a room number.
Action should remain attached to Sophie / BK-1190 until room allocated.

### Today's Departures
John Taylor — rm11.
Departure 06:30.
Taxi booked 06:00.

Jonathan Taylor — rm22.
Departure 11:00.
No taxi requested.

These are TWO DIFFERENT guests.
Do not merge John and Jonathan Taylor.


rm31 — Mr Lee.
Full name = Andrew Lee.
Outstanding minibar £28.

rm33 — Ms Lee.
Full name = Jennifer Lee.
Late checkout approved 13:00.

Do not transfer minibar balance between the two Lee reservations.


Reservation HF-6630:
Guest = Maria Garcia.
rm24.
Taxi 05:45 confirmed.

Later note says:
“Garcia taxi confirmed.”

This refers to Maria Garcia rm24.
Do not create a second Garcia guest/task.


rm17:
Booking under Thomas Evans.
Partner Rachel Evans staying in same room.

Rachel requested invoice emailed to:
rachel@example.test

Invoice request belongs to ROOM 17 / Evans reservation.
Guest requesting it is Rachel.

Do not create a separate room/reservation for Rachel.

### General Hotel / Shift Notes
IDENTITY TEST — ROOM MOVE

“Brown needs maintenance follow-up in rm25.”

This is an OLD note referring to Emily Brown's original allocation.

Emily Brown has moved to rm36.

The maintenance problem belongs to ROOM 25 itself.
It does NOT move with Emily.

FINAL:
Emily → rm36.
Maintenance issue → rm25.

Do not attach rm25 maintenance problem to rm36.


IDENTITY TEST — WRONG GUEST CORRECTION

18:00 note:
“Mr Wilson rm21 anniversary prosecco.”

19:00 Reception correction:
WRONG WILSON.

Anniversary request belongs to tomorrow's James Wilson booking HF-9931, NOT tonight's James Wilson rm21.

FINAL:
Tonight James Wilson rm21 = business traveller, quiet room request.
Tomorrow James Wilson HF-9931 = anniversary / flowers/prosecco context.

Do not give tonight's guest anniversary amenities.


IDENTITY TEST — SAME SURNAME

“Smith wants extra towels.”

Ambiguous note.

Later clarification:
Extra towels = Margaret Smith rm27.

Sarah Smith rm32 did NOT request towels.

FINAL:
Towels → Margaret Smith rm27 only.


IDENTITY TEST — FIRST NAME ONLY

“Sarah asked reception for 06:00 wake-up.”

Hotel has:
Sarah Smith rm32
Sarah Jones rm40

20:00 clarification:
Wake-up belongs to Sarah JONES rm40.

FINAL:
Wake-up 06:00 → Sarah Jones rm40.

Do not attach wake-up to Sarah Smith.


IDENTITY TEST — BOOKING REFERENCE OVERRIDES NAME TYPO

OTA message:
“Davd Patel requires Twin.”

Booking reference = EXP-7715.

Name typo: Davd Patel.

EXP-7715 belongs to David Patel rm14.

FINAL:
Treat Davd Patel as David Patel because reservation reference matches.
Do NOT create a new guest called Davd Patel.


IDENTITY TEST — ROOM NUMBER ERROR

18:00:
“Jennifer Lee rm31 late checkout 13:00.”

19:00 Correction:
Jennifer Lee is rm33.
Andrew Lee is rm31.

FINAL:
Late checkout → Jennifer Lee rm33.
Minibar £28 → Andrew Lee rm31.

The earlier room number was wrong.


IDENTITY TEST — FAMILY

Singh family:
Parents = rm28.
Children = rm29.

Note:
“Singh needs sofa bed.”

19:00 clarification:
Sofa bed is for CHILDREN'S ROOM rm29.

FINAL:
Sofa bed → rm29 only.
Do not create sofa bed in rm28.


IDENTITY TEST — GUEST VS ROOM ISSUE

Guest Michael Reed moved:
rm26 → rm30.

Reason:
rm26 shower leak.

FINAL:
Michael Reed now belongs to rm30.
Shower leak remains attached to rm26.

Do NOT move the maintenance issue to rm30.


IDENTITY TEST — UNRESOLVED AMBIGUITY

Note:
“Mr Brown wants newspaper at 06:30.”

Hotel currently has:
Peter Brown rm15
George Brown rm37

No booking reference.
No first name.
No later clarification.

FINAL:
HF should NOT guess.

This should become something like:
“Brown — Newspaper 06:30; guest/room requires confirmation.”

Do not randomly assign rm15 or rm37.


IDENTITY TEST — COMPLETED REQUEST

“Mrs Green asked for champagne.”

Later clarification:
Helen Green rm19.

20:00 F&B:
Champagne delivered rm19.

FINAL:
Helen Green rm19 — COMPLETE.

Do not create another champagne action for Robert Green rm18.


IDENTITY TEST — STAFF VS GUEST

James Wilson from Maintenance inspected rm25 at 19:30.

This James Wilson is a STAFF MEMBER.

He is NOT:
James Wilson rm21
or
James Wilson HF-9931.

Do not create guest information from this staff reference.

### Hotel Snapshot
Stored Hotel Snapshot values from `metrics.hotelSnapshot`:

- Arrivals: 8
- Departures: 6
- Sellable Rooms: 80
- OOO Rooms: 0

Snapshot fields present but blank/sparse (not invented): RevPAR, RevPAR (value).

## Expected Current Truth
- Tonight **James Wilson HF-7812 rm21**: business traveller, quiet room, POA £185 — not anniversary/flowers (those belong to tomorrow Wilson HF-9931).
- **Sarah Smith 32** pillows **done** ≠ **Margaret Smith 27** towels.
- **David Patel 14** twin + **prepaid** (do not chase Expedia) ≠ **Daniel Patel 41** AC.
- **Emily Brown FINAL 36** (maint issue stays on **25**).
- Champagne → **Helen Green 19** only (delivered); do not amenitize **Robert Green 18**.
- Sophie Clarke BK-1190 cot with **no invented room**.
- John Taylor ≠ Jonathan Taylor; Andrew Lee **31** £28 minibar ≠ Jennifer Lee **33** late c/o.
- Garcia taxi = Maria **24**; Evans invoice = room **17**; wake 06:00 → **Sarah Jones 40**.
- Sofa bed → Singh children **29**; Reed now **30**, leak stays **26**.
- Ambiguous “Brown newspaper” → **do not guess** room 15 vs 37.
- Staff James Wilson ≠ any guest Wilson.

## Expected Important Actions
1. Collect POA Wilson 21; twin prep Patel 14 (prepaid — no chase).
2. Emily arrival prep on **36** only; champagne already done Helen 19.
3. Set wake Jones **40**; bind Lee minibar/late c/o correctly.
4. Sophie cot without inventing a room; leave Brown newspaper ambiguous.
5. Do **not** anniversary-amenitize tonight Wilson or champagne Robert 18.

## Actual HF Output

Recovered from saved `generated_handover` / `recommendation_state` / `metrics` at save time. Wording below is from the historical record (not re-run).

### Output metadata
- Saved date display: Friday, 7 August 2026
- Generated/saved timestamp (from record): 2026-08-07T18:09:50.006Z
- Checklist state: none saved / empty

### AI Summary / Today's Briefing
Priority 1
Follow up with Maintenance regarding AC fault before further guest impact.

Priority 2
Timed departure actions for Room 40: wake-up at 06:00.

Priority 3
Revenue follow-up required for Room 31 outstanding £28 before departures.

Priority 4
VIP readiness follow-up for Robert Green in Room 18 — champagne.

Priority 5
Complete outstanding guest follow-up for Room 14.

### Organised Handover Sections
#### Urgent / Shift Alerts
_No items_

#### VIP
_No items_

#### Guest Follow-up (13)
- Room 40 – Wake-up call at 06:00.
- Room 27 – Additional towels requested.
- Room 31 – Late check-out noted for 13:00.
- Room 32 – Extra pillows requested.
- Room 33 – Late check-out noted.
- Room 36 – Guest requested a room move if available.
- Guest requested a room move if available.
- Late check-out confirmed for 13:00.
- Departure 06:30.
- Departure 11:00.
- Reservation HF-6630.
- Rachel requested invoice emailed to.
- Guest requesting it is Rachel.

#### Maintenance (5)
- AC issue reported.
- Room 26 – Shower leak open.
- Maintenance follow-up is required for Room 25.
- Room 30 – Do NOT move the maintenance issue to.
- Requests quiet room away from lift.

#### Payments / Finance (3)
- Room 14 – An outstanding Expedia payment for David Patel Expedia- still needs to be collected.
- Room 31 – A minibar charge of £28 requires review.
- Outstanding balance of £28. remains on the account.

#### Outstanding Tasks
_No items_

#### Events / Timeline (7)
- This is an OLD note referring to Emily Brown's original allocation.
- Room allocation currently UNKNOWN.
- There is another James Wilson arriving tomorrow.
- Arrival TOMORROW 8 August.
- Room 32 – Do NOT associate this request with Sarah Smith.
- Room 36 – All arrival preparations for Emily belong to.
- Treat Davd Patel as David Patel because reservation reference matches.

#### Preparations (27)
- Tomorrow James Wilson
- ☐ Flowers
- Mrs Green
- ☐ Champagne
- James Wilson — Room 21
- ☐ “Mr Wilson rm21 anniversary prosecco.” | Anniversary request belongs to tomorrow's…
- Review original note
- ☐ Welcome amenities
- ☐ Extra bed
- ☐ Flowers
- ☐ Sofa bed
- Robert Green — Room 18
- ☐ Champagne
- David Patel — Room 14
- ☐ Twin setup if available
- David Patel’s Twin
- ☐ Twin setup if available
- Champagne Delivered — Room 19
- ☐ Champagne
- Guest Patel
- ☐ Twin setup if available
- Davd Patel
- ☐ Twin setup if available
- Room 29
- ☐ Sofa bed
- Room 28
- ☐ Sofa bed

#### Completed Actions (3)
- Preparation complete.
- COMPLETE.
- COMPLETED REQUEST.

#### Inventory
_No items_

#### Deliveries
_No items_

#### Lost Property
_No items_

#### Open Questions
_No items_

#### General / Operational Notes (132)
- Room 17 – Invoice request belongs to / Evans reservation.
- Room 21 – Tonight James Wilson = business traveller, quiet room request.
- Do not create a separate room/reservation for Rachel.
- FINAL CURRENT ROOM = 36.
- Room relocation.
- ROOM NUMBER ERROR.
- GUEST VS ROOM ISSUE.
- Newspaper 06:30; guest/room requires confirmation.”.
- Room not allocated yet.
- Do not assume Robert's room.
- Do NOT invent a room number.
- Action should remain attached to Sophie / BK-1190 until room allocated.
- Partner Rachel Evans staying in same room.
- The earlier room number was wrong.
- UNRESOLVED AMBIGUITY.
- James Wilson.
- Room 21 – Rm21.
- ETA 23:30.
- Booking ref HF-7812.
- Business traveller.
- POA £185.
- IMPORTANT.
- Do NOT merge them.
- Booking ref HF-9931.
- Room 21 – This is a DIFFERENT guest from James Wilson tonight.
- Sarah Smith.
- Room 32 – Rm32.
- ETA 00:15.
- Booking ref BK-4418.
- Travelling alone.
- 18:00 HK.
- FINAL.
- Mrs Smith.
- Room 27 – Rm27.
- Already IN HOUSE.
- Full name: Margaret Smith.
- 19:00.
- David Patel.
- Room 14 – Rm14.
- ETA 01:00.
- An outstanding Expedia payment still needs to be collected.
- 19:00 Reception.
- Daniel Patel.
- Room 41 – Rm41.
- Different guest.
- Emily Brown.
- Room 25 – Originally.
- Booking ref HF-5541.
- 18:00.
- 19:00 HK.
- Room 36 – Ready.
- Room 25 – Do not show Emily as occupying/preparing.
- Robert Green + Helen Green.
- Booking HF-8871.
- Room 18 – + 19.
- Married couple travelling together.
- Room 18 – Robert =.
- Room 19 – Helen =.
- Guest called.
- Sophie Clarke.
- Booking ref BK-1190.
- ETA 00:45.
- John Taylor.
- Room 11 – .
- Jonathan Taylor.
- Room 22 – .
- These are TWO DIFFERENT guests.
- Do not merge John and Jonathan Taylor.
- Room 31 – Rm31.
- Full name = Andrew Lee.
- Room 33 – Rm33.
- Ms Lee.
- Full name = Jennifer Lee.
- Guest = Maria Garcia.
- Room 24 – .
- Later note says.
- Room 24 – This refers to Maria Garcia.
- Do not create a second Garcia guest/task.
- Room 17 – Rm17.
- Booking under Thomas Evans.
- Rachel@example.test.
- IDENTITY TEST.
- Room 36 – Emily →.
- WRONG GUEST CORRECTION.
- 18:00 note.
- 19:00 Reception correction.
- WRONG WILSON.
- SAME SURNAME.
- Ambiguous note.
- Later clarification.
- FIRST NAME ONLY.
- Hotel has.
- Room 32 – Sarah Smith.
- Room 40 – Sarah Jones.
- 20:00 clarification.
- BOOKING REFERENCE OVERRIDES NAME TYPO.
- An outstanding Expedia payment still needs to be collected.
- Name typo: Davd Patel.
- Room 14 – An outstanding Expedia payment for David Patel still needs to be collected.
- Do NOT create a new guest called Davd Patel.
- 19:00 Correction.
- Room 33 – Jennifer Lee is.
- Room 31 – Andrew Lee is.
- FAMILY.
- Singh family.
- Room 28 – Parents =.
- Room 29 – Children =.
- Note.
- 19:00 clarification.
- Rooms 26, 30 – Rm26 → rm30.
- Reason.
- Room 30 – Michael Reed now belongs to.
- “Mr Brown wants newspaper at 06:30.”.
- Hotel currently has.
- Room 15 – Peter Brown.
- Room 37 – George Brown.
- No booking reference.
- No first name.
- No later clarification.
- HF should NOT guess.
- This should become something like.
- “Brown.
- Rooms 15, 37 – Do not randomly assign rm15 or rm37.
- Room 19 – Helen Green. | Helen Green.
- 20:00 F&B.
- STAFF VS GUEST.
- This James Wilson is a STAFF MEMBER.
- He is NOT.
- Room 21 – James Wilson.
- Or.
- James Wilson HF-9931.
- Do not create guest information from this staff reference.

### Recommendations
1. Follow up with Maintenance regarding AC. The fault remains open and needs resolution this shift. _(priority: urgent)_ _(owner: Maintenance)_
2. Follow up with Maintenance regarding Room 26 shower/leak. The fault remains open and needs resolution this shift. _(priority: high)_ _(owner: Maintenance)_
3. Complete the 06:00 wake-up call — wake-up call not yet confirmed as loaded this shift. _(priority: high)_ _(owner: Reception)_
4. Complete the 06:00 wake-up call for Room 40 — wake-up call not yet confirmed as loaded this shift. _(priority: high)_ _(owner: Reception)_
5. Collect outstanding Expedia payment before departure. _(priority: high)_ _(owner: Reception)_
6. Prepare VIP arrival for Mrs Green — champagne. Verify room allocation before arrival. _(priority: high)_ _(owner: Reception)_

## Observed Positives
- Many identity clarifications retained in General (different Wilsons/Patels/Lees/Taylors; Sophie no room; Brown ambiguity; staff vs guest Wilson).
- Wake sometimes correctly attached to room **40**.
- Some “do not invent / do not merge” doctrine text survives in the dump.

## Observed Failures
- Briefing Priority 4 = VIP champagne for **Robert Green 18** (belongs to Helen 19, already delivered).
- Priority 3 revenue on **31** £28; late c/o shown on **31** (wrong Lee — Jennifer is **33**).
- Payments chase Expedia Patel (prepaid) + duplicate £28.
- Preparations: anniversary/prosecco noise on tonight Wilson; champagne ☐ for Robert/Mrs Green after delivery; twin duplicated including “Davd”; sofa on **28+29**.
- Emily move / old allocation fragments still open in follow-up.
- Recs: collect Expedia; prepare VIP champagne Mrs Green; AC/leak templates.
- Ambiguous Brown newspaper not held as unresolved — risk of wrong-room guess elsewhere in noise.
- 132-line General dump — identity rules stated but not applied to briefing/recs.

## Failure Tags
`entity-resolution` · `ambiguous-entity` · `source-of-truth` · `state-resolution` · `payment-state` · `completed-as-open` · `prioritisation` · `recommendation-quality` · `compression` · `presentation`

## Operational Risk
**Critical** — Wrong-guest amenities, payments, wake/room binding, and invented prep.

## Status
**Failed**

## Notes
Tester review completed from recovered CSV evidence (input vs saved HF output). Historical input/output preserved above.
