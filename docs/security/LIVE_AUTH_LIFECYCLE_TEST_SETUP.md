# Live Authentication Lifecycle Test Setup

**Purpose:** Prove Hospitality Flow authentication and account lifecycle with real Supabase Auth users, sessions, refresh tokens, `platform_access`, memberships, RPCs, and Edge Functions where deployed — not mocked client checks.

**Launch Gate:** #2 (Audit 2 / F-03)  
**Suite:** `npm run test:live-auth` or `node scripts/test-live-auth-lifecycle.mjs`  
**Helpers:** `scripts/lib/live-auth-test-helpers.mjs` (reuses safety/redaction from `scripts/lib/live-rls-test-helpers.mjs`)

---

## WARNING

- Use the **dedicated non-production** project only: `hospitality-flow-security-test` (`ozxfqyuihoxokwdqollm`).
- **Never** point this suite at production, Zetter, real Pilot Lab, or customer data.
- The suite **fails unless** `HF_RLS_TEST_ENV=non-production`.
- The suite **refuses** the known production project ref `aluxummorfhcswwpgqaf`.
- The suite **requires** project ref `ozxfqyuihoxokwdqollm`.
- Service-role key is for **fixture setup/cleanup and Auth Admin generateLink only**. It is never printed.
- Do not commit `.env.rls-test`, passwords, JWTs, or keys.
- Cleanup deletes only suite-prefixed hotels (`HF_AUTH_TEST_*`) and suite-created Auth users / applications.

---

## 1. Prerequisites

1. Same non-production project and `.env.rls-test` used by the live RLS suite (`docs/security/LIVE_RLS_TEST_SETUP.md`).
2. Migrations applied on the **test** project, including:
   - `20260802140000_platform_suspend_authoritative.sql`
   - `20260802153000_rls_require_active_platform_access.sql`
3. Fixture Auth users from the RLS suite (Hotel A owner, Hotel B owner, operator, revoked).
4. Deploy these Edge Functions to the **security-test** project (never production for this gate):
   ```bash
   npx supabase functions deploy request-password-reset invite-pilot-applicant list-pilot-applications --project-ref ozxfqyuihoxokwdqollm
   ```
   If `invite-pilot-applicant` cannot send Auth invite email (SMTP not configured on the test project), the suite falls back to Auth Admin user ensure + `mark_pilot_applicant_invited` / `platform_access` state updates, and marks email delivery as MANUAL.

---

## 2. Environment

Reuse `.env.rls-test` (gitignored). Required variables match the RLS suite:

```bash
HF_RLS_TEST_ENV=non-production
HF_RLS_TEST_SUPABASE_URL=https://ozxfqyuihoxokwdqollm.supabase.co
HF_RLS_TEST_ANON_KEY=...
HF_RLS_TEST_SERVICE_ROLE_KEY=...
HF_RLS_TEST_HOTEL_A_OWNER_EMAIL=...
HF_RLS_TEST_HOTEL_A_OWNER_PASSWORD=...
HF_RLS_TEST_HOTEL_B_OWNER_EMAIL=...
HF_RLS_TEST_HOTEL_B_OWNER_PASSWORD=...
HF_RLS_TEST_OPERATOR_EMAIL=...
HF_RLS_TEST_OPERATOR_PASSWORD=...
HF_RLS_TEST_REVOKED_EMAIL=...
HF_RLS_TEST_REVOKED_PASSWORD=...
```

See `.env.rls-test.example`.

---

## 3. What the suite proves

| Area | Coverage |
|------|----------|
| Login | Valid member/operator; wrong password; unknown email enumeration-safe; suspended Auth vs HF deny; orphan Auth user deny; anon data deny; operator Edge authz |
| Session | Access + refresh tokens; `get_my_platform_access`; refresh; invalid JWT; same-JWT after suspend/membership removal; cache cannot restore access |
| Logout | Logout API; refresh after logout; membership/data retained; frontend cache-clear contract; multi-tab noted MANUAL |
| Password reset | Edge request path (member/operator/suspended/unknown); eligibility RPC; rate-limit observation; Admin `generateLink` recovery token path (not email delivery); old/new password; invalid token |
| Invitation | Edge invite or admin fallback; access status; first login; re-invite idempotency; no auto-membership; declined path |
| Suspension / hard revoke | Same-JWT app + data plane; unsuspend with/without membership; operator tools; membership removal; suspend → delete memberships → admin logout/ban |
| Multi-session | Two sessions; both denied on suspend; password-reset vs refresh **observed** (no assumption) |
| Demo / redirect | Demo guest + no-persistence contracts; redirect allowlist gaps observed (F-06 MANUAL until remediating `getRedirectTarget`) |

---

## 4. Email delivery limitations

- **Not proven:** SMTP/Resend delivery of reset or invite emails.
- Recovery / invite **token** paths use Supabase Auth Admin `generate_link` in the **test project only**.
- Treat real inbox delivery as a separate manual check.

---

## 5. Exit codes

| Code | Meaning |
|------|---------|
| 0 | Every required assertion passed |
| 1 | One or more lifecycle assertions failed |
| 2 | Harness / safety / setup failure |

---

## 6. Run

```bash
npm run test:live-auth
```

Do not run against production. Do not commit secrets.
