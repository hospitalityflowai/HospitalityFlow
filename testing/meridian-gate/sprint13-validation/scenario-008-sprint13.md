# Scenario-008 � MERIDIAN GATE Sprint 13 invalid-inventory validation OUTPUT

**Label:** MERIDIAN GATE Sprint 13 invalid-inventory validation OUTPUT

Human Expected Truth authority remains in `../scenario-008.md` (FROZEN BEFORE FIRST HF RUN). This file is engine output only.

## Run metadata
- Scenario: 008 � Truly Quiet Night Control
- Shift: Night
- Load: Quiet / easy control
- Git commit (engine): `a5a826fb8d04393858ebd1e210ceb024e0cbc4fd`
- Engine version: 1
- Ran at: 2026-08-08T14:08:35.385Z
- Scenario file SHA-256: `9777cf6d1644e083e29ee75070e6b767f3611c128ceac9a463946012cddd335c`
- Source input SHA-256: `2b0beb60b6ec3ddb1e45354d1f6f9d022fb9b85fcd969c1ed66f167f3b9becc5`

## Canonical actions

- Anchor: handover_date=2026-09-14 shift=Night created_at=2026-09-14T23:20:00.000Z
- State counts: {"open":0,"monitor":0,"information":2,"unresolved":0,"blocked":0,"resolved":0,"other":0}

- **information** `vip:prep_complete` P3 � Ms Cho — VIP prep complete / awareness only _(room M117)_ _(guest Ms Cho)_
- **information** `payment:insufficient_evidence` P3 � Payment-related note retained — insufficient evidence for collect chase

## AI Summary / Briefing

Shift status
No urgent guest-impacting priorities for the incoming team.

## Recommendations

_No recommendations generated (`[]`)._

## Human Expected Truth (side-by-side)

### OPEN expected
- **None.** Correct answer may be essentially no urgent priorities.

### MONITOR expected
- M304 multi-day OOO — not a live night chase.

### INFORMATION expected
- Quiet occupancy; closed outlets; DONE welcome card; clear annex rounds.

### UNRESOLVED expected
- None.

### Must not invent
- Urgent OPEN work.
- Shuttle/crew/valet tasks with no evidence.
- Payment collect.
- Reopening DONE amenity.

Full dump: `scenario-008-sprint13.json`
