import { describe, expect, it } from "vitest";
import {
  buildZaloOaChatUrl,
  isLikelyMobileZaloVisitor,
  isZaloFollowSuccessAction,
  normalizeZaloOaId,
} from "@/lib/zalo-follow-links";

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

  it("uses the interactive widget on phones and narrow mobile viewports", () => {
    expect(isLikelyMobileZaloVisitor("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)", 390)).toBe(true);
    expect(isLikelyMobileZaloVisitor("Mozilla/5.0 (Macintosh; Intel Mac OS X)", 1440)).toBe(false);
  });

  it("only treats the interactive follow callback as a completed follow", () => {
    expect(isZaloFollowSuccessAction("click_followed", true)).toBe(true);
    expect(isZaloFollowSuccessAction("click_interaction_accepted", true)).toBe(false);
    expect(isZaloFollowSuccessAction(undefined, false)).toBe(true);
  });
});
