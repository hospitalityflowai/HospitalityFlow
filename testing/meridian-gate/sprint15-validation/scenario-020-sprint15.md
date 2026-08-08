# Scenario-020 ? MERIDIAN GATE Sprint 15 state-resolution validation OUTPUT

**Label:** MERIDIAN GATE Sprint 15 state-resolution validation OUTPUT

Human Expected Truth authority remains in `../scenario-020.md` (FROZEN BEFORE FIRST HF RUN). This file is engine output only.

## Run metadata
- Scenario: 020 ? Adversarial Night Paste: Everything Competing
- Shift: Night
- Load: Adversarial / ambiguous
- Git commit (engine): `4de18214bfbcd0b645c1b0b548f0e52e6c4dde22`
- Engine version: 1
- Ran at: 2026-08-08T14:51:56.907Z
- Scenario file SHA-256: `ce93966beb7c7027381cbd67fc6ec23519de9faad1eb285b2dfc0355fbbe4949`
- Source input SHA-256: `536ff32bd18c051b7ab455145ec421e983e87ed042af17178fbb60690adf4791`

## Canonical actions

- Anchor: handover_date=2026-09-25 shift=Night created_at=2026-09-25T23:20:00.000Z
- State counts: {"open":1,"monitor":0,"information":3,"unresolved":1,"blocked":0,"resolved":0,"other":0}

- **open** `payment:collect` P2 ? Collect outstanding payment for Room M128 before departure _(room M128)_ _(guest Mr Holt)_ _(temporal: today/2026-09-25/collect)_
- **unresolved** `amenity:conditional` P3 ? Confirm availability before preparing champagne in Room M140 _(room M140)_
- **information** `vip:prep_complete` P3 ? VIP prep complete / awareness only _(room MS04)_
- **information** `payment:insufficient_evidence` P3 ? Payment-related note retained — insufficient evidence for collect chase _(room M126)_
- **information** `payment:insufficient_evidence` P3 ? Payment-related note retained — insufficient evidence for collect chase _(room CX11)_

## AI Summary / Briefing

Priority 1
Follow up with Maintenance regarding Room cx11 shower/leak before further guest impact.

Priority 2
Timed departure actions for Room m210: wake-up at 04:30.

Priority 3
Collect outstanding payment for Room M128 before departure.

Priority 4
Revenue follow-up required for Room m128 outstanding £42.50 before departures.

## Recommendations

1. Collect outstanding payment for Room M128 before departure. _(priority: normal)_
2. Complete the 04:30 wake-up call for Rooms M210, M212 — wake-up call not yet confirmed as loaded this shift (Room M210). _(priority: high)_

## Human Expected Truth (side-by-side)

### OPEN expected
- Collect £42.50 Holt M128 when contact possible overnight.
- Honour early crew readiness / wake for M210–M212 ~04:55 (timed Night ownership).

### MONITOR expected
- CX11 controlled stain overnight; morning valet leftover car; champagne only if stock later.
- CX03 Acc status clarify with HK in AM — not Night sell.

### INFORMATION expected
- Spa/valet closed; fruit DONE; wrong-hotel paste noise; TR-3 not bedroom; declined room move.

### UNRESOLVED expected
- Whether CX03 sticky vs stayover needs AM HK align — not solvable by inventing free Acc tonight.
- Champagne availability.

### Must not invent
- Uncontrolled leak OPEN chase tonight.
- Forced room move.
- Quill collect or Opera room 32 allocation.
- Selling TR-3 or CX03 Acc.
- Hard OPEN champagne.
- Cross-building “fix” without DM.

Full dump: `scenario-020-sprint15.json`
