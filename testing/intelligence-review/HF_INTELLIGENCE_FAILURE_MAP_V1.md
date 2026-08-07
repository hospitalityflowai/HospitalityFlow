# HF Intelligence Failure Map V1

**Status:** Analysis / documentation only  
**Evidence base:** Pilot Hotel scenarios `testing/pilot-hotel/scenario-001.md` … `scenario-020.md` (historical CSV runs; tester-reviewed)  
**Index:** [../pilot-hotel/SCENARIO_INDEX.md](../pilot-hotel/SCENARIO_INDEX.md)  
**Date:** 2026-08-07  

**Scope of this document:** Describe failure families, classify root vs downstream, prioritise fix order, and propose Reasoning Sprint 1.  
**Out of scope:** Application code, prompts, extraction/reasoning/recommendation engines, UI, CSV mutation, implementation of fixes.

---

## 1. Executive verdict

Across **20/20 Failed** Pilot Hotel stress scenarios, Hospitality Flow consistently **retains source fragments** (often including FINAL / PAID / DONE language) but fails to **elect and act on current operational truth**.

Three root clusters explain most Critical outcomes:

| Cluster | Name | Core question HF fails |
|---------|------|------------------------|
| **A** | Current Operational Truth | Which fact is current after corrections / supersession? |
| **B** | Operational Semantics | What kind of object is this (payment type, OOO, preference, identity, owner)? |
| **C** | Operational Policy | Among true opens, what may be acted on now, in what order, and how urgent? |

Near-universal tags such as `recommendation-quality`, `presentation`, `compression`, and often `completed-as-open` are **downstream symptoms** of A–C: templates regenerate “open work” from stale or mis-typed signals.

**Nuance vs early theory:** Latest-state / supersession is the **dominant** weakness (highest frequency × impact), but **not the only primary root**. Scenarios **017** (urgency among true opens) and **018** (blockers ignored despite SEQUENCE text present) show co-equal policy roots. **016/020** show identity binding as a semantic root alongside supersession.

---

## 2. Tag frequency across 001–020

Counts from Main Failure Tags in `SCENARIO_INDEX.md` after full review.

| Tag | Count /20 | Role (map classification) |
|-----|----------:|---------------------------|
| `prioritisation` | 20 | Mixed — often downstream of wrong open set; root when ranking among true opens |
| `recommendation-quality` | 20 | **Downstream** |
| `presentation` | 19 | **Downstream** |
| `state-resolution` | 19 | **Root A** |
| `source-of-truth` | 18 | **Root A** |
| `payment-state` | 17 | **Root B** |
| `completed-as-open` | 14 | **Downstream** (of A/B) |
| `compression` | 14 | **Downstream** |
| `deduplication` | 13 | **Downstream** |
| `hotel-snapshot` | 11 | Mostly **downstream** of room/state |
| `room-status` | 10 | **Root B** |
| `temporal` | 6 | **Root C** |
| `guest-preference` | 4 | **Root B** |
| `hotel-intelligence` | 4 | **Root B** (misapplied history/intel) |
| `entity-resolution` | 3 | **Root B** |
| `maintenance-severity` | 3 | **Root C** (subset of urgency) |
| `extraction` | 2 | Secondary / occasional root (messy parse) |
| `ownership-routing` | 2 | **Root B** |
| `urgency-ranking` | 1 | **Root C** (named sharply in 017; overlaps 005/010) |
| `dependency-sequencing` | 1 | **Root C** (named in 018; echoes 007/014) |
| `ambiguous-entity` | 1 | **Root B** (hold uncertainty) |
| `multi-source-conflict` | 1 | **Root A** (authority among sources) |

---

## 3. Failure families (evidence-backed)

For each family: scenarios, frequency, example, consequence, max risk, root vs symptom, dependencies.

### 3.1 ROOT A — Current Operational Truth

#### A1. Latest-state / supersession (`source-of-truth` + `state-resolution`)

