-- Hospitality Flow — Phase 10: Invitation-only platform access enforcement
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS public.platform_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  email_lower text GENERATED ALWAYS AS (lower(email)) STORED,
  access_status text NOT NULL DEFAULT 'pending_application',
  early_access_application_id uuid REFERENCES public.early_access_applications(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_access_status_check
    CHECK (access_status IN ('pending_application', 'approved', 'invited', 'active', 'suspended'))
);

CREATE UNIQUE INDEX IF NOT EXISTS platform_access_email_lower_idx
  ON public.platform_access (email_lower);

CREATE INDEX IF NOT EXISTS platform_access_status_idx
  ON public.platform_access (access_status);

COMMENT ON TABLE public.platform_access IS
  'Invitation-only access control. Applicants get pending_application; approved users are invited/active.';

ALTER TABLE public.platform_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_access_select_own" ON public.platform_access;
CREATE POLICY "platform_access_select_own"
  ON public.platform_access
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON public.platform_access FROM anon, authenticated;
GRANT SELECT ON public.platform_access TO authenticated;

-- Grandfather existing workspace members (e.g. Zetter) as active.
INSERT INTO public.platform_access (user_id, email, access_status)
SELECT u.id, lower(u.email), 'active'
FROM auth.users u
INNER JOIN public.hotel_members hm ON hm.user_id = u.id
ON CONFLICT (user_id) DO UPDATE
SET access_status = 'active',
    email = EXCLUDED.email,
    updated_at = now();

-- Backfill pending rows for existing applications without platform rows.
INSERT INTO public.platform_access (email, access_status, early_access_application_id)
SELECT lower(eaa.email), 'pending_application', eaa.id
FROM public.early_access_applications eaa
WHERE NOT EXISTS (
  SELECT 1
  FROM public.platform_access pa
  WHERE lower(pa.email) = lower(eaa.email)
)
ON CONFLICT (email_lower) DO NOTHING;

CREATE OR REPLACE FUNCTION public.link_platform_access_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.platform_access
  SET user_id = NEW.id,
      email = lower(NEW.email),
      updated_at = now()
  WHERE user_id IS NULL
    AND lower(email) = lower(NEW.email);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_link_platform_access ON auth.users;
CREATE TRIGGER on_auth_user_created_link_platform_access
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_platform_access_user();

