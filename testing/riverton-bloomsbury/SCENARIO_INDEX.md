# The Riverton Bloomsbury – Scenario Index

Coverage tracker for scenarios 001–020.

**Phase:** Scenario files authored. Matrix below is the **frozen test specification**. Human Expected Truth inside each `scenario-XXX.md` is the benchmark authority. HF has **not** been run yet.

**Fictional property:** The Riverton Bloomsbury and all guests/data in this suite are fictional. See [hotel-profile.md](hotel-profile.md).

**Evidence Complete?** requires all of: original input, expected current truth, actual output/result, and observations. See [EVIDENCE_GUIDE.md](EVIDENCE_GUIDE.md).

---

## Frozen generalisation matrix (test specification)

Design goals: generalise beyond Zetter 001–005 and Pilot Hotel patterns; mix quiet and high-volume 120-room operations; include correct non-action states (MONITOR / INFORMATION / UNRESOLVED); avoid overfitting to known Sprint 1–8 implementation shapes.

| ID | Title | Shift | Load | Departments | Main operational situation | Intelligence capability tested | Difficulty | Ambiguity intentional? | HF must not invent / incorrectly infer | File | Authored | HF run | Evidence complete |
|----|-------|-------|------|-------------|----------------------------|--------------------------------|------------|------------------------|----------------------------------------|------|----------|--------|-------------------|
| 001 | Quiet Monday Continuity | AM | Quiet | Reception, Housekeeping | Low occupancy morning; few stayovers; minor completed notes only | Quiet-shift recognition; avoid fabricating work | Basic | No | Invented VIP prep, false collects, fake maintenance, or “busy house” urgency | [scenario-001.md](scenario-001.md) | Yes / frozen | No | No |
| 002 | Snapshot & Stayovers Only | AM | Quiet | Reception | Snapshot-heavy paste with stayovers and prepaid future arrivals; almost no open tasks | Snapshot vs actionable work; future arrival not tonight | Basic | Partial (future arrival timing clear enough) | Treating prepaid future arrivals as today’s check-ins; inventing payment chases from snapshot KPIs | [scenario-002.md](scenario-002.md) | Yes / frozen | No | No |
| 003 | Twin Setup — Right Room Only | PM | Normal | Reception, Housekeeping | Two-room party; twin requested for one room only; other must stay double | Room-scoped amenity / setup binding | Moderate | No | Twinned both rooms; ignored stated “only room X”; invented loft/welcome card | [scenario-003.md](scenario-003.md) | Yes / frozen | No | No |
| 004 | Accessible Inventory Is Finite | PM | Normal | Reception, Concierge | Accessible-room request vs limited accessible stock; alternative offered in notes | Scarce inventory / allocation advice without inventing availability | Moderate | Yes (whether alternative is confirmed) | Inventing an accessible room that is free; auto-resolving allocation; false “room ready” | [scenario-004.md](scenario-004.md) | Yes / frozen | No | No |
| 005 | Interconnecting Family Block | PM | Busy | Reception, Housekeeping, Concierge | Family needs interconnecting pair + cot; one room already set twin | Multi-room binding; interconnect + amenity coexistence | Moderate | No | Binding cot/twin to wrong room; merging with unrelated VIP on same floor | [scenario-005.md](scenario-005.md) | Yes / frozen | No | No |
| 006 | OOO Corridor — Guest Impact vs Housekeeping | AM | Busy | Engineering, Housekeeping, Reception, Duty Manager | Two OOO rooms; one blocks a due-out/due-in flip; HK waiting on release | Current room state; sequencing without false “ready now” | Hard | Partial (release time soft) | Declaring rooms sellable while OOO; inventing engineer ETA; closing OOO from weak wording | [scenario-006.md](scenario-006.md) | Yes / frozen | No | No |
| 007 | On-Call Night Engineering | Night | Normal | Engineering, Night Manager, Reception | Smell/noise reported; DM/Night attended; engineering on-call tomorrow AM | Temporal: tonight continuity vs tomorrow inspect (MONITOR vs OPEN chase) | Moderate | No | Immediate danger chase after mitigation; inventing gas leak confirmation; collecting payment on side notes | [scenario-007.md](scenario-007.md) | Yes / frozen | No | No |
| 008 | Meeting Room Turnaround + Arrivals Peak | PM | Very busy | Events, F&B, Reception, Housekeeping | Meeting Room B ends 16:00; dinner setup 18:00; arrivals peak overlaps | Cross-department priority; events vs rooms competition | Hard | No | Ignoring event deadline; inventing banquet BEOs; treating meeting room as guest bedroom work | [scenario-008.md](scenario-008.md) | Yes / frozen | No | No |
| 009 | Parlour Afternoon Tea & Room Service Cutoff | PM | Normal | F&B, Reception | Tea booking + late room-service request past published cutoff | F&B operational commitments; cutoff fail-closed | Moderate | Yes (whether exception was granted) | Inventing exception approval; converting tea into VIP amenity package for wrong guest | [scenario-009.md](scenario-009.md) | Yes / frozen | No | No |
| 010 | Airport Transfer Cluster — Contacts Only | Night | Busy | Concierge, Reception, Night Manager | Fragmented pickup lines (airport, time, phones/names); no room evidenced | Timed transport clustering; contact binding without inventing room | Hard | Yes (party vs named contacts) | Inventing a room number; binding pickup to unrelated in-house Polk-style guest; false OPEN if day unclear | [scenario-010.md](scenario-010.md) | Yes / frozen | No | No |
| 011 | Corporate Block vs Leisure VIP Same Surname | PM | Busy | Reception, Concierge, Housekeeping | Two parties share surname; one corporate block, one leisure VIP amenity list | Entity separation; amenity non-merge | Hard | Yes (same surname) | Merging amenities across parties; one payment chase for both; collapsing to one entity | [scenario-011.md](scenario-011.md) | Yes / frozen | No | No |
| 012 | Preferred Guest Card Language Trap | PM | Normal | Reception, Housekeeping | “Card on file guarantee” + “comp upgrade to balance availability” + optional champagne if available | Source fidelity; payment vs inventory language; amenity fail-closed | Moderate | Partial | Welcome card from “card on file”; loft from generic upgrade; inventing fruit/flowers not listed | [scenario-012.md](scenario-012.md) | Yes / frozen | No | No |
| 013 | Anniversary Package Then Cancellation | AM | Normal | Housekeeping, Reception | Amenity list requested then partially cancelled / superseded later in notes | Supersession; remaining active amenities only | Moderate | No | Preparing cancelled items; dropping still-active sibling amenity; inventing replacement package | [scenario-013.md](scenario-013.md) | Yes / frozen | No | No |
| 014 | Tokenisation Near Departure vs Far Departure | Night | Busy | Reception, Finance/Night | One room checkout tomorrow AM untokenised; another departs in 5 days untokenised; PDQ mention on one only | Temporal payment eligibility; MONITOR vs OPEN; no false collect | Hard | Yes (PDQ dependency clarity) | Collect outstanding invent; forcing both OPEN; ignoring nearer departure risk | [scenario-014.md](scenario-014.md) | Yes / frozen | No | No |
| 015 | POA Is Not Collect — Unless Evidence Says So | AM | Normal | Reception | Several POA / prepaid / company-billed lines; one genuine outstanding with amount | Payment-state discrimination | Moderate | No | Collect on POA/prepaid/company-paid; inventing channel/OTA payment wording | [scenario-015.md](scenario-015.md) | Yes / frozen | No | No |
| 016 | Late Checkout After Midnight Crossing | Night | Busy | Reception, Night Manager, Housekeeping | “Late c/o today @12” saved after midnight; rooms listed | Ambiguous operational day → UNRESOLVED / fail-closed | Hard | **Yes (primary)** | Forcing OPEN honour; inventing which calendar day; marking completed without evidence | [scenario-016.md](scenario-016.md) | Yes / frozen | No | No |
| 017 | Arrivals Section Labels Departing Guests | PM | Busy | Reception, Housekeeping | Structured “Arrivals” header contains guests marked departing + EA/luggage notes | Section label vs in-line truth; near vs future luggage split | Hard | Yes (which day EA applies) | Treating all section rows as arrivals; inventing in-house status; OPEN future luggage hold | [scenario-017.md](scenario-017.md) | Yes / frozen | No | No |
| 018 | Checked-Out Room vs Listed Arrival Conflict | AM | Very busy | Reception, Duty Manager, Housekeeping | Arrival assigned to a room also listed checked out / conflicting occupancy | Contradiction → clarify; do not invent resolution | Hard | **Yes (primary)** | Inventing the “correct” room; silently dropping conflict; false collect or VIP prep from conflict noise | [scenario-018.md](scenario-018.md) | Yes / frozen | No | No |
| 019 | Group Departure Cascade + Taxi Bundle | AM | Very busy | Concierge, Reception, Housekeeping, F&B | Small group multi-room checkout; shared taxi; bags hold multi-week for subset | Multi-room party; timed taxi vs long-horizon bags (INFORMATION) | Hard | Partial | Merging bag hold into taxi OPEN; inventing missing room in party; wrong owner department as only signal | [scenario-019.md](scenario-019.md) | Yes / frozen | No | No |
| 020 | Adversarial Paste — Everything Competing | Night | Very busy | All key departments | Dense paste: VIP amenities, OOO, payment fragments, transfer scraps, event leftover, same-surname pair, superseded line, quiet quote | Priority ranking under noise; fail-closed; non-merge; non-invention | Adversarial | **Yes (multiple)** | Quiet-shift claim; merging entities; inventing amenities/rooms/payments; promoting MONITOR/UNRESOLVED to do-now; letting soft follow-ups displace real P0/P1 | [scenario-020.md](scenario-020.md) | Yes / frozen | No | No |

