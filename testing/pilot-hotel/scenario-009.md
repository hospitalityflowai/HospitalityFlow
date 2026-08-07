# Scenario-009 — Amelia Foster — Repeat Guest Intelligence

## Test Metadata
- Date tested: 2026-08-07
- Hotel: Hotel Pilot
- Shift: AM
- Record id: 46542d41-ee66-44e5-a3a7-66df4adcdab5
- created_at: 2026-08-07 17:57:00.917471+00
- Scenario focus: Repeat guest / Guest Intelligence / historical preferences (Amelia Foster, rm42)
- HF version/commit: [NOT RECORDED]
- Workspace id: 090ec1b9-2c03-41ac-a4ea-19c412f7da37
- Prepared by: Not specified
- Evidence source: `testing/pilot-hotel/exports/pilot-hotel-scenarios-001-020.csv` (Supabase saved handover; not re-generated)

## Original Input

### Today's Arrivals
VIP Amelia Foster rm42 ETA 21:30. 7th stay.

Guest profile says:
- prefers quiet/high-floor rooms
- oat milk
- usually requests late checkout

CURRENT STAY:
rm42 confirmed high floor + quiet.
Oat milk already placed.
Guest has NOT requested late checkout this stay.
Do NOT assume she wants one.

---

David Harris rm24 ETA 22:00. Repeat guest.

Old profile note from 2024:
"Likes feather pillows."

UPDATE from previous stay May 2026:
Guest specifically requested FEATHER-FREE pillows and said he no longer uses feather pillows.

Current stay:
Feather-free pillows requested again.
HK confirmed placed rm24.

Latest preference = FEATHER-FREE.

---

Sofia Rossi rm31 ETA 23:15. 4th stay.

Previous stays:
- stayed rm31 twice and liked it
- once complained rm11 was noisy/street-facing
- prefers rooms away from street

Current allocation rm31.
No special setup requested.

---

Michael Grant rm18 ETA 20:45.

Stayed once before.
Previous stay was anniversary and hotel provided complimentary prosecco.

THIS STAY IS NOT AN ANNIVERSARY.
No prosecco requested.
Do not automatically repeat anniversary amenity.

---

Anna Wilson rm35 ETA around midnight. Repeat corporate guest.

Known preference:
- firm pillows
- sparkling water

Current stay:
Firm pillows confirmed.
Sparkling water NOT yet placed.

Company pays room + tax.
Guest pays extras.

---

Robert Lewis rm27 ETA 22:30.

Guest profile contains:
"Guest complained about AC during July stay."

This is historical incident information, NOT a guest preference.

rm27 AC currently working normally.
Do not create maintenance action from historical complaint.

---

Emma Clark rm15 ETA 21:00.

First stay.
Booking note:
"Would love a quiet room if possible."

This is a CURRENT REQUEST.
Do not automatically turn it into a permanent confirmed guest preference yet.

---

James Miller rm12 ETA 23:00. Repeat guest.

Profile says:
"Usually drinks red wine in bar."

No wine requested for room.
Do NOT create amenity/preparation from observed spending behaviour.

### Today's Departures
Amelia Foster previous stay record says:
"Late checkout 14:00 approved."

That belongs to her PREVIOUS STAY.
It does NOT mean today's booking has late checkout.

rm8 Thompson checked out today.
Profile note says guest likes extra water.
No future action required tonight.

rm21 Parker checked out.
During this stay guest requested dental kit because luggage was delayed.
This was a ONE-TIME situational request.
Do not store "dental kit" as permanent preference.

rm14 Williams checked out.
Guest mentioned at departure:
"I always prefer a room with a bathtub."

Potential repeat preference worth remembering.

rm33 Evans checked out.
Guest complained restaurant was slow last night.
Complaint resolved with manager.
Do not convert complaint into permanent preference.

rm6 Brown checked out.
Guest asked for taxi to Heathrow this morning.
Taxi request was stay-specific, not long-term guest preference.

### General Hotel / Shift Notes
GUEST INTELLIGENCE REVIEW:

Amelia Foster:
Known stable preferences = quiet/high floor + oat milk.
Late checkout is NOT automatic.
Oat milk completed tonight.
No late checkout request currently.

David Harris:
OLD preference "feather pillows" is outdated.
Latest confirmed preference = FEATHER-FREE.
Do not show both as active preferences.

Sofia Rossi:
Strong evidence she prefers quieter rooms away from street.
rm31 satisfies preference tonight.

Michael Grant:
Previous anniversary prosecco was occasion-specific.
Do NOT prepare prosecco tonight.

Anna Wilson:
Firm pillows + sparkling water are established repeat preferences.
Firm pillows DONE.
Sparkling water still outstanding.

Robert Lewis:
Historical AC complaint is incident history.
It does NOT mean "prefers AC", "needs maintenance" or "AC problem tonight".

