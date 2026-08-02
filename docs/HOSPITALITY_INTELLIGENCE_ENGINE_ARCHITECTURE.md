# Hospitality Intelligence Engine — Architecture Review

**Date:** 28 July 2026  
**Scope:** Post Phase 16B + M4 codebase  
**Type:** Architecture report only — no code changes in this phase

---

## 1. Executive verdict

Hospitality Flow already has the **beginnings** of a shared intelligence layer (`ShiftIntelligenceEngine` + `AiWritingEngine` facts + Hotel Brain operational retrieval). After 16B/M4, Maintenance can contribute neutral facts and Handover can call `analyzeFacts()`.

But reasoning is still **spread across five surfaces**. The product does not yet follow a clean rule:

> Modules supply data. The engine reasons.

Today, Handover still classifies, prioritises, resolves, merges, and extracts; Maintenance owns workflow ranking; Hotel Brain owns retrieval heuristics; the Writing Engine owns fact semantics; Shift Intelligence owns recommendations — with overlapping copies of status, room, priority, quiet-shift, and closure logic.

**Target:** one Hospitality Intelligence Engine that accepts normalised inputs from adapters and owns all operational reasoning. Modules become data providers + UI/storage only.

---

## 2. Inventory — where business logic lives today

### 2.1 Handover (`handover.html`)

Still the largest concentration of **module-local reasoning**, even though it delegates more than before.

| Concern | Functions (representative) | Should be |
|---------|---------------------------|-----------|
| Segmentation | `parseNotes`, `splitOperationalTopics`, `topicFingerprint` | Engine / Writing (fact split already exists) |
| Fact attach | `analyzeNote`, `refreshNoteFact`, `finalizeNote` | Adapter → Writing extract |
| Section classification | `classifyAnalyzedNote`, `classifyLine`, `ensureNoteCoverage`, payment/maintenance/guest helpers | **Engine** (or shared classifier used only by engine) |
| Closure / active | `isCompletedActionNote`, `isResolvedNote`, `isActiveNote` | **Engine** (single closure model) |
| Priority | `detectMaintenancePriority`, `compareNotesByDutyPriority` | **Engine** |
| Room / guest | `extractRoomNumbers` (fallback), `extractGuestNameHint` | Writing / Engine |
| Dedupe / merge | `noteDedupeKey`, `consolidateAnalyzedNotes*`, `mergeNotesByRoom*`, cross-section dedupe in `classifyNotes` | Writing (same-source) + Engine (cross-source) |
| Snapshot parsing | `extractHotelSnapshot` | Engine or dedicated parser owned by engine |
| Metrics fallback | `computeHandoverMetricsLegacy` | Remove once facts path is sole path |
| Quiet shift (local) | `isQuietShiftLines` | Engine only |
| M4 orchestration | `loadMaintenanceIssuesForHandover`, `integrateMaintenanceIssues`, `generateShiftIntelligence` | Keep as **thin orchestration** (OK) |
| Brain context | `buildHotelBrainContext` wrapper + legacy fallback body | Shared builder only; delete fallback later |
| Recommendations UI | `normalizeRecommendation*`, render/edit | UI only |

**Verdict:** Handover is still a second brain with a compatibility shell around the shared engines.

---

### 2.2 Maintenance (`js/maintenance-store.js`, `maintenance.html`)

| Concern | Where | Reasoning vs OK |
|---------|-------|-----------------|
| Unresolved = not `completed` | `isUnresolved` | Domain workflow — OK in store |
| Sort / priority rank | `sortRank`, `sortIssues` | Module list UX — OK; must map via adapter for engine |
| Filters / search | `applyFilters`, `matchesSearch` | Module UX — OK |
| Handover inclusion flag | `setHandoverInclusion` | Product rule persistence — OK |
| Metrics | `computeMetrics` | Module dashboard — OK |
| Completion / reopen rules | `completeIssue`, `reopenIssue` | Workflow — OK |
| UI | `maintenance.html` | Presentation — OK |

**Verdict:** Maintenance correctly avoids a second recommendation engine. M4 eligibility filtering was lifted into Shift Intelligence (`filterMaintenanceIssuesForHandover`) — good. Remaining risk is **vocabulary drift** (priority/status) vs Handover/engine, not duplicated recommendation logic.

---

### 2.3 Hotel Brain

| Module | Reasoning | Role |
|--------|-----------|------|
| `hotel-profile-operational.js` | `buildHotelBrainContext`, `getShiftIntelligenceKnowledge`, `getRoomAttributeReminders`, guest-impacting supply filters, room capability matching | **Intelligence-adjacent** — knowledge retrieval & capability matching |
| `hotel-profile-knowledge.js` | Schema migration, policy shaping, profile completeness | Config / authoring — not shift reasoning |
| `js/hotel-brain-store.js` | Workspace isolation, empty profile, content checks | Data-access — OK |
| `hotel-profile.html` | Form collect, writing eligibility heuristics | Authoring UI — OK |

**Verdict:** Operational retrieval belongs **with or behind** the Intelligence Engine as a read-only knowledge provider. Profile editing must stay outside the engine.

---

### 2.4 AI Writing Engine (`ai-writing-engine.js`)

| Concern | Functions | Classification |
|---------|-----------|----------------|
| Fact extraction | `extractOperationalFact(s)`, field extractors, enrichment | **Shared intelligence (facts)** |
| Fact status | `classifyFactStatus`, `isFactClosed`, `isFactUnresolved` | **Shared intelligence** |
| Finance safeguards | `isActualFinancialIssue`, reservation/commercial guards | **Shared intelligence** |
| Same-source merge | `factIdentityKey`, `consolidateNotesByFacts`, … | **Shared intelligence** |
| Metrics / summary cards | `computeHandoverMetricsFromFacts`, `summarizeFromFacts`, `buildSummaryDetailCards` | Shared analysis (Handover-shaped today) |
| Prose rewrite / polish | `rewriteNote`, `renderOperationalFactDisplay`, Hotel Brain polish | **Writing/presentation** |

