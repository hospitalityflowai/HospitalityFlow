# Hospitality Flow — Security Architecture

**Status:** Canonical architecture reference for the current platform  
**Audience:** Engineers changing authentication, authorization, workspace access, RLS, operators, Edge Functions, or Demo Mode  
**Related release:** Security Release v0.9 (`docs/releases/SECURITY_RELEASE_V0.9.md`)  
**Last updated:** 2 August 2026

This document describes **how security works today**. It is not an audit and not a rollout runbook.

---

## 1. Executive summary

Hospitality Flow is a **multi-tenant** hotel operations platform. Each hotel operates in an **isolated workspace**. Access is layered:

| Layer | Owns | Does not own |
|-------|------|--------------|
| **Supabase Auth** | Who the user is (identity, JWT, sessions) | Hotel workspace access |
| **`platform_access`** | Whether the user may use Hospitality Flow at all | Which hotel they belong to |
| **`hotel_members`** | Which hotel workspace the user belongs to | Global app allow/deny (suspension overrides) |
| **RLS** | Final database authority for private operational data | Browser UX |
| **`platform_operators`** | Platform administration capability | Hotel workspace data by itself |
| **Edge Functions** | Privileged server-side workflows (invite, reset, submit, list) | Browser-trusted authorization |
| **Demo Mode** | Isolated client-side sample experience | Any real workspace |

**Trust model in one sentence:** Auth proves identity; platform access gates the product; membership scopes the hotel; RLS and server-side checks enforce both on every request.

### Architecture diagram

```text
                    ┌─────────────────────┐
                    │   Supabase Auth     │
                    │  (identity / JWT)   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Platform Access    │
                    │ active / invited /  │
                    │     suspended       │
                    └──────────┬──────────┘
                               │
                    (not suspended)
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Hotel Membership   │
                    │   (hotel_members)   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    RLS Policies     │
                    │ membership AND      │
                    │ active platform     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Hotel Workspace    │
                    └──────────┬──────────┘
                               │
               ┌───────────────┼───────────────┐
               ▼               ▼               ▼
        Hotel Brain      Handovers      Maintenance

Separate branches (not on the hotel data path by default):

  Supabase Auth ──► platform_operators ──► Operator Edge / Dashboard
       │                    │
       │                    └──► Pilot Lab only if hotel_members exists for that lab
       │
       └──► (optional) same user may also have hotel_members for a real hotel

  Anonymous / public visitor ──► Demo Mode (in-memory overlay only)
                                 └──► never a real workspace / never cloud mutate
```

---

## 2. Core security principles

1. **Authentication is not authorization.** A valid JWT only proves identity.
2. **Frontend visibility is never treated as security.** Hiding buttons does not protect data.
3. **Workspace access requires server-side membership.** `hotel_members` (enforced by RLS/RPCs) is authoritative.
4. **Suspension overrides membership.** `platform_access.access_status = 'suspended'` is a global deny for app and data planes.
5. **RLS is authoritative for private operational data.** PostgREST cannot be bypassed by UI tricks.
6. **Operator status does not grant hotel access.** `platform_operators` ≠ membership.
7. **Client-provided user IDs and workspace IDs are not trusted.** Server uses `auth.uid()` and membership checks.
8. **Service-role keys remain server-side only.** Never in browser bundles or screenshots.
9. **Privileged actions belong in RPCs or Edge Functions with server-side checks.**
10. **Demo Mode cannot read or mutate real workspace data.**
11. **Security changes require live proof** on the dedicated non-production project before claiming PASS.
12. **Production deployment follows a controlled rollout and smoke-test process** — non-production proof ≠ production deployed.

---

## 3. Identity layer (Supabase Auth)

### What Auth owns

| Concern | Behaviour |
|---------|-----------|
| User identity | `auth.users` row; `auth.uid()` in Postgres |
| JWTs | Access token presented to PostgREST / RPCs / Edge |
| Sessions | Persisted client session (`persistSession`) with refresh |
| Refresh tokens | Used to obtain new access tokens (`autoRefreshToken`) |
| Password reset | Recovery links / OTP; HF gates eligibility via Edge + RPC |
| Invitation links | Auth invite / recovery-style links; HF marks `platform_access` invited |
| Logout | Client `signOut` clears local session; other devices keep tokens unless Admin revoke/ban |
| Session expiry | Access tokens expire; refresh continues until revoked/invalidated |
| Multi-device | Independent JWTs per device; HF does not maintain a central session registry |

