-- CRM: pipeline fields on clients + activity log + public lead capture

CREATE TYPE public.client_status AS ENUM ('lead', 'prospect', 'active', 'inactive');

ALTER TABLE public.clients
  ADD COLUMN status public.client_status NOT NULL DEFAULT 'lead',
  ADD COLUMN source TEXT,
  ADD COLUMN estimated_value DECIMAL(12,2),
  ADD COLUMN last_contacted_at TIMESTAMP WITH TIME ZONE;

-- Existing rows (created before this migration, e.g. via manual testing)
-- are real clients, not fresh leads.
UPDATE public.clients SET status = 'active' WHERE status = 'lead';

CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'note', -- call | email | meeting | note
  note TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view activities" ON public.activities
  FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can insert activities" ON public.activities
  FOR INSERT WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can update activities" ON public.activities
  FOR UPDATE USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can delete activities" ON public.activities
  FOR DELETE USING (public.is_team_member(auth.uid()));

-- No anonymous INSERT policy on clients: the marketing site's contact form
-- creates leads via the send-contact-email edge function, which uses the
-- service role key and so bypasses RLS entirely. Adding a public INSERT
-- policy here would just be unused, unnecessary write surface on a
-- production business table.
