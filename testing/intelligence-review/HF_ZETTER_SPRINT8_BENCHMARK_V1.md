# HF Zetter Sprint 8 Benchmark V1

**Status:** Analysis / documentation only  
**Evidence base:**
- Human benchmark: `testing/zetter-real-shifts/shift-001.md` … `shift-005.md`
- Sprint 7: `testing/zetter-real-shifts/sprint7-validation/` + [HF_ZETTER_SPRINT7_BENCHMARK_V1.md](HF_ZETTER_SPRINT7_BENCHMARK_V1.md)
- Sprint 8: `testing/zetter-real-shifts/sprint8-validation/`
- Prior: Sprint 5–7 frozen validation folders (untouched)

**Date:** 2026-08-08  

**Scope:** Persist the approved human-benchmark comparison of Sprint 8 outputs against Expected Current Truth / Important Actions, and vs Sprint 7.  
**Out of scope:** Further engine changes, regenerating frozen artefacts, Sprint 9, fixing pre-existing E4 4c.

---

## 1. Executive Sprint 8 result

Sprint 8 closed the main human-benchmark gaps left after Sprint 7: Helene Opera allocation, Andrew/rm2 clarification seating, Heathrow contacts, Jihyun name/room, Gill fruit, Josh truffles — without breaking seating, temporal fail-closed, or payment safety.

**Suite-level conclusions (approved):**

- Sprint 8 vs Sprint 7 = **STRONG IMPROVEMENT**
- Sprint 8 contract = **STRONGLY VALIDATED**
- True Sprint 8 blockers = **none**
- Readiness on this five-shift set = **CONTROLLED PILOT READY** (up from Sprint 7 **USEFUL WITH SUPERVISION**)
- Recommendation = **A — ready for commit**
- E4 decision-trace **4c** failure is **pre-existing on clean HEAD** and **does not block Sprint 8**

| Shift | Overall vs human benchmark | vs Sprint 7 |
|-------|----------------------------|-------------|
| 001 | **PARTIAL PASS** | **IMPROVEMENT** (Heathrow contacts) |
| 002 | **PARTIAL PASS** (closest to PASS) | **STRONG IMPROVEMENT** (Helene + Gill fruit) |
| 003 | **PARTIAL PASS** | **IMPROVEMENT** (Josh truffles) |
| 004 | **PARTIAL PASS** | **IMPROVEMENT** (Jihyun binding) |
| 005 | **PARTIAL PASS** | **STRONG IMPROVEMENT** (Andrew clarify seated) |

---

## 2. Shift scores (Sprint 8)

### Shift 001

| Dimension | Result |
|-----------|--------|
| Fact accuracy | **PARTIAL** |
| Current-state accuracy | **PARTIAL** |
| Action accuracy | **PASS** |
| Guest / entity accuracy | **PASS** on Heathrow contacts |
| Priority / severity accuracy | **PARTIAL** |
| Temporal eligibility | **PASS** |
| Decision-seating | **PASS** |
| Canonical action completeness | **PASS** (contacts attached) |

**Overall:** **PARTIAL PASS**

| Target | Verdict |
|--------|---------|
| Heathrow contacts bound | **YES** — Donna / Peter |
| Room invented? | **NO** |
| Timed pickup seated | **YES** |
| Wrong Donna/Peter ↔ Polk? | **NO** — first names from phone lines only |
| Room 5 non-displacing | **YES** (P4 fill) |

### Shift 002

| Dimension | Result |
|-----------|--------|
| Fact accuracy | **PASS** on Helene/Gill package |
| Current-state accuracy | **PARTIAL** |
| Action accuracy | **PASS** on Helene + Gill amenities |
| Guest / entity accuracy | **PASS** (Helene/32) |
| Priority / severity accuracy | **PARTIAL** (Helene leads; Rm11 still MONITOR) |
| Temporal eligibility | **PARTIAL** |
| Decision-seating | **PASS** |
| Canonical action completeness | **PASS** |

**Overall:** **PARTIAL PASS** (closest to PASS)

