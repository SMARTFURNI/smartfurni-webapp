CREATE TABLE IF NOT EXISTS crm_zalo_gmf_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  auto_publish BOOLEAN NOT NULL DEFAULT false,
  require_approval BOOLEAN NOT NULL DEFAULT true,
  business_hours_start TEXT NOT NULL DEFAULT '08:00',
  business_hours_end TEXT NOT NULL DEFAULT '20:00',
  max_posts_per_group_day INTEGER NOT NULL DEFAULT 3,
  min_post_interval_minutes INTEGER NOT NULL DEFAULT 30,
  member_sync_interval_minutes INTEGER NOT NULL DEFAULT 15,
  paused BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO crm_zalo_gmf_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS crm_zalo_gmf_groups (
  group_id TEXT PRIMARY KEY,
  oa_id TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  avatar TEXT NOT NULL DEFAULT '',
  group_link TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'enabled',
  asset_type TEXT NOT NULL DEFAULT '',
  asset_id TEXT NOT NULL DEFAULT '',
  total_member INTEGER NOT NULL DEFAULT 0,
  max_member INTEGER NOT NULL DEFAULT 0,
  valid_through TEXT NOT NULL DEFAULT '',
  auto_renew BOOLEAN NOT NULL DEFAULT false,
  auto_delete_date TEXT NOT NULL DEFAULT '',
  settings JSONB NOT NULL DEFAULT '{}',
  tag TEXT NOT NULL DEFAULT 'Cộng đồng',
  automation_enabled BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  last_member_sync_at TIMESTAMPTZ,
  last_post_at TIMESTAMPTZ,
  sync_error TEXT NOT NULL DEFAULT '',
  raw_payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_zalo_gmf_members (
  group_id TEXT NOT NULL REFERENCES crm_zalo_gmf_groups(group_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  member_type TEXT NOT NULL DEFAULT 'user',
  name TEXT NOT NULL DEFAULT 'Thành viên Zalo',
  avatar TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS crm_zalo_gmf_member_events (
  event_key TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES crm_zalo_gmf_groups(group_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'webhook',
  occurred_at TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_zalo_gmf_contents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  image_prompt TEXT NOT NULL DEFAULT '',
  link_url TEXT NOT NULL DEFAULT '',
  objective TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  target_group_ids JSONB NOT NULL DEFAULT '[]',
  scheduled_at TIMESTAMPTZ,
  ai_model TEXT NOT NULL DEFAULT '',
  approved_by TEXT NOT NULL DEFAULT '',
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_zalo_gmf_schedules (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL REFERENCES crm_zalo_gmf_contents(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL REFERENCES crm_zalo_gmf_groups(group_id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ,
  idempotency_key TEXT NOT NULL UNIQUE,
  content_version INTEGER NOT NULL DEFAULT 1,
  message_id TEXT NOT NULL DEFAULT '',
  error TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}',
  claimed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_zalo_gmf_webhook_receipts (
  event_key TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  group_id TEXT NOT NULL DEFAULT '',
  signature_valid BOOLEAN NOT NULL DEFAULT true,
  processed BOOLEAN NOT NULL DEFAULT false,
  error TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}',
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_zalo_gmf_members_status
  ON crm_zalo_gmf_members(group_id, status, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_zalo_gmf_member_events_time
  ON crm_zalo_gmf_member_events(group_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_zalo_gmf_contents_status
  ON crm_zalo_gmf_contents(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_zalo_gmf_schedules_due
  ON crm_zalo_gmf_schedules(status, COALESCE(next_attempt_at, scheduled_at));
CREATE INDEX IF NOT EXISTS idx_zalo_gmf_schedules_group_day
  ON crm_zalo_gmf_schedules(group_id, scheduled_at DESC);
