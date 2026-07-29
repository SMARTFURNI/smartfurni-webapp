CREATE TABLE IF NOT EXISTS fanpage_ai_sync_runs (
  id TEXT PRIMARY KEY,
  run_date DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
  run_type TEXT NOT NULL DEFAULT 'scheduled',
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  pages_total INTEGER NOT NULL DEFAULT 0,
  pages_synced INTEGER NOT NULL DEFAULT 0,
  conversations_scanned INTEGER NOT NULL DEFAULT 0,
  messages_saved INTEGER NOT NULL DEFAULT 0,
  leads_qualified INTEGER NOT NULL DEFAULT 0,
  plans_generated INTEGER NOT NULL DEFAULT 0,
  push_sent INTEGER NOT NULL DEFAULT 0,
  model TEXT,
  error TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT fanpage_ai_sync_runs_type_check
    CHECK (run_type IN ('scheduled', 'manual')),
  CONSTRAINT fanpage_ai_sync_runs_status_check
    CHECK (status IN ('running', 'success', 'partial', 'failed', 'skipped'))
);

CREATE INDEX IF NOT EXISTS idx_fanpage_ai_sync_runs_date
  ON fanpage_ai_sync_runs(run_date DESC, started_at DESC);

CREATE TABLE IF NOT EXISTS fanpage_conversation_snapshots (
  id TEXT PRIMARY KEY,
  page_internal_id TEXT NOT NULL,
  page_facebook_id TEXT NOT NULL,
  page_name TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  participant_id TEXT,
  participant_name TEXT,
  snippet TEXT NOT NULL DEFAULT '',
  updated_time TIMESTAMPTZ,
  message_count INTEGER NOT NULL DEFAULT 0,
  unread_count INTEGER NOT NULL DEFAULT 0,
  can_reply BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_staff_id TEXT,
  assigned_staff_name TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(page_internal_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_fanpage_conversation_snapshots_page
  ON fanpage_conversation_snapshots(page_internal_id, updated_time DESC);
CREATE INDEX IF NOT EXISTS idx_fanpage_conversation_snapshots_participant
  ON fanpage_conversation_snapshots(participant_id);

CREATE TABLE IF NOT EXISTS fanpage_conversation_messages (
  id TEXT PRIMARY KEY,
  page_internal_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  sender_id TEXT,
  sender_name TEXT,
  direction TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  message_created_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fanpage_conversation_messages_direction_check
    CHECK (direction IN ('inbound', 'outbound'))
);

CREATE INDEX IF NOT EXISTS idx_fanpage_conversation_messages_conversation
  ON fanpage_conversation_messages(page_internal_id, conversation_id, message_created_at);

CREATE TABLE IF NOT EXISTS fanpage_ai_care_plans (
  id TEXT PRIMARY KEY,
  analysis_date DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
  run_id TEXT REFERENCES fanpage_ai_sync_runs(id) ON DELETE SET NULL,
  page_internal_id TEXT NOT NULL,
  page_facebook_id TEXT NOT NULL,
  page_name TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  participant_id TEXT,
  customer_id TEXT,
  customer_name TEXT NOT NULL DEFAULT 'Khách Facebook',
  assigned_staff_id TEXT,
  assigned_staff_name TEXT,
  lead_score INTEGER NOT NULL DEFAULT 0,
  lead_temperature TEXT NOT NULL DEFAULT 'cold',
  funnel_stage TEXT NOT NULL DEFAULT 'new',
  confidence NUMERIC(5,4) NOT NULL DEFAULT 0,
  summary TEXT NOT NULL DEFAULT '',
  customer_need TEXT NOT NULL DEFAULT '',
  product_interest TEXT[] NOT NULL DEFAULT '{}',
  objections TEXT[] NOT NULL DEFAULT '{}',
  buying_signals TEXT[] NOT NULL DEFAULT '{}',
  next_best_action TEXT NOT NULL DEFAULT '',
  due_at TIMESTAMPTZ,
  plan_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  engine TEXT NOT NULL DEFAULT 'rules',
  model TEXT,
  source_message_count INTEGER NOT NULL DEFAULT 0,
  source_latest_message_at TIMESTAMPTZ,
  notification_owner_scope TEXT,
  notification_owner_id TEXT,
  notification_sent_at TIMESTAMPTZ,
  notification_result JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(analysis_date, page_internal_id, conversation_id),
  CONSTRAINT fanpage_ai_care_plans_score_check
    CHECK (lead_score BETWEEN 0 AND 100),
  CONSTRAINT fanpage_ai_care_plans_temperature_check
    CHECK (lead_temperature IN ('hot', 'warm', 'cold')),
  CONSTRAINT fanpage_ai_care_plans_status_check
    CHECK (status IN ('pending', 'approved', 'in_progress', 'completed', 'dismissed'))
);

CREATE INDEX IF NOT EXISTS idx_fanpage_ai_care_plans_queue
  ON fanpage_ai_care_plans(status, lead_score DESC, due_at);
CREATE INDEX IF NOT EXISTS idx_fanpage_ai_care_plans_staff
  ON fanpage_ai_care_plans(assigned_staff_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_fanpage_ai_care_plans_page
  ON fanpage_ai_care_plans(page_internal_id, analysis_date DESC);