**Verdict:** This file is two products in one: (A) operational fact brain, (B) prose polisher. Architecturally, (A) should be treated as part of the Hospitality Intelligence stack (or a Fact Engine consumed only by it). (B) stays a writing service.

---

### 2.5 Shift Intelligence Engine (`shift-intelligence-engine.js`)

| Concern | Functions | Classification |
|---------|-----------|----------------|
| Neutral facts / adapters | `ensureNeutralFact`, handover/maintenance adapters, `analyzeFacts` | **Shared foundation** |
| Normalisation | room, priority, resolved, source identity | **Shared** |
| M4 filter / cross-dedupe | `filterMaintenanceIssuesForHandover`, `dedupeMaintenanceFactsAgainstHandover` | **Shared** (integration policy) |
| Signals | `buildSignals` | **Shared reasoning** |
| Recommendations | `recommendationFromFact`, `generateRecommendations` | **Shared reasoning** |
| Checklist | `CHECKLIST_DEFINITIONS`, `generateChecklist` | **Shared reasoning** (shift policy) |
| Brain consumption | triggered knowledge + room reminders via `HotelProfileOperational` | Correct pattern |
| Legacy text helpers | `isResolvedNote`, `maintenanceNeedsFollowUp`, VIP line detectors | Overlap with Writing/Handover |

**Verdict:** Correct intended home for reasoning. Still partly coupled to Handover note shapes via `neutralFactToAnalyzedNote` compatibility path.

---

## 3. Duplication map

### 3.1 Harmful or drift-prone duplication

| Concept | Locations | Risk |
|---------|-----------|------|
| **Resolved / closed detection** | Handover prose helpers; Writing `isFactClosed` / `classifyFactStatus`; Shift `isResolvedStatus` / `isResolvedNote` / `isFactClosedForRecs`; Maintenance `status !== completed` | Divergent “still open” answers across UI, metrics, recommendations |
| **Room normalisation** | Writing `extractRoomNumbers`; Shift `normalizeRoomNumber`; Hotel Brain `normalizeRoomNoKey` / `extractMentionedRooms`; Handover fallback extractor | Failed joins (M4 dedupe, room reminders, guest preference conflicts) |
| **Priority vocabularies** | Handover `Critical/High/Normal`; Maintenance `urgent/high/medium/low`; Engine recommendation `urgent/high/normal/low`; neutral `medium↔normal` | Ranking and badges disagree |
| **Quiet-shift detection** | Handover + Shift (near-duplicate) | One path suppresses recs; the other may not |
| **VIP / maintenance keyword detection** | Handover `detectVip`, `detectMaintenancePriority`; Shift `detectVip`, maintenance follow-up helpers; Writing subject extractors | Triple classification of the same sentence |
| **Hotel Brain context builder** | Canonical in `hotel-profile-operational.js`; full legacy copy still in `handover.html` fallback | Drift if one is edited |
| **Recommendation status normalisation** | Handover UI + Shift `normalizeRecommendation` | Mild |
| **Department fuzzy match** | Shift `resolveDepartment`; Maintenance raw strings; Brain department lists | Routing inconsistency |

### 3.2 Complementary (not true duplicates)

| Pair | Why OK |
|------|--------|
| Writing `consolidateNotesByFacts` vs Shift M4 `dedupeMaintenanceFactsAgainstHandover` | Same-source merge vs cross-module import dedupe |
| Maintenance `sortRank` vs Engine recommendation ranking | List UX vs operational action ranking |
| Writing rewrite vs Engine recommendation text | Display prose vs action guidance |
| Store workflow transitions vs Engine closure for recs | Ticket lifecycle vs “should we chase?” |

### 3.3 Duplicated classification pipelines

```text
Raw handover note
  ├─ Handover classifyAnalyzedNote / classifyLine  → section card
  ├─ AiWritingEngine extractOperationalFact        → subject/status/fact
  ├─ AiWritingEngine sectionFromFact               → section hint (partial)
  └─ Shift recommendationFromFact                  → action recommendation
```

Three interpretations of one note. They usually agree; when they disagree, staff see conflicting section vs recommendation vs summary.

---

## 4. Current data-flow (simplified)

```text
                    ┌─────────────────────┐
                    │ Hotel Brain profile │
                    └──────────┬──────────┘
                               │ buildHotelBrainContext
                               ▼
Handover notes ──► [Handover local classify/merge] ──► sections / metrics
        │                      │
        │                      ▼
        │              AiWritingEngine facts
        │                      │
        │                      ▼
        └──────────► ShiftIntelligenceEngine.analyze / analyzeFacts
                               ▲
Maintenance issues ── filter ──┘ (M4)
                               │
                               ▼
                         recommendations
```

**Problem:** Handover still reasons *before* the engine. The engine does not own the full pipeline; it receives a partially pre-reasoned world.

---

## 5. Proposed architecture — single Hospitality Intelligence Engine

### 5.1 Principle

```text
┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Handover   │   │ Maintenance  │   │ Hotel Brain  │   │ Guest (soon) │
│  raw notes   │   │   issues     │   │   profile    │   │  preferences │
│  snapshot    │   │   timeline   │   │   knowledge  │   │              │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                  │                  │
       ▼                  ▼                  ▼                  ▼
   Adapter            Adapter            Context             Adapter
       │                  │              Adapter                │
       └──────────────────┴──────────┬───┴────────────────────┘
                                     ▼
                    Hospitality Intelligence Engine
                    ┌─────────────────────────────┐
                    │ 1. Normalise facts/issues     │
                    │ 2. Classify / status / merge  │
                    │ 3. Cross-link (room/guest/…)  │
                    │ 4. Rank / conflict / patterns │
                    │ 5. Recommendations + reasons  │
                    │ 6. Optional checklist/signals │
                    └──────────────┬──────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
               Handover UI     Maintenance UI    Future tools
             (render only)    (render only)
```

**Writing Engine** becomes a **service used by the Intelligence Engine** (and by UI for polish), not a parallel reasoner called ad hoc from pages.

