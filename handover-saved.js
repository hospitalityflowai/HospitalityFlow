/**
 * Hospitality Flow — Saved Handovers (v1.2)
 * Local storage with Supabase cloud sync via HFHandoverStore.
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "hf_saved_handovers";

  var gridEl = null;
  var emptyEl = null;
  var countEl = null;
  var onOpen = null;
  var onEdit = null;
  var onPrint = null;
  var onExportPdf = null;
  var onSaveRequest = null;
  var showToast = null;
  var onConfirmDelete = null;
  var onConfirmClearAll = null;
  var saveInProgress = false;

  function useCloudStore() {
    return !!(global.HFHandoverStore && global.HFHandoverStore.getSavedHandovers);
  }

  function loadAll() {
    if (useCloudStore()) {
      return global.HFHandoverStore.getSavedHandovers();
    }
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  function saveAll(list) {
    if (useCloudStore()) {
      global.HFHandoverStore.saveAllLocal(list);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function formatGeneratedTime(isoTimestamp) {
    if (!isoTimestamp) return "Unknown time";
    var date = new Date(isoTimestamp);
    if (isNaN(date.getTime())) return "Unknown time";
    return date.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function formatDisplayDate(dateValue) {
    if (!dateValue) return "Not specified";
    var parts = dateValue.split("-");
    if (parts.length !== 3) return dateValue;
    var d = new Date(parts[0], parts[1] - 1, parts[2]);
    if (isNaN(d.getTime())) return dateValue;
    return d.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
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

  function renderList() {
    if (!gridEl) return;

    var list = loadAll().sort(function (a, b) {
      return new Date(b.timestamp || b.updatedAt || 0) - new Date(a.timestamp || a.updatedAt || 0);
    });

    gridEl.innerHTML = "";

    if (countEl) {
      countEl.textContent = list.length
        ? list.length + " saved"
        : "";
    }

    if (emptyEl) {
      emptyEl.style.display = list.length ? "none" : "block";
    }

    list.forEach(function (item) {
      var card = document.createElement("article");
      card.className = "card saved-handover-card";
      card.setAttribute("data-id", item.id);

      var hotel = escapeHtml(item.hotelName || "Not specified");
      var department = escapeHtml(item.department || "Not specified");
      var shift = escapeHtml(item.shift || "Not specified");
      var date = escapeHtml(item.dateDisplay || formatDisplayDate(item.date));
      var generated = escapeHtml(formatGeneratedTime(item.timestamp));
      var recCount = Array.isArray(item.recommendations) ? item.recommendations.length : 0;
      var checklistCount = Array.isArray(item.shiftIntelligenceChecklist) ? item.shiftIntelligenceChecklist.length : 0;
      var recLine = recCount
        ? '<div class="saved-handover-field full">' +
            '<span class="saved-handover-label">Recommendations</span>' +
            '<span class="saved-handover-value">' + recCount + ' action' + (recCount === 1 ? '' : 's') + '</span>' +
          '</div>'
        : '';
      var checklistLine = checklistCount
        ? '<div class="saved-handover-field full">' +
            '<span class="saved-handover-label">Intelligence Checklist</span>' +
            '<span class="saved-handover-value">' + checklistCount + ' item' + (checklistCount === 1 ? '' : 's') + '</span>' +
          '</div>'
        : '';

      card.innerHTML =
        '<div class="saved-handover-body">' +
          '<div class="saved-handover-meta">' +
            '<div class="saved-handover-field">' +
              '<span class="saved-handover-label">Hotel</span>' +
              '<span class="saved-handover-value">' + hotel + '</span>' +
            '</div>' +
            '<div class="saved-handover-field">' +
              '<span class="saved-handover-label">Department</span>' +
              '<span class="saved-handover-value">' + department + '</span>' +
            '</div>' +
            '<div class="saved-handover-field">' +
              '<span class="saved-handover-label">Shift</span>' +
              '<span class="saved-handover-value">' + shift + '</span>' +
            '</div>' +
            '<div class="saved-handover-field">' +
              '<span class="saved-handover-label">Date</span>' +
              '<span class="saved-handover-value">' + date + '</span>' +
            '</div>' +
            '<div class="saved-handover-field full">' +
              '<span class="saved-handover-label">Generated</span>' +
              '<span class="saved-handover-value">' + generated + '</span>' +
            '</div>' +
            recLine +
            checklistLine +
          '</div>' +
        '</div>' +
        '<div class="saved-handover-actions">' +
          '<button class="btn btn-secondary saved-handover-open" type="button">Open</button>' +
          '<button class="btn btn-secondary saved-handover-edit" type="button">Edit</button>' +
          '<button class="btn btn-secondary saved-handover-pdf" type="button">Export PDF</button>' +
          '<button class="btn btn-secondary saved-handover-print" type="button">Print</button>' +
          '<button class="btn btn-secondary saved-handover-delete" type="button">Delete</button>' +
        '</div>';

      card.querySelector(".saved-handover-open").addEventListener("click", function () {
        openHandover(item.id);
      });

      card.querySelector(".saved-handover-edit").addEventListener("click", function () {
        editHandover(item.id);
      });

      card.querySelector(".saved-handover-pdf").addEventListener("click", function () {
        exportPdfHandover(item.id);
      });

      card.querySelector(".saved-handover-print").addEventListener("click", function () {
        printHandover(item.id);
      });

      card.querySelector(".saved-handover-delete").addEventListener("click", function () {
        deleteHandover(item.id);
      });

      gridEl.appendChild(card);
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
    onOpen = options.onOpen;
    onEdit = options.onEdit;
    onPrint = options.onPrint;
    onExportPdf = options.onExportPdf;
    onSaveRequest = options.onSaveRequest;
    showToast = options.showToast;
    onConfirmDelete = options.onConfirmDelete;
    onConfirmClearAll = options.onConfirmClearAll;
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
        renderList();
        if (showToast) showToast(result.message || "Handover saved.");
      }).catch(function (err) {
        if (showToast) {
          showToast(global.HFHandoverStore.formatError
            ? global.HFHandoverStore.formatError(err)
            : "Saved on this device. Cloud sync unavailable.");
        }
        renderList();
      }).finally(function () {
        saveInProgress = false;
      });
      return;
    }

    if (saveHandover(record) && showToast) {
      showToast("Handover saved locally.");
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
