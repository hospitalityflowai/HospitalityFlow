# Scenario-012 — Preferred Guest Card Language Trap

## Scenario Metadata
- Hotel: The Riverton Bloomsbury (fictional)
- Scenario ID: 012
- Title: Preferred Guest Card Language Trap
- Shift: PM
- Operational load: Normal
- Departments: Reception, Housekeeping
- Difficulty: Moderate
- Ambiguity intentional: Partial
- Spec capability: Source fidelity; payment vs inventory language; amenity fail-closed
- Matrix status: Authored / frozen (test specification)
- Date authored: 2026-08-08
- HF run: not run
- Evidence complete: No

## Original Input / Raw Source Notes

Preferred guest arrival — read the words carefully.

**Mr Julian Voss** — booking RB-77219 — allocated **Deluxe King 418** (may move if we balance the house)

Notes from reservations email (pasted):
“Guarantee: **card on file**. Do not release reservation.
Complimentary upgrade **to balance availability** if a Junior Suite frees after 16:00 departures — inventory balancing only, not a paid upgrade.
Champagne: **if available** from F&B surplus — optional — not confirmed ordered.
No flowers. No fruit. No handwritten welcome card requested.”

HK already made 418 as deluxe king. Suite **508** might free — departure delayed guest still packing at 15:50 — unknown.

Reception sticky from someone helpful:
“Voss — card???” ← this is about the **guarantee card on file**, not a welcome card craft project.

Night audit reminder unrelated: tokenise walk-ins.

### Hotel Snapshot
Arrivals 24 / Dep 20 / Stay 60 / Occ ~70%

## Human Expected Truth

### Current operational facts
- Voss guaranteed with **card on file** (payment/guarantee language).
- Comp upgrade only **if** suite inventory frees — balancing language, not promised suite and not folio “paid upgrade”.
- Champagne **optional if available** — not a firm ordered amenity.
- Explicitly **no** flowers, fruit, or handwritten welcome card.
- 418 currently set deluxe; 508 free-up uncertain.

### Expected work states

#### OPEN
- Protect reservation guarantee awareness (card on file) — not craft a welcome card.
- Revisit upgrade **only if** a suitable suite actually frees; otherwise keep 418.
- Champagne only if F&B confirms surplus availability — fail closed if not confirmed.

#### MONITOR
- Whether 508 (or other suite) actually frees for balance-of-house upgrade.

#### INFORMATION
- Preferred guest status; no fruit/flowers/welcome card requested.

#### UNRESOLVED
- Champagne availability; suite upgrade feasibility — partial ambiguity by design.

### Must not infer / invent
- Welcome / handwritten card from “card on file”.
- Treating “comp upgrade to balance availability” as loft/suite already awarded.
- Inventing fruit or flowers.
- Hard-OPEN champagne as confirmed amenity without availability confirmation.

## Actual HF Output
[NOT RUN — awaiting human review]
