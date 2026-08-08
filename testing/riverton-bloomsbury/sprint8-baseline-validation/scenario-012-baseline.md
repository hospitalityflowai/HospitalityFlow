# Scenario-012 — Riverton Sprint 8 BASELINE OUTPUT

**Label:** RIVERTON SPRINT 8 BASELINE OUTPUT

Human Expected Truth authority remains in `../scenario-012.md`. This file is engine output only.

## Run metadata
- Scenario: 012 — Preferred Guest Card Language Trap
- Shift: PM
- Load: Normal
- Difficulty: Moderate
- Capability: Source fidelity; payment vs inventory language; amenity fail-closed
- Git commit: `73e7572a09e851d322a7a16a3f0542da93062f43`
- Engine version: 1
- Ran at: 2026-08-08T12:15:37.701Z
- brainContext: `null`
- Source SHA-256: `16b00f5657ca2e00dda4644b85f37f160fb911281f78ae0f1387e06f2a0c5b4f`

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
Preferred guest arrival — read the words carefully.

**Mr Julian Voss** — booking RB-77219 — allocated **Deluxe King 418** (may move if we balance the house)

Notes from reservations email (pasted):
“Guarantee: **card on file**. Do not release reservation.
Complimentary upgrade **to balance availability** if a Junior Suite frees after 16:00 departures — inventory balancing only, not a paid upgrade.
Champagne: **if available** from F&B surplus — optional — not confirmed ordered.
No flowers. No fruit. No handwritten welcome card requested.”

HK already made 418 as deluxe king. Suite **508** might free — departure delayed guest still packing at 15:50 — unknown.

Reception sticky from someone helpful:
“Voss — card???” ← this is about the **guarantee card on file**, not a welcome card craft project.

Night audit reminder unrelated: tokenise walk-ins.
```

## Canonical actions (Sprint 8 + temporal)

- Anchor: handover_date=2026-08-08 shift=PM created_at=2026-08-08T15:45:00.000Z
- State counts: {"open":2,"monitor":0,"information":3,"unresolved":0,"blocked":0,"resolved":0,"other":0}

- **open** `amenity:prep` P2 — Prepare champagne
- **open** `amenity:prep` P2 — Prepare fruit + flowers + welcome card
- **information** `allocation:balance_availability` P3 — Complimentary upgrade / balance availability note _(guest Junior Suite)_
- **information** `vip:prep_complete` P3 — VIP prep complete / awareness only
- **information** `payment:insufficient_evidence` P3 — Payment-related note retained — insufficient evidence for collect chase _(guest Mr Julian Voss)_

## AI Summary / Briefing

Priority 1
Prepare champagne.

Priority 2
Prepare fruit + flowers + welcome card.

Priority 3
VIP readiness follow-up for arrival — fruit and flowers.

Priority 4
VIP readiness follow-up for arrival — champagne.

## Organised handover

### urgent (0)
_No items_

### vip (3)
- “Voss — card???” ← this is about the **guarantee card on file**, not a welcome card craft project.
- Champagne: **if available** from F&B surplus — optional — not confirmed ordered.
- No flowers. No fruit. No handwritten welcome card requested.”

### guest (0)
_No items_

### maintenance (0)
_No items_

### payments (2)
- **Mr Julian Voss** — booking RB-77219 — allocated **Deluxe King 418** (may move if we balance the house)
- Complimentary upgrade **to balance availability** if a Junior Suite frees after 16:00 departures — inventory balancing only, not a paid upgrade.

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

### general (6)
- Preferred guest arrival — read the words carefully.
- Notes from reservations email (pasted):
- “Guarantee: **card on file**. Do not release reservation.
- HK already made 418 as deluxe king. Suite **508** might free — departure delayed guest still packing at 15:50 — unknown.
- Reception sticky from someone helpful:
- Night audit reminder unrelated: tokenise walk-ins.

### completed (0)
_No items_

## Recommendations

1. Prepare champagne. _(priority: normal, owner: Reception, status: open)_
2. Prepare fruit + flowers + welcome card. _(priority: normal, owner: Reception, status: open)_

## Human Expected Truth (copied for side-by-side review)

### OPEN expected
- Protect reservation guarantee awareness (card on file) — not craft a welcome card.
- Revisit upgrade **only if** a suitable suite actually frees; otherwise keep 418.
- Champagne only if F&B confirms surplus availability — fail closed if not confirmed.

### MONITOR expected
- Whether 508 (or other suite) actually frees for balance-of-house upgrade.

### INFORMATION expected
- Preferred guest status; no fruit/flowers/welcome card requested.

### UNRESOLVED expected
- Champagne availability; suite upgrade feasibility — partial ambiguity by design.

### Must not infer
- Welcome / handwritten card from “card on file”.
- Treating “comp upgrade to balance availability” as loft/suite already awarded.
- Inventing fruit or flowers.
- Hard-OPEN champagne as confirmed amenity without availability confirmation.

## Reasoning metadata (summary)

- Notes after pipeline: 11
- Dependency edges: 0
- Canonical actions: 5
- Quiet shift flag: null

Full machine-readable dump: `scenario-012-baseline.json`
