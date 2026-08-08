# HF Riverton Sprint 10 Benchmark V1

**Label:** RIVERTON SPRINT 10 — CANONICAL STATE-RESOLUTION HARDENING  
**Status:** Human benchmark approved  
**Date:** 2026-08-08  
**Engine base:** post–Sprint 9 payment harden + Sprint 10 state-resolution  
**Authority:** Human Expected Truth in `testing/riverton-bloomsbury/scenario-001.md` … `scenario-020.md`  
**Compared:** Frozen Sprint 9 validation (`sprint9-validation/`) vs Sprint 10 validation (`sprint10-validation/`)

---

## Executive verdict

Sprint 10 **materially improved** completed / cancelled / mitigated / declined / conditional state handling without suppressing legitimate keep-B work and without changing Sprint 9 payment collect behaviour.

| Item | Result |
|------|--------|
| Contract | **Validated** |
| True Sprint 10 blockers | **None** |
| Material Sprint-10 regressions | **None** |
| Recommendation | **A — commit** |

---

## Overall classification counts

| | Clear | Partial | Material |
|--|------:|--------:|---------:|
| **Sprint 9** | **2** | **6** | **12** |
| **Sprint 10** | **3** | **10** | **7** |

Net: +1 Clear, +4 Partial, −5 Material.

---

## Materially improved scenarios

| ID | S9 → S10 | Headline |
|----|----------|----------|
| **001** | Material → Partial | Completed pillows no longer OPEN; quiet honesty improved |
| **005** | Material → Partial | DONE twin no longer OPEN; cot completeness still missing |
| **007** | Material → Partial | Mitigated 307 → MONITOR (not P0 chase) |
| **012** | Material → **Clear** | Negatives + conditional champagne fail-closed |
| **020** | Material → Partial | Cancel fruit / DONE twin / decline 205 / keep Camille card |

---

## Per-scenario classification (Sprint 10)

| ID | Class | Notes |
|----|-------|-------|
| 001 | Partial | Pillows fixed; soft 308 follow-up residual |
| 002 | **Clear** | Unchanged quiet honesty |
| 003 | Material | Twin 314 still missing; false lift maint OPEN |
| 004 | Material | Whitby allocation missing; 316 demoted (see residual) |
| 005 | Partial | Twin DONE fixed; cot/tickets still absent |
| 006 | Material | Yuen allocation missing; 218 seating residual |
| 007 | Partial | MONITOR correct; £12 briefing wording residual |
| 008 | Material | Fruit DONE fixed; events MR-B still absent |
| 009 | Material | Tea→fruit invent unchanged |
| 010 | Partial | Lutz timed OK |
| 011 | Partial | Amenity bind still weak |
| 012 | **Clear** | Language trap cleared; champagne unresolved |
| 013 | Partial | Roses cancel / keep truffles OK; prosecco/dedup noise |
| 014 | Partial | Token MONITOR retained |
| 015 | Partial | Calder OPEN preserved; seating/bind gaps |
| 016 | **Clear** | Late c/o UNRESOLVED success unchanged |
| 017 | Partial | Luggage horizon unchanged (out of Sprint 10 scope) |
| 018 | Material | Quill/315 contradiction still silent |
| 019 | Material | Group taxi still weak |
| 020 | Partial | State-resolution largely correct; Klein/token residuals |

---

## Contract verification (human review)

- Every OPEN removed by Sprint 10 was genuinely non-OPEN per Human Expected Truth.
- Cancel-A / keep-B held (013 truffles/card; 020 Camille card; 008 luggage EA).
- DONE twin did not newly suppress cot (cot was already absent in Sprint 9).
- Conditional champagne fail-closed to `unresolved`, not completed.
- Mitigated maintenance not under-escalated vs genuine uncontrolled danger (suite P0 smell retained).
- Sprint 9 payment: OPEN `payment:collect` **1 → 1** (Calder); no Riverton payment OPEN diffs.

---

## Known residual (non-blocking)

**004 / 006 OOO wording / seating**

- **004:** Room 316 Acc OOO correctly non-OPEN / MONITOR-aligned with HET, but action text may use comfort-mitigation wording (“mitigated; escalate only if worsens”) for inventory OOO.
- **006:** Soft OOO 218 follow-up can seat more prominently than Sprint 9’s exclude-ranked open; Yuen allocation OPEN still missing (pre-existing).

Not treated as Sprint 10 blockers.

---

## Remaining dominant failure families (after Sprint 10)

1. Missing required OPEN (allocation / accessible / events / cot / group taxi / twin 314)
2. Amenity / F&B misclassification (tea→fruit)
3. Entity/room binding under density
4. Temporal luggage horizon (017 — intentionally out of Sprint 10)
5. Decision seating gaps

---

## Evidence pointers

- Suite: `scripts/test-reasoning-sprint10-state-resolution.mjs`
- Validation: `testing/riverton-bloomsbury/sprint10-validation/`
- Frozen S9 (immutable for this benchmark): `testing/riverton-bloomsbury/sprint9-validation/`
- Frozen S8 baseline: `testing/riverton-bloomsbury/sprint8-baseline-validation/`
- Compare: `testing/riverton-bloomsbury/sprint10-validation/RIVERTON_SPRINT10_STATE_COMPARE.json`
