# Scenario-015 — Amelia Stone — Final Operational State

## Test Metadata
- Date tested: 2026-08-07
- Hotel: Hotel Pilot
- Shift: AM
- Record id: c6174a63-cc41-486c-97bd-8ee7a0aabd63
- created_at: 2026-08-07 18:08:28.76588+00
- Scenario focus: Contradiction / final operational state (Amelia Stone, rm42)
- HF version/commit: [NOT RECORDED]
- Workspace id: 090ec1b9-2c03-41ac-a4ea-19c412f7da37
- Prepared by: Not specified
- Evidence source: `testing/pilot-hotel/exports/pilot-hotel-scenarios-001-020.csv` (Supabase saved handover; not re-generated)

## Original Input

### Today's Arrivals
VIP Amelia Stone rm42 arriving 23:30.
Repeat guest.

17:10 Reception:
ETA 22:00.

18:40 Guest email:
Flight delayed. New ETA around 00:30.

20:15 Guest called:
Actually landed early, expects hotel approx 23:45.

FINAL CURRENT ETA = approx 23:45.

Guest originally requested champagne.

18:00 F&B:
Champagne unavailable, prosecco offered instead.

18:20 Reception:
Guest accepted prosecco.

20:00 F&B:
Prosecco placed rm42.

FINAL:
Arrival approx 23:45.
Prosecco COMPLETE.
Do not show champagne as outstanding.
Do not show three different ETAs as equally valid.


Daniel Cooper rm31.

Original booking:
Double room.

16:00 guest called asking if Twin possible.

17:00 Reception:
Twin requested from HK.

18:30 HK:
Twin configuration possible.

19:20 Reception:
Guest called again — no longer needs Twin, DOUBLE is fine.

FINAL ROOM SETUP = DOUBLE.
Do NOT request Twin.
Old Twin request is superseded.


Sarah Williams originally rm24.

17:00:
Allocated rm24.

18:10:
Maintenance reported AC fault rm24.

18:30:
Reception moved arrival to rm27.

19:15:
HK confirmed rm27 ready.

FINAL ROOM = 27.
Room 24 is NOT Sarah's current room.
Do not create preparations for Sarah in both rooms.


Michael Brown rm18.

Booking note:
POA £240.

18:00 Reception:
Payment still required.

20:10 Finance:
Company contacted hotel and authorised company billing.

20:30:
£240 transferred to company ledger.

FINAL:
Guest owes £0 on arrival.
Do NOT collect £240.
Do not show both POA and company billing as current truth.


Emma Roberts rm35 ETA 01:00.

Original note:
Baby cot required.

19:00:
Guest emailed saying cot NOT needed anymore.

FINAL:
No cot required.
Do not create cot preparation.

### Today's Departures
rm12 Thompson.

Original departure time 11:00.

17:30 Reception:
Guest requested late checkout 13:00.

18:00 DM:
Approved until 13:00.

20:15 Guest:
Plans to leave around 12:00 instead.

FINAL:
Expected departure around 12:00.
Late checkout remains approved until 13:00.

Do not treat 11:00, 12:00 and 13:00 as three separate departures.


rm16 Patel.

Original balance £85.

18:00:
Reception says £85 outstanding.

19:10:
Guest paid £50.

Balance = £35.

20:20:
Guest paid remaining £35.

FINAL BALANCE = £0.
Do not collect £85.
Do not collect £35.
Payment COMPLETE.


rm22 Wilson.

Original taxi:
06:30.

18:00 Guest:
Changed taxi to 07:00.

19:00 Concierge:
07:00 taxi confirmed.

20:30 Guest:
Changed mind again — wants 06:45.

20:45 Concierge:
06:45 taxi confirmed and old 07:00 booking cancelled.

FINAL TAXI = 06:45.
Do not show 06:30 or 07:00 as active.


rm28 Garcia.

Original wake-up request:
05:30.

19:30 Guest:
Changed to 06:00.

21:00 Guest:
Cancelled wake-up completely.

FINAL:
NO WAKE-UP.
Do not create wake-up action.

### General Hotel / Shift Notes
ROOM 14 — LEAK

17:00 HK:
Water leaking under bathroom sink.

17:15 Reception:
Maintenance called.

18:00 Maintenance:
Leak still active, waiting for part.

19:20 Maintenance:
Part fitted. Leak stopped.

20:00 HK:
Bathroom checked and dried.

FINAL:
RESOLVED.
No active leak.
No urgent maintenance action.


ROOM 26 — TV

17:30 Guest:
TV not working.

18:00 Reception:
Maintenance requested.

