# Hospitality Flow — Maintenance v1 Specification

**Phase:** M0 — Codebase audit and product specification  
**Status:** Spec only — no production code, migrations, or UI implementation in this phase  
**Date:** 28 July 2026  
**Pillar position:** Third core pillar (Hotel Brain → AI Shift Handover → **Maintenance** → Guest Intelligence later)

---

## 1. Product objective

Maintenance v1 gives small independent and boutique hotels a simple place to report, own, and close operational faults — and keeps those issues connected to the AI Shift Handover and Hotel Brain without becoming a Flexkeeping-class CMMS.

**Outcomes:**

- Staff can log an issue in under a minute.
- Ownership, priority, and status are always clear.
- Unresolved work survives shift changes via handover integration.
- Room and area history accumulates for future intelligence.
- AI rewriting stays factual (same doctrine as the existing writing engine).

**Non-goal:** Replace contractor portals, preventive calendars, inventory, or enterprise maintenance platforms.

---

## 2. User problems

| Problem today | Why it hurts small hotels |
|---------------|---------------------------|
| Maintenance lives only as free-text notes classified into the handover **Maintenance** section | Issues vanish when the shift ends; there is no durable ticket |
| No shared open-issue list across departments | Reception, Housekeeping, and Engineering disagree on what is still open |
| Priority is inferred from note language (`Critical` / `High` / `Normal` in handover) | Not editable as operational state; easy to lose urgency |
| Hotel Brain `outOfOrder` / OOO trackers are guidance text, not work orders | Permanent policy and temporary faults get mixed |
| Recurring room faults are remembered by people, not the system | No room history for “Room 24 AC again” |
| Roadmap lists “Maintenance Tasks” as handover UI, not a product | Product gap vs the three-pillar vision |

---

## 3. V1 scope

### 3.1 In scope

**Dashboard metrics**

- Open Issues (statuses: Open, In Progress, Waiting for Parts, Waiting for Contractor)
- Urgent or High Priority (among open issues)
- In Progress
- Completed Today (workspace local calendar day)

**Core actions**

- Report issue
- View / search / filter issues
- Open issue details
- Update assignment, priority, status
- Add progress notes (timeline)
- Mark completed (with resolution notes)
- Reopen when necessary

**Issue fields (v1)**

| Field | Required | Notes |
|-------|----------|--------|
| `id` | system | UUID |
| `workspace_id` | system | = `hotels.id` (same meaning as handover) |
| `hotel_id` | optional | Nullable; reserved for multi-property later; v1 may leave null or mirror `workspace_id` |
| `title` | yes | Short label |
| `description` | yes | Full report text (AI-rewritable) |
| `location_label` | yes | Room number or area name |
| `location_type` | yes | Guest Room / Public Area / Back of House |
| `category` | yes | Enum (see below) |
| `priority` | yes | Low / Medium / High / Urgent |
| `status` | yes | Open / In Progress / Waiting for Parts / Waiting for Contractor / Completed |
| `reported_by` | yes | Display name (staff text) |
| `assigned_department` | yes | Default Maintenance / Engineering from Hotel Brain depts when available |
| `assigned_person` | no | Optional display name |
| `reported_at` | yes | Default `now()` |
| `due_at` | no | Optional |
| `completed_at` | system | Set when status → Completed; cleared on reopen |
| `resolution_notes` | no | Required when completing (product rule; DB may allow null until complete) |
| `created_by` | system | `auth.users` FK, `ON DELETE SET NULL` |
| `updated_by` | system | Same |
| `created_at` / `updated_at` | system | Timestamps |

**Categories:** Plumbing, Electrical, HVAC, Bathroom, Furniture, Fixtures, Appliances, IT and Technology, Safety, Public Area, Kitchen, Other  

**Priorities:** Low, Medium, High, Urgent  

**Statuses:** Open, In Progress, Waiting for Parts, Waiting for Contractor, Completed  

### 3.2 Explicitly out of scope

