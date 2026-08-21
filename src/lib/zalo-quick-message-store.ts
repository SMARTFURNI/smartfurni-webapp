import "server-only";

import { query, queryOne } from "@/lib/db";
import { getZaloMediaAssets, type ZaloMediaAsset } from "@/lib/zalo-media-library-store";

export interface ZaloQuickMessage {
  id: string;
  title: string;
  category: string;
  content: string;
  messageParts: string[];
  mediaAssetIds: string[];
  mediaAssets: ZaloMediaAsset[];
  usageCount: number;
  lastUsedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

type QuickMessageRow = {
  id: string;
  title: string;
  category: string;
  content: string;
  message_parts: unknown;
  media_asset_ids: unknown;
  usage_count: string | number;
  last_used_at: Date | string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

let schemaReady: Promise<void> | null = null;

export function ensureZaloQuickMessageSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = query(`
      CREATE TABLE IF NOT EXISTS zalo_quick_messages (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'Tư vấn',
        content TEXT NOT NULL DEFAULT '',
        message_parts JSONB NOT NULL DEFAULT '[]'::jsonb,
        media_asset_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
        usage_count INTEGER NOT NULL DEFAULT 0,
        last_used_at TIMESTAMPTZ,
        created_by TEXT,
        updated_by TEXT,
        archived_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE zalo_quick_messages
        ADD COLUMN IF NOT EXISTS message_parts JSONB NOT NULL DEFAULT '[]'::jsonb;
      UPDATE zalo_quick_messages
        SET message_parts = jsonb_build_array(content)
        WHERE message_parts = '[]'::jsonb AND BTRIM(content) <> '';
      CREATE INDEX IF NOT EXISTS idx_zalo_quick_messages_active
        ON zalo_quick_messages(updated_at DESC) WHERE archived_at IS NULL;
    `).then(() => undefined).catch(error => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

function normalizeAssetIds(value: unknown): string[] {
  let parsed = value;
  if (typeof value === "string") {
    try { parsed = JSON.parse(value); } catch { parsed = []; }
  }
  if (!Array.isArray(parsed)) return [];
  return [...new Set(parsed.map(item => String(item || "").trim()).filter(Boolean))].slice(0, 10);
}

function normalizeMessageParts(value: unknown, legacyContent = ""): string[] {
  let parsed = value;
  if (typeof value === "string") {
    try { parsed = JSON.parse(value); } catch { parsed = []; }
  }
  const parts = Array.isArray(parsed)
    ? parsed.map(item => String(item || "").trim().slice(0, 4000)).filter(Boolean)
    : [];
  if (parts.length) return parts.slice(0, 20);
  const legacy = String(legacyContent || "").trim().slice(0, 4000);
  return legacy ? [legacy] : [];
}

function normalizeInput(input: {
  title?: string;
  category?: string;
  content?: string;
  messageParts?: string[];
  mediaAssetIds?: string[];
}) {
  const title = String(input.title || "").trim().slice(0, 120);
  const category = String(input.category || "Tư vấn").trim().slice(0, 60) || "Tư vấn";
  const messageParts = normalizeMessageParts(input.messageParts, input.content);
  const content = messageParts.join("\n");
  const mediaAssetIds = normalizeAssetIds(input.mediaAssetIds);
  if (!title) throw new Error("Vui lòng nhập tên mẫu tin nhắn");
  if (!messageParts.length && mediaAssetIds.length === 0) throw new Error("Mẫu cần có nội dung hoặc ảnh/video");
  return { title, category, content, messageParts, mediaAssetIds };
}

async function hydrateRows(rows: QuickMessageRow[]): Promise<ZaloQuickMessage[]> {
  const assetIds = [...new Set(rows.flatMap(row => normalizeAssetIds(row.media_asset_ids)))];
  const assets = await getZaloMediaAssets(assetIds);
  const assetsById = new Map(assets.map(asset => [asset.id, asset]));
  return rows.map(row => {
    const mediaAssetIds = normalizeAssetIds(row.media_asset_ids);
    const messageParts = normalizeMessageParts(row.message_parts, row.content);
    return {
      id: row.id,
      title: row.title,
      category: row.category,
      content: row.content,
      messageParts,
      mediaAssetIds,
      mediaAssets: mediaAssetIds.map(id => assetsById.get(id)).filter((asset): asset is ZaloMediaAsset => Boolean(asset)),
      usageCount: Number(row.usage_count || 0),
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at).toISOString() : null,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  });
}

export async function listZaloQuickMessages(input: { search?: string; limit?: number } = {}): Promise<ZaloQuickMessage[]> {
  await ensureZaloQuickMessageSchema();
  const params: unknown[] = [];
  let searchSql = "";
  if (input.search?.trim()) {
    params.push(`%${input.search.trim()}%`);
    searchSql = `AND (title ILIKE $${params.length} OR content ILIKE $${params.length} OR category ILIKE $${params.length})`;
  }
  params.push(Math.min(Math.max(input.limit || 200, 1), 500));
  const rows = await query<QuickMessageRow>(`
    SELECT * FROM zalo_quick_messages
    WHERE archived_at IS NULL ${searchSql}
    ORDER BY COALESCE(last_used_at, updated_at) DESC, LOWER(title) ASC
    LIMIT $${params.length}
  `, params);
  return hydrateRows(rows);
}

export async function getZaloQuickMessage(id: string): Promise<ZaloQuickMessage | null> {
  await ensureZaloQuickMessageSchema();
  const row = await queryOne<QuickMessageRow>(
    "SELECT * FROM zalo_quick_messages WHERE id = $1 AND archived_at IS NULL",
    [id],
  );
  if (!row) return null;
  return (await hydrateRows([row]))[0] || null;
}

export async function createZaloQuickMessage(input: {
  title?: string;
  category?: string;
  content?: string;
  messageParts?: string[];
  mediaAssetIds?: string[];
  actor?: string;
}): Promise<ZaloQuickMessage> {
  await ensureZaloQuickMessageSchema();
  const value = normalizeInput(input);
  const row = await queryOne<QuickMessageRow>(`
    INSERT INTO zalo_quick_messages
      (id, title, category, content, message_parts, media_asset_ids, created_by, updated_by)
    VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$7)
    RETURNING *
  `, [crypto.randomUUID(), value.title, value.category, value.content, JSON.stringify(value.messageParts), JSON.stringify(value.mediaAssetIds), input.actor || null]);
  if (!row) throw new Error("Không thể lưu mẫu tin nhắn");
  return (await hydrateRows([row]))[0];
}

export async function updateZaloQuickMessage(input: {
  id: string;
  title?: string;
  category?: string;
  content?: string;
  messageParts?: string[];
  mediaAssetIds?: string[];
  actor?: string;
}): Promise<ZaloQuickMessage | null> {
  await ensureZaloQuickMessageSchema();
  const value = normalizeInput(input);
  const row = await queryOne<QuickMessageRow>(`
    UPDATE zalo_quick_messages SET
      title = $2, category = $3, content = $4, message_parts = $5::jsonb,
      media_asset_ids = $6::jsonb, updated_by = $7, updated_at = NOW()
    WHERE id = $1 AND archived_at IS NULL
    RETURNING *
  `, [input.id, value.title, value.category, value.content, JSON.stringify(value.messageParts), JSON.stringify(value.mediaAssetIds), input.actor || null]);
  if (!row) return null;
  return (await hydrateRows([row]))[0];
}

export async function archiveZaloQuickMessage(id: string): Promise<boolean> {
  await ensureZaloQuickMessageSchema();
  const rows = await query<{ id: string }>(`
    UPDATE zalo_quick_messages SET archived_at = NOW(), updated_at = NOW()
    WHERE id = $1 AND archived_at IS NULL RETURNING id
  `, [id]);
  return rows.length > 0;
}

export async function markZaloQuickMessageUsed(id: string): Promise<void> {
  await ensureZaloQuickMessageSchema();
  await query(`
    UPDATE zalo_quick_messages
    SET usage_count = usage_count + 1, last_used_at = NOW(), updated_at = NOW()
    WHERE id = $1 AND archived_at IS NULL
  `, [id]);
}
