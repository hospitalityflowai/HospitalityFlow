# Security Release v0.9 — Controlled Production Rollout

**Companion release note:** `docs/releases/SECURITY_RELEASE_V0.9.md`  
**Date prepared:** 2 August 2026  
**Checkpoint commit:** `f3505f4`  
**This document does not execute anything.** Do not apply migrations, deploy Edge Functions, or deploy frontend until an explicit go-ahead.

---

## Production identity (confirm visually on release day)

| Field | Expected |
|-------|----------|
| Production project ref | `aluxummorfhcswwpgqaf` |
| Security-test project ref (do **not** treat as production) | `ozxfqyuihoxokwdqollm` |
| Preferred CLI targeting | `--project-ref aluxummorfhcswwpgqaf` with explicit confirmation |
| Linked CLI state at prep time | Local `.temp` pointed at **security-test** — **do not relink to production** unless ops explicitly chooses to; prefer `--project-ref` always |

**Stop if** the dashboard URL, project name, or ref does not match production.

---

## 1. Exact production change inventory

### 1.1 Migrations

| File | Why it changed | Production needs it? | Dependency | Rollback impact |
|------|----------------|----------------------|------------|-----------------|
| `20260802140000_platform_suspend_authoritative.sql` | Suspension checked before membership/operator allow in `get_my_platform_access`, password-reset eligibility, workspace RPCs | **Yes** | None (first of the four) | Forward-fix preferred. Reverting function bodies would restore “suspended but still allowed if member” |
| `20260802153000_rls_require_active_platform_access.sql` | Adds `has_active_platform_access()` and tightens private RLS + related RPC checks | **Yes** | After 140000 | High risk to reverse. Soft-suspend would again allow PostgREST via membership alone |
| `20260802180000_early_access_submit_edge_only.sql` | Revokes anon/auth EXECUTE; hardens RPC; drops public INSERT | **Yes** | After 153000; Edge submit must be healthy before/at cutover | Re-granting public EXECUTE/INSERT reopens F-A03. Prefer keep revoked |
| `20260802182000_early_access_submit_rate_limit.sql` | Durable attempt log + `check_early_access_submit_rate_limit` (service_role) | **Yes** | After 180000; Edge uses it for 429s | Table/RPC can remain even if Edge rolls back; dropping is optional cleanup only |

### 1.2 Edge Functions

| Function | Why it changed | Production needs it? | Dependency | Rollback impact |
|----------|----------------|----------------------|------------|-----------------|
| `submit-early-access-application` | Validation shared module, durable rate limit, email-secret fail-soft | **Yes** | Migrations 180000 + 182000 applied first | Redeploy prior bundle; landing form may fail or bypass controls if DB already revoked public RPC |
| `request-password-reset` | Safe `redirectTo` reconstruction | **Yes** | `SITE_URL` secret correct; DEV secrets unset | Redeploy prior bundle; open redirects return if old code lacked allowlist |
| `invite-pilot-applicant` | Safe invite redirect + operator-auth suspend deny | **Yes** | Operator auth path; `SITE_URL` / invite redirect env | Redeploy prior bundle |
| `list-pilot-applications` | Picks up `_shared/operator-auth.ts` suspension deny | **Yes** (redeploy even if index.ts unchanged) | Shared operator-auth | Redeploy prior bundle |

### 1.3 Shared Edge modules (deployed with functions)

| Module | Why | Production needs it? | Dependency | Rollback |
|--------|-----|----------------------|------------|----------|
| `_shared/operator-auth.ts` | Suspended operators denied | Bundled into invite/list | Deploy those functions | Via function redeploy |
| `_shared/safe-redirect.ts` | Allowlisted Auth redirects | Bundled into reset/invite | Deploy those functions | Via function redeploy |
| `_shared/early-access-submit.ts` | Shared validation / rate-limit helpers | Bundled into submit | Migrations 180/182 | Via function redeploy |

### 1.4 Frontend / auth

