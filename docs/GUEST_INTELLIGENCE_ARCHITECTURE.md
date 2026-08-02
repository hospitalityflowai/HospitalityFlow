# Guest Intelligence — Architecture

**Status:** GI-0 architecture + **GI-1 read-only observation extraction implemented**.  
GI-1 adds temporary in-memory `GuestObservation` objects only. No durable profiles, schema, migrations, staff UI, preference promotion, or automatic learning.

Guest Intelligence is a **reliable consumer** of the Hospitality Intelligence Engine. It must reuse existing contracts and must **not** create a second reasoning engine.

Related:

- [HOSPITALITY_INTELLIGENCE_ENGINE_ARCHITECTURE.md](HOSPITALITY_INTELLIGENCE_ENGINE_ARCHITECTURE.md) — E1–E4 contracts
- [ARCHITECTURE_INDEX.md](ARCHITECTURE_INDEX.md) — platform map
- [PRODUCT_PRINCIPLES.md](PRODUCT_PRINCIPLES.md) — engine owns reasoning
- [security/SECURITY_ARCHITECTURE.md](security/SECURITY_ARCHITECTURE.md) — tenancy / RLS

---

## 1. Definition

**Guest Intelligence is the hotel-specific operational memory of a guest, built from verified observations and staff-approved knowledge, used to improve future service decisions.**

### What it is not

- A full CRM  
- A loyalty / points system  
- A marketing profile or campaign tool  
- A surveillance system  
- A replacement for the PMS  
- A source of medical diagnosis  
- A payment-risk scoring system  
- An unrestricted permanent record of every note  
- A separate AI reasoning engine  

---

## 2. Current guest-related data audit (GI-0)

Guests today are **shift-scraped free text** plus **Hotel Brain house rules**. There is no durable guest profile store and no PMS/email identity as a first-class key.

| Concept | Where it lives | Kind | Reliable ID? | Free text? | Ownership |
|---------|----------------|------|--------------|------------|-----------|
| `guestName` | Writing `OperationalFact.guestName`; Memory `entityKeys.guest`; DecisionTrace evidence | Shift | Weak (fuzzy name) | Mostly | Writing extracts; Engine keys continuity |
| VIP / `isVip` | Handover section `vip`; Writing `vip_arrival`; Engine VIP object; Brain `vipRules` | Shift flag + Hotel rules | No | Yes | Note keyword ≠ loyalty ID; `vipRules` = hotel knowledge |
| Guest requests | Writing `guest_request` / `requestItem`; Engine family `guest_request` | Shift | No | Semi-structured items | Writing + Engine |
| Stay preferences | Writing `preferredLocation`, twin/king, feather-free keywords | Shift | No | Mostly | Not a preference graph |
| Hotel guest policies | Brain `policiesStructured.guest`, `guestServices` | Hotel | N/A | Free-text policies | Hotel Brain |
| Complaints | Writing complaint topic / body; impact heuristics | Shift | No | Yes | No complaint entity store |
| Accessibility | Room inventory `accessible` only | Hotel (room) | Room id | Guest need absent | Do not confuse room attribute with guest need |
| Late checkout | Writing `late_checkout` + Brain policy | Shift instance + Hotel policy | Room (+ name) | Yes | Separate from guest memory |
| Wake-up / taxi | Writing `wake_up` / transport; Brain procedures | Shift + Hotel procedure | Room + time text | Yes | No durable wake table |
| Parcels | Writing `delivery` | Shift | Room / name if present | Yes | No courier tracking id |
| Payment issues | Writing payment subjects; Engine payment family | Shift | Room + amount | Semi | Not a credit score |
| OperationalContext `guestImpact` | Engine context | Derived | N/A | Derived | Engine-owned severity signal |
| OperationalMemory | Engine cross-shift continuity (≤72h / 6 reports) | Continuity | Room + maintenance id strongest | guest = name slug | **Not** Guest Intelligence profiles |
| Maintenance guest impact | Heuristic only; no DB column | Shift heuristic | Issue UUID + room | Heuristic | Durable `guest_impact` deferred |
| Demo `buildGuests()` | `js/demo-sample-data.js` | Demo fixture | Demo-only | Notes free text | Not product GI |
| Saved handovers | `handover_reports.source_notes` / organised sections | Shift snapshot | None structured | Prose | No guest rows in DB |
| Guest Intelligence product | Docs / roadmap only | Planned | N/A | N/A | Phase after E4; this document |

