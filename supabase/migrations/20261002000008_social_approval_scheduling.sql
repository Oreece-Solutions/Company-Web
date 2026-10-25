-- =============================================================================
-- Oreece Social OS — Phase 6: human approval and scheduling
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Approval requests
-- -----------------------------------------------------------------------------
-- Opens one approval request per NEEDS_APPROVAL piece that has none, and
-- returns what the approver needs to see. Stale open requests are expired.
-- p: {execution_id, limit?}
CREATE OR REPLACE FUNCTION social.claim_approval_requests(p jsonb)
RETURNS TABLE (approval_id uuid, content_id uuid, request jsonb)
LANGUAGE plpgsql
AS $$
DECLARE
  v_cfg jsonb := COALESCE(social.get_setting('approval'), '{}'::jsonb);
  v_hours int := COALESCE((v_cfg->>'expire_after_hours')::int, 72);
  v_notify jsonb := COALESCE(social.get_setting('notifications'), '{}'::jsonb);
BEGIN
  -- Safety net: requests whose waiting execution never came back.
  UPDATE social.approvals SET decision = 'EXPIRED', decided_at = now(), decided_by = 'system'
   WHERE decision IS NULL AND requested_at < now() - make_interval(hours => v_hours + 2);

  RETURN QUERY
  WITH todo AS (
    SELECT cp.* FROM social.content_pieces cp
    WHERE cp.status = 'NEEDS_APPROVAL'
      AND NOT EXISTS (SELECT 1 FROM social.approvals a WHERE a.content_id = cp.id AND a.decision IS NULL)
    ORDER BY cp.updated_at
    LIMIT COALESCE((p->>'limit')::int, 10)
  ),
  opened AS (
    INSERT INTO social.approvals (content_id, revision, channel, n8n_execution_id)
    SELECT t.id, t.revision, COALESCE(v_cfg->>'channel', 'telegram'), p->>'execution_id' FROM todo t
    ON CONFLICT DO NOTHING
    RETURNING *
  )
  SELECT o.id, cp.id, jsonb_build_object(
    'approval_id', o.id,
    'chat_id', v_notify->>'telegram_chat_id',
    'expire_hours', v_hours,
    'brand', b.name, 'brand_slug', b.slug, 'platform', cp.platform, 'format', cp.format, 'revision', cp.revision,
    'idea', ci.title, 'pillar', pl.name,
    'headline', cp.headline, 'hook', cp.hook, 'caption', cp.caption, 'cta', cp.cta,
    'hashtags', to_jsonb(cp.hashtags), 'link_url', cp.link_url,
    'carousel_slides', cp.carousel_slides, 'script', cp.script, 'thread_parts', to_jsonb(cp.thread_parts),
    'qa', (SELECT jsonb_build_object('overall', q.overall, 'score', q.score,
              'issues', (SELECT COALESCE(jsonb_agg(c->>'message'), '[]') FROM jsonb_array_elements(q.checks) c WHERE c->>'result' <> 'PASS'))
           FROM social.qa_results q WHERE q.content_id = cp.id AND q.revision = cp.revision ORDER BY q.created_at DESC LIMIT 1),
    'source_url', (SELECT r.url FROM social.research_items r WHERE r.id = ci.research_id))
  FROM opened o
  JOIN social.content_pieces cp ON cp.id = o.content_id
  JOIN social.content_ideas ci ON ci.id = cp.idea_id
  JOIN social.brands b ON b.id = cp.brand_id
  LEFT JOIN social.content_pillars pl ON pl.id = ci.pillar_id;
END;
$$;

