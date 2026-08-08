# Scenario-015 — Riverton Sprint 8 BASELINE OUTPUT

**Label:** RIVERTON SPRINT 8 BASELINE OUTPUT

Human Expected Truth authority remains in `../scenario-015.md`. This file is engine output only.

## Run metadata
- Scenario: 015 — POA Is Not Collect — Unless Evidence Says So
- Shift: AM
- Load: Normal
- Difficulty: Moderate
- Capability: Payment-state discrimination
- Git commit: `73e7572a09e851d322a7a16a3f0542da93062f43`
- Engine version: 1
- Ran at: 2026-08-08T12:15:37.701Z
- brainContext: `null`
- Source SHA-256: `f5367e9ec0c86dc68eeaf41320357acc6c71f0f14adb147a9a5bba4659ebde34`

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
Cashier clear-down list — AM

PAYMENT STATES (do not “collect” the green ones):
- 112 Mr Adeyemi — **POA room only** — extras on own card — no room rate chase
- 204 Ms Blum — **Booking.com prepaid** — VCC settled night audit — OK
- 309 HelioSpan — **company billed** — master account — OK
- 415 Mr & Mrs Pike — **deposit held** — balance due at checkout tomorrow — not today’s collect panic
- **228 Mr Seth Calder** — **GENUINE OUTSTANDING** — mini-bar + paid-out taxi **£64.80** still open on folio — guest departing **today 11:00** — please settle before keys go back

Someone highlighted every line in yellow. Only Calder is actually a collect-now.

Also: “OTA pending” scribbled with no room — ignore.
```

## Canonical actions (Sprint 8 + temporal)

- Anchor: handover_date=2026-08-08 shift=AM created_at=2026-08-08T07:15:00.000Z
- State counts: {"open":2,"monitor":0,"information":1,"unresolved":0,"blocked":0,"resolved":1,"other":0}

- **open** `payment:collect` P2 — Collect outstanding payment for Room 415 before departure _(room 415)_ _(guest Mrs Pike)_
- **information** `reservation_info` P3 — Mr Adeyemi — Reservation / POA information (not VIP prep) _(room 112)_ _(guest Mr Adeyemi)_
- **open** `payment:collect` exclude — Collect outstanding channel payment for Room 204 before departure _(room 204)_ _(guest Ms Blum)_
- **resolved** `payment:no_collect` exclude — Payment settled / no collect required for Room 112 _(room 112)_ _(guest Mr Seth Calder)_

## AI Summary / Briefing

Priority 1
Collect outstanding payment for Room 415 before departure.

## Organised handover

### urgent (0)
_No items_

### vip (0)
_No items_

### guest (0)
_No items_

### maintenance (0)
_No items_

### payments (3)
- - 415 Mr & Mrs Pike — **deposit held** — balance due at checkout tomorrow — not today’s collect panic
- - **228 Mr Seth Calder** — **GENUINE OUTSTANDING** — mini-bar + paid-out taxi **£64.80** still open on folio — guest departing **today 11:00** — please settle before keys go back | Also: “OTA pending” scribbled with no room — ignore.
- - 204 Ms Blum — **Booking.com prepaid** — VCC settled night audit — OK

### events (0)
_No items_

### preparations (0)
_No items_

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

### general (5)
- - 112 Mr Adeyemi — **POA room only** — extras on own card — no room rate chase
- PAYMENT STATES (do not “collect” the green ones):
- Cashier clear-down list — AM
- - 309 HelioSpan — **company billed** — master account — OK
- Someone highlighted every line in yellow. Only Calder is actually a collect-now.

### completed (0)
_No items_

## Recommendations

1. Collect outstanding balance for Room 415 before departure. _(priority: normal, owner: Reception, status: open)_

## Human Expected Truth (copied for side-by-side review)

### OPEN expected
- Settle **£64.80** on **228 Calder** before ~11:00 departure.

### MONITOR expected
- Pike balance due tomorrow (not today).

### INFORMATION expected
- POA / prepaid / company-billed statuses for other listed rooms.

### UNRESOLVED expected
- Anonymous “OTA pending” scrap without room.

### Must not infer
- Collect actions on POA / prepaid / company-billed rooms without evidence of debt.
- Inventing channel/OTA payment wording or amounts for rooms that are settled.
- Expanding yellow highlight into a mass collection list.

## Reasoning metadata (summary)

- Notes after pipeline: 8
- Dependency edges: 0
- Canonical actions: 4
- Quiet shift flag: null

Full machine-readable dump: `scenario-015-baseline.json`
