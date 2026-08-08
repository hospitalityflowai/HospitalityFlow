# Riverton Sprint 9 — Payment Collect Fail-Closed Report

**Engine HEAD:** `73e7572` + local Sprint 9 payment harden (uncommitted)  
**Scope:** Payment collect fail-closed only  
**Immutable:** `../scenario-XXX.md`, `../sprint8-baseline-validation/`  

## Suite results

| Suite | Result |
|-------|--------|
| Sprint 9 payment fail-closed | **29 passed, 0 failed** |
| Sprint 1–8 regression | **All green** (S1 75, S2 priority+DM, S3, S4, S5 53, S6 28, S7 36, S8 46) |

## Riverton 001–020 rerun vs frozen Sprint 8 baseline

Source SHA-256 matches Sprint 8 baseline for all 20 scenarios (inputs unchanged).

| Metric | Sprint 8 | Sprint 9 | Delta |
|--------|----------|----------|-------|
| OPEN `payment:collect` actions (sum) | **13** | **1** | **−12** |
| Scenarios with fewer OPEN collects | — | **9** | — |
| Scenarios with more OPEN collects | — | **0** | — |

### False OPEN payment collects removed (12 actions across 9 scenarios)

| ID | Removed false OPEN collects |
|----|-----------------------------|
| 001 | rm 214 folio settled |
| 002 | prepaid Booking.com Pendleton channel collect |
| 003 | Crane prepaid channel + rm 119 minibar-closed |
| 006 | rm 405 late-c/o charge treated as collect |
| 007 | rm 118 £12 deferred laundry + phantom collect |
| 010 | Luton 210 channel collect |
| 011 | surname-block phantom collect |
| 014 | prepaid 105 + void/phantom collect |
| 015 | Pike due-tomorrow + Blum prepaid (2 removed) |

### Legitimate payment OPEN preserved

| Case | Result |
|------|--------|
| 015 Calder **£64.80** genuine outstanding | **OPEN `payment:collect` retained** (was incorrectly `payment:no_collect` / entity-mixed in S8) |

Note: Calder OPEN still has weak room binding (no `228` on action) and generic “channel payment” wording — **pre-existing entity/binding issue**, not fixed in Sprint 9. Debt is no longer suppressed.

No scenario gained a new false OPEN payment collect.

### Downstream briefing / recommendations / seating

| Effect | Scenarios |
|--------|-----------|
| Collect recommendations removed | 002, 003, 007, 010, 011, 014, 015 |
| Briefing lost invented channel/payment chase | 002, 003, 007, 010, 011, 014, 015 |
| Briefing still “no urgent…” despite other non-payment OPEN work | unchanged outside payment scope (e.g. 006/018 allocation gaps **not** fixed) |
| 015 briefing does not seat Calder collect | seating/binding gap remains; canonical OPEN exists |

### New regressions (payment scope)

- **None observed** in Sprint 1–8 suites.  
- Riverton: no new OPEN payment:collect false positives.  
- Non-payment Riverton failures (twin, events, amenities, allocation, etc.) intentionally unchanged.

## Files touched (implementation)

- `shift-intelligence-engine.js` — Sprint 9 collect evidence gate + temporal deferral + payment safety gate narrowing  
- `ai-writing-engine.js` — settled/prepaid/company no-collect + paid-out exclusion  
- `scripts/test-reasoning-sprint9-payment-collect-fail-closed.mjs` — new suite  
- `testing/riverton-bloomsbury/sprint9-validation/*` — new validation artefacts  

Sprint 8 baseline evidence left immutable.
