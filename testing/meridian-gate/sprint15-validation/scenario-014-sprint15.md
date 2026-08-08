# Scenario-014 ? MERIDIAN GATE Sprint 15 state-resolution validation OUTPUT

**Label:** MERIDIAN GATE Sprint 15 state-resolution validation OUTPUT

Human Expected Truth authority remains in `../scenario-014.md` (FROZEN BEFORE FIRST HF RUN). This file is engine output only.

## Run metadata
- Scenario: 014 ? Night Payment Contrast and Lean Cover
- Shift: Night
- Load: Normal
- Git commit (engine): `4de18214bfbcd0b645c1b0b548f0e52e6c4dde22`
- Engine version: 1
- Ran at: 2026-08-08T14:51:56.907Z
- Scenario file SHA-256: `ab93232e930f16165e649694fa83536f787330ed47774756fb58535f05a94638`
- Source input SHA-256: `3fcf325044851dc5a923afcba55bbfa77b16255df5aa9e7f8a8d891482d12a62`

## Canonical actions

- Anchor: handover_date=2026-09-19 shift=Night created_at=2026-09-19T23:20:00.000Z
- State counts: {"open":1,"monitor":1,"information":2,"unresolved":0,"blocked":0,"resolved":1,"other":0}

- **open** `payment:collect` P2 ? Collect outstanding payment for Room M124 before departure _(room M124)_ _(guest Mr Calder)_ _(temporal: today/2026-09-19/collect)_
- **monitor** `maintenance:tomorrow_inspect` P3 ? Monitor Room M311 overnight — mitigated; escalate only if worsens _(room M311)_ _(temporal: tomorrow/2026-09-20/inspect)_
- **information** `payment:insufficient_evidence` P3 ? Payment-related note retained — insufficient evidence for collect chase _(room CX06)_ _(guest Ms Green)_
- **information** `payment:insufficient_evidence` P3 ? Payment-related note retained — insufficient evidence for collect chase _(room M133)_
- **resolved** `payment:no_collect` exclude ? Payment settled / no collect required for Room M220 _(room M220)_ _(guest Mr Calder)_

## AI Summary / Briefing

Priority 1
Collect outstanding payment for Room M124 before departure.

Priority 2
Monitor Room M311 overnight — mitigated; escalate only if worsens.

Priority 3
Revenue follow-up required for Room m124 outstanding £64.80 before departures.

Priority 4
Revenue follow-up required for outstanding channel payment before departures.

## Recommendations

1. Collect outstanding payment for Room M124 before departure. _(priority: normal)_

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

Full dump: `scenario-014-sprint15.json`