### Reliable identifiers today

| Field | Reliable? |
|-------|-----------|
| Normalised room number | Best current join |
| `maintenanceIssueId` | Strong for tickets, not guests |
| `guestName` | Weak |
| PMS / reservation / email / phone / loyalty id | **Absent** as structured fields |

### Duplication / conflicting ownership

- VIP is both a Handover **section** and an engine **object type**; hotel `vipRules` are house rules, not per-guest VIP.  
- Preferences appear in notes and in Hotel Brain regular-guest guidance — different scopes.  
- `OperationalMemory.entityKeys.guest` is continuity matching only — must not be treated as a guest profile id.

### GI-1 signal audit (extraction inputs; no Writing changes required)

| Signal | Reliability for GI-1 | Notes |
|--------|----------------------|-------|
| Normalised room | Strong join for current stay | Room-only → `uncertain` match |
| `guestName` / honorific parse | Probable when + room | Weak alone; namesakes not merged |
| Reservation / booking refs | Strong when present in text | Not first-class Writing fields yet |
| VIP flag / `vip_arrival` | Useful for type | Not loyalty id |
| `preferredLocation` / bedding / twin keywords | Good for type | Observation ≠ preference |
| Complaint / recovery wording | Good | Resolved → `resolved` status |
| Payment / Expedia subjects | Good + sensitive | `staff_review` |
| Wake-up / taxi | Good | One observation + components |
| Parcel without room/name | Weak — skip | Not guest-specific |
| Maintenance plant-only | Skip | Guest impact only when guest/room impact |
| Generic “busy shift” | Skip | Not an observation |
| DecisionTrace / OperationalMemory | Support links only | Do not invent observations from history alone |
| Protected-trait / medical / card text | Prohibited | Rejection only; no retained content |

Extraction gaps accepted in GI-1: no PMS id field, weak `guestName`, no durable identity.

---

## 3. Relationship to the Hospitality Intelligence Engine

```text
Current OperationalFact
  → OperationalContext                    (current meaning / impact / nextAction)
  → Guest Intelligence enrichment         (supporting guest knowledge only)
  → Hotel Brain enrichment                (hotel policies / inventory)
  → OperationalMemory                     (recent cross-shift continuity — not GI)
  → DecisionTrace
  → score / rank / recommendation
  → writing / UI
```

| Layer | Scope |
|-------|--------|
| **OperationalFact** | Current evidence from this shift / import |
| **OperationalContext** | Current operational meaning |
| **OperationalMemory** | Recent cross-shift continuity of an **issue** |
| **Guest Intelligence** | Durable (or medium-term) knowledge about a **guest** |
| **Hotel Brain** | Durable knowledge about the **hotel** |
| **DecisionTrace** | Why a recommendation was produced (may cite GI as supporting knowledge) |

GI must **not** duplicate scoring, ranking, nextAction, or recommendation generation.

---

## 4. Proposed profile contract (not implemented)

Canonical, tenant-scoped, serializable shape (names aligned to engine conventions):

```text
GuestIntelligenceProfile {
  guestId                 // opaque workspace-scoped id (future)
  workspaceId
  identityKeys {          // structured; prefer PMS-linked
    pmsGuestId?
    reservationIds[]?
    emailRef?             // hashed/reference — not raw dump
    phoneRef?
    displayName
    company?
    travelAgent?
  }
  profileStatus           // active | merged | split | archived | forgotten
  observations[]          // single-stay events (candidates or retained)
  preferences[]           // confirmed or high-confidence repeated choices
  serviceHistory[]        // operational history summaries (source-linked)
  complaints[]            // complaint/recovery records
  accessibilityNeeds[]    // approval-required
  roomPreferences[]       // floor, quiet, bedding, preferred room, etc.
  operationalRisks[]      // approval-required; never auto-inferred labels
  confidenceSummary { overall, byCategory }
  sourceReferences[]      // report/fact/stay refs
  firstSeenAt
  lastSeenAt
  retentionState
}
```

### Knowledge item (shared shape for preferences / needs / risks)

