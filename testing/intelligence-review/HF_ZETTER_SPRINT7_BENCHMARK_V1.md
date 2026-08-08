# HF Zetter Sprint 7 Benchmark V1

**Status:** Analysis / documentation only  
**Evidence base:**
- Human benchmark: `testing/zetter-real-shifts/shift-001.md` … `shift-005.md`
- Sprint 6: `testing/zetter-real-shifts/sprint6-validation/`
- Sprint 7: `testing/zetter-real-shifts/sprint7-validation/`
- Prior: [HF_ZETTER_SPRINT6_BENCHMARK_V1.md](HF_ZETTER_SPRINT6_BENCHMARK_V1.md)

**Date:** 2026-08-08  

**Scope:** Persist the approved human-benchmark comparison of Sprint 7 outputs against Expected Current Truth / Important Actions, and vs Sprint 6.  
**Out of scope:** Further engine changes, regenerating frozen artefacts, Sprint 8.

---

## 1. Executive Sprint 7 result

Sprint 7 **materially improved** what the Night Manager sees: canonical OPEN P1/timed work that Sprint 6 already knew but hid now reaches Briefing and Recommendations. False Room 33 payment collect is gone. MONITOR / UNRESOLVED fail-closed cases remain protected.

Remaining pain is **not seating authority** — it is entity/room binding, missing canonical generation (Helene Opera, amenity completeness), and soft legacy fill noise.

**Suite-level conclusions (approved):**

- Sprint 7 vs Sprint 6 = **STRONG IMPROVEMENT**
- Sprint 7 contract = **STRONGLY VALIDATED**
- True Sprint 7 blockers = **none**
- Readiness on this five-shift set = **USEFUL WITH SUPERVISION**
- All five shifts = **PARTIAL PASS**
- Decision-seating = **PASS** on all five
- Payment false collect removed
- Timed/today canonical work now materially reaches lead lists
- Recommendation = **A — ready for commit**

| Shift | Overall vs human benchmark | vs Sprint 6 |
|-------|----------------------------|-------------|
| 001 | **PARTIAL PASS** | **STRONG IMPROVEMENT** |
| 002 | **PARTIAL PASS** | **STRONG IMPROVEMENT** |
| 003 | **PARTIAL PASS** | **STRONG IMPROVEMENT** |
| 004 | **PARTIAL PASS** | **STRONG IMPROVEMENT** |
| 005 | **PARTIAL PASS** | **STRONG IMPROVEMENT** |

---

## 2. Shift scores (Sprint 7)

### Shift 001

| Dimension | Result |
|-----------|--------|
| Fact accuracy | **PARTIAL** |
| Current-state accuracy | **PARTIAL** |
| Action accuracy | **PASS** |
| Guest / entity accuracy | **PARTIAL** (Heathrow unbound) |
| Priority / severity accuracy | **PARTIAL** |
| Temporal eligibility | **PASS** |
| Decision-seating | **PASS** |

**Overall:** **PARTIAL PASS** · **STRONG IMPROVEMENT** vs Sprint 6

| Target | Verdict |
|--------|---------|
| Room 51 tokenisation | Briefing-seated + recs |
| Heathrow 11:25 | Briefing-seated + recs; guest/room unbound |
| Room 5 | Does not displace stronger OPEN P1 work (P4 fill only) |

### Shift 002

| Dimension | Result |
|-----------|--------|
| Fact accuracy | **PARTIAL** |
| Current-state accuracy | **PARTIAL** |
| Action accuracy | **PARTIAL** |
| Guest / entity accuracy | **PARTIAL** |
| Priority / severity accuracy | **PARTIAL** |
| Temporal eligibility | **PARTIAL** |
| Decision-seating | **PASS** |

**Overall:** **PARTIAL PASS** · **STRONG IMPROVEMENT**

| Target | Verdict |
|--------|---------|
| Gill OPEN | Leads briefing + recs |
| Room 33 false collect | **Removed** |
| Gas | MONITOR / tomorrow continuity |
| Room 11 tokenisation | Remains MONITOR (correct fail-closed) |
| Anniversary legacy fill | Soft noise in recs; does not displace Gill |

### Shift 003

| Dimension | Result |
|-----------|--------|
| Fact accuracy | **PARTIAL** |
| Current-state accuracy | **PARTIAL** |
| Action accuracy | **PARTIAL** |
| Guest / entity accuracy | **PASS** (critical VIP cases) |
| Priority / severity accuracy | **PARTIAL** |
| Temporal eligibility | **PASS** |
| Decision-seating | **PASS** |

**Overall:** **PARTIAL PASS** · **STRONG IMPROVEMENT**

| Target | Verdict |
|--------|---------|
| Room 12 arrival | Leads briefing + recs |
| Josh champagne | OPEN; flowers not re-merged |
| Future flowers | MONITOR |
| Late c/o 5 & 14 | UNRESOLVED (correct fail-closed) |
| Duplicate VIP anniversary rec | Soft noise |

### Shift 004

