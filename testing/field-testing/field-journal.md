# Hospitality Flow Field Journal

This journal documents every real hotel shift where Hospitality Flow is used in production or pilot testing.

Purpose:

- Preserve the story of Hospitality Flow's evolution.
- Record observations from real hotel operations.
- Capture operational context that cannot be represented by individual bugs or feature requests.
- Provide evidence for future pilot hotels, case studies and product decisions.

---

# Shift 001

Date: 2026-08-04  
Hotel:  
Department:  
Shift:  
Hospitality Flow Version:  

## Overall Impression

Rate the overall experience (1–10):

General comments:

First real hotel shift using Hospitality Flow for field testing. Findings captured in `bugs.md`, `improvements.md` and `ideas.md`. Original messy handover text still needs pasting into Scenario 001 when available.

---

## What Worked Well

- Finance recognised prepaid payment correctly.
- Completed Actions section worked well; confirmed actions moved there automatically.
- Useful as a live evidence-gathering tool even where AI output needed review.

---

## Biggest Operational Issues

- Guest, room, reservation, payment and action context often split apart (orphaned dates, birthdays, DNR instructions, contact/travel details).
- VIP classification incorrect (Peter Polk marked VIP without evidence).
- Extraction incomplete or distorting for guest follow-up and maintenance (early check-in, taxi rewrite, Room 22 safe, sofa bed missing).

---

## Bugs Discovered

Reference:  
(See bugs.md)

Summary:

12 open bugs logged — incorrect VIP placement, incorrect taxi rewrite, partial early check-in, lost guest details, incomplete Room 22 safe issue, missing sofa bed request, orphaned arrival date / birthday / DNR, unlinked contact and travel details, finance–guest disconnect, Bar AC missing follow-up status.

---

## Improvements Identified

Reference:  
(See improvements.md)

Summary:

11 improvements logged — OOO Rooms metric, stronger Snapshot card hierarchy, simplify Adults/Children, better shorthand recognition, auto RevPAR, meaningful Today’s Briefing, clearer writing grammar, grouped Operational Notes / arrivals-departures, concise Shift Intelligence recommendations, preserve Completed Actions routing.

---

## New Ideas

Reference:  
(See ideas.md)

Summary:

4 ideas logged — Duty Manager reasoning over text rewriting; hard context-link rule; accuracy over AI creativity; validate future changes against field-testing handovers.

---

## Real Operational Scenarios Tested

Examples:

- VIP handling (incorrect classification observed)
- Payment / prepaid finance
- Maintenance (Room 22 safe, Bar AC)
- Taxi booking
- Early check-in request
- Sofa bed / bedding request
- Birthday note
- Arrival date / reservation instruction (Do Not Run As No Show)
- Contact and travel details (phone, email, airport, taxi)

---

## AI Behaviour

Did the AI think like an experienced hotel duty manager?

Strengths:

- Correct prepaid payment recognition.
- Completed Actions routing behaved as expected.

Weaknesses:

- Too often rewrote or fragmented notes instead of preserving operational units.
- Incorrect VIP judgement without explicit evidence.
- Briefing and recommendations not consistently priority-led or concise enough.
- Low-confidence guessing / incomplete extraction where duty managers would keep the original linked note.

---

## Confidence

How confident would you feel using this during a live shift?

---

## Next Priorities

1. Preserve guest–room–request–payment–action context across all sections.
2. Stop incorrect VIP classification; only VIP when explicit or in Hotel Brain.
3. Make Today’s Briefing and Shift Intelligence concise, accurate and priority-led.

---

## Notes

Anything that doesn’t fit elsewhere.

- Field-testing principles and AI Design Principles live in `README.md`.
- Original messy handover for this shift was not pasted at capture time; add to `test-scenarios.md` as Scenario 001 when available.
- Do not treat this journal entry as a development brief — weekly review still decides the action plan.

---

# Shift 002

Date: 2026-08-05  
Hotel: The Zetter Marylebone  
Department: Reception / Duty Manager  
Shift: Live production field test  
Hospitality Flow Version:  

## Overall Impression

Rate the overall experience (1–10):

General comments:

