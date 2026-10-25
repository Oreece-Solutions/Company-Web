-- =============================================================================
-- Oreece Social OS — core schema
-- Schema `social` lives in the same Supabase project as the Oreece platform so
-- that content can link to CRM leads (public.clients) and projects
-- (public.projects). Nothing in this migration modifies the `public` schema.
--
-- Conventions
--   * All timestamps are timestamptz (stored UTC). Display/scheduling timezone
--     comes from social.settings('timezone') — default Pacific/Auckland.
--   * Status columns are text validated by social.status_transitions (data, not
--     enums) so the lifecycle can evolve without type migrations.
--   * Secrets never live here. social_accounts stores the *name* of the n8n
--     credential to use, never the token itself.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS social;

-- Group role used by the n8n database user. Create a LOGIN user and grant it
-- this role (see README "Database setup"); the password is never in a migration.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'social_automation') THEN
    CREATE ROLE social_automation NOLOGIN;
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION social.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- Configuration
-- -----------------------------------------------------------------------------
CREATE TABLE social.settings (
  scope       text NOT NULL DEFAULT 'global',   -- 'global' or a brand slug
  key         text NOT NULL,
  value       jsonb NOT NULL,
  description text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, key)
);

CREATE TABLE social.brands (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9_]+$'),
  name            text NOT NULL,
  kind            text NOT NULL CHECK (kind IN ('company', 'personal')),
  description     text,
  target_audience text,
  positioning     text,
  default_cta     text,
  website_url     text,
  timezone        text NOT NULL DEFAULT 'Pacific/Auckland',
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Brand voice is loaded before every generation call. `differentiation` states
-- explicitly how this brand must NOT sound like the other brand(s).
CREATE TABLE social.brand_voice (
  brand_id          uuid PRIMARY KEY REFERENCES social.brands(id) ON DELETE CASCADE,
  tone              text NOT NULL,
  person            text NOT NULL CHECK (person IN ('first_singular', 'first_plural', 'third')),
  sentence_style    text,
  vocabulary        text[] NOT NULL DEFAULT '{}',
  preferred_terms   jsonb NOT NULL DEFAULT '{}'::jsonb,   -- {"use this": "instead of this"}
  prohibited_terms  text[] NOT NULL DEFAULT '{}',
  brand_values      text[] NOT NULL DEFAULT '{}',
  audience_notes    text,
  cta_guidelines    text,
  differentiation   text,
  writing_examples  jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{platform, text, why}]
  version           integer NOT NULL DEFAULT 1,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE social.brand_visual (
  brand_id        uuid PRIMARY KEY REFERENCES social.brands(id) ON DELETE CASCADE,
  logo_url        text,
  colours         jsonb NOT NULL DEFAULT '{}'::jsonb,   -- {"primary":"#...", ...}
  fonts           jsonb NOT NULL DEFAULT '{}'::jsonb,   -- {"heading":"...", "body":"..."}
  visual_style    text,
  layout_rules    text,
  imagery_style   text,
  templates       jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{key, format, provider, template_id, dimensions}]
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE social.content_pillars (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id     uuid NOT NULL REFERENCES social.brands(id) ON DELETE CASCADE,
  slug         text NOT NULL CHECK (slug ~ '^[a-z0-9_]+$'),
  name         text NOT NULL,
  description  text,
  content_type text NOT NULL DEFAULT 'educational'
               CHECK (content_type IN ('educational', 'proof', 'story', 'promotional', 'engagement', 'opinion')),
  weight       numeric(6,3) NOT NULL DEFAULT 1 CHECK (weight >= 0),
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, slug)
);

-- -----------------------------------------------------------------------------
-- Platform capability layer
-- -----------------------------------------------------------------------------
CREATE TABLE social.platforms (
  slug        text PRIMARY KEY CHECK (slug ~ '^[a-z0-9_]+$'),
  name        text NOT NULL,
  api_access  text NOT NULL DEFAULT 'unknown'
              CHECK (api_access IN ('available', 'requires_review', 'requires_paid_tier', 'private_until_audit', 'unsupported', 'unknown')),
  api_notes   text,
  active      boolean NOT NULL DEFAULT true
);

CREATE TABLE social.formats (
  slug        text PRIMARY KEY,
  name        text NOT NULL,
  needs_media boolean NOT NULL DEFAULT false,
  is_video    boolean NOT NULL DEFAULT false
);

