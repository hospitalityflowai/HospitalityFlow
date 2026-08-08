# Meridian Gate — Sprint 15 validation

**Objective:** Soft/mitigated maintenance → MONITOR; completed amenity non-reopen  
**Engine under test:** post–Sprint 15 (current working tree)  
**Frozen inputs:** `../scenario-001.md` … `020.md` + `../FREEZE_MANIFEST.json` (unchanged)

## Integrity

- Runner verifies freeze SHA-256 before execution
- Does **not** write to baseline / prior sprint validation folders
- Does **not** modify scenario HET

## Run

```bash
node testing/meridian-gate/sprint15-validation/run-meridian-sprint15-validation.mjs
node testing/meridian-gate/sprint15-validation/compare-sprint14-to-sprint15.mjs
```

## Primary judge

003 · 005 — soft CX12 MONITOR; M203 iron DONE non-reopen.  
014 is secondary transfer for soft M311 MONITOR. Spa-day conversion remains out of scope.
