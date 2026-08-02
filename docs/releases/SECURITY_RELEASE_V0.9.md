# Hospitality Flow Security Release v0.9

**Date:** 2 August 2026  
**Checkpoint commit:** `f3505f4` — *Complete security launch gates and authorization hardening*  
**Status:** Non-production proof complete. **Production rollout not executed.**

---

## Purpose

v0.9 is the security checkpoint before external pilot hotels. It closes three launch gates:

1. **Data isolation and suspension at the database**
2. **Authentication and account lifecycle**
3. **Authorization, redirects, and privileged actions**

All live proof ran only on the dedicated security-test project. That proof is necessary but **not** the same as production deployment.

---

## Manager summary

| Gate | Result | What it proves |
|------|--------|----------------|
| Launch Gate #1 — RLS / isolation | **PASS** | Hotels cannot read each other’s data; suspended users lose data access even with an old session |
| Launch Gate #2 — Auth lifecycle | **PASS** | Login, sessions, password reset, invitation, suspension, and removal behave correctly |
| Launch Gate #3 — Authorization | **PASS** | Users cannot elevate roles; redirects are allowlisted; early-access submit is Edge-only; operator boundaries hold |

**Production status:** The new database migrations and updated Edge Functions have **not** been applied to production. Frontend security changes are in the Git checkpoint but must be deployed deliberately after database and Edge verification.

**Bottom line:** Ready to *plan and review* a controlled production rollout. Not yet ready to claim production is on v0.9 security until the rollout checklist is completed and signed off.

---

## Launch Gate #1 — Live RLS and suspension (data plane)

**Suite:** `npm run test:live-rls`  
**Environment:** `ozxfqyuihoxokwdqollm` / `hospitality-flow-security-test`  
**Result:** **69/69 PASS**, exit code 0

Covered:

- Cross-hotel isolation for Hotel Brain, handovers, and maintenance
- Operator without membership cannot read hotel data
- Membership removal takes effect on the same JWT
- Anonymous denial on private tables
- Platform suspension denies PostgREST data access while membership may still exist
- Password-reset DEV override secrets checked as a launch concern (production manually confirmed absent)

Supporting migrations (applied on security-test only):

- `20260802140000_platform_suspend_authoritative.sql` — suspension is a global app deny
- `20260802153000_rls_require_active_platform_access.sql` — RLS requires membership **and** active platform access

---

## Launch Gate #2 — Authentication lifecycle

**Suite:** `npm run test:live-auth`  
**Environment:** security-test only  
**Result:** **PASS**, exit code 0

Covered:

- Login (member, operator, wrong password, unknown email, suspended, orphan Auth user)
- Sessions, refresh tokens, logout
- Password-reset request path (Edge), eligibility, recovery token path (Admin generateLink on test only)
- Pilot invitation / first login / declined path
- Soft suspend and hard revoke (suspend + membership removal + session invalidation patterns)
- Multi-session behaviour under suspension

**Manual production confirmation already done:** password-reset DEV override secrets (`PASSWORD_RESET_DEV_RELAXED`, `PASSWORD_RESET_DEV_KEY`) are absent on production.

**Not claimed by this gate:** real inbox delivery of reset/invite emails (SMTP/Resend) — treat as a separate operational check.

---

## Launch Gate #3 — Authorization and privileged actions

**Suites:**

| Suite | Result |
|-------|--------|
| `npm run test:safe-redirect` | **32 passed** (unit / static) |
| `npm run test:live-early-access-submit` | **13 passed**, exit 0 |
| `npm run test:live-authorization` | **19 passed** (18 required + control), exit 0 |

Covered:

- Post-login and Auth redirect allowlisting (browser + Edge)
- Early-access application submit is **Edge-only** (no public RPC / no public table insert)
- Durable submit rate limiting (service_role)
- Members cannot escalate to owner, insert memberships, or touch platform_access / platform_operators
- Non-operators and suspended operators cannot call operator Edge Functions
- Operator without membership cannot read hotel operational data
- Owner-only hotel-details update (Model A: equal ops permissions otherwise)
- Foreign hotel/workspace IDs denied
- Anonymous privilege failures

---

## Security changes included

### Access control

- `platform_access.access_status = 'suspended'` is a **global deny** for app access, password reset, operator tools, and (via RLS helper) private operational data
- Private RLS policies require **both** hotel membership and `has_active_platform_access()`
- Operator Edge auth denies suspended operators

### Redirect hardening

- Shared allowlist for post-auth and Auth callback redirects
- Approved app routes: `account.html`, `handover.html`, `hotel-profile.html`, `operator.html` (operator only with fresh operator check)
- Edge password-reset and invite rebuild `redirectTo` from trusted site config — not raw client input

### Early access

