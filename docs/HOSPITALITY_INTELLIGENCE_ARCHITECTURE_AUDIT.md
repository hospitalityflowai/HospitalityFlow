# Hospitality Flow — Phase 16A: Intelligence Architecture Audit

**Phase:** 16A — Investigation and architecture report only  
**Date:** 28 July 2026  
**Status:** Audit complete — no production code, renames, migrations, commits, or deploys in this phase

---

## 1. Executive verdict

**Hospitality Flow is on track toward one reusable intelligence layer, but the reusable core is still wrapped in a Handover-shaped pipeline.**

What already exists and is genuinely reusable:

- `AiWritingEngine` — structured operational fact extraction, status classification, safe fact-driven display, and prose polishing
- `ShiftIntelligenceEngine` — rule-based recommendations and checklists from facts + Hotel Brain context
- `HotelProfileOperational` — trigger-based operational knowledge retrieval and room-capability reminders
- Workspace-scoped stores with sound RLS boundaries

What is not yet shared:

- Hotel Brain context construction lives inside `handover.html`
- Engine input still assumes Handover’s `_analyzed` note shape and section IDs
- Maintenance has durable issues and an `include_in_handover` flag, but no consumer in Handover or the intelligence engine
- Structured facts are transient; saved handovers store display prose and recommendation state, not canonical facts
- Guest Intelligence does not exist yet

**Danger level:** Not dangerously complicated today. The main risk is *directional* — if Maintenance or Guest Intelligence grow their own recommendation/extraction engines before M4, the product will fragment. The safest move is a small shared foundation, then real Maintenance ↔ Handover integration (M4), then deeper engine work.

**Recommended engine strategy:** Option A — gradually expand `shift-intelligence-engine.js` behind a neutral input contract and thin adapters. Do not rename it. Do not create a parallel `hospitality-intelligence-engine.js` yet.

**Recommended roadmap order:** Option C — small shared foundation → M4 → Intelligence Engine v1 hardening → Guest Intelligence → Hotel Brain v2.

---

## 2. Current architecture map

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                         Workspace / tenancy                              │
│  HFWorkspace · HFTenantStorage · hotel_members RLS                       │
└──────────────────────────────────────────────────────────────────────────┘
         │                         │                         │
         ▼                         ▼                         ▼
┌─────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│  Hotel Brain    │    │  AI Shift Handover  │    │  Maintenance        │
│  profile_data   │    │  notes → facts →    │    │  issues + timeline  │
│  (durable JSON) │    │  sections → recs    │    │  include_in_handover│
└────────┬────────┘    └──────────┬──────────┘    └──────────┬──────────┘
         │                        │                          │
         │   buildHotelBrainContext (handover.html only)     │
         └───────────────► ShiftIntelligenceEngine ◄─────────┘
                              ▲                    (not wired)
                              │
                    AiWritingEngine facts
                    HotelProfileOperational
