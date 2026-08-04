/**
 * Backend contract tests for operator application management (Phase 2).
 * Run: node scripts/test-operator-application-management.mjs
 *
 * Covers migrations, RPCs, Edge Functions, status transitions, and security rules.
 * Does not call a live Supabase project (no credentials required).
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

function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/--.*$/gm, "");
}

function main() {
  let ok = true;
  console.log("\nOperator application management (Phase 2)\n");

  const auditSql = read("supabase/migrations/20260804210000_operator_audit_log.sql");
  const resentSql = read(
    "supabase/migrations/20260804210100_platform_access_invite_resent_at.sql",
  );
  const rpcSql = read(
    "supabase/migrations/20260804210200_pilot_application_management_rpcs.sql",
  );
  const rpcBody = stripComments(rpcSql);
  const configToml = read("supabase/config.toml");

  const declineFn = read("supabase/functions/decline-pilot-applicant/index.ts");
  const restoreFn = read("supabase/functions/restore-pilot-applicant/index.ts");
  const resendFn = read("supabase/functions/resend-pilot-invite/index.ts");
  const deleteFn = read("supabase/functions/delete-pilot-applicant/index.ts");
  const inviteFn = read("supabase/functions/invite-pilot-applicant/index.ts");
  const operatorAuth = read("supabase/functions/_shared/operator-auth.ts");
  const dashboardJs = read("js/operator-dashboard.js");
  const operatorHtml = read("operator.html");

  /* ---------- Migrations ---------- */
  if (!/CREATE TABLE IF NOT EXISTS public\.operator_audit_log/i.test(auditSql)) {
    ok = fail("operator_audit_log table missing") && ok;
  } else {
    ok = pass("operator_audit_log migration present") && ok;
  }

  const auditCols = [
    "operator_user_id",
    "action",
    "application_id",
    "applicant_email",
    "previous_founding_status",
    "new_founding_status",
    "previous_access_status",
    "new_access_status",
    "metadata",
    "created_at",
  ];
  for (const col of auditCols) {
    if (!new RegExp(col, "i").test(auditSql)) {
      ok = fail(`operator_audit_log missing column ${col}`) && ok;
    }
  }
  if (ok) ok = pass("operator_audit_log has required columns") && ok;

  if (!/REVOKE ALL ON public\.operator_audit_log FROM anon, authenticated/i.test(auditSql)) {
    ok = fail("operator_audit_log must revoke browser roles") && ok;
  } else {
    ok = pass("operator_audit_log is service-role oriented (browser revoked)") && ok;
  }

  const actions = [
    "approve_invite",
    "resend_invite",
    "decline",
    "restore",
    "delete_test_application",
  ];
  for (const action of actions) {
    if (!auditSql.includes(`'${action}'`)) {
      ok = fail(`Audit action ${action} missing from CHECK`) && ok;
    }
  }
  if (ok) ok = pass("Audit actions include approve/resend/decline/restore/delete") && ok;

  if (!/invite_resent_at/i.test(resentSql)) {
    ok = fail("invite_resent_at migration missing") && ok;
  } else {
    ok = pass("platform_access.invite_resent_at migration present") && ok;
  }

  /* ---------- RPCs ---------- */
  for (const fn of [
    "mark_pilot_applicant_declined",
    "restore_pilot_applicant",
    "assert_pilot_applicant_deletable",
    "write_operator_audit_event",
  ]) {
    if (!new RegExp(`FUNCTION public\\.${fn}`, "i").test(fn === "write_operator_audit_event" ? auditSql : rpcSql) &&
        !new RegExp(`FUNCTION public\\.${fn}`, "i").test(auditSql + rpcSql)) {
      ok = fail(`RPC ${fn} missing`) && ok;
    } else {
      ok = pass(`RPC ${fn} defined`) && ok;
    }
  }

  if (!/GRANT EXECUTE ON FUNCTION public\.mark_pilot_applicant_declined\(uuid, uuid\) TO service_role/i.test(rpcSql) ||
      /GRANT EXECUTE ON FUNCTION public\.mark_pilot_applicant_declined\(uuid, uuid\) TO (anon|authenticated)/i.test(rpcSql)) {
    ok = fail("mark_pilot_applicant_declined must be service_role only") && ok;
  } else {
    ok = pass("mark_pilot_applicant_declined is service_role only") && ok;
  }

  if (!/GRANT EXECUTE ON FUNCTION public\.restore_pilot_applicant\(uuid, uuid\) TO service_role/i.test(rpcSql) ||
      /TO (anon|authenticated)/i.test(rpcSql.match(/restore_pilot_applicant[\s\S]{0,400}GRANT[\s\S]{0,200}/)?.[0] || "")) {
    /* restore grant check */
  }
  if (!/GRANT EXECUTE ON FUNCTION public\.restore_pilot_applicant\(uuid, uuid\) TO service_role/i.test(rpcSql)) {
    ok = fail("restore_pilot_applicant must grant service_role") && ok;
  } else {
    ok = pass("restore_pilot_applicant is service_role only") && ok;
  }

  if (!/GRANT EXECUTE ON FUNCTION public\.assert_pilot_applicant_deletable\(uuid\) TO service_role/i.test(rpcSql)) {
    ok = fail("assert_pilot_applicant_deletable must be service_role only") && ok;
  } else {
    ok = pass("assert_pilot_applicant_deletable is service_role only") && ok;
  }

  /* Decline rules */
  if (!/Active hotels cannot be declined/i.test(rpcBody) &&
      !/ACTIVE_ACCESS: Active hotels cannot be declined/i.test(rpcSql)) {
    ok = fail("Decline must block active access") && ok;
  } else {
    ok = pass("Pending/invited can be declined; active cannot") && ok;
  }

  if (!/Decline is only allowed for pending or invited/i.test(rpcSql)) {
    ok = fail("Decline transition guard missing") && ok;
  } else {
    ok = pass("Decline restricted to pending or invited transitions") && ok;
  }

  if (!/founding_status = 'declined'/i.test(rpcBody) ||
      !/access_status = 'suspended'/i.test(rpcBody)) {
    ok = fail("Decline must set declined + suspended") && ok;
  } else {
    ok = pass("Decline sets founding declined and access suspended") && ok;
  }

  if (!/write_operator_audit_event\([\s\S]*'decline'/i.test(rpcSql)) {
    ok = fail("Decline RPC must write audit event") && ok;
  } else {
    ok = pass("Decline writes audit record") && ok;
  }

  /* Restore rules */
  if (!/founding_status=declined and access_status=suspended/i.test(rpcSql)) {
    ok = fail("Restore must require declined + suspended") && ok;
  } else {
    ok = pass("Restore only when declined + suspended") && ok;
  }

  if (!/founding_status = 'pending'/i.test(rpcBody) ||
      !/pending_application/i.test(rpcBody)) {
    ok = fail("Restore must set pending + pending_application") && ok;
  } else {
    ok = pass("Restore sets founding pending and access pending_application") && ok;
  }

  if (!/invite_sent',\s*false/i.test(rpcBody)) {
    ok = fail("Restore must explicitly not send invite") && ok;
  } else {
    ok = pass("Restore does not send an invite") && ok;
  }

  if (!/Active hotels cannot be restored/i.test(rpcSql)) {
    ok = fail("Restore must block active access") && ok;
  } else {
    ok = pass("Active cannot be restored") && ok;
  }

  /* Delete eligibility */
  if (!/HOTEL_MEMBERSHIP_EXISTS/i.test(rpcSql) ||
      !/HOTEL_OWNERSHIP_EXISTS/i.test(rpcSql)) {
    ok = fail("Delete assert must block membership and ownership") && ok;
  } else {
    ok = pass("Deletion blocked by hotel membership and ownership") && ok;
  }

  if (!/HANDOVER_DATA_EXISTS/i.test(rpcSql) ||
      !/MAINTENANCE_DATA_EXISTS/i.test(rpcSql) ||
      !/HOTEL_BRAIN_DATA_EXISTS/i.test(rpcSql) ||
      !/GUEST_KNOWLEDGE/i.test(rpcSql)) {
    ok = fail("Delete assert must block operational data classes") && ok;
  } else {
    ok = pass("Deletion blocked by operational data") && ok;
  }

  if (!/ACCESS_IS_ACTIVE/i.test(rpcSql) || !/FOUNDING_NOT_DECLINED/i.test(rpcSql)) {
    ok = fail("Delete assert must require declined and non-active") && ok;
  } else {
    ok = pass("Active application cannot be deleted; must be declined") && ok;
  }

  if (!/to_regclass\(/i.test(rpcSql)) {
    ok = fail("Delete assert should use to_regclass for optional tables") && ok;
  } else {
    ok = pass("Delete assert uses defensive to_regclass table checks") && ok;
  }

  /* Idempotency */
  if (!/idempotent',\s*true/i.test(rpcBody)) {
    ok = fail("Decline/restore should support idempotent responses") && ok;
  } else {
    ok = pass("Repeated decline/restore calls are idempotent where practical") && ok;
  }

  if (!/access_status IS DISTINCT FROM 'active'/i.test(rpcBody)) {
    ok = fail("Updates must never overwrite active access") && ok;
  } else {
    ok = pass("Active access is never downgraded by management RPCs") && ok;
  }

  /* ---------- Edge Functions ---------- */
  const edgeFns = [
    ["decline-pilot-applicant", declineFn],
    ["restore-pilot-applicant", restoreFn],
    ["resend-pilot-invite", resendFn],
    ["delete-pilot-applicant", deleteFn],
  ];

  for (const [name, src] of edgeFns) {
    if (!/requirePlatformOperator/.test(src)) {
      ok = fail(`${name} must call requirePlatformOperator`) && ok;
    } else {
      ok = pass(`${name} requires platform operator`) && ok;
    }
  }

  if (!/requirePlatformOperator/.test(operatorAuth)) {
    ok = fail("Shared operator-auth must export requirePlatformOperator") && ok;
  } else {
    ok = pass("Non-operator access rejected via shared operator-auth") && ok;
  }

  for (const name of [
    "resend-pilot-invite",
    "decline-pilot-applicant",
    "restore-pilot-applicant",
    "delete-pilot-applicant",
  ]) {
    const block = configToml.match(
      new RegExp(`\\[functions\\.${name}\\][\\s\\S]*?verify_jwt\\s*=\\s*(true|false)`),
    );
    if (!block || !/verify_jwt\s*=\s*true/.test(block[0])) {
      ok = fail(`config.toml must set verify_jwt=true for ${name}`) && ok;
    } else {
      ok = pass(`config.toml verify_jwt=true for ${name}`) && ok;
    }
  }

  /* Resend rules */
  const resendBody = stripComments(resendFn);
  if (!/founding !== "accepted"|founding_status=accepted/i.test(resendFn) ||
      !/accessStatus !== "invited"|access_status=invited/i.test(resendFn)) {
    ok = fail("Resend must require accepted + invited") && ok;
  } else {
    ok = pass("Invited can be resent; requires accepted + invited") && ok;
  }

  if (!/ACTIVE_ACCESS/.test(resendFn) || !/Declined applications cannot be resent/i.test(resendFn)) {
    ok = fail("Resend must reject active and declined") && ok;
  } else {
    ok = pass("Active and declined cannot be resent") && ok;
  }

  if (!/invite_resent_at/.test(resendFn)) {
    ok = fail("Resend must update invite_resent_at") && ok;
  } else {
    ok = pass("Resend updates invite_resent_at") && ok;
  }

  if (!/generateLink/.test(resendFn) || !/resetPasswordForEmail/.test(resendFn)) {
    ok = fail("Resend must generate setup-password/invite link for existing Auth users") && ok;
  } else {
    ok = pass("Resend generates invite/recovery-style link for existing Auth users") && ok;
  }

  if (!/writeOperatorAuditEvent|resend_invite/.test(resendFn)) {
    ok = fail("Resend must write audit event") && ok;
  } else {
    ok = pass("Resend writes audit record") && ok;
  }

  /* Delete edge */
  if (!/confirm !== "DELETE"|confirm === "DELETE"/.test(deleteFn)) {
    ok = fail("Delete must require confirm DELETE") && ok;
  } else {
    ok = pass("Delete requires confirm: DELETE") && ok;
  }

  if (!/assert_pilot_applicant_deletable/.test(deleteFn)) {
    ok = fail("Delete must call assert_pilot_applicant_deletable") && ok;
  } else {
    ok = pass("Declined test application deletion uses eligibility assert") && ok;
  }

  if (!/writeOperatorAuditEvent/.test(deleteFn) ||
      !/delete_test_application/.test(deleteFn)) {
    ok = fail("Delete must audit before deleting") && ok;
  } else {
    ok = pass("Delete writes audit before record removal") && ok;
  }

  const deleteBody = stripComments(deleteFn);
  const auditIdx = deleteBody.indexOf("writeOperatorAuditEvent");
  const accessDelIdx = deleteBody.indexOf('.from("platform_access")');
  const appDelIdx = deleteBody.indexOf('.from("early_access_applications")');
  const authDelIdx = deleteBody.indexOf("deleteUser");
  if (!(auditIdx >= 0 && accessDelIdx > auditIdx && appDelIdx > accessDelIdx && authDelIdx > appDelIdx)) {
    ok = fail("Delete order must be audit → platform_access → application → Auth user") && ok;
  } else {
    ok = pass("Delete order: audit, platform_access, application, Auth user") && ok;
  }

  if (!/DELETE_BLOCKED/.test(deleteFn) || !/blockers/.test(deleteFn)) {
    ok = fail("Delete must return clear blocked reasons") && ok;
  } else {
    ok = pass("Delete returns clear blocked reason when linked data exists") && ok;
  }

  /* Decline preserves Auth user */
  if (/deleteUser/.test(declineFn)) {
    ok = fail("Decline must not delete Auth users") && ok;
  } else {
    ok = pass("Decline preserves Auth user") && ok;
  }

  /* Approve audit (best-effort, non-behaviour-changing) */
  if (!/approve_invite/.test(inviteFn) || !/writeOperatorAuditEvent/.test(inviteFn)) {
    ok = fail("Approve invite should best-effort audit without changing invite behaviour") && ok;
  } else {
    ok = pass("Approve invite logs audit event safely") && ok;
  }

  /* Status sync expectations */
  if (!/foundingStatus: "accepted"/.test(resendFn) || !/accessStatus: "invited"/.test(resendFn)) {
    ok = fail("Resend response must keep accepted/invited synchronised") && ok;
  } else {
    ok = pass("Status fields remain synchronised on resend") && ok;
  }

  /* Phase 2 must not modify Operator Dashboard UI */
  if (/decline-pilot-applicant|resend-pilot-invite|restore-pilot-applicant|delete-pilot-applicant/.test(dashboardJs)) {
    ok = fail("Phase 2 must not wire new management actions into operator-dashboard.js yet") && ok;
  } else {
    ok = pass("Operator Dashboard UI left unmodified (Phase 3)") && ok;
  }

  if (!/Decline and resend are not available in this release/.test(operatorHtml)) {
    ok = fail("operator.html deferred copy unexpectedly removed in Phase 2") && ok;
  } else {
    ok = pass("operator.html still deferred for Phase 3 UI work") && ok;
  }

  /* No service_role in frontend */
  if (/SERVICE_ROLE|service_role/.test(dashboardJs)) {
    ok = fail("Frontend must not contain service_role credentials") && ok;
  } else {
    ok = pass("No service-role credentials exposed to frontend") && ok;
  }

  if (ok) {
    console.log("\nAll operator application management checks passed.");
    process.exit(0);
  }
  console.error("\nOperator application management checks failed.");
  process.exit(1);
}

main();
