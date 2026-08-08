# HF Zetter Real Shift Failure Map V1

**Status:** Analysis / documentation only  
**Evidence base:** Real Zetter Marylebone shifts `testing/zetter-real-shifts/shift-001.md` … `shift-005.md` (historical Supabase runs; tester-reviewed)  
**Index:** [../zetter-real-shifts/SHIFT_INDEX.md](../zetter-real-shifts/SHIFT_INDEX.md)  
**Export:** [../zetter-real-shifts/exports/zetter-real-shifts-001-005.csv](../zetter-real-shifts/exports/zetter-real-shifts-001-005.csv)  
**Fictional comparison:** [HF_INTELLIGENCE_FAILURE_MAP_V1.md](HF_INTELLIGENCE_FAILURE_MAP_V1.md) + [../pilot-hotel/SCENARIO_INDEX.md](../pilot-hotel/SCENARIO_INDEX.md)  
**Date:** 2026-08-08  

**Scope of this document:** Frequency of approved real-shift failure tags; cross-compare with fictional Pilot Hotel evidence; validate Reasoning Sprints 1–4 against real hotel history; identify uncovered families; recommend next testing sequence.  

**Out of scope:** Application code, prompts, extraction/reasoning/recommendation engines, UI, CSV mutation, regenerating handovers, implementing Sprint 5, modifying historical shift evidence.

**Critical framing:** Zetter outputs are **HISTORICAL HF OUTPUT**. Do **not** judge them as if Sprints 1–4 were already present. This map asks whether historical real-world failures validate the reasoning problems discovered in fictional stress tests.

---

## 1. Executive verdict

Across **5/5 FAIL** real Night handovers at The Zetter Marylebone (all **High** operational risk), historical HF consistently retained fragments of messy PMS/notes paste but failed Night Manager standards on:

| Cluster | Real signal | Link to Pilot map |
|---------|-------------|-------------------|
| Current operational truth | 5/5 `CURRENT_STATE` | Root A (`state-resolution` / `source-of-truth`) |
| Priority / severity | 5/5 `PRIORITY_SEVERITY` | Root C / mixed `prioritisation` |
| Entity / amenity binding | 5/5 `ENTITY_BINDING` | Root B (`entity-resolution`) — **more frequent in real sample than named in Pilot index** |
| Temporal / calendar | 5/5 `TEMPORAL` | Root C `temporal` — **stronger in real sample** |
| Extraction fidelity | 4/5 `EXTRACTION` | Under-weighted in Pilot map (2/20 named) |
| Payment framing | 3/5 `PAYMENT_STATE` | Root B `payment-state` |

**Sprint validation (real Zetter evidence only):**

| Sprint | Verdict |
|--------|---------|
| Sprint 1 — current-state / supersession | **STRONGLY VALIDATED** |
| Sprint 2 — priority / severity | **STRONGLY VALIDATED** |
| Sprint 3 — entity resolution | **STRONGLY VALIDATED** |
| Sprint 4 — dependencies / sequencing | **NOT YET VALIDATED** by real Zetter evidence |

**Generalisation vs fictional 20:** **MODERATE GENERALISATION SIGNAL**

**Future work candidates (not approved as Sprint 5):** temporal/calendar reasoning and extraction fidelity are the strongest real-driven gaps after Sprints 1–3. Do **not** start Sprint 5 from this document alone.

---

## 2. Zetter failure-frequency table

Counts from **approved Main Failure Tags** in `SHIFT_INDEX.md` only. Do not infer tags not approved in individual shift reviews.

| Failure tag | Shifts | Count | % of 5 | Pattern |
|-------------|--------|------:|-------:|---------|
| `CURRENT_STATE` | 001–005 | 5 | 100% | Repeated |
| `TEMPORAL` | 001–005 | 5 | 100% | Repeated |
| `PRIORITY_SEVERITY` | 001–005 | 5 | 100% | Repeated |
| `ENTITY_BINDING` | 001–005 | 5 | 100% | Repeated |
| `EXTRACTION` | 002–005 | 4 | 80% | Repeated |
| `PAYMENT_STATE` | 001, 002, 004 | 3 | 60% | Repeated |
| `DUPLICATION` | 002–004 | 3 | 60% | Repeated |
| `NON_ACTIONABLE_RECOMMENDATION` | 002–004 | 3 | 60% | Repeated |
| `COMPRESSION_NOISE` | 002–004 | 3 | 60% | Repeated |
| `ROOM_STATE` | 002 | 1 | 20% | One-off (as main tag) |
| `OTHER` | 005 | 1 | 20% | One-off form; severe when present |
| `DEPENDENCY_SEQUENCE` | — | 0 | 0% | Not approved on any shift |
| `COMPLETED_AS_OPEN` | — | 0 | 0% | Not used as main tag (explicitly rejected for 002 gas) |
| `SNAPSHOT` | — | 0 | 0% | Ambiguity in 004/005 only — not a confirmed intelligence tag |

