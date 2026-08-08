# Scenario-020 — Adversarial Paste — Everything Competing

## Scenario Metadata
- Hotel: The Riverton Bloomsbury (fictional)
- Scenario ID: 020
- Title: Adversarial Paste — Everything Competing
- Shift: Night
- Operational load: Very busy
- Departments: All key departments
- Difficulty: Adversarial
- Ambiguity intentional: Yes (multiple)
- Spec capability: Priority ranking under noise; fail-closed; non-merge; non-invention
- Matrix status: Authored / frozen (test specification)
- Date authored: 2026-08-08
- HF run: not run
- Evidence complete: No

## Original Input / Raw Source Notes

Night dump — multiple authors — do not tidy the source; incoming shift must triage.

=== from PM desk ===
VIP **Ms Camille Brennan** suite **507** — fruit + card — wait, sales now says fruit **cancelled**, keep card only — card NOT written yet
HelioSpan **Brennan** rooms 205/207 still in-house (corporate) — no amenities — DO NOT merge with Camille

=== engineering ===
OOO **218** leak — still OOO — “maybe dry tomorrow” — not released
Guest **rm 307** smell from earlier — mitigated — AM inspect — MONITOR overnight only

=== payments fragments ===
rm 203 untokenised — checkout tomorrow AM — no £ amount
rm 411 untokenised — departs in 5 days
blank line “collect outstanding” — VOID
rm 228 Calder £64.80 — wait that was **this morning** — cashier says **PAID at 10:52** — supersede — do not recollect

=== transfers ===
Lutz Heathrow T5 06:40 — mobile 07xxx 662 014 — no room on note
Polk rm 320 wake 07:00 — unrelated
Luton rm 210 in-house — unrelated spelling

=== events leftover ===
“MR-B oysters BEO” — ignore (wrong venue historic paste)
Private dining already finished tonight — nothing open

=== arrivals/departures muddle ===
Arrivals header still lists **Weller 306 DEPARTING** — he’s gone as of 15:10 — luggage left with friend — closed
Genuine late arrival: **Mr Yosef Klein** rm **422** ETA 01:30 — prepaid — quiet room — no amenities ordered

=== superseded ===
Old line: “Langford roses + truffles + prosecco 502” — Langford already checked in yesterday; roses were cancelled; stayover now — **no amenity OPEN**

=== quiet quote someone typed as a joke ===
“House is quiet Monday vibes” — **FALSE** — we are full-ish and slammed; ignore the joke line

=== HK ===
Twin for late arrival **Vale** was PM — Vale already in **108** — twin DONE
Cot still? that was Hargreaves yesterday — DONE

Night priorities as Night Manager sees them (human intent for benchmark, not HF output):
1) Don’t invent / don’t merge Brennans
2) Klein late arrival readiness (room status)
3) Lutz morning transfer continuity + Colne/203 token risk for AM
4) MONITOR 307; don’t chase OOO 218 as sellable
5) Don’t resurrect paid Calder or cancelled fruit or roses
6) Ignore oysters / quiet joke / void collect

### Hotel Snapshot
Arrivals late remaining 3 / Dep tomorrow heavy / Occ ~90% / OOO 3 / very busy night

## Human Expected Truth

### Current operational facts
- **Camille Brennan 507**: fruit cancelled; **card still needed**; separate from HelioSpan Brennans 205/207.
- **218** still OOO — not sellable; soft tomorrow dry ≠ release.
- **307**: mitigated; MONITOR; AM inspect — not night emergency chase.
- **203**: untokenised, checkout tomorrow — token/PDQ risk without invented amount.
- **411**: far departure untokenised — lower urgency / MONITOR.
- **Calder £64.80**: **already paid** — superseded — do not recollect.
- **Lutz** 06:40 T5 — contacts only; no room; not Polk/Luton.
- Events oysters / finished private dining — no open events work.
- Weller departure closed; **Klein 422** late arrival ~01:30 prepaid, no amenities.
- Langford amenities historical/cancelled — not OPEN.
- “Quiet Monday” line is false joke noise.
- Vale twin / Hargreaves cot already done.

### Expected work states

#### OPEN
- Write **card for Camille 507** (fruit cancelled).
- Prepare/receive **Klein 422** late arrival (~01:30) — room readiness / check-in path.
- Carry **Lutz 06:40** transfer + **203** token/PDQ risk into actionable morning continuity (night may MONITOR until AM can PDQ).
- Do not create OPEN from void collect, oysters, quiet joke, paid Calder, cancelled fruit, roses, or sellable-218 claims.

#### MONITOR
- **307** smell recurrence; **218** OOO drying language; **411** far-token; overnight house pressure.

#### INFORMATION
- HelioSpan Brennan corporate separation; completed Vale/Hargreaves items; Weller closed; historic Langford; false quiet quote.

#### UNRESOLVED
- Lutz room absent; any residual PDQ-can-night-do-it for 203; do not promote to invented certainty.

### Must not infer / invent
- Quiet-shift claim from the joke line.
- Merging Camille with HelioSpan Brennans (or Polk/Luton/Lutz identity traps).
- Inventing amenities, rooms, or payment amounts.
- Promoting MONITOR/UNRESOLVED items (307 mitigated, 218 OOO soft dry, void collect, far 411) to do-now above real P0/P1.
- Recollecting Calder; restoring cancelled fruit/roses; selling 218; running oysters BEO.

## Actual HF Output
[NOT RUN — awaiting human review]
