# Riverton Bloomsbury — Sprint 8 Baseline Failure Map

**Label:** RIVERTON SPRINT 8 BASELINE ASSESSMENT  
**Engine:** committed Sprint 8 on `main` (`73e7572a09e851d322a7a16a3f0542da93062f43`)  
**Authority:** Human Expected Truth in `../scenario-XXX.md` (not derived from HF)  
**Scope:** Baseline only — no engine fixes, no Sprint 9  

---

## Executive verdict

Sprint 8 does **not** generalise cleanly to Riverton’s 120-room stress suite.

| Verdict class | Count | Scenarios |
|---------------|------:|-----------|
| Clear pass (primary intent + must-not largely held) | **1** | 016 |
| Partial pass (some correct signal; material gaps/noise remain) | **6** | 005, 010, 011, 013, 014, 017 |
| Material failure | **13** | 001, 002, 003, 004, 006, 007, 008, 009, 012, 015, 018, 019, 020 |

Quiet-shift honesty, accessible/allocation scarcity, events/F&B deadlines, dual-horizon payment nuance, and adversarial entity separation are the weakest generalisation areas. Several failures match **known** Zetter/Pilot families (false collect, completed-as-open, amenity language traps). Several are **new Riverton generalisation gaps** (accessible inventory, events turnaround, allocation contradiction silence, F&B tea≠amenity, group taxi vs multi-week bags).

---

## Per-scenario results

| ID | Title | Verdict | Headline vs Human Expected Truth | Suspected root stage | Known vs new |
|----|-------|---------|----------------------------------|----------------------|--------------|
| 001 | Quiet Monday Continuity | **Material fail** | Reopens DONE pillows 119; false collect 214 (settled); LP/late-c/o noise as OPEN; no quiet honesty | state-resolution / payment-state / completed-as-open | **Known** |
| 002 | Snapshot & Stayovers Only | **Material fail** | Invents OPEN channel collect on prepaid **Wednesday** Pendleton | payment-state + temporal | **Known** + temporal misuse |
| 003 | Twin Setup — Right Room Only | **Material fail** | **Missing** twin OPEN for 314; false maintenance + prepaid collects; twin marked superseded wrongly | amenity extraction / canonical-actions + payment-state | **Known** payments; twin miss **serious / likely known amenity gap** |
| 004 | Accessible Inventory Is Finite | **Material fail** | Whitby allocation path largely absent; OOO 316 chased as open maint; invents luggage/wake noise | allocation / room-status + extraction noise | **New** accessible scarcity gap + known noise |
| 005 | Interconnecting Family Block | **Partial** | Twin 414 surfaced (but should be DONE); cot / interconnect-verify / theatre handoff missing; Crowe not merged | amenity completeness + completed-as-open | Cot/interconnect **new stress weak**; twin reopen known |
| 006 | OOO Corridor — Guest Impact | **Material fail** | Yuen reallocation missing; briefing “no urgent priorities” while 218 OOO; false collect 405 | allocation + decision-seating + payment-state | **New** OOO/allocation guest-impact; seating **known pattern** |
| 007 | On-Call Night Engineering | **Material fail** | 307 mitigated → OPEN P0 chase (should MONITOR); false £12 collect; cosmetic light OPEN | maintenance-severity + temporal + payment-state | **Known** |
| 008 | Meeting Room Turnaround + Arrivals | **Material fail** | MR-B 16:00 / dinner 18:00 **absent**; reopens DONE Albright fruit; invents “tomorrow interconnect” | events/F&B absent from action model + completed-as-open | **New** events generalisation fail |
| 009 | Parlour Tea & IRD Cutoff | **Material fail** | Converts parlour tea → OPEN **fruit** amenity; cutoff exception for 227 not seated as UNRESOLVED | extraction misclassification (F&B→amenity) | **New** F&B classification gap |
| 010 | Airport Transfer Cluster | **Partial** | 06:40 Heathrow OPEN good; false collect on Luton 210; Polk wake retained | timed-transport OK; payment-state / entity traps | Transport **partial success**; payment **known** |
| 011 | Corporate vs Leisure Same Surname | **Partial** | Amenities appear but weak/no **507** bind; false payment; Owen “no amenity” OK; taxi 06:10 weak | entity-resolution / room binding + payment | Surname stress **new+known**; payment known |
| 012 | Preferred Guest Card Language Trap | **Material fail** | Invents welcome card + fruit/flowers from “card on file” / negatives; champagne hard-OPEN | source-of-truth / amenity language | **Known** language-trap family |
| 013 | Anniversary Then Cancellation | **Partial** | Roses correctly absent; truffles+card OPEN; prosecco weak/missing; duplicate amenity lines | supersession OK for roses; amenity completeness / dedup | Supersession **partial known success** |
| 014 | Tokenisation Near vs Far | **Partial** | One MONITOR tokenise (good direction); false collects on green prepaid/company; 203 near-horizon not clearly privileged | payment-state + temporal dual-horizon | Dual-horizon **partial new**; false collect **known** |
| 015 | POA Is Not Collect | **Material fail** | **Misses Calder 228 £64.80**; false collect Pike/Blum; entity mix on resolved payment | payment-state + entity-resolution | **Known** payment family (severe miss) |
| 016 | Late Checkout After Midnight | **Clear pass** | Late c/o → **UNRESOLVED** (fail-closed); wake 508 + luggage 114 OPEN | temporal (Sprint 6) + seating | **Known capability working** as designed |
| 017 | Arrivals Labels Departing Guests | **Partial** | Twin 108 + towels 214 good; Mburu bags OPEN today (should be tomorrow/INFO); Ferreira not falsely OPEN | section vs in-line partial; temporal EA | Temporal luggage day **known-ish**; section handling partial |
| 018 | Checked-Out vs Arrival Conflict | **Material fail** | Quill/315 conflict **silently dropped**; “no urgent priorities”; no false £120 (good) | allocation / contradiction handling | **New** contradiction silence |
| 019 | Group Departure + Taxi Bundle | **Material fail** | Only weak generic luggage/St Pancras; missing clear **10:15 taxi** + HK cascade; multi-week bags not clearly INFORMATION | timed taxi / group logistics | **New** group-departure weakness |
| 020 | Adversarial Night Paste | **Material fail** | Lutz timed OK; Camille fruit despite cancel; Klein fruit invent on **rm 228**; HelioSpan 205 welcome amenities merge; DONE twin reopen; 203 token missing | entity-resolution + supersession + priority under noise | **New adversarial compound** on top of known families |

