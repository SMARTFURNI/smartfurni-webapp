CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL DEFAULT 'railway',
  visibility TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  original_name TEXT,
  entity_type TEXT,
  entity_id TEXT,
  created_by TEXT,
  expires_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_assets_entity
  ON media_assets(entity_type, entity_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_media_assets_expiry
  ON media_assets(expires_at)
  WHERE expires_at IS NOT NULL AND deleted_at IS NULL;
