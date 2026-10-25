-- =============================================================================
-- Oreece Social OS — reference data and editable defaults
-- Everything here is configuration you are expected to change in the database
-- (Supabase table editor / SQL). ON CONFLICT DO NOTHING keeps the migration
-- re-runnable and never overwrites your edits.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Global settings (scope 'global'); override per brand with scope = brand slug
-- -----------------------------------------------------------------------------
INSERT INTO social.settings (scope, key, value, description) VALUES
  ('global', 'timezone', '"Pacific/Auckland"', 'Scheduling/display timezone. Timestamps are stored in UTC.'),
  ('global', 'dry_run', 'true', 'When true every publish job is frozen as dry_run and routed to the mock publisher. Turn off per brand only when going live.'),
  ('global', 'approval_required', 'true', 'Human approval before scheduling. Keep true during initial deployment.'),
  ('global', 'auto_publish_enabled', 'false', 'Master switch for auto-publishing. Also needs approval_required=false, account.auto_publish=true and a clean QA PASS.'),
  ('global', 'ai', '{
     "provider": "anthropic",
     "api_url": "https://api.anthropic.com/v1/messages",
     "anthropic_version": "2023-06-01",
     "tiers": {
       "fast":     {"model": "claude-opus-5-5", "effort": "low"},
       "standard": {"model": "claude-opus-5-5", "effort": "medium"},
       "deep":     {"model": "claude-opus-5-5", "effort": "high"}
     },
     "refusal_fallbacks": true,
     "default_max_tokens": 16000
   }', 'AI provider and model per tier. Prompts declare a tier, not a model. Swap a tier to a cheaper model (e.g. claude-sonnet-5-5, claude-haiku-4-5) here if you want to trade quality for cost. refusal_fallbacks enables the API''s server-side fallback model on safety declines.'),
  ('global', 'research', '{
     "max_items_per_source": 10,
     "max_analyse_per_run": 10,
     "min_relevance": 0.6,
     "max_age_days": 10,
     "duplicate_title_window_days": 30,
     "deactivate_source_after_failures": 5
   }', 'Research engine limits and thresholds.'),
  ('global', 'ideas', '{
     "per_brand_per_run": 6,
     "topic_cooldown_days": 21,
     "min_backlog": 10
   }', 'Idea engine: how many ideas to create and how long before a topic may repeat.'),
  ('global', 'calendar', '{
     "horizon_days": 14,
     "max_same_pillar_in_row": 2,
     "max_same_format_in_row": 3,
     "min_gap_hours_same_account": 20
   }', 'Content calendar rotation rules.'),
  ('global', 'content_ratio', '{
     "educational": 0.45, "proof": 0.15, "story": 0.2, "opinion": 0.05, "engagement": 0.05, "promotional": 0.1
   }', 'Target mix of pillar content types. Promotional is capped by this share.'),
  ('global', 'qa', '{
     "min_score_pass": 0.8,
     "min_score_warning": 0.65,
     "max_regenerations": 2,
     "max_hashtags_default": 5,
     "duplicate_similarity_days": 90
   }', 'Quality-control thresholds.'),
  ('global', 'approval', '{
     "channel": "telegram",
     "expire_after_hours": 72,
     "reminder_after_hours": 24
   }', 'Approval channel and timing.'),
  ('global', 'publishing', '{
     "max_attempts": 3,
     "backoff_minutes": [5, 30, 120],
     "stale_after_minutes": 15,
     "claim_batch_size": 5
   }', 'Publishing retries. A job stuck in PUBLISHING is never retried automatically.'),
  ('global', 'analytics', '{
     "collect_at_hours": [2, 24, 72, 168, 720],
     "complete_after_days": 30
   }', 'When to pull post metrics after publishing (snapshots are never overwritten).'),
  ('global', 'learning', '{
     "min_posts_for_signal": 8,
     "lookback_days": 90,
     "metric_weights": {"engagement_rate": 0.25, "saves": 0.15, "shares": 0.15, "clicks": 0.2, "leads": 0.25},
     "auto_apply_minor": false
   }', 'Learning engine weights. Recommendations always need approval unless auto_apply_minor is true.'),
  ('global', 'notifications', '{
     "default_channel": "telegram",
     "telegram_chat_id": null,
     "email_to": null,
     "unusual_engagement_multiplier": 3
   }', 'Notification routing. Set telegram_chat_id to your chat id (not a secret; the bot token is an n8n credential). Until it is set, notifications are stored but marked SUPPRESSED.'),
  ('global', 'tracking', '{
     "website_base_url": "https://oreece.com",
     "utm_source_from_platform": true,
     "utm_medium": "social"
   }', 'UTM link generation for lead attribution. Confirm the website URL.')
