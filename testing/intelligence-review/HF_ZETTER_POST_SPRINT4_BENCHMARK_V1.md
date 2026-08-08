# HF Zetter Post-Sprint-4 Benchmark V1

**Status:** Analysis / documentation only  
**Evidence base:**
- Historical + human benchmark: `testing/zetter-real-shifts/shift-001.md` … `shift-005.md`
- Current engine rerun: `testing/zetter-real-shifts/current-engine-rerun/shift-00X-current.md` (+ `.json`)
- Prior maps: [HF_ZETTER_REAL_SHIFT_FAILURE_MAP_V1.md](HF_ZETTER_REAL_SHIFT_FAILURE_MAP_V1.md), [HF_INTELLIGENCE_FAILURE_MAP_V1.md](HF_INTELLIGENCE_FAILURE_MAP_V1.md)  

**Engine commit under test:** `c986991efcd29b87fe9a083515bb1d5be08d5794`  
**Date:** 2026-08-08  

**Scope:** Persist the approved human benchmark comparison of HISTORICAL vs CURRENT POST-SPRINT-4 outputs against Expected Current Truth / Important Actions.  
**Out of scope:** Implementation, Sprint 5 coding, regenerating handovers, modifying historical or rerun artefacts.

---

## 1. Executive before/after result

Current post-Sprint-4 HF is **better than historical on some headline errors**, but **not yet a reliable Night Manager handover** against the human benchmarks.

| Pattern | Verdict |
|---------|---------|
| Best gains | Removed unsupported AC lead (001); quote no longer Urgent (002); foam pillows preserved in organised text (002); Josh champagne/flowers correctly named in briefing (003); taxi money wording preserved vs “taxi booked” (004) |
| Persistent failures | Phantom **channel/outstanding payment** leads (002, 004); **Peter/Phoebe false VIP**; **51 tokenisation / Heathrow / Gill VVIP / Friends of Armi** still not actioned; **005 still “no urgent priorities” + empty recs** |
| Clear regression | **003:** Josh’s champagne/anniversary/flowers text **merged into Helene’s VIP line** |
| Sprint 4 | **0 dependency edges** on all five — no real-world dependency evidence |

**Suite-level conclusions (approved):**

- Overall improvement = **MODERATE**, but current HF is **not yet reliable to Night Manager standard**
- **No shift currently passes** the full human benchmark
- `ENTITY_BINDING` materially fails **5/5**
- `MISSING_ACTIONABLE_RECOMMENDATION` materially fails **5/5**
- `PRIORITY_SEVERITY` materially fails **4–5/5**
- `TEMPORAL`, `CURRENT_STATE`, and `EXTRACTION` materially fail **4/5**

| Shift | Overall verdict |
|-------|-----------------|
| 001 | **MODERATE IMPROVEMENT** |
| 002 | **MINOR IMPROVEMENT** |
| 003 | **MINOR IMPROVEMENT** (briefing win offset by entity-merge regression) |
| 004 | **MINOR IMPROVEMENT** |
| 005 | **NO MATERIAL IMPROVEMENT** |

---

## 2. Shift 001 comparison

**Benchmark focus:** Room 22 safe; Room 51 CC not tokenised (checkout today); Heathrow 11:25 pickup; no unsupported AC; no false VIP; no prepaid collect chase.

**HISTORICAL key failures:** AC P1 unsupported by source; Peter VIP; channel-payment chase; 51/Heathrow buried; package boilerplate.

**CURRENT**
- **Fixed:** AC lead gone; Room 22 safe is Priority 1 + sole maintenance rec; payments section empty (no Stacia collect chase); no seasonal-package boilerplate.
- **Improved incomplete:** Organised notes retain 51 tokenisation, Jacqui, Heathrow fragments, bar glasses — still not turned into briefing/actions.
- **Still wrong:** Peter Polk under VIP without VIP evidence; Rm5 “follow-up” as Priority 2 over 51/tokenisation and 11:25 pickup; Heathrow still fragmented; Jacqui/sofa/EA weakly bound.
- **New regression:** None major.

| Dimension | Result |
|-----------|--------|
| Fact accuracy | **PARTIAL** |
| Current-state accuracy | **PARTIAL** |
| Action accuracy | **PARTIAL** |
| Guest/entity accuracy | **FAIL** (false VIP) |
| Priority/severity accuracy | **PARTIAL** |

**Overall:** **MODERATE IMPROVEMENT**

---

## 3. Shift 002 comparison

**Benchmark focus:** Gas continuity (DM attended; inspect tomorrow); rm11 tokenisation; Gill VVIP+DM reinspect; Helene Opera; foam pillows; no quote-as-urgent; no Room1 balance chase.

