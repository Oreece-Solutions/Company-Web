-- Platform foundation: shared organization model + role-based access
--
-- Replaces oreece-main's original per-user SaaS schema (every signup got
-- its own isolated `companies` row and RLS scoped by `user_id = auth.uid()`)
-- with a single shared organization that any invited staff member can
-- access. `user_id` columns are kept for audit ("who created this row"),
-- not for access control.

-- ============================================================
-- Roles
-- ============================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'accountant');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER: avoids recursive RLS when policies below check roles.
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Any invited team member (any role) counts as staff for shared-data access.
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id
  )
$$;

CREATE POLICY "Team members can view roles" ON public.user_roles
  FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- Profiles (one per auth user, own-row editable, team-visible)
-- ============================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view profiles" ON public.profiles
  FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- Company settings (single shared row, not per-user)
-- ============================================================

CREATE TABLE public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Oreece',
  address TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  website TEXT DEFAULT '',
  tax_number TEXT DEFAULT '',
  logo_url TEXT,
  bank_account_name TEXT DEFAULT '',
  bank_name TEXT DEFAULT '',
  bank_account_type TEXT DEFAULT '',
  bank_account_number TEXT DEFAULT '',
  bank_branch TEXT DEFAULT '',
  signature_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view company settings" ON public.company_settings
  FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "Admins can update company settings" ON public.company_settings
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Seed the single company row.
INSERT INTO public.company_settings (name, email) VALUES ('Oreece', 'info@oreece.com');

-- ============================================================
-- Clients
-- ============================================================

CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view clients" ON public.clients
  FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can insert clients" ON public.clients
  FOR INSERT WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can update clients" ON public.clients
  FOR UPDATE USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can delete clients" ON public.clients
  FOR DELETE USING (public.is_team_member(auth.uid()));

-- ============================================================
-- Invoices
-- ============================================================

CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Unpaid',
  payment_date DATE,
  payment_amount DECIMAL(12,2),
  payment_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view invoices" ON public.invoices
  FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can insert invoices" ON public.invoices
  FOR INSERT WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can update invoices" ON public.invoices
  FOR UPDATE USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can delete invoices" ON public.invoices
  FOR DELETE USING (public.is_team_member(auth.uid()));

-- ============================================================
-- Payments
-- ============================================================

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL,
  reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view payments" ON public.payments
  FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can insert payments" ON public.payments
  FOR INSERT WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can update payments" ON public.payments
  FOR UPDATE USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can delete payments" ON public.payments
  FOR DELETE USING (public.is_team_member(auth.uid()));

-- ============================================================
-- Triggers
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- On signup, create a profile only (no per-user company / no role).
-- The first real user must be promoted manually:
--   insert into public.user_roles (user_id, role) values ('<uid>', 'admin');
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Recompute invoice status/payment totals whenever payments change.
CREATE OR REPLACE FUNCTION public.update_invoice_status_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_paid NUMERIC;
  invoice_total NUMERIC;
BEGIN
  SELECT i.total, COALESCE(SUM(p.amount), 0)
  INTO invoice_total, total_paid
  FROM invoices i
  LEFT JOIN payments p ON p.invoice_id = i.id
  WHERE i.id = COALESCE(NEW.invoice_id, OLD.invoice_id)
  GROUP BY i.id, i.total;

  UPDATE invoices
  SET status = CASE
    WHEN total_paid >= invoice_total THEN 'Paid'
    WHEN total_paid > 0 THEN 'Partially Paid'
    ELSE 'Unpaid'
  END,
  payment_amount = total_paid,
  payment_date = CASE
    WHEN total_paid >= invoice_total THEN CURRENT_DATE
    ELSE NULL
  END
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER on_payment_insert
  AFTER INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_invoice_status_on_payment();
CREATE TRIGGER on_payment_update
  AFTER UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_invoice_status_on_payment();
CREATE TRIGGER on_payment_delete
  AFTER DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_invoice_status_on_payment();
