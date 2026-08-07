# Hospitality Flow – Pilot Hotel

## Purpose

This folder is Hospitality Flow's permanent fictional hotel testing suite.

Pilot Hotel is not a real property and these scenarios are not real hotel shifts. They are controlled regression tests used to validate AI improvements over time.

Every future version of Hospitality Flow should be tested against these same scenarios.

## Principles

- Every scenario represents a realistic operational day at Pilot Hotel.
- Scenarios never change once created. Treat them as fixed baselines.
- As Hospitality Flow improves, rerun these scenarios to measure AI quality.
- Compare new AI output against previous runs and the expected behaviour for each scenario.
- Do not invent or alter completed scenario content to make a later version look better.
- **Evidence must live in this repository.** Off-repo reviews (chat, notes apps, screenshots alone) do not count as evidence-complete.

## Hotel profile

All scenarios assume the hotel defined in [hotel-profile.md](hotel-profile.md), unless a scenario explicitly states otherwise.

## Evidence intake (required)

| File | Role |
|------|------|
| [EVIDENCE_GUIDE.md](EVIDENCE_GUIDE.md) | How to record a run so evidence is never lost |
| [SCENARIO_INDEX.md](SCENARIO_INDEX.md) | Coverage table for scenarios 001–020 |
| `scenario-001.md` … `scenario-020.md` | Per-scenario evidence records |

A scenario is **evidence-complete** only when it has:

1. Original input  
2. Expected current truth  
3. Actual HF output / result  
4. Observations  

Until those four are filled, mark **Evidence Complete? = No** in the index and use `[NOT RECORDED]` in the scenario file where data is missing.

Historical input/output for scenarios 001–020 has been recovered from the Supabase export into each scenario file. Expected truth and observations remain `[NOT RECORDED]` until tester review — see [SCENARIO_INDEX.md](SCENARIO_INDEX.md).

## Scenario index (names)

Authoritative names/focus match [SCENARIO_INDEX.md](SCENARIO_INDEX.md) and the `scenario-XXX.md` titles.

| ID | Name | File |
|----|------|------|
| Scenario-001 | Amelia Hart — First Busy Stress Test | [scenario-001.md](scenario-001.md) |
| Scenario-002 | Oliver Grant — Updates & Corrections | [scenario-002.md](scenario-002.md) |
| Scenario-003 | James Martin / James Martins — Naming Variants | [scenario-003.md](scenario-003.md) |
| Scenario-004 | Emma Clarke — Messy Shorthand & Grammar | [scenario-004.md](scenario-004.md) |
| Scenario-005 | Victoria Sterling — Heavy Critical Shift | [scenario-005.md](scenario-005.md) |
| Scenario-006 | Emma Roberts — Today vs Tomorrow | [scenario-006.md](scenario-006.md) |
| Scenario-007 | Olivia Bennett Room 33 — Room Moves & OOO | [scenario-007.md](scenario-007.md) |
| Scenario-008 | Laura Mitchell — Payments & Financial State | [scenario-008.md](scenario-008.md) |
| Scenario-009 | Amelia Foster — Repeat Guest Intelligence | [scenario-009.md](scenario-009.md) |
| Scenario-010 | Helen Morris — Maintenance Escalation | [scenario-010.md](scenario-010.md) |
| Scenario-011 | Sarah Mitchell — Latest Truth & Contradictions | [scenario-011.md](scenario-011.md) |
| Scenario-012 | Olivia Bennett Room 42 — Multi-Source Noise | [scenario-012.md](scenario-012.md) |
| Scenario-013 | Sophie Turner — Temporal / Midnight Reasoning | [scenario-013.md](scenario-013.md) |
| Scenario-014 | Charlotte Evans — Ownership & Routing | [scenario-014.md](scenario-014.md) |
| Scenario-015 | Amelia Stone — Final Operational State | [scenario-015.md](scenario-015.md) |
| Scenario-016 | James Wilson — Entity Resolution | [scenario-016.md](scenario-016.md) |
| Scenario-017 | Eleanor Grant — Urgency & Priority Ranking | [scenario-017.md](scenario-017.md) |
| Scenario-018 | Olivia Bennett Room 42 ETA 00:45 — Dependencies | [scenario-018.md](scenario-018.md) |
| Scenario-019 | Olivia Bennett Room 418 — Source of Truth | [scenario-019.md](scenario-019.md) |
| Scenario-020 | Daniel Morgan Room 214 — Handover From Hell | [scenario-020.md](scenario-020.md) |

For test status, evidence completeness, and failure tags, use [SCENARIO_INDEX.md](SCENARIO_INDEX.md).

## How to use

1. Read the hotel profile.
2. Follow [EVIDENCE_GUIDE.md](EVIDENCE_GUIDE.md).
3. Open the scenario under test.
4. Paste exact Original Input (or mark sections `left blank` / `[NOT RECORDED]`).
5. Write Expected Current Truth and Expected Important Actions.
6. Run Hospitality Flow against that input.
7. Record Actual HF Output, positives, failures, tags, risk, and Status in the same scenario file.
8. Update [SCENARIO_INDEX.md](SCENARIO_INDEX.md).

## Adding scenarios beyond 020

New scenarios should only be added. Do not revise or replace evidence-complete existing ones.

- Next after 020: `scenario-021.md`
- Use the same section structure as 001–020.

## Relationship to field testing

- [testing/field-testing/](../field-testing/) collects findings from real hotel operations.
- This folder holds fixed fictional scenarios for repeatable AI regression testing.

Both are valuable. They serve different purposes and should not be mixed.

## Intelligence Failure Map

Do not produce or update an intelligence Failure Map until enough scenarios are **evidence-complete** (input + expected current truth + actual output + observations). Recovered input/output alone is not sufficient.
