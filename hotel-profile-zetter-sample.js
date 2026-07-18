/**
 * Hospitality Flow — Zetter Marylebone sample operational knowledge (editable configuration).
 * Loaded by hotel-profile-operational.js. Not hardcoded into handover or Shift Intelligence.
 */
(function (global) {
  "use strict";

  var SAMPLE_ID = "zetter-marylebone-v1";
  var SAMPLE_LABEL = "Zetter Marylebone Test Knowledge";

  function entry(id, category, title, content, opts) {
    opts = opts || {};
    return {
      id: "ok-" + id,
      sampleDataId: SAMPLE_ID + ":" + id,
      category: category,
      title: title,
      content: content,
      department: opts.department || "Reception",
      shifts: opts.shifts || ["night", "am", "pm", "middle"],
      priority: opts.priority || "normal",
      required: opts.required !== false,
      optional: !!opts.optional,
      timing: opts.timing || "",
      checklistEnabled: opts.checklistEnabled !== false,
      triggerKeywords: opts.triggerKeywords || [],
      triggersRequired: !!opts.triggersRequired,
      followUpInstruction: opts.followUpInstruction || "",
      active: opts.active !== false,
      notes: opts.notes || "",
      isSampleData: true
    };
  }

  function nightStep(order, id, title, opts) {
    opts = opts || {};
    return {
      id: "wf-night-" + id,
      sampleDataId: SAMPLE_ID + ":night:" + id,
      order: order,
      title: title,
      department: opts.department || "Night Team",
      required: opts.required !== false,
      optional: !!opts.optional,
      timing: opts.timing || "",
      checklistEnabled: opts.checklistEnabled !== false,
      triggerKeywords: opts.triggerKeywords || [],
      active: opts.active !== false,
      notes: opts.notes || "",
      isSampleData: true
    };
  }

  function buildNightWorkflow() {
    return [
      nightStep(1, "takeover", "Take over from the PM shift between approximately 23:00 and 23:30.", { timing: "23:00–23:30", department: "Night Team" }),
      nightStep(2, "pm-handover", "Review the PM handover carefully.", { department: "Night Team" }),
      nightStep(3, "ops-email", "Check operational emails.", { department: "Night Team" }),
      nightStep(4, "dm-email", "Check Duty Manager emails where relevant.", { department: "Duty Management", optional: true }),
      nightStep(5, "open-tasks", "Review outstanding issues and open tasks.", { department: "Night Team", triggerKeywords: ["outstanding", "open task", "follow up"], triggersRequired: false }),
      nightStep(6, "remaining-arrivals", "Review remaining arrivals and late arrivals.", { department: "Reception", triggerKeywords: ["arrival", "late arrival", "checking in"], triggersRequired: false }),
      nightStep(7, "vip-regular", "Review VIPs, regular guests and special requests.", { department: "Reception", triggerKeywords: ["vip", "regular guest", "special request"], triggersRequired: false }),
      nightStep(8, "wake-up", "Check wake-up calls.", { department: "Reception", triggerKeywords: ["wake-up call", "wakeup call"], triggersRequired: false }),
      nightStep(9, "transfers", "Check airport transfers.", { department: "Reception", triggerKeywords: ["airport transfer", "transfer"], triggersRequired: false }),
      nightStep(10, "late-early", "Review late check-outs and early arrival information.", { department: "Reception", triggerKeywords: ["late checkout", "early arrival"], triggersRequired: false }),
      nightStep(11, "balances", "Review outstanding payments and open balances.", { department: "Reception", triggerKeywords: ["outstanding", "balance", "payment", "folio"], triggersRequired: false }),
      nightStep(12, "glitch", "Review glitch or guest-issue reports.", { department: "Duty Management", triggerKeywords: ["glitch", "complaint", "guest issue"], triggersRequired: false }),
      nightStep(13, "hk-release", "Review housekeeping updates and room-release status.", { department: "Housekeeping", triggerKeywords: ["housekeeping", "room release", "dirty", "released"], triggersRequired: false }),
      nightStep(14, "checkins", "Complete any remaining check-ins.", { department: "Reception" }),
      nightStep(15, "eod", "Run End of Day after remaining arrivals have been handled.", { department: "Night Team", timing: "After arrivals", priority: "high" }),
      nightStep(16, "pm-accounts", "Complete relevant PM accounts or account postings.", { department: "Night Team" }),
      nightStep(17, "next-day", "Review the following day's arrivals and departures.", { department: "Night Team" }),
      nightStep(18, "allocations", "Review and complete room allocations where required.", { department: "Reception", triggerKeywords: ["room allocation", "allocate"], triggersRequired: false }),
      nightStep(19, "reg-cards", "Prepare registration cards.", { department: "Reception" }),
      nightStep(20, "welcome-cards", "Prepare welcome cards.", { department: "Reception", triggerKeywords: ["welcome card", "vip"], triggersRequired: false }),
      nightStep(21, "ota-contact", "Review OTA contact information and replace incomplete contact details where required.", { department: "Reception", triggerKeywords: ["ota", "missing phone", "missing email"], triggersRequired: false }),
      nightStep(22, "packages", "Review packages, balloons, special occasions and special requests.", { department: "Reception", triggerKeywords: ["package", "balloon", "birthday", "special occasion"], triggersRequired: false }),
      nightStep(23, "vip-benefits", "Review VIP benefits, discounts and invoice instructions.", { department: "Duty Management", triggerKeywords: ["vip", "discount", "invoice"], triggersRequired: false }),
      nightStep(24, "no-shows", "Review no-shows and required follow-up.", { department: "Reception", triggerKeywords: ["no show", "no-show"], triggersRequired: false }),
      nightStep(25, "reports", "Prepare reports and the morning handover.", { department: "Night Team" }),
      nightStep(26, "line-up", "Prepare or update the Daily Line-Up where required.", { department: "Duty Management", optional: true })
    ];
  }

  function buildKnowledgeEntries() {
    var list = [];
    list.push(entry("comm-standard", "Communication", "British English operational handover standard",
      "Use British English. Be concise but operationally complete. Prioritise unresolved and urgent matters. Clearly identify ownership. Include room numbers and timing where provided. Separate completed actions from outstanding actions. Never invent facts. Never assume a task was completed.",
      { department: "Management", shifts: ["night", "am", "pm", "middle"], checklistEnabled: false }));

    list.push(entry("fragmented-sources", "Operations", "Fragmented information principle",
      "Information is currently fragmented across several sources. Hospitality Flow should help consolidate important operational information into one clear handover without claiming to replace the PMS.",
      { department: "Management", checklistEnabled: false }));

    list.push(entry("vip-prep", "VIP", "VIP preparation procedure",
      "Review VIP notes before arrival. Confirm room allocation. Prepare welcome card when required. Confirm amenities or packages. Brief the next shift. Confirm benefits, discounts and invoice instructions. Verify agreed discounts are applied to the final invoice.",
      { department: "Duty Management", triggerKeywords: ["vip"], triggersRequired: true, priority: "high" }));

    list.push(entry("regular-guests", "Guest Services", "Regular guest preferences",
      "Review stored room preferences. Avoid unsuitable room allocation where known. Regular guests may prefer higher floors. Do not assume every regular guest has the same preference.",
      { department: "Reception", triggerKeywords: ["regular guest", "returning guest"], triggersRequired: false }));

    list.push(entry("physical-keys", "Security", "Physical key procedure",
      "The property uses physical room keys. Issue keys during check-in. Track unreturned keys. Remind guests to return keys at checkout. Contact guests when keys are taken accidentally. Support postal return. Record lost or unreturned keys. Configured replacement charge: £150 (editable).",
      { department: "Reception", triggerKeywords: ["physical key", "key not returned", "lost key", "guest took key", "key follow-up"], triggersRequired: false, priority: "high" }));

    list.push(entry("adapters", "Guest Services", "Travel adapter loan procedure",
      "Adapters are issued to guests. Track which room received the adapter. Confirm return before or during checkout. Configured charge or deposit: £20 (editable). Low stock should generate an operational reminder.",
      { department: "Reception", triggerKeywords: ["adapter", "travel adapter"], triggersRequired: false }));

    list.push(entry("airport-transfers", "Guest Services", "Airport transfer workflow",
      "Record transfer time. Confirm booking or supplier. Confirm guest details in the operational record. Pass unresolved transfers to the next shift. Do not invent confirmation status.",
      { department: "Reception", triggerKeywords: ["airport transfer", "transfer", "taxi"], triggersRequired: true }));

    list.push(entry("wake-up-calls", "Guest Services", "Wake-up call workflow",
      "Record requested time. Review scheduled calls during shift takeover. Confirm completed calls in the operational record. Pass missed or unresolved calls clearly.",
      { department: "Reception", triggerKeywords: ["wake-up call", "wakeup call"], triggersRequired: true }));

    list.push(entry("packages-occasions", "Guest Services", "Packages and special occasions",
      "Review seasonal packages, birthday packages, balloons, welcome arrangements and special requests. Confirm timing, responsible department and follow-up.",
      { department: "Reception", triggerKeywords: ["package", "balloon", "birthday", "special occasion"], triggersRequired: true }));

    list.push(entry("arrival-checks", "Arrivals", "Arrival procedure checks",
      "Review remaining arrivals, late arrivals, VIP status, regular-guest preferences, room allocation, accessible-room requirements, interconnecting-room requests, registration cards, welcome cards, packages, prepayments, outstanding balances, OTA contact details and guest-profile data quality.",
      { department: "Reception", shifts: ["night", "pm", "middle"], triggerKeywords: ["arrival", "checking in"], triggersRequired: false, priority: "high" }));

    list.push(entry("room-attributes", "Arrivals", "Room attribute reference (staff allocation)",
      "Use configured room attributes as factual reference — bed size, twin capability, extra bed, sofa bed, accessible, street facing, dark room, bathtub and interconnecting pairs. Shower configuration is unknown unless separately confirmed. Room allocation remains a staff decision.",
      { department: "Reception", checklistEnabled: false, triggerKeywords: ["twin", "accessible", "interconnect", "bathtub", "sofa bed", "extra bed", "street facing", "dark room", "room allocation"], triggersRequired: false }));

    list.push(entry("departure-checks", "Departures", "Departure procedure checks",
      "Review open balance, final invoice, discounts or benefits applied, late checkout, physical key returned, loan items returned, airport transfer, invoice request, outstanding guest complaint, lost property, luggage storage and follow-up required.",
      { department: "Reception", shifts: ["am", "pm", "middle"], triggerKeywords: ["departure", "checkout", "check out"], triggersRequired: false }));

    list.push(entry("hk-release", "Housekeeping", "Housekeeping and room release",
      "Review housekeeping status during shift takeover. Track rooms awaiting release. Prioritise rooms when arrival or operational urgency requires it. Pass unresolved room-release issues to the next shift. Do not claim a room is ready unless confirmed.",
      { department: "Housekeeping", triggerKeywords: ["room not released", "waiting for housekeeping", "room ready", "dirty room", "inspected", "out of order", "out of service"], triggersRequired: false, priority: "high" }));

    list.push(entry("maintenance", "Maintenance", "Maintenance follow-up knowledge",
      "Record room number or location. Describe the issue. Record whether Maintenance was informed. Record guest impact and temporary solution. Record completion only when confirmed. Escalate urgent safety or room-availability issues.",
      { department: "Maintenance", triggerKeywords: ["maintenance", "repair", "broken", "leak", "not working"], triggersRequired: true, priority: "high" }));

    list.push(entry("maint-priority-urgent", "Maintenance", "Maintenance priority — Urgent",
      "Safety issue; security issue; water leak; electrical risk; guest cannot safely use the room.",
      { department: "Maintenance", priority: "urgent", checklistEnabled: false }));

    list.push(entry("maint-priority-high", "Maintenance", "Maintenance priority — High",
      "Guest-impacting issue; room may become unavailable; repeat complaint; issue affecting arrival readiness.",
      { department: "Maintenance", priority: "high", checklistEnabled: false }));

    list.push(entry("maint-priority-normal", "Maintenance", "Maintenance priority — Normal",
      "Minor defect without immediate guest impact.",
      { department: "Maintenance", priority: "normal", checklistEnabled: false }));

    list.push(entry("lost-property", "Guest Services", "Lost property procedure",
      "Record item, date found, location, storage location, guest contact status, collection status, postage status and required follow-up. Use the configured retention or disposal policy.",
      { department: "Reception", triggerKeywords: ["lost property", "lost item", "left item"], triggersRequired: true }));

    list.push(entry("no-shows", "Finance", "No-show procedure",
      "Confirm reservation status. Review payment or guarantee rules. Apply hotel-configured no-show procedure. Record required financial follow-up. Update the operational tracker. Pass unresolved cases to the next shift.",
      { department: "Reception", triggerKeywords: ["no show", "no-show"], triggersRequired: true }));

    list.push(entry("complaints", "Guest Services", "Guest complaints and glitch reports",
      "Record complaint clearly with room or area when relevant. Record action already taken and authorised compensation only. Record owner for follow-up and status. Pass unresolved complaints to the next shift. Include relevant issues in the glitch or guest-issue report.",
      { department: "Duty Management", triggerKeywords: ["complaint", "glitch", "unhappy", "escalat"], triggersRequired: true, priority: "high" }));

    list.push(entry("expedia-prepaid", "Payments", "Expedia prepaid operational note",
      "Hotel-configured understanding: charging may be completed after 05:00 on the day of arrival. OTA rules and contracts must be verified by management.",
      { department: "Reception", checklistEnabled: false }));

    list.push(entry("booking-prepaid", "Payments", "Booking.com prepaid operational note",
      "Hotel-configured understanding: charging may be completed immediately. OTA rules and contracts must be verified by management.",
      { department: "Reception", checklistEnabled: false }));

    list.push(entry("payment-checks", "Finance", "Payment and balance checks",
      "Review outstanding balances, open balances, failed payments, pay-on-arrival reservations, deposits, no-show charges, refund procedures, chargeback risk and missing invoice discounts.",
      { department: "Reception", triggerKeywords: ["outstanding", "balance", "payment", "folio", "deposit"], triggersRequired: false, priority: "high" }));

    list.push(entry("inventory-supplies", "Inventory", "Operational supply monitoring",
      "Monitor welcome cards, printer cartridges, pens, pencils, sticky notes, travel adapters, registration-card paper and guest loan items. Record low-stock notes and reorder instructions.",
      { department: "Reception", triggerKeywords: ["low stock", "out of stock", "welcome card", "cartridge", "adapter"], triggersRequired: false }));

    return list;
  }

  function buildHandoverSources() {
    return [
      { id: "src-opera", sampleDataId: SAMPLE_ID + ":src:opera", name: "Opera Cloud PMS", description: "Primary property management system.", active: true, isSampleData: true },
      { id: "src-handover", sampleDataId: SAMPLE_ID + ":src:handover", name: "Shift handover notes", description: "Written shift-to-shift notes.", active: true, isSampleData: true },
      { id: "src-board", sampleDataId: SAMPLE_ID + ":src:board", name: "Operational board", description: "Printed or digital operational board.", active: true, isSampleData: true },
      { id: "src-work-email", sampleDataId: SAMPLE_ID + ":src:work-email", name: "Work email", description: "Operational work email.", active: true, isSampleData: true },
      { id: "src-dm-email", sampleDataId: SAMPLE_ID + ":src:dm-email", name: "Duty Manager email", description: "Duty Manager communications.", active: true, isSampleData: true },
      { id: "src-glitch", sampleDataId: SAMPLE_ID + ":src:glitch", name: "Glitch or guest-issue report", description: "Guest issue tracking report.", active: true, isSampleData: true },
      { id: "src-hk", sampleDataId: SAMPLE_ID + ":src:hk", name: "Housekeeping updates", description: "Housekeeping status updates.", active: true, isSampleData: true },
      { id: "src-whatsapp", sampleDataId: SAMPLE_ID + ":src:whatsapp", name: "WhatsApp / informal team communication", description: "Informal team messages — verify in official records.", active: true, isSampleData: true },
      { id: "src-adr", sampleDataId: SAMPLE_ID + ":src:adr", name: "Arrival and departure reports", description: "Daily arrival and departure reports.", active: true, isSampleData: true },
      { id: "src-lineup", sampleDataId: SAMPLE_ID + ":src:lineup", name: "Daily Line-Up", description: "Daily operational line-up document.", active: true, isSampleData: true }
    ];
  }

  function buildDailyMetrics() {
    return [
      "arrivals", "departures", "inHouse", "occupancy", "roomsSold", "adr",
      "vips", "maintenance", "airportTransfers", "wakeUpCalls", "openBalances",
      "noShows", "outstandingTasks"
    ].map(function (key) {
      var labels = {
        arrivals: "Arrivals", departures: "Departures", inHouse: "In-house guests / rooms",
        occupancy: "Occupancy", roomsSold: "Rooms sold", adr: "ADR", vips: "VIPs",
        maintenance: "Maintenance issues", airportTransfers: "Airport transfers",
        wakeUpCalls: "Wake-up calls", openBalances: "Open balances", noShows: "No-shows",
        outstandingTasks: "Outstanding tasks"
      };
      return {
        id: "metric-" + key,
        sampleDataId: SAMPLE_ID + ":metric:" + key,
        key: key,
        label: labels[key] || key,
        enabled: true,
        isSampleData: true
      };
    });
  }

  function buildRoomTypes() {
    return [
      { code: "DDB", type: "Deluxe Double", count: "7", floors: "Various", maxGuests: "2", sampleDataId: SAMPLE_ID + ":roomtype:ddb", isSampleData: true },
      { code: "DDK", type: "Deluxe King", count: "12", floors: "Various", maxGuests: "2", sampleDataId: SAMPLE_ID + ":roomtype:ddk", isSampleData: true },
      { code: "JNS", type: "Junior Suite", count: "4", floors: "Various", maxGuests: "2", sampleDataId: SAMPLE_ID + ":roomtype:jns", isSampleData: true },
      { code: "LL", type: "Lear's Loft", count: "1", floors: "Premium", maxGuests: "2", sampleDataId: SAMPLE_ID + ":roomtype:ll", isSampleData: true }
    ];
  }

  function buildRoomFacilities() {
    var confirmed = {
      "1": { bedType: "King", streetFacing: true, bathtub: true, darkRoom: true },
      "2": { bedType: "King", twinCapable: true, extraBedCapable: true, streetFacing: true, bathtub: true, darkRoom: true },
      "3": { bedType: "King", darkRoom: true },
      "4": { bedType: "Queen", darkRoom: true },
      "5": { bedType: "Queen", darkRoom: true },
      "11": { bedType: "Super King", sofaBed: true, streetFacing: true, bathtub: true },
      "12": { bedType: "Super King", sofaBed: true, streetFacing: true, bathtub: true },
      "14": { bedType: "Queen", bathtub: true, darkRoom: true },
      "15": { bedType: "Queen", bathtub: true },
      "16": { bedType: "Super King", sofaBed: true, bathtub: true, darkRoom: true },
      "21": { bedType: "King", streetFacing: true, bathtub: true },
      "22": { bedType: "Queen", streetFacing: true, bathtub: true },
      "23": { bedType: "King", twinCapable: true, extraBedCapable: true, streetFacing: true, bathtub: true, accessible: true },
      "24": { bedType: "Queen", bathtub: true, connectingRoom: "25" },
      "25": { bedType: "King", twinCapable: true, connectingRoom: "24" },
      "31": { bedType: "King", streetFacing: true, bathtub: true },
      "32": { bedType: "Queen", streetFacing: true, bathtub: true },
      "33": { bedType: "King", twinCapable: true, extraBedCapable: true, streetFacing: true, accessible: true },
      "34": { bedType: "Queen", bathtub: true, connectingRoom: "35" },
      "35": { bedType: "King", twinCapable: true, connectingRoom: "34" },
      "41": { bedType: "Super King", streetFacing: true, bathtub: true },
      "42": { bedType: "King", streetFacing: true, bathtub: true },
      "43": { bedType: "King", twinCapable: true, streetFacing: true, accessible: true },
      "lear's loft": { bedType: "Super King", sofaBed: true }
    };

    var layout = [
      { roomNo: "1", floor: "Lower ground", lowerGround: true, notes: "Lower-ground room" },
      { roomNo: "2", floor: "Lower ground", lowerGround: true, notes: "Lower-ground room" },
      { roomNo: "3", floor: "Lower ground", lowerGround: true, notes: "Lower-ground room" },
      { roomNo: "4", floor: "Lower ground", lowerGround: true, notes: "Lower-ground room" },
      { roomNo: "5", floor: "Lower ground", lowerGround: true, notes: "Lower-ground room" },
      { roomNo: "11", floor: "1" },
      { roomNo: "12", floor: "1" },
      { roomNo: "14", floor: "1" },
      { roomNo: "15", floor: "1" },
      { roomNo: "16", floor: "1" },
      { roomNo: "21", floor: "2" },
      { roomNo: "22", floor: "2" },
      { roomNo: "23", floor: "2", notes: "Accessible room" },
      { roomNo: "24", floor: "2" },
      { roomNo: "25", floor: "2" },
      { roomNo: "31", floor: "3" },
      { roomNo: "32", floor: "3" },
      { roomNo: "33", floor: "3", notes: "Accessible room" },
      { roomNo: "34", floor: "3" },
      { roomNo: "35", floor: "3" },
      { roomNo: "41", floor: "4" },
      { roomNo: "42", floor: "4" },
      { roomNo: "43", floor: "4", notes: "Accessible room" },
      { roomNo: "Lear's Loft", floor: "Premium", notes: "Premium room category — Lear's Loft" }
    ];

    function normalizeRoomKey(roomNo) {
      return String(roomNo || "").trim().toLowerCase();
    }

    function sampleRoomId(roomNo) {
      return SAMPLE_ID + ":room:" + normalizeRoomKey(roomNo).replace(/'/g, "");
    }

    return layout.map(function (item) {
      var attrs = confirmed[normalizeRoomKey(item.roomNo)] || {};
      return {
        roomNo: item.roomNo,
        roomType: "",
        floor: item.floor,
        bedType: attrs.bedType || "",
        twinCapable: !!attrs.twinCapable,
        extraBedCapable: !!attrs.extraBedCapable,
        sofaBed: !!attrs.sofaBed,
        streetFacing: !!attrs.streetFacing,
        bathtub: !!attrs.bathtub,
        shower: false,
        accessible: !!attrs.accessible,
        connectingRoom: attrs.connectingRoom || "",
        quietFacing: false,
        darkRoom: !!attrs.darkRoom,
        lowerGround: !!item.lowerGround,
        maxOccupancy: "2",
        notes: item.notes || "",
        customFeatures: "",
        sampleDataId: sampleRoomId(item.roomNo),
        isSampleData: true
      };
    });
  }

  function buildDepartments() {
    return [
      { name: "Reception", head: "", contact: "", email: "", instructions: "Front office and guest-facing operations.", sampleDataId: SAMPLE_ID + ":dept:reception", isSampleData: true },
      { name: "Night Team", head: "", contact: "", email: "", instructions: "Night shift operations, End of Day and night audit.", sampleDataId: SAMPLE_ID + ":dept:night", isSampleData: true },
      { name: "Duty Management", head: "", contact: "", email: "", instructions: "Duty Managers cover AM, PM and Middle shifts.", sampleDataId: SAMPLE_ID + ":dept:dm", isSampleData: true },
      { name: "Housekeeping", head: "", contact: "", email: "", instructions: "Room cleaning, release and housekeeping coordination.", sampleDataId: SAMPLE_ID + ":dept:hk", isSampleData: true },
      { name: "Maintenance", head: "", contact: "", email: "", instructions: "Maintenance issues and engineering follow-up.", sampleDataId: SAMPLE_ID + ":dept:maint", isSampleData: true },
      { name: "Food and Beverage", head: "", contact: "", email: "", instructions: "Restaurant, bar and breakfast service.", sampleDataId: SAMPLE_ID + ":dept:fb", isSampleData: true },
      { name: "Management", head: "", contact: "", email: "", instructions: "Management oversight and escalation.", sampleDataId: SAMPLE_ID + ":dept:mgmt", isSampleData: true }
    ];
  }

  function buildShifts() {
    return {
      pattern: "8hour",
      overnightSupport: true,
      rows: [
        { code: "AM", name: "AM", start: "07:00", end: "15:00", dept: "Reception", sampleDataId: SAMPLE_ID + ":shift:am", isSampleData: true },
        { code: "PM", name: "PM", start: "15:00", end: "23:00", dept: "Reception", sampleDataId: SAMPLE_ID + ":shift:pm", isSampleData: true },
        { code: "Middle", name: "Middle", start: "10:00", end: "18:00", dept: "Duty Management", sampleDataId: SAMPLE_ID + ":shift:middle", isSampleData: true },
        { code: "Night", name: "Night", start: "23:00", end: "07:00", dept: "Night Team", sampleDataId: SAMPLE_ID + ":shift:night", isSampleData: true }
      ]
    };
  }

  function buildTerminology() {
    return [
      { term: "DDB", definition: "Deluxe Double room type code" },
      { term: "DDK", definition: "Deluxe King room type code" },
      { term: "JNS", definition: "Junior Suite room type code" },
      { term: "LL", definition: "Lear's Loft premium room category" },
      { term: "End of Day", definition: "Opera End of Day / night close procedure" },
      { term: "Daily Line-Up", definition: "Daily operational briefing document" }
    ].map(function (t, i) {
      t.sampleDataId = SAMPLE_ID + ":term:" + i;
      t.isSampleData = true;
      return t;
    });
  }

  function buildSampleProfilePatch() {
    return {
      sampleId: SAMPLE_ID,
      sampleLabel: SAMPLE_LABEL,
      general: {
        hotelName: "The Zetter Marylebone",
        hotelType: "Independent luxury boutique hotel",
        totalRooms: "24",
        brandVoice: "Professional, warm, clear and concise",
        operatingNotes: "Highly personalised boutique service. Individual guest preferences matter. Strong communication between shifts. Operational information comes from several systems and documents. Guest issues should be passed clearly with ownership and follow-up. Never invent guest information. Never mark a task complete unless the notes confirm completion."
      },
      aiPrefs: {
        tone: "professional",
        detail: "standard",
        language: "British English",
        dateFormat: "DD/MM/YYYY (24-hour)",
        instructions: "Use British English. Be concise but operationally complete. Prioritise unresolved and urgent matters. Clearly identify ownership. Include room numbers where provided. Never invent facts. Never assume a task was completed."
      },
      departments: buildDepartments(),
      shifts: buildShifts(),
      rooms: buildRoomTypes(),
      roomFacilities: buildRoomFacilities(),
      terminology: buildTerminology(),
      hotelKnowledge: {
        generalNotes: "The Zetter Marylebone is a 24-room independent luxury boutique hotel. Service is highly personalised and shift communication is critical.",
        hotelStandards: "Professional, warm, clear and concise communication. Pass operational issues with ownership and follow-up. Never invent guest information.",
        vipRules: "Review VIP notes before arrival. Confirm room allocation, welcome cards and amenities. Brief the next shift. Confirm benefits, discounts and invoice instructions.",
        commonTerms: "DDB = Deluxe Double\nDDK = Deluxe King\nJNS = Junior Suite\nLL = Lear's Loft",
        operationalNotes: "Information is fragmented across Opera, email, handover notes, the operational board and Daily Line-Up. Consolidate clearly without replacing the PMS.",
        localRecommendations: "",
        aiInstructions: "Use British English. Be concise but operationally complete. Prioritise unresolved and urgent matters. Include room numbers and timing where provided. Never invent facts. Never assume a task was completed. Avoid duplicating the same issue across sections."
      },
      guestServices: {
        airportTransfers: "Record transfer time, supplier and guest details. Pass unresolved transfers to the next shift.",
        wakeUpCalls: "Record requested time. Review during shift takeover. Confirm completed calls in the operational record.",
        guestItemLoans: "Track loan items by room. Confirm return at checkout. Adapters: configured £20 charge/deposit (editable).",
        specialOccasions: "Review packages, balloons, birthdays and welcome arrangements.",
        welcomeAmenities: "Confirm VIP and special-request amenities before arrival.",
        customInstructions: "Do not store unnecessary personal data in permanent Hotel Brain knowledge.",
        loanItems: [
          { item: "Travel adapter", notes: "Track by room. Configured £20 charge/deposit (editable)." },
          { item: "Umbrella", notes: "Track by room. Confirm return at checkout." },
          { item: "Phone charger", notes: "Track by room. Confirm return at checkout." }
        ]
      },
      supplies: [
        { name: "Travel adapters", category: "Guest loan items", minStock: "5", replacementCharge: "20", guestCharge: "20", loanItem: "yes", reorderNotes: "Monitor stock — low stock generates operational reminder.", sampleDataId: SAMPLE_ID + ":supply:adapters", isSampleData: true },
        { name: "Welcome cards", category: "Welcome materials", minStock: "10", reorderNotes: "Welcome cards can run low — monitor stock.", sampleDataId: SAMPLE_ID + ":supply:welcome", isSampleData: true },
        { name: "Printer cartridges", category: "Printing supplies", reorderNotes: "Monitor printer cartridge levels.", sampleDataId: SAMPLE_ID + ":supply:cartridges", isSampleData: true },
        { name: "Registration card paper", category: "Printing supplies", sampleDataId: SAMPLE_ID + ":supply:regcards", isSampleData: true },
        { name: "Pens and pencils", category: "Stationery", sampleDataId: SAMPLE_ID + ":supply:stationery", isSampleData: true },
        { name: "Sticky notes", category: "Stationery", reorderNotes: "Basic stationery shortages affect operations.", sampleDataId: SAMPLE_ID + ":supply:stickies", isSampleData: true }
      ],
      otaChannels: [
        {
          type: "expedia", label: "Expedia",
          specialInstructions: "Hotel-configured operational understanding: charging may be completed after 05:00 on the day of arrival. OTA rules and contracts must be verified by management.",
          sampleDataId: SAMPLE_ID + ":ota:expedia", isSampleData: true
        },
        {
          type: "bookingCom", label: "Booking.com",
          specialInstructions: "Hotel-configured operational understanding: charging may be completed immediately. OTA rules and contracts must be verified by management.",
          sampleDataId: SAMPLE_ID + ":ota:booking", isSampleData: true
        }
      ],
      policiesStructured: {
        operational: {
          physicalKeys: {
            title: "Physical keys",
            summary: "Physical room keys — issue, track and follow up unreturned keys.",
            instructions: "Issue keys during check-in. Track unreturned keys. Remind guests at checkout. Contact guests when keys are taken accidentally. Support postal return. Configured replacement charge: £150 (editable). Responsible: Reception and Duty Management.",
            charge: "£150"
          },
          lostProperty: {
            title: "Lost property",
            summary: "Record, store and follow up lost property items.",
            instructions: "Record item, date found, location, storage, guest contact, collection and postage status. Follow configured retention or disposal policy."
          },
          guestLoanItems: {
            title: "Guest loan items",
            summary: "Track adapters and other loan items by room.",
            instructions: "Issue adapters and loan items to guests. Track by room. Confirm return at checkout. Adapter configured charge/deposit: £20 (editable)."
          },
          complaints: {
            title: "Guest complaints",
            summary: "Record, escalate and hand over guest complaints.",
            instructions: "Record complaint clearly. Record action taken and authorised compensation only. Record follow-up owner and status."
          }
        }
      },
      operationsTrackers: [
        { key: "physicalKeys", label: "Physical keys", enabled: true, notes: "Track unreturned physical room keys.", sampleDataId: SAMPLE_ID + ":tracker:keys", isSampleData: true },
        { key: "lostProperty", label: "Lost property", enabled: true, sampleDataId: SAMPLE_ID + ":tracker:lost", isSampleData: true },
        { key: "noShows", label: "No-shows", enabled: true, sampleDataId: SAMPLE_ID + ":tracker:noshow", isSampleData: true },
        { key: "openBalances", label: "Open balances", enabled: true, sampleDataId: SAMPLE_ID + ":tracker:balances", isSampleData: true },
        { key: "airportTransfers", label: "Airport transfers", enabled: true, sampleDataId: SAMPLE_ID + ":tracker:transfers", isSampleData: true },
        { key: "dailyLineup", label: "Daily lineup", enabled: true, sampleDataId: SAMPLE_ID + ":tracker:lineup", isSampleData: true },
        { key: "glitchReport", label: "Glitch report", enabled: true, sampleDataId: SAMPLE_ID + ":tracker:glitch", isSampleData: true }
      ],
      operationalKnowledge: {
        staffingContext: "Duty Managers cover AM, PM and Middle shifts (Middle commonly 10:00–18:00). Night Managers cover five nights per week; Duty Managers cover the remaining two nights. House Manager operates similarly to a General Manager. This is operational context, not a rigid global rule.",
        handoverSources: buildHandoverSources(),
        dailyMetrics: buildDailyMetrics(),
        knowledgeEntries: buildKnowledgeEntries(),
        shiftWorkflows: {
          night: { shiftType: "night", label: "Night Shift", steps: buildNightWorkflow() },
          am: { shiftType: "am", label: "AM Shift", steps: [] },
          pm: { shiftType: "pm", label: "PM Shift", steps: [] },
          middle: { shiftType: "middle", label: "Middle Shift", steps: [] }
        },
        sampleDataLoaded: {}
      }
    };
  }

  global.HotelProfileZetterSample = {
    SAMPLE_ID: SAMPLE_ID,
    SAMPLE_LABEL: SAMPLE_LABEL,
    buildSampleProfilePatch: buildSampleProfilePatch
  };
})(typeof window !== "undefined" ? window : globalThis);
