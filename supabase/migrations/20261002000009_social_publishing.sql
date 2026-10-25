-- =============================================================================
-- Oreece Social OS — Phase 7: publishing
-- =============================================================================

-- LinkedIn API version (YYYYMM). LinkedIn sunsets each version after about a
-- year (202510 sunsets 15 Oct 2026) — keep this current.
UPDATE social.settings
   SET value = value || '{"linkedin_version": "202609"}'::jsonb
 WHERE scope = 'global' AND key = 'publishing' AND NOT value ? 'linkedin_version';

-- Claim due jobs and return everything an adapter needs.
-- p: {execution_id, limit?, workflow?}
CREATE OR REPLACE FUNCTION social.claim_publish_batch(p jsonb)
RETURNS TABLE (job_id uuid, payload jsonb)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT j.id, jsonb_build_object(
    'job_id', j.id, 'content_id', j.content_id, 'platform', j.platform, 'provider', j.provider,
    'dry_run', j.dry_run, 'attempt', j.attempt_count, 'scheduled_at', j.scheduled_at,
    'idempotency_key', j.idempotency_key,
    'account', jsonb_build_object('id', a.id, 'handle', a.handle, 'external_account_id', a.external_account_id,
                                  'credential', a.n8n_credential_name, 'brand', b.slug),
    'content', jsonb_build_object('format', c.format, 'headline', c.headline, 'caption', c.caption, 'cta', c.cta,
                                  'hashtags', to_jsonb(c.hashtags), 'link_url', c.link_url,
                                  'thread_parts', to_jsonb(c.thread_parts), 'carousel_slides', c.carousel_slides,
                                  'script', c.script,
                                  'assets', (SELECT COALESCE(jsonb_agg(jsonb_build_object('type', s.type, 'url', s.url, 'position', s.position) ORDER BY s.position), '[]')
                                             FROM social.assets s WHERE s.content_id = c.id AND s.status = 'READY')),
    'settings', social.get_setting('publishing', b.slug))
  FROM social.claim_due_jobs(jsonb_build_object('execution_id', p->>'execution_id', 'workflow', p->>'workflow',
                                                'limit', COALESCE((p->>'limit')::int,
                                                  (social.get_setting('publishing')->>'claim_batch_size')::int, 5))) j
  JOIN social.social_accounts a ON a.id = j.account_id
  JOIN social.brands b ON b.id = a.brand_id
  JOIN social.content_pieces c ON c.id = j.content_id;
END;
$$;

-- Reaps interrupted publishes and reports them so 10_PUBLISHING can alert
-- through SUB_NOTIFY. p: {execution_id, workflow?}
CREATE OR REPLACE FUNCTION social.reap_and_report(p jsonb)
RETURNS jsonb
LANGUAGE sql
AS $$
  SELECT jsonb_build_object('reaped', count(*),
           'jobs', COALESCE(jsonb_agg(jsonb_build_object('job_id', r.id, 'content_id', r.content_id, 'platform', r.platform)), '[]'))
  FROM social.reap_stale_publishing(p) r
$$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA social TO social_automation, authenticated;
