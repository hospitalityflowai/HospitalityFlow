# Scenario-011 — Accessible Arrival and Interconnect Family

## Freeze status
**FROZEN BEFORE FIRST HF RUN** — Original Input and Human Expected Truth must not be edited after first engine run. Fictional hotel / guests / operations only.

## Scenario Metadata
- Hotel: The Meridian Gate Hotel & Spa (fictional)
- Scenario ID: 011
- Title: Accessible Arrival and Interconnect Family
- Date: 2026-09-16 (fictional)
- Shift: AM
- Operational load: Normal
- Prepared by: Tom Ellison — Front Office Supervisor (fictional)
- Departments: Reception, Housekeeping, Concierge
- Ambiguity intentional: Partial (interconnect ready)
- Matrix status: Authored / frozen (test specification)

## Original Input / Raw Source Notes

AM — two related room products.

ACCESSIBLE
**Mr Dilip Shah** arriving ~13:30 needs **Accessible**. Held **MA02** (Main). MA14 occupied stayover. CX03 Acc occupied until tomorrow. Do not invent a fourth accessible room — we only have three.

HK: MA02 clean as of 10:05 — good.

INTERCONNECT
**Mrs Farah + two children** — need interconnect Main pair. System shows **M114 + M115**. HK: M114 clean; M115 vacant dirty — “aim ready by 14:00” — **not confirmed**. Family due ~15:00. Do not split them across Main/Annex.

SHUTTLE
Shah requested airport shuttle **12:50** pickup — on list. Farah self-drive.

DONE
Late c/o M201 yesterday charged — closed.

### Hotel Snapshot
Arrivals 15 / Dep 10 / Stay 34 / Acc pressure / Occ ~66%

## Human Expected Current Truth

### Current operational facts
- Shah → MA02 Acc clean; only three Acc rooms in hotel; others unavailable.
- Farah family → M114/M115 interconnect; M115 VD unconfirmed ready-by-14:00.
- Shah on 12:50 shuttle list.
- Must not split family across buildings.

### Expected OPEN actions
- Protect MA02 hold / check-in path for Shah (accessible).
- Chase / clarify M115 readiness for interconnect before ~15:00 Farah arrival (HK/Reception).
- Honour Shah 12:50 shuttle listing.

### Expected MONITOR items
- Soft M115 ready-by-14:00 — not promised.

### Expected INFORMATION
- Acc inventory scarcity; Farah self-drive; closed late c/o M201.

### Expected UNRESOLVED / clarifications
- Exact M115 ready time — soft until HK confirms.

### Explicit completed / resolved / superseded (must not reopen)
- M201 late c/o charge — closed — must not reopen as live late-c/o OPEN.

### Important entity / room / time bindings
- Shah → MA02; Farah → M114+M115; shuttle 12:50; Acc set = MA02/MA14/CX03 only.

### Must not invent
- Fourth accessible room.
- Splitting family to Annex.
- Declaring M115 ready now.
- Cross-selling Acc CX03 while occupied.

### Short human rationale
Normal AM: Acc + interconnect constraints with Meridian IDs; shuttle timed honour.