```text
GuestKnowledgeItem {
  knowledgeId
  workspaceId
  guestId
  category                // IDENTITY | PREFERENCE | ACCESSIBILITY | …
  knowledgeType           // controlled code (e.g. prefers_quiet_room)
  value                   // structured value — not polished prose
  status                  // proposed | confirmed | rejected | superseded | expired
                          //   | active | contradicted | uncertain
  confidence              // 0–1 (engine semantics)
  confidenceLabel         // low | medium | high
  approval { status, approvedBy?, approvedAt?, reason?, expiresAt? }
  sourceReferences[]
  firstObservedAt
  lastObservedAt
  lastConfirmedAt?
  expiresAt?
  reviewAt?
  retentionReason?
  contradictionOf?        // knowledgeId
  supersededBy?           // knowledgeId
  createdAt
  createdBy               // user id | "system"
  lastUpdatedAt
}
```

**Requirements:** tenant-scoped, serializable, explainable, source-linked, confidence-aware, privacy-aware, UI-agnostic, no polished recommendation prose, no duplicated engine reasoning.

---

## 5. Knowledge categories

### A. Identity

Name, PMS/booking reference, email/phone **reference** (not unnecessary raw copies), company / travel-agent association.

| Rule | |
|------|--|
| Auto | Weak candidate identity from notes — **temporary only** |
| Staff | Merge / promote to durable identity |
| Never | Infer ethnicity/nationality from name |

### B. Preferences

Upper floor, away from lift, quiet room, feather-free, twin beds, preferred room, welcome amenity, communication preference.

| Rule | |
|------|--|
| Auto | Only after **repeated** or **explicit** evidence + strong identity |
| Staff | Confirm when confidence medium or contradicted |
| Expiry | Medium-term; reconfirm periodically |

### C. Accessibility and service needs

Mobility, hearing/visual assistance, cot, dietary, support requirement.

| Rule | |
|------|--|
| Auto | **Never** invent diagnosis; candidates may be **proposed** from explicit notes only |
| Staff | **Required** before active use |
| Expiry | Review-based; shortest justified for sensitive detail |

### D. Operational history

Late checkout patterns, wake-up/taxi patterns, recurring room requests, repeated service recovery, previous unresolved issues (guest-linked).

| Rule | |
|------|--|
| Auto | Pattern candidates after repetition + strong identity |
| Staff | Visible and correctable |
| Note | Distinct from OperationalMemory issue continuity |

### E. Complaints and recovery

Subject, impact, resolution, compensation (authorised only), satisfaction outcome.

| Rule | |
|------|--|
| Auto | Complaint **subject** candidates from explicit records |
| Staff | Compensation / sensitive outcomes |
| Never | Personality labels (“difficult”) |

### F. VIP and recognition

VIP status, occasion (anniversary/birthday if **stated**), repeat guest, corporate status.

| Rule | |
|------|--|
| Auto | Repeat-stay **count** if identity strong; VIP only from explicit hotel/PMS signal |
| Staff | VIP / corporate designation when uncertain |
| Hotel Brain | Hotel VIP **procedures** remain Brain, not GI |

### G. Risk-sensitive data

Payment issues, behavioural incidents, do-not-accommodate / management restriction.

| Rule | |
|------|--|
| Auto | **Never** for behavioural / DNA / restrictions |
| Staff | **Always** required |
| Payment | Current-shift payment facts stay OperationalFact; durable payment “risk profile” **out of scope** / approval-only if ever stored |
| Expiry | Shortest justified retention + review |

---

## 6. Automatic learning rules

**Potentially allowed** (strong evidence only):

- Repeated room / floor / bedding preference  
- Repeated wake-up/taxi pattern  
- Repeat guest count  
- Repeated amenity request  
- Repeated complaint **subject**  
- Confirmed successful service recovery (from explicit resolution notes)

**Every automatic promotion requires:**

1. Strong guest identity match  
2. Repeated **or** explicit evidence (never one ambiguous note → permanent)  
3. Source references  
4. Confidence ≥ medium threshold (see §11)  
5. No unresolved contradiction  
6. Hotel / workspace scope only  
7. Staff visibility  
8. Ability to correct / delete  

One ambiguous note → at most a **proposed observation**, never active durable preference.

---

## 7. Staff approval rules

**Approval required** before active use:

- Medical / accessibility / allergies  
- Behavioural warnings  
- Payment concerns (if stored beyond current stay)  
- Management restrictions / do-not-accommodate  
- Special security instructions  
- Sensitive personal circumstances  
- Inferred relationship / family details  
- Negative character judgments  
- Compensation patterns  

**Approval states:** `proposed` → `confirmed` | `rejected` | `superseded` | `expired`

**Approval record:** `approvedBy`, `approvedAt`, `source`, `reason`, optional `expiresAt`.

---

## 8. Prohibited inference and storage

### Never infer automatically

