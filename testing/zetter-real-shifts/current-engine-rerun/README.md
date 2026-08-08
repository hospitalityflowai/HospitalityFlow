# Zetter Real Shifts — Current Engine Rerun

**Label:** CURRENT POST-SPRINT-4 OUTPUT

## Purpose

Preserve outputs from rerunning the **exact historical `source_notes`** for Zetter Shifts 001–005 through the **current** Hospitality Flow reasoning engines on `main` (post Sprint 1–4).

These files are for before-vs-after evaluation against the approved human benchmarks in `../shift-00X.md`.

## Do not confuse with

| Label | Location |
|-------|----------|
| **HISTORICAL HF OUTPUT** | `../shift-00X.md` — frozen Supabase save |
| **CURRENT POST-SPRINT-4 OUTPUT** | this folder — fresh engine run |

## Safety

- Historical shift evidence and CSV are never overwritten by the runner.
- Engine input authority is the CSV `source_notes` (exact Supabase export).
- Shift markdown bodies are checked to match that export ignoring trailing whitespace only.
- `brainContext` is `null` (no Hotel Brain enrichment).
- Inputs are not cleaned, rewritten, or disambiguated.

## How to regenerate

```bash
node testing/zetter-real-shifts/current-engine-rerun/run-current-engine-rerun.mjs
```

Requires repo HEAD to match the recorded commit in each result file (checked at run time).
