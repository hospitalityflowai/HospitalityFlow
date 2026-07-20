/**
 * Generates js/supabase-config.js for production builds (e.g. Vercel).
 * Reads SUPABASE_URL and SUPABASE_ANON_KEY from the environment.
 *
 * Local development (choose one):
 *   1. Copy js/supabase-config.example.js to js/supabase-config.js and edit url + anonKey.
 *   2. Create .env.local with SUPABASE_URL and SUPABASE_ANON_KEY, then run npm run build.
 */
"use strict";

var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
var OUTPUT = path.join(ROOT, "js", "supabase-config.js");
var ENV_LOCAL = path.join(ROOT, ".env.local");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  var lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  lines.forEach(function (line) {
    var trimmed = line.trim();
    if (!trimmed || trimmed.charAt(0) === "#") return;

    var eq = trimmed.indexOf("=");
    if (eq === -1) return;

    var key = trimmed.slice(0, eq).trim();
    var value = trimmed.slice(eq + 1).trim();
    if (
      (value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') ||
      (value.charAt(0) === "'" && value.charAt(value.length - 1) === "'")
    ) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

loadEnvFile(ENV_LOCAL);

var url = process.env.SUPABASE_URL;
var anonKey = process.env.SUPABASE_ANON_KEY;

function isPlaceholder(value) {
  if (!value || typeof value !== "string") return true;
  var trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed === "YOUR_SUPABASE_PROJECT_URL" || trimmed === "YOUR_SUPABASE_ANON_KEY") return true;
  if (/^YOUR_/i.test(trimmed) || /YOUR_SUPABASE/i.test(trimmed)) return true;
  if (/PASTE_YOUR/i.test(trimmed)) return true;
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
    "  Local:  copy js/supabase-config.example.js to js/supabase-config.js and add your keys,\n" +
    "          or create .env.local with SUPABASE_URL and SUPABASE_ANON_KEY, then run npm run build."
  );
  process.exit(1);
}

var content =
  "/** Generated at build time — do not edit. Anon/publishable key is public (browser-safe). */\n" +
  "window.HF_SUPABASE_CONFIG = {\n" +
  "  url: " + JSON.stringify(url.trim()) + ",\n" +
  "  anonKey: " + JSON.stringify(anonKey.trim()) + "\n" +
  "};\n";

fs.writeFileSync(OUTPUT, content, "utf8");
console.log("Generated js/supabase-config.js for production.");
