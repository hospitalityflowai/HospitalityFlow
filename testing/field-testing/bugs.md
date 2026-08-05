# Bugs

Field evidence from first real hotel shift — 4 August 2026.  
Original messy handover text was not pasted into the field-testing notes; capture it under Scenario 001 when available.

---

## Guest incorrectly classified as VIP

Date: 2026-08-04  
Area: VIP  
Severity: High  
Priority: High  
Description: Peter Polk appeared under VIP even though the handover did not identify him as a VIP guest.  
Expected behaviour: Guests appear under VIP only when explicitly marked as VIP in the handover, or when VIP status is stored in Hotel Brain.  
Actual behaviour: A non-VIP guest was placed in the VIP section.  
Steps to reproduce: Generate a handover from the real shift notes that mention Peter Polk without a VIP marker.  
Status: Open

---

## Taxi pickup text rewritten incorrectly

Date: 2026-08-04  
Area: Guest Follow-up  
Severity: High  
Priority: High  
Description: Taxi pickup wording was rewritten incorrectly during generation, changing or distorting the operational meaning of the original note.  
Expected behaviour: Taxi/transport notes are rewritten clearly while preserving pickup details, timing, and guest/room association.  
Actual behaviour: The rewritten taxi pickup text was incorrect.  
Steps to reproduce: Include a taxi pickup note in the source handover and generate Guest Follow-up.  
Status: Open

---

## Early check-in request only partially extracted

Date: 2026-08-04  
Area: Guest Follow-up  
Severity: High  
Priority: High  
Description: An early check-in request was only partially extracted, so the next shift did not receive the full request.  
Expected behaviour: Early check-in requests are extracted completely, with guest, room/reservation, and timing kept together.  
Actual behaviour: Only part of the early check-in request appeared after extraction.  
Steps to reproduce: Include a full early check-in request in the source notes and generate the handover.  
Status: Open

---

## Important guest details lost during extraction

Date: 2026-08-04  
Area: Guest Follow-up  
Severity: High  
Priority: High  
Description: Important guest details present in the source handover were lost during extraction into Guest Follow-up.  
Expected behaviour: Guest-critical details remain visible after generation, linked to the correct guest and room.  
Actual behaviour: Material guest information disappeared or was incomplete after extraction.  
Steps to reproduce: Generate a handover from the real shift notes and compare Guest Follow-up items with the source.  
Status: Open

---

## Room 22 safe issue not fully understood

Date: 2026-08-04  
Area: Maintenance  
Severity: High  
Priority: High  
Description: The Room 22 safe issue was not fully understood by the system, and the complete maintenance description was not preserved.  
Expected behaviour: The full maintenance description is retained and presented with room number and fault detail intact.  
Actual behaviour: The safe issue was incompletely interpreted and/or incompletely displayed.  
Steps to reproduce: Include the Room 22 safe note in source handover and inspect Maintenance output.  
Status: Open

---

## Sofa bed request not extracted

Date: 2026-08-04  
Area: Maintenance / Guest requests  
Severity: Medium  
Priority: Medium  
Description: A sofa bed request present in the handover was not extracted into the generated output.  
Expected behaviour: Sofa bed / bedding configuration requests are extracted and associated with the correct room/guest.  
Actual behaviour: The sofa bed request did not appear after generation.  
Steps to reproduce: Include a sofa bed request in the source notes and generate the handover.  
Status: Open

---

## Arrival date shown without guest context

Date: 2026-08-04  
Area: Reception  
Severity: High  
Priority: High  
Description: “Arriving on the 6th August” appeared as a fragment with no guest or reservation context.  
Expected behaviour: Arrival dates remain linked to the guest name and reservation/room information.  
Actual behaviour: The date appeared alone, without usable guest context.  
Steps to reproduce: Include an arrival-on-date note tied to a guest in the source handover and inspect Reception output.  
Status: Open

---

## Birthday information shown without guest or room

Date: 2026-08-04  
Area: Reception  
Severity: High  
Priority: High  
Description: Birthday information appeared without the associated guest name or room number.  
Expected behaviour: Birthday notes remain linked to guest and room so Reception can act on them.  
Actual behaviour: Birthday detail was shown as an orphaned fragment.  
Steps to reproduce: Include a birthday note with guest/room in the source handover and inspect generated sections.  
Status: Open

---

## “Do Not Run As No Show” lost reservation context

Date: 2026-08-04  
Area: Reception  
Severity: High  
Priority: High  
Description: The instruction “Do Not Run As No Show” appeared without the reservation or guest it applies to.  
Expected behaviour: No-show instructions remain attached to the correct reservation/guest.  
Actual behaviour: The instruction was disconnected from its reservation context.  
Steps to reproduce: Include a DNR / do-not-run-as-no-show note with reservation identity in the source handover.  
Status: Open

---

## Contact and travel details not kept linked

Date: 2026-08-04  
Area: Operational Notes  
Severity: High  
Priority: High  
Description: Phone numbers, email addresses, airport information and taxi bookings were split into disconnected fragments instead of remaining one operational unit.  
Expected behaviour: Related contact and travel details stay linked to the same guest/room/request.  
Actual behaviour: Related details were separated and harder to use operationally.  
Steps to reproduce: Include a note containing phone, email, airport and taxi details for one guest; generate Operational Notes.  
Status: Open

---

## Finance payment disconnected from guest

