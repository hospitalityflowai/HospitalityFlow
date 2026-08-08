# Scenario-020 — Riverton Sprint 8 BASELINE OUTPUT

**Label:** RIVERTON SPRINT 8 BASELINE OUTPUT

Human Expected Truth authority remains in `../scenario-020.md`. This file is engine output only.

## Run metadata
- Scenario: 020 — Adversarial Paste — Everything Competing
- Shift: Night
- Load: Very busy
- Difficulty: Adversarial
- Capability: Priority ranking under noise; fail-closed; non-merge; non-invention
- Git commit: `73e7572a09e851d322a7a16a3f0542da93062f43`
- Engine version: 1
- Ran at: 2026-08-08T12:15:37.701Z
- brainContext: `null`
- Source SHA-256: `77acb575cc117a938d4f45ba33b8732c1d7e2ee0453aa76a32e60b84e232e04a`

## Pipeline
1. extractOperationalFact / sectionFromFact
2. consolidateNotesByFacts
3. resolveOperationalEntities (Sprint 3)
4. electCanonicalCurrentState (Sprint 1)
5. resolveOperationalDependencies (Sprint 4)
6. buildCanonicalOperationalActions (Sprint 5/6/8)
7. buildOrganisedSectionModel
8. buildTodaysBriefing (Sprint 8 decision seating)
9. ShiftIntelligenceEngine.analyze (Sprint 8 recommendation seating)

## Exact source input

```
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
```

## Canonical actions (Sprint 8 + temporal)

- Anchor: handover_date=2026-08-08 shift=Night created_at=2026-08-09T00:20:00.000Z
- State counts: {"open":7,"monitor":0,"information":1,"unresolved":1,"blocked":0,"resolved":2,"other":0}

- **open** `timed:airport` P1 — Complete airport / transfer pickup at 06:40 — Lutz Heathrow _(guest Lutz Heathrow)_ _(temporal: information/06:40)_
- **open** `maintenance` P1 — Follow up open maintenance _(temporal: tomorrow/2026-08-09/inspect)_
- **open** `amenity:twin` P2 — Prepare twin beds for Twin For _(guest Twin For)_
- **open** `amenity:prep` P2 — Prepare fruit for Ms Camille Brennan _(guest Ms Camille Brennan)_
- **open** `amenity:prep` P2 — Prepare fruit for Mr Yosef Klein in Room 228 _(room 228)_ _(guest Mr Yosef Klein)_
- **unresolved** `timed:airport_fragment` P2 — Unresolved airport / transfer follow-up — confirm guest, room, and pickup time _(room 210)_ _(guest Luton)_ _(temporal: information)_
- **open** `guest_request:luggage_ea` P2 — Honour luggage / early-arrival arrangements _(temporal: information/15:10)_
- **open** `guest_request:welcome_amenities` P2 — Arrange welcome amenities for Room 205 _(room 205)_
- **information** `payment:insufficient_evidence` P3 — Payment-related note retained — insufficient evidence for collect chase
- **resolved** `guest_request` exclude — Superseded current-state fact _(guest Mr Yosef Klein)_
- **resolved** `superseded` exclude — Superseded current-state fact _(room 228)_ _(guest Mr Yosef Klein)_

## AI Summary / Briefing

Priority 1
Complete airport / transfer pickup at 06:40 — Lutz Heathrow.

Priority 2
Follow up open maintenance.

Priority 3
Prepare twin beds for Twin For.

Priority 4
Prepare fruit for Ms Camille Brennan.

## Organised handover

### urgent (0)
_No items_

### vip (1)
- VIP **Ms Camille Brennan** suite **507** — fruit + card — wait, sales now says fruit **cancelled**, keep card only — card NOT written yet

### guest (4)
- Polk rm 320 wake 07:00 — unrelated
- 3) Lutz morning transfer continuity + Colne/203 token risk for AM
- Twin for late arrival **Vale** was PM — Vale already in **108** — twin DONE
- Genuine late arrival: **Mr Yosef Klein** rm **422** ETA 01:30 — prepaid — quiet room — no amenities ordered | Old line: “Langford roses + truffles + prosecco 502” — Langford already checked in yesterday; roses were cancelled; stayover now — **no amenity OPEN**

### maintenance (1)
- OOO **218** leak — still OOO — “maybe dry tomorrow” — not released

