/**
 * GI-3 — Staff review / ConfirmedGuestKnowledge foundation.
 * Run: node scripts/test-guest-intelligence-gi3-review.mjs
 *
 * Does not apply migrations. Does not hit live Supabase.
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

function load(name) {
  return fs.readFileSync(path.join(ROOT, name), "utf8");
}

const context = {
  window: {},
  global: {},
  console,
  Date,
  Math,
  Object,
  Array,
  String,
  Number,
  parseFloat,
  parseInt,
  isNaN,
  RegExp,
  JSON
};
context.global = context.window;
vm.createContext(context);
vm.runInContext(load("ai-writing-engine.js"), context);
vm.runInContext(load("shift-intelligence-engine.js"), context);
vm.runInContext(load("guest-intelligence.js"), context);

const SI = context.window.ShiftIntelligenceEngine;
const GI = context.window.GuestIntelligence;
const AiWritingEngine = context.window.AiWritingEngine;

let passed = 0;
let failed = 0;

function assert(cond, label) {
  if (cond) {
    passed += 1;
    console.log("  PASS  " + label);
  } else {
    failed += 1;
    console.log("  FAIL  " + label);
  }
}

const WS_A = "ws-hotel-a";
const WS_B = "ws-hotel-b";

function sampleCandidate(overrides) {
  overrides = overrides || {};
  return Object.assign({
    candidateId: "cand-floor-1",
    workspaceId: WS_A,
    identityEvidence: {
      guestName: "Mrs Taylor",
      room: "42",
      rooms: ["42"],
      reservationId: "",
      bookingReference: "",
      sourceType: "handover"
    },
    guestMatchStrength: "probable",
    knowledgeType: "floor_preference",
    proposedValue: { code: "high_floor", tokens: [] },
    sourceObservationIds: ["obs-1"],
    sourceFactIds: ["fact-1"],
    sourceReportIds: ["rep-1"],
    evidenceCount: 1,
    confidence: 0.68,
    confidenceLabel: "medium",
    approvalRequirement: "none",
    sensitivity: "normal",
    lifecycleStatus: "proposed",
    contradictionState: "none",
    retentionHint: "temporary_candidate_only",
    reasonCodes: ["gi2_candidate"],
    createdAt: "2026-08-02T16:00:00.000Z",
    temporary: true,
    persistent: false,
    confirmed: false,
    preferencePromoted: false
  }, overrides);
}

function memberActor(overrides) {
  return Object.assign({
    userId: "user-member-1",
    workspaceId: WS_A,
    role: "member",
    isMember: true,
    platformAccess: "active",
    isAnonymous: false,
    isDemoWorkspace: false
  }, overrides || {});
}

function ownerActor(overrides) {
  return memberActor(Object.assign({ userId: "user-owner-1", role: "owner" }, overrides || {}));
}

console.log("\n=== GI-3 Staff Review Foundation ===\n");

console.log("-- Contract surface --");
assert(GI.PHASE === "GI-3", "PHASE GI-3");
assert(typeof GI.reviewCandidateGuestKnowledge === "function", "reviewCandidateGuestKnowledge");
assert(GI.KNOWLEDGE_APPROVAL_STATUS.confirmed === "confirmed", "approval status confirmed");
assert(typeof GI.isActiveGuestKnowledge === "function", "isActiveGuestKnowledge");

console.log("\n-- 1. Candidate cannot self-confirm --");
(function () {
  var r1 = GI.reviewCandidateGuestKnowledge({
    candidate: sampleCandidate(),
    action: "confirm",
    actor: { isAnonymous: true }
  });
  assert(r1.ok === false && r1.error === "anonymous_denied", "1a. anonymous cannot confirm");

  var r2 = GI.reviewCandidateGuestKnowledge({
    candidate: sampleCandidate(),
    action: "confirm",
    actor: { userId: "", isMember: true, workspaceId: WS_A, platformAccess: "active" }
  });
  assert(r2.ok === false, "1b. empty actor cannot confirm");

  var r3 = GI.reviewCandidateGuestKnowledge({
    candidate: sampleCandidate({ confirmed: true, lifecycleStatus: "proposed" }),
    action: "",
    actor: memberActor()
  });
  assert(r3.ok === false && r3.error === "invalid_action", "1c. no silent confirm without action");
})();

console.log("\n-- 2–5. Authz boundaries --");
(function () {
  assert(
    GI.reviewCandidateGuestKnowledge({
      candidate: sampleCandidate(),
      action: "confirm",
      actor: memberActor({ isAnonymous: true, userId: null })
    }).error === "anonymous_denied",
    "2. anonymous denied"
  );

  assert(
    GI.reviewCandidateGuestKnowledge({
      candidate: sampleCandidate({ workspaceId: WS_B }),
      action: "confirm",
      actor: memberActor({ workspaceId: WS_A })
    }).error === "cross_workspace_denied",
    "3. Hotel A cannot review Hotel B candidate"
  );

  assert(
    GI.reviewCandidateGuestKnowledge({
      candidate: sampleCandidate(),
      action: "confirm",
      actor: memberActor({ platformAccess: "suspended" })
    }).error === "suspended_denied",
    "4. suspended user denied"
  );

  assert(
    GI.reviewCandidateGuestKnowledge({
      candidate: sampleCandidate(),
      action: "confirm",
      actor: memberActor({ isMember: false })
    }).error === "membership_removed_denied",
    "5. removed member denied"
  );
})();

console.log("\n-- 6. Confirmed records reviewer + timestamp --");
(function () {
  var r = GI.reviewCandidateGuestKnowledge({
    candidate: sampleCandidate(),
    action: "confirm",
    actor: memberActor({ userId: "reviewer-42" }),
    reason: "Guest confirmed preference at desk",
    now: "2026-08-02T17:00:00.000Z"
  });
  assert(r.ok === true, "6a. confirm ok");
  assert(r.knowledge.approvalStatus === "confirmed", "6b. status confirmed");
  assert(r.knowledge.approvedBy === "reviewer-42", "6c. approvedBy recorded");
  assert(r.knowledge.approvedAt === "2026-08-02T17:00:00.000Z", "6d. approvedAt recorded");
  assert(r.event.actorUserId === "reviewer-42", "6e. audit actor");
  assert(r.event.previousStatus === "proposed" && r.event.newStatus === "confirmed", "6f. audit status transition");
  assert(r.event.reason.indexOf("confirmed preference") !== -1, "6g. audit reason");
})();

console.log("\n-- 7–9. Rejected / superseded / expired inactive --");
(function () {
  var rejected = GI.reviewCandidateGuestKnowledge({
    candidate: sampleCandidate({ candidateId: "cand-rej" }),
    action: "reject",
    actor: memberActor(),
    reason: "Not a lasting preference"
  });
  assert(rejected.ok && rejected.knowledge.approvalStatus === "rejected", "7a. rejected status");
  assert(GI.isActiveGuestKnowledge(rejected.knowledge) === false, "7b. rejected inactive");

  var confirmed = GI.reviewCandidateGuestKnowledge({
    candidate: sampleCandidate({ candidateId: "cand-super" }),
    action: "confirm",
    actor: memberActor()
  }).knowledge;
  var superseded = GI.reviewCandidateGuestKnowledge({
    existingKnowledge: confirmed,
    action: "supersede",
    actor: memberActor(),
    supersededBy: "gk-newer-1",
    reason: "Replaced by later confirmation"
  });
  assert(superseded.knowledge.approvalStatus === "superseded", "8a. superseded status");
  assert(superseded.knowledge.supersededBy === "gk-newer-1", "8b. supersededBy traceable");
  assert(GI.isActiveGuestKnowledge(superseded.knowledge) === false, "8c. superseded inactive");

  var expired = GI.reviewCandidateGuestKnowledge({
    existingKnowledge: confirmed,
    action: "expire",
    actor: memberActor(),
    expiresAt: "2026-01-01T00:00:00.000Z"
  });
  assert(expired.knowledge.approvalStatus === "expired", "9a. expired status");
  assert(GI.isActiveGuestKnowledge(expired.knowledge) === false, "9b. expired inactive");
})();

console.log("\n-- 10–11. Prohibited + sensitive --");
(function () {
  var prohibited = GI.reviewCandidateGuestKnowledge({
    candidate: sampleCandidate({
      sensitivity: "prohibited",
      approvalRequirement: "never_store",
      lifecycleStatus: "prohibited"
    }),
    action: "confirm",
    actor: ownerActor()
  });
  assert(prohibited.ok === false && /prohibited/.test(prohibited.error), "10. prohibited cannot be confirmed");

  var sensitive = GI.reviewCandidateGuestKnowledge({
    candidate: sampleCandidate({
      candidateId: "cand-access",
      knowledgeType: "accessibility_or_service_need",
      sensitivity: "sensitive",
      approvalRequirement: "staff_review",
      proposedValue: { code: "accessible_room_need", tokens: ["service_need"] }
    }),
    action: "confirm",
    actor: memberActor({ userId: "staff-9" }),
    reason: "Verified with guest at check-in"
  });
  assert(sensitive.ok === true, "11a. sensitive confirm with explicit staff action");
  assert(sensitive.auth.sensitiveExplicitReview === true, "11b. sensitive flagged for explicit review");
  assert(sensitive.knowledge.approvedBy === "staff-9", "11c. sensitive records reviewer");
})();

console.log("\n-- 12. Confirmed knowledge cannot alter priority --");
(function () {
  var before = SI.analyze({
    shiftCode: "PM",
    rawNotesText: "Room 24 AC not working. Maint aware.",
    classified: {
      _analyzed: (function () {
        var line = "Room 24 AC not working. Maint aware.";
        var rooms = AiWritingEngine.extractRoomNumbers(line);
        var fact = AiWritingEngine.extractOperationalFact(line, {
          rooms: rooms,
          section: "maintenance"
        });
        return [{
          original: line,
          rooms: rooms,
          section: "maintenance",
          fact: fact,
          _neutralFactId: "prio-1",
          _neutralSourceType: "handover"
        }];
      })()
    },
    departments: ["Reception", "Maintenance"],
    workspaceId: WS_A,
    hotelSnapshot: {}
  });
  var priorities = (before.recommendations || []).map(function (r) {
    return r.priority || r.canonicalPriority;
  });

  var review = GI.reviewCandidateGuestKnowledge({
    candidate: sampleCandidate(),
    action: "confirm",
    actor: memberActor()
  });
  assert(!("priority" in review.knowledge) && !("urgency" in review.knowledge) &&
    !("operationalRisk" in review.knowledge), "12a. knowledge has no priority/urgency/risk");

  var after = SI.analyze({
    shiftCode: "PM",
    rawNotesText: "Room 24 AC not working. Maint aware.",
    classified: before.classified || {
      _analyzed: before.facts ? [] : undefined
    },
    analyzedNotes: (before.facts || []).length ? undefined : undefined,
    departments: ["Reception", "Maintenance"],
    workspaceId: WS_A,
    hotelSnapshot: {}
  });
  /* Re-run same note path for parity */
  var after2 = SI.analyze({
    shiftCode: "PM",
    rawNotesText: "Room 24 AC not working. Maint aware.",
    classified: {
      _analyzed: (function () {
        var line = "Room 24 AC not working. Maint aware.";
        var rooms = AiWritingEngine.extractRoomNumbers(line);
        var fact = AiWritingEngine.extractOperationalFact(line, {
          rooms: rooms,
          section: "maintenance"
        });
        return [{
          original: line,
          rooms: rooms,
          section: "maintenance",
          fact: fact,
          _neutralFactId: "prio-1",
          _neutralSourceType: "handover"
        }];
      })()
    },
    departments: ["Reception", "Maintenance"],
    workspaceId: WS_A,
    hotelSnapshot: {}
  });
  var prioritiesAfter = (after2.recommendations || []).map(function (r) {
    return r.priority || r.canonicalPriority;
  });
  assert(JSON.stringify(priorities) === JSON.stringify(prioritiesAfter),
    "12b. recommendation priorities unchanged by GI-3 confirm");
})();

