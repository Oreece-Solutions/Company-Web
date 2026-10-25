-- Oreece HQ: the platform becomes the company operating system.
--   prospects        Lead Finder: researched businesses with evidence, before they become accounts
--   services         Offer catalogue that quotes are built from
--   weekly_reviews   Friday founder review with an automatic metrics snapshot
--   contractors      People who deliver work; tasks carry a contractor brief
--   client_systems   Websites, domains, hosting, repos and their renewals
--   projects.health  On track / at risk / blocked, for the Today screen
--   social_*()       Approval queue for the Oreece Social OS (schema social)
--
-- Records only. Never store passwords, API keys or bank details in any of these
-- tables: refer to where a secret lives instead (e.g. "Vercel env").

-- ============================================================
-- Prospects (Lead Finder)
-- ============================================================

CREATE TYPE public.prospect_stage AS ENUM (
  'researching', 'ready', 'contacted', 'follow_up_due',
  'conversation_booked', 'nurture', 'converted', 'disqualified'
);

CREATE TABLE public.prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL CHECK (btrim(business_name) <> ''),
  website TEXT,
  industry TEXT,
  location TEXT,
  -- How we may contact them, e.g. "021 123 4567 (published)" or "site contact form".
  contact_channel TEXT,
  lead_source TEXT,
  observed_problem TEXT,
  evidence TEXT,
  tier TEXT CHECK (tier IN ('A', 'B', 'C')),
  stage public.prospect_stage NOT NULL DEFAULT 'researching',
  -- Why contacting them is allowed (NZ Unsolicited Electronic Messages Act).
  consent_basis TEXT,
  next_action TEXT,
  next_action_date DATE,
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  estimated_value NUMERIC(12,2) CHECK (estimated_value >= 0),
  currency TEXT NOT NULL DEFAULT 'NZD' CHECK (public.is_currency_code(currency)),
  notes TEXT,
  -- Latest website check: { status, ssl_days, viewport, form, ... } (see site_check).
  site_check JSONB,
  site_checked_at TIMESTAMP WITH TIME ZONE,
  disqualified_reason TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Never claim a business has a problem without saying how we know.
  CONSTRAINT prospects_problem_needs_evidence
    CHECK (btrim(coalesce(observed_problem, '')) = '' OR btrim(coalesce(evidence, '')) <> ''),
  -- No outreach without a recorded basis for contacting them.
  CONSTRAINT prospects_contact_needs_consent_basis
    CHECK (stage IN ('researching', 'ready', 'disqualified') OR btrim(coalesce(consent_basis, '')) <> ''),
  CONSTRAINT prospects_disqualified_needs_reason
    CHECK (stage <> 'disqualified' OR btrim(coalesce(disqualified_reason, '')) <> ''),
  CONSTRAINT prospects_converted_has_account
    CHECK (stage <> 'converted' OR client_id IS NOT NULL)
);

CREATE INDEX prospects_stage_idx ON public.prospects (stage);
CREATE INDEX prospects_next_action_idx ON public.prospects (next_action_date)
  WHERE stage NOT IN ('converted', 'disqualified');
-- One prospect per website (ignoring scheme, www and trailing slash).
CREATE UNIQUE INDEX prospects_website_unique ON public.prospects (
  lower(regexp_replace(regexp_replace(website, '^https?://(www\.)?', ''), '/+$', ''))
) WHERE website IS NOT NULL AND btrim(website) <> '';

-- Moving to "contacted" stamps last_contacted_at, unless the caller set it.
CREATE OR REPLACE FUNCTION public.prospects_before_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.stage = 'contacted' AND NEW.last_contacted_at IS NULL THEN
      NEW.last_contacted_at := now();
    END IF;
  ELSIF NEW.stage = 'contacted' AND OLD.stage <> 'contacted'
        AND NEW.last_contacted_at IS NOT DISTINCT FROM OLD.last_contacted_at THEN
    NEW.last_contacted_at := now();
  END IF;
  IF NEW.stage <> 'disqualified' THEN
    NEW.disqualified_reason := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prospects_before_write
  BEFORE INSERT OR UPDATE ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION public.prospects_before_write();

