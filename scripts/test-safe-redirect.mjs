/**
 * Regression tests for authentication redirect allowlisting (Gate #3 Step 1).
 * Run: node scripts/test-safe-redirect.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  resolveInternalRedirect,
  resolveTrustedAbsoluteUrl,
  ALLOWED_POST_AUTH_ROUTES,
  DEFAULT_POST_AUTH_ROUTE,
  OPERATOR_ROUTE,
  RESET_PASSWORD_ROUTE,
  PRODUCTION_SITE_ORIGIN
} from "./lib/safe-redirect.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

let passed = 0;
let failed = 0;

function assert(name, condition, detail = "") {
  if (condition) {
    console.log(`PASS ${name}${detail ? ` | ${detail}` : ""}`);
    passed += 1;
  } else {
    console.error(`FAIL ${name}${detail ? ` | ${detail}` : ""}`);
    failed += 1;
  }
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function main() {
  console.log("Hospitality Flow — safe-redirect regressions\n");

  // 1–2 valid internal
  assert(
    "1. Valid workspace redirect accepted",
    resolveInternalRedirect("account.html") === "account.html"
  );
  assert(
    "2. Valid handover redirect accepted",
    resolveInternalRedirect("handover.html") === "handover.html"
  );

  // 3–11 denials / defaults
  assert(
    "3. External HTTPS redirect rejected",
    resolveInternalRedirect("https://evil.example") === DEFAULT_POST_AUTH_ROUTE
  );
  assert(
    "3b. External HTTP redirect rejected",
    resolveInternalRedirect("http://evil.example") === DEFAULT_POST_AUTH_ROUTE
  );
  assert(
    "4. Protocol-relative redirect rejected",
    resolveInternalRedirect("//evil.example") === DEFAULT_POST_AUTH_ROUTE
  );
  assert(
    "5. javascript: rejected",
    resolveInternalRedirect("javascript:alert(1)") === DEFAULT_POST_AUTH_ROUTE
  );
  assert(
    "6. data: rejected",
    resolveInternalRedirect("data:text/html,hi") === DEFAULT_POST_AUTH_ROUTE
  );
  assert(
    "7. Backslash bypass rejected",
    resolveInternalRedirect("/\\evil.example") === DEFAULT_POST_AUTH_ROUTE &&
      resolveInternalRedirect("\\evil.example") === DEFAULT_POST_AUTH_ROUTE
  );
  assert(
    "8. Encoded external redirect rejected",
    resolveInternalRedirect("%68%74%74%70%73%3a%2f%2fevil.example") ===
      DEFAULT_POST_AUTH_ROUTE
  );
  assert(
    "9. Double-encoded external redirect rejected",
    resolveInternalRedirect(
      "%2568%2574%2574%2570%2573%253a%252f%252fevil.example"
    ) === DEFAULT_POST_AUTH_ROUTE
  );
  assert(
    "10. Unknown internal page rejected",
    resolveInternalRedirect("supabase-check.html") === DEFAULT_POST_AUTH_ROUTE &&
      resolveInternalRedirect("admin.html") === DEFAULT_POST_AUTH_ROUTE
  );
  assert(
    "11. Empty redirect uses safe default",
    resolveInternalRedirect("") === DEFAULT_POST_AUTH_ROUTE &&
      resolveInternalRedirect(null) === DEFAULT_POST_AUTH_ROUTE
  );

  // 12–13 operator gating
  assert(
    "12. Non-operator cannot use operator redirect",
    resolveInternalRedirect(OPERATOR_ROUTE, { isOperator: false }) ===
      DEFAULT_POST_AUTH_ROUTE
  );
  assert(
    "13. Authorized operator can use operator redirect",
    resolveInternalRedirect(OPERATOR_ROUTE, { isOperator: true }) ===
      OPERATOR_ROUTE
  );

  // 14–15 reset absolute URL
  const trusted = resolveTrustedAbsoluteUrl(null, {
    siteUrl: "https://hospitalityflow.co.uk",
    allowedPath: RESET_PASSWORD_ROUTE
  });
  assert(
    "14. Reset redirectTo uses trusted configured origin",
    trusted === "https://hospitalityflow.co.uk/reset-password.html",
    trusted
  );

  const overridden = resolveTrustedAbsoluteUrl(
    "https://evil.example/reset-password.html",
    {
      siteUrl: "https://hospitalityflow.co.uk",
      allowedPath: RESET_PASSWORD_ROUTE
    }
  );
  assert(
    "15. User-controlled reset URL cannot override origin",
    overridden === "https://hospitalityflow.co.uk/reset-password.html",
    overridden
  );

  const pathOverride = resolveTrustedAbsoluteUrl(
    "https://hospitalityflow.co.uk/account.html",
    {
      siteUrl: "https://hospitalityflow.co.uk",
      allowedPath: RESET_PASSWORD_ROUTE
    }
  );
  assert(
    "15b. User-controlled reset URL cannot override path",
    pathOverride === "https://hospitalityflow.co.uk/reset-password.html",
    pathOverride
  );

  const localhostOk = resolveTrustedAbsoluteUrl(
    "http://localhost:5500/reset-password.html",
    {
      siteUrl: "https://hospitalityflow.co.uk",
      allowedOriginsExtra: ["http://localhost:5500"],
      allowedPath: RESET_PASSWORD_ROUTE
    }
  );
  assert(
    "15c. Allowlisted localhost origin accepted for reset",
    localhostOk === "http://localhost:5500/reset-password.html",
    localhostOk
  );

  const missingConfig = resolveTrustedAbsoluteUrl(null, {
    siteUrl: "",
    allowedPath: RESET_PASSWORD_ROUTE
  });
  assert(
    "15d. Missing SITE_URL falls back to production origin",
    missingConfig === `${PRODUCTION_SITE_ORIGIN}/reset-password.html`,
    missingConfig
  );

  const inviteEvil = resolveTrustedAbsoluteUrl("https://evil.example/account.html", {
    siteUrl: "https://hospitalityflow.co.uk",
    allowedPath: "account.html"
  });
  assert(
    "15e. Invite redirect rejects unlisted origin",
    inviteEvil === "https://hospitalityflow.co.uk/account.html"
  );

  // Wiring / sync checks
  const authJs = read("js/auth.js");
  const edgeReset = read("supabase/functions/request-password-reset/index.ts");
  const edgeInvite = read("supabase/functions/invite-pilot-applicant/index.ts");
  const browser = read("js/safe-redirect.js");
  const edgeShared = read("supabase/functions/_shared/safe-redirect.ts");

  assert(
    "16a. auth.js uses HFSafeRedirect / resolvePostAuthRedirect",
    /resolvePostAuthRedirect/.test(authJs) &&
      /HFSafeRedirect/.test(authJs) &&
      /isOperator:\s*isOperator/.test(authJs)
  );
  assert(
    "16b. password-reset Edge uses resolvePasswordResetRedirectTo",
    /resolvePasswordResetRedirectTo/.test(edgeReset) &&
      !/const redirectTo = typeof body\.redirectTo === "string" \? body\.redirectTo\.trim\(\)/.test(
        edgeReset
      )
  );
  assert(
    "16c. invite Edge uses resolveInviteRedirectTo",
    /resolveInviteRedirectTo/.test(edgeInvite) &&
      !/return `\$\{siteUrl\}\/account\.html`/.test(edgeInvite)
  );

  for (const route of ALLOWED_POST_AUTH_ROUTES) {
    assert(
      `16d. browser allowlist includes ${route}`,
      browser.includes(`"${route}"`)
    );
    assert(
      `16e. edge allowlist includes ${route}`,
      edgeShared.includes(`"${route}"`)
    );
  }

  const loginHtml = read("login.html");
  assert(
    "16f. login.html loads safe-redirect.js before auth.js",
    loginHtml.indexOf("js/safe-redirect.js") < loginHtml.indexOf("js/auth.js") &&
      loginHtml.indexOf("js/safe-redirect.js") !== -1
  );

  console.log(
    `\nResults: ${passed} passed, ${failed} failed, ${passed + failed} total`
  );
  process.exit(failed === 0 ? 0 : 1);
}

main();
