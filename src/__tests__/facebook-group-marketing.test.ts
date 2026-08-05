import { describe, expect, it } from "vitest";
import {
  analyzeFacebookGroupRules, buildFacebookGroupContactCta, calculateFacebookGroupScore, contentSimilarityPercent,
  extractFacebookGroupSourceCode, generateFacebookGroupSourceCode, parseFacebookGroupPostUrl,
  getNextFacebookGroupPostingSlot,
  keepGroundedFacebookGroupSuggestions, parseFacebookGroupAiSuggestion,
  parseFacebookGroupDiscoveryResponse, parseFacebookGroupUrl,
  validateFacebookGroupSchedule,
} from "@/lib/facebook-group-marketing-business";
import {
  DEFAULT_FACEBOOK_GROUP_SETTINGS as settings,
  normalizeFacebookGroupAiSettings,
} from "@/lib/facebook-group-marketing-types";
import { canDeleteFacebookGroupMarketing } from "@/lib/facebook-group-marketing-permissions";
import {
  blueprintInputSchema,
  blueprintPlanSchema,
  totalPillarRatio,
} from "@/lib/facebook-group-growth-business";
import {
  FACEBOOK_GROUP_CONTENT_IMAGE_VARIANT_COUNT,
  buildFacebookGroupContentImagePrompt,
  getFacebookGroupProductReferenceImages,
  normalizeFacebookGroupContentImageAspect,
} from "@/lib/facebook-group-content-image-business";

const validSchedule = {
  scheduledAt: "2026-07-29T09:00:00.000Z",
  contentStatus: "approved" as const,
  duplicateRatio: 20,
  ruleCheckPassed: true,
  groupStatus: "active" as const,
  membershipStatus: "joined" as const,
  groupNextAllowedPostAt: "2026-07-28T09:00:00.000Z",
  pagePostsSameDay: [] as string[],
  employeeTasksAt: [] as string[],
};