| Field | Content |
|-------|---------|
| **Failure family** | Latest confirmed update not elected as sole current state; superseded intermediates survive as open work |
| **Scenarios** | 002, 003, 005–020 (primary); echoes in 001 |
| **Frequency** | ~18–19/20 |
| **Typical example** | **019:** notes say chocolates+card only / no champagne; briefing still “champagne + chocolates”; prep still ☐ champagne/flowers |
| **Operational consequence** | Incoming shift acts on cancelled amenities, old rooms, paid balances, resolved maint |
| **Max risk** | **Critical** |
| **Root vs symptom** | **ROOT** |
| **Depends on** | Feeds almost all downstream families; worsened by weak source authority (A2) |

#### A2. Source authority / multi-source conflict (`multi-source-conflict`, often with A1)

| Field | Content |
|-------|---------|
| **Failure family** | Conflicting channel/department updates treated as equally current |
| **Scenarios** | 012 (named); also 011, 015, 019 |
| **Frequency** | 1 named / ~4–5 strongly evidenced |
| **Typical example** | **012:** multi-channel VIP/payment/room noise; HF does not collapse to one authority timeline |
| **Operational consequence** | Duplicate contradictory actions |
| **Max risk** | **Critical** |
| **Root vs symptom** | **ROOT** (specialisation of A1) |
| **Depends on** | Requires A1 election rules + authority ranking |

---

### 3.2 ROOT B — Operational Semantics

#### B1. Payment-state semantics (`payment-state`)

| Field | Content |
|-------|---------|
| **Failure family** | POA / prepaid / company / disputed / refund / £0 / removed charges treated as “collect outstanding” |
| **Scenarios** | 001–003, 005–006, 008, 010–020 |
| **Frequency** | 17/20 |
| **Typical example** | **008 / 015 / 019:** company billing or PAID → still chase £240 / £85 / “£0 remains outstanding” |
| **Operational consequence** | Guest embarrassment, double collection, wrong finance chase |
| **Max risk** | **Critical** |
| **Root vs symptom** | **ROOT** (semantic typing); often co-triggered by A1 when PAID supersedes POA |
| **Depends on** | A1 for FINAL payment updates; distinct type model still required when state is “open but not collectable” (disputed — **018**) |

#### B2. Room / OOO state (`room-status`)

| Field | Content |
|-------|---------|
| **Failure family** | In-service vs OOO vs moved-from vs returned-to-service confused |
| **Scenarios** | 002, 003, 005, 007, 010–012, 015, 019, 020 |
| **Frequency** | 10/20 |
| **Typical example** | **020:** 214/402 must stay OOO; snapshot OOO=0; Sophia VIP sent to **402** |
| **Operational consequence** | Selling/assigning unsafe rooms; wrong guest-impact framing |
| **Max risk** | **Critical** |
| **Root vs symptom** | **ROOT B**; snapshot errors often **downstream** |
| **Depends on** | A1 (was OOO → now in service); return-to-service sequences (C2) |

#### B3. Entity identity / binding (`entity-resolution`, `ambiguous-entity`)

| Field | Content |
|-------|---------|
| **Failure family** | Same/similar names merged or amenities/payments bound to wrong guest/room; ambiguity guessed |
| **Scenarios** | 003, 016, 020 (+ echoes elsewhere) |
| **Frequency** | 3/20 named; Critical when present |
| **Typical example** | **016:** champagne on Robert 18 not Helen 19; late c/o on wrong Lee; anniversary on wrong Wilson |
| **Operational consequence** | Wrong-guest service / privacy / payment harm |
| **Max risk** | **Critical** |
| **Root vs symptom** | **ROOT B** (not reducible to A1 alone — FINALs can exist and still bind wrong) |
| **Depends on** | Booking refs, room numbers, staff-vs-guest; `ambiguous-entity` requires explicit hold |

#### B4. Guest preference vs history (`guest-preference`, `hotel-intelligence`)

| Field | Content |
|-------|---------|
| **Failure family** | Historical preference / repeat-guest intel treated as outstanding prep or current request |
| **Scenarios** | 001, 004, 007–009, 013, 019 |
| **Frequency** | preference 4; hotel-intelligence 4 |
| **Typical example** | **009:** repeat-guest history revived as tonight’s open tasks |
| **Operational consequence** | Noise and wrong VIP prep |
| **Max risk** | **High** (Critical when alcohol/flowers wrong — 019) |
| **Root vs symptom** | **ROOT B** |
| **Depends on** | A1 for cancelled amenities; distinct “knowledge vs task” typing |

#### B5. Ownership / routing (`ownership-routing`)