| Item | Why | Production needs it? | Dependency | Rollback |
|------|-----|----------------------|------------|----------|
| `js/safe-redirect.js` | Browser allowlist | **Yes** | Deploy with pages that load it | Prior Git/hosting revision |
| `js/auth.js` | Uses safe redirects; suspended messaging | **Yes** | After/with platform-access | Prior revision |
| `js/platform-access.js` | Suspension UX, cache clear, post-login guards | **Yes** | DB 140000 behaviour | Prior revision |
| `js/workspace.js` | Access before membership; suspended UI | **Yes** | platform-access | Prior revision |
| `js/operator-dashboard.js` | Suspended operator denied in UI | **Yes** | operator Edge + DB | Prior revision |
| HTML pages loading `safe-redirect.js` before auth | Script order for allowlist | **Yes** | Static hosting deploy | Prior revision |
| `login.html`, `signup.html`, `forgot-password.html`, `reset-password.html`, `account.html`, `handover.html`, `hotel-profile.html`, `maintenance.html`, `operator.html`, `sop.html` | Include/order updates | **Yes** | Same frontend deploy | Prior revision |

`js/early-access.js` already targets the Edge Function; no separate F-A03 frontend redesign required, but production Edge + migrations must match.

### 1.5 Not required for production runtime

- Live test scripts and `.env.rls-test` (harness only)
- Security-test-only fixtures
- `supabase/.temp/*` (local CLI cache; ignored)

---

## 2. Deployment order

### Phase 0 — Preflight

1. Confirm Git checkpoint includes security work (`f3505f4` or later equivalent on the deploy branch).
2. Visually confirm production project ref `aluxummorfhcswwpgqaf` in the Supabase dashboard.
3. Confirm local CLI is **not** accidentally assumed to be production. Prefer explicit `--project-ref aluxummorfhcswwpgqaf`. Do **not** run `supabase link` to production unless ops explicitly requires it.
4. Export / snapshot what is practical:
   - Record current Edge Function deploy times/versions from the dashboard
   - Export current definitions for key functions/grants if tooling allows (SQL Editor snapshots of `has_active_platform_access` absence, `submit_early_access_application` grants, sample RLS policy names)
   - Confirm database backup / PITR posture for the project
5. Confirm secrets on **production** Edge:
   - `SITE_URL` correct for production site
   - `PILOT_INVITE_REDIRECT_TO` (if set) must be an allowlisted production URL
   - `EARLY_ACCESS_EMAILS_INTERNAL_SECRET` present and matches `send-early-access-emails`
   - `RESEND_API_KEY` / `RESEND_FROM_EMAIL` as required for email
   - **`PASSWORD_RESET_DEV_RELAXED` and `PASSWORD_RESET_DEV_KEY` must be unset**
6. Confirm maintenance window, rollback owner, and communicator.
7. Confirm smoke-test accounts (see §6) — **approved fixtures only**.

**Stop conditions (Phase 0):** wrong project ref; DEV reset secrets present; no backup/PITR confidence; no rollback owner; deploy branch missing migrations or Edge sources.

---

### Phase 1 — Database migrations

Apply **one at a time** with `--project-ref aluxummorfhcswwpgqaf` (or dashboard SQL Editor with the production project visibly selected). Never `supabase db reset`.

#### Migration 1 — `20260802140000_platform_suspend_authoritative.sql`

**Verify (SQL Editor, production):**

```sql
-- Suspended path must short-circuit before membership allow (inspect function source)
select pg_get_functiondef('public.get_my_platform_access()'::regprocedure);
-- Expect comment/logic mentioning suspension before membership success paths
```

Optional behavioural check only with an **approved** suspended test account (not a real pilot without approval):

```sql
-- As that user via app login: get_my_platform_access → allowed=false, reason SUSPENDED
```

**Stop if:** function replace errors; unexpected dependency errors.

#### Migration 2 — `20260802153000_rls_require_active_platform_access.sql`

**Verify:**

```sql
select public.has_active_platform_access(); -- as SQL Editor may be null uid → false is OK

select polname, tablename
from pg_policies
where schemaname = 'public'
  and tablename in (
    'hotels', 'hotel_members', 'hotel_brain_profiles',
    'handover_reports', 'maintenance_tickets' -- adjust names if production differs
  )
order by tablename, polname;
```

