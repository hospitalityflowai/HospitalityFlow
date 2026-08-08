# Export saved handovers for test evidence

Replace manual Supabase Dashboard CSV exports with a controlled local CLI freeze.

**Script:** `node scripts/export-test-handovers.mjs`  
**Auth:** Supabase anon key + authenticated workspace-member account (RLS enforced)  
**Not used:** service-role keys, app save hooks, Sprint / reasoning engines

---

## Setup (once)

1. Copy `.env.test-export.example` → `.env.test-export` (gitignored).
2. Fill:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY` (anon/publishable only)
   - `TEST_EXPORT_EMAIL` / `TEST_EXPORT_PASSWORD` for a user who is a **member** of the target hotel workspace
3. Never commit `.env.test-export` or service-role keys.

---

## Workflow

### STEP A — Save normally in Hospitality Flow

Use the app as usual. Supabase `handover_reports` already stores the handover.

### STEP B — Dry run (identify records)

```bash
node scripts/export-test-handovers.mjs \
  --workspace <workspace-uuid> \
  --from-created 2026-08-01 \
  --to-created 2026-08-10 \
  --dry-run
```

Shows `id`, `created_at`, `handover_date`, `shift`, `prepared_by`, `hotel_name`. Writes nothing.

### STEP C — Freeze selected records

**Fictional Pilot Hotel (safe to commit under testing/):**

```bash
node scripts/export-test-handovers.mjs \
  --workspace <pilot-workspace-uuid> \
  --ids <id1,id2,...> \
  --hotel-label pilot-hotel \
  --out testing/pilot-hotel/exports/pilot-hotel-batch-002-001-020.csv
```

**Real hotel / Zetter (local raw by default — do not auto-commit guest data):**

```bash
node scripts/export-test-handovers.mjs \
  --workspace <zetter-workspace-uuid> \
  --ids <id1,id2,...> \
  --hotel-label zetter-real-shifts \
  --out testing/zetter-real-shifts/exports/local-raw/zetter-real-shifts-006-010.csv
```

`testing/**/exports/local-raw/` is gitignored for privacy.

Beside the CSV, the tool writes `EXPORT_MANIFEST.json` (ids, filters, SHA-256, git HEAD). Overwrite is refused unless `--force`.

### STEP D — Map / review in Cursor

Build or update shift markdown and validation from the frozen CSV.  
Engine reruns continue to write to separate folders (`sprintN-validation/`, etc.) and must not overwrite historical evidence.

---

## Safety rules

| Rule | Behaviour |
|------|-----------|
| Workspace required | `--workspace` always |
| Narrowing required | `--ids` and/or created / handover-date filters |
| Workspace verify | Abort if any row `workspace_id` ≠ `--workspace` |
| Immutability | Refuse overwrite without `--force` |
| Auth boundary | Member JWT + anon key only |
| No auto-export on save | CLI only; not wired into `saveHandover` |

---

## Offline tests

```bash
node scripts/test-export-test-handovers.mjs
```
