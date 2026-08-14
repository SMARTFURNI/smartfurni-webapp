import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ZaloMediaAsset } from "./zalo-media-library-store";

const { normalizeVideoForZalo } = vi.hoisted(() => ({
  normalizeVideoForZalo: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/zalo-video-normalizer", () => ({ normalizeVideoForZalo }));

import { buildEmailAttachments } from "./crm-email-media";

function asset(overrides: Partial<ZaloMediaAsset>): ZaloMediaAsset {
  return {
    id: "asset-1",
    folderId: null,
    name: "sofa.jpg",
    objectKey: "zalo-library/sofa.jpg",
    url: "/api/media/zalo-library/sofa.jpg",
    contentType: "image/jpeg",
    mediaKind: "image",
    sizeBytes: 3,
    width: 1200,
    height: 1200,
    durationMs: null,
    usageCount: 0,
    createdAt: "2026-08-14T00:00:00.000Z",
    ...overrides,
  };
}

describe("CRM email media attachments", () => {
  beforeEach(() => normalizeVideoForZalo.mockReset());

  it("keeps images as named email attachments with an explicit MIME type", async () => {
    const buffer = Buffer.from("img");
    const result = await buildEmailAttachments([{ asset: asset({}), buffer }]);

    expect(result).toEqual([{ filename: "sofa.jpg", content: buffer, contentType: "image/jpeg" }]);
    expect(normalizeVideoForZalo).not.toHaveBeenCalled();
  });

  it("normalizes video to compatible MP4 before attaching it", async () => {
    const output = Buffer.from("mp4");
    normalizeVideoForZalo.mockResolvedValue({
      buffer: output,
      fileName: "demo.mp4",
      mimeType: "video/mp4",
      fileSize: output.byteLength,
      width: 720,
      height: 1280,
      duration: 55_000,
      thumbnailBuffer: Buffer.from("jpg"),
      thumbnailWidth: 360,
      thumbnailHeight: 640,
    });

    const input = Buffer.from("mov");
    const result = await buildEmailAttachments([{
      asset: asset({ name: "demo.mov", contentType: "video/quicktime", mediaKind: "video" }),
      buffer: input,
    }]);

    expect(normalizeVideoForZalo).toHaveBeenCalledWith({
      buffer: input,
      fileName: "demo.mov",
      mimeType: "video/quicktime",
    });
    expect(result).toEqual([{ filename: "demo.mp4", content: output, contentType: "video/mp4" }]);
  });
});
