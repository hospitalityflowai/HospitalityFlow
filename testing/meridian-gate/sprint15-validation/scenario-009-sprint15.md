# Scenario-009 ? MERIDIAN GATE Sprint 15 state-resolution validation OUTPUT

**Label:** MERIDIAN GATE Sprint 15 state-resolution validation OUTPUT

Human Expected Truth authority remains in `../scenario-009.md` (FROZEN BEFORE FIRST HF RUN). This file is engine output only.

## Run metadata
- Scenario: 009 ? Stale Annex Board vs Main Allocation Conflict
- Shift: AM
- Load: Adversarial / ambiguous
- Git commit (engine): `4de18214bfbcd0b645c1b0b548f0e52e6c4dde22`
- Engine version: 1
- Ran at: 2026-08-08T14:51:56.907Z
- Scenario file SHA-256: `96a8a9b18cf24f2711f92f57cd52ec2547caf1e7af417e3317551788b1fa9a24`
- Source input SHA-256: `4ce7f850f7b92cb0827a34839cdd5e85b4ddcb25fc5f74f475900af14363c6d2`

## Canonical actions

- Anchor: handover_date=2026-09-15 shift=AM created_at=2026-09-15T07:15:00.000Z
- State counts: {"open":1,"monitor":0,"information":1,"unresolved":0,"blocked":0,"resolved":1,"other":0}

- **open** `occupancy_conflict:clarify` P1 ? Clarify Room CX07 status/readiness for Ms Renée — conflicting occupancy evidence (do not invent a different room) _(room CX07)_ _(guest Ms Renée)_
- **information** `vip:prep_complete` P3 ? Mr Adeyemi — VIP prep complete / awareness only _(room MS01)_ _(guest Mr Adeyemi)_
- **resolved** `payment:no_collect` exclude ? Payment settled / no collect required _(guest Northwind Legal)_

## AI Summary / Briefing

Priority 1
Clarify Room CX07 status/readiness for Ms Renée — conflicting occupancy evidence (do not invent a different room).

## Recommendations

1. Clarify Room CX07 status/readiness for Ms Renée — conflicting occupancy evidence (do not invent a different room). _(priority: high)_

## Human Expected Truth (side-by-side)

### OPEN expected
- Clarify / confirm CX07 readiness path for Talbot with DM/HK (conflict acknowledgement + clean completion) — allocation contradiction handling.
- Continue without inventing a Main House room change unless DM writes it.

### MONITOR expected
- Clean progress on CX07 toward 15:00 arrival.

### INFORMATION expected
- Adeyemi DONE; company-billed Talbot; shuttle routine.

### UNRESOLVED expected
- Residual contradiction between stale stayover vs checked-out/vacant dirty until statuses aligned — intentional; do not invent “correct” Main room.

### Must not invent
- Different Main room for Talbot without written reallocation.
- Silently dropping the conflict.
- False £95 collect.
- Reopening Adeyemi fruit.

Full dump: `scenario-009-sprint15.json`
