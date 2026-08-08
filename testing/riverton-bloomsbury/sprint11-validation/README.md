# Riverton Bloomsbury — Sprint 11 validation

**Objective:** Blocked allocation & room-status contradiction — when an arrival’s assigned/system room is evidenced unavailable, OOO, or operationally contradicted, emit OPEN allocation/clarification. Do not invent a replacement room.

**Primary judge:** scenarios **004**, **006**, **018**. Scenarios 001–020 re-run for regression visibility only.

## Frozen authorities (do not modify)

- `../scenario-001.md` … `020.md` Human Expected Truth
- `../sprint8-baseline-validation/`
- `../sprint9-validation/`
- `../sprint10-validation/`

## Run

```bash
node testing/riverton-bloomsbury/sprint11-validation/run-riverton-sprint11-validation.mjs
node testing/riverton-bloomsbury/sprint11-validation/compare-sprint10-to-sprint11.mjs
```

## Suite

```bash
node scripts/test-reasoning-sprint11-blocked-allocation.mjs
```
