# Scenario-002 — MERIDIAN GATE FIRST-RUN BASELINE OUTPUT

**Label:** MERIDIAN GATE FIRST-RUN BASELINE OUTPUT

Human Expected Truth authority remains in `../scenario-002.md` (FROZEN BEFORE FIRST HF RUN). This file is engine output only.

## Run metadata
- Scenario: 002 — Midweek PM Shuttle and Prepaid Arrival
- Shift: PM
- Load: Normal
- Git commit (engine): `0b70a8e495fbbdcec8a0d2bca23f4fd2450265e7`
- Engine version: 1
- Ran at: 2026-08-08T13:29:06.237Z
- Scenario file SHA-256: `4eba062458b99cd2df59df4af461d417ce8ccc56fc6724ea26f23bc2e2ebc14e`
- Source input SHA-256: `9ef6579ca5fdfcc048de3a24acc6d8db90ebcbd99b46ff5973df278e277b8cde`

## Canonical actions

- Anchor: handover_date=2026-09-09 shift=PM created_at=2026-09-09T15:45:00.000Z
- State counts: {"open":0,"monitor":0,"information":2,"unresolved":0,"blocked":0,"resolved":2,"other":0}

- **information** `vip:prep_complete` P3 — Dr Hale — VIP prep complete / awareness only _(guest Dr Hale)_
- **information** `payment:insufficient_evidence` P3 — Payment-related note retained — insufficient evidence for collect chase
- **resolved** `payment:no_collect` exclude — Payment settled / no collect required _(guest Ms Keita)_
- **resolved** `payment:no_collect` exclude — Payment settled / no collect required

## AI Summary / Briefing

Shift status
No urgent guest-impacting priorities for the incoming team.

## Recommendations

1. Complete the 18:30 wake-up call — follow-up still required this shift. _(priority: normal)_

## Human Expected Truth (side-by-side)

### OPEN expected
- Honour / complete shuttle meet-and-keys readiness for Langs + Keita before ~17:55 return (Reception/Concierge ownership with Shuttle).

### MONITOR expected
- Spa day members to 18:30 — non-resident; taxi only if requested (not overnight conversion unless booked).

### INFORMATION expected
- Prepaid zero-balance arrivals; valet quiet; park capacity OK; annex near-full awareness.

### UNRESOLVED expected
- None material.

### Must not invent
- False payment collect on prepaid Langs/Keita.
- Private taxi/transfer instead of evidenced shuttle.
- Overnight stay for spa day members without booking.
- Inventing free CX rooms for declined walk-in.

Full dump: `scenario-002-baseline.json`
