# Scenario-010 — Helen Morris — Maintenance Escalation

## Test Metadata
- Date tested: 2026-08-07
- Hotel: Hotel Pilot
- Shift: AM
- Record id: 9fc00e20-bc06-4b66-85df-09d71c49f0b0
- created_at: 2026-08-07 17:58:58.429646+00
- Scenario focus: Maintenance severity / escalation (Helen Morris, rm24)
- HF version/commit: [NOT RECORDED]
- Workspace id: 090ec1b9-2c03-41ac-a4ea-19c412f7da37
- Prepared by: Not specified
- Evidence source: `testing/pilot-hotel/exports/pilot-hotel-scenarios-001-020.csv` (Supabase saved handover; not re-generated)

## Original Input

### Today's Arrivals
Helen Morris rm24 ETA 21:30.
Room originally ready.

UPDATE 19:20 - bathroom ceiling started leaking.
Room removed from service.
Guest reallocated to rm34.
FINAL ROOM = 34.
Guest has not been informed yet.

---

VIP Jonathan Reed rm42 ETA 22:45.
Room inspected and ready.
AC working normally.
Welcome card placed.
No maintenance issue.

---

Lucy Evans rm18 ETA around midnight.
Room ready.
Previous guest reported bedside lamp flickering yesterday.
Engineering replaced bulb today 15:00.
Issue RESOLVED.

---

Peter Collins rm31 ETA 23:30.
Room ready.
Small scratch on wardrobe door noted by HK.
Cosmetic only.
No guest impact and no action tonight.

---

Ahmed Ali rm27 ETA 01:00.
Shower checked and working.
No outstanding maintenance.

### Today's Departures
rm12 Brown checked out.
Guest reported bathroom extractor fan noisy.
Maintenance inspection required tomorrow.
Room remains IN SERVICE.

rm21 Wilson checked out.
Safe battery was low.
Battery replaced by maintenance at 17:00.
RESOLVED.

rm35 Thompson departing tomorrow.
Guest says room feels slightly cold.
Portable heater offered and accepted.
Guest comfortable now.
Engineering to inspect heating tomorrow.
Do NOT move guest unless situation worsens.

rm8 Clark checked out.
Broken wine glass reported.
Housekeeping cleared it safely.
No maintenance action.

rm16 Harris checked out.
Nothing outstanding.

### General Hotel / Shift Notes
MAINTENANCE STATUS 20:45:

URGENT - WATER LEAK near electrical socket in corridor outside rm26.

At 20:05 HK noticed water running down wall close to socket.

Duty manager attended.
Area immediately blocked from guest access.

Engineering called 20:08.

UPDATE 20:20 - power isolated to affected corridor sockets.

UPDATE 20:35 - engineer traced leak to pipe above ceiling.

Water supply isolated.

No guest injury.

Engineer confirms immediate electrical risk controlled.

BUT:
Area must remain blocked.
Sockets must remain isolated.
Do NOT restore power.
Morning maintenance manager must attend before area reopened.

This incident is SAFE/STABLE now but remains HIGH PRIORITY operationally.

---

rm24 ceiling leak.

Leak became heavy around 19:20.
No guest currently inside.

Room placed OOO.

Guest Helen Morris moved to rm34 before arrival.

UPDATE 20:15 - water isolated.
Leak stopped.

Room 24 remains OOO until inspection/repair tomorrow.

Do NOT put room back into service.

---

rm41 AC completely failed.

Room currently vacant.

Engineer checked 19:30.
Needs replacement part tomorrow.

Room 41 OOO tonight.

---

rm33 shower draining slowly.

Guest staying in room.

Engineering checked.
Drain cleared 20:00.

Guest tested shower and confirmed okay.

RESOLVED.
Room remains IN SERVICE.

No follow-up unless problem returns.

---

rm35 heating complaint.

Guest said room cold earlier.
Portable heater delivered.
Guest confirmed comfortable at 20:30.

Room remains IN SERVICE.

Maintenance inspection tomorrow.

This is NOT an emergency and room is NOT OOO.