### 5.2 What the engine owns

1. Fact normalisation (neutral operational fact)
2. Status / resolved / uncertainty model
3. Classification into operational categories (not HTML section chrome)
4. Same-source and cross-source dedupe / merge policy
5. Signals, ranking, conflicts, recurring patterns (later)
6. Structured recommendations + `reasonCode` / `sourceFactIds`
7. Checklist policy derived from facts + Brain workflows
8. Room/guest linking helpers used for reasoning
9. Consumption of Hotel Brain context (never fetching storage itself)

### 5.3 What the engine does **not** own

- Auth, workspace resolution, RLS
- DB reads/writes
- HTML/CSS/PDF layout
- Form validation
- Maintenance ticket workflow transitions
- Hotel Brain profile editing
- Prose tone/terminology polish as a product feature (delegate to Writing service)

### 5.4 Module responsibilities after migration

| Module | Supplies | Must stop doing |
|--------|----------|-----------------|
| **Handover** | Raw notes, snapshot, shift/dept metadata; renders engine output | Local classify/priority/quiet-shift/legacy metrics; parallel recommendation rules |
| **Maintenance** | Issue + timeline records; inclusion flag | Any recommendation or fact-classification engine |
| **Hotel Brain** | Profile JSON via store; context adapter | Embedding operational tickets in profile JSON |
| **Writing service** | Extract/render/polish when asked by engine or UI | Being invoked as a second classifier from the page for “truth” |
| **Intelligence Engine** | All operational reasoning | Persistence, UI |

### 5.5 Adapter boundary (keep thin)

Plain functions (already started in 16B/M4):

- `factsFromHandoverNotes` / analyzed notes
- `factsFromMaintenanceIssues` + eligibility filter
- `buildHotelBrainContext(profile)` (already extracted)
- future `factsFromGuestRecords`

Adapters **map fields**. They do not decide recommendations.

### 5.6 Suggested internal engine packages (logical, not necessarily files yet)

1. **Facts** — extract (via Writing), normalise, identity, merge  
2. **Linking** — room / guest / department / date joins  
3. **Policy** — ranking, quiet shift, inclusion rules, checklist defs  
4. **Recommend** — `recommendationFromFact`, Brain actions, conflicts  
5. **Explain** — reason codes, sourceFactIds  

File naming can remain `shift-intelligence-engine.js` until a rename is product-justified; architecture does not require a rename.

---

## 6. Target pipeline (Handover example)

```text
notes + snapshot + shift
  → Handover adapter → NeutralFact[]
maintenance eligible issues
  → Maintenance adapter → NeutralFact[]
Hotel Brain profile
  → Context adapter → BrainContext

Engine.analyzeFacts({ facts, brainContext, snapshot, shift })
  → { facts, sections?, metrics, summaryModel, recommendations, checklist, conflicts? }

Handover renders sections / cards / recs
Writing polish applied only to display strings if needed
```

Section layout for the UI may remain a Handover presentation mapping (`urgent` card title, emoji) fed by engine category codes — presentation ≠ classification policy.

---

## 7. Migration path (architecture sequence)

| Step | Outcome |
|------|---------|
| **Done: 16B** | Neutral facts, adapters, `analyzeFacts`, context extraction |
| **Done: M4** | Maintenance facts merge into engine for Handover |
| **Done: E1** | Canonical contracts, enums, compatibility helpers, responsibility docs — **no behaviour change** |
| **Done: E2** | Shared canonical closure + metrics helpers; quiet-shift phrase + room normaliser shared; Brain fallback documented |
| **Done: E3** | Engine-owned operational classification + adapters; Handover/M4 parity fallback; Brain fallback retained |
| **Done: E4 Phase 1** | Canonical `OperationalContext` enrichment; scoring consumes context (single path) |
| **Done: E4 Phase 2** | DecisionTrace; context-driven recommendations; explainability; confidence gating |
| **Done: E4 Phase 3** | Cross-shift OperationalMemory (derive-only over saved history + maintenance IDs) |
| **Later** | Optional “Why?” UI; quiet-shift alignment; durable memory table if derivation limits are hit; Guest adapter |
| **Avoid** | Shared fact DB table until Guest Intelligence forces durable cross-tool history |

---

## 7A. E1 implementation record (contracts)

**Status:** Implemented in `shift-intelligence-engine.js` (alias `HospitalityIntelligenceEngine`).  
**Behaviour / DB:** No user-visible Handover or Maintenance changes. No migrations.

### Contracts introduced (JSDoc + runtime constants/helpers)

| Contract | Purpose |
|----------|---------|
| `OperationalFact` | Canonical fact shape (source, subject, status, priority, room/guest refs, action, evidence, related facts) |
| `IntelligenceInput` | Engine input (facts, brainContext, snapshot, shift, legacy classified compatibility) |
| `IntelligenceResult` | Engine output (signals, recommendations, checklist, facts) |
| `Recommendation` | Action item + optional `canonicalPriority`, `sourceFactIds`, `reasonCode` |
| `EntityReference` | Room / guest / department reference `{ type, id, label }` |
| `SourceReference` | `{ sourceType, sourceId, identity, workspaceId? }` |

### Canonical enums

- **Status:** `open` \| `in_progress` \| `resolved` \| `cancelled` \| `unknown`
- **Priority:** `critical` \| `high` \| `normal` \| `low`
- **Source types:** `handover` \| `maintenance` \| `hotel_brain` \| `guest` \| `manual` \| `system`

Legacy values are **not deleted**. Runtime still uses Phase 16B neutral priorities (`urgent`/`medium`) and module statuses via existing helpers.

### Compatibility helpers (additive)

- `toCanonicalStatus` / `toCanonicalPriority`
- `toLegacyRecommendationPriority` / `toLegacyNeutralPriority`
- `roomEntityReference` / `guestEntityReference` / `sourceReference`
- `adaptLegacyRecommendation` (no field loss)
- `toOperationalFactContract` (view over neutral facts)
- `describeEnginePipeline` / `ENGINE_PIPELINE`

