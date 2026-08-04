import { describe, expect, it } from "vitest";
import { createAiCommandTools, getApprovalPresentation } from "./tools";

describe("AI Command tool registry", () => {
  it("công khai bộ công cụ Workspace đã được kiểm soát", () => {
    const registry = createAiCommandTools();
    const names = Object.values(registry).map(item => item.name).sort();
    expect(names).toEqual([
      "add_customer_tags",
      "create_follow_up_task",
      "get_admin_snapshot",
      "get_crm_summary",
      "get_customer_care_snapshot",
      "get_marketing_snapshot",
      "get_orders_snapshot",
      "list_specialist_agents",
      "search_business_knowledge",
      "search_customers",
      "search_zalo_customers",
      "send_zalo_consultation",
    ]);
    expect(names).not.toContain("delete_customer");
    expect(names).not.toContain("send_message_without_approval");
    expect(names).not.toContain("execute_sql");
  });

  it("bắt buộc phê duyệt cho mọi công cụ ghi dữ liệu", async () => {
    const registry = createAiCommandTools();
    expect(await registry.createFollowUpTask.needsApproval({} as never, {} as never)).toBe(true);
    expect(await registry.addCustomerTags.needsApproval({} as never, {} as never)).toBe(true);
    expect(await registry.sendZaloMessage.needsApproval({} as never, {} as never)).toBe(true);
    expect(await registry.searchCustomers.needsApproval({} as never, {} as never)).toBe(false);
    expect(await registry.getSummary.needsApproval({} as never, {} as never)).toBe(false);
    expect(await registry.getOrdersSnapshot.needsApproval({} as never, {} as never)).toBe(false);
  });

  it("gắn mức rủi ro reversible cho thao tác CRM trong MVP", () => {
    expect(getApprovalPresentation("create_follow_up_task").riskLevel).toBe("reversible");
    expect(getApprovalPresentation("add_customer_tags").riskLevel).toBe("reversible");
    expect(getApprovalPresentation("send_zalo_consultation").riskLevel).toBe("external");
    expect(getApprovalPresentation("unknown_tool").riskLevel).toBe("sensitive");
  });
});
