# Scenario-018 — MERIDIAN GATE FIRST-RUN BASELINE OUTPUT

**Label:** MERIDIAN GATE FIRST-RUN BASELINE OUTPUT

Human Expected Truth authority remains in `../scenario-018.md` (FROZEN BEFORE FIRST HF RUN). This file is engine output only.

## Run metadata
- Scenario: 018 — Interconnect Broken Across Buildings
- Shift: AM
- Load: Adversarial / ambiguous
- Git commit (engine): `0b70a8e495fbbdcec8a0d2bca23f4fd2450265e7`
- Engine version: 1
- Ran at: 2026-08-08T13:29:06.237Z
- Scenario file SHA-256: `4fd33e04451b503a18800f4202ca8331a2506042bb61e6623ae20144007db699`
- Source input SHA-256: `2c0e0ac3a8b1129a8c3bda04fb157452c18e07e2e320bef037f3699408bfd68a`

## Canonical actions

- Anchor: handover_date=2026-09-23 shift=AM created_at=2026-09-23T07:15:00.000Z
- State counts: {"open":0,"monitor":0,"information":1,"unresolved":0,"blocked":0,"resolved":0,"other":0}

- **information** `reservation_info` P3 — Reservation / POA information (not VIP prep)

## AI Summary / Briefing

Priority 1
Reserve interconnecting rooms for Mrs Okada.

## Recommendations

1. Reserve interconnecting rooms for tomorrow's Mrs Okada arrival. _(priority: low)_

## Human Expected Truth (side-by-side)

### OPEN expected
- Clarify / reallocate Okada to a valid Main interconnect configuration — do not treat M152+CX10 as solved product.

### MONITOR expected
- M155 VD readiness as possible pair component — unconfirmed.
- Pike M153 stayover until tomorrow — not early-out assumption.

### INFORMATION expected
- Prepaid; spa day list unrelated; Main-only interconnect house rule.

### UNRESOLVED expected
- Final interconnect room numbers until written — intentional ambiguity.

### Must not invent
- Corridor “counts as interconnect” across buildings.
- Pike early departure.
- Specific final rooms as confirmed without evidence.
- Collect on prepaid Okada.

Full dump: `scenario-018-baseline.json`