### File locations

| File | Role |
|------|------|
| `shift-intelligence-engine.js` | Contracts, enums, helpers, pipeline docs; `HospitalityIntelligenceEngine` alias |
| `ai-writing-engine.js` | E1 responsibility comment (extraction/prose only) |
| `scripts/test-intelligence-e1-contracts.mjs` | E1 contract tests |
| `docs/HOSPITALITY_INTELLIGENCE_ENGINE_ARCHITECTURE.md` | This record |

### What remains legacy

- Handover `classifyAnalyzedNote` / section assignment
- Handover prose closure helpers and quiet-shift copy
- Writing `FACT_STATUS` (`done`/`confirmed`) as live fact statuses
- Maintenance store statuses (`completed`, `waiting_*`) as ticket vocabulary
- Recommendation ranking keys still `urgent`/`normal` (not `critical`/`medium`)
- Full Brain context fallback body still in `handover.html`

### What E2 should address

1. ~~Route Handover generate path to consume canonical status/priority helpers~~ → partial: shared closure + quiet phrase + room normaliser
2. ~~Consolidate closure: one `isClosed`~~ → **Done (E2):** `isOperationalFactClosed` / `getCanonicalStatus`
3. Remove or gate Handover Brain context fallback once tests lock parity → **Documented; fallback retained**
4. Do **not** yet move full section classification or add Guest Intelligence → still deferred to E3+

---

## 7B. E2 implementation record (lifecycle & normalisation)

**Status:** Implemented.  
**Behaviour / DB:** No intentional user-visible Handover/Maintenance output changes. No migrations.

### Shared lifecycle helpers

| Helper | Role |
|--------|------|
| `getCanonicalStatus(item)` | Status string / fact / issue → E1 canonical status |
| `isOperationalFactClosed(item)` | `resolved` \| `cancelled` (covers done/confirmed/completed) |
| `isOperationalFactOpen(item)` | Inverse; missing/unknown remain actionable |
| `filterOpenFacts` / `filterResolvedFacts` | Pure list filters |
| `countFactsByLifecycle` | Counts + `actionable` |
| `hasActionableOpenFacts` | Shared factual quiet/actionable check |
| `isQuietShiftPhraseLines` | Shared phrase quiet-shift (presentation input) |
| `evaluateQuietShiftState` | Phrase + factual result; **recommendation suppress still phrase-based** |

### Duplicate logic removed / delegated

| Former check | Now |
|--------------|-----|
| `isFactClosedForRecs` local done/confirmed | → `isOperationalFactClosed` |
| Writing `isFactClosed` / `isFactUnresolved` | → delegates to engine when loaded |
| Handover `isActiveNote` fact branch | → `isOperationalFactClosed` |
| Duplicate quiet-shift phrase bodies | → engine `isQuietShiftPhraseLines`; Handover delegates |
| Room token validation in Writing extract / Handover fallback | → `normalizeRoomNumber` when engine present |
| Neutral `isResolved` / M4 completed filter | → canonical closure helpers |

### Runtime paths migrated

- Shift Intelligence recommendations skip closed facts via shared helper
- `ensureNeutralFact` / handover & maintenance adapters set `isResolved` via shared helper
- M4 `filterMaintenanceIssuesForHandover` uses shared closure
- `buildSignals` exposes `quietShift` + `hasActionableOpenFacts` (suppress still phrase-compatible)

### Legacy paths intentionally retained

- Handover **prose** `isCompletedActionNote` / `isResolvedNote` (text heuristics for sectioning)
- Maintenance store workflow `status === "completed"` transitions (ticket lifecycle, not intelligence)
- Recommendation suppress on quiet shift remains **phrase-based** for parity (`suppressRecommendations`)
- Handover **Hotel Brain context inline fallback** when `HotelProfileOperational.buildHotelBrainContext` missing (documented; remove in E3+ once load guarantees exist)
- Full Handover `classifyAnalyzedNote` tree → **E3 retained** as section authority with parity

### Hotel Brain fallback status

- **Preferred:** `HotelProfileOperational.buildHotelBrainContext(profile)`
- **Fallback:** inline builder in `handover.html` if operational module export absent
- **E3 decision:** **Retained.** Shared builder loading is not guaranteed on every path; fallback tests and load guarantees not yet sufficient to delete. Knowledge retrieval remains separate from classification.

### Recommended E3 scope

~~1. Begin engine-owned category/section classification behind parity tests.~~ → **Done (E3)**  
~~2. Remove Handover Brain context fallback when safe.~~ → **Deferred** (retained; see above)  
3. Optionally align quiet-shift recommendation suppress with `!hasActionableOpenFacts` behind a flag + fixtures → still later  
4. Still no Guest Intelligence; no shared fact table; no new recommendation product rules → holds

---

## 7C. E3 implementation record (operational classification)

**Status:** Implemented.  
**Behaviour / DB:** No intentional user-visible Handover/Maintenance output changes. No migrations. No new recommendation rules. No Guest Intelligence.

### Canonical operational categories

| Category | Meaning (from current behaviour) | Typical Handover sections |
|----------|----------------------------------|---------------------------|
| `urgent` | Safety / critical / emergency | `urgent` |
| `guest` | VIP and guest follow-up | `vip`, `guest` |
| `maintenance` | Maintenance faults / M4 imports | `maintenance` |
| `payment` | Folio / balance / finance issues | `payments` |
| `task` | Outstanding tasks / HK / inventory / deliveries | `tasks`, `inventory`, `deliveries` |
| `information` | General ops, events, lost property, completed | `general`, `events`, `lostproperty`, `completed` |
| `unknown` | Unmapped values | (parity falls back to legacy section) |

Subjects remain flexible strings via `normalizeOperationalSubject`.

### Classification helpers

