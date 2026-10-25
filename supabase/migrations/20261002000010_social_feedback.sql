-- =============================================================================
-- Oreece Social OS — Phase 8: analytics, comments, lead attribution
-- =============================================================================

-- Which live posts can be measured by the built-in adapters.
--   linkedin_org: Oreece page posts (organizationalEntityShareStatistics,
--                 socialActions comments) — needs the "LinkedIn – Oreece analytics" credential
-- Personal-profile analytics/comments are restricted by LinkedIn and are not
-- fetched (the analytics_source column says why).
CREATE OR REPLACE FUNCTION social.analytics_source(p_job social.publish_jobs)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN p_job.dry_run THEN 'none:dry_run'
    WHEN p_job.provider = 'linkedin' AND a.external_account_id LIKE 'urn:li:organization:%' THEN 'linkedin_org'
    WHEN p_job.provider = 'linkedin' THEN 'none:linkedin_member_restricted'
    ELSE 'none:no_adapter'
  END
  FROM social.social_accounts a WHERE a.id = p_job.account_id
$$;

-- Housekeeping: dry-run posts complete immediately (no metrics); measured posts
-- complete after analytics.complete_after_days. p: {workflow?, execution_id?}
CREATE OR REPLACE FUNCTION social.complete_feedback_cycle(p jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_days int := COALESCE((social.get_setting('analytics')->>'complete_after_days')::int, 30);
  v_n int := 0;
  v_id uuid;
BEGIN
  PERFORM social.set_context(p || jsonb_build_object('reason', 'feedback cycle complete'));
  FOR v_id IN
    SELECT c.id FROM social.content_pieces c
    JOIN social.publish_jobs j ON j.content_id = c.id AND j.status = 'PUBLISHED'
    WHERE c.status IN ('PUBLISHED', 'ANALYSING')
      AND (j.dry_run OR social.analytics_source(j) LIKE 'none:%' OR j.published_at < now() - make_interval(days => v_days))
  LOOP
    UPDATE social.content_pieces SET status = 'ANALYSING' WHERE id = v_id AND status = 'PUBLISHED';
    UPDATE social.content_pieces SET status = 'COMPLETED' WHERE id = v_id;
    v_n := v_n + 1;
  END LOOP;
  RETURN jsonb_build_object('completed', v_n);
END;
$$;

-- Live posts whose next analytics milestone (hours after publishing) is due.
-- p: {limit?}
CREATE OR REPLACE FUNCTION social.due_analytics(p jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE (job_id uuid, payload jsonb)
LANGUAGE sql
STABLE
AS $$
  WITH cfg AS (
    SELECT COALESCE(social.get_setting('analytics')->'collect_at_hours', '[2,24,72,168,720]'::jsonb) AS hours
  ),
  live AS (
    SELECT j.*, social.analytics_source(j) AS src,
           extract(epoch FROM now() - j.published_at) / 3600 AS age_h
    FROM social.publish_jobs j
    JOIN social.content_pieces c ON c.id = j.content_id AND c.status IN ('PUBLISHED', 'ANALYSING')
    WHERE j.status = 'PUBLISHED' AND NOT j.dry_run AND j.platform_post_id IS NOT NULL
  ),
  due AS (
    SELECT l.*, (SELECT max(h::numeric) FROM jsonb_array_elements_text((SELECT hours FROM cfg)) h WHERE h::numeric <= l.age_h) AS milestone
    FROM live l
  )
  SELECT d.id, jsonb_build_object('kind', 'stats', 'job_id', d.id, 'content_id', d.content_id, 'platform', d.platform,
           'platform_post_id', d.platform_post_id, 'source', d.src, 'milestone_hours', d.milestone,
           'organization', a.external_account_id,
           'settings', social.get_setting('publishing'))
  FROM due d
  JOIN social.social_accounts a ON a.id = d.account_id
  WHERE d.src NOT LIKE 'none:%'
    AND d.milestone IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM social.analytics_snapshots s
                    WHERE s.publish_job_id = d.id AND s.hours_since_publish >= d.milestone)
  ORDER BY d.published_at
  LIMIT COALESCE((p->>'limit')::int, 50)
$$;

-- Store one metrics snapshot (insert-only) and flag unusual engagement.
-- p: {job_id, metrics: {impressions, reach, views, likes, comments, shares, saves, clicks}, raw?, workflow?, execution_id?}
CREATE OR REPLACE FUNCTION social.record_analytics(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_job social.publish_jobs;
  m jsonb := COALESCE(p->'metrics', '{}'::jsonb);
  v_snap social.analytics_snapshots;
  v_median numeric;
  v_mult numeric := COALESCE((social.get_setting('notifications')->>'unusual_engagement_multiplier')::numeric, 3);
BEGIN
  SELECT * INTO v_job FROM social.publish_jobs WHERE id = (p->>'job_id')::uuid;
  IF v_job.id IS NULL OR v_job.status <> 'PUBLISHED' THEN
    RAISE EXCEPTION 'record_analytics: job % is not published', p->>'job_id';
  END IF;

  INSERT INTO social.analytics_snapshots (publish_job_id, content_id, platform, platform_post_id, hours_since_publish,
                                          impressions, reach, views, likes, comments, shares, saves, clicks, raw)
  VALUES (v_job.id, v_job.content_id, v_job.platform, v_job.platform_post_id,
          round(extract(epoch FROM now() - v_job.published_at)::numeric / 3600, 2),
          (m->>'impressions')::int, (m->>'reach')::int, (m->>'views')::int, (m->>'likes')::int,
          (m->>'comments')::int, (m->>'shares')::int, (m->>'saves')::int, (m->>'clicks')::int,
          COALESCE(p->'raw', '{}'::jsonb))
  RETURNING * INTO v_snap;

  PERFORM social.set_context(p || jsonb_build_object('reason', 'analytics collected'));
  UPDATE social.content_pieces SET status = 'ANALYSING' WHERE id = v_job.content_id AND status = 'PUBLISHED';

  -- Unusual engagement: well above the account's median of latest snapshots (needs ≥ 5 posts).
  SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY x.engagement_rate) INTO v_median
  FROM (SELECT DISTINCT ON (s.publish_job_id) s.engagement_rate
        FROM social.analytics_snapshots s JOIN social.publish_jobs j ON j.id = s.publish_job_id
        WHERE j.account_id = v_job.account_id AND s.publish_job_id <> v_job.id AND s.engagement_rate IS NOT NULL
        ORDER BY s.publish_job_id, s.collected_at DESC) x
  HAVING count(*) >= 5;

  RETURN jsonb_build_object('ok', true, 'snapshot_id', v_snap.id, 'engagement_rate', v_snap.engagement_rate,
    'unusual', v_median IS NOT NULL AND v_median > 0 AND v_snap.engagement_rate > v_median * v_mult,
    'median', v_median);
END;
$$;

-- Latest snapshot per published job, joined to what was posted.
CREATE OR REPLACE VIEW social.v_content_performance AS
SELECT DISTINCT ON (s.publish_job_id)
       s.publish_job_id, s.content_id, b.slug AS brand, s.platform, c.format, cp.slug AS pillar, cp.content_type,
       i.source_type, i.objective, i.topic_key, c.hook, j.published_at, s.collected_at, s.hours_since_publish,
       s.impressions, s.reach, s.views, s.likes, s.comments, s.shares, s.saves, s.clicks, s.engagement_rate,
       (SELECT count(*) FROM social.lead_attributions la WHERE la.content_id = s.content_id AND la.stage <> 'visit') AS leads
FROM social.analytics_snapshots s
JOIN social.publish_jobs j ON j.id = s.publish_job_id
JOIN social.content_pieces c ON c.id = s.content_id
JOIN social.content_ideas i ON i.id = c.idea_id
JOIN social.brands b ON b.id = c.brand_id
LEFT JOIN social.content_pillars cp ON cp.id = i.pillar_id
ORDER BY s.publish_job_id, s.collected_at DESC;

-- -----------------------------------------------------------------------------
-- Comments
-- -----------------------------------------------------------------------------
-- Live posts to check for comments (published in the last 14 days).
CREATE OR REPLACE FUNCTION social.posts_for_comment_check(p jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE (job_id uuid, payload jsonb)
LANGUAGE sql
STABLE
AS $$
  SELECT j.id, jsonb_build_object('kind', 'comments', 'job_id', j.id, 'platform', j.platform, 'platform_post_id', j.platform_post_id,
           'organization', (SELECT external_account_id FROM social.social_accounts WHERE id = j.account_id),
           'source', social.analytics_source(j), 'settings', social.get_setting('publishing'),
           'caption', left(c.caption, 1500), 'brand_slug', b.slug)
  FROM social.publish_jobs j
  JOIN social.content_pieces c ON c.id = j.content_id
  JOIN social.brands b ON b.id = c.brand_id
  WHERE j.status = 'PUBLISHED' AND NOT j.dry_run AND j.platform_post_id IS NOT NULL
    AND j.published_at > now() - make_interval(days => COALESCE((p->>'days')::int, 14))
    AND social.analytics_source(j) = 'linkedin_org'
  ORDER BY j.published_at DESC
  LIMIT COALESCE((p->>'limit')::int, 30)
$$;

-- Insert new comments; returns only the ones not seen before.
-- p: {job_id, comments: [{platform_comment_id, author, text, commented_at}], own_actor?}
CREATE OR REPLACE FUNCTION social.ingest_comments(p jsonb)
RETURNS SETOF social.comments
LANGUAGE sql
AS $$
  INSERT INTO social.comments (publish_job_id, platform, platform_post_id, platform_comment_id, author, comment, commented_at)
  SELECT j.id, j.platform, j.platform_post_id, c->>'platform_comment_id', c->>'author', c->>'text',
         (c->>'commented_at')::timestamptz
  FROM social.publish_jobs j, jsonb_array_elements(COALESCE(p->'comments', '[]'::jsonb)) c
  WHERE j.id = (p->>'job_id')::uuid
    AND COALESCE(c->>'text', '') <> ''
    AND (p->>'own_actor' IS NULL OR c->>'author' IS DISTINCT FROM p->>'own_actor')  -- skip our own replies
  ON CONFLICT (platform, platform_comment_id) DO NOTHING
  RETURNING *
$$;

-- New comments waiting for AI triage. p: {limit?}
CREATE OR REPLACE FUNCTION social.untriaged_comments(p jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE (comment_id uuid, brand_slug text, payload jsonb)
LANGUAGE sql
STABLE
AS $$
  SELECT cm.id, b.slug, jsonb_build_object('comment', cm.comment, 'author', cm.author, 'platform', cm.platform,
           'post', left(c.caption, 1500), 'post_url', j.platform_post_url, 'brand', b.name)
  FROM social.comments cm
  JOIN social.publish_jobs j ON j.id = cm.publish_job_id
  JOIN social.content_pieces c ON c.id = j.content_id
  JOIN social.brands b ON b.id = c.brand_id
  WHERE cm.status = 'NEW'
  ORDER BY cm.created_at
  LIMIT COALESCE((p->>'limit')::int, 20)
$$;

-- p: {id, sentiment, intent, suggested_reply, escalate}
CREATE OR REPLACE FUNCTION social.save_comment_triage(p jsonb)
RETURNS jsonb
LANGUAGE sql
AS $$
  UPDATE social.comments
     SET sentiment = p->>'sentiment', intent = p->>'intent', suggested_reply = NULLIF(p->>'suggested_reply', ''),
         status = CASE WHEN COALESCE((p->>'escalate')::boolean, false) THEN 'ESCALATED'
                       WHEN NULLIF(p->>'suggested_reply', '') IS NOT NULL THEN 'REPLY_SUGGESTED'
                       ELSE 'TRIAGED' END
   WHERE id = (p->>'id')::uuid
  RETURNING jsonb_build_object('id', id, 'status', status, 'intent', intent)
$$;

-- -----------------------------------------------------------------------------
-- Lead attribution: website → webhook → tracked link code → content
-- -----------------------------------------------------------------------------
-- p: {code (utm_content), stage: visit|lead|consultation|proposal|customer, client_id?, value_nzd?, utm?, occurred_at?}
CREATE OR REPLACE FUNCTION social.record_lead(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_link social.tracked_links;
  v_id uuid;
BEGIN
  IF p->>'stage' NOT IN ('visit', 'lead', 'consultation', 'proposal', 'customer') THEN
    RAISE EXCEPTION 'record_lead: invalid stage %', p->>'stage';
  END IF;
  SELECT * INTO v_link FROM social.tracked_links WHERE code = p->>'code';
  INSERT INTO social.lead_attributions (tracked_link_id, content_id, client_id, stage, value_nzd, utm, occurred_at)
  VALUES (v_link.id, v_link.content_id,
          NULLIF(p->>'client_id', '')::uuid,   -- validated by the FK; n8n's role has no rights on public tables
          p->>'stage', (p->>'value_nzd')::numeric, COALESCE(p->'utm', '{}'::jsonb),
          COALESCE((p->>'occurred_at')::timestamptz, now()))
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok', true, 'id', v_id, 'attributed', v_link.id IS NOT NULL,
    'content', (SELECT jsonb_build_object('brand', b.name, 'platform', c.platform, 'title', i.title, 'published_url', j.platform_post_url)
                FROM social.content_pieces c JOIN social.content_ideas i ON i.id = c.idea_id JOIN social.brands b ON b.id = c.brand_id
                LEFT JOIN social.publish_jobs j ON j.content_id = c.id AND j.status = 'PUBLISHED'
                WHERE c.id = v_link.content_id LIMIT 1));
END;
$$;

GRANT SELECT ON social.v_content_performance TO social_automation, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA social TO social_automation, authenticated;
