/**
 * Hospitality Flow — Hotel Snapshot metrics
 * Shared Occupancy / RevPAR calculation for workspace, demo, print and export.
 *
 * Formula (configurable later via options.mode):
 *   Sellable Rooms = Total Rooms − OOO Rooms
 *   Occupancy = Rooms Sold ÷ Sellable Rooms × 100
 *   RevPAR = ADR × Occupancy Rate
 */
(function (global) {
  "use strict";

  var EMPTY = "—";
  var DEFAULT_CURRENCY = "£";

  function toNumber(value) {
    if (value === null || value === undefined || value === "" || value === EMPTY) return null;
    if (typeof value === "number") {
      return isFinite(value) ? value : null;
    }
    if (typeof value === "object" && value.value != null) return toNumber(value.value);
    var match = String(value).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
    if (!match) return null;
    var num = parseFloat(match[0]);
    return isFinite(num) ? num : null;
  }

  function toInt(value) {
    var num = toNumber(value);
    if (num === null) return null;
    return Math.round(num);
  }

  function roundMoney(value) {
    if (value === null || !isFinite(value)) return null;
    return Math.round(value * 100) / 100;
  }

  function formatMoney(value, currency) {
    var num = typeof value === "number" ? value : toNumber(value);
    if (num === null || !isFinite(num)) return EMPTY;
    var symbol = currency || DEFAULT_CURRENCY;
    return symbol + roundMoney(num).toFixed(2);
  }

  function formatOccupancyPercent(value) {
    var num = typeof value === "number" ? value : toNumber(value);
    if (num === null || !isFinite(num)) return EMPTY;
    var clamped = Math.min(100, Math.max(0, num));
    return clamped.toFixed(1) + "%";
  }

  /**
   * Sellable rooms = totalRooms − oooRooms.
   * Returns null when inventory cannot be resolved safely.
   */
  function sellableRooms(totalRooms, oooRooms) {
    var total = toInt(totalRooms);
    var ooo = toInt(oooRooms);
    if (ooo == null) ooo = 0;
    if (total == null || total < 0) return null;
    if (ooo < 0) ooo = 0;
    if (ooo > total) return null;
    return total - ooo;
  }

  /**
   * Occupancy % from rooms sold ÷ sellable rooms.
   * Never returns NaN / Infinity.
   */
  function calculateOccupancy(roomsSold, totalRooms, oooRooms) {
    var sold = toInt(roomsSold);
    var sellable = sellableRooms(totalRooms, oooRooms);
    if (sold == null || sellable == null || sellable <= 0) return null;
    if (sold < 0) return null;
    return (sold / sellable) * 100;
  }

  /**
   * RevPAR = ADR × occupancy rate (0–1).
   */
  function calculateRevpar(adr, occupancyPercent) {
    var adrNum = toNumber(adr);
    var occ = typeof occupancyPercent === "number"
      ? occupancyPercent
      : toNumber(String(occupancyPercent || "").replace(/%+\s*$/, ""));
    if (adrNum == null || occ == null || !isFinite(adrNum) || !isFinite(occ)) return null;
    return roundMoney(adrNum * (occ / 100));
  }

  /**
   * Enrich a snapshot object with derived fields.
   * Does not invent room numbers for OOO notes.
   */
  function enrichSnapshot(snapshot, options) {
    options = options || {};
    var next = Object.assign({}, snapshot || {});
    var totalRooms = toInt(options.totalRooms != null ? options.totalRooms : next.totalRooms);
    var roomsSold = toInt(next.roomsSold);
    var oooRooms = toInt(next.oooRooms);
    if (oooRooms == null) oooRooms = 0;
    var arrivals = toInt(next.arrivals);
    var adults = toInt(next.adults);
    var children = toInt(next.children);
    var adr = toNumber(next.adr);
    var currency = options.currency || next.currency || DEFAULT_CURRENCY;

    var sellable = sellableRooms(totalRooms, oooRooms);
    var occupancy = calculateOccupancy(roomsSold, totalRooms, oooRooms);

    /*
     * Prefer sellable-inventory occupancy when available.
     * Display is rounded (one decimal); RevPAR uses the precise rate so
     * 60÷78 → 76.9% display and £219.23 RevPAR stay consistent.
     */
    if (occupancy != null && options.forceOccupancy !== false) {
      next.occupancy = formatOccupancyPercent(occupancy);
      next.occupancyValue = occupancy;
    } else {
      var fallbackOcc = toNumber(String(next.occupancy || "").replace(/%+\s*$/, ""));
      if (fallbackOcc != null) {
        occupancy = fallbackOcc;
        next.occupancyValue = fallbackOcc;
        next.occupancy = formatOccupancyPercent(fallbackOcc);
      }
    }

    /* RevPAR always derived when ADR + occupancy exist — read-only product rule. */
    var revpar = calculateRevpar(adr, occupancy != null ? occupancy : next.occupancy);
    if (revpar != null) {
      next.revpar = formatMoney(revpar, currency);
      next.revparValue = revpar;
    } else if (options.clearInvalidRevpar) {
      next.revpar = "";
      next.revparValue = null;
    }

    if (
      (next.roomsAvailable == null || next.roomsAvailable === "" || next.roomsAvailable === EMPTY) &&
      sellable != null && roomsSold != null && sellable >= roomsSold
    ) {
      next.roomsAvailable = String(sellable - roomsSold);
    }

    if (
      (next.stayovers == null || next.stayovers === "" || next.stayovers === EMPTY) &&
      roomsSold != null && arrivals != null && roomsSold >= arrivals
    ) {
      next.stayovers = String(roomsSold - arrivals);
    }

    if (
      (next.inHouse == null || next.inHouse === "" || next.inHouse === EMPTY) &&
      adults != null && children != null
    ) {
      next.inHouse = String(adults + children);
    }

    if (oooRooms != null) next.oooRooms = String(oooRooms);
    if (sellable != null) next.sellableRooms = sellable;

    return next;
  }

  /**
   * Compact display lines for copy / plain export.
   */
  function buildCompactDisplayLines(snapshot, options) {
    options = options || {};
    var s = enrichSnapshot(snapshot || {}, options);
    var lines = [];
    var currency = options.currency || s.currency || DEFAULT_CURRENCY;

    function val(id) {
      var v = s[id];
      return v == null || v === "" || v === EMPTY ? null : String(v);
    }

    var ops = [];
    if (val("arrivals") != null) ops.push("Arrivals " + val("arrivals"));
    if (val("departures") != null) ops.push("Departures " + val("departures"));
    if (val("stayovers") != null) ops.push("Stayovers " + val("stayovers"));
    if (val("inHouse") != null) ops.push("Guests in House " + val("inHouse"));
    if (ops.length) lines.push({ group: "Operations", line: ops.join("  ·  ") });

    var inventory = [];
    if (val("roomsSold") != null) inventory.push("Rooms Sold " + val("roomsSold"));
    if (val("roomsAvailable") != null) inventory.push("Rooms Available " + val("roomsAvailable"));
    if (val("oooRooms") != null) inventory.push("OOO Rooms " + val("oooRooms"));
    if (val("occupancy") != null) {
      inventory.push("Occupancy " + formatOccupancyPercent(val("occupancy")));
    }
    if (inventory.length) lines.push({ group: "Inventory", line: inventory.join("  ·  ") });

    var revenue = [];
    if (val("adr") != null) revenue.push("ADR " + formatMoney(val("adr"), currency));
    if (val("revpar") != null) revenue.push("RevPAR " + formatMoney(val("revpar"), currency));
    if (revenue.length) lines.push({ group: "Revenue", line: revenue.join("  ·  ") });

    return lines;
  }

  var Api = {
    EMPTY: EMPTY,
    toNumber: toNumber,
    toInt: toInt,
    roundMoney: roundMoney,
    formatMoney: formatMoney,
    formatOccupancyPercent: formatOccupancyPercent,
    sellableRooms: sellableRooms,
    calculateOccupancy: calculateOccupancy,
    calculateRevpar: calculateRevpar,
    enrichSnapshot: enrichSnapshot,
    buildCompactDisplayLines: buildCompactDisplayLines
  };

  global.HFHotelSnapshotMetrics = Api;
  if (typeof module !== "undefined" && module.exports) module.exports = Api;
})(typeof window !== "undefined" ? window : globalThis);
