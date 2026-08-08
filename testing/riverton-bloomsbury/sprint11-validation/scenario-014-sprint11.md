# Scenario-014 â RIVERTON SPRINT 11 VALIDATION OUTPUT

**Label:** RIVERTON SPRINT 11 VALIDATION OUTPUT

Human Expected Truth authority remains in `../scenario-014.md`. This file is engine output only.

## Run metadata
- Scenario: 014 â Tokenisation Near Departure vs Far Departure
- Shift: Night
- Load: Busy
- Difficulty: Hard
- Capability: Temporal payment eligibility; MONITOR vs OPEN; no false collect
- Git commit: `d68ff55c06f885ecccace354204d6d2fc7ab9662`
- Engine version: 1
- Ran at: 2026-08-08T13:12:23.512Z
- brainContext: `null`
- Source SHA-256: `988e4f92071bbc1e25b506d716ddd4e391178470b21b10ba85500de084a2e548`

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
Night audit half-done — payment fragments.

1) **rm 203 — Mr Idris Colne**
Checkout **tomorrow AM ~10:00**
Card on booking failed tokenisation overnight (message: “token not present / needs PDQ”)
Guest currently asleep. PDQ terminal was rebooting earlier; may be fine now — **unclear if night can take PDQ without waking guest**
Do not invent an “outstanding balance collect £xxx” — no amount printed, only tokenisation flag.

2) **rm 411 — Ms Hattie Rowan**
In-house until **departing in 5 days** (Friday)
Also showing untokenised / guarantee soft warning on night report
No checkout tomorrow. Not a same-night pressure item like 203.
Day team can tidy guarantee later unless guest offers card at desk.

3) Noise lines on same report:
- rm 105 prepaid Expedia — green — ignore
- rm 519 company billed HelioSpan — ignore
- “Collect outstanding” stamped by accident on a blank line — **void / ignore**

Night manager view: nearer departure without token is the real risk; far departure is monitor/day follow-up unless policy says otherwise. PDQ dependency for 203 is messy — don’t pretend it’s a clean cash collect.
```

## Canonical actions (Sprint 8 + temporal)

- Anchor: handover_date=2026-08-08 shift=Night created_at=2026-08-09T00:20:00.000Z
- State counts: {"open":0,"monitor":1,"information":2,"unresolved":0,"blocked":0,"resolved":2,"other":0}

- **monitor** `payment:tokenise` P2 â Confirm card tokenisation / guarantee before departure _(temporal: information)_
- **information** `payment:insufficient_evidence` P3 â Payment-related note retained — insufficient evidence for collect chase
- **information** `payment:insufficient_evidence` P3 â Payment-related note retained — insufficient evidence for collect chase
- **resolved** `payment:no_collect` exclude â Payment settled / no collect required for Room 105 _(room 105)_ _(guest -)_
- **resolved** `payment:no_collect` exclude â Payment settled / no collect required for Room 519 _(room 519)_ _(guest -)_

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

### payments (3)
- Do not invent an “outstanding balance collect £xxx” — no amount printed, only tokenisation flag. // - “Collect outstanding” stamped by accident on a blank line — **void / ignore**
- - rm 105 prepaid Expedia — green — ignore
- - rm 519 company billed HelioSpan — ignore

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

### general (11)
- 1) **rm 203 — Mr Idris Colne**
- 2) **rm 411 — Ms Hattie Rowan**
- Checkout **tomorrow AM ~10:00**
- Card on booking failed tokenisation overnight (message: “token not present / needs PDQ”)
- Guest currently asleep. PDQ terminal was rebooting earlier; may be fine now — **unclear if night can take PDQ without waking guest**
- In-house until **departing in 5 days** (Friday)
- Also showing untokenised / guarantee soft warning on night report
- No checkout tomorrow. Not a same-night pressure item like 203.
- Day team can tidy guarantee later unless guest offers card at desk.
- 3) Noise lines on same report:
- Night manager view: nearer departure without token is the real risk; far departure is monitor/day follow-up unless policy says otherwise. PDQ dependency for 203 is messy — don’t pretend it’s a clean cash collect.

### completed (1)
- Night audit half-done — payment fragments.

## Recommendations

_No recommendations generated (`[]`)._

## Human Expected Truth (copied for side-by-side review)

### OPEN expected
- Near-term: resolve token/PDQ path for **203** before tomorrow AM checkout **if operable without false collect** — or ensure AM owns waking/PDQ if night cannot.
- Do **not** open a fabricated balance collection.

### MONITOR expected
- **411** guarantee/tokenisation for later in stay / day team.
- PDQ terminal health.

### INFORMATION expected
- 105 prepaid OK; 519 company billed OK; void collect stamp.

### UNRESOLVED expected
- Whether night can complete PDQ for 203 without waking guest / terminal readiness (intentional ambiguity).

### Must not infer
- Inventing collect outstanding amounts.
- Forcing both 203 and 411 to identical OPEN collect urgency.
- Ignoring nearer departure risk on 203.
- Treating void stamp as a real folio debt.

## Reasoning metadata (summary)

- Notes after pipeline: 16
- Dependency edges: 0
- Canonical actions: 5
- Quiet shift flag: null

Full machine-readable dump: `scenario-014-sprint11.json`
