# Operator guide — Founding Pilot approve & invite

This is the **only supported** way to invite a Founding Pilot hotel after they apply on the public site.

Public users cannot create accounts. Operators must never put the **service_role** key in browser code, scripts shared with hotels, or frontend repos.

## Operator Dashboard (preferred)

Authorised operators (`platform_operators`) can review applications and invite from:

`operator.html`

1. Sign in with an operator account.
2. Open **Account** — an **Operator** section appears whenever `get_my_platform_access` returns `is_operator: true` and the account is **not** suspended (including users who are also hotel members with `access_status: "active"`). Suspension is a global deny — see [`docs/security/PLATFORM_SUSPEND_AND_REVOKE.md`](security/PLATFORM_SUSPEND_AND_REVOKE.md).
3. Open the operator dashboard.
4. Review pending applications and click **Approve & Send Invite**.
5. Confirm in the modal. The page calls `invite-pilot-applicant` with `{ applicationId }` using your session JWT.

Hotel workspace access and operator privileges are **separate**. For the pre-pilot account model, use a dedicated HF operator account with **Hospitality Flow Pilot Lab** (see [`docs/operator/PILOT_LAB_ACCOUNT_SETUP.md`](operator/PILOT_LAB_ACCOUNT_SETUP.md)). Do not keep operator capability on the normal Zetter hotel login.

The dashboard loads applications only through the read-only Edge Function `list-pilot-applications` (operator JWT required). Browser roles still cannot `SELECT` from `early_access_applications`.

**Dashboard (minimal Phase 3):** Decline on Pending/Invited; Permanently Delete Test Application on Declined (typed `DELETE`). Resend and Restore UI remain deferred.

**Server layer:** Edge Functions `decline-pilot-applicant`, `resend-pilot-invite`, `restore-pilot-applicant`, `delete-pilot-applicant` plus RPCs and `operator_audit_log`.

## Flow (end-to-end)

1. Hotel submits the Founding Pilot form on `index.html`.
2. Row is saved in `early_access_applications` with `founding_status = pending`.
3. `platform_access` is created/updated to `pending_application`.
4. Applicant confirmation + owner alert emails are sent (Resend).
5. **You** review the application in the Operator Dashboard (or Supabase Table Editor).
6. **You** approve via the dashboard (or call `invite-pilot-applicant` directly).
7. Function sends a **Supabase Auth invitation email** via Admin API.
8. Only after that succeeds, `platform_access.access_status` becomes `invited` and `founding_status` becomes `accepted`.
9. Applicant opens the invite link, sets a password on `account.html`, then signs in.
10. Applicant creates **their own** hotel workspace (`create_hotel_workspace`). Status becomes `active`.

Invitation expiry and one-time use follow **Supabase Auth** email-link settings (Dashboard → Authentication → Providers / Email). Do not build a second custom token system for v1.

---

## One-time setup

### 1. Apply migrations

Supabase → **SQL Editor** → run in order:

1. [`supabase/migrations/phase14_pilot_invite_operators.sql`](../supabase/migrations/phase14_pilot_invite_operators.sql) (if not already applied)
2. [`supabase/migrations/phase15_operator_capability_flag.sql`](../supabase/migrations/phase15_operator_capability_flag.sql) — required for mixed hotel+operator accounts

### 2. Create your operator Auth user (if needed)

If you do not already have a Hospitality Flow login:

1. Supabase → **Authentication** → **Users** → **Add user** (email + password), **or** invite yourself once via Dashboard.
2. Public signup stays disabled; Dashboard/Admin user creation is fine for operators.

### 3. Authorise the operator

Replace the email, then run in SQL Editor:

```sql
INSERT INTO public.platform_operators (user_id, email)
SELECT id, lower(email)
FROM auth.users
WHERE lower(email) = 'you@hospitalityflow.co.uk'
ON CONFLICT (user_id) DO UPDATE
SET email = EXCLUDED.email;
```

Confirm:

```sql
SELECT * FROM public.platform_operators;
```

### 4. Deploy the Edge Functions

```powershell
npx supabase functions deploy invite-pilot-applicant
npx supabase functions deploy list-pilot-applications
```

Optional redirect override (defaults to `https://hospitalityflow.co.uk/account.html`):

```powershell
npx supabase secrets set PILOT_INVITE_REDIRECT_TO=https://hospitalityflow.co.uk/account.html
```

Ensure Auth redirect allow-list includes that URL (`supabase/config.toml` / Dashboard → Authentication → URL configuration).

### 5. Confirm Auth signup stays closed

Public email signup must remain disabled (`auth.enable_signup = false`). Admin `inviteUserByEmail` still works for invited pilots.

---

## Approve and invite (each applicant)

### Preferred: Operator Dashboard

Use `operator.html` as described above. The dashboard handles confirmation, duplicate-invite safety (`alreadyInvited`), and list refresh.

### Alternative: manual Table Editor + REST

### A. Review the application

Supabase → **Table Editor** → `early_access_applications`

Note the applicant **`id`** (UUID) and confirm `founding_status = pending`.

### B. Get your operator access token

1. Sign in at `https://hospitalityflow.co.uk/login.html` with the **operator** account.
2. Open the browser console on any authenticated page and run:

```js
const c = await HospitalityFlowSupabase.initClient();
const { data } = await c.auth.getSession();
copy(data.session.access_token);
console.log("token copied");
```

Treat this token like a password. It expires; get a fresh one when needed.

### C. Call the invite function

PowerShell example (replace placeholders):