| Helper | Role |
|--------|------|
| `normalizeOperationalCategory` | Legacy section/subject aliases → canonical category |
| `normalizeOperationalSubject` | Stable subject token |
| `handoverSectionToCategory` / `categoryToHandoverSection` | Presentation adapters (preserve vip vs guest, inventory vs tasks) |
| `classifyOperationalFact` / `classifyOperationalFacts` | Engine classifier (structured facts; not UI wording) |
| `compareClassificationParity` | Legacy section vs engine category |
| `applyEngineClassificationToNote` | Attach metadata; **never change section on mismatch** |

Classification output includes: `category`, `subject`, `classificationSource`, `confidence` (only when already present), `sourceFactId`, `handoverSection`.

### Ownership / inventory (`CLASSIFICATION_INVENTORY`)

| Decision point | Status |
|----------------|--------|
| Handover `classifyAnalyzedNote` / `classifyLine` | **retained** — section assignment authority; parity-checked |
| Writing subject extraction / `sectionFromFact` | **delegated** — extraction + hints; engine classifies from subject |
| Writing summary topic | **presentation-only** |
| Shift `recommendationFromFact` subject routing | **retained** — no E3 rewrite; may consume category in a later phase |
| M4 maintenance import | **migrated** — `classifyOperationalFact`; section stays `maintenance` |
| Hotel Brain context | **presentation-only** — not operational classification |

### Runtime paths using engine classification

- Handover `classifyNotes`: after legacy `classifyAnalyzedNote`, calls `applyEngineClassificationToNote`
- M4 `integrateMaintenanceIssues`: stamps engine classification; section + imported badge unchanged
- Neutral adapters (`factsFromHandoverAnalyzedNotes`, `factsFromMaintenanceIssues`) stamp `metadata.classification`
- `toOperationalFactContract` exposes `classification`

### Legacy paths intentionally retained

- Full keyword/heuristic `classifyAnalyzedNote` tree (parity fallback)
- Writing extraction subjects (not final category authority)
- Recommendation subject/department routing (unchanged in E3)
- Handover Hotel Brain inline context fallback (see above)

### Parity strategy

1. Legacy assigns `note.section` (user-visible placement).
2. Engine classifies structured fact → canonical category.
3. If categories match (including vip↔guest, tasks↔inventory↔deliveries), attach `operationalCategory` / `operationalSubject`.
4. If mismatch: **keep legacy section**, set `operationalCategory` from legacy mapping, store `_classificationParity` for tests/diagnostics only (not shown to users).

### Known mismatches

None forced as product changes. Expected residual mismatches when keyword sectioning disagrees with Writing `fact.subject` (e.g. maintenance subject vs payments section) — **legacy wins** for rendered section.

### Recommended E4 scope (original)

Focus **only** on canonical **priority and risk scoring**:

1. Engine-owned `normalize` / `score` helpers for priority and risk using existing urgency/VIP/maintenance-priority signals.
2. Adapters from Handover/Maintenance/Writing priority fields; parity with current recommendation urgency labels.
3. Do **not** rewrite recommendation product rules, UI, or classification in E4.
4. Still no Guest Intelligence; no shared fact table; Brain fallback removal only when load guarantees + tests allow.

---

## 7D. E4 Phase 1 implementation record (Canonical Operational Context)

**Status:** Implemented.  
**Behaviour / DB:** No intentional user-visible Handover/Maintenance layout, Demo Mode, save/history/PDF, or payload changes. No migrations. No Guest Intelligence. No new modules.

### Purpose

Create one canonical **`OperationalContext`** object for every operational fact — the shared reasoning layer used later by AI Shift Handover, Guest Intelligence, Maintenance Intelligence, Hotel Brain operational memory, Analytics, and AI Search.

The engine decides what a fact means and why it matters. The writing layer only presents those decisions.

### Pipeline (ownership)

```text
Raw note
  → fact extraction          (AiWritingEngine)
  → classification           (E3 classifyOperationalFact)
  → entity linking/grouping  (operational objects)
  → OperationalContext       (E4.1 buildOperationalContext)  ← NEW
  → impact/risk scoring      (scoreOperationalImpact consumes context)
  → ranking
  → recommendations
  → writing                  (presentation only — must not invent context)
  → UI                       (must not calculate context)
```

`ENGINE_PIPELINE` includes `enrich_context` (wired). Ranking is documented as consuming OperationalContext.

### OperationalContext contract

| Field | Purpose | Controlled values |
|-------|---------|-------------------|
| `subject` | Normalised operational subject token | Existing subject vocabulary |
| `category` | E3 operational category | `OPERATIONAL_CATEGORY` |
| `guestImpact` | Is a guest currently / imminently affected? | `none\|low\|medium\|high\|critical` |
| `revenueImpact` | Balance, declined payment, leakage, compensation | `none\|low\|medium\|high\|critical` |
| `operationalRisk` | Combined operational exposure | `none\|low\|medium\|high\|critical` |
| `timeSensitivity` | Deadline pressure vs evidence | `none\|later\|today\|imminent\|overdue` |
| `urgency` | Comparable chase urgency | `low\|medium\|high\|critical` |
| `confidence` | Numeric certainty | `0–1` |
| `confidenceLabel` | Label form of confidence | `low\|medium\|high` |
| `departments` / `dependencies` | Departments that must act or be aware | Controlled names (`Reception`, `Housekeeping`, `Maintenance`, `Finance`, `Food & Beverage`, …) |
| `currentStatus` | Operational status for reasoning | `pending\|confirmed\|in_progress\|completed\|unresolved\|informational` |
| `nextAction` | Structured action code when evidence supports one | `NEXT_ACTION_KIND` or `""` |
| `reasoning` | Machine-readable reason codes | Stable codes (e.g. `guest_comfort_affected`, `declined_payment`) |
| `objectType` | Linked operational-object type | `OPERATIONAL_OBJECT_TYPE` |
| `canonicalPriority` | Derived E1 priority for consumers | `critical\|high\|normal\|low` |

Helpers: `buildOperationalContext(fact, supportingContext)`, `createEmptyOperationalContext()`, normalisers for impact / time / urgency / context status.

### Overlaps resolved (not duplicated)

