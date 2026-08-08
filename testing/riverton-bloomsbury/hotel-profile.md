# The Riverton Bloomsbury

## Fictional property notice

**The Riverton Bloomsbury is entirely fictional.**  
It is not a real hotel. Future guests, companies, staff names, phone numbers, emails, and commercial details used in this suite must also be **fictional**. Do not paste real guest data or real hotel operational notes into this suite.

This profile exists only to validate Hospitality Flow on a larger, more complex property than the 80-room Pilot Hotel, and to reduce overfitting to Zetter or Pilot Hotel patterns.

---

## Overview

The Riverton Bloomsbury is Hospitality Flow’s **post–Sprint 8 generalisation test property**: an independent upscale London hotel with **120 rooms**, multiple room categories, stronger F&B/events footprint, and AM / PM / Night handover pressure.

All future Riverton scenarios should assume this same hotel profile unless a scenario file explicitly overrides a detail.

---

## Property

| Attribute | Value |
|-----------|-------|
| Name | The Riverton Bloomsbury |
| Type | Independent upscale hotel |
| Location | Bloomsbury, London |
| Rooms | **120** |
| Floors | Lower ground (LG) + floors 1–5 |
| Reception | Open 24/7 |
| Positioning | Upscale independent (not boutique-small; not chain mega-property) |

---

## Room inventory (canonical test map)

Use these categories when inventing future fictional scenarios. Room numbers should stay consistent with an ~120-room house.

| Category | Approx. count | Notes for testing |
|----------|--------------:|-------------------|
| Classic Double | 36 | Entry inventory; some street-facing |
| Deluxe King | 42 | Core stock; quiet vs street mix |
| Deluxe Twin / twin-capable | 18 | Twin setup / family / share requests |
| Accessible King | 6 | Accessible inventory; limited substitutes |
| Junior Suite | 10 | VIP / high-touch / upgrade pressure |
| Interconnecting pairs | 4 pairs (8 rooms) | Family / companion stay allocation |
| **Total** | **120** | |

### Numbering convention (for future scenarios)

- **LG01–LG12** — lower ground (noise/light sensitivity; not preferred for VIP unless requested)
- **101–124** — floor 1
- **201–224** — floor 2
- **301–324** — floor 3
- **401–424** — floor 4 (quieter upper stock; some interconnecting)
- **501–514** — floor 5 (suites + remaining deluxe)

Operational attributes that scenarios may use: quiet / street-facing, near lift, interconnecting, accessible, twin-capable, bathtub vs shower, sofa bed (limited).

---

## Facilities and departments

### Front of house / guest services
- Reception (24/7)
- Concierge
- Duty Manager (day / evening coverage)
- Night Manager / Night Reception

### Housekeeping & rooms
- Housekeeping (AM clean + evening turndown on selected categories)
- Laundry / linen coordination (outsource-aware; still hotel-owned guest impact)

### Engineering / maintenance
- Engineering / Maintenance (not full 24/7 engineer on site; on-call overnight)
- Fire / life-safety awareness (panel, OOS lift, etc. may appear in scenarios)

### Food & beverage
- All-day restaurant
- Cocktail bar
- Parlour (afternoon tea / light day dining)
- In-room dining / room service (limited late-night menu)

### Events / spaces
- Meeting Room A (boardroom)
- Meeting Room B (classroom / small conference)
- Private dining room (restaurant-adjacent)

### Other
- Small fitness room (no full spa)
- Luggage store / hold
- Limited parking arrangement (off-site partner — allocation friction possible)

---

## Shifts (handover testing)

| Shift | Typical focus |
|-------|----------------|
| **AM** | Departures, HK sequencing, breakfast F&B pressure, arrivals prep, OOO recovery |
| **PM** | Arrivals peak, VIP setup, meeting-room turnarounds, payment/guarantee catches |
| **Night** | Late arrivals, noise/safety, tokenisation / POA risk, Night→AM continuity, unresolved maintenance |

Reception remains the primary handover consumer; Duty Manager and Night Manager own escalation continuity.

---

## Guest mix and commercial products

- Mixed leisure and corporate
- Repeat / “preferred” guests and explicit VIP markers
- OTA + direct + corporate account mix
- Airport transfers (Heathrow / Gatwick style timed pickups)
- Wake-up calls
- Late check-out / early arrival (inventory-constrained at high occupancy)
- Long-stay / multi-night corporate
- Anniversary / celebration amenities
- Complimentary upgrades “to balance the house” (inventory language — not folio payment)
- Group / small conference blocks using meeting rooms

---

## Operational characteristics (why this hotel stresses HF)

Designed to challenge generalisation beyond Pilot Hotel (80 rooms) and Zetter-sized boutique patterns:

1. **Larger inventory** — more concurrent open work; room binding and allocation matter more.
2. **Explicit categories** — twin / accessible / suite / interconnect mistakes are high-impact.
3. **LG + upper floors** — location preferences and “not basement / not LG” style requests.
4. **Stronger F&B & events** — meeting-room turnarounds and parlour/tea notes compete with rooms work.
5. **Duty Manager + Night Manager** — ownership / routing and continuity across shifts.
6. **Engineering on-call overnight** — tomorrow-inspect vs immediate chase must stay distinct.
7. **High-occupancy pressure** — Opera/allocation, OOO, upgrades, and late c/o SFA collide.
8. **Messier multi-section handovers** — Arrivals / Departures / General notes with conflicting section labels (as in real pastes).

---

## Differences from existing test environments

| Environment | Role | How Riverton differs |
|-------------|------|----------------------|
| **Zetter Marylebone** | Real field evidence | Riverton is **fully fictional**; larger; more room categories; events/F&B footprint |
| **Pilot Hotel (80)** | Fictional boutique regression | Riverton is **120 rooms**, upscale independent, LG floors, interconnecting pairs, Duty Manager layer, two meeting rooms + parlour |
| **Oakwood Mayfair demo** | In-app demo pack | Riverton is a **repo test suite profile**, not Demo Mode sample data |

Do **not** reuse Pilot Hotel guest names, room maps, or Zetter real notes in Riverton scenarios.

---

## Usage notes

- Use this profile as the fixed operational context for Riverton scenarios 001 onwards (when created).
- Do not invent a different property size, location, or department list unless a scenario explicitly overrides a detail.
- Keep room numbers, guest names, and commercial details consistent with a **120-room** London upscale independent hotel.
- Scenarios are **not created yet** — see [SCENARIO_INDEX.md](SCENARIO_INDEX.md).
- Live Supabase workspace creation is **out of scope for Phase A** (local profile only).
