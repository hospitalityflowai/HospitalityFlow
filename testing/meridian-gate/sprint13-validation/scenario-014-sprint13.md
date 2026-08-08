# Scenario-014 � MERIDIAN GATE Sprint 13 invalid-inventory validation OUTPUT

**Label:** MERIDIAN GATE Sprint 13 invalid-inventory validation OUTPUT

Human Expected Truth authority remains in `../scenario-014.md` (FROZEN BEFORE FIRST HF RUN). This file is engine output only.

## Run metadata
- Scenario: 014 � Night Payment Contrast and Lean Cover
- Shift: Night
- Load: Normal
- Git commit (engine): `a5a826fb8d04393858ebd1e210ceb024e0cbc4fd`
- Engine version: 1
- Ran at: 2026-08-08T14:08:35.385Z
- Scenario file SHA-256: `ab93232e930f16165e649694fa83536f787330ed47774756fb58535f05a94638`
- Source input SHA-256: `3fcf325044851dc5a923afcba55bbfa77b16255df5aa9e7f8a8d891482d12a62`

## Canonical actions

- Anchor: handover_date=2026-09-19 shift=Night created_at=2026-09-19T23:20:00.000Z
- State counts: {"open":3,"monitor":0,"information":2,"unresolved":0,"blocked":0,"resolved":1,"other":0}

- **open** `maintenance` P1 � Follow up maintenance for Room M311 _(room M311)_ _(temporal: tomorrow/2026-09-20/inspect)_
- **open** `maintenance` P1 � Follow up open maintenance _(temporal: information/inspect)_
- **open** `payment:collect` P2 � Collect outstanding payment for Room M124 before departure _(room M124)_ _(guest Mr Calder)_ _(temporal: today/2026-09-19/collect)_
- **information** `payment:insufficient_evidence` P3 � Payment-related note retained — insufficient evidence for collect chase _(room CX06)_ _(guest Ms Green)_
- **information** `payment:insufficient_evidence` P3 � Payment-related note retained — insufficient evidence for collect chase _(room M133)_
- **resolved** `payment:no_collect` exclude � Payment settled / no collect required for Room M220 _(room M220)_ _(guest Mr Calder)_

## AI Summary / Briefing

Priority 1
Follow up maintenance for Room M311.

Priority 2
Follow up open maintenance.

Priority 3
Collect outstanding payment for Room M124 before departure.

Priority 4
Revenue follow-up required for Room m124 outstanding £64.80 before departures.

Priority 5
Revenue follow-up required for outstanding channel payment before departures.

## Recommendations

1. Follow up with Maintenance regarding Room M311 shower/leak. The fault remains open and needs resolution this shift. _(priority: high)_
2. Follow up with Maintenance regarding Room M311 shower/leak. The fault remains open and needs resolution this shift. _(priority: high)_
3. Collect outstanding payment for Room M124 before departure. _(priority: normal)_

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

Full dump: `scenario-014-sprint13.json`
