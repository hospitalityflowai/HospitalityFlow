# Scenario-012 — MERIDIAN GATE Sprint 12 room-token validation OUTPUT

**Label:** MERIDIAN GATE Sprint 12 room-token validation OUTPUT

Human Expected Truth authority remains in `../scenario-012.md` (FROZEN BEFORE FIRST HF RUN). This file is engine output only.

## Run metadata
- Scenario: 012 — Night Information Heavy, MONITOR Only
- Shift: Night
- Load: Quiet / easy control
- Git commit (engine): `092d35708fec5dc8b193402317ae92eef4f7690a`
- Engine version: 1
- Ran at: 2026-08-08T13:42:10.304Z
- Scenario file SHA-256: `60ac2af959debe7b35c09a97e76a8715a3bb73fdc46e81e3d2d2bdeb82c0f4b4`
- Source input SHA-256: `045cea0c031912cd3b6fad2346b5fd206d28028a06a242e1ea867f11a761ddad`

## Canonical actions

- Anchor: handover_date=2026-09-17 shift=Night created_at=2026-09-17T23:20:00.000Z
- State counts: {"open":0,"monitor":1,"information":0,"unresolved":0,"blocked":0,"resolved":1,"other":0}

- **monitor** `maintenance:tomorrow_inspect` P3 — Monitor Room M305 overnight — engineering inspect tomorrow (not a live chase) _(room M305)_ _(temporal: tomorrow/2026-09-18/inspect)_
- **resolved** `guest_request:towels:done` exclude — towels already completed for Room CX09 _(room CX09)_

## AI Summary / Briefing

Priority 1
Monitor Room M305 overnight — engineering inspect tomorrow (not a live chase).

Priority 2
Follow up with Maintenance regarding Room m305 AC fault before further guest impact.

## Recommendations

_No recommendations generated (`[]`)._

## Human Expected Truth (side-by-side)

### OPEN expected
- **None.**

### MONITOR expected
- M305 comfort overnight / tomorrow eng inspect.
- M304 multi-day OOO background.

### INFORMATION expected
- Fire panel normal; spa delivery tomorrow; no crew tonight; quiet house; towels DONE.

### UNRESOLVED expected
- None.

### Must not invent
- OPEN safety chase on normal fire panel.
- OPEN maint chase on mitigated M305.
- Tonight spa receiving OPEN.
- Urgent priorities list on a quiet information-heavy night.

Full dump: `scenario-012-sprint12.json`
