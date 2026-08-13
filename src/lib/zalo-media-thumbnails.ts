import "server-only";

import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";

import { sanitizeMediaSegment } from "@/lib/media-storage";

export const ZALO_MEDIA_THUMBNAIL_CACHE_CONTROL = "private, max-age=31536000, immutable";

const execFileAsync = promisify(execFile);

export function getZaloMediaThumbnailKey(assetId: string): string {
  // v2 đổi từ crop sang contain và bổ sung ảnh bìa video; đổi key để các
  // thumbnail cũ trong Bucket được tái tạo tự động khi mở thư viện.
  return `zalo-media-library-thumbnails/${sanitizeMediaSegment(assetId)}-v2.webp`;
}

export async function createZaloMediaThumbnail(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize(360, 360, {
      fit: "contain",
      background: { r: 241, g: 245, b: 249, alpha: 1 },
      withoutEnlargement: true,
    })
    .webp({ quality: 72, effort: 3 })
    .toBuffer();
}

export async function createZaloVideoThumbnail(input: Buffer): Promise<Buffer> {
  const directory = await mkdtemp(join(tmpdir(), "smartfurni-zalo-media-thumb-"));
  const sourcePath = join(directory, "source-video");
  const framePath = join(directory, "frame.jpg");

  try {
    await writeFile(sourcePath, input);
    await execFileAsync("ffmpeg", [
      "-hide_banner",
      "-loglevel", "error",
      "-y",
      "-ss", "0.1",
      "-i", sourcePath,
      "-frames:v", "1",
      "-q:v", "3",
      framePath,
    ], {
      timeout: 60_000,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    });
    return createZaloMediaThumbnail(await readFile(framePath));
  } finally {
    await rm(directory, { recursive: true, force: true }).catch(() => undefined);
  }
}
