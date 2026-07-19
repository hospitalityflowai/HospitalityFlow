/**
 * Generates js/supabase-config.js for production builds (e.g. Vercel).
 * Reads SUPABASE_URL and SUPABASE_ANON_KEY from the environment.
 * Local development: copy js/supabase-config.example.js to js/supabase-config.js instead.
 */
"use strict";

var fs = require("fs");
var path = require("path");

var OUTPUT = path.join(__dirname, "..", "js", "supabase-config.js");
var url = process.env.SUPABASE_URL;
var anonKey = process.env.SUPABASE_ANON_KEY;

function isPlaceholder(value) {
  if (!value || typeof value !== "string") return true;
  var trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed === "YOUR_SUPABASE_PROJECT_URL" || trimmed === "YOUR_SUPABASE_ANON_KEY") return true;
  if (/^YOUR_/i.test(trimmed) || /YOUR_SUPABASE/i.test(trimmed)) return true;
  if (/example\.supabase\.co/i.test(trimmed)) return true;
  if (/eyJexample/i.test(trimmed)) return true;
  return false;
}

if (isPlaceholder(url) || isPlaceholder(anonKey)) {
  if (fs.existsSync(OUTPUT)) {
    console.log("SUPABASE_URL / SUPABASE_ANON_KEY not set — keeping existing js/supabase-config.js");
    process.exit(0);
  }

  console.error(
    "Missing Supabase configuration.\n" +
    "  Vercel: set SUPABASE_URL and SUPABASE_ANON_KEY in project environment variables.\n" +
    "  Local:  copy js/supabase-config.example.js to js/supabase-config.js and add your keys."
  );
  process.exit(1);
}

var content =
  "/** Generated at build time - do not edit. Anon key is public (browser-safe). */\n" +
  "(function (global) {\n" +
  "  \"use strict\";\n" +
  "  global.HF_SUPABASE_CONFIG = {\n" +
  "    url: " + JSON.stringify(url.trim()) + ",\n" +
  "    anonKey: " + JSON.stringify(anonKey.trim()) + "\n" +
  "  };\n" +
  "})(window);\n";

fs.writeFileSync(OUTPUT, content, "utf8");
console.log("Generated js/supabase-config.js for production.");
