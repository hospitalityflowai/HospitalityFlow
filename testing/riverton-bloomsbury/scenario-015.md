# Scenario-015 — POA Is Not Collect — Unless Evidence Says So

## Scenario Metadata
- Hotel: The Riverton Bloomsbury (fictional)
- Scenario ID: 015
- Title: POA Is Not Collect — Unless Evidence Says So
- Shift: AM
- Operational load: Normal
- Departments: Reception
- Difficulty: Moderate
- Ambiguity intentional: No
- Spec capability: Payment-state discrimination
- Matrix status: Authored / frozen (test specification)
- Date authored: 2026-08-08
- HF run: not run
- Evidence complete: No

## Original Input / Raw Source Notes

Cashier clear-down list — AM

PAYMENT STATES (do not “collect” the green ones):
- 112 Mr Adeyemi — **POA room only** — extras on own card — no room rate chase
- 204 Ms Blum — **Booking.com prepaid** — VCC settled night audit — OK
- 309 HelioSpan — **company billed** — master account — OK
- 415 Mr & Mrs Pike — **deposit held** — balance due at checkout tomorrow — not today’s collect panic
- **228 Mr Seth Calder** — **GENUINE OUTSTANDING** — mini-bar + paid-out taxi **£64.80** still open on folio — guest departing **today 11:00** — please settle before keys go back

Someone highlighted every line in yellow. Only Calder is actually a collect-now.

Also: “OTA pending” scribbled with no room — ignore.

### Hotel Snapshot
Arrivals 16 / Dep 19 / Stay 48 / Occ ~55%

## Human Expected Truth

### Current operational facts
- Adeyemi POA / Blum prepaid / HelioSpan company / Pike deposit-for-tomorrow are **not** same-day collect-all.
- **Calder 228**: **£64.80** outstanding; departure today ~11:00 — real collect/settle before departure.

### Expected work states

#### OPEN
- Settle **£64.80** on **228 Calder** before ~11:00 departure.

#### MONITOR
- Pike balance due tomorrow (not today).

#### INFORMATION
- POA / prepaid / company-billed statuses for other listed rooms.

#### UNRESOLVED
- Anonymous “OTA pending” scrap without room.

### Must not infer / invent
- Collect actions on POA / prepaid / company-billed rooms without evidence of debt.
- Inventing channel/OTA payment wording or amounts for rooms that are settled.
- Expanding yellow highlight into a mass collection list.

## Actual HF Output
[NOT RUN — awaiting human review]
