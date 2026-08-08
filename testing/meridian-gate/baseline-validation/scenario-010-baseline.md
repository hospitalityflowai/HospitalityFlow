# Scenario-010 — MERIDIAN GATE FIRST-RUN BASELINE OUTPUT

**Label:** MERIDIAN GATE FIRST-RUN BASELINE OUTPUT

Human Expected Truth authority remains in `../scenario-010.md` (FROZEN BEFORE FIRST HF RUN). This file is engine output only.

## Run metadata
- Scenario: 010 — Wedding Day Pavilion Pressure
- Shift: PM
- Load: Busy
- Git commit (engine): `0b70a8e495fbbdcec8a0d2bca23f4fd2450265e7`
- Engine version: 1
- Ran at: 2026-08-08T13:29:06.237Z
- Scenario file SHA-256: `8aec629a23f78e448ee5f87d372be9d329694f9e4eccd84db007850626c60f30`
- Source input SHA-256: `d6fed6f917bc6f23936e53f5245069b52b6dbd54d21899d3c123d36a90e5108e`

## Canonical actions

- Anchor: handover_date=2026-09-13 shift=PM created_at=2026-09-13T15:45:00.000Z
- State counts: {"open":1,"monitor":0,"information":0,"unresolved":0,"blocked":0,"resolved":0,"other":0}

- **open** `payment:collect` P2 — Collect outstanding payment before departure _(guest Hargreaves Wedding)_ _(temporal: information/collect)_

## AI Summary / Briefing

Priority 1
Collect outstanding payment before departure.

Priority 2
Revenue follow-up required for outstanding £40 before departures.

## Recommendations

1. Collect outstanding payment before departure. _(priority: normal)_
2. Collect minibar charge £40 before departure. _(priority: normal)_

## Human Expected Truth (side-by-side)

### OPEN expected
- Accept / coordinate cake delivery ~14:20 at pavilion loading door (Events/F&B).
- Clear unprinted valet tickets for vans before ceremony surge.
- Hold CX16 check-in until HK release.

### MONITOR expected
- Rain plan for cocktails; valet capacity through 16:00.
- CX16 cleaning progress.

### INFORMATION expected
- Florist/chairs/interconnect DONE; master account prepaid pattern; CX14/CX15 clean.

### UNRESOLVED expected
- Whether showers force colonnade move — weather-dependent; do not invent weather outcome.

### Must not invent
- Checking into CX16 dirty.
- Individual room collects against master prepaid without guest due.
- Putting wedding guests into crew quiet wing.
- Cake delivery at Main lobby instead of pavilion door.

Full dump: `scenario-010-baseline.json`
