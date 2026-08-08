# Testing Guide — Meridian Gate Unseen Generalisation

> **Fictional corpus.** Hotel, guests, and operational data are invented. This guide defines how the future 20 scenarios will be authored, frozen, run, and scored — **without** defining scenario content yet.

## Goal

Test whether current Hospitality Flow reasoning generalises to a hotel operating model that is meaningfully different from Zetter, Pilot, and Riverton — without further tuning on Riverton 001–020.

## Integrity sequence (locked)

1. **Phase A:** hotel profile + methodology scaffold — done  
2. **Phase B (done):** 20 Original Inputs + Human Expected Truth authored → **FROZEN BEFORE FIRST HF RUN** (see `FREEZE_MANIFEST.json`)  
3. **Phase C (next):** run **current engine unchanged**; record commit SHA; **freeze first-run outputs**  
4. **Phase D:** score **all 20** (Clear / Partial / Material) before any Sprint 12 work  
5. **Phase E (optional):** Sprint 12 only after scoring — use Meridian failures as evidence; **do not polish Riverton** for generalisation measurement  

## Freeze rules

1. Riverton 001–020 remain **frozen regression** — do not use to tune further for this test  
2. Meridian Human Expected Truth + Original Input freeze **before** first HF run  
3. First-run outputs freeze under a dedicated baseline folder (created later — not in Phase A)  
4. Document engine commit SHA at first run  
5. Score all 20 before any Sprint 12 fix  
6. No post-hoc HET edits after first-run freeze  
7. No live guest data; no Supabase requirement for Phases A–D  
8. Do not inspect or redesign scenarios around known regexes or Sprint 1–11 function names  

## Authoring anti-patterns

- Do not clone Riverton / Pilot / Zetter plots with renamed rooms  
- Do not design scenarios to hit specific engine helpers  
- Do not invent “correct” alternate rooms in HET when the hotel truth says clarify / unresolved  
- Do not treat spa treatment rooms, shuttle bays, or valet tickets as sellable guest rooms  

## Methodology mix (future 20 — planning only)

| Band | Target count | Intent |
|------|-------------:|--------|
| Easy / quiet controls | 3–4 | Quiet shift, completed work, INFORMATION-heavy |
| Normal AM / PM / Night | 6–7 | Typical Meridian Gate operations |
| Busy | 4–5 | Shuttle + spa + crew + annex pressure |
| Adversarial | 3–4 | Contradictions, stale boards, competing noise |

## Capability coverage (distribute across 20)

Future scenarios must collectively exercise:

- Correct **OPEN**
- Correct **MONITOR**
- Correct **INFORMATION**
- Correct **UNRESOLVED**
- Superseded / completed work
- Genuine payment work
- Genuine safety / maintenance work
- Multi-department dependencies
- Unfamiliar Meridian-native situations (e.g. annex vs Main, spa day guest, shuttle, crew block, valet, pavilion) — chosen at authoring time

Exact assignment of which slot covers which capability lives in `SCENARIO_INDEX.md` as **planning labels only** until Phase B.

## Scoring rubric (same family as Riverton)

| Band | Meaning |
|------|---------|
| Clear | Aligns with Human Expected Truth on material work states; no critical invent |
| Partial | Directionally useful; misses or soft-misses material OPEN/MONITOR/clarify |
| Material | Silent on conflict, invents resolution/room, false collect, or wrong state class |

Score **blind to Sprint 12**. Do not redesign scenarios after first-run freeze.

## Local-only preference

Use local engine validation pipelines (mirror Riverton pattern). A live Supabase workspace is **not** required and must **not** be created for Phase A.

## Out of scope for Phase A

- Scenario files / Human Expected Truth bodies  
- Baseline or sprint validation artefacts  
- Engine changes  
- Database rows  
- Sprint 12  
- Modifications to Riverton, Pilot, or Zetter folders  
