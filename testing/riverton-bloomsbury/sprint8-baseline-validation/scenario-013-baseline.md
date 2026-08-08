# Scenario-013 — Riverton Sprint 8 BASELINE OUTPUT

**Label:** RIVERTON SPRINT 8 BASELINE OUTPUT

Human Expected Truth authority remains in `../scenario-013.md`. This file is engine output only.

## Run metadata
- Scenario: 013 — Anniversary Package Then Cancellation
- Shift: AM
- Load: Normal
- Difficulty: Moderate
- Capability: Supersession; remaining active amenities only
- Git commit: `73e7572a09e851d322a7a16a3f0542da93062f43`
- Engine version: 1
- Ran at: 2026-08-08T12:15:37.701Z
- brainContext: `null`
- Source SHA-256: `32cabb0bee3c745e97b00e59b449284e3a71d17983fcfb5836e659aa136f216c`

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
Chronological — please use FINAL state.

09:10 Reservations → HK:
Anniversary arrival today **Mr & Mrs Langford** rm **502** Junior Suite ETA 15:00
Package request: red roses, chocolate truffles, bottle prosecco, handwritten card

10:40 Guest emailed:
“Please cancel the roses — allergies in the family. Keep truffles and prosecco. Card still nice if possible.”

11:05 HK supervisor update:
Roses **CANCELLED — do not order / do not place**.
Truffles: ordered from supplier, ETA to hotel ~13:30
Prosecco: in fridge labelled LANGFORD 502
Card: not written yet

11:20 Someone on AM desk re-wrote an old note “Langford full anniversary package incl roses” on the arrivals printout — **that printout is stale**. Trust the 10:40/11:05 updates.

Also AM:
Departure 216 late c/o to 13:00 approved
OOO 318 still carpet — unchanged
```

## Canonical actions (Sprint 8 + temporal)

- Anchor: handover_date=2026-08-08 shift=AM created_at=2026-08-08T07:15:00.000Z
- State counts: {"open":3,"monitor":0,"information":1,"unresolved":0,"blocked":0,"resolved":0,"other":0}

- **open** `amenity:prep` P2 — Prepare truffles + chocolates + welcome card _(temporal: today/11:20)_
- **open** `amenity:prep` P2 — Prepare truffles + welcome card
- **open** `amenity:prep` P3 — Prepare truffles
- **information** `vip:no_active_amenity` P3 — Mrs Langford — No active VIP amenity outstanding _(guest Mrs Langford)_

## AI Summary / Briefing

Priority 1
Prepare truffles + chocolates + welcome card.

Priority 2
Prepare truffles + welcome card.

## Organised handover

### urgent (0)
_No items_

### vip (0)
_No items_

### guest (1)
- Departure 216 late c/o to 13:00 approved

### maintenance (0)
_No items_

### payments (0)
_No items_

### events (0)
_No items_

### preparations (4)
- Package request: red roses, chocolate truffles, bottle prosecco, handwritten card | 11:20 Someone on AM desk re-wrote an old note “Langford full anniversary package incl roses” on the arrivals printout — **that printout is stale**. Trust the 10:40/11:05 updates.
- “Please cancel the roses — allergies in the family. Keep truffles and prosecco. Card still nice if possible.”
- Anniversary arrival today **Mr & Mrs Langford** rm **502** Junior Suite ETA 15:00
- Prosecco: in fridge labelled LANGFORD 502

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

### general (8)
- Chronological — please use FINAL state.
- 09:10 Reservations → HK:
- 10:40 Guest emailed:
- 11:05 HK supervisor update:
- Truffles: ordered from supplier, ETA to hotel ~13:30
- Card: not written yet
- Also AM:
- OOO 318 still carpet — unchanged

### completed (1)
- Roses **CANCELLED — do not order / do not place**.

## Recommendations

1. Prepare truffles + chocolates + welcome card. _(priority: normal, owner: Reception, status: open)_
2. Prepare truffles + welcome card. _(priority: normal, owner: Reception, status: open)_
3. Prepare truffles. _(priority: low, owner: Reception, status: open)_

## Human Expected Truth (copied for side-by-side review)

### OPEN expected
- Write card; place **truffles + prosecco** for 502; ensure **no roses**.

### MONITOR expected
- Supplier delivery of truffles ~13:30 before arrival.

### INFORMATION expected
- 216 late c/o; OOO 318 unchanged.

### UNRESOLVED expected
- None for amenity set (supersession clear).

### Must not infer
- Preparing / ordering roses after cancellation.
- Dropping truffles or prosecco because roses cancelled.
- Inventing a replacement “allergy-safe flower” package not requested.
- Preferring the stale printout over later email/HK update.

## Reasoning metadata (summary)

- Notes after pipeline: 14
- Dependency edges: 0
- Canonical actions: 4
- Quiet shift flag: null

Full machine-readable dump: `scenario-013-baseline.json`