CREATE TABLE social.platform_capabilities (
  platform            text NOT NULL REFERENCES social.platforms(slug) ON DELETE CASCADE,
  format              text NOT NULL REFERENCES social.formats(slug),
  supported           boolean NOT NULL DEFAULT true,
  publishable_via_api boolean NOT NULL DEFAULT false,
  max_chars           integer,
  max_title_chars     integer,
  max_hashtags        integer,
  recommended_hashtags integer,
  media_spec          jsonb NOT NULL DEFAULT '{}'::jsonb,  -- aspect ratios, sizes, durations, item counts
  cta_rules           text,
  style_notes         text,
  last_verified       date,
  PRIMARY KEY (platform, format)
);

CREATE TABLE social.social_accounts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id              uuid NOT NULL REFERENCES social.brands(id) ON DELETE CASCADE,
  platform              text NOT NULL REFERENCES social.platforms(slug),
  handle                text,
  external_account_id   text,            -- e.g. LinkedIn person/organization URN, FB page id
  publisher_provider    text NOT NULL DEFAULT 'mock',
  n8n_credential_name   text,            -- name of the n8n credential, never the secret
  auto_publish          boolean NOT NULL DEFAULT false,
  posting_windows       jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{"days":[1,2,3,4,5],"start":"08:00","end":"10:00"}] local time, ISO weekday
  max_posts_per_day     integer NOT NULL DEFAULT 1 CHECK (max_posts_per_day >= 0),
  max_posts_per_week    integer NOT NULL DEFAULT 3 CHECK (max_posts_per_week >= 0),
  active                boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, platform)
);

-- -----------------------------------------------------------------------------
-- Prompts & observability
-- -----------------------------------------------------------------------------
CREATE TABLE social.prompt_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key           text NOT NULL,
  version       integer NOT NULL,
  description   text,
  system_prompt text NOT NULL,
  user_template text NOT NULL,
  output_schema jsonb,
  model_tier    text NOT NULL DEFAULT 'standard' CHECK (model_tier IN ('fast', 'standard', 'deep')),
  temperature   numeric(3,2),
  max_tokens    integer NOT NULL DEFAULT 2000,
  checksum      text NOT NULL,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (key, version)
);

CREATE TABLE social.execution_log (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workflow      text NOT NULL,
  execution_id  text,
  started_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz,
  status        text NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'SUCCESS', 'ERROR', 'SKIPPED')),
  entity_type   text,
  entity_id     uuid,
  platform      text,
  retry_count   integer NOT NULL DEFAULT 0,
  error         jsonb,
  meta          jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX execution_log_workflow_started_idx ON social.execution_log (workflow, started_at DESC);
CREATE INDEX execution_log_entity_idx ON social.execution_log (entity_type, entity_id);
CREATE INDEX execution_log_errors_idx ON social.execution_log (started_at DESC) WHERE status = 'ERROR';

CREATE TABLE social.status_history (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity_type  text NOT NULL,
  entity_id    uuid NOT NULL,
  from_status  text,
  to_status    text NOT NULL,
  reason       text,
  workflow     text,
  execution_id text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX status_history_entity_idx ON social.status_history (entity_type, entity_id, created_at);

CREATE TABLE social.status_transitions (
  entity_type text NOT NULL,
  from_status text NOT NULL,
  to_status   text NOT NULL,
  PRIMARY KEY (entity_type, from_status, to_status)
);

CREATE TABLE social.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        text NOT NULL,
  severity    text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  channel     text NOT NULL,
  dedupe_key  text UNIQUE,          -- prevents the same alert being sent twice
  title       text NOT NULL,
  body        text,
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  status      text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'SUPPRESSED')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  sent_at     timestamptz
);

-- -----------------------------------------------------------------------------
-- Research
-- -----------------------------------------------------------------------------
CREATE TABLE social.research_sources (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  type            text NOT NULL CHECK (type IN ('rss', 'search_api', 'manual')),
  url             text,
  query           text,                 -- for search_api sources
  topics          text[] NOT NULL DEFAULT '{}',
  region          text,                 -- 'NZ', 'LK', 'global'
  quality_score   numeric(3,2) NOT NULL DEFAULT 0.7 CHECK (quality_score BETWEEN 0 AND 1),
  fetch_every_hours integer NOT NULL DEFAULT 12,
  active          boolean NOT NULL DEFAULT true,
  last_fetched_at timestamptz,
  failure_count   integer NOT NULL DEFAULT 0,
  last_error      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (type, url)
);

