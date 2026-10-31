-- Money: recurring income, costs and GST, so HQ shows whether the company makes money.
--   retainers                 recurring work billed monthly / quarterly / yearly (support, hosting, care plans)
--   invoice_due_retainers()   turns every retainer that is due into an unpaid invoice and moves it to the next period
--   expenses                  what the company spends, with GST claimable or not
--   company_settings.gst_*    GST registration, rate and accounting basis (NZ)
--   gst_summary()             GST on sales and purchases for a period, to prepare the return
--
-- Read: anyone who can bill (admin, staff, accountant). Write: same. Delete: admin only.

-- ============================================================
-- Retainers
-- ============================================================

CREATE TABLE public.retainers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  name TEXT NOT NULL CHECK (btrim(name) <> ''),
  description TEXT,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'NZD',
  billing_interval TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'quarterly', 'yearly')),
  next_invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_terms_days INTEGER NOT NULL DEFAULT 14 CHECK (payment_terms_days BETWEEN 0 AND 120),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  last_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT retainers_end_after_start CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX retainers_client_idx ON public.retainers (client_id);
CREATE INDEX retainers_due_idx ON public.retainers (next_invoice_date) WHERE status = 'active';

ALTER TABLE public.retainers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Billing roles can view retainers" ON public.retainers
  FOR SELECT USING (public.can_bill(auth.uid()));
CREATE POLICY "Billing roles can add retainers" ON public.retainers
  FOR INSERT WITH CHECK (public.can_bill(auth.uid()));
CREATE POLICY "Billing roles can update retainers" ON public.retainers
  FOR UPDATE USING (public.can_bill(auth.uid())) WITH CHECK (public.can_bill(auth.uid()));
CREATE POLICY "Admins can delete retainers" ON public.retainers
  FOR DELETE USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_retainers_updated_at
  BEFORE UPDATE ON public.retainers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.invoices
  ADD COLUMN retainer_id UUID REFERENCES public.retainers(id) ON DELETE SET NULL;
CREATE INDEX invoices_retainer_idx ON public.invoices (retainer_id) WHERE retainer_id IS NOT NULL;

