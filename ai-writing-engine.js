/**
 * Hospitality Flow — AI Writing Engine
 *
 * Shared text-processing layer for every AI feature:
 * Hotel Brain, Shift Handover, Policies, SOP, Operations,
 * Inventory, Maintenance, Guest Preferences, Checklists,
 * Knowledge Layer, and future modules.
 *
 * Voice: rewrite every operational note as an experienced Duty Manager
 * handing over to the next shift — complete hospitality language,
 * expanded abbreviations, obvious operational context, and actionable
 * next steps. Clarity over brevity. Preserve every factual detail;
 * never invent information.
 *
 * Rule-based v1 — modular surface for a future LLM backend.
 *
 * E1 responsibility boundary:
 * - Owns extraction support, structured operational-fact field parsing,
 *   wording and presentation prose.
 * - Does NOT own cross-module recommendations, ranking, or conflict reasoning.
 * - Hospitality Intelligence Engine (shift-intelligence-engine.js) owns
 *   operational reasoning. Modules must not add a second recommendation system.
 */
(function (global) {
  "use strict";

  var ENGINE_VERSION = 1;
  var DEFAULT_CURRENCY = "£";

  var MODULES = {
    handover: "handover",
    hotelBrain: "hotelBrain",
    policy: "policy",
    knowledge: "knowledge",
    sop: "sop",
    operations: "operations",
    inventory: "inventory",
    maintenance: "maintenance",
    guestPreferences: "guestPreferences",
    checklists: "checklists",
    general: "general"
  };

  /* ------------------------------------------------------------------ */
  /*  Utilities                                                         */
  /* ------------------------------------------------------------------ */

  function trimText(value) {
    return String(value || "").trim();
  }

  function noteContains(text, terms) {
    var lower = String(text || "").toLowerCase();
    return terms.some(function (term) {
      return lower.indexOf(String(term).toLowerCase()) !== -1;
    });
  }

  function capitalize(str) {
    var s = trimText(str);
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function tidyPhrase(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .replace(/\s+([,.;!?])/g, "$1")
      /* Keep clock times intact (12:00) — only pad non-time colons */
      .replace(/([,;])\s*/g, "$1 ")
      .replace(/(\D):(\s*)/g, "$1: ")
      .replace(/(\d):(\s+)(\d)/g, "$1:$3")
      .replace(/\s{2,}/g, " ")
      .trim()
      .replace(/^[,;:\-–—]\s*/, "")
      .replace(/\s*[,;:\-–—]$/, "");
  }

  function ensureSentence(text) {
    var s = tidyPhrase(text);
    if (!s) return "";
    s = capitalize(s);
    if (!/[.!?]$/.test(s)) s += ".";
    return s;
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function joinNatural(parts) {
    var clean = (parts || []).filter(Boolean);
    if (!clean.length) return "";
    if (clean.length === 1) return clean[0];
    if (clean.length === 2) return clean[0] + " and " + clean[1];
    return clean.slice(0, -1).join(", ") + " and " + clean[clean.length - 1];
  }

  function countWord(n, singular, plural) {
    var word = n === 1 ? singular : (plural || singular + "s");
    var numberWords = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
    var num = n < numberWords.length ? numberWords[n] : String(n);
    return num + " " + word;
  }

  function numberWord(n) {
    var numberWords = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
    if (n < numberWords.length) return numberWords[n];
    return String(n);
  }

  /* ------------------------------------------------------------------ */
  /*  Protected tokens (never invent / never corrupt)                   */
  /* ------------------------------------------------------------------ */

  function extractMoney(text) {
    var matches = [];
    var re = /(?:£|\$|€)\s*[\d,.]+|\b\d+(?:\.\d{1,2})?\s*(?:pounds?|pound|gbp|usd|euros?|eur)\b|\b\d+\s*(?:per\s+)?(?:extra\s+)?(?:per\s+)?night\b/gi;
    var m;
    while ((m = re.exec(String(text || ""))) !== null) {
      matches.push(m[0]);
    }
    return matches;
  }

  function extractTimes(text) {
    var matches = [];
    var re = /\b(?:\d{1,2}[:.]\d{2}\s*(?:am|pm)?|\d{1,2}\s*(?:am|pm)|noon|midnight|midday)\b/gi;
    var m;
    while ((m = re.exec(String(text || ""))) !== null) {
      matches.push(m[0]);
    }
    return matches;
  }

  function extractGuestNames(text) {
    var names = [];
    var re = /\b((?:mr|mrs|ms|miss|dr)\.?\s+[A-Za-z][A-Za-z'-]+)/gi;
    var m;
    while ((m = re.exec(String(text || ""))) !== null) {
      var raw = m[1].replace(/\s+/g, " ").trim();
      /* Normalise title casing: Mr Henderson */
      raw = raw.replace(/^(mr|mrs|ms|miss|dr)\.?/i, function (title) {
        var base = title.replace(/\./g, "").toLowerCase();
        return base.charAt(0).toUpperCase() + base.slice(1);
      });
      raw = raw.replace(/\s+([a-z])/g, function (_, ch) {
        return " " + ch.toUpperCase();
      });
      names.push(raw);
    }
    return names;
  }

  function extractRoomNumbers(text) {
    var rooms = [];
    var seen = {};

    function addRoom(num) {
      if (global.ShiftIntelligenceEngine && global.ShiftIntelligenceEngine.normalizeRoomNumber) {
        num = global.ShiftIntelligenceEngine.normalizeRoomNumber(num);
        if (!num) return;
      } else {
        num = String(num).toUpperCase();
        var parsed = parseInt(num, 10);
        if (isNaN(parsed) || parsed < 1 || parsed > 9999) return;
      }
      if (seen[num]) return;
      seen[num] = true;
      rooms.push(num);
    }

    var source = String(text || "");

    /* Multi-room lists: "Rooms 12 and 14", "Rooms 12, 14 & 16" */
    var listPattern = /\brooms?\s+((?:\d{1,4}[a-z]?)(?:\s*(?:,|&|and|\/)\s*\d{1,4}[a-z]?)*)/gi;
    var listMatch;
    listPattern.lastIndex = 0;
    while ((listMatch = listPattern.exec(source)) !== null) {
      String(listMatch[1] || "").split(/\s*(?:,|&|and|\/)\s*/i).forEach(function (part) {
        var m = String(part || "").match(/(\d{1,4}[a-z]?)/i);
        if (m) addRoom(m[1]);
      });
    }

    /* Primary room references (source room / subject of the note) */
    var primaryPatterns = [
      /\broom\s*[#.]?\s*(\d{1,4}[a-z]?)\b/gi,
      /\brm\.?\s*(\d{1,4}[a-z]?)\b/gi,
      /\bsuite\s*[#.]?\s*(\d{1,4}[a-z]?)\b/gi,
      /\bguest\s+(?:in|at)\s+(\d{1,4}[a-z]?)\b/gi
    ];

    primaryPatterns.forEach(function (pattern) {
      var match;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(source)) !== null) {
        addRoom(match[1]);
      }
    });

    /* Bare leading room number: "11 iron board…" (no global flag — avoids ^/g loops) */
    var bareLead = source.match(/^\s*(\d{1,4}[a-z]?)\b(?=\s+(?!am\b|pm\b))/i);
    if (bareLead) addRoom(bareLead[1]);

    /* Maintenance follow-up lists: "follow up 51, 42, and 16" */
    var followList = source.match(/\bfollow[\s-]*up\s+(\d{1,4}[a-z]?(?:\s*,\s*\d{1,4}[a-z]?)*(?:\s*,?\s*and\s*\d{1,4}[a-z]?)?)/i);
    if (followList) {
      String(followList[1]).split(/\s*(?:,|&|and)\s*/i).forEach(function (part) {
        var m = String(part || "").match(/(\d{1,4}[a-z]?)/i);
        if (m) addRoom(m[1]);
      });
    }

    /* Opera-style: "Simon Ringer 24 29/07/2026" or "John 33 29/07/2026" */
    var operaRoom = source.match(
      /\b[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'’-]+(?:\s*,\s*[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'’-]+)?(?:\s+[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'’-]+)+\s+(\d{1,4}[a-z]?)\s+\d{1,2}[\/\-]\d{1,2}/
    );
    if (operaRoom) addRoom(operaRoom[1]);
    var operaRoomAlt = source.match(/\b([A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'’-]+)\s+(\d{1,4}[a-z]?)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
    if (operaRoomAlt && !/\broom\b/i.test(operaRoomAlt[0])) addRoom(operaRoomAlt[2]);

    /* Destination-only references are ignored for the lead room list unless
       no primary room was found (e.g. "moving to 51" alone). */
    if (!rooms.length) {
      var destPatterns = [
        /\b(?:in|at|to|from)\s+room\s+(\d{1,4}[a-z]?)\b/gi,
        /\bmov(?:e|ing|ed)\s+to\s+(\d{1,4}[a-z]?)\b/gi,
        /\brelocated?\s+to\s+(\d{1,4}[a-z]?)\b/gi
      ];
      destPatterns.forEach(function (pattern) {
        var match;
        pattern.lastIndex = 0;
        while ((match = pattern.exec(source)) !== null) {
          addRoom(match[1]);
        }
      });
    }

    return rooms;
  }

  function formatTime(raw, prefs) {
    var t = trimText(raw);
    if (!t) return "";
    var lower = t.toLowerCase();
    if (lower === "noon" || lower === "midday") return "12:00 PM";
    if (lower === "midnight") return "12:00 AM";

    var ampm = t.match(/^(\d{1,2})\s*(am|pm)$/i);
    if (ampm) {
      return ampm[1] + ":00 " + ampm[2].toUpperCase();
    }

    var clock = t.match(/^(\d{1,2})[:.](\d{2})\s*(am|pm)?$/i);
    if (clock) {
      var hour = parseInt(clock[1], 10);
      var mins = clock[2];
      var meridiem = clock[3];
      if (meridiem) {
        return hour + ":" + mins + " " + meridiem.toUpperCase();
      }
      /* Preserve explicit 24-hour clock times unchanged */
      return hour + ":" + mins;
    }

    var bare = t.match(/^(\d{1,2})$/);
    if (bare) {
      var h = parseInt(bare[1], 10);
      if (h === 12) return "12:00 PM";
      if (h === 0) return "12:00 AM";
      if (h > 12) return (h - 12) + ":00 PM";
      return h + ":00 " + (h < 12 ? "AM" : "PM");
    }

    return t;
  }

  function formatMoneyAmount(raw, currency) {
    var cur = currency || DEFAULT_CURRENCY;
    var text = trimText(raw);
    if (!text) return "";
    if (/^[£$€]/.test(text)) return text.replace(/\s+/g, "");
    var num = text.match(/(\d+(?:[.,]\d{1,2})?)/);
    if (!num) return text;
    return cur + num[1].replace(",", "");
  }

  function extractPrimaryAmount(text, currency) {
    var source = String(text || "");
    var m = source.match(/(?:£|\$|€)\s*([\d,.]+)/);
    if (m) return formatMoneyAmount(m[0], currency);
    m = source.match(/\b(\d+(?:\.\d{1,2})?)\s*(?:pounds?|pound|gbp)\b/i);
    if (m) return formatMoneyAmount(m[1], currency || "£");
    m = source.match(/\b(\d+(?:\.\d{1,2})?)\s*£/);
    if (m) return formatMoneyAmount(m[1], "£");
    m = source.match(/\b(\d+(?:\.\d{1,2})?)\s*(?:dollars?|usd)\b/i);
    if (m) return formatMoneyAmount(m[1], "$");
    m = source.match(/\b(\d+(?:\.\d{1,2})?)\s*(?:euros?|eur)\b/i);
    if (m) return formatMoneyAmount(m[1], "€");
    /* Bare number next to paid / charge / upgrade / per night / pound */
    m = source.match(/\b(?:paid|charge|upgrade|extra|fee|cost|price|pound|£)\s*(\d+(?:\.\d{1,2})?)\b/i);
    if (m) return formatMoneyAmount(m[1], currency);
    m = source.match(/\b(\d+(?:\.\d{1,2})?)\s*(?:per\s+)?(?:extra\s+)?(?:per\s+)?night\b/i);
    if (m) return formatMoneyAmount(m[1], currency);
    return "";
  }

  /* ------------------------------------------------------------------ */
  /*  Spelling + abbreviation normalisation                             */
  /* ------------------------------------------------------------------ */

  var SPELLING_FIXES = [
    [/\bireon\b/gi, "iron"],
    [/\bironingbord\b/gi, "ironing board"],
    [/\biron\s+bord\b/gi, "iron board"],
    [/\baircon\b/gi, "air con"],
    [/\bairconditioning\b/gi, "air conditioning"],
    [/\bchekin\b/gi, "check-in"],
    [/\bchekout\b/gi, "check-out"],
    [/\bcheckot\b/gi, "check-out"],
    [/\breciept\b/gi, "receipt"],
    [/\brecieve\b/gi, "receive"],
    [/\bseperate\b/gi, "separate"],
    [/\boccurence\b/gi, "occurrence"],
    [/\bmaintanance\b/gi, "maintenance"],
    [/\bmaintainance\b/gi, "maintenance"],
    [/\bacomodation\b/gi, "accommodation"],
    [/\baccomodation\b/gi, "accommodation"],
    [/\breseration\b/gi, "reservation"],
    [/\bresrvation\b/gi, "reservation"],
    [/\bbreakfest\b/gi, "breakfast"],
    [/\bhouekeeping\b/gi, "housekeeping"],
    [/\bhouskeeping\b/gi, "housekeeping"],
    [/\bavaliable\b/gi, "available"],
    [/\bavailble\b/gi, "available"],
    [/\bdefinately\b/gi, "definitely"],
    [/\btommorrow\b/gi, "tomorrow"],
    [/\btommorow\b/gi, "tomorrow"],
    [/\bwedsday\b/gi, "Wednesday"],
    [/\bthrusday\b/gi, "Thursday"],
    [/\bteh\b/gi, "the"],
    [/\bnigh\b(?=\s|$|[.,!?])/gi, "night"],
    [/\badpater\b/gi, "adapter"],
    [/\badpaters\b/gi, "adapters"],
    [/\badaptor\b/gi, "adapter"],
    [/\badaptors\b/gi, "adapters"]
  ];

  var HANDOVER_ACTION_PATTERNS = [
    /\bPlease\s+arrange\s+for\s+Maintenance\s+to\s+attend\b/i,
    /\bMaintenance\s+to\s+attend\b/i,
    /\bReception\s+to\s+collect\b/i,
    /\bChase\s+(?:Maintenance\s+)?for\s+an\s+update\b/i,
    /\bIncoming\s+team\s+to\s+action\b/i,
    /\bPlease\s+follow\s+up\s+during\s+this\s+shift\b/i,
    /\bPlease\s+advise\s+Housekeeping\b/i,
    /\bupdate\s+the\s+incoming\s+team\b/i
  ];

  var ABBREVIATIONS = [
    [/\bc\/o\b/gi, "check-out"],
    [/\bc\/i\b/gi, "check-in"],
    [/\blate\s*c\/?o\b/gi, "late check-out"],
    [/\bearly\s*c\/?i\b/gi, "early check-in"],
    [/\bco\b(?=\s+(?:at|until|to|for|approved|confirmed|requested|noon|midday|\d))/gi, "check-out"],
    [/\blate\s+co\b/gi, "late check-out"],
    [/\ba\/c\b/gi, "air conditioning"],
    [/\bac\b(?=\s|$|[.,!?])/gi, "air conditioning"],
    [/\bair\s*con\b/gi, "air conditioning"],
    [/\bdnd\b/gi, "DND"],
    [/\bh\/k\b/gi, "housekeeping"],
    [/\bhk\b(?=\s|$|[.,!?])/gi, "housekeeping"],
    [/\bf\/o\b/gi, "front office"],
    [/\bdm\b(?=\s|$|[.,!?])/gi, "Duty Manager"],
    [/\bgm\b(?=\s|$|[.,!?])/gi, "General Manager"],
    [/\beta\b/gi, "ETA"],
    [/\bw\/u\b/gi, "wake-up"],
    [/\bw\/\b/gi, "with"],
    [/\bre\b(?=\s)/gi, "regarding"],
    [/\bpls\b/gi, "please"],
    [/\bplz\b/gi, "please"],
    [/\btmrw\b/gi, "tomorrow"],
    [/\btmr\b/gi, "tomorrow"],
    [/\btoday\s+am\b/gi, "this morning"],
    [/\btoday\s+pm\b/gi, "this afternoon"],
    [/\bspeak\s+(?:in\s+)?(?:the\s+)?morning\b/gi, "follow up in the morning"],
    [/\bspeak\s+morning\b/gi, "follow up in the morning"],
    [/\bcall\s+morning\b/gi, "call in the morning"],
    [/\bupd\b/gi, "update"],
    [/\bres\b(?=\s|$|[.,!?])/gi, "reservation"],
    [/\bext(?:end)?\s+stay\b/gi, "extend stay"],
    [/\bwants?\s+extend\b/gi, "wants to extend"],
    [/\biron\s+board\b/gi, "iron and ironing board"],
    [/\bironing\s+board\s+with\s+iron\b/gi, "iron and ironing board"],
    [/\biron\s+and\s+board\b/gi, "iron and ironing board"],
    [/\bwith\s+iron\b/gi, "and iron"],
    [/\b(\d+(?:\.\d{1,2})?)\s*pounds?\b/gi, "£$1"],
    [/\bpounds?\b/gi, "£"]
  ];

  var TERMINOLOGY = [
    [/\bcheck\s*out\b/gi, "check-out"],
    [/\bcheck\s*in\b/gi, "check-in"],
    [/\blate\s+checkout\b/gi, "late check-out"],
    [/\bearly\s+checkin\b/gi, "early check-in"],
    [/\bminibar\b/gi, "minibar"],
    [/\bfront\s+desk\b/gi, "reception"],
    [/\bconcierge\s+desk\b/gi, "concierge"],
    [/\bguest\s+moved\b/gi, "guest relocated"],
    [/\bmoving\s+to\b/gi, "relocating to"],
    [/\broom\s+move\b/gi, "room relocation"],
    [/\bupset\b/gi, "upset"],
    [/\bcomplaining\b/gi, "complaint"]
  ];

  function correctSpelling(text) {
    var result = String(text || "");
    SPELLING_FIXES.forEach(function (pair) {
      result = result.replace(pair[0], pair[1]);
    });
    return result;
  }

  function expandAbbreviations(text) {
    var result = String(text || "");
    ABBREVIATIONS.forEach(function (pair) {
      result = result.replace(pair[0], pair[1]);
    });
    return result;
  }

  function standardiseTerminology(text) {
    var result = String(text || "");
    TERMINOLOGY.forEach(function (pair) {
      result = result.replace(pair[0], pair[1]);
    });
    return result;
  }

  function normalizeInput(text) {
    var result = trimText(text);
    result = correctSpelling(result);
    result = expandAbbreviations(result);
    result = standardiseTerminology(result);
    result = result
      .replace(/\s*[–—]\s*/g, " – ")
      .replace(/\s{2,}/g, " ");
    return tidyPhrase(result);
  }

  /* ------------------------------------------------------------------ */
  /*  Preference pipeline                                               */
  /* ------------------------------------------------------------------ */

  function applyToneToText(text, prefs) {
    var tone = (prefs && prefs.tone) || "professional";
    if (tone === "friendly") {
      return text
        .replace(/\brequire immediate attention\b/gi, "need a quick look from the team")
        .replace(/\brequires immediate management attention\b/gi, "needs management to take a look")
        .replace(/\bshould be prioritised\b/gi, "should be top of the list")
        .replace(/\bOverall the\b/g, "All in all, the")
        .replace(/\bnotify the duty manager\b/gi, "let the duty manager know")
        .replace(/\bescalated to the duty manager\b/gi, "passed to the duty manager for support");
    }
    if (tone === "concise") {
      return text
        .replace(/\bOverall the\b/gi, "The")
        .replace(/\bthat should be prioritised\b/gi, "to prioritise")
        .replace(/\brequiring immediate attention\b/gi, "needing attention")
        .replace(/\bfor the incoming team\b/gi, "next shift")
        .replace(/\bbefore moving to the next step\b/gi, "before continuing")
        .replace(/\sand confirm completion before proceeding\b/gi, "then continue")
        .replace(/\s+/g, " ")
        .trim();
    }
    return text;
  }

  function applyLanguageVariant(text, prefs) {
    var lang = (prefs && prefs.language) || "British English";
    if (lang === "American English") {
      return text
        .replace(/\bauthorise\b/gi, "authorize")
        .replace(/\bauthorised\b/gi, "authorized")
        .replace(/\bauthorisation\b/gi, "authorization")
        .replace(/\bprioritised\b/gi, "prioritized")
        .replace(/\borganised\b/gi, "organized")
        .replace(/\brecognised\b/gi, "recognized")
        .replace(/\bcentre\b/gi, "center");
    }
    if (lang === "British English") {
      return text
        .replace(/\bauthorize\b/gi, "authorise")
        .replace(/\bauthorized\b/gi, "authorised")
        .replace(/\bauthorization\b/gi, "authorisation")
        .replace(/\bprioritized\b/gi, "prioritised")
        .replace(/\borganized\b/gi, "organised")
        .replace(/\brecognized\b/gi, "recognised")
        .replace(/\bcenter\b/gi, "centre");
    }
    return text;
  }

  function applyCustomInstructions(text, prefs) {
    var instructions = trimText(prefs && prefs.instructions);
    if (!instructions) return text;

    instructions.split(/\n+/).forEach(function (line) {
      var trimmed = line.trim();
      if (!trimmed) return;

      var useNotMatch = trimmed.match(/use\s+['"]?([^'"]+?)['"]?\s+not\s+['"]?([^'".]+?)['"]?/i);
      if (useNotMatch) {
        var preferred = useNotMatch[1].trim();
        var avoid = useNotMatch[2].trim();
        if (preferred && avoid) {
          var re = new RegExp("\\b" + escapeRegExp(avoid) + "\\b", "gi");
          text = text.replace(re, preferred);
        }
      }

      var alwaysUseMatch = trimmed.match(/always\s+(?:refer to|use|call)\s+['"]?([^'"]+?)['"]?/i);
      if (alwaysUseMatch && alwaysUseMatch[1]) {
        var phrase = alwaysUseMatch[1].trim();
        if (/guest/i.test(phrase) && /customer/i.test(trimmed)) {
          text = text.replace(/\bcustomers?\b/gi, /guest/i.test(phrase) ? "guest" : phrase);
        }
      }
    });

    return text;
  }

  function applyTerminologyMap(text, terminologyMap, platformLabels, uiLabels) {
    if (!text) return text;
    var result = text;

    if (platformLabels && uiLabels) {
      Object.keys(platformLabels).forEach(function (key) {
        var platform = platformLabels[key];
        var hotel = uiLabels[key];
        if (platform && hotel && platform !== hotel) {
          var re = new RegExp(escapeRegExp(platform), "gi");
          result = result.replace(re, hotel);
        }
      });
    }

    if (terminologyMap) {
      Object.keys(terminologyMap).forEach(function (key) {
        var entry = terminologyMap[key];
        if (!entry || !entry.term) return;
        if (entry.definition) {
          var definition = String(entry.definition).toLowerCase();
          ["shift handover", "handover", "guest service", "duty manager", "front office", "housekeeping"].forEach(function (phrase) {
            if (definition.indexOf(phrase) === -1) return;
            var phraseRe = new RegExp(escapeRegExp(phrase), "gi");
            result = result.replace(phraseRe, entry.term);
          });
        }
        var termRe = new RegExp("\\b" + escapeRegExp(entry.term) + "\\b", "gi");
        if (termRe.test(result)) {
          result = result.replace(termRe, entry.term);
        }
      });
    }

    return result;
  }

  function applyPreferences(text, options) {
    var prefs = (options && options.prefs) || options || {};
    var processed = applyToneToText(String(text || ""), prefs);
    processed = applyLanguageVariant(processed, prefs);
    processed = applyCustomInstructions(processed, prefs);
    processed = applyTerminologyMap(
      processed,
      prefs.terminologyMap || (options && options.terminologyMap),
      prefs.platformLabels || (options && options.platformLabels),
      prefs.uiLabels || (options && options.uiLabels)
    );
    return processed;
  }

  /* ------------------------------------------------------------------ */
  /*  Pattern detectors                                                 */
  /* ------------------------------------------------------------------ */

  function stripRoomLead(text, room) {
    var cleaned = String(text || "");
    if (room) {
      cleaned = cleaned
        .replace(new RegExp("\\b(?:room|rm\\.?|suite)\\s*[#.]?\\s*" + escapeRegExp(room) + "\\b", "gi"), "")
        .replace(new RegExp("^\\s*" + escapeRegExp(room) + "\\b", "i"), "");
    }
    cleaned = cleaned
      .replace(/^\s*\d{1,4}[a-z]?\b/i, "")
      .replace(/^[,\-–—:\s]+/, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    return cleaned;
  }

  function detectLateCheckout(text) {
    return /\blate\s+check-?out\b/i.test(text) || /\blate\s+c\/?o\b/i.test(text);
  }

  function detectExtendStay(text) {
    return /\bextend(?:ing|ed)?\s+(?:their\s+|the\s+)?stay\b/i.test(text) ||
      /\bwants?\s+to\s+extend\b/i.test(text) ||
      /\bextend\s+stay\b/i.test(text) ||
      /\bstay\s+extension\b/i.test(text);
  }

  function detectRoomMove(text) {
    return /\bmov(?:e|ing|ed)\s+to\b/i.test(text) ||
      /\brelocat(?:e|ed|ing)\b/i.test(text) ||
      (/\bupgrade(?:d)?\b/i.test(text) && /\bto\s+(?:room\s+)?\d+/i.test(text));
  }

  function detectIronRequest(text) {
    return /\biron(?:ing)?\s+board\b/i.test(text) ||
      /\biron\b/i.test(text) && /\bboard\b/i.test(text) ||
      /\biron(?:ing)?\s+requested\b/i.test(text);
  }

  function detectAcIssue(text) {
    return /\bair\s+conditioning\b/i.test(text) ||
      /\ba\/c\b/i.test(text) ||
      /\bac\b/i.test(text) ||
      /\bair\s*con\b/i.test(text) ||
      /\bnot\s+cooling\b/i.test(text);
  }

  function detectComplaint(text) {
    return noteContains(text, [
      "upset", "angry", "complaint", "complain", "unhappy",
      "dissatisfied", "annoyed", "frustrated", "not happy"
    ]);
  }

  function isRequestLanguage(text) {
    return noteContains(text, [
      "request", "requested", "asking", "asked", "would like",
      "wants", "want", "needs", "need", "please"
    ]);
  }

  function isConfirmedLanguage(text) {
    return noteContains(text, [
      "approved", "confirmed", "agreed", "granted", "authorised",
      "authorized", "ok'd", "okayed", "arranged"
    ]);
  }

  function extractUntilTime(text, prefs) {
    var until = String(text || "").match(
      /(?:until|till|to|at|by)\s+(\d{1,2}[:.]?\d{0,2}\s*(?:am|pm)?|noon|midnight|midday)/i
    );
    if (until) return formatTime(until[1], prefs);
    var bareNoon = /\bat\s+noon\b|\bnoon\b/i.test(text);
    if (bareNoon) return "12:00 PM";
    return "";
  }

  function extractDestinationRoom(text, sourceRooms) {
    var m = String(text || "").match(
      /(?:mov(?:e|ing|ed)|relocat(?:e|ed|ing)|upgrade(?:d)?)\s+to\s+(?:room\s*)?(\d{1,4}[a-z]?)\b/i
    );
    if (m) return m[1].toUpperCase();
    var rooms = extractRoomNumbers(text);
    if (rooms.length >= 2) {
      var source = (sourceRooms && sourceRooms[0]) || rooms[0];
      for (var i = 0; i < rooms.length; i++) {
        if (String(rooms[i]) !== String(source)) return rooms[i];
      }
    }
    /* Fallback: bare number after to/into when primary room already known */
    if (sourceRooms && sourceRooms.length) {
      var bare = String(text || "").match(/\b(?:to|into)\s+(\d{1,4}[a-z]?)\b/i);
      if (bare && String(bare[1]).toUpperCase() !== String(sourceRooms[0]).toUpperCase()) {
        return bare[1].toUpperCase();
      }
    }
    return "";
  }

  /* ------------------------------------------------------------------ */
  /*  Operational note rewriting (Duty Manager handover voice)          */
  /* ------------------------------------------------------------------ */

  function appendAction(body, action) {
    var base = tidyPhrase(body).replace(/\.$/, "");
    var next = tidyPhrase(action).replace(/\.$/, "");
    if (!next) return ensureSentence(base);
    if (new RegExp(escapeRegExp(next), "i").test(base)) return ensureSentence(base);
    return ensureSentence(base) + " " + ensureSentence(next);
  }

  function buildLateCheckoutBody(normalized, prefs) {
    var until = extractUntilTime(normalized, prefs);
    var untilBit = until ? " until " + until : "";
    /* Phase 3A: status from language only — never invent HK/DM/guest chase actions.
       Do not treat a bare time as confirmation. */
    if (isConfirmedLanguage(normalized)) {
      return "Late check-out has been confirmed" + untilBit;
    }
    if (isRequestLanguage(normalized)) {
      return "Late check-out has been requested" + untilBit;
    }
    return "Late check-out has been noted" + untilBit;
  }

  function buildExtendStayBody(normalized) {
    /* Phase 3B: extension request only — morning/availability/reservation only if stated. */
    var status;
    if (/\b(?:one|1)\s+night\b/i.test(normalized)) {
      status = "The guest has requested a one-night stay extension";
    } else {
      var nightsMatch = normalized.match(/\b(\d+)\s+nights?\b/i);
      if (nightsMatch) {
        status = "The guest has requested a " + nightsMatch[1] + "-night stay extension";
      } else {
        status = "The guest has requested to extend their stay";
      }
    }
    if (/speak\s+morning|call\s+morning|follow[\s-]*up\s+(?:in\s+)?(?:the\s+)?morning|morning\s+follow/i.test(normalized) ||
        (/\bmorning\b/i.test(normalized) && noteContains(normalized, ["speak", "call", "follow"]))) {
      status += ". Follow-up in the morning is noted";
    }
    if (/\bavailability\b/i.test(normalized) && noteContains(normalized, ["confirm", "check", "verify"])) {
      status += ". Availability confirmation noted";
    }
    if (/update\s+(?:the\s+)?reservation|reservation\s+update/i.test(normalized)) {
      status += ". Reservation update noted";
    }
    return status;
  }

  function buildRoomMoveBody(normalized, rooms, options) {
    var dest = extractDestinationRoom(normalized, rooms);
    var amount = extractPrimaryAmount(normalized, options && options.currency);
    var destBit = dest ? " to Room " + dest : " to another room";
    var status;
    var completedMove = /\b(?:relocated|has been moved|was moved|moved to)\b/i.test(normalized) ||
      (/\bmoved\b/i.test(normalized) && isConfirmedLanguage(normalized));

    /* Phase 3A: never claim relocation or invent PMS posting unless source supports it. */
    if (isRequestLanguage(normalized) && !completedMove) {
      status = "The guest has requested to move" + destBit;
    } else if (completedMove || isConfirmedLanguage(normalized)) {
      status = "The guest has been relocated" + destBit;
    } else {
      status = "Room move" + destBit + " has been noted";
    }

    if (/\bupgrade\b/i.test(normalized) || amount) {
      if (amount) {
        if (/\bpaid\b/i.test(normalized) || isConfirmedLanguage(normalized)) {
          status += ". The upgrade is recorded at an additional charge of " + amount + " per night";
        } else {
          status += ". An upgrade charge of " + amount + " per night is noted";
        }
      } else if (/\bupgrade\b/i.test(normalized)) {
        status += ". Room upgrade noted";
      }
    } else if (amount) {
      status += ". An additional charge of " + amount + " per night is noted";
    }

    return status;
  }

  function buildIronBody(normalized) {
    /* Phase 3B: request status only — no invented delivery/confirmation. */
    var text = normalized || "";
    if (/\biron(?:ing)?\s+board\b/i.test(text) || (/\biron\b/i.test(text) && /\bboard\b/i.test(text))) {
      return "Iron and ironing board requested";
    }
    return "Iron requested";
  }

  function buildAcBody(normalized) {
    /* Phase 3B: AC status only — no invented Maintenance chase or guest follow-up. */
    var status;
    if (detectComplaint(normalized)) {
      if (noteContains(normalized, ["not cooling", "broken", "not working", "faulty"])) {
        status = "Air conditioning is not cooling and the guest is unhappy with the situation";
      } else {
        status = "The guest has reported an air-conditioning issue and is unhappy with the situation";
      }
    } else if (noteContains(normalized, ["not cooling", "broken", "not working", "faulty"])) {
      status = "Air conditioning is not cooling";
    } else {
      status = "An air-conditioning issue has been reported";
    }
    if (noteContains(normalized, ["maintenance", "engineer"]) &&
        noteContains(normalized, ["informed", "notified", "advised"])) {
      status += ". Maintenance has been informed";
      if (noteContains(normalized, ["not attended", "not yet", "awaiting", "eta"])) {
        status += " but attendance is still outstanding";
      }
    }
    return status;
  }

  function buildComplaintBody(normalized) {
    /* Phase 3A/3B: state the complaint only — do not invent contact/escalate/compensation. */
    if (detectAcIssue(normalized)) {
      return buildAcBody(normalized);
    }
    var topic = "";
    if (noteContains(normalized, ["noise"])) topic = " regarding noise";
    else if (noteContains(normalized, ["smell", "odour", "odor"])) topic = " regarding an odour";
    else if (noteContains(normalized, ["clean", "housekeeping"])) topic = " regarding room cleanliness";
    else if (noteContains(normalized, ["wifi", "internet"])) topic = " regarding Wi-Fi";
    return "The guest has raised a complaint" + topic;
  }

  function buildInventoryBody(normalized) {
    /* Phase 3B: inventory/request status only — no invented log/delivery/collection. */
    if (/\badapter/i.test(normalized)) {
      if (noteContains(normalized, ["not return", "not returned", "outstanding", "still"])) {
        return "Loan adapter(s) remain outstanding";
      }
      if (noteContains(normalized, ["request", "requested", "needs", "need", "wants", "want"])) {
        return "Adapter requested";
      }
      if (noteContains(normalized, ["issued", "given", "provided"]) ||
          /\bhas\s+(?:an?\s+)?adapter/i.test(normalized)) {
        return "Adapter issued";
      }
      return "Adapter noted";
    }
    if (detectIronRequest(normalized)) return buildIronBody(normalized);
    if (noteContains(normalized, ["pillow"])) {
      return "Extra pillows requested";
    }
    if (noteContains(normalized, ["towel"])) {
      return "Additional towels requested";
    }
    return "";
  }

  function buildVipBody(normalized, original, guestName, prefs) {
    /* Phase 3B/2C: VIP facts in natural Duty Manager English. */
    var rooms = extractRoomNumbers(original || normalized);
    var hasArrival = noteContains(normalized, ["arriv"]);
    if (!guestName && !rooms.length && !hasArrival &&
        !noteContains(normalized, ["champagne", "flowers", "amenity", "quiet"])) {
      return "";
    }
    var status;
    if (guestName) {
      status = guestName + (/\breturning\b/i.test(normalized) ? " is a returning VIP guest" : " is a VIP guest");
      if (hasArrival) status += " arriving";
    } else {
      status = "A VIP guest" + (hasArrival ? " is arriving" : " requires preparation");
    }
    if (rooms.length === 1) status += (hasArrival || guestName ? " for Room " : " in Room ") + rooms[0];
    var timeMatch = original.match(/\b(\d{1,2}[:.]\d{2}|\d{1,2}\s*(?:am|pm))\b/i) ||
      normalized.match(/\b(\d{1,2}[:.]\d{2}|\d{1,2}\s*(?:am|pm))\b/i);
    if (timeMatch) status += " at " + formatTime(timeMatch[1], prefs);

    var amenityBits = [];
    if (noteContains(normalized, ["champagne"])) amenityBits.push("champagne");
    if (noteContains(normalized, ["flowers"])) amenityBits.push("flowers");
    if (noteContains(normalized, ["water"])) amenityBits.push("extra water");
    if (noteContains(normalized, ["quiet"])) amenityBits.push("a quiet room");
    if (amenityBits.length) {
      status += ". Welcome amenities noted: " + joinNatural(amenityBits);
    }

    return status;
  }

  function buildPaymentBody(normalized, options) {
    /* Phase 3B: payment status only — no invented settle/departure/alt-method advice. */
    var amount = extractPrimaryAmount(normalized, options && options.currency);
    var amountBit = amount ? " of " + amount : "";
    var departureBit = noteContains(normalized, [
      "departure", "departing", "checkout", "check-out", "check out", "checking out"
    ]) ? " before departure" : "";

    if (noteContains(normalized, ["declined"])) {
      var declined = "The guest's card was declined and an outstanding balance" +
        amountBit + " remains on the folio";
      if (departureBit) declined += departureBit;
      if (noteContains(normalized, ["alternative", "another card", "different card", "other payment"])) {
        declined += ". Alternative payment method noted";
      }
      return declined;
    }
    if (noteContains(normalized, ["outstanding", "balance", "folio", "account"])) {
      var accountWord = noteContains(normalized, ["folio"]) ? "folio"
        : "account";
      var openBal = "Outstanding balance" + amountBit + " remains on the " + accountWord;
      if (departureBit) openBal += departureBit;
      return openBal;
    }
    if (noteContains(normalized, ["minibar"])) {
      var mini = "A minibar charge" + amountBit + " requires review";
      if (noteContains(normalized, ["dispute", "not consumed"])) {
        mini += " following a guest dispute";
      }
      return mini;
    }
    if (noteContains(normalized, ["ota", "virtual card", "booking.com", "expedia"])) {
      return "An OTA or channel payment" + amountBit + " still needs to be processed";
    }
    return "";
  }

  function buildMaintenanceBody(normalized, section) {
    if (detectAcIssue(normalized)) return buildAcBody(normalized);
    /* Phase 3A: factual maintenance status only — no invented Reception/safe/chase actions. */
    if (noteContains(normalized, ["leak", "leaking", "shower", "bathroom"])) {
      var leakStatus = noteContains(normalized, ["leak", "leaking"])
        ? "A leak remains open"
        : "A shower issue remains open";
      if (noteContains(normalized, ["shower"]) && noteContains(normalized, ["leak", "leaking"])) {
        leakStatus = "A shower leak remains open";
      } else if (noteContains(normalized, ["bathroom"]) && noteContains(normalized, ["leak", "leaking"])) {
        leakStatus = "A bathroom leak remains open";
      }
      if (noteContains(normalized, ["previous shift", "still", "carried"])) {
        leakStatus += " from the previous shift";
      }
      if (noteContains(normalized, ["urgent", "asap"])) {
        leakStatus += " and requires priority attention";
      }
      if (noteContains(normalized, ["maintenance", "engineer"]) &&
          noteContains(normalized, ["informed", "notified", "advised"])) {
        leakStatus += ". Maintenance has been informed";
      }
      return leakStatus;
    }
    if (noteContains(normalized, ["tv", "remote"])) {
      return "The television remote is not working";
    }
    if (noteContains(normalized, ["heating", "no heat", "cold"])) {
      return "A heating issue has been reported";
    }
    if (noteContains(normalized, ["lock", "key", "cannot enter", "card not"])) {
      return "The guest is experiencing a room access or lock issue";
    }
    return "";
  }

  function buildDeliveryBody(normalized, guestName) {
    /* Phase 3B: held package status only — no invented contact/recording. */
    var status = "Package is being held at Reception";
    if (guestName) status += " for " + guestName;
    if (noteContains(normalized || "", ["contact", "call", "notify", "advise", "phone"])) {
      status += ". Guest contact noted";
    }
    if (noteContains(normalized || "", ["handed over", "collected", "collection recorded", "signed for"])) {
      status += ". Collection/handover noted";
    }
    return status;
  }

  function buildTaskBody(normalized) {
    /* Phase 3B: task/DND status only — no invented cleaning holds or HK completion. */
    if (noteContains(normalized, ["dnd", "do not disturb"])) {
      return "Do Not Disturb is active";
    }
    if (noteContains(normalized, ["pillow"])) {
      return "Extra pillows requested";
    }
    if (noteContains(normalized, ["turndown"])) {
      return "Turndown service has been requested";
    }
    return "";
  }

  function buildLostPropertyBody(normalized, guestName) {
    /* Phase 3B: found/lost status only — no invented secure/log/contact. */
    var detail = String(normalized || "")
      .replace(/\b(?:room|rm\.?|suite)\s*[#.]?\s*\d{1,4}[a-z]?\b/gi, " ")
      .replace(/\blost\s+property\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    detail = tidyPhrase(detail).replace(/\b(?:on|with|for|to|at|from|in)\.?$/i, "").trim();

    if (/\bfound\b/i.test(normalized)) {
      if (detail && !/^found\b/i.test(detail)) {
        return capitalize(detail);
      }
      return "Lost property found";
    }
    if (/\bleft\s+behind\b/i.test(normalized) || /\blost\b/i.test(normalized)) {
      return detail ? capitalize(detail) : "Lost property noted";
    }
    var status = "Lost property noted";
    if (guestName) status += " for " + guestName;
    if (noteContains(normalized, ["secure", "secured", "safe"])) status += ". Item secured as noted";
    if (noteContains(normalized, ["contact", "call", "notify"])) status += ". Guest contact noted";
    if (noteContains(normalized, ["logged", "log", "book"])) status += ". Logged as noted";
    return status;
  }

  function fallbackOperationalBody(normalized, room, options) {
    /* Phase 3A: minimally clean source remnant only — never invent chase actions. */
    var detail = room ? stripRoomLead(normalized, room) : normalized;
    detail = detail
      .replace(/^\[[^\]]+\]\s*/, "")
      .replace(/\bmaintenance (?:has been |was )?informed\b/gi, "Maintenance has been informed")
      .replace(/\bengineer eta\b/gi, "engineer due")
      .replace(/\bstill leaking from previous shift,?\s*urgent\b/gi, "still open from the previous shift and remains urgent")
      .replace(/\bnot cooling properly\b/gi, "not cooling correctly")
      .replace(/\bhas been informed but has not attended yet\b/gi, "has been informed but has not yet attended")
      .replace(/\balready booked\b/gi, "has been booked")
      .replace(/\s{2,}/g, " ");
    detail = tidyPhrase(detail);
    if (!detail) return "";
    return detail;
  }

  function maybeAddFollowUp(body, normalized, options) {
    if (!body) return body;
    if (options && options.addFollowUp === false) return body;
    if (/\bfollow[\s-]*up\b/i.test(body)) return body;
    if (/\bplease\b/i.test(body) && /\b(follow up|arrange|confirm|ensure|advise|contact|settle|chase|collect|issue|update)\b/i.test(body)) {
      return body;
    }

    /* Only append follow-up when the source already asks for it — not from balance/status words alone. */
    var sourceAsksFollowUp =
      /\bfollow[\s-]*up\b/i.test(normalized) ||
      noteContains(normalized, ["speak morning", "call morning", "still need"]) ||
      (/\bpending\b/i.test(normalized) && !/\boutstanding\s+balance\b/i.test(normalized));
    if (!sourceAsksFollowUp) return body;

    if (/morning/i.test(normalized)) {
      return appendAction(body, "Please follow up in the morning");
    }
    return appendAction(body, "Please follow up during this shift");
  }

  /* ------------------------------------------------------------------ */
  /*  Phase 1 — structured operational facts (extract → safe render)    */
  /*  Existing template writer remains the fallback for other notes.    */
  /* ------------------------------------------------------------------ */

  var FACT_STATUS = {
    open: "open",
    requested: "requested",
    confirmed: "confirmed",
    in_progress: "in_progress",
    done: "done",
    unknown: "unknown"
  };

  function createEmptyOperationalFact(sourceText) {
    var src = String(sourceText || "");
    return {
      sourceText: src,
      sourceTexts: src ? [src] : [],
      sourceHistory: [],
      rooms: [],
      subject: "",
      status: FACT_STATUS.unknown,
      ownerDept: "",
      ownerName: "",
      actionVerb: "",
      actionTarget: "",
      details: [],
      sectionHint: "",
      /* Phase 2B operational fields */
      guestName: "",
      arrivalDate: "",
      preferredLocation: "",
      confirmationStatus: "",
      paymentMethod: "",
      package: "",
      guarantee: "",
      guestType: "",
      category: "",
      uncertainty: false
    };
  }

  /**
   * Commercial / reservation language that is NOT a finance issue.
   * POA, breakfast included, guarantee card, room and tax, comps, marketing.
   */
  function isReservationCommercialLanguage(text) {
    var lower = String(text || "").toLowerCase();
    return /\bpoa\b/.test(lower) ||
      /\bpayment\s+on\s+arrival\b/.test(lower) ||
      /\broom\s+and\s+tax\b/.test(lower) ||
      /\binc(?:luded)?\s+breakfast\b/.test(lower) ||
      /\bbreakfast\s+included\b/.test(lower) ||
      /\bcard\s+on\s+file\b/.test(lower) ||
      /\bguarantee\s+only\b/.test(lower) ||
      /\bguarantee\b/.test(lower) && !/\bauthoris|authoriz|pre-?auth|declined\b/.test(lower) ||
      /\bcomp(?:limentary)?\b/.test(lower) ||
      /\binstagram\b/.test(lower) ||
      /\binfluencer\b/.test(lower) ||
      /\bdeliverables?\b/.test(lower) ||
      /\bgrid\s+post\b/.test(lower) ||
      /\bstories\b/.test(lower) && /\binstagram|tag/i.test(lower);
  }

  /**
   * True only for actual financial actions/issues — not reservation packaging.
   */
  function isActualFinancialIssue(text) {
    var src = String(text || "");
    var lower = src.toLowerCase();
    if (isReservationCommercialLanguage(src) &&
        !/\b(?:outstanding\s+balance|unpaid|declined|refund|settle(?:ment)?\s+required|still\s+to\s+pay)\b/i.test(src)) {
      return false;
    }
    return /\boutstanding\s+(?:balance|amount)\b/.test(lower) ||
      /\bunpaid\b/.test(lower) ||
      /\bstill\s+to\s+pay\b/.test(lower) ||
      /\bpayment\s+(?:failed|failure|declined)\b/.test(lower) ||
      /\bcard\s+declined\b/.test(lower) ||
      /\bdeclined\b/.test(lower) && /\b(?:card|payment|pdq|pos)\b/.test(lower) ||
      /\brefund\b/.test(lower) ||
      /\bdeposit\b/.test(lower) && /\b(?:take|collect|hold|release|due|required)\b/.test(lower) ||
      /\bauthoris(?:e|ation)|authoriz(?:e|ation)|pre-?auth\b/.test(lower) ||
      /\bsettlement\s+required\b/.test(lower) ||
      /\bsettle\b/.test(lower) && /\b(?:balance|folio|bill|invoice)\b/.test(lower) ||
      (/\binvoice\b/.test(lower) && /\b(?:unpaid|outstanding|overdue|open)\b/.test(lower)) ||
      (/\bbill\b/.test(lower) && /\b(?:unpaid|outstanding|overdue)\b/.test(lower)) ||
      (/\bfolio\b/.test(lower) && /\b(?:balance|outstanding|unpaid|declined)\b/.test(lower)) ||
      (/\bcharge\b/.test(lower) && /\b(?:dispute|incorrect|extra|minibar)\b/.test(lower));
  }

  /**
   * True only when "settled" / related language has payment or account context.
   * Guest-status uses of "settled" (checked in, comfortable) must not match.
   */
  function hasFinancialSettlementContext(text) {
    if (isReservationCommercialLanguage(text) && !isActualFinancialIssue(text)) return false;
    var lower = String(text || "").toLowerCase();
    return /\bbalance\b/.test(lower) ||
      /\bbill\b/.test(lower) ||
      /\binvoice\b/.test(lower) ||
      /\bfolio\b/.test(lower) ||
      /\baccount\b/.test(lower) ||
      /\bpayment\b/.test(lower) ||
      /\bpaid\b/.test(lower) ||
      /\bcharge\b/.test(lower) ||
      /\boutstanding\s+amount\b/.test(lower);
  }

  /**
   * Clear financial noun for settlement rendering. Empty when subject is unclear
   * (caller should use minimally cleaned sourceText instead of inventing one).
   */
  function financialSettlementNoun(text) {
    var src = String(text || "");
    if (/\binvoice\b/i.test(src)) return "invoice";
    if (/\bbill\b/i.test(src)) return "bill";
    if (/\bpayment\b/i.test(src)) return "payment";
    if (/\bfolio\b/i.test(src)) return "folio";
    if (/\baccount\b/i.test(src)) return "account";
    if (/\bcharge\b/i.test(src)) return "charge";
    if (/\bbalance\b/i.test(src) || /\boutstanding\s+amount\b/i.test(src)) {
      return "outstanding balance";
    }
    return "";
  }

  /**
   * Ordered status classifier: negatives/open first, then completed,
   * then requested / confirmed / in_progress, otherwise unknown.
   * Bare "settled" is financial only when payment/account context is present.
   */
  function classifyFactStatus(text) {
    var lower = String(text || "").toLowerCase();
    var financial = hasFinancialSettlementContext(text);

    if (
      (/\bnot\s+settled\b/.test(lower) && financial) ||
      /\bunpaid\b/.test(lower) ||
      /\bstill\s+outstanding\b/.test(lower) ||
      /\bunresolved\b/.test(lower) ||
      /\bpending\b/.test(lower) ||
      /\bnot\s+completed\b/.test(lower) ||
      /\bnot\s+done\b/.test(lower) ||
      /\bnot\s+fixed\b/.test(lower) ||
      /\bnot\s+resolved\b/.test(lower) ||
      /\bnot\s+(?:yet\s+)?confirmed\b/.test(lower) ||
      /\bunconfirmed\b/.test(lower) ||
      (/\bnot\s+yet\s+(?:settled|paid|cleared|completed|resolved|fixed|done)\b/.test(lower) &&
        (financial || !/\bsettled\b/.test(lower))) ||
      /\bstill\s+to\s+pay\b/.test(lower)
    ) {
      return FACT_STATUS.open;
    }

    if (
      (/\b(?:has\s+been\s+)?settled\b/.test(lower) && financial) ||
      /\b(?:has\s+been\s+)?paid\b/.test(lower) ||
      /\bcleared\b/.test(lower) ||
      /\bcompleted\b/.test(lower) ||
      /\bresolved\b/.test(lower) ||
      /\bfixed\b/.test(lower) ||
      /\bcollected\b/.test(lower) ||
      /\bdelivered\b/.test(lower) ||
      /\bdone\b/.test(lower)
    ) {
      return FACT_STATUS.done;
    }

    if (
      /\bnot\s+booked\b/.test(lower) ||
      /\bnot\s+yet\s+booked\b/.test(lower)
    ) {
      return FACT_STATUS.open;
    }

    if (
      /\b(?:request(?:ed)?|asking|asked|would like|wants?|needs?|maybe|possibly)\b/.test(lower)
    ) {
      return FACT_STATUS.requested;
    }

    if (
      (/\b(?:approved|confirmed|agreed|granted|authorised|authorized)\b/.test(lower) &&
        !/\bnot\s+(?:yet\s+)?(?:approved|confirmed|agreed|granted|authorised|authorized)\b/.test(lower)) ||
      /\balready\s+booked\b/.test(lower) ||
      /\bbooked\b/.test(lower)
    ) {
      return FACT_STATUS.confirmed;
    }

    if (
      /\bin\s+progress\b/.test(lower) ||
      /\bawaiting\b/.test(lower) ||
      /\bbeing\s+(?:handled|processed|repaired|investigated)\b/.test(lower) ||
      /\bchasing\b/.test(lower)
    ) {
      return FACT_STATUS.in_progress;
    }

    return FACT_STATUS.unknown;
  }

  function departmentFromTarget(target) {
    var t = String(target || "").toLowerCase();
    if (t === "maintenance" || t === "engineering") return "Maintenance";
    if (t === "housekeeping") return "Housekeeping";
    if (t === "reception" || t === "front") return "Reception";
    if (t === "concierge") return "Concierge";
    if (t === "manager" || t === "management") return "Duty Manager";
    return capitalize(t);
  }

  function formatOperationalDate(raw) {
    var src = String(raw || "").trim();
    if (!src) return "";
    var m = src.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (!m) return src;
    var day = parseInt(m[1], 10);
    var month = parseInt(m[2], 10);
    var months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    if (month < 1 || month > 12) return src;
    return day + " " + months[month - 1];
  }

  function extractPlainGuestNames(text) {
    var src = String(text || "");
    var names = extractGuestNames(src).slice();
    var re = /\b([A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'’-]+(?:\s+[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'’-]+)+)\b/g;
    var m;
    while ((m = re.exec(src)) !== null) {
      var candidate = m[1].replace(/\s+/g, " ").trim();
      if (/^(Room|Rooms|Suite|Maintenance|Housekeeping|Reception|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December)$/i.test(candidate.split(/\s+/)[0])) {
        continue;
      }
      if (names.indexOf(candidate) === -1) names.push(candidate);
    }
    /* "Skander Malcolm, John" → prefer "John Skander Malcolm" style if comma-reversed */
    var commaName = src.match(
      /\b([A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'’-]+\s+[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'’-]+)\s*,\s*([A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'’-]+)\b/
    );
    if (commaName) {
      var combined = commaName[2] + " " + commaName[1];
      if (names.indexOf(combined) === -1) names.unshift(combined);
    }
    return names;
  }

  function isOperaContinuationSegment(segment) {
    var s = String(segment || "").replace(/^[\s/]+/, "").trim();
    if (!s) return true;
    return /^(room and tax|inc(?:luded)?\s+breakfast|breakfast included|card on file|guarantee|regular guest|poa|payment on arrival|tax inc)/i.test(s) ||
      /\bguarantee only\b/i.test(s) ||
      /^\/?\s*regular guest\b/i.test(s);
  }

  function looksLikeGuestReservationLead(segment) {
    var s = String(segment || "").trim();
    if (/\broom\s*\d+/i.test(s) && /\b(?:wants?|maybe|move|leak|broken|follow)\b/i.test(s)) {
      return false;
    }
    return /[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'’-]+(?:\s+[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'’-]+)+\s+\d{1,4}[a-z]?\s+\d{1,2}[\/\-]\d{1,2}/.test(s) ||
      /[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'’-]+\s*,\s*[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'’-]+.*\d{1,4}[a-z]?\s+\d{1,2}[\/\-]\d{1,2}/.test(s) ||
      (/\b(?:poa|payment on arrival|card on file|room and tax|comp\b)/i.test(s) &&
        /[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'’-]+\s+[A-ZÀ-ÖØ-Þ]/.test(s));
  }

  function looksLikeGuestArrangement(segment) {
    var s = String(segment || "");
    return /\b(?:instagram|influencer|deliverable|grid post|stories|comp(?:limentary)?\s+bed|comp\s+bnb|marketing|partnership)\b/i.test(s);
  }

  /**
   * Phase 2B — split a source note into distinct operational segments.
   * Never merges unrelated guests; keeps Opera continuation fragments with their lead.
   */
  function splitSourceIntoFactSegments(rawText) {
    var text = String(rawText == null ? "" : rawText).trim();
    if (!text) return [];

    var rough = [];
    text.split(/\s*\/\/\s*|\n+/).forEach(function (chunk) {
      var piece = trimText(chunk);
      if (!piece) return;
      /* Also split on ". " when a new Room N / guest-lead starts */
      if (/\.\s+(?=Room\s*\d)/i.test(piece) || /\.\s+(?=[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'’-]+\s+[A-ZÀ-ÖØ-Þ])/.test(piece)) {
        piece.split(/\.\s+(?=Room\s*\d|[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'’-]+\s+[A-ZÀ-ÖØ-Þ])/i).forEach(function (part, idx, arr) {
          var p = trimText(part);
          if (!p) return;
          if (idx < arr.length - 1 && !/[.!?]$/.test(p)) p += ".";
          rough.push(p);
        });
      } else {
        rough.push(piece);
      }
    });

    if (rough.length <= 1) {
      /* Semicolon / double-space separators between distinct rooms */
      if (/;/.test(text)) {
        var semi = text.split(/\s*;\s*/).map(trimText).filter(Boolean);
        if (semi.length > 1) rough = semi;
      }
    }

    var grouped = [];
    rough.forEach(function (segment) {
      if (!grouped.length) {
        grouped.push(segment);
        return;
      }
      if (isOperaContinuationSegment(segment)) {
        grouped[grouped.length - 1] = grouped[grouped.length - 1] + " // " + segment;
        return;
      }
      var prev = grouped[grouped.length - 1];
      if (looksLikeGuestReservationLead(prev) && isOperaContinuationSegment(segment)) {
        grouped[grouped.length - 1] = prev + " // " + segment;
        return;
      }
      grouped.push(segment);
    });

    return grouped.filter(Boolean);
  }

  function enrichOperationalFactFields(fact, options) {
    options = options || {};
    var sourceText = fact.sourceText || "";
    var lower = sourceText.toLowerCase();

    var names = extractPlainGuestNames(sourceText);
    if (names.length) fact.guestName = names[0];

    var dates = extractDates(sourceText);
    if (dates.length) {
      fact.arrivalDate = dates[0];
      fact.details.push({ type: "date", value: dates[0] });
    }

    var floorMatch = sourceText.match(/\b(\d+(?:st|nd|rd|th)?)\s+floor\b/i) ||
      sourceText.match(/\b(first|second|third|fourth|fifth|sixth|ground)\s+floor\b/i);
    if (floorMatch) {
      var floorRaw = floorMatch[1].toLowerCase();
      var floorMap = {
        "1": "first", "1st": "first",
        "2": "second", "2nd": "second",
        "3": "third", "3rd": "third",
        "4": "fourth", "4th": "fourth",
        "5": "fifth", "5th": "fifth",
        "6": "sixth", "6th": "sixth"
      };
      fact.preferredLocation = (floorMap[floorRaw] || floorRaw) + " floor";
      fact.details.push({ type: "preferred_location", value: fact.preferredLocation });
    }

    if (/\bnot\s+(?:yet\s+)?confirmed\b/i.test(sourceText) || /\bunconfirmed\b/i.test(sourceText)) {
      fact.confirmationStatus = "not confirmed";
      fact.uncertainty = true;
    } else if (/\bmaybe\b/i.test(sourceText) || /\bpossibly\b/i.test(sourceText)) {
      fact.uncertainty = true;
      if (!fact.confirmationStatus) fact.confirmationStatus = "possible";
    } else if (/\bconfirmed\b/i.test(sourceText) || /\bagreed\b/i.test(sourceText)) {
      fact.confirmationStatus = "confirmed";
    }

    if (/\bpoa\b/i.test(sourceText) || /\bpayment\s+on\s+arrival\b/i.test(sourceText)) {
      fact.paymentMethod = "payment on arrival";
    }
    if (/\broom\s+and\s+tax\b/i.test(sourceText) && /\bbreakfast\b/i.test(sourceText)) {
      fact.package = "room and breakfast";
    } else if (/\bcomp(?:limentary)?\s+bed(?:\s+and\s+breakfast)?\b/i.test(sourceText) ||
               /\bcomp\s+b(?:ed\s*)?&?\s*b\b/i.test(sourceText)) {
      fact.package = "complimentary bed and breakfast";
    } else if (/\bbreakfast\s+included\b/i.test(sourceText) || /\binc(?:luded)?\s+breakfast\b/i.test(sourceText)) {
      fact.package = "breakfast included";
    }
    if (/\bcard\s+on\s+file\b/i.test(sourceText) || /\bguarantee\b/i.test(sourceText)) {
      fact.guarantee = "card held as guarantee";
    }
    if (/\bregular\s+guest\b/i.test(sourceText)) {
      fact.guestType = "regular guest";
    }

    /* Twin / king bed configuration */
    if (/\bking\b/i.test(sourceText) && /\btwin\b/i.test(sourceText)) {
      fact.subject = "twin_setup";
      fact.actionVerb = "configure";
      fact.ownerDept = fact.ownerDept || "Housekeeping";
      fact.category = "guest-follow-up";
      if (fact.status === FACT_STATUS.unknown || fact.status === FACT_STATUS.confirmed) {
        /* "to be set" is an open action even if arrival details look confirmed */
        if (/\bto\s+be\s+set\b/i.test(sourceText) || /\bset\s+as\s+twin\b/i.test(sourceText)) {
          fact.status = FACT_STATUS.requested;
        }
      }
    }

    if (looksLikeGuestArrangement(sourceText)) {
      fact.subject = "guest_arrangement";
      fact.category = "guest-arrangement";
      fact.sectionHint = fact.sectionHint || "guest";
      fact.ownerDept = fact.ownerDept || "Reception";
      if (!fact.actionVerb) fact.actionVerb = "prepare";
      /* Comp stay with deliverables — confirmed arrangement unless action pending */
      if (/\bcomp\b/i.test(sourceText) || /\bdeliverable|instagram|stories|grid\b/i.test(sourceText)) {
        if (fact.status === FACT_STATUS.unknown) fact.status = FACT_STATUS.confirmed;
      }
    }

    /* Informational Opera reservation — confirmed, not an unresolved finance chase */
    if (
      (fact.paymentMethod || fact.package || fact.guarantee || fact.guestType) &&
      fact.guestName &&
      fact.arrivalDate &&
      !isActualFinancialIssue(sourceText) &&
      !/\b(?:wants?|maybe|move|leak|follow\s*up|not\s+confirmed|to\s+be\s+set)\b/i.test(sourceText)
    ) {
      if (!fact.subject || fact.subject === "payment" || fact.subject === "outstanding_balance" ||
          fact.subject === "folio" || fact.subject === "charge") {
        fact.subject = "reservation_info";
      }
      fact.category = fact.category || "vip";
      fact.sectionHint = fact.sectionHint && fact.sectionHint !== "payments"
        ? fact.sectionHint
        : "vip";
      fact.status = FACT_STATUS.confirmed;
      fact.actionVerb = "";
      fact.ownerDept = fact.ownerDept || "Reception";
    }

    if (fact.subject === "room_move") {
      fact.category = fact.category || "guest-follow-up";
      if (fact.uncertainty || fact.confirmationStatus === "not confirmed") {
        fact.status = FACT_STATUS.requested;
        fact.actionVerb = "confirm";
      }
    }

    if (/\bmaintenance\b/i.test(sourceText) && /\bfollow[\s-]*up\b/i.test(sourceText)) {
      fact.subject = "maintenance";
      fact.actionVerb = "follow_up";
      fact.ownerDept = "Maintenance";
      fact.category = "maintenance";
      if (fact.rooms.length && (fact.status === FACT_STATUS.unknown || fact.status === FACT_STATUS.confirmed)) {
        fact.status = FACT_STATUS.open;
      }
    }

    /* Strip false finance subject when not an actual issue */
    if (!isActualFinancialIssue(sourceText) &&
        /^(outstanding_balance|payment|invoice|bill|folio|account|charge|financial_settlement_unclear)$/.test(fact.subject)) {
      if (fact.subject === "reservation_info" || fact.package || fact.paymentMethod || fact.guarantee) {
        /* already handled */
      } else if (looksLikeGuestArrangement(sourceText)) {
        fact.subject = "guest_arrangement";
      } else if (fact.guestName || fact.arrivalDate) {
        fact.subject = "reservation_info";
        fact.status = FACT_STATUS.confirmed;
      } else {
        fact.subject = fact.subject === "charge" ? "" : fact.subject;
      }
      if (fact.actionVerb === "settle") fact.actionVerb = "";
    }

    return fact;
  }

  function hasUsefulOperationalDetail(fact) {
    if (!fact) return false;
    if ((fact.rooms && fact.rooms.length) || fact.guestName || fact.arrivalDate) return true;
    if (fact.preferredLocation || fact.paymentMethod || fact.package || fact.guarantee) return true;
    if (fact.actionVerb && fact.actionVerb !== "prepare") return true;
    if (fact.subject && !/^(vip_arrival|follow_up)$/.test(fact.subject) && fact.sourceText &&
        fact.sourceText.length > 20) {
      return true;
    }
    var src = String(fact.sourceText || "").trim();
    if (!src || src.length < 12) return false;
    if (/^(maintenance|vip|guest|finance|follow[\s-]*up)\.?$/i.test(src)) return false;
    return /[a-z].*[a-z]/i.test(src) && (/\d/.test(src) || /[A-Z][a-z]+\s+[A-Z]/.test(src));
  }

  /**
   * Professional display text from structured fact fields (Phase 2B).
   */
  function renderOperationalFactDisplay(fact) {
    if (!fact || !hasUsefulOperationalDetail(fact)) return "";

    var lead = "";
    if (fact.rooms && fact.rooms.length === 1) lead = "Room " + fact.rooms[0];
    else if (fact.rooms && fact.rooms.length > 1) lead = "Rooms " + joinNatural(fact.rooms);
    var src = String(fact.sourceText || "");

    if (fact.subject === "room_move") {
      /* Paid upgrades / destination-room moves keep legacy/Phase1 wording */
      var hasMoney = false;
      (fact.details || []).forEach(function (d) {
        if (d && d.type === "money") hasMoney = true;
      });
      if (hasMoney || /\bupgrade\b/i.test(src)) return "";

      var moveBody;
      if (fact.uncertainty || /maybe|possible/i.test(fact.confirmationStatus || "")) {
        moveBody = "The guest may request a room move";
      } else {
        moveBody = "The guest has requested a room move";
      }
      if (fact.preferredLocation) moveBody += " to the " + fact.preferredLocation;
      else {
        var dest = "";
        (fact.details || []).forEach(function (d) {
          if (d && d.type === "destination_room") dest = d.value;
        });
        if (dest) moveBody += " to Room " + dest;
      }
      if (fact.confirmationStatus === "not confirmed" || fact.uncertainty) {
        moveBody += "; this is not yet confirmed";
      }
      return finishFactRender(lead, moveBody);
    }

    if (fact.subject === "twin_setup") {
      var twinBody = "Prepare" + (lead ? " " + lead : " the room") + " with twin beds";
      if (fact.arrivalDate) {
        twinBody += " before the guest arrives on " + formatOperationalDate(fact.arrivalDate);
      } else {
        twinBody += " before arrival";
      }
      return ensureSentence(twinBody);
    }

    if (fact.subject === "maintenance" && fact.rooms && fact.rooms.length) {
      /*
       * Only use the concise multi-room sentence when the note is a
       * follow-up list without a specific fault description.
       */
      if (
        /\bmaintenance\b/i.test(src) &&
        /\bfollow[\s-]*up\b/i.test(src) &&
        !/\b(?:leak|leaking|broken|faulty|air\s*con|a\/c|\bac\b|shower|tv|remote|heating|plumb|drain|flicker)\b/i.test(src)
      ) {
        return ensureSentence(
          "Maintenance follow-up is required for " +
          (fact.rooms.length === 1 ? "Room " + fact.rooms[0] : "Rooms " + joinNatural(fact.rooms))
        );
      }
      return "";
    }

    if (fact.subject === "guest_arrangement") {
      var guestLabel = String(fact.guestName || "")
        .replace(/\s+\b(?:room|rm\.?|suite)\b\.?$/i, "")
        .trim();
      var dualGuests = src.match(
        /\b([A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'’-]+(?:\s+[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'’-]+)?)\s+(?:and|&)\s+([A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'’-]+(?:\s+[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'’-]+)?)\b/
      );
      var pluralGuests = false;
      if (dualGuests &&
          !/^(comp|bed|breakfast|room|tax|grid|post|story|stories|instagram)/i.test(dualGuests[1]) &&
          !/^(comp|bed|breakfast|room|tax|grid|post|story|stories|instagram)/i.test(dualGuests[2])) {
        guestLabel = dualGuests[1] + " and " + dualGuests[2];
        pluralGuests = true;
      }
      var arrParts = [];
      if (/comp(?:limentary)?|bed\s+and\s+breakfast|bed-and-breakfast/i.test(fact.package || src)) {
        arrParts.push(
          (guestLabel
            ? guestLabel + (pluralGuests ? " are staying" : " is staying")
            : "Guests are staying") +
          " on a complimentary bed-and-breakfast arrangement"
        );
      } else if (guestLabel) {
        arrParts.push(guestLabel + " has a special guest arrangement for this stay");
      } else {
        arrParts.push("A complimentary guest arrangement is in place for this stay");
      }
      var deliverableBits = [];
      var grid = src.match(/(\d+)\s+instagram\s+grid\s+posts?/i);
      var stories = src.match(/(\d+)\s*[–—\-]\s*(\d+)\s+instagram\s+stories?/i) ||
        src.match(/(\d+)\s+instagram\s+stories?/i);
      if (grid) {
        deliverableBits.push(grid[1] === "1" ? "one Instagram grid post" : grid[1] + " Instagram grid posts");
      }
      if (stories) {
        if (stories[2]) {
          deliverableBits.push(stories[1] + " to " + stories[2] + " Instagram Stories with tags");
        } else {
          deliverableBits.push(stories[1] === "1" ? "one Instagram Story" : stories[1] + " Instagram Stories");
        }
      }
      if (deliverableBits.length) {
        arrParts.push("Agreed deliverables include " + joinNatural(deliverableBits));
      }
      if (!arrParts.length) return "";
      return finishFactRender(lead, arrParts.join(". "));
    }

    if (fact.subject === "reservation_info" ||
        ((fact.paymentMethod || fact.package || fact.guarantee) && fact.guestName)) {
      var resParts = [];
      if (fact.guestName) {
        resParts.push(
          fact.guestName + " is arriving" +
          (fact.arrivalDate ? " on " + formatOperationalDate(fact.arrivalDate) : "")
        );
      } else if (fact.arrivalDate) {
        resParts.push("Arrival is scheduled for " + formatOperationalDate(fact.arrivalDate));
      }
      if (fact.paymentMethod && /payment on arrival|poa/i.test(fact.paymentMethod)) {
        resParts.push("The reservation is on a payment on arrival basis");
      } else if (fact.paymentMethod) {
        resParts.push("Payment method: " + fact.paymentMethod);
      }
      if (fact.package === "room and breakfast") {
        resParts.push("Room and breakfast are included");
      } else if (fact.package && /comp/i.test(fact.package)) {
        resParts.push("The stay is on a complimentary bed-and-breakfast basis");
      } else if (fact.package) {
        resParts.push(capitalize(fact.package));
      }
      if (fact.guarantee) {
        resParts.push("A card is held as a guarantee");
      }
      if (fact.guestType && /regular/i.test(fact.guestType)) {
        resParts.push("This is a regular guest");
      } else if (fact.guestType) {
        resParts.push(capitalize(fact.guestType));
      }
      if (!resParts.length) return "";
      return finishFactRender(lead, resParts.join(". "));
    }

    /* VIP corporate / commercial notes — only when discount or corporate cues are present */
    if ((fact.subject === "vip_arrival" || /\bvip\b/i.test(src)) && fact.guestName &&
        (/\bcorporate\b/i.test(src) || /\d+\s*%/.test(src) || /\breturning\b/i.test(src))) {
      var vipParts = [];
      var vipLead = fact.guestName;
      if (/\breturning\b/i.test(src)) vipLead += " is a returning VIP";
      else vipLead += " is a VIP";
      if (/\bcorporate\b/i.test(src)) vipLead += " corporate guest";
      else vipLead += " guest";
      if (fact.arrivalDate) vipLead += " arriving on " + formatOperationalDate(fact.arrivalDate);
      else {
        var vipTime = src.match(/\b(\d{1,2}[:.]\d{2}|\d{1,2}\s*(?:am|pm))\b/i);
        if (vipTime) vipLead += " arriving at " + formatTime(vipTime[1]);
        else if (/\barriv/i.test(src)) vipLead += " arriving during this stay";
      }
      vipParts.push(vipLead);

      var barDisc = src.match(/(\d+)\s*%\s*(?:bar\s*)?discount/i) || src.match(/(\d+)\s*%\s*(?:off\s+)?(?:bar|room)/i);
      var fbDisc = src.match(/(\d+)\s*%\s*(?:f\s*[&+]\s*b|food|beverage|fb)/i);
      if (barDisc || fbDisc) {
        var discBits = [];
        if (barDisc) discBits.push("a " + barDisc[1] + "% BAR discount");
        if (fbDisc) discBits.push("a " + fbDisc[1] + "% food and beverage discount");
        vipParts.push("Apply " + joinNatural(discBits) + " to the final invoice");
      }
      return finishFactRender(lead, vipParts.join(". "));
    }

    return "";
  }

  function extractOperationalFacts(rawText, options) {
    options = options || {};
    var segments = splitSourceIntoFactSegments(rawText);
    if (!segments.length) {
      var single = extractOperationalFact(rawText, options);
      return hasUsefulOperationalDetail(single) ? [single] : [];
    }
    return segments.map(function (segment) {
      return extractOperationalFact(segment, options);
    }).filter(hasUsefulOperationalDetail);
  }

  /**
   * Pure extraction: never mutates or strips rooms from sourceText.
   */
  function extractOperationalFact(rawText, options) {
    options = options || {};
    var sourceText = String(rawText == null ? "" : rawText);
    var fact = createEmptyOperationalFact(sourceText);

    fact.rooms = extractRoomNumbers(sourceText).slice();
    if (options.rooms && options.rooms.length) {
      options.rooms.forEach(function (room) {
        var key = String(room).toUpperCase();
        if (fact.rooms.indexOf(key) === -1 && fact.rooms.indexOf(String(room)) === -1) {
          fact.rooms.push(String(room));
        }
      });
    }

    fact.status = classifyFactStatus(sourceText);
    fact.sectionHint = options.section ? String(options.section) : "";
    fact.sourceTexts = sourceText ? [sourceText] : [];
    fact.sourceHistory = sourceText
      ? [{ status: fact.status, sourceText: sourceText, section: fact.sectionHint || "" }]
      : [];

    var followMatch = sourceText.match(/\bfollow[\s-]*up\s+with\s+([A-Za-z][A-Za-z\s]*?)(?=\s+on\b|\s+regarding\b|\s+about\b|[.,;]|$)/i);
    if (followMatch) {
      fact.actionVerb = "follow_up";
      fact.actionTarget = trimText(followMatch[1]).toLowerCase().replace(/\s+/g, " ");
      fact.ownerDept = departmentFromTarget(fact.actionTarget.split(/\s+/)[0]);
      fact.subject = "follow_up";
    }

    if (isActualFinancialIssue(sourceText) &&
        (/\bsettled\b/i.test(sourceText) || /\boutstanding\s+(?:balance|amount)\b/i.test(sourceText) ||
          /\b(?:balance|folio|payment|invoice|bill|declined|refund|deposit|charge)\b/i.test(sourceText))) {
      var noun = financialSettlementNoun(sourceText);
      if (noun === "invoice") fact.subject = "invoice";
      else if (noun === "bill") fact.subject = "bill";
      else if (noun === "payment") fact.subject = "payment";
      else if (noun === "folio") fact.subject = "folio";
      else if (noun === "account") fact.subject = "account";
      else if (noun === "charge") fact.subject = "charge";
      else if (noun) fact.subject = "outstanding_balance";
      else fact.subject = "financial_settlement_unclear";
      if (!fact.ownerDept) fact.ownerDept = "Reception";
      if (!fact.actionVerb && fact.status !== FACT_STATUS.done && fact.status !== FACT_STATUS.confirmed) {
        fact.actionVerb = "settle";
      }
    }

    if (/\blate\s+check-?out\b/i.test(sourceText) || /\blate\s+c\/?o\b/i.test(sourceText)) {
      fact.subject = "late_checkout";
      if (!fact.ownerDept) fact.ownerDept = "Housekeeping";
      if (!fact.actionVerb && fact.status === FACT_STATUS.requested) fact.actionVerb = "confirm";
    }

    if (/\bwake-?\s*up\b/i.test(sourceText) || /\bwakeup\b/i.test(sourceText)) {
      fact.subject = "wake_up";
      if (!fact.ownerDept) fact.ownerDept = "Reception";
      if (!fact.actionVerb && fact.status !== FACT_STATUS.confirmed && fact.status !== FACT_STATUS.done) {
        fact.actionVerb = "confirm";
      }
    }

    if (/\bvip\b/i.test(sourceText) || options.isVip) {
      if (!fact.subject || fact.subject === "follow_up") fact.subject = "vip_arrival";
      if (!fact.ownerDept) fact.ownerDept = "Reception";
      if (!fact.actionVerb && fact.status !== FACT_STATUS.done && fact.status !== FACT_STATUS.confirmed) {
        fact.actionVerb = "prepare";
      }
    }

    if (/\b(?:air\s*con|a\/c|\bac\b|leak|leaking|broken|faulty|repair|maintenance|not cooling|heating)\b/i.test(sourceText) &&
        !fact.subject) {
      fact.subject = "maintenance";
      if (!fact.ownerDept) fact.ownerDept = "Maintenance";
      if (!fact.actionVerb) fact.actionVerb = "follow_up";
    }

    if (/\b(?:extra\s+bed|rollaway|pillow|towel|iron|adapter|amenity)\b/i.test(sourceText) &&
        (!fact.subject || fact.subject === "follow_up")) {
      if (!/\bvip\b/i.test(sourceText)) fact.subject = "guest_request";
      if (!fact.ownerDept) {
        fact.ownerDept = /\b(?:pillow|towel|bed|linen)\b/i.test(sourceText) ? "Housekeeping" : "Reception";
      }
      if (!fact.actionVerb && fact.status === FACT_STATUS.requested) fact.actionVerb = "arrange";
    }

    if (/\b(?:package|parcel|delivery|courier)\b/i.test(sourceText) && !fact.subject) {
      fact.subject = "delivery";
      if (!fact.ownerDept) fact.ownerDept = "Reception";
      if (!fact.actionVerb) fact.actionVerb = "contact";
    }

    if (/\b(?:mov(?:e|ing|ed)|relocat(?:e|ed|ing))\b/i.test(sourceText)) {
      fact.subject = "room_move";
      var dest = extractDestinationRoom(sourceText, fact.rooms);
      if (dest) {
        fact.details.push({ type: "destination_room", value: dest });
      }
      if (!fact.ownerDept) fact.ownerDept = "Reception";
    }

    if (options.section === "maintenance" && !fact.ownerDept) fact.ownerDept = "Maintenance";
    if (options.section === "payments" && !fact.ownerDept) fact.ownerDept = "Reception";
    if (options.section === "vip" && !fact.ownerDept) fact.ownerDept = "Reception";

    var staffMatch = sourceText.match(/\b(?:assigned\s+to|owner[:\s]+|handed\s+to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
    if (staffMatch) {
      fact.ownerName = trimText(staffMatch[1]);
    }

    extractMoney(sourceText).forEach(function (amount) {
      fact.details.push({ type: "money", value: amount });
    });
    extractTimes(sourceText).forEach(function (time) {
      fact.details.push({ type: "time", value: time });
    });

    enrichOperationalFactFields(fact, options);
    return fact;
  }

  /** Map structured fact.status → handover item status id. */
  function mapFactStatusToItemStatus(factStatus) {
    var status = String(factStatus || FACT_STATUS.unknown);
    if (status === FACT_STATUS.done) return "done";
    if (status === FACT_STATUS.confirmed) return "confirmed";
    if (status === FACT_STATUS.in_progress) return "in_progress";
    return "pending";
  }

  /** Open work that should appear in follow-up counts / recommendations. */
  function isFactUnresolved(fact) {
    if (global.ShiftIntelligenceEngine && global.ShiftIntelligenceEngine.isOperationalFactOpen) {
      return global.ShiftIntelligenceEngine.isOperationalFactOpen(fact);
    }
    if (!fact || !fact.status) return true;
    return fact.status !== FACT_STATUS.done && fact.status !== FACT_STATUS.confirmed;
  }

  /** Completed or confirmed — do not chase. Delegates to Hospitality Intelligence Engine when available (E2). */
  function isFactClosed(fact) {
    if (global.ShiftIntelligenceEngine && global.ShiftIntelligenceEngine.isOperationalFactClosed) {
      return global.ShiftIntelligenceEngine.isOperationalFactClosed(fact);
    }
    if (!fact || !fact.status) return false;
    return fact.status === FACT_STATUS.done || fact.status === FACT_STATUS.confirmed;
  }

  function classifyFactSummaryTopic(fact, note) {
    if (!fact && note) return classifySummaryTopic(note);
    var subject = (fact && fact.subject) || "";
    var section = (note && note.section) || (fact && fact.sectionHint) || "";
    var text = String((fact && fact.sourceText) || (note && note.original) || "").toLowerCase();

    if (section === "urgent" || subject === "critical" ||
        noteContains(text, ["flood", "fire", "evacuat", "unsafe", "injury"])) {
      return "critical";
    }
    if (subject === "maintenance" || section === "maintenance" || detectAcIssue(text) ||
        noteContains(text, ["leak", "broken", "repair"])) {
      return "maintenance";
    }
    if (subject === "outstanding_balance" || subject === "payment" || subject === "invoice" ||
        subject === "bill" || subject === "folio" || subject === "account" || subject === "charge" ||
        (section === "payments" && isActualFinancialIssue(text))) {
      return "payment";
    }
    if (subject === "guest_arrangement") return "guest";
    if (subject === "twin_setup") return "task";
    if (subject === "reservation_info") return "vip";
    if (subject === "vip_arrival" || section === "vip" || (note && note.isVip) || /\bvip\b/.test(text)) {
      return "vip";
    }
    if (subject === "late_checkout" || detectLateCheckout(text)) return "lateCheckout";
    if (subject === "room_move" || detectRoomMove(text)) return "roomMove";
    if (subject === "guest_request" || detectExtendStay(text)) {
      return detectExtendStay(text) ? "extension" : "guest";
    }
    if (subject === "wake_up") return "task";
    if (subject === "delivery" || section === "deliveries") return "delivery";
    if (section === "inventory" || subject === "inventory") return "inventory";
    if (section === "events") return "event";
    if (section === "tasks") return "task";
    if (section === "lostproperty") return "lostProperty";
    if (detectComplaint(text)) return "complaint";
    if (section === "guest") return "guest";
    return "other";
  }

  function completedTopicLabel(topic, count) {
    var map = {
      payment: ["payment issue", "payment issues"],
      maintenance: ["maintenance issue", "maintenance issues"],
      guest: ["guest request", "guest requests"],
      vip: ["VIP item", "VIP items"],
      lateCheckout: ["late check-out", "late check-outs"],
      task: ["task", "tasks"],
      delivery: ["delivery", "deliveries"],
      other: ["item", "items"]
    };
    var pair = map[topic] || map.other;
    return countWord(count, pair[0], pair[1]);
  }

  function summarizeFromFacts(analyzed, options) {
    options = options || {};
    var prefs = options.prefs || {};
    var detail = prefs.detail || options.detail || "standard";

    var unresolved = [];
    var completed = [];

    analyzed.forEach(function (note) {
      if (!note) return;
      var fact = note.fact || null;
      if (!fact && note.original) {
        fact = extractOperationalFact(note.original, {
          section: note.section,
          rooms: note.rooms,
          isVip: note.isVip
        });
      }
      if (!fact || !hasUsefulOperationalDetail(fact)) return;
      if (note.section === "completed" && fact.status === FACT_STATUS.unknown) {
        fact = Object.assign({}, fact, { status: FACT_STATUS.done });
      }
      /* Informational reservation / confirmed arrangements are not unresolved follow-ups */
      if (fact.subject === "reservation_info" && fact.status === FACT_STATUS.confirmed) {
        completed.push({ note: note, fact: fact, topic: classifyFactSummaryTopic(fact, note) });
        return;
      }
      if (isFactClosed(fact) && fact.status === FACT_STATUS.done) {
        completed.push({ note: note, fact: fact, topic: classifyFactSummaryTopic(fact, note) });
      } else if (isFactUnresolved(fact) && note.section !== "completed") {
        unresolved.push({ note: note, fact: fact, topic: classifyFactSummaryTopic(fact, note) });
      }
    });

    function concreteSnippet(entry) {
      var fact = entry.fact;
      var rooms = (fact.rooms || []).slice();
      if (fact.subject === "vip_arrival" || (fact.guestName && /\bvip\b/i.test(fact.sourceText || ""))) {
        return "VIP preparation for " + (fact.guestName || (rooms[0] ? "Room " + rooms[0] : "the arriving guest"));
      }
      if (fact.subject === "room_move" && rooms[0]) {
        return "a possible room move request for Room " + rooms[0] +
          (fact.preferredLocation ? " to the " + fact.preferredLocation : "");
      }
      if (fact.subject === "maintenance" && rooms.length) {
        return "maintenance checks in " +
          (rooms.length === 1 ? "Room " + rooms[0] : "Rooms " + joinNatural(rooms));
      }
      if (fact.subject === "twin_setup" && rooms[0]) {
        return "a twin-bed setup for Room " + rooms[0] +
          (fact.arrivalDate ? " before arrival" : "");
      }
      if (fact.subject === "guest_arrangement" && fact.guestName) {
        return "guest arrangement preparation for " + fact.guestName;
      }
      if (fact.subject === "late_checkout" && rooms[0]) {
        return "a late check-out request for Room " + rooms[0];
      }
      if (rooms[0] && fact.guestName) {
        return "an outstanding action for " + fact.guestName + " in Room " + rooms[0];
      }
      if (rooms[0]) return "an outstanding action for Room " + rooms[0];
      if (fact.guestName) return "an outstanding action for " + fact.guestName;
      return "";
    }

    var sentences = [];
    var critical = unresolved.filter(function (e) { return e.topic === "critical"; });

    if (!unresolved.length && !completed.length) {
      sentences.push("No operational issues were identified during this shift.");
    } else if (!critical.length) {
      sentences.push("No critical operational issues were identified during this shift.");
    } else if (critical.length === 1) {
      sentences.push("One critical operational issue requires immediate attention.");
    } else {
      sentences.push(critical.length + " critical operational issues require immediate attention.");
    }

    if (unresolved.length > 0) {
      var snippets = unresolved.map(concreteSnippet).filter(Boolean);
      var limit = detail === "brief" ? 2 : (detail === "comprehensive" ? 5 : 4);
      var shown = snippets.slice(0, limit);
      var opener = unresolved.length === 1
        ? "One operational follow-up remains"
        : capitalize(numberWord(unresolved.length)) + " operational follow-ups remain";
      if (shown.length) {
        sentences.push(opener + ", including " + joinNatural(shown) + ".");
      } else {
        sentences.push(opener + ".");
      }
    } else if (!critical.length) {
      sentences.push("The incoming team has a clear handover with no outstanding actions.");
    }

    if (completed.length && detail !== "brief") {
      var completedCounts = {};
      var completedOrder = [];
      completed.forEach(function (entry) {
        var topic = entry.topic === "critical" ? "other" : entry.topic;
        if (entry.fact && entry.fact.subject === "reservation_info") topic = "vip";
        if (!completedCounts[topic]) {
          completedCounts[topic] = 0;
          completedOrder.push(topic);
        }
        completedCounts[topic] += 1;
      });
      if (completed.length === 1) {
        sentences.push(
          capitalize(completedTopicLabel(completedOrder[0], 1)).replace(/^One\s+/i, "One ") +
          " was completed during the shift."
        );
      } else if (completedOrder.length === 1) {
        sentences.push(
          capitalize(completedTopicLabel(completedOrder[0], completed.length)) +
          " were completed during the shift."
        );
      } else {
        sentences.push(
          capitalize(numberWord(completed.length)) +
          " items were completed during the shift, including " +
          joinNatural(completedOrder.slice(0, 3).map(function (topic) {
            return completedTopicLabel(topic, completedCounts[topic]);
          })) + "."
        );
      }
    }

    var outLimit = detail === "brief" ? 2 : (detail === "comprehensive" ? 5 : 4);
    var summary = sentences.slice(0, outLimit).join(" ");
    /* Guard: never invent finance language absent from unresolved facts */
    if (!unresolved.some(function (e) {
      return e.topic === "payment" || /balance|invoice|payment/i.test((e.fact && e.fact.subject) || "");
    })) {
      summary = summary
        .replace(/\binvoices?\s+remain(?:s)?\s+open\.?/gi, "")
        .replace(/\boutstanding\s+balances?\b/gi, "follow-ups")
        .replace(/\s{2,}/g, " ")
        .trim();
    }
    return applyPreferences(summary, { prefs: prefs, terminologyMap: options.terminologyMap });
  }

  /* ------------------------------------------------------------------ */
  /*  Phase 4A — AI Summary detail cards from structured facts          */
  /* ------------------------------------------------------------------ */

  function ensureNoteFact(note) {
    if (!note) return null;
    if (note.fact && note.fact.status) return note.fact;
    if (!note.original) return note.fact || null;
    return extractOperationalFact(note.original, {
      section: note.section,
      rooms: note.rooms,
      isVip: note.isVip
    });
  }

  function summaryCardBucket(note, fact) {
    var topic = classifyFactSummaryTopic(fact, note);
    var section = (note && note.section) || (fact && fact.sectionHint) || "";

    if (topic === "critical" || section === "urgent") return "urgent";
    if (topic === "payment" || section === "payments") return "payments";
    if (topic === "maintenance" || section === "maintenance") return "maintenance";
    if (
      topic === "vip" || topic === "guest" || topic === "lateCheckout" ||
      topic === "roomMove" || topic === "extension" || topic === "complaint" ||
      section === "guest" || section === "vip"
    ) {
      return "guest";
    }
    if (
      topic === "task" || topic === "inventory" || topic === "delivery" ||
      section === "tasks" || section === "inventory" || section === "deliveries"
    ) {
      return "tasks";
    }
    if (topic === "event" || section === "events") return "events";
    return "";
  }

  /**
   * Phase 2D — single display-writing pipeline for summary cards and main items.
   * Always reuse rewriteNote; never render sourceText / Opera fragments directly.
   */
  function displayWritingForNote(note, fact, options) {
    options = options || {};
    if (!note && !fact) return "";

    var payload = note
      ? {
          original: note.original || note.text || (fact && fact.sourceText) || "",
          text: note.text,
          rooms: note.rooms,
          section: note.section,
          isVip: note.isVip,
          fact: fact || note.fact || null
        }
      : {
          original: (fact && fact.sourceText) || "",
          rooms: (fact && fact.rooms) || [],
          section: (fact && fact.sectionHint) || "",
          fact: fact
        };

    if (fact) payload.fact = fact;
    if (!payload.original && fact && fact.sourceText) {
      payload.original = fact.sourceText;
    }

    return tidyPhrase(rewriteNote(payload, {
      section: payload.section || options.section,
      rooms: payload.rooms || options.rooms,
      isVip: payload.isVip || options.isVip,
      prefs: options.prefs,
      terminologyMap: options.terminologyMap,
      platformLabels: options.platformLabels,
      uiLabels: options.uiLabels,
      currency: options.currency,
      module: options.module,
      addFollowUp: options.addFollowUp
    }));
  }

  function buildCardPhraseForBucket(bucket, note, fact, options) {
    if (!bucket) return "";
    return displayWritingForNote(note, fact, options);
  }

  function joinSummaryCardPhrases(phrases) {
    var cleaned = (phrases || []).filter(Boolean);
    if (!cleaned.length) return "";
    if (cleaned.length === 1) return cleaned[0];
    if (cleaned.length === 2) {
      return cleaned[0].replace(/\.$/, "") + ". " + cleaned[1];
    }
    return cleaned.slice(0, 3).map(function (p, i) {
      return i < cleaned.length - 1 ? p.replace(/\.$/, "") : p;
    }).join(". ") + (cleaned.length > 3 ? " (+" + (cleaned.length - 3) + " more)." : "");
  }

  function emptySummaryCard() {
    return {
      show: false,
      unresolvedCount: 0,
      completedCount: 0,
      confirmedCount: 0,
      sentence: ""
    };
  }

  /**
   * Build AI Summary detail-card models from structured facts.
   * Badge counts are unresolved only; card sentences reuse rewriteNote (Phase 2D).
   */
  function buildSummaryDetailCards(analyzed, options) {
    options = options || {};
    var buckets = {
      urgent: [],
      guest: [],
      maintenance: [],
      payments: [],
      tasks: [],
      events: []
    };

    (analyzed || []).forEach(function (note) {
      if (!note) return;
      var fact = ensureNoteFact(note);
      if (!fact) return;
      if (note.section === "completed" && fact.status === FACT_STATUS.unknown) {
        fact = Object.assign({}, fact, { status: FACT_STATUS.done });
      }
      var bucket = summaryCardBucket(note, fact);
      if (!buckets[bucket]) return;
      buckets[bucket].push({ note: note, fact: fact });
    });

    function buildCard(bucket, entries) {
      var card = emptySummaryCard();
      if (!entries.length) return card;

      var unresolved = [];
      var completed = [];
      var confirmed = [];

      entries.forEach(function (entry) {
        if (entry.fact.status === FACT_STATUS.done) {
          completed.push(entry);
        } else if (entry.fact.status === FACT_STATUS.confirmed) {
          confirmed.push(entry);
        } else {
          unresolved.push(entry);
        }
      });

      card.unresolvedCount = unresolved.length;
      card.completedCount = completed.length;
      card.confirmedCount = confirmed.length;
      card.show = unresolved.length > 0 || completed.length > 0 || confirmed.length > 0;

      var phrases = [];
      /* Prefer unresolved first, then completed/confirmed so settled items still appear */
      unresolved.concat(completed).concat(confirmed).forEach(function (entry) {
        var phrase = buildCardPhraseForBucket(bucket, entry.note, entry.fact, options);
        if (phrase) phrases.push(phrase);
      });

      if (!phrases.length && card.show) {
        if (unresolved.length) {
          phrases.push(countWord(unresolved.length, "item remains open", "items remain open"));
        } else if (completed.length) {
          phrases.push(countWord(completed.length, "item was completed", "items were completed"));
        } else {
          phrases.push(countWord(confirmed.length, "item is confirmed", "items are confirmed"));
        }
      }

      if (phrases.length > 3 && bucket === "tasks") {
        var openN = unresolved.length;
        var doneN = completed.length;
        var confN = confirmed.length;
        var bits = [];
        if (openN) bits.push(countWord(openN, "open item", "open items"));
        if (doneN) bits.push(countWord(doneN, "completed item", "completed items"));
        if (confN) bits.push(countWord(confN, "confirmed item", "confirmed items"));
        card.sentence = ensureSentence(
          capitalize(bits.join("; ") || (entries.length + " housekeeping and inventory notes"))
        );
        return card;
      }

      card.sentence = joinSummaryCardPhrases(phrases);
      return card;
    }

    return {
      urgent: buildCard("urgent", buckets.urgent),
      guest: buildCard("guest", buckets.guest),
      maintenance: buildCard("maintenance", buckets.maintenance),
      payments: buildCard("payments", buckets.payments),
      tasks: buildCard("tasks", buckets.tasks),
      events: buildCard("events", buckets.events)
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Phase 4B — Shift Glance / top badge metrics from structured facts */
  /* ------------------------------------------------------------------ */

  /**
   * Confirmed facts stay out of outstanding counts unless source still asks
   * for follow-up / pending preparation (e.g. amenities still needed).
   */
  function hasExplicitFollowUpRemaining(note, fact) {
    if (note && note.isFollowUp) return true;
    var src = String((fact && fact.sourceText) || (note && note.original) || "");
    if (/\bamenities?\b/i.test(src) &&
        /\b(?:still\s+)?(?:need|needs|needed|to\s+be\s+placed|pending|not\s+yet)\b/i.test(src)) {
      return true;
    }
    if (/\bstill\s+(?:need|needs|to\s+be|pending|open|outstanding)\b/i.test(src)) return true;
    if (/\bfollow[\s-]*up\b/i.test(src) &&
        !/\bfollow[\s-]*up\s+(?:complete|completed|done|closed)\b/i.test(src)) {
      return true;
    }
    if (/\b(?:prepare|preparation|to\s+be\s+prepared)\b/i.test(src) &&
        !/\b(?:prepared|preparation\s+complete)\b/i.test(src)) {
      return true;
    }
    return false;
  }

  /** Active issue for glance badges (done excluded; confirmed only with leftover follow-up). */
  function isGlanceActiveFact(note, fact) {
    if (!fact) return true;
    if (note && note.section === "completed" && fact.status === FACT_STATUS.unknown) {
      return false;
    }
    if (fact.status === FACT_STATUS.done) return false;
    if (fact.status === FACT_STATUS.confirmed) {
      return hasExplicitFollowUpRemaining(note, fact);
    }
    /* open | requested | in_progress | unknown — include conservatively */
    return true;
  }

  function isVipGlanceNote(note, fact) {
    if (!note && !fact) return false;
    if (note && (note.isVip || note.section === "vip")) return true;
    if (fact && (fact.subject === "vip_arrival" || fact.sectionHint === "vip")) return true;
    var topic = classifyFactSummaryTopic(fact, note);
    return topic === "vip";
  }

  function isTaskLikeGlanceNote(note, fact) {
    var section = (note && note.section) || "";
    if (section === "tasks" || section === "inventory" || section === "deliveries") return true;
    var topic = classifyFactSummaryTopic(fact, note);
    return topic === "task" || topic === "inventory" || topic === "delivery";
  }

  function countNotesUniqueByRoom(notes) {
    var roomSeen = {};
    var count = 0;
    (notes || []).forEach(function (note) {
      if (!note) return;
      var rooms = note.rooms || [];
      if (rooms.length === 1) {
        var room = String(rooms[0]);
        if (roomSeen[room]) return;
        roomSeen[room] = true;
        count += 1;
        return;
      }
      count += 1;
    });
    return count;
  }

  /**
   * Shift Glance / top badge metrics from structured facts.
   * Shape matches handover computeHandoverMetrics for drop-in use.
   */
  function computeHandoverMetricsFromFacts(analyzed) {
    var urgentNotes = [];
    var vipNotes = [];
    var maintenanceNotes = [];
    var paymentNotes = [];
    var eventNotes = [];
    var taskLikeNotes = [];
    var guestNotes = [];
    var generalNotes = [];

    (analyzed || []).forEach(function (note) {
      if (!note) return;
      var fact = ensureNoteFact(note);
      if (!fact) return;
      if (note.section === "completed" && fact.status === FACT_STATUS.unknown) {
        fact = Object.assign({}, fact, { status: FACT_STATUS.done });
      }

      var section = note.section || fact.sectionHint || "";
      var topic = classifyFactSummaryTopic(fact, note);
      var active = isGlanceActiveFact(note, fact);

      if (section === "urgent" || topic === "critical") {
        if (active) urgentNotes.push(note);
      }
      if (isVipGlanceNote(note, fact) && active) {
        vipNotes.push(note);
      }
      if ((section === "maintenance" || topic === "maintenance") && active) {
        maintenanceNotes.push(note);
      }
      if ((section === "payments" || topic === "payment") && active) {
        paymentNotes.push(note);
      }
      if (section === "events" || topic === "event") {
        /*
         * Events: keep counting unless structured status clearly closes the item.
         * Unknown / missing closure → include (preserve prior behaviour).
         */
        if (fact.status !== FACT_STATUS.done && fact.status !== FACT_STATUS.confirmed) {
          eventNotes.push(note);
        }
      }
      if (isTaskLikeGlanceNote(note, fact) && active) {
        taskLikeNotes.push(note);
      }
      if (
        (section === "guest" || section === "vip" || topic === "guest" || topic === "vip" ||
          topic === "lateCheckout" || topic === "roomMove" || topic === "extension" ||
          topic === "complaint") &&
        active
      ) {
        guestNotes.push(note);
      }
      if ((section === "general" || section === "lostproperty") && active) {
        generalNotes.push(note);
      }
    });

    var vip = countNotesUniqueByRoom(vipNotes);
    var taskLike = countNotesUniqueByRoom(taskLikeNotes);
    /*
     * Outstanding Tasks includes unresolved VIP preparation so pending amenities
     * surface on both VIP Arrivals and Outstanding Tasks badges.
     */
    var tasks = taskLike + vip;
    var maintenance = countNotesUniqueByRoom(maintenanceNotes);
    var payments = countNotesUniqueByRoom(paymentNotes);
    var events = countNotesUniqueByRoom(eventNotes);
    var urgent = countNotesUniqueByRoom(urgentNotes);
    var guest = countNotesUniqueByRoom(guestNotes);
    var general = countNotesUniqueByRoom(generalNotes);

    return {
      urgent: urgent,
      vip: vip,
      maintenance: maintenance,
      payments: payments,
      events: events,
      tasks: tasks,
      display: {
        urgent: urgent,
        guest: guest,
        maintenance: maintenance,
        payments: payments,
        events: events,
        tasks: tasks,
        general: general
      }
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Phase 5A — merge / dedupe by structured fact identity             */
  /* ------------------------------------------------------------------ */

  var FACT_STATUS_RANK = {
    done: 100,
    confirmed: 80,
    in_progress: 55,
    open: 40,
    requested: 40,
    unknown: 10
  };

  function normalizeFactRooms(rooms) {
    var seen = {};
    var out = [];
    (rooms || []).forEach(function (room) {
      var key = String(room || "").toUpperCase();
      if (!key || seen[key]) return;
      seen[key] = true;
      out.push(String(room));
    });
    return out.sort(function (a, b) {
      var na = parseInt(a, 10);
      var nb = parseInt(b, 10);
      if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
      return String(a).localeCompare(String(b));
    });
  }

  function normalizeSubjectForIdentity(subject) {
    var s = String(subject || "").toLowerCase().trim();
    if (
      s === "outstanding_balance" || s === "payment" || s === "invoice" ||
      s === "bill" || s === "folio" || s === "account" || s === "charge" ||
      s === "financial_settlement_unclear"
    ) {
      return "payment_balance";
    }
    return s;
  }

  function sectionFromFact(fact, fallbackSection) {
    if (!fact) return fallbackSection || "general";
    var fallback = String(fallbackSection || "");
    if (fallback === "completed") return "completed";
    if (fact.status === FACT_STATUS.done && fallback === "completed") return "completed";

    var hint = String(fact.sectionHint || "").toLowerCase();
    if (hint === "completed") return "completed";
    if (hint && hint !== "general" && hint !== "completed") return hint;

    var subject = String(fact.subject || "");
    var normalized = normalizeSubjectForIdentity(subject);
    if (normalized === "payment_balance") return "payments";
    if (subject === "maintenance") return "maintenance";
    if (subject === "vip_arrival" || subject === "reservation_info") return "vip";
    if (subject === "guest_arrangement") return "guest";
    if (subject === "twin_setup") return "tasks";
    if (subject === "late_checkout" || subject === "room_move" || subject === "extension") return "guest";
    if (subject === "guest_request") return "guest";
    if (subject === "wake_up") return fallback === "completed" ? "completed" : "tasks";
    if (subject === "delivery") return "deliveries";
    if (subject === "inventory") return "inventory";
    if (subject === "follow_up") {
      if (fact.ownerDept === "Maintenance") return "maintenance";
      if (fact.ownerDept === "Housekeeping") return "tasks";
      return fallback || "tasks";
    }
    return fallback || hint || "general";
  }

  function sourceFingerprint(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Fact identity key: rooms + subject + status + actionVerb + actionTarget + sectionHint.
   * Never uses rewritten / truncated display text.
   */
  function factIdentityKey(fact, options) {
    options = options || {};
    if (!fact) return "";
    var rooms = normalizeFactRooms(fact.rooms).join(",");
    var subject = normalizeSubjectForIdentity(fact.subject);
    if (!subject) subject = "src:" + sourceFingerprint(fact.sourceText).slice(0, 80);
    var section = String(fact.sectionHint || sectionFromFact(fact) || "").toLowerCase();
    var verb = String(fact.actionVerb || "").toLowerCase();
    var target = String(fact.actionTarget || "").toLowerCase();
    var status = String(fact.status || FACT_STATUS.unknown);

    if (options.family) {
      /* Same-room / same-subject family for status resolution (status omitted). */
      return ["fam", rooms, subject, target, section].join("|");
    }

    return ["id", rooms, subject, status, verb, target, section].join("|");
  }

  function factMergeFamilyKey(fact) {
    return factIdentityKey(fact, { family: true });
  }

  function collectSourceTexts(fact) {
    if (!fact) return [];
    if (fact.sourceTexts && fact.sourceTexts.length) {
      return fact.sourceTexts.slice();
    }
    return fact.sourceText ? [String(fact.sourceText)] : [];
  }

  function uniqueStrings(values) {
    var seen = {};
    var out = [];
    (values || []).forEach(function (value) {
      var key = String(value || "");
      if (!key || seen[key]) return;
      seen[key] = true;
      out.push(key);
    });
    return out;
  }

  function mergeFactDetails(facts) {
    var out = [];
    var seen = {};
    (facts || []).forEach(function (fact) {
      (fact.details || []).forEach(function (detail) {
        if (!detail) return;
        var key = String(detail.type || "") + "::" + String(detail.value || "");
        if (seen[key]) return;
        seen[key] = true;
        out.push({ type: detail.type, value: detail.value });
      });
    });
    return out;
  }

  function detailsCompatible(factA, factB) {
    if (!factA || !factB) return true;
    var moneyA = [];
    var moneyB = [];
    (factA.details || []).forEach(function (d) {
      if (d && d.type === "money") moneyA.push(String(d.value));
    });
    (factB.details || []).forEach(function (d) {
      if (d && d.type === "money") moneyB.push(String(d.value));
    });
    if (moneyA.length && moneyB.length) {
      var overlap = moneyA.some(function (m) { return moneyB.indexOf(m) !== -1; });
      var sameSet = moneyA.slice().sort().join() === moneyB.slice().sort().join();
      if (!overlap && !sameSet) return false;
    }
    var destA = "";
    var destB = "";
    (factA.details || []).forEach(function (d) {
      if (d && d.type === "destination_room") destA = String(d.value);
    });
    (factB.details || []).forEach(function (d) {
      if (d && d.type === "destination_room") destB = String(d.value);
    });
    if (destA && destB && destA !== destB) return false;
    return true;
  }

  function groupDetailsCompatible(notes) {
    for (var i = 0; i < notes.length; i += 1) {
      for (var j = i + 1; j < notes.length; j += 1) {
        if (!detailsCompatible(notes[i].fact, notes[j].fact)) return false;
      }
    }
    return true;
  }

  function pickStrongestFactNote(notes) {
    var best = notes[0];
    var bestRank = FACT_STATUS_RANK[best.fact.status] || 0;
    var bestIndex = 0;
    notes.forEach(function (note, index) {
      var rank = FACT_STATUS_RANK[(note.fact && note.fact.status) || ""] || 0;
      if (rank > bestRank || (rank === bestRank && index > bestIndex)) {
        best = note;
        bestRank = rank;
        bestIndex = index;
      }
    });
    return best;
  }

  function compareNotesByFactDuty(a, b) {
    var order = {
      urgent: 0, vip: 1, guest: 2, maintenance: 3, payments: 4,
      events: 5, tasks: 6, inventory: 7, deliveries: 8, lostproperty: 9,
      general: 10, completed: 11
    };
    function rank(note) {
      var section = (note && note.section) || "general";
      var score = (order[section] != null ? order[section] : 20) * 10;
      if (note && note.needsManagementAttention) score -= 5;
      if (note && note.maintenancePriority === "Critical") score -= 8;
      if (note && note.isVip) score -= 4;
      if (note && note.isCarriedOver) score -= 2;
      if (note && note.fact && note.fact.status === FACT_STATUS.done) score += 80;
      return score;
    }
    return rank(a) - rank(b);
  }

  function mergeNotesByFactIdentityGroup(notes) {
    if (!notes || !notes.length) return null;
    if (notes.length === 1) {
      var only = notes[0];
      var onlySection = sectionFromFact(only.fact, only.section);
      if (onlySection) only.section = onlySection;
      if (only.fact) only.fact.sectionHint = onlySection;
      return only;
    }

    var primary = pickStrongestFactNote(notes);
    var allFacts = notes.map(function (n) { return n.fact; });
    var sourceTexts = uniqueStrings(notes.reduce(function (acc, note) {
      return acc.concat(collectSourceTexts(note.fact)).concat(note.original ? [note.original] : []);
    }, []));
    var sourceHistory = [];
    notes.forEach(function (note) {
      if (note.fact && note.fact.sourceHistory && note.fact.sourceHistory.length) {
        note.fact.sourceHistory.forEach(function (entry) {
          sourceHistory.push(entry);
        });
      } else {
        sourceHistory.push({
          status: (note.fact && note.fact.status) || FACT_STATUS.unknown,
          sourceText: (note.fact && note.fact.sourceText) || note.original || "",
          section: note.section || ""
        });
      }
    });

    var rooms = normalizeFactRooms(notes.reduce(function (acc, note) {
      return acc.concat((note.fact && note.fact.rooms) || note.rooms || []);
    }, []));

    var mergedFact = Object.assign({}, primary.fact, {
      rooms: rooms,
      status: primary.fact.status,
      sourceText: primary.fact.sourceText || sourceTexts[0] || "",
      sourceTexts: sourceTexts,
      sourceHistory: sourceHistory,
      details: mergeFactDetails(allFacts),
      subject: primary.fact.subject,
      actionVerb: primary.fact.status === FACT_STATUS.done || primary.fact.status === FACT_STATUS.confirmed
        ? (primary.fact.actionVerb || "")
        : (primary.fact.actionVerb || notes.map(function (n) {
          return n.fact && n.fact.actionVerb;
        }).filter(Boolean)[0] || ""),
      actionTarget: primary.fact.actionTarget || "",
      ownerDept: primary.fact.ownerDept || "",
      ownerName: primary.fact.ownerName || ""
    });

    var section = sectionFromFact(mergedFact, primary.section);
    mergedFact.sectionHint = section;

    return {
      original: sourceTexts.join(" | "),
      rooms: rooms,
      section: section,
      isVip: notes.some(function (n) { return n.isVip; }),
      isCarriedOver: notes.some(function (n) { return n.isCarriedOver; }),
      isFollowUp: notes.some(function (n) { return n.isFollowUp; }),
      needsManagementAttention: notes.some(function (n) { return n.needsManagementAttention; }),
      maintenancePriority: notes.reduce(function (best, n) {
        var rank = { Critical: 3, High: 2, Normal: 1 };
        if (!n.maintenancePriority) return best;
        if (!best) return n.maintenancePriority;
        return (rank[n.maintenancePriority] || 0) > (rank[best] || 0)
          ? n.maintenancePriority
          : best;
      }, null),
      fact: mergedFact,
      _mergedNotes: notes.slice(),
      _factConsolidated: true
    };
  }

  /**
   * Consolidate analyzed notes using fact identity — not rewritten display text.
   * Same room + different subjects stay separate.
   * Same room + same subject + same status merge when details are compatible.
   * Same room + same subject + different status resolve to strongest status with source history.
   */
  function consolidateNotesByFacts(analyzed) {
    var withFacts = [];
    var withoutFacts = [];

    (analyzed || []).forEach(function (note) {
      if (!note) return;
      var fact = ensureNoteFact(note);
      if (!fact || (!fact.subject && !fact.sourceText)) {
        withoutFacts.push(note);
        return;
      }
      if (!fact.sourceTexts || !fact.sourceTexts.length) {
        fact.sourceTexts = collectSourceTexts(fact);
      }
      if (!fact.sectionHint && note.section) fact.sectionHint = note.section;
      note.fact = fact;
      withFacts.push(note);
    });

    var families = {};
    withFacts.forEach(function (note) {
      var key = factMergeFamilyKey(note.fact);
      if (!families[key]) families[key] = [];
      families[key].push(note);
    });

    var consolidated = [];

    Object.keys(families).forEach(function (familyKey) {
      var family = families[familyKey];

      /* Exact identity buckets first (dedupe identical / same-status merges). */
      var byIdentity = {};
      family.forEach(function (note) {
        var id = factIdentityKey(note.fact);
        if (!byIdentity[id]) byIdentity[id] = [];
        byIdentity[id].push(note);
      });

      var identityMerged = Object.keys(byIdentity).map(function (id) {
        var bucket = byIdentity[id];
        if (bucket.length === 1) return bucket[0];
        return mergeNotesByFactIdentityGroup(bucket);
      });

      if (identityMerged.length === 1) {
        var single = identityMerged[0];
        if (!single._factConsolidated) {
          single.section = sectionFromFact(single.fact, single.section);
          if (single.fact) single.fact.sectionHint = single.section;
        }
        consolidated.push(single);
        return;
      }

      /* Different statuses in same subject family — resolve if details compatible. */
      if (groupDetailsCompatible(identityMerged)) {
        consolidated.push(mergeNotesByFactIdentityGroup(identityMerged));
        return;
      }

      /* Incompatible details — keep separate facts (never merge on display text). */
      identityMerged.forEach(function (note) {
        note.section = sectionFromFact(note.fact, note.section);
        if (note.fact) note.fact.sectionHint = note.section;
        consolidated.push(note);
      });
    });

    withoutFacts.forEach(function (note) {
      consolidated.push(note);
    });

    return consolidated.sort(compareNotesByFactDuty);
  }

  function displayDedupeKeyFromItem(item) {
    if (!item) return "";
    if (item.fact) return factIdentityKey(item.fact);
    if (item._notes && item._notes[0] && item._notes[0].fact) {
      return factIdentityKey(item._notes[0].fact);
    }
    return "";
  }

  function isPhase1SupportedFact(fact) {
    if (!fact || !fact.sourceText) return false;
    var src = fact.sourceText;
    var lower = src.toLowerCase();

    /* Financial settlement — only with payment/account context. */
    if (/\bsettled\b/.test(lower) && hasFinancialSettlementContext(src)) return true;

    /*
     * Non-financial "settled" (guest status) — Phase 1 minimal path only,
     * so legacy templates cannot rewrite it as payment completion.
     */
    if (/\bsettled\b/.test(lower) && !hasFinancialSettlementContext(src)) return true;

    if (
      fact.actionVerb === "follow_up" &&
      fact.actionTarget &&
      /\bon\s+(?:room\s*)?\d{1,4}[a-z]?\b/i.test(src)
    ) {
      return true;
    }

    if (
      fact.subject === "room_move" &&
      /\b(?:wants?|want|requested?|asking|asked|would like)\b/i.test(src)
    ) {
      return true;
    }

    return false;
  }

  function endsWithDanglingPreposition(text) {
    return /\b(?:on|with|for|to|at|from)\.?$/i.test(trimText(text));
  }

  function stripTrailingDanglingPreposition(text) {
    return trimText(String(text || "")).replace(/\s*\b(?:on|with|for|to|at|from)\.?$/i, "");
  }

  function roomLeadFromFact(fact) {
    if (!fact || !fact.rooms || !fact.rooms.length) return "";
    if (fact.rooms.length === 1) return "Room " + fact.rooms[0];
    return "Rooms " + fact.rooms.join(", ");
  }

  function finishFactRender(lead, body) {
    var cleaned = stripTrailingDanglingPreposition(tidyPhrase(body));
    if (!cleaned) return "";
    var result = lead ? lead + " – " + capitalize(cleaned) : capitalize(cleaned);
    result = ensureSentence(result);
    if (endsWithDanglingPreposition(result)) {
      result = ensureSentence(stripTrailingDanglingPreposition(result.replace(/\.+$/, "")));
    }
    return result;
  }

  /** Minimally cleaned source — no invented meaning, rooms left intact. */
  function renderMinimalFact(fact) {
    var text = tidyPhrase(fact.sourceText);
    if (!text) return "";
    text = stripTrailingDanglingPreposition(text);
    return ensureSentence(text);
  }

  function renderSettlementFact(fact) {
    if (!hasFinancialSettlementContext(fact.sourceText)) return "";

    var noun = financialSettlementNoun(fact.sourceText);
    /* Unclear financial subject — do not invent "balance" / bare "Settled." */
    if (!noun) return "";

    var lead = roomLeadFromFact(fact);

    if (fact.status === FACT_STATUS.done) {
      return finishFactRender(lead, "The " + noun + " has been settled");
    }

    if (fact.status === FACT_STATUS.open) {
      return finishFactRender(lead, "The " + noun + " remains unsettled");
    }

    return "";
  }

  function renderFollowUpFact(fact) {
    var lead = roomLeadFromFact(fact);
    var targetLabel = fact.ownerDept || departmentFromTarget(fact.actionTarget) || "the team";
    var src = fact.sourceText;

    /* Copy only — never mutate fact.sourceText. Pull trailing detail after the room ref. */
    var detail = String(src)
      .replace(/\bfollow[\s-]*up\s+with\s+[A-Za-z][A-Za-z\s]*?\s+on\b/gi, " ")
      .replace(/\b(?:room|rm\.?|suite)\s*[#.]?\s*\d{1,4}[a-z]?\b/gi, " ")
      .replace(/^\s*please\s+/i, " ")
      .replace(/[.?!,;:]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();

    var body;
    if (detail && !/^(please|follow|with|on)$/i.test(detail)) {
      body = "Please follow up with " + targetLabel + " regarding " + detail.charAt(0).toLowerCase() + detail.slice(1);
    } else {
      body = "Please follow up with " + targetLabel;
    }

    return finishFactRender(lead, body);
  }

  function renderRoomMoveRequestFact(fact) {
    var dest = "";
    (fact.details || []).forEach(function (detail) {
      if (detail && detail.type === "destination_room") dest = detail.value;
    });
    if (!dest) dest = extractDestinationRoom(fact.sourceText, fact.rooms);

    var sourceRooms = (fact.rooms || []).filter(function (room) {
      return String(room).toUpperCase() !== String(dest || "").toUpperCase();
    });
    var lead = sourceRooms.length === 1
      ? "Room " + sourceRooms[0]
      : (sourceRooms.length > 1 ? "Rooms " + sourceRooms.join(", ") : "");

    if (dest && lead) {
      return finishFactRender(lead, "The guest has requested to move to Room " + dest);
    }
    if (dest) {
      return ensureSentence("The guest has requested to move to Room " + dest);
    }
    return finishFactRender(lead || roomLeadFromFact(fact), "The guest has requested a room move");
  }

  /**
   * Safe Phase 1 renderer for supported facts only.
   * Returns "" when the fact should fall through to the legacy writer.
   */
  function renderFactPhase1(fact, options) {
    if (!isPhase1SupportedFact(fact)) return "";

    var src = fact.sourceText;
    var rendered = "";

    if (/\bsettled\b/i.test(src)) {
      if (hasFinancialSettlementContext(src)) {
        rendered = renderSettlementFact(fact);
        if (rendered) return rendered;
        /* Financial cue present but subject unclear — keep source meaning. */
        return renderMinimalFact(fact);
      }
      /* Guest-status "settled" — preserve original wording, never payment rewrite. */
      return renderMinimalFact(fact);
    }

    if (fact.actionVerb === "follow_up" && fact.actionTarget) {
      rendered = renderFollowUpFact(fact);
      if (rendered && !endsWithDanglingPreposition(rendered)) return rendered;
      return renderMinimalFact(fact);
    }

    if (fact.subject === "room_move") {
      rendered = renderRoomMoveRequestFact(fact);
      if (rendered && !/\b(?:has been relocated|relocated to)\b/i.test(rendered)) {
        return rendered;
      }
      return renderMinimalFact(fact);
    }

    return renderMinimalFact(fact);
  }

  function rewriteOperationalNote(rawText, options) {
    options = options || {};

    /* Phase 2B operational display from structured facts */
    var fact = extractOperationalFact(rawText, options);
    var operational = renderOperationalFactDisplay(fact);
    if (operational) {
      return applyPreferences(operational, options);
    }

    /* Phase 1 fact path — supported cases only; legacy writer otherwise. */
    if (isPhase1SupportedFact(fact)) {
      var phase1Text = renderFactPhase1(fact, options);
      if (phase1Text) {
        return applyPreferences(phase1Text, options);
      }
    }

    var original = trimText(rawText);
    if (!original) return "";

    var normalized = normalizeInput(original);
    var rooms = (options.rooms && options.rooms.length)
      ? options.rooms.slice()
      : extractRoomNumbers(original);
    if (!rooms.length) rooms = extractRoomNumbers(normalized);

    var room = rooms.length === 1 ? rooms[0] : null;
    var roomsLabel = rooms.length > 1 ? "Rooms " + rooms.join(", ") : "";
    var lead = room ? "Room " + room : roomsLabel;
    var guestNames = extractGuestNames(original);
    var guestName = guestNames[0] || "";
    var section = options.section || "";
    var body = "";

    if (detectLateCheckout(normalized) || detectLateCheckout(original)) {
      body = buildLateCheckoutBody(normalized, options.prefs);
    } else if (detectExtendStay(normalized) || detectExtendStay(original)) {
      body = buildExtendStayBody(normalized);
    } else if (detectRoomMove(normalized) || detectRoomMove(original)) {
      body = buildRoomMoveBody(normalized, rooms, options);
    } else if (detectIronRequest(normalized) || detectIronRequest(original)) {
      body = buildIronBody(normalized);
    } else if (detectComplaint(normalized) && detectAcIssue(normalized)) {
      body = buildAcBody(normalized);
    } else if (detectComplaint(normalized) && (section === "guest" || !section)) {
      body = buildComplaintBody(normalized);
    } else if (detectAcIssue(normalized) && (section === "maintenance" || section === "urgent" || section === "guest" || !section)) {
      body = buildAcBody(normalized);
    } else if (section === "vip" || options.isVip) {
      body = buildVipBody(normalized, original, guestName, options.prefs);
    } else if (section === "inventory" || /\badapter/i.test(normalized)) {
      body = buildInventoryBody(normalized) || fallbackOperationalBody(normalized, room, options);
    } else if (section === "deliveries" || noteContains(normalized, ["package", "parcel", "delivery held"])) {
      body = buildDeliveryBody(normalized, guestName);
    } else if (section === "tasks") {
      body = buildTaskBody(normalized) || fallbackOperationalBody(normalized, room, options);
    } else if (section === "payments") {
      body = buildPaymentBody(normalized, options) || fallbackOperationalBody(normalized, room, options);
    } else if (section === "maintenance" || section === "urgent") {
      body = buildMaintenanceBody(normalized, section) || fallbackOperationalBody(normalized, room, options);
    } else if (section === "lostproperty" || noteContains(normalized, ["lost property", "left behind", "found in"]) ||
               /\bfound\b/i.test(normalized) && /\b(?:room|rm\.?|suite|lobby|corridor)\b/i.test(normalized)) {
      body = buildLostPropertyBody(normalized, guestName);
    } else {
      body = buildInventoryBody(normalized) ||
        buildTaskBody(normalized) ||
        buildPaymentBody(normalized, options) ||
        buildMaintenanceBody(normalized, section) ||
        fallbackOperationalBody(normalized, room, options);
    }

    body = maybeAddFollowUp(body, normalized, options);
    body = tidyPhrase(body);
    if (!body) body = tidyPhrase(fallbackOperationalBody(normalized, room, options) || normalized);

    var result;
    if (lead) {
      result = lead + " – " + capitalize(body);
    } else {
      result = capitalize(body);
    }

    result = result.replace(/\.\.+/g, ".").replace(/\.\s*\./g, ".");
    if (!/[.!?]$/.test(result)) result += ".";
    return applyPreferences(result, options);
  }

  function rewriteNote(note, options) {
    options = options || {};
    if (!note) return "";
    if (typeof note === "string") {
      return rewriteOperationalNote(note, options);
    }

    /* Prefer attached structured fact when present (merged / status-resolved notes). */
    if (note.fact) {
      var operational = renderOperationalFactDisplay(note.fact);
      if (operational) {
        return applyPreferences(operational, {
          prefs: options.prefs,
          terminologyMap: options.terminologyMap,
          platformLabels: options.platformLabels,
          uiLabels: options.uiLabels
        });
      }
      if (isPhase1SupportedFact(note.fact)) {
        var attached = renderFactPhase1(note.fact, {
          section: note.section || options.section,
          rooms: note.rooms || options.rooms,
          isVip: note.isVip || options.isVip,
          prefs: options.prefs
        });
        if (attached) {
          return applyPreferences(attached, {
            prefs: options.prefs,
            terminologyMap: options.terminologyMap,
            platformLabels: options.platformLabels,
            uiLabels: options.uiLabels
          });
        }
      }
    }

    return rewriteOperationalNote(note.original || note.text || "", {
      section: note.section || options.section,
      rooms: note.rooms || options.rooms,
      isVip: note.isVip || options.isVip,
      prefs: options.prefs,
      terminologyMap: options.terminologyMap,
      platformLabels: options.platformLabels,
      uiLabels: options.uiLabels,
      currency: options.currency,
      module: options.module || MODULES.handover,
      addFollowUp: options.addFollowUp
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Policy / knowledge rewriting                                    */
  /* ------------------------------------------------------------------ */

  function rewritePolicyText(rawText, options) {
    options = options || {};
    var original = trimText(rawText);
    if (!original) return "";

    var normalized = normalizeInput(original);
    var lower = normalized.toLowerCase();
    var amount = extractPrimaryAmount(normalized, options.currency);
    var result = "";

    if (/\blate\s+check-?out\b/.test(lower) || /\blate\s+co\b/.test(lower)) {
      if (/manager|dm|duty/.test(lower) && /vip/.test(lower)) {
        result = "Late check-outs require Duty Manager approval unless arranged for a VIP guest or otherwise authorised";
      } else if (/manager|dm|duty/.test(lower)) {
        result = "Late check-outs require Duty Manager approval";
      } else if (/vip/.test(lower)) {
        result = "Late check-outs may be arranged for VIP guests when authorised";
      } else {
        result = "Late check-out requests should follow hotel policy and be approved where required";
      }
    } else if (/\bearly\s+check-?in\b/.test(lower)) {
      if (/manager|dm|duty/.test(lower)) {
        result = "Early check-ins require Duty Manager approval subject to availability";
      } else {
        result = "Early check-in is subject to availability and hotel policy";
      }
    } else if (/adapter/.test(lower) && (/not return|not returned|missing|lost|keep/.test(lower) || amount)) {
      result = (amount ? "A " + amount + " replacement charge applies" : "A replacement charge applies") +
        " if a loan adapter is not returned";
    } else if (/iron/.test(lower) && (/not return|charge|fee/.test(lower) || amount)) {
      result = (amount ? "A " + amount + " replacement charge applies" : "A replacement charge applies") +
        " if a loan iron or ironing board is not returned";
    } else if (/deposit/.test(lower) && amount) {
      result = "A deposit of " + amount + " is required" +
        (/refund|return/.test(lower) ? " and is refundable subject to inspection" : "");
    } else if (/no[\s-]?show/.test(lower)) {
      result = amount
        ? "No-show reservations are charged " + amount + " in accordance with hotel policy"
        : "No-show reservations are charged in accordance with hotel policy";
    } else if (/cancel/.test(lower)) {
      result = "Cancellations must follow the hotel's cancellation policy" +
        (amount ? ", which may include a charge of " + amount : "");
    } else if (/refund/.test(lower)) {
      result = "Refunds require the appropriate management approval and must follow hotel policy";
    } else if (/smoking/.test(lower) && amount) {
      result = "A " + amount + " smoking cleaning charge applies where smoking is detected in a non-smoking room";
    } else if (/compensat|gesture|goodwill/.test(lower)) {
      result = amount
        ? "Guest compensation up to " + amount + " requires Duty Manager approval"
        : "Guest compensation requires the appropriate management approval";
    } else {
      /* Generic professional rewrite — capitalise, fix grammar lightly, keep facts */
      result = normalized
        .replace(/\bonly if\b/gi, "only when")
        .replace(/\bsay yes\b/gi, "approve")
        .replace(/\bunless\b/gi, "unless")
        .replace(/\bif not return\b/gi, "if not returned")
        .replace(/\bif not returned\b/gi, "if not returned");
      result = capitalize(result);
    }

    result = ensureSentence(result);
    return applyPreferences(result, options);
  }

  function extractPercentages(text) {
    var matches = [];
    var re = /\b\d+(?:\.\d+)?\s*%/g;
    var m;
    while ((m = re.exec(String(text || ""))) !== null) {
      matches.push(m[0].replace(/\s+/g, ""));
    }
    return matches;
  }

  function extractDates(text) {
    var matches = [];
    var re = /\b(?:\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?|\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{2,4})\b/gi;
    var m;
    while ((m = re.exec(String(text || ""))) !== null) {
      matches.push(m[0]);
    }
    return matches;
  }

  function containsHandoverActionTemplate(text) {
    return HANDOVER_ACTION_PATTERNS.some(function (re) {
      return re.test(String(text || ""));
    });
  }

  function stripHandoverActionTemplates(text) {
    var result = String(text || "");
    result = result
      .replace(/\s*Please\s+arrange\s+for\s+Maintenance\s+to\s+attend[^.?!]*[.?!]?/gi, "")
      .replace(/\s*Maintenance\s+to\s+attend[^.?!]*[.?!]?/gi, "")
      .replace(/\s*Reception\s+to\s+collect[^.?!]*[.?!]?/gi, "")
      .replace(/\s*Chase\s+(?:Maintenance\s+)?for\s+an\s+update[^.?!]*[.?!]?/gi, "")
      .replace(/\s*Incoming\s+team\s+to\s+action[^.?!]*[.?!]?/gi, "")
      .replace(/\s*Please\s+follow\s+up\s+during\s+this\s+shift[^.?!]*[.?!]?/gi, "")
      .replace(/\s*Please\s+advise\s+Housekeeping[^.?!]*[.?!]?/gi, "")
      .replace(/\s*and\s+update\s+the\s+incoming\s+team[^.?!]*/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    return result;
  }

  function inventsCompletionStatus(original, improved) {
    var src = String(original || "").toLowerCase();
    var out = String(improved || "").toLowerCase();
    var completionWords = ["completed", "resolved", "done", "closed", "finished", "sorted"];
    return completionWords.some(function (word) {
      var re = new RegExp("\\b" + word + "\\b", "i");
      return re.test(out) && !re.test(src);
    });
  }

  function removeInventedCompletion(original, improved) {
    if (!inventsCompletionStatus(original, improved)) return improved;
    var src = String(original || "").toLowerCase();
    var result = String(improved || "");
    ["completed", "resolved", "done", "closed", "finished", "sorted"].forEach(function (word) {
      var re = new RegExp("\\b" + word + "\\b", "i");
      if (!re.test(src)) {
        result = result.replace(new RegExp("\\b" + word + "\\b", "gi"), "").replace(/\s{2,}/g, " ").trim();
      }
    });
    return tidyPhrase(result);
  }

  function dayCountPhrase(n) {
    var num = parseInt(n, 10);
    if (isNaN(num)) return String(n) + " days";
    return numberWord(num) + (num === 1 ? " day" : " days");
  }

  function moneyPresentInText(text, amount) {
    var source = String(text || "");
    var raw = String(amount || "").replace(/\s+/g, "");
    if (!raw) return true;
    if (source.indexOf(raw) !== -1) return true;
    var digits = raw.match(/[\d,.]+/);
    if (!digits) return source.toLowerCase().indexOf(raw.toLowerCase()) !== -1;
    var num = digits[0].replace(/,/g, "");
    return new RegExp("(?:£|\\$|€)?\\s*" + escapeRegExp(num) + "\\b", "i").test(source);
  }

  function extractMoneyAmounts(text) {
    var amounts = [];
    var re = /(?:£|\$|€)\s*(\d+(?:\.\d{1,2})?)|(\d+(?:\.\d{1,2})?)\s*(?:gbp|pounds?|usd|dollars?|eur|euros?)\b/gi;
    var m;
    while ((m = re.exec(String(text || ""))) !== null) {
      var n = Number(m[1] || m[2]);
      if (Number.isFinite(n)) amounts.push(n);
    }
    var bare = /(\d+(?:\.\d{1,2})?)\s*(?:charge|fee|penalty|fine)\b|(?:charge|fee|penalty|fine)\s*(?:of\s*)?(?:£|\$|€)?\s*(\d+(?:\.\d{1,2})?)/gi;
    while ((m = bare.exec(String(text || ""))) !== null) {
      n = Number(m[1] || m[2]);
      if (Number.isFinite(n)) amounts.push(n);
    }
    return amounts;
  }

  function formatMoneySimple(amount) {
    var n = Number(amount);
    if (!Number.isFinite(n)) return "";
    return Number.isInteger(n) ? ("£" + n) : ("£" + n.toFixed(2));
  }

  function firstMoneyPhrase(text, currency) {
    var primary = extractPrimaryAmount(text, currency);
    if (primary) return primary;
    var amounts = extractMoneyAmounts(text);
    return amounts.length ? formatMoneySimple(amounts[0]) : "";
  }

  /**
   * True only when text already reads as professional hotel operational prose.
   * Grammar alone is not enough — telegraphic / informal ops notes return false.
   */
  function looksLikeHotelBrainProfessional(text) {
    var t = String(text || "").trim();
    if (!t) return false;
    if (t.length < 28) return false;
    if (/[!?]{2,}/.test(t)) return false;
    if (/\b(pls|plz|asap|kinda|sorta|gonna|wanna|teh|dont|cant|wont)\b/i.test(t)) return false;
    if (/\b(guest takes|if guest|we do not offer|we request|penalty charge|call guest|make sure guest|5days|nigh shifts|morning am)\b/i.test(t)) return false;
    if (/\b(smokes inside|key home|charge \d+|with any fee)\b/i.test(t)) return false;
    if (/^[a-z]/.test(t)) return false;
    if (!/[.!?]"?$/.test(t) && t.split(/\s+/).length < 14) return false;
    var sentences = t.split(/(?<=[.!?])\s+/).filter(Boolean);
    if (!sentences.length) return false;
    if (!/^[A-Z]/.test(sentences[0])) return false;
    if (/\b(and we request|as we cannot|with any fee)\b/i.test(t)) return false;
    return sentences.every(function (s) { return s.trim().length >= 12; }) && !/\b(etc\.?|blah)\b/i.test(t);
  }

  function applyHotelBrainOperationalVoice(text) {
    var result = String(text || "");
    result = result
      .replace(/\bwe do not\b/gi, "the hotel does not")
      .replace(/\bwe cannot\b/gi, "the hotel cannot")
      .replace(/\bwe request\b/gi, "guests are requested")
      .replace(/\bwe ask\b/gi, "guests are asked")
      .replace(/\bto make sure\b/gi, "to ensure")
      .replace(/\bmake sure\b/gi, "ensure")
      .replace(/\bguest can\b/gi, "the guest can")
      .replace(/\bguests can\b/gi, "guests can")
      .replace(/\bas we cannot\b/gi, "as this cannot")
      .replace(/\bwith any fee\b/gi, "as a paid service")
      .replace(/\bfor a fee\b/gi, "as a paid service")
      .replace(/\bnigh(?:t)?\s+before\b/gi, "the previous night")
      .replace(/\bnight before\b/gi, "the previous night")
      .replace(/\bbook it (?:the )?previous night\b/gi, "book the room from the previous night")
      .replace(/\bbook (?:the )?room (?:the )?previous night\b/gi, "book the room from the previous night")
      .replace(/\bcheck-?in early\b/gi, "check in early")
      .replace(/\bearly check-?ins\b/gi, "early check-in")
      .replace(/\blate check-?outs\b/gi, "late check-out")
      .replace(/\bsay yes\b/gi, "approve")
      .replace(/\bonly if\b/gi, "only when")
      .replace(/\bif not return\b/gi, "if not returned")
      .replace(/\bif guest\b/gi, "if a guest")
      .replace(/\bwhen guest\b/gi, "when a guest")
      .replace(/\bguest takes\b/gi, "a guest takes")
      .replace(/\bcall guest\b/gi, "contact the guest")
      .replace(/\bcontact guest\b/gi, "contact the guest")
      .replace(/\binform guest\b/gi, "inform the guest")
      .replace(/\bpenalty charge\b/gi, "penalty charge")
      .replace(/\bnot allowed\b/gi, "not permitted")
      .replace(/\sis not allowed\b/gi, " is not permitted")
      .replace(/\s{2,}/g, " ")
      .trim();
    return result;
  }

  /**
   * Pattern-led operations-manual rewrite for common Hotel Brain knowledge.
   * Only restructures meaning already present — never invents fees or policy.
   */
  function rewriteHotelBrainOperationalParagraph(rawText, options) {
    options = options || {};
    var original = trimText(rawText);
    if (!original) return "";

    var lower = original.toLowerCase();
    var amount = firstMoneyPhrase(original, options.currency);
    var result = "";

    /* Early check-in — not guaranteed / not offered as paid / book night before */
    if (/\bearly\s+check-?ins?\b/.test(lower) || /\bcheck-?in early\b/.test(lower)) {
      var cannotGuarantee = /cannot\s+guarantee|can't\s+guarantee|not\s+guaranteed|no\s+guarantee/.test(lower);
      var notOfferedPaid = /do not offer|don't offer|not offer|no fee|any fee|with any fee|not available|cannot sell|can't sell/.test(lower);
      var bookNightBefore = /night before|previous night|book.*night|arrive.*night before/.test(lower);

      if (cannotGuarantee || notOfferedPaid || bookNightBefore) {
        var sentences = [];
        if (cannotGuarantee && notOfferedPaid) {
          sentences.push("Early check-in cannot be guaranteed and is therefore not available as a paid service");
        } else if (cannotGuarantee) {
          sentences.push("Early check-in cannot be guaranteed");
        } else if (notOfferedPaid) {
          sentences.push("Early check-in is not available as a paid service");
        }
        if (bookNightBefore) {
          sentences.push("Guests who require an early check-in should book the room from the previous night to ensure the room is available upon arrival");
        }
        if (sentences.length) {
          result = sentences.map(function (s) { return ensureSentence(s); }).join(" ");
          return result;
        }
      }
    }

    /* Late check-out approval */
    if (/\blate\s+check-?outs?\b/.test(lower) || /\blate\s+c\/?o\b/.test(lower) || /\blate\s+co\b/.test(lower)) {
      if (amount && /fee|charge|cost|paid|pay/.test(lower)) {
        var untilMatch = original.match(/\buntil\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|\d{1,2}\s*(?:am|pm))/i);
        if (untilMatch) {
          result = "Late check-out is available until " + untilMatch[1].replace(/\s+/g, "") +
            " for a " + amount + " fee, subject to availability";
          return ensureSentence(result);
        }
        result = "Late check-out is available for a " + amount + " fee, subject to availability";
        return ensureSentence(result);
      }
      if ((/manager|dm|duty/.test(lower)) && /vip/.test(lower)) {
        result = "Late check-out requires Duty Manager approval, unless arranged for a VIP guest";
        return ensureSentence(result);
      }
      if (/manager|dm|duty/.test(lower) && /only|approve|yes|authoris|authoriz/.test(lower)) {
        result = "Late check-out requires Duty Manager approval";
        return ensureSentence(result);
      }
      if (/vip/.test(lower)) {
        result = "Late check-out may be arranged for VIP guests when authorised";
        return ensureSentence(result);
      }
    }

    /* Smoking in rooms — never invent a fee amount */
    if (/\bsmok(?:e|es|ing)\b/.test(lower) && /\b(room|rooms|inside|indoors?)\b/.test(lower)) {
      if (amount) {
        result = "Smoking is strictly prohibited throughout the hotel. " +
          "If a guest smokes inside a room, a " + amount + " smoking charge will be applied in accordance with hotel policy";
        return ensureSentence(result);
      }
      if (/penalty|charge|fine|fee/.test(lower)) {
        result = "Smoking is strictly prohibited throughout the hotel. " +
          "If a guest smokes inside a room, a smoking penalty charge will be applied in accordance with hotel policy";
        return ensureSentence(result);
      }
      result = "Smoking is strictly prohibited throughout the hotel, including inside guest rooms";
      return ensureSentence(result);
    }
    if (/smoking/.test(lower) && amount) {
      result = "A " + amount + " smoking cleaning charge applies where smoking is detected in a non-smoking room";
      return ensureSentence(result);
    }

    /* Key taken home / lost — preserve fee only when present */
    if (/\b(key|keys|keycard|key\s*card)\b/.test(lower) && /\b(home|lost|lose|taken|takes|missing|replacement)\b/.test(lower)) {
      var contact = /\b(call|contact|phone|ring)\b/.test(lower);
      if (amount && contact) {
        result = "If a guest takes a room key home or loses it, a " + amount + " replacement charge applies. " +
          "Contact the guest to arrange the return of the key before applying the charge where appropriate";
        return ensureSentence(result);
      }
      if (amount) {
        result = "If a guest takes a room key home or loses it, a " + amount + " replacement charge applies";
        return ensureSentence(result);
      }
      if (contact) {
        result = "If a guest takes a room key home or loses it, contact the guest to arrange return of the key before applying any replacement charge where appropriate";
        return ensureSentence(result);
      }
      result = "If a guest takes a room key home or loses it, a replacement charge may apply in accordance with hotel policy";
      return ensureSentence(result);
    }

    /* Loan item / adapter replacement charges */
    if ((/adapter|adaptor|iron|loan/.test(lower)) && (/not return|if not|charge|fee|pound|£|\d/.test(lower) || amount)) {
      var item = /iron/.test(lower) ? "loan iron or ironing board" : "loan adapter";
      if (/iron/.test(lower) && /adapter|adaptor/.test(lower)) item = "loan iron, ironing board or adapter";
      result = (amount ? "A " + amount + " replacement charge applies" : "A replacement charge applies") +
        " if a " + item + " is not returned";
      return ensureSentence(result);
    }

    /* Deposit */
    if (/deposit/.test(lower) && amount) {
      result = "A deposit of " + amount + " is required" +
        (/refund|return/.test(lower) ? " and is refundable subject to inspection" : "");
      return ensureSentence(result);
    }

    /* Damage / breakage */
    if (/\b(damage|breakage|broken|damaged)\b/.test(lower) && (amount || /charge|fee|penalty/.test(lower))) {
      result = amount
        ? "If a guest damages hotel property, a " + amount + " charge may be applied in accordance with hotel policy"
        : "If a guest damages hotel property, a charge may be applied in accordance with hotel policy";
      return ensureSentence(result);
    }

    /* No-show */
    if (/no[\s-]?show/.test(lower)) {
      result = amount
        ? "No-show reservations are charged " + amount + " in accordance with hotel policy"
        : "No-show reservations are charged in accordance with hotel policy";
      return ensureSentence(result);
    }

    /* Pets */
    if (/\b(pets?|dogs?|animals?)\b/.test(lower) && /\b(not\s+allow|not\s+permit|prohibited|no\s+pets)\b/.test(lower)) {
      result = "Pets are not permitted on the property, except where assistance animals are required";
      return ensureSentence(result);
    }

    /* Quiet hours */
    if (/\b(quiet\s+hours?|noise)\b/.test(lower)) {
      var times = original.match(/\d{1,2}(?::\d{2})?\s*(?:am|pm)/gi) || [];
      if (times.length >= 2) {
        result = "Quiet hours are observed from " + times[0].replace(/\s+/g, "") +
          " to " + times[1].replace(/\s+/g, "") + ". Guests should keep noise to a minimum during this period";
        return ensureSentence(result);
      }
    }

    return "";
  }

  function applyHotelBrainNormalisations(text) {
    var result = String(text || "");
    result = correctSpelling(result);
    result = standardiseTerminology(result);
    result = applyHotelBrainOperationalVoice(result);

    result = result
      .replace(/\b(\d+)\s*days\b/gi, function (_, n) { return dayCountPhrase(n); })
      .replace(/\b(\d)days\b/gi, function (_, n) { return dayCountPhrase(n); })
      .replace(/\bfive\s+days\s+working\s+week\b/gi, "five days per week")
      .replace(/\b(\w+)\s+days\s+working\s+week\b/gi, "$1 days per week")
      .replace(/\bworking\s+week\b/gi, "per week")
      .replace(/\bmorning\s+am\b/gi, "AM")
      .replace(/\bafternoon\s+pm\b/gi, "PM")
      .replace(/\b\bam\s+and\s+(?:afternoon\s+)?pm\b/gi, "AM and PM")
      .replace(/\b\bam\s+shifts?\b/gi, "AM shifts")
      .replace(/\b\bpm\s+shifts?\b/gi, "PM shifts")
      .replace(/\bcovers?\s+the\s+nigh(?:t)?\s+shifts?\b/gi, "covers the night shift")
      .replace(/\bcovers?\s+nigh(?:t)?\s+shifts?\b/gi, "covers the night shift")
      .replace(/\bduty\s+managers\b/gi, "Duty Managers")
      .replace(/\bduty\s+manager\b/gi, "Duty Manager")
      .replace(/\bnight\s+managers\b/gi, "Night Managers")
      .replace(/\bnight\s+manager\b/gi, "Night Manager")
      .replace(/\bgeneral\s+managers\b/gi, "General Managers")
      .replace(/\bgeneral\s+manager\b/gi, "General Manager")
      .replace(/\bon\s+the\s+(Duty|Night|General)\s+Manager\s+days\s+off\b/gi, "During the $1 Manager's days off")
      .replace(/\bcovers?\s+(?:the\s+)?AM\s+and\s+PM\s+shifts?\b/gi, "cover the AM and PM shifts")
      .replace(/\bshifts,\s+(five|six|seven|\d+)\s+days\s+per\s+week\s+(Night|Duty|General)\s+Manager/gi,
        "shifts $1 days per week. The $2 Manager")
      .replace(/\bThe\s+(Night|Duty|General)\s+Manager\s+(five|six|seven|\d+)\s+days\s+per\s+week\b/gi,
        "The $1 Manager covers $2 days per week")
      .replace(/\b(per\s+week)\s+(Night|Duty|General)\s+Manager\s+(five|six|seven|\d+)\s+days\s+per\s+week\b/gi,
        "$1. The $2 Manager covers $3 days per week")
      .replace(/\bThe\s+Night\s+Manager\s+covers\s+(five|six|seven|\d+)\s+days\s+per\s+week\b/gi,
        "The Night Manager covers $1 night shifts per week")
      .replace(/\bDuring\s+the\s+(Night|Duty|General)\s+Manager's\s+days\s+off\s+or\s+annual\s+leave,\s+(Duty|Night|General)\s+Manager\b/gi,
        "During the $1 Manager's days off or annual leave, a $2 Manager")
      .replace(/\b,\s*During\b/g, ". During")
      .replace(/\b,\s*on\s+the\b/gi, ". During the")
      .replace(/\bdm\b(?=\s|$|[.,!?])/gi, "Duty Manager")
      .replace(/\bgm\b(?=\s|$|[.,!?])/gi, "General Manager")
      .replace(/\blate\s+c\/?o\b/gi, "late check-out")
      .replace(/\bearly\s+c\/?i\b/gi, "early check-in")
      .replace(/\blate\s+co\b/gi, "late check-out")
      .replace(/\bcharge\s+(\d+(?:\.\d{1,2})?)\b/gi, "a £$1 charge")
      .replace(/\b(\d+(?:\.\d{1,2})?)\s*(?:pound|pounds|gbp)\b/gi, "£$1")
      .replace(/\s{2,}/g, " ")
      .trim();

    return result;
  }

  function finaliseHotelBrainSentences(text) {
    var result = tidyPhrase(text);
    if (!result) return "";

    /* Split run-on clauses joined only by commas before a new subject */
    result = result
      .replace(/,\s+(we\s+|guests?\s+are\s+|the\s+hotel\s+)/gi, ". $1")
      .replace(/,\s+(guests?\s+who\b)/gi, ". $1");

    /* Split glued sentences before role titles mid-string */
    result = result.replace(
      /([a-z0-9])\s+(The\s+(?:Duty|Night|General)\s+Managers?\b)/g,
      "$1. $2"
    );
    result = result.replace(
      /([.!?])\s*(during\b)/gi,
      function (_, punct, during) {
        return punct + " " + during.charAt(0).toUpperCase() + during.slice(1);
      }
    );

    var parts = result.replace(/([.!?])\s+/g, "$1\n").split("\n");
    var sentences = parts.map(function (part) {
      var s = tidyPhrase(part);
      if (!s) return "";
      s = capitalize(s);
      if (!/[.!?]$/.test(s)) s += ".";
      return s;
    }).filter(Boolean);

    return sentences.join(" ");
  }

  function ensureProtectedFactsPresent(original, improved) {
    var result = String(improved || "");
    var checks = []
      .concat(extractRoomNumbers(original).map(function (r) {
        return { label: "room", value: r, re: new RegExp("\\b" + escapeRegExp(r) + "\\b", "i") };
      }))
      .concat(extractTimes(original).map(function (t) {
        return { label: "time", value: t, re: new RegExp(escapeRegExp(t), "i") };
      }))
      .concat(extractPercentages(original).map(function (p) {
        return { label: "pct", value: p, re: new RegExp(escapeRegExp(p), "i") };
      }))
      .concat(extractDates(original).map(function (d) {
        return { label: "date", value: d, re: new RegExp(escapeRegExp(d), "i") };
      }))
      .concat(extractGuestNames(original).map(function (n) {
        return { label: "name", value: n, re: new RegExp(escapeRegExp(n), "i") };
      }));

    checks.forEach(function (item) {
      if (!item.value) return;
      if (!item.re.test(result)) {
        result = tidyPhrase(result + (result ? " " : "") + item.value);
      }
    });

    extractMoney(original).forEach(function (amount) {
      if (!moneyPresentInText(result, amount)) {
        var formatted = formatMoneyAmount(amount) || amount;
        if (!moneyPresentInText(result, formatted)) {
          result = tidyPhrase(result + (result ? " " : "") + formatted);
        }
      }
    });

    return result;
  }

  /**
   * Hotel Brain Writing V3 — global Hotel Operations Editor.
   * Rewrites free-text knowledge as professional British English ops prose.
   * Preserves meaning and facts; never invents policies, fees, tasks or completion.
   */
  function improveHotelBrainWriting(rawText, options) {
    options = options || {};
    var original = trimText(rawText);
    if (!original) return "";

    var paragraphs = original.split(/\n/);
    var improvedParagraphs = paragraphs.map(function (para) {
      var line = trimText(para);
      if (!line) return "";

      var patterned = rewriteHotelBrainOperationalParagraph(line, options);
      if (patterned) {
        patterned = stripHandoverActionTemplates(patterned);
        patterned = removeInventedCompletion(line, patterned);
        patterned = ensureProtectedFactsPresent(line, patterned);
        return patterned;
      }

      var normalised = applyHotelBrainNormalisations(line);
      normalised = normalised
        .replace(/\bc\/o\b/gi, "check-out")
        .replace(/\bc\/i\b/gi, "check-in")
        .replace(/\bpls\b/gi, "please")
        .replace(/\bplz\b/gi, "please")
        .replace(/\btmrw\b/gi, "tomorrow")
        .replace(/\bw\/\b/gi, "with")
        .replace(/\basap\b/gi, "as soon as possible")
        .replace(/\binfo\b/gi, "information")
        .replace(/\bthru\b/gi, "through")
        .replace(/\bcan't\b/gi, "cannot")
        .replace(/\bdon't\b/gi, "do not")
        .replace(/\bwon't\b/gi, "will not");

      /* Second-pass pattern match after light normalisation */
      patterned = rewriteHotelBrainOperationalParagraph(normalised, options);
      if (patterned) {
        patterned = stripHandoverActionTemplates(patterned);
        patterned = removeInventedCompletion(line, patterned);
        patterned = ensureProtectedFactsPresent(line, patterned);
        return patterned;
      }

      normalised = finaliseHotelBrainSentences(normalised);
      normalised = stripHandoverActionTemplates(normalised);
      normalised = removeInventedCompletion(line, normalised);
      normalised = ensureProtectedFactsPresent(line, normalised);
      return normalised;
    });

    var improved = improvedParagraphs.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    improved = stripHandoverActionTemplates(improved);
    improved = removeInventedCompletion(original, improved);
    improved = ensureProtectedFactsPresent(original, improved);

    if (containsHandoverActionTemplate(improved) && !containsHandoverActionTemplate(original)) {
      improved = stripHandoverActionTemplates(improved);
    }

    var prefs = Object.assign(
      { language: "British English", tone: "concise" },
      (options && options.prefs) || {}
    );
    improved = applyPreferences(improved, {
      prefs: prefs,
      terminologyMap: options.terminologyMap,
      platformLabels: options.platformLabels,
      uiLabels: options.uiLabels
    });

    /* Safety: never invent money amounts not present in source */
    var outAmounts = extractMoneyAmounts(improved);
    var i;
    for (i = 0; i < outAmounts.length; i++) {
      if (!moneyPresentInText(original, outAmounts[i]) &&
          !moneyPresentInText(original, formatMoneySimple(outAmounts[i]))) {
        return original;
      }
    }

    return improved;
  }

  /**
   * Explain Briefly — one or two simple sentences for new staff.
   */
  function explainHotelBrainBriefly(rawText, options) {
    options = options || {};
    var original = trimText(rawText);
    if (!original) return "";

    var improved = improveHotelBrainWriting(original, options) || original;
    var source = trimText(improved) || original;
    var amount = firstMoneyPhrase(source, options.currency) || firstMoneyPhrase(original, options.currency);
    var brief = "";

    if (/\bearly check-in\b/i.test(source) && /\b(not available as a paid service|cannot be guaranteed)\b/i.test(source)) {
      brief = "Early check-in is not guaranteed. Guests who need it should book from the night before.";
    } else if (/\bsmok(?:e|ing)\b/i.test(source)) {
      brief = amount
        ? ("Smoking indoors is not allowed. A " + amount + " charge applies if a guest smokes in a room.")
        : "Smoking indoors is not allowed. A smoking charge may apply if a guest smokes in a room.";
    } else if (/\b(key|keys|keycard)\b/i.test(source) && /\b(home|lost|replacement)\b/i.test(source)) {
      brief = amount
        ? ("If a guest loses a key or takes it home, a " + amount + " replacement charge may apply. Contact the guest first where appropriate.")
        : "If a guest loses a key or takes it home, contact them and apply the replacement charge where appropriate.";
    } else if (/\blate check-out\b/i.test(source)) {
      brief = amount
        ? ("Late check-out may be available for a " + amount + " fee, subject to availability.")
        : "Late check-out may be available subject to availability and any stated fee.";
    } else {
      var sentences = source.split(/(?<=[.!?])\s+/).map(function (s) { return s.trim(); }).filter(Boolean);
      brief = sentences.slice(0, 2).join(" ")
        .replace(/\bin accordance with hotel policy\b/gi, "")
        .replace(/\bis therefore not available\b/gi, "is not available")
        .replace(/\bwill be applied\b/gi, "applies")
        .replace(/\s{2,}/g, " ")
        .trim();
      if (brief && !/[.!?]$/.test(brief)) brief += ".";
    }

    /* Safety: strip invented money */
    var briefAmounts = extractMoneyAmounts(brief);
    for (var j = 0; j < briefAmounts.length; j++) {
      if (!moneyPresentInText(original, briefAmounts[j]) &&
          !moneyPresentInText(original, formatMoneySimple(briefAmounts[j]))) {
        brief = brief.replace(/(?:a\s+)?£\d+(?:\.\d{1,2})?\s+/gi, "a ").replace(/\s{2,}/g, " ").trim();
      }
    }

    return brief;
  }

  /** @deprecated Use improveHotelBrainWriting — kept for callers */
  function rewriteKnowledgeText(rawText, options) {
    return improveHotelBrainWriting(rawText, options);
  }

  function polishText(rawText, options) {
    options = options || {};
    var module = options.module || MODULES.general;
    var text = trimText(rawText);
    if (!text) return "";

    if (module === MODULES.policy) return rewritePolicyText(text, options);
    if (module === MODULES.knowledge || module === MODULES.hotelBrain) {
      return rewriteKnowledgeText(text, options);
    }
    if (module === MODULES.handover || module === MODULES.operations ||
        module === MODULES.inventory || module === MODULES.maintenance ||
        module === MODULES.guestPreferences || module === MODULES.checklists) {
      return rewriteOperationalNote(text, options);
    }

    /* SOP / general: spelling, abbreviations, terminology, prefs — keep structure */
    var normalized = normalizeInput(text);
    normalized = capitalize(normalized);
    if (normalized.length > 40 && !/[.!?]$/.test(normalized) && normalized.indexOf("\n") === -1) {
      normalized += ".";
    }
    return applyPreferences(normalized, options);
  }

  function rewrite(text, options) {
    return polishText(text, options || {});
  }

  /* ------------------------------------------------------------------ */
  /*  Intelligent shift summary                                         */
  /* ------------------------------------------------------------------ */

  function classifySummaryTopic(note) {
    var text = String((note && (note.original || note.text)) || "").toLowerCase();
    var section = (note && note.section) || "";

    if (detectExtendStay(text)) return "extension";
    if (detectLateCheckout(text)) return "lateCheckout";
    if (detectRoomMove(text) || /\bupgrade\b/.test(text)) return "roomMove";
    if (detectIronRequest(text) || /\badapter|inventory|loan\b/.test(text) || section === "inventory") {
      return "inventory";
    }
    if (section === "urgent" || noteContains(text, ["flood", "fire", "evacuat", "unsafe", "injury"])) {
      return "critical";
    }
    if (section === "maintenance" || detectAcIssue(text) || noteContains(text, ["leak", "broken", "repair"])) {
      return "maintenance";
    }
    if (section === "payments" || noteContains(text, ["balance", "declined", "payment", "folio"])) {
      return "payment";
    }
    if (section === "vip" || (note && note.isVip)) return "vip";
    if (detectComplaint(text)) return "complaint";
    if (section === "guest") return "guest";
    if (section === "events") return "event";
    if (section === "tasks") return "task";
    if (section === "deliveries") return "delivery";
    if (section === "lostproperty") return "lostProperty";
    if (section === "completed") return "completed";
    return "other";
  }

  function topicLabel(topic, count) {
    var map = {
      critical: ["critical operational issue", "critical operational issues"],
      extension: ["guest extension request", "guest extension requests"],
      lateCheckout: ["confirmed late check-out", "confirmed late check-outs"],
      roomMove: ["room move with a paid upgrade", "room moves with paid upgrades"],
      inventory: ["inventory request", "inventory requests"],
      maintenance: ["maintenance follow-up", "maintenance follow-ups"],
      payment: ["payment follow-up", "payment follow-ups"],
      vip: ["VIP arrival", "VIP arrivals"],
      complaint: ["guest complaint", "guest complaints"],
      guest: ["guest follow-up", "guest follow-ups"],
      event: ["event coordination item", "event coordination items"],
      task: ["outstanding task", "outstanding tasks"],
      delivery: ["delivery to collect", "deliveries to collect"],
      lostProperty: ["lost property item", "lost property items"],
      completed: ["completed action", "completed actions"],
      other: ["follow-up item", "follow-up items"]
    };
    var pair = map[topic] || map.other;
    return count === 1 ? pair[0] : pair[1];
  }

  function isActiveAnalyzedNote(note) {
    if (!note) return false;
    if (note.section === "completed") return false;
    var text = String(note.original || note.text || "").toLowerCase();
    if (/\b(resolved|completed|fixed|done|closed|sorted)\b/.test(text) &&
        !/\b(not |still |un)/.test(text)) {
      return false;
    }
    return true;
  }

  function summarizeHandover(input, options) {
    options = options || {};
    input = input || {};
    var analyzed = input.analyzed || (input.classified && input.classified._analyzed) || [];
    var prefs = options.prefs || input.prefs || {};

    /* Phase 2A: use structured facts when notes already carry them. */
    var hasAttachedFacts = analyzed.some(function (note) {
      return note && note.fact;
    });
    if (hasAttachedFacts) {
      return summarizeFromFacts(analyzed, {
        prefs: prefs,
        detail: prefs.detail || options.detail,
        terminologyMap: options.terminologyMap
      });
    }

    var active = analyzed.filter(isActiveAnalyzedNote);
    var detail = prefs.detail || options.detail || "standard";

    var topicCounts = {};
    var topicOrder = [];
    active.forEach(function (note) {
      var topic = classifySummaryTopic(note);
      if (!topicCounts[topic]) {
        topicCounts[topic] = 0;
        topicOrder.push(topic);
      }
      topicCounts[topic] += 1;
    });

    var criticalCount = topicCounts.critical || 0;
    var followUpTopics = topicOrder.filter(function (t) {
      return t !== "critical" && t !== "completed" && t !== "other";
    });
    /* Include generic "other" only when nothing more specific exists */
    if (!followUpTopics.length && topicCounts.other) followUpTopics = ["other"];

    var followUpCount = followUpTopics.reduce(function (sum, t) {
      return sum + (topicCounts[t] || 0);
    }, 0);

    var sentences = [];

    if (!active.length) {
      sentences.push("No operational issues were identified during the shift.");
    } else if (criticalCount === 0) {
      sentences.push("No critical operational issues were identified during the shift.");
    } else if (criticalCount === 1) {
      sentences.push("One critical operational issue requires immediate attention.");
    } else {
      sentences.push(criticalCount + " critical operational issues require immediate attention.");
    }

    if (followUpCount > 0) {
      var includeList = followUpTopics.slice(0, detail === "brief" ? 2 : 4);
      var listed = includeList.map(function (topic) {
        return countWord(topicCounts[topic], topicLabel(topic, 1).replace(/^one\s+/i, ""), topicLabel(topic, 2));
      });

      /* Prefer the richer “including …” form from the product examples */
      var opener = followUpCount === 1
        ? "One follow-up item remains"
        : capitalize(numberWord(followUpCount)) + " follow-up items remain";

      if (listed.length === 1 && followUpCount === topicCounts[includeList[0]]) {
        sentences.push(opener + ", including " + listed[0] + ".");
      } else if (listed.length) {
        sentences.push(opener + ", including " + joinNatural(listed) + ".");
      } else {
        sentences.push(opener + ".");
      }
    } else if (active.length && criticalCount === 0) {
      sentences.push("The incoming team has a clear handover with no outstanding follow-ups.");
    }

    if (topicCounts.vip && detail !== "brief") {
      sentences.push(
        topicCounts.vip === 1
          ? "VIP preparation should be reviewed before arrival."
          : "VIP preparations should be reviewed before arrival."
      );
    }

    var limit = detail === "brief" ? 2 : (detail === "comprehensive" ? 5 : 3);
    var summary = sentences.slice(0, limit).join(" ");
    return applyPreferences(summary, { prefs: prefs, terminologyMap: options.terminologyMap });
  }

  function summarizeOperationalPicture(items, options) {
    return summarizeHandover({ analyzed: items || [] }, options);
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                        */
  /* ------------------------------------------------------------------ */

  var Api = {
    version: ENGINE_VERSION,
    MODULES: MODULES,

    rewrite: rewrite,
    rewriteNote: rewriteNote,
    rewritePolicy: rewritePolicyText,
    rewriteKnowledge: rewriteKnowledgeText,
    improveHotelBrainWriting: improveHotelBrainWriting,
    explainHotelBrainBriefly: explainHotelBrainBriefly,
    looksLikeHotelBrainProfessional: looksLikeHotelBrainProfessional,
    polish: polishText,

    summarizeHandover: summarizeHandover,
    summarizeOperationalPicture: summarizeOperationalPicture,

    applyPreferences: applyPreferences,
    normalizeInput: normalizeInput,
    correctSpelling: correctSpelling,
    expandAbbreviations: expandAbbreviations,
    standardiseTerminology: standardiseTerminology,

    extractRoomNumbers: extractRoomNumbers,
    extractMoney: extractMoney,
    extractTimes: extractTimes,
    extractGuestNames: extractGuestNames,
    extractPercentages: extractPercentages,
    extractDates: extractDates,
    containsHandoverActionTemplate: containsHandoverActionTemplate,
    inventsCompletionStatus: inventsCompletionStatus,
    formatTime: formatTime,
    formatMoneyAmount: formatMoneyAmount,

    /* Phase 1 / 2A structured facts */
    FACT_STATUS: FACT_STATUS,
    extractOperationalFact: extractOperationalFact,
    extractOperationalFacts: extractOperationalFacts,
    splitSourceIntoFactSegments: splitSourceIntoFactSegments,
    renderOperationalFactDisplay: renderOperationalFactDisplay,
    isActualFinancialIssue: isActualFinancialIssue,
    isReservationCommercialLanguage: isReservationCommercialLanguage,
    hasUsefulOperationalDetail: hasUsefulOperationalDetail,
    classifyFactStatus: classifyFactStatus,
    isPhase1SupportedFact: isPhase1SupportedFact,
    renderFactPhase1: renderFactPhase1,
    mapFactStatusToItemStatus: mapFactStatusToItemStatus,
    isFactUnresolved: isFactUnresolved,
    isFactClosed: isFactClosed,
    summarizeFromFacts: summarizeFromFacts,
    buildSummaryDetailCards: buildSummaryDetailCards,
    displayWritingForNote: displayWritingForNote,
    computeHandoverMetricsFromFacts: computeHandoverMetricsFromFacts,
    isGlanceActiveFact: isGlanceActiveFact,
    factIdentityKey: factIdentityKey,
    factMergeFamilyKey: factMergeFamilyKey,
    consolidateNotesByFacts: consolidateNotesByFacts,
    sectionFromFact: sectionFromFact
  };

  global.AiWritingEngine = Api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Api;
  }
})(typeof window !== "undefined" ? window : globalThis);