```

### Four-pillar status

| Pillar | Status | Intelligence role today |
|--------|--------|-------------------------|
| Hotel Brain | Live | Durable knowledge; consumed mainly by Handover |
| AI Shift Handover | Live | Primary intelligence consumer and orchestrator |
| Maintenance | Live (Phase 15) | Structured operational history; intelligence unused |
| Guest Intelligence | Not started | No schemas, stores, or adapters |

---

## 3. Existing intelligence components

| Component | Classification | Why |
|-----------|----------------|-----|
| `shift-intelligence-engine.js` | **A. Shared intelligence** (with Handover-shaped input) | Rule-based recommendations/checklist; intended reusable boundary; still expects `_analyzed` notes and Handover section semantics |
| `ai-writing-engine.js` (fact extraction / status / consolidate / metrics) | **A. Shared intelligence** | Canonical `OperationalFact` model; status classification; identity/merge; fact-driven metrics |
| `ai-writing-engine.js` (rewrite / polish / summarize / summary cards) | **C. Writing/presentation** | Prose and card wording; Hotel Brain–aware via options, not data access |
| Handover note parsing / section classification in `handover.html` | **B. Module-specific business logic** | Section grouping, VIP/maintenance priority heuristics, carried-over urgency — presentation and handover workflow |
| `buildHotelBrainContext` in `handover.html` | **E. Legacy / misplaced shared logic** | Architecturally shared context builder trapped in one page |
| `HotelProfileOperational.getShiftIntelligenceKnowledge` / `getRoomAttributeReminders` | **A. Shared intelligence** | Conservative trigger matching; room capability reminders; already engine-facing |
| `hotel-profile-knowledge.js` | **C. Writing/presentation** + config | Profile editing, migration, polish helpers — not runtime reasoning |
| `js/hotel-brain-store.js` | **D. Data-access** | Load/save/cache profile; no context builder |
| `js/handover-store.js` | **D. Data-access** | Persist reports/drafts; display-oriented payloads |
| `js/maintenance-store.js` | **D. Data-access** + **B. Module-specific** | Issue lifecycle, timeline, metrics, handover flag — no recommendation engine |
| Maintenance UI status/timeline rendering | **B. Module-specific** | Workflow UI, not intelligence |
| `HandoverRecommendationEngine` (deprecated wrapper) | **E. Legacy** | Compatibility shim only |

---

## 4. Data-flow diagrams

### 4.1 AI Shift Handover

```text
Input (notes + metadata + optional snapshot)
  → parseNotes / splitSourceIntoFactSegments
  → analyzeNote
  → AiWritingEngine.extractOperationalFact
  → classifyAnalyzedNote / classifyLine (section assignment)
  → consolidateNotesByFacts
  → rewriteNoteForDisplay (fact-first, then templates)
  → generateSummary / metrics / detail cards
  → buildHotelBrainContext(profile)
  → buildIntelligenceInput → ShiftIntelligenceEngine.analyze
  → render sections + recommendations
  → draft/save (HFHandoverStore) / print (HandoverReport) / PDF (HandoverPdfExporter)
```

| Stage | Where structured facts are created/transformed | Where recommendations appear | Raw prose still used |
|-------|-----------------------------------------------|------------------------------|----------------------|
| Parse / extract | `analyzeNote` + `extractOperationalFact` | — | Source notes preserved as `original` / `sourceText` |
| Classify | Section heuristics refine presentation; facts refine some sections | — | — |
| Rewrite / summary | Fact display preferred; legacy rewrite fallback | — | Summary and display text are prose snapshots |
| Intelligence | Facts + Brain context | `recommendationFromFact`, Brain actions, room reminders | Recommendation `text` is generated prose |
| Storage | Facts **not** first-class; may survive only if embedded in display items | `recommendation_state` persisted | `source_notes`, `aiSummary`, organised section text |

**Hotel Brain consumption:** loaded via `HFHotelBrainStore`; context built in `handover.html`; used for preferences, departments, operational knowledge triggers, room reminders, and intelligence input.

**Maintenance consumption:** none. Free-text maintenance notes are classified locally; no `HFMaintenanceStore` import.

### 4.2 Maintenance

```text
Report form
  → validateCreatePayload
  → createIssue (+ timeline `created`)
  → cache + list/metrics UI
  → updates (status/priority/assignment/due/complete/reopen/handover flag)
  → maintenance_updates timeline
```

| Concern | Behaviour today |
|---------|-----------------|
| Intelligence | None — no fact extraction, recommendations, recurring detection, or room capability matching |
| Handover flag | Persisted + timeline-audited; UI states it does not appear in a handover yet |
| Hotel Brain | Departments only |
| Storage | Durable normalised rows (`maintenance_issues` + `maintenance_updates`) |

### 4.3 Hotel Brain

```text
Profile form / knowledge cards
  → collectProfileData
  → HFHotelBrainStore.save → hotel_brain_profiles.profile_data
  → later: HFHotelBrainStore.load
  → consumers build their own context
       └─ Handover: buildHotelBrainContext (only broad consumer)
       └─ Maintenance: department names
       └─ Profile page: restore/edit/polish
