-- Migration: Create AI Google Ads Agent Tables
-- Date: 2026-06-23
-- Description: Product ads catalog, AI campaign drafts, approval logs, Google Ads accounts and performance

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Existing app already has a generic products table. This dedicated table avoids breaking it.
CREATE TABLE IF NOT EXISTS google_ads_products (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  sku VARCHAR(100) UNIQUE,
  name VARCHAR(500),
  product_line VARCHAR(100),
  price NUMERIC(14, 2) DEFAULT 0,
  size TEXT,
  material TEXT,
  usp JSONB DEFAULT '[]'::jsonb,
  target_customers JSONB DEFAULT '[]'::jsonb,
  landing_page_url TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ad_campaign_drafts (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  product_sku VARCHAR(100),
  campaign_name VARCHAR(500),
  objective VARCHAR(100),
  location VARCHAR(100),
  daily_budget NUMERIC(14, 2),
  target_cpa NUMERIC(14, 2),
  ai_output JSONB DEFAULT '{}'::jsonb,
  validation_errors JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(50) DEFAULT 'ai_created',
  google_campaign_id VARCHAR(255),
  created_by VARCHAR(255),
  approved_by VARCHAR(255),
  rejected_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ad_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draft_id TEXT REFERENCES ad_campaign_drafts(id) ON DELETE CASCADE,
  name VARCHAR(500) NOT NULL,
  product_sku VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ad_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draft_id TEXT REFERENCES ad_campaign_drafts(id) ON DELETE CASCADE,
  asset_type VARCHAR(50) NOT NULL,
  text TEXT NOT NULL,
  url TEXT,
  values JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draft_id TEXT REFERENCES ad_campaign_drafts(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  match_type VARCHAR(50) NOT NULL,
  intent VARCHAR(50),
  negative BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS google_ads_accounts (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  customer_id VARCHAR(100) UNIQUE,
  encrypted_refresh_token TEXT,
  status VARCHAR(50) DEFAULT 'not_connected',
  connected_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ad_performance_daily (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  date DATE,
  campaign_name VARCHAR(500),
  ad_group_name VARCHAR(500),
  product_sku VARCHAR(100),
  cost NUMERIC(14, 2) DEFAULT 0,
  clicks INT DEFAULT 0,
  impressions INT DEFAULT 0,
  conversions NUMERIC(12, 2) DEFAULT 0,
  ctr NUMERIC(8, 4) DEFAULT 0,
  cpc NUMERIC(14, 2) DEFAULT 0,
  cpa NUMERIC(14, 2) DEFAULT 0,
  roas NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, campaign_name, ad_group_name)
);

CREATE TABLE IF NOT EXISTS approval_logs (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  draft_id TEXT REFERENCES ad_campaign_drafts(id) ON DELETE CASCADE,
  status VARCHAR(50),
  reason TEXT,
  actor VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_google_ads_products_sku ON google_ads_products(sku);
CREATE INDEX IF NOT EXISTS idx_ad_campaign_drafts_status ON ad_campaign_drafts(status);
CREATE INDEX IF NOT EXISTS idx_ad_campaign_drafts_product ON ad_campaign_drafts(product_sku);
CREATE INDEX IF NOT EXISTS idx_keywords_draft_negative ON keywords(draft_id, negative);
CREATE INDEX IF NOT EXISTS idx_ad_performance_daily_date ON ad_performance_daily(date DESC);
