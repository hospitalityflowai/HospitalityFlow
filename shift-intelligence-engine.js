/**
 * Hospitality Flow — Shift Intelligence Engine
 * Reusable intelligence layer between Hotel Brain and operational tools.
 * Rule-based v1 — modular surface for future LLM / agent backends.
 *
 * Phase 16B — Thin shared intelligence foundation:
 * - Runtime-only neutral operational facts (not persisted; no shared fact table)
 * - Handover compatibility adapter (legacy analyze input → neutral facts)
 * - Maintenance issue adapter (runtime only; not wired into Handover yet)
 * - analyzeFacts({ facts, brainContext, ... }) alongside legacy analyze(...)
 * - Optional recommendation traceability: sourceFactIds, sourceTypes, reasonCode
 */
(function (global) {
  "use strict";

  var ENGINE_VERSION = 1;
  var MAX_RECOMMENDATIONS = 6;
  var MAX_CHECKLIST_ITEMS = 16;

  var PRIORITY_RANK = { urgent: 0, high: 1, normal: 2, low: 3 };

  /**
   * Neutral operational fact (runtime only).
   * Adapters populate only fields they have; omit or leave empty otherwise.
   *
   * {
   *   id, sourceType, sourceId, workspaceId?,
   *   subjectType, subjectId, room, area, guest, department, category,
   *   action, detail, status, priority, occurredAt, dueAt,
   *   isResolved, includeInHandover, confidence, sourceText, metadata
   * }
   *
   * priority (neutral): urgent | high | medium | low
   *   (maps to recommendation priority: medium → normal)
   * sourceType examples: "handover" | "maintenance"
   */
  var NEUTRAL_FACT_FIELDS = [
    "id", "sourceType", "sourceId", "workspaceId",
    "subjectType", "subjectId", "room", "area", "guest", "department", "category",
    "action", "detail", "status", "priority", "occurredAt", "dueAt",
    "isResolved", "includeInHandover", "confidence", "sourceText", "metadata"
  ];

  var CHECKLIST_STATUS = {
    pending: "pending",
    complete: "complete",
    not_applicable: "not_applicable"
  };

  function createId() {
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  }

  function trimText(value) {
    return String(value || "").trim();
  }

  /* ------------------------------------------------------------------ */
  /*  Phase 16B — normalisation helpers                                  */
  /* ------------------------------------------------------------------ */

  /**
   * Canonical room token: "Room 24" / "24" / "room24" → "24" (uppercase suffix).
   */
  function normalizeRoomNumber(value) {
    var s = trimText(value);
    if (!s) return "";
    var m = s.match(/(\d{1,4}[a-z]?)/i);
    if (!m) return "";
    var num = String(m[1]).toUpperCase();
    var parsed = parseInt(num, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 9999) return "";
    return num;
  }

  /**
   * Neutral priority: urgent | high | medium | low
   * Accepts handover Critical/High/Normal and engine normal.
   */
  function normalizePriority(value) {
    var v = trimText(value).toLowerCase();
    if (!v) return "medium";
    if (v === "critical" || v === "urgent") return "urgent";
    if (v === "high") return "high";
    if (v === "low") return "low";
    if (v === "medium" || v === "normal") return "medium";
    return "medium";
  }

  /** Map neutral priority onto recommendation PRIORITY_RANK keys. */
  function toRecommendationPriority(neutralPriority) {
    var p = normalizePriority(neutralPriority);
    if (p === "medium") return "normal";
    return p;
  }

  function priorityRankValue(priority) {
    var rec = toRecommendationPriority(priority);
    return PRIORITY_RANK[rec] != null ? PRIORITY_RANK[rec] : 9;
  }

  /**
   * Resolved / closed detection for mixed vocabularies.
   * Maintenance: completed. Facts: done / confirmed. Prose: resolved / closed / …
   */
  function isResolvedStatus(status) {
    var s = trimText(status).toLowerCase().replace(/-/g, "_");
    if (!s) return false;
    return (
      s === "completed" ||
      s === "complete" ||
      s === "resolved" ||
      s === "done" ||
      s === "closed" ||
      s === "confirmed"
    );
  }

  /** Stable source identity string: sourceType:sourceId */
  function createSourceIdentity(sourceType, sourceId) {
    return trimText(sourceType || "unknown") + ":" + trimText(sourceId || "");
  }

  function stableToken(value, maxLen) {
    return trimText(value)
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_|:-]/g, "")
      .slice(0, maxLen || 48);
  }

  function buildNeutralFactId(sourceType, sourceId, room, subjectType) {
    return [
      stableToken(sourceType || "unknown", 24),
      stableToken(sourceId || "", 64),
      stableToken(room || "", 12),
      stableToken(subjectType || "", 32)
    ].join(":");
  }

  function createEmptyNeutralFact() {
    return {
      id: "",
      sourceType: "",
      sourceId: "",
      workspaceId: "",
      subjectType: "",
      subjectId: "",
      room: "",
      area: "",
      guest: "",
      department: "",
      category: "",
      action: "",
      detail: "",
      status: "",
      priority: "medium",
      occurredAt: "",
      dueAt: "",
      isResolved: false,
      includeInHandover: false,
      confidence: "high",
      sourceText: "",
      metadata: {}
    };
  }

  function ensureNeutralFact(raw) {
    var base = createEmptyNeutralFact();
    if (!raw || typeof raw !== "object") return base;
    NEUTRAL_FACT_FIELDS.forEach(function (key) {
      if (raw[key] !== undefined && raw[key] !== null) base[key] = raw[key];
    });
    base.room = normalizeRoomNumber(base.room) || trimText(base.room);
    base.priority = normalizePriority(base.priority);
    base.isResolved = base.isResolved === true || isResolvedStatus(base.status);
    base.includeInHandover = base.includeInHandover === true;
    base.confidence = trimText(base.confidence) || (base.metadata && base.metadata.uncertainty ? "low" : "high");
    if (!base.id) {
      base.id = buildNeutralFactId(base.sourceType, base.sourceId, base.room, base.subjectType);
    }
    if (!base.metadata || typeof base.metadata !== "object") base.metadata = {};
    return base;
  }

  /* ------------------------------------------------------------------ */
  /*  Phase 16B — adapters                                               */
  /* ------------------------------------------------------------------ */

  function handoverPriorityFromNote(note, fact) {
    if (note && note.section === "urgent") return "urgent";
    if (note && note.maintenancePriority === "Critical") return "urgent";
    if (note && note.maintenancePriority === "High") return "high";
    if (note && (note.isVip || (fact && fact.subject === "vip_arrival"))) return "high";
    if (note && note.maintenancePriority === "Normal") return "medium";
    return "medium";
  }

  /**
   * Convert one Handover analyzed note (+ optional OperationalFact) → neutral fact.
   */
  function handoverNoteToNeutralFact(note, index, options) {
    options = options || {};
    if (!note || typeof note !== "object") return null;

    var fact = note.fact || null;
    if (!fact && global.AiWritingEngine && global.AiWritingEngine.extractOperationalFact) {
      fact = global.AiWritingEngine.extractOperationalFact(note.original || "", {
        rooms: note.rooms,
        section: note.section,
        isVip: note.isVip
      });
    }

    var rooms = (fact && fact.rooms && fact.rooms.length)
      ? fact.rooms
      : (note.rooms || []);
    var room = normalizeRoomNumber(rooms[0] || "");
    var sourceText = trimText((fact && fact.sourceText) || note.original || "");
    var subjectType = trimText((fact && fact.subject) || note.section || "note");
    var status = trimText((fact && fact.status) || "");
    var sourceId = trimText(note.id) || ("note-" + String(index) + "-" + stableToken(sourceText, 40));
    var actionParts = [];
    if (fact && fact.actionVerb) actionParts.push(fact.actionVerb);
    if (fact && fact.actionTarget) actionParts.push(fact.actionTarget);
    var detailParts = [];
    if (fact && fact.details && fact.details.length) {
      fact.details.forEach(function (d) {
        if (d && d.value) detailParts.push(String(d.type ? d.type + ":" : "") + d.value);
      });
    }
    var isResolved = false;
    if (fact && global.AiWritingEngine && global.AiWritingEngine.isFactClosed) {
      isResolved = global.AiWritingEngine.isFactClosed(fact);
    } else {
      isResolved = isResolvedStatus(status) || isResolvedNote(sourceText);
    }

    var neutral = ensureNeutralFact({
      sourceType: (note.importedFromMaintenance || note._neutralSourceType === "maintenance")
        ? "maintenance"
        : "handover",
      sourceId: sourceId,
      workspaceId: options.workspaceId || "",
      subjectType: subjectType,
      subjectId: "",
      room: room,
      area: "",
      guest: trimText(fact && fact.guestName),
      department: trimText((fact && fact.ownerDept) || ""),
      category: trimText((fact && (fact.category || fact.subject)) || note.section || ""),
      action: actionParts.join(" "),
      detail: detailParts.join("; ") || subjectType,
      status: status || (isResolved ? "done" : "open"),
      priority: handoverPriorityFromNote(note, fact),
      occurredAt: "",
      dueAt: "",
      isResolved: isResolved,
      includeInHandover: true,
      confidence: fact && fact.uncertainty ? "low" : "high",
      sourceText: sourceText,
      metadata: {
        section: note.section || "",
        isVip: !!note.isVip,
        maintenancePriority: note.maintenancePriority || null,
        rooms: rooms.slice(),
        uncertainty: !!(fact && fact.uncertainty),
        ownerName: trimText(fact && fact.ownerName),
        operationalFact: fact || null,
        handoverNote: {
          original: note.original || sourceText,
          rooms: rooms.slice(),
          section: note.section || null,
          isVip: !!note.isVip,
          maintenancePriority: note.maintenancePriority || null,
          fact: fact || null
        }
      }
    });
    return neutral;
  }

  function factsFromHandoverAnalyzedNotes(analyzedNotes, options) {
    return (analyzedNotes || []).map(function (note, index) {
      return handoverNoteToNeutralFact(note, index, options || {});
    }).filter(Boolean);
  }

  /**
   * Runtime-only Maintenance adapter.
   * Accepts HFMaintenanceStore issue objects (camelCase) or snake_case rows.
   * Does not query the database. Not wired into Handover in Phase 16B.
   */
  function maintenanceIssueToNeutralFact(issue, options) {
    options = options || {};
    if (!issue || typeof issue !== "object") return null;

    var sourceId = trimText(issue.id || issue.sourceId);
    var room = normalizeRoomNumber(issue.roomNumber || issue.room_number || issue.room || "");
    var area = trimText(issue.area || "");
    var status = trimText(issue.status || "");
    var priority = normalizePriority(issue.priority);
    var title = trimText(issue.title || "");
    var description = trimText(issue.description || "");
    var detail = title;
    if (description && description !== title) {
      detail = title ? title + " — " + description : description;
    }
    var isResolved = status.toLowerCase() === "completed" || issue.completedAt || issue.completed_at
      ? true
      : isResolvedStatus(status);
    if (issue.completedAt || issue.completed_at) isResolved = true;

    var neutral = ensureNeutralFact({
      sourceType: "maintenance",
      sourceId: sourceId,
      workspaceId: options.workspaceId || issue.workspaceId || issue.workspace_id || "",
      subjectType: "maintenance",
      subjectId: sourceId,
      room: room,
      area: area,
      guest: "",
      department: trimText(issue.assignedDepartment || issue.assigned_department || "Maintenance"),
      category: trimText(issue.category || ""),
      action: isResolved ? "resolved" : "follow_up",
      detail: detail,
      status: status || (isResolved ? "completed" : "open"),
      priority: priority,
      occurredAt: trimText(issue.updatedAt || issue.updated_at || issue.createdAt || issue.created_at || ""),
      dueAt: trimText(issue.dueAt || issue.due_at || "") || "",
      isResolved: isResolved,
      includeInHandover: issue.includeInHandover === true || issue.include_in_handover === true,
      confidence: "high",
      sourceText: detail || description || title,
      metadata: {
        locationType: issue.locationType || issue.location_type || "",
        reportedByName: issue.reportedByName || issue.reported_by_name || "",
        resolutionNotes: issue.resolutionNotes || issue.resolution_notes || "",
        issue: issue
      }
    });
    return neutral;
  }

  function factsFromMaintenanceIssues(issues, options) {
    return (issues || []).map(function (issue) {
      return maintenanceIssueToNeutralFact(issue, options || {});
    }).filter(Boolean);
  }

  /**
   * M4 — issues eligible for Handover import.
   * include_in_handover === true AND status !== completed.
   */
  function filterMaintenanceIssuesForHandover(issues) {
    return (issues || []).filter(function (issue) {
      if (!issue || typeof issue !== "object") return false;
      var included = issue.includeInHandover === true || issue.include_in_handover === true;
      if (!included) return false;
      var status = trimText(issue.status).toLowerCase();
      if (status === "completed") return false;
      return true;
    });
  }

  function significantTokens(text) {
    return trimText(text)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(function (token) {
        if (token.length < 4) return false;
        return !/^(room|rooms|with|from|that|this|have|been|into|only|issue|open|area)$/.test(token);
      });
  }

  function tokenOverlapCount(a, b) {
    var left = significantTokens(a);
    var right = significantTokens(b);
    if (!left.length || !right.length) return 0;
    var seen = {};
    right.forEach(function (t) { seen[t] = true; });
    var count = 0;
    left.forEach(function (t) {
      if (seen[t]) count += 1;
    });
    return count;
  }

  function roomsCompatible(a, b) {
    var roomA = normalizeRoomNumber(a);
    var roomB = normalizeRoomNumber(b);
    if (roomA && roomB) return roomA === roomB;
    if (!roomA && !roomB) return true;
    return false;
  }

  /**
   * True when a maintenance fact matches an existing handover fact closely enough
   * to treat as the same issue (same room + overlapping detail tokens).
   */
  function maintenanceFactDuplicatesHandoverFact(maintFact, handoverFact) {
    var mf = ensureNeutralFact(maintFact);
    var hf = ensureNeutralFact(handoverFact);
    if (hf.sourceType === "maintenance" && mf.sourceId && hf.sourceId && mf.sourceId === hf.sourceId) {
      return true;
    }
    if (!roomsCompatible(mf.room, hf.room)) return false;
    if (mf.room && hf.room && normalizeRoomNumber(mf.room) === normalizeRoomNumber(hf.room)) {
      var overlap = tokenOverlapCount(
        (mf.detail || "") + " " + (mf.sourceText || "") + " " + (mf.category || ""),
        (hf.detail || "") + " " + (hf.sourceText || "") + " " + (hf.category || "") + " " + (hf.subjectType || "")
      );
      if (overlap >= 2) return true;
      /* Same room + both clearly maintenance subjects with any shared token */
      var maintSubject = /maintenance|plumb|electric|hvac|leak|shower|tap|fault|repair/i.test(
        (mf.detail || "") + " " + (mf.category || "") + " " + (mf.subjectType || "")
      );
      var handSubject = /maintenance|plumb|electric|hvac|leak|shower|tap|fault|repair/i.test(
        (hf.detail || "") + " " + (hf.sourceText || "") + " " + (hf.subjectType || "")
      );
      if (maintSubject && handSubject && overlap >= 1) return true;
    }
    if (!mf.room && !hf.room) {
      var areaA = trimText(mf.area).toLowerCase();
      var areaB = trimText(hf.area || hf.detail).toLowerCase();
      if (areaA && areaB && (areaA === areaB || areaB.indexOf(areaA) !== -1 || areaA.indexOf(areaB) !== -1)) {
        return tokenOverlapCount(mf.detail || mf.sourceText, hf.detail || hf.sourceText) >= 2;
      }
    }
    return false;
  }

  function dedupeMaintenanceFactsAgainstHandover(maintenanceFacts, handoverFacts) {
    var hand = handoverFacts || [];
    return (maintenanceFacts || []).filter(function (mf) {
      return !hand.some(function (hf) {
        return maintenanceFactDuplicatesHandoverFact(mf, hf);
      });
    });
  }

  /**
   * Rebuild a Handover-shaped analyzed note from a neutral fact so existing
   * recommendation rules can run unchanged.
   */
  function neutralFactToAnalyzedNote(fact) {
    var f = ensureNeutralFact(fact);
    if (f.metadata && f.metadata.handoverNote && typeof f.metadata.handoverNote === "object") {
      var hn = f.metadata.handoverNote;
      var cloned = {
        original: hn.original || f.sourceText || "",
        rooms: (hn.rooms && hn.rooms.length) ? hn.rooms.slice() : (f.room ? [f.room] : []),
        section: hn.section != null ? hn.section : (f.subjectType === "maintenance" ? "maintenance" : null),
        isVip: !!hn.isVip,
        maintenancePriority: hn.maintenancePriority || null,
        fact: hn.fact || f.metadata.operationalFact || null,
        _neutralFactId: f.id,
        _neutralSourceType: f.sourceType
      };
      return cloned;
    }

    var rooms = f.room ? [f.room] : [];
    var section = "general";
    if (f.sourceType === "maintenance" || f.subjectType === "maintenance") section = "maintenance";
    else if (f.subjectType === "vip_arrival" || /vip/i.test(f.detail || "")) section = "guest";
    else if (/payment|balance|folio/i.test(f.subjectType + " " + f.detail)) section = "payments";

    var maintPri = null;
    if (section === "maintenance") {
      if (f.priority === "urgent") maintPri = "Critical";
      else if (f.priority === "high") maintPri = "High";
      else maintPri = "Normal";
    }

    var operationalFact = f.metadata && f.metadata.operationalFact
      ? f.metadata.operationalFact
      : {
          sourceText: f.sourceText || f.detail || "",
          sourceTexts: f.sourceText ? [f.sourceText] : [],
          sourceHistory: [],
          rooms: rooms.slice(),
          subject: f.subjectType || (section === "maintenance" ? "maintenance" : ""),
          status: f.isResolved ? "done" : (f.status || "open"),
          ownerDept: f.department || "",
          ownerName: "",
          actionVerb: f.action || (section === "maintenance" ? "follow_up" : ""),
          actionTarget: section === "maintenance" ? "maintenance" : "",
          details: [],
          sectionHint: section,
          guestName: f.guest || "",
          arrivalDate: "",
          preferredLocation: "",
          confirmationStatus: "",
          paymentMethod: "",
          package: "",
          guarantee: "",
          guestType: "",
          category: f.category || "",
          uncertainty: f.confidence === "low"
        };

    return {
      original: f.sourceText || f.detail || "",
      rooms: rooms,
      section: section,
      isVip: /vip/i.test(f.subjectType + " " + f.detail + " " + f.sourceText),
      maintenancePriority: maintPri,
      fact: operationalFact,
      _neutralFactId: f.id,
      _neutralSourceType: f.sourceType
    };
  }

  function parseNotes(text) {
    return String(text || "")
      .split(/\n+/)
      .map(function (line) { return line.trim(); })
      .filter(function (line) { return line.length > 0; });
  }

  function noteContains(text, terms) {
    var lower = String(text || "").toLowerCase();
    return terms.some(function (term) { return lower.indexOf(term.toLowerCase()) !== -1; });
  }

  function isResolvedNote(line) {
    return noteContains(line, [
      "resolved", "completed", "fixed", "done", "closed", "sorted",
      "no longer required", "no longer needed", "cancelled", "canceled"
    ]);
  }

  function isQuietShiftLines(lines) {
    if (!lines.length) return true;
    return lines.every(function (line) {
      return noteContains(line, [
        "quiet shift", "all guests settled", "no outstanding issues", "no outstanding issue",
        "nothing to report", "uneventful", "all quiet", "no issues", "no follow-up",
        "no follow up", "smooth shift", "without incident"
      ]);
    });
  }

  function normalizeShiftType(shiftCode, shiftDisplayName) {
    var combined = (String(shiftCode || "") + " " + String(shiftDisplayName || "")).toLowerCase();
    if (/\bnight\b|\bovernight\b|\bgraveyard\b/.test(combined)) return "night";
    if (/\bam\b|\bmorning\b|\bbreakfast\b|\bearly shift\b/.test(combined)) return "am";
    if (/\bpm\b|\bafternoon\b|\bevening\b|\blate shift\b/.test(combined)) return "pm";
    return "pm";
  }

  function normalizeRecommendation(raw, fallbackDept) {
    if (!raw || typeof raw !== "object") {
      return {
        id: createId(),
        text: String(raw || ""),
        priority: "normal",
        department: fallbackDept || "Reception",
        status: "open"
      };
    }
    var status = raw.status || "open";
    if (status === "in-progress") status = "in_progress";
    var out = {
      id: raw.id || createId(),
      text: String(raw.text || ""),
      priority: raw.priority || "normal",
      department: raw.department || fallbackDept || "Reception",
      status: status
    };
    /* Phase 16B optional traceability — ignored by older UI consumers */
    if (raw.sourceFactIds && raw.sourceFactIds.length) out.sourceFactIds = raw.sourceFactIds.slice();
    if (raw.sourceTypes && raw.sourceTypes.length) out.sourceTypes = raw.sourceTypes.slice();
    if (raw.reasonCode) out.reasonCode = String(raw.reasonCode);
    return out;
  }

  function normalizeChecklistItem(raw, fallbackDept) {
    if (!raw || typeof raw !== "object") {
      return {
        id: createId(),
        text: String(raw || ""),
        category: "Operations",
        department: fallbackDept || "Reception",
        priority: "normal",
        status: CHECKLIST_STATUS.pending
      };
    }
    var status = raw.status || CHECKLIST_STATUS.pending;
    if (status === "na" || status === "n/a") status = CHECKLIST_STATUS.not_applicable;
    return {
      id: raw.id || createId(),
      text: String(raw.text || ""),
      category: raw.category || "Operations",
      department: raw.department || fallbackDept || "Reception",
      priority: raw.priority || "normal",
      status: status
    };
  }

  function roomPhrase(note) {
    if (!note.rooms || !note.rooms.length) return "";
    return note.rooms.length === 1 ? "Room " + note.rooms[0] : "Rooms " + note.rooms.join(", ");
  }

  function roomInPhrase(note) {
    if (!note.rooms || !note.rooms.length) return "";
    return note.rooms.length === 1 ? " in Room " + note.rooms[0] : " in Rooms " + note.rooms.join(", ");
  }

  function roomOnPhrase(note) {
    if (!note.rooms || !note.rooms.length) return "";
    return note.rooms.length === 1 ? " on Room " + note.rooms[0] : " on Rooms " + note.rooms.join(", ");
  }

  function detectVip(line) {
    return noteContains(line, ["vip", "very important", "celebrity", "suite guest", "high profile"]);
  }

  function maintenanceNeedsFollowUp(note) {
    if (note.section !== "maintenance" && !noteContains(note.original, [
      "maintenance", "repair", "fix", "broken", "not working", "faulty", "leak", "leaking"
    ])) {
      return false;
    }
    return !isResolvedNote(note.original);
  }

  function isOtaPaymentTaskLine(line) {
    return noteContains(line, [
      "virtual card", "virtual credit card", "vcc", "ota",
      "booking.com", "booking com", "expedia", "channel collect",
      "channel payment", "ota payment", "vc card"
    ]);
  }

  function hasExplicitOutstandingBalance(line) {
    return noteContains(line, [
      "outstanding balance", "open balance", "balance due", "unpaid", "owing",
      "still to pay", "needs to pay", "payment outstanding", "balance outstanding",
      "card declined", "declined at checkout", "declined at check-out",
      "declined card", "failed payment", "payment failed"
    ]);
  }

  function isPaymentIssueLine(line) {
    if (noteContains(line, ["adapter", "loan item", "inventory", "restock"]) &&
        !hasExplicitOutstandingBalance(line)) {
      return false;
    }
    if (isOtaPaymentTaskLine(line)) return true;
    if (hasExplicitOutstandingBalance(line)) return true;
    return noteContains(line, [
      "payment", "folio", "invoice", "pre-auth", "preauth", "refund",
      "open balance", "outstanding balance"
    ]) || (noteContains(line, ["minibar"]) && noteContains(line, ["charge", "dispute", "review"]));
  }

  function paymentActionText(note, shiftType) {
    var line = note.original || "";
    var roomRef = roomPhrase(note);
    if (isOtaPaymentTaskLine(line)) {
      return "Reception – Process OTA virtual card / channel payment" +
        (roomRef ? " for " + roomRef : "") + ".";
    }
    if (noteContains(line, ["minibar"]) && !hasExplicitOutstandingBalance(line)) {
      return "Reception – Review minibar charge" +
        (noteContains(line, ["dispute", "not consumed"]) ? " dispute" : "") +
        (roomRef ? " for " + roomRef : "") + " before posting.";
    }
    if (noteContains(line, ["deposit"]) && !hasExplicitOutstandingBalance(line)) {
      return "Reception – Action deposit note" + (roomRef ? " for " + roomRef : "") +
        " as recorded.";
    }
    if (hasExplicitOutstandingBalance(line) || noteContains(line, ["declined"])) {
      if (roomRef) {
        return "Reception – Contact " + roomRef + " regarding outstanding balance before departure.";
      }
      return "Reception – Settle outstanding balance before departure.";
    }
    return "Reception – Action payment note" + (roomRef ? " for " + roomRef : "") +
      " as recorded.";
  }

  function resolveDepartment(candidates, fallback, configuredDepartments) {
    var options = candidates || [];
    var departments = configuredDepartments || [];
    for (var i = 0; i < options.length; i++) {
      var candidate = options[i];
      var match = departments.filter(function (dept) {
        var lowerDept = dept.toLowerCase();
        var lowerCandidate = candidate.toLowerCase();
        return lowerDept.indexOf(lowerCandidate) !== -1 || lowerCandidate.indexOf(lowerDept) !== -1;
      })[0];
      if (match) return match;
    }
    return fallback || (departments[0] || "Reception");
  }

  function applyBrainDepartmentDefaults(brainContext, configuredDepartments) {
    var depts = (brainContext && brainContext.departments) || [];
    if (depts.length) {
      return depts.map(function (d) {
        return typeof d === "string" ? d : (d.name || d.label || "");
      }).filter(Boolean);
    }
    return configuredDepartments || [];
  }

  function usesOperaWorkflow(brainContext, rawNotesText) {
    var haystack = [
      rawNotesText || "",
      brainContext && brainContext.combinedInstructions || "",
      brainContext && brainContext.internalInstructions || ""
    ].join(" ").toLowerCase();
    return haystack.indexOf("opera") !== -1;
  }

  function buildSignals(input) {
    var analyzed = (input.classified && input.classified._analyzed) || input.analyzedNotes || [];
    var metrics = input.metrics || (input.classified && input.classified._metrics) || {};
    var rawNotesText = input.rawNotesText || "";
    var notesLower = rawNotesText.toLowerCase();
    var lines = parseNotes(rawNotesText);
    var shiftType = normalizeShiftType(input.shiftCode, input.shiftDisplayName);
    var snapshot = input.hotelSnapshot || {};

    function activeNote(matchFn) {
      return analyzed.some(function (note) {
        return matchFn(note) && !isResolvedNote(note.original);
      });
    }

    function notesMatch(terms) {
      return terms.some(function (term) { return notesLower.indexOf(term) !== -1; });
    }

    var hasArrivalsInSnapshot = !!(snapshot.arrivals || snapshot.expectedArrivals);
    var hasDeparturesInSnapshot = !!(snapshot.departures || snapshot.checkouts);

    return {
      shiftType: shiftType,
      isQuietShift: isQuietShiftLines(lines),
      metrics: metrics,
      analyzedCount: analyzed.length,
      hasVipArrival: (metrics.vip || 0) > 0 || activeNote(function (note) {
        return (note.isVip || detectVip(note.original)) &&
          noteContains(note.original, ["arriv", "tomorrow", "checking in", "due in", "tonight"]);
      }),
      hasVip: (metrics.vip || 0) > 0 || activeNote(function (note) {
        return note.isVip || detectVip(note.original);
      }),
      hasMaintenance: (metrics.maintenance || 0) > 0 || activeNote(function (note) {
        return maintenanceNeedsFollowUp(note);
      }),
      hasPayments: (metrics.payments || 0) > 0 || activeNote(function (note) {
        return isPaymentIssueLine(note.original);
      }),
      hasWakeUpCalls: activeNote(function (note) {
        return noteContains(note.original, ["wake-up call", "wakeup call", "wake up call"]);
      }),
      hasAirportTransfers: activeNote(function (note) {
        return noteContains(note.original, ["airport transfer", "airport pick", "station transfer"]);
      }) || notesMatch(["airport transfer", "airport pick-up", "airport pickup"]),
      hasTransfers: activeNote(function (note) {
        return noteContains(note.original, ["transfer", "pick up", "pickup", "taxi", "car service"]);
      }),
      hasLostProperty: activeNote(function (note) {
        return noteContains(note.original, ["lost property", "lost item", "left item", "missing item"]);
      }),
      hasPhysicalKeys: activeNote(function (note) {
        return noteContains(note.original, ["physical key", "room key", "key card", "keycard", "master key"]);
      }),
      hasLateCheckout: activeNote(function (note) {
        return noteContains(note.original, ["late checkout", "late check-out", "late check out", "extended checkout"]);
      }),
      hasHousekeepingRelease: activeNote(function (note) {
        return noteContains(note.original, ["housekeeping"]) &&
          noteContains(note.original, ["waiting", "release", "released", "dirty", "held"]);
      }),
      hasGuestRequests: (metrics.tasks || 0) > 0 || activeNote(function (note) {
        return noteContains(note.original, ["guest request", "special request", "request from", "adapter", "extra bed", "pillow"]);
      }),
      hasPackages: notesMatch(["package", "parcel", "delivery", "guest package"]),
      hasComplaints: activeNote(function (note) {
        return noteContains(note.original, ["complaint", "complain", "unhappy", "dissatisfied", "escalat"]);
      }),
      hasOpenTasks: (metrics.tasks || 0) > 0 || (metrics.urgent || 0) > 0,
      hasEvents: (metrics.events || 0) > 0,
      hasArrivals: hasArrivalsInSnapshot || notesMatch([
        "arrival", "checking in", "check in", "expected in", "due in"
      ]),
      hasRemainingArrivals: notesMatch([
        "remaining arrival", "still to arrive", "outstanding arrival", "not yet arrived", "expected arrival"
      ]) || (hasArrivalsInSnapshot && shiftType === "night"),
      hasDepartures: hasDeparturesInSnapshot || notesMatch(["departure", "checkout", "check out", "checking out"]),
      hasOpenBalances: activeNote(function (note) {
        return hasExplicitOutstandingBalance(note.original) ||
          noteContains(note.original, ["declined"]);
      }),
      hasInventoryShortage: notesMatch(["inventory", "shortage", "out of stock", "linen shortage"]),
      hasRegistrationCards: notesMatch(["registration card", "reg card"]) || shiftType === "night",
      hasWelcomeCards: notesMatch(["welcome card"]) || false,
      hasRoomAllocation: notesMatch(["room allocation", "allocated room", "room move", "room change"]),
      usesOpera: usesOperaWorkflow(input.brainContext, rawNotesText),
      brainConfigured: !!(input.brainContext && input.brainContext.general),
      hasHotelStandards: !!(input.brainContext && input.brainContext.hotelKnowledge &&
        trimText(input.brainContext.hotelKnowledge.hotelStandards)),
      hasVipRules: !!(input.brainContext && input.brainContext.hotelKnowledge &&
        trimText(input.brainContext.hotelKnowledge.vipRules)),
      hasOperationalNotes: !!(input.brainContext && input.brainContext.hotelKnowledge &&
        trimText(input.brainContext.hotelKnowledge.operationalNotes))
    };
  }

  function briefIssuePhrase(note) {
    var line = String(note.original || "");
    var cleaned = line
      .replace(/\broom\s+\d+[a-z]?\b/gi, "")
      .replace(/^\[[^\]]+\]\s*/, "")
      .replace(/\bmaintenance (?:has been |was )?informed\b/gi, "")
      .replace(/\s*[–—\-]\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\.$/, "");
    if (cleaned.length > 56) {
      var cut = cleaned.slice(0, 53);
      var lastSpace = cut.lastIndexOf(" ");
      cleaned = (lastSpace > 24 ? cut.slice(0, lastSpace) : cut).replace(/[,;:\s]+$/, "") + "…";
    }
    return cleaned;
  }

  function actionIssueLabel(note) {
    var line = String(note.original || "").toLowerCase();
    if (/leak|leaking|shower/.test(line)) return "shower leak";
    if (/air con|a\/c|\bac\b|not cooling|hvac/.test(line)) return "AC fault";
    if (/tv|remote/.test(line)) return "TV remote fault";
    if (/virtual card|virtual credit card|\bvcc\b|\bota\b|channel collect|channel payment/.test(line)) {
      return "OTA payment task";
    }
    if (/outstanding balance|open balance|balance due|unpaid|owing|declined/.test(line)) {
      return "outstanding balance";
    }
    if (/minibar/.test(line)) return "minibar charge review";
    if (/payment|folio|invoice|pre-auth|preauth|refund/.test(line)) return "payment follow-up";
    if (/late check/.test(line)) return "late check-out";
    if (/vip/.test(line) && /arriv/.test(line)) return "VIP arrival";
    if (/pillow|adapter|iron/.test(line)) return "guest request";
    if (/package|parcel/.test(line)) return "held package";
    if (/complaint|unhappy|escalat/.test(line)) return "guest complaint";
    var brief = briefIssuePhrase(note);
    return brief || "open issue";
  }

  function extractGuestPreference(line) {
    var text = String(line || "").trim();
    var lower = text.toLowerCase();
    var parts = [];

    if (/twin\s+setup|twin\s+bed|twin\s+room/i.test(text)) parts.push("twin setup as requested");
    if (/double|king|suite/i.test(text) && !/twin/i.test(text)) {
      var bedMatch = text.match(/\b(double|king|suite)\b/i);
      if (bedMatch) parts.push(bedMatch[1].toLowerCase() + " setup as noted");
    }
    if (/avoid accessibility|not accessibility|no accessibility|prefers.*avoid accessibility/i.test(lower)) {
      parts.push("preference to avoid accessibility rooms as noted");
    } else if (/accessibility|accessible|mobility|wheelchair/i.test(lower)) {
      parts.push("accessibility requirements as noted");
    }
    if (/late checkout|early check-in|early checkin/i.test(lower)) {
      if (/approved|confirmed|agreed|granted|authorised|authorized/i.test(lower)) {
        parts.push("note approved late check-out timing with the team");
      } else if (/request|requested|asking|asked|would like|wants/i.test(lower)) {
        parts.push("note late check-out request with the team");
      } else {
        parts.push("note check-out timing with the team");
      }
    }
    if (/allerg|dietary|gluten|nut/i.test(lower)) {
      var dietMatch = text.match(/(?:allerg(?:y|ic)|dietary|gluten|nut)[:\s-]*([^.\n]+)/i);
      if (dietMatch) parts.push("note dietary requirement: " + dietMatch[1].trim());
    }

    if (parts.length) return parts.join(" and ");

    var generic = text.match(/(?:preference|prefers|requested|needs|requires)[:\s-]+(.+?)(?:\.|$)/i);
    if (generic && generic[1]) {
      var detail = generic[1].trim().replace(/\.$/, "");
      if (detail.length > 8) return detail.charAt(0).toLowerCase() + detail.slice(1);
    }
    return "";
  }

  function ownerDepartmentForIssue(note, departments, fallbackDept) {
    if (note.section === "maintenance") {
      return resolveDepartment(["Maintenance", "Engineering"], "Maintenance", departments);
    }
    if (note.section === "payments") {
      return resolveDepartment(["Reception", "Front Office"], "Reception", departments);
    }
    if (note.section === "guest" || note.isVip) {
      return resolveDepartment(["Front Office", "Reception", "Duty Manager"], "Front Office", departments);
    }
    if (noteContains(note.original, ["housekeeping", "clean", "turndown", "linen"])) {
      return resolveDepartment(["Housekeeping"], "Housekeeping", departments);
    }
    if (noteContains(note.original, ["transfer", "taxi", "concierge"])) {
      return resolveDepartment(["Concierge", "Front Office"], "Concierge", departments);
    }
    return resolveDepartment([fallbackDept], fallbackDept, departments);
  }

  function trimBrainText(value) {
    return String(value == null ? "" : value).trim();
  }

  function firstGuidanceSentence(text, maxLen) {
    var raw = trimBrainText(text);
    if (!raw) return "";
    var sentence = raw.split(/[\n.!?]/)[0] || raw;
    sentence = trimBrainText(sentence);
    maxLen = maxLen || 140;
    if (sentence.length > maxLen) sentence = sentence.slice(0, maxLen - 1).replace(/\s+\S*$/, "") + "…";
    return sentence;
  }

  function findVipHotelBrainGuidance(brainContext) {
    var result = { okAction: "", vipRules: "" };
    if (!brainContext) return result;
    var hk = brainContext.hotelKnowledge || {};
    result.vipRules = trimBrainText(hk.vipRules);

    var entries = (brainContext.operationalKnowledge && brainContext.operationalKnowledge.knowledgeEntries) || [];
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      if (!entry || entry.active === false) continue;
      var triggers = entry.triggerKeywords || [];
      var isVip = /vip/i.test(entry.category || "") || /vip/i.test(entry.title || "") ||
        triggers.some(function (kw) { return /vip/i.test(String(kw || "")); });
      if (!isVip) continue;
      var follow = trimBrainText(entry.followUpInstruction);
      if (follow) {
        result.okAction = follow;
        break;
      }
      if (!result.okAction && trimBrainText(entry.content)) {
        result.okAction = firstGuidanceSentence(entry.content, 120);
      }
    }
    return result;
  }

  function vipActionText(note, shiftType, brainContext) {
    var roomRef = roomPhrase(note);
    var line = note.original || "";
    var preference = extractGuestPreference(line);
    var vipArrival = noteContains(line, ["arriv", "tomorrow", "tonight", "checking in", "due in"]);
    var extras = [];
    if (noteContains(line, ["champagne"])) extras.push("champagne amenity as noted");
    if (noteContains(line, ["water"])) extras.push("extra bottled water as noted");
    if (noteContains(line, ["quiet"])) extras.push("quiet room preference as noted");
    if (preference) {
      preference.split(/\s+and\s+/).forEach(function (part) {
        var p = String(part || "").trim();
        if (!p) return;
        var norm = p.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\bset up\b/g, "setup").trim();
        var already = extras.some(function (e) {
          var en = e.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\bset up\b/g, "setup").trim();
          return en.indexOf(norm.slice(0, 16)) !== -1 || norm.indexOf(en.slice(0, 16)) !== -1;
        });
        if (!already) extras.push(p);
      });
    }
    if (/twin/i.test(line) && !extras.some(function (e) { return /twin/i.test(e); })) {
      extras.push("twin set-up as requested");
    }

    var base;
    if (vipArrival) {
      if (extras.length) {
        base = "Front Office – Review VIP arrival" + (roomRef ? " " + roomRef : "") +
          " notes (" + extras.slice(0, 2).join("; ") + ") before arrival.";
      } else {
        base = "Front Office – Review VIP arrival" + (roomRef ? " " + roomRef : "") +
          " notes before arrival.";
      }
    } else {
      base = "Front Office – Review VIP notes" + (roomRef ? " for " + roomRef : "") +
        " for this shift.";
    }

    /* Enrich with Hotel Brain VIP guidance — never replace shift-note facts. */
    var guidance = findVipHotelBrainGuidance(brainContext);
    if (guidance.okAction) {
      return base + " Hotel Brain: " + guidance.okAction;
    }
    if (guidance.vipRules) {
      var snippet = firstGuidanceSentence(guidance.vipRules, 140);
      if (snippet) return base + " Hotel VIP rules: " + snippet + ".";
    }
    return base;
  }

  function nextShiftPhrase(shiftType) {
    if (shiftType === "night") return "before AM handover";
    if (shiftType === "am") return "before PM handover";
    return "this shift";
  }

  function ensureNoteFact(note) {
    if (!note) return null;
    if (note.fact) return note.fact;
    if (global.AiWritingEngine && global.AiWritingEngine.extractOperationalFact) {
      note.fact = global.AiWritingEngine.extractOperationalFact(note.original || "", {
        rooms: note.rooms,
        section: note.section,
        isVip: note.isVip
      });
      return note.fact;
    }
    return null;
  }

  function isFactClosedForRecs(fact) {
    if (!fact) return false;
    if (global.AiWritingEngine && global.AiWritingEngine.isFactClosed) {
      return global.AiWritingEngine.isFactClosed(fact);
    }
    return fact.status === "done" || fact.status === "confirmed";
  }

  function roomRefFromFact(fact, note) {
    if (fact && fact.rooms && fact.rooms.length === 1) return "Room " + fact.rooms[0];
    if (fact && fact.rooms && fact.rooms.length > 1) return "Rooms " + fact.rooms.join(", ");
    return roomPhrase(note);
  }

  /**
   * Build a recommendation strictly from structured fact fields + original sourceText.
   * Returns null when facts are insufficient (omit rather than invent).
   */
  function recommendationFromFact(fact, note, departments, fallbackDept, shiftType) {
    if (!fact || isFactClosedForRecs(fact)) return null;

    var src = fact.sourceText || note.original || "";
    var dept = fact.ownerDept || ownerDepartmentForIssue(note, departments, fallbackDept);
    if (!dept) return null;

    var roomRef = roomRefFromFact(fact, note);
    var subject = fact.subject || "";
    var verb = fact.actionVerb || "";
    var priority = note.section === "urgent" || note.maintenancePriority === "Critical"
      ? "urgent"
      : (note.maintenancePriority === "High" || note.isVip || subject === "vip_arrival" ? "high" : "normal");

    if (subject === "outstanding_balance" || subject === "payment" || subject === "invoice" ||
        subject === "bill" || subject === "folio" || subject === "account" || subject === "charge" ||
        verb === "settle") {
      if (!roomRef && !/\b(balance|payment|folio|invoice|bill)\b/i.test(src)) return null;
      return {
        text: "Settle the outstanding balance" + (roomRef ? " for " + roomRef : "") + " before departure.",
        priority: priority === "urgent" ? "urgent" : "high",
        department: resolveDepartment([dept, "Reception", "Front Office"], "Reception", departments)
      };
    }

    if (subject === "maintenance" || (verb === "follow_up" && /maintenance/i.test(fact.actionTarget || dept))) {
      if (!roomRef && !(fact.rooms && fact.rooms.length)) return null;
      var roomsLabel = roomRef;
      if (fact.rooms && fact.rooms.length > 1) {
        roomsLabel = "Rooms " + fact.rooms.join(", ").replace(/, ([^,]+)$/, " and $1");
      }
      return {
        text: "Follow up the reported maintenance issues in " + (roomsLabel || roomRef) + ".",
        priority: priority,
        department: resolveDepartment([dept, "Maintenance", "Engineering"], "Maintenance", departments)
      };
    }

    if (subject === "twin_setup") {
      if (!roomRef) return null;
      var twinDate = "";
      (fact.details || []).forEach(function (d) {
        if (d && d.type === "date") twinDate = d.value;
      });
      if (!twinDate && fact.arrivalDate) twinDate = fact.arrivalDate;
      var twinText = "Prepare " + roomRef + " with twin beds";
      if (twinDate) {
        twinText += " before arrival on " + twinDate.replace(
          /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/,
          function (_, d, m) {
            var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
            return d + " " + (months[parseInt(m, 10) - 1] || m);
          }
        );
      } else {
        twinText += " before arrival";
      }
      twinText += ".";
      return {
        text: twinText,
        priority: "high",
        department: resolveDepartment([dept, "Housekeeping", "Reception"], "Housekeeping", departments)
      };
    }

    if (subject === "vip_arrival" || (note.isVip && subject !== "reservation_info" && subject !== "guest_arrangement")) {
      if (!roomRef && !/\bvip\b/i.test(src)) return null;
      var pref = extractGuestPreference(src);
      var vipText = "Prepare" + (roomRef ? " " + roomRef : "") + " for VIP arrival";
      if (pref) vipText += " (" + pref + ")";
      vipText += ".";
      return {
        text: vipText,
        priority: "high",
        department: resolveDepartment([dept, "Reception", "Front Office", "Duty Manager"], "Reception", departments)
      };
    }

    if (subject === "reservation_info" || subject === "guest_arrangement") {
      /* Informational / confirmed arrangements — no chase recommendation */
      return null;
    }

    if (subject === "late_checkout") {
      /* Confirmed late COs are closed; requested ones need confirmation — only if still open/requested. */
      if (fact.status === "requested" || fact.status === "open" || fact.status === "unknown") {
        return {
          text: "Confirm the late check-out" + (roomRef ? " for " + roomRef : "") +
            " and advise Housekeeping of the release time.",
          priority: "high",
          department: resolveDepartment([dept, "Housekeeping", "Reception"], "Housekeeping", departments)
        };
      }
      return null;
    }

    if (subject === "wake_up") {
      if (fact.status === "confirmed" || fact.status === "done") return null;
      var timeMatch = src.match(/\b(\d{1,2}[:.]\d{2})\b/);
      return {
        text: "Confirm that the" + (timeMatch ? " " + timeMatch[1].replace(".", ":") : "") +
          " wake-up call" + (roomRef ? " for " + roomRef : "") + " is loaded.",
        priority: "normal",
        department: resolveDepartment([dept, "Reception", "Front Office"], "Reception", departments)
      };
    }

    if (subject === "guest_request" || verb === "arrange") {
      return {
        text: "Arrange the guest request" + (roomRef ? " for " + roomRef : "") + " as recorded.",
        priority: "normal",
        department: resolveDepartment([dept, "Housekeeping", "Reception"], dept, departments)
      };
    }

    if (subject === "delivery" || verb === "contact") {
      return {
        text: "Contact the guest regarding the held delivery" +
          (roomRef ? " for " + roomRef : "") + ".",
        priority: "normal",
        department: resolveDepartment([dept, "Reception"], "Reception", departments)
      };
    }

    if (subject === "room_move" && (fact.status === "requested" || fact.status === "open" || verb)) {
      var dest = "";
      (fact.details || []).forEach(function (d) {
        if (d && d.type === "destination_room") dest = d.value;
      });
      var floor = fact.preferredLocation || "";
      if (fact.uncertainty || fact.confirmationStatus === "not confirmed" || /maybe|possible/i.test(src)) {
        return {
          text: "Confirm whether the guest" + (roomRef ? " in " + roomRef : "") +
            " would like to move" +
            (floor ? " to the " + floor : (dest ? " to Room " + dest : "")) + ".",
          priority: "high",
          department: resolveDepartment([dept, "Reception", "Front Office"], "Reception", departments)
        };
      }
      return {
        text: "Action the room move request" +
          (roomRef ? " for " + roomRef : "") +
          (dest ? " to Room " + dest : (floor ? " to the " + floor : "")) + ".",
        priority: "high",
        department: resolveDepartment([dept, "Reception", "Front Office"], "Reception", departments)
      };
    }

    if (verb === "follow_up" && fact.actionTarget) {
      var target = fact.ownerDept || departmentFromTargetSafe(fact.actionTarget);
      return {
        text: "Follow up" + (roomRef ? " on " + roomRef : "") +
          (subject && subject !== "follow_up" ? " regarding " + subject.replace(/_/g, " ") : "") + ".",
        priority: priority,
        department: resolveDepartment([target, dept], target || fallbackDept, departments)
      };
    }

    /* Insufficient structured fields — omit rather than invent. */
    return null;
  }

  function departmentFromTargetSafe(target) {
    var t = String(target || "").toLowerCase();
    if (t.indexOf("maintenance") !== -1) return "Maintenance";
    if (t.indexOf("housekeeping") !== -1) return "Housekeeping";
    if (t.indexOf("reception") !== -1) return "Reception";
    if (t.indexOf("concierge") !== -1) return "Concierge";
    return capitalizeWord(t.split(/\s+/)[0] || "Reception");
  }

  function capitalizeWord(str) {
    var s = String(str || "");
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function generateRecommendations(input, signals) {
    var classified = input.classified || {};
    var analyzed = (classified._analyzed || input.analyzedNotes || []).slice();
    var brainContext = input.brainContext || null;
    var departments = applyBrainDepartmentDefaults(brainContext, input.departments || []);
    var fallbackDept = input.selectedDepartment || resolveDepartment(["Reception", "Front Office"], "Reception", departments);
    var shiftType = signals.shiftType;
    var applyText = typeof input.applyTextPreferences === "function"
      ? input.applyTextPreferences
      : function (text) { return text; };

    if (signals.isQuietShift) return [];

    var candidates = [];
    var seen = {};
    var seenIssue = {};
    var closedRooms = {};

    analyzed.forEach(function (note) {
      var fact = ensureNoteFact(note);
      if (fact && isFactClosedForRecs(fact) && fact.rooms) {
        fact.rooms.forEach(function (room) {
          closedRooms[String(room) + "|" + (fact.subject || "")] = true;
        });
      }
    });

    function addCandidate(rec) {
      if (!rec || !rec.text) return;
      var signature = recommendationSignature(rec.text);
      if (seen[signature]) return;
      var issueSig = signature.replace(/\b(confirm|settle|attend|action|prepare|prioritise|review|notify)\b/g, "").trim();
      if (issueSig && seenIssue[issueSig]) return;
      seen[signature] = true;
      if (issueSig) seenIssue[issueSig] = true;
      candidates.push(normalizeRecommendation(rec, fallbackDept));
    }

    analyzed.forEach(function (note) {
      if (isResolvedNote(note.original)) return;
      var fact = ensureNoteFact(note);
      if (fact && isFactClosedForRecs(fact)) return;

      var fromFact = recommendationFromFact(fact, note, departments, fallbackDept, shiftType);
      if (fromFact) {
        if (note._neutralFactId) {
          fromFact.sourceFactIds = [note._neutralFactId];
          fromFact.sourceTypes = [note._neutralSourceType || "handover"];
          fromFact.reasonCode = "fact_rule";
        }
        addCandidate(fromFact);
        return;
      }

      /* Phase 2A: do not invent from rewritten display or legacy templates when facts are thin. */
    });

    if (global.HotelProfileOperational && brainContext) {
      var okMatched = global.HotelProfileOperational.getShiftIntelligenceKnowledge(
        brainContext,
        shiftType,
        input.rawNotesText || ""
      );
      (okMatched.matchedActions || []).forEach(function (action) {
        if (!action || !action.followUpInstruction) return;
        if (/vip/i.test(action.category || "") || /vip/i.test(action.title || "")) return;
        var actionText = action.actionText || action.followUpInstruction;
        /* Skip brain actions that chase closed financial/settlement facts. */
        var contradictsClosed = analyzed.some(function (note) {
          var fact = note.fact;
          if (!fact || !isFactClosedForRecs(fact)) return false;
          if (!/settled|balance|payment/i.test(fact.subject || fact.sourceText || "")) return false;
          return /settle|balance|payment|outstanding/i.test(actionText);
        });
        if (contradictsClosed) return;
        addCandidate({
          text: actionText,
          priority: action.priority || "normal",
          department: resolveDepartment([action.department], fallbackDept, departments)
        });
      });
      global.HotelProfileOperational.getRoomAttributeReminders(
        brainContext,
        input.rawNotesText || ""
      ).forEach(function (rec) {
        if (!rec || !rec.text) return;
        var roomHit = String(rec.text).match(/\broom\s+(\d+[a-z]?)/i);
        if (roomHit && closedRooms[roomHit[1] + "|outstanding_balance"]) return;
        addCandidate(rec);
      });
    }

    candidates.sort(function (a, b) {
      var rankA = PRIORITY_RANK[a.priority] != null ? PRIORITY_RANK[a.priority] : 9;
      var rankB = PRIORITY_RANK[b.priority] != null ? PRIORITY_RANK[b.priority] : 9;
      return rankA - rankB;
    });

    return candidates.slice(0, MAX_RECOMMENDATIONS).map(function (rec) {
      rec.text = applyText(rec.text);
      return rec;
    });
  }

  function defineChecklistItem(config) {
    return config;
  }

  var CHECKLIST_DEFINITIONS = [
    defineChecklistItem({
      id: "end_of_day",
      text: "End of Day completed",
      category: "Finance",
      department: ["Night Team", "Reception", "Duty Manager"],
      priority: "high",
      shifts: { night: 10, am: 0, pm: 0 },
      relevant: function (signals) { return signals.shiftType === "night"; }
    }),
    defineChecklistItem({
      id: "pm_accounts",
      text: "PM Accounts completed",
      category: "Finance",
      department: ["Night Team", "Reception", "Duty Manager"],
      priority: "high",
      shifts: { night: 10, am: 0, pm: 1 },
      relevant: function (signals) { return signals.shiftType === "night" || signals.shiftType === "pm"; }
    }),
    defineChecklistItem({
      id: "night_audit",
      text: "Night Audit completed",
      category: "Finance",
      department: ["Night Team", "Duty Manager"],
      priority: "high",
      shifts: { night: 10, am: 0, pm: 0 },
      relevant: function (signals) { return signals.shiftType === "night"; }
    }),
    defineChecklistItem({
      id: "remaining_arrivals",
      text: "Remaining arrivals checked",
      category: "Front Office",
      department: ["Reception", "Front Office", "Night Team"],
      priority: "high",
      shifts: { night: 8, am: 6, pm: 7 },
      relevant: function (signals) {
        return signals.hasRemainingArrivals || signals.hasArrivals ||
          (signals.shiftType === "night" && signals.metrics && signals.metrics.display &&
            signals.metrics.display.guest > 0);
      }
    }),
    defineChecklistItem({
      id: "wake_up_calls",
      text: "Wake-up calls reviewed",
      category: "Guest Services",
      department: ["Reception", "Front Office"],
      priority: "high",
      shifts: { night: 7, am: 9, pm: 2 },
      relevant: function (signals) {
        return signals.hasWakeUpCalls || signals.shiftType === "am" || signals.shiftType === "night";
      }
    }),
    defineChecklistItem({
      id: "airport_transfers",
      text: "Airport transfers confirmed",
      category: "Guest Services",
      department: ["Concierge", "Front Office", "Reception"],
      priority: "normal",
      shifts: { night: 6, am: 7, pm: 6 },
      relevant: function (signals) { return signals.hasAirportTransfers || signals.hasTransfers; }
    }),
    defineChecklistItem({
      id: "registration_cards",
      text: "Registration cards prepared",
      category: "Front Office",
      department: ["Reception", "Front Office"],
      priority: "normal",
      shifts: { night: 6, am: 5, pm: 6 },
      relevant: function (signals) {
        return signals.hasRegistrationCards || signals.hasArrivals ||
          signals.shiftType === "night" || signals.shiftType === "pm";
      }
    }),
    defineChecklistItem({
      id: "welcome_cards_vip",
      text: "Welcome cards completed for VIP arrivals",
      category: "Guest Services",
      department: ["Reception", "Duty Manager", "Front Office"],
      priority: "high",
      shifts: { night: 8, am: 7, pm: 7 },
      relevant: function (signals) { return signals.hasVipArrival; }
    }),
    defineChecklistItem({
      id: "vip_arrivals_reviewed",
      text: "VIP arrivals reviewed",
      category: "Guest Services",
      department: ["Duty Manager", "Front Office", "Reception"],
      priority: "high",
      shifts: { night: 7, am: 6, pm: 8 },
      relevant: function (signals) { return signals.hasVip || signals.hasVipArrival; }
    }),
    defineChecklistItem({
      id: "outstanding_balances",
      text: "Outstanding balances reviewed",
      category: "Finance",
      department: ["Reception", "Front Office", "Duty Manager"],
      priority: "high",
      shifts: { night: 7, am: 5, pm: 8 },
      relevant: function (signals) { return signals.hasOpenBalances; }
    }),
    defineChecklistItem({
      id: "payment_followups",
      text: "Payment / OTA follow-ups reviewed",
      category: "Finance",
      department: ["Reception", "Front Office", "Duty Manager"],
      priority: "high",
      shifts: { night: 6, am: 5, pm: 7 },
      relevant: function (signals) {
        return signals.hasPayments && !signals.hasOpenBalances;
      }
    }),
    defineChecklistItem({
      id: "room_allocations",
      text: "Room allocations completed",
      category: "Front Office",
      department: ["Reception", "Front Office", "Duty Manager"],
      priority: "normal",
      shifts: { night: 6, am: 5, pm: 7 },
      relevant: function (signals) {
        return signals.hasRoomAllocation || signals.hasArrivals || signals.shiftType === "night";
      }
    }),
    defineChecklistItem({
      id: "housekeeping_release",
      text: "Housekeeping release reviewed",
      category: "Housekeeping",
      department: ["Housekeeping", "Reception"],
      priority: "high",
      shifts: { night: 5, am: 8, pm: 6 },
      relevant: function (signals) {
        return signals.hasHousekeepingRelease || signals.hasLateCheckout ||
          signals.shiftType === "am" || (signals.metrics.maintenance || 0) > 0;
      }
    }),
    defineChecklistItem({
      id: "lost_property",
      text: "Lost property checked and logged",
      category: "Guest Services",
      department: ["Front Office", "Reception"],
      priority: "normal",
      shifts: { night: 5, am: 4, pm: 4 },
      relevant: function (signals) { return signals.hasLostProperty; }
    }),
    defineChecklistItem({
      id: "physical_keys",
      text: "Physical keys accounted for",
      category: "Security",
      department: ["Front Office", "Reception", "Duty Manager"],
      priority: "high",
      shifts: { night: 7, am: 4, pm: 5 },
      relevant: function (signals) { return signals.hasPhysicalKeys || signals.shiftType === "night"; }
    }),
    defineChecklistItem({
      id: "maintenance_followups",
      text: "Maintenance follow-ups reviewed",
      category: "Maintenance",
      department: ["Maintenance", "Duty Manager", "Reception"],
      priority: "high",
      shifts: { night: 6, am: 6, pm: 6 },
      relevant: function (signals) { return signals.hasMaintenance; }
    }),
    defineChecklistItem({
      id: "packages_prepared",
      text: "Guest packages prepared",
      category: "Guest Services",
      department: ["Front Office", "Concierge", "Reception"],
      priority: "normal",
      shifts: { night: 4, am: 5, pm: 5 },
      relevant: function (signals) { return signals.hasPackages; }
    }),
    defineChecklistItem({
      id: "guest_requests",
      text: "Guest requests reviewed",
      category: "Guest Services",
      department: ["Reception", "Front Office"],
      priority: "normal",
      shifts: { night: 5, am: 6, pm: 7 },
      relevant: function (signals) { return signals.hasGuestRequests || (signals.metrics.tasks || 0) > 0; }
    }),
    defineChecklistItem({
      id: "reports_printed",
      text: "Reports printed",
      category: "Operations",
      department: ["Night Team", "Duty Manager", "Management"],
      priority: "normal",
      shifts: { night: 8, am: 4, pm: 3 },
      relevant: function (signals) { return signals.shiftType === "night"; }
    }),
    defineChecklistItem({
      id: "daily_line_up",
      text: "Daily Line Up prepared",
      category: "Operations",
      department: ["Duty Manager", "Management", "Reception"],
      priority: "high",
      shifts: { night: 7, am: 8, pm: 4 },
      relevant: function (signals) { return signals.shiftType === "night" || signals.shiftType === "am"; }
    }),
    defineChecklistItem({
      id: "late_checkouts",
      text: "Late check-outs reviewed with Housekeeping",
      category: "Front Office",
      department: ["Reception", "Housekeeping"],
      priority: "high",
      shifts: { night: 4, am: 9, pm: 5 },
      relevant: function (signals) { return signals.hasLateCheckout || signals.shiftType === "am"; }
    }),
    defineChecklistItem({
      id: "breakfast_service",
      text: "Breakfast service handover reviewed",
      category: "Food & Beverage",
      department: ["Food & Beverage", "Reception"],
      priority: "normal",
      shifts: { night: 0, am: 8, pm: 0 },
      relevant: function (signals) { return signals.shiftType === "am"; }
    }),
    defineChecklistItem({
      id: "todays_arrivals",
      text: "Today's arrivals reviewed",
      category: "Front Office",
      department: ["Reception", "Front Office"],
      priority: "high",
      shifts: { night: 4, am: 7, pm: 9 },
      relevant: function (signals) {
        return signals.hasArrivals || signals.shiftType === "pm" || signals.shiftType === "am";
      }
    }),
    defineChecklistItem({
      id: "late_arrivals",
      text: "Late arrivals and no-shows reviewed",
      category: "Front Office",
      department: ["Reception", "Night Team", "Duty Manager"],
      priority: "normal",
      shifts: { night: 6, am: 3, pm: 7 },
      relevant: function (signals) {
        return signals.shiftType === "pm" || signals.shiftType === "night" || signals.hasArrivals;
      }
    }),
    defineChecklistItem({
      id: "opera_workflow",
      text: "Opera workflow steps completed",
      category: "Systems",
      department: ["Reception", "Night Team"],
      priority: "normal",
      shifts: { night: 5, am: 3, pm: 4 },
      relevant: function (signals) { return signals.usesOpera; }
    }),
    defineChecklistItem({
      id: "inventory_shortage",
      text: "Inventory shortages reviewed",
      category: "Operations",
      department: ["Housekeeping", "Duty Manager", "Reception"],
      priority: "normal",
      shifts: { night: 3, am: 4, pm: 4 },
      relevant: function (signals) { return signals.hasInventoryShortage; }
    }),
    defineChecklistItem({
      id: "guest_complaints",
      text: "Guest complaints reviewed and escalated where required",
      category: "Guest Services",
      department: ["Duty Manager", "Front Office"],
      priority: "high",
      shifts: { night: 5, am: 5, pm: 6 },
      relevant: function (signals) { return signals.hasComplaints; }
    }),
    defineChecklistItem({
      id: "shift_handover_ready",
      text: "Shift handover ready",
      category: "Operations",
      department: ["Reception", "Duty Manager"],
      priority: "high",
      shifts: { night: 9, am: 8, pm: 8 },
      relevant: function () { return true; }
    }),
    defineChecklistItem({
      id: "hotel_standards",
      text: "Hotel standards checklist reviewed",
      category: "Standards",
      department: ["Duty Manager", "Management"],
      priority: "normal",
      shifts: { night: 4, am: 4, pm: 4 },
      relevant: function (signals) { return signals.hasHotelStandards && signals.brainConfigured; }
    })
  ];

  function recommendationSignature(text) {
    return String(text || "").toLowerCase()
      .replace(/room\s+\d+[a-z]?/gi, "room")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isDuplicatedByRecommendation(checkText, recommendations) {
    var normalizedCheck = recommendationSignature(checkText);
    return (recommendations || []).some(function (rec) {
      var recSig = recommendationSignature(rec.text);
      if (recSig.indexOf(normalizedCheck) !== -1 || normalizedCheck.indexOf(recSig) !== -1) return true;
      var checkWords = normalizedCheck.split(" ");
      var matchCount = 0;
      checkWords.forEach(function (word) {
        if (word.length > 4 && recSig.indexOf(word) !== -1) matchCount += 1;
      });
      return matchCount >= 3;
    });
  }

  function generateChecklist(input, signals, recommendations) {
    var brainContext = input.brainContext || null;
    var departments = applyBrainDepartmentDefaults(brainContext, input.departments || []);
    var fallbackDept = input.selectedDepartment || resolveDepartment(["Reception"], "Reception", departments);
    var shiftType = signals.shiftType;
    var applyText = typeof input.applyTextPreferences === "function"
      ? input.applyTextPreferences
      : function (text) { return text; };

    var scored = [];
    var seenTexts = {};

    function registerText(text) {
      var sig = recommendationSignature(text);
      if (seenTexts[sig]) return false;
      seenTexts[sig] = true;
      return true;
    }

    if (global.HotelProfileOperational && brainContext) {
      var hotelKnowledge = global.HotelProfileOperational.getShiftIntelligenceKnowledge(
        brainContext,
        shiftType,
        input.rawNotesText || ""
      );
      (hotelKnowledge.checklistItems || []).forEach(function (item, index) {
        var text = applyText(item.text);
        if (!registerText(text)) return;
        if (isDuplicatedByRecommendation(text, recommendations)) return;
        scored.push({
          hotel: true,
          sourceId: item.sourceId,
          text: text,
          category: item.category || "Operations",
          department: item.department || fallbackDept,
          priority: item.priority || "normal",
          score: 120 - index
        });
      });
    }

    CHECKLIST_DEFINITIONS.forEach(function (def) {
      if (typeof def.relevant === "function" && !def.relevant(signals, input)) return;

      var shiftScore = (def.shifts && def.shifts[shiftType]) || 0;
      if (shiftScore <= 0 && def.id !== "shift_handover_ready") return;

      var itemText = def.text;
      if (!registerText(itemText)) return;
      if (isDuplicatedByRecommendation(itemText, recommendations)) return;

      scored.push({
        def: def,
        score: shiftScore + (def.priority === "high" ? 2 : 0)
      });
    });

    scored.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      var rankA = PRIORITY_RANK[a.priority || (a.def && a.def.priority)] != null
        ? PRIORITY_RANK[a.priority || a.def.priority] : 9;
      var rankB = PRIORITY_RANK[b.priority || (b.def && b.def.priority)] != null
        ? PRIORITY_RANK[b.priority || b.def.priority] : 9;
      return rankA - rankB;
    });

    return scored.slice(0, MAX_CHECKLIST_ITEMS).map(function (entry) {
      if (entry.hotel) {
        return normalizeChecklistItem({
          id: entry.sourceId || createId(),
          text: entry.text,
          category: entry.category,
          department: resolveDepartment([entry.department], fallbackDept, departments),
          priority: entry.priority,
          status: CHECKLIST_STATUS.pending
        }, fallbackDept);
      }
      var def = entry.def;
      return normalizeChecklistItem({
        id: def.id,
        text: applyText(def.text),
        category: def.category,
        department: resolveDepartment(def.department, fallbackDept, departments),
        priority: def.priority,
        status: CHECKLIST_STATUS.pending
      }, fallbackDept);
    });
  }

  function stampNeutralIdsOnNotes(analyzed, facts) {
    (analyzed || []).forEach(function (note, index) {
      if (!note || !facts[index]) return;
      note._neutralFactId = facts[index].id;
      note._neutralSourceType = facts[index].sourceType || "handover";
    });
  }

  function analyzeCore(input, facts) {
    var signals = buildSignals(input);
    var recommendations = generateRecommendations(input, signals);
    var checklist = generateChecklist(input, signals, recommendations);
    return {
      engineVersion: ENGINE_VERSION,
      signals: signals,
      recommendations: recommendations,
      checklist: checklist,
      facts: facts || []
    };
  }

  /**
   * Neutral-fact entry point (Phase 16B).
   * Accepts { facts, brainContext, shiftCode, departments, hotelSnapshot, rawNotesText, ... }.
   * Converts facts to analyzed-note shape and reuses existing recommendation rules.
   */
  function analyzeFacts(input) {
    input = input || {};
    var facts = (input.facts || []).map(function (f) { return ensureNeutralFact(f); });
    var notes = facts.map(neutralFactToAnalyzedNote);
    stampNeutralIdsOnNotes(notes, facts);

    var rawNotesText = input.rawNotesText;
    if (!trimText(rawNotesText)) {
      rawNotesText = facts.map(function (f) { return f.sourceText || f.detail || ""; })
        .filter(Boolean)
        .join("\n");
    }

    var legacyInput = {
      shiftCode: input.shiftCode,
      shiftDisplayName: input.shiftDisplayName,
      rawNotesText: rawNotesText,
      classified: Object.assign({}, input.classified || {}, { _analyzed: notes }),
      analyzedNotes: notes,
      metrics: input.metrics || (input.classified && input.classified._metrics) || {},
      brainContext: input.brainContext || null,
      departments: input.departments || [],
      selectedDepartment: input.selectedDepartment,
      hotelSnapshot: input.hotelSnapshot || {},
      applyTextPreferences: input.applyTextPreferences,
      workspaceId: input.workspaceId,
      facts: facts
    };

    return analyzeCore(legacyInput, facts);
  }

  /**
   * Primary public API — preserves Handover compatibility.
   * Adapts analyzed notes → neutral facts internally, then runs existing logic.
   * If only neutral facts are supplied (no analyzed notes), delegates to analyzeFacts.
   */
  function analyze(input) {
    input = input || {};
    var analyzed = (input.classified && input.classified._analyzed) || input.analyzedNotes || [];
    var hasAnalyzed = analyzed && analyzed.length;
    var hasFacts = input.facts && input.facts.length;

    if (!hasAnalyzed && hasFacts) {
      return analyzeFacts(input);
    }

    var facts = factsFromHandoverAnalyzedNotes(analyzed, {
      workspaceId: input.workspaceId || ""
    });
    stampNeutralIdsOnNotes(analyzed, facts);
    return analyzeCore(input, facts);
  }

  global.ShiftIntelligenceEngine = {
    VERSION: ENGINE_VERSION,
    analyze: analyze,
    analyzeFacts: analyzeFacts,
    buildSignals: buildSignals,
    generateRecommendations: function (input) {
      var signals = buildSignals(input);
      return generateRecommendations(input, signals);
    },
    generateChecklist: function (input) {
      var signals = buildSignals(input);
      var recommendations = generateRecommendations(input, signals);
      return generateChecklist(input, signals, recommendations);
    },
    normalizeChecklistItem: normalizeChecklistItem,
    normalizeShiftType: normalizeShiftType,
    CHECKLIST_STATUS: CHECKLIST_STATUS,
    /* Phase 16B foundation surface */
    NEUTRAL_FACT_FIELDS: NEUTRAL_FACT_FIELDS,
    createEmptyNeutralFact: createEmptyNeutralFact,
    ensureNeutralFact: ensureNeutralFact,
    normalizePriority: normalizePriority,
    normalizeRoomNumber: normalizeRoomNumber,
    toRecommendationPriority: toRecommendationPriority,
    priorityRankValue: priorityRankValue,
    isResolvedStatus: isResolvedStatus,
    createSourceIdentity: createSourceIdentity,
    buildNeutralFactId: buildNeutralFactId,
    factsFromHandoverAnalyzedNotes: factsFromHandoverAnalyzedNotes,
    handoverNoteToNeutralFact: handoverNoteToNeutralFact,
    factsFromMaintenanceIssues: factsFromMaintenanceIssues,
    maintenanceIssueToNeutralFact: maintenanceIssueToNeutralFact,
    filterMaintenanceIssuesForHandover: filterMaintenanceIssuesForHandover,
    dedupeMaintenanceFactsAgainstHandover: dedupeMaintenanceFactsAgainstHandover,
    maintenanceFactDuplicatesHandoverFact: maintenanceFactDuplicatesHandoverFact,
    neutralFactToAnalyzedNote: neutralFactToAnalyzedNote
  };

  /** @deprecated Use ShiftIntelligenceEngine.analyze — kept for backwards compatibility */
  global.HandoverRecommendationEngine = {
    generate: function (classified, rawNotesText, brainContext) {
      return ShiftIntelligenceEngine.generateRecommendations({
        classified: classified,
        rawNotesText: rawNotesText,
        brainContext: brainContext,
        shiftCode: "",
        shiftDisplayName: "",
        departments: brainContext && brainContext.departments ? brainContext.departments.map(function (d) {
          return typeof d === "string" ? d : (d.name || "");
        }) : []
      });
    }
  };
})(typeof window !== "undefined" ? window : this);
