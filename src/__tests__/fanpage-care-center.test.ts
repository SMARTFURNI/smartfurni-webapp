import { describe, expect, it } from "vitest";
import {
  assessFanpageConversation,
  buildFallbackCarePlan,
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
});
