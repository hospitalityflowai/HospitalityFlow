# Scenario-015 — MERIDIAN GATE FIRST-RUN BASELINE OUTPUT

**Label:** MERIDIAN GATE FIRST-RUN BASELINE OUTPUT

Human Expected Truth authority remains in `../scenario-015.md` (FROZEN BEFORE FIRST HF RUN). This file is engine output only.

## Run metadata
- Scenario: 015 — Early-AM Airport Pressure Stack
- Shift: AM
- Load: Busy
- Git commit (engine): `0b70a8e495fbbdcec8a0d2bca23f4fd2450265e7`
- Engine version: 1
- Ran at: 2026-08-08T13:29:06.237Z
- Scenario file SHA-256: `6366dc52da82d5a60d9270acda42fe37112316ae8527aa8c6bc97c10a0593ac6`
- Source input SHA-256: `296dd471122951cfbdd8dabb48964fc6f546a0bcabaf440b36893240f0dd02c2`

## Canonical actions

- Anchor: handover_date=2026-09-20 shift=AM created_at=2026-09-20T07:15:00.000Z
- State counts: {"open":2,"monitor":0,"information":0,"unresolved":0,"blocked":0,"resolved":1,"other":0}

- **open** `guest_request:ea_luggage_near` P2 — Honour early arrival / lunch luggage arrangements for Acc Okonkwo _(guest Acc Okonkwo)_ _(temporal: today/11:00)_
- **open** `guest_request:luggage_ea` P2 — Honour luggage / early-arrival arrangements _(temporal: information)_
- **resolved** `payment:no_collect` exclude — Payment settled / no collect required

## AI Summary / Briefing

Priority 1
Honour early arrival / lunch luggage arrangements for Acc Okonkwo.

Priority 2
Honour luggage / early-arrival arrangements.

## Recommendations

1. Honour early arrival / lunch luggage arrangements for Acc Okonkwo. _(priority: normal)_
2. Honour early arrival / lunch luggage arrangements for Acc Okonkwo. _(priority: normal)_
3. Complete the 07:20 wake-up call — follow-up still required this shift. _(priority: normal)_

## Human Expected Truth (side-by-side)

### OPEN expected
- Resolve Okonkwo accessible transport plan (07:20 vs 08:10 vs taxi) with Concierge/Shuttle — do not silently drop.
- Manage early departure luggage/HK turn pressure without inventing room ready times.

### MONITOR expected
- M126 EA ~11:00 if-ready — unconfirmed.
- 09:15 shuttle full list.

### INFORMATION expected
- 05:45 DONE; F&B pastry complaint; settled flyers.

### UNRESOLVED expected
- Okonkwo’s final transport choice — intentional until confirmed.

### Must not invent
- Silent removal of Okonkwo from transport need.
- Promising M126 ready for EA.
- Room defect OPEN from cold pastries.
- Inventing private jet / non-evidenced transport.

Full dump: `scenario-015-baseline.json`