### What Auth does **not** grant

- Access to a hotel workspace
- Operator privileges
- Immunity from suspension
- Ability to skip RLS

**Important:** An existing JWT remains *authenticated*, but every RPC and RLS evaluation uses **current** platform access and membership. Suspension or membership removal takes effect on the **same JWT** without waiting for token expiry (proven in live suites).

---

## 4. Platform access

**Table:** `platform_access`  
**Ops playbook:** `docs/security/PLATFORM_SUSPEND_AND_REVOKE.md`

### Why it exists

Hospitality Flow is **invitation-only**. Auth alone must not open the product. `platform_access` records whether an email/user is allowed to use the application (`active`, `invited`, `suspended`, plus application-related states such as pending application flows).

### Expected behaviour

| Status | Application | Password reset | Data plane (with membership) |
|--------|-------------|----------------|------------------------------|
| `invited` / `active` | Allowed (subject to other gates) | Eligible if other rules pass | Allowed if membership + not suspended |
| `suspended` | **Denied** | **Denied** | **Denied** (`has_active_platform_access()` false) |
| No row / orphan Auth | Denied | Denied | Denied |

### Suspension is a global deny

After Security v0.9 remediations:

- `get_my_platform_access` checks **suspension before** membership/operator success paths
- `is_password_reset_allowed` respects suspension
- Workspace creation RPCs refuse suspended callers
- RLS helper `has_active_platform_access()` returns false when suspended
- Operator Edge auth denies suspended operators

Membership may **remain** during soft suspend so reactivation is easy.

### Conceptual flow — `get_my_platform_access`

1. Require `auth.uid()`
2. Resolve operator flag and membership presence (informational / later branches)
3. Resolve `platform_access` status (prefer `user_id` match over email-only)
4. If `suspended` → `allowed: false`, reason `SUSPENDED` (**stop**)
5. Else if membership → allow
6. Else if operator / invited / active rules → allow as designed
7. Else deny

### Lifecycle operations

| Action | Effect |
|--------|--------|
| **Suspend** | Deny app + data; membership may remain |
| **Remove from hotel** | Delete `hotel_members` → immediate workspace data deny for that hotel |
| **Hard revoke** | Suspend + delete memberships + revoke/ban Auth sessions where supported |

---

## 5. Hotel membership

**Table:** `hotel_members`  
**Role values in use:** typically `owner` and non-owner member roles (e.g. staff/member strings as stored)

### Authoritative workspace ACL

- A row links `user_id` ↔ `hotel_id` (workspace)
- Private operational rows are scoped to that hotel/workspace
- Without membership, RLS returns empty/denied even with a valid JWT
- Membership **does not** override suspension

### Current product assumptions

| Assumption | Current behaviour |
|------------|-------------------|
| One primary workspace | Client resolves workspace from membership (ordered, limited) — **multi-workspace switching is not a product feature** |
| Owner vs member | **Model A:** equal operational access to Hotel Brain, handovers, maintenance |
| Owner-only | **Hotel-details update** (`hotels` update / `update_hotel_workspace`) is owner-restricted |
| Broader admin model | **Not implemented** — do not invent owner-only invite/billing/member-admin powers |

---

## 6. Row Level Security

RLS is the **final data boundary** for private operational tables accessed via the anon/authenticated keys.

### Policy model (Security v0.9)

Private access requires **both**:

1. `public.has_active_platform_access() = true` (not suspended; membership/operator/invited-active rules)
2. Matching `hotel_members` row for the target hotel/workspace

### Tables covered by this model

| Table | Notes |
|-------|--------|
| `hotels` | Select for members; update owner-only |
| `hotel_members` | Select own membership (with active platform access) |
| `hotel_brain_profiles` | Member CRUD per policy set |
| `handover_reports` | Member select/insert/update/delete per policy set |
| `maintenance_issues` | Member select/insert/update; **no authenticated DELETE** (intentional) |
| `maintenance_updates` | Member access tied to parent issue/workspace |