**HISTORICAL key failures:** Quote Urgent; duplicate payment priorities; Room1 outstanding; foam→extra; VIP pollution; Gill underweighted.

**CURRENT**
- **Fixed:** Urgent empty (quote not elevated); organised guest line keeps **“Foam pillows”**; Henry line shows **comp upgrade** text (not “outstanding balance remains”).
- **Improved incomplete:** Gas narrative retained in maintenance with tomorrow inspect text; Gill VVIP full text in VIP section; rm11 tokenisation in general.
- **Still wrong:** Briefing Priority 2 still **“outstanding channel payment”**; Rec2 **collect outstanding Room 33**; Rec5 **“extra pillows”** despite foam in organised; VIP list still polluted; Gill amenities not primary actions; Helene Opera not actioned.
- **New regression:** Organised foam correct but recommendation rewrites to **extra pillows**.

| Dimension | Result |
|-----------|--------|
| Fact accuracy | **PARTIAL** |
| Current-state accuracy | **PARTIAL** |
| Action accuracy | **FAIL** |
| Guest/entity accuracy | **FAIL** |
| Priority/severity accuracy | **FAIL** |

**Overall:** **MINOR IMPROVEMENT**

---

## 4. Shift 003 comparison

**Benchmark focus:** Josh champagne/truffles/flowers (in-house VIP); Hayden twin **43**; Helene in-house no champagne; late c/o 5&14 today; rm12 arrive today; no package-held contact.

**HISTORICAL key failures:** Champagne on Helene; Hayden arriving 9 Aug; package-held rec; generic guest-request priorities.

**CURRENT**
- **Fixed:** Briefing Priority 1 correctly names **Josh Piercey-Fisher — champagne and flowers**; no held-package recommendation; Hayden twin appears in briefing/recs.
- **Improved incomplete:** Late c/o 5&14 and rm12 present in general; birthday/dental in preparations.
- **Still wrong:** Hayden twin attributed to **Room 42** in briefing/rec; Helene not cleanly “in-house awareness only”; late c/o/rm12 not leading actions.
- **New regression (Critical):** Organised VIP merges **Josh’s champagne/anniversary/flowers into Helene’s line**.

| Dimension | Result |
|-----------|--------|
| Fact accuracy | **FAIL** (merge) |
| Current-state accuracy | **FAIL** |
| Action accuracy | **PARTIAL** |
| Guest/entity accuracy | **FAIL** (regression) |
| Priority/severity accuracy | **PARTIAL** |

**Overall:** **MINOR IMPROVEMENT**

---

## 5. Shift 004 comparison

**Benchmark focus:** Rm22 late c/o @12; Jihyun EA/luggage/upgrade; Phoebe dep 08/08 POA/upgrade (not arriving VIP); Anne iron + twin already set; taxi **money** for Andrea; no channel payment.

**HISTORICAL key failures:** Channel payment P1; Jihyun omitted; Phoebe arriving VIP; taxi booked; twin ☐ if available.

**CURRENT**
- **Fixed / improved:** **“taxi money left for Andrea”** preserved; **22 late c/o** in guest + briefing P2; **Jihyun full note visible**; Anne prep retains twin-already-set wording.
- **Still wrong:** Briefing **Priority 1 still outstanding channel payment**; Jihyun parked under **payments**; Phoebe still **VIP**; only rec is iron 33; Jihyun EA/luggage and Phoebe upgrade not actioned.
- **New regression:** Jihyun mis-typed into **payments**.

| Dimension | Result |
|-----------|--------|
| Fact accuracy | **PARTIAL** |
| Current-state accuracy | **FAIL** |
| Action accuracy | **FAIL** |
| Guest/entity accuracy | **FAIL** |
| Priority/severity accuracy | **FAIL** |

**Overall:** **MINOR IMPROVEMENT**

---

## 6. Shift 005 comparison

**Benchmark focus:** Benjamin Friends-of-Armi package; resolve Andrew vs rm2 checked out; Brittany iron open; taxi 5&15 + 2-week bags; must generate actionable recs.

**HISTORICAL key failures:** “No urgent priorities”; empty recs; iron completed; Armi package dropped from actions.

**CURRENT**
- **Fixed:** Essentially none of the benchmark failures.
- **Improved incomplete:** Taxi + 2-week bags kept together in one guest line.
- **Still wrong:** Briefing still **“No urgent guest-impacting priorities”**; **`recommendations = []`**; Brittany still **Completed**; Benjamin package only in general; Andrew/rm2 conflict unflagged.
- **New regression:** None beyond continued suppression of the real lead job.