```

---

## 5. Reusable versus module-specific logic

### Should become shared (when needed)

| Capability | Current home | Target |
|------------|--------------|--------|
| Operational fact extraction / status / identity | `ai-writing-engine.js` | Keep shared; add provenance fields later |
| Recommendation / conflict / ranking rules | `shift-intelligence-engine.js` | Expand in place |
| Hotel Brain runtime context builder | `handover.html` | Extract to shared helper (not a new “engine”) |
| Operational knowledge / room reminders | `hotel-profile-operational.js` | Keep shared |
| Room-number normalisation | Split across parsers / stores | Shared tiny helper when M4 needs matching |
| Priority vocabulary mapping | Three incompatible scales | Shared mapper for adapters |

### Should remain module-specific

| Capability | Why |
|------------|-----|
| Handover section cards, PDF/print styling, draft UX | Presentation and workflow |
| Maintenance issue form, timeline drawer, completion rules | Domain workflow |
| Hotel Brain profile editing / migrations / sample data | Configuration UI |
| Store CRUD, auth, workspace resolution | Data-access / tenancy |
| `include_in_handover` UX and timeline event types | Maintenance product rule |
| Summary-card layout and at-a-glance UI | Handover presentation |

### Plain functions vs heavy abstraction

Prefer **plain adapter functions** (e.g. `factsFromHandoverNotes`, `factsFromMaintenanceIssues`) over class hierarchies or premature `*Adapter` frameworks. Interfaces in this document are design contracts, not required OOP.

---

## 6. Duplication and coupling findings

| Concept | Files | Harmful now? | Urgency | Early centralisation risk |
|---------|-------|--------------|---------|---------------------------|
| Priority scales (`urgent/high/normal/low` vs `medium` vs `Critical/High/Normal`) | `shift-intelligence-engine.js`, `maintenance-store.js`, `handover.html` | Mild — breaks clean cross-module ranking | Useful for M4 | Low if only a mapper is added |
| Room normalisation | Handover parser; `hotel-profile-operational.js` `normalizeRoomNoKey`; Maintenance free-text `room_number` | Mild — blocks reliable room joins | Useful for M4 | Low |
| Unresolved / completed detection | Fact closed statuses vs Maintenance `status !== completed` | Mild semantic drift | Useful for M4 | Medium if forced into one enum too early |
| Department matching | Handover / engine fuzzy match; Maintenance raw string; Brain departments | Mild | Defer beyond mapper | Low |
| Date/time parsing | Handover string dates; Maintenance ISO due dates; report SQL date | Low for now | Safe to defer | Medium (timezone traps) |
| Recommendation wording | Engine fact rules + Brain actions | Intentional, contained | Defer | High if moved into LLM early |
| Hotel Brain lookups | Operational retrieval shared; context builder not | Context builder duplication risk | Extract before Guest Intelligence | Low if extracted carefully with tests |
| Recurring issue detection | Absent | Gap, not duplication | Defer to after M4 history exists | N/A |
| Guest-impact detection | Heuristics in Handover / supplies; absent in Maintenance | Gap | Important before Guest Intelligence | Medium |
| Handover inclusion rules | Maintenance only; no consumer | Intent without effect | M4 | Low |
| Timeline interpretation | Maintenance-only | Not duplicated | Remain module-specific | Unnecessary |

**Coupling summary:** `ShiftIntelligenceEngine` does not import `handover.html`, but its productive path depends on Handover-built `classified._analyzed`, section IDs, and `maintenancePriority`. That is the primary architectural coupling to loosen — by input contract, not by renaming files.

---

## 7. Fact-model comparison

### 7.1 Handover / AiWritingEngine `OperationalFact`

```text
{
  sourceText, sourceTexts, sourceHistory,
  rooms[], subject, status,
  ownerDept, ownerName, actionVerb, actionTarget,
  details[{ type, value }], sectionHint,
  guestName, arrivalDate, preferredLocation,
  confirmationStatus, paymentMethod, package,
  guarantee, guestType, category, uncertainty
}
```

| Aspect | Current state |
|--------|---------------|
| Status model | `open \| requested \| confirmed \| in_progress \| done \| unknown` |
| Source preservation | Strong (`sourceText` / `sourceTexts` / `sourceHistory`) |
| Room / guest refs | Rooms array; guest name string; no guest ID |
| Ownership / action | `ownerDept`, `ownerName`, `actionVerb`, `actionTarget` |
| Timestamps | Not first-class on the fact |
| Confidence | `uncertainty` boolean only |
| Identity / dedupe | `factIdentityKey` / `factMergeFamilyKey` / consolidate |
| Persistence | Transient — not a first-class column on `handover_reports` |

### 7.2 Maintenance issue / update

```text
Issue: id, workspaceId, title, description, roomNumber, area, locationType,
       category, priority, status, reportedByName, assignedDepartment,
       dueAt, completedAt, resolutionNotes, includeInHandover, timestamps

