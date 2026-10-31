-- Delivery and people: time on projects, client support after launch, and hiring.
--   time_entries       who worked how long on which project (and task); feeds project profit
--   support_requests   client issues after go-live, with priority, status and response times
--   job_openings       roles Oreece is hiring for
--   job_applications   candidates and where they are in the hiring process (admin only: personal data)

-- ============================================================
-- Time entries
-- ============================================================

CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  worked_on DATE NOT NULL DEFAULT CURRENT_DATE,
  minutes INTEGER NOT NULL CHECK (minutes > 0 AND minutes <= 1440),
  description TEXT,
  billable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX time_entries_project_idx ON public.time_entries (project_id, worked_on DESC);
CREATE INDEX time_entries_user_idx ON public.time_entries (user_id, worked_on DESC);

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can view time" ON public.time_entries
  FOR SELECT USING (public.is_team_member(auth.uid()));
-- People log their own time; the founder can correct anyone's.
CREATE POLICY "Sellers log their own time" ON public.time_entries
  FOR INSERT WITH CHECK (public.can_sell(auth.uid()) AND (user_id = auth.uid() OR public.is_admin(auth.uid())));
CREATE POLICY "Own time or admin can update" ON public.time_entries
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (public.can_sell(auth.uid()) AND (user_id = auth.uid() OR public.is_admin(auth.uid())));
CREATE POLICY "Own time or admin can delete" ON public.time_entries
  FOR DELETE USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE TRIGGER update_time_entries_updated_at
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Support requests
-- ============================================================

CREATE TABLE public.support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  system_id UUID REFERENCES public.client_systems(id) ON DELETE SET NULL,
  retainer_id UUID REFERENCES public.retainers(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (btrim(title) <> ''),
  details TEXT,
  reported_by TEXT,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'phone', 'message', 'meeting', 'other')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_on_client', 'resolved')),
  -- Covered by a retainer, or to be billed separately.
  billable BOOLEAN NOT NULL DEFAULT false,
  assigned_to UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  first_response_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution TEXT,
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX support_requests_open_idx ON public.support_requests (status, priority) WHERE status <> 'resolved';
CREATE INDEX support_requests_client_idx ON public.support_requests (client_id);

ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can view support requests" ON public.support_requests
  FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "Sellers can add support requests" ON public.support_requests
  FOR INSERT WITH CHECK (public.can_sell(auth.uid()));
CREATE POLICY "Sellers can update support requests" ON public.support_requests
  FOR UPDATE USING (public.can_sell(auth.uid())) WITH CHECK (public.can_sell(auth.uid()));
CREATE POLICY "Admins can delete support requests" ON public.support_requests
  FOR DELETE USING (public.is_admin(auth.uid()));

-- Response and resolution times are stamped by the database, not typed in:
-- leaving 'open' is the first response; reaching 'resolved' stamps the fix
-- (reopening clears it).
CREATE OR REPLACE FUNCTION public.support_requests_before_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'open' AND NEW.first_response_at IS NULL THEN
    NEW.first_response_at := now();
  END IF;
  IF NEW.status = 'resolved' THEN
    NEW.resolved_at := coalesce(NEW.resolved_at, now());
  ELSE
    NEW.resolved_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER support_requests_before_write
  BEFORE INSERT OR UPDATE ON public.support_requests
  FOR EACH ROW EXECUTE FUNCTION public.support_requests_before_write();

CREATE TRIGGER update_support_requests_updated_at
  BEFORE UPDATE ON public.support_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Hiring
-- ============================================================

CREATE TABLE public.job_openings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (btrim(title) <> ''),
  employment_type TEXT NOT NULL DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'internship')),
  location TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('draft', 'open', 'closed')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opening_id UUID REFERENCES public.job_openings(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL CHECK (btrim(full_name) <> ''),
  email TEXT,
  phone TEXT,
  location TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  cv_url TEXT,
  source TEXT NOT NULL DEFAULT 'email' CHECK (source IN ('email', 'website', 'referral', 'linkedin', 'seek', 'other')),
  stage TEXT NOT NULL DEFAULT 'new' CHECK (stage IN ('new', 'screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn')),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  -- Work rights matter for NZ hiring (citizen, resident, visa conditions).
  work_rights TEXT,
  notes TEXT,
  next_step TEXT,
  next_step_date DATE,
  applied_on DATE NOT NULL DEFAULT CURRENT_DATE,
  stage_changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX job_applications_opening_idx ON public.job_applications (opening_id, stage);

-- Candidates' personal information: the founder only (Privacy Act 2020).
ALTER TABLE public.job_openings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can view openings" ON public.job_openings
  FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "Admins manage openings" ON public.job_openings
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage applications" ON public.job_applications
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.job_applications_stage_stamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    NEW.stage_changed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER job_applications_stage_stamp
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.job_applications_stage_stamp();

CREATE TRIGGER update_job_openings_updated_at
  BEFORE UPDATE ON public.job_openings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_job_applications_updated_at
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Audit trail
-- ============================================================
-- job_applications is left out on purpose: the whole team can read the audit
-- log, and candidates' details are for the founder only.

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['time_entries', 'support_requests', 'job_openings'] LOOP
    EXECUTE format(
      'CREATE TRIGGER audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.audit_row()', t);
  END LOOP;
END
$$;
