/**
 * Hospitality Flow — Quote of the Day
 * Pleasant, subtle touch for the handover — not an operational feature.
 * Local curated list (no extra AI call). Accepts AI/provided quotes when present.
 */
(function (global) {
  "use strict";

  /* Original / lightly humorous hospitality lines — no fabricated attribution. */
  var ORIGINAL_QUOTES = [
    { text: "Clear communication creates confident shifts.", themes: ["teamwork", "leadership"] },
    { text: "Small details create memorable stays.", themes: ["hospitality", "service"] },
    { text: "A prepared team delivers better hospitality.", themes: ["teamwork", "preparation"] },
    { text: "Every smooth shift begins with a clear handover.", themes: ["teamwork", "mindset"] },
    { text: "Great hospitality begins with noticing what others might miss.", themes: ["hospitality", "service"] },
    { text: "Calm coordination turns busy days into confident service.", themes: ["leadership", "service"] },
    { text: "Careful preparation protects every guest moment.", themes: ["hospitality", "mindset"] },
    { text: "Teams that share context serve with greater clarity.", themes: ["teamwork"] },
    { text: "Quiet attention is the foundation of fine hospitality.", themes: ["hospitality", "service"] },
    { text: "Good handovers give the next shift a confident start.", themes: ["teamwork", "leadership"] },
    { text: "Service improves when every detail is owned.", themes: ["service", "mindset"] },
    { text: "Thoughtful teamwork makes complex shifts feel simple.", themes: ["teamwork"] },
    { text: "Guests feel the care behind every prepared room.", themes: ["hospitality"] },
    { text: "Consistency builds trust across every shift.", themes: ["mindset", "continuous improvement"] },
    { text: "Clear notes create calmer, stronger operations.", themes: ["leadership", "teamwork"] },
    { text: "Hospitality thrives when teams stay one step ahead.", themes: ["hospitality", "mindset"] },
    { text: "Precision in small tasks elevates the whole stay.", themes: ["service", "continuous improvement"] },
    { text: "Shared awareness is the heart of reliable service.", themes: ["teamwork", "service"] },
    { text: "A well-briefed team protects the guest experience.", themes: ["leadership", "hospitality"] },
    { text: "Excellence grows from steady, attentive routines.", themes: ["mindset", "continuous improvement"] },
    { text: "The best receptionists make effort look effortless.", themes: ["humour", "service"] },
    { text: "Coffee helps. Clear notes help more.", themes: ["humour", "teamwork"] },
    { text: "Smile first. Sort the folio second.", themes: ["humour", "hospitality"] },
    { text: "Motivation is useful. A tidy arrivals list is better.", themes: ["humour", "motivation"] },
    { text: "Leadership on shift often sounds like a calm, clear update.", themes: ["leadership"] },
    { text: "Continuous improvement starts with one honest handover note.", themes: ["continuous improvement"] },
    { text: "Mindset matters most when the lobby is busiest.", themes: ["mindset", "motivation"] },
    { text: "Service is remembered long after the key card is returned.", themes: ["service", "hospitality"] }
  ];

  /* Famous lines only when attribution is confidently established. */
  var ATTRIBUTED_QUOTES = [
    {
      text: "People will forget what you said, people will forget what you did, but people will never forget how you made them feel.",
      author: "Maya Angelou",
      themes: ["hospitality", "service"]
    },
    {
      text: "Coming together is a beginning; keeping together is progress; working together is success.",
      author: "Henry Ford",
      themes: ["teamwork", "leadership"]
    },
    {
      text: "It is not the strongest of the species that survives, nor the most intelligent, but the one most responsive to change.",
      author: "Leon C. Megginson",
      themes: ["continuous improvement", "mindset"]
    }
  ];

  var FALLBACK_QUOTES = ORIGINAL_QUOTES.concat(ATTRIBUTED_QUOTES);

  function wordCount(text) {
    return String(text || "").trim().split(/\s+/).filter(Boolean).length;
  }

  function normalizeQuote(text) {
    var cleaned = String(text || "").replace(/^["“”']+|["“”']+$/g, "").trim();
    cleaned = cleaned.replace(/\s+/g, " ");
    if (!cleaned) return "";
    if (!/[.!?]$/.test(cleaned)) cleaned += ".";
    if (wordCount(cleaned) > 28) {
      var words = cleaned.replace(/[.!?]$/, "").split(/\s+/).slice(0, 28);
      cleaned = words.join(" ") + ".";
    }
    return cleaned;
  }

  function normalizeAuthor(author) {
    var name = String(author || "").replace(/^[\s—\-–]+/, "").trim();
    if (!name) return "";
    /* Never invent authors — only keep a plausible real-name shape. */
    if (!/^[A-ZÀ-ÖØ-Þ][\wÀ-ÿ'’.\-]+(?:\s+[A-ZÀ-ÖØ-Þ][\wÀ-ÿ'’.\\-]+){0,4}$/.test(name)) {
      return "";
    }
    return name;
  }

  function hashSeed(seed) {
    var str = String(seed || "");
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function pickQuoteEntry(seed) {
    var index = hashSeed(seed) % FALLBACK_QUOTES.length;
    return FALLBACK_QUOTES[index];
  }

  /**
   * Generate (or accept) one quote for a handover generation.
   * Uses curated local list — no network / no extra AI call.
   * Provided/AI quotes may include a confident author; otherwise omit attribution.
   */
  function generateQuoteOfTheDay(options) {
    options = options || {};
    if (options.quote || (options.text && String(options.text).trim())) {
      var providedText = normalizeQuote(options.quote || options.text);
      var providedAuthor = normalizeAuthor(options.author);
      if (providedText) {
        return {
          text: providedText,
          author: providedAuthor || "",
          source: options.source || "provided",
          generatedAt: options.generatedAt || new Date().toISOString()
        };
      }
    }

    var seed = [
      options.seed,
      options.hotelName,
      options.shift,
      options.date,
      options.generatedAt,
      options.id
    ].filter(Boolean).join("|") || String(Date.now());

    var entry = pickQuoteEntry(seed);
    return {
      text: normalizeQuote(entry.text),
      author: normalizeAuthor(entry.author),
      source: "local",
      generatedAt: options.generatedAt || new Date().toISOString()
    };
  }

  function formatQuoted(quoteOrText) {
    var text = "";
    var author = "";
    if (quoteOrText && typeof quoteOrText === "object") {
      text = normalizeQuote(quoteOrText.text);
      author = normalizeAuthor(quoteOrText.author);
    } else {
      text = normalizeQuote(quoteOrText);
    }
    if (!text) return { text: "", author: "" };
    return {
      text: "\u201C" + text.replace(/[.!?]$/, "") + ".\u201D",
      author: author
    };
  }

  var Api = {
    FALLBACK_QUOTES: FALLBACK_QUOTES.map(function (q) { return q.text; }),
    ORIGINAL_QUOTES: ORIGINAL_QUOTES.slice(),
    ATTRIBUTED_QUOTES: ATTRIBUTED_QUOTES.slice(),
    normalizeQuote: normalizeQuote,
    normalizeAuthor: normalizeAuthor,
    pickQuote: function (seed) {
      return normalizeQuote(pickQuoteEntry(seed).text);
    },
    generateQuoteOfTheDay: generateQuoteOfTheDay,
    formatQuoted: formatQuoted
  };

  global.HFHandoverQuoteOfTheDay = Api;
  if (typeof module !== "undefined" && module.exports) module.exports = Api;
})(typeof window !== "undefined" ? window : globalThis);
