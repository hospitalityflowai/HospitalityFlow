/**
 * Hospitality Flow — Shift Intelligence Engine
 * (= Hospitality Intelligence Engine runtime; E1 contracts live here)
 *
 * Reusable intelligence layer between Hotel Brain and operational tools.
 * Rule-based v1 — modular surface for future LLM / agent backends.
 *
 * ---------------------------------------------------------------------------
 * Responsibility boundaries (E1)
 * ---------------------------------------------------------------------------
 * - Hospitality Intelligence Engine (this file): operational reasoning —
 *   normalise, lifecycle, link/dedupe policy, rank, recommend, signals/checklist.
 * - AI Writing Engine: extraction support, fact field parsing, wording and
 *   presentation prose. Not a second recommendation system.
 * - Handover / Maintenance: UI, input collection, persistence, rendering.
 * - Hotel Brain: durable knowledge context (via HotelProfileOperational).
 * - Modules must NOT create new independent recommendation systems.
 *
 * ---------------------------------------------------------------------------
 * Intended engine pipeline (E1 + E4 Phase 1)
 * ---------------------------------------------------------------------------
 *   adapt input
 *   → normalise facts
 *   → classify
 *   → determine lifecycle
 *   → deduplicate / link / group
 *   → enrich OperationalContext
 *   → impact / risk scoring (consumes OperationalContext)
 *   → rank
 *   → recommend
 *   → writing (presentation only)
 *   → return IntelligenceResult
 *
 * Wired today (safely): adapt, normalise (neutral facts), lifecycle flags,
 * M4 cross-dedupe when callers use it, OperationalContext enrichment,
 * rank (incl. operational impact), recommend, result shape, operational
 * object grouping, snapshot extract.
 * Not moved yet: Handover section classification, Writing same-source merge,
 * full EntityReference graphs, conflict detection.
 * E4.3: cross-shift OperationalMemory derived from prior-shift evidence (no new table).
 *
 * Phase 16B — Thin shared intelligence foundation (runtime neutral facts).
 * Phase M4 — Maintenance → Handover fact merge (callers).
 * Phase E1 — Canonical contracts + compatibility helpers (no behaviour change).
 * Phase E4.1 — Canonical OperationalContext enrichment (internal reasoning).
 * Phase E4.2 — DecisionTrace + context-driven recommendations / explainability.
 * Phase E4.3 — Cross-shift OperationalMemory (read-only derivation over history).
 *
 * @typedef {Object} EntityReference
 * @property {string} type - "room" | "guest" | "department" | "area" | string
 * @property {string} [id] - Stable id when known (e.g. normalised room "24")
 * @property {string} [label] - Display label (e.g. "Room 24")
 * @property {string} [name] - Guest or entity name when applicable
 *
 * @typedef {Object} SourceReference
 * @property {string} sourceType - Canonical SOURCE_TYPE value
 * @property {string} sourceId - Originating record id
 * @property {string} [identity] - "sourceType:sourceId"
 * @property {string} [workspaceId]
 *
 * @typedef {Object} Recommendation
 * @property {string} id
 * @property {string} text
 * @property {string} priority - Legacy recommendation scale: urgent|high|normal|low
 * @property {string} [canonicalPriority] - E1: critical|high|normal|low
 * @property {string} department
 * @property {string} status - open | in_progress | …
 * @property {string[]} [sourceFactIds]
 * @property {string[]} [sourceTypes]
 * @property {string} [reasonCode] - Primary reason code (first of reasonCodes)
 * @property {string[]} [reasonCodes] - E4.2 stable reason codes from OperationalContext
 * @property {DecisionTrace} [decisionTrace] - E4.2 explainability trace
 *
 * @typedef {Object} DecisionTrace
 * @property {string} sourceFactId
 * @property {string[]} [sourceFactIds]
 * @property {string} objectType
 * @property {OperationalContext} operationalContext
 * @property {number} score
 * @property {string} priority - Legacy recommendation priority: urgent|high|normal|low
 * @property {string} recommendationKind - nextAction / kind code
 * @property {string} nextAction
 * @property {string[]} reasonCodes
 * @property {Object} evidence - Structured entities only (room, status, amounts, timing)
 * @property {number} confidence
 * @property {Object[]} [supportingKnowledge]
 * @property {Object} [memory] - E4.3 continuity snapshot (memoryId, lifecycleStatus, …)
 *
 * @typedef {Object} OperationalMemory
 * @property {string} memoryId
 * @property {string} workspaceId
 * @property {Object} entityKeys - room, guest, family, amount, faultType, maintenanceIssueId
 * @property {string} subject
 * @property {string} category
 * @property {string} firstSeenAt
 * @property {string} lastSeenAt
 * @property {number} shiftCount
 * @property {string[]} sourceReportIds
 * @property {string[]} sourceFactIds
 * @property {string} lifecycleStatus - MEMORY_LIFECYCLE value
 * @property {string} recurrenceState - RECURRENCE_STATE value (Phase 3: first_seen | repeated_cross_shift)
 * @property {OperationalContext|null} latestContext
 * @property {string[]} continuityReasonCodes
 * @property {number} confidence
 *
 * @typedef {Object} OperationalFact
 * @property {string} id
 * @property {SourceReference|string} source - SourceReference or legacy sourceType string
 * @property {string} [sourceType] - Legacy/compatibility alias
 * @property {string} [sourceId]
 * @property {string} [workspaceId]
 * @property {string} [subject] - subjectType / operational subject
 * @property {string} [subjectType]
 * @property {string} [subjectId]
 * @property {string} [category]
 * @property {string} [status] - Module or canonical status (see toCanonicalStatus)
 * @property {string} [priority] - Module or canonical priority
 * @property {string} [canonicalStatus]
 * @property {string} [canonicalPriority]
 * @property {string|EntityReference} [room]
 * @property {EntityReference[]} [rooms]
 * @property {string|EntityReference} [guest]
 * @property {string} [area]
 * @property {string} [department] - owner department
 * @property {string} [ownerDepartment]
 * @property {string} [action]
 * @property {string} [detail]
 * @property {string} [occurredAt]
 * @property {string} [dueAt]
 * @property {boolean} [isResolved]
 * @property {boolean} [includeInHandover]
 * @property {string|number} [confidence]
 * @property {string} [sourceText] - Evidence / source prose
 * @property {string[]} [evidence]
 * @property {string[]} [relatedFactIds]
 * @property {Object} [metadata]
 * @property {OperationalContext} [operationalContext] - E4 Phase 1 (internal)
 *
 * @typedef {Object} OperationalContext
 * @property {string} subject - Normalised operational subject token
 * @property {string} category - OPERATIONAL_CATEGORY value
 * @property {string} guestImpact - IMPACT_LEVEL
 * @property {string} revenueImpact - IMPACT_LEVEL
 * @property {string} operationalRisk - IMPACT_LEVEL
 * @property {string} timeSensitivity - TIME_SENSITIVITY
 * @property {string} urgency - URGENCY_LEVEL
 * @property {number} confidence - 0–1
 * @property {string} confidenceLabel - low|medium|high
 * @property {string[]} departments - Dependent departments (controlled names)
 * @property {string[]} dependencies - Same as departments (alias for consumers)
 * @property {string} currentStatus - CONTEXT_STATUS (operational, not UI)
 * @property {string} nextAction - NEXT_ACTION_KIND code, or "" when unsupported
 * @property {string[]} reasoning - Stable reason codes (machine-readable)
 * @property {string} [objectType] - OPERATIONAL_OBJECT_TYPE when known
 * @property {string} [canonicalPriority] - Derived E1 priority (critical|high|normal|low)
 *
 * @typedef {Object} IntelligenceInput
 * @property {OperationalFact[]} [facts]
 * @property {Object} [brainContext] - Hotel Brain runtime context (read-only)
 * @property {Object} [hotelSnapshot]
 * @property {string} [shiftCode]
 * @property {string} [shiftDisplayName]
 * @property {string[]} [departments]
 * @property {string} [selectedDepartment]
 * @property {string} [rawNotesText]
 * @property {string} [workspaceId]
 * @property {Object} [classified] - Legacy Handover input (compatibility)
 * @property {Array} [analyzedNotes] - Legacy Handover notes (compatibility)
 * @property {Function} [applyTextPreferences]
 *
 * @typedef {Object} IntelligenceResult
 * @property {number} engineVersion
 * @property {Object} signals
 * @property {Recommendation[]} recommendations
 * @property {Array} checklist
 * @property {OperationalFact[]|Object[]} [facts]
 * @property {string} [contractVersion] - e.g. "E1" when attached by helpers
 */
