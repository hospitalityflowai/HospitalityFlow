# Scenario-016 — MERIDIAN GATE FIRST-RUN BASELINE OUTPUT

**Label:** MERIDIAN GATE FIRST-RUN BASELINE OUTPUT

Human Expected Truth authority remains in `../scenario-016.md` (FROZEN BEFORE FIRST HF RUN). This file is engine output only.

## Run metadata
- Scenario: 016 — Conditional Champagne and Genuine Twin Prep
- Shift: PM
- Load: Normal
- Git commit (engine): `0b70a8e495fbbdcec8a0d2bca23f4fd2450265e7`
- Engine version: 1
- Ran at: 2026-08-08T13:29:06.237Z
- Scenario file SHA-256: `336a3af5ecfee9b5d2afc3af71d26520cb43089c89559fe3c39a09ddaceff312`
- Source input SHA-256: `5198569f80d6059f185c27ff197e6558c080fbf4237fee042863b093dc602bf3`

## Canonical actions

- Anchor: handover_date=2026-09-21 shift=PM created_at=2026-09-21T15:45:00.000Z
- State counts: {"open":1,"monitor":0,"information":3,"unresolved":1,"blocked":0,"resolved":0,"other":0}

- **open** `amenity:twin` P2 — Prepare twin beds for Mrs Nwosu _(guest Mrs Nwosu)_
- **unresolved** `amenity:conditional` P3 — Confirm availability before preparing champagne + fruit + welcome card for Ms Camille Brennan _(guest Ms Camille Brennan)_
- **information** `vip:prep_complete` P3 — VIP prep complete / awareness only
- **information** `reservation_info` P3 — Reservation / POA information (not VIP prep)
- **information** `vip:no_active_amenity` P3 — No active VIP amenity outstanding

## AI Summary / Briefing

Priority 1
Prepare twin beds for Mrs Nwosu.

## Recommendations

1. Prepare twin beds for Mrs Nwosu. _(priority: normal)_

## Human Expected Truth (side-by-side)

### OPEN expected
- Prepare fruit + welcome card for Brennan MS03.
- Prepare twin beds for Nwosu M206 before arrival.

### MONITOR expected
- Champagne only if stock confirmed — conditional; must not be hard unpaid promise.

### INFORMATION expected
- Prepaid Brennan; POA Nwosu without extras; shuttle routine; cancelled balloons.

### UNRESOLVED expected
- Champagne availability — unresolved/conditional.

### Must not invent
- Hard OPEN champagne as guaranteed.
- Balloons prep.
- Payment collect without debt.
- Twin DONE without evidence.

Full dump: `scenario-016-baseline.json`
