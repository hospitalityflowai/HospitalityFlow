# Scenario-010 — Wedding Day Pavilion Pressure

## Freeze status
**FROZEN BEFORE FIRST HF RUN** — Original Input and Human Expected Truth must not be edited after first engine run. Fictional hotel / guests / operations only.

## Scenario Metadata
- Hotel: The Meridian Gate Hotel & Spa (fictional)
- Scenario ID: 010
- Title: Wedding Day Pavilion Pressure
- Date: 2026-09-13 (fictional)
- Shift: PM
- Operational load: Busy
- Prepared by: Aisha Rahman — Events Coordinator (fictional) / FO log
- Departments: Events, F&B, Valet, Reception, Housekeeping
- Ambiguity intentional: Partial
- Matrix status: Authored / frozen (test specification)

## Original Input / Raw Source Notes

Sunday wedding — Hargreaves — busy but keep rooms honest.

PAVILION / EVENTS
Ceremony 15:00 pavilion. Florist done AM — DONE. Chairs final set — DONE.
Still OPEN for Events/F&B: **cake delivery ETA 14:20** — must be accepted at pavilion loading door (not Main lobby). Rain plan: move cocktails under colonnade if showers — DM aware.

GUEST ROOMS
Bridal suite **MS04** — Ms Hargreaves in-house. Connecting **M318** for parents — interconnect unlocked earlier — DONE.
Do **not** put random wedding guests into crew quiet wing.

VALET
Surge 14:00–16:00. Overflow map in use. Two tickets still unprinted for vans — Concierge/Valet to clear before ceremony.

ANNEX
Wedding guests on CX14/CX15 — both clean. CX16 requested late — **not clean yet** — do not check in until HK releases.

PAYMENT
Many wedding rooms prepaid master account “Hargreaves Wedding” — do not collect room/tax from individuals unless folio shows guest due. Mr Guest (CX14) asking about £40 minibar — **not posted yet** — do not invent collect.

### Hotel Snapshot
Arrivals wedding-heavy / Stay high / Pavilion live / Valet surge / Occ ~88%

## Human Expected Current Truth

### Current operational facts
- Pavilion ceremony 15:00; florist/chairs DONE; cake ETA 14:20 at pavilion loading door — OPEN accept.
- MS04 bridal + M318 parents interconnect DONE.
- Valet surge; two van tickets unprinted — OPEN.
- CX16 not clean — do not check in.
- Master prepaid; no invented £40 minibar collect.

### Expected OPEN actions
- Accept / coordinate cake delivery ~14:20 at pavilion loading door (Events/F&B).
- Clear unprinted valet tickets for vans before ceremony surge.
- Hold CX16 check-in until HK release.

### Expected MONITOR items
- Rain plan for cocktails; valet capacity through 16:00.
- CX16 cleaning progress.

### Expected INFORMATION
- Florist/chairs/interconnect DONE; master account prepaid pattern; CX14/CX15 clean.

### Expected UNRESOLVED / clarifications
- Whether showers force colonnade move — weather-dependent; do not invent weather outcome.

### Explicit completed / resolved / superseded (must not reopen)
- Florist, chairs, interconnect unlock — DONE — must not reopen.
- Unposted minibar — must not become OPEN collect.

### Important entity / room / time bindings
- MS04 / M318; CX14–CX16; cake 14:20 pavilion door; ceremony 15:00.

### Must not invent
- Checking into CX16 dirty.
- Individual room collects against master prepaid without guest due.
- Putting wedding guests into crew quiet wing.
- Cake delivery at Main lobby instead of pavilion door.

### Short human rationale
Busy event day: pavilion + valet real work; room inventory honesty; payment fail-closed on master account.
