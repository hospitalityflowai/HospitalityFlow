# Pilot Lab account setup

Safe pre-pilot account model for Hospitality Flow.

**Goal:** keep platform operator work and Zetter Marylebone operations on separate accounts.

| Account | Operator capability | Hotel workspace |
|---|---|---|
| Dedicated HF operator | Yes (`platform_operators`) | Hospitality Flow Pilot Lab only |
| Normal Zetter account | No | Zetter Marylebone only |

This guide does **not** move, delete, or alter memberships automatically. Every step is manual and reversible.

Do not implement or rely on a workspace switcher. Each signed-in account resolves exactly one hotel workspace.

---

## Prerequisites

1. Apply migrations through Phase 15 (operator capability) if not already applied.
2. Apply [`supabase/migrations/phase16_operator_pilot_lab.sql`](../../supabase/migrations/phase16_operator_pilot_lab.sql) in the Supabase SQL Editor.
3. Confirm public signup remains disabled.
4. Have access to the Supabase Dashboard (Authentication + SQL Editor).

Confirm the RPC exists:

```sql
SELECT proname
FROM pg_proc
WHERE proname = 'create_operator_pilot_lab_workspace';
```

---

## Safe sequence

### 1. Create or invite the dedicated HF operator account

Use a Hospitality Flow staff email (for example `you@hospitalityflow.co.uk`), **not** a Zetter staff login.

Supabase → **Authentication** → **Users** → **Add user** (email + password), or send an Auth invite from the Dashboard.

Do not reuse the normal Zetter hotel login for this account.

### 2. Grant platform operator capability

Replace the email, then run in SQL Editor:

```sql
INSERT INTO public.platform_operators (user_id, email)
SELECT id, lower(email)
FROM auth.users
WHERE lower(email) = 'you@hospitalityflow.co.uk'
ON CONFLICT (user_id) DO UPDATE
SET email = EXCLUDED.email;
```

Confirm:

```sql
SELECT user_id, email, created_at
FROM public.platform_operators
WHERE lower(email) = 'you@hospitalityflow.co.uk';
```

### 3. Sign in and provision Hospitality Flow Pilot Lab

1. Sign in as the dedicated operator account.
2. Open `account.html`.
3. Confirm you see:
   - **Your account** → Platform Operator → Open Operator Dashboard
   - **Your workspace** → Create Pilot Lab workspace
4. Click **Create Pilot Lab workspace**.
5. Confirm the workspace card shows **Hospitality Flow Pilot Lab** / Internal testing workspace.

The browser calls RPC `create_operator_pilot_lab_workspace`. Non-operators cannot execute it successfully. If the account already owns Pilot Lab, the RPC returns the existing workspace (idempotent). If the account already belongs to a different hotel, creation is rejected.

### 4. Confirm Operator Dashboard works

1. From Account, open **Open Operator Dashboard** (`operator.html`).
2. Confirm applications load (or an empty authorised state).
3. Confirm you are not signed into a Zetter membership on this account.

### 5. Confirm Pilot Lab Hotel Brain saves only to Pilot Lab

1. Open Hotel Brain profile while signed in as the operator.
2. Make a harmless test change and save (Demo Mode **off**).
3. In SQL Editor, confirm the profile row uses the Pilot Lab hotel id:

```sql
SELECT h.id, h.name, b.updated_at
FROM public.hotel_brain_profiles b
JOIN public.hotels h ON h.id = b.hotel_id
WHERE h.name = 'Hospitality Flow Pilot Lab';
```

4. Confirm no new Brain row appeared for Zetter Marylebone from this save.

### 6. Confirm Pilot Lab handovers save only to Pilot Lab

1. Open AI Shift Handover (Demo Mode **off**).
2. Save a draft or saved handover.
3. Confirm rows are scoped to Pilot Lab:

