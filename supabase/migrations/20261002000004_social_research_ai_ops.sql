-- =============================================================================
-- Oreece Social OS — Phase 2: research engine, AI gateway support, error ops
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Research items: claim-based analysis
-- -----------------------------------------------------------------------------
ALTER TABLE social.research_items
  ADD COLUMN locked_at     timestamptz,
  ADD COLUMN locked_by     text,
  ADD COLUMN reject_reason text;

INSERT INTO social.status_transitions (entity_type, from_status, to_status) VALUES
  ('research_item', 'NEW', 'ANALYSING'),
  ('research_item', 'NEW', 'EXPIRED'),
  ('research_item', 'ANALYSING', 'ANALYSED'),
  ('research_item', 'ANALYSING', 'REJECTED'),
  ('research_item', 'ANALYSING', 'FAILED'),
  ('research_item', 'ANALYSING', 'NEW')
ON CONFLICT DO NOTHING;

CREATE TRIGGER research_items_history AFTER INSERT OR UPDATE OF status ON social.research_items
  FOR EACH ROW EXECUTE FUNCTION social.record_status_history('research_item');

-- Sources due for fetching. p: {limit?, type?}
CREATE OR REPLACE FUNCTION social.due_research_sources(p jsonb DEFAULT '{}'::jsonb)
RETURNS SETOF social.research_sources
LANGUAGE sql
STABLE
AS $$
  SELECT * FROM social.research_sources
  WHERE active
    AND type = COALESCE(p->>'type', 'rss')
    AND (last_fetched_at IS NULL OR last_fetched_at < now() - make_interval(hours => fetch_every_hours))
  ORDER BY last_fetched_at NULLS FIRST
  LIMIT COALESCE((p->>'limit')::int, 30)
$$;

-- Ingest one source's feed items in a single call and mark the source fetched.
-- p: {source_id, items: [{title, url, excerpt?, published_at?}], workflow?, execution_id?}
CREATE OR REPLACE FUNCTION social.ingest_research_batch(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_source social.research_sources;
  v_cfg jsonb := COALESCE(social.get_setting('research'), '{}'::jsonb);
  v_max_items int := COALESCE((v_cfg->>'max_items_per_source')::int, 10);
  v_max_age int := COALESCE((v_cfg->>'max_age_days')::int, 10);
  v_item jsonb;
  v_res jsonb;
  v_published timestamptz;
  v_received int := 0;
  v_inserted int := 0;
  v_duplicates int := 0;
  v_skipped int := 0;
BEGIN
  SELECT * INTO v_source FROM social.research_sources WHERE id = (p->>'source_id')::uuid;
  IF v_source.id IS NULL THEN
    RAISE EXCEPTION 'ingest_research_batch: source % not found', p->>'source_id';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(p->'items', '[]'::jsonb)) LIMIT v_max_items LOOP
    v_received := v_received + 1;
    -- Unparseable dates are treated as unknown rather than failing the batch.
    BEGIN
      v_published := NULLIF(v_item->>'published_at', '')::timestamptz;
    EXCEPTION WHEN others THEN
      v_published := NULL;
    END;
    IF v_published IS NOT NULL AND v_published < now() - make_interval(days => v_max_age) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;
    v_res := social.ingest_research_item(jsonb_build_object(
      'source_id', v_source.id,
      'title', btrim(v_item->>'title'),
      'url', btrim(v_item->>'url'),
      'excerpt', v_item->>'excerpt',
      'published_at', v_published,
      'topics', to_jsonb(v_source.topics)));
    IF (v_res->>'inserted')::boolean THEN
      v_inserted := v_inserted + 1;
    ELSIF v_res->>'reason' IN ('duplicate_url', 'duplicate_title') THEN
      v_duplicates := v_duplicates + 1;
    ELSE
      v_skipped := v_skipped + 1;
    END IF;
  END LOOP;

  UPDATE social.research_sources
     SET last_fetched_at = now(), failure_count = 0, last_error = NULL
   WHERE id = v_source.id;

  RETURN jsonb_build_object('source_id', v_source.id, 'source', v_source.name, 'received', v_received,
                            'inserted', v_inserted, 'duplicates', v_duplicates, 'skipped', v_skipped);
