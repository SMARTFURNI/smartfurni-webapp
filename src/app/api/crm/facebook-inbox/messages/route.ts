import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getPages, loadFacebookSchedulerFromDb } from "@/lib/crm-facebook-scheduler-store";

export const dynamic = "force-dynamic";

let loaded = false;
async function ensureLoaded() {
  if (!loaded) { await loadFacebookSchedulerFromDb(); loaded = true; }
}

/**
 * GET /api/crm/facebook-inbox/messages?pageId=<internal_id>&conversationId=<fb_conv_id>&before=<cursor>
 * Lấy danh sách messages trong một conversation
 */
export async function GET(request: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureLoaded();

  const { searchParams } = new URL(request.url);
  const pageId = searchParams.get("pageId");
  const conversationId = searchParams.get("conversationId");
  const before = searchParams.get("before") || "";

  if (!pageId || !conversationId) {
    return NextResponse.json({ error: "Thiếu pageId hoặc conversationId" }, { status: 400 });
  }

  const pages = getPages();
  const page = pages.find(p => p.id === pageId);
  if (!page) {
    return NextResponse.json({ error: "Không tìm thấy Fanpage" }, { status: 404 });
  }

  try {
    const fields = "id,message,from,to,created_time,attachments,sticker";
    let url = `https://graph.facebook.com/v19.0/${conversationId}/messages?fields=${fields}&limit=30&access_token=${page.pageAccessToken}`;
    if (before) url += `&before=${before}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message, code: data.error.code }, { status: 400 });
    }

    // Normalize messages — newest first from API, reverse for display
    const messages = (data.data || []).map((msg: {
      id: string;
      message?: string;
      from?: { id: string; name: string };
      to?: { data: Array<{ id: string; name: string }> };
      created_time?: string;
      attachments?: { data: Array<{ type: string; image_data?: { url: string; preview_url: string }; file_url?: string; name?: string; mime_type?: string; video_data?: { url: string; preview_url: string } }> };
      sticker?: string;
    }) => {
      const isSelf = msg.from?.id === page.pageId;
      const attachments = (msg.attachments?.data || []).map((att) => ({
        type: att.type,
        imageUrl: att.image_data?.url || att.image_data?.preview_url,
        fileUrl: att.file_url,
        fileName: att.name,
        mimeType: att.mime_type,
        videoUrl: att.video_data?.url,
        videoPreview: att.video_data?.preview_url,
      }));

      return {
        id: msg.id,
        message: msg.message || "",
        from: msg.from,
        isSelf,
        createdTime: msg.created_time,
        attachments,
        sticker: msg.sticker,
      };
    });

    // Đảo ngược để hiển thị cũ → mới
    messages.reverse();

    return NextResponse.json({
      messages,
      paging: data.paging || null,
    });
  } catch (err) {
    console.error("[facebook-inbox] messages error:", err);
    return NextResponse.json({ error: "Lỗi kết nối Facebook API" }, { status: 500 });
  }
}
