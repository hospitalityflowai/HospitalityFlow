# Hospitality Flow — Maintenance UI v1 Specification

**Phase:** M1.5 — UI and user-experience specification  
**Status:** Spec only — no `maintenance.html`, production JS, migration, or page edits in this phase  
**Date:** 28 July 2026  
**Depends on:** `docs/MAINTENANCE_V1_SPEC.md`, `supabase/migrations/phase15_maintenance.sql` (M1 / M1.1)

---

## 1. Product feel

Maintenance should feel:

| Quality | Meaning in practice |
|---------|---------------------|
| Simple | Report a normal issue in ~30 seconds |
| Premium | Same navy / blue / Inter language as Handover and Hotel Brain |
| Operational | Clear ownership, status, and age — not decorative analytics |
| Fast | Short form, responsive cards, immediate list update after save |
| Mobile-friendly | Full-width cards, full-screen sheets, ≥44px targets |
| Boutique-fit | Not a Flexkeeping-class CMMS; no enterprise table density |

**Primary workflow**

Report issue → assign priority and department → track progress → complete → retain searchable history.

---

## 2. Primary users

| User | Goal on this page |
|------|-------------------|
| Receptionist | Log a guest-room fault quickly during a busy desk moment |
| Duty / Night Manager | Scan unresolved and high-priority work between shifts |
| Maintenance team member | Update status and leave progress notes |
| General Manager | See priorities and later use history for recurring faults |

Design for the receptionist first; managers benefit from the same calm scan hierarchy.

---

## 3. Page structure (`maintenance.html`)

### 3.1 Desktop layout (wire)

```
┌──────────────────────────────────────────────────────────────┐
│ A. Shared topnav (logo · Hotel Brain · Handover · Account)   │
├──────────────────────────────────────────────────────────────┤
│ B. Page header                                               │
│    HOTEL OPERATIONS                                          │
│    Maintenance                         [ Report Issue ]      │
│    Report, track and resolve hotel maintenance issues.       │
├──────────────────────────────────────────────────────────────┤
│ C. Metric cards (4)                                          │
│    Open Issues | High Priority | In Progress | Completed Today│
├──────────────────────────────────────────────────────────────┤
│ D. Search + compact filters + Clear                          │
├──────────────────────────────────────────────────────────────┤
│ E. Issue cards (list)                                        │
│ F. Empty / loading / error regions                           │
└──────────────────────────────────────────────────────────────┘
│ Drawers / sheets overlay content when open                   │
```

### 3.2 A — Shared Hospitality Flow header

Mirror `handover.html` / `hotel-profile.html`:

- Sticky `.topnav`, logo → `index.html`
- Cross-links: Hotel Brain (`hotel-profile.html`), AI Shift Handover (`handover.html`), Account (`account.html`)
- Auth boot: `HFAuth` → `HFPlatformAccess.requireApprovedAccess` → `HFWorkspace.getUserWorkspace`
- Reuse `:root` navy / blue / gray / amber tokens, Inter, `--radius` / `--radius-lg`, `--max-width`, `--nav-height`
- Duplicate page-local CSS for v1 (same pattern as existing tool pages); do not invent a new design system

### 3.3 B — Page header

| Element | Content |
|---------|---------|
| Eyebrow | `HOTEL OPERATIONS` (uppercase, letter-spaced, gray — same pattern as Hotel Brain section labels) |
| Title (`h1`) | `Maintenance` |
| Description | `Report, track and resolve hotel maintenance issues.` |
| Primary CTA | Button: **Report Issue** |

No large hero image, marketing banner, or decorative chart.

### 3.4 C — Dashboard metrics

Exactly four live-count cards:

| Card label | Count definition |
|------------|------------------|
| **Open Issues** | Status ∈ {`open`, `in_progress`, `waiting_parts`, `waiting_contractor`} |
| **High Priority** | Among unresolved: priority ∈ {`high`, `urgent`} |
| **In Progress** | Status = `in_progress` |
| **Completed Today** | Status = `completed` and `completed_at` within workspace local calendar day |

Rules:

- Live counts only after data load succeeds
- While loading: show skeleton numerals or em dash — **never** false zeros
- No percentages, progress rings, or arbitrary “health” scores
- Cards are non-interactive in M2 (optional: tapping a card applies that filter in M3 polish — out of M2 minimum)

Visual: white card, light border, top inset accent optional (blue for Open / In Progress; restrained amber for High Priority; muted green or navy for Completed Today — text labels always present).

### 3.5 D — Search and filters

| Control | Type | Notes |
|---------|------|--------|
| Search | Text input | Placeholder: `Search room, area, title…` |
| Status | Select | All + display labels (§5.2) |
| Priority | Select | All + Urgent / High / Medium / Low |
| Category | Select | All + display labels (§10 categories) |
| Room or area | Text or select-as-you-type | Matches `room_number` or `area` |
| Clear filters | Text button | Visible when any filter/search active |

**Pattern:** one compact horizontal filter bar on desktop; on mobile, search stays visible and filters collapse behind **Filters** (see §9). Prefer native `<select>` dropdowns over a large filter form or chip clouds. Active filter count may appear on the Filters button (`Filters · 2`).

No “Assigned department” filter in the first visual pass if it overcrowds mobile; **include department filter on desktop**, and inside the mobile Filters sheet. Spec requirement includes it — ship it in the Filters sheet on all breakpoints.

### 3.6 E — Issue list

Responsive **issue cards** (not a dense data table). Default sort: §7.

### 3.7 F — States

Defined in §8.

### 3.8 Auth and workspace gates

Before content:

1. Not signed in → redirect login (existing pattern)
2. Access pending → same pending treatment as other tools
3. No workspace → prompt to create workspace on Account (do not invent a fake hotel)

---

## 4. Report Issue experience

### 4.1 Container

| Breakpoint | Presentation |
|------------|--------------|
| Desktop (≥900px) | Right-side drawer (~420–480px), dimmed backdrop |
| Mobile / tablet | Full-screen sheet from bottom or full viewport |

Behaviour:

- Open from **Report Issue** (header) or empty-state **Report First Issue**
- Focus moves to first field (`Location type`)
- Escape / backdrop / Close closes (with unsaved-discard confirm if dirty)
- Focus returns to the opening control
- Trap focus inside while open
- Sticky footer actions on long forms (especially mobile)

### 4.2 Field map (UI ↔ database)

Do **not** expose: `workspace_id`, issue `id`, `created_by`, `updated_by`, `created_at`, `updated_at`, `assigned_user_id`, `completed_at`, `resolution_notes` on create.

| UI label | DB column | Required | Control |
|----------|-----------|----------|---------|
| Location type | `location_type` | Yes | Segmented control or select |
| Room number | `room_number` | Conditionally | Text |
| Area | `area` | Conditionally | Text |
| Issue title | `title` | Yes | Text |
| Description | `description` | Yes for v1 UX | Textarea |
| Category | `category` | Yes | Select |
| Priority | `priority` | Yes | Select (default Medium) |
| Assigned department | `assigned_department` | Yes | Select (default Maintenance) |
| Due date | `due_at` | No | Date (optional time later) |
| Reported by | `reported_by_name` | No | Text; prefill from session display name if available |
| Include in next handover | `include_in_handover` | No | Checkbox; default **off** |

**Location rule (validation):**

- If Location type = Guest Room → **Room number** required; Area optional/hidden
- If Public Area or Back of House → **Area** required; Room number optional/hidden
- Persist only the relevant field; leave the other null

### 4.3 Exact copy

#### Location type

- **Label:** Location type  
- **Options (display → value):**  
  - Guest Room → `guest_room`  
  - Public Area → `public_area`  
  - Back of House → `back_of_house`  
- **Helper:** Choose where the issue is.  
- **Error:** Select a location type.

#### Room number (guest room)

- **Label:** Room number  
- **Placeholder:** e.g. 24 or Room 24  
- **Helper:** Guest room number only.  
- **Error:** Enter the room number.

#### Area (public / BOH)

- **Label:** Area  
- **Placeholder:** e.g. Lobby, Kitchen, Staff office  
- **Helper:** Name the public or staff area.  
- **Error:** Enter the area name.

#### Issue title