Update: id, issueId, workspaceId, updateType, note,
        previous/new status & priority, createdBy, createdAt
```

Richer durable lifecycle than handover facts; weaker semantic action/subject model; no guest linkage; no recurring marker; no shared fact ID.

### 7.3 Shared fact model answers

| Question | Recommendation |
|----------|----------------|
| Can both contribute to a shared fact model? | **Yes** — at the intelligence input boundary |
| Convert Maintenance rows to shared facts at runtime? | **Yes** — preferred for M4 / Intelligence v1 |
| Copy into another table? | **No** for the next 6–12 months |
| Shared fact table now? | **No** — unnecessary complexity while only Handover consumes facts |
| Would a new shared table create complexity? | **Yes** — sync, staleness, dual writes, migration risk |

**Simplest safe recommendation:** keep module stores as source of truth; adapters produce normalised facts/issues at runtime for the engine; persist recommendations only where a product already does (handover report state). Revisit a shared fact table only when Guest Intelligence needs durable cross-module history that runtime joins cannot provide.

---

## 8. Hotel Brain boundary

| Layer | Role | Correct contents |
|-------|------|------------------|
| **Hotel Brain** | Durable hotel knowledge and memory | Rooms, facilities, departments, shifts, policies, terminology, AI prefs, operational knowledge entries/workflows, standards |
| **Operational tools** | Events, issues, guest history, shift activity | Handover reports, maintenance issues/timelines, future guest records |
| **Intelligence Engine** | Reasoning across current + historical facts | Ranking, conflicts, patterns, structured recommendations, uncertainty preservation |

### Does current implementation follow this?

**Mostly yes.**

- Maintenance issues are correctly **not** written into Hotel Brain JSON.
- Handover operational activity is stored in `handover_reports`, not Brain.
- `operationalKnowledge` in Brain holds knowledge entries, workflows, and sample registries — configuration and guidance, not live tickets.
- Slots like `handoverSources` / `dailyMetrics` exist in the Brain schema shape; they should remain configuration/aggregates if used, not a dump of every operational event.

**Gap:** Brain context freshness depends on page load/cache; there is no shared invalidation contract across tools. Stale Brain context can affect recommendations until reload — classify as Important before Guest Intelligence, not Blocking.

---

## 9. Recommended engine boundary

### Should do

- Accept normalised facts/issues from multiple modules
- Connect by room, guest (when available), department, date, and source identity
- Rank operational importance
- Detect conflicts (explainable, not only silent suppression)
- Detect recurring patterns once enough durable history exists
- Generate structured recommendations with reasons
- Preserve uncertainty; omit rather than invent
- Consume Hotel Brain context as read-only knowledge

### Should not do

- Direct database writes
- Authentication / workspace resolution
- HTML rendering / PDF styling
- Form validation
- Storage / draft persistence
- User-facing prose polishing (keep in `AiWritingEngine`)

### Engine option choice

| Option | Verdict |
|--------|---------|
| **A. Expand `shift-intelligence-engine.js` gradually** | **Chosen** |
| B. Create `hospitality-intelligence-engine.js` + compatibility adapter | Rejected for now — rename/churn without behaviour gain; Phase 16A forbids rename |
| C. Keep separate engines until Guest Intelligence | Rejected — M4 would invent a second brain |
| D. Other | Partial: extract context builder as a helper, not a second engine |

**Justification:** The file already declares itself as the reusable layer between Hotel Brain and operational tools. Tests and callers already depend on it. Expanding its input contract and adding adapters is lower risk than introducing a parallel engine. Rename only if/when Guest Intelligence forces a product rename — not as an architecture prerequisite.

---

## 10. Recommended adapter design

Use plain functions in a small shared module later (or colocated helpers). Names below are contracts, not mandated classes.

### HandoverFactAdapter

| Field | Spec |
|-------|------|
| Input | Analyzed notes / raw notes + optional pre-extracted facts |
| Output | `NormalisedFact[]` |
| Key fields | Map existing `OperationalFact` + `sourceModule: "handover"`, `sourceEntityId` (note/item id if available), rooms, status, subject, action, uncertainty, sourceTexts |
| Workspace | Caller supplies; adapter does not resolve auth |
| Freshness | Generated at analyze time from current notes |
| Confidence | Pass through `uncertainty`; no invented confidence scores |
| Persist? | Runtime only (continue current handover save model) |

### MaintenanceFactAdapter

| Field | Spec |
|-------|------|
| Input | Issues where `includeInHandover === true` and status unresolved (product rule for M4) |
| Output | `NormalisedFact[]` or `NormalisedIssue[]` |
| Key fields | `sourceModule: "maintenance"`, `sourceEntityId: issue.id`, room/area, priority mapped, status mapped, department, title/description as sourceText, dueAt, updatedAt |
| Workspace | Issues already scoped by store/RLS |
| Freshness | Query at handover generate / intelligence run |
| Confidence | High for structured fields; description text remains prose |
| Persist? | **Runtime transform** — do not copy into Brain or a fact table |

### HotelBrainContextAdapter

| Field | Spec |
|-------|------|
| Input | Profile from `HFHotelBrainStore` |
| Output | Same conceptual shape as today’s `buildHotelBrainContext` |
| Responsibility | Extract page-local builder; preserve source-of-truth rules (Operational Knowledge for actions; Policies for limits; Guest Services for delivery; Hotel Knowledge for standards) |
| Persist? | No — derived view |

### Future GuestIntelligenceAdapter

| Field | Spec |
|-------|------|
| Input | Guest preference / history records (not designed yet) |
| Output | Facts or preference signals keyed by guest + room |
| Persist? | Guest store as source of truth; runtime projection into engine |

---

## 11. Recommendation model

### Current shape (`ShiftIntelligenceEngine`)

```text
{
  id: string,
  text: string,
  priority: "urgent" | "high" | "normal" | "low",
  department: string,
  status: "open" | "in_progress" | ...
}
```

Also returns `signals` and `checklist`, but Handover currently consumes recommendations primarily (checklist generation exists; live handover path does not always surface engine checklist).

### Proposed reusable shape (additive, not a big-bang rewrite)

Keep current fields for compatibility; add only what M4 and early conflict detection need:

```text
{
  id,
  type,                 // e.g. maintenance_follow_up | balance_settlement | vip_prep | conflict
  sourceFacts,          // [{ module, id }]
  severity,             // alias of priority initially
  title,                // optional short label; text remains action sentence
  action,               // same as text initially, or structured later
  reason,               // why produced (rule id / matched fields)
  room, guest, department,
  dueAt,                // from maintenance when present
  confidence,           // "high" | "medium" | "low" | uncertain
  status                // open | in_progress | dismissed | completed
}
```

### Persistence guidance (6–12 months)

| Behaviour | Recommendation |
|-----------|----------------|
| Generated fresh from current facts | **Default** for intelligence runs |
| Persisted | Keep handover `recommendation_state` as shift snapshot (already exists) |
| Dismissed / completed | Keep as handover-local state for now |
| Linked to source records | Add `sourceFacts` when M4 lands so maintenance tickets remain clickable/traceable |
| Global recommendation store | **Not needed** yet |

Do not require the full expanded model before M4. Add `sourceFacts` + `reason` first; defer guest/dueAt/confidence until a consumer needs them.

---

## 12. Complexity and risk register

| Issue | Classification |
|-------|----------------|
| Large intelligence orchestration inside `handover.html` | **Important before Guest Intelligence** |
| Duplicated priority / room / unresolved vocabularies | **Important before Guest Intelligence** (needed for M4) |
| Global `window.*` namespace contracts | **Safe to defer** (works; migrate only with bundling) |
| Store vs engine boundary confusion (context builder in page) | **Important before Guest Intelligence** |
| Frontend-only intelligence (no server reasoning) | **Safe to defer** for boutique-hotel v1 scale |
| Testing gaps: Brain retrieval/isolation harnesses drift; report order assertion stale; no cross-module intel tests | **Important before Guest Intelligence** |
| Data-model inconsistency (facts transient vs issues durable) | **Important before Guest Intelligence**; acceptable until M4 |
| Difficulty adding Guest Intelligence today | **Important before Guest Intelligence** — needs neutral engine input first |
| Cross-workspace leakage | **Not a real problem** at DB/RLS layer if policies stay authoritative |
| Stale Hotel Brain context | **Safe to defer** short-term; document reload expectations |
| Recommendations using old/conflicting facts | **Important before M4** — especially once maintenance + handover both feed engine |
| Shared fact table temptation | **Not a real problem** if avoided |
| Parallel intelligence engines in Maintenance | **Blocking** if started — do not build a second engine |
| Docs (`MAINTENANCE_V1_SPEC` / UI) still saying “spec only” | **Safe to defer** documentation hygiene (implementation exists) |

**Overall complexity verdict:** Complicated where it grew organically (Handover page), but not over-architected. The danger is adding frameworks too early, not the current amount of logic.

---

## 13. Roadmap validation

Given:

- Phase 15 — Maintenance core (done)
- Phase 16 — Reusable Intelligence Engine v1
- Phase 17 — Guest Intelligence
- Phase 18 — Hotel Brain v2
- M4 — Maintenance ↔ Handover integration

### Order options

| Option | Assessment |
|--------|------------|
| A. M4 first, then extract shared intelligence from real needs | Strong product learning, but risks embedding Handover-only import logic that must be ripped out |
| B. Full Intelligence Engine v1 first, then M4 | Over-builds before a second real consumer exists |
| **C. Very small shared foundation, then M4** | **Chosen** — minimises rework |
| D. Other | Full Guest Intelligence before M4 would be worse |

### Recommended sequence

1. **Phase 16A** — this audit (complete)
2. **Phase 16B — Small foundation (no product rename)**
   - Neutral engine input contract (`facts` / `issues` / `brainContext` / `snapshot`)
   - Compatibility path from existing Handover `_analyzed`
   - Extract `buildHotelBrainContext` to a shared helper
   - Priority/status/room mapping helpers
   - Adapter stubs + regression tests (still Handover-only consumer)
3. **M4 — Maintenance ↔ Handover**
   - Runtime Maintenance adapter for `include_in_handover` unresolved issues
   - Surface in handover context / recommendations with `sourceFacts`
   - No shared fact table
4. **Phase 16C — Intelligence Engine v1 hardening**
   - Conflict detection (e.g. VIP preference vs unresolved maintenance room)
   - Explainable reasons; richer recommendation fields as needed
   - Recurring maintenance signals from issue history (read-only queries)
5. **Phase 17 — Guest Intelligence**
   - New store + Guest adapter into the same engine contract
6. **Phase 18 — Hotel Brain v2**
   - Better knowledge structure/retrieval; still not an operational event dump

---

## 14. Refactor-now versus defer list

### Do now (foundation only — next implementation phase)

- Formalise neutral intelligence input (facts-first) while keeping Handover compatibility
- Extract Hotel Brain context builder from `handover.html`
- Add Maintenance → normalised issue/fact mapper (even if unused in UI until M4)
- Shared priority + room normalisation helpers
- Fix/update drifted tests that assume old harness wiring (`test-hotel-brain-retrieval`, isolation, report section titles)

### Do at M4

- Wire `include_in_handover` into handover generate / intelligence
- Recommendation `sourceFacts` linking to maintenance IDs
- Conflict: preferred/OOO/maintenance room vs arrivals (as data allows)

### Defer

- Renaming `shift-intelligence-engine.js`
- Shared persisted fact table
- Server-side intelligence
- Full recommendation schema rewrite
- Recurring-pattern ML / LLM backends
- Guest profile graph
- Bundling / ES modules migration
- Putting operational history into Hotel Brain JSON

### Do not do

- A second recommendation engine inside Maintenance
- Writing maintenance tickets into Hotel Brain profile JSON
- Big-bang rewrite of `handover.html` in the same phase as M4

---

## 15. Recommended next implementation phase

**Phase 16B — Intelligence Foundation (thin, test-backed, no behaviour break)**

Goals:

1. Keep `ShiftIntelligenceEngine` as the single reasoning entry point
2. Accept `facts[]` (and later `issues[]`) without requiring Handover internals
3. Preserve today’s Handover output for existing tests and UX
4. Make M4 a wiring exercise, not an architecture rescue

Non-goals:

- Cross-module UI integration (that is M4)
- Guest Intelligence
- Database migrations for facts
- File renames

---

## 16. Files that would likely change (future phases)

| Phase | Likely files |
|-------|--------------|
| 16B foundation | `shift-intelligence-engine.js`, new small helper for Brain context (or `hotel-profile-operational.js` / dedicated context helper), possibly thin adapter helpers, `handover.html` (call-site only), regression tests under `scripts/` |
| M4 | `handover.html`, `js/maintenance-store.js` (query helpers), Maintenance adapter, `shift-intelligence-engine.js`, handover/maintenance tests |
| 16C hardening | `shift-intelligence-engine.js`, recommendation rendering in `handover.html`, tests for conflicts/recurrence |
| 17 | New guest store/schema + adapter; engine input extension |
| 18 | Hotel Brain schema/UI/retrieval — not operational event storage |

**Explicitly out of scope for 16B/M4 unless required:** migrations for a shared fact table; renaming engines; Account behaviour changes.

---

## 17. Acceptance criteria for Intelligence Engine v1

Intelligence Engine v1 is accepted when all of the following are true:

1. **Single entry point:** Operational recommendations for Handover (and M4 maintenance inputs) go through `ShiftIntelligenceEngine.analyze` (or thin wrappers around it), not a second engine.
2. **Neutral input:** Engine can produce recommendations from normalised `facts[]` / `issues[]` + Brain context + snapshot without requiring `classified._analyzed`.
3. **Compatibility:** Existing Handover path still works; Phase 2/4/5 handover fact and recommendation regression suites pass.
4. **No invention:** Recommendations omit when facts are insufficient; closed/confirmed facts do not generate chase actions.
5. **Brain boundary:** Engine reads Brain context; does not write Brain or operational stores.
6. **Maintenance-ready:** Unresolved `include_in_handover` issues can be mapped to normalised engine input (wired in M4; mapper present in foundation).
7. **Traceability:** Recommendations that originate from durable records include source identity (`sourceModule` + id).
8. **Explainability (v1 bar):** Each generated recommendation has a deterministic reason or rule path (even if UI shows only `text` initially).
9. **Uncertainty:** Uncertain facts do not become assertive operational claims.
10. **No shared fact table required** for v1 acceptance.
11. **Workspace safety:** Adapters never bypass store/RLS workspace scoping.
12. **Tests:** Dedicated foundation tests cover fact-only input, priority mapping, and at least one maintenance-issue → recommendation path (fixture-level before full M4 UI).

---

## Appendix A — Storage schemas (summary)

### `handover_reports` (phase7)

Workspace-scoped snapshot: `metrics`, `source_notes`, `generated_handover`, `checklist_state`, `recommendation_state`, draft/saved status. Display-oriented; not a fact warehouse.

### `maintenance_issues` / `maintenance_updates` (phase15)

Normalised lifecycle + append-only timeline; `include_in_handover` opt-in for future M4; strong composite workspace protections.

### `hotel_brain_profiles` (phase4)

One JSON `profile_data` per hotel; durable knowledge document.

---

## Appendix B — Answers to the ten audit questions

1. **What intelligence layers exist?** Fact extraction (`AiWritingEngine`), shift recommendations (`ShiftIntelligenceEngine`), Brain operational retrieval (`HotelProfileOperational`), plus Handover-local classification/orchestration.
2. **What structured-fact systems exist?** Transient `OperationalFact`; durable Maintenance issues/updates; Brain knowledge entries (not operational facts).
3. **What is reusable?** Fact engine, shift intelligence core, operational retrieval, room reminders, stores’ workspace patterns.
4. **What is too tightly coupled to Handover?** Context builder, engine input shape, section/priority semantics, much orchestration in `handover.html`.
5. **Where is logic duplicated?** Priority, room keys, unresolved semantics, department matching; recommendation/checklist status normalisation across page and engine.
6. **What stays module-specific?** UI, stores, workflows, PDF/print, form validation, maintenance timeline rules.
7. **What should become shared?** Neutral facts/issues input, Brain context builder, mappers, conflict/ranking rules inside the existing engine.
8. **Unnecessarily complicated?** Not yet — risk is future parallel engines and a premature shared fact table.
9. **Safest evolution path?** Expand `shift-intelligence-engine.js` + thin adapters → M4 → harden v1 → Guest Intelligence.
10. **Aligned with four-tool roadmap?** Yes, if M4 uses the shared foundation and Guest Intelligence plugs into the same contract rather than inventing a fourth reasoning stack.

---

*End of Phase 16A audit.*