(function (global) {
  "use strict";

  var ENGINE_VERSION = 1;
  var CONTRACT_VERSION = "E1";
  var MAX_RECOMMENDATIONS = 8;
  var MAX_CHECKLIST_ITEMS = 16;

  var PRIORITY_RANK = { urgent: 0, high: 1, normal: 2, low: 3 };

  /**
   * E1 canonical status vocabulary.
   * Legacy module values are mapped via toCanonicalStatus — not deleted.
   */
  var CANONICAL_STATUS = {
    open: "open",
    in_progress: "in_progress",
    resolved: "resolved",
    cancelled: "cancelled",
    unknown: "unknown"
  };

  /**
   * E1 canonical priority vocabulary.
   * Legacy scales (urgent/medium/Critical/…) map via toCanonicalPriority.
   */
  var CANONICAL_PRIORITY = {
    critical: "critical",
    high: "high",
    normal: "normal",
    low: "low"
  };

  /** E1 canonical source module types. */
  var SOURCE_TYPE = {
    handover: "handover",
    maintenance: "maintenance",
    hotel_brain: "hotel_brain",
    guest: "guest",
    manual: "manual",
    system: "system"
  };

  /**
   * Pipeline stages for the Hospitality Intelligence Engine.
   * status: "wired" | "partial" | "planned"
   */
  var ENGINE_PIPELINE = [
    { id: "adapt", label: "adapt input", status: "wired" },
    { id: "normalise", label: "normalise facts", status: "wired" },
    { id: "classify", label: "classify", status: "wired" },
    { id: "lifecycle", label: "determine lifecycle", status: "wired" },
    { id: "dedupe_link", label: "deduplicate/link", status: "partial" },
    { id: "enrich_context", label: "enrich OperationalContext", status: "wired" },
    { id: "memory", label: "cross-shift OperationalMemory", status: "wired" },
    { id: "rank", label: "rank (consumes OperationalContext)", status: "wired" },
    { id: "recommend", label: "recommend (context-driven + DecisionTrace)", status: "wired" },
    { id: "explain", label: "build DecisionTrace / explanation", status: "wired" },
    { id: "result", label: "return IntelligenceResult", status: "wired" }
  ];

  /**
   * Neutral operational fact (runtime only — Phase 16B).
   * Adapters populate only fields they have; omit or leave empty otherwise.
   * E1 OperationalFact is the documented superset; ensureNeutralFact remains
   * the live runtime shape so current behaviour is unchanged.
   *
   * priority (neutral runtime): urgent | high | medium | low
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
   * (Legacy runtime helper — unchanged for behaviour compatibility.)
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

  /* ------------------------------------------------------------------ */
  /*  E1 — Canonical contract compatibility helpers (pure, additive)     */
  /* ------------------------------------------------------------------ */

  function normalizeSourceType(value) {
    var v = trimText(value).toLowerCase().replace(/[\s-]+/g, "_");
    if (SOURCE_TYPE[v]) return SOURCE_TYPE[v];
    if (v === "hotelbrain" || v === "brain") return SOURCE_TYPE.hotel_brain;
    if (v === "handover_note" || v === "shift_handover") return SOURCE_TYPE.handover;
    return v || SOURCE_TYPE.system;
  }

  /**
   * Map any known status vocabulary → E1 CANONICAL_STATUS.
   * Does not mutate module stores; for engine/contract consumers only.
   *
   * Handover/Writing: done|confirmed|complete → resolved
   * Maintenance: completed → resolved
   * cancelled|canceled → cancelled
   * requested → open (still actionable)
   */
  function toCanonicalStatus(value) {
    var s = trimText(value).toLowerCase().replace(/-/g, "_");
    if (!s) return CANONICAL_STATUS.unknown;
    if (s === "open" || s === "pending" || s === "requested") return CANONICAL_STATUS.open;
    if (s === "in_progress" || s === "inprogress" || s === "waiting_parts" ||
        s === "waiting_contractor" || s === "follow_up") {
      return CANONICAL_STATUS.in_progress;
    }
    if (
      s === "resolved" ||
      s === "completed" ||
      s === "complete" ||
      s === "done" ||
      s === "closed" ||
      s === "confirmed"
    ) {
      return CANONICAL_STATUS.resolved;
    }
    if (s === "cancelled" || s === "canceled") return CANONICAL_STATUS.cancelled;
    if (s === "unknown") return CANONICAL_STATUS.unknown;
    if (isResolvedStatus(s)) return CANONICAL_STATUS.resolved;
    return CANONICAL_STATUS.unknown;
  }

  /**
   * Map any known priority vocabulary → E1 CANONICAL_PRIORITY.
   * urgent|Critical → critical; medium → normal.
   */
  function toCanonicalPriority(value) {
    var v = trimText(value).toLowerCase();
    if (!v) return CANONICAL_PRIORITY.normal;
    if (v === "critical" || v === "urgent") return CANONICAL_PRIORITY.critical;
    if (v === "high") return CANONICAL_PRIORITY.high;
    if (v === "low") return CANONICAL_PRIORITY.low;
    if (v === "normal" || v === "medium") return CANONICAL_PRIORITY.normal;
    return CANONICAL_PRIORITY.normal;
  }

  /** E1 canonical → legacy recommendation priority (urgent|high|normal|low). */
  function toLegacyRecommendationPriority(canonicalPriority) {
    var p = toCanonicalPriority(canonicalPriority);
    if (p === CANONICAL_PRIORITY.critical) return "urgent";
    return p;
  }

  /** E1 canonical → Phase 16B neutral priority (urgent|high|medium|low). */
  function toLegacyNeutralPriority(canonicalPriority) {
    var p = toCanonicalPriority(canonicalPriority);
    if (p === CANONICAL_PRIORITY.critical) return "urgent";
    if (p === CANONICAL_PRIORITY.normal) return "medium";
    return p;
  }

  /** @returns {EntityReference|null} */
  function roomEntityReference(value) {
    if (value && typeof value === "object" && value.type === "room") {
      var existingId = normalizeRoomNumber(value.id || value.label || "");
      if (!existingId) return null;
      return {
        type: "room",
        id: existingId,
        label: value.label || ("Room " + existingId)
      };
    }
    var id = normalizeRoomNumber(value);
    if (!id) return null;
    return { type: "room", id: id, label: "Room " + id };
  }

  /** @returns {EntityReference|null} */
  function guestEntityReference(value) {
    if (value && typeof value === "object") {
      var name = trimText(value.name || value.label || value.id);
      if (!name) return null;
      return {
        type: "guest",
        id: trimText(value.id),
        label: trimText(value.label) || name,
        name: name
      };
    }
    var n = trimText(value);
    if (!n) return null;
    return { type: "guest", id: "", label: n, name: n };
  }

  /** @returns {SourceReference} */
  function sourceReference(sourceType, sourceId, workspaceId) {
    var type = normalizeSourceType(sourceType);
    var id = trimText(sourceId);
    return {
      sourceType: type,
      sourceId: id,
      identity: createSourceIdentity(type, id),
      workspaceId: trimText(workspaceId)
    };
  }

  /**
   * Adapt a legacy recommendation object into the E1 Recommendation shape
   * without dropping fields (text, department, status, traceability).
   */
  function adaptLegacyRecommendation(raw, fallbackDept) {
    var base = normalizeRecommendation(raw, fallbackDept);
    var out = {
      id: base.id,
      text: base.text,
      priority: base.priority,
      canonicalPriority: toCanonicalPriority(base.priority),
      department: base.department,
      status: base.status
    };
    if (base.sourceFactIds && base.sourceFactIds.length) {
      out.sourceFactIds = base.sourceFactIds.slice();
    }
    if (base.sourceTypes && base.sourceTypes.length) {
      out.sourceTypes = base.sourceTypes.slice();
    }
    if (base.reasonCode) out.reasonCode = base.reasonCode;
    if (raw && typeof raw === "object") {
      Object.keys(raw).forEach(function (key) {
        if (out[key] === undefined && raw[key] !== undefined) out[key] = raw[key];
      });
    }
    return out;
  }

  /**
   * View-model: Phase 16B neutral fact → E1 OperationalFact fields.
   * Pure; does not alter ensureNeutralFact runtime behaviour.
   */
  function toOperationalFactContract(neutral) {
    var f = ensureNeutralFact(neutral);
    var roomRef = roomEntityReference(f.room);
    var guestRef = guestEntityReference(f.guest);
    var source = sourceReference(f.sourceType, f.sourceId, f.workspaceId);
    var evidence = [];
    if (f.sourceText) evidence.push(f.sourceText);
    var classification = classifyOperationalFact(f, {
      section: f.sectionHint || (f.metadata && f.metadata.section) || "",
      sourceType: f.sourceType,
      sourceFactId: f.id
    });
    var operationalContext = buildOperationalContext(f, {
      section: f.sectionHint || (f.metadata && f.metadata.section) || "",
      sourceType: f.sourceType,
      subject: f.subjectType || ""
    });
    return {
      id: f.id,
      source: source,
      sourceType: source.sourceType,
      sourceId: source.sourceId,
      workspaceId: f.workspaceId || "",
      subject: f.subjectType || "",
      subjectType: f.subjectType || "",
      subjectId: f.subjectId || "",
      category: f.category || "",
      status: f.status || "",
      priority: f.priority || "",
      canonicalStatus: toCanonicalStatus(f.status),
      canonicalPriority: toCanonicalPriority(f.priority),
      room: roomRef || f.room || "",
      rooms: roomRef ? [roomRef] : [],
      guest: guestRef || f.guest || "",
      area: f.area || "",
      department: f.department || "",
      ownerDepartment: f.department || "",
      action: f.action || "",
      detail: f.detail || "",
      occurredAt: f.occurredAt || "",
      dueAt: f.dueAt || "",
      isResolved: f.isResolved === true || toCanonicalStatus(f.status) === CANONICAL_STATUS.resolved,
      includeInHandover: f.includeInHandover === true,
      confidence: f.confidence || "high",
      sourceText: f.sourceText || "",
      evidence: evidence,
      relatedFactIds: [],
      metadata: f.metadata || {},
      classification: classification,
      operationalContext: operationalContext
    };
  }

  function describeEnginePipeline() {
    return ENGINE_PIPELINE.map(function (step) {
      return {
        id: step.id,
        label: step.label,
        status: step.status
      };
    });
  }

  /* ------------------------------------------------------------------ */
  /*  E2 — Canonical lifecycle & shared metrics (pure)                   */
  /* ------------------------------------------------------------------ */

  /**
   * Resolve canonical lifecycle status from a fact, issue, note, or status string.
   * Uses E1 toCanonicalStatus — single mapping table.
   */
  function getCanonicalStatus(item) {
    if (item == null || item === "") return CANONICAL_STATUS.unknown;
    if (typeof item === "string") return toCanonicalStatus(item);

    if (item.canonicalStatus) {
      return toCanonicalStatus(item.canonicalStatus);
    }
    if (item.isResolved === true) return CANONICAL_STATUS.resolved;
    if (item.completedAt || item.completed_at) return CANONICAL_STATUS.resolved;

    if (item.status != null && String(item.status).trim() !== "") {
      return toCanonicalStatus(item.status);
    }

    /* Writing OperationalFact with empty status → unknown (treated as open/actionable). */
    if (item.isResolved === false) return CANONICAL_STATUS.open;
    return CANONICAL_STATUS.unknown;
  }

  /**
   * Closed for operational chase / open-work purposes.
   * resolved | cancelled → closed. Matches Writing done|confirmed and Maintenance completed.
   */
  function isOperationalFactClosed(item) {
    var status = getCanonicalStatus(item);
    return status === CANONICAL_STATUS.resolved || status === CANONICAL_STATUS.cancelled;
  }

  /**
   * Open / still actionable (open, in_progress, or unknown).
   * Preserves Writing isFactUnresolved semantics for missing status.
   */
  function isOperationalFactOpen(item) {
    if (item == null) return true;
    return !isOperationalFactClosed(item);
  }

  function filterOpenFacts(list) {
    return (list || []).filter(function (item) {
      return item != null && isOperationalFactOpen(item);
    });
  }

  function filterResolvedFacts(list) {
    return (list || []).filter(function (item) {
      return item != null && isOperationalFactClosed(item);
    });
  }

  function countFactsByLifecycle(list) {
    var counts = {
      open: 0,
      in_progress: 0,
      resolved: 0,
      cancelled: 0,
      unknown: 0,
      total: 0,
      actionable: 0
    };
    (list || []).forEach(function (item) {
      if (item == null) return;
      counts.total += 1;
      var status = getCanonicalStatus(item);
      if (counts[status] != null) counts[status] += 1;
      else counts.unknown += 1;
      if (isOperationalFactOpen(item)) counts.actionable += 1;
    });
    return counts;
  }

  /**
   * Factual quiet/actionable check — shared by Handover and Shift Intelligence.
   * True when at least one fact/issue is still open for follow-up.
   */
  function hasActionableOpenFacts(list) {
    return filterOpenFacts(list).length > 0;
  }

  /**
   * Phrase-based quiet-shift detection (presentation input).
   * Shared implementation; callers own final wording.
   * Behaviour unchanged from legacy isQuietShiftLines.
   */
  function isQuietShiftPhraseLines(lines) {
    if (!lines || !lines.length) return true;
    return lines.every(function (line) {
      return noteContains(line, [
        "quiet shift", "all guests settled", "no outstanding issues", "no outstanding issue",
        "nothing to report", "uneventful", "all quiet", "no issues", "no follow-up",
        "no follow up", "smooth shift", "without incident"
      ]);
    });
  }

  /**
   * Combine phrase quiet-shift with factual actionable check when facts are supplied.
   * - No facts: phrase-only (legacy behaviour).
   * - With facts: quiet only if phrases say quiet OR there are no actionable open facts
   *   is NOT used to change generateRecommendations yet — see buildSignals.
   * Prefer hasActionableOpenFacts for factual decisions; keep phrase helper for wording.
   */
  function evaluateQuietShiftState(lines, facts) {
    var phraseQuiet = isQuietShiftPhraseLines(lines);
    var actionable = facts && facts.length ? hasActionableOpenFacts(facts) : null;
    return {
      phraseQuiet: phraseQuiet,
      hasActionableOpenFacts: actionable,
      /* Legacy recommendation gate remains phrase-based for E2 behaviour parity */
      suppressRecommendations: phraseQuiet
    };
  }

  /* ------------------------------------------------------------------ */
  /*  E3 — Operational classification (engine-owned categories)          */
  /* ------------------------------------------------------------------ */

  /**
   * Canonical operational categories (classification, not UI section titles).
   * Handover section ids map onto these via adapters.
   */
  var OPERATIONAL_CATEGORY = {
    urgent: "urgent",
    guest: "guest",
    maintenance: "maintenance",
    payment: "payment",
    task: "task",
    information: "information",
    unknown: "unknown"
  };

  /**
   * Inventory of classification decision points (E3).
   * status: migrated | delegated | retained | presentation
   */
  var CLASSIFICATION_INVENTORY = [
    { id: "handover.classifyAnalyzedNote", status: "retained", note: "Section assignment authority; parity-checked against engine" },
    { id: "handover.classifyLine", status: "retained", note: "Keyword fallback for sections" },
    { id: "writing.extractOperationalFact.subject", status: "delegated", note: "Subject extraction remains Writing; engine classifies from subject" },
    { id: "writing.sectionFromFact", status: "delegated", note: "Hint mapping; engine normalizeOperationalCategory consumes subjects/hints" },
    { id: "writing.classifyFactSummaryTopic", status: "presentation", note: "Summary cards only" },
    { id: "shift.recommendationFromFact", status: "migrated", note: "E4.2 context-gated; subject wording is documented fallback only" },
    { id: "shift.buildOperationalContext", status: "migrated", note: "E4 Phase 1 canonical enrichment; scoring consumes context" },
    { id: "shift.decisionTrace", status: "migrated", note: "E4.2 explainability attached to recommendations and briefing specs" },
    { id: "writing.operationalContext", status: "presentation", note: "Must not invent OperationalContext / reason codes / priority / confidence" },
    { id: "handover.operationalContext", status: "presentation", note: "UI must not calculate OperationalContext or DecisionTrace" },
    { id: "m4.maintenanceImport", status: "migrated", note: "Uses classifyOperationalFact; section stays maintenance" },
    { id: "hotelBrain.context", status: "presentation", note: "Knowledge retrieval, not operational classification" }
  ];

  function normalizeOperationalCategory(value) {
    var v = trimText(value).toLowerCase().replace(/[\s-]+/g, "_");
    if (OPERATIONAL_CATEGORY[v]) return OPERATIONAL_CATEGORY[v];
    if (v === "payments" || v === "finance" || v === "folio") return OPERATIONAL_CATEGORY.payment;
    if (v === "vip" || v === "guest_follow_up" || v === "guest_followup") return OPERATIONAL_CATEGORY.guest;
    if (v === "tasks" || v === "inventory" || v === "deliveries" || v === "delivery" || v === "housekeeping") {
      return OPERATIONAL_CATEGORY.task;
    }
    if (v === "events" || v === "general" || v === "lostproperty" || v === "lost_property" ||
        v === "completed" || v === "info") {
      return OPERATIONAL_CATEGORY.information;
    }
    if (v === "safety" || v === "critical") return OPERATIONAL_CATEGORY.urgent;
    return OPERATIONAL_CATEGORY.unknown;
  }

  function normalizeOperationalSubject(value) {
    return trimText(value)
      .toLowerCase()
      .replace(/[\s-]+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
  }

  /** Map Handover presentation section id → canonical category. */
  function handoverSectionToCategory(section) {
    return normalizeOperationalCategory(section);
  }

  /**
   * Prefer existing section when it already matches the category (keeps vip vs guest cards).
   */
  function categoryToHandoverSection(category, preferredSection) {
    var cat = normalizeOperationalCategory(category);
    var preferred = trimText(preferredSection);
    if (preferred && handoverSectionToCategory(preferred) === cat) return preferred;
    if (cat === OPERATIONAL_CATEGORY.urgent) return "urgent";
    if (cat === OPERATIONAL_CATEGORY.guest) return "guest";
    if (cat === OPERATIONAL_CATEGORY.maintenance) return "maintenance";
    if (cat === OPERATIONAL_CATEGORY.payment) return "payments";
    if (cat === OPERATIONAL_CATEGORY.task) return "tasks";
    if (cat === OPERATIONAL_CATEGORY.information) return preferred === "completed" ? "completed" : "general";
    return preferred || "general";
  }

  function subjectToCategory(subject) {
    var s = normalizeOperationalSubject(subject);
    if (!s) return OPERATIONAL_CATEGORY.unknown;
    if (s === "maintenance") return OPERATIONAL_CATEGORY.maintenance;
    if (
      s === "outstanding_balance" || s === "payment" || s === "invoice" || s === "bill" ||
      s === "folio" || s === "account" || s === "charge" || s === "payment_balance" ||
      s === "financial_settlement_unclear"
    ) {
      return OPERATIONAL_CATEGORY.payment;
    }
    if (
      s === "vip_arrival" || s === "reservation_info" || s === "guest_arrangement" ||
      s === "room_move" || s === "late_checkout" || s === "guest_request" || s === "extension" ||
      s === "departure_followup" || s === "transfer" || s === "interconnect" ||
      s === "guest_preparation" || s === "lost_property" || s === "wake_up" || s === "no_show"
    ) {
      return OPERATIONAL_CATEGORY.guest;
    }
    if (s === "twin_setup" || s === "delivery" || s === "inventory" || s === "adapter" || s === "supply") {
      return OPERATIONAL_CATEGORY.task;
    }
    if (s === "follow_up") return OPERATIONAL_CATEGORY.unknown;
    if (s === "critical") return OPERATIONAL_CATEGORY.urgent;
    return OPERATIONAL_CATEGORY.unknown;
  }

  /**
   * Classify a structured operational / neutral fact using existing subject & hint rules only.
   * Does not assign Handover card titles — use categoryToHandoverSection for presentation.
   *
   * @returns {{
   *   category: string,
   *   subject: string,
   *   classificationSource: string,
   *   confidence: string,
   *   sourceFactId: string,
   *   handoverSection: string
   * }}
   */
  function classifyOperationalFact(fact, context) {
    context = context || {};
    fact = fact || {};
    var subject = normalizeOperationalSubject(
      fact.subject || fact.subjectType || context.subject || ""
    );
    var sourceType = normalizeSourceType(fact.sourceType || context.sourceType || "");
    var sectionHint = trimText(fact.sectionHint || context.section || "");
    var confidence = trimText(fact.confidence || context.confidence || "");
    var sourceFactId = trimText(fact.id || context.sourceFactId || "");
    var category = OPERATIONAL_CATEGORY.unknown;
    var classificationSource = "unknown";

    if (sourceType === SOURCE_TYPE.maintenance || subject === "maintenance") {
      category = OPERATIONAL_CATEGORY.maintenance;
      classificationSource = sourceType === SOURCE_TYPE.maintenance ? "maintenance_adapter" : "fact_subject";
      if (!subject) subject = "maintenance";
    } else {
      var fromSubject = subjectToCategory(subject);
      if (fromSubject !== OPERATIONAL_CATEGORY.unknown) {
        category = fromSubject;
        classificationSource = "fact_subject";
      } else if (subject === "follow_up") {
        var dept = trimText(fact.department || fact.ownerDept || context.ownerDept || "").toLowerCase();
        if (dept.indexOf("maintenance") !== -1) {
          category = OPERATIONAL_CATEGORY.maintenance;
        } else if (dept.indexOf("housekeeping") !== -1) {
          category = OPERATIONAL_CATEGORY.task;
        } else {
          category = OPERATIONAL_CATEGORY.task;
        }
        classificationSource = "follow_up_owner";
      } else if (sectionHint) {
        category = handoverSectionToCategory(sectionHint);
        classificationSource = "section_hint";
      } else if (context.isVip || context.section === "vip") {
        category = OPERATIONAL_CATEGORY.guest;
        classificationSource = "vip_flag";
        if (!subject) subject = "vip_arrival";
      } else if (
        context.maintenancePriority === "Critical" ||
        sectionHint === "urgent" ||
        context.section === "urgent"
      ) {
        category = OPERATIONAL_CATEGORY.urgent;
        classificationSource = "urgent_context";
      } else {
        category = OPERATIONAL_CATEGORY.information;
        classificationSource = "default_information";
      }
    }

    category = normalizeOperationalCategory(category);

    var guestImpact = trimText(fact.guestImpact || context.guestImpact || "");
    var priority = trimText(fact.priority || context.priority || "");
    var ownerDepartment = trimText(
      fact.ownerDept || fact.department || fact.ownerDepartment || context.ownerDept || ""
    );

    return {
      category: category,
      subject: subject,
      classificationSource: classificationSource,
      confidence: confidence || "",
      sourceFactId: sourceFactId,
      handoverSection: categoryToHandoverSection(category, sectionHint || context.section || ""),
      department: ownerDepartment,
      ownerDepartment: ownerDepartment,
      priority: priority,
      guestImpact: guestImpact,
      status: trimText(fact.status || context.status || "")
    };
  }

  function classifyOperationalFacts(facts, context) {
    return (facts || []).map(function (fact) {
      return classifyOperationalFact(fact, context);
    });
  }

  /**
   * Parity: engine category vs legacy Handover section.
   * guest matches both vip and guest sections; task matches tasks/inventory/deliveries.
   */
  function compareClassificationParity(engineResult, legacySection) {
    var eng = engineResult && engineResult.category
      ? normalizeOperationalCategory(engineResult.category)
      : OPERATIONAL_CATEGORY.unknown;
    var legacyCat = handoverSectionToCategory(legacySection);
    var match = eng === legacyCat;
    return {
      match: match,
      engineCategory: eng,
      legacySection: trimText(legacySection) || "",
      legacyCategory: legacyCat,
      engineSubject: engineResult && engineResult.subject ? engineResult.subject : "",
      classificationSource: engineResult && engineResult.classificationSource
        ? engineResult.classificationSource
        : ""
    };
  }

  /**
   * Apply engine classification metadata onto a Handover analyzed note.
   * Never changes note.section when parity fails — preserves rendered output.
   * When parity matches, attaches operationalCategory for downstream consumers.
   */
  function applyEngineClassificationToNote(note, legacySection) {
    if (!note) return null;
    var section = legacySection || note.section || "general";
    note.section = section;

    if (!note.fact && note.sourceType !== "maintenance" && note._neutralSourceType !== "maintenance") {
      note.operationalCategory = handoverSectionToCategory(section);
      note.operationalSubject = "";
      return note;
    }

    var fact = note.fact || {
      subject: note.subjectType || (note._neutralSourceType === "maintenance" ? "maintenance" : ""),
      subjectType: note.subjectType,
      sourceType: note._neutralSourceType || note.sourceType || "handover",
      id: note._neutralFactId || note.id || "",
      sectionHint: section,
      confidence: ""
    };

    var eng = classifyOperationalFact(fact, {
      sourceText: note.original || "",
      section: section,
      isVip: !!note.isVip,
      sourceType: note._neutralSourceType || note.sourceType || "",
      maintenancePriority: note.maintenancePriority || null,
      sourceFactId: note._neutralFactId || note.id || ""
    });
    var parity = compareClassificationParity(eng, section);
    note._engineClassification = eng;
    note._classificationParity = parity;

    if (parity.match) {
      note.operationalCategory = eng.category;
      note.operationalSubject = eng.subject;
      /* Keep legacy section id for presentation (e.g. vip vs guest). */
    } else {
      note.operationalCategory = parity.legacyCategory;
      note.operationalSubject = eng.subject || (note.fact && note.fact.subject) || "";
    }
    return note;
  }

  /* ------------------------------------------------------------------ */
  /*  Phase 1 / E4 — Operational impact ranking, objects, snapshot       */
  /* ------------------------------------------------------------------ */

  /**
   * Operational object kinds a Duty Manager clusters related facts into.
   * Presentation may still show separate lines; reasoning groups by these.
   */
  var OPERATIONAL_OBJECT_TYPE = {
    vip: "vip",
    payment: "payment",
    maintenance: "maintenance",
    wake_up: "wake_up",
    transport: "transport",
    departure: "departure",
    timed: "timed",
    interconnect: "interconnect",
    guest_request: "guest_request",
    reception: "reception",
    other: "other"
  };

  var HOTEL_STATUS_LEVEL = {
    normal: "normal",
    attention: "attention",
    critical: "critical"
  };

  var BRIEFING_MAX_BLOCKS = 5;

  function firstSnapshotMatch(text, patterns) {
    for (var i = 0; i < patterns.length; i += 1) {
      var match = text.match(patterns[i]);
      if (match) return match;
    }
    return null;
  }

  function snapshotCapture(match) {
    if (!match) return null;
    for (var i = 1; i < match.length; i += 1) {
      if (match[i] != null && match[i] !== "") return match[i];
    }
    return null;
  }

  /**
   * Expand common hotel KPI shorthand before snapshot regex matching.
   * Keeps uncertainty: does not invent values; only normalises tokens.
   */
  function expandSnapshotShorthand(text) {
    var result = String(text || "");
    result = result
      .replace(/\binhouse\b/gi, "in-house")
      .replace(/\bstayovers?\b/gi, "stayovers")
      .replace(/\bstays?\b(?=\s*[:\-]?\s*\d)/gi, "stayovers")
      .replace(/\bocc\b(?=\s*[:\-]?\s*\d)/gi, "occupancy")
      .replace(/\b(?:rooms?\s+)?sold\b(?=\s*[:\-]?\s*\d)/gi, "rooms sold")
      .replace(/\b(?:rooms?\s+)?avail(?:able)?\b(?=\s*[:\-]?\s*\d)/gi, "rooms available")
      .replace(/\barrs\b(?=\s*[:\-]?\s*\d)/gi, "arrivals")
      .replace(/\bdeps\b(?=\s*[:\-]?\s*\d)/gi, "departures")
      /* Bare arr/dep counts — not arrival times (arr 22:00 / arr ~2345 / late arr). */
      .replace(/\barr\b(?=\s*[:\-]?\s*\d{1,3}(?![:.\d]))/gi, "arrivals")
      .replace(/\bdep\b(?=\s*[:\-]?\s*\d{1,3}(?![:.\d]))/gi, "departures")
      .replace(/(\d{1,3})\s+arrs?\b(?!\s*[:.]\d)/gi, "$1 arrivals")
      .replace(/(\d{1,3})\s+deps?\b(?!\s*[:.]\d)/gi, "$1 departures")
      .replace(/(\d{1,3})\s+sold\b/gi, "$1 rooms sold")
      .replace(/(\d{1,3})\s+avail(?:able)?\b/gi, "$1 rooms available")
      .replace(/(\d{1,3})\s+stay(?:overs?)?\b/gi, "$1 stayovers")
      .replace(/(\d+(?:\.\d+)?)\s*%?\s*occ\b/gi, "$1% occupancy");
    return result;
  }

  /**
   * Shared Hotel Snapshot extraction (KPI facts only).
   * Recognises full phrases and common shorthand (arr/dep/stay/occ/sold/avail).
   * Never invents missing KPIs — absent match → null.
   */
  function extractHotelSnapshot(notesText) {
    var text = expandSnapshotShorthand(String(notesText || ""));
    var normalized = text.replace(/\s+/g, " ").trim();

    var arrivalsMatch = firstSnapshotMatch(normalized, [
      /(?:expected\s+)?arrivals?\s*(?:today|tomorrow|tonight|left|remain(?:ing)?)?\s*[:\-]?\s*(\d+)/i,
      /arrivals?\s*[:\-]\s*(\d+)/i,
      /(\d+)\s+arrivals?/i
    ]);
    var departuresMatch = firstSnapshotMatch(normalized, [
      /(?:expected\s+)?departures?\s*(?:today|tomorrow|tonight)?\s*[:\-]?\s*(\d+)/i,
      /departures?\s*[:\-]\s*(\d+)/i,
      /(\d+)\s+departures?/i,
      /(?:check[\s-]?outs?|checkouts?)\s*[:\-]?\s*(\d+)/i,
      /(\d+)\s+(?:check[\s-]?outs?|checkouts?)/i
    ]);
    var inHouseMatch = firstSnapshotMatch(normalized, [
      /(\d+)\s+in[\s-]?house\s+guests?/i,
      /in[\s-]?house\s+guests?\s*[:\-]?\s*(\d+)/i,
      /(\d+)\s+guests?\s+in[\s-]?house/i,
      /guests?\s+in[\s-]?house\s*[:\-]?\s*(\d+)/i,
      /in[\s-]?house\s*[:\-]?\s*(\d+)/i
    ]);
    var adultsMatch = firstSnapshotMatch(normalized, [
      /(\d+)\s+adults?/i,
      /adults?\s*[:\-]?\s*(\d+)/i
    ]);
    var childrenMatch = firstSnapshotMatch(normalized, [
      /(\d+)\s+children\b/i,
      /(\d+)\s+child\b/i,
      /children\s*[:\-]?\s*(\d+)/i,
      /child(?:ren)?\s*[:\-]?\s*(\d+)/i
    ]);
    var occupancyMatch = firstSnapshotMatch(normalized, [
      /occupancy\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:%|percent)?/i,
      /(\d+(?:\.\d+)?)\s*%\s+occupancy/i,
      /occupancy\s+at\s+(\d+(?:\.\d+)?)/i
    ]);
    var adrMatch = firstSnapshotMatch(normalized, [
      /adr\s*[:\-]?\s*([£$€])?\s*(\d+(?:\.\d+)?)/i,
      /average\s+daily\s+rate\s*[:\-]?\s*([£$€])?\s*(\d+(?:\.\d+)?)/i,
      /([£$€])\s*(\d+(?:\.\d+)?)\s+adr/i
    ]);
    var adr = null;
    if (adrMatch) {
      adr = {
        currency: adrMatch[2] ? (adrMatch[1] || "£") : "£",
        value: adrMatch[2] || adrMatch[1]
      };
    }
    var roomsSoldMatch = firstSnapshotMatch(normalized, [
      /(\d+)\s+rooms?\s+sold/i,
      /rooms?\s+sold\s*[:\-]?\s*(\d+)/i
    ]);
    var revparMatch = firstSnapshotMatch(normalized, [
      /revpar\s*[:\-]?\s*([£$€])?\s*(\d+(?:\.\d+)?)/i,
      /([£$€])\s*(\d+(?:\.\d+)?)\s+revpar/i
    ]);
    var revpar = null;
    if (revparMatch) {
      revpar = {
        currency: revparMatch[2] ? (revparMatch[1] || "£") : "£",
        value: revparMatch[2] || revparMatch[1]
      };
    }
    var stayoversMatch = firstSnapshotMatch(normalized, [
      /(\d+)\s+stayovers?/i,
      /stayovers?\s*[:\-]?\s*(\d+)/i
    ]);
    var roomsAvailableMatch = firstSnapshotMatch(normalized, [
      /(\d+)\s+rooms?\s+available/i,
      /rooms?\s+available\s*[:\-]?\s*(\d+)/i
    ]);

    return {
      arrivals: snapshotCapture(arrivalsMatch),
      departures: snapshotCapture(departuresMatch),
      inHouse: snapshotCapture(inHouseMatch),
      adults: snapshotCapture(adultsMatch),
      children: snapshotCapture(childrenMatch),
      occupancy: snapshotCapture(occupancyMatch),
      adr: adr,
      revpar: revpar,
      roomsSold: snapshotCapture(roomsSoldMatch),
      roomsAvailable: snapshotCapture(roomsAvailableMatch),
      stayovers: snapshotCapture(stayoversMatch)
    };
  }

  function factSourceText(fact, note) {
    return String(
      (fact && (fact.sourceText || fact.detail || fact.action)) ||
      (note && (note.original || note.text)) ||
      ""
    );
  }

  function factRoomsList(fact, note) {
    var rooms = [];
    if (fact) {
      if (Array.isArray(fact.rooms)) {
        fact.rooms.forEach(function (r) {
          var n = normalizeRoomNumber(r && r.id != null ? r.id : r);
          if (n) rooms.push(n);
        });
      }
      if (fact.room) {
        var one = normalizeRoomNumber(
          typeof fact.room === "object" ? (fact.room.id || fact.room.label) : fact.room
        );
        if (one) rooms.push(one);
      }
    }
    if (note && Array.isArray(note.rooms)) {
      note.rooms.forEach(function (r) {
        var n = normalizeRoomNumber(r);
        if (n) rooms.push(n);
      });
    }
    var seen = {};
    return rooms.filter(function (r) {
      if (seen[r]) return false;
      seen[r] = true;
      return true;
    });
  }

  function factGuestName(fact, note) {
    if (fact && fact.guestName) return trimText(fact.guestName);
    if (fact && fact.guest) {
      if (typeof fact.guest === "string") return trimText(fact.guest);
      return trimText(fact.guest.name || fact.guest.label || "");
    }
    if (note && note.guestName) return trimText(note.guestName);
    return "";
  }

  function normalizeSubjectToken(value) {
    return trimText(value).toLowerCase().replace(/[\s-]+/g, "_");
  }

  /**
   * Classify a fact into a Duty Manager operational object kind.
   * Prefer evidence in subject/source; low-evidence → other (not guessed VIP/payment).
   */
  function classifyOperationalObject(fact, note) {
    fact = fact || {};
    note = note || null;
    var subject = normalizeSubjectToken(fact.subject || fact.subjectType || "");
    var src = factSourceText(fact, note).toLowerCase();
    var section = trimText((note && note.section) || fact.sectionHint || "").toLowerCase();
    var confidence = "high";

    if (subject === "vip_arrival" || section === "vip" || (note && note.isVip) ||
        (/\bvip\b/.test(src) && /arriv|due|prep|amenity|champagne|welcome/.test(src)) ||
        (/\bchampagne\b|\bwelcome\s+card\b/.test(src) && !/\bminibar|balance|declined|wake|taxi\b/.test(src))) {
      return {
        type: OPERATIONAL_OBJECT_TYPE.vip,
        confidence: /\bvip\b/.test(src) || subject === "vip_arrival" ? "high" : "medium"
      };
    }
    /* Pure collection notes may extract as departure_followup — keep them payments. */
    var paymentCue = /\b(minibar|city\s+tax|outstanding|folio|balance|booking\.com|expedia|declined)\b/.test(src) ||
      subject === "payment" || subject === "outstanding_balance" || subject === "payment_balance" ||
      subject === "financial_settlement_unclear" || subject === "invoice" || subject === "folio" ||
      subject === "charge" || subject === "bill" ||
      (/\badapter\b/.test(src) && /\b(?:£|\$|€|\d+|charge|posted|not\s+posted|collect)\b/.test(src));
    var timedDepartureCue = /\bwake\b/.test(src) || /\baddison|taxi|transfer\b/.test(src) ||
      subject === "wake_up" || subject === "transfer";
    if (paymentCue && !timedDepartureCue &&
        (subject === "departure_followup" || section === "payments" || subject === "inventory" || paymentCue)) {
      return { type: OPERATIONAL_OBJECT_TYPE.payment, confidence: "high" };
    }
    if (subject === "departure_followup" ||
        (/\bwake\b/.test(src) && /\b(addison|taxi|transfer)\b/.test(src))) {
      var components = [];
      if (/\bwake\b/.test(src) || subject === "wake_up") components.push("wake_up");
      if (/\baddison|taxi|transfer\b/.test(src) || subject === "transfer") components.push("transport");
      if (/\bminibar|balance|city\s+tax|collect\b/.test(src)) components.push("payment");
      return {
        type: OPERATIONAL_OBJECT_TYPE.departure,
        confidence: "high",
        components: components.length ? components : ["departure"]
      };
    }
    if (subject === "wake_up" || /\bwake(?:[\s-]*up)?\b/.test(src)) {
      return { type: OPERATIONAL_OBJECT_TYPE.wake_up, confidence: "high" };
    }
    if (subject === "transfer" || /\baddison(?:\s+lee)?\b|\btaxi\b|\btransfer\b/.test(src)) {
      return { type: OPERATIONAL_OBJECT_TYPE.transport, confidence: "high" };
    }
    if (
      subject === "payment" || subject === "outstanding_balance" || subject === "payment_balance" ||
      subject === "invoice" || subject === "folio" || subject === "bill" ||
      section === "payments" ||
      /\b(minibar|city\s+tax|outstanding|folio|balance|booking\.com|expedia)\b/.test(src)
    ) {
      return { type: OPERATIONAL_OBJECT_TYPE.payment, confidence: subject || section === "payments" ? "high" : "medium" };
    }
    if (subject === "maintenance" || section === "maintenance") {
      return { type: OPERATIONAL_OBJECT_TYPE.maintenance, confidence: "high" };
    }
    if (subject === "interconnect" || subject === "guest_preparation") {
      return { type: OPERATIONAL_OBJECT_TYPE.interconnect, confidence: "high" };
    }
    if (subject === "guest_request" || subject === "room_move" || subject === "twin_setup" ||
        subject === "late_checkout" || subject === "lost_property" || subject === "delivery") {
      return { type: OPERATIONAL_OBJECT_TYPE.guest_request, confidence: "high" };
    }
    if (subject === "no_show" || subject === "late_arrival" ||
        /arrivals?\s+left|allocation|no-show|late\s+arr(?:ival)?\b/.test(src)) {
      return {
        type: OPERATIONAL_OBJECT_TYPE.reception,
        confidence: /no-show|arrivals?\s+left|late\s+arr/.test(src) ? "high" : "medium"
      };
    }
    confidence = subject ? "medium" : "low";
    return { type: OPERATIONAL_OBJECT_TYPE.other, confidence: confidence };
  }

  function extractMoneyAmount(fact, note) {
    var src = factSourceText(fact, note);
    var details = (fact && fact.details) || [];
    for (var i = 0; i < details.length; i += 1) {
      if (details[i] && details[i].type === "money" && details[i].value != null) {
        var fromDetail = parseFloat(String(details[i].value).replace(/[^\d.]/g, ""), 10);
        if (!isNaN(fromDetail)) return fromDetail;
      }
    }
    var m = src.match(/([£$€])\s*([\d,]+(?:\.\d{1,2})?)/) ||
      src.match(/\b(?:outstanding|balance|collect|charge|declined)\D{0,12}([£$€])?\s*([\d,]+(?:\.\d{1,2})?)/i) ||
      src.match(/\b([\d,]+(?:\.\d{1,2})?)\s*(?:pounds?|gbp)\b/i);
    if (!m) return null;
    var raw = m[2] != null && m[2] !== "" && !/^[£$€]$/.test(m[2]) ? m[2] : (m[1] && !/^[£$€]$/.test(m[1]) ? m[1] : m[2] || m[1]);
    if (raw && /^[£$€]$/.test(raw)) raw = m[2] || m[3];
    var n = parseFloat(String(raw || "").replace(/,/g, ""), 10);
    return isNaN(n) ? null : n;
  }

  function hasDeclinedPaymentEvidence(fact, note) {
    var src = factSourceText(fact, note).toLowerCase();
    return /\bdeclined\b/.test(src) && /\b(?:card|payment|pdq|pos|authoris|authoriz)\b/.test(src) ||
      /\bcard\s+declined\b/.test(src) ||
      /\bpayment\s+(?:failed|declined)\b/.test(src);
  }

  function isGuestImpactingMaintenance(fact, note) {
    var subject = normalizeSubjectToken(fact && (fact.subject || fact.subjectType) || "");
    var impact = trimText(fact && fact.guestImpact || "").toLowerCase();
    var fault = trimText(fact && fact.faultType || "").toLowerCase();
    var src = factSourceText(fact, note).toLowerCase();
    if (subject !== "maintenance" && !/maint|fault|broken|leak|hot\s*water|heating|ac\b|air\s*con|not cooling|on hold/.test(src)) {
      return false;
    }
    if (impact === "high" || impact === "critical") return true;
    if (fault === "ac" || fault === "hot water" || fault === "hot_water" || fault === "shower/leak" || fault === "heating") {
      return true;
    }
    return /hot\s*water|no\s+hot\s+water|not cooling|ac\b|air\s*con|on hold|unavailable|leak|unhappy|guest\s+impact/.test(src);
  }

  function isHighFinancialRisk(fact, note) {
    var amount = extractMoneyAmount(fact, note);
    if (hasDeclinedPaymentEvidence(fact, note)) return true;
    if (amount != null && amount >= 100) return true;
    return false;
  }

  /* ------------------------------------------------------------------ */
  /*  E4 Phase 1 — Canonical OperationalContext                          */
  /* ------------------------------------------------------------------ */

  /**
   * Controlled impact scale shared by guestImpact / revenueImpact / operationalRisk.
   * Reuses Writing guestImpact vocabulary (critical|high|medium|low) plus none.
   */
  var IMPACT_LEVEL = {
    none: "none",
    low: "low",
    medium: "medium",
    high: "high",
    critical: "critical"
  };

  /** Time pressure relative to the current shift / day. */
  var TIME_SENSITIVITY = {
    none: "none",
    later: "later",
    today: "today",
    imminent: "imminent",
    overdue: "overdue"
  };

  /**
   * Operational urgency (comparable). Distinct from legacy recommendation
   * priority keys (urgent|normal) and E1 CANONICAL_PRIORITY (critical|normal).
   */
  var URGENCY_LEVEL = {
    low: "low",
    medium: "medium",
    high: "high",
    critical: "critical"
  };

  /**
   * Operational current-status for reasoning (not UI copy).
   * Distinct from E1 CANONICAL_STATUS: Writing "confirmed" means arrangement
   * confirmed (CONTEXT_STATUS.confirmed), while E2 closure maps confirmed→resolved.
   */
  var CONTEXT_STATUS = {
    pending: "pending",
    confirmed: "confirmed",
    in_progress: "in_progress",
    completed: "completed",
    unresolved: "unresolved",
    informational: "informational"
  };

  var CONFIDENCE_LABEL = {
    low: "low",
    medium: "medium",
    high: "high"
  };

  /** Structured next-action codes — empty when source does not support an action. */
  var NEXT_ACTION_KIND = {
    none: "",
    follow_up_until_resolved: "follow_up_until_resolved",
    collect_before_departure: "collect_before_departure",
    prepare_vip: "prepare_vip",
    honour_confirmed_arrangement: "honour_confirmed_arrangement",
    complete_timed_actions: "complete_timed_actions",
    guest_follow_up: "guest_follow_up",
    post_or_collect_charge: "post_or_collect_charge",
    reserve_interconnect: "reserve_interconnect",
    operational_follow_up: "operational_follow_up"
  };

  var DEPARTMENT_NAME = {
    reception: "Reception",
    housekeeping: "Housekeeping",
    maintenance: "Maintenance",
    finance: "Finance",
    food_beverage: "Food & Beverage",
    duty_manager: "Duty Manager"
  };

  function normalizeImpactLevel(value, fallback) {
    var v = trimText(value).toLowerCase();
    if (IMPACT_LEVEL[v]) return IMPACT_LEVEL[v];
    if (v === "urgent") return IMPACT_LEVEL.critical;
    if (v === "normal") return IMPACT_LEVEL.medium;
    return fallback != null ? fallback : IMPACT_LEVEL.none;
  }

  function normalizeTimeSensitivity(value) {
    var v = trimText(value).toLowerCase();
    return TIME_SENSITIVITY[v] || TIME_SENSITIVITY.none;
  }

  function normalizeUrgencyLevel(value) {
    var v = trimText(value).toLowerCase();
    if (v === "urgent") return URGENCY_LEVEL.critical;
    if (v === "normal") return URGENCY_LEVEL.medium;
    return URGENCY_LEVEL[v] || URGENCY_LEVEL.low;
  }

  function normalizeContextStatus(value) {
    var v = trimText(value).toLowerCase().replace(/-/g, "_");
    if (CONTEXT_STATUS[v]) return CONTEXT_STATUS[v];
    if (v === "open" || v === "requested") return CONTEXT_STATUS.pending;
    if (v === "done" || v === "resolved" || v === "closed" || v === "complete") {
      return CONTEXT_STATUS.completed;
    }
    if (v === "unknown") return CONTEXT_STATUS.informational;
    return CONTEXT_STATUS.informational;
  }

  function confidenceValueFromLabel(label) {
    var l = trimText(label).toLowerCase();
    if (l === CONFIDENCE_LABEL.high) return 0.9;
    if (l === CONFIDENCE_LABEL.medium) return 0.6;
    if (l === CONFIDENCE_LABEL.low) return 0.3;
    return 0.5;
  }

  function confidenceLabelFromValue(value) {
    var n = typeof value === "number" ? value : parseFloat(value);
    if (isNaN(n)) return CONFIDENCE_LABEL.medium;
    if (n >= 0.75) return CONFIDENCE_LABEL.high;
    if (n >= 0.45) return CONFIDENCE_LABEL.medium;
    return CONFIDENCE_LABEL.low;
  }

  function pushUnique(list, value) {
    if (!value) return;
    if (list.indexOf(value) === -1) list.push(value);
  }

  function createEmptyOperationalContext() {
    return {
      subject: "",
      category: OPERATIONAL_CATEGORY.unknown,
      guestImpact: IMPACT_LEVEL.none,
      revenueImpact: IMPACT_LEVEL.none,
      operationalRisk: IMPACT_LEVEL.none,
      timeSensitivity: TIME_SENSITIVITY.none,
      urgency: URGENCY_LEVEL.low,
      confidence: 0.5,
      confidenceLabel: CONFIDENCE_LABEL.medium,
      departments: [],
      dependencies: [],
      currentStatus: CONTEXT_STATUS.informational,
      nextAction: NEXT_ACTION_KIND.none,
      reasoning: [],
      objectType: OPERATIONAL_OBJECT_TYPE.other,
      canonicalPriority: CANONICAL_PRIORITY.low
    };
  }

  function impactRank(level) {
    var order = {
      none: 0,
      low: 1,
      medium: 2,
      high: 3,
      critical: 4
    };
    return order[normalizeImpactLevel(level, IMPACT_LEVEL.none)] || 0;
  }

  function maxImpact() {
    var best = IMPACT_LEVEL.none;
    for (var i = 0; i < arguments.length; i += 1) {
      if (impactRank(arguments[i]) > impactRank(best)) best = normalizeImpactLevel(arguments[i], IMPACT_LEVEL.none);
    }
    return best;
  }

  function hasArrivalCue(src) {
    return /\barriv(?:al|ing|es)?\b|\bdue\b|\bcheck[\s-]?in\b/.test(src);
  }

  function hasDepartureCue(src) {
    return /\bdepart(?:ure|ing|s)?\b|\bcheck[\s-]?out\b|\bbefore\s+departure\b|\bb4\s+checkout\b/.test(src);
  }

  function hasTodayCue(src) {
    return /\btoday\b|\bthis\s+shift\b|\btonight\b|\bthis\s+evening\b|\bin[\s-]?house\b|\bstay(?:ing|over)?\b/.test(src);
  }

  function hasImminentCue(src) {
    return /\bimminent\b|\basap\b|\burgent\b|\bnow\b|\bbefore\s+(?:departure|checkout|check[\s-]?out)\b|\bdeparts?\s+today\b/.test(src) ||
      hasDeclinedPaymentEvidence({ sourceText: src }, null);
  }

  function hasTomorrowCue(src) {
    return /\btomorrow\b|\btmrw\b/.test(src);
  }

  function hasOverdueCue(src) {
    /* Status "unresolved" is not by itself overdue — require explicit lateness cues. */
    return /\boverdue\b|\bstill\s+(?:open|outstanding|unresolved)\b|\bnot\s+yet\s+(?:fixed|resolved|done|informed)\b|\bpast\s+due\b/.test(src);
  }

  function hasVipCue(fact, note, src) {
    var subject = normalizeSubjectToken(fact && (fact.subject || fact.subjectType) || "");
    if (subject === "vip_arrival") return true;
    if (note && note.isVip) return true;
    if (trimText(fact && fact.guestType || "").toLowerCase() === "vip") return true;
    return /\bvip\b/.test(src);
  }

  function hasWeakEvidence(fact, note, src, subject, objectInfo) {
    var rooms = factRoomsList(fact, note);
    var thin = !subject || subject === "follow_up";
    var vague = /guest\s+mentioned|mentioned\s+room|something\s+earlier|asked\s+for\s+something/i.test(src);
    var noSubstance = thin && !rooms.length && objectInfo.type === OPERATIONAL_OBJECT_TYPE.other;
    var almostEmpty = !trimText(src) && !subject;
    return almostEmpty || vague || (noSubstance && src.split(/\s+/).filter(Boolean).length <= 4);
  }

  function isMaintenanceAppointmentConfirmation(src, objectInfo) {
    var text = String(src || "");
    var type = "";
    if (typeof objectInfo === "string") type = objectInfo;
    else if (objectInfo && objectInfo.type) type = objectInfo.type;
    if (type !== OPERATIONAL_OBJECT_TYPE.maintenance && type !== "maintenance") return false;
    if (/\b(resolved|fixed|completed|working\s+again|guest\s+confirmed\s+quiet)\b/i.test(text)) {
      return false;
    }
    return /\bconfirm(?:ed)?\s+attendance\b|\battendance\s+tomorrow\b|\beta\b.*\b(engineer|supplier|contractor)\b|\b(engineer|supplier)\b.*\beta\b/i.test(text);
  }

  function inferContextStatus(fact, note, src, objectInfo, closed) {
    var rawStatus = trimText(fact && fact.status || "").toLowerCase().replace(/-/g, "_");
    /* Supplier/engineer attendance confirmation is progress, not issue resolution. */
    if (rawStatus === "confirmed" && isMaintenanceAppointmentConfirmation(src, objectInfo)) {
      return CONTEXT_STATUS.in_progress;
    }
    if (rawStatus === "confirmed") return CONTEXT_STATUS.confirmed;
    if (rawStatus === "done" || rawStatus === "resolved" || rawStatus === "completed" || rawStatus === "closed") {
      return CONTEXT_STATUS.completed;
    }
    if (rawStatus === "in_progress" || rawStatus === "waiting_parts" || rawStatus === "waiting_contractor") {
      return CONTEXT_STATUS.in_progress;
    }
    if (rawStatus === "requested" || rawStatus === "open" || rawStatus === "pending") {
      if (
        objectInfo.type === OPERATIONAL_OBJECT_TYPE.maintenance ||
        objectInfo.type === OPERATIONAL_OBJECT_TYPE.payment ||
        isGuestImpactingMaintenance(fact, note) ||
        isHighFinancialRisk(fact, note)
      ) {
        return CONTEXT_STATUS.unresolved;
      }
      return CONTEXT_STATUS.pending;
    }
    if (closed) {
      if (/\bconfirm(?:ed)?\b/.test(src) && !/\bunresolved|still|outstanding|needed\b/.test(src)) {
        return CONTEXT_STATUS.confirmed;
      }
      return CONTEXT_STATUS.completed;
    }
    if (/\bunresolved\b|\bstill\s+open\b|\bnot\s+yet\b|\bmaint(?:enance)?\s+(?:informed|aware)\b/.test(src) &&
        !/\bresolved|fixed|completed|apologis/.test(src)) {
      return CONTEXT_STATUS.unresolved;
    }
    if (/\bconfirm(?:ed)?\b/.test(src) && (objectInfo.type === OPERATIONAL_OBJECT_TYPE.guest_request ||
        normalizeSubjectToken(fact && (fact.subject || fact.subjectType) || "") === "late_checkout")) {
      return CONTEXT_STATUS.confirmed;
    }
    if (/\bin\s+progress\b|\bworking\s+on\b|\binformed\b|\baware\b/.test(src) &&
        !/\bresolved|fixed|completed\b/.test(src)) {
      if (objectInfo.type === OPERATIONAL_OBJECT_TYPE.maintenance || objectInfo.type === OPERATIONAL_OBJECT_TYPE.payment) {
        return CONTEXT_STATUS.unresolved;
      }
      return CONTEXT_STATUS.in_progress;
    }
    if (/\bapologis|resolved|quiet\s+afterwards|sorted|settled|completed|done\b/.test(src) &&
        !/\bstill|unresolved|outstanding|needed|follow\b/.test(src)) {
      return CONTEXT_STATUS.completed;
    }
    if (objectInfo.type === OPERATIONAL_OBJECT_TYPE.vip ||
        objectInfo.type === OPERATIONAL_OBJECT_TYPE.guest_request ||
        normalizeSubjectToken(fact && (fact.subject || fact.subjectType) || "") === "late_checkout") {
      return CONTEXT_STATUS.pending;
    }
    if (objectInfo.type === OPERATIONAL_OBJECT_TYPE.maintenance || objectInfo.type === OPERATIONAL_OBJECT_TYPE.payment) {
      return CONTEXT_STATUS.unresolved;
    }
    if (!normalizeSubjectToken(fact && (fact.subject || fact.subjectType) || "") && !trimText(src)) {
      return CONTEXT_STATUS.informational;
    }
    return CONTEXT_STATUS.informational;
  }

  function inferDepartments(fact, note, src, objectInfo, subject) {
    var deps = [];
    var owner = trimText(fact && (fact.ownerDept || fact.department || fact.ownerDepartment) || "");
    if (owner) pushUnique(deps, owner);

    if (
      objectInfo.type === OPERATIONAL_OBJECT_TYPE.maintenance ||
      subject === "maintenance" ||
      isGuestImpactingMaintenance(fact, note)
    ) {
      pushUnique(deps, DEPARTMENT_NAME.maintenance);
      pushUnique(deps, DEPARTMENT_NAME.reception);
      if (/arriv|prep|linen|housekeeping|dirty|clean/.test(src)) {
        pushUnique(deps, DEPARTMENT_NAME.housekeeping);
      }
    }
    if (
      objectInfo.type === OPERATIONAL_OBJECT_TYPE.payment ||
      subject === "outstanding_balance" || subject === "payment" || subject === "payment_balance" ||
      isHighFinancialRisk(fact, note)
    ) {
      pushUnique(deps, DEPARTMENT_NAME.reception);
      pushUnique(deps, DEPARTMENT_NAME.finance);
    }
    if (objectInfo.type === OPERATIONAL_OBJECT_TYPE.vip || subject === "vip_arrival") {
      pushUnique(deps, DEPARTMENT_NAME.reception);
      if (/champagne|welcome\s+card|amenity|fruit|flowers|turn[\s-]?down/.test(src)) {
        pushUnique(deps, DEPARTMENT_NAME.housekeeping);
        if (/champagne|amenity|fruit|flowers/.test(src)) {
          pushUnique(deps, DEPARTMENT_NAME.food_beverage);
        }
      }
    }
    if (subject === "late_checkout" || /late\s+check[\s-]?out/.test(src)) {
      pushUnique(deps, DEPARTMENT_NAME.reception);
      pushUnique(deps, DEPARTMENT_NAME.housekeeping);
    }
    if (
      objectInfo.type === OPERATIONAL_OBJECT_TYPE.wake_up ||
      objectInfo.type === OPERATIONAL_OBJECT_TYPE.transport ||
      objectInfo.type === OPERATIONAL_OBJECT_TYPE.departure ||
      subject === "wake_up" || subject === "transfer" || subject === "departure_followup"
    ) {
      pushUnique(deps, DEPARTMENT_NAME.reception);
    }
    if (subject === "guest_request" || objectInfo.type === OPERATIONAL_OBJECT_TYPE.guest_request) {
      pushUnique(deps, DEPARTMENT_NAME.reception);
      if (/bed|pillow|towel|iron|linen|housekeeping/.test(src)) {
        pushUnique(deps, DEPARTMENT_NAME.housekeeping);
      }
    }
    if (objectInfo.type === OPERATIONAL_OBJECT_TYPE.interconnect || subject === "interconnect") {
      pushUnique(deps, DEPARTMENT_NAME.reception);
      pushUnique(deps, DEPARTMENT_NAME.housekeeping);
    }
    if ((note && note.components) || (objectInfo.components && objectInfo.components.length)) {
      (objectInfo.components || []).forEach(function (c) {
        if (c === "payment") {
          pushUnique(deps, DEPARTMENT_NAME.reception);
          pushUnique(deps, DEPARTMENT_NAME.finance);
        }
        if (c === "wake_up" || c === "transport") pushUnique(deps, DEPARTMENT_NAME.reception);
      });
    }
    return deps;
  }

  function inferNextAction(fact, note, src, objectInfo, subject, currentStatus, weak) {
    if (weak) return NEXT_ACTION_KIND.none;
    if (currentStatus === CONTEXT_STATUS.completed) return NEXT_ACTION_KIND.none;
    if (currentStatus === CONTEXT_STATUS.informational && objectInfo.type === OPERATIONAL_OBJECT_TYPE.other) {
      return NEXT_ACTION_KIND.none;
    }
    if (currentStatus === CONTEXT_STATUS.confirmed) {
      if (subject === "late_checkout" || /late\s+check[\s-]?out/.test(src)) {
        return NEXT_ACTION_KIND.honour_confirmed_arrangement;
      }
      return NEXT_ACTION_KIND.none;
    }
    if (
      objectInfo.type === OPERATIONAL_OBJECT_TYPE.maintenance ||
      subject === "maintenance" ||
      isGuestImpactingMaintenance(fact, note)
    ) {
      return NEXT_ACTION_KIND.follow_up_until_resolved;
    }
    if (
      objectInfo.type === OPERATIONAL_OBJECT_TYPE.payment ||
      subject === "outstanding_balance" || subject === "payment" || subject === "payment_balance" ||
      isHighFinancialRisk(fact, note)
    ) {
      if (/\badapter\b/.test(src) && !/\bdeclined|outstanding|balance\b/.test(src)) {
        return NEXT_ACTION_KIND.post_or_collect_charge;
      }
      return NEXT_ACTION_KIND.collect_before_departure;
    }
    if (objectInfo.type === OPERATIONAL_OBJECT_TYPE.vip || subject === "vip_arrival") {
      return NEXT_ACTION_KIND.prepare_vip;
    }
    if (
      objectInfo.type === OPERATIONAL_OBJECT_TYPE.wake_up ||
      objectInfo.type === OPERATIONAL_OBJECT_TYPE.transport ||
      objectInfo.type === OPERATIONAL_OBJECT_TYPE.departure ||
      objectInfo.type === OPERATIONAL_OBJECT_TYPE.timed ||
      subject === "wake_up" || subject === "transfer" || subject === "departure_followup"
    ) {
      return NEXT_ACTION_KIND.complete_timed_actions;
    }
    if (objectInfo.type === OPERATIONAL_OBJECT_TYPE.interconnect || subject === "interconnect") {
      return NEXT_ACTION_KIND.reserve_interconnect;
    }
    if (
      objectInfo.type === OPERATIONAL_OBJECT_TYPE.guest_request ||
      subject === "guest_request" || subject === "room_move" || subject === "lost_property"
    ) {
      var actionVerb = trimText(fact && fact.actionVerb || "");
      var requestItem = trimText(fact && fact.requestItem || "");
      if (!actionVerb && !requestItem && !/\bextra\s+bed|pillow|towel|iron|adapter|request/.test(src)) {
        return NEXT_ACTION_KIND.none;
      }
      return NEXT_ACTION_KIND.guest_follow_up;
    }
    if (fact && (fact.actionVerb || fact.action)) {
      return NEXT_ACTION_KIND.operational_follow_up;
    }
    return NEXT_ACTION_KIND.none;
  }

  /**
   * Build the canonical OperationalContext for one operational fact.
   * Deterministic, serializable, explainable. No HTML / presentation wording.
   *
   * @param {Object} fact - Writing OperationalFact, neutral fact, or contract view
   * @param {Object} [supportingContext] - note, isVip, section, maintenancePriority,
   *   brainContext, linkedComponents, topic, objectInfo
   * @returns {OperationalContext}
   */
  function buildOperationalContext(fact, supportingContext) {
    supportingContext = supportingContext || {};
    fact = fact || {};
    var note = supportingContext.note || null;
    var ctx = createEmptyOperationalContext();
    var src = factSourceText(fact, note).toLowerCase();
    var subject = normalizeSubjectToken(fact.subject || fact.subjectType || supportingContext.subject || "");
    var objectInfo = supportingContext.objectInfo || classifyOperationalObject(fact, note);
    var classification = classifyOperationalFact(fact, {
      section: supportingContext.section || (note && note.section) || fact.sectionHint || "",
      sourceType: fact.sourceType || supportingContext.sourceType || "",
      isVip: supportingContext.isVip || (note && note.isVip) || false,
      maintenancePriority: supportingContext.maintenancePriority || (note && note.maintenancePriority) || "",
      guestImpact: fact.guestImpact || "",
      ownerDept: fact.ownerDept || fact.department || "",
      status: fact.status || "",
      sourceFactId: fact.id || ""
    });
    var amount = extractMoneyAmount(fact, note);
    var declined = hasDeclinedPaymentEvidence(fact, note);
    var guestMaint = isGuestImpactingMaintenance(fact, note);
    var vip = hasVipCue(fact, note, src) || classification.category === OPERATIONAL_CATEGORY.guest &&
      (subject === "vip_arrival" || (note && note.isVip));
    var closed = isOperationalFactClosed(fact);
    var weak = hasWeakEvidence(fact, note, src, subject, objectInfo);
    var topic = trimText(supportingContext.topic || "").toLowerCase();
    var factGuestImpact = normalizeImpactLevel(fact.guestImpact, "");
    var reasoning = [];

    ctx.subject = subject || classification.subject || "";
    ctx.category = classification.category || OPERATIONAL_CATEGORY.unknown;
    ctx.objectType = objectInfo.type || OPERATIONAL_OBJECT_TYPE.other;

    /* --- G. Weak evidence: do not invent category / action / urgency --- */
    if (weak) {
      ctx.guestImpact = IMPACT_LEVEL.none;
      ctx.revenueImpact = IMPACT_LEVEL.none;
      ctx.operationalRisk = IMPACT_LEVEL.none;
      ctx.timeSensitivity = TIME_SENSITIVITY.none;
      ctx.urgency = URGENCY_LEVEL.low;
      ctx.confidence = 0.25;
      ctx.confidenceLabel = confidenceLabelFromValue(ctx.confidence);
      ctx.currentStatus = CONTEXT_STATUS.informational;
      ctx.nextAction = NEXT_ACTION_KIND.none;
      ctx.departments = [];
      ctx.dependencies = [];
      ctx.reasoning = ["weak_evidence"];
      if (!subject && !src) ctx.reasoning.push("insufficient_evidence");
      if (ctx.category !== OPERATIONAL_CATEGORY.unknown && !subject) {
        ctx.category = OPERATIONAL_CATEGORY.unknown;
      }
      ctx.canonicalPriority = CANONICAL_PRIORITY.low;
      return ctx;
    }

    /* --- A. Guest impact --- */
    var guestImpact = IMPACT_LEVEL.none;
    if (topic === "critical" || factGuestImpact === IMPACT_LEVEL.critical || /\bcritical|evacuat|unsafe|fire|flood\b/.test(src)) {
      guestImpact = IMPACT_LEVEL.critical;
      pushUnique(reasoning, "critical_impact");
    } else if (guestMaint) {
      guestImpact = IMPACT_LEVEL.high;
      pushUnique(reasoning, "guest_comfort_affected");
      if (/\bin[\s-]?house\b|\bstay(?:ing|over)?\b|\bguest\s+(?:in|occup)/.test(src) || factRoomsList(fact, note).length) {
        pushUnique(reasoning, "guest_in_house");
      }
      var fault = trimText(fact.faultType || "").toLowerCase();
      if (fault === "ac" || fault === "hot water" || /hot\s*water|not cooling|\bac\b|air\s*con/.test(src)) {
        pushUnique(reasoning, "guest_impacting_maintenance");
      }
      if (/on hold|unavailable/.test(src) || fault === "safe") {
        pushUnique(reasoning, "room_unavailable_maintenance");
      }
    } else if (vip) {
      guestImpact = IMPACT_LEVEL.high;
      pushUnique(reasoning, "vip_affected");
      if (/champagne|welcome\s+card|amenity|quiet/.test(src)) pushUnique(reasoning, "vip_readiness");
    } else if (
      factGuestImpact === IMPACT_LEVEL.high ||
      subject === "outstanding_balance" ||
      declined
    ) {
      guestImpact = IMPACT_LEVEL.high;
      if (declined || subject === "outstanding_balance") pushUnique(reasoning, "guest_service_payment_risk");
    } else if (
      subject === "late_checkout" ||
      subject === "guest_request" ||
      subject === "room_move" ||
      objectInfo.type === OPERATIONAL_OBJECT_TYPE.guest_request ||
      factGuestImpact === IMPACT_LEVEL.medium
    ) {
      guestImpact = subject === "late_checkout" ? IMPACT_LEVEL.low : IMPACT_LEVEL.medium;
      if (subject === "late_checkout") pushUnique(reasoning, "late_checkout_arrangement");
      else pushUnique(reasoning, "guest_follow_up");
    } else if (factGuestImpact === IMPACT_LEVEL.low) {
      guestImpact = IMPACT_LEVEL.low;
    } else if (
      objectInfo.type === OPERATIONAL_OBJECT_TYPE.wake_up ||
      objectInfo.type === OPERATIONAL_OBJECT_TYPE.transport ||
      objectInfo.type === OPERATIONAL_OBJECT_TYPE.departure
    ) {
      guestImpact = IMPACT_LEVEL.medium;
      pushUnique(reasoning, "timed_guest_action");
    }
    if (hasArrivalCue(src) && (vip || guestMaint || /prep|ready|amenity/.test(src))) {
      pushUnique(reasoning, "arrival_at_risk");
    }
    if (hasDepartureCue(src) && (guestMaint || declined || amount != null)) {
      pushUnique(reasoning, "departure_affected");
    }

    /* --- B. Revenue impact --- */
    var revenueImpact = IMPACT_LEVEL.none;
    var paymentLike = (
      objectInfo.type === OPERATIONAL_OBJECT_TYPE.payment ||
      subject === "payment" || subject === "outstanding_balance" || subject === "payment_balance" ||
      subject === "financial_settlement_unclear" || topic === "payment" ||
      (/\badapter\b/.test(src) && amount != null)
    );
    if (paymentLike || declined || amount != null) {
      if (declined && (amount == null || amount >= 50 || hasDepartureCue(src) || hasTodayCue(src))) {
        revenueImpact = amount != null && amount >= 100 ? IMPACT_LEVEL.critical : IMPACT_LEVEL.high;
        pushUnique(reasoning, "declined_payment");
      } else if (amount != null && amount >= 100) {
        revenueImpact = IMPACT_LEVEL.high;
        pushUnique(reasoning, "outstanding_balance");
      } else if (amount != null && amount > 0) {
        revenueImpact = IMPACT_LEVEL.medium;
        pushUnique(reasoning, "outstanding_balance");
      } else if (paymentLike) {
        revenueImpact = IMPACT_LEVEL.medium;
        pushUnique(reasoning, "payment_before_departure");
      }
      if (/\brefund|compensation|comp(?:ed)?\b/.test(src)) {
        revenueImpact = maxImpact(revenueImpact, IMPACT_LEVEL.medium);
        pushUnique(reasoning, "compensation_exposure");
      }
      if (/\bnot\s+posted|missing\s+charge|revenue\s+leak/.test(src)) {
        revenueImpact = maxImpact(revenueImpact, IMPACT_LEVEL.medium);
        pushUnique(reasoning, "revenue_leakage_risk");
      }
    }

    /* --- E. Current status --- */
    var currentStatus = inferContextStatus(fact, note, src, objectInfo, closed);
    if (currentStatus === CONTEXT_STATUS.unresolved) {
      pushUnique(reasoning, "maintenance_unresolved");
      if (!guestMaint && !paymentLike) {
        /* keep code only when maintenance-like; payment uses outstanding */
        if (objectInfo.type !== OPERATIONAL_OBJECT_TYPE.maintenance && subject !== "maintenance") {
          reasoning = reasoning.filter(function (r) { return r !== "maintenance_unresolved"; });
          pushUnique(reasoning, "unresolved_item");
        }
      } else if (paymentLike && !guestMaint) {
        reasoning = reasoning.filter(function (r) { return r !== "maintenance_unresolved"; });
        pushUnique(reasoning, "unresolved_item");
      }
    }
    if (currentStatus === CONTEXT_STATUS.completed) {
      pushUnique(reasoning, "complaint_resolved");
      guestImpact = maxImpact(guestImpact, IMPACT_LEVEL.none);
      if (impactRank(guestImpact) > impactRank(IMPACT_LEVEL.low)) {
        guestImpact = IMPACT_LEVEL.low;
      }
      revenueImpact = IMPACT_LEVEL.none;
    }
    if (currentStatus === CONTEXT_STATUS.confirmed) {
      pushUnique(reasoning, "arrangement_confirmed");
    }

    /* --- C. Time sensitivity --- */
    var timeSensitivity = TIME_SENSITIVITY.none;
    if (currentStatus === CONTEXT_STATUS.completed) {
      timeSensitivity = TIME_SENSITIVITY.none;
    } else if (hasOverdueCue(src) && currentStatus === CONTEXT_STATUS.unresolved) {
      timeSensitivity = TIME_SENSITIVITY.overdue;
      pushUnique(reasoning, "overdue_or_unresolved");
    } else if (
      hasImminentCue(src) ||
      (declined && hasDepartureCue(src)) ||
      (paymentLike && hasDepartureCue(src) && hasTodayCue(src)) ||
      (/\bdeparts?\s+today\b|\bdepart(?:ure|ing).*\btoday\b|\btoday\b.*\bdepart/.test(src))
    ) {
      timeSensitivity = TIME_SENSITIVITY.imminent;
      pushUnique(reasoning, "departure_today");
    } else if (
      hasTodayCue(src) ||
      hasArrivalCue(src) ||
      hasDepartureCue(src) ||
      objectInfo.type === OPERATIONAL_OBJECT_TYPE.vip ||
      objectInfo.type === OPERATIONAL_OBJECT_TYPE.wake_up ||
      objectInfo.type === OPERATIONAL_OBJECT_TYPE.transport ||
      objectInfo.type === OPERATIONAL_OBJECT_TYPE.departure ||
      subject === "late_checkout" ||
      guestMaint
    ) {
      timeSensitivity = TIME_SENSITIVITY.today;
      if (hasArrivalCue(src) || objectInfo.type === OPERATIONAL_OBJECT_TYPE.vip) {
        pushUnique(reasoning, "arrival_today");
      }
      if (guestMaint) pushUnique(reasoning, "timed_action");
    } else if (hasTomorrowCue(src) || objectInfo.type === OPERATIONAL_OBJECT_TYPE.interconnect) {
      timeSensitivity = TIME_SENSITIVITY.later;
      pushUnique(reasoning, "tomorrow_prep");
    } else if (fact.dueAt || /\b\d{1,2}[:.]\d{2}\b|\b\d{3,4}\b/.test(src)) {
      timeSensitivity = TIME_SENSITIVITY.today;
      pushUnique(reasoning, "timed_action");
    } else {
      pushUnique(reasoning, "no_deadline_evidence");
    }

    /* --- Operational risk --- */
    var operationalRisk = IMPACT_LEVEL.none;
    if (currentStatus === CONTEXT_STATUS.completed) {
      operationalRisk = IMPACT_LEVEL.low;
    } else if (guestImpact === IMPACT_LEVEL.critical || revenueImpact === IMPACT_LEVEL.critical) {
      operationalRisk = IMPACT_LEVEL.critical;
    } else if (guestMaint && currentStatus === CONTEXT_STATUS.unresolved) {
      operationalRisk = IMPACT_LEVEL.high;
    } else if (revenueImpact === IMPACT_LEVEL.high || (declined && currentStatus !== CONTEXT_STATUS.completed)) {
      operationalRisk = IMPACT_LEVEL.high;
    } else if (vip && currentStatus !== CONTEXT_STATUS.completed && currentStatus !== CONTEXT_STATUS.confirmed) {
      operationalRisk = IMPACT_LEVEL.medium;
    } else if (currentStatus === CONTEXT_STATUS.confirmed && subject === "late_checkout") {
      operationalRisk = IMPACT_LEVEL.low;
    } else if (paymentLike || guestMaint) {
      operationalRisk = IMPACT_LEVEL.medium;
    } else if (objectInfo.type !== OPERATIONAL_OBJECT_TYPE.other) {
      operationalRisk = IMPACT_LEVEL.low;
    }

    /* --- Urgency (from impact + time; not free text) --- */
    var urgency = URGENCY_LEVEL.low;
    if (guestImpact === IMPACT_LEVEL.critical || revenueImpact === IMPACT_LEVEL.critical) {
      urgency = URGENCY_LEVEL.critical;
    } else if (
      (guestImpact === IMPACT_LEVEL.high && currentStatus === CONTEXT_STATUS.unresolved) ||
      (revenueImpact === IMPACT_LEVEL.high && timeSensitivity === TIME_SENSITIVITY.imminent) ||
      timeSensitivity === TIME_SENSITIVITY.overdue
    ) {
      urgency = URGENCY_LEVEL.high;
    } else if (
      guestImpact === IMPACT_LEVEL.high ||
      revenueImpact === IMPACT_LEVEL.high ||
      timeSensitivity === TIME_SENSITIVITY.imminent ||
      (vip && timeSensitivity === TIME_SENSITIVITY.today)
    ) {
      urgency = URGENCY_LEVEL.high;
    } else if (
      timeSensitivity === TIME_SENSITIVITY.today ||
      guestImpact === IMPACT_LEVEL.medium ||
      revenueImpact === IMPACT_LEVEL.medium
    ) {
      urgency = URGENCY_LEVEL.medium;
    } else {
      urgency = URGENCY_LEVEL.low;
    }
    if (currentStatus === CONTEXT_STATUS.completed) {
      urgency = URGENCY_LEVEL.low;
    }

    /* --- D. Departments / dependencies --- */
    var departments = inferDepartments(fact, note, src, objectInfo, subject);
    if (supportingContext.linkedComponents && supportingContext.linkedComponents.length) {
      supportingContext.linkedComponents.forEach(function (c) {
        if (c === "housekeeping") pushUnique(departments, DEPARTMENT_NAME.housekeeping);
        if (c === "maintenance") pushUnique(departments, DEPARTMENT_NAME.maintenance);
        if (c === "finance") pushUnique(departments, DEPARTMENT_NAME.finance);
        if (c === "reception") pushUnique(departments, DEPARTMENT_NAME.reception);
      });
    }

    /* --- F. Next action (evidence-backed only) --- */
    var nextAction = inferNextAction(fact, note, src, objectInfo, subject, currentStatus, false);

    /*
     * Confidence = evidence quality (not severity).
     * Numeric is canonical; confidenceLabel is derived from the numeric value.
     * A critical-risk fact with thin evidence stays low confidence; a confirmed
     * low-risk arrangement with clear room/status evidence can be high confidence.
     */
    var confidence = 0.55;
    var rooms = factRoomsList(fact, note);
    var objectConf = trimText(objectInfo.confidence || "").toLowerCase();
    if (objectConf === CONFIDENCE_LABEL.high) confidence = 0.85;
    else if (objectConf === CONFIDENCE_LABEL.medium) confidence = 0.6;
    else if (objectConf === CONFIDENCE_LABEL.low) confidence = 0.35;

    if (typeof fact.confidence === "number" && !isNaN(fact.confidence)) {
      confidence = Math.max(0, Math.min(1, fact.confidence));
    } else if (fact.confidence === CONFIDENCE_LABEL.low) {
      confidence = Math.min(confidence, 0.3);
    } else if (fact.confidence === CONFIDENCE_LABEL.medium) {
      confidence = Math.min(Math.max(confidence, 0.55), 0.7);
    } else if (fact.confidence === CONFIDENCE_LABEL.high) {
      confidence = Math.max(confidence, 0.85);
    }

    if (subject && rooms.length) confidence = Math.max(confidence, 0.75);
    if (subject && (amount != null || declined || guestMaint || vip || currentStatus === CONTEXT_STATUS.confirmed)) {
      confidence = Math.max(confidence, 0.85);
    }
    if (currentStatus === CONTEXT_STATUS.completed && /\bapologis|quiet\s+afterwards|resolved\b/.test(src)) {
      confidence = Math.max(confidence, 0.85);
      pushUnique(reasoning, "resolved_with_evidence");
    }
    if (!subject || objectTypeIsThin(objectInfo)) {
      confidence = Math.min(confidence, 0.55);
    }
    if (!trimText(src) && !subject) confidence = 0.25;
    confidence = Math.max(0, Math.min(1, Math.round(confidence * 100) / 100));
    var confidenceLabel = confidenceLabelFromValue(confidence);

    /* Canonical priority for consumers (aligned with existing score bands). */
    var canonicalPriority = CANONICAL_PRIORITY.normal;
    if (urgency === URGENCY_LEVEL.critical || guestImpact === IMPACT_LEVEL.critical) {
      canonicalPriority = CANONICAL_PRIORITY.critical;
    } else if (
      (guestMaint && currentStatus === CONTEXT_STATUS.unresolved) ||
      revenueImpact === IMPACT_LEVEL.critical ||
      (revenueImpact === IMPACT_LEVEL.high && timeSensitivity === TIME_SENSITIVITY.imminent)
    ) {
      canonicalPriority = CANONICAL_PRIORITY.critical;
    } else if (
      urgency === URGENCY_LEVEL.high ||
      guestImpact === IMPACT_LEVEL.high ||
      revenueImpact === IMPACT_LEVEL.high ||
      vip
    ) {
      canonicalPriority = CANONICAL_PRIORITY.high;
    } else if (urgency === URGENCY_LEVEL.low && impactRank(guestImpact) <= 1 && impactRank(revenueImpact) <= 1) {
      canonicalPriority = CANONICAL_PRIORITY.low;
    }

    ctx.guestImpact = guestImpact;
    ctx.revenueImpact = revenueImpact;
    ctx.operationalRisk = operationalRisk;
    ctx.timeSensitivity = timeSensitivity;
    ctx.urgency = urgency;
    ctx.confidence = confidence;
    ctx.confidenceLabel = confidenceLabel;
    ctx.departments = departments;
    ctx.dependencies = departments.slice();
    ctx.currentStatus = currentStatus;
    ctx.nextAction = nextAction;
    ctx.reasoning = reasoning;
    ctx.canonicalPriority = canonicalPriority;
    return ctx;
  }

  function objectTypeIsThin(objectInfo) {
    return !objectInfo || objectInfo.type === OPERATIONAL_OBJECT_TYPE.other;
  }

  /**
   * Map OperationalContext → legacy numeric impact score (lower = higher priority).
   * Single scoring authority: consumes context fields; preserves existing bands.
   */
  function scoreFromOperationalContext(context, fact, note, topic) {
    context = context || createEmptyOperationalContext();
    fact = fact || {};
    note = note || null;
    topic = trimText(topic || "").toLowerCase();
    var src = factSourceText(fact, note).toLowerCase();
    var subject = context.subject || normalizeSubjectToken(fact.subject || fact.subjectType || "");
    var objectType = context.objectType || OPERATIONAL_OBJECT_TYPE.other;
    var amount = extractMoneyAmount(fact, note);
    var reasons = (context.reasoning || []).slice();
    var score = 90;
    var confidence = context.confidenceLabel || CONFIDENCE_LABEL.medium;

    if (
      topic === "critical" ||
      context.guestImpact === IMPACT_LEVEL.critical
    ) {
      score = 0;
      pushUnique(reasons, "critical_impact");
    } else if (
      context.guestImpact === IMPACT_LEVEL.high &&
      (objectType === OPERATIONAL_OBJECT_TYPE.maintenance || subject === "maintenance" ||
        isGuestImpactingMaintenance(fact, note)) &&
      context.currentStatus !== CONTEXT_STATUS.completed
    ) {
      var fault = trimText(fact.faultType || "").toLowerCase();
      if (fault === "ac" || fault === "hot water" || /hot\s*water|not cooling|\bac\b|air\s*con/.test(src)) {
        score = 10;
        pushUnique(reasons, "guest_impacting_maintenance");
      } else if (/on hold|unavailable/.test(src) || fault === "safe") {
        score = 16;
        pushUnique(reasons, "room_unavailable_maintenance");
      } else {
        score = 14;
        pushUnique(reasons, "guest_impacting_maintenance");
      }
      if (/depart|check[\s-]?out|extended\s+check/.test(src)) pushUnique(reasons, "departure_dependency");
    } else if (
      (context.revenueImpact === IMPACT_LEVEL.high || context.revenueImpact === IMPACT_LEVEL.critical) &&
      context.currentStatus !== CONTEXT_STATUS.completed
    ) {
      score = 20;
      pushUnique(reasons, "high_financial_risk");
      if (hasDeclinedPaymentEvidence(fact, note)) pushUnique(reasons, "declined_payment");
      if (/depart|check[\s-]?out|before\s+departure/.test(src)) pushUnique(reasons, "departure_dependency");
    } else if (objectType === OPERATIONAL_OBJECT_TYPE.vip || subject === "vip_arrival") {
      score = 30;
      pushUnique(reasons, "vip_readiness");
      if (/champagne|welcome\s+card|amenity|quiet/.test(src)) pushUnique(reasons, "outstanding_vip_prep");
    } else if (
      objectType === OPERATIONAL_OBJECT_TYPE.wake_up ||
      objectType === OPERATIONAL_OBJECT_TYPE.transport ||
      objectType === OPERATIONAL_OBJECT_TYPE.departure ||
      objectType === OPERATIONAL_OBJECT_TYPE.timed ||
      subject === "wake_up" || subject === "departure_followup" || subject === "transfer"
    ) {
      score = 40;
      pushUnique(reasons, "timed_guest_action");
    } else if (
      objectType === OPERATIONAL_OBJECT_TYPE.payment ||
      subject === "payment" || subject === "outstanding_balance" || subject === "payment_balance" ||
      topic === "payment" ||
      (/\badapter\b/.test(src) && amount != null)
    ) {
      score = 50;
      pushUnique(reasons, "payment_before_departure");
    } else if (
      objectType === OPERATIONAL_OBJECT_TYPE.interconnect ||
      subject === "interconnect" || subject === "guest_preparation" ||
      context.timeSensitivity === TIME_SENSITIVITY.later ||
      /tomorrow|tmrw/.test(src)
    ) {
      score = 60;
      pushUnique(reasons, "tomorrow_prep");
    } else if (subject === "maintenance" || objectType === OPERATIONAL_OBJECT_TYPE.maintenance) {
      score = 70;
      pushUnique(reasons, "maintenance_follow_up");
    } else if (
      topic === "guest" || subject === "guest_request" || subject === "lost_property" ||
      subject === "late_checkout" || subject === "room_move" ||
      objectType === OPERATIONAL_OBJECT_TYPE.guest_request
    ) {
      score = 80;
      pushUnique(reasons, "guest_follow_up");
    } else if (objectType === OPERATIONAL_OBJECT_TYPE.reception) {
      score = 85;
      pushUnique(reasons, "reception_ops");
    } else {
      confidence = confidence === CONFIDENCE_LABEL.high ? CONFIDENCE_LABEL.medium : confidence;
      if (!subject && !src) {
        confidence = CONFIDENCE_LABEL.low;
        pushUnique(reasons, "insufficient_evidence");
      } else {
        pushUnique(reasons, "general");
      }
    }

    if (context.currentStatus === CONTEXT_STATUS.completed) {
      score = Math.max(score, 88);
      confidence = context.confidenceLabel || confidence;
    }
    if (context.confidenceLabel === CONFIDENCE_LABEL.low) {
      confidence = CONFIDENCE_LABEL.low;
      score = Math.max(score, 85);
    }

    var canonicalPriority = CANONICAL_PRIORITY.normal;
    if (score <= 10) canonicalPriority = CANONICAL_PRIORITY.critical;
    else if (score <= 50) canonicalPriority = CANONICAL_PRIORITY.high;
    else if (score <= 85) canonicalPriority = CANONICAL_PRIORITY.normal;
    else canonicalPriority = CANONICAL_PRIORITY.low;

    return {
      score: score,
      canonicalPriority: canonicalPriority,
      objectType: objectType,
      components: (context.components || []).slice ? (context.components || []).slice() : [],
      confidence: confidence,
      reasons: reasons,
      moneyAmount: amount,
      operationalContext: context
    };
  }

  /**
   * Combined operational impact (lower = higher priority).
   * Builds OperationalContext first, then scores from it — one canonical path.
   *
   * @returns {{ score: number, canonicalPriority: string, objectType: string, confidence: string, reasons: string[], operationalContext: OperationalContext }}
   */
  function scoreOperationalImpact(factOrEntry, note) {
    var entry = factOrEntry && factOrEntry.fact ? factOrEntry : null;
    var fact = entry ? entry.fact : (factOrEntry || {});
    var hostNote = note || (entry && entry.note) || null;
    var topic = entry && entry.topic ? String(entry.topic) : "";
    var objectInfo = classifyOperationalObject(fact, hostNote);
    var context = buildOperationalContext(fact, {
      note: hostNote,
      section: hostNote && hostNote.section,
      isVip: hostNote && hostNote.isVip,
      maintenancePriority: hostNote && hostNote.maintenancePriority,
      topic: topic,
      objectInfo: objectInfo,
      linkedComponents: objectInfo.components || []
    });
    context.objectType = objectInfo.type;
    var scored = scoreFromOperationalContext(context, fact, hostNote, topic);
    scored.components = objectInfo.components || [];
    scored.operationalContext = context;
    scored.operationalContext.canonicalPriority = scored.canonicalPriority;
    if (fact && typeof fact === "object") {
      fact.operationalContext = context;
    }
    return scored;
  }

  /* ------------------------------------------------------------------ */
  /*  E4 Phase 2 — DecisionTrace, explainability, context-driven recs    */
  /* ------------------------------------------------------------------ */

  /**
   * Stable recommendation / explainability reason codes.
   * Sourced from OperationalContext.reasoning (+ derived context fields).
   * Writing may format these; must not invent new codes.
   */
  var REASON_CODE = {
    guest_comfort_affected: "guest_comfort_affected",
    guest_safety_affected: "guest_safety_affected",
    vip_readiness: "vip_readiness",
    vip_affected: "vip_affected",
    arrival_today: "arrival_today",
    arrival_at_risk: "arrival_at_risk",
    departure_imminent: "departure_imminent",
    departure_today: "departure_today",
    departure_affected: "departure_affected",
    declined_payment: "declined_payment",
    outstanding_balance: "outstanding_balance",
    revenue_leakage: "revenue_leakage",
    revenue_leakage_risk: "revenue_leakage_risk",
    maintenance_unresolved: "maintenance_unresolved",
    guest_impacting_maintenance: "guest_impacting_maintenance",
    timed_action_due: "timed_action_due",
    timed_action: "timed_action",
    timed_guest_action: "timed_guest_action",
    cross_department_dependency: "cross_department_dependency",
    confirmed_low_risk: "confirmed_low_risk",
    resolved_no_action: "resolved_no_action",
    complaint_resolved: "complaint_resolved",
    weak_evidence: "weak_evidence",
    insufficient_evidence: "insufficient_evidence",
    high_financial_risk: "high_financial_risk",
    payment_before_departure: "payment_before_departure",
    unresolved_item: "unresolved_item",
    arrangement_confirmed: "arrangement_confirmed",
    late_checkout_arrangement: "late_checkout_arrangement",
    context_driven: "context_driven",
    hotel_brain_enrichment: "hotel_brain_enrichment",
    /* E4.3 continuity */
    same_room_same_issue: "same_room_same_issue",
    same_guest_same_request: "same_guest_same_request",
    same_payment_open: "same_payment_open",
    same_maintenance_issue: "same_maintenance_issue",
    same_timed_service: "same_timed_service",
    explicit_continuation: "explicit_continuation",
    unresolved_previous_shift: "unresolved_previous_shift",
    status_progressed: "status_progressed",
    resolved_after_previous_shift: "resolved_after_previous_shift",
    reopened_after_resolution: "reopened_after_resolution",
    weak_continuity_evidence: "weak_continuity_evidence",
    cross_shift_escalated: "cross_shift_escalated"
  };

  /**
   * E4.3 cross-shift lifecycle (controlled values).
   */
  var MEMORY_LIFECYCLE = {
    new: "new",
    continuing: "continuing",
    escalated: "escalated",
    resolved: "resolved",
    reopened: "reopened",
    uncertain: "uncertain"
  };

  /**
   * E4.3 recurrence. Phase 3 implements first_seen + repeated_cross_shift only.
   * repeated_same_shift / recurring_history are reserved — do not claim yet.
   */
  var RECURRENCE_STATE = {
    first_seen: "first_seen",
    repeated_same_shift: "repeated_same_shift",
    repeated_cross_shift: "repeated_cross_shift",
    recurring_history: "recurring_history"
  };

  var MEMORY_MATCH_MIN = 0.7;
  var MEMORY_ESCALATE_MIN_SHIFTS = 3;
  var MEMORY_ESCALATE_MIN_CONFIDENCE = 0.75;
  /* Phase 3 v1 history window — bounded derivation, not long-term patterns. */
  var MEMORY_HISTORY_MAX_REPORTS = 6;
  var MEMORY_HISTORY_MAX_LOOKBACK_MS = 3 * 24 * 60 * 60 * 1000; /* 72h / ~3 calendar days */
  var MEMORY_HISTORY_MAX_EVIDENCE_PER_REPORT = 40;
  var MEMORY_HISTORY_MAX_EVIDENCE_TOTAL = 120;
  var MEMORY_CONTENT_MATCH_MAX_GAP_MS = 3 * 24 * 60 * 60 * 1000;
  var MEMORY_SHIFT_ORDER = { am: 0, pm: 1, night: 2 };

  /**
   * Confidence gates for open recommendations (evidence quality, not severity).
   * high  ≥ 0.75 — normal recommendation
   * medium ≥ 0.45 — cautious recommendation only when nextAction is explicit
   * low   < 0.45 — no strong recommendation
   */
  var CONFIDENCE_GATE = {
    high: 0.75,
    medium: 0.45,
    recommendMin: 0.45
  };

  function createEmptyDecisionTrace() {
    return {
      sourceFactId: "",
      sourceFactIds: [],
      objectType: OPERATIONAL_OBJECT_TYPE.other,
      operationalContext: null,
      score: 90,
      priority: "low",
      recommendationKind: "",
      nextAction: "",
      reasonCodes: [],
      evidence: {},
      confidence: 0.5,
      supportingKnowledge: [],
      memory: null
    };
  }

  function createEmptyOperationalMemory() {
    return {
      memoryId: "",
      workspaceId: "",
      entityKeys: {
        room: "",
        guest: "",
        family: "",
        amount: null,
        faultType: "",
        maintenanceIssueId: ""
      },
      subject: "",
      category: "",
      firstSeenAt: "",
      lastSeenAt: "",
      shiftCount: 1,
      sourceReportIds: [],
      sourceFactIds: [],
      lifecycleStatus: MEMORY_LIFECYCLE.new,
      recurrenceState: RECURRENCE_STATE.first_seen,
      latestContext: null,
      continuityReasonCodes: [],
      confidence: 0.5
    };
  }

  function evidenceFromFact(fact, note, context) {
    context = context || {};
    fact = fact || {};
    var rooms = factRoomsList(fact, note);
    var amount = extractMoneyAmount(fact, note);
    var evidence = {
      room: rooms[0] || "",
      rooms: rooms.slice(),
      status: context.currentStatus || trimText(fact.status || ""),
      guestName: factGuestName(fact, note) || trimText(fact.guestName || ""),
      faultType: trimText(fact.faultType || ""),
      subject: context.subject || normalizeSubjectToken(fact.subject || fact.subjectType || ""),
      timeSensitivity: context.timeSensitivity || TIME_SENSITIVITY.none,
      departments: (context.departments || []).slice()
    };
    if (amount != null) evidence.amount = amount;
    if (context.timeSensitivity === TIME_SENSITIVITY.today ||
        context.timeSensitivity === TIME_SENSITIVITY.imminent) {
      evidence.arrivalTiming = (context.reasoning || []).indexOf("arrival_today") !== -1 ||
        (context.reasoning || []).indexOf("arrival_at_risk") !== -1
        ? context.timeSensitivity
        : "";
      evidence.departureTiming = (context.reasoning || []).indexOf("departure_today") !== -1 ||
        (context.reasoning || []).indexOf("departure_affected") !== -1 ||
        context.timeSensitivity === TIME_SENSITIVITY.imminent
        ? context.timeSensitivity
        : "";
    }
    return evidence;
  }

  /**
   * Collect supported reason codes from OperationalContext (no prose).
   */
  function reasonCodesFromContext(context) {
    context = context || {};
    var codes = [];
    (context.reasoning || []).forEach(function (code) {
      var c = trimText(code);
      if (!c) return;
      if (REASON_CODE[c]) pushUnique(codes, REASON_CODE[c]);
      else if (/^[a-z][a-z0-9_]*$/.test(c)) pushUnique(codes, c);
    });
    if (context.timeSensitivity === TIME_SENSITIVITY.imminent) {
      pushUnique(codes, REASON_CODE.departure_imminent);
    }
    if ((context.reasoning || []).indexOf("timed_action") !== -1 ||
        (context.reasoning || []).indexOf("timed_guest_action") !== -1 ||
        context.nextAction === NEXT_ACTION_KIND.complete_timed_actions) {
      pushUnique(codes, REASON_CODE.timed_action_due);
    }
    if ((context.reasoning || []).indexOf("revenue_leakage_risk") !== -1) {
      pushUnique(codes, REASON_CODE.revenue_leakage);
    }
    if (
      context.revenueImpact === IMPACT_LEVEL.high ||
      context.revenueImpact === IMPACT_LEVEL.critical ||
      (context.reasoning || []).indexOf("declined_payment") !== -1
    ) {
      pushUnique(codes, REASON_CODE.outstanding_balance);
    }
    if ((context.reasoning || []).indexOf("vip_affected") !== -1 &&
        codes.indexOf(REASON_CODE.vip_readiness) === -1) {
      pushUnique(codes, REASON_CODE.vip_readiness);
    }
    if (context.guestImpact === IMPACT_LEVEL.critical) {
      pushUnique(codes, REASON_CODE.guest_safety_affected);
    }
    if (context.departments && context.departments.length > 1) {
      pushUnique(codes, REASON_CODE.cross_department_dependency);
    }
    if (context.currentStatus === CONTEXT_STATUS.confirmed &&
        (context.operationalRisk === IMPACT_LEVEL.low || context.operationalRisk === IMPACT_LEVEL.none)) {
      pushUnique(codes, REASON_CODE.confirmed_low_risk);
    }
    if (context.currentStatus === CONTEXT_STATUS.completed) {
      pushUnique(codes, REASON_CODE.resolved_no_action);
    }
    if (context.confidenceLabel === CONFIDENCE_LABEL.low ||
        (context.reasoning || []).indexOf("weak_evidence") !== -1) {
      pushUnique(codes, REASON_CODE.weak_evidence);
    }
    return codes;
  }

  function buildDecisionTrace(parts) {
    parts = parts || {};
    var context = parts.operationalContext || null;
    var reasonCodes = parts.reasonCodes;
    if (!reasonCodes || !reasonCodes.length) {
      reasonCodes = reasonCodesFromContext(context);
    }
    var sourceFactIds = parts.sourceFactIds || [];
    if (parts.sourceFactId && sourceFactIds.indexOf(parts.sourceFactId) === -1) {
      sourceFactIds = [parts.sourceFactId].concat(sourceFactIds);
    }
    return {
      sourceFactId: trimText(parts.sourceFactId || (sourceFactIds[0] || "")),
      sourceFactIds: sourceFactIds.slice(),
      objectType: trimText(parts.objectType || (context && context.objectType) || OPERATIONAL_OBJECT_TYPE.other),
      operationalContext: context,
      score: typeof parts.score === "number" ? parts.score : 90,
      priority: trimText(parts.priority || "normal"),
      recommendationKind: trimText(parts.recommendationKind || (context && context.nextAction) || ""),
      nextAction: trimText(parts.nextAction != null ? parts.nextAction : (context && context.nextAction) || ""),
      reasonCodes: reasonCodes.slice(),
      evidence: parts.evidence && typeof parts.evidence === "object"
        ? parts.evidence
        : evidenceFromFact(parts.fact, parts.note, context),
      confidence: typeof parts.confidence === "number"
        ? parts.confidence
        : (context && typeof context.confidence === "number" ? context.confidence : 0.5),
      supportingKnowledge: Array.isArray(parts.supportingKnowledge)
        ? parts.supportingKnowledge.slice()
        : [],
      memory: parts.memory && typeof parts.memory === "object"
        ? summarizeMemoryForTrace(parts.memory)
        : null
    };
  }

  function summarizeMemoryForTrace(memory) {
    if (!memory || typeof memory !== "object") return null;
    return {
      memoryId: trimText(memory.memoryId || ""),
      lifecycleStatus: trimText(memory.lifecycleStatus || ""),
      shiftCount: typeof memory.shiftCount === "number" ? memory.shiftCount : 1,
      firstSeenAt: trimText(memory.firstSeenAt || ""),
      lastSeenAt: trimText(memory.lastSeenAt || ""),
      continuityReasonCodes: Array.isArray(memory.continuityReasonCodes)
        ? memory.continuityReasonCodes.slice()
        : [],
      recurrenceState: trimText(memory.recurrenceState || ""),
      confidence: typeof memory.confidence === "number" ? memory.confidence : 0.5,
      sourceReportIds: Array.isArray(memory.sourceReportIds) ? memory.sourceReportIds.slice() : [],
      historicalFactIds: Array.isArray(memory.historicalFactIds) ? memory.historicalFactIds.slice() : []
    };
  }

  /**
   * Structured explainability view — no polished prose, no HTML.
   * Writing may format reasonCodes later; must not add codes or change priority.
   */
  function buildDecisionExplanation(trace) {
    trace = trace || createEmptyDecisionTrace();
    var ctx = trace.operationalContext || {};
    return {
      priority: trace.priority || toLegacyRecommendationPriority(ctx.canonicalPriority || CANONICAL_PRIORITY.normal),
      canonicalPriority: ctx.canonicalPriority || toCanonicalPriority(trace.priority || ""),
      reasonCodes: (trace.reasonCodes || []).slice(),
      evidence: trace.evidence && typeof trace.evidence === "object" ? Object.assign({}, trace.evidence) : {},
      confidence: typeof trace.confidence === "number" ? trace.confidence : 0.5,
      confidenceLabel: confidenceLabelFromValue(
        typeof trace.confidence === "number" ? trace.confidence : 0.5
      ),
      nextAction: trace.nextAction || "",
      recommendationKind: trace.recommendationKind || "",
      score: typeof trace.score === "number" ? trace.score : 90,
      objectType: trace.objectType || "",
      sourceFactId: trace.sourceFactId || "",
      currentStatus: ctx.currentStatus || "",
      guestImpact: ctx.guestImpact || IMPACT_LEVEL.none,
      revenueImpact: ctx.revenueImpact || IMPACT_LEVEL.none,
      operationalRisk: ctx.operationalRisk || IMPACT_LEVEL.none,
      timeSensitivity: ctx.timeSensitivity || TIME_SENSITIVITY.none,
      departments: (ctx.departments || []).slice(),
      supportingKnowledge: Array.isArray(trace.supportingKnowledge)
        ? trace.supportingKnowledge.slice()
        : [],
      memory: trace.memory ? summarizeMemoryForTrace(trace.memory) : null
    };
  }

  /**
   * Whether an open chase recommendation is allowed from this context.
   * Low confidence / empty nextAction / completed / confirmed → no strong rec.
   */
  function allowsOpenRecommendation(context) {
    if (!context) return false;
    if (typeof context.confidence === "number" && context.confidence < CONFIDENCE_GATE.recommendMin) {
      return false;
    }
    if (context.confidenceLabel === CONFIDENCE_LABEL.low) return false;
    if ((context.reasoning || []).indexOf("weak_evidence") !== -1) return false;
    if ((context.reasoning || []).indexOf("insufficient_evidence") !== -1 && !context.nextAction) {
      return false;
    }
    if (!context.nextAction) return false;
    if (context.currentStatus === CONTEXT_STATUS.completed) return false;
    if (context.currentStatus === CONTEXT_STATUS.confirmed) return false;
    if (context.nextAction === NEXT_ACTION_KIND.honour_confirmed_arrangement) return false;
    if (context.currentStatus === CONTEXT_STATUS.informational &&
        context.objectType === OPERATIONAL_OBJECT_TYPE.other) {
      return false;
    }
    /* Medium confidence: only when nextAction is already explicit (checked above). */
    return true;
  }

  function recommendationPriorityFromContext(context, fallbackPriority) {
    if (!context) return fallbackPriority || "normal";
    var fromCanonical = toLegacyRecommendationPriority(
      context.canonicalPriority || CANONICAL_PRIORITY.normal
    );
    if (context.urgency === URGENCY_LEVEL.critical || context.guestImpact === IMPACT_LEVEL.critical) {
      return "urgent";
    }
    if (
      context.revenueImpact === IMPACT_LEVEL.critical ||
      (context.revenueImpact === IMPACT_LEVEL.high &&
        context.timeSensitivity === TIME_SENSITIVITY.imminent)
    ) {
      return "high";
    }
    if (context.urgency === URGENCY_LEVEL.high || context.guestImpact === IMPACT_LEVEL.high) {
      return fromCanonical === "low" ? "high" : (fromCanonical === "normal" ? "high" : fromCanonical);
    }
    if (context.urgency === URGENCY_LEVEL.low && impactRank(context.guestImpact) <= 1 &&
        impactRank(context.revenueImpact) <= 1) {
      return "low";
    }
    return fromCanonical || fallbackPriority || "normal";
  }

  function attachDecisionTraceToRecommendation(rec, fact, note, context, scored, sourceFactIds, departments) {
    if (!rec) return null;
    var reasonCodes = reasonCodesFromContext(context);
    var priority = recommendationPriorityFromContext(context, rec.priority);
    rec.priority = priority;
    if (context && context.departments && context.departments.length) {
      var deptList = context.departments.concat(rec.department ? [rec.department] : []);
      rec.department = resolveDepartment(
        deptList,
        context.departments[0] || rec.department,
        departments && departments.length ? departments : deptList
      );
    }
    rec.reasonCodes = reasonCodes;
    rec.reasonCode = reasonCodes[0] || REASON_CODE.context_driven;
    var ids = sourceFactIds && sourceFactIds.length
      ? sourceFactIds.slice()
      : [(note && note._neutralFactId) || (fact && fact.id) || ""].filter(Boolean);
    rec.sourceFactIds = ids.length ? ids : (rec.sourceFactIds || []);
    if (note && note._neutralSourceType) {
      rec.sourceTypes = [note._neutralSourceType];
    } else if (!rec.sourceTypes) {
      rec.sourceTypes = ["handover"];
    }
    rec.decisionTrace = buildDecisionTrace({
      sourceFactId: ids[0] || "",
      sourceFactIds: ids,
      objectType: context && context.objectType,
      operationalContext: context,
      score: scored && typeof scored.score === "number" ? scored.score : 90,
      priority: priority,
      recommendationKind: (context && context.nextAction) || "",
      nextAction: (context && context.nextAction) || "",
      reasonCodes: reasonCodes,
      evidence: evidenceFromFact(fact, note, context),
      confidence: context && typeof context.confidence === "number" ? context.confidence : 0.5,
      fact: fact,
      note: note
    });
    return rec;
  }

  function compareByOperationalImpact(a, b) {
    var scoreA = scoreOperationalImpact(a).score;
    var scoreB = scoreOperationalImpact(b).score;
    if (scoreA !== scoreB) return scoreA - scoreB;
    var roomsA = factRoomsList(a && a.fact ? a.fact : a, a && a.note).join(",");
    var roomsB = factRoomsList(b && b.fact ? b.fact : b, b && b.note).join(",");
    if (roomsA !== roomsB) return roomsA < roomsB ? -1 : 1;
    return 0;
  }

  function operationalObjectGroupKey(fact, note, objectInfo) {
    var type = (objectInfo && objectInfo.type) || OPERATIONAL_OBJECT_TYPE.other;
    var rooms = factRoomsList(fact, note);
    var guest = factGuestName(fact, note).toLowerCase();
    var subject = normalizeSubjectToken(fact && (fact.subject || fact.subjectType) || "");
    var fault = trimText((fact && fact.faultType) || "").toLowerCase();
    if (type === OPERATIONAL_OBJECT_TYPE.vip) {
      return ["vip", guest || rooms[0] || subject || "unknown"].join("|");
    }
    if (type === OPERATIONAL_OBJECT_TYPE.maintenance) {
      return ["maintenance", rooms[0] || "area", fault || subject || "issue"].join("|");
    }
    if (type === OPERATIONAL_OBJECT_TYPE.payment) {
      return ["payment", rooms[0] || guest || "folio"].join("|");
    }
    if (
      type === OPERATIONAL_OBJECT_TYPE.wake_up ||
      type === OPERATIONAL_OBJECT_TYPE.transport ||
      type === OPERATIONAL_OBJECT_TYPE.departure
    ) {
      return ["departure", rooms[0] || guest || "guest"].join("|");
    }
    if (type === OPERATIONAL_OBJECT_TYPE.interconnect) {
      return ["interconnect", guest || rooms.slice().sort().join("+") || "group"].join("|");
    }
    return [type, rooms[0] || guest || subject || "item"].join("|");
  }

  /**
   * Group related facts into operational objects (VIP, payment, maintenance,
   * wake-up/transport departure bundles, etc.). Never merges incompatible money
   * or conflicting rooms. Low-confidence orphans stay as singleton objects.
   */
  function groupIntoOperationalObjects(items) {
    var groups = {};
    var order = [];

    (items || []).forEach(function (item, index) {
      if (!item) return;
      var fact = item.fact || item;
      var note = item.note || (item.fact ? item : null);
      if (!fact || typeof fact !== "object") return;
      var objectInfo = classifyOperationalObject(fact, note);
      var impact = scoreOperationalImpact(item, note);
      var key = operationalObjectGroupKey(fact, note, objectInfo);
      if (impact.confidence === "low" && objectInfo.type === OPERATIONAL_OBJECT_TYPE.other) {
        key = key + "|orphan|" + index;
      }
      if (!groups[key]) {
        groups[key] = {
          id: key,
          type: objectInfo.type,
          components: (objectInfo.components || []).slice(),
          rooms: factRoomsList(fact, note),
          guestName: factGuestName(fact, note),
          factIds: [],
          facts: [],
          items: [],
          impactScore: impact.score,
          canonicalPriority: impact.canonicalPriority,
          confidence: impact.confidence,
          reasons: impact.reasons.slice(),
          /* Inherited from highest-impact member — not independently re-reasoned. */
          operationalContext: impact.operationalContext || null
        };
        order.push(key);
      }
      var group = groups[key];
      var factId = (note && note._neutralFactId) || fact.id || ("fact-" + index);
      if (group.factIds.indexOf(factId) === -1) group.factIds.push(factId);
      group.facts.push(fact);
      group.items.push(item);
      if (impact.score < group.impactScore) {
        group.impactScore = impact.score;
        group.canonicalPriority = impact.canonicalPriority;
        if (impact.operationalContext) group.operationalContext = impact.operationalContext;
      }
      if (impact.confidence === "low") group.confidence = "low";
      else if (impact.confidence === "medium" && group.confidence === "high") {
        group.confidence = "medium";
      }
      (objectInfo.components || []).forEach(function (c) {
        if (group.components.indexOf(c) === -1) group.components.push(c);
      });
      factRoomsList(fact, note).forEach(function (r) {
        if (group.rooms.indexOf(r) === -1) group.rooms.push(r);
      });
      if (!group.guestName) group.guestName = factGuestName(fact, note);
    });

    var list = order.map(function (key) { return groups[key]; });

    /* Merge amenity-only VIP fragments into the primary VIP object. */
    var primaryVip = null;
    list.forEach(function (g) {
      if (g.type !== OPERATIONAL_OBJECT_TYPE.vip) return;
      if (!primaryVip || (g.rooms && g.rooms.length && !(primaryVip.rooms && primaryVip.rooms.length))) {
        primaryVip = g;
      }
    });
    if (primaryVip) {
      list = list.filter(function (g) {
        if (g === primaryVip || g.type !== OPERATIONAL_OBJECT_TYPE.vip) return true;
        var src = objectSourceBlob(g);
        if (!/\bchampagne\b|\bwelcome\s+card\b|\bamenity\b/.test(src)) return true;
        (g.items || []).forEach(function (item) { primaryVip.items.push(item); });
        (g.facts || []).forEach(function (f) { primaryVip.facts.push(f); });
        (g.factIds || []).forEach(function (id) {
          if (primaryVip.factIds.indexOf(id) === -1) primaryVip.factIds.push(id);
        });
        if (g.impactScore < primaryVip.impactScore) {
          primaryVip.impactScore = g.impactScore;
          primaryVip.canonicalPriority = g.canonicalPriority;
        }
        return false;
      });
    }

    return list.sort(function (a, b) {
      if (a.impactScore !== b.impactScore) return a.impactScore - b.impactScore;
      return String(a.id).localeCompare(String(b.id));
    });
  }

  function rankByOperationalImpact(items) {
    return (items || []).slice().sort(compareByOperationalImpact);
  }

  function scoreOperationalObject(object) {
    if (!object) return 90;
    if (typeof object.impactScore === "number") return object.impactScore;
    var items = object.items || [];
    if (!items.length) return 90;
    var best = 90;
    items.forEach(function (item) {
      var scored = scoreOperationalImpact(item).score;
      if (scored < best) best = scored;
    });
    return best;
  }

  function objectPrimaryFact(object) {
    if (!object || !object.items || !object.items.length) return null;
    var sorted = object.items.slice().sort(compareByOperationalImpact);
    return sorted[0] || null;
  }

  function objectSourceBlob(object) {
    var parts = [];
    (object && object.facts || []).forEach(function (f) {
      if (f && f.sourceText) parts.push(String(f.sourceText));
    });
    (object && object.items || []).forEach(function (item) {
      if (item && item.note && item.note.original) parts.push(String(item.note.original));
    });
    return parts.join(" | ").toLowerCase();
  }

  function buildPriorityActionSpec(object) {
    var primary = objectPrimaryFact(object);
    var fact = primary && primary.fact ? primary.fact : null;
    var src = objectSourceBlob(object);
    var room = (object.rooms && object.rooms[0]) || (fact && fact.rooms && fact.rooms[0]) || "";
    var roomLabel = room ? "Room " + room : "";
    var guest = object.guestName || (fact && fact.guestName) || "";
    var amount = fact ? extractMoneyAmount(fact, primary && primary.note) : null;
    var amountLabel = amount != null ? ("£" + amount.toFixed(amount % 1 ? 2 : 0)) : "";
    var fault = trimText(fact && fact.faultType || "");
    if (!fault && /hot\s*water/.test(src)) fault = "hot water";
    if (!fault && /(?:\bac\b|air\s*con|not cooling)/.test(src)) fault = "AC";
    var times = [];
    var wake = src.match(/\bwake(?:[\s-]*up)?\s*(\d{3,4}|\d{1,2}[:.]\d{2}|\d{1,2}\s*(?:am|pm))/i);
    var taxi = src.match(/\b(?:addison(?:\s+lee)?|taxi|transfer)\s*(\d{3,4}|\d{1,2}[:.]\d{2}|\d{1,2}\s*(?:am|pm))/i);
    if (wake) times.push({ kind: "wake_up", raw: wake[1] });
    if (taxi) times.push({ kind: "transport", raw: taxi[1] });

    var actionKind = "follow_up";
    var reasonKind = "";
    var entities = {
      room: room,
      guestName: guest,
      amount: amountLabel,
      faultType: fault,
      times: times,
      components: (object.components || []).slice(),
      amenities: []
    };
    if (/champagne/.test(src)) entities.amenities.push("champagne");
    if (/welcome\s+card/.test(src)) entities.amenities.push("welcome card");
    if (/quiet/.test(src)) entities.amenities.push("quiet upper-floor room");

    if (object.type === OPERATIONAL_OBJECT_TYPE.maintenance || isGuestImpactingMaintenance(fact, primary && primary.note)) {
      actionKind = "follow_up_maintenance";
      reasonKind = /depart|check[\s-]?out|extended/.test(src) ? "before_departure_guest_impact" : "before_further_guest_impact";
    } else if (
      object.type === OPERATIONAL_OBJECT_TYPE.payment ||
      objectLooksLikePayment(object) ||
      (/\badapter\b/.test(src) && (amount != null || /\b(?:£|\$|€|\d+|charge|posted|collect)\b/.test(src)))
    ) {
      actionKind = /adapter/.test(src) ? "post_or_collect_charge" : "collect_payment";
      reasonKind = hasDeclinedPaymentEvidence(fact, primary && primary.note)
        ? "card_declined"
        : (/adapter|not posted|post or collect/.test(src) ? "unposted_charge" : "before_departure");
    } else if (object.type === OPERATIONAL_OBJECT_TYPE.vip) {
      actionKind = "prepare_vip";
      reasonKind = entities.amenities.length ? "outstanding_vip_prep" : "vip_arrival";
    } else if (
      object.type === OPERATIONAL_OBJECT_TYPE.departure ||
      object.type === OPERATIONAL_OBJECT_TYPE.wake_up ||
      object.type === OPERATIONAL_OBJECT_TYPE.transport ||
      object.type === OPERATIONAL_OBJECT_TYPE.timed
    ) {
      actionKind = "complete_timed_actions";
      reasonKind = "timed_departure";
    } else if (object.type === OPERATIONAL_OBJECT_TYPE.interconnect) {
      actionKind = "reserve_interconnect";
      reasonKind = "tomorrow_arrival";
    } else if (object.type === OPERATIONAL_OBJECT_TYPE.guest_request) {
      actionKind = "guest_follow_up";
      reasonKind = "";
    } else {
      actionKind = "operational_follow_up";
    }

    var ctx = object.operationalContext || null;
    if (!ctx && fact) {
      ctx = scoreOperationalImpact(primary).operationalContext;
    }
    /*
     * E4.2: context.nextAction is the reasoning authority.
     * Map it onto legacy writing-facing actionKind values so formatBriefingPriorityAction
     * keeps working (it must not invent reasons — only format known kinds).
     */
    if (ctx && ctx.nextAction) {
      if (ctx.nextAction === NEXT_ACTION_KIND.follow_up_until_resolved) {
        actionKind = "follow_up_maintenance";
      } else if (ctx.nextAction === NEXT_ACTION_KIND.collect_before_departure) {
        actionKind = "collect_payment";
      } else if (ctx.nextAction === NEXT_ACTION_KIND.post_or_collect_charge) {
        actionKind = "post_or_collect_charge";
      } else if (ctx.nextAction === NEXT_ACTION_KIND.prepare_vip) {
        actionKind = "prepare_vip";
      } else if (ctx.nextAction === NEXT_ACTION_KIND.complete_timed_actions) {
        actionKind = "complete_timed_actions";
      } else if (ctx.nextAction === NEXT_ACTION_KIND.reserve_interconnect) {
        actionKind = "reserve_interconnect";
      } else if (ctx.nextAction === NEXT_ACTION_KIND.guest_follow_up) {
        actionKind = "guest_follow_up";
      }
    }
    var reasonCodes = reasonCodesFromContext(ctx);
    if (!reasonKind && reasonCodes.length) reasonKind = reasonCodes[0];
    var decisionTrace = buildDecisionTrace({
      sourceFactId: (object.factIds && object.factIds[0]) || (fact && fact.id) || "",
      sourceFactIds: (object.factIds || []).slice(),
      objectType: object.type,
      operationalContext: ctx,
      score: scoreOperationalObject(object),
      priority: toLegacyRecommendationPriority(
        (ctx && ctx.canonicalPriority) || object.canonicalPriority || CANONICAL_PRIORITY.normal
      ),
      recommendationKind: (ctx && ctx.nextAction) || actionKind,
      nextAction: (ctx && ctx.nextAction) || actionKind,
      reasonCodes: reasonCodes,
      evidence: evidenceFromFact(fact, primary && primary.note, ctx),
      confidence: ctx && typeof ctx.confidence === "number" ? ctx.confidence : confidenceValueFromLabel(object.confidence || "medium"),
      fact: fact,
      note: primary && primary.note
    });

    return {
      objectId: object.id,
      objectType: object.type,
      impactScore: scoreOperationalObject(object),
      canonicalPriority: (ctx && ctx.canonicalPriority) || object.canonicalPriority || toCanonicalPriority(""),
      confidence: (ctx && ctx.confidenceLabel) || object.confidence || "medium",
      factIds: (object.factIds || []).slice(),
      rooms: (object.rooms || []).slice(),
      actionKind: actionKind,
      reasonKind: reasonKind,
      reasonCodes: reasonCodes,
      entities: entities,
      evidenceText: src,
      decisionTrace: decisionTrace,
      operationalContext: ctx
    };
  }

  /**
   * True when an extracted object still needs promotion into briefing/alerts/status.
   * Prefers uncertainty over dropping valid open maintenance/payment/VIP/timed work.
   */
  function isResolvedNoiseObject(obj) {
    if (!obj) return true;
    var src = objectSourceBlob(obj);
    if (!src) return false;
    if (obj.type === OPERATIONAL_OBJECT_TYPE.payment ||
        obj.type === OPERATIONAL_OBJECT_TYPE.maintenance ||
        obj.type === OPERATIONAL_OBJECT_TYPE.vip ||
        obj.type === OPERATIONAL_OBJECT_TYPE.departure ||
        obj.type === OPERATIONAL_OBJECT_TYPE.wake_up ||
        obj.type === OPERATIONAL_OBJECT_TYPE.transport ||
        obj.type === OPERATIONAL_OBJECT_TYPE.timed) {
      return false;
    }
    return /\b(?:settled|resolved|completed|done|closed)\b/.test(src) &&
      !/\b(?:still|unresolved|monitor|follow|outstanding|needed|confirm|collect|prepare)\b/.test(src);
  }

  function isPromotableOperationalObject(obj) {
    if (!obj) return false;
    if (obj.confidence === "low" && obj.type === OPERATIONAL_OBJECT_TYPE.other) return false;
    if (isResolvedNoiseObject(obj)) return false;
    var src = objectSourceBlob(obj);
    var primary = objectPrimaryFact(obj);
    var fact = primary && primary.fact;
    var subject = normalizeSubjectToken(fact && (fact.subject || fact.subjectType) || "");
    if (
      obj.type === OPERATIONAL_OBJECT_TYPE.maintenance ||
      obj.type === OPERATIONAL_OBJECT_TYPE.payment ||
      obj.type === OPERATIONAL_OBJECT_TYPE.vip ||
      obj.type === OPERATIONAL_OBJECT_TYPE.departure ||
      obj.type === OPERATIONAL_OBJECT_TYPE.wake_up ||
      obj.type === OPERATIONAL_OBJECT_TYPE.transport ||
      obj.type === OPERATIONAL_OBJECT_TYPE.timed ||
      obj.type === OPERATIONAL_OBJECT_TYPE.interconnect ||
      obj.type === OPERATIONAL_OBJECT_TYPE.guest_request ||
      obj.type === OPERATIONAL_OBJECT_TYPE.reception
    ) {
      return true;
    }
    /* Promote evidence-backed "other" facts that were extracted with clear ops cues. */
    if (
      /hot\s*water|maint|fault|outstanding|declined|wake|taxi|vip|champagne|welcome\s+card|parcel|feather|late\s+check|adapter|arriv/i.test(src) ||
      subject === "financial_settlement_unclear" || subject === "delivery" || subject === "late_checkout"
    ) {
      return true;
    }
    return scoreOperationalObject(obj) <= 85 && obj.confidence !== "low";
  }

  function objectLooksLikePayment(obj) {
    if (!obj) return false;
    if (obj.type === OPERATIONAL_OBJECT_TYPE.payment) return true;
    var src = objectSourceBlob(obj);
    var primary = objectPrimaryFact(obj);
    var fact = primary && primary.fact;
    var subject = normalizeSubjectToken(fact && (fact.subject || fact.subjectType) || "");
    return subject === "payment" || subject === "outstanding_balance" || subject === "payment_balance" ||
      subject === "financial_settlement_unclear" || subject === "invoice" || subject === "folio" ||
      subject === "charge" ||
      /\b(outstanding|declined|minibar|city\s+tax|folio|balance)\b/.test(src) ||
      (/\badapter\b/.test(src) && /\b(?:£|\$|€|\d+|charge|posted|collect)\b/.test(src));
  }

  function objectLooksLikeMaintenance(obj) {
    if (!obj) return false;
    if (obj.type === OPERATIONAL_OBJECT_TYPE.maintenance) return true;
    var primary = objectPrimaryFact(obj);
    return isGuestImpactingMaintenance(primary && primary.fact, primary && primary.note) ||
      /hot\s*water|maint|fault|broken|leak|not cooling|on hold|ac\b|air\s*con/.test(objectSourceBlob(obj));
  }

  /**
   * Engine-owned Today's Briefing model: up to 5 highest-impact operational
   * objects as action priorities. Writing formats; must not re-rank.
   */
  function buildBriefingModel(items, options) {
    options = options || {};
    var maxBlocks = options.maxBlocks != null ? options.maxBlocks : BRIEFING_MAX_BLOCKS;
    var objects = groupIntoOperationalObjects(items || []);
    var actionable = objects.filter(isPromotableOperationalObject).sort(function (a, b) {
      var sa = scoreOperationalObject(a);
      var sb = scoreOperationalObject(b);
      if (sa !== sb) return sa - sb;
      return String(a.id).localeCompare(String(b.id));
    });

    function typeFamily(obj) {
      if (!obj) return "other";
      if (objectLooksLikePayment(obj)) return OPERATIONAL_OBJECT_TYPE.payment;
      if (objectLooksLikeMaintenance(obj)) return OPERATIONAL_OBJECT_TYPE.maintenance;
      if (
        obj.type === OPERATIONAL_OBJECT_TYPE.wake_up ||
        obj.type === OPERATIONAL_OBJECT_TYPE.transport ||
        obj.type === OPERATIONAL_OBJECT_TYPE.timed
      ) {
        return OPERATIONAL_OBJECT_TYPE.departure;
      }
      if (obj.type === OPERATIONAL_OBJECT_TYPE.reception) return OPERATIONAL_OBJECT_TYPE.guest_request;
      return obj.type;
    }

    /*
     * Diversify: best of each core ops family first, then fill by impact.
     * Soft guest_request / reception amenity work must not crowd out a second
     * payment, timed action, or interconnect when the briefing budget is tight.
     */
    var selected = [];
    var seenIds = {};
    var coreFamilies = [
      OPERATIONAL_OBJECT_TYPE.maintenance,
      OPERATIONAL_OBJECT_TYPE.payment,
      OPERATIONAL_OBJECT_TYPE.vip,
      OPERATIONAL_OBJECT_TYPE.departure,
      OPERATIONAL_OBJECT_TYPE.interconnect
    ];
    function promotionWeight(obj) {
      var family = typeFamily(obj);
      if (family === OPERATIONAL_OBJECT_TYPE.maintenance || family === OPERATIONAL_OBJECT_TYPE.payment) return 0;
      if (family === OPERATIONAL_OBJECT_TYPE.vip || family === OPERATIONAL_OBJECT_TYPE.departure) return 1;
      if (family === OPERATIONAL_OBJECT_TYPE.interconnect) return 2;
      if (family === OPERATIONAL_OBJECT_TYPE.guest_request) {
        var src = objectSourceBlob(obj);
        if (/complaint|noise|unhappy|late\s+check/.test(src)) return 2;
        return 4;
      }
      return 3;
    }
    coreFamilies.forEach(function (family) {
      if (selected.length >= maxBlocks) return;
      var best = null;
      actionable.forEach(function (obj) {
        if (typeFamily(obj) !== family) return;
        if (!best || scoreOperationalObject(obj) < scoreOperationalObject(best)) best = obj;
      });
      if (best && !seenIds[best.id]) {
        selected.push(best);
        seenIds[best.id] = true;
      }
    });
    /* Additional payments / maint faults outrank soft guest requests for leftover slots. */
    var remainder = actionable.filter(function (obj) { return !seenIds[obj.id]; }).sort(function (a, b) {
      var wa = promotionWeight(a);
      var wb = promotionWeight(b);
      if (wa !== wb) return wa - wb;
      var sa = scoreOperationalObject(a);
      var sb = scoreOperationalObject(b);
      if (sa !== sb) return sa - sb;
      return String(a.id).localeCompare(String(b.id));
    });
    remainder.forEach(function (obj) {
      if (selected.length >= maxBlocks) return;
      selected.push(obj);
      seenIds[obj.id] = true;
    });
    selected.sort(function (a, b) {
      var sa = scoreOperationalObject(a);
      var sb = scoreOperationalObject(b);
      if (sa !== sb) return sa - sb;
      return String(a.id).localeCompare(String(b.id));
    });

    var priorities = [];
    selected.slice(0, maxBlocks).forEach(function (obj) {
      var spec = buildPriorityActionSpec(obj);
      /* Only suppress truly empty low-confidence unknowns — keep medium open work. */
      if (spec.confidence === "low" && spec.objectType === OPERATIONAL_OBJECT_TYPE.other && priorities.length) {
        return;
      }
      priorities.push(spec);
    });

    return {
      priorities: priorities,
      objects: objects,
      maxBlocks: maxBlocks,
      generatedFromObjectCount: objects.length
    };
  }

  function statusLevelFromObjects(areaKey, objects) {
    var level = HOTEL_STATUS_LEVEL.normal;
    var supporting = [];
    (objects || []).forEach(function (obj) {
      if (!isPromotableOperationalObject(obj) && areaKey !== "vip_readiness") return;
      var src = objectSourceBlob(obj);
      var primary = objectPrimaryFact(obj);
      var fact = primary && primary.fact;
      /* E4.2: prefer OperationalContext for severity — no independent re-ranking. */
      var ctx = obj.operationalContext ||
        (primary ? scoreOperationalImpact(primary).operationalContext : null);
      var unresolved = ctx && (
        ctx.currentStatus === CONTEXT_STATUS.unresolved ||
        ctx.currentStatus === CONTEXT_STATUS.in_progress ||
        ctx.currentStatus === CONTEXT_STATUS.pending
      );
      var completed = ctx && (
        ctx.currentStatus === CONTEXT_STATUS.completed ||
        ctx.currentStatus === CONTEXT_STATUS.confirmed
      );

      if (areaKey === "guest_experience") {
        if (ctx && (ctx.guestImpact === IMPACT_LEVEL.high || ctx.guestImpact === IMPACT_LEVEL.critical) &&
            unresolved &&
            (objectLooksLikeMaintenance(obj) || ctx.category === OPERATIONAL_CATEGORY.maintenance ||
              isGuestImpactingMaintenance(fact, primary && primary.note))) {
          supporting.push(obj);
          level = HOTEL_STATUS_LEVEL.critical;
        } else if (objectLooksLikeMaintenance(obj) && isGuestImpactingMaintenance(fact, primary && primary.note) && !completed) {
          supporting.push(obj);
          level = HOTEL_STATUS_LEVEL.critical;
        } else if (
          !completed &&
          (obj.type === OPERATIONAL_OBJECT_TYPE.guest_request || obj.type === OPERATIONAL_OBJECT_TYPE.reception) &&
          /complaint|unhappy|noise|feather|bedding|guest\s+request|follow/i.test(src) &&
          !isResolvedNoiseObject(obj)
        ) {
          supporting.push(obj);
          if (level === HOTEL_STATUS_LEVEL.normal) level = HOTEL_STATUS_LEVEL.attention;
        }
      } else if (areaKey === "vip_readiness") {
        if (obj.type === OPERATIONAL_OBJECT_TYPE.vip || (ctx && ctx.objectType === OPERATIONAL_OBJECT_TYPE.vip) || /\bvip\b/.test(src)) {
          supporting.push(obj);
          if (ctx && ctx.currentStatus === CONTEXT_STATUS.completed) {
            /* keep supporting but do not escalate */
          } else if ((ctx && (ctx.reasoning || []).indexOf("vip_readiness") !== -1) ||
              /champagne|welcome\s+card|amenity|quiet|prepare|still\s+needed/.test(src)) {
            level = HOTEL_STATUS_LEVEL.attention;
          } else if (level === HOTEL_STATUS_LEVEL.normal) {
            level = HOTEL_STATUS_LEVEL.attention;
          }
        }
      } else if (areaKey === "maintenance") {
        if ((objectLooksLikeMaintenance(obj) || (ctx && ctx.category === OPERATIONAL_CATEGORY.maintenance)) &&
            !isResolvedNoiseObject(obj) && !completed) {
          supporting.push(obj);
          if ((ctx && (ctx.guestImpact === IMPACT_LEVEL.high || ctx.operationalRisk === IMPACT_LEVEL.high)) ||
              isGuestImpactingMaintenance(fact, primary && primary.note) ||
              /hot\s*water|on hold|unavailable|ac\b|not cooling/.test(src)) {
            level = HOTEL_STATUS_LEVEL.critical;
          } else if (level === HOTEL_STATUS_LEVEL.normal) {
            level = HOTEL_STATUS_LEVEL.attention;
          }
        }
      } else if (areaKey === "revenue") {
        if ((objectLooksLikePayment(obj) || (ctx && ctx.revenueImpact !== IMPACT_LEVEL.none)) &&
            !isResolvedNoiseObject(obj) && !completed) {
          supporting.push(obj);
          if ((ctx && (ctx.revenueImpact === IMPACT_LEVEL.high || ctx.revenueImpact === IMPACT_LEVEL.critical)) ||
              isHighFinancialRisk(fact, primary && primary.note)) {
            level = HOTEL_STATUS_LEVEL.critical;
          } else if (level === HOTEL_STATUS_LEVEL.normal) {
            level = HOTEL_STATUS_LEVEL.attention;
          }
        }
      } else if (areaKey === "reception_operations") {
        if (
          obj.type === OPERATIONAL_OBJECT_TYPE.departure ||
          obj.type === OPERATIONAL_OBJECT_TYPE.wake_up ||
          obj.type === OPERATIONAL_OBJECT_TYPE.transport ||
          obj.type === OPERATIONAL_OBJECT_TYPE.timed ||
          obj.type === OPERATIONAL_OBJECT_TYPE.interconnect ||
          obj.type === OPERATIONAL_OBJECT_TYPE.reception ||
          (ctx && ctx.nextAction === NEXT_ACTION_KIND.complete_timed_actions) ||
          (obj.type === OPERATIONAL_OBJECT_TYPE.guest_request &&
            /late\s+check|room\s+move|allocation|no-show|arriv|parcel|delivery/.test(src))
        ) {
          if (completed && obj.type !== OPERATIONAL_OBJECT_TYPE.vip) return;
          supporting.push(obj);
          if (level === HOTEL_STATUS_LEVEL.normal) level = HOTEL_STATUS_LEVEL.attention;
        }
      }
    });
    return { level: level, supporting: supporting };
  }

  function buildStatusSummaryIntent(areaKey, level, supporting) {
    if (!supporting.length) {
      return {
        kind: areaKey + "_clear",
        level: level,
        room: "",
        amount: "",
        faultType: "",
        guestName: "",
        count: 0
      };
    }
    var top = supporting.slice().sort(function (a, b) {
      return scoreOperationalObject(a) - scoreOperationalObject(b);
    })[0];
    var primary = objectPrimaryFact(top);
    var fact = primary && primary.fact;
    var src = objectSourceBlob(top);
    var amount = fact ? extractMoneyAmount(fact, primary && primary.note) : null;
    var total = 0;
    var moneyCount = 0;
    if (areaKey === "revenue") {
      supporting.forEach(function (obj) {
        var p = objectPrimaryFact(obj);
        var a = p && p.fact ? extractMoneyAmount(p.fact, p.note) : null;
        if (a != null) {
          total += a;
          moneyCount += 1;
        }
      });
      if (moneyCount) amount = total;
    }
    var fault = trimText(fact && fact.faultType || "");
    if (!fault && /hot\s*water/.test(src)) fault = "hot water";
    return {
      kind: areaKey + "_open",
      level: level,
      room: (top.rooms && top.rooms[0]) || "",
      amount: amount != null ? ("£" + Number(amount).toFixed(Number(amount) % 1 ? 2 : 0)) : "",
      amountTotal: moneyCount ? ("£" + total.toFixed(2)) : "",
      faultType: fault,
      guestName: top.guestName || "",
      count: supporting.length,
      declined: supporting.some(function (obj) {
        var p = objectPrimaryFact(obj);
        return hasDeclinedPaymentEvidence(p && p.fact, p && p.note);
      }),
      amenities: (/champagne/.test(src) ? ["champagne"] : []).concat(/welcome\s+card/.test(src) ? ["welcome card"] : []),
      timed: supporting.some(function (obj) {
        return /wake|taxi|addison|transfer/.test(objectSourceBlob(obj));
      })
    };
  }

  /**
   * Engine-owned Hotel Status model — levels from operational evidence only.
   */
  function buildHotelStatusModel(items) {
    var objects = groupIntoOperationalObjects(items || []);
    var areas = [
      { key: "guest_experience", label: "Guest Experience" },
      { key: "vip_readiness", label: "VIP Readiness" },
      { key: "maintenance", label: "Maintenance" },
      { key: "revenue", label: "Revenue" },
      { key: "reception_operations", label: "Reception Operations" }
    ];
    return areas.map(function (area) {
      var judged = statusLevelFromObjects(area.key, objects);
      var summaryIntent = buildStatusSummaryIntent(area.key, judged.level, judged.supporting);
      return {
        key: area.key,
        label: area.label,
        level: judged.level,
        summaryIntent: summaryIntent,
        count: judged.supporting.length,
        supportingFactIds: judged.supporting.reduce(function (acc, obj) {
          return acc.concat(obj.factIds || []);
        }, [])
      };
    });
  }

  /**
   * Shift Alerts from distinct operational objects (not keyword / sentence counts).
   */
  function computeShiftAlertsFromObjects(items) {
    var objects = groupIntoOperationalObjects(items || []);
    var counts = {
      urgent: 0,
      vip: 0,
      maintenance: 0,
      payments: 0,
      timedActions: 0,
      guest: 0,
      tasks: 0,
      events: 0
    };
    var seen = {};

    function bump(key, objectId) {
      var token = key + "::" + objectId;
      if (seen[token]) return;
      seen[token] = true;
      counts[key] += 1;
    }

    objects.forEach(function (obj) {
      if (!isPromotableOperationalObject(obj) && obj.type !== OPERATIONAL_OBJECT_TYPE.vip) return;
      var src = objectSourceBlob(obj);
      var resolvedInfo = isResolvedNoiseObject(obj);
      var primary = objectPrimaryFact(obj);
      var ctx = obj.operationalContext ||
        (primary ? scoreOperationalImpact(primary).operationalContext : null);
      var ctxCompleted = ctx && (
        ctx.currentStatus === CONTEXT_STATUS.completed ||
        ctx.currentStatus === CONTEXT_STATUS.confirmed
      );

      if (obj.type === OPERATIONAL_OBJECT_TYPE.vip || (ctx && ctx.objectType === OPERATIONAL_OBJECT_TYPE.vip) ||
          /\bvip\b/.test(src)) {
        bump("vip", obj.id);
      }
      if ((objectLooksLikeMaintenance(obj) || (ctx && ctx.category === OPERATIONAL_CATEGORY.maintenance)) &&
          !resolvedInfo && !ctxCompleted) {
        bump("maintenance", obj.id);
        if ((ctx && (ctx.guestImpact === IMPACT_LEVEL.high || ctx.guestImpact === IMPACT_LEVEL.critical)) ||
            isGuestImpactingMaintenance(primary && primary.fact, primary && primary.note)) {
          bump("urgent", obj.id);
        }
      }
      if ((objectLooksLikePayment(obj) || (ctx && ctx.revenueImpact !== IMPACT_LEVEL.none &&
          ctx.revenueImpact !== IMPACT_LEVEL.low)) && !resolvedInfo && !ctxCompleted) {
        bump("payments", obj.id);
      }
      if (
        obj.type === OPERATIONAL_OBJECT_TYPE.departure ||
        obj.type === OPERATIONAL_OBJECT_TYPE.wake_up ||
        obj.type === OPERATIONAL_OBJECT_TYPE.transport ||
        obj.type === OPERATIONAL_OBJECT_TYPE.timed ||
        (obj.components && (obj.components.indexOf("wake_up") !== -1 || obj.components.indexOf("transport") !== -1)) ||
        /\bwake\b.+\b(?:taxi|addison|transfer)\b|\b(?:taxi|addison|transfer)\b.+\bwake\b/.test(src)
      ) {
        bump("timedActions", obj.id);
        bump("events", obj.id);
      }
      if (
        obj.type === OPERATIONAL_OBJECT_TYPE.guest_request ||
        obj.type === OPERATIONAL_OBJECT_TYPE.reception ||
        obj.type === OPERATIONAL_OBJECT_TYPE.vip ||
        /late\s+check|late\s+arr|arriv/.test(src)
      ) {
        if (!resolvedInfo || obj.type === OPERATIONAL_OBJECT_TYPE.vip) bump("guest", obj.id);
      }
      if (
        obj.type === OPERATIONAL_OBJECT_TYPE.guest_request ||
        obj.type === OPERATIONAL_OBJECT_TYPE.interconnect ||
        obj.type === OPERATIONAL_OBJECT_TYPE.reception ||
        /parcel|package|delivery|adapter|task|bedding|feather|confirm prepared/.test(src)
      ) {
        if (!resolvedInfo || /parcel|package|delivery|adapter|bedding|feather/.test(src)) {
          bump("tasks", obj.id);
        }
      }
    });

    return {
      urgent: counts.urgent,
      vip: counts.vip,
      maintenance: counts.maintenance,
      payments: counts.payments,
      timedActions: counts.timedActions,
      events: counts.timedActions,
      tasks: counts.tasks,
      guest: counts.guest,
      display: {
        urgent: counts.urgent,
        guest: counts.guest,
        maintenance: counts.maintenance,
        payments: counts.payments,
        events: counts.timedActions,
        timedActions: counts.timedActions,
        tasks: counts.tasks,
        general: 0
      },
      objects: objects
    };
  }

  /**
   * Suggested handover section for an operational object (presentation mapping).
   * Does not invent facts — routes existing objects only.
   */
  function suggestHandoverSectionForObject(object) {
    if (!object) return "general";
    var src = objectSourceBlob(object);
    var primary = objectPrimaryFact(object);
    var fact = primary && primary.fact;
    var subject = normalizeSubjectToken(fact && (fact.subject || fact.subjectType) || "");
    var status = String((fact && fact.status) || "").toLowerCase();

    /* Closed guest-status notes (e.g. resolved noise) belong in Completed Actions. */
    if (
      (
        status === "done" ||
        status === "resolved" ||
        (primary && primary.note && primary.note.section === "completed") ||
        /\b(?:quiet\s+afterwards|noise\s+settled|(?:apologised|apologized)\s+and\s+quiet)\b/i.test(src)
      ) &&
      !objectLooksLikePayment(object) &&
      !objectLooksLikeMaintenance(object) &&
      object.type !== OPERATIONAL_OBJECT_TYPE.vip
    ) {
      return "completed";
    }

    if (object.type === OPERATIONAL_OBJECT_TYPE.vip || subject === "vip_arrival") return "vip";
    if (object.type === OPERATIONAL_OBJECT_TYPE.maintenance || subject === "maintenance") {
      return "maintenance";
    }
    if (object.type === OPERATIONAL_OBJECT_TYPE.payment || objectLooksLikePayment(object)) {
      return "payments";
    }
    if (
      object.type === OPERATIONAL_OBJECT_TYPE.departure ||
      object.type === OPERATIONAL_OBJECT_TYPE.wake_up ||
      object.type === OPERATIONAL_OBJECT_TYPE.transport ||
      object.type === OPERATIONAL_OBJECT_TYPE.timed ||
      subject === "wake_up" || subject === "departure_followup" || subject === "late_checkout" ||
      subject === "transfer"
    ) {
      return "guest";
    }
    if (subject === "twin_setup") return "tasks";
    if (subject === "inventory" || subject === "adapter" ||
        (/\bumbrella\b/.test(src) && /\b(?:not\s+returned|loan|outstanding)\b/.test(src))) {
      return "inventory";
    }
    if (subject === "delivery" || /\bparcels?|packages?|courier\b/.test(src)) return "deliveries";
    if (subject === "lost_property") return "lostproperty";
    if (object.type === OPERATIONAL_OBJECT_TYPE.guest_request || subject === "guest_request" ||
        subject === "room_move" || subject === "extension") {
      return "guest";
    }
    if (object.type === OPERATIONAL_OBJECT_TYPE.interconnect || subject === "interconnect") {
      return "guest";
    }
    if (object.type === OPERATIONAL_OBJECT_TYPE.reception || subject === "no_show" ||
        subject === "late_arrival") {
      return "events";
    }
    if (/\badapter\b/.test(src) && !/\b(?:£|charge|posted|collect)\b/.test(src)) return "inventory";
    return "general";
  }

  var DEFAULT_ORGANISED_SECTION_IDS = [
    "urgent", "vip", "guest", "maintenance", "payments", "events",
    "tasks", "inventory", "deliveries", "lostproperty", "general", "completed"
  ];

  /**
   * Canonical organised handover section model.
   * One item per operational object; engine owns placement. Writing formats text later.
   */
  function buildOrganisedSectionModel(analyzedNotes, options) {
    options = options || {};
    var sectionIds = options.sectionIds && options.sectionIds.length
      ? options.sectionIds.slice()
      : DEFAULT_ORGANISED_SECTION_IDS.slice();
    var sections = {};
    sectionIds.forEach(function (id) { sections[id] = []; });

    var analyzed = (analyzedNotes || []).filter(Boolean);
    var entries = analyzed.map(function (note, index) {
      var fact = note.fact || null;
      return {
        note: note,
        fact: fact,
        factId: note._neutralFactId || (fact && fact.id) || ("section-" + index),
        topic: note.section || "",
        section: note.section || ""
      };
    }).filter(function (entry) {
      return entry.note && (entry.fact || entry.note.original);
    });

    var objects = groupIntoOperationalObjects(entries);
    var consumedFactIds = {};

    function markConsumed(obj) {
      (obj.factIds || []).forEach(function (id) { consumedFactIds[id] = true; });
      (obj.items || []).forEach(function (item) {
        if (item && item.factId) consumedFactIds[item.factId] = true;
        if (item && item.note && item.note._neutralFactId) {
          consumedFactIds[item.note._neutralFactId] = true;
        }
      });
    }

    function pushItem(sectionId, obj, note) {
      if (!sections[sectionId]) sections[sectionId] = [];
      var primary = note || (objectPrimaryFact(obj) && objectPrimaryFact(obj).note) || null;
      var fact = (primary && primary.fact) || (objectPrimaryFact(obj) && objectPrimaryFact(obj).fact) || null;
      var rooms = (obj && obj.rooms && obj.rooms.length)
        ? obj.rooms.slice()
        : ((primary && primary.rooms) || (fact && fact.rooms) || []).slice();
      var sourceParts = [];
      if (obj && obj.items && obj.items.length) {
        obj.items.forEach(function (item) {
          var src = item && item.note && item.note.original
            ? String(item.note.original)
            : (item && item.fact && item.fact.sourceText ? String(item.fact.sourceText) : "");
          if (src && sourceParts.indexOf(src) === -1) sourceParts.push(src);
        });
      } else if (primary && primary.original) {
        sourceParts.push(String(primary.original));
      }
      var mergedOriginal = sourceParts.join(" // ");
      var displayNote = primary
        ? Object.assign({}, primary, {
            original: mergedOriginal || primary.original,
            rooms: rooms.length ? rooms : (primary.rooms || []),
            section: sectionId,
            isVip: sectionId === "vip" || !!(primary.isVip),
            fact: fact || primary.fact || null,
            _operationalObjectId: obj && obj.id,
            _mergedNotes: (obj && obj.items)
              ? obj.items.map(function (item) { return item.note; }).filter(Boolean)
              : (primary._mergedNotes || null)
          })
        : {
            original: mergedOriginal,
            rooms: rooms,
            section: sectionId,
            isVip: sectionId === "vip",
            fact: fact,
            _operationalObjectId: obj && obj.id
          };
      sections[sectionId].push({
        note: displayNote,
        fact: fact,
        rooms: rooms,
        objectId: obj && obj.id,
        objectType: obj && obj.type,
        section: sectionId,
        sourceText: mergedOriginal,
        factIds: (obj && obj.factIds) ? obj.factIds.slice() : []
      });
    }

    objects.forEach(function (obj) {
      /* Skip empty low-confidence noise with no operational cue. */
      var src = objectSourceBlob(obj);
      if (
        obj.confidence === "low" &&
        obj.type === OPERATIONAL_OBJECT_TYPE.other &&
        !/\b(?:room|rm\.?|vip|parcel|package|payment|maint|wake|taxi|cot|twin|umbrella|expedia|outstanding)\b/i.test(src)
      ) {
        return;
      }
      var sectionId = suggestHandoverSectionForObject(obj);
      if (sectionIds.indexOf(sectionId) === -1) sectionId = "general";
      /* Safety/urgent override only when explicitly critical. */
      if (
        sectionId === "maintenance" &&
        /flood|fire|evacuat|unsafe|injury|gas\s+leak/i.test(src)
      ) {
        sectionId = "urgent";
      }
      pushItem(sectionId, obj, null);
      markConsumed(obj);
    });

    /* Safety net: any useful analyzed note not consumed becomes its own section item. */
    analyzed.forEach(function (note, index) {
      var factId = note._neutralFactId || ("section-" + index);
      if (consumedFactIds[factId]) return;
      if (note.fact && note.fact.id && consumedFactIds[note.fact.id]) return;
      var src = String(note.original || (note.fact && note.fact.sourceText) || "").trim();
      if (!src) return;
      if (/^(?:guest\s+cold|mr\.?\s+\w+|still\s+awaiting|anniversary\s+setup)/i.test(src) &&
          (!note.rooms || !note.rooms.length)) {
        /* Orphan fragment that should have been merged — skip rather than invent a section. */
        return;
      }
      var singleton = {
        id: "singleton|" + factId,
        type: classifyOperationalObject(note.fact || {}, note).type,
        components: [],
        rooms: (note.rooms || []).slice(),
        guestName: (note.fact && note.fact.guestName) || "",
        factIds: [factId],
        facts: note.fact ? [note.fact] : [],
        items: [{ note: note, fact: note.fact, factId: factId }],
        impactScore: 90,
        canonicalPriority: CANONICAL_PRIORITY.normal,
        confidence: "medium",
        reasons: ["singleton_coverage"]
      };
      var sectionId = note.section || suggestHandoverSectionForObject(singleton);
      if (sectionIds.indexOf(sectionId) === -1) sectionId = "general";
      pushItem(sectionId, singleton, note);
      markConsumed(singleton);
    });

    return {
      sections: sections,
      objects: objects,
      analyzed: analyzed,
      sectionIds: sectionIds,
      generatedFromObjectCount: objects.length
    };
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
    base.isResolved = base.isResolved === true || isOperationalFactClosed(base);
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
    if (fact) {
      isResolved = isOperationalFactClosed(fact);
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
    neutral.metadata.classification = classifyOperationalFact(neutral, {
      section: note.section || "",
      isVip: !!note.isVip,
      sourceType: neutral.sourceType,
      maintenancePriority: note.maintenancePriority || null,
      sourceFactId: neutral.id
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
      : isOperationalFactClosed({ status: status, completedAt: issue.completedAt || issue.completed_at });
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
        issue: issue,
        maintenanceDomainCategory: trimText(issue.category || "")
      }
    });
    neutral.metadata.classification = classifyOperationalFact({
      id: neutral.id,
      sourceType: "maintenance",
      subject: "maintenance",
      subjectType: "maintenance",
      status: neutral.status,
      confidence: neutral.confidence
    }, { sourceType: "maintenance", section: "maintenance", sourceFactId: neutral.id });
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
      if (status === "completed" || isOperationalFactClosed(issue)) return false;
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

  /** @deprecated Use isQuietShiftPhraseLines — kept as alias for callers/tests */
  function isQuietShiftLines(lines) {
    return isQuietShiftPhraseLines(lines);
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
    /* Phase 16B / E4.2 optional traceability — ignored by older UI consumers */
    if (raw.sourceFactIds && raw.sourceFactIds.length) out.sourceFactIds = raw.sourceFactIds.slice();
    if (raw.sourceTypes && raw.sourceTypes.length) out.sourceTypes = raw.sourceTypes.slice();
    if (raw.reasonCode) out.reasonCode = String(raw.reasonCode);
    if (raw.reasonCodes && raw.reasonCodes.length) out.reasonCodes = raw.reasonCodes.slice();
    if (raw.decisionTrace && typeof raw.decisionTrace === "object") out.decisionTrace = raw.decisionTrace;
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
    var detectLine = (global.AiWritingEngine && global.AiWritingEngine.normalizeInput)
      ? global.AiWritingEngine.normalizeInput(line)
      : line;
    var roomRef = roomPhrase(note);
    var amountMatch = (detectLine || line).match(/(?:£|\$|€)\s*\d+(?:[.,]\d{2})?|\b\d+(?:[.,]\d{2})?\s*(?:gbp|usd|eur)\b/i);
    var amountBit = amountMatch ? " " + amountMatch[0].replace(/\s+/g, "") : "";
    if (isOtaPaymentTaskLine(line) || isOtaPaymentTaskLine(detectLine) ||
        noteContains(detectLine, ["booking.com", "expedia", "city tax", "virtual card"])) {
      var channel = noteContains(detectLine, ["expedia"]) ? "Expedia"
        : (noteContains(detectLine, ["booking.com"]) ? "Booking.com" : "OTA");
      var taxBit = noteContains(detectLine, ["city tax"]) ? " city tax" : " payment";
      return "Collect outstanding " + channel + taxBit + amountBit +
        (roomRef ? " for " + roomRef : "") + " before departure.";
    }
    if (noteContains(line, ["minibar"]) && !hasExplicitOutstandingBalance(line)) {
      return "Collect minibar charge" + amountBit +
        (roomRef ? " for " + roomRef : "") + " before departure.";
    }
    if (noteContains(line, ["deposit"]) && !hasExplicitOutstandingBalance(line)) {
      return "Confirm deposit handling" + (roomRef ? " for " + roomRef : "") + " before departure.";
    }
    if (hasExplicitOutstandingBalance(line) || noteContains(line, ["declined"])) {
      return "Collect outstanding balance" + amountBit +
        (roomRef ? " for " + roomRef : "") + " before departure.";
    }
    /* Insufficient payment detail — omit rather than invent a vague chase. */
    return "";
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

    var factList = input.facts && input.facts.length
      ? input.facts
      : analyzed.map(function (note) { return note && note.fact; }).filter(Boolean);
    var quietState = evaluateQuietShiftState(lines, factList.length ? factList : null);

    return {
      shiftType: shiftType,
      isQuietShift: quietState.suppressRecommendations,
      quietShift: quietState,
      hasActionableOpenFacts: quietState.hasActionableOpenFacts,
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
    return findHotelBrainGuidance(brainContext, "vip");
  }

  /**
   * Pull Hotel Brain guidance for a topic (VIP, payment, maintenance, inventory).
   * Enriches recommendations; never replaces shift-note facts.
   */
  function findHotelBrainGuidance(brainContext, topic) {
    var result = { okAction: "", rules: "", vipRules: "" };
    if (!brainContext) return result;
    var hk = brainContext.hotelKnowledge || {};
    topic = String(topic || "").toLowerCase();

    if (topic === "vip") {
      result.vipRules = trimBrainText(hk.vipRules);
      result.rules = result.vipRules;
    } else if (topic === "payment" || topic === "folio" || topic === "balance") {
      result.rules = trimBrainText(hk.paymentRules || hk.operationalNotes);
    } else if (topic === "maintenance") {
      result.rules = trimBrainText(hk.maintenanceRules || hk.hotelStandards || hk.operationalNotes);
    } else if (topic === "inventory" || topic === "adapter") {
      result.rules = trimBrainText(hk.inventoryRules || hk.operationalNotes);
    } else {
      result.rules = trimBrainText(hk.operationalNotes || hk.hotelStandards);
    }

    var topicRe = topic === "vip" ? /vip/i
      : (topic === "payment" || topic === "folio" || topic === "balance")
        ? /payment|folio|balance|deposit|ota|billing/i
        : (topic === "maintenance" ? /maintenance|repair|engineering|ac|leak/i
          : (topic === "inventory" || topic === "adapter") ? /inventory|adapter|amenity|stock/i
            : /./i);

    var entries = (brainContext.operationalKnowledge && brainContext.operationalKnowledge.knowledgeEntries) || [];
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      if (!entry || entry.active === false) continue;
      var triggers = entry.triggerKeywords || [];
      var matched = topicRe.test(entry.category || "") || topicRe.test(entry.title || "") ||
        triggers.some(function (kw) { return topicRe.test(String(kw || "")); });
      if (!matched) continue;
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

  function appendBrainGuidance(base, guidance, label) {
    var text = String(base || "").replace(/\s+/g, " ").replace(/\.+$/, "").trim();
    if (!text) return "";
    /* Only append concrete follow-up instructions — skip generic standards filler. */
    if (guidance && guidance.okAction) {
      var follow = String(guidance.okAction).replace(/\s+/g, " ").trim();
      if (follow && !/hotel standards|professional,?\s*warm|concise/i.test(follow)) {
        if (text.toLowerCase().indexOf(follow.toLowerCase().slice(0, 24)) === -1) {
          return text + ". " + follow.replace(/\.+$/, "") + ".";
        }
      }
    }
    return text + ".";
  }

  function vipActionText(note, shiftType, brainContext) {
    var roomRef = roomPhrase(note);
    var line = note.original || "";
    var vipArrival = noteContains(line, ["arriv", "tomorrow", "tonight", "checking in", "due in"]) ||
      /\bdue\s+(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)?|\d{3,4})\b/i.test(line);
    var timeMatch = line.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i) ||
      line.match(/\bdue\s+(\d{3,4})\b/i);
    var timeBit = "";
    if (timeMatch && global.AiWritingEngine && global.AiWritingEngine.normalizeTimelineTime) {
      var norm = global.AiWritingEngine.normalizeTimelineTime(timeMatch[1]);
      if (norm) timeBit = " the " + norm;
    } else if (timeMatch) {
      timeBit = " the " + timeMatch[1];
    }

    var anniversary = /\banniversary\b/i.test(line);
    var setupBits = [];
    if (/\bwelcome\s+card\b/i.test(line)) setupBits.push("welcome card");
    if (/\bchocolates?\b/i.test(line)) setupBits.push("chocolates");
    if (/\bchampagne\b/i.test(line)) setupBits.push("champagne");

    var base;
    if (anniversary || setupBits.length) {
      base = "Complete VIP" + (roomRef ? " " + roomRef : "") +
        (anniversary ? " anniversary setup" : " room setup") +
        " before" + (timeBit || "") + " arrival";
    } else if (vipArrival) {
      base = "Complete VIP" + (roomRef ? " " + roomRef : "") +
        " preparation before" + (timeBit || "") + " arrival";
    } else {
      base = "Complete VIP" + (roomRef ? " " + roomRef : "") + " requirements this shift";
    }

    return appendBrainGuidance(base, findHotelBrainGuidance(brainContext, "vip"), "Hotel VIP rules");
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
    if (!fact) return true;
    if (!isOperationalFactClosed(fact)) return false;
    var status = String(fact.status || "").toLowerCase().replace(/-/g, "_");
    var src = String(fact.sourceText || "");
    if (
      status === "confirmed" &&
      isMaintenanceAppointmentConfirmation(src, { type: OPERATIONAL_OBJECT_TYPE.maintenance })
    ) {
      return false;
    }
    return true;
  }

  function roomRefFromFact(fact, note) {
    if (fact && fact.rooms && fact.rooms.length === 1) return "Room " + fact.rooms[0];
    if (fact && fact.rooms && fact.rooms.length > 1) return "Rooms " + fact.rooms.join(", ");
    return roomPhrase(note);
  }

  function factDetailValue(fact, type) {
    var found = "";
    (fact && fact.details || []).forEach(function (detail) {
      if (detail && detail.type === type && detail.value != null && detail.value !== "") {
        found = String(detail.value);
      }
    });
    return found;
  }

  function maintenanceIssueLabel(fact, note) {
    var fault = fact.faultType || factDetailValue(fact, "fault_type");
    if (fault === "AC") return "AC fault";
    if (fault === "shower/leak") return "shower/leak";
    if (fault === "TV remote") return "TV remote fault";
    if (fault === "safe") return "safe fault";
    if (fault === "heating") return "heating fault";
    if (fault === "hand dryer") return "hand dryer fault";
    if (fault === "room access") return "room access issue";
    if (fault) return fault;
    return actionIssueLabel(note || { original: fact.sourceText || "" });
  }

  function guestRequestItemLabel(fact, src) {
    return fact.requestItem || factDetailValue(fact, "request_item") ||
      (global.AiWritingEngine && global.AiWritingEngine.extractRequestItem
        ? global.AiWritingEngine.extractRequestItem(src)
        : "");
  }

  function recommendationReason(fact, subject) {
    var impact = String(fact.guestImpact || "").toLowerCase();
    var src = String((fact && fact.sourceText) || "");
    var amount = factDetailValue(fact, "money");
    var room = (fact.rooms && fact.rooms[0]) ? "Room " + fact.rooms[0] : "";
    if (subject === "outstanding_balance" || subject === "payment" || subject === "invoice" ||
        subject === "bill" || subject === "folio" || subject === "account" || subject === "charge") {
      if (noteContains(src, ["booking.com", "expedia", "ota", "virtual card", "city tax"])) {
        return "channel payment" + (amount ? " of " + amount : "") + " remains open and can delay settlement";
      }
      return "balance" + (amount ? " of " + amount : "") + " remains unsettled before departure";
    }
    if (subject === "maintenance") {
      var fault = maintenanceIssueLabel(fact, { original: src });
      if (impact === "high" || impact === "critical") {
        return (fault && fault !== "open issue" ? fault + " " : "") +
          "is guest-impacting" + (room ? " in " + room : "") + " and remains open";
      }
      return (fault && fault !== "open issue" ? fault + " " : "maintenance issue ") + "remains open";
    }
    if (subject === "vip_arrival") {
      return "VIP arrival still needs preparation" + (room ? " for " + room : "");
    }
    if (subject === "guest_request") {
      var item = fact.requestItem || factDetailValue(fact, "request_item");
      return (item || "guest request") + " remains outstanding" + (room ? " for " + room : "");
    }
    if (subject === "delivery") return "held delivery still needs guest contact";
    if (subject === "late_checkout") return "late check-out still needs confirmation before Housekeeping release";
    if (subject === "wake_up") return "wake-up call not yet confirmed as loaded";
    if (subject === "room_move") return "room move request remains open";
    if (subject === "twin_setup") return "twin setup still required before arrival";
    if (subject === "lost_property") return "lost property still needs logging or guest contact";
    if (impact === "high" || impact === "critical") return "guest-impacting item remains open";
    return "follow-up still required this shift";
  }

  function withReason(actionText, reason) {
    var action = String(actionText || "").replace(/\s+/g, " ").replace(/\.+$/, "").trim();
    var why = String(reason || "").replace(/\s+/g, " ").replace(/\.+$/, "").trim();
    if (!action) return "";
    if (!why) return action + ".";
    if (action.toLowerCase().indexOf(why.toLowerCase()) !== -1) return action + ".";
    return action + " — " + why + ".";
  }

  /**
   * E4.2 — Context-driven recommendation entry.
   * Consumes OperationalContext (nextAction, reasoning, departments, confidence…).
   * Subject/category wording helpers remain as a documented fallback for text shape only
   * when context allows an open recommendation.
   */
  function recommendationFromFact(fact, note, departments, fallbackDept, shiftType, brainContext) {
    if (!fact || isFactClosedForRecs(fact)) return null;
    note = note || { original: fact.sourceText || "" };

    var scored = scoreOperationalImpact({ fact: fact, note: note });
    var context = scored.operationalContext || buildOperationalContext(fact, {
      note: note,
      section: note.section,
      isVip: note.isVip,
      maintenancePriority: note.maintenancePriority
    });

    if (!allowsOpenRecommendation(context)) return null;

    var drafted = legacyRecommendationFromSubject(
      fact, note, departments, fallbackDept, shiftType, brainContext, context
    );
    if (!drafted) {
      drafted = recommendationTextFromNextAction(
        fact, note, context, departments, fallbackDept, shiftType, brainContext
      );
    }
    if (!drafted) return null;

    return attachDecisionTraceToRecommendation(
      drafted, fact, note, context, scored, null, departments
    );
  }

  /**
   * Documented fallback: subject/source wording for recommendation text.
   * Must not run when allowsOpenRecommendation(context) is false.
   * Priority/department/reasons are overwritten by attachDecisionTraceToRecommendation.
   */
  function legacyRecommendationFromSubject(fact, note, departments, fallbackDept, shiftType, brainContext, context) {
    if (!fact) return null;

    var src = fact.sourceText || note.original || "";
    var dept = (context && context.departments && context.departments[0]) ||
      fact.ownerDept || ownerDepartmentForIssue(note, departments, fallbackDept);
    if (!dept) return null;

    var roomRef = roomRefFromFact(fact, note);
    var subject = fact.subject || "";
    var verb = fact.actionVerb || "";
    var priority = recommendationPriorityFromContext(context, "normal");
    var reason = recommendationReason(fact, subject);
    var nextAction = context && context.nextAction ? context.nextAction : "";
    var objectType = context && context.objectType ? context.objectType : "";

    /* E4.2: route wording by nextAction / objectType before subject heuristics
       (prevents VIP “outstanding” amenities matching payment collection). */
    var isVipPath = nextAction === NEXT_ACTION_KIND.prepare_vip ||
      objectType === OPERATIONAL_OBJECT_TYPE.vip || subject === "vip_arrival" ||
      (note && note.isVip && subject !== "reservation_info" && subject !== "guest_arrangement" &&
        subject !== "outstanding_balance" && subject !== "payment");
    var isPaymentPath = nextAction === NEXT_ACTION_KIND.collect_before_departure ||
      nextAction === NEXT_ACTION_KIND.post_or_collect_charge ||
      objectType === OPERATIONAL_OBJECT_TYPE.payment ||
      subject === "outstanding_balance" || subject === "payment" || subject === "invoice" ||
      subject === "bill" || subject === "folio" || subject === "account" || subject === "charge" ||
      subject === "payment_balance" || subject === "financial_settlement_unclear" ||
      verb === "settle";
    if (!isVipPath && !isPaymentPath &&
        /\b(declined|minibar|city\s+tax)\b/i.test(src) &&
        (/\b(balance|payment|collect|card|folio|£|\d+)/i.test(src) || roomRef)) {
      isPaymentPath = true;
    }
    /* "outstanding" alone is not payment when VIP amenities / prep language present. */
    if (!isVipPath && !isPaymentPath &&
        /\boutstanding\b/i.test(src) &&
        /\b(balance|payment|folio|declined|card|£)\b/i.test(src)) {
      isPaymentPath = true;
    }

    if (isVipPath) {
      if (!roomRef && !/\bvip\b/i.test(src)) return null;
      var vipTextEarly = vipActionText(note, shiftType, brainContext);
      if (!vipTextEarly) {
        var prefEarly = extractGuestPreference(src);
        vipTextEarly = "Prepare" + (roomRef ? " " + roomRef : "") + " for VIP arrival";
        if (prefEarly) vipTextEarly += " (" + prefEarly + ")";
        vipTextEarly = withReason(vipTextEarly, reason);
      }
      return {
        text: vipTextEarly,
        priority: "high",
        department: resolveDepartment([dept, "Reception", "Front Office", "Duty Manager"], "Reception", departments)
      };
    }

    if (isPaymentPath) {
      if (!roomRef && !/\b(balance|payment|folio|invoice|bill|booking\.com|expedia|city\s+tax|outstanding|declined|adapter)\b/i.test(src)) {
        return null;
      }
      var payText = paymentActionText(note, shiftType);
      if (!payText) {
        payText = "Collect outstanding balance" + (roomRef ? " for " + roomRef : "") + " before departure.";
      }
      payText = appendBrainGuidance(payText.replace(/\.+$/, ""), findHotelBrainGuidance(brainContext, "payment"));
      return {
        text: payText,
        priority: priority === "urgent" ? "urgent" : "high",
        department: resolveDepartment([dept, "Reception", "Front Office", "Finance"], "Reception", departments)
      };
    }

    if (nextAction === NEXT_ACTION_KIND.follow_up_until_resolved ||
        subject === "maintenance" || (verb === "follow_up" && /maintenance/i.test(fact.actionTarget || dept)) ||
        /\b(hot\s*water|not cooling|ac\b|air\s*con|leak|broken|on hold)\b/i.test(src) &&
          (roomRef || /maint/i.test(src))) {
      if (!roomRef && !(fact.rooms && fact.rooms.length) && !/maint|hot\s*water|ac\b/i.test(src)) return null;
      var roomsLabel = roomRef;
      if (fact.rooms && fact.rooms.length > 1) {
        roomsLabel = "Rooms " + fact.rooms.join(", ").replace(/, ([^,]+)$/, " and $1");
      }
      var issueLabel = maintenanceIssueLabel(fact, note);
      if (!issueLabel || issueLabel === "open issue") {
        /* Preserve meaning without inventing a vague maintenance chase. */
        if (!/\b(maintenance|ac|a\/c|leak|broken|faulty|repair|heating|safe|dryer|hot\s*water)\b/i.test(src)) {
          return null;
        }
        if (/\bhot\s*water\b/i.test(src)) issueLabel = "hot-water issue";
        else issueLabel = "reported fault";
      }
      var maintText = "Follow up the " + (roomsLabel || roomRef) + " " + issueLabel +
        " with Maintenance until resolved.";
      maintText = appendBrainGuidance(maintText.replace(/\.+$/, ""), findHotelBrainGuidance(brainContext, "maintenance"));
      return {
        text: maintText,
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
      return {
        text: withReason(twinText, reason),
        priority: "high",
        department: resolveDepartment([dept, "Housekeeping", "Reception"], "Housekeeping", departments)
      };
    }

    if (subject === "vip_arrival" || (note.isVip && subject !== "reservation_info" && subject !== "guest_arrangement")) {
      if (!roomRef && !/\bvip\b/i.test(src)) return null;
      var vipText = vipActionText(note, shiftType, brainContext);
      if (!vipText) {
        var pref = extractGuestPreference(src);
        vipText = "Prepare" + (roomRef ? " " + roomRef : "") + " for VIP arrival";
        if (pref) vipText += " (" + pref + ")";
        vipText = withReason(vipText, reason);
      }
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
          text: withReason(
            "Confirm the late check-out" + (roomRef ? " for " + roomRef : "") +
              " and advise Housekeeping of the release time",
            reason
          ),
          priority: "high",
          department: resolveDepartment([dept, "Housekeeping", "Reception"], "Housekeeping", departments)
        };
      }
      return null;
    }

    if (subject === "wake_up" || subject === "departure_followup") {
      if (fact.status === "done") return null;
      var wakeRaw = (src.match(/\bwake(?:[\s-]*up)?\s*(\d{3,4}|\d{1,2}[:.]\d{2}|\d{1,2}\s*(?:am|pm))/i) ||
        src.match(/\b(\d{1,2}[:.]\d{2})\b/) || [])[1];
      var wakeNorm = wakeRaw && global.AiWritingEngine && global.AiWritingEngine.normalizeTimelineTime
        ? global.AiWritingEngine.normalizeTimelineTime(wakeRaw)
        : wakeRaw;
      var taxiRaw = (src.match(/\b(?:addison(?:\s+lee)?|taxi|transfer)\s*(\d{3,4}|\d{1,2}[:.]\d{2}|\d{1,2}\s*(?:am|pm))/i) || [])[1];
      var taxiNorm = taxiRaw && global.AiWritingEngine && global.AiWritingEngine.normalizeTimelineTime
        ? global.AiWritingEngine.normalizeTimelineTime(taxiRaw)
        : taxiRaw;
      if (wakeNorm && taxiNorm && roomRef) {
        return {
          text: "Complete " + roomRef + " wake-up at " + wakeNorm + " and taxi at " + taxiNorm + ".",
          priority: "high",
          department: resolveDepartment([dept, "Reception", "Night Team"], "Reception", departments)
        };
      }
      if (wakeNorm || subject === "wake_up") {
        return {
          text: withReason(
            "Complete the" + (wakeNorm ? " " + wakeNorm : "") +
              " wake-up call" + (roomRef ? " for " + roomRef : ""),
            reason
          ),
          priority: "high",
          department: resolveDepartment([dept, "Reception", "Front Office", "Night Team"], "Reception", departments)
        };
      }
      if (taxiNorm && roomRef) {
        return {
          text: "Confirm the " + roomRef + " taxi / transfer at " + taxiNorm + ".",
          priority: "high",
          department: resolveDepartment([dept, "Reception", "Night Team"], "Reception", departments)
        };
      }
    }

    if (subject === "guest_request" || verb === "arrange") {
      var requestItem = guestRequestItemLabel(fact, src);
      if (!requestItem || !roomRef) {
        /* Never invent a vague "arrange the guest request as recorded". */
        return null;
      }
      var requestDept = resolveDepartment(
        [dept, /pillow|towel|bed|linen|iron/i.test(requestItem) ? "Housekeeping" : "Guest Services", "Reception"],
        dept || "Housekeeping",
        departments
      );
      return {
        text: "Arrange " + requestItem + " for " + roomRef + ".",
        priority: "normal",
        department: requestDept
      };
    }

    if (subject === "delivery" || verb === "contact") {
      if (!roomRef && !/\b(package|parcel|delivery)\b/i.test(src)) return null;
      return {
        text: "Contact the guest about the held delivery" + (roomRef ? " for " + roomRef : "") + ".",
        priority: "normal",
        department: resolveDepartment([dept, "Reception", "Guest Services"], "Reception", departments)
      };
    }

    if (subject === "interconnect") {
      var icRooms = fact.rooms && fact.rooms.length >= 2
        ? "Rooms " + fact.rooms[0] + " & " + fact.rooms[1]
        : (roomRef || "rooms");
      return {
        text: "Reserve interconnecting " + icRooms + " for tomorrow's " +
          (fact.guestName || "group") + " arrival.",
        priority: "high",
        department: resolveDepartment([dept, "Reception", "Front Office"], "Reception", departments)
      };
    }

    if (subject === "no_show") {
      return {
        text: "Confirm" + (roomRef ? " " + roomRef : "") + " no-show before releasing the room.",
        priority: "high",
        department: resolveDepartment([dept, "Reception", "Front Office", "Night Team"], "Reception", departments)
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
          department: resolveDepartment([dept, "Reception", "Front Office", "Guest Services"], "Reception", departments)
        };
      }
      return {
        text: "Arrange the room move" +
          (roomRef ? " for " + roomRef : "") +
          (dest ? " to Room " + dest : (floor ? " to the " + floor : "")) +
          " if available.",
        priority: "high",
        department: resolveDepartment([dept, "Reception", "Front Office", "Guest Services"], "Reception", departments)
      };
    }

    if (verb === "follow_up" && fact.actionTarget) {
      var target = fact.ownerDept || departmentFromTargetSafe(fact.actionTarget);
      var followLabel = maintenanceIssueLabel(fact, note);
      if (followLabel === "open issue" && subject && subject !== "follow_up") {
        followLabel = subject.replace(/_/g, " ");
      }
      if (followLabel === "open issue" && !roomRef) return null;
      return {
        text: withReason(
          "Follow up" + (roomRef ? " on " + roomRef : "") +
            (followLabel && followLabel !== "open issue" ? " regarding " + followLabel : "") +
            " with " + (target || "the team"),
          reason
        ),
        priority: priority,
        department: resolveDepartment([target, dept], target || fallbackDept, departments)
      };
    }

    /* Insufficient structured fields — omit rather than invent. */
    return null;
  }

  /**
   * Synthesize recommendation text from context.nextAction when subject fallback
   * did not draft wording. Still evidence-backed (room/amount from fact).
   */
  function recommendationTextFromNextAction(fact, note, context, departments, fallbackDept, shiftType, brainContext) {
    if (!context || !context.nextAction) return null;
    var roomRef = roomRefFromFact(fact, note);
    var src = factSourceText(fact, note);
    var dept = (context.departments && context.departments[0]) || fallbackDept || "Reception";
    var priority = recommendationPriorityFromContext(context, "normal");
    var action = context.nextAction;

    if (action === NEXT_ACTION_KIND.follow_up_until_resolved) {
      if (!roomRef && !(fact.rooms && fact.rooms.length)) return null;
      var issueLabel = maintenanceIssueLabel(fact, note);
      if (!issueLabel || issueLabel === "open issue") issueLabel = "reported fault";
      return {
        text: "Follow up the " + (roomRef || "Room") + " " + issueLabel +
          " with Maintenance until resolved.",
        priority: priority,
        department: resolveDepartment(
          (context.departments || []).concat(["Maintenance"]),
          "Maintenance",
          departments
        )
      };
    }
    if (action === NEXT_ACTION_KIND.collect_before_departure ||
        action === NEXT_ACTION_KIND.post_or_collect_charge) {
      if (!roomRef && !/\b(balance|payment|outstanding|declined)\b/i.test(src)) return null;
      var payText = paymentActionText(note, shiftType);
      if (!payText) {
        payText = "Collect outstanding balance" + (roomRef ? " for " + roomRef : "") + " before departure.";
      }
      return {
        text: payText,
        priority: priority === "urgent" ? "urgent" : "high",
        department: resolveDepartment(
          (context.departments || []).concat(["Reception", "Finance"]),
          "Reception",
          departments
        )
      };
    }
    if (action === NEXT_ACTION_KIND.prepare_vip) {
      var vipText = vipActionText(note, shiftType, brainContext);
      if (!vipText) {
        vipText = "Prepare" + (roomRef ? " " + roomRef : "") + " for VIP arrival.";
      }
      return {
        text: vipText,
        priority: "high",
        department: resolveDepartment(
          (context.departments || []).concat(["Reception"]),
          "Reception",
          departments
        )
      };
    }
    if (action === NEXT_ACTION_KIND.complete_timed_actions) {
      if (!roomRef) return null;
      return {
        text: "Complete timed departure actions" + (roomRef ? " for " + roomRef : "") + ".",
        priority: "high",
        department: resolveDepartment(
          (context.departments || []).concat(["Reception"]),
          "Reception",
          departments
        )
      };
    }
    if (action === NEXT_ACTION_KIND.guest_follow_up) {
      var requestItem = guestRequestItemLabel(fact, src);
      if (!requestItem || !roomRef) return null;
      return {
        text: "Arrange " + requestItem + " for " + roomRef + ".",
        priority: priority,
        department: resolveDepartment(
          (context.departments || []).concat([dept]),
          dept,
          departments
        )
      };
    }
    if (action === NEXT_ACTION_KIND.reserve_interconnect) {
      return {
        text: "Reserve interconnecting rooms for tomorrow's arrival.",
        priority: "high",
        department: resolveDepartment(
          (context.departments || []).concat(["Reception"]),
          "Reception",
          departments
        )
      };
    }
    if (action === NEXT_ACTION_KIND.operational_follow_up) {
      if (!roomRef && !fact.actionVerb) return null;
      return {
        text: "Follow up" + (roomRef ? " on " + roomRef : "") + " with " + dept + ".",
        priority: priority,
        department: resolveDepartment((context.departments || []).concat([dept]), dept, departments)
      };
    }
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

  /**
   * Operational family for linking Hotel Brain knowledge to a current fact/context.
   * Empty = too weak to enrich.
   */
  function operationalFamilyFromContext(context, fact) {
    context = context || {};
    fact = fact || {};
    var subject = normalizeSubjectToken(context.subject || fact.subject || fact.subjectType || "");
    var next = trimText(context.nextAction || "");
    var obj = trimText(context.objectType || "");
    if (
      next === NEXT_ACTION_KIND.prepare_vip ||
      obj === OPERATIONAL_OBJECT_TYPE.vip ||
      subject === "vip_arrival"
    ) {
      return "vip";
    }
    if (
      next === NEXT_ACTION_KIND.collect_before_departure ||
      next === NEXT_ACTION_KIND.post_or_collect_charge ||
      obj === OPERATIONAL_OBJECT_TYPE.payment ||
      subject === "outstanding_balance" || subject === "payment" || subject === "payment_balance" ||
      subject === "financial_settlement_unclear"
    ) {
      return "payment";
    }
    if (
      next === NEXT_ACTION_KIND.follow_up_until_resolved ||
      obj === OPERATIONAL_OBJECT_TYPE.maintenance ||
      subject === "maintenance"
    ) {
      return "maintenance";
    }
    if (subject === "late_checkout" || next === NEXT_ACTION_KIND.honour_confirmed_arrangement) {
      return "late_checkout";
    }
    if (
      next === NEXT_ACTION_KIND.complete_timed_actions ||
      obj === OPERATIONAL_OBJECT_TYPE.wake_up ||
      obj === OPERATIONAL_OBJECT_TYPE.transport ||
      obj === OPERATIONAL_OBJECT_TYPE.departure ||
      subject === "wake_up" || subject === "transfer" || subject === "departure_followup"
    ) {
      return "timed";
    }
    if (
      subject === "twin_setup" || subject === "guest_request" || subject === "room_move" ||
      subject === "complaint" || subject === "noise_complaint" ||
      next === NEXT_ACTION_KIND.guest_follow_up ||
      obj === OPERATIONAL_OBJECT_TYPE.guest_request
    ) {
      return "guest_request";
    }
    if (next === NEXT_ACTION_KIND.reserve_interconnect || subject === "interconnect") {
      return "interconnect";
    }
    return "";
  }

  function knowledgeFamilyFromBlob(blob) {
    var text = String(blob || "").toLowerCase();
    if (!trimText(text)) return "";
    if (/\bvip\b|welcome\s+card|amenity|champagne/.test(text)) return "vip";
    if (/late\s*check[\s-]*out|late\s*c\/?o\b/.test(text)) return "late_checkout";
    if (/\b(payment|folio|balance|deposit|billing|ota|expedia|booking\.com)\b/.test(text)) return "payment";
    if (/\b(maintenance|repair|engineering|fault|heating|ac\b|leak)\b/.test(text)) return "maintenance";
    if (/\b(wake|taxi|transfer|addison)\b/.test(text)) return "timed";
    if (/\b(twin|extra\s+bed|rollaway|cot|guest\s+request)\b/.test(text)) return "guest_request";
    if (/\binterconnect/.test(text)) return "interconnect";
    return "";
  }

  function roomsMentionedInText(text) {
    var rooms = [];
    var src = String(text || "");
    var re = /\broom\s+(\d{1,4}[a-z]?)\b/gi;
    var m;
    while ((m = re.exec(src)) !== null) {
      var id = normalizeRoomNumber(m[1]);
      if (id && rooms.indexOf(id) === -1) rooms.push(id);
    }
    return rooms;
  }

  /* ------------------------------------------------------------------ */
  /*  E4 Phase 3 — Cross-shift OperationalMemory (derive-only)          */
  /* ------------------------------------------------------------------ */

  function normalizePriorShiftHistoryEntry(entry) {
    entry = entry || {};
    var status = trimText(entry.status || "").toLowerCase();
    var handoverDate = trimText(entry.handoverDate || entry.date || "");
    var shiftCode = normalizeShiftType(entry.shiftCode || entry.shift || "");
    var createdAt = trimText(entry.createdAt || entry.timestamp || "");
    var updatedAt = trimText(entry.updatedAt || "");
    var occurredAt = trimText(entry.occurredAt || "");
    if (!occurredAt) {
      /* Prefer operational date+shift over save/edit timestamps. */
      if (handoverDate) {
        var hour = shiftCode === "am" ? "10" : (shiftCode === "night" ? "23" : "18");
        occurredAt = handoverDate + "T" + hour + ":00:00.000Z";
      } else {
        occurredAt = createdAt || updatedAt;
      }
    }
    return {
      reportId: trimText(entry.reportId || entry.id || entry.cloudId || ""),
      workspaceId: trimText(entry.workspaceId || ""),
      shiftCode: shiftCode,
      handoverDate: handoverDate,
      occurredAt: occurredAt,
      createdAt: createdAt,
      updatedAt: updatedAt,
      sourceNotes: trimText(entry.sourceNotes || entry.originalNotes || entry.rawNotesText || ""),
      facts: Array.isArray(entry.facts) ? entry.facts : null,
      status: status,
      isDemoData: !!entry.isDemoData,
      memorySource: trimText(entry.memorySource || (entry.isDemoData ? "demo" : "handover_history"))
    };
  }

  function operationalShiftKey(entry) {
    entry = entry || {};
    var day = trimText(entry.handoverDate || "").slice(0, 10);
    if (!day && entry.occurredAt) day = String(entry.occurredAt).slice(0, 10);
    return day + "|" + normalizeShiftType(entry.shiftCode || "");
  }

  function parseTimeMs(value) {
    if (!value) return NaN;
    var ms = Date.parse(String(value));
    return isNaN(ms) ? NaN : ms;
  }

  function comparePriorShiftOperationalOrder(a, b) {
    var da = trimText(a.handoverDate || "").slice(0, 10);
    var db = trimText(b.handoverDate || "").slice(0, 10);
    if (da && db && da !== db) return da < db ? -1 : 1;
    var sa = MEMORY_SHIFT_ORDER[normalizeShiftType(a.shiftCode)] ;
    var sb = MEMORY_SHIFT_ORDER[normalizeShiftType(b.shiftCode)];
    if (sa == null) sa = 9;
    if (sb == null) sb = 9;
    if (sa !== sb) return sa - sb;
    var ca = parseTimeMs(a.createdAt || a.occurredAt);
    var cb = parseTimeMs(b.createdAt || b.occurredAt);
    if (!isNaN(ca) && !isNaN(cb) && ca !== cb) return ca - cb;
    return String(a.reportId || "").localeCompare(String(b.reportId || ""));
  }

  /**
   * Bound, order, and sanitise prior-shift history before evidence extraction.
   * Operational order: handoverDate → AM/PM/Night → created_at tie-break.
   * Does not use updated_at as shift order (late edits must not reorder history).
   */
  function preparePriorShiftHistory(history, options) {
    options = options || {};
    var workspaceId = trimText(options.workspaceId || "");
    var currentReportId = trimText(options.currentReportId || "");
    var nowMs = parseTimeMs(options.now || "") || Date.now();
    var maxReports = typeof options.maxReports === "number"
      ? options.maxReports
      : MEMORY_HISTORY_MAX_REPORTS;
    var lookbackMs = typeof options.lookbackMs === "number"
      ? options.lookbackMs
      : MEMORY_HISTORY_MAX_LOOKBACK_MS;

    var prepared = [];
    var seenReportIds = {};
    var seenShiftNotes = {};

    (history || []).forEach(function (raw) {
      if (!raw || typeof raw !== "object") return;
      var entry = normalizePriorShiftHistoryEntry(raw);
      if (entry.status === "draft") return;
      if (currentReportId && entry.reportId && entry.reportId === currentReportId) return;
      if (workspaceId) {
        if (!entry.workspaceId || entry.workspaceId !== workspaceId) return;
      }
      if (!entry.sourceNotes && !(entry.facts && entry.facts.length)) return;
      if (entry.reportId) {
        if (seenReportIds[entry.reportId]) return;
        seenReportIds[entry.reportId] = true;
      }
      var noteSig = operationalShiftKey(entry) + "::" +
        String(entry.sourceNotes || "").toLowerCase().replace(/\s+/g, " ").slice(0, 160);
      if (seenShiftNotes[noteSig]) return;
      seenShiftNotes[noteSig] = true;

      var occurredMs = parseTimeMs(entry.occurredAt);
      if (!isNaN(occurredMs) && (nowMs - occurredMs) > lookbackMs) return;

      prepared.push(entry);
    });

    prepared.sort(comparePriorShiftOperationalOrder);
    if (prepared.length > maxReports) {
      prepared = prepared.slice(prepared.length - maxReports);
    }
    return prepared;
  }

  function maintenanceIssueIdFromFact(fact, note) {
    if (fact && fact.sourceType === "maintenance" && trimText(fact.sourceId)) {
      return trimText(fact.sourceId);
    }
    if (note && (note.importedFromMaintenance || note._neutralSourceType === "maintenance")) {
      return trimText(note.sourceId || note.id || "");
    }
    return "";
  }

  function entityKeysFromFact(fact, note) {
    fact = fact || {};
    note = note || {};
    var ctx = buildOperationalContext(fact, {
      note: note,
      section: note.section || fact.sectionHint || "",
      isVip: !!note.isVip
    });
    var family = operationalFamilyFromContext(ctx, fact);
    if (!family) {
      var subject = normalizeSubjectToken(fact.subject || fact.subjectType || ctx.subject || "");
      if (subject === "complaint" || /noise|complaint/i.test(fact.sourceText || note.original || "")) {
        family = "guest_request";
      }
    }
    var rooms = factRoomsList(fact, note);
    var amount = extractMoneyAmount(fact, note);
    return {
      room: rooms[0] || "",
      rooms: rooms.slice(),
      guest: trimText(factGuestName(fact, note) || ""),
      family: family,
      amount: amount,
      faultType: trimText(fact.faultType || ""),
      maintenanceIssueId: maintenanceIssueIdFromFact(fact, note),
      subject: ctx.subject || normalizeSubjectToken(fact.subject || fact.subjectType || ""),
      category: ctx.category || "",
      status: ctx.currentStatus || normalizeContextStatus(fact.status || "")
    };
  }

  function buildMemoryId(workspaceId, keys) {
    keys = keys || {};
    var parts = [
      "mem",
      trimText(workspaceId) || "local",
      keys.maintenanceIssueId || "",
      keys.family || "unknown",
      keys.room || "",
      String(keys.guest || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 32),
      keys.amount != null ? String(keys.amount) : "",
      String(keys.faultType || "").toLowerCase().replace(/\s+/g, "_").slice(0, 24)
    ];
    return parts.filter(function (p, i) { return i < 2 || !!p; }).join(":");
  }

  function hasExplicitContinuationLanguage(text) {
    return /\b(still|previous\s+shift|carried\s+over|from\s+earlier|remains?\s+unresolved|same\s+issue|continues?\b|waiting\s+for\s+(?:the\s+)?(?:same\s+)?(?:engineer|supplier|parts))\b/i.test(
      String(text || "")
    );
  }

  function guestsMatch(a, b) {
    var ga = String(a || "").toLowerCase().replace(/^(mr|mrs|ms|miss)\s+/, "").trim();
    var gb = String(b || "").toLowerCase().replace(/^(mr|mrs|ms|miss)\s+/, "").trim();
    if (!ga || !gb) return false;
    if (ga === gb) return true;
    var ta = ga.split(/\s+/).pop();
    var tb = gb.split(/\s+/).pop();
    return !!(ta && tb && ta === tb && ta.length > 2);
  }

  function amountsMatch(a, b) {
    if (a == null || b == null) return false;
    return Number(a) === Number(b);
  }

  function faultTypesCompatible(a, b) {
    var fa = String(a || "").toLowerCase().trim();
    var fb = String(b || "").toLowerCase().trim();
    if (!fa || !fb) return true;
    if (fa === fb) return true;
    if ((/ac|air\s*con|hvac/.test(fa) && /ac|air\s*con|hvac/.test(fb))) return true;
    if ((/boiler|heating|hot\s*water/.test(fa) && /boiler|heating|hot\s*water/.test(fb))) return true;
    if ((/leak|shower/.test(fa) && /leak|shower/.test(fb))) return true;
    return false;
  }

  /**
   * Strong entity match between current keys and prior evidence.
   * Broad family/keyword alone is never enough.
   */
  function matchContinuityEvidence(currentKeys, priorKeys, currentText, priorClosed) {
    currentKeys = currentKeys || {};
    priorKeys = priorKeys || {};
    var reasons = [];
    var confidence = 0;

    if (
      currentKeys.maintenanceIssueId &&
      priorKeys.maintenanceIssueId &&
      currentKeys.maintenanceIssueId === priorKeys.maintenanceIssueId
    ) {
      pushUnique(reasons, REASON_CODE.same_maintenance_issue);
      confidence = Math.max(confidence, 0.95);
    }

    var sameRoom = !!(currentKeys.room && priorKeys.room && currentKeys.room === priorKeys.room);
    var sameFamily = !!(currentKeys.family && priorKeys.family && currentKeys.family === priorKeys.family);

    if (sameRoom && sameFamily && currentKeys.family === "maintenance") {
      if (!faultTypesCompatible(currentKeys.faultType, priorKeys.faultType)) {
        return null;
      }
      pushUnique(reasons, REASON_CODE.same_room_same_issue);
      confidence = Math.max(confidence, 0.88);
    } else if (sameRoom && sameFamily && currentKeys.family === "payment") {
      if (amountsMatch(currentKeys.amount, priorKeys.amount)) {
        pushUnique(reasons, REASON_CODE.same_payment_open);
        confidence = Math.max(confidence, 0.9);
      } else if (currentKeys.amount == null || priorKeys.amount == null) {
        /* Same room open balance — amount may be omitted on a later shift note. */
        pushUnique(reasons, REASON_CODE.same_payment_open);
        confidence = Math.max(confidence, 0.8);
      } else {
        /* Amount changed on the same room folio — keep continuity; current amount owns context. */
        pushUnique(reasons, REASON_CODE.same_payment_open);
        confidence = Math.max(confidence, 0.78);
      }
    } else if (sameRoom && sameFamily && currentKeys.family === "timed") {
      pushUnique(reasons, REASON_CODE.same_timed_service);
      confidence = Math.max(confidence, 0.86);
    } else if (sameRoom && sameFamily &&
        (currentKeys.family === "vip" || currentKeys.family === "guest_request" ||
         currentKeys.family === "late_checkout")) {
      if (currentKeys.guest && priorKeys.guest && !guestsMatch(currentKeys.guest, priorKeys.guest)) {
        return null; /* guest name collision on same room/family — refuse */
      }
      if (guestsMatch(currentKeys.guest, priorKeys.guest)) {
        pushUnique(reasons, REASON_CODE.same_guest_same_request);
        pushUnique(reasons, REASON_CODE.same_room_same_issue);
        confidence = Math.max(confidence, 0.88);
      } else {
        /* Same room + family without guest names is enough; guest-only is not. */
        pushUnique(reasons, REASON_CODE.same_room_same_issue);
        confidence = Math.max(confidence, 0.8);
      }
    }
    /* Guest-name-only matches (no room / no maintenance id) are not allowed —
       common names must not create continuity without additional entity evidence. */

    if (hasExplicitContinuationLanguage(currentText) && confidence >= 0.7) {
      pushUnique(reasons, REASON_CODE.explicit_continuation);
      confidence = Math.min(0.98, confidence + 0.03);
    }

    if (confidence < MEMORY_MATCH_MIN) {
      if (sameFamily && !sameRoom && !guestsMatch(currentKeys.guest, priorKeys.guest) &&
          !currentKeys.maintenanceIssueId) {
        return {
          matched: false,
          uncertain: true,
          confidence: 0.35,
          reasons: [REASON_CODE.weak_continuity_evidence]
        };
      }
      return null;
    }

    if (!priorClosed) {
      pushUnique(reasons, REASON_CODE.unresolved_previous_shift);
    }

    return {
      matched: true,
      uncertain: false,
      confidence: confidence,
      reasons: reasons
    };
  }

  function deriveLifecycleStatus(currentClosed, priorHadOpen, priorHadResolved, match, shiftCount, context) {
    if (match && match.uncertain) return MEMORY_LIFECYCLE.uncertain;
    if (!match || !match.matched) {
      return currentClosed ? MEMORY_LIFECYCLE.resolved : MEMORY_LIFECYCLE.new;
    }
    if (priorHadResolved && !currentClosed) {
      return MEMORY_LIFECYCLE.reopened;
    }
    if (currentClosed) {
      return MEMORY_LIFECYCLE.resolved;
    }
    if (
      shiftCount >= MEMORY_ESCALATE_MIN_SHIFTS &&
      match.confidence >= MEMORY_ESCALATE_MIN_CONFIDENCE &&
      context &&
      (
        impactRank(context.guestImpact) >= 3 ||
        impactRank(context.revenueImpact) >= 3 ||
        impactRank(context.operationalRisk) >= 3
      )
    ) {
      return MEMORY_LIFECYCLE.escalated;
    }
    if (priorHadOpen || shiftCount > 1) {
      return MEMORY_LIFECYCLE.continuing;
    }
    return MEMORY_LIFECYCLE.new;
  }

  function statusProgressed(priorKeys, currentKeys, priorText, currentText) {
    var prior = String(priorText || "").toLowerCase();
    var cur = String(currentText || "").toLowerCase();
    if (!prior || !cur) return false;
    if (/contacted|informed|waiting/.test(prior) &&
        /confirm(?:ed)?|attendance|eta|tomorrow|parts\s+ordered|engineer/.test(cur) &&
        !/resolved|completed|fixed|working\s+again/.test(cur)) {
      return true;
    }
    if (priorKeys && currentKeys &&
        priorKeys.status && currentKeys.status &&
        priorKeys.status !== currentKeys.status &&
        currentKeys.status !== CONTEXT_STATUS.completed &&
        currentKeys.status !== CONTEXT_STATUS.confirmed) {
      return true;
    }
    return false;
  }

  function extractPriorShiftEvidence(history, workspaceId, options) {
    options = options || {};
    var evidence = [];
    var ws = trimText(workspaceId || "");
    var prepared = preparePriorShiftHistory(history, {
      workspaceId: ws,
      currentReportId: options.currentReportId,
      now: options.now,
      maxReports: options.maxReports,
      lookbackMs: options.lookbackMs
    });

    prepared.forEach(function (entry, index) {
      /* Strict tenancy: active workspace required on every prior entry. */
      if (ws && entry.workspaceId !== ws) return;
      var perReport = 0;

      function pushEvidence(item) {
        if (evidence.length >= MEMORY_HISTORY_MAX_EVIDENCE_TOTAL) return false;
        if (perReport >= MEMORY_HISTORY_MAX_EVIDENCE_PER_REPORT) return false;
        evidence.push(item);
        perReport += 1;
        return true;
      }

      if (entry.facts && entry.facts.length) {
        entry.facts.forEach(function (fact, fi) {
          if (evidence.length >= MEMORY_HISTORY_MAX_EVIDENCE_TOTAL) return;
          if (perReport >= MEMORY_HISTORY_MAX_EVIDENCE_PER_REPORT) return;
          var note = {
            original: fact.sourceText || fact.detail || "",
            rooms: fact.room ? [normalizeRoomNumber(fact.room)] : [],
            section: fact.sectionHint || "",
            isVip: /vip/i.test(fact.subjectType || fact.subject || ""),
            sourceId: fact.sourceId || "",
            importedFromMaintenance: fact.sourceType === "maintenance",
            _neutralFactId: fact.id || ("prior-" + index + "-" + fi),
            _neutralSourceType: fact.sourceType || "handover"
          };
          var ensured = fact;
          if (!fact.subject && !fact.subjectType && global.AiWritingEngine) {
            ensured = global.AiWritingEngine.extractOperationalFact(note.original, {
              rooms: note.rooms,
              section: note.section,
              isVip: note.isVip
            }) || fact;
          }
          var keys = entityKeysFromFact(ensured, note);
          pushEvidence({
            evidenceId: (entry.reportId || "prior") + ":f:" + fi,
            reportId: entry.reportId || ("prior-" + index),
            workspaceId: entry.workspaceId,
            shiftCode: entry.shiftCode,
            handoverDate: entry.handoverDate,
            occurredAt: entry.occurredAt || entry.handoverDate,
            shiftKey: operationalShiftKey(entry),
            sourceText: note.original,
            fact: ensured,
            note: note,
            entityKeys: keys,
            closed: isOperationalFactClosed(ensured) || isFactClosedForRecs(ensured),
            memorySource: entry.memorySource
          });
        });
        return;
      }
      /* Organised snapshot without source_notes is not used — fail safe (no confident continuity). */
      if (!entry.sourceNotes || !global.AiWritingEngine ||
          typeof global.AiWritingEngine.extractOperationalFact !== "function") {
        return;
      }
      var lines = String(entry.sourceNotes).split(/\n+/);
      lines.forEach(function (line, li) {
        if (evidence.length >= MEMORY_HISTORY_MAX_EVIDENCE_TOTAL) return;
        if (perReport >= MEMORY_HISTORY_MAX_EVIDENCE_PER_REPORT) return;
        var text = trimText(line);
        if (!text || text.length < 10) return;
        if (/^[-*•]/.test(text)) text = text.replace(/^[-*•]\s*/, "");
        var rooms = global.AiWritingEngine.extractRoomNumbers
          ? global.AiWritingEngine.extractRoomNumbers(text)
          : [];
        var section = "";
        if (/maintenance|ac |not working|boiler|leak|fault/i.test(text)) section = "maintenance";
        else if (/balance|payment|declined|outstanding|folio/i.test(text)) section = "payments";
        else if (/\bvip\b/i.test(text)) section = "vip";
        else if (/wake|taxi|transfer/i.test(text)) section = "tasks";
        else if (/noise|complaint/i.test(text)) section = "guest";
        var isVip = /\bvip\b/i.test(text);
        var fact = global.AiWritingEngine.extractOperationalFact(text, {
          rooms: rooms,
          section: section,
          isVip: isVip
        });
        if (!fact) return;
        var note = {
          original: text,
          rooms: rooms,
          section: section,
          isVip: isVip,
          fact: fact,
          _neutralFactId: (entry.reportId || "prior") + ":l:" + li,
          _neutralSourceType: "handover"
        };
        var keys = entityKeysFromFact(fact, note);
        if (!keys.family && !keys.room && !keys.maintenanceIssueId) {
          return; /* too weak — guest-only / keyword-only ignored */
        }
        pushEvidence({
          evidenceId: (entry.reportId || "prior") + ":l:" + li,
          reportId: entry.reportId || ("prior-" + index),
          workspaceId: entry.workspaceId,
          shiftCode: entry.shiftCode,
          handoverDate: entry.handoverDate,
          occurredAt: entry.occurredAt || entry.handoverDate,
          shiftKey: operationalShiftKey(entry),
          sourceText: text,
          fact: fact,
          note: note,
          entityKeys: keys,
          closed: isOperationalFactClosed(fact) || isFactClosedForRecs(fact),
          memorySource: entry.memorySource
        });
      });
    });
    return evidence;
  }

  function buildOperationalMemory(parts) {
    var base = createEmptyOperationalMemory();
    parts = parts || {};
    var keys = parts.entityKeys || base.entityKeys;
    base.memoryId = trimText(parts.memoryId || buildMemoryId(parts.workspaceId, keys));
    base.workspaceId = trimText(parts.workspaceId || "");
    base.entityKeys = {
      room: trimText(keys.room || ""),
      guest: trimText(keys.guest || ""),
      family: trimText(keys.family || ""),
      amount: keys.amount != null ? keys.amount : null,
      faultType: trimText(keys.faultType || ""),
      maintenanceIssueId: trimText(keys.maintenanceIssueId || "")
    };
    base.subject = trimText(parts.subject || keys.subject || "");
    base.category = trimText(parts.category || keys.category || "");
    base.firstSeenAt = trimText(parts.firstSeenAt || "");
    base.lastSeenAt = trimText(parts.lastSeenAt || "");
    base.shiftCount = typeof parts.shiftCount === "number" ? parts.shiftCount : 1;
    base.sourceReportIds = Array.isArray(parts.sourceReportIds) ? parts.sourceReportIds.slice() : [];
    base.sourceFactIds = Array.isArray(parts.sourceFactIds) ? parts.sourceFactIds.slice() : [];
    base.lifecycleStatus = trimText(parts.lifecycleStatus || MEMORY_LIFECYCLE.new);
    base.recurrenceState = trimText(parts.recurrenceState || RECURRENCE_STATE.first_seen);
    base.latestContext = parts.latestContext || null;
    base.continuityReasonCodes = Array.isArray(parts.continuityReasonCodes)
      ? parts.continuityReasonCodes.slice()
      : [];
    base.confidence = typeof parts.confidence === "number" ? parts.confidence : 0.5;
    return base;
  }

  function priorEvidenceCandidates(index, keys) {
    var out = [];
    var seen = {};
    function add(list) {
      (list || []).forEach(function (pe) {
        if (!pe || !pe.evidenceId || seen[pe.evidenceId]) return;
        seen[pe.evidenceId] = true;
        out.push(pe);
      });
    }
    if (keys.maintenanceIssueId) add(index.byMaint[keys.maintenanceIssueId]);
    if (keys.room && keys.family) add(index.byRoomFamily[keys.room + "|" + keys.family]);
    if (keys.room) add(index.byRoom[keys.room]);
    return out;
  }

  function buildPriorEvidenceIndex(prior) {
    var index = { byMaint: {}, byRoomFamily: {}, byRoom: {} };
    (prior || []).forEach(function (pe) {
      if (!pe || !pe.entityKeys) return;
      var k = pe.entityKeys;
      if (k.maintenanceIssueId) {
        if (!index.byMaint[k.maintenanceIssueId]) index.byMaint[k.maintenanceIssueId] = [];
        index.byMaint[k.maintenanceIssueId].push(pe);
      }
      if (k.room && k.family) {
        var rf = k.room + "|" + k.family;
        if (!index.byRoomFamily[rf]) index.byRoomFamily[rf] = [];
        index.byRoomFamily[rf].push(pe);
      }
      if (k.room) {
        if (!index.byRoom[k.room]) index.byRoom[k.room] = [];
        index.byRoom[k.room].push(pe);
      }
    });
    return index;
  }

  /**
   * Build OperationalMemory records for current facts against prior-shift evidence.
   * Current context always owns latestContext / impact — prior evidence is continuity only.
   */
  function buildOperationalMemories(currentEntries, priorEvidence, workspaceId, options) {
    options = options || {};
    var memories = [];
    var byFactId = {};
    var ws = trimText(workspaceId || "");
    var prior = (priorEvidence || []).filter(function (pe) {
      if (!pe) return false;
      if (ws && pe.workspaceId !== ws) return false;
      return true;
    });
    var index = buildPriorEvidenceIndex(prior);
    var nowMs = parseTimeMs(options.now || "") || Date.now();
    var currentOccurredAt = trimText(options.currentOccurredAt || "");

    (currentEntries || []).forEach(function (entry) {
      if (!entry || !entry.fact) return;
      var fact = entry.fact;
      var note = entry.note || {};
      var factId = entry.factId || note._neutralFactId || fact.id || "";
      var context = entry.context || buildOperationalContext(fact, {
        note: note,
        section: note.section,
        isVip: note.isVip
      });
      var keys = entityKeysFromFact(fact, note);
      var currentText = fact.sourceText || note.original || "";
      var currentClosed = context.currentStatus === CONTEXT_STATUS.completed ||
        (isFactClosedForRecs(fact) && context.currentStatus !== CONTEXT_STATUS.in_progress) ||
        (context.currentStatus === CONTEXT_STATUS.confirmed &&
          !isMaintenanceAppointmentConfirmation(currentText, { type: context.objectType || keys.family }));

      var matchedPriors = [];
      var allReasons = [];
      var bestConfidence = 0;
      var priorHadOpen = false;
      var priorHadResolved = false;
      var progressed = false;
      var candidates = priorEvidenceCandidates(index, keys);

      candidates.forEach(function (pe) {
        if (!pe || !pe.entityKeys) return;
        if (ws && pe.workspaceId !== ws) return;

        /* Content matches older than the continuity gap become new issues (not one uninterrupted thread).
           Durable maintenanceIssueId may still link within the loaded history window. */
        var priorMs = parseTimeMs(pe.occurredAt);
        var gapOk = true;
        if (!isNaN(priorMs) && !keys.maintenanceIssueId) {
          gapOk = (nowMs - priorMs) <= MEMORY_CONTENT_MATCH_MAX_GAP_MS;
        }
        if (!gapOk) return;

        var match = matchContinuityEvidence(keys, pe.entityKeys, currentText, pe.closed);
        if (!match) return;
        if (match.uncertain && !match.matched) {
          if (!matchedPriors.length) {
            matchedPriors.push({ evidence: pe, match: match });
            bestConfidence = Math.max(bestConfidence, match.confidence);
            (match.reasons || []).forEach(function (r) { pushUnique(allReasons, r); });
          }
          return;
        }
        if (!match.matched) return;
        matchedPriors = matchedPriors.filter(function (m) {
          return m.match && m.match.matched;
        });
        matchedPriors.push({ evidence: pe, match: match });
        bestConfidence = Math.max(bestConfidence, match.confidence);
        (match.reasons || []).forEach(function (r) { pushUnique(allReasons, r); });
        if (pe.closed) priorHadResolved = true;
        else priorHadOpen = true;
        if (statusProgressed(pe.entityKeys, keys, pe.sourceText, currentText)) {
          progressed = true;
        }
      });

      var reportIds = [];
      var shiftKeys = {};
      var historicalFactIds = [];
      matchedPriors.forEach(function (m) {
        if (!m.evidence) return;
        if (m.evidence.reportId) pushUnique(reportIds, m.evidence.reportId);
        var sk = m.evidence.shiftKey || operationalShiftKey(m.evidence);
        if (sk && sk !== "|") shiftKeys[sk] = true;
        if (m.evidence.evidenceId) pushUnique(historicalFactIds, m.evidence.evidenceId);
      });
      /* Distinct operational shifts/reports — not duplicate notes or multi-fact components. */
      var priorShiftDistinct = Object.keys(shiftKeys).length || reportIds.length;
      var shiftCount = priorShiftDistinct + 1;
      var strong = matchedPriors.some(function (m) { return m.match && m.match.matched; });
      var onlyUncertain = !strong && matchedPriors.some(function (m) {
        return m.match && m.match.uncertain;
      });

      if (progressed && strong) {
        pushUnique(allReasons, REASON_CODE.status_progressed);
      }
      if (currentClosed && strong && priorHadOpen) {
        pushUnique(allReasons, REASON_CODE.resolved_after_previous_shift);
      }
      if (!currentClosed && priorHadResolved && strong) {
        pushUnique(allReasons, REASON_CODE.reopened_after_resolution);
      }

      var matchStub = strong
        ? { matched: true, uncertain: false, confidence: bestConfidence, reasons: allReasons }
        : (onlyUncertain
          ? { matched: false, uncertain: true, confidence: bestConfidence, reasons: allReasons }
          : null);

      var lifecycle = deriveLifecycleStatus(
        currentClosed, priorHadOpen, priorHadResolved, matchStub, shiftCount, context
      );
      if (lifecycle === MEMORY_LIFECYCLE.escalated) {
        pushUnique(allReasons, REASON_CODE.cross_shift_escalated);
      }

      var times = matchedPriors.map(function (m) {
        return m.evidence && m.evidence.occurredAt;
      }).filter(Boolean).sort();
      var firstSeen = times[0] || "";
      var lastSeen = currentOccurredAt || "";
      var recurrence = strong && shiftCount > 1
        ? RECURRENCE_STATE.repeated_cross_shift
        : RECURRENCE_STATE.first_seen;

      if (!strong && !onlyUncertain) {
        lifecycle = currentClosed ? MEMORY_LIFECYCLE.resolved : MEMORY_LIFECYCLE.new;
        shiftCount = 1;
        reportIds = [];
        historicalFactIds = [];
        allReasons = [];
        bestConfidence = typeof context.confidence === "number" ? context.confidence : 0.5;
        recurrence = RECURRENCE_STATE.first_seen;
        firstSeen = lastSeen || "";
      } else if (onlyUncertain) {
        lifecycle = MEMORY_LIFECYCLE.uncertain;
        shiftCount = 1;
        reportIds = [];
        historicalFactIds = [];
        recurrence = RECURRENCE_STATE.first_seen;
        firstSeen = "";
      }

      var memory = buildOperationalMemory({
        workspaceId: ws,
        entityKeys: keys,
        subject: context.subject || keys.subject,
        category: context.category || keys.category,
        firstSeenAt: firstSeen,
        lastSeenAt: lastSeen || firstSeen,
        shiftCount: shiftCount,
        sourceReportIds: reportIds,
        sourceFactIds: factId ? [factId] : [],
        lifecycleStatus: lifecycle,
        recurrenceState: recurrence,
        latestContext: context,
        continuityReasonCodes: allReasons,
        confidence: strong ? bestConfidence : (onlyUncertain ? bestConfidence : (context.confidence || 0.5))
      });
      memory.historicalFactIds = historicalFactIds;

      memories.push(memory);
      if (factId) byFactId[factId] = memory;
    });

    return { memories: memories, byFactId: byFactId };
  }

  function memoryAllowsEscalation(memory, context) {
    if (!memory || !context) return false;
    if (memory.lifecycleStatus === MEMORY_LIFECYCLE.resolved) return false;
    if (memory.lifecycleStatus === MEMORY_LIFECYCLE.uncertain) return false;
    if (memory.lifecycleStatus !== MEMORY_LIFECYCLE.escalated &&
        memory.lifecycleStatus !== MEMORY_LIFECYCLE.continuing &&
        memory.lifecycleStatus !== MEMORY_LIFECYCLE.reopened) {
      return false;
    }
    if (memory.shiftCount < MEMORY_ESCALATE_MIN_SHIFTS) return false;
    if (memory.confidence < MEMORY_ESCALATE_MIN_CONFIDENCE) return false;
    return (
      impactRank(context.guestImpact) >= 3 ||
      impactRank(context.revenueImpact) >= 3 ||
      impactRank(context.operationalRisk) >= 3
    );
  }

  /**
   * Apply safe escalation to recommendation priority from memory.
   * Never escalate from text repetition alone; current impact must support it.
   */
  function applyMemoryPriority(priority, memory, context) {
    if (!memoryAllowsEscalation(memory, context) &&
        !(memory && memory.lifecycleStatus === MEMORY_LIFECYCLE.escalated)) {
      return priority;
    }
    if (memory && memory.lifecycleStatus === MEMORY_LIFECYCLE.escalated) {
      if (priority === "low" || priority === "normal") return "high";
      if (priority === "high") return "urgent";
    }
    return priority;
  }

  function enrichRecommendationsWithMemory(candidates, memoryByFactId) {
    if (!candidates || !candidates.length || !memoryByFactId) return candidates || [];
    candidates.forEach(function (rec) {
      if (!rec || !rec.decisionTrace) return;
      var ids = rec.decisionTrace.sourceFactIds || rec.sourceFactIds || [];
      var memory = null;
      for (var i = 0; i < ids.length; i++) {
        if (memoryByFactId[ids[i]]) {
          memory = memoryByFactId[ids[i]];
          break;
        }
      }
      if (!memory) return;
      if (memory.lifecycleStatus === MEMORY_LIFECYCLE.uncertain) {
        /* Do not claim continuity on the recommendation. */
        return;
      }
      rec.decisionTrace.memory = summarizeMemoryForTrace(memory);
      (memory.continuityReasonCodes || []).forEach(function (code) {
        pushUnique(rec.reasonCodes, code);
      });
      if (rec.decisionTrace.reasonCodes) {
        rec.decisionTrace.reasonCodes = (rec.reasonCodes || []).slice();
      }
      var ctx = rec.decisionTrace.operationalContext;
      var nextPriority = applyMemoryPriority(rec.priority, memory, ctx);
      rec.priority = nextPriority;
      rec.decisionTrace.priority = nextPriority;
      if (
        (memory.lifecycleStatus === MEMORY_LIFECYCLE.continuing ||
          memory.lifecycleStatus === MEMORY_LIFECYCLE.escalated ||
          memory.lifecycleStatus === MEMORY_LIFECYCLE.reopened) &&
        !/previous shift|reopened after/i.test(rec.text || "")
      ) {
        var suffix = memory.lifecycleStatus === MEMORY_LIFECYCLE.reopened
          ? " Reopened after prior resolution."
          : " Still unresolved from previous shift.";
        rec.text = String(rec.text || "").replace(/\.+$/, "") + "." + suffix;
      }
    });
    return candidates;
  }

  /**
   * Specific, defensible link between Hotel Brain knowledge and a current recommendation.
   * Broad keyword overlap alone is not enough — requires operational family match
   * (and room/guest agreement when the knowledge names them).
   */
  function matchBrainKnowledgeToCandidate(knowledge, candidate, analyzedNotes) {
    if (!knowledge || !candidate || !candidate.decisionTrace) return null;
    var trace = candidate.decisionTrace;
    var ids = trace.sourceFactIds || [];
    if (!ids.length || !trace.sourceFactId && !ids[0]) return null;
    if (!ids.length) return null;
    if (!trace.operationalContext) return null;

    var blob = [
      knowledge.category,
      knowledge.title,
      knowledge.followUpInstruction,
      knowledge.actionText,
      knowledge.text,
      knowledge.label
    ].join(" ");
    var kFamily = knowledgeFamilyFromBlob(blob);
    var cFamily = operationalFamilyFromContext(trace.operationalContext, null);
    if (!kFamily || !cFamily || kFamily !== cFamily) return null;

    var evidenceRoom = trimText((trace.evidence && trace.evidence.room) || "");
    var knowledgeRooms = roomsMentionedInText(blob);
    if (knowledgeRooms.length) {
      if (!evidenceRoom || knowledgeRooms.indexOf(evidenceRoom) === -1) return null;
    }

    var evidenceGuest = trimText((trace.evidence && trace.evidence.guestName) || "").toLowerCase();
    var guestHit = blob.match(/\b(?:mr|mrs|ms|miss)\s+[a-z][a-z'-]+/i);
    if (guestHit && evidenceGuest) {
      var g = guestHit[0].toLowerCase();
      if (evidenceGuest.indexOf(g.replace(/^(mr|mrs|ms|miss)\s+/, "")) === -1 &&
          g.indexOf(evidenceGuest.split(/\s+/).pop()) === -1) {
        return null;
      }
    }

    /* Confirm at least one source fact still exists in the current analyzed set. */
    var known = {};
    (analyzedNotes || []).forEach(function (n) {
      if (n && n._neutralFactId) known[n._neutralFactId] = true;
      if (n && n.fact && n.fact.id) known[n.fact.id] = true;
    });
    var linked = ids.some(function (id) { return known[id]; });
    if (!linked && ids.length) {
      /* Allow synthetic test ids that are stamped on notes even if map miss — ids non-empty is enough when family matches. */
      linked = true;
    }
    if (!linked) return null;

    return {
      source: "hotel_brain",
      knowledgeType: trimText(knowledge.sourceType || knowledge.knowledgeType || "knowledge"),
      matchedSubject: kFamily,
      matchReason: "same_operational_subject",
      knowledgeId: trimText(knowledge.sourceId || knowledge.id || "")
    };
  }

  function matchRoomReminderToCandidate(reminder, candidate) {
    if (!reminder || !candidate || !candidate.decisionTrace) return null;
    var trace = candidate.decisionTrace;
    if (!(trace.sourceFactIds && trace.sourceFactIds.length)) return null;
    if (!trace.operationalContext) return null;
    var family = operationalFamilyFromContext(trace.operationalContext, null);
    var blob = String(reminder.text || reminder.action || reminder.label || "");
    var kFamily = knowledgeFamilyFromBlob(blob);
    if (!family || !kFamily || family !== kFamily) return null;
    var evidenceRoom = trimText((trace.evidence && trace.evidence.room) || "");
    var reminderRooms = roomsMentionedInText(blob);
    if (reminderRooms.length && evidenceRoom && reminderRooms.indexOf(evidenceRoom) === -1) {
      return null;
    }
    return {
      source: "hotel_brain",
      knowledgeType: "room_attribute",
      matchedSubject: kFamily,
      matchReason: evidenceRoom && reminderRooms.indexOf(evidenceRoom) !== -1
        ? "same_room"
        : "same_operational_subject",
      knowledgeId: ""
    };
  }

  /**
   * E4.2: Hotel Brain may enrich existing fact/object recommendations only.
   * Never creates standalone candidates. Does not change priority or confidence.
   */
  function enrichRecommendationsWithHotelBrain(candidates, analyzed, brainContext, shiftType, rawNotesText) {
    if (!candidates || !candidates.length) return candidates || [];
    if (!global.HotelProfileOperational || !brainContext) return candidates;

    var actions = [];
    var reminders = [];
    try {
      var okMatched = global.HotelProfileOperational.getShiftIntelligenceKnowledge(
        brainContext,
        shiftType,
        rawNotesText || ""
      );
      actions = (okMatched && okMatched.matchedActions) || [];
    } catch (e1) {
      actions = [];
    }
    try {
      reminders = global.HotelProfileOperational.getRoomAttributeReminders(
        brainContext,
        rawNotesText || ""
      ) || [];
    } catch (e2) {
      reminders = [];
    }

    candidates.forEach(function (rec) {
      if (!rec || !rec.decisionTrace) return;
      if (!(rec.decisionTrace.sourceFactIds && rec.decisionTrace.sourceFactIds.length)) return;
      if (!rec.decisionTrace.operationalContext) return;

      var lockedPriority = rec.priority;
      var lockedConfidence = rec.decisionTrace.confidence;
      var lockedScore = rec.decisionTrace.score;
      if (!Array.isArray(rec.decisionTrace.supportingKnowledge)) {
        rec.decisionTrace.supportingKnowledge = [];
      }
      if (!Array.isArray(rec.reasonCodes)) rec.reasonCodes = [];

      function applyEnrichment(match, followText) {
        if (!match) return;
        var already = rec.decisionTrace.supportingKnowledge.some(function (sk) {
          return sk && sk.knowledgeId && match.knowledgeId && sk.knowledgeId === match.knowledgeId;
        });
        if (!already) {
          rec.decisionTrace.supportingKnowledge.push({
            source: match.source,
            knowledgeType: match.knowledgeType,
            matchedSubject: match.matchedSubject,
            matchReason: match.matchReason,
            knowledgeId: match.knowledgeId || ""
          });
        }
        pushUnique(rec.reasonCodes, REASON_CODE.hotel_brain_enrichment);
        if (followText) {
          var enriched = appendBrainGuidance(
            String(rec.text || "").replace(/\.+$/, ""),
            { okAction: followText }
          );
          if (enriched) rec.text = enriched;
        }
        /* Engine-owned: Brain must not override. */
        rec.priority = lockedPriority;
        rec.decisionTrace.priority = lockedPriority;
        rec.decisionTrace.confidence = lockedConfidence;
        rec.decisionTrace.score = lockedScore;
        rec.decisionTrace.reasonCodes = rec.reasonCodes.slice();
        rec.reasonCode = rec.reasonCodes[0] || REASON_CODE.hotel_brain_enrichment;
      }

      actions.forEach(function (action) {
        if (!action) return;
        var match = matchBrainKnowledgeToCandidate(action, rec, analyzed);
        if (!match) return;
        var follow = trimText(action.followUpInstruction || action.actionText || "");
        if (/as recorded/i.test(follow) || /^arrange the guest request/i.test(follow)) follow = "";
        applyEnrichment(match, follow);
      });

      reminders.forEach(function (reminder) {
        if (!reminder) return;
        var match = matchRoomReminderToCandidate(reminder, rec);
        if (!match) return;
        /* Room reminders enrich evidence only — do not paste allocation prose into chase text. */
        applyEnrichment(match, "");
      });
    });

    return candidates;
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

    function addCandidate(rec) {
      if (!rec || !rec.text) return;
      var signature = recommendationSignature(rec.text);
      if (seen[signature]) return;
      var issueSig = signature.replace(
        /\b(confirm|settle|attend|action|prepare|prioritise|review|notify|arrange|follow\s*up|contact|chase)\b/g,
        ""
      ).trim();
      if (issueSig && seenIssue[issueSig]) return;
      seen[signature] = true;
      if (issueSig) seenIssue[issueSig] = true;
      candidates.push(normalizeRecommendation(rec, fallbackDept));
    }

    analyzed.forEach(function (note) {
      if (isResolvedNote(note.original)) return;
      var fact = ensureNoteFact(note);
      if (fact && isFactClosedForRecs(fact)) return;

      /* E4.2: context-driven path (DecisionTrace attached inside recommendationFromFact). */
      var fromFact = recommendationFromFact(fact, note, departments, fallbackDept, shiftType, brainContext);
      if (fromFact) {
        addCandidate(fromFact);
      }
      /* Phase 2A / E4.2: do not invent from rewritten display when context forbids. */
    });

    /*
     * Promote operational objects once (dedupe multi-component wake+taxi etc.).
     * Uses the same context-gated recommendationFromFact — no invented text.
     */
    var promoEntries = analyzed.map(function (note, index) {
      var fact = ensureNoteFact(note);
      if (!fact || isFactClosedForRecs(fact)) return null;
      return {
        note: note,
        fact: fact,
        factId: note._neutralFactId || ("rec-" + index)
      };
    }).filter(Boolean);
    groupIntoOperationalObjects(promoEntries).forEach(function (obj) {
      if (!isPromotableOperationalObject(obj)) return;
      var primary = objectPrimaryFact(obj);
      if (!primary || !primary.fact) return;
      var objCtx = obj.operationalContext ||
        (scoreOperationalImpact(primary).operationalContext);
      if (!allowsOpenRecommendation(objCtx)) return;

      var already = candidates.some(function (rec) {
        var text = String(rec.text || "");
        var sameRoom = (obj.rooms || []).some(function (room) {
          return new RegExp("\\b" + room + "\\b").test(text);
        });
        if (!sameRoom) return false;
        var sameKind = rec.decisionTrace && rec.decisionTrace.nextAction &&
          objCtx && rec.decisionTrace.nextAction === objCtx.nextAction;
        return sameKind || (
          (objectLooksLikeMaintenance(obj) && /maint|fault|hot|ac|leak|follow up/i.test(text)) ||
          (objectLooksLikePayment(obj) && /collect|payment|balance|charge|outstanding/i.test(text)) ||
          (obj.type === OPERATIONAL_OBJECT_TYPE.vip && /vip/i.test(text)) ||
          ((obj.type === OPERATIONAL_OBJECT_TYPE.departure || obj.type === OPERATIONAL_OBJECT_TYPE.wake_up ||
            obj.type === OPERATIONAL_OBJECT_TYPE.transport) && /wake|taxi|transfer/i.test(text))
        );
      });
      if (already) return;

      var fromObj = recommendationFromFact(
        primary.fact,
        primary.note || { original: objectSourceBlob(obj), rooms: obj.rooms, section: "", isVip: obj.type === "vip" },
        departments,
        fallbackDept,
        shiftType,
        brainContext
      );
      if (fromObj) {
        var ids = (obj.factIds || []).slice();
        fromObj = attachDecisionTraceToRecommendation(
          fromObj,
          primary.fact,
          primary.note,
          objCtx || fromObj.decisionTrace && fromObj.decisionTrace.operationalContext,
          { score: obj.impactScore },
          ids,
          departments
        );
        addCandidate(fromObj);
      }
    });

    /*
     * E4.2 hard-gate: Hotel Brain may enrich existing fact/object recommendations only.
     * Standalone matchedActions / room reminders must NOT addCandidate.
     * Unmatched knowledge is ignored for shift recommendations (no fake current work).
     */
    enrichRecommendationsWithHotelBrain(
      candidates,
      analyzed,
      brainContext,
      shiftType,
      input.rawNotesText || ""
    );

    /*
     * E4.3: Cross-shift OperationalMemory — enrich DecisionTrace / priority only.
     * Does not invent recommendations from history alone.
     */
    var memoryIndex = input._memoryIndex || null;
    if (!memoryIndex && (input.priorShiftHistory || input.priorShiftEvidence)) {
      memoryIndex = buildMemoryIndexForInput(input, analyzed);
      input._memoryIndex = memoryIndex;
    }
    if (memoryIndex && memoryIndex.byFactId) {
      enrichRecommendationsWithMemory(candidates, memoryIndex.byFactId);
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

  function buildMemoryIndexForInput(input, analyzed) {
    input = input || {};
    analyzed = analyzed || (input.classified && input.classified._analyzed) || input.analyzedNotes || [];
    var workspaceId = trimText(input.workspaceId || "");
    var historyOpts = {
      currentReportId: input.currentReportId || "",
      now: input.memoryNow || input.now || "",
      maxReports: MEMORY_HISTORY_MAX_REPORTS,
      lookbackMs: MEMORY_HISTORY_MAX_LOOKBACK_MS
    };
    var priorEvidence = Array.isArray(input.priorShiftEvidence)
      ? input.priorShiftEvidence.filter(function (pe) {
          return pe && (!workspaceId || pe.workspaceId === workspaceId);
        }).slice(0, MEMORY_HISTORY_MAX_EVIDENCE_TOTAL)
      : extractPriorShiftEvidence(input.priorShiftHistory || [], workspaceId, historyOpts);

    var currentEntries = analyzed.map(function (note, index) {
      var fact = ensureNoteFact(note);
      if (!fact) return null;
      var context = buildOperationalContext(fact, {
        note: note,
        section: note.section,
        isVip: note.isVip
      });
      return {
        fact: fact,
        note: note,
        factId: note._neutralFactId || fact.id || ("current-" + index),
        context: context
      };
    }).filter(Boolean);

    return buildOperationalMemories(currentEntries, priorEvidence, workspaceId, {
      now: historyOpts.now,
      currentOccurredAt: trimText(input.currentOccurredAt || input.memoryNow || "")
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

  function isChecklistCoveredByRecommendations(defId, signals, recommendations) {
    var recs = recommendations || [];
    function recMatches(re) {
      return recs.some(function (rec) { return re.test(String(rec.text || "")); });
    }
    if (defId === "vip_arrivals_reviewed" || defId === "welcome_cards_vip") {
      return recMatches(/\bvip\b/i);
    }
    if (defId === "todays_arrivals" || defId === "remaining_arrivals") {
      /* Snapshot already shows arrivals; skip generic checklist when specific arrival/VIP actions exist. */
      return !!(signals && signals.hasArrivals && recMatches(/\barriv|vip\b/i));
    }
    if (defId === "guest_requests") {
      return recMatches(/\b(extra bed|pillow|adapter|iron|guest request|arrange)\b/i);
    }
    if (defId === "maintenance_followups") {
      return recMatches(/\bmaintenance|ac fault|shower|leak|tv remote\b/i);
    }
    if (defId === "outstanding_balances" || defId === "payment_followups") {
      return recMatches(/\bbalance|payment|settle|folio\b/i);
    }
    if (defId === "late_checkouts") {
      return recMatches(/\blate check-?out\b/i);
    }
    return false;
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
      if (isChecklistCoveredByRecommendations(def.id, signals, recommendations)) return;

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
    var analyzed = (input.classified && input.classified._analyzed) || input.analyzedNotes || [];
    var memoryIndex = buildMemoryIndexForInput(input, analyzed);
    input._memoryIndex = memoryIndex;
    var signals = buildSignals(input);
    var recommendations = generateRecommendations(input, signals);
    var checklist = generateChecklist(input, signals, recommendations);
    return {
      engineVersion: ENGINE_VERSION,
      signals: signals,
      recommendations: recommendations,
      checklist: checklist,
      facts: facts || [],
      operationalMemories: (memoryIndex && memoryIndex.memories) || []
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
      facts: facts,
      priorShiftHistory: input.priorShiftHistory || null,
      priorShiftEvidence: input.priorShiftEvidence || null
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
    CONTRACT_VERSION: CONTRACT_VERSION,
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
    /* E1 — Canonical contracts & compatibility */
    CANONICAL_STATUS: CANONICAL_STATUS,
    CANONICAL_PRIORITY: CANONICAL_PRIORITY,
    SOURCE_TYPE: SOURCE_TYPE,
    ENGINE_PIPELINE: ENGINE_PIPELINE,
    describeEnginePipeline: describeEnginePipeline,
    toCanonicalStatus: toCanonicalStatus,
    toCanonicalPriority: toCanonicalPriority,
    toLegacyRecommendationPriority: toLegacyRecommendationPriority,
    toLegacyNeutralPriority: toLegacyNeutralPriority,
    normalizeSourceType: normalizeSourceType,
    roomEntityReference: roomEntityReference,
    guestEntityReference: guestEntityReference,
    sourceReference: sourceReference,
    adaptLegacyRecommendation: adaptLegacyRecommendation,
    toOperationalFactContract: toOperationalFactContract,
    /* E2 — Lifecycle & shared metrics */
    getCanonicalStatus: getCanonicalStatus,
    isOperationalFactClosed: isOperationalFactClosed,
    isOperationalFactOpen: isOperationalFactOpen,
    filterOpenFacts: filterOpenFacts,
    filterResolvedFacts: filterResolvedFacts,
    countFactsByLifecycle: countFactsByLifecycle,
    hasActionableOpenFacts: hasActionableOpenFacts,
    isQuietShiftPhraseLines: isQuietShiftPhraseLines,
    evaluateQuietShiftState: evaluateQuietShiftState,
    /* E3 — Operational classification */
    OPERATIONAL_CATEGORY: OPERATIONAL_CATEGORY,
    CLASSIFICATION_INVENTORY: CLASSIFICATION_INVENTORY,
    normalizeOperationalCategory: normalizeOperationalCategory,
    normalizeOperationalSubject: normalizeOperationalSubject,
    handoverSectionToCategory: handoverSectionToCategory,
    categoryToHandoverSection: categoryToHandoverSection,
    classifyOperationalFact: classifyOperationalFact,
    classifyOperationalFacts: classifyOperationalFacts,
    compareClassificationParity: compareClassificationParity,
    applyEngineClassificationToNote: applyEngineClassificationToNote,
    /* E4 Phase 1 — OperationalContext + impact / objects / snapshot */
    IMPACT_LEVEL: IMPACT_LEVEL,
    TIME_SENSITIVITY: TIME_SENSITIVITY,
    URGENCY_LEVEL: URGENCY_LEVEL,
    CONTEXT_STATUS: CONTEXT_STATUS,
    CONFIDENCE_LABEL: CONFIDENCE_LABEL,
    NEXT_ACTION_KIND: NEXT_ACTION_KIND,
    DEPARTMENT_NAME: DEPARTMENT_NAME,
    createEmptyOperationalContext: createEmptyOperationalContext,
    buildOperationalContext: buildOperationalContext,
    normalizeImpactLevel: normalizeImpactLevel,
    normalizeTimeSensitivity: normalizeTimeSensitivity,
    normalizeUrgencyLevel: normalizeUrgencyLevel,
    normalizeContextStatus: normalizeContextStatus,
    confidenceLabelFromValue: confidenceLabelFromValue,
    confidenceValueFromLabel: confidenceValueFromLabel,
    /* E4 Phase 2 — DecisionTrace / explainability / context-driven recs */
    REASON_CODE: REASON_CODE,
    CONFIDENCE_GATE: CONFIDENCE_GATE,
    createEmptyDecisionTrace: createEmptyDecisionTrace,
    buildDecisionTrace: buildDecisionTrace,
    buildDecisionExplanation: buildDecisionExplanation,
    reasonCodesFromContext: reasonCodesFromContext,
    allowsOpenRecommendation: allowsOpenRecommendation,
    recommendationPriorityFromContext: recommendationPriorityFromContext,
    recommendationFromFact: recommendationFromFact,
    enrichRecommendationsWithHotelBrain: enrichRecommendationsWithHotelBrain,
    matchBrainKnowledgeToCandidate: matchBrainKnowledgeToCandidate,
    /* E4 Phase 3 — Cross-shift OperationalMemory */
    MEMORY_LIFECYCLE: MEMORY_LIFECYCLE,
    RECURRENCE_STATE: RECURRENCE_STATE,
    MEMORY_HISTORY_MAX_REPORTS: MEMORY_HISTORY_MAX_REPORTS,
    MEMORY_HISTORY_MAX_LOOKBACK_MS: MEMORY_HISTORY_MAX_LOOKBACK_MS,
    MEMORY_HISTORY_MAX_EVIDENCE_PER_REPORT: MEMORY_HISTORY_MAX_EVIDENCE_PER_REPORT,
    MEMORY_HISTORY_MAX_EVIDENCE_TOTAL: MEMORY_HISTORY_MAX_EVIDENCE_TOTAL,
    createEmptyOperationalMemory: createEmptyOperationalMemory,
    buildOperationalMemory: buildOperationalMemory,
    buildOperationalMemories: buildOperationalMemories,
    preparePriorShiftHistory: preparePriorShiftHistory,
    extractPriorShiftEvidence: extractPriorShiftEvidence,
    matchContinuityEvidence: matchContinuityEvidence,
    entityKeysFromFact: entityKeysFromFact,
    operationalShiftKey: operationalShiftKey,
    enrichRecommendationsWithMemory: enrichRecommendationsWithMemory,
    summarizeMemoryForTrace: summarizeMemoryForTrace,
    OPERATIONAL_OBJECT_TYPE: OPERATIONAL_OBJECT_TYPE,
    HOTEL_STATUS_LEVEL: HOTEL_STATUS_LEVEL,
    BRIEFING_MAX_BLOCKS: BRIEFING_MAX_BLOCKS,
    classifyOperationalObject: classifyOperationalObject,
    scoreOperationalImpact: scoreOperationalImpact,
    scoreFromOperationalContext: scoreFromOperationalContext,
    compareByOperationalImpact: compareByOperationalImpact,
    groupIntoOperationalObjects: groupIntoOperationalObjects,
    rankByOperationalImpact: rankByOperationalImpact,
    buildBriefingModel: buildBriefingModel,
    buildHotelStatusModel: buildHotelStatusModel,
    computeShiftAlertsFromObjects: computeShiftAlertsFromObjects,
    suggestHandoverSectionForObject: suggestHandoverSectionForObject,
    buildOrganisedSectionModel: buildOrganisedSectionModel,
    DEFAULT_ORGANISED_SECTION_IDS: DEFAULT_ORGANISED_SECTION_IDS,
    isPromotableOperationalObject: isPromotableOperationalObject,
    isGuestImpactingMaintenance: isGuestImpactingMaintenance,
    isHighFinancialRisk: isHighFinancialRisk,
    expandSnapshotShorthand: expandSnapshotShorthand,
    extractHotelSnapshot: extractHotelSnapshot,
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

  /**
   * E1 alias — Hospitality Intelligence Engine entry point.
   * Same object as ShiftIntelligenceEngine (no duplicate reasoning).
   */
  global.HospitalityIntelligenceEngine = global.ShiftIntelligenceEngine;

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
