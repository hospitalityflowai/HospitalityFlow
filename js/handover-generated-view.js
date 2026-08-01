/**
 * Hospitality Flow — Canonical Generated Handover View
 *
 * Single model consumed by screen exports (Print / PDF / Copy).
 * Built once from live Intelligence Engine output + organised sections.
 * No second intelligence pipeline; no legacy AI Summary rows.
 */
(function (global) {
  "use strict";

  var VIEW_VERSION = 1;

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function normalizeBriefing(briefing) {
    briefing = briefing || {};
    var paragraphs = asArray(briefing.paragraphs).map(function (p) {
      return String(p || "").trim();
    }).filter(Boolean);
    return {
      headline: String(briefing.headline || "").trim(),
      paragraphs: paragraphs,
      primaryFactIds: asArray(briefing.primaryFactIds),
      generatedFromFactCount: typeof briefing.generatedFromFactCount === "number"
        ? briefing.generatedFromFactCount
        : paragraphs.length
    };
  }

  function normalizeTimeline(timeline) {
    timeline = timeline || {};
    var groups = asArray(timeline.groups).map(function (group) {
      return {
        key: group.key || "",
        label: group.label || group.key || "",
        items: asArray(group.items).map(function (item) {
          return {
            factId: item.factId || null,
            time: item.time || null,
            deadlineLabel: item.deadlineLabel || null,
            action: item.action || "",
            reason: item.reason || null,
            priority: item.priority || "normal",
            icon: item.icon || ""
          };
        }).filter(function (item) { return !!item.action; })
      };
    }).filter(function (group) { return group.items.length > 0; });
    return { groups: groups };
  }

  /** Professional timeline when-label (never empty). */
  function formatTimelineWhen(item) {
    item = item || {};
    var when = String(item.time || item.deadlineLabel || "").trim();
    return when || "TBC";
  }

  /**
   * Clean operational timeline line for screen / Print / Copy / PDF.
   * Example: "23:30 — Prepare quiet upper-floor room for VIP Mr Smith"
   * Icons/emoji are never included (avoids print/PDF encoding corruption).
   */
  function formatTimelineEntry(item, options) {
    options = options || {};
    item = item || {};
    var when = formatTimelineWhen(item);
    var action = String(item.action || "").replace(/\s+/g, " ").trim();
    var sep = options.pdfSafe ? " - " : " \u2014 ";
    if (!action) return when;
    return when + sep + action;
  }

  /** Strip characters that break jsPDF Helvetica (emoji / exotic symbols). */
  function toPdfSafeText(value) {
    return String(value || "")
      .replace(/[\u2014\u2013]/g, "-")
      .replace(/[\u2022\u00B7]/g, "-")
      .replace(/[\uD800-\uDFFF]/g, "")
      .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u00FF]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeHotelStatus(areas) {
    return asArray(areas).map(function (area) {
      return {
        key: area.key || "",
        label: area.label || area.key || "",
        level: area.level || "unknown",
        summary: area.summary || "",
        count: typeof area.count === "number" ? area.count : 0,
        supportingFactIds: asArray(area.supportingFactIds)
      };
    });
  }

  function normalizeRecommendations(recs, formatRec) {
    return asArray(recs).map(function (rec, index) {
      var text = formatRec
        ? formatRec(rec)
        : String((rec && rec.text) || rec || "").trim();
      if (!text) return null;
      return {
        id: (rec && rec.id) || ("rec-" + index),
        text: text,
        priority: (rec && rec.priority) || "normal",
        department: (rec && rec.department) || "",
        status: (rec && rec.status) || "pending"
      };
    }).filter(Boolean);
  }

  /**
   * @param {object} input
   * @param {object} input.meta
   * @param {string} [input.generatedAt]
   * @param {Array<{label,value}>} [input.snapshot]
   * @param {object} [input.experience] — from buildHandoverIntelligenceExperience
   * @param {object} [input.classified]
   * @param {Array} [input.sectionDefs] — [{ id, title }]
   * @param {Array} [input.recommendations]
   * @param {function} [input.normalizeItem]
   * @param {function} [input.getItemText]
   * @param {function} [input.formatItemText] — includes status phrase when relevant
   * @param {function} [input.formatRecommendation]
   * @param {function} [input.filterSectionItems]
   */
  function buildGeneratedHandoverView(input) {
    input = input || {};
    var experience = input.experience || {};
    var classified = input.classified || {};
    var sectionDefs = asArray(input.sectionDefs);
    var filterSectionItems = typeof input.filterSectionItems === "function"
      ? input.filterSectionItems
      : function (_id, items) { return items; };
    var normalizeItem = typeof input.normalizeItem === "function"
      ? input.normalizeItem
      : function (item) { return item; };
    var getItemText = typeof input.getItemText === "function"
      ? input.getItemText
      : function (item) {
        if (item == null) return "";
        if (typeof item === "string") return item;
        return String(item.text || "");
      };
    var formatItemText = typeof input.formatItemText === "function"
      ? input.formatItemText
      : getItemText;

    var sections = [];
    sectionDefs.forEach(function (def) {
      if (!def || !def.id) return;
      var rawItems = asArray(classified[def.id]);
      var items = filterSectionItems(def.id, rawItems.slice());
      if (!items.length) return;
      sections.push({
        id: def.id,
        title: def.title || def.id,
        items: items.map(function (raw, index) {
          var normalized = normalizeItem(raw, def.id) || raw;
          var text = getItemText(normalized);
          var displayText = formatItemText(normalized);
          return {
            id: (normalized && normalized.id) || (def.id + "-" + index),
            text: text,
            status: (normalized && normalized.status) || "pending",
            displayText: displayText || text
          };
        }).filter(function (item) { return !!(item.text || item.displayText); })
      });
    });

    var snapshot = asArray(input.snapshot).map(function (cell) {
      return {
        label: (cell && cell.label) || "",
        value: cell && cell.value != null ? cell.value : "—"
      };
    });

    var view = {
      version: VIEW_VERSION,
      meta: {
        hotel: (input.meta && input.meta.hotel) || "Not specified",
        shift: (input.meta && input.meta.shift) || "Not specified",
        date: (input.meta && input.meta.date) || "Not specified",
        preparedBy: (input.meta && input.meta.preparedBy) || "Not specified"
      },
      generatedAt: input.generatedAt || "",
      snapshot: snapshot,
      hotelSnapshot: snapshot,
      briefing: normalizeBriefing(experience.briefing),
      hotelStatus: normalizeHotelStatus(experience.hotelStatus),
      timeline: normalizeTimeline(experience.timeline),
      sections: sections,
      recommendations: normalizeRecommendations(
        input.recommendations,
        input.formatRecommendation
      )
    };

    return view;
  }

  /** Report/PDF payload alias — same object, no legacy summary.rows. */
  function toReportPayload(view) {
    if (!view || !view.meta) {
      throw new Error("Invalid generated handover view");
    }
    return {
      version: view.version || VIEW_VERSION,
      meta: view.meta,
      generatedAt: view.generatedAt || "",
      hotelSnapshot: view.snapshot || view.hotelSnapshot || [],
      snapshot: view.snapshot || view.hotelSnapshot || [],
      briefing: normalizeBriefing(view.briefing),
      hotelStatus: normalizeHotelStatus(view.hotelStatus),
      timeline: normalizeTimeline(view.timeline),
      sections: asArray(view.sections).map(function (section) {
        return {
          id: section.id || "",
          title: section.title || "Section",
          items: asArray(section.items).map(function (item) {
            if (typeof item === "string") return item;
            return item.displayText || item.text || "";
          }).filter(Boolean)
        };
      }).filter(function (section) { return section.items.length > 0; }),
      recommendations: asArray(view.recommendations).map(function (rec) {
        return typeof rec === "string" ? rec : (rec.text || "");
      }).filter(Boolean),
      /* Explicitly omit legacy AI Summary detail rows */
      summary: null,
      hasCanonicalView: true
    };
  }

  function formatGeneratedHandoverText(view, options) {
    options = options || {};
    view = view || {};
    var parts = [];
    var meta = view.meta || {};
    var title = options.title || "ORGANISED HANDOVER — Hospitality Flow";

    parts.push(title);
    parts.push("════════════════════════════════");
    parts.push("Hotel:       " + (meta.hotel || "Not specified"));
    parts.push("Shift:       " + (meta.shift || "Not specified"));
    parts.push("Date:        " + (meta.date || "Not specified"));
    parts.push("Prepared by: " + (meta.preparedBy || "Not specified"));
    if (view.generatedAt) parts.push("Generated:   " + view.generatedAt);
    parts.push("");

    var snapshot = view.snapshot || view.hotelSnapshot || [];
    if (snapshot.length) {
      parts.push("HOTEL SNAPSHOT");
      snapshot.forEach(function (cell) {
        parts.push((cell.label || "Field") + ": " + (cell.value != null && cell.value !== "" ? cell.value : "—"));
      });
      parts.push("");
    }

    var briefing = normalizeBriefing(view.briefing);
    if (briefing.paragraphs.length) {
      parts.push("TODAY'S BRIEFING");
      briefing.paragraphs.forEach(function (para) {
        parts.push(para);
        parts.push("");
      });
    }

    var statusAreas = normalizeHotelStatus(view.hotelStatus);
    if (statusAreas.length) {
      parts.push("HOTEL STATUS");
      statusAreas.forEach(function (area) {
        parts.push(
          (area.label || area.key) + " [" + String(area.level || "unknown").toUpperCase() + "] — " +
          (area.summary || "")
        );
      });
      parts.push("");
    }

    var timeline = normalizeTimeline(view.timeline);
    if (timeline.groups.length) {
      parts.push("TODAY'S TIMELINE");
      timeline.groups.forEach(function (group) {
        parts.push(String(group.label || group.key).toUpperCase());
        group.items.forEach(function (item) {
          parts.push(formatTimelineEntry(item));
        });
        parts.push("");
      });
    }

    asArray(view.sections).forEach(function (section) {
      var items = asArray(section.items);
      if (!items.length) return;
      parts.push(String(section.title || "Section").toUpperCase());
      items.forEach(function (item) {
        var line = typeof item === "string" ? item : (item.displayText || item.text || "");
        if (line) parts.push("- " + line);
      });
      parts.push("");
    });

    var recs = asArray(view.recommendations);
    if (recs.length) {
      parts.push("AI RECOMMENDATIONS");
      recs.forEach(function (rec) {
        var line = typeof rec === "string" ? rec : (rec.text || "");
        if (line) parts.push("• " + line);
      });
      parts.push("");
    }

    return parts.join("\n").trim();
  }

  function hasCanonicalBriefing(viewOrPayload) {
    var briefing = viewOrPayload && viewOrPayload.briefing;
    return !!(briefing && asArray(briefing.paragraphs).length);
  }

  global.HandoverGeneratedView = {
    VIEW_VERSION: VIEW_VERSION,
    build: buildGeneratedHandoverView,
    toReportPayload: toReportPayload,
    formatText: formatGeneratedHandoverText,
    formatTimelineWhen: formatTimelineWhen,
    formatTimelineEntry: formatTimelineEntry,
    toPdfSafeText: toPdfSafeText,
    hasCanonicalBriefing: hasCanonicalBriefing,
    clone: clone
  };
})(typeof window !== "undefined" ? window : globalThis);
