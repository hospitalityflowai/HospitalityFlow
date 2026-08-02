# Early Access Submit — Edge-Only Path (F-A03)

**Decision:** `submit_early_access_application` is **not** a public RPC.

## Why

The Edge Function `submit-early-access-application` owns privileged behaviour that the bare RPC does not:

- Input validation aligned with product rules
- Abuse rate limiting
- Internal call to `send-early-access-emails` (secret header)
- Consistent server logging

Granting `EXECUTE` to `anon` / `authenticated` allowed PostgREST callers to skip that path. Direct `INSERT` on `early_access_applications` was a second bypass.

## Migration

Apply on each environment (non-production first):

1. `supabase/migrations/20260802180000_early_access_submit_edge_only.sql`
2. `supabase/migrations/20260802182000_early_access_submit_rate_limit.sql` (durable Edge rate-limit attempts; service_role only)

Effects:

1. Hardens RPC validation (lengths, email shape, room_count bounds)
2. `REVOKE` execute from `anon` / `authenticated`; `GRANT` to `service_role` only
3. Drops `early_access_insert_public` and revokes client `INSERT`
4. Adds `check_early_access_submit_rate_limit` + attempt log for Edge abuse protection

## Callers

| Caller | Path |
|--------|------|
| Landing form (`js/early-access.js`) | Edge Function only (unchanged) |
| Edge Function | service_role → RPC |
| Browser PostgREST RPC | Denied after migration |
| Browser table INSERT | Denied after migration |
| Operator list/invite | Unchanged (separate Edge Functions) |

## Deploy note

Redeploy `submit-early-access-application` after pulling shared validation / rate-limit changes. This document does not deploy for you.

## Tests

```bash
node scripts/test-early-access-submit-authz.mjs
node scripts/test-early-access-email-security.mjs
```