describe("Facebook Group Marketing business rules", () => {
  it("tạo brief ảnh từ dữ liệu bài viết và không yêu cầu chữ quảng cáo trong ảnh", () => {
    const prompt = buildFacebookGroupContentImagePrompt({
      opening: "Căn hộ nhỏ vẫn có thể thoáng.",
      body: "Bố trí sofa giường để tối ưu diện tích sinh hoạt.",
      groupName: "Cộng đồng căn hộ nhỏ",
      groupTopic: "Nội thất",
      groupRegion: "Hồ Chí Minh",
      product: {
        name: "Sofa giường SMF12",
        sku: "SMF12",
        description: "Sofa giường gấp gọn.",
        specs: { material: "Vải canvas" },
      },
      aspectRatio: "4:3",
    });
    expect(prompt).toContain("Sofa giường SMF12");
    expect(prompt).toContain("Cộng đồng căn hộ nhỏ");
    expect(prompt).toContain("Do not add text");
    expect(normalizeFacebookGroupContentImageAspect("không hợp lệ")).toBe("4:3");
    expect(FACEBOOK_GROUP_CONTENT_IMAGE_VARIANT_COUNT).toBe(1);
  });

  it("chỉ lấy tối đa ba ảnh sản phẩm CRM không trùng để làm tham chiếu", () => {
    expect(getFacebookGroupProductReferenceImages({
      imageUrl: "/main.webp",
      imageSpec: "/spec.webp",
      imageAngle1: "/main.webp",
      imageAngle2: "/angle.webp",
      imageScene: "/scene.webp",
    })).toEqual(["/main.webp", "/spec.webp", "/angle.webp"]);
  });

  it("chuẩn hóa cấu hình model AI và luôn dùng nhà cung cấp dự phòng khác model chính", () => {
    expect(normalizeFacebookGroupAiSettings({
      primaryProvider: "openai",
      fallbackProvider: "openai",
      openaiModel: "gpt-5.6",
      geminiModel: "gemini-2.0-flash",
      autoFallback: true,
    })).toEqual({
      primaryProvider: "openai",
      fallbackProvider: "gemini",
      openaiModel: "gpt-5.6",
      geminiModel: "gemini-2.0-flash",
      autoFallback: true,
    });
    expect(normalizeFacebookGroupAiSettings({
      primaryProvider: "khong-hop-le",
      openaiModel: "model-tu-nhap",
    })).toMatchObject({
      primaryProvider: "openai",
      openaiModel: "gpt-4.1-mini",
    });
  });

  it("chỉ cho phép phiên đăng nhập admin xóa bản ghi", () => {
    expect(canDeleteFacebookGroupMarketing({ isAdmin: true })).toBe(true);
    expect(canDeleteFacebookGroupMarketing({ isAdmin: false })).toBe(false);
    expect(canDeleteFacebookGroupMarketing(null)).toBe(false);
  });

  it("không xếp lịch khi Fanpage đã đạt giới hạn ngày", () => {
    const result = validateFacebookGroupSchedule({
      ...validSchedule,
      pagePostsSameDay: [
        "2026-07-29T01:00:00Z", "2026-07-29T03:00:00Z",
        "2026-07-29T05:00:00Z", "2026-07-29T07:00:00Z",
      ],
    }, settings);
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("giới hạn");
  });

  it("không xếp hai bài quá gần nhau", () => {
    const result = validateFacebookGroupSchedule({
      ...validSchedule, pagePostsSameDay: ["2026-07-29T08:30:00.000Z"],
    }, settings);
    expect(result.errors.join(" ")).toContain("quá gần");
  });

  it("không đăng lại cùng group quá sớm", () => {
    const result = validateFacebookGroupSchedule({
      ...validSchedule, groupNextAllowedPostAt: "2026-08-02T09:00:00.000Z",
    }, settings);
    expect(result.errors.join(" ")).toContain("chưa đến ngày");
  });

  it("không xếp nội dung chưa duyệt hoặc Fanpage chưa tham gia", () => {
    const result = validateFacebookGroupSchedule({
      ...validSchedule, contentStatus: "pending_approval", membershipStatus: "pending",
    }, settings);
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(2);
  });

  it("không xếp nội dung vi phạm nội quy hoặc trùng lặp quá mức", () => {
    const result = validateFacebookGroupSchedule({
      ...validSchedule, ruleCheckPassed: false, duplicateRatio: 75,
    }, settings);
    expect(result.errors.join(" ")).toContain("nội quy");
    expect(result.errors.join(" ")).toContain("trùng lặp");
  });

  it("tự tìm khung giờ đăng tiếp theo theo giờ Việt Nam và bỏ qua Chủ nhật", () => {
    expect(getNextFacebookGroupPostingSlot(
      new Date("2026-08-02T00:10:00.000Z"),
      settings,
    ).toISOString()).toBe("2026-08-03T01:00:00.000Z");
    expect(getNextFacebookGroupPostingSlot(
      new Date("2026-08-04T04:07:00.000Z"),
      settings,
    ).toISOString()).toBe("2026-08-04T04:15:00.000Z");
  });

  it("tạo mã nguồn ổn định và hỗ trợ phiên bản sau Z", () => {
    expect(generateFacebookGroupSourceCode({
      groupCode: "Chợ Quận 7", productCode: "Khung", date: new Date("2026-07-28"), version: 1,
    })).toBe("CHOQUAN7-KHUNG-2807-A");
    expect(generateFacebookGroupSourceCode({
      groupCode: "B2B", productCode: "VNOX", date: new Date("2026-07-29"), version: 27,
    })).toBe("B2B-VNOX-2907-AA");
  });

  it("tính điểm và phân hạng group đúng ngưỡng", () => {
    const result = calculateFacebookGroupScore({
      audienceFitPercent: 100, allowsPages: true, allowsSales: true,
      totalPosts: 10, approvedPosts: 10, messengerLeads: 2,
      qualifiedLeads: 10, orders: 3, revenue: 100_000_000,
    }, settings);
    expect(result).toEqual({ score: 100, grade: "A" });
  });

  it("đo trùng lặp và phân tích nội quy từ văn bản người dùng nhập", () => {
    expect(contentSimilarityPercent(
      "Giường thông minh giúp ngủ ngon và giảm đau lưng",
      "Giường thông minh giúp ngủ ngon, hỗ trợ giảm đau lưng",
    )).toBeGreaterThan(60);
    const analysis = analyzeFacebookGroupRules(
      "Không đăng giá, cấm để số điện thoại. Bài viết chờ quản trị viên phê duyệt.",
    );
    expect(analysis.allowsPrice).toBe(false);
    expect(analysis.allowsPhone).toBe(false);
    expect(analysis.requiresApproval).toBe(true);
  });

  it("chỉ bổ sung kênh liên hệ đã được nội quy Group cho phép", () => {
    const phoneAllowed = buildFacebookGroupContactCta({
      rawCta: "Nhắn Fanpage để xem mẫu thực tế.",
      ruleAnalysis: { allowsPhone: true, allowsLink: null },
      contact: settings.contact,
    });
    expect(phoneAllowed).toContain("Liên hệ/Zalo: 0918.326.552");
    expect(phoneAllowed).not.toContain("https://");

    const phoneDenied = buildFacebookGroupContactCta({
      rawCta: "Nhắn Fanpage để xem mẫu thực tế.",
      ruleAnalysis: { allowsPhone: false, allowsLink: false },
      contact: settings.contact,
    });
    expect(phoneDenied).not.toContain("0918.326.552");

    const linksAllowed = buildFacebookGroupContactCta({
      ruleAnalysis: { allowsPhone: true, allowsLink: true },
      contact: settings.contact,
    });
    expect(linksAllowed).toContain("https://zalo.me/0918326552");
    expect(linksAllowed).toContain("https://www.smartfurni.com.vn");
  });

  it("nhận diện mã nguồn trong tin nhắn Messenger mà không ảnh hưởng automation khác", () => {
    expect(extractFacebookGroupSourceCode(
      "Mình muốn nhận video, mã CHQ7-KHUNG-2807-A nhé",
    )).toBe("CHQ7-KHUNG-2807-A");
    expect(extractFacebookGroupSourceCode("Xin chào Fanpage")).toBeNull();
  });

  it("chỉ chấp nhận đúng link bài đăng trong Facebook Group", () => {
    expect(parseFacebookGroupPostUrl(
      "https://www.facebook.com/groups/123456/posts/987654/",
    )).toMatchObject({ groupKey: "123456", postKey: "987654", kind: "posts" });
    expect(parseFacebookGroupPostUrl(
      "https://m.facebook.com/groups/noithatthongminh/permalink/9988",
    )).toMatchObject({ groupKey: "noithatthongminh", postKey: "9988", kind: "permalink" });
    expect(parseFacebookGroupPostUrl("https://www.facebook.com/smartfurni/posts/123")).toBeNull();
    expect(parseFacebookGroupPostUrl("https://example.com/groups/123/posts/456")).toBeNull();
  });

  it("đối chiếu được bài đăng với đúng Group đã cấu hình", () => {
    const group = parseFacebookGroupUrl("https://www.facebook.com/groups/noithatthongminh/");
    const post = parseFacebookGroupPostUrl(
      "https://www.facebook.com/groups/noithatthongminh/posts/123456/",
    );
    expect(group?.groupKey).toBe(post?.groupKey);
  });

  it("đọc được nội dung AI dạng JSON chuẩn, code fence và văn bản có nhãn", () => {
    expect(parseFacebookGroupAiSuggestion(JSON.stringify({
      opening: "Một căn hộ nhỏ vẫn có thể thật thoáng.",
      body: "Ưu tiên nội thất đa năng giúp tiết kiệm diện tích sử dụng.",
      cta: "Nhắn Fanpage để xem thêm.",
      contentType: "education",
    }))).toMatchObject({ contentType: "education", opening: "Một căn hộ nhỏ vẫn có thể thật thoáng." });

    expect(parseFacebookGroupAiSuggestion(`\`\`\`json
{"opening":"Mở đầu","body":"Nội dung hữu ích","cta":"Nhắn Fanpage","contentType":"community_share"}
\`\`\``).body).toBe("Nội dung hữu ích");

    expect(parseFacebookGroupAiSuggestion(`
Mở đầu: Không gian nhỏ cần cách bố trí thông minh.
Nội dung chính: Sofa giường giúp một khu vực đảm nhiệm nhiều công năng mà vẫn gọn gàng.
CTA: Nhắn Fanpage nếu bạn cần tư vấn theo diện tích thực tế.
Loại nội dung: Chia sẻ cộng đồng
`)).toMatchObject({
      body: "Sofa giường giúp một khu vực đảm nhiệm nhiều công năng mà vẫn gọn gàng.",
      contentType: "community_share",
    });
  });

  it("chỉ nhận đề xuất AI có URL Facebook Group hợp lệ và loại trùng", () => {
    const suggestions = parseFacebookGroupDiscoveryResponse(JSON.stringify({
      groups: [
        {
          name: "Cộng đồng căn hộ nhỏ",
          groupUrl: "https://www.facebook.com/groups/canhonho/",
          reason: "Thảo luận về tối ưu không gian.",
          matchScore: 91,
        },
        {
          name: "Bản trùng",
          groupUrl: "https://m.facebook.com/groups/canhonho",
          matchScore: 80,
        },
        {
          name: "Không phải Group",
          groupUrl: "https://www.facebook.com/smartfurni",
          matchScore: 99,
        },
      ],
    }), { topic: "Căn hộ & chung cư", region: "Hồ Chí Minh" });
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      name: "Cộng đồng căn hộ nhỏ",
      groupUrl: "https://www.facebook.com/groups/canhonho/",
      topic: "Căn hộ & chung cư",
      region: "Hồ Chí Minh",
      matchScore: 91,
    });
  });

  it("chuẩn hóa điểm phù hợp AI từ thang 0-1 sang phần trăm", () => {
    const suggestions = parseFacebookGroupDiscoveryResponse(JSON.stringify([{
      name: "Hội cư dân căn hộ",
      groupUrl: "https://www.facebook.com/groups/hoicudancanho/",
      matchScore: 0.86,
    }]), { topic: "Căn hộ & chung cư", region: "Hồ Chí Minh" });
    expect(suggestions[0]?.matchScore).toBe(86);
  });

  it("loại URL do AI tự viết nếu không xuất hiện trong nguồn Grounding", () => {
    const grounded = keepGroundedFacebookGroupSuggestions([
      {
        name: "Group do AI ghép slug",
        groupUrl: "https://www.facebook.com/groups/groupkhongcotrongnguon/",
        topic: "Phòng trọ",
        region: "Hồ Chí Minh",
        reason: "Tên có vẻ phù hợp.",
        matchScore: 99,
      },
      {
        name: "Tên AI cho nguồn thật",
        groupUrl: "https://www.facebook.com/groups/groupconguon/",
        topic: "Phòng trọ",
        region: "Hồ Chí Minh",
        reason: "URL có citation.",
        matchScore: 94,
      },
    ], [{
      title: "GROUP CÓ NGUỒN | Facebook",
      groupUrl: "https://www.facebook.com/groups/groupconguon/",
    }], { topic: "Phòng trọ", region: "Hồ Chí Minh" });
    expect(grounded).toHaveLength(1);
    expect(grounded[0]).toMatchObject({
      name: "GROUP CÓ NGUỒN",
      groupUrl: "https://www.facebook.com/groups/groupconguon/",
      groundedSource: true,
      matchScore: 94,
    });
  });
});