---

rm12 extractor fan noisy.

No guest currently in room.
Room can still be sold.
Maintenance tomorrow.
LOW priority.

---

Lobby men's WC hand dryer broken.

Paper towels provided.

Maintenance logged for tomorrow.

LOW guest impact.
WC remains OPEN.

---

Restaurant ceiling light number 4 not working.

Other lighting working normally.

Cosmetic / LOW priority.

---

Front entrance automatic door stopped closing properly at 18:30.

Staff had to manually close it.

UPDATE 19:00 - engineer adjusted sensor.

UPDATE 19:10 - tested repeatedly and working normally.

RESOLVED.

Do NOT create outstanding maintenance task.

---

Lift 1 displayed error message at 17:45.

Engineer reset system 18:10.

Lift tested with staff.

Working normally since.

RESOLVED.

No restriction currently.

---

Kitchen reported smell of gas around 19:40.

IMPORTANT:

Duty manager attended immediately.
Kitchen gas supply isolated.
Fire panel normal.
No guests affected.

Gas engineer arrived 20:10.

UPDATE 20:40 - engineer found loose connection on appliance.

Appliance isolated.

Engineer confirmed NO ongoing gas leak.

Main kitchen gas supply safely restored.

One appliance remains OUT OF SERVICE and labelled DO NOT USE.

Kitchen otherwise operational.

F&B manager informed.

Morning engineer follow-up required on isolated appliance.

Do NOT describe hotel as having an active gas leak.

---

Housekeeping vacuum cleaner broken.
Spare vacuum available.
No operational impact.

---

rm29 TV remote missing.
Guest given replacement.
RESOLVED.

---

rm37 minibar fridge noisy.
Guest says not bothering them.
Maintenance tomorrow.
LOW priority.

---

IMPORTANT ROOM STATUS:

OOO tonight:
rm24 - ceiling leak
rm41 - AC failure

TOTAL OOO = 2.

rm26 is NOT OOO.
Issue is corridor outside room; guest access route adjusted.

rm35 is NOT OOO.
rm33 is NOT OOO.
rm12 is NOT OOO.

Do not convert every maintenance issue into OOO.

---

PRIORITY CONTEXT:

Highest operational concern:
corridor rm26 water/electrical incident.
Risk currently controlled but restrictions remain.

Kitchen gas incident was serious but immediate leak is resolved.
One appliance remains isolated and requires follow-up.

rm24 + rm41 remain OOO.

Everything else should be prioritised according to current guest impact and whether action is actually required tonight.

### Hotel Snapshot
Stored Hotel Snapshot values from `metrics.hotelSnapshot`:

- Sellable Rooms: 80
- OOO Rooms: 0

Snapshot fields present but blank/sparse (not invented): RevPAR, RevPAR (value).

## Expected Current Truth
- Helen final **rm 34** (not informed yet); **24 OOO** leak isolated — stay OOO.
- Reed **42** ready — no maint issue.
- **Highest concern:** corridor outside **26** water/electrical — risk controlled but **area blocked, sockets isolated, do not restore power**; morning manager before reopen.
- Kitchen gas: immediate leak **resolved**; one appliance **OOS**; do **not** say active gas leak.
- OOO tonight = **24 + 41** only (total 2).
- **Resolved / low:** lamp 18; safe battery; glass; door sensor; Lift 1; shower 33 cleared; remote 29; vacuum spare.
- **Tomorrow/low:** 12 fan, WC dryer, light, 37 fridge noise; 35 heating inspect (guest comfortable, **not** OOO).

## Expected Important Actions
1. Protect corridor electrical restrictions.
2. Keep 24/41 OOO; inform Helen of **34**.
3. Morning follow-ups (corridor, kitchen appliance, 24/41).
4. Do **not** escalate resolved/low items or invent payment for 37 fridge noise.

## Actual HF Output

Recovered from saved `generated_handover` / `recommendation_state` / `metrics` at save time. Wording below is from the historical record (not re-run).