-- Turn a prospect into an account (+ primary contact via the clients trigger)
-- and an open deal. Safe to call twice: returns the deal already created.
CREATE OR REPLACE FUNCTION public.convert_prospect(
  _prospect_id UUID,
  _deal_title TEXT DEFAULT NULL,
  _contact_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  p prospects%ROWTYPE;
  new_client_id UUID;
  new_deal_id UUID;
BEGIN
  SELECT * INTO p FROM prospects WHERE id = _prospect_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prospect not found' USING ERRCODE = 'no_data_found';
  END IF;
  IF p.deal_id IS NOT NULL THEN
    RETURN p.deal_id;
  END IF;
  IF p.stage = 'disqualified' THEN
    RAISE EXCEPTION '% is disqualified; reopen it before converting', p.business_name
      USING ERRCODE = 'check_violation';
  END IF;

  new_client_id := p.client_id;
  IF new_client_id IS NULL THEN
    INSERT INTO clients (user_id, name, company_name, website, industry, source, status, notes, estimated_value)
    VALUES (
      auth.uid(),
      coalesce(nullif(btrim(_contact_name), ''), p.business_name),
      p.business_name,
      p.website,
      p.industry,
      coalesce(p.lead_source, 'Lead Finder'),
      'lead',
      concat_ws(E'\n',
        nullif('Problem: ' || p.observed_problem, 'Problem: '),
        nullif('Evidence: ' || p.evidence, 'Evidence: '),
        nullif('Contact: ' || p.contact_channel, 'Contact: '),
        p.notes),
      p.estimated_value
    )
    RETURNING id INTO new_client_id;
  END IF;

  INSERT INTO deals (client_id, title, stage, value, currency, source, created_by)
  VALUES (
    new_client_id,
    coalesce(nullif(btrim(_deal_title), ''), p.business_name || ' – website & digital'),
    'lead',
    coalesce(p.estimated_value, 0),
    p.currency,
    coalesce(p.lead_source, 'Lead Finder'),
    auth.uid()
  )
  RETURNING id INTO new_deal_id;

  UPDATE prospects
  SET stage = 'converted',
      client_id = new_client_id,
      deal_id = new_deal_id,
      consent_basis = coalesce(nullif(btrim(consent_basis), ''), 'Converted to account')
  WHERE id = p.id;

  RETURN new_deal_id;
END;
$$;

-- ============================================================
-- Projects: health for the Today screen
-- ============================================================

CREATE TYPE public.project_health AS ENUM ('on_track', 'at_risk', 'blocked');

ALTER TABLE public.projects
  ADD COLUMN health public.project_health NOT NULL DEFAULT 'on_track',
  ADD COLUMN next_milestone TEXT,
  ADD COLUMN waiting_on_client TEXT;

-- ============================================================
-- Services catalogue
-- ============================================================

CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (btrim(name) <> ''),
  category TEXT NOT NULL DEFAULT 'project' CHECK (category IN ('project', 'recurring', 'hourly', 'add_on')),
  description TEXT,
  deliverables TEXT,
  exclusions TEXT,
  -- NULL price = not decided yet. price_approved = a price the founder has actually quoted/approved.
  price NUMERIC(12,2) CHECK (price >= 0),
  price_approved BOOLEAN NOT NULL DEFAULT false,
  currency TEXT NOT NULL DEFAULT 'NZD' CHECK (public.is_currency_code(currency)),
  unit TEXT NOT NULL DEFAULT 'fixed' CHECK (unit IN ('fixed', 'month', 'hour')),
  estimated_hours NUMERIC(8,2) CHECK (estimated_hours >= 0),
  estimated_cost NUMERIC(12,2) CHECK (estimated_cost >= 0),
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT services_approved_needs_price CHECK (NOT price_approved OR price IS NOT NULL)
);

CREATE UNIQUE INDEX services_name_unique ON public.services (lower(name));

-- ============================================================
-- Weekly reviews
-- ============================================================