- **Label:** Issue title  
- **Placeholder:** e.g. Air conditioning not cooling  
- **Helper:** Keep it short — one line.  
- **Error:** Enter a short title.  
- **Max length (UI):** 120 characters.

#### Description

- **Label:** Description  
- **Placeholder:** e.g. Guest reported that the room remains warm after the AC was switched on.  
- **Helper:** Include what was reported and any guest impact in plain language.  
- **Error:** Add a brief description.  
- **Rows:** 3–4; max ~2000 characters.

#### Category

- **Label:** Category  
- **Placeholder option:** Select category  
- **Display labels:** Plumbing, Electrical, HVAC, Bathroom, Furniture, Fixtures, Appliances, IT and Technology, Safety, Public Area, Kitchen, Other  
- **Values:** snake_case per phase15 (`plumbing` … `it_technology` …)  
- **Error:** Select a category.

#### Priority

- **Label:** Priority  
- **Default:** Medium  
- **Options:** Low, Medium, High, Urgent  
- **Helper:** Use Urgent only when the issue needs immediate attention.  
- **Error:** Select a priority.

#### Assigned department

- **Label:** Assigned department  
- **Default:** Maintenance  
- **Options (v1 fixed list, align with hotel ops):** Reception, Housekeeping, Maintenance, Food & Beverage, Management, Other  
- Prefer Hotel Brain department list later if available without blocking M2  
- **Error:** Select a department.

#### Due date (secondary)

- **Label:** Due date (optional)  
- **Placeholder:** native date control  
- **Helper:** Leave blank if not needed.  
- Visually in a collapsed **More details** disclosure or muted secondary block.

#### Reported by (secondary)

- **Label:** Reported by (optional)  
- **Placeholder:** e.g. Alex — Reception  
- Prefill when a display name exists; user may edit.

#### Include in next handover (secondary)

- **Label:** Include in next handover  
- **Helper:** Opt in so this issue can appear in AI Shift Handover (wired in M4). Unresolved issues are not imported only because they exist.  
- **Default:** unchecked (`false`)

### 4.4 Actions

| Action | Role |
|--------|------|
| **Report Issue** | Primary submit |
| **Cancel** | Secondary; closes drawer |

While saving:

- Disable primary button; label **Reporting…**
- Prevent double submit
- Do not close drawer until success or error

### 4.5 After successful create

1. Close drawer  
2. Toast / live region: **Issue reported** (optional subtitle with location + title)  
3. Prepend or insert card into list per sort rules  
4. Refresh metric counts  
5. Return focus to **Report Issue** button  
6. Optionally briefly highlight the new card (`aria-live` announcement sufficient)

### 4.6 Create errors

| Case | Message |
|------|---------|
| Validation | Inline field errors; focus first invalid field |
| Network / RLS / server | Banner in drawer: **We couldn’t save this issue. Check your connection and try again.** |
| No workspace | **Create your hotel workspace on the Account page before reporting issues.** |

---

## 5. Guest impact (product decision)

### 5.1 Evaluation

A simple **Guest impact** field (`None` / `Minor` / `Major`) would help:

- Reception mark guest-affecting faults without overloading Priority  
- Managers scan guest risk separately from engineering urgency  
- Future handover lines (“Guest impact: Major”)

It is **not** in `phase15_maintenance.sql`.

### 5.2 Recommendation

**Defer guest impact until a small schema additive migration (M1.6 or start of M2), or ship M2 without it.**

| Option | Recommendation |
|--------|----------------|
| **A. Add before M2** | Preferred **if** one additive migration is acceptable: `guest_impact text NOT NULL DEFAULT 'none'` with CHECK (`none`, `minor`, `major`). Low risk; high hotel value. |
| **B. Ship M2 without it** | Acceptable; Priority + description text carry guest context. Add field in M3 if pilots request it. |

**Do not** invent complex scoring.  
**Do not** modify phase15 in this UI phase.  
**UI implication:** If Option A is approved before M2 coding, place Guest impact as a primary select after Priority (default None). If Option B, omit from cards and forms until schema exists.

**Approval needed before M2** — see §15.

---

## 6. Issue card design