CREATE TABLE social.research_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id       uuid REFERENCES social.research_sources(id) ON DELETE SET NULL,
  title           text NOT NULL,
  url             text NOT NULL,
  url_hash        text NOT NULL UNIQUE,     -- md5 of normalised URL: hard duplicate guard
  title_key       text NOT NULL,            -- normalised title: near-duplicate guard
  excerpt         text,                     -- short excerpt only; full articles are never stored
  summary         text,
  key_insight     text,
  why_it_matters  text,
  topics          text[] NOT NULL DEFAULT '{}',
  relevance_score numeric(3,2) CHECK (relevance_score BETWEEN 0 AND 1),
  brand_fit       jsonb NOT NULL DEFAULT '{}'::jsonb,   -- {"oreece":0.8,"founder":0.4}
  quality_flags   text[] NOT NULL DEFAULT '{}',
  published_at    timestamptz,
  collected_at    timestamptz NOT NULL DEFAULT now(),
  analysed_at     timestamptz,
  status          text NOT NULL DEFAULT 'NEW',
  retry_count     integer NOT NULL DEFAULT 0,
  last_error      text
);
CREATE INDEX research_items_status_idx ON social.research_items (status, collected_at);
CREATE INDEX research_items_title_key_idx ON social.research_items (title_key);

