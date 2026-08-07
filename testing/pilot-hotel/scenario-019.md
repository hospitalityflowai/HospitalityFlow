# Scenario-019 — Olivia Bennett Room 418 — Source of Truth

## Test Metadata
- Date tested: 2026-08-07
- Hotel: Hotel Pilot
- Shift: AM
- Record id: 762f4b00-f83a-49fc-8544-a81187ddcb15
- created_at: 2026-08-07 18:13:58.195238+00
- Scenario focus: Source-of-truth / conflicting updates (Olivia Bennett, rm 418)
- HF version/commit: [NOT RECORDED]
- Workspace id: 090ec1b9-2c03-41ac-a4ea-19c412f7da37
- Prepared by: Not specified
- Evidence source: `testing/pilot-hotel/exports/pilot-hotel-scenarios-001-020.csv` (Supabase saved handover; not re-generated)

## Original Input

### Today's Arrivals
VIP Olivia Bennett rm 418 ETA originally 18:00. Repeat guest, quiet room away from lift requested.

UPDATE 16:20 - Olivia called, flight delayed. New ETA approx 22:30.

Old note says champagne + handwritten card requested.

UPDATE from DM 17:05 - NO champagne please, guest doesn't drink alcohol. Replace with chocolates. Card still required.

Mr Adam Foster rm 214 arriving around 19:00. Booking shows double.

Guest emailed yesterday asking for twin if possible.

UPDATE HK 17:40 - rm 214 cannot be twinned. Reception moved Foster to rm 216 which CAN be twin.

UPDATE 18:05 - rm 216 twin setup completed by HK.

Sarah Khan rm 305 ETA 20:00, Expedia prepaid.

Earlier note says payment pending / check VCC.

UPDATE Night Audit 18:15 - Expedia VCC successfully charged. £0 balance remaining.

James Miller rm 122 ETA unknown. Birthday stay. Balloons requested.

UPDATE 18:30 - balloons cancelled by guest. Birthday card only please.

### Today's Departures
rm 307 Wilson late c/o originally approved until 14:00.

UPDATE 13:20 - guest already checked out. Room released to HK.

rm 411 Patel - £85 balance showing this morning.

UPDATE 12:45 - balance paid in full by card. No payment outstanding.

rm 208 Green taxi originally booked 06:30 tomorrow.

UPDATE guest request 17:30 - taxi changed to 07:15 tomorrow. Old 06:30 booking cancelled.

rm 115 Brown luggage stored behind reception after checkout.

UPDATE 18:10 - guest collected luggage. Nothing remaining.

### General Hotel / Shift Notes
rm 327 AC reported not cooling at 15:00. Maintenance asked to inspect.

UPDATE Maintenance 17:10 - AC reset and tested OK.

UPDATE guest 18:00 - room still too warm.

Maintenance informed again 18:05 - engineer returning to rm 327. ISSUE STILL OPEN.

rm 402 originally marked OOO because of bathroom leak.

UPDATE Maintenance 16:30 - repair completed.

UPDATE HK 17:15 - room cleaned and inspected.

UPDATE DM 17:25 - rm 402 returned to service. NOT OOO anymore.

Earlier message says front entrance card reader broken.

UPDATE 18:20 - batteries replaced and reader working normally. RESOLVED.

rm 221 guest complained about noise from rm 223.

Security spoke with rm 223 at 17:40.

UPDATE 18:30 - rm 221 called again, noise continuing. Security to revisit. OPEN.

Flowers delivered for Olivia Bennett earlier today.

IMPORTANT - flowers were ordered accidentally. Do NOT place them in room. Guest should receive chocolates + handwritten card only.

Old housekeeping note says rm 216 still needs twin setup.
IGNORE - HK confirmed twin setup completed at 18:05.

£200 cash discrepancy mentioned in AM handover.

UPDATE Accounts 17:55 - discrepancy traced to incorrect posting and corrected. No cash shortage remains.

Tomorrow group of 14 arriving around 11:00. Rooms may not be ready. Luggage storage likely required.

### Hotel Snapshot
Stored Hotel Snapshot values from `metrics.hotelSnapshot`:

- Sellable Rooms: 80
- OOO Rooms: 0

Snapshot fields present but blank/sparse (not invented): RevPAR, RevPAR (value).

## Expected Current Truth
- Olivia ETA **~22:30**; **chocolates + card** only; **no champagne**; **do not place accidental flowers**.
- Foster **FINAL 216** twin **done** (not 214). Khan **£0**. Miller: balloons **cancelled**, card only.
- Wilson already out; Patel **paid**; taxi **07:15**; luggage **collected**.
- **327 AC still OPEN** (guest still warm). **402 NOT OOO**. Reader **resolved**. Noise **221 OPEN**.
- Cash discrepancy **cleared**.

## Expected Important Actions
1. Olivia chocolates + card (no alcohol/flowers).
2. Keep chasing **327 AC**; security revisit **221**.
3. Foster check-in **216**; taxi 07:15 awareness.
4. Do **not** chase paid balances, reopen 402 OOO/leak, twin/balloons, or late c/o noise.

## Actual HF Output

Recovered from saved `generated_handover` / `recommendation_state` / `metrics` at save time. Wording below is from the historical record (not re-run).

### Output metadata
- Saved date display: Friday, 7 August 2026
- Generated/saved timestamp (from record): 2026-08-07T18:13:57.956Z
- Checklist state: none saved / empty

