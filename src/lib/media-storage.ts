import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { query } from "@/lib/db";

export type MediaVisibility = "public" | "private" | "temporary";

export interface StoredMediaObject {
  key: string;
  url: string;
  provider: "railway";
  size: number;
  contentType: string;
}

export interface StoreMediaObjectInput {
  body: Buffer | Uint8Array;
  key: string;
  contentType: string;
  visibility: MediaVisibility;
  cacheControl?: string;
  originalName?: string;
  entityType?: string;
  entityId?: string;
  createdBy?: string;
  expiresAt?: Date;
}

type BucketConfig = {
  bucket: string;
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

let client: S3Client | null = null;
let schemaReady: Promise<void> | null = null;
let lastAutomaticCleanupAt = 0;

function env(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

export function getRailwayBucketConfig(): BucketConfig | null {
  const bucket = env("RAILWAY_MEDIA_BUCKET", "BUCKET");
  const endpoint = env("RAILWAY_MEDIA_ENDPOINT", "ENDPOINT");
  const region = env("RAILWAY_MEDIA_REGION", "REGION") || "auto";
  const accessKeyId = env("RAILWAY_MEDIA_ACCESS_KEY_ID", "ACCESS_KEY_ID");
  const secretAccessKey = env("RAILWAY_MEDIA_SECRET_ACCESS_KEY", "SECRET_ACCESS_KEY");
  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) return null;
  return {
    bucket,
    endpoint,
    region,
    accessKeyId,
    secretAccessKey,
    forcePathStyle: env("RAILWAY_MEDIA_FORCE_PATH_STYLE").toLowerCase() === "true",
  };
}

export function isRailwayBucketConfigured(): boolean {
  return Boolean(getRailwayBucketConfig());
}

function getClient(): { client: S3Client; config: BucketConfig } {
  const config = getRailwayBucketConfig();
  if (!config) {
    throw new Error(
      "Railway Bucket chưa được cấu hình. Cần BUCKET, ENDPOINT, REGION, ACCESS_KEY_ID và SECRET_ACCESS_KEY.",
    );
  }
  if (!client) {
    client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }
  return { client, config };
}

export function sanitizeMediaSegment(value: string, fallback = "file"): string {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return normalized || fallback;
}

export function normalizeMediaKey(key: string): string {
  const normalized = key
    .split("/")
    .filter(Boolean)
    .map((segment) => sanitizeMediaSegment(segment))
    .join("/");
  if (!normalized || normalized.includes("..")) throw new Error("Media key không hợp lệ");
  return normalized;
}

export function buildMediaUrl(key: string): string {
  return `/api/media/${normalizeMediaKey(key).split("/").map(encodeURIComponent).join("/")}`;
}

export function mediaKeyFromUrl(url: string): string | null {
  const marker = "/api/media/";
  const index = url.indexOf(marker);
  if (index < 0) return null;
  const raw = url.slice(index + marker.length).split(/[?#]/, 1)[0];
  try {
    return normalizeMediaKey(raw.split("/").map(decodeURIComponent).join("/"));
  } catch {
    return null;
  }
}

async function ensureMediaSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = query(`
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
        retained BOOLEAN NOT NULL DEFAULT FALSE,
        retained_at TIMESTAMPTZ,
        retained_by TEXT,
        deleted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS retained BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS retained_at TIMESTAMPTZ;
      ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS retained_by TEXT;
      CREATE INDEX IF NOT EXISTS idx_media_assets_entity
        ON media_assets(entity_type, entity_id)
        WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_media_assets_expiry
        ON media_assets(expires_at)
        WHERE expires_at IS NOT NULL AND deleted_at IS NULL;
    `).then(() => undefined).catch((error) => {
      schemaReady = null;
      console.error("[media-storage] Không tạo được bảng media_assets:", error);
    });
  }
  await schemaReady;
}

async function saveMetadata(input: StoreMediaObjectInput, key: string, size: number): Promise<void> {
  try {
    await ensureMediaSchema();
    await query(
      `INSERT INTO media_assets
       (id, object_key, provider, visibility, content_type, size_bytes, original_name,
        entity_type, entity_id, created_by, expires_at, deleted_at, updated_at)
       VALUES ($1,$2,'railway',$3,$4,$5,$6,$7,$8,$9,$10,NULL,NOW())
       ON CONFLICT (object_key) DO UPDATE SET
         visibility = EXCLUDED.visibility,
         content_type = EXCLUDED.content_type,
         size_bytes = EXCLUDED.size_bytes,
         original_name = EXCLUDED.original_name,
         entity_type = EXCLUDED.entity_type,
         entity_id = EXCLUDED.entity_id,
         created_by = EXCLUDED.created_by,
         expires_at = EXCLUDED.expires_at,
         deleted_at = NULL,
         updated_at = NOW()`,
      [
        crypto.randomUUID(),
        key,
        input.visibility,
        input.contentType,
        size,
        input.originalName || null,
        input.entityType || null,
        input.entityId || null,
        input.createdBy || null,
        input.expiresAt || null,
      ],
    );
  } catch (error) {
    // Upload vẫn hợp lệ nếu bảng metadata tạm thời không ghi được.
    console.error("[media-storage] Không lưu được metadata:", error);
  }
}

export async function storeMediaObject(input: StoreMediaObjectInput): Promise<StoredMediaObject> {
  const { client: s3, config } = getClient();
  const key = normalizeMediaKey(input.key);
  const size = input.body.byteLength;
  await s3.send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: input.body,
    ContentType: input.contentType,
    CacheControl: input.cacheControl || (
      input.visibility === "public"
        ? "public, max-age=31536000, immutable"
        : "private, no-store"
    ),
    Metadata: {
      visibility: input.visibility,
      ...(input.entityType ? { entitytype: sanitizeMediaSegment(input.entityType) } : {}),
      ...(input.entityId ? { entityid: sanitizeMediaSegment(input.entityId) } : {}),
    },
  }));
  await saveMetadata(input, key, size);
  scheduleExpiredMediaCleanup();
  return {
    key,
    url: buildMediaUrl(key),
    provider: "railway",
    size,
    contentType: input.contentType,
  };
}

