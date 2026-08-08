# Scenario-006 ? MERIDIAN GATE Sprint 14 timed-transport validation OUTPUT

**Label:** MERIDIAN GATE Sprint 14 timed-transport validation OUTPUT

Human Expected Truth authority remains in `../scenario-006.md` (FROZEN BEFORE FIRST HF RUN). This file is engine output only.

## Run metadata
- Scenario: 006 ? Crew Block vs Quiet-Wing Sell Pressure
- Shift: AM
- Load: Busy
- Git commit (engine): `8c48ea8d19b6b3dd9f42378f66702e9764949576`
- Engine version: 1
- Ran at: 2026-08-08T14:27:31.330Z
- Scenario file SHA-256: `4dba441c4645ec52bf76125e6a91b867e01ff1e30c1e859a70c77ff46c4c5674`
- Source input SHA-256: `7d926d812d2fa9771fb95e2e7e9942a0699569f32ae689cd384e7770effdefae`

## Canonical actions

- Anchor: handover_date=2026-09-12 shift=AM created_at=2026-09-12T07:15:00.000Z
- State counts: {"open":1,"monitor":0,"information":0,"unresolved":0,"blocked":0,"resolved":0,"other":0}

- **open** `allocation:blocked_assigned` P1 ? Clarify / reallocate arrival for Mr Patel — assigned Room M212 is unavailable or blocked (do not invent a replacement room) _(room M212)_ _(guest Mr Patel)_

## AI Summary / Briefing

Priority 1
Clarify / reallocate arrival for Mr Patel — assigned Room M212 is unavailable or blocked (do not invent a replacement room).

## Recommendations

1. Clarify / reallocate arrival for Mr Patel — assigned Room M212 is unavailable or blocked (do not invent a replacement room). _(priority: high)_

## Human Expected Truth (side-by-side)

### OPEN expected
- Reallocate / clarify room for Patel away from crew-blocked M212 (Reception/DM).
- Protect crew block from leisure sell until written SkyLink release.

### MONITOR expected
- SkyLink delayed inbound ~22:40 — readiness of quiet wing for crew (not leisure).
- M218 VD as possible path only if confirmed — not promised.

### INFORMATION expected
- Patel prepaid; annex near full; clean M216/M217 as house facts.

### UNRESOLVED expected
- Which exact sellable Main room Patel takes — unresolved until allocated in writing; do not invent.

### Must not invent
- Keeping Patel on M212.
- Selling crew rooms to walk-ins.
- Inventing a specific CX room for Patel without evidence.
- Collect on prepaid Patel.

Full dump: `scenario-006-sprint14.json`
