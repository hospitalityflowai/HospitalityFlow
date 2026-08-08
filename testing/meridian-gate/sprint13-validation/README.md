# Meridian Gate — Sprint 13 validation

**Objective:** Invalid inventory / invalid product configuration  
**Engine under test:** post–Sprint 13 (current working tree)  
**Frozen inputs:** `../scenario-001.md` … `020.md` + `../FREEZE_MANIFEST.json` (unchanged)

## Integrity

- Runner verifies freeze SHA-256 before execution
- Does **not** write to `../baseline-validation/` or `../sprint12-validation/`
- Does **not** modify scenario HET

## Run

```bash
node testing/meridian-gate/sprint13-validation/run-meridian-sprint13-validation.mjs
node testing/meridian-gate/sprint13-validation/compare-sprint12-to-sprint13.mjs
```

## Primary judge

013 · 018 — invalid bedroom inventory (TR-2) and impossible Main+Annex interconnect (M152+CX10).  
Do not require 011 Clear. Do not score-chase all 20.
