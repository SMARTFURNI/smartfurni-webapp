import { describe, expect, it } from "vitest";
import {
  CRM_AUTOMATION_SOURCE_SECTIONS,
  CRM_AUTOMATION_SPEC_DOCUMENTS,
  CRM_AUTOMATION_SPEC_SOURCE,
} from "@/lib/business-brain-crm-automation-documents";

describe("Bộ 10 tài liệu đặc tả tự động hóa CRM", () => {
  it("có đúng 10 tài liệu theo thứ tự SF-AUTO-01 đến SF-AUTO-10", () => {
    expect(CRM_AUTOMATION_SPEC_DOCUMENTS).toHaveLength(10);
    expect(new Set(CRM_AUTOMATION_SPEC_DOCUMENTS.map(document => document.id)).size).toBe(10);
    expect(CRM_AUTOMATION_SPEC_DOCUMENTS.map(document => document.metadata.sequence)).toEqual(
      Array.from({ length: 10 }, (_, index) => index + 1)
    );
    expect(CRM_AUTOMATION_SPEC_DOCUMENTS.map(document => document.metadata.documentCode)).toEqual(
      Array.from({ length: 10 }, (_, index) => `SF-AUTO-${String(index + 1).padStart(2, "0")}`)
    );
  });

  it("bao phủ đúng một lần toàn bộ 19 chương nguồn", () => {
    const covered = CRM_AUTOMATION_SPEC_DOCUMENTS.flatMap(document => document.metadata.sourceSections).sort();
    expect(covered).toEqual(CRM_AUTOMATION_SOURCE_SECTIONS);
  });

  it("sẵn sàng cho Knowledge Base và có metadata quản trị", () => {
    for (const document of CRM_AUTOMATION_SPEC_DOCUMENTS) {
      expect(document.status).toBe("active");
      expect(document.source).toBe(CRM_AUTOMATION_SPEC_SOURCE);
      expect(document.content.length).toBeGreaterThan(1_200);
      expect(document.summary.length).toBeGreaterThan(50);
      expect(document.metadata.owner).not.toBe("");
      expect(document.metadata.audience).not.toBe("");
      expect(document.metadata.reviewCycle).not.toBe("");
      expect(document.metadata.version).toBe("1.0");
      expect(document.metadata.sourceFile).toBe("Bo_Dac_Ta_Tu_Dong_Hoa_CRM_SmartFurni.pdf");
      expect(document.metadata.linkedCrmModules.length).toBeGreaterThan(0);
      expect(document.metadata.developmentRequirements.length).toBeGreaterThanOrEqual(3);
      expect(document.metadata.acceptanceCriteria.length).toBeGreaterThanOrEqual(3);
      expect(document.metadata.aiProgrammingPrompt).toContain(document.metadata.documentCode);
      expect(document.metadata.aiProgrammingPrompt).toContain("Không sửa tài liệu doanh nghiệp");
      expect(document.metadata.codeVersion).not.toBe("");
      expect(document.metadata.implementationStatus).toBe("specified");
    }
  });

  it("mọi sơ đồ có node và cạnh hợp lệ để chỉnh sửa trong Flow Builder", () => {
    for (const document of CRM_AUTOMATION_SPEC_DOCUMENTS) {
      const nodes = document.metadata.flowSteps;
      const edges = document.metadata.flowEdges;
      const nodeIds = new Set(nodes.map(node => node.id));
      expect(nodes.length).toBeGreaterThanOrEqual(6);
      expect(nodeIds.size).toBe(nodes.length);
      expect(edges.length).toBeGreaterThanOrEqual(nodes.length - 1);
      for (const edge of edges) {
        expect(nodeIds.has(edge.source)).toBe(true);
        expect(nodeIds.has(edge.target)).toBe(true);
        expect(edge.source).not.toBe(edge.target);
      }
    }
  });

  it("manifest cuối cùng dẫn chiếu đủ 10 mã tài liệu", () => {
    const manifest = CRM_AUTOMATION_SPEC_DOCUMENTS[9].content;
    for (let sequence = 1; sequence <= 10; sequence += 1) {
      expect(manifest).toContain(`SF-AUTO-${String(sequence).padStart(2, "0")}`);
    }
  });
});
