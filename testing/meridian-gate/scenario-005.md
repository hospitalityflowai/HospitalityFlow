# Scenario-005 — Spa Day Member Asking to Stay Overnight

## Freeze status
**FROZEN BEFORE FIRST HF RUN** — Original Input and Human Expected Truth must not be edited after first engine run. Fictional hotel / guests / operations only.

## Scenario Metadata
- Hotel: The Meridian Gate Hotel & Spa (fictional)
- Scenario ID: 005
- Title: Spa Day Member Asking to Stay Overnight
- Date: 2026-09-11 (fictional)
- Shift: PM
- Operational load: Normal
- Prepared by: Elena Vogt — Spa Concierge (fictional) / logged by FO
- Departments: Spa, Reception, Duty Manager
- Ambiguity intentional: Yes (conversion not confirmed)
- Matrix status: Authored / frozen (test specification)

## Original Input / Raw Source Notes

PM — spa desk called up.

SPA / RECEPTION
Mrs Linden is a **day spa member** today (treatments in TR-1 / TR-4 — again: treatment rooms are **not** bedrooms). She asked at 15:40 whether she can **stay overnight** tonight. Spa took a soft interest; Reception has **no confirmed overnight booking** yet. Daughter will “call back after 17:00”.

If she converts, preferred product is spa suite **MS03** if clean — HK says MS03 vacant dirty at 15:00, “hopefully late afternoon” — **not released**. Do not check her into MS03 or any room until booking + payment method confirmed.

Also: do not put her into crew quiet wing or CX “because it’s free on the screen” without DM.

OTHER
M203 iron delivered — DONE.
Shuttle 16:50 half load — routine.

### Hotel Snapshot
Arrivals 14 / Stay 38 / Spa day busy / MS03 VD unconfirmed / Occ ~72%

## Human Expected Current Truth

### Current operational facts
- Linden is day spa / non-resident until overnight booking is confirmed.
- Interest in overnight; callback after 17:00 — choice/booking not confirmed.
- MS03 vacant dirty, soft hopefully — not released; not assigned.
- Treatment rooms TR-1/TR-4 are not guest rooms.
- Iron M203 DONE.

### Expected OPEN actions
- Clarification / conversion follow-up for Linden overnight request after daughter callback — Reception/DM with Spa; do not invent completed booking.

### Expected MONITOR items
- MS03 readiness path if conversion happens — unconfirmed.
- Callback after 17:00.

### Expected INFORMATION
- Day spa status; treatment rooms not sellable; shuttle routine; iron DONE.

### Expected UNRESOLVED / clarifications
- Whether Linden converts to overnight; which room if any — intentional ambiguity until booking exists.

### Explicit completed / resolved / superseded (must not reopen)
- M203 iron — DONE — must not reopen.
- Soft spa “interest” is not a confirmed reservation — must not treat as checked-in.

### Important entity / room / time bindings
- Linden = day spa (non-resident); MS03 candidate only; TR-1/TR-4 not bedrooms; callback after 17:00.

### Must not invent
- Checking Linden into MS03/CX/quiet wing without confirmed booking.
- Treating treatment rooms as guest rooms.
- Declaring MS03 ready from “hopefully”.
- Inventing payment collect without a stay folio.

### Short human rationale
Meridian-native: spa day vs resident distinction; conversion OPEN is clarify, not silent assignment.