---

## Aggregate failure frequency by family

| Failure family | Scenarios hit (approx.) | Frequency |
|----------------|-------------------------|-----------|
| False OPEN payment / collect invent | 001, 002, 003, 007, 010, 011, 014, 015 | **Very high** |
| Completed / superseded treated as OPEN | 001, 005, 008, 020 | **High** |
| Missing required OPEN action | 003, 004, 005, 006, 008, 015, 018, 019, 020 | **Very high** |
| Amenity language / invent (card, fruit, flowers, tea→fruit) | 009, 012, 020 | **High** |
| Entity / room binding errors | 011, 015, 020 (Klein→228), 010 (Luton collect) | **High** |
| Temporal day / horizon errors | 002, 007, 014, 017 | **High** |
| Ranking / decision seating errors | 006, 007, 008, 018, 020 | **High** |
| MONITOR underused (OPEN instead) | 007, 014 (partial), 020 | **Medium** |
| UNRESOLVED correctly used | **016** (success); rare elsewhere | **Low success** |
| Duplication / noise | 005, 011, 013, 017, 020 | **Medium** |
| Quiet-shift / low-action honesty fail | 001, 002 | **Hard fail on design intent** |
| Events / F&B operational deadlines missing | 008, 009 | **New gap** |
| Allocation / OOO / accessible scarcity missing | 004, 006, 018 | **New gap** |
| Group taxi vs long-horizon luggage | 019 | **New gap** |

---

## Sprint 8 generalisation stress assessment