Emma Clark:
Quiet room request is from first stay.
Treat as current-stay request.
Could become a preference only if repeated/confirmed later.

James Miller:
Red wine purchase history is NOT an explicit preference request.
Do not proactively send wine.

---

Potential Guest Intelligence updates from departures:

Williams rm14:
Guest explicitly said "I always prefer a room with a bathtub."
This may be suitable to save as a preference.

Parker rm21:
Dental kit due delayed luggage = do NOT save as permanent preference.

Brown rm6:
Airport taxi = do NOT save as permanent preference.

Evans rm33:
Restaurant complaint = historical service incident, not preference.

---

IMPORTANT MEMORY RULE:

Historical facts are not automatically current actions.

A guest preference is not automatically a preparation for every stay.

An old preference can be superseded by newer information.

One-time requests should not automatically become permanent memory.

Observed behaviour should not be treated as an explicit guest request.

Do not invent preferences from complaints.

---

Amelia rm42 welcome card placed at 19:30.
No action.

Anna rm35 sparkling water still needs placing before midnight arrival.

David rm24 feather-free pillows confirmed done.

Emma rm15 currently allocated quiet rear-facing room.

Sofia rm31 room ready.

Michael rm18 room ready.

Robert rm27 room ready, AC checked and working.

James rm12 room ready.

Tomorrow reservations team will review Guest Intelligence profiles.
Night team only needs to record clearly supported useful observations.

### Hotel Snapshot
Stored Hotel Snapshot values from `metrics.hotelSnapshot`:

- Departures: 14
- Sellable Rooms: 80
- OOO Rooms: 0

Snapshot fields present but blank/sparse (not invented): RevPAR, RevPAR (value).

## Expected Current Truth
- Amelia **42**: quiet/high floor + oat milk **done**; card placed; **no** late c/o this stay (previous-stay late c/o must not apply).
- Harris **24**: latest pref **feather-free** (not old feather); pillows **done**.
- Rossi **31**: away-from-street OK.
- Grant **18**: **no** anniversary prosecco.
- Wilson **35**: firm pillows done; **sparkling water still needed**.
- Lewis **27**: historical AC complaint ≠ current fault; AC OK.
- Clark **15**: quiet room = **current request** only.
- Miller **12**: wine history ≠ amenity request.
- Departure intel: Williams bathtub may be save-worthy; dental kit / taxi / restaurant complaint must **not** become permanent prefs.

## Expected Important Actions
1. Place Anna sparkling water before midnight.
2. Do **not** invent AC work on 27.
3. Do **not** auto late-c/o Amelia or prosecco Michael.
4. Optionally note Williams bathtub for reservations review tomorrow.

## Actual HF Output

Recovered from saved `generated_handover` / `recommendation_state` / `metrics` at save time. Wording below is from the historical record (not re-run).

### Output metadata
- Saved date display: Friday, 7 August 2026
- Generated/saved timestamp (from record): 2026-08-07T17:58:40.274Z
- Checklist state: none saved / empty

### AI Summary / Today's Briefing
Priority 1
Follow up with Maintenance regarding Room 27 AC fault before further guest impact.

Priority 2
Follow up with Maintenance regarding AC fault before further guest impact.

Priority 3
VIP readiness follow-up for Amelia Foster in Room 42 — welcome card.

### Organised Handover Sections
#### Urgent / Shift Alerts (3)
- Sparkling water.
- Sparkling water NOT yet placed.
- Room 35 – Anna sparkling water still needs placing before midnight arrival. Please follow up during this shift.

#### VIP
_No items_

#### Guest Follow-up (13)
- Taxi booked.
- Late check-out confirmed for 14:00.
- The guest has raised a complaint.
- The guest has raised a complaint.
- The guest has raised a complaint.
- This was a ONE-TIME situational request.
- Guest mentioned at departure.
- The guest has raised a complaint.
- Treat as current-stay request.
- Red wine purchase history is NOT an explicit preference request.
- Potential Guest Intelligence updates from departures.
- One-time requests should not automatically become permanent memory.
- Observed behaviour should not be treated as an explicit guest request.

#### Maintenance (4)
- Room 27 – AC issue reported.
- AC issue reported. Guest unhappy.
- Do not create maintenance action from historical complaint.
- No action.

#### Payments / Finance (1)
- Outstanding balance remains on the account.

#### Outstanding Tasks
_No items_

#### Events / Timeline (5)
- Room 31 – Current allocation.
- Tomorrow reservations team will review Guest Intelligence profiles.
- Room 11 – Once complained was noisy/street-facing.
- No prosecco requested.
- This is a CURRENT REQUEST.

#### Preparations (11)
- Review original note
- ☑ Previous stay was anniversary
- ☑ Hotel provided complimentary prosecco. | THIS STAY IS NOT AN ANNIVERSARY. | Previous…
- ☐ Do not automatically repeat anniversary amenity. | Do NOT create amenity
- ☐ No special setup requested.
- ☐ Dental kit
- ☐ Do NOT prepare prosecco tonight.
- Dental Kit
- ☐ Dental kit
- Amelia — Room 42
- ☑ Welcome card

