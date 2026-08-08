# Meridian Gate — First-run baseline validation

**Purpose:** Freeze first HF outputs for the 20 unseen Meridian Gate scenarios against the **current Sprint 11 engine** (no code changes between runs).

> **Fictional** hotel / guests / operations. Human Expected Truth remains in `../scenario-XXX.md` and is **FROZEN BEFORE FIRST HF RUN**.

## Integrity

1. Before run: verify `../FREEZE_MANIFEST.json` SHA-256 matches each `../scenario-XXX.md`
2. Engine commit SHA recorded in every artefact (`gitCommit`)
3. Do **not** edit scenario files, HET, freeze manifest, or engine code for this baseline
4. Score Clear / Partial / Material **before** any Sprint 12 work

## Run

```bash
node testing/meridian-gate/baseline-validation/run-meridian-baseline-validation.mjs
node testing/meridian-gate/baseline-validation/score-meridian-baseline.mjs
```

## Artefacts

| File | Role |
|------|------|
| `run-meridian-baseline-validation.mjs` | Runner (current engines only) |
| `score-meridian-baseline.mjs` | HET compare + verdict draft / failure map |
| `scenario-XXX-baseline.json` / `.md` | Per-scenario first-run output |
| `MERIDIAN_BASELINE_SUMMARY.json` | Aggregate run summary |
| `MERIDIAN_BASELINE_FAILURE_MAP.json` | Verdicts + failure families |

## Out of scope

- Sprint 12 / engine fixes
- Riverton / Pilot / Zetter modifications
- Supabase / live workspace
