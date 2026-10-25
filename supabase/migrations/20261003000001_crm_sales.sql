-- Sales CRM (Phase A): accounts + contacts, deal pipeline with stage history,
-- follow-ups, quotes that convert into invoices, won deal -> project.
--
-- public.clients stays the account record: social.* (Oreece Social OS) and
-- the website's send-contact-email function both write/reference it.

-- ============================================================
-- Shared helpers
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_currency_code(_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT _code ~ '^[A-Z]{3}$'
$$;

-- ============================================================
-- Accounts (public.clients) + company defaults
-- ============================================================

ALTER TABLE public.clients
  ADD COLUMN industry TEXT,
  ADD COLUMN website TEXT,
  ADD COLUMN country TEXT,
  ADD COLUMN notes TEXT,
  ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX clients_status_idx ON public.clients (status);
CREATE INDEX clients_owner_idx ON public.clients (owner_id);

ALTER TABLE public.company_settings
  ADD COLUMN default_currency TEXT NOT NULL DEFAULT 'LKR'
    CHECK (public.is_currency_code(default_currency)),
  ADD COLUMN quote_terms TEXT DEFAULT '';

-- The invoice form always offered a currency but the table never stored it,
-- so every invoice was shown as LKR. Existing rows keep that.
ALTER TABLE public.invoices
  ADD COLUMN currency TEXT NOT NULL DEFAULT 'LKR'
    CHECK (public.is_currency_code(currency));

-- ============================================================
-- Contacts (people at an account)
-- ============================================================

CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL CHECK (btrim(full_name) <> ''),
  job_title TEXT,
  email TEXT,
  phone TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (id, client_id)
);

CREATE INDEX contacts_client_idx ON public.contacts (client_id);
CREATE UNIQUE INDEX contacts_one_primary_per_client
  ON public.contacts (client_id) WHERE is_primary;

-- Every existing account gets its contact person as the primary contact.
INSERT INTO public.contacts (client_id, full_name, email, phone, is_primary, created_at)
SELECT id, name, email, phone, true, created_at
FROM public.clients
WHERE btrim(name) <> '';

-- New accounts (from the platform or the website contact form) get one too.
CREATE OR REPLACE FUNCTION public.create_primary_contact()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF btrim(NEW.name) <> '' THEN
    INSERT INTO contacts (client_id, full_name, email, phone, is_primary, created_by)
    VALUES (NEW.id, NEW.name, NEW.email, NEW.phone, true, NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_client_created_add_contact
  AFTER INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.create_primary_contact();

-- ============================================================
-- Deals (the sales pipeline)
-- ============================================================

CREATE TYPE public.deal_stage AS ENUM (
  'lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'
);

CREATE OR REPLACE FUNCTION public.deal_stage_probability(_stage public.deal_stage)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _stage
    WHEN 'lead' THEN 10
    WHEN 'qualified' THEN 25
    WHEN 'proposal' THEN 50
    WHEN 'negotiation' THEN 75
    WHEN 'won' THEN 100
    WHEN 'lost' THEN 0
  END
$$;

CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contact_id UUID,
  title TEXT NOT NULL CHECK (btrim(title) <> ''),
  stage public.deal_stage NOT NULL DEFAULT 'lead',
  value NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (value >= 0),
  currency TEXT NOT NULL DEFAULT 'LKR' CHECK (public.is_currency_code(currency)),
  probability INTEGER CHECK (probability BETWEEN 0 AND 100),
  service_type TEXT,
  source TEXT,
  expected_close_date DATE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  lost_reason TEXT,
  closed_at TIMESTAMP WITH TIME ZONE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (id, client_id),
  -- The contact must belong to the same account.
  FOREIGN KEY (contact_id, client_id) REFERENCES public.contacts (id, client_id)
    ON DELETE SET NULL (contact_id),
  CONSTRAINT deals_lost_needs_reason
    CHECK (stage <> 'lost' OR btrim(coalesce(lost_reason, '')) <> '')
);

CREATE INDEX deals_client_idx ON public.deals (client_id);
CREATE INDEX deals_stage_idx ON public.deals (stage);
CREATE INDEX deals_owner_idx ON public.deals (owner_id);

