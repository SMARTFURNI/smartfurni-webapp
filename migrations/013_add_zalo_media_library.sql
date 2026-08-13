CREATE TABLE IF NOT EXISTS zalo_media_folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS zalo_media_library (
  id TEXT PRIMARY KEY,
  folder_id TEXT REFERENCES zalo_media_folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  media_kind TEXT NOT NULL CHECK (media_kind IN ('image', 'video', 'file')),
  size_bytes BIGINT NOT NULL DEFAULT 0,
  width INTEGER,
  height INTEGER,
  duration_ms BIGINT,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_zalo_media_library_folder
  ON zalo_media_library(folder_id, created_at DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_zalo_media_library_kind
  ON zalo_media_library(media_kind, created_at DESC)
  WHERE archived_at IS NULL;
