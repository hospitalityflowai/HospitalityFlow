# Scenario-004 — Emma Clarke — Messy Shorthand & Grammar

## Test Metadata
- Date tested: 2026-08-07
- Hotel: Hotel Pilot
- Shift: AM
- Record id: 6307a80e-592b-442c-88be-b0fd6989bef3
- created_at: 2026-08-07 17:45:34.576839+00
- Scenario focus: Deliberately messy shorthand / grammar extraction stress test (Emma Clarke)
- HF version/commit: [NOT RECORDED]
- Workspace id: 090ec1b9-2c03-41ac-a4ea-19c412f7da37
- Prepared by: Not specified
- Evidence source: `testing/pilot-hotel/exports/pilot-hotel-scenarios-001-020.csv` (Supabase saved handover; not re-generated)

## Original Input

### Today's Arrivals
mrs emma clarke 28 eta maybe 9ish?? repeat guest asked same as last time quiet room + oat milk pls

Tom Harris 17 bcom prepaid late arrv prob 1am. says needs twin. hk pls chk

Nadia Ali rm36 expedia arriving 2230. vcc not working earlier pls night check again

Mr Lewis 22 eta?? birthday. balloons supposed to be done by fb but not sure if actually done

Johnson family 2 rooms 14/15 arriving around 8.30. kids. asked interconnecting if poss. cot needed in one room not sure which one sorry

Anna Petrov rm 41 VIP returning guest. arriving 21:45. flowers + card pls. flowers came already office i think

rm 33 arrival name cant remember sorry check opera - guest called asking early breakfast takeaway for 6am tomorrow

### Today's Departures
12 late co till 2 approved by manager. charge £40 NOT posted yet

rm26 left already but bag still here behind desk says back around 7

45 taxi 5.30am tmrw heathrow. think PM booked it but pls double chk. wakeup 4.45 NOT done

rm8 checked out but owes minibar 18 quid i think

19 guest leaving very early around 5am asked coffee takeaway - night pls sort

31 checked out all fine nothing left

### General Hotel / Shift Notes
HK - 17 still double atm. they know needs changing twin before late guest comes

FB - balloons for birthday guy maybe done?? someone said yes but no confirmation pls check room 22

maint - shower 24 leaking again. guest ok atm towels given. engineer tomorrow

reception - lady in 28 called again asking oat milk. she said last stay we forgot it so pls dont forget this time

rm 36 payment thing still showing weird on opera. expedia card maybe after midnight?? not sure

Armi said flowers for 41 are in office. card isnt written yet

guest 39 complained noise again from outside. gave ear plugs she seems ok now but maybe call later

front door reader playing up AGAIN. works if u tap card twice. maint knows

someone left black iphone in bar. behind reception now. no idea whose

hk says cot put in 15. hopefully thats the room family wanted??

night pls remember early breakfast for the guest arriving 33. kitchen said can make bag but need tell them guest name

also coffee takeaway rm19 around 4.45/5ish

fire alarm beeped once around 18:20 then stopped. engineer checked panel said all normal

oh and Tom called again - definitely twin pls dont forget

Nadia called she will actually arrive more like midnight now

Anna asked if possible same room as previous stay but nobody checked which room that was

PM said room 28 ready but didnt check oat milk

£80 cash found near lift handed to duty manager and put safe. logged in book

tomorrow delivery coming 7am maybe linen? loading bay access needed

### Hotel Snapshot
Stored Hotel Snapshot values from `metrics.hotelSnapshot`:

- Arrivals: 33
- Sellable Rooms: 80
- OOO Rooms: 0

Snapshot fields present but blank/sparse (not invented): RevPAR, RevPAR (value).

## Expected Current Truth
*(Only where notes support a reading)*
- **Emma Clarke rm 28**, ETA ~21:00 (“9ish”); quiet room + **oat milk** (missed last stay; called again); PM says room ready but oat milk **not checked**.
- **Tom Harris rm 17**, b.com prepaid, ~01:00; **twin required** (still double); reconfirmed twin by phone.
- **Nadia Ali rm 36**, Expedia; ETA now **~midnight**; payment/VCC still uncertain — night check.
- **Mr Lewis rm 22** birthday; balloons **unconfirmed** — must verify in room.
- **Johnson family 14/15** ~20:30; interconnecting if possible; cot — HK put in **15** (uncertain if correct room).
- **Anna Petrov rm 41** VIP 21:45; flowers in office; **card not written**; asked previous room — **not checked**.
- **rm 33** arrival: name unknown (check Opera); early breakfast takeaway **06:00** — kitchen needs guest name.
- **Dep 12**: late c/o to **14:00** approved; **£40 not posted**.
- **26**: luggage behind desk, back ~19:00.
- **45**: taxi 05:30 tomorrow — verify booking; wake **04:45 not done**.
- **8**: minibar ~£18 outstanding.
- **19**: early ~05:00 coffee takeaway.
- **31**: clear.
- **24** shower leak; towels; engineer tomorrow; guest OK.
- Door reader intermittent (double-tap); black iPhone LP at reception; £80 cash logged; fire beep cleared; tomorrow ~07:00 loading-bay delivery.

## Expected Important Actions
1. Place/verify **oat milk** for Clarke **28**.
2. Twin convert **17** before Tom’s late arrival.
3. Verify balloons **22**; write Anna card; flowers from office to **41**.
4. Re-check Nadia payment + midnight ETA.
5. Identify rm **33** guest in Opera + brief kitchen for 06:00 breakfast bag.
6. Post £40 late c/o **12**; set/verify **45** wake + taxi; minibar **8**; coffee **19**.
7. Confirm cot/interconnecting for Johnson **14/15**.
8. Log/handle iPhone LP; door reader awareness.

