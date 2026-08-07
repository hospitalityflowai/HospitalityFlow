# Scenario-005 — Victoria Sterling — Heavy Critical Shift

## Test Metadata
- Date tested: 2026-08-07
- Hotel: Hotel Pilot
- Shift: AM
- Record id: 72b20fc7-3722-4356-8cb1-dab436506c98
- created_at: 2026-08-07 17:49:20.720757+00
- Scenario focus: Heavy / critical operational shift (lead: Victoria Sterling, rm 42)
- HF version/commit: [NOT RECORDED]
- Workspace id: 090ec1b9-2c03-41ac-a4ea-19c412f7da37
- Prepared by: Not specified
- Evidence source: `testing/pilot-hotel/exports/pilot-hotel-scenarios-001-020.csv` (Supabase saved handover; not re-generated)

## Original Input

### Today's Arrivals
VIP Victoria Sterling rm 42 ETA 22:15 repeat guest. GM knows guest personally. Quiet room requested. Champagne + handwritten GM card requested.
UPDATE 20:10 - champagne placed in room.
GM card still at reception NOT signed.

Marcus Reed rm 24 ETA 23:00 booking.com prepaid. Requested feather-free pillows.

Ahmed Khan rm 31 arriving around midnight Expedia prepaid. VCC declined when PM tried around 19:00. Still unresolved pls night check.

Sophie Turner rm 18 ETA 21:30. Birthday stay, balloons + cake requested.
UPDATE 20:20 - balloons done. Cake confirmed in fridge but NOT delivered yet.

Lewis family rooms 14 + 15 ETA delayed now around 00:30. 2 adults 3 children. Cot requested rm15, HK confirmed done.

Daniel Evans rm 27 ETA unknown. No special requests.

### Today's Departures
rm 6 Wilson taxi confirmed tomorrow 05:30 Heathrow T3. Wake-up 04:45 NOT set yet.

rm 11 Patel late checkout tomorrow 13:00 approved no charge.

rm 33 Adams checked out earlier but £62 restaurant balance still open. Guest emailed saying will call tonight to pay.

rm 8 Cooper luggage stored reception. Guest collecting around 22:00.

rm 21 Morgan checked out, account clear, nothing outstanding.

### General Hotel / Shift Notes
URGENT - rm 35 guest called reception 20:35 saying strong burning smell near corridor outside room.

Reception checked corridor and could smell something electrical near housekeeping cupboard.

Duty manager informed immediately.

UPDATE 20:42 - housekeeping cupboard isolated and engineering called.

UPDATE 20:50 - engineering arrived checking now.

UPDATE 21:05 - engineer found overheating extension lead in cupboard. Unplugged and removed.

NO fire / no smoke. Fire panel normal.

Engineer says area safe now BUT cupboard must remain locked and extension lead must NOT be used.

GM wants incident recorded and morning maintenance manager informed.

---

rm 26 bathroom ceiling started leaking around 20:15.

Water coming through quite heavily.

Guest moved temporarily to rm 36.

UPDATE 20:40 - leak traced to rm 46 shower above. Water isolated.

rm 26 now OOO.

Guest staying rm36 tonight.

Guest unhappy about move and asked to speak with manager tomorrow.

Need morning manager follow-up.

---

rm 44 guest very upset about noise from private event downstairs.

Already complained twice.

First time offered earplugs - didn't help.

Second complaint 21:00 guest asked for manager and compensation.

Duty manager spoke with guest and offered complimentary breakfast.

Guest accepted breakfast but still unhappy.

Please follow up before checkout tomorrow.

DO NOT promise further compensation without manager approval.

---

Night receptionist Alex called in sick at 20:30 and will NOT attend tonight.

Marta from PM agreed to stay until midnight only.

After midnight night manager will be alone until porter starts 05:00.

GM aware.

---

Lift 2 stopped with 2 guests inside around 19:40.

Guests released safely by engineering at 19:52.

UPDATE 20:30 - lift engineer attended.

Lift 2 taken OUT OF SERVICE until inspection tomorrow.

Lift 1 working normally.

Guests involved are okay, no medical assistance required.

Morning team must keep Lift 2 OOS and contact engineer before reopening.

---

rm 24 feather-free pillows NOT delivered yet. HK left already. Need night team to arrange before Reed arrives 23:00.

rm 31 Expedia VCC still unresolved.

rm 42 GM card still unsigned.

rm 18 birthday cake still fridge - deliver before guest arrival if possible.

£200 cash found in restaurant envelope handed to duty manager. Logged and secured in safe.

Front entrance lamp bulb out. Not urgent.

Printer behind reception low on paper.

Tomorrow florist delivery around 09:30 for wedding guest.

Coffee machine bar displaying cleaning warning - F&B aware, machine still working.

Fire alarm contractor due tomorrow 10:00 for planned routine inspection.