---

## Matrix distribution (frozen)

### By difficulty

| Difficulty | Scenarios | Count |
|------------|-----------|------:|
| Basic | 001, 002 | 2 |
| Moderate | 003, 004, 005, 007, 009, 012, 013, 015 | 8 |
| Hard | 006, 008, 010, 011, 014, 016, 017, 018, 019 | 9 |
| Adversarial | 020 | 1 |

### By shift

| Shift | Scenarios | Count |
|-------|-----------|------:|
| AM | 001, 002, 006, 013, 015, 018, 019 | 7 |
| PM | 003, 004, 005, 008, 009, 011, 012, 017 | 8 |
| Night | 007, 010, 014, 016, 020 | 5 |

### By operational load

| Load | Scenarios | Count |
|------|-----------|------:|
| Quiet | 001, 002 | 2 |
| Normal | 003, 004, 007, 009, 012, 013, 015 | 7 |
| Busy | 005, 006, 010, 011, 014, 016, 017 | 7 |
| Very busy | 008, 018, 019, 020 | 4 |

### By major intelligence capability (primary focus)

| Capability | Scenarios |
|------------|-----------|
| Quiet / low-action honesty | 001, 002 |
| Room-scoped setup / inventory | 003, 004, 005 |
| OOO / engineering temporal state | 006, 007 |
| Events / F&B operations | 008, 009 |
| Timed transport + contact binding | 010 |
| Entity separation / surnames | 011, 020 |
| Amenity fidelity + supersession | 012, 013 |
| Payment / tokenisation semantics | 014, 015 |
| Temporal day ambiguity | 016, 017 |
| Occupancy / allocation contradiction | 018 |
| Multi-room party + horizon split | 019 |
| Priority under adversarial noise | 020 |

