# Scenario-019 — Group Departure Cascade + Taxi Bundle

## Scenario Metadata
- Hotel: The Riverton Bloomsbury (fictional)
- Scenario ID: 019
- Title: Group Departure Cascade + Taxi Bundle
- Shift: AM
- Operational load: Very busy
- Departments: Concierge, Reception, Housekeeping, F&B
- Difficulty: Hard
- Ambiguity intentional: Partial
- Spec capability: Multi-room party; timed taxi vs long-horizon bags (INFORMATION)
- Matrix status: Authored / frozen (test specification)
- Date authored: 2026-08-08
- HF run: not run
- Evidence complete: No

## Original Input / Raw Source Notes

GROUP — “Aster Conference add-ons” (not full house block — 4 rooms)

Rooms: **201, 203, 205, 207** — all departing today
Contact on site: **Ms June Harlow** (in 205)

Shared taxi: **one** people-carrier booked **10:15** to St Pancras — for Harlow + 3 colleagues (names on concierge sheet: Harlow, Ng, Voss, Ibarra). Porter luggage pull from all four rooms from **09:45**.

EXCEPT:
- **Mr Ng (203)** — leaving bags for **3 weeks** — tagged hold “NG / ASTER / RETURN 29th” — already in luggage store as of last night — **NOT** going in the 10:15 taxi. He flies later with cabin bag only. Do not merge bag-hold into taxi OPEN count.

Breakfast: group wants last coffees in restaurant ~09:30 — F&B knows — not a reception collect.

HK: need all four rooms in the cascade after out — priority turns for same-day arrivals waiting on floor 2.

Partial ambiguity: Voss listed on taxi sheet — is that Julian Voss from a different booking? Concierge says no, it’s **Elena Voss** from 207. Keep Elena.

### Hotel Snapshot
Arrivals 35 / Dep 44 / Stay 50 / very busy AM

## Human Expected Truth

### Current operational facts
- Four-room departure group **201/203/205/207**; shared taxi **10:15** St Pancras; porter pull ~09:45 from rooms for travellers.
- **Ng 203** multi-week bag hold already stored — INFORMATION / not taxi cargo.
- Breakfast coffee F&B continuity.
- Elena Voss 207 on taxi — not Julian from elsewhere.
- HK needs cascade turns after group out.

### Expected work states

#### OPEN
- Execute group departure logistics: porter pull + **10:15** shared taxi for Harlow/Ng(cabin only)/Elena Voss/Ibarra as per sheet.
- HK turn sequencing for 201–207 after checkout for same-day arrivals.

#### MONITOR
- On-time 10:15 departure; restaurant coffees ~09:30 not blocking rooms.

#### INFORMATION
- Ng **3-week** luggage hold already tagged in store (long horizon).
- F&B breakfast note.

#### UNRESOLVED
- Minor name collision risk on “Voss” — resolved in notes as Elena 207; do not invent missing fifth room.

### Must not infer / invent
- Merging Ng’s multi-week bag hold into the taxi OPEN as if bags must be loaded at 10:15.
- Inventing an extra room in the party.
- Using wrong owner department alone as the only signal to drop taxi or HK turns.
- Binding Elena Voss taxi to an unrelated Julian Voss booking.

## Actual HF Output
[NOT RUN — awaiting human review]