-- Numbers for the 7 days ending on _week_ending (inclusive). Money is kept per
-- currency; invoiced is not cash, and neither is profit.
CREATE OR REPLACE FUNCTION public.weekly_metrics(_week_ending DATE)
RETURNS JSONB
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH w AS (SELECT _week_ending - 6 AS d0, _week_ending AS d1)
  SELECT jsonb_build_object(
    'week_start', (SELECT d0 FROM w),
    'week_ending', (SELECT d1 FROM w),
    'prospects_added', (SELECT count(*) FROM prospects, w WHERE created_at::date BETWEEN d0 AND d1),
    'prospects_contacted', (SELECT count(*) FROM prospects, w WHERE last_contacted_at::date BETWEEN d0 AND d1),
    'conversations', (SELECT count(*) FROM activities, w
                      WHERE type IN ('call', 'meeting') AND created_at::date BETWEEN d0 AND d1),
    'deals_created', (SELECT count(*) FROM deals, w WHERE created_at::date BETWEEN d0 AND d1),
    'deals_won', (SELECT count(*) FROM deals, w WHERE stage = 'won' AND closed_at::date BETWEEN d0 AND d1),
    'deals_lost', (SELECT count(*) FROM deals, w WHERE stage = 'lost' AND closed_at::date BETWEEN d0 AND d1),
    'quotes_sent', (SELECT count(*) FROM quotes, w WHERE sent_at::date BETWEEN d0 AND d1),
    'invoiced', (SELECT coalesce(jsonb_object_agg(currency, amt), '{}'::jsonb) FROM (
                   SELECT currency, sum(total) AS amt FROM invoices, w
                   WHERE date BETWEEN d0 AND d1 GROUP BY currency) x),
    'cash_received', (SELECT coalesce(jsonb_object_agg(currency, amt), '{}'::jsonb) FROM (
                        SELECT i.currency, sum(p.amount) AS amt
                        FROM payments p JOIN invoices i ON i.id = p.invoice_id, w
                        WHERE p.payment_date BETWEEN d0 AND d1 GROUP BY i.currency) x),
    'outstanding', (SELECT coalesce(jsonb_object_agg(currency, amt), '{}'::jsonb) FROM (
                      SELECT i.currency, sum(i.total - coalesce(i.payment_amount, 0)) AS amt
                      FROM invoices i, w
                      WHERE i.date <= d1 AND lower(i.status) <> 'paid' GROUP BY i.currency) x),
    'open_pipeline', (SELECT coalesce(jsonb_object_agg(currency, amt), '{}'::jsonb) FROM (
                        SELECT currency, sum(value) AS amt FROM deals
                        WHERE stage NOT IN ('won', 'lost') GROUP BY currency) x),
    'follow_ups_overdue', (SELECT count(*) FROM follow_ups, w WHERE completed_at IS NULL AND due_date < d1),
    'projects_at_risk', (SELECT count(*) FROM projects WHERE status IN ('planning', 'active') AND health <> 'on_track'),
    'tasks_done', (SELECT count(*) FROM tasks, w WHERE status = 'done' AND updated_at::date BETWEEN d0 AND d1)
  )
$$;

CREATE TABLE public.weekly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_ending DATE NOT NULL UNIQUE,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Founder-supplied: what the database cannot know.
  hours_sales NUMERIC(5,1) CHECK (hours_sales >= 0),
  hours_delivery NUMERIC(5,1) CHECK (hours_delivery >= 0),
  hours_admin NUMERIC(5,1) CHECK (hours_admin >= 0),
  completed TEXT,
  blockers TEXT,
  marketing TEXT,
  notes TEXT,
  -- [{ "title", "why", "outcome", "next_step" }], at most three.
  priorities JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(priorities) = 'array' AND jsonb_array_length(priorities) <= 3),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create (or refresh the metrics of) the review for a week.
CREATE OR REPLACE FUNCTION public.refresh_weekly_review(_week_ending DATE)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  review_id UUID;
BEGIN
  INSERT INTO weekly_reviews (week_ending, metrics, created_by)
  VALUES (_week_ending, weekly_metrics(_week_ending), auth.uid())
  ON CONFLICT (week_ending) DO UPDATE SET metrics = EXCLUDED.metrics
  RETURNING id INTO review_id;
  RETURN review_id;
END;
$$;

-- ============================================================
-- Contractors + task briefs
-- ============================================================

CREATE TABLE public.contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (btrim(name) <> ''),
  skills TEXT[] NOT NULL DEFAULT '{}',
  email TEXT,
  phone TEXT,
  location TEXT,
  rate NUMERIC(12,2) CHECK (rate >= 0),
  rate_unit TEXT NOT NULL DEFAULT 'hour' CHECK (rate_unit IN ('hour', 'day', 'fixed')),
  currency TEXT NOT NULL DEFAULT 'NZD' CHECK (public.is_currency_code(currency)),
  agreement_signed_on DATE,
  confidentiality_signed BOOLEAN NOT NULL DEFAULT false,
  ip_assignment_signed BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks
  ADD COLUMN contractor_id UUID REFERENCES public.contractors(id) ON DELETE SET NULL,
  ADD COLUMN brief TEXT,
  ADD COLUMN definition_of_done TEXT,
  ADD COLUMN access_notes TEXT,
  ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX tasks_contractor_idx ON public.tasks (contractor_id);
CREATE INDEX tasks_open_due_idx ON public.tasks (due_date) WHERE status <> 'done';

-- Keep completed_at true to the status.
CREATE OR REPLACE FUNCTION public.tasks_completed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'done' THEN
    NEW.completed_at := coalesce(NEW.completed_at, now());
  ELSE
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tasks_completed_at
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.tasks_completed_at();