### 6.1 Hierarchy (scan in seconds)

```
ROOM 24                          ← location (uppercase / strong)
Air conditioning not cooling     ← title
Guest reported that the room…    ← description, max 2 lines, ellipsis
[High] [Open] [Maintenance] [Handover]   ← chips with text
Reported 25 minutes ago          ← relative age / last update
```

### 6.2 Content rules

| Element | Source |
|---------|--------|
| Location | Prefer `Room {room_number}` or `area`; fall back to location type label |
| Title | `title` |
| Description | `description`, clamp 2 lines |
| Chips | Priority · Status · Assigned department · optional Handover · optional Guest impact |
| Age | Prefer “Updated …” from `updated_at` if newer than create; else “Reported …” from `created_at` |
| Never show | UUIDs, workspace ids, raw snake_case enums |

### 6.3 Priority presentation

| Value | Label | Visual (never colour-only) |
|-------|-------|----------------------------|
| `urgent` | Urgent | Text chip + strong weight; restrained red/rose border or left edge |
| `high` | High | Text chip + amber accent |
| `medium` | Medium | Neutral chip |
| `low` | Low | Muted gray chip |

Do **not** style Medium/Open as alarming red.

### 6.4 Status presentation

| Value | Label |
|-------|-------|
| `open` | Open |
| `in_progress` | In Progress |
| `waiting_parts` | Waiting for Parts |
| `waiting_contractor` | Waiting for Contractor |
| `completed` | Completed |

Waiting statuses: muted blue-gray chip; Completed: quieter treatment when shown in mixed lists.

### 6.5 Handover chip

If `include_in_handover`: chip text **Handover** (not a loud badge pile).

### 6.6 Interaction

- Entire card is a button/link opening details (`role="button"` or `<button class="issue-card">`)
- Keyboard: Enter / Space
- Hover: subtle shadow (existing `--shadow-card-hover` pattern); no hover-only critical info
- Avoid large icons; small optional wrench/location glyph only if it aids scan without clutter

### 6.7 Avoid

Excessive coloured backgrounds, badge stacks, huge icons, showing every DB field, enterprise grid density.

---

## 7. Issue details experience

**M2:** open read-oriented details drawer (view fields + timeline read-only if updates exist).  
**M3:** enable quick actions, progress notes, complete / reopen workflows defined below.

### 7.1 Container

Same as Report: right drawer desktop; full-screen mobile. Close / Escape / focus trap / focus return to the card.

### 7.2 Sections

#### A. Header

- Location  
- Issue title (`h2`)  
- Priority + Status chips  
- Close control  

#### B. Issue information

| Display label | Field |
|---------------|--------|
| Description | full `description` |
| Category | display label |
| Location type | display label |
| Assigned department | `assigned_department` |
| Due date | `due_at` or “No due date” |
| Reported by | `reported_by_name` or “—” |
| Reported | friendly `created_at` |
| Last updated | friendly `updated_at` |
| Include in handover | Yes / No |
| Guest impact | only if column approved |

Still hide internal IDs from the default view (optional “Reference” truncated id for support later — not in M2).

#### C. Quick actions (specify for M3; disable or hide in M2)

- Change status  
- Change priority  
- Change assigned department  
- Add progress update  
- Mark completed  
- Reopen (when completed)  

Use clear selects / buttons; no tiny icon-only status toggles.

#### D. Timeline

Chronological `maintenance_updates` (oldest → newest or newest → oldest — **recommend oldest first** for narrative).

Each row:

- Time and date (hotel-local friendly)  
- Action from `update_type` mapped to plain English  
- Person (`created_by` display name if resolvable; else omit)  
- Note text  

| `update_type` | Display action |
|---------------|----------------|
| `created` | Issue reported |
| `note` | Progress update |
| `status_changed` | Status changed to {new} |
| `priority_changed` | Priority changed to {new} |
| `assignment_changed` | Assignment updated |
| `resolution` | Resolved |
| `reopened` | Reopened |
| `hidden_from_handover` | Removed from handover |
| `included_in_handover` | Included in handover |

Empty timeline: show the system “Issue reported” row synthesised from create metadata if no update rows yet (M2 may create a `created` update on insert — store decision in M2).

