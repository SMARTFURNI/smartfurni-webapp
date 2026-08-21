import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAssetsMock, queryMock, queryOneMock } = vi.hoisted(() => ({
  getAssetsMock: vi.fn(),
  queryMock: vi.fn(),
  queryOneMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ query: queryMock, queryOne: queryOneMock }));
vi.mock("@/lib/zalo-media-library-store", () => ({ getZaloMediaAssets: getAssetsMock }));

import { createZaloQuickMessage } from "./zalo-quick-message-store";

describe("Zalo quick message store", () => {
  beforeEach(() => {
    queryMock.mockReset().mockResolvedValue([]);
    queryOneMock.mockReset();
    getAssetsMock.mockReset().mockResolvedValue([]);
  });

  it("stores ordered media references and hydrates reusable assets", async () => {
    queryOneMock.mockResolvedValue({
      id: "quick-1",
      title: "Giới thiệu sản phẩm",
      category: "Tư vấn",
      content: "Em gửi anh/chị video sản phẩm.",
      media_asset_ids: ["video-1", "image-1"],
      usage_count: 0,
      last_used_at: null,
      created_by: "staff-1",
      updated_by: "staff-1",
      created_at: "2026-08-21T09:00:00.000Z",
      updated_at: "2026-08-21T09:00:00.000Z",
    });
    getAssetsMock.mockResolvedValue([
      { id: "video-1", name: "demo.mp4", mediaKind: "video" },
      { id: "image-1", name: "sofa.jpg", mediaKind: "image" },
    ]);

    const template = await createZaloQuickMessage({
      title: "Giới thiệu sản phẩm",
      content: "Em gửi anh/chị video sản phẩm.",
      mediaAssetIds: ["video-1", "image-1"],
      actor: "staff-1",
    });

    expect(template.mediaAssetIds).toEqual(["video-1", "image-1"]);
    expect(template.mediaAssets.map(asset => asset.id)).toEqual(["video-1", "image-1"]);
    expect(queryOneMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO zalo_quick_messages"),
      expect.arrayContaining([JSON.stringify(["video-1", "image-1"]), "staff-1"]),
    );
  });

  it("rejects an empty template", async () => {
    await expect(createZaloQuickMessage({ title: "Mẫu trống" }))
      .rejects.toThrow("Mẫu cần có nội dung hoặc ảnh/video");
  });
});