### Output metadata
- Saved date display: Friday, 7 August 2026
- Generated/saved timestamp (from record): 2026-08-07T18:00:22.643Z
- Checklist state: none saved / empty

### AI Summary / Today's Briefing
Priority 1
Follow up with Maintenance regarding Room 41 AC fault before further guest impact.

Priority 2
Follow up with Maintenance regarding AC fault before further guest impact.

Priority 3
Follow up with Maintenance regarding Room 24 maintenance issue before further guest impact.

Priority 4
Revenue follow-up required for outstanding channel payment before departures.

Priority 5
VIP readiness follow-up for Jonathan Reed in Room 42.

### Organised Handover Sections
#### Urgent / Shift Alerts (5)
- Shower leak open. Needs Maintenance attendance.
- Engineer confirms immediate electrical risk controlled.
- Fire panel normal.
- Room 26 – Corridor water/electrical incident.
- No guest injury.

#### VIP
_No items_

#### Guest Follow-up (3)
- Room 34 – Guest requested a room move if available.
- Guest requested a room move if available.
- Room 35 – Thompson departing tomorrow.

#### Maintenance (13)
- Room 41 – AC issue reported.
- AC issue reported.
- Room 24 – Remains OOO until inspection/repair tomorrow.
- Room 24 – Leak open.
- Room 26 – Leak open. High priority. Needs Maintenance attendance.
- Room 33 – Shower issue open.
- Room 35 – Heating issue reported. Guest comfort affected.
- Heating issue reported.
- Room 29 – TV remote not working. Guest needs a replacement.
- No heating / room cold. Guest comfort affected. Follow up required.
- No maintenance issue. | No outstanding maintenance. | Maintenance inspection required tomorrow. | Battery replaced by maintenance at 17:00. | Broken wine glass reported. | No maintenance action. | MAINTENANCE STATUS 20:45: | Morning maintenance manager must attend before area reopened. | Maintenance inspection tomorrow. | Maintenance tomorrow. | Maintenance logged for tomorrow. | Do NOT create outstanding maintenance task. | Housekeeping vacuum cleaner broken. | Do not convert every maintenance issue into OOO.
- Safe battery was low. | This incident is SAFE/STABLE now but remains HIGH PRIORITY operationally.
- Lobby men's WC hand dryer broken. | WC remains OPEN.

#### Payments / Finance (2)
- Room 37 – A minibar charge requires review.
- Outstanding balance remains on the account.

#### Outstanding Tasks (1)
- Housekeeping cleared it safely.

#### Events / Timeline
_No items_

#### Preparations (2)
- Review original note
- ☑ Welcome card

#### Completed Actions (2)
- Issue RESOLVED.
- RESOLVED.

#### Inventory
_No items_

#### Deliveries
_No items_

#### Lost Property
_No items_

#### Open Questions
_No items_