| Field | Content |
|-------|---------|
| **Failure family** | Wrong department owns action; Night asked to do Management/F&B/Finance-gated work |
| **Scenarios** | 014, 018 |
| **Frequency** | 2/20 |
| **Typical example** | **014:** Night-owned vs Management-owned tasks collapsed |
| **Operational consequence** | Wasted Night effort; skipped true Night actions |
| **Max risk** | **High** |
| **Root vs symptom** | **ROOT B**; amplified by C2 blockers |
| **Depends on** | Policy gates (C2) + current state (A1) |

---

### 3.3 ROOT C — Operational Policy

#### C1. Urgency / severity ranking (`urgency-ranking`, `maintenance-severity`, part of `prioritisation`)

| Field | Content |
|-------|---------|
| **Failure family** | Safety/welfare/security under-ranked vs money, VIP amenity, templated maint |
| **Scenarios** | 005, 010, 017 (named urgency-ranking); prioritisation tag on all 20 |
| **Frequency** | Severity-named 3–4/20; prioritisation 20/20 (mixed purity) |
| **Typical example** | **017:** burning smell / medical / locked-out / rear door present in Urgent dump; briefing leads leak/AC/£480/VIP |
| **Operational consequence** | Shift starts on wrong work while guest safety waits |
| **Max risk** | **Critical** |
| **Root vs symptom** | **ROOT C** when items are correctly still open; often **downstream** when “open” set is already wrong (A1) |
| **Depends on** | Clean open set from A/B; then policy ladder |

#### C2. Dependency / blocker sequencing (`dependency-sequencing`)

| Field | Content |
|-------|---------|
| **Failure family** | Actions recommended through known gates (inspect, dispute verify, return-to-service chain) |
| **Scenarios** | 018 (named); echoes 007, 014 |
| **Frequency** | 1 named / ~3 evidenced |
| **Typical example** | **018:** collect disputed £120; Foster follow-up 35 before HK inspect |
| **Operational consequence** | Premature moves, wrongful collection, unsafe RTS |
| **Max risk** | **Critical** |
| **Root vs symptom** | **ROOT C** — SEQUENCE text often present; enforcement missing |
| **Depends on** | A1 (know current step) + B5 (who owns next step) |

#### C3. Temporal reasoning (`temporal`)

| Field | Content |
|-------|---------|
| **Failure family** | Today vs tomorrow / after-midnight / calendar-day confusion |
| **Scenarios** | 003, 004, 005, 006, 013, 020 |
| **Frequency** | 6/20 |
| **Typical example** | **006 / 013:** tomorrow arrivals or midnight keeps treated as tonight open work (or vice versa) |
| **Operational consequence** | Wrong-day prep; missed after-midnight keeps |
| **Max risk** | **High–Critical** |
| **Root vs symptom** | **ROOT C** |
| **Depends on** | Entity/room binding (B3); shift clock context |

---

### 3.4 DOWNSTREAM symptoms (do not fix independently first)

#### D1. Recommendation quality (`recommendation-quality`) — 20/20

Templated “Follow up Maintenance / Collect payment / VIP prep” regenerated from stale or mis-typed opens.  
**Symptom of** A1 + B1 + C1. Fixing templates alone will still recommend wrong work.

#### D2. Completed-as-open (`completed-as-open`) — 14/20

DONE/PAID/RESOLVED items remain ☐ or “outstanding”.  
**Symptom of** A1 (+ B1/B4).

#### D3. Deduplication / compression / presentation — 13–19/20

Huge General dumps, duplicate lines, section misrouting.  
**Symptom of** failing to collapse to current state (A1) before render. Compression polish without truth election hides less noise than expected.

#### D4. Hotel snapshot inconsistencies (`hotel-snapshot`) — 11/20

OOO=0 with rooms OOO; arrivals counts wrong; zeros.  
**Mostly symptom of** B2 + weak aggregation; occasional extraction issue (001/004).

#### D5. Extraction (`extraction`) — 2/20

Messy shorthand parse gaps. **Secondary** in this suite: correct FINAL text frequently exists *somewhere* in output.

---

## 4. Root vs downstream summary

