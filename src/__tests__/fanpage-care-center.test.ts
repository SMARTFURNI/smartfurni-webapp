import { describe, expect, it } from "vitest";
import {
  alignDraftMessageAddressing,
  assessFanpageConversation,
  buildFallbackCarePlan,
  detectConversationAddressing,
  hasNewMessagesSinceAnalysis,
} from "@/lib/fanpage-care-center-rules";
import {
  DEFAULT_FANPAGE_CARE_SETTINGS,
  normalizeFanpageCareSettings,
} from "@/lib/fanpage-care-settings";

describe("fanpage care center", () => {
  it("dùng ChatGPT GPT-5.6 Terra làm model phân tích mặc định", () => {
    const settings = normalizeFanpageCareSettings({});

    expect(settings.ai.defaultModel).toBe("openai:gpt-5.6-terra");
  });

  it("chỉ lưu model AI nằm trong danh sách admin được phép chọn", () => {
    const settings = normalizeFanpageCareSettings({
      ai: { defaultModel: "openai:model-khong-hop-le" },
    });

    expect(settings.ai.defaultModel).toBe("openai:gpt-5.6-terra");
  });

  it("không phân tích lại hội thoại khi số tin nhắn không đổi", () => {
    expect(hasNewMessagesSinceAnalysis({
      pageInternalId: "page-1",
      pageFacebookId: "fb-page-1",
      pageName: "SmartFurni",
      conversationId: "conv-stable",
      participantName: "Khách A",
      unreadCount: 0,
      canReply: true,
      sourceMessageCount: 12,
      analyzedMessageCount: 12,
      latestMessageId: "message-12",
      analyzedLatestMessageId: "message-12",
      latestMessageAt: "2026-08-01T08:00:00.000Z",
      analyzedLatestMessageAt: "2026-08-01T08:00:00.000Z",
      lastAnalyzedAt: "2026-08-01T08:05:00.000Z",
      messages: [],
    })).toBe(false);
  });

  it("chỉ phân tích lại hội thoại cũ khi có thêm tin nhắn", () => {
    expect(hasNewMessagesSinceAnalysis({
      pageInternalId: "page-1",
      pageFacebookId: "fb-page-1",
      pageName: "SmartFurni",
      conversationId: "conv-updated",
      participantName: "Khách B",
      unreadCount: 1,
      canReply: true,
      sourceMessageCount: 13,
      analyzedMessageCount: 12,
      latestMessageId: "message-13",
      analyzedLatestMessageId: "message-12",
      latestMessageAt: "2026-08-02T08:00:00.000Z",
      analyzedLatestMessageAt: "2026-08-01T08:00:00.000Z",
      lastAnalyzedAt: "2026-08-01T08:05:00.000Z",
      messages: [],
    })).toBe(true);
  });

  it("phân tích lần đầu khi hội thoại chưa có dấu mốc", () => {
    expect(hasNewMessagesSinceAnalysis({
      pageInternalId: "page-1",
      pageFacebookId: "fb-page-1",
      pageName: "SmartFurni",
      conversationId: "conv-new",
      participantName: "Khách mới",
      unreadCount: 1,
      canReply: true,
      sourceMessageCount: 1,
      messages: [],
    })).toBe(true);
  });

  it("xử lý câu hỏi giá chưa phản hồi nhưng không chấm nóng trước khi khách biết giá", () => {
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
    expect(assessment.leadTemperature).toBe("warm");
    expect(assessment.buyingSignals).toContain("Hỏi giá/báo giá");
    expect(assessment.latestInboundUnanswered).toBe(true);
    expect(assessment.priceGateStatus).toBe("not_presented");
    expect(assessment.pricePassed).toBe(false);
    expect(assessment.leadScore).toBeLessThan(DEFAULT_FANPAGE_CARE_SETTINGS.scoring.hotThreshold);
  });

  it("loại khách khỏi chăm sóc khi Fanpage đã báo giá nhưng khách im lặng", () => {
    const assessment = assessFanpageConversation({
      unreadCount: 0,
      canReply: true,
      latestMessageAt: new Date().toISOString(),
      messages: [
        { id: "m1", direction: "inbound", content: "Sofa giường SMF22 giá bao nhiêu?" },
        { id: "m2", direction: "outbound", content: "Dạ em gửi báo giá chi tiết mẫu SMF22 là 4.290.000đ ạ." },
      ],
    });

    expect(assessment.priceGateStatus).toBe("awaiting_response");
    expect(assessment.excludedFromCare).toBe(true);
    expect(assessment.qualifies).toBe(false);
    expect(assessment.leadScore).toBe(0);
    expect(assessment.funnelStage).toBe("price_disengaged");
  });

  it("loại khách chỉ phản hồi xã giao sau khi nhận báo giá", () => {
    const assessment = assessFanpageConversation({
      unreadCount: 1,
      canReply: true,
      latestMessageAt: new Date().toISOString(),
      messages: [
        { id: "m1", direction: "inbound", content: "Cho chị xin giá mẫu sofa giường 1m6" },
        { id: "m2", direction: "outbound", content: "Dạ em gửi giá trọn bộ 1m6 là 4.290.000đ chị nhé." },
        { id: "m3", direction: "inbound", content: "Dạ ok em, cảm ơn nhé 🙏" },
      ],
    });

    expect(assessment.priceGateStatus).toBe("passive_response");
    expect(assessment.excludedFromCare).toBe(true);
    expect(assessment.qualifies).toBe(false);
    expect(assessment.leadTemperature).toBe("cold");
  });

  it("chưa chấm nóng khi khách chỉ hỏi thêm một chủ đề sau báo giá", () => {
    const assessment = assessFanpageConversation({
      unreadCount: 1,
      canReply: true,
      latestMessageAt: new Date().toISOString(),
      messages: [
        { id: "m1", direction: "inbound", content: "Mẫu SMF22 giá bao nhiêu?" },
        { id: "m2", direction: "outbound", content: "Dạ em gửi báo giá mẫu SMF22 là 4.290.000đ ạ." },
        { id: "m3", direction: "inbound", content: "Mẫu này có size 1m6 không em?" },
      ],
    });

    expect(assessment.priceGateStatus).toBe("engaged");
    expect(assessment.postPriceQuestionTopics).toEqual(["Kích thước"]);
    expect(assessment.pricePassed).toBe(false);
    expect(assessment.leadTemperature).not.toBe("hot");
    expect(assessment.qualifies).toBe(true);
  });

  it("chấm lead nóng khi khách hỏi nhiều chủ đề sau khi biết giá", () => {
    const assessment = assessFanpageConversation({
      unreadCount: 1,
      canReply: true,
      latestMessageAt: new Date().toISOString(),
      messages: [
        { id: "m1", direction: "inbound", content: "Cho anh xin giá sofa giường SMF22" },
        { id: "m2", direction: "outbound", content: "Dạ em gửi báo giá chi tiết SMF22 là 4.290.000đ anh nhé." },
        { id: "m3", direction: "inbound", content: "Mẫu này có size 1m6 không?" },
        { id: "m4", direction: "inbound", content: "Giao lắp ở Thủ Đức mất bao lâu em?" },
      ],
    });

    expect(assessment.priceGateStatus).toBe("passed");
    expect(assessment.pricePassed).toBe(true);
    expect(assessment.postPriceQuestionTopics).toEqual(expect.arrayContaining(["Kích thước", "Giao lắp/showroom"]));
    expect(assessment.leadTemperature).toBe("hot");
    expect(assessment.qualifies).toBe(true);
    expect(assessment.funnelStage).toBe("qualified_after_price");
  });

  it("coi ý định đặt mua rõ ràng là đã vượt giá dù không hỏi đủ hai chủ đề", () => {
    const assessment = assessFanpageConversation({
      unreadCount: 1,
      canReply: true,
      latestMessageAt: new Date().toISOString(),
      messages: [
        { id: "m1", direction: "inbound", content: "Cho chị xin giá giường 1m6" },
        { id: "m2", direction: "outbound", content: "Dạ giá bán bản 1m6 là 20.900.000đ chị nhé." },
        { id: "m3", direction: "inbound", content: "Chị chốt mẫu này, gửi chị thông tin cọc nhé" },
      ],
    });

    expect(assessment.pricePassed).toBe(true);
    expect(assessment.leadTemperature).toBe("hot");
    expect(assessment.postPriceQuestionTopics).toContain("Ý định mua/chốt");
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

  it("áp dụng từ khóa admin nhưng vẫn giữ trần điểm trước cổng giá", () => {
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
    expect(assessment.leadTemperature).toBe("warm");
    expect(assessment.leadScore).toBe(69);
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
