# Scenario-008 — Meeting Room Turnaround + Arrivals Peak

## Scenario Metadata
- Hotel: The Riverton Bloomsbury (fictional)
- Scenario ID: 008
- Title: Meeting Room Turnaround + Arrivals Peak
- Shift: PM
- Operational load: Very busy
- Departments: Events, F&B, Reception, Housekeeping
- Difficulty: Hard
- Ambiguity intentional: No
- Spec capability: Cross-department priority; events vs rooms competition
- Matrix status: Authored / frozen (test specification)
- Date authored: 2026-08-08
- HF run: not run
- Evidence complete: No

## Original Input / Raw Source Notes

**EVENTS — Meeting Room B**
Client: Northbank Analytics day hire
Session ends **16:00 sharp** (they’ve been told).
Private dining / dinner setup for same client in restaurant private dining room needs to be ready for **18:00** seating (24 pax).
F&B: linen + AV strike from MR-B must finish so porters can flip private dining. Events coordinator (Tasha) on floor until 17:30.

If MR-B overruns, dinner service slips — DM wants this treated as **hard timed operational work**, not “nice to have”.

**RECEPTION — ARRIVALS PEAK (16:30–20:00)**
Roughly 40 arrivals on the book; peak cluster 17:00–19:00.
VIP: Dr Simone Albright — **511** Junior Suite — ETA 17:30 — fruit + sparkling already in room (HK confirmed 15:40) — DONE
Early arrivals waiting in parlour with luggage: 3 parties — tags OK — rooms not ready until HK clears floors 2–3 departures

HK short-staffed one attendant (sick). Priority call from HK supervisor:
1) suite turns
2) connecting family 401/403 (arrival 18:00) — interconnect check
3) then standard deluxe pile

Do **not** pull all HK into Meeting Room B — porters + events own the function flip; HK assists only if Tasha asks for room attendants for chair reset (she hasn’t).

Misc noise someone pasted into the shift doc:
“Banquet BEO #4491 oysters on ice” — that was last Saturday’s wedding at a different venue; **not us**. Delete from mental load.

Lift 2 briefly paused 14:10 — reset — fine.

### Hotel Snapshot
Arrivals 40 / Dep 36 / Stay 70 / Occ ~92% / OOO 2 / very busy PM

## Human Expected Truth

### Current operational facts
- MR-B ends 16:00; private dining dinner setup needed by 18:00 for Northbank — hard timed events/F&B work.
- Arrivals peak overlaps; HK prioritises suites + interconnect 401/403, then deluxe.
- Albright VIP amenities already done.
- Early arrivals waiting — rooms not ready yet (HK sequence).
- Fake/other-venue BEO oysters line is irrelevant noise.
- Do not treat MR-B as a guest bedroom HK job by default.

### Expected work states

#### OPEN
- Protect MR-B strike → private dining 18:00 readiness (events/F&B/porters).
- Rooms: interconnect **401/403** check for 18:00 family; continue arrival-room readiness under HK priority list.
- Manage parlour luggage wait for early arrivals until rooms release.

#### MONITOR
- MR-B overrun risk after 16:00; arrivals queue pressure 17:00–19:00.

#### INFORMATION
- Albright VIP setup complete; house very busy; lift reset history.

#### UNRESOLVED
- None primary (deadlines clear).

### Must not infer / invent
- Ignoring the 16:00/18:00 event deadline.
- Inventing banquet BEO oyster work for Riverton.
- Treating meeting room turnaround as guest-bedroom allocation/amenity work.
- Reopening Albright fruit/sparkling as outstanding.

## Actual HF Output
[NOT RUN — awaiting human review]