Exact policy names and WITH CHECK clauses live in migrations (notably `20260802153000_rls_require_active_platform_access.sql` and earlier phase migrations).

### Guarantees

- Hotel A cannot access Hotel B
- `localStorage` / frontend manipulation cannot grant cloud access
- Client-supplied foreign `workspace_id` / `hotel_id` fails RLS
- Anonymous users are denied on private tables
- Same-JWT suspension and membership removal are enforced on the next query

### Live proof

- Suite: `npm run test:live-rls`
- Setup: `docs/security/LIVE_RLS_TEST_SETUP.md`
- Launch Gate #1: **69/69 PASS** on `hospitality-flow-security-test`

---

## 7. Operator model

**Table:** `platform_operators`  
**Capability model today:** **binary** — row present ⇒ operator (if not suspended); no granular `can_*` columns in the live authz model.

### Separation from hotels

| Fact | Implication |
|------|-------------|
| Operators are not automatically hotel members | No Hotel Brain / handover / maintenance access without membership |
| Pilot Lab | Separate workspace provisioned via `create_operator_pilot_lab_workspace`; still needs membership on that lab hotel |
| Dashboard | `operator.html` + `js/operator-dashboard.js` — UI only; Edge re-checks |
| Suspended operators | Denied by shared `operator-auth` and platform access |

### Privileged operator surfaces

| Surface | Server check |
|---------|--------------|
| `list-pilot-applications` | `requirePlatformOperator` (Edge) |
| `invite-pilot-applicant` | `requirePlatformOperator` (Edge) + safe redirect |
| `mark_pilot_applicant_invited` | RPC with server-side operator/authorization rules |
| `create_operator_pilot_lab_workspace` | RPC; suspension-aware |

**Do not assume unrestricted super-admin.** Operators cannot read arbitrary hotel data without membership. There is no emergency bypass of suspension in code.

---

## 8. RPC security

RPCs (especially `SECURITY DEFINER`) concentrate privileged logic that must not trust the client.

### Expected rules

- Identity from `auth.uid()` (or carefully validated email for reset eligibility)
- `SET search_path = public` (or equivalent fixed safe path)
- Explicit suspension checks where access is granted
- Explicit membership / owner / operator checks
- No trust in client-supplied “acting as” user IDs
- Narrow `GRANT EXECUTE` (prefer `authenticated` or `service_role` only)
- Fail closed
- Idempotent behaviour where practical (e.g. pending early-access replay)

### Key RPCs

| RPC | Purpose |
|-----|---------|
| `get_my_platform_access` | App allow/deny + operator/membership signals |
| `has_active_platform_access` | RLS helper; mirrors non-suspended allow rules |
| `is_password_reset_allowed` | Reset eligibility; respects suspension |
| `create_hotel_workspace` | Create hotel + owner membership; suspension-aware |
| `update_hotel_workspace` | Owner-only hotel details; suspension-aware |
| `create_operator_pilot_lab_workspace` | Provision operator Pilot Lab |
| `mark_pilot_applicant_invited` | Invitation state transition |
| `submit_early_access_application` | **service_role only** — Edge internal primitive |
| `check_early_access_submit_rate_limit` | **service_role only** — durable Edge rate limit |

---

## 9. Edge Function security

Edge Functions own privileged workflows so the browser never holds the service role and cannot skip validation.

### Why Edge

- Service-role isolation
- Server-side validation
- Fresh operator checks
- Abuse controls (rate limits)
- Email orchestration
- Consistent logging
- Safe redirect construction (never raw client URLs into Auth)

### Functions

| Function | Role |
|----------|------|
| `request-password-reset` | Neutral reset request; eligibility RPC; safe `redirectTo` |
| `invite-pilot-applicant` | Operator invite; safe invite redirect; Auth invite |
| `list-pilot-applications` | Operator list; restricted field shape |
| `submit-early-access-application` | Public landing submit path; validation + rate limit + email trigger |
| `send-early-access-emails` | Internal email sender; shared secret header |

### Early-access Edge-only rule (F-A03)

