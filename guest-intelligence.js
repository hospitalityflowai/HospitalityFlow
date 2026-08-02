/**
 * Hospitality Flow — Guest Intelligence (GI-1)
 *
 * Read-only guest observation extraction from existing engine outputs.
 * Consumes OperationalFact / OperationalContext / OperationalMemory / DecisionTrace.
 * Does NOT score, rank, recommend, persist profiles, or promote preferences.
 *
 * GI-1: temporary GuestObservation only — no durable guestId, no DB, no UI.
 */
(function (global) {
  "use strict";

  var GI_VERSION = 1;
  var GI_PHASE = "GI-1";

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

    var result = { observations: observations, rejections: rejections, phase: GI_PHASE };
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

  global.GuestIntelligence = {
    VERSION: GI_VERSION,
    PHASE: GI_PHASE,
    OBSERVATION_TYPE: OBSERVATION_TYPE,
    MATCH_STRENGTH: MATCH_STRENGTH,
    OBSERVATION_STATUS: OBSERVATION_STATUS,
    SENSITIVITY: SENSITIVITY,
    APPROVAL_REQUIREMENT: APPROVAL_REQUIREMENT,
    extractGuestObservations: extractGuestObservations,
    clearDemoObservations: clearDemoObservations,
    getLastDemoObservations: getLastDemoObservations,
    createEmptyObservation: createEmptyObservation,
    detectProhibited: detectProhibited
  };
})(typeof window !== "undefined" ? window : globalThis);
