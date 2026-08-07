# Pilot Hotel – Evidence Guide

How to record scenario runs so evidence is never lost outside the repository again.

## Why this exists

Pilot Hotel scenarios are the fixed regression suite for Hospitality Flow intelligence. Manual runs that stay in chat, notes apps, or screenshots alone cannot support a Failure Map or Reasoning Sprint. Every meaningful run must be written into the matching `scenario-XXX.md` file in this folder.

## Before you test

1. Read [hotel-profile.md](hotel-profile.md) — all scenarios use Pilot Hotel unless a file overrides a detail.
2. Open the target `scenario-XXX.md`.
3. Confirm the scenario name and focus (replace `[NOT NAMED]` / `[NOT RECORDED]` when known).
4. Fill **Test Metadata** first: date, HF version or git commit, shift, scenario focus.

## What to paste (exact text)

Under **Original Input**, paste the exact text used in the run:

| Section | Rule |
|---------|------|
| Today's Arrivals | Exact arrivals input |
| Today's Departures | Exact departures input |
| General Hotel / Shift Notes | Exact shift notes |
| Hotel Snapshot | Exact values entered, or write `left blank` if unused |

Do not paraphrase the input after the fact. If the original text is lost, write `[NOT RECORDED]` — do not reconstruct from memory and present it as the original.

## What “good enough” expected truth looks like

**Expected Current Truth** = the final operational facts HF should understand after resolving updates, corrections, and supersession.

Write short factual bullets, for example:

- Room 214 AC: still open; engineer ETA 16:00
- Smith arrival: tomorrow (not today)
- Deposit for Jones: confirmed paid — do not chase

**Expected Important Actions** = what the incoming shift genuinely needs to do. Not every source note. Not resolved history unless it still affects tonight.

## Recording actual output

Under **Actual HF Output**, paste or summarise the important generated results:

- Today's Briefing / Shift Alerts highlights
- Key guest / maintenance / follow-up items that were right or wrong
- Recommendations that mattered for the review

If full output is long, capture the decision-critical parts in the file and optionally link a supporting dump or screenshot path under **Notes**. Screenshots may support evidence; they must not replace written observations.

If output was never saved: `[NOT RECORDED]`.

## Observations and tags

1. **Observed Positives** — what HF handled correctly.
2. **Observed Failures** — what HF handled incorrectly (be specific: wrong day, wrong guest, superseded fact surviving, etc.).
3. **Failure Tags** — only tags that apply:

   - `source-of-truth`
   - `temporal`
   - `entity-resolution`
   - `state-resolution`
   - `dependency`
   - `prioritisation`
   - `deduplication`
   - `recommendation`
   - `compression`
   - `hotel-intelligence`
   - `extraction`
   - `presentation`

4. **Operational Risk** — Critical / High / Medium / Low for the worst failure in that run (or Low/none if Pass).
5. **Status** — Pass / Needs Improvement / Failed.
6. Update [SCENARIO_INDEX.md](SCENARIO_INDEX.md) in the same session.

## Evidence-complete checklist

A scenario is **evidence-complete** only when all of the following are present (not `[NOT RECORDED]`):

- [ ] Original input (arrivals / departures / notes; snapshot values or `left blank`)
- [ ] Expected Current Truth
- [ ] Actual HF Output (or a faithful written record of results)
- [ ] Observations (positives and/or failures as applicable)

Also record metadata and Status whenever possible. Missing any of the four bullets above means **Evidence Complete? = No** in the index.

## Rules that keep the suite honest

- Scenarios are fixed baselines. Prefer adding new scenarios over rewriting old ones once evidence is filled.
- Never invent inputs or results to make a later version look better.
- Use `[NOT RECORDED]` when evidence is unavailable — never invent.
- Field-testing findings from real hotels belong in [testing/field-testing/](../field-testing/); do not mix real guest data into Pilot Hotel files.
- Do not treat a scenario as analysed for intelligence review until it is evidence-complete.

## Suggested workflow (single run)

1. Fill metadata + original input before or immediately after the run.
2. Write Expected Current Truth and Expected Important Actions (can be drafted before the run).
3. Run HF.
4. Paste Actual HF Output the same day.
5. Fill positives, failures, tags, risk, status.
6. Update `SCENARIO_INDEX.md`.
7. Only then consider the run available for Failure Map / Reasoning Sprint work.

## Related files

| File | Role |
|------|------|
| [README.md](README.md) | Suite purpose and principles |
| [hotel-profile.md](hotel-profile.md) | Fixed Pilot Hotel context |
| [SCENARIO_INDEX.md](SCENARIO_INDEX.md) | Coverage and evidence status for 001–020 |
| `scenario-XXX.md` | Per-scenario evidence record |
