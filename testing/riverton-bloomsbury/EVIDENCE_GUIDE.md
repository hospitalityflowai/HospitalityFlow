# The Riverton Bloomsbury – Evidence Guide

How to record scenario runs so evidence is never lost outside the repository.

## Fictional property notice

All Riverton inputs and guests must be **fictional**. Do not paste real guest or real-hotel notes into this suite.

## Why this exists

Riverton scenarios (when created) are the generalisation regression suite for a **120-room** independent upscale London hotel. Manual runs that stay only in chat or screenshots cannot support a Failure Map or later reasoning sprints. Every meaningful run must be written into the matching `scenario-XXX.md` file in this folder.

## Before you test

1. Read [hotel-profile.md](hotel-profile.md) — all scenarios use The Riverton Bloomsbury unless a file overrides a detail.
2. Open the target `scenario-XXX.md` (files not created yet in Phase A).
3. Confirm the scenario name and focus.
4. Fill **Test Metadata** first: date, HF version or git commit, shift (AM / PM / Night), scenario focus.

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

- Room 214 AC: still open; engineer on-call overnight; AM inspect
- Smith arrival: tomorrow (not today)
- Deposit for Jones: confirmed paid — do not chase
- Interconnecting 412+414: confirmed twin in 412 only

**Expected Important Actions** = what the incoming shift genuinely needs to do. Not every source note. Not resolved history unless it still affects this shift.

## Recording actual output

Under **Actual HF Output**, paste or summarise decision-critical results:

- Today's Briefing / Shift Alerts highlights
- Key guest / maintenance / allocation / payment items that were right or wrong
- Recommendations that mattered for the review

If full output is long, capture the decision-critical parts and optionally note a supporting dump path under **Notes**. Screenshots may support evidence; they must not replace written observations.

If output was never saved: `[NOT RECORDED]`.

## Observations and tags

1. **Observed Positives** — what HF handled correctly.
2. **Observed Failures** — what HF handled incorrectly (be specific).
3. **Failure Tags** — only tags that apply, for example:

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
   - `room-status`
   - `payment-state`
   - `allocation`

4. **Operational Risk** — Critical / High / Medium / Low for the worst failure in that run (or Low/none if Pass).
5. **Status** — Pass / Needs Improvement / Failed.
6. Update [SCENARIO_INDEX.md](SCENARIO_INDEX.md) in the same session.

## Evidence-complete checklist

A scenario is **evidence-complete** only when all of the following are present (not `[NOT RECORDED]`):

- [ ] Original input (arrivals / departures / notes; snapshot values or `left blank`)
- [ ] Expected current truth
- [ ] Actual HF output / result
- [ ] Observations (positives, failures, tags, risk, status)

## Freezing saved handovers (later)

When a live Riverton workspace exists and handovers are saved in Supabase, freeze evidence with:

```bash
node scripts/export-test-handovers.mjs \
  --workspace <riverton-workspace-uuid> \
  --ids <id1,id2,...> \
  --hotel-label riverton-bloomsbury \
  --out testing/riverton-bloomsbury/exports/...
```

See [../EXPORT_TEST_HANDOVERS.md](../EXPORT_TEST_HANDOVERS.md). Phase A does **not** create a live workspace.

## Isolation rules

- Do not modify Pilot Hotel or Zetter evidence from Riverton runs.
- Do not reuse Pilot/Zetter guest identities as if they stayed at Riverton.
- Keep fictional names consistent within this suite once scenarios exist.
