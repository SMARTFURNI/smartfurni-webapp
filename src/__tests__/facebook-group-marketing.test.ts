import { describe, expect, it } from "vitest";
import {
  analyzeFacebookGroupRules, calculateFacebookGroupScore, contentSimilarityPercent,
  extractFacebookGroupSourceCode, generateFacebookGroupSourceCode, parseFacebookGroupPostUrl,
  parseFacebookGroupAiSuggestion, parseFacebookGroupUrl, validateFacebookGroupSchedule,
} from "@/lib/facebook-group-marketing-business";
import { DEFAULT_FACEBOOK_GROUP_SETTINGS as settings } from "@/lib/facebook-group-marketing-types";
import { canDeleteFacebookGroupMarketing } from "@/lib/facebook-group-marketing-permissions";

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
});
