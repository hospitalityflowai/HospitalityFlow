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
    [/\badpater\b/gi, "adapter"],
    [/\badpaters\b/gi, "adapters"],
    [/\badaptor\b/gi, "adapter"],
    [/\badaptors\b/gi, "adapters"]
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

  function hasClearAction(text) {
    var t = String(text || "");
    if (!t) return false;
    if (/\b(?:maintenance|engineering|housekeeping|reception|front office|duty manager|concierge)\s+to\b/i.test(t)) {
      return true;
    }
    if (/\bfollow up\b/i.test(t)) return true;
    /* Imperative / instruction clause — not past-tense status ("has been confirmed") */
    if (/(?:^|[.;:]\s*)(?:please\s+)?(?:confirm|advise|arrange|ensure|update|settle|collect|issue|inspect|chase|contact|review|secure|supply|re-encode|hold|complete|attend|resolve|escalate|brief|deliver|post|record|offer|adjust|do not disturb|action this)\b/i.test(t)) {
      return true;
    }
    return false;
  }

  function isCompletedNote(text, options) {
    if (options && (options.section === "completed" || options.completed === true)) return true;
    var t = String(text || "").toLowerCase();
    if (!/\b(resolved|completed|fixed|done|closed|sorted|handed over|already (?:delivered|provided|collected|completed))\b/.test(t)) {
      return false;
    }
    if (/\b(not |still |un|to be|needs?|pending|outstanding|awaiting)\b/.test(t)) return false;
    return true;
  }

  function appendAction(body, action) {
    var base = tidyPhrase(body).replace(/\.$/, "");
    var next = tidyPhrase(action).replace(/\.$/, "");
    if (!next) return ensureSentence(base);
    if (!base) return ensureSentence(next);
    /* At most one follow-up instruction per rewritten item */
    if (hasClearAction(base)) return ensureSentence(base);
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
        "Advise Housekeeping; do not disturb the guest before the agreed departure time"
      );
    }
    if (isRequestLanguage(normalized)) {
      return appendAction(
        status,
        "Confirm with the Duty Manager whether this can be approved and update the guest"
      );
    }
    return appendAction(
      status,
      "Confirm the departure time with the guest and advise Housekeeping if approved"
    );
  }

  function buildExtendStayBody(normalized) {
    var when = /morning|am\b|speak|call|follow/i.test(normalized)
      ? "in the morning"
      : "as soon as practical";
    return appendAction(
      "The guest has requested to extend their stay",
      "Confirm availability with the guest " + when +
        " and update the reservation if the extension is agreed"
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
      "Update the PMS with the new room allocation" +
        (amount || /\bupgrade\b/i.test(normalized) ? " and post the upgrade charge" : "")
    );
  }

  function buildIronBody() {
    return appendAction(
      "The guest has requested an iron and ironing board",
      "Housekeeping to deliver to the room and confirm with the guest once provided"
    );
  }

  function buildAcBody(normalized) {
    if (detectComplaint(normalized)) {
      return appendAction(
        "The guest has reported an air-conditioning issue and is unhappy with the situation",
        "Maintenance to attend and confirm with the guest once resolved"
      );
    }
    if (noteContains(normalized, ["not cooling", "broken", "not working", "faulty"])) {
      var status = "Air conditioning is not cooling correctly and requires inspection";
      if (noteContains(normalized, ["informed", "eta", "engineer", "not attended"])) {
        status += ". Maintenance has been informed but has not yet completed the attendance";
      }
      return appendAction(
        status,
        "Engineering to inspect and confirm with the guest once resolved"
      );
    }
    return appendAction(
      "An air-conditioning issue has been reported",
      "Maintenance to attend and confirm with the guest once resolved"
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
      "The guest has raised a complaint" + topic,
      "Contact the guest, resolve where possible, and escalate to the Duty Manager if compensation is needed"
    );
  }

  function buildInventoryBody(normalized) {
    if (/\badapter/i.test(normalized)) {
      if (noteContains(normalized, ["outstanding", "still", "issued", "not return", "not returned"])) {
        return appendAction(
          "Loan adapter(s) issued to the guest remain outstanding",
          "Collect the adapter(s) before departure and update the inventory log"
        );
      }
      return appendAction(
        "The guest has requested a loan adapter",
        "Issue the adapter, record it in the inventory log, and confirm delivery with the guest"
      );
    }
    if (detectIronRequest(normalized)) return buildIronBody();
    if (noteContains(normalized, ["pillow"])) {
      return appendAction(
        "Extra pillows have been requested and remain outstanding",
        "Housekeeping to deliver and confirm once provided"
      );
    }
    if (noteContains(normalized, ["towel"])) {
      return appendAction(
        "Additional towels have been requested",
        "Housekeeping to deliver and confirm once provided"
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
      "Review the reservation before arrival and brief Reception and Housekeeping"
    );
  }

  function buildPaymentBody(normalized, options) {
    var amount = extractPrimaryAmount(normalized, options && options.currency);
    var amountBit = amount ? " of " + amount : "";
    if (noteContains(normalized, ["declined"])) {
      return appendAction(
        "The guest's card was declined and an outstanding balance" + amountBit + " remains on the folio",
        "Reception to collect" + (amount ? " " + amount : " the balance") +
          " before departure; offer an alternative payment method if required"
      );
    }
    if (noteContains(normalized, ["outstanding", "balance", "folio"])) {
      return appendAction(
        "Payment remains outstanding" + (amount ? " (" + amount + ")" : "") + " on the guest folio",
        "Reception to collect" + (amount ? " " + amount : " the balance") + " before departure"
      );
    }
    if (noteContains(normalized, ["minibar"])) {
      return appendAction(
        "A minibar charge" + amountBit + " requires review" +
          (noteContains(normalized, ["dispute", "not consumed"]) ? " following a guest dispute" : ""),
        "Review the charge with the guest and adjust the folio if appropriate"
      );
    }
    if (noteContains(normalized, ["ota", "virtual card", "booking.com", "expedia"])) {
      return appendAction(
        "An OTA or channel payment" + amountBit + " still needs to be processed",
        "Complete the payment posting and confirm the folio is clear"
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
        "Maintenance to inspect and update Reception once the room is safe for the guest"
      );
    }
    if (noteContains(normalized, ["tv", "remote"])) {
      return appendAction(
        "The television remote is not working",
        "Supply a replacement remote and confirm with the guest once resolved"
      );
    }
    if (noteContains(normalized, ["heating", "no heat", "cold"])) {
      return appendAction(
        "A heating issue has been reported",
        "Maintenance to attend and confirm with the guest once resolved"
      );
    }
    if (noteContains(normalized, ["lock", "key", "cannot enter", "card not"])) {
      return appendAction(
        "The guest is experiencing a room access or lock issue",
        "Re-encode or replace the key card and escort the guest if required"
      );
    }
    return "";
  }

  function buildDeliveryBody(guestName) {
    return appendAction(
      "A package is being held at Reception" + (guestName ? " for " + guestName : ""),
      "Contact the guest to arrange collection and record when it has been handed over"
    );
  }

  function buildTaskBody(normalized) {
    if (noteContains(normalized, ["dnd"])) {
      return appendAction(
        "The room is on Do Not Disturb",
        "Hold cleaning until the DND is released and check again later in the shift"
      );
    }
    if (noteContains(normalized, ["pillow"])) {
      return appendAction(
        "Extra pillows have been requested and remain outstanding",
        "Housekeeping to deliver and confirm once provided"
      );
    }
    if (noteContains(normalized, ["turndown"])) {
      return appendAction(
        "Turndown service has been requested",
        "Housekeeping to complete turndown at the agreed time"
      );
    }
    return "";
  }

  function buildCompletedBody(normalized, room) {
    var detail = room ? stripRoomLead(normalized, room) : normalized;
    detail = detail
      .replace(/^\[[^\]]+\]\s*/, "")
      .replace(/\bplease\s+follow up\b.*$/i, "")
      .replace(/\s{2,}/g, " ");
    detail = tidyPhrase(detail);
    return detail || "Completed during the shift";
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
      .replace(/\s{2,}/g, " ");
    detail = tidyPhrase(detail);
    if (!detail) return "";

    if (isCompletedNote(normalized, options) || isCompletedNote(detail, options)) {
      return detail;
    }

    if (hasClearAction(detail)) {
      return detail;
    }

    /* One direct operational instruction — never generic "Please follow up during this shift" */
    if (noteContains(normalized, ["pending", "outstanding", "still need", "awaiting"])) {
      return appendAction(detail, "Chase for an update and record the outcome");
    }
    return appendAction(detail, "Incoming team to action and record the outcome");
  }

  function maybeAddFollowUp(body, normalized, options) {
    if (!body) return body;
    if (options && options.addFollowUp === false) return body;
    if (isCompletedNote(normalized, options)) return body;
    if (hasClearAction(body)) return body;

    var needsFollowUp =
      detectExtendStay(normalized) ||
      detectComplaint(normalized) ||
      (detectAcIssue(normalized) && !isConfirmedLanguage(normalized)) ||
      noteContains(normalized, ["speak morning", "call morning", "pending", "outstanding", "still need"]);

    if (!needsFollowUp) return body;
    if (/morning/i.test(normalized)) {
      return appendAction(body, "Confirm with the guest in the morning and update the handover with the outcome");
    }
    return appendAction(body, "Action this shift and record the outcome");
  }

  function rewriteOperationalNote(rawText, options) {
    options = options || {};
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
    var skipFollowUp = false;

    if (section === "completed" || isCompletedNote(normalized, options) || isCompletedNote(original, options)) {
      body = buildCompletedBody(normalized, room);
      skipFollowUp = true;
    } else if (detectLateCheckout(normalized) || detectLateCheckout(original)) {
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
        "Secure the item, update the lost property book, and contact the guest if details are available"
      );
    } else {
      body = buildInventoryBody(normalized) ||
        buildTaskBody(normalized) ||
        buildPaymentBody(normalized, options) ||
        buildMaintenanceBody(normalized, section) ||
        fallbackOperationalBody(normalized, room, options);
    }

    if (!skipFollowUp) {
      body = maybeAddFollowUp(body, normalized, options);
    }
    body = tidyPhrase(body);
    if (!body) {
      body = skipFollowUp
        ? tidyPhrase(buildCompletedBody(normalized, room) || normalized)
        : tidyPhrase(fallbackOperationalBody(normalized, room, options) || normalized);
    }

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

  function rewriteKnowledgeText(rawText, options) {
    options = options || {};
    var original = trimText(rawText);
    if (!original) return "";

    /* Multi-line knowledge: rewrite each non-empty line, preserve structure */
    var lines = original.split(/\n+/);
    if (lines.length > 1) {
      return lines.map(function (line) {
        var t = trimText(line);
        if (!t) return "";
        return rewritePolicyText(t, options);
      }).filter(Boolean).join("\n");
    }

    return rewritePolicyText(original, options);
  }

  /* ------------------------------------------------------------------ */
  /*  General polish (SOP / operations / any module)                    */
  /* ------------------------------------------------------------------ */

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
    var active = analyzed.filter(isActiveAnalyzedNote);
    var prefs = options.prefs || input.prefs || {};
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
    formatTime: formatTime,
    formatMoneyAmount: formatMoneyAmount
  };

  global.AiWritingEngine = Api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Api;
  }
})(typeof window !== "undefined" ? window : globalThis);
