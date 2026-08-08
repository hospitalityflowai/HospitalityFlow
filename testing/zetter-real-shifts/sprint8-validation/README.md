# Zetter Sprint 8 validation outputs

Separate from:

- Historical evidence: `../shift-00X.md`
- Post-Sprint-4 rerun: `../current-engine-rerun/`
- Sprint 5 validation: `../sprint5-validation/`
- Sprint 6 validation: `../sprint6-validation/`
- Sprint 7 validation: `../sprint7-validation/`

## Run

```bash
node testing/zetter-real-shifts/sprint8-validation/run-sprint8-validation.mjs
```

Writes `shift-00X-sprint8.md` / `.json` plus `SPRINT8_VALIDATION_SUMMARY.json`.

Does **not** modify historical, post-S4, Sprint 5, Sprint 6, or Sprint 7 evidence.

Validates Sprint 8 canonical action completeness on the same CSV `handover_date` / `shift` / `created_at` anchors.
