import "server-only";

import { query, queryOne } from "@/lib/db";
import { buildMediaUrl } from "@/lib/media-storage";
import type { ZaloMediaKind } from "@/lib/zalo-media-policy";

export interface ZaloMediaFolder {
  id: string;
  name: string;
  sortOrder: number;
  assetCount: number;
  createdAt: string;
}

export interface ZaloMediaAsset {
  id: string;
  folderId: string | null;
  name: string;
  objectKey: string;
  url: string;
  contentType: string;
  mediaKind: ZaloMediaKind;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  usageCount: number;
  createdAt: string;
}

type FolderRow = {
  id: string;
  name: string;
  sort_order: number;
  asset_count: string | number;
  created_at: Date | string;
};

type AssetRow = {
  id: string;
  folder_id: string | null;
  name: string;
  object_key: string;
  content_type: string;
  media_kind: ZaloMediaKind;
  size_bytes: string | number;
  width: number | null;
  height: number | null;
  duration_ms: string | number | null;
  usage_count: number;
  created_at: Date | string;
};

let schemaReady: Promise<void> | null = null;

export function ensureZaloMediaLibrarySchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = query(`
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
        ON zalo_media_library(folder_id, created_at DESC) WHERE archived_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_zalo_media_library_kind
        ON zalo_media_library(media_kind, created_at DESC) WHERE archived_at IS NULL;
    `).then(() => undefined).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

