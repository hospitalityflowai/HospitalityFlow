/**
 * Static security checks for early-access email function isolation.
 * Run: node scripts/test-early-access-email-security.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function fail(message) {
  console.error("FAIL:", message);
  return false;
}

function pass(message) {
  console.log("PASS:", message);
  return true;
}

function grepFiles(pattern, files) {
  const hits = [];
  for (const file of files) {
    const src = read(file);
    if (pattern.test(src)) {
      hits.push(file);
    }
  }
  return hits;
}

function main() {
  let ok = true;
  const emailFn = read("supabase/functions/send-early-access-emails/index.ts");
  const submitFn = read("supabase/functions/submit-early-access-application/index.ts");
  const earlyAccessJs = read("js/early-access.js");
  const frontendFiles = [
    "js/early-access.js",
    "index.html",
    "js/auth.js",
    "js/supabase-config.js",
    "js/dev-flags.example.js"
  ];

  if (!/hasValidInternalSecret/.test(emailFn)) {
    ok = fail("send-early-access-emails missing internal secret check") && ok;
  } else {
    ok = pass("Email function requires internal secret") && ok;
  }

  if (/loadApplicationByEmail/.test(emailFn)) {
    ok = fail("Email function still supports public email lookup") && ok;
  } else {
    ok = pass("Email function accepts applicationId only") && ok;
  }

  if (/send-early-access-emails/.test(earlyAccessJs)) {
    ok = fail("Frontend still invokes send-early-access-emails directly") && ok;
  } else {
    ok = pass("Frontend no longer calls email-only function") && ok;
  }

  if (!/submit-early-access-application/.test(earlyAccessJs)) {
    ok = fail("Frontend missing submit-early-access-application invoke") && ok;
  } else {
    ok = pass("Frontend submits through trusted submit function") && ok;
  }

  if (!/submit_early_access_application/.test(submitFn)) {
    ok = fail("Submit function missing RPC save path") && ok;
  } else {
    ok = pass("Submit function saves application server-side") && ok;
  }

  if (!/X-Early-Access-Internal-Secret/.test(submitFn)) {
    ok = fail("Submit function missing internal secret header for email dispatch") && ok;
  } else {
    ok = pass("Submit function calls email function with internal secret") && ok;
  }

  const secretLeaks = grepFiles(
    /EARLY_ACCESS_EMAILS_INTERNAL_SECRET|X-Early-Access-Internal-Secret/,
    frontendFiles
  );
  if (secretLeaks.length) {
    ok = fail("Internal secret referenced in frontend: " + secretLeaks.join(", ")) && ok;
  } else {
    ok = pass("No internal secret in frontend files") && ok;
  }

  if (/errors:\s*emailResult\.errors/.test(emailFn)) {
    ok = fail("Email function may expose internal errors to caller") && ok;
  } else {
    ok = pass("Email function response omits internal error details") && ok;
  }

  if (ok) {
    console.log("\nAll early-access email security checks passed.");
    process.exit(0);
  }

  console.error("\nEarly-access email security checks failed.");
  process.exit(1);
}

main();
