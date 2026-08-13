import "server-only";

import sharp from "sharp";

import { sanitizeMediaSegment } from "@/lib/media-storage";

export const ZALO_MEDIA_THUMBNAIL_CACHE_CONTROL = "private, max-age=31536000, immutable";

export function getZaloMediaThumbnailKey(assetId: string): string {
  return `zalo-media-library-thumbnails/${sanitizeMediaSegment(assetId)}.webp`;
}

export async function createZaloMediaThumbnail(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize(360, 360, { fit: "cover", position: "attention", withoutEnlargement: true })
    .webp({ quality: 72, effort: 3 })
    .toBuffer();
}
