# Scenario-003 — James Martin / James Martins — Naming Variants

## Test Metadata
- Date tested: 2026-08-07
- Hotel: Hotel Pilot
- Shift: AM
- Record id: 72de81d7-39fd-499c-8eac-0785cc5fb7a7
- created_at: 2026-08-07 17:43:13.164632+00
- Scenario focus: James Martin / James Martins naming and related shift complexity
- HF version/commit: [NOT RECORDED]
- Workspace id: 090ec1b9-2c03-41ac-a4ea-19c412f7da37
- Prepared by: Not specified
- Evidence source: `testing/pilot-hotel/exports/pilot-hotel-scenarios-001-020.csv` (Supabase saved handover; not re-generated)

## Original Input

### Today's Arrivals
James Martin rm 21 ETA 20:30 b.com prepaid. Requested feather-free pillows due preference. Quiet room if possible.

James Martins rm 31 ETA around 22:00 Expedia. Anniversary stay. Champagne requested but NOT approved yet.

Sarah Collins rm 14 arriving 19:30. Early departure tomorrow 05:30. Taxi requested for 04:45 Heathrow T2, not booked yet.

Sara Collins rm 41 arriving after midnight. Repeat guest. Likes extra firm pillows and previously asked for room away from street noise.

Mr Robert Chen rm 25 ETA 21:00. Requested twin setup.
UPDATE 18:20 - rm 25 AC failed, guest moved to rm 35.
UPDATE 18:40 - rm 35 cannot twin.
UPDATE 19:00 - guest moved again to rm 34 which is confirmed twin. FINAL ROOM 34.

Rebecca Chen rm 24 ETA 23:00. No relation to Robert Chen. Booking.com prepaid. Baby cot requested and confirmed by housekeeping.

Michael Brown rm 12 ETA unknown. £100 cash deposit required on arrival.

Michael Browne rm 42 ETA 22:30. VIP repeat guest. Oat milk requested for room.

### Today's Departures
James Martin rm 8 checked out 11:00. Luggage stored behind reception until evening.
IMPORTANT - this is NOT the arriving James Martin in rm 21.

Sarah Collins rm 6 checked out this morning and paid in full.
IMPORTANT - different guest from Sarah Collins arriving rm 14.

Robert Chen rm 17 departed 10:30. Invoice emailed.
Different Robert Chen from tonight's arrival.

Michael Brown rm 32 late checkout approved until 13:00. Guest departed and account clear.
Different Michael Brown from arrival rm 12.

rm 27 Walker - taxi booked tomorrow 06:00, wake-up still needs setting 05:15.

### General Hotel / Shift Notes
Housekeeping confirmed rm 34 set as twin for Robert Chen.

rm 25 AC still broken. Room placed OOO. Maintenance attending tomorrow morning.

rm 35 is clean and available - do NOT move Robert Chen back there because room cannot twin.

Feather-free pillows delivered to rm 21 for James Martin.

Extra firm pillows delivered to rm 41 for Sara Collins.

NOTE - do not confuse Sarah Collins rm 14 with Sara Collins rm 41. Different guests.

Taxi for Sarah Collins rm 14 still NOT booked. Departure tomorrow 05:30, requested pickup 04:45.

James Martins rm 31 champagne still waiting DM approval. Do not send until approved.

Rebecca Chen rm 24 cot confirmed placed in room.

Oat milk for Michael Browne rm 42 delivered to room fridge.

£100 cash deposit applies to Michael Brown rm 12 ONLY.

Guest in rm 43 complained about street noise at 18:00. Offered earplugs and guest currently okay. Follow up before night audit.

Fire panel showed temporary fault at 17:20.
Engineering checked at 17:35 - system normal. No active fault.

Tomorrow housekeeping contractor arriving 07:30. Night team to provide staff entrance access.

### Hotel Snapshot
Stored Hotel Snapshot values from `metrics.hotelSnapshot`:

- Departures: 5
- Sellable Rooms: 80
- OOO Rooms: 0

Snapshot fields present but blank/sparse (not invented): RevPAR, RevPAR (value).

## Expected Current Truth
- **James Martin (arrival) rm 21**: b.com prepaid; feather-free pillows **delivered**; quiet if possible.
- **James Martins (arrival) rm 31**: Expedia; anniversary; champagne **awaiting DM approval — do not send**.
- **James Martin (departure) rm 8**: checked out; luggage until evening — **different person** from rm 21.
- **Sarah Collins rm 14**: arrive 19:30; depart tomorrow **05:30**; taxi **04:45 Heathrow T2 NOT booked**.
- **Sara Collins rm 41**: after midnight; firm pillows **delivered**; away from street noise — **different** from Sarah Collins.
- Departed **Sarah Collins rm 6**: paid in full — different guest.
- **Robert Chen**: final room **34 twin** (HK confirmed). Path 25→35→34. **rm 25 AC OOO**. Do **not** move back to 35.
- **Rebecca Chen rm 24**: unrelated; cot **placed**.
- Departed Robert Chen **17**: invoice emailed — different person.
- **Michael Brown rm 12**: £100 cash deposit **on arrival only**.
- **Michael Browne rm 42**: VIP; oat milk **in fridge**.
- Departed Michael Brown **32**: clear — different person.
- **Walker rm 27**: taxi 06:00 booked; wake **05:15 still needed**.
- Fire panel temporary fault **cleared** (normal).
- **rm 43** noise: earplugs; OK now; follow up before night audit.
- Tomorrow HK contractor 07:30 — staff entrance access.

