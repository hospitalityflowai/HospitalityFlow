# Meridian Gate — Sprint 14 validation

**Objective:** Timed guest-transport honour & conflict clarification  
**Engine under test:** post–Sprint 14 (current working tree)  
**Frozen inputs:** `../scenario-001.md` … `020.md` + `../FREEZE_MANIFEST.json` (unchanged)

## Integrity

- Runner verifies freeze SHA-256 before execution
- Does **not** write to baseline / sprint12 / sprint13 validation folders
- Does **not** modify scenario HET

## Run

```bash
node testing/meridian-gate/sprint14-validation/run-meridian-sprint14-validation.mjs
node testing/meridian-gate/sprint14-validation/compare-sprint13-to-sprint14.mjs
```

## Primary judge

002 · 015 — timed shuttle meet/keys and accessible transport conflict.  
017 is secondary transfer only; do not force Clear on valet/crew gaps.
