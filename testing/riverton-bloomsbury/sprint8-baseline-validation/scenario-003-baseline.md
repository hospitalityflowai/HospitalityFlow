# Scenario-003 — Riverton Sprint 8 BASELINE OUTPUT

**Label:** RIVERTON SPRINT 8 BASELINE OUTPUT

Human Expected Truth authority remains in `../scenario-003.md`. This file is engine output only.

## Run metadata
- Scenario: 003 — Twin Setup — Right Room Only
- Shift: PM
- Load: Normal
- Difficulty: Moderate
- Capability: Room-scoped amenity / setup binding
- Git commit: `73e7572a09e851d322a7a16a3f0542da93062f43`
- Engine version: 1
- Ran at: 2026-08-08T12:15:37.701Z
- brainContext: `null`
- Source SHA-256: `9acb754d3a3c4dccfccdda7e969fad93a26abe64d5e404eec415faefcff2a6fe`

## Pipeline
1. extractOperationalFact / sectionFromFact
2. consolidateNotesByFacts
3. resolveOperationalEntities (Sprint 3)
4. electCanonicalCurrentState (Sprint 1)
5. resolveOperationalDependencies (Sprint 4)
6. buildCanonicalOperationalActions (Sprint 5/6/8)
7. buildOrganisedSectionModel
8. buildTodaysBriefing (Sprint 8 decision seating)
9. ShiftIntelligenceEngine.analyze (Sprint 8 recommendation seating)

## Exact source input

```
From Jess — PM desk

Arrivals tonight worth flagging:

1) Mr Theo March & Ms Isla March — two rooms, same booking ref RB-88421
   - Room **312** Deluxe King (keep as **double/king** — do NOT twin)
   - Room **314** Deluxe Twin-capable — guest asked for **twin beds in 314 only**
   HK said 314 still made as king this morning when they walked past. Needs twin before they get in (~19:30 ETA both rooms).
   They are a couple + adult sibling; sibling in 314.

2) Ms Naomi Crane — 208 — ETA 18:00 — Expedia prepaid — no specials.

3) Mr Patel — 421 — ETA unknown — just a standard deluxe.

Also floating around the desk chat (ignore unless relevant): someone asked yesterday about loft beds for a kids party next month — not these guests.

HK WhatsApp excerpt pasted by supervisor:
“314 twin pls — March party — ONLY 314. 312 stays king. Cot not requested.”

Departures leftover noise:
- 119 checked out this morning; minibar closed already.
- 503 early departure yesterday — nothing open.

General:
Lift 1 slow but working. Not broken.
Parlour busy with tea — not related to March.
```

## Canonical actions (Sprint 8 + temporal)

- Anchor: handover_date=2026-08-08 shift=PM created_at=2026-08-08T15:45:00.000Z
- State counts: {"open":3,"monitor":0,"information":0,"unresolved":0,"blocked":0,"resolved":1,"other":0}

- **open** `maintenance` P1 — Follow up open maintenance _(temporal: information/inspect)_
- **open** `payment:collect` P2 — Collect outstanding channel payment before departure _(guest Ms Naomi Crane)_
- **open** `payment:collect` P2 — Collect outstanding payment for Room 119 before departure _(room 119)_
- **resolved** `amenity:twin_superseded` exclude — Twin setup superseded — follow final room / double allocation _(guest Deluxe King)_

## AI Summary / Briefing

Priority 1
Follow up open maintenance.

Priority 2
Collect outstanding channel payment before departure.

Priority 3
Collect outstanding payment for Room 119 before departure.

Priority 4
Revenue follow-up required for outstanding channel payment before departures.

## Organised handover

### urgent (0)
_No items_

### vip (0)
_No items_

### guest (0)
_No items_

### maintenance (1)
- Lift 1 slow but working. Not broken.

### payments (2)
- - 119 checked out this morning; minibar closed already.
- 2) Ms Naomi Crane — 208 — ETA 18:00 — Expedia prepaid — no specials.

### events (0)
_No items_

### preparations (1)
-    - Room **312** Deluxe King (keep as **double/king** — do NOT twin) |    - Room **314** Deluxe Twin-capable — guest asked for **twin beds in 314 only** |    HK said 314 still made as king this morning when they walked past. Needs twin before they get in (~19:30 ETA both rooms). | “314 twin pls — March party — ONLY 314. 312 stays king. Cot not requested.” |    - Room **314** Deluxe Twin-capable — guest asked for **twin beds in 314 only** |    HK said 314 still made as king this morning when they walked past. Needs twin before they get in (~19:30 ETA both rooms). | “314 twin pls — March party — ONLY 314. 312 stays king. Cot not requested.”

### openQuestions (0)
_No items_

### tasks (0)
_No items_

### inventory (0)
_No items_

### deliveries (0)
_No items_

### lostproperty (0)
_No items_

### general (11)
- From Jess — PM desk
- Arrivals tonight worth flagging:
- 1) Mr Theo March & Ms Isla March — two rooms, same booking ref RB-88421
-    They are a couple + adult sibling; sibling in 314.
- 3) Mr Patel — 421 — ETA unknown — just a standard deluxe.
- Also floating around the desk chat (ignore unless relevant): someone asked yesterday about loft beds for a kids party next month — not these guests.
- HK WhatsApp excerpt pasted by supervisor:
- Departures leftover noise:
- - 503 early departure yesterday — nothing open.
- General:
- Parlour busy with tea — not related to March.

### completed (0)
_No items_

## Recommendations

1. Follow up open maintenance. _(priority: high, owner: Reception, status: open)_
2. Collect outstanding channel payment before departure. _(priority: normal, owner: Reception, status: open)_
3. Collect minibar charge for Room 119 before departure. _(priority: normal, owner: Reception, status: open)_
4. Collect outstanding Expedia payment before departure. _(priority: high, owner: Reception, status: open)_

## Human Expected Truth (copied for side-by-side review)

### OPEN expected
- Twin setup **314** only (March) before arrival.
- Confirm **312** left as king/double (do not twin).

### MONITOR expected
- Arrival ETAs for March pair.

### INFORMATION expected
- Crane / Patel uneventful arrivals; house occupancy context.

### UNRESOLVED expected
- None for twin scope (request is clear).

### Must not infer
- Twinned both 312 and 314.
- Ignoring “only room 314”.
- Invented loft bed, welcome card, champagne, or cot for March.
- Binding twin request to Crane or Patel.

## Reasoning metadata (summary)

- Notes after pipeline: 15
- Dependency edges: 0
- Canonical actions: 4
- Quiet shift flag: null

Full machine-readable dump: `scenario-003-baseline.json`
