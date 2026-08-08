# Zetter Sprint 7 validation outputs

Separate from:

- Historical evidence: `../shift-00X.md`
- Post-Sprint-4 rerun: `../current-engine-rerun/`
- Sprint 5 validation: `../sprint5-validation/`
- Sprint 6 validation: `../sprint6-validation/`

## Run

```bash
node testing/zetter-real-shifts/sprint7-validation/run-sprint7-validation.mjs
```

Writes `shift-00X-sprint7.md` / `.json` plus `SPRINT7_VALIDATION_SUMMARY.json`.

Does **not** modify historical, post-S4, Sprint 5, or Sprint 6 evidence.

Validates Sprint 7 canonical decision seating on the same CSV `handover_date` / `shift` / `created_at` anchors.
