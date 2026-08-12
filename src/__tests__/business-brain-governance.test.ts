import { describe, expect, it } from "vitest";
import { calculateKnowledgeHealth, canTransitionKnowledgeStatus } from "@/lib/business-brain-governance";
import type { KnowledgeDocument } from "@/types/business-brain";

function document(overrides: Partial<KnowledgeDocument> = {}): KnowledgeDocument {
  return {
    id: "guide-1",
    title: "Quy trình chăm sóc khách hàng",
    category: "customer_care",
    status: "draft",
    content: "Nội dung ".repeat(30),
    summary: "Hướng dẫn chăm sóc chuẩn",
    tags: ["CSKH"],
    metadata: { owner: "Trưởng phòng", audience: "Sale", reviewCycle: "Hàng quý", flowSteps: [{ id: "start" }] },
    createdAt: "2026-08-12T00:00:00.000Z",
    updatedAt: "2026-08-12T00:00:00.000Z",
    ...overrides,
  };
}

describe("business brain governance", () => {
  it("không cho tài liệu nháp xuất bản trực tiếp", () => {
    expect(canTransitionKnowledgeStatus("draft", "active")).toBe(false);
    expect(canTransitionKnowledgeStatus("draft", "in_review")).toBe(true);
    expect(canTransitionKnowledgeStatus("in_review", "approved")).toBe(true);
  });

  it("chấm sức khỏe đầy đủ sau khi được duyệt", () => {
    expect(calculateKnowledgeHealth(document({ status: "active" })).score).toBe(100);
  });

  it("nêu đúng dữ liệu quản trị còn thiếu", () => {
    const result = calculateKnowledgeHealth(document({
      summary: "",
      tags: [],
      metadata: {},
      content: "Ngắn",
    }));
    expect(result.score).toBe(0);
    expect(result.missing).toContain("Có người chịu trách nhiệm");
    expect(result.missing).toContain("Đã qua kiểm soát");
  });
});
