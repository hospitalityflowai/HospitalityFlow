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
| **E2 (next)** | Engine-owned classification / single closure path used by Handover callers; remove duplicate quiet-shift; start deleting Handover legacy fallbacks behind flags |
| **Later** | Single room helper everywhere; conflicts / recurrence; Guest adapter |
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

1. Route Handover generate path to consume canonical status/priority helpers for **new** shared metrics without changing card copy until parity tests pass.
2. Consolidate closure: one `isClosed` used by recommendations + metrics (Writing + engine).
3. Remove or gate Handover duplicate quiet-shift / Brain context fallback once tests lock parity.
4. Do **not** yet move full section classification or add Guest Intelligence.

### Confirmation

- No behaviour change intended or required for E1 acceptance.
- No database migrations.
- No UI redesign.
- No new recommendation rules.

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
