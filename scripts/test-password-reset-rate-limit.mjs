/**
 * Static checks for password-reset rate-limit handling.
 * Run: node scripts/test-password-reset-rate-limit.mjs
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

function main() {
  let ok = true;
  const fnSrc = read("supabase/functions/request-password-reset/index.ts");
  const authSrc = read("js/auth.js");

  const neutralMessage = "If this email is eligible, a reset link will be sent shortly.";

  if (!fnSrc.includes(neutralMessage)) {
    ok = fail("Edge function missing neutral success message") && ok;
  } else {
    ok = pass("Neutral success message defined in edge function") && ok;
  }

  if (!/isEmailRateLimitError/.test(fnSrc) || !/over_email_send_rate_limit/.test(fnSrc)) {
    ok = fail("Edge function missing rate-limit detection") && ok;
  } else {
    ok = pass("Rate-limit error detection present") && ok;
  }

  if (/return jsonResponse\(\{ error: "Could not send password reset email\." \}, 500 \)/.test(fnSrc)) {
    ok = fail("Edge function still returns 500 for reset delivery failures") && ok;
  } else {
    ok = pass("Reset delivery failures no longer return 500 to browser") && ok;
  }

  if (!/return neutralSuccessResponse\(\)/.test(fnSrc)) {
    ok = fail("Edge function must return neutralSuccessResponse for blocked/rate-limited cases") && ok;
  } else {
    ok = pass("Blocked and delivery-failure paths use neutralSuccessResponse") && ok;
  }

  if (/sent:\s*(true|false)/.test(fnSrc)) {
    ok = fail("Edge function still exposes sent flag") && ok;
  } else {
    ok = pass("No sent flag in browser response") && ok;
  }

  if (!authSrc.includes(neutralMessage)) {
    ok = fail("Forgot-password UI missing neutral message") && ok;
  } else {
    ok = pass("Forgot-password UI uses neutral message") && ok;
  }

  if (!/is_password_reset_allowed/.test(fnSrc)) {
    ok = fail("Invitation-only access check removed from edge function") && ok;
  } else {
    ok = pass("Invitation-only access check unchanged") && ok;
  }

  if (!/PASSWORD_RESET_DEV_RELAXED/.test(fnSrc) || !/auth\.admin\.generateLink/.test(fnSrc)) {
    ok = fail("Edge function missing temporary DEV-QA password reset bypass") && ok;
  } else {
    ok = pass("Temporary DEV-QA generateLink bypass present") && ok;
  }

  if (!/BEFORE PUBLIC LAUNCH/.test(fnSrc)) {
    ok = fail("Edge function missing launch revert comment") && ok;
  } else {
    ok = pass("Launch revert comment present") && ok;
  }

  if (ok) {
    console.log("\nAll password-reset rate-limit checks passed.");
    process.exit(0);
  }

  console.error("\nPassword-reset rate-limit checks failed.");
  process.exit(1);
}

main();
