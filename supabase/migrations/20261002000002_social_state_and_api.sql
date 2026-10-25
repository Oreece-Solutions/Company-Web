-- =============================================================================
-- Oreece Social OS — state machine, guards and the SQL API used by n8n
--
-- n8n workflows never write status columns ad hoc. They call the functions in
-- this file with ONE jsonb argument, e.g.
--     SELECT * FROM social.transition($1::jsonb)
-- with Query Parameters  ={{ [ JSON.stringify({...}) ] }}
-- (see docs/N8N_CONVENTIONS.md for why the array form is mandatory).
--
-- The rules that protect the business live here, not in workflows:
--   * invalid status transitions raise an exception
--   * nothing reaches APPROVED without a recorded human approval for the
--     current revision (unless auto-publish is explicitly enabled)
--   * approved/scheduled copy cannot be edited in place
--   * client project content needs client_content_permission = true
--   * a publish job can be claimed by exactly one execution
--   * analytics and status history are insert-only
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Allowed transitions (data — extend with INSERTs, no code change needed)
-- -----------------------------------------------------------------------------
INSERT INTO social.status_transitions (entity_type, from_status, to_status) VALUES
  -- research items
  ('research_item', 'NEW', 'ANALYSED'),
  ('research_item', 'NEW', 'REJECTED'),
  ('research_item', 'NEW', 'FAILED'),
  ('research_item', 'ANALYSED', 'USED'),
  ('research_item', 'ANALYSED', 'REJECTED'),
  ('research_item', 'ANALYSED', 'EXPIRED'),
  ('research_item', 'FAILED', 'NEW'),
  -- content ideas
  ('content_idea', 'IDEA', 'RESEARCHED'),
  ('content_idea', 'IDEA', 'BRIEF_CREATED'),
  ('content_idea', 'RESEARCHED', 'BRIEF_CREATED'),
  ('content_idea', 'BRIEF_CREATED', 'IN_PRODUCTION'),
  ('content_idea', 'IN_PRODUCTION', 'BRIEF_CREATED'),
  ('content_idea', 'IN_PRODUCTION', 'DONE'),
  ('content_idea', 'IDEA', 'REJECTED'),
  ('content_idea', 'RESEARCHED', 'REJECTED'),
  ('content_idea', 'BRIEF_CREATED', 'REJECTED'),
  ('content_idea', 'IDEA', 'FAILED'),
  ('content_idea', 'RESEARCHED', 'FAILED'),
  ('content_idea', 'BRIEF_CREATED', 'FAILED'),
  ('content_idea', 'IN_PRODUCTION', 'FAILED'),
  ('content_idea', 'FAILED', 'IDEA'),
  ('content_idea', 'FAILED', 'RESEARCHED'),
  ('content_idea', 'FAILED', 'BRIEF_CREATED'),
  -- content pieces
  ('content_piece', 'DRAFT', 'GENERATED'),
  ('content_piece', 'GENERATED', 'QA'),
  ('content_piece', 'GENERATED', 'DRAFT'),
  ('content_piece', 'QA', 'NEEDS_APPROVAL'),
  ('content_piece', 'QA', 'APPROVED'),          -- auto-publish path only (guarded)
  ('content_piece', 'QA', 'DRAFT'),             -- QA failed → regenerate
  ('content_piece', 'NEEDS_APPROVAL', 'APPROVED'),
  ('content_piece', 'NEEDS_APPROVAL', 'REJECTED'),
  ('content_piece', 'NEEDS_APPROVAL', 'DRAFT'), -- changes requested
  ('content_piece', 'APPROVED', 'SCHEDULED'),
  ('content_piece', 'APPROVED', 'DRAFT'),       -- edit after approval → re-approval
  ('content_piece', 'SCHEDULED', 'PUBLISHED'),
  ('content_piece', 'SCHEDULED', 'APPROVED'),   -- unschedule
  ('content_piece', 'PUBLISHED', 'ANALYSING'),
  ('content_piece', 'ANALYSING', 'COMPLETED'),
  ('content_piece', 'REJECTED', 'DRAFT'),
  ('content_piece', 'DRAFT', 'FAILED'),
  ('content_piece', 'GENERATED', 'FAILED'),
  ('content_piece', 'QA', 'FAILED'),
  ('content_piece', 'APPROVED', 'FAILED'),
  ('content_piece', 'SCHEDULED', 'FAILED'),
  ('content_piece', 'FAILED', 'DRAFT'),
  ('content_piece', 'FAILED', 'GENERATED'),
  ('content_piece', 'FAILED', 'QA'),
  ('content_piece', 'FAILED', 'APPROVED'),
  ('content_piece', 'DRAFT', 'CANCELLED'),
  ('content_piece', 'GENERATED', 'CANCELLED'),
  ('content_piece', 'QA', 'CANCELLED'),
  ('content_piece', 'NEEDS_APPROVAL', 'CANCELLED'),
  ('content_piece', 'APPROVED', 'CANCELLED'),
  ('content_piece', 'SCHEDULED', 'CANCELLED'),
  ('content_piece', 'REJECTED', 'CANCELLED'),
  ('content_piece', 'FAILED', 'CANCELLED'),
  -- publish jobs
  ('publish_job', 'SCHEDULED', 'PUBLISHING'),
  ('publish_job', 'SCHEDULED', 'CANCELLED'),
  ('publish_job', 'PUBLISHING', 'PUBLISHED'),
  ('publish_job', 'PUBLISHING', 'SCHEDULED'),            -- retry, provably not sent
  ('publish_job', 'PUBLISHING', 'FAILED'),
  ('publish_job', 'PUBLISHING', 'NEEDS_RECONCILIATION'), -- outcome unknown: human check
  ('publish_job', 'NEEDS_RECONCILIATION', 'PUBLISHED'),
  ('publish_job', 'NEEDS_RECONCILIATION', 'FAILED');