Disability diagnosis, mental-health status, ethnicity, religion, sexual orientation, political views, criminality, financial status, pregnancy, nationality from name/accent, family relationship assumptions, personality labels, “difficult guest” labels, risk scores based on protected/sensitive traits.

### Never store

Full payment card details, passport copies, government ID numbers, unnecessary medical details, passwords, sensitive private conversations, gossip / subjective staff character comments.

---

## 9. Identity matching

### Evidence strength

| Class | Evidence |
|-------|----------|
| **Strong** | PMS guest ID; reservation ID linked to guest; verified email; verified phone; exact name **plus** stay context; existing profile reference |
| **Weak** | Surname only; room number only; nickname; company only; free-text name similarity |

### Match outcomes

| Outcome | Use |
|---------|-----|
| `strong_match` | May attach observations; may auto-promote preferences under §6 |
| `probable_match` | Temporary attachment; no permanent merge |
| `uncertain_match` | Stay temporary; no durable write |
| `no_match` | Observation remains stay-local only |

### Rules

- Room number alone **never** creates permanent guest identity  
- Namesakes remain separate until strong evidence or staff merge  
- Uncertain matches stay temporary  
- Profile merge requires strong evidence **or** staff confirmation  
- Split / undo must be possible  

---

## 10. Observation vs preference vs fact vs memories

| Term | Meaning | Example |
|------|---------|---------|
| **Observation** | One event from one stay | Requested upper floor tonight |
| **Preference** | Repeated or explicitly confirmed choice | Consistently prefers upper floor |
| **OperationalFact** | Current shift issue/action | Guest in Room 24 requested late checkout **today** |
| **Guest memory (GI)** | Durable/medium-term guest-specific knowledge | Usually requests late checkout |
| **Hotel Brain** | Hotel-wide knowledge | Late checkout after 13:00 requires approval |
| **OperationalMemory** | Recent continuity of an **operational issue** | Room 24 AC continuing AM→PM |

These remain separate. Current explicit OperationalFact **overrides** historical preference for the **current stay**.

---

## 11. Conflict resolution

Examples: high floor vs ground floor today; feather-free vs feather pillows; dislikes accessible vs later requests accessible.

| Rule | |
|------|--|
| Current explicit request | Overrides historical preference **for this stay** |
| Newer confirmed evidence | May supersede older knowledge |
| One exception | Does **not** always erase a stable preference — lowers confidence / marks `contradicted` |
| Staff | Can confirm, reject, or retire |
| Silent overwrite | **Forbidden** |

**Item states:** `active` | `contradicted` | `superseded` | `uncertain` | `expired`

---

## 12. Confidence model

**Reuse Hospitality Intelligence Engine semantics.** Confidence = evidence quality, not importance.

| Label | Numeric (aligned to engine gates) | Typical evidence |
|-------|-------------------------------------|------------------|
| high | ≥ 0.75 | Explicit guest statement + staff confirm; strong identity; repeated consistent |
| medium | ≥ 0.45 | Repeated observations or explicit note without confirm |
| low | < 0.45 | Single ambiguous observation |

Factors: explicit statement, staff confirmation, repetition, PMS-linked identity, age of evidence, contradictions, source reliability.

Contradiction → decrease confidence and/or mark `contradicted`.  
Do **not** invent a separate confidence framework.

---

## 13. Retention and expiry

| Horizon | Examples |
|---------|----------|
| **Short-lived** | Current arrival details, wake-up/taxi, outstanding payment, temporary complaint follow-up |
| **Medium-term** | Recent room preference, service recovery history, recurring amenity request |
| **Long-term (confirmed only)** | Stable bedding preference, accessibility need, verified VIP/regular status |
| **Sensitive** | Shortest justified retention; explicit review/expiry; staff approval |

Fields: `expiresAt`, `reviewAt`, `lastConfirmedAt`, `retentionReason`, deletion/forget workflow.

**Do not assume every guest fact remains forever.**

---

## 14. Recommendation boundary

**Correct:**

```text
Current OperationalFact
  → OperationalContext
  → Guest Intelligence enrichment (supporting)
  → DecisionTrace (supportingKnowledge / guest refs)
  → Recommendation
```

GI **may** add: known room preference, prior complaint subject, confirmed accessibility requirement, previous successful recovery.

GI **must not:** create current-shift work without evidence; change priority directly; invent risk; create negative labels; override explicit current requests; bypass Hotel Brain policies.

