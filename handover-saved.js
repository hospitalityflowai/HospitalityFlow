/**
 * Hospitality Flow — Saved Handovers (v1.2)
 * Local storage with Supabase cloud sync via HFHandoverStore.
 */
(function (global) {
  "use strict";

  var gridEl = null;
  var emptyEl = null;
  var countEl = null;
  var searchEl = null;
  var onOpen = null;
  var onEdit = null;
  var onPrint = null;
  var onExportPdf = null;
  var onSaveRequest = null;
  var onSaveComplete = null;
  var showToast = null;
  var onConfirmDelete = null;
  var onConfirmClearAll = null;
  var saveInProgress = false;
  var archiveSearchTerm = "";

  function useCloudStore() {
    return !!(global.HFHandoverStore && global.HFHandoverStore.getSavedHandovers);
  }

  function loadAll() {
    if (useCloudStore()) {
      return global.HFHandoverStore.getSavedHandovers();
    }
    return [];
  }

  function saveAll(list) {
    if (useCloudStore()) {
      global.HFHandoverStore.saveAllLocal(list);
    }
  }

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function findHandover(id) {
    return loadAll().find(function (entry) {
      return entry.id === id || entry.cloudId === id;
    });
  }

  function getHandoverDateKey(item) {
    if (!item || typeof item !== "object") return "unknown";
    if (item.date && /^\d{4}-\d{2}-\d{2}$/.test(item.date)) return item.date;
    if (item.timestamp) {
      var stamp = new Date(item.timestamp);
      if (!isNaN(stamp.getTime())) {
        var mm = String(stamp.getMonth() + 1).padStart(2, "0");
        var dd = String(stamp.getDate()).padStart(2, "0");
        return stamp.getFullYear() + "-" + mm + "-" + dd;
      }
    }
    return "unknown";
  }

  function getHandoverDateObject(item) {
    var key = getHandoverDateKey(item);
    if (key === "unknown") return new Date(0);
    var parts = key.split("-");
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  }

  function formatMonthHeading(dateObj) {
    return dateObj.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  }

  function formatDayHeading(dateKey) {
    var parts = dateKey.split("-");
    var d = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  }

  function formatShiftLabel(shift) {
    if (!shift) return "Shift";
    var value = String(shift);
    if (value.length <= 5) return value;
    return value.replace(/shift/gi, "").trim() || value;
  }

  function formatGeneratedClock(isoTimestamp) {
    if (!isoTimestamp) return "unknown time";
    var date = new Date(isoTimestamp);
    if (isNaN(date.getTime())) return "unknown time";
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  }

  function getPreviewText(item) {
    var recCount = Array.isArray(item.recommendations) ? item.recommendations.length : 0;
    if (item.aiSummary && String(item.aiSummary).trim()) {
      var summary = String(item.aiSummary).replace(/\s+/g, " ").trim();
      if (summary.length > 88) summary = summary.slice(0, 85) + "…";
      return summary;
    }
    if (recCount) {
      return recCount + " recommendation" + (recCount === 1 ? "" : "s");
    }
    return "Saved handover";
  }

  function matchesSearch(item, term) {
    if (!term) return true;
    var haystack = [
      item.preparedBy,
      item.shift,
      item.dateDisplay,
      item.date,
      item.aiSummary,
      getPreviewText(item)
    ].join(" ").toLowerCase();
    return haystack.indexOf(term) !== -1;
  }

  function groupArchive(list) {
    var months = {};

    list.forEach(function (item) {
      if (!matchesSearch(item, archiveSearchTerm)) return;

      var dateObj = getHandoverDateObject(item);
      var monthKey = dateObj.getFullYear() + "-" + String(dateObj.getMonth() + 1).padStart(2, "0");
      var dayKey = getHandoverDateKey(item);

      if (!months[monthKey]) {
        months[monthKey] = {
          key: monthKey,
          date: dateObj,
          days: {}
        };
      }
      if (!months[monthKey].days[dayKey]) {
        months[monthKey].days[dayKey] = {
          key: dayKey,
          date: getHandoverDateObject({ date: dayKey }),
          items: []
        };
      }
      months[monthKey].days[dayKey].items.push(item);
    });

    return Object.keys(months).sort(function (a, b) { return b.localeCompare(a); }).map(function (monthKey) {
      var month = months[monthKey];
      month.dayList = Object.keys(month.days).sort(function (a, b) { return b.localeCompare(a); }).map(function (dayKey) {
        var day = month.days[dayKey];
        day.items.sort(function (a, b) {
          return new Date(b.timestamp || b.updatedAt || 0) - new Date(a.timestamp || a.updatedAt || 0);
        });
        return day;
      });
      return month;
    });
  }

  function deleteHandover(id) {
    if (onConfirmDelete && !onConfirmDelete()) return;

    if (useCloudStore()) {
      global.HFHandoverStore.deleteHandover(id).then(function () {
        renderList();
        if (showToast) showToast("Handover deleted.");
      });
      return;
    }

    var list = loadAll().filter(function (item) { return item.id !== id; });
    saveAll(list);
    renderList();
    if (showToast) showToast("Handover deleted.");
  }

  function clearAllHistory() {
    var list = loadAll();
    if (!list.length) {
      if (showToast) showToast("No saved handovers to clear.");
      return;
    }
    if (onConfirmClearAll && !onConfirmClearAll()) return;

    if (useCloudStore()) {
      var deletePromises = list.map(function (item) {
        return global.HFHandoverStore.deleteHandover(item.id);
      });
      Promise.all(deletePromises).then(function () {
        saveAll([]);
        renderList();
        if (showToast) showToast("All saved handovers cleared.");
      });
      return;
    }

    saveAll([]);
    renderList();
    if (showToast) showToast("All saved handovers cleared.");
  }

  function openHandover(id) {
    var item = findHandover(id);
    if (!item) {
      if (showToast) showToast("Saved handover not found.");
      renderList();
      return;
    }
    if (onOpen) onOpen(item);
  }

  function editHandover(id) {
    var item = findHandover(id);
    if (!item) {
      if (showToast) showToast("Saved handover not found.");
      renderList();
      return;
    }
    if (onEdit) {
      onEdit(item);
    } else if (onOpen) {
      onOpen(item);
    }
  }

  function printHandover(id) {
    var item = findHandover(id);
    if (!item) {
      if (showToast) showToast("Saved handover not found.");
      renderList();
      return;
    }
    if (onPrint) onPrint(item);
  }

  function exportPdfHandover(id) {
    var item = findHandover(id);
    if (!item) {
      if (showToast) showToast("Saved handover not found.");
      renderList();
      return;
    }
    if (onExportPdf) onExportPdf(item);
  }

  function buildArchiveRow(item) {
    var row = document.createElement("article");
    row.className = "handover-archive-row";
    row.setAttribute("data-id", item.id);

    var shift = escapeHtml(formatShiftLabel(item.shift));
    var preparedBy = escapeHtml(item.preparedBy || "Not specified");
    var generated = escapeHtml(formatGeneratedClock(item.timestamp));
    var preview = escapeHtml(getPreviewText(item));

    row.innerHTML =
      '<div class="handover-archive-row-main">' +
        '<div class="handover-archive-row-title">' +
          shift + " — " + preparedBy + " — generated " + generated +
        "</div>" +
        '<div class="handover-archive-row-preview">' + preview + "</div>" +
      "</div>" +
      '<div class="handover-archive-row-actions">' +
        '<button class="btn btn-secondary handover-archive-open" type="button">Open</button>' +
        '<button class="btn btn-secondary handover-archive-edit" type="button">Edit</button>' +
        '<button class="btn btn-secondary handover-archive-pdf" type="button">Export PDF</button>' +
        '<button class="btn btn-secondary handover-archive-print" type="button">Print</button>' +
        '<button class="btn btn-secondary handover-archive-delete" type="button">Delete</button>' +
      "</div>";

    row.querySelector(".handover-archive-open").addEventListener("click", function () { openHandover(item.id); });
    row.querySelector(".handover-archive-edit").addEventListener("click", function () { editHandover(item.id); });
    row.querySelector(".handover-archive-pdf").addEventListener("click", function () { exportPdfHandover(item.id); });
    row.querySelector(".handover-archive-print").addEventListener("click", function () { printHandover(item.id); });
    row.querySelector(".handover-archive-delete").addEventListener("click", function () { deleteHandover(item.id); });

    return row;
  }

  function renderList() {
    if (!gridEl) return;

    var list = loadAll().sort(function (a, b) {
      var dateDiff = getHandoverDateObject(b) - getHandoverDateObject(a);
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.timestamp || b.updatedAt || 0) - new Date(a.timestamp || a.updatedAt || 0);
    });

    var grouped = groupArchive(list);
    var visibleCount = grouped.reduce(function (sum, month) {
      return sum + month.dayList.reduce(function (daySum, day) { return daySum + day.items.length; }, 0);
    }, 0);

    gridEl.innerHTML = "";

    if (countEl) {
      countEl.textContent = list.length
        ? list.length + " saved"
        : "";
    }

    if (emptyEl) {
      emptyEl.style.display = list.length && visibleCount === 0 ? "block" : "none";
      if (list.length && visibleCount === 0) {
        emptyEl.textContent = "No handovers match your search.";
      } else if (!list.length) {
        emptyEl.textContent = "No saved handovers yet. Generate and save a handover to keep it on this device.";
      }
    }

    if (!visibleCount) return;

    grouped.forEach(function (month, monthIndex) {
      var monthBlock = document.createElement("section");
      monthBlock.className = "handover-archive-month";

      var monthToggle = document.createElement("button");
      monthToggle.type = "button";
      monthToggle.className = "handover-archive-month-toggle is-open";
      monthToggle.setAttribute("aria-expanded", "true");
      monthToggle.innerHTML =
        '<span class="handover-archive-month-title">' + escapeHtml(formatMonthHeading(month.date)) + "</span>" +
        '<svg class="handover-archive-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';

      var monthBody = document.createElement("div");
      monthBody.className = "handover-archive-month-body is-open";

      month.dayList.forEach(function (day) {
        var dayBlock = document.createElement("div");
        dayBlock.className = "handover-archive-day";

        var dayTitle = document.createElement("div");
        dayTitle.className = "handover-archive-day-title";
        dayTitle.textContent = formatDayHeading(day.key);
        dayBlock.appendChild(dayTitle);

        day.items.forEach(function (item) {
          dayBlock.appendChild(buildArchiveRow(item));
        });

        monthBody.appendChild(dayBlock);
      });

      monthToggle.addEventListener("click", function () {
        var open = monthToggle.classList.toggle("is-open");
        monthBody.classList.toggle("is-open", open);
        monthToggle.setAttribute("aria-expanded", open ? "true" : "false");
      });

      monthBlock.appendChild(monthToggle);
      monthBlock.appendChild(monthBody);
      gridEl.appendChild(monthBlock);
    });
  }

  function saveHandover(record) {
    if (!record || !record.id) return false;

    if (useCloudStore()) {
      return false;
    }

    var list = loadAll();
    list.unshift(record);
    saveAll(list);
    renderList();
    return true;
  }

  function init(options) {
    options = options || {};
    gridEl = options.gridEl;
    emptyEl = options.emptyEl;
    countEl = options.countEl;
    searchEl = options.searchEl;
    onOpen = options.onOpen;
    onEdit = options.onEdit;
    onPrint = options.onPrint;
    onExportPdf = options.onExportPdf;
    onSaveRequest = options.onSaveRequest;
    onSaveComplete = options.onSaveComplete;
    showToast = options.showToast;
    onConfirmDelete = options.onConfirmDelete;
    onConfirmClearAll = options.onConfirmClearAll;

    if (searchEl) {
      searchEl.addEventListener("input", function () {
        archiveSearchTerm = String(searchEl.value || "").trim().toLowerCase();
        renderList();
      });
    }

    renderList();
  }

  function handleSaveClick() {
    if (!onSaveRequest || saveInProgress) return;
    var record = onSaveRequest();
    if (!record) {
      if (showToast) showToast("Generate a handover first.");
      return;
    }

    if (useCloudStore()) {
      saveInProgress = true;
      global.HFHandoverStore.saveHandover(record).then(function (result) {
        try {
          renderList();
        } catch (renderErr) {
          console.error("[HandoverSaved] renderList failed:", renderErr);
        }
        if (onSaveComplete) {
          onSaveComplete(result);
        }
        if (showToast) showToast(result.message || "Handover saved.");
        if (!result.cloud && result.error) {
          console.error("[HandoverSaved] cloud save failed:", {
            message: result.error.message || String(result.error),
            code: result.error.code || null,
            details: result.error.details || null,
            hint: result.error.hint || null,
            error: result.error
          });
        }
      }).catch(function (err) {
        if (showToast) {
          showToast("Saved locally — not yet synced");
        }
        console.error("[HandoverSaved] saveHandover rejected:", {
          message: err && err.message ? err.message : String(err),
          code: err && err.code ? err.code : null,
          details: err && err.details ? err.details : null,
          hint: err && err.hint ? err.hint : null,
          error: err
        });
        try {
          renderList();
        } catch (renderErr) {
          console.error("[HandoverSaved] renderList failed:", renderErr);
        }
      }).finally(function () {
        saveInProgress = false;
      });
      return;
    }

    if (saveHandover(record) && showToast) {
      showToast("Saved locally — not yet synced");
    }
  }

  global.HandoverSaved = {
    init: init,
    renderList: renderList,
    handleSaveClick: handleSaveClick,
    loadAll: loadAll,
    saveAll: saveAll,
    clearAllHistory: clearAllHistory
  };
})(window);
