# Phase 16B — Thin Shared Intelligence Foundation

Runtime-only foundation. No shared fact table. No M4 wiring. No migration changes.

## Neutral operational fact (runtime)

Optional fields; adapters populate what they have:

- `id`, `sourceType`, `sourceId`, `workspaceId`
- `subjectType`, `subjectId`, `room`, `area`, `guest`, `department`, `category`
- `action`, `detail`, `status`, `priority`, `occurredAt`, `dueAt`
- `isResolved`, `includeInHandover`, `confidence`, `sourceText`, `metadata`

Neutral `priority`: `urgent | high | medium | low` (`normal` maps to `medium`; recommendation ranking maps `medium` → `normal`).

## Public API (preserved + additive)

`ShiftIntelligenceEngine.analyze` — unchanged callers; adapts Handover notes internally.  
`ShiftIntelligenceEngine.analyzeFacts` — neutral facts + brain context.  
Adapters/helpers exported for tests and future M4 (not wired into Handover UI).

`HotelProfileOperational.buildHotelBrainContext(profile)` — extracted context builder; Handover delegates when available.