| Existing field | Relationship to OperationalContext |
|----------------|--------------------------------------|
| Writing `guestImpact` | Input signal; context re-infers controlled `guestImpact` |
| E1 `CANONICAL_PRIORITY` / ranking scores | Scoring **consumes** context; numeric bands preserved |
| E1 `CANONICAL_STATUS` / Writing `confirmed`→resolved | **Distinct:** `CONTEXT_STATUS.confirmed` means arrangement confirmed; E2 closure still maps Writing `confirmed` → canonical `resolved` for chase skip |
| `department` / `ownerDept` | Single owner; context `departments[]` is multi-dept dependency list |
| `action` / `actionVerb` / recommendation `actionKind` | Presentation / rec routing; context `nextAction` is a structured code, empty when unsupported |
| Impact `reasons[]` | Aligned with context `reasoning` codes; score result attaches full `operationalContext` |
| E3 `category` / `confidence` | Reused; not re-owned by Writing or UI |

### Ranking integration

- Canonical fact-ranking path: `OperationalFact` → `buildOperationalContext` → `scoreFromOperationalContext` → `rankByOperationalImpact` / object grouping.
- `scoreOperationalImpact` is the sole public entry that builds context then scores.
- Existing numeric bands preserved (guest-impacting AC ≈ 10, high finance ≈ 20, VIP ≈ 30, …).
- No parallel legacy vs E4 scoring authorities for fact impact.
- Result includes `operationalContext` + `reasons` so the engine can explain rank.

### Confidence semantics

- `confidence` (0–1) measures **evidence quality**, not severity.
- `confidenceLabel` is always derived from the numeric value (`≥0.75` high, `≥0.45` medium, else low).
- Critical/high impact with thin evidence stays low confidence; confirmed low-risk items with clear room/status evidence can be high confidence.

### Compatibility fallback (not a second authority)

- `AiWritingEngine` `impactRank` / `briefingRank` still contain a local numeric fallback.
- That fallback runs **only** when `ShiftIntelligenceEngine.scoreOperationalImpact` is unavailable (script not loaded).
- Normal Handover / Demo Mode loads both engines, so execution uses the E4 context path.
- Recommendation list ordering by `PRIORITY_RANK` on recommendation.priority remains recommendation-list UX after generation — not a competing fact-impact scorer.

### Out of scope (E4 Phase 1)

- Cross-shift memory / persistence of OperationalContext
- Historical pattern recognition
- Guest Intelligence profiles
- Predictive maintenance
- Long-term Hotel Brain learning
- UI redesign / new modules / DB schema changes
- Rewriting recommendation product copy or section layout

### Files

| File | Role |
|------|------|
| `shift-intelligence-engine.js` | Contract, enums, `buildOperationalContext`, scoring integration, exports |
| `ai-writing-engine.js` | Responsibility comment only — must not calculate OperationalContext |
| `scripts/test-intelligence-e4-operational-context.mjs` | E4.1 fixtures (Scenarios A–F + ownership + ranking) |
| `docs/HOSPITALITY_INTELLIGENCE_ENGINE_ARCHITECTURE.md` | This record |

### Recommended E4 Phase 2 (completed — see §7E)

1. ~~Surface selected OperationalContext fields into recommendation `reasonCode` / explainability~~ → **Done (E4.2)**
2. ~~Route `recommendationFromFact` department/priority from context~~ → **Done (E4.2)**
3. Optional quiet-shift suppress alignment with actionable open facts → still later
4. Still no Guest Intelligence module; no cross-shift memory; no shared fact table → holds

---

## 7E. E4 Phase 2 implementation record (Explainability & context-driven recommendations)

**Status:** Implemented.  
**Behaviour / DB:** No UI redesign. No migrations. No Guest Intelligence. No cross-shift memory. DecisionTrace is runtime-only (not persisted).

### Purpose

Make `OperationalContext` the authority behind recommendation generation, reason codes, priority explanations, and briefing/status/alert severity — so every important decision is explainable and traceable.

### DecisionTrace contract

| Field | Purpose |
|-------|---------|
| `sourceFactId` / `sourceFactIds` | Traceability to source facts / object members |
| `objectType` | Operational object type |
| `operationalContext` | Full E4.1 context snapshot |
| `score` | Impact score from `scoreFromOperationalContext` |
| `priority` | Legacy recommendation priority (`urgent\|high\|normal\|low`) |
| `recommendationKind` / `nextAction` | Structured action code |
| `reasonCodes` | Stable codes from context (no prose) |
| `evidence` | Structured entities only (room, status, amount, timing, departments) |
| `confidence` | Evidence-quality numeric 0–1 |
| `supportingKnowledge` | Optional Hotel Brain enrichment links (source, knowledgeType, matchedSubject, matchReason) — not a competing authority |

Helpers: `buildDecisionTrace`, `buildDecisionExplanation`, `reasonCodesFromContext`, `allowsOpenRecommendation`, `enrichRecommendationsWithHotelBrain`.

`buildDecisionExplanation(trace)` returns structured explainability (`priority`, `reasonCodes`, `evidence`, `confidence`, impacts, departments, `supportingKnowledge`) — **no HTML, no polished prose**.

### Recommendation generation path

```text
Current operational evidence
  → OperationalFact / OperationalObject
  → OperationalContext (+ DecisionTrace)
  → recommendation candidate (fact/object only)
  → Hotel Brain enrichment where specifically matched (optional)
  → normalizeRecommendation
```

Hotel Brain is **supporting operational context**, not a recommendation authority:

- Current operational evidence remains mandatory for normal shift recommendations.
- Hotel Brain may enrich, constrain, or explain an existing fact/object recommendation when the match is specific and defensible (same room / guest / policy subject / operational action / payment|maintenance|request family).
- Hotel Brain **cannot** create standalone normal Handover/Demo recommendations (`addCandidate` from matchedActions / room reminders is removed).
- Unmatched knowledge is **ignored** by this phase (not added to recommendations, briefing, status, or alerts).
- Future proactive “Hotel Brain reminders” product surface is **out of scope** for E4 Phase 2.
- Priority and confidence remain engine-owned; enrichment may only add `hotel_brain_enrichment` reason code + `supportingKnowledge` entries.

