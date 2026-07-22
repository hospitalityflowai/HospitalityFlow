/**
 * Hospitality Flow — AI Rota Generator
 * Local scheduling engine (no external AI APIs).
 */
(function () {
  "use strict";

  var DRAFT_KEY = "hf-rota-generator-draft-v2";

  function draftStorageScope() {
    if (window.HFTenantStorage) {
      return window.HFTenantStorage.resolveScopeId();
    }
    return null;
  }

  var DEFAULT_SHIFTS = [
    { id: "AM", code: "AM", name: "AM", start: "07:00", end: "15:00", isDefault: true },
    { id: "PM", code: "PM", name: "PM", start: "15:00", end: "23:00", isDefault: true },
    { id: "Night", code: "Night", name: "Night", start: "23:00", end: "07:00", isNight: true, isDefault: true },
    { id: "Day", code: "Day", name: "Day", start: "07:00", end: "19:00", isDefault: true },
    { id: "Night12", code: "Night12", name: "Night 12h", start: "19:00", end: "07:00", isNight: true, isDefault: true },
    { id: "Office", code: "Office", name: "Office", start: "09:00", end: "17:00", isDefault: true },
    { id: "Mid", code: "Mid", name: "Mid", start: "10:00", end: "18:00", isDefault: true },
    { id: "MidLate", code: "ML", name: "Mid Late", start: "12:00", end: "20:00", isDefault: true },
    { id: "Evening", code: "Eve", name: "Evening", start: "14:00", end: "22:00", isDefault: true },
    { id: "Late", code: "Late", name: "Late", start: "16:00", end: "00:00", isNight: true, isDefault: true },
    { id: "Early", code: "Early", name: "Early", start: "06:00", end: "14:00", isDefault: true },
    { id: "Split", code: "Split", name: "Split Shift", start: "10:00", end: "21:00", isSplit: true, isDefault: true }
  ];

  var SCHEDULE_PATTERNS = {
    "8hour": ["AM", "PM", "Night"],
    "12hour": ["Day", "Night12"],
    "custom": []
  };

  var CORE_SHIFT_IDS = ["AM", "PM", "Night"];
  var ADVANCED_SHIFT_IDS = ["Day", "Night12", "Office", "Mid", "MidLate", "Evening", "Late", "Early", "Split"];

  var state = {
    shiftPattern: "8hour",
    customShifts: [],
    customShiftCounter: 0,
    activeShiftIds: CORE_SHIFT_IDS.slice(),
    generatedRota: null,
    days: [],
    shifts: [],
    coverage: {
      mode: "same",
      same: {},
      daily: [],
      activeDayIndex: 0
    },
    ui: {
      addShiftsOpen: false,
      dailyCoverageOpen: false,
      editingShiftId: null
    }
  };
  var AUTO_SAVE_DELAY = 800;

  var isGenerating = false;
  var isRestoring = false;
  var autoSaveTimer = null;
  var toastTimer = null;

  var els = {};

  function $(id) { return document.getElementById(id); }

  function initEls() {
    els.hotelName = $("hotelName");
    els.department = $("department");
    els.periodType = $("periodType");
    els.periodStart = $("periodStart");
    els.staffCount = $("staffCount");
    els.shiftPatternDetail = $("shiftPatternDetail");
    els.activeShiftsList = $("activeShiftsList");
    els.shiftEditPanel = $("shiftEditPanel");
    els.toggleAddShiftsBtn = $("toggleAddShiftsBtn");
    els.addShiftsPanel = $("addShiftsPanel");
    els.advancedShiftPicker = $("advancedShiftPicker");
    els.customShiftsInline = $("customShiftsInline");
    els.addCustomShiftBtn = $("addCustomShiftBtn");
    els.staffTableBody = $("staffTableBody");
    els.addStaffBtn = $("addStaffBtn");
    els.ruleConsecutive = $("ruleConsecutive");
    els.maxConsecutiveDays = $("maxConsecutiveDays");
    els.ruleMinRest = $("ruleMinRest");
    els.minRestHours = $("minRestHours");
    els.ruleWeekendRotation = $("ruleWeekendRotation");
    els.ruleNoDouble = $("ruleNoDouble");
    els.ruleContractHours = $("ruleContractHours");
    els.ruleBalanceNights = $("ruleBalanceNights");
    els.aiInstructions = $("aiInstructions");
    els.generateBtn = $("generateBtn");
    els.generateBtnText = $("generateBtnText");
    els.saveDraftBtn = $("saveDraftBtn");
    els.clearDraftBtn = $("clearDraftBtn");
    els.exportPdfBtn = $("exportPdfBtn");
    els.printBtn = $("printBtn");
    els.generateNewBtn = $("generateNewBtn");
    els.saveStatus = $("saveStatus");
    els.outputSection = $("outputSection");
    els.rotaCard = $("rotaCard");
    els.rotaPrintHeader = $("rotaPrintHeader");
    els.rotaMeta = $("rotaMeta");
    els.rotaTableHead = $("rotaTableHead");
    els.rotaTableBody = $("rotaTableBody");
    els.totalsGrid = $("totalsGrid");
    els.warningsPanel = $("warningsPanel");
    els.warningsList = $("warningsList");
    els.toast = $("toast");
    els.coverageEditor = $("coverageEditor");
    els.toggleDailyCoverage = $("toggleDailyCoverage");
    els.dailyCoveragePanel = $("dailyCoveragePanel");
    els.coverageDayNav = $("coverageDayNav");
  }

  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.classList.remove("show"); }, 2800);
  }

  function setSaveStatus(type, text) {
    els.saveStatus.className = "save-status" + (type ? " is-" + type : "");
    els.saveStatus.textContent = text || "";
  }

  function pad(n) { return n < 10 ? "0" + n : String(n); }

  function formatDateISO(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function parseDate(str) {
    if (!str) return null;
    var p = str.split("-");
    if (p.length !== 3) return null;
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  function addDays(date, n) {
    var d = new Date(date.getTime());
    d.setDate(d.getDate() + n);
    return d;
  }

  function getMonday(d) {
    var day = d.getDay();
    var diff = day === 0 ? -6 : 1 - day;
    return addDays(d, diff);
  }

  function dayLabel(d) {
    var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[d.getDay()] + " " + pad(d.getDate()) + "/" + pad(d.getMonth() + 1);
  }

  function buildEmptyDayCoverage() {
    var cov = {};
    getAllWorkShifts().forEach(function (s) {
      cov[s.id] = { enabled: false, staff: 1 };
    });
    return cov;
  }

  function mergeCoverageEntry(target, source) {
    if (!source) return target;
    Object.keys(source).forEach(function (shiftId) {
      if (!target[shiftId]) target[shiftId] = { enabled: false, staff: 1 };
      if (source[shiftId].enabled != null) target[shiftId].enabled = !!source[shiftId].enabled;
      if (source[shiftId].staff != null) {
        var n = parseInt(source[shiftId].staff, 10);
        target[shiftId].staff = isNaN(n) || n < 1 ? 1 : Math.min(n, 20);
      }
    });
    getAllWorkShifts().forEach(function (s) {
      if (!target[s.id]) target[s.id] = { enabled: false, staff: 1 };
    });
    return target;
  }

  function ensureCoverageStructure() {
    state.coverage.same = mergeCoverageEntry(buildEmptyDayCoverage(), state.coverage.same || {});
    var periodDays = buildPeriodDays();
    while (state.coverage.daily.length < periodDays.length) {
      var clone = JSON.parse(JSON.stringify(state.coverage.same));
      state.coverage.daily.push(clone);
    }
    if (state.coverage.daily.length > periodDays.length) {
      state.coverage.daily = state.coverage.daily.slice(0, periodDays.length);
    }
    state.coverage.daily = state.coverage.daily.map(function (dayCov) {
      return mergeCoverageEntry(buildEmptyDayCoverage(), dayCov);
    });
    if (state.coverage.activeDayIndex >= periodDays.length) {
      state.coverage.activeDayIndex = 0;
    }
  }

  function getDayCoverage(dayIdx) {
    ensureCoverageStructure();
    if (state.coverage.mode === "daily") {
      return state.coverage.daily[dayIdx] || state.coverage.same;
    }
    return state.coverage.same;
  }

  function hasAnyCoverageRequirements() {
    ensureCoverageStructure();
    if (state.coverage.mode === "same") {
      return Object.keys(state.coverage.same).some(function (id) {
        var r = state.coverage.same[id];
        return r && r.enabled && r.staff >= 1;
      });
    }
    return state.coverage.daily.some(function (dayCov) {
      return dayCov && Object.keys(dayCov).some(function (id) {
        var r = dayCov[id];
        return r && r.enabled && r.staff >= 1;
      });
    });
  }

  function getRequiredSlotsForDay(dayIdx) {
    var cov = getDayCoverage(dayIdx);
    var slots = [];
    getAllWorkShifts().forEach(function (shift) {
      var req = cov[shift.id];
      if (req && req.enabled && req.staff >= 1) {
        slots.push({ shiftId: shift.id, shift: shift, count: req.staff });
      }
    });
    return slots;
  }

  function countScheduledForShift(dayIdx, shiftId) {
    if (!state.generatedRota) return 0;
    var count = 0;
    state.generatedRota.staff.forEach(function (s) {
      if (state.generatedRota.assignments[s.id][dayIdx] === shiftId) count++;
    });
    return count;
  }

  function computeCoverageWarnings() {
    var warnings = [];
    if (!state.generatedRota || !state.days.length) return warnings;
    if (!hasAnyCoverageRequirements()) return warnings;

    state.days.forEach(function (day, dayIdx) {
      getRequiredSlotsForDay(dayIdx).forEach(function (slot) {
        var scheduled = countScheduledForShift(dayIdx, slot.shiftId);
        if (scheduled < slot.count) {
          var code = slot.shift.code || slot.shift.name;
          warnings.push({
            type: "uncovered",
            text: code + " understaffed on " + day.label + " \u2014 required " + slot.count + ", scheduled " + scheduled
          });
        }
      });
    });
    return warnings;
  }

  function getActiveCoverageTarget() {
    ensureCoverageStructure();
    if (state.coverage.mode === "daily") {
      return state.coverage.daily[state.coverage.activeDayIndex];
    }
    return state.coverage.same;
  }

  function renderCoverageUi() {
    if (!els.coverageEditor) return;
    ensureCoverageStructure();
    var periodDays = buildPeriodDays();

    if (els.toggleDailyCoverage) {
      els.toggleDailyCoverage.textContent = state.ui.dailyCoverageOpen ?
        "Hide individual day coverage" : "Set coverage by individual day";
    }
    if (els.dailyCoveragePanel) {
      els.dailyCoveragePanel.hidden = !state.ui.dailyCoverageOpen;
    }

    if (els.coverageDayNav && state.ui.dailyCoverageOpen) {
      els.coverageDayNav.innerHTML = periodDays.map(function (d, i) {
        return "<button type=\"button\" class=\"coverage-day-btn" + (d.weekend ? " weekend" : "") +
          (i === state.coverage.activeDayIndex ? " active" : "") + "\" data-day-index=\"" + i + "\">" +
          escapeHtml(d.label) + "</button>";
      }).join("");
      els.coverageDayNav.querySelectorAll(".coverage-day-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          state.coverage.activeDayIndex = +btn.dataset.dayIndex;
          renderCoverageUi();
        });
      });
    } else if (els.coverageDayNav) {
      els.coverageDayNav.innerHTML = "";
    }

    var target = getActiveCoverageTarget();
    var shifts = getActiveWorkShifts();
    els.coverageEditor.innerHTML = shifts.map(function (s) {
      var req = target[s.id] || { enabled: false, staff: 1 };
      return "<div class=\"coverage-row\" data-shift-id=\"" + escapeAttr(s.id) + "\">" +
        "<div class=\"coverage-row-info\">" +
        "<div class=\"coverage-row-name\">" + escapeHtml(s.name) + "</div>" +
        "<div class=\"coverage-row-time\">" + escapeHtml(getShiftTimeLabel(s)) + "</div></div>" +
        "<div class=\"coverage-row-controls\">" +
        "<label><input type=\"checkbox\" class=\"coverage-required\"" + (req.enabled ? " checked" : "") + "> Required</label>" +
        "<input type=\"number\" class=\"coverage-staff-input\" min=\"1\" max=\"20\" value=\"" + req.staff + "\"" +
        (req.enabled ? "" : " disabled") + " aria-label=\"Staff needed\" title=\"Staff needed\">" +
        "</div></div>";
    }).join("");

    els.coverageEditor.querySelectorAll(".coverage-row").forEach(function (row) {
      var shiftId = row.dataset.shiftId;
      var reqCb = row.querySelector(".coverage-required");
      var staffInput = row.querySelector(".coverage-staff-input");

      reqCb.addEventListener("change", function () {
        target[shiftId].enabled = reqCb.checked;
        staffInput.disabled = !reqCb.checked;
        if (reqCb.checked && (!staffInput.value || +staffInput.value < 1)) staffInput.value = "1";
        target[shiftId].staff = parseInt(staffInput.value, 10) || 1;
        if (state.generatedRota) renderTotalsAndWarnings();
        scheduleAutoSave();
      });

      staffInput.addEventListener("input", function () {
        var n = parseInt(staffInput.value, 10);
        target[shiftId].staff = isNaN(n) || n < 1 ? 1 : Math.min(n, 20);
        if (state.generatedRota) renderTotalsAndWarnings();
        scheduleAutoSave();
      });
    });
  }

  function toggleDailyCoverage(open) {
    ensureCoverageStructure();
    state.ui.dailyCoverageOpen = open != null ? open : !state.ui.dailyCoverageOpen;
    if (state.ui.dailyCoverageOpen && state.coverage.mode !== "daily") {
      var periodDays = buildPeriodDays();
      state.coverage.daily = periodDays.map(function () {
        return JSON.parse(JSON.stringify(state.coverage.same));
      });
      state.coverage.activeDayIndex = 0;
      state.coverage.mode = "daily";
    }
    if (!state.ui.dailyCoverageOpen) {
      state.coverage.mode = "same";
    }
    renderCoverageUi();
    if (state.generatedRota) renderTotalsAndWarnings();
    scheduleAutoSave();
  }

  function applyStaffAssignment(staffStates, staffId, dayIdx, shift, day) {
    var ss = staffStates[staffId];
    ss.assignments[dayIdx] = shift.id;
    ss.totalHours += shift.hours;
    if (shift.isNight) ss.nightCount++;
    if (day.weekend) ss.weekendCount++;
    ss.lastWorkedDayIdx = dayIdx;
    ss.lastShiftEnd = getShiftEndDateTime(day.date, shift);
  }

  function pickStaffForShift(staffList, staffStates, dayIdx, shift, rules, hints, excludeIds) {
    var candidates = staffList.filter(function (s) {
      if (excludeIds.indexOf(s.id) >= 0) return false;
      return canAssign(staffStates[s.id], dayIdx, shift, rules, hints);
    });

    candidates.sort(function (a, b) {
      return scoreCandidate(b, staffStates[b.id], dayIdx, shift, rules, hints) -
        scoreCandidate(a, staffStates[a.id], dayIdx, shift, rules, hints);
    });

    if (hints.limitNewStarters) {
      var newCount = 0;
      candidates = candidates.filter(function (s) {
        if (!s.isNewStarter) return true;
        if (newCount >= 1) return false;
        newCount++;
        return true;
      });
    }

    return candidates[0] || null;
  }

  function generateFairRota(staffList, staffStates, rules, hints) {
    staffList.forEach(function (staff) {
      var ss = staffStates[staff.id];
      var targetHours = staff.contractHours * (state.days.length / 7);
      var prefShift = staff.preferredShift && shiftById(staff.preferredShift) ? staff.preferredShift : null;

      for (var dayIdx = 0; dayIdx < state.days.length; dayIdx++) {
        if (ss.totalHours >= targetHours - 0.01) break;
        if (!isDayOff(ss.assignments[dayIdx])) continue;

        var shift = prefShift ? shiftById(prefShift) : null;
        if (!shift || !canAssign(ss, dayIdx, shift, rules, hints)) {
          var fallbacks = getAllWorkShifts();
          shift = null;
          for (var fi = 0; fi < fallbacks.length; fi++) {
            if (canAssign(ss, dayIdx, fallbacks[fi], rules, hints)) {
              shift = fallbacks[fi];
              break;
            }
          }
        }
        if (!shift) continue;
        applyStaffAssignment(staffStates, staff.id, dayIdx, shift, state.days[dayIdx]);
      }
    });
  }


  function isWeekend(d) { return d.getDay() === 0 || d.getDay() === 6; }

  function timeToMinutes(t) {
    var p = t.split(":");
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }

  function calcShiftHours(start, end) {
    var s = timeToMinutes(start);
    var e = timeToMinutes(end);
    if (e <= s) e += 24 * 60;
    return (e - s) / 60;
  }

  function formatTimeRange(start, end) {
    return start + "\u2013" + end;
  }

  function inferIsNight(start, end) {
    var startMin = timeToMinutes(start);
    var endMin = timeToMinutes(end);
    return startMin >= 18 * 60 || endMin <= 8 * 60 || (endMin === 0 && startMin >= 16 * 60);
  }

  function enrichShift(raw) {
    if (!raw || !raw.name) return null;
    var hours = raw.isSplit ? 8 : calcShiftHours(raw.start, raw.end);
    var isNight = raw.isNight != null ? raw.isNight : inferIsNight(raw.start, raw.end);
    return {
      id: raw.id,
      code: (raw.code || raw.name || raw.id || "").trim(),
      name: raw.name,
      start: raw.start,
      end: raw.end,
      hours: hours,
      isNight: isNight,
      isDefault: !!raw.isDefault,
      isSplit: !!raw.isSplit
    };
  }

  function getCustomWorkShifts() {
    return state.customShifts
      .filter(function (s) { return s.name && s.start && s.end; })
      .map(enrichShift)
      .filter(Boolean);
  }

  function getFullShiftCatalog() {
    return DEFAULT_SHIFTS.map(enrichShift).filter(Boolean).concat(getCustomWorkShifts());
  }

  function normalizeActiveShiftIds() {
    var ids = (state.activeShiftIds || []).filter(function (id) { return !!shiftById(id); });
    CORE_SHIFT_IDS.forEach(function (id) {
      if (ids.indexOf(id) < 0) ids.unshift(id);
    });
    state.activeShiftIds = ids.filter(function (id, i, arr) { return arr.indexOf(id) === i; });
  }

  function ensureActiveShiftsFromSavedData() {
    normalizeActiveShiftIds();
    if (state.generatedRota && state.generatedRota.assignments) {
      Object.keys(state.generatedRota.assignments).forEach(function (sid) {
        state.generatedRota.assignments[sid].forEach(function (val) {
          if (isWorkingShift(val) && state.activeShiftIds.indexOf(val) < 0) {
            state.activeShiftIds.push(val);
          }
        });
      });
    }
    getCustomWorkShifts().forEach(function (s) {
      if (state.activeShiftIds.indexOf(s.id) < 0) state.activeShiftIds.push(s.id);
    });
    normalizeActiveShiftIds();
  }

  function getActiveWorkShifts() {
    normalizeActiveShiftIds();
    return state.activeShiftIds.map(function (id) { return shiftById(id); }).filter(Boolean);
  }

  function getAllWorkShifts() {
    return getActiveWorkShifts();
  }

  function getShiftTimeLabel(shift) {
    if (!shift) return "";
    if (shift.isSplit) return "Split (8h)";
    return formatTimeRange(shift.start, shift.end);
  }

  function isCoreShift(id) {
    return CORE_SHIFT_IDS.indexOf(id) >= 0;
  }

  function activateShiftId(id) {
    if (!shiftById(id)) return;
    if (state.activeShiftIds.indexOf(id) < 0) state.activeShiftIds.push(id);
    normalizeActiveShiftIds();
    refreshShiftUi();
    scheduleAutoSave();
    showToast("Shift added.");
  }

  function deactivateShiftId(id) {
    if (isCoreShift(id)) return;
    state.activeShiftIds = state.activeShiftIds.filter(function (x) { return x !== id; });
    if (state.ui.editingShiftId === id) state.ui.editingShiftId = null;
    pruneCoverageForInactiveShifts();
    if (state.generatedRota && state.generatedRota.assignments) {
      Object.keys(state.generatedRota.assignments).forEach(function (sid) {
        state.generatedRota.assignments[sid] = state.generatedRota.assignments[sid].map(function (v) {
          return v === id ? CELL.OFF : v;
        });
      });
    }
    refreshShiftUi();
    scheduleAutoSave();
  }

  function pruneCoverageForInactiveShifts() {
    var active = {};
    getActiveWorkShifts().forEach(function (s) { active[s.id] = true; });
    function prune(obj) {
      Object.keys(obj).forEach(function (id) {
        if (!active[id]) delete obj[id];
      });
    }
    prune(state.coverage.same);
    state.coverage.daily.forEach(prune);
  }

  function getSchedulingShifts() {
    if (state.shiftPattern === "custom") {
      return getCustomWorkShifts();
    }
    var ids = SCHEDULE_PATTERNS[state.shiftPattern] || SCHEDULE_PATTERNS["8hour"];
    return ids.map(function (id) { return shiftById(id); }).filter(Boolean);
  }

  function getActiveShifts() {
    return getAllWorkShifts();
  }

  function nextCustomShiftId() {
    state.customShiftCounter += 1;
    return "custom_" + state.customShiftCounter;
  }

  function migrateCustomShifts(arr) {
    if (!arr || !arr.length) return [];
    var maxNum = 0;
    var migrated = arr.map(function (s, i) {
      var id = s.id || ("custom_" + (i + 1));
      var num = parseInt(String(id).replace("custom_", ""), 10);
      if (!isNaN(num)) maxNum = Math.max(maxNum, num);
      return {
        id: id,
        code: (s.code || "").trim() || (s.name ? s.name.substring(0, 3).toUpperCase() : "CUS"),
        name: s.name || "",
        start: s.start || "09:00",
        end: s.end || "17:00"
      };
    });
    state.customShiftCounter = Math.max(state.customShiftCounter, maxNum);
    return migrated;
  }

  function renderShiftPatternDetail() {
    var shifts = getSchedulingShifts();
    var label = state.shiftPattern === "custom" ? "Custom shifts used for generation" : "Shifts scheduled on generate";
    if (!shifts.length) {
      els.shiftPatternDetail.innerHTML = "<h4>" + label + "</h4><p class=\"form-helper\">Add custom shifts in Manage Shifts when using the Custom pattern.</p>";
      return;
    }
    var html = "<h4>" + label + "</h4><div class=\"shift-chip-list\">";
    shifts.forEach(function (s) {
      html += "<span class=\"shift-chip\">" + escapeHtml(s.code) + " " + s.start + "\u2013" + s.end + "</span>";
    });
    html += "</div>";
    els.shiftPatternDetail.innerHTML = html;
  }

  function renderShiftEditPanel(shiftId) {
    if (!els.shiftEditPanel) return;
    var shift = shiftById(shiftId);
    if (!shift) {
      els.shiftEditPanel.hidden = true;
      return;
    }
    var isCustom = String(shiftId).indexOf("custom_") === 0;
    var html = "<div class=\"shift-edit-meta\"><strong>" + escapeHtml(shift.name) + "</strong> (" +
      escapeHtml(shift.code || shift.name) + ")<br>" + escapeHtml(getShiftTimeLabel(shift)) + "</div>";
    if (isCustom) {
      var raw = state.customShifts.find(function (s) { return s.id === shiftId; });
      html = "<div class=\"custom-shift-inline\" data-id=\"" + escapeAttr(shiftId) + "\">" +
        "<input type=\"text\" class=\"shift-field-code\" value=\"" + escapeAttr(raw ? raw.code : "") + "\" placeholder=\"Code\" maxlength=\"8\">" +
        "<input type=\"text\" class=\"shift-field-name\" value=\"" + escapeAttr(raw ? raw.name : "") + "\" placeholder=\"Shift name\">" +
        "<input type=\"time\" class=\"shift-field-start\" value=\"" + escapeAttr(raw ? raw.start : "09:00") + "\">" +
        "<input type=\"time\" class=\"shift-field-end\" value=\"" + escapeAttr(raw ? raw.end : "17:00") + "\">" +
        "<button type=\"button\" class=\"icon-btn remove-custom-shift\" aria-label=\"Delete custom shift\">" +
        "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><line x1=\"18\" y1=\"6\" x2=\"6\" y2=\"18\"/><line x1=\"6\" y1=\"6\" x2=\"18\" y2=\"18\"/></svg></button></div>";
    } else {
      html += "<button type=\"button\" class=\"btn-compact\" id=\"closeShiftEditBtn\" style=\"margin-top:10px\">Close</button>";
      if (!isCoreShift(shiftId)) {
        html += " <button type=\"button\" class=\"btn-compact btn-compact--ghost\" id=\"removeShiftBtn\">Remove</button>";
      }
    }
    els.shiftEditPanel.innerHTML = html;
    els.shiftEditPanel.hidden = false;

    if (isCustom && raw) {
      els.shiftEditPanel.querySelectorAll("input").forEach(function (input) {
        input.addEventListener("input", function () {
          if (input.classList.contains("shift-field-code")) raw.code = input.value.trim();
          if (input.classList.contains("shift-field-name")) raw.name = input.value.trim();
          if (input.classList.contains("shift-field-start")) raw.start = input.value;
          if (input.classList.contains("shift-field-end")) raw.end = input.value;
          renderManageShifts();
          scheduleAutoSave();
        });
      });
      var rm = els.shiftEditPanel.querySelector(".remove-custom-shift");
      if (rm) rm.addEventListener("click", function () { deleteCustomShift(shiftId); });
    } else {
      var closeBtn = $("closeShiftEditBtn");
      if (closeBtn) closeBtn.addEventListener("click", function () {
        state.ui.editingShiftId = null;
        els.shiftEditPanel.hidden = true;
      });
      var removeBtn = $("removeShiftBtn");
      if (removeBtn) removeBtn.addEventListener("click", function () { deactivateShiftId(shiftId); });
    }
  }

  function renderCustomShiftsInline() {
    if (!els.customShiftsInline) return;
    els.customShiftsInline.innerHTML = state.customShifts.map(function (s) {
      return "<div class=\"custom-shift-inline\" data-id=\"" + escapeAttr(s.id) + "\">" +
        "<input type=\"text\" class=\"shift-field-code\" value=\"" + escapeAttr(s.code || "") + "\" placeholder=\"Code\" maxlength=\"8\">" +
        "<input type=\"text\" class=\"shift-field-name\" value=\"" + escapeAttr(s.name || "") + "\" placeholder=\"Shift name\">" +
        "<input type=\"time\" class=\"shift-field-start\" value=\"" + escapeAttr(s.start || "09:00") + "\">" +
        "<input type=\"time\" class=\"shift-field-end\" value=\"" + escapeAttr(s.end || "17:00") + "\">" +
        "<button type=\"button\" class=\"icon-btn remove-custom-shift\" aria-label=\"Delete custom shift\">" +
        "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><line x1=\"18\" y1=\"6\" x2=\"6\" y2=\"18\"/><line x1=\"6\" y1=\"6\" x2=\"18\" y2=\"18\"/></svg></button></div>";
    }).join("");

    els.customShiftsInline.querySelectorAll(".custom-shift-inline input").forEach(function (input) {
      input.addEventListener("input", function () {
        var row = input.closest(".custom-shift-inline");
        var id = row.dataset.id;
        var shift = state.customShifts.find(function (s) { return s.id === id; });
        if (!shift) return;
        if (input.classList.contains("shift-field-code")) shift.code = input.value.trim();
        if (input.classList.contains("shift-field-name")) shift.name = input.value.trim();
        if (input.classList.contains("shift-field-start")) shift.start = input.value;
        if (input.classList.contains("shift-field-end")) shift.end = input.value;
        if (state.activeShiftIds.indexOf(id) < 0 && shift.name) state.activeShiftIds.push(id);
        normalizeActiveShiftIds();
        renderManageShifts();
        scheduleAutoSave();
      });
    });
    els.customShiftsInline.querySelectorAll(".remove-custom-shift").forEach(function (btn) {
      btn.addEventListener("click", function () {
        deleteCustomShift(btn.closest(".custom-shift-inline").dataset.id);
      });
    });
  }

  function renderAdvancedShiftPicker() {
    if (!els.advancedShiftPicker) return;
    els.advancedShiftPicker.innerHTML = ADVANCED_SHIFT_IDS.map(function (id) {
      var s = shiftById(id);
      if (!s) return "";
      var active = state.activeShiftIds.indexOf(id) >= 0;
      return "<button type=\"button\" class=\"advanced-shift-btn\" data-shift-id=\"" + escapeAttr(id) + "\"" +
        (active ? " disabled" : "") + ">" + escapeHtml(s.name) + "</button>";
    }).join("");
    els.advancedShiftPicker.querySelectorAll(".advanced-shift-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        activateShiftId(btn.dataset.shiftId);
        state.ui.addShiftsOpen = true;
      });
    });
  }

  function renderManageShifts() {
    if (!els.activeShiftsList) return;
    normalizeActiveShiftIds();
    var shifts = getActiveWorkShifts();

    els.activeShiftsList.innerHTML = shifts.map(function (s) {
      var removeBtn = isCoreShift(s.id) ? "" :
        "<button type=\"button\" class=\"btn-compact btn-compact--ghost remove-active-shift\" data-id=\"" + escapeAttr(s.id) + "\">Remove</button>";
      return "<div class=\"shift-row-compact\" data-id=\"" + escapeAttr(s.id) + "\">" +
        "<div class=\"shift-row-compact-info\">" +
        "<div class=\"shift-row-compact-name\">" + escapeHtml(s.name) + "</div>" +
        "<div class=\"shift-row-compact-time\">" + escapeHtml(getShiftTimeLabel(s)) + "</div></div>" +
        "<div class=\"shift-row-compact-actions\">" +
        "<button type=\"button\" class=\"btn-compact edit-active-shift\" data-id=\"" + escapeAttr(s.id) + "\">Edit</button>" +
        removeBtn + "</div></div>";
    }).join("");

    els.activeShiftsList.querySelectorAll(".edit-active-shift").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.ui.editingShiftId = btn.dataset.id;
        renderShiftEditPanel(btn.dataset.id);
      });
    });
    els.activeShiftsList.querySelectorAll(".remove-active-shift").forEach(function (btn) {
      btn.addEventListener("click", function () { deactivateShiftId(btn.dataset.id); });
    });

    if (els.toggleAddShiftsBtn) {
      els.toggleAddShiftsBtn.textContent = state.ui.addShiftsOpen ? "Hide additional shifts" : "Add another shift";
    }
    if (els.addShiftsPanel) els.addShiftsPanel.hidden = !state.ui.addShiftsOpen;
    renderAdvancedShiftPicker();
    renderCustomShiftsInline();

    if (state.ui.editingShiftId) renderShiftEditPanel(state.ui.editingShiftId);
    else if (els.shiftEditPanel) els.shiftEditPanel.hidden = true;
  }

  function deleteCustomShift(id) {
    if (!window.confirm("Delete this custom shift? Assigned rota cells will be set to Off.")) return;
    if (state.generatedRota && state.generatedRota.assignments) {
      Object.keys(state.generatedRota.assignments).forEach(function (sid) {
        state.generatedRota.assignments[sid] = state.generatedRota.assignments[sid].map(function (v) {
          return v === id ? CELL.OFF : v;
        });
      });
    }
    state.customShifts = state.customShifts.filter(function (s) { return s.id !== id; });
    state.activeShiftIds = state.activeShiftIds.filter(function (x) { return x !== id; });
    if (state.ui.editingShiftId === id) state.ui.editingShiftId = null;
    refreshShiftUi();
    scheduleAutoSave();
    showToast("Custom shift deleted.");
  }

  function addCustomShift() {
    var id = nextCustomShiftId();
    state.customShifts.push({ id: id, code: "", name: "", start: "09:00", end: "17:00" });
    state.activeShiftIds.push(id);
    state.ui.addShiftsOpen = true;
    state.ui.editingShiftId = id;
    refreshShiftUi();
    scheduleAutoSave();
  }

  function refreshStaffPreferredDropdowns() {
    els.staffTableBody.querySelectorAll(".staff-preferred").forEach(function (sel) {
      var val = sel.value;
      sel.innerHTML = getPreferredShiftOptions(val);
      if (shiftById(val)) sel.value = val;
      else sel.value = "";
    });
  }

  function refreshShiftUi() {
    renderManageShifts();
    renderShiftPatternDetail();
    ensureCoverageStructure();
    renderCoverageUi();
    refreshStaffPreferredDropdowns();
    if (state.generatedRota) {
      normalizeRotaAssignments();
      renderRota();
    }
  }

  function escapeHtml(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function escapeAttr(s) { return escapeHtml(s); }

  var CELL = { OFF: "OFF", HOL: "HOL", TRN: "TRN", SICK: "SICK" };
  var INVALID_CELL_VALUES = { clear: 1, now: 1, of: 1, "0m": 1 };

  function isWorkingShift(val) {
    return !!val && val !== CELL.OFF && val !== CELL.HOL && val !== CELL.TRN && val !== CELL.SICK;
  }

  function isDayOff(val) {
    return !val || val === CELL.OFF;
  }

  function normalizeCellValue(val) {
    if (val == null || val === "") return CELL.OFF;
    var s = String(val).trim();
    if (!s) return CELL.OFF;
    var lower = s.toLowerCase();
    if (lower === "off") return CELL.OFF;
    if (lower === "holiday" || s === CELL.HOL) return CELL.HOL;
    if (lower === "training" || s === CELL.TRN) return CELL.TRN;
    if (lower === "sick" || s === CELL.SICK) return CELL.SICK;
    if (INVALID_CELL_VALUES[lower]) return CELL.OFF;
    return s;
  }

  function resolveCellValue(raw) {
    raw = normalizeCellValue(raw);
    var allowed = [CELL.OFF, CELL.HOL, CELL.TRN, CELL.SICK];
    getAllWorkShifts().forEach(function (sh) { allowed.push(sh.id); });
    if (allowed.indexOf(raw) >= 0) return raw;
    var shifts = getAllWorkShifts();
    var byMatch = shifts.find(function (sh) {
      return sh.id.toLowerCase() === String(raw).toLowerCase() ||
        sh.code.toLowerCase() === String(raw).toLowerCase() ||
        sh.name.toLowerCase() === String(raw).toLowerCase();
    });
    if (byMatch) return byMatch.id;
    if (raw.indexOf("custom_") === 0) {
      var legacyIdx = parseInt(raw.replace("custom_", ""), 10);
      if (!isNaN(legacyIdx) && state.customShifts[legacyIdx]) {
        return state.customShifts[legacyIdx].id;
      }
    }
    return CELL.OFF;
  }

  function getCellDisplayParts(val) {
    val = resolveCellValue(val);
    if (val === CELL.OFF) return { code: "Off", time: "", label: "Off" };
    if (val === CELL.HOL) return { code: "Holiday", time: "", label: "Holiday" };
    if (val === CELL.TRN) return { code: "Training", time: "", label: "Training" };
    if (val === CELL.SICK) return { code: "Sick", time: "", label: "Sick" };
    var sh = shiftById(val);
    if (!sh) return { code: "Off", time: "", label: "Off" };
    var code = sh.code || sh.name;
    if (sh.isSplit) return { code: code, time: "Split (8h)", label: code + " Split (8h)" };
    var time = formatTimeRange(sh.start, sh.end);
    return { code: code, time: time, label: code + " " + time };
  }

  function getCellDisplayLabel(val) {
    return getCellDisplayParts(val).label;
  }

  function buildCellDisplayHtml(parts) {
    return "<span class=\"rota-cell-code\">" + escapeHtml(parts.code) + "</span>" +
      (parts.time ? "<span class=\"rota-cell-time\">" + escapeHtml(parts.time) + "</span>" : "");
  }

  function shiftOptionLabel(sh) {
    if (sh.isSplit) return sh.code + " \u00b7 Split (8h)";
    return sh.code + " \u00b7 " + formatTimeRange(sh.start, sh.end);
  }

  function preferredOptionLabel(sh) {
    if (sh.isSplit) return sh.name + " (Split 8h)";
    return sh.name + " (" + formatTimeRange(sh.start, sh.end) + ")";
  }

  function buildSelectOption(value, label, selected) {
    return "<option value=\"" + escapeAttr(value) + "\"" + (selected === value ? " selected" : "") + ">" +
      escapeHtml(label) + "</option>";
  }

  function getShiftOptionsHtml(selected) {
    selected = resolveCellValue(selected);
    var shifts = getAllWorkShifts();
    var opts = buildSelectOption(CELL.OFF, "Off", selected) +
      buildSelectOption(CELL.HOL, "Holiday", selected) +
      buildSelectOption(CELL.TRN, "Training", selected) +
      buildSelectOption(CELL.SICK, "Sick", selected);
    shifts.forEach(function (s) {
      opts += buildSelectOption(s.id, shiftOptionLabel(s), selected);
    });
    return opts;
  }

  function normalizeRotaAssignments() {
    if (!state.generatedRota || !state.generatedRota.assignments) return;
    Object.keys(state.generatedRota.assignments).forEach(function (sid) {
      state.generatedRota.assignments[sid] = state.generatedRota.assignments[sid].map(resolveCellValue);
    });
  }

  function getPreferredShiftOptions(selected) {
    var shifts = getAllWorkShifts();
    var opts = "<option value=\"\">Any</option>";
    shifts.forEach(function (s) {
      opts += "<option value=\"" + escapeAttr(s.id) + "\"" + (selected === s.id ? " selected" : "") + ">" +
        escapeHtml(preferredOptionLabel(s)) + "</option>";
    });
    return opts;
  }

  function createStaffRow(data) {
    data = data || {};
    var tr = document.createElement("tr");
    tr.innerHTML =
      "<td><input type=\"text\" class=\"staff-name\" placeholder=\"Full name\" value=\"" + escapeAttr(data.name || "") + "\"></td>" +
      "<td><input type=\"text\" class=\"staff-position\" placeholder=\"e.g. Supervisor\" value=\"" + escapeAttr(data.position || "") + "\"></td>" +
      "<td><input type=\"number\" class=\"staff-contract\" min=\"0\" max=\"168\" value=\"" + (data.contractHours != null ? data.contractHours : 40) + "\"></td>" +
      "<td><select class=\"staff-preferred\">" + getPreferredShiftOptions(data.preferredShift || "") + "</select></td>" +
      "<td><input type=\"number\" class=\"staff-max-weekly\" min=\"0\" max=\"168\" value=\"" + (data.maxWeeklyHours != null ? data.maxWeeklyHours : 48) + "\"></td>" +
      "<td><input type=\"text\" class=\"staff-holiday\" placeholder=\"e.g. Fri 18/07\" value=\"" + escapeAttr(data.holiday || "") + "\"></td>" +
      "<td><input type=\"text\" class=\"staff-notes\" placeholder=\"Optional\" value=\"" + escapeAttr(data.notes || "") + "\"></td>" +
      "<td><button type=\"button\" class=\"icon-btn remove-staff\" aria-label=\"Remove employee\">" +
      "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><line x1=\"18\" y1=\"6\" x2=\"6\" y2=\"18\"/><line x1=\"6\" y1=\"6\" x2=\"18\" y2=\"18\"/></svg></button></td>";
    tr.querySelector(".remove-staff").addEventListener("click", function () {
      if (els.staffTableBody.querySelectorAll("tr").length <= 1) {
        showToast("At least one employee is required.");
        return;
      }
      tr.remove();
      scheduleAutoSave();
    });
    tr.querySelectorAll("input, select").forEach(function (el) {
      el.addEventListener("input", scheduleAutoSave);
      el.addEventListener("change", scheduleAutoSave);
    });
    return tr;
  }

  function addStaffRow(data) {
    els.staffTableBody.appendChild(createStaffRow(data));
  }

  function syncStaffRowsToCount() {
    var target = Math.max(1, parseInt(els.staffCount.value, 10) || 1);
    var rows = els.staffTableBody.querySelectorAll("tr");
    while (rows.length < target) {
      addStaffRow();
      rows = els.staffTableBody.querySelectorAll("tr");
    }
  }

  function collectStaff() {
    var staff = [];
    els.staffTableBody.querySelectorAll("tr").forEach(function (tr, i) {
      staff.push({
        id: "staff_" + i,
        name: tr.querySelector(".staff-name").value.trim(),
        position: tr.querySelector(".staff-position").value.trim(),
        contractHours: parseFloat(tr.querySelector(".staff-contract").value) || 0,
        preferredShift: tr.querySelector(".staff-preferred").value,
        maxWeeklyHours: parseFloat(tr.querySelector(".staff-max-weekly").value) || 48,
        holiday: tr.querySelector(".staff-holiday").value.trim(),
        notes: tr.querySelector(".staff-notes").value.trim(),
        isExperienced: /supervisor|manager|senior|lead|head/i.test(tr.querySelector(".staff-position").value),
        isNewStarter: /trainee|new starter|junior|apprentice|starter/i.test(tr.querySelector(".staff-notes").value + " " + tr.querySelector(".staff-position").value)
      });
    });
    return staff.filter(function (s) { return s.name; });
  }

  function getRules() {
    return {
      maxConsecutive: els.ruleConsecutive.checked ? parseInt(els.maxConsecutiveDays.value, 10) || 5 : 99,
      minRestHours: els.ruleMinRest.checked ? parseFloat(els.minRestHours.value) || 11 : 0,
      weekendRotation: els.ruleWeekendRotation.checked,
      noDouble: els.ruleNoDouble.checked,
      respectContract: els.ruleContractHours.checked,
      balanceNights: els.ruleBalanceNights.checked
    };
  }

  function parseAiHints(text) {
    var t = (text || "").toLowerCase();
    return {
      experiencedWeekendNights: /experienced|senior|supervisor|manager/.test(t) && /(friday|saturday|weekend).*(night|pm)|night.*(friday|saturday|weekend)/.test(t),
      limitNewStarters: /new starter|trainee|two new|avoid.*new/.test(t),
      supervisorMorning: /supervisor.*(morning|am|every morning)|one supervisor.*morning|morning.*supervisor/.test(t)
    };
  }

  function parseHolidayDates(holidayStr, periodDays) {
    if (!holidayStr) return [];
    var dates = [];
    var parts = holidayStr.split(/[,;]+/);
    parts.forEach(function (part) {
      part = part.trim();
      if (!part) return;
      var iso = part.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (iso) {
        dates.push(formatDateISO(new Date(+iso[1], +iso[2] - 1, +iso[3])));
        return;
      }
      var dmy = part.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
      if (dmy) {
        var day = +dmy[1];
        var month = +dmy[2];
        var year = dmy[3] ? (+dmy[3] < 100 ? 2000 + +dmy[3] : +dmy[3]) : periodDays[0].date.getFullYear();
        dates.push(formatDateISO(new Date(year, month - 1, day)));
      }
      periodDays.forEach(function (pd) {
        var label = dayLabel(pd.date).toLowerCase();
        if (part.toLowerCase().indexOf(label.split(" ")[0].toLowerCase()) >= 0 &&
            part.indexOf(String(pd.date.getDate())) >= 0) {
          dates.push(pd.iso);
        }
      });
    });
    return dates;
  }

  function buildPeriodDays() {
    var start = parseDate(els.periodStart.value) || getMonday(new Date());
    var days = [];
    var count = els.periodType.value === "month" ? 28 : 7;
    if (els.periodType.value === "month") {
      var y = start.getFullYear();
      var m = start.getMonth();
      count = new Date(y, m + 1, 0).getDate();
      start = new Date(y, m, 1);
    } else {
      start = getMonday(start);
    }
    for (var i = 0; i < count; i++) {
      var d = addDays(start, i);
      days.push({ iso: formatDateISO(d), date: d, label: dayLabel(d), weekend: isWeekend(d) });
    }
    return days;
  }

  function shiftById(id) {
    return getFullShiftCatalog().find(function (s) { return s.id === id; }) || null;
  }

  function getShiftEndDateTime(dayDate, shift) {
    if (!shift) return null;
    var end = new Date(dayDate.getTime());
    var endMin = timeToMinutes(shift.end);
    var startMin = timeToMinutes(shift.start);
    end.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);
    if (endMin <= startMin) end = addDays(end, 1);
    return end;
  }

  function getShiftStartDateTime(dayDate, shift) {
    if (!shift) return null;
    var start = new Date(dayDate.getTime());
    var startMin = timeToMinutes(shift.start);
    start.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
    return start;
  }

  function countConsecutiveBefore(staffState, dayIdx) {
    var count = 0;
    for (var i = dayIdx - 1; i >= 0; i--) {
      if (staffState.assignments[i] && isWorkingShift(staffState.assignments[i])) count++;
      else break;
    }
    return count;
  }

  function canAssign(staffState, dayIdx, shift, rules, hints) {
    var day = state.days[dayIdx];
    if (staffState.holidayDates.indexOf(day.iso) >= 0) return false;
    if (rules.noDouble && isWorkingShift(staffState.assignments[dayIdx])) return false;

    if (countConsecutiveBefore(staffState, dayIdx) >= rules.maxConsecutive) return false;

    if (staffState.lastShiftEnd && rules.minRestHours > 0) {
      var nextStart = getShiftStartDateTime(day.date, shift);
      var restHrs = (nextStart - staffState.lastShiftEnd) / 3600000;
      if (restHrs < rules.minRestHours) return false;
    }

    var weekStart = Math.floor(dayIdx / 7) * 7;
    var weekHours = 0;
    for (var w = weekStart; w < Math.min(weekStart + 7, state.days.length); w++) {
      var a = staffState.assignments[w];
      if (isWorkingShift(a)) {
        var sh = shiftById(a);
        if (sh) weekHours += sh.hours;
      }
    }
    weekHours += shift.hours;
    if (weekHours > staffState.maxWeeklyHours) return false;

    if (rules.respectContract) {
      var periodWeeks = Math.max(1, state.days.length / 7);
      var allowed = staffState.contractHours * periodWeeks;
      if (staffState.totalHours + shift.hours > allowed + 0.01) return false;
    }

    return true;
  }

  function scoreCandidate(staff, staffState, dayIdx, shift, rules, hints) {
    var score = 100;
    var day = state.days[dayIdx];

    if (staff.preferredShift && staff.preferredShift === shift.id) score += 30;
    if (staff.preferredShift && staff.preferredShift !== shift.id) score -= 10;

    if (rules.balanceNights && shift.isNight) {
      score -= staffState.nightCount * 8;
    }

    if (rules.weekendRotation && day.weekend) {
      score -= staffState.weekendCount * 12;
    }

    if (hints.experiencedWeekendNights && day.weekend && shift.isNight && staff.isExperienced) score += 40;
    if (hints.supervisorMorning && (shift.id === "AM" || shift.name.toLowerCase().indexOf("morning") >= 0) && /supervisor|manager/i.test(staff.position)) score += 35;

    var contractTarget = staff.contractHours * (state.days.length / 7);
    var deficit = contractTarget - staffState.totalHours;
    if (deficit > 0) score += Math.min(deficit, 20);

    score -= staffState.totalHours * 0.5;
    return score;
  }

  function generateRota() {
    state.days = buildPeriodDays();
    ensureCoverageStructure();
    var staffList = collectStaff();
    var rules = getRules();
    var hints = parseAiHints(els.aiInstructions.value);

    staffList.forEach(function (s) {
      s.holidayDates = parseHolidayDates(s.holiday, state.days);
    });

    var assignments = {};
    staffList.forEach(function (s) {
      assignments[s.id] = state.days.map(function () { return CELL.OFF; });
    });

    var staffStates = {};
    staffList.forEach(function (s) {
      staffStates[s.id] = {
        contractHours: s.contractHours,
        maxWeeklyHours: s.maxWeeklyHours,
        holidayDates: s.holidayDates,
        assignments: assignments[s.id],
        totalHours: 0,
        nightCount: 0,
        weekendCount: 0,
        consecutive: 0,
        lastWorkedDayIdx: -2,
        lastShiftEnd: null
      };
    });

    if (hasAnyCoverageRequirements()) {
      state.days.forEach(function (day, dayIdx) {
        getRequiredSlotsForDay(dayIdx).forEach(function (slot) {
          var assignedIds = [];
          for (var n = 0; n < slot.count; n++) {
            var picked = pickStaffForShift(staffList, staffStates, dayIdx, slot.shift, rules, hints, assignedIds);
            if (!picked) break;
            assignedIds.push(picked.id);
            applyStaffAssignment(staffStates, picked.id, dayIdx, slot.shift, day);
          }
        });

        staffList.forEach(function (s) {
          var ss = staffStates[s.id];
          if (ss.holidayDates.indexOf(day.iso) >= 0 && isDayOff(ss.assignments[dayIdx])) {
            ss.assignments[dayIdx] = CELL.HOL;
          }
        });
      });
    } else {
      generateFairRota(staffList, staffStates, rules, hints);
      state.days.forEach(function (day, dayIdx) {
        staffList.forEach(function (s) {
          var ss = staffStates[s.id];
          if (ss.holidayDates.indexOf(day.iso) >= 0 && isDayOff(ss.assignments[dayIdx])) {
            ss.assignments[dayIdx] = CELL.HOL;
          }
        });
      });
    }

    state.generatedRota = {
      staff: staffList,
      assignments: assignments,
      generatedAt: new Date().toISOString()
    };
    return state.generatedRota;
  }

  function computeStats() {
    if (!state.generatedRota) return null;
    var stats = {};
    state.generatedRota.staff.forEach(function (s) {
      var rows = state.generatedRota.assignments[s.id];
      var weeklyHours = 0;
      var nightShifts = 0;
      var daysOff = 0;
      var totalHours = 0;
      rows.forEach(function (a, i) {
        if (isDayOff(a)) {
          daysOff++;
          return;
        }
        if (!isWorkingShift(a)) return;
        var sh = shiftById(a);
        if (sh) {
          totalHours += sh.hours;
          if (sh.isNight) nightShifts++;
        }
      });
      for (var w = 0; w < state.days.length; w += 7) {
        var wh = 0;
        for (var d = w; d < Math.min(w + 7, state.days.length); d++) {
          var a = rows[d];
          if (isWorkingShift(a)) {
            var sh = shiftById(a);
            if (sh) wh += sh.hours;
          }
        }
        weeklyHours = Math.max(weeklyHours, wh);
      }
      var contractForPeriod = s.contractHours * (state.days.length / 7);
      var overtime = Math.max(0, totalHours - contractForPeriod);
      stats[s.id] = { weeklyHours: weeklyHours, nightShifts: nightShifts, daysOff: daysOff, totalHours: totalHours, overtime: overtime };
    });
    return stats;
  }

  function computeWarnings() {
    var warnings = [];
    if (!state.generatedRota) return warnings;
    var rules = getRules();
    var stats = computeStats();

    warnings = warnings.concat(computeCoverageWarnings());

    state.generatedRota.staff.forEach(function (s) {
      var rows = state.generatedRota.assignments[s.id];
      var st = stats[s.id];
      if (st.overtime > 0) {
        warnings.push({ type: "overtime", text: s.name + ": " + st.overtime.toFixed(1) + "h overtime for this period" });
      }
      if (st.weeklyHours > s.maxWeeklyHours) {
        warnings.push({ type: "overtime", text: s.name + ": exceeds max weekly hours (" + st.weeklyHours + "h)" });
      }

      var consecutive = 0;
      for (var i = 0; i < rows.length; i++) {
        if (isWorkingShift(rows[i])) {
          consecutive++;
          if (consecutive > rules.maxConsecutive) {
            warnings.push({ type: "consecutive", text: s.name + ": more than " + rules.maxConsecutive + " consecutive working days" });
            break;
          }
        } else {
          consecutive = 0;
        }
      }

      for (var j = 1; j < rows.length; j++) {
        if (!isWorkingShift(rows[j]) || !isWorkingShift(rows[j - 1])) continue;
        var prevShift = shiftById(rows[j - 1]);
        var currShift = shiftById(rows[j]);
        if (!prevShift || !currShift) continue;
        var prevEnd = getShiftEndDateTime(state.days[j - 1].date, prevShift);
        var currStart = getShiftStartDateTime(state.days[j].date, currShift);
        var rest = (currStart - prevEnd) / 3600000;
        if (rules.minRestHours > 0 && rest < rules.minRestHours) {
          warnings.push({ type: "rest", text: s.name + ": only " + rest.toFixed(1) + "h rest between " + state.days[j - 1].label + " and " + state.days[j].label });
        }
      }
    });

    return warnings;
  }

  function renderRota() {
    if (!state.generatedRota) return;
    normalizeRotaAssignments();

    var hotel = els.hotelName.value.trim();
    var dept = els.department.value;
    var periodLabel = els.periodType.value === "month" ? "Monthly" : "Weekly";

    els.rotaPrintHeader.innerHTML = "<h1>" + escapeHtml(hotel) + " — " + escapeHtml(dept) + " Rota</h1>" +
      "<p>" + periodLabel + " schedule from " + state.days[0].label + " to " + state.days[state.days.length - 1].label + "</p>";

    els.rotaMeta.innerHTML =
      "<div class=\"rota-meta-item\"><div class=\"rota-meta-label\">Hotel</div><div class=\"rota-meta-value\">" + escapeHtml(hotel) + "</div></div>" +
      "<div class=\"rota-meta-item\"><div class=\"rota-meta-label\">Department</div><div class=\"rota-meta-value\">" + escapeHtml(dept) + "</div></div>" +
      "<div class=\"rota-meta-item\"><div class=\"rota-meta-label\">Period</div><div class=\"rota-meta-value\">" + periodLabel + " (" + state.days.length + " days)</div></div>" +
      "<div class=\"rota-meta-item\"><div class=\"rota-meta-label\">Shift Pattern</div><div class=\"rota-meta-value\">" + escapeHtml(state.shiftPattern === "custom" ? "Custom" : state.shiftPattern === "12hour" ? "12 Hour" : "8 Hour") + "</div></div>";

    var headHtml = "<tr><th class=\"staff-col\">Staff</th>";
    state.days.forEach(function (d) {
      headHtml += "<th class=\"" + (d.weekend ? "weekend" : "") + "\">" + escapeHtml(d.label) + "</th>";
    });
    headHtml += "<th>Total Hrs</th></tr>";
    els.rotaTableHead.innerHTML = headHtml;

    var stats = computeStats();
    var warnings = computeWarnings();
    var warnCells = {};

    warnings.forEach(function (w) {
      if (w.type === "consecutive" || w.type === "rest") {
        var name = w.text.split(":")[0];
        state.generatedRota.staff.forEach(function (s) {
          if (s.name === name) warnCells[s.id] = true;
        });
      }
    });

    var bodyHtml = "";
    state.generatedRota.staff.forEach(function (s) {
      var rows = state.generatedRota.assignments[s.id];
      bodyHtml += "<tr data-staff-id=\"" + escapeAttr(s.id) + "\"><td class=\"staff-col\">" +
        escapeHtml(s.name) + "<br><small style=\"color:var(--gray-400);font-weight:500\">" + escapeHtml(s.position) + "</small></td>";
      rows.forEach(function (a, i) {
        a = resolveCellValue(a);
        var cls = state.days[i].weekend ? "weekend" : "";
        cls += " day-cell";
        var sh = isWorkingShift(a) ? shiftById(a) : null;
        if (a === CELL.OFF) cls += " cell-off";
        else if (a === CELL.HOL) cls += " cell-holiday";
        else if (a === CELL.TRN) cls += " cell-training";
        else if (a === CELL.SICK) cls += " cell-sick";
        else if (sh && sh.isNight) cls += " cell-night";
        if (warnCells[s.id]) cls += " cell-warning";
        var parts = getCellDisplayParts(a);
        bodyHtml += "<td class=\"" + cls + "\"><div class=\"rota-cell-wrap\" title=\"" + escapeAttr(parts.label) + "\">" +
          "<div class=\"rota-cell-display\">" + buildCellDisplayHtml(parts) + "</div>" +
          "<select class=\"rota-cell-select\" data-staff=\"" + escapeAttr(s.id) + "\" data-day=\"" + i + "\" aria-label=\"Shift for " + escapeAttr(s.name) + " on " + escapeAttr(state.days[i].label) + "\">" +
          getShiftOptionsHtml(a) + "</select></div></td>";
      });
      bodyHtml += "<td><strong>" + stats[s.id].totalHours.toFixed(1) + "</strong></td></tr>";
    });
    els.rotaTableBody.innerHTML = bodyHtml;

    els.rotaTableBody.querySelectorAll(".rota-cell-select").forEach(function (sel) {
      sel.addEventListener("change", function () {
        var sid = sel.dataset.staff;
        var dayIdx = +sel.dataset.day;
        var normalized = resolveCellValue(sel.value);
        state.generatedRota.assignments[sid][dayIdx] = normalized;
        sel.value = normalized;
        applyDayCellState(sel.closest("td"), normalized, state.days[dayIdx].weekend);
        updateCellDisplay(sel.closest("td"), normalized);
        var tr = sel.closest("tr");
        var stats = computeStats();
        var totalCell = tr.querySelector("td:last-child strong");
        if (totalCell && stats[sid]) totalCell.textContent = stats[sid].totalHours.toFixed(1);
        renderTotalsAndWarnings();
        scheduleAutoSave();
      });
    });

    renderTotalsAndWarnings();
    els.outputSection.classList.add("visible");
    els.exportPdfBtn.disabled = false;
    els.printBtn.disabled = false;
    els.generateNewBtn.disabled = false;
  }

  function updateCellDisplay(td, value) {
    var display = td.querySelector(".rota-cell-display");
    if (!display) return;
    var parts = getCellDisplayParts(value);
    display.innerHTML = buildCellDisplayHtml(parts);
    var wrap = td.querySelector(".rota-cell-wrap");
    if (wrap) wrap.title = parts.label;
  }

  function applyDayCellState(td, value, isWeekend) {
    value = resolveCellValue(value);
    var cls = (isWeekend ? "weekend " : "") + "day-cell";
    if (value === CELL.OFF) cls += " cell-off";
    else if (value === CELL.HOL) cls += " cell-holiday";
    else if (value === CELL.TRN) cls += " cell-training";
    else if (value === CELL.SICK) cls += " cell-sick";
    else {
      var sh = shiftById(value);
      if (sh && sh.isNight) cls += " cell-night";
    }
    td.className = cls;
    updateCellDisplay(td, value);
  }

  function renderTotalsAndWarnings() {
    var stats = computeStats();
    var html = "";
    state.generatedRota.staff.forEach(function (s) {
      var st = stats[s.id];
      html += "<div class=\"total-card\"><h4>" + escapeHtml(s.name) + "</h4>" +
        "<div class=\"total-row\"><span>Weekly Hours (max)</span><strong>" + st.weeklyHours.toFixed(1) + "h</strong></div>" +
        "<div class=\"total-row\"><span>Night Shifts</span><strong>" + st.nightShifts + "</strong></div>" +
        "<div class=\"total-row\"><span>Days Off</span><strong>" + st.daysOff + "</strong></div>" +
        "<div class=\"total-row" + (st.overtime > 0 ? " overtime" : "") + "\"><span>Overtime</span><strong>" + st.overtime.toFixed(1) + "h</strong></div></div>";
    });
    els.totalsGrid.innerHTML = html;

    var warnings = computeWarnings();
    if (!warnings.length) {
      els.warningsPanel.className = "warnings-panel no-warnings";
      els.warningsList.innerHTML = "<li>No scheduling warnings — rota looks compliant.</li>";
    } else {
      els.warningsPanel.className = "warnings-panel";
      els.warningsList.innerHTML = warnings.map(function (w) {
        return "<li>" + escapeHtml(w.text) + "</li>";
      }).join("");
    }
  }

  function clearValidation() {
    els.hotelName.classList.remove("is-invalid");
    els.department.classList.remove("is-invalid");
  }

  function validate() {
    clearValidation();
    var missing = [];
    if (!els.hotelName.value.trim()) { els.hotelName.classList.add("is-invalid"); missing.push("Hotel Name"); }
    if (!els.department.value) { els.department.classList.add("is-invalid"); missing.push("Department"); }
    var staff = collectStaff();
    if (!staff.length) missing.push("At least one employee");
    var shifts = getSchedulingShifts();
    if (!shifts.length && state.shiftPattern === "custom") missing.push("At least one custom shift");
    if (missing.length) {
      showToast("Please complete: " + missing.join(", "));
      return false;
    }
    return true;
  }

  function handleGenerate() {
    if (isGenerating) return;
    if (!validate()) return;
    isGenerating = true;
    els.generateBtn.classList.add("loading");
    els.generateBtn.disabled = true;
    els.generateBtnText.textContent = "Generating…";

    setTimeout(function () {
      generateRota();
      normalizeRotaAssignments();
      renderRota();
      isGenerating = false;
      els.generateBtn.classList.remove("loading");
      els.generateBtn.disabled = false;
      els.generateBtnText.textContent = "Generate Rota";
      scheduleAutoSave();
      els.outputSection.scrollIntoView({ behavior: "smooth", block: "start" });
      showToast("Rota generated successfully.");
    }, 600);
  }

  function buildDraftPayload() {
    var staffRows = [];
    els.staffTableBody.querySelectorAll("tr").forEach(function (tr) {
      staffRows.push({
        name: tr.querySelector(".staff-name").value,
        position: tr.querySelector(".staff-position").value,
        contractHours: tr.querySelector(".staff-contract").value,
        preferredShift: tr.querySelector(".staff-preferred").value,
        maxWeeklyHours: tr.querySelector(".staff-max-weekly").value,
        holiday: tr.querySelector(".staff-holiday").value,
        notes: tr.querySelector(".staff-notes").value
      });
    });
    return {
      version: 2,
      hotelName: els.hotelName.value,
      department: els.department.value,
      periodType: els.periodType.value,
      periodStart: els.periodStart.value,
      staffCount: els.staffCount.value,
      shiftPattern: state.shiftPattern,
      customShifts: state.customShifts,
      customShiftCounter: state.customShiftCounter,
      activeShiftIds: state.activeShiftIds,
      ui: state.ui,
      staffRows: staffRows,
      rules: {
        consecutive: els.ruleConsecutive.checked,
        maxConsecutiveDays: els.maxConsecutiveDays.value,
        minRest: els.ruleMinRest.checked,
        minRestHours: els.minRestHours.value,
        weekendRotation: els.ruleWeekendRotation.checked,
        noDouble: els.ruleNoDouble.checked,
        contractHours: els.ruleContractHours.checked,
        balanceNights: els.ruleBalanceNights.checked
      },
      aiInstructions: els.aiInstructions.value,
      coverage: state.coverage,
      generatedRota: state.generatedRota,
      days: state.days.map(function (d) { return { iso: d.iso, label: d.label, weekend: d.weekend }; }),
      savedAt: new Date().toISOString()
    };
  }

  function writeDraft(manual) {
    var scope = draftStorageScope();
    if (!scope || !window.HFTenantStorage) {
      if (manual) showToast("Sign in to save rota drafts to this account.");
      return false;
    }
    try {
      window.HFTenantStorage.setRaw(DRAFT_KEY, JSON.stringify(buildDraftPayload()), scope);
      setSaveStatus("saved", "Saved");
      if (manual) showToast("Draft saved locally.");
      return true;
    } catch (e) {
      if (manual) showToast("Could not save draft.");
      return false;
    }
  }

  function scheduleAutoSave() {
    if (isRestoring) return;
    setSaveStatus("saving", "Saving…");
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(function () { writeDraft(false); }, AUTO_SAVE_DELAY);
  }

  function readDraft() {
    var scope = draftStorageScope();
    if (!scope || !window.HFTenantStorage) return null;
    try {
      var raw = window.HFTenantStorage.getRaw(DRAFT_KEY, scope);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function restoreDraft() {
    var draft = readDraft();
    if (!draft) return;
    isRestoring = true;
    els.hotelName.value = draft.hotelName || "";
    els.department.value = draft.department || "";
    els.periodType.value = draft.periodType || "week";
    els.periodStart.value = draft.periodStart || formatDateISO(getMonday(new Date()));
    els.staffCount.value = draft.staffCount || 4;
    state.shiftPattern = draft.shiftPattern || "8hour";
    state.customShifts = migrateCustomShifts(draft.customShifts || []);
    state.customShiftCounter = draft.customShiftCounter || state.customShiftCounter;
    state.activeShiftIds = draft.activeShiftIds || CORE_SHIFT_IDS.slice();
    state.ui = Object.assign({ addShiftsOpen: false, dailyCoverageOpen: false, editingShiftId: null }, draft.ui || {});
    document.querySelectorAll(".shift-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.pattern === state.shiftPattern);
    });

    if (draft.rules) {
      els.ruleConsecutive.checked = draft.rules.consecutive !== false;
      els.maxConsecutiveDays.value = draft.rules.maxConsecutiveDays || 5;
      els.ruleMinRest.checked = draft.rules.minRest !== false;
      els.minRestHours.value = draft.rules.minRestHours || 11;
      els.ruleWeekendRotation.checked = draft.rules.weekendRotation !== false;
      els.ruleNoDouble.checked = draft.rules.noDouble !== false;
      els.ruleContractHours.checked = draft.rules.contractHours !== false;
      els.ruleBalanceNights.checked = draft.rules.balanceNights !== false;
    }
    els.aiInstructions.value = draft.aiInstructions || "";

    if (draft.coverage) {
      state.coverage.mode = draft.coverage.mode || "same";
      state.coverage.same = draft.coverage.same || {};
      state.coverage.daily = draft.coverage.daily || [];
      state.coverage.activeDayIndex = draft.coverage.activeDayIndex || 0;
    } else {
      state.coverage = { mode: "same", same: {}, daily: [], activeDayIndex: 0 };
    }
    if (state.coverage.mode === "daily") state.ui.dailyCoverageOpen = true;

    if (draft.generatedRota && draft.days) {
      state.generatedRota = draft.generatedRota;
      state.days = draft.days.map(function (d) {
        return { iso: d.iso, label: d.label, weekend: d.weekend, date: parseDate(d.iso) };
      });
    }
    ensureActiveShiftsFromSavedData();
    renderManageShifts();
    renderShiftPatternDetail();
    ensureCoverageStructure();
    renderCoverageUi();

    els.staffTableBody.innerHTML = "";
    (draft.staffRows && draft.staffRows.length ? draft.staffRows : [{}]).forEach(function (row) {
      addStaffRow(row);
    });

    if (draft.generatedRota && draft.days) {
      normalizeRotaAssignments();
      renderRota();
    }

    setSaveStatus("restored", "Draft restored");
    isRestoring = false;
  }

  function clearDraft() {
    if (!confirm("Clear saved draft and reset the form?")) return;
    clearTimeout(autoSaveTimer);
    var scope = draftStorageScope();
    if (scope && window.HFTenantStorage) {
      window.HFTenantStorage.remove(DRAFT_KEY, scope);
    }
    els.hotelName.value = "";
    els.department.value = "";
    els.periodType.value = "week";
    els.periodStart.value = formatDateISO(getMonday(new Date()));
    els.staffCount.value = 4;
    state.shiftPattern = "8hour";
    state.customShifts = [];
    state.customShiftCounter = 0;
    state.activeShiftIds = CORE_SHIFT_IDS.slice();
    state.ui = { addShiftsOpen: false, dailyCoverageOpen: false, editingShiftId: null };
    state.generatedRota = null;
    state.days = [];
    document.querySelectorAll(".shift-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.pattern === "8hour");
    });
    renderManageShifts();
    renderShiftPatternDetail();
    els.staffTableBody.innerHTML = "";
    addStaffRow({ name: "", contractHours: 40, maxWeeklyHours: 48 });
    els.aiInstructions.value = "";
    state.coverage = { mode: "same", same: buildEmptyDayCoverage(), daily: [], activeDayIndex: 0 };
    renderCoverageUi();
    els.outputSection.classList.remove("visible");
    els.exportPdfBtn.disabled = true;
    els.printBtn.disabled = true;
    els.generateNewBtn.disabled = true;
    setSaveStatus("", "");
    showToast("Draft cleared.");
  }

  function generateNew() {
    if (state.generatedRota && !confirm("Generate a new rota? Current schedule edits will be replaced.")) return;
    state.generatedRota = null;
    els.outputSection.classList.remove("visible");
    els.exportPdfBtn.disabled = true;
    els.printBtn.disabled = true;
    els.generateNewBtn.disabled = true;
    handleGenerate();
  }

  function exportPdf() {
    if (!state.generatedRota || typeof html2pdf === "undefined") {
      showToast("Generate a rota before exporting.");
      return;
    }
    els.exportPdfBtn.disabled = true;
    var node = els.rotaCard.cloneNode(true);
    node.querySelector(".warnings-panel").remove();
    node.querySelector(".totals-grid").remove();
    node.style.width = "190mm";
    node.style.background = "#fff";
    var cells = node.querySelectorAll(".rota-cell-wrap");
    cells.forEach(function (wrap) {
      var sel = wrap.querySelector("select");
      var display = wrap.querySelector(".rota-cell-display");
      if (!display) return;
      var val = sel ? sel.value : CELL.OFF;
      var parts = getCellDisplayParts(val);
      display.innerHTML = buildCellDisplayHtml(parts);
      if (sel) sel.remove();
    });
    var wrapper = document.createElement("div");
    wrapper.style.cssText = "position:fixed;left:-9999px;top:0;width:190mm;background:#fff";
    wrapper.appendChild(node);
    document.body.appendChild(wrapper);
    var hotel = (els.hotelName.value.trim() || "Hotel").replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
    html2pdf().set({
      margin: [8, 8, 8, 8],
      filename: hotel + "-Rota.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" }
    }).from(node).save().then(function () {
      document.body.removeChild(wrapper);
      els.exportPdfBtn.disabled = false;
      showToast("PDF downloaded.");
    }).catch(function () {
      document.body.removeChild(wrapper);
      els.exportPdfBtn.disabled = false;
      showToast("PDF export failed.");
    });
  }

  function handlePrint() {
    if (!state.generatedRota) {
      showToast("Generate a rota before printing.");
      return;
    }
    window.print();
  }

  function bindEvents() {
    document.querySelectorAll(".shift-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".shift-btn").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        state.shiftPattern = btn.dataset.pattern;
        renderShiftPatternDetail();
        scheduleAutoSave();
      });
    });

    if (els.addCustomShiftBtn) {
      els.addCustomShiftBtn.addEventListener("click", addCustomShift);
    }

    if (els.toggleAddShiftsBtn) {
      els.toggleAddShiftsBtn.addEventListener("click", function () {
        state.ui.addShiftsOpen = !state.ui.addShiftsOpen;
        renderManageShifts();
        scheduleAutoSave();
      });
    }

    if (els.toggleDailyCoverage) {
      els.toggleDailyCoverage.addEventListener("click", function () {
        toggleDailyCoverage();
      });
    }

    els.periodType.addEventListener("change", function () {
      ensureCoverageStructure();
      renderCoverageUi();
      scheduleAutoSave();
    });
    els.periodStart.addEventListener("change", function () {
      ensureCoverageStructure();
      renderCoverageUi();
      scheduleAutoSave();
    });

    els.addStaffBtn.addEventListener("click", function () {
      addStaffRow();
      scheduleAutoSave();
    });

    els.staffCount.addEventListener("change", function () {
      syncStaffRowsToCount();
      scheduleAutoSave();
    });

    [
      els.hotelName, els.department, els.periodType, els.periodStart,
      els.ruleConsecutive, els.maxConsecutiveDays, els.ruleMinRest, els.minRestHours,
      els.ruleWeekendRotation, els.ruleNoDouble, els.ruleContractHours, els.ruleBalanceNights,
      els.aiInstructions
    ].forEach(function (el) {
      el.addEventListener("input", scheduleAutoSave);
      el.addEventListener("change", scheduleAutoSave);
    });

    els.generateBtn.addEventListener("click", handleGenerate);
    els.saveDraftBtn.addEventListener("click", function () {
      clearTimeout(autoSaveTimer);
      writeDraft(true);
    });
    els.clearDraftBtn.addEventListener("click", clearDraft);
    els.exportPdfBtn.addEventListener("click", exportPdf);
    els.printBtn.addEventListener("click", handlePrint);
    els.generateNewBtn.addEventListener("click", generateNew);
  }

  function init() {
    initEls();
    els.periodStart.value = formatDateISO(getMonday(new Date()));
    renderManageShifts();
    renderShiftPatternDetail();
    state.coverage.same = buildEmptyDayCoverage();
    state.activeShiftIds = CORE_SHIFT_IDS.slice();
    state.ui = { addShiftsOpen: false, dailyCoverageOpen: false, editingShiftId: null };
    renderCoverageUi();
    if (!els.staffTableBody.querySelector("tr")) {
      syncStaffRowsToCount();
      var samples = [
        { name: "Sarah Mitchell", position: "Supervisor", contractHours: 40, preferredShift: "AM", maxWeeklyHours: 48, notes: "" },
        { name: "James Cooper", position: "Receptionist", contractHours: 40, preferredShift: "PM", maxWeeklyHours: 48, notes: "" },
        { name: "Emma Walsh", position: "Night Porter", contractHours: 40, preferredShift: "Night", maxWeeklyHours: 48, notes: "" },
        { name: "Tom Hughes", position: "Trainee", contractHours: 24, preferredShift: "", maxWeeklyHours: 30, notes: "New starter" }
      ];
      var rows = els.staffTableBody.querySelectorAll("tr");
      samples.forEach(function (s, i) {
        if (rows[i]) {
          var tr = rows[i];
          tr.querySelector(".staff-name").value = s.name;
          tr.querySelector(".staff-position").value = s.position;
          tr.querySelector(".staff-contract").value = s.contractHours;
          tr.querySelector(".staff-preferred").innerHTML = getPreferredShiftOptions(s.preferredShift);
          tr.querySelector(".staff-preferred").value = s.preferredShift;
          tr.querySelector(".staff-max-weekly").value = s.maxWeeklyHours;
          tr.querySelector(".staff-notes").value = s.notes;
        }
      });
    }
    bindEvents();
    restoreDraft();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
