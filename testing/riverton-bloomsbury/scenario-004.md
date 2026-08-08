# Scenario-004 — Accessible Inventory Is Finite

## Scenario Metadata
- Hotel: The Riverton Bloomsbury (fictional)
- Scenario ID: 004
- Title: Accessible Inventory Is Finite
- Shift: PM
- Operational load: Normal
- Departments: Reception, Concierge
- Difficulty: Moderate
- Ambiguity intentional: Yes (whether alternative is confirmed)
- Spec capability: Scarce inventory / allocation advice without inventing availability
- Matrix status: Authored / frozen (test specification)
- Date authored: 2026-08-08
- HF run: not run
- Evidence complete: No

## Original Input / Raw Source Notes

Duty Manager afternoon note — please keep tidy for night:

ACCESSIBLE / MOBILITY
Mrs Lorna Whitby arriving this evening (booking RB-91002). Needs **Accessible King**. Currently showing allocated to **LG08** on the system.
Problem: LG08 is still occupied by a stayover who extended last night (Mr Crowley — medical, DM approved extension). Crowley not leaving until tomorrow midday at earliest.

Accessible stock reminder (house truth, not a promise):
- LG08 Acc — occupied / extended (Crowley)
- 116 Acc — occupied stayover
- 216 Acc — occupied stayover
- 316 Acc — OOO (shower tray — engineering, not released)
- 416 Acc — occupied stayover
- 516 Acc — **vacant dirty** after this morning’s departure — HK says “maybe ready late afternoon if we prioritise” — not promised

Concierge spoke with Mrs Whitby’s daughter (contact: Elise Whitby 07xxx 441 228). Offered:
Option A — wait for 516 once clean (no confirmed ready time)
Option B — Deluxe King near lift on floor 2 if she will accept non-accessible with staff assistance for luggage
Daughter said she will “call back after 17:00” — **no confirmed choice yet**.

Do not tell the guest we have a free accessible room unless it is actually vacant and clean.

Other PM noise:
VIP fruit basket for rm 509 (Ms Adler) — already placed — DONE
Taxi for departure rm 204 at 15:30 — already left
Restaurant 20:00 booking for 4 under “Nguyen” — F&B has it

### Hotel Snapshot
Arrivals 31 / Dep 19 / Stay 68 / Occ ~82% / OOO 3 (incl 316 Acc) / sellable pressure noted by DM

## Human Expected Truth

### Current operational facts
- Whitby needs Accessible King; system still shows **LG08** but LG08 is **not available** (Crowley extension).
- Accessible inventory is largely occupied/OOO; **516** vacant dirty with **unconfirmed** ready time.
- Alternative non-accessible near-lift option discussed; daughter will call back — **choice not confirmed**.
- Adler fruit DONE; 204 taxi already gone; Nguyen restaurant booking is F&B continuity.

### Expected work states

#### OPEN
- Allocation / guest-contact follow-up for Whitby: resolve room plan after daughter callback; do not check into LG08 while Crowley remains.
- HK prioritisation of **516** only as a possible path — not as “ready now”.

#### MONITOR
- Crowley’s extension / LG08 release tomorrow midday (not tonight’s free accessible).
- 316 Acc OOO remains out until engineering releases.

#### INFORMATION
- Accessible stock scarcity; Adler amenity completed; unrelated F&B booking.

#### UNRESOLVED
- Whether Whitby accepts 516 (when ready) vs non-accessible alternative — intentional ambiguity until callback.

### Must not infer / invent
- Inventing a free clean accessible room.
- Auto-resolving allocation as confirmed to 516 or any other Acc room.
- False “room ready” for 516.
- Checking Whitby into LG08 despite Crowley extension.
- Turning Nguyen dinner or Adler fruit into Whitby VIP package.

## Actual HF Output
[NOT RUN — awaiting human review]
