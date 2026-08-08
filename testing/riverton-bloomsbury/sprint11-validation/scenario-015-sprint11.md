# Scenario-015 â RIVERTON SPRINT 11 VALIDATION OUTPUT

**Label:** RIVERTON SPRINT 11 VALIDATION OUTPUT

Human Expected Truth authority remains in `../scenario-015.md`. This file is engine output only.

## Run metadata
- Scenario: 015 â POA Is Not Collect — Unless Evidence Says So
- Shift: AM
- Load: Normal
- Difficulty: Moderate
- Capability: Payment-state discrimination
- Git commit: `d68ff55c06f885ecccace354204d6d2fc7ab9662`
- Engine version: 1
- Ran at: 2026-08-08T13:12:23.512Z
- brainContext: `null`
- Source SHA-256: `f5367e9ec0c86dc68eeaf41320357acc6c71f0f14adb147a9a5bba4659ebde34`

## Pipeline
1. extractOperationalFact / sectionFromFact
2. consolidateNotesByFacts
3. resolveOperationalEntities (Sprint 3)
4. electCanonicalCurrentState (Sprint 1)
5. resolveOperationalDependencies (Sprint 4)
6. buildCanonicalOperationalActions (Sprint 5/6/8/10)
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
- State counts: {"open":1,"monitor":0,"information":2,"unresolved":0,"blocked":0,"resolved":2,"other":0}

- **information** `reservation_info` P3 â Mr Adeyemi — Reservation / POA information (not VIP prep) _(room 112)_ _(guest Mr Adeyemi)_
- **information** `payment:insufficient_evidence` P3 â Payment-related note retained — insufficient evidence for collect chase _(room 415)_ _(guest Mrs Pike)_
- **open** `payment:collect` exclude â Collect outstanding channel payment before departure _(guest Mr Seth Calder)_ _(temporal: today/2026-08-08/collect)_
- **resolved** `payment:no_collect` exclude â Payment settled / no collect required for Room 204 _(room 204)_ _(guest Ms Blum)_
- **resolved** `payment:no_collect` exclude â Payment settled / no collect required for Room 309 _(room 309)_ _(guest Mr Adeyemi)_

## AI Summary / Briefing

Shift status
No urgent guest-impacting priorities for the incoming team.

## Organised handover

### urgent (0)
_No items_

### vip (0)
_No items_

### guest (0)
_No items_

### maintenance (0)
_No items_

### payments (4)
- - 415 Mr & Mrs Pike — **deposit held** — balance due at checkout tomorrow — not today’s collect panic
- - **228 Mr Seth Calder** — **GENUINE OUTSTANDING** — mini-bar + paid-out taxi **£64.80** still open on folio — guest departing **today 11:00** — please settle before keys go back | Also: “OTA pending” scribbled with no room — ignore.
- - 309 HelioSpan — **company billed** — master account — OK
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

### general (4)
- - 112 Mr Adeyemi — **POA room only** — extras on own card — no room rate chase
- PAYMENT STATES (do not “collect” the green ones):
- Cashier clear-down list — AM
- Someone highlighted every line in yellow. Only Calder is actually a collect-now.

### completed (0)
_No items_

## Recommendations

_No recommendations generated (`[]`)._

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
- Canonical actions: 5
- Quiet shift flag: null

Full machine-readable dump: `scenario-015-sprint11.json`