function folderDto(row: FolderRow): ZaloMediaFolder {
  return {
    id: row.id,
    name: row.name,
    sortOrder: Number(row.sort_order || 0),
    assetCount: Number(row.asset_count || 0),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function assetDto(row: AssetRow): ZaloMediaAsset {
  return {
    id: row.id,
    folderId: row.folder_id,
    name: row.name,
    objectKey: row.object_key,
    url: buildMediaUrl(row.object_key),
    contentType: row.content_type,
    mediaKind: row.media_kind,
    sizeBytes: Number(row.size_bytes || 0),
    width: row.width,
    height: row.height,
    durationMs: row.duration_ms == null ? null : Number(row.duration_ms),
    usageCount: Number(row.usage_count || 0),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function listZaloMediaFolders(): Promise<ZaloMediaFolder[]> {
  await ensureZaloMediaLibrarySchema();
  const rows = await query<FolderRow>(`
    SELECT f.id, f.name, f.sort_order, f.created_at, COUNT(a.id) AS asset_count
    FROM zalo_media_folders f
    LEFT JOIN zalo_media_library a ON a.folder_id = f.id AND a.archived_at IS NULL
    GROUP BY f.id
    ORDER BY f.sort_order ASC, LOWER(f.name) ASC
  `);
  return rows.map(folderDto);
}

export async function listZaloMediaAssets(input: {
  folderId?: string | null;
  unfiled?: boolean;
  kind?: ZaloMediaKind | "all";
  search?: string;
  limit?: number;
}): Promise<ZaloMediaAsset[]> {
  await ensureZaloMediaLibrarySchema();
  const conditions = ["archived_at IS NULL"];
  const params: unknown[] = [];
  if (input.unfiled) conditions.push("folder_id IS NULL");
  else if (input.folderId) {
    params.push(input.folderId);
    conditions.push(`folder_id = $${params.length}`);
  }
  if (input.kind && input.kind !== "all") {
    params.push(input.kind);
    conditions.push(`media_kind = $${params.length}`);
  }
  if (input.search?.trim()) {
    params.push(`%${input.search.trim()}%`);
    conditions.push(`name ILIKE $${params.length}`);
  }
  params.push(Math.min(Math.max(input.limit || 200, 1), 500));
  const rows = await query<AssetRow>(`
    SELECT * FROM zalo_media_library
    WHERE ${conditions.join(" AND ")}
    ORDER BY created_at DESC
    LIMIT $${params.length}
  `, params);
  return rows.map(assetDto);
}

export async function getZaloMediaAsset(id: string): Promise<ZaloMediaAsset | null> {
  await ensureZaloMediaLibrarySchema();
  const row = await queryOne<AssetRow>(
    "SELECT * FROM zalo_media_library WHERE id = $1 AND archived_at IS NULL",
    [id],
  );
  return row ? assetDto(row) : null;
}

export async function getZaloMediaAssets(ids: string[]): Promise<ZaloMediaAsset[]> {
  await ensureZaloMediaLibrarySchema();
  if (!ids.length) return [];
  const rows = await query<AssetRow>(
    "SELECT * FROM zalo_media_library WHERE id = ANY($1::text[]) AND archived_at IS NULL",
    [ids],
  );
  const byId = new Map(rows.map(row => [row.id, assetDto(row)]));
  return ids.map(id => byId.get(id)).filter((asset): asset is ZaloMediaAsset => Boolean(asset));
}

export async function createZaloMediaFolder(name: string, actor?: string): Promise<ZaloMediaFolder> {
  await ensureZaloMediaLibrarySchema();
  const row = await queryOne<FolderRow>(`
    INSERT INTO zalo_media_folders (id, name, sort_order, created_by)
    VALUES ($1, $2, COALESCE((SELECT MAX(sort_order) + 1 FROM zalo_media_folders), 0), $3)
    RETURNING id, name, sort_order, created_at, 0 AS asset_count
  `, [crypto.randomUUID(), name.trim(), actor || null]);
  if (!row) throw new Error("Không thể tạo thư mục");
  return folderDto(row);
}

export async function renameZaloMediaFolder(id: string, name: string): Promise<void> {
  await ensureZaloMediaLibrarySchema();
  await query("UPDATE zalo_media_folders SET name = $2, updated_at = NOW() WHERE id = $1", [id, name.trim()]);
}

export async function deleteZaloMediaFolder(id: string): Promise<void> {
  await ensureZaloMediaLibrarySchema();
  await query("DELETE FROM zalo_media_folders WHERE id = $1", [id]);
}

export async function createZaloMediaAsset(input: {
  id?: string;
  folderId?: string | null;
  name: string;
  objectKey: string;
  contentType: string;
  mediaKind: ZaloMediaKind;
  sizeBytes: number;
  width?: number;
  height?: number;
  durationMs?: number;
  actor?: string;
}): Promise<ZaloMediaAsset> {
  await ensureZaloMediaLibrarySchema();
  const row = await queryOne<AssetRow>(`
    INSERT INTO zalo_media_library
      (id, folder_id, name, object_key, content_type, media_kind, size_bytes,
       width, height, duration_ms, created_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING *
  `, [
    input.id || crypto.randomUUID(), input.folderId || null, input.name.trim(), input.objectKey,
    input.contentType, input.mediaKind, input.sizeBytes, input.width || null,
    input.height || null, input.durationMs || null, input.actor || null,
  ]);
  if (!row) throw new Error("Không thể lưu tài liệu vào thư viện");
  return assetDto(row);
}

export async function updateZaloMediaAsset(input: {
  id: string;
  name?: string;
  folderId?: string | null;
}): Promise<void> {
  await ensureZaloMediaLibrarySchema();
  if (input.folderId === undefined) {
    await query(`
      UPDATE zalo_media_library SET
        name = COALESCE($2, name),
        updated_at = NOW()
      WHERE id = $1 AND archived_at IS NULL
    `, [input.id, input.name?.trim() || null]);
    return;
  }
  await query(`
    UPDATE zalo_media_library SET
      name = COALESCE($2, name),
      folder_id = $3,
      updated_at = NOW()
    WHERE id = $1 AND archived_at IS NULL
  `, [input.id, input.name?.trim() || null, input.folderId]);
}

export async function getZaloMediaLibraryCounts(): Promise<{ total: number; unfiled: number }> {
  await ensureZaloMediaLibrarySchema();
  const row = await queryOne<{ total: string; unfiled: string }>(`
    SELECT
      COUNT(*)::text AS total,
      COUNT(*) FILTER (WHERE folder_id IS NULL)::text AS unfiled
    FROM zalo_media_library
    WHERE archived_at IS NULL
  `);
  return { total: Number(row?.total || 0), unfiled: Number(row?.unfiled || 0) };
}

export async function archiveZaloMediaAsset(id: string): Promise<ZaloMediaAsset | null> {
  await ensureZaloMediaLibrarySchema();
  const row = await queryOne<AssetRow>(`
    UPDATE zalo_media_library SET archived_at = NOW(), updated_at = NOW()
    WHERE id = $1 AND archived_at IS NULL RETURNING *
  `, [id]);
  return row ? assetDto(row) : null;
}

export async function incrementZaloMediaUsage(ids: string[]): Promise<void> {
  await ensureZaloMediaLibrarySchema();
  if (!ids.length) return;
  await query(`
    UPDATE zalo_media_library
    SET usage_count = usage_count + 1, updated_at = NOW()
    WHERE id = ANY($1::text[]) AND archived_at IS NULL
  `, [ids]);
}