-- Create the invoices for every active retainer that is due on or before _as_of.
-- A retainer that fell behind gets one invoice per missed period (at most 12 per
-- call). Runs as the caller, so RLS applies. Returns the number of invoices made.
CREATE OR REPLACE FUNCTION public.invoice_due_retainers(_as_of DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  r retainers%ROWTYPE;
  step INTERVAL;
  made INTEGER := 0;
  per_retainer INTEGER;
  invoice_count BIGINT;
  period_end DATE;
  new_invoice_id UUID;
BEGIN
  IF NOT public.can_bill(auth.uid()) THEN
    RAISE EXCEPTION 'Only admin, staff or accountant can create invoices' USING ERRCODE = 'insufficient_privilege';
  END IF;

  FOR r IN
    SELECT * FROM retainers
    WHERE status = 'active' AND next_invoice_date <= _as_of
    ORDER BY next_invoice_date
    FOR UPDATE
  LOOP
    step := CASE r.billing_interval WHEN 'monthly' THEN interval '1 month'
                                    WHEN 'quarterly' THEN interval '3 months'
                                    ELSE interval '1 year' END;
    per_retainer := 0;
    WHILE r.next_invoice_date <= _as_of
          AND (r.end_date IS NULL OR r.next_invoice_date <= r.end_date)
          AND per_retainer < 12 LOOP
      period_end := (r.next_invoice_date + step - interval '1 day')::date;
      -- Same numbering scheme as the invoice form and convert_quote_to_invoice().
      SELECT count(*) INTO invoice_count FROM invoices;
      INSERT INTO invoices (user_id, client_id, invoice_number, date, due_date, items, subtotal, total, notes, status, currency, retainer_id)
      VALUES (
        auth.uid(), r.client_id,
        'INV-' || to_char(now(), 'YYMM') || '-' || lpad((invoice_count + 1)::text, 4, '0'),
        r.next_invoice_date, r.next_invoice_date + r.payment_terms_days,
        jsonb_build_array(jsonb_build_object(
          'id', 'item-0',
          'description', r.name || ' (' || to_char(r.next_invoice_date, 'DD Mon YYYY') || ' – ' || to_char(period_end, 'DD Mon YYYY') || ')',
          'amount', r.amount)),
        r.amount, r.amount,
        coalesce(nullif(r.description, ''), 'Retainer: ' || r.name),
        'Unpaid', r.currency, r.id)
      RETURNING id INTO new_invoice_id;

      r.next_invoice_date := (r.next_invoice_date + step)::date;
      r.last_invoice_id := new_invoice_id;
      per_retainer := per_retainer + 1;
      made := made + 1;
    END LOOP;

    UPDATE retainers
    SET next_invoice_date = r.next_invoice_date,
        last_invoice_id = r.last_invoice_id,
        status = CASE WHEN r.end_date IS NOT NULL AND r.next_invoice_date > r.end_date THEN 'ended' ELSE status END
    WHERE id = r.id;
  END LOOP;

  RETURN made;
END;
$$;

REVOKE ALL ON FUNCTION public.invoice_due_retainers(DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invoice_due_retainers(DATE) TO authenticated;

-- ============================================================
-- Expenses
-- ============================================================

CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spent_on DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier TEXT NOT NULL CHECK (btrim(supplier) <> ''),
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN (
    'software', 'hosting', 'contractors', 'marketing', 'equipment', 'office',
    'travel', 'professional_fees', 'bank_fees', 'other')),
  -- What was paid, including any GST.
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'NZD',
  -- NZ GST can be claimed back (supplier GST-registered and a tax invoice kept).
  gst_claimable BOOLEAN NOT NULL DEFAULT true,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  contractor_id UUID REFERENCES public.contractors(id) ON DELETE SET NULL,
  receipt_url TEXT,
  notes TEXT,
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX expenses_spent_on_idx ON public.expenses (spent_on DESC);
CREATE INDEX expenses_project_idx ON public.expenses (project_id) WHERE project_id IS NOT NULL;

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Billing roles can view expenses" ON public.expenses
  FOR SELECT USING (public.can_bill(auth.uid()));
CREATE POLICY "Billing roles can add expenses" ON public.expenses
  FOR INSERT WITH CHECK (public.can_bill(auth.uid()));
CREATE POLICY "Billing roles can update expenses" ON public.expenses
  FOR UPDATE USING (public.can_bill(auth.uid())) WITH CHECK (public.can_bill(auth.uid()));
CREATE POLICY "Admins can delete expenses" ON public.expenses
  FOR DELETE USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- GST (New Zealand)
-- ============================================================

ALTER TABLE public.company_settings
  ADD COLUMN gst_registered BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN gst_rate DECIMAL(5,2) NOT NULL DEFAULT 15 CHECK (gst_rate >= 0 AND gst_rate < 100),
  -- payments: GST when money comes in / goes out; invoice: when invoiced / billed.
  ADD COLUMN gst_basis TEXT NOT NULL DEFAULT 'payments' CHECK (gst_basis IN ('payments', 'invoice'));

-- GST for a period. Amounts are GST-inclusive, so GST = amount × rate / (100 + rate).
-- Only NZD counts: invoices in other currencies are treated as exported services
-- (zero-rated) and listed separately. Runs as the caller (RLS applies).
-- An estimate to prepare the return; the accountant / IRD return is the record.
CREATE OR REPLACE FUNCTION public.gst_summary(_from DATE, _to DATE)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  s company_settings%ROWTYPE;
  sales NUMERIC;
  zero_rated NUMERIC;
  purchases NUMERIC;
  not_claimable NUMERIC;
BEGIN
  IF NOT public.can_bill(auth.uid()) THEN
    RAISE EXCEPTION 'Only admin, staff or accountant can see GST' USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT * INTO s FROM company_settings ORDER BY created_at LIMIT 1;

  IF coalesce(s.gst_basis, 'payments') = 'payments' THEN
    SELECT coalesce(sum(p.amount) FILTER (WHERE i.currency = 'NZD'), 0),
           coalesce(sum(p.amount) FILTER (WHERE i.currency <> 'NZD'), 0)
      INTO sales, zero_rated
      FROM payments p JOIN invoices i ON i.id = p.invoice_id
     WHERE p.payment_date BETWEEN _from AND _to;
  ELSE
    SELECT coalesce(sum(total) FILTER (WHERE currency = 'NZD'), 0),
           coalesce(sum(total) FILTER (WHERE currency <> 'NZD'), 0)
      INTO sales, zero_rated
      FROM invoices
     WHERE date BETWEEN _from AND _to;
  END IF;

  SELECT coalesce(sum(amount) FILTER (WHERE gst_claimable), 0),
         coalesce(sum(amount) FILTER (WHERE NOT gst_claimable), 0)
    INTO purchases, not_claimable
    FROM expenses
   WHERE currency = 'NZD' AND spent_on BETWEEN _from AND _to;

  RETURN jsonb_build_object(
    'registered', coalesce(s.gst_registered, false),
    'rate', coalesce(s.gst_rate, 15),
    'basis', coalesce(s.gst_basis, 'payments'),
    'sales_incl', sales,
    'zero_rated_sales', zero_rated,
    'purchases_incl', purchases,
    'purchases_not_claimable', not_claimable,
    'gst_on_sales', round(sales * coalesce(s.gst_rate, 15) / (100 + coalesce(s.gst_rate, 15)), 2),
    'gst_on_purchases', round(purchases * coalesce(s.gst_rate, 15) / (100 + coalesce(s.gst_rate, 15)), 2),
    'gst_to_pay', round((sales - purchases) * coalesce(s.gst_rate, 15) / (100 + coalesce(s.gst_rate, 15)), 2));
END;
$$;

REVOKE ALL ON FUNCTION public.gst_summary(DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gst_summary(DATE, DATE) TO authenticated;

-- ============================================================
-- Audit trail
-- ============================================================

CREATE TRIGGER audit_retainers AFTER INSERT OR UPDATE OR DELETE ON public.retainers
  FOR EACH ROW EXECUTE FUNCTION public.audit_row();
CREATE TRIGGER audit_expenses AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.audit_row();
