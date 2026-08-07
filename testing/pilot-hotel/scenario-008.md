# Scenario-008 — Laura Mitchell — Payments & Financial State

## Test Metadata
- Date tested: 2026-08-07
- Hotel: Hotel Pilot
- Shift: AM
- Record id: d7d54c99-adb8-4507-bdad-8dc7e658d28b
- created_at: 2026-08-07 17:55:03.299374+00
- Scenario focus: Payments / financial state resolution (Laura Mitchell, rm18)
- HF version/commit: [NOT RECORDED]
- Workspace id: 090ec1b9-2c03-41ac-a4ea-19c412f7da37
- Prepared by: Not specified
- Evidence source: `testing/pilot-hotel/exports/pilot-hotel-scenarios-001-020.csv` (Supabase saved handover; not re-generated)

## Original Input

### Today's Arrivals
Laura Mitchell rm18 ETA 21:30 Booking.com PREPAID.
Earlier note says "payment outstanding".
UPDATE 19:40 - reception confirmed Booking.com payment received in full.
FINAL STATUS = PAID. Do NOT request payment from guest.

James Carter rm24 ETA 23:45 Expedia prepaid.
VCC attempted at 18:00 and declined.
Expedia advised card activates from 00:00 on 08/08.
Do NOT charge guest personally.
Night team to retry Expedia VCC after midnight.

VIP Sophie Grant rm42 ETA 22:15.
Room + tax charged to company account.
Extras are POA by guest.
Do NOT ask guest to pay accommodation.

Daniel Moore rm31 ETA around 00:30.
PAY ON ARRIVAL.
£250 room balance outstanding.
Card on file is GUARANTEE ONLY and has NOT been charged.
Collect £250 at check-in.

Emma Lewis rm15 ETA 20:45.
£100 security deposit required on arrival.
Accommodation already prepaid.
Deposit is separate from room payment.

Oliver Smith rm27 ETA 22:30.
Originally showed £180 outstanding.
UPDATE 20:05 - guest paid £100 via payment link.
£80 REMAINS outstanding.
Do not request £180.

Rebecca Hall rm35 ETA tomorrow 08/08 14:00.
Payment issue being handled by reservations tomorrow.
NOT tonight's arrival and no Night shift action required.

### Today's Departures
rm12 Thompson departing tomorrow.
Original balance £85.

UPDATE 18:00 - guest paid £50 at reception.
£35 remains outstanding.
Collect remaining £35 before checkout tomorrow.

rm22 Patel checked out today.
£42 minibar was showing outstanding.

UPDATE 17:30 - guest paid remotely.
FINAL BALANCE £0 / ACCOUNT CLEAR.
No follow-up required.

rm33 Wilson departing tomorrow 06:30.
Accommodation paid.
Restaurant charge £68 still OPEN.
Guest says charge is incorrect and wants manager review.
DO NOT take payment until manager reviews disputed charge.

rm6 Ahmed checked out this morning.
£120 balance outstanding when guest left.

UPDATE 15:00 - payment link sent.
UPDATE 19:15 - payment received successfully.
Account now CLEAR.

rm29 Green departing 08/08.
£200 cash deposit held at reception.
Deposit is NOT an outstanding payment.
Return deposit after room inspection if no charges.

rm14 Brown checked out earlier.
Hotel owes guest £75 refund due overcharge.
Refund approved by manager but NOT processed yet.
Finance/reception needs to process £75 refund.

rm8 Walker departing 09/08.
Nothing outstanding tonight.

### General Hotel / Shift Notes
PAYMENT STATUS UPDATE 20:30:

rm18 Laura Mitchell = FULLY PAID.
Ignore earlier "payment outstanding" note.

rm24 James Carter Expedia VCC = UNRESOLVED but expected active after 00:00.
Retry after midnight.
Do NOT charge guest's personal card.

rm42 Sophie Grant = company pays ROOM + TAX.
Guest pays EXTRAS only.

rm31 Daniel Moore = £250 POA.
Guarantee card is NOT payment.

rm15 Emma Lewis = accommodation PREPAID.
£100 SECURITY DEPOSIT required separately.

rm27 Oliver Smith = £100 received / £80 STILL DUE.

---

IMPORTANT:

Reception spreadsheet still shows Oliver Smith £180 outstanding.
Spreadsheet is OUTDATED.
Current balance = £80.

