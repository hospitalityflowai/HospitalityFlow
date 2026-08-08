# Scenario-002 — Midweek PM Shuttle and Prepaid Arrival

## Freeze status
**FROZEN BEFORE FIRST HF RUN** — Original Input and Human Expected Truth must not be edited after first engine run. Fictional hotel / guests / operations only.

## Scenario Metadata
- Hotel: The Meridian Gate Hotel & Spa (fictional)
- Scenario ID: 002
- Title: Midweek PM Shuttle and Prepaid Arrival
- Date: 2026-09-09 (fictional)
- Shift: PM
- Operational load: Normal
- Prepared by: Tom Ellison — Front Office Supervisor (fictional)
- Departments: Reception, Shuttle/Transport, Concierge
- Ambiguity intentional: Low
- Matrix status: Authored / frozen (test specification)

## Original Input / Raw Source Notes

PM notes for night — normal midweek.

SHUTTLE
Driver confirms **17:40 airport loop** — 3 named pax on board already:
- Mr & Mrs Lang (booking MG-44120) — prepaid Booking.com — rooms M118 / M119
- Ms Keita — prepaid — CX08
Please ensure keys / welcome ready before van returns ~17:55. Shuttle is **not** a taxi; do not invent private transfer.

ARRIVALS
Langs + Keita as above — all prepaid, **zero balance** on arrival. Ignore any “collect channel” stamp from OTA printouts.

Also walk-in interest this afternoon for annex — we declined; annex near full. Do not promise CX stock.

SPA
Two day members finishing 18:30 — not hotel guests — Concierge can call taxi if asked. They are **not** overnight unless they book.

DONE
Champagne for M301 (Dr Hale) — placed — DONE.

Valet quiet; car park ~40% free.

### Hotel Snapshot
Arrivals 18 / Dep 11 / Stay 36 / Occ ~70% / Shuttle 17:40 active / Spa day trade winding down

## Human Expected Current Truth

### Current operational facts
- Timed shuttle 17:40 returning ~17:55 with Langs (M118/M119) and Keita (CX08); all prepaid.
- Spa day members finishing are non-resident unless they book overnight.
- Hale M301 champagne DONE.
- Annex near full; walk-in declined — no promise of CX inventory.

### Expected OPEN actions
- Honour / complete shuttle meet-and-keys readiness for Langs + Keita before ~17:55 return (Reception/Concierge ownership with Shuttle).

### Expected MONITOR items
- Spa day members to 18:30 — non-resident; taxi only if requested (not overnight conversion unless booked).

### Expected INFORMATION
- Prepaid zero-balance arrivals; valet quiet; park capacity OK; annex near-full awareness.

### Expected UNRESOLVED / clarifications
- None material.

### Explicit completed / resolved / superseded (must not reopen)
- Hale M301 champagne — DONE — must not reopen.
- Declined annex walk-in — closed; must not invent CX allocation for them.

### Important entity / room / time bindings
- Langs → M118 / M119; Keita → CX08; Hale → M301.
- Shuttle 17:40 / return ~17:55.
- Main vs Annex: Keita is Annex CX08 — do not “simplify” to Main.

### Must not invent
- False payment collect on prepaid Langs/Keita.
- Private taxi/transfer instead of evidenced shuttle.
- Overnight stay for spa day members without booking.
- Inventing free CX rooms for declined walk-in.

### Short human rationale
Normal PM: timed shuttle + prepaid arrivals are real work; payment must stay fail-closed; spa day guests stay non-resident.