- Browser **must** call the Edge Function
- `anon` / `authenticated` **cannot** `EXECUTE` `submit_early_access_application`
- Direct table `INSERT` from clients is revoked
- Rate limiting is enforced server-side (durable attempts table + in-function checks)
- Docs: `docs/security/EARLY_ACCESS_SUBMIT_EDGE_ONLY.md`

Privileged keys (`service_role`, internal email secrets, Resend keys) **never** ship to the browser.

---

## 10. Redirect security

Open redirects are treated as an authorization boundary for Auth emails and post-login navigation.

### Shared allowlist

Approved **post-login** routes (browser):

- `account.html`
- `handover.html`
- `hotel-profile.html`
- `operator.html` (requires **fresh** operator authorization — not “authenticated only”)

Trusted Auth callback routes include `reset-password.html` and `account.html` (invite/recovery landing). Origins are constrained to trusted site configuration (`SITE_URL` / production origin), not arbitrary client hosts.

Rejected inputs include external URLs, protocol-relative URLs, `javascript:`, `data:`, encoded bypass attempts, and unknown routes. Failures fall back to a safe default (typically `account.html`).

### Synchronized implementations

Until a single shared build path exists, keep these three mirrors aligned:

1. `js/safe-redirect.js` (browser)
2. `scripts/lib/safe-redirect.mjs` (canonical for Node tests)
3. `supabase/functions/_shared/safe-redirect.ts` (Edge)

Static suite: `npm run test:safe-redirect` (**32/32**).

---

## 11. Demo Mode security

**Implementation:** `js/demo-mode.js`, `js/demo-sample-data.js`

Demo Mode is an **isolated client-side experience**, not a hotel workspace.

| Property | Behaviour |
|----------|-----------|
| Real workspace | No |
| Persistence | In-memory pack + minimal mode flag; not production hotel rows |
| History / cloud save | No real history; no Supabase writes for Brain/handover/maintenance |
| Hotel Brain mutation | Overlay only; must not write real Brain |
| Save / copy / print / export | Restricted where product rules require |
| Maintenance module | Not a real Maintenance workspace path |
| Signed-in users | Demo overlays must not mutate their real workspace |
| Reset | Restores sample state |
| Exit | Returns to normal application / return URL |

Demo may reuse the **same intelligence pipeline** as product features, but it uses a **different persistence and security layer**. Treat Demo as untrusted for authorization decisions.

---

## 12. Local storage and cache

| Mechanism | Role |
|-----------|------|
| Tenant-scoped keys (`js/tenant-storage.js`) | Namespace local data by workspace/user to reduce cross-account UX leaks |
| Sign-out cleanup | Clears tenant/session caches |
| Workspace cache | UX accelerator only; cleared on suspend / access deny |
| Suspended / no membership | Fresh `get_my_platform_access` / workspace checks; cache must not restore access |

**Rule:** local state is UX only. `localStorage` never grants server access. Stale cache is a product bug risk, not an authorization grant — always re-check the server.

**Secrets hygiene:**

- `.env`, `.env.local`, `.env.rls-test` are gitignored
- `supabase/.temp/` is local CLI metadata and gitignored
- `js/supabase-config.js` / generated configs must not commit secrets

---

## 13. Security testing

### Dedicated project

| Field | Value |
|-------|--------|
| Name | `hospitality-flow-security-test` |
| Ref | `ozxfqyuihoxokwdqollm` |
| Production ref (denylisted) | `aluxummorfhcswwpgqaf` |

### Rules

- Never use production or Zetter for destructive testing
- Live suites require `HF_RLS_TEST_ENV=non-production`
- Production project ref is denylisted in harnesses
- Secrets (passwords, JWTs, keys) are redacted from logs
- Exit code **0** is required to claim PASS; exit **2** means proof did not run

### Launch Gate evidence (verified on security-test)

| Gate | Suite | Result |
|------|-------|--------|
| **#1** Live RLS isolation (+ suspension data plane) | `npm run test:live-rls` | **69/69 passed** |
| **#2** Live authentication lifecycle | `npm run test:live-auth` | **79/79 passed** |
| **#3** Live authorization | `npm run test:live-authorization` | **19/19 passed** |
| **#3** Early-access authorization | `npm run test:live-early-access-submit` | **13/13 passed** |
| **#3** Safe redirect (static) | `npm run test:safe-redirect` | **32/32 passed** |

