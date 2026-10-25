-- =============================================================================
-- Oreece Social OS — Phase 3: content strategy (idea engine) and intake
-- =============================================================================

-- Pillar mix for a brand: target share (pillar weight within the brand,
-- scaled by settings.content_ratio for its content type) vs. what was
-- actually produced recently. Positive deficit = under-served.
CREATE OR REPLACE FUNCTION social.pillar_balance(p_brand_id uuid, p_days integer DEFAULT 30)
RETURNS TABLE (pillar_id uuid, slug text, name text, content_type text, target_share numeric, recent_count bigint, recent_share numeric, deficit numeric)
LANGUAGE sql
STABLE
AS $$
  WITH b AS (SELECT slug FROM social.brands WHERE id = p_brand_id),
  ratio AS (SELECT COALESCE(social.get_setting('content_ratio', (SELECT slug FROM b)), '{}'::jsonb) AS r),
  pillars AS (
    SELECT cp.*,
           COALESCE((SELECT (r->>cp.content_type)::numeric FROM ratio), 0.1) AS type_share
    FROM social.content_pillars cp
    WHERE cp.brand_id = p_brand_id AND cp.active AND cp.weight > 0
  ),
  typed AS (
    SELECT p.*, p.weight / NULLIF(sum(p.weight) OVER (PARTITION BY p.content_type), 0) * p.type_share AS raw_share
    FROM pillars p
  ),
  -- Promotional share is a hard cap; any share left by content types the
  -- brand has no pillars for is redistributed over non-promotional pillars.
  totals AS (
    SELECT COALESCE(sum(raw_share) FILTER (WHERE content_type = 'promotional'), 0) AS promo,
           COALESCE(sum(raw_share) FILTER (WHERE content_type <> 'promotional'), 0) AS other
    FROM typed
  ),
  norm AS (
    SELECT t.*,
           CASE WHEN t.content_type = 'promotional' THEN t.raw_share
                ELSE t.raw_share * (1 - LEAST((SELECT promo FROM totals), 1)) / NULLIF((SELECT other FROM totals), 0)
           END AS target
    FROM typed t
  ),
  recent AS (
    SELECT i.pillar_id, count(*) AS n
    FROM social.content_ideas i
    WHERE i.brand_id = p_brand_id AND i.created_at > now() - make_interval(days => p_days)
      AND i.status NOT IN ('REJECTED', 'FAILED')
    GROUP BY i.pillar_id
  ),
  total AS (SELECT GREATEST(COALESCE(sum(n), 0), 1) AS n FROM recent)
  SELECT n.id, n.slug, n.name, n.content_type,
         round(COALESCE(n.target, 0), 4),
         COALESCE(r.n, 0),
         round(COALESCE(r.n, 0)::numeric / (SELECT n FROM total), 4),
         round(COALESCE(n.target, 0) - COALESCE(r.n, 0)::numeric / (SELECT n FROM total), 4)
  FROM norm n
  LEFT JOIN recent r ON r.pillar_id = n.id
  ORDER BY 8 DESC, n.weight DESC
$$;

