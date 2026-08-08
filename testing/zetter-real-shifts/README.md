# The Zetter Marylebone – Real Shift Evidence

## Purpose

This folder stores and reviews the five real handovers created during field testing at **The Zetter Marylebone**.

These are **real operational field-test handovers** (not fictional Pilot Hotel scenarios). Recovered content comes from the saved Supabase export and is treated as **historical evidence**.

## Important rules

- Do **not** invent original input, HF output, dates, record ids, or observations.
- Recovered database output is **historical HF output** — it must **not** be confused with current post-Sprint-4 engine behaviour.
- Until a field is recovered from the database/export (or completed by tester review), leave it as `[NOT RECORDED]`.
- Do **not** paraphrase lost text from memory and present it as the original handover.
- Do **not** treat this folder as a substitute for [../pilot-hotel/](../pilot-hotel/) — Pilot Hotel remains the fixed fictional regression suite.
- Field-testing journal notes in [../field-testing/](../field-testing/) may describe shifts; they are **not** a substitute for recovered handover evidence here.
- **Tester review is required** before building a Real Shift Failure Map.

## Evidence complete?

A shift is **evidence-complete** only when it has:

1. Original input (recovered)  
2. Expected current truth (tester review)  
3. Actual HF output / result (recovered historical output counts for this step)  
4. Observations (tester review)  

Until tester review is done, mark **Evidence Complete? = No** in [SHIFT_INDEX.md](SHIFT_INDEX.md).

## Contents

| Path | Role |
|------|------|
| [SHIFT_INDEX.md](SHIFT_INDEX.md) | Coverage table for shifts 001–005 |
| `shift-001.md` … `shift-005.md` | Per-shift evidence records |
| [exports/zetter-real-shifts-001-005.csv](exports/zetter-real-shifts-001-005.csv) | Supabase export (historical records) |

## Current status

- Historical input/output recovered for shifts 001–005.
- Tester review fields remain `[NOT RECORDED]`.
- No Real Shift Failure Map yet.
