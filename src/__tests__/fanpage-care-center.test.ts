import { describe, expect, it } from "vitest";
import {
  assessFanpageConversation,
  buildFallbackCarePlan,
} from "@/lib/fanpage-care-center-rules";

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
});
