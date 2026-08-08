# Scenario-017 — MERIDIAN GATE FIRST-RUN BASELINE OUTPUT

**Label:** MERIDIAN GATE FIRST-RUN BASELINE OUTPUT

Human Expected Truth authority remains in `../scenario-017.md` (FROZEN BEFORE FIRST HF RUN). This file is engine output only.

## Run metadata
- Scenario: 017 — Busy PM: Crew Inbound, Spa Close, Valet Leftover
- Shift: PM
- Load: Busy
- Git commit (engine): `0b70a8e495fbbdcec8a0d2bca23f4fd2450265e7`
- Engine version: 1
- Ran at: 2026-08-08T13:29:06.237Z
- Scenario file SHA-256: `2ae06d1fb3081e138fb3cf3ddf64bf42ba6027bef3f1381e5ebf0a20e659399d`
- Source input SHA-256: `9472978a3c8229e3d1ce5c68c8c53c912ce7e600359ffc2baa6be7717b630d9c`

## Canonical actions

- Anchor: handover_date=2026-09-22 shift=PM created_at=2026-09-22T15:45:00.000Z
- State counts: {"open":0,"monitor":0,"information":0,"unresolved":0,"blocked":0,"resolved":2,"other":0}

- **resolved** `payment:no_collect` exclude — Payment settled / no collect required _(guest Guest Shore’s)_
- **resolved** `superseded` exclude — Superseded current-state fact _(guest Guest Shore’s)_

## AI Summary / Briefing

Shift status
No urgent guest-impacting priorities for the incoming team.

## Recommendations

_No recommendations generated (`[]`)._

## Human Expected Truth (side-by-side)

### OPEN expected
- Priority turn / readiness for M213 within crew hold before 22:50.
- Complete valet tickets for two outstanding cars before 23:00 Night handoff.
- Honour last 21:15 shuttle pax list.

### MONITOR expected
- CX18 noise overnight unless worsens.
- Crew inbound delay risk around 22:50.

### INFORMATION expected
- Spa close 21:00; Pell non-resident; no shuttle after 21:15; lean Night coming.

### UNRESOLVED expected
- Exact M213 ready clock — soft until HK confirms.

### Must not invent
- Selling crew rooms.
- Making Pell a resident arrival.
- Overnight shuttle after 21:15.
- OPEN eng chase on declined-move CX18 noise without worsening.

Full dump: `scenario-017-baseline.json`
