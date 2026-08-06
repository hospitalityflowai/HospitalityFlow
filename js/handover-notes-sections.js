/**
 * Hospitality Flow — structured handover notes sections
 * Shared by workspace and demo so arrivals / departures / general stay consistent.
 *
 * AI contract: each section is labelled explicitly so arrivals are not interpreted
 * as departures (and vice versa) unless the note clearly states otherwise.
 */
(function (global) {
  "use strict";

  var SECTION_DEFS = [
    {
      id: "arrivals",
      title: "Today's Arrivals",
      label: "TODAY'S ARRIVALS",
      helper: "VIPs, ETAs, payment status, room setup, special requests and arrival actions.",
      placeholder: "Example:\nVIP Eleanor Whitmore due 11:00 — Room 42 if free\nBusiness of Champagne + welcome card\nPatel late arrival ~23:45 Room 16 — twin beds please"
    },
    {
      id: "departures",
      title: "Today's Departures",
      label: "TODAY'S DEPARTURES",
      helper: "Outstanding balances, late check-outs, transport, luggage and departure actions.",
      placeholder: "Example:\nOkonkwo Room 22 — wake-up 06:30, Addison Lee 10:15\nMinibar £42.50 still open — collect before check-out\nLate check-out Room 21 Chen approved 13:00"
    },
    {
      id: "general",
      title: "General Hotel / Shift Notes",
      label: "GENERAL HOTEL / SHIFT NOTES",
      helper: "Maintenance, guest issues, housekeeping, staff communication and operational updates.",
      placeholder: "Example:\nRoom 24 AC broken — maintenance aware, fan with guest\nLobby WC hand dryer dead — paper towels out\nLost property: gold cufflink Room 25 Fraser — DM safe"
    }
  ];

  var SECTION_IDS = SECTION_DEFS.map(function (d) { return d.id; });

  function emptyParts() {
    return { arrivals: "", departures: "", general: "" };
  }

  function normalizeParts(parts) {
    var next = emptyParts();
    if (!parts || typeof parts !== "object") return next;
    SECTION_IDS.forEach(function (id) {
      next[id] = parts[id] != null ? String(parts[id]) : "";
    });
    return next;
  }

  function hasContent(parts) {
    parts = normalizeParts(parts);
    return SECTION_IDS.some(function (id) {
      return String(parts[id] || "").trim().length > 0;
    });
  }

  /**
   * Labelled AI / engine contract. Preserves line breaks within each section.
   */
  function combineForAi(parts) {
    parts = normalizeParts(parts);
    var blocks = [];
    SECTION_DEFS.forEach(function (def) {
      var body = String(parts[def.id] || "").replace(/\s+$/g, "");
      if (!body.trim()) return;
      blocks.push("=== " + def.label + " ===\n" + body);
    });
    return blocks.join("\n\n");
  }

  /**
   * Plain combined notes for legacy storage / char counts.
   */
  function combinePlain(parts) {
    parts = normalizeParts(parts);
    var blocks = [];
    SECTION_DEFS.forEach(function (def) {
      var body = String(parts[def.id] || "").replace(/\s+$/g, "");
      if (!body.trim()) return;
      blocks.push(def.title + "\n" + body);
    });
    return blocks.join("\n\n");
  }

  /**
   * Split labelled combined text back into parts.
   * Unlabelled legacy notes fall into general.
   */
  function splitCombined(text) {
    var parts = emptyParts();
    var raw = String(text || "");
    if (!raw.trim()) return parts;

    var headerRe = /(?:^|\n)(?:=== )?((?:TODAY'S ARRIVALS)|(?:TODAY'S DEPARTURES)|(?:GENERAL HOTEL \/ SHIFT NOTES)|(?:Today's Arrivals)|(?:Today's Departures)|(?:General Hotel \/ Shift Notes))(?: ===)?\s*\n/gi;
    var matches = [];
    var match;
    while ((match = headerRe.exec(raw)) !== null) {
      matches.push({
        index: match.index + (match[0].charAt(0) === "\n" ? 1 : 0),
        endHeader: match.index + match[0].length,
        title: match[1]
      });
    }

    if (!matches.length) {
      parts.general = raw;
      return parts;
    }

    function mapTitle(title) {
      var t = String(title || "").toLowerCase();
      if (t.indexOf("arrival") !== -1) return "arrivals";
      if (t.indexOf("departure") !== -1) return "departures";
      return "general";
    }

    /* Leading unlabelled text → general */
    if (matches[0].index > 0) {
      var leading = raw.slice(0, matches[0].index).trim();
      if (leading) parts.general = leading;
    }

    for (var i = 0; i < matches.length; i++) {
      var start = matches[i].endHeader;
      var end = i + 1 < matches.length ? matches[i + 1].index : raw.length;
      var id = mapTitle(matches[i].title);
      var body = raw.slice(start, end).replace(/^\n+/, "").replace(/\s+$/g, "");
      if (parts[id]) parts[id] = parts[id] + (parts[id] && body ? "\n" : "") + body;
      else parts[id] = body;
    }

    return parts;
  }

  /**
   * Parse into operational lines with explicit source context.
   * @returns {{ lines: Array<{text:string, source:string}>, combinedText: string, parts: object }}
   */
  function parseSectionedNotes(parts) {
    parts = normalizeParts(parts);
    var lines = [];
    SECTION_DEFS.forEach(function (def) {
      String(parts[def.id] || "")
        .split(/\n/)
        .map(function (line) { return line.replace(/\s+$/g, ""); })
        .filter(function (line) { return line.trim().length > 0; })
        .forEach(function (line) {
          lines.push({ text: line.trim(), source: def.id });
        });
    });
    return {
      lines: lines,
      combinedText: combineForAi(parts),
      parts: parts
    };
  }

  /**
   * Bias classification using section source.
   * Arrivals stay arrival-context unless the note clearly states departure/check-out.
   */
  function resolveSourceBias(source, text) {
    var lower = String(text || "").toLowerCase();
    var src = String(source || "general");
    var clearlyDeparture = /\b(?:depart|departure|check[\s-]?out|late\s+co|wake[\s-]?up|taxi|addison|collect\s+b4|before\s+checkout|before\s+check-out)\b/.test(lower);
    var clearlyArrival = /\b(?:arriv|eta|check[\s-]?in|vip\s+due|welcome|twin\s+pls|room\s+setup)\b/.test(lower);

    if (src === "arrivals" && clearlyDeparture && !clearlyArrival) return "departures";
    if (src === "departures" && clearlyArrival && !clearlyDeparture) return "arrivals";
    return src;
  }

  /**
   * Immutable source-notes snapshot for a generated handover.
   * Future item-level tracing can reference sourceNotes.id + section id / line index.
   */
  function captureSourceNotes(partsOrText, options) {
    options = options || {};
    var parts;
    if (partsOrText && typeof partsOrText === "object" && !Array.isArray(partsOrText)) {
      parts = normalizeParts(partsOrText);
    } else {
      parts = splitCombined(partsOrText || "");
    }
    var parsed = parseSectionedNotes(parts);
    var id = options.id || ("src-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7));
    return {
      id: id,
      version: 1,
      capturedAt: options.capturedAt || new Date().toISOString(),
      parts: parsed.parts,
      combined: parsed.combinedText,
      /* Lightweight line index for later source tracing (not shown in UI yet). */
      lines: parsed.lines.map(function (line, index) {
        return {
          id: id + "-L" + (index + 1),
          source: line.source,
          text: line.text,
          index: index
        };
      })
    };
  }

  /**
   * View model for the Source Notes panel / print.
   * Prefers structured parts; falls back to a single original-notes block.
   */
  function buildSourceNotesViewModel(source) {
    if (!source) {
      return { hasContent: false, mode: "empty", sections: [], fallbackText: "" };
    }

    var parts = null;
    var fallbackText = "";
    if (source.parts) {
      parts = normalizeParts(source.parts);
    } else if (typeof source === "string") {
      parts = splitCombined(source);
      if (!hasContent(parts) && String(source).trim()) {
        fallbackText = String(source);
        parts = null;
      }
    } else if (source.combined || source.originalNotes || source.text) {
      var raw = source.combined || source.originalNotes || source.text;
      parts = splitCombined(raw);
      if (!hasContent(parts) && String(raw || "").trim()) {
        fallbackText = String(raw);
        parts = null;
      }
    }

    if (parts && hasContent(parts)) {
      var sections = [];
      SECTION_DEFS.forEach(function (def) {
        var body = String(parts[def.id] || "").replace(/\s+$/g, "");
        if (!body.trim()) return;
        sections.push({
          id: def.id,
          title: def.title,
          text: body
        });
      });
      return {
        hasContent: sections.length > 0,
        mode: "sections",
        id: source.id || "",
        sections: sections,
        fallbackText: ""
      };
    }

    if (fallbackText.trim()) {
      return {
        hasContent: true,
        mode: "fallback",
        id: source.id || "",
        sections: [{
          id: "original",
          title: "Original notes",
          text: fallbackText.replace(/\s+$/g, "")
        }],
        fallbackText: fallbackText
      };
    }

    return { hasContent: false, mode: "empty", sections: [], fallbackText: "" };
  }

  var Api = {
    SECTION_DEFS: SECTION_DEFS,
    SECTION_IDS: SECTION_IDS,
    emptyParts: emptyParts,
    normalizeParts: normalizeParts,
    hasContent: hasContent,
    combineForAi: combineForAi,
    combinePlain: combinePlain,
    splitCombined: splitCombined,
    parseSectionedNotes: parseSectionedNotes,
    resolveSourceBias: resolveSourceBias,
    captureSourceNotes: captureSourceNotes,
    buildSourceNotesViewModel: buildSourceNotesViewModel
  };

  global.HFHandoverNotesSections = Api;
  if (typeof module !== "undefined" && module.exports) module.exports = Api;
})(typeof window !== "undefined" ? window : globalThis);