#### Completed Actions (3)
- Room 24 – Extra pillows requested.
- The guest has raised a complaint.
- Oat milk completed tonight.

#### Inventory
_No items_

#### Deliveries
_No items_

#### Lost Property
_No items_

#### Open Questions
_No items_

#### General / Operational Notes (75)
- Quiet room request is from first stay.
- Room 12 – James room ready.
- Room 15 – Emma currently allocated quiet rear-facing room.
- Room 18 – Michael room ready.
- Room 31 – Sofia room ready.
- Company pays room + tax.
- No wine requested for room.
- "I always prefer a room with a bathtub.".
- Guest explicitly said "I always prefer a room with a bathtub.".
- GUEST INTELLIGENCE REVIEW.
- Guest profile says.
- Prefers quiet/high-floor rooms.
- Oat milk.
- CURRENT STAY: | Current stay.
- Room 42 – Confirmed high floor + quiet.
- Oat milk already placed.
- Do NOT assume she wants one.
- .
- Room 24 – David Harris ETA 22:00. Repeat guest.
- Old profile note from 2024.
- UPDATE from previous stay May 2026.
- Room 24 – Housekeeping confirmed placed.
- Room 31 – Sofia Rossi ETA 23:15. 4th stay.
- Previous stays.
- Room 31 – Stayed twice and liked it.
- Prefers rooms away from street.
- Room 18 – Michael Grant ETA 20:45.
- Stayed once before.
- Room 35 – Anna Wilson ETA around midnight. Repeat corporate guest.
- Known preference.
- Guest pays extras.
- Room 27 – Robert Lewis ETA 22:30.
- Guest profile contains.
- This is historical incident information, NOT a guest preference.
- Room 15 – Emma Clark ETA 21:00.
- First stay.
- Booking note.
- Do not automatically turn it into a permanent confirmed guest preference yet.
- Room 12 – James Miller ETA 23:00. Repeat guest.
- Profile says.
- "Usually drinks red wine in bar.".
- Amelia Foster previous stay record says.
- That belongs to her PREVIOUS STAY.
- Room 8 – Thompson checked out today.
- Profile note says guest likes extra water.
- No future action required tonight.
- Room 21 – Parker checked out.
- Room 14 – Williams checked out.
- Potential repeat preference worth remembering.
- Room 33 – Evans checked out.
- Room 6 – Brown checked out.
- Amelia Foster.
- Known stable preferences = quiet/high floor + oat milk.
- David Harris.
- Do not show both as active preferences.
- Sofia Rossi.
- Strong evidence she prefers quieter rooms away from street.
- Room 31 – Satisfies preference tonight.
- Michael Grant.
- Anna Wilson.
- Robert Lewis.
- Emma Clark.
- Could become a preference only if repeated/confirmed later.
- James Miller.
- Do not proactively send wine.
- Room 14 – Williams.
- This may be suitable to save as a preference.
- Room 21 – Parker.
- Room 6 – Brown.
- Room 33 – Evans.
- IMPORTANT MEMORY RULE.
- Historical facts are not automatically current actions.
- A guest preference is not automatically a preparation for every stay.
- An old preference can be superseded by newer information.
- Night team only needs to record clearly supported useful observations.

### Recommendations
1. Follow up with Maintenance regarding Room 27 AC. The fault remains open and needs resolution this shift. _(priority: urgent)_ _(owner: Maintenance)_
2. Follow up with Maintenance regarding guest complaint. The fault remains open and needs resolution this shift. _(priority: high)_ _(owner: Maintenance)_
3. Complete VIP in Room 42 for Amelia Foster requirements this shift. _(priority: high)_ _(owner: Reception)_

## Observed Positives
- Many memory-rule sentences retained in General.
- Oat milk/card/feather-free completion fragments.
- Sparkling-water need appears (even if misplaced in Urgent).

## Observed Failures
- Briefing Priority 1–2 invent **rm 27 AC fault** from historical complaint (notes forbid this).
- VIP prep still “welcome card” though placed.
- Guest Follow-up dumps memory doctrine + false late c/o + nameless complaints.
- Preparations include dental kit / prosecco noise.
- Completed includes “complaint”.
- Massive 75-line dump; fails the core Guest Intelligence supersession test.

## Failure Tags
`hotel-intelligence` · `guest-preference` · `source-of-truth` · `state-resolution` · `completed-as-open` · `prioritisation` · `compression` · `recommendation-quality` · `presentation` · `deduplication`

## Operational Risk
**High** — False maintenance from history; wrong amenity assumptions; missed sparkling water amid noise.

## Status
**Failed**

## Notes
Tester review completed from recovered CSV evidence (input vs saved HF output). Historical input/output preserved above.
