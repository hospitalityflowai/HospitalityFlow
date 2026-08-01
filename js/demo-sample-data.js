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

  function buildSourceNotes() {
    return [
      "pm → night — busy pls read",
      "",
      "24 ac broken maint aware fan guest",
      "",
      "vip eleanor whitmore due 11am quiet upper pls — rm42 if free",
      "champagne + welcome card — 15% corp rate on invoice",
      "",
      "okonkwo rm22 dep am — wake 0630 addison lee 1015",
      "minibar 42.50 still open — collect b4 checkout",
      "",
      "patel late arr ~2345 rm16 b.com prepaid — no mobile on file",
      "twin pls — move 12 or 25 if free",
      "",
      "shower drip rm31 hk reported medium",
      "",
      "lobby wc hand dryer dead — paper towels out — maint aware",
      "",
      "rm11 safe keypad intermittent — guest moved 21 — 11 on hold parts",
      "",
      "adapter 15 +16",
      "",
      "expedia room4 city tax 12.50",
      "",
      "henderson x4 interconnect 14+15 tmrw — bday balloons 15 @1500 fb informed",
      "",
      "late co rm21 chen approved 1pm",
      "",
      "arrivals left tonight: 2",
      "deps tmrw: 6",
      "inhouse 112 guests / adults 98 / children 14",
      "rooms sold 60 / occ 75% / adr 285 / revpar 213.75",
      "",
      "no show davies rm5 b.com — hold till night confirms",
      "",
      "lost prop gold cufflink rm25 fraser — dm safe — email sent"
    ].join("\n");
  }

  function buildOrganisedHandover() {
    var tomorrow = tomorrowLabel();
    return {
      urgent: [
        item("Room 24 – AC not cooling. Guest provided with a fan. Maintenance informed. Follow up next shift.")
      ],
      vip: [
        item("Whitmore VIP – due " + tomorrow + " 11:00. Quiet upper suite Room 42. Champagne + welcome card. Confirm 15% corp rate on invoice.")
      ],
      guest: [
        item("Room 22 Okonkwo – dep AM. Wake 06:30. Addison Lee 10:15. Collect £42.50 minibar before checkout."),
        item("Room 16 Patel – late arr ~23:45. B.com prepaid. Get mobile at check-in. Twin pref → Room 12 or 25 if free."),
        item("Henderson x4 – interconnect Rooms 14 & 15 tomorrow. Birthday balloons Room 15 at 15:00 (F&B informed)."),
        item("Room 21 Chen – late CO approved 13:00.")
      ],
      maintenance: [
        item("Room 24 – AC not cooling. Guest provided with a fan. Maintenance informed. Follow up next shift."),
        item("Room 31 – Shower mixer dripping. HK reported. Medium priority."),
        item("Lobby WC – Hand dryer failed. Paper towels placed. Maintenance informed."),
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
        item("Back-office printer jamming – restart before AM rush."),
        item("Night audit checklist still open until remaining arrivals clear."),
        item("Walk-in hold on Room 3 until 22:00 – release if no show."),
        item("Lobby Wi-Fi slow around 19:00 – IT ticket raised; guests advised."),
        item("Staff meal keys left at Night desk – return to F&B in the morning.")
      ],
      completed: [
        item("Room 22 transfer booked Addison Lee 10:15.", "completed"),
        item("Room 22 wake-up loaded 06:30.", "completed"),
        item("Room 21 late CO approved to 13:00.", "completed")
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
        { name: "Reception", head: "", contact: "", email: "", instructions: "Front office and guest-facing operations." },
        { name: "Night Team", head: "", contact: "", email: "", instructions: "Night shift operations and End of Day." },
        { name: "Duty Management", head: "", contact: "", email: "", instructions: "Duty Managers cover AM, PM and Middle shifts." },
        { name: "Housekeeping", head: "", contact: "", email: "", instructions: "Room cleaning and release coordination." },
        { name: "Maintenance", head: "", contact: "", email: "", instructions: "Maintenance and engineering follow-up." },
        { name: "Food and Beverage", head: "", contact: "", email: "", instructions: "Restaurant, bar and breakfast." },
        { name: "Management", head: "", contact: "", email: "", instructions: "Management oversight and escalation." }
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
        hotelStandards: "Professional, warm, clear and concise. Pass operational issues with ownership and follow-up. Never invent guest information.",
        vipRules: "Review VIP notes before arrival. Confirm quiet upper-floor allocation where requested. Prepare welcome card and amenities. Confirm invoice discounts.",
        commonTerms: "CD = Classic Double\nDK = Deluxe King\nJS = Junior Suite\nAK = Accessible King",
        operationalNotes: "Consolidate fragmented shift notes into one clear handover without replacing the PMS. Hotel Brain builds context as information is added.",
        localRecommendations: "Mayfair and Green Park are within walking distance.",
        aiInstructions: "Use British English. Prioritise unresolved and urgent matters. Include room numbers. Never invent facts."
      },
      guestServices: {
        airportTransfers: "Record transfer time, supplier and guest details. Pass unresolved transfers to the next shift.",
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
        { type: "expedia", label: "Expedia", specialInstructions: "Charging may complete after 05:00 on arrival day — verify with management." },
        { type: "bookingCom", label: "Booking.com", specialInstructions: "Prepaid bookings common; verify open balances and city tax." }
      ],
      policiesStructured: {
        operational: {
          physicalKeys: {
            title: "Physical keys",
            summary: "Issue, track and follow up unreturned keys.",
            instructions: "Issue keys at check-in. Track unreturned keys. Replacement charge £150.",
            charge: "£150"
          }
        }
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
    var occupancyPct = (roomsSold / totalRooms) * 100;
    var adr = 285;
    var revpar = Math.round(adr * (occupancyPct / 100) * 100) / 100;
    var maintenanceIssues = buildMaintenanceIssues();
    var handoverMaintenance = maintenanceIssues.filter(function (issue) {
      return issue.includeInHandover && issue.status !== "completed";
    });
    var openBalanceCount = 2;

    var adults = 98;
    var children = 14;
    return {
      totalRooms: totalRooms,
      arrivals: 8,
      departures: 6,
      inHouse: adults + children,
      adults: adults,
      children: children,
      occupancy: String(occupancyPct) + "%",
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
    var roomsAvailable = metrics.totalRooms - metrics.roomsSold;
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
      occupancy: metrics.occupancy,
      adr: metrics.adr,
      revpar: metrics.revpar,
      currency: metrics.currency
    };

    return {
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
      timestamp: new Date().toISOString(),
      isDemoData: true,
      sampleDataId: PACK_ID + ":handover:night"
    };
  }

  /**
   * Initial Demo Mode form state only.
   * Prefills messy notes + snapshot — never restores organised/generated output.
   * Visitors must click Generate to run the shared Intelligence Engine.
   */
  function buildDraftPayload(pack) {
    pack = pack || buildPack();
    return {
      hotelName: pack.hotelName,
      preparedBy: pack.preparedBy,
      shift: pack.shift,
      date: pack.date,
      notes: pack.sourceNotes,
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
    if (metrics.occupancyValue !== (metrics.roomsSold / metrics.totalRooms) * 100) {
      errors.push("Occupancy percentage must equal roomsSold / totalRooms * 100.");
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
    buildDraftPayload: buildDraftPayload,
    buildMaintenanceIssues: buildMaintenanceIssues,
    buildGuests: buildGuests,
    buildHotelBrainProfile: buildHotelBrainProfile,
    buildSourceNotes: buildSourceNotes,
    buildMetrics: buildMetrics,
    extractReferencedRooms: extractReferencedRooms,
    validatePackConsistency: validatePackConsistency
  };
})(typeof window !== "undefined" ? window : globalThis);
