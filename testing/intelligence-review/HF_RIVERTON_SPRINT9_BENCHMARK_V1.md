# HF Riverton Sprint 9 Benchmark V1

**Label:** RIVERTON SPRINT 9 — PAYMENT COLLECT FAIL-CLOSED  
**Status:** Human benchmark approved  
**Date:** 2026-08-08  
**Engine base:** `73e7572` + Sprint 9 payment harden  
**Authority:** Human Expected Truth in `testing/riverton-bloomsbury/scenario-001.md` … `scenario-020.md`  
**Compared:** Frozen Sprint 8 baseline (`sprint8-baseline-validation/`) vs Sprint 9 validation (`sprint9-validation/`)

---

## Executive verdict

Sprint 9 **materially improved** payment-state intelligence and downstream usefulness without suppressing legitimate collection work and without material unrelated regressions.

| Item | Result |
|------|--------|
| Contract | **Strongly validated** |
| True Sprint 9 blockers | **None** |
| Recommendation | **A — ready for commit** |

---

## Overall classification counts

| | Clear | Partial | Material |
|--|------:|--------:|---------:|
| **Sprint 8** (pre–Sprint 9) | **1** | **5** | **14** |
| **Sprint 9** | **2** | **6** | **12** |

Net: +1 Clear, +1 Partial, −2 Material (payment-driven).

---

## Payment OPEN contract

| Metric | Sprint 8 | Sprint 9 |
|--------|----------|----------|
| Payment OPEN **false positives** | **13** | **0** |
| Payment OPEN **false negatives** | **1** (Calder £64.80) | **0** |
| OPEN `payment:collect` total | 13 | 1 (supported Calder) |

### Verified

- All **12** removed OPEN `payment:collect` actions were genuinely unsupported (prepaid / POA / company / settled / future-due / void / deferred / channel-only / no-debt noise).
- Calder **£64.80** in scenario **015** is genuinely supported and correctly **OPEN**.
- **paid-out** taxi is not incorrectly interpreted as payment settled.
- prepaid / POA / company billing / card-on-file / future-due / channel-only language stays fail-closed for OPEN collect.
- Temporal payment eligibility remains correct (due tomorrow / not collecting tonight → not OPEN).
- No legitimate payment OPEN disappeared.

### Residuals (non-blockers)

- 015 Calder OPEN not always seated in briefing/recs; room bind weak; “channel” wording imprecise.
- 007 briefing may still mention £12 revenue follow-up while canonical collect is information-only.

---

## Per-scenario classification (Sprint 9)

| ID | Class | Notes |
|----|-------|-------|
| 001 | Material | Payment fixed; completed pillows/LP noise remain |
| 002 | **Clear** | Quiet honesty after false collects removed |
| 003 | Material | Payment noise cleared; twin 314 still missing |
| 004 | Material | Accessible/allocation unchanged |
| 005 | Material | Cot/interconnect unchanged |
| 006 | Material | False 405 collect cleared; Yuen allocation missing |
| 007 | Material | False collects cleared; mitigated→P0 remains |
| 008 | Material | Events unchanged |
| 009 | Material | Tea→fruit unchanged |
| 010 | Partial | Luton collect gone; Lutz transfer good |
| 011 | Partial | Phantom collect gone; amenity bind weak |
| 012 | Material | Card-on-file amenity trap unchanged |
| 013 | Partial | Amenity supersession partial |
| 014 | Partial | False collects gone; tokenise MONITOR retained |
| 015 | Partial | Payment contract largely met; seating/binding gaps |
| 016 | **Clear** | Late c/o UNRESOLVED success unchanged |
| 017 | Partial | Twin/towels OK; temporal luggage day weak |
| 018 | Material | Allocation contradiction silence unchanged |
| 019 | Material | Group taxi unchanged |
| 020 | Material | Adversarial non-payment failures unchanged |

---

## Downstream briefing / recommendation improvements

False collect recs/briefing chases cleared or reduced on **002, 003, 007 (recs), 010, 011, 014, 015**.  
Scenario **002** moves to Clear Pass.  
No material priority inversion from Sprint 9 payment changes.

---

## Remaining dominant failure families (after payment noise)

1. Completed / cancelled / mitigated / negative language still OPEN  
2. Amenity / source-language invent (tea→fruit, card-on-file)  
3. Missing non-payment OPEN (allocation, events, twin/cot, group taxi)  
4. Entity/room binding under density  
5. Decision seating gaps (including residual briefing payment wording)

**Sprint 10 candidate (not started):** completed/cancelled/mitigated/negative → non-OPEN state-resolution harden.

---

## Evidence pointers

- Suite: `scripts/test-reasoning-sprint9-payment-collect-fail-closed.mjs`
- Validation: `testing/riverton-bloomsbury/sprint9-validation/`
- Frozen S8 baseline (immutable for this benchmark): `testing/riverton-bloomsbury/sprint8-baseline-validation/`
- Compare: `testing/riverton-bloomsbury/sprint9-validation/RIVERTON_SPRINT9_PAYMENT_COMPARE.json`
