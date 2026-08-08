# Scenario-005 — Interconnecting Family Block

## Scenario Metadata
- Hotel: The Riverton Bloomsbury (fictional)
- Scenario ID: 005
- Title: Interconnecting Family Block
- Shift: PM
- Operational load: Busy
- Departments: Reception, Housekeeping, Concierge
- Difficulty: Moderate
- Ambiguity intentional: No
- Spec capability: Multi-room binding; interconnect + amenity coexistence
- Matrix status: Authored / frozen (test specification)
- Date authored: 2026-08-08
- HF run: not run
- Evidence complete: No

## Original Input / Raw Source Notes

Busy board — family block is the one that will bite us if we mess rooms.

=== ARRIVALS (selected) ===
* Hargreaves family — interconnecting **412 + 414**
  ETA ~18:45 from King’s Cross
  Adults in 412, kids + nanny vibe in 414
  HK: **414 already set TWIN** this afternoon — good
  Still need: **travel cot in 414** (requested on booking; not seen in room when supervisor walked at 15:10)
  Interconnecting doors: please ensure unlocked/connectable on arrival — last week someone left 412/414 bolted from a previous stay
  Parking: they asked about partner car park — concierge sent the SMS link already (done)

* VIP Mr Elias Crowe — Junior Suite **509** — ETA 21:00 — champagne + quiet — card written already (done). Unrelated to Hargreaves. Same floor-ish; do not mix notes.

* Corporate walk-in possible — sales chasing — ignore unless named

=== HK RUN SHEET SNIPPET ===
414 twin DONE
412 king stay as is
COT 414 — not yet
Turndown list long tonight — suites first

=== CONCIERGE ===
Theatre tickets left at desk for “Hargreaves” — 2 envelopes — give on arrival
Also tickets for “Crow” (different spelling) — that’s Elias Crowe 509 — separate

Noise:
rm 221 guest wants more tea bags — HK will drop — minor
Meeting Room A water station refilled — events

### Hotel Snapshot
Arrivals 34 / Dep 27 / Stay 72 / Occ high ~88% / OOO 2

## Human Expected Truth

### Current operational facts
- Hargreaves: interconnect **412+414**; **414 twin done**; **cot still needed in 414**; interconnect doors must be usable on arrival.
- Theatre tickets at desk for Hargreaves (2 envelopes).
- Crowe VIP **509**: champagne/card already done; separate entity (“Crow” tickets spelling).
- Parking SMS already sent.
- Tea bags 221 minor HK; Meeting Room A water is events noise.

### Expected work states

#### OPEN
- Place **travel cot in 414** before/on Hargreaves arrival.
- Verify interconnect **412–414** can open (not left bolted).
- Hand Hargreaves theatre envelopes on arrival.

#### MONITOR
- Hargreaves ETA ~18:45; Crowe ETA 21:00 (VIP continuity if anything incomplete — card/champagne marked done).

#### INFORMATION
- 414 twin already complete; parking link sent; Crowe amenities done; house busy.

#### UNRESOLVED
- None for cot/interconnect scope (clear).

### Must not infer / invent
- Binding cot or twin to **412** instead of **414**.
- Merging Hargreaves with Crowe/Crow VIP notes or tickets.
- Inventing amenities for Hargreaves not evidenced (e.g. champagne in 412).
- Treating Meeting Room A water as guest-room work.

## Actual HF Output
[NOT RUN — awaiting human review]