| Target | Verdict |
|--------|---------|
| Helene Opera OPEN | **YES** — Helene + Rm32; seats briefing/recs #1 |
| Gill fruit preserved | **YES** |
| Invented amenities? | **NO** |
| Rm11 fail-closed | **YES** — MONITOR |
| False payment collect | **NO** |

### Shift 003

| Dimension | Result |
|-----------|--------|
| Fact accuracy | **PASS** on Josh amenities |
| Current-state accuracy | **PARTIAL** |
| Action accuracy | **PASS** on Josh prep |
| Guest / entity accuracy | **PASS** |
| Priority / severity accuracy | **PARTIAL** |
| Temporal eligibility | **PASS** |
| Decision-seating | **PASS** |
| Canonical action completeness | **PASS** |

**Overall:** **PARTIAL PASS**

| Target | Verdict |
|--------|---------|
| Josh truffles | **YES** |
| Josh/Helene separation | **YES** |
| Hayden Room 43 | **YES** |
| Flowers / late c/o fail-closed | **YES** |
| New amenity invention | **NO** (soft anniversary duplicate remains) |

### Shift 004

| Dimension | Result |
|-----------|--------|
| Fact accuracy | **PARTIAL** |
| Current-state accuracy | **PARTIAL** |
| Action accuracy | **PASS** on Jihyun EA executability |
| Guest / entity accuracy | **PASS** (JIHYUN AN + Rm2) |
| Priority / severity accuracy | **PARTIAL** |
| Temporal eligibility | **PASS** |
| Decision-seating | **PASS** |
| Canonical action completeness | **PASS** |

**Overall:** **PARTIAL PASS**

| Target | Verdict |
|--------|---------|
| Jihyun + Rm2 on EA | **YES** |
| Near vs future luggage split | **YES** |
| Gatwick unresolved | **YES** — not OPEN |
| Unsafe Gatwick bind? | **NO material harm** — room 2 same-note; fragment UNRESOLVED |
| Rm22 displacing? | **NO** |

### Shift 005

| Dimension | Result |
|-----------|--------|
| Fact accuracy | **PARTIAL** → better |
| Current-state accuracy | **PASS** on conflict visibility |
| Action accuracy | **PASS** on conflict + Benjamin |
| Guest / entity accuracy | **PASS** on Andrew/2 |
| Priority / severity accuracy | **PARTIAL** nuance (Andrew clarify then Benjamin; both P1) |
| Temporal eligibility | **PASS** |
| Decision-seating | **PASS** |
| Canonical action completeness | **PASS** |

**Overall:** **PARTIAL PASS**

| Target | Verdict |
|--------|---------|
| Andrew clarify useful | **YES** — seated; does not invent resolution |
| Benjamin above lower work | **YES** |
| AM taxi / bags | **YES** / INFORMATION |

---

## 3. Dimension-level Sprint 8 table

| Dimension | 001 | 002 | 003 | 004 | 005 | Suite |
|-----------|-----|-----|-----|-----|-----|-------|
| Fact | PARTIAL | PASS* | PASS* | PARTIAL | PARTIAL | Improved |
| Current-state | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PASS* | Improved |
| Action | PASS | PASS | PASS | PASS | PASS | **Strong** |
| Guest/entity | PASS* | PASS | PASS | PASS | PASS | **Strong** |
| Priority/severity | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | Mixed |
| Temporal eligibility | PASS | PARTIAL | PASS | PASS | PASS | Strong |
| Decision-seating | PASS | PASS | PASS | PASS | PASS | Held |
| Canonical completeness | PASS | PASS | PASS | PASS | PASS | **Strongest Sprint 8 gain** |

\*On Sprint 8 target objects for that shift.

---

## 4. Sprint 7 → Sprint 8 failure-frequency