#### General / Operational Notes (84)
- Room 41 – OOO tonight.
- FINAL ROOM = 34.
- IMPORTANT ROOM STATUS.
- This is NOT an emergency and room is NOT OOO.
- Issue is corridor outside room.
- Room originally ready.
- Room removed from service.
- Room inspected and ready.
- Room ready.
- Room remains IN SERVICE.
- Room placed OOO.
- Do NOT put room back into service.
- Room currently vacant.
- Guest staying in room.
- No heating / room cold. Guest comfort affected.
- No guest currently in room.
- Room can still be sold.
- Paper towels need restocking.
- Duty manager attended.
- Room access or lock issue. Guest cannot enter reliably.
- Duty manager attended immediately.
- F&B manager informed.
- Room 24 – Helen Morris ETA 21:30.
- Room 34 – Guest reallocated to.
- Guest has not been informed yet.
- .
- Room 18 – Lucy Evans ETA around midnight.
- Previous guest reported bedside lamp flickering yesterday.
- Room 31 – Peter Collins ETA 23:30.
- Small scratch on wardrobe door noted by housekeeping.
- Cosmetic only.
- Room 27 – Ahmed Ali ETA 01:00.
- Room 12 – Brown checked out.
- Room 21 – Wilson checked out.
- Portable heater offered and accepted.
- Guest comfortable now.
- Room 8 – Clark checked out.
- Room 16 – Harris checked out.
- At 20:05 housekeeping noticed water running down wall close to socket.
- UPDATE 20:20 - power isolated to affected corridor sockets.
- Water supply isolated.
- BUT.
- Room access or lock issue. Guest cannot enter reliably.
- Sockets must remain isolated.
- Do NOT restore power.
- No guest currently inside.
- UPDATE 20:15 - water isolated.
- Needs replacement part tomorrow.
- No follow-up unless problem returns.
- Guest confirmed comfortable at 20:30.
- Room 12 – Extractor fan noisy.
- LOW priority.
- LOW guest impact.
- Cosmetic / LOW priority.
- Front entrance automatic door stopped closing properly at 18:30.
- Staff had to manually close it.
- UPDATE 19:10 - tested repeatedly and working normally.
- Working normally since.
- No restriction currently.
- Kitchen reported smell of gas around 19:40.
- IMPORTANT.
- Kitchen gas supply isolated.
- No guests affected.
- Appliance isolated.
- Main kitchen gas supply safely restored.
- One appliance remains OUT OF SERVICE and labelled DO NOT USE.
- Kitchen otherwise operational.
- Spare vacuum available.
- No operational impact.
- Guest given replacement.
- Guest says not bothering them.
- OOO tonight.
- Room 26 – Is NOT OOO.
- Guest access route adjusted.
- Room 35 – Is NOT OOO.
- Room 33 – Is NOT OOO.
- Room 12 – Is NOT OOO.
- PRIORITY CONTEXT.
- Highest operational concern.
- Risk currently controlled but restrictions remain.
- One appliance remains isolated and requires follow-up.
- Rooms 24, 41 – Rm24 + rm41 remain OOO.
- Everything else should be prioritised according to current guest impact and whether action is actually required tonight.
- Portable heater delivered.

### Recommendations
1. Follow up with Maintenance regarding Room 41 AC. The fault remains open and needs resolution this shift. _(priority: urgent)_ _(owner: Maintenance)_
2. Follow up with Maintenance regarding Room 26 shower/leak. The fault remains open and needs resolution this shift. _(priority: high)_ _(owner: Maintenance)_
3. Follow up with Maintenance regarding Room 35 heating fault. The fault remains open and needs resolution this shift. _(priority: high)_ _(owner: Maintenance)_
4. Follow up with Maintenance regarding Room 24 remains OOO until inspection/repair tomorrow. The fault remains open and needs resolution this shift. _(priority: high)_ _(owner: Maintenance)_
5. Collect minibar charge for Room 37 before departure. _(priority: high)_ _(owner: Reception)_
6. Complete VIP in Room 42 for Jonathan Reed requirements this shift. _(priority: high)_ _(owner: Reception)_

## Observed Positives
- Fragments of corridor incident, OOO 24/41, gas resolution, “NOT OOO” clarifications appear in General.
- Some priority-context text survives.

## Observed Failures
- Briefing ignores corridor electrical #1 and gas follow-up; leads with AC duplicates + fake channel payment + VIP Reed prep.
- Urgent mixes controlled electrical with false “shower leak open”.
- Maint reopens **resolved** 33 shower, remote, heating as active comfort emergencies; invents lock issue.
- Recs chase **rm 37 minibar** (noisy fridge, not charge).
- Snapshot **OOO=0**; 84-line noise; severity ranking fails the scenario purpose.

## Failure Tags
`maintenance-severity` · `prioritisation` · `state-resolution` · `source-of-truth` · `room-status` · `completed-as-open` · `payment-state` · `compression` · `recommendation-quality` · `hotel-snapshot` · `deduplication` · `presentation`

## Operational Risk
**Critical** — Electrical isolation controls + OOO/severity mis-ranking.

## Status
**Failed**

## Notes
Tester review completed from recovered CSV evidence (input vs saved HF output). Historical input/output preserved above.