```sql
SELECT hr.id, hr.status, hr.workspace_id, h.name
FROM public.handover_reports hr
JOIN public.hotels h ON h.id = hr.workspace_id
WHERE h.name = 'Hospitality Flow Pilot Lab'
ORDER BY hr.updated_at DESC
LIMIT 10;
```

### 7. Confirm no Zetter data is visible

While signed in as the dedicated operator / Pilot Lab account:

1. Hotel Brain must not show Zetter Marylebone content.
2. Handover list must not show Zetter reports.
3. Maintenance must not show Zetter issues.
4. Account page must not mention Zetter Marylebone.

Optional SQL check (operator user id):

```sql
-- Replace :operator_user_id
SELECT h.id, h.name
FROM public.hotel_members hm
JOIN public.hotels h ON h.id = hm.hotel_id
WHERE hm.user_id = :operator_user_id;
```

Expect exactly one row: Hospitality Flow Pilot Lab.

### 8. Only after successful verification — clean the normal Zetter account

Only after successful verification, remove operator capability from the normal Zetter account.

If the historical Zetter login still has operator capability:

1. Keep its Zetter Marylebone membership.
2. Remove operator capability from that account only:

```sql
-- Replace with the Zetter account email
DELETE FROM public.platform_operators
WHERE lower(email) = 'zetter.user@example.com';
```

3. Confirm that account still has Zetter membership and **no** `platform_operators` row.
4. Sign in as that account and confirm Account shows **Your workspace → Zetter Marylebone** only (no Operator card).

Do **not** delete hotel memberships in this step.

### 9. Invite Zetter colleagues as normal hotel members

Invite colleagues through the normal hotel membership path for Zetter Marylebone only.

- Do **not** insert them into `platform_operators`.
- Do **not** grant them Pilot Lab membership.

### 10. Verify colleagues cannot access the Operator Dashboard

For each Zetter colleague account:

1. Sign in.
2. Open `account.html` — no Platform Operator card.
3. Open `operator.html` directly — Access denied / redirect.
4. Confirm Edge Functions reject non-operator JWTs.

---

## Rollback

### Remove Pilot Lab membership (operator account)

Only if you intentionally want the operator account to have no hotel workspace again:

```sql
-- Inspect first
SELECT hm.*, h.name
FROM public.hotel_members hm
JOIN public.hotels h ON h.id = hm.hotel_id
WHERE h.name = 'Hospitality Flow Pilot Lab';

-- Delete membership for the operator user only (replace user id)
DELETE FROM public.hotel_members
WHERE user_id = :operator_user_id
  AND hotel_id = :pilot_lab_hotel_id;
```

Optionally delete the empty Pilot Lab hotel row if no other members/data should remain. Prefer leaving Brain/handover rows unless you are sure they are disposable test data.

### Restore operator capability on a previous account

```sql
INSERT INTO public.platform_operators (user_id, email)
SELECT id, lower(email)
FROM auth.users
WHERE lower(email) = 'previous@example.com'
ON CONFLICT (user_id) DO UPDATE
SET email = EXCLUDED.email;
```

### Re-add a removed Zetter membership

Do this only with an explicit operational decision. Prefer the supported membership/invite path for the hotel; do not invent ad-hoc inserts unless you understand RLS and owner roles.

---

## Security rules (do not weaken)

- `platform_operators` does not grant hotel data access.
- `hotel_members` does not grant operator access.
- Ordinary users cannot call Pilot Lab provisioning successfully.
- `create_hotel_workspace` remains invited/active only — operator status alone cannot create a normal hotel workspace.
- Demo Mode must continue to reject persistent writes.
- Never put the service role key in browser code.

---

## Related docs

- [`docs/OPERATOR_INVITE.md`](../OPERATOR_INVITE.md) — Founding Pilot approve & invite
- [`docs/PRODUCT_PRINCIPLES.md`](../PRODUCT_PRINCIPLES.md) — product philosophy
- [`docs/pilot-validation/PILOT_PLAYBOOK.md`](../pilot-validation/PILOT_PLAYBOOK.md) — pilot session process