ON CONFLICT (scope, key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Formats & platforms
-- -----------------------------------------------------------------------------
INSERT INTO social.formats (slug, name, needs_media, is_video) VALUES
  ('text', 'Text post', false, false),
  ('image', 'Single image', true, false),
  ('carousel', 'Carousel / multi-image / document', true, false),
  ('short_video', 'Short vertical video', true, true),
  ('long_video', 'Long-form video', true, true),
  ('story', 'Story', true, false),
  ('thread', 'Thread', false, false),
  ('link', 'Link post', false, false),
  ('poll', 'Poll', false, false),
  ('quote', 'Quote graphic / quote post', true, false),
  ('case_study', 'Case study', false, false)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO social.platforms (slug, name, api_access, api_notes) VALUES
  ('linkedin', 'LinkedIn', 'requires_review',
   'Personal profile: "Share on LinkedIn" (w_member_social) self-serve. Company page: Community Management API access must be approved by LinkedIn.'),
  ('instagram', 'Instagram', 'requires_review',
   'Instagram professional account linked to a Facebook Page; Meta app review for content publishing permissions and business verification.'),
  ('facebook', 'Facebook', 'requires_review',
   'Page publishing via Graph API; Meta app review for page management/publishing permissions.'),
  ('tiktok', 'TikTok', 'private_until_audit',
   'Content Posting API. Unaudited clients can only post with private (SELF_ONLY) visibility.'),
  ('youtube', 'YouTube', 'private_until_audit',
   'YouTube Data API videos.insert. Uploads from unverified API projects are restricted to private until the project passes an audit.'),
  ('youtube_shorts', 'YouTube Shorts', 'private_until_audit',
   'Uploaded through YouTube Data API as vertical short video; same audit rule as YouTube.'),
  ('x', 'X', 'requires_paid_tier',
   'Posting through the X API requires a paid access tier.')
ON CONFLICT (slug) DO NOTHING;

-- Capability values are defaults to verify against each platform's current
-- documentation (see docs/PLATFORMS.md); edit rows, not code, when they change.
INSERT INTO social.platform_capabilities
  (platform, format, supported, publishable_via_api, max_chars, max_title_chars, max_hashtags, recommended_hashtags, media_spec, cta_rules, style_notes, last_verified) VALUES
  ('linkedin', 'text',        true, true, 3000, NULL, NULL, 3, '{}', 'One clear CTA at the end; links reduce reach — prefer link in comments or a soft CTA.', 'Hook in first 2 lines (before "see more"). Short paragraphs, white space, no emoji walls.', '2026-10-02'),
  ('linkedin', 'image',       true, true, 3000, NULL, NULL, 3, '{"aspect_ratios":["1:1","4:5","1.91:1"],"recommended_px":"1080x1350"}', 'Same as text.', 'Image must add information, not decoration.', '2026-10-02'),
  ('linkedin', 'carousel',    true, true, 3000, NULL, NULL, 3, '{"type":"pdf_document","max_pages":300,"recommended_pages":"6-10","aspect_ratios":["1:1","4:5"]}', 'Final slide carries the CTA.', 'One idea per slide, large type, slide 1 is the hook.', '2026-10-02'),
  ('linkedin', 'short_video', true, true, 3000, NULL, NULL, 3, '{"aspect_ratios":["9:16","1:1","4:5"],"min_s":3,"max_s":600}', 'Same as text.', 'Captions burned in; most watch muted.', '2026-10-02'),
  ('linkedin', 'link',        true, true, 3000, NULL, NULL, 3, '{}', 'Explain why the link is worth the click.', NULL, '2026-10-02'),
  ('linkedin', 'poll',        true, true, 3000, NULL, NULL, 2, '{"options_min":2,"options_max":4,"option_max_chars":30}', 'Ask one genuine question.', NULL, '2026-10-02'),
  ('linkedin', 'quote',       true, true, 3000, NULL, NULL, 3, '{"aspect_ratios":["1:1","4:5"]}', NULL, NULL, '2026-10-02'),
  ('linkedin', 'case_study',  true, true, 3000, NULL, NULL, 3, '{}', 'CTA to discuss a similar problem.', 'Problem → approach → result → lesson. Numbers only if verified.', '2026-10-02'),
  ('linkedin', 'story',       false, false, NULL, NULL, NULL, NULL, '{}', NULL, NULL, '2026-10-02'),
  ('linkedin', 'thread',      false, false, NULL, NULL, NULL, NULL, '{}', NULL, NULL, '2026-10-02'),
  ('linkedin', 'long_video',  true, true, 3000, NULL, NULL, 3, '{"max_s":900}', NULL, NULL, '2026-10-02'),

  ('instagram', 'image',       true, true, 2200, NULL, 30, 5, '{"aspect_ratios":["1:1","4:5","1.91:1"],"recommended_px":"1080x1350"}', 'Links are not clickable in captions — CTA points to profile link or DM keyword.', 'First line is the hook; caption supports the visual.', '2026-10-02'),
  ('instagram', 'carousel',    true, true, 2200, NULL, 30, 5, '{"items_min":2,"items_max":10,"aspect_ratios":["1:1","4:5"]}', 'Same as image; last slide CTA.', 'Swipe-worthy: each slide earns the next.', '2026-10-02'),
  ('instagram', 'short_video', true, true, 2200, NULL, 30, 5, '{"type":"reel","aspect_ratios":["9:16"],"min_s":3,"max_s":900}', 'Same as image.', 'Hook in first 2 seconds, on-screen text.', '2026-10-02'),
  ('instagram', 'story',       true, true, NULL, NULL, NULL, 0, '{"aspect_ratios":["9:16"],"max_s":60}', 'Stickers/links are not available through the publishing API.', NULL, '2026-10-02'),
  ('instagram', 'quote',       true, true, 2200, NULL, 30, 5, '{"aspect_ratios":["1:1","4:5"]}', NULL, NULL, '2026-10-02'),
  ('instagram', 'case_study',  true, true, 2200, NULL, 30, 5, '{"render_as":"carousel"}', NULL, 'Render as carousel.', '2026-10-02'),
  ('instagram', 'text',        false, false, NULL, NULL, NULL, NULL, '{}', NULL, 'Instagram needs media.', '2026-10-02'),
  ('instagram', 'link',        false, false, NULL, NULL, NULL, NULL, '{}', NULL, NULL, '2026-10-02'),
  ('instagram', 'poll',        false, false, NULL, NULL, NULL, NULL, '{}', NULL, NULL, '2026-10-02'),
  ('instagram', 'thread',      false, false, NULL, NULL, NULL, NULL, '{}', NULL, NULL, '2026-10-02'),
  ('instagram', 'long_video',  false, false, NULL, NULL, NULL, NULL, '{}', NULL, NULL, '2026-10-02'),

  ('facebook', 'text',        true, true, 63206, NULL, NULL, 2, '{}', 'Direct CTA with link is fine.', 'Conversational; shorter than LinkedIn.', '2026-10-02'),
  ('facebook', 'image',       true, true, 63206, NULL, NULL, 2, '{"aspect_ratios":["1:1","4:5","1.91:1"]}', NULL, NULL, '2026-10-02'),
  ('facebook', 'carousel',    true, true, 63206, NULL, NULL, 2, '{"type":"multi_photo","items_max":10}', NULL, NULL, '2026-10-02'),
  ('facebook', 'short_video', true, true, 63206, NULL, NULL, 2, '{"type":"reel","aspect_ratios":["9:16"],"min_s":3,"max_s":90}', NULL, NULL, '2026-10-02'),
  ('facebook', 'long_video',  true, true, 63206, NULL, NULL, 2, '{}', NULL, NULL, '2026-10-02'),
  ('facebook', 'link',        true, true, 63206, NULL, NULL, 2, '{}', NULL, NULL, '2026-10-02'),
  ('facebook', 'quote',       true, true, 63206, NULL, NULL, 2, '{}', NULL, NULL, '2026-10-02'),
  ('facebook', 'case_study',  true, true, 63206, NULL, NULL, 2, '{}', NULL, NULL, '2026-10-02'),
  ('facebook', 'story',       false, false, NULL, NULL, NULL, NULL, '{}', NULL, 'Enable after verifying Page stories API access.', '2026-10-02'),
  ('facebook', 'poll',        false, false, NULL, NULL, NULL, NULL, '{}', NULL, NULL, '2026-10-02'),
  ('facebook', 'thread',      false, false, NULL, NULL, NULL, NULL, '{}', NULL, NULL, '2026-10-02'),

  ('tiktok', 'short_video', true, true, 2200, NULL, NULL, 4, '{"aspect_ratios":["9:16"],"min_s":3,"max_s":600}', 'Spoken CTA plus caption CTA; no external links.', 'Native, informal, face-to-camera or screen recording. Hook in first second.', '2026-10-02'),
  ('tiktok', 'carousel',    true, true, 2200, NULL, NULL, 4, '{"type":"photo_post","items_max":35,"aspect_ratios":["9:16","4:5"]}', NULL, NULL, '2026-10-02'),
  ('tiktok', 'text',        false, false, NULL, NULL, NULL, NULL, '{}', NULL, NULL, '2026-10-02'),

  ('youtube', 'long_video', true, true, 5000, 100, 15, 3, '{"aspect_ratios":["16:9"]}', 'CTA in description + pinned comment.', 'Title ≤ 60 chars ideally; description first 2 lines matter.', '2026-10-02'),
  ('youtube_shorts', 'short_video', true, true, 5000, 100, 15, 3, '{"aspect_ratios":["9:16"],"max_s":180}', 'Spoken CTA; link in description.', 'Loopable, hook in first second.', '2026-10-02'),

  ('x', 'text',        true, true, 280, NULL, NULL, 1, '{}', 'Optional link; one CTA max.', 'Punchy, specific, no hashtag stuffing.', '2026-10-02'),
  ('x', 'thread',      true, true, 280, NULL, NULL, 1, '{"parts_max":12}', 'CTA in the last post.', 'First post must stand alone.', '2026-10-02'),
  ('x', 'image',       true, true, 280, NULL, NULL, 1, '{"items_max":4}', NULL, NULL, '2026-10-02'),
  ('x', 'short_video', true, true, 280, NULL, NULL, 1, '{"max_s":140}', NULL, NULL, '2026-10-02'),
  ('x', 'link',        true, true, 280, NULL, NULL, 1, '{}', NULL, NULL, '2026-10-02'),
  ('x', 'poll',        true, true, 280, NULL, NULL, 0, '{"options_min":2,"options_max":4,"option_max_chars":25}', NULL, NULL, '2026-10-02'),
  ('x', 'quote',       true, true, 280, NULL, NULL, 1, '{}', NULL, NULL, '2026-10-02')
ON CONFLICT (platform, format) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Brands
-- -----------------------------------------------------------------------------
INSERT INTO social.brands (slug, name, kind, description, target_audience, positioning, default_cta, website_url) VALUES
  ('oreece', 'Oreece', 'company',
   'Oreece Business Solutions / Oreece IT — digital transformation, business & technology consulting, custom software, web & app development, digital marketing, branding, automation and AI solutions.',
   'SME owners, founders, entrepreneurs and business managers in New Zealand, Sri Lanka and internationally who need websites, software, automation, AI or a digital transformation partner.',
   'A practical, modern technology partner that turns business problems into working systems — strategy and delivery in one team.',
   'Talk to Oreece about what you want to automate or build.',
   'https://oreece.com'),
  ('founder', 'Founder (personal brand)', 'personal',
   'The founder''s personal brand: building Oreece, technology, AI, software, business systems, analytics and lessons from running a technology business in New Zealand.',
   'Founders, aspiring entrepreneurs, technology professionals, business analysts and SME operators who want honest, practical insight from someone building a tech company.',
   'A builder sharing what actually happens while growing a technology business — candid, specific, learning in public.',
   'Follow along — I share what I learn building Oreece.',
   NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO social.brand_voice (brand_id, tone, person, sentence_style, vocabulary, preferred_terms, prohibited_terms,
                                brand_values, audience_notes, cta_guidelines, differentiation, writing_examples)
SELECT b.id, v.tone, v.person, v.sentence_style, v.vocabulary, v.preferred_terms::jsonb, v.prohibited_terms,
       v.brand_values, v.audience_notes, v.cta_guidelines, v.differentiation, v.writing_examples::jsonb
FROM social.brands b
JOIN (VALUES
  ('oreece',
   'Professional, confident, practical and optimistic. Expert but never arrogant. Business outcomes first, technology second.',
   'first_plural',
   'Clear, short sentences. Concrete examples over abstractions. Explain technical ideas in business language. One idea per paragraph.',
   ARRAY['digital transformation','automation','business systems','workflow','practical','outcomes','SME','scalable','integration'],
   '{"business systems": "tech stack", "practical AI": "AI magic", "clients": "customers (when referring to Oreece clients)"}',
   ARRAY['revolutionary','game-changer','game-changing','disrupt','synergy','cutting-edge','guaranteed results','10x','world-class','best in the world','unleash','skyrocket'],
   ARRAY['practical over hype','honest advice','quality delivery','long-term partnership','continuous improvement'],
   'Busy SME decision makers. They care about time saved, cost, risk, growth and reliability — not jargon.',
   'One CTA per post. Invite a conversation (consultation, DM, comment) rather than a hard sell. Promotional CTAs only on promotional/proof pillars.',
   'Speaks as "we" — the company. Never shares personal feelings, founder anecdotes or opinions in first person singular. Never mirrors the founder''s posts.',
   '[{"platform":"linkedin","text":"Most SMEs don''t need \"more software\". They need fewer manual handoffs.\n\nWe recently mapped a client''s quote-to-invoice process: 11 steps, 4 spreadsheets, 3 people re-typing the same data.\n\nThe fix wasn''t a new platform. It was connecting the tools they already had.\n\nIf your team re-enters the same information twice, that''s where to start.","why":"Specific, outcome-led, practical, no hype, single soft CTA."}]'),
  ('founder',
   'Candid, reflective, curious and practical. Shares wins and mistakes equally. Opinionated when useful, but labels opinions as opinions.',
   'first_singular',
   'Conversational first person. Story → lesson → takeaway. Short lines, occasional one-line paragraphs. Specific details over generic motivation.',
   ARRAY['building','lessons','learned','mistake','founder','systems','analytics','experiment','in public'],
   '{"I learned": "Here are 5 secrets", "what worked for us": "the only way"}',
   ARRAY['hustle','grindset','rise and grind','crushing it','overnight success','secret formula','guru','millionaire mindset','10x'],
   ARRAY['honesty','learning in public','craftsmanship','long-term thinking','helping other builders'],
   'Peers and people a step behind on the journey. They value honesty, specifics and transferable lessons.',
   'Soft CTAs: ask a question, invite a follow, invite people to share their experience. Mention Oreece only when it is genuinely part of the story.',
   'Speaks as "I". Content must come from the founder''s real experiences (experiences table) or clearly labelled opinions — never invented anecdotes. Never reads like a company advert or reuses Oreece''s posts.',
   '[{"platform":"linkedin","text":"The first automation I built for a client saved them 6 hours a week.\n\nThey stopped using it after a month.\n\nNot because it broke — because nobody owned it.\n\nLesson I keep relearning: a system without an owner is a demo, not a system.","why":"Real story, honest outcome, single clear lesson, first person."}]')
) AS v(slug, tone, person, sentence_style, vocabulary, preferred_terms, prohibited_terms, brand_values,
       audience_notes, cta_guidelines, differentiation, writing_examples)
  ON v.slug = b.slug
ON CONFLICT (brand_id) DO NOTHING;

INSERT INTO social.brand_visual (brand_id, colours, fonts, visual_style, layout_rules, imagery_style)
SELECT b.id, v.colours::jsonb, v.fonts::jsonb, v.visual_style, v.layout_rules, v.imagery_style
FROM social.brands b
JOIN (VALUES
  ('oreece', '{"primary":"TODO","secondary":"TODO","accent":"TODO","background":"#FFFFFF","text":"#111111"}',
   '{"heading":"TODO","body":"TODO"}',
   'Clean, modern, corporate-tech. Generous white space, bold headline, one focal element.',
   'Logo bottom-right on every graphic. Max 20 words of on-image text. 64px safe margin. Consistent template per format.',
   'Real work environments, interfaces, diagrams and abstract tech shapes. No cheesy stock handshakes or robot imagery.'),
  ('founder', '{"primary":"TODO","accent":"TODO","background":"#FAFAFA","text":"#111111"}',
   '{"heading":"TODO","body":"TODO"}',
   'Personal and minimal: photos of the founder, whiteboards, screens, handwritten-style notes.',
   'No company logo by default. Name/handle bottom-left. Max 15 words of on-image text.',
   'Authentic, unpolished, behind-the-scenes photography; simple text-on-colour quote cards.')
) AS v(slug, colours, fonts, visual_style, layout_rules, imagery_style) ON v.slug = b.slug
ON CONFLICT (brand_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Content pillars (weights are relative; the learning engine proposes changes)
-- -----------------------------------------------------------------------------
INSERT INTO social.content_pillars (brand_id, slug, name, description, content_type, weight)
SELECT b.id, p.slug, p.name, p.description, p.content_type, p.weight
FROM social.brands b
JOIN (VALUES
  ('oreece', 'ai_automation', 'AI & Automation', 'Practical AI and workflow automation for SMEs: what works, what it costs, where to start.', 'educational', 1.5),
  ('oreece', 'digital_transformation', 'Digital Transformation', 'Modernising processes, systems and ways of working.', 'educational', 1.2),
  ('oreece', 'business_technology', 'Business Technology', 'Choosing and connecting the right business tools and systems.', 'educational', 1.0),
  ('oreece', 'software_websites', 'Software & Websites', 'Custom software, web and app development — decisions, process, quality.', 'educational', 1.0),
  ('oreece', 'business_growth', 'Business Growth', 'Digital marketing, branding and growth systems for SMEs.', 'educational', 0.8),
  ('oreece', 'case_studies', 'Case Studies', 'Client projects (only with client_content_permission).', 'proof', 0.8),
  ('oreece', 'client_results', 'Client Results', 'Verified outcomes and testimonials (only with permission).', 'proof', 0.5),
  ('oreece', 'educational', 'Educational Content', 'Explainers, how-tos, checklists, myths vs facts.', 'educational', 1.0),
  ('oreece', 'company_story', 'Founder/Company Story', 'Oreece team, culture, milestones and how we work.', 'story', 0.5),
  ('oreece', 'industry_insights', 'Industry Insights', 'Analysis of relevant news and trends for NZ/Sri Lanka SMEs.', 'opinion', 0.8),
  ('oreece', 'services', 'Services & Offers', 'What Oreece offers and how to engage. Capped by content_ratio.promotional.', 'promotional', 0.5),
  ('founder', 'building_tech_company', 'Building a Technology Company', 'The real journey of building Oreece.', 'story', 1.5),
  ('founder', 'ai', 'AI', 'Hands-on AI experiments, tools and opinions.', 'educational', 1.2),
  ('founder', 'entrepreneurship', 'Entrepreneurship', 'Founder decisions, trade-offs, risk and focus.', 'story', 1.0),
  ('founder', 'software', 'Software', 'Building products and software craft.', 'educational', 0.8),
  ('founder', 'business_systems', 'Business Systems', 'Processes, operations and systems thinking.', 'educational', 1.0),
  ('founder', 'lessons_learned', 'Lessons Learned', 'Mistakes and what changed afterwards.', 'story', 1.2),
  ('founder', 'productivity', 'Productivity', 'Workflows and habits that actually help.', 'educational', 0.6),
  ('founder', 'professional_development', 'Career/Professional Development', 'Learning, skills, career moves in tech.', 'educational', 0.6),
  ('founder', 'startup_building', 'Startup Building', 'Products, MVPs, customers, validation.', 'educational', 0.8),
  ('founder', 'business_analytics', 'Business Analytics', 'Data, metrics and decision-making.', 'educational', 0.8),
  ('founder', 'nz_business', 'NZ Business Environment', 'Observations on doing business in New Zealand (and Sri Lanka).', 'opinion', 0.6)
) AS p(brand_slug, slug, name, description, content_type, weight) ON p.brand_slug = b.slug
ON CONFLICT (brand_id, slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Social accounts — inactive placeholders using the mock publisher.
-- Activate and fill external_account_id / n8n_credential_name per account.
-- Posting windows are local (Pacific/Auckland) times, ISO weekdays 1=Mon.
-- -----------------------------------------------------------------------------
INSERT INTO social.social_accounts (brand_id, platform, publisher_provider, posting_windows, max_posts_per_day, max_posts_per_week)
SELECT b.id, a.platform, 'mock', a.windows::jsonb, a.per_day, a.per_week
FROM social.brands b
JOIN (VALUES
  ('oreece', 'linkedin',  '[{"days":[2,3,4],"start":"08:00","end":"10:00"},{"days":[2,4],"start":"12:00","end":"13:00"}]', 1, 3),
  ('oreece', 'facebook',  '[{"days":[1,3,5],"start":"12:00","end":"14:00"}]', 1, 3),
  ('oreece', 'instagram', '[{"days":[1,3,5],"start":"18:00","end":"20:00"}]', 1, 3),
  ('oreece', 'tiktok',    '[{"days":[2,4,6],"start":"18:00","end":"21:00"}]', 1, 2),
  ('oreece', 'youtube_shorts', '[{"days":[3,6],"start":"17:00","end":"20:00"}]', 1, 2),
  ('oreece', 'youtube',   '[{"days":[4],"start":"17:00","end":"19:00"}]', 1, 1),
  ('oreece', 'x',         '[{"days":[1,2,3,4,5],"start":"07:30","end":"09:00"}]', 1, 5),
  ('founder', 'linkedin', '[{"days":[1,2,3,4],"start":"07:30","end":"09:00"}]', 1, 4),
  ('founder', 'instagram','[{"days":[2,5],"start":"19:00","end":"21:00"}]', 1, 2),
  ('founder', 'x',        '[{"days":[1,2,3,4,5],"start":"12:00","end":"13:00"}]', 1, 5),
  ('founder', 'tiktok',   '[{"days":[3,6],"start":"19:00","end":"21:00"}]', 1, 2),
  ('founder', 'youtube_shorts', '[{"days":[6],"start":"10:00","end":"12:00"}]', 1, 1)
) AS a(brand_slug, platform, windows, per_day, per_week) ON a.brand_slug = b.slug
ON CONFLICT (brand_id, platform) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Research sources (feeds verified reachable on 2026-10-02)
-- -----------------------------------------------------------------------------
INSERT INTO social.research_sources (name, type, url, topics, region, quality_score, fetch_every_hours) VALUES
  ('RNZ Business', 'rss', 'https://www.rnz.co.nz/rss/business.xml', ARRAY['nz_business','economy'], 'NZ', 0.85, 12),
  ('RNZ Technology', 'rss', 'https://www.rnz.co.nz/rss/technology.xml', ARRAY['technology'], 'NZ', 0.85, 12),
  ('NZ Herald Business', 'rss', 'https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/business/?outputType=xml', ARRAY['nz_business'], 'NZ', 0.75, 12),
  ('IT Brief NZ', 'rss', 'https://itbrief.co.nz/feed', ARRAY['technology','cybersecurity','business_technology'], 'NZ', 0.75, 12),
  ('Reseller News NZ', 'rss', 'https://www.reseller.co.nz/rss/', ARRAY['technology','business_technology'], 'NZ', 0.7, 24),
  ('EconomyNext (Sri Lanka)', 'rss', 'https://economynext.com/feed/', ARRAY['sri_lanka_business','economy'], 'LK', 0.7, 24),
  ('SmartCompany (AU SMEs)', 'rss', 'https://www.smartcompany.com.au/feed/', ARRAY['sme','entrepreneurship'], 'AU', 0.7, 24),
  ('TechCrunch', 'rss', 'https://techcrunch.com/feed/', ARRAY['startups','technology','ai'], 'global', 0.75, 12),
  ('MIT Technology Review', 'rss', 'https://www.technologyreview.com/feed/', ARRAY['ai','technology'], 'global', 0.9, 24),
  ('Ars Technica — Tech Lab', 'rss', 'https://feeds.arstechnica.com/arstechnica/technology-lab', ARRAY['technology','software'], 'global', 0.8, 24),
  ('The Verge', 'rss', 'https://www.theverge.com/rss/index.xml', ARRAY['technology'], 'global', 0.65, 24),
  ('ZDNet — AI', 'rss', 'https://www.zdnet.com/topic/artificial-intelligence/rss.xml', ARRAY['ai'], 'global', 0.65, 24),
  ('Hacker News (300+ points)', 'rss', 'https://hnrss.org/frontpage?points=300', ARRAY['software','startups','technology'], 'global', 0.7, 12),
  ('Google — AI blog', 'rss', 'https://blog.google/technology/ai/rss/', ARRAY['ai'], 'global', 0.8, 24),
  ('OpenAI News', 'rss', 'https://openai.com/news/rss.xml', ARRAY['ai'], 'global', 0.8, 24),
  ('AWS Machine Learning Blog', 'rss', 'https://aws.amazon.com/blogs/machine-learning/feed/', ARRAY['ai','software'], 'global', 0.7, 48),
  ('Krebs on Security', 'rss', 'https://krebsonsecurity.com/feed/', ARRAY['cybersecurity'], 'global', 0.85, 24),
  ('Computer Weekly — IT Management', 'rss', 'https://www.computerweekly.com/rss/IT-management.xml', ARRAY['digital_transformation','business_technology'], 'global', 0.7, 24),
  ('CIO.com', 'rss', 'https://www.cio.com/feed/', ARRAY['digital_transformation','business_technology'], 'global', 0.7, 24),
  ('McKinsey Insights', 'rss', 'https://www.mckinsey.com/insights/rss', ARRAY['digital_transformation','business_analytics'], 'global', 0.85, 48),
  ('Stratechery', 'rss', 'https://stratechery.com/feed/', ARRAY['technology','strategy'], 'global', 0.85, 48),
  ('MarTech', 'rss', 'https://martech.org/feed/', ARRAY['digital_marketing'], 'global', 0.7, 24),
  ('Search Engine Journal', 'rss', 'https://www.searchenginejournal.com/feed/', ARRAY['digital_marketing'], 'global', 0.65, 24)
ON CONFLICT (type, url) DO NOTHING;
