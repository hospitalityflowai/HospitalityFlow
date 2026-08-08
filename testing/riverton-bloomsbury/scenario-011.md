# Scenario-011 — Corporate Block vs Leisure VIP Same Surname

## Scenario Metadata
- Hotel: The Riverton Bloomsbury (fictional)
- Scenario ID: 011
- Title: Corporate Block vs Leisure VIP Same Surname
- Shift: PM
- Operational load: Busy
- Departments: Reception, Concierge, Housekeeping
- Difficulty: Hard
- Ambiguity intentional: Yes (same surname)
- Spec capability: Entity separation; amenity non-merge
- Matrix status: Authored / frozen (test specification)
- Date authored: 2026-08-08
- HF run: not run
- Evidence complete: No

## Original Input / Raw Source Notes

PLEASE KEEP THESE SEPARATE — same surname, different worlds.

PARTY A — CORPORATE
Company: HelioSpan UK
Block name on folio: **Brennan**
Rooms: **205, 207, 209** (triples / colleagues)
Arrivals staggered 16:00–19:00
POA: company billed / room+breakfast — **do not take personal cash settlement narratives**
No amenities ordered for the block. Water in meeting Room A for their 09:00 tomorrow — events owns that.

PARTY B — LEISURE VIP
**Ms Camille Brennan** — Junior Suite **507**
ETA 20:30
VIP list from sales: handwritten card, seasonal fruit, still water — **for 507 only**
Prefers quiet / not near lift (507 is ok)
Personal AMEX on booking — not company.

Desk chat trap:
“Brennan fruit?” — that is Camille in **507**, not the HelioSpan rooms.
“Brennan invoice?” — HelioSpan company billing, not Camille.

Also tonight:
rm 118 noise complaint earlier — resolved
Departure taxi 06:10 tomorrow for **Mr Owen Brennan** who is **already in-house rm 312** — third Brennan! Leisure stayover, no VIP amenities, prepaid. Taxi only. Do not merge with Camille or HelioSpan.

### Hotel Snapshot
Arrivals 33 / Dep 21 / Stay 74 / Occ ~89% / busy

## Human Expected Truth

### Current operational facts
- Three distinct Brennan contexts: HelioSpan corporate **205/207/209**; VIP **Camille Brennan 507** with amenities; stayover **Owen Brennan 312** taxi tomorrow only.
- Corporate block: company billed — not personal collect narrative.
- Camille amenities: card, fruit, still water for **507 only**.
- HelioSpan MR-A water tomorrow is events, not Camille VIP.

### Expected work states

#### OPEN
- Prepare Camille VIP amenities in **507** (card/fruit/water) before ~20:30.
- Check in HelioSpan rooms as company-billed block without amenity merge.
- Ensure Owen **312** taxi 06:10 awareness for night/AM (timed departure transport).

#### MONITOR
- Staggered HelioSpan arrivals 16:00–19:00.

#### INFORMATION
- Resolved noise 118; MR-A water for corporate tomorrow.

#### UNRESOLVED
- None required for identity if kept separate; ambiguity is the surname collision risk itself.

### Must not infer / invent
- Merging Camille amenities onto 205/207/209 (or Owen).
- One payment chase covering all Brennans.
- Collapsing all Brennans to a single entity.
- Charging Camille’s amenities to HelioSpan or vice versa.

## Actual HF Output
[NOT RUN — awaiting human review]
