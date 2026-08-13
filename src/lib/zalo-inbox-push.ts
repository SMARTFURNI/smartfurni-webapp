import "server-only";

import { sendPushNotification } from "./pwa-server";
import {
  claimCanonicalZaloMessagePush,
  releaseCanonicalZaloMessagePush,
} from "./zalo-inbox-message-store";

interface ZaloInboxPushInput {
  accountId: string;
  msgId: string;
  conversationId: string;
  senderName?: string | null;
  content?: string;
  attachments?: Array<{ type?: string }>;
}

function messagePreview(input: ZaloInboxPushInput): string {
  const text = (input.content || "").replace(/\s+/g, " ").trim();
  if (text) return text;
  const kinds = new Set((input.attachments || []).map(item => item.type));
  if (kinds.has("image")) return "Khách hàng vừa gửi hình ảnh.";
  if (kinds.has("video")) return "Khách hàng vừa gửi video.";
  if (kinds.has("file")) return "Khách hàng vừa gửi tệp đính kèm.";
  return "Bạn có tin nhắn Zalo mới.";
}

/** Sends an inbound Zalo message to every subscribed CRM and Admin account. */
export async function notifyInboundZaloMessage(input: ZaloInboxPushInput) {
  const claimed = await claimCanonicalZaloMessagePush(input.msgId, input.accountId);
  if (!claimed) return { deduplicated: true, crm: null, admin: null };

  const sender = input.senderName?.trim() || "Khách hàng Zalo";
  const notification = {
    title: `Tin nhắn Zalo mới · ${sender}`,
    body: messagePreview(input),
    url: `/crm/zalo-inbox?account=${encodeURIComponent(input.accountId)}&conversation=${encodeURIComponent(input.conversationId)}`,
    tag: `zalo-inbox-${input.accountId}-${input.conversationId}`,
    renotify: true,
    urgency: "high" as const,
    data: {
      type: "zalo-inbox-message",
      accountId: input.accountId,
      conversationId: input.conversationId,
      messageId: input.msgId,
    },
  };

  const [crm, admin] = await Promise.allSettled([
    sendPushNotification({ ...notification, ownerScope: "crm" }),
    sendPushNotification({ ...notification, ownerScope: "admin" }),
  ]);

  // Nếu hạ tầng push hỏng hoàn toàn, trả claim để sự kiện Zalo phát lại còn
  // cơ hội gửi. Nếu một scope đã gửi được thì giữ claim nhằm tránh tài khoản
  // ở scope đó nhận trùng cùng một tin nhắn.
  if (crm.status === "rejected" && admin.status === "rejected") {
    await releaseCanonicalZaloMessagePush(input.msgId, input.accountId).catch(() => undefined);
    throw new AggregateError([crm.reason, admin.reason], "Không gửi được Web Push Zalo Inbox");
  }

  if (crm.status === "rejected") console.error("[Zalo Inbox Push] CRM:", crm.reason);
  if (admin.status === "rejected") console.error("[Zalo Inbox Push] Admin:", admin.reason);

  return {
    deduplicated: false,
    crm: crm.status === "fulfilled" ? crm.value : null,
    admin: admin.status === "fulfilled" ? admin.value : null,
  };
}
