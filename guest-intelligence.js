/**
 * Hospitality Flow — Guest Intelligence (GI-1 + GI-2)
 *
 * GI-1: read-only GuestObservation extraction from engine outputs.
 * GI-2: temporary CandidateGuestKnowledge from observations (reviewable, not confirmed).
 * Consumes OperationalFact / OperationalContext / OperationalMemory / DecisionTrace.
 * Does NOT score, rank, recommend, persist profiles, or promote preferences.
 *
 * No durable guestId, no DB, no staff UI, no auto-confirm.
 */
(function (global) {
  "use strict";

  var GI_VERSION = 2;
  var GI_PHASE = "GI-2";

  var OBSERVATION_TYPE = {
    room_preference: "room_preference",
    floor_preference: "floor_preference",
    location_preference: "location_preference",
    bedding_preference: "bedding_preference",
    bed_configuration: "bed_configuration",
    amenity_preference: "amenity_preference",
    communication_preference: "communication_preference",
    accessibility_or_service_need: "accessibility_or_service_need",
    vip_or_recognition: "vip_or_recognition",
    occasion: "occasion",
    complaint: "complaint",
    service_recovery: "service_recovery",
    late_checkout_request: "late_checkout_request",
    wakeup_or_transport: "wakeup_or_transport",
    parcel_or_delivery: "parcel_or_delivery",
    payment_issue: "payment_issue",
    maintenance_guest_impact: "maintenance_guest_impact",
    general_guest_request: "general_guest_request",
    informational: "informational"
  };

  var MATCH_STRENGTH = {
    strong: "strong",
    probable: "probable",
    uncertain: "uncertain",
    none: "none"
  };

  var OBSERVATION_STATUS = {
    observed_once: "observed_once",
    explicit_current_request: "explicit_current_request",
    confirmed_current_stay: "confirmed_current_stay",
    resolved: "resolved",
    uncertain: "uncertain"
  };

  var SENSITIVITY = {
    normal: "normal",
    sensitive: "sensitive",
    prohibited: "prohibited"
  };

  var APPROVAL_REQUIREMENT = {
    none: "none",
    staff_review: "staff_review",
    never_store: "never_store"
  };

  var CONFIDENCE_LABEL = {
    low: "low",
    medium: "medium",
    high: "high"
  };

  /** Session-only Demo cache — never persisted. Cleared on Demo reset/exit. */
  var lastDemoObservations = null;
  var lastDemoCandidates = null;

  /* ─── GI-2 candidate knowledge ─────────────────────────────────────────── */

  var KNOWLEDGE_TYPE = {
    floor_preference: "floor_preference",
    room_location_preference: "room_location_preference",
    bedding_preference: "bedding_preference",
    bed_configuration_preference: "bed_configuration_preference",
    amenity_preference: "amenity_preference",
    communication_preference: "communication_preference",
    recurring_service_pattern: "recurring_service_pattern",
    complaint_pattern: "complaint_pattern",
    service_recovery_note: "service_recovery_note",
    vip_or_recognition: "vip_or_recognition",
    accessibility_or_service_need: "accessibility_or_service_need",
    operational_restriction: "operational_restriction"
  };

  var CANDIDATE_ELIGIBILITY = {
    auto_proposable: "auto_proposable",
    staff_review_required: "staff_review_required",
    never_candidate: "never_candidate"
  };

  var CANDIDATE_LIFECYCLE = {
    proposed: "proposed",
    insufficient_evidence: "insufficient_evidence",
    conflicting: "conflicting",
    rejected_by_rule: "rejected_by_rule",
    prohibited: "prohibited"
  };

  var CONTRADICTION_STATE = {
    none: "none",
    conflicting: "conflicting",
    superseded: "superseded",
    uncertain: "uncertain"
  };

  /**
   * Observation type → candidate eligibility + knowledge type.
   * never_candidate types do not become guest knowledge in GI-2.
   */
  var OBSERVATION_CANDIDATE_RULES = {};
  OBSERVATION_CANDIDATE_RULES[OBSERVATION_TYPE.floor_preference] = {
    eligibility: CANDIDATE_ELIGIBILITY.auto_proposable,
    knowledgeType: KNOWLEDGE_TYPE.floor_preference
  };
  OBSERVATION_CANDIDATE_RULES[OBSERVATION_TYPE.location_preference] = {
    eligibility: CANDIDATE_ELIGIBILITY.auto_proposable,
    knowledgeType: KNOWLEDGE_TYPE.room_location_preference
  };
  OBSERVATION_CANDIDATE_RULES[OBSERVATION_TYPE.room_preference] = {
    eligibility: CANDIDATE_ELIGIBILITY.auto_proposable,
    knowledgeType: KNOWLEDGE_TYPE.room_location_preference
  };
  OBSERVATION_CANDIDATE_RULES[OBSERVATION_TYPE.bedding_preference] = {
    eligibility: CANDIDATE_ELIGIBILITY.auto_proposable,
    knowledgeType: KNOWLEDGE_TYPE.bedding_preference
  };
  OBSERVATION_CANDIDATE_RULES[OBSERVATION_TYPE.bed_configuration] = {
    eligibility: CANDIDATE_ELIGIBILITY.auto_proposable,
    knowledgeType: KNOWLEDGE_TYPE.bed_configuration_preference
  };
  OBSERVATION_CANDIDATE_RULES[OBSERVATION_TYPE.amenity_preference] = {
    eligibility: CANDIDATE_ELIGIBILITY.auto_proposable,
    knowledgeType: KNOWLEDGE_TYPE.amenity_preference
  };
  OBSERVATION_CANDIDATE_RULES[OBSERVATION_TYPE.communication_preference] = {
    eligibility: CANDIDATE_ELIGIBILITY.auto_proposable,
    knowledgeType: KNOWLEDGE_TYPE.communication_preference
  };
  OBSERVATION_CANDIDATE_RULES[OBSERVATION_TYPE.vip_or_recognition] = {
    eligibility: CANDIDATE_ELIGIBILITY.auto_proposable,
    knowledgeType: KNOWLEDGE_TYPE.vip_or_recognition,
    retentionHint: "short_lived_recognition"
  };
  OBSERVATION_CANDIDATE_RULES[OBSERVATION_TYPE.occasion] = {
    eligibility: CANDIDATE_ELIGIBILITY.auto_proposable,
    knowledgeType: KNOWLEDGE_TYPE.vip_or_recognition,
    retentionHint: "short_lived_recognition"
  };
  OBSERVATION_CANDIDATE_RULES[OBSERVATION_TYPE.accessibility_or_service_need] = {
    eligibility: CANDIDATE_ELIGIBILITY.staff_review_required,
    knowledgeType: KNOWLEDGE_TYPE.accessibility_or_service_need
  };
  OBSERVATION_CANDIDATE_RULES[OBSERVATION_TYPE.complaint] = {
    eligibility: CANDIDATE_ELIGIBILITY.staff_review_required,
    knowledgeType: KNOWLEDGE_TYPE.complaint_pattern
  };
  OBSERVATION_CANDIDATE_RULES[OBSERVATION_TYPE.service_recovery] = {
    eligibility: CANDIDATE_ELIGIBILITY.staff_review_required,
    knowledgeType: KNOWLEDGE_TYPE.service_recovery_note
  };
  OBSERVATION_CANDIDATE_RULES[OBSERVATION_TYPE.payment_issue] = {
    eligibility: CANDIDATE_ELIGIBILITY.never_candidate,
    knowledgeType: KNOWLEDGE_TYPE.operational_restriction,
    rejectReason: "payment_not_guest_preference"
  };
  OBSERVATION_CANDIDATE_RULES[OBSERVATION_TYPE.wakeup_or_transport] = {
    eligibility: CANDIDATE_ELIGIBILITY.never_candidate,
    knowledgeType: KNOWLEDGE_TYPE.recurring_service_pattern,
    rejectReason: "one_stay_timed_service"
  };
  OBSERVATION_CANDIDATE_RULES[OBSERVATION_TYPE.parcel_or_delivery] = {
    eligibility: CANDIDATE_ELIGIBILITY.never_candidate,
    rejectReason: "current_stay_parcel"
  };
  OBSERVATION_CANDIDATE_RULES[OBSERVATION_TYPE.maintenance_guest_impact] = {
    eligibility: CANDIDATE_ELIGIBILITY.never_candidate,
    rejectReason: "temporary_maintenance_impact"
  };
  OBSERVATION_CANDIDATE_RULES[OBSERVATION_TYPE.late_checkout_request] = {
    eligibility: CANDIDATE_ELIGIBILITY.never_candidate,
    rejectReason: "current_stay_operational_request"
  };
  OBSERVATION_CANDIDATE_RULES[OBSERVATION_TYPE.general_guest_request] = {
    eligibility: CANDIDATE_ELIGIBILITY.never_candidate,
    rejectReason: "untyped_general_request"
  };
  OBSERVATION_CANDIDATE_RULES[OBSERVATION_TYPE.informational] = {
    eligibility: CANDIDATE_ELIGIBILITY.never_candidate,
    rejectReason: "informational_only"
  };

  function trimText(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function normalizeRoom(value) {
    if (global.ShiftIntelligenceEngine &&
        typeof global.ShiftIntelligenceEngine.normalizeRoomNumber === "function") {
      return global.ShiftIntelligenceEngine.normalizeRoomNumber(value) || "";
    }
    var m = String(value || "").match(/(\d{1,4}[a-z]?)/i);
    return m ? m[1].toLowerCase() : "";
  }

  function factRooms(fact, note) {
    var rooms = [];
    if (fact && fact.rooms && fact.rooms.length) {
      fact.rooms.forEach(function (r) {
        var id = normalizeRoom(r);
        if (id && rooms.indexOf(id) === -1) rooms.push(id);
      });
    }
    if (fact && fact.room) {
      var one = normalizeRoom(typeof fact.room === "object" ? fact.room.id || fact.room.label : fact.room);
      if (one && rooms.indexOf(one) === -1) rooms.push(one);
    }
    if (note && note.rooms && note.rooms.length) {
      note.rooms.forEach(function (r) {
        var id = normalizeRoom(r);
        if (id && rooms.indexOf(id) === -1) rooms.push(id);
      });
    }
    return rooms;
  }

  function factGuestName(fact, note) {
    var name = trimText((fact && fact.guestName) || (note && note.guestName) || "");
    if (name) return name;
    var src = trimText((fact && fact.sourceText) || (note && note.original) || "");
    var m = src.match(/\b((?:Mr|Mrs|Ms|Miss)\s+[A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+)?)\b/);
    return m ? trimText(m[1]) : "";
  }

  function factSubject(fact) {
    return trimText((fact && (fact.subject || fact.subjectType)) || "")
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
  }

  function sourceTextOf(fact, note) {
    return trimText((fact && (fact.sourceText || fact.detail)) || (note && note.original) || "");
  }

  function confidenceLabelFromValue(value) {
    if (global.ShiftIntelligenceEngine &&
        typeof global.ShiftIntelligenceEngine.confidenceLabelFromValue === "function") {
      return global.ShiftIntelligenceEngine.confidenceLabelFromValue(value);
    }
    if (value >= 0.75) return CONFIDENCE_LABEL.high;
    if (value >= 0.45) return CONFIDENCE_LABEL.medium;
    return CONFIDENCE_LABEL.low;
  }

  function isFactClosed(fact, context) {
    if (context && (context.currentStatus === "completed" || context.currentStatus === "confirmed")) {
      if (context.currentStatus === "confirmed" &&
          /attendance|tomorrow|eta/i.test(sourceTextOf(fact, null))) {
        /* maintenance appointment — not guest observation closure */
      } else if (context.currentStatus === "completed") {
        return true;
      }
    }
    if (global.ShiftIntelligenceEngine &&
        typeof global.ShiftIntelligenceEngine.isOperationalFactClosed === "function") {
      return global.ShiftIntelligenceEngine.isOperationalFactClosed(fact);
    }
    var s = String((fact && fact.status) || "").toLowerCase();
    return s === "done" || s === "completed" || s === "resolved" || s === "closed";
  }

  /**
   * Prohibited inference / storage — never emit as a normal GuestObservation.
   * Rejection omits raw sensitive text.
   */
  function detectProhibited(src) {
    var text = String(src || "");
    if (!trimText(text)) return null;
    if (/\b(pregnant|pregnancy)\b/i.test(text)) {
      return { code: "prohibited_sensitive_inference", reasonCode: "prohibited_pregnancy_inference" };
    }
    if (/\b(anxiety|depressed|mental\s*health|bipolar|autistic|disability\s+diagnos)/i.test(text)) {
      return { code: "prohibited_sensitive_inference", reasonCode: "prohibited_health_inference" };
    }
    if (/\b(difficult\s+guest|nightmare\s+guest|personality|psychopath)\b/i.test(text)) {
      return { code: "prohibited_sensitive_inference", reasonCode: "prohibited_character_label" };
    }
    if (/\b(probably\s+has|sounds?\s+like\s+(?:he|she|they)|looks?\s+(?:gay|jewish|muslim|foreign))\b/i.test(text)) {
      return { code: "prohibited_sensitive_inference", reasonCode: "prohibited_trait_inference" };
    }
    if (/\b(?:ethnicity|religion|sexual\s+orientation|political)\b/i.test(text) &&
        /\b(infer|assume|probably|seems|sounds)\b/i.test(text)) {
      return { code: "prohibited_sensitive_inference", reasonCode: "prohibited_trait_inference" };
    }
    if (/\b(?:\d{13,19}|passport\s*(?:no|number|#)|national\s*insurance|ssn)\b/i.test(text) ||
        /\b(?:cvv|cvc|card\s*number|pan\s*:)\b/i.test(text)) {
      return { code: "prohibited_storage", reasonCode: "prohibited_credential_or_id" };
    }
    return null;
  }

  function extractReservationRefs(src) {
    var text = String(src || "");
    var reservationId = "";
    var bookingReference = "";
    var m = text.match(/\b(?:reservation|booking|conf(?:irmation)?)\s*(?:#|no\.?|number)?\s*([A-Z0-9-]{4,})\b/i);
    if (m) {
      reservationId = trimText(m[1]);
      bookingReference = reservationId;
    }
    var pms = text.match(/\b(?:pms|opera)\s*(?:id|#)?\s*([A-Z0-9-]{4,})\b/i);
    if (pms && !reservationId) reservationId = trimText(pms[1]);
    return { reservationId: reservationId, bookingReference: bookingReference };
  }

  function buildIdentityEvidence(fact, note, rooms, guestName) {
    var src = sourceTextOf(fact, note);
    var refs = extractReservationRefs(src);
    return {
      guestName: guestName || "",
      room: rooms[0] || "",
      rooms: rooms.slice(),
      reservationId: refs.reservationId,
      bookingReference: refs.bookingReference,
      sourceType: trimText((fact && fact.sourceType) || (note && note._neutralSourceType) || "handover")
    };
  }

  function matchStrengthFromEvidence(evidence, hasStayContext) {
    evidence = evidence || {};
    if (evidence.reservationId || evidence.bookingReference) return MATCH_STRENGTH.strong;
    if (evidence.guestName && evidence.room) return MATCH_STRENGTH.probable;
    if (evidence.guestName && hasStayContext) return MATCH_STRENGTH.probable;
    if (evidence.room && !evidence.guestName) return MATCH_STRENGTH.uncertain;
    if (evidence.guestName && !evidence.room) return MATCH_STRENGTH.uncertain;
    return MATCH_STRENGTH.none;
  }

  function isGenericNonGuestNote(src) {
    var text = String(src || "").toLowerCase();
    if (!trimText(text)) return true;
    if (/^busy\b/.test(text) && /shift|night|day|all guests/.test(text)) return true;
    if (/all guests in|quiet shift|no issues|handover ready|end of day/.test(text) &&
        !/\broom\s+\d|mr\s+|mrs\s+|ms\s+/i.test(src)) {
      return true;
    }
    if (/^maintenance informed\.?$/i.test(text)) return true;
    if (/hotel standards|staff reminder|policy is/i.test(text) &&
        !/\broom\s+\d|mr\s+|mrs\s+/i.test(src)) {
      return true;
    }
    return false;
  }

  function classifyObservationType(fact, note, context, src) {
    var subject = factSubject(fact);
    var text = String(src || "");
    var ctxObj = (context && context.objectType) || "";

    if (detectProhibited(text)) return null;

    if (subject === "late_checkout" || /late\s*check[\s-]*out|late\s*c\/?o\b/i.test(text)) {
      return OBSERVATION_TYPE.late_checkout_request;
    }
    if (subject === "wake_up" || subject === "transfer" || subject === "departure_followup" ||
        ctxObj === "wake_up" || ctxObj === "transport" || ctxObj === "departure" ||
        /\bwake[\s-]*up\b|\btaxi\b|\baddison\b|\btransfer\b/i.test(text)) {
      if (/\bwake|\btaxi|\btransfer|\baddison/i.test(text) ||
          subject === "wake_up" || subject === "transfer" || subject === "departure_followup") {
        return OBSERVATION_TYPE.wakeup_or_transport;
      }
    }
    if (subject === "delivery" || /\bparcel|package|delivery\b/i.test(text)) {
      return OBSERVATION_TYPE.parcel_or_delivery;
    }
    if (subject === "outstanding_balance" || subject === "payment" || subject === "payment_balance" ||
        subject === "financial_settlement_unclear" || ctxObj === "payment" ||
        /\b(expedia|booking\.com|ota|declined|outstanding|folio|balance|payment)\b/i.test(text)) {
      if (/\b(expedia|booking\.com|ota|declined|outstanding|folio|balance|payment|unpaid)\b/i.test(text) ||
          subject.indexOf("payment") !== -1 || subject === "outstanding_balance") {
        return OBSERVATION_TYPE.payment_issue;
      }
    }
    if (subject === "maintenance" || ctxObj === "maintenance") {
      if (/\bguest\b|in[\s-]?house|occup/i.test(text) || (fact && fact.guestImpact === "high")) {
        return OBSERVATION_TYPE.maintenance_guest_impact;
      }
      return null; /* plant/lobby-only maintenance is not a guest observation */
    }
    if (subject === "complaint" || /complaint|unhappy|noise|corridor\s+noise|apologis|apologiz/i.test(text)) {
      if (/quiet afterwards|resolved|apologis|apologiz|satisfied|closed/i.test(text)) {
        return OBSERVATION_TYPE.service_recovery;
      }
      if (/complaint|unhappy|noise|corridor/i.test(text) || subject === "complaint") {
        return OBSERVATION_TYPE.complaint;
      }
    }
    if (subject === "vip_arrival" || (note && note.isVip) || /\bvip\b/i.test(text)) {
      if (/\b(anniversary|birthday|honeymoon|occasion)\b/i.test(text)) {
        return OBSERVATION_TYPE.occasion;
      }
      return OBSERVATION_TYPE.vip_or_recognition;
    }
    if (/wheelchair|accessible\s+room|step[\s-]*free|mobility|hearing\s+aid|visual\s+assist|dietary|allerg/i.test(text) ||
        /feather[\s-]*free|cot\b|baby\s*cot/i.test(text) && /require|need|accessible/i.test(text)) {
      if (/wheelchair|accessible|step[\s-]*free|mobility|hearing|visual|dietary|allerg/i.test(text)) {
        return OBSERVATION_TYPE.accessibility_or_service_need;
      }
    }
    if (/feather[\s-]*free|hypoallergenic|non[\s-]*feather/i.test(text)) {
      return OBSERVATION_TYPE.bedding_preference;
    }
    if (/twin\s+(?:bed|setup|room)|king\s+bed|double\s+bed|extra\s+bed|rollaway/i.test(text) ||
        subject === "twin_setup") {
      return OBSERVATION_TYPE.bed_configuration;
    }
    if (/high\s+floor|upper\s+floor|nth\s+floor|\d+(?:st|nd|rd|th)\s+floor|ground\s+floor|lower\s+ground/i.test(text) ||
        (fact && fact.preferredLocation)) {
      return OBSERVATION_TYPE.floor_preference;
    }
    if (/away from (?:the\s+)?lift|quiet\s+room|quiet[\s-]?facing|courtyard|street[\s-]?facing/i.test(text)) {
      return OBSERVATION_TYPE.location_preference;
    }
    if (/welcome\s+card|champagne|chocolates?|amenity|amenities/i.test(text) &&
        (/\bvip\b|prefer|request|require/i.test(text) || subject === "vip_arrival")) {
      return OBSERVATION_TYPE.amenity_preference;
    }
    if (/prefer.*room|requested?\s+room|room\s+preference/i.test(text)) {
      return OBSERVATION_TYPE.room_preference;
    }
    if (subject === "guest_request" || subject === "room_move" || subject === "extension") {
      return OBSERVATION_TYPE.general_guest_request;
    }
    if (subject === "reservation_info" || subject === "guest_arrangement") {
      return OBSERVATION_TYPE.informational;
    }
    return null;
  }

  function sensitivityForType(type) {
    if (type === OBSERVATION_TYPE.accessibility_or_service_need) {
      return { sensitivity: SENSITIVITY.sensitive, approvalRequirement: APPROVAL_REQUIREMENT.staff_review };
    }
    if (type === OBSERVATION_TYPE.payment_issue) {
      return { sensitivity: SENSITIVITY.sensitive, approvalRequirement: APPROVAL_REQUIREMENT.staff_review };
    }
    return { sensitivity: SENSITIVITY.normal, approvalRequirement: APPROVAL_REQUIREMENT.none };
  }

  function retentionHintForType(type, status) {
    if (type === OBSERVATION_TYPE.payment_issue || type === OBSERVATION_TYPE.wakeup_or_transport ||
        type === OBSERVATION_TYPE.parcel_or_delivery) {
      return "short_lived_current_stay";
    }
    if (type === OBSERVATION_TYPE.accessibility_or_service_need || type === OBSERVATION_TYPE.payment_issue) {
      return "sensitive_review_required";
    }
    if (status === OBSERVATION_STATUS.resolved) return "short_lived_resolved";
    return "temporary_observation_only";
  }

  function observationStatus(fact, context, type, src) {
    if (type === OBSERVATION_TYPE.service_recovery ||
        (type === OBSERVATION_TYPE.complaint &&
          /quiet afterwards|resolved|apologis|apologiz|satisfied|closed/i.test(src))) {
      return OBSERVATION_STATUS.resolved;
    }
    if (isFactClosed(fact, context) && type !== OBSERVATION_TYPE.late_checkout_request) {
      if (/confirm/i.test(src) && type === OBSERVATION_TYPE.late_checkout_request) {
        return OBSERVATION_STATUS.confirmed_current_stay;
      }
      if (context && context.currentStatus === "completed") return OBSERVATION_STATUS.resolved;
    }
    if (/\bprefer|usually|always\b/i.test(src)) return OBSERVATION_STATUS.explicit_current_request;
    if (/\brequest|requires?|needs?\b/i.test(src)) return OBSERVATION_STATUS.explicit_current_request;
    return OBSERVATION_STATUS.observed_once;
  }

  function structuredValue(type, fact, note, src) {
    var value = {
      subject: factSubject(fact),
      summaryCode: type,
      requestItem: trimText((fact && fact.requestItem) || ""),
      preferredLocation: trimText((fact && fact.preferredLocation) || ""),
      components: []
    };
    if (type === OBSERVATION_TYPE.wakeup_or_transport) {
      if (/\bwake/i.test(src)) value.components.push("wake_up");
      if (/\btaxi|addison|transfer/i.test(src)) value.components.push("transport");
    }
    if (type === OBSERVATION_TYPE.occasion) {
      var occ = src.match(/\b(anniversary|birthday|honeymoon)\b/i);
      if (occ) value.occasion = occ[1].toLowerCase();
    }
    if (type === OBSERVATION_TYPE.floor_preference || type === OBSERVATION_TYPE.location_preference) {
      if (fact && fact.preferredLocation) value.preferredLocation = fact.preferredLocation;
      else if (/high\s+floor|upper\s+floor/i.test(src)) value.preferredLocation = "high_floor";
      else if (/away from (?:the\s+)?lift/i.test(src)) value.locationDetail = "away_from_lift";
      else if (/quiet/i.test(src)) value.locationDetail = "quiet";
    }
    if (type === OBSERVATION_TYPE.bedding_preference) {
      value.requestItem = value.requestItem || "feather_free";
    }
    /* Never store polished prose paragraphs — keep codes/short tokens only. */
    value.sourceSnippetLength = String(src || "").length;
    return value;
  }

  function computeConfidence(matchStrength, status, context, type) {
    var base = 0.5;
    if (context && typeof context.confidence === "number") base = context.confidence;
    if (matchStrength === MATCH_STRENGTH.strong) base = Math.max(base, 0.85);
    else if (matchStrength === MATCH_STRENGTH.probable) base = Math.max(base, 0.75);
    else if (matchStrength === MATCH_STRENGTH.uncertain) base = Math.min(base, 0.6);
    else base = Math.min(base, 0.35);

    if (status === OBSERVATION_STATUS.explicit_current_request ||
        status === OBSERVATION_STATUS.confirmed_current_stay) {
      base = Math.max(base, 0.8);
    }
    if (status === OBSERVATION_STATUS.uncertain) base = Math.min(base, 0.4);
    if (type === OBSERVATION_TYPE.informational) base = Math.min(base, 0.55);
    if (base > 1) base = 1;
    if (base < 0) base = 0;
    return Math.round(base * 100) / 100;
  }

  function createEmptyObservation() {
    return {
      observationId: "",
      workspaceId: "",
      sourceFactIds: [],
      sourceReportIds: [],
      guestIdentityEvidence: {
        guestName: "",
        room: "",
        rooms: [],
        reservationId: "",
        bookingReference: "",
        sourceType: "handover"
      },
      guestMatchStrength: MATCH_STRENGTH.none,
      room: "",
      guestName: "",
      observationType: "",
      value: {},
      status: OBSERVATION_STATUS.observed_once,
      observedAt: "",
      confidence: 0.5,
      confidenceLabel: CONFIDENCE_LABEL.medium,
      sensitivity: SENSITIVITY.normal,
      approvalRequirement: APPROVAL_REQUIREMENT.none,
      retentionHint: "temporary_observation_only",
      reasonCodes: [],
      memoryRefs: [],
      decisionTraceRefs: [],
      temporary: true,
      persistent: false,
      preferencePromoted: false
    };
  }

  function observationIdFor(workspaceId, type, room, guestName, factId) {
    return [
      "gobs",
      trimText(workspaceId) || "local",
      type || "unknown",
      room || "",
      String(guestName || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 24),
      String(factId || "").slice(0, 48)
    ].filter(Boolean).join(":");
  }

  function dedupeKey(obs) {
    return [
      obs.observationType,
      obs.room || "",
      String(obs.guestName || "").toLowerCase(),
      (obs.value && obs.value.summaryCode) || "",
      (obs.value && obs.value.requestItem) || "",
      (obs.value && obs.value.preferredLocation) || "",
      (obs.value && obs.value.locationDetail) || "",
      (obs.value && obs.value.components ? obs.value.components.join("+") : "")
    ].join("|");
  }

  function resolveContext(fact, note, contextsByFactId, factId) {
    if (factId && contextsByFactId[factId]) return contextsByFactId[factId];
    if (fact && fact.operationalContext) return fact.operationalContext;
    if (global.ShiftIntelligenceEngine &&
        typeof global.ShiftIntelligenceEngine.buildOperationalContext === "function") {
      return global.ShiftIntelligenceEngine.buildOperationalContext(fact, {
        note: note,
        section: note && note.section,
        isVip: note && note.isVip
      });
    }
    return null;
  }

  /**
   * GI-1 canonical entry — read-only temporary observations.
   * @returns {{ observations: GuestObservation[], rejections: Object[] }}
   */
  function extractGuestObservations(input) {
    input = input || {};
    var workspaceId = trimText(input.workspaceId || "");
    var reportId = trimText(input.reportId || input.currentReportId || "");
    var observedAt = trimText(input.observedAt || input.memoryNow || "") || new Date().toISOString();
    var isDemo = !!(input.isDemoData || workspaceId === "demo-workspace");

    var facts = Array.isArray(input.facts) ? input.facts.slice() : [];
    var analyzed = Array.isArray(input.analyzedNotes) ? input.analyzedNotes : [];
    var memories = Array.isArray(input.memories) ? input.memories :
      (Array.isArray(input.operationalMemories) ? input.operationalMemories : []);
    var contextsByFactId = input.contextsByFactId || {};

    if (!facts.length && analyzed.length) {
      facts = analyzed.map(function (note, i) {
        return note.fact || note;
      });
    }

    var observations = [];
    var rejections = [];
    var seenKeys = {};
    var seenFactIds = {};

    facts.forEach(function (fact, index) {
      if (!fact || typeof fact !== "object") return;
      var note = analyzed[index] || { original: fact.sourceText || "", rooms: fact.rooms || [] };
      var factId = trimText(
        (note && note._neutralFactId) || fact.id || ("fact-" + index)
      );
      var src = sourceTextOf(fact, note);

      var prohibited = detectProhibited(src);
      if (prohibited) {
        rejections.push({
          rejectionId: "rej:" + factId,
          code: prohibited.code,
          reasonCode: prohibited.reasonCode,
          sensitivity: SENSITIVITY.prohibited,
          approvalRequirement: APPROVAL_REQUIREMENT.never_store,
          sourceFactIds: factId ? [factId] : [],
          /* Intentionally omit source text / guest details */
          retainedContent: false
        });
        return;
      }

      if (isGenericNonGuestNote(src)) return;

      var rooms = factRooms(fact, note);
      var guestName = factGuestName(fact, note);
      var context = resolveContext(fact, note, contextsByFactId, factId);
      var type = classifyObservationType(fact, note, context, src);
      if (!type) return;

      var hasStayContext = !!(
        (note && note.isVip) ||
        /arriv|depart|check[\s-]*in|in[\s-]?house|stay/i.test(src) ||
        (fact && (fact.arrivalDate || fact.guestType))
      );

      var identity = buildIdentityEvidence(fact, note, rooms, guestName);
      var strength = matchStrengthFromEvidence(identity, hasStayContext);

      /* Must be guest-specific: name, room/stay, reservation, or explicit guest need. */
      if (strength === MATCH_STRENGTH.none) {
        if (type === OBSERVATION_TYPE.accessibility_or_service_need &&
            /\bguest\s+requires?|\brequires?\s+(?:a\s+)?wheelchair|accessible\s+room\b/i.test(src)) {
          strength = MATCH_STRENGTH.uncertain;
        } else if (rooms.length) {
          strength = MATCH_STRENGTH.uncertain;
        } else if (guestName) {
          strength = MATCH_STRENGTH.uncertain;
        } else if (type === OBSERVATION_TYPE.vip_or_recognition && hasStayContext) {
          strength = MATCH_STRENGTH.uncertain;
        } else {
          return;
        }
      }

      /* Maintenance without guest/room impact already filtered in classify. */
      if (type === OBSERVATION_TYPE.parcel_or_delivery && !rooms.length && !guestName) {
        return;
      }

      var status = observationStatus(fact, context, type, src);
      var sens = sensitivityForType(type);
      var confidence = computeConfidence(strength, status, context, type);
      if (confidence < 0.45 && strength === MATCH_STRENGTH.none) return;
      if (confidence < 0.35) return;

      var obs = createEmptyObservation();
      obs.observationId = observationIdFor(workspaceId, type, rooms[0], guestName, factId);
      obs.workspaceId = workspaceId;
      obs.sourceFactIds = factId ? [factId] : [];
      if (reportId) obs.sourceReportIds = [reportId];
      obs.guestIdentityEvidence = identity;
      obs.guestMatchStrength = strength;
      obs.room = rooms[0] || "";
      obs.guestName = guestName;
      obs.observationType = type;
      obs.value = structuredValue(type, fact, note, src);
      obs.status = status;
      obs.observedAt = observedAt;
      obs.confidence = confidence;
      obs.confidenceLabel = confidenceLabelFromValue(confidence);
      obs.sensitivity = sens.sensitivity;
      obs.approvalRequirement = sens.approvalRequirement;
      obs.retentionHint = retentionHintForType(type, status);
      obs.reasonCodes = ["guest_observation", type, "gi1_temporary"];
      if (strength === MATCH_STRENGTH.uncertain) {
        obs.reasonCodes.push("room_or_name_only_identity");
      }
      if (sens.sensitivity === SENSITIVITY.sensitive) {
        obs.reasonCodes.push("sensitive_staff_review");
      }

      /* Link supporting memory / trace ids without copying prose. */
      memories.forEach(function (mem) {
        if (!mem) return;
        var ids = mem.sourceFactIds || [];
        if (factId && ids.indexOf(factId) !== -1 && mem.memoryId) {
          obs.memoryRefs.push(mem.memoryId);
        }
      });
      if (input.decisionTraces && input.decisionTraces[factId]) {
        obs.decisionTraceRefs.push(factId);
      }

      var key = dedupeKey(obs);
      if (seenKeys[key]) {
        var existing = seenKeys[key];
        if (factId && existing.sourceFactIds.indexOf(factId) === -1) {
          existing.sourceFactIds.push(factId);
        }
        if (obs.value.components && obs.value.components.length) {
          obs.value.components.forEach(function (c) {
            if (existing.value.components.indexOf(c) === -1) existing.value.components.push(c);
          });
        }
        return;
      }
      if (factId && seenFactIds[factId] && type === OBSERVATION_TYPE.wakeup_or_transport) {
        /* Same fact already emitted a wake/taxi observation. */
        return;
      }

      seenKeys[key] = obs;
      if (factId) seenFactIds[factId] = true;
      observations.push(obs);
    });

    var result = { observations: observations, rejections: rejections, phase: "GI-1" };
    if (isDemo) {
      lastDemoObservations = observations.slice();
    }
    return result;
  }

  function clearDemoObservations() {
    lastDemoObservations = null;
  }

  function getLastDemoObservations() {
    return lastDemoObservations ? lastDemoObservations.slice() : [];
  }

  /* ─── GI-2: CandidateGuestKnowledge ────────────────────────────────────── */

  function normalizeGuestNameKey(name) {
    return String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);
  }

  function proposedValueFromObservation(obs) {
    var value = (obs && obs.value) || {};
    var type = obs.observationType;
    var proposed = {
      code: "",
      tokens: []
    };
    if (type === OBSERVATION_TYPE.floor_preference) {
      proposed.code = value.preferredLocation || "high_floor";
      if (/ground|lower/i.test(proposed.code) || value.locationDetail === "ground_floor") {
        proposed.code = "ground_floor";
      } else if (/high|upper/i.test(proposed.code)) {
        proposed.code = "high_floor";
      }
    } else if (type === OBSERVATION_TYPE.location_preference || type === OBSERVATION_TYPE.room_preference) {
      proposed.code = value.locationDetail || value.preferredLocation || "location_preference";
    } else if (type === OBSERVATION_TYPE.bedding_preference) {
      proposed.code = value.requestItem || "feather_free";
      if (/feather[\s_-]*free|hypoallergenic|non[\s_-]*feather/i.test(proposed.code)) {
        proposed.code = "feather_free";
      } else if (/feather/i.test(proposed.code) && !/free|non/i.test(proposed.code)) {
        proposed.code = "feather_ok";
      }
    } else if (type === OBSERVATION_TYPE.bed_configuration) {
      proposed.code = value.requestItem || "bed_configuration";
    } else if (type === OBSERVATION_TYPE.amenity_preference) {
      proposed.code = value.requestItem || "amenity";
    } else if (type === OBSERVATION_TYPE.accessibility_or_service_need) {
      proposed.code = "accessible_room_need";
      proposed.tokens = ["service_need"];
    } else if (type === OBSERVATION_TYPE.occasion) {
      proposed.code = value.occasion || "occasion";
    } else if (type === OBSERVATION_TYPE.vip_or_recognition) {
      proposed.code = "vip_recognition";
    } else if (type === OBSERVATION_TYPE.complaint || type === OBSERVATION_TYPE.service_recovery) {
      proposed.code = value.summaryCode || type;
    } else if (type === OBSERVATION_TYPE.payment_issue) {
      proposed.code = "payment_issue_current_stay";
    } else {
      proposed.code = value.summaryCode || type || "unknown";
    }
    return proposed;
  }

  function valuesCompatible(a, b) {
    if (!a || !b) return false;
    return String(a.code || "") === String(b.code || "");
  }

  function valuesConflict(a, b, knowledgeType) {
    if (!a || !b) return false;
    if (String(a.code) === String(b.code)) return false;
    if (knowledgeType === KNOWLEDGE_TYPE.floor_preference) {
      var floors = { high_floor: 1, upper_floor: 1, ground_floor: 2, lower_ground: 2 };
      return !!(floors[a.code] && floors[b.code] && floors[a.code] !== floors[b.code]);
    }
    if (knowledgeType === KNOWLEDGE_TYPE.bedding_preference) {
      return (a.code === "feather_free" && a.code !== b.code) ||
        (b.code === "feather_free" && a.code !== b.code) ||
        (a.code === "feather_ok" && b.code === "feather_free") ||
        (b.code === "feather_ok" && a.code === "feather_free");
    }
    if (knowledgeType === KNOWLEDGE_TYPE.room_location_preference) {
      return true;
    }
    return false;
  }

  /**
   * Aggregation identity key — namesakes in different rooms without reservation stay separate.
   * Cross-stay aggregation requires reservation match OR (same guestName + same room).
   */
  function candidateIdentityKey(obs) {
    var evidence = (obs && obs.guestIdentityEvidence) || {};
    var reservation = trimText(evidence.reservationId || evidence.bookingReference || "");
    var nameKey = normalizeGuestNameKey(obs.guestName || evidence.guestName || "");
    var room = normalizeRoom(obs.room || evidence.room || "");
    if (reservation) return "res:" + reservation.toLowerCase();
    if (nameKey && room) return "name_room:" + nameKey + "|" + room;
    if (nameKey) return "name_only:" + nameKey;
    if (room) return "room_only:" + room;
    return "anon:" + (obs.observationId || "x");
  }

  function canAggregateKeys(keyA, keyB, obsA, obsB) {
    if (keyA === keyB) {
      /* Same name different rooms without reservation → keys differ (name_room). */
      if (keyA.indexOf("name_only:") === 0) {
        var roomA = normalizeRoom(obsA.room);
        var roomB = normalizeRoom(obsB.room);
        if (roomA && roomB && roomA !== roomB) return false;
      }
      return true;
    }
    var resA = trimText((obsA.guestIdentityEvidence || {}).reservationId ||
      (obsA.guestIdentityEvidence || {}).bookingReference || "");
    var resB = trimText((obsB.guestIdentityEvidence || {}).reservationId ||
      (obsB.guestIdentityEvidence || {}).bookingReference || "");
    if (resA && resB && resA.toLowerCase() === resB.toLowerCase()) return true;
    return false;
  }

  function isRoomOnlyObservation(obs) {
    var strength = obs.guestMatchStrength;
    var name = trimText(obs.guestName || (obs.guestIdentityEvidence && obs.guestIdentityEvidence.guestName) || "");
    var reservation = trimText(
      (obs.guestIdentityEvidence && (obs.guestIdentityEvidence.reservationId ||
        obs.guestIdentityEvidence.bookingReference)) || ""
    );
    if (reservation) return false;
    if (!name && obs.room) return true;
    if (strength === MATCH_STRENGTH.uncertain && !name) return true;
    return false;
  }

  function identitySufficientForCandidate(obs) {
    if (isRoomOnlyObservation(obs)) return false;
    var strength = obs.guestMatchStrength;
    if (strength === MATCH_STRENGTH.strong || strength === MATCH_STRENGTH.probable) return true;
    /*
     * Accessibility / service need: named guest may propose a staff-review candidate
     * even at uncertain match — never auto-confirmed, never a diagnosis.
     */
    if (obs.observationType === OBSERVATION_TYPE.accessibility_or_service_need &&
        trimText(obs.guestName || (obs.guestIdentityEvidence && obs.guestIdentityEvidence.guestName))) {
      return true;
    }
    return false;
  }

  function createEmptyCandidate() {
    return {
      candidateId: "",
      workspaceId: "",
      identityEvidence: {
        guestName: "",
        room: "",
        rooms: [],
        reservationId: "",
        bookingReference: "",
        sourceType: "handover"
      },
      guestMatchStrength: MATCH_STRENGTH.none,
      knowledgeType: "",
      proposedValue: { code: "", tokens: [] },
      sourceObservationIds: [],
      sourceFactIds: [],
      sourceReportIds: [],
      evidenceSummary: {
        observationTypes: [],
        statuses: [],
        proposedCodes: []
      },
      evidenceCount: 0,
      confidence: 0,
      confidenceLabel: CONFIDENCE_LABEL.low,
      approvalRequirement: APPROVAL_REQUIREMENT.none,
      sensitivity: SENSITIVITY.normal,
      lifecycleStatus: CANDIDATE_LIFECYCLE.proposed,
      contradictionState: CONTRADICTION_STATE.none,
      retentionHint: "temporary_candidate_only",
      reasonCodes: [],
      createdAt: "",
      temporary: true,
      persistent: false,
      confirmed: false,
      preferencePromoted: false
    };
  }

  /**
   * Deterministic confidence (evidence quality, not importance):
   *   base = mean(source observation confidence)
   *   + identity: strong +0.08, probable +0.04, uncertain −0.12
   *   + explicit_current_request / confirmed_current_stay present: +0.05
   *   + (evidenceCount − 1) * 0.07 (cap +0.21)
   *   − contradiction conflicting: −0.22
   *   room-only / insufficient path: cap 0.45
   *   sensitive does not remove staff_review
   */
  function computeCandidateConfidence(obsList, matchStrength, contradictionState) {
    var sum = 0;
    var n = 0;
    var hasExplicit = false;
    (obsList || []).forEach(function (o) {
      if (typeof o.confidence === "number") {
        sum += o.confidence;
        n += 1;
      }
      if (o.status === OBSERVATION_STATUS.explicit_current_request ||
          o.status === OBSERVATION_STATUS.confirmed_current_stay) {
        hasExplicit = true;
      }
    });
    var base = n ? (sum / n) : 0.5;
    if (matchStrength === MATCH_STRENGTH.strong) base += 0.08;
    else if (matchStrength === MATCH_STRENGTH.probable) base += 0.04;
    else if (matchStrength === MATCH_STRENGTH.uncertain) base -= 0.12;
    else base -= 0.2;
    if (hasExplicit) base += 0.05;
    var extra = Math.min(0.21, Math.max(0, ((obsList && obsList.length) || 1) - 1) * 0.07);
    base += extra;
    if (contradictionState === CONTRADICTION_STATE.conflicting) base -= 0.22;
    if (contradictionState === CONTRADICTION_STATE.uncertain) base -= 0.1;
    if (matchStrength === MATCH_STRENGTH.uncertain) base = Math.min(base, 0.55);
    if (base > 1) base = 1;
    if (base < 0) base = 0;
    return Math.round(base * 100) / 100;
  }

  function strongestMatch(obsList) {
    var order = { strong: 3, probable: 2, uncertain: 1, none: 0 };
    var best = MATCH_STRENGTH.none;
    (obsList || []).forEach(function (o) {
      if ((order[o.guestMatchStrength] || 0) > (order[best] || 0)) best = o.guestMatchStrength;
    });
    return best;
  }

  function mergeIdentityEvidence(obsList) {
    var out = {
      guestName: "",
      room: "",
      rooms: [],
      reservationId: "",
      bookingReference: "",
      sourceType: "handover"
    };
    (obsList || []).forEach(function (o) {
      var e = o.guestIdentityEvidence || {};
      if (!out.guestName && (o.guestName || e.guestName)) out.guestName = o.guestName || e.guestName;
      if (!out.room && (o.room || e.room)) out.room = o.room || e.room;
      var rooms = e.rooms || (o.room ? [o.room] : []);
      rooms.forEach(function (r) {
        var id = normalizeRoom(r);
        if (id && out.rooms.indexOf(id) === -1) out.rooms.push(id);
      });
      if (!out.reservationId && e.reservationId) out.reservationId = e.reservationId;
      if (!out.bookingReference && e.bookingReference) out.bookingReference = e.bookingReference;
      if (e.sourceType) out.sourceType = e.sourceType;
    });
    return out;
  }

  function uniquePush(arr, value) {
    if (!value) return;
    if (arr.indexOf(value) === -1) arr.push(value);
  }

  function candidateIdFor(workspaceId, knowledgeType, identityKey, proposedCode) {
    return [
      "gcand",
      trimText(workspaceId) || "local",
      knowledgeType || "unknown",
      String(identityKey || "").replace(/[^a-z0-9:_|-]/gi, "").slice(0, 48),
      String(proposedCode || "").slice(0, 24)
    ].filter(Boolean).join(":");
  }

  /**
   * GI-2 canonical entry — temporary reviewable candidates from GI-1 observations.
   * @returns {{ candidates: CandidateGuestKnowledge[], rejections: Object[] }}
   */
  function buildCandidateGuestKnowledge(input) {
    input = input || {};
    var workspaceId = trimText(input.workspaceId || "");
    var createdAt = trimText(input.observedAt || input.createdAt || "") || new Date().toISOString();
    var isDemo = !!(input.isDemoData || workspaceId === "demo-workspace");
    var observations = Array.isArray(input.observations) ? input.observations.slice() : [];
    var observationRejections = Array.isArray(input.observationRejections) ? input.observationRejections : [];

    var candidates = [];
    var rejections = [];
    var groups = [];

    observationRejections.forEach(function (rej) {
      if (!rej) return;
      rejections.push({
        rejectionId: rej.rejectionId || ("crej:" + (rej.sourceFactIds && rej.sourceFactIds[0])),
        code: "prohibited_no_candidate",
        reasonCode: rej.reasonCode || "prohibited",
        lifecycleStatus: CANDIDATE_LIFECYCLE.prohibited,
        sensitivity: SENSITIVITY.prohibited,
        approvalRequirement: APPROVAL_REQUIREMENT.never_store,
        sourceFactIds: rej.sourceFactIds || [],
        retainedContent: false
      });
    });

    observations.forEach(function (obs) {
      if (!obs || !obs.observationId) return;
      if (!obs.sourceFactIds || !obs.sourceFactIds.length) return;
      if (obs.workspaceId && workspaceId && obs.workspaceId !== workspaceId) return;

      var rule = OBSERVATION_CANDIDATE_RULES[obs.observationType];
      if (!rule) {
        rejections.push({
          rejectionId: "crej:" + obs.observationId,
          code: "unknown_observation_type",
          reasonCode: "no_candidate_rule",
          lifecycleStatus: CANDIDATE_LIFECYCLE.rejected_by_rule,
          sourceObservationIds: [obs.observationId],
          sourceFactIds: obs.sourceFactIds.slice(),
          retainedContent: false
        });
        return;
      }

      if (rule.eligibility === CANDIDATE_ELIGIBILITY.never_candidate) {
        rejections.push({
          rejectionId: "crej:" + obs.observationId,
          code: "never_candidate",
          reasonCode: rule.rejectReason || "never_candidate",
          lifecycleStatus: CANDIDATE_LIFECYCLE.rejected_by_rule,
          knowledgeType: rule.knowledgeType || "",
          sourceObservationIds: [obs.observationId],
          sourceFactIds: obs.sourceFactIds.slice(),
          retainedContent: false
        });
        return;
      }

      if (obs.sensitivity === SENSITIVITY.prohibited ||
          obs.approvalRequirement === APPROVAL_REQUIREMENT.never_store) {
        rejections.push({
          rejectionId: "crej:" + obs.observationId,
          code: "prohibited_no_candidate",
          reasonCode: "prohibited_observation",
          lifecycleStatus: CANDIDATE_LIFECYCLE.prohibited,
          sourceObservationIds: [obs.observationId],
          retainedContent: false
        });
        return;
      }

      var proposed = proposedValueFromObservation(obs);
      var idKey = candidateIdentityKey(obs);

      /* Room-only → insufficient_evidence (not durable / not cross-stay). */
      if (isRoomOnlyObservation(obs) || !identitySufficientForCandidate(obs)) {
        if (isRoomOnlyObservation(obs)) {
          var insuff = createEmptyCandidate();
          insuff.candidateId = candidateIdFor(workspaceId, rule.knowledgeType, idKey, proposed.code);
          insuff.workspaceId = workspaceId || obs.workspaceId || "";
          insuff.identityEvidence = mergeIdentityEvidence([obs]);
          insuff.guestMatchStrength = obs.guestMatchStrength || MATCH_STRENGTH.uncertain;
          insuff.knowledgeType = rule.knowledgeType;
          insuff.proposedValue = proposed;
          insuff.sourceObservationIds = [obs.observationId];
          insuff.sourceFactIds = obs.sourceFactIds.slice();
          insuff.sourceReportIds = (obs.sourceReportIds || []).slice();
          insuff.evidenceSummary = {
            observationTypes: [obs.observationType],
            statuses: [obs.status],
            proposedCodes: [proposed.code]
          };
          insuff.evidenceCount = 1;
          insuff.confidence = Math.min(0.45, typeof obs.confidence === "number" ? obs.confidence : 0.4);
          insuff.confidenceLabel = confidenceLabelFromValue(insuff.confidence);
          insuff.approvalRequirement = APPROVAL_REQUIREMENT.staff_review;
          insuff.sensitivity = obs.sensitivity || SENSITIVITY.normal;
          insuff.lifecycleStatus = CANDIDATE_LIFECYCLE.insufficient_evidence;
          insuff.contradictionState = CONTRADICTION_STATE.none;
          insuff.retentionHint = "current_stay_observation_only";
          insuff.reasonCodes = ["gi2_insufficient_identity", "room_only_no_cross_stay", rule.knowledgeType];
          insuff.createdAt = createdAt;
          candidates.push(insuff);
          return;
        }
        rejections.push({
          rejectionId: "crej:" + obs.observationId,
          code: "insufficient_identity",
          reasonCode: "identity_too_weak",
          lifecycleStatus: CANDIDATE_LIFECYCLE.insufficient_evidence,
          sourceObservationIds: [obs.observationId],
          sourceFactIds: obs.sourceFactIds.slice(),
          retainedContent: false
        });
        return;
      }

      var placed = false;
      for (var g = 0; g < groups.length; g++) {
        var group = groups[g];
        if (group.knowledgeType !== rule.knowledgeType) continue;
        if (group.workspaceId !== (workspaceId || obs.workspaceId || "")) continue;
        if (!canAggregateKeys(group.identityKey, idKey, group.seedObs, obs)) continue;

        var conflict = false;
        var compatible = false;
        group.obsList.forEach(function (existing) {
          var existingVal = proposedValueFromObservation(existing);
          if (valuesCompatible(existingVal, proposed)) compatible = true;
          if (valuesConflict(existingVal, proposed, rule.knowledgeType)) conflict = true;
        });

        if (conflict) {
          group.obsList.push(obs);
          group.contradictionState = CONTRADICTION_STATE.conflicting;
          group.proposedValue = group.proposedValue; /* keep first; do not overwrite */
          placed = true;
          break;
        }
        if (compatible || group.obsList.length === 0) {
          group.obsList.push(obs);
          if (!group.proposedValue.code) group.proposedValue = proposed;
          placed = true;
          break;
        }
        /* Same family, incompatible but not formal conflict → uncertain separate group */
      }

      if (!placed) {
        groups.push({
          workspaceId: workspaceId || obs.workspaceId || "",
          knowledgeType: rule.knowledgeType,
          identityKey: idKey,
          seedObs: obs,
          obsList: [obs],
          proposedValue: proposed,
          rule: rule,
          contradictionState: CONTRADICTION_STATE.none
        });
      }
    });

    groups.forEach(function (group) {
      var obsList = group.obsList;
      var matchStrength = strongestMatch(obsList);
      var contradictionState = group.contradictionState || CONTRADICTION_STATE.none;
      var confidence = computeCandidateConfidence(obsList, matchStrength, contradictionState);
      var lifecycle = CANDIDATE_LIFECYCLE.proposed;
      if (contradictionState === CONTRADICTION_STATE.conflicting) {
        lifecycle = CANDIDATE_LIFECYCLE.conflicting;
      }

      var cand = createEmptyCandidate();
      cand.candidateId = candidateIdFor(
        group.workspaceId,
        group.knowledgeType,
        group.identityKey,
        group.proposedValue.code
      );
      cand.workspaceId = group.workspaceId;
      cand.identityEvidence = mergeIdentityEvidence(obsList);
      cand.guestMatchStrength = matchStrength;
      cand.knowledgeType = group.knowledgeType;
      cand.proposedValue = group.proposedValue;
      cand.sourceObservationIds = [];
      cand.sourceFactIds = [];
      cand.sourceReportIds = [];
      cand.evidenceSummary = { observationTypes: [], statuses: [], proposedCodes: [] };
      obsList.forEach(function (o) {
        uniquePush(cand.sourceObservationIds, o.observationId);
        (o.sourceFactIds || []).forEach(function (id) { uniquePush(cand.sourceFactIds, id); });
        (o.sourceReportIds || []).forEach(function (id) { uniquePush(cand.sourceReportIds, id); });
        uniquePush(cand.evidenceSummary.observationTypes, o.observationType);
        uniquePush(cand.evidenceSummary.statuses, o.status);
        uniquePush(cand.evidenceSummary.proposedCodes, proposedValueFromObservation(o).code);
      });
      cand.evidenceCount = Math.max(obsList.length, cand.sourceObservationIds.length);
      cand.confidence = confidence;
      cand.confidenceLabel = confidenceLabelFromValue(confidence);
      cand.sensitivity = SENSITIVITY.normal;
      cand.approvalRequirement = APPROVAL_REQUIREMENT.none;
      obsList.forEach(function (o) {
        if (o.sensitivity === SENSITIVITY.sensitive) cand.sensitivity = SENSITIVITY.sensitive;
        if (o.approvalRequirement === APPROVAL_REQUIREMENT.staff_review ||
            group.rule.eligibility === CANDIDATE_ELIGIBILITY.staff_review_required) {
          cand.approvalRequirement = APPROVAL_REQUIREMENT.staff_review;
        }
      });
      if (group.rule.eligibility === CANDIDATE_ELIGIBILITY.staff_review_required) {
        cand.approvalRequirement = APPROVAL_REQUIREMENT.staff_review;
        cand.sensitivity = cand.sensitivity === SENSITIVITY.prohibited
          ? SENSITIVITY.prohibited
          : SENSITIVITY.sensitive;
      }
      cand.lifecycleStatus = lifecycle;
      cand.contradictionState = contradictionState;
      cand.retentionHint = group.rule.retentionHint || "temporary_candidate_only";
      cand.reasonCodes = ["gi2_candidate", group.knowledgeType, lifecycle];
      if (cand.evidenceCount > 1) cand.reasonCodes.push("repeated_consistent_evidence");
      if (contradictionState === CONTRADICTION_STATE.conflicting) {
        cand.reasonCodes.push("contradiction_no_overwrite");
      }
      if (cand.approvalRequirement === APPROVAL_REQUIREMENT.staff_review) {
        cand.reasonCodes.push("staff_review_required");
      }
      cand.createdAt = createdAt;
      /* Minimum confidence for proposed auto_proposable — else insufficient */
      if (lifecycle === CANDIDATE_LIFECYCLE.proposed && confidence < 0.45) {
        cand.lifecycleStatus = CANDIDATE_LIFECYCLE.insufficient_evidence;
        cand.reasonCodes.push("below_confidence_threshold");
      }
      candidates.push(cand);
    });

    var result = {
      candidates: candidates,
      rejections: rejections,
      phase: "GI-2"
    };
    if (isDemo) {
      lastDemoCandidates = candidates.slice();
    }
    return result;
  }

  function clearDemoCandidates() {
    lastDemoCandidates = null;
  }

  function getLastDemoCandidates() {
    return lastDemoCandidates ? lastDemoCandidates.slice() : [];
  }

  function clearDemoGiState() {
    clearDemoObservations();
    clearDemoCandidates();
  }

  global.GuestIntelligence = {
    VERSION: GI_VERSION,
    PHASE: GI_PHASE,
    OBSERVATION_TYPE: OBSERVATION_TYPE,
    MATCH_STRENGTH: MATCH_STRENGTH,
    OBSERVATION_STATUS: OBSERVATION_STATUS,
    SENSITIVITY: SENSITIVITY,
    APPROVAL_REQUIREMENT: APPROVAL_REQUIREMENT,
    KNOWLEDGE_TYPE: KNOWLEDGE_TYPE,
    CANDIDATE_ELIGIBILITY: CANDIDATE_ELIGIBILITY,
    CANDIDATE_LIFECYCLE: CANDIDATE_LIFECYCLE,
    CONTRADICTION_STATE: CONTRADICTION_STATE,
    OBSERVATION_CANDIDATE_RULES: OBSERVATION_CANDIDATE_RULES,
    extractGuestObservations: extractGuestObservations,
    buildCandidateGuestKnowledge: buildCandidateGuestKnowledge,
    clearDemoObservations: clearDemoObservations,
    clearDemoCandidates: clearDemoCandidates,
    clearDemoGiState: clearDemoGiState,
    getLastDemoObservations: getLastDemoObservations,
    getLastDemoCandidates: getLastDemoCandidates,
    createEmptyObservation: createEmptyObservation,
    createEmptyCandidate: createEmptyCandidate,
    detectProhibited: detectProhibited
  };
})(typeof window !== "undefined" ? window : globalThis);
