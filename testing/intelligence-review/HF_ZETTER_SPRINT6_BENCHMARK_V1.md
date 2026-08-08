# HF Zetter Sprint 6 Benchmark V1

**Status:** Analysis / documentation only  
**Evidence base:**
- Human benchmark: `testing/zetter-real-shifts/shift-001.md` … `shift-005.md`
- Post-Sprint-4: `testing/zetter-real-shifts/current-engine-rerun/`
- Sprint 5: `testing/zetter-real-shifts/sprint5-validation/`
- Sprint 6: `testing/zetter-real-shifts/sprint6-validation/`
- Prior: [HF_ZETTER_SPRINT5_BENCHMARK_V1.md](HF_ZETTER_SPRINT5_BENCHMARK_V1.md)

**Date:** 2026-08-08  

**Scope:** Persist the approved human-benchmark comparison of Sprint 6 outputs against Expected Current Truth / Important Actions, and vs Sprint 5.  
**Out of scope:** Further engine changes, regenerating frozen artefacts, Sprint 7.

---

## 1. Executive Sprint 6 result

Sprint 6 **materially improved** temporal eligibility on the five Zetter shifts: checkout-day tokenisation and Heathrow pickup appear as OPEN actions (001); gas is MONITOR/tomorrow not a danger chase (002); arrival-today and future flowers are separated (003); Jihyun horizons are split (004); AM taxi vs multi-week bags are split (005).

It did **not** make any shift fully Night-Manager-pass. Most remaining pain is **type A**: temporal state correct, but Sprint 2/5 **briefing/rec seating** still buries or mis-ranks it.

**Suite-level conclusions (approved):**

- Sprint 6 vs Sprint 5 = **MODERATE** improvement
- Sprint 6 temporal contract = **PARTIALLY VALIDATED**
- Readiness on this five-shift set = **EARLY USEFUL**
- True Sprint 6 blockers = **none**
- Recommendation = **A — ready for commit**
- Remaining pain is mostly **downstream seating/ranking** rather than temporal interpretation

| Shift | Overall vs human benchmark | vs Sprint 5 |
|-------|----------------------------|-------------|
| 001 | **PARTIAL PASS** | **STRONG IMPROVEMENT** |
| 002 | **PARTIAL PASS** | **MODERATE IMPROVEMENT** |
| 003 | **PARTIAL PASS** | **MODERATE IMPROVEMENT** |
| 004 | **FAIL** | **MINOR IMPROVEMENT** |
| 005 | **PARTIAL PASS** | **MINOR IMPROVEMENT** |

---

## 2. Shift scores (Sprint 6)

### Shift 001

| Dimension | Result |
|-----------|--------|
| Fact accuracy | **PARTIAL** |
| Current-state accuracy | **PARTIAL** |
| Action accuracy | **PARTIAL** (was FAIL in S5) |
| Guest / entity accuracy | **PARTIAL** |
| Priority / severity accuracy | **FAIL** |
| Temporal eligibility | **PASS** (for the two target facts) |

**Overall:** **PARTIAL PASS** · **STRONG IMPROVEMENT** vs Sprint 5

| Target | Verdict |
|--------|---------|
| Room 51 tokenisation | Canonical **OPEN** `today`, Room 51 — in recs, not briefing |
| Heathrow 11:25 | Canonical **OPEN** timed pickup — in recs; room/guest unbound |
| Surfacing | Type **A**: temporal OK; briefing still Room 22 / Room 5 |

### Shift 002

| Dimension | Result |
|-----------|--------|
| Fact accuracy | **PARTIAL** |
| Current-state accuracy | **PARTIAL** (better on gas) |
| Action accuracy | **PARTIAL** |
| Guest / entity accuracy | **PARTIAL** |
| Priority / severity accuracy | **FAIL** |
| Temporal eligibility | **PARTIAL** |

**Overall:** **PARTIAL PASS** · **MODERATE IMPROVEMENT**

| Target | Verdict |
|--------|---------|
| Gas DM tonight + inspect tomorrow | **MONITOR** `tomorrow`; briefing correct; no false urgency in recs |
| Room 11 tokenisation | Canonical **MONITOR** (dep on another note) — conservative under-promote |
| False urgency | **Avoided** for gas |

Still: Room 33 unsupported collect; Helene Opera; Gill fruit; ranking weakness.

### Shift 003

| Dimension | Result |
|-----------|--------|
| Fact accuracy | **PARTIAL** |
| Current-state accuracy | **PARTIAL** |
| Action accuracy | **PARTIAL** |
| Guest / entity accuracy | **PASS** (critical VIP cases) |
| Priority / severity accuracy | **PARTIAL** |
| Temporal eligibility | **PASS** (incl. fail-closed late c/o) |

**Overall:** **PARTIAL PASS** · **MODERATE IMPROVEMENT**

| Target | Verdict |
|--------|---------|
| Late c/o 5 & 14 @12 | **UNRESOLVED / ambiguous** — correct fail-closed after midnight; Room 14 unbound |
| Room 12 still arriving | Canonical **OPEN** `today` — not in briefing/recs (type A) |
| Flowers morning 06/08 | **MONITOR** tomorrow; champagne stays OPEN — temporal correct |