| Dimension | Result |
|-----------|--------|
| Fact accuracy | **FAIL** |
| Current-state accuracy | **FAIL** |
| Action accuracy | **FAIL** |
| Guest/entity accuracy | **FAIL** |
| Priority/severity accuracy | **FAIL** |

**Overall:** **NO MATERIAL IMPROVEMENT**

---

## 7. Dimension-level before/after table

| Dimension | 001 | 002 | 003 | 004 | 005 | Suite |
|-----------|-----|-----|-----|-----|-----|-------|
| Fact accuracy | PARTIAL | PARTIAL | FAIL | PARTIAL | FAIL | Weak–mixed |
| Current-state | PARTIAL | PARTIAL | FAIL | FAIL | FAIL | Mostly FAIL |
| Action accuracy | PARTIAL | FAIL | PARTIAL | FAIL | FAIL | Mostly FAIL |
| Guest/entity | FAIL | FAIL | FAIL | FAIL | FAIL | **FAIL all 5** |
| Priority/severity | PARTIAL | FAIL | PARTIAL | FAIL | FAIL | Mostly FAIL |

---

## 8. Sprint 1–4 real-world effectiveness

| Sprint | Classification |
|--------|----------------|
| **Sprint 1** — current-state / supersession | **SOME REAL-WORLD IMPROVEMENT** |
| **Sprint 2** — priority / severity | **SOME REAL-WORLD IMPROVEMENT** |
| **Sprint 3** — entity resolution | **SOME REAL-WORLD IMPROVEMENT**, with the **Shift 003 false-merge regression** |
| **Sprint 4** — dependencies / sequencing | **NO CLEAR REAL-WORLD EVIDENCE** from these five shifts |

---

## 9. Remaining current-engine failure frequency

| Family | Count /5 | % |
|--------|---------:|--:|
| `ENTITY_BINDING` | 5 | 100% |
| `MISSING_ACTIONABLE_RECOMMENDATION` | 5 | 100% |
| `PRIORITY_SEVERITY` | 4–5 | 80–100% |
| `TEMPORAL` | 4 | 80% |
| `CURRENT_STATE` | 4 | 80% |
| `EXTRACTION` | 4 | 80% |
| `COMPRESSION_NOISE` | 4 | 80% |
| `PAYMENT_STATE` | 2 | 40% |
| `NON_ACTIONABLE_RECOMMENDATION` | 2–3 | 40–60% |
| `ROOM_STATE` | 1 | 20% |
| `DEPENDENCY_SEQUENCE` | 0 | 0% |

---

## 10. Regressions introduced

1. **003 entity false-merge:** Josh champagne/anniversary/flowers concatenated onto Helene VIP note.  
2. **002 rec-layer preference rewrite:** organised “Foam pillows” → rec “extra pillows”.  
3. **004 Jihyun → payments** section (new wrong operational type).

---

## 11. Sprint 5 candidates (not final scope)

Candidate prioritisation from before/after frequency × harm — **pending root-cause / architecture review** (see companion Sprint 5 root-cause analysis in chat / subsequent architecture note). **Not declared final Sprint 5 scope here.**

| Priority | Candidate family |
|----------|------------------|
| Candidate P0 | Actionable priority selection for real messy handovers (`PRIORITY_SEVERITY` + `MISSING_ACTIONABLE_RECOMMENDATION`) |
| Candidate P1 | Entity-binding safety / false-merge prevention (`ENTITY_BINDING`) |
| Candidate P2 | Temporal + structured-section interpretation (`TEMPORAL`) |

Do **not** make Sprint 5 = dependencies from this sample alone.

---

## 12. What NOT to fix yet

- Sprint 4 dependency expansion from this sample  
- Snapshot ADR £2 mysteries  
- UI / Guest Intelligence / prompt rewrites from this comparison alone  
- Celebrating cleaner wording or “fewer recs” without benchmark fit  
- Another fictional hotel before Sprint 5 root-cause decision  

---

## 13. Evidence limitations

- Rerun uses engine harness path (not full `handover.html` DOM `analyzeNote` path)  
- `n = 5`, one hotel, Night-heavy  
- Historical vs current share same inputs; Expected Truth is human judgment with documented ambiguities  
- Dependency sprint cannot be scored here (0 edges)  
- No PASS claimed for current engine on any shift against full Night Manager standard  

---

## 14. Document control

| Version | Date | Change |
|---------|------|--------|
| V1 | 2026-08-08 | Approved human benchmark comparison of historical vs post-Sprint-4 Zetter reruns |
