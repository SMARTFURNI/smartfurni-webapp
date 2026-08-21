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
      content: "Em chào anh/chị.\nEm gửi anh/chị video sản phẩm.",
      message_parts: ["Em chào anh/chị.", "Em gửi anh/chị video sản phẩm."],
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
      messageParts: ["Em chào anh/chị.", "Em gửi anh/chị video sản phẩm."],
      mediaAssetIds: ["video-1", "image-1"],
      actor: "staff-1",
    });

    expect(template.mediaAssetIds).toEqual(["video-1", "image-1"]);
    expect(template.mediaAssets.map(asset => asset.id)).toEqual(["video-1", "image-1"]);
    expect(template.messageParts).toEqual(["Em chào anh/chị.", "Em gửi anh/chị video sản phẩm."]);
    expect(queryOneMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO zalo_quick_messages"),
      expect.arrayContaining([
        JSON.stringify(["Em chào anh/chị.", "Em gửi anh/chị video sản phẩm."]),
        JSON.stringify(["video-1", "image-1"]),
        "staff-1",
      ]),
    );
  });

  it("keeps a legacy single-content template as one separate text message", async () => {
    queryOneMock.mockResolvedValue({
      id: "legacy-1",
      title: "Mẫu cũ",
      category: "Tư vấn",
      content: "Nội dung đã lưu trước đây",
      message_parts: [],
      media_asset_ids: [],
      usage_count: 2,
      last_used_at: null,
      created_by: "staff-1",
      updated_by: "staff-1",
      created_at: "2026-08-21T09:00:00.000Z",
      updated_at: "2026-08-21T09:00:00.000Z",
    });

    const template = await createZaloQuickMessage({
      title: "Mẫu cũ",
      content: "Nội dung đã lưu trước đây",
    });

    expect(template.messageParts).toEqual(["Nội dung đã lưu trước đây"]);
  });

  it("rejects an empty template", async () => {
    await expect(createZaloQuickMessage({ title: "Mẫu trống" }))
      .rejects.toThrow("Mẫu cần có nội dung hoặc ảnh/video");
  });
});
