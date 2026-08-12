import { describe, expect, it } from "vitest";
import type { RawLead } from "./crm-raw-lead-store";
import { buildLeadFromRawLead, classifyRawLead, mergeStandardizedLead, normalizeCrmPhone } from "./crm-lead-standardization";

function raw(overrides: Partial<RawLead> = {}): RawLead {
  return { id: "raw-1", source: "facebook_lead", fullName: "Nguyễn Văn A", phone: "+84 912 345 678", email: "A@EXAMPLE.COM ", status: "claimed", createdAt: "2026-08-12T00:00:00.000Z", ...overrides };
}

describe("CRM lead standardization", () => {
  it("chuẩn hóa số điện thoại Việt Nam", () => {
    expect(normalizeCrmPhone("+84 912 345 678")).toBe("0912345678");
  });

  it("nhận diện đại lý quan tâm sofa giường và giữ nguồn chiến dịch", () => {
    const result = classifyRawLead(raw({ customerRole: "Đại lý", campaignName: "Tìm đại lý sofa giường", message: "Cần báo giá sỉ số lượng" }));
    expect(result.customerSegment).toBe("dealer");
    expect(result.interestedProducts).toContain("sofa_bed");
    expect(result.tags).toContain("SEG:DAI_LY");
    expect(result.source).toBe("Facebook Ads");
    expect(result.leadTemperature).toBe("hot");
  });

  it("tạo hồ sơ mua lẻ mặc định thay vì gán sai thành chủ đầu tư", () => {
    const lead = buildLeadFromRawLead(raw({ formName: "Báo giá sofa giường" }), "Nhân viên A");
    expect(lead.type).toBe("retail");
    expect(lead.email).toBe("a@example.com");
    expect(lead.rawLeadIds).toEqual(["raw-1"]);
  });

  it("hợp nhất dấu vết và sản phẩm mà không ghi đè người phụ trách", () => {
    const incoming = buildLeadFromRawLead(raw({ id: "raw-2", formName: "Giường công thái học" }), "Nhân viên B");
    const existing = { ...incoming, id: "lead-1", createdAt: "2026-08-01", updatedAt: "2026-08-01", assignedTo: "Nhân viên A", rawLeadIds: ["raw-1"], interestedProducts: ["sofa_bed" as const] };
    const merged = mergeStandardizedLead(existing, incoming);
    expect(merged.assignedTo).toBe("Nhân viên A");
    expect(merged.rawLeadIds).toEqual(["raw-1", "raw-2"]);
    expect(merged.interestedProducts).toEqual(expect.arrayContaining(["sofa_bed", "ergonomic_bed"]));
  });
});
