-- Facebook Group Marketing MVP
-- Manual publishing workflow only. This schema intentionally stores no Facebook
-- password, browser cookie, personal access token or automated posting session.

CREATE TABLE IF NOT EXISTS facebook_pages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  facebook_page_id TEXT,
  avatar_url TEXT,
  page_url TEXT,
  brand TEXT NOT NULL DEFAULT 'SmartFurni',
  manager_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  max_posts_per_day INTEGER NOT NULL DEFAULT 4 CHECK (max_posts_per_day > 0),
  min_post_interval_minutes INTEGER NOT NULL DEFAULT 60 CHECK (min_post_interval_minutes >= 0),
  allowed_posting_hours JSONB NOT NULL DEFAULT '["08:00-11:30","13:30-21:00"]'::jsonb,
  notes TEXT NOT NULL DEFAULT '',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS facebook_groups (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  group_url TEXT NOT NULL,
  facebook_group_id TEXT,
  topic TEXT,
  region TEXT,
  member_count INTEGER NOT NULL DEFAULT 0,
  allows_pages TEXT NOT NULL DEFAULT 'unknown',
  membership_status TEXT NOT NULL DEFAULT 'not_joined',
  allows_sales TEXT NOT NULL DEFAULT 'unknown',
  assigned_staff_id TEXT,
  next_allowed_post_at TIMESTAMPTZ,
  last_posted_at TIMESTAMPTZ,
  quality_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  grade TEXT NOT NULL DEFAULT 'D',
  status TEXT NOT NULL DEFAULT 'needs_review',
  total_posts INTEGER NOT NULL DEFAULT 0,
  approved_posts INTEGER NOT NULL DEFAULT 0,
  rejected_posts INTEGER NOT NULL DEFAULT 0,
  total_comments INTEGER NOT NULL DEFAULT 0,
  total_messenger_leads INTEGER NOT NULL DEFAULT 0,
  total_qualified_leads INTEGER NOT NULL DEFAULT 0,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_revenue NUMERIC(16,2) NOT NULL DEFAULT 0,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS facebook_group_rules (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES facebook_groups(id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL DEFAULT '',
  analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  analyzed_at TIMESTAMPTZ,
  analyzed_by TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id)
);

CREATE TABLE IF NOT EXISTS facebook_group_memberships (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES facebook_pages(id),
  group_id TEXT NOT NULL REFERENCES facebook_groups(id),
  status TEXT NOT NULL DEFAULT 'not_joined',
  joined_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  notes TEXT NOT NULL DEFAULT '',
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(page_id, group_id)
);

CREATE TABLE IF NOT EXISTS facebook_group_campaigns (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  page_id TEXT REFERENCES facebook_pages(id),
  product_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  owner_id TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  targets JSONB NOT NULL DEFAULT '{}'::jsonb,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS facebook_group_campaign_targets (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES facebook_group_campaigns(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL REFERENCES facebook_groups(id),
  status TEXT NOT NULL DEFAULT 'selected',
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, group_id)
);

CREATE TABLE IF NOT EXISTS facebook_group_content_drafts (
  id TEXT PRIMARY KEY,
  campaign_id TEXT REFERENCES facebook_group_campaigns(id),
  product_id TEXT,
  group_id TEXT REFERENCES facebook_groups(id),
  content_type TEXT NOT NULL DEFAULT 'community_share',
  opening TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  cta TEXT NOT NULL DEFAULT '',
  source_code TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft',
  duplicate_ratio NUMERIC(5,2) NOT NULL DEFAULT 0,
  spam_risk_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  rule_check JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS facebook_group_content_assets (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL REFERENCES facebook_group_content_drafts(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL,
  url TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facebook_group_publishing_tasks (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES facebook_pages(id),
  group_id TEXT NOT NULL REFERENCES facebook_groups(id),
  campaign_id TEXT REFERENCES facebook_group_campaigns(id),
  content_id TEXT NOT NULL REFERENCES facebook_group_content_drafts(id),
  assigned_staff_id TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'scheduled',
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT NOT NULL DEFAULT '',
  notification_sent_at TIMESTAMPTZ,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS facebook_group_published_posts (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL UNIQUE REFERENCES facebook_group_publishing_tasks(id),
  page_id TEXT NOT NULL REFERENCES facebook_pages(id),
  group_id TEXT NOT NULL REFERENCES facebook_groups(id),
  campaign_id TEXT REFERENCES facebook_group_campaigns(id),
  content_id TEXT NOT NULL REFERENCES facebook_group_content_drafts(id),
  source_code TEXT NOT NULL UNIQUE,
  post_url TEXT NOT NULL,
  posted_by TEXT,
  scheduled_at TIMESTAMPTZ,
  actual_posted_at TIMESTAMPTZ NOT NULL,
  moderation_status TEXT NOT NULL DEFAULT 'pending',
  status TEXT NOT NULL DEFAULT 'tracking',
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_checked_at TIMESTAMPTZ,
  notification_sent_at TIMESTAMPTZ,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS facebook_group_post_check_tasks (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES facebook_group_published_posts(id) ON DELETE CASCADE,
  check_type TEXT NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  assigned_staff_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ,
  notification_sent_at TIMESTAMPTZ,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, check_type)
);

CREATE TABLE IF NOT EXISTS facebook_group_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES facebook_group_published_posts(id) ON DELETE CASCADE,
  facebook_name TEXT NOT NULL,
  facebook_url TEXT,
  content TEXT NOT NULL,
  commented_at TIMESTAMPTZ NOT NULL,
  phone TEXT,
  intent TEXT NOT NULL DEFAULT 'other',
  temperature TEXT NOT NULL DEFAULT 'cold',
  replied BOOLEAN NOT NULL DEFAULT FALSE,
  invited_to_messenger BOOLEAN NOT NULL DEFAULT FALSE,
  entered_messenger BOOLEAN NOT NULL DEFAULT FALSE,
  lead_id TEXT,
  assigned_staff_id TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facebook_group_lead_attributions (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  page_id TEXT REFERENCES facebook_pages(id),
  group_id TEXT NOT NULL REFERENCES facebook_groups(id),
  post_id TEXT NOT NULL REFERENCES facebook_group_published_posts(id),
  campaign_id TEXT REFERENCES facebook_group_campaigns(id),
  content_id TEXT REFERENCES facebook_group_content_drafts(id),
  source_code TEXT NOT NULL,
  posting_employee_id TEXT,
  first_messenger_at TIMESTAMPTZ,
  quote_id TEXT,
  order_id TEXT,
  revenue NUMERIC(16,2) NOT NULL DEFAULT 0,
  revenue_event_key TEXT UNIQUE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lead_id, post_id)
);

CREATE TABLE IF NOT EXISTS facebook_group_performance_daily (
  id TEXT PRIMARY KEY,
  metric_date DATE NOT NULL,
  page_id TEXT REFERENCES facebook_pages(id),
  group_id TEXT REFERENCES facebook_groups(id),
  campaign_id TEXT REFERENCES facebook_group_campaigns(id),
  content_id TEXT REFERENCES facebook_group_content_drafts(id),
  employee_id TEXT,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(metric_date, page_id, group_id, campaign_id, content_id, employee_id)
);

CREATE TABLE IF NOT EXISTS facebook_group_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  settings JSONB NOT NULL,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facebook_group_activity_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  actor_id TEXT,
  changes JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fbg_groups_filter ON facebook_groups(status, grade, region, topic);
CREATE INDEX IF NOT EXISTS idx_fbg_groups_next_post ON facebook_groups(next_allowed_post_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fbg_campaign_dates ON facebook_group_campaigns(status, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_fbg_content_workflow ON facebook_group_content_drafts(status, campaign_id, group_id);
CREATE INDEX IF NOT EXISTS idx_fbg_tasks_schedule ON facebook_group_publishing_tasks(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_fbg_tasks_employee ON facebook_group_publishing_tasks(assigned_staff_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_fbg_posts_tracking ON facebook_group_published_posts(status, moderation_status, actual_posted_at);
CREATE INDEX IF NOT EXISTS idx_fbg_checks_queue ON facebook_group_post_check_tasks(status, due_at);
CREATE INDEX IF NOT EXISTS idx_fbg_comments_post ON facebook_group_comments(post_id, commented_at);
CREATE INDEX IF NOT EXISTS idx_fbg_attribution_source ON facebook_group_lead_attributions(source_code);
CREATE INDEX IF NOT EXISTS idx_fbg_attribution_reporting ON facebook_group_lead_attributions(group_id, campaign_id, created_at);

INSERT INTO facebook_group_settings (id, settings)
VALUES (
  'default',
  '{
    "maxPostsPerPagePerDay": 4,
    "minPagePostIntervalMinutes": 60,
    "minGroupPostIntervalDays": 7,
    "maxDuplicateRatio": 50,
    "consecutiveRejectionsBeforePause": 2,
    "commentCheckMinutes": [15, 60, 180, 720, 1440, 4320],
    "responseTargetMinutes": 30,
    "completedTaskRetentionDays": 365,
    "scoreWeights": {
      "audienceFit": 20,
      "allowsPages": 15,
      "allowsSales": 10,
      "approvalRate": 15,
      "messengerRate": 15,
      "qualifiedLeads": 10,
      "orders": 10,
      "revenue": 5
    },
    "gradeRules": {"A": 80, "B": 60, "C": 40},
    "defaultPostingHours": ["08:00-11:30", "13:30-21:00"],
    "workingDays": [1, 2, 3, 4, 5, 6],
    "manualPostingOnly": true,
    "storeFacebookCredentials": false
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;