describe("AI Group Growth blueprint", () => {
  const plan = {
    nameOptions: ["Nhà nhỏ sống chất", "Tối ưu không gian Việt", "Cộng đồng nội thất đa năng"],
    selectedName: "Nhà nhỏ sống chất",
    positioning: "Cộng đồng chia sẻ giải pháp sử dụng không gian nhỏ.",
    description: "Nơi thành viên trao đổi kinh nghiệm bố trí nhà nhỏ.",
    rules: [
      "Tôn trọng thành viên",
      "Không đăng nội dung sai sự thật",
      "Không spam",
      "Ghi rõ nguồn nội dung",
      "Không công kích cá nhân",
    ],
    membershipQuestions: ["Bạn đang sống ở khu vực nào?", "Bạn quan tâm giải pháp gì?"],
    pillars: [
      {
        name: "Kiến thức",
        description: "Giải pháp thực tế",
        objective: "Giúp thành viên",
        audienceNeed: "Tối ưu diện tích",
        contentRatio: 40,
        formats: ["hướng dẫn"],
        exampleTopics: ["Bố trí phòng 20m2"],
      },
      {
        name: "Cộng đồng",
        description: "Hỏi đáp",
        objective: "Tăng tương tác",
        audienceNeed: "Nhận tư vấn",
        contentRatio: 35,
        formats: ["hỏi đáp"],
        exampleTopics: ["Góc nhà cần góp ý"],
      },
      {
        name: "Sản phẩm",
        description: "Ứng dụng sản phẩm đúng ngữ cảnh",
        objective: "Tạo tín hiệu mua",
        audienceNeed: "So sánh giải pháp",
        contentRatio: 25,
        formats: ["case study"],
        exampleTopics: ["Sofa giường cho căn hộ nhỏ"],
      },
    ],
    launchPlan: { setup: [], first7Days: [], first30Days: [] },
    kpis: {
      memberTarget30Days: 100,
      postsPerWeek: 4,
      engagementTargetPercent: 10,
      qualifiedLeadTarget30Days: 5,
    },
  };

  it("chỉ nhận blueprint có đủ nội quy, câu hỏi và ít nhất ba trụ cột", () => {
    expect(blueprintPlanSchema.parse(plan).selectedName).toBe("Nhà nhỏ sống chất");
    expect(() => blueprintPlanSchema.parse({ ...plan, pillars: plan.pillars.slice(0, 2) })).toThrow();
    expect(() => blueprintPlanSchema.parse({ ...plan, rules: plan.rules.slice(0, 4) })).toThrow();
  });

  it("xác thực ngữ cảnh sản phẩm và loại Group trước khi lưu", () => {
    const parsed = blueprintInputSchema.parse({
      name: plan.selectedName,
      groupKind: "owned",
      productIds: ["crm_product_sofa_bed"],
      targetAudience: "Người sống trong căn hộ nhỏ",
      region: "Hồ Chí Minh",
      objective: "Xây cộng đồng chia sẻ kinh nghiệm",
      plan,
    });
    expect(parsed.groupKind).toBe("owned");
    expect(totalPillarRatio(parsed.plan)).toBe(100);
    expect(() => blueprintInputSchema.parse({ ...parsed, productIds: [] })).toThrow();
  });
});