18:40 Maintenance:
Unable to fix tonight.
Replacement TV required tomorrow.

19:30 Reception:
Guest says TV started working again after restart.

20:00 Maintenance:
Remote diagnostic shows TV functioning normally.
Tomorrow replacement CANCELLED.

FINAL:
TV currently working.
No replacement required.
Monitor only if guest reports issue again.


ROOM 33 — NOISE

18:00 Guest complained about noise from rm34.

18:15 Reception spoke to rm34.

18:30:
Noise continued.

18:40 DM considered moving rm33.

19:00:
Alternative rm41 offered.

19:10 Guest:
Does NOT want to move.

19:30:
Noise stopped.

20:15 Guest:
Confirmed everything is fine now.

FINAL:
Guest remains rm33.
No room move.
Complaint RESOLVED.
Do not show rm41 as guest's room.


ROOM 40 — OOO STATUS

16:00 Maintenance:
Room 40 OOO due plumbing issue.

18:00:
Repair completed.

18:30 HK:
Room cleaned and checked.

19:00 DM:
Room returned to service.

FINAL:
Room 40 is NOT OOO anymore.
Available for sale.


ROOM 21 — MINIBAR

17:00 Reception:
£42 minibar outstanding.

18:00 Guest disputes charge.

18:30 HK:
Confirmed minibar was NOT consumed; posting error.

19:00 Reception:
Charge removed.

FINAL:
£0 outstanding.
Do not chase payment.


ROOM 29 — EXTRA BED

Original request:
Extra bed required.

18:00 HK:
Extra bed placed.

19:30 Guest:
Doesn't need it anymore.

20:00 HK:
Extra bed removed.

FINAL:
NO extra bed required.
Task COMPLETE.


VIP ROOM 36

Original note:
Flowers + champagne + handwritten card.

18:00 Management:
Changed amenity plan.

FINAL approved amenity:
Flowers + handwritten card ONLY.
NO champagne.

19:30:
Flowers delivered.

20:00:
Card written and placed.

FINAL:
ALL approved amenities COMPLETE.
Champagne was cancelled.
Do not recommend champagne.


ROOM 25 — MAINTENANCE CONTRADICTION

17:00 Reception:
"AC completely broken."

17:30 Maintenance:
Checked AC — cooling but noisy.

18:00 Guest:
Room temperature is fine, noise annoying.

19:00 Maintenance:
Adjusted fan.

19:30 Guest:
Noise improved and happy to stay.

FINAL:
AC is functioning.
Issue resolved sufficiently for guest.
Do NOT classify as "AC broken".
No room move required.


STAFFING

17:00:
Night porter James called sick.

17:30 DM:
Agency contacted.

18:30:
Agency said no replacement available.

19:00:
Alex agreed overtime to cover Night Porter.

FINAL:
Shift COVERED by Alex.
Do not show staffing shortage as unresolved.
Do not recommend contacting agency again.


GROUP ARRIVAL

Original:
Group ETA 22:00, 10 rooms.

18:00:
Coach delayed until approximately 00:30.

19:00:
Group organiser says only 8 rooms now arriving tonight.
2 guests arrive tomorrow.

20:30:
Coach update ETA 00:10.

FINAL:
Tonight = 8 rooms.
ETA approx 00:10.
Remaining 2 rooms = tomorrow.

Do not report 10 arrivals tonight.
Do not show 22:00, 00:30 and 00:10 as separate active ETAs.

### Hotel Snapshot
Stored Hotel Snapshot values from `metrics.hotelSnapshot`:

- Arrivals: 10
- Departures: 13
- Sellable Rooms: 80
- OOO Rooms: 0

Snapshot fields present but blank/sparse (not invented): RevPAR, RevPAR (value).

## Expected Current Truth
- Amelia **42**: ETA **~23:45**; **prosecco DONE** (not champagne).
- Cooper setup = **DOUBLE** (twin superseded).
- Sarah **FINAL 27** (not 24).
- Brown **£0** company billing.
- Emma **no cot**.
- Thompson leave ~**12:00** (approved to 13:00).
- Patel **£0**; Wilson taxi **06:45**; Garcia **no wake**.
- Leak **14** resolved; TV **26** working (replacement cancelled); noise **33** resolved stay; **40 NOT OOO**; minibar **21 £0**; extra bed removed; VIP **36** flowers+card **complete** (champagne cancelled); AC **25** OK for guest; staffing **covered**; group **8 rooms** ETA **~00:10** (2 tomorrow).