Old PM handover says Laura Mitchell payment pending.
OUTDATED.
Current balance = £0.

---

rm12 Thompson:
Original £85
Paid £50
Remaining = £35.

Do not show both £85 and £35 as separate outstanding balances.

---

rm33 Wilson restaurant £68:
DISPUTED.
Guest says charge isn't theirs.
Manager review required tomorrow before payment.
Do NOT describe as "collect £68".

---

rm29 Green:
£200 CASH DEPOSIT held.
This is money hotel currently holds for guest.
Do NOT classify as guest owing £200.

---

rm14 Brown:
£75 REFUND owed TO GUEST.
Do NOT classify as £75 outstanding FROM guest.

---

Expedia booking rm24:
Earlier note: "VCC declined - payment problem".
Latest information says VCC expected to activate at midnight.
Still unresolved until successful charge.
Action = retry after 00:00.

---

£300 cash found in lobby at 19:00.
Placed in safe and logged.
This has NOTHING to do with guest balances.

Petty cash float is £500.
No discrepancy.

Night audit card terminal settlement expected around 02:30.
Normal process, no issue.

Invoice requested for rm42 company account after checkout.
No action tonight.

Tomorrow finance meeting 11:00.
No Night shift action.

rm40 guest asked how much minibar water costs.
This is NOT a payment issue.

Reception printer produced duplicate receipt for rm21.
Account itself is correct; no financial action required.

### Hotel Snapshot
Stored Hotel Snapshot values from `metrics.hotelSnapshot`:

- Sellable Rooms: 80
- OOO Rooms: 0

Snapshot fields present but blank/sparse (not invented): RevPAR, RevPAR (value).

## Expected Current Truth
- Laura **18** = **£0 paid** (ignore old outstanding).
- Carter **24** = Expedia VCC retry **after 00:00**; do **not** charge personal card.
- Sophie **42** = company room+tax; guest extras only.
- Moore **31** = **£250 POA** at check-in (guarantee ≠ payment).
- Lewis **15** = prepaid + **£100 deposit** separate.
- Smith **27** = **£80** due (not £180).
- Hall **35** = tomorrow — no night action.
- Thompson **12** = **£35** remains (not £85).
- Patel **22** / Ahmed **6** = **clear**.
- Wilson **33** = **£68 disputed** — manager review, do **not** “collect”.
- Green **29** = **£200 deposit held** (hotel holds; not guest debt).
- Brown **14** = **£75 refund TO guest** (not guest owes).
- £300 lobby cash logged — unrelated to balances.

## Expected Important Actions
1. Collect Moore £250 / Lewis deposit / Smith £80 / Thompson £35.
2. Retry Carter VCC after midnight (not personal card).
3. Process Brown refund path; hold Wilson dispute.
4. Do **not** ask Laura or Sophie for room payment.
5. Do not treat Green deposit as guest debt.

## Actual HF Output

Recovered from saved `generated_handover` / `recommendation_state` / `metrics` at save time. Wording below is from the historical record (not re-run).

### Output metadata
- Saved date display: Friday, 7 August 2026
- Generated/saved timestamp (from record): 2026-08-07T17:56:40.039Z
- Checklist state: none saved / empty

### AI Summary / Today's Briefing
Priority 1
Revenue follow-up required for outstanding £100 before departures.

Priority 2
Revenue follow-up required for outstanding £180 before departures.

Priority 3
Revenue follow-up required for outstanding channel payment before departures.

Priority 4
VIP readiness follow-up for Sophie Grant in Room 42.

Priority 5
Follow up with Maintenance regarding safe before further guest impact.

### Organised Handover Sections
#### Urgent / Shift Alerts
_No items_

#### VIP (1)
- Room 42 – VIP preparation required. Prepare Room 42 before the 22:15 arrival.

#### Guest Follow-up (5)
- Room 12 – Thompson departing tomorrow.
- Room 33 – Wilson departing tomorrow 06:30.
- Room 29 – Green departing 08/08.
- Room 8 – Walker departing 09/08.
- Room 42 – Outstanding balance remains on the account before departure.

#### Maintenance (2)
- No action tonight.
- Placed in safe and logged.

#### Payments / Finance (2)
- Outstanding balance of £180 remains on the account.
- Room 40 – A minibar charge requires review.

