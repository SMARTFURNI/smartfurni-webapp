import { describe, expect, it } from "vitest";
import { buildZaloOaChatUrl, normalizeZaloOaId } from "@/lib/zalo-follow-links";

describe("Zalo OA follow links", () => {
  it("removes whitespace that made the Zalo SDK generate oaid=%20...", () => {
    expect(normalizeZaloOaId(" 4257599883815905691 ")).toBe("4257599883815905691");
  });

  it("builds a clean OA chat URL from the normalized OA ID", () => {
    expect(buildZaloOaChatUrl("", " 4257599883815905691"))
      .toBe("https://zalo.me/4257599883815905691");
  });

  it("repairs a configured Zalo URL whose path starts with an encoded space", () => {
    expect(buildZaloOaChatUrl("https://zalo.me/%204257599883815905691", ""))
      .toBe("https://zalo.me/4257599883815905691");
  });
});