### Intentional non-OPEN outcomes (design targets)

Scenarios deliberately including correct **MONITOR**, **INFORMATION**, and/or **UNRESOLVED** behaviour (not everything should become do-now): **007, 010, 014, 016, 017, 018, 019, 020** (and quiet **001–002** as “little/no OPEN work”).

### Novelty vs Zetter five-shift benchmark

Not a replay of Zetter 001–005. Novel or under-represented combinations include: quiet shifts (001–002), accessible scarcity (004), interconnect family block (005), events turnaround (008), parlour/tea cutoff (009), same-surname corporate vs leisure (011), dual-horizon tokenisation (014), structured-section vs departing truth at scale (017), group departure + multi-week bags (019), and a Riverton-scale adversarial night paste (020).

---

## Status summary

| Metric | Count |
|--------|------:|
| Scenario IDs (001–020) | 20 |
| Matrix frozen | Yes |
| Scenario files on disk (`scenario-XXX.md`) | 20 |
| Source notes authored | 20 |
| Human Expected Truth authored | 20 |
| HF runs recorded | 0 |
| Evidence-complete | 0 |

## Column guide (evidence phase)

| Column | Meaning |
|--------|---------|
| Authored | Scenario file + raw notes + Human Expected Truth present |
| HF run | Actual HF output recorded for a run |
| Evidence complete | Input + expected truth + actual output + observations all present |
| Status (future) | Pass / Needs Improvement / Failed after review |

## Isolation notes

- Matrix and scenario Human Expected Truth are frozen for human review before any HF run.
- Do not modify Pilot Hotel or Zetter evidence from Riverton work.
- Do not tune intelligence code to these scenarios before first controlled runs are approved.
- Do not derive Human Expected Truth from HF output.
