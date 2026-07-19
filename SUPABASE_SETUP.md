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

When you deploy to Vercel:

1. Open your **Hospitality Flow** project in the Vercel dashboard.
2. Go to **Settings** → **Environment Variables** (right-hand project settings panel).
3. Add:

   | Name | Value | Environments |
   |------|-------|--------------|
   | `SUPABASE_URL` | Your Supabase project URL | Production, Preview |
   | `SUPABASE_ANON_KEY` | Your Supabase anon public key | Production, Preview |

4. Save.

**Note:** This repository is currently static HTML with no build step. Vercel environment variables are documented here so they are ready when you add a deploy step or serverless function that injects config into pages. Until then, local development uses `js/supabase-config.js` directly.

Do **not** add `SUPABASE_SERVICE_ROLE_KEY` to client-facing Vercel variables.

---

## 6. Scope reminder

| Use Supabase for | Keep local for now |
|------------------|-------------------|
| Customer accounts | Handover drafts |
| Authentication | Hotel Brain profile (local) |
| Hotel workspace (Phase 3) | Saved handovers |
| Early Access applications (later) | SOP / Rota drafts |

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
2. **Authentication** → **URL Configuration** — add your site URL and redirect URLs, e.g.:
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
