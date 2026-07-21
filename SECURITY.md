# Hospitality Flow — Security Policy

This document describes security practices for **Hospitality Flow**, a platform for hotel operational tools including AI Shift Handover, Hotel Brain, and hotel workspace management. It is intended for developers, operators, and security researchers working on or reviewing the product.

---

## 1. Security Overview

Hospitality Flow handles **operational hotel data**: shift handover notes, hotel configuration, workspace membership, and related business information. This data may include staff names, guest-related operational notes, and property metrics.

Hospitality Flow follows a **security-first development approach**:

- Private data is protected at the database layer, not only in application code.
- Authentication and authorization are delegated to Supabase where appropriate.
- Secrets are kept out of source control and out of browser-exposed code.
- New features are reviewed for workspace isolation before release.

Security is an ongoing process. Controls described in this document must be **implemented, tested, and verified** before wider production use.

---

## 2. Authentication

Hospitality Flow uses **Supabase Auth** for customer accounts.

- Users sign in with email and password (or other methods configured in Supabase).
- **Only authenticated users** may access private workspace features such as Hotel Brain cloud sync, saved handovers, and account management.
- **Passwords are managed by Supabase** and are never stored directly by Hospitality Flow application code or in Hospitality Flow databases under our control.
- Session tokens are handled by the Supabase client with standard persistence and refresh behaviour.
- Unauthenticated users may use local-only tool features where designed, but must not access another hotel’s cloud data.

Authentication flows (sign-up, sign-in, sign-out, password reset) must be tested before each release that touches auth.

---

## 3. Authorization and Workspace Isolation

Access to private data is enforced with **Supabase Row Level Security (RLS)**.

Requirements:

- **RLS must be enabled** on every private table (for example: `hotels`, `hotel_members`, `hotel_brain_profiles`, `handover_reports`, and any future workspace-scoped tables).
- Access must be restricted using **`hotel_members`** and **`auth.uid()`** so that policies reflect actual workspace membership, not merely shared login.
- Users must **only access records belonging to hotels where they are registered members**.
- **SELECT, INSERT, UPDATE, and DELETE** policies must all be defined and reviewed for each private table.
- **UPDATE policies** must include both **`USING`** and **`WITH CHECK`** clauses where appropriate, so users cannot read or modify rows outside their workspace and cannot reassign rows to another workspace on update.

Application code must still pass the correct `workspace_id` / `hotel_id`, but **must not rely on client-side checks alone**. RLS is the authoritative control.

Before release, verify that one hotel account **cannot** read, insert, update, or delete another hotel’s records.

---

## 4. Secrets Management

Hospitality Flow must never expose sensitive credentials in frontend code or public repositories.

**Never expose in frontend files, HTML, or committed JavaScript:**

- Supabase **`service_role`** key
- Database password
- Private API keys
- Any credential that grants bypass of RLS or full database access

**Frontend code may only use:**

- Supabase **publishable** or **`anon`** key (designed for browser use with RLS enforced)

**Storage rules:**

- Secrets must be stored in **approved environment variables** or secure secret stores (for example: local `.env.local`, CI secrets, hosting provider env config).
- **`.env.local`** and other real environment files **must not be committed** to Git.
- Example environment files (for example `supabase-config.example.js`) must contain **placeholders only**, never live keys.