-- Probability follows the stage unless someone set it explicitly;
-- closed_at is set when a deal is won or lost and cleared if reopened.
CREATE OR REPLACE FUNCTION public.deals_before_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.probability IS NULL THEN
      NEW.probability := deal_stage_probability(NEW.stage);
    END IF;
  ELSIF NEW.stage IS DISTINCT FROM OLD.stage THEN
    IF NEW.probability IS NOT DISTINCT FROM OLD.probability OR NEW.probability IS NULL THEN
      NEW.probability := deal_stage_probability(NEW.stage);
    END IF;
  END IF;

  IF NEW.stage IN ('won', 'lost') THEN
    NEW.probability := deal_stage_probability(NEW.stage);
    IF TG_OP = 'INSERT' OR NEW.stage IS DISTINCT FROM OLD.stage THEN
      NEW.closed_at := now();
    ELSE
      NEW.closed_at := coalesce(NEW.closed_at, OLD.closed_at, now());
    END IF;
    IF NEW.stage = 'won' THEN
      NEW.lost_reason := NULL;
    END IF;
  ELSE
    NEW.closed_at := NULL;
    NEW.lost_reason := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER deals_before_write
  BEFORE INSERT OR UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.deals_before_write();

-- Stage history: every stage a deal enters, who moved it and when.
CREATE TABLE public.deal_stage_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  from_stage public.deal_stage,
  to_stage public.deal_stage NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX deal_stage_changes_deal_idx ON public.deal_stage_changes (deal_id, changed_at);

-- After a deal is written: record the stage change and move the account
-- along (lead -> prospect once qualified, -> active once won).
CREATE OR REPLACE FUNCTION public.deals_after_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.stage IS DISTINCT FROM OLD.stage THEN
    INSERT INTO deal_stage_changes (deal_id, from_stage, to_stage, changed_by)
    VALUES (
      NEW.id,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.stage END,
      NEW.stage,
      auth.uid()
    );

    IF NEW.stage = 'won' THEN
      UPDATE clients SET status = 'active'
      WHERE id = NEW.client_id AND status <> 'active';
    ELSIF NEW.stage IN ('qualified', 'proposal', 'negotiation') THEN
      UPDATE clients SET status = 'prospect'
      WHERE id = NEW.client_id AND status = 'lead';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER deals_after_write
  AFTER INSERT OR UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.deals_after_write();

-- ============================================================
-- Activities: link to deals/contacts, keep last_contacted_at true
-- ============================================================

ALTER TABLE public.activities
  ADD COLUMN deal_id UUID,
  ADD COLUMN contact_id UUID,
  ADD CONSTRAINT activities_deal_fk FOREIGN KEY (deal_id, client_id)
    REFERENCES public.deals (id, client_id) ON DELETE SET NULL (deal_id),
  ADD CONSTRAINT activities_contact_fk FOREIGN KEY (contact_id, client_id)
    REFERENCES public.contacts (id, client_id) ON DELETE SET NULL (contact_id),
  -- NOT VALID: enforced for new rows without failing on any legacy value.
  ADD CONSTRAINT activities_type_check
    CHECK (type IN ('call', 'email', 'meeting', 'note')) NOT VALID;

CREATE INDEX activities_client_idx ON public.activities (client_id, created_at DESC);
CREATE INDEX activities_deal_idx ON public.activities (deal_id);

-- Calls, emails and meetings count as contact; notes do not.
CREATE OR REPLACE FUNCTION public.touch_client_last_contacted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.type IN ('call', 'email', 'meeting') THEN
    UPDATE clients
    SET last_contacted_at = NEW.created_at
    WHERE id = NEW.client_id
      AND (last_contacted_at IS NULL OR last_contacted_at < NEW.created_at);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_activity_touch_client
  AFTER INSERT ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.touch_client_last_contacted();

-- ============================================================
-- Follow-ups (dated next steps for an account or deal)
-- ============================================================

CREATE TABLE public.follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  deal_id UUID,
  title TEXT NOT NULL CHECK (btrim(title) <> ''),
  due_date DATE NOT NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (deal_id, client_id) REFERENCES public.deals (id, client_id)
    ON DELETE CASCADE
);

CREATE INDEX follow_ups_open_idx ON public.follow_ups (due_date) WHERE completed_at IS NULL;
CREATE INDEX follow_ups_client_idx ON public.follow_ups (client_id);
CREATE INDEX follow_ups_deal_idx ON public.follow_ups (deal_id);

-- ============================================================
-- Quotes
-- ============================================================

CREATE TYPE public.quote_status AS ENUM ('draft', 'sent', 'accepted', 'declined', 'expired');

CREATE SEQUENCE public.quote_number_seq;

CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT NOT NULL UNIQUE DEFAULT (
    'Q-' || to_char(now(), 'YYMM') || '-' || lpad(nextval('public.quote_number_seq')::text, 4, '0')
  ),
  -- Quotes are commercial records: an account with quotes cannot be deleted.
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  deal_id UUID,
  contact_id UUID,
  title TEXT NOT NULL DEFAULT '',
  status public.quote_status NOT NULL DEFAULT 'draft',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  currency TEXT NOT NULL DEFAULT 'LKR' CHECK (public.is_currency_code(currency)),
  -- [{ "description": text, "quantity": number > 0, "unit_price": number >= 0 }]
  items JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(items) = 'array'),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (tax_rate BETWEEN 0 AND 100),
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  terms TEXT,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  decided_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (deal_id, client_id) REFERENCES public.deals (id, client_id)
    ON DELETE SET NULL (deal_id),
  FOREIGN KEY (contact_id, client_id) REFERENCES public.contacts (id, client_id)
    ON DELETE SET NULL (contact_id),
  CHECK (valid_until IS NULL OR valid_until >= issue_date)
);

CREATE INDEX quotes_client_idx ON public.quotes (client_id);
CREATE INDEX quotes_deal_idx ON public.quotes (deal_id);
CREATE INDEX quotes_status_idx ON public.quotes (status);

-- Totals are always computed here from the line items, never trusted from the
-- browser. A quote that has been invoiced is frozen.
CREATE OR REPLACE FUNCTION public.quotes_before_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  item JSONB;
  qty NUMERIC;
  price NUMERIC;
  sub NUMERIC := 0;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.invoice_id IS NOT NULL AND (
       NEW.items IS DISTINCT FROM OLD.items
    OR NEW.discount IS DISTINCT FROM OLD.discount
    OR NEW.tax_rate IS DISTINCT FROM OLD.tax_rate
    OR NEW.currency IS DISTINCT FROM OLD.currency
    OR NEW.client_id IS DISTINCT FROM OLD.client_id
  ) THEN
    RAISE EXCEPTION 'Quote % has been invoiced and can no longer be changed', OLD.quote_number
      USING ERRCODE = 'check_violation';
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items) LOOP
    IF jsonb_typeof(item) <> 'object'
       OR btrim(coalesce(item->>'description', '')) = ''
       OR jsonb_typeof(item->'quantity') <> 'number'
       OR jsonb_typeof(item->'unit_price') <> 'number' THEN
      RAISE EXCEPTION 'Each quote line needs a description, a quantity and a unit price'
        USING ERRCODE = 'check_violation';
    END IF;
    qty := (item->>'quantity')::numeric;
    price := (item->>'unit_price')::numeric;
    IF qty <= 0 OR price < 0 THEN
      RAISE EXCEPTION 'Quote line quantities must be positive and prices not negative'
        USING ERRCODE = 'check_violation';
    END IF;
    sub := sub + round(qty * price, 2);
  END LOOP;

  IF NEW.discount > sub THEN
    RAISE EXCEPTION 'Discount cannot be larger than the subtotal'
      USING ERRCODE = 'check_violation';
  END IF;

  NEW.subtotal := sub;
  NEW.tax_amount := round((sub - NEW.discount) * NEW.tax_rate / 100, 2);
  NEW.total := sub - NEW.discount + NEW.tax_amount;

  IF NEW.status = 'sent' AND NEW.sent_at IS NULL THEN
    NEW.sent_at := now();
  END IF;
  IF NEW.status IN ('accepted', 'declined') THEN
    NEW.decided_at := coalesce(NEW.decided_at, now());
  ELSE
    NEW.decided_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER quotes_before_write
  BEFORE INSERT OR UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.quotes_before_write();

-- ============================================================
-- Actions (called from the platform with supabase.rpc; RLS applies)
-- ============================================================

