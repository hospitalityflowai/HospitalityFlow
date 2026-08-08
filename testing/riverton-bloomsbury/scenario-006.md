# Scenario-006 — OOO Corridor — Guest Impact vs Housekeeping

## Scenario Metadata
- Hotel: The Riverton Bloomsbury (fictional)
- Scenario ID: 006
- Title: OOO Corridor — Guest Impact vs Housekeeping
- Shift: AM
- Operational load: Busy
- Departments: Engineering, Housekeeping, Reception, Duty Manager
- Difficulty: Hard
- Ambiguity intentional: Partial (release time soft)
- Spec capability: Current room state; sequencing without false “ready now”
- Matrix status: Authored / frozen (test specification)
- Date authored: 2026-08-08
- HF run: not run
- Evidence complete: No

## Original Input / Raw Source Notes

AM chaos notes — please read carefully before allocating.

ENGINEERING / OOO
1) **Room 218 — OOO** — water leak under vanity. Ceiling stain in corridor outside 218. Wet vac done overnight. Still OOO. Engineering on site from 09:30. Soft comment from eng lead: “hopefully back later today if drying ok” — **NOT a release**.
2) **Room 220 — OOO** — carpet replacement (planned). Dust sheets up. Not related to leak. Expected multi-day. Do not sell.

ARRIVAL / DEPARTURE COLLISION
- Departure **219** Mr Salgado — due out 12:00 — room is fine — not OOO
- Arrival **Ms Yuen** originally allocated **218** for tonight — **cannot** go into 218 while OOO
- Temporary idea on board: move Yuen to **222** if clean — HK has not confirmed 222 status (showed vacant dirty at 08:15)
- Due-in flip pressure: if 219 goes out on time, HK wanted 219 for a same-day turn to cover Yuen — again **not confirmed ready**

HK MESSAGE (copied):
“Waiting on eng to say 218 is actually releasable before we even think about cleaning it. 220 ignore until carpet guys finish. Please stop promising 218 to guests.”

DM:
Do not mark 218 or 220 sellable in any guest-facing conversation.
If eng gives a time, write the time — until then treat release as unknown.

Other AM clutter:
Breakfast complaint table 12 — cold eggs — F&B sorting comps — not rooms
Lost property sunglasses — tagged
rm 405 asked for late c/o to 14:00 — DM approved £25 — charge posted

### Hotel Snapshot
Arrivals 29 / Dep 33 / Stay 55 / Occ climbing / OOO 4 (218, 220, plus two long-term elsewhere) / sellable reduced

## Human Expected Truth

### Current operational facts
- **218** and **220** are **OOO**; not sellable; 218 leak work ongoing; 220 multi-day carpet.
- Soft “hopefully later today” is **not** an engineering release.
- **Yuen** cannot stay allocated to 218; alternatives (**222** or turn of **219**) are **unconfirmed**.
- **219** Salgado standard departure still expected ~12:00.
- Late c/o **405** approved with charge posted — separate.
- Breakfast complaint is F&B, not room OOO.

### Expected work states

#### OPEN
- Re-allocate / clarify room for **Yuen** away from OOO 218 (DM/reception ownership).
- Sequence: wait for real eng release before HK cleans 218; do not promise ready-now.

#### MONITOR
- Engineering progress on 218; soft later-today language without treating as released.
- 222 vacant dirty / 219 turn as possible paths — status unknown until confirmed.

#### INFORMATION
- 220 multi-day OOO; breakfast complaint; LP sunglasses; 405 late c/o charged.

#### UNRESOLVED
- Exact release time for 218 (intentional soft ambiguity).

### Must not infer / invent
- Declaring 218 or 220 sellable / ready while OOO.
- Inventing a firm engineer ETA from “hopefully”.
- Closing OOO from weak wording.
- Silently keeping Yuen on 218 as if fine.

## Actual HF Output
[NOT RUN — awaiting human review]