-- ============================================================
-- Client systems & renewals
-- ============================================================

CREATE TABLE public.client_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL = one of Oreece's own systems.
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('website', 'web_app', 'domain', 'hosting', 'repository', 'database', 'email', 'automation', 'social', 'other')),
  name TEXT NOT NULL CHECK (btrim(name) <> ''),
  url TEXT,
  provider TEXT,
  status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('building', 'live', 'paused', 'retired')),
  renews_on DATE,
  renewal_cost NUMERIC(12,2) CHECK (renewal_cost >= 0),
  currency TEXT NOT NULL DEFAULT 'NZD' CHECK (public.is_currency_code(currency)),
  -- Who pays the renewal, and whether it is covered by a care plan.
  paid_by TEXT NOT NULL DEFAULT 'client' CHECK (paid_by IN ('client', 'oreece')),
  on_care_plan BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX client_systems_client_idx ON public.client_systems (client_id);
CREATE INDEX client_systems_renewal_idx ON public.client_systems (renews_on) WHERE status <> 'retired';

-- ============================================================
-- Social OS approval queue (schema social, run by n8n)
-- ============================================================

-- Content waiting for a decision, plus what is approved/scheduled next.
CREATE OR REPLACE FUNCTION public.social_queue()
RETURNS TABLE (
  content_id UUID,
  approval_id UUID,
  brand TEXT,
  platform TEXT,
  format TEXT,
  status TEXT,
  headline TEXT,
  hook TEXT,
  caption TEXT,
  cta TEXT,
  hashtags TEXT[],
  link_url TEXT,
  revision INTEGER,
  feedback TEXT,
  slot_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, social
AS $$
BEGIN
  IF NOT public.is_team_member(auth.uid()) THEN
    RAISE EXCEPTION 'You do not have permission to do that' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN QUERY
  SELECT cp.id, a.id, b.name, cp.platform, cp.format, cp.status, cp.headline, cp.hook,
         cp.caption, cp.cta, cp.hashtags, cp.link_url, cp.revision, cp.feedback,
         (SELECT min(cs.slot_at) FROM social.calendar_slots cs WHERE cs.content_id = cp.id),
         cp.updated_at
  FROM social.content_pieces cp
  JOIN social.brands b ON b.id = cp.brand_id
  LEFT JOIN social.approvals a ON a.content_id = cp.id AND a.decision IS NULL
  WHERE cp.status IN ('NEEDS_APPROVAL', 'APPROVED', 'SCHEDULED', 'PUBLISHING', 'FAILED')
  ORDER BY (cp.status = 'NEEDS_APPROVAL') DESC, cp.updated_at DESC
  LIMIT 200;
END;
$$;

-- Approve / reject / request changes from the platform. The Social OS keeps
-- its own rules (revision checks, required feedback for changes).
CREATE OR REPLACE FUNCTION public.social_decide(_approval_id UUID, _decision TEXT, _feedback TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, social
AS $$
BEGIN
  IF NOT public.is_team_member(auth.uid()) THEN
    RAISE EXCEPTION 'You do not have permission to do that' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF _decision NOT IN ('approve', 'reject', 'changes') THEN
    RAISE EXCEPTION 'Decision must be approve, reject or changes' USING ERRCODE = 'check_violation';
  END IF;
  RETURN social.record_approval_decision(jsonb_build_object(
    'approval_id', _approval_id,
    'decision', _decision,
    'feedback', _feedback,
    'decided_by', 'platform:' || auth.uid()::text,
    'workflow', 'platform'
  ));
END;
$$;

REVOKE ALL ON FUNCTION public.social_queue() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.social_decide(UUID, TEXT, TEXT) FROM PUBLIC, anon;

-- ============================================================
-- Row-level security (same model as the rest of the platform)
-- ============================================================

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_systems ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['prospects', 'services', 'weekly_reviews', 'contractors', 'client_systems'] LOOP
    EXECUTE format('CREATE POLICY "Team members can view %1$s" ON public.%1$I FOR SELECT USING (public.is_team_member(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "Team members can insert %1$s" ON public.%1$I FOR INSERT WITH CHECK (public.is_team_member(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "Team members can update %1$s" ON public.%1$I FOR UPDATE USING (public.is_team_member(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "Team members can delete %1$s" ON public.%1$I FOR DELETE USING (public.is_team_member(auth.uid()))', t);
    EXECUTE format('CREATE TRIGGER update_%1$s_updated_at BEFORE UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t);
  END LOOP;
END
$$;
