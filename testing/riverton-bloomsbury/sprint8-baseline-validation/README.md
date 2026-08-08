# Riverton Bloomsbury — Sprint 8 baseline validation

**Label:** RIVERTON SPRINT 8 BASELINE OUTPUT

Frozen-evidence rerun of approved Riverton scenarios `../scenario-001.md` … `scenario-020.md` through the **current committed Sprint 8 engines** on `main`.

## Purpose

Establish how the Sprint 8 pipeline generalises to a **120-room fictional** property with new stress areas (accessible scarcity, interconnects, events/F&B, OOO/allocation, surname ambiguity, dual-horizon tasks, group departures, multi-week luggage, adversarial night paste).

## Authority

| Artefact | Role |
|----------|------|
| `../scenario-XXX.md` → Human Expected Truth | **Benchmark authority** (never derived from HF) |
| This folder → baseline JSON/MD | Frozen engine output for review |
| `RIVERTON_BASELINE_FAILURE_MAP.md` | Aggregate human assessment vs expected truth |

## Safety

- Does **not** modify `shift-intelligence-engine.js`, `ai-writing-engine.js`, Sprint 1–8 tests, Zetter/Pilot evidence, or scenario Human Expected Truth.
- Does **not** tune the engine to pass scenarios.
- `brainContext` is `null`.
- Source input is taken verbatim from each scenario’s **Original Input / Raw Source Notes** (Hotel Snapshot parsed separately when present).

## Run

```bash
node testing/riverton-bloomsbury/sprint8-baseline-validation/run-riverton-baseline-validation.mjs
```

Writes:

- `scenario-XXX-baseline.json` / `.md` (×20)
- `RIVERTON_BASELINE_SUMMARY.json`
- Regenerating overwrites **only** files in this folder.
