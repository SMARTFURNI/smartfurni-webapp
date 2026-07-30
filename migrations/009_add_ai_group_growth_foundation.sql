-- AI Group Growth foundation
-- Additive-only migration. Existing Facebook Group Marketing records and URLs
-- remain valid. Facebook operations continue to be human-in-the-loop.

CREATE TABLE IF NOT EXISTS facebook_group_blueprints (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  group_kind TEXT NOT NULL DEFAULT 'owned',
  product_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_audience TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '',
  objective TEXT NOT NULL DEFAULT '',
  positioning TEXT NOT NULL DEFAULT '',
  name_options JSONB NOT NULL DEFAULT '[]'::jsonb,
  selected_name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  membership_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  launch_plan JSONB NOT NULL DEFAULT '{}'::jsonb,
  kpis JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  updated_by TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE facebook_groups
  ADD COLUMN IF NOT EXISTS group_kind TEXT NOT NULL DEFAULT 'external_distribution',
  ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS blueprint_id TEXT REFERENCES facebook_group_blueprints(id);

CREATE TABLE IF NOT EXISTS facebook_group_content_pillars (
  id TEXT PRIMARY KEY,
  blueprint_id TEXT REFERENCES facebook_group_blueprints(id) ON DELETE CASCADE,
  group_id TEXT REFERENCES facebook_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  objective TEXT NOT NULL DEFAULT '',
  audience_need TEXT NOT NULL DEFAULT '',
  content_ratio NUMERIC(5,2) NOT NULL DEFAULT 0,
  formats JSONB NOT NULL DEFAULT '[]'::jsonb,
  example_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  sort_order INTEGER NOT NULL DEFAULT 0,
  ai_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS facebook_group_experiments (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES facebook_groups(id) ON DELETE CASCADE,
  pillar_id TEXT REFERENCES facebook_group_content_pillars(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  hypothesis TEXT NOT NULL DEFAULT '',
  primary_metric TEXT NOT NULL DEFAULT 'engagement_rate',
  variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  winner_variant TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS facebook_group_post_metric_snapshots (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES facebook_group_published_posts(id) ON DELETE CASCADE,
  horizon TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  member_count INTEGER,
  reactions INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  messenger_leads INTEGER NOT NULL DEFAULT 0,
  qualified_leads INTEGER NOT NULL DEFAULT 0,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  entered_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, horizon)
);

ALTER TABLE facebook_group_content_drafts
  ADD COLUMN IF NOT EXISTS pillar_id TEXT REFERENCES facebook_group_content_pillars(id),
  ADD COLUMN IF NOT EXISTS experiment_id TEXT REFERENCES facebook_group_experiments(id);

ALTER TABLE facebook_group_publishing_tasks
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

ALTER TABLE facebook_group_comments
  ADD COLUMN IF NOT EXISTS ai_intent TEXT,
  ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS buying_signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS suggested_reply TEXT,
  ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMPTZ;

ALTER TABLE facebook_group_ai_runs
  ADD COLUMN IF NOT EXISTS prompt_version TEXT NOT NULL DEFAULT 'fbg-growth-v1',
  ADD COLUMN IF NOT EXISTS input_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_fbg_blueprints_status
  ON facebook_group_blueprints(status, group_kind, updated_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fbg_groups_blueprint
  ON facebook_groups(blueprint_id, group_kind, lifecycle_stage)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fbg_pillars_scope
  ON facebook_group_content_pillars(blueprint_id, group_id, status, sort_order)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fbg_experiments_scope
  ON facebook_group_experiments(group_id, status, start_date)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fbg_metric_snapshots_post
  ON facebook_group_post_metric_snapshots(post_id, captured_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fbg_tasks_idempotency
  ON facebook_group_publishing_tasks(idempotency_key)
  WHERE idempotency_key IS NOT NULL AND deleted_at IS NULL;

UPDATE facebook_group_settings
SET settings = jsonb_set(
  settings,
  '{commentCheckMinutes}',
  COALESCE(settings->'commentCheckMinutes', '[]'::jsonb) || '10080'::jsonb
)
WHERE id = 'default'
  AND NOT (COALESCE(settings->'commentCheckMinutes', '[]'::jsonb) @> '[10080]'::jsonb);