-- -----------------------------------------------------------------------------
-- Personal-brand experiences & client/project stories (human-entered sources)
-- -----------------------------------------------------------------------------
CREATE TABLE social.experiences (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id       uuid NOT NULL REFERENCES social.brands(id) ON DELETE CASCADE,
  category       text NOT NULL CHECK (category IN (
                   'what_i_learned', 'what_went_wrong', 'what_i_built', 'what_i_discovered',
                   'business_lesson', 'technology_lesson', 'founder_lesson', 'behind_the_scenes',
                   'case_study', 'opinion', 'explainer')),
  title          text NOT NULL,
  what_happened  text NOT NULL,       -- the facts, in the founder's own words
  lesson         text,
  context        text,
  occurred_on    date,
  is_opinion     boolean NOT NULL DEFAULT false,
  publishable    boolean NOT NULL DEFAULT true,
  sensitivity_notes text,             -- things the AI must not mention
  times_used     integer NOT NULL DEFAULT 0,
  last_used_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE social.project_stories (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id                  uuid NOT NULL REFERENCES social.brands(id) ON DELETE CASCADE,
  project_id                uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  client_id                 uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  title                     text NOT NULL,
  industry                  text,
  problem                   text,
  solution                  text,
  process                   text,
  result                    text,
  lessons                   text,
  client_content_permission boolean NOT NULL DEFAULT false,
  permission_evidence       text,      -- e.g. "email from client 2026-09-30"
  must_anonymise            boolean NOT NULL DEFAULT true,
  confidential_notes        text,      -- never sent to the AI
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Content pipeline
-- -----------------------------------------------------------------------------
CREATE TABLE social.content_ideas (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id         uuid NOT NULL REFERENCES social.brands(id) ON DELETE CASCADE,
  pillar_id        uuid REFERENCES social.content_pillars(id) ON DELETE SET NULL,
  source_type      text NOT NULL CHECK (source_type IN ('research', 'experience', 'project', 'manual', 'learning')),
  research_id      uuid REFERENCES social.research_items(id) ON DELETE SET NULL,
  experience_id    uuid REFERENCES social.experiences(id) ON DELETE SET NULL,
  project_story_id uuid REFERENCES social.project_stories(id) ON DELETE SET NULL,
  title            text NOT NULL,
  hook             text,
  angle            text,
  objective        text CHECK (objective IN ('awareness', 'engagement', 'education', 'trust', 'lead')),
  topic_key        text NOT NULL,          -- normalised topic used for repetition checks
  priority         integer NOT NULL DEFAULT 50 CHECK (priority BETWEEN 0 AND 100),
  target_platforms text[] NOT NULL DEFAULT '{}',
  status           text NOT NULL DEFAULT 'IDEA',
  retry_count      integer NOT NULL DEFAULT 0,
  last_error       text,
  failed_at        timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_ideas_source_link CHECK (
    (source_type = 'research'   AND research_id IS NOT NULL) OR
    (source_type = 'experience' AND experience_id IS NOT NULL) OR
    (source_type = 'project'    AND project_story_id IS NOT NULL) OR
    (source_type IN ('manual', 'learning'))
  )
);
CREATE INDEX content_ideas_brand_status_idx ON social.content_ideas (brand_id, status, priority DESC);
CREATE INDEX content_ideas_topic_idx ON social.content_ideas (brand_id, topic_key, created_at DESC);

CREATE TABLE social.content_briefs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id        uuid NOT NULL UNIQUE REFERENCES social.content_ideas(id) ON DELETE CASCADE,
  brand_id       uuid NOT NULL REFERENCES social.brands(id) ON DELETE CASCADE,
  brief          jsonb NOT NULL,          -- audience, key message, points, evidence, CTA, do/don't
  prompt_key     text,
  prompt_version integer,
  model          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE social.content_pieces (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id             uuid NOT NULL REFERENCES social.content_ideas(id) ON DELETE CASCADE,
  brief_id            uuid REFERENCES social.content_briefs(id) ON DELETE SET NULL,
  brand_id            uuid NOT NULL REFERENCES social.brands(id) ON DELETE CASCADE,
  platform            text NOT NULL REFERENCES social.platforms(slug),
  format              text NOT NULL REFERENCES social.formats(slug),
  headline            text,
  hook                text,
  caption             text,             -- main post body / caption
  cta                 text,
  hashtags            text[] NOT NULL DEFAULT '{}',
  link_url            text,
  carousel_slides     jsonb,            -- [{title, body, visual_note}]
  script              jsonb,            -- video: {hook, scenes:[{seconds, voiceover, on_screen_text, b_roll}], cta}
  thread_parts        text[],
  visual_brief        jsonb,
  source_citations    jsonb NOT NULL DEFAULT '[]'::jsonb,
  revision            integer NOT NULL DEFAULT 1,
  feedback            text,             -- reviewer feedback fed into regeneration
  prompt_key          text,
  prompt_version      integer,
  model               text,
  generation_meta     jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_hash        text,             -- for duplicate-content detection
  status              text NOT NULL DEFAULT 'DRAFT',
  retry_count         integer NOT NULL DEFAULT 0,
  last_error          text,
  failed_at           timestamptz,
  failed_workflow     text,
  failed_execution_id text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (idea_id, platform, format)
);
CREATE INDEX content_pieces_status_idx ON social.content_pieces (status, updated_at);
CREATE INDEX content_pieces_brand_platform_idx ON social.content_pieces (brand_id, platform, created_at DESC);
CREATE INDEX content_pieces_hash_idx ON social.content_pieces (content_hash);

CREATE TABLE social.content_revisions (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  content_id  uuid NOT NULL REFERENCES social.content_pieces(id) ON DELETE CASCADE,
  revision    integer NOT NULL,
  snapshot    jsonb NOT NULL,
  reason      text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_id, revision)
);

CREATE TABLE social.assets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id    uuid NOT NULL REFERENCES social.content_pieces(id) ON DELETE CASCADE,
  type          text NOT NULL CHECK (type IN ('image', 'carousel_slide', 'video', 'thumbnail', 'audio', 'document')),
  position      integer NOT NULL DEFAULT 0,
  url           text,
  storage_path  text,
  mime_type     text,
  width         integer,
  height        integer,
  duration_s    numeric(8,2),
  provider      text,
  prompt        text,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  status        text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'READY', 'FAILED')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_id, type, position)
);

CREATE TABLE social.qa_results (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id        uuid NOT NULL REFERENCES social.content_pieces(id) ON DELETE CASCADE,
  revision          integer NOT NULL,
  overall           text NOT NULL CHECK (overall IN ('PASS', 'WARNING', 'FAIL')),
  score             numeric(4,3) CHECK (score BETWEEN 0 AND 1),
  checks            jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{check, result, severity, message}]
  critical_failures integer NOT NULL DEFAULT 0,
  model             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX qa_results_content_idx ON social.qa_results (content_id, created_at DESC);

