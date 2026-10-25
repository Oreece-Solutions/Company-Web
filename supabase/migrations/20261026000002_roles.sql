-- Roles with real limits (enforced by RLS, not just the UI):
--   admin       everything, incl. deletes of commercial records, prices, team access
--   staff       sales + delivery work; cannot delete money records or approve prices
--   accountant  reads everything; can create/edit invoices and payments only
-- Everyone with any role can read (is_team_member); nobody without a role sees anything.

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(_user_id, 'admin') $$;

CREATE OR REPLACE FUNCTION public.can_sell(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'staff') $$;

CREATE OR REPLACE FUNCTION public.can_bill(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'staff') OR public.has_role(_user_id, 'accountant') $$;

-- Replace every write policy on the business tables; read policies stay as they are.
DO $$
DECLARE
  pol RECORD;
  t TEXT;
  -- table → [insert/update rule, delete rule]
  rules JSONB := '{
    "clients":        ["can_sell", "is_admin"],
    "contacts":       ["can_sell", "can_sell"],
    "activities":     ["can_sell", "can_sell"],
    "deals":          ["can_sell", "is_admin"],
    "follow_ups":     ["can_sell", "can_sell"],
    "quotes":         ["can_sell", "is_admin"],
    "invoices":       ["can_bill", "is_admin"],
    "payments":       ["can_bill", "is_admin"],
    "projects":       ["can_sell", "is_admin"],
    "tasks":          ["can_sell", "can_sell"],
    "prospects":      ["can_sell", "can_sell"],
    "services":       ["is_admin", "is_admin"],
    "weekly_reviews": ["can_sell", "is_admin"],
    "contractors":    ["can_sell", "is_admin"],
    "client_systems": ["can_sell", "is_admin"]
  }';
  write_fn TEXT;
  delete_fn TEXT;
BEGIN
  FOR t IN SELECT jsonb_object_keys(rules) LOOP
    FOR pol IN SELECT policyname FROM pg_policies
               WHERE schemaname = 'public' AND tablename = t AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL') LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, t);
    END LOOP;
    write_fn := rules -> t ->> 0;
    delete_fn := rules -> t ->> 1;
    EXECUTE format('CREATE POLICY "Write %1$s (%2$s)" ON public.%1$I FOR INSERT WITH CHECK (public.%2$I(auth.uid()))', t, write_fn);
    EXECUTE format('CREATE POLICY "Update %1$s (%2$s)" ON public.%1$I FOR UPDATE USING (public.%2$I(auth.uid())) WITH CHECK (public.%2$I(auth.uid()))', t, write_fn);
    EXECUTE format('CREATE POLICY "Delete %1$s (%2$s)" ON public.%1$I FOR DELETE USING (public.%2$I(auth.uid()))', t, delete_fn);
  END LOOP;
END
$$;

-- Price approval is an admin decision even though staff may draft services.
-- (services writes are admin-only above; this keeps that explicit for readers.)
COMMENT ON TABLE public.services IS 'Offer catalogue. Only admins can add, change or delete services and prices.';

-- Team list for the Settings screen: names + roles (no emails needed).
CREATE OR REPLACE FUNCTION public.team_members()
RETURNS TABLE (user_id UUID, full_name TEXT, email TEXT, roles TEXT[], joined_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can manage the team' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN QUERY
  SELECT u.id, p.full_name, u.email::text,
         coalesce(array_agg(r.role::text ORDER BY r.role) FILTER (WHERE r.role IS NOT NULL), '{}'),
         p.created_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  LEFT JOIN public.user_roles r ON r.user_id = u.id
  GROUP BY u.id, p.full_name, u.email, p.created_at
  ORDER BY p.created_at NULLS LAST;
END;
$$;

-- Give someone exactly one role (or none). Admins cannot remove their own admin role,
-- so the company can never be locked out.
CREATE OR REPLACE FUNCTION public.set_member_role(_user_id UUID, _role TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can manage the team' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF _user_id = auth.uid() AND coalesce(_role, '') <> 'admin' THEN
    RAISE EXCEPTION 'You cannot remove your own admin access' USING ERRCODE = 'check_violation';
  END IF;
  IF _role IS NOT NULL AND _role NOT IN ('admin', 'staff', 'accountant') THEN
    RAISE EXCEPTION 'Unknown role %', _role USING ERRCODE = 'check_violation';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  IF _role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role::public.app_role);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.team_members() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_member_role(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_members() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_member_role(UUID, TEXT) TO authenticated;
