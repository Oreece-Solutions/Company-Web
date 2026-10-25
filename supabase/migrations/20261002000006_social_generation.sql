-- =============================================================================
-- Oreece Social OS — Phase 4: briefs, format planning, copy generation
-- =============================================================================

ALTER TABLE social.content_ideas
  ADD COLUMN locked_at timestamptz,
  ADD COLUMN locked_by text;
ALTER TABLE social.content_pieces
  ADD COLUMN locked_at timestamptz,
  ADD COLUMN locked_by text,
  ADD COLUMN plan_notes text;

INSERT INTO social.settings (scope, key, value, description) VALUES
  ('global', 'generation', '{
     "max_ideas_per_run": 3,
     "max_idea_groups_per_run": 3,
     "media_formats_enabled": false,
     "max_piece_retries": 3,
     "retry_after_minutes": 30,
     "preferred_formats": {
       "linkedin": ["text", "carousel", "case_study", "image", "short_video"],
       "facebook": ["text", "link", "image", "carousel", "short_video"],
       "x": ["text", "thread", "image"],
       "instagram": ["carousel", "image", "short_video", "quote"],
       "tiktok": ["short_video", "carousel"],
       "youtube_shorts": ["short_video"],
       "youtube": ["long_video"]
     }
   }', 'Generation limits and format preferences. Polls are not offered yet (no poll-options field in copy_generate). Formats that need media (images, carousels, video) are only planned when media_formats_enabled is true (Phase 10 visual pipeline); until then media-only platforms are skipped with a reason.')
