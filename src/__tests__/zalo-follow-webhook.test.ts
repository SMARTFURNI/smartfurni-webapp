import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock, processedFollowEvents } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  processedFollowEvents: new Set<string>(),
}));

vi.mock("@/lib/db", () => ({ query: queryMock }));

import { recordZaloWebhookEvent } from "@/lib/zalo-oa-store";

describe("Zalo OA follow webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    processedFollowEvents.clear();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: 0,
      message: "Success",
      data: { message_id: "welcome-message-1" },
    }), { status: 200, headers: { "content-type": "application/json" } })));

    queryMock.mockImplementation(async (sql: string, params?: unknown[]) => {
      if (sql.includes("INSERT INTO crm_zalo_follow_events")) {
        const eventKey = String(params?.[0] || "");
        if (processedFollowEvents.has(eventKey)) return [];
        processedFollowEvents.add(eventKey);
        return [{ event_key: eventKey }];
      }
      if (sql.includes("SELECT * FROM crm_zalo_config WHERE id = 'default'")) {
        return [{
          id: "default",
          is_active: true,
          access_token: "test-access-token",
          follow_welcome_enabled: true,
          follow_welcome_message: "Chào {{name}}, cảm ơn bạn đã quan tâm SmartFurni.",
        }];
      }
      if (sql.includes("SELECT * FROM crm_zalo_conversations WHERE user_id=$1")) {
        return [{
          user_id: String(params?.[0] || ""),
          display_name: "Nguyễn An",
          phone: "",
          avatar: "",
          last_user_interaction: new Date().toISOString(),
          last_message_preview: "Đã quan tâm Zalo OA",
          last_message_at: new Date().toISOString(),
          unread_count: 0,
          tags: [],
          tag_ids: [],
          resolved_tags: [],
          ai_status: "idle",
        }];
      }
      return [];
    });
  });

  it("creates an eligible conversation and sends one welcome for a follow event", async () => {
    const payload = {
      event_name: "follow",
      timestamp: String(Date.now()),
      sender: { id: "zalo-user-1", display_name: "Nguyễn An" },
      recipient: { id: "smartfurni-oa" },
    };

    await expect(recordZaloWebhookEvent(payload)).resolves.toMatchObject({
      handled: true,
      welcomeSent: true,
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("https://openapi.zalo.me/v3.0/oa/message/cs", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ access_token: "test-access-token" }),
      body: JSON.stringify({
        recipient: { user_id: "zalo-user-1" },
        message: { text: "Chào Nguyễn An, cảm ơn bạn đã quan tâm SmartFurni." },
      }),
    }));
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO crm_zalo_conversations"),
      expect.arrayContaining(["zalo-user-1", "Nguyễn An"]),
    );
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO crm_zalo_messages"),
      expect.arrayContaining([expect.any(String), "zalo-user-1", "consultation", expect.any(String), "automation"]),
    );
  });

  it("does not send twice when Zalo retries the same follow event", async () => {
    const payload = {
      event_name: "follow",
      timestamp: "1785686400000",
      sender: { id: "zalo-user-1", display_name: "Nguyễn An" },
    };

    await recordZaloWebhookEvent(payload);
    await expect(recordZaloWebhookEvent(payload)).resolves.toMatchObject({
      handled: true,
      welcomeSent: false,
      duplicate: true,
    });

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("accepts a follow event wrapped inside data with sender metadata at the root", async () => {
    const payload = {
      timestamp: "1785686400001",
      sender: { id: "zalo-user-2", display_name: "Trần Bình" },
      data: { event_name: "follow" },
    };

    await expect(recordZaloWebhookEvent(payload)).resolves.toMatchObject({
      handled: true,
      welcomeSent: true,
    });

    expect(fetch).toHaveBeenCalledWith("https://openapi.zalo.me/v3.0/oa/message/cs", expect.objectContaining({
      body: JSON.stringify({
        recipient: { user_id: "zalo-user-2" },
        message: { text: "Chào Trần Bình, cảm ơn bạn đã quan tâm SmartFurni." },
      }),
    }));
  });
});
