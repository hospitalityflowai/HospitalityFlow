# The Zetter Marylebone – Shift Index

Coverage tracker for the five real field-testing handovers recovered from Supabase.

**Evidence Complete?** requires all of: original input, expected current truth, actual output/result, and observations (tester review).

Historical input/output recovered from [exports/zetter-real-shifts-001-005.csv](exports/zetter-real-shifts-001-005.csv).

| Shift | Handover date | created_at | Anchor | Historical Evidence Recovered? | Tester Reviewed? | Evidence Complete? | Status | Operational Risk | Main Failure Tags |
|-------|---------------|------------|--------|--------------------------------|------------------|--------------------|--------|------------------|-------------------|
| [001](shift-001.md) | 2026-08-04 | 2026-08-04 06:02:36.430469+00 | Jacqui Polk / Peter Polk (rm 51 / 43) | Yes | Yes | Yes | FAIL | High | CURRENT_STATE, TEMPORAL, PRIORITY_SEVERITY, ENTITY_BINDING, PAYMENT_STATE |
| [002](shift-002.md) | 2026-08-04 | 2026-08-05 00:20:51.90694+00 | Mona Alabood rm 22 / Room 51 Polk | Yes | Yes | Yes | FAIL | High | PRIORITY_SEVERITY, PAYMENT_STATE, ENTITY_BINDING, TEMPORAL, CURRENT_STATE, EXTRACTION, DUPLICATION, NON_ACTIONABLE_RECOMMENDATION, COMPRESSION_NOISE, ROOM_STATE |
| [003](shift-003.md) | 2026-08-05 | 2026-08-06 05:37:12.25793+00 | Josh Piercey-Fisher rm 51 / Hayden Landry VIPs | Yes | Yes | Yes | FAIL | High | ENTITY_BINDING, TEMPORAL, CURRENT_STATE, PRIORITY_SEVERITY, EXTRACTION, DUPLICATION, NON_ACTIONABLE_RECOMMENDATION, COMPRESSION_NOISE |
| [004](shift-004.md) | 2026-08-07 | 2026-08-07 05:14:01.372172+00 | Jihyun An / Phoebe Barnard Fukutomi | Yes | Yes | Yes | FAIL | High | PAYMENT_STATE, PRIORITY_SEVERITY, TEMPORAL, CURRENT_STATE, ENTITY_BINDING, EXTRACTION, DUPLICATION, NON_ACTIONABLE_RECOMMENDATION, COMPRESSION_NOISE |
| [005](shift-005.md) | 2026-08-07 | 2026-08-08 05:29:27.025884+00 | Laura Godfrey rm 25 / Benjamin James rm 51 | Yes | Yes | Yes | FAIL | High | PRIORITY_SEVERITY, CURRENT_STATE, ENTITY_BINDING, EXTRACTION, TEMPORAL, OTHER |

## Column guide

| Column | Meaning |
|--------|---------|
| Handover date | `handover_date` from saved record |
| created_at | Save timestamp (mapping order) |
| Anchor | Short identifying guest / operational marker |
| Historical Evidence Recovered? | Input + historical HF output present in shift file |
| Tester Reviewed? | Expected truth + observations completed |
| Evidence Complete? | Recovered evidence **and** tester review |
| Status | Review status |
| Operational Risk | Risk if staff relied on historical HF output |
| Main Failure Tags | Filled only after tester observation review |

## Summary

| Metric | Count |
|--------|------:|
| Shifts on disk (001–005) | 5 |
| Historical input/output recovered | 5 |
| Tester-reviewed | 5 |
| Evidence-complete | 5 |
| FAIL (reviewed) | 5 |
| Not yet reviewed | 0 |

## Record id map

| Shift | Record id | created_at | handover_date |
|-------|-----------|------------|---------------|
| 001 | `50c5f88f-56a8-4c04-9080-cccdc5340be6` | 2026-08-04 06:02:36.430469+00 | 2026-08-04 |
| 002 | `89a40e9f-594b-4287-8fa5-8bae551c841c` | 2026-08-05 00:20:51.90694+00 | 2026-08-04 |
| 003 | `b2217d2d-2fe7-4a67-aec4-c4bda98fb1d9` | 2026-08-06 05:37:12.25793+00 | 2026-08-05 |
| 004 | `7a6c925c-7beb-439f-b579-ff9839a66f83` | 2026-08-07 05:14:01.372172+00 | 2026-08-07 |
| 005 | `ffff255d-75a9-4842-8272-75116dfeff56` | 2026-08-08 05:29:27.025884+00 | 2026-08-07 |

## Notes

- Mapping is chronological by `created_at` (oldest → Shift 001 … newest → Shift 005).
- Saved HF output is **historical evidence** and must not be confused with current post-Sprint-4 behaviour.
- Failure tags and risk are filled after manual tester review (001–005 complete).
- `OTHER` on Shift 005 = Missing actionable recommendations despite genuine open operational work.
- Real Shift Failure Map not created yet.
