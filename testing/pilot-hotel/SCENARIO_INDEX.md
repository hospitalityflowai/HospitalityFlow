# Pilot Hotel – Scenario Index

Coverage tracker for scenarios 001–020. Updated after recovering Supabase saved-handover evidence into each scenario file and completing tester review for all 20.

**Evidence Complete?** requires all of: original input, expected current truth, actual output/result, and observations. See [EVIDENCE_GUIDE.md](EVIDENCE_GUIDE.md).

Recovered input/output from CSV export: [exports/pilot-hotel-scenarios-001-020.csv](exports/pilot-hotel-scenarios-001-020.csv).

Intelligence analysis: [../intelligence-review/HF_INTELLIGENCE_FAILURE_MAP_V1.md](../intelligence-review/HF_INTELLIGENCE_FAILURE_MAP_V1.md).

| Scenario | Focus | Tested? | Evidence Complete? | Status | Main Failure Tags |
|----------|-------|---------|--------------------|--------|-------------------|
| [001](scenario-001.md) | Amelia Hart — First Busy Stress Test | Yes | Yes | Failed | hotel-snapshot, extraction, presentation, deduplication, state-resolution, payment-state, prioritisation, recommendation-quality, guest-preference |
| [002](scenario-002.md) | Oliver Grant — Updates & Corrections | Yes | Yes | Failed | source-of-truth, state-resolution, completed-as-open, payment-state, room-status, deduplication, prioritisation, recommendation-quality, hotel-snapshot, presentation |
| [003](scenario-003.md) | James Martin / James Martins — Naming Variants | Yes | Yes | Failed | entity-resolution, temporal, state-resolution, source-of-truth, payment-state, room-status, prioritisation, recommendation-quality, presentation, hotel-snapshot |
| [004](scenario-004.md) | Emma Clarke — Messy Shorthand & Grammar | Yes | Yes | Failed | extraction, temporal, hotel-snapshot, state-resolution, completed-as-open, guest-preference, presentation, prioritisation, recommendation-quality, deduplication |
| [005](scenario-005.md) | Victoria Sterling — Heavy Critical Shift | Yes | Yes | Failed | prioritisation, maintenance-severity, source-of-truth, state-resolution, completed-as-open, temporal, payment-state, room-status, compression, recommendation-quality, hotel-snapshot, deduplication, presentation |
| [006](scenario-006.md) | Emma Roberts — Today vs Tomorrow | Yes | Yes | Failed | temporal, source-of-truth, state-resolution, completed-as-open, payment-state, prioritisation, recommendation-quality, presentation, deduplication |
| [007](scenario-007.md) | Olivia Bennett Room 33 — Room Moves & OOO | Yes | Yes | Failed | room-status, source-of-truth, hotel-intelligence, state-resolution, prioritisation, compression, hotel-snapshot, recommendation-quality, presentation, deduplication |
| [008](scenario-008.md) | Laura Mitchell — Payments & Financial State | Yes | Yes | Failed | payment-state, source-of-truth, state-resolution, recommendation-quality, prioritisation, compression, presentation, deduplication, hotel-intelligence |
| [009](scenario-009.md) | Amelia Foster — Repeat Guest Intelligence | Yes | Yes | Failed | hotel-intelligence, guest-preference, source-of-truth, state-resolution, completed-as-open, prioritisation, compression, recommendation-quality, presentation, deduplication |
| [010](scenario-010.md) | Helen Morris — Maintenance Escalation | Yes | Yes | Failed | maintenance-severity, prioritisation, state-resolution, source-of-truth, room-status, completed-as-open, payment-state, compression, recommendation-quality, hotel-snapshot, deduplication, presentation |
| [011](scenario-011.md) | Sarah Mitchell — Latest Truth & Contradictions | Yes | Yes | Failed | source-of-truth, state-resolution, completed-as-open, payment-state, room-status, prioritisation, recommendation-quality, compression, deduplication, presentation |
| [012](scenario-012.md) | Olivia Bennett Room 42 — Multi-Source Noise | Yes | Yes | Failed | source-of-truth, multi-source-conflict, state-resolution, payment-state, completed-as-open, deduplication, compression, prioritisation, recommendation-quality, room-status, presentation |
| [013](scenario-013.md) | Sophie Turner — Temporal / Midnight Reasoning | Yes | Yes | Failed | temporal, source-of-truth, hotel-intelligence, state-resolution, prioritisation, recommendation-quality, compression, presentation, payment-state |
| [014](scenario-014.md) | Charlotte Evans — Ownership & Routing | Yes | Yes | Failed | ownership-routing, source-of-truth, state-resolution, completed-as-open, payment-state, prioritisation, recommendation-quality, presentation, compression, hotel-snapshot |
| [015](scenario-015.md) | Amelia Stone — Final Operational State | Yes | Yes | Failed | source-of-truth, state-resolution, payment-state, completed-as-open, room-status, prioritisation, recommendation-quality, compression, hotel-snapshot, deduplication, presentation |
| [016](scenario-016.md) | James Wilson — Entity Resolution | Yes | Yes | Failed | entity-resolution, ambiguous-entity, source-of-truth, state-resolution, payment-state, completed-as-open, prioritisation, recommendation-quality, compression, presentation |
| [017](scenario-017.md) | Eleanor Grant — Urgency & Priority Ranking | Yes | Yes | Failed | urgency-ranking, prioritisation, maintenance-severity, recommendation-quality, compression, payment-state, completed-as-open, presentation, source-of-truth |
| [018](scenario-018.md) | Olivia Bennett Room 42 ETA 00:45 — Dependencies | Yes | Yes | Failed | dependency-sequencing, ownership-routing, source-of-truth, state-resolution, payment-state, prioritisation, recommendation-quality, compression, presentation |
| [019](scenario-019.md) | Olivia Bennett Room 418 — Source of Truth | Yes | Yes | Failed | source-of-truth, state-resolution, payment-state, completed-as-open, room-status, prioritisation, recommendation-quality, guest-preference, hotel-snapshot, presentation |
| [020](scenario-020.md) | Daniel Morgan Room 214 — Handover From Hell | Yes | Yes | Failed | entity-resolution, source-of-truth, room-status, payment-state, state-resolution, temporal, prioritisation, recommendation-quality, compression, hotel-snapshot, completed-as-open |

