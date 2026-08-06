/**
 * Hospitality Flow — Today's Preparations + Questions Still Open
 * Shared extraction for workspace and demo. Checklist state is local to the handover.
 */
(function (global) {
  "use strict";

  function trim(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function roomLabel(rooms) {
    if (!rooms || !rooms.length) return "";
    if (rooms.length === 1) return "Room " + rooms[0];
    return "Rooms " + rooms.join(" & ");
  }

  function guestLabel(note) {
    if (note && note.fact && note.fact.guestName) return trim(note.fact.guestName);
    if (note && note.guestName) return trim(note.guestName);
    var src = String((note && note.original) || "");
    var m = src.match(/\b(?:mr|mrs|ms|miss|dr)\.?\s+[A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+)?/i);
    if (m) return m[0].replace(/\s+/g, " ").trim();
    /* Full name — never treat trailing "Room(s)" as part of the guest name. */
    m = src.match(/\b([A-Z][a-z]+(?:-[A-Z][a-z]+)?(?:\s+[A-Z][a-z]+)+)\b/);
    if (m) {
      var full = m[1].replace(/\s+Rooms?\s*$/i, "").trim();
      if (full && !/^(Room|Rooms|VIP|Late|Today|Quiet|Junior|Twin)/i.test(full)) return full;
    }
    /* Surname before room cue (e.g. "Henderson Rooms 14 & 15", "Patel Room 16"). */
    m = src.match(/\b([A-Z][a-z]{2,})\b(?:\s+Rooms?\b|\s*[—\-]\s*Rooms?\b|\s*,\s*Rooms?\b)/);
    if (m && !/^(Room|Vip|Late|Today|Quiet|Twin|Junior|Please|Confirm|Prepare|Needs?|Still|Hold|Open|Safe|Wake|Guest)$/i.test(m[1])) {
      return m[1];
    }
    return "";
  }

  function identityKey(guest, rooms, action) {
    return [
      trim(guest).toLowerCase(),
      (rooms || []).join(","),
      trim(action).toLowerCase().replace(/[^a-z0-9]+/g, " ")
    ].join("|");
  }

  function isCompletedCue(text) {
    return /\b(?:done|completed|complete|prepared|placed|supplied|already|sorted|handled|confirmed|approved|sent|provided)\b/i.test(text) &&
      !/\b(?:still|not yet|outstanding|pending|needs?|required|to prepare|please|pls)\b/i.test(text);
  }

  function isOpenQuestionCue(text) {
    return /\b(?:has\s+(?:room|maintenance|the)|confirm(?:ed)?\?|still\s+(?:open|waiting|awaiting)|not\s+(?:sure|confirmed)|need(?:s)?\s+to\s+confirm|awaiting|tbc|unknown|pls\s+check|please\s+check|follow\s+up\s+if)\b/i.test(text) ||
      /\?\s*$/.test(text);
  }

  function isPreparationCue(text) {
    return /\b(?:champagne|truffles?|flowers?|welcome\s+cards?|anniversary|birthday|balloons?|sofa\s+bed|dental\s+kits?|amenities|amenity|twin(?:\s+beds?)?|cot|rollaway|extra\s+bed|room\s+setup|prepare|prepared|setup|set\s+up|quiet\s+upper|vip\s+setup|interconnect(?:ing)?|corporate\s+rate|\d+\s*%\s*(?:corp(?:orate)?\s*)?rate)\b/i.test(text);
  }

  /** Prefer short amenity / setup labels for checklist rows. */
  function amenityShortLabel(text) {
    var t = trim(text);
    var lower = t.toLowerCase();
    var rate = t.match(/(\d+)\s*%\s*(?:corp(?:orate)?\s*)?rate/i) ||
      t.match(/\b(?:corp(?:orate)?\s+rate)\b.*?(\d+)\s*%/i);
    if (rate) return "Apply " + rate[1] + "% corporate rate";
    if (/\bcorporate\s+rate\b/.test(lower) || /\bcorp(?:orate)?\s+rate\b/.test(lower)) {
      return "Apply corporate rate";
    }
    if (/\binterconnect/.test(lower)) return "Interconnecting rooms";
    if (/\bbirthday\b/.test(lower) && /\bballoon/.test(lower)) return "Birthday balloons";
    if (/\bchampagne\b/.test(lower)) return "Champagne";
    if (/\bwelcome\s+cards?\b/.test(lower)) return "Welcome card";
    if (/\bballoons?\b/.test(lower)) return "Balloons";
    if (/\bflowers?\b/.test(lower)) return "Flowers";
    if (/\btruffles?\b/.test(lower)) return "Truffles";
    if (/\bdental\s+kits?\b/.test(lower)) return "Dental kit";
    if (/\bsofa\s+bed\b/.test(lower)) return "Sofa bed";
    if (/\bcot\b|\brollaway\b|\bextra\s+bed\b/.test(lower)) return "Extra bed";
    if (/\btwin\b/.test(lower)) return "Twin setup if available";
    if (/\bquiet\s+upper\b/.test(lower)) return "Quiet upper-floor room";
    if (/\bamenities?\b/.test(lower) && !/\bchampagne\b|\bwelcome\b|\bflower\b/.test(lower)) {
      return "Welcome amenities";
    }
    return "";
  }

  function shortAction(text) {
    var amenity = amenityShortLabel(text);
    if (amenity) return amenity;
    var t = trim(text)
      .replace(/^(?:please|pls|need to|needs to|remember to|confirm|prepare|set\s+up)\s+/i, "")
      .replace(/\b(?:please|pls)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    t = t.replace(/\bensure (?:that )?/gi, "");
    t = t.replace(/\baccording to hotel procedures\b/gi, "");
    if (t.length > 90) t = t.slice(0, 87).replace(/\s+\S*$/, "") + "…";
    if (!t) return "";
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  function splitPrepActions(text) {
    var raw = trim(text);
    if (!raw) return [];
    var labels = [];
    var rate = raw.match(/(\d+)\s*%\s*(?:corp(?:orate)?\s*)?rate/i);
    if (rate) labels.push("Apply " + rate[1] + "% corporate rate");
    else if (/\b(?:corp(?:orate)?\s+rate)\b/i.test(raw)) labels.push("Apply corporate rate");

    var patterns = [
      { re: /\bchampagne\b/i, label: "Champagne" },
      { re: /\bwelcome\s+cards?\b/i, label: "Welcome card" },
      { re: /\bbirthday\b.*\bballoon|\bballoon.*\bbirthday/i, label: "Birthday balloons" },
      { re: /\bballoons?\b/i, label: "Balloons" },
      { re: /\bflowers?\b/i, label: "Flowers" },
      { re: /\btruffles?\b/i, label: "Truffles" },
      { re: /\bdental\s+kits?\b/i, label: "Dental kit" },
      { re: /\bsofa\s+bed\b/i, label: "Sofa bed" },
      { re: /\b(?:cot|rollaway|extra\s+bed)\b/i, label: "Extra bed" },
      { re: /\btwin\b/i, label: "Twin setup if available" },
      { re: /\bquiet\s+upper\b/i, label: "Quiet upper-floor room" },
      { re: /\binterconnect/i, label: "Interconnecting rooms" }
    ];
    patterns.forEach(function (p) {
      if (p.re.test(raw) && labels.indexOf(p.label) === -1) {
        /* Prefer Birthday balloons over generic Balloons. */
        if (p.label === "Balloons" && labels.indexOf("Birthday balloons") !== -1) return;
        if (p.label === "Birthday balloons") {
          var ballIdx = labels.indexOf("Balloons");
          if (ballIdx !== -1) labels.splice(ballIdx, 1);
        }
        labels.push(p.label);
      }
    });
    if (labels.length) return labels;
    var chunks = raw.split(/\s*(?:,|\+|\/|&|;|\band\b)\s*/i).map(trim).filter(Boolean);
    if (chunks.length < 2) return [raw];
    return chunks.filter(function (c) {
      return isPreparationCue(c) || /card|kit|bed|flower|balloon|champagne|truffle|twin|setup|rate|interconnect/i.test(c);
    });
  }

  function guestHeading(guest, rooms) {
    var roomsText = roomLabel(rooms);
    if (guest && roomsText) return guest + " — " + roomsText;
    if (guest) return guest;
    if (roomsText) return roomsText;
    return "Review original note";
  }

  function mergeRooms(existing, incoming) {
    var out = (existing || []).slice();
    (incoming || []).forEach(function (r) {
      if (out.indexOf(r) === -1) out.push(r);
    });
    return out;
  }

  function buildPreparationGroups(analyzed) {
    var groups = [];
    var seen = {};

    (analyzed || []).forEach(function (note) {
      if (!note) return;
      var src = String(note.original || (note.fact && note.fact.sourceText) || "");
      if (!isPreparationCue(src)) return;

      var guest = guestLabel(note);
      var rooms = (note.rooms && note.rooms.length)
        ? note.rooms.slice()
        : ((note.fact && note.fact.rooms) || []).slice();
      var completed = isCompletedCue(src);
      var actions = splitPrepActions(src);
      if (!actions.length) actions = [src];

      actions.forEach(function (actionRaw) {
        var action = shortAction(actionRaw);
        if (!action || action.length < 3) return;
        if (/^\d+%|^adr\b|^rooms?\s+sold\b|^inhouse\b|occupancy|revpar/i.test(action)) return;
        var key = identityKey(guest, rooms, action);
        if (seen[key]) return;
        seen[key] = true;

        /* Group by guest first; fall back to room only when guest is unknown. */
        var groupKey = guest
          ? ("guest|" + guest.toLowerCase())
          : ("room|" + (rooms || []).join(","));
        var group = groups.find(function (g) { return g._key === groupKey; });
        if (!group) {
          group = {
            _key: groupKey,
            guest: guest,
            rooms: rooms,
            heading: guestHeading(guest, rooms),
            items: []
          };
          groups.push(group);
        } else {
          group.rooms = mergeRooms(group.rooms, rooms);
          group.heading = guestHeading(group.guest || guest, group.rooms);
        }
        group.items.push({
          text: action,
          completed: completed,
          source: src,
          guest: guest,
          rooms: rooms
        });
      });
    });

    return groups.map(function (g) {
      return {
        guest: g.guest,
        rooms: g.rooms,
        heading: g.heading,
        items: g.items
      };
    });
  }

  function formatPreparationLines(groups) {
    var lines = [];
    (groups || []).forEach(function (group) {
      lines.push({
        text: group.heading,
        isHeading: true,
        status: "info"
      });
      (group.items || []).forEach(function (item) {
        lines.push({
          text: (item.completed ? "☑ " : "☐ ") + item.text,
          status: item.completed ? "done" : "pending",
          completed: !!item.completed,
          guest: item.guest,
          rooms: item.rooms
        });
      });
    });
    return lines;
  }

  function extractMoneyLabel(src) {
    var m = String(src || "").match(/[£$€]\s*\d+(?:[.,]\d{1,2})?/);
    if (!m) return "";
    return m[0].replace(/\s+/g, "");
  }

  function buildOpenQuestions(analyzed) {
    var questions = [];
    var seen = {};

    (analyzed || []).forEach(function (note) {
      if (!note) return;
      var src = String(note.original || (note.fact && note.fact.sourceText) || "");
      if (!src) return;

      if (
        note.section === "completed" ||
        (note.fact && /^(done|resolved)$/i.test(note.fact.status || "")) ||
        /\b(?:confirmed|approved|collected|resolved|fixed|completed|done|already)\b/i.test(src) &&
          !isOpenQuestionCue(src)
      ) {
        return;
      }

      if (!isOpenQuestionCue(src) && !/\b(?:still\s+open|awaiting|hold\s+till|parts|not\s+on\s+file)\b/i.test(src)) {
        return;
      }

      if (/have all arrivals been reviewed|ensure all procedures|review remaining arrivals/i.test(src)) {
        return;
      }

      var guest = guestLabel(note);
      var rooms = (note.rooms && note.rooms.length)
        ? note.rooms.slice()
        : ((note.fact && note.fact.rooms) || []).slice();
      var room = roomLabel(rooms);

      /* Never generate anonymous questions — require guest or room context. */
      if (!room && !guest) return;

      var money = extractMoneyLabel(src);
      var task = "";

      if (/minibar/i.test(src)) {
        task = money
          ? "Has the outstanding minibar balance (" + money + ") been collected?"
          : "Has the outstanding minibar balance been collected?";
      } else if (/balance|outstanding|payment|paid|city\s+tax|folio/i.test(src)) {
        task = money
          ? "Has the outstanding balance (" + money + ") been paid before departure?"
          : "Has the outstanding balance been paid before departure?";
      } else if (/\bsafe\b/i.test(src)) {
        task = "Has Maintenance completed the safe repair?";
      } else if (/maint|repair|ac\b|dryer|leak|fault/i.test(src)) {
        task = "Has Maintenance completed the outstanding repair?";
      } else if (/taxi|transfer|addison|airport/i.test(src)) {
        task = "Has the airport transfer been confirmed?";
      } else if (/late\s+(?:check[\s-]?out|co)\b/i.test(src) && !/\bapproved\b/i.test(src)) {
        task = "Has the late check-out been approved?";
      } else if (/no\s*show/i.test(src)) {
        task = "Has the no-show been confirmed before releasing the room?";
      } else if (/mobile|phone|contact|not\s+on\s+file/i.test(src)) {
        task = "Is a contact number available?";
      } else {
        return;
      }

      /* Prefer room-first context when available; otherwise guest. */
      var prefix = room || guest;
      var key = (prefix + " " + task).toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      questions.push({
        text: prefix + "\n" + task,
        guest: guest,
        rooms: rooms,
        source: src,
        status: "pending"
      });
    });

    return questions;
  }

  var Api = {
    buildPreparationGroups: buildPreparationGroups,
    formatPreparationLines: formatPreparationLines,
    buildOpenQuestions: buildOpenQuestions,
    isPreparationCue: isPreparationCue,
    isOpenQuestionCue: isOpenQuestionCue,
    isCompletedCue: isCompletedCue
  };

  global.HFHandoverPreparations = Api;
  if (typeof module !== "undefined" && module.exports) module.exports = Api;
})(typeof window !== "undefined" ? window : globalThis);
