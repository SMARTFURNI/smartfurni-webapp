import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedZaloInboxSendSession } from "@/lib/zalo-inbox-access";
import { getConversationById, linkConversationToLead } from "@/lib/zalo-inbox-store";
import { getLead } from "@/lib/crm-store";
import { getZaloFriendRequestStatus, setZaloFriendNickname } from "@/lib/zalo-gateway";
import { buildZaloCrmAlias } from "@/lib/crm-zalo-profile-sync";
import { normalizeZaloFriendPhone } from "@/lib/crm-zalo-friendship-message";

export async function POST(req: NextRequest) {
  if (!await getAuthorizedZaloInboxSendSession()) {
    return NextResponse.json({ error: "Không có quyền cập nhật hồ sơ Zalo" }, { status: 403 });
  }
  try {
    const body = await req.json() as { accountId?: string; conversationId?: string; leadId?: string };
    if (!body.accountId || !body.conversationId || !body.leadId) {
      return NextResponse.json({ error: "Thiếu tài khoản Zalo, hội thoại hoặc hồ sơ CRM" }, { status: 400 });
    }
    const [conversation, lead] = await Promise.all([
      getConversationById(body.conversationId, body.accountId),
      getLead(body.leadId),
    ]);
    if (!conversation || !lead) return NextResponse.json({ error: "Không tìm thấy hội thoại hoặc khách hàng" }, { status: 404 });

    const linkedDirectly = conversation.leadId === lead.id;
    const samePhone = Boolean(
      conversation.phone
      && normalizeZaloFriendPhone(conversation.phone) === normalizeZaloFriendPhone(lead.zaloPhone || lead.phone),
    );
    if (!linkedDirectly && !samePhone) {
      return NextResponse.json({ error: "Hội thoại chưa được liên kết đúng với hồ sơ CRM này" }, { status: 409 });
    }

    const userId = conversation.zaloUserId || conversation.id;
    const friendship = await getZaloFriendRequestStatus(userId, body.accountId);
    if (!friendship.success || !friendship.status?.isFriend) {
      return NextResponse.json({ error: "Chỉ có thể đồng bộ tên gợi nhớ sau khi đã kết bạn Zalo" }, { status: 409 });
    }

    const alias = buildZaloCrmAlias(lead);
    const result = await setZaloFriendNickname(userId, alias, body.accountId);
    if (!result.success) return NextResponse.json({ error: result.error || "Không thể cập nhật tên gợi nhớ" }, { status: 400 });
    await linkConversationToLead(conversation.id, lead.id, lead.zaloPhone || lead.phone || null, body.accountId);
    return NextResponse.json({ success: true, alias });
  } catch (error) {
    console.error("[zalo-inbox/crm-profile] Sync failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể đồng bộ hồ sơ CRM sang Zalo" }, { status: 500 });
  }
}