-- Turn a sent or accepted quote into an invoice. Safe to call twice: the
-- second call returns the invoice already created.
CREATE OR REPLACE FUNCTION public.convert_quote_to_invoice(_quote_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  q quotes%ROWTYPE;
  inv_items JSONB := '[]'::jsonb;
  item JSONB;
  n INTEGER := 0;
  qty NUMERIC;
  invoice_count BIGINT;
  new_invoice_id UUID;
BEGIN
  SELECT * INTO q FROM quotes WHERE id = _quote_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found' USING ERRCODE = 'no_data_found';
  END IF;
  IF q.invoice_id IS NOT NULL THEN
    RETURN q.invoice_id;
  END IF;
  IF q.status NOT IN ('sent', 'accepted') THEN
    RAISE EXCEPTION 'Only a sent or accepted quote can be invoiced (quote % is %)', q.quote_number, q.status
      USING ERRCODE = 'check_violation';
  END IF;
  IF jsonb_array_length(q.items) = 0 THEN
    RAISE EXCEPTION 'Quote % has no line items', q.quote_number
      USING ERRCODE = 'check_violation';
  END IF;

  -- Invoice lines are { id, description, amount }; quantity is folded into
  -- the description, discount and tax become their own lines.
  FOR item IN SELECT * FROM jsonb_array_elements(q.items) LOOP
    qty := (item->>'quantity')::numeric;
    inv_items := inv_items || jsonb_build_array(jsonb_build_object(
      'id', 'item-' || n,
      'description', CASE WHEN qty = 1 THEN item->>'description'
                          ELSE (item->>'description') || ' (' || trim_scale(qty) || ' × ' || trim_scale((item->>'unit_price')::numeric) || ')'
                     END,
      'amount', round(qty * (item->>'unit_price')::numeric, 2)
    ));
    n := n + 1;
  END LOOP;
  IF q.discount > 0 THEN
    inv_items := inv_items || jsonb_build_array(jsonb_build_object(
      'id', 'item-' || n, 'description', 'Discount', 'amount', -q.discount));
    n := n + 1;
  END IF;
  IF q.tax_amount > 0 THEN
    inv_items := inv_items || jsonb_build_array(jsonb_build_object(
      'id', 'item-' || n, 'description', 'Tax (' || trim_scale(q.tax_rate) || '%)', 'amount', q.tax_amount));
  END IF;

  -- Same numbering scheme as the platform's invoice form.
  SELECT count(*) INTO invoice_count FROM invoices;

  INSERT INTO invoices (
    user_id, client_id, project_id, invoice_number, date, due_date,
    items, subtotal, total, notes, status, currency
  )
  SELECT
    auth.uid(), q.client_id, d.project_id,
    'INV-' || to_char(now(), 'YYMM') || '-' || lpad((invoice_count + 1)::text, 4, '0'),
    CURRENT_DATE, CURRENT_DATE + 14,
    inv_items, q.total, q.total,
    'From quote ' || q.quote_number || coalesce(E'\n' || nullif(q.notes, ''), ''),
    'Unpaid', q.currency
  FROM (SELECT 1) AS one
  LEFT JOIN deals d ON d.id = q.deal_id
  RETURNING id INTO new_invoice_id;

  UPDATE quotes
  SET invoice_id = new_invoice_id, status = 'accepted'
  WHERE id = q.id;

  RETURN new_invoice_id;
END;
$$;

-- Mark a deal won and, optionally, open a delivery project for it.
-- Returns the project id (existing or new), or NULL when none was requested.
CREATE OR REPLACE FUNCTION public.win_deal(_deal_id UUID, _create_project BOOLEAN DEFAULT true)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  d deals%ROWTYPE;
  new_project_id UUID;
BEGIN
  SELECT * INTO d FROM deals WHERE id = _deal_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deal not found' USING ERRCODE = 'no_data_found';
  END IF;

  new_project_id := d.project_id;
  IF _create_project AND new_project_id IS NULL THEN
    INSERT INTO projects (client_id, name, description, status, budget, created_by)
    VALUES (d.client_id, d.title, 'Created from won deal', 'planning', d.value, auth.uid())
    RETURNING id INTO new_project_id;
  END IF;

  UPDATE deals
  SET stage = 'won', project_id = new_project_id
  WHERE id = d.id;

  RETURN new_project_id;
END;
$$;

-- ============================================================
-- Row-level security (same model as the rest of the platform)
-- ============================================================

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_stage_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view contacts" ON public.contacts
  FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can insert contacts" ON public.contacts
  FOR INSERT WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can update contacts" ON public.contacts
  FOR UPDATE USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can delete contacts" ON public.contacts
  FOR DELETE USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team members can view deals" ON public.deals
  FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can insert deals" ON public.deals
  FOR INSERT WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can update deals" ON public.deals
  FOR UPDATE USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can delete deals" ON public.deals
  FOR DELETE USING (public.is_team_member(auth.uid()));

-- History is written only by the deals trigger; people can read it.
CREATE POLICY "Team members can view deal stage changes" ON public.deal_stage_changes
  FOR SELECT USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team members can view follow-ups" ON public.follow_ups
  FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can insert follow-ups" ON public.follow_ups
  FOR INSERT WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can update follow-ups" ON public.follow_ups
  FOR UPDATE USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can delete follow-ups" ON public.follow_ups
  FOR DELETE USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team members can view quotes" ON public.quotes
  FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can insert quotes" ON public.quotes
  FOR INSERT WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can update quotes" ON public.quotes
  FOR UPDATE USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can delete quotes" ON public.quotes
  FOR DELETE USING (public.is_team_member(auth.uid()));

-- ============================================================
-- updated_at
-- ============================================================

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_follow_ups_updated_at BEFORE UPDATE ON public.follow_ups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