### Rank by real-world frequency × operational importance

1. **PRIORITY_SEVERITY** (5/5) — false lead priorities / “no urgent work”
2. **CURRENT_STATE** (5/5) — wrong open vs done / in-house vs arrival
3. **ENTITY_BINDING** (5/5) — wrong guest/amenity/room binding
4. **TEMPORAL** (5/5) — dep-as-arrival; today vs later dates; timed work buried
5. **EXTRACTION** (4/5) — lost amenities; preference rewrite; fragmenting
6. **PAYMENT_STATE** (3/5) — phantom collect / wrong payment framing
7. **NON_ACTIONABLE_RECOMMENDATION + DUPLICATION + COMPRESSION_NOISE** (3/5) — downstream noise
8. **OTHER** (1/5) — empty recommendations despite open work (005)
9. **ROOM_STATE** (1/5) — Opera allocation / availability (002)

### `OTHER` definition (Shift 005)

**Missing actionable recommendations despite genuine open operational work.**  
(`recommendation_state = []` while Friends-of-Armi package, iron request, taxi/bags, and room-2 conflict remained operationally relevant.)

---

## 3. Operational-risk summary

| Risk | Shifts | % |
|------|--------|--:|
| **High** | 001, 002, 003, 004, 005 | **100%** |
| Medium / Low / Critical | — | 0% |
| Review status **FAIL** | 001–005 | **100%** |

No shift was rated Critical as historical output (e.g. Room 51 gas in 002 had DM attendance recorded), but every shift was **High** if staff relied on the handover — VIP/relationship miss, wrong payment chase, wrong amenity guest, or “no priorities” when real prep existed.

| Shift | Anchor | Status | Risk | Headline historical failure |
|-------|--------|--------|------|-----------------------------|
| 001 | Jacqui / Peter Polk | FAIL | High | Unsupported-by-source AC as P1; 51 tokenisation / 11:25 pickup buried |
| 002 | Mona Alabood / rm 51 Polk gas | FAIL | High | Quote as Urgent; Room 1 false balance; foam→extra pillows; Gill VVIP underweighted |
| 003 | Josh Piercey-Fisher / Hayden Landry | FAIL | High | Champagne bound to Helene; Hayden “arriving 9 Aug”; package-held contact unsupported |
| 004 | Jihyun An / Phoebe | FAIL | High | Phantom channel payment lead; Jihyun omitted; Phoebe arriving vs departing |
| 005 | Laura Godfrey / Benjamin James | FAIL | High | “No urgent priorities”; Friends-of-Armi package dropped; empty recommendations |

---

## 4. Fictional vs real comparison

Pilot tags are kebab-case in `SCENARIO_INDEX.md` / Failure Map V1; Zetter tags are SCREAMING_SNAKE. Mapping is semantic.

