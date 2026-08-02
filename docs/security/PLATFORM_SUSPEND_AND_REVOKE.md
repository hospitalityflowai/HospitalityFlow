# Platform suspend & revoke playbook

Hospitality Flow keeps **platform access** (`platform_access`) and **hotel membership** (`hotel_members`) as separate concepts.

As of Audit 2 Remediation Step 1, **`access_status = 'suspended'` is a global application deny**. It overrides membership and operator capability for Hospitality Flow app access, workspace resolution in the product UI, password-reset eligibility, and operator Edge Functions. There is **no emergency operator bypass** in code.

RLS workspace isolation is unchanged: deleting a `hotel_members` row still removes hotel-data access immediately for that JWT.

---

## 1. Suspend (global application deny)

**Intent:** Stop the user using Hospitality Flow. Keep membership so reactivation is easy later.

**Actions (Supabase SQL Editor or Table Editor):**

```sql
UPDATE public.platform_access
SET access_status = 'suspended',
    updated_at = now()
WHERE user_id = '<auth-user-uuid>'
   OR lower(email) = lower('<user@email>');
```

**Effects:**

| Surface | Result |
|--------|--------|
| `get_my_platform_access` | `allowed: false`, `reason: SUSPENDED` |
| `has_active_platform_access()` | `false` |
| Login (`guardSignInResult`) | Signs out; shows suspended message |
| Account / product pages | Access denied; workspace cache cleared |
| Password reset (HF Edge Function) | Not eligible (`is_password_reset_allowed` → false); neutral response |
| Operator dashboard / Edge invite/list | Denied |
| `hotel_members` row | **Unchanged** (soft suspend) |
| Direct PostgREST with JWT + remaining membership | **Denied** — RLS requires membership **and** `has_active_platform_access()` |

**Do not** delete membership for a soft suspend if you plan to unsuspend and restore the same hotel.

---

## 2. Remove from hotel (workspace-data denial)

**Intent:** Remove hotel-data access only. Platform status is unchanged unless you also suspend.

**Actions:**

```sql
DELETE FROM public.hotel_members
WHERE user_id = '<auth-user-uuid>'
  AND hotel_id = '<hotel-uuid>';
-- Or delete all memberships for the user:
DELETE FROM public.hotel_members
WHERE user_id = '<auth-user-uuid>';
```

**Effects:**

- Same JWT loses SELECT/INSERT/UPDATE on that hotel’s Brain, handovers, maintenance (RLS) — proven in Launch Gate #1 live suite.
- Frontend `getUserWorkspace` returns no workspace (and if platform access is still invited/active/operator, they may create or use another allowed path).
- Does **not** by itself set `platform_access` to suspended.

---

## 3. Hard revoke (full permanent removal)

**Intent:** User must not use the app **and** must not retain hotel-data access.

**Checklist:**

1. **Suspend platform access** (section 1).
2. **Delete all hotel memberships** (section 2, all rows for that `user_id`).
3. **Revoke Auth sessions** (manual Supabase step — not automated in HF today):
   - Supabase Dashboard → **Authentication** → **Users** → select user → **Sign out** / invalidate sessions if available  
   - Or Auth Admin API: delete user, or ban user, depending on your ops preference.
4. Optional: remove from `platform_operators` if they were an operator:

```sql
DELETE FROM public.platform_operators
WHERE user_id = '<auth-user-uuid>';
```

5. Optional hard delete of Auth user (irreversible): Dashboard → Authentication → Delete user  
   (`platform_access.user_id` and `hotel_members` FKs cascade / set-null per schema).

---

## 4. Unsuspend

```sql
UPDATE public.platform_access
SET access_status = 'active',  -- or 'invited' if they never completed workspace
    updated_at = now()
WHERE user_id = '<auth-user-uuid>'
   OR lower(email) = lower('<user@email>');
```

**Rules:**

- Unsuspend restores **platform** allow when status is `active` / `invited` (or membership / operator paths apply).
- Unsuspend does **not** recreate a deleted `hotel_members` row.
- If membership still exists, workspace resolves again after a fresh `get_my_platform_access` check.
- If membership was removed, user sees no workspace until invited/active create flow (or operator Pilot Lab provision) — never auto-restored.

---

## 5. Migration deployment

Apply **in order** on the target project (non-prod first; do not auto-apply to production from this repo):

1. `supabase/migrations/20260802140000_platform_suspend_authoritative.sql` — application-plane RPCs  
2. `supabase/migrations/20260802153000_rls_require_active_platform_access.sql` — data-plane RLS helper + policies  

**Steps:**

1. Open the target Supabase project (non-prod first).
2. SQL Editor → run both migration files in order.
3. Confirm with:

```sql
SELECT public.has_active_platform_access(); -- as a signed-in active member → true

SELECT polname, tablename
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'hotels', 'hotel_members', 'hotel_brain_profiles',
    'handover_reports', 'maintenance_issues', 'maintenance_updates'
  )
ORDER BY tablename, polname;

SELECT proname
FROM pg_proc
WHERE proname IN (
  'has_active_platform_access',
  'get_my_platform_access',
  'is_password_reset_allowed',
  'create_hotel_workspace',
  'create_operator_pilot_lab_workspace',
  'update_hotel_workspace'
);
```

4. Redeploy Edge Functions that bundle `_shared/operator-auth.ts`:

```bash
npx supabase functions deploy invite-pilot-applicant
npx supabase functions deploy list-pilot-applications
```

5. Deploy updated frontend (`js/platform-access.js`, `js/workspace.js`, `js/auth.js`, `js/operator-dashboard.js`).

6. Live proof (non-prod only):

```bash
node scripts/test-live-rls-isolation.mjs
```

Expect section **D2. PLATFORM SUSPENSION** (S0–S9) to pass with the same JWT after `platform_access` is set to `suspended`.

---

## 6. Limitations

- **JWT lifetime:** Suspension is enforced on every RLS check via `has_active_platform_access()` and on app RPC checks. Existing JWTs are not deleted by the SQL update alone; PostgREST access is denied immediately without re-login. Product pages also sign out on deny. For Auth-session kill, use Auth Admin sign-out / ban (Hard revoke step 3).
- **Soft suspend vs hard revoke:** Soft suspend leaves `hotel_members` for easy reactivation but blocks both app and data planes. Hard revoke still deletes memberships and Auth sessions for permanent removal.
- **No emergency operator bypass** when `platform_access` is suspended.
- **SECURITY DEFINER RPCs** must keep explicit suspend checks (they bypass RLS). `update_hotel_workspace` now calls `has_active_platform_access()`.
