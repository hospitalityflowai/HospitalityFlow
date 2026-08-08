# Scenario-007 — On-Call Night Engineering

## Scenario Metadata
- Hotel: The Riverton Bloomsbury (fictional)
- Scenario ID: 007
- Title: On-Call Night Engineering
- Shift: Night
- Operational load: Normal
- Departments: Engineering, Night Manager, Reception
- Difficulty: Moderate
- Ambiguity intentional: No
- Spec capability: Temporal: tonight continuity vs tomorrow inspect (MONITOR vs OPEN chase)
- Matrix status: Authored / frozen (test specification)
- Date authored: 2026-08-08
- HF run: not run
- Evidence complete: No

## Original Input / Raw Source Notes

Night Manager — Ravi — 23:40 write-up

Guest **rm 307** (Ms Pell) rang at 22:05 — said a “chemical / sweet smell” near the bathroom and a faint buzzing. I attended with night porter. Smell mild; no visible smoke; detectors normal; buzzing was bathroom extractor intermittent.

Actions taken tonight:
- Extractor switched off at isolator
- Window opened / airing
- Guest relocated temporarily to lounge for 20 mins then returned to 307 — she is OK to stay
- Offered room move; she declined for tonight
- On-call engineer **advised by phone**; will attend **tomorrow AM** for inspect — not coming tonight unless worsens
- Incident form started (draft on shared drive)

Please MONITOR 307 overnight — if smell returns or guest asks to move, call on-call. Otherwise this is **AM engineering inspect**, not a live chase every hour.

Side notes (do not turn into payment drama):
- rm 118 folio shows £12 laundry — guest said they’ll settle at checkout Thursday — **not collecting tonight**
- Someone left a note “untokenised??? check PDQ” with no room — ignore until day team identifies (or bin if duplicate of morning list)

Also: corridor light outside 305 flickering — cosmetic; logged for AM maintenance list.

### Hotel Snapshot
Occ ~71% / Arrivals late 4 expected after midnight / Dep tomorrow 18 / OOO 2 / left blank otherwise

## Human Expected Truth

### Current operational facts
- Smell/buzz **307** mitigated tonight; guest staying; room move declined.
- Engineering attendance is **tomorrow AM inspect** via on-call advice — not on site tonight unless worsens.
- Night should **monitor** recurrence / guest comfort.
- £12 laundry 118 is for Thursday checkout — not a night collect.
- Anonymous untokenised scrap is incomplete noise.
- Flickering corridor light is AM maintenance log, low urgency.

### Expected work states

#### OPEN
- None for “call engineer now” unless condition worsens (threshold for escalation).
- AM handover must carry **307 inspect tomorrow** as next-shift work (OPEN for AM eng / reception continuity — not night emergency chase).

#### MONITOR
- **307** overnight for smell return / guest request to move.
- Guest wellbeing continuity.

#### INFORMATION
- Incident draft started; extractor isolated; laundry 118 deferred to Thursday; cosmetic light logged.

#### UNRESOLVED
- Anonymous “untokenised” scrap without room — do not invent a room/payment chase from it.

### Must not infer / invent
- Immediate danger / evacuate chase after mitigation without new evidence.
- Inventing confirmed gas leak.
- Collecting £12 laundry tonight or inventing outstanding balance urgency.
- Promoting cosmetic corridor light above the 307 continuity item incorrectly as P0 emergency.

## Actual HF Output
[NOT RUN — awaiting human review]
