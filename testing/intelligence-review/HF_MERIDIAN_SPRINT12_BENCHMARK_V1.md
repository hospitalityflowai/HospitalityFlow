# HF Meridian Sprint 12 Benchmark V1

**Objective:** Generic operational room-token identity & binding  
**Hotel:** The Meridian Gate Hotel & Spa (fictional, frozen Phase B corpus)  
**Primary targets:** 006, 009, 011, 013, 018 (+ 014 payment side-effect review)  
**Corpus:** Meridian scenarios 001–020 (Human Expected Truth + FREEZE_MANIFEST frozen)

## Contract

Preserve meaningful prefixes as stable atomic room / operational-space IDs through extraction → facts → entity binding → canonical actions → Sprint 11 allocation/contradiction reasoning.

Examples: `M124`, `CX07`, `MS03`, `MA02`, `TR-2`, existing `LG08`, numeric `315`.

Never collapse `CX07 → 7` / `M124 → 124`. Do not invent room IDs. Do not assume every alphanumeric token is a guest bedroom. Preserve numeric-room and LG08 behaviour. No Meridian-specific keyword packs.

## Suite

`node scripts/test-reasoning-sprint12-room-token-identity.mjs` → **36 passed, 0 failed**

Protected regressions at packaging: Sprint 9 payment **29/0**, Sprint 10 state-resolution **28/0**, Sprint 11 blocked-allocation **27/0**.

## Human benchmark (baseline → Sprint 12)

Frozen first-run baseline (`MERIDIAN_BASELINE_FAILURE_MAP.json`): **3 Clear / 4 Partial / 13 Material**.

Sprint 12 human re-score against frozen HET: **4 Clear / 7 Partial / 9 Material**.

| ID | Baseline | Sprint 12 | Notes |
|----|----------|-----------|-------|
| 001 | PARTIAL | PARTIAL | Quiet OK; rooms appear |
| 002 | MATERIAL | MATERIAL | Shuttle still missing |
| 003 | MATERIAL | MATERIAL | Soft maint still OPEN |
| 004 | PARTIAL | PARTIAL | Trent luggage binds **M122** |
| 005 | MATERIAL | MATERIAL | DONE iron still OPEN → **M203** |
| 006 | MATERIAL | **PARTIAL** | OPEN `allocation:blocked_assigned` @ **M212** / Patel |
| 007 | MATERIAL | MATERIAL | Valet still missing |
| 008 | CLEAR | CLEAR | Quiet control held |
| 009 | MATERIAL | **CLEAR** | OPEN `occupancy_conflict:clarify` @ **CX07** |
| 010 | MATERIAL | MATERIAL | False wedding collect now @ **CX14** |
| 011 | MATERIAL | **PARTIAL** | **MA02 / M114 / M115** distinct; OPENs still absent |
| 012 | CLEAR | CLEAR | MONITOR-only held |
| 013 | MATERIAL | MATERIAL | **TR-2** atomic (not room 2); Crowe reallocate still silent |
| 014 | MATERIAL | **PARTIAL** | OPEN `payment:collect` @ **M124** Calder £64.80; M311 false OPEN remains |
| 015 | MATERIAL | MATERIAL | Wrong EA framing; binds improved |
| 016 | PARTIAL | PARTIAL | Twin → **M206** |
| 017 | MATERIAL | MATERIAL | Crew/valet/shuttle still silent |
| 018 | MATERIAL | MATERIAL | **M152** ≠ **CX10**; soft interconnect invent sharper |
| 019 | CLEAR | CLEAR | Quiet settled held |
| 020 | PARTIAL | PARTIAL | Holt collect → **M128** |

### Primary targets

| ID | Before (baseline) | After (Sprint 12) |
|----|-------------------|-------------------|
| **006** | Silent / no rooms | OPEN blocked-alloc **M212**; crew-sell protect still missing → PARTIAL |
| **009** | Silent on CX07 | OPEN occupancy-conflict **CX07** → CLEAR |
| **011** | No room IDs / no OPEN | Identities bind; critical Acc/interconnect OPENs absent → PARTIAL |
| **013** | Silent | **TR-2** preserved; no reallocate OPEN → MATERIAL |
| **018** | Silent; soft interconnect | IDs separate; no clarify OPEN; soft pair wording sharper → MATERIAL |

### 014 payment side-effect

Baseline collapsed Calder into `payment:no_collect` (genuine £64.80 collect missing). Sprint 12 restores OPEN collect for **Mr Calder / M124** from folio evidence. Green / Apex / M133-tonight not OPEN collect. Residual: soft M311 maintenance still false OPEN; mild Calder label bleed on Apex M220 `no_collect`.

## Architectural conclusion

Generic room-token identity is a successfully generalised capability: same path serves M/CX/MA/MS/TR/LG/numeric and unlocks existing Sprint 11 allocation/conflict + Sprint 9 payment when room identity was the missing key. Soft briefing debt (018 invalid pair naming; 010 CX14-bound false collect) is next-layer work, not a contract failure.

**Recommendation at review:** A — commit.

## Highest-leverage remaining failure family (Sprint 13 candidate — not implemented)

Special / invalid inventory allocation after tokens exist: TR-as-bedroom (**013**), cross-building interconnect impossibility (**018**), accessible hold/readiness (**011**).

## Evidence

`testing/meridian-gate/sprint12-validation/`  
Frozen scenarios / `FREEZE_MANIFEST.json` / `baseline-validation/` unchanged.
