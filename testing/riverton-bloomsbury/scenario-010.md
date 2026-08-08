# Scenario-010 — Airport Transfer Cluster — Contacts Only

## Scenario Metadata
- Hotel: The Riverton Bloomsbury (fictional)
- Scenario ID: 010
- Title: Airport Transfer Cluster — Contacts Only
- Shift: Night
- Operational load: Busy
- Departments: Concierge, Reception, Night Manager
- Difficulty: Hard
- Ambiguity intentional: Yes (party vs named contacts)
- Spec capability: Timed transport clustering; contact binding without inventing room
- Matrix status: Authored / frozen (test specification)
- Date authored: 2026-08-08
- HF run: not run
- Evidence complete: No

## Original Input / Raw Source Notes

Concierge scraps dumped on night desk — driver WhatsApp + sticky notes. No Opera room printed on any of these.

---
Pickup Heathrow T5 — 06:40
Name on driver job: “ORBIT CORP — meet Ms Dana Lutz”
Mobile given to driver: 07xxx 662 014
Second passenger maybe? Driver asked “+1?” — office replied “tbc”
---

From email printout (partial):
“Please arrange airport collection for tomorrow morning for Lutz / Chen travelling together if Chen’s flight lands. Chen flight BA raw delayed — see app. If Chen misses connection Lutz still goes.”

Sticky:
Lutz pickup T5 0640
Chen ??? same car ???
no rooms on this printout

Also in-house coincidence (DO NOT BIND unless evidenced):
- Stayover **rm 320** Mr **Polk** — different person — asked for wake-up 07:00 — unrelated
- Arrival tonight **rm 210** Ms **Luton** (spelling!) — Expedia — no transfer on booking

Night note:
If the operational day for the pickup is clearly **tomorrow AM**, treat as timed transport for the morning team. If someone left these scraps without which calendar morning, do not force OPEN as “tonight”.

We do **not** have a room number for Lutz or Chen on these notes.

### Hotel Snapshot
Late arrivals 5 / occ ~77% / busy desk / OOO 1

## Human Expected Truth

### Current operational facts
- Timed Heathrow T5 pickup **06:40** associated with **Dana Lutz** + mobile; possible second pax **Chen** uncertain.
- **No room number** evidenced for Lutz/Chen on the transfer scraps.
- In-house **Polk 320** and arrival **Luton 210** are spelling/coincidence traps — not the transfer party unless proven.
- Pickup is morning-oriented (“tomorrow morning” / 06:40) — not a tonight drive.

### Expected work states

#### OPEN
- Morning timed transfer execution / driver meet for Lutz at T5 06:40 **if** day is established as the coming morning; bind **contacts/names/phone**, not invented rooms.
- Clarify whether Chen shares the car (tbc).

#### MONITOR
- Chen flight delay / join-or-not uncertainty.

#### INFORMATION
- Polk wake-up 07:00 separate; Luton arrival separate.

#### UNRESOLVED
- Party composition (Chen yes/no); room binding absent; if calendar day of “tomorrow” were unclear in a given paste reading, fail closed rather than invent tonight OPEN.

### Must not infer / invent
- Inventing a room number for Lutz/Chen.
- Binding pickup to **Polk** or **Luton**.
- False OPEN as tonight transport when evidence points to morning pickup.
- Collapsing Chen into confirmed passenger without evidence.

## Actual HF Output
[NOT RUN — awaiting human review]
