# The Meridian Gate Hotel & Spa — Unseen Generalisation Test

**Status:** Phase B — 20 scenarios authored; **FROZEN BEFORE FIRST HF RUN**  
**Purpose:** Fresh unseen generalisation corpus — deliberately different from Zetter Marylebone, Pilot Hotel (80 rooms), and The Riverton Bloomsbury (120 rooms).

> **Fictional:** The hotel, guests, bookings, departments, and all operational data in this folder are **entirely fictional**. They exist only for Hospitality Flow reasoning evaluation.

**Freeze:** `scenario-001.md` … `scenario-020.md` Original Input + Human Expected Truth are frozen. Integrity: `FREEZE_MANIFEST.json`. Do not run HF / create baseline / start Sprint 12 until human approval of Phase B.

## What this is

A third fictional hotel used to test whether current HF reasoning generalises to a genuinely different operating model (airport-adjacent, split building, spa, shuttle, valet, crew blocks).

## What this is not

- Not a live hotel or live guest data
- Not Riverton / Pilot / Zetter retuning material
- Not Sprint 12 work
- Not scenarios yet (Phase A = profile + methodology only)

## Phase A contents (this folder)

| Path | Role |
|------|------|
| `README.md` | This file |
| `hotel-profile.md` | Frozen operational profile authority |
| `TESTING_GUIDE.md` | Methodology, integrity sequence, freeze rules |
| `SCENARIO_INDEX.md` | Titles, shift/band, themes; freeze status |
| `FREEZE_MANIFEST.json` | SHA-256 per scenario file (Phase B freeze) |
| `scenario-001.md` … `scenario-020.md` | Authored scenarios (input + HET frozen) |
| `exports/.gitkeep` | Placeholder for later exports |

**No** baseline-validation artefacts or HF first-run outputs yet.

## Frozen prior corpora (do not retune)

- Riverton Bloomsbury 001–020 — frozen regression evidence after Sprint 11
- Pilot Hotel / Zetter — separate historical evidence; do not modify for Meridian

## Local-only

Prefer local engine pipeline for first-run scoring. No Supabase workspace is required for Phase A–D.

## Next phases (not started)

1. **B — Author:** write 20 scenarios + Human Expected Truth; freeze before any HF run  
2. **C — First run:** current engine unchanged; freeze first-run outputs  
3. **D — Score:** Clear / Partial / Material on all 20 before any Sprint 12  
4. **E — Optional Sprint 12:** only after scoring; do not polish Riverton for generalisation
