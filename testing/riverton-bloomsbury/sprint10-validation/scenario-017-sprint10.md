# Scenario-017 — RIVERTON SPRINT 10 VALIDATION OUTPUT

**Label:** RIVERTON SPRINT 10 VALIDATION OUTPUT

Human Expected Truth authority remains in `../scenario-017.md`. This file is engine output only.

## Run metadata
- Scenario: 017 — Arrivals Section Labels Departing Guests
- Shift: PM
- Load: Busy
- Difficulty: Hard
- Capability: Section label vs in-line truth; near vs future luggage split
- Git commit: `a50b66bf962be44667c5c4bc6b3b1acaa4bbfabc`
- Engine version: 1
- Ran at: 2026-08-08T12:52:15.683Z
- brainContext: `null`
- Source SHA-256: `137be30e77d2a232d5086777a3bae79cdfc40af68061e8bab7db36d35912a587`

## Pipeline
1. extractOperationalFact / sectionFromFact
2. consolidateNotesByFacts
3. resolveOperationalEntities (Sprint 3)
4. electCanonicalCurrentState (Sprint 1)
5. resolveOperationalDependencies (Sprint 4)
6. buildCanonicalOperationalActions (Sprint 5/6/8/10)
7. buildOrganisedSectionModel
8. buildTodaysBriefing (Sprint 8 decision seating)
9. ShiftIntelligenceEngine.analyze (Sprint 8 recommendation seating)

## Exact source input

```
### Today's Arrivals
(Front office export pasted under Arrivals header even when lines are wrong — known Opera export mess)

1. Mr Tomasz Weller — rm 306 — **DEPARTING** today — late checkout 14:00 — luggage can hold until 16:30 if needed
2. Ms Priya Nair — rm 411 — ETA 19:00 — genuine arrival — prepaid
3. Mr & Mrs Okada — rm 214 — marked “arriving” on export but folio says **in-house since Tuesday** — they are stayover; asked for **extra towels only**
4. Dr Helen Mburu — rm 503 — **DEPARTING tomorrow** — note says “EA luggage store from 10:00” — unclear if EA means early arrival for someone else or early **access for her bags tomorrow** — writing is “bags hold after c/o tomorrow AM”
5. Mr Chris Vale — rm 108 — arrival tonight 22:00 — twin setup please

### Today's Departures
(export short)
- 306 Weller — see above
- 119 Ellis — already out
- 220 Bergman — out 11:12

### General Hotel / Shift Notes
HK: do not make up a full arrivals board from the Arrivals header alone — read each line.
Concierge: long-hold luggage for a guest next **month** (Weddings — “Ferreira”) already tagged in store — INFORMATION only — not tonight’s OPEN bag run.
```

## Canonical actions (Sprint 8 + temporal)

- Anchor: handover_date=2026-08-08 shift=PM created_at=2026-08-08T15:45:00.000Z
- State counts: {"open":4,"monitor":0,"information":1,"unresolved":0,"blocked":0,"resolved":1,"other":0}

- **open** `guest_request:towels` P2 — Arrange towels for Room 214 _(room 214)_ _(guest Mrs Okada)_
- **open** `guest_request:ea_luggage_near` P2 — Honour early arrival / lunch luggage arrangements for Dr Helen Mburu (Room 503) _(room 503)_ _(guest Dr Helen Mburu)_ _(temporal: today/2026-08-09/10:00)_
- **open** `guest_request:luggage_ea` P2 — Honour luggage / early-arrival arrangements _(temporal: today/2026-08-08)_
- **information** `timed:late_checkout` P2 — Late check-out today @12 — timing appears elapsed; retain as information (Room 306) _(room 306)_ _(guest Mr Tomasz Weller)_ _(temporal: past/2026-08-08/12:00)_
- **open** `amenity:twin` P3 — Prepare twin beds for Room 108 (Mr Chris Vale) _(room 108)_ _(guest Mr Chris Vale)_
- **resolved** `payment:no_collect` exclude — Payment settled / no collect required for Room 411 _(room 411)_ _(guest Ms Priya Nair)_

## AI Summary / Briefing

Priority 1
Honour early arrival / lunch luggage arrangements for Dr Helen Mburu (Room 503).

Priority 2
Arrange towels for Room 214.

Priority 3
Honour luggage / early-arrival arrangements.

Priority 4
Complete outstanding guest follow-up for Room 306.

Priority 5
Prepare twin beds for Room 108 (Mr Chris Vale).

## Organised handover

### urgent (0)
_No items_

### vip (0)
_No items_

### guest (1)
- 1. Mr Tomasz Weller — rm 306 — **DEPARTING** today — late checkout 14:00 — luggage can hold until 16:30 if needed

### maintenance (0)
_No items_

### payments (2)
- 3. Mr & Mrs Okada — rm 214 — marked “arriving” on export but folio says **in-house since Tuesday** — they are stayover; asked for **extra towels only**
- 2. Ms Priya Nair — rm 411 — ETA 19:00 — genuine arrival — prepaid

### events (0)
_No items_

### preparations (1)
- 5. Mr Chris Vale — rm 108 — arrival tonight 22:00 — twin setup please

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

### general (11)
- 4. Dr Helen Mburu — rm 503 — **DEPARTING tomorrow** — note says “EA luggage store from 10:00” — unclear if EA means early arrival for someone else or early **access for her bags tomorrow** — writing is “bags hold after c/o tomorrow AM”
- ### Today's Arrivals
- (Front office export pasted under Arrivals header even when lines are wrong — known Opera export mess)
- ### Today's Departures
- (export short)
- - 306 Weller — see above
- - 119 Ellis — already out
- - 220 Bergman — out 11:12
- ### General Hotel / Shift Notes
- HK: do not make up a full arrivals board from the Arrivals header alone — read each line.
- Concierge: long-hold luggage for a guest next **month** (Weddings — “Ferreira”) already tagged in store — INFORMATION only — not tonight’s OPEN bag run.

### completed (0)
_No items_

## Recommendations

1. Prepare twin beds for Room 108 (Mr Chris Vale). _(priority: low, owner: Housekeeping, status: open)_
2. Arrange towels for Room 214. _(priority: normal, owner: Housekeeping, status: open)_
3. Honour early arrival / lunch luggage arrangements for Dr Helen Mburu (Room 503). _(priority: normal, owner: Reception, status: open)_
4. Honour early arrival / lunch luggage arrangements for Dr Helen Mburu (Room 503). _(priority: normal, owner: Reception, status: open)_

## Human Expected Truth (copied for side-by-side review)

### OPEN expected
- Twin setup **108 Vale** before 22:00.
- Towels for **214 Okada** if not done.
- Manage **306** late c/o / same-day luggage hold as departure work (not as arrival check-in).

### MONITOR expected
- Nair arrival ETA 19:00.

### INFORMATION expected
- Ferreira multi-week/month luggage already tagged; Bergman/Ellis already out.

### UNRESOLVED expected
- Precise interpretation of “EA” on Mburu line — but in-line “bags hold after c/o tomorrow” should prevent treating her as tonight’s arrival; avoid OPEN future luggage hold as if due tonight.

### Must not infer
- Treating all Arrivals-section rows as check-ins.
- Inventing in-house arrival status for Weller/Mburu/Okada incorrectly.
- OPEN’ing next-month Ferreira bag work as tonight’s task.
- Ignoring twin for Vale because of section noise.

## Reasoning metadata (summary)

- Notes after pipeline: 15
- Dependency edges: 0
- Canonical actions: 6
- Quiet shift flag: null

Full machine-readable dump: `scenario-017-sprint10.json`
