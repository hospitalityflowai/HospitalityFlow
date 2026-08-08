# Hospitality Flow – The Riverton Bloomsbury

## Fictional property notice

**The Riverton Bloomsbury is entirely fictional.**  
Guests, staff, companies, and operational notes used in this suite must be fictional. This is not a real hotel and must not contain real guest data.

## Purpose

Post–Sprint 8 **generalisation** test environment for Hospitality Flow intelligence.

We already have:

- **Zetter Marylebone** — real field shifts (historical evidence)
- **Pilot Hotel** — 80-room fictional boutique regression suite

Riverton exists to test whether HF generalises to a **larger (120-room), more operationally complex** independent upscale London hotel — not whether it overfits Zetter or Pilot patterns.

## Phase A status (current)

| Item | Status |
|------|--------|
| Hotel profile | **Created** — [hotel-profile.md](hotel-profile.md) |
| Evidence guide | **Created** — [EVIDENCE_GUIDE.md](EVIDENCE_GUIDE.md) |
| Scenario IDs 001–020 | **Reserved only** — no scenario content yet |
| Frozen CSV exports | **Not yet** — `exports/` placeholder only |
| Live Supabase workspace | **Not created** (Phase A = local files only) |

## Principles

- Keep Riverton clearly isolated from Zetter and Pilot Hotel evidence.
- Do not invent or alter completed scenario content later to make a version look better.
- Evidence must live in this repository when scenarios are filled.
- Prefer new fictional guests/rooms; do not recycle Pilot/Zetter identities.

## Hotel profile

All future scenarios assume [hotel-profile.md](hotel-profile.md) unless a scenario explicitly overrides a detail.

**Quick facts:** 120 rooms · Bloomsbury, London · independent upscale · LG + floors 1–5 · Reception 24/7 · Duty Manager + Night Manager · restaurant, cocktail bar, parlour · two meeting rooms + private dining.

## Scenario index

See [SCENARIO_INDEX.md](SCENARIO_INDEX.md). IDs **001–020** are reserved; scenario markdown files are **not** created in Phase A.

## How this suite will be used later

1. Author fictional scenarios under this profile.
2. Run HF against exact Original Input.
3. Record expected truth, actual output, and observations per [EVIDENCE_GUIDE.md](EVIDENCE_GUIDE.md).
4. Optionally freeze saved handovers with `scripts/export-test-handovers.mjs` into `exports/` (or `exports/local-raw/` if a live workspace is added later).

## Related suites (do not modify from here)

- [../pilot-hotel/](../pilot-hotel/) — 80-room fictional Pilot Hotel
- [../zetter-real-shifts/](../zetter-real-shifts/) — real Zetter field evidence
- [../EXPORT_TEST_HANDOVERS.md](../EXPORT_TEST_HANDOVERS.md) — freeze saved handovers from Supabase