Subject/category shortcuts no longer decide *whether* to recommend when context exists. They may still shape **wording** after the context gate passes.

### Confidence gating

| Confidence | Gate |
|------------|------|
| `≥ 0.75` (high) | Normal open recommendation when `nextAction` set |
| `≥ 0.45` (medium) | Cautious recommendation only when `nextAction` is explicit |
| `< 0.45` (low) | No strong recommendation; retain informational/uncertain |
| `nextAction` empty | No recommendation (even if high confidence) |
| `completed` / `confirmed` | No open chase recommendation |
| `weak_evidence` | No strong recommendation |

Confidence remains **evidence quality**, not severity.

### Briefing / status / alert integration

- `buildPriorityActionSpec` attaches `decisionTrace` + prefers `context.nextAction`.
- `statusLevelFromObjects` / `computeShiftAlertsFromObjects` prefer context impact/status fields; do not independently re-decide importance when context is present.
- Writing still formats briefing prose from engine specs — must not re-rank or invent reasons.

### Writing-layer boundaries

| Writing may | Writing must not |
|-------------|------------------|
| Format action wording | Add reason codes |
| Format reason codes into language | Change priority / confidence |
| Combine room/name/time/amount | Invent nextAction |
| Apply grammar/tone | Infer departments / decide that something matters |

### Documented fallbacks

| Fallback | When |
|----------|------|
| `legacyRecommendationFromSubject` wording | Context allows open rec; used for text shape only |
| `recommendationTextFromNextAction` | Subject wording returned null |
| Writing `impactRank` / `briefingRank` local scores | Engine script not loaded (unchanged from E4.1) |

**Removed (E4.2 hard-gate):** standalone Hotel Brain `matchedActions` / `getRoomAttributeReminders` → `addCandidate` on the normal Handover/Demo recommendation path. No compatibility fallback remains for that injection. Hotel Brain retrieval outside recommendation generation (checklist / profile / VIP-rules text enrichment on an existing fact path) is unchanged.

### Out of scope (E4 Phase 2)

- Guest Intelligence
- Cross-shift memory / historical patterns
- Predictive maintenance
- Database persistence of DecisionTrace
- User-facing “Why?” UI
- Quiet-shift suppress realignment
- Proactive Hotel Brain reminders surface (unmatched knowledge ignored for now)

### Files

| File | Role |
|------|------|
| `shift-intelligence-engine.js` | DecisionTrace, gating, context-driven recs, Brain enrich-only, briefing/status/alert parity |
| `ai-writing-engine.js` | Ownership comments (no reasoning ownership) |
| `hotel-profile-operational.js` | Brain retrieval (unchanged; enrich-only consumer in engine) |
| `scripts/test-intelligence-e4-decision-trace.mjs` | E4.2 fixtures (Scenarios A–G + Brain hard-gate) |
| `docs/HOSPITALITY_INTELLIGENCE_ENGINE_ARCHITECTURE.md` | This record |

### Recommended follow-ons (post E4.3)

1. Optional user-facing “Why did HF prioritise this?” using `buildDecisionExplanation` (presentation only).
2. Quiet-shift suppress alignment with `!hasActionableOpenFacts` behind fixtures.
3. Optional separate “Hotel Brain reminders” product surface (not mixed into E4 recommendations).
4. Durable OperationalMemory table only if derivation from `handover_reports` proves insufficient — schema proposal required before apply.
5. Still no Guest Intelligence; no weekly/monthly pattern recognition; no automatic Hotel Brain learning.

---

## 7F. E4 Phase 3 — Cross-shift Operational Memory

**Status:** Implemented (derive-only v1).  
**Behaviour:** Continuity enrichment on recommendations / DecisionTrace when prior-shift evidence is supplied. No UI redesign. No production schema change applied. No Guest Intelligence.

### Audit summary (existing continuity data)

| Source | Available across shifts? | Notes |
|--------|--------------------------|-------|
| `handover_reports` (`source_notes`, `generated_handover`) | Yes — workspace-scoped documents | Re-extract facts from notes; not a fact registry |
| Maintenance `maintenance_issues.id` + `maintenance_updates` | Yes — durable ticket UUID | Strongest continuity key when imported |
| Runtime `OperationalFact` / object ids / DecisionTrace | No — one generation | Content-derived / generation-local |
| Demo Mode saved history | No public archive | Isolated in-memory sample prior history for memory only |

### Storage approach selected

**A + B (preferred):** Read-only derivation over existing saved handover history + maintenance issue IDs.  
**C (not applied):** New persistence table — **not required for v1**. Schema proposal deferred until derivation limits are proven.

Caller supplies `priorShiftHistory` (or pre-extracted `priorShiftEvidence`). Engine never uses service-role browser reads. Workspace mismatch / missing workspaceId drops history entries.

### Phase 3 v1 history window and limits

| Limit | Value | Purpose |
|-------|-------|---------|
| Max prior reports | 6 | Bound retrieval / generation |
| Lookback | 72 hours (~3 calendar days) | Prevent months-later false continuity |
| Evidence / report | 40 | Cap re-extraction |
| Evidence total | 120 | Cap matching work |
| Content-match gap | 72 hours | Same-room faults after a long gap start new (unless durable maintenance ID in window) |
| Ordering | `handoverDate` → AM→PM→Night → `created_at` tie-break | Not `updated_at` (late edits) |
| shiftCount | Distinct operational shift keys (`date\|shift`) + current | Not duplicate notes / multi-fact components |

Drafts, empty `source_notes`, organised-only snapshots, foreign workspace rows, and the report currently being edited are excluded. Matching uses a room/family/maintenance index (not unbounded O(all×all)).

### OperationalMemory contract

Serializable, engine-owned, no polished prose / HTML:

