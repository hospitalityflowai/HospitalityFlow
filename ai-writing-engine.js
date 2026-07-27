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
      num = String(num).toUpperCase();
      if (seen[num]) return;
      var parsed = parseInt(num, 10);
      if (isNaN(parsed) || parsed < 1 || parsed > 9999) return;
      seen[num] = true;
      rooms.push(num);
    }

    var source = String(text || "");

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
    var status;
    if (isConfirmedLanguage(normalized) || (until && !isRequestLanguage(normalized))) {
      status = "Late check-out has been confirmed" + untilBit;
    } else if (isRequestLanguage(normalized)) {
      status = "Late check-out has been requested" + untilBit;
    } else {
      status = "Late check-out has been noted" + untilBit;
    }
    if (isConfirmedLanguage(normalized) || (until && !isRequestLanguage(normalized))) {
      return appendAction(
        status,
        "Please advise Housekeeping and ensure the guest is not disturbed before the agreed departure time"
      );
    }
    if (isRequestLanguage(normalized)) {
      return appendAction(
        status,
        "Please confirm with the Duty Manager whether this can be approved and update the guest"
      );
    }
    return appendAction(
      status,
      "Please confirm the departure time with the guest and advise Housekeeping if approved"
    );
  }

  function buildExtendStayBody(normalized) {
    var when = /morning|am\b|speak|call|follow/i.test(normalized)
      ? "in the morning"
      : "as soon as practical";
    return appendAction(
      "The guest has requested to extend their stay",
      "Please follow up with the guest " + when +
        ", confirm availability, and update the reservation if the extension is agreed"
    );
  }

  function buildRoomMoveBody(normalized, rooms, options) {
    var dest = extractDestinationRoom(normalized, rooms);
    var amount = extractPrimaryAmount(normalized, options && options.currency);
    var status;

    if (dest) {
      status = "The guest has been relocated to Room " + dest;
    } else {
      status = "The guest has been relocated to another room";
    }

    if (/\bupgrade\b/i.test(normalized) || amount) {
      if (amount) {
        status += ". The upgrade is confirmed at an additional charge of " + amount + " per night";
      } else {
        status += ". The room upgrade is confirmed";
      }
    } else if (amount) {
      status += ". An additional charge of " + amount + " per night applies";
    }

    return appendAction(
      status,
      "Please ensure the PMS reflects the new room allocation" +
        (amount || /\bupgrade\b/i.test(normalized) ? " and that the upgrade charge has been posted" : "")
    );
  }

  function buildIronBody() {
    return appendAction(
      "The guest has requested an iron and ironing board",
      "Please arrange delivery to the room and confirm with the guest once provided"
    );
  }

  function buildAcBody(normalized) {
    if (detectComplaint(normalized)) {
      return appendAction(
        "The guest has reported an air-conditioning issue and is unhappy with the situation",
        "Please arrange for Maintenance to attend, follow up with the guest to confirm the issue has been resolved, and record the outcome"
      );
    }
    if (noteContains(normalized, ["not cooling", "broken", "not working", "faulty"])) {
      var status = "Air conditioning is not cooling correctly and requires inspection";
      if (noteContains(normalized, ["informed", "eta", "engineer", "not attended"])) {
        status += ". Maintenance has been informed but has not yet completed the attendance";
      }
      return appendAction(
        status,
        "Please chase Maintenance for an update and follow up with the guest once resolved"
      );
    }
    return appendAction(
      "An air-conditioning issue has been reported",
      "Please arrange for Maintenance to attend and follow up with the guest to confirm the issue has been resolved"
    );
  }

  function buildComplaintBody(normalized) {
    if (detectAcIssue(normalized)) return buildAcBody(normalized);
    var topic = "";
    if (noteContains(normalized, ["noise"])) topic = " regarding noise";
    else if (noteContains(normalized, ["smell", "odour", "odor"])) topic = " regarding an odour";
    else if (noteContains(normalized, ["clean", "housekeeping"])) topic = " regarding room cleanliness";
    else if (noteContains(normalized, ["wifi", "internet"])) topic = " regarding Wi-Fi";
    return appendAction(
      "The guest has raised a complaint" + topic + " and requires recovery follow-up",
      "Please contact the guest, resolve the concern where possible, and escalate to the Duty Manager if compensation or further support is needed"
    );
  }

  function buildInventoryBody(normalized) {
    if (/\badapter/i.test(normalized)) {
      if (noteContains(normalized, ["outstanding", "still", "issued", "not return", "not returned"])) {
        return appendAction(
          "Loan adapter(s) issued to the guest remain outstanding",
          "Please collect the adapter(s) before departure and update the inventory log"
        );
      }
      return appendAction(
        "The guest has requested a loan adapter",
        "Please issue the adapter, record it in the inventory log, and confirm delivery with the guest"
      );
    }
    if (detectIronRequest(normalized)) return buildIronBody();
    if (noteContains(normalized, ["pillow"])) {
      return appendAction(
        "Extra pillows have been requested and remain outstanding",
        "Please arrange delivery with Housekeeping and confirm once provided"
      );
    }
    if (noteContains(normalized, ["towel"])) {
      return appendAction(
        "Additional towels have been requested",
        "Please arrange delivery with Housekeeping and confirm once provided"
      );
    }
    return "";
  }

  function buildVipBody(normalized, original, guestName, prefs) {
    var status = "VIP" + (guestName ? " " + guestName : " guest") +
      (noteContains(normalized, ["arriv"]) ? " is arriving" : " is noted for this shift");
    var timeMatch = original.match(/\b(\d{1,2}[:.]\d{2}|\d{1,2}\s*(?:am|pm))\b/i) ||
      normalized.match(/\b(\d{1,2}[:.]\d{2}|\d{1,2}\s*(?:am|pm))\b/i);
    if (timeMatch) status += " at " + formatTime(timeMatch[1], prefs);

    var amenityBits = [];
    if (noteContains(normalized, ["champagne"])) amenityBits.push("champagne");
    if (noteContains(normalized, ["flowers"])) amenityBits.push("flowers");
    if (noteContains(normalized, ["water"])) amenityBits.push("extra water");
    if (noteContains(normalized, ["quiet"])) amenityBits.push("a quiet room");
    if (amenityBits.length) {
      status += ". Welcome amenities to prepare: " + joinNatural(amenityBits);
    }

    return appendAction(
      status,
      "Please review the reservation before arrival and ensure Reception and Housekeeping are briefed"
    );
  }

  function buildPaymentBody(normalized, options) {
    var amount = extractPrimaryAmount(normalized, options && options.currency);
    var amountBit = amount ? " of " + amount : "";
    if (noteContains(normalized, ["declined"])) {
      return appendAction(
        "The guest's card was declined and an outstanding balance" + amountBit + " remains on the folio",
        "Please settle the balance before departure and offer an alternative payment method if required"
      );
    }
    if (noteContains(normalized, ["outstanding", "balance", "folio"])) {
      return appendAction(
        "An outstanding balance" + amountBit + " remains on the guest folio",
        "Please settle the account before departure"
      );
    }
    if (noteContains(normalized, ["minibar"])) {
      return appendAction(
        "A minibar charge" + amountBit + " requires review" +
          (noteContains(normalized, ["dispute", "not consumed"]) ? " following a guest dispute" : ""),
        "Please review the charge with the guest and adjust the folio if appropriate"
      );
    }
    if (noteContains(normalized, ["ota", "virtual card", "booking.com", "expedia"])) {
      return appendAction(
        "An OTA or channel payment" + amountBit + " still needs to be processed",
        "Please complete the payment posting and confirm the folio is clear"
      );
    }
    return "";
  }

  function buildMaintenanceBody(normalized, section) {
    if (detectAcIssue(normalized)) return buildAcBody(normalized);
    if (noteContains(normalized, ["leak", "leaking", "shower"])) {
      var leakStatus = "A shower leak remains open" +
        (noteContains(normalized, ["previous shift", "still", "carried"])
          ? " from the previous shift"
          : "");
      if (section === "urgent" || noteContains(normalized, ["urgent", "asap"])) {
        leakStatus += " and requires priority attention";
      }
      return appendAction(
        leakStatus,
        "Please arrange an inspection with Maintenance and update Reception once the room is safe for the guest"
      );
    }
    if (noteContains(normalized, ["tv", "remote"])) {
      return appendAction(
        "The television remote is not working",
        "Please supply a replacement remote and confirm with the guest once resolved"
      );
    }
    if (noteContains(normalized, ["heating", "no heat", "cold"])) {
      return appendAction(
        "A heating issue has been reported",
        "Please arrange for Maintenance to attend and follow up with the guest once resolved"
      );
    }
    if (noteContains(normalized, ["lock", "key", "cannot enter", "card not"])) {
      return appendAction(
        "The guest is experiencing a room access or lock issue",
        "Please re-encode or replace the key card and escort the guest if required"
      );
    }
    return "";
  }

  function buildDeliveryBody(guestName) {
    return appendAction(
      "A package is being held at Reception" + (guestName ? " for " + guestName : ""),
      "Please contact the guest to arrange collection and record when it has been handed over"
    );
  }

  function buildTaskBody(normalized) {
    if (noteContains(normalized, ["dnd"])) {
      return appendAction(
        "The room is on Do Not Disturb",
        "Please hold cleaning until the DND is released and check again later in the shift"
      );
    }
    if (noteContains(normalized, ["pillow"])) {
      return appendAction(
        "Extra pillows have been requested and remain outstanding",
        "Please arrange delivery with Housekeeping and confirm once provided"
      );
    }
    if (noteContains(normalized, ["turndown"])) {
      return appendAction(
        "Turndown service has been requested",
        "Please ensure Housekeeping complete turndown at the agreed time"
      );
    }
    return "";
  }

  function fallbackOperationalBody(normalized, room, options) {
    var detail = room ? stripRoomLead(normalized, room) : normalized;
    detail = detail
      .replace(/^\[[^\]]+\]\s*/, "")
      .replace(/\bmaintenance (?:has been |was )?informed\b/gi, "Maintenance has been informed")
      .replace(/\bengineer eta\b/gi, "engineer due")
      .replace(/\bstill leaking from previous shift,?\s*urgent\b/gi, "still open from the previous shift and remains urgent")
      .replace(/\bnot cooling properly\b/gi, "not cooling correctly")
      .replace(/\bhas been informed but has not attended yet\b/gi, "has been informed but has not yet attended")
      .replace(/\balready booked\b/gi, "has been booked")
      .replace(/\bplease\b/gi, "please")
      .replace(/\s{2,}/g, " ");
    detail = tidyPhrase(detail);
    if (!detail) return "";

    /* Expand into a Duty Manager instruction rather than leaving a fragment */
    if (!/^(the |a |an |guest |please |maintenance |housekeeping |reception )/i.test(detail)) {
      detail = "Please note: " + detail.charAt(0).toLowerCase() + detail.slice(1);
    }

    if (!/\b(please|follow up|arrange|confirm|ensure|advise|contact|update)\b/i.test(detail)) {
      detail = appendAction(
        detail,
        "Please follow up during this shift and update the incoming team with the outcome"
      );
      return tidyPhrase(detail).replace(/\.$/, "");
    }

    return detail;
  }

  function maybeAddFollowUp(body, normalized, options) {
    if (!body) return body;
    if (options && options.addFollowUp === false) return body;
    if (/\bplease\b/i.test(body) && /\b(follow up|arrange|confirm|ensure|advise|contact|settle|chase|collect|issue|update)\b/i.test(body)) {
      return body;
    }

    var needsFollowUp =
      detectExtendStay(normalized) ||
      detectComplaint(normalized) ||
      (detectAcIssue(normalized) && !isConfirmedLanguage(normalized)) ||
      noteContains(normalized, ["speak morning", "call morning", "pending", "outstanding", "still need"]);

    if (!needsFollowUp) return body;
    if (/morning/i.test(normalized)) {
      return appendAction(body, "Please follow up in the morning and update the handover with the outcome");
    }
    return appendAction(body, "Please follow up during this shift and record the outcome");
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
    return {
      sourceText: String(sourceText || ""),
      rooms: [],
      subject: "",
      status: FACT_STATUS.unknown,
      ownerDept: "",
      ownerName: "",
      actionVerb: "",
      actionTarget: "",
      details: [],
      sectionHint: ""
    };
  }

  /**
   * True only when "settled" / related language has payment or account context.
   * Guest-status uses of "settled" (checked in, comfortable) must not match.
   */
  function hasFinancialSettlementContext(text) {
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
      /\b(?:request(?:ed)?|asking|asked|would like|wants?|needs?)\b/.test(lower)
    ) {
      return FACT_STATUS.requested;
    }

    if (
      /\b(?:approved|confirmed|agreed|granted|authorised|authorized)\b/.test(lower) ||
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

    var followMatch = sourceText.match(/\bfollow[\s-]*up\s+with\s+([A-Za-z][A-Za-z\s]*?)(?=\s+on\b|\s+regarding\b|\s+about\b|[.,;]|$)/i);
    if (followMatch) {
      fact.actionVerb = "follow_up";
      fact.actionTarget = trimText(followMatch[1]).toLowerCase().replace(/\s+/g, " ");
      fact.ownerDept = departmentFromTarget(fact.actionTarget.split(/\s+/)[0]);
      fact.subject = "follow_up";
    }

    if (hasFinancialSettlementContext(sourceText) &&
        (/\bsettled\b/i.test(sourceText) || /\boutstanding\s+(?:balance|amount)\b/i.test(sourceText) ||
          /\b(?:balance|folio|payment|invoice|bill)\b/i.test(sourceText))) {
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
    if (!fact || !fact.status) return true;
    return fact.status !== FACT_STATUS.done && fact.status !== FACT_STATUS.confirmed;
  }

  /** Completed or confirmed — do not chase. */
  function isFactClosed(fact) {
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
        section === "payments") {
      return "payment";
    }
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
      if (!fact) return;
      if (note.section === "completed" && fact.status === FACT_STATUS.unknown) {
        fact = Object.assign({}, fact, { status: FACT_STATUS.done });
      }
      if (isFactClosed(fact) && fact.status === FACT_STATUS.done) {
        completed.push({ note: note, fact: fact, topic: classifyFactSummaryTopic(fact, note) });
      } else if (isFactUnresolved(fact) && note.section !== "completed") {
        unresolved.push({ note: note, fact: fact, topic: classifyFactSummaryTopic(fact, note) });
      }
    });

    var topicCounts = {};
    var topicOrder = [];
    unresolved.forEach(function (entry) {
      var topic = entry.topic;
      if (topic === "completed") return;
      if (!topicCounts[topic]) {
        topicCounts[topic] = 0;
        topicOrder.push(topic);
      }
      topicCounts[topic] += 1;
    });

    var criticalCount = topicCounts.critical || 0;
    var followUpTopics = topicOrder.filter(function (t) {
      return t !== "critical" && t !== "completed";
    });
    if (!followUpTopics.length && topicCounts.other) followUpTopics = ["other"];

    var followUpCount = followUpTopics.reduce(function (sum, t) {
      return sum + (topicCounts[t] || 0);
    }, 0);

    var sentences = [];

    if (!unresolved.length && !completed.length) {
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
    } else if (unresolved.length === 0 && criticalCount === 0) {
      sentences.push("The incoming team has a clear handover with no outstanding follow-ups.");
    }

    if (completed.length) {
      var completedCounts = {};
      var completedOrder = [];
      completed.forEach(function (entry) {
        var topic = entry.topic === "critical" ? "other" : entry.topic;
        if (!completedCounts[topic]) {
          completedCounts[topic] = 0;
          completedOrder.push(topic);
        }
        completedCounts[topic] += 1;
      });
      if (completed.length === 1) {
        var onlyTopic = completedOrder[0];
        sentences.push(
          capitalize(completedTopicLabel(onlyTopic, 1)).replace(/^One\s+/i, "One ") +
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

    var limit = detail === "brief" ? 2 : (detail === "comprehensive" ? 5 : 4);
    var summary = sentences.slice(0, limit).join(" ");
    return applyPreferences(summary, { prefs: prefs, terminologyMap: options.terminologyMap });
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

    /* Phase 1 fact path — supported cases only; legacy writer otherwise. */
    var fact = extractOperationalFact(rawText, options);
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
      body = buildIronBody();
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
      body = buildDeliveryBody(guestName);
    } else if (section === "tasks") {
      body = buildTaskBody(normalized) || fallbackOperationalBody(normalized, room, options);
    } else if (section === "payments") {
      body = buildPaymentBody(normalized, options) || fallbackOperationalBody(normalized, room, options);
    } else if (section === "maintenance" || section === "urgent") {
      body = buildMaintenanceBody(normalized, section) || fallbackOperationalBody(normalized, room, options);
    } else if (section === "lostproperty" || noteContains(normalized, ["lost property", "left behind", "found in"])) {
      body = appendAction(
        "Lost property has been logged" + (guestName ? " for " + guestName : ""),
        "Please secure the item, update the lost property book, and contact the guest if details are available"
      );
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
    classifyFactStatus: classifyFactStatus,
    isPhase1SupportedFact: isPhase1SupportedFact,
    renderFactPhase1: renderFactPhase1,
    mapFactStatusToItemStatus: mapFactStatusToItemStatus,
    isFactUnresolved: isFactUnresolved,
    isFactClosed: isFactClosed,
    summarizeFromFacts: summarizeFromFacts
  };

  global.AiWritingEngine = Api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Api;
  }
})(typeof window !== "undefined" ? window : globalThis);
