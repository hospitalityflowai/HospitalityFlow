# Live RLS Isolation Test Setup

**Purpose:** Prove Hospitality Flow workspace isolation with real Supabase Auth JWTs, PostgREST, and RLS — not mocked client checks.

**Suite:** `node scripts/test-live-rls-isolation.mjs`  
**Helpers:** `scripts/lib/live-rls-test-helpers.mjs`

---

## WARNING

- Use a **dedicated non-production** Supabase project only.
- **Never** point this suite at production, Zetter, real Pilot Lab, or customer data.
- The suite **refuses to run** unless `HF_RLS_TEST_ENV=non-production`.
- The suite **refuses** the known production project ref `aluxummorfhcswwpgqaf`.
- Service-role key is for **fixture setup/cleanup only**. It is never printed.
- Do not commit `.env.rls-test`, passwords, or keys.

Destructive operations only touch hotels named `HF_RLS_TEST_*` created by the suite (and prior leftover suite hotels with that prefix on the same test project).

---

## 1. Create a non-production Supabase project

1. Create a new Supabase project (e.g. `hospitality-flow-rls-test`).
2. Apply the same migrations from `supabase/migrations/` (SQL Editor or CLI) so RLS matches production intent. For Audit 2 F-01, ensure these are applied on the **test** project before the live suite:
   - `20260802140000_platform_suspend_authoritative.sql`
   - `20260802153000_rls_require_active_platform_access.sql`
   The suite’s **D2. PLATFORM SUSPENSION** block (S0–S9) proves same-JWT data-plane denial.
3. Copy the project **URL**, **anon** key, and **service_role** key from Project Settings → API.

Do **not** reuse the production project.

---

## 2. Create dedicated Auth test users

In Authentication → Users (or via the suite’s admin ensure step), create:

| Account | Role in suite |
|---------|----------------|
| Hotel A owner | Member/owner of Hotel A |
| Hotel B owner | Member/owner of Hotel B |
| Operator | `platform_operators` row; no hotel membership until OpLab attach |
| Revoked user | Temporarily member of Hotel A, then membership deleted mid-test |
| Hotel A staff (optional) | Extra member of Hotel A |

Use unique emails you control (e.g. `+rls-a@…`). Use strong passwords stored only in local env files.

The suite will also:

- Confirm emails / reset passwords via Admin API when needed
- Upsert `platform_access` (`active`) for fixture users
- Upsert `platform_operators` for the operator account

---

## 3. Configure environment variables

Copy `.env.rls-test.example` → `.env.rls-test` (gitignored) and fill values:

```bash
# Required safety gate — must be exactly:
HF_RLS_TEST_ENV=non-production

HF_RLS_TEST_SUPABASE_URL=https://YOUR_TEST_PROJECT.supabase.co
HF_RLS_TEST_ANON_KEY=your-test-anon-key
HF_RLS_TEST_SERVICE_ROLE_KEY=your-test-service-role-key

HF_RLS_TEST_HOTEL_A_OWNER_EMAIL=...
HF_RLS_TEST_HOTEL_A_OWNER_PASSWORD=...
HF_RLS_TEST_HOTEL_B_OWNER_EMAIL=...
HF_RLS_TEST_HOTEL_B_OWNER_PASSWORD=...
HF_RLS_TEST_OPERATOR_EMAIL=...
HF_RLS_TEST_OPERATOR_PASSWORD=...
HF_RLS_TEST_REVOKED_EMAIL=...
HF_RLS_TEST_REVOKED_PASSWORD=...

# Optional
# HF_RLS_TEST_HOTEL_A_STAFF_EMAIL=...
# HF_RLS_TEST_HOTEL_A_STAFF_PASSWORD=...

# Optional: treat local js/dev-flags.js as the only DEV-reset signal
# HF_RLS_TEST_ASSUME_LOCAL_DEV_FLAGS_ONLY=1
```

Variable names are also listed in `.env.local.example`.

---

## 4. Run the suite

```bash
node scripts/test-live-rls-isolation.mjs
```

Or:

```bash
npm run test:live-rls
```

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | All live isolation assertions passed |
| `1` | One or more isolation assertions failed |
| `2` | Safety/env gate failed — live proofs were **not** executed |

---

## 5. What is asserted

| Area | Scenarios |
|------|-----------|
| Hotel Brain | A read A; A cannot read/insert/update/delete B |
| Handovers | A read A; A cannot read/insert/update/delete B |
| Maintenance | A cannot read/insert/update B; workspace_id immutability |
| Operator | No membership ⇒ no A/B data; OpLab ↛ A/B; A ↛ OpLab |
| Membership removal | Same JWT loses access immediately; workspace query empty |
| Spoofing | Foreign `workspace_id` / `hotel_id` denied |
| Anonymous | No read/mutate on private tables |
| DEV reset config | Local/env check only — does not print secrets |

Each scenario prints: **PASS/FAIL**, expected, actual.

---

## 6. Password-reset DEV-mode check

The suite reports one of:

- `safely unset` — only if local flags/env look safe **and** `HF_RLS_TEST_ASSUME_LOCAL_DEV_FLAGS_ONLY=1`
- `enabled — launch blocker` — local `js/dev-flags.js` or env enables relaxed DEV reset
- `cannot verify automatically` — default when Edge Function secrets cannot be read

**Before production launch**, manually confirm in the Supabase dashboard that Edge secrets are unset:

- `PASSWORD_RESET_DEV_RELAXED`
- `PASSWORD_RESET_DEV_KEY`

---

## 7. Cleanup

After tests (and on failure paths), the suite deletes hotels named with prefix `HF_RLS_TEST_` for the current run (CASCADE removes brain/handovers/maintenance). It also sweeps leftover `HF_RLS_TEST_*` hotels on the **test** project at setup time.

Auth users are kept for reuse. Operator `platform_operators` row is kept.

---

## 8. Launch-gate interpretation

| Result | Meaning |
|--------|---------|
| Suite exit `0` on non-production | Live RLS proof **passed** for implemented scenarios |
| Exit `2` / missing env | Live proof **pending** — do **not** claim isolation is proven |
| Exit `1` | Isolation regression — **launch gate fail** |

Isolation is only “proven” when this suite has actually run successfully against your non-production project with current migrations applied.