- `submit_early_access_application` executable by **service_role only**
- Browser must use `submit-early-access-application` Edge Function
- Public INSERT on `early_access_applications` removed
- Durable rate-limit table + RPC for Edge abuse control

### Owner / member model (documented)

- **Model A:** members share operational permissions; only hotel-details update is owner-restricted
- Operator capability is binary (`platform_operators` row), not granular flags

---

## Migrations included (production must receive)

Apply in this order only:

1. `supabase/migrations/20260802140000_platform_suspend_authoritative.sql`
2. `supabase/migrations/20260802153000_rls_require_active_platform_access.sql`
3. `supabase/migrations/20260802180000_early_access_submit_edge_only.sql`
4. `supabase/migrations/20260802182000_early_access_submit_rate_limit.sql`

These have been applied on **security-test**. They have **not** been applied on production.

---

## Edge Functions affected

| Function | Why production needs the update |
|----------|----------------------------------|
| `submit-early-access-application` | Shared validation, durable rate limit, Edge-only path alignment, email-secret fail-soft |
| `request-password-reset` | Safe redirect reconstruction; suspension-aware eligibility already expected |
| `invite-pilot-applicant` | Safe invite redirect; uses shared operator auth |
| `list-pilot-applications` | Must redeploy to pick up shared `operator-auth` suspension deny (function body may be unchanged) |

Shared modules bundled into deploys:

- `_shared/operator-auth.ts`
- `_shared/safe-redirect.ts`
- `_shared/early-access-submit.ts`

---

## Frontend / auth files affected

| Area | Files |
|------|--------|
| Redirect / auth core | `js/safe-redirect.js`, `js/auth.js`, `js/platform-access.js`, `js/workspace.js`, `js/operator-dashboard.js` |
| HTML script load order | `login.html`, `signup.html`, `forgot-password.html`, `reset-password.html`, `account.html`, `handover.html`, `hotel-profile.html`, `maintenance.html`, `operator.html`, `sop.html` |
| Docs / tests (not runtime) | `docs/security/*`, `scripts/test-live-*.mjs`, `scripts/lib/live-*.mjs`, `scripts/lib/safe-redirect.mjs`, `package.json` |

Deploy frontend **after** database and Edge checks pass so clients do not hit a half-migrated backend.

---

## Known limitations

- Email inbox delivery (reset / invite / early-access) is operational, not fully proven by live harnesses
- Full non-production live harnesses must **never** run against production
- Reversing security migrations can reopen vulnerabilities — prefer forward-fix
- Owner/member Model A is intentional product policy, not a bug
- Multi-tab logout UX may still need manual observation
- Production smoke tests must use approved fixtures only — never Zetter destructive tests

---

## Production rollout status

| Item | Status |
|------|--------|
| Code checkpoint in Git | Present (`f3505f4` on `main` as of this note) |
| Live proof (security-test) | Complete — Gates #1–#3 PASS |
| Production migrations | **Not applied** |
| Production Edge deploys | **Not complete for this release** |
| Production frontend deploy | **Not executed for this release** |
| Rollout runbook | See `docs/security/SECURITY_V0.9_PRODUCTION_ROLLOUT.md` |

---

## Rollback readiness

- **Frontend:** reversible via Git / hosting redeploy of prior revision
- **Edge Functions:** redeploy previous known-good bundle per function
- **Database:** prefer **forward-fix**; full SQL undo of RLS/grant hardening is high risk and may reopen holes
- Detailed triggers and sequences: `docs/security/SECURITY_V0.9_PRODUCTION_ROLLOUT.md`

---

## Technical appendix — live proof environment

| Field | Value |
|-------|--------|
| Project name | `hospitality-flow-security-test` |
| Project ref | `ozxfqyuihoxokwdqollm` |
| Production ref (denylisted by harnesses) | `aluxummorfhcswwpgqaf` |
| Env gate | `HF_RLS_TEST_ENV=non-production` |
| npm scripts | `test:live-rls`, `test:live-auth`, `test:live-early-access-submit`, `test:live-authorization`, `test:safe-redirect` |

Related docs:

- `docs/security/LIVE_RLS_TEST_SETUP.md`
- `docs/security/LIVE_AUTH_LIFECYCLE_TEST_SETUP.md`
- `docs/security/LIVE_AUTHORIZATION_TEST_SETUP.md`
- `docs/security/EARLY_ACCESS_SUBMIT_EDGE_ONLY.md`
- `docs/security/PLATFORM_SUSPEND_AND_REVOKE.md`
- `docs/security/SECURITY_V0.9_PRODUCTION_ROLLOUT.md`

---

## Final statement

**Non-production proof does not equal production deployment.**

Security Release v0.9 is a verified checkpoint on `hospitality-flow-security-test`. Production remains on its previous security posture until the controlled rollout runbook is executed, verified, and signed off.