Confirm policies reference `has_active_platform_access` where expected for private operational tables.

**Stop if:** policy create fails; helper missing EXECUTE for `authenticated`.

#### Migration 3 — `20260802180000_early_access_submit_edge_only.sql`

**Verify:**

```sql
select
  has_function_privilege('anon', 'public.submit_early_access_application(text,text,text,text,integer,text,text)', 'execute') as anon_exec,
  has_function_privilege('authenticated', 'public.submit_early_access_application(text,text,text,text,integer,text,text)', 'execute') as auth_exec,
  has_function_privilege('service_role', 'public.submit_early_access_application(text,text,text,text,integer,text,text)', 'execute') as service_exec;
-- Expect: false, false, true
```

**Stop if:** service_role lost EXECUTE; migration error mid-revoke (fix grants before continuing).

**Note:** After this migration, browser PostgREST RPC submit is dead. Edge Function **must** be redeployed in Phase 2 promptly (landing form depends on Edge).

#### Migration 4 — `20260802182000_early_access_submit_rate_limit.sql`

**Verify:**

```sql
select to_regclass('public.early_access_submit_attempts') is not null as attempts_table_exists;

select
  has_function_privilege('anon', 'public.check_early_access_submit_rate_limit(text,integer,integer)', 'execute') as anon_rl,
  has_function_privilege('service_role', 'public.check_early_access_submit_rate_limit(text,integer,integer)', 'execute') as service_rl;
-- Expect: false, true
```

**Stop if:** table/RPC missing for service_role.

---

### Phase 2 — Edge Functions

Deploy order (production `--project-ref` explicit):

1. `submit-early-access-application` (unblocks landing form after migration 3)
2. `request-password-reset`
3. `invite-pilot-applicant`
4. `list-pilot-applications`

After **each** deploy:

- Dashboard shows new updated timestamp
- Health check:
  - submit: OPTIONS/CORS + one synthetic valid submit **only if** using a disposable test email agreed for production (or wait for Phase 4)
  - reset: POST with unknown email returns neutral success shape (no user enumeration)
  - list: non-operator JWT → denied; operator JWT → 200
  - invite: non-operator → denied (do not invite real applicants during deploy)

**Stop if:** deploy error; 5xx on health check; secrets missing; DEV reset secrets appear.

---

### Phase 3 — Frontend

Deploy static site (Vercel/hosting) **only after** Phase 1 + Phase 2 checks pass.

Verify:

- Hard refresh / cache bust on `login.html`, `account.html`, `operator.html`
- `safe-redirect.js` loads **before** `auth.js`
- Login with `?redirect=https://evil.example` does **not** leave the site
- No stale cached `auth.js` without allowlist (check Network tab hashes/timestamps)

**Stop if:** old assets still served; login broken for active owner fixture.

---

### Phase 4 — Production smoke tests

See §5 checklist and §6 safety rules. Use **approved fixtures only**. Do **not** run `npm run test:live-*` against production.

---

## 3. Rollback plan

### Principles

1. **Prefer forward-fix** for security migrations. Undoing them often reopens the exact holes Gates #1–#3 closed.
2. Do not invent destructive “DROP everything” SQL without a proven, reviewed restore path.
3. Database rollback ≠ delete customer data.

### Phase 0 failure

- **Trigger:** wrong project, missing backup confidence, DEV secrets present  
- **Action:** do not start Phase 1  
- **Rollback:** N/A

### Phase 1 — migrations applied (partial or full)

| Situation | Trigger | Action |
|-----------|---------|--------|
| Migration 1 fails mid-apply | SQL error | Stop. Inspect function state. Re-run only if safe/idempotent (`CREATE OR REPLACE`). Do not proceed to 2 |
| Migration 1–2 applied, severe login/data outage | Active owners cannot access data incorrectly | **Forward-fix** with hotfix if logic bug; do **not** casually drop `has_active_platform_access` (reopens suspend bypass). Escalate to rollback owner |
| Migration 3 applied, Edge not yet deployed | Landing early-access form broken | **Proceed immediately to Phase 2** deploy of `submit-early-access-application`. Do **not** re-grant anon EXECUTE as “fix” unless form is down and Edge cannot deploy — and treat re-grant as emergency with time-boxed follow-up |
| Want to “undo” RLS hardening | Pressure to reverse | **Decline** unless a full prior schema restore from backup/PITR is approved. Document that reverse reopens F-01 |

