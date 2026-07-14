# Hospitality Flow AI Shift Handover

## Version 1.0 — First Release (July 2026)

### Shipped

- **AI Shift Handover Assistant** — full end-to-end workflow from shift notes to organised handover
- **Shift notes parser** — paste messy notes and generate a structured handover in seconds
- **Classification engine** — automatic categorisation into Urgent Issues, Guest Information, Maintenance, Payments, Events, Outstanding Tasks, and General Notes
- **AI Summary** — shift overview with structured category rows on screen and in PDF
- **Today's Shift at a Glance** — Hotel Snapshot (6 metrics) and Shift Alerts dashboard
- **Hotel Snapshot** — manual entry with persistence through generate, save, copy, and PDF; Occupancy %, ADR (£), and missing-value handling
- **Shift Alerts** — Urgent Issues, VIP Arrivals, Maintenance Tasks, Payment Issues, Events (always shown), Outstanding Tasks with section navigation
- **Editable handover items** — inline edit, Open / In Progress / Completed status controls
- **Copy Handover** — formatted text export including hotel snapshot and organised sections
- **PDF Export** — compact layout with snapshot grid, dashboard metrics, structured AI Summary, and organised handover
- **Saved Handovers** — local save, open, and delete
- **Handover metadata** — hotel name, department, shift (AM / PM / Night), prepared by, date
- **Responsive professional UI** — Hospitality Flow design system

### Known limitations

- Rule-based classification and summary (no live OpenAI API yet)
- Saved handovers stored in browser local storage only
- No email export or PMS integration

---

## Earlier development

### Version 0.9 (pre-release)

- Initial classification engine, dashboard metrics, and handover sections
- Management attention and VIP detection rules

---

## Roadmap

### Version 1.1
- OpenAI integration for richer summaries
- Email handover export
- Hotel settings and logo upload

### Version 1.2
- Search previous handovers
- Handover history sync

### Version 2.0
- PMS integrations (Opera, Mews, Cloudbeds, Apaleo)
- Automatic arrivals, departures, and room status
- Live VIP and payment alerts