See [§11 Out-of-scope list](#11-out-of-scope-list).

---

## 4. User flows

### 4.1 Report an issue (happy path)

1. Authorised member opens `maintenance.html`.
2. Platform access + workspace resolved (same pattern as handover / Hotel Brain).
3. Clicks **Report Issue**.
4. Fills minimum fields: title, description, location, location type, category, priority; reported by prefilled from session / prepared-by habit.
5. Optional: department, person, due date.
6. Optional: **Improve with AI** on description (rewrite only; no save until submit).
7. Submit → row in `maintenance_issues` with `workspace_id` from membership (never from free-form client trust alone; RLS enforces).
8. First timeline entry auto-created: “Issue reported” in `maintenance_updates`.

### 4.2 Triage and progress

1. Filter list (status, priority, category, location, department, search).
2. Open details → see report, owner, status, timeline, room history strip.
3. Change status / priority / assignment → audit via `updated_by` + optional system update row.
4. Add progress note → `maintenance_updates` row (AI-rewritable).
5. Complete → status Completed, `completed_at`, resolution notes required in UI.
6. Reopen → status Open (or previous non-completed), clear `completed_at`, timeline note “Reopened”.

### 4.3 Handover continuity

1. Staff generate or refresh a shift handover.
2. Unresolved maintenance issues are offered into the Maintenance section (see [§8](#8-handover-integration)).
3. Imported items show maintenance issue ID and are visually distinct from free-text handover notes.
4. Completing an issue in Maintenance removes it from future unresolved imports (historical handovers unchanged).

### 4.4 Room history

1. From issue details, “Related room / area history” lists prior issues for the same `workspace_id` + normalised `location_label`.
2. Completed issues remain searchable from the main list.

---

## 5. UI structure

### 5.1 Page: `maintenance.html`

Align with existing tool pages (`handover.html`, `hotel-profile.html`):

- Sticky topnav + logo home link
- Cross-links: Hotel Brain, AI Shift Handover, Account
- Duplicated navy/blue CSS tokens + Inter (current pattern; do not invent a new design system in v1)
- Auth scripts: `js/auth.js`, `js/platform-access.js`, `js/workspace.js`, `js/tenant-storage.js`, Supabase client
- New store: `js/maintenance-store.js` (mirror `js/handover-store.js`)

**Note:** There is no `workspace.html` in the repo. Workspace create/edit lives on `account.html`. Add Maintenance to Account tool links beside Handover and Hotel Brain.

### 5.2 Layout

```
┌─────────────────────────────────────────────────────────┐
│ Header: Maintenance                                     │
│ Short explanation + [Report Issue]                      │
├─────────────────────────────────────────────────────────┤
│ Metric cards: Open | High/Urgent | In Progress | Today  │
├─────────────────────────────────────────────────────────┤
│ Filters: Search | Status | Priority | Category |        │
│          Room/area | Assigned department                │
├─────────────────────────────────────────────────────────┤
│ Issue list rows:                                        │
│  location | title | priority | status | dept | age |    │
│  last update                                            │
└─────────────────────────────────────────────────────────┘
```

**Issue form (modal or dedicated panel)**

- Mobile-friendly; complete in &lt; 1 minute
- Required fields minimal; advanced (person, due date) collapsed or secondary
- No scheduling calendar, inventory, or contractor CRM

**Issue details**

- Original report
- Current owner (department ± person)
- Status + priority
- Progress timeline (`maintenance_updates`)
- Resolution block (when completed)
- Related location history

### 5.3 Visual continuity with handover

Handover already uses amber tone for `data-section="maintenance"` / glance “Maintenance Tasks”. Maintenance product may reuse amber accent for priority/urgency cues so the two surfaces feel related without copying the entire handover layout.

---

## 6. Database schema proposal

### 6.1 Design principles

- Prefer the **simplest safe structure**: two tables only for v1.
- Use `workspace_id uuid NOT NULL REFERENCES hotels(id)` to match `handover_reports` naming.
- Categories / priorities / statuses as **CHECK constraints** (not lookup tables).
- Assignments as columns on the issue (not an assignment history table).
- No attachments table in v1.
- User FKs: **`ON DELETE SET NULL`** (same pattern as phase 12 / phase 13) so deleting a user never deletes operational records.
- Workspace deletion: **`ON DELETE CASCADE`** from `hotels` (same as handover / brain) — hotel gone ⇒ issues gone.
- Do **not** store tickets inside `hotel_brain_profiles.profile_data`.

### 6.2 Table: `maintenance_issues`

```sql
CREATE TABLE public.maintenance_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  hotel_id uuid REFERENCES public.hotels(id) ON DELETE CASCADE, -- optional; v1 may set equal to workspace_id or null
  title text NOT NULL,
  description text NOT NULL,
  location_label text NOT NULL,
  location_type text NOT NULL,
  category text NOT NULL,
  priority text NOT NULL,
  status text NOT NULL DEFAULT 'Open',
  reported_by text NOT NULL,
  assigned_department text NOT NULL DEFAULT 'Maintenance',
  assigned_person text,
  reported_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz,
  completed_at timestamptz,
  resolution_notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Future-friendly history keys (store now, analyse later)
  location_key text,          -- normalised location_label for grouping
  equipment_label text,       -- optional free text e.g. "AC unit", "lift"
  CONSTRAINT maintenance_issues_location_type_check CHECK (
    location_type IN ('Guest Room', 'Public Area', 'Back of House')
  ),
  CONSTRAINT maintenance_issues_category_check CHECK (
    category IN (
      'Plumbing', 'Electrical', 'HVAC', 'Bathroom', 'Furniture', 'Fixtures',
      'Appliances', 'IT and Technology', 'Safety', 'Public Area', 'Kitchen', 'Other'
    )
  ),
  CONSTRAINT maintenance_issues_priority_check CHECK (
    priority IN ('Low', 'Medium', 'High', 'Urgent')
  ),
  CONSTRAINT maintenance_issues_status_check CHECK (
    status IN (
      'Open', 'In Progress', 'Waiting for Parts',
      'Waiting for Contractor', 'Completed'
    )
  ),
  CONSTRAINT maintenance_issues_completed_consistency CHECK (
    (status = 'Completed' AND completed_at IS NOT NULL)
    OR (status <> 'Completed' AND completed_at IS NULL)
  )
);
```

**Indexes**

```sql
CREATE INDEX maintenance_issues_workspace_id_idx
  ON public.maintenance_issues (workspace_id);

CREATE INDEX maintenance_issues_workspace_status_idx
  ON public.maintenance_issues (workspace_id, status);

CREATE INDEX maintenance_issues_workspace_priority_idx
  ON public.maintenance_issues (workspace_id, priority);

CREATE INDEX maintenance_issues_workspace_location_key_idx
  ON public.maintenance_issues (workspace_id, location_key);

CREATE INDEX maintenance_issues_workspace_reported_at_idx
  ON public.maintenance_issues (workspace_id, reported_at DESC);

CREATE INDEX maintenance_issues_workspace_updated_at_idx
  ON public.maintenance_issues (workspace_id, updated_at DESC);

-- Partial: open queue for dashboards and handover import
CREATE INDEX maintenance_issues_workspace_open_idx
  ON public.maintenance_issues (workspace_id, priority, updated_at DESC)
  WHERE status <> 'Completed';
```

### 6.3 Table: `maintenance_updates`

```sql
CREATE TABLE public.maintenance_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES public.maintenance_issues(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  body text NOT NULL,
  update_type text NOT NULL DEFAULT 'note',
  -- note | status_change | assignment_change | system
  old_status text,
  new_status text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name text,           -- display name retained if user deleted
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT maintenance_updates_type_check CHECK (
    update_type IN ('note', 'status_change', 'assignment_change', 'system')
  )
);
```

**Indexes**

```sql
CREATE INDEX maintenance_updates_issue_id_idx
  ON public.maintenance_updates (issue_id, created_at ASC);

CREATE INDEX maintenance_updates_workspace_id_idx
  ON public.maintenance_updates (workspace_id, created_at DESC);
```

**Invariant:** `maintenance_updates.workspace_id` must always equal parent `maintenance_issues.workspace_id`. Enforce with:

- Application store always copying parent workspace, and
- Optional trigger `BEFORE INSERT OR UPDATE` that sets / verifies `workspace_id` from the parent issue (recommended in M1).

### 6.4 Tables deliberately deferred

| Table | Decision |
|-------|----------|
| `maintenance_categories` | No — CHECK enum is enough |
| `maintenance_assignments` | No — columns on issue |
| `maintenance_attachments` | No — photos out of scope unless trivial later |
| Soft-delete / archive column | Optional later; v1 keeps Completed as history; hard DELETE allowed for members (mirror handover) or restricted — see §7 |

### 6.5 Relationships

```
hotels (id)
  ├── hotel_members (hotel_id)
  ├── hotel_brain_profiles (hotel_id)
  ├── handover_reports (workspace_id)
  ├── maintenance_issues (workspace_id)
  │     └── maintenance_updates (issue_id, workspace_id)
  └── (optional) maintenance_issues.hotel_id → hotels.id
```

### 6.6 Migration sequence (do not apply in M0)

1. **M1a** — `maintenance_issues` + indexes + updated_at trigger + RLS  
2. **M1b** — `maintenance_updates` + indexes + parent workspace trigger + RLS  
3. **M1c** — Isolation tests (script) proving Hotel A cannot read Hotel B  
4. Later phases — no schema for AI; optional Brain JSON keys only if needed in M5 (prefer query-over-issues)

Suggested filenames (when implemented):

- `supabase/migrations/phase15_maintenance_issues.sql`
- `supabase/migrations/phase16_maintenance_updates.sql`

(Exact phase numbers depend on migrations present at implementation time.)

---

## 7. Security and RLS design

### 7.1 Architecture findings (current platform)

| Pattern | Current behaviour | Maintenance implication |
|---------|-------------------|-------------------------|
| Workspace root | `hotels.id` | Use as `workspace_id` |
| Membership | `hotel_members` | All RLS via `EXISTS (... hm.hotel_id = row.workspace_id AND hm.user_id = auth.uid())` |
| Naming | Brain uses `hotel_id`; handover uses `workspace_id` | Prefer `workspace_id` on maintenance tables; document alias |
| Auth gate | `HFAuth.requireAuth` + `HFPlatformAccess.requireApprovedAccess` | Same boot path as handover |
| Workspace load | `HFWorkspace.getUserWorkspace()` — one membership (`.limit(1)`) | Do not design multi-property picker in v1 |
| Client trust | SECURITY.md: RLS is authoritative | Never trust client-supplied workspace alone |
| User delete | Handover / brain `ON DELETE SET NULL` | Same for `created_by` / `updated_by` |
| Role split | Any member can CRUD handovers; owner edits hotel row | v1: any member can CRUD maintenance (match handover); refine roles later |

### 7.2 RLS policies (mirror `handover_reports_*_member`)

For **both** tables:

- `maintenance_issues_select_member` — SELECT USING membership on `workspace_id`
- `maintenance_issues_insert_member` — INSERT WITH CHECK membership
- `maintenance_issues_update_member` — UPDATE USING + WITH CHECK membership (block workspace reassignment)
- `maintenance_issues_delete_member` — DELETE USING membership  

Same four policies for `maintenance_updates`, keyed on `workspace_id`.

**Critical WITH CHECK:** updates must not allow changing `workspace_id` to another hotel. Prefer immutable `workspace_id` (trigger rejects changes).

### 7.3 Application store rules (`js/maintenance-store.js`)

Mirror `HFHandoverStore`:

1. `requireAuthAndWorkspace` (auth + platform access + membership).
2. Always set `workspace_id` from `HFWorkspace.getUserWorkspace().hotel.id`.
3. Queries: `.eq("workspace_id", ctx.workspaceId)`.
4. Updates: `.eq("id", id).eq("workspace_id", ctx.workspaceId)`.
5. Optional offline cache via `HFTenantStorage` scoped keys (e.g. `hf_maintenance_cache`).
6. Friendly errors pointing at the new migration files (same style as handover store).

### 7.4 Recommended delete behaviour

| Action | v1 recommendation |
|--------|-------------------|
| Complete issue | Soft operational close — row remains |
| Delete issue | Allowed for members (cleanup mistakes); cascades updates. Prefer UI confirm. |
| Delete user | SET NULL on user FKs; keep `reported_by` / `created_by_name` text |
| Delete hotel workspace | CASCADE issues + updates |
| Purge completed | Out of scope |

### 7.5 Cross-workspace leakage risks

| Risk | Mitigation |
|------|------------|
| Client sends another hotel’s `workspace_id` | RLS denies; store ignores client override |
| LocalStorage bleed | Use `HFTenantStorage` + clear on sign-out |
| Handover import copying issue text without ID | Always include `maintenance_issue_id` in structured handover payload |
| Updates inserted with wrong workspace | DB trigger copies parent `workspace_id` |
| Embedding tickets in Hotel Brain JSON | Forbidden — separate tables only |
| `rota.html`-style ungated page | Must load platform-access + auth like handover |

---

## 8. Handover integration

### 8.1 Current state (audit)

- `handover.html` defines section `id: "maintenance"` with keyword classification.
- Glance metric: “Maintenance Tasks”; amber styling.
- Notes become structured facts via `AiWritingEngine.extractOperationalFact`; priority via `detectMaintenancePriority` (Critical / High / Normal).
- Saved reports store section text in `metrics` / `generated_handover` JSON — **not** durable tickets.
- Shift Intelligence signals `hasMaintenance` / follow-up recommendations for Maintenance/Engineering.

Maintenance v1 must **not** replace free-text maintenance notes. It adds a second, authoritative source.

### 8.2 Integration model

**Two lanes in the Maintenance section:**

1. **From maintenance log** — imported unresolved issues (stable ID, status, priority).  
2. **From shift notes** — classified free-text (existing behaviour).

UI must label them distinctly (e.g. badge “Log” vs “Note”).

### 8.3 Import rules

Include issues where:

- `workspace_id` matches current workspace
- `status` ∈ { Open, In Progress, Waiting for Parts, Waiting for Contractor }

Exclude:

- `status` = Completed

Ordering:

1. Urgent, then High, then Medium, then Low  
2. Within priority: oldest `reported_at` first (or most recently updated — product choice: prefer **oldest open Urgent/High first**)

Display line example:

> Room 24 – Air conditioning is not cooling. Engineer expected tomorrow. Status: In Progress. `[#a1b2c3]`

Waiting statuses must retain reason from latest note or resolution-adjacent fields (e.g. last update body / description excerpt) — do not invent a contractor name.

### 8.4 Deduplication

- Never create a new `maintenance_issues` row when generating a handover.
- Imported lines reference `maintenance_issue_id`.
- If the same issue is also typed into source notes, consolidation may merge display but must not create a second ticket.
- Historical saved handovers keep the text they stored; they are snapshots.

### 8.5 Recommendation: approach A with light opt-out (safest + simplest for v1)

| Option | Meaning |
|--------|---------|
| **A** | Automatically include every unresolved issue |
| **B** | Staff manually select issues for each handover |

**Recommendation: A for v1**, with one escape hatch:

- Auto-include all unresolved issues (small hotels rarely have dozens open).
- Per-handover session: staff may **hide** an imported item from *this* handover without closing the ticket (`excluded_issue_ids` in client handover state / draft JSON only — not a DB flag on the issue).
- Do **not** build a full multi-select picker as the primary path (that is closer to B and adds miss risk).

**Why not pure B:** easiest to forget Urgent items at shift change — the opposite of operational continuity.  
**Why not pure A without hide:** a long-running Low priority corridor light could noise every handover; hide-for-this-shift is enough.

### 8.6 Touchpoints (implementation later — M4)

| File / module | Change |
|---------------|--------|
| `js/maintenance-store.js` | `listOpenIssuesForHandover(workspaceId)` |
| `handover.html` | Fetch open issues; merge into Maintenance section; badges; hide control |
| `handover-report.js` / save payload | Persist referenced IDs under `generated_handover.maintenanceLogRefs` (or similar) |
| `shift-intelligence-engine.js` | Prefer structured open issues for maintenance signals when present |
| `ai-writing-engine.js` | Optional formatter for log-imported lines (no new facts) |

**Must not change:** classification of free-text notes; existing saved report shape enough to remain backward compatible (additive JSON only).

---

## 9. Hotel Brain integration

### 9.1 Principle

Maintenance contributes **operational history**, not permanent policy.

| Layer | Store | Examples |
|-------|--------|----------|
| Permanent policy | Hotel Brain | “OOO rooms require GM approval”, access protocols |
| Transient / historical work | `maintenance_issues` (+ updates) | Room 24 AC fault, lift callouts |
| Future intelligence | Queries / derived views over issues | “3 HVAC issues in Room 24 in 6 months” |

Do **not** write ticket lists into `hotel_brain_profiles.profile_data` in v1.

### 9.2 What to store now (for later intelligence)

On every issue, persist:

- `workspace_id`
- `location_label` + `location_key` (normalised: trim, lowercase, collapse spaces; keep display label separate)
- `location_type`
- `category`
- `equipment_label` (optional, free text)
- `priority`, `status`
- `reported_at`, `completed_at`
- Timeline via `maintenance_updates`

Hotel Brain may later expose read-only panels that **query** maintenance history by room — without polluting policies.

### 9.3 Existing Brain fields (context only)

- Policy / tracker `outOfOrder`, `operations.outOfOrderReport` — guidance for staff, not work orders.
- Departments list may seed `assigned_department` defaults (Maintenance already appears in Brain/SOP department lists).

### 9.4 Future intelligence examples (not built in v1)

- “Room 24 has had three air-conditioning issues in six months.”
- “The lift has generated four maintenance reports this quarter.”
- “Room 16 has repeated plumbing issues.”

M5 delivers **retrievable history API/UI**, not predictive analytics.

---

## 10. AI writing rules

### 10.1 Reuse doctrine

`ai-writing-engine.js` already declares:

> Preserve every factual detail; never invent information.

It already has `MODULES.maintenance` and `buildMaintenanceBody` (status-only; no invented chase actions). Maintenance v1 must call this engine rather than ad-hoc string polish (`SECURITY.md` §8).

### 10.2 Preserve

- Room numbers and areas  
- Equipment  
- Guest impact  
- Dates and times  
- Assigned owner / department  
- Uncertainty (“expected”, “maybe”, “guest said”)  
- Contractor or parts information **when stated**  
- Waiting reasons  

### 10.3 Never invent

- Causes  
- Repair / completion dates  
- Safety risks  
- Costs  
- Contractors  
- Completion status  
- Follow-up actions not in the source (same Phase 3A discipline as handover maintenance bodies)

### 10.4 Spec’d functions (do not implement in M0)

#### `rewriteMaintenanceIssue(input, options) → { text, meta }`

**Responsibility:** Professional rewrite of a new issue description (and optionally title suggestion).

**Input:**

```text
{
  text: string,                 // raw description
  title?: string,
  location_label?: string,
  category?: string,
  priority?: string,
  preferences?: object,         // Hotel Brain aiPrefs / terminology
  module: "maintenance"
}
```

**Output:** Rewritten description (and optional cleaned title). Must keep rooms/areas; apply British English / terminology via existing `applyPreferences` path where appropriate.

**Example**

- In: `24 ac not cooling guest complained engineer tomorrow`  
- Out: `Room 24 – The air conditioning is not cooling. The guest has reported the issue, and an engineer is expected tomorrow.`

#### `rewriteMaintenanceUpdate(input, options) → { text, meta }`

**Responsibility:** Polish a progress note without changing status facts.

**Input:** `{ text, issueSnapshot?: { status, location_label, priority }, preferences? }`  
**Output:** Rewritten note body only.

#### `summarizeMaintenanceIssues(issues, options) → { summary, bullets }`

**Responsibility:** Short operational summary for dashboard or handover preface.

**Input:** Array of issue projections (title, location, priority, status, key detail).  
**Output:** Factual summary; Urgent/High first; omit completed unless asked; **no invented remediation**.

### 10.5 Guards

Reuse / extend:

- `inventsCompletionStatus`
- Fact extraction where useful (`extractOperationalFact`) for structured display
- Prefer omit over invent (Shift Intelligence pattern: insufficient fact → no recommendation)

---

## 11. Out-of-scope list

Explicitly **excluded** from Maintenance v1 to prevent scope expansion:

- Contractor portals / external vendor logins  
- Preventive maintenance calendars  
- Inventory and spare parts management  
- Purchase orders  
- Cost tracking and budgets  
- Invoices  
- Complex scheduling / job calendars  
- Real-time chat  
- Native mobile application  
- Push notifications  
- Advanced / predictive analytics  
- Flexkeeping or other CMMS integrations  
- Photo / file uploads (unless a later phase finds Storage + RLS “extremely simple”; default **no**)  
- Multi-property workspace switcher  
- Role-based permission matrix beyond “hotel member”  
- SLA engines and escalation workflows  
- QR codes / IoT sensors  
- Guest-facing maintenance request forms  

---

## 12. Implementation phases

### M1 — Database and security

| | |
|--|--|
| **Goal** | Ship schema + RLS + isolation proof; no product UI required |
| **Files** | `supabase/migrations/phaseNN_maintenance_*.sql`; `scripts/test-maintenance-isolation.mjs` (or SQL verify); update `SECURITY.md` table list; `SUPABASE_SETUP.md` note |
| **Acceptance** | Tables exist; RLS enabled; member A cannot CRUD hotel B; user delete SET NULL; completed consistency constraint works |
| **Tests** | Cross-workspace select/insert/update/delete denial; trigger workspace inheritance on updates; constraint checks |
| **Risks** | Wrong FK delete behaviour; forgetting WITH CHECK on UPDATE |
| **Must not change** | Existing handover / brain migrations; `hotels` / `hotel_members` policies |

### M2 — Core Maintenance page and issue creation

| | |
|--|--|
| **Goal** | `maintenance.html` + create + list + metrics + filters |
| **Files** | `maintenance.html`; `js/maintenance-store.js`; `account.html` link; optional shared minor nav links on handover / hotel-profile |
| **Acceptance** | Authorised user reports issue in &lt; 1 minute; metrics correct; search/filter work; mobile usable |
| **Tests** | Store create/list scoped to workspace; form validation; metric queries |
| **Risks** | Huge inline HTML debt (follow existing page pattern, keep JS modular); skipping platform gate |
| **Must not change** | Handover generation behaviour; Hotel Brain save path |

### M3 — Issue updates, assignment and status workflow

| | |
|--|--|
| **Goal** | Details view, timeline, assignment/priority/status, complete, reopen |
| **Files** | `maintenance.html`; `js/maintenance-store.js`; maybe `maintenance-details` helpers |
| **Acceptance** | Progress notes form timeline; complete requires resolution notes; reopen clears `completed_at`; completed remain searchable |
| **Tests** | Status transitions; timeline ordering; reopen consistency constraint |
| **Risks** | Status/completed_at drift; missing audit names after user delete |
| **Must not change** | Handover note classification |

### M4 — Handover integration

| | |
|--|--|
| **Goal** | Unresolved issues appear in handover Maintenance section with IDs; distinct from free-text |
| **Files** | `handover.html`; `js/maintenance-store.js`; save payload paths (`handover-report.js` / store); possibly `shift-intelligence-engine.js` |
| **Acceptance** | Open/relevant issues auto-included; Completed excluded; Urgent/High first; Waiting reason retained; no duplicate tickets; hide-for-this-shift works; free-text lane unchanged |
| **Tests** | Import filtering; snapshot stability; no regression on classification tests (`scripts/test-handover-*.mjs`) |
| **Risks** | Dual sources confusing staff; payload bloat; breaking draft uniqueness assumptions |
| **Must not change** | Meaning of existing saved handovers; draft-one-per-workspace rule |

### M5 — Hotel Brain maintenance history

| | |
|--|--|
| **Goal** | Retrieve room/area history; optional Brain read-only panel or Maintenance details strip only |
| **Files** | `js/maintenance-store.js` history helpers; `maintenance.html` history UI; optionally thin read UI in `hotel-profile.html` / operational knowledge (**read-only query**, no ticket writes into Brain JSON) |
| **Acceptance** | History by `location_key`; does not alter policies; Brain OOO guidance unchanged |
| **Tests** | Isolation of history queries; normalisation of `location_key` |
| **Risks** | Temptation to dump arrays into `profile_data` |
| **Must not change** | `PROFILE_SCHEMA_VERSION` semantics unless additive and justified; policy editors |

### M6 — AI writing and summaries

| | |
|--|--|
| **Goal** | `rewriteMaintenanceIssue`, `rewriteMaintenanceUpdate`, `summarizeMaintenanceIssues` |
| **Files** | `ai-writing-engine.js`; `scripts/test-ai-writing-engine.mjs` (+ maintenance cases); wire buttons in `maintenance.html` |
| **Acceptance** | Example AC rewrite works; no invented completion/cause/cost; summaries factual |
| **Tests** | Preserve rooms/dates; inventsCompletionStatus cases; British/terminology prefs |
| **Risks** | Diverging from handover maintenance body rules |
| **Must not change** | Handover rewrite behaviour except shared bugfixes |

### M7 — Testing, polish and pilot readiness

| | |
|--|--|
| **Goal** | Pilot-ready quality on desktop + mobile |
| **Files** | Tests, copy, empty states, error strings, `CHANGELOG.md` / `ROADMAP.md` updates when releasing |
| **Acceptance** | All ten acceptance criteria in §13; SECURITY checklist items for new tables |
| **Tests** | Full isolation suite; smoke flows; handover regression pack |
| **Risks** | Scope creep into out-of-scope list |
| **Must not change** | Unrelated modules (rota, early access) |

---

## 13. Acceptance criteria

Maintenance v1 is successful when:

1. An authorised hotel user can report an issue quickly.  
2. The issue is stored only in their workspace.  
3. Staff can update ownership, priority and status.  
4. Progress updates create a clear timeline.  
5. Completed issues remain searchable.  
6. Relevant unresolved issues can appear in handovers.  
7. Maintenance text is professionally rewritten without invented facts.  
8. Room maintenance history can be retrieved.  
9. The module works on desktop and mobile.  
10. Existing Handover and Hotel Brain behaviour remains unchanged.

---

## 14. Risks and open decisions

### 14.1 Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Cross-workspace leakage | Critical | RLS + store pattern + isolation tests |
| Handover dual-lane confusion | Medium | Clear “Log” vs “Note” labelling |
| Auto-import noise | Medium | Hide-for-this-shift; priority ordering |
| `workspace_id` vs `hotel_id` naming confusion | Medium | Document; use `workspace_id` consistently |
| One-membership limit blocks multi-property groups | Low (v1) | `hotel_id` nullable reserved; no UI yet |
| Duplicated CSS / 9k-line `handover.html` | Medium | Keep maintenance page separate; extract only thin handover hooks in M4 |
| AI inventing remediation | High (trust) | Shared engine + tests; omit over invent |
| Any-member delete of issues | Low–Med | Confirm dialogs; tighten roles post-v1 |
| Guest PII in descriptions | Medium | Same operational-notes guidance as handovers |

### 14.2 Open decisions

| Decision | Options | Spec default |
|----------|---------|--------------|
| Handover include mode | A / B / hybrid | **A + hide-for-this-shift** |
| Hard delete issues | Allow members / owners only / soft-delete | **Allow members with confirm** (match handover) |
| `hotel_id` column | Omit / always = workspace / nullable | **Nullable; may mirror workspace_id** |
| Waiting reason field | Dedicated column vs last update text | **Last update / description excerpt in v1** |
| Default department | Always “Maintenance” vs Brain list | **Default Maintenance; prefer Brain dept list when present** |
| Priority mapping from old handover Critical | Map Critical→Urgent or keep three-level | **Urgent ≈ Critical for imports/display alignment** |
| Offline-first | Full offline queue vs online-only | **Online-first; optional read cache like handover** |
| M5 Brain UI | Maintenance-only history vs Brain panel | **History on issue details first; Brain panel optional** |

---

## 15. Recommended first coding phase

**Start with M1 — Database and security.**

Reasons:

1. Every later phase depends on workspace-scoped tables and RLS.  
2. Matches platform precedent (phases 4 / 7 before rich UI sync).  
3. Isolation bugs are cheapest to catch before UI ships.  
4. No product behaviour changes for Handover or Hotel Brain in M1.

**M1 exit checklist**

- [ ] `maintenance_issues` + `maintenance_updates` migrated in a non-prod project  
- [ ] RLS policies reviewed against `SECURITY.md`  
- [ ] Cross-tenant isolation test script green  
- [ ] User FK `ON DELETE SET NULL` verified  
- [ ] Parent workspace trigger on updates verified  
- [ ] Spec §6 constraints enforced  

Only after M1: proceed to M2 (`maintenance.html` + store + create/list).

---

## Appendix A — Architecture findings summary

| Area | Finding |
|------|---------|
| Standalone Maintenance | **Does not exist** (no page, no tables) |
| Maintenance today | Handover section + AI/intelligence rules + Brain OOO text |
| Workspace UI | `account.html` (not `workspace.html`) |
| Reusable auth | `HFAuth`, `HFPlatformAccess`, `HFWorkspace`, `HFTenantStorage` |
| Reusable stores | Pattern from `HFHandoverStore` / `HFHotelBrainStore` |
| Writing | `AiWritingEngine` with `MODULES.maintenance` |
| Intelligence | `ShiftIntelligenceEngine` maintenance follow-ups |
| Shared CSS | Almost none beyond `css/auth.css`; tool pages duplicate tokens |
| Security doctrine | Membership RLS; client filters insufficient |

## Appendix B — File map (planned)

| Path | Role | Phase |
|------|------|-------|
| `docs/MAINTENANCE_V1_SPEC.md` | This specification | M0 ✓ |
| `supabase/migrations/phaseNN_maintenance_issues.sql` | Issues schema + RLS | M1 |
| `supabase/migrations/phaseNN_maintenance_updates.sql` | Updates schema + RLS | M1 |
| `js/maintenance-store.js` | Cloud CRUD | M2+ |
| `maintenance.html` | Product UI | M2+ |
| `account.html` | Tool link | M2 |
| `handover.html` (+ satellites) | Import unresolved issues | M4 |
| `ai-writing-engine.js` | Rewrite / summarise APIs | M6 |
| `shift-intelligence-engine.js` | Prefer log-backed signals | M4–M6 |

---

*End of Maintenance v1 specification (M0). No production functionality, migrations, commits, or deploys were performed in this phase.*