Room 12 guest asked for extra water.

Room 29 wants newspaper tomorrow morning.

UPDATE 21:20 - Victoria Sterling called, ETA changed from 22:15 to around 23:30.

UPDATE 21:25 - Ahmed Khan called, ETA now 01:00.

UPDATE 21:30 - Sophie Turner delayed until approximately 22:45.

### Hotel Snapshot
Stored Hotel Snapshot values from `metrics.hotelSnapshot`:

- Sellable Rooms: 80
- OOO Rooms: 0

Snapshot fields present but blank/sparse (not invented): RevPAR, RevPAR (value).

## Expected Current Truth
- **Electrical smell incident:** overheating extension lead removed; area safe; **no fire/smoke**; cupboard **remain locked / lead not reused**; incident record + morning maint manager.
- **Lift 2:** entrapment resolved; **OOS until inspection tomorrow**; Lift 1 OK; guests OK.
- **rm 26** heavy leak from **46** shower; water isolated; **26 OOO**; guest in **36** tonight; unhappy — morning manager follow-up.
- **rm 44** noise: breakfast offered; still unhappy; follow up before checkout; **no further compensation without manager**.
- **Staffing:** Alex sick; Marta only to midnight; night manager **alone until 05:00** porter; GM aware.
- **Victoria Sterling 42:** champagne **placed**; **GM card unsigned**; ETA now **~23:30** (not 22:15).
- **Marcus Reed 24:** feather-free pillows **not delivered** (HK left) — arrange before 23:00.
- **Ahmed Khan 31:** Expedia VCC **unresolved**; ETA now **01:00**.
- **Sophie Turner 18:** balloons done; **cake still in fridge — deliver**; ETA ~22:45.
- **Lewis 14+15:** ETA ~00:30; cot **15** done.
- **Daniel Evans 27:** no specials.
- **Dep 6:** taxi 05:30 confirmed; wake **04:45 not set**.
- **Dep 11:** late c/o 13:00 approved.
- **Dep 33:** £62 open; guest may call tonight.
- **Dep 8:** luggage collect ~22:00.
- **Dep 21:** clear — nothing outstanding.
- £200 cash logged; other low-priority hotel noise as informational only.

## Expected Important Actions
1. Protect post-incident controls (locked cupboard / no reuse) + brief morning maint/GM incident.
2. Keep **Lift 2 OOS**; contact engineer before reopen.
3. Cover staffing after midnight (alone NM).
4. Sign GM card for Victoria; use **23:30** ETA (champagne already done).
5. Deliver feather-free pillows **24** before Reed.
6. Deliver Sophie cake; resolve Ahmed VCC before/at 01:00 arrival.
7. Set wake **04:45** rm **6**.
8. Manager follow-ups: leak move guest **36**, noise **44** (no extra comp).
9. Monitor Adams **£62** if guest calls; luggage **8** ~22:00.

## Actual HF Output

Recovered from saved `generated_handover` / `recommendation_state` / `metrics` at save time. Wording below is from the historical record (not re-run).

### Output metadata
- Saved date display: Friday, 7 August 2026
- Generated/saved timestamp (from record): 2026-08-07T17:51:07.913Z
- Checklist state: none saved / empty

### AI Summary / Today's Briefing
Priority 1
Follow up with Maintenance regarding Room 26 shower/leak before further guest impact.

Priority 2
Timed departure actions for Room 6: wake-up at 04:45.

Priority 3
Revenue follow-up required for outstanding channel payment before departures.

Priority 4
VIP readiness follow-up for Victoria Sterling in Room 42 — champagne and quiet upper-floor room.

### Organised Handover Sections
#### Urgent / Shift Alerts (3)
- Reception checked corridor and could smell something electrical near housekeeping cupboard.
- NO fire / no smoke. Fire panel normal.
- Fire alarm contractor due tomorrow 10:00 for planned routine inspection.

#### VIP
_No items_

#### Guest Follow-up (9)
- Room 6 – Wake-up call at 04:45.
- Room 11 – Late check-out confirmed for 13:00.
- Guest requested a room move if available.
- Room 36 – Guest requested a room move if available.
- The guest has raised a complaint.
- Duty manager spoke with guest and offered complimentary breakfast.
- The guest has raised a complaint.
- The guest has raised a complaint.
- Follow up before check-out tomorrow.

#### Maintenance (6)
- Room 26 – Bathroom leak open.
- Room 46 – Shower leak open.
- Room access or lock issue. Guest cannot enter reliably.
- Heating issue reported. Guest comfort affected.
- Room 35 – URGENT - guest called reception 20:35 saying strong burning smell near corridor outside room.
- General Manager wants incident recorded and morning maintenance manager informed.

#### Payments / Finance (2)
- Room 21 – Outstanding balance remains on the account.
- Room 33 – Outstanding balance of £62 remains on the account.

