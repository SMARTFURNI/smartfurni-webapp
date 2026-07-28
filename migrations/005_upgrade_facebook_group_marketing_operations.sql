-- Facebook Group Marketing operational integrations
-- Adds idempotent Messenger ingestion and order/revenue attribution.
-- This migration does not store Facebook credentials, cookies, or passwords.

CREATE TABLE IF NOT EXISTS facebook_group_messenger_events (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL UNIQUE,
  conversation_id TEXT NOT NULL,
  participant_id TEXT,
  participant_name TEXT,
  page_facebook_id TEXT NOT NULL,
  message_text TEXT NOT NULL,
  source_code TEXT NOT NULL,
  lead_id TEXT,
  attribution_id TEXT REFERENCES facebook_group_lead_attributions(id),
  status TEXT NOT NULL DEFAULT 'matched',
  error TEXT,
  message_created_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fbg_messenger_conversation
  ON facebook_group_messenger_events(conversation_id, message_created_at);
CREATE INDEX IF NOT EXISTS idx_fbg_messenger_lead
  ON facebook_group_messenger_events(lead_id, processed_at);
CREATE INDEX IF NOT EXISTS idx_fbg_messenger_source
  ON facebook_group_messenger_events(source_code, processed_at);

CREATE TABLE IF NOT EXISTS facebook_group_revenue_events (
  id TEXT PRIMARY KEY,
  attribution_id TEXT NOT NULL REFERENCES facebook_group_lead_attributions(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  quote_id TEXT,
  order_id TEXT,
  revenue NUMERIC(16,2) NOT NULL DEFAULT 0,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_fbg_revenue_order
  ON facebook_group_revenue_events(order_id)
  WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fbg_revenue_attribution
  ON facebook_group_revenue_events(attribution_id, updated_at);

ALTER TABLE facebook_group_lead_attributions
  ADD COLUMN IF NOT EXISTS conversation_id TEXT,
  ADD COLUMN IF NOT EXISTS message_id TEXT,
  ADD COLUMN IF NOT EXISTS messenger_participant_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_fbg_attribution_message
  ON facebook_group_lead_attributions(message_id)
  WHERE message_id IS NOT NULL;

