import "server-only";

export type ZaloMediaKind = "image" | "video" | "file";

const MEBIBYTE = 1024 * 1024;
const DAY = 24 * 60 * 60 * 1000;

function positiveIntegerEnv(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const VIDEO_FILE_EXTENSIONS = new Set(["mp4", "mov", "m4v", "webm", "mkv", "avi"]);
const ZALO_INLINE_VIDEO_EXTENSIONS = new Set(["mp4", "mov", "m4v"]);

function fileExtension(fileName = ""): string {
  const match = fileName.trim().toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] || "";
}

export function getZaloMediaKind(mimeType: string, fileName = ""): ZaloMediaKind {
  if (mimeType.toLowerCase().startsWith("image/")) return "image";
  if (mimeType.toLowerCase().startsWith("video/")) return "video";
  if (VIDEO_FILE_EXTENSIONS.has(fileExtension(fileName))) return "video";
  return "file";
}

/**
 * zca-js 2.x chỉ đi qua API video native khi tên upload kết thúc bằng `.mp4`.
 * Video do iPhone/Safari chọn thường mang đuôi MOV/M4V nên trước đây bị thư viện
 * xếp vào nhánh file và phía người nhận phải tải xuống. MOV/M4V dùng cùng họ
 * container ISO Base Media nên Zalo có thể xử lý qua luồng MP4 native.
 */
export function getZaloNativeUploadFileName(fileName: string, mimeType: string): string {
  if (getZaloMediaKind(mimeType, fileName) !== "video") return fileName;

  const extension = fileExtension(fileName);
  const mime = mimeType.toLowerCase();
  const isInlineCompatible = ZALO_INLINE_VIDEO_EXTENSIONS.has(extension)
    || mime === "video/mp4"
    || mime === "video/quicktime"
    || mime === "video/x-m4v";

  if (!isInlineCompatible) {
    throw new Error("Zalo chỉ phát trực tiếp video MP4, MOV hoặc M4V. Vui lòng chuyển video sang MP4 rồi gửi lại.");
  }

  const baseName = fileName
    .trim()
    .replace(/\.[^.]+$/, "")
    .replace(/[\\/:*?\"<>|]+/g, "-")
    || "video";
  return `${baseName}.mp4`;
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
