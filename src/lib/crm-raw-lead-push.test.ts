import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendPushNotificationMock } = vi.hoisted(() => ({
  sendPushNotificationMock: vi.fn(),
}));

vi.mock("@/lib/pwa-server", () => ({
  sendPushNotification: sendPushNotificationMock,
}));

import { notifyNewDataPoolLead } from "./crm-raw-lead-push";

describe("Data Pool PWA push", () => {
  beforeEach(() => {
    sendPushNotificationMock.mockReset();
    sendPushNotificationMock.mockResolvedValue({ matched: 1, sent: 1, removed: 0, failed: 0, errors: [] });
  });

  it("broadcasts a new lead to every CRM and Admin subscription", async () => {
    await notifyNewDataPoolLead({
      id: "lead-123",
      fullName: "  Nguyễn   Văn A  ",
      source: "facebook_lead",
      campaignName: "Sofa thông minh",
    });

    expect(sendPushNotificationMock).toHaveBeenCalledTimes(2);
    expect(sendPushNotificationMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      ownerScope: "crm",
      title: "Data Pool có lead mới",
      body: "Nguyễn Văn A · Facebook Lead · Sofa thông minh",
      url: "/crm/data-pool",
      tag: "data-pool-lead-lead-123",
      renotify: true,
      urgency: "high",
      data: {
        type: "new-data-pool-lead",
        leadId: "lead-123",
        source: "facebook_lead",
      },
    }));
    expect(sendPushNotificationMock).toHaveBeenNthCalledWith(2, expect.objectContaining({ ownerScope: "admin" }));
  });

  it("still delivers to Admin when the CRM push scope fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    sendPushNotificationMock
      .mockRejectedValueOnce(new Error("CRM push unavailable"))
      .mockResolvedValueOnce({ matched: 2, sent: 2, removed: 0, failed: 0, errors: [] });

    const result = await notifyNewDataPoolLead({
      id: "lead-456",
      fullName: "Khách mới",
      source: "manual",
    });

    expect(result.crm).toBeNull();
    expect(result.admin).toEqual(expect.objectContaining({ sent: 2 }));
    consoleError.mockRestore();
  });
});