**Database rollback limitations:**

- No safe automated down-migration ships with these files
- Restoring pre-v0.9 policy text requires re-applying earlier phase migrations carefully and is easy to get wrong
- PITR / backup restore is the only full structural undo — last resort, maintenance-window only

### Phase 2 — Edge deployed, something wrong

| Situation | Trigger | Action |
|-----------|---------|--------|
| New Edge 5xx | Health check fail | Redeploy **previous** known-good version of that function from Git tag/commit prior to v0.9 |
| Migration 3 done + Edge rolled back to old submit | Old Edge may still call RPC as service_role — OK if service_role grant remains | Prefer keep new Edge; if must roll back Edge, confirm service_role path still works |
| Reset/invite redirect bugs | Open redirect reports | Redeploy prior function **or** hotfix forward with allowlist |

### Phase 3 — Frontend fails after DB + Edge OK

| Situation | Trigger | Action |
|-----------|---------|--------|
| Bad JS / cache | Login/UI broken | Redeploy previous frontend revision (Git/Vercel). **Keep** DB + Edge security hardening |
| Mismatch UX only | Suspended messaging odd | Frontend rollback or forward hotfix; security posture stays |

**Safe handling: migrations succeed, frontend fails** → roll back frontend only; keep DB/Edge.

**Safe handling: Edge succeeds, migration fails** → do not leave partial revoke without understanding grants; fix migration forward; avoid deploying remaining Edge until DB verified. If submit Edge is new but migration 3 not applied, public RPC bypass may still exist — **do not claim F-A03 closed**.

### User communication

If login or password reset is temporarily unavailable:

1. Pause invites and marketing CTAs that depend on auth
2. Status note: “Account sign-in / reset temporarily unavailable while we complete a security update”
3. Do not ask users to “try suspending” or clear production memberships
4. Prefer short maintenance window messaging over silent failure

---

## 4. Production verification checklist (release day)

- [ ] Correct production project visibly confirmed (`aluxummorfhcswwpgqaf`)
- [ ] Backup / PITR / export completed or confirmed
- [ ] Rollback owner and communicator named
- [ ] Production Edge secrets confirmed (SITE_URL, email secrets; DEV reset secrets **absent**)
- [ ] Migration 1 applied and verified (`20260802140000_…`)
- [ ] Migration 2 applied and verified (`20260802153000_…`)
- [ ] Migration 3 applied and verified (`20260802180000_…`)
- [ ] Migration 4 applied and verified (`20260802182000_…`)
- [ ] Edge `submit-early-access-application` deployed and checked
- [ ] Edge `request-password-reset` deployed and checked
- [ ] Edge `invite-pilot-applicant` deployed and checked
- [ ] Edge `list-pilot-applications` deployed and checked
- [ ] Frontend deployed (cache bust verified)
- [ ] Login smoke passed (active owner)
- [ ] Login smoke passed (normal member)
- [ ] Login smoke passed (operator)
- [ ] Reset smoke passed (neutral response; eligible fixture if approved)
- [ ] Invitation smoke passed (operator allow / non-operator deny) — **no unsolicited real invites**
- [ ] Suspended-user denial passed (**approved fixture only**)
- [ ] Operator denial/allow checks passed
- [ ] Hotel Brain read/write passed (fixture hotel)
- [ ] Handover save/read passed (fixture hotel)
- [ ] Maintenance read/write passed (fixture hotel)
- [ ] Early-access application via Edge passed (disposable email)
- [ ] Anonymous access denied (spot-check private tables / app routes)
- [ ] Redirect abuse denied (`?redirect=` external)
- [ ] Monitoring / error logs reviewed
- [ ] Release signed off (name + time)

---

## 5. Smoke-test plan (safe production)

Use a **dedicated production smoke hotel / accounts** approved in advance. If none exist, create a clearly named non-customer workspace **before** the window — do not invent data inside a real pilot hotel.

