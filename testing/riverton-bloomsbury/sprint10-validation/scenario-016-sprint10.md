# Scenario-016 — RIVERTON SPRINT 10 VALIDATION OUTPUT

**Label:** RIVERTON SPRINT 10 VALIDATION OUTPUT

Human Expected Truth authority remains in `../scenario-016.md`. This file is engine output only.

## Run metadata
- Scenario: 016 — Late Checkout After Midnight Crossing
- Shift: Night
- Load: Busy
- Difficulty: Hard
- Capability: Ambiguous operational day → UNRESOLVED / fail-closed
- Git commit: `a50b66bf962be44667c5c4bc6b3b1acaa4bbfabc`
- Engine version: 1
- Ran at: 2026-08-08T12:52:15.683Z
- brainContext: `null`
- Source SHA-256: `fc63e763a62f0e7f7e7a4acafa773a588a712c45aab0db466c7612889374c6d6`

## Pipeline
1. extractOperationalFact / sectionFromFact
2. consolidateNotesByFacts
3. resolveOperationalEntities (Sprint 3)
4. electCanonicalCurrentState (Sprint 1)
5. resolveOperationalDependencies (Sprint 4)
6. buildCanonicalOperationalActions (Sprint 5/6/8/10)
7. buildOrganisedSectionModel
8. buildTodaysBriefing (Sprint 8 decision seating)
9. ShiftIntelligenceEngine.analyze (Sprint 8 recommendation seating)

## Exact source input

```
Saved on night desk tablet at **00:37**.

Paste from earlier shift chat (timestamp on message shows **23:55** previous calendar evening):

“Late c/o today @12 for:
rm 217 Merton
rm 219 Hof
rm 402 Singh
DM approved — £20 each posted where required
HK please hold cleans”

Problem: after midnight, “today @12” is ambiguous — is that **noon coming up in ~11 hours**, or did the message mean **the noon that already passed yesterday**, or **noon of the guest’s checkout date still showing on the folios**?

Opera still shows Merton/Hof/Singh as in-house with checkout date fields that look like **this morning’s business date** depending which date roll we finished — night audit **not fully rolled** when this was saved.

Night manager instruction: **do not honour as OPEN late checkout** until day/date is confirmed with DM notes or folio checkout date clarity. Fail closed / UNRESOLVED rather than invent which noon.

Other clear night work (not ambiguous):
- Wake-up 05:45 rm 508
- Early luggage pull rm 114 for 06:20 taxi (taxi confirmed)
```

## Canonical actions (Sprint 8 + temporal)

- Anchor: handover_date=2026-08-08 shift=Night created_at=2026-08-09T00:20:00.000Z
- State counts: {"open":1,"monitor":0,"information":0,"unresolved":1,"blocked":0,"resolved":0,"other":0}

- **open** `guest_request:luggage_ea` P2 — Honour luggage / early-arrival arrangements (Room 114) _(room 114)_ _(temporal: information/06:20)_
- **unresolved** `timed:late_checkout` P2 — Unresolved late check-out today @12 — confirm operational day before actioning _(temporal: ambiguous/12:00)_

## AI Summary / Briefing

Priority 1
Timed departure actions for Room 508: wake-up at 05:45.

Priority 2
Honour luggage / early-arrival arrangements (Room 114).

## Organised handover

### urgent (0)
_No items_

### vip (0)
_No items_

### guest (2)
- - Early luggage pull rm 114 for 06:20 taxi (taxi confirmed)
- - Wake-up 05:45 rm 508

### maintenance (0)
_No items_

### payments (1)
- “Late c/o today @12 for: | Night manager instruction: **do not honour as OPEN late checkout** until day/date is confirmed with DM notes or folio checkout date clarity. Fail closed / UNRESOLVED rather than invent which noon.

### events (0)
_No items_

### preparations (0)
_No items_

### openQuestions (0)
_No items_

### tasks (0)
_No items_

### inventory (0)
_No items_

### deliveries (0)
_No items_

### lostproperty (0)
_No items_

### general (10)
- rm 217 Merton
- rm 219 Hof
- rm 402 Singh
- Saved on night desk tablet at **00:37**.
- Paste from earlier shift chat (timestamp on message shows **23:55** previous calendar evening):
- DM approved — £20 each posted where required
- HK please hold cleans”
- Problem: after midnight, “today @12” is ambiguous — is that **noon coming up in ~11 hours**, or did the message mean **the noon that already passed yesterday**, or **noon of the guest’s checkout date still showing on the folios**?
- Opera still shows Merton/Hof/Singh as in-house with checkout date fields that look like **this morning’s business date** depending which date roll we finished — night audit **not fully rolled** when this was saved.
- Other clear night work (not ambiguous):

### completed (0)
_No items_

## Recommendations

1. Honour luggage / early-arrival arrangements (Room 114). _(priority: normal, owner: Reception, status: open)_
2. Complete the 05:45 wake-up call for Room 508 — wake-up call not yet confirmed as loaded this shift. _(priority: high, owner: Reception, status: open)_

## Human Expected Truth (copied for side-by-side review)

### OPEN expected
- **508** wake-up 05:45.
- **114** luggage + 06:20 taxi (confirmed).
- Late checkouts: **not** forced OPEN honour solely from ambiguous “today”.

### MONITOR expected
- Night audit / date roll completion; DM confirmation path for Merton/Hof/Singh.

### INFORMATION expected
- £20 late c/o charges mentioned as posted “where required” — still does not resolve which noon without date clarity.

### UNRESOLVED expected
- Which calendar noon applies to late c/o for 217/219/402 (primary intentional ambiguity) → fail closed.

### Must not infer
- Forcing OPEN late-checkout honour by guessing the day.
- Inventing which calendar day “today” meant.
- Marking late checkouts completed without evidence.
- Dropping the clear wake-up/taxi items while over-focusing on a guessed c/o day.

## Reasoning metadata (summary)

- Notes after pipeline: 13
- Dependency edges: 0
- Canonical actions: 2
- Quiet shift flag: null

Full machine-readable dump: `scenario-016-sprint10.json`
