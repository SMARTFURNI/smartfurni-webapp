import crypto from "crypto";
import { cookies } from "next/headers";
import { query } from "@/lib/db";

const COOKIE_PREFIX = "sf_lp_edit_";
const PBKDF2_ITERATIONS = 120_000;
const KEY_LENGTH = 32;
const DIGEST = "sha256";
const UNLOCK_MAX_AGE_SECONDS = 60 * 60 * 12;

export type LpEditPasswordMeta = {
  passwordHash: string | null;
  passwordSalt: string | null;
};

function normalizeSlug(slug: string): string {
  return String(slug || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 255);
}

function getTokenSecret(): string {
  return (
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.JWT_SECRET ||
    process.env.SESSION_SECRET ||
    "smartfurni-lp-edit-password-v1"
  );
}

function safeCompare(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function getLpEditCookieName(slug: string): string {
  return `${COOKIE_PREFIX}${normalizeSlug(slug)}`;
}

export function getLpEditMaxAgeSeconds(): number {
  return UNLOCK_MAX_AGE_SECONDS;
}

export async function ensureLpEditPasswordColumns(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS lp_pages (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(255) NOT NULL UNIQUE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      status VARCHAR(50) DEFAULT 'draft',
      created_at DATE DEFAULT CURRENT_DATE,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`ALTER TABLE lp_pages ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255)`);
  await query(`ALTER TABLE lp_pages ADD COLUMN IF NOT EXISTS parent_slug VARCHAR(255) DEFAULT NULL`);
  await query(`ALTER TABLE lp_pages ADD COLUMN IF NOT EXISTS edit_password_hash TEXT DEFAULT NULL`);
  await query(`ALTER TABLE lp_pages ADD COLUMN IF NOT EXISTS edit_password_salt TEXT DEFAULT NULL`);
}

export function hashLandingPageEditPassword(password: string, salt = crypto.randomBytes(16).toString("hex")) {
  const passwordHash = crypto
    .pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, DIGEST)
    .toString("hex");
  return { passwordHash, passwordSalt: salt };
}

export async function getLandingPageEditPasswordMeta(slug: string): Promise<LpEditPasswordMeta> {
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) return { passwordHash: null, passwordSalt: null };
  await ensureLpEditPasswordColumns();
  const rows = await query<{ edit_password_hash: string | null; edit_password_salt: string | null }>(
    `SELECT edit_password_hash, edit_password_salt FROM lp_pages WHERE slug = $1 LIMIT 1`,
    [normalizedSlug]
  );
  return {
    passwordHash: rows[0]?.edit_password_hash || null,
    passwordSalt: rows[0]?.edit_password_salt || null,
  };
}

export async function hasLandingPageEditPassword(slug: string): Promise<boolean> {
  const meta = await getLandingPageEditPasswordMeta(slug);
  return !!(meta.passwordHash && meta.passwordSalt);
}

export function buildLpEditToken(slug: string, passwordHash: string): string {
  const normalizedSlug = normalizeSlug(slug);
  return crypto
    .createHmac("sha256", getTokenSecret())
    .update(`${normalizedSlug}:${passwordHash}`)
    .digest("hex");
}

export async function verifyLandingPageEditPassword(slug: string, password: string): Promise<{ ok: boolean; token?: string }> {
  const normalizedSlug = normalizeSlug(slug);
  const submittedPassword = String(password || "");
  if (!normalizedSlug || !submittedPassword) return { ok: false };

  const meta = await getLandingPageEditPasswordMeta(normalizedSlug);
  if (!meta.passwordHash || !meta.passwordSalt) return { ok: false };

  const candidate = hashLandingPageEditPassword(submittedPassword, meta.passwordSalt).passwordHash;
  if (!safeCompare(candidate, meta.passwordHash)) return { ok: false };

  return { ok: true, token: buildLpEditToken(normalizedSlug, meta.passwordHash) };
}

export async function hasLandingPageEditCookie(slug: string): Promise<boolean> {
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) return false;

  const meta = await getLandingPageEditPasswordMeta(normalizedSlug);
  if (!meta.passwordHash) return false;

  const store = await cookies();
  const cookieToken = store.get(getLpEditCookieName(normalizedSlug))?.value || "";
  const expectedToken = buildLpEditToken(normalizedSlug, meta.passwordHash);
  return !!cookieToken && safeCompare(cookieToken, expectedToken);
}
