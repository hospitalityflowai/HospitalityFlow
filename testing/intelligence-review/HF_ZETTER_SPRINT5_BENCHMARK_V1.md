# HF Zetter Sprint 5 Benchmark V1

**Status:** Analysis / documentation only  
**Evidence base:**
- Human benchmark: `testing/zetter-real-shifts/shift-001.md` … `shift-005.md`
- Historical HF output: same shift files
- Post-Sprint-4: `testing/zetter-real-shifts/current-engine-rerun/`
- Sprint 5: `testing/zetter-real-shifts/sprint5-validation/`
- Prior maps: [HF_ZETTER_POST_SPRINT4_BENCHMARK_V1.md](HF_ZETTER_POST_SPRINT4_BENCHMARK_V1.md), [HF_ZETTER_REAL_SHIFT_FAILURE_MAP_V1.md](HF_ZETTER_REAL_SHIFT_FAILURE_MAP_V1.md)

**Engine commit under test (Sprint 5 validation artefacts):** `c986991efcd29b87fe9a083515bb1d5be08d5794`  
**Sprint 5 engine commit on main:** `4a988d12965caacc5e9d2a0f4a01af2e725bde0a`  
**Date:** 2026-08-08  

**Scope:** Persist the approved human-benchmark comparison of Sprint 5 outputs against Expected Current Truth / Important Actions, and vs post-Sprint-4.  
**Out of scope:** Sprint 6 implementation, regenerating handovers, modifying historical / post-Sprint-4 / Sprint 5 artefacts.

---

## 1. Executive Sprint 5 result

Sprint 5 delivered **real, benchmark-visible gains** on consistency and several high-harm errors, but **no shift fully passes** the Night Manager human benchmark.

| Pattern | Verdict |
|---------|---------|
| Best gains | Hayden twin **Room 43** across surfaces; Josh amenities no longer merged onto Helene; Brittany iron OPEN vs breakfast RESOLVED; Gill no invented loft/welcome card; Phoebe not false VIP; channel-payment briefing removed (002/004); Benjamin Friends-of-Armi actionable; 005 no longer “no priorities” + empty recs |
| Persistent failures | **51 tokenisation**, **Heathrow 11:25**, Helene Opera allocation, late c/o 5&14 / rm12 arrival, Jihyun EA under-seated, Room 33 unsupported collect (002), priority seating still wrong when real work exists |
| Soft consistency gaps | 005 briefing omits Benjamin canonical P1; 004 Jihyun canonical open but not in recs/briefing |
| Sprint 4 | Still **0 dependency edges** on all five — **no real Zetter validation** from this sample |

**Suite-level conclusions (approved):**

- Overall Sprint 5 improvement vs post-Sprint-4 = **MODERATE**
- Sprint 5 objective (“one canonical operational action truth consumed consistently downstream”) = **PARTIALLY VALIDATED**
- Readiness on this five-shift set = **EARLY USEFUL**
- No shift yet fully passes Night Manager benchmark
- Entity / current-state / payment / extraction improved
- Priority / action seating remains weak
- Timed / “today” operational actions are the strongest remaining root family
- Sprint 4 still has no real Zetter validation from these five shifts

| Shift | Overall vs human benchmark | vs post-Sprint-4 |
|-------|----------------------------|------------------|
| 001 | **FAIL** | **MINOR IMPROVEMENT** |
| 002 | **PARTIAL PASS** | **MODERATE IMPROVEMENT** |
| 003 | **PARTIAL PASS** | **STRONG IMPROVEMENT** |
| 004 | **FAIL** | **MODERATE IMPROVEMENT** |
| 005 | **PARTIAL PASS** | **STRONG IMPROVEMENT** |

---

## 2. Shift scores (Sprint 5)

### Shift 001