Suggested DecisionTrace extension (future, not GI-0 implementation):

```text
supportingKnowledge: [{
  source: "guest_intelligence",
  knowledgeType: "...",
  guestId: "...",
  matchReason: "strong_identity" | "confirmed_preference" | ...,
  confidence: 0.0–1.0
}]
```

---

## 15. Hotel Brain boundary

| Guest Intelligence | Hotel Brain |
|--------------------|-------------|
| Knowledge about **one guest** | Knowledge about **the hotel** |
| “Mrs Taylor prefers high floors.” | “Rooms 31–43 are upper-floor rooms.” |
| “Mr Khan usually requests late checkout.” | “Late checkout after 13:00 requires approval.” |

The Intelligence Engine combines both for current decisions. Neither duplicates the other.

---

## 16. Privacy and security

Apply existing security architecture:

- Workspace-scoped  
- RLS-protected (future tables)  
- Unavailable across hotels  
- Unavailable to anonymous users  
- Denied after platform suspension  
- Denied after membership removal  
- Excluded from Demo persistence (sample-only if shown)  
- Audited for access and changes  
- Exportable / deletable where required  
- No service-role exposure in browser code  

**Role access (flag for later):** under current owner/member model, all members may see operational guest notes on handovers today. **Field-level restriction** for risk-sensitive GI items (DNA, behavioural, medical) may be required before GI-4/GI-5 — open decision (§21).

Do not implement permissions in GI-0.

---

## 17. Auditability

Every durable guest knowledge item retains:

- source type  
- source report / stay / fact reference  
- createdAt  
- createdBy or system  
- confidence  
- approval status  
- lastUpdatedAt  
- expiry / review date  
- contradiction / supersession history  

Explainable answers:

- Why this preference exists  
- Where it came from  
- How certain HF is  
- Whether staff confirmed it  

---

## 18. Lifecycle

```text
Operational observation (OperationalFact / stay note)
  → candidate guest knowledge
  → identity match (strong / probable / uncertain / none)
  → confidence + validation
  → staff approval where required
  → active profile knowledge
  → current-stay enrichment into engine context
  → DecisionTrace cites GI support
  → review / expiry / supersession / deletion
```

**Engine participation:** produces facts/context/traces; consumes GI as **enrichment only**; never lets GI invent open work.

---

## 19. Phased implementation plan

| Phase | Scope | Status |
|-------|--------|--------|
| **GI-0** | Architecture and contracts | Done |
| **GI-1** | Read-only guest observation extraction from engine outputs | **Done** (`guest-intelligence.js`) |
| **GI-2** | Candidate knowledge + confidence model (still temporary / non-profile) | Not started |
| **GI-3** | Staff review / approve / reject workflow | Not started |
| **GI-4** | Guest profile UI | Not started |
| **GI-5** | Current-stay enrichment into Handover | Not started |
| **GI-6** | Retention, merge/split, deletion controls | Not started |
| **GI-7** | Pilot validation and cautious pattern learning | Not started |

---

## 19A. GI-1 — Read-only GuestObservation extraction

### Authority

- Module: `guest-intelligence.js` (`GuestIntelligence.extractGuestObservations`)
- Hook: `ShiftIntelligenceEngine.analyze` / `analyzeCore` attaches `guestObservations` + `guestObservationRejections`
- Consumes existing `OperationalFact`, optional `OperationalContext`, `OperationalMemory`, and DecisionTrace refs
- Does **not** re-rank, invent priority, create next actions, recommend, write Hotel Brain, or mutate profiles

### GuestObservation contract (temporary, serializable)

```text
GuestObservation {
  observationId
  workspaceId
  sourceFactIds
  sourceReportIds
  guestIdentityEvidence { guestName, room, rooms, reservationId, bookingReference, sourceType }
  guestMatchStrength          // strong | probable | uncertain | none
  room
  guestName
  observationType
  value                       // codes/tokens only — no HTML / polished prose
  status                      // observed_once | explicit_current_request |
                              // confirmed_current_stay | resolved | uncertain
  observedAt
  confidence                  // reuse engine evidence-quality semantics
  confidenceLabel             // low | medium | high
  sensitivity                 // normal | sensitive | prohibited
  approvalRequirement         // none | staff_review | never_store
  retentionHint
  reasonCodes
  memoryRefs
  decisionTraceRefs
  temporary: true
  persistent: false
  preferencePromoted: false
}
```

No permanent `guestId`. No recommendation fields. Not persisted.

