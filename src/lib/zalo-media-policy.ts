import "server-only";

export type ZaloMediaKind = "image" | "video" | "file";

const MEBIBYTE = 1024 * 1024;
const DAY = 24 * 60 * 60 * 1000;

function positiveIntegerEnv(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getZaloMediaKind(mimeType: string): ZaloMediaKind {
  if (mimeType.toLowerCase().startsWith("image/")) return "image";
  if (mimeType.toLowerCase().startsWith("video/")) return "video";
  return "file";
}

export function getZaloMediaMaxBytes(kind: ZaloMediaKind): number {
  if (kind === "image") {
    return positiveIntegerEnv("ZALO_MEDIA_IMAGE_MAX_MB", 15) * MEBIBYTE;
  }
  return positiveIntegerEnv(
    kind === "video" ? "ZALO_MEDIA_VIDEO_MAX_MB" : "ZALO_MEDIA_FILE_MAX_MB",
    40,
  ) * MEBIBYTE;
}

export function getZaloMediaRetentionDays(kind: ZaloMediaKind): number {
  if (kind === "image") {
    return positiveIntegerEnv("ZALO_MEDIA_IMAGE_RETENTION_DAYS", 180);
  }
  if (kind === "video") {
    return positiveIntegerEnv("ZALO_MEDIA_VIDEO_RETENTION_DAYS", 60);
  }
  return positiveIntegerEnv("ZALO_MEDIA_FILE_RETENTION_DAYS", 365);
}

export function getZaloMediaExpiresAt(kind: ZaloMediaKind, now = Date.now()): Date {
  return new Date(now + getZaloMediaRetentionDays(kind) * DAY);
}

export function formatZaloMediaLimit(kind: ZaloMediaKind): string {
  return `${Math.round(getZaloMediaMaxBytes(kind) / MEBIBYTE)}MB`;
}
