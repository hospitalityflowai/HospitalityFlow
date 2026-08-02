# Hospitality Flow — Architecture Index

Single entry point for architecture and technical documentation.

**Not a substitute for module specs.** Start here, then follow links.

---

## 1. Platform overview

Hospitality Flow helps independent and boutique hotels run better shifts through **operational intelligence** — the right information at the right moment, with AI as support rather than the product itself.

### Core platform modules

| Module | Role |
|--------|------|
| **Hotel Brain** | Durable hotel knowledge and operational context |
| **AI Shift Handover** | Shift communication, facts, and recommendations |
| **Maintenance** | Issue tracking with optional handover contribution |
| **Guest Intelligence** | Planned — guest-impact layer on the shared engine |
| **Operator / Pilot Lab** | Platform administration and operator sandbox |

### How modules connect

```text
Hotel Brain (context)
        │
        ▼
Hospitality Intelligence Engine  ◄── Maintenance facts (opt-in)
        │
        ▼
AI Shift Handover (presentation + saved reports)

Guest Intelligence (planned) → same engine contracts, not a parallel brain
```

Shared reasoning belongs in the intelligence layer; modules present conclusions. Security (Auth, platform access, membership, RLS) wraps all real workspaces — see [Security](#4-security).

---

## Strategy and planning

| Document | Description |
|----------|-------------|
| [VISION.md](../VISION.md) | Long-term product direction |
| [ROADMAP.md](../ROADMAP.md) | Planned development tracking |
| [SECURITY.md](../SECURITY.md) | High-level security reference |

Detailed canonical security architecture lives in [security/SECURITY_ARCHITECTURE.md](security/SECURITY_ARCHITECTURE.md).

---

## 2. Core architecture

| Document | Description |
|----------|-------------|
| [PRODUCT_PRINCIPLES.md](PRODUCT_PRINCIPLES.md) | Product principles and mission |
| [HOSPITALITY_INTELLIGENCE_ENGINE_ARCHITECTURE.md](HOSPITALITY_INTELLIGENCE_ENGINE_ARCHITECTURE.md) | Shared intelligence engine design |
| [HOSPITALITY_INTELLIGENCE_ARCHITECTURE_AUDIT.md](HOSPITALITY_INTELLIGENCE_ARCHITECTURE_AUDIT.md) | Intelligence architecture audit / roadmap context |
| [PHASE_16B_INTELLIGENCE_FOUNDATION.md](PHASE_16B_INTELLIGENCE_FOUNDATION.md) | Phase 16B shared foundation |

---

## 3. Product modules

| Module | Documentation |
|--------|----------------|
| **Hotel Brain** | Dedicated architecture document not yet created. Covered in intelligence docs above; UI at `hotel-profile.html`. |
| **AI Shift Handover** | Dedicated architecture document not yet created. Covered in intelligence docs above; UI at `handover.html`. |
| **Maintenance** | [MAINTENANCE_V1_SPEC.md](MAINTENANCE_V1_SPEC.md), [MAINTENANCE_UI_V1.md](MAINTENANCE_UI_V1.md) |
| **Guest Intelligence** | Dedicated architecture document not yet created. Referenced as planned in intelligence architecture docs. |
| **Operator / Pilot Lab** | [OPERATOR_INVITE.md](OPERATOR_INVITE.md), [operator/PILOT_LAB_ACCOUNT_SETUP.md](operator/PILOT_LAB_ACCOUNT_SETUP.md) |

Pilot validation (ops/research, not core architecture): [pilot-validation/README.md](pilot-validation/README.md).

---

## 4. Security

| Document | Description |
|----------|-------------|
| [security/SECURITY_ARCHITECTURE.md](security/SECURITY_ARCHITECTURE.md) | Canonical security trust model |
| [security/PLATFORM_SUSPEND_AND_REVOKE.md](security/PLATFORM_SUSPEND_AND_REVOKE.md) | Suspend / remove / hard-revoke playbook |
| [security/LIVE_RLS_TEST_SETUP.md](security/LIVE_RLS_TEST_SETUP.md) | Launch Gate #1 — live RLS |
| [security/LIVE_AUTH_LIFECYCLE_TEST_SETUP.md](security/LIVE_AUTH_LIFECYCLE_TEST_SETUP.md) | Launch Gate #2 — auth lifecycle |
| [security/LIVE_AUTHORIZATION_TEST_SETUP.md](security/LIVE_AUTHORIZATION_TEST_SETUP.md) | Launch Gate #3 — authorization |
| [security/EARLY_ACCESS_SUBMIT_EDGE_ONLY.md](security/EARLY_ACCESS_SUBMIT_EDGE_ONLY.md) | Early-access Edge-only submit |

---

## 5. Releases and deployment

| Document | Description |
|----------|-------------|
| [releases/SECURITY_RELEASE_V0.9.md](releases/SECURITY_RELEASE_V0.9.md) | Security Release v0.9 checkpoint |
| [security/SECURITY_V0.9_PRODUCTION_ROLLOUT.md](security/SECURITY_V0.9_PRODUCTION_ROLLOUT.md) | Controlled production rollout runbook |
| [SUPABASE_SETUP.md](../SUPABASE_SETUP.md) | Supabase project and Auth URL setup |
| [OPERATOR_INVITE.md](OPERATOR_INVITE.md) | Operator invite operations |

---

## 6. Database and migrations

- SQL migrations: `supabase/migrations/`
- Edge Functions: `supabase/functions/`
- Production schema/function changes follow the **controlled rollout** in [SECURITY_V0.9_PRODUCTION_ROLLOUT.md](security/SECURITY_V0.9_PRODUCTION_ROLLOUT.md) — not ad-hoc `db reset` or unverified `--linked` targets
- `supabase/.temp/` is **local Supabase CLI metadata** — gitignored; do not commit

---

## 7. Testing

Main security commands:

```bash
npm run test:live-rls
npm run test:live-auth
npm run test:live-authorization
npm run test:live-early-access-submit
npm run test:safe-redirect
```

Live suites must run **only** against the dedicated non-production project `hospitality-flow-security-test` (`ozxfqyuihoxokwdqollm`), with `HF_RLS_TEST_ENV=non-production`. Never against production or Zetter for destructive proof.

---

## 8. Current architecture status

| Area | Status |
|------|--------|
| Security Launch Gate #1 (RLS) | **PASS** |
| Security Launch Gate #2 (Auth lifecycle) | **PASS** |
| Security Launch Gate #3 (Authorization) | **PASS** |
| Production Security v0.9 rollout | **Pending** controlled deployment |
| Hospitality Intelligence Engine | Active development |
| Hotel Brain | Active development |
| AI Shift Handover | Active development |
| Maintenance | Active development |
| Guest Intelligence | Planned / early — no module implementation or dedicated architecture doc yet |

---

## 9. Reading order for future developers

1. [PRODUCT_PRINCIPLES.md](PRODUCT_PRINCIPLES.md)
2. [ARCHITECTURE_INDEX.md](ARCHITECTURE_INDEX.md) (this file)
3. [security/SECURITY_ARCHITECTURE.md](security/SECURITY_ARCHITECTURE.md)
4. [HOSPITALITY_INTELLIGENCE_ENGINE_ARCHITECTURE.md](HOSPITALITY_INTELLIGENCE_ENGINE_ARCHITECTURE.md)
5. Module-specific docs (Maintenance specs; Operator invite / Pilot Lab; others when written)
6. Production rollout docs ([SECURITY_RELEASE_V0.9.md](releases/SECURITY_RELEASE_V0.9.md), [SECURITY_V0.9_PRODUCTION_ROLLOUT.md](security/SECURITY_V0.9_PRODUCTION_ROLLOUT.md))
