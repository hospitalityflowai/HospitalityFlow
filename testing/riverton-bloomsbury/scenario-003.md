# Scenario-003 — Twin Setup — Right Room Only

## Scenario Metadata
- Hotel: The Riverton Bloomsbury (fictional)
- Scenario ID: 003
- Title: Twin Setup — Right Room Only
- Shift: PM
- Operational load: Normal
- Departments: Reception, Housekeeping
- Difficulty: Moderate
- Ambiguity intentional: No
- Spec capability: Room-scoped amenity / setup binding
- Matrix status: Authored / frozen (test specification)
- Date authored: 2026-08-08
- HF run: not run
- Evidence complete: No

## Original Input / Raw Source Notes

From Jess — PM desk

Arrivals tonight worth flagging:

1) Mr Theo March & Ms Isla March — two rooms, same booking ref RB-88421
   - Room **312** Deluxe King (keep as **double/king** — do NOT twin)
   - Room **314** Deluxe Twin-capable — guest asked for **twin beds in 314 only**
   HK said 314 still made as king this morning when they walked past. Needs twin before they get in (~19:30 ETA both rooms).
   They are a couple + adult sibling; sibling in 314.

2) Ms Naomi Crane — 208 — ETA 18:00 — Expedia prepaid — no specials.

3) Mr Patel — 421 — ETA unknown — just a standard deluxe.

Also floating around the desk chat (ignore unless relevant): someone asked yesterday about loft beds for a kids party next month — not these guests.

HK WhatsApp excerpt pasted by supervisor:
“314 twin pls — March party — ONLY 314. 312 stays king. Cot not requested.”

Departures leftover noise:
- 119 checked out this morning; minibar closed already.
- 503 early departure yesterday — nothing open.

General:
Lift 1 slow but working. Not broken.
Parlour busy with tea — not related to March.

### Hotel Snapshot
- Arrivals: 28
- Departures: 22
- Stayovers: 61
- Guests In House: ~95
- Occupancy: ~74%
- OOO: 2
- left blank otherwise

## Human Expected Truth

### Current operational facts
- March party: **312** king/double must remain; **314** needs **twin** setup before ~19:30.
- Cot not requested.
- Crane 208 prepaid, no specials; Patel 421 standard — low/no special action.
- Loft / kids-party chatter is unrelated next-month noise.
- Lift slow ≠ out of order fault ticket unless framed as such (it is working).

### Expected work states

#### OPEN
- Twin setup **314** only (March) before arrival.
- Confirm **312** left as king/double (do not twin).

#### MONITOR
- Arrival ETAs for March pair.

#### INFORMATION
- Crane / Patel uneventful arrivals; house occupancy context.

#### UNRESOLVED
- None for twin scope (request is clear).

### Must not infer / invent
- Twinned both 312 and 314.
- Ignoring “only room 314”.
- Invented loft bed, welcome card, champagne, or cot for March.
- Binding twin request to Crane or Patel.

## Actual HF Output
[NOT RUN — awaiting human review]
