# Scenario-018 — Checked-Out Room vs Listed Arrival Conflict

## Scenario Metadata
- Hotel: The Riverton Bloomsbury (fictional)
- Scenario ID: 018
- Title: Checked-Out Room vs Listed Arrival Conflict
- Shift: AM
- Operational load: Very busy
- Departments: Reception, Duty Manager, Housekeeping
- Difficulty: Hard
- Ambiguity intentional: Yes (primary)
- Spec capability: Contradiction → clarify; do not invent resolution
- Matrix status: Authored / frozen (test specification)
- Date authored: 2026-08-08
- HF run: not run
- Evidence complete: No

## Original Input / Raw Source Notes

Very busy AM — contradiction on the board — escalate, don’t guess.

ARRIVAL
**Ms Renata Quill** — booking RB-66104 — due ~14:00 — system allocation **Room 315**

DEPARTURES / ROOM STATUS CONFLICT
- Room rack print (07:55): **315 CHECKED OUT** — guest name on rack **Mr Paul Kemp** — checked out 07:20 — express
- HK board (08:05): **315** still showing **stayover dirty** from night report (night may not have updated after Kemp left)
- Housekeeping WhatsApp 08:25: “315 empty when we opened door — taking as vacant dirty — starting clean”
- Meanwhile reservations chat: “Quill must stay in 315 — view room promised” 
- DM not in yet (due 09:30). Night left note: “Kemp early out — 315 should be free for turn”

So: arrival assigned to 315; evidence says Kemp out and HK starting clean; one stale line still said stayover. **Do not invent a different room** for Quill unless DM/reservations reallocate in writing. **Do not pretend there is no conflict** between stale stayover flag vs vacant dirty.

Unrelated noise trying to steal attention:
- “Collect £120 Quill” — **no** — prepaid direct — zero balance due on arrival
- VIP sparkling for **rm 510** (Ms Adebola) — already placed — DONE

Also real work:
Departure rush floors 1–2; OOO 220 carpet still

### Hotel Snapshot
Arrivals 38 / Dep 41 / Stay 55 / Occ spike after lunch / OOO 3 / very busy

## Human Expected Truth

### Current operational facts
- Quill arrival ~14:00 allocated **315**; Kemp appears checked out of 315 early; HK treating as vacant dirty / cleaning.
- Stale stayover flag conflicts with vacant dirty / checked-out evidence → **clarification**, not silent pick-a-winner beyond evidenced checkout+clean path — still must not invent a new room assignment.
- Quill is prepaid — **no £120 collect**.
- Adebola 510 amenity done.
- House very busy; OOO 220 continues.

### Expected work states

#### OPEN
- Clarify/confirm **315** readiness path for Quill with DM/HK (conflict acknowledgement + clean completion) — allocation contradiction handling.
- Continue departure/HK rush ops without inventing Quill’s room change.

#### MONITOR
- Clean progress on 315 toward 14:00 arrival.

#### INFORMATION
- Adebola amenity done; prepaid Quill; OOO 220.

#### UNRESOLVED
- Any residual contradiction between stale stayover status vs checked-out/vacant dirty until statuses aligned — intentional; do not invent “correct” alternate room.

### Must not infer / invent
- Inventing the “correct” different room for Quill without written reallocation.
- Silently dropping the conflict.
- False collect £120 on Quill.
- VIP prep invention from conflict noise; reopening Adebola sparkling.

## Actual HF Output
[NOT RUN — awaiting human review]
