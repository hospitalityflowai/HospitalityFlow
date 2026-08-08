# Scenario-018 — Riverton Sprint 8 BASELINE OUTPUT

**Label:** RIVERTON SPRINT 8 BASELINE OUTPUT

Human Expected Truth authority remains in `../scenario-018.md`. This file is engine output only.

## Run metadata
- Scenario: 018 — Checked-Out Room vs Listed Arrival Conflict
- Shift: AM
- Load: Very busy
- Difficulty: Hard
- Capability: Contradiction → clarify; do not invent resolution
- Git commit: `73e7572a09e851d322a7a16a3f0542da93062f43`
- Engine version: 1
- Ran at: 2026-08-08T12:15:37.701Z
- brainContext: `null`
- Source SHA-256: `413989d4df5d304de5dbe495a79f1cdf7933e4f62d4e20741a9345a128b93add`

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
Very busy AM — contradiction on the board — escalate, don’t guess.

ARRIVAL
**Ms Renata Quill** — booking RB-66104 — due ~14:00 — system allocation **Room 315**

DEPARTURES / ROOM STATUS CONFLICT
- Room rack print (07:55): **315 CHECKED OUT** — guest name on rack **Mr Paul Kemp** — checked out 07:20 — express
- HK board (08:05): **315** still showing **stayover dirty** from night report (night may not have updated after Kemp left)
- Housekeeping WhatsApp 08:25: “315 empty when we opened door — taking as vacant dirty — starting clean”
- Meanwhile reservations chat: “Quill must stay in 315 — view room promised” 
- DM not in yet (due 09:30). Night left note: “Kemp early out — 315 should be free for turn”

So: arrival assigned to 315; evidence says Kemp out and HK starting clean; one stale line still said stayover. **Do not invent a different room** for Quill unless DM/reservations reallocate in writing. **Do not pretend there is no conflict** between stale stayover flag vs vacant dirty.

Unrelated noise trying to steal attention:
- “Collect £120 Quill” — **no** — prepaid direct — zero balance due on arrival
- VIP sparkling for **rm 510** (Ms Adebola) — already placed — DONE

Also real work:
Departure rush floors 1–2; OOO 220 carpet still
```

## Canonical actions (Sprint 8 + temporal)

- Anchor: handover_date=2026-08-08 shift=AM created_at=2026-08-08T07:15:00.000Z
- State counts: {"open":0,"monitor":0,"information":1,"unresolved":0,"blocked":0,"resolved":1,"other":0}

- **information** `vip:no_active_amenity` P3 — Ms Adebola — No active VIP amenity outstanding _(room 510)_ _(guest Ms Adebola)_
- **resolved** `payment:no_collect` exclude — Payment settled / no collect required

## AI Summary / Briefing

Shift status
No urgent guest-impacting priorities for the incoming team.

## Organised handover

### urgent (0)
_No items_

### vip (1)
- - VIP sparkling for **rm 510** (Ms Adebola) — already placed — DONE

### guest (0)
_No items_

### maintenance (0)
_No items_

### payments (1)
- - “Collect £120 Quill” — **no** — prepaid direct — zero balance due on arrival

### events (1)
- **Ms Renata Quill** — booking RB-66104 — due ~14:00 — system allocation **Room 315**

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

### general (12)
- - Room rack print (07:55): **315 CHECKED OUT** — guest name on rack **Mr Paul Kemp** — checked out 07:20 — express
- So: arrival assigned to 315; evidence says Kemp out and HK starting clean; one stale line still said stayover. **Do not invent a different room** for Quill unless DM/reservations reallocate in writing. **Do not pretend there is no conflict** between stale stayover flag vs vacant dirty.
- - Meanwhile reservations chat: “Quill must stay in 315 — view room promised” 
- DEPARTURES / ROOM STATUS CONFLICT
- Very busy AM — contradiction on the board — escalate, don’t guess.
- ARRIVAL
- - HK board (08:05): **315** still showing **stayover dirty** from night report (night may not have updated after Kemp left)
- - Housekeeping WhatsApp 08:25: “315 empty when we opened door — taking as vacant dirty — starting clean”
- - DM not in yet (due 09:30). Night left note: “Kemp early out — 315 should be free for turn”
- Unrelated noise trying to steal attention:
- Also real work:
- Departure rush floors 1–2; OOO 220 carpet still

### completed (0)
_No items_

## Recommendations

_No recommendations generated (`[]`)._

## Human Expected Truth (copied for side-by-side review)

### OPEN expected
- Clarify/confirm **315** readiness path for Quill with DM/HK (conflict acknowledgement + clean completion) — allocation contradiction handling.
- Continue departure/HK rush ops without inventing Quill’s room change.

### MONITOR expected
- Clean progress on 315 toward 14:00 arrival.

### INFORMATION expected
- Adebola amenity done; prepaid Quill; OOO 220.

### UNRESOLVED expected
- Any residual contradiction between stale stayover status vs checked-out/vacant dirty until statuses aligned — intentional; do not invent “correct” alternate room.

### Must not infer
- Inventing the “correct” different room for Quill without written reallocation.
- Silently dropping the conflict.
- False collect £120 on Quill.
- VIP prep invention from conflict noise; reopening Adebola sparkling.

## Reasoning metadata (summary)

- Notes after pipeline: 15
- Dependency edges: 0
- Canonical actions: 2
- Quiet shift flag: null

Full machine-readable dump: `scenario-018-baseline.json`
