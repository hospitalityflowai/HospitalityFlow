# Scenario Index — Meridian Gate (Phase B)

> **Fictional.** Hotel, guests, and operational data are invented.  
> **Phase B:** 20 scenarios authored. **Original Input + Human Expected Truth are FROZEN BEFORE FIRST HF RUN.**  
> Integrity hashes: `FREEZE_MANIFEST.json`

Hotel: **The Meridian Gate Hotel & Spa** (56 rooms; Main House + Courtyard Annex; airport-adjacent).  
Profile authority: `hotel-profile.md` · Process: `TESTING_GUIDE.md`

## Freeze banner

| Item | Status |
|------|--------|
| Original Input (all 001–020) | **FROZEN BEFORE FIRST HF RUN** |
| Human Expected Truth (all 001–020) | **FROZEN BEFORE FIRST HF RUN** |
| First HF run / baseline-validation | **Not started** |
| Engine changes / Sprint 12 | **Not started** |

Do not edit scenario inputs or HET after the first HF run. Prove integrity via `FREEZE_MANIFEST.json` SHA-256 hashes.

## Distribution summary

| Load band | Count | IDs |
|-----------|------:|-----|
| Quiet / easy control | 4 | 001, 008, 012, 019 |
| Normal | 7 | 002, 003, 005, 007, 011, 014, 016 |
| Busy | 5 | 004, 006, 010, 015, 017 |
| Adversarial / ambiguous | 4 | 009, 013, 018, 020 |

| Shift | Count | IDs |
|-------|------:|-----|
| AM | 7 | 001, 004, 006, 009, 011, 015, 018 |
| PM | 8 | 002, 005, 007, 010, 013, 016, 017, 019 |
| Night | 5 | 003, 008, 012, 014, 020 |

## Capability coverage (set-level)

- [x] Correct OPEN  
- [x] Correct MONITOR  
- [x] Correct INFORMATION  
- [x] Correct UNRESOLVED  
- [x] Superseded / completed / cancelled / declined / conditional  
- [x] Genuine payment debt  
- [x] Prepaid / company / settled / future-due non-collect  
- [x] Safety / maintenance (including mitigated MONITOR)  
- [x] Multi-department dependencies  
- [x] Meridian-native: Main vs Annex, `M`/`CX`/`MS`/`MA` IDs, shuttle, crew blocks, spa day vs resident, valet/parking, Events Pavilion, early-AM airport, accessible/interconnect, lean Night  

Quiet controls where little/no OPEN is correct: **001, 008, 012, 019**.

## Scenario slots 001–020

| ID | Title | Shift | Load band | Broad operational themes | Status |
|----|-------|-------|-----------|--------------------------|--------|
| 001 | Quiet Tuesday After Crew Turn | AM | Quiet | Crew out complete; spa not sellable; DONE fruit; little/no OPEN | **Authored / FROZEN** |
| 002 | Midweek PM Shuttle and Prepaid Arrival | PM | Normal | Timed shuttle; prepaid Main+Annex; spa day non-resident | **Authored / FROZEN** |
| 003 | Lean Night, Soft Leak, Early Crew Window | Night | Normal | Soft annex drain MONITOR; crew hold; company bill non-collect | **Authored / FROZEN** |
| 004 | Busy AM: Annex Backlog Meets Main Arrivals | AM | Busy | Annex VD soft ready; Acc CX03 hold; shuttle keys; dual-building | **Authored / FROZEN** |
| 005 | Spa Day Member Asking to Stay Overnight | PM | Normal | Day spa → overnight conversion clarify; MS03 not released | **Authored / FROZEN** |
| 006 | Crew Block vs Quiet-Wing Sell Pressure | AM | Busy | Contractual crew hold; wrong allocation M212; no invent CX | **Authored / FROZEN** |
| 007 | Valet Full and Pavilion Prefunction | PM | Normal | Valet/parking OPEN; pavilion florist tomorrow MONITOR | **Authored / FROZEN** |
| 008 | Truly Quiet Night Control | Night | Quiet | Nothing urgent; MONITOR OOO only; DONE amenity | **Authored / FROZEN** |
| 009 | Stale Annex Board vs Main Allocation Conflict | AM | Adversarial | CX07 status contradiction; company bill; no invent Main | **Authored / FROZEN** |
| 010 | Wedding Day Pavilion Pressure | PM | Busy | Pavilion cake; valet surge; CX16 dirty hold; master prepaid | **Authored / FROZEN** |
| 011 | Accessible Arrival and Interconnect Family | AM | Normal | MA02 Acc; M114/M115 interconnect; shuttle 12:50 | **Authored / FROZEN** |
| 012 | Night Information Heavy, MONITOR Only | Night | Quiet | Fire panel info; mitigated AC MONITOR; towels DONE | **Authored / FROZEN** |
| 013 | Treatment Room Sold as Bedroom | PM | Adversarial | TR-2 ≠ bedroom; reallocate Crowe; cancelled flowers | **Authored / FROZEN** |
| 014 | Night Payment Contrast and Lean Cover | Night | Normal | Genuine £64.80 collect; prepaid/company/tomorrow non-collect | **Authored / FROZEN** |
| 015 | Early-AM Airport Pressure Stack | AM | Busy | Shuttle accessible conflict; EA unconfirmed; F&B noise | **Authored / FROZEN** |
| 016 | Conditional Champagne and Genuine Twin Prep | PM | Normal | Twin OPEN; champagne if available; balloons cancelled | **Authored / FROZEN** |
| 017 | Busy PM: Crew Inbound, Spa Close, Valet Leftover | PM | Busy | Crew turn; spa non-resident; valet tickets; shuttle cutoff | **Authored / FROZEN** |
| 018 | Interconnect Broken Across Buildings | AM | Adversarial | M152+CX10 invalid interconnect; Main-only pairs | **Authored / FROZEN** |
| 019 | Settled Folio Afternoon, Almost Nothing To Do | PM | Quiet | Prepaid ready rooms; declined flowers; no urgent OPEN | **Authored / FROZEN** |
| 020 | Adversarial Night Paste: Everything Competing | Night | Adversarial | Controlled stain MONITOR; real debt; crew wake; false-friend noise | **Authored / FROZEN** |

## Next phase (not started)

1. Run current engine **unchanged** on all 20  
2. Freeze first-run outputs under `baseline-validation/`  
3. Score all 20 (Clear / Partial / Material)  
4. Only then consider Sprint 12 — do not retune Riverton for this measurement  
