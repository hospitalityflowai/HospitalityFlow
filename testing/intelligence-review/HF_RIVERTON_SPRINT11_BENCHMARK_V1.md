# HF Riverton Sprint 11 Benchmark V1

**Objective:** Blocked allocation & room-status contradiction  
**Primary targets:** 004, 006, 018  
**Corpus:** Riverton Bloomsbury scenarios 001–020 (Human Expected Truth frozen)

## Contract

When an arrival’s assigned/system room is evidenced unavailable, OOO, or operationally contradicted → OPEN allocation/clarification. Never invent a replacement room. Soft/mitigated OOO → MONITOR / non-OPEN chase. Do not emit quiet-shift “no urgent priorities” when a genuine unresolved allocation conflict exists.

## Suite

`node scripts/test-reasoning-sprint11-blocked-allocation.mjs` → **27 passed, 0 failed**

## Riverton engine compare (Sprint 10 → Sprint 11)

| Metric | S10 | S11 |
|--------|-----|-----|
| OPEN total (canonical) | 21 | 22 |
| Blocked/clarify OPEN | 0 | 3 |
| Payment `payment:collect` OPEN | 1 | 1 |
| False-family OPEN (S10 family heuristic) | 9 | 8 |

### Primary targets

| ID | Before (S10) | After (S11) |
|----|--------------|-------------|
| **004** | OPEN false luggage EA (“Deluxe King”); MONITOR 316 soft | OPEN `allocation:blocked_assigned` Whitby/LG08; Option B luggage suppressed; MONITOR OOO 316 not-sellable |
| **006** | OPEN maintenance chase 218; no Yuen reallocate | OPEN `allocation:blocked_assigned` Yuen/218; MONITOR soft OOO 218 |
| **018** | No OPEN; briefing “no urgent priorities” | OPEN `occupancy_conflict:clarify` Quill/315; no £120 collect |

### Other 17

No OPEN facet-set changes except **020** briefing text-only delta (OPEN facets unchanged). Payment collect OPEN remains **1** (015 Calder).

## Freeze recommendation

After Sprint 11 review: **freeze these 20** Riverton scenarios for generalisation measurement. Do not keep polishing the same corpus.

## Evidence

`testing/riverton-bloomsbury/sprint11-validation/`
