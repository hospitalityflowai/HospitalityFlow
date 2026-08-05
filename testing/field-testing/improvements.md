# Improvements

Field evidence from first real hotel shift — 4 August 2026.

---

## Add Out of Order (OOO) Rooms to Hotel Snapshot

Date: 2026-08-04  
Area: Hotel Snapshot  
Current behaviour: Hotel Snapshot does not surface an Out of Order rooms metric.  
Suggested improvement: Add an OOO Rooms metric to the Hotel Snapshot.  
Reason: Duty managers need OOO visibility alongside arrivals, departures and occupancy for an accurate house picture.  
Priority: High

---

## Strengthen visual hierarchy for Operations, Inventory and Revenue cards

Date: 2026-08-04  
Area: Hotel Snapshot / Dashboard  
Current behaviour: Operations, Inventory and Revenue cards feel empty compared with the more colourful Shift Alerts.  
Suggested improvement: Improve visual hierarchy and presence of these cards while keeping the premium design language.  
Reason: Important operational areas currently feel secondary and are easier to overlook.  
Priority: Medium

---

## Simplify guest-count cards on Hotel Snapshot

Date: 2026-08-04  
Area: Hotel Snapshot  
Current behaviour: Adults and Children are shown as separate cards alongside Guests In-House.  
Suggested improvement: Consider removing Adults and Children cards so Guests In-House is the primary guest-count signal.  
Reason: Fewer cards create a cleaner dashboard without losing the essential in-house figure.  
Priority: Medium

---

## Improve recognition of hotel operational shorthand

Date: 2026-08-04  
Area: Hotel Snapshot / Parsing  
Current behaviour: Operational shorthand is not recognised reliably enough in real handovers.  
Suggested improvement: Improve recognition of shorthand such as Arr, Dep, Stayovers, In House, ADR and Occupancy.  
Reason: Real night-audit and reception notes commonly use abbreviated metrics; missed shorthand weakens the snapshot.  
Priority: High

---

## Auto-calculate RevPAR from ADR and Occupancy

Date: 2026-08-04  
Area: Hotel Snapshot / Revenue  
Current behaviour: RevPAR appears to require manual input even when ADR and Occupancy are available.  
Suggested improvement: When ADR and Occupancy are provided, calculate RevPAR automatically.  
Reason: Removes unnecessary manual entry and reduces transcription error for a standard revenue metric.  
Priority: Medium

---

## Make Today’s Briefing an operational priority summary

Date: 2026-08-04  
Area: Today’s Briefing  
Current behaviour: Today’s Briefing can read as generic text rather than a useful operational summary.  
Suggested improvement: Produce a meaningful summary that highlights the most important priorities for the next shift.  
Reason: The briefing should help the incoming team act quickly, not restate low-value filler.  
Priority: High

---

## Improve grammar and clarity of rewritten notes

Date: 2026-08-04  
Area: Writing / Guest Follow-up  
Current behaviour: Generated wording sometimes has weak grammar or unclear phrasing.  
Suggested improvement: Improve grammar and clarity in rewritten operational text while preserving meaning.  
Reason: Reception teams need concise, professional language they can trust during a busy shift.  
Priority: Medium

---

## Group Operational Notes into coherent briefings

Date: 2026-08-04  
Area: Operational Notes  
Current behaviour: Operational Notes feel like disconnected fragments.  
Suggested improvement: Group related information naturally and create operational briefings where appropriate, instead of many isolated notes.  
Reason: Fragmented notes slow reading and increase the chance of missing linked actions.  
Priority: High

---

## Group room status, arrivals and departures logically

Date: 2026-08-04  
Area: Operational Notes / Reception  
Current behaviour: Room status changes, arrivals and departures are not consistently grouped.  
Suggested improvement: Group room status changes, arrivals and departures in a logical operational order.  
Reason: Incoming shifts scan these topics as related house-status work.  
Priority: Medium

---

