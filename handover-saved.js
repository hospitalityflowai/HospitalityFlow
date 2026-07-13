/**
 * Hospitality Flow — Saved Handovers (v1.1)
 * Local storage and list UI for shift handover records.
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "hf_saved_handovers";

  var gridEl = null;
  var emptyEl = null;
  var countEl = null;
  var onOpen = null;
  var onSaveRequest = null;
  var showToast = null;

  function loadAll() {
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

  function deleteHandover(id) {
    var list = loadAll().filter(function (item) { return item.id !== id; });
    saveAll(list);
    renderList();
    if (showToast) showToast("Handover deleted.");
  }

  function openHandover(id) {
    var item = loadAll().find(function (entry) { return entry.id === id; });
    if (!item) {
      if (showToast) showToast("Saved handover not found.");
      renderList();
      return;
    }
    if (onOpen) onOpen(item);
  }

  function renderList() {
    if (!gridEl) return;

    var list = loadAll().sort(function (a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
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
          '</div>' +
        '</div>' +
        '<div class="saved-handover-actions">' +
          '<button class="btn btn-secondary saved-handover-open" type="button">Open</button>' +
          '<button class="btn btn-secondary saved-handover-delete" type="button">Delete</button>' +
        '</div>';

      card.querySelector(".saved-handover-open").addEventListener("click", function () {
        openHandover(item.id);
      });

      card.querySelector(".saved-handover-delete").addEventListener("click", function () {
        deleteHandover(item.id);
      });

      gridEl.appendChild(card);
    });
  }

  function saveHandover(record) {
    if (!record || !record.id) return false;

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
    onSaveRequest = options.onSaveRequest;
    showToast = options.showToast;
    renderList();
  }

  function handleSaveClick() {
    if (!onSaveRequest) return;
    var record = onSaveRequest();
    if (!record) {
      if (showToast) showToast("Generate a handover first.");
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
    loadAll: loadAll
  };
})(window);