### Observation types (Phase 1 controlled set)

`room_preference`, `floor_preference`, `location_preference`, `bedding_preference`,
`bed_configuration`, `amenity_preference`, `communication_preference`,
`accessibility_or_service_need`, `vip_or_recognition`, `occasion`, `complaint`,
`service_recovery`, `late_checkout_request`, `wakeup_or_transport`,
`parcel_or_delivery`, `payment_issue`, `maintenance_guest_impact`,
`general_guest_request`, `informational`

Not every fact becomes an observation. Generic ops notes, hotel policy, and staff-only instructions are skipped.

### Identity evidence

| Strength | Rule |
|----------|------|
| **strong** | PMS / reservation / booking reference present |
| **probable** | Exact guest name + room or stay context |
| **uncertain** | Room-only, surname/name without stay, or explicit “guest requires…” accessibility without room |
| **none** | Generic guest wording — no observation |

Room-only observations stay temporary for the current stay and must not imply a durable guest identity.

### Observation vs preference

GI-1 never promotes an observation to a preference.  
Example: “Room 24 requested a high floor” → `floor_preference` + `observed_once` / `explicit_current_request`, **not** “Guest prefers high floors.”

### Sensitivity / approval

| Case | sensitivity | approvalRequirement |
|------|-------------|---------------------|
| Accessibility / service need | sensitive | staff_review |
| Payment / behavioural concern | sensitive | staff_review |
| Protected-trait inference | prohibited | never_store (rejection only; no retained text) |
| Card / passport / medical detail | prohibited | never_store |

Prohibited content is returned only as a safe rejection/debug object (`retainedContent: false`).

### Confidence

Reuses engine confidence semantics (evidence quality, not importance). Explicit name+room+request → high; room-only → medium/uncertain identity; vague notes → low or skipped.

### Deduplication

One operational event → one observation when possible (shared `sourceFactIds`, wake+taxi components, VIP amenity components). Unrelated rooms/guests are never merged. Namesakes in different rooms stay separate.

### Demo isolation

- Demo may hold sample observations in session memory (`getLastDemoObservations`)
- `demo-workspace` / `isDemoData` only
- `clearDemoObservations` on Demo `clearMemoryPack` (reset / exit)
- No cloud reads/writes; no profile persistence; no GI Demo UI in GI-1

### Tests

`scripts/test-guest-intelligence-gi1-observations.mjs` — scenarios A–J + isolation proofs.

### GI-1 out of scope

- Durable guest profiles / DB tables / persistence  
- Identity merging  
- Staff review UI  
- Preference promotion  
- Current-stay recommendations from GI  
- Long-term guest memory  
- PMS integration  
- UI redesign  

### GI-1 verdict

**GI-1 COMPLETE** — temporary, source-linked, tenant-scoped guest observations extracted from existing engine outputs only.

---

## 20. Test strategy

**GI-1 covered:** identity strength, room-only temporary, observation≠preference, prohibited rejection without retained text, generic-note skip, wake/taxi dedupe, namesake separation, Demo clear, engine `guestObservations` attachment, no GI recommend API.

**Later phases:** contradictions + confidence changes, expiry/review UI, approval workflow, cross-hotel isolation on durable store, suspension/membership denial, profile UI.

---

## 21. Out of scope (near-term after GI-1)

- Profile UI, migrations, durable profile tables  
- Automatic learning in production  
- CRM / loyalty / marketing  
- Payment-risk scoring  
- Medical diagnosis  
- Parallel recommendation engine  
- Cross-hotel guest graphs  
- Unrestricted permanent retention  

---

## 22. Open architecture decisions

1. **Identity source of truth** — PMS-linked id vs HF-generated `guestId` with optional PMS attach.  
2. **Sensitive field visibility** — all members vs restricted roles before GI-4.  
3. **Storage timing** — first durable table at GI-2 vs GI-3 (prefer after approval workflow design).  
4. **Email/phone** — store references/hashes only; confirm legal basis per jurisdiction.  
5. **Relationship to OperationalMemory** — keep issue continuity separate; GI links via `guestId` when strong match exists.  
6. **Demo** — sample observations session-only; never write real GI to Supabase.  

---

## 23. Verdicts

**GI-0 COMPLETE (architecture only).**  
**GI-1 COMPLETE (read-only temporary observations).**

Guest Intelligence remains a hotel-scoped, privacy-aware consumer that **enriches** the Hospitality Intelligence Engine and does **not** replace it.