-- Which brands need new ideas (backlog below settings.ideas.min_backlog).
-- p: {force?: bool, brand_slug?}
CREATE OR REPLACE FUNCTION social.brands_needing_ideas(p jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE (brand_id uuid, brand_slug text, backlog bigint, needed integer)
LANGUAGE sql
STABLE
AS $$
  SELECT b.id, b.slug, COALESCE(q.n, 0),
         COALESCE((social.get_setting('ideas', b.slug)->>'per_brand_per_run')::int, 6)
  FROM social.brands b
  LEFT JOIN LATERAL (
    SELECT count(*) AS n FROM social.content_ideas i
    WHERE i.brand_id = b.id AND i.status IN ('IDEA', 'RESEARCHED', 'BRIEF_CREATED')
  ) q ON true
  WHERE b.active
    AND (p->>'brand_slug' IS NULL OR b.slug = p->>'brand_slug')
    AND (COALESCE((p->>'force')::boolean, false)
         OR COALESCE(q.n, 0) < COALESCE((social.get_setting('ideas', b.slug)->>'min_backlog')::int, 10))
    AND EXISTS (SELECT 1 FROM social.social_accounts a WHERE a.brand_id = b.id AND a.active)
  ORDER BY b.slug
$$;

-- Everything the idea prompt needs for one brand, as one document.
-- p: {brand_slug}
CREATE OR REPLACE FUNCTION social.strategy_context(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_brand social.brands;
  v_cfg jsonb;
  v_cooldown int;
BEGIN
  SELECT * INTO v_brand FROM social.brands WHERE slug = p->>'brand_slug' AND active;
  IF v_brand.id IS NULL THEN
    RAISE EXCEPTION 'strategy_context: unknown or inactive brand %', p->>'brand_slug';
  END IF;
  v_cfg := COALESCE(social.get_setting('ideas', v_brand.slug), '{}'::jsonb);
  v_cooldown := COALESCE((v_cfg->>'topic_cooldown_days')::int, 21);

  RETURN jsonb_build_object(
    'brand_slug', v_brand.slug,
    'brand_kind', v_brand.kind,
    'ideas_wanted', COALESCE((v_cfg->>'per_brand_per_run')::int, 6),
    'content_ratio', social.get_setting('content_ratio', v_brand.slug),
    'platforms', (SELECT COALESCE(jsonb_agg(DISTINCT a.platform), '[]')
                  FROM social.social_accounts a WHERE a.brand_id = v_brand.id AND a.active),
    'pillars', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                  'slug', pb.slug, 'name', pb.name, 'content_type', pb.content_type,
                  'target_share', pb.target_share, 'recent_share', pb.recent_share, 'deficit', pb.deficit,
                  'description', (SELECT description FROM social.content_pillars WHERE id = pb.pillar_id))), '[]')
                FROM social.pillar_balance(v_brand.id, 30) pb),
    'research', (SELECT COALESCE(jsonb_agg(x ORDER BY x.fit DESC), '[]') FROM (
                  SELECT r.id, r.title, r.summary, r.key_insight, r.why_it_matters, r.topics, r.url,
                         (r.brand_fit->>v_brand.slug)::numeric AS fit
                  FROM social.research_items r
                  WHERE r.status = 'ANALYSED'
                    AND COALESCE((r.brand_fit->>v_brand.slug)::numeric, 0) >= 0.5
                    AND NOT EXISTS (SELECT 1 FROM social.content_ideas i WHERE i.research_id = r.id AND i.brand_id = v_brand.id)
                  ORDER BY (r.brand_fit->>v_brand.slug)::numeric DESC, r.analysed_at DESC
                  LIMIT 12) x),
    'experiences', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                      'id', e.id, 'category', e.category, 'title', e.title, 'what_happened', e.what_happened,
                      'lesson', e.lesson, 'context', e.context, 'occurred_on', e.occurred_on,
                      'is_opinion', e.is_opinion, 'do_not_mention', e.sensitivity_notes, 'times_used', e.times_used)
                      ORDER BY e.times_used, e.created_at DESC), '[]')
                    FROM social.experiences e
                    WHERE e.brand_id = v_brand.id AND e.publishable
                      AND (e.last_used_at IS NULL OR e.last_used_at < now() - interval '45 days')),
    'project_stories', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                          'id', s.id, 'title', s.title, 'industry', s.industry, 'problem', s.problem,
                          'solution', s.solution, 'process', s.process, 'result', s.result, 'lessons', s.lessons,
                          'must_anonymise', s.must_anonymise)), '[]')
                        FROM social.project_stories s
                        WHERE s.brand_id = v_brand.id AND s.client_content_permission
                          AND NOT EXISTS (SELECT 1 FROM social.content_ideas i
                                          WHERE i.project_story_id = s.id AND i.created_at > now() - interval '60 days')),
    'avoid_topics', (SELECT COALESCE(jsonb_agg(DISTINCT i.topic_key), '[]')
                     FROM social.content_ideas i
                     WHERE i.brand_id = v_brand.id AND i.status NOT IN ('REJECTED', 'FAILED')
                       AND i.created_at > now() - make_interval(days => v_cooldown)),
    'recent_titles', (SELECT COALESCE(jsonb_agg(t.title), '[]') FROM (
                        SELECT i.title FROM social.content_ideas i
                        WHERE i.brand_id = v_brand.id ORDER BY i.created_at DESC LIMIT 20) t)
  );
END;
$$;