#### Outstanding Tasks (1)
- UPDATE 20:42 - housekeeping cupboard isolated and engineering called.

#### Events / Timeline
_No items_

#### Preparations (9)
- Victoria Sterling — Room 42
- ☐ Champagne
- Review original note
- ☑ Champagne
- ☑ Balloons
- Sophie Turner — Room 18
- ☐ Birthday balloons
- Rooms 14 & 15
- ☑ Extra bed

#### Completed Actions (2)
- Room 24 – Extra pillows requested.
- Rooms 14, 15 – Lewis family rooms 14 + 15 ETA delayed now around 00:30. 2 adults 3 children. Cot requested rm15, housekeeping confirmed done.

#### Inventory
_No items_

#### Deliveries (1)
- Package being held for tomorrow.

#### Lost Property
_No items_

#### Open Questions (1)
- Room 33 Has the outstanding balance (£62) been paid before departure?

#### General / Operational Notes (25)
- Room 29 – Wants newspaper tomorrow morning.
- Room 12 – Guest asked for extra water.
- Room 26 – Now OOO.
- Room 27 – Daniel Evans ETA unknown. No special requests.
- Room 42 – General Manager card still unsigned.
- Room 44 – Guest very upset about noise from private event downstairs.
- Room 8 – Cooper luggage stored reception. Guest collecting around 22:00.
- Duty manager informed immediately.
- Need morning manager follow-up.
- DO NOT promise further compensation without manager approval.
- After midnight night manager will be alone until porter starts 05:00.
- General Manager card still at reception NOT signed.
- .
- Water coming through quite heavily.
- Room 36 – Guest staying tonight.
- First time offered earplugs - didn't help.
- Night receptionist Alex called in sick at 20:30 and will NOT attend tonight.
- Marta from PM agreed to stay until midnight only.
- General Manager aware.
- Guests involved are okay, no medical assistance required.
- Printer behind reception low on paper.
- Coffee machine bar displaying cleaning warning - F&B aware, machine still working.
- UPDATE 21:20 - Victoria Sterling called, ETA changed from 22:15 to around 23:30.
- UPDATE 21:25 - Ahmed Khan called, ETA now 01:00.
- UPDATE 21:30 - Sophie Turner delayed until approximately 22:45.

### Recommendations
1. Follow up with Maintenance regarding Room 26 shower/leak. The fault remains open and needs resolution this shift. _(priority: high)_ _(owner: Maintenance)_
2. Collect outstanding Booking.com payment for Room 24 before departure. _(priority: high)_ _(owner: Reception)_
3. Collect outstanding £62 balance for Room 33 before departure. _(priority: high)_ _(owner: Reception)_
4. Collect outstanding balance for Room 21 before departure. _(priority: high)_ _(owner: Reception)_
5. Collect outstanding Expedia payment for Room 31 before departure. _(priority: high)_ _(owner: Reception)_
6. Prepare VIP arrival for Victoria Sterling in Room 42 — champagne, quiet upper-floor room. Verify room allocation before the 22:15 arrival. _(priority: high)_ _(owner: Reception)_

## Observed Positives
- ETA updates for Victoria / Ahmed / Sophie retained.
- Fragments of smell incident, leak/OOO, unsigned GM card, £62, staffing, and Lewis cot appear somewhere.
- Some complaint/compensation constraint text preserved.

## Observed Failures
- **Prioritisation failure:** Briefing leads with leak/payment/VIP champagne, not **safety aftermath, Lift 2 OOS, or solo night staffing**.
- Urgent section incomplete/misleading (smell fragment + tomorrow contractor as “urgent”; weak final safe-state + missing Lift 2 OOS as a hard control).
- Victoria: champagne ☐ and ☑; rec still “prepare champagne” and stale **22:15** ETA.
- **Completed** “extra pillows” for **24** while notes say pillows **NOT delivered**.
- Recs chase **rm 21** balance though **account clear**; chase b.com **24 before departure** (arrival prepaid / wrong action vs pillows).
- Invented maint items (“lock issue”, “heating issue”).
- Snapshot **OOO Rooms: 0** despite 26 OOO (+ lift OOS context).
- Heavy general noise (25+) without compressing to current truth; duplicate nameless complaints.

## Failure Tags
`prioritisation` · `maintenance-severity` · `source-of-truth` · `state-resolution` · `completed-as-open` · `temporal` · `payment-state` · `room-status` · `compression` · `recommendation-quality` · `hotel-snapshot` · `deduplication` · `presentation`

## Operational Risk
**Critical** — Safety controls, lift OOS, and single-staffing after midnight are under-ranked; false completed pillows and wrong payment chases add further harm.

## Status
**Failed**

## Notes
Tester review completed from recovered CSV evidence (input vs saved HF output). Historical input/output preserved above.