| Dimension | Result |
|-----------|--------|
| Fact accuracy | **PARTIAL** |
| Current-state accuracy | **PARTIAL** |
| Action accuracy | **PARTIAL** |
| Guest / entity accuracy | **PARTIAL** (empty name/room) |
| Priority / severity accuracy | **PARTIAL** |
| Temporal eligibility | **PASS** |
| Decision-seating | **PASS** |

**Overall:** **PARTIAL PASS** · **STRONG IMPROVEMENT** (was FAIL in Sprint 6)

| Target | Verdict |
|--------|---------|
| Jihyun near-term | Briefing + recs |
| Future luggage | MONITOR |
| Empty binding | Harms clarity; seating itself works |
| Room 22 late-c/o fill | Below stronger OPEN work |

### Shift 005

| Dimension | Result |
|-----------|--------|
| Fact accuracy | **PARTIAL** |
| Current-state accuracy | **PARTIAL** |
| Action accuracy | **PARTIAL** |
| Guest / entity accuracy | **PARTIAL** |
| Priority / severity accuracy | **PASS** (lead order) |
| Temporal eligibility | **PASS** |
| Decision-seating | **PASS** |

**Overall:** **PARTIAL PASS** · **STRONG IMPROVEMENT**

| Target | Verdict |
|--------|---------|
| Benjamin P1 | Before iron in briefing + recs |
| AM taxi | Surfaced |
| Iron | Useful lower-priority work |
| Occupancy conflict | Remains unresolved |
| Bag storage | Continuity / information |

---

## 3. Dimension-level Sprint 7 table

| Dimension | 001 | 002 | 003 | 004 | 005 | Suite |
|-----------|-----|-----|-----|-----|-----|-------|
| Fact | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | Mixed |
| Current-state | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | Mixed |
| Action | PASS | PARTIAL | PARTIAL | PARTIAL | PARTIAL | Improved |
| Guest/entity | PARTIAL | PARTIAL | PASS | PARTIAL | PARTIAL | Unchanged |
| Priority/severity | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PASS | Improved |
| Temporal eligibility | PASS | PARTIAL | PASS | PASS | PASS | Strong |
| Decision-seating | PASS | PASS | PASS | PASS | PASS | **Strongest gain** |

---

## 4. Sprint 6 → Sprint 7 failure-frequency

| Family | S6 | S7 | Delta |
|--------|---:|---:|-------|
| `CANONICAL_DOWNSTREAM_SEATING` | 4 | 0–1 | **improved** |
| `MISSING_ACTIONABLE_RECOMMENDATION` | 4 | 3 | improved |
| `PAYMENT_STATE` | 1 | 0 | **improved** |
| `PRIORITY_SEVERITY` | 5 | 2–3 | improved |
| `TEMPORAL` | 1 | 1 | unchanged |
| `ENTITY_BINDING` | 3 | 3 | unchanged |
| `CURRENT_STATE` | 2 | 2 | unchanged |
| `EXTRACTION` / `SOURCE_FIDELITY` | 2 / 2 | 2 / 2 | unchanged |
| `ROOM_STATE` | 1 | 1 | unchanged |
| `STRUCTURED_SECTION_INTERPRETATION` | 2 | 2 | unchanged |
| `NON_ACTIONABLE_RECOMMENDATION` | 2 | 1–2 | slight |
| `DUPLICATION` | 1 | 1–2 | unchanged / soft noise |
| `DEPENDENCY_SEQUENCE` | 0 | 0 | unchanged |

---

## 5. Sprint 7 contract effectiveness

**STRONGLY VALIDATED**

Canonical actions are authoritative for who receives seats in Briefing and Recommendations; legacy paths are fill/enrichment only.

- Legacy fills do not displace stronger canonical OPEN on the target cases.
- False payment collect without evidence does not survive.
- OPEN P1 and timed/today OPEN actions are consistently seated / covered.
- MONITOR / UNRESOLVED remain protected.
- Briefing ↔ recommendation parity materially improved.

---

## 6. True Sprint 7 blockers

**None.**

---

## 7. Downstream / non-Sprint-7 remaining failures

Mainly:

- Entity / room binding (Heathrow unbound; Jihyun empty name/room)
- Missing canonical generation (Helene Opera allocation; Andrew/rm2 conflict surfacing)
- Amenity / source-fidelity completeness (Gill fruit; Josh truffles)
- Room / allocation generation
- Soft legacy fill noise (Room 5 follow-up; anniversary duplicate wording)

---

## 8. Five-shift readiness

**USEFUL WITH SUPERVISION**

Lead lists are usable for primary timed/P1 work. Supervision still needed for missing Helene/Rm11 promotion, entity binding, and amenity completeness. Not pilot-ready unsupervised.

---

## 9. Recommendation

**A — Sprint 7 ready for commit**

---

## 10. Evidence limitations

- n = 5, one hotel, Night-heavy  
- Harness path ≠ full UI path  
- Human Expected Truth includes documented ambiguities  
- Frozen artefacts only for this comparison  
- “More recommendations” not scored as success without benchmark fit  

---

## 11. Document control

| Version | Date | Change |
|---------|------|--------|
| V1 | 2026-08-08 | Approved Sprint 7 vs human Zetter benchmark + Sprint 6 comparison |
