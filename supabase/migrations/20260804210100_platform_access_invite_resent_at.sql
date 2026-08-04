-- Hospitality Flow — track pilot invite resends without overloading invited_at
-- Safe to re-run.

ALTER TABLE public.platform_access
  ADD COLUMN IF NOT EXISTS invite_resent_at timestamptz;

COMMENT ON COLUMN public.platform_access.invite_resent_at IS
  'Last time an operator resent a setup-password / invite link via resend-pilot-invite. invited_at remains the first successful invite.';
