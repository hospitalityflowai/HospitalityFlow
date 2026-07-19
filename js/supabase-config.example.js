/**
 * Hospitality Flow — Supabase configuration (example)
 *
 * Copy this file to supabase-config.js and replace the placeholders with your
 * Supabase project URL and public anon key.
 *
 * Do not commit supabase-config.js — it is listed in .gitignore.
 * Never put the service-role key in browser code.
 *
 * Production (Vercel) generates js/supabase-config.js at build time from
 * SUPABASE_URL and SUPABASE_ANON_KEY environment variables.
 */
(function (global) {
  "use strict";

  global.HF_SUPABASE_CONFIG = {
    url: "YOUR_SUPABASE_PROJECT_URL",
    anonKey: "YOUR_SUPABASE_ANON_KEY"
  };
})(window);