```
ROOT A  Current Operational Truth
        └─ latest-state / supersession / source authority
ROOT B  Operational Semantics
        └─ payment · room/OOO · entity · preference/intel · ownership
ROOT C  Operational Policy
        └─ urgency ranking · dependency sequencing · temporal

DOWNSTREAM
        └─ recommendations · completed-as-open · dedupe · compression
           · presentation · (most) snapshot noise
```

**Classification changes vs initial hypothesis:** Evidence **supports** A/B/C roots and D symptoms. Adjustments:

1. **`prioritisation` is mixed**, not purely downstream — keep as policy root when opens are true (017).
2. **`hotel-snapshot` is mostly downstream**, not a primary intelligence root.
3. **`extraction` is not the primary 001–020 story**.
4. **Entity + urgency + dependency** are co-equal roots in the final batch, not mere instances of A1.

---

## 5. Prioritisation (Frequency × Operational Risk × Downstream Impact)

### P0 — must fix first

| Rank | Problem | Why first |
|------|---------|----------|
| **P0-1** | **Latest-state / supersession (A1)** | Highest frequency (~18–19/20), Critical risk, unlocks D1–D4 and reduces false payment/room/VIP opens |
| **P0-2** | **Payment-state semantics (B1)** | 17/20, direct money/guest harm; many payment errors are A1+B1 combined — type model needed even after supersession works (disputed/prepaid/company) |
| **P0-3** | **Urgency ranking among true opens (C1)** | Lower raw count than A1 but **Critical** safety impact (005/010/017); will remain after A1 if not addressed |

**Why P0-1 unlocks others:** If superseded DONE/PAID/CANCELLED/IN-SERVICE states stop entering the open set, templated recommendations, completed-as-open, dedupe pressure, and many snapshot lies shrink automatically.

**Why P0-2 is still P0 (not only A1):** **018** disputed £120 and prepaid/company cases need semantic types, not only “latest string wins.”

**Why P0-3 is P0 despite lower frequency:** Wrong ranking with correct opens is a guest-safety failure mode A1 cannot fix.

### P1 — next

| Rank | Problem | Why next |
|------|---------|----------|
| **P1-1** | **Entity identity / ambiguous hold (B3)** | Critical when present (003/016/020); distinct from supersession |
| **P1-2** | **Dependency / blocker sequencing (C2)** | Critical blast radius (018); SEQUENCE text already present |
| **P1-3** | **Room/OOO semantics (B2)** | 10/20; tightly coupled to A1 but needs explicit RTS/OOO object model |
| **P1-4** | **Temporal reasoning (C3)** | 6/20; wrong-day operational errors |

### P2 — later

| Rank | Problem | Notes |
|------|---------|-------|
| **P2-1** | Preference vs history / hotel-intelligence misuse (B4) | Important but narrower |
| **P2-2** | Ownership routing (B5) | After C2 gates exist |
| **P2-3** | Compression / presentation / dedupe polish (D3) | After truth election |
| **P2-4** | Snapshot display fixes (D4) | After B2 aggregation |
| **P2-5** | Extraction hardening (D5) | Secondary in this suite |

### Do **not** fix independently yet

| Symptom | Why wait |
|---------|----------|
| Recommendation templates / ranking copy | Will still fire on wrong opens |
| Completed-as-open checklist cosmetics | Needs A1 election |
| Compression / “shorter General” | Hides archive without electing truth |
| Section routing / presentation | Downstream of object typing |
| Snapshot number tweaks alone | Lies if room-state model wrong |

---

## 6. What HF consistently does well

1. **Preserves source detail** — FINAL / SEQUENCE / doctrine lines often survive into General.  
2. **Surfaces real entities and rooms** — guests/issues rarely totally dropped.  
3. **Sometimes records completions** — twin/prosecco/paid fragments appear in Completed or ☑.  
4. **Useful as an evidence mirror** — correct truth is often reconstructible *from the dump* even when briefing is wrong.  
5. **VIP/arrival awareness exists** — names/rooms mentioned even when state/priority is wrong.

Implication: Sprint 1 should bias toward **election and suppression of superseded opens**, not toward broader extraction of more text.

---

## 7. Proposed Reasoning Sprint 1

### Objective

Make HF **elect a single current operational state per tracked object** and **emit Night actions only from non-superseded opens**.

Highest-leverage root: **A1 Current Operational Truth (latest-state / supersession)**, with minimal payment-state guards required so PAID/£0/company do not regenerate collect actions.

