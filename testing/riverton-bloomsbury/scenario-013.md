# Scenario-013 — Anniversary Package Then Cancellation

## Scenario Metadata
- Hotel: The Riverton Bloomsbury (fictional)
- Scenario ID: 013
- Title: Anniversary Package Then Cancellation
- Shift: AM
- Operational load: Normal
- Departments: Housekeeping, Reception
- Difficulty: Moderate
- Ambiguity intentional: No
- Spec capability: Supersession; remaining active amenities only
- Matrix status: Authored / frozen (test specification)
- Date authored: 2026-08-08
- HF run: not run
- Evidence complete: No

## Original Input / Raw Source Notes

Chronological — please use FINAL state.

09:10 Reservations → HK:
Anniversary arrival today **Mr & Mrs Langford** rm **502** Junior Suite ETA 15:00
Package request: red roses, chocolate truffles, bottle prosecco, handwritten card

10:40 Guest emailed:
“Please cancel the roses — allergies in the family. Keep truffles and prosecco. Card still nice if possible.”

11:05 HK supervisor update:
Roses **CANCELLED — do not order / do not place**.
Truffles: ordered from supplier, ETA to hotel ~13:30
Prosecco: in fridge labelled LANGFORD 502
Card: not written yet

11:20 Someone on AM desk re-wrote an old note “Langford full anniversary package incl roses” on the arrivals printout — **that printout is stale**. Trust the 10:40/11:05 updates.

Also AM:
Departure 216 late c/o to 13:00 approved
OOO 318 still carpet — unchanged

### Hotel Snapshot
Arrivals 18 / Dep 24 / Stay 52 / Occ ~58%

## Human Expected Truth

### Current operational facts
- Langford **502** ETA ~15:00.
- **Roses cancelled** — must not be prepared.
- **Truffles** still active (on order ~13:30).
- **Prosecco** still active (in fridge labelled).
- **Handwritten card** still desired / not written yet.
- Stale “full package incl roses” printout superseded.

### Expected work states

#### OPEN
- Write card; place **truffles + prosecco** for 502; ensure **no roses**.

#### MONITOR
- Supplier delivery of truffles ~13:30 before arrival.

#### INFORMATION
- 216 late c/o; OOO 318 unchanged.

#### UNRESOLVED
- None for amenity set (supersession clear).

### Must not infer / invent
- Preparing / ordering roses after cancellation.
- Dropping truffles or prosecco because roses cancelled.
- Inventing a replacement “allergy-safe flower” package not requested.
- Preferring the stale printout over later email/HK update.

## Actual HF Output
[NOT RUN — awaiting human review]