CREATE TABLE social.approvals (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id       uuid NOT NULL REFERENCES social.content_pieces(id) ON DELETE CASCADE,
  revision         integer NOT NULL,
  channel          text NOT NULL,
  requested_at     timestamptz NOT NULL DEFAULT now(),
  decision         text CHECK (decision IN ('APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'EXPIRED')),
  feedback         text,
  decided_by       text,
  decided_at       timestamptz,
  n8n_execution_id text
);
-- At most one open approval request per content piece.
CREATE UNIQUE INDEX approvals_one_open_per_content ON social.approvals (content_id) WHERE decision IS NULL;

-- -----------------------------------------------------------------------------
-- Calendar & publishing
-- -----------------------------------------------------------------------------
CREATE TABLE social.calendar_slots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL REFERENCES social.social_accounts(id) ON DELETE CASCADE,
  slot_at     timestamptz NOT NULL,
  pillar_id   uuid REFERENCES social.content_pillars(id) ON DELETE SET NULL,
  format      text REFERENCES social.formats(slug),
  content_id  uuid REFERENCES social.content_pieces(id) ON DELETE SET NULL,
  status      text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'FILLED', 'SKIPPED')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, slot_at)
);

CREATE TABLE social.publish_jobs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id        uuid NOT NULL REFERENCES social.content_pieces(id) ON DELETE RESTRICT,
  account_id        uuid NOT NULL REFERENCES social.social_accounts(id) ON DELETE RESTRICT,
  platform          text NOT NULL REFERENCES social.platforms(slug),
  scheduled_at      timestamptz NOT NULL,
  idempotency_key   text NOT NULL UNIQUE,   -- content_id:platform:scheduled_at(UTC ISO)
  provider          text NOT NULL,
  dry_run           boolean NOT NULL,        -- frozen at scheduling time
  status            text NOT NULL DEFAULT 'SCHEDULED',
  attempt_count     integer NOT NULL DEFAULT 0,
  max_attempts      integer NOT NULL DEFAULT 3,
  next_attempt_at   timestamptz,
  locked_at         timestamptz,
  locked_by         text,                    -- n8n execution id holding the claim
  published_at      timestamptz,
  platform_post_id  text,
  platform_post_url text,
  response          jsonb,
  last_error        jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
-- A content piece can have only one live job per platform, whatever its time.
CREATE UNIQUE INDEX publish_jobs_one_live_per_content_platform
  ON social.publish_jobs (content_id, platform)
  WHERE status IN ('SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'NEEDS_RECONCILIATION');
CREATE INDEX publish_jobs_due_idx ON social.publish_jobs (scheduled_at) WHERE status = 'SCHEDULED';
CREATE UNIQUE INDEX publish_jobs_platform_post_idx
  ON social.publish_jobs (platform, platform_post_id) WHERE platform_post_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Analytics, engagement, learning
-- -----------------------------------------------------------------------------
CREATE TABLE social.analytics_snapshots (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  publish_job_id      uuid NOT NULL REFERENCES social.publish_jobs(id) ON DELETE RESTRICT,
  content_id          uuid NOT NULL REFERENCES social.content_pieces(id) ON DELETE RESTRICT,
  platform            text NOT NULL,
  platform_post_id    text,
  collected_at        timestamptz NOT NULL DEFAULT now(),
  hours_since_publish numeric(10,2),
  impressions         integer,
  reach               integer,
  views               integer,
  likes               integer,
  comments            integer,
  shares              integer,
  saves               integer,
  clicks              integer,
  watch_time_s        numeric(14,2),
  avg_view_duration_s numeric(10,2),
  engagement_rate     numeric(8,5) GENERATED ALWAYS AS (
    CASE WHEN COALESCE(NULLIF(impressions, 0), NULLIF(reach, 0), NULLIF(views, 0)) IS NULL THEN NULL
         ELSE (COALESCE(likes,0) + COALESCE(comments,0) + COALESCE(shares,0) + COALESCE(saves,0) + COALESCE(clicks,0))::numeric
              / COALESCE(NULLIF(impressions, 0), NULLIF(reach, 0), NULLIF(views, 0))
    END
  ) STORED,
  raw                 jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (publish_job_id, collected_at)
);
CREATE INDEX analytics_content_idx ON social.analytics_snapshots (content_id, collected_at DESC);

CREATE TABLE social.account_metrics (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id   uuid NOT NULL REFERENCES social.social_accounts(id) ON DELETE CASCADE,
  collected_at timestamptz NOT NULL DEFAULT now(),
  followers    integer,
  raw          jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (account_id, collected_at)
);

CREATE TABLE social.comments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publish_job_id      uuid REFERENCES social.publish_jobs(id) ON DELETE SET NULL,
  platform            text NOT NULL,
  platform_post_id    text,
  platform_comment_id text NOT NULL,
  author              text,
  comment             text NOT NULL,
  sentiment           text CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  intent              text CHECK (intent IN ('question', 'lead', 'praise', 'complaint', 'spam', 'other')),
  suggested_reply     text,
  status              text NOT NULL DEFAULT 'NEW'
                      CHECK (status IN ('NEW', 'TRIAGED', 'REPLY_SUGGESTED', 'REPLIED', 'IGNORED', 'ESCALATED')),
  commented_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform, platform_comment_id)
);

