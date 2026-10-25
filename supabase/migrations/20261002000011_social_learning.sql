-- =============================================================================
-- Oreece Social OS — Phase 9: learning engine and reports
-- =============================================================================

-- Token prices (USD per million tokens) for the spend line in reports.
UPDATE social.settings
   SET value = value || '{"prices_usd_per_mtok": {
         "claude-opus-5-5": {"input": 4, "output": 20},
         "claude-sonnet-5-5": {"input": 2, "output": 10},
         "claude-haiku-4-5": {"input": 1, "output": 5}}}'::jsonb
 WHERE scope = 'global' AND key = 'ai' AND NOT value ? 'prices_usd_per_mtok';

-- Composite performance score per measured post: each metric relative to the
-- brand average, weighted by settings.learning.metric_weights. 1.0 = average.
CREATE OR REPLACE VIEW social.v_post_scores AS
WITH perf AS (
  SELECT v.*,
         CASE WHEN COALESCE(NULLIF(v.impressions, 0), NULLIF(v.reach, 0), NULLIF(v.views, 0)) IS NULL THEN NULL
              ELSE COALESCE(NULLIF(v.impressions, 0), NULLIF(v.reach, 0), NULLIF(v.views, 0)) END AS denom
  FROM social.v_content_performance v
),
rates AS (
  SELECT p.*,
         COALESCE(p.saves, 0)::numeric / p.denom AS save_rate,
         COALESCE(p.shares, 0)::numeric / p.denom AS share_rate,
         COALESCE(p.clicks, 0)::numeric / p.denom AS click_rate
  FROM perf p WHERE p.denom IS NOT NULL
),
avgs AS (
  SELECT brand, avg(engagement_rate) AS er, avg(save_rate) AS sv, avg(share_rate) AS sh, avg(click_rate) AS ck, avg(leads) AS ld
  FROM rates GROUP BY brand
)
SELECT r.*,
  round((
      COALESCE((w.v->>'engagement_rate')::numeric, 0.25) * COALESCE(r.engagement_rate / NULLIF(a.er, 0), 1)
    + COALESCE((w.v->>'saves')::numeric, 0.15)         * COALESCE(r.save_rate / NULLIF(a.sv, 0), 1)
    + COALESCE((w.v->>'shares')::numeric, 0.15)        * COALESCE(r.share_rate / NULLIF(a.sh, 0), 1)
    + COALESCE((w.v->>'clicks')::numeric, 0.2)         * COALESCE(r.click_rate / NULLIF(a.ck, 0), 1)
    + COALESCE((w.v->>'leads')::numeric, 0.25)         * COALESCE(r.leads / NULLIF(a.ld, 0), 1)
  ) / NULLIF(COALESCE((w.v->>'engagement_rate')::numeric, 0.25) + COALESCE((w.v->>'saves')::numeric, 0.15)
             + COALESCE((w.v->>'shares')::numeric, 0.15) + COALESCE((w.v->>'clicks')::numeric, 0.2)
             + COALESCE((w.v->>'leads')::numeric, 0.25), 0), 3) AS score
FROM rates r
JOIN avgs a ON a.brand = r.brand
CROSS JOIN LATERAL (SELECT social.get_setting('learning', r.brand)->'metric_weights' AS v) w;