#### E. Resolution (M3)

When **Mark completed**:

- Require or strongly encourage **Resolution notes** (recommend **required** in UI)  
- Confirm: **Mark this issue as completed?**  
- Do not delete; status → `completed`; remains searchable  
- Success toast: **Issue completed**

**Reopen:** confirm; clear completion via DB trigger; toast **Issue reopened**.

---

## 8. List sorting and filtering

### 8.1 Default order (unresolved-focused list)

Default filter: **hide Completed** (Status = All unresolved), unless user selects Completed or All including completed.

Sort groups:

1. Urgent unresolved  
2. High unresolved  
3. In Progress (any priority below Urgent/High already listed — if already in 1–2, do not duplicate; implement as stable sort keys)  

Practical stable sort keys (recommended for M2):

1. Completed last (unless viewing completed-only)  
2. Priority rank: urgent → high → medium → low  
3. Status rank among same priority: `in_progress` → `open` → `waiting_parts` → `waiting_contractor` → `completed`  
4. Oldest `created_at` first (unresolved)  
5. When viewing completed: newest `completed_at` first  

### 8.2 Search matches

Case-insensitive contains on:

- `room_number`, `area`, `title`, `description`, `category` (display or raw), `assigned_department`

### 8.3 Filters

Status, Priority, Category, Room/Area text, Assigned department — AND logic.  
**Clear filters** resets search + all selects.

---

## 9. States

### 9.1 Loading

- Skeleton metric cards + 3–5 skeleton issue cards  
- Or restrained spinner in list region with `aria-busy="true"`  
- Metrics must not show `0` until load completes  

### 9.2 No issues (unfiltered)

- **Title:** No maintenance issues reported  
- **Message:** New issues reported by your hotel team will appear here.  
- **Action:** Report First Issue  

### 9.3 No filtered results

- **Title:** No issues match these filters  
- **Action:** Clear filters  

### 9.4 Error

- **Title:** We couldn’t load maintenance issues  
- **Message:** Check your connection and try again.  
- **Action:** Try again  

### 9.5 Offline / cloud unavailable

Align with handover store patterns:

- Prefer live cloud as source of truth for Maintenance (operational; M2 online-first)  
- Optional short-lived cache via `HFTenantStorage` for last successful fetch  
- If showing cached data: banner **Showing last saved list — connection unavailable.** Do **not** present cache as live without the banner  
- Create while offline: either block with clear message (**Connect to report an issue**) or queue for M3+ — **M2 recommendation: block create offline** to avoid dual-write complexity  

---

## 10. Mobile behaviour

### 10.1 Breakpoints

| Name | Width | Layout |
|------|-------|--------|
| Mobile | &lt; 640px | Single column; metrics 2×2; Filters sheet; full-screen drawers |
| Tablet | 640–899px | Metrics 2×2 or 4 in a row if space; drawers full-screen or 80% sheet |
| Desktop | ≥ 900px | Metrics ×4; filter bar inline; right drawers |

### 10.2 Requirements

- **Report Issue** always visible (header; sticky optional on scroll)  
- Metric cards readable without horizontal scroll  
- Filters behind compact **Filters** control on small screens  
- Full-width issue cards  
- Drawers → full-screen sheets  
- Touch targets ≥ ~44px  
- `inputmode` where helpful (e.g. numeric room when appropriate — still text for “24A”)  
- Sticky bottom primary actions in long sheets  
- No hover-only behaviour  
- Avoid small segmented status controls  

---

## 11. Visual direction

Reuse Hospitality Flow premium style from Handover / Hotel Brain:

- Navy, blue, white, neutrals; restrained amber for maintenance / high priority  
- Inter; existing radius and shadows  
- Clean white cards on `gray-50` page background  
- Primary buttons: existing blue gradient CTA pattern  
- Strong typographic hierarchy; quiet metadata  

**Icons that help:** small location / wrench in empty state; close (×) on drawers; filter funnel on mobile. No emoji in production UI.

**Avoid:** enterprise dashboard chrome, rainbow statuses, huge empty heroes, decorative charts, fake completion %, overly playful pills.

