# Scenario-017 — Arrivals Section Labels Departing Guests

## Scenario Metadata
- Hotel: The Riverton Bloomsbury (fictional)
- Scenario ID: 017
- Title: Arrivals Section Labels Departing Guests
- Shift: PM
- Operational load: Busy
- Departments: Reception, Housekeeping
- Difficulty: Hard
- Ambiguity intentional: Yes (which day EA applies)
- Spec capability: Section label vs in-line truth; near vs future luggage split
- Matrix status: Authored / frozen (test specification)
- Date authored: 2026-08-08
- HF run: not run
- Evidence complete: No

## Original Input / Raw Source Notes

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

### Hotel Snapshot
Arrivals true ~22 / Dep ~25 / Stay high / busy PM

## Human Expected Truth

### Current operational facts
- Section header **Arrivals** is unreliable; in-line status wins.
- **Weller 306**: departing today; late c/o 14:00; possible luggage hold to 16:30.
- **Nair 411**: genuine arrival tonight prepaid.
- **Okada 214**: already in-house stayover; extra towels — not an arrival.
- **Mburu 503**: departing **tomorrow**; bags hold after tomorrow c/o — not a tonight arrival; day of bag work is tomorrow-oriented.
- **Vale 108**: arrival 22:00; needs twin.
- Ferreira next-month luggage already stored — long-horizon INFORMATION.

### Expected work states

#### OPEN
- Twin setup **108 Vale** before 22:00.
- Towels for **214 Okada** if not done.
- Manage **306** late c/o / same-day luggage hold as departure work (not as arrival check-in).

#### MONITOR
- Nair arrival ETA 19:00.

#### INFORMATION
- Ferreira multi-week/month luggage already tagged; Bergman/Ellis already out.

#### UNRESOLVED
- Precise interpretation of “EA” on Mburu line — but in-line “bags hold after c/o tomorrow” should prevent treating her as tonight’s arrival; avoid OPEN future luggage hold as if due tonight.

### Must not infer / invent
- Treating all Arrivals-section rows as check-ins.
- Inventing in-house arrival status for Weller/Mburu/Okada incorrectly.
- OPEN’ing next-month Ferreira bag work as tonight’s task.
- Ignoring twin for Vale because of section noise.

## Actual HF Output
[NOT RUN — awaiting human review]