ON CONFLICT (scope, key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Source material for an idea (never includes confidential project notes)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION social.idea_source(p_idea_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT CASE i.source_type
    WHEN 'research' THEN (SELECT jsonb_build_object('type', 'research', 'title', r.title, 'url', r.url,
                            'summary', r.summary, 'key_insight', r.key_insight, 'why_it_matters', r.why_it_matters,
                            'published_at', r.published_at, 'source', s.name)
                          FROM social.research_items r LEFT JOIN social.research_sources s ON s.id = r.source_id
                          WHERE r.id = i.research_id)
    WHEN 'experience' THEN (SELECT jsonb_build_object('type', 'experience', 'category', e.category, 'title', e.title,
                              'what_happened', e.what_happened, 'lesson', e.lesson, 'context', e.context,
                              'occurred_on', e.occurred_on, 'is_opinion', e.is_opinion, 'do_not_mention', e.sensitivity_notes)
                            FROM social.experiences e WHERE e.id = i.experience_id)
    WHEN 'project' THEN (SELECT jsonb_build_object('type', 'project', 'title', s.title, 'industry', s.industry,
                           'problem', s.problem, 'solution', s.solution, 'process', s.process, 'result', s.result,
                           'lessons', s.lessons, 'must_anonymise', s.must_anonymise)
                         FROM social.project_stories s WHERE s.id = i.project_story_id)
    ELSE jsonb_build_object('type', i.source_type)
  END
  FROM social.content_ideas i WHERE i.id = p_idea_id
$$;

-- -----------------------------------------------------------------------------
-- Part A: ideas → briefs
-- -----------------------------------------------------------------------------
-- p: {execution_id, limit?}
CREATE OR REPLACE FUNCTION social.claim_ideas_for_briefing(p jsonb)
RETURNS TABLE (idea_id uuid, brand_slug text, job jsonb)
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(p->>'execution_id', '') = '' THEN
    RAISE EXCEPTION 'claim_ideas_for_briefing: execution_id is required';
  END IF;
  -- Recover claims abandoned by crashed executions.
  UPDATE social.content_ideas SET locked_at = NULL, locked_by = NULL
   WHERE locked_at < now() - interval '60 minutes' AND status IN ('IDEA', 'RESEARCHED');

  RETURN QUERY
  WITH claimed AS (
    UPDATE social.content_ideas i SET locked_at = now(), locked_by = p->>'execution_id'
     WHERE i.id IN (
       SELECT c.id FROM social.content_ideas c
       WHERE c.status IN ('IDEA', 'RESEARCHED') AND c.locked_by IS NULL
       ORDER BY c.priority DESC, c.created_at
       LIMIT COALESCE((p->>'limit')::int, (social.get_setting('generation')->>'max_ideas_per_run')::int, 3)
       FOR UPDATE SKIP LOCKED)
    RETURNING i.*
  )
  SELECT c.id, b.slug, jsonb_build_object(
           'idea', jsonb_build_object('id', c.id, 'title', c.title, 'hook', c.hook, 'angle', c.angle,
                                      'objective', c.objective, 'source_type', c.source_type,
                                      'target_platforms', c.target_platforms),
           'pillar', (SELECT jsonb_build_object('slug', cp.slug, 'name', cp.name, 'description', cp.description,
                                                'content_type', cp.content_type)
                      FROM social.content_pillars cp WHERE cp.id = c.pillar_id),
           'source', social.idea_source(c.id))
  FROM claimed c JOIN social.brands b ON b.id = c.brand_id;
END;
$$;

-- Choose a format per target platform and create DRAFT pieces + tracked links.
CREATE OR REPLACE FUNCTION social.plan_pieces(p_idea_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_idea social.content_ideas;
  v_brand social.brands;
  v_gen jsonb;
  v_track jsonb;
  v_media boolean;
  v_max_same int;
  v_platform text;
  v_format text;
  v_candidate text;
  v_planned jsonb := '[]'::jsonb;
  v_skipped jsonb := '[]'::jsonb;
  v_piece_id uuid;
  v_link text;
  v_code text;
  v_pillar_slug text;
  v_content_type text;
BEGIN
  SELECT * INTO v_idea FROM social.content_ideas WHERE id = p_idea_id;
  SELECT * INTO v_brand FROM social.brands WHERE id = v_idea.brand_id;
  SELECT slug, content_type INTO v_pillar_slug, v_content_type FROM social.content_pillars WHERE id = v_idea.pillar_id;
  v_gen := COALESCE(social.get_setting('generation', v_brand.slug), '{}'::jsonb);
  v_track := COALESCE(social.get_setting('tracking', v_brand.slug), '{}'::jsonb);
  v_media := COALESCE((v_gen->>'media_formats_enabled')::boolean, false);
  v_max_same := COALESCE((social.get_setting('calendar', v_brand.slug)->>'max_same_format_in_row')::int, 3);

  FOREACH v_platform IN ARRAY v_idea.target_platforms LOOP
    v_format := NULL;
    IF NOT EXISTS (SELECT 1 FROM social.social_accounts a WHERE a.brand_id = v_brand.id AND a.platform = v_platform AND a.active) THEN
      v_skipped := v_skipped || jsonb_build_object('platform', v_platform, 'reason', 'no active account');
      CONTINUE;
    END IF;
    FOR v_candidate IN
      SELECT f FROM jsonb_array_elements_text(COALESCE(v_gen#>ARRAY['preferred_formats', v_platform], '["text"]'::jsonb)) WITH ORDINALITY t(f, ord)
      ORDER BY ord
    LOOP
      CONTINUE WHEN NOT EXISTS (
        SELECT 1 FROM social.platform_capabilities pc JOIN social.formats fm ON fm.slug = pc.format
        WHERE pc.platform = v_platform AND pc.format = v_candidate AND pc.supported AND pc.publishable_via_api
          AND (v_media OR NOT fm.needs_media));
      -- Format/idea fit
      CONTINUE WHEN v_candidate = 'case_study' AND v_idea.source_type <> 'project';
      CONTINUE WHEN v_candidate = 'poll' AND COALESCE(v_idea.objective, '') <> 'engagement';
      CONTINUE WHEN v_candidate = 'quote' AND v_content_type NOT IN ('opinion', 'story');
      -- Rotation: skip a format used for the last N pieces on this platform.
      CONTINUE WHEN v_max_same > 0 AND (
        SELECT count(*) = v_max_same AND bool_and(x.format = v_candidate)
        FROM (SELECT cp.format FROM social.content_pieces cp
              WHERE cp.brand_id = v_brand.id AND cp.platform = v_platform
              ORDER BY cp.created_at DESC LIMIT v_max_same) x)
        AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(v_gen#>ARRAY['preferred_formats', v_platform]) o(f)
                    JOIN social.platform_capabilities pc2 ON pc2.platform = v_platform AND pc2.format = o.f
                    JOIN social.formats fm2 ON fm2.slug = o.f
                    WHERE o.f <> v_candidate AND pc2.supported AND pc2.publishable_via_api AND (v_media OR NOT fm2.needs_media));
      v_format := v_candidate;
      EXIT;
    END LOOP;

    IF v_format IS NULL THEN
      v_skipped := v_skipped || jsonb_build_object('platform', v_platform,
        'reason', CASE WHEN v_media THEN 'no supported format' ELSE 'platform needs media; media formats are disabled until the visual pipeline is enabled' END);
      CONTINUE;
    END IF;

    INSERT INTO social.content_pieces (idea_id, brief_id, brand_id, platform, format, plan_notes)
    VALUES (v_idea.id, (SELECT id FROM social.content_briefs WHERE idea_id = v_idea.id), v_brand.id, v_platform, v_format,
            'format chosen from preferences/rotation')
    ON CONFLICT (idea_id, platform, format) DO NOTHING
    RETURNING id INTO v_piece_id;
    CONTINUE WHEN v_piece_id IS NULL;

    -- Tracked link for platforms where links work in the post body.
    -- Uses the brand's own website (the founder brand has none until you set one).
    IF v_platform IN ('linkedin', 'facebook', 'x', 'youtube', 'youtube_shorts') AND v_brand.website_url IS NOT NULL THEN
      v_code := substr(md5(v_piece_id::text), 1, 10);
      v_link := rtrim(v_brand.website_url, '/')
                || '/?utm_source=' || v_platform
                || '&utm_medium=' || COALESCE(v_track->>'utm_medium', 'social')
                || '&utm_campaign=' || COALESCE(v_pillar_slug, 'general')
                || '&utm_content=' || v_code;
      INSERT INTO social.tracked_links (content_id, code, destination_url, utm)
      VALUES (v_piece_id, v_code, v_link, jsonb_build_object('source', v_platform, 'medium', COALESCE(v_track->>'utm_medium', 'social'),
                                                              'campaign', COALESCE(v_pillar_slug, 'general'), 'content', v_code));
      UPDATE social.content_pieces SET link_url = v_link WHERE id = v_piece_id;
    END IF;

    v_planned := v_planned || jsonb_build_object('piece_id', v_piece_id, 'platform', v_platform, 'format', v_format);
  END LOOP;

  RETURN jsonb_build_object('planned', v_planned, 'skipped', v_skipped);
END;
$$;

-- Store the brief, plan pieces and move the idea into production.
-- p: {idea_id, execution_id, brief, prompt_key?, prompt_version?, model?, workflow?}
CREATE OR REPLACE FUNCTION social.save_brief(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_idea social.content_ideas;
  v_plan jsonb;
BEGIN
  SELECT * INTO v_idea FROM social.content_ideas WHERE id = (p->>'idea_id')::uuid FOR UPDATE;
  IF v_idea.id IS NULL OR v_idea.locked_by IS DISTINCT FROM p->>'execution_id' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_claimed_by_execution');
  END IF;
  PERFORM social.set_context(p || jsonb_build_object('reason', 'brief created'));

  INSERT INTO social.content_briefs (idea_id, brand_id, brief, prompt_key, prompt_version, model)
  VALUES (v_idea.id, v_idea.brand_id, p->'brief', p->>'prompt_key', (p->>'prompt_version')::int, p->>'model')
  ON CONFLICT (idea_id) DO UPDATE SET brief = EXCLUDED.brief, prompt_key = EXCLUDED.prompt_key,
    prompt_version = EXCLUDED.prompt_version, model = EXCLUDED.model, created_at = now();

  UPDATE social.content_ideas SET status = 'BRIEF_CREATED' WHERE id = v_idea.id;
  v_plan := social.plan_pieces(v_idea.id);

  IF jsonb_array_length(v_plan->'planned') = 0 THEN
    PERFORM social.set_context(p || jsonb_build_object('reason', 'no platform could take this idea: ' || (v_plan->'skipped')::text));
    UPDATE social.content_ideas SET status = 'REJECTED', locked_at = NULL, locked_by = NULL,
           last_error = 'No publishable platform/format: ' || (v_plan->'skipped')::text
     WHERE id = v_idea.id;
    RETURN jsonb_build_object('ok', true, 'idea_id', v_idea.id, 'status', 'REJECTED', 'plan', v_plan);
  END IF;

  UPDATE social.content_ideas SET status = 'IN_PRODUCTION', locked_at = NULL, locked_by = NULL WHERE id = v_idea.id;
  RETURN jsonb_build_object('ok', true, 'idea_id', v_idea.id, 'status', 'IN_PRODUCTION', 'plan', v_plan);
END;
$$;

-- AI failed for an idea brief. p: {idea_id, execution_id, error, retryable}
CREATE OR REPLACE FUNCTION social.release_idea_claim(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_idea social.content_ideas;
BEGIN
  SELECT * INTO v_idea FROM social.content_ideas WHERE id = (p->>'idea_id')::uuid FOR UPDATE;
  IF v_idea.id IS NULL OR v_idea.locked_by IS DISTINCT FROM p->>'execution_id' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_claimed_by_execution');
  END IF;
  UPDATE social.content_ideas SET locked_at = NULL, locked_by = NULL WHERE id = v_idea.id;
  IF COALESCE((p->>'retryable')::boolean, true) AND v_idea.retry_count < 2 THEN
    UPDATE social.content_ideas SET retry_count = retry_count + 1, last_error = left(p->>'error', 2000) WHERE id = v_idea.id;
    RETURN jsonb_build_object('ok', true, 'status', v_idea.status, 'will_retry', true);
  END IF;
  RETURN social.record_failure(jsonb_build_object('entity', 'content_idea', 'id', v_idea.id, 'error', p->>'error',
                                                  'workflow', p->>'workflow', 'execution_id', p->>'execution_id'));
END;
$$;

-- -----------------------------------------------------------------------------
-- Part B: DRAFT pieces → copy (grouped per idea: one call writes every platform)
-- -----------------------------------------------------------------------------
-- p: {execution_id, limit?}
CREATE OR REPLACE FUNCTION social.claim_pieces_for_generation(p jsonb)
RETURNS TABLE (idea_id uuid, brand_slug text, job jsonb)
LANGUAGE plpgsql
AS $$
DECLARE
  v_gen jsonb := COALESCE(social.get_setting('generation'), '{}'::jsonb);
  v_retries int := COALESCE((v_gen->>'max_piece_retries')::int, 3);
  v_after int := COALESCE((v_gen->>'retry_after_minutes')::int, 30);
BEGIN
  IF COALESCE(p->>'execution_id', '') = '' THEN
    RAISE EXCEPTION 'claim_pieces_for_generation: execution_id is required';
  END IF;
  PERFORM social.set_context(p || jsonb_build_object('reason', 'automatic retry'));
  -- Failed pieces get another attempt after a pause, up to max_piece_retries.
  UPDATE social.content_pieces SET status = 'DRAFT'
   WHERE status = 'FAILED' AND retry_count < v_retries AND failed_at < now() - make_interval(mins => v_after)
     AND failed_workflow = '04_CONTENT_GENERATION';
  UPDATE social.content_pieces SET locked_at = NULL, locked_by = NULL
   WHERE status = 'DRAFT' AND locked_at < now() - interval '60 minutes';

  RETURN QUERY
  WITH ideas AS (
    SELECT DISTINCT ON (cp.idea_id) cp.idea_id
    FROM social.content_pieces cp
    JOIN social.content_ideas ci ON ci.id = cp.idea_id
    WHERE cp.status = 'DRAFT' AND cp.locked_by IS NULL AND ci.status IN ('IN_PRODUCTION', 'DONE')
    ORDER BY cp.idea_id
  ),
  picked AS (
    SELECT i.idea_id FROM ideas i
    JOIN social.content_ideas ci ON ci.id = i.idea_id
    ORDER BY ci.priority DESC, ci.created_at
    LIMIT COALESCE((p->>'limit')::int, (v_gen->>'max_idea_groups_per_run')::int, 3)
  ),
  locked AS (
    UPDATE social.content_pieces cp SET locked_at = now(), locked_by = p->>'execution_id'
     WHERE cp.idea_id IN (SELECT picked.idea_id FROM picked) AND cp.status = 'DRAFT' AND cp.locked_by IS NULL
    RETURNING cp.*
  )
  SELECT ci.id, b.slug, jsonb_build_object(
           'idea', jsonb_build_object('id', ci.id, 'title', ci.title, 'hook', ci.hook, 'angle', ci.angle, 'objective', ci.objective),
           'pillar', (SELECT jsonb_build_object('slug', cp.slug, 'name', cp.name, 'content_type', cp.content_type)
                      FROM social.content_pillars cp WHERE cp.id = ci.pillar_id),
           'brief', (SELECT cb.brief FROM social.content_briefs cb WHERE cb.idea_id = ci.id),
           'source', social.idea_source(ci.id),
           'pieces', jsonb_agg(jsonb_build_object(
              'piece_id', l.id, 'platform', l.platform, 'format', l.format, 'revision', l.revision,
              'reviewer_feedback', l.feedback, 'link_url', l.link_url,
              'previous_version', CASE WHEN l.revision > 1 THEN jsonb_build_object('caption', l.caption, 'hook', l.hook) END,
              'rules', (SELECT jsonb_build_object('max_chars', pc.max_chars, 'max_title_chars', pc.max_title_chars,
                          'max_hashtags', pc.max_hashtags, 'recommended_hashtags', pc.recommended_hashtags,
                          'media_spec', pc.media_spec, 'cta_rules', pc.cta_rules, 'style_notes', pc.style_notes)
                        FROM social.platform_capabilities pc WHERE pc.platform = l.platform AND pc.format = l.format))
              ORDER BY l.platform))
  FROM locked l
  JOIN social.content_ideas ci ON ci.id = l.idea_id
  JOIN social.brands b ON b.id = ci.brand_id
  GROUP BY ci.id, b.slug;
END;
$$;

-- Mark the idea DONE once no piece is waiting for (re)generation.
CREATE OR REPLACE FUNCTION social.refresh_idea_production(p_idea_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_retries int := COALESCE((social.get_setting('generation')->>'max_piece_retries')::int, 3);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM social.content_pieces
                 WHERE idea_id = p_idea_id
                   AND (status = 'DRAFT' OR (status = 'FAILED' AND retry_count < v_retries))) THEN
    UPDATE social.content_ideas SET status = 'DONE' WHERE id = p_idea_id AND status = 'IN_PRODUCTION';
  END IF;
END;
$$;

-- Store generated copy for the claimed pieces of one idea.
-- p: {idea_id, execution_id, workflow?, prompt_key, prompt_version, model,
--     pieces: [{piece_id, headline, hook, caption, cta, hashtags[], carousel_slides[], script{},
--               thread_parts[], visual_brief{}, source_citations[]}]}
CREATE OR REPLACE FUNCTION social.save_generated_content(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_piece social.content_pieces;
  v_out jsonb;
  v_saved int := 0;
  v_missing int := 0;
  v_hashtags text[];
BEGIN
  PERFORM social.set_context(p || jsonb_build_object('reason', 'copy generated'));
  FOR v_piece IN
    SELECT * FROM social.content_pieces
    WHERE idea_id = (p->>'idea_id')::uuid AND status = 'DRAFT' AND locked_by = p->>'execution_id'
    FOR UPDATE
  LOOP
    SELECT value INTO v_out FROM jsonb_array_elements(COALESCE(p->'pieces', '[]'::jsonb))
     WHERE value->>'piece_id' = v_piece.id::text LIMIT 1;

    IF v_out IS NULL OR COALESCE(btrim(v_out->>'caption'), '') = '' THEN
      v_missing := v_missing + 1;
      UPDATE social.content_pieces SET locked_at = NULL, locked_by = NULL WHERE id = v_piece.id;
      PERFORM social.record_failure(jsonb_build_object('entity', 'content_piece', 'id', v_piece.id,
        'error', 'Model returned no copy for this platform', 'workflow', COALESCE(p->>'workflow', '04_CONTENT_GENERATION'),
        'execution_id', p->>'execution_id'));
      CONTINUE;
    END IF;

    -- Normalise hashtags: one leading #, no spaces, unique.
    v_hashtags := ARRAY(
      SELECT tag FROM (
        SELECT DISTINCT ON (lower(t.tag)) t.tag, t.ord
        FROM (SELECT '#' || regexp_replace(btrim(h), '^#+|\s+', '', 'g') AS tag, ord
              FROM jsonb_array_elements_text(COALESCE(v_out->'hashtags', '[]'::jsonb)) WITH ORDINALITY x(h, ord)
              WHERE btrim(h, ' #') <> '') t
        ORDER BY lower(t.tag), t.ord) d
      ORDER BY d.ord);

    UPDATE social.content_pieces SET
      headline = NULLIF(v_out->>'headline', ''),
      hook = NULLIF(v_out->>'hook', ''),
      caption = v_out->>'caption',
      cta = NULLIF(v_out->>'cta', ''),
      hashtags = v_hashtags,
      carousel_slides = CASE WHEN jsonb_array_length(COALESCE(v_out->'carousel_slides', '[]')) > 0 THEN v_out->'carousel_slides' END,
      script = CASE WHEN jsonb_array_length(COALESCE(v_out#>'{script,scenes}', '[]')) > 0 THEN v_out->'script' END,
      thread_parts = CASE WHEN jsonb_array_length(COALESCE(v_out->'thread_parts', '[]')) > 0
                          THEN ARRAY(SELECT jsonb_array_elements_text(v_out->'thread_parts')) END,
      visual_brief = v_out->'visual_brief',
      source_citations = COALESCE(v_out->'source_citations', '[]'::jsonb),
      prompt_key = p->>'prompt_key', prompt_version = (p->>'prompt_version')::int, model = p->>'model',
      content_hash = md5(social.title_key(v_out->>'caption')),
      generation_meta = generation_meta || jsonb_build_object('generated_at', now(), 'execution_id', p->>'execution_id'),
      last_error = NULL,
      locked_at = NULL, locked_by = NULL,
      status = 'GENERATED'
    WHERE id = v_piece.id;

    INSERT INTO social.content_revisions (content_id, revision, snapshot, reason)
    SELECT id, revision, to_jsonb(cp) - 'generation_meta', CASE WHEN revision > 1 THEN 'regenerated with feedback' ELSE 'initial generation' END
    FROM social.content_pieces cp WHERE id = v_piece.id
    ON CONFLICT (content_id, revision) DO UPDATE SET snapshot = EXCLUDED.snapshot, created_at = now();

    v_saved := v_saved + 1;
  END LOOP;

  PERFORM social.refresh_idea_production((p->>'idea_id')::uuid);
  RETURN jsonb_build_object('ok', true, 'idea_id', p->>'idea_id', 'saved', v_saved, 'missing', v_missing);
END;
$$;

-- AI failed for an idea group. p: {idea_id, execution_id, error, retryable, workflow?}
CREATE OR REPLACE FUNCTION social.release_piece_claims(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_id uuid;
  v_n int := 0;
BEGIN
  FOR v_id IN
    SELECT id FROM social.content_pieces
    WHERE idea_id = (p->>'idea_id')::uuid AND status = 'DRAFT' AND locked_by = p->>'execution_id'
  LOOP
    UPDATE social.content_pieces SET locked_at = NULL, locked_by = NULL WHERE id = v_id;
    -- Non-retryable errors exhaust retries immediately.
    IF NOT COALESCE((p->>'retryable')::boolean, true) THEN
      UPDATE social.content_pieces SET retry_count = GREATEST(retry_count,
        COALESCE((social.get_setting('generation')->>'max_piece_retries')::int, 3)) WHERE id = v_id;
    END IF;
    PERFORM social.record_failure(jsonb_build_object('entity', 'content_piece', 'id', v_id,
      'error', p->>'error', 'workflow', COALESCE(p->>'workflow', '04_CONTENT_GENERATION'), 'execution_id', p->>'execution_id'));
    v_n := v_n + 1;
  END LOOP;
  PERFORM social.refresh_idea_production((p->>'idea_id')::uuid);
  RETURN jsonb_build_object('ok', true, 'released', v_n);
END;
$$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA social TO social_automation, authenticated;