#### Outstanding Tasks
_No items_

#### Events / Timeline (4)
- PAY ON ARRIVAL.
- Do not request £180.
- NOT tonight's arrival and no Night shift action required.
- Tomorrow finance meeting 11:00.

#### Preparations
_No items_

#### Completed Actions (1)
- Payment issue being handled by reservations tomorrow.

#### Inventory
_No items_

#### Deliveries
_No items_

#### Lost Property (1)
- £300 cash found in lobby at 19:00.

#### Open Questions
_No items_

#### General / Operational Notes (51)
- Room 42 – Sophie Grant = company pays ROOM + TAX.
- Do NOT request payment from guest.
- Outstanding balance remains on the account.
- Still unresolved until successful charge.
- Do NOT charge guest personally.
- Extras are POA by guest.
- Do NOT ask guest to pay accommodation.
- Room 31 – Daniel Moore ETA around 00:30.
- Room 15 – Emma Lewis ETA 20:45.
- Accommodation already prepaid.
- Room 27 – Oliver Smith ETA 22:30.
- Room 35 – Rebecca Hall ETA tomorrow 08/08 14:00.
- Room 22 – Patel checked out today.
- No follow-up required.
- Restaurant charge £68 still OPEN.
- Room 6 – Ahmed checked out this morning.
- Outstanding balance remains on the account.
- Room 14 – Brown checked out earlier.
- Retry after midnight.
- Guest pays EXTRAS only.
- Room 31 – Daniel Moore is arriving. The reservation is on a payment on arrival basis.
- Room 15 – Emma Lewis is arriving. Payment method: prepaid.
- Room 27 – Oliver Smith = £100 received / £80 STILL DUE.
- .
- IMPORTANT.
- Spreadsheet is OUTDATED.
- OUTDATED.
- Room 12 – Thompson.
- Original £85.
- Remaining = £35.
- Room 33 – Wilson restaurant £68.
- DISPUTED.
- Guest says charge isn't theirs.
- Room 29 – Green.
- This is money hotel currently holds for guest.
- Room 14 – Brown.
- Action = retry after 00:00.
- Outstanding balance remains on the account.
- Petty cash float is £500.
- No discrepancy.
- Normal process, no issue.
- No Night shift action.
- Room 21 – Reception printer produced duplicate receipt for.
- Outstanding balance remains on the account.
- No financial action required.
- FINAL STATUS = PAID.
- UPDATE 18:00 - guest paid £50 at reception.
- TV remote not working. Guest needs a replacement.
- Accommodation paid.
- Room 18 – Laura Mitchell = FULLY PAID.
- Paid £50.

### Recommendations
1. Collect outstanding Expedia payment £100 before departure. _(priority: urgent)_ _(owner: Reception)_
2. Collect outstanding Booking.com payment for Room 18 before departure. _(priority: high)_ _(owner: Reception)_
3. Collect outstanding Expedia payment for Room 24 before departure. _(priority: high)_ _(owner: Reception)_
4. Collect minibar charge for Room 40 before departure. _(priority: high)_ _(owner: Reception)_
5. Complete VIP in Room 42 for Sophie Grant requirements this shift. _(priority: high)_ _(owner: Reception)_

## Observed Positives
- Many correct payment rules appear in General (paid/outdated/disputed/deposit/refund language present in raw form).

## Observed Failures
- Briefing leads with **£100** and **£180** outstanding — wrong/stale.
- Priority 5 nonsensical “Maintenance regarding safe”.
- Payments section shows **£180** and minibar **rm40** (explicitly not a payment issue).
- Recs: collect Expedia £100; collect **b.com rm18** (fully paid); collect Expedia **24** as if personal collect; minibar **40**.
- Sophie “outstanding balance” in guest follow-up.
- Laura paid truth buried; compression fails the whole point of the scenario.

## Failure Tags
`payment-state` · `source-of-truth` · `state-resolution` · `recommendation-quality` · `prioritisation` · `compression` · `presentation` · `deduplication` · `hotel-intelligence`

## Operational Risk
**Critical** — Asking paid VIP/prepaid guests for money; missing true POA/deposit actions; misclassifying refund/deposit/dispute.

## Status
**Failed**

## Notes
Tester review completed from recovered CSV evidence (input vs saved HF output). Historical input/output preserved above.
