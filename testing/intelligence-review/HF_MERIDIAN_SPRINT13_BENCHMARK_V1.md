# HF Meridian Sprint 13 Benchmark V1

**Objective:** Invalid inventory / invalid product configuration  
**Hotel:** The Meridian Gate Hotel & Spa (fictional, frozen Phase B corpus)  
**Primary targets:** 013, 018  
**Corpus:** Meridian scenarios 001–020 (Human Expected Truth + FREEZE_MANIFEST frozen)

## Contract

When an assigned/system room product is evidenced as non-sellable as a guest bedroom, or the requested/assigned configuration is operationally impossible, emit OPEN clarify/reallocate.

Preserve Sprint 12 atomic room-token identity (`TR-2` never collapses to room `2`). Do not invent a replacement room or pair. Impossible Main + Annex interconnect must not be presented as a valid/resolved interconnect. Suppress soft “reserve” wording for evidenced impossible configurations. Pike must not become an invented alternative on 018.

No shuttle, valet, crew, pavilion, spa-day conversion, or payment redesign in this sprint.

## Suite

`node scripts/test-reasoning-sprint13-invalid-inventory.mjs` → **22 passed, 0 failed**

Protected regressions at packaging: Sprint 9 payment **29/0**, Sprint 10 state-resolution **28/0**, Sprint 11 blocked-allocation **27/0**, Sprint 12 room-token **36/0**.

## Human benchmark (baseline → Sprint 12 → Sprint 13)

| | Clear | Partial | Material |
|--|------:|--------:|---------:|
| **Baseline** | 3 | 4 | 13 |
| **Sprint 12** | 4 | 7 | 9 |
| **Sprint 13** | **6** | **7** | **7** |

Classification changes this sprint: **013** and **018** only (MATERIAL → CLEAR). Other 18 unchanged vs Sprint 12.

### Primary targets

| ID | Sprint 12 | Sprint 13 |
|----|-----------|-----------|
| **013** | TR-2 bound; silent / quiet | OPEN `allocation:invalid_inventory` @ **TR-2** / Mr Julian Crowe; fail-closed; TR-2 ≠ 2 → **CLEAR** |
| **018** | M152≠CX10 bound; soft reserve invent | OPEN `allocation:invalid_configuration` M152+CX10 / Mrs Okada; soft reserve suppressed; Pike not solve → **CLEAR** |

### Hotspot checks (no regression)

- **011:** not forced Clear; valid M114+M115 reserve retained; no false `invalid_configuration`
- **006 / 009:** blocked_assigned / occupancy_conflict intact
- **010 / 014:** payment opens unchanged
- **002 / 005:** no spa/treatment false-positive invalid inventory
- No `allocation:invalid_*` OPEN outside 013/018

## Architectural conclusion

Invalid inventory / impossible product clarification is a successful extension of the Sprint 11–12 allocation spine after room tokens exist. Soft invent debt on 018 from Sprint 12 is cleared. Recommendation at review: **A — commit**.

## Highest-leverage remaining failure family (Sprint 14 candidate — not implemented)

Timed transport / shuttle honour (including accessible conflict framing) — MATERIAL **002, 015, 017**.

## Evidence

`testing/meridian-gate/sprint13-validation/`  
Frozen scenarios / `FREEZE_MANIFEST.json` / `baseline-validation/` / `sprint12-validation/` unchanged.