END;
$$;

-- One call per research run: ingest every successful feed and record every
-- failed one. p: {results: [{source_id, ok, items?, error?}], workflow?, execution_id?}
CREATE OR REPLACE FUNCTION social.ingest_research_run(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  r jsonb;
  v_res jsonb;
  v_sum jsonb := jsonb_build_object('sources', 0, 'inserted', 0, 'duplicates', 0, 'skipped', 0, 'failed', 0, 'deactivated', 0);
BEGIN
  FOR r IN SELECT value FROM jsonb_array_elements(COALESCE(p->'results', '[]'::jsonb)) LOOP
    v_sum := jsonb_set(v_sum, '{sources}', to_jsonb((v_sum->>'sources')::int + 1));
    IF COALESCE((r->>'ok')::boolean, false) THEN
      v_res := social.ingest_research_batch(jsonb_build_object('source_id', r->>'source_id', 'items', COALESCE(r->'items', '[]'::jsonb)));
      v_sum := v_sum || jsonb_build_object(
        'inserted', (v_sum->>'inserted')::int + (v_res->>'inserted')::int,
        'duplicates', (v_sum->>'duplicates')::int + (v_res->>'duplicates')::int,
        'skipped', (v_sum->>'skipped')::int + (v_res->>'skipped')::int);
    ELSE
      v_res := social.record_source_failure(jsonb_build_object('source_id', r->>'source_id', 'error', r->>'error'));
      v_sum := v_sum || jsonb_build_object(
        'failed', (v_sum->>'failed')::int + 1,
        'deactivated', (v_sum->>'deactivated')::int + CASE WHEN (v_res->>'deactivated')::boolean THEN 1 ELSE 0 END);
    END IF;
  END LOOP;
  RETURN v_sum;
END;
$$;

-- A source failed to fetch/parse. Deactivates it after N consecutive failures.
-- p: {source_id, error}
CREATE OR REPLACE FUNCTION social.record_source_failure(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_limit int := COALESCE((social.get_setting('research')->>'deactivate_source_after_failures')::int, 5);
  v_src social.research_sources;
BEGIN
  UPDATE social.research_sources
     SET failure_count = failure_count + 1,
         last_error = left(COALESCE(p->>'error', 'unknown error'), 1000),
         last_fetched_at = now(),          -- back off until the next interval
         active = CASE WHEN failure_count + 1 >= v_limit THEN false ELSE active END
   WHERE id = (p->>'source_id')::uuid
  RETURNING * INTO v_src;
  IF v_src.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;
  IF NOT v_src.active THEN
    PERFORM social.enqueue_notification(jsonb_build_object(
      'type', 'source_deactivated', 'severity', 'warning',
      'title', 'Research source deactivated: ' || v_src.name,
      'body', v_src.failure_count || ' consecutive failures. Last error: ' || COALESCE(v_src.last_error, ''),
      'dedupe_key', 'source_deactivated:' || v_src.id || ':' || to_char(now(), 'YYYY-MM-DD'),
      'payload', jsonb_build_object('source_id', v_src.id, 'url', v_src.url)));
  END IF;
  RETURN jsonb_build_object('ok', true, 'failure_count', v_src.failure_count, 'deactivated', NOT v_src.active);
END;
$$;

-- Claim NEW research for AI analysis (one execution per item). Also expires
-- stale NEW items and recovers ANALYSING claims abandoned by crashed runs.
-- p: {execution_id, limit?, workflow?}
CREATE OR REPLACE FUNCTION social.claim_research_for_analysis(p jsonb)
RETURNS TABLE (
  id uuid, title text, url text, excerpt text, published_at timestamptz, topics text[],
  source_name text, source_region text, source_quality numeric
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_cfg jsonb := COALESCE(social.get_setting('research'), '{}'::jsonb);
  v_max_age int := COALESCE((v_cfg->>'max_age_days')::int, 10);
BEGIN
  IF COALESCE(p->>'execution_id', '') = '' THEN
    RAISE EXCEPTION 'claim_research_for_analysis: execution_id is required';
  END IF;
  PERFORM social.set_context(p || jsonb_build_object('reason', 'research housekeeping'));

  UPDATE social.research_items r SET status = 'EXPIRED'
   WHERE r.status = 'NEW'
     AND COALESCE(r.published_at, r.collected_at) < now() - make_interval(days => v_max_age);

  UPDATE social.research_items r
     SET status = CASE WHEN r.retry_count >= 2 THEN 'FAILED' ELSE 'NEW' END,
         retry_count = r.retry_count + 1,
         last_error = 'analysis claim expired (execution ' || COALESCE(r.locked_by, '?') || ')',
         locked_at = NULL, locked_by = NULL
   WHERE r.status = 'ANALYSING' AND r.locked_at < now() - interval '60 minutes';

  PERFORM social.set_context(p || jsonb_build_object('reason', 'claimed for analysis'));
  RETURN QUERY
  WITH claimed AS (
    UPDATE social.research_items r
       SET status = 'ANALYSING', locked_at = now(), locked_by = p->>'execution_id'
     WHERE r.id IN (
       SELECT c.id FROM social.research_items c
       WHERE c.status = 'NEW'
       ORDER BY (SELECT rs.quality_score FROM social.research_sources rs WHERE rs.id = c.source_id) DESC NULLS LAST,
                COALESCE(c.published_at, c.collected_at) DESC
       LIMIT COALESCE((p->>'limit')::int, COALESCE((v_cfg->>'max_analyse_per_run')::int, 25))
       FOR UPDATE SKIP LOCKED)
    RETURNING r.*
  )
  SELECT c.id, c.title, c.url, c.excerpt, c.published_at, c.topics,
         s.name, s.region, s.quality_score
  FROM claimed c
  LEFT JOIN social.research_sources s ON s.id = c.source_id;
END;
$$;

-- Store an AI analysis and decide ANALYSED vs REJECTED.
-- p: {id, execution_id, workflow?, analysis: {summary, key_insight, why_it_matters,
--     topics[], relevance_score, brand_fit[{brand, score, reason}] (or {slug: score}),
--     quality_flags[], recommendation, reject_reason?}}
CREATE OR REPLACE FUNCTION social.save_research_analysis(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_item social.research_items;
  a jsonb := p->'analysis';
  v_min numeric := COALESCE((social.get_setting('research')->>'min_relevance')::numeric, 0.6);
  v_score numeric := LEAST(GREATEST(COALESCE((a->>'relevance_score')::numeric, 0), 0), 1);
  v_flags text[] := COALESCE(ARRAY(SELECT jsonb_array_elements_text(a->'quality_flags')), '{}');
  v_blocking constant text[] := ARRAY['low_quality_source', 'promotional', 'paywalled_no_content',
                                      'unverifiable', 'off_topic', 'sensitive', 'duplicate_story'];
  v_reason text;
  v_status text;
BEGIN
  SELECT * INTO v_item FROM social.research_items WHERE id = (p->>'id')::uuid FOR UPDATE;
  IF v_item.id IS NULL OR v_item.status <> 'ANALYSING' OR v_item.locked_by IS DISTINCT FROM p->>'execution_id' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_claimed_by_execution', 'status', v_item.status);
  END IF;

  v_reason := CASE
    WHEN COALESCE(a->>'recommendation', 'reject') <> 'use' THEN COALESCE(a->>'reject_reason', 'model recommended reject')
    WHEN v_score < v_min THEN format('relevance %s below minimum %s', v_score, v_min)
    WHEN v_flags && v_blocking THEN 'blocking quality flag: ' || array_to_string(social.text_array_intersect(v_flags, v_blocking), ', ')
  END;
  v_status := CASE WHEN v_reason IS NULL THEN 'ANALYSED' ELSE 'REJECTED' END;

  PERFORM social.set_context(p || jsonb_build_object('reason', COALESCE(v_reason, 'analysed')));
  UPDATE social.research_items
     SET summary = a->>'summary',
         key_insight = a->>'key_insight',
         why_it_matters = a->>'why_it_matters',
         topics = CASE WHEN jsonb_typeof(a->'topics') = 'array'
                       THEN ARRAY(SELECT jsonb_array_elements_text(a->'topics')) ELSE topics END,
         relevance_score = v_score,
         brand_fit = CASE WHEN jsonb_typeof(a->'brand_fit') = 'array'
                          THEN COALESCE((SELECT jsonb_object_agg(e->>'brand', (e->>'score')::numeric)
                                         FROM jsonb_array_elements(a->'brand_fit') e), '{}'::jsonb)
                          ELSE COALESCE(a->'brand_fit', '{}'::jsonb) END,
         quality_flags = v_flags,
         reject_reason = v_reason,
         analysed_at = now(),
         status = v_status,
         locked_at = NULL, locked_by = NULL
   WHERE id = v_item.id;

  RETURN jsonb_build_object('ok', true, 'id', v_item.id, 'status', v_status, 'reject_reason', v_reason);
END;
$$;

-- AI analysis failed for a claimed item. Retryable errors go back to the
-- queue (up to 3 attempts); others fail. p: {id, execution_id, error, retryable, workflow?}
CREATE OR REPLACE FUNCTION social.release_research_claim(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_item social.research_items;
  v_status text;
BEGIN
  SELECT * INTO v_item FROM social.research_items WHERE id = (p->>'id')::uuid FOR UPDATE;
  IF v_item.id IS NULL OR v_item.status <> 'ANALYSING' OR v_item.locked_by IS DISTINCT FROM p->>'execution_id' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_claimed_by_execution');
  END IF;
  v_status := CASE WHEN COALESCE((p->>'retryable')::boolean, true) AND v_item.retry_count < 2 THEN 'NEW' ELSE 'FAILED' END;
  PERFORM social.set_context(p || jsonb_build_object('reason', left(COALESCE(p->>'error', 'analysis failed'), 500)));
  UPDATE social.research_items
     SET status = v_status, retry_count = retry_count + 1,
         last_error = left(COALESCE(p->>'error', 'analysis failed'), 2000),
         locked_at = NULL, locked_by = NULL
   WHERE id = v_item.id;
  RETURN jsonb_build_object('ok', true, 'id', v_item.id, 'status', v_status);
END;
$$;

-- text[] intersection helper used above (resolved at call time).
CREATE OR REPLACE FUNCTION social.text_array_intersect(a text[], b text[])
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$ SELECT COALESCE(ARRAY(SELECT unnest(a) INTERSECT SELECT unnest(b)), '{}') $$;

-- -----------------------------------------------------------------------------
-- AI gateway support
-- -----------------------------------------------------------------------------
CREATE TABLE social.ai_usage (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at         timestamptz NOT NULL DEFAULT now(),
  workflow           text,
  execution_id       text,
  prompt_key         text NOT NULL,
  prompt_version     integer,
  provider           text,
  model              text,
  ok                 boolean NOT NULL,
  stop_reason        text,
  input_tokens       integer,
  output_tokens      integer,
  cache_read_tokens  integer,
  cache_write_tokens integer,
  entity_type        text,
  entity_id          uuid,
  error              text
);
CREATE INDEX ai_usage_created_idx ON social.ai_usage (created_at DESC);
ALTER TABLE social.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members manage ai_usage" ON social.ai_usage FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "Automation manages ai_usage" ON social.ai_usage FOR ALL TO social_automation
  USING (true) WITH CHECK (true);

-- Everything the gateway needs for one call.
-- p: {prompt_key, brand_slug?}
CREATE OR REPLACE FUNCTION social.ai_context(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_prompt jsonb;
  v_brand jsonb;
BEGIN
  SELECT jsonb_build_object('key', key, 'version', version, 'system_prompt', system_prompt,
                            'user_template', user_template, 'output_schema', output_schema,
                            'tier', model_tier, 'max_tokens', max_tokens)
    INTO v_prompt
    FROM social.prompt_templates
   WHERE key = p->>'prompt_key' AND active
   ORDER BY version DESC
   LIMIT 1;
  IF v_prompt IS NULL THEN
    RAISE EXCEPTION 'ai_context: no active prompt "%" — run db/seed/prompts.sql', p->>'prompt_key';
  END IF;

  IF COALESCE(p->>'brand_slug', '') <> '' THEN
    SELECT jsonb_build_object(
             'slug', b.slug, 'name', b.name, 'kind', b.kind, 'description', b.description,
             'target_audience', b.target_audience, 'positioning', b.positioning,
             'default_cta', b.default_cta, 'website_url', b.website_url,
             'voice', to_jsonb(v) - 'brand_id' - 'updated_at')
      INTO v_brand
      FROM social.brands b
      LEFT JOIN social.brand_voice v ON v.brand_id = b.id
     WHERE b.slug = p->>'brand_slug';
    IF v_brand IS NULL THEN
      RAISE EXCEPTION 'ai_context: unknown brand "%"', p->>'brand_slug';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'prompt', v_prompt,
    'brand', v_brand,
    'brands', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                 'slug', b.slug, 'name', b.name, 'kind', b.kind, 'target_audience', b.target_audience,
                 'positioning', b.positioning,
                 'pillars', (SELECT COALESCE(jsonb_agg(jsonb_build_object('slug', cp.slug, 'name', cp.name, 'content_type', cp.content_type) ORDER BY cp.weight DESC), '[]')
                             FROM social.content_pillars cp WHERE cp.brand_id = b.id AND cp.active))
               ORDER BY b.slug), '[]') FROM social.brands b WHERE b.active),
    'ai', social.get_setting('ai', p->>'brand_slug'),
    'timezone', social.get_setting('timezone') #>> '{}',
    'now', now());
END;
$$;

-- Records token usage and returns the gateway result unchanged, so the
-- gateway's final node output is {ai: <result>}.
-- p: the gateway result {ok, prompt_key, prompt_version, model, usage{}, stop_reason, error?, meta{...}}
CREATE OR REPLACE FUNCTION social.record_ai_usage(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO social.ai_usage (workflow, execution_id, prompt_key, prompt_version, provider, model, ok,
                               stop_reason, input_tokens, output_tokens, cache_read_tokens,
                               cache_write_tokens, entity_type, entity_id, error)
  VALUES (p#>>'{meta,workflow}', p#>>'{meta,execution_id}', COALESCE(p->>'prompt_key', 'unknown'),
          (p->>'prompt_version')::int, p->>'provider', p->>'model', COALESCE((p->>'ok')::boolean, false),
          p->>'stop_reason', (p#>>'{usage,input_tokens}')::int, (p#>>'{usage,output_tokens}')::int,
          (p#>>'{usage,cache_read_input_tokens}')::int, (p#>>'{usage,cache_creation_input_tokens}')::int,
          p#>>'{meta,entity_type}', NULLIF(p#>>'{meta,entity_id}', '')::uuid, left(p->>'error', 2000));
  RETURN p;
END;
$$;

-- -----------------------------------------------------------------------------
-- Error handling
-- -----------------------------------------------------------------------------
-- Called by 15_ERROR_HANDLER when an execution fails as a whole.
-- p: {execution_id, workflow, error, last_node?, url?}
CREATE OR REPLACE FUNCTION social.fail_execution(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_log record;
  v_logs int := 0;
  v_entities int := 0;
  v_released int := 0;
  v_err jsonb := jsonb_build_object('message', p->>'error', 'last_node', p->>'last_node', 'url', p->>'url');
BEGIN
  FOR v_log IN
    UPDATE social.execution_log
       SET status = 'ERROR', finished_at = now(), error = v_err
     WHERE execution_id = p->>'execution_id' AND status = 'RUNNING'
    RETURNING entity_type, entity_id
  LOOP
    v_logs := v_logs + 1;
    IF v_log.entity_id IS NOT NULL AND v_log.entity_type IN ('content_piece', 'content_idea', 'research_item') THEN
      PERFORM social.record_failure(jsonb_build_object(
        'entity', v_log.entity_type, 'id', v_log.entity_id,
        'error', COALESCE(p->>'error', 'execution failed') || COALESCE(' @ ' || (p->>'last_node'), ''),
        'workflow', p->>'workflow', 'execution_id', p->>'execution_id'));
      v_entities := v_entities + 1;
    END IF;
  END LOOP;

  -- Research claims held by the failed execution go back to the queue.
  PERFORM social.set_context(p || jsonb_build_object('reason', 'execution failed; released claim'));
  UPDATE social.research_items
     SET status = 'NEW', retry_count = retry_count + 1, locked_at = NULL, locked_by = NULL,
         last_error = left(COALESCE(p->>'error', 'execution failed'), 1000)
   WHERE status = 'ANALYSING' AND locked_by = p->>'execution_id';
  GET DIAGNOSTICS v_released = ROW_COUNT;

  -- Publish jobs are deliberately NOT released: a crashed publish may have
  -- reached the platform. reap_stale_publishing sends them to reconciliation.

  IF v_logs = 0 THEN
    INSERT INTO social.execution_log (workflow, execution_id, status, finished_at, error)
    VALUES (COALESCE(p->>'workflow', 'unknown'), p->>'execution_id', 'ERROR', now(), v_err);
  END IF;

  RETURN jsonb_build_object('log_rows', GREATEST(v_logs, 1), 'entities_failed', v_entities,
                            'research_released', v_released);
END;
$$;

-- Mark a notification as delivered / failed / suppressed. p: {id, status, error?}
CREATE OR REPLACE FUNCTION social.mark_notification(p jsonb)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE social.notifications
     SET status = p->>'status',
         sent_at = CASE WHEN p->>'status' = 'SENT' THEN now() ELSE sent_at END,
         payload = payload || CASE WHEN p ? 'error' THEN jsonb_build_object('delivery_error', p->>'error') ELSE '{}'::jsonb END
   WHERE id = (p->>'id')::uuid
$$;

-- Notification routing info for SUB_NOTIFY. Returns the queued row plus where
-- to send it. p: same as enqueue_notification.
CREATE OR REPLACE FUNCTION social.queue_notification(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_row social.notifications;
  v_cfg jsonb := COALESCE(social.get_setting('notifications'), '{}'::jsonb);
BEGIN
  SELECT * INTO v_row FROM social.enqueue_notification(p);
  IF v_row.id IS NULL THEN
    RETURN jsonb_build_object('queued', false, 'reason', 'duplicate');
  END IF;
  IF v_row.channel <> 'telegram' THEN
    PERFORM social.mark_notification(jsonb_build_object('id', v_row.id, 'status', 'SUPPRESSED',
                                                        'error', 'channel ' || v_row.channel || ' not implemented yet'));
    RETURN jsonb_build_object('queued', false, 'reason', 'channel_not_implemented', 'id', v_row.id);
  END IF;
  IF COALESCE(v_cfg->>'telegram_chat_id', '') = '' THEN
    PERFORM social.mark_notification(jsonb_build_object('id', v_row.id, 'status', 'SUPPRESSED',
                                                        'error', 'telegram_chat_id not configured'));
    RETURN jsonb_build_object('queued', false, 'reason', 'no_destination', 'id', v_row.id);
  END IF;
  RETURN jsonb_build_object(
    'queued', true, 'id', v_row.id, 'channel', v_row.channel, 'severity', v_row.severity,
    'chat_id', v_cfg->>'telegram_chat_id', 'email_to', v_cfg->>'email_to',
    'text', CASE v_row.severity WHEN 'critical' THEN '🚨 ' WHEN 'warning' THEN '⚠️ ' ELSE 'ℹ️ ' END
            || v_row.title || COALESCE(E'\n\n' || v_row.body, ''));
END;
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON social.ai_usage TO social_automation, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA social TO social_automation, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA social TO social_automation, authenticated;
