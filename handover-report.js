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

  function isStripSnapshot(cells) {
    return !!cells && cells.length > 0 && cells.every(function (cell) {
      return cell && cell.layout === "strip";
    });
  }

  function renderSnapshotHtml(cells) {
    if (!cells || !cells.length) return "";

    if (isStripSnapshot(cells)) {
      return (
        '<div class="hr-snapshot-strip">' +
        cells.map(function (cell) {
          return (
            '<div class="hr-snapshot-strip-row">' +
              '<div class="hr-snapshot-strip-label">' + escapeHtml(cell.label || "") + "</div>" +
              '<div class="hr-snapshot-strip-value">' + escapeHtml(normalizeSnapshotValue(cell.value)) + "</div>" +
            "</div>"
          );
        }).join("") +
        "</div>"
      );
    }

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
      if (level === "normal" || level === "unknown") return "";
      var dot = STATUS_DOT[level] || STATUS_DOT.unknown;
      var levelLabel = level.charAt(0).toUpperCase() + level.slice(1);
      var count = typeof area.count === "number" ? area.count : 0;
      var levelText = count > 0 ? levelLabel + " (" + count + ")" : levelLabel;
      var details = Array.isArray(area.details) ? area.details.filter(Boolean) : [];
      var detailsHtml = details.length
        ? '<ul class="hr-status-details">' + details.map(function (line) {
            return "<li>" + escapeHtml(line) + "</li>";
          }).join("") + "</ul>"
        : "";
      return (
        '<div class="hr-status-card" data-level="' + escapeHtml(level) + '">' +
          '<div class="hr-status-label">' +
            '<span class="hr-status-dot" style="background:' + dot + '" aria-hidden="true"></span>' +
            escapeHtml(area.label || area.key || "") +
          "</div>" +
          '<div class="hr-status-level">' + escapeHtml(levelText) + "</div>" +
          detailsHtml +
        "</div>"
      );
    }).filter(Boolean).join("");

    if (!cards) return "";

    return (
      '<section class="hr-section">' +
        '<h2 class="hr-section-title">Hotel Status</h2>' +
        '<div class="hr-status-grid">' + cards + "</div>" +
      "</section>"
    );
  }

  function formatTimelineEntry(item) {
    if (global.HandoverGeneratedView && typeof global.HandoverGeneratedView.formatTimelineEntry === "function") {
      return global.HandoverGeneratedView.formatTimelineEntry(item);
    }
    var when = String((item && (item.time || item.deadlineLabel)) || "").trim() || "TBC";
    var action = String((item && item.action) || "").replace(/\s+/g, " ").trim();
    return action ? when + " \u2014 " + action : when;
  }

  function renderTimelineHtml(timeline) {
    var groups = timeline && timeline.groups ? timeline.groups : [];
    if (!groups.length) return "";

    var body = groups.map(function (group) {
      var items = (group.items || []).map(function (item) {
        var line = formatTimelineEntry(item);
        return (
          '<div class="hr-timeline-item">' +
            '<div class="hr-timeline-line">' + escapeHtml(line) + "</div>" +
            (item.reason
              ? '<div class="hr-timeline-reason">' + escapeHtml(item.reason) + "</div>"
              : "") +
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

  function buildSourceNotesSections(sourceNotes) {
    if (!sourceNotes) return [];
    var Notes = global.HFHandoverNotesSections;
    if (Notes && Notes.buildSourceNotesViewModel) {
      var model = Notes.buildSourceNotesViewModel(sourceNotes);
      return model && model.hasContent ? model.sections : [];
    }
    var parts = sourceNotes.parts || null;
    var defs = [
      { id: "arrivals", title: "Today's Arrivals" },
      { id: "departures", title: "Today's Departures" },
      { id: "general", title: "General Hotel / Shift Notes" }
    ];
    var sections = [];
    if (parts) {
      defs.forEach(function (def) {
        var body = String(parts[def.id] || "").replace(/\s+$/g, "");
        if (body.trim()) sections.push({ id: def.id, title: def.title, text: body });
      });
    }
    if (!sections.length) {
      var fallback = String(sourceNotes.combined || sourceNotes.originalNotes || sourceNotes.text || "").trim();
      if (fallback) sections.push({ id: "original", title: "Original notes", text: fallback });
    }
    return sections;
  }

  function renderQuoteOfTheDayHtml(quote) {
    if (!quote || !quote.text) return "";
    var body = String(quote.text).replace(/^["“”']+|["“”']+$/g, "").trim();
    if (!body) return "";
    if (!/[.!?]$/.test(body)) body += ".";
    var display = "\u201C" + body.replace(/[.!?]$/, "") + ".\u201D";
    var author = String(quote.author || "").replace(/^[\s—\-–]+/, "").trim();
    var authorHtml = author
      ? '<div class="hr-quote-author">— ' + escapeHtml(author) + "</div>"
      : "";
    return (
      '<div class="hr-quote-card">' +
        '<div class="hr-quote-label">Quote of the Day</div>' +
        '<div class="hr-quote-text">' + escapeHtml(display) + "</div>" +
        authorHtml +
      "</div>"
    );
  }

  function renderSourceNotesHtml(sourceNotes) {
    var sections = buildSourceNotesSections(sourceNotes);
    if (!sections.length) return "";

    var blocks = sections.map(function (section) {
      return (
        '<div class="hr-source-block">' +
          '<div class="hr-source-label">' + escapeHtml(section.title || "Notes") + "</div>" +
          '<pre class="hr-source-text">' + escapeHtml(section.text || "") + "</pre>" +
        "</div>"
      );
    }).join("");

    return (
      '<section class="hr-section hr-section-source">' +
        '<h2 class="hr-section-title">Source Notes</h2>' +
        '<p class="hr-section-intro">Original staff notes used to generate this handover</p>' +
        blocks +
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
      ".hr-section { margin: 0 0 16px; break-inside: auto; page-break-inside: auto; }",
      ".hr-section-title { margin: 0 0 9px; font-size: 11.5pt; font-weight: 700; color: #1a3055; border-bottom: 1.5px solid #4a8fc4; padding-bottom: 5px; break-after: avoid; page-break-after: avoid; }",
      ".hr-section-intro { margin: -2px 0 9px; font-size: 9pt; color: #5a6578; }",
      ".hr-snapshot-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-bottom: 8px; }",
      ".hr-snapshot-card { border: 1px solid #d8e0ea; border-radius: 8px; background: #fff; padding: 9px 11px; min-height: 54px; position: relative; overflow: hidden; break-inside: avoid; page-break-inside: avoid; }",
      ".hr-snapshot-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: rgba(74, 143, 196, 0.45); }",
      ".hr-snapshot-label { font-size: 7pt; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #5a6578; margin-bottom: 4px; line-height: 1.2; white-space: normal; }",
      ".hr-snapshot-value { font-size: 12pt; font-weight: 700; color: #0c1829; line-height: 1.2; word-break: break-word; overflow-wrap: anywhere; }",
      ".hr-snapshot-strip { border: 1px solid #d8e0ea; border-radius: 8px; background: #f7fafc; padding: 9px 12px; }",
      ".hr-snapshot-strip-row + .hr-snapshot-strip-row { margin-top: 7px; padding-top: 7px; border-top: 1px solid #e4ebf2; }",
      ".hr-snapshot-strip-label { font-size: 7pt; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #5a6578; margin-bottom: 3px; }",
      ".hr-snapshot-strip-value { font-size: 9.5pt; font-weight: 600; color: #0c1829; line-height: 1.35; word-break: break-word; overflow-wrap: anywhere; }",
      ".hr-section-source { border: 1px solid #d8e0ea; border-radius: 8px; background: #f7fafc; padding: 10px 12px; }",
      ".hr-source-block + .hr-source-block { margin-top: 8px; padding-top: 8px; border-top: 1px solid #e4ebf2; }",
      ".hr-source-label { font-size: 7pt; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #5a6578; margin-bottom: 3px; }",
      ".hr-source-text { margin: 0; font-size: 8.5pt; color: #24364f; white-space: pre-wrap; word-break: break-word; line-height: 1.35; font-family: 'Segoe UI', Arial, sans-serif; }",
      ".hr-quote-card { border: none; background: transparent; padding: 4px 8px 8px; margin: 0 0 10px; text-align: center; break-inside: avoid; page-break-inside: avoid; }",
      ".hr-quote-label { font-size: 7.5pt; font-weight: 600; letter-spacing: 0.04em; text-transform: none; color: #8a93a3; margin-bottom: 4px; }",
      ".hr-quote-text { font-size: 9pt; font-style: italic; color: #1a3055; line-height: 1.4; }",
      ".hr-quote-author { font-size: 7.5pt; color: #8a93a3; margin-top: 3px; }",
      ".hr-summary-box { background: #eef6fc; border: 1px solid rgba(74, 143, 196, 0.35); border-radius: 8px; padding: 13px 15px; }",
      ".hr-briefing-block { margin: 0 0 10px; font-size: 10pt; color: #3d4654; white-space: pre-line; line-height: 1.45; }",
      ".hr-briefing-block:last-child { margin-bottom: 0; }",
      ".hr-status-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }",
      ".hr-status-card { border: 1px solid #d8e0ea; border-radius: 8px; padding: 7px 8px; background: #f8fafc; break-inside: avoid; page-break-inside: avoid; }",
      ".hr-status-label { display: flex; align-items: center; gap: 6px; font-size: 7pt; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: #1a3055; margin-bottom: 2px; }",
      ".hr-status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }",
      ".hr-status-level { font-size: 8.5pt; font-weight: 700; color: #0c1829; margin-bottom: 0; }",
      ".hr-status-details { margin: 5px 0 0; padding: 0; list-style: none; }",
      ".hr-status-details li { font-size: 8pt; color: #5a6578; line-height: 1.3; padding: 1px 0; }",
      ".hr-timeline-group { margin: 0 0 12px; break-inside: avoid; page-break-inside: avoid; }",
      ".hr-timeline-group-label { font-size: 7.5pt; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #5a6578; margin: 0 0 6px; }",
      ".hr-timeline-item { padding: 6px 0; border-top: 1px solid #e8edf3; break-inside: avoid; page-break-inside: avoid; }",
      ".hr-timeline-item:first-of-type { border-top: 0; padding-top: 0; }",
      ".hr-timeline-line { font-size: 10pt; color: #24364f; line-height: 1.4; }",
      ".hr-timeline-reason { margin-top: 2px; font-size: 8pt; color: #5a6578; }",
      ".hr-note-wrap { border-left: 3px solid #4a8fc4; padding: 0 0 0 11px; margin: 0 0 9px; break-inside: avoid; page-break-inside: avoid; }",
      ".hr-note-heading { font-size: 9.8pt; font-weight: 700; color: #1a3055; margin-bottom: 2px; word-break: break-word; }",
      ".hr-note-body { font-size: 10pt; color: #3d4654; white-space: normal; word-break: break-word; overflow-wrap: anywhere; line-height: 1.4; }",
      ".hr-bullet-list { margin: 0; padding: 0 0 0 16px; }",
      ".hr-bullet-item { margin-bottom: 7px; font-size: 10pt; color: #3d4654; break-inside: avoid; page-break-inside: avoid; line-height: 1.4; }",
      ".hr-footer { margin-top: 18px; padding-top: 9px; border-top: 1px solid #d8e0ea; font-size: 7.5pt; color: #5a6578; display: flex; justify-content: space-between; gap: 12px; }",
      "@media print {",
      "  .hr-section { margin-bottom: 15px; }",
      "  .hr-section-notes { break-inside: auto; page-break-inside: auto; }",
      "  .hr-note-wrap, .hr-status-card, .hr-timeline-item, .hr-timeline-group, .hr-snapshot-card, .hr-snapshot-strip { break-inside: avoid; page-break-inside: avoid; }",
      "  .hr-status-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }",
      "}"
    ].join("\n");
  }

  function renderReportHtml(payload) {
    if (!payload || !payload.meta) {
      throw new Error("Invalid handover report payload");
    }

    var meta = payload.meta;
    var sourceNotesHtml = renderSourceNotesHtml(payload.sourceNotes);
    var quoteHtml = renderQuoteOfTheDayHtml(payload.quoteOfTheDay);
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
        sourceNotesHtml +
        (snapshotHtml
          ? '<section class="hr-section"><h2 class="hr-section-title">Hotel Snapshot</h2>' + snapshotHtml + quoteHtml + "</section>"
          : quoteHtml) +
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