export async function getMediaObject(key: string, range?: string) {
  const { client: s3, config } = getClient();
  return s3.send(new GetObjectCommand({
    Bucket: config.bucket,
    Key: normalizeMediaKey(key),
    ...(range ? { Range: range } : {}),
  }));
}

export async function headMediaObject(key: string) {
  const { client: s3, config } = getClient();
  return s3.send(new HeadObjectCommand({
    Bucket: config.bucket,
    Key: normalizeMediaKey(key),
  }));
}

export async function deleteMediaObject(key: string): Promise<void> {
  const normalized = normalizeMediaKey(key);
  const { client: s3, config } = getClient();
  await s3.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: normalized }));
  try {
    await ensureMediaSchema();
    await query(
      "UPDATE media_assets SET deleted_at = NOW(), updated_at = NOW() WHERE object_key = $1",
      [normalized],
    );
  } catch (error) {
    console.error("[media-storage] Không cập nhật được metadata xóa:", error);
  }
}

export async function cleanupExpiredMediaObjects(limit = 100): Promise<{
  checked: number;
  deleted: number;
  failed: number;
}> {
  if (!isRailwayBucketConfigured()) return { checked: 0, deleted: 0, failed: 0 };
  await ensureMediaSchema();
  const rows = await query<{ object_key: string }>(
    `SELECT object_key FROM media_assets
     WHERE expires_at IS NOT NULL AND expires_at <= NOW()
       AND retained = FALSE AND deleted_at IS NULL
     ORDER BY expires_at ASC LIMIT $1`,
    [Math.min(Math.max(limit, 1), 500)],
  );
  let deleted = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await deleteMediaObject(row.object_key);
      deleted += 1;
    } catch (error) {
      failed += 1;
      console.error(`[media-storage] Không xóa được ${row.object_key}:`, error);
    }
  }
  return { checked: rows.length, deleted, failed };
}

/**
 * Dọn media hết hạn theo kiểu best-effort, tối đa một lần mỗi process/ngày.
 * Việc dọn không nằm trên đường phản hồi upload nên không làm chậm người dùng.
 */
export function scheduleExpiredMediaCleanup(): void {
  const now = Date.now();
  if (now - lastAutomaticCleanupAt < 24 * 60 * 60 * 1000) return;
  lastAutomaticCleanupAt = now;
  setTimeout(() => {
    void cleanupExpiredMediaObjects(250).catch((error) => {
      console.error("[media-storage] Dọn media tự động thất bại:", error);
      // Cho phép lần upload sau thử lại thay vì chờ đủ một ngày.
      lastAutomaticCleanupAt = 0;
    });
  }, 0);
}

export async function setMediaRetained(
  key: string,
  retained: boolean,
  actor?: string,
): Promise<void> {
  await ensureMediaSchema();
  await query(
    `UPDATE media_assets SET
       retained = $2,
       retained_at = CASE WHEN $2 THEN NOW() ELSE NULL END,
       retained_by = CASE WHEN $2 THEN $3 ELSE NULL END,
       updated_at = NOW()
     WHERE object_key = $1 AND deleted_at IS NULL`,
    [normalizeMediaKey(key), retained, actor || null],
  );
}

export function isPublicMediaKey(key: string): boolean {
  return normalizeMediaKey(key).startsWith("public/");
}