## Expected Important Actions
1. Receive Amelia ~23:45 (prosecco ready).
2. Cooper as double; Sarah to **27**.
3. Group ~00:10 (8 rooms); Wilson taxi 06:45 awareness.
4. Do **not** collect £240/£85/£42, prepare twin/cot/champagne, show 40 OOO, reopen resolved noise/TV/leak, or re-contact agency.

## Actual HF Output

Recovered from saved `generated_handover` / `recommendation_state` / `metrics` at save time. Wording below is from the historical record (not re-run).

### Output metadata
- Saved date display: Friday, 7 August 2026
- Generated/saved timestamp (from record): 2026-08-07T18:08:27.925Z
- Checklist state: none saved / empty

### AI Summary / Today's Briefing
Priority 1
Follow up with Maintenance regarding Room 24 AC fault before further guest impact.

Priority 2
Revenue follow-up required for outstanding £240 before departures.

Priority 3
VIP readiness follow-up for Room 36.

### Organised Handover Sections
#### Urgent / Shift Alerts
_No items_

#### VIP
_No items_

#### Guest Follow-up (10)
- Taxi booked.
- Room 27 – Guest requested a room move if available.
- Room 33 – Guest requested a room move if available.
- Late check-out confirmed for 13:00.
- Guest requested a room move if available.
- Original departure time 11:00.
- Expected departure around 12:00.
- Do not treat 11:00, 12:00 and 13:00 as three separate departures.
- Room 34 – The guest has raised a complaint regarding noise.
- Original request.

#### Maintenance (7)
- Room 24 – AC issue reported.
- AC not cooling.
- Bathroom leak open. From previous shift.
- Room 40 – OOO due plumbing issue.
- Flight delayed. // Unable to fix tonight.
- Maintenance called. | 18:00 Maintenance: | 19:20 Maintenance: | No urgent maintenance action. | 18:40 Maintenance: | 20:00 Maintenance: | 16:00 Maintenance: | MAINTENANCE CONTRADICTION | 17:30 Maintenance: | 19:00 Maintenance: | Maintenance called. | 18:00 Maintenance: | 19:20 Maintenance: | No urgent maintenance action. | 18:40 Maintenance: | 20:00 Maintenance: | 16:00 Maintenance: | MAINTENANCE CONTRADICTION | 17:30 Maintenance: | 19:00 Maintenance: | Maintenance requested. // Repair completed.
- TV remote not working. Guest needs a replacement.

#### Payments / Finance (2)
- Outstanding balance of £240. remains on the account.
- Room 21 – A minibar charge requires review.

#### Outstanding Tasks
_No items_

#### Events / Timeline (6)
- Arrival approx 23:45.
- £240 transferred to company ledger.
- Guest owes £0 on arrival.
- GROUP ARRIVAL.
- Group organiser says only 8 rooms now arriving tonight.
- Do not report 10 arrivals tonight.

#### Preparations (10)
- Review original note
- ☐ Champagne
- ☐ Flowers
- ☑ Welcome amenities
- ☐ Extra bed
- ☐ Twin setup if available
- Old Twin
- ☐ Twin setup if available
- FINAL
- ☐ FINAL ROOM SETUP = DOUBLE.

#### Completed Actions (6)
- Issue resolved sufficiently for guest.
- Payment COMPLETE.
- Prosecco COMPLETE.
- Task COMPLETE.
- The guest has raised a complaint.
- RESOLVED.

#### Inventory
_No items_

#### Deliveries
_No items_

#### Lost Property
_No items_

#### Open Questions
_No items_

