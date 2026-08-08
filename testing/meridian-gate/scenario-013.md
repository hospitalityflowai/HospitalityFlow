# Scenario-013 — Treatment Room Sold as Bedroom (Adversarial)

## Freeze status
**FROZEN BEFORE FIRST HF RUN** — Original Input and Human Expected Truth must not be edited after first engine run. Fictional hotel / guests / operations only.

## Scenario Metadata
- Hotel: The Meridian Gate Hotel & Spa (fictional)
- Scenario ID: 013
- Title: Treatment Room Sold as Bedroom (Adversarial)
- Date: 2026-09-18 (fictional)
- Shift: PM
- Operational load: Adversarial / ambiguous
- Prepared by: Elena Vogt — Spa Manager (fictional) / escalated to DM
- Departments: Spa, Reception, Duty Manager, Reservations
- Ambiguity intentional: Yes (primary)
- Matrix status: Authored / frozen (test specification)

## Original Input / Raw Source Notes

Stop — do not check anyone into a treatment room.

PROBLEM
Reservations (new starter) put arrival **Mr Julian Crowe** tonight into **“TR-2”** on the booking remarks / allocation field. TR-2 is a **spa treatment room**, not a bedroom. PMS may look “empty” because treatment rooms aren’t guest inventory.

Spa: TR-2 booked for massage 19:00 day member. **Cannot** be a hotel room.

CROWE
Due ~18:30. Prepaid. Needs a real guest room. Main has **M126** vacant dirty (HK: maybe 19:30) — **not promised**. Annex CX02 clean — possible — but Crowe asked for Main near spa if possible. **No confirmed room yet** after we blocked TR-2.

DM: clarify / reallocate Crowe to a real sellable room; do not invent “TR-2 suite”. Do not use MS01–MS04 unless actually clean & assigned in writing (MS02 occupied; MS01 OOO soft lighting — not released).

Also: flowers cancelled for M130 — guest declined — **cancelled**. Do not prep.

### Hotel Snapshot
Arrivals 12 / Spa evening trade / Occ ~71% / Inventory confusion risk

## Human Expected Current Truth

### Current operational facts
- Crowe wrongly allocated to TR-2 treatment room — invalid as bedroom.
- Needs clarify/reallocate to real guest room; prepaid; preference Main near spa unconfirmed.
- M126 VD soft maybe 19:30; CX02 clean possible; MS01 soft OOO not released; MS02 occupied.
- M130 flowers cancelled/declined.

### Expected OPEN actions
- Clarify / reallocate Crowe away from TR-2 to a real sellable guest room (DM/Reception with Spa) — do not invent final room number as solved.

### Expected MONITOR items
- M126 soft ready language; MS01 soft OOO not sellable.

### Expected INFORMATION
- Prepaid Crowe; spa 19:00 massage in TR-2 for day member; cancelled flowers M130.

### Expected UNRESOLVED / clarifications
- Final room for Crowe (Main vs CX02) until written allocation — intentional.

### Explicit completed / resolved / superseded (must not reopen)
- TR-2 as bedroom allocation — invalid / superseded — must not honour as room assign.
- M130 flowers — cancelled/declined — must not OPEN amenity prep.

### Important entity / room / time bindings
- Crowe ≠ TR-2; due ~18:30; M126 / CX02 / MS* constraints; spa massage 19:00 in TR-2.

### Must not invent
- Checking Crowe into TR-2.
- Declaring MS01 sellable / released.
- Auto-assigning a specific room as confirmed without evidence.
- Preparing cancelled flowers.

### Short human rationale
Adversarial Meridian-native: treatment vs bedroom; OPEN clarify; cancelled amenity stays closed.
