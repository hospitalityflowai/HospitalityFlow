/**
 * Hospitality Flow — Oakwood Mayfair Demo Mode sample pack
 * Fully fictional boutique hotel. Canonical room inventory is the single source of truth.
 * Demo Mode only — never persisted to customer Supabase records.
 */
(function (global) {
  "use strict";

  var PACK_ID = "hf-oakwood-mayfair-demo-v1";
  var PACK_LABEL = "The Oakwood Mayfair Demo";
  var HOTEL_NAME = "The Oakwood Mayfair";
  var PREPARED_BY = "Sophie Chen · Night Manager";
  var TOTAL_ROOMS = 80;

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function todayIso() {
    var d = new Date();
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function tomorrowLabel() {
    var d = new Date();
    d.setDate(d.getDate() + 1);
    return pad2(d.getDate()) + "/" + pad2(d.getMonth() + 1);
  }

  function item(text, status) {
    return { text: text, status: status || "pending" };
  }

  /**
   * Story rooms used in the demo handover narrative.
   * All referenced rooms must exist in the 80-room Mayfair inventory.
   */
  function storyRoomOverrides() {
    return {
      "3": { roomType: "Classic Double", floor: "1", twinCapable: false, accessible: false, quiet: true, streetFacing: false, connectingRoom: "", notes: "Quiet courtyard; walk-in hold room" },
      "4": { roomType: "Classic Double", floor: "1", twinCapable: false, accessible: false, quiet: true, streetFacing: false, connectingRoom: "", notes: "Quiet courtyard room" },
      "5": { roomType: "Classic Double", floor: "1", twinCapable: false, accessible: false, quiet: false, streetFacing: false, connectingRoom: "", notes: "Courtyard side" },
      "11": { roomType: "Deluxe King", floor: "1", twinCapable: false, accessible: false, quiet: false, streetFacing: true, connectingRoom: "", notes: "Street-facing deluxe; safe keypad intermittent" },
      "12": { roomType: "Deluxe Twin", floor: "1", twinCapable: true, accessible: false, quiet: false, streetFacing: true, connectingRoom: "", notes: "Twin-capable deluxe; street-facing" },
      "14": { roomType: "Deluxe King", floor: "1", twinCapable: false, accessible: false, quiet: true, streetFacing: false, connectingRoom: "15", notes: "Quiet; interconnects with 15" },
      "15": { roomType: "Deluxe King", floor: "1", twinCapable: false, accessible: false, quiet: true, streetFacing: false, connectingRoom: "14", notes: "Quiet; interconnects with 14" },
      "16": { roomType: "Deluxe King", floor: "1", twinCapable: false, accessible: false, quiet: false, streetFacing: false, connectingRoom: "", notes: "Away from lift" },
      "21": { roomType: "Deluxe King", floor: "2", twinCapable: false, accessible: false, quiet: false, streetFacing: true, connectingRoom: "", notes: "Street-facing" },
      "22": { roomType: "Deluxe King", floor: "2", twinCapable: false, accessible: false, quiet: false, streetFacing: true, connectingRoom: "", notes: "Street-facing; popular with regulars" },
      "24": { roomType: "Deluxe King", floor: "2", twinCapable: false, accessible: false, quiet: false, streetFacing: false, connectingRoom: "25", notes: "Interconnects with 25" },
      "25": { roomType: "Deluxe Twin", floor: "2", twinCapable: true, accessible: false, quiet: true, streetFacing: false, connectingRoom: "24", notes: "Quiet; twin-capable; interconnects with 24" },
      "31": { roomType: "Deluxe King", floor: "3", twinCapable: false, accessible: false, quiet: false, streetFacing: true, connectingRoom: "", notes: "Street-facing" },
      "42": { roomType: "Junior Suite", floor: "4", twinCapable: false, accessible: false, quiet: true, streetFacing: false, connectingRoom: "", notes: "Quiet upper-floor suite; away from lift — preferred for VIP" }
    };
  }

  function defaultRoomForNumber(n) {
    var floor = n <= 16 ? "1" : n <= 32 ? "2" : n <= 48 ? "3" : n <= 64 ? "4" : "5";
    var twinCapable = n % 7 === 0 || n % 11 === 0;
    var accessible = n === 23 || n === 33 || n === 53;
    var quiet = n % 5 === 0 || n % 9 === 0;
    var streetFacing = !quiet && n % 2 === 1;
    var roomType = n >= 70
      ? "Junior Suite"
      : accessible
        ? "Accessible King"
        : twinCapable
          ? "Deluxe Twin"
          : n <= 10
            ? "Classic Double"
            : "Deluxe King";
    return {
      roomNo: String(n),
      roomType: roomType,
      floor: floor,
      twinCapable: twinCapable || accessible,
      accessible: accessible,
      quiet: quiet,
      streetFacing: streetFacing,
      connectingRoom: "",
      notes: quiet ? "Quieter allocation" : (streetFacing ? "Street-facing" : "")
    };
  }

  /**
   * Canonical 80-room inventory for The Oakwood Mayfair.
   * All demo guests, payments and notes must use these room numbers only.
   */
  function buildRoomInventory() {
    var overrides = storyRoomOverrides();
    var rooms = [];
    for (var n = 1; n <= TOTAL_ROOMS; n++) {
      var key = String(n);
      rooms.push(overrides[key] ? Object.assign({ roomNo: key }, overrides[key]) : defaultRoomForNumber(n));
    }
    return rooms;
  }

  function roomIndex(inventory) {
    var map = {};
    (inventory || buildRoomInventory()).forEach(function (room) {
      map[String(room.roomNo)] = room;
    });
    return map;
  }

  function getRoom(roomNo, inventory) {
    return roomIndex(inventory)[String(roomNo)] || null;
  }

  function buildSourceNotesParts() {
    return {
      arrivals: [
        "vip eleanor whitmore due 11am quiet upper pls — rm42 if free",
        "champagne + welcome card — 15% corp rate on invoice",
        "",
        "patel late arr ~2345 rm16 b.com prepaid — no mobile on file",
        "twin pls — move 12 or 25 if free",
        "",
        "henderson x4 interconnect 14+15 tmrw — bday balloons 15 @1500 fb informed",
        "",
        "arrivals left tonight: 2"
      ].join("\n"),
      departures: [
        "okonkwo rm22 dep am — wake 0630 addison lee 1015",
        "minibar 42.50 still open — collect b4 checkout",
        "",
        "late co rm21 chen approved 1pm",
        "",
        "deps tmrw: 6",
        "",
        "no show davies rm5 b.com — hold till night confirms",
        "",
        "expedia room4 city tax 12.50"
      ].join("\n"),
      general: [
        "pm → night — busy pls read",
        "",
        "24 ac broken maint aware fan guest",
        "",
        "shower drip rm31 hk reported medium",
        "",
        "lobby wc hand dryer dead — paper towels out — maint aware",
        "",
        "rm11 safe keypad intermittent — guest moved 21 — 11 on hold parts",
        "",
        "adapter 15 +16",
        "",
        "inhouse 86 guests / adults 76 / children 10",
        "rooms sold 60 / ooo 2 — rooms 11, 31 / adr 285",
        "",
        "lost prop gold cufflink rm25 fraser — dm safe — email sent"
      ].join("\n")
    };
  }

  function buildSourceNotes() {
    var parts = buildSourceNotesParts();
    var Notes = global.HFHandoverNotesSections;
    if (Notes && Notes.combineForAi) return Notes.combineForAi(parts);
    return [
      "=== TODAY'S ARRIVALS ===",
      parts.arrivals,
      "",
      "=== TODAY'S DEPARTURES ===",
      parts.departures,
      "",
      "=== GENERAL HOTEL / SHIFT NOTES ===",
      parts.general
    ].join("\n");
  }

  /**
   * REFERENCE PACK ONLY — not rendered in Demo Mode UI.
   * Live Generate uses the shared Intelligence Engine + HandoverGeneratedView.
   * Kept for pack validation / regression fixtures.
   */
  function buildOrganisedHandover() {
    var tomorrow = tomorrowLabel();
    return {
      urgent: [
        item("Room 24 – AC not cooling. Guest provided with a fan. Maintenance has been informed. Follow up next shift until resolved.")
      ],
      vip: [
        item("Whitmore VIP – due " + tomorrow + " 11:00. Quiet upper suite Room 42. Champagne + welcome card. Confirm 15% corp rate on invoice.")
      ],
      guest: [
        item("Follow up Room 16 Patel – collect mobile at check-in and confirm twin preference (Room 12 or 25)."),
        item("Follow up Henderson interconnect – confirm birthday balloons Room 15 at 15:00 with F&B."),
        item("Follow up Room 21 Chen – late check-out approved until 13:00; brief AM team.")
      ],
      maintenance: [
        item("Room 24 – AC not cooling. Guest provided with a fan. Maintenance has been informed. Follow up next shift until resolved."),
        item("Room 31 – Shower mixer dripping. HK reported. Medium priority."),
        item("Lobby WC – Hand dryer failed. Paper towels placed. Maintenance has been informed."),
        item("Room 11 – Safe keypad intermittent. On hold for parts. Guest relocated to Room 21.")
      ],
      payments: [
        item("Room 22 – Open minibar £42.50 before Okonkwo departure."),
        item("Room 4 – Expedia city tax £12.50 still to collect.")
      ],
      events: [
        item("Room 15 – Henderson birthday set / balloons at 15:00 tomorrow.")
      ],
      tasks: [
        item("Get Patel mobile at check-in and update profile."),
        item("Confirm Room 42 for Whitmore VIP + amenities."),
        item("Davies no-show Room 5 – hold until Night confirms."),
        item("Adapter returns Rooms 15 + 16 – return or £20 charge.")
      ],
      inventory: [
        item("Adapters on loan – Rooms 15 and 16.")
      ],
      deliveries: [],
      lostproperty: [
        item("Gold cufflink – Room 25 (Fraser). In DM safe. Guest emailed.")
      ],
      general: [
        item("PM shift reported unusually high operational workload. Review remaining operational notes before continuing the shift."),
        item("Arrivals remaining tonight: 2."),
        item("Departures tomorrow: 6."),
        item("In-house 86 guests (76 adults / 10 children). Rooms sold 60 — occupancy 76.9%."),
        item("No-show Davies Room 5 — keep reservation on hold until Night Team confirms.")
      ],
      completed: [
        item("Room 21 Chen – late check-out approved until 13:00.", "completed")
      ]
    };
  }

  function buildRecommendations() {
    return [
      {
        id: "demo-rec-ac",
        text: "Follow up Room 24 AC next shift — guest still impacted; offer move if no Maintenance ETA.",
        priority: "high",
        department: "Maintenance",
        status: "pending"
      },
      {
        id: "demo-rec-vip",
        text: "Prep Whitmore VIP — confirm Room 42, champagne/welcome card, and 15% corp rate on folio.",
        priority: "high",
        department: "Reception",
        status: "pending"
      },
      {
        id: "demo-rec-balance",
        text: "Clear Room 22 £42.50 minibar before Okonkwo transfer at 10:15.",
        priority: "high",
        department: "Finance",
        status: "pending"
      },
      {
        id: "demo-rec-shower",
        text: "Schedule Room 31 shower mixer for the AM engineering round and recheck after.",
        priority: "normal",
        department: "Housekeeping",
        status: "pending"
      },
      {
        id: "demo-rec-twin",
        text: "Move Patel to twin-capable Room 12 or 25 if still free before late arrival.",
        priority: "normal",
        department: "Guest Services",
        status: "pending"
      },
      {
        id: "demo-rec-noshow",
        text: "Hold Davies no-show Room 5 until Night confirms release.",
        priority: "high",
        department: "Duty Manager",
        status: "pending"
      },
      {
        id: "demo-rec-adapters",
        text: "Chase adapter returns Rooms 15 + 16 during Night checkout checks.",
        priority: "low",
        department: "Night Team",
        status: "pending"
      }
    ];
  }

  function buildChecklist() {
    return [
      { id: "demo-cl-1", label: "Review remaining arrivals and late arrivals", done: false, source: "workflow" },
      { id: "demo-cl-2", label: "Confirm VIP Room 42 allocation and amenities", done: false, source: "workflow" },
      { id: "demo-cl-3", label: "Review outstanding payments and open balances", done: false, source: "workflow" },
      { id: "demo-cl-4", label: "Follow up guest-impacting maintenance (Room 24 A/C)", done: false, source: "maintenance" },
      { id: "demo-cl-5", label: "Track adapter returns Rooms 15 and 16", done: false, source: "inventory" },
      { id: "demo-cl-6", label: "Run End of Day after remaining arrivals", done: false, source: "workflow" }
    ];
  }

  function locationLabelFor(issue) {
    if (issue.locationType === "guest_room") {
      return issue.roomNumber ? "Room " + issue.roomNumber : "Guest room";
    }
    return issue.area || (issue.locationType === "public_area" ? "Public area" : "Back of house");
  }

  function buildMaintenanceIssues(workspaceId) {
    var now = new Date().toISOString();
    var base = "demo-maint-" + PACK_ID + "-";
    var issues = [
      {
        id: base + "ac24",
        workspaceId: workspaceId || null,
        title: "A/C not cooling",
        description: "Guest in Room 24 reported air conditioning not cooling properly at 19:20. Portable fan provided. Maintenance informed; attendance still outstanding.",
        roomNumber: "24",
        area: null,
        locationType: "guest_room",
        category: "hvac",
        priority: "high",
        status: "open",
        reportedByName: "Amelia Brooks (PM Reception)",
        assignedDepartment: "Maintenance",
        dueAt: null,
        completedAt: null,
        resolutionNotes: null,
        includeInHandover: true,
        createdAt: now,
        updatedAt: now,
        isDemoData: true,
        sampleDataId: PACK_ID + ":maint:ac24"
      },
      {
        id: base + "shower31",
        workspaceId: workspaceId || null,
        title: "Dripping shower mixer",
        description: "Housekeeping noticed dripping shower mixer in Room 31 during turn-down. Not currently guest-impacting overnight.",
        roomNumber: "31",
        area: null,
        locationType: "guest_room",
        category: "plumbing",
        priority: "medium",
        status: "open",
        reportedByName: "Housekeeping",
        assignedDepartment: "Maintenance",
        dueAt: null,
        completedAt: null,
        resolutionNotes: null,
        includeInHandover: true,
        createdAt: now,
        updatedAt: now,
        isDemoData: true,
        sampleDataId: PACK_ID + ":maint:shower31"
      },
      {
        id: base + "dryer-lobby",
        workspaceId: workspaceId || null,
        title: "Lobby WC hand dryer failed",
        description: "Hand dryer in lobby guest WC stopped working this evening. Paper towels placed as temporary measure.",
        roomNumber: null,
        area: "Lobby guest WC",
        locationType: "public_area",
        category: "electrical",
        priority: "medium",
        status: "in_progress",
        reportedByName: "Duty Manager",
        assignedDepartment: "Maintenance",
        dueAt: null,
        completedAt: null,
        resolutionNotes: null,
        includeInHandover: true,
        createdAt: now,
        updatedAt: now,
        isDemoData: true,
        sampleDataId: PACK_ID + ":maint:dryer"
      },
      {
        id: base + "safe11",
        workspaceId: workspaceId || null,
        title: "In-room safe keypad intermittent",
        description: "Room 11 safe keypad intermittently unresponsive. Guest relocated to Room 21; Room 11 on hold pending parts.",
        roomNumber: "11",
        area: null,
        locationType: "guest_room",
        category: "it_technology",
        priority: "high",
        status: "waiting_parts",
        reportedByName: "Sophie Chen",
        assignedDepartment: "Maintenance",
        dueAt: null,
        completedAt: null,
        resolutionNotes: null,
        includeInHandover: true,
        createdAt: now,
        updatedAt: now,
        isDemoData: true,
        sampleDataId: PACK_ID + ":maint:safe"
      },
      {
        id: base + "plant",
        workspaceId: workspaceId || null,
        title: "Plant room pressure check",
        description: "Routine plant-room pressure reading slightly low. No guest impact. Scheduled for morning engineering round.",
        roomNumber: null,
        area: "Plant room",
        locationType: "back_of_house",
        category: "hvac",
        priority: "low",
        status: "open",
        reportedByName: "Engineering",
        assignedDepartment: "Maintenance",
        dueAt: null,
        completedAt: null,
        resolutionNotes: null,
        includeInHandover: false,
        createdAt: now,
        updatedAt: now,
        isDemoData: true,
        sampleDataId: PACK_ID + ":maint:plant"
      }
    ];

    return issues.map(function (issue) {
      issue.locationLabel = locationLabelFor(issue);
      return issue;
    });
  }

  function buildGuests() {
    var tomorrow = tomorrowLabel();
    return [
      {
        name: "Ms Eleanor Whitmore",
        type: "VIP",
        room: "42",
        status: "arriving",
        arrival: tomorrow + " 11:00",
        notes: "Quiet upper Junior Suite; champagne; 15% corporate discount"
      },
      {
        name: "Mr James Okonkwo",
        type: "Regular",
        room: "22",
        status: "in_house",
        departure: "Tomorrow AM",
        notes: "Wake-up 06:30; transfer 10:15; £42.50 open balance"
      },
      {
        name: "Mrs Patel",
        type: "Arrival",
        room: "16",
        status: "arriving",
        arrival: "Tonight ~23:45",
        notes: "Booking.com prepaid; twin preference → Room 12 or 25; missing mobile"
      },
      {
        name: "Henderson party (4)",
        type: "Group",
        room: "14 & 15",
        status: "arriving",
        arrival: "Tomorrow PM",
        notes: "Interconnecting; birthday package Room 15 15:00"
      },
      {
        name: "Mr Chen",
        type: "In-house",
        room: "21",
        status: "in_house",
        departure: "Tomorrow 13:00 (late CO)",
        notes: "Late checkout; temporary room after Room 11 safe fault"
      }
    ];
  }

  /**
   * REFERENCE PACK ONLY — not rendered in Demo Mode UI.
   * Today's Briefing is produced live by the Intelligence Engine on Generate.
   */
  function buildAiSummary() {
    return "Busy Night handoff. Room 24 AC still open (fan given). Whitmore VIP due 11:00 into Room 42. Clear Room 22 £42.50 before 10:15 transfer. Two arrivals left tonight. Adapters 15 + 16 outstanding. Room 11 on hold for safe parts.";
  }

  function buildHotelBrainProfile() {
    var inventory = buildRoomInventory();
    return {
      schemaVersion: 4,
      savedAt: null,
      isDemoData: true,
      sampleDataId: PACK_ID + ":brain",
      general: {
        hotelName: HOTEL_NAME,
        hotelGroup: "",
        hotelCode: "OAK-MAY",
        hotelType: "Independent boutique hotel",
        starRating: "4",
        totalRooms: String(TOTAL_ROOMS),
        totalFloors: "5",
        address: "Mayfair",
        city: "London",
        country: "United Kingdom",
        phone: "",
        email: "",
        description: "An 80-room independent boutique hotel in Mayfair. Hotel Brain is designed to grow as operational knowledge, guest preferences and shift activity are added over time.",
        brandColor: "",
        logo: "",
        timezone: "Europe/London",
        currency: "GBP",
        brandVoice: "Professional, warm, clear and concise",
        operatingNotes: "Boutique service. Pass unresolved issues with ownership. Never invent guest facts."
      },
      aiPrefs: {
        tone: "concise",
        detail: "brief",
        language: "British English",
        dateFormat: "DD/MM/YYYY (24-hour)",
        instructions: "Use British English. Keep handovers short and operational — fix spelling/grammar, cut repetition, prefer scan-friendly lines over long paragraphs. Include room numbers. Never invent facts."
      },
      departments: [
        { name: "Reception", head: "", contact: "", email: "", instructions: "Front office owns arrivals, departures and guest-facing requests. Pass unresolved folios and transfers clearly to the next shift." },
        { name: "Housekeeping", head: "", contact: "", email: "", instructions: "Start departure cleans on upper floors first. Release rooms promptly and flag VIP rooms for inspection." },
        { name: "Maintenance", head: "", contact: "", email: "", instructions: "Prioritise guest-impacting issues first. Keep Room 24 AC on the open list until resolved." },
        { name: "Food & Beverage", head: "", contact: "", email: "", instructions: "Restaurant, bar and breakfast. Confirm special dietary notes and VIP welcome amenities with Reception." },
        { name: "Night Team", head: "", contact: "", email: "", instructions: "Night shift and End of Day. Confirm late arrivals, wake-up calls and overnight maintenance ownership." },
        { name: "Management", head: "", contact: "", email: "", instructions: "Duty Managers cover AM, PM and Middle. Escalate compensation and VIP exceptions here." }
      ],
      shifts: {
        pattern: "8hour",
        overnightSupport: true,
        rows: [
          { code: "AM", name: "AM", start: "07:00", end: "15:00", dept: "Reception" },
          { code: "PM", name: "PM", start: "15:00", end: "23:00", dept: "Reception" },
          { code: "Night", name: "Night", start: "23:00", end: "07:00", dept: "Night Team" },
          { code: "Middle", name: "Middle", start: "10:00", end: "18:00", dept: "Duty Management" }
        ]
      },
      rooms: [
        { code: "CD", type: "Classic Double", count: "10", floors: "1", maxGuests: "2" },
        { code: "DK", type: "Deluxe King", count: "42", floors: "1–4", maxGuests: "2" },
        { code: "DT", type: "Deluxe Twin", count: "14", floors: "1–4", maxGuests: "2" },
        { code: "AK", type: "Accessible King", count: "3", floors: "2–4", maxGuests: "2" },
        { code: "JS", type: "Junior Suite", count: "11", floors: "4–5", maxGuests: "2" }
      ],
      roomFacilities: inventory.map(function (room) {
        return {
          roomNo: room.roomNo,
          roomType: room.roomType,
          floor: room.floor,
          bedType: room.twinCapable ? "Twin" : (room.roomType.indexOf("Suite") !== -1 ? "King" : "King"),
          twinCapable: room.twinCapable,
          extraBedCapable: false,
          sofaBed: false,
          streetFacing: room.streetFacing,
          bathtub: true,
          shower: true,
          accessible: room.accessible,
          connectingRoom: room.connectingRoom || "",
          quietFacing: room.quiet,
          darkRoom: false,
          lowerGround: room.floor === "Lower ground",
          awayFromLift: room.quiet,
          maxOccupancy: "2",
          notes: room.notes,
          customFeatures: "",
          isDemoData: true,
          sampleDataId: PACK_ID + ":room:" + room.roomNo
        };
      }),
      terminology: [
        { term: "CD", meaning: "Classic Double" },
        { term: "DK", meaning: "Deluxe King" },
        { term: "JS", meaning: "Junior Suite" }
      ],
      hotelKnowledge: {
        generalNotes: "The Oakwood Mayfair is an 80-room independent boutique hotel in London. Hotel Brain holds the hotel’s growing operational memory — knowledge, preferences and patterns that make AI Shift Handover more useful over time.",
        guestKnowledge: "Ms Eleanor Whitmore prefers quiet upper-floor Junior Suites and a handwritten welcome card.\nVIP arrivals receive champagne amenities where noted.\nRegular guests should never be offered accessible rooms unless requested.\nConfirm invoice discounts for corporate VIP stays.",
        hotelStandards: "",
        vipRules: "Review VIP notes before arrival. Confirm quiet upper-floor allocation where requested. Prepare welcome card and amenities. Confirm invoice discounts.",
        commonTerms: "VC = Virtual Card\nLCO = Late Check-out\nECI = Early Check-in\nCD = Classic Double\nDK = Deluxe King\nJS = Junior Suite\nAK = Accessible King\nOOO = Out of Order",
        operationalNotes: "Maintenance prioritises guest-impacting issues first.\nHousekeeping starts departures on upper floors.\nConsolidate fragmented shift notes into one clear handover without replacing the PMS.",
        localRecommendations: "Restaurants around Mayfair and Green Park.\nPreferred taxi: Addison Lee.\nGreen Park and Hyde Park are within walking distance.\nNearest pharmacy on Piccadilly.",
        aiInstructions: "Prioritise guest-impacting issues.\nAvoid generic recommendations.\nUse Hotel Brain / Guest Intelligence only when relevant.\nKeep recommendations concise.\nNever invent guest preferences.\nNever apply one guest's notes to another.\nUse British English.\nInclude room numbers."
      },
      guestServices: {
        airportTransfers: "Record transfer time, supplier and guest details. Pass unresolved transfers to the next shift.",
        preferredTaxi: "Addison Lee preferred for airport and local transfers.",
        wakeUpCalls: "Record requested time. Review during shift takeover.",
        guestItemLoans: "Track adapters by room. Confirm return at checkout. Adapter charge/deposit £20.",
        specialOccasions: "Review packages, balloons and birthdays.",
        welcomeAmenities: "Confirm VIP amenities before arrival.",
        customInstructions: "Do not store unnecessary personal data in permanent Hotel Brain knowledge.",
        loanItems: [
          { item: "Travel adapter", notes: "Track by room. £20 charge/deposit." },
          { item: "Umbrella", notes: "Track by room." }
        ]
      },
      supplies: [
        { name: "Travel adapters", category: "Guest loan items", minStock: "5", guestCharge: "20", loanItem: "yes" }
      ],
      otaChannels: [
        {
          type: "bookingCom",
          label: "Booking.com",
          notes: "Virtual cards activate after 05:00 on arrival day.\nPay at Hotel reservations are charged at check-in.\nAlways check whether breakfast remains after a booking modification.\nVerify open balances and city tax."
        },
        {
          type: "expedia",
          label: "Expedia",
          notes: "Expedia virtual cards activate after 05:00.\nCharging may complete after 05:00 on arrival day — verify with management."
        },
        {
          type: "direct",
          label: "Direct Bookings",
          notes: "Direct bookings are prepaid or guaranteed by card. Offer the preferred rate when available."
        },
        {
          type: "corporate",
          label: "Corporate Bookings",
          notes: "Corporate accounts are invoiced weekly. Confirm purchase order numbers at check-in."
        },
        {
          type: "other",
          label: "Other Channels",
          notes: "Agency bookings — confirm payment timing before issuing keys."
        }
      ],
      policiesNotes: {
        checkInOut: "Early check-in is not guaranteed — offer when a clean room is available, or suggest booking the night before.\nLate check-out depends on occupancy and Duty Manager approval. Record the approved time on the handover.",
        cancellationsNoShows: "Cancellations within 24 hours are charged one night unless Management approves a waiver.\nNo-shows follow the same charge — note the reason on the handover.",
        visitorsSecurity: "Visitors must sign in at Reception after 22:00.\nPhysical key replacement charge £150. Issue keys at check-in and track unreturned keys.",
        petsSmoking: "Pets are not accepted unless pre-approved by Management.\nSmoking is prohibited throughout the hotel. Report room smoking to Duty Manager and follow cleaning charge procedure.",
        lostPropertyLoans: "Lost property is held for 90 days.\nTravel adapters are loaned with a £20 deposit and tracked by room.",
        otherGuestPolicies: "VIP arrivals receive champagne amenities where noted.",
        deposits: "A deposit equal to the first night is taken for unguaranteed direct reservations.",
        refunds: "Refunds are processed within 5–7 working days after Duty Manager approval.",
        preAuthorisations: "Pre-authorise one night plus £50 incidentals for walk-in guests where policy requires.",
        cashHandling: "Cash float is £200 and must be counted each shift.",
        invoicing: "Corporate invoices are emailed within 24 hours of departure.",
        otherPaymentNotes: "City tax is collected at check-in unless prepaid through the channel."
      },
      policiesStructured: {
        guest: {},
        payment: {},
        operational: {},
        custom: {}
      },
      operationsTrackers: [
        { key: "physicalKeys", label: "Physical keys", enabled: true },
        { key: "lostProperty", label: "Lost property", enabled: true },
        { key: "noShows", label: "No-shows", enabled: true },
        { key: "openBalances", label: "Open balances", enabled: true },
        { key: "airportTransfers", label: "Airport transfers", enabled: true }
      ],
      operationalKnowledge: {
        schemaVersion: 1,
        staffingContext: "Night Managers cover five nights per week; Duty Managers cover the remaining two. Boutique staffing — clear handover ownership is essential.",
        handoverSources: [
          { id: "src-pms", name: "PMS", description: "Primary property management system.", active: true },
          { id: "src-handover", name: "Shift handover notes", description: "Written shift-to-shift notes.", active: true }
        ],
        dailyMetrics: [
          { key: "arrivals", label: "Arrivals", enabled: true },
          { key: "departures", label: "Departures", enabled: true },
          { key: "occupancy", label: "Occupancy", enabled: true },
          { key: "adr", label: "ADR", enabled: true },
          { key: "revpar", label: "RevPAR", enabled: true }
        ],
        knowledgeEntries: [],
        shiftWorkflows: {
          night: { shiftType: "night", label: "Night Shift", steps: [] },
          am: { shiftType: "am", label: "AM Shift", steps: [] },
          pm: { shiftType: "pm", label: "PM Shift", steps: [] },
          middle: { shiftType: "middle", label: "Middle Shift", steps: [] }
        },
        sampleDataRegistry: [],
        sampleDataLoaded: {}
      }
    };
  }

  function buildMetrics() {
    var totalRooms = TOTAL_ROOMS;
    var roomsSold = 60;
    var oooRooms = 2;
    var Metrics = global.HFHotelSnapshotMetrics;
    var sellable = Metrics && Metrics.sellableRooms
      ? Metrics.sellableRooms(totalRooms, oooRooms)
      : totalRooms - oooRooms;
    var occupancyPct = Metrics && Metrics.calculateOccupancy
      ? Metrics.calculateOccupancy(roomsSold, totalRooms, oooRooms)
      : (roomsSold / sellable) * 100;
    var adr = 285;
    var revpar = Metrics && Metrics.calculateRevpar
      ? Metrics.calculateRevpar(adr, occupancyPct)
      : Math.round(adr * (occupancyPct / 100) * 100) / 100;
    var maintenanceIssues = buildMaintenanceIssues();
    var handoverMaintenance = maintenanceIssues.filter(function (issue) {
      return issue.includeInHandover && issue.status !== "completed";
    });
    var openBalanceCount = 2;

    var adults = 76;
    var children = 10;
    return {
      totalRooms: totalRooms,
      arrivals: 8,
      departures: 6,
      inHouse: adults + children,
      adults: adults,
      children: children,
      oooRooms: oooRooms,
      oooRoomsNote: "Rooms 11, 31",
      sellableRooms: sellable,
      occupancy: Metrics && Metrics.formatOccupancyPercent
        ? Metrics.formatOccupancyPercent(occupancyPct)
        : occupancyPct.toFixed(1) + "%",
      occupancyValue: occupancyPct,
      adr: String(adr),
      adrValue: adr,
      revpar: String(revpar),
      revparValue: revpar,
      roomsSold: roomsSold,
      currency: "GBP",
      openBalances: openBalanceCount,
      openBalanceTotal: 55,
      vipArrivals: 1,
      maintenanceOpen: handoverMaintenance.length,
      maintenanceBoardUnresolved: maintenanceIssues.filter(function (i) {
        return i.status !== "completed";
      }).length,
      remainingArrivalsTonight: 2
    };
  }

  function buildPack(workspaceId) {
    var date = todayIso();
    var metrics = buildMetrics();
    var inventory = buildRoomInventory();
    var maintenanceIssues = buildMaintenanceIssues(workspaceId);
    var sellable = metrics.sellableRooms != null
      ? metrics.sellableRooms
      : metrics.totalRooms - (metrics.oooRooms || 0);
    var roomsAvailable = sellable - metrics.roomsSold;
    var stayovers = Math.max(0, metrics.roomsSold - metrics.arrivals);
    var snapshot = {
      arrivals: metrics.arrivals,
      departures: metrics.departures,
      stayovers: String(stayovers),
      inHouse: metrics.inHouse,
      adults: metrics.adults,
      children: metrics.children,
      roomsSold: metrics.roomsSold,
      roomsAvailable: String(roomsAvailable),
      oooRooms: String(metrics.oooRooms || 0),
      oooRoomsNote: metrics.oooRoomsNote || "",
      occupancy: metrics.occupancy,
      adr: metrics.adr,
      revpar: metrics.revpar,
      currency: metrics.currency
    };

    var pack = {
      packId: PACK_ID,
      packLabel: PACK_LABEL,
      hotelName: HOTEL_NAME,
      department: "Reception",
      preparedBy: PREPARED_BY,
      shift: "Night",
      date: date,
      dateDisplay: new Date().toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }),
      sourceNotes: buildSourceNotes(),
      aiSummary: buildAiSummary(),
      organisedHandover: buildOrganisedHandover(),
      hotelSnapshot: snapshot,
      dashboardMetrics: {
        arrivals: metrics.arrivals,
        departures: metrics.departures,
        inHouse: metrics.inHouse,
        occupancy: metrics.occupancy,
        openBalances: metrics.openBalances,
        vipArrivals: metrics.vipArrivals,
        maintenanceOpen: metrics.maintenanceOpen,
        revpar: metrics.revpar
      },
      recommendations: buildRecommendations(),
      shiftIntelligenceChecklist: buildChecklist(),
      maintenanceIssues: maintenanceIssues,
      guests: buildGuests(),
      roomInventory: inventory,
      hotelBrainProfile: buildHotelBrainProfile(),
      metrics: metrics,
      generatedTime: new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit"
      })
    };
    pack.quoteOfTheDay = buildDemoQuoteOfTheDay(pack);
    return pack;
  }

  function buildDemoQuoteOfTheDay(pack) {
    pack = pack || {};
    var Quote = global.HFHandoverQuoteOfTheDay;
    var seed = [pack.hotelName || HOTEL_NAME, pack.shift || "Night", pack.date || todayIso(), PACK_ID].join("|");
    if (Quote && Quote.generateQuoteOfTheDay) {
      return Quote.generateQuoteOfTheDay({
        seed: seed,
        hotelName: pack.hotelName || HOTEL_NAME,
        shift: pack.shift || "Night",
        date: pack.date || todayIso(),
        id: PACK_ID
      });
    }
    return {
      text: "Every smooth shift begins with a clear handover.",
      source: "fallback",
      generatedAt: new Date().toISOString()
    };
  }

  function buildHandoverRecord(pack) {
    pack = pack || buildPack();
    return {
      id: "demo-handover-" + PACK_ID,
      hotelName: pack.hotelName,
      department: pack.department,
      preparedBy: pack.preparedBy,
      shift: pack.shift,
      date: pack.date,
      dateDisplay: pack.dateDisplay,
      originalNotes: pack.sourceNotes,
      aiSummary: pack.aiSummary,
      organisedHandover: pack.organisedHandover,
      hotelSnapshot: pack.hotelSnapshot,
      dashboardMetrics: pack.dashboardMetrics,
      recommendations: pack.recommendations,
      shiftIntelligenceChecklist: pack.shiftIntelligenceChecklist,
      quoteOfTheDay: pack.quoteOfTheDay || buildDemoQuoteOfTheDay(pack),
      timestamp: new Date().toISOString(),
      isDemoData: true,
      sampleDataId: PACK_ID + ":handover:night"
    };
  }

  /**
   * Isolated Demo prior-shift history for E4.3 OperationalMemory.
   * Never read from production/test workspaces. Reset with the Demo pack.
   */
  function buildPriorShiftHistory(pack) {
    pack = pack || buildPack();
    var day = pack.date || "2026-08-01";
    return [
      {
        reportId: "demo-history-am-" + PACK_ID,
        workspaceId: "demo-workspace",
        shiftCode: "am",
        shift: "AM",
        handoverDate: day,
        occurredAt: day + "T10:15:00.000Z",
        sourceNotes: "Room 24 AC not working. Guest in-house. Maintenance informed.",
        originalNotes: "Room 24 AC not working. Guest in-house. Maintenance informed.",
        isDemoData: true,
        memorySource: "demo",
        sampleDataId: PACK_ID + ":history:am"
      },
      {
        reportId: "demo-history-pm-" + PACK_ID,
        workspaceId: "demo-workspace",
        shiftCode: "pm",
        shift: "PM",
        handoverDate: day,
        occurredAt: day + "T18:40:00.000Z",
        sourceNotes: "Room 24 AC still unresolved. Waiting for engineer. Fan provided.",
        originalNotes: "Room 24 AC still unresolved. Waiting for engineer. Fan provided.",
        isDemoData: true,
        memorySource: "demo",
        sampleDataId: PACK_ID + ":history:pm"
      }
    ];
  }

  /**
   * Initial Demo Mode form state only.
   * Prefills messy notes + snapshot — never restores organised/generated output.
   * Visitors must click Generate to run the shared Intelligence Engine.
   */
  function buildDraftPayload(pack) {
    pack = pack || buildPack();
    var notesParts = buildSourceNotesParts();
    return {
      hotelName: pack.hotelName,
      preparedBy: pack.preparedBy,
      shift: pack.shift,
      date: pack.date,
      notes: pack.sourceNotes,
      notesParts: notesParts,
      hotelSnapshot: pack.hotelSnapshot,
      dashboardMetrics: pack.dashboardMetrics,
      hasGeneratedOutput: false,
      organisedHandover: {},
      aiSummary: "",
      generatedTime: "",
      recommendations: [],
      shiftIntelligenceChecklist: [],
      savedAt: null,
      isDemoData: true,
      sampleDataId: PACK_ID + ":draft:night"
    };
  }

  function extractReferencedRooms(pack) {
    pack = pack || buildPack();
    var found = {};
    var text = [
      pack.sourceNotes,
      pack.aiSummary,
      JSON.stringify(pack.organisedHandover),
      JSON.stringify(pack.guests),
      JSON.stringify(pack.recommendations),
      JSON.stringify(pack.maintenanceIssues)
    ].join("\n");

    var re = /\bRoom(?:s)?\s+(\d+)/gi;
    var match;
    while ((match = re.exec(text))) {
      found[match[1]] = true;
    }

    (pack.maintenanceIssues || []).forEach(function (issue) {
      if (issue.roomNumber) found[String(issue.roomNumber)] = true;
    });
    (pack.guests || []).forEach(function (guest) {
      String(guest.room || "").split(/[&,]/).forEach(function (part) {
        var n = String(part).replace(/[^\d]/g, "");
        if (n) found[n] = true;
      });
    });

    return Object.keys(found).sort(function (a, b) {
      return Number(a) - Number(b);
    });
  }

  function validatePackConsistency(pack) {
    pack = pack || buildPack();
    var errors = [];
    var inventory = pack.roomInventory || buildRoomInventory();
    var byNo = roomIndex(inventory);
    var metrics = pack.metrics || buildMetrics();
    var referenced = extractReferencedRooms(pack);

    if (inventory.length !== TOTAL_ROOMS) {
      errors.push("Inventory must contain exactly " + TOTAL_ROOMS + " rooms (found " + inventory.length + ").");
    }

    referenced.forEach(function (roomNo) {
      if (!byNo[roomNo]) {
        errors.push("Referenced Room " + roomNo + " is not in the Oakwood inventory.");
      }
    });

    var vipRoom = byNo["42"];
    if (!vipRoom || !vipRoom.quiet) {
      errors.push("VIP Room 42 must exist and be quiet.");
    }

    ["12", "25"].forEach(function (roomNo) {
      if (!byNo[roomNo] || !byNo[roomNo].twinCapable) {
        errors.push("Twin alternative Room " + roomNo + " must be twin-capable.");
      }
    });

    if (!byNo["14"] || byNo["14"].connectingRoom !== "15" || !byNo["15"] || byNo["15"].connectingRoom !== "14") {
      errors.push("Rooms 14 and 15 must interconnect.");
    }

    var handoverMaint = (pack.organisedHandover && pack.organisedHandover.maintenance) || [];
    var boardHandover = (pack.maintenanceIssues || []).filter(function (issue) {
      return issue.includeInHandover && issue.status !== "completed";
    });
    if (handoverMaint.length !== boardHandover.length) {
      errors.push(
        "Handover maintenance items (" + handoverMaint.length +
        ") must match board includeInHandover unresolved (" + boardHandover.length + ")."
      );
    }
    if (metrics.maintenanceOpen !== boardHandover.length) {
      errors.push("metrics.maintenanceOpen must equal handover-flagged unresolved issues.");
    }

    var paymentItems = (pack.organisedHandover && pack.organisedHandover.payments) || [];
    if (paymentItems.length !== metrics.openBalances) {
      errors.push("Payment section count must equal openBalances metric.");
    }

    if (metrics.adults != null && metrics.children != null &&
        metrics.inHouse !== (metrics.adults + metrics.children)) {
      errors.push("inHouse guests must equal adults + children when both are set.");
    }
    var expectedOcc = (metrics.roomsSold / (metrics.totalRooms - (metrics.oooRooms || 0))) * 100;
    if (Math.abs(metrics.occupancyValue - expectedOcc) > 0.01) {
      errors.push("Occupancy percentage must equal roomsSold / sellableRooms * 100.");
    }
    var expectedRevpar = Math.round(metrics.adrValue * (metrics.occupancyValue / 100) * 100) / 100;
    if (metrics.revparValue !== expectedRevpar) {
      errors.push("RevPAR must equal ADR × occupancy.");
    }

    if (pack.preparedBy !== PREPARED_BY) {
      errors.push("preparedBy must be Sophie Chen · Night Manager.");
    }
    if (pack.hotelName !== HOTEL_NAME) {
      errors.push("hotelName must be The Oakwood Mayfair.");
    }
    if (!pack.quoteOfTheDay || !String(pack.quoteOfTheDay.text || "").trim()) {
      errors.push("Demo pack must include a Quote of the Day.");
    }
    ["urgent", "vip", "maintenance", "guest", "payments", "tasks"].forEach(function (sectionId) {
      var items = (pack.organisedHandover && pack.organisedHandover[sectionId]) || [];
      if (!items.length) {
        errors.push("Demo organised handover must include at least one " + sectionId + " item.");
      }
    });
    var brainBlob = JSON.stringify(pack.hotelBrainProfile || {});
    var banned = ["Mary" + "lebone", "Zet" + "ter"];
    banned.forEach(function (token) {
      if (brainBlob.indexOf(token) !== -1) {
        errors.push("Demo Hotel Brain profile must not reference legacy sample hotel identities.");
      }
    });

    return { ok: errors.length === 0, errors: errors, referencedRooms: referenced };
  }

  global.HFDemoSampleData = {
    PACK_ID: PACK_ID,
    PACK_LABEL: PACK_LABEL,
    HOTEL_NAME: HOTEL_NAME,
    TOTAL_ROOMS: TOTAL_ROOMS,
    PREPARED_BY: PREPARED_BY,
    buildRoomInventory: buildRoomInventory,
    getRoom: getRoom,
    buildPack: buildPack,
    buildHandoverRecord: buildHandoverRecord,
    buildPriorShiftHistory: buildPriorShiftHistory,
    buildDraftPayload: buildDraftPayload,
    buildMaintenanceIssues: buildMaintenanceIssues,
    buildGuests: buildGuests,
    buildHotelBrainProfile: buildHotelBrainProfile,
    buildSourceNotes: buildSourceNotes,
    buildSourceNotesParts: buildSourceNotesParts,
    buildMetrics: buildMetrics,
    extractReferencedRooms: extractReferencedRooms,
    validatePackConsistency: validatePackConsistency
  };
})(typeof window !== "undefined" ? window : globalThis);