#### General / Operational Notes (129)
- Room 14.
- Room 24 – Is NOT Sarah's current room.
- Room 25.
- Room 26.
- Room 29.
- Room 33.
- Room 40.
- Room 40 – Is NOT OOO anymore.
- Room 41 – Do not show as guest's room.
- Double room.
- FINAL ROOM = 27.
- No room relocation.
- Room cleaned and checked.
- Room returned to service.
- Room temperature is fine, noise annoying.
- No room relocation required.
- Do not show staffing shortage as unresolved.
- Repeat guest.
- 17:10 Reception.
- ETA 22:00.
- 18:40 Guest email.
- New ETA around 00:30.
- 20:15 Guest called.
- Actually landed early, expects hotel approx 23:45.
- FINAL CURRENT ETA = approx 23:45.
- 18:00 F&B.
- 18:20 Reception.
- Guest accepted prosecco.
- 20:00 F&B.
- Room 42 – Prosecco placed.
- FINAL.
- Do not show three different ETAs as equally valid.
- Room 31 – Daniel Cooper.
- Original booking.
- 17:00 Reception.
- 18:30 HK.
- 19:20 Reception.
- Guest called again.
- Room 24 – Sarah Williams originally.
- 17:00.
- Room 24 – Allocated.
- 18:10.
- 18:30.
- 19:15.
- Room 27 – Housekeeping confirmed ready.
- Do not create preparations for Sarah in both rooms.
- Room 18 – Michael Brown.
- Booking note.
- POA £240.
- 18:00 Reception.
- 20:10 Finance.
- 20:30.
- Room 35 – Emma Roberts ETA 01:00.
- Original note.
- 19:00.
- Room 12 – Thompson.
- 17:30 Reception.
- 18:00 DM.
- Approved until 13:00.
- 20:15 Guest.
- Plans to leave around 12:00 instead.
- Room 16 – Patel.
- 18:00.
- 19:10.
- 20:20.
- Room 22 – Wilson.
- 06:30.
- 18:00 Guest.
- 19:00 Concierge.
- 20:30 Guest.
- Changed mind again.
- Wants 06:45.
- 20:45 Concierge.
- Do not show 06:30 or 07:00 as active.
- Room 28 – Garcia.
- 05:30.
- 19:30 Guest.
- Changed to 06:00.
- 21:00 Guest.
- 17:00 HK.
- 17:15 Reception.
- 20:00 HK.
- 17:30 Guest.
- 19:30 Reception.
- Tomorrow replacement CANCELLED.
- No replacement required.
- Monitor only if guest reports issue again.
- NOISE.
- Room 34 – 15 Reception spoke to.
- Noise continued.
- Room 41 – Alternative offered.
- 19:10 Guest.
- 19:30.
- Noise stopped.
- Confirmed everything is fine now.
- Room 33 – Guest remains.
- OOO STATUS.
- 19:00 DM.
- Available for sale.
- 18:00 Guest disputes charge.
- 19:00 Reception.
- Charge removed.
- 18:00 HK.
- Doesn't need it anymore.
- 18:00 Management.
- 20:00.
- Card written and placed.
- Cooling but noisy.
- Adjusted fan.
- Noise improved and happy to stay.
- STAFFING.
- Night porter James called sick.
- 17:30 DM.
- Agency contacted.
- Agency said no replacement available.
- Alex agreed overtime to cover Night Porter.
- Shift COVERED by Alex.
- Do not recommend contacting agency again.
- Original.
- Group ETA 22:00, 10 rooms.
- Coach delayed until approximately 00:30.
- 2 guests arrive tomorrow.
- Coach update ETA 00:10.
- Tonight = 8 rooms.
- ETA approx 00:10.
- Remaining 2 rooms = tomorrow.
- Do not show 22:00, 00:30 and 00:10 as separate active ETAs.
- Guest paid £50.
- Guest paid remaining £35.

### Recommendations
1. Follow up with Maintenance regarding Room 24 AC. The fault remains open and needs resolution this shift. _(priority: urgent)_ _(owner: Maintenance)_
2. Collect outstanding £85 balance before departure. _(priority: high)_ _(owner: Reception)_
3. Collect minibar charge for Room 21 before departure. _(priority: high)_ _(owner: Reception)_
4. Complete VIP Room 42 preparation for Amelia Stone before arrival. _(priority: high)_ _(owner: Reception)_
5. Complete VIP Room 36 requirements this shift. _(priority: high)_ _(owner: Reception)_
6. Follow up with Maintenance regarding Maintenance called. | 18:00 Maintenance: | 19:20… this shift. _(priority: normal)_ _(owner: Maintenance)_

## Observed Positives
- Many FINAL sentences survive in General (ETA 23:45, company £0, 40 not OOO, group 8 @ 00:10, staffing covered).
- Prosecco marked complete in places.

## Observed Failures
- Briefing: **24 AC** + collect **£240** + VIP **36** readiness.
- Payments still £240 + minibar **21**. Maint shows **40 OOO** and leak/TV noise.
- Preparations still champagne/twin.
- Recs collect **£85** and minibar **21**, VIP prep **42** and **36**.
- Snapshot **Arrivals: 10** vs final 8 tonight.
- 129-line contradiction archive instead of one current state board.

## Failure Tags
`source-of-truth` · `state-resolution` · `payment-state` · `completed-as-open` · `room-status` · `prioritisation` · `recommendation-quality` · `compression` · `hotel-snapshot` · `deduplication` · `presentation`

## Operational Risk
**Critical** — Final operational state repeatedly overwritten by superseded intermediates.

## Status
**Failed**

## Notes
Tester review completed from recovered CSV evidence (input vs saved HF output). Historical input/output preserved above.
