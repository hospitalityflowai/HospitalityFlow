# Scenario-019 â RIVERTON SPRINT 11 VALIDATION OUTPUT

**Label:** RIVERTON SPRINT 11 VALIDATION OUTPUT

Human Expected Truth authority remains in `../scenario-019.md`. This file is engine output only.

## Run metadata
- Scenario: 019 â Group Departure Cascade + Taxi Bundle
- Shift: AM
- Load: Very busy
- Difficulty: Hard
- Capability: Multi-room party; timed taxi vs long-horizon bags (INFORMATION)
- Git commit: `d68ff55c06f885ecccace354204d6d2fc7ab9662`
- Engine version: 1
- Ran at: 2026-08-08T13:12:23.512Z
- brainContext: `null`
- Source SHA-256: `5a76a5dae58666e0b64857f60e07107ede73b1acc4a79601b5fb6d2094a74b66`

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
GROUP — “Aster Conference add-ons” (not full house block — 4 rooms)

Rooms: **201, 203, 205, 207** — all departing today
Contact on site: **Ms June Harlow** (in 205)

Shared taxi: **one** people-carrier booked **10:15** to St Pancras — for Harlow + 3 colleagues (names on concierge sheet: Harlow, Ng, Voss, Ibarra). Porter luggage pull from all four rooms from **09:45**.

EXCEPT:
- **Mr Ng (203)** — leaving bags for **3 weeks** — tagged hold “NG / ASTER / RETURN 29th” — already in luggage store as of last night — **NOT** going in the 10:15 taxi. He flies later with cabin bag only. Do not merge bag-hold into taxi OPEN count.

Breakfast: group wants last coffees in restaurant ~09:30 — F&B knows — not a reception collect.

HK: need all four rooms in the cascade after out — priority turns for same-day arrivals waiting on floor 2.

Partial ambiguity: Voss listed on taxi sheet — is that Julian Voss from a different booking? Concierge says no, it’s **Elena Voss** from 207. Keep Elena.
```

## Canonical actions (Sprint 8 + temporal)

- Anchor: handover_date=2026-08-08 shift=AM created_at=2026-08-08T07:15:00.000Z
- State counts: {"open":1,"monitor":0,"information":0,"unresolved":0,"blocked":0,"resolved":0,"other":0}

- **open** `guest_request:luggage_ea` P2 â Honour luggage / early-arrival arrangements for St Pancras _(guest St Pancras)_ _(temporal: information/10:15)_

## AI Summary / Briefing

Priority 1
Honour luggage / early-arrival arrangements for St Pancras.

## Organised handover

### urgent (0)
_No items_

### vip (0)
_No items_

### guest (1)
- Shared taxi: **one** people-carrier booked **10:15** to St Pancras — for Harlow + 3 colleagues (names on concierge sheet: Harlow, Ng, Voss, Ibarra). Porter luggage pull from all four rooms from **09:45**. | - **Mr Ng (203)** — leaving bags for **3 weeks** — tagged hold “NG / ASTER / RETURN 29th” — already in luggage store as of last night — **NOT** going in the 10:15 taxi. He flies later with cabin bag only. Do not merge bag-hold into taxi OPEN count. | Partial ambiguity: Voss listed on taxi sheet — is that Julian Voss from a different booking? Concierge says no, it’s **Elena Voss** from 207. Keep Elena. | - **Mr Ng (203)** — leaving bags for **3 weeks** — tagged hold “NG / ASTER / RETURN 29th” — already in luggage store as of last night — **NOT** going in the 10:15 taxi. He flies later with cabin bag only. Do not merge bag-hold into taxi OPEN count. | Partial ambiguity: Voss listed on taxi sheet — is that Julian Voss from a different booking? Concierge says no, it’s **Elena Voss** from 207. Keep Elena.

### maintenance (0)
_No items_

### payments (0)
_No items_

### events (0)
_No items_

### preparations (0)
_No items_

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

### general (6)
- GROUP — “Aster Conference add-ons” (not full house block — 4 rooms)
- Rooms: **201, 203, 205, 207** — all departing today
- Contact on site: **Ms June Harlow** (in 205)
- EXCEPT:
- Breakfast: group wants last coffees in restaurant ~09:30 — F&B knows — not a reception collect.
- HK: need all four rooms in the cascade after out — priority turns for same-day arrivals waiting on floor 2.

### completed (0)
_No items_

## Recommendations

1. Honour luggage / early-arrival arrangements for St Pancras. _(priority: normal, owner: Reception, status: open)_

## Human Expected Truth (copied for side-by-side review)

### OPEN expected
- Execute group departure logistics: porter pull + **10:15** shared taxi for Harlow/Ng(cabin only)/Elena Voss/Ibarra as per sheet.
- HK turn sequencing for 201–207 after checkout for same-day arrivals.

### MONITOR expected
- On-time 10:15 departure; restaurant coffees ~09:30 not blocking rooms.

### INFORMATION expected
- Ng **3-week** luggage hold already tagged in store (long horizon).
- F&B breakfast note.

### UNRESOLVED expected
- Minor name collision risk on “Voss” — resolved in notes as Elena 207; do not invent missing fifth room.

### Must not infer
- Merging Ng’s multi-week bag hold into the taxi OPEN as if bags must be loaded at 10:15.
- Inventing an extra room in the party.
- Using wrong owner department alone as the only signal to drop taxi or HK turns.
- Binding Elena Voss taxi to an unrelated Julian Voss booking.

## Reasoning metadata (summary)

- Notes after pipeline: 7
- Dependency edges: 0
- Canonical actions: 1
- Quiet shift flag: null

Full machine-readable dump: `scenario-019-sprint11.json`