---

## 12. Accessibility

| Requirement | Spec |
|-------------|------|
| Headings | One `h1` Maintenance; drawer titles `h2` |
| Forms | Visible `<label for>` on every control |
| Drawers | `role="dialog"` + `aria-modal="true"` + labelled by title |
| Keyboard | Tab cycle trapped; Escape closes |
| Focus | Return to opener; visible `:focus-visible` rings (blue, existing) |
| Errors | `aria-invalid` + `aria-describedby` error id |
| Toasts | `aria-live="polite"` (assertive for failures optional) |
| Contrast | Meet WCAG AA for text and chips |
| Colour | Chip text always present; never colour-only status |

---

## 13. Navigation (Account — do not implement yet)

### 13.1 Recommended tool order

1. AI Shift Handover  
2. **Maintenance**  
3. Hotel Brain  

Rationale: operational daily tools first (Handover + Maintenance), then configuration (Hotel Brain).

### 13.2 Entry copy (for future `account.html`)

| Element | Copy |
|---------|------|
| Title | Maintenance |
| Description | Report and track hotel maintenance issues across rooms and areas. |
| CTA | Open Maintenance |
| Badge | Optional **New** for first pilot release only; remove after familiarity |

Icon: simple wrench or building-tools glyph in the same stroke style as other tool icons if Account gains icon cards later. Current Account uses text links — a third text link is enough for M2 entry:

`Maintenance` → `maintenance.html`

Do not present unfinished M3 actions as available. Do not modify `account.html` in M1.5.

Cross-links from Handover / Hotel Brain topnav: add Maintenance when the page ships (M2), matching existing cross-link density.

---

## 14. Phase boundaries

### M2 — Build from this spec

- `maintenance.html` shell + auth gates  
- Metrics, search/filters, issue cards, empty/loading/error  
- Report Issue drawer + create via store  
- Details drawer **read-only** (information + timeline if present)  
- Account link + topnav cross-link  
- Online-first cloud store  

### M3 — Workflow (defined here, not built in M2)

- Status / priority / department changes  
- Progress notes  
- Complete + resolution notes  
- Reopen  
- Optional: metric card → filter shortcut  

### Later (out of UI scope)

Photo uploads, contractors, costs, inventory, PM calendar, assets, push, chat, bulk edit, analytics charts, AI rewrite, handover auto-import logic, Hotel Brain trends, complex permissions.

---

## 15. Decisions requiring approval before M2

| # | Decision | Spec default if no reply |
|---|----------|--------------------------|
| 1 | **Guest impact column** before M2? | **Defer (Option B)** — ship without field |
| 2 | Department list: fixed v1 list vs Hotel Brain departments | **Fixed list** with Maintenance default |
| 3 | Description required on create? | **Yes** (UX required; DB allows null) |
| 4 | Default list hides Completed? | **Yes** |
| 5 | Offline create queue? | **No** — block with message |
| 6 | Create `maintenance_updates` row type `created` on insert? | **Yes** (supports timeline) |
| 7 | Account tool order | **Handover → Maintenance → Hotel Brain** |
| 8 | “New” badge on Account link | **Yes for pilot**, removable |

---

## 16. Acceptance criteria (this document)

This UI specification succeeds when it clearly defines:

1. Complete Maintenance page structure  
2. Report Issue drawer fields, copy, validation, success path  
3. Issue card hierarchy and chip language  
4. Search and filters  
5. Empty / loading / error / offline states  
6. Issue details structure and M3 actions  
7. Mobile / tablet / desktop behaviour  
8. Accessibility behaviour  
9. Navigation entry recommendation  
10. Clear M2 vs M3 boundaries  

M2 implementation should not require inventing major product decisions beyond the open approvals in §15.

---

## 17. Out of scope (UI)

Do not design screens for: photo uploads, contractor portals, costs, invoices, POs, parts inventory, preventive calendars, asset DB, native push, chat, complex permissions, bulk editing, analytics charts, AI rewriting UI, handover auto-import UI, Hotel Brain trend analysis.

---

*End of Maintenance UI v1 specification (M1.5). No production code, page edits, or migration changes were made in this phase.*
