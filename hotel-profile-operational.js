/**
 * Hospitality Flow — Hotel Brain Operational Knowledge Layer (v4)
 * Editable operational knowledge, shift workflows, and sample-data merge utilities.
 */
(function (global) {
  "use strict";

  var SCHEMA_V4 = 4;
  var OK_SCHEMA = 1;

  var SHIFT_TYPES = [
    { id: "night", label: "Night" },
    { id: "am", label: "AM" },
    { id: "pm", label: "PM" },
    { id: "middle", label: "Middle" }
  ];

  var KNOWLEDGE_CATEGORIES = [
    "Operations", "Communication", "VIP", "Guest Services", "Arrivals", "Departures",
    "Housekeeping", "Maintenance", "Finance", "Payments", "Security", "Inventory",
    "Standards", "Systems"
  ];

  function trimText(v) {
    return String(v || "").trim();
  }

  function createId(prefix) {
    return (prefix || "ok") + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  }

  function emptyOperationalKnowledge() {
    return {
      schemaVersion: OK_SCHEMA,
      staffingContext: "",
      handoverSources: [],
      dailyMetrics: [],
      knowledgeEntries: [],
      shiftWorkflows: {
        night: { shiftType: "night", label: "Night Shift", steps: [] },
        am: { shiftType: "am", label: "AM Shift", steps: [] },
        pm: { shiftType: "pm", label: "PM Shift", steps: [] },
        middle: { shiftType: "middle", label: "Middle Shift", steps: [] }
      },
      sampleDataRegistry: [],
      sampleDataLoaded: {}
    };
  }

  function emptyKnowledgeEntry() {
    return {
      id: createId("ok"),
      sampleDataId: "",
      category: "Operations",
      title: "",
      content: "",
      department: "Reception",
      shifts: ["night", "am", "pm", "middle"],
      priority: "normal",
      required: true,
      optional: false,
      timing: "",
      checklistEnabled: true,
      triggerKeywords: [],
      triggersRequired: true,
      followUpInstruction: "",
      active: true,
      notes: "",
      isSampleData: false
    };
  }

  function emptyWorkflowStep() {
    return {
      id: createId("wf"),
      sampleDataId: "",
      order: 1,
      title: "",
      department: "Reception",
      required: true,
      optional: false,
      timing: "",
      checklistEnabled: true,
      triggerKeywords: [],
      active: true,
      notes: "",
      isSampleData: false
    };
  }

  function emptyHandoverSource() {
    return {
      id: createId("src"),
      sampleDataId: "",
      name: "",
      description: "",
      active: true,
      isSampleData: false
    };
  }

  function normalizeKnowledgeEntry(raw) {
    var base = emptyKnowledgeEntry();
    if (!raw || typeof raw !== "object") return base;
    base.id = raw.id || base.id;
    base.sampleDataId = raw.sampleDataId || "";
    base.category = raw.category || base.category;
    base.title = raw.title || "";
    base.content = raw.content || "";
    base.department = raw.department || base.department;
    base.shifts = Array.isArray(raw.shifts) ? raw.shifts.slice() : base.shifts;
    base.priority = raw.priority || base.priority;
    base.required = raw.required !== false;
    base.optional = !!raw.optional;
    base.timing = raw.timing || "";
    base.checklistEnabled = raw.checklistEnabled !== false;
    base.triggerKeywords = Array.isArray(raw.triggerKeywords) ? raw.triggerKeywords.slice() : [];
    base.triggersRequired = !!raw.triggersRequired;
    base.followUpInstruction = raw.followUpInstruction || "";
    base.active = raw.active !== false;
    base.notes = raw.notes || "";
    base.isSampleData = !!raw.isSampleData;
    return base;
  }

  function normalizeWorkflowStep(raw) {
    var base = emptyWorkflowStep();
    if (!raw || typeof raw !== "object") return base;
    base.id = raw.id || base.id;
    base.sampleDataId = raw.sampleDataId || "";
    base.order = parseInt(raw.order, 10) || 1;
    base.title = raw.title || "";
    base.department = raw.department || base.department;
    base.required = raw.required !== false;
    base.optional = !!raw.optional;
    base.timing = raw.timing || "";
    base.checklistEnabled = raw.checklistEnabled !== false;
    base.triggerKeywords = Array.isArray(raw.triggerKeywords) ? raw.triggerKeywords.slice() : [];
    base.active = raw.active !== false;
    base.notes = raw.notes || "";
    base.isSampleData = !!raw.isSampleData;
    return base;
  }

  function migrateToV4(data) {
    if (!data || typeof data !== "object") return data;
    if (!data.operationalKnowledge || typeof data.operationalKnowledge !== "object") {
      data.operationalKnowledge = emptyOperationalKnowledge();
    }
    var ok = data.operationalKnowledge;
    if (ok.schemaVersion == null) ok.schemaVersion = OK_SCHEMA;
    if (ok.staffingContext == null) ok.staffingContext = "";
    if (!Array.isArray(ok.handoverSources)) ok.handoverSources = [];
    if (!Array.isArray(ok.dailyMetrics)) ok.dailyMetrics = [];
    if (!Array.isArray(ok.knowledgeEntries)) ok.knowledgeEntries = [];
    if (!ok.shiftWorkflows) ok.shiftWorkflows = emptyOperationalKnowledge().shiftWorkflows;
    SHIFT_TYPES.forEach(function (shift) {
      if (!ok.shiftWorkflows[shift.id]) {
        ok.shiftWorkflows[shift.id] = { shiftType: shift.id, label: shift.label + " Shift", steps: [] };
      }
      if (!Array.isArray(ok.shiftWorkflows[shift.id].steps)) ok.shiftWorkflows[shift.id].steps = [];
    });
    if (!Array.isArray(ok.sampleDataRegistry)) ok.sampleDataRegistry = [];
    if (!ok.sampleDataLoaded || typeof ok.sampleDataLoaded !== "object") ok.sampleDataLoaded = {};

    ok.handoverSources = ok.handoverSources.map(function (item) {
      return Object.assign(emptyHandoverSource(), item || {});
    });
    ok.knowledgeEntries = ok.knowledgeEntries.map(normalizeKnowledgeEntry);
    SHIFT_TYPES.forEach(function (shift) {
      ok.shiftWorkflows[shift.id].steps = ok.shiftWorkflows[shift.id].steps.map(normalizeWorkflowStep);
    });

    data.schemaVersion = SCHEMA_V4;
    return data;
  }

  function mergeText(existing, incoming) {
    return trimText(existing) ? existing : (incoming || "");
  }

  function hasSampleId(registry, sampleDataId) {
    if (!sampleDataId) return false;
    return registry.indexOf(sampleDataId) !== -1;
  }

  function registerSampleId(registry, sampleDataId) {
    if (!sampleDataId || registry.indexOf(sampleDataId) !== -1) return registry;
    return registry.concat([sampleDataId]);
  }

  function mergeArrayBySampleId(existing, incoming, mapFn) {
    var out = (existing || []).slice();
    var registry = out.map(function (item) { return item.sampleDataId; }).filter(Boolean);
    (incoming || []).forEach(function (item) {
      if (!item || !item.sampleDataId) return;
      if (hasSampleId(registry, item.sampleDataId)) return;
      out.push(mapFn ? mapFn(item) : item);
      registry.push(item.sampleDataId);
    });
    return out;
  }

  function mergeDepartments(existing, incoming) {
    var out = (existing || []).slice();
    var names = {};
    out.forEach(function (d) { names[(d.name || "").toLowerCase()] = true; });
    (incoming || []).forEach(function (dept) {
      var key = (dept.name || "").toLowerCase();
      if (!key || names[key]) return;
      out.push(dept);
      names[key] = true;
    });
    return out;
  }

  function mergeShiftRows(existingShifts, incomingShifts) {
    var base = existingShifts && typeof existingShifts === "object"
      ? JSON.parse(JSON.stringify(existingShifts))
      : { pattern: "8hour", overnightSupport: false, rows: [] };
    if (!Array.isArray(base.rows)) base.rows = [];
    var codes = {};
    base.rows.forEach(function (row) { codes[(row.code || "").toLowerCase()] = true; });
    ((incomingShifts && incomingShifts.rows) || []).forEach(function (row) {
      var key = (row.code || "").toLowerCase();
      if (!key || codes[key]) return;
      base.rows.push(row);
      codes[key] = true;
    });
    if (incomingShifts && incomingShifts.overnightSupport && !base.overnightSupport) {
      base.overnightSupport = true;
    }
    return base;
  }

  var SAMPLE_ROOM_BOOL_FIELDS = [
    "twinCapable", "extraBedCapable", "sofaBed", "streetFacing", "bathtub", "darkRoom",
    "quietFacing", "awayFromLift"
  ];

  function normalizeRoomNoKey(roomNo) {
    return String(roomNo || "").trim().toLowerCase();
  }

  function patchSampleRoomRecord(existing, incoming) {
    var out = Object.assign({}, existing || {});
    if (!incoming || !incoming.sampleDataId) return out;

    var sameSample = out.sampleDataId && out.sampleDataId === incoming.sampleDataId;
    var sampleRefresh = !!incoming.isSampleData && (!!out.isSampleData || sameSample || !out.sampleDataId);

    if (sampleRefresh) {
      if (incoming.bedType) out.bedType = incoming.bedType;
      SAMPLE_ROOM_BOOL_FIELDS.forEach(function (field) {
        out[field] = !!incoming[field];
      });
      out.sampleDataId = out.sampleDataId || incoming.sampleDataId;
      out.isSampleData = true;
    } else {
      out.bedType = mergeText(out.bedType, incoming.bedType);
      SAMPLE_ROOM_BOOL_FIELDS.forEach(function (field) {
        if (incoming[field] && !out[field]) out[field] = true;
      });
    }

    if (incoming.accessible) out.accessible = true;
    if (trimText(incoming.connectingRoom) && !trimText(out.connectingRoom)) {
      out.connectingRoom = incoming.connectingRoom;
    } else if (sameSample && trimText(incoming.connectingRoom)) {
      out.connectingRoom = incoming.connectingRoom;
    }

    out.floor = mergeText(out.floor, incoming.floor);
    if (incoming.lowerGround) out.lowerGround = true;
    if (incoming.awayFromLift) out.awayFromLift = true;
    if (incoming.quietFacing) out.quietFacing = true;
    out.maxOccupancy = mergeText(out.maxOccupancy, incoming.maxOccupancy) || out.maxOccupancy || "2";
    out.notes = mergeText(out.notes, incoming.notes);
    out.roomType = mergeText(out.roomType, incoming.roomType);
    if (out.shower !== true) out.shower = false;
    return out;
  }

  function mergeRoomsByRoomNo(existing, incoming) {
    var out = (existing || []).slice();
    var indexByRoom = {};
    out.forEach(function (room, index) {
      indexByRoom[normalizeRoomNoKey(room.roomNo)] = index;
    });

    (incoming || []).forEach(function (room) {
      var key = normalizeRoomNoKey(room.roomNo);
      if (!key) return;
      var index = indexByRoom[key];
      if (index == null) {
        out.push(room);
        indexByRoom[key] = out.length - 1;
        return;
      }
      out[index] = patchSampleRoomRecord(out[index], room);
    });
    return out;
  }

  function mergeRoomTypes(existing, incoming) {
    var out = (existing || []).slice();
    var indexByCode = {};
    out.forEach(function (row, index) {
      if (row.code) indexByCode[row.code.toLowerCase()] = index;
    });

    (incoming || []).forEach(function (row) {
      var key = (row.code || "").toLowerCase();
      if (!key) return;
      var index = indexByCode[key];
      if (index == null) {
        out.push(row);
        indexByCode[key] = out.length - 1;
        return;
      }

      var cur = out[index];
      if (!row.sampleDataId) return;

      var sameSample = cur.sampleDataId && cur.sampleDataId === row.sampleDataId;
      if (sameSample || cur.isSampleData || row.isSampleData || !trimText(cur.count)) {
        if (row.count != null && row.count !== "") cur.count = row.count;
        cur.type = mergeText(cur.type, row.type) || row.type || cur.type;
        cur.floors = mergeText(cur.floors, row.floors) || cur.floors;
        cur.maxGuests = mergeText(cur.maxGuests, row.maxGuests) || cur.maxGuests;
        cur.sampleDataId = cur.sampleDataId || row.sampleDataId;
        if (row.isSampleData) cur.isSampleData = true;
      }
    });
    return out;
  }

  function mergeTerminology(existing, incoming) {
    var out = (existing || []).slice();
    var terms = {};
    out.forEach(function (t) { terms[(t.term || "").toLowerCase()] = true; });
    (incoming || []).forEach(function (term) {
      var key = (term.term || "").toLowerCase();
      if (!key || terms[key]) return;
      out.push(term);
      terms[key] = true;
    });
    return out;
  }

  function mergeObjectFields(existing, incoming, fields, textOnly) {
    var out = Object.assign({}, existing || {});
    fields.forEach(function (field) {
      if (textOnly) out[field] = mergeText(out[field], incoming && incoming[field]);
      else if (incoming && incoming[field] != null && (out[field] == null || out[field] === "")) out[field] = incoming[field];
    });
    return out;
  }

  function mergePoliciesStructured(existing, incoming) {
    var out = JSON.parse(JSON.stringify(existing || { guest: {}, payment: {}, operational: {}, custom: {} }));
    if (!incoming || !incoming.operational) return out;
    if (!out.operational) out.operational = {};
    Object.keys(incoming.operational).forEach(function (key) {
      var inc = incoming.operational[key];
      var cur = out.operational[key];
      if (!cur || !trimText(cur.instructions)) {
        out.operational[key] = inc;
      } else if (cur && inc && !trimText(cur.summary) && trimText(inc.summary)) {
        cur.summary = inc.summary;
      }
    });
    return out;
  }

  function mergeOtaChannels(existing, incoming) {
    var out = (existing || []).slice();
    (incoming || []).forEach(function (channel) {
      if (!channel || !channel.type) return;
      var found = out.filter(function (c) { return c.type === channel.type; })[0];
      if (!found) {
        out.push(channel);
        return;
      }
      if (!trimText(found.specialInstructions) && trimText(channel.specialInstructions)) {
        found.specialInstructions = channel.specialInstructions;
      }
      found.sampleDataId = found.sampleDataId || channel.sampleDataId;
      found.isSampleData = found.isSampleData || channel.isSampleData;
    });
    return out;
  }

  function mergeTrackers(existing, incoming) {
    var out = (existing || []).slice();
    (incoming || []).forEach(function (inc) {
      if (!inc || !inc.key) return;
      var found = out.filter(function (t) { return t.key === inc.key; })[0];
      if (!found) {
        out.push(inc);
        return;
      }
      if (inc.enabled && !found.enabled) found.enabled = true;
      if (!trimText(found.notes) && trimText(inc.notes)) found.notes = inc.notes;
    });
    return out;
  }

  function mergeOperationalKnowledge(existing, incoming, registry) {
    var out = JSON.parse(JSON.stringify(existing || emptyOperationalKnowledge()));
    if (!incoming) return out;
    registry = registry || out.sampleDataRegistry || [];

    out.staffingContext = mergeText(out.staffingContext, incoming.staffingContext);
    out.handoverSources = mergeArrayBySampleId(out.handoverSources, incoming.handoverSources);
    out.dailyMetrics = mergeArrayBySampleId(out.dailyMetrics, incoming.dailyMetrics);
    out.knowledgeEntries = mergeArrayBySampleId(out.knowledgeEntries, incoming.knowledgeEntries, normalizeKnowledgeEntry);

    SHIFT_TYPES.forEach(function (shift) {
      var wf = incoming.shiftWorkflows && incoming.shiftWorkflows[shift.id];
      if (!wf || !wf.steps || !wf.steps.length) return;
      if (!out.shiftWorkflows[shift.id]) out.shiftWorkflows[shift.id] = { shiftType: shift.id, label: shift.label + " Shift", steps: [] };
      out.shiftWorkflows[shift.id].steps = mergeArrayBySampleId(
        out.shiftWorkflows[shift.id].steps,
        wf.steps,
        normalizeWorkflowStep
      ).sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    });

    (incoming.knowledgeEntries || []).concat(
      SHIFT_TYPES.reduce(function (acc, shift) {
        var steps = incoming.shiftWorkflows && incoming.shiftWorkflows[shift.id]
          ? incoming.shiftWorkflows[shift.id].steps : [];
        return acc.concat(steps || []);
      }, [])
    ).concat(incoming.handoverSources || []).concat(incoming.dailyMetrics || []).forEach(function (item) {
      if (item && item.sampleDataId) registry = registerSampleId(registry, item.sampleDataId);
    });

    out.sampleDataRegistry = registry;
    return out;
  }

  function mergeGuestLoanItems(existing, incoming) {
    var out = (existing || []).slice();
    var names = {};
    out.forEach(function (item) { names[(item.item || "").toLowerCase()] = true; });
    (incoming || []).forEach(function (item) {
      var key = (item.item || "").toLowerCase();
      if (!key || names[key]) return;
      out.push(item);
      names[key] = true;
    });
    return out;
  }

  function mergeSampleIntoProfile(currentProfile, samplePatch) {
    if (!currentProfile || !samplePatch) return currentProfile;
    var out = JSON.parse(JSON.stringify(currentProfile));
    migrateToV4(out);

    out.general = mergeObjectFields(out.general, samplePatch.general, [
      "hotelName", "hotelType", "totalRooms", "brandVoice", "operatingNotes"
    ], true);

    out.aiPrefs = mergeObjectFields(out.aiPrefs, samplePatch.aiPrefs, [
      "tone", "detail", "language", "dateFormat", "instructions"
    ], true);

    out.hotelKnowledge = mergeObjectFields(out.hotelKnowledge, samplePatch.hotelKnowledge, [
      "generalNotes", "hotelStandards", "vipRules", "commonTerms",
      "operationalNotes", "localRecommendations", "aiInstructions"
    ], true);

    out.guestServices = mergeObjectFields(out.guestServices, samplePatch.guestServices, [
      "airportTransfers", "wakeUpCalls", "guestItemLoans", "specialOccasions",
      "welcomeAmenities", "customInstructions"
    ], true);
    if (samplePatch.guestServices && samplePatch.guestServices.loanItems) {
      if (!out.guestServices) out.guestServices = {};
      out.guestServices.loanItems = mergeGuestLoanItems(
        out.guestServices.loanItems,
        samplePatch.guestServices.loanItems
      );
    }

    out.departments = mergeDepartments(out.departments, samplePatch.departments);
    out.shifts = mergeShiftRows(out.shifts, samplePatch.shifts);
    out.rooms = mergeRoomTypes(out.rooms, samplePatch.rooms);
    out.roomFacilities = mergeRoomsByRoomNo(out.roomFacilities, samplePatch.roomFacilities);
    out.terminology = mergeTerminology(out.terminology, samplePatch.terminology);
    out.supplies = mergeArrayBySampleId(out.supplies, samplePatch.supplies);
    out.otaChannels = mergeOtaChannels(out.otaChannels, samplePatch.otaChannels);
    out.policiesStructured = mergePoliciesStructured(out.policiesStructured, samplePatch.policiesStructured);
    out.operationsTrackers = mergeTrackers(out.operationsTrackers, samplePatch.operationsTrackers);

    out.operationalKnowledge = mergeOperationalKnowledge(
      out.operationalKnowledge,
      samplePatch.operationalKnowledge,
      (out.operationalKnowledge && out.operationalKnowledge.sampleDataRegistry) || []
    );

    if (samplePatch.sampleId) {
      out.operationalKnowledge.sampleDataLoaded[samplePatch.sampleId] = {
        loadedAt: new Date().toISOString(),
        label: samplePatch.sampleLabel || samplePatch.sampleId,
        version: 1
      };
    }

    return out;
  }

  function collectOperationalKnowledge() {
    var ok = emptyOperationalKnowledge();
    ok.staffingContext = (document.getElementById("okStaffingContext") || {}).value || "";

    document.querySelectorAll("#okSourcesList [data-ok-source]").forEach(function (card) {
      ok.handoverSources.push({
        id: card.getAttribute("data-ok-source"),
        sampleDataId: (card.querySelector("[data-f='sampleDataId']") || {}).value || "",
        name: (card.querySelector("[data-f='name']") || {}).value || "",
        description: (card.querySelector("[data-f='description']") || {}).value || "",
        active: !!(card.querySelector("[data-f='active']") || {}).checked,
        isSampleData: card.getAttribute("data-sample") === "1"
      });
    });

    document.querySelectorAll("#okKnowledgeList [data-ok-entry]").forEach(function (card) {
      var shifts = [];
      card.querySelectorAll("[data-f='shift']:checked").forEach(function (cb) { shifts.push(cb.value); });
      var triggers = trimText((card.querySelector("[data-f='triggerKeywords']") || {}).value || "")
        .split(/[,;\n]+/).map(function (s) { return s.trim(); }).filter(Boolean);
      ok.knowledgeEntries.push(normalizeKnowledgeEntry({
        id: card.getAttribute("data-ok-entry"),
        sampleDataId: (card.querySelector("[data-f='sampleDataId']") || {}).value || "",
        category: (card.querySelector("[data-f='category']") || {}).value || "Operations",
        title: (card.querySelector("[data-f='title']") || {}).value || "",
        content: (card.querySelector("[data-f='content']") || {}).value || "",
        department: (card.querySelector("[data-f='department']") || {}).value || "Reception",
        shifts: shifts,
        priority: (card.querySelector("[data-f='priority']") || {}).value || "normal",
        required: !!(card.querySelector("[data-f='required']") || {}).checked,
        optional: !!(card.querySelector("[data-f='optional']") || {}).checked,
        timing: (card.querySelector("[data-f='timing']") || {}).value || "",
        checklistEnabled: !!(card.querySelector("[data-f='checklistEnabled']") || {}).checked,
        triggerKeywords: triggers,
        triggersRequired: !!(card.querySelector("[data-f='triggersRequired']") || {}).checked,
        followUpInstruction: (card.querySelector("[data-f='followUpInstruction']") || {}).value || "",
        active: !!(card.querySelector("[data-f='active']") || {}).checked,
        notes: (card.querySelector("[data-f='notes']") || {}).value || "",
        isSampleData: card.getAttribute("data-sample") === "1"
      }));
    });

    document.querySelectorAll("#okMetricsList [data-ok-metric]").forEach(function (row) {
      ok.dailyMetrics.push({
        id: row.getAttribute("data-ok-metric"),
        sampleDataId: row.getAttribute("data-sample-id") || "",
        key: row.getAttribute("data-metric-key") || "",
        label: (row.querySelector("[data-f='label']") || {}).textContent || "",
        enabled: !!(row.querySelector("[data-f='enabled']") || {}).checked,
        isSampleData: row.getAttribute("data-sample") === "1"
      });
    });

    SHIFT_TYPES.forEach(function (shift) {
      var list = document.getElementById("okWorkflow-" + shift.id);
      if (!list) return;
      list.querySelectorAll("[data-ok-step]").forEach(function (card, index) {
        var triggers = trimText((card.querySelector("[data-f='triggerKeywords']") || {}).value || "")
          .split(/[,;\n]+/).map(function (s) { return s.trim(); }).filter(Boolean);
        ok.shiftWorkflows[shift.id].steps.push(normalizeWorkflowStep({
          id: card.getAttribute("data-ok-step"),
          sampleDataId: (card.querySelector("[data-f='sampleDataId']") || {}).value || "",
          order: parseInt((card.querySelector("[data-f='order']") || {}).value, 10) || (index + 1),
          title: (card.querySelector("[data-f='title']") || {}).value || "",
          department: (card.querySelector("[data-f='department']") || {}).value || "Reception",
          required: !!(card.querySelector("[data-f='required']") || {}).checked,
          optional: !!(card.querySelector("[data-f='optional']") || {}).checked,
          timing: (card.querySelector("[data-f='timing']") || {}).value || "",
          checklistEnabled: !!(card.querySelector("[data-f='checklistEnabled']") || {}).checked,
          triggerKeywords: triggers,
          active: !!(card.querySelector("[data-f='active']") || {}).checked,
          notes: (card.querySelector("[data-f='notes']") || {}).value || "",
          isSampleData: card.getAttribute("data-sample") === "1"
        }));
      });
      ok.shiftWorkflows[shift.id].steps.sort(function (a, b) { return a.order - b.order; });
    });

    ok.sampleDataRegistry = ok.knowledgeEntries.concat(
      ok.handoverSources,
      ok.dailyMetrics
    ).map(function (item) { return item.sampleDataId; }).filter(Boolean);

    SHIFT_TYPES.forEach(function (shift) {
      ok.shiftWorkflows[shift.id].steps.forEach(function (step) {
        if (step.sampleDataId) ok.sampleDataRegistry.push(step.sampleDataId);
      });
    });

    ok.sampleDataLoaded = (window.__hfOkSampleLoadedCache || ok.sampleDataLoaded || {});
    return ok;
  }

  function escAttr(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  function buildKnowledgeEntryCard(entry) {
    entry = normalizeKnowledgeEntry(entry);
    var card = document.createElement("article");
    card.className = "ok-entry-card" + (entry.isSampleData ? " is-sample" : "");
    card.setAttribute("data-ok-entry", entry.id);
    card.setAttribute("data-sample", entry.isSampleData ? "1" : "0");
    card.setAttribute("data-category", entry.category);
    card.setAttribute("data-shifts", entry.shifts.join(","));

    var shiftChecks = SHIFT_TYPES.map(function (shift) {
      var checked = entry.shifts.indexOf(shift.id) !== -1 ? " checked" : "";
      return '<label class="ok-shift-check"><input type="checkbox" data-f="shift" value="' + shift.id + '"' + checked + "> " + shift.label + "</label>";
    }).join("");

    var categoryOptions = KNOWLEDGE_CATEGORIES.map(function (cat) {
      return '<option value="' + cat + '"' + (entry.category === cat ? " selected" : "") + ">" + cat + "</option>";
    }).join("");

    card.innerHTML =
      '<div class="ok-entry-header">' +
        '<input type="hidden" data-f="sampleDataId" value="' + escAttr(entry.sampleDataId) + '">' +
        '<div class="ok-entry-title-row">' +
          '<input class="form-input" data-f="title" placeholder="Knowledge title" value="' + escAttr(entry.title) + '">' +
          '<select class="form-input" data-f="category">' + categoryOptions + '</select>' +
        '</div>' +
        '<div class="ok-entry-badges">' +
          (entry.isSampleData ? '<span class="ok-sample-badge">Sample data</span>' : '') +
          '<label class="ok-toggle"><input type="checkbox" data-f="active"' + (entry.active ? ' checked' : '') + '> Active</label>' +
          '<label class="ok-toggle"><input type="checkbox" data-f="checklistEnabled"' + (entry.checklistEnabled ? ' checked' : '') + '> Checklist</label>' +
        '</div>' +
      '</div>' +
      '<textarea class="notes-textarea" data-f="content" placeholder="Operational knowledge content">' + escAttr(entry.content) + '</textarea>' +
      '<div class="ok-entry-grid">' +
        '<input class="form-input" data-f="department" placeholder="Department" value="' + escAttr(entry.department) + '">' +
        '<select class="form-input" data-f="priority"><option value="urgent"' + (entry.priority === 'urgent' ? ' selected' : '') + '>Urgent</option><option value="high"' + (entry.priority === 'high' ? ' selected' : '') + '>High</option><option value="normal"' + (entry.priority === 'normal' ? ' selected' : '') + '>Normal</option><option value="low"' + (entry.priority === 'low' ? ' selected' : '') + '>Low</option></select>' +
        '<input class="form-input" data-f="timing" placeholder="Timing" value="' + escAttr(entry.timing) + '">' +
        '<input class="form-input" data-f="triggerKeywords" placeholder="Trigger keywords (comma separated)" value="' + escAttr(entry.triggerKeywords.join(', ')) + '">' +
      '</div>' +
      '<div class="ok-shift-row">' + shiftChecks + '</div>' +
      '<div class="ok-entry-flags">' +
        '<label class="ok-toggle"><input type="checkbox" data-f="required"' + (entry.required ? ' checked' : '') + '> Required</label>' +
        '<label class="ok-toggle"><input type="checkbox" data-f="optional"' + (entry.optional ? ' checked' : '') + '> Optional</label>' +
        '<label class="ok-toggle"><input type="checkbox" data-f="triggersRequired"' + (entry.triggersRequired ? ' checked' : '') + '> Triggers required</label>' +
      '</div>' +
      '<textarea class="notes-textarea" data-f="followUpInstruction" placeholder="Recommended action (used by Shift Intelligence when this knowledge is retrieved)">' + escAttr(entry.followUpInstruction) + '</textarea>' +
      '<textarea class="notes-textarea ok-notes" data-f="notes" placeholder="Internal notes (not used as the recommended action)">' + escAttr(entry.notes) + '</textarea>' +
      '<button type="button" class="btn-text ok-remove-entry">Remove entry</button>';

    return card;
  }

  function buildWorkflowStepCard(step) {
    step = normalizeWorkflowStep(step);
    var card = document.createElement("article");
    card.className = "ok-step-card" + (step.isSampleData ? " is-sample" : "");
    card.setAttribute("data-ok-step", step.id);
    card.setAttribute("data-sample", step.isSampleData ? "1" : "0");
    card.innerHTML =
      '<input type="hidden" data-f="sampleDataId" value="' + escAttr(step.sampleDataId) + '">' +
      '<div class="ok-step-row">' +
        '<input class="form-input ok-order" data-f="order" type="number" min="1" value="' + escAttr(step.order) + '">' +
        '<input class="form-input" data-f="title" placeholder="Workflow step" value="' + escAttr(step.title) + '">' +
      '</div>' +
      '<div class="ok-entry-grid">' +
        '<input class="form-input" data-f="department" placeholder="Department" value="' + escAttr(step.department) + '">' +
        '<input class="form-input" data-f="timing" placeholder="Timing" value="' + escAttr(step.timing) + '">' +
        '<input class="form-input" data-f="triggerKeywords" placeholder="Trigger keywords" value="' + escAttr(step.triggerKeywords.join(', ')) + '">' +
      '</div>' +
      '<div class="ok-entry-flags">' +
        '<label class="ok-toggle"><input type="checkbox" data-f="required"' + (step.required ? ' checked' : '') + '> Required</label>' +
        '<label class="ok-toggle"><input type="checkbox" data-f="optional"' + (step.optional ? ' checked' : '') + '> Optional</label>' +
        '<label class="ok-toggle"><input type="checkbox" data-f="checklistEnabled"' + (step.checklistEnabled ? ' checked' : '') + '> Checklist</label>' +
        '<label class="ok-toggle"><input type="checkbox" data-f="active"' + (step.active ? ' checked' : '') + '> Active</label>' +
      '</div>' +
      '<textarea class="notes-textarea ok-notes" data-f="notes" placeholder="Notes">' + escAttr(step.notes) + '</textarea>' +
      '<button type="button" class="btn-text ok-remove-step">Remove step</button>';
    return card;
  }

  function applyKnowledgeFilters() {
    var query = trimText((document.getElementById("okSearchInput") || {}).value).toLowerCase();
    var shiftFilter = (document.getElementById("okShiftFilter") || {}).value || "";
    var deptFilter = trimText((document.getElementById("okDeptFilter") || {}).value).toLowerCase();
    document.querySelectorAll("#okKnowledgeList [data-ok-entry]").forEach(function (card) {
      var text = card.textContent.toLowerCase();
      var shifts = [];
      card.querySelectorAll("[data-f='shift']:checked").forEach(function (cb) { shifts.push(cb.value); });
      if (!shifts.length) shifts = (card.getAttribute("data-shifts") || "").split(",").filter(Boolean);
      var dept = ((card.querySelector("[data-f='department']") || {}).value || "").toLowerCase();
      var show = true;
      if (query && text.indexOf(query) === -1) show = false;
      if (shiftFilter && shifts.indexOf(shiftFilter) === -1) show = false;
      if (deptFilter && dept.indexOf(deptFilter) === -1) show = false;
      card.style.display = show ? "" : "none";
    });
  }

  function renderOperationalKnowledgeUI(data) {
    data = data || {};
    migrateToV4({ operationalKnowledge: data.operationalKnowledge, schemaVersion: 4 });
    var ok = data.operationalKnowledge || emptyOperationalKnowledge();
    window.__hfOkSampleLoadedCache = ok.sampleDataLoaded || {};

    var staffing = document.getElementById("okStaffingContext");
    if (staffing) staffing.value = ok.staffingContext || "";

    var sourcesList = document.getElementById("okSourcesList");
    if (sourcesList) {
      sourcesList.innerHTML = "";
      (ok.handoverSources || []).forEach(function (source) {
        var card = document.createElement("article");
        card.className = "ok-source-card" + (source.isSampleData ? " is-sample" : "");
        card.setAttribute("data-ok-source", source.id || createId("src"));
        card.setAttribute("data-sample", source.isSampleData ? "1" : "0");
        card.innerHTML =
          '<input type="hidden" data-f="sampleDataId" value="' + escAttr(source.sampleDataId || "") + '">' +
          '<input class="form-input" data-f="name" placeholder="Source name" value="' + escAttr(source.name) + '">' +
          '<textarea class="notes-textarea ok-notes" data-f="description" placeholder="Description">' + escAttr(source.description) + '</textarea>' +
          '<label class="ok-toggle"><input type="checkbox" data-f="active"' + (source.active !== false ? ' checked' : '') + '> Active</label>' +
          '<button type="button" class="btn-text ok-remove-source">Remove source</button>';
        sourcesList.appendChild(card);
      });
    }

    var knowledgeList = document.getElementById("okKnowledgeList");
    if (knowledgeList) {
      knowledgeList.innerHTML = "";
      (ok.knowledgeEntries || []).forEach(function (entry) {
        knowledgeList.appendChild(buildKnowledgeEntryCard(entry));
      });
    }

    var metricsList = document.getElementById("okMetricsList");
    if (metricsList) {
      metricsList.innerHTML = "";
      (ok.dailyMetrics || []).forEach(function (metric) {
        var row = document.createElement("label");
        row.className = "ok-metric-row";
        row.setAttribute("data-ok-metric", metric.id || createId("metric"));
        row.setAttribute("data-metric-key", metric.key || "");
        row.setAttribute("data-sample", metric.isSampleData ? "1" : "0");
        row.setAttribute("data-sample-id", metric.sampleDataId || "");
        row.innerHTML =
          '<input type="checkbox" data-f="enabled"' + (metric.enabled !== false ? ' checked' : '') + '>' +
          '<span data-f="label">' + escAttr(metric.label || metric.key) + '</span>';
        metricsList.appendChild(row);
      });
    }

    SHIFT_TYPES.forEach(function (shift) {
      var list = document.getElementById("okWorkflow-" + shift.id);
      if (!list) return;
      list.innerHTML = "";
      var steps = (ok.shiftWorkflows && ok.shiftWorkflows[shift.id] && ok.shiftWorkflows[shift.id].steps) || [];
      steps.forEach(function (step) { list.appendChild(buildWorkflowStepCard(step)); });
    });

    applyKnowledgeFilters();
  }

  function bindOperationalKnowledgeEvents() {
    if (window.__hfOkBound) return;
    window.__hfOkBound = true;

    document.addEventListener("click", function (e) {
      if (e.target.closest("#okAddKnowledge")) {
        var list = document.getElementById("okKnowledgeList");
        if (list) list.appendChild(buildKnowledgeEntryCard(emptyKnowledgeEntry()));
        document.dispatchEvent(new CustomEvent("profile-change", { bubbles: true }));
      }
      if (e.target.closest("#okAddSource")) {
        var sources = document.getElementById("okSourcesList");
        if (sources) {
          var card = document.createElement("article");
          card.className = "ok-source-card";
          card.setAttribute("data-ok-source", createId("src"));
          card.innerHTML =
            '<input type="hidden" data-f="sampleDataId" value="">' +
            '<input class="form-input" data-f="name" placeholder="Source name">' +
            '<textarea class="notes-textarea ok-notes" data-f="description" placeholder="Description"></textarea>' +
            '<label class="ok-toggle"><input type="checkbox" data-f="active" checked> Active</label>' +
            '<button type="button" class="btn-text ok-remove-source">Remove source</button>';
          sources.appendChild(card);
        }
        document.dispatchEvent(new CustomEvent("profile-change", { bubbles: true }));
      }
      if (e.target.closest(".ok-remove-entry")) {
        if (!window.confirm("Remove this knowledge entry?")) return;
        e.target.closest("[data-ok-entry]").remove();
        document.dispatchEvent(new CustomEvent("profile-change", { bubbles: true }));
      }
      if (e.target.closest(".ok-remove-step")) {
        if (!window.confirm("Remove this workflow step?")) return;
        e.target.closest("[data-ok-step]").remove();
        document.dispatchEvent(new CustomEvent("profile-change", { bubbles: true }));
      }
      if (e.target.closest(".ok-remove-source")) {
        if (!window.confirm("Remove this handover source?")) return;
        e.target.closest("[data-ok-source]").remove();
        document.dispatchEvent(new CustomEvent("profile-change", { bubbles: true }));
      }
      SHIFT_TYPES.forEach(function (shift) {
        if (e.target.closest("#okAddStep-" + shift.id)) {
          var list = document.getElementById("okWorkflow-" + shift.id);
          if (list) {
            var step = emptyWorkflowStep();
            step.order = list.querySelectorAll("[data-ok-step]").length + 1;
            list.appendChild(buildWorkflowStepCard(step));
          }
          document.dispatchEvent(new CustomEvent("profile-change", { bubbles: true }));
        }
      });
      if (e.target.closest(".ok-workflow-tab")) {
        var tab = e.target.closest(".ok-workflow-tab");
        var shiftId = tab.getAttribute("data-shift-tab");
        document.querySelectorAll(".ok-workflow-tab").forEach(function (el) {
          el.classList.toggle("is-active", el === tab);
        });
        document.querySelectorAll(".ok-workflow-panel").forEach(function (panel) {
          panel.hidden = panel.getAttribute("data-shift-panel") !== shiftId;
        });
      }
    });

    ["okSearchInput", "okShiftFilter", "okDeptFilter"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("input", applyKnowledgeFilters);
      if (el && el.tagName === "SELECT") el.addEventListener("change", applyKnowledgeFilters);
    });
  }

  function loadZetterSample(currentProfile) {
    if (!global.HotelProfileZetterSample) return { ok: false, error: "Sample dataset unavailable." };
    var patch = global.HotelProfileZetterSample.buildSampleProfilePatch();
    var merged = mergeSampleIntoProfile(currentProfile || {}, patch);
    return { ok: true, profile: merged, label: patch.sampleLabel };
  }

  function keywordTriggered(notesLower, keywords) {
    if (!keywords || !keywords.length) return false;
    return keywords.some(function (kw) {
      var needle = String(kw || "").toLowerCase().trim();
      return needle && notesLower.indexOf(needle) !== -1;
    });
  }

  function buildKnowledgeActionText(entry) {
    var title = trimText(entry && entry.title) || "Operational knowledge";
    var follow = trimText(entry && entry.followUpInstruction);
    if (follow) return title + " — " + follow;
    var content = trimText(entry && entry.content);
    if (content) return title + " — " + content;
    return title;
  }

  function getShiftIntelligenceKnowledge(brainContext, shiftType, rawNotesText) {
    var ok = brainContext && brainContext.operationalKnowledge;
    if (!ok) return { checklistItems: [], workflowSteps: [], entries: [], matchedActions: [] };
    var notesLower = String(rawNotesText || "").toLowerCase();
    var checklistItems = [];
    var matchedActions = [];
    var seen = {};

    /* Decision knowledge: only retrieve when trigger keywords match the shift notes.
       Do not inject knowledge entries by shift alone — that creates operational noise. */
    function knowledgeTriggersMatch(entry) {
      if (!entry.triggerKeywords || !entry.triggerKeywords.length) return false;
      return keywordTriggered(notesLower, entry.triggerKeywords);
    }

    function shiftMatch(entry) {
      if (!entry.shifts || !entry.shifts.length) return true;
      return entry.shifts.indexOf(shiftType) !== -1;
    }

    function addChecklist(item) {
      var sig = (item.sourceId || item.text).toLowerCase();
      if (seen[sig]) return;
      seen[sig] = true;
      checklistItems.push(item);
    }

    (ok.knowledgeEntries || []).forEach(function (entry) {
      if (!entry.active) return;
      if (!shiftMatch(entry)) return;
      if (!knowledgeTriggersMatch(entry)) return;

      var actionText = buildKnowledgeActionText(entry);
      var follow = trimText(entry.followUpInstruction);
      matchedActions.push({
        sourceId: entry.id,
        sourceType: "knowledge",
        title: entry.title || "",
        followUpInstruction: follow,
        actionText: actionText,
        category: entry.category || "Operations",
        department: entry.department || "Reception",
        priority: entry.priority || "normal",
        sampleDataId: entry.sampleDataId || ""
      });

      if (!entry.checklistEnabled) return;
      addChecklist({
        sourceId: entry.id,
        sourceType: "knowledge",
        text: actionText,
        followUpInstruction: follow,
        actionText: actionText,
        category: entry.category || "Operations",
        department: entry.department || "Reception",
        priority: entry.priority || "normal",
        sampleDataId: entry.sampleDataId || ""
      });
    });

    /* Shift workflows remain the always-on shift checklist (not situational knowledge). */
    var workflow = ok.shiftWorkflows && ok.shiftWorkflows[shiftType];
    if (workflow && Array.isArray(workflow.steps)) {
      workflow.steps.forEach(function (step) {
        if (!step.active || !step.checklistEnabled) return;
        addChecklist({
          sourceId: step.id,
          sourceType: "workflow",
          text: step.title,
          category: "Workflow",
          department: step.department || "Reception",
          priority: step.required ? "high" : "normal",
          sampleDataId: step.sampleDataId || ""
        });
      });
    }

    return {
      checklistItems: checklistItems,
      workflowSteps: workflow ? workflow.steps : [],
      entries: ok.knowledgeEntries || [],
      matchedActions: matchedActions
    };
  }

  function summarizeRoomFacilitiesForContext(roomFacilities) {
    var rows = (roomFacilities || []).filter(function (room) {
      return room && trimText(room.roomNo);
    });
    if (!rows.length) return "";
    return "Room inventory includes " + rows.length + " rooms with operational attributes (twin, extra bed, accessible, quiet/street facing, lower ground, away from lift, dark room, bathtub, interconnecting). Shower configuration is recorded only when separately confirmed. Use these records as factual reference — room allocation remains a staff decision.";
  }

  function findRoomRecord(facilities, roomNo) {
    var key = normalizeRoomNoKey(roomNo);
    for (var i = 0; i < facilities.length; i++) {
      if (normalizeRoomNoKey(facilities[i].roomNo) === key) return facilities[i];
    }
    return null;
  }

  function extractMentionedRooms(text) {
    var rooms = [];
    var pattern = /\b(?:room\s+)?(\d+|lear'?s?\s*loft)\b/gi;
    var match;
    while ((match = pattern.exec(text)) !== null) {
      if (/loft/i.test(match[1])) rooms.push("Lear's Loft");
      else rooms.push(String(parseInt(match[1], 10)));
    }
    return rooms.filter(function (value, index, list) {
      return list.indexOf(value) === index;
    });
  }

  function describeRoomFacts(room) {
    if (!room) return "";
    var parts = [];
    if (trimText(room.bedType)) parts.push("bed: " + room.bedType);
    if (room.twinCapable) parts.push("twin capable");
    if (room.extraBedCapable) parts.push("extra bed capable");
    if (room.sofaBed) parts.push("sofa bed");
    if (room.streetFacing) parts.push("street facing");
    if (room.quietFacing) parts.push("quiet facing");
    if (room.lowerGround) parts.push("lower ground");
    if (room.awayFromLift) parts.push("away from lift");
    if (room.bathtub) parts.push("bathtub");
    if (room.darkRoom) parts.push("dark room");
    if (room.accessible) parts.push("accessible");
    if (trimText(room.connectingRoom)) parts.push("interconnects with room " + room.connectingRoom);
    return parts.join("; ");
  }

  function roomHasAwayFromLift(room) {
    if (!room) return false;
    if (room.awayFromLift) return true;
    var notes = String(room.notes || "").toLowerCase();
    var custom = String(room.customFeatures || "").toLowerCase();
    return /away from lift|away from elevator|quiet of lift|not near lift|far from lift/.test(notes + " " + custom);
  }

  function getRoomAttributeReminders(brainContext, rawNotesText) {
    var facilities = (brainContext && brainContext.roomFacilities) || [];
    if (!facilities.length) return [];
    var notes = String(rawNotesText || "").toLowerCase();
    if (!trimText(notes)) return [];

    var reminders = [];

    /* Only surface room attributes when the notes ask for a capability decision —
       never because a room number was merely mentioned. */
    function roomsWith(key) {
      return facilities.filter(function (room) { return room && room[key]; });
    }

    function roomNumbers(list) {
      return list.map(function (room) { return room.roomNo; }).join(", ");
    }

    var checks = [
      { pattern: /twin|two beds|twin room|twin beds/, key: "twinCapable", label: "twin capable", action: "Use a twin-capable room" },
      { pattern: /extra bed|rollaway|third guest|additional bed/, key: "extraBedCapable", label: "extra bed capable", action: "Allocate an extra-bed capable room" },
      { pattern: /sofa bed|sofabed|sofa-bed/, key: "sofaBed", label: "sofa bed", action: "Prefer a sofa-bed room if required" },
      { pattern: /accessible|wheelchair|mobility|step-free|disabled access/, key: "accessible", label: "accessible", action: "Allocate an accessible room" },
      { pattern: /bathtub|bath tub|room with bath/, key: "bathtub", label: "bathtub", action: "Allocate a room with bathtub" },
      { pattern: /street facing|street view|front facing|road facing/, key: "streetFacing", label: "street facing", action: "Note street-facing inventory if relevant" },
      { pattern: /dark room|blackout room|light sensitive|low light/, key: "darkRoom", label: "dark room", action: "Prefer a dark/blackout room" },
      { pattern: /quiet room|quiet side|courtyard|away from street/, key: "quietFacing", label: "quiet facing", action: "Prefer a quiet-facing room" },
      { pattern: /lower ground|lower-ground|\blg\b|basement room|below ground/, key: "lowerGround", label: "lower ground", action: "Note lower-ground room options" }
    ];

    checks.forEach(function (check) {
      if (!check.pattern.test(notes)) return;
      var matching = roomsWith(check.key);
      if (!matching.length) return;
      reminders.push({
        text: check.action + " — Hotel Brain options: " + roomNumbers(matching) + ".",
        category: "Rooms",
        department: "Reception",
        priority: "normal"
      });
    });

    if (/away from lift|away from elevator|not near (the )?lift|far from (the )?lift|noisy lift|lift noise/.test(notes)) {
      var awayRooms = facilities.filter(roomHasAwayFromLift);
      if (awayRooms.length) {
        reminders.push({
          text: "Prefer a room away from the lift — Hotel Brain options: " + roomNumbers(awayRooms) + ".",
          category: "Rooms",
          department: "Reception",
          priority: "normal"
        });
      }
    }

    if (/interconnect|connecting room|adjoining room|adjacent room/.test(notes)) {
      var pairs = facilities.filter(function (room) { return trimText(room.connectingRoom); });
      if (pairs.length) {
        reminders.push({
          text: "Allocate interconnecting rooms if required — pairs on file: " + pairs.map(function (room) {
            return room.roomNo + "/" + room.connectingRoom;
          }).join(", ") + ".",
          category: "Rooms",
          department: "Reception",
          priority: "high"
        });
      }
    }

    return reminders.slice(0, 4);
  }

  function summarizeOperationalActionsForContext(operationalKnowledge) {
    var entries = (operationalKnowledge && operationalKnowledge.knowledgeEntries) || [];
    var lines = [];
    entries.forEach(function (entry) {
      if (!entry || entry.active === false) return;
      var title = trimText(entry.title);
      if (!title) return;
      var follow = trimText(entry.followUpInstruction);
      var triggers = Array.isArray(entry.triggerKeywords) ? entry.triggerKeywords.filter(Boolean).join(", ") : "";
      var line = title;
      if (follow) line += " → " + follow;
      if (triggers) line += " (triggers: " + triggers + ")";
      lines.push(line);
    });
    return lines;
  }

  function isGuestImpactingSupply(item) {
    if (!item) return false;
    var name = String(item.name || "").toLowerCase();
    var category = String(item.category || "").toLowerCase();
    if (!name) return false;
    if (item.loanItem === "yes" || item.loanItem === true || item.loanItem === "true") return true;
    if (trimText(item.guestCharge) || trimText(item.replacementCharge)) return true;
    if (/loan|welcome|amenit|adapter|key|card|charger|umbrella|hairdryer|iron/.test(category)) return true;
    if (/adapter|welcome card|key|charger|umbrella|hairdryer|iron|amenit/.test(name)) return true;
    if (/stationer|pen|pencil|sticky|cartridge|printer|paper/.test(category + " " + name)) return false;
    return false;
  }

  function summarizeGuestImpactingSupplies(supplies) {
    return (supplies || [])
      .filter(isGuestImpactingSupply)
      .map(function (item) {
        var name = trimText(item.name);
        if (!name) return "";
        var parts = [name];
        if (trimText(item.category)) parts.push(trimText(item.category));
        if (trimText(item.quantity)) parts.push("qty " + trimText(item.quantity));
        if (trimText(item.reorderNotes)) parts.push(trimText(item.reorderNotes));
        return parts.join(" · ");
      })
      .filter(Boolean);
  }

  global.HotelProfileOperational = {
    SCHEMA_V4: SCHEMA_V4,
    SHIFT_TYPES: SHIFT_TYPES,
    KNOWLEDGE_CATEGORIES: KNOWLEDGE_CATEGORIES,
    emptyOperationalKnowledge: emptyOperationalKnowledge,
    migrateToV4: migrateToV4,
    mergeSampleIntoProfile: mergeSampleIntoProfile,
    collectOperationalKnowledge: collectOperationalKnowledge,
    renderOperationalKnowledgeUI: renderOperationalKnowledgeUI,
    bindOperationalKnowledgeEvents: bindOperationalKnowledgeEvents,
    loadZetterSample: loadZetterSample,
    getShiftIntelligenceKnowledge: getShiftIntelligenceKnowledge,
    summarizeRoomFacilitiesForContext: summarizeRoomFacilitiesForContext,
    getRoomAttributeReminders: getRoomAttributeReminders,
    summarizeOperationalActionsForContext: summarizeOperationalActionsForContext,
    summarizeGuestImpactingSupplies: summarizeGuestImpactingSupplies,
    isGuestImpactingSupply: isGuestImpactingSupply,
    buildKnowledgeActionText: buildKnowledgeActionText,
    normalizeKnowledgeEntry: normalizeKnowledgeEntry
  };
})(typeof window !== "undefined" ? window : globalThis);