-- Everything the strategy review needs for one brand.
-- p: {brand_slug, lookback_days?}
CREATE OR REPLACE FUNCTION social.learning_dataset(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_brand social.brands;
  v_cfg jsonb;
  v_days int;
  v_min int;
  v_n int;
BEGIN
  SELECT * INTO v_brand FROM social.brands WHERE slug = p->>'brand_slug';
  v_cfg := COALESCE(social.get_setting('learning', v_brand.slug), '{}'::jsonb);
  v_days := COALESCE((p->>'lookback_days')::int, (v_cfg->>'lookback_days')::int, 90);
  v_min := COALESCE((v_cfg->>'min_posts_for_signal')::int, 8);

  SELECT count(*) INTO v_n FROM social.v_post_scores s WHERE s.brand = v_brand.slug AND s.published_at > now() - make_interval(days => v_days);
  IF v_n < v_min THEN
    RETURN jsonb_build_object('brand_slug', v_brand.slug, 'sufficient', false, 'posts', v_n, 'min_posts', v_min);
  END IF;

  RETURN jsonb_build_object(
    'brand_slug', v_brand.slug, 'sufficient', true, 'posts', v_n, 'lookback_days', v_days,
    'by_dimension', (
      SELECT jsonb_object_agg(dim, rows) FROM (
        SELECT dim, jsonb_agg(jsonb_build_object('value', val, 'posts', n, 'avg_score', avg_score, 'avg_engagement', avg_er,
                                                 'avg_impressions', avg_imp, 'leads', leads) ORDER BY avg_score DESC) AS rows
        FROM (
          SELECT d.dim, d.val, count(*) AS n, round(avg(s.score), 3) AS avg_score, round(avg(s.engagement_rate), 4) AS avg_er,
                 round(avg(s.impressions)) AS avg_imp, sum(s.leads) AS leads
          FROM social.v_post_scores s
          CROSS JOIN LATERAL (VALUES
            ('pillar', s.pillar), ('content_type', s.content_type), ('format', s.format), ('platform', s.platform),
            ('source_type', s.source_type), ('objective', s.objective),
            ('weekday', to_char(s.published_at AT TIME ZONE 'Pacific/Auckland', 'Dy')),
            ('hour', to_char(s.published_at AT TIME ZONE 'Pacific/Auckland', 'HH24'))) d(dim, val)
          WHERE s.brand = v_brand.slug AND s.published_at > now() - make_interval(days => v_days) AND d.val IS NOT NULL
          GROUP BY d.dim, d.val
        ) g GROUP BY dim) x),
    'top_posts', (SELECT jsonb_agg(t) FROM (SELECT s.platform, s.format, s.pillar, s.hook, s.score, s.engagement_rate, s.leads
                  FROM social.v_post_scores s WHERE s.brand = v_brand.slug AND s.published_at > now() - make_interval(days => v_days)
                  ORDER BY s.score DESC LIMIT 5) t),
    'bottom_posts', (SELECT jsonb_agg(t) FROM (SELECT s.platform, s.format, s.pillar, s.hook, s.score, s.engagement_rate, s.leads
                     FROM social.v_post_scores s WHERE s.brand = v_brand.slug AND s.published_at > now() - make_interval(days => v_days)
                     ORDER BY s.score ASC LIMIT 5) t),
    'current_pillars', (SELECT jsonb_agg(jsonb_build_object('slug', slug, 'weight', weight, 'content_type', content_type))
                        FROM social.content_pillars WHERE brand_id = v_brand.id AND active),
    'content_ratio', social.get_setting('content_ratio', v_brand.slug),
    'qa_rejections', (SELECT jsonb_build_object('qa_fail_rate', round(avg((q.overall = 'FAIL')::int), 3), 'checks', count(*))
                      FROM social.qa_results q JOIN social.content_pieces c ON c.id = q.content_id
                      WHERE c.brand_id = v_brand.id AND q.created_at > now() - make_interval(days => v_days)),
    'approval_outcomes', (SELECT jsonb_object_agg(decision, n) FROM (
                            SELECT a.decision, count(*) AS n FROM social.approvals a JOIN social.content_pieces c ON c.id = a.content_id
                            WHERE c.brand_id = v_brand.id AND a.decided_at > now() - make_interval(days => v_days) AND a.decision IS NOT NULL
                            GROUP BY a.decision) d));
END;
$$;

-- Store AI recommendations; auto-apply minor ones only when allowed.
-- p: {brand_slug, recommendations: [{kind, recommendation, evidence, impact, proposed_change: {type, pillar_slug?, new_weight?}}],
--     summary?, workflow?, execution_id?}
CREATE OR REPLACE FUNCTION social.save_recommendations(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_brand social.brands;
  r jsonb;
  v_id uuid;
  v_auto boolean;
  v_ids jsonb := '[]'::jsonb;
  v_applied int := 0;
BEGIN
  SELECT * INTO v_brand FROM social.brands WHERE slug = p->>'brand_slug';
  v_auto := COALESCE((social.get_setting('learning', v_brand.slug)->>'auto_apply_minor')::boolean, false);
  FOR r IN SELECT value FROM jsonb_array_elements(COALESCE(p->'recommendations', '[]'::jsonb)) LOOP
    INSERT INTO social.strategy_recommendations (brand_id, period_start, period_end, kind, recommendation, evidence, proposed_change, impact)
    VALUES (v_brand.id, (now() - interval '90 days')::date, now()::date,
            CASE WHEN r->>'kind' IN ('pillar_weight', 'format_mix', 'posting_time', 'topic', 'hook_pattern', 'platform') THEN r->>'kind' ELSE 'other' END,
            r->>'recommendation', jsonb_build_object('text', r->>'evidence'),
            CASE WHEN r#>>'{proposed_change,type}' = 'pillar_weight' THEN r->'proposed_change' END,
            CASE WHEN r->>'impact' = 'minor' THEN 'minor' ELSE 'major' END)
    RETURNING id INTO v_id;
    v_ids := v_ids || to_jsonb(v_id);
    IF v_auto AND r->>'impact' = 'minor' AND r#>>'{proposed_change,type}' = 'pillar_weight' THEN
      PERFORM social.decide_recommendation(jsonb_build_object('id', v_id, 'decision', 'approve', 'decided_by', 'auto (minor)'));
      v_applied := v_applied + 1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('saved', jsonb_array_length(v_ids), 'auto_applied', v_applied, 'ids', v_ids);
END;
$$;

-- Approve / reject a recommendation. Approved pillar-weight changes are
-- applied (weight clamped to 0–3, change of at most ±50% per decision).
-- p: {id, decision: approve|reject, decided_by?}
CREATE OR REPLACE FUNCTION social.decide_recommendation(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_rec social.strategy_recommendations;
  v_old numeric;
  v_new numeric;
BEGIN
  SELECT * INTO v_rec FROM social.strategy_recommendations WHERE id = (p->>'id')::uuid FOR UPDATE;
  IF v_rec.id IS NULL OR v_rec.status <> 'PROPOSED' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not proposed', 'status', v_rec.status);
  END IF;
  IF p->>'decision' = 'reject' THEN
    UPDATE social.strategy_recommendations SET status = 'REJECTED', decided_at = now() WHERE id = v_rec.id;
    RETURN jsonb_build_object('ok', true, 'status', 'REJECTED');
  END IF;
  IF v_rec.proposed_change->>'type' = 'pillar_weight' THEN
    SELECT weight INTO v_old FROM social.content_pillars
     WHERE brand_id = v_rec.brand_id AND slug = v_rec.proposed_change->>'pillar_slug';
    IF v_old IS NULL THEN
      UPDATE social.strategy_recommendations SET status = 'REJECTED', decided_at = now() WHERE id = v_rec.id;
      RETURN jsonb_build_object('ok', false, 'reason', 'unknown pillar');
    END IF;
    v_new := LEAST(GREATEST((v_rec.proposed_change->>'new_weight')::numeric, v_old * 0.5, 0), v_old * 1.5, 3);
    UPDATE social.content_pillars SET weight = round(v_new, 3)
     WHERE brand_id = v_rec.brand_id AND slug = v_rec.proposed_change->>'pillar_slug';
    UPDATE social.strategy_recommendations SET status = 'APPLIED', decided_at = now(),
           evidence = evidence || jsonb_build_object('applied', jsonb_build_object('from', v_old, 'to', round(v_new, 3)))
     WHERE id = v_rec.id;
    RETURN jsonb_build_object('ok', true, 'status', 'APPLIED', 'from', v_old, 'to', round(v_new, 3));
  END IF;
  UPDATE social.strategy_recommendations SET status = 'APPROVED', decided_at = now() WHERE id = v_rec.id;
  RETURN jsonb_build_object('ok', true, 'status', 'APPROVED', 'note', 'not machine-applicable; act on it manually');
END;
$$;

-- Weekly / monthly report data. p: {days}
CREATE OR REPLACE FUNCTION social.report_data(p jsonb)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  WITH d AS (SELECT COALESCE((p->>'days')::int, 7) AS days),
  prices AS (SELECT social.get_setting('ai')->'prices_usd_per_mtok' AS pr)
  SELECT jsonb_build_object(
    'days', (SELECT days FROM d),
    'brands', (SELECT jsonb_agg(jsonb_build_object(
        'brand', b.name, 'slug', b.slug,
        'published', (SELECT count(*) FROM social.publish_jobs j JOIN social.content_pieces c ON c.id = j.content_id
                      WHERE c.brand_id = b.id AND j.status = 'PUBLISHED' AND NOT j.dry_run AND j.published_at > now() - make_interval(days => (SELECT days FROM d))),
        'dry_runs', (SELECT count(*) FROM social.publish_jobs j JOIN social.content_pieces c ON c.id = j.content_id
                     WHERE c.brand_id = b.id AND j.status = 'PUBLISHED' AND j.dry_run AND j.published_at > now() - make_interval(days => (SELECT days FROM d))),
        'impressions', (SELECT COALESCE(sum(v.impressions), 0) FROM social.v_content_performance v WHERE v.brand = b.slug AND v.published_at > now() - make_interval(days => (SELECT days FROM d))),
        'avg_engagement', (SELECT round(avg(v.engagement_rate), 4) FROM social.v_content_performance v WHERE v.brand = b.slug AND v.published_at > now() - make_interval(days => (SELECT days FROM d))),
        'leads', (SELECT count(*) FROM social.lead_attributions la JOIN social.content_pieces c ON c.id = la.content_id
                  WHERE c.brand_id = b.id AND la.stage <> 'visit' AND la.occurred_at > now() - make_interval(days => (SELECT days FROM d))),
        'top_post', (SELECT jsonb_build_object('hook', s.hook, 'platform', s.platform, 'score', s.score, 'engagement', s.engagement_rate)
                     FROM social.v_post_scores s WHERE s.brand = b.slug AND s.published_at > now() - make_interval(days => (SELECT days FROM d))
                     ORDER BY s.score DESC LIMIT 1))
      ORDER BY b.slug) FROM social.brands b WHERE b.active),
    'pipeline', (SELECT jsonb_object_agg(status, n) FROM (SELECT status, count(*) AS n FROM social.content_pieces
                 WHERE status IN ('DRAFT', 'GENERATED', 'QA', 'NEEDS_APPROVAL', 'APPROVED', 'SCHEDULED', 'FAILED') GROUP BY status) x),
    'ideas_backlog', (SELECT count(*) FROM social.content_ideas WHERE status IN ('IDEA', 'RESEARCHED', 'BRIEF_CREATED')),
    'research', (SELECT jsonb_build_object('collected', count(*), 'analysed', count(*) FILTER (WHERE analysed_at IS NOT NULL))
                 FROM social.research_items WHERE collected_at > now() - make_interval(days => (SELECT days FROM d))),
    'errors', (SELECT count(*) FROM social.execution_log WHERE status = 'ERROR' AND started_at > now() - make_interval(days => (SELECT days FROM d))),
    'needs_reconciliation', (SELECT count(*) FROM social.publish_jobs WHERE status = 'NEEDS_RECONCILIATION'),
    'open_recommendations', (SELECT count(*) FROM social.strategy_recommendations WHERE status = 'PROPOSED'),
    'ai', (SELECT jsonb_build_object('calls', count(*), 'failed', count(*) FILTER (WHERE NOT ok),
             'input_tokens', COALESCE(sum(input_tokens), 0), 'output_tokens', COALESCE(sum(output_tokens), 0),
             'est_usd', round(COALESCE(sum(
                 COALESCE(input_tokens, 0) * COALESCE(((SELECT pr FROM prices)->model->>'input')::numeric, 0) / 1e6
               + COALESCE(output_tokens, 0) * COALESCE(((SELECT pr FROM prices)->model->>'output')::numeric, 0) / 1e6), 0), 2))
           FROM social.ai_usage WHERE created_at > now() - make_interval(days => (SELECT days FROM d))))
$$;

GRANT SELECT ON social.v_post_scores TO social_automation, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA social TO social_automation, authenticated;
