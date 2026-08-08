# Meridian Gate — Sprint 12 validation

**Objective:** Generic operational room-token identity & binding  
**Engine under test:** post–Sprint 12 (current working tree)  
**Frozen inputs:** `../scenario-001.md` … `020.md` + `../FREEZE_MANIFEST.json` (unchanged)

## Integrity

- Runner verifies freeze SHA-256 before execution
- Does **not** write to `../baseline-validation/`
- Does **not** modify scenario HET

## Run

```bash
node testing/meridian-gate/sprint12-validation/run-meridian-sprint12-validation.mjs
node testing/meridian-gate/sprint12-validation/compare-baseline-to-sprint12.mjs
```

## Primary judge

006 · 009 · 011 · 013 · 018 — room-token survival and any unlocked Sprint 11 allocation/contradiction paths.  
Do not require Clear if other capabilities remain missing.