| Family | Real Zetter | Fictional Pilot | Class |
|--------|-------------|-----------------|-------|
| **CURRENT_STATE** / state-resolution / source-of-truth | **5/5**. Ex: Helene in-house vs arrival (003); twin already set still open (004); iron marked completed (005); gas framing vs DM attended + tomorrow inspect (002) | **~18–19/20** `state-resolution` / `source-of-truth`. Ex: 019 champagne after cancel; 002 Grant move | **A — strongly validated by both** |
| **PRIORITY_SEVERITY** / prioritisation | **5/5**. Ex: unsupported AC P1 (001); quote Urgent (002); false payment lead (004); “no urgent priorities” (005) | **20/20** `prioritisation`; severity named 005/010/017 | **A** |
| **ENTITY_BINDING** / entity-resolution | **5/5**. Ex: champagne→Helene (003); false VIP (001); foam→extra (002); Jihyun drop (004); Armi package unbound (005) | **3/20** named `entity-resolution` (003/016/020); Critical when present | **A** (real shows common, not rare) |
| **PAYMENT_STATE** | **3/5**. Ex: channel/outstanding unsupported (001/004); upgrade→balance (002) | **17/20** `payment-state` | **A** |
| **TEMPORAL** | **5/5**. Ex: dep as arrival (002/003); Jihyun 7 vs 9 Aug (004); 6 Aug prep vs tonight (001) | **6/20** `temporal` | **A** (stronger in real sample) |
| **EXTRACTION** | **4/5**. Ex: package-held from flowers (003); taxi booked vs money left (004); Armi amenities lost (005) | **2/20** named `extraction` | **C — primarily real-hotel issue** (under-weighted in fictional map) |
| **DUPLICATION** / deduplication | **3/5**. Ex: identical P3/P4 (002); twin ☐×2 (004); clone VIP recs (003) | **13/20** `deduplication` | **A** (downstream) |
| **NON_ACTIONABLE_RECOMMENDATION** / recommendation-quality | **3/5** (002–004) | **20/20** `recommendation-quality` | **A** (symptom) |
| **COMPRESSION_NOISE** / compression + presentation | **3/5** | **14/20** compression; **19/20** presentation | **A** (downstream) |
| **ROOM_STATE** / room-status | **1/5** (002 Opera available) | **10/20** `room-status` / OOO | **B — primarily fictional stress-test** in this sample |
| **COMPLETED_AS_OPEN** | **0/5** main tags | **14/20** | **B** for this sample |
| **DEPENDENCY_SEQUENCE** | **0/5**; flower readiness rejected as material dependency tag | **1/20** named (018); echoes 007/014 | **B / D** — not yet real-validated |
| **OTHER** (missing recommendations) | **1/5** (005) | No Pilot index equivalent | **C** |
| **Structured-section misuse** | Strong in **004/005** | Less “PMS section lie” in Pilot suite | **C** |
| **SNAPSHOT** | Ambiguity 004/005 only | **11/20** `hotel-snapshot` | **D** for real causation |

### Classification key

| Class | Meaning |
|-------|---------|
| **A** | Strongly validated by both real and fictional evidence |
| **B** | Primarily fictional stress-test issue (weak/absent in these 5 real shifts) |
| **C** | Primarily real-hotel issue (under-represented or absent in fictional map) |
| **D** | Insufficient evidence to confirm as intelligence failure |

---

## 5. Sprint 1–4 validation

| Sprint | Target | Real Zetter evidence | Verdict |
|--------|--------|----------------------|---------|
| **1** | Current-state / supersession | 5/5 `CURRENT_STATE`: Helene in-house vs arrival prep (003); twin already set (004); iron completed wrongly (005); gas attended vs undifferentiated open impact (002); today checkout vs future Polk lines (001) | **STRONGLY VALIDATED** |
| **2** | Priority / severity | 5/5 `PRIORITY_SEVERITY`: unsupported AC lead (001); quote Urgent (002); false payment lead (004); “no urgent priorities” vs Friends of Armi (005); generic VIP order over timed today work (003) | **STRONGLY VALIDATED** |
| **3** | Entity resolution | 5/5 `ENTITY_BINDING`: champagne wrong guest (003); false VIP (001); preference rewrite (002); Jihyun drop (004); Ben/Sophie/Armi package unbound (005) | **STRONGLY VALIDATED** |
| **4** | Dependencies / sequencing | **0/5** `DEPENDENCY_SEQUENCE`. Closest notes (flowers when room ready; tomorrow maint inspect) judged **TEMPORAL / CURRENT_STATE**, not material sequencing failures. No Zetter analogue of Pilot 018 dispute/inspect gates. | **NOT YET VALIDATED** by real Zetter evidence |

Sprint 4 remains justified by **fictional** scenario 018 (and echoes), not by these five historical real shifts.

---

## 6. Uncovered real-world failure families

Not adequately covered by Sprints 1–4 alone (even where partially overlapping):

