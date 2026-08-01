/**
 * Operator Pilot Lab separation — static + mocked security checks.
 * Run: node scripts/test-operator-pilot-lab.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
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
    .replace(/^\s*\/\/.*$/gm, "");
}

function loadWorkspaceModule(options) {
  options = options || {};
  const rpcImpl = options.rpcImpl || function () {
    return Promise.resolve({ data: null, error: { message: "not mocked" } });
  };
  const membershipRows = options.membershipRows || [];
  const access = options.access || {
    allowed: true,
    isOperator: true,
    hasMembership: false
  };

  const context = {
    window: {},
    console,
    document: {
      getElementById: function () {
        return null;
      },
      createElement: function () {
        return { textContent: "", innerHTML: "" };
      }
    },
    Date,
    JSON,
    Promise,
    Object,
    Array,
    String,
    Math,
    Error,
    encodeURIComponent
  };

  context.window.HFAuth = {
    ensureClient: function () {
      return Promise.resolve({
        auth: {
          getUser: function () {
            return Promise.resolve({
              data: { user: { id: options.userId || "operator-1" } }
            });
          }
        },
        from: function (table) {
          if (table !== "hotel_members") {
            return {
              select: function () {
                return {
                  eq: function () {
                    return {
                      order: function () {
                        return {
                          limit: function () {
                            return Promise.resolve({ data: [], error: null });
                          }
                        };
                      }
                    };
                  }
                };
              }
            };
          }
          return {
            select: function () {
              return {
                eq: function () {
                  return {
                    order: function () {
                      return {
                        limit: function () {
                          return Promise.resolve({
                            data: membershipRows,
                            error: null
                          });
                        }
                      };
                    },
                    limit: function () {
                      return Promise.resolve({
                        data: membershipRows,
                        error: null
                      });
                    }
                  };
                }
              };
            }
          };
        },
        rpc: rpcImpl
      });
    },
    formatError: function (err) {
      return (err && err.message) || String(err);
    },
    showAlert: function () {},
    hideAlert: function () {},
    setFormLoading: function () {},
    requireAuth: function () {
      return Promise.resolve({ user: { id: options.userId || "operator-1" } });
    },
    ROUTES: { login: "login.html" }
  };

  context.window.HFPlatformAccess = {
    checkPlatformAccess: function () {
      return Promise.resolve(access);
    },
    NOT_APPROVED_MESSAGE: "not approved"
  };

  context.window.HFTenantStorage = {
    updateTenantWorkspace: function () {}
  };

  vm.createContext(context);
  vm.runInContext(read("js/workspace.js"), context);
  return context.window.HFWorkspace;
}

(async function main() {
  let ok = true;

  const migration = read("supabase/migrations/phase16_operator_pilot_lab.sql");
  const workspaceJs = read("js/workspace.js");
  const workspaceBody = stripComments(workspaceJs);
  const accountHtml = read("account.html");
  const setupDoc = read("docs/operator/PILOT_LAB_ACCOUNT_SETUP.md");
  const brainStore = read("js/hotel-brain-store.js");
  const handoverStore = read("js/handover-store.js");
  const maintenanceStore = read("js/maintenance-store.js");
  const demoMode = read("js/demo-mode.js");
  const operatorJs = stripComments(read("js/operator-dashboard.js"));
  const phase4 = read("supabase/migrations/phase4_hotel_brain.sql");
  const phase7 = read("supabase/migrations/phase7_handover_reports.sql");
  const phase10 = read("supabase/migrations/phase10_platform_access.sql");

  if (!/CREATE OR REPLACE FUNCTION public\.create_operator_pilot_lab_workspace/i.test(migration)) {
    ok = fail("phase16 must define create_operator_pilot_lab_workspace") && ok;
  } else {
    ok = pass("RPC create_operator_pilot_lab_workspace defined") && ok;
  }

  if (!/platform_operators/i.test(migration) ||
      !/Only platform operators may provision/i.test(migration)) {
    ok = fail("RPC must reject non-operators via platform_operators check") && ok;
  } else {
    ok = pass("RPC rejects non-operators") && ok;
  }

  if (!/User already belongs to a hotel workspace/i.test(migration)) {
    ok = fail("RPC must reject operators who already have a different membership") && ok;
  } else {
    ok = pass("RPC rejects existing non-lab membership") && ok;
  }

  if (!/Hospitality Flow Pilot Lab/.test(migration) ||
      !/Internal testing workspace/.test(migration)) {
    ok = fail("RPC must provision Hospitality Flow Pilot Lab / Internal testing workspace") && ok;
  } else {
    ok = pass("RPC provisions named Pilot Lab workspace") && ok;
  }

  if (/Zetter/i.test(migration)) {
    ok = fail("Pilot Lab migration must not hardcode Zetter data") && ok;
  } else {
    ok = pass("Pilot Lab migration does not hardcode Zetter data") && ok;
  }

  if (!/GRANT EXECUTE[\s\S]*create_operator_pilot_lab_workspace[\s\S]*authenticated/i.test(migration) ||
      !/REVOKE ALL ON FUNCTION public\.create_operator_pilot_lab_workspace/i.test(migration)) {
    ok = fail("RPC execute grant must be authenticated-only with REVOKE PUBLIC") && ok;
  } else {
    ok = pass("RPC grants are restricted to authenticated") && ok;
  }

  if (!/SECURITY DEFINER/i.test(migration) || !/SET search_path = public/i.test(migration)) {
    ok = fail("RPC must be SECURITY DEFINER with fixed search_path") && ok;
  } else {
    ok = pass("RPC is SECURITY DEFINER with fixed search_path") && ok;
  }

  if (!/v_existing_name = v_lab_name/i.test(migration) || !/'created',\s*false/.test(migration)) {
    ok = fail("RPC must idempotently return existing Pilot Lab membership") && ok;
  } else {
    ok = pass("RPC idempotently returns existing Pilot Lab") && ok;
  }

  if (!/NOT IN \('active', 'invited'\)/.test(phase10)) {
    ok = fail("create_hotel_workspace must still require invited|active") && ok;
  } else {
    ok = pass("Ordinary workspace create still gated to invited|active") && ok;
  }

  if (!/id="operator-account"/.test(accountHtml) ||
      !/Platform Operator/.test(accountHtml) ||
      !/Open Operator Dashboard/.test(accountHtml)) {
    ok = fail("account.html must expose a separate Platform Operator card") && ok;
  } else {
    ok = pass("account.html has separate Platform Operator card") && ok;
  }

  if (!/id="operator-pilot-lab-create"/.test(accountHtml) ||
      !/Create Pilot Lab workspace/.test(accountHtml)) {
    ok = fail("account.html must include Pilot Lab provision card") && ok;
  } else {
    ok = pass("account.html includes Pilot Lab provision card") && ok;
  }

  if (!/id="workspace-dashboard"/.test(accountHtml) ||
      !/Open Workspace/.test(accountHtml) ||
      !/Your workspace/.test(accountHtml)) {
    ok = fail("account.html must include separate Your workspace card") && ok;
  } else {
    ok = pass("account.html includes separate Your workspace card") && ok;
  }

  const operatorIdx = accountHtml.indexOf('id="operator-account"');
  const workspaceIdx = accountHtml.indexOf('id="workspace-dashboard"');
  const operatorEnd = accountHtml.indexOf("</section>", operatorIdx);
  if (operatorIdx < 0 || workspaceIdx < 0 || operatorEnd < 0 || !(operatorEnd < workspaceIdx)) {
    ok = fail("Operator card must be a sibling section outside workspace-dashboard") && ok;
  } else {
    ok = pass("Operator card is outside the hotel workspace card") && ok;
  }

  if (!/operator-account[\s\S]*hidden/.test(accountHtml) ||
      !/operator-pilot-lab-create[\s\S]*hidden/.test(accountHtml)) {
    ok = fail("Operator and Pilot Lab cards must start hidden") && ok;
  } else {
    ok = pass("Operator and Pilot Lab cards start hidden for normal users") && ok;
  }

  if (!/access\.isOperator && !access\.hasMembership/.test(workspaceBody) ||
      !/renderOperatorWithoutWorkspace/.test(workspaceBody)) {
    ok = fail("Operators without membership must use Pilot Lab provision, not hotel create") && ok;
  } else {
    ok = pass("Operators without membership use Pilot Lab provision path") && ok;
  }

  if (!/setOperatorSectionVisible\(!!access\.isOperator\)/.test(workspaceBody)) {
    ok = fail("Operator card must show only when isOperator is true") && ok;
  } else {
    ok = pass("Operator card gated by isOperator") && ok;
  }

  if (!/create_operator_pilot_lab_workspace/.test(workspaceBody) ||
      !/createOperatorPilotLab/.test(workspaceBody)) {
    ok = fail("workspace.js must call create_operator_pilot_lab_workspace") && ok;
  } else {
    ok = pass("workspace.js calls Pilot Lab RPC") && ok;
  }

  {
    const hf = loadWorkspaceModule({
      access: { allowed: true, isOperator: false, hasMembership: false },
      rpcImpl: function (name) {
        if (name === "create_operator_pilot_lab_workspace") {
          return Promise.resolve({
            data: null,
            error: { message: "Only platform operators may provision the Pilot Lab workspace" }
          });
        }
        return Promise.resolve({ data: null, error: { message: "unexpected rpc " + name } });
      }
    });
    try {
      await hf.createOperatorPilotLab();
      ok = fail("Non-operator provision should reject") && ok;
    } catch (err) {
      if (!/platform operators/i.test(err.message || err)) {
        ok = fail("Non-operator rejection message missing") && ok;
      } else {
        ok = pass("Non-operator cannot provision Pilot Lab") && ok;
      }
    }
  }

  {
    const membershipRows = [];
    const labHotel = {
      id: "lab-1",
      name: "Hospitality Flow Pilot Lab",
      property_type: "Internal testing workspace",
      number_of_rooms: 1,
      city: "Internal",
      country: "United Kingdom",
      created_at: "2026-01-01"
    };
    const hf = loadWorkspaceModule({
      access: { allowed: true, isOperator: true, hasMembership: false },
      membershipRows: membershipRows,
      rpcImpl: function (name) {
        if (name === "create_operator_pilot_lab_workspace") {
          membershipRows.push({
            role: "owner",
            hotel_id: "lab-1",
            created_at: "2026-01-01",
            hotels: labHotel
          });
          return Promise.resolve({
            data: { hotel_id: "lab-1", role: "owner", created: true },
            error: null
          });
        }
        return Promise.resolve({ data: null, error: { message: "unexpected" } });
      }
    });
    try {
      const workspace = await hf.createOperatorPilotLab();
      if (!workspace || !workspace.hotel || workspace.hotel.id !== "lab-1") {
        ok = fail("Operator with no membership should receive Pilot Lab workspace") && ok;
      } else if (!hf.isPilotLabWorkspace(workspace)) {
        ok = fail("Provisioned workspace should be detected as Pilot Lab") && ok;
      } else {
        ok = pass("Operator with no membership can provision Pilot Lab") && ok;
      }
    } catch (err) {
      ok = fail("Operator provision failed: " + (err && err.message ? err.message : err)) && ok;
    }
  }

  {
    const hf = loadWorkspaceModule({
      access: { allowed: true, isOperator: true, hasMembership: true },
      membershipRows: [{
        role: "owner",
        hotel_id: "zetter-1",
        created_at: "2026-01-01",
        hotels: {
          id: "zetter-1",
          name: "Zetter Marylebone",
          property_type: "boutique-hotel",
          number_of_rooms: 50,
          city: "London",
          country: "United Kingdom"
        }
      }],
      rpcImpl: function (name) {
        if (name === "create_operator_pilot_lab_workspace") {
          return Promise.resolve({
            data: null,
            error: { message: "User already belongs to a hotel workspace" }
          });
        }
        return Promise.resolve({ data: null, error: { message: "unexpected" } });
      }
    });
    try {
      await hf.createOperatorPilotLab();
      ok = fail("Operator with existing membership must not create another workspace") && ok;
    } catch (err) {
      if (!/already belong/i.test(err.message || err)) {
        ok = fail("Existing membership rejection missing") && ok;
      } else {
        ok = pass("Operator with existing membership cannot create another workspace") && ok;
      }
    }
  }

  if (!/\.limit\(1\)/.test(workspaceBody) || !/order\("created_at"/.test(workspaceBody)) {
    ok = fail("getUserWorkspace must still resolve exactly one membership") && ok;
  } else {
    ok = pass("getUserWorkspace resolves exactly one workspace") && ok;
  }

  if (/setActiveWorkspace|switchWorkspace/i.test(workspaceBody)) {
    ok = fail("Must not introduce a workspace switcher") && ok;
  } else {
    ok = pass("No workspace switcher introduced") && ok;
  }

  if (!/hotel_brain_select_member|hotel_members/i.test(phase4) ||
      !/hm\.hotel_id = hotel_brain_profiles\.hotel_id/i.test(phase4)) {
    ok = fail("Hotel Brain RLS must remain membership-scoped") && ok;
  } else {
    ok = pass("Hotel Brain RLS membership-scoped") && ok;
  }

  if (!/handover_reports_select_member/i.test(phase7) ||
      !/hm\.hotel_id = handover_reports\.workspace_id/i.test(phase7)) {
    ok = fail("Handover RLS must remain membership-scoped") && ok;
  } else {
    ok = pass("Handover RLS membership-scoped") && ok;
  }

  if (!/requireAuthAndWorkspace/.test(brainStore) ||
      !/getUserWorkspace/.test(brainStore) ||
      !/hotel_id:\s*hotelId/.test(brainStore)) {
    ok = fail("Hotel Brain writes must use membership workspace hotel_id") && ok;
  } else {
    ok = pass("Hotel Brain writes use membership hotel_id") && ok;
  }

  if (!/requireAuthAndWorkspace/.test(handoverStore) ||
      !/workspace_id:\s*ctx\.workspaceId/.test(handoverStore)) {
    ok = fail("Handover writes must use membership workspace_id") && ok;
  } else {
    ok = pass("Handover writes use membership workspace_id") && ok;
  }

  if (!/function saveDraft\(payload, workspaceIdOverride\)/.test(handoverStore) ||
      !/upsertDraft\(client, ctx\.workspaceId/.test(handoverStore)) {
    ok = fail("Handover cloud draft must ignore client workspace spoofing") && ok;
  } else {
    ok = pass("Handover cloud draft ignores client workspace spoofing") && ok;
  }

  if (/delete rowPatch\.workspace_id|Never accept workspace_id from callers/.test(maintenanceStore)) {
    ok = pass("Maintenance rejects client workspace_id overrides") && ok;
  } else {
    ok = fail("Maintenance must reject client workspace_id overrides") && ok;
  }

  if (/platform_operators/.test(phase4) || /platform_operators/.test(phase7)) {
    ok = fail("Brain/handover RLS must not grant access via platform_operators") && ok;
  } else {
    ok = pass("Operator capability alone does not grant hotel table RLS access") && ok;
  }

  if (!/access\.isOperator !== true/.test(operatorJs)) {
    ok = fail("operator dashboard must fail closed for non-operators") && ok;
  } else {
    ok = pass("Zetter member cannot open Operator Dashboard (fail closed)") && ok;
  }

  if (!/DEMO_MODE_READ_ONLY/.test(demoMode) ||
      !/store\.save = function/.test(demoMode) ||
      !/store\.saveDraft = function/.test(demoMode) ||
      !/store\.saveHandover = function/.test(demoMode)) {
    ok = fail("Demo Mode must still block Brain/handover persistence") && ok;
  } else {
    ok = pass("Demo Mode still rejects persistent writes") && ok;
  }

  if (!/Create or invite the dedicated HF operator account/.test(setupDoc) ||
      !/remove operator capability from the normal Zetter account/i.test(setupDoc) ||
      !/Rollback/.test(setupDoc) ||
      !/phase16_operator_pilot_lab/.test(setupDoc)) {
    ok = fail("PILOT_LAB_ACCOUNT_SETUP.md must include full safe sequence + rollback") && ok;
  } else {
    ok = pass("Pilot Lab setup guide includes sequence and rollback") && ok;
  }

  {
    const labOnly = loadWorkspaceModule({
      userId: "operator-1",
      membershipRows: [{
        role: "owner",
        hotel_id: "lab-1",
        created_at: "2026-01-01",
        hotels: {
          id: "lab-1",
          name: "Hospitality Flow Pilot Lab",
          property_type: "Internal testing workspace"
        }
      }]
    });
    const labWs = await labOnly.getUserWorkspace();
    if (!labWs || labWs.hotel.id !== "lab-1" || /zetter/i.test(labWs.hotel.name || "")) {
      ok = fail("Pilot Lab account must resolve Pilot Lab workspace only") && ok;
    } else {
      ok = pass("Pilot Lab account cannot read Zetter membership via getUserWorkspace") && ok;
    }

    const zetterOnly = loadWorkspaceModule({
      userId: "zetter-1",
      access: { allowed: true, isOperator: false, hasMembership: true },
      membershipRows: [{
        role: "owner",
        hotel_id: "zetter-1",
        created_at: "2026-01-01",
        hotels: {
          id: "zetter-1",
          name: "Zetter Marylebone",
          property_type: "boutique-hotel"
        }
      }]
    });
    const zetterWs = await zetterOnly.getUserWorkspace();
    if (!zetterWs || zetterWs.hotel.id !== "zetter-1" || zetterOnly.isPilotLabWorkspace(zetterWs)) {
      ok = fail("Zetter member must resolve Zetter workspace only") && ok;
    } else {
      ok = pass("Zetter member cannot read Pilot Lab membership via getUserWorkspace") && ok;
    }
  }

  if (!/renderOperatorWithoutWorkspace/.test(workspaceBody) ||
      !/setOperatorSectionVisible\(!!access\.isOperator\)/.test(workspaceBody) ||
      !/setWorkspacePanelVisible\(document\.getElementById\("operator-pilot-lab-create"\), false\)/.test(workspaceBody)) {
    ok = fail("Account page must show correct cards per account type") && ok;
  } else {
    ok = pass("Account page shows correct cards for each account type") && ok;
  }

  // Operator dashboard Pilot Lab provisioning UI
  const operatorHtml = read("operator.html");
  const operatorDash = stripComments(read("js/operator-dashboard.js"));

  if (!/id="operator-pilot-lab-card"/.test(operatorHtml) ||
      !/Create Pilot Lab/.test(operatorHtml) ||
      !/Open Pilot Lab/.test(operatorHtml) ||
      !/Pilot Lab Active/.test(operatorHtml)) {
    ok = fail("Operator dashboard must expose Pilot Lab create/active UI") && ok;
  } else {
    ok = pass("Operator dashboard exposes Pilot Lab create/active UI") && ok;
  }

  if (!/create_operator_pilot_lab_workspace/.test(workspaceBody) ||
      !/createOperatorPilotLab/.test(operatorDash) ||
      !/loadPilotLabState/.test(operatorDash)) {
    ok = fail("Operator dashboard must call Pilot Lab RPC via workspace helpers") && ok;
  } else {
    ok = pass("Operator dashboard calls Pilot Lab RPC via workspace helpers") && ok;
  }

  if (!/refreshOperatorState/.test(operatorDash) ||
      !/loadPilotLabState\(\)/.test(operatorDash)) {
    ok = fail("Successful Pilot Lab creation must reload operator state") && ok;
  } else {
    ok = pass("Successful Pilot Lab creation reloads operator state") && ok;
  }

  if (ok) {
    console.log("\nAll operator Pilot Lab checks passed.");
    process.exit(0);
  }
  console.error("\nOperator Pilot Lab checks failed.");
  process.exit(1);
})().catch(function (err) {
  console.error(err);
  process.exit(1);
});
