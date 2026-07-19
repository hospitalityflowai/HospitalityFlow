# Hospitality Flow

Static HTML tools for independent and boutique hotels — AI Shift Handover, Hotel Brain, SOP generator, and more.

## Local development

Hospitality Flow must be served over HTTP (not opened as `file://`) so Supabase config and auth work correctly. The local dev server uses **port 5500**, matching the redirect URLs in [SUPABASE_SETUP.md](SUPABASE_SETUP.md).

### First-time setup

```bash
npm install
```

Copy `js/supabase-config.example.js` to `js/supabase-config.js` and add your Supabase credentials. See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for full setup.

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
