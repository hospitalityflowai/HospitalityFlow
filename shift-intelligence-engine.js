/**
 * Hospitality Flow — Shift Intelligence Engine
 * Reusable intelligence layer between Hotel Brain and operational tools.
 * Rule-based v1 — modular surface for future LLM / agent backends.
 */
(function (global) {
  "use strict";

  var ENGINE_VERSION = 1;
  var MAX_RECOMMENDATIONS = 6;
  var MAX_CHECKLIST_ITEMS = 16;

  var PRIORITY_RANK = { urgent: 0, high: 1, normal: 2, low: 3 };

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
    return {
      id: raw.id || createId(),
      text: String(raw.text || ""),
      priority: raw.priority || "normal",
      department: raw.department || fallbackDept || "Reception",
      status: status
    };
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

  function isPaymentIssueLine(line) {
    return noteContains(line, [
      "payment", "outstanding", "balance", "folio", "unpaid", "owing", "deposit",
      "credit card", "card declined", "charge", "invoice", "open balance"
    ]);
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
      hasOpenBalances: (metrics.payments || 0) > 0 || notesMatch([
        "outstanding balance", "open balance", "balance due", "unpaid", "folio"
      ]),
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
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned.length > 80) cleaned = cleaned.slice(0, 77) + "…";
    return cleaned;
  }

  function nextShiftPhrase(shiftType) {
    if (shiftType === "night") return "before the AM shift";
    if (shiftType === "am") return "before the PM shift";
    return "for the incoming shift";
  }

  function generateRecommendations(input, signals) {
    var classified = input.classified || {};
    var analyzed = (classified._analyzed || input.analyzedNotes || []).slice();
    var lines = parseNotes(input.rawNotesText || "");
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

    function addCandidate(rec) {
      if (!rec || !rec.text) return;
      var signature = (rec.priority + "|" + rec.department + "|" + rec.text).toLowerCase();
      if (seen[signature]) return;
      seen[signature] = true;
      candidates.push(normalizeRecommendation(rec, fallbackDept));
    }

    analyzed.forEach(function (note) {
      if (isResolvedNote(note.original)) return;
      var line = note.original;
      var roomIn = roomInPhrase(note);
      var roomOn = roomOnPhrase(note);
      var issue = briefIssuePhrase(note);

      if (maintenanceNeedsFollowUp(note)) {
        var maintPriority = note.maintenancePriority === "Critical" ? "urgent"
          : note.maintenancePriority === "High" ? "high" : "normal";
        var maintNotInformed = noteContains(line, [
          "not yet informed", "not informed", "maintenance not", "awaiting maintenance",
          "needs informing", "not yet notified", "not notified yet"
        ]);
        var maintDetail = issue && issue.length > 8 ? " regarding " + issue : "";
        var maintText = maintNotInformed
          ? "Follow up with Maintenance" + maintDetail + roomOn + " " + nextShiftPhrase(shiftType) + "."
          : "Inform Maintenance" + maintDetail + roomOn + " and confirm resolution " + nextShiftPhrase(shiftType) + ".";
        addCandidate({
          text: maintText,
          priority: maintPriority,
          department: resolveDepartment(["Maintenance", "Engineering"], "Maintenance", departments)
        });
        return;
      }

      if (note.isVip || (note.section === "guest" && detectVip(line))) {
        var vipArrival = noteContains(line, ["arriv", "tomorrow", "tonight", "checking in", "due in"]);
        var vipPrep = noteContains(line, ["welcome", "amenity", "amenities", "prepare", "preparing", "still needs", "card"]);
        var vipText;
        if (vipArrival && vipPrep) {
          vipText = "Prepare welcome card and amenities for the VIP arrival" + roomIn + ".";
        } else if (vipArrival) {
          vipText = "Brief the incoming shift on the VIP arrival" + roomIn + " and confirm preparations.";
        } else {
          vipText = "Review VIP guest requirements" + roomIn + " and brief the next shift.";
        }
        if (brainContext && brainContext.hotelKnowledge && trimText(brainContext.hotelKnowledge.vipRules)) {
          vipText = vipText.replace(/\.$/, "") + ", following hotel VIP standards.";
        }
        addCandidate({
          text: vipText,
          priority: "high",
          department: resolveDepartment(["Duty Manager", "Front Office", "Reception"], "Front Office", departments)
        });
        return;
      }

      if (noteContains(line, ["late checkout", "late check-out", "late check out", "checkout extension", "extended checkout"])) {
        addCandidate({
          text: "Inform Housekeeping about the late checkout" + roomIn + ".",
          priority: "high",
          department: resolveDepartment(["Housekeeping"], "Housekeeping", departments)
        });
        return;
      }

      if (noteContains(line, ["housekeeping"]) &&
          noteContains(line, ["waiting", "wait for", "waiting for", "held", "release", "released", "dirty"])) {
        var roomRef = roomPhrase(note);
        addCandidate({
          text: "Prioritise " + (roomRef || "the room") + " immediately once released.",
          priority: "high",
          department: resolveDepartment(["Housekeeping"], "Housekeeping", departments)
        });
        return;
      }

      if (note.section === "payments" || isPaymentIssueLine(line)) {
        if (noteContains(line, ["outstanding", "payment", "balance", "folio", "unpaid", "owing", "due"])) {
          addCandidate({
            text: "Collect outstanding payment" + roomIn + " before departure.",
            priority: note.section === "urgent" ? "urgent" : "high",
            department: resolveDepartment(["Front Office", "Reception", "Duty Manager"], "Reception", departments)
          });
          return;
        }
      }

      if (noteContains(line, ["complaint", "complain", "unhappy", "dissatisfied", "escalat"]) &&
          noteContains(line, ["guest", "room"]) && note.section !== "general") {
        addCandidate({
          text: "Review the guest complaint" + roomIn + " and escalate to management if unresolved.",
          priority: note.section === "urgent" ? "urgent" : "high",
          department: resolveDepartment(["Duty Manager", "Front Office", "Management"], "Duty Manager", departments)
        });
        return;
      }

      if (noteContains(line, ["wake-up call", "wakeup call", "wake up call"])) {
        addCandidate({
          text: "Confirm the wake-up call" + roomIn + " is scheduled with the Front Office team.",
          priority: "normal",
          department: resolveDepartment(["Front Office", "Reception"], "Reception", departments)
        });
        return;
      }

      if (noteContains(line, ["airport transfer", "transfer", "pick up", "pickup", "taxi", "car service"])) {
        addCandidate({
          text: "Confirm airport transfer arrangements" + roomIn + " with the incoming shift.",
          priority: "normal",
          department: resolveDepartment(["Concierge", "Front Office", "Reception"], "Front Office", departments)
        });
        return;
      }

      if (noteContains(line, ["lost property", "lost item", "left item", "missing item"])) {
        addCandidate({
          text: "Log the lost property item" + roomIn + " and follow hotel lost property procedures.",
          priority: "normal",
          department: resolveDepartment(["Front Office", "Reception", "Duty Manager"], "Front Office", departments)
        });
        return;
      }

      if (noteContains(line, ["physical key", "key card", "keycard", "room key", "master key"]) &&
          noteContains(line, ["lost", "missing", "not working", "faulty", "replacement", "issue"])) {
        addCandidate({
          text: "Follow up on the key issue" + roomIn + " with Front Office or Maintenance.",
          priority: "high",
          department: resolveDepartment(["Front Office", "Maintenance", "Reception"], "Front Office", departments)
        });
        return;
      }

      if ((note.isFollowUp || note.section === "tasks" || note.section === "urgent") &&
          noteContains(line, ["follow up", "follow-up", "outstanding", "pending", "must", "need to", "ensure"])) {
        if (note.section === "general" && !note.isFollowUp) return;
        addCandidate({
          text: "Action the outstanding task" + roomIn + " and hand over clearly to the next shift.",
          priority: note.section === "urgent" ? "urgent" : "normal",
          department: resolveDepartment([input.selectedDepartment], fallbackDept, departments)
        });
      }
    });

    if (global.HotelProfileOperational && brainContext) {
      global.HotelProfileOperational.getRoomAttributeReminders(
        brainContext,
        input.rawNotesText || ""
      ).forEach(addCandidate);
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
      relevant: function (signals) { return signals.hasOpenBalances || signals.hasPayments; }
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

  function analyze(input) {
    input = input || {};
    var signals = buildSignals(input);
    var recommendations = generateRecommendations(input, signals);
    var checklist = generateChecklist(input, signals, recommendations);
    return {
      engineVersion: ENGINE_VERSION,
      signals: signals,
      recommendations: recommendations,
      checklist: checklist
    };
  }

  global.ShiftIntelligenceEngine = {
    VERSION: ENGINE_VERSION,
    analyze: analyze,
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
    CHECKLIST_STATUS: CHECKLIST_STATUS
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