### Exact intelligence behaviour required

For each operational object (guest amenity, balance, room status, maint ticket, arrival ETA, prep item):

1. Collect chronologically ordered claims from notes.  
2. Apply supersession: later confirmed update replaces earlier claim for the same object.  
3. Honour explicit FINAL / DONE / PAID / CANCELLED / RESOLVED / NOT OOO language when it is the latest claim.  
4. Output **one current state** + **open actions only if current state is outstanding**.  
5. Briefing / recommendations must not reference superseded states as open work.

### Invariants / rules

1. **Single current truth per object** — never present two ETAs, two amenity sets, or POA+company as co-equal current.  
2. **Superseded ⇒ not actionable** — cancelled champagne, completed twin, paid folio, returned-to-service room must not appear as open prep/collect/OOO.  
3. **£0 / PAID / transferred to company ⇒ do not collect.**  
4. **“Was OOO” ≠ “is OOO”** when latest says returned to service / in service.  
5. **Preservation OK** — historical lines may remain in an archive/collapsed source section; they must not drive briefing priorities or recommendations.

### Explicitly out of scope for Sprint 1

- Full urgency ladder redesign (C1 / 017)  
- Dependency graph / blocker engine (C2 / 018)  
- Entity resolution / ambiguous-entity hold (B3 / 016)  
- Temporal midnight policy beyond simple supersession (C3)  
- Preference vs history typing beyond amenity supersession (B4)  
- Ownership routing (B5)  
- UI / progressive disclosure / compression polish  
- Prompt-only cosmetic rewriting without state election  
- Snapshot UI redesign  

### Regression tests (existing scenarios)

| Tier | Scenarios | Why |
|------|-----------|-----|
| **Must pass** | **002, 011, 015, 019** | Dedicated updates / latest-truth / final-state / source-of-truth |
| **Must pass (payment)** | **008** (+ payment claims in **015, 019**) | PAID/company/£0 must not chase |
| **Must not regress** | **007** (room RTS), **012** (multi-source) | Authority + room state |
| **Observe only** | 016, 017, 018, 020 | Expected to remain Failed until later sprints; watch for no new harm |

### Measurable pass criteria

On **Must pass** scenarios, after re-run against saved inputs:

1. **No recommendation or briefing priority** that chases a balance whose expected truth is PAID / £0 / company-ledger.  
2. **No open prep ☐** for amenities whose expected truth is DONE / cancelled / replaced (e.g. 019 champagne/flowers; 015 champagne; 011 champagne).  
3. **No briefing priority** that treats a resolved/in-service maint item as open guest-impact when expected truth says monitor-only / resolved / not OOO.  
4. **Expected Important Actions** for 002/011/015/019 are covered by briefing or organised open sections without contradiction from superseded claims in those same decision surfaces.  
5. General may still be long (compression out of scope), but **decision surfaces** (Briefing + Recommendations + Payments + Preparations) must reflect elected current truth.

**Sprint 1 = Failed** if any Must-pass scenario still recommends collecting a paid/£0 balance or VIP-prepping a superseded amenity.

---

## 8. Suggested later sprints (not started)

| Sprint | Target | Primary scenarios |
|--------|--------|-------------------|
| 2 | Payment-state type model (disputed/prepaid/deposit/refund) | 008, 018, 014 |
| 3 | Urgency ladder (safety > welfare > timed > money > amenity) | 017, 005, 010 |
| 4 | Entity binding + ambiguous hold | 016, 003, 020 |
| 5 | Dependency / blocker sequencing | 018, 007, 014 |
| 6 | Temporal / midnight | 006, 013, 020 |
| 7 | Compression & presentation after truth election | suite-wide |

---

## 9. Evidence hygiene

- All scenario files preserve historical input/output from `testing/pilot-hotel/exports/pilot-hotel-scenarios-001-020.csv`.  
- Reviews are tester observations against that frozen output — **not** re-runs.  
- This map must be updated if scenarios are re-run after intelligence changes.  
- Do not treat chat summaries as evidence; scenario files are authoritative.

---

## 10. Document control

| Version | Date | Change |
|---------|------|--------|
| V1 | 2026-08-07 | Initial map from completed 001–020 tester review |
