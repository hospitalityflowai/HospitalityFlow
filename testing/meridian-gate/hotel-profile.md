# Hotel Profile — The Meridian Gate Hotel & Spa

> **Fictional property.** All names, room numbers, departments, contracts, and operational details below are invented for Hospitality Flow generalisation testing. They do not describe a real hotel or real guests.

## Identity

| Field | Value |
|-------|--------|
| Trading name | The Meridian Gate Hotel & Spa |
| Type | Independent upscale (fictional 4★) |
| Location model | Airport-adjacent (fictional “Thames Valley International”, ~12-minute shuttle) |
| Room count | **56** |
| Buildings | **Main House** (38) + **Courtyard Annex** (18) |
| Positioning | Business + leisure + airline crew + spa day members |

## Inventory & room identifiers

Unfamiliar identifiers (deliberately not simple 1xx–5xx city stock):

| Block | Pattern | Count / notes |
|-------|---------|----------------|
| Main House | `M101`–`M318` | Floor + wing style; 38 rooms |
| Courtyard Annex | `CX01`–`CX18` | Separate keys / HK board; 18 rooms |
| Spa suites | `MS01`–`MS04` | In Main; spa-adjacent product |
| Accessible | `MA02`, `MA14`, `CX03` | Scarce; three only |
| Interconnect | Main only | 8 interconnect pairs |
| Quiet wing | Main | 6 rooms preferred for crew rest |

**House truths**

- Sellable guest rooms ≠ spa treatment rooms
- Annex can be “full” while Main still has voids — do not invent cross-building moves
- Day spa guests are **not** in-house until a stay conversion is evidenced
- Crew blocks are contractual inventory, not free reallocation stock
- Shuttle is timed transport ops, not generic taxi prose

## Departments / ownership mix

Reception · Concierge · Housekeeping · Engineering · Duty Manager · **Spa** · **Shuttle / Transport** · **Valet / Parking** · F&B (brasserie + in-room) · Events (weekend pavilion) · Night Team

## Guest mix

- Airline crew blocks (contracted)
- Early / late flyers
- Spa day members (non-resident)
- Midweek corporates
- Weekend leisure
- Occasional wedding / pavilion parties

## F&B and events

- Brasserie: breakfast-heavy early peak
- Spa café (day trade)
- Limited evening dining
- **Events Pavilion:** Saturday wedding / private events (not daily urban F&B clutter)

## Transport and parking

- Airport shuttle loops (AM/PM driver coverage; not 24/7)
- Valet / parking tickets and capacity pressure
- Lean night: valet typically ends ~23:00; leftovers escalate to Night / DM

## Staffing model (lean Night)

| Period | Model |
|--------|--------|
| AM | Reception + HK peak; spa opens; shuttle active; breakfast pressure |
| PM | Inbound leisure; spa day→overnight conversions; shuttle; valet |
| Night | 1 Night Manager + 1 porter; spa closed from 21:00; DM covers annex after 22:00; early crew arrivals often 04:00–06:00 |

## Shift handover realism

- **AM:** crew outs, spa open, shuttle rush, breakfast, annex readiness
- **PM:** flyers inbound, spa conversions, valet, pavilion prep on event days
- **Night:** quiet lobby, early crew, annex incidents, valet leftovers, lean ownership

## Deliberate differences vs prior corpora

| Corpus | Meridian Gate contrast |
|--------|-------------------------|
| Zetter Marylebone (~24, boutique urban) | Split building; airport clock; spa / shuttle / valet |
| Pilot Hotel (80) | 56 rooms; dual inventory; non-numeric room tokens |
| Riverton Bloomsbury (120, city) | Not “smaller Riverton” — annex, crew blocks, spa day guests, pavilion weekends |

## Authority note

This profile is the **house-truth authority** for future Meridian scenarios. Scenario files (not yet written) must stay consistent with it. Human Expected Truth for each scenario will be authored and frozen **before** any HF engine run.
