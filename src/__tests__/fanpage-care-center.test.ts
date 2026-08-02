import { describe, expect, it } from "vitest";
import {
  alignDraftMessageAddressing,
  assessFanpageConversation,
  buildFallbackCarePlan,
  detectConversationAddressing,
} from "@/lib/fanpage-care-center-rules";
import {
  DEFAULT_FANPAGE_CARE_SETTINGS,
  normalizeFanpageCareSettings,
} from "@/lib/fanpage-care-settings";

describe("fanpage care center", () => {
  it("ưu tiên hội thoại hỏi giá chưa được phản hồi", () => {
    const assessment = assessFanpageConversation({
      unreadCount: 1,
      canReply: true,
      latestMessageAt: new Date().toISOString(),
      messages: [
        {
          id: "m1",
          direction: "inbound",
          content: "Sofa giường SMF22 giá bao nhiêu, giao ở TP.HCM được không?",
          createdAt: new Date().toISOString(),
        },
      ],
    });

    expect(assessment.qualifies).toBe(true);
    expect(assessment.leadTemperature).toBe("hot");
    expect(assessment.buyingSignals).toContain("Hỏi giá/báo giá");
    expect(assessment.latestInboundUnanswered).toBe(true);
  });

  it("không tạo kế hoạch cho hội thoại chỉ có tin nhắn từ Fanpage", () => {
    const assessment = assessFanpageConversation({
      unreadCount: 0,
      canReply: true,
      latestMessageAt: new Date().toISOString(),
      messages: [
        {
          id: "m1",
          direction: "outbound",
          content: "SmartFurni xin chào anh/chị.",
          createdAt: new Date().toISOString(),
        },
      ],
    });

    expect(assessment.qualifies).toBe(false);
    expect(assessment.leadTemperature).toBe("cold");
  });

  it("kế hoạch dự phòng luôn yêu cầu nhân viên xác nhận", () => {
    const conversation = {
      pageInternalId: "page-1",
      pageFacebookId: "fb-page-1",
      pageName: "SmartFurni",
      conversationId: "conv-1",
      participantName: "Khách A",
      unreadCount: 1,
      canReply: true,
      latestMessageAt: new Date().toISOString(),
      messages: [
        {
          id: "m1",
          direction: "inbound" as const,
          content: "Tôi muốn đặt sofa giường 1m6",
          createdAt: new Date().toISOString(),
        },
      ],
    };
    const assessment = assessFanpageConversation(conversation);
    const plan = buildFallbackCarePlan(conversation, assessment);

    expect(plan.planSteps.length).toBeGreaterThanOrEqual(3);
    expect(plan.planSteps.every(step => step.requiresHumanApproval)).toBe(true);
    expect(plan.planSteps[0].channel).toBe("Messenger");
  });

  it("áp dụng trọng số và từ khóa do admin cấu hình", () => {
    const settings = normalizeFanpageCareSettings({
      ...DEFAULT_FANPAGE_CARE_SETTINGS,
      scoring: {
        ...DEFAULT_FANPAGE_CARE_SETTINGS.scoring,
        buyingSignalWeight: 30,
        hotThreshold: 70,
      },
      keywords: {
        ...DEFAULT_FANPAGE_CARE_SETTINGS.keywords,
        purchaseIntent: ["giữ hàng giúp tôi"],
      },
    });
    const assessment = assessFanpageConversation({
      unreadCount: 0,
      canReply: true,
      latestMessageAt: new Date().toISOString(),
      messages: [{
        id: "m-custom",
        direction: "inbound",
        content: "Giữ hàng giúp tôi, tôi sẽ qua showroom.",
      }],
    }, settings);

    expect(assessment.buyingSignals).toContain("Có ý định mua/chốt");
    expect(assessment.leadTemperature).toBe("hot");
  });

  it("chuẩn hóa ngưỡng để lead ấm luôn thấp hơn lead nóng", () => {
    const settings = normalizeFanpageCareSettings({
      scoring: { warmThreshold: 99, hotThreshold: 60 },
    });

    expect(settings.scoring.hotThreshold).toBe(60);
    expect(settings.scoring.warmThreshold).toBe(59);
  });

  it("giữ đúng cách nhân viên đang xưng em và gọi khách là chị", () => {
    const conversation = {
      pageInternalId: "page-1",
      pageFacebookId: "fb-page-1",
      pageName: "SmartFurni",
      conversationId: "conv-addressing",
      participantName: "Lan",
      unreadCount: 0,
      canReply: true,
      latestMessageAt: new Date().toISOString(),
      messages: [
        { id: "m1", direction: "inbound" as const, content: "Chị tư vấn giúp em mẫu sofa giường nhé" },
        { id: "m2", direction: "outbound" as const, content: "Dạ chị, em gửi chị thông tin mẫu SMF22 ạ" },
        { id: "m3", direction: "inbound" as const, content: "Chị gửi thêm kích thước giúp em" },
      ],
    };
    const style = detectConversationAddressing(conversation);
    const plan = buildFallbackCarePlan(conversation, assessFanpageConversation(conversation));

    expect(style).toMatchObject({ staffPronoun: "em", customerAddress: "chị", source: "outbound", confidence: "high" });
    expect(plan.planSteps[0].draftMessage).toContain("Dạ chị, em");
    expect(plan.planSteps[0].draftMessage).not.toContain("anh/chị");
    expect(plan.planSteps[0].draftMessage).not.toContain("Bạn");
  });

  it("suy luận cách xưng hô từ lời khách khi chưa có tin nhắn Fanpage", () => {
    const style = detectConversationAddressing({
      messages: [{ id: "m1", direction: "inbound", content: "Anh ơi, em muốn hỏi giá giường 1m6" }],
    });

    expect(style).toMatchObject({ staffPronoun: "anh", customerAddress: "em", source: "inbound" });
  });

  it("sửa đại từ văn mẫu trong kết quả AI theo hội thoại", () => {
    const style = detectConversationAddressing({
      messages: [{ id: "m1", direction: "outbound", content: "Dạ cô, cháu sẽ kiểm tra và báo cô ngay ạ" }],
    });
    const aligned = alignDraftMessageAddressing(
      "Chào Mai, SmartFurni xin gửi thêm thông tin để quý khách tham khảo. Bạn có cần SmartFurni hỗ trợ thêm không ạ?",
      style,
      "Mai",
    );

    expect(aligned).toContain("Dạ cô");
    expect(aligned).toContain("cháu xin gửi");
    expect(aligned).toContain("cô tham khảo");
    expect(aligned).not.toContain("quý khách");
    expect(aligned).not.toContain("Bạn");
  });
});