CREATE OR REPLACE FUNCTION public.get_my_platform_access()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_status text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'allowed', false,
      'reason', 'NOT_AUTHENTICATED'
    );
  END IF;

  SELECT lower(email) INTO v_email
  FROM auth.users
  WHERE id = v_user_id;

  IF EXISTS (SELECT 1 FROM public.hotel_members WHERE user_id = v_user_id) THEN
    RETURN json_build_object(
      'allowed', true,
      'access_status', 'active',
      'has_membership', true
    );
  END IF;

  SELECT pa.access_status
  INTO v_status
  FROM public.platform_access pa
  WHERE pa.user_id = v_user_id
     OR (pa.user_id IS NULL AND lower(pa.email) = v_email)
  ORDER BY CASE WHEN pa.user_id = v_user_id THEN 0 ELSE 1 END, pa.updated_at DESC
  LIMIT 1;

  IF v_status IN ('active', 'invited') THEN
    RETURN json_build_object(
      'allowed', true,
      'access_status', v_status,
      'has_membership', false
    );
  END IF;

  RETURN json_build_object(
    'allowed', false,
    'access_status', coalesce(v_status, 'none'),
    'reason', 'NOT_APPROVED'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_password_reset_allowed(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(p_email));
  v_user_id uuid;
  v_status text;
BEGIN
  IF coalesce(v_email, '') = '' THEN
    RETURN false;
  END IF;

  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = v_email;

  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF EXISTS (SELECT 1 FROM public.hotel_members WHERE user_id = v_user_id) THEN
    RETURN true;
  END IF;

  SELECT pa.access_status
  INTO v_status
  FROM public.platform_access pa
  WHERE pa.user_id = v_user_id
     OR lower(pa.email) = v_email
  ORDER BY CASE WHEN pa.user_id = v_user_id THEN 0 ELSE 1 END, pa.updated_at DESC
  LIMIT 1;

  RETURN v_status IN ('active', 'invited');
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_early_access_application(
  p_first_name text,
  p_email text,
  p_property_name text,
  p_property_type text,
  p_room_count integer,
  p_role text,
  p_source text DEFAULT 'early-access-programme'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_email text;
BEGIN
  v_email := lower(trim(p_email));

  IF coalesce(trim(p_first_name), '') = ''
    OR coalesce(v_email, '') = ''
    OR coalesce(trim(p_property_name), '') = ''
    OR coalesce(trim(p_property_type), '') = ''
    OR coalesce(trim(p_role), '') = '' THEN
    RAISE EXCEPTION 'Missing required application fields';
  END IF;

  SELECT id INTO v_id
  FROM public.early_access_applications
  WHERE email = v_email
    AND founding_status = 'pending'
  ORDER BY submitted_at DESC
  LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO public.early_access_applications (
      first_name,
      email,
      property_name,
      property_type,
      room_count,
      role,
      source,
      founding_status
    )
    VALUES (
      trim(p_first_name),
      v_email,
      trim(p_property_name),
      trim(p_property_type),
      p_room_count,
      trim(p_role),
      coalesce(nullif(trim(p_source), ''), 'early-access-programme'),
      'pending'
    )
    RETURNING id INTO v_id;
  END IF;

  INSERT INTO public.platform_access (email, access_status, early_access_application_id)
  VALUES (v_email, 'pending_application', v_id)
  ON CONFLICT (email_lower) DO UPDATE
  SET access_status = CASE
        WHEN public.platform_access.access_status IN ('active', 'invited', 'approved')
          THEN public.platform_access.access_status
        ELSE 'pending_application'
      END,
      early_access_application_id = coalesce(public.platform_access.early_access_application_id, EXCLUDED.early_access_application_id),
      updated_at = now();

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_hotel_workspace(
  p_name text,
  p_property_type text,
  p_number_of_rooms integer,
  p_city text,
  p_country text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_hotel_id uuid;
  v_email text;
  v_status text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.hotel_members WHERE user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'User already belongs to a hotel workspace';
  END IF;

  SELECT lower(email) INTO v_email FROM auth.users WHERE id = v_user_id;

  SELECT pa.access_status
  INTO v_status
  FROM public.platform_access pa
  WHERE pa.user_id = v_user_id
     OR (pa.user_id IS NULL AND lower(pa.email) = v_email)
  ORDER BY CASE WHEN pa.user_id = v_user_id THEN 0 ELSE 1 END, pa.updated_at DESC
  LIMIT 1;

  IF coalesce(v_status, 'none') NOT IN ('active', 'invited') THEN
    RAISE EXCEPTION 'Platform access has not been approved';
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Hotel name is required';
  END IF;

  INSERT INTO public.hotels (
    name,
    property_type,
    number_of_rooms,
    city,
    country,
    status
  )
  VALUES (
    trim(p_name),
    p_property_type,
    p_number_of_rooms,
    trim(p_city),
    trim(p_country),
    'active'
  )
  RETURNING id INTO v_hotel_id;

  INSERT INTO public.hotel_members (hotel_id, user_id, role)
  VALUES (v_hotel_id, v_user_id, 'owner');

  UPDATE public.platform_access
  SET access_status = 'active',
      user_id = v_user_id,
      email = v_email,
      updated_at = now()
  WHERE user_id = v_user_id
     OR lower(email) = v_email;

  RETURN json_build_object(
    'hotel_id', v_hotel_id,
    'role', 'owner'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_platform_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_platform_access() TO authenticated;

REVOKE ALL ON FUNCTION public.is_password_reset_allowed(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_password_reset_allowed(text) TO service_role;

REVOKE ALL ON FUNCTION public.submit_early_access_application(text, text, text, text, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_early_access_application(text, text, text, text, integer, text, text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.create_hotel_workspace(text, text, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_hotel_workspace(text, text, integer, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_platform_access_from_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.platform_access (email, access_status, early_access_application_id)
  VALUES (lower(NEW.email), 'pending_application', NEW.id)
  ON CONFLICT (email_lower) DO UPDATE
  SET access_status = CASE
        WHEN public.platform_access.access_status IN ('active', 'invited', 'approved')
          THEN public.platform_access.access_status
        ELSE 'pending_application'
      END,
      early_access_application_id = coalesce(public.platform_access.early_access_application_id, EXCLUDED.early_access_application_id),
      updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_early_access_application_sync_platform_access ON public.early_access_applications;
CREATE TRIGGER on_early_access_application_sync_platform_access
  AFTER INSERT ON public.early_access_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_platform_access_from_application();
