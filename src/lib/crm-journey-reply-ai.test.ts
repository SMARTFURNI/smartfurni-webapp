import { describe, expect, it } from "vitest";
import { classifyJourneyReplyWithRules } from "./crm-journey-reply-ai";

describe("journey reply recommendation rules", () => {
  it("keeps the workflow running for a neutral reply", () => {
    const result = classifyJourneyReplyWithRules("Ok cảm ơn em nhé");
    expect(result.recommendation).toBe("continue");
    expect(result.hardStop).toBe(false);
  });

  it("only recommends a pause for buying questions", () => {
    const result = classifyJourneyReplyWithRules("Cho anh xin báo giá và hẹn gọi lại nhé?");
    expect(result.recommendation).toBe("pause");
    expect(result.suggestedPauseHours).toBe(24);
    expect(result.hardStop).toBe(false);
  });

  it("recognizes product mismatch as a switch recommendation", () => {
    expect(classifyJourneyReplyWithRules("Tôi đang quan tâm sản phẩm khác").recommendation).toBe("switch");
  });

  it("marks an explicit do-not-contact request as the compliance exception", () => {
    const result = classifyJourneyReplyWithRules("Vui lòng đừng gửi tin và không liên hệ nữa");
    expect(result.intent).toBe("do_not_contact");
    expect(result.recommendation).toBe("stop");
    expect(result.hardStop).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.95);
  });

  it("recognizes a short Vietnamese do-not-contact request with đ", () => {
    expect(classifyJourneyReplyWithRules("Đừng gửi tin nữa").hardStop).toBe(true);
  });

  it("does not treat a normal negative phrase as an automatic hard stop", () => {
    const result = classifyJourneyReplyWithRules("Hiện tại tôi chưa có nhu cầu");
    expect(result.recommendation).toBe("stop");
    expect(result.hardStop).toBe(false);
  });
});