### Shift 004

| Dimension | Result |
|-----------|--------|
| Fact accuracy | **PARTIAL** |
| Current-state accuracy | **FAIL** |
| Action accuracy | **FAIL** |
| Guest / entity accuracy | **PARTIAL** |
| Priority / severity accuracy | **FAIL** |
| Temporal eligibility | **PASS** (horizon split) |

**Overall:** **FAIL** · **MINOR IMPROVEMENT**

| Target | Verdict |
|--------|---------|
| EA 11am / lunch luggage | Canonical **OPEN** `today` — empty room/name; absent from briefing/recs |
| Future 9 Aug hold | **MONITOR** `future` — correct |
| Downstream | Same iron-only rec surface as Sprint 5 |

### Shift 005

| Dimension | Result |
|-----------|--------|
| Fact accuracy | **PARTIAL** |
| Current-state accuracy | **PARTIAL** |
| Action accuracy | **PARTIAL** |
| Guest / entity accuracy | **PARTIAL** |
| Priority / severity accuracy | **FAIL** |
| Temporal eligibility | **PASS** (taxi vs bags) |

**Overall:** **PARTIAL PASS** · **MINOR IMPROVEMENT**

| Target | Verdict |
|--------|---------|
| AM taxi 5 & 15 | Canonical **OPEN** `today` — not briefing/recs (type A) |
| 2-week bags | information/future continuity — correct, separate from taxi |
| vs Benjamin/iron | Surface largely unchanged; taxi invisible downstream |

---

## 3. Dimension-level Sprint 6 table

| Dimension | 001 | 002 | 003 | 004 | 005 | Suite |
|-----------|-----|-----|-----|-----|-----|-------|
| Fact | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | Mixed |
| Current-state | PARTIAL | PARTIAL | PARTIAL | FAIL | PARTIAL | Mixed |
| Action | PARTIAL | PARTIAL | PARTIAL | FAIL | PARTIAL | Mixed |
| Guest/entity | PARTIAL | PARTIAL | PASS | PARTIAL | PARTIAL | Improved |
| Priority/severity | FAIL | FAIL | PARTIAL | FAIL | FAIL | Weak |
| Temporal eligibility | PASS | PARTIAL | PASS | PASS | PASS | **Strongest gain** |

---

## 4. Sprint 5 → Sprint 6 failure-frequency

| Family | S5 | S6 | Delta |
|--------|---:|---:|-------|
| `TEMPORAL` | 4 | 1 | improved |
| `MISSING_ACTIONABLE_RECOMMENDATION` | 5 | 4 | improved |
| `CANONICAL_DOWNSTREAM_SEATING` | (latent) | 4 | now explicit |
| `PRIORITY_SEVERITY` | 5 | 5 | unchanged |
| `ENTITY_BINDING` | 3 | 3 | unchanged |
| `PAYMENT_STATE` | 1 | 1 | unchanged |
| `CURRENT_STATE` | 3 | 2 | improved |
| `EXTRACTION` / `SOURCE_FIDELITY` | 3 / 2 | 2 / 2 | slight / unchanged |
| `ROOM_STATE` | 1 | 1 | unchanged |
| `STRUCTURED_SECTION_INTERPRETATION` | 2 | 2 | unchanged |
| `NON_ACTIONABLE_RECOMMENDATION` | 2 | 2 | unchanged |
| `DEPENDENCY_SEQUENCE` | 0 | 0 | unchanged |

---

## 5. Sprint 6 contract effectiveness

**PARTIALLY VALIDATED**

- Temporal evidence sets canonical `actionState` without a new priority model.
- **Type A** (temporal OK, seating/ranking bad) dominates remaining gaps.
- **Type B** (temporal wrong) is rare; Room 11 tokenise under-promote is accepted fail-closed.

---

## 6. True Sprint 6 blockers

**None.**

Accepted fail-closed: 003 late c/o unresolved after midnight; 002 Rm11 MONITOR without same-note dep window.

---

## 7. Downstream / non-Sprint-6 remaining failures

- Briefing/rec seating of correct OPEN temporals (001, 003, 004, 005)
- Priority ranking still wrong when real work exists
- Room 33 collect; Helene Opera; Gill fruit; Josh truffles; Jihyun empty room
- 005 Benjamin vs iron briefing imbalance

---

## 8. Five-shift readiness

**EARLY USEFUL**

---

## 9. Recommendation

**A — Sprint 6 ready for commit**

---

## 10. Evidence limitations

- n = 5, one hotel, Night-heavy  
- Harness path ≠ full UI path  
- Human Expected Truth includes documented ambiguities  
- Frozen artefacts only for this comparison  
- “More actions” not scored as success without benchmark fit  

---

## 11. Document control

| Version | Date | Change |
|---------|------|--------|
| V1 | 2026-08-08 | Approved Sprint 6 vs human Zetter benchmark + Sprint 5 comparison |