```powershell
$PROJECT_URL = "https://aluxummorfhcswwpgqaf.supabase.co"
$ANON_KEY = "<anon-public-key-from-js/supabase-config.js>"
$OPERATOR_JWT = "<paste-operator-access-token>"
$APPLICATION_ID = "<early_access_applications.id>"

Invoke-RestMethod `
  -Method POST `
  -Uri "$PROJECT_URL/functions/v1/invite-pilot-applicant" `
  -Headers @{
    Authorization = "Bearer $OPERATOR_JWT"
    apikey = $ANON_KEY
    "Content-Type" = "application/json"
  } `
  -Body (@{ applicationId = $APPLICATION_ID } | ConvertTo-Json)
```

### D. Interpret the response

| Response | Meaning | What you should do |
|----------|---------|-------------------|
| `ok: true`, `inviteSent: true`, `statusUpdated: true` | Invite email sent; `founding_status = accepted`, `access_status = invited` | Done — tell hotel to check email |
| `ok: true`, `alreadyInvited: true`, `statusUpdated: true` | Already invited; founding status reconciled to `accepted` | No new email; resend only via Auth if needed |
| `ok: true`, `alreadyRegistered: true`, `statusUpdated: true` | Auth user already existed; now marked `invited` + `accepted` | Ask hotel to use prior invite or password reset |
| `ok: false`, `inviteSent: false`, `statusUpdated: false` | Invite email failed | Status stays pending — fix Auth/email, retry |
| `ok: false`, `inviteSent: true`, `statusUpdated: false` | Email sent but status update failed | Re-run the function (preferred). If you must repair manually, update **both** status fields together (see below) |
| `ok: false`, `alreadyActive: true` | Applicant already has an active workspace; founding status reconciled if possible | Do not invite again |
| `401` / `403` | Not signed in as an authorised operator | Refresh JWT; confirm `platform_operators` row |

**Rule:** a failed invitation must leave the applicant **pending**, not `invited`.

**Rule:** never update only `platform_access`. Application approval and platform access must stay reconciled:

- `early_access_applications.founding_status = accepted` means the application was approved
- `platform_access.access_status = invited` means the invitation was issued
- `platform_access.access_status = active` means the hotel workspace is active

### E. Verify in the database

```sql
SELECT founding_status
FROM public.early_access_applications
WHERE id = '<application-id>';

SELECT email, access_status, invited_at, invited_by
FROM public.platform_access
WHERE early_access_application_id = '<application-id>';
```

Expect after invite: `founding_status = accepted`, `access_status = invited`.  
Expect after hotel creation: `founding_status = accepted`, `access_status = active`.

### F. Manual recovery (both fields)

If invite email succeeded but status update failed, **prefer re-running** `invite-pilot-applicant` — the already-invited path reconciles `founding_status` without sending a new email and without downgrading an active account.

If you must repair in SQL, update **both** rows in the same recovery step:

```sql
-- Invited but founding still pending (or unknown)
UPDATE public.early_access_applications
SET founding_status = 'accepted'
WHERE id = '<application-id>'
  AND founding_status IS DISTINCT FROM 'declined';

UPDATE public.platform_access
SET access_status = 'invited',
    early_access_application_id = coalesce(early_access_application_id, '<application-id>'::uuid),
    updated_at = now()
WHERE (
    early_access_application_id = '<application-id>'
    OR lower(email) = lower('<applicant-email>')
  )
  AND access_status IS DISTINCT FROM 'active'
  AND access_status IS DISTINCT FROM 'suspended';
```

If the applicant is already **active**, only reconcile founding status — do **not** set access back to `invited`:

```sql
UPDATE public.early_access_applications
SET founding_status = 'accepted'
WHERE id = '<application-id>'
  AND founding_status IS DISTINCT FROM 'declined';

-- Leave platform_access.access_status = 'active' unchanged.
```

Do **not** instruct or perform a recovery that updates only `platform_access.access_status`.
---

## Deferred UI

Resend Invite and Restore to Pending are not wired on the dashboard yet.

Server-side management functions:

| Action | Edge Function | Notes |
|--------|---------------|--------|
| Decline | `decline-pilot-applicant` | pending/invited → `declined` + `suspended`; Auth user preserved |
| Resend | `resend-pilot-invite` | accepted + invited only; updates `invite_resent_at` |
| Restore | `restore-pilot-applicant` | declined + suspended → pending + `pending_application`; no invite |
| Delete test app | `delete-pilot-applicant` | declined only; requires `confirm: "DELETE"`; blocked if operational data exists |

```powershell
node scripts/test-operator-application-management.mjs
```

---

## What the hotel does next

1. Open the Auth invitation email and set a password (lands on `account.html`).
2. Sign in at `login.html`.
3. Create their hotel workspace on Account.
4. Use Hotel Brain / Handover only for **their** workspace (RLS unchanged).

---

## Security checklist

- [ ] Operator row exists only for Hospitality Flow staff
- [ ] No `service_role` key in browser, Vercel public env, or hotel-facing docs
- [ ] No public signup enabled
- [ ] Invite / list functions reject non-operators (`403`)
- [ ] Browser cannot `SELECT` all `early_access_applications`
- [ ] Failed invite leaves `pending_application` / `pending`
- [ ] Workspace RLS still membership-scoped

---

## Automated checks

```powershell
node scripts/test-pilot-invite-pipeline.mjs
node scripts/test-early-access-status-consistency.mjs
node scripts/test-operator-application-management.mjs
node scripts/test-operator-dashboard.mjs
node scripts/test-platform-access-invitation-only.mjs
```