-- Record a decision. Idempotent; decisions on an outdated revision are stored
-- but do not move the piece.
-- p: {approval_id, decision: approve|reject|changes|expired, feedback?, decided_by?, workflow?, execution_id?}
CREATE OR REPLACE FUNCTION social.record_approval_decision(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_appr social.approvals;
  v_piece social.content_pieces;
  v_decision text := CASE lower(COALESCE(p->>'decision', ''))
    WHEN 'approve' THEN 'APPROVED' WHEN 'approved' THEN 'APPROVED'
    WHEN 'reject' THEN 'REJECTED' WHEN 'rejected' THEN 'REJECTED'
    WHEN 'changes' THEN 'CHANGES_REQUESTED' WHEN 'request changes' THEN 'CHANGES_REQUESTED' WHEN 'changes_requested' THEN 'CHANGES_REQUESTED'
    WHEN 'expired' THEN 'EXPIRED' END;
  v_feedback text := NULLIF(btrim(COALESCE(p->>'feedback', '')), '');
BEGIN
  IF v_decision IS NULL THEN
    RAISE EXCEPTION 'record_approval_decision: unknown decision "%"', p->>'decision';
  END IF;
  SELECT * INTO v_appr FROM social.approvals WHERE id = (p->>'approval_id')::uuid FOR UPDATE;
  IF v_appr.id IS NULL THEN
    RAISE EXCEPTION 'record_approval_decision: approval % not found', p->>'approval_id';
  END IF;
  IF v_appr.decision IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'noop', true, 'decision', v_appr.decision);
  END IF;
  IF v_decision = 'CHANGES_REQUESTED' AND v_feedback IS NULL THEN
    RAISE EXCEPTION 'record_approval_decision: say what should change (feedback is required)';
  END IF;

  UPDATE social.approvals SET decision = v_decision, feedback = v_feedback,
         decided_by = COALESCE(p->>'decided_by', 'unknown'), decided_at = now()
   WHERE id = v_appr.id;

  SELECT * INTO v_piece FROM social.content_pieces WHERE id = v_appr.content_id FOR UPDATE;
  IF v_piece.status <> 'NEEDS_APPROVAL' OR v_piece.revision <> v_appr.revision OR v_decision = 'EXPIRED' THEN
    RETURN jsonb_build_object('ok', true, 'decision', v_decision, 'applied', false,
                              'reason', CASE WHEN v_decision = 'EXPIRED' THEN 'expired' ELSE 'piece changed since the request' END);
  END IF;

  PERFORM social.set_context(p || jsonb_build_object('reason', 'approval: ' || v_decision || COALESCE(' — ' || v_feedback, '')));
  IF v_decision = 'APPROVED' THEN
    UPDATE social.content_pieces SET status = 'APPROVED' WHERE id = v_piece.id;
  ELSIF v_decision = 'REJECTED' THEN
    UPDATE social.content_pieces SET status = 'REJECTED', feedback = v_feedback WHERE id = v_piece.id;
  ELSE
    UPDATE social.content_pieces SET status = 'DRAFT', revision = revision + 1, feedback = v_feedback WHERE id = v_piece.id;
  END IF;
  RETURN jsonb_build_object('ok', true, 'decision', v_decision, 'applied', true,
                            'status', (SELECT status FROM social.content_pieces WHERE id = v_piece.id));
END;
$$;

-- -----------------------------------------------------------------------------
-- Scheduling
-- -----------------------------------------------------------------------------
-- Earliest slot for an account inside its posting windows (local time,
-- settings.timezone), honouring daily/weekly caps and the minimum gap.
-- Returns NULL when nothing fits inside the horizon.
CREATE OR REPLACE FUNCTION social.next_slot(p_account_id uuid, p_after timestamptz DEFAULT now() + interval '30 minutes')
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_acc social.social_accounts;
  v_brand text;
  v_tz text;
  v_cal jsonb;
  v_horizon int;
  v_gap interval;
  v_day date;
  v_win jsonb;
  v_candidate timestamptz;
  v_local_start timestamp;
  v_local_end timestamp;
  v_step timestamptz;
