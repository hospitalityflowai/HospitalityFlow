# Scenario-014 — Night Payment Contrast and Lean Cover

## Freeze status
**FROZEN BEFORE FIRST HF RUN** — Original Input and Human Expected Truth must not be edited after first engine run. Fictional hotel / guests / operations only.

## Scenario Metadata
- Hotel: The Meridian Gate Hotel & Spa (fictional)
- Scenario ID: 014
- Title: Night Payment Contrast and Lean Cover
- Date: 2026-09-19 (fictional)
- Shift: Night
- Operational load: Normal
- Prepared by: Jonas Berg — Night Manager (fictional)
- Departments: Night Team, Finance/Reception, Engineering
- Ambiguity intentional: Low
- Matrix status: Authored / frozen (test specification)

## Original Input / Raw Source Notes

Night — payments + one real maint.

PAYMENTS
1) **M124 Mr Calder** — open folio balance **£64.80** (restaurant) — please **collect** tonight or first thing if asleep — card auth failed earlier. Genuine debt.
2) **CX06 Ms Green** — prepaid Booking.com — **ignore** green collect stamp.
3) **M220 Apex crew liaison room** — company billed — £0 guest due.
4) **M133** — deposit / balance due **tomorrow** on extension — **not** tonight’s collect.

MAINTENANCE
M311 — bathroom extractor noisy. Guest ok overnight with window open; eng tomorrow — MONITOR.

Lean: me + porter. Spa closed. No shuttle overnight. Early flyer taxi arranged externally (guest’s own) — awareness only.

### Hotel Snapshot
Stay 39 / Occ ~70% / Night lean / One genuine debt

## Human Expected Current Truth

### Current operational facts
- Calder M124 £64.80 outstanding — genuine OPEN collect.
- Green prepaid — no collect; Apex company billed — no collect; M133 due tomorrow — not tonight.
- M311 mitigated MONITOR tomorrow eng.
- Lean night; no hotel shuttle overnight.

### Expected OPEN actions
- Collect / settle £64.80 with Calder M124 (or first contact when appropriate overnight).

### Expected MONITOR items
- M311 extractor overnight / eng tomorrow.
- M133 balance due tomorrow — future payment, not tonight OPEN collect.

### Expected INFORMATION
- Prepaid Green; company Apex; lean staffing; external taxi awareness.

### Expected UNRESOLVED / clarifications
- None material on debt existence for Calder — amount evidenced.

### Explicit completed / resolved / superseded (must not reopen)
- Green collect stamp — void.
- Apex guest collect — not applicable.
- Guest’s own taxi — not hotel shuttle OPEN.

### Important entity / room / time bindings
- Calder M124 £64.80; Green CX06; Apex M220; M133 tomorrow; M311 MONITOR.

### Must not invent
- Collect on Green / Apex / M133-tonight.
- OPEN eng chase on mitigated M311.
- Hotel shuttle task with no shuttle evidence.

### Short human rationale
Normal Night: payment fail-closed contrast with one true debt; soft maint MONITOR.