Second live field-testing shift in real production at The Zetter Marylebone. Goal: evaluate whether Hospitality Flow behaves like an experienced hotel duty manager rather than simply rewriting notes. Extraction quality continues to improve. Main weakness is reasoning, prioritisation and information architecture — not basic extraction.

Findings captured in `bugs.md`, `improvements.md` and `ideas.md`. No fixes implemented from this session; continue collecting live feedback for one week before prioritising patterns.

---

## What Worked Well

- Correctly identified a maintenance issue.
- Correctly identified VIP preparation.
- Correctly identified an outstanding balance.
- Correctly identified guest requests.
- Captured general operational context.
- Extraction quality is improving versus Shift 001.

---

## Biggest Operational Issues

- Same operational issue (e.g. Room 51) repeated across Priority list, Timeline, Hotel Status and Recommendations.
- Recommendations often generic or not actionable (“Outstanding payment requires review” instead of a clear collect-before-departure instruction).
- Generic wording with no room, guest or action (e.g. “Reception follow-up remains open”).
- Invented guest preference detail (foam pillows became “Extra pillows”) — critical accuracy failure.
- Upcoming arrivals from another day included in today’s operational handover.
- Timeline used for ongoing tasks instead of timed events; Hotel Status and Operational Notes repeat or merge instead of summarising.
- Printed report still feels too long because repeated information appears throughout.

---

## Bugs Discovered

Reference:  
(See bugs.md — Shift 002 entries dated 2026-08-05)

Summary:

Critical/high reasoning bugs logged — invented guest preference (foam pillows), duplicate Room 51 across sections, non-actionable and generic recommendations, wrong-day arrivals in today’s handover. Medium issues: aggressive Hotel Brain enrichment, incorrect completed-action wording, Timeline/Hotel Status/Operational Notes architecture problems.

---

## Improvements Identified

Reference:  
(See improvements.md — Shift 002 entries dated 2026-08-05)

Summary:

Improvements logged — one issue / one place / one action; short direct recommendations; Timeline limited to timed events; Hotel Status as a health dashboard; clearer Operational Notes; Snapshot visual hierarchy; Hotel Brain enrichment only when it improves decisions.

---

## New Ideas

Reference:  
(See ideas.md — Shift 002 entries dated 2026-08-05)

Summary:

Standing direction reinforced — duty-manager reasoning over rewrite; collect a full week of live shifts before implementing fixes; prioritise recurring patterns over isolated examples.

---

## Real Operational Scenarios Tested

Examples:

- Maintenance issue identification
- VIP preparation
- Outstanding balance / payment follow-up
- Guest requests and preferences (foam pillows)
- Room 51 operational issue (duplicated across sections)
- Room 11 outstanding payment recommendation quality
- Future-day arrivals vs today’s operational scope
- Timeline vs briefing content
- Printed handover length / repetition

---

## AI Behaviour

Did the AI think like an experienced hotel duty manager?

Strengths:

- Extraction of maintenance, VIP prep, outstanding balance, guest requests and general context is improving.
- Core facts are often present; the system is useful as a live evidence-gathering tool.

Weaknesses:

- Reasoning and prioritisation lag extraction quality.
- Repeats the same issue across multiple sections instead of stating once and referencing.
- Recommendations over-explain or stay generic instead of telling staff exactly what to do.
- Can invent or generalise guest preferences.
- Can pull non-today operational items into today’s handover.
- Hotel Brain enrichment sometimes adds explanations that were not required.

---

## Confidence

How confident would you feel using this during a live shift?

Improving for extraction; still needs review before trusting recommendations, Timeline, and preference wording without checking the source notes.

---

## Next Priorities

1. Do not implement fixes yet — continue live field testing for one week.
2. After several shifts, analyse recurring issues and prioritise patterns over isolated examples.
3. Standing product bar: one issue, one place, one clear action; short duty-manager recommendations; never invent guest preferences.

---

## Notes

- Environment: real production usage at The Zetter Marylebone.
- Explicit session instruction: documentation only — no application, prompt or AI-logic changes from this shift.
- Weekly review should wait until multiple shifts are collected.
