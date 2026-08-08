# Scenario-014 — Tokenisation Near Departure vs Far Departure

## Scenario Metadata
- Hotel: The Riverton Bloomsbury (fictional)
- Scenario ID: 014
- Title: Tokenisation Near Departure vs Far Departure
- Shift: Night
- Operational load: Busy
- Departments: Reception, Finance/Night
- Difficulty: Hard
- Ambiguity intentional: Yes (PDQ dependency clarity)
- Spec capability: Temporal payment eligibility; MONITOR vs OPEN; no false collect
- Matrix status: Authored / frozen (test specification)
- Date authored: 2026-08-08
- HF run: not run
- Evidence complete: No

## Original Input / Raw Source Notes

Night audit half-done — payment fragments.

1) **rm 203 — Mr Idris Colne**
Checkout **tomorrow AM ~10:00**
Card on booking failed tokenisation overnight (message: “token not present / needs PDQ”)
Guest currently asleep. PDQ terminal was rebooting earlier; may be fine now — **unclear if night can take PDQ without waking guest**
Do not invent an “outstanding balance collect £xxx” — no amount printed, only tokenisation flag.

2) **rm 411 — Ms Hattie Rowan**
In-house until **departing in 5 days** (Friday)
Also showing untokenised / guarantee soft warning on night report
No checkout tomorrow. Not a same-night pressure item like 203.
Day team can tidy guarantee later unless guest offers card at desk.

3) Noise lines on same report:
- rm 105 prepaid Expedia — green — ignore
- rm 519 company billed HelioSpan — ignore
- “Collect outstanding” stamped by accident on a blank line — **void / ignore**

Night manager view: nearer departure without token is the real risk; far departure is monitor/day follow-up unless policy says otherwise. PDQ dependency for 203 is messy — don’t pretend it’s a clean cash collect.

### Hotel Snapshot
Occ ~80% / Dep tomorrow 22 / busy night report

## Human Expected Truth

### Current operational facts
- **203 Colne**: checkout tomorrow AM; tokenisation failed / may need PDQ; **no evidenced collect amount**.
- **411 Rowan**: untokenised soft warning; departure in **5 days** — not equivalent urgency to 203.
- Prepaid/company lines are fine; accidental “collect outstanding” blank stamp is void.

### Expected work states

#### OPEN
- Near-term: resolve token/PDQ path for **203** before tomorrow AM checkout **if operable without false collect** — or ensure AM owns waking/PDQ if night cannot.
- Do **not** open a fabricated balance collection.

#### MONITOR
- **411** guarantee/tokenisation for later in stay / day team.
- PDQ terminal health.

#### INFORMATION
- 105 prepaid OK; 519 company billed OK; void collect stamp.

#### UNRESOLVED
- Whether night can complete PDQ for 203 without waking guest / terminal readiness (intentional ambiguity).

### Must not infer / invent
- Inventing collect outstanding amounts.
- Forcing both 203 and 411 to identical OPEN collect urgency.
- Ignoring nearer departure risk on 203.
- Treating void stamp as a real folio debt.

## Actual HF Output
[NOT RUN — awaiting human review]
