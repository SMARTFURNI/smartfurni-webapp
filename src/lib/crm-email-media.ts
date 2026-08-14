import "server-only";

import type { Attachment } from "resend";
import type { ZaloMediaAsset } from "@/lib/zalo-media-library-store";
import { normalizeVideoForZalo } from "@/lib/zalo-video-normalizer";

export interface EmailMediaItem {
  asset: ZaloMediaAsset;
  buffer: Buffer;
}

// Resend accepts up to 40 MB for the complete attachment set. Keep a small
// safety margin for MIME metadata so the provider does not reject near-limit
// messages after encoding.
export const MAX_EMAIL_ATTACHMENT_BYTES = 38 * 1024 * 1024;

function isVideo(item: EmailMediaItem): boolean {
  return item.asset.mediaKind === "video" || item.asset.contentType.startsWith("video/");
}

export async function buildEmailAttachments(items: EmailMediaItem[]): Promise<Attachment[]> {
  const attachments = await Promise.all(items.map(async item => {
    if (isVideo(item)) {
      // Email clients handle H.264/AAC MP4 much more consistently than MOV,
      // HEVC or WebM. The same normalization also enables fast-start playback.
      const normalized = await normalizeVideoForZalo({
        buffer: item.buffer,
        fileName: item.asset.name,
        mimeType: item.asset.contentType,
      });
      return {
        filename: normalized.fileName,
        content: normalized.buffer,
        contentType: normalized.mimeType,
      } satisfies Attachment;
    }

    return {
      filename: item.asset.name,
      content: item.buffer,
      contentType: item.asset.contentType || "application/octet-stream",
    } satisfies Attachment;
  }));

  const totalBytes = attachments.reduce((sum, attachment) => {
    if (Buffer.isBuffer(attachment.content)) return sum + attachment.content.byteLength;
    return sum + Buffer.byteLength(attachment.content || "", "base64");
  }, 0);
  if (totalBytes > MAX_EMAIL_ATTACHMENT_BYTES) {
    throw new Error(
      `Tổng dung lượng tệp đính kèm sau khi chuẩn hóa là ${(totalBytes / 1024 / 1024).toFixed(1)} MB, vượt giới hạn email 38 MB. Vui lòng giảm dung lượng hoặc số lượng media.`,
    );
  }

  return attachments;
}