-- Validate and store AI-proposed ideas.
-- p: {brand_slug, ideas: [{title, hook, angle, pillar_slug, objective, source_type,
--      source_id?, topic_key, priority, target_platforms[]}], workflow?, execution_id?}
-- Every rejected idea is returned with a reason; nothing is silently dropped.
CREATE OR REPLACE FUNCTION social.save_ideas(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_brand social.brands;
  v_cooldown int;
  v_idea jsonb;
  v_pillar uuid;
  v_type text;
  v_src uuid;
  v_topic text;
  v_id uuid;
  v_platforms text[];
  v_created jsonb := '[]'::jsonb;
  v_skipped jsonb := '[]'::jsonb;
  v_reason text;
BEGIN
  SELECT * INTO v_brand FROM social.brands WHERE slug = p->>'brand_slug';
  IF v_brand.id IS NULL THEN
    RAISE EXCEPTION 'save_ideas: unknown brand %', p->>'brand_slug';
  END IF;
  v_cooldown := COALESCE((social.get_setting('ideas', v_brand.slug)->>'topic_cooldown_days')::int, 21);
  PERFORM social.set_context(p || jsonb_build_object('reason', 'idea generated'));

  FOR v_idea IN SELECT value FROM jsonb_array_elements(COALESCE(p->'ideas', '[]'::jsonb)) LOOP
    v_reason := NULL;
    v_type := COALESCE(v_idea->>'source_type', 'manual');
    v_src := NULLIF(v_idea->>'source_id', '')::uuid;
    v_topic := NULLIF(regexp_replace(lower(COALESCE(v_idea->>'topic_key', '')), '[^a-z0-9]+', '_', 'g'), '');
    v_topic := btrim(COALESCE(v_topic, social.title_key(v_idea->>'title')), '_');

    SELECT id INTO v_pillar FROM social.content_pillars
     WHERE brand_id = v_brand.id AND slug = v_idea->>'pillar_slug' AND active;

    v_platforms := ARRAY(
      SELECT DISTINCT pl FROM jsonb_array_elements_text(COALESCE(v_idea->'target_platforms', '[]'::jsonb)) pl
      WHERE EXISTS (SELECT 1 FROM social.social_accounts a WHERE a.brand_id = v_brand.id AND a.platform = pl AND a.active));

    IF COALESCE(v_idea->>'title', '') = '' THEN
      v_reason := 'missing title';
    ELSIF v_pillar IS NULL THEN
      v_reason := format('unknown pillar "%s"', v_idea->>'pillar_slug');
    ELSIF cardinality(v_platforms) = 0 THEN
      v_reason := 'no active target platform';
    ELSIF social.topic_recently_used(v_brand.id, v_topic, v_cooldown) THEN
      v_reason := format('topic "%s" used in the last %s days', v_topic, v_cooldown);
    ELSIF v_type NOT IN ('research', 'experience', 'project', 'manual') THEN
      v_reason := format('invalid source_type "%s"', v_type);
    ELSIF v_type = 'research' AND NOT EXISTS (
            SELECT 1 FROM social.research_items WHERE id = v_src AND status IN ('ANALYSED', 'USED')) THEN
      v_reason := 'research source missing or not analysed';
    ELSIF v_type = 'experience' AND NOT EXISTS (
            SELECT 1 FROM social.experiences WHERE id = v_src AND brand_id = v_brand.id AND publishable) THEN
      v_reason := 'experience missing, not publishable or belongs to another brand';
    ELSIF v_type = 'project' AND NOT EXISTS (
            SELECT 1 FROM social.project_stories WHERE id = v_src AND brand_id = v_brand.id AND client_content_permission) THEN
      v_reason := 'project story missing or client permission not granted';
    ELSIF v_brand.kind = 'personal' AND v_type = 'manual'
          AND (SELECT content_type FROM social.content_pillars WHERE id = v_pillar) = 'story' THEN
      -- Personal stories must come from a real experience, never be invented.
      v_reason := 'founder story ideas must be based on a recorded experience';
    END IF;

    IF v_reason IS NOT NULL THEN
      v_skipped := v_skipped || jsonb_build_object('title', v_idea->>'title', 'reason', v_reason);
      CONTINUE;
    END IF;

    INSERT INTO social.content_ideas (brand_id, pillar_id, source_type, research_id, experience_id, project_story_id,
                                      title, hook, angle, objective, topic_key, priority, target_platforms)
    VALUES (v_brand.id, v_pillar, v_type,
            CASE WHEN v_type = 'research' THEN v_src END,
            CASE WHEN v_type = 'experience' THEN v_src END,
            CASE WHEN v_type = 'project' THEN v_src END,
            left(v_idea->>'title', 300), v_idea->>'hook', v_idea->>'angle',
            CASE WHEN v_idea->>'objective' IN ('awareness', 'engagement', 'education', 'trust', 'lead') THEN v_idea->>'objective' END,
            v_topic,
            LEAST(GREATEST(COALESCE((v_idea->>'priority')::int, 50), 0), 100),
            v_platforms)
    RETURNING id INTO v_id;

    IF v_type = 'research' THEN
      UPDATE social.research_items SET status = 'USED' WHERE id = v_src AND status = 'ANALYSED';
      UPDATE social.content_ideas SET status = 'RESEARCHED' WHERE id = v_id;
    ELSIF v_type = 'experience' THEN
      UPDATE social.experiences SET times_used = times_used + 1, last_used_at = now() WHERE id = v_src;
    END IF;

    v_created := v_created || jsonb_build_object('id', v_id, 'title', v_idea->>'title', 'topic_key', v_topic);
  END LOOP;

  RETURN jsonb_build_object('brand', v_brand.slug, 'created', jsonb_array_length(v_created),
                            'skipped', jsonb_array_length(v_skipped), 'ideas', v_created, 'rejected', v_skipped);
END;
$$;

-- Intake: founder experience. p: {brand_slug?, category, title, what_happened, lesson?, context?,
--   occurred_on?, is_opinion?, publishable?, sensitivity_notes?}
CREATE OR REPLACE FUNCTION social.add_experience(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF COALESCE(btrim(p->>'title'), '') = '' OR COALESCE(btrim(p->>'what_happened'), '') = '' THEN
    RAISE EXCEPTION 'add_experience: title and what_happened are required';
  END IF;
  INSERT INTO social.experiences (brand_id, category, title, what_happened, lesson, context, occurred_on,
                                  is_opinion, publishable, sensitivity_notes)
  VALUES ((SELECT id FROM social.brands WHERE slug = COALESCE(NULLIF(p->>'brand_slug', ''), 'founder')),
          p->>'category', btrim(p->>'title'), btrim(p->>'what_happened'), NULLIF(btrim(p->>'lesson'), ''),
          NULLIF(btrim(p->>'context'), ''), NULLIF(p->>'occurred_on', '')::date,
          COALESCE((p->>'is_opinion')::boolean, p->>'category' = 'opinion'),
          COALESCE((p->>'publishable')::boolean, true), NULLIF(btrim(p->>'sensitivity_notes'), ''))
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

-- Intake: Oreece project story. p: {title, industry?, problem, solution?, process?, result?, lessons?,
--   client_content_permission, permission_evidence?, must_anonymise?, confidential_notes?, project_name?}
CREATE OR REPLACE FUNCTION social.add_project_story(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_id uuid;
  v_permission boolean := COALESCE((p->>'client_content_permission')::boolean, false);
BEGIN
  IF COALESCE(btrim(p->>'title'), '') = '' OR COALESCE(btrim(p->>'problem'), '') = '' THEN
    RAISE EXCEPTION 'add_project_story: title and problem are required';
  END IF;
  IF v_permission AND COALESCE(btrim(p->>'permission_evidence'), '') = '' THEN
    RAISE EXCEPTION 'add_project_story: record how the client gave permission (permission_evidence)';
  END IF;
  INSERT INTO social.project_stories (brand_id, project_id, client_id, title, industry, problem, solution, process,
                                      result, lessons, client_content_permission, permission_evidence,
                                      must_anonymise, confidential_notes)
  SELECT b.id, pr.id, pr.client_id, btrim(p->>'title'), NULLIF(p->>'industry', ''), p->>'problem',
         NULLIF(p->>'solution', ''), NULLIF(p->>'process', ''), NULLIF(p->>'result', ''), NULLIF(p->>'lessons', ''),
         v_permission, NULLIF(btrim(p->>'permission_evidence'), ''),
         COALESCE((p->>'must_anonymise')::boolean, true), NULLIF(p->>'confidential_notes', '')
  FROM social.brands b
  LEFT JOIN LATERAL (
    SELECT x.id, x.client_id FROM public.projects x
    WHERE lower(x.name) = lower(NULLIF(btrim(p->>'project_name'), ''))
    ORDER BY x.created_at DESC LIMIT 1) pr ON true
  WHERE b.slug = 'oreece'
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok', true, 'id', v_id, 'linked_project', (SELECT project_id FROM social.project_stories WHERE id = v_id));
END;
$$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA social TO social_automation, authenticated;
