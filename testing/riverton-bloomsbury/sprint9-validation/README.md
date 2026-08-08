# Riverton Bloomsbury — Sprint 9 validation

**Label:** RIVERTON SPRINT 9 VALIDATION OUTPUT

Re-run of frozen Riverton scenarios `../scenario-001.md` … `020` through engines after **Sprint 9 — Payment Collect Fail-Closed**.

## Safety

- Does **not** modify or overwrite `../sprint8-baseline-validation/`
- Does **not** modify scenario Human Expected Truth
- Source input is identical to Sprint 8 baseline (scenario Original Input)

## Run

```bash
node testing/riverton-bloomsbury/sprint9-validation/run-riverton-sprint9-validation.mjs
node testing/riverton-bloomsbury/sprint9-validation/compare-sprint8-to-sprint9.mjs
```