| Dimension | Result |
|-----------|--------|
| Fact accuracy | **PARTIAL** |
| Current-state accuracy | **PARTIAL** |
| Action accuracy | **FAIL** |
| Guest / entity accuracy | **PARTIAL** |
| Priority / severity accuracy | **FAIL** |

**Matches:** Room 22 safe as lead; Peter not false VIP; no unsupported payment chase.  
**Still fails:** Room 51 CC not tokenised (checkout today) not actioned; Heathrow 11:25 remains fragments; Room 5 over-prioritised.  
**Sprint 5 vs post-S4:** Peter VIP false-positive fixed; tokenisation / Heathrow still lost.

### Shift 002

| Dimension | Result |
|-----------|--------|
| Fact accuracy | **PARTIAL** |
| Current-state accuracy | **PARTIAL** |
| Action accuracy | **PARTIAL** |
| Guest / entity accuracy | **PARTIAL** |
| Priority / severity accuracy | **FAIL** |

**Matches:** Foam pillows preserved in recs; channel-payment briefing gone; Gill champagne/chocolates/flowers without loft/welcome-card invention.  
**Still fails:** Rm 11 tokenisation not actioned; Helene Opera not actioned; Room 33 “collect outstanding” unsupported; Gill fruit incomplete; gas still framed as immediate chase vs tomorrow inspect.  
**Sprint 5 vs post-S4:** Foam + channel + Gill amenity fidelity fixed; payment/Helene/tokenisation remain.

### Shift 003

| Dimension | Result |
|-----------|--------|
| Fact accuracy | **PARTIAL** |
| Current-state accuracy | **PARTIAL** |
| Action accuracy | **PARTIAL** |
| Guest / entity accuracy | **PASS** (critical cases) |
| Priority / severity accuracy | **PARTIAL** |

**Matches:** Josh amenities stay with Josh; Helene separate; Hayden twin Room 43; no held-package invention.  
**Still fails:** Late c/o rooms 5 & 14 not seated; Room 12 arrival today not seated; Josh truffles dropped.  
**Sprint 5 vs post-S4:** Fixes critical entity-merge regression and Room 42 misbind.

### Shift 004

| Dimension | Result |
|-----------|--------|
| Fact accuracy | **PARTIAL** |
| Current-state accuracy | **FAIL** |
| Action accuracy | **FAIL** |
| Guest / entity accuracy | **PARTIAL** |
| Priority / severity accuracy | **FAIL** |

**Matches:** Channel payment gone; Phoebe not VIP; taxi money wording; Anne twin-already-set text retained; Jihyun not under payments.  
**Still fails:** Jihyun EA/luggage under-seated (canonical exists but empty room/name; absent from recs/briefing); late c/o 22 vague; only iron recommended.  
**Sprint 5 vs post-S4:** Channel + Phoebe + Jihyun section type improved; temporal promotion still missing.

### Shift 005

| Dimension | Result |
|-----------|--------|
| Fact accuracy | **PARTIAL** |
| Current-state accuracy | **PARTIAL** |
| Action accuracy | **PARTIAL** |
| Guest / entity accuracy | **PARTIAL** |
| Priority / severity accuracy | **FAIL** |

**Matches:** Benjamin Friends-of-Armi package actionable with evidenced amenities; Brittany iron OPEN; £28 breakfast RESOLVED; recommendations non-empty; quiet-shift false negative gone; Andrew/rm2 conflict as unresolved canonical.  
**Still fails:** Briefing seats iron over Benjamin P1; Andrew conflict not in recs; AM taxi / 2-week bags not timed/continuity actions.  
**Sprint 5 vs post-S4:** Strongest relative lift (empty → actionable).

---

## 3. Dimension-level Sprint 5 table

