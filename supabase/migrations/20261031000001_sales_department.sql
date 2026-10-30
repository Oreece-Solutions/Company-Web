-- Sales department: the system a first sales hire works in.
--   prospects.segment / assigned_to / discovery_at   target market, owner, booked discovery call
--   sales_activities    every research, contact, follow-up, conversation and booking, per person
--   log_sales_contact() / book_discovery()   the rep's two daily actions; both demand a next action
--   sales_targets       weekly trial targets (team default or per person)
--   sales_scoreboard()  actuals + quality per person for any date range
--   sales_templates     outreach scripts; only the founder can approve one for use
--   playbook_sections   the sales handbook (founder edits, team reads)
--   onboarding_plans / onboarding_items   30-day plan with the end-of-month assessment
--   team_directory()    names of team members for assignment (no emails)
--
-- Split of work: the rep researches, contacts, follows up and books discovery calls;
-- the founder runs discovery, prices, proposes and closes.

-- ============================================================
-- Prospects: segment, owner, discovery call
-- ============================================================

ALTER TABLE public.prospects
  ADD COLUMN segment TEXT CHECK (segment IN (
    'commercial_cleaning', 'residential_cleaning', 'specialist_cleaning',
    'automotive', 'handyman', 'other')),
  ADD COLUMN assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN discovery_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX prospects_assigned_idx ON public.prospects (assigned_to)
  WHERE stage NOT IN ('converted', 'disqualified');

-- Whoever researches a prospect owns it until someone reassigns it.
ALTER TABLE public.prospects ALTER COLUMN assigned_to SET DEFAULT auth.uid();

-- ============================================================
-- Sales activities
-- ============================================================

CREATE TABLE public.sales_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  kind TEXT NOT NULL CHECK (kind IN (
    'researched', 'qualified', 'first_contact', 'follow_up', 'conversation', 'meeting_booked', 'note')),
  channel TEXT CHECK (channel IN ('email', 'phone', 'linkedin', 'contact_form', 'in_person', 'other')),
  outcome TEXT,
  -- What the business pushed back with, in their words where possible.
  objection TEXT,
  -- Which offer was put to them (e.g. "Growth System", "Starter website").
  offer TEXT,
  notes TEXT,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT sales_activities_contact_needs_channel
    CHECK (kind NOT IN ('first_contact', 'follow_up', 'conversation') OR channel IS NOT NULL)
);

CREATE INDEX sales_activities_prospect_idx ON public.sales_activities (prospect_id, occurred_at DESC);
CREATE INDEX sales_activities_user_day_idx ON public.sales_activities (user_id, occurred_at);

ALTER TABLE public.sales_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can view sales activities" ON public.sales_activities
  FOR SELECT USING (public.is_team_member(auth.uid()));
-- People log their own work; the log is not edited afterwards.
CREATE POLICY "Sellers log their own activity" ON public.sales_activities
  FOR INSERT WITH CHECK (public.can_sell(auth.uid()) AND user_id = auth.uid());
CREATE POLICY "Admins can delete sales activities" ON public.sales_activities
  FOR DELETE USING (public.is_admin(auth.uid()));

-- Research, qualification and bookings are logged from the prospect itself, so
-- nobody has to log them twice. Runs as the table owner (the log has no
-- insert path for rows without a signed-in user otherwise).
CREATE OR REPLACE FUNCTION public.prospects_log_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  who UUID := coalesce(auth.uid(), NEW.created_by);
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO sales_activities (prospect_id, user_id, kind) VALUES (NEW.id, who, 'researched');
  END IF;
  IF NEW.stage = 'ready' AND (TG_OP = 'INSERT' OR OLD.stage = 'researching') THEN
    INSERT INTO sales_activities (prospect_id, user_id, kind) VALUES (NEW.id, who, 'qualified');
  END IF;
  IF NEW.stage = 'conversation_booked' AND (TG_OP = 'INSERT' OR OLD.stage <> 'conversation_booked') THEN
    INSERT INTO sales_activities (prospect_id, user_id, kind, notes)
    VALUES (NEW.id, who, 'meeting_booked',
            CASE WHEN NEW.discovery_at IS NOT NULL
                 THEN 'Discovery call ' || to_char(NEW.discovery_at AT TIME ZONE 'Pacific/Auckland', 'Dy DD Mon HH24:MI') END);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prospects_log_activity
  AFTER INSERT OR UPDATE OF stage ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION public.prospects_log_activity();

