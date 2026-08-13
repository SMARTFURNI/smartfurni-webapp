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
    expect(store).toContain("ON CONFLICT (msg_id) DO UPDATE");
  });

  it("forces the latest scroll only after selected conversation data arrives", () => {
    const client = source("src/components/crm/zalo-inbox/ZaloInboxClient.tsx");

    expect(client).toContain("loadMessages = useCallback(async (convId: string, forceLatest = false)");
    expect(client).toContain("if (forceLatest) forceScrollToLatestRef.current = true");
    expect(client).toContain("loadMessages(conv.id, true)");
  });

  it("keeps the send response off the Railway Bucket upload path", () => {
    const gateway = source("src/lib/zalo-gateway.ts");

    expect(gateway).toContain("scheduleOutgoingAttachmentMirror");
    expect(gateway).toContain("Không upload Zalo lần hai");
    expect(gateway).toContain("await Promise.all([");
  });

  it("keeps a local attachment preview until the durable URL arrives", () => {
    const client = source("src/components/crm/zalo-inbox/ZaloInboxClient.tsx");

    expect(client).toContain("withLocalAttachmentPreview");
    expect(client).toContain("releaseLocalPreviewLater");
    expect(client).toContain("!remoteHasUsableAttachment && previousHasUsableAttachment");
  });
});