Date: 2026-08-04  
Area: Finance  
Severity: Medium  
Priority: Medium  
Description: Prepaid payment was recognised correctly, but payment context was not kept connected with the guest.  
Expected behaviour: Recognised payments remain associated with the correct guest (and room/reservation where available).  
Actual behaviour: Payment recognition succeeded; guest linkage was incomplete or missing.  
Steps to reproduce: Include a prepaid payment note with guest identity and inspect Finance output.  
Status: Open

---

## Bar AC fault missing follow-up status

Date: 2026-08-04  
Area: Maintenance  
Severity: Medium  
Priority: Medium  
Description: “Bar AC not working” was described as a fault but did not clearly indicate whether follow-up is still required.  
Expected behaviour: Maintenance items state the fault and whether action/follow-up is still needed for the next shift.  
Actual behaviour: Only the fault description appeared, without clear follow-up status.  
Steps to reproduce: Include a Bar AC fault note in the source handover and inspect Maintenance output.  
Status: Open

---

<!-- Shift 002 — 5 August 2026 — The Zetter Marylebone (live production). Do not fix yet; continue collecting for one week. -->

## Guest preference invented (foam pillows → “Extra pillows”)

Date: 2026-08-05  
Hotel: The Zetter Marylebone  
Area: Guest requests / Preferences  
Severity: Critical  
Priority: Critical  
Description: A specific guest preference for foam pillows was rewritten as “Extra pillows”, inventing a different request.  
Expected behaviour: Never replace guest preferences with assumptions. Preserve the exact preference wording (e.g. foam pillows).  
Actual behaviour: Foam pillows became “Extra pillows”.  
Steps to reproduce: Include a foam-pillow preference in live source notes and generate the handover.  
Status: Open  
Notes: Critical accuracy failure. Extraction is improving; inventing preference detail is unacceptable for live use.

---

## Same operational issue duplicated across multiple sections

Date: 2026-08-05  
Hotel: The Zetter Marylebone  
Area: Information architecture / Reasoning  
Severity: High  
Priority: High  
Description: The same issue (Room 51) appeared repeatedly across Priority list, Timeline, Hotel Status and Recommendations.  
Expected behaviour: Each operational issue normally appears once; later sections reference it rather than repeating the full item.  
Actual behaviour: Room 51 was restated across multiple sections, lengthening the printed report and reducing clarity.  
Steps to reproduce: Generate a live handover containing a Room 51 issue and inspect Priority list, Timeline, Hotel Status and Recommendations.  
Status: Open  
Notes: Reinforces “one issue, one place, one clear action”.

---

## Recommendations not actionable

Date: 2026-08-05  
Hotel: The Zetter Marylebone  
Area: Shift Intelligence / Recommendations  
Severity: High  
Priority: High  
Description: Recommendations described review needs without telling staff what to do. Example: “Outstanding payment requires review.”  
Expected behaviour: Actionable duty-manager language, e.g. “Collect outstanding payment from Room 11 before departure.”  
Actual behaviour: Vague review language without room, guest or concrete action.  
Steps to reproduce: Include an outstanding payment for a departing room and inspect Recommendations.  
Status: Open

---

## Generic recommendation / follow-up wording

Date: 2026-08-05  
Hotel: The Zetter Marylebone  
Area: Recommendations / Follow-up  
Severity: High  
Priority: High  
Description: Output used generic phrases with no operational value, e.g. “Reception follow-up remains open.”, “Outstanding review required.”, “Guest impact remains open.”  
Expected behaviour: Specific room, guest or action in every follow-up item.  
Actual behaviour: Generic status language that cannot be actioned.  
Steps to reproduce: Generate a live handover with open follow-ups and inspect Recommendations / related sections.  
Status: Open

---

## Wrong-day arrivals included in today’s operational handover

Date: 2026-08-05  
Hotel: The Zetter Marylebone  
Area: Reasoning / Arrivals  
Severity: High  
Priority: High  
Description: Upcoming arrivals from another day were included in today’s operational handover.  
Expected behaviour: Today’s handover prioritises today’s operation unless future arrivals are intentionally relevant.  
Actual behaviour: Non-today arrivals were treated as part of today’s operational scope.  
Steps to reproduce: Include future-dated arrivals in source notes and inspect today’s generated handover sections.  
Status: Open

---

## Hotel Brain enrichment too aggressive

Date: 2026-08-05  
Hotel: The Zetter Marylebone  
Area: Hotel Brain  
Severity: Medium  
Priority: Medium  
Description: AI sometimes added operational explanations that were not required.  
Expected behaviour: Hotel Brain enriches only when it genuinely improves decisions.  
Actual behaviour: Enrichment was too aggressive and added unnecessary explanation.  
Steps to reproduce: Generate a live handover where Hotel Brain context is available and compare enrichment against source need.  
Status: Open

---

## Completed action wording translated incorrectly

Date: 2026-08-05  
Hotel: The Zetter Marylebone  
Area: Completed Actions / Data quality  
Severity: Medium  
Priority: Medium  
Description: One completed action was translated incorrectly (Stayover / Paid / Departure wording).  
Expected behaviour: Accurate interpretation of stayover, paid and departure status language.  
Actual behaviour: Wording was misinterpreted during translation into the generated output.  
Steps to reproduce: Include a completed stayover/paid/departure note in source handover and inspect Completed Actions / related status text.  
Status: Open
