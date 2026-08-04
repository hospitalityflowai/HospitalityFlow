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

## Adding new scenarios

New scenarios should only be added. Do not revise or replace existing ones.

- Next scenario: `scenario-006.md`
- Then: `scenario-007.md`, and so on

Each new file should follow the same template used in Scenarios 001–005.

## Hotel profile

All scenarios assume the hotel defined in [hotel-profile.md](hotel-profile.md), unless a scenario explicitly states otherwise.

## Scenario index

| ID | Name | File |
|----|------|------|
| Scenario-001 | Quiet Night | [scenario-001.md](scenario-001.md) |
| Scenario-002 | Busy Arrivals | [scenario-002.md](scenario-002.md) |
| Scenario-003 | VIP Guests & Payments | [scenario-003.md](scenario-003.md) |
| Scenario-004 | Maintenance Heavy Shift | [scenario-004.md](scenario-004.md) |
| Scenario-005 | Groups & Late Check-ins | [scenario-005.md](scenario-005.md) |

## How to use

1. Read the hotel profile.
2. Open the scenario under test.
3. Paste or load the original messy handover when it has been filled in.
4. Run Hospitality Flow against that input.
5. Record AI output, field notes, bugs, and improvements in the scenario file.
6. Mark status: Pass, Needs Improvement, or Failed.

## Relationship to field testing

- [testing/field-testing/](../field-testing/) collects findings from real hotel operations.
- This folder holds fixed fictional scenarios for repeatable AI regression testing.

Both are valuable. They serve different purposes and should not be mixed.
