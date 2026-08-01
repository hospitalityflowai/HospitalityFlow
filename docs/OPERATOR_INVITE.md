# Operator guide — Founding Pilot approve & invite

This is the **only supported** way to invite a Founding Pilot hotel after they apply on the public site.

Public users cannot create accounts. Operators must never put the **service_role** key in browser code, scripts shared with hotels, or frontend repos.

## Operator Dashboard (preferred)

Authorised operators (`platform_operators`) can review applications and invite from:

`operator.html`

1. Sign in with an operator account.
2. Open **Account** — an **Operator** section appears whenever `get_my_platform_access` returns `is_operator: true` (including users who are also hotel members with `access_status: "active"`).
3. Open the operator dashboard.
4. Review pending applications and click **Approve & Send Invite**.
5. Confirm in the modal. The page calls `invite-pilot-applicant` with `{ applicationId }` using your session JWT.

Hotel workspace access and operator privileges are **separate**. A hotel owner who is also in `platform_operators` keeps their workspace and also sees the Operator section.

The dashboard loads applications only through the read-only Edge Function `list-pilot-applications` (operator JWT required). Browser roles still cannot `SELECT` from `early_access_applications`.

**Not in this release:** Decline button, resend invitation.

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
| `ok: true`, `inviteSent: true`, `statusUpdated: true` | Invite email sent; status is `invited` | Done — tell hotel to check email |
| `ok: true`, `alreadyInvited: true` | Already invited | No change; resend only via Auth if needed |
| `ok: true`, `alreadyRegistered: true`, `statusUpdated: true` | Auth user already existed; now marked `invited` | Ask hotel to use prior invite or password reset |
| `ok: false`, `inviteSent: false`, `statusUpdated: false` | Invite email failed | Status stays pending — fix Auth/email, retry |
| `ok: false`, `inviteSent: true`, `statusUpdated: false` | Email sent but status update failed | Re-run the function, or manually set `platform_access.access_status = 'invited'` |
| `401` / `403` | Not signed in as an authorised operator | Refresh JWT; confirm `platform_operators` row |

**Rule:** a failed invitation must leave the applicant **pending**, not `invited`.

### E. Verify in the database

```sql
SELECT founding_status
FROM public.early_access_applications
WHERE id = '<application-id>';

SELECT email, access_status, invited_at, invited_by
FROM public.platform_access
WHERE early_access_application_id = '<application-id>';
```

Expect: `founding_status = accepted`, `access_status = invited`.

---

## Deferred (intentional)

- **Decline** from the dashboard — no secure decline Edge Function/RPC yet; use SQL/Table Editor if needed.
- **Resend invitation** — `invite-pilot-applicant` returns `alreadyInvited` without resending. Use Supabase Auth admin tools if a resend is required.

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
node scripts/test-operator-dashboard.mjs
node scripts/test-platform-access-invitation-only.mjs
```
