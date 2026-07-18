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
| Authentication | Hotel Brain profile |
| Hotel workspace membership (later) | Saved handovers |
| Early Access applications (later) | SOP / Rota drafts |

Phase 1 does not change any existing product behaviour.

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
