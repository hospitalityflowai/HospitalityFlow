# Scenario-011 — Riverton Sprint 8 BASELINE OUTPUT

**Label:** RIVERTON SPRINT 8 BASELINE OUTPUT

Human Expected Truth authority remains in `../scenario-011.md`. This file is engine output only.

## Run metadata
- Scenario: 011 — Corporate Block vs Leisure VIP Same Surname
- Shift: PM
- Load: Busy
- Difficulty: Hard
- Capability: Entity separation; amenity non-merge
- Git commit: `73e7572a09e851d322a7a16a3f0542da93062f43`
- Engine version: 1
- Ran at: 2026-08-08T12:15:37.701Z
- brainContext: `null`
- Source SHA-256: `59d9b88d60ddc8d83e19c4a394878eb595e65e39d3c47fa484824c5b0f421eb4`

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
PLEASE KEEP THESE SEPARATE — same surname, different worlds.

PARTY A — CORPORATE
Company: HelioSpan UK
Block name on folio: **Brennan**
Rooms: **205, 207, 209** (triples / colleagues)
Arrivals staggered 16:00–19:00
POA: company billed / room+breakfast — **do not take personal cash settlement narratives**
No amenities ordered for the block. Water in meeting Room A for their 09:00 tomorrow — events owns that.

PARTY B — LEISURE VIP
**Ms Camille Brennan** — Junior Suite **507**
ETA 20:30
VIP list from sales: handwritten card, seasonal fruit, still water — **for 507 only**
Prefers quiet / not near lift (507 is ok)
Personal AMEX on booking — not company.

Desk chat trap:
“Brennan fruit?” — that is Camille in **507**, not the HelioSpan rooms.
“Brennan invoice?” — HelioSpan company billing, not Camille.

Also tonight:
rm 118 noise complaint earlier — resolved
Departure taxi 06:10 tomorrow for **Mr Owen Brennan** who is **already in-house rm 312** — third Brennan! Leisure stayover, no VIP amenities, prepaid. Taxi only. Do not merge with Camille or HelioSpan.
```

## Canonical actions (Sprint 8 + temporal)

- Anchor: handover_date=2026-08-08 shift=PM created_at=2026-08-08T15:45:00.000Z
- State counts: {"open":4,"monitor":0,"information":3,"unresolved":0,"blocked":0,"resolved":0,"other":0}

- **open** `arrival_prep:high_touch` P1 — Prepare arrival amenities — fruit, welcome card
- **open** `payment:collect` P2 — Collect outstanding payment before departure
- **open** `guest_request:welcome_amenities` P2 — Arrange welcome amenities
- **open** `amenity:prep` P3 — Prepare fruit
- **information** `reservation_info` P3 — Reservation / POA information (not VIP prep)
- **information** `vip:no_active_amenity` P3 — Mr Owen Brennan — No active VIP amenity outstanding _(room 312)_ _(guest Mr Owen Brennan)_
- **information** `vip:no_active_amenity` P3 — No active VIP amenity outstanding

## AI Summary / Briefing

Priority 1
Prepare arrival amenities — fruit, welcome card.

Priority 2
Collect outstanding payment before departure.

Priority 3
Arrange welcome amenities.

Priority 4
VIP readiness follow-up for arrival — fruit and welcome card.

## Organised handover

### urgent (0)
_No items_

### vip (3)
- Departure taxi 06:10 tomorrow for **Mr Owen Brennan** who is **already in-house rm 312** — third Brennan! Leisure stayover, no VIP amenities, prepaid. Taxi only. Do not merge with Camille or HelioSpan.
- PARTY B — LEISURE VIP
- VIP list from sales: handwritten card, seasonal fruit, still water — **for 507 only**

### guest (0)
_No items_

### maintenance (0)
_No items_

### payments (1)
- Block name on folio: **Brennan**

### events (0)
_No items_

### preparations (1)
- No amenities ordered for the block. Water in meeting Room A for their 09:00 tomorrow — events owns that.

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

### general (14)
- POA: company billed / room+breakfast — **do not take personal cash settlement narratives**
- PLEASE KEEP THESE SEPARATE — same surname, different worlds.
- PARTY A — CORPORATE
- Company: HelioSpan UK
- Rooms: **205, 207, 209** (triples / colleagues)
- Arrivals staggered 16:00–19:00
- **Ms Camille Brennan** — Junior Suite **507**
- ETA 20:30
- Prefers quiet / not near lift (507 is ok)
- Personal AMEX on booking — not company.
- Desk chat trap:
- “Brennan fruit?” — that is Camille in **507**, not the HelioSpan rooms.
- “Brennan invoice?” — HelioSpan company billing, not Camille.
- Also tonight:

### completed (1)
- rm 118 noise complaint earlier — resolved

## Recommendations

1. Prepare arrival amenities — fruit, welcome card. _(priority: high, owner: Reception, status: open)_
2. Prepare fruit. _(priority: low, owner: Reception, status: open)_
3. Collect outstanding payment before departure. _(priority: normal, owner: Reception, status: open)_
4. Arrange welcome amenities. _(priority: normal, owner: Reception, status: open)_
5. Prepare arrival amenities — fruit, welcome card. _(priority: high, owner: Housekeeping, status: open)_

## Human Expected Truth (copied for side-by-side review)

### OPEN expected
- Prepare Camille VIP amenities in **507** (card/fruit/water) before ~20:30.
- Check in HelioSpan rooms as company-billed block without amenity merge.
- Ensure Owen **312** taxi 06:10 awareness for night/AM (timed departure transport).

### MONITOR expected
- Staggered HelioSpan arrivals 16:00–19:00.

### INFORMATION expected
- Resolved noise 118; MR-A water for corporate tomorrow.

### UNRESOLVED expected
- None required for identity if kept separate; ambiguity is the surname collision risk itself.

### Must not infer
- Merging Camille amenities onto 205/207/209 (or Owen).
- One payment chase covering all Brennans.
- Collapsing all Brennans to a single entity.
- Charging Camille’s amenities to HelioSpan or vice versa.

## Reasoning metadata (summary)

- Notes after pipeline: 20
- Dependency edges: 0
- Canonical actions: 7
- Quiet shift flag: null

Full machine-readable dump: `scenario-011-baseline.json`