## Column guide

| Column | Meaning |
|--------|---------|
| Focus | Short scenario theme (from recovered evidence) |
| Tested? | `Yes` when a historical run is recorded in the scenario file |
| Evidence Complete? | `Yes` only when input + expected truth + actual output + observations are all recorded |
| Status | Review status for intelligence analysis |
| Main Failure Tags | Filled after tester observation review |

## Summary

| Metric | Count |
|--------|------:|
| Scenarios on disk (001–020) | 20 |
| Historical input/output recovered | 20 |
| Tester-reviewed (001–020) | 20 |
| Evidence-complete | 20 |
| Failed (reviewed) | 20 |
| Pass / Needs Improvement | 0 |

## Record id map

| Scenario | Record id | created_at |
|----------|-----------|------------|
| 001 | `02890232-dbf4-4702-b55b-583803b9dd16` | 2026-08-07 17:37:59.589525+00 |
| 002 | `43f62bbb-df8b-4396-abd4-46e02e8e61d1` | 2026-08-07 17:42:46.724918+00 |
| 003 | `72de81d7-39fd-499c-8eac-0785cc5fb7a7` | 2026-08-07 17:43:13.164632+00 |
| 004 | `6307a80e-592b-442c-88be-b0fd6989bef3` | 2026-08-07 17:45:34.576839+00 |
| 005 | `72b20fc7-3722-4356-8cb1-dab436506c98` | 2026-08-07 17:49:20.720757+00 |
| 006 | `4e8d5e69-1c23-4d89-a0cf-7e58bc737919` | 2026-08-07 17:53:06.364795+00 |
| 007 | `4efc2695-7c92-4913-8e0b-8d60383d8b6b` | 2026-08-07 17:53:26.628005+00 |
| 008 | `d7d54c99-adb8-4507-bdad-8dc7e658d28b` | 2026-08-07 17:55:03.299374+00 |
| 009 | `46542d41-ee66-44e5-a3a7-66df4adcdab5` | 2026-08-07 17:57:00.917471+00 |
| 010 | `9fc00e20-bc06-4b66-85df-09d71c49f0b0` | 2026-08-07 17:58:58.429646+00 |
| 011 | `c349344c-dcea-46d1-a56a-d86b48250f77` | 2026-08-07 18:00:57.573476+00 |
| 012 | `0238aa89-bf43-461c-b81b-338c23502b24` | 2026-08-07 18:02:22.363627+00 |
| 013 | `169e9730-f9a9-44ed-89ed-42d08a335b21` | 2026-08-07 18:03:45.651959+00 |
| 014 | `ce7fdbfa-b1da-4653-9747-62b43f8c9667` | 2026-08-07 18:05:33.56458+00 |
| 015 | `c6174a63-cc41-486c-97bd-8ee7a0aabd63` | 2026-08-07 18:08:28.76588+00 |
| 016 | `60aee49e-6870-46d9-8064-62eba8e3f6e2` | 2026-08-07 18:09:50.66408+00 |
| 017 | `082f2bf2-02b1-409a-8bba-2d17fe0dd2a5` | 2026-08-07 18:10:28.283116+00 |
| 018 | `828f3477-e500-44da-811c-1f8aab2048fa` | 2026-08-07 18:13:25.141516+00 |
| 019 | `762f4b00-f83a-49fc-8544-a81187ddcb15` | 2026-08-07 18:13:58.195238+00 |
| 020 | `66ed6760-81b4-40fb-a277-71451074a6dd` | 2026-08-07 18:20:17.707385+00 |
