import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("Zalo Inbox durable sync", () => {
  it("pins zca-js and enables receiving the account's own messages", () => {
    const packageJson = JSON.parse(source("package.json"));
    const gateway = source("src/lib/zalo-gateway.ts");

    expect(packageJson.dependencies["zca-js"]).toBe("2.1.2");
    expect(gateway).toContain("selfListen: true");
  });

  it("listens to realtime, reconnect history and the correct close event", () => {
    const gateway = source("src/lib/zalo-gateway.ts");

    expect(gateway).toContain('listener.on("message"');
    expect(gateway).toContain('listener.on("old_messages"');
    expect(gateway).toContain('listener.on("closed"');
    expect(gateway).toContain("requestOldMessages");
    expect(gateway).toContain("retryOnClose: true");
  });

  it("reads the newest database page before ordering it for the chat UI", () => {
    const store = source("src/lib/zalo-inbox-message-store.ts");

    expect(store).toMatch(/ORDER BY timestamp DESC, msg_id DESC\s+LIMIT/);
    expect(store).toContain("ORDER BY timestamp ASC, msg_id ASC");
    expect(store).toContain("ON CONFLICT (account_id, msg_id) DO UPDATE");
  });

  it("forces the latest scroll only after selected conversation data arrives", () => {
    const client = source("src/components/crm/zalo-inbox/ZaloInboxClient.tsx");

    expect(client).toContain("loadMessages = useCallback(async (convId: string, forceLatest = false, accountIdOverride?: string)");
    expect(client).toContain("if (forceLatest) forceScrollToLatestRef.current = true");
    expect(client).toContain("loadMessages(conv.id, true, conv.accountId)");

  });

  it("isolates conversations and messages by Zalo account", () => {
    const messageStore = source("src/lib/zalo-inbox-message-store.ts");
    const conversationStore = source("src/lib/zalo-inbox-store.ts");
    const client = source("src/components/crm/zalo-inbox/ZaloInboxClient.tsx");

    expect(messageStore).toContain("UNIQUE (account_id, msg_id)");
    expect(conversationStore).toContain("PRIMARY KEY (account_id, thread_id)");
    expect(client).toContain('X-Zalo-Account-Id');
    expect(client).toContain('value={selectedAccountId}');
  });

  it("keeps the send response off the Railway Bucket upload path", () => {
    const gateway = source("src/lib/zalo-gateway.ts");

    expect(gateway).toContain("scheduleOutgoingAttachmentMirror");
    expect(gateway).toContain("Không upload Zalo lần hai");
    expect(gateway).toContain("await Promise.all([");
  });

  it("reuses media-library objects instead of duplicating them in Railway", () => {
    const gateway = source("src/lib/zalo-gateway.ts");
    const librarySend = source("src/app/api/crm/zalo-inbox/media-library/send/route.ts");

    expect(librarySend).toContain("stableUrl: asset.url");
    expect(librarySend).toContain("skipMirror: true");
    expect(librarySend).toContain("media-library/thumbnail?id=");
    expect(gateway).toContain('if (!params.skipMirror && attachType === "video"');
    expect(gateway).toContain("url: params.stableUrl || persistentUrl");
    expect(gateway).toContain("hasStableStoredAttachments");
    expect(gateway).toContain("Không mirror được media gửi ngoài CRM");
  });

  it("keeps a local attachment preview until the durable URL arrives", () => {
    const client = source("src/components/crm/zalo-inbox/ZaloInboxClient.tsx");

    expect(client).toContain("withLocalAttachmentPreview");
    expect(client).toContain("releaseLocalPreviewLater");
    expect(client).toContain("!remoteHasUsableAttachment && previousHasUsableAttachment");
  });

  it("clears the composer immediately and prevents duplicate text sends", () => {
    const client = source("src/components/crm/zalo-inbox/ZaloInboxClient.tsx");

    expect(client).toContain("if (!canSendMessages || !inputText.trim() || !selectedConv || sendingRef.current) return");
    expect(client).toContain("sendingRef.current = true");
    expect(client).toContain('setInputText("")');
    expect(client).toContain("if (data.sent !== true) setInputText(current => current.trim() ? current : text)");
    expect(client).toContain("tránh gửi trùng");
  });

  it("separates Zalo Inbox view and send permissions at the UI and API boundaries", () => {
    const roles = source("src/lib/crm-roles-store.ts");
    const access = source("src/lib/zalo-inbox-access.ts");
    const client = source("src/components/crm/zalo-inbox/ZaloInboxClient.tsx");
    const sendRoute = source("src/app/api/crm/zalo-inbox/send/route.ts");
    const attachmentRoute = source("src/app/api/crm/zalo-inbox/send-attachment/route.ts");
    const mediaRoute = source("src/app/api/crm/zalo-inbox/media-library/route.ts");
    const mediaFolderRoute = source("src/app/api/crm/zalo-inbox/media-library/folders/route.ts");

    expect(roles).toContain("zalo_inbox_view: boolean");
    expect(roles).toContain("zalo_inbox_send: boolean");
    expect(access).toContain('hasRolePermission(session, "zalo_inbox_view")');
    expect(access).toContain('hasRolePermission(session, "zalo_inbox_send")');
    expect(client).toContain("Bạn có quyền xem hội thoại nhưng chưa được cấp quyền gửi tin nhắn Zalo Inbox");
    expect(sendRoute).toContain("canSendZaloInboxMessages");
    expect(attachmentRoute).toContain("canSendZaloInboxMessages");
    expect(mediaRoute).toContain("canSendZaloInboxMessages");
    expect(mediaFolderRoute).toContain("canSendZaloInboxMessages");
    expect(client).toContain('...(canSendMessages ? [{ id: "media-library"');
  });

  it("pushes each inbound realtime message to all CRM and Admin PWA accounts", () => {
    const gateway = source("src/lib/zalo-gateway.ts");
    const push = source("src/lib/zalo-inbox-push.ts");
    const store = source("src/lib/zalo-inbox-message-store.ts");
    const client = source("src/components/crm/zalo-inbox/ZaloInboxClient.tsx");

    expect(gateway).toContain("!processed.isSelf && !options.historical");
    expect(gateway).toContain("notifyInboundZaloMessage");
    expect(push).toContain('ownerScope: "crm"');
    expect(push).toContain('ownerScope: "admin"');
    expect(store).toContain("pwa_notified_at IS NULL");
    expect(client).toContain('get("conversation")');
    expect(client).toContain("subscribeToPush");
  });
});
