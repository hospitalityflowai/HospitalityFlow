# HF Meridian Sprint 14 Benchmark V1

**Objective:** Timed guest-transport honour & conflict clarification  
**Hotel:** The Meridian Gate Hotel & Spa (fictional, frozen Phase B corpus)  
**Primary targets:** 002, 015  
**Secondary transfer:** 017 (21:15 shuttle slice); 003 briefing (clock-alone wake invent)  
**Corpus:** Meridian scenarios 001–020 (Human Expected Truth + FREEZE_MANIFEST frozen)

## Contract

When an evidenced guest/party has a transport arrangement with an operational time, emit OPEN honour/prepare for that timed transport work.

When the same guest has conflicting transport times, options, or modes (including accessibility constraints), emit OPEN clarify — do not invent a solved mode or drop silently.

Preserve accessibility constraints when explicitly evidenced. Do not misclassify transport work as luggage/EA. Do not invent private taxis, replacement transport, wake-up calls, or unsupported transport modes. Clock times alone must never create transport or wake-up work.

Out of scope: valet/parking, pavilion/events/cake, spa-day conversion, crew contractual inventory, payment redesign, soft-maint/DONE redesign, priority/UI/Supabase, Meridian-specific keyword patching, forcing 017 Clear.

## Suite

`node scripts/test-reasoning-sprint14-timed-transport.mjs` → **21 passed, 0 failed**

Protected regressions at packaging: Sprint 9 payment **29/0**, Sprint 10 state-resolution **28/0**, Sprint 11 blocked-allocation **27/0**, Sprint 12 room-token **36/0**, Sprint 13 invalid-inventory **22/0**.

## Human benchmark (baseline → Sprint 13 → Sprint 14)

| | Clear | Partial | Material |
|--|------:|--------:|---------:|
| **Baseline** | 3 | 4 | 13 |
| **Sprint 12** | 4 | 7 | 9 |
| **Sprint 13** | 6 | 7 | 7 |
| **Sprint 14** | **8** | **8** | **4** |

Classification changes this sprint: **002** MATERIAL → CLEAR; **015** MATERIAL → CLEAR; **017** MATERIAL → PARTIAL. Other 17 unchanged vs Sprint 13 (including **003** still MATERIAL — soft-maint OPEN unchanged; briefing wake invent only cleaned).

### Primary targets

| ID | Sprint 13 | Sprint 14 |
|----|-----------|-----------|
| **002** | Quiet / no shuttle OPEN | OPEN `transport:honour` Langs+Keita @ **M118/M119/CX08** before ~17:55; fail-closed no private transfer; no 18:30 wake invent → **CLEAR** |
| **015** | Okonkwo misframed as `ea_luggage_near` | OPEN `transport:conflict_clarify` Okonkwo @ **CX03** (accessible); M101 luggage preserved; no solved mode invent → **CLEAR** |

### Secondary transfer

| ID | Sprint 13 | Sprint 14 |
|----|-----------|-----------|
| **017** | Silent on 21:15 shuttle | OPEN `transport:honour` for 21:15 listed passengers; crew/valet still missing (not falsely solved) → **PARTIAL** |
| **003** | Soft maint false OPEN + invented CX12/M212 wake briefing | Soft maint OPEN unchanged (still MATERIAL); clock-driven wake/transfer briefing lines removed |

### Hotspot checks (no regression)

- **004:** Trent genuine luggage/EA OPEN preserved @ **M122**
- **008 / 012 / 019:** quiet controls unchanged
- **011:** not forced Clear by this abstraction
- **013 / 018:** invalid inventory / invalid configuration intact
- No false `transport:*` OPEN outside 002 / 015 / 017
- Payment collect / no_collect paths unchanged on prepaid/settled scenarios

## Architectural conclusion

Timed guest-transport honour and conflict clarification is a successful generic reasoning path: evidenced transport + time → honour; conflicting modes (including accessibility) → clarify; clocks alone do not invent wake/transport. Recommendation at review: **A — commit**.

## Highest-leverage remaining failure family (Sprint 15 candidate — not implemented)

Soft-maintenance / completed-state false OPEN — still MATERIAL **003** (mitigated drain chase) and **005** (DONE iron). Alternate family: valet/vehicle ops (**007**, residual on Partial **017**).

## Evidence

`testing/meridian-gate/sprint14-validation/`  
`testing/meridian-gate/sprint14-validation/MERIDIAN_SPRINT14_TIMED_TRANSPORT_COMPARE.json`  
Frozen scenarios / `FREEZE_MANIFEST.json` / `baseline-validation/` / `sprint12-validation/` / `sprint13-validation/` unchanged.