console.log("\n-- 13. No automatic profile merge --");
(function () {
  var a = GI.reviewCandidateGuestKnowledge({
    candidate: sampleCandidate({
      candidateId: "smith-12",
      identityEvidence: { guestName: "Mr Smith", room: "12", rooms: ["12"], reservationId: "", bookingReference: "", sourceType: "handover" }
    }),
    action: "confirm",
    actor: memberActor()
  });
  var b = GI.reviewCandidateGuestKnowledge({
    candidate: sampleCandidate({
      candidateId: "smith-28",
      identityEvidence: { guestName: "Mr Smith", room: "28", rooms: ["28"], reservationId: "", bookingReference: "", sourceType: "handover" }
    }),
    action: "confirm",
    actor: memberActor()
  });
  assert(a.knowledge.id !== b.knowledge.id, "13a. separate knowledge ids");
  assert(a.knowledge.identityEvidence.room !== b.knowledge.identityEvidence.room, "13b. rooms remain separate");
  assert(!a.knowledge.guestId && !b.knowledge.guestId, "13c. no merged guestId");
})();

console.log("\n-- 14. Demo cannot persist knowledge --");
(function () {
  GI.clearDemoGiState();
  var r = GI.reviewCandidateGuestKnowledge({
    candidate: sampleCandidate({ workspaceId: "demo-workspace", candidateId: "demo-cand" }),
    action: "confirm",
    actor: memberActor({ workspaceId: "demo-workspace", isDemoWorkspace: true }),
    reason: "Demo confirm"
  });
  assert(r.ok === true, "14a. demo memory confirm allowed");
  assert(r.persistAllowed === false, "14b. persistAllowed false");
  assert(r.knowledge.persistent === false, "14c. knowledge not persistent");
  assert(GI.canPersistGuestKnowledge(r.knowledge, {
    userId: "u1",
    workspaceId: "demo-workspace",
    isMember: true,
    platformAccess: "active",
    isDemoWorkspace: true
  }).ok === false, "14d. canPersist denies demo");
  assert(GI.getLastDemoKnowledge().length >= 1, "14e. demo session holds knowledge");
  GI.clearDemoGiState();
  assert(GI.getLastDemoKnowledge().length === 0, "14f. reset clears demo knowledge");
})();