| Field | Purpose |
|-------|---------|
| `memoryId` | Deterministic id from workspace + entity keys |
| `workspaceId` | Tenant scope |
| `entityKeys` | room, guest, family, amount, faultType, maintenanceIssueId |
| `subject` / `category` | From current OperationalContext |
| `firstSeenAt` / `lastSeenAt` | Continuity window |
| `shiftCount` | Distinct prior reports + current |
| `sourceReportIds` / `sourceFactIds` | Traceability |
| `lifecycleStatus` | `new` \| `continuing` \| `escalated` \| `resolved` \| `reopened` \| `uncertain` |
| `recurrenceState` | Phase 3: `first_seen` \| `repeated_cross_shift` only |
| `latestContext` | **Current** OperationalContext (owns impact/risk) |
| `continuityReasonCodes` | Why records were linked |
| `confidence` | Match confidence 0–1 |

### Matching authority

Strong evidence required. Broad keywords alone never create continuity.

Allowed examples: same maintenance issue ID; same room + operational family (+ fault compatible); same payment room/amount; same guest + VIP/request family; same timed service + room; explicit continuation language **with** entity match.

Rejected: different rooms same family; generic “supplier delayed” without entity; weak family-only overlap → `uncertain` / separate.

### Enrichment pipeline

```text
Current notes → Fact/Object → OperationalContext
  → retrieve prior-shift evidence (caller-supplied, workspace-filtered)
  → match continuity → OperationalMemory
  → enrich DecisionTrace.memory
  → optional safe escalation → recommend / write
```

One active issue → one current recommendation (history does not spawn duplicates).

### Escalation rules

- Open across ≥3 shifts **and** strong match (≥0.75) **and** meaningful current guest/revenue/operational impact → may mark `escalated` and raise priority one step.
- Never escalate from text repetition alone.
- Resolved history reduces urgency (no open rec) unless `reopened`.

### DecisionTrace integration

```text
decisionTrace.memory = {
  memoryId, lifecycleStatus, shiftCount,
  firstSeenAt, lastSeenAt, continuityReasonCodes,
  recurrenceState, confidence
}
```

### Demo isolation

- `HFDemoSampleData.buildPriorShiftHistory` + `HFDemoMode.getDemoPriorShiftHistory`
- No production/test workspace reads while Demo enabled (`getSavedHandovers` already returns `[]`)
- Reset restores sample memory; exit clears Demo memory pack
- Same engine memory logic; separate persistence source (`memorySource: "demo"`)

### Security

- History filtered by `workspaceId`
- Reuses existing RLS on `handover_reports` / maintenance (membership + active platform access)
- No anonymous / cross-hotel / suspended-access reads introduced
- No service-role history reads in the browser

### Out of scope (E4 Phase 3)

- Guest Intelligence profiles / long-term preferences
- Weekly/monthly pattern recognition / seasonal learning
- Predictive maintenance
- Automatic Hotel Brain learning
- User-facing memory timeline redesign
- Applied DB migration for a memory table

### Files

| File | Role |
|------|------|
| `shift-intelligence-engine.js` | OperationalMemory contract, matching, enrichment, escalation |
| `handover.html` | Passes workspace-scoped prior history into analyze (no UI redesign) |
| `js/demo-sample-data.js` / `js/demo-mode.js` | Isolated Demo prior history |
| `scripts/test-intelligence-e4-operational-memory.mjs` | Scenarios A–H + tenancy/Demo proofs |
| `docs/HOSPITALITY_INTELLIGENCE_ENGINE_ARCHITECTURE.md` | This record |

---

## 8. Complexity assessment

| Issue | Severity |
|-------|----------|
| Reasoning inside `handover.html` | **High** — blocks Guest Intelligence and consistent M4+ behaviour |
| Triple status/closure models | **High** — silent product bugs |
| Dual Brain context builders | **Medium** — fallback drift |
| Writing Engine dual role (facts + prose) | **Medium** — conceptual; manageable with clear API split |
| Maintenance store ranking | **Low** — fine if adapter maps into engine |
| Global `window.*` modules | **Low** for boutique v1 |

---

## 9. Alignment with four pillars

| Pillar | Role in proposed architecture |
|--------|-------------------------------|
| Hotel Brain | Durable knowledge → context adapter |
| AI Shift Handover | Event capture + presentation of engine output |
| Maintenance | Durable operational issues → fact adapter |
| Guest Intelligence | Future preference/history → fact adapter |

One engine connects them. No pillar grows a private intelligence stack.

---

## 10. Recommendations (architecture only)

1. **Treat `ShiftIntelligenceEngine` as the sole reasoning entry point** for operational recommendations, conflicts, and cross-module ranking.  
2. **Treat `AiWritingEngine` fact APIs as the fact substrate** of that engine (internally), not as a page-level second brain.  
3. **Shrink `handover.html` to orchestration + rendering**; migrate classification, closure, quiet-shift, and legacy metrics into the engine.  
4. **Keep Maintenance workflow logic in the store**; keep feeding the engine only via adapters.  
5. **Keep Hotel Brain retrieval in operational module**, invoked only from the engine (or context adapter), not reimplemented per tool.  
6. **Do not add a second engine file or shared fact table** until a second consumer beyond Handover+Maintenance+Brain truly requires it.  
7. **Measure success** when: changing a closure/priority/room rule in one place updates Handover sections, metrics, M4 import dedupe, and recommendations together.

---

## 11. One-page target contract

```text
HospitalityIntelligence.analyze({
  facts: NeutralFact[],          // from adapters only
  brainContext: BrainContext,    // from HotelBrainContextAdapter
  snapshot?: HotelSnapshot,
  shift?: { code, displayName },
  departments?: string[],
  options?: { maxRecommendations, locale }
}) → {
  facts: NeutralFact[],          // normalised, possibly merged
  signals: SignalMap,
  recommendations: Recommendation[],  // + sourceFactIds, reasonCode
  checklist: ChecklistItem[],
  conflicts?: Conflict[],        // future
  metrics?: MetricsModel         // optional shared metrics
}
```

Modules never call `recommendationFromFact`, `classifyFactStatus`, or Brain trigger matching directly once migration completes — only the engine does.

---

*End of architectural report.*
