import { describe, expect, it } from "vitest";
import { chooseZaloAutomationAccount } from "./crm-zalo-account-routing-policy";

const accounts = [
  { accountId: "zalo-a", accountLabel: "SmartFurni" },
  { accountId: "zalo-b", accountLabel: "Nội Thất SmartFurni" },
];

describe("chooseZaloAutomationAccount", () => {
  it("giữ tài khoản đã ghim cho lệnh xếp lịch và lần gửi lại", () => {
    const result = chooseZaloAutomationAccount({
      activeAccounts: accounts,
      pinnedAccountId: "zalo-a",
      linkedInteraction: { ...accounts[1], conversationId: "customer-b" },
    });
    expect(result).toMatchObject({ accountId: "zalo-a", source: "pinned" });
  });

  it("ưu tiên tài khoản có hội thoại đã tương tác", () => {
    const result = chooseZaloAutomationAccount({
      activeAccounts: accounts,
      linkedInteraction: { ...accounts[1], conversationId: "customer-b" },
      acceptedFriendship: { ...accounts[0], conversationId: "customer-a" },
      defaultAccountId: "zalo-a",
    });
    expect(result).toMatchObject({ accountId: "zalo-b", source: "linked_interaction", conversationId: "customer-b" });
  });

  it("ưu tiên tài khoản đã kết bạn khi chưa có tương tác", () => {
    const result = chooseZaloAutomationAccount({
      activeAccounts: accounts,
      acceptedFriendship: { ...accounts[1], conversationId: "customer-b" },
      defaultAccountId: "zalo-a",
    });
    expect(result).toMatchObject({ accountId: "zalo-b", source: "accepted_friendship" });
  });

  it("dùng tài khoản mặc định thay vì tự chia đều khách mới", () => {
    const result = chooseZaloAutomationAccount({ activeAccounts: accounts, defaultAccountId: "zalo-b" });
    expect(result).toMatchObject({ accountId: "zalo-b", source: "default" });
  });
});
