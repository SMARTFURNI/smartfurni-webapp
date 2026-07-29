-- Facebook Group Marketing AI operations
-- AI may analyze, rank, draft and recommend. It never joins groups, posts to
-- Facebook, replies to comments, or changes operational records automatically.

CREATE TABLE IF NOT EXISTS facebook_group_ai_recommendations (
  id TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL UNIQUE,
  section TEXT NOT NULL,
  agent_type TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  rationale TEXT NOT NULL DEFAULT '',
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  proposed_action JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence NUMERIC(5,2) NOT NULL DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'medium',
  risk TEXT NOT NULL DEFAULT 'low',
  status TEXT NOT NULL DEFAULT 'pending',
  requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
  model TEXT,
  prompt_version TEXT NOT NULL DEFAULT 'fbg-ops-v1',
  generated_by TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT NOT NULL DEFAULT '',
  applied_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status IN ('pending', 'approved', 'dismissed', 'applied', 'expired')),
  CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  CHECK (risk IN ('high', 'medium', 'low')),
  CHECK (confidence >= 0 AND confidence <= 100)
);

CREATE INDEX IF NOT EXISTS idx_fbg_ai_recommendations_queue
  ON facebook_group_ai_recommendations(status, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fbg_ai_recommendations_section
  ON facebook_group_ai_recommendations(section, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_fbg_ai_recommendations_target
  ON facebook_group_ai_recommendations(target_type, target_id, status);

CREATE TABLE IF NOT EXISTS facebook_group_ai_runs (
  id TEXT PRIMARY KEY,
  run_type TEXT NOT NULL,
  section TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  model TEXT,
  candidate_count INTEGER NOT NULL DEFAULT 0,
  recommendation_count INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_by TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CHECK (status IN ('running', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_fbg_ai_runs_recent
  ON facebook_group_ai_runs(run_type, started_at DESC);