| Dimension | 001 | 002 | 003 | 004 | 005 | Suite |
|-----------|-----|-----|-----|-----|-----|-------|
| Fact accuracy | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | Weak–mixed |
| Current-state | PARTIAL | PARTIAL | PARTIAL | FAIL | PARTIAL | Mostly PARTIAL |
| Action accuracy | FAIL | PARTIAL | PARTIAL | FAIL | PARTIAL | Mixed |
| Guest/entity | PARTIAL | PARTIAL | PASS | PARTIAL | PARTIAL | Improved vs post-S4 5×FAIL |
| Priority/severity | FAIL | FAIL | PARTIAL | FAIL | FAIL | Still mostly FAIL |

---

## 4. Post-Sprint-4 → Sprint 5 failure-frequency

| Family | Post-S4 | Sprint 5 | Delta |
|--------|--------:|---------:|-------|
| `ENTITY_BINDING` | 5 | 3 | improved |
| `MISSING_ACTIONABLE_RECOMMENDATION` | 5 | 5 | unchanged |
| `PRIORITY_SEVERITY` | 4–5 | 5 | unchanged / seating still weak |
| `TEMPORAL` | 4 | 4 | unchanged |
| `CURRENT_STATE` | 4 | 3 | improved |
| `EXTRACTION` | 4 | 3 | improved |
| `COMPRESSION_NOISE` | 4 | 3 | slight improve |
| `PAYMENT_STATE` | 2 | 1 | improved |
| `NON_ACTIONABLE_RECOMMENDATION` | 2–3 | 2 | slight improve |
| `ROOM_STATE` | 1 | 1 | unchanged |
| `DEPENDENCY_SEQUENCE` | 0 | 0 | unchanged |
| `SOURCE_FIDELITY` | (elevated in S5) | 2 | tracked |
| `STRUCTURED_SECTION_INTERPRETATION` | (latent) | 2 | still material |

---

## 5. Sprint 5 objective effectiveness

**Objective:** One canonical operational action truth consumed consistently downstream.

**Classification: PARTIALLY VALIDATED**

- Briefing / recommendations / organised handover are **materially more consistent** when a canonical open action exists and is seated (Hayden 43, Josh amenities, Brittany iron facets, Gill evidence-only amenities).
- Gaps remain where canonical exists but is not seated (Jihyun 004; Benjamin briefing 005), and where timed/today facts never become canonical actions at all.

---

## 6. Remaining highest-risk failures

1. Timed / “today” actions never become seated work (tokenisation, Heathrow, late c/o, arrival-today, Jihyun EA).  
2. Priority seating wrong when real work exists.  
3. Residual false payment chase (Room 33 collect).  
4. Incomplete amenity extraction (Gill fruit; Josh truffles).  
5. Allocation / room-state actions under-surfaced (Helene Opera; Andrew/rm2).

---

## 7. Recommended next sprint (approved direction)

**Sprint 6 — Temporal / “today” action eligibility into the canonical contract**

Promote evidence-backed checkout-today, timed-today, and section-dated items into canonical open / monitor / future actions with room/entity binding, then reuse Sprint 5 downstream authority.

Do **not** expand into broad extraction rewrite, general NLP calendar engine, PMS integration, or priority redesign in Sprint 6.

---

## 8. Five-shift readiness

**EARLY USEFUL**

Useful fragments exist (especially 003 entity/amenity consistency and 005 high-touch + iron facets), but a Night Manager still cannot trust the lead list without re-reading source notes. Not pilot-ready for unsupervised controlled testing on this set.

---

## 9. Evidence limitations

- n = 5, one hotel, Night-heavy  
- Harness path ≠ full UI `analyzeNote` path  
- Human Expected Truth includes documented ambiguities  
- Historical / post-S4 / Sprint 5 artefacts frozen for this comparison  
- Sprint 4 dependencies show 0 edges — not re-judged as validated  
- Cleaner wording not scored as success without operational accuracy gain  

---

## 10. Document control

| Version | Date | Change |
|---------|------|--------|
| V1 | 2026-08-08 | Approved Sprint 5 vs human Zetter benchmark + post-Sprint-4 comparison |