## Expected Important Actions
1. Book Sarah Collins **14** taxi 04:45 / protect 05:30 departure.
2. Set wake **05:15** for Walker **27**.
3. Hold Martins champagne until DM approval.
4. Check in Robert Chen to **34 only**; keep **25 OOO**.
5. Collect £100 deposit on arrival for Brown **12** only (not Browne **42**).
6. Keep Martin/Martins/Collins/Sara/Chen/Brown identity separations explicit for the night team.
7. Follow up **43** noise before night audit.

## Actual HF Output

Recovered from saved `generated_handover` / `recommendation_state` / `metrics` at save time. Wording below is from the historical record (not re-run).

### Output metadata
- Saved date display: Friday, 7 August 2026
- Generated/saved timestamp (from record): 2026-08-07T17:45:12.537Z
- Checklist state: none saved / empty

### AI Summary / Today's Briefing
Priority 1
Follow up with Maintenance regarding Room 25 AC fault before further guest impact.

Priority 2
Complete wake-up / transfer actions for Room 14 before departure.

Priority 3
Revenue follow-up required for Room 12 outstanding £100 before departures.

Priority 4
Revenue follow-up required for outstanding channel payment before departures.

Priority 5
Complete outstanding guest follow-up for Room 35.

### Organised Handover Sections
#### Urgent / Shift Alerts (1)
- Fire panel showed temporary fault at 17:20.

#### VIP (1)
- VIP repeat guest. Oat milk requested for room.

#### Guest Follow-up (4)
- Room 14 – Guest departing this morning. Taxi booked.
- Room 27 – Wake-up call booked.
- Room 32 – Late check-out confirmed for 13:00.
- Different Robert Chen from tonight's arrival.

#### Maintenance (2)
- Rooms 25, 35 – Guest relocated to Room 35.
- Engineering checked at 17:35 - system normal. No active fault.

#### Payments / Finance (2)
- Room 12 – Michael Brown ETA unknown. £100 cash deposit required on arrival. // £100 cash deposit applies to Michael Brown ONLY.
- An outstanding Booking.com payment still needs to be collected.

#### Outstanding Tasks (1)
- Tomorrow housekeeping contractor arriving 07:30. Night team to provide staff entrance access.

#### Events / Timeline
_No items_

#### Preparations (16)
- James Martins — Room 31
- ☐ Champagne
- Room 34
- ☑ Twin setup if available
- Robert Chen — Room 35
- ☐ Twin setup if available
- Review original note
- ☑ Extra bed
- Mr Robert — Room 25
- ☐ Twin setup if available
- Room 35
- ☐ Twin setup if available
- Housekeeping Confirmed — Room 34
- ☑ Twin setup if available
- Rebecca Chen — Room 24
- ☑ Extra bed

#### Completed Actions (4)
- Room 21 – Extra pillows requested.
- Room 41 – Extra pillows requested.
- Room 42 – Oat milk for Michael Browne delivered to room fridge.
- Room 6 – Sarah Collins checked out this morning and paid in full.

#### Inventory
_No items_

#### Deliveries
_No items_

#### Lost Property
_No items_

#### Open Questions
_No items_

#### General / Operational Notes (8)
- Room 12 – Different Michael Brown from arrival.
- Room 14 – IMPORTANT - different guest from Sarah Collins arriving.
- Room 21 – IMPORTANT - this is NOT the arriving James Martin in.
- Room 43 – Guest in complained about street noise at 18:00. Offered earplugs and guest currently okay. Follow up before night audit.
- Rooms 14, 41 – NOTE - do not confuse Sarah Collins rm 14 with Sara Collins rm 41. Different guests.
- Room 24 – Rebecca Chen ETA 23:00. No relation to Robert Chen.
- Room 42 – Michael Browne ETA 22:30.
- Room 8 – James Martin checked out 11:00. Luggage stored behind reception until evening.

### Recommendations
1. Follow up with Maintenance regarding Room 25 AC. The fault remains open and needs resolution this shift. _(priority: urgent)_ _(owner: Maintenance)_
2. Complete the 05:30 wake-up call for Room 14 — follow-up still required this shift. _(priority: high)_ _(owner: Reception)_
3. Confirm deposit handling for Room 12 before departure. _(priority: high)_ _(owner: Reception)_
4. Collect outstanding Booking.com payment for Room 21 before departure. _(priority: high)_ _(owner: Reception)_
5. Collect outstanding Booking.com payment before departure. _(priority: high)_ _(owner: Reception)_
6. Collect outstanding balance for Room 17 before departure. _(priority: high)_ _(owner: Reception)_

## Observed Positives
- Several “different guest” warnings retained in General.
- Pillows / oat milk / cot appear as completed.
- Summary flags **25** AC.
- Some final twin confirmation for **34** appears in preparations.

## Observed Failures
- **Critical entity/state errors:** Guest follow-up says **rm 14 “departing this morning. Taxi booked”** — false on both counts (arriving today; taxi **not** booked; departure tomorrow).
- Robert Chen still prepared against **25/35**; residual “follow-up Room 35”.
- Wake for **27** shown as booked though still needed.
- Fire panel left in Urgent despite cleared.
- VIP line missing clear Browne/rm42 identity.
- Recs: chase b.com **21 before departure** (prepaid arrival); chase **rm 17** balance after departure/invoice; deposit framed as pre-departure.
- Snapshot **OOO Rooms: 0** with 25 OOO.
- Identity scenario partially preserved as raw notes but not turned into clean current truth.

## Failure Tags
`entity-resolution` · `temporal` · `state-resolution` · `source-of-truth` · `payment-state` · `room-status` · `prioritisation` · `recommendation-quality` · `presentation` · `hotel-snapshot`

## Operational Risk
**Critical** — Missed airport taxi for Sarah Collins + room/identity confusion (Martin/Chen/Brown) can cause failed transfers and wrong-guest handling.

## Status
**Failed**

## Notes
Tester review completed from recovered CSV evidence (input vs saved HF output). Historical input/output preserved above.