## Actual HF Output

Recovered from saved `generated_handover` / `recommendation_state` / `metrics` at save time. Wording below is from the historical record (not re-run).

### Output metadata
- Saved date display: Friday, 7 August 2026
- Generated/saved timestamp (from record): 2026-08-07T17:45:34.323Z
- Checklist state: none saved / empty

### AI Summary / Today's Briefing
Priority 1
Follow up with Maintenance regarding shower/leak before further guest impact.

Priority 2
Timed departure actions for Room 45: wake-up at 04:45 and taxi at 05:30.

Priority 3
Revenue follow-up required for outstanding channel payment before departures.

Priority 4
VIP readiness follow-up for Anna Petrov in Room 41.

### Organised Handover Sections
#### Urgent / Shift Alerts (1)
- Fire alarm beeped once around 18:20 then stopped. engineer checked panel said all normal.

#### VIP (1)
- Room 41 – Anna Petrov is a returning VIP guest arriving at 21:45.

#### Guest Follow-up (4)
- Room 45 – Wake-up call at 04:45.
- Room 12 – Late check-out confirmed for 2:00 AM.
- The guest has raised a complaint regarding noise.
- Night remember early breakfast for the guest arriving 33. kitchen said can make bag but need tell them guest name.

#### Maintenance (3)
- Shower leak open.
- Front door reader playing up AGAIN. works if u tap card twice. maintenance knows.
- £80 cash found near lift handed to duty manager and put safe. logged in book.

#### Payments / Finance (3)
- Room 36 – An outstanding Expedia payment for Nadia Ali still needs to be collected.
- Room 8 – A minibar charge requires review.
- An outstanding Expedia payment still needs to be collected.

#### Outstanding Tasks
_No items_

#### Events / Timeline
_No items_

#### Preparations (15)
- Anna Petrov — Room 41
- ☐ Flowers
- Rooms 14 & 15
- ☐ Extra bed
- ☐ Interconnecting rooms
- Tom Harris
- ☐ Twin setup if available
- Review original note
- ☐ Twin setup if available
- ☐ Flowers
- ☐ Extra bed
- Mr Lewis
- ☑ Birthday balloons
- Room 22
- ☐ Birthday balloons

#### Completed Actions (2)
- Room 22 – F&B - balloons for birthday guy maybe done?? someone said yes but no confirmation check.
- Mr Lewis 22 ETA?? birthday. balloons supposed to be done by F&B but not sure if actually done.

#### Inventory
_No items_

#### Deliveries (1)
- Package being held for tomorrow.

#### Lost Property
_No items_

#### Open Questions
_No items_

#### General / Operational Notes (10)
- Room 33 – Arrival name cant remember sorry check opera - guest called asking early breakfast takeaway for 6am tomorrow.
- Room 28 – PM said ready but didnt check oat milk.
- Mrs emma clarke 28 ETA maybe 9ish?? repeat guest asked same as last time quiet room + oat milk.
- Room 26 – Left already but bag still here behind desk says back around 7.
- 19 guest leaving very early around 5am asked coffee takeaway - night sort.
- Room 31 – Checked out all fine nothing left.
- Reception - lady in 28 called again asking oat milk. she said last stay we forgot it so dont forget this time.
- Someone left black iphone in bar. behind reception now. no idea whose.
- Room 19 – Also coffee takeaway around 4.45/5ish.
- Nadia called she will actually arrive more like midnight now.

### Recommendations
1. Follow up with Maintenance regarding shower/leak. The fault remains open and needs resolution this shift. _(priority: high)_ _(owner: Maintenance)_
2. Complete Room 45 wake-up at 04:45 and taxi at 05:30 this shift. _(priority: high)_ _(owner: Reception)_
3. Collect outstanding Expedia payment for Room 36 before departure. _(priority: high)_ _(owner: Reception)_
4. Collect minibar charge for Room 8 before departure. _(priority: high)_ _(owner: Reception)_
5. Complete VIP Room 41 preparation for Anna Petrov before arrival. _(priority: high)_ _(owner: Reception)_
6. Reserve interconnecting Rooms 14 & 15 for tomorrow's group arrival (Room 14). _(priority: normal)_ _(owner: Reception)_

## Observed Positives
- Messy Clarke/Nadia/Anna fragments retained rather than dropped entirely.
- **45** wake/taxi in briefing.
- Twin prep for Tom appears.
- Nadia midnight update kept.
- VIP Anna recognised.

## Observed Failures
- Snapshot **Arrivals: 33** — almost certainly room **33** misread as arrivals count.
- Late c/o shown as **2:00 AM** instead of **14:00 / 2pm**.
- Balloons marked completed while notes say unconfirmed; completed section includes uncertain text as done.
- Shower leak item missing room **24**; cash under Maintenance; fire cleared item in Urgent.
- Rec #6: interconnecting as “**tomorrow’s group**” — wrong (today’s Johnson family).
- Emma oat-milk critical preference under-prioritised vs generic payment/VIP lines.
- iPhone not in Lost Property; duplicate coffee/payment noise.
- Compression/clarity weak for an intentional shorthand stress test.

## Failure Tags
`extraction` · `temporal` · `hotel-snapshot` · `state-resolution` · `completed-as-open` · `guest-preference` · `presentation` · `prioritisation` · `recommendation-quality` · `deduplication`

## Operational Risk
**High** — Wrong late-checkout time + unverified birthday setup + oat-milk repeat failure are high guest-impact errors.

## Status
**Failed**

## Notes
Tester review completed from recovered CSV evidence (input vs saved HF output). Historical input/output preserved above.
