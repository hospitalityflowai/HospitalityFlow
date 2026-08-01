/**
 * Hospitality Flow — Oakwood Marylebone Demo Mode sample pack
 * Fully fictional boutique hotel. Canonical room inventory is the single source of truth.
 * Demo Mode only — never persisted to customer Supabase records.
 */
(function (global) {
  "use strict";

  var PACK_ID = "hf-oakwood-demo-v1";
  var PACK_LABEL = "The Oakwood Marylebone Demo";
  var HOTEL_NAME = "The Oakwood Marylebone";
  var PREPARED_BY = "Sophie Chen · Night Manager";

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
   * Canonical 24-room inventory for The Oakwood Marylebone.
   * All demo guests, maintenance, payments and notes must use these room numbers only.
   */
  function buildRoomInventory() {
    return [
      { roomNo: "1", roomType: "Classic Double", floor: "Lower ground", twinCapable: false, accessible: false, quiet: false, streetFacing: true, connectingRoom: "", notes: "Street-facing lower-ground room" },
      { roomNo: "2", roomType: "Classic Twin", floor: "Lower ground", twinCapable: true, accessible: false, quiet: false, streetFacing: true, connectingRoom: "", notes: "Twin-capable; street-facing" },
      { roomNo: "3", roomType: "Classic Double", floor: "Lower ground", twinCapable: false, accessible: false, quiet: true, streetFacing: false, connectingRoom: "", notes: "Quiet lower-ground; away from lift" },
      { roomNo: "4", roomType: "Classic Double", floor: "Lower ground", twinCapable: false, accessible: false, quiet: true, streetFacing: false, connectingRoom: "", notes: "Quiet lower-ground room" },
      { roomNo: "5", roomType: "Classic Double", floor: "Lower ground", twinCapable: false, accessible: false, quiet: false, streetFacing: false, connectingRoom: "", notes: "Lower-ground garden side" },
      { roomNo: "11", roomType: "Deluxe King", floor: "1", twinCapable: false, accessible: false, quiet: false, streetFacing: true, connectingRoom: "", notes: "Street-facing deluxe" },
      { roomNo: "12", roomType: "Deluxe Twin", floor: "1", twinCapable: true, accessible: false, quiet: false, streetFacing: true, connectingRoom: "", notes: "Twin-capable deluxe; street-facing" },
      { roomNo: "14", roomType: "Deluxe King", floor: "1", twinCapable: false, accessible: false, quiet: true, streetFacing: false, connectingRoom: "15", notes: "Quiet; interconnects with 15" },
      { roomNo: "15", roomType: "Deluxe King", floor: "1", twinCapable: false, accessible: false, quiet: true, streetFacing: false, connectingRoom: "14", notes: "Quiet; interconnects with 14" },
      { roomNo: "16", roomType: "Deluxe King", floor: "1", twinCapable: false, accessible: false, quiet: false, streetFacing: false, connectingRoom: "", notes: "Away from lift" },
      { roomNo: "21", roomType: "Deluxe King", floor: "2", twinCapable: false, accessible: false, quiet: false, streetFacing: true, connectingRoom: "", notes: "Street-facing" },
      { roomNo: "22", roomType: "Deluxe King", floor: "2", twinCapable: false, accessible: false, quiet: false, streetFacing: true, connectingRoom: "", notes: "Street-facing; popular with regulars" },
      { roomNo: "23", roomType: "Accessible King", floor: "2", twinCapable: true, accessible: true, quiet: false, streetFacing: true, connectingRoom: "", notes: "Accessible; twin-capable" },
      { roomNo: "24", roomType: "Deluxe King", floor: "2", twinCapable: false, accessible: false, quiet: false, streetFacing: false, connectingRoom: "25", notes: "Interconnects with 25" },
      { roomNo: "25", roomType: "Deluxe Twin", floor: "2", twinCapable: true, accessible: false, quiet: true, streetFacing: false, connectingRoom: "24", notes: "Quiet; twin-capable; interconnects with 24" },
      { roomNo: "31", roomType: "Deluxe King", floor: "3", twinCapable: false, accessible: false, quiet: false, streetFacing: true, connectingRoom: "", notes: "Street-facing" },
      { roomNo: "32", roomType: "Deluxe King", floor: "3", twinCapable: false, accessible: false, quiet: false, streetFacing: true, connectingRoom: "", notes: "Street-facing" },
      { roomNo: "33", roomType: "Accessible King", floor: "3", twinCapable: true, accessible: true, quiet: false, streetFacing: true, connectingRoom: "", notes: "Accessible; twin-capable" },
      { roomNo: "34", roomType: "Deluxe King", floor: "3", twinCapable: false, accessible: false, quiet: true, streetFacing: false, connectingRoom: "35", notes: "Quiet; interconnects with 35" },
      { roomNo: "35", roomType: "Deluxe Twin", floor: "3", twinCapable: true, accessible: false, quiet: true, streetFacing: false, connectingRoom: "34", notes: "Quiet; twin-capable; interconnects with 34" },
      { roomNo: "41", roomType: "Junior Suite", floor: "4", twinCapable: false, accessible: false, quiet: false, streetFacing: true, connectingRoom: "", notes: "Street-facing junior suite" },
      { roomNo: "42", roomType: "Junior Suite", floor: "4", twinCapable: false, accessible: false, quiet: true, streetFacing: false, connectingRoom: "", notes: "Quiet upper-floor suite; away from lift — preferred for VIP" },
      { roomNo: "43", roomType: "Deluxe Twin", floor: "4", twinCapable: true, accessible: false, quiet: false, streetFacing: true, connectingRoom: "", notes: "Twin-capable; street-facing" },
      { roomNo: "44", roomType: "Junior Suite", floor: "4", twinCapable: false, accessible: false, quiet: true, streetFacing: false, connectingRoom: "", notes: "Quiet upper-floor suite" }
    ];
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
    var tomorrow = tomorrowLabel();
    return [
      "PM → Night handover — busy evening, please read carefully.",
      "",
      "VIP: Ms Eleanor Whitmore arriving tomorrow " + tomorrow + " at 11:00. Prefers a quiet upper-floor room away from the lift. Allocate Room 42 (Junior Suite). Champagne and handwritten welcome card required. Corporate rate — 15% discount must appear on final invoice.",
      "",
      "Mr James Okonkwo (regular guest) in Room 22 — checking out tomorrow morning. Prefers higher floors; left positive feedback about Room 22. Airport transfer confirmed for 10:15 (Addison Lee). Wake-up call scheduled for 06:30. Open minibar balance £42.50 still on folio — collect before departure.",
      "",
      "Mrs Patel — late arrival expected around 23:45 into Room 16. Booking.com prepaid. Missing mobile number on profile — please obtain at check-in. Twin beds requested; currently allocated Deluxe King Room 16 — move to twin-capable Room 12 if available, otherwise Room 25.",
      "",
      "Room 24 — air conditioning not cooling properly. Guest reported at 19:20. Maintenance informed but has not attended yet. Guest offered portable fan. Include in morning handover until resolved.",
      "",
      "Room 31 — dripping shower mixer. Housekeeping noticed during turn-down. Not guest-impacting tonight but needs attention tomorrow. Priority medium.",
      "",
      "Lobby WC — hand dryer failed this evening. Public area — Maintenance aware. Temporary paper towels placed.",
      "",
      "Room 11 — in-room safe keypad intermittent. Guest relocated to Room 21 temporarily; Room 11 on hold pending parts.",
      "",
      "Travel adapters still outstanding: Room 15 and Room 16. Confirm return at checkout or apply £20 charge.",
      "",
      "Room 4 — Expedia booking. Charging may complete after 05:00 on arrival day. Outstanding city tax £12.50 to collect.",
      "",
      "Group of 4 (Henderson party) arriving tomorrow afternoon — interconnecting rooms 14 & 15 requested. Birthday package and balloons for Room 15 at 15:00. F&B informed.",
      "",
      "Remaining arrivals tonight: 2 (Patel Room 16, walk-in hold on Room 3 until 22:00).",
      "Departures tomorrow: 6 including Okonkwo Room 22 and Chen Room 21 (late checkout approved until 13:00).",
      "In-house: 18. Occupancy 75%. ADR £285. RevPAR £213.75.",
      "",
      "No-show: Mr Davies — Room 5 — Booking.com. Follow up per hotel policy; do not release until Night confirms.",
      "",
      "Lost property: gold cufflink found in Room 25 after departure (Mr Fraser). Stored in Duty Manager safe. Guest contacted via email."
    ].join("\n");
  }

  function buildOrganisedHandover() {
    var tomorrow = tomorrowLabel();
    return {
      urgent: [
        item("Room 24 — A/C not cooling; Maintenance informed at 19:20, not yet attended. Portable fan provided. Follow up urgently.")
      ],
      vip: [
        item("Ms Eleanor Whitmore arriving " + tomorrow + " 11:00 — quiet upper-floor Junior Suite Room 42. Champagne + welcome card. Confirm 15% corporate discount on invoice.")
      ],
      guest: [
        item("Mr James Okonkwo (Room 22, regular) — departure tomorrow; wake-up 06:30; Addison Lee transfer 10:15. Collect £42.50 minibar balance before checkout."),
        item("Mrs Patel (Room 16) — late arrival ~23:45; Booking.com prepaid; obtain mobile number; twin preference — move to twin-capable Room 12 or Room 25 if available."),
        item("Henderson party — interconnecting Rooms 14 & 15 tomorrow; birthday package + balloons Room 15 at 15:00 (F&B informed)."),
        item("Room 21 Chen — late checkout approved until 13:00 (relocated from Room 11 while safe is repaired)."),
        item("Adapters outstanding Rooms 15 and 16 — return or £20 charge at checkout.")
      ],
      maintenance: [
        item("Room 24 — A/C cooling failure (guest impact). Include in handover until resolved."),
        item("Room 31 — dripping shower mixer (noticed at turn-down). Medium priority for morning."),
        item("Lobby WC — hand dryer failed; paper towels in place pending repair."),
        item("Room 11 — safe keypad intermittent; room on hold; guest in Room 21. Waiting for parts.")
      ],
      payments: [
        item("Room 22 — open minibar balance £42.50 before Okonkwo departure."),
        item("Room 4 — Expedia; city tax £12.50 still to collect. Note post-05:00 charging window.")
      ],
      events: [
        item("Henderson birthday package — balloons and welcome set for Room 15 at 15:00 tomorrow.")
      ],
      tasks: [
        item("Obtain Mrs Patel mobile number at check-in and update profile."),
        item("Confirm Room 42 allocation for Whitmore VIP (quiet upper suite)."),
        item("Whitmore VIP — verify 15% corporate discount applied to final invoice."),
        item("Mr Davies no-show Room 5 — follow hotel no-show policy before releasing."),
        item("Lost property: gold cufflink (Room 25 / Mr Fraser) in DM safe — guest emailed.")
      ],
      inventory: [
        item("Travel adapter stock — two still on loan (Rooms 15 and 16); monitor low-stock threshold.")
      ],
      deliveries: [],
      lostproperty: [
        item("Gold cufflink found Room 25 after Mr Fraser departure — DM safe; email sent.")
      ],
      general: [
        item("Remaining arrivals tonight: 2. Departures tomorrow: 6. In-house 18 (75% occupancy). ADR £285. RevPAR £213.75.")
      ],
      completed: [
        item("Airport transfer for Okonkwo confirmed with Addison Lee (10:15).", "completed"),
        item("Wake-up call Room 22 loaded for 06:30.", "completed"),
        item("Chen late checkout authorised until 13:00; temporary move to Room 21 completed.", "completed")
      ]
    };
  }

  function buildRecommendations() {
    return [
      {
        id: "demo-rec-ac",
        title: "Escalate Room 24 A/C",
        reason: "Guest-impacting cooling issue remains unresolved after evening report.",
        priority: "high",
        status: "pending",
        actions: ["Confirm Maintenance ETA", "Offer room move if unresolved by morning"]
      },
      {
        id: "demo-rec-vip",
        title: "Prepare Whitmore VIP arrival",
        reason: "Quiet upper-floor preference matches Room 42; amenities and invoice discount need confirmation before 11:00.",
        priority: "high",
        status: "pending",
        actions: ["Confirm Room 42", "Champagne & welcome card", "Verify 15% discount"]
      },
      {
        id: "demo-rec-balance",
        title: "Clear Room 22 open balance",
        reason: "£42.50 minibar balance must be settled before Okonkwo departure and transfer.",
        priority: "medium",
        status: "pending",
        actions: ["Present folio at wake-up / before 10:15 transfer"]
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
    return "Night inherits one guest-impacting A/C issue in Room 24, a Whitmore VIP arrival tomorrow at 11:00 into quiet Junior Suite Room 42, and payment follow-ups including Room 22’s £42.50 minibar balance before the 10:15 transfer. Two arrivals remain tonight; adapters on Rooms 15 and 16 still need return or charge. Room 11 remains on hold for a safe keypad part.";
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
        hotelCode: "OAK-MLB",
        hotelType: "Independent boutique hotel",
        starRating: "4",
        totalRooms: "24",
        totalFloors: "5",
        address: "Marylebone",
        city: "London",
        country: "United Kingdom",
        phone: "",
        email: "",
        description: "A 24-room independent boutique hotel in Marylebone. Highly personalised service with strong shift-to-shift communication.",
        brandColor: "",
        logo: "",
        timezone: "Europe/London",
        currency: "GBP",
        brandVoice: "Professional, warm, clear and concise",
        operatingNotes: "Boutique service. Pass unresolved issues with ownership. Never invent guest facts."
      },
      aiPrefs: {
        tone: "professional",
        detail: "standard",
        language: "British English",
        dateFormat: "DD/MM/YYYY (24-hour)",
        instructions: "Use British English. Be concise but operationally complete. Prioritise unresolved and urgent matters. Include room numbers. Never invent facts."
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
        { code: "CD", type: "Classic Double", count: "4", floors: "Lower ground", maxGuests: "2" },
        { code: "CT", type: "Classic Twin", count: "1", floors: "Lower ground", maxGuests: "2" },
        { code: "DK", type: "Deluxe King", count: "10", floors: "1–3", maxGuests: "2" },
        { code: "DT", type: "Deluxe Twin", count: "4", floors: "1–4", maxGuests: "2" },
        { code: "AK", type: "Accessible King", count: "2", floors: "2–3", maxGuests: "2" },
        { code: "JS", type: "Junior Suite", count: "3", floors: "4", maxGuests: "2" }
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
        generalNotes: "The Oakwood Marylebone is a 24-room independent boutique hotel in London. Service is highly personalised and shift communication is critical.",
        hotelStandards: "Professional, warm, clear and concise. Pass operational issues with ownership and follow-up. Never invent guest information.",
        vipRules: "Review VIP notes before arrival. Confirm quiet upper-floor allocation where requested. Prepare welcome card and amenities. Confirm invoice discounts.",
        commonTerms: "CD = Classic Double\nDK = Deluxe King\nJS = Junior Suite\nAK = Accessible King",
        operationalNotes: "Consolidate fragmented shift notes into one clear handover without replacing the PMS.",
        localRecommendations: "Marylebone High Street and Regent's Park are within walking distance.",
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
    var totalRooms = 24;
    var roomsSold = 18;
    var occupancyPct = (roomsSold / totalRooms) * 100;
    var adr = 285;
    var revpar = Math.round(adr * (occupancyPct / 100) * 100) / 100;
    var maintenanceIssues = buildMaintenanceIssues();
    var handoverMaintenance = maintenanceIssues.filter(function (issue) {
      return issue.includeInHandover && issue.status !== "completed";
    });
    var openBalanceCount = 2;

    return {
      totalRooms: totalRooms,
      arrivals: 8,
      departures: 6,
      inHouse: roomsSold,
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
    var snapshot = {
      arrivals: metrics.arrivals,
      departures: metrics.departures,
      inHouse: metrics.inHouse,
      occupancy: metrics.occupancy,
      adr: metrics.adr,
      revpar: metrics.revpar,
      roomsSold: metrics.roomsSold,
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
      hasGeneratedOutput: true,
      organisedHandover: pack.organisedHandover,
      aiSummary: pack.aiSummary,
      generatedTime: pack.generatedTime,
      recommendations: pack.recommendations,
      shiftIntelligenceChecklist: pack.shiftIntelligenceChecklist,
      savedAt: new Date().toISOString(),
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

    if (inventory.length !== 24) {
      errors.push("Inventory must contain exactly 24 rooms (found " + inventory.length + ").");
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

    if (metrics.inHouse !== metrics.roomsSold) {
      errors.push("inHouse must equal roomsSold.");
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
      errors.push("hotelName must be The Oakwood Marylebone.");
    }

    return { ok: errors.length === 0, errors: errors, referencedRooms: referenced };
  }

  global.HFDemoSampleData = {
    PACK_ID: PACK_ID,
    PACK_LABEL: PACK_LABEL,
    HOTEL_NAME: HOTEL_NAME,
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