### payments (2)
- blank line “collect outstanding” — VOID
- 5) Don’t resurrect paid Calder or cancelled fruit or roses

### events (1)
- 2) Klein late arrival readiness (room status)

### preparations (1)
- HelioSpan **Brennan** rooms 205/207 still in-house (corporate) — no amenities — DO NOT merge with Camille

### openQuestions (0)
_No items_

### tasks (0)
_No items_

### inventory (0)
_No items_

### deliveries (0)
_No items_

### lostproperty (0)
_No items_

### general (24)
- rm 203 untokenised — checkout tomorrow AM — no £ amount
- Guest **rm 307** smell from earlier — mitigated — AM inspect — MONITOR overnight only
- rm 411 untokenised — departs in 5 days
- Lutz Heathrow T5 06:40 — mobile 07xxx 662 014 — no room on note
- Luton rm 210 in-house — unrelated spelling
- Night dump — multiple authors — do not tidy the source; incoming shift must triage.
- === from PM desk ===
- === engineering ===
- === payments fragments ===
- === transfers ===
- === events leftover ===
- “MR-B oysters BEO” — ignore (wrong venue historic paste)
- Private dining already finished tonight — nothing open
- === arrivals/departures muddle ===
- Arrivals header still lists **Weller 306 DEPARTING** — he’s gone as of 15:10 — luggage left with friend — closed
- === superseded ===
- === quiet quote someone typed as a joke ===
- “House is quiet Monday vibes” — **FALSE** — we are full-ish and slammed; ignore the joke line
- === HK ===
- Night priorities as Night Manager sees them (human intent for benchmark, not HF output):
- 1) Don’t invent / don’t merge Brennans
- 4) MONITOR 307; don’t chase OOO 218 as sellable
- 6) Ignore oysters / quiet joke / void collect
- rm 228 Calder £64.80 — wait that was **this morning** — cashier says **PAID at 10:52** — supersede — do not recollect

### completed (1)
- Cot still? that was Hargreaves yesterday — DONE

## Recommendations

1. Complete airport / transfer pickup at 06:40 — Lutz Heathrow. _(priority: high, owner: Reception, status: open)_
2. Follow up open maintenance. _(priority: high, owner: Reception, status: open)_
3. Prepare twin beds for Twin For. _(priority: normal, owner: Housekeeping, status: open)_
4. Prepare fruit for Ms Camille Brennan. _(priority: normal, owner: Housekeeping, status: open)_
5. Prepare fruit for Mr Yosef Klein in Room 228. _(priority: normal, owner: Housekeeping, status: open)_
6. Honour luggage / early-arrival arrangements. _(priority: normal, owner: Reception, status: open)_

## Human Expected Truth (copied for side-by-side review)

### OPEN expected
- Write **card for Camille 507** (fruit cancelled).
- Prepare/receive **Klein 422** late arrival (~01:30) — room readiness / check-in path.
- Carry **Lutz 06:40** transfer + **203** token/PDQ risk into actionable morning continuity (night may MONITOR until AM can PDQ).
- Do not create OPEN from void collect, oysters, quiet joke, paid Calder, cancelled fruit, roses, or sellable-218 claims.

### MONITOR expected
- **307** smell recurrence; **218** OOO drying language; **411** far-token; overnight house pressure.

### INFORMATION expected
- HelioSpan Brennan corporate separation; completed Vale/Hargreaves items; Weller closed; historic Langford; false quiet quote.

### UNRESOLVED expected
- Lutz room absent; any residual PDQ-can-night-do-it for 203; do not promote to invented certainty.

### Must not infer
- Quiet-shift claim from the joke line.
- Merging Camille with HelioSpan Brennans (or Polk/Luton/Lutz identity traps).
- Inventing amenities, rooms, or payment amounts.
- Promoting MONITOR/UNRESOLVED items (307 mitigated, 218 OOO soft dry, void collect, far 411) to do-now above real P0/P1.
- Recollecting Calder; restoring cancelled fruit/roses; selling 218; running oysters BEO.

## Reasoning metadata (summary)

- Notes after pipeline: 35
- Dependency edges: 0
- Canonical actions: 11
- Quiet shift flag: null

Full machine-readable dump: `scenario-020-baseline.json`
