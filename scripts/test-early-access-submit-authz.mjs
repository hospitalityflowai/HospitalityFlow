/**
 * F-A03 — Early Access submit authorization (Edge-only path).
 * Run: node scripts/test-early-access-submit-authz.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  validateSubmitBody,
  checkSubmitRateLimit,
  resetSubmitRateLimitBuckets,
  MAX_FIELD_LENGTH
} from "./lib/early-access-submit.mjs";

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

const valid = {
  firstName: "Alex",
  email: "alex@example.com",
  propertyName: "Harbour Inn",
  propertyType: "boutique-hotel",
  roomCount: 12,
  role: "General Manager",
  source: "early-access-programme"
};

function main() {
  console.log("Hospitality Flow — early-access submit authz (F-A03)\n");

  const migration = read(
    "supabase/migrations/20260802180000_early_access_submit_edge_only.sql"
  );
  const edgeFn = read("supabase/functions/submit-early-access-application/index.ts");
  const sharedTs = read("supabase/functions/_shared/early-access-submit.ts");
  const earlyAccessJs = read("js/early-access.js");
  const docs = read("docs/security/EARLY_ACCESS_SUBMIT_EDGE_ONLY.md");

  // Decision + grants
  assert(
    "Decision documented as Edge-only",
    /not.*public RPC/i.test(docs) &&
      (/Edge-only/i.test(migration) || /NOT a public RPC/i.test(migration))
  );
  assert(
    "Migration revokes anon/authenticated EXECUTE",
    /REVOKE ALL ON FUNCTION public\.submit_early_access_application[\s\S]*FROM anon, authenticated/.test(
      migration
    )
  );
  assert(
    "Migration grants service_role EXECUTE only",
    /GRANT EXECUTE ON FUNCTION public\.submit_early_access_application[\s\S]*TO service_role/.test(
      migration
    ) && !/GRANT EXECUTE[\s\S]*TO anon, authenticated/.test(migration)
  );
  assert(
    "Migration drops public INSERT policy / revokes INSERT",
    /DROP POLICY IF EXISTS "early_access_insert_public"/.test(migration) &&
      /REVOKE INSERT ON public\.early_access_applications FROM anon, authenticated/.test(
        migration
      )
  );
  assert(
    "RPC remains SECURITY DEFINER with search_path = public",
    /SECURITY DEFINER/.test(migration) && /SET search_path = public/.test(migration)
  );

  // Normal submission validation
  const ok = validateSubmitBody(valid);
  assert(
    "Normal submission validates",
    !("error" in ok) && ok.value && ok.value.email === "alex@example.com"
  );

  // Duplicate semantics documented in SQL (pending idempotent return)
  assert(
    "Duplicate pending submission remains idempotent in RPC",
    /founding_status = 'pending'/.test(migration) &&
      /Idempotent pending replay/.test(migration)
  );

  // Malformed / missing / oversized / invalid email
  assert(
    "Missing fields rejected",
    "error" in validateSubmitBody({ ...valid, firstName: "" })
  );
  assert(
    "Malformed payload (empty object) rejected",
    "error" in validateSubmitBody({})
  );
  assert(
    "Invalid email rejected",
    "error" in validateSubmitBody({ ...valid, email: "not-an-email" })
  );
  assert(
    "Oversized field rejected",
    "error" in
      validateSubmitBody({
        ...valid,
        propertyName: "X".repeat(MAX_FIELD_LENGTH + 1)
      })
  );
  assert(
    "Invalid room count rejected",
    "error" in validateSubmitBody({ ...valid, roomCount: -1 }) &&
      "error" in validateSubmitBody({ ...valid, roomCount: 10001 }) &&
      "error" in validateSubmitBody({ ...valid, roomCount: "abc" })
  );

  // Bypass attempts (frontend / Edge wiring)
  assert(
    "Frontend invokes Edge Function, not RPC",
    /submit-early-access-application/.test(earlyAccessJs) &&
      !/\.rpc\(\s*["']submit_early_access_application["']/.test(earlyAccessJs)
  );
  assert(
    "Edge uses shared validateSubmitBody",
    /validateSubmitBody/.test(edgeFn) &&
      /early-access-submit\.ts/.test(edgeFn)
  );
  assert(
    "Edge uses service_role client for RPC",
    /SUPABASE_SERVICE_ROLE_KEY/.test(edgeFn) &&
      /submit_early_access_application/.test(edgeFn)
  );
  assert(
    "Edge rate limiting present",
    /checkSubmitRateLimit/.test(edgeFn) && /429/.test(edgeFn)
  );

  resetSubmitRateLimitBuckets();
  let limited = false;
  for (let i = 0; i < 10; i += 1) {
    const r = checkSubmitRateLimit("test-ip|alex@example.com", {
      windowMs: 60_000,
      maxHits: 8
    });
    if (!r.allowed) {
      limited = true;
      break;
    }
  }
  assert("Rate limit trips after max hits", limited);

  // Operator workflow untouched
  const listFn = read("supabase/functions/list-pilot-applications/index.ts");
  const inviteFn = read("supabase/functions/invite-pilot-applicant/index.ts");
  assert(
    "Operator list/invite Edge Functions still present",
    /requirePlatformOperator/.test(listFn) && /requirePlatformOperator/.test(inviteFn)
  );

  // Validation parity markers in SQL
  assert(
    "SQL rejects invalid email / length / room_count",
    /A valid email address is required/.test(migration) &&
      /maximum allowed length/.test(migration) &&
      /Room count must be a whole number/.test(migration)
  );

  // Shared module sync
  assert(
    "Shared TS exports MAX_FIELD_LENGTH 200",
    /MAX_FIELD_LENGTH = 200/.test(sharedTs)
  );
  assert(
    "Platform access never downgraded from active/invited/approved",
    /access_status IN \('active', 'invited', 'approved'\)/.test(migration)
  );

  // Direct RPC / Edge invocation expectations (static contract)
  assert(
    "Direct RPC invocation denied for clients after migration (grant contract)",
    /GRANT EXECUTE[\s\S]*TO service_role/.test(migration) &&
      /FROM anon, authenticated/.test(migration)
  );
  assert(
    "Edge invocation path remains public function entry (verify_jwt config)",
    fs.existsSync(path.join(ROOT, "supabase/config.toml")) &&
      /submit-early-access-application/.test(read("supabase/config.toml"))
  );

  console.log(
    `\nResults: ${passed} passed, ${failed} failed, ${passed + failed} total`
  );
  process.exit(failed === 0 ? 0 : 1);
}

main();
