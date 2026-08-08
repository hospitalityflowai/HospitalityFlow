# HF Meridian Sprint 15 Benchmark V1

**Objective:** Soft/mitigated maintenance → MONITOR; completed amenity non-reopen  
**Hotel:** The Meridian Gate Hotel & Spa (fictional, frozen Phase B corpus)  
**Primary targets:** 003, 005  
**Secondary transfer:** 014 (M311 soft MONITOR + Calder collect)  
**Briefing/seating check:** 012 (contradictory OPEN chase removed beside MONITOR)  
**Corpus:** Meridian scenarios 001–020 (Human Expected Truth + FREEZE_MANIFEST frozen)

## Contract

When maintenance evidence explicitly establishes a controlled, mitigated, deferred, or monitor-only state (e.g. okay for tonight, monitor, do not wake engineering, not a release issue, temporary mitigation), resolve to MONITOR rather than hard OPEN — provided there is no contradictory evidence of active guest/safety/operational impact requiring action.

Do not broadly suppress maintenance because words such as “leak”, “drain”, or “AC” appear. Genuine uncontrolled or guest-impacting maintenance must remain OPEN.

When the same amenity/request facet is explicitly DONE/completed/delivered, downstream action harvesting must not recreate it as OPEN. Apply facet-locally: completion of one amenity must not suppress a different outstanding amenity/request.

Out of scope: spa-day → overnight conversion, valet/parking, pavilion/events/cake, payment unposted/master-account redesign, crew inventory, priority/UI/Supabase, Meridian-specific keyword patches, forcing overall Meridian score improvement.

## Suite

`node scripts/test-reasoning-sprint15-state-resolution-completion.mjs` → **14 passed, 0 failed**

Protected regressions at packaging: Sprint 9 payment **29/0**, Sprint 10 state-resolution **28/0**, Sprint 11 blocked-allocation **27/0**, Sprint 12 room-token **36/0**, Sprint 13 invalid-inventory **22/0**, Sprint 14 timed-transport **21/0**.

## Human benchmark (baseline → Sprint 14 → Sprint 15)

| | Clear | Partial | Material |
|--|------:|--------:|---------:|
| **Baseline** | 3 | 4 | 13 |
| **Sprint 12** | 4 | 7 | 9 |
| **Sprint 13** | 6 | 7 | 7 |
| **Sprint 14** | 8 | 8 | 4 |
| **Sprint 15** | **10** | **8** | **2** |

Classification changes this sprint: **003** MATERIAL → CLEAR; **005** MATERIAL → PARTIAL; **014** PARTIAL → CLEAR. Other 17 unchanged vs Sprint 14 (including **012** still CLEAR — seating-only improvement).

### Primary targets

| ID | Sprint 14 | Sprint 15 |
|----|-----------|-----------|
| **003** | False OPEN scaffold maintenance | MONITOR CX12 mitigated drain; Dudley `no_collect` preserved; briefing seats MONITOR → **CLEAR** |
| **005** | False OPEN iron M203 | Iron DONE resolved (`:done`); quiet briefing; spa conversion still out of scope → **PARTIAL** |

### Secondary / seating

| ID | Sprint 14 | Sprint 15 |
|----|-----------|-----------|
| **014** | OPEN M311 + scaffold; Calder collect | MONITOR M311; Calder £64.80 collect OPEN preserved and leads briefing → **CLEAR** |
| **012** | MONITOR M305 + contradictory OPEN chase in briefing | MONITOR unchanged; contradictory chase removed → **CLEAR** (seating win) |

### Hotspot checks (no regression)

- **002 / 015:** timed transport OPENs unchanged
- **004:** Trent luggage/EA OPEN preserved
- **008 / 019:** quiet controls unchanged
- **013 / 018:** invalid inventory / invalid configuration intact
- **020:** Holt genuine collect preserved
- No false transport/payment/allocation changes outside intended soft-maint / DONE seats
- Genuine uncontrolled maintenance remains OPEN (suite pin)

## Architectural conclusion

Soft/mitigated maintenance MONITOR and completed amenity non-reopen successfully complete the Sprint 10 state-resolution spine. Root causes were fixed (negated wake, soft mitigation detectors, scaffold skip, iron short-form DONE, MONITOR seating demotion) — not mere output suppression. Recommendation at review: **A — commit**.

## After Sprint 15

Stop Meridian intelligence sprints. Remaining Material **007** (valet) and **010** (unposted collect + event/valet) are new/high-risk families, not unfinished soft-state architecture. Return to real-hotel field testing / pilot preparation. Sprint 16 not justified on this corpus.

## Evidence

`testing/meridian-gate/sprint15-validation/`  
`testing/meridian-gate/sprint15-validation/MERIDIAN_SPRINT15_STATE_RESOLUTION_COMPARE.json`  
Frozen scenarios / `FREEZE_MANIFEST.json` / `baseline-validation/` / `sprint12–14-validation/` unchanged.
