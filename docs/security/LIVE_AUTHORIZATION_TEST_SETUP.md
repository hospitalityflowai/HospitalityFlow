# Live Authorization Test Setup (Launch Gate #3)

**Purpose:** Prove users cannot elevate roles or invoke privileged actions they do not own, using real Auth JWTs, PostgREST, RPCs, and Edge Functions on the dedicated non-production project.

**Suite:** `npm run test:live-authorization`  
**Helpers:** `scripts/lib/live-authorization-helpers.mjs`

---

## WARNING

- Use **hospitality-flow-security-test** (`ozxfqyuihoxokwdqollm`) only.
- Requires `HF_RLS_TEST_ENV=non-production` and the same `.env.rls-test` as the live RLS / Auth suites.
- Refuses production project ref `aluxummorfhcswwpgqaf`.
- Never prints passwords, JWTs, or API keys.
- Cleanup deletes only `HF_AUTHZ_TEST_*` hotels and suite early-access rows.

---

## Owner / member model (documented by suite)

**Model A (current):** All hotel members have equal operational permissions (Hotel Brain, handovers, maintenance). Only **hotel details** updates are owner-restricted (`hotels_update_owner` RLS + `update_hotel_workspace` RPC).

The suite does **not** invent new owner restrictions. Scenario 12 tests model A.

---

## Operator capability model

There are **no** granular `can_*` capability columns. Operator power is a **binary** `platform_operators` row (plus not suspended). Scenario 9 removes that row to simulate a capability-disabled operator.

---

## Prerequisites

1. Migrations applied on security-test including suspend/RLS + F-A03 Edge-only submit.
2. Fixture Auth users from `.env.rls-test` (Hotel A/B owners, operator, revoked → used as normal member).
3. Edge Functions available: `list-pilot-applications`, `invite-pilot-applicant`, `submit-early-access-application`.

---

## Scenarios

1–6 Role / platform escalation denials  
7–9 Operator Edge authorization  
10–11 Cross-tenant / operator-without-membership  
12 Owner-only hotel details (model A)  
13 Foreign hotel/workspace IDs  
14–15 RPC / anonymous privilege failures  
16–17 Redirect allowlist + fresh operator check  
18 F-A03 Edge-only early-access submit  

---

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | All assertions passed |
| 1 | Assertion failure |
| 2 | Harness / safety / setup failure |