If a secret is accidentally committed or exposed, treat it as a **compromise**: revoke and rotate immediately (see [Incident Response](#11-incident-response)).

---

## 5. User Input and Data Handling

All user-provided content must be treated as **untrusted input**, including:

- Shift handover notes
- Hotel Brain profile content
- Form fields (hotel name, department, metrics, SOP text, etc.)

Requirements:

- **Avoid rendering user input with unsafe HTML methods** such as `innerHTML` unless content is properly sanitized or generated from a trusted template with strict escaping.
- **Validate important data** before saving (required fields, types, reasonable length limits, allowed enum values where applicable).
- **Do not collect unnecessary personal or sensitive guest information.** Operational notes should stay focused on what staff need for the shift; avoid storing identifiable guest data unless there is a clear operational need and appropriate handling.

When displaying user content, prefer text-safe APIs (`textContent`, escaped templates) over raw HTML injection.

---

## 6. Database Security

Database changes are applied via **reviewed SQL migrations** in `supabase/migrations/`.

Requirements:

- **Migrations must be reviewed before execution** in any shared or production Supabase project.
- **New tables** must include:
  - Suitable **constraints** (NOT NULL, CHECK, foreign keys where appropriate)
  - **Indexes** for common query patterns (for example `workspace_id`, `created_at`)
  - **RLS policies** consistent with workspace membership
- **Foreign keys and `ON DELETE` behaviour** must be deliberate (for example `CASCADE` vs `RESTRICT`) and documented in the migration.
- After migration, **test workspace isolation**: confirm Hotel A cannot access Hotel B’s rows under a normal authenticated session.

Avoid running ad-hoc DDL in production without a corresponding migration file in the repository.

---

## 7. File Upload Security

Hospitality Flow may support logo, document, or image uploads in future phases. When implemented, uploads must include:

- **Allowed file types** (explicit MIME/extension allowlist)
- **File-size limits** enforced client-side and server-side
- **Secure storage bucket policies** (Supabase Storage or equivalent)
- **Randomized or non-guessable file paths** where appropriate, to reduce enumeration risk
- **RLS or equivalent access controls** so files are readable only by members of the relevant hotel workspace

Uploaded files must never be served from a public bucket without access checks unless they are intentionally public assets.

---

## 8. AI Security

AI features (shift handover generation, recommendations, checklist intelligence) introduce additional risks. Future and existing AI work must consider:

- **Prompt injection** — user notes and Hotel Brain content may attempt to override system instructions; prompts should be structured to reduce instruction hijacking and outputs should not blindly execute user-supplied directives.
- **Accidental disclosure of Hotel Brain content** — model prompts and logs must not leak one hotel’s profile or notes to another context.
- **Workspace isolation** — AI-related saved outputs (handovers, drafts) must remain scoped to the authenticated workspace, consistent with RLS.
- **Request limits** — rate limiting and abuse controls should be applied before high-volume or paid model usage in production.
- **Safe handling of model output** — treat AI responses as untrusted text; escape before HTML rendering; do not execute model output as code.

AI features must not send secrets, service keys, or full database exports to external model providers.

---

## 9. Logging and Errors

Logging and user-facing errors must protect hotel and user privacy.

- **Do not expose secrets, tokens, or private hotel data** in browser toast messages, UI alerts, or public error pages.
- During development, use **structured console errors** (clear prefix, context object, no raw keys) to aid debugging — for example `[HFHandoverStore] insert handover failed: { workspaceId, message, code }` without embedding session tokens.
- **Production users** should receive **clear, non-technical error messages** (for example “Unable to save to cloud. Saved on this device.”) rather than stack traces or database error codes.
- **Central error monitoring** (for example Sentry or equivalent) should be added before wider production rollout, with scrubbing rules for PII and secrets.

Server-side logs, if introduced later, must follow the same rules.

---

## 10. Release Security Checklist

Before each significant release or pilot expansion, confirm:

- [ ] **RLS enabled and tested** on all private tables
- [ ] **Workspace isolation tested** (cross-hotel access denied)
- [ ] **No secrets committed** (scan repo and recent commits)
- [ ] **Authentication flows tested** (sign-up, sign-in, sign-out, session expiry)
- [ ] **Password reset tested** end-to-end
- [ ] **Production redirect URLs verified** in Supabase Auth settings
- [ ] **Dependency vulnerabilities checked** (`npm audit` or equivalent)
- [ ] **Backup and recovery process reviewed** for Supabase project
- [ ] **Privacy policy and terms reviewed** for accuracy relative to current features
- [ ] **Critical browser console errors resolved** on main user paths

---

## 11. Incident Response

If a security issue is discovered (vulnerability, leaked key, unauthorized access, or data exposure):

1. **Stop affected releases** — pause deploys or feature rollouts that use the vulnerable component until patched.
2. **Assess affected users and data** — determine which workspaces, accounts, or record types may be impacted.
3. **Revoke exposed keys immediately** — rotate Supabase keys, API tokens, and any other compromised credentials.
4. **Patch and test the issue** — fix in code or Supabase policy, verify with isolation and auth tests.
5. **Notify affected users** when legally or operationally necessary (for example material data breach or required regulatory notification).
6. **Document the incident and prevention steps** — post-mortem with root cause, timeline, remediation, and follow-up tasks.

Severity and notification obligations depend on jurisdiction and contract; err on the side of transparency with pilot customers when their data may be affected.

---

## 12. Reporting a Vulnerability

If you believe you have found a security vulnerability in Hospitality Flow, please report it responsibly:

**Email:** security@hospitalityflow.co.uk

Please include:

- A description of the issue and steps to reproduce
- Affected URLs, features, or components
- Impact assessment if known
- Your contact details (optional)

**Please do not publicly disclose vulnerabilities** (blog posts, social media, issue trackers) until Hospitality Flow has had **reasonable time to investigate and address** the report. We aim to acknowledge reports promptly and will work with you on coordinated disclosure where appropriate.

We appreciate good-faith research that helps keep hotel operational data secure.

---

## 13. Current Status

**Hospitality Flow is currently in development and pilot preparation.**

The security controls described in this document reflect **intended and in-progress practices**. They must be **verified through testing and review** before wider production use. Not every control (for example central error monitoring, upload hardening, or full AI rate limiting) may be fully implemented yet.

This file will be updated as the product matures. Last updated: July 2026.
