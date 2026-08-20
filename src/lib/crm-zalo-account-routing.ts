import "server-only";

import { queryOne } from "@/lib/db";
import type { Lead } from "@/lib/crm-types";
import { ensureZaloFriendshipSchema, getZaloFriendshipSettings } from "@/lib/crm-zalo-friendship";
import { ensureZaloInboxTables } from "@/lib/zalo-inbox-store";
import { ensureCanonicalZaloMessageSchema } from "@/lib/zalo-inbox-message-store";
import { listZaloAccounts } from "@/lib/zalo-account-store";
import {
  chooseZaloAutomationAccount,
  type ZaloAutomationAccountCandidate,
  type ZaloAutomationAccountResolution,
} from "@/lib/crm-zalo-account-routing-policy";

function normalizePhone(value: string | null | undefined) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("84")) return `0${digits.slice(2)}`;
  return digits;
}

interface ConversationRoutingRow {
  account_id: string;
  thread_id: string;
  last_inbound_at: string | null;
}

interface FriendshipRoutingRow {
  account_id: string;
  zalo_uid: string | null;
}

/**
 * Chọn tài khoản Zalo cho workflow theo một chính sách thống nhất:
 * tài khoản đã ghim -> hội thoại có phản hồi -> đã kết bạn -> hội thoại đã liên kết
 * -> tài khoản workflow ưu tiên -> tài khoản mặc định -> tài khoản hoạt động đầu tiên.
 */
export async function resolveAutomationZaloAccount(input: {
  lead: Lead;
  pinnedAccountId?: string;
  preferredAccountId?: string;
}): Promise<ZaloAutomationAccountResolution | null> {
  const accounts = (await listZaloAccounts()).filter(account => account.isActive);
  const activeAccounts: ZaloAutomationAccountCandidate[] = accounts.map(account => ({
    accountId: account.id,
    accountLabel: account.label || account.displayName,
  }));
  if (!activeAccounts.length) return null;

  const activeIds = activeAccounts.map(account => account.accountId);
  const phone = normalizePhone(input.lead.zaloPhone || input.lead.phone);
  await Promise.all([
    ensureZaloInboxTables(),
    ensureCanonicalZaloMessageSchema(),
    ensureZaloFriendshipSchema(),
  ]);

  const conversation = await queryOne<ConversationRoutingRow>(
    `SELECT c.account_id,c.thread_id,
       (SELECT MAX(m.timestamp)::text FROM zalo_inbox_messages_v2 m
        WHERE m.account_id=c.account_id AND m.thread_id=c.thread_id AND m.is_self=FALSE) AS last_inbound_at
     FROM zalo_conversations_v2 c
     WHERE c.account_id=ANY($2::text[])
       AND (
         c.lead_id=$1
         OR ($3<>'' AND regexp_replace(COALESCE(c.phone,''),'[^0-9]','','g') IN ($3,$4))
       )
     ORDER BY
       ((SELECT MAX(m.timestamp) FROM zalo_inbox_messages_v2 m
         WHERE m.account_id=c.account_id AND m.thread_id=c.thread_id AND m.is_self=FALSE) IS NULL) ASC,
       CASE WHEN c.lead_id=$1 THEN 0 ELSE 1 END,
       (SELECT MAX(m.timestamp) FROM zalo_inbox_messages_v2 m
        WHERE m.account_id=c.account_id AND m.thread_id=c.thread_id AND m.is_self=FALSE) DESC NULLS LAST,
       c.last_message_at DESC NULLS LAST
     LIMIT 1`,
    [input.lead.id, activeIds, phone, phone.startsWith("0") ? `84${phone.slice(1)}` : phone],
  ).catch(() => null);

  const friendship = await queryOne<FriendshipRoutingRow>(
    `SELECT account_id,zalo_uid FROM crm_zalo_friendships
     WHERE lead_id=$1 AND status='accepted' AND account_id=ANY($2::text[])
     ORDER BY accepted_at DESC NULLS LAST,updated_at DESC LIMIT 1`,
    [input.lead.id, activeIds],
  ).catch(() => null);
  const settings = await getZaloFriendshipSettings();
  const accountCandidate = (accountId: string, conversationId?: string | null) => {
    const account = activeAccounts.find(item => item.accountId === accountId);
    return account ? { ...account, conversationId: conversationId || undefined } : null;
  };
  const conversationCandidate = conversation
    ? accountCandidate(conversation.account_id, conversation.thread_id)
    : null;

  return chooseZaloAutomationAccount({
    activeAccounts,
    pinnedAccountId: input.pinnedAccountId,
    preferredAccountId: input.preferredAccountId,
    defaultAccountId: settings.defaultAccountId,
    linkedInteraction: conversation?.last_inbound_at ? conversationCandidate : null,
    acceptedFriendship: friendship
      ? accountCandidate(friendship.account_id, friendship.zalo_uid)
      : null,
    linkedConversation: conversationCandidate,
  });
}