| Riverton stress area | Generalises? | Notes |
|----------------------|--------------|-------|
| 120-room scale / volume noise | **Weak** | More notes → more false OPEN payment/amenity noise; quiet honesty fails |
| Accessible scarcity | **No** | Whitby path not seated; inventory finiteness not reasoned |
| Interconnecting rooms | **Partial** | Interconnect sometimes mentioned; cot/door-verify weak; completed twin reopens |
| Events / F&B | **No** | MR-B/dinner deadline absent; parlour tea misread as room fruit |
| Allocation / OOO pressure | **No** | Yuen/Quill conflicts missing or silenced; soft eng ETA not cleanly MONITOR |
| Corporate vs leisure ambiguity | **Partial** | Some separation signals; amenity/payment merge risk remains |
| Dual-horizon tasks | **Partial** | Token MONITOR appears once; near vs far not reliably ranked; false collects dominate |
| Group departures | **Weak** | Taxi time not crisp; cascade HK missing |
| Multi-week luggage | **Weak / unclear** | Not cleanly INFORMATION-separated from taxi OPEN |
| Adversarial Night paste | **No** | Compound entity + supersession + invent failures |

---

## Suspected root-stage map (material failures)

| Stage | Material scenarios |
|-------|-------------------|
| Extraction / fact typing | 003, 008, 009, 012, 019 |
| Payment-state | 001, 002, 003, 007, 010, 011, 014, 015 |
| State-resolution / supersession / completed-as-open | 001, 005, 008, 013*, 020 |
| Entity-resolution / room binding | 011, 015, 020 |
| Temporal eligibility | 002, 007, 014, 017 |
| Allocation / room-status / OOO | 004, 006, 018 |
| Canonical action completeness | 003, 004, 005, 008, 015, 019 |
| Priority / decision seating | 006, 007, 008, 018, 020 |
| MONITOR / UNRESOLVED seating | 007 (fail), 016 (pass), 014 (partial) |

\*013 roses supersession succeeded; prosecco completeness lagged.

---

## Known limitation vs new generalisation failure

### Mostly existing known limitations (Zetter/Pilot families)
- False channel/POA/prepaid **collect**
- Completed amenities reopened
- “Card on file” → welcome card / invent fruit-flowers
- Mitigated maintenance overnight → P0 OPEN instead of MONITOR
- Payment noise dominating briefing

### Genuinely new or newly stressed generalisation failures
- **Accessible inventory scarcity** not reasoned (004)
- **Events turnaround deadlines** invisible to action model (008)
- **F&B parlour/tea vs room amenity** misclassification (009)
- **Allocation contradiction silence** (018) and OOO guest reallocation miss (006)
- **Group shared taxi vs multi-week bag hold** (019)
- **Adversarial compound** surname + cancel + wrong-room amenity invent (020, Klein→228)
- **Quiet 120-room soft house** still fabricates work (001–002) at Riverton scale

---

## Clear / partial / material detail notes

### Clear pass
- **016** — Primary ambiguity handled as `unresolved` late checkout; timed wake/luggage retained; must-not (no forced OPEN c/o day invent) held.

### Partial passes (signal present, not reliable)
- **005** — Twin/interconnect awareness without cot completeness; completed twin still OPEN.
- **010** — Airport timed action present; Luton payment false positive.
- **011** — Amenity intent without safe room-scoped non-merge.
- **013** — Cancelled roses respected; package incomplete/noisy.
- **014** — MONITOR tokenise exists; false collects and weak near-horizon privilege.
- **017** — Twin/towels correct; tomorrow bags promoted to today OPEN.

### Material failures
- All remaining IDs in the table above — either missing the scenario’s core OPEN work, violating must-not-infer, or both.

---

## Artefacts

| File | Role |
|------|------|
| `scenario-XXX-baseline.json` / `.md` | Frozen engine output + copied expected truth |
| `RIVERTON_BASELINE_SUMMARY.json` | Machine summary counts |
| `run-riverton-baseline-validation.mjs` | Harness (no engine changes) |
| This file | Human aggregate assessment |

**Do not** treat this map as an engine fix list until human review approves next steps. No Sprint 9 started.
