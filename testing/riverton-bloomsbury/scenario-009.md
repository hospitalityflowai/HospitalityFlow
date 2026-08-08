# Scenario-009 — Parlour Afternoon Tea & Room Service Cutoff

## Scenario Metadata
- Hotel: The Riverton Bloomsbury (fictional)
- Scenario ID: 009
- Title: Parlour Afternoon Tea & Room Service Cutoff
- Shift: PM
- Operational load: Normal
- Departments: F&B, Reception
- Difficulty: Moderate
- Ambiguity intentional: Yes (whether exception was granted)
- Spec capability: F&B operational commitments; cutoff fail-closed
- Matrix status: Authored / frozen (test specification)
- Date authored: 2026-08-08
- HF run: not run
- Evidence complete: No

## Original Input / Raw Source Notes

hi team — messy but important

PARLOUR
Afternoon tea booking **15:30** — name **Mrs Genevieve Shaw** — party of 3 — table confirmed by F&B this morning. Guest is in-house **rm 404**. Not a room amenity — it’s a restaurant/parlour cover. Please don’t put “VIP fruit” language on this.

ROOM SERVICE
Published IRD cutoff for full menu is **22:30**. After that, night menu only if kitchen agrees.

At 22:48 guest **rm 227** (Mr Hofstadter) called wanting a club sandwich + chips. Night receptionist told him cutoff passed. Guest asked for “manager exception”. Night manager was on a walkie with a noise room and said “I’ll come back to it” — **no clear yes/no recorded**. Guest said he might call again. Kitchen already closing down hot line.

Please fail closed: do **not** assume exception approved unless someone writes APPROVED with name/time.

Other bits:
rm 512 turndown done
Newspaper for 301 — delivered
Someone wrote “champagne for Shaw” on a sticky — I think they confused parlour tea with amenities — **no champagne request on booking**

### Hotel Snapshot
left mostly blank / Occ ~68% / Arrivals remaining 6 late / normal PM tapering to night

## Human Expected Truth

### Current operational facts
- Shaw parlour afternoon tea 15:30 / party of 3 / in-house 404 — F&B cover, not room VIP package.
- Hofstadter 227 requested hot IRD after **22:30** cutoff; exception **not clearly granted**.
- Sticky “champagne for Shaw” is likely confusion — **no evidenced champagne request**.
- Turndown 512 and newspaper 301 are completed noise.

### Expected work states

#### OPEN
- Honour / host Shaw tea as F&B operational commitment at 15:30 (if this handover is used pre-tea) or confirm completed if past — scenario focus remains correct classification.
- For 227: clarify exception with Night Manager **or** decline per cutoff — do not silently proceed as approved.

#### MONITOR
- Possible callback from 227 regarding food after cutoff.

#### INFORMATION
- Published cutoff 22:30; completed turndown/newspaper.

#### UNRESOLVED
- Whether manager exception for 227 was granted (intentional ambiguity).

### Must not infer / invent
- Inventing exception approval for late room service.
- Converting Shaw tea into VIP amenity package / champagne for wrong framing.
- Assigning champagne to Shaw from sticky note alone.
- Treating tea as housekeeping room setup.

## Actual HF Output
[NOT RUN — awaiting human review]