| Check | How (safe) | Pass criteria |
|-------|------------|---------------|
| Active owner login | Smoke owner account | Reaches account/workspace |
| Normal member login | Smoke member | Reaches allowed tools |
| Operator login | Smoke operator | Operator dashboard loads |
| Suspended denial | **Pre-approved** smoke user temporarily suspended, then restored | Denied app + no Brain/handover/maintenance reads; **unsuspend after** |
| Hotel Brain | Smoke hotel only | Read/write OK |
| Handover | Smoke hotel only | Save/read OK |
| Maintenance | Smoke hotel only | Read/write OK |
| Password reset request | Smoke or unknown email | Neutral response; no 5xx |
| Early-access | Disposable email | Edge 200; row via operator list or service check |
| Invite/list | Operator vs non-operator | List deny/allow; **do not invite real applicants** unless planned |
| Anonymous | Logged-out browser | Private pages redirect; PostgREST private reads empty/denied |
| Redirect abuse | `login.html?redirect=https://example.com` | Stays on allowlisted app path |
| Cross-hotel | Only if **two smoke hotels** exist | A cannot read B |

---

## 6. Production test safety — prohibited

**Do not:**

- Delete real customer memberships for testing
- Suspend real pilot users without explicit approval (and restore plan)
- Create fake operational data inside a real hotel workspace (including Zetter)
- Use Zetter data for destructive or isolation experiments
- Run the full non-production harness (`test:live-rls`, `test:live-auth`, `test:live-authorization`, `test:live-early-access-submit`) against production
- Print or screenshot service-role keys, JWTs, or passwords
- Run `supabase db reset` (local or linked)
- Apply migrations with an unverified `--linked` target
- Relink the CLI to production “just in case” without ops decision
- Assume security-test proof means production is already updated

**Do:**

- Use approved smoke fixtures
- Prefer read-only / reversible checks
- Keep a written restore step for any temporary suspend of a smoke user
- Target production with an explicit, double-checked project ref

---

## 7. Stop conditions (summary)

Stop the rollout and escalate if any of these occur:

1. Project ref / dashboard identity mismatch  
2. DEV password-reset secrets found on production  
3. Any migration errors or verification SQL fails  
4. Edge deploy failure or sustained 5xx on auth/submit paths  
5. Active smoke owner cannot log in after frontend deploy  
6. Early-access landing path down after migration 3 without successful Edge deploy  
7. Evidence that customer hotel data is incorrectly denied for active (non-suspended) members  
8. Uncertainty whether commands target production vs security-test  

---

## 8. Manual secrets / checks required

| Check | Owner action |
|-------|----------------|
| `PASSWORD_RESET_DEV_RELAXED` unset | Dashboard → Edge secrets (already manually confirmed once; re-check release day) |
| `PASSWORD_RESET_DEV_KEY` unset | Same |
| `SITE_URL` | Production public origin |
| `PILOT_INVITE_REDIRECT_TO` | Allowlisted production URL or unset (falls back safely) |
| `EARLY_ACCESS_EMAILS_INTERNAL_SECRET` | Matches send function |
| Resend secrets | Present if email required in window |
| Frontend `js/supabase-config.js` / build | Points at production (not security-test) |
| No accidental security-test keys in production hosting env | Hosting dashboard |

---

## 9. Execution readiness

| Question | Answer |
|----------|--------|
| Is the release ready to **execute** right now? | **No — awaiting review and explicit go-ahead** |
| Is non-production proof complete? | **Yes** (Gates #1–#3) |
| Are production changes inventoried? | **Yes** (this document) |
| Remaining blockers | Explicit approval; maintenance window; smoke fixtures; release-day secret re-check; human execution of Phases 0–4 |

---

## 10. Remaining blockers before “production = v0.9”

1. Human approval to execute this runbook  
2. Maintenance window + named rollback owner  
3. Approved production smoke accounts / hotel  
4. Phase 0 secret and backup confirmation on the day  
5. Actual apply/deploy/smoke/sign-off (not started)

Until those complete, production must not be described as running Security Release v0.9.
