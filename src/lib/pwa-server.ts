import "server-only";

import { randomUUID } from "crypto";
import webpush, { type PushSubscription } from "web-push";
import { query, queryOne } from "@/lib/db";

export type PwaOwnerScope = "smart-bed" | "admin" | "crm";

export interface FirmwareRelease {
  id: string;
  profileId: string;
  version: string;
  packageUrl: string;
  sha256: string;
  notes: string;
  mandatory: boolean;
  releasedAt: string;
}

let pwaTablesPromise: Promise<void> | null = null;

export async function ensurePwaTables() {
  if (pwaTablesPromise) return pwaTablesPromise;
  pwaTablesPromise = (async () => {
    await query(`
      CREATE TABLE IF NOT EXISTS pwa_config (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS pwa_push_subscriptions (
        id TEXT PRIMARY KEY,
        owner_scope TEXT NOT NULL,
        owner_id TEXT NOT NULL,
        endpoint TEXT UNIQUE NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        user_agent TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_pwa_push_owner ON pwa_push_subscriptions(owner_scope, owner_id)`);
    await query(`
      CREATE TABLE IF NOT EXISTS smart_bed_firmware_releases (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        version TEXT NOT NULL,
        package_url TEXT NOT NULL,
        sha256 TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        mandatory BOOLEAN NOT NULL DEFAULT FALSE,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        released_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(profile_id, version)
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_firmware_profile ON smart_bed_firmware_releases(profile_id, active, released_at DESC)`);
  })().catch((error) => {
    pwaTablesPromise = null;
    throw error;
  });
  return pwaTablesPromise;
}

async function getOrCreateVapidKeys() {
  await ensurePwaTables();
  const configuredPublic = process.env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim();
  const configuredPrivate = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim();
  if (configuredPublic && configuredPrivate) {
    return { publicKey: configuredPublic, privateKey: configuredPrivate };
  }

  const existing = await queryOne<{ value: { publicKey?: string; privateKey?: string } }>(
    `SELECT value FROM pwa_config WHERE key = 'web_push_vapid'`,
  );
  if (existing?.value.publicKey && existing.value.privateKey) {
    return { publicKey: existing.value.publicKey, privateKey: existing.value.privateKey };
  }

  const generated = webpush.generateVAPIDKeys();
  await query(
    `INSERT INTO pwa_config (key, value)
     VALUES ('web_push_vapid', $1::jsonb)
     ON CONFLICT (key) DO NOTHING`,
    [JSON.stringify(generated)],
  );
  const saved = await queryOne<{ value: { publicKey: string; privateKey: string } }>(
    `SELECT value FROM pwa_config WHERE key = 'web_push_vapid'`,
  );
  if (!saved) throw new Error("Không thể khởi tạo khóa Web Push.");
  return saved.value;
}

export async function getWebPushPublicKey() {
  return (await getOrCreateVapidKeys()).publicKey;
}

export async function savePushSubscription(input: {
  ownerScope: PwaOwnerScope;
  ownerId: string;
  subscription: PushSubscription;
  userAgent?: string;
}) {
  await ensurePwaTables();
  const { endpoint, keys } = input.subscription;
  if (!endpoint || !keys?.p256dh || !keys.auth) throw new Error("Subscription Web Push chưa hợp lệ.");
  await query(
    `INSERT INTO pwa_push_subscriptions
       (id, owner_scope, owner_id, endpoint, p256dh, auth, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (endpoint) DO UPDATE SET
       owner_scope = EXCLUDED.owner_scope,
       owner_id = EXCLUDED.owner_id,
       p256dh = EXCLUDED.p256dh,
       auth = EXCLUDED.auth,
       user_agent = EXCLUDED.user_agent,
       updated_at = NOW()`,
    [
      `pws_${randomUUID()}`,
      input.ownerScope,
      input.ownerId.slice(0, 160),
      endpoint.slice(0, 2500),
      keys.p256dh.slice(0, 500),
      keys.auth.slice(0, 500),
      (input.userAgent || "").slice(0, 500),
    ],
  );
}

export async function deletePushSubscription(endpoint: string) {
  await ensurePwaTables();
  await query(`DELETE FROM pwa_push_subscriptions WHERE endpoint = $1`, [endpoint]);
}

