/**
 * Hospitality Flow — Shift Handover Report Renderer
 * Shared structured payload → Print HTML (PDF export uses the same payload in handover-pdf.js).
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
    "Completed Actions": "#5dce8a"
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
    html += '<div class="hr-note-body">' + escapeHtml(parsed.body || stripTagPrefix(text)) + "</div>";
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

  function renderSummaryHtml(summary) {
    if (!summary) return "";

    var overview = typeof summary === "string" ? summary : (summary.overview || "");
    var rows = typeof summary === "object" && summary.rows ? summary.rows : [];
    if (!overview && !rows.length) return "";

    var html = '<section class="hr-section"><h2 class="hr-section-title">AI Summary</h2><div class="hr-summary-box">';

    if (overview) {
      html += '<p class="hr-summary-overview">' + escapeHtml(overview) + "</p>";
    }

    rows.forEach(function (row) {
      if (!row || !row.text) return;
      html +=
        '<div class="hr-summary-sub">' +
          '<div class="hr-summary-sub-title">' + escapeHtml(row.heading || "Summary") + "</div>" +
          '<div class="hr-summary-sub-text">' + escapeHtml(row.text) + "</div>" +
        "</div>";
    });

    html += "</div></section>";
    return html;
  }

  function renderSectionsHtml(sections) {
    if (!sections || !sections.length) return "";

    return sections.map(function (section) {
      if (!section || !section.items || !section.items.length) return "";

      var accent = SECTION_ACCENTS[section.title] || "#4a8fc4";
      var items = section.items.map(function (item) {
        return (
          '<div class="hr-note-wrap" style="border-left-color:' + accent + '">' +
            renderNoteHtml(item) +
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
      return '<li class="hr-bullet-item">' + escapeHtml(item) + "</li>";
    }).join("");

    return (
      '<section class="hr-section">' +
        '<h2 class="hr-section-title">Shift Intelligence</h2>' +
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
      ".hr-snapshot-card { border: 1px solid #d8e0ea; border-radius: 8px; background: #fff; padding: 8px 10px; min-height: 52px; position: relative; overflow: hidden; }",
      ".hr-snapshot-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: rgba(74, 143, 196, 0.45); }",
      ".hr-snapshot-label { font-size: 7pt; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #5a6578; margin-bottom: 4px; line-height: 1.2; white-space: normal; }",
      ".hr-snapshot-value { font-size: 12pt; font-weight: 700; color: #0c1829; line-height: 1.2; word-break: break-word; overflow-wrap: anywhere; }",
      ".hr-summary-box { background: #eef6fc; border: 1px solid rgba(74, 143, 196, 0.35); border-radius: 8px; padding: 12px 14px; }",
      ".hr-summary-overview { margin: 0 0 8px; font-size: 10pt; color: #3d4654; }",
      ".hr-summary-sub { margin-top: 8px; }",
      ".hr-summary-sub-title { font-size: 7.5pt; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #1a3055; margin-bottom: 3px; }",
      ".hr-summary-sub-text { font-size: 9.5pt; color: #3d4654; }",
      ".hr-note-wrap { border-left: 3px solid #4a8fc4; padding: 0 0 0 10px; margin: 0 0 8px; break-inside: avoid; page-break-inside: avoid; }",
      ".hr-note-heading { font-size: 9.8pt; font-weight: 700; color: #1a3055; margin-bottom: 2px; word-break: break-word; }",
      ".hr-note-body { font-size: 10pt; color: #3d4654; white-space: normal; word-break: break-word; overflow-wrap: anywhere; }",
      ".hr-bullet-list { margin: 0; padding: 0 0 0 16px; }",
      ".hr-bullet-item { margin-bottom: 6px; font-size: 10pt; color: #3d4654; break-inside: avoid; page-break-inside: avoid; }",
      ".hr-footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #d8e0ea; font-size: 7.5pt; color: #5a6578; display: flex; justify-content: space-between; }",
      "@media print {",
      "  .hr-section-notes { break-inside: auto; page-break-inside: auto; }",
      "  .hr-note-wrap { break-inside: avoid; page-break-inside: avoid; }",
      "}"
    ].join("\n");
  }

  function renderReportHtml(payload) {
    if (!payload || !payload.meta) {
      throw new Error("Invalid handover report payload");
    }

    var meta = payload.meta;
    var snapshotHtml = renderSnapshotHtml(payload.hotelSnapshot);
    var summaryHtml = renderSummaryHtml(payload.summary);
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
        summaryHtml +
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
