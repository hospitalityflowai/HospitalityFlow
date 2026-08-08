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
 * E1 / E4 responsibility boundary:
 * - Owns extraction support, structured operational-fact field parsing,
 *   wording and presentation prose.
 * - Does NOT own cross-module recommendations, ranking, or conflict reasoning.
 * - Does NOT own final operational category classification (E3+ — Hospitality
 *   Intelligence Engine classifyOperationalFact).
 * - Does NOT calculate OperationalContext (E4 Phase 1 — engine-owned via
 *   buildOperationalContext). May read engine-attached context for display.
 * - Does NOT invent DecisionTrace reason codes, change priority/confidence,
 *   invent nextAction, or infer departments (E4 Phase 2). May format
 *   engine-provided reasonCodes / DecisionTrace into concise language only.
 * - Hospitality Intelligence Engine (shift-intelligence-engine.js) owns
 *   operational reasoning (OperationalContext, DecisionTrace, impact ranking,
 *   recommendations, operational objects, snapshot KPI extraction). This
 *   module formats engine decisions for display only.
 * - Modules must not add a second recommendation system.
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
    var src = String(text || "");
    var re = /(?:£|\$|€)\s*[\d,.]+|\b\d+(?:\.\d{1,2})?\s*(?:pounds?|pound|gbp|usd|euros?|eur)\b|\b\d+\s*(?:per\s+)?(?:extra\s+)?(?:per\s+)?night\b/gi;
    var m;
    while ((m = re.exec(src)) !== null) {
      matches.push(m[0]);
    }
    /* Staff shorthand: bal64.50 / bal 64.50 */
    var balRe = /\bbal(?:ance)?\.?\s*([£$€]?\s*\d+\.\d{2})\b/gi;
    while ((m = balRe.exec(src)) !== null) {
      var balAmt = String(m[1] || "").replace(/\s+/g, "");
      if (!/^[£$€]/.test(balAmt)) balAmt = "£" + balAmt;
      if (matches.indexOf(balAmt) === -1) matches.push(balAmt);
    }
    /* Staff shorthand: minibar 42.50, city tax 12.50, open 42.50, prepaid/OTA context */
    if (/minibar|city\s*tax|bal(?:ance)?|folio|charge|collect|tax|expedia|booking\.com|prepaid|\bpp\b/i.test(src)) {
      var bare = src.match(/\b(\d+\.\d{2})\b/g) || [];
      bare.forEach(function (amount) {
        var withSymbol = "£" + amount;
        if (matches.indexOf(amount) === -1 && matches.indexOf(withSymbol) === -1) {
          matches.push(withSymbol);
        }
      });
    }
    return matches;
  }

  function extractTimes(text) {
    var matches = [];
    var src = String(text || "");
    var re = /\b(?:\d{1,2}[:.]\d{2}\s*(?:am|pm)?|\d{1,2}\s*(?:am|pm)|noon|midnight|midday)\b/gi;
    var m;
    while ((m = re.exec(src)) !== null) {
      matches.push(m[0]);
    }
    /* Sprint 6 narrow: late c/o @12 / @12:00 */
    var atBare = /(?:@\s*|at\s+)(\d{1,2})(?::(\d{2}))?\b/gi;
    while ((m = atBare.exec(src)) !== null) {
      var hh = parseInt(m[1], 10);
      var mm = m[2] != null ? m[2] : "00";
      if (hh >= 0 && hh <= 23) {
        var stamp = hh + ":" + mm;
        if (matches.indexOf(stamp) === -1 && matches.indexOf(m[0]) === -1) matches.push(stamp);
      }
    }
    /* Glued staff times before spacing: ETA2230, arr2230, wake0630 */
    var glued = /\b(?:eta|arr(?:ival)?|due|dep(?:arture)?|wake(?:-?up)?|wu)((?:[01]\d|2[0-3])[0-5]\d)\b/gi;
    while ((m = glued.exec(src)) !== null) {
      var gluedRaw = m[1];
      if (matches.indexOf(gluedRaw) === -1) matches.push(gluedRaw);
    }
    /* Compact staff times: wake 0630, ETA 2230, arr 2230, @1500, Addison Lee 1015 */
    var compact = /(?:@\s*|wake(?:-?up)?\s+|eta\s+|arr(?:ival)?\s+|addison(?:\s+lee)?\s+|taxi\s+|transfer\s+|due\s+|dep(?:arture)?\s+|at\s+|by\s+)?\b((?:[01]\d|2[0-3])[0-5]\d)\b/gi;
    while ((m = compact.exec(src)) !== null) {
      var raw = m[1];
      if (matches.indexOf(raw) === -1 && matches.indexOf(raw.slice(0, 2) + ":" + raw.slice(2)) === -1) {
        matches.push(raw);
      }
    }
    return matches;
  }

  /** Extract ETA / arrival clock time into HH:MM when clearly labelled. */
  function extractEta(text) {
    var src = String(text || "");
    var m = src.match(/\b(?:eta|arr(?:ival)?)\s*((?:[01]\d|2[0-3])[0-5]\d|\d{1,2}[:.]\d{2})\b/i);
    if (!m) m = src.match(/\b(?:eta|arr)((?:[01]\d|2[0-3])[0-5]\d)\b/i);
    return m ? normalizeTimelineTime(m[1]) : null;
  }

  /** Normalise staff times to 24-hour HH:MM. Returns null when unparseable. */
  function normalizeTimelineTime(raw) {
    var s = String(raw == null ? "" : raw).trim().toLowerCase();
    if (!s) return null;
    if (s === "noon" || s === "midday") return "12:00";
    if (s === "midnight") return "00:00";
    var ampm = s.match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)$/i);
    if (ampm) {
      var h = parseInt(ampm[1], 10);
      var min = ampm[2] != null ? parseInt(ampm[2], 10) : 0;
      if (ampm[3].toLowerCase() === "pm" && h < 12) h += 12;
      if (ampm[3].toLowerCase() === "am" && h === 12) h = 0;
      if (h > 23 || min > 59) return null;
      return (h < 10 ? "0" : "") + h + ":" + (min < 10 ? "0" : "") + min;
    }
    var colon = s.match(/^(\d{1,2})[:.](\d{2})$/);
    if (colon) {
      var hc = parseInt(colon[1], 10);
      var mc = parseInt(colon[2], 10);
      if (hc > 23 || mc > 59) return null;
      return (hc < 10 ? "0" : "") + hc + ":" + (mc < 10 ? "0" : "") + mc;
    }
    var compact = s.match(/^(\d{3,4})$/);
    if (compact) {
      var digits = compact[1];
      if (digits.length === 3) digits = "0" + digits;
      var hh = parseInt(digits.slice(0, 2), 10);
      var mm = parseInt(digits.slice(2), 10);
      if (hh > 23 || mm > 59) return null;
      return (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm;
    }
    return null;
  }

  /** Writing-only time pulls from already-extracted source text (no new facts). */
  function extractWakeDisplayTime(src) {
    var text = String(src || "");
    var m = text.match(
      /\bwake(?:[\s-]*up)?(?:\s+call)?(?:\s+for\s+(?:rm\.?|room)\s*\d{1,4}[a-z]?)?(?:\s+at)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)|\d{3,4}|\d{1,2}[:.]\d{2})\b/i
    );
    if (!m) {
      m = text.match(/\bwake(?:[\s-]*up)?[^.]{0,48}?\bat\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)|\d{3,4}|\d{1,2}[:.]\d{2})\b/i);
    }
    return m ? normalizeTimelineTime(m[1]) : null;
  }

  function extractTaxiDisplayTime(src) {
    var text = String(src || "");
    var m = text.match(
      /\b(?:addison(?:\s+lee)?|taxi|transfer)(?:\s+booked)?(?:\s+for)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)|\d{3,4}|\d{1,2}[:.]\d{2})\b/i
    );
    return m ? normalizeTimelineTime(m[1]) : null;
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
      /\broom(\d{1,4}[a-z]?)\b/gi,
      /\brm\.?\s*(\d{1,4}[a-z]?)\b/gi,
      /* Messy shorthand: r24, r.24, r 24 — word-bounded so "for 24" is not matched */
      /\br\.?\s*(\d{1,4}[a-z]?)\b/gi,
      /\bsuite\s*[#.]?\s*(\d{1,4}[a-z]?)\b/gi,
      /\bguest\s+(?:in|at)\s+(\d{1,4}[a-z]?)\b/gi
    ];

    /* Adapter / inventory shorthand: "adapter 15 +16" */
    var adapterList = source.match(/\badapters?\s+((?:\d{1,4}[a-z]?)(?:\s*[+,/&]\s*\d{1,4}[a-z]?)*)/i);
    if (adapterList) {
      String(adapterList[1]).split(/\s*[+,/&]\s*/).forEach(function (part) {
        var am = String(part || "").match(/(\d{1,4}[a-z]?)/i);
        if (am) addRoom(am[1]);
      });
    }

    /* Interconnecting pairs: "interconnect 14+15", "14 + 15 interconnecting" */
    var interconnectPair = source.match(
      /\binterconnect(?:ing)?\s+(\d{1,4}[a-z]?)\s*[+\/&]\s*(\d{1,4}[a-z]?)/i
    ) || source.match(
      /\b(\d{1,4}[a-z]?)\s*[+\/&]\s*(\d{1,4}[a-z]?)\s+interconnect/i
    ) || (
      /\binterconnect/i.test(source)
        ? source.match(/\b(\d{1,4}[a-z]?)\s*\+\s*(\d{1,4}[a-z]?)\b/)
        : null
    );
    if (interconnectPair) {
      addRoom(interconnectPair[1]);
      addRoom(interconnectPair[2]);
    }

    primaryPatterns.forEach(function (pattern) {
      var match;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(source)) !== null) {
        addRoom(match[1]);
      }
    });

    /* Bare leading room number: "11 iron board…" (no global flag — avoids ^/g loops).
       Do not treat leading quantities as rooms: "2 parcels", "3 packages". */
    var bareLead = source.match(/^\s*(\d{1,4}[a-z]?)\b(?=\s+(?!am\b|pm\b))/i);
    if (
      bareLead &&
      !/^\s*\d{1,4}[a-z]?\s+(?:parcels?|packages?|umbrellas?|adapters?|keys?|items?|guests?|arrivals?|deps?|departures?|boxes?)\b/i.test(source)
    ) {
      addRoom(bareLead[1]);
    }

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
    /* "outstanding 175" / "outstanding £175" without currency symbol */
    m = source.match(/\boutstanding\s+(?:balance\s+)?(?:of\s+)?([£$€]?\s*\d+(?:[.,]\d{1,2})?)\b/i);
    if (m) return formatMoneyAmount(m[1], currency || "£");
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
    /* Night Manager shorthand — operational meaning, not cosmetic rewrite */
    [/\bb\.?\s*com\b/gi, "Booking.com"],
    [/\bbooking\.com\b/gi, "Booking.com"],
    [/\bexpedia\b/gi, "Expedia"],
    /* OTA shorthand — avoid expired/express/expect */
    [/\bexp\b(?!\.|ired|iry|ress|ect|and|ose|lain)/gi, "Expedia"],
    [/\bota\b(?=\s|$|[.,!?])/gi, "OTA"],
    [/\bpp\b(?=\s|$|[.,!?])/gi, "prepaid"],
    [/\bwc\b(?=\s|$|[.,!?])/gi, "WC"],
    [/\bbday\b/gi, "birthday"],
    [/\banniv(?:ersary)?\b/gi, "anniversary"],
    [/\bb4\b/gi, "before"],
    [/\bmaint\b(?=\s+(?:aware|informed|notified|advised)\b)/gi, "Maintenance"],
    [/\bmaint\b(?=\s|$|[.,!?])/gi, "maintenance"],
    [/\bdeps\b(?=\s|$|[.,!?:])/gi, "departures"],
    [/\bdep\b(?=\s+(?:am|pm|tomorrow|tmrw|morning|afternoon|tonight)\b)/gi, "departure"],
    [/\bdep\b(?=\s*[:\-]?\s*\d{1,3}(?![:.\d]))/gi, "departures"],
    [/\barrs\b(?=\s|$|[.,!?:])/gi, "arrivals"],
    [/\barr\b(?=\s+(?:am|pm|tonight|tomorrow|tmrw|~|\d))/gi, "arrival"],
    [/\barr\b(?=\s*[:\-]?\s*\d{1,3}(?![:.\d]))/gi, "arrivals"],
    [/\binhouse\b/gi, "in-house"],
    [/\bocc\b(?=\s|$|[.,!?:%\d])/gi, "occupancy"],
    [/\bstay\b(?=\s*[:\-]?\s*\d)/gi, "stayovers"],
    [/\b(?:rooms?\s+)?sold\b(?=\s*[:\-]?\s*\d)/gi, "rooms sold"],
    [/\b(?:rooms?\s+)?avail(?:able)?\b(?=\s*[:\-]?\s*\d)/gi, "rooms available"],
    [/\bno[\s-]?show\b/gi, "no-show"],
    [/\blost\s*prop(?:erty)?\b/gi, "lost property"],
    [/\bfb\b(?=\s|$|[.,!?])/gi, "F&B"],
    [/\bcorp(?:orate)?\s+rate\b/gi, "corporate rate"],
    [/\bcorp\b(?=\s|$|[.,!?])/gi, "corporate"],
    [/\b(\d+(?:\.\d{1,2})?)\s*pounds?\b/gi, "£$1"],
    [/\bpounds?\b/gi, "£"]
  ];

  /**
   * Split / expand glued Night Manager shorthand before abbreviation maps.
   * Examples: ETA2230, arr2230, bal64.50, r24 → spaced/normalised forms.
   */
  function expandMessyShorthand(text) {
    var result = String(text || "");
    /* Glued clock prefixes */
    result = result.replace(
      /\b(eta|arr(?:ival)?|due|dep(?:arture)?|wake(?:-?up)?|wu)((?:[01]\d|2[0-3])[0-5]\d)\b/gi,
      "$1 $2"
    );
    /* Balance shorthand: bal64.50 / bal.64.50 */
    result = result.replace(/\bbal(?:ance)?\.?\s*(\d+\.\d{2})\b/gi, "balance £$1");
    /* Bare r24 / r.24 → rm 24 (extractRoomNumbers also matches r directly) */
    result = result.replace(/\br\.?\s*(\d{1,4}[a-z]?)\b/gi, "rm $1");
    return result;
  }

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

  /** Resolve staff shorthand into complete operational meaning for detection/writing. */
  function expandOperationalShorthand(text) {
    var result = String(text || "");
    result = result
      .replace(/\bMaintenance\s+aware\b/gi, "Maintenance has been informed")
      .replace(/\bmaintenance\s+aware\b/gi, "Maintenance has been informed")
      .replace(/\bfan\s+guest\b/gi, "fan provided to guest")
      .replace(/\bguest\s+(?:has\s+)?fan\b/gi, "guest provided with a fan")
      .replace(/\bfollow\s*(?:up\s*)?am\b/gi, "follow up next shift")
      .replace(/\bfollow\s+next\b/gi, "follow up next shift")
      .replace(/\bhk\s+aware\b/gi, "Housekeeping has been informed")
      .replace(/\bhousekeeping\s+aware\b/gi, "Housekeeping has been informed")
      .replace(/\bquiet\s+upper\b/gi, "quiet upper-floor room")
      .replace(/\bdm\s+safe\b/gi, "Duty Manager safe")
      .replace(/\bDuty Manager\s+safe\b/gi, "Duty Manager safe");
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
    result = expandMessyShorthand(result);
    result = correctSpelling(result);
    result = expandAbbreviations(result);
    result = expandOperationalShorthand(result);
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
    if (!until) {
      var bareTime = String(normalized || "").match(
        /\b(\d{1,2}[:.]\d{2}|\d{1,2}\s*(?:am|pm))\b/i
      );
      if (bareTime) until = normalizeTimelineTime(bareTime[1]) || formatTime(bareTime[1], prefs);
    }
    var untilBit = until ? " for " + until : "";
    /* Phase 3A: status from language only — never invent HK/DM/guest chase actions.
       Do not treat a bare time as confirmation. */
    if (isConfirmedLanguage(normalized)) {
      return "Late check-out confirmed" + untilBit;
    }
    if (isRequestLanguage(normalized)) {
      return "Late check-out requested" + untilBit;
    }
    return "Late check-out noted" + untilBit;
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
    var destBit = dest ? " to Room " + dest : "";
    var status;
    var completedMove = /\b(?:relocated|has been moved|was moved|moved to)\b/i.test(normalized) ||
      (/\bmoved\b/i.test(normalized) && isConfirmedLanguage(normalized));

    /* Phase 3A: never claim relocation or invent PMS posting unless source supports it. */
    if (isRequestLanguage(normalized) && !completedMove) {
      status = dest
        ? "Guest requested a room move" + destBit + " if available"
        : "Guest requested a room move if available";
    } else if (completedMove || isConfirmedLanguage(normalized)) {
      status = "Guest relocated" + (destBit || " to another room");
    } else {
      status = "Room move" + (destBit || "") + " noted";
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
    /* Night Manager voice: fault + guest impact + status + next step — no invented chase scripts. */
    var status;
    if (detectComplaint(normalized)) {
      if (noteContains(normalized, ["not cooling", "broken", "not working", "faulty"])) {
        status = "AC not cooling. Guest unhappy";
      } else {
        status = "AC issue reported. Guest unhappy";
      }
    } else if (noteContains(normalized, ["not cooling", "broken", "not working", "faulty"])) {
      status = "AC not cooling";
    } else {
      status = "AC issue reported";
    }
    if (noteContains(normalized, ["fan", "portable fan", "fan provided"])) {
      status += ". Guest provided with a fan";
    }
    var maintAware = noteContains(normalized, ["maintenance", "engineer"]) &&
      noteContains(normalized, ["informed", "notified", "advised", "aware"]);
    if (maintAware) {
      status += ". Maintenance has been informed";
    }
    if (
      maintAware ||
      noteContains(normalized, ["not attended", "not yet", "awaiting", "eta", "follow am", "follow up am", "follow next", "follow up next"])
    ) {
      status += ". Follow up next shift until resolved";
    }
    return status;
  }

  function buildComplaintBody(normalized) {
    /* Phase 3A/3B: state the complaint only — do not invent contact/escalate/compensation. */
    if (detectAcIssue(normalized)) {
      return buildAcBody(normalized);
    }
    var closed =
      noteContains(normalized, ["quiet afterwards", "noise settled", "resolved", "apologised and quiet", "apologized and quiet"]) ||
      (/\bquiet\b/i.test(normalized) && noteContains(normalized, ["apologised", "apologized", "afterwards"]));
    if (closed && noteContains(normalized, ["noise", "corridor"])) {
      return "Corridor noise complaint closed after staff intervention. No further action required";
    }
    if (closed && noteContains(normalized, ["noise"])) {
      return "Noise complaint closed. Guest satisfied. No further action required";
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
      var adapterRooms = extractRoomNumbers(normalized);
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
      if (adapterRooms.length) {
        return "Adapters recorded for " +
          (adapterRooms.length === 1 ? "Room " + adapterRooms[0] : "Rooms " + joinNatural(adapterRooms));
      }
      return "Adapter recorded";
    }
    if (noteContains(normalized, ["paper towel", "paper towels"])) {
      return "Paper towels need restocking";
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
    /* Concise operational VIP lead — name, arrival, room, occasion, prep actions. */
    var rooms = extractRoomNumbers(original || normalized);
    var hasArrival = noteContains(normalized, ["arriv"]);
    if (!guestName && !rooms.length && !hasArrival &&
        !noteContains(normalized, ["champagne", "flowers", "amenity", "quiet", "anniversary", "welcome card", "chocolate"])) {
      return "";
    }

    var parts = [];
    if (guestName) {
      parts.push(
        guestName + " — " +
        (/\breturning\b/i.test(normalized) ? "Returning VIP arrival" : "VIP arrival")
      );
    } else {
      parts.push(hasArrival ? "VIP arrival" : "VIP preparation required");
    }

    if (noteContains(normalized, ["anniversary"])) parts.push("Anniversary stay");

    var timeMatch = (original || "").match(/\b(\d{1,2}[:.]\d{2}|\d{1,2}\s*(?:am|pm))\b/i) ||
      normalized.match(/\b(\d{1,2}[:.]\d{2}|\d{1,2}\s*(?:am|pm))\b/i);
    var timeBit = timeMatch ? (normalizeTimelineTime(timeMatch[1]) || formatTime(timeMatch[1], prefs)) : "";

    var amenityBits = [];
    if (noteContains(normalized, ["champagne"])) amenityBits.push("champagne");
    if (noteContains(normalized, ["welcome card"])) amenityBits.push("welcome card");
    if (noteContains(normalized, ["chocolate"])) amenityBits.push("chocolates");
    if (noteContains(normalized, ["flowers"])) amenityBits.push("flowers");
    if (noteContains(normalized, ["water"])) amenityBits.push("extra water");
    if (noteContains(normalized, ["quiet upper"])) amenityBits.push("quiet upper-floor allocation");
    else if (noteContains(normalized, ["quiet"])) amenityBits.push("a quiet room");
    /* Anniversary already stated as occasion — do not repeat as amenity. */

    if (rooms.length === 1 && amenityBits.length) {
      parts.push(
        "Prepare Room " + rooms[0] + " with " + joinNatural(amenityBits) +
        (timeBit ? " before the " + timeBit + " arrival" : " before arrival")
      );
    } else if (rooms.length === 1) {
      parts.push(
        "Prepare Room " + rooms[0] +
        (timeBit ? " before the " + timeBit + " arrival" : " before arrival")
      );
    } else if (amenityBits.length) {
      parts.push(
        "Prepare " + joinNatural(amenityBits) +
        (timeBit ? " before the " + timeBit + " arrival" : " before arrival")
      );
    } else if (hasArrival) {
      parts.push(timeBit ? "Confirm room readiness before the " + timeBit + " arrival" : "Confirm room readiness before arrival");
    }

    return parts.join(". ");
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
    if (noteContains(normalized, ["ota", "virtual card", "booking.com", "expedia", "city tax"])) {
      var channel = noteContains(normalized, ["expedia"]) ? "Expedia"
        : (noteContains(normalized, ["booking.com"]) ? "Booking.com" : "OTA");
      var guestBits = extractPlainGuestNames(normalized);
      var guestBit = guestBits.length ? " for " + guestBits[0] : "";
      if (noteContains(normalized, ["virtual card"])) {
        var vcc = channel + " virtual-card payment" + amountBit + guestBit;
        if (noteContains(normalized, ["pending", "awaiting", "auth"])) {
          return vcc + " is still pending authorisation";
        }
        return vcc + " still needs to be collected";
      }
      var taxBit = noteContains(normalized, ["city tax"]) ? " city tax" : " payment";
      return "An outstanding " + channel + taxBit + amountBit + guestBit + " still needs to be collected";
    }
    return "";
  }

  function buildMaintenanceBody(normalized, section) {
    if (detectAcIssue(normalized)) return buildAcBody(normalized);
    /* Night Manager: fault + who reported + status + next — no invented chase scripts. */
    if (noteContains(normalized, ["leak", "leaking", "shower", "bathroom", "drip", "dripping", "mixer"])) {
      var leakStatus;
      if (noteContains(normalized, ["shower"]) && noteContains(normalized, ["drip", "dripping", "mixer"])) {
        leakStatus = "Shower mixer dripping";
      } else if (noteContains(normalized, ["shower"]) && noteContains(normalized, ["leak", "leaking"])) {
        leakStatus = "Shower leak open";
      } else if (noteContains(normalized, ["bathroom"]) && noteContains(normalized, ["leak", "leaking"])) {
        leakStatus = "Bathroom leak open";
      } else if (noteContains(normalized, ["leak", "leaking", "drip", "dripping"])) {
        leakStatus = "Leak open";
      } else {
        leakStatus = "Shower issue open";
      }
      if (noteContains(normalized, ["hk", "housekeeping"]) &&
          noteContains(normalized, ["reported", "noticed", "found"])) {
        leakStatus += ". HK reported";
      }
      if (noteContains(normalized, ["medium", "normal"])) {
        leakStatus += ". Medium priority";
      } else if (noteContains(normalized, ["urgent", "asap", "high"])) {
        leakStatus += ". High priority";
      }
      if (noteContains(normalized, ["previous shift", "still", "carried"])) {
        leakStatus += ". From previous shift";
      }
      if (noteContains(normalized, ["maintenance", "engineer"]) &&
          noteContains(normalized, ["informed", "notified", "advised", "aware"])) {
        leakStatus += ". Maintenance has been informed";
      } else if (section === "urgent" || noteContains(normalized, ["urgent", "asap", "high"])) {
        leakStatus += ". Needs Maintenance attendance";
      }
      return leakStatus;
    }
    if (noteContains(normalized, ["tv", "remote"])) {
      return "TV remote not working. Guest needs a replacement";
    }
    if (noteContains(normalized, ["heating", "no heat", "too warm", "controls not responding", "cold"])) {
      var heatParts = [];
      if (noteContains(normalized, ["controls not responding", "not responding"])) {
        heatParts.push("Heating controls not responding");
      } else if (noteContains(normalized, ["too warm", "too hot"])) {
        heatParts.push("Heating too warm");
      } else if (noteContains(normalized, ["no heat", "no heating", "cold"])) {
        heatParts.push("No heating / room cold");
      } else {
        heatParts.push("Heating issue reported");
      }
      if (noteContains(normalized, ["too warm", "too hot"]) &&
          heatParts[0].indexOf("too warm") === -1 &&
          noteContains(normalized, ["controls not responding", "not responding"])) {
        heatParts[0] = "Heating too warm and controls not responding";
      }
      if (noteContains(normalized, ["guest", "complain", "comfort", "cold", "warm", "hot"])) {
        heatParts.push("Guest comfort affected");
      }
      if (noteContains(normalized, ["fan provided", "fan given", "fan left", "fan guest"])) {
        heatParts.push("Fan provided");
      }
      if (noteContains(normalized, ["maintenance", "maint", "engineer"]) &&
          noteContains(normalized, ["informed", "notified", "advised", "aware"])) {
        heatParts.push("Maintenance informed");
      }
      if (noteContains(normalized, ["follow up", "follow-up", "still need", "unresolved", "still"])) {
        heatParts.push("Follow up required");
      }
      return heatParts.join(". ");
    }
    if (noteContains(normalized, ["lock", "key", "cannot enter", "card not"])) {
      return "Room access or lock issue. Guest cannot enter reliably";
    }
    return "";
  }

  function buildDeliveryBody(normalized, guestName) {
    /* Preserve quantity and stated storage location — never invent Reception. */
    var src = String(normalized || "");
    var wordCount = src.match(/\b(two|three|four|five|six|seven|eight|nine|ten)\s+(?:parcels?|packages?|boxes?)\b/i);
    var countMatch = src.match(/\b(\d+)\s+(?:parcels?|packages?|boxes?)\b/i);
    var noun = /\bparcels?\b/i.test(src) ? "parcel" : "package";
    var countLabel = "";
    if (wordCount) {
      countLabel = capitalize(wordCount[1].toLowerCase());
      if (!/^one$/i.test(wordCount[1])) noun = noun === "parcel" ? "parcels" : "packages";
    } else if (countMatch) {
      var n = parseInt(countMatch[1], 10);
      countLabel = n === 1 ? "One" : String(countMatch[1]);
      if (n > 1) noun = noun === "parcel" ? "parcels" : "packages";
    }
    var storage = "";
    if (/\bback\s+office\b/i.test(src)) storage = "the back office";
    else if (/\breception\b/i.test(src)) storage = "Reception";
    else if (/\bconcierge\b/i.test(src)) storage = "Concierge";

    var status;
    if (countLabel) {
      status = countLabel + " " + noun +
        (/\breceived\b/i.test(src) ? " received" : " held");
    } else {
      status = (noun === "parcels" || noun === "packages" ? capitalize(noun) : capitalize(noun)) +
        (/\breceived\b/i.test(src) ? " received" : " being held");
    }
    if (guestName) status += " for " + guestName;
    if (/\b(?:tomorrow|tmrw|tomorrows)\b/i.test(src) && /\barriv(?:al|als|ing)\b/i.test(src)) {
      status += " for tomorrow's arrivals";
    } else if (/\b(?:tomorrow|tmrw)\b/i.test(src)) {
      status += " for tomorrow";
    }
    if (storage) {
      status += ". Stored in " + storage;
    } else if (/\bstored\b/i.test(src)) {
      status += ". Stored for collection";
    }
    if (noteContains(src, ["contact", "call", "notify", "advise", "phone"])) {
      status += ". Guest contact noted";
    }
    if (noteContains(src, ["handed over", "collected", "collection recorded", "signed for"])) {
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

  function polishOperationalShorthand(detail) {
    var text = String(detail || "");
    if (/^(?:pm|am)\s*(?:→|->|to)\s*(?:night|am|pm).*(?:busy|pls|please)\s*read/i.test(text) ||
        /busy\s+(?:pls|please)\s+read/i.test(text)) {
      return "PM shift reported unusually high operational workload. Review remaining operational notes before continuing the shift";
    }
    text = text
      .replace(/\bno\s+mobile\s+on\s+file\b/gi, "Guest has no mobile number recorded")
      .replace(/\bhold\s+till\s+night\s+confirms?\b/gi, "Keep reservation on hold until Night Team confirms")
      .replace(/\btwin\s+pls\b/gi, "Guest requested a twin room if available")
      .replace(/\btwin\s+please\b/gi, "Guest requested a twin room if available")
      .replace(/\btwin\s+pref(?:erence)?\b/gi, "Guest requested a twin room if available")
      .replace(/\b(?:rm|room)\s*(\d{1,4}[a-z]?)\s+if\s+free\b/gi, "Allocate Room $1 if available")
      .replace(/\bif\s+free\b/gi, "if available")
      .replace(/\bpls\b/gi, "")
      .replace(/\bplease\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    return text;
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
    detail = polishOperationalShorthand(detail);
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
      uncertainty: false,
      needsReview: false,
      extractionConfidence: "",
      /* Operational classification helpers */
      guestImpact: "",
      priority: "",
      faultType: "",
      requestItem: ""
    };
  }

  function extractRequestItem(text) {
    var src = String(text || "");
    if (/\bextra\s+bed\b|\brollaway\b/i.test(src)) return "extra bed";
    /* Source fidelity: never upgrade "foam pillows" / bare pillows into "extra pillows". */
    if (/\bfoam\s+pillows?\b/i.test(src)) return "foam pillows";
    if (/\bextra\s+pillows?\b/i.test(src)) return "extra pillows";
    if (/\bpillows?\b/i.test(src)) {
      var pillowPhrase = src.match(/\b([A-Za-z]+(?:\s+[A-Za-z]+)?\s+pillows?)\b/);
      if (pillowPhrase && pillowPhrase[1]) return String(pillowPhrase[1]).toLowerCase();
      return "pillows";
    }
    if (/\biron(?:ing)?\s+board\b|\biron\b/i.test(src)) return "iron and ironing board";
    if (/\badapters?\b/i.test(src)) return "travel adapter";
    if (/\btowels?\b/i.test(src)) return "towels";
    if (/\bchampagne\b/i.test(src)) return "champagne amenity";
    if (/\bamenit(?:y|ies)\b/i.test(src)) return "welcome amenities";
    return "";
  }

  function extractFaultType(text) {
    var src = String(text || "");
    if (/\bair\s*con(?:ditioning)?\b|\ba\/c\b|\bac\b|\bnot\s+cooling\b|\bhvac\b/i.test(src)) return "AC";
    if (/\bhot\s*water\b|\bno\s+hot\s+water\b|\bcold\s+water\s+only\b/i.test(src)) return "hot water";
    if (/\b(?:wc|toilet|loo)\b/i.test(src) &&
        /\b(?:broken|fault|blocked|not\s+working|issue|maint|leak|overflow)/i.test(src)) {
      return "WC";
    }
    if (/\bwc\b/i.test(src) && !/\bduty\s+manager\s+safe|lost\s+prop/i.test(src)) return "WC";
    if (/\bshower\b|\bleak(?:ing)?\b|\bdrip(?:ping)?\b|\bmixer\b|\bbathroom\b/i.test(src)) return "shower/leak";
    if (/\btv\b|\bremote\b/i.test(src)) return "TV remote";
    if (/\bsafe\b|\bkeypad\b/i.test(src)) return "safe";
    if (/\bheating\b|\bno\s+heat\b/i.test(src)) return "heating";
    if (/\bhand\s*dryer\b/i.test(src)) return "hand dryer";
    if (/\bdryer\b/i.test(src) && !/\bpaper\s+towel/i.test(src)) return "hand dryer";
    if (/\block\b|\bkey\s*card\b|\bcannot\s+enter\b/i.test(src)) return "room access";
    return "";
  }

  function classifyGuestImpact(text, subject) {
    var src = String(text || "");
    if (/\bflood|fire|evacuat|unsafe|injury|critical\b/i.test(src)) return "critical";
    if (/\bnot\s+cooling\b|\bac\s+broken\b|\bhot\s*water\b|\bno\s+hot\s+water\b|\bleak(?:ing)?\b|\bunhappy\b|\bcomplaint\b|\bdeclined\b|\boutstanding\s+balance\b|\bvip\b/i.test(src)) {
      return "high";
    }
    if (subject === "maintenance" && /\bguest\b|\bfan\b|\broom\s+\d/i.test(src)) return "high";
    if (subject === "vip_arrival" || subject === "outstanding_balance" || subject === "payment") return "high";
    if (subject === "guest_request" || subject === "delivery" || subject === "late_checkout" || subject === "room_move") {
      return "medium";
    }
    if (/\bplant\s+room\b|\bback\s+of\s+house\b|\broutine\b/i.test(src)) return "low";
    if (subject === "maintenance") return "medium";
    return "low";
  }

  function classifyFactPriority(text, subject, guestImpact) {
    if (guestImpact === "critical" || /\burgent|asap|critical\b/i.test(text)) return "urgent";
    if (guestImpact === "high" || subject === "vip_arrival" || subject === "outstanding_balance") return "high";
    if (subject === "guest_request" || subject === "delivery" || subject === "wake_up") return "normal";
    if (guestImpact === "low") return "low";
    return "normal";
  }

  function detailValueFromFact(fact, type) {
    var found = "";
    (fact && fact.details || []).forEach(function (detail) {
      if (detail && detail.type === type && detail.value != null && detail.value !== "") {
        found = String(detail.value);
      }
    });
    return found;
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
    /* Exclude pure operational departures / moves / reminders / adapters from Finance. */
    if (/\badapters?\b/.test(lower)) return false;
    if (/\b(?:room\s+move|wake[\s-]?up|taxi|transfer|reminder)\b/.test(lower) &&
        !/[£$€]\s*\d/.test(src) &&
        !/\b(?:balance|payment|folio|invoice|refund|deposit|tax|minibar|charge)\b/.test(lower)) {
      return false;
    }
    return /\boutstanding\s+(?:balance|amount|payment)\b/.test(lower) ||
      /\bbalance\s+outstanding\b/.test(lower) ||
      /\bbal(?:ance)?\s*[£$€]?\s*\d/.test(lower) ||
      /\boutstanding\s*[£$€]?\s*\d/.test(lower) ||
      (/[£$€]\s*\d/.test(src) && /\b(?:balance|outstanding|unpaid|payment\s+link|collect|prepaid)\b/.test(lower)) ||
      /\bunpaid\b/.test(lower) ||
      /\bnot\s+(?:yet\s+)?paid\b/.test(lower) ||
      /\bstill\s+to\s+pay\b/.test(lower) ||
      /\bstill\s+open\b/.test(lower) && /\b(?:minibar|balance|folio|tax|payment)\b/.test(lower) ||
      /\bcity\s*tax\b/.test(lower) ||
      /\bpayment\s+links?\b/.test(lower) ||
      /\bminibar\b/.test(lower) && /\b(?:open|collect|still|outstanding|charge)\b/.test(lower) ||
      (/\b(?:booking\.com|expedia|ota|virtual\s+card)\b/.test(lower) &&
        /\b(?:tax|payment|collect|outstanding|open|balance|pending|auth|authoris|authoriz|vcc|prepaid)\b/.test(lower)) ||
      /\bvirtual\s+card\b/.test(lower) && /\b(?:pending|awaiting|auth|authoris|authoriz)\b/.test(lower) ||
      /\bpayment\s+(?:failed|failure|declined|collection|collect)\b/.test(lower) ||
      /\bcard\s+declined\b/.test(lower) ||
      /\bdeclined\b/.test(lower) && /\b(?:card|payment|pdq|pos)\b/.test(lower) ||
      /\brefund\b/.test(lower) ||
      /\bdeposit\b/.test(lower) && /\b(?:take|collect|hold|release|due|required)\b/.test(lower) ||
      /\bauthoris(?:e|ation)|authoriz(?:e|ation)|pre-?auth\b/.test(lower) ||
      /\bsettlement\s+required\b/.test(lower) ||
      /\bsettle\b/.test(lower) && /\b(?:balance|folio|bill|invoice)\b/.test(lower) ||
      (/\binvoice\b/.test(lower) && /\b(?:unpaid|outstanding|overdue|open|send|issue)\b/.test(lower)) ||
      (/\bbill\b/.test(lower) && /\b(?:unpaid|outstanding|overdue)\b/.test(lower)) ||
      (/\bfolio\b/.test(lower) && /\b(?:balance|outstanding|unpaid|declined)\b/.test(lower)) ||
      (/\bcharge\b/.test(lower) && /\b(?:dispute|incorrect|extra|minibar)\b/.test(lower) && !/\badapter/.test(lower));
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
    if (/\bcity\s*tax\b/i.test(src) || /\b(?:booking\.com|expedia)\b/i.test(src)) return "payment";
    if (/\bminibar\b/i.test(src)) return "charge";
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
      /\bnot\s+(?:yet\s+)?paid\b/.test(lower) ||
      /\bstill\s+outstanding\b/.test(lower) ||
      /* Outstanding is open unless the same note explicitly settles/pays it. */
      (/\boutstanding\s+(?:balance|amount|payment)\b/.test(lower) && !/\bsettled\b/.test(lower) && !/\b(?:has\s+been\s+)?paid\b/.test(lower)) ||
      (/\bbalance\s+outstanding\b/.test(lower) && !/\bsettled\b/.test(lower) && !/\b(?:has\s+been\s+)?paid\b/.test(lower)) ||
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
      (/\b(?:has\s+been\s+)?paid\b/.test(lower) && !/\bnot\s+(?:yet\s+)?paid\b/.test(lower)) ||
      /\bcleared\b/.test(lower) ||
      /\bcompleted\b/.test(lower) ||
      /\bresolved\b/.test(lower) ||
      /* "Fixed charges added" is payment-posting language — not whole-note completion. */
      (/\bfixed\b/.test(lower) && !/\bfixed\s+charges?\b/.test(lower)) ||
      /\bcollected\b/.test(lower) ||
      /\bdelivered\b/.test(lower) ||
      /\bdone\b/.test(lower) ||
      /\bquiet\s+afterwards\b/.test(lower) ||
      /\b(?:apologised|apologized)\s+and\s+quiet\b/.test(lower) ||
      /\bnoise\s+settled\b/.test(lower)
    ) {
      return FACT_STATUS.done;
    }

    if (
      /\bnot\s+booked\b/.test(lower) ||
      /\bnot\s+yet\s+booked\b/.test(lower)
    ) {
      return FACT_STATUS.open;
    }

    /*
     * Confirmed arrangements beat bare "requested" when both appear
     * ("requested late c/o 12:30 confirmed").
     */
    if (
      (/\b(?:approved|confirmed|agreed|granted|authorised|authorized)\b/.test(lower) &&
        !/\bnot\s+(?:yet\s+)?(?:approved|confirmed|agreed|granted|authorised|authorized)\b/.test(lower)) ||
      /\balready\s+booked\b/.test(lower) ||
      /\bbooked\b/.test(lower)
    ) {
      return FACT_STATUS.confirmed;
    }

    if (
      /\b(?:request(?:ed)?|asking|asked|would like|wants?|needs?|maybe|possibly)\b/.test(lower)
    ) {
      return FACT_STATUS.requested;
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
    /* Messy lowercase staff leads: "okonkwo rm22", "okonkwo r24", "vip eleanor whitmore due"
       Require digits after r/rm so surnames like "Ringer" are never treated as room tags. */
    var lead = src.match(
      /(?:^|\bvip\s+)([a-zà-öø-ÿ'’-]+(?:\s+[a-zà-öø-ÿ'’-]+)?)\s+(?:(?:rm\.?|r\.?)\s*\d{1,4}|room(?:\s*\d|\b)|due\b|late\b|x\d|dep\b|eta\b|arr\b|no\s*show)/i
    );
    if (lead) {
      var messy = lead[1].replace(/\s+/g, " ").trim();
      /* "Guest in rm 41" is a room lead, not a guest named "Guest In". */
      if (messy && !/^(room|vip|late|no|guest)\b/i.test(messy) && !/^guest\s+/i.test(messy)) {
        messy = messy.replace(/\b([a-z])/g, function (ch) { return ch.toUpperCase(); });
        if (names.indexOf(messy) === -1) names.unshift(messy);
      }
    }
    /* Title + surname: "mr khan", "Mrs Taylor" */
    var titled = src.match(/\b(mr|mrs|ms|miss)\.?\s+([a-zà-öø-ÿ'’-]+)\b/i);
    if (titled) {
      var title = titled[1].charAt(0).toUpperCase() + titled[1].slice(1).toLowerCase();
      var surname = titled[2].charAt(0).toUpperCase() + titled[2].slice(1).toLowerCase();
      var titledName = title + " " + surname;
      if (names.indexOf(titledName) === -1) names.unshift(titledName);
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

  /** Continuations that belong with the previous guest/room lead (no new room subject). */
  function isOperationalContinuationSegment(segment, previousSegment) {
    if (isOperaContinuationSegment(segment)) return true;
    var s = String(segment || "").replace(/^[\s/–—-]+/, "").trim();
    if (!s) return true;

    /* Standalone supply notes are not maintenance mitigations unless clearly placed/provided. */
    if (/^paper\s+towels?\s+(?:out|needed|low|restock)/i.test(s)) return false;
    if (/^paper\s+towels?\s+(?:placed|provided|given|left)\b/i.test(s)) return true;

    var prev = String(previousSegment || "");
    var prevRooms = extractRoomNumbers(prev);
    var segRooms = extractRoomNumbers(s);
    var sameRoom = segRooms.some(function (r) { return prevRooms.indexOf(r) !== -1; });
    var introducesDifferentRoom = segRooms.length > 0 && prevRooms.length > 0 && !sameRoom;
    var newGuestLead = looksLikeGuestReservationLead(s) ||
      /^(?:mr|mrs|ms|miss|dr)\.?\s+[A-ZÀ-ÖØ-Þ]/i.test(s) ||
      (/^[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'’-]+\s+[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'’-]+/.test(s) &&
        /\b(?:rm\.?|room)\s*\d+/i.test(s));

    /*
     * A new room number is a new fact subject — never attach wake/taxi/minibar
     * for Room B onto Room A's late checkout / complaint / payment.
     */
    if (introducesDifferentRoom) return false;

    /*
     * Never glue a new guest/reservation lead onto a prior UPDATE / payment-terminal
     * line (prevents "VCC charged" + "Mr + Mrs Shah rm32" mega-segments that block
     * payment supersession via multi-guest fail-closed clusters).
     */
    if (newGuestLead && segRooms.length &&
        (/^update\b/i.test(prev) ||
          /\b(?:paid|account\s+clear|successfully\s+charged|payment\s+sorted|fully\s+paid|received\s+in\s+full)\b/i.test(prev))) {
      return false;
    }
    if (newGuestLead && segRooms.length && prevRooms.length && !sameRoom) return false;
    /* Refunds / deposit-held notes are separate folios from paid/received terminals. */
    if (/\b(?:refund|deposit\s+held|security\s+deposit)\b/i.test(s) &&
        /\b(?:paid|received\s+in\s+full|account\s+clear|payment\s+sorted|fully\s+paid|successfully\s+charged)\b/i.test(prev)) {
      return false;
    }
    if (/\b(?:refund|deposit\s+held|security\s+deposit)\b/i.test(prev) &&
        /\b(?:paid|received\s+in\s+full|account\s+clear|fully\s+paid)\b/i.test(s)) {
      return false;
    }

    var maintFaultCue = /\b(?:ac\b|air\s*con|leak|shower|dryer|safe|broken|fault|dead|drip|hand\s*dryer|keypad|heat(?:ing)?|hot\s*water|not\s+working)\b/i;
    if (/^(?:maint(?:enance)?\s+aware|maintenance\s+has\s+been\s+informed)\b/i.test(s)) {
      return !!prev && maintFaultCue.test(prev);
    }

    if (prev) {
      if (sameRoom && /\b(?:on\s+hold|parts|awaiting|guest\s+moved|relocated|moved\s+to)\b/i.test(s)) {
        return true;
      }
      /* Guest-impact clause belongs with the prior maintenance fault. */
      if (/^guest\s+(?:cold|hot|unhappy|impacted|affected|comfort)\b/i.test(s) && maintFaultCue.test(prev)) {
        return true;
      }
      /* VIP amenity / setup fragments stay with the VIP lead. */
      if (/\b(?:anniversary|welcome\s+card|chocolates?|champagne|amenity|quiet\s+upper)\b/i.test(s) &&
          /\bvip\b/i.test(prev)) {
        return true;
      }
      /* Payment guest-name / auth fragments stay with the payment lead — not new arrivals. */
      if (
        (/\b(?:expedia|booking\.com|virtual\s+card|outstanding|payment|collect|folio|balance)\b/i.test(prev) ||
          /\boutstanding\s*[£$€]?\s*\d/i.test(prev)) &&
        !newGuestLead &&
        !segRooms.length &&
        (/^(?:mr|mrs|ms|miss)\b/i.test(s) ||
          /\b(?:awaiting|pending|auth|authoris|authoriz|still\s+needed)\b/i.test(s))
      ) {
        return true;
      }
      /* Attach trailing maint-aware to the nearest prior maintenance segment when sandwiched. */
      if (/^(?:maint(?:enance)?\s+aware|maintenance\s+has\s+been\s+informed)\b/i.test(s)) {
        return maintFaultCue.test(prev);
      }
    }

    if (/\b(?:room|rm\.?|suite)\s*[#.]?\s*\d/i.test(s) &&
        !/^(?:wake|minibar|collect|addison|twin|champagne|welcome)/i.test(s)) {
      return false;
    }
    if (/^\d{1,4}[a-z]?\b/.test(s) && !/\b(?:on\s+hold|parts|awaiting)\b/i.test(s)) return false;
    if (/^[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'’-]+(?:\s+[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'’-]+)+\b/.test(s) &&
        /\b(?:arriv|dep|vip|balance|leak|ac\b)/i.test(s)) {
      return false;
    }
    /*
     * Wake/minibar/etc. continue only when they belong to the same room lead or a
     * guest-reservation lead without a conflicting room. Standalone "Wake-up for rm N"
     * after a different room's sentence is a new operational object.
     */
    if (/^(?:wake(?:[\s-]*up)?|minibar|transfer|addison|collect|champagne|welcome\s+card|chocolates?|anniversary|twin|corp(?:orate)?\s+rate|15\s*%|mobile|prepaid|fan\s+guest|guest\s+has\s+fan|guest\s+(?:cold|hot|moved)|follow\s*(?:up\s*)?(?:am|next)|quiet\s+upper|on\s+hold|bday|birthday|balloons|still\s+unresolved|still\s+awaiting|awaiting\s+auth)/i.test(s)) {
      if (segRooms.length && prevRooms.length && !sameRoom) return false;
      if (segRooms.length && !prevRooms.length && !looksLikeGuestReservationLead(prev)) return false;
      return true;
    }
    return false;
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
   * True when the text after a sentence boundary starts a new operational lead
   * (another room/guest/channel/request). Prevents dense night-manager paragraphs
   * from collapsing into one multi-room fact.
   */
  function startsNewOperationalLead(text) {
    var s = String(text || "").replace(/^[\s"']+/, "");
    if (!s) return false;
    if (/^(?:room|rm\.?|suite)\s*[#.]?\s*\d{1,4}[a-z]?\b/i.test(s)) return true;
    if (/^wake(?:[\s-]*up)?\b/i.test(s)) return true;
    if (/^vip\b/i.test(s)) return true;
    if (/^guest\s+in\s+(?:room|rm\.?)\s*\d/i.test(s)) return true;
    if (/^(?:expedia|booking\.com|b\.com)\b/i.test(s)) return true;
    if (/^baby\s*cot\b/i.test(s)) return true;
    if (/^(?:\d+|two|three|four|five)\s+(?:parcels?|packages?)\b/i.test(s)) return true;
    if (/^please\s+follow\s+up\b/i.test(s)) return true;
    if (/^(?:mr|mrs|ms|miss)\.?\s+[A-ZÀ-ÖØ-Þ]/i.test(s)) return true;
    if (/^[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'’-]+\s+[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'’-]+\b/.test(s) &&
        /\b(?:arriv|dep|vip|balance|room|rm\.?)\b/i.test(s)) {
      return true;
    }
    return false;
  }

  function splitDenseOperationalSentences(piece) {
    var text = String(piece || "").trim();
    if (!text || text.length < 40) return [text];
    if (!/\.\s+\S/.test(text)) return [text];

    var parts = [];
    var cursor = 0;
    var match;
    var re = /\.\s+/g;
    while ((match = re.exec(text)) !== null) {
      var next = text.slice(match.index + match[0].length);
      if (!startsNewOperationalLead(next)) continue;
      var chunk = trimText(text.slice(cursor, match.index + 1));
      if (chunk) parts.push(chunk);
      cursor = match.index + match[0].length;
    }
    var tail = trimText(text.slice(cursor));
    if (tail) parts.push(tail);
    return parts.length ? parts : [text];
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
      /* Split on em/en dashes between distinct operational clauses */
      if (/\s+[—–]\s+/.test(piece)) {
        piece.split(/\s+[—–]\s+/).forEach(function (part) {
          var p = trimText(part);
          if (p) rough.push(p);
        });
        return;
      }
      /*
       * Split dense paragraphs on ". " when the next sentence introduces a new
       * room / VIP / wake-up / OTA / parcel lead (includes Rm/Room shorthand).
       */
      var sentenceParts = splitDenseOperationalSentences(piece);
      if (sentenceParts.length > 1) {
        sentenceParts.forEach(function (part) {
          if (part) rough.push(part);
        });
        return;
      }
      /* Legacy: ". Room N" / guest-name leads */
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
      var prev = grouped[grouped.length - 1];
      var segTrim = String(segment || "").replace(/^[\s/–—-]+/, "").trim();
      /* Attach orphan maint-aware (and unresolved follow-ups) to the nearest prior fault. */
      if (/^(?:maint(?:enance)?\s+aware|maintenance\s+has\s+been\s+informed)(?:\s*[-–—,]?\s*(?:still\s+)?(?:unresolved|follow(?:\s*up)?(?:\s*am)?)?)?\.?$/i.test(segTrim)) {
        for (var gi = grouped.length - 1; gi >= 0; gi--) {
          if (/\b(?:ac\b|air\s*con|leak|shower|dryer|safe|broken|fault|dead|drip|hand\s*dryer|keypad|heat(?:ing)?|hot\s*water|not\s+working)\b/i.test(grouped[gi])) {
            grouped[gi] = grouped[gi] + " // " + segment;
            return;
          }
        }
      }
      if (isOperationalContinuationSegment(segment, prev)) {
        grouped[grouped.length - 1] = prev + " // " + segment;
        return;
      }
      if (looksLikeGuestReservationLead(prev) && isOperationalContinuationSegment(segment, prev)) {
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
    if (/\bcorporate\b/i.test(sourceText) || /\bcorp\b/i.test(sourceText)) {
      fact.guestType = fact.guestType || "corporate";
      if (!detailValueFromFact(fact, "booking_type")) {
        fact.details.push({ type: "booking_type", value: "corporate" });
      }
    }
    if (/\bprepaid\b/i.test(sourceText)) {
      fact.paymentMethod = fact.paymentMethod || "prepaid";
      if (!detailValueFromFact(fact, "payment_method")) {
        fact.details.push({ type: "payment_method", value: "prepaid" });
      }
    }

    /* Channel / OTA — structured only when explicitly present */
    if (/\bBooking\.com\b/i.test(sourceText) || /\bb\.?\s*com\b/i.test(sourceText)) {
      if (!detailValueFromFact(fact, "channel")) {
        fact.details.push({ type: "channel", value: "Booking.com" });
      }
    } else if (/\bExpedia\b/i.test(sourceText)) {
      if (!detailValueFromFact(fact, "channel")) {
        fact.details.push({ type: "channel", value: "Expedia" });
      }
    } else if (/\bOTA\b/.test(sourceText)) {
      if (!detailValueFromFact(fact, "channel")) {
        fact.details.push({ type: "channel", value: "OTA" });
      }
    }

    /* Celebrations — never invent; only tag when cue is present */
    var celebrationMatch = sourceText.match(
      /\b(birthday|anniversary|honeymoon|celebration|balloons?|champagne)\b/i
    );
    if (celebrationMatch) {
      var celeb = celebrationMatch[1].toLowerCase();
      if (celeb === "balloons" || celeb === "balloon") celeb = "balloons";
      if (celeb === "champagne") celeb = "champagne amenity";
      if (!detailValueFromFact(fact, "celebration")) {
        fact.details.push({ type: "celebration", value: celeb });
      }
      if (!fact.subject || fact.subject === "follow_up" || fact.subject === "interconnect") {
        if (/\b(?:birthday|anniversary|honeymoon|celebration)\b/i.test(sourceText)) {
          fact.subject = "celebration";
          fact.ownerDept = fact.ownerDept || "Reception";
          if (!fact.actionVerb) fact.actionVerb = "prepare";
        }
      }
    }

    /* Preferences — quiet / accessible / dietary when explicit */
    if (/\bquiet(?:\s+(?:room|upper|floor))?\b/i.test(sourceText) ||
        /\bupper-floor room\b/i.test(sourceText)) {
      if (!detailValueFromFact(fact, "preference")) {
        fact.details.push({
          type: "preference",
          value: /\bupper/i.test(sourceText) ? "quiet upper-floor room" : "quiet room"
        });
      }
    }
    if (/\baccessib(?:le|ility)\b|\bwheelchair\b/i.test(sourceText)) {
      if (!detailValueFromFact(fact, "preference")) {
        fact.details.push({ type: "preference", value: "accessible room" });
      }
    }
    if (/\bfeather[\s-]*free\b|\bnon[\s-]*feather\b|\ballerg/i.test(sourceText)) {
      if (!detailValueFromFact(fact, "preference")) {
        fact.details.push({ type: "preference", value: "feather-free bedding" });
      }
    }

    /* Arrival / departure status cues */
    if (/\b(?:arrival|arriving|due\s+in|eta)\b/i.test(sourceText) &&
        !/\b(?:depart|check-?out|c\/o)\b/i.test(sourceText)) {
      if (!detailValueFromFact(fact, "stay_status")) {
        fact.details.push({ type: "stay_status", value: "arrival" });
      }
    } else if (/\b(?:departure|departing|check-?out|c\/o|dep\b)\b/i.test(sourceText) &&
               !/\b(?:arrival|eta|due\s+in)\b/i.test(sourceText)) {
      if (!detailValueFromFact(fact, "stay_status")) {
        fact.details.push({ type: "stay_status", value: "departure" });
      }
    }

    var etaValue = extractEta(sourceText);
    if (etaValue && !detailValueFromFact(fact, "eta")) {
      fact.details.push({ type: "eta", value: etaValue });
    }

    /* Twin / king bed configuration */
    if (
      (/\bking\b/i.test(sourceText) && /\btwin\b/i.test(sourceText)) ||
      /\btwin\s+beds?\b/i.test(sourceText) ||
      /\btwin\s+(?:pls|please|pref(?:erence)?|requested?|request)\b/i.test(sourceText)
    ) {
      fact.subject = "twin_setup";
      fact.actionVerb = fact.actionVerb || "configure";
      fact.ownerDept = fact.ownerDept || "Housekeeping";
      fact.category = "guest-follow-up";
      if (fact.status === FACT_STATUS.unknown || fact.status === FACT_STATUS.confirmed) {
        /* "to be set" / explicit request is an open action */
        if (
          /\bto\s+be\s+set\b/i.test(sourceText) ||
          /\bset\s+as\s+twin\b/i.test(sourceText) ||
          /\btwin\s+(?:beds?\s+)?(?:pls|please|pref|requested?|request)\b/i.test(sourceText) ||
          /\btwin\s+beds?\s+requested\b/i.test(sourceText)
        ) {
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
    var src = String(fact.sourceText || "").trim();
    if (/^(?:maint(?:enance)?\s+aware|maintenance\s+has\s+been\s+informed|maintenance informed)\.?$/i.test(src)) {
      return false;
    }
    /*
     * Closing wrap-ups that only restate already-split follow-ups ("Please follow up
     * heating, collect both payments and check VIP setup") are not distinct facts.
     */
    if (
      /^please\s+follow\s+up\b/i.test(src) &&
      !(fact.rooms && fact.rooms.length) &&
      !fact.guestName &&
      /\b(?:heating|payment|vip|collect|check)\b/i.test(src)
    ) {
      return false;
    }
    if ((fact.rooms && fact.rooms.length) || fact.guestName || fact.arrivalDate) return true;
    if (fact.preferredLocation || fact.paymentMethod || fact.package || fact.guarantee) return true;
    if (fact.actionVerb && fact.actionVerb !== "prepare") return true;
    if (fact.subject && !/^(vip_arrival|follow_up)$/.test(fact.subject) && fact.sourceText &&
        fact.sourceText.length > 20) {
      return true;
    }
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
    var src = String(fact.sourceText || "");
    /*
     * One actionable object → one primary room lead. Multi-room leads only when
     * the note truly spans related rooms (interconnect / adapter inventory).
     * Prevents "Rooms 23, 16, 32…" generic departure collapses.
     */
    if (fact.rooms && fact.rooms.length === 1) {
      lead = "Room " + fact.rooms[0];
    } else if (fact.rooms && fact.rooms.length > 1) {
      var multiRoomOk = fact.subject === "interconnect" || fact.subject === "inventory" ||
        /\binterconnect/i.test(src) || /\badapters?\s+\d/i.test(src);
      lead = multiRoomOk
        ? ("Rooms " + joinNatural(fact.rooms))
        : ("Room " + fact.rooms[0]);
    }

    if (fact.subject === "room_move") {
      /* Paid upgrades / destination-room moves keep legacy/Phase1 wording */
      var hasMoney = false;
      (fact.details || []).forEach(function (d) {
        if (d && d.type === "money") hasMoney = true;
      });
      if (hasMoney || /\bupgrade\b/i.test(src)) return "";

      var moveBody;
      if (fact.uncertainty || /maybe|possible/i.test(fact.confirmationStatus || "")) {
        moveBody = "Guest may request a room move if available";
      } else {
        moveBody = "Guest requested a room move if available";
      }
      if (fact.preferredLocation) moveBody += " to the " + fact.preferredLocation;
      else {
        var dest = "";
        (fact.details || []).forEach(function (d) {
          if (d && d.type === "destination_room") dest = d.value;
        });
        if (dest) moveBody += " to Room " + dest;
      }
      return finishFactRender(lead, moveBody);
    }

    if (fact.subject === "departure_followup" || fact.subject === "wake_up") {
      var wakeT = extractWakeDisplayTime(src);
      var taxiT = extractTaxiDisplayTime(src);
      var depBits = [];
      if (/\bdep(?:arture|artures)?\b|\bcheck[\s-]?out\b/i.test(src)) {
        depBits.push("Guest departing this morning");
      }
      if (wakeT) depBits.push("Wake-up call at " + wakeT);
      else if (/\bwake/i.test(src)) depBits.push("Wake-up call booked");
      if (taxiT) {
        depBits.push((/addison/i.test(src) ? "Addison Lee booked for " : "Taxi booked for ") + taxiT);
      } else if (/\b(?:taxi|transfer|addison)\b/i.test(src) && !wakeT && !/\bwake/i.test(src)) {
        depBits.push(/addison/i.test(src) ? "Addison Lee booked" : "Taxi booked");
      }
      if (!depBits.length) return "";
      return finishFactRender(lead, depBits.join(". "));
    }

    if (fact.subject === "guest_request" &&
        (/baby\s*cot|cot\b/i.test(fact.requestItem || "") || /baby\s*cot|\bcot\b/i.test(src))) {
      var cotTime = normalizeTimelineTime(
        (src.match(/\b(?:before|by|at)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)|\d{3,4}|\d{1,2}[:.]\d{2})\b/i) ||
          src.match(/\b(\d{1,2}\s*(?:am|pm))\b/i) || [])[1]
      );
      var cotBody = "Prepare baby cot" +
        (lead ? " in " + lead : "") +
        (cotTime ? " before the " + cotTime + " arrival" : " before arrival");
      return ensureSentence(cotBody);
    }

    if (fact.subject === "interconnect") {
      var group = fact.guestName || "Group";
      var icLines = [group + " group arriving tomorrow"];
      if (fact.rooms && fact.rooms.length >= 2) {
        icLines.push("Reserve interconnecting Rooms " + fact.rooms[0] + " & " + fact.rooms[1]);
      } else if (lead) {
        icLines.push("Reserve interconnecting " + lead);
      }
      var balloonRaw = (src.match(/@\s*(\d{3,4}|\d{1,2}[:.]\d{2})/i) ||
        src.match(/\b(?:at|@)\s*(\d{3,4}|\d{1,2}[:.]\d{2})\b/i) || [])[1];
      var balloonT = normalizeTimelineTime(balloonRaw);
      var balloonRoomMatch = src.match(/\bballoons?\s+(\d{1,4}[a-z]?)\b/i) ||
        src.match(/\b(?:bday|birthday)\s+balloons?\s+(\d{1,4}[a-z]?)\b/i);
      var balloonRoom = balloonRoomMatch
        ? balloonRoomMatch[1]
        : ((fact.rooms && fact.rooms[1]) ? fact.rooms[1] : (fact.rooms && fact.rooms[0]));
      if (/balloon|birthday|bday/i.test(src) && balloonRoom) {
        icLines.push(
          "Birthday balloons requested in Room " + balloonRoom +
          (balloonT ? " at " + balloonT : "")
        );
      }
      if (/\bf\s*&\s*b\b|\bfb\b|food\s+and\s+beverage/i.test(src) &&
          /\binformed|notified|advised|aware/i.test(src)) {
        icLines.push("F&B has been informed");
      }
      return icLines.map(ensureSentence).join("\n");
    }

    if (fact.subject === "no_show") {
      var noShowLines = [];
      var noShowGuest = fact.guestName ||
        ((src.match(/\bno[\s-]?show\s+([A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'’-]+)/i) || [])[1] || "");
      noShowLines.push(
        "Confirm" + (noShowGuest ? " " + noShowGuest : "") +
        (lead ? " " + lead : "") + " no-show before releasing the room"
      );
      if (/hold\s+till\s+night|night\s+confirms?/i.test(src)) {
        noShowLines.push("Keep reservation on hold until Night Team confirms");
      }
      if (/\bno\s+mobile\s+on\s+file/i.test(src)) {
        noShowLines.push("Guest has no mobile number recorded");
      }
      return noShowLines.map(ensureSentence).join("\n");
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
    /* Keep raw sourceText; classify/enrich from expanded Night Manager meaning. */
    var detectText = normalizeInput(sourceText) || sourceText;
    var fact = createEmptyOperationalFact(sourceText);

    fact.rooms = extractRoomNumbers(sourceText).slice();
    if (!fact.rooms.length) fact.rooms = extractRoomNumbers(detectText).slice();
    if (options.rooms && options.rooms.length) {
      options.rooms.forEach(function (room) {
        var key = String(room).toUpperCase();
        if (fact.rooms.indexOf(key) === -1 && fact.rooms.indexOf(String(room)) === -1) {
          fact.rooms.push(String(room));
        }
      });
    }

    fact.status = classifyFactStatus(detectText);
    fact.sectionHint = options.section ? String(options.section) : "";
    fact.sourceTexts = sourceText ? [sourceText] : [];
    fact.sourceHistory = sourceText
      ? [{ status: fact.status, sourceText: sourceText, section: fact.sectionHint || "" }]
      : [];

    var followMatch = detectText.match(/\bfollow[\s-]*up\s+with\s+([A-Za-z][A-Za-z\s]*?)(?=\s+on\b|\s+regarding\b|\s+about\b|[.,;]|$)/i);
    if (followMatch) {
      fact.actionVerb = "follow_up";
      fact.actionTarget = trimText(followMatch[1]).toLowerCase().replace(/\s+/g, " ");
      fact.ownerDept = departmentFromTarget(fact.actionTarget.split(/\s+/)[0]);
      fact.subject = "follow_up";
    }

    if (isActualFinancialIssue(detectText) &&
        (/\bsettled\b/i.test(detectText) || /\boutstanding\s+(?:balance|amount)?\s*[£$€]?\s*\d/i.test(detectText) ||
          /\boutstanding\s+(?:balance|amount)\b/i.test(detectText) ||
          /\b(?:balance|folio|payment|invoice|bill|declined|refund|deposit|charge|booking\.com|expedia|city\s+tax|virtual\s+card|pending|auth)\b/i.test(detectText))) {
      var noun = financialSettlementNoun(detectText);
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

    if (/\blate\s+check-?out\b/i.test(detectText) || /\blate\s+c\/?o\b/i.test(sourceText)) {
      fact.subject = "late_checkout";
      if (!fact.ownerDept) fact.ownerDept = "Housekeeping";
      if (!fact.actionVerb && fact.status === FACT_STATUS.requested) fact.actionVerb = "confirm";
    }

    if (/\bwake(?:[\s-]*up)?\b/i.test(detectText) || /\bwakeup\b/i.test(detectText) ||
        /\bwake\s*\d{3,4}\b/i.test(sourceText)) {
      fact.subject = "wake_up";
      if (!fact.ownerDept) fact.ownerDept = "Reception";
      if (!fact.actionVerb && fact.status !== FACT_STATUS.confirmed && fact.status !== FACT_STATUS.done) {
        fact.actionVerb = "confirm";
      }
    }

    if ((/\b(?:dep(?:arture|artures)?|check[\s-]?out)\b/i.test(detectText) || /\bdep\b/i.test(sourceText)) &&
        (/\bwake\b/i.test(detectText) || /\baddison\b/i.test(detectText) || /\btaxi\b/i.test(detectText) ||
          /\btransfer\b/i.test(detectText) || /\bminibar\b/i.test(detectText))) {
      fact.subject = "departure_followup";
      if (!fact.ownerDept) fact.ownerDept = "Reception";
      if (!fact.actionVerb) fact.actionVerb = "follow_up";
    }

    if (/\bno[\s-]?show\b/i.test(detectText)) {
      fact.subject = "no_show";
      if (!fact.ownerDept) fact.ownerDept = "Reception";
      if (!fact.actionVerb) fact.actionVerb = "confirm";
    }

    if (/\binterconnect/i.test(detectText) ||
        (/\b(?:birthday|bday|balloons)\b/i.test(detectText) &&
          /\b(?:tmrw|tomorrow|interconnect)\b/i.test(detectText + " " + sourceText))) {
      fact.subject = "interconnect";
      if (!fact.ownerDept) fact.ownerDept = "Reception";
      if (!fact.actionVerb) fact.actionVerb = "prepare";
    }

    /*
     * VIP subject requires a concrete VIP guest/room lead — not a wrap-up like
     * "check VIP setup" that mentions VIP among unrelated follow-ups.
     * Bare options.isVip is insufficient without guest/room evidence.
     */
    var vipLead =
      /\bvip\s+(?:mr|mrs|ms|miss|guest|arrival|rm\.?|room)\b/i.test(detectText) ||
      (/\bvip\b/i.test(detectText) && (fact.guestName || (fact.rooms && fact.rooms.length))) ||
      (options.isVip && (fact.guestName || (fact.rooms && fact.rooms.length)));
    if (vipLead) {
      if (!fact.subject || fact.subject === "follow_up" || fact.subject === "wake_up") {
        fact.subject = "vip_arrival";
      }
      if (!fact.ownerDept) fact.ownerDept = "Reception";
      if (!fact.actionVerb && fact.status !== FACT_STATUS.done && fact.status !== FACT_STATUS.confirmed) {
        fact.actionVerb = "prepare";
      }
    }

    if (/\b(?:air\s*con|a\/c|\bac\b|wc\b|toilet|leak|leaking|broken|faulty|repair|maintenance|not cooling|heating|hot\s*water|no\s+hot\s+water|hand\s*dryer|safe\s+keypad|\bon\s+hold\s+parts)\b/i.test(detectText) &&
        !fact.subject) {
      fact.subject = "maintenance";
      if (!fact.ownerDept) fact.ownerDept = "Maintenance";
      if (!fact.actionVerb) fact.actionVerb = "follow_up";
    }

    /* Taxi / transfer booking — structured detail; subject only when nothing stronger */
    if (/\b(?:taxi|addison(?:\s+lee)?|transfer)\b/i.test(detectText)) {
      if (!fact.subject || fact.subject === "follow_up") {
        fact.subject = "departure_followup";
        if (!fact.ownerDept) fact.ownerDept = "Reception";
        if (!fact.actionVerb) fact.actionVerb = "confirm";
      }
      if (!detailValueFromFact(fact, "transport")) {
        var transport = /\baddison/i.test(detectText)
          ? "Addison Lee"
          : /\btransfer\b/i.test(detectText) ? "transfer" : "taxi";
        fact.details.push({ type: "transport", value: transport });
      }
    }

    /* Orphan status fragments are not standalone maintenance items. */
    if (/^(?:maint(?:enance)?\s+aware|maintenance\s+has\s+been\s+informed)\.?$/i.test(trimText(sourceText)) &&
        !fact.rooms.length) {
      fact.subject = "";
      fact.actionVerb = "";
    }

    /* Adapters are inventory / loan follow-ups — never Finance (room digits ≠ charge). */
    if (/\badapters?\b/i.test(detectText) &&
        (!fact.subject || fact.subject === "follow_up" || fact.subject === "guest_request" ||
          fact.subject === "inventory" || fact.subject === "payment" || fact.subject === "charge")) {
      fact.subject = "inventory";
      if (!fact.ownerDept) fact.ownerDept = "Reception";
      if (!fact.actionVerb) {
        fact.actionVerb = /[£$€]\s*\d/.test(detectText) ? "collect" : "follow_up";
      }
    }

    if (/\bfeather[\s-]*free\b|\bnon[\s-]*feather\b|\ballerg/i.test(detectText) &&
        (!fact.subject || fact.subject === "follow_up")) {
      fact.subject = "guest_request";
      fact.requestItem = fact.requestItem || "feather-free bedding";
      if (!fact.ownerDept) fact.ownerDept = "Housekeeping";
      if (!fact.actionVerb) fact.actionVerb = "confirm";
    }

    if (/\bbaby\s*cot\b|\bcot\s+required\b/i.test(detectText) &&
        (!fact.subject || fact.subject === "follow_up" || fact.subject === "guest_request")) {
      fact.subject = "guest_request";
      fact.requestItem = fact.requestItem || "baby cot";
      if (!fact.ownerDept) fact.ownerDept = "Housekeeping";
      if (!fact.actionVerb) fact.actionVerb = "arrange";
      if (fact.status === FACT_STATUS.unknown) fact.status = FACT_STATUS.requested;
    }

    if (/\bumbrella/i.test(detectText) &&
        /\b(?:not\s+returned|outstanding|loan|still\s+out)\b/i.test(detectText) &&
        (!fact.subject || fact.subject === "follow_up" || fact.subject === "guest_request")) {
      fact.subject = "inventory";
      fact.requestItem = fact.requestItem || "umbrella";
      if (!fact.ownerDept) fact.ownerDept = "Reception";
      if (!fact.actionVerb) fact.actionVerb = "follow_up";
    }

    if (/\bpaper\s+towels?\b/i.test(detectText) && !/\b(?:hand\s*)?dryer\b/i.test(detectText) &&
        (!fact.subject || fact.subject === "follow_up")) {
      fact.subject = "supply";
      if (!fact.ownerDept) fact.ownerDept = "Housekeeping";
      if (!fact.actionVerb) fact.actionVerb = "restock";
    }

    if (/\b(?:extra\s+bed|rollaway|pillows?|towels?|iron|amenity)\b/i.test(detectText) &&
        !/\badapter\b/i.test(detectText) &&
        (!fact.subject || fact.subject === "follow_up")) {
      if (!/\bvip\b/i.test(detectText)) fact.subject = "guest_request";
      if (!fact.ownerDept) {
        fact.ownerDept = /\b(?:pillows?|towels?|bed|linen)\b/i.test(detectText) ? "Housekeeping" : "Reception";
      }
      if (!fact.actionVerb && fact.status === FACT_STATUS.requested) fact.actionVerb = "arrange";
    }

    var requestItem = extractRequestItem(detectText) || extractRequestItem(sourceText);
    if (requestItem) {
      fact.requestItem = requestItem;
      if (!detailValueFromFact(fact, "request_item")) {
        fact.details.push({ type: "request_item", value: requestItem });
      }
      if (!fact.subject || fact.subject === "follow_up") {
        if (!/\bvip\b/i.test(detectText)) fact.subject = "guest_request";
      }
      if (fact.subject === "guest_request" && !fact.ownerDept) {
        fact.ownerDept = /\b(?:pillows?|towels?|bed|linen)\b/i.test(detectText) ? "Housekeeping" : "Reception";
      }
    }

    var faultType = extractFaultType(detectText) || extractFaultType(sourceText);
    if (faultType && (fact.subject === "maintenance" || !fact.subject ||
        /\b(?:air\s*con|a\/c|\bac\b|leak|broken|faulty|repair|not cooling|heating|hot\s*water|safe|dryer)\b/i.test(detectText))) {
      fact.faultType = faultType;
      if (!fact.subject) {
        fact.subject = "maintenance";
        if (!fact.ownerDept) fact.ownerDept = "Maintenance";
        if (!fact.actionVerb) fact.actionVerb = "follow_up";
      }
      if (!detailValueFromFact(fact, "fault_type")) {
        fact.details.push({ type: "fault_type", value: faultType });
      }
    }

    if (/\b(?:packages?|parcels?|delivery|courier)\b/i.test(detectText) && !fact.subject) {
      fact.subject = "delivery";
      if (!fact.ownerDept) fact.ownerDept = "Reception";
      if (!fact.actionVerb) fact.actionVerb = "hold";
    }

    if (/\blost\s+prop(?:erty)?\b/i.test(detectText) || /\blost\s+prop\b/i.test(sourceText)) {
      fact.subject = "lost_property";
      if (!fact.ownerDept) fact.ownerDept = "Reception";
      if (!fact.actionVerb) fact.actionVerb = "follow_up";
      /* "dm safe" / "Duty Manager safe" is storage location, not a safe fault */
      if (fact.faultType === "safe" && !/\bsafe\s+keypad\b|\bsafe\s+(?:broken|fault)/i.test(detectText)) {
        fact.faultType = "";
      }
      if (/\b(?:Duty Manager safe|dm\s+safe)\b/i.test(detectText + " " + sourceText) &&
          !detailValueFromFact(fact, "storage")) {
        fact.details.push({ type: "storage", value: "Duty Manager safe" });
      }
    }

    if (/\b(?:mov(?:e|ing|ed)|relocat(?:e|ed|ing))\b/i.test(detectText) &&
        fact.subject !== "maintenance" &&
        !/\b(?:on\s+hold|parts|safe\s+keypad|leak|ac\b|hand\s*dryer)\b/i.test(detectText)) {
      fact.subject = "room_move";
      var dest = extractDestinationRoom(detectText, fact.rooms) || extractDestinationRoom(sourceText, fact.rooms);
      if (dest) {
        fact.details.push({ type: "destination_room", value: dest });
      }
      if (!fact.ownerDept) fact.ownerDept = "Reception";
    } else if (fact.subject === "maintenance" &&
               /\b(?:guest\s+moved|relocated|moved\s+to)\b/i.test(detectText)) {
      var maintDest = extractDestinationRoom(detectText, fact.rooms) ||
        (detectText.match(/\b(?:moved|relocated)\s+(?:to\s+)?(?:room\s+|rm\.?\s*)?(\d{1,4}[a-z]?)\b/i) || [])[1];
      if (maintDest && !detailValueFromFact(fact, "destination_room")) {
        fact.details.push({ type: "destination_room", value: String(maintDest) });
      }
    }

    if (options.section === "maintenance" && !fact.ownerDept) fact.ownerDept = "Maintenance";
    if (options.section === "payments" && !fact.ownerDept) fact.ownerDept = "Reception";
    if (options.section === "vip" && !fact.ownerDept) fact.ownerDept = "Reception";

    var staffMatch = detectText.match(/\b(?:assigned\s+to|owner[:\s]+|handed\s+to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
    if (staffMatch) {
      fact.ownerName = trimText(staffMatch[1]);
    }

    extractMoney(detectText).concat(extractMoney(sourceText)).forEach(function (amount) {
      var moneyKey = String(amount);
      var moneyExists = (fact.details || []).some(function (d) {
        return d && d.type === "money" && String(d.value) === moneyKey;
      });
      if (!moneyExists) fact.details.push({ type: "money", value: amount });
    });
    extractTimes(detectText).concat(extractTimes(sourceText)).forEach(function (time) {
      var timeExists = (fact.details || []).some(function (d) {
        return d && d.type === "time" && String(d.value) === String(time);
      });
      if (!timeExists) fact.details.push({ type: "time", value: time });
    });

    enrichOperationalFactFields(fact, options);
    if (!fact.requestItem) fact.requestItem = detailValueFromFact(fact, "request_item") || extractRequestItem(detectText);
    if (fact.subject !== "lost_property") {
      if (!fact.faultType) fact.faultType = detailValueFromFact(fact, "fault_type") || extractFaultType(detectText);
    } else if (fact.faultType === "safe") {
      fact.faultType = "";
    }
    fact.guestImpact = classifyGuestImpact(detectText, fact.subject);
    fact.priority = classifyFactPriority(detectText, fact.subject, fact.guestImpact);
    assessExtractionConfidence(fact);
    return fact;
  }

  /**
   * Score extraction evidence. Low confidence → needsReview.
   * Never invent missing rooms/guests — only flag for human review.
   */
  function assessExtractionConfidence(fact) {
    if (!fact) return fact;
    var score = 0.15;
    var guestFacing = /^(vip_arrival|wake_up|late_checkout|room_move|outstanding_balance|payment|guest_request|lost_property|celebration|departure_followup|invoice|bill|folio)$/.test(fact.subject || "");

    if (fact.rooms && fact.rooms.length) score += 0.35;
    if (fact.guestName) score += 0.25;
    if (fact.subject) score += 0.15;
    if (fact.details && fact.details.length) score += Math.min(0.2, fact.details.length * 0.05);
    if (fact.faultType || fact.requestItem) score += 0.05;
    if (detailValueFromFact(fact, "eta") || detailValueFromFact(fact, "time")) score += 0.05;

    if (fact.uncertainty) score -= 0.2;
    if (fact.subject === "financial_settlement_unclear") score -= 0.25;
    if (guestFacing && !(fact.rooms && fact.rooms.length) && !fact.guestName) {
      score = Math.min(score, 0.4);
      fact.needsReview = true;
    }
    if (fact.subject === "room_move" && !detailValueFromFact(fact, "destination_room") && fact.uncertainty) {
      fact.needsReview = true;
      score = Math.min(score, 0.45);
    }

    var label = score >= 0.75 ? "high" : score >= 0.45 ? "medium" : "low";
    fact.extractionConfidence = label;
    if (label === "low" || fact.uncertainty) fact.needsReview = true;
    if (!fact.needsReview) fact.needsReview = false;
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
      if (detectExtendStay(text)) return "extension";
      if (fact && fact.ownerDept === "Housekeeping") return "task";
      return "guest";
    }
    if (subject === "wake_up" || subject === "departure_followup" || subject === "transfer") {
      return "guest";
    }
    if (subject === "interconnect" || subject === "guest_preparation") return "guest";
    if (subject === "lost_property") return "lostProperty";
    if (subject === "supply") return "task";
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

    function impactRank(entry) {
      /* E4: prefer engine OperationalContext scoring. Local fallback runs only
         when ShiftIntelligenceEngine is not loaded (unit isolation / unload). */
      if (global.ShiftIntelligenceEngine &&
          typeof global.ShiftIntelligenceEngine.scoreOperationalImpact === "function") {
        return global.ShiftIntelligenceEngine.scoreOperationalImpact(entry).score;
      }
      var fact = entry.fact || {};
      var impact = String(fact.guestImpact || "").toLowerCase();
      var priority = String(fact.priority || "").toLowerCase();
      var topic = entry.topic || "";
      var score = 50;
      if (topic === "critical" || impact === "critical" || priority === "urgent") score = 0;
      else if (topic === "maintenance" || impact === "high") score = 10;
      else if (topic === "payment") score = 15;
      else if (topic === "vip") score = 20;
      else if (topic === "guest" || topic === "complaint") score = 25;
      else if (topic === "lateCheckout" || topic === "roomMove") score = 30;
      else if (priority === "high") score = 18;
      if (fact.subject === "outstanding_balance" || fact.subject === "payment") score = Math.min(score, 15);
      return score;
    }

    function concreteSnippet(entry) {
      var fact = entry.fact;
      var rooms = (fact.rooms || []).slice();
      var roomBit = rooms.length === 1 ? "Room " + rooms[0]
        : (rooms.length > 1 ? "Rooms " + joinNatural(rooms) : "");
      if (fact.subject === "vip_arrival" || (fact.guestName && /\bvip\b/i.test(fact.sourceText || ""))) {
        return "VIP arrival prep for " + (fact.guestName || roomBit || "the arriving guest") +
          (roomBit && fact.guestName ? " (" + roomBit + ")" : "");
      }
      if (fact.subject === "room_move" && rooms[0]) {
        return "a possible room move for Room " + rooms[0] +
          (fact.preferredLocation ? " to the " + fact.preferredLocation : "");
      }
      if (fact.subject === "maintenance") {
        var fault = fact.faultType === "AC" ? "AC fault"
          : (fact.faultType === "shower/leak" ? "shower/leak"
            : (fact.faultType || "maintenance issue"));
        return (roomBit ? fault + " in " + roomBit : fault) + " still open";
      }
      if (fact.subject === "outstanding_balance" || fact.subject === "payment" ||
          fact.subject === "invoice" || fact.subject === "folio" || fact.subject === "bill") {
        var amount = detailValueFromFact(fact, "money");
        return "outstanding " + (amount ? amount + " " : "") + "balance" +
          (roomBit ? " on " + roomBit : "") + " before departure";
      }
      if (fact.subject === "guest_request") {
        var item = fact.requestItem || detailValueFromFact(fact, "request_item") || "guest request";
        return item + (roomBit ? " for " + roomBit : "") + " still outstanding";
      }
      if (fact.subject === "twin_setup" && rooms[0]) {
        return "twin-bed setup for Room " + rooms[0] + " before arrival";
      }
      if (fact.subject === "guest_arrangement" && fact.guestName) {
        return "guest arrangement for " + fact.guestName;
      }
      if (fact.subject === "late_checkout" && rooms[0]) {
        return "late check-out for Room " + rooms[0] + " awaiting confirmation";
      }
      if (fact.subject === "lost_property") {
        return "lost property follow-up" + (roomBit ? " for " + roomBit : "");
      }
      if (rooms[0] && fact.guestName) {
        return "open action for " + fact.guestName + " in Room " + rooms[0];
      }
      if (rooms[0]) return "open action for Room " + rooms[0];
      if (fact.guestName) return "open action for " + fact.guestName;
      return "";
    }

    unresolved.sort(function (a, b) { return impactRank(a) - impactRank(b); });

    var sentences = [];
    var critical = unresolved.filter(function (e) {
      return e.topic === "critical" || (e.fact && e.fact.guestImpact === "critical");
    });
    var highImpact = unresolved.filter(function (e) {
      return e.fact && (e.fact.guestImpact === "high" || e.fact.priority === "high" || e.fact.priority === "urgent");
    });
    var revenueRisk = unresolved.filter(function (e) {
      return e.topic === "payment" || /balance|payment|invoice|folio/i.test((e.fact && e.fact.subject) || "");
    });

    if (!unresolved.length && !completed.length) {
      sentences.push("No operational issues were identified during this shift.");
    } else if (critical.length === 1) {
      sentences.push("One critical operational issue requires immediate attention.");
    } else if (critical.length > 1) {
      sentences.push(critical.length + " critical operational issues require immediate attention.");
    } else if (highImpact.length || revenueRisk.length) {
      var riskBits = [];
      if (highImpact.some(function (e) { return e.topic === "maintenance"; })) {
        riskBits.push("guest-impacting maintenance");
      }
      if (revenueRisk.length) riskBits.push("revenue or payment risk");
      if (highImpact.some(function (e) { return e.topic === "vip"; })) {
        riskBits.push("VIP arrival preparation");
      }
      if (riskBits.length) {
        sentences.push("Priority for the next shift is " + joinNatural(riskBits) + ".");
      } else {
        sentences.push("No critical operational issues were identified during this shift.");
      }
    } else {
      sentences.push("No critical operational issues were identified during this shift.");
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
   * Shift Glance / top badge metrics.
   * Prefers Hospitality Intelligence Engine object-based alert counts.
   */
  function computeHandoverMetricsFromFacts(analyzed) {
    var entries = [];
    (analyzed || []).forEach(function (note, index) {
      if (!note) return;
      var fact = ensureNoteFact(note);
      if (!fact) return;
      if (!isGlanceActiveFact(note, fact)) return;
      entries.push({
        note: note,
        fact: fact,
        factId: note._neutralFactId || factIdentityKey(fact) || ("fact-" + index),
        topic: classifyFactSummaryTopic(fact, note),
        section: note.section || sectionFromFact(fact, "general")
      });
    });

    if (global.ShiftIntelligenceEngine &&
        typeof global.ShiftIntelligenceEngine.computeShiftAlertsFromObjects === "function") {
      var alerts = global.ShiftIntelligenceEngine.computeShiftAlertsFromObjects(entries);
      return {
        urgent: alerts.urgent || 0,
        vip: alerts.vip || 0,
        maintenance: alerts.maintenance || 0,
        payments: alerts.payments || 0,
        events: alerts.timedActions || alerts.events || 0,
        timedActions: alerts.timedActions || 0,
        tasks: alerts.tasks || 0,
        display: {
          urgent: (alerts.display && alerts.display.urgent) || alerts.urgent || 0,
          guest: (alerts.display && alerts.display.guest) || alerts.guest || 0,
          maintenance: (alerts.display && alerts.display.maintenance) || alerts.maintenance || 0,
          payments: (alerts.display && alerts.display.payments) || alerts.payments || 0,
          events: (alerts.display && alerts.display.timedActions) || alerts.timedActions || 0,
          timedActions: alerts.timedActions || 0,
          tasks: (alerts.display && alerts.display.tasks) || alerts.tasks || 0,
          general: (alerts.display && alerts.display.general) || 0
        }
      };
    }

    var urgentNotes = [];
    var vipNotes = [];
    var maintenanceNotes = [];
    var paymentNotes = [];
    var eventNotes = [];
    var taskLikeNotes = [];
    var guestNotes = [];
    var generalNotes = [];

    entries.forEach(function (entry) {
      var note = entry.note;
      var fact = entry.fact;
      var section = entry.section || "";
      var topic = entry.topic || "";
      if (section === "urgent" || topic === "critical") urgentNotes.push(note);
      if (isVipGlanceNote(note, fact)) vipNotes.push(note);
      if (section === "maintenance" || topic === "maintenance") maintenanceNotes.push(note);
      if (section === "payments" || topic === "payment") paymentNotes.push(note);
      if (section === "events" || topic === "event") eventNotes.push(note);
      if (isTaskLikeGlanceNote(note, fact)) taskLikeNotes.push(note);
      if (
        section === "guest" || section === "vip" || topic === "guest" || topic === "vip" ||
        topic === "lateCheckout" || topic === "roomMove" || topic === "extension" || topic === "complaint"
      ) {
        guestNotes.push(note);
      }
      if (section === "general" || section === "lostproperty") generalNotes.push(note);
    });

    var vip = countNotesUniqueByRoom(vipNotes);
    var taskLike = countNotesUniqueByRoom(taskLikeNotes);
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
      timedActions: events,
      tasks: tasks,
      display: {
        urgent: urgent,
        guest: guest,
        maintenance: maintenance,
        payments: payments,
        events: events,
        timedActions: events,
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

    var subject = String(fact.subject || "");
    var normalized = normalizeSubjectForIdentity(subject);

    /* Subject authority wins over stale general hints so misfiles can be corrected. */
    if (normalized === "payment_balance") return "payments";
    if (subject === "maintenance") return "maintenance";
    if (subject === "vip_arrival") return "vip";
    /* POA / reservation metadata is not automatically VIP without VIP evidence. */
    if (subject === "reservation_info") {
      var resSrc = String(fact.sourceText || fact.summary || "");
      if (/\bvip\b/i.test(resSrc) || fact.isVip) return "vip";
      return fallback || "general";
    }
    if (subject === "guest_arrangement" || subject === "guest_preparation" || subject === "interconnect" ||
        subject === "celebration") {
      return "guest";
    }
    if (subject === "twin_setup") return "tasks";
    if (subject === "late_checkout" || subject === "room_move" || subject === "extension") return "guest";
    if (subject === "departure_followup" || subject === "transfer") return "guest";
    if (subject === "guest_request") {
      if (fact.ownerDept === "Housekeeping") return "tasks";
      return "guest";
    }
    if (subject === "wake_up") return "guest";
    if (subject === "lost_property") return "lostproperty";
    if (subject === "no_show") return "events";
    if (subject === "delivery") return "deliveries";
    if (subject === "inventory" || subject === "adapter") return "inventory";
    if (subject === "supply") return "tasks";
    if (subject === "follow_up") {
      if (fact.ownerDept === "Maintenance") return "maintenance";
      if (fact.ownerDept === "Housekeeping") return "tasks";
      return fallback || "guest";
    }

    var hint = String(fact.sectionHint || "").toLowerCase();
    if (hint === "completed") return "completed";
    if (hint && hint !== "general" && hint !== "completed") return hint;
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
    var requestItem = String(fact.requestItem || detailValueFromFact(fact, "request_item") || "").toLowerCase();
    var faultType = String(fact.faultType || detailValueFromFact(fact, "fault_type") || "").toLowerCase();

    if (options.family) {
      /* Same-room / same-subject family for status resolution (status omitted).
         Keep distinct guest requests / fault types separate. */
      return ["fam", rooms, subject, target, section, requestItem, faultType].join("|");
    }

    return ["id", rooms, subject, status, verb, target, section, requestItem, faultType].join("|");
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

    var requestA = String(factA.requestItem || detailValueFromFact(factA, "request_item") || "").toLowerCase();
    var requestB = String(factB.requestItem || detailValueFromFact(factB, "request_item") || "").toLowerCase();
    if (requestA && requestB && requestA !== requestB) return false;

    var faultA = String(factA.faultType || detailValueFromFact(factA, "fault_type") || "").toLowerCase();
    var faultB = String(factB.faultType || detailValueFromFact(factB, "fault_type") || "").toLowerCase();
    if (faultA && faultB && faultA !== faultB) return false;

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

    var seqVals = notes.map(function (n) {
      return typeof n._seq === "number" ? n._seq : null;
    }).filter(function (v) { return v != null; });
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
      _factConsolidated: true,
      /* Earliest source sequence — election chronology must survive consolidate/sort. */
      _seq: seqVals.length ? Math.min.apply(null, seqVals) : undefined
    };
  }

  /* ------------------------------------------------------------------ */
  /* Reasoning Sprint 1 — canonical CURRENT operational state election   */
  /* One gate for all decision surfaces. Facet-scoped, fail-conservative. */
  /* ------------------------------------------------------------------ */

  function normalizeGuestToken(name) {
    return String(name || "")
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function noteSourceBlob(note) {
    if (!note) return "";
    var parts = [];
    if (note.original) parts.push(String(note.original));
    if (note.fact) {
      collectSourceTexts(note.fact).forEach(function (t) { parts.push(t); });
      if (note.fact.sourceHistory && note.fact.sourceHistory.length) {
        note.fact.sourceHistory.forEach(function (entry) {
          if (entry && entry.sourceText) parts.push(String(entry.sourceText));
        });
      }
    }
    return parts.join(" | ");
  }

  /**
   * Primary wording for hazard lifecycle election only.
   * Must NOT include sibling archive/history — otherwise a controlled winner's
   * archive (or an active reopen winner's archive) pollutes active vs control detection.
   */
  function notePrimaryElectionBlob(note) {
    if (!note) return "";
    if (note.original) return String(note.original);
    if (note.fact && note.fact.sourceText) return String(note.fact.sourceText);
    return "";
  }

  function isPaymentExemptFromNoCollect(text) {
    var lower = String(text || "").toLowerCase();
    if (/\bdisputed?\b/.test(lower)) return true;
    if (/\bdeposit\s+held\b/.test(lower) || /\bholding\s+(?:a\s+)?deposit\b/.test(lower)) return true;
    if (/\b(?:card\s+)?guarantee\s+held\b/.test(lower) || /\bheld\s+as\s+guarantee\b/.test(lower)) return true;
    if (/\bguarantee\b/.test(lower) && !/\b(?:paid|transferred|settled|cleared)\b/.test(lower)) return true;
    if (/\bunresolved\b/.test(lower) && /\bvcc\b/.test(lower)) return true;
    if (/\bpending\b/.test(lower) && !/\b(?:paid|settled|cleared|charged|transferred)\b/.test(lower) &&
        !/(?:£|\$|€)\s*0(?:\.00)?\b/.test(lower)) {
      return true;
    }
    return false;
  }

  function isZeroMoneyText(text) {
    var lower = String(text || "").toLowerCase();
    var moneyRe = /(?:£|\$|€)\s*(\d+(?:[.,]\d{1,2})?)/g;
    var moneyMatch;
    while ((moneyMatch = moneyRe.exec(lower))) {
      if (parseFloat(String(moneyMatch[1]).replace(",", ".")) === 0) return true;
    }
    return /\bzero\s+balance\b/.test(lower) ||
      /\bowes?\s+(?:£|\$|€)?\s*0\b/.test(lower) ||
      /\boutstanding\s+balance\s+of\s+(?:£|\$|€)?\s*0\b/.test(lower) ||
      /\bbalance\s+of\s+(?:£|\$|€)?\s*0\b/.test(lower);
  }

  function isPaymentNoCollectText(text) {
    var lower = String(text || "").toLowerCase();
    if (!lower) return false;
    if (isPaymentExemptFromNoCollect(lower)) return false;
    if (/\bnot\s+(?:yet\s+)?paid\b/.test(lower) || /\bunpaid\b/.test(lower)) return false;
    if (/\bstill\s+to\s+pay\b/.test(lower) || /\bstill\s+outstanding\b/.test(lower)) return false;
    if (/\bextras?\s+(?:are\s+)?poa\b/.test(lower) && !/\b(?:room|accommodation|tax)\b/.test(lower)) {
      /* Extras POA alone is not a room-folio clear signal. */
    }
    if (isZeroMoneyText(lower)) return true;
    if (/\b(?:fully\s+)?paid(?:\s+in\s+full)?\b/.test(lower)) return true;
    if (/\baccount\s+(?:now\s+)?clear\b/.test(lower) || /\bno\s+further\s+payment\b/.test(lower)) return true;
    if (/\bpayment\s+sorted\b/.test(lower) || /\bsuccessfully\s+charged\b/.test(lower)) return true;
    if (/\breceived\s+in\s+full\b/.test(lower) || /\bpayment\s+received\s+(?:in\s+full|successfully)\b/.test(lower)) {
      return true;
    }
    if (/\btransferred\s+to\s+company\b/.test(lower)) return true;
    if (/\bcompany\s+pays\b/.test(lower) && /\b(?:room|tax|accommodation)\b/.test(lower)) return true;
    if (/\bdo\s+not\s+(?:ask|request|charge)\s+(?:guest|the\s+guest).{0,40}(?:accommodation|room\s+payment|personally)/.test(lower)) {
      return true;
    }
    if (/\bcompany\s+(?:billing|ledger|account)\b/.test(lower) &&
        /\b(?:authoris|authoriz|transferred|£\s*0|owes?\s+£?\s*0|guest\s+owes|pays?)\b/.test(lower)) {
      return true;
    }
    if (/\bguest\s+owes\s+(?:£|\$|€)?\s*0\b/.test(lower)) return true;
    if (/\bcurrent\s+balance\s*=\s*(?:£|\$|€)?\s*0\b/.test(lower)) return true;
    return false;
  }

  function paymentFacetHint(text) {
    var lower = String(text || "").toLowerCase();
    if (/\bminibar\b/.test(lower)) return "minibar";
    if (/\bvcc\b/.test(lower) || /\bvirtual\s+card\b/.test(lower)) return "vcc";
    if (/booking\.com|b\.?\s*com/.test(lower)) return "booking.com";
    if (/\bexpedia\b/.test(lower)) return "expedia";
    if (/\bdeposit\b/.test(lower)) return "deposit";
    if (/\bcity\s+tax\b/.test(lower)) return "city_tax";
    return "general";
  }

  function isTerminalDoneText(text) {
    var lower = String(text || "").toLowerCase();
    if (!lower) return false;
    if (/\bnot\s+(?:yet\s+)?(?:done|completed|resolved|fixed|delivered)\b/.test(lower)) return false;
    if (/\bstill\s+open\b/.test(lower) || /\bissue\s+still\s+open\b/.test(lower)) return false;
    /*
     * Sprint 5: "Fixed charges added" is payment-posting language — must not mark
     * the whole note (e.g. sibling iron request) as terminal done.
     */
    lower = lower.replace(/\bfixed\s+charges?\b/g, " ");
    return /\b(?:has\s+been\s+)?(?:done|completed|resolved|fixed|delivered|placed\s+in\s+room)\b/.test(lower) ||
      /\bFINAL\s*=\s*DONE\b/i.test(text || "") ||
      /\bCOMPLETE(?:D)?\b/.test(text || "") && !/\bnot\s+complete/i.test(lower);
  }

  function isCancelledRequestText(text) {
    var lower = String(text || "").toLowerCase();
    if (!lower) return false;
    return /\bcancell?ed\b/.test(lower) ||
      /\bno\s+longer\s+(?:needed|required)\b/.test(lower) ||
      /\bdo\s+not\s+(?:prepare|request|show|place|send|create)\b/.test(lower) ||
      /\bdo\s+NOT\s+(?:prepare|request|show|place|send|create)\b/.test(text || "") ||
      /\bnot\s+(?:needed|required)\s+anymore\b/.test(lower) ||
      /\bold\s+twin\s+request\s+is\s+superseded\b/.test(lower);
  }

  function isInServiceOrNotOooText(text) {
    var lower = String(text || "").toLowerCase();
    if (!lower) return false;
    return /\bnot\s+ooo\b/.test(lower) ||
      /\bno\s+longer\s+ooo\b/.test(lower) ||
      /\breturned\s+to\s+service\b/.test(lower) ||
      /\bback\s+in\s+service\b/.test(lower) ||
      /\bin\s+service\b/.test(lower) ||
      /\broom\s+can\s+remain\s+in\s+service\b/.test(lower) ||
      /\bavailable\s+for\s+sale\b/.test(lower) ||
      /\brepair\s+(?:successful|completed)\b/.test(lower);
  }

  function isOooOrOpenMaintText(text) {
    var lower = String(text || "").toLowerCase();
    if (!lower) return false;
    if (isInServiceOrNotOooText(lower)) return false;
    return /\booo\b/.test(lower) ||
      /\bout\s+of\s+order\b/.test(lower) ||
      /\bstill\s+open\b/.test(lower) ||
      /\bissue\s+still\s+open\b/.test(lower);
  }

  /**
   * Reasoning Sprint 1 — hazard lifecycle class for same-incident election.
   * Groups progressive updates (active → isolated/cleared/controlled) without
   * collapsing unrelated faults in the same room.
   */
  function hazardLifecycleClass(text) {
    var lower = String(text || "").toLowerCase();
    if (!lower) return "";
    /* Cash / lost-property "safe" is not an electrical hazard. */
    if (/\b(?:cash\s+found|secured\s+in\s+(?:the\s+)?safe|lost\s+property)\b/.test(lower) &&
        !/\b(?:burning|electrical\s+smell|extension\s+lead|cupboard|overheating)\b/.test(lower)) {
      return "";
    }
    if (
      /\b(?:burning\s+smell|electrical\s+smell|smell\s+(?:of\s+)?(?:burning|smoke)|smell\s+something\s+electrical|overheating\s+extension|extension\s+lead|no\s+fire(?:\/|\s+or\s+)smoke|fire\s+panel\s+normal|area\s+safe\s+now)\b/.test(lower) ||
      (/\b(?:housekeeping\s+)?cupboard\b/.test(lower) &&
        /\b(?:isolated|locked|unplugged|electrical|extension|smell)\b/.test(lower))
    ) {
      return "electrical_hazard";
    }
    if (
      /\b(?:active\s+leak|started\s+leak(?:ing)?|ceiling\s+(?:started\s+)?leak(?:ing)?|water\s+(?:coming|isolated|running|supply)|water\s*\/\s*electrical|shower\s+above|traced\s+to\s+(?:rm|room)|flooding|water\s+near\s+(?:socket|elect)|do\s+not\s+restore\s+power|risk\s+(?:currently\s+)?controlled|sockets?\s+(?:must\s+remain\s+)?isolated)\b/.test(lower) ||
      (/\bleak(?:ing)?\b/.test(lower) && /\b(?:water|ceiling|shower|bathroom|socket|elect)\b/.test(lower)) ||
      (/\bwater\b/.test(lower) && /\belectrical\b/.test(lower))
    ) {
      return "water_leak";
    }
    return "";
  }

  function isHazardControlOrClearanceText(text) {
    var lower = String(text || "").toLowerCase();
    if (!lower) return false;
    if (/\bnot\s+(?:yet\s+)?isolated\b/.test(lower) &&
        !/\b(?:area\s+safe|no\s+fire|risk\s+controlled|unplugged|do\s+not\s+restore|remain(?:s)?\s+locked)\b/.test(lower)) {
      return false;
    }
    return /\b(?:area\s+safe|no\s+fire|risk\s+(?:currently\s+)?controlled|water(?:\s+supply)?\s+isolated|(?:power|sockets?|cupboard|housekeeping\s+cupboard)\s+isolated|unplugged\s+and\s+removed|do\s+not\s+restore|remain(?:s)?\s+locked|must\s+not\s+be\s+used|extension\s+lead\s+must\s+not|lead\s+must\s+not)\b/.test(lower) ||
      (/\bisolated\b/.test(lower) && /\b(?:water|power|socket|cupboard|electrical|supply)\b/.test(lower));
  }

  function isHazardActiveOpenText(text) {
    var lower = String(text || "").toLowerCase();
    if (!lower) return false;
    /* Clearance/control updates are not "still active danger" for election. */
    if (/\b(?:area\s+safe|no\s+fire|risk\s+(?:currently\s+)?controlled|water\s+isolated|unplugged\s+and\s+removed)\b/.test(lower)) {
      return false;
    }
    return /\b(?:burning\s+smell|electrical\s+smell|smell\s+something\s+electrical|strong\s+burning|started\s+leak(?:ing)?|active\s+leak|water\s+coming\s+through|water\s+running\s+down|still\s+(?:smell|leaking)|not\s+(?:yet\s+)?inspect|could\s+smell)\b/.test(lower);
  }

  function hazardLifecycleNotesLink(a, b, hz, blobA, blobB, roomsA, roomsB, faultA, faultB) {
    if (!hz) return false;
    roomsA = roomsA || [];
    roomsB = roomsB || [];
    /* Area / update fragments with no room attach to the open lifecycle. */
    if (!roomsA.length || !roomsB.length) return true;
    if (roomsA.some(function (r) { return roomsB.indexOf(r) !== -1; })) return true;
    /*
     * Cross-room only when evidence links one incident (e.g. leak in 26 from 46 above).
     * Do not merge unrelated same-class hazards in different rooms.
     */
    if (hz === "water_leak") {
      var both = (String(blobA || "") + " " + String(blobB || "")).toLowerCase();
      if (/\btraced\s+to\b|\bshower\s+above\b|\bfrom\s+(?:rm|room)\s*\d+|\binto\s+(?:rm|room)\s*\d+/.test(both)) {
        return true;
      }
      if (faultA && faultB && faultA === faultB && /leak/.test(faultA)) {
        if (roomsA.some(function (r) {
          return new RegExp("\\b(?:rm|room)\\s*" + r + "\\b", "i").test(blobB || "");
        }) || roomsB.some(function (r) {
          return new RegExp("\\b(?:rm|room)\\s*" + r + "\\b", "i").test(blobA || "");
        })) {
          return true;
        }
      }
    }
    return false;
  }

  function isFinalAllocationText(text) {
    var src = String(text || "");
    var lower = src.toLowerCase();
    return /\bfinal\s+room\b/.test(lower) ||
      /\bfinal\s+current\s+room\b/.test(lower) ||
      /\bfinal\s+room\s+setup\b/.test(lower) ||
      /\bmoved\s+to\s+(?:rm|room)\s*\d+/i.test(src) ||
      /\ballocation\s+changed\b/.test(lower) ||
      /\bdo\s+not\s+(?:send|use|allocate)\b/.test(lower);
  }

  function isFinalSetupText(text) {
    var lower = String(text || "").toLowerCase();
    return /\bfinal\s+room\s+setup\b/.test(lower) ||
      /\bdouble\s+is\s+fine\b/.test(lower) ||
      /\bno\s+longer\s+needs\s+twin\b/.test(lower) ||
      /\bdo\s+not\s+request\s+twin\b/.test(lower) ||
      /\btwin\s+request\s+is\s+superseded\b/.test(lower) ||
      (/\bdouble\b/.test(lower) && /\b(?:final|confirmed|fine|instead)\b/.test(lower));
  }

  function amenityKindFromNote(note) {
    var blob = noteSourceBlob(note).toLowerCase();
    var fact = note && note.fact;
    var requestItem = String((fact && (fact.requestItem || detailValueFromFact(fact, "request_item"))) || "").toLowerCase();
    var celebration = String(detailValueFromFact(fact, "celebration") || "").toLowerCase();
    if (requestItem.indexOf("champagne") !== -1 || /\bchampagne\b/.test(blob) || celebration.indexOf("champagne") !== -1) {
      return "champagne";
    }
    if (/\bprosecco\b/.test(blob) || celebration.indexOf("prosecco") !== -1) return "prosecco";
    if (/\bflowers?\b/.test(blob)) return "flowers";
    if (/\bballoons?\b/.test(blob) || celebration.indexOf("balloon") !== -1) return "balloons";
    if (/\bchocolates?\b/.test(blob)) return "chocolates";
    if (/\b(?:welcome\s+)?card\b/.test(blob) || /\bhandwritten\s+card\b/.test(blob)) return "card";
    if (/\bcot\b/.test(blob) || requestItem.indexOf("cot") !== -1) return "cot";
    if (requestItem) return requestItem;
    return "";
  }

  function isPaymentSubjectFact(fact, blob) {
    var subject = normalizeSubjectForIdentity((fact && fact.subject) || "");
    if (/payment|balance|invoice|bill|folio|account|charge|settlement/.test(subject)) return true;
    var lower = String(blob || "").toLowerCase();
    return /\b(?:outstanding|balance|paid|poa|prepaid|folio|£|expedia|booking\.com|minibar|company\s+billing|account\s+clear)\b/.test(lower);
  }

  function noteRooms(note) {
    return normalizeFactRooms(((note && note.fact && note.fact.rooms) || (note && note.rooms) || [])).slice();
  }

  function noteGuest(note) {
    var raw = normalizeGuestToken((note && note.fact && note.fact.guestName) || "");
    /* Extraction sometimes captures section markers / departments as guest names. */
    if (!raw || /^(final|update|room|guest|vip|mr|mrs|ms|dr|latest)$/i.test(raw)) return "";
    if (/^(final|update|latest)\b/.test(raw)) return "";
    if (/^(night\s+audit|reception|finance|housekeeping|maintenance|accounts|duty\s+manager|engineer|concierge|f\s*&\s*b|front\s+office)$/i.test(raw)) {
      return "";
    }
    if (/^(night|audit|manager|supervisor)\b/.test(raw) && raw.split(/\s+/).length <= 2) {
      return "";
    }
    return raw;
  }

  function paymentChannel(note) {
    var fact = note && note.fact;
    var channel = String(detailValueFromFact(fact, "channel") || "").toLowerCase();
    if (channel) return channel;
    var blob = noteSourceBlob(note);
    if (/\bexpedia\b/i.test(blob)) return "expedia";
    if (/booking\.com|b\.?\s*com/i.test(blob)) return "booking.com";
    return "";
  }

  function noteMoneyValues(note) {
    var values = [];
    var fact = note && note.fact;
    (fact && fact.details || []).forEach(function (d) {
      if (d && d.type === "money" && d.value != null) values.push(String(d.value).replace(/\s+/g, ""));
    });
    var blob = noteSourceBlob(note);
    var matches = String(blob).match(/(?:£|\$|€)\s*\d+(?:[.,]\d{2})?/g) || [];
    matches.forEach(function (m) {
      values.push(m.replace(/\s+/g, ""));
    });
    return uniqueStrings(values);
  }

  function roomsCompatibleForElection(a, b) {
    /* Same resolved entity may span room history (moves) — treat as compatible. */
    var ea = noteEntityId(a);
    var eb = noteEntityId(b);
    if (ea && eb && ea === eb) return true;
    var ra = noteRooms(a);
    var rb = noteRooms(b);
    if (!ra.length || !rb.length) return true;
    return ra.some(function (r) { return rb.indexOf(r) !== -1; });
  }

  function noteEntityId(note) {
    if (!note) return "";
    if (note.entityId) return String(note.entityId);
    if (note.fact && note.fact.entityId) return String(note.fact.entityId);
    return "";
  }

  function guestsCompatibleForElection(a, b) {
    /* Sprint 3: entityId is the identity authority when both sides resolved. */
    var ea = noteEntityId(a);
    var eb = noteEntityId(b);
    if (ea && eb) return ea === eb;
    var ga = noteGuest(a);
    var gb = noteGuest(b);
    if (!ga || !gb) return true;
    if (ga === gb) return true;
    /* Conservative: distinct full names do not match on partial tokens alone. */
    return false;
  }

  function moneyOverlap(a, b) {
    var ma = noteMoneyValues(a);
    var mb = noteMoneyValues(b);
    if (!ma.length || !mb.length) return false;
    return ma.some(function (x) { return mb.indexOf(x) !== -1; });
  }

  /**
   * Payment facet link — same room always (amounts may differ for supersession).
   * Room-less updates only attach via guest, channel, or shared money — never via
   * empty-room wildcards (that transitively merged unrelated folios).
   */
  function paymentNotesLink(a, b) {
    if (!guestsCompatibleForElection(a, b)) return false;
    var ra = noteRooms(a);
    var rb = noteRooms(b);
    var sameRoom = ra.length && rb.length && ra.some(function (r) { return rb.indexOf(r) !== -1; });
    if (sameRoom) return true;

    var ca = paymentChannel(a);
    var cb = paymentChannel(b);
    var sameChannel = !!(ca && cb && ca === cb);
    var ga = noteGuest(a);
    var gb = noteGuest(b);
    var sameGuest = !!(ga && gb && ga === gb);
    var moneyOk = moneyOverlap(a, b);
    var terminalPay = isPaymentNoCollectText(noteSourceBlob(a)) || isPaymentNoCollectText(noteSourceBlob(b)) ||
      isZeroMoneyText(noteSourceBlob(a)) || isZeroMoneyText(noteSourceBlob(b));

    /* Both room-less: require guest or channel, plus money or terminal paid signal. */
    if (!ra.length && !rb.length) {
      return (sameGuest || sameChannel) && (moneyOk || terminalPay);
    }
    /*
     * One room-less: terminals may attach via guest/channel/money.
     * Non-terminal room-less claims must not attach via guest alone (stray "£120
     * outstanding when guest left" was joining Laura's Booking.com folio).
     */
    if (!ra.length || !rb.length) {
      if (terminalPay) return sameGuest || sameChannel || moneyOk;
      return sameChannel || moneyOk;
    }
    return false;
  }

  function noteElectionFault(note) {
    var fact = note && note.fact;
    var blob = noteSourceBlob(note);
    var fault = String((fact && (fact.faultType || detailValueFromFact(fact, "fault_type"))) ||
      extractFaultType(blob) || "").toLowerCase();
    if (fault) return fault;
    return String((note && note._electionFault) || "").toLowerCase();
  }

  function amenityKindsMentioned(note) {
    var blob = noteSourceBlob(note).toLowerCase();
    var kinds = [];
    if (/\bchampagne\b/.test(blob)) kinds.push("champagne");
    if (/\bprosecco\b/.test(blob)) kinds.push("prosecco");
    if (/\bflowers?\b/.test(blob)) kinds.push("flowers");
    if (/\bballoons?\b/.test(blob)) kinds.push("balloons");
    if (/\bchocolates?\b/.test(blob)) kinds.push("chocolates");
    if (/\b(?:welcome\s+card|handwritten\s+card)\b/.test(blob) ||
        (/\bcard\b/.test(blob) && /(?:welcome|handwritten|card\s+still|card\s+required|card\s+written|card\s+done)/.test(blob))) {
      kinds.push("card");
    }
    if (/\bcot\b/.test(blob)) kinds.push("cot");
    return kinds;
  }

  function amenityKindTerminalInArchive(kind, archive) {
    if (!kind) return false;
    /*
     * Evaluate per segment so "Champagne … DONE" does not mark a sibling
     * "Card still …" as complete via proximity across joined archives.
     */
    var segments = String(archive || "").split(/\s*\|\s*/);
    return segments.some(function (seg) {
      var lower = String(seg || "").toLowerCase();
      if (!lower) return false;
      if (kind === "card") {
        if (!/\bcard\b/.test(lower)) return false;
        return /\bcard\s+cancell|no\s+card\b/.test(lower) ||
          /\bcard\s+(?:written|done|complete|placed)\b/.test(lower) ||
          /\b(?:written|done|complete)\b.{0,20}\bcard\b/.test(lower);
      }
      if (kind === "champagne") {
        if (!/\bchampagne\b/.test(lower)) return false;
        return /(?:no|not|don't|do not)\s+champagne|champagne\s+cancell|replace(?:d)?\s+with|doesn't drink|do not (?:place|show|prepare).{0,60}champagne|champagne unavailable/.test(lower) ||
          /champagne.{0,50}(?:done|delivered|placed|complete)|(?:done|delivered|placed|complete).{0,50}champagne/.test(lower);
      }
      if (lower.indexOf(kind) === -1 && !(kind === "chocolates" && /chocolate/.test(lower))) return false;
      var reCancel = new RegExp(kind + "\\s+cancell|do not (?:place|show).{0,40}" + kind, "i");
      var reDone = new RegExp(kind + ".{0,40}(?:done|delivered|placed|complete)", "i");
      return reCancel.test(lower) || reDone.test(lower);
    });
  }

  /**
   * Inherit room/guest/channel onto room-less payment / amenity / room-status terminals.
   * For room-status terminals, inherit a fault only when that room has exactly one
   * open fault (so IN SERVICE can close AC without suppressing a separate TV issue).
   */
  function enrichElectionIdentity(notes) {
    var lastPay = null;
    var lastPayByFacet = {};
    var lastAmenity = null;
    var lastAmenityByKind = {};
    var lastVipAmenity = null;
    var lastOpenMaint = null;
    var openFaultsByRoom = {};
    (notes || []).forEach(function (note) {
      if (!note || !note.fact) return;
      var blob = noteSourceBlob(note);
      var rooms = noteRooms(note);
      var fault = String((note.fact.faultType || detailValueFromFact(note.fact, "fault_type") ||
        extractFaultType(blob) || "")).toLowerCase();
      var terminalRoom = isInServiceOrNotOooText(blob) ||
        (isTerminalDoneText(blob) && /repair|fixed|resolved|working|tested|repaired/i.test(blob)) ||
        /\b(?:repaired|fixed|tested)\b/i.test(blob) &&
          /\b(?:working|resolved|complete|done|in\s+service)\b/i.test(blob);
      if (rooms.length === 1 && fault && !terminalRoom && !isInServiceOrNotOooText(blob)) {
        if (!openFaultsByRoom[rooms[0]]) openFaultsByRoom[rooms[0]] = {};
        openFaultsByRoom[rooms[0]][fault] = true;
        lastOpenMaint = { rooms: rooms.slice(), fault: fault };
      }

      var payLike = isPaymentSubjectFact(note.fact, blob) || isPaymentNoCollectText(blob) || isZeroMoneyText(blob) ||
        /\bminibar\b/i.test(blob);
      if (payLike) {
        var facet = paymentFacetHint(blob);
        var channel = paymentChannel(note);
        var inheritPay = lastPayByFacet[facet] ||
          (channel && lastPayByFacet[channel]) ||
          (facet !== "general" ? null : lastPay);
        var payTerminal = isPaymentNoCollectText(blob) || isZeroMoneyText(blob) ||
          /received in full|paid in full|account clear|successfully charged|payment sorted|no further payment|fully paid/i.test(blob);
        /*
         * Channel-only updates must inherit room/guest from the same facet — never
         * replace facet context with an empty-room stub (broke Laura PAID linking).
         */
        if (inheritPay && (!rooms.length || !noteGuest(note)) &&
            (payTerminal || (channel && inheritPay.channel && channel === inheritPay.channel))) {
          if (!rooms.length && inheritPay.rooms && inheritPay.rooms.length) {
            note.fact.rooms = inheritPay.rooms.slice();
            note.rooms = inheritPay.rooms.slice();
            rooms = noteRooms(note);
          }
          if (!noteGuest(note) && inheritPay.guestName) {
            note.fact.guestName = inheritPay.guestName;
          }
          if (!channel && inheritPay.channel && !detailValueFromFact(note.fact, "channel")) {
            note.fact.details = (note.fact.details || []).concat([{ type: "channel", value: inheritPay.channel }]);
            channel = inheritPay.channel;
          }
        }
        if (rooms.length || noteGuest(note) || channel) {
          var payCtx = {
            rooms: rooms.slice(),
            guestName: (note.fact && note.fact.guestName) || "",
            guestToken: noteGuest(note),
            channel: channel,
            facet: facet
          };
          if (payCtx.rooms.length || payCtx.guestToken) {
            lastPay = payCtx;
            lastPayByFacet[facet] = payCtx;
            if (channel) lastPayByFacet[channel] = payCtx;
          }
        }
      }

      /* Amenity DONE/cancel — inherit from prior same-kind / VIP amenity context. */
      var amenKinds = amenityKindsMentioned(note);
      var prepClear = /no preparation outstanding|no prep outstanding/i.test(blob);
      if (amenKinds.length || prepClear) {
        if (note.fact.guestName && !noteGuest(note)) {
          note.fact.guestName = "";
        }
        var explicitAmenRooms = extractRoomNumbers(note.original || blob);
        var amenCtx = {
          rooms: rooms.slice(),
          guestName: (note.fact && note.fact.guestName) || "",
          guestToken: noteGuest(note)
        };
        var amenTerminal = isTerminalDoneText(blob) || isCancelledRequestText(blob) || prepClear ||
          /cancell|do not place|replace(?:d)?\s+with|card\s+still|still\s+needs|placed|written/i.test(blob);
        if ((rooms.length || noteGuest(note)) && explicitAmenRooms.length) {
          lastAmenity = amenCtx;
          amenKinds.forEach(function (k) { lastAmenityByKind[k] = amenCtx; });
          if (note.isVip || /vip_arrival/.test(normalizeSubjectForIdentity(note.fact.subject || ""))) {
            lastVipAmenity = amenCtx;
          }
        } else if (amenTerminal) {
          var inheritAmen = null;
          amenKinds.forEach(function (k) {
            if (!inheritAmen && lastAmenityByKind[k]) inheritAmen = lastAmenityByKind[k];
          });
          if (!inheritAmen) inheritAmen = lastVipAmenity || lastAmenity;
          if (inheritAmen && inheritAmen.rooms && inheritAmen.rooms.length) {
            /* Override glued wrong-room assignments when the text itself has no room. */
            if (!explicitAmenRooms.length) {
              note.fact.rooms = inheritAmen.rooms.slice();
              note.rooms = inheritAmen.rooms.slice();
            }
            if (!noteGuest(note) && inheritAmen.guestName) {
              note.fact.guestName = inheritAmen.guestName;
            }
          }
        } else if (rooms.length || noteGuest(note)) {
          lastAmenity = amenCtx;
          amenKinds.forEach(function (k) { lastAmenityByKind[k] = amenCtx; });
          if (note.isVip || /vip_arrival/.test(normalizeSubjectForIdentity(note.fact.subject || ""))) {
            lastVipAmenity = amenCtx;
          }
        }
      }

      /*
       * Room-status / repair terminals without a room number: inherit when exactly one
       * room currently has open faults, else fall back to the latest open maint room.
       * Same-fault room-less updates also inherit from the latest matching open fault.
       */
      if (!rooms.length && (terminalRoom || fault)) {
        var roomsWithOpen = Object.keys(openFaultsByRoom);
        var inheritRooms = null;
        var inheritFault = "";
        if (fault && lastOpenMaint && lastOpenMaint.fault === fault && lastOpenMaint.rooms.length === 1) {
          inheritRooms = lastOpenMaint.rooms.slice();
          inheritFault = fault;
        } else if (roomsWithOpen.length === 1) {
          inheritRooms = [roomsWithOpen[0]];
          var faults = Object.keys(openFaultsByRoom[roomsWithOpen[0]] || {});
          if (faults.length === 1) inheritFault = faults[0];
          else if (fault && faults.indexOf(fault) !== -1) inheritFault = fault;
        } else if (lastOpenMaint && lastOpenMaint.rooms && lastOpenMaint.rooms.length === 1 &&
            (terminalRoom || (fault && fault === lastOpenMaint.fault))) {
          inheritRooms = lastOpenMaint.rooms.slice();
          inheritFault = lastOpenMaint.fault || fault || "";
        }
        if (inheritRooms && inheritRooms.length) {
          note.fact.rooms = inheritRooms.slice();
          note.rooms = inheritRooms.slice();
          if (inheritFault && !fault) note._electionFault = inheritFault;
        }
      }
    });

    (notes || []).forEach(function (note) {
      if (!note || !note.fact) return;
      var blob = noteSourceBlob(note);
      var rooms = noteRooms(note);
      var fault = String((note.fact.faultType || detailValueFromFact(note.fact, "fault_type") ||
        extractFaultType(blob) || note._electionFault || "")).toLowerCase();
      if (rooms.length === 1 && isInServiceOrNotOooText(blob) && !fault) {
        var openFaults = Object.keys(openFaultsByRoom[rooms[0]] || {});
        if (openFaults.length === 1) {
          note._electionFault = openFaults[0];
        }
      }
    });
  }

  /**
   * After cluster election: mark amenity facets done/cancelled via same-room/guest
   * siblings without letting one amenity wipe an unrelated outstanding prep facet.
   */
  function finalizeAmenityCurrentState(notes) {
    (notes || []).forEach(function (note) {
      if (!note || !note.fact || isNoteSuperseded(note)) return;
      var kinds = amenityKindsMentioned(note);
      if (!kinds.length) return;
      var rooms = noteRooms(note);
      var guest = noteGuest(note);
      var related = [];
      var archiveParts = [];
      (notes || []).forEach(function (other) {
        if (!other) return;
        var or = noteRooms(other);
        var og = noteGuest(other);
        var otherKinds = amenityKindsMentioned(other);
        var roomHit = rooms.length && or.some(function (r) { return rooms.indexOf(r) !== -1; });
        var guestHit = !!(guest && og && guest === og);
        var sharedAmen = otherKinds.some(function (k) { return kinds.indexOf(k) !== -1; });
        if (roomHit || guestHit || (sharedAmen && roomsCompatibleForElection(note, other) &&
            guestsCompatibleForElection(note, other))) {
          related.push(other);
          var text = other.original || (other.fact && other.fact.sourceText) || "";
          if (text) archiveParts.push(String(text));
        }
      });
      if (!archiveParts.length) return;
      var archive = archiveParts.join(" | ");
      /*
       * Union amenity kinds across siblings so replacement prep (chocolates/card)
       * is not ignored when the original VIP line only listed champagne/flowers.
       */
      var kindSet = {};
      related.forEach(function (other) {
        amenityKindsMentioned(other).forEach(function (k) { kindSet[k] = true; });
      });
      var allKinds = Object.keys(kindSet);
      var superseded = [];
      var active = [];
      allKinds.forEach(function (kind) {
        if (amenityKindTerminalInArchive(kind, archive)) superseded.push(kind);
        else active.push(kind);
      });
      var localSuperseded = kinds.filter(function (k) { return superseded.indexOf(k) !== -1; });
      if (localSuperseded.length) {
        note._supersededAmenities = uniqueStrings((note._supersededAmenities || []).concat(localSuperseded));
      }
      note._sourceArchive = archiveParts.slice();
      if (!active.length && superseded.length) {
        /* All known prep facets complete — VIP arrival stays as awareness, not prep chase. */
        if (note.isVip || normalizeSubjectForIdentity(note.fact.subject || "") === "vip_arrival") {
          note.fact.vipPrepComplete = true;
        } else if (/^(guest_request|guest_preparation)$/.test(normalizeSubjectForIdentity(note.fact.subject || "")) ||
            amenityKindFromNote(note)) {
          var winner = null;
          (notes || []).forEach(function (other) {
            if (!other || other === note || isNoteSuperseded(other)) return;
            if (amenityKindsMentioned(other).some(function (k) { return superseded.indexOf(k) !== -1; }) &&
                terminalKindForNote(other).strength >= 850) {
              winner = other;
            }
          });
          if (winner) markNoteSuperseded(note, winner, "superseded_by_amenity_completion");
          else {
            note.fact.status = FACT_STATUS.done;
            note.fact.vipPrepComplete = true;
          }
        }
      } else if (active.length && (note.isVip || normalizeSubjectForIdentity(note.fact.subject || "") === "vip_arrival")) {
        note.fact.vipPrepComplete = false;
      }
    });
  }

  function electionRelation(a, b) {
    if (!a || !b || a === b) return "";
    var blobA = notePrimaryElectionBlob(a) || noteSourceBlob(a);
    var blobB = notePrimaryElectionBlob(b) || noteSourceBlob(b);
    var factA = a.fact;
    var factB = b.fact;
    var amenA = amenityKindFromNote(a);
    var amenB = amenityKindFromNote(b);
    var faultA = noteElectionFault(a);
    var faultB = noteElectionFault(b);
    var subjectA = normalizeSubjectForIdentity((factA && factA.subject) || "");
    var subjectB = normalizeSubjectForIdentity((factB && factB.subject) || "");
    var roomsA = noteRooms(a);
    var roomsB = noteRooms(b);
    var sameSingleRoom = roomsA.length === 1 && roomsB.length === 1 && roomsA[0] === roomsB[0];

    var kindsA = amenityKindsMentioned(a);
    var kindsB = amenityKindsMentioned(b);
    var sharedAmen = kindsA.filter(function (k) { return kindsB.indexOf(k) !== -1; });
    /*
     * Link on a single shared amenity kind only. Multi-kind notes (champagne+card)
     * still connect per-kind; finalizeAmenityCurrentState prevents cross-facet wipe.
     */
    if (sharedAmen.length === 1 && roomsCompatibleForElection(a, b) && guestsCompatibleForElection(a, b)) {
      return "amen:" + sharedAmen[0];
    }
    if (amenA && amenA === amenB && roomsCompatibleForElection(a, b) && guestsCompatibleForElection(a, b)) {
      return "amen:" + amenA;
    }

    var payA = isPaymentSubjectFact(factA, blobA) || isPaymentNoCollectText(blobA) || isZeroMoneyText(blobA);
    var payB = isPaymentSubjectFact(factB, blobB) || isPaymentNoCollectText(blobB) || isZeroMoneyText(blobB);
    if (payA && payB && paymentNotesLink(a, b)) {
      return "pay";
    }

    var rstatA = isInServiceOrNotOooText(blobA) || /\booo\b/i.test(blobA);
    var rstatB = isInServiceOrNotOooText(blobB) || /\booo\b/i.test(blobB);
    /* Room-status: require real room overlap (no empty-room wildcard). */
    if (rstatA && rstatB && roomsA.length && roomsB.length &&
        roomsA.some(function (r) { return roomsB.indexOf(r) !== -1; })) {
      return "rstat";
    }

    /*
     * Same-room maintenance/status:
     * - OOO ↔ returned IN SERVICE / NOT OOO (room-status only)
     * - Open fault ↔ terminal only when fault ids match (incl. single-fault inheritance)
     * Never let generic RTS close a different unresolved fault in the same room.
     */
    if (sameSingleRoom) {
      var oooOnlyA = /\booo\b/i.test(blobA) && !isInServiceOrNotOooText(blobA);
      var oooOnlyB = /\booo\b/i.test(blobB) && !isInServiceOrNotOooText(blobB);
      var inSvcA = isInServiceOrNotOooText(blobA);
      var inSvcB = isInServiceOrNotOooText(blobB);
      if ((oooOnlyA && inSvcB) || (oooOnlyB && inSvcA)) {
        return "rstat";
      }
      var termFaultA = isInServiceOrNotOooText(blobA) ||
        (isTerminalDoneText(blobA) && /repair|fixed|resolved|working|tested|repaired/i.test(blobA)) ||
        /\b(?:repaired|fixed|tested)\b/i.test(blobA) && /\b(?:working|resolved|complete|done|in\s+service)\b/i.test(blobA);
      var termFaultB = isInServiceOrNotOooText(blobB) ||
        (isTerminalDoneText(blobB) && /repair|fixed|resolved|working|tested|repaired/i.test(blobB)) ||
        /\b(?:repaired|fixed|tested)\b/i.test(blobB) && /\b(?:working|resolved|complete|done|in\s+service)\b/i.test(blobB);
      var openFaultA = !!(faultA && !termFaultA);
      var openFaultB = !!(faultB && !termFaultB);
      if (faultA && faultB && faultA === faultB &&
          ((openFaultA && termFaultB) || (openFaultB && termFaultA) || (openFaultA && openFaultB))) {
        return "maint-status:" + roomsA[0] + ":" + faultA;
      }
    }

    var setupA = subjectA === "twin_setup" || isFinalSetupText(blobA) ||
      (/\btwin\b/i.test(blobA) && /\b(?:setup|beds?|request|double)\b/i.test(blobA)) ||
      (/\bdouble\b/i.test(blobA) && /\b(?:final|confirmed|fine|instead|wants?)\b/i.test(blobA));
    var setupB = subjectB === "twin_setup" || isFinalSetupText(blobB) ||
      (/\btwin\b/i.test(blobB) && /\b(?:setup|beds?|request|double)\b/i.test(blobB)) ||
      (/\bdouble\b/i.test(blobB) && /\b(?:final|confirmed|fine|instead|wants?)\b/i.test(blobB));
    if (setupA && setupB && roomsCompatibleForElection(a, b) && guestsCompatibleForElection(a, b)) {
      return "setup";
    }

    var allocA = subjectA === "room_move" || isFinalAllocationText(blobA);
    var allocB = subjectB === "room_move" || isFinalAllocationText(blobB);
    if (allocA && allocB && guestsCompatibleForElection(a, b) &&
        (noteGuest(a) || noteGuest(b) || noteRooms(a).length || noteRooms(b).length)) {
      return "alloc";
    }

    if ((subjectA === "maintenance" || faultA) && (subjectB === "maintenance" || faultB)) {
      if (faultA && faultB && faultA === faultB && roomsCompatibleForElection(a, b) &&
          noteRooms(a).length && noteRooms(b).length) {
        return "maint:" + faultA;
      }
    }

    /*
     * Same hazard lifecycle (active → isolated/cleared/controlled).
     * Prefer this over fingerprint family keys so progressive safety updates elect one current state.
     */
    var hzA = hazardLifecycleClass(blobA);
    var hzB = hazardLifecycleClass(blobB);
    if (hzA && hzA === hzB &&
        hazardLifecycleNotesLink(a, b, hzA, blobA, blobB, roomsA, roomsB, faultA, faultB)) {
      return "hazard:" + hzA;
    }

    var famA = factMergeFamilyKey(factA);
    var famB = factMergeFamilyKey(factB);
    if (famA && famA === famB) {
      /*
       * Empty-room payment family keys collide (fam||payment|…|payments||) and were
       * transitively merging every folio into one multi-guest fail-closed cluster.
       * Payments must cluster only via paymentNotesLink.
       */
      if (payA || payB || isPaymentSubjectFact(factA, blobA) || isPaymentSubjectFact(factB, blobB) ||
          isPaymentNoCollectText(blobA) || isPaymentNoCollectText(blobB)) {
        return "";
      }
      return "family";
    }

    return "";
  }

  /**
   * Diagnostic / stable label for a note's primary election facet.
   * Clustering uses electionRelation (compatibility), not this key alone.
   */
  function currentStateFacetKey(note) {
    var amenity = amenityKindFromNote(note);
    if (amenity) {
      return ["amen", noteRooms(note).join(",") || "*", noteGuest(note) || "*", amenity].join("|");
    }
    var blob = noteSourceBlob(note);
    var fact = note && note.fact;
    if (isPaymentSubjectFact(fact, blob) || isPaymentNoCollectText(blob) || isZeroMoneyText(blob)) {
      return ["pay", noteRooms(note).join(",") || "*", noteGuest(note) || "*"].join("|");
    }
    if (isInServiceOrNotOooText(blob) || /\booo\b/i.test(blob)) {
      return ["rstat", noteRooms(note).join(",") || "*"].join("|");
    }
    var subject = normalizeSubjectForIdentity((fact && fact.subject) || "");
    if (subject === "twin_setup" || isFinalSetupText(blob)) {
      return ["setup", noteGuest(note) || "*", noteRooms(note).join(",") || "*"].join("|");
    }
    if (subject === "room_move" || isFinalAllocationText(blob)) {
      return ["alloc", noteGuest(note) || "*", noteRooms(note).join(",") || "*"].join("|");
    }
    var fault = String((fact && (fact.faultType || detailValueFromFact(fact, "fault_type"))) || extractFaultType(blob) || "").toLowerCase();
    if (subject === "maintenance" || fault) {
      return ["maint", noteRooms(note).join(",") || "*", fault || "maintenance"].join("|");
    }
    return factMergeFamilyKey(fact) || ["misc", sourceFingerprint(blob).slice(0, 40)].join("|");
  }

  function clusterNotesForElection(notes) {
    var parent = notes.map(function (_, i) { return i; });
    function find(i) {
      while (parent[i] !== i) {
        parent[i] = parent[parent[i]];
        i = parent[i];
      }
      return i;
    }
    function union(i, j) {
      var ri = find(i);
      var rj = find(j);
      if (ri !== rj) parent[rj] = ri;
    }
    for (var i = 0; i < notes.length; i += 1) {
      for (var j = i + 1; j < notes.length; j += 1) {
        if (electionRelation(notes[i], notes[j])) union(i, j);
      }
    }
    var clusters = {};
    notes.forEach(function (note, index) {
      var root = find(index);
      if (!clusters[root]) clusters[root] = [];
      clusters[root].push({ note: note, index: index });
    });
    return Object.keys(clusters).map(function (k) { return clusters[k]; });
  }

  function terminalKindForNote(note) {
    var blob = noteSourceBlob(note);
    var primaryBlob = notePrimaryElectionBlob(note) || blob;
    var fact = note && note.fact;
    if (isPaymentNoCollectText(blob)) return { kind: "paid", strength: 1000 };
    if (isCancelledRequestText(blob)) return { kind: "cancelled", strength: 920 };
    if (isInServiceOrNotOooText(blob)) return { kind: "in_service", strength: 900 };
    if (isFinalSetupText(blob)) return { kind: "final_setup", strength: 880 };
    if (isFinalAllocationText(blob) && /\bfinal\b/i.test(blob)) return { kind: "final_allocation", strength: 870 };
    if (isTerminalDoneText(blob) || (fact && fact.status === FACT_STATUS.done) ||
        (/\b(?:repaired|fixed|tested)\b/i.test(blob) &&
          /\b(?:working|resolved|complete|done|in\s+service)\b/i.test(blob) &&
          !/\bstill\s+open\b/i.test(blob))) {
      return { kind: "done", strength: 850 };
    }
    /*
     * Controlled/cleared hazard aftermath — stronger than open active danger,
     * but remains a current control obligation (not amenity/payment "done").
     * Use primary blob so sibling archive cannot flip active ↔ controlled.
     */
    if (isHazardControlOrClearanceText(primaryBlob)) {
      return { kind: "hazard_controlled", strength: 820 };
    }
    if (isHazardActiveOpenText(primaryBlob)) {
      return { kind: "open", strength: 200 };
    }
    if (fact && fact.status === FACT_STATUS.confirmed) return { kind: "confirmed", strength: 700 };
    if (isOooOrOpenMaintText(blob) || (fact && fact.status === FACT_STATUS.open)) {
      return { kind: "open", strength: 200 };
    }
    if (fact && fact.status === FACT_STATUS.requested) return { kind: "requested", strength: 180 };
    return { kind: "unknown", strength: FACT_STATUS_RANK[(fact && fact.status) || ""] || 10 };
  }

  function noteElectionSeq(note, fallbackIndex) {
    if (note && typeof note._seq === "number") return note._seq;
    return fallbackIndex;
  }

  function electionScore(note, index, facetSize, members) {
    var terminal = terminalKindForNote(note);
    var fact = note && note.fact;
    var blob = notePrimaryElectionBlob(note) || noteSourceBlob(note);
    var seq = noteElectionSeq(note, index);
    var score = terminal.strength;
    score += FACT_STATUS_RANK[(fact && fact.status) || ""] || 0;
    if (/\bfinal\b/i.test(blob)) score += 120;
    if (/\bupdate\b/i.test(blob)) score += 40;
    /* Later claims win ties — use source sequence, not post-consolidate array order. */
    score += (seq + 1) * 0.01;
    /* Prefer richer identity when electing among equals. */
    if (fact && fact.guestName) score += 2;
    if (fact && fact.rooms && fact.rooms.length) score += 1;
    if (facetSize === 1) score += 0;

    /*
     * Hazard lifecycle ordering within a cluster:
     * - later control/clearance demotes earlier active danger
     * - later active recurrence demotes earlier control (do not suppress reopen)
     */
    members = members || [];
    var controlled = isHazardControlOrClearanceText(blob);
    var activeOpen = isHazardActiveOpenText(blob);
    function memberSeq(m) {
      return noteElectionSeq(m && m.note, m && m.index);
    }
    function memberPrimary(m) {
      return notePrimaryElectionBlob(m && m.note) || noteSourceBlob(m && m.note);
    }
    if (controlled) {
      var laterActive = members.some(function (m) {
        if (!m || memberSeq(m) <= seq) return false;
        var b = memberPrimary(m);
        return isHazardActiveOpenText(b) && !isHazardControlOrClearanceText(b);
      });
      /* Must fall below later open-active (200) so recurrence can reopen. */
      if (laterActive) score -= 700;
      /* Prefer the latest control/clearance update over earlier UPDATE isolation lines. */
      var laterControl = members.some(function (m) {
        if (!m || memberSeq(m) <= seq) return false;
        return isHazardControlOrClearanceText(memberPrimary(m));
      });
      if (laterControl) score -= 80;
      /* Obligation-bearing aftermath outranks bare "unplugged/removed" progress notes. */
      if (/\b(?:remain(?:s)?\s+locked|do\s+not\s+restore|must\s+not\s+be\s+used|restrictions\s+remain|not\s+be\s+used)\b/.test(blob)) {
        score += 55;
      }
      if (/\b(?:area\s+safe|no\s+fire)\b/.test(blob)) score += 25;
    } else if (activeOpen) {
      var laterControlForActive = members.some(function (m) {
        if (!m || memberSeq(m) <= seq) return false;
        return isHazardControlOrClearanceText(memberPrimary(m));
      });
      if (laterControlForActive) score -= 600;
      else {
        var earlierControl = members.some(function (m) {
          if (!m || memberSeq(m) >= seq) return false;
          return isHazardControlOrClearanceText(memberPrimary(m));
        });
        /* Later recurrence after clearance — reopen as current active danger. */
        if (earlierControl) score += 650;
      }
    }
    return score;
  }

  function applyTerminalToWinner(note, terminal) {
    if (!note || !note.fact || !terminal) return;
    var fact = note.fact;
    fact.currentState = true;
    fact.superseded = false;
    note._currentState = true;
    note._superseded = false;
    if (terminal.kind === "paid" || terminal.kind === "done" || terminal.kind === "cancelled" ||
        terminal.kind === "in_service") {
      fact.status = FACT_STATUS.done;
      if (note.section !== "completed" &&
          (terminal.kind === "paid" || terminal.kind === "cancelled" || terminal.kind === "done")) {
        /* Keep maintenance in-service visible as maintenance/completed rather than open chase. */
        if (terminal.kind === "in_service") {
          note.section = note.section === "maintenance" ? "maintenance" : (note.section || "general");
        } else if (terminal.kind === "paid") {
          note.section = "payments";
        } else {
          note.section = "completed";
        }
      }
    }
    if (terminal.kind === "final_setup") {
      fact.status = FACT_STATUS.confirmed;
      fact.subject = fact.subject === "twin_setup" ? "guest_preparation" : fact.subject;
      fact.requestItem = fact.requestItem && /twin/i.test(fact.requestItem) ? "" : fact.requestItem;
    }
    if (terminal.kind === "final_allocation") {
      fact.status = FACT_STATUS.confirmed;
    }
    if (terminal.kind === "paid") {
      fact.paymentCollectable = false;
      fact.paymentNoCollect = true;
    }
    if (terminal.kind === "hazard_controlled") {
      /*
       * Keep actionable for remaining control obligations (locked cupboard /
       * do not restore / monitor OOO). Do not mark completed/done — that would
       * erase the control task while correctly retiring the old active danger.
       */
      fact.status = FACT_STATUS.open;
      fact.hazardLifecycle = "controlled";
      if (!note.section || note.section === "general" || note.section === "tasks") {
        note.section = "maintenance";
      }
    }
    fact.sectionHint = note.section || fact.sectionHint;
  }

  function markNoteSuperseded(note, winnerNote, reason) {
    if (!note) return;
    note._superseded = true;
    note._currentState = false;
    note._supersededReason = reason || "superseded_by_current_state";
    if (note.fact) {
      note.fact.superseded = true;
      note.fact.currentState = false;
      note.fact.supersededReason = note._supersededReason;
      if (winnerNote && winnerNote.fact) {
        note.fact.supersededBy = factIdentityKey(winnerNote.fact) || winnerNote.original || "";
      }
    }
    /* Preserve source archive on the note for traceability. */
    note._historicalSource = note.original || (note.fact && note.fact.sourceText) || "";
  }

  function isNoteSuperseded(note) {
    if (!note) return false;
    if (note._superseded) return true;
    if (note.fact && note.fact.superseded) return true;
    return false;
  }

  function isNoteCurrentState(note) {
    if (!note || isNoteSuperseded(note)) return false;
    if (note._currentState) return true;
    if (note.fact && note.fact.currentState) return true;
    /* Untouched notes remain actionable until election marks otherwise. */
    return true;
  }

  function isPaymentNoCollectState(fact, note) {
    if (fact && fact.paymentNoCollect) return true;
    if (fact && fact.paymentCollectable === false && fact.status === FACT_STATUS.done) return true;
    var blob = noteSourceBlob(note || { fact: fact, original: (fact && fact.sourceText) || "" });
    if (isPaymentNoCollectText(blob)) return true;
    if (fact && isZeroMoneyText(JSON.stringify(fact.details || []) + " " + (fact.sourceText || ""))) {
      if (!isPaymentExemptFromNoCollect(blob)) return true;
    }
    return false;
  }

  /* ─── Reasoning Sprint 3 — operational entity resolution ───────────────
   * Smallest practical identity layer for handover reasoning.
   * Core principle: FALSE MERGE > MISSED MERGE — fail closed on ambiguity.
   * Does NOT use Shift guestsMatch (last-token) as merge authority.
   * Entity shape: { entityId, canonicalName, currentRoom, roomHistory,
   *   resolutionState, identityEvidence }
   */

  var _operationalEntitySeq = 0;

  function normalizePersonNameTokens(raw) {
    var s = String(raw || "")
      .toLowerCase()
      .replace(/[’']/g, "")
      .replace(/\b(mr|mrs|ms|miss|dr)\.?\b/g, " ")
      .replace(/[^a-z\s-]/g, " ")
      .replace(/-/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return s ? s.split(" ").filter(Boolean) : [];
  }

  function personNameParts(raw) {
    var tokens = normalizePersonNameTokens(raw);
    if (!tokens.length) return { first: "", last: "", full: "", tokenCount: 0 };
    if (tokens.length === 1) {
      return { first: "", last: tokens[0], full: tokens[0], tokenCount: 1 };
    }
    return {
      first: tokens[0],
      last: tokens[tokens.length - 1],
      full: tokens.join(" "),
      tokenCount: tokens.length
    };
  }

  function extractBookingRefs(text) {
    var t = String(text || "");
    var out = [];
    var re = /\b(?:HF|BK|REF|RES)[- ]?[A-Z0-9]{3,}\b/gi;
    var m;
    while ((m = re.exec(t))) {
      var id = String(m[0] || "").toUpperCase().replace(/\s+/g, "").replace(/-+/g, "-");
      if (id && out.indexOf(id) === -1) out.push(id);
    }
    var refM = t.match(/\bbooking\s+(?:ref(?:erence)?|id)\s*[:#]?\s*([A-Z0-9-]{4,})\b/i);
    if (refM && refM[1]) {
      var bid = String(refM[1]).toUpperCase();
      if (out.indexOf(bid) === -1) out.push(bid);
    }
    return out;
  }

  function extractExplicitRoomMove(text, rooms) {
    var t = String(text || "");
    var dest = "";
    var from = "";
    /* Prefer explicit from→to forms so "moved 214 > 318" is not read as dest=214. */
    var fromTo = t.match(
      /\b(?:moved|move|relocated|reallocated)\s+from\s+(?:rm\.?|room\s*)?(\d{1,4}[a-z]?)\s+to\s+(?:rm\.?|room\s*)?(\d{1,4}[a-z]?)\b/i
    );
    if (fromTo) {
      from = String(fromTo[1] || "").toLowerCase();
      dest = String(fromTo[2] || "").toLowerCase();
      return { fromRoom: from, toRoom: dest };
    }
    var arrow = t.match(/\b(?:rm\.?|room\s*)?(\d{1,4}[a-z]?)\s*[>→]\s*(?:rm\.?|room\s*)?(\d{1,4}[a-z]?)\b/i);
    if (arrow) {
      from = String(arrow[1] || "").toLowerCase();
      dest = String(arrow[2] || "").toLowerCase();
      return { fromRoom: from, toRoom: dest };
    }
    var toM = t.match(
      /\b(?:moved|move|relocated|reallocated|FINAL\s+(?:room\s+)?allocation|FINAL\s+room|allocation\s+changed(?:\s+to)?|now\s+in(?:\s+room)?|now\s+rm\.?)\s+(?:to\s+|changed\s+to\s+)?(?:rm\.?|room\s*)?(\d{1,4}[a-z]?)\b/i
    );
    if (toM) dest = String(toM[1] || "").toLowerCase() || dest;
    var fromM = t.match(
      /\b(?:from|was(?:\s+in)?|previously(?:\s+in)?|original(?:ly)?(?:\s+allocated)?(?:\s+to)?|old(?:\s+room)?)\s+(?:rm\.?|room\s*)?(\d{1,4}[a-z]?)\b/i
    );
    if (fromM) from = String(fromM[1] || "").toLowerCase() || from;
    if (!dest && Array.isArray(rooms) && rooms.length &&
        /\b(?:moved|FINAL\s+room|FINAL\s+allocation|reallocated|allocation\s+changed)\b/i.test(t)) {
      dest = String(rooms[rooms.length - 1] || "").toLowerCase();
    }
    if (!dest || (from && dest === from)) return null;
    return { fromRoom: from || "", toRoom: dest };
  }

  function isBogusGuestToken(raw) {
    var p = personNameParts(raw);
    if (!p.full) return true;
    var stop = /^(final|update|room|guest|vip|mr|mrs|ms|dr|latest|today|please|hold|keep|extra|quiet|high|city|front|duty|main|lift|area|fire|water|smoke|staff|night|audit|manager|supervisor|original|allocation|confirmed|requested|arrival|departure|champagne|delivered|welcome|card|twin|double|feather|free|pillows|newspaper|maintenance|follow)$/i;
    if (stop.test(p.full)) return true;
    if (p.first && stop.test(p.first)) return true;
    if (p.last && stop.test(p.last)) return true;
    return false;
  }

  function textLooksLikeStaffIdentity(text) {
    var t = String(text || "");
    return /\b(?:staff\s+member|from\s+maintenance|maintenance\s+(?:inspected|confirmed|engineer)|night\s+manager|duty\s+manager)\b/i.test(t) &&
      !/\b(?:vip|arrival|depart|eta|guest)\b/i.test(t);
  }

  function extractGuestRawFromText(text) {
    var cleaned = String(text || "")
      .replace(/\b(?:this\s+is\s+)?not\s+(?:related\s+to\s+)?(?:mr|mrs|ms|miss|dr)?\.?\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/gi, " ")
      .replace(/\bnot\s+(?:the\s+)?(?:arriving|departing)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/gi, " ");
    var skip = /^(Room|Wake|Hot|Air|Twin|Final|Update|Guest|Today|Please|House|Night|Early|Later|Keep|Hold|Extra|Quiet|High|City|Front|Duty|Main|Lift|Area|Fire|Water|Smoke|Staff)$/i;
    var titleFull = cleaned.match(/\b(?:Mr|Mrs|Ms|Miss|Dr)\.?\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)\b/);
    if (titleFull && !skip.test(titleFull[1])) {
      return titleFull[0];
    }
    var fullRe = /\b([A-Z][a-z]+)\s+([A-Z][a-z]+)\b/g;
    var m;
    while ((m = fullRe.exec(cleaned))) {
      if (skip.test(m[1]) || skip.test(m[2])) continue;
      return m[1] + " " + m[2];
    }
    var titleSur = cleaned.match(/\b(?:Mr|Mrs|Ms|Miss|Dr)\.?\s+([A-Z][a-z]+)\b/);
    if (titleSur && !skip.test(titleSur[1])) return titleSur[0];
    var bareSur = cleaned.match(/\b([A-Z][a-z]+)\s+moved\b/);
    if (bareSur && !skip.test(bareSur[1])) return bareSur[1];
    return "";
  }

  function noteIdentitySignals(note) {
    var fact = note && note.fact ? note.fact : null;
    var text = noteSourceBlob(note);
    var guestRaw = "";
    if (fact && fact.guestName && !isBogusGuestToken(fact.guestName)) {
      guestRaw = String(fact.guestName);
    } else if (note && note.guestName && !isBogusGuestToken(note.guestName)) {
      guestRaw = String(note.guestName);
    }
    var parts = personNameParts(guestRaw);
    if (isBogusGuestToken(guestRaw)) {
      guestRaw = "";
      parts = { first: "", last: "", full: "", tokenCount: 0 };
    }
    var fromText = extractGuestRawFromText(text);
    var textParts = personNameParts(fromText);
    if (fromText && !isBogusGuestToken(fromText) && textParts.tokenCount > parts.tokenCount) {
      guestRaw = fromText;
      parts = textParts;
    } else if (parts.tokenCount < 2 && fromText && !isBogusGuestToken(fromText) && textParts.tokenCount >= 1) {
      guestRaw = fromText || guestRaw;
      parts = textParts;
    }
    /* Negated name mentions must not seed or attach identity */
    if (parts.full && parts.tokenCount >= 2) {
      var escFull = parts.full.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
      var nameNegated =
        new RegExp(
          "\\b(?:this\\s+is\\s+)?not\\s+(?:related\\s+to\\s+)?(?:mr|mrs|ms|miss|dr)?\\.?\\s*" + escFull,
          "i"
        ).test(text) ||
        new RegExp(
          "\\bnot\\s+(?:the\\s+)?(?:arriving|departing|same)\\s+(?:mr|mrs|ms|miss|dr)?\\.?\\s*" + escFull,
          "i"
        ).test(text) ||
        new RegExp(
          "\\bnot\\s+(?:the\\s+)?" + escFull,
          "i"
        ).test(text);
      if (nameNegated) {
        /* Keep only a positive name mention elsewhere in the note, if any */
        var positive = extractGuestRawFromText(text);
        if (positive && !isBogusGuestToken(positive) &&
            personNameParts(positive).full !== parts.full) {
          guestRaw = positive;
          parts = personNameParts(positive);
        } else if (positive && personNameParts(positive).full === parts.full) {
          guestRaw = "";
          parts = { first: "", last: "", full: "", tokenCount: 0 };
        } else {
          guestRaw = "";
          parts = { first: "", last: "", full: "", tokenCount: 0 };
        }
      }
    }
    var rooms = noteRooms(note).map(function (r) { return String(r || "").toLowerCase(); });
    var move = extractExplicitRoomMove(text, rooms);
    if (fact && fact.details) {
      var destDetail = null;
      if (Array.isArray(fact.details)) {
        fact.details.forEach(function (d) {
          if (d && (d.type === "destination_room" || d.key === "destination_room") && d.value != null) {
            destDetail = String(d.value).toLowerCase();
          }
        });
      } else if (fact.details.destination_room) {
        destDetail = String(fact.details.destination_room).toLowerCase();
      }
      if (destDetail) {
        move = move || { fromRoom: "", toRoom: destDetail };
        move.toRoom = destDetail;
        if (rooms.indexOf(destDetail) === -1) rooms.push(destDetail);
      }
    }
    if (move && move.fromRoom && rooms.indexOf(move.fromRoom) === -1) rooms.push(move.fromRoom);
    if (move && move.toRoom && rooms.indexOf(move.toRoom) === -1) rooms.push(move.toRoom);
    var refs = extractBookingRefs(text);
    var staff = textLooksLikeStaffIdentity(text);
    var doNotMerge = /\b(?:do\s+not\s+merge|not\s+the\s+(?:same|arriving|departing)|different\s+(?:guest|person)|not\s+the\s+\w+\s+in\s+room|not\s+related\s+to)\b/i.test(text);
    return {
      guestRaw: guestRaw,
      parts: parts,
      rooms: rooms,
      move: move,
      bookingRefs: refs,
      staff: staff,
      doNotMerge: doNotMerge,
      text: text,
      note: note
    };
  }

  function createOperationalEntity(seed) {
    var id = "ent_" + String(++_operationalEntitySeq);
    return {
      entityId: id,
      canonicalName: seed.canonicalName || "",
      currentRoom: seed.currentRoom || "",
      roomHistory: Array.isArray(seed.roomHistory) ? seed.roomHistory.slice() : [],
      resolutionState: seed.resolutionState || "resolved",
      identityEvidence: Array.isArray(seed.identityEvidence) ? seed.identityEvidence.slice() : [],
      entityKind: seed.entityKind || "guest",
      nameParts: seed.nameParts || { first: "", last: "", full: "", tokenCount: 0 },
      bookingRefs: Array.isArray(seed.bookingRefs) ? seed.bookingRefs.slice() : [],
      noteIds: []
    };
  }

  function entityAddRoom(entity, room, asCurrent) {
    if (!entity || !room) return;
    var r = String(room).toLowerCase();
    if (!r) return;
    if (asCurrent) {
      if (entity.currentRoom && entity.currentRoom !== r &&
          entity.roomHistory.indexOf(entity.currentRoom) === -1) {
        entity.roomHistory.push(entity.currentRoom);
      }
      entity.currentRoom = r;
    }
    if (entity.roomHistory.indexOf(r) === -1) entity.roomHistory.push(r);
    if (!entity.currentRoom) entity.currentRoom = r;
  }

  function entityAddEvidence(entity, code) {
    if (!entity || !code) return;
    if (entity.identityEvidence.indexOf(code) === -1) entity.identityEvidence.push(code);
  }

  function activeEntities(entities) {
    return (entities || []).filter(function (e) {
      return e && e.resolutionState !== "merged";
    });
  }

  function roomsOverlapEntity(entity, rooms) {
    if (!entity || !rooms || !rooms.length) return false;
    return rooms.some(function (r) {
      return r === entity.currentRoom || (entity.roomHistory && entity.roomHistory.indexOf(r) !== -1);
    });
  }

  function applySignalRoomsToEntity(entity, sig) {
    if (!entity || !sig) return;
    (sig.bookingRefs || []).forEach(function (r) {
      if (entity.bookingRefs.indexOf(r) === -1) entity.bookingRefs.push(r);
      entityAddEvidence(entity, "booking_ref");
    });
    if (sig.parts.tokenCount >= 2 && (!entity.nameParts || entity.nameParts.tokenCount < 2)) {
      entity.nameParts = sig.parts;
      entity.canonicalName = sig.guestRaw || sig.parts.full;
    }
    if (sig.parts.tokenCount >= 2 && entity.nameParts && entity.nameParts.full === sig.parts.full) {
      entityAddEvidence(entity, "exact_full_name");
    }
    if (sig.move && sig.move.toRoom) {
      if (sig.move.fromRoom) entityAddRoom(entity, sig.move.fromRoom, false);
      else if (entity.currentRoom && entity.currentRoom !== sig.move.toRoom) {
        entityAddRoom(entity, entity.currentRoom, false);
      }
      entityAddRoom(entity, sig.move.toRoom, true);
      entityAddEvidence(entity, "explicit_room_move");
    } else if (sig.rooms && sig.rooms.length) {
      if (!entity.currentRoom) entityAddRoom(entity, sig.rooms[0], true);
      else {
        sig.rooms.forEach(function (r) {
          if (r === entity.currentRoom) entityAddRoom(entity, r, true);
          else if (entity.roomHistory.indexOf(r) === -1) entityAddRoom(entity, r, false);
        });
      }
    }
  }

  /**
   * Decide merge strength of a note signal against an entity.
   * Returns "strong" | "medium" | "" (no merge).
   * Weak signals (first name only, VIP, fuzzy spelling) never return a strength.
   */
  function mergeEvidenceAgainstEntity(sig, entity, live, mode) {
    if (!sig || !entity) return "";
    if (sig.doNotMerge && !(sig.parts.tokenCount >= 2 && entity.nameParts &&
        entity.nameParts.full === sig.parts.full)) {
      /* Negation blocks weak/medium links; strong same-full-name still allowed when rooms fit */
      if (mode !== "strong" && mode !== "all") return "";
    }
    if (entity.entityKind === "staff" || sig.staff) {
      if (entity.entityKind === "staff" && sig.staff) {
        if (sig.parts.full && entity.nameParts.full && sig.parts.full === entity.nameParts.full) {
          return "strong";
        }
      }
      return "";
    }

    var parts = sig.parts || {};
    var ep = entity.nameParts || {};
    var allowMedium = mode === "medium" || mode === "all";
    var allowStrong = mode === "strong" || mode === "all";

    /* Strong: booking/reference match */
    if (allowStrong && sig.bookingRefs && sig.bookingRefs.length && entity.bookingRefs.length) {
      for (var bi = 0; bi < sig.bookingRefs.length; bi++) {
        if (entity.bookingRefs.indexOf(sig.bookingRefs[bi]) !== -1) return "strong";
      }
    }

    /* Distinct full names — never merge */
    if (parts.full && ep.full && parts.tokenCount >= 2 && ep.tokenCount >= 2 && parts.full !== ep.full) {
      return "";
    }
    if (parts.first && ep.first && parts.first === ep.first &&
        parts.last && ep.last && parts.last !== ep.last) {
      return "";
    }
    if (parts.last && ep.last && parts.last === ep.last &&
        parts.first && ep.first && parts.first !== ep.first) {
      return "";
    }

    /* Strong: exact normalized full name + room / move / roomless continuity */
    if (allowStrong && parts.full && ep.full && parts.full === ep.full && parts.tokenCount >= 2) {
      if (sig.move && sig.move.toRoom) return "strong";
      if (roomsOverlapEntity(entity, sig.rooms || [])) return "strong";
      if (!entity.currentRoom || !(sig.rooms && sig.rooms.length)) return "strong";
      return "";
    }

    if (!allowMedium) return "";

    /* Medium/strong-ish: surname + explicit move from a room with one matching occupant */
    if (parts.last && sig.move && sig.move.fromRoom) {
      var fromPeers = live.filter(function (e) {
        return e.entityKind !== "staff" && e.currentRoom === sig.move.fromRoom &&
          e.nameParts && e.nameParts.last === parts.last;
      });
      if (fromPeers.length === 1 && fromPeers[0].entityId === entity.entityId) {
        if (!parts.first || !entity.nameParts.first || parts.first === entity.nameParts.first) {
          return "strong";
        }
      }
    }

    /* Medium: surname/title + exactly one compatible known guest — REQUIRES room overlap */
    if (parts.last && parts.tokenCount === 1 && ep.last && parts.last === ep.last) {
      var surnamePeers = live.filter(function (e) {
        return e.entityKind !== "staff" && e.nameParts && e.nameParts.last === parts.last;
      });
      if (surnamePeers.length === 1 && surnamePeers[0].entityId === entity.entityId) {
        if (roomsOverlapEntity(entity, sig.rooms || []) ||
            (sig.move && roomsOverlapEntity(entity, [sig.move.fromRoom, sig.move.toRoom].filter(Boolean)))) {
          return "medium";
        }
      }
      return "";
    }

    /* Medium: room-only + exactly one known current occupant */
    if (parts.tokenCount < 2 && sig.rooms && sig.rooms.length === 1 && !sig.move) {
      var room = sig.rooms[0];
      var occ = live.filter(function (e) {
        return e.entityKind !== "staff" && e.currentRoom === room;
      });
      if (occ.length === 1 && occ[0].entityId === entity.entityId) return "medium";
      return "";
    }

    /* Medium: partial name + room + unique compatible chronology */
    if (parts.last && ep.last && parts.last === ep.last && sig.rooms && sig.rooms.length &&
        roomsOverlapEntity(entity, sig.rooms)) {
      if (parts.first && ep.first && parts.first !== ep.first) return "";
      var peers = live.filter(function (e) {
        return e.entityKind !== "staff" && e.nameParts && e.nameParts.last === parts.last &&
          roomsOverlapEntity(e, sig.rooms);
      });
      if (peers.length === 1 && peers[0].entityId === entity.entityId) return "medium";
    }

    return "";
  }

  function attachEntityToNote(note, entity, evidenceExtra) {
    if (!note || !entity) return;
    var nid = note.id != null ? String(note.id) : "";
    if (nid && entity.noteIds.indexOf(nid) === -1) entity.noteIds.push(nid);
    if (evidenceExtra) entityAddEvidence(entity, evidenceExtra);
    note.entityId = entity.entityId;
    note.canonicalName = entity.canonicalName || "";
    note.currentRoom = entity.currentRoom || "";
    note.roomHistory = entity.roomHistory.slice();
    note.resolutionState = entity.resolutionState || "resolved";
    note.identityEvidence = (entity.identityEvidence || []).slice();
    note.operationalEntity = {
      entityId: entity.entityId,
      canonicalName: entity.canonicalName,
      currentRoom: entity.currentRoom,
      roomHistory: entity.roomHistory.slice(),
      resolutionState: entity.resolutionState,
      identityEvidence: note.identityEvidence.slice()
    };
    var fact = note.fact;
    if (fact) {
      fact.entityId = entity.entityId;
      fact.canonicalName = entity.canonicalName;
      fact.currentRoom = entity.currentRoom;
      fact.roomHistory = entity.roomHistory.slice();
      fact.resolutionState = entity.resolutionState;
      fact.identityEvidence = note.identityEvidence.slice();
      /*
       * Do not invent guestName on room-only notes — that poisons re-resolve
       * (sole-occupant notes would look like strong full-name matches).
       */
      if (entity.canonicalName) {
        var ownName = extractGuestRawFromText(noteSourceBlob(note));
        var fg = personNameParts(fact.guestName || "");
        if (ownName && !isBogusGuestToken(ownName)) {
          if (!fg.full || fg.tokenCount < 2 || fg.full === entity.nameParts.full || isBogusGuestToken(fact.guestName)) {
            fact.guestName = entity.canonicalName;
          }
        } else if (fg.full && fg.tokenCount >= 2 && fg.full === entity.nameParts.full) {
          fact.guestName = entity.canonicalName;
        }
      }
      if (entity.currentRoom) {
        var cr = entity.currentRoom;
        var existing = Array.isArray(fact.rooms) ? fact.rooms.map(function (r) {
          return String(r || "").toLowerCase();
        }) : [];
        var next = [cr].concat(existing.filter(function (r) { return r && r !== cr; }));
        (entity.roomHistory || []).forEach(function (r) {
          if (r && next.indexOf(r) === -1) next.push(r);
        });
        fact.rooms = next;
      }
    }
  }

  function markNoteUnresolved(note, state, evidence) {
    note.entityId = null;
    note.resolutionState = state || "unresolved";
    note.identityEvidence = [evidence || "fail_closed_ambiguous"];
    if (note.currentRoom == null && note.fact && note.fact.rooms && note.fact.rooms[0]) {
      note.currentRoom = String(note.fact.rooms[0]).toLowerCase();
    }
    if (note.fact) {
      note.fact.entityId = null;
      note.fact.resolutionState = note.resolutionState;
      note.fact.identityEvidence = note.identityEvidence.slice();
      if (note.currentRoom) note.fact.currentRoom = note.currentRoom;
    }
  }

  function collectCandidates(sig, live, mode) {
    var candidates = [];
    var seen = {};
    live.forEach(function (ent) {
      var strength = mergeEvidenceAgainstEntity(sig, ent, live, mode);
      if (!strength) return;
      if (mode === "strong" && strength !== "strong") return;
      if (seen[ent.entityId]) {
        if (strength === "strong") {
          for (var i = 0; i < candidates.length; i++) {
            if (candidates[i].entity.entityId === ent.entityId) candidates[i].strength = "strong";
          }
        }
        return;
      }
      seen[ent.entityId] = true;
      candidates.push({ entity: ent, strength: strength });
    });
    return candidates;
  }

  function chooseUniqueCandidate(candidates) {
    var strong = candidates.filter(function (c) { return c.strength === "strong"; });
    var medium = candidates.filter(function (c) { return c.strength === "medium"; });
    if (strong.length === 1) return { entity: strong[0].entity, evidence: "strong_identity" };
    if (strong.length > 1) return null;
    if (medium.length === 1) return { entity: medium[0].entity, evidence: "medium_unique" };
    return null;
  }

  /**
   * Resolve operational guest/room entities across analyzed notes.
   * Two-phase: seed/merge strong full-name & booking evidence first, then
   * medium unique attachments. Fail closed on ambiguity.
   */
  function resolveOperationalEntities(analyzed) {
    var notes = Array.isArray(analyzed) ? analyzed : [];
    if (!notes.length) return notes;
    if (notes._operationalEntitiesResolved) return notes;

    _operationalEntitySeq = 0;
    var entities = [];

    var ordered = notes.map(function (n, idx) {
      if (!n.fact && n.original) {
        n.fact = extractOperationalFact(n.original, {
          rooms: n.rooms,
          section: n.section,
          isVip: n.isVip
        });
      }
      if (n._seq == null) n._seq = idx;
      return { note: n, idx: idx, seq: n._seq, sig: noteIdentitySignals(n) };
    }).sort(function (a, b) { return a.seq - b.seq; });

    /* Phase 1 — strong identity only (full name / booking / explicit named move) */
    ordered.forEach(function (item) {
      var note = item.note;
      var sig = item.sig;
      var live = activeEntities(entities);
      var strongCapable = (sig.parts.tokenCount >= 2) || (sig.bookingRefs && sig.bookingRefs.length);
      if (!strongCapable) return;

      var chosenWrap = chooseUniqueCandidate(collectCandidates(sig, live, "strong"));
      if (chosenWrap) {
        applySignalRoomsToEntity(chosenWrap.entity, sig);
        entityAddEvidence(chosenWrap.entity, chosenWrap.evidence);
        attachEntityToNote(note, chosenWrap.entity, null);
        return;
      }

      if (sig.staff) {
        var staffEnt = createOperationalEntity({
          canonicalName: sig.guestRaw || sig.parts.full || "",
          nameParts: sig.parts,
          currentRoom: "",
          roomHistory: [],
          resolutionState: "resolved",
          identityEvidence: ["staff_identity"],
          entityKind: "staff"
        });
        entities.push(staffEnt);
        attachEntityToNote(note, staffEnt, null);
        return;
      }

      /* Same full name + conflicting room without move → separate entity (new stay) */
      var seedRoom = (sig.move && sig.move.toRoom) || (sig.rooms && sig.rooms[0]) || "";
      var seeded = createOperationalEntity({
        canonicalName: sig.guestRaw || sig.parts.full || "",
        nameParts: sig.parts,
        currentRoom: seedRoom,
        roomHistory: seedRoom ? [seedRoom] : [],
        resolutionState: "resolved",
        identityEvidence: sig.parts.tokenCount >= 2 ? ["seed_full_name"] : ["seed_booking_ref"],
        bookingRefs: sig.bookingRefs,
        entityKind: "guest"
      });
      if (sig.move && sig.move.fromRoom) entityAddRoom(seeded, sig.move.fromRoom, false);
      if (sig.move && sig.move.toRoom) entityAddRoom(seeded, sig.move.toRoom, true);
      if (sig.rooms) {
        sig.rooms.forEach(function (r) {
          if (r !== seeded.currentRoom) entityAddRoom(seeded, r, false);
        });
      }
      entities.push(seeded);
      attachEntityToNote(note, seeded, null);
    });

    /* Phase 2 — medium unique attachments + remaining notes */
    ordered.forEach(function (item) {
      var note = item.note;
      if (note.entityId) return;
      var sig = noteIdentitySignals(note); /* refresh after phase-1 room moves */
      item.sig = sig;
      var live = activeEntities(entities);

      var hasIdentity = (sig.parts.tokenCount >= 1) || (sig.rooms && sig.rooms.length) ||
        (sig.bookingRefs && sig.bookingRefs.length) || sig.move;
      if (!hasIdentity) {
        markNoteUnresolved(note, "unresolved", "no_identity_signal");
        return;
      }

      /* Explicit do-not-merge / negation notes stay unresolved or room-based */
      if (sig.doNotMerge && sig.parts.tokenCount < 2) {
        if (sig.rooms && sig.rooms.length === 1) {
          markNoteUnresolved(note, "room_based", "fail_closed_do_not_merge");
          note.currentRoom = sig.rooms[0];
        } else {
          markNoteUnresolved(note, "unresolved", "fail_closed_do_not_merge");
        }
        return;
      }

      var chosenWrap = chooseUniqueCandidate(collectCandidates(sig, live, "all"));
      if (chosenWrap) {
        applySignalRoomsToEntity(chosenWrap.entity, sig);
        entityAddEvidence(chosenWrap.entity, chosenWrap.evidence);
        attachEntityToNote(note, chosenWrap.entity,
          chosenWrap.evidence === "medium_unique" && sig.parts.tokenCount < 2 && sig.rooms.length === 1
            ? "sole_occupant_room"
            : null);
        return;
      }

      if (sig.parts.last && sig.parts.tokenCount === 1 && !sig.staff) {
        var surnameCount = live.filter(function (e) {
          return e.entityKind !== "staff" && e.nameParts && e.nameParts.last === sig.parts.last;
        }).length;
        if (surnameCount > 1 || !sig.rooms.length) {
          markNoteUnresolved(note, "unresolved", "fail_closed_ambiguous_surname");
          if (sig.rooms[0]) note.currentRoom = sig.rooms[0];
          return;
        }
      }

      if (sig.parts.tokenCount < 2 && sig.rooms && sig.rooms.length === 1) {
        var occCount = live.filter(function (e) {
          return e.entityKind !== "staff" && e.currentRoom === sig.rooms[0];
        }).length;
        if (occCount > 1) {
          markNoteUnresolved(note, "room_based", "fail_closed_multi_occupant_room");
          note.currentRoom = sig.rooms[0];
          if (note.fact) note.fact.currentRoom = sig.rooms[0];
          return;
        }
      }

      if (sig.staff) {
        var staffEnt2 = createOperationalEntity({
          canonicalName: sig.guestRaw || sig.parts.full || "",
          nameParts: sig.parts,
          currentRoom: "",
          roomHistory: [],
          resolutionState: "resolved",
          identityEvidence: ["staff_identity"],
          entityKind: "staff"
        });
        entities.push(staffEnt2);
        attachEntityToNote(note, staffEnt2, null);
        return;
      }

      if (sig.parts.last && sig.rooms && sig.rooms.length === 1) {
        var peers = live.filter(function (e) {
          return e.entityKind !== "staff" && e.nameParts && e.nameParts.last === sig.parts.last;
        });
        if (peers.length === 0) {
          var surSeed = createOperationalEntity({
            canonicalName: sig.guestRaw || sig.parts.last,
            nameParts: sig.parts,
            currentRoom: sig.rooms[0],
            roomHistory: [sig.rooms[0]],
            resolutionState: "resolved",
            identityEvidence: ["seed_surname_room"],
            entityKind: "guest"
          });
          entities.push(surSeed);
          attachEntityToNote(note, surSeed, null);
          return;
        }
        markNoteUnresolved(note, "unresolved", "fail_closed_ambiguous_surname");
        note.currentRoom = sig.rooms[0];
        return;
      }

      if (sig.rooms && sig.rooms.length === 1 && sig.parts.tokenCount < 2) {
        markNoteUnresolved(note, "room_based", "room_only");
        note.currentRoom = sig.rooms[0];
        if (note.fact) note.fact.currentRoom = sig.rooms[0];
        return;
      }

      markNoteUnresolved(note, "unresolved", "unresolved_identity");
    });

    /* Phase 3 — sole-occupant room attachment for leftover room_only notes */
    var live2 = activeEntities(entities).filter(function (e) { return e.entityKind !== "staff"; });
    notes.forEach(function (note) {
      if (note.entityId) return;
      if (note.identityEvidence && (
        note.identityEvidence.indexOf("fail_closed_ambiguous_surname") !== -1 ||
        note.identityEvidence.indexOf("fail_closed_do_not_merge") !== -1
      )) {
        return;
      }
      var sig = noteIdentitySignals(note);
      if (sig.parts.tokenCount >= 2 || sig.staff || sig.doNotMerge) return;
      if (!(sig.rooms && sig.rooms.length === 1)) return;
      var room = sig.rooms[0];
      var occ = live2.filter(function (e) { return e.currentRoom === room; });
      if (occ.length !== 1) return;
      attachEntityToNote(note, occ[0], "sole_occupant_room");
    });

    var byId = {};
    activeEntities(entities).forEach(function (e) { byId[e.entityId] = e; });
    notes.forEach(function (note) {
      if (!note.entityId || !byId[note.entityId]) return;
      attachEntityToNote(note, byId[note.entityId], null);
    });

    notes._operationalEntitiesResolved = true;
    notes._operationalEntities = activeEntities(entities);
    return notes;
  }

  /**
   * Elect one authoritative CURRENT state per operational facet.
   * Mutates notes in place; returns the same array reference.
   * Historical text remains on superseded notes; decision surfaces must ignore them.
   * Sprint 3: resolveOperationalEntities runs first (shared identity authority).
   */
  function electCanonicalCurrentState(analyzed) {
    var notes = (analyzed || []).filter(Boolean);
    if (!notes.length) return analyzed || [];

    /* Preserve prior resolve flag across filter() (new array wrapper). */
    if (analyzed && analyzed._operationalEntitiesResolved) {
      notes._operationalEntitiesResolved = true;
      notes._operationalEntities = analyzed._operationalEntities;
    }
    resolveOperationalEntities(notes);

    /* Reset prior election flags (idempotent re-runs). */
    /* Reset prior election flags (idempotent re-runs). */
    notes.forEach(function (note, idx) {
      if (note._seq == null) note._seq = idx;
      note._superseded = false;
      note._currentState = false;
      note._supersededReason = "";
      if (note.fact) {
        note.fact.superseded = false;
        note.fact.currentState = false;
        note.fact.supersededReason = "";
        note.fact.supersededBy = "";
      }
    });

    notes.forEach(function (note) {
      if (!note.fact && note.original) {
        note.fact = extractOperationalFact(note.original, {
          rooms: note.rooms,
          section: note.section,
          isVip: note.isVip
        });
      }
    });

    enrichElectionIdentity(notes);

    var clusters = clusterNotesForElection(notes);
    clusters.forEach(function (members) {
      if (!members.length) return;

      /* Ambiguous multi-guest cluster — fail closed, do not supersede across people. */
      var named = {};
      members.forEach(function (m) {
        var g = noteGuest(m.note);
        if (g) named[g] = true;
      });
      if (Object.keys(named).length > 1) {
        members.forEach(function (m) {
          m.note._currentState = true;
          if (m.note.fact) m.note.fact.currentState = true;
        });
        return;
      }

      if (members.length === 1) {
        var only = members[0].note;
        var onlyTerminal = terminalKindForNote(only);
        only._currentState = true;
        if (only.fact) only.fact.currentState = true;
        if (onlyTerminal.kind === "paid" || onlyTerminal.kind === "cancelled" ||
            onlyTerminal.kind === "done" || onlyTerminal.kind === "in_service" ||
            onlyTerminal.kind === "final_setup" || onlyTerminal.kind === "final_allocation" ||
            onlyTerminal.kind === "hazard_controlled") {
          applyTerminalToWinner(only, onlyTerminal);
        }
        return;
      }

      var best = null;
      var bestScore = -1;
      members.forEach(function (m) {
        var score = electionScore(m.note, m.index, members.length, members);
        if (score > bestScore) {
          bestScore = score;
          best = m;
        }
      });
      if (!best) return;

      var winnerTerminal = terminalKindForNote(best.note);
      applyTerminalToWinner(best.note, winnerTerminal);
      best.note._currentState = true;
      if (best.note.fact) best.note.fact.currentState = true;

      /* Propagate identity from cluster onto winner when update lines omitted room/guest. */
      members.forEach(function (m) {
        if (m.note === best.note || !m.note.fact || !best.note.fact) return;
        if ((!best.note.fact.rooms || !best.note.fact.rooms.length) && m.note.fact.rooms && m.note.fact.rooms.length) {
          best.note.fact.rooms = m.note.fact.rooms.slice();
          best.note.rooms = m.note.fact.rooms.slice();
        }
        if (!best.note.fact.guestName && m.note.fact.guestName) {
          best.note.fact.guestName = m.note.fact.guestName;
        }
        if (best.note.fact && m.note.fact && m.note.fact.hazardLifecycle === "controlled") {
          best.note.fact.hazardLifecycle = best.note.fact.hazardLifecycle || "controlled";
        }
      });

      var archive = [];
      members.forEach(function (m) {
        var text = m.note.original || (m.note.fact && m.note.fact.sourceText) || "";
        if (text && archive.indexOf(text) === -1) archive.push(text);
      });
      best.note._sourceArchive = archive;
      if (best.note.fact) {
        best.note.fact.sourceHistory = best.note.fact.sourceHistory || [];
        archive.forEach(function (text) {
          var exists = best.note.fact.sourceHistory.some(function (entry) {
            return entry && entry.sourceText === text;
          });
          if (!exists) {
            best.note.fact.sourceHistory.push({
              status: best.note.fact.status,
              sourceText: text,
              section: best.note.section || ""
            });
          }
        });
      }

      var winnerIsTerminal = /^(paid|done|cancelled|in_service|final_setup|final_allocation|hazard_controlled)$/.test(winnerTerminal.kind);
      var winnerAmenity = amenityKindFromNote(best.note);
      members.forEach(function (m) {
        if (m.note === best.note) return;
        var loserTerminal = terminalKindForNote(m.note);
        /*
         * Amenity facet safety: if a note also carries other prep amenities
         * (champagne DONE must not wipe an outstanding welcome card on the same note).
         */
        if (winnerIsTerminal && winnerAmenity) {
          var loserBlob = noteSourceBlob(m.note).toLowerCase();
          var otherAmenityOutstanding = ["champagne", "prosecco", "flowers", "balloons", "chocolates", "card", "cot"].some(function (kind) {
            if (kind === winnerAmenity) return false;
            if (kind === "card") {
              return /\b(?:welcome\s+card|handwritten\s+card|card\s+still|card\s+required)\b/.test(loserBlob) &&
                !/\bcard\s+(?:written|done|complete|placed)\b/.test(loserBlob) &&
                !/\b(?:written|done|complete)\b.{0,20}\bcard\b/.test(loserBlob);
            }
            return loserBlob.indexOf(kind) !== -1 &&
              !new RegExp(kind + ".{0,40}(?:done|delivered|placed|complete|cancell)", "i").test(loserBlob);
          });
          if (otherAmenityOutstanding) {
            m.note._currentState = true;
            if (m.note.fact) m.note.fact.currentState = true;
            m.note._supersededAmenities = (m.note._supersededAmenities || []).concat([winnerAmenity]);
            return;
          }
        }
        if (winnerIsTerminal) {
          markNoteSuperseded(m.note, best.note, "superseded_by_" + winnerTerminal.kind);
          return;
        }
        /*
         * Later active hazard reopens: retire earlier siblings in the same
         * hazard lifecycle (prior active fragments AND prior clearance/control).
         */
        var winnerBlob = notePrimaryElectionBlob(best.note);
        var loserBlobFull = notePrimaryElectionBlob(m.note);
        var winnerHz = hazardLifecycleClass(winnerBlob);
        var loserHz = hazardLifecycleClass(loserBlobFull);
        if (
          winnerHz &&
          winnerHz === loserHz &&
          isHazardActiveOpenText(winnerBlob) &&
          !isHazardControlOrClearanceText(winnerBlob) &&
          noteElectionSeq(m.note, m.index) < noteElectionSeq(best.note, best.index)
        ) {
          markNoteSuperseded(m.note, best.note, "superseded_by_hazard_reopen");
          return;
        }
        /* Hazard lifecycle clusters keep exactly one current state. */
        if (
          winnerHz &&
          winnerHz === loserHz &&
          !m.note._superseded
        ) {
          markNoteSuperseded(m.note, best.note, "superseded_by_hazard_current_state");
          return;
        }
        if (loserTerminal.kind === "open" || loserTerminal.kind === "requested" || loserTerminal.kind === "unknown") {
          if (winnerTerminal.strength >= 700) {
            markNoteSuperseded(m.note, best.note, "superseded_by_stronger_current_state");
          }
        }
      });
    });

    finalizeAmenityCurrentState(notes);

    return notes;
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

    /* Preserve source order for later current-state election chronology. */
    (analyzed || []).forEach(function (note, idx) {
      if (!note) return;
      if (note._seq == null) note._seq = idx;
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
    if (lead) {
      var leadRoom = String(lead).replace(/^rooms?\s+/i, "").trim();
      cleaned = cleaned
        .replace(new RegExp("^rooms?\\s+" + escapeRegExp(leadRoom) + "\\s*[–\\-—:]\\s*", "i"), "")
        .replace(new RegExp("^rooms?\\s+" + escapeRegExp(leadRoom) + "\\b\\s*", "i"), "")
        .trim();
    }
    if (!cleaned) return lead ? ensureSentence(lead) : "";
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
      return finishFactRender(lead, "Guest requested a room move to Room " + dest + " if available");
    }
    if (dest) {
      return ensureSentence("Guest requested a room move to Room " + dest + " if available");
    }
    return finishFactRender(lead || roomLeadFromFact(fact), "Guest requested a room move if available");
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
    } else if (
      detectComplaint(normalized) &&
      (section === "guest" || section === "completed" || !section)
    ) {
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
      var leadRoomNo = room || String(lead).replace(/^rooms?\s+/i, "").trim();
      body = body
        .replace(new RegExp("^rooms?\\s+" + escapeRegExp(leadRoomNo) + "\\s*[–\\-—:]\\s*", "i"), "")
        .replace(new RegExp("^rooms?\\s+" + escapeRegExp(leadRoomNo) + "\\b\\s*", "i"), "")
        .trim();
      result = body ? lead + " – " + capitalize(body) : ensureSentence(lead);
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
    var src = String(text || "");
    var re = /\b(?:\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?|\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{2,4})\b/gi;
    var m;
    while ((m = re.exec(src)) !== null) {
      matches.push(m[0]);
    }
    /* Sprint 6 narrow formats from real Zetter failures — not a general NLP date engine. */
    var monthFirst = /\b((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{2,4})\b/gi;
    while ((m = monthFirst.exec(src)) !== null) {
      if (matches.indexOf(m[1]) === -1) matches.push(m[1]);
    }
    var dotted = /\b(\d{1,2}\.\d{1,2}\.\d{2,4})\b/g;
    while ((m = dotted.exec(src)) !== null) {
      if (matches.indexOf(m[1]) === -1) matches.push(m[1]);
    }
    var ordinal = /\b(\d{1,2}(?:st|nd|rd|th)\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)(?:\s+\d{2,4})?)\b/gi;
    while ((m = ordinal.exec(src)) !== null) {
      if (matches.indexOf(m[1]) === -1) matches.push(m[1]);
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

    /*
     * Sprint 1 briefing is exposed via buildTodaysBriefing /
     * buildHandoverIntelligenceExperience. summarizeHandover keeps the
     * fact/legacy summary contracts for existing callers unless preferBriefing.
     */
    var hasAttachedFacts = analyzed.some(function (note) {
      return note && note.fact;
    });
    if (options.preferBriefing) {
      var briefing = buildTodaysBriefing(analyzed, {
        prefs: prefs,
        detail: prefs.detail || options.detail,
        terminologyMap: options.terminologyMap
      });
      if (briefing && briefing.paragraphs && briefing.paragraphs.length) {
        return applyPreferences(briefing.paragraphs.join("\n\n"), {
          prefs: prefs,
          terminologyMap: options.terminologyMap
        });
      }
    }
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
  /*  Sprint 1 — Handover Intelligence Experience (facts → briefing)    */
  /* ------------------------------------------------------------------ */

  function unresolvedAnalyzedEntries(analyzed) {
    var out = [];
    (analyzed || []).forEach(function (note, index) {
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
      if (isNoteSuperseded(note) || fact.superseded) return;
      if (note.section === "completed") return;
      if (isFactClosed(fact) && fact.status === FACT_STATUS.done) return;
      if (isPaymentNoCollectState(fact, note)) return;
      if (fact.subject === "reservation_info" && fact.status === FACT_STATUS.confirmed) return;
      if (!isFactUnresolved(fact) && fact.status === FACT_STATUS.confirmed &&
          !/tomorrow|tmrw|before arrival|wake|addison|collect|protect|allocate/i.test(fact.sourceText || "")) {
        return;
      }
      out.push({
        note: note,
        fact: fact,
        index: index,
        factId: (note && note._neutralFactId) || factIdentityKey(fact) || ("fact-" + index),
        topic: classifyFactSummaryTopic(fact, note),
        section: note.section || sectionFromFact(fact, "general")
      });
    });
    return out;
  }

  /**
   * Briefing sort key — delegates to Hospitality Intelligence Engine impact
   * scoring when loaded (E4 OperationalContext path). Local fallback preserves
   * prior Duty Manager order only when the engine script is not loaded.
   */
  function briefingRank(entry) {
    if (global.ShiftIntelligenceEngine &&
        typeof global.ShiftIntelligenceEngine.scoreOperationalImpact === "function") {
      return global.ShiftIntelligenceEngine.scoreOperationalImpact(entry).score;
    }
    var fact = entry.fact || {};
    var topic = entry.topic || "";
    var subject = String(fact.subject || "");
    var impact = String(fact.guestImpact || "").toLowerCase();
    var src = String(fact.sourceText || "").toLowerCase();
    if (topic === "critical" || impact === "critical") return 0;
    if (subject === "maintenance" && (impact === "high" || impact === "critical")) return 1;
    if (subject === "vip_arrival") return 2;
    if (subject === "wake_up" || subject === "departure_followup" || subject === "transfer" ||
        /\b\d{3,4}\b/.test(src) || detailValueFromFact(fact, "time")) return 3;
    if (normalizeSubjectForIdentity(subject) === "payment_balance") return 4;
    if (subject === "interconnect" || subject === "guest_preparation" || /tomorrow|tmrw/.test(src)) return 5;
    if (subject === "maintenance") return 6;
    if (topic === "guest" || subject === "guest_request" || subject === "lost_property") return 7;
    if (topic === "payment") return 4;
    return 20;
  }

  function operationalObjectsFromEntries(entries) {
    if (global.ShiftIntelligenceEngine &&
        typeof global.ShiftIntelligenceEngine.groupIntoOperationalObjects === "function") {
      return global.ShiftIntelligenceEngine.groupIntoOperationalObjects(entries);
    }
    return [];
  }

  function factMoneyValues(fact) {
    var amounts = [];
    (fact.details || []).forEach(function (d) {
      if (d && d.type === "money" && d.value != null) amounts.push(String(d.value));
    });
    if (!amounts.length) {
      extractMoney(fact.sourceText || "").forEach(function (a) { amounts.push(String(a)); });
    }
    return amounts;
  }

  function sumMatchingMoney(entries) {
    var total = 0;
    var currency = "";
    var count = 0;
    entries.forEach(function (entry) {
      factMoneyValues(entry.fact).forEach(function (raw) {
        var m = String(raw).match(/^([£$€])?\s*([\d,]+(?:\.\d{1,2})?)/);
        if (!m) return;
        var cur = m[1] || "£";
        if (!currency) currency = cur;
        if (cur !== currency) return;
        total += parseFloat(m[2].replace(/,/g, ""), 10) || 0;
        count += 1;
      });
    });
    if (!count) return null;
    return currency + total.toFixed(2);
  }

  function formatBriefingPriorityAction(spec) {
    if (!spec) return "";
    /* Sprint 5: prefer shared canonical action wording — no independent reinterpretation. */
    if (spec.canonicalActionText) {
      return String(spec.canonicalActionText).replace(/\.+$/, "");
    }
    if (!spec.entities) return "";
    var e = spec.entities;
    var room = e.room ? "Room " + e.room : "";
    var fault = e.faultType || "maintenance issue";
    if (fault === "AC") fault = "AC fault";
    if (fault === "hot water") fault = "hot-water issue";
    /* E4.2: accept engine nextAction codes mapped by briefing spec; do not invent kinds. */
    var kind = spec.actionKind || "";
    if (kind === "follow_up_until_resolved") kind = "follow_up_maintenance";
    if (kind === "collect_before_departure") kind = "collect_payment";

    if (kind === "follow_up_maintenance") {
      if (fault === "AC") fault = "AC";
      return "Follow up with Maintenance regarding " + (room ? room + " " : "") + fault +
        (spec.reasonKind === "before_departure_guest_impact"
          ? " before departure / further guest impact"
          : " before further guest impact");
    }
    if (kind === "collect_payment") {
      /*
       * Briefing summarises revenue attention — recommendation cards own the
       * exact "Collect …" duty instruction.
       * Sprint 5: fail closed — never invent "channel payment" without evidence.
       */
      var evidenceBlob = String(spec.evidenceText || (e && e.sourceText) || "").toLowerCase();
      var hasChannel = /\b(?:booking\.com|expedia|ota|virtual\s+card|\bvcc\b|channel\s+payment)\b/.test(evidenceBlob);
      if (e.amount && room) {
        return "Revenue follow-up required for " + room + " outstanding " + e.amount +
          (spec.reasonKind === "card_declined" ? " after declined card" : "") +
          " before departures";
      }
      if (e.amount) {
        return "Revenue follow-up required for outstanding " + e.amount + " before departures";
      }
      if (hasChannel) {
        return "Revenue follow-up required for outstanding channel payment before departures";
      }
      /* Amount-less non-OTA: do not invent a channel-payment chase. */
      return "";
    }
    if (kind === "post_or_collect_charge") {
      return "Revenue follow-up required for " + (room ? room + " " : "") +
        (e.amount || "outstanding") + " adapter charge before departures";
    }
    if (kind === "vip_awareness") {
      /* VIP status is awareness — not an outstanding preparation action. */
      return "";
    }
    if (kind === "prepare_vip") {
      var amenityBit = "";
      if (e.amenities && e.amenities.length) {
        amenityBit = " — " + joinNatural(e.amenities);
      } else {
        /* No outstanding amenities → do not emit generic VIP prep follow-up. */
        return "";
      }
      if (room && e.guestName) {
        return "VIP readiness follow-up for " + e.guestName + " in " + room + amenityBit;
      }
      return "VIP readiness follow-up for " + (room || e.guestName || "arrival") + amenityBit;
    }
    if (kind === "complete_timed_actions") {
      var bits = [];
      (e.times || []).forEach(function (t) {
        var when = normalizeTimelineTime(t.raw) || t.raw;
        if (t.kind === "wake_up") bits.push("wake-up at " + when);
        if (t.kind === "transport") bits.push("taxi at " + when);
      });
      if (!bits.length) {
        return room ? "Complete wake-up / transfer actions for " + room + " before departure" : "";
      }
      return "Timed departure actions for " + (room ? room + ": " : "") + joinNatural(bits);
    }
    if (kind === "reserve_interconnect") {
      if (e.room && spec.rooms && spec.rooms.length >= 2) {
        return "Reserve interconnecting Rooms " + spec.rooms[0] + " & " + spec.rooms[1] +
          (e.guestName ? " for " + e.guestName : "");
      }
      return "Reserve interconnecting rooms" + (e.guestName ? " for " + e.guestName : "");
    }
    if (kind === "guest_follow_up") {
      if (e.requestItem && room) return "Arrange " + e.requestItem + " for " + room;
      if (room) return "Complete outstanding guest follow-up for " + room;
      /* Never surface vague "Follow up guest request". */
      return "";
    }
    return "";
  }

  function buildTodaysBriefing(analyzed, options) {
    options = options || {};
    var entries = unresolvedAnalyzedEntries(analyzed).slice().sort(function (a, b) {
      return briefingRank(a) - briefingRank(b);
    });
    var paragraphs = [];
    var primaryFactIds = [];
    var objects = operationalObjectsFromEntries(entries);
    var model = null;

    /* Engine owns ranking / what to surface; writing formats only. */
    if (global.ShiftIntelligenceEngine &&
        typeof global.ShiftIntelligenceEngine.buildBriefingModel === "function") {
      model = global.ShiftIntelligenceEngine.buildBriefingModel(entries, {
        maxBlocks: global.ShiftIntelligenceEngine.BRIEFING_MAX_BLOCKS || 5
      });
      objects = model.objects || objects;
      var displayPriority = 0;
      (model.priorities || []).forEach(function (spec) {
        var action = formatBriefingPriorityAction(spec);
        if (!action) return;
        /* Display order only — skips empty format results so labels stay sequential. */
        displayPriority += 1;
        var label = "Priority " + displayPriority;
        paragraphs.push(label + "\n" + action.replace(/\.+$/, "") + ".");
        (spec.factIds || []).forEach(function (id) {
          if (primaryFactIds.indexOf(id) === -1) primaryFactIds.push(id);
        });
      });
    }

    if (!paragraphs.length) {
      paragraphs.push("Shift status\nNo urgent guest-impacting priorities for the incoming team.");
    }

    /* Keep engine-selected priorities (up to BRIEFING_MAX_BLOCKS) so timed actions
     * and secondary revenue items are not dropped after ranking. */
    var maxBriefing = (global.ShiftIntelligenceEngine &&
      global.ShiftIntelligenceEngine.BRIEFING_MAX_BLOCKS) || 5;
    paragraphs = paragraphs.slice(0, maxBriefing);
    var firstAction = (paragraphs[0] || "").split("\n")[1] || paragraphs[0] || "Today's shift briefing";
    var headline = String(firstAction).replace(/\.+$/, "").trim();
    if (headline.length > 120) headline = "Today's shift briefing";

    return {
      headline: headline,
      paragraphs: paragraphs,
      primaryFactIds: primaryFactIds.slice(0, 12),
      generatedFromFactCount: entries.length,
      operationalObjects: objects.slice(0, 16),
      briefingModel: model
    };
  }

  function formatHotelStatusSummary(area) {
    var intent = area && area.summaryIntent ? area.summaryIntent : null;
    if (!intent) return "Status unavailable.";
    var room = intent.room ? "Room " + intent.room : "";
    if (area.key === "guest_experience") {
      if (intent.kind === "guest_experience_clear") return "No unresolved guest-impacting issues.";
      if (intent.faultType === "hot water" || /hot\s*water/i.test(intent.faultType || "")) {
        return (room || "A room") + " has an unresolved hot-water issue affecting the guest.";
      }
      if (intent.faultType === "AC") {
        return (room || "A room") + " has an unresolved AC fault affecting the guest.";
      }
      return (room || "A guest room") + " still needs guest-impacting follow-up.";
    }
    if (area.key === "vip_readiness") {
      if (intent.kind === "vip_readiness_clear") return "No VIP preparation required.";
      var amenity = (intent.amenities || []).length
        ? joinNatural(intent.amenities)
        : "VIP preparation";
      var name = intent.guestName || "guest";
      return "VIP " + name + " still requires " + amenity +
        (room ? " in " + room : "") + ".";
    }
    if (area.key === "maintenance") {
      if (intent.kind === "maintenance_clear") return "No unresolved maintenance.";
      if (intent.faultType === "hot water" || /hot\s*water/i.test(intent.faultType || "")) {
        return (room || "A room") + " hot-water fault remains unresolved.";
      }
      if (intent.count === 1) return "One guest or room-impacting fault requires follow-up.";
      return (intent.count === 2 ? "Two" : String(intent.count || 0)) +
        " guest or room-impacting faults require follow-up.";
    }
    if (area.key === "revenue") {
      if (intent.kind === "revenue_clear") return "No unresolved revenue actions.";
      if (intent.amountTotal && intent.count > 1) {
        return "Known outstanding charges total " + intent.amountTotal +
          (intent.declined ? ", including a declined card" : "") + ".";
      }
      if (intent.declined && intent.amount) {
        return (room || "A room") + " has " + intent.amount +
          " outstanding after a declined card" +
          (intent.count > 1 ? ", with additional open charges." : ".");
      }
      if (intent.amount) {
        return "Outstanding " + intent.amount +
          (room ? " on " + room : "") + " requires collection before departure.";
      }
      return "Outstanding charges require review before departure.";
    }
    if (area.key === "reception_operations") {
      if (intent.kind === "reception_operations_clear") {
        return "No unresolved reception operational work.";
      }
      if (intent.timed) {
        return "Timed wake-up/taxi and reception follow-ups remain open.";
      }
      return "Reception follow-up remains open.";
    }
    return "Follow-up remains open.";
  }

  function buildHotelStatus(analyzed, options) {
    options = options || {};
    var entries = unresolvedAnalyzedEntries(analyzed);
    var areas;

    if (global.ShiftIntelligenceEngine &&
        typeof global.ShiftIntelligenceEngine.buildHotelStatusModel === "function") {
      areas = global.ShiftIntelligenceEngine.buildHotelStatusModel(entries).map(function (area) {
        return {
          key: area.key,
          label: area.label,
          level: area.level,
          summary: formatHotelStatusSummary(area),
          count: area.count,
          details: Array.isArray(area.details) ? area.details.slice() : [],
          supportingFactIds: area.supportingFactIds || [],
          summaryIntent: area.summaryIntent || null
        };
      });
    } else {
      /* Fallback — only meaningful exceptions, never filler "Normal" cards. */
      var hasMaint = entries.some(function (e) {
        return e.fact && e.fact.subject === "maintenance";
      });
      areas = [];
      if (hasMaint) {
        areas.push({
          key: "maintenance",
          label: "Maintenance",
          level: "attention",
          summary: "Unresolved maintenance requires follow-up.",
          count: 0,
          supportingFactIds: []
        });
      }
    }

    return (areas || []).filter(function (area) {
      var level = String((area && area.level) || "").toLowerCase();
      return level && level !== "normal" && level !== "unknown" &&
        !/_clear$/i.test((area.summaryIntent && area.summaryIntent.kind) || "");
    });
  }

  /**
   * Today's Timeline — receptionist schedule only.
   * Include timed actions or clear sequence triggers (before arrival / departure /
   * releasing / tomorrow). Never duplicate Maintenance, Finance, or generic follow-ups.
   */
  function buildTodaysTimeline(analyzed, options) {
    options = options || {};
    var entries = unresolvedAnalyzedEntries(analyzed);
    var seenEntryIds = {};
    entries.forEach(function (entry) {
      if (entry && entry.factId) seenEntryIds[entry.factId] = true;
    });
    /*
     * Confirmed timed schedule items (e.g. approved late check-out at 13:00)
     * still belong on the receptionist Timeline even when closed for chase.
     */
    (analyzed || []).forEach(function (note, index) {
      if (!note || !note.fact) return;
      var fact = note.fact;
      var src = String(fact.sourceText || note.original || "");
      var factId = note._neutralFactId || factIdentityKey(fact) || ("fact-" + index);
      if (seenEntryIds[factId]) return;
      if (fact.status === FACT_STATUS.done || note.section === "completed") return;
      var isTimedSchedule =
        fact.subject === "late_checkout" ||
        /\blate\s+(?:co|check[\s-]?out)\b/i.test(src) ||
        (/\b(?:wake|addison|taxi)\b/i.test(src) && /\b\d{3,4}\b|\d{1,2}\s*(?:am|pm)/i.test(src));
      if (!isTimedSchedule) return;
      if (fact.status !== FACT_STATUS.confirmed && fact.status !== FACT_STATUS.open &&
          fact.status !== FACT_STATUS.requested && fact.status !== FACT_STATUS.in_progress &&
          fact.status !== FACT_STATUS.unknown) {
        return;
      }
      seenEntryIds[factId] = true;
      entries.push({
        note: note,
        fact: fact,
        index: index,
        factId: factId,
        topic: classifyFactSummaryTopic(fact, note),
        section: note.section || sectionFromFact(fact, "general"),
        isVip: !!note.isVip,
        original: note.original || ""
      });
    });
    var usedFactIds = {};
    var groupsMap = {
      scheduled: { key: "scheduled", label: "Scheduled", items: [] },
      before_arrival: { key: "before_arrival", label: "Before arrival", items: [] },
      before_deadline: { key: "before_deadline", label: "Before departure", items: [] },
      during_shift: { key: "during_shift", label: "During shift", items: [] },
      tomorrow: { key: "tomorrow", label: "Tomorrow", items: [] }
    };

    function hasDepartureTimingCue(text) {
      return /\b(?:before\s+(?:check[\s-]?out|departure|co)\b|b4\s+(?:check[\s-]?out|checkout|co)\b|dep(?:arts?|arture)?\s+(?:am|pm|today)\b|departing(?:\s+today)?\b|checkout\s+today\b|dep\s+am\b)/i.test(text);
    }

    function hasArrivalTimingCue(text) {
      return /\b(?:before\s+arrival|due\s+\d|arriving|eta|due\s+(?:in|at)|check[\s-]?in)\b/i.test(text) ||
        /\b\d{1,2}\s*(?:am|pm)\b/i.test(text) ||
        /\b(?:\d{3,4}|\d{1,2}[:.]\d{2})\b/.test(text);
    }

    function timelineIconFor(groupKey, item) {
      var action = String((item && item.action) || "").toLowerCase();
      if (/wake/.test(action)) return "⏰";
      if (/addison|taxi|transfer|pickup/.test(action)) return "🚕";
      if (/vip/.test(action)) return "⭐";
      if (/balloon|birthday/.test(action)) return "🎈";
      if (/champagne|welcome\s+card|twin|prepare/.test(action) || groupKey === "before_arrival") return "⭐";
      if (groupKey === "before_deadline" || /collect|tax|minibar|payment|balance/.test(action)) return "💰";
      if (groupKey === "tomorrow" || /interconnect|reserve|allocate/.test(action)) return "📅";
      if (/no-show|late\s+check/.test(action)) return "🛎️";
      return "•";
    }

    function addItem(groupKey, item) {
      if (!item || !item.action) return;
      /* Timeline requires a clock time or an explicit sequence label. */
      if (!item.time && !item.deadlineLabel) return;
      if (item.factId && usedFactIds[item.factId + "|" + item.action]) return;
      if (item.factId) usedFactIds[item.factId + "|" + item.action] = true;
      if (!item.icon) item.icon = timelineIconFor(groupKey, item);
      groupsMap[groupKey].items.push(item);
    }

    entries.forEach(function (entry) {
      var fact = entry.fact;
      if (!fact) return;
      var note = entry.note || null;
      var src = String(fact.sourceText || entry.original || (note && note.original) || "");
      var subject = normalizeSubjectForIdentity(fact.subject || "");
      var room = fact.rooms && fact.rooms[0] ? "Room " + fact.rooms[0] : "";
      var roomsLabel = fact.rooms && fact.rooms.length > 1
        ? "Rooms " + joinNatural(fact.rooms)
        : room;
      var priority = fact.priority || "normal";
      var guest = trimText(fact.guestName || "");
      var noteIsVip = !!(entry.isVip || (note && note.isVip));

      /* Never put generic maintenance / fault chase on the Timeline. */
      if (subject === "maintenance" || fact.subject === "maintenance") return;
      if (/maint(?:enance)?\s+aware|follow\s+up.*(?:ac|leak|dryer|safe|shower|fault)/i.test(src) &&
          !/wake|taxi|addison|late\s+(?:co|check)|balloon|vip|minibar|before\s+(?:arrival|departure|check)/i.test(src)) {
        return;
      }

      /* Timed wake / taxi / transfer. */
      if (fact.subject === "departure_followup" || fact.subject === "wake_up" ||
          fact.subject === "transfer" || /wake\s*\d|addison|taxi/i.test(src)) {
        var wake = extractWakeDisplayTime(src);
        if (wake) {
          addItem("scheduled", {
            factId: entry.factId,
            time: wake,
            deadlineLabel: null,
            action: "Wake-up call" + (room ? " " + room : ""),
            reason: null,
            priority: priority
          });
        }
        var taxi = extractTaxiDisplayTime(src);
        if (taxi) {
          addItem("scheduled", {
            factId: entry.factId,
            time: taxi,
            deadlineLabel: null,
            action: (/addison/i.test(src) ? "Addison Lee pickup" : "Taxi pickup") +
              (room ? " " + room : ""),
            reason: null,
            priority: priority
          });
        }
      }

      /* Timed late check-out. */
      if (fact.subject === "late_checkout" || /\blate\s+(?:co|check[\s-]?out)\b/i.test(src)) {
        var lateTime = normalizeTimelineTime(detailValueFromFact(fact, "time") ||
          (src.match(/\b(\d{1,2}\s*(?:am|pm)|\d{3,4}|\d{1,2}[:.]\d{2})\b/i) || [])[1]);
        if (lateTime) {
          addItem("scheduled", {
            factId: entry.factId,
            time: lateTime,
            deadlineLabel: null,
            action: "Late check-out" + (room ? " " + room : "") + (guest ? " (" + guest + ")" : ""),
            reason: null,
            priority: priority
          });
        }
      }

      /* VIP — timed arrival or before-arrival sequence. */
      if (fact.subject === "vip_arrival" || (noteIsVip && hasArrivalTimingCue(src))) {
        var vipTime = normalizeTimelineTime(detailValueFromFact(fact, "time") ||
          (src.match(/\b(\d{1,2}\s*(?:am|pm)|\d{3,4}|\d{1,2}[:.]\d{2})\b/i) || [])[1]);
        var vipGuest = guest || "VIP guest";
        var vipAction = room
          ? ("Prepare VIP " + room + (guest ? " — " + guest : ""))
          : ("Prepare VIP arrival for " + vipGuest);
        if (/quiet/i.test(src)) {
          vipAction = "Prepare quiet upper-floor VIP" + (room ? " " + room : "") +
            (guest ? " — " + guest : "");
        }
        if (vipTime) {
          addItem("scheduled", {
            factId: entry.factId,
            time: vipTime,
            deadlineLabel: "Before " + vipTime,
            action: vipAction,
            reason: null,
            priority: "high"
          });
        } else {
          addItem("before_arrival", {
            factId: entry.factId,
            time: null,
            deadlineLabel: "Before arrival",
            action: vipAction,
            reason: null,
            priority: "high"
          });
        }
      }

      /* Arrival preparations — sequence only (not a second Guest Follow-up dump). */
      if (/\b(?:champagne|welcome\s+cards?|truffles?|flowers?)\b/i.test(src) &&
          !/minibar|balance|declined|payment/i.test(src)) {
        var amenityBits = [];
        if (/\bwelcome\s+cards?\b/i.test(src)) amenityBits.push("Welcome card");
        if (/\bchampagne\b/i.test(src)) amenityBits.push("champagne");
        if (/\btruffles?\b/i.test(src)) amenityBits.push("truffles");
        if (/\bflowers?\b/i.test(src)) amenityBits.push("flowers");
        addItem("before_arrival", {
          factId: entry.factId,
          time: null,
          deadlineLabel: "Before arrival",
          action: amenityBits.length ? amenityBits.join(" & ") : "Welcome amenities",
          reason: null,
          priority: priority
        });
      }

      if (fact.subject === "twin_setup" || (/\btwin\b/i.test(src) && /\b(?:setup|set\s+up|pls|please|if\s+(?:free|available)|beds?)\b/i.test(src))) {
        addItem("before_arrival", {
          factId: entry.factId,
          time: null,
          deadlineLabel: "Before arrival",
          action: "Twin room setup if available" + (room ? " — " + room : ""),
          reason: null,
          priority: priority
        });
      }

      if (/\bbaby\s*cot\b|\bcot\b/i.test(src) && !/minibar|payment|maint/i.test(src)) {
        var cotTime = normalizeTimelineTime(detailValueFromFact(fact, "time") ||
          (src.match(/\b(\d{1,2}\s*(?:am|pm)|\d{3,4}|\d{1,2}[:.]\d{2})\b/i) || [])[1]);
        addItem(cotTime ? "scheduled" : "before_arrival", {
          factId: entry.factId,
          time: cotTime || null,
          deadlineLabel: cotTime ? "Before " + cotTime : "Before arrival",
          action: "Baby cot" + (room ? " " + room : "") + (cotTime ? " before " + cotTime + " arrival" : ""),
          reason: null,
          priority: priority
        });
      }

      /* Birthday / interconnect — timed today/tomorrow or tomorrow sequence. */
      if (fact.subject === "interconnect" || (/\bballoons?|birthday\b/i.test(src) && /tomorrow|tmrw|@\s*\d|\b\d{3,4}\b/i.test(src))) {
        var balloonMatch = src.match(/(?:@\s*)?(\d{3,4}|\d{1,2}[:.]\d{2}|\d{1,2}\s*(?:am|pm))\b/i);
        var balloonTime = balloonMatch ? normalizeTimelineTime(balloonMatch[1]) : "";
        var partyName = guest || "Henderson";
        if (balloonTime || /\bballoons?|birthday\b/i.test(src)) {
          addItem(/tomorrow|tmrw/i.test(src) && !balloonTime ? "tomorrow" : "scheduled", {
            factId: entry.factId,
            time: balloonTime || null,
            deadlineLabel: balloonTime
              ? (/tomorrow|tmrw/i.test(src) ? balloonTime + " tomorrow" : null)
              : "Tomorrow",
            action: "Birthday balloons for " + partyName,
            reason: null,
            priority: priority
          });
        }
        if (fact.subject === "interconnect" || /\binterconnect/i.test(src)) {
          addItem("tomorrow", {
            factId: entry.factId,
            time: null,
            deadlineLabel: "Tomorrow",
            action: "Interconnecting " + (roomsLabel || "rooms") + " for " + partyName,
            reason: null,
            priority: "high"
          });
        }
      }

      /*
       * Payments only with an explicit departure / check-out timing trigger.
       * Untimed outstanding balances stay in Finance — not Timeline.
       */
      if (
        (subject === "payment_balance" || entry.section === "payments" ||
          /\b(?:minibar|city\s+tax|outstanding|declined|folio)\b/i.test(src)) &&
        hasDepartureTimingCue(src)
      ) {
        var amount = factMoneyValues(fact)[0];
        var payAction;
        if (/minibar/i.test(src)) {
          payAction = "Collect" + (room ? " " + room : "") + " minibar" +
            (amount ? " (" + amount + ")" : "");
        } else if (/city\s+tax/i.test(src)) {
          payAction = "Collect" + (room ? " " + room + " " : " ") +
            (/expedia/i.test(src) ? "Expedia city tax" : "city tax") +
            (amount ? " (" + amount + ")" : "");
        } else {
          payAction = "Collect" + (room ? " " + room : "") + " outstanding" +
            (amount ? " (" + amount + ")" : " balance");
        }
        addItem("before_deadline", {
          factId: entry.factId,
          time: null,
          deadlineLabel: /b4\s+checkout|before\s+check[\s-]?out/i.test(src)
            ? "Before check-out"
            : "Before departure",
          action: payAction,
          reason: null,
          priority: "high"
        });
      }

      /* Sequence: confirm no-show before releasing — not a generic follow-up. */
      if (fact.subject === "no_show" || /\bno[\s-]?show\b/i.test(src)) {
        addItem("during_shift", {
          factId: entry.factId,
          time: null,
          deadlineLabel: "Before releasing",
          action: "Confirm" + (room ? " " + room : "") + " no-show" +
            (guest ? " (" + guest + ")" : ""),
          reason: null,
          priority: "high"
        });
      }
    });

    groupsMap.scheduled.items.sort(function (a, b) {
      var ta = a.time || "99:99";
      var tb = b.time || "99:99";
      if (ta === tb) return String(a.action).localeCompare(String(b.action));
      return ta < tb ? -1 : 1;
    });

    var groups = ["scheduled", "before_arrival", "before_deadline", "during_shift", "tomorrow"].map(function (key) {
      return groupsMap[key];
    }).filter(function (g) { return g.items.length; });

    return { groups: groups };
  }

  function buildHandoverIntelligenceExperience(analyzed, options) {
    options = options || {};
    var experience = {
      briefing: buildTodaysBriefing(analyzed, options),
      hotelStatus: buildHotelStatus(analyzed, options),
      timeline: buildTodaysTimeline(analyzed, options)
    };
    /* Sprint 3 — engine owns cross-surface consistency; writing does not re-rank. */
    if (global.ShiftIntelligenceEngine &&
        typeof global.ShiftIntelligenceEngine.applyExperienceConsistencyGate === "function") {
      experience = global.ShiftIntelligenceEngine.applyExperienceConsistencyGate(experience, {
        analyzed: analyzed,
        options: options
      });
    }
    return experience;
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
    expandMessyShorthand: expandMessyShorthand,
    standardiseTerminology: standardiseTerminology,

    extractRoomNumbers: extractRoomNumbers,
    extractMoney: extractMoney,
    extractTimes: extractTimes,
    extractEta: extractEta,
    extractGuestNames: extractGuestNames,
    assessExtractionConfidence: assessExtractionConfidence,
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
    extractRequestItem: extractRequestItem,
    extractFaultType: extractFaultType,
    classifyGuestImpact: classifyGuestImpact,
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
    buildTodaysBriefing: buildTodaysBriefing,
    buildHotelStatus: buildHotelStatus,
    buildTodaysTimeline: buildTodaysTimeline,
    buildHandoverIntelligenceExperience: buildHandoverIntelligenceExperience,
    normalizeTimelineTime: normalizeTimelineTime,
    displayWritingForNote: displayWritingForNote,
    computeHandoverMetricsFromFacts: computeHandoverMetricsFromFacts,
    isGlanceActiveFact: isGlanceActiveFact,
    factIdentityKey: factIdentityKey,
    factMergeFamilyKey: factMergeFamilyKey,
    consolidateNotesByFacts: consolidateNotesByFacts,
    sectionFromFact: sectionFromFact,
    /* Reasoning Sprint 1 — canonical current-state election */
    electCanonicalCurrentState: electCanonicalCurrentState,
    currentStateFacetKey: currentStateFacetKey,
    isNoteSuperseded: isNoteSuperseded,
    isNoteCurrentState: isNoteCurrentState,
    isPaymentNoCollectState: isPaymentNoCollectState,
    isPaymentNoCollectText: isPaymentNoCollectText,
    /* Hazard lifecycle election helpers (Sprint 1 / Sprint 2 bridge) */
    hazardLifecycleClass: hazardLifecycleClass,
    isHazardControlOrClearanceText: isHazardControlOrClearanceText,
    isHazardActiveOpenText: isHazardActiveOpenText,
    electionRelation: electionRelation,
    clusterNotesForElection: clusterNotesForElection,
    /* Reasoning Sprint 3 — operational entity resolution */
    resolveOperationalEntities: resolveOperationalEntities,
    personNameParts: personNameParts
  };

  global.AiWritingEngine = Api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Api;
  }
})(typeof window !== "undefined" ? window : globalThis);
