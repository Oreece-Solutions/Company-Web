-- Audit trail: every insert, update and delete on the business records, with
-- who did it (auth.uid()), when, and which fields changed. Written only by
-- triggers; team members can read it; nobody can edit or delete it.

CREATE TABLE public.audit_log (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  -- For updates: { column: [old, new] } for changed columns only.
  -- For inserts/deletes: the whole row (new or old).
  changes JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Short human label, e.g. the invoice number or business name.
  label TEXT,
  changed_by UUID,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX audit_log_record_idx ON public.audit_log (table_name, record_id, changed_at DESC);
CREATE INDEX audit_log_time_idx ON public.audit_log (changed_at DESC);

CREATE OR REPLACE FUNCTION public.audit_row()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_j JSONB := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END;
  new_j JSONB := CASE WHEN TG_OP IN ('UPDATE', 'INSERT') THEN to_jsonb(NEW) END;
  row_j JSONB := coalesce(new_j, old_j);
  diff JSONB := '{}'::jsonb;
  k TEXT;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    FOR k IN SELECT jsonb_object_keys(new_j) LOOP
      -- updated_at changes on every write; it is not a business change.
      IF k <> 'updated_at' AND (new_j -> k) IS DISTINCT FROM (old_j -> k) THEN
        diff := diff || jsonb_build_object(k, jsonb_build_array(old_j -> k, new_j -> k));
      END IF;
    END LOOP;
    IF diff = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
  ELSE
    diff := row_j;
  END IF;

  INSERT INTO audit_log (table_name, record_id, action, changes, label, changed_by)
  VALUES (
    TG_TABLE_NAME,
    (row_j ->> 'id')::uuid,
    lower(TG_OP),
    diff,
    coalesce(row_j ->> 'invoice_number', row_j ->> 'quote_number', row_j ->> 'business_name',
             row_j ->> 'company_name', row_j ->> 'title', row_j ->> 'name', row_j ->> 'full_name',
             row_j ->> 'reference'),
    auth.uid()
  );
  RETURN coalesce(NEW, OLD);
END;
$$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'clients', 'contacts', 'deals', 'follow_ups', 'quotes', 'invoices', 'payments',
    'projects', 'tasks', 'prospects', 'services', 'contractors', 'client_systems',
    'company_settings', 'user_roles'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.audit_row()', t);
  END LOOP;
END
$$;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can view the audit log" ON public.audit_log
  FOR SELECT USING (public.is_team_member(auth.uid()));
-- No insert/update/delete policies: only the trigger (security definer) writes.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.audit_log FROM anon, authenticated;