REVOKE ALL ON FUNCTION public.prospects_log_activity() FROM PUBLIC, anon, authenticated;

-- The rep's main action: record a contact, a conversation or a note, and say
-- what happens next. "contact" becomes first_contact or follow_up by itself.
-- Runs with the caller's rights, so RLS and the consent-basis rule still apply.
CREATE OR REPLACE FUNCTION public.log_sales_contact(
  _prospect_id UUID,
  _kind TEXT,
  _channel TEXT DEFAULT NULL,
  _outcome TEXT DEFAULT NULL,
  _objection TEXT DEFAULT NULL,
  _offer TEXT DEFAULT NULL,
  _notes TEXT DEFAULT NULL,
  _next_action TEXT DEFAULT NULL,
  _next_action_date DATE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  p prospects%ROWTYPE;
  k TEXT := _kind;
  new_id UUID;
BEGIN
  SELECT * INTO p FROM prospects WHERE id = _prospect_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prospect not found' USING ERRCODE = 'no_data_found';
  END IF;
  IF k NOT IN ('contact', 'conversation', 'note') THEN
    RAISE EXCEPTION 'Unknown activity %', k USING ERRCODE = 'check_violation';
  END IF;
  IF p.stage IN ('converted', 'disqualified') AND k <> 'note' THEN
    RAISE EXCEPTION '% is %; reopen it before logging contact', p.business_name, p.stage
      USING ERRCODE = 'check_violation';
  END IF;
  -- Every open prospect leaves with a clear next step.
  IF p.stage NOT IN ('converted', 'disqualified')
     AND (btrim(coalesce(_next_action, '')) = '' OR _next_action_date IS NULL) THEN
    RAISE EXCEPTION 'Set the next action and its date' USING ERRCODE = 'check_violation';
  END IF;

  IF k = 'contact' THEN
    k := CASE WHEN p.last_contacted_at IS NULL
               AND NOT EXISTS (SELECT 1 FROM sales_activities
                               WHERE prospect_id = p.id AND kind = 'first_contact')
              THEN 'first_contact' ELSE 'follow_up' END;
  END IF;

  INSERT INTO sales_activities (prospect_id, kind, channel, outcome, objection, offer, notes)
  VALUES (p.id, k, _channel, nullif(btrim(_outcome), ''), nullif(btrim(_objection), ''),
          nullif(btrim(_offer), ''), nullif(btrim(_notes), ''))
  RETURNING id INTO new_id;

  UPDATE prospects
  SET next_action = coalesce(nullif(btrim(_next_action), ''), next_action),
      next_action_date = coalesce(_next_action_date, next_action_date),
      last_contacted_at = CASE WHEN k IN ('first_contact', 'follow_up', 'conversation') THEN now() ELSE last_contacted_at END,
      stage = CASE WHEN k IN ('first_contact', 'follow_up', 'conversation')
                    AND stage IN ('researching', 'ready', 'follow_up_due') THEN 'contacted' ELSE stage END
  WHERE id = p.id;

  RETURN new_id;
END;
$$;

-- Book a discovery call for the founder. The trigger logs meeting_booked.
CREATE OR REPLACE FUNCTION public.book_discovery(
  _prospect_id UUID,
  _at TIMESTAMP WITH TIME ZONE,
  _notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  p prospects%ROWTYPE;
BEGIN
  SELECT * INTO p FROM prospects WHERE id = _prospect_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prospect not found' USING ERRCODE = 'no_data_found';
  END IF;
  IF _at IS NULL THEN
    RAISE EXCEPTION 'Choose a date and time for the call' USING ERRCODE = 'check_violation';
  END IF;
  IF p.stage IN ('converted', 'disqualified') THEN
    RAISE EXCEPTION '% is %; reopen it first', p.business_name, p.stage USING ERRCODE = 'check_violation';
  END IF;
  IF p.stage = 'conversation_booked' THEN
    -- Rescheduled: keep one meeting_booked entry, note the change.
    INSERT INTO sales_activities (prospect_id, kind, notes)
    VALUES (p.id, 'note', 'Discovery call moved to '
            || to_char(_at AT TIME ZONE 'Pacific/Auckland', 'Dy DD Mon HH24:MI')
            || coalesce('. ' || nullif(btrim(_notes), ''), ''));
  ELSIF btrim(coalesce(_notes, '')) <> '' THEN
    INSERT INTO sales_activities (prospect_id, kind, notes) VALUES (p.id, 'note', btrim(_notes));
  END IF;
  UPDATE prospects
  SET discovery_at = _at,
      stage = 'conversation_booked',
      next_action = 'Discovery call (founder)',
      next_action_date = (_at AT TIME ZONE 'Pacific/Auckland')::date
  WHERE id = p.id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_sales_contact(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.book_discovery(UUID, TIMESTAMP WITH TIME ZONE, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_sales_contact(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.book_discovery(UUID, TIMESTAMP WITH TIME ZONE, TEXT) TO authenticated;

-- ============================================================
-- Weekly targets
-- ============================================================

CREATE TABLE public.sales_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric TEXT NOT NULL CHECK (metric IN (
    'researched', 'qualified', 'first_contact', 'follow_up', 'conversation', 'meeting_booked')),
  -- NULL = the team default; a row for a person overrides it.
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  weekly_min INTEGER NOT NULL CHECK (weekly_min >= 0),
  weekly_max INTEGER CHECK (weekly_max IS NULL OR weekly_max >= weekly_min),
  note TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX sales_targets_unique ON public.sales_targets
  (metric, coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid));

ALTER TABLE public.sales_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can view targets" ON public.sales_targets
  FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "Admins set targets" ON public.sales_targets
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins change targets" ON public.sales_targets
  FOR UPDATE USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins delete targets" ON public.sales_targets
  FOR DELETE USING (public.is_admin(auth.uid()));

-- First-month trial targets. Review after two weeks.
INSERT INTO public.sales_targets (metric, weekly_min, weekly_max, note) VALUES
  ('researched', 40, 50, 'Businesses researched'),
  ('qualified', 25, 30, 'Qualified prospects added (moved to Ready)'),
  ('first_contact', 20, 30, 'Personalised first contacts'),
  ('follow_up', 15, 20, 'Follow-ups'),
  ('conversation', 3, 5, 'Meaningful conversations'),
  ('meeting_booked', 2, 3, 'Discovery meetings booked');

-- ============================================================
-- Scoreboard
-- ============================================================

-- Per person, for the days _from.._to (inclusive, NZ time): activity counts plus
-- quality of what they researched. Rows only for people with a role.
CREATE OR REPLACE FUNCTION public.sales_scoreboard(_from DATE, _to DATE)
RETURNS TABLE (user_id UUID, full_name TEXT, metrics JSONB)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_team_member(auth.uid()) THEN
    RAISE EXCEPTION 'Only team members can see the scoreboard' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN QUERY
  WITH team AS (
    SELECT DISTINCT r.user_id FROM user_roles r
  ),
  acts AS (
    SELECT a.user_id, a.kind, count(*) AS n
    FROM sales_activities a
    WHERE (a.occurred_at AT TIME ZONE 'Pacific/Auckland')::date BETWEEN _from AND _to
    GROUP BY a.user_id, a.kind
  ),
  researched AS (
    SELECT a.user_id,
           count(*) FILTER (WHERE btrim(coalesce(p.evidence, '')) <> '') AS with_evidence,
           count(*) FILTER (WHERE p.tier IN ('A', 'B')) AS tier_ab,
           count(*) FILTER (WHERE p.stage = 'disqualified') AS disqualified,
           count(*) FILTER (WHERE p.segment IS NOT NULL) AS with_segment
    FROM sales_activities a JOIN prospects p ON p.id = a.prospect_id
    WHERE a.kind = 'researched'
      AND (a.occurred_at AT TIME ZONE 'Pacific/Auckland')::date BETWEEN _from AND _to
    GROUP BY a.user_id
  ),
  open_prospects AS (
    SELECT p.assigned_to AS user_id,
           count(*) AS open,
           count(*) FILTER (WHERE btrim(coalesce(p.next_action, '')) = '' OR p.next_action_date IS NULL) AS no_next_action,
           count(*) FILTER (WHERE p.next_action_date < (now() AT TIME ZONE 'Pacific/Auckland')::date) AS overdue
    FROM prospects p
    WHERE p.stage NOT IN ('converted', 'disqualified')
    GROUP BY p.assigned_to
  )
  SELECT t.user_id,
         pr.full_name,
         jsonb_build_object(
           'researched', coalesce((SELECT n FROM acts WHERE acts.user_id = t.user_id AND kind = 'researched'), 0),
           'qualified', coalesce((SELECT n FROM acts WHERE acts.user_id = t.user_id AND kind = 'qualified'), 0),
           'first_contact', coalesce((SELECT n FROM acts WHERE acts.user_id = t.user_id AND kind = 'first_contact'), 0),
           'follow_up', coalesce((SELECT n FROM acts WHERE acts.user_id = t.user_id AND kind = 'follow_up'), 0),
           'conversation', coalesce((SELECT n FROM acts WHERE acts.user_id = t.user_id AND kind = 'conversation'), 0),
           'meeting_booked', coalesce((SELECT n FROM acts WHERE acts.user_id = t.user_id AND kind = 'meeting_booked'), 0),
           'with_evidence', coalesce(r.with_evidence, 0),
           'tier_ab', coalesce(r.tier_ab, 0),
           'disqualified', coalesce(r.disqualified, 0),
           'with_segment', coalesce(r.with_segment, 0),
           'open', coalesce(o.open, 0),
           'no_next_action', coalesce(o.no_next_action, 0),
           'overdue', coalesce(o.overdue, 0)
         )
  FROM team t
  LEFT JOIN profiles pr ON pr.user_id = t.user_id
  LEFT JOIN researched r ON r.user_id = t.user_id
  LEFT JOIN open_prospects o ON o.user_id = t.user_id
  ORDER BY pr.full_name NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.sales_scoreboard(DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sales_scoreboard(DATE, DATE) TO authenticated;

-- Names for assignment pickers. Any team member may read; no emails.
CREATE OR REPLACE FUNCTION public.team_directory()
RETURNS TABLE (user_id UUID, full_name TEXT, role TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_team_member(auth.uid()) THEN
    RAISE EXCEPTION 'Only team members can see the team' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN QUERY
  SELECT r.user_id, p.full_name, min(r.role::text)
  FROM user_roles r LEFT JOIN profiles p ON p.user_id = r.user_id
  GROUP BY r.user_id, p.full_name
  ORDER BY p.full_name NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.team_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_directory() TO authenticated;

-- ============================================================
-- Outreach templates
-- ============================================================

CREATE TABLE public.sales_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (btrim(name) <> ''),
  kind TEXT NOT NULL CHECK (kind IN ('email', 'phone_script', 'follow_up', 'booking', 'objection', 'other')),
  segment TEXT,
  subject TEXT,
  body TEXT NOT NULL CHECK (btrim(body) <> ''),
  -- draft: being written · approved: may be used with prospects · retired: kept for history
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'retired')),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Only an admin can approve. A non-admin edit to an approved template's wording
-- sends it back to draft, so nothing unapproved goes out under an approved label.
CREATE OR REPLACE FUNCTION public.sales_templates_before_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  admin BOOLEAN := auth.uid() IS NULL OR public.is_admin(auth.uid());
BEGIN
  IF TG_OP = 'UPDATE' AND NOT admin AND OLD.status = 'approved'
     AND (NEW.body IS DISTINCT FROM OLD.body OR NEW.subject IS DISTINCT FROM OLD.subject) THEN
    NEW.status := 'draft';
  END IF;
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status <> 'approved') THEN
    IF NOT admin THEN
      RAISE EXCEPTION 'Only the founder (admin) can approve a template' USING ERRCODE = 'insufficient_privilege';
    END IF;
    NEW.approved_by := auth.uid();
    NEW.approved_at := now();
  ELSIF NEW.status <> 'approved' THEN
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER sales_templates_before_write
  BEFORE INSERT OR UPDATE ON public.sales_templates
  FOR EACH ROW EXECUTE FUNCTION public.sales_templates_before_write();

ALTER TABLE public.sales_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can view templates" ON public.sales_templates
  FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "Sellers draft templates" ON public.sales_templates
  FOR INSERT WITH CHECK (public.can_sell(auth.uid()));
CREATE POLICY "Sellers edit templates" ON public.sales_templates
  FOR UPDATE USING (public.can_sell(auth.uid())) WITH CHECK (public.can_sell(auth.uid()));
CREATE POLICY "Admins delete templates" ON public.sales_templates
  FOR DELETE USING (public.is_admin(auth.uid()));

-- Starting drafts, from ~/Oreece/sales/outreach-templates.md. All start as
-- drafts: the founder reads and approves each one before it is used.
INSERT INTO public.sales_templates (name, kind, segment, subject, body, sort_order) VALUES
('Cleaning business – first email', 'email', 'cleaning', 'Quick idea for {business}''s quote requests',
$t$Kia ora {name},

I'm {sender} from Oreece, a small Auckland web and software studio. I was looking at {business}'s website and noticed {observation}.

We help cleaning businesses handle enquiries more professionally: a clear quote form, enquiries that reach you straight away, and simple follow-up so fewer jobs slip through.

Would a 15-minute call next week be useful? If not, no worries. Just reply "no thanks" and I won't follow up.

{sender} · Oreece · oreece.co.nz$t$, 10),
('Follow-up (once, 5–7 days later)', 'follow_up', NULL, 'Re: {subject}',
$t$Kia ora {name}, just bringing this back to the top of your inbox. Happy to send a 2-minute screen recording of the idea instead of a call, if that's easier.

If it's not relevant, reply "no thanks" and I won't contact you again.

{sender} · Oreece$t$, 20),
('Cleaning business – phone opener', 'phone_script', 'cleaning', NULL,
$t$1. "Hi, is that {name}? It's {sender} from Oreece, a small Auckland web and software company. Have you got two minutes?"
   - If no: "No problem. When's a better time?" Log the time as the next action.
2. Reason for the call: "I was looking at {business}'s website and noticed {observation}. How do most of your quote requests come in at the moment?"
3. Listen. Write down what they say in their words.
4. If there's interest: "The founder, {founder}, does a free 20-minute discovery call to look at how your enquiries come in. Would [day] or [day] suit?"
5. If not interested: thank them, ask if it's OK to check back in a few months, and record the reason as an objection.

Never promise prices, timelines or results. Pricing comes from the founder.$t$, 30),
('Booking a discovery call', 'booking', NULL, 'Discovery call: {business} and Oreece',
$t$Kia ora {name},

Thanks for your time today. As agreed, {founder} (Oreece's founder) will call you on {meeting_time} for about 20 minutes to look at how enquiries and quotes come in at {business} and where things get lost.

Nothing to prepare. If the time stops working, just reply and we'll move it.

{sender} · Oreece$t$, 40),
('"We already have a website"', 'objection', NULL, NULL,
$t$"That makes sense. Most of the businesses we talk to do. We look at what happens after someone lands on it: how quickly a quote request reaches you and whether anyone follows up. Would it be worth a 20-minute look at that with {founder}?"

Record the objection on the prospect either way.$t$, 50),
('"Too expensive / no budget"', 'objection', NULL, NULL,
$t$"Understood. We have smaller starting options, and {founder} can tell you on the call what fits your budget. No obligation." Do not quote numbers yourself.

Record the objection on the prospect either way.$t$, 60);

-- ============================================================
-- Sales handbook
-- ============================================================

CREATE TABLE public.playbook_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  title TEXT NOT NULL CHECK (btrim(title) <> ''),
  body TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.playbook_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can read the playbook" ON public.playbook_sections
  FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "Admins write the playbook" ON public.playbook_sections
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins edit the playbook" ON public.playbook_sections
  FOR UPDATE USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins delete playbook sections" ON public.playbook_sections
  FOR DELETE USING (public.is_admin(auth.uid()));

INSERT INTO public.playbook_sections (slug, title, sort_order, body) VALUES
('goal', 'The one objective', 10,
$t$Turn Auckland businesses into qualified conversations, qualified conversations into proposals, and proposals into paying Oreece clients.

Quality beats quantity: 20 well-researched prospects are worth more than 50 unsuitable ones.$t$),
('roles', 'Who does what', 20,
$t$Founder
- Sets strategy and offers
- Approves pricing and every outreach template
- Runs discovery calls (technical discovery)
- Prepares and approves proposals
- Negotiates and closes deals
- Manages delivery and clients

Sales representative
- Researches potential clients
- Identifies and records business opportunities (with evidence)
- Makes the first contact using approved templates
- Follows up with prospects
- Books discovery calls into the founder's calendar
- Keeps every prospect in HQ up to date: a stage and a next action with a date

The rep does not quote prices, promise timelines or promise results. More responsibility comes with experience.$t$),
('target-market', 'Target market: Auckland cleaning companies', 30,
$t$Start with one market. Expand into automotive services and handyman businesses only once the process repeats.

Segments
- Commercial cleaning: recurring contracts, multiple staff, regular customer enquiries.
- Residential cleaning: need more enquiries, easier quoting and better booking management.
- Specialist cleaning: carpet, upholstery, window and other specialist services.

Good fit (Tier A/B)
- Auckland-based, trading now, with a website or Google Business Profile
- A visible gap: unclear services, no quote form, hard to contact, outdated or slow site, weak Google profile
- Big enough to pay: staff, vans, several service areas or commercial clients

Disqualify (record the reason)
- Not in Auckland, closed or a franchise that controls its website centrally
- Recently rebuilt site that already works well
- No published business contact channel$t$),
('offer', 'What we sell: Oreece Cleaning Business Growth System', 40,
$t$Lead with the business outcome, not a list of IT services: help cleaning businesses handle enquiries professionally and miss fewer jobs.

The package can combine
- Professional business website
- Enquiry and quote request forms
- Lead management system
- Automated enquiry notifications
- Booking and follow-up workflows
- Google Business Profile improvements
- Ongoing website support

Start smaller where it fits (a website package), then add connected systems and automation where the customer needs them.

Prices: see Services. Only founder-approved prices may be mentioned, and only by the founder.$t$),
('daily-workflow', 'Daily workflow', 50,
$t$1. Research businesses: find suitable Auckland cleaning companies; review their website and Google presence.
2. Identify opportunities: record a specific problem you saw and the evidence (how you know).
3. Contact prospects: approved, personalised email, phone or contact form. Record why contact is allowed.
4. Follow up: log every conversation, response and objection, and set the next action.
5. Book discovery calls: for interested, qualified businesses, into the founder's calendar.
6. Update HQ: every prospect has a clear stage and a next action with a date before you finish.

The Sales desk screen walks through these steps each day.$t$),
('rules', 'Contact rules (NZ)', 60,
$t$- One-to-one, personalised messages only. No bulk lists.
- Unsolicited Electronic Messages Act 2007: email or message a business only where consent can be inferred (the address is published in a business context and the message is about their business), always identify Oreece, and include an easy way to opt out. Stop immediately when asked.
- When unsure, use their contact form or phone instead.
- Privacy Act 2020: record only business information needed for sales. No personal details beyond a contact name and business channel.
- Never mention a client by name unless their marketing permission is recorded.$t$),
('targets', 'Weekly targets and how we review them', 70,
$t$First-month targets build consistency; they are trial targets, adjusted after the first two weeks. The Sales desk shows this week against target; the Scoreboard shows quality too (evidence recorded, tier A/B share, prospects without a next action).

Friday: founder and rep look at the week together: what worked, objections heard, which offer drew interest, and what changes next week.$t$),
('booking', 'Booking discovery calls', 80,
$t$Use "Book discovery call" on the prospect in Lead Finder, with the agreed date and time. It moves the prospect to Conversation booked and puts the call on the founder's Today screen.

Founder's booking link: (founder to add here)$t$);

-- ============================================================
-- 30-day onboarding
-- ============================================================

CREATE TABLE public.onboarding_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_title TEXT NOT NULL DEFAULT 'Sales representative',
  start_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  -- End-of-month answers: { prospects, responses, meetings, objections, best_offer, changes }
  assessment JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX onboarding_plans_one_active ON public.onboarding_plans (user_id) WHERE status = 'active';

CREATE TABLE public.onboarding_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.onboarding_plans(id) ON DELETE CASCADE,
  -- 0 = before day one; 1–4 = week of the month
  week INTEGER NOT NULL CHECK (week BETWEEN 0 AND 4),
  owner TEXT NOT NULL CHECK (owner IN ('founder', 'rep')),
  title TEXT NOT NULL CHECK (btrim(title) <> ''),
  detail TEXT,
  link TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  done_at TIMESTAMP WITH TIME ZONE,
  done_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX onboarding_items_plan_idx ON public.onboarding_items (plan_id, week, sort_order);

-- Ticking an item records who and when; unticking clears both.
CREATE OR REPLACE FUNCTION public.onboarding_items_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.done_at IS NOT NULL AND OLD.done_at IS NULL THEN
    NEW.done_by := auth.uid();
  ELSIF NEW.done_at IS NULL THEN
    NEW.done_by := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER onboarding_items_before_update
  BEFORE UPDATE ON public.onboarding_items
  FOR EACH ROW EXECUTE FUNCTION public.onboarding_items_before_update();

ALTER TABLE public.onboarding_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and the new starter can view plans" ON public.onboarding_plans
  FOR SELECT USING (public.is_admin(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "Admins create plans" ON public.onboarding_plans
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins update plans" ON public.onboarding_plans
  FOR UPDATE USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins delete plans" ON public.onboarding_plans
  FOR DELETE USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins and the new starter can view items" ON public.onboarding_items
  FOR SELECT USING (public.is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.onboarding_plans pl WHERE pl.id = plan_id AND pl.user_id = auth.uid()));
CREATE POLICY "Admins add items" ON public.onboarding_items
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
-- The new starter ticks their own items; founder items are the founder's.
CREATE POLICY "Admins and the starter tick items" ON public.onboarding_items
  FOR UPDATE USING (public.is_admin(auth.uid()) OR (owner = 'rep' AND EXISTS (
    SELECT 1 FROM public.onboarding_plans pl WHERE pl.id = plan_id AND pl.user_id = auth.uid())))
  WITH CHECK (public.is_admin(auth.uid()) OR (owner = 'rep' AND EXISTS (
    SELECT 1 FROM public.onboarding_plans pl WHERE pl.id = plan_id AND pl.user_id = auth.uid())));
CREATE POLICY "Admins delete items" ON public.onboarding_items
  FOR DELETE USING (public.is_admin(auth.uid()));

-- Creates a plan with the standard checklist for a team member.
CREATE OR REPLACE FUNCTION public.start_sales_onboarding(_user_id UUID, _start_date DATE)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  plan UUID;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can start an onboarding plan' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NOT public.is_team_member(_user_id) THEN
    RAISE EXCEPTION 'Give this person a role in Settings → Team first' USING ERRCODE = 'check_violation';
  END IF;
  INSERT INTO onboarding_plans (user_id, start_date) VALUES (_user_id, _start_date) RETURNING id INTO plan;

  INSERT INTO onboarding_items (plan_id, week, owner, title, detail, link, sort_order) VALUES
  -- Before day one (founder)
  (plan, 0, 'founder', 'Written employment agreement signed',
   'Required in New Zealand before work starts. Check the current rules, and get advice if unsure about the arrangement.',
   'https://www.employment.govt.nz/starting-employment/hiring/hiring-your-first-employee', 10),
  (plan, 0, 'founder', 'Pay set at or above minimum wage for every hour worked',
   'Applies even when commission is paid on top. Record hours worked.',
   'https://www.employment.govt.nz/pay-and-hours/pay-and-wages/minimum-wage', 20),
  (plan, 0, 'founder', 'Set up payroll, PAYE and KiwiSaver with your accountant', NULL, NULL, 30),
  (plan, 0, 'founder', 'Oreece business email address created', NULL, NULL, 40),
  (plan, 0, 'founder', 'HQ access with the Staff role (Settings → Team)', NULL, NULL, 50),
  (plan, 0, 'founder', 'Playbook reviewed: roles, target market, offer, contact rules', NULL, '/playbook', 60),
  (plan, 0, 'founder', 'Outreach templates approved', 'Only approved templates can be used with prospects.', '/playbook?tab=templates', 70),
  (plan, 0, 'founder', 'Sales materials ready: company introduction, service overview, portfolio, case studies, proposal template', NULL, NULL, 80),
  (plan, 0, 'founder', 'Discovery call booking link added to the Playbook', NULL, '/playbook', 90),
  (plan, 0, 'founder', 'Weekly targets confirmed for the first month', NULL, '/sales?tab=scoreboard', 100),
  -- Week 1: learn Oreece
  (plan, 1, 'rep', 'Read the Playbook end to end', NULL, '/playbook', 10),
  (plan, 1, 'rep', 'Walk through the Oreece website, services and portfolio', NULL, NULL, 20),
  (plan, 1, 'rep', 'Learn the Lead Finder: add, qualify, log contact, book a call', NULL, '/leads', 30),
  (plan, 1, 'rep', 'Practise the phone opener and first email with the founder', NULL, '/playbook?tab=templates', 40),
  (plan, 1, 'founder', 'Sit in on (or role-play) a discovery call together', NULL, NULL, 50),
  (plan, 1, 'rep', 'Research 10 practice prospects and review them with the founder', 'Focus on quality: a real problem, with evidence.', '/leads', 60),
  -- Week 2: research and begin outreach
  (plan, 2, 'rep', 'Research prospects against the weekly target', NULL, '/sales', 10),
  (plan, 2, 'rep', 'Start approved, personalised outreach', NULL, '/sales', 20),
  (plan, 2, 'founder', 'Review the first two weeks against targets; adjust targets', NULL, '/sales?tab=scoreboard', 30),
  -- Week 3: conversations and meetings
  (plan, 3, 'rep', 'Follow up every open prospect on its next-action date', NULL, '/sales', 10),
  (plan, 3, 'rep', 'Book discovery meetings with interested, qualified businesses', NULL, '/sales', 20),
  (plan, 3, 'rep', 'Record every objection heard on the prospect', NULL, NULL, 30),
  -- Week 4: review and improve
  (plan, 4, 'rep', 'Clean the pipeline: every prospect has a stage and next action', NULL, '/sales', 10),
  (plan, 4, 'rep', 'Suggest changes to messaging from what worked', NULL, '/playbook?tab=templates', 20),
  (plan, 4, 'founder', 'Complete the 30-day assessment together', NULL, NULL, 30);

  RETURN plan;
END;
$$;

REVOKE ALL ON FUNCTION public.start_sales_onboarding(UUID, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_sales_onboarding(UUID, DATE) TO authenticated;

-- ============================================================
-- Offer in the services catalogue (prices left for the founder)
-- ============================================================

INSERT INTO public.services (name, category, description, deliverables, notes, sort_order)
SELECT v.name, 'project', v.description, v.deliverables, 'Price not set. Founder to approve before it is quoted.', v.sort_order
FROM (VALUES
  ('Cleaning Business Growth System',
   'Helps cleaning businesses handle enquiries professionally and miss fewer jobs.',
   E'Professional business website\nEnquiry and quote request forms\nLead management system\nAutomated enquiry notifications\nBooking and follow-up workflows\nGoogle Business Profile improvements\nOngoing website support',
   5),
  ('Cleaning Starter Website',
   'Smaller first step: a professional website with a quote request form. Systems and automation can follow.',
   E'Professional business website\nQuote request form with email notification\nGoogle Business Profile check',
   6)
) AS v(name, description, deliverables, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.services s WHERE lower(s.name) = lower(v.name));

-- ============================================================
-- Audit trail for the new tables
-- ============================================================

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'sales_targets', 'sales_templates', 'playbook_sections', 'onboarding_plans', 'onboarding_items'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.audit_row()', t);
  END LOOP;
END
$$;
