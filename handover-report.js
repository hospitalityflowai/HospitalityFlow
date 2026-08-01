/**
 * Hospitality Flow — Shift Handover Report Renderer
 * Consumes the canonical generated handover view (Print HTML).
 */
(function (global) {
  "use strict";

  var SECTION_ACCENTS = {
    "Urgent Issues": "#e85d5d",
    "VIP / Guest Information": "#4a8fc4",
    "Outstanding Tasks": "#5dce8a",
    "Maintenance": "#e8b84d",
    "Payment Issues": "#1a3055",
    "Events": "#7c5cbf",
    "General Updates": "#5a6578",
    "Completed Actions": "#5dce8a",
    "Guest Follow-up": "#4a8fc4",
    "Finance": "#5dce8a"
  };

  var STATUS_DOT = {
    critical: "#c45c5c",
    attention: "#d4a017",
    normal: "#5a9a6a",
    unknown: "#9aa3b2"
  };

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function stripTagPrefix(text) {
    return String(text || "").replace(/^\[[^\]]+\]\s*/, "").trim();
  }

  function parseNoteBlock(text) {
    var raw = stripTagPrefix(text);
    if (!raw) return { heading: "", body: "" };

    var roomMatch = raw.match(/^(Room\s+\d+[a-z]?(?:\s*\/\s*Suite\s+\d+[a-z]?)?)\s*[:\-–—]\s*(.+)$/i);
    if (roomMatch) {
      return { heading: roomMatch[1], body: roomMatch[2].trim() };
    }

    var dashMatch = raw.match(/^([^—–-]{8,96})\s*[—–-]\s*(.+)$/);
    if (dashMatch) {
      return { heading: dashMatch[1].trim(), body: dashMatch[2].trim() };
    }

    return { heading: "", body: raw };
  }

  function normalizeSnapshotValue(value) {
    if (value === null || value === undefined || value === "" || value === "undefined" || value === "null") {
      return "—";
    }
    return String(value);
  }

  function renderNoteHtml(text) {
    var parsed = parseNoteBlock(text);
    var html = '<div class="hr-note">';

    if (parsed.heading) {
      html += '<div class="hr-note-heading">' + escapeHtml(parsed.heading) + "</div>";
    }
    html += '<div class="hr-note-body">' +
      escapeHtml(parsed.body || stripTagPrefix(text)).replace(/\n/g, "<br>") +
      "</div>";
    html += "</div>";
    return html;
  }

  function renderSnapshotHtml(cells) {
    if (!cells || !cells.length) return "";

    var chunks = [];
    for (var i = 0; i < cells.length; i += 3) {
      chunks.push(cells.slice(i, i + 3));
    }

    return chunks.map(function (row) {
      return '<div class="hr-snapshot-row">' + row.map(function (cell) {
        return (
          '<div class="hr-snapshot-card">' +
            '<div class="hr-snapshot-label">' + escapeHtml(cell.label || "") + "</div>" +
            '<div class="hr-snapshot-value">' + escapeHtml(normalizeSnapshotValue(cell.value)) + "</div>" +
          "</div>"
        );
      }).join("") + "</div>";
    }).join("");
  }

  function renderBriefingHtml(briefing) {
    if (!briefing) return "";
    var paragraphs = Array.isArray(briefing.paragraphs) ? briefing.paragraphs : [];
    if (!paragraphs.length && typeof briefing === "string") {
      paragraphs = [briefing];
    }
    if (!paragraphs.length) return "";

    var html = '<section class="hr-section"><h2 class="hr-section-title">Today\'s Briefing</h2><div class="hr-summary-box">';
    paragraphs.forEach(function (para) {
      if (!para) return;
      html += '<p class="hr-briefing-block">' + escapeHtml(para).replace(/\n/g, "<br>") + "</p>";
    });
    html += "</div></section>";
    return html;
  }

  function renderHotelStatusHtml(areas) {
    if (!areas || !areas.length) return "";
    var cards = areas.map(function (area) {
      var level = String(area.level || "unknown").toLowerCase();
      var dot = STATUS_DOT[level] || STATUS_DOT.unknown;
      return (
        '<div class="hr-status-card" data-level="' + escapeHtml(level) + '">' +
          '<div class="hr-status-label">' +
            '<span class="hr-status-dot" style="background:' + dot + '" aria-hidden="true"></span>' +
            escapeHtml(area.label || area.key || "") +
          "</div>" +
          '<div class="hr-status-level">' + escapeHtml(level.charAt(0).toUpperCase() + level.slice(1)) + "</div>" +
          '<div class="hr-status-summary">' + escapeHtml(area.summary || "") + "</div>" +
        "</div>"
      );
    }).join("");

    return (
      '<section class="hr-section">' +
        '<h2 class="hr-section-title">Hotel Status</h2>' +
        '<div class="hr-status-grid">' + cards + "</div>" +
      "</section>"
    );
  }

  function renderTimelineHtml(timeline) {
    var groups = timeline && timeline.groups ? timeline.groups : [];
    if (!groups.length) return "";

    var body = groups.map(function (group) {
      var items = (group.items || []).map(function (item) {
        var when = item.time || item.deadlineLabel || "—";
        return (
          '<div class="hr-timeline-item">' +
            '<div class="hr-timeline-icon" aria-hidden="true">' + escapeHtml(item.icon || "•") + "</div>" +
            '<div class="hr-timeline-when">' + escapeHtml(when) + "</div>" +
            '<div class="hr-timeline-action">' + escapeHtml(item.action || "") +
              (item.reason ? '<span class="hr-timeline-reason">' + escapeHtml(item.reason) + "</span>" : "") +
            "</div>" +
          "</div>"
        );
      }).join("");
      return (
        '<div class="hr-timeline-group">' +
          '<div class="hr-timeline-group-label">' + escapeHtml(group.label || group.key || "") + "</div>" +
          items +
        "</div>"
      );
    }).join("");

    return (
      '<section class="hr-section">' +
        '<h2 class="hr-section-title">Today\'s Timeline</h2>' +
        body +
      "</section>"
    );
  }

  function renderSectionsHtml(sections) {
    if (!sections || !sections.length) return "";

    return sections.map(function (section) {
      if (!section || !section.items || !section.items.length) return "";

      var accent = SECTION_ACCENTS[section.title] || "#4a8fc4";
      var items = section.items.map(function (item) {
        var text = typeof item === "string" ? item : (item.displayText || item.text || "");
        return (
          '<div class="hr-note-wrap" style="border-left-color:' + accent + '">' +
            renderNoteHtml(text) +
          "</div>"
        );
      }).join("");

      return (
        '<section class="hr-section hr-section-notes">' +
          '<h2 class="hr-section-title">' + escapeHtml(section.title || "Section") + "</h2>" +
          items +
        "</section>"
      );
    }).join("");
  }

  function renderRecommendationsHtml(recommendations) {
    if (!recommendations || !recommendations.length) return "";

    var items = recommendations.map(function (item) {
      var text = typeof item === "string" ? item : (item.text || "");
      return '<li class="hr-bullet-item">' + escapeHtml(text) + "</li>";
    }).join("");

    return (
      '<section class="hr-section">' +
        '<h2 class="hr-section-title">AI Recommendations</h2>' +
        '<p class="hr-section-intro">Recommendations for the incoming shift</p>' +
        '<ul class="hr-bullet-list">' + items + "</ul>" +
      "</section>"
    );
  }

  function getReportStyles() {
    return [
      "@page { size: A4 portrait; margin: 12mm 14mm; }",
      "*, *::before, *::after { box-sizing: border-box; }",
      "html, body { margin: 0; padding: 0; background: #fff; color: #0c1829; font-family: 'Segoe UI', Arial, sans-serif; }",
      "body { font-size: 10.5pt; line-height: 1.45; }",
      ".hr-doc { width: 100%; max-width: 100%; }",
      ".hr-header { background: #0c1829; color: #fff; border-radius: 8px; padding: 14px 16px 12px; margin-bottom: 14px; }",
      ".hr-header h1 { margin: 0 0 4px; font-size: 17pt; line-height: 1.15; }",
      ".hr-header .hr-brand { margin: 0; font-size: 8.5pt; color: #c8d7e8; }",
      ".hr-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; background: #eef2f7; border: 1px solid #d8e0ea; border-radius: 8px; padding: 12px 14px; margin-bottom: 14px; }",
      ".hr-meta-item { min-width: 0; }",
      ".hr-meta-label { font-size: 7pt; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #5a6578; margin-bottom: 2px; }",
      ".hr-meta-value { font-size: 9.5pt; color: #0c1829; word-break: break-word; }",
      ".hr-section { margin-bottom: 14px; break-inside: auto; page-break-inside: auto; }",
      ".hr-section-title { margin: 0 0 8px; font-size: 11.5pt; color: #1a3055; border-bottom: 2px solid #4a8fc4; padding-bottom: 4px; break-after: avoid; page-break-after: avoid; }",
      ".hr-section-intro { margin: -4px 0 8px; font-size: 9pt; color: #5a6578; }",
      ".hr-snapshot-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-bottom: 8px; }",
      ".hr-snapshot-card { border: 1px solid #d8e0ea; border-radius: 8px; background: #fff; padding: 8px 10px; min-height: 52px; position: relative; overflow: hidden; break-inside: avoid; page-break-inside: avoid; }",
      ".hr-snapshot-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: rgba(74, 143, 196, 0.45); }",
      ".hr-snapshot-label { font-size: 7pt; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #5a6578; margin-bottom: 4px; line-height: 1.2; white-space: normal; }",
      ".hr-snapshot-value { font-size: 12pt; font-weight: 700; color: #0c1829; line-height: 1.2; word-break: break-word; overflow-wrap: anywhere; }",
      ".hr-summary-box { background: #eef6fc; border: 1px solid rgba(74, 143, 196, 0.35); border-radius: 8px; padding: 12px 14px; }",
      ".hr-briefing-block { margin: 0 0 10px; font-size: 10pt; color: #3d4654; white-space: pre-line; }",
      ".hr-briefing-block:last-child { margin-bottom: 0; }",
      ".hr-status-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }",
      ".hr-status-card { border: 1px solid #d8e0ea; border-radius: 8px; padding: 8px 9px; background: #f8fafc; break-inside: avoid; page-break-inside: avoid; }",
      ".hr-status-label { display: flex; align-items: center; gap: 6px; font-size: 7pt; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #1a3055; margin-bottom: 3px; }",
      ".hr-status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }",
      ".hr-status-level { font-size: 8.5pt; font-weight: 700; color: #0c1829; margin-bottom: 4px; }",
      ".hr-status-summary { font-size: 8.5pt; color: #5a6578; line-height: 1.35; }",
      ".hr-timeline-group { margin-bottom: 10px; }",
      ".hr-timeline-group-label { font-size: 7.5pt; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #5a6578; margin-bottom: 6px; }",
      ".hr-timeline-item { display: grid; grid-template-columns: 18px 90px 1fr; gap: 8px; padding: 5px 0; border-top: 1px solid #e8edf3; break-inside: avoid; page-break-inside: avoid; }",
      ".hr-timeline-item:first-of-type { border-top: 0; }",
      ".hr-timeline-icon { font-size: 9pt; line-height: 1.35; text-align: center; }",
      ".hr-timeline-when { font-size: 9pt; font-weight: 700; color: #1a3055; }",
      ".hr-timeline-action { font-size: 9.5pt; color: #3d4654; }",
      ".hr-timeline-reason { display: block; margin-top: 2px; font-size: 8pt; color: #5a6578; }",
      ".hr-note-wrap { border-left: 3px solid #4a8fc4; padding: 0 0 0 10px; margin: 0 0 8px; break-inside: avoid; page-break-inside: avoid; }",
      ".hr-note-heading { font-size: 9.8pt; font-weight: 700; color: #1a3055; margin-bottom: 2px; word-break: break-word; }",
      ".hr-note-body { font-size: 10pt; color: #3d4654; white-space: normal; word-break: break-word; overflow-wrap: anywhere; }",
      ".hr-bullet-list { margin: 0; padding: 0 0 0 16px; }",
      ".hr-bullet-item { margin-bottom: 6px; font-size: 10pt; color: #3d4654; break-inside: avoid; page-break-inside: avoid; }",
      ".hr-footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #d8e0ea; font-size: 7.5pt; color: #5a6578; display: flex; justify-content: space-between; }",
      "@media print {",
      "  .hr-section-notes { break-inside: auto; page-break-inside: auto; }",
      "  .hr-note-wrap, .hr-status-card, .hr-timeline-item, .hr-snapshot-card { break-inside: avoid; page-break-inside: avoid; }",
      "  .hr-status-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }",
      "}"
    ].join("\n");
  }

  function renderReportHtml(payload) {
    if (!payload || !payload.meta) {
      throw new Error("Invalid handover report payload");
    }

    var meta = payload.meta;
    var snapshot = payload.hotelSnapshot || payload.snapshot || [];
    var snapshotHtml = renderSnapshotHtml(snapshot);
    var briefingHtml = renderBriefingHtml(payload.briefing);
    /* Legacy fallback only when canonical briefing is absent */
    if (!briefingHtml && payload.summary) {
      var legacyOverview = typeof payload.summary === "string"
        ? payload.summary
        : (payload.summary.overview || "");
      if (legacyOverview) {
        briefingHtml = renderBriefingHtml({ paragraphs: [legacyOverview] });
      }
    }
    var statusHtml = renderHotelStatusHtml(payload.hotelStatus);
    var timelineHtml = renderTimelineHtml(payload.timeline);
    var sectionsHtml = renderSectionsHtml(payload.sections);
    var recommendationsHtml = renderRecommendationsHtml(payload.recommendations);

    return (
      "<!DOCTYPE html><html lang=\"en-GB\"><head><meta charset=\"utf-8\">" +
      "<title>Shift Handover Report</title>" +
      "<style>" + getReportStyles() + "</style></head><body>" +
      '<div class="hr-doc">' +
        '<header class="hr-header">' +
          "<h1>Shift Handover Report</h1>" +
          '<p class="hr-brand">Hospitality Flow</p>' +
        "</header>" +
        '<div class="hr-meta">' +
          '<div class="hr-meta-item"><div class="hr-meta-label">Hotel</div><div class="hr-meta-value">' + escapeHtml(meta.hotel) + "</div></div>" +
          '<div class="hr-meta-item"><div class="hr-meta-label">Shift</div><div class="hr-meta-value">' + escapeHtml(meta.shift) + "</div></div>" +
          '<div class="hr-meta-item"><div class="hr-meta-label">Prepared By</div><div class="hr-meta-value">' + escapeHtml(meta.preparedBy) + "</div></div>" +
          '<div class="hr-meta-item"><div class="hr-meta-label">Handover Date</div><div class="hr-meta-value">' + escapeHtml(meta.date) + "</div></div>" +
          '<div class="hr-meta-item"><div class="hr-meta-label">Generated</div><div class="hr-meta-value">' + escapeHtml(payload.generatedAt || "") + "</div></div>" +
        "</div>" +
        (snapshotHtml
          ? '<section class="hr-section"><h2 class="hr-section-title">Hotel Snapshot</h2>' + snapshotHtml + "</section>"
          : "") +
        briefingHtml +
        statusHtml +
        timelineHtml +
        sectionsHtml +
        recommendationsHtml +
        '<footer class="hr-footer"><span>Hospitality Flow — AI Shift Handover Assistant</span><span>Printed report</span></footer>' +
      "</div></body></html>"
    );
  }

  function printReport(payload) {
    var html = renderReportHtml(payload);
    var frame = document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    frame.setAttribute("aria-hidden", "true");
    document.body.appendChild(frame);

    var doc = frame.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    frame.contentWindow.focus();
    frame.contentWindow.print();

    window.setTimeout(function () {
      if (frame.parentNode) frame.parentNode.removeChild(frame);
    }, 1000);
  }

  global.HandoverReport = {
    parseNoteBlock: parseNoteBlock,
    renderHtml: renderReportHtml,
    print: printReport
  };
})(typeof window !== "undefined" ? window : this);