console.log("\n-- 15. No browser service_role + migration RPC/RLS static --");
(function () {
  var browserFiles = [
    "guest-intelligence.js",
    "handover.html",
    "js/demo-mode.js",
    "shift-intelligence-engine.js",
    "index.html"
  ];
  var dirty = browserFiles.filter(function (f) {
    var src = load(f);
    return /service_role|SERVICE_ROLE|SUPABASE_SERVICE_ROLE/i.test(src);
  });
  assert(dirty.length === 0, "15a. no service_role in GI/browser frontend files");

  var migration = load("supabase/migrations/phase17_guest_knowledge.sql");
  assert(/CREATE TABLE IF NOT EXISTS public\.guest_knowledge/.test(migration), "15b. guest_knowledge table proposed");
  assert(/CREATE TABLE IF NOT EXISTS public\.guest_knowledge_review_events/.test(migration),
    "15c. review events table proposed");
  assert(/has_active_platform_access\(\)/.test(migration), "15d. has_active_platform_access in RLS");
  assert(/hotel_members/.test(migration), "15e. hotel_members membership check");
  assert(/ENABLE ROW LEVEL SECURITY/.test(migration), "15f. RLS enabled");
  assert(/guest_knowledge_select_member/.test(migration), "15g. SELECT policy for members");
  assert(!/CREATE POLICY "guest_knowledge_insert_member"/.test(migration),
    "15h. no authenticated INSERT policy on guest_knowledge");
  assert(!/CREATE POLICY "guest_knowledge_update_member"/.test(migration),
    "15i. no authenticated UPDATE policy on guest_knowledge");
  assert(!/CREATE POLICY "guest_knowledge_review_events_insert_member"/.test(migration),
    "15i2. no authenticated INSERT policy on review_events");
  assert(/CREATE OR REPLACE FUNCTION public\.propose_guest_knowledge/.test(migration),
    "15j. propose_guest_knowledge RPC");
  assert(/CREATE OR REPLACE FUNCTION public\.review_guest_knowledge/.test(migration),
    "15k. review_guest_knowledge RPC");
  assert(/guest_knowledge\.allow_lifecycle/.test(migration), "15l. lifecycle GUC gate");
  assert(/INSERT INTO public\.guest_knowledge_review_events/.test(migration),
    "15m. RPC writes audit events");
  assert(/SECURITY DEFINER/.test(migration), "15n. SECURITY DEFINER RPCs");
  assert(/guest_knowledge_is_owner_only_type/.test(migration), "15o. owner-only type helper");
  assert(/confidence >= 0 AND confidence <= 1/.test(migration), "15p. confidence 0–1 constraint");
  assert(/guest_knowledge_superseded_workspace_fk/.test(migration), "15q. same-workspace supersession FK");
  assert(/guest_knowledge_no_self_supersede/.test(migration), "15r. no self-supersede");
  assert(/workspace_id is immutable/.test(migration), "15s. immutable workspace_id");
  assert(/source references are immutable/.test(migration), "15t. immutable source refs");
  assert(/inserts must begin as proposed/.test(migration), "15u. inserts begin as proposed");
  assert(/Prohibited content cannot be proposed/.test(migration), "15v. prohibited blocked server-side");
  assert(/Do not assume it has been applied|PROPOSED for review/i.test(migration),
    "15w. migration marked proposed / not assumed applied");
})();

