# Scenario-016 — Late Checkout After Midnight Crossing

## Scenario Metadata
- Hotel: The Riverton Bloomsbury (fictional)
- Scenario ID: 016
- Title: Late Checkout After Midnight Crossing
- Shift: Night
- Operational load: Busy
- Departments: Reception, Night Manager, Housekeeping
- Difficulty: Hard
- Ambiguity intentional: Yes (primary)
- Spec capability: Ambiguous operational day → UNRESOLVED / fail-closed
- Matrix status: Authored / frozen (test specification)
- Date authored: 2026-08-08
- HF run: not run
- Evidence complete: No

## Original Input / Raw Source Notes

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

### Hotel Snapshot
partial — audit mid-roll — occ figure unreliable tonight

## Human Expected Truth

### Current operational facts
- Late checkout note for **217 / 219 / 402** exists with “today @12” language saved **after midnight**.
- Operational calendar day for that “today” is **not safely determinable** from the paste alone amid audit roll uncertainty.
- Wake-up 508 and taxi/luggage 114 are clear timed night/AM items.

### Expected work states

#### OPEN
- **508** wake-up 05:45.
- **114** luggage + 06:20 taxi (confirmed).
- Late checkouts: **not** forced OPEN honour solely from ambiguous “today”.

#### MONITOR
- Night audit / date roll completion; DM confirmation path for Merton/Hof/Singh.

#### INFORMATION
- £20 late c/o charges mentioned as posted “where required” — still does not resolve which noon without date clarity.

#### UNRESOLVED
- Which calendar noon applies to late c/o for 217/219/402 (primary intentional ambiguity) → fail closed.

### Must not infer / invent
- Forcing OPEN late-checkout honour by guessing the day.
- Inventing which calendar day “today” meant.
- Marking late checkouts completed without evidence.
- Dropping the clear wake-up/taxi items while over-focusing on a guessed c/o day.

## Actual HF Output
[NOT RUN — awaiting human review]