export async function sendPushNotification(input: {
  ownerScope?: PwaOwnerScope;
  ownerId?: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}) {
  await ensurePwaTables();
  const keys = await getOrCreateVapidKeys();
  webpush.setVapidDetails(
    process.env.WEB_PUSH_CONTACT || "mailto:info@smartfurni.com.vn",
    keys.publicKey,
    keys.privateKey,
  );

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (input.ownerScope) {
    params.push(input.ownerScope);
    conditions.push(`owner_scope = $${params.length}`);
  }
  if (input.ownerId) {
    params.push(input.ownerId);
    conditions.push(`owner_id = $${params.length}`);
  }
  const rows = await query<{ id: string; endpoint: string; p256dh: string; auth: string }>(
    `SELECT id, endpoint, p256dh, auth FROM pwa_push_subscriptions${conditions.length ? ` WHERE ${conditions.join(" AND ")}` : ""}`,
    params,
  );

  const payload = JSON.stringify({
    title: input.title.slice(0, 120),
    body: input.body.slice(0, 300),
    url: input.url || "/",
    tag: input.tag || "smartfurni-update",
    data: input.data || {},
  });
  let sent = 0;
  let removed = 0;
  await Promise.all(rows.map(async (row) => {
    try {
      await webpush.sendNotification({
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      }, payload, { TTL: 6 * 60 * 60, urgency: "normal" });
      sent += 1;
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await query(`DELETE FROM pwa_push_subscriptions WHERE id = $1`, [row.id]);
        removed += 1;
      }
    }
  }));
  return { matched: rows.length, sent, removed };
}

export async function getLatestFirmwareRelease(profileId: string): Promise<FirmwareRelease | null> {
  await ensurePwaTables();
  return queryOne<FirmwareRelease>(
    `SELECT id,
            profile_id AS "profileId",
            version,
            package_url AS "packageUrl",
            sha256,
            notes,
            mandatory,
            released_at::text AS "releasedAt"
     FROM smart_bed_firmware_releases
     WHERE active = TRUE AND (profile_id = $1 OR profile_id = '*')
     ORDER BY CASE WHEN profile_id = $1 THEN 0 ELSE 1 END, released_at DESC
     LIMIT 1`,
    [profileId.slice(0, 80)],
  );
}

export function isFirmwareVersionNewer(candidate: string, current: string) {
  if (!current.trim()) return true;
  if (candidate.trim() === current.trim()) return false;
  const candidateNumbers = candidate.match(/\d+/g)?.map(Number) || [];
  const currentNumbers = current.match(/\d+/g)?.map(Number) || [];
  if (!candidateNumbers.length || !currentNumbers.length) return true;
  const length = Math.max(candidateNumbers.length, currentNumbers.length);
  for (let index = 0; index < length; index += 1) {
    const next = candidateNumbers[index] || 0;
    const installed = currentNumbers[index] || 0;
    if (next !== installed) return next > installed;
  }
  return false;
}

export async function listFirmwareReleases() {
  await ensurePwaTables();
  return query<FirmwareRelease & { active: boolean }>(
    `SELECT id, profile_id AS "profileId", version, package_url AS "packageUrl", sha256,
            notes, mandatory, active, released_at::text AS "releasedAt"
     FROM smart_bed_firmware_releases ORDER BY released_at DESC`,
  );
}

export async function createFirmwareRelease(input: {
  profileId: string;
  version: string;
  packageUrl: string;
  sha256?: string;
  notes?: string;
  mandatory?: boolean;
}) {
  await ensurePwaTables();
  const profileId = input.profileId.trim().slice(0, 80);
  const version = input.version.trim().slice(0, 60);
  const packageUrl = input.packageUrl.trim().slice(0, 2000);
  const sha256 = (input.sha256 || "").trim().toLowerCase().slice(0, 64);
  if (!profileId || !version || !packageUrl) throw new Error("Thiếu model, phiên bản hoặc URL firmware.");
  if (!packageUrl.startsWith("https://") && !packageUrl.startsWith("/")) throw new Error("Firmware phải dùng HTTPS hoặc đường dẫn nội bộ.");
  if (!/^[a-f0-9]{64}$/.test(sha256)) throw new Error("Firmware bắt buộc có mã SHA-256 gồm 64 ký tự.");
  const id = `sfr_${randomUUID()}`;
  await query(
    `INSERT INTO smart_bed_firmware_releases
       (id, profile_id, version, package_url, sha256, notes, mandatory)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (profile_id, version) DO UPDATE SET
       package_url = EXCLUDED.package_url,
       sha256 = EXCLUDED.sha256,
       notes = EXCLUDED.notes,
       mandatory = EXCLUDED.mandatory,
       active = TRUE,
       released_at = NOW()`,
    [id, profileId, version, packageUrl, sha256, (input.notes || "").trim().slice(0, 2000), Boolean(input.mandatory)],
  );
}
