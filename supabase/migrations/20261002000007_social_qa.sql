-- =============================================================================
-- Oreece Social OS — Phase 5: content quality control
-- =============================================================================

-- A QA run that could not complete (AI unavailable) returns the piece to the queue.
INSERT INTO social.status_transitions (entity_type, from_status, to_status) VALUES
  ('content_piece', 'QA', 'GENERATED')
ON CONFLICT DO NOTHING;

-- Claim GENERATED pieces for QA (status → QA, locked to the execution).
-- Returns everything the rule checks and the AI reviewer need.
-- p: {execution_id, limit?}
CREATE OR REPLACE FUNCTION social.claim_pieces_for_qa(p jsonb)
RETURNS TABLE (content_id uuid, brand_slug text, job jsonb)
LANGUAGE plpgsql
AS $$
DECLARE
  v_days int := COALESCE((social.get_setting('qa')->>'duplicate_similarity_days')::int, 90);
BEGIN
  IF COALESCE(p->>'execution_id', '') = '' THEN
    RAISE EXCEPTION 'claim_pieces_for_qa: execution_id is required';
  END IF;
  -- Abandoned QA claims go back to the queue.
  PERFORM social.set_context(p || jsonb_build_object('reason', 'QA claim expired'));
  UPDATE social.content_pieces SET status = 'GENERATED', locked_at = NULL, locked_by = NULL
   WHERE status = 'QA' AND locked_at < now() - interval '60 minutes';

  PERFORM social.set_context(p || jsonb_build_object('reason', 'QA started'));
  RETURN QUERY
  WITH claimed AS (
    UPDATE social.content_pieces cp SET status = 'QA', locked_at = now(), locked_by = p->>'execution_id'
     WHERE cp.id IN (
       SELECT c.id FROM social.content_pieces c
       WHERE c.status = 'GENERATED' AND c.locked_by IS NULL
       ORDER BY c.updated_at
       LIMIT COALESCE((p->>'limit')::int, 10)
       FOR UPDATE SKIP LOCKED)
    RETURNING cp.*
  )
  SELECT c.id, b.slug, jsonb_build_object(
    'piece', jsonb_build_object('id', c.id, 'platform', c.platform, 'format', c.format, 'revision', c.revision,
      'headline', c.headline, 'hook', c.hook, 'caption', c.caption, 'cta', c.cta, 'hashtags', to_jsonb(c.hashtags),
      'link_url', c.link_url, 'carousel_slides', c.carousel_slides, 'script', c.script,
      'thread_parts', to_jsonb(c.thread_parts), 'source_citations', c.source_citations, 'content_hash', c.content_hash),
    'rules', (SELECT jsonb_build_object('max_chars', pc.max_chars, 'max_title_chars', pc.max_title_chars,
                'max_hashtags', pc.max_hashtags, 'recommended_hashtags', pc.recommended_hashtags, 'media_spec', pc.media_spec,
                'cta_rules', pc.cta_rules)
              FROM social.platform_capabilities pc WHERE pc.platform = c.platform AND pc.format = c.format),
    'brand', jsonb_build_object('slug', b.slug, 'kind', b.kind, 'person', v.person,
                                'prohibited_terms', to_jsonb(v.prohibited_terms)),
    'qa_settings', social.get_setting('qa', b.slug),
    'regenerations', c.revision - 1,
    'brief', (SELECT cb.brief FROM social.content_briefs cb WHERE cb.idea_id = c.idea_id),
    'source', social.idea_source(c.idea_id),
    'allowed_urls', (SELECT COALESCE(jsonb_agg(DISTINCT u), '[]') FROM (
        SELECT c.link_url AS u
        UNION SELECT r.url FROM social.content_ideas i JOIN social.research_items r ON r.id = i.research_id WHERE i.id = c.idea_id
        UNION SELECT e->>'source' FROM social.content_briefs cb, jsonb_array_elements(cb.brief->'evidence') e
              WHERE cb.idea_id = c.idea_id AND e->>'source' ~ '^https?://'
        UNION SELECT b.website_url) urls WHERE u IS NOT NULL),
    'recent', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', o.id, 'hash', o.content_hash, 'caption', left(o.caption, 1500))), '[]')
               FROM (SELECT o.* FROM social.content_pieces o
                     WHERE o.brand_id = c.brand_id AND o.idea_id <> c.idea_id AND o.platform = c.platform
                       AND o.caption IS NOT NULL AND o.status NOT IN ('DRAFT', 'CANCELLED', 'REJECTED')
                       AND o.created_at > now() - make_interval(days => v_days)
                     ORDER BY o.created_at DESC LIMIT 60) o))
  FROM claimed c
  JOIN social.brands b ON b.id = c.brand_id
  LEFT JOIN social.brand_voice v ON v.brand_id = b.id;
END;
$$;