console.log("\n-- Live test plan documented (not executed) --");
(function () {
  var docs = load("docs/GUEST_INTELLIGENCE_ARCHITECTURE.md");
  assert(/Live GI-3 test plan/.test(docs) || /future non-production live GI-3/i.test(docs),
    "live GI-3 test plan present in architecture docs");
})();

console.log("\n-- Engine boundary: no recommend wiring --");
(function () {
  assert(typeof GI.generateRecommendations !== "function", "no GI recommend API");
  var analyzed = SI.analyze({
    shiftCode: "PM",
    rawNotesText: "Mrs Taylor in Room 42 prefers a high floor.",
    classified: {
      _analyzed: (function () {
        var line = "Mrs Taylor in Room 42 prefers a high floor.";
        var rooms = AiWritingEngine.extractRoomNumbers(line);
        var fact = AiWritingEngine.extractOperationalFact(line, { rooms: rooms, section: "guest" });
        return [{
          original: line,
          rooms: rooms,
          section: "guest",
          fact: fact,
          _neutralFactId: "gi3-eng",
          _neutralSourceType: "handover"
        }];
      })()
    },
    departments: ["Reception"],
    workspaceId: WS_A,
    hotelSnapshot: {}
  });
  assert(Array.isArray(analyzed.guestCandidates), "analyze still exposes candidates");
  assert(analyzed.guestConfirmedKnowledge == null, "confirmed knowledge not wired into analyze yet");
})();

console.log("\n" + passed + " passed, " + failed + " failed\n");
if (failed) process.exit(1);
