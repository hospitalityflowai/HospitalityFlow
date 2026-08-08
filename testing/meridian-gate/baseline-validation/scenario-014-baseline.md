# Scenario-014 — MERIDIAN GATE FIRST-RUN BASELINE OUTPUT

**Label:** MERIDIAN GATE FIRST-RUN BASELINE OUTPUT

Human Expected Truth authority remains in `../scenario-014.md` (FROZEN BEFORE FIRST HF RUN). This file is engine output only.

## Run metadata
- Scenario: 014 — Night Payment Contrast and Lean Cover
- Shift: Night
- Load: Normal
- Git commit (engine): `0b70a8e495fbbdcec8a0d2bca23f4fd2450265e7`
- Engine version: 1
- Ran at: 2026-08-08T13:29:06.237Z
- Scenario file SHA-256: `ab93232e930f16165e649694fa83536f787330ed47774756fb58535f05a94638`
- Source input SHA-256: `3fcf325044851dc5a923afcba55bbfa77b16255df5aa9e7f8a8d891482d12a62`

## Canonical actions

- Anchor: handover_date=2026-09-19 shift=Night created_at=2026-09-19T23:20:00.000Z
- State counts: {"open":2,"monitor":0,"information":0,"unresolved":0,"blocked":0,"resolved":2,"other":0}

- **open** `maintenance` P1 — Follow up open maintenance _(temporal: tomorrow/2026-09-20/inspect)_
- **open** `maintenance` P1 — Follow up open maintenance _(temporal: information/inspect)_
- **resolved** `payment:no_collect` exclude — Payment settled / no collect required _(guest Mr Calder)_
- **resolved** `outstanding_balance` exclude — Superseded current-state fact _(guest Mr Calder)_

## AI Summary / Briefing

Priority 1
Follow up open maintenance.

Priority 2
Follow up open maintenance.

## Recommendations

1. Follow up with Maintenance regarding payment follow-up. The fault remains open and needs resolution this shift. _(priority: high)_
2. Follow up with Maintenance regarding payment follow-up. The fault remains open and needs resolution this shift. _(priority: high)_

## Human Expected Truth (side-by-side)

### OPEN expected
- Collect / settle £64.80 with Calder M124 (or first contact when appropriate overnight).

### MONITOR expected
- M311 extractor overnight / eng tomorrow.
- M133 balance due tomorrow — future payment, not tonight OPEN collect.

### INFORMATION expected
- Prepaid Green; company Apex; lean staffing; external taxi awareness.

### UNRESOLVED expected
- None material on debt existence for Calder — amount evidenced.

### Must not invent
- Collect on Green / Apex / M133-tonight.
- OPEN eng chase on mitigated M311.
- Hotel shuttle task with no shuttle evidence.

Full dump: `scenario-014-baseline.json`