-- Record the QA verdict and route the piece.
-- p: {content_id, execution_id, overall, score, checks[], critical_failures, model?, feedback?, workflow?}
--   PASS/WARNING → NEEDS_APPROVAL (or APPROVED when auto-publish is fully allowed and PASS)
--   FAIL         → DRAFT with feedback (revision + 1) while regenerations remain, else FAILED
CREATE OR REPLACE FUNCTION social.save_qa_result(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_piece social.content_pieces;
  v_max int;
  v_next text;
  v_overall text := p->>'overall';
BEGIN
  SELECT * INTO v_piece FROM social.content_pieces WHERE id = (p->>'content_id')::uuid FOR UPDATE;
  IF v_piece.id IS NULL OR v_piece.status <> 'QA' OR v_piece.locked_by IS DISTINCT FROM p->>'execution_id' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_claimed_by_execution');
  END IF;
  IF v_overall NOT IN ('PASS', 'WARNING', 'FAIL') THEN
    RAISE EXCEPTION 'save_qa_result: invalid overall %', v_overall;
  END IF;
  v_max := COALESCE((social.get_setting('qa', (SELECT slug FROM social.brands WHERE id = v_piece.brand_id))->>'max_regenerations')::int, 2);

  INSERT INTO social.qa_results (content_id, revision, overall, score, checks, critical_failures, model)
  VALUES (v_piece.id, v_piece.revision, v_overall, (p->>'score')::numeric, COALESCE(p->'checks', '[]'::jsonb),
          COALESCE((p->>'critical_failures')::int, 0), p->>'model');

  UPDATE social.content_pieces SET locked_at = NULL, locked_by = NULL WHERE id = v_piece.id;

  IF v_overall = 'FAIL' OR COALESCE((p->>'critical_failures')::int, 0) > 0 THEN
    IF v_piece.revision - 1 < v_max THEN
      PERFORM social.set_context(p || jsonb_build_object('reason', 'QA failed; regenerating'));
      UPDATE social.content_pieces
         SET status = 'DRAFT', revision = revision + 1, feedback = left(COALESCE(p->>'feedback', 'QA failed'), 4000)
       WHERE id = v_piece.id;
      v_next := 'DRAFT';
    ELSE
      PERFORM social.set_context(p || jsonb_build_object('reason', format('QA failed after %s regenerations', v_max)));
      UPDATE social.content_pieces
         SET status = 'FAILED', last_error = 'QA failed after ' || v_max || ' regenerations: ' || left(COALESCE(p->>'feedback', ''), 1500),
             failed_at = now(), failed_workflow = COALESCE(p->>'workflow', '07_CONTENT_QA'), failed_execution_id = p->>'execution_id'
       WHERE id = v_piece.id;
      v_next := 'FAILED';
    END IF;
  ELSE
    SELECT * INTO v_piece FROM social.content_pieces WHERE id = v_piece.id;
    IF v_overall = 'PASS' AND social.auto_publish_allowed(v_piece) THEN
      PERFORM social.set_context(p || jsonb_build_object('reason', 'QA PASS; auto-publish enabled'));
      UPDATE social.content_pieces SET status = 'APPROVED' WHERE id = v_piece.id;
      v_next := 'APPROVED';
    ELSE
      PERFORM social.set_context(p || jsonb_build_object('reason', 'QA ' || v_overall));
      UPDATE social.content_pieces SET status = 'NEEDS_APPROVAL' WHERE id = v_piece.id;
      v_next := 'NEEDS_APPROVAL';
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'content_id', v_piece.id, 'overall', v_overall, 'status', v_next);
END;
$$;

-- QA could not complete (AI error): back to GENERATED for the next run, or
-- FAILED after repeated attempts. p: {content_id, execution_id, error, workflow?}
CREATE OR REPLACE FUNCTION social.release_qa_claim(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_piece social.content_pieces;
BEGIN
  SELECT * INTO v_piece FROM social.content_pieces WHERE id = (p->>'content_id')::uuid FOR UPDATE;
  IF v_piece.id IS NULL OR v_piece.status <> 'QA' OR v_piece.locked_by IS DISTINCT FROM p->>'execution_id' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_claimed_by_execution');
  END IF;
  UPDATE social.content_pieces SET locked_at = NULL, locked_by = NULL, retry_count = retry_count + 1,
         last_error = left(COALESCE(p->>'error', 'QA failed to run'), 2000)
   WHERE id = v_piece.id;
  IF v_piece.retry_count + 1 >= 3 THEN
    RETURN social.record_failure(jsonb_build_object('entity', 'content_piece', 'id', v_piece.id,
      'error', 'QA could not run: ' || COALESCE(p->>'error', ''), 'workflow', COALESCE(p->>'workflow', '07_CONTENT_QA'),
      'execution_id', p->>'execution_id'));
  END IF;
  PERFORM social.set_context(p || jsonb_build_object('reason', 'QA could not run; will retry'));
  UPDATE social.content_pieces SET status = 'GENERATED' WHERE id = v_piece.id;
  RETURN jsonb_build_object('ok', true, 'status', 'GENERATED');
END;
$$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA social TO social_automation, authenticated;