| Family | S7 | S8 | Delta |
|--------|---:|---:|-------|
| `CANONICAL_ACTION_COMPLETENESS` | 3–4 | 0–1 | **improved** |
| `ENTITY_BINDING` | 3 | 0–1 | **improved** |
| `ROOM_STATE` / `ALLOCATION` | 1–2 | 0 | **improved** |
| `SOURCE_FIDELITY` | 2 | 0–1 | **improved** |
| `MISSING_ACTIONABLE_RECOMMENDATION` | 3 | 1 | **improved** |
| `PRIORITY_SEVERITY` | 2–3 | 1–2 | slight |
| `TEMPORAL` | 1 | 1 | unchanged (accepted fail-closed) |
| `CURRENT_STATE` | 2 | 1 | improved |
| `PAYMENT_STATE` | 0 | 0 | held |
| `CANONICAL_DOWNSTREAM_SEATING` | 0–1 | 0 | held / used for new OPENs |
| `LEGACY_FILL_NOISE` | 3–4 | 3–4 | unchanged |
| `DUPLICATION` | 1–2 | 1–2 | unchanged soft anniversary |

Cosmetic `-Gill Beagent` and soft anniversary wording are **not** counted as operational failures.

---

## 5. Sprint 8 contract effectiveness

**STRONGLY VALIDATED**

Objective: canonical action completeness — generate missing operational facets and attach safely available guest/room/contact evidence without redesigning entity, temporal, or seating architecture.

- Allocation problems represented correctly (Helene Opera OPEN, not VIP amenity collapse)
- Genuine contradictions become useful clarification work (Andrew OPEN clarify, seated)
- Existing OPEN actions more executable (Heathrow contacts; Jihyun name/room)
- Amenity packages more source-faithful (Gill fruit; Josh truffles)
- No cross-guest contamination found
- Fail-closed preserved: late c/o UNRESOLVED; Rm11 MONITOR; bags INFORMATION; no false collect; no invented Heathrow room

---

## 6. New regression search

**No Sprint-8-caused regressions found.**

- Wrong guest on timed action: **NONE** (Donna/Peter from pickup phone lines; not Polk)
- Wrong room invented on Heathrow: **NONE**
- Cross-guest amenity merge: **NONE**
- OPEN clarify too weak: **NONE**
- False allocation OPEN: **NONE**
- MONITOR/UNRESOLVED wrongly promoted: **NONE**
- False payment chase: **NONE**
- Invented amenity: **NONE**

---

## 7. True Sprint 8 blockers

**None.**

---

## 8. Five-shift readiness

**CONTROLLED PILOT READY**

Lead lists now catch the major human-benchmark operational commitments on this five-shift set. Soft legacy fill and some fail-closed under-promotion remain — suitable for a **founder-supervised small pilot**, not unsupervised full pilot.

**Reliably catch:** Rm22 / Heathrow+contacts / Rm51 tokenise; Helene Opera + Gill amenities; Josh truffles + Hayden twin 43; Jihyun EA with name+room; Andrew conflict + Benjamin package + AM taxi.

**Still re-read for:** soft Rm5/anniversary/Rm22 fill; Rm11 MONITOR context; Gill DM reinspect; Donna/Peter ↔ Polk ambiguity; 004 Gatwick UNRESOLVED fragment noise.

---

## 9. E4 failure (separate)

- Suite: `scripts/test-intelligence-e4-decision-trace.mjs`
- Case: **4c. VIP enrichment leaves Brain evidence on the recommendation**
- Evidence: fails on clean HEAD with Sprint 8 changes stashed (**126 passed, 1 failed**)
- **Pre-existing; does not block Sprint 8**

---

## 10. Recommendation

**A — Sprint 8 ready for commit**

Do **not** start Sprint 9 in this packaging step.

---

## 11. Evidence limitations

- n = 5, one hotel, Night-heavy  
- Harness path ≠ full UI path  
- Human Expected Truth includes documented ambiguities  
- Frozen artefacts only for this comparison  
- Soft legacy fill not scored as Sprint 8 blockers  

---

## 12. Document control

| Version | Date | Change |
|---------|------|--------|
| V1 | 2026-08-08 | Approved Sprint 8 vs human Zetter benchmark + Sprint 7 comparison |