CREATE TABLE social.strategy_recommendations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        uuid NOT NULL REFERENCES social.brands(id) ON DELETE CASCADE,
  period_start    date NOT NULL,
  period_end      date NOT NULL,
  kind            text NOT NULL CHECK (kind IN ('pillar_weight', 'format_mix', 'posting_time', 'topic', 'hook_pattern', 'platform', 'other')),
  recommendation  text NOT NULL,
  evidence        jsonb NOT NULL DEFAULT '{}'::jsonb,
  proposed_change jsonb,          -- machine-applicable change, applied only after approval
  impact          text NOT NULL DEFAULT 'minor' CHECK (impact IN ('minor', 'major')),
  status          text NOT NULL DEFAULT 'PROPOSED' CHECK (status IN ('PROPOSED', 'APPROVED', 'REJECTED', 'APPLIED')),
  decided_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Lead attribution: post → CTA link → website → CRM lead (public.clients)
-- -----------------------------------------------------------------------------
CREATE TABLE social.tracked_links (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id       uuid NOT NULL REFERENCES social.content_pieces(id) ON DELETE CASCADE,
  code             text NOT NULL UNIQUE,      -- short code used as utm_content
  destination_url  text NOT NULL,
  utm              jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE social.lead_attributions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracked_link_id  uuid REFERENCES social.tracked_links(id) ON DELETE SET NULL,
  content_id       uuid REFERENCES social.content_pieces(id) ON DELETE SET NULL,
  client_id        uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  stage            text NOT NULL CHECK (stage IN ('visit', 'lead', 'consultation', 'proposal', 'customer')),
  value_nzd        numeric(12,2),
  utm              jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at      timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lead_attributions_content_idx ON social.lead_attributions (content_id, stage);

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------
CREATE TRIGGER brands_touch BEFORE UPDATE ON social.brands FOR EACH ROW EXECUTE FUNCTION social.touch_updated_at();
CREATE TRIGGER brand_voice_touch BEFORE UPDATE ON social.brand_voice FOR EACH ROW EXECUTE FUNCTION social.touch_updated_at();
CREATE TRIGGER brand_visual_touch BEFORE UPDATE ON social.brand_visual FOR EACH ROW EXECUTE FUNCTION social.touch_updated_at();
CREATE TRIGGER pillars_touch BEFORE UPDATE ON social.content_pillars FOR EACH ROW EXECUTE FUNCTION social.touch_updated_at();
CREATE TRIGGER accounts_touch BEFORE UPDATE ON social.social_accounts FOR EACH ROW EXECUTE FUNCTION social.touch_updated_at();
CREATE TRIGGER experiences_touch BEFORE UPDATE ON social.experiences FOR EACH ROW EXECUTE FUNCTION social.touch_updated_at();
CREATE TRIGGER project_stories_touch BEFORE UPDATE ON social.project_stories FOR EACH ROW EXECUTE FUNCTION social.touch_updated_at();
CREATE TRIGGER ideas_touch BEFORE UPDATE ON social.content_ideas FOR EACH ROW EXECUTE FUNCTION social.touch_updated_at();
CREATE TRIGGER pieces_touch BEFORE UPDATE ON social.content_pieces FOR EACH ROW EXECUTE FUNCTION social.touch_updated_at();
CREATE TRIGGER publish_jobs_touch BEFORE UPDATE ON social.publish_jobs FOR EACH ROW EXECUTE FUNCTION social.touch_updated_at();
CREATE TRIGGER settings_touch BEFORE UPDATE ON social.settings FOR EACH ROW EXECUTE FUNCTION social.touch_updated_at();