## Prefer concise, actionable Shift Intelligence recommendations

Date: 2026-08-04  
Area: Shift Intelligence  
Current behaviour: Recommendations are sometimes long without adding operational value.  
Suggested improvement: Prioritise fewer, concise, actionable recommendations. Prefer accuracy over longer AI explanations. When confidence is low, avoid guessing.  
Reason: Long low-value recommendations slow handover reading and reduce trust.  
Priority: High

---

## Keep confirmed actions moving into Completed Actions

Date: 2026-08-04  
Area: Completed Actions  
Current behaviour: Completed Actions works well; confirmed actions move here automatically.  
Suggested improvement: Preserve this behaviour as a standard rule for future changes.  
Reason: Automatic completion routing reduces noise in active sections and matches how reception closes work.  
Priority: Low

---

<!-- Shift 002 — 5 August 2026 — The Zetter Marylebone (live production). Do not implement yet; continue collecting for one week. -->

## One issue, one place, one clear action

Date: 2026-08-05  
Hotel: The Zetter Marylebone  
Area: Information architecture / Printed report  
Current behaviour: The same operational issue is repeated across multiple sections, making the printed report longer than necessary.  
Suggested improvement: State each issue once, with a clear action; later sections should reference rather than restating.  
Reason: Receptionists need a short, scannable handover. Repetition slows reading and hides priorities.  
Priority: High

---

## Keep recommendations short, direct and operational

Date: 2026-08-05  
Hotel: The Zetter Marylebone  
Area: Shift Intelligence / Writing  
Current behaviour: Recommendations frequently over-explain how reception works instead of stating the next action.  
Suggested improvement: Write short, direct, operational recommendations only. No training-style explanation of reception process.  
Reason: Receptionists do not need instructions on how reception works; they need what to do next.  
Priority: High

---

## Limit Timeline to timed events

Date: 2026-08-05  
Hotel: The Zetter Marylebone  
Area: Timeline  
Current behaviour: Timeline contains ongoing tasks and repeats briefing content instead of timed events.  
Suggested improvement: Restrict Timeline to timed items such as wake-up calls, taxi bookings, late check-outs, VIP arrivals and scheduled inspections — not general reminders.  
Reason: Timeline should answer “what happens when”, not restate the briefing.  
Priority: Medium

---

## Make Hotel Status a quick hotel-health dashboard

Date: 2026-08-05  
Hotel: The Zetter Marylebone  
Area: Hotel Status  
Current behaviour: Hotel Status cards repeat information instead of summarising hotel health.  
Suggested improvement: Present a quick dashboard covering Guest Experience, Revenue, Maintenance, VIP and Operations.  
Reason: Status cards should give an at-a-glance health read, not duplicate detail from other sections.  
Priority: Medium

---

## Split Operational Notes into clear actionable items

Date: 2026-08-05  
Hotel: The Zetter Marylebone  
Area: Operational Notes  
Current behaviour: Mixed information is merged into long paragraphs.  
Suggested improvement: Separate operational facts into clear, actionable items.  
Reason: Long merged paragraphs slow scanning and bury the next action.  
Priority: Medium

---

## Strengthen Snapshot visual hierarchy and KPI emphasis

Date: 2026-08-05  
Hotel: The Zetter Marylebone  
Area: Hotel Snapshot  
Current behaviour: Snapshot works functionally but lacks visual hierarchy.  
Suggested improvement: Stronger colours, better emphasis, and potential KPI highlighting.  
Reason: Important house metrics should stand out during a live shift glance.  
Priority: Low

---

## Enrich from Hotel Brain only when it improves decisions

Date: 2026-08-05  
Hotel: The Zetter Marylebone  
Area: Hotel Brain  
Current behaviour: Enrichment sometimes adds operational explanations that were not required.  
Suggested improvement: Enrich only when the added context genuinely improves the next shift’s decisions.  
Reason: Unnecessary explanation creates noise and can look like invented operational detail.  
Priority: Medium
