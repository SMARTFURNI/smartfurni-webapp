import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getPages, loadFacebookSchedulerFromDb } from "@/lib/crm-facebook-scheduler-store";

export const dynamic = "force-dynamic";

let loaded = false;
async function ensureLoaded() {
  if (!loaded) { await loadFacebookSchedulerFromDb(); loaded = true; }
}

/**
 * GET /api/crm/facebook-inbox/conversations?pageId=<internal_id>&after=<cursor>
 * Lấy danh sách conversations từ Facebook Messenger API cho một fanpage
 */
export async function GET(request: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureLoaded();

  const { searchParams } = new URL(request.url);
  const pageId = searchParams.get("pageId"); // internal DB id
  const after = searchParams.get("after") || "";

  if (!pageId) {
    return NextResponse.json({ error: "Thiếu pageId" }, { status: 400 });
  }

  const pages = getPages();
  const page = pages.find(p => p.id === pageId);
  if (!page) {
    return NextResponse.json({ error: "Không tìm thấy Fanpage" }, { status: 404 });
  }

  try {
    // Facebook Graph API: lấy conversations của page
    const fields = "id,snippet,updated_time,message_count,unread_count,participants,can_reply,is_subscribed";
    let url = `https://graph.facebook.com/v19.0/${page.pageId}/conversations?fields=${fields}&limit=30&access_token=${page.pageAccessToken}`;
    if (after) url += `&after=${after}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message, code: data.error.code }, { status: 400 });
    }

    // Normalize conversations
    const conversations = (data.data || []).map((conv: {
      id: string;
      snippet?: string;
      updated_time?: string;
      message_count?: number;
      unread_count?: number;
      participants?: { data: Array<{ id: string; name: string; email?: string; pic?: string }> };
      can_reply?: boolean;
    }) => {
      // Tìm người dùng (không phải page)
      const participants = conv.participants?.data || [];
      const user = participants.find((p: { id: string; name: string }) => p.id !== page.pageId) || participants[0];

      return {
        id: conv.id,
        snippet: conv.snippet || "",
        updatedTime: conv.updated_time,
        messageCount: conv.message_count || 0,
        unreadCount: conv.unread_count || 0,
        canReply: conv.can_reply !== false,
        user: user ? {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.id ? `https://graph.facebook.com/${user.id}/picture?type=square&access_token=${page.pageAccessToken}` : null,
        } : null,
      };
    });

    return NextResponse.json({
      conversations,
      paging: data.paging || null,
      pageInfo: {
        id: page.id,
        pageId: page.pageId,
        pageName: page.pageName,
      },
    });
  } catch (err) {
    console.error("[facebook-inbox] conversations error:", err);
    return NextResponse.json({ error: "Lỗi kết nối Facebook API" }, { status: 500 });
  }
}