### AI Summary / Today's Briefing
Priority 1
Follow up with Maintenance regarding Room 327 AC fault before further guest impact.

Priority 2
Complete wake-up / transfer actions for Room 208 before departure.

Priority 3
Revenue follow-up required for outstanding channel payment before departures.

Priority 4
VIP readiness follow-up for Olivia Bennett in Room 418 — champagne, quiet upper-floor room and chocolates.

Priority 5
Complete outstanding guest follow-up for Room 214.

### Organised Handover Sections
#### Urgent / Shift Alerts
_No items_

#### VIP
_No items_

#### Guest Follow-up (3)
- Room 208 – Taxi booked.
- Taxi booked.
- Room 307 – Late check-out confirmed for 14:00.

#### Maintenance (6)
- Room 327 – AC not cooling.
- AC issue reported.
- Room 402 – Bathroom leak open.
- Room 327 – Maintenance has been informed again 18:05 - engineer returning to. ISSUE STILL OPEN.
- UPDATE 16:20 - Olivia called, flight delayed.
- Earlier message says front entrance card reader broken. // UPDATE Maintenance 16:30 - repair completed.

#### Payments / Finance (3)
- Room 411 – Outstanding balance of £85 remains on the account.
- Outstanding balance remains on the account. Please follow up during this shift.
- Outstanding balance of £0 remains on the account.

#### Outstanding Tasks
_No items_

#### Events / Timeline (1)
- Tomorrow group of 14 arriving around 11:00. Rooms may not be ready. Luggage storage likely required.

#### Preparations (13)
- Review original note
- ☐ Champagne
- ☐ Birthday balloons
- ☐ Twin setup if available
- ☐ Flowers
- Rooms 214 & 216
- ☐ Twin setup if available
- James Miller — Room 122
- ☐ Birthday balloons
- Room 216
- ☐ Twin setup if available
- Olivia Bennett
- ☐ Flowers

#### Completed Actions (3)
- Room 216 – UPDATE 18:05 - twin setup completed by housekeeping.
- UPDATE 18:20 - batteries replaced and reader working normally. RESOLVED.
- IGNORE - housekeeping confirmed twin setup completed at 18:05.

#### Inventory
_No items_

#### Deliveries
_No items_

#### Lost Property
_No items_

#### Open Questions (1)
- Room 327 Has Maintenance completed the outstanding repair?

#### General / Operational Notes (14)
- Room 115 – Brown luggage stored behind reception after check-out.
- Rooms 221, 223 – Rm 221 guest complained about noise from rm 223.
- Room 214 – Mr Adam Foster arriving around 19:00. Booking shows double.
- Room 221 – UPDATE 18:30 - called again, noise continuing. Security to revisit. OPEN.
- Room 223 – Security spoke with at 17:40.
- Room 402 – UPDATE Duty Manager 17:25 - returned to service. NOT OOO anymore.
- UPDATE 13:20 - guest already checked out. Room released to housekeeping.
- Heating too warm. Guest comfort affected. Follow up required.
- UPDATE housekeeping 17:15 - room cleaned and inspected.
- Do NOT place them in room.
- New ETA approx 22:30.
- Guest should receive chocolates + handwritten card only.
- £200 cash discrepancy mentioned in AM handover.
- UPDATE 18:10 - guest collected luggage. Nothing remaining.

### Recommendations
1. Follow up with Maintenance regarding Room 327 AC. The fault remains open and needs resolution this shift. _(priority: urgent)_ _(owner: Maintenance)_
2. Follow up with Maintenance regarding AC. The fault remains open and needs resolution this shift. _(priority: urgent)_ _(owner: Maintenance)_
3. Follow up with Maintenance regarding Room 402 shower/leak. The fault remains open and needs resolution this shift. _(priority: high)_ _(owner: Maintenance)_
4. Complete the 17:30 wake-up call — follow-up still required this shift. _(priority: high)_ _(owner: Reception)_
5. Collect outstanding Expedia payment for Room 305 before departure. _(priority: high)_ _(owner: Reception)_
6. Prepare VIP arrival for Olivia Bennett in Room 418 — quiet upper-floor room. Verify room allocation before arrival. _(priority: high)_ _(owner: Reception)_

## Observed Positives
- 327 still open + 402 returned-to-service + chocolates-only fragments appear in General/Open Questions.
- Twin completion for 216 sometimes in Completed; reader resolved fragment present.

## Observed Failures
- Briefing still **champagne + chocolates** for Olivia; Priority 3 channel payment; Priority 5 guest follow-up **214**.
- Maint reopens **402 leak**; guest follow-up late c/o **307**.
- Payments chase **£85** and absurd “£0 remains outstanding”.
- Preparations still champagne/flowers/twin/balloons.
- Recs: nonsense **17:30 wake-up**; chase Expedia **305**; VIP prep without correcting amenity; reopen 402 leak.
- Classic supersession failure on a dedicated source-of-truth scenario.
- Snapshot OOO=0 is coincidentally consistent with 402 returned, but briefing still treats 402 as open maint.

## Failure Tags
`source-of-truth` · `state-resolution` · `payment-state` · `completed-as-open` · `room-status` · `prioritisation` · `recommendation-quality` · `guest-preference` · `hotel-snapshot` · `presentation`

## Operational Risk
**Critical** — Wrong VIP amenity + false payment/OOO actions.

## Status
**Failed**

## Notes
Tester review completed from recovered CSV evidence (input vs saved HF output). Historical input/output preserved above.