Setup docs:

- `docs/security/LIVE_RLS_TEST_SETUP.md`
- `docs/security/LIVE_AUTH_LIFECYCLE_TEST_SETUP.md`
- `docs/security/LIVE_AUTHORIZATION_TEST_SETUP.md`
- `docs/security/EARLY_ACCESS_SUBMIT_EDGE_ONLY.md`

---

## 14. Production release model

Non-production proof **does not** equal production deployment.

Controlled shape:

1. Confirm Git checkpoint and **explicit production project ref**
2. Apply migrations in order (suspend → RLS → early-access Edge-only → rate limit)
3. Deploy Edge Functions after DB dependencies (submit first after early-access revoke)
4. Deploy frontend after DB/Edge verification
5. Non-destructive smoke tests only
6. Prefer **forward-fix** for security migrations; reversing often reopens holes
7. Wrong project ref → **immediate stop**

References:

- `docs/releases/SECURITY_RELEASE_V0.9.md`
- `docs/security/SECURITY_V0.9_PRODUCTION_ROLLOUT.md`

---

## 15. Security change checklist

Before changing security-sensitive code:

- [ ] Identify authentication vs authorization impact
- [ ] Identify workspace / RLS impact
- [ ] Identify operator impact
- [ ] Identify suspension / removal impact
- [ ] Identify Edge / RPC impact
- [ ] Add static regression tests
- [ ] Add or update live non-production proof
- [ ] Verify no production ref is targeted
- [ ] Document migration / deployment order
- [ ] Document rollback / forward-fix path
- [ ] Run relevant launch-gate suites (exit 0)
- [ ] Review secrets and logs (no key leakage)
- [ ] Obtain explicit production approval before production apply/deploy

---

## 16. Known limitations

- Production rollout for Security v0.9 is still **pending** (proof is on security-test)
- Email inbox delivery (reset / invite / early-access) needs **manual** smoke testing
- Edge rate limiting is implemented; monitor attempt volume and false positives
- Owner/member model is intentionally simple (Model A)
- Multi-workspace support is **not** implemented
- Mirrored safe-redirect implementations require human synchronization
- Auth JWT revocation may require Admin API logout/ban and is not purely SQL-driven
- Demo / client cache controls **supplement** server security; they never replace it
- Multi-tab logout UX may still need manual observation
- Authenticated clients have no DELETE policy on `maintenance_issues` by design

---

## 17. Supporting documents

| Document | Role |
|----------|------|
| `docs/security/PLATFORM_SUSPEND_AND_REVOKE.md` | Suspend / remove / hard-revoke playbook |
| `docs/security/EARLY_ACCESS_SUBMIT_EDGE_ONLY.md` | F-A03 Edge-only submit |
| `docs/security/LIVE_RLS_TEST_SETUP.md` | Gate #1 harness |
| `docs/security/LIVE_AUTH_LIFECYCLE_TEST_SETUP.md` | Gate #2 harness |
| `docs/security/LIVE_AUTHORIZATION_TEST_SETUP.md` | Gate #3 harness |
| `docs/releases/SECURITY_RELEASE_V0.9.md` | Release checkpoint |
| `docs/security/SECURITY_V0.9_PRODUCTION_ROLLOUT.md` | Production runbook |
| `docs/OPERATOR_INVITE.md` | Operator invite operations |

---

## Appendix — Repository consistency notes (as of this writing)

Documented for maintainers; not defects in the trust model itself:

1. **`docs/releases/SECURITY_RELEASE_V0.9.md`** records Gate #2 as exit 0 but omits the **79/79** assertion total documented in the live suite report — this architecture reference uses **79/79**.
2. Gate #3 live authorization is **19 passed** including a control assertion (18 required scenarios + control); treated as **19/19** for the gate package.
3. Production has **not** received the v0.9 migrations/Edge updates at the time of writing; architecture describes the **intended current design** as implemented and proven on security-test and present in the Git checkpoint.
4. Older phase migrations still exist in history; runtime behaviour is defined by the **latest** applied migration versions (including the `20260802*` security set on security-test).
