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
