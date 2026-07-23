# Hospitality Flow — Supabase Setup (Phase 1)

Phase 1 adds the Supabase connection foundation for **customer accounts and authentication only**.

Existing tools (`handover.html`, `hotel-profile.html`, `sop.html`, `rota.html`, and the landing page) continue to work locally with `localStorage` until later phases connect hotel workspaces.

---

## What was added

| File | Purpose |
|------|---------|
| `js/supabase-config.example.js` | Committed template with placeholders |
| `js/supabase-config.js` | Your local config (gitignored — create this yourself) |
| `js/supabase-client.js` | Reusable browser client (`window.HospitalityFlowSupabase`) |

No existing pages load these files yet. They are ready for login, workspace, and account features in later phases.

**Verify locally:** open [`supabase-check.html`](supabase-check.html) in your browser (via a local server). It confirms `HospitalityFlowSupabase.isConfigured()` returns true and optionally tests client initialisation.

---

## 1. Find your Supabase project URL

1. Open [Supabase](https://supabase.com) and sign in.
2. Select your Hospitality Flow project.
3. Go to **Project Settings** → **API**.
4. Copy **Project URL** (format: `https://xxxxxxxx.supabase.co`).

---

## 2. Find your public anon key

On the same **Project Settings** → **API** page:

1. Under **Project API keys**, find the **`anon` `public`** key.
2. Copy that key.

Use only the **anon public** key in browser code.

**Never** put the **service_role** key in:

- `js/supabase-config.js`
- HTML or JavaScript loaded by the browser
- Git commits
- Vercel environment variables consumed directly by client-side code

The service-role key belongs only on secure server-side systems, if you add them later.

---

## 3. Configure locally

1. Copy the example config:

   ```text
   js/supabase-config.example.js  →  js/supabase-config.js
   ```

2. Open `js/supabase-config.js` and replace the placeholders:

   ```javascript
   window.HF_SUPABASE_CONFIG = {
     url: "https://your-project-ref.supabase.co",
     anonKey: "your-anon-public-key-here"
   };
   ```

3. Save the file.

`js/supabase-config.js` is in `.gitignore` and must not be committed.

---

## 4. Load order (future pages)

When you add login or workspace pages, use this script order:

```html
<script src="js/supabase-config.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<script src="js/supabase-client.js"></script>
```

Or call `HospitalityFlowSupabase.initClient()` — the client module can load the CDN automatically if it is not already present.

Example check:

```javascript
if (HospitalityFlowSupabase.isConfigured()) {
  HospitalityFlowSupabase.initClient().then(function (client) {
    if (client) {
      // Ready for auth in a later phase
    }
  });
}
```

---

## 5. Configure Vercel (for deployment)

Production uses a build step to generate `js/supabase-config.js` from Vercel environment variables. Local development still uses a manual gitignored copy (see section 3).

### Environment variables

1. Open your **Hospitality Flow** project in the [Vercel dashboard](https://vercel.com).
2. Go to **Settings** → **Environment Variables**.
3. Add:

   | Name | Value | Environments |
   |------|-------|--------------|
   | `SUPABASE_URL` | Your Supabase project URL | Production, Preview |
   | `SUPABASE_ANON_KEY` | Your Supabase anon public key | Production, Preview |

4. Save and redeploy.

Do **not** add `SUPABASE_SERVICE_ROLE_KEY` to client-facing Vercel variables.

### Build

The repo includes:

| File | Purpose |
|------|---------|
| `vercel.json` | Runs `npm run build` on deploy |
| `scripts/generate-supabase-config.js` | Writes `js/supabase-config.js` from env vars |
| `package.json` `"build"` script | Invoked by Vercel before static deploy |

If env vars are missing on Vercel, the build fails. Locally, `npm run build` skips generation when env vars are unset but `js/supabase-config.js` already exists.

### Production Supabase auth URLs

Set **Site URL** to `https://hospitalityflow.co.uk` and add redirect URLs for `account.html` and `reset-password.html` on that domain (see README deployment section).

---

## 6. Scope reminder

| Use Supabase for | Keep local for now |
|------------------|-------------------|
| Customer accounts | Handover drafts |
| Authentication | SOP / Rota drafts |
| Hotel workspace (Phase 3) | Saved handovers (local) |
| Hotel Brain profile (Phase 4) | |
| Early Access applications | |

Phase 1 does not change any existing product behaviour.

---

## 8. Phase 2 — Customer authentication

Auth pages (use a local server so `js/supabase-config.js` loads):

| Page | URL | Purpose |
|------|-----|---------|
| Sign up | `signup.html` | Create account with email and password |
| Sign in | `login.html` | Sign in to existing account |
| Forgot password | `forgot-password.html` | Request a password reset email |
| Reset password | `reset-password.html` | Set a new password from the email link |
| Account | `account.html` | Protected placeholder dashboard + sign out |

Shared modules: `js/auth.js`, `css/auth.css`

### Enable email auth in Supabase

1. Supabase dashboard → **Authentication** → **Providers** → **Email** → ensure enabled.
2. **Disable public sign-up (required for invitation-only pilot):**
   - **Dashboard:** **Authentication** → **Providers** → **Email** → turn **off** **Enable sign ups**  
     — or **Authentication** → **Settings** → turn **off** **Allow new users to sign up** (wording varies by dashboard version).
   - **CLI (linked project):** this repo sets `auth.enable_signup = false` and `auth.email.enable_signup = false` in [`supabase/config.toml`](supabase/config.toml). Push with:
     ```powershell
     npx supabase config push
     ```
   - **Verify:** run `node scripts/verify-server-signups-disabled.mjs` (reads project auth config via Supabase CLI/Management API when logged in).
   - The UI also blocks sign-up in `js/auth.js` (`PUBLIC_SIGNUP_ENABLED = false`), but **Dashboard/CLI sign-up disable is the server-side enforcement** — without it, anyone with the anon key can call `auth.signUp()`.
3. **Authentication** → **URL Configuration** — add your site URL and redirect URLs, e.g.:
   - `http://localhost:5500/account.html` (local)
   - `http://localhost:5500/reset-password.html` (local password reset)
   - `https://your-domain.co.uk/account.html` (production)
   - `https://your-domain.co.uk/reset-password.html` (production password reset)

### Session behaviour

- Sessions persist in the browser via Supabase (`persistSession: true` in `js/supabase-client.js`).
- Signed-in users visiting `login.html` or `signup.html` are redirected to `account.html`.
- Unauthenticated users visiting `account.html` are redirected to `login.html`.

Existing tools (`handover.html`, `hotel-profile.html`, etc.) are unchanged and still use local storage.

---

## 10. Password recovery and password management

Users can reset a forgotten password by email, set a new password from the recovery link, or change their password while signed in on `account.html`.

### Auth pages

| Page | URL | Purpose |
|------|-----|---------|
| Forgot password | `forgot-password.html` | Request a password reset email |
| Reset password | `reset-password.html` | Set a new password from the email link |
| Sign in | `login.html` | Includes **Forgot password?** link |

Shared logic lives in `js/auth.js` (`requestPasswordReset`, `updatePassword`, `initChangePasswordSection`).

### Supabase redirect URL (required)

Password reset emails must redirect back to **`reset-password.html`** on your site.

1. Supabase dashboard → **Authentication** → **URL Configuration**.
2. Set **Site URL** to your primary app URL (e.g. `http://localhost:5500` for local testing, or your production domain).
3. Under **Redirect URLs**, add every environment where you test or deploy:
   - `http://localhost:5500/reset-password.html`
   - `http://127.0.0.1:5500/reset-password.html` (if you use this host)
   - `https://your-domain.co.uk/reset-password.html` (production)

The app sends this redirect automatically via `resetPasswordForEmail()` in `js/auth.js`. If the URL is missing from Supabase, the reset link will fail or redirect incorrectly.

Optional: customise the reset email template under **Authentication** → **Email Templates** → **Reset password**.

### Password rules

| Flow | Minimum length | Confirmation |
|------|----------------|--------------|
| Sign up | 6 characters (unchanged) | Yes |
| Reset password (email link) | 8 characters | Yes |
| Change password (account page) | 8 characters | Yes |

### Local testing steps

1. Serve the project locally so `js/supabase-config.js` loads (e.g. VS Code Live Server on port 5500).
2. Confirm **Redirect URLs** includes `http://localhost:5500/reset-password.html` in Supabase.
3. Open `login.html` → click **Forgot password?**
4. Enter the email for an existing account → submit.
5. Check your inbox (and spam) for the Supabase reset email.
6. Click the link — you should land on `reset-password.html` with the reset form enabled.
7. Enter a new password (8+ characters) and confirmation → submit.
8. You should be redirected to `login.html` with a success message.
9. Sign in with the new password.
10. On `account.html`, use **Change password** to update again (requires current password).

### Troubleshooting password reset

**Reset link opens but form says invalid or expired**

- Links expire after a short time (Supabase default). Request a new link from `forgot-password.html`.
- Confirm `reset-password.html` is listed under **Redirect URLs** exactly (including `http` vs `https` and port).

**Email never arrives**

- Check spam/junk folders.
- Confirm the email address belongs to an existing account.
- In Supabase → **Authentication** → **Users**, confirm the account exists.

**“Current password is incorrect” on account page**

- Re-enter your current password carefully. The change-password form verifies it before updating.

### QA / development — frequent password reset testing

**Current bottleneck: Supabase Auth (GoTrue)** — not Resend, not the Edge Function itself.

Password reset uses `auth.resetPasswordForEmail()` which sends mail through **Supabase Auth’s mailer** (built-in or your Auth SMTP settings). The confirmed error is:

- HTTP `429`
- Code `over_email_send_rate_limit`
- Message `email rate limit exceeded`

**Resend** is only used by the `send-early-access-emails` function for Founding Pilot application emails. It does not send password-reset mail.

#### Option A — recommended for repeated E2E QA (no email rate limit)

Temporary **development-only** mode bypasses Auth email sending and logs a recovery link to Edge Function logs instead.

1. Copy `js/dev-flags.example.js` → `js/dev-flags.js` (gitignored).
2. Set on the linked project (QA only):

   ```bash
   supabase secrets set PASSWORD_RESET_DEV_RELAXED=true
   supabase secrets set PASSWORD_RESET_DEV_KEY=<long-random-string>
   ```

3. In `js/dev-flags.js` set:

   ```javascript
   PASSWORD_RESET_DEV_RELAXED: true,
   PASSWORD_RESET_DEV_KEY: "<same-long-random-string>"
   ```

4. Redeploy `request-password-reset`.
5. Submit forgot-password → open **Edge Functions → request-password-reset → Logs** → copy `[DEV-QA] Recovery link generated without sending email`.
6. Open that link to complete reset (invitation-only access checks still apply).

**Before public launch:** unset both secrets, set `PASSWORD_RESET_DEV_RELAXED: false`, redeploy.

#### Option B — raise Supabase Auth rate limits temporarily

In Supabase Dashboard:

1. **Authentication** → **Rate Limits** (or **Project Settings** → **Auth** → rate limits, depending on dashboard version).
2. Increase limits for **email sending** / **password recovery** (e.g. emails per hour per address).
3. Wait for the current window to expire if already rate-limited.

This cannot be changed from Edge Function code. Local CLI projects can tune `[auth.rate_limit]` in `config.toml` when using `supabase start`.

#### Production safety

- Invitation-only logic (`is_password_reset_allowed`) is unchanged in both modes.
- Dev mode requires **both** server secrets **and** matching client key header.
- Browser still receives the same neutral success message; recovery URLs appear only in function logs.

---

## 9. Phase 3 — Hotel workspace foundation

After sign-in, users create their first hotel workspace on `account.html`.

### Existing database tables (reused)

| Table | Columns used |
|-------|----------------|
| `hotels` | `id`, `name`, `property_type`, `number_of_rooms`, `city`, `country`, `status`, `created_at` |
| `hotel_members` | `id`, `hotel_id`, `user_id`, `role`, `created_at` |

`city` and `country` are added by the Phase 3 migration if they are not already present.

### Run the migration (required once)

1. Open Supabase → **SQL Editor**.
2. Paste and run [`supabase/migrations/phase3_hotel_workspace.sql`](supabase/migrations/phase3_hotel_workspace.sql).
3. Confirm success (adds columns, RLS policies, and `create_hotel_workspace` function).

### New files

| File | Purpose |
|------|---------|
| `js/workspace.js` | Load/create workspace, account page logic |
| `supabase/migrations/phase3_hotel_workspace.sql` | DB columns, RLS, atomic create function |

### Account page behaviour

| State | What the user sees |
|-------|-------------------|
| Not signed in | Redirect to `login.html` |
| Signed in, no hotel | Workspace creation form |
| Signed in, has hotel | Hotel name, role, tool links, sign out |

The first user to create a workspace receives the **`owner`** role via `hotel_members`.

### Testing Phase 3

1. Run the SQL migration in Supabase.
2. Serve the project locally (so `js/supabase-config.js` loads).
3. Open `signup.html` and create an account (or use `login.html`).
4. You should land on `account.html` with the **Create your hotel workspace** form.
5. Submit:
   - Hotel name
   - Property type
   - Number of rooms
   - City
   - Country
6. Confirm the dashboard shows your hotel name and **Your role: Owner**.
7. Refresh the page — the creation form should not reappear.
8. Sign out and sign in again — your workspace should still load.
9. Confirm `handover.html` and `hotel-profile.html` still work locally (unchanged).

### Troubleshooting Phase 3

**“Workspace changes are not permitted”**

- Run `phase3_hotel_workspace.sql` and `phase5_hotel_workspace_edit.sql` in the Supabase SQL Editor.

**“Workspace creation is not permitted”**

- Run `phase3_hotel_workspace.sql` in the Supabase SQL Editor.

**“Database setup incomplete”**

- The migration adds `city` and `country` columns. Re-run the migration.

**“User already belongs to a hotel workspace”**

- Expected if the account already created a hotel. Refresh to see the dashboard.

**Empty dashboard after create**

- Check Supabase → **Table Editor** → `hotels` and `hotel_members` for new rows.
- Confirm RLS policies were created by the migration.

---

## 11. Phase 4 — Hotel Brain cloud sync

Hotel Brain profiles are stored in Supabase (one record per hotel workspace). The editor UI is unchanged; save/load now uses the cloud instead of `localStorage`.

### Run the migration (required once)

1. Open Supabase → **SQL Editor**.
2. Paste and run [`supabase/migrations/phase4_hotel_brain.sql`](supabase/migrations/phase4_hotel_brain.sql).
3. Confirm success (creates `hotel_brain_profiles` table and RLS policies).

### New files

| File | Purpose |
|------|---------|
| `js/hotel-brain-store.js` | Load/save Hotel Brain via Supabase (`window.HFHotelBrainStore`) |
| `supabase/migrations/phase4_hotel_brain.sql` | `hotel_brain_profiles` table + RLS |

### Database table

| Table | Purpose |
|-------|---------|
| `hotel_brain_profiles` | One row per `hotels.id`; full profile JSON in `profile_data` (jsonb) |

Access is scoped by `hotel_members` — users only read/write their own hotel's profile.

### Behaviour

| Action | Result |
|--------|--------|
| Sign in + open Account | Hotel Brain preloads in the background |
| Open `hotel-profile.html` (signed in) | Loads profile from Supabase; creates empty profile seeded from workspace if none exists |
| Save Hotel Brain | Upserts profile to Supabase |
| Open `handover.html` / `sop.html` (signed in) | Loads Hotel Brain from Supabase into the app |
| Not signed in / no workspace | Tools show empty Hotel Brain; profile page shows a clear error message |

### Testing Phase 4

1. Run `phase4_hotel_brain.sql` in Supabase.
2. Sign in and ensure you have a hotel workspace (Phase 3).
3. Open `hotel-profile.html` → fill in hotel details → **Save Hotel Brain**.
4. Refresh the page — data should reload from Supabase.
5. Open `handover.html` — Hotel Brain panel should show **Connected** with your hotel name.
6. Sign out, sign in again, reopen `hotel-profile.html` — profile should still load.
7. Confirm handover drafts and SOP drafts still use local storage (unchanged).

### Troubleshooting Phase 4

**“Sign in to load your Hotel Brain from the cloud.”**

- Open `login.html`, sign in, then return to Hotel Brain.

**“Create your hotel workspace on the Account page…”**

- Complete Phase 3 workspace creation on `account.html` first.

**“Hotel Brain database setup incomplete”**

- Run `phase4_hotel_brain.sql` in the Supabase SQL Editor.

**Save succeeds locally but handover shows Not Configured**

- Ensure you are signed in with the same account on both pages.
- Refresh `handover.html` after saving the profile.

---

## 12. Phase 5 — Hotel workspace editing

Workspace owners can edit hotel details (name, property type, rooms, city, country) on `account.html`. Changes are saved to the `hotels` table only — Hotel Brain profile data remains separate.

### Run the migration (required once)

1. Open Supabase → **SQL Editor**.
2. Paste and run [`supabase/migrations/phase5_hotel_workspace_edit.sql`](supabase/migrations/phase5_hotel_workspace_edit.sql).
3. Confirm success (adds owner-only UPDATE policy on `hotels`).

### Behaviour

| Role | Can edit workspace hotel details? |
|------|-----------------------------------|
| Owner | Yes — **Edit hotel details** on Account |
| Other roles | No — view only |

After saving, the workspace card updates immediately. Handover and SOP use the workspace hotel name for display when you are signed in.

---

## 13. Founding Pilot applications & transactional email (Resend)

The landing page (`index.html`) submits applications through the public **`submit-early-access-application`** Edge Function, which saves the row via RPC and calls **`send-early-access-emails` internally** (protected by `EARLY_ACCESS_EMAILS_INTERNAL_SECRET`). The browser must **not** call `send-early-access-emails` directly. Resend API keys live only in Supabase secrets — never in browser code.

### Run the migrations (required once)

1. Supabase → **SQL Editor** → run [`phase6_early_access_applications.sql`](supabase/migrations/phase6_early_access_applications.sql) if not already applied.
2. Run [`phase9_early_access_email_tracking.sql`](supabase/migrations/phase9_early_access_email_tracking.sql) (adds email delivery timestamps and `submit_early_access_application` RPC).

### Deploy Edge Functions (required)

Install the [Supabase CLI](https://supabase.com/docs/guides/cli), link your project, set the internal secret, then deploy **both** functions:

```powershell
# Generate once; store offline — never commit or expose in frontend
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$secret = [Convert]::ToBase64String($bytes)
npx supabase secrets set "EARLY_ACCESS_EMAILS_INTERNAL_SECRET=$secret"

npx supabase functions deploy send-early-access-emails
npx supabase functions deploy submit-early-access-application
```

Function config: [`supabase/config.toml`](supabase/config.toml) sets `verify_jwt = false` for the public submit function only. The email function rejects requests without `X-Early-Access-Internal-Secret`.

Verify: `node scripts/test-early-access-email-security.mjs` and `node scripts/verify-early-access-setup.mjs`.

### Set Supabase secrets

In the Supabase dashboard → **Edge Functions** → **Secrets**, or via CLI:

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxx
supabase secrets set RESEND_FROM_EMAIL="Hospitality Flow <hello@hospitalityflow.co.uk>"
supabase secrets set OWNER_NOTIFICATION_EMAIL=hello@hospitalityflow.co.uk
supabase secrets set EARLY_ACCESS_EMAILS_INTERNAL_SECRET=<long-random-string>
```

| Secret | Purpose |
|--------|---------|
| `RESEND_API_KEY` | Resend API key (never expose in frontend) |
| `RESEND_FROM_EMAIL` | Verified sender in Resend (display name + address) |
| `OWNER_NOTIFICATION_EMAIL` | Internal alert recipient for new applications |
| `EARLY_ACCESS_EMAILS_INTERNAL_SECRET` | Server-only header secret for internal email dispatch |
| `RESEND_REPLY_TO` | Optional — reply-to for applicant confirmation (defaults to omit) |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically to Edge Functions.

### Resend setup

1. Create a Resend account and verify your sending domain (`hospitalityflow.co.uk`).
2. Add the DNS records Resend requires (SPF, DKIM).
3. Use the verified address in `RESEND_FROM_EMAIL`.

### Behaviour

| Step | What happens |
|------|----------------|
| Applicant submits form | Row inserted via `submit_early_access_application` RPC |
| Edge Function invoked | Loads row by ID (service role), sends applicant + owner emails via Resend |
| Both emails succeed | Success message shown; `applicant_email_sent_at` / `owner_email_sent_at` updated |
| Email delivery fails | Application is **not** lost; failure logged in function logs; user sees success with an email delivery notice |
| Retry / duplicate invoke | Idempotent — already-sent emails are skipped using timestamp columns |

### Testing

1. Apply the migrations and deploy the function with secrets set.
2. Submit a test application on the landing page Founding Pilot form.
3. Confirm the row appears in Supabase → **Table Editor** → `early_access_applications`.
4. Confirm applicant and owner inboxes receive the branded HTML emails.
5. Check **Edge Functions** → **Logs** if emails do not arrive.

---

## 7. Troubleshooting

**`HospitalityFlowSupabase.isConfigured()` returns false**

- Confirm `js/supabase-config.js` exists (copied from the example).
- Confirm placeholders were replaced with real values.

**Client returns null**

- Check the browser console for CDN load errors.
- Confirm the anon key is correct and the Supabase project is active.

**Keys accidentally committed**

- Rotate the anon key in Supabase if needed.
- Remove the file from Git history and keep using `js/supabase-config.js` locally only.

---

## Contact

Questions: [hello@hospitalityflow.co.uk](mailto:hello@hospitalityflow.co.uk)
