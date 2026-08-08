# Zetter Sprint 6 validation outputs

Separate from:

- Historical evidence: `../shift-00X.md`
- Post-Sprint-4 rerun: `../current-engine-rerun/`
- Sprint 5 validation: `../sprint5-validation/`

## Run

```bash
node testing/zetter-real-shifts/sprint6-validation/run-sprint6-validation.mjs
```

Writes `shift-00X-sprint6.md` / `.json` plus `SPRINT6_VALIDATION_SUMMARY.json`.

Passes CSV `handover_date` / `shift` / `created_at` into the Sprint 6 operational-day anchor.
