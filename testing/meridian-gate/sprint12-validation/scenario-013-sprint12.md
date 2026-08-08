# Scenario-013 — MERIDIAN GATE Sprint 12 room-token validation OUTPUT

**Label:** MERIDIAN GATE Sprint 12 room-token validation OUTPUT

Human Expected Truth authority remains in `../scenario-013.md` (FROZEN BEFORE FIRST HF RUN). This file is engine output only.

## Run metadata
- Scenario: 013 — Treatment Room Sold as Bedroom (Adversarial)
- Shift: PM
- Load: Adversarial / ambiguous
- Git commit (engine): `092d35708fec5dc8b193402317ae92eef4f7690a`
- Engine version: 1
- Ran at: 2026-08-08T13:42:10.304Z
- Scenario file SHA-256: `cdee33fb6029279974c99906c4d93ac73930a3442d49c626331bdfd2bc130fce`
- Source input SHA-256: `40e613b1a2ff99b4c3c3907656c76909a0c593a7935e6cdb8a6a6342ddf1c115`

## Canonical actions

- Anchor: handover_date=2026-09-18 shift=PM created_at=2026-09-18T15:45:00.000Z
- State counts: {"open":0,"monitor":0,"information":1,"unresolved":0,"blocked":0,"resolved":1,"other":0}

- **information** `vip:prep_complete` P3 — VIP prep complete / awareness only _(room M130)_
- **resolved** `payment:no_collect` exclude — Payment settled / no collect required for Room TR-2 _(room TR-2)_

## AI Summary / Briefing

Shift status
No urgent guest-impacting priorities for the incoming team.

## Recommendations

_No recommendations generated (`[]`)._

## Human Expected Truth (side-by-side)

### OPEN expected
- Clarify / reallocate Crowe away from TR-2 to a real sellable guest room (DM/Reception with Spa) — do not invent final room number as solved.

### MONITOR expected
- M126 soft ready language; MS01 soft OOO not sellable.

### INFORMATION expected
- Prepaid Crowe; spa 19:00 massage in TR-2 for day member; cancelled flowers M130.

### UNRESOLVED expected
- Final room for Crowe (Main vs CX02) until written allocation — intentional.

### Must not invent
- Checking Crowe into TR-2.
- Declaring MS01 sellable / released.
- Auto-assigning a specific room as confirmed without evidence.
- Preparing cancelled flowers.

Full dump: `scenario-013-sprint12.json`
