import { describe, expect, it } from "vitest";
import { createAiCommandTools, getApprovalPresentation } from "./tools";

describe("AI Command tool registry", () => {
  it("chỉ công khai các công cụ MVP đã được kiểm soát", () => {
    const registry = createAiCommandTools();
    const names = Object.values(registry).map(item => item.name).sort();
    expect(names).toEqual([
      "add_customer_tags",
      "create_follow_up_task",
      "get_crm_summary",
      "list_specialist_agents",
      "search_business_knowledge",
      "search_customers",
    ]);
    expect(names).not.toContain("delete_customer");
    expect(names).not.toContain("send_message");
    expect(names).not.toContain("execute_sql");
  });

  it("bắt buộc phê duyệt cho mọi công cụ ghi dữ liệu", async () => {
    const registry = createAiCommandTools();
    expect(await registry.createFollowUpTask.needsApproval({} as never, {} as never)).toBe(true);
    expect(await registry.addCustomerTags.needsApproval({} as never, {} as never)).toBe(true);
    expect(await registry.searchCustomers.needsApproval({} as never, {} as never)).toBe(false);
    expect(await registry.getSummary.needsApproval({} as never, {} as never)).toBe(false);
  });

  it("gắn mức rủi ro reversible cho thao tác CRM trong MVP", () => {
    expect(getApprovalPresentation("create_follow_up_task").riskLevel).toBe("reversible");
    expect(getApprovalPresentation("add_customer_tags").riskLevel).toBe("reversible");
    expect(getApprovalPresentation("unknown_tool").riskLevel).toBe("sensitive");
  });
});