| Family | Real signal | Candidate priority | Status |
|--------|-------------|--------------------|--------|
| **Temporal / calendar reasoning** (dep vs arrival; today vs later dates; AM windows) | 5/5 `TEMPORAL` | **P0 candidate** | Strong future work; **not approved as Sprint 5** |
| **Extraction / fidelity** (amenities, preference wording, cash vs booked) | 4/5 `EXTRACTION` | **P0 candidate** | Strong future work; **not approved as Sprint 5** |
| **Structured-section interpretation** (Arrivals heading vs “departing” body; arrival vs checkout conflict) | 004, 005 | **P1 candidate** | Real-specific |
| **Missing actionable recommendations** | 005 `OTHER` | **P1 candidate** | Empty `[]` with open work |
| **Compression / duplication / generic rec noise** | 3/5 each | **P2 candidate** | Mostly downstream of P0 roots |
| **Payment semantics** | 3/5 | Keep under payment / current-state work | Overlaps Sprint 2 territory |
| **OOO / room-status hell** | Weak in sample | **P2** until more real OOO evidence | Primarily fictional so far |
| **Dependency sequencing** | Not real-validated | Keep fictional regression | **Do not** prioritise as next real-driven sprint from this map alone |

---

## 7. Generalisation assessment

**MODERATE GENERALISATION SIGNAL**

**Why not weak:** The same root clusters that dominate Pilot Hotel — **current truth, priority, entity binding, payment framing, temporal confusion** — appear at very high rate in all five real Night handovers. That independently validates that fictional stress tests were not inventing the disease.

**Why not strong:**

- **n = 5**, one property, predominantly Night, similar preparer pattern.
- **Sprint 4 dependency** and high-frequency Pilot **`completed-as-open` / OOO room-status** are **not** mirrored in approved Zetter main tags.
- Real hotel adds **heavier extraction loss** and **empty-recommendation** failure than the fictional map emphasised.

Directionally aligned; not yet a full statistical twin of the fictional 20.

---

## 8. Recommended next testing sequence

1. **Rerun the exact same 5 Zetter `source_notes` through current post-Sprint-4 HF** (freeze inputs; label outputs as CURRENT ENGINE, not historical).  
2. **Write before/after comparison** against approved Expected Current Truth / Important Actions (not against “looks nicer”).  
3. **Only then decide the next reasoning sprint** — evidence so far points toward **temporal + extraction fidelity** (and structured-section rules) more than another dependency sprint. **Sprint 5 is not approved yet.**  
4. **Gather more real Zetter shifts in parallel** (different days/shifts/authors) to grow n beyond 5.  
5. **Fix remaining families** only after before/after shows what Sprints 1–4 already fixed vs what remains.  
6. **Another fictional hotel** — later, as regression diversification; not before real before/after.

### What NOT to fix yet

- Do **not** treat Sprint 4 as “proven by Zetter” or expand dependency engines from this sample alone.  
- Do **not** “fix” sparse ADR £2 snapshot as an intelligence bug without causation evidence.  
- Do **not** implement a new sprint from this map without the **current-engine rerun**.  
- Do **not** rebuild UI / Guest Intelligence / prompts from these historical outputs.  
- Do **not** rewrite Pilot scenarios to match Zetter tags.  
- Do **not** chase `COMPLETED_AS_OPEN` as the primary real-hotel root from this set.

---

## 9. Evidence limitations

- Historical HF only — **before / during** later reasoning work; not a score of current `main`.  
- **5 shifts**, one property (The Zetter Marylebone), predominantly Night.  
- Messy PMS pastes vs structured sections mixed; some temporal ambiguities remain inside the human benchmarks.  
- Tag vocabularies differ slightly between Pilot and Zetter indexes.  
- Snapshot anomalies and “unsupported by recovered source evidence” cases are carefully scoped (absence from `source_notes` ≠ proof of total absence elsewhere).  
- No before/after against post-Sprint-4 yet — this map cannot claim that Sprints 1–4 **fixed** the real failures; only that historical real failures **validate the need** for Sprints 1–3.

---

## 10. Evidence hygiene

- Shift files preserve historical input/output from `testing/zetter-real-shifts/exports/zetter-real-shifts-001-005.csv`.  
- Reviews are tester observations against that frozen output — **not** re-runs.  
- Approved main tags in `SHIFT_INDEX.md` are authoritative for frequency counts in this map.  
- Do not treat chat summaries as evidence; shift files + this map (after approval) are authoritative.  
- Update this map after controlled post-Sprint-4 reruns when those results are written into evidence.

---

## 11. Document control

| Version | Date | Change |
|---------|------|--------|
| V1 | 2026-08-08 | Initial real-shift map from completed Zetter 001–005 tester review + comparison to Pilot Failure Map V1 |