-- -----------------------------------------------------------------------------
-- Settings
-- -----------------------------------------------------------------------------
-- Brand-scoped value wins over global. Returns NULL when missing.
CREATE OR REPLACE FUNCTION social.get_setting(p_key text, p_scope text DEFAULT 'global')
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT value
  FROM social.settings
  WHERE key = p_key AND scope IN (COALESCE(p_scope, 'global'), 'global')
  ORDER BY (scope = 'global')   -- false (brand) sorts first
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION social.setting_bool(p_key text, p_scope text DEFAULT 'global', p_default boolean DEFAULT false)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((social.get_setting(p_key, p_scope))::text::boolean, p_default)
$$;

-- -----------------------------------------------------------------------------
-- Execution context (who/what caused a change) for status_history
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION social.set_context(p jsonb)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('social.workflow', COALESCE(p->>'workflow', ''), true);
  PERFORM set_config('social.execution_id', COALESCE(p->>'execution_id', ''), true);
  PERFORM set_config('social.reason', COALESCE(p->>'reason', ''), true);
END;
$$;

-- -----------------------------------------------------------------------------
-- Normalisation helpers (duplicate prevention)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION social.normalise_url(p_url text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT rtrim(
           regexp_replace(
             regexp_replace(
               regexp_replace(lower(btrim(p_url)), '#.*$', ''),               -- fragment
               '([?&])(utm_[a-z]+|fbclid|gclid|ref|mc_cid|mc_eid)=[^&]*', '\1', 'g'), -- tracking params
             '[?&]+$', ''),
           '/')
$$;

CREATE OR REPLACE FUNCTION social.title_key(p_title text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT btrim(regexp_replace(regexp_replace(lower(COALESCE(p_title, '')), '[^a-z0-9 ]+', ' ', 'g'), '\s+', ' ', 'g'))
$$;

-- -----------------------------------------------------------------------------
-- Guards
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION social.latest_qa(p_content_id uuid, p_revision integer)
RETURNS social.qa_results
LANGUAGE sql
STABLE
AS $$
  SELECT * FROM social.qa_results
  WHERE content_id = p_content_id AND revision = p_revision
  ORDER BY created_at DESC
  LIMIT 1
$$;

-- True only when every auto-publish switch is on AND QA was a clean PASS.
CREATE OR REPLACE FUNCTION social.auto_publish_allowed(p_content social.content_pieces)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_brand_slug text;
  v_qa social.qa_results;
BEGIN
  SELECT slug INTO v_brand_slug FROM social.brands WHERE id = p_content.brand_id;
  IF social.setting_bool('approval_required', v_brand_slug, true) THEN
    RETURN false;
  END IF;
  IF NOT social.setting_bool('auto_publish_enabled', v_brand_slug, false) THEN
    RETURN false;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM social.social_accounts
    WHERE brand_id = p_content.brand_id AND platform = p_content.platform AND auto_publish AND active
  ) THEN
    RETURN false;
  END IF;
  v_qa := social.latest_qa(p_content.id, p_content.revision);
  RETURN v_qa.id IS NOT NULL AND v_qa.overall = 'PASS' AND v_qa.critical_failures = 0;
END;
$$;

-- Client/project content may only progress when the client has given permission.
CREATE OR REPLACE FUNCTION social.content_permission_ok(p_idea_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((
    SELECT CASE
      WHEN i.source_type = 'project' THEN COALESCE(ps.client_content_permission, false)
      WHEN i.source_type = 'experience' THEN COALESCE(e.publishable, false)
      ELSE true
    END
    FROM social.content_ideas i
    LEFT JOIN social.project_stories ps ON ps.id = i.project_story_id
    LEFT JOIN social.experiences e ON e.id = i.experience_id
    WHERE i.id = p_idea_id
  ), false)
$$;

-- Generic transition validator. TG_ARGV[0] = entity type.
CREATE OR REPLACE FUNCTION social.enforce_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT EXISTS (
      SELECT 1 FROM social.status_transitions
      WHERE entity_type = TG_ARGV[0] AND from_status = OLD.status AND to_status = NEW.status
    ) THEN
      RAISE EXCEPTION 'Invalid % transition: % -> % (id %)', TG_ARGV[0], OLD.status, NEW.status, OLD.id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION social.enforce_initial_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_expected text := TG_ARGV[1];
BEGIN
  IF NEW.status IS DISTINCT FROM v_expected THEN
    RAISE EXCEPTION 'New % rows must start in status % (got %)', TG_ARGV[0], v_expected, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

-- Content-piece specific business rules.
CREATE OR REPLACE FUNCTION social.guard_content_piece()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_qa social.qa_results;
  v_locked constant text[] := ARRAY['NEEDS_APPROVAL', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'ANALYSING', 'COMPLETED'];
BEGIN
  -- 1. Approved / scheduled / published copy is immutable in place.
  IF OLD.status = ANY (v_locked) AND NEW.status = OLD.status AND (
       NEW.headline IS DISTINCT FROM OLD.headline OR
       NEW.hook IS DISTINCT FROM OLD.hook OR
       NEW.caption IS DISTINCT FROM OLD.caption OR
       NEW.cta IS DISTINCT FROM OLD.cta OR
       NEW.hashtags IS DISTINCT FROM OLD.hashtags OR
       NEW.link_url IS DISTINCT FROM OLD.link_url OR
       NEW.carousel_slides IS DISTINCT FROM OLD.carousel_slides OR
       NEW.script IS DISTINCT FROM OLD.script OR
       NEW.thread_parts IS DISTINCT FROM OLD.thread_parts OR
       NEW.revision IS DISTINCT FROM OLD.revision) THEN
    RAISE EXCEPTION 'Content % is % and locked; move it back to DRAFT to edit (requires re-approval)', OLD.id, OLD.status
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- 2. Entering approval needs a non-failing QA result for this revision.
  IF NEW.status = 'NEEDS_APPROVAL' THEN
    v_qa := social.latest_qa(NEW.id, NEW.revision);
    IF v_qa.id IS NULL OR v_qa.overall = 'FAIL' OR v_qa.critical_failures > 0 THEN
      RAISE EXCEPTION 'Content % cannot await approval: QA missing or failed for revision %', NEW.id, NEW.revision
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- 3. APPROVED needs a human approval for this exact revision, or a fully
  --    enabled auto-publish configuration with a clean QA PASS.
  IF NEW.status = 'APPROVED' THEN
    v_qa := social.latest_qa(NEW.id, NEW.revision);
    IF v_qa.id IS NULL OR v_qa.overall = 'FAIL' OR v_qa.critical_failures > 0 THEN
      RAISE EXCEPTION 'Content % cannot be approved: QA missing or failed for revision %', NEW.id, NEW.revision
        USING ERRCODE = 'check_violation';
    END IF;
    IF NOT EXISTS (
         SELECT 1 FROM social.approvals
         WHERE content_id = NEW.id AND revision = NEW.revision AND decision = 'APPROVED')
       AND NOT social.auto_publish_allowed(NEW) THEN
      RAISE EXCEPTION 'Content % has no recorded approval for revision % and auto-publish is not allowed', NEW.id, NEW.revision
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- 4. Permission is re-checked at every step towards the public.
  IF NEW.status IN ('NEEDS_APPROVAL', 'APPROVED', 'SCHEDULED', 'PUBLISHED')
     AND NOT social.content_permission_ok(NEW.idea_id) THEN
    RAISE EXCEPTION 'Content % comes from a source without publishing permission', NEW.id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION social.guard_content_idea_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.source_type = 'project' AND NOT EXISTS (
       SELECT 1 FROM social.project_stories WHERE id = NEW.project_story_id AND client_content_permission) THEN
    RAISE EXCEPTION 'Project story % has no client_content_permission; it cannot become content', NEW.project_story_id
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.source_type = 'experience' AND NOT EXISTS (
       SELECT 1 FROM social.experiences WHERE id = NEW.experience_id AND publishable) THEN
    RAISE EXCEPTION 'Experience % is not marked publishable', NEW.experience_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

-- Cancelling or failing a scheduled piece cancels its pending job.
CREATE OR REPLACE FUNCTION social.cascade_content_cancel()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'SCHEDULED' AND NEW.status IN ('CANCELLED', 'APPROVED', 'FAILED') THEN
    UPDATE social.publish_jobs SET status = 'CANCELLED'
    WHERE content_id = NEW.id AND status = 'SCHEDULED';
  END IF;
  RETURN NULL;
END;
$$;

-- -----------------------------------------------------------------------------
-- History & immutability
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION social.record_status_history()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO social.status_history (entity_type, entity_id, from_status, to_status, reason, workflow, execution_id)
    VALUES (
      TG_ARGV[0], NEW.id,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.status END,
      NEW.status,
      NULLIF(current_setting('social.reason', true), ''),
      NULLIF(current_setting('social.workflow', true), ''),
      NULLIF(current_setting('social.execution_id', true), '')
    );
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION social.prevent_modification()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% is insert-only (attempted %)', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------
CREATE TRIGGER research_items_initial BEFORE INSERT ON social.research_items
  FOR EACH ROW EXECUTE FUNCTION social.enforce_initial_status('research_item', 'NEW');
CREATE TRIGGER research_items_transition BEFORE UPDATE OF status ON social.research_items
  FOR EACH ROW EXECUTE FUNCTION social.enforce_status_transition('research_item');

CREATE TRIGGER content_ideas_initial BEFORE INSERT ON social.content_ideas
  FOR EACH ROW EXECUTE FUNCTION social.enforce_initial_status('content_idea', 'IDEA');
CREATE TRIGGER content_ideas_guard_insert BEFORE INSERT ON social.content_ideas
  FOR EACH ROW EXECUTE FUNCTION social.guard_content_idea_insert();
CREATE TRIGGER content_ideas_transition BEFORE UPDATE OF status ON social.content_ideas
  FOR EACH ROW EXECUTE FUNCTION social.enforce_status_transition('content_idea');
CREATE TRIGGER content_ideas_history AFTER INSERT OR UPDATE OF status ON social.content_ideas
  FOR EACH ROW EXECUTE FUNCTION social.record_status_history('content_idea');

CREATE TRIGGER content_pieces_initial BEFORE INSERT ON social.content_pieces
  FOR EACH ROW EXECUTE FUNCTION social.enforce_initial_status('content_piece', 'DRAFT');
CREATE TRIGGER content_pieces_transition BEFORE UPDATE ON social.content_pieces
  FOR EACH ROW EXECUTE FUNCTION social.enforce_status_transition('content_piece');
-- Named so it fires after content_pieces_transition (same-event triggers run alphabetically).
CREATE TRIGGER content_pieces_transition_guard BEFORE UPDATE ON social.content_pieces
  FOR EACH ROW EXECUTE FUNCTION social.guard_content_piece();
CREATE TRIGGER content_pieces_history AFTER INSERT OR UPDATE OF status ON social.content_pieces
  FOR EACH ROW EXECUTE FUNCTION social.record_status_history('content_piece');
CREATE TRIGGER content_pieces_cancel_jobs AFTER UPDATE OF status ON social.content_pieces
  FOR EACH ROW EXECUTE FUNCTION social.cascade_content_cancel();

CREATE TRIGGER publish_jobs_initial BEFORE INSERT ON social.publish_jobs
  FOR EACH ROW EXECUTE FUNCTION social.enforce_initial_status('publish_job', 'SCHEDULED');
CREATE TRIGGER publish_jobs_transition BEFORE UPDATE OF status ON social.publish_jobs
  FOR EACH ROW EXECUTE FUNCTION social.enforce_status_transition('publish_job');
CREATE TRIGGER publish_jobs_history AFTER INSERT OR UPDATE OF status ON social.publish_jobs
  FOR EACH ROW EXECUTE FUNCTION social.record_status_history('publish_job');

CREATE TRIGGER analytics_insert_only BEFORE UPDATE OR DELETE ON social.analytics_snapshots
  FOR EACH ROW EXECUTE FUNCTION social.prevent_modification();
CREATE TRIGGER status_history_insert_only BEFORE UPDATE OR DELETE ON social.status_history
  FOR EACH ROW EXECUTE FUNCTION social.prevent_modification();
CREATE TRIGGER qa_results_insert_only BEFORE UPDATE OR DELETE ON social.qa_results
  FOR EACH ROW EXECUTE FUNCTION social.prevent_modification();

-- -----------------------------------------------------------------------------
-- SQL API for n8n (all take a single jsonb argument)
-- -----------------------------------------------------------------------------

-- Generic status change.
-- p: {entity, id, to, expected_from?, reason?, workflow?, execution_id?}
-- Returns {ok, entity, id, from, to} — ok=false (no exception) when the row is
-- missing or no longer in expected_from (another execution got there first).
CREATE OR REPLACE FUNCTION social.transition(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_table text;
  v_from text;
  v_id uuid := (p->>'id')::uuid;
BEGIN
  v_table := CASE p->>'entity'
    WHEN 'research_item' THEN 'research_items'
    WHEN 'content_idea'  THEN 'content_ideas'
    WHEN 'content_piece' THEN 'content_pieces'
    WHEN 'publish_job'   THEN 'publish_jobs'
  END;
  IF v_table IS NULL THEN
    RAISE EXCEPTION 'Unknown entity %', p->>'entity';
  END IF;
  PERFORM social.set_context(p);

  EXECUTE format('SELECT status FROM social.%I WHERE id = $1 FOR UPDATE', v_table) INTO v_from USING v_id;
  IF v_from IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found', 'entity', p->>'entity', 'id', v_id);
  END IF;
  IF p ? 'expected_from' AND v_from IS DISTINCT FROM p->>'expected_from' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'stale', 'entity', p->>'entity', 'id', v_id,
                              'from', v_from, 'expected_from', p->>'expected_from');
  END IF;
  IF v_from = p->>'to' THEN
    RETURN jsonb_build_object('ok', true, 'noop', true, 'entity', p->>'entity', 'id', v_id, 'from', v_from, 'to', v_from);
  END IF;

  EXECUTE format('UPDATE social.%I SET status = $1 WHERE id = $2', v_table) USING p->>'to', v_id;
  RETURN jsonb_build_object('ok', true, 'entity', p->>'entity', 'id', v_id, 'from', v_from, 'to', p->>'to');
END;
$$;

-- Record a failure without ever failing silently.
-- p: {entity, id, error, workflow, execution_id}
CREATE OR REPLACE FUNCTION social.record_failure(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_id uuid := (p->>'id')::uuid;
  v_err text := left(COALESCE(p->>'error', 'unknown error'), 4000);
  v_status text;
  v_result jsonb;
BEGIN
  PERFORM social.set_context(p || jsonb_build_object('reason', left(v_err, 500)));

  IF p->>'entity' = 'content_piece' THEN
    UPDATE social.content_pieces
       SET retry_count = retry_count + 1, last_error = v_err, failed_at = now(),
           failed_workflow = p->>'workflow', failed_execution_id = p->>'execution_id'
     WHERE id = v_id RETURNING status INTO v_status;
  ELSIF p->>'entity' = 'content_idea' THEN
    UPDATE social.content_ideas
       SET retry_count = retry_count + 1, last_error = v_err, failed_at = now()
     WHERE id = v_id RETURNING status INTO v_status;
  ELSIF p->>'entity' = 'research_item' THEN
    UPDATE social.research_items
       SET retry_count = retry_count + 1, last_error = v_err
     WHERE id = v_id RETURNING status INTO v_status;
  ELSE
    RAISE EXCEPTION 'record_failure: unsupported entity %', p->>'entity';
  END IF;

  IF v_status IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  -- Move to FAILED when the lifecycle allows it from the current status.
  IF EXISTS (SELECT 1 FROM social.status_transitions
             WHERE entity_type = p->>'entity' AND from_status = v_status AND to_status = 'FAILED') THEN
    v_result := social.transition(jsonb_build_object('entity', p->>'entity', 'id', v_id, 'to', 'FAILED')
                                  || (p - 'entity' - 'id' - 'to'));
  END IF;

  RETURN jsonb_build_object('ok', true, 'previous_status', v_status,
                            'status', CASE WHEN v_result IS NULL THEN v_status ELSE 'FAILED' END);
END;
$$;

-- Execution log. p: {workflow, execution_id, entity_type?, entity_id?, platform?, meta?}
CREATE OR REPLACE FUNCTION social.log_start(p jsonb)
RETURNS bigint
LANGUAGE sql
AS $$
  INSERT INTO social.execution_log (workflow, execution_id, entity_type, entity_id, platform, meta)
  VALUES (p->>'workflow', p->>'execution_id', p->>'entity_type', (p->>'entity_id')::uuid,
          p->>'platform', COALESCE(p->'meta', '{}'::jsonb))
  RETURNING id
$$;

-- p: {log_id, status, error?, meta?, retry_count?}
CREATE OR REPLACE FUNCTION social.log_finish(p jsonb)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE social.execution_log
     SET finished_at = now(),
         status = COALESCE(p->>'status', 'SUCCESS'),
         error = p->'error',
         retry_count = COALESCE((p->>'retry_count')::int, retry_count),
         meta = meta || COALESCE(p->'meta', '{}'::jsonb)
   WHERE id = (p->>'log_id')::bigint
$$;

-- Notification outbox with de-duplication.
-- p: {type, severity?, channel?, title, body?, payload?, dedupe_key?}
-- Returns the new row, or nothing when the dedupe_key was already used.
CREATE OR REPLACE FUNCTION social.enqueue_notification(p jsonb)
RETURNS SETOF social.notifications
LANGUAGE sql
AS $$
  INSERT INTO social.notifications (type, severity, channel, dedupe_key, title, body, payload)
  VALUES (p->>'type', COALESCE(p->>'severity', 'info'),
          COALESCE(p->>'channel', social.get_setting('notifications')->>'default_channel', 'telegram'),
          p->>'dedupe_key', p->>'title', p->>'body', COALESCE(p->'payload', '{}'::jsonb))
  ON CONFLICT (dedupe_key) DO NOTHING
  RETURNING *
$$;

-- Research ingestion with URL and near-title de-duplication.
-- p: {source_id?, title, url, excerpt?, published_at?, topics?}
CREATE OR REPLACE FUNCTION social.ingest_research_item(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_url_hash text := md5(social.normalise_url(p->>'url'));
  v_title_key text := social.title_key(p->>'title');
  v_window integer := COALESCE((social.get_setting('research')->>'duplicate_title_window_days')::int, 30);
  v_id uuid;
BEGIN
  IF COALESCE(p->>'url', '') = '' OR COALESCE(p->>'title', '') = '' THEN
    RETURN jsonb_build_object('inserted', false, 'reason', 'missing_url_or_title');
  END IF;
  IF EXISTS (SELECT 1 FROM social.research_items
             WHERE title_key = v_title_key AND collected_at > now() - make_interval(days => v_window)) THEN
    RETURN jsonb_build_object('inserted', false, 'reason', 'duplicate_title');
  END IF;

  INSERT INTO social.research_items (source_id, title, url, url_hash, title_key, excerpt, published_at, topics)
  VALUES ((p->>'source_id')::uuid, p->>'title', p->>'url', v_url_hash, v_title_key,
          left(p->>'excerpt', 1500), (p->>'published_at')::timestamptz,
          COALESCE(ARRAY(SELECT jsonb_array_elements_text(p->'topics')), '{}'))
  ON CONFLICT (url_hash) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('inserted', false, 'reason', 'duplicate_url');
  END IF;
  RETURN jsonb_build_object('inserted', true, 'id', v_id);
END;
$$;

-- Was this topic used by the brand recently? (repetition control)
CREATE OR REPLACE FUNCTION social.topic_recently_used(p_brand_id uuid, p_topic_key text, p_days integer)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM social.content_ideas
    WHERE brand_id = p_brand_id AND topic_key = p_topic_key
      AND status NOT IN ('REJECTED', 'FAILED')
      AND created_at > now() - make_interval(days => p_days)
  )
$$;

-- -----------------------------------------------------------------------------
-- Publishing API (idempotent)
-- -----------------------------------------------------------------------------

-- Create a publish job for an APPROVED piece and mark it SCHEDULED.
-- p: {content_id, scheduled_at, workflow?, execution_id?}
-- Running twice with the same input returns the same job (created=false).
CREATE OR REPLACE FUNCTION social.schedule_content(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_piece social.content_pieces;
  v_account social.social_accounts;
  v_brand_slug text;
  v_at timestamptz := (p->>'scheduled_at')::timestamptz;
  v_key text;
  v_job social.publish_jobs;
  v_dry_run boolean;
BEGIN
  PERFORM social.set_context(p || jsonb_build_object('reason', 'scheduled'));
  SELECT * INTO v_piece FROM social.content_pieces WHERE id = (p->>'content_id')::uuid FOR UPDATE;
  IF v_piece.id IS NULL THEN
    RAISE EXCEPTION 'schedule_content: content % not found', p->>'content_id';
  END IF;

  -- Already scheduled/published: return the live job (idempotent re-run).
  SELECT * INTO v_job FROM social.publish_jobs
   WHERE content_id = v_piece.id AND platform = v_piece.platform
     AND status IN ('SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'NEEDS_RECONCILIATION');
  IF v_job.id IS NOT NULL THEN
    RETURN jsonb_build_object('created', false, 'job', to_jsonb(v_job));
  END IF;

  IF v_piece.status <> 'APPROVED' THEN
    RAISE EXCEPTION 'schedule_content: content % is %, not APPROVED', v_piece.id, v_piece.status
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO v_account FROM social.social_accounts
   WHERE brand_id = v_piece.brand_id AND platform = v_piece.platform AND active;
  IF v_account.id IS NULL THEN
    RAISE EXCEPTION 'schedule_content: no active % account for brand %', v_piece.platform, v_piece.brand_id
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT slug INTO v_brand_slug FROM social.brands WHERE id = v_piece.brand_id;
  -- Dry-run is frozen on the job so a later settings change cannot turn an
  -- already-queued test post into a real one.
  v_dry_run := social.setting_bool('dry_run', v_brand_slug, true) OR v_account.publisher_provider = 'mock';
  v_key := v_piece.id::text || ':' || v_piece.platform || ':' ||
           to_char(v_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');

  INSERT INTO social.publish_jobs (content_id, account_id, platform, scheduled_at, idempotency_key,
                                   provider, dry_run, max_attempts)
  VALUES (v_piece.id, v_account.id, v_piece.platform, v_at, v_key,
          v_account.publisher_provider, v_dry_run,
          COALESCE((social.get_setting('publishing', v_brand_slug)->>'max_attempts')::int, 3))
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING * INTO v_job;

  IF v_job.id IS NULL THEN
    SELECT * INTO v_job FROM social.publish_jobs WHERE idempotency_key = v_key;
    RETURN jsonb_build_object('created', false, 'job', to_jsonb(v_job));
  END IF;

  UPDATE social.content_pieces SET status = 'SCHEDULED' WHERE id = v_piece.id;
  RETURN jsonb_build_object('created', true, 'job', to_jsonb(v_job));
END;
$$;

-- Atomically claim due jobs for one execution. Concurrent executions never get
-- the same job (FOR UPDATE SKIP LOCKED + status flip in one statement).
-- p: {execution_id, limit?, now?}
CREATE OR REPLACE FUNCTION social.claim_due_jobs(p jsonb)
RETURNS SETOF social.publish_jobs
LANGUAGE plpgsql
AS $$
DECLARE
  v_now timestamptz := COALESCE((p->>'now')::timestamptz, now());
BEGIN
  IF COALESCE(p->>'execution_id', '') = '' THEN
    RAISE EXCEPTION 'claim_due_jobs: execution_id is required';
  END IF;
  PERFORM social.set_context(p || jsonb_build_object('reason', 'claimed'));
  RETURN QUERY
  UPDATE social.publish_jobs j
     SET status = 'PUBLISHING', locked_at = now(), locked_by = p->>'execution_id',
         attempt_count = j.attempt_count + 1
   WHERE j.id IN (
     SELECT d.id FROM social.publish_jobs d
     JOIN social.content_pieces c ON c.id = d.content_id AND c.status = 'SCHEDULED'
     WHERE d.status = 'SCHEDULED'
       AND d.scheduled_at <= v_now
       AND (d.next_attempt_at IS NULL OR d.next_attempt_at <= v_now)
     ORDER BY d.scheduled_at
     LIMIT COALESCE((p->>'limit')::int, 5)
     FOR UPDATE OF d SKIP LOCKED)
  RETURNING j.*;
END;
$$;

-- Mark a claimed job as published. Idempotent: repeating the call is a no-op.
-- p: {job_id, execution_id, platform_post_id, platform_post_url?, response?}
CREATE OR REPLACE FUNCTION social.complete_publish(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_job social.publish_jobs;
BEGIN
  PERFORM social.set_context(p || jsonb_build_object('reason', 'published'));
  SELECT * INTO v_job FROM social.publish_jobs WHERE id = (p->>'job_id')::uuid FOR UPDATE;
  IF v_job.id IS NULL THEN
    RAISE EXCEPTION 'complete_publish: job % not found', p->>'job_id';
  END IF;
  IF v_job.status = 'PUBLISHED' THEN
    RETURN jsonb_build_object('ok', true, 'noop', true, 'job_id', v_job.id);
  END IF;
  IF v_job.status = 'PUBLISHING' AND v_job.locked_by IS DISTINCT FROM p->>'execution_id' THEN
    RAISE EXCEPTION 'complete_publish: job % is locked by execution %', v_job.id, v_job.locked_by;
  END IF;
  IF v_job.status NOT IN ('PUBLISHING', 'NEEDS_RECONCILIATION') THEN
    RAISE EXCEPTION 'complete_publish: job % is %', v_job.id, v_job.status;
  END IF;

  UPDATE social.publish_jobs
     SET status = 'PUBLISHED', published_at = COALESCE((p->>'published_at')::timestamptz, now()),
         platform_post_id = p->>'platform_post_id', platform_post_url = p->>'platform_post_url',
         response = p->'response', last_error = NULL
   WHERE id = v_job.id;
  UPDATE social.content_pieces SET status = 'PUBLISHED'
   WHERE id = v_job.content_id AND status = 'SCHEDULED';
  RETURN jsonb_build_object('ok', true, 'job_id', v_job.id);
END;
$$;

-- Record a publishing failure.
-- p: {job_id, execution_id, error, outcome}
--   outcome = 'not_sent'  provably never reached the platform → retry with backoff
--           = 'rejected'  platform refused it (validation/auth) → FAILED
--           = 'unknown'   may have been posted (timeout, 5xx)   → NEEDS_RECONCILIATION
CREATE OR REPLACE FUNCTION social.fail_publish(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_job social.publish_jobs;
  v_outcome text := COALESCE(p->>'outcome', 'unknown');
  v_backoff jsonb := COALESCE(social.get_setting('publishing')->'backoff_minutes', '[5, 30, 120]'::jsonb);
  v_minutes integer;
  v_new text;
BEGIN
  SELECT * INTO v_job FROM social.publish_jobs WHERE id = (p->>'job_id')::uuid FOR UPDATE;
  IF v_job.id IS NULL OR v_job.status <> 'PUBLISHING' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_publishing', 'status', v_job.status);
  END IF;
  IF v_job.locked_by IS DISTINCT FROM p->>'execution_id' THEN
    RAISE EXCEPTION 'fail_publish: job % is locked by execution %', v_job.id, v_job.locked_by;
  END IF;

  v_new := CASE
    WHEN v_outcome = 'not_sent' AND v_job.attempt_count < v_job.max_attempts THEN 'SCHEDULED'
    WHEN v_outcome = 'unknown' THEN 'NEEDS_RECONCILIATION'
    ELSE 'FAILED'
  END;
  v_minutes := COALESCE((v_backoff->>(LEAST(v_job.attempt_count, jsonb_array_length(v_backoff)) - 1))::int, 60);

  PERFORM social.set_context(p || jsonb_build_object('reason', v_outcome || ': ' || left(COALESCE(p->>'error', ''), 400)));
  UPDATE social.publish_jobs
     SET status = v_new,
         last_error = jsonb_build_object('message', p->>'error', 'outcome', v_outcome, 'at', now(),
                                         'execution_id', p->>'execution_id', 'attempt', v_job.attempt_count),
         next_attempt_at = CASE WHEN v_new = 'SCHEDULED' THEN now() + make_interval(mins => v_minutes) END,
         locked_at = NULL, locked_by = NULL
   WHERE id = v_job.id;

  IF v_new = 'FAILED' THEN
    PERFORM social.record_failure(jsonb_build_object(
      'entity', 'content_piece', 'id', v_job.content_id,
      'error', 'Publishing failed: ' || COALESCE(p->>'error', v_outcome),
      'workflow', p->>'workflow', 'execution_id', p->>'execution_id'));
  END IF;

  RETURN jsonb_build_object('ok', true, 'job_id', v_job.id, 'status', v_new, 'outcome', v_outcome,
                            'error', left(p->>'error', 1000),
                            'next_attempt_at', CASE WHEN v_new = 'SCHEDULED' THEN now() + make_interval(mins => v_minutes) END);
END;
$$;

-- Jobs stuck in PUBLISHING (execution crashed mid-call) are never retried
-- automatically — they might already be live. They go to a human.
-- p: {older_than_minutes?}
CREATE OR REPLACE FUNCTION social.reap_stale_publishing(p jsonb DEFAULT '{}'::jsonb)
RETURNS SETOF social.publish_jobs
LANGUAGE plpgsql
AS $$
DECLARE
  v_minutes integer := COALESCE((p->>'older_than_minutes')::int,
                                (social.get_setting('publishing')->>'stale_after_minutes')::int, 15);
BEGIN
  PERFORM social.set_context(jsonb_build_object('workflow', p->>'workflow', 'execution_id', p->>'execution_id',
                                                'reason', 'stale PUBLISHING claim'));
  RETURN QUERY
  UPDATE social.publish_jobs
     SET status = 'NEEDS_RECONCILIATION',
         last_error = jsonb_build_object('message', 'Claim expired while PUBLISHING; verify on the platform',
                                         'outcome', 'unknown', 'locked_by', locked_by, 'at', now())
   WHERE status = 'PUBLISHING' AND locked_at < now() - make_interval(mins => v_minutes)
  RETURNING *;
END;
$$;

-- Human resolution of an uncertain publish.
-- p: {job_id, published: bool, platform_post_id?, platform_post_url?, workflow?, execution_id?}
CREATE OR REPLACE FUNCTION social.resolve_reconciliation(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_job social.publish_jobs;
BEGIN
  SELECT * INTO v_job FROM social.publish_jobs WHERE id = (p->>'job_id')::uuid FOR UPDATE;
  IF v_job.status IS DISTINCT FROM 'NEEDS_RECONCILIATION' THEN
    RAISE EXCEPTION 'resolve_reconciliation: job % is %', p->>'job_id', v_job.status;
  END IF;
  IF (p->>'published')::boolean THEN
    RETURN social.complete_publish(p || jsonb_build_object('execution_id', COALESCE(p->>'execution_id', 'manual')));
  END IF;
  PERFORM social.set_context(p || jsonb_build_object('reason', 'confirmed not published'));
  UPDATE social.publish_jobs SET status = 'FAILED' WHERE id = v_job.id;
  -- The piece returns to APPROVED so it can be rescheduled as a new job.
  UPDATE social.content_pieces SET status = 'APPROVED' WHERE id = v_job.content_id AND status = 'SCHEDULED';
  RETURN jsonb_build_object('ok', true, 'job_id', v_job.id, 'status', 'FAILED', 'content_status', 'APPROVED');
END;
$$;

-- -----------------------------------------------------------------------------
-- Security: RLS on, team members (existing platform roles) can read/write via
-- the app; the n8n database user is a member of social_automation.
-- The `social` schema is NOT exposed through the Supabase Data API by default.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'social' LOOP
    EXECUTE format('ALTER TABLE social.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Team members manage %1$s" ON social.%1$I FOR ALL TO authenticated
                    USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "Automation manages %1$s" ON social.%1$I FOR ALL TO social_automation
                    USING (true) WITH CHECK (true)', t);
  END LOOP;
END
$$;

GRANT USAGE ON SCHEMA social TO social_automation, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA social TO social_automation, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA social TO social_automation, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA social TO social_automation, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA social GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO social_automation, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA social GRANT USAGE, SELECT ON SEQUENCES TO social_automation, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA social GRANT EXECUTE ON FUNCTIONS TO social_automation, authenticated;
