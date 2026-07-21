# Hospitality Flow

Static HTML tools for independent and boutique hotels — AI Shift Handover, Hotel Brain, SOP generator, and more.

## Local development

Hospitality Flow must be served over HTTP (not opened as `file://`) so Supabase config and auth work correctly. The local dev server uses **port 5500**, matching the redirect URLs in [SUPABASE_SETUP.md](SUPABASE_SETUP.md).

### First-time setup

```bash
npm install
```

Copy the example Supabase config and add your project credentials:

```bash
cp js/supabase-config.example.js js/supabase-config.js
```

Edit `js/supabase-config.js` with your Supabase **Project URL** and **anon public** key (from Supabase → Project Settings → API). See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for full setup.

`js/supabase-config.js` is gitignored and must not be committed.

### Start the dev server

From the project root:

```bash
npm run dev
```

Then open [http://localhost:5500](http://localhost:5500) in your browser.

Useful entry points:

| Page | URL |
|------|-----|
| Landing page | http://localhost:5500/index.html |
| Sign in | http://localhost:5500/login.html |
| Account | http://localhost:5500/account.html |
| Hotel Brain | http://localhost:5500/hotel-profile.html |
| AI Shift Handover | http://localhost:5500/handover.html |

Press `Ctrl+C` in the terminal to stop the server.

---

## Deploy to Vercel (production)

Production builds generate `js/supabase-config.js` at deploy time from environment variables. The **anon public** key is safe for browser use. Never add the **service_role** key to Vercel or client-side code.

### 1. Vercel environment variables

In the [Vercel dashboard](https://vercel.com) → your project → **Settings** → **Environment Variables**, add:

| Name | Value | Environments |
|------|-------|--------------|
| `SUPABASE_URL` | `https://your-project-ref.supabase.co` | Production, Preview |
| `SUPABASE_ANON_KEY` | Your Supabase **anon public** key | Production, Preview |

Copy both from Supabase → **Project Settings** → **API**.

### 2. Build settings

This repo includes `vercel.json` with:

- **Build command:** `npm run build` (generates `js/supabase-config.js`)
- **Output directory:** `.` (static HTML site root)

Vercel runs `npm install` then `npm run build` on each deployment. No framework is required.

### 3. Supabase auth URLs (production)

In Supabase → **Authentication** → **URL Configuration**, set:

- **Site URL:** `https://hospitalityflow.co.uk`
- **Redirect URLs** (add each):
  - `https://hospitalityflow.co.uk/account.html`
  - `https://hospitalityflow.co.uk/reset-password.html`

For local testing, also keep `http://localhost:5500/...` URLs (see [SUPABASE_SETUP.md](SUPABASE_SETUP.md)).

### 4. Deploy

Push to the branch connected to Vercel (or trigger a redeploy from the dashboard). The build must succeed — if `SUPABASE_URL` or `SUPABASE_ANON_KEY` is missing, the build fails with a clear error.

### 5. Verify production auth

After deployment:

1. Open [https://hospitalityflow.co.uk/js/supabase-config.js](https://hospitalityflow.co.uk/js/supabase-config.js) — should return JavaScript with your project URL (not 404).
2. Open [https://hospitalityflow.co.uk/supabase-check.html](https://hospitalityflow.co.uk/supabase-check.html) — `isConfigured()` should be **true**.
3. Open [https://hospitalityflow.co.uk/login.html](https://hospitalityflow.co.uk/login.html) and sign in.

If step 1 returns 404, the build did not generate the config file — check Vercel build logs and environment variables.

---

## Local vs production config

| Environment | How Supabase is configured |
|-------------|----------------------------|
| **Local** | Manual `js/supabase-config.js` (gitignored) |
| **Vercel** | Generated at build from `SUPABASE_URL` + `SUPABASE_ANON_KEY` |

Application code is unchanged — all auth pages load `js/supabase-config.js` in both environments.