BEGIN
  SELECT * INTO v_acc FROM social.social_accounts WHERE id = p_account_id;
  SELECT slug INTO v_brand FROM social.brands WHERE id = v_acc.brand_id;
  v_tz := COALESCE(social.get_setting('timezone', v_brand) #>> '{}', 'Pacific/Auckland');
  v_cal := COALESCE(social.get_setting('calendar', v_brand), '{}'::jsonb);
  v_horizon := COALESCE((v_cal->>'horizon_days')::int, 14);
  v_gap := make_interval(hours => COALESCE((v_cal->>'min_gap_hours_same_account')::int, 20));

  FOR i IN 0..v_horizon LOOP
    v_day := (p_after AT TIME ZONE v_tz)::date + i;
    -- Daily / weekly caps (local calendar).
    CONTINUE WHEN (SELECT count(*) FROM social.publish_jobs j
                   WHERE j.account_id = p_account_id AND j.status IN ('SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'NEEDS_RECONCILIATION')
                     AND (j.scheduled_at AT TIME ZONE v_tz)::date = v_day) >= v_acc.max_posts_per_day;
    CONTINUE WHEN (SELECT count(*) FROM social.publish_jobs j
                   WHERE j.account_id = p_account_id AND j.status IN ('SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'NEEDS_RECONCILIATION')
                     AND date_trunc('week', j.scheduled_at AT TIME ZONE v_tz) = date_trunc('week', v_day::timestamp)) >= v_acc.max_posts_per_week;

    FOR v_win IN SELECT value FROM jsonb_array_elements(v_acc.posting_windows) ORDER BY value->>'start' LOOP
      CONTINUE WHEN NOT (v_win->'days') @> to_jsonb(extract(isodow FROM v_day)::int);
      v_local_start := v_day + (v_win->>'start')::time;
      v_local_end := v_day + (v_win->>'end')::time;
      -- Walk the window in 15-minute steps; local time → instant via the zone (DST-safe).
      v_step := v_local_start AT TIME ZONE v_tz;
      WHILE v_step <= (v_local_end AT TIME ZONE v_tz) LOOP
        IF v_step >= p_after AND NOT EXISTS (
             SELECT 1 FROM social.publish_jobs j
             WHERE j.account_id = p_account_id AND j.status IN ('SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'NEEDS_RECONCILIATION')
               AND j.scheduled_at > v_step - v_gap AND j.scheduled_at < v_step + v_gap) THEN
          RETURN v_step;
        END IF;
        v_step := v_step + interval '15 minutes';
      END LOOP;
    END LOOP;
  END LOOP;
  RETURN NULL;
END;
$$;

-- Schedule every APPROVED piece into its account's next free slot.
-- p: {execution_id, workflow?, limit?, after?}
CREATE OR REPLACE FUNCTION social.schedule_approved(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_piece record;
  v_slot timestamptz;
  v_res jsonb;
  v_scheduled jsonb := '[]'::jsonb;
  v_waiting jsonb := '[]'::jsonb;
  v_after timestamptz := COALESCE((p->>'after')::timestamptz, now() + interval '30 minutes');
BEGIN
  FOR v_piece IN
    SELECT cp.id, cp.platform, a.id AS account_id, b.name AS brand, b.slug AS brand_slug, ci.title
    FROM social.content_pieces cp
    JOIN social.social_accounts a ON a.brand_id = cp.brand_id AND a.platform = cp.platform AND a.active
    JOIN social.brands b ON b.id = cp.brand_id
    JOIN social.content_ideas ci ON ci.id = cp.idea_id
    WHERE cp.status = 'APPROVED'
    ORDER BY ci.priority DESC, cp.updated_at
    LIMIT COALESCE((p->>'limit')::int, 50)
  LOOP
    v_slot := social.next_slot(v_piece.account_id, v_after);
    IF v_slot IS NULL THEN
      v_waiting := v_waiting || jsonb_build_object('content_id', v_piece.id, 'platform', v_piece.platform, 'reason', 'no free slot in horizon');
      CONTINUE;
    END IF;
    v_res := social.schedule_content(jsonb_build_object('content_id', v_piece.id, 'scheduled_at', v_slot,
                                                        'workflow', p->>'workflow', 'execution_id', p->>'execution_id'));
    INSERT INTO social.calendar_slots (account_id, slot_at, content_id, status, pillar_id, format)
    SELECT v_piece.account_id, (v_res#>>'{job,scheduled_at}')::timestamptz, v_piece.id, 'FILLED', ci.pillar_id, cp.format
    FROM social.content_pieces cp JOIN social.content_ideas ci ON ci.id = cp.idea_id WHERE cp.id = v_piece.id
    ON CONFLICT (account_id, slot_at) DO NOTHING;
    v_scheduled := v_scheduled || jsonb_build_object(
      'content_id', v_piece.id, 'brand', v_piece.brand, 'platform', v_piece.platform, 'title', v_piece.title,
      'scheduled_at', v_res#>>'{job,scheduled_at}', 'dry_run', (v_res#>>'{job,dry_run}')::boolean,
      'local_time', to_char((v_res#>>'{job,scheduled_at}')::timestamptz AT TIME ZONE
                            COALESCE(social.get_setting('timezone', v_piece.brand_slug) #>> '{}', 'Pacific/Auckland'), 'Dy DD Mon HH24:MI'));
  END LOOP;
  RETURN jsonb_build_object('scheduled', jsonb_array_length(v_scheduled), 'waiting', jsonb_array_length(v_waiting),
                            'items', v_scheduled, 'not_scheduled', v_waiting);
END;
$$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA social TO social_automation, authenticated;
