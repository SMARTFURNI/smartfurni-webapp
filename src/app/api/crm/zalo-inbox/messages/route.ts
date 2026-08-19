import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedZaloInboxSendSession, getAuthorizedZaloInboxSession } from "@/lib/zalo-inbox-access";
import { getRecentCanonicalZaloMessages } from "@/lib/zalo-inbox-message-store";
import {
  recallZaloMessage,
  addZaloReaction,
  forwardZaloMessage,
  sendZaloStyledMessage,
  sendZaloSticker,
  searchZaloStickers,
  sendZaloTypingEvent,
  sendZaloMessageToStranger,
} from "@/lib/zalo-gateway";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!await getAuthorizedZaloInboxSession()) {
    return NextResponse.json({ error: "Không có quyền truy cập Zalo Inbox" }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  // Nếu có action, xử lý các action đặc biệt
  if (action === "search-stickers") {
    const keyword = searchParams.get("keyword") || "";
    if (!keyword) return NextResponse.json({ success: false, error: "keyword required" }, { status: 400 });
    return NextResponse.json(await searchZaloStickers(keyword));
  }

  // Mặc định: lấy danh sách tin nhắn từ DB
  try {
    const threadId = searchParams.get("threadId");
    const accountId = searchParams.get("accountId");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!threadId) {
      return NextResponse.json({ error: "threadId is required" }, { status: 400 });
    }

    const rows = await getRecentCanonicalZaloMessages(threadId, limit, 0, accountId);

    const messages = rows.map((row) => ({
      msgId: row.msg_id,
      accountId: row.account_id,
      threadId: row.thread_id,
      fromId: row.from_id,
      toId: row.to_id,
      senderName: row.sender_name || "",
      content: row.content || "",
      attachments: (() => {
        try {
          return JSON.parse(row.attachments || "[]");
        } catch {
          return [];
        }
      })(),
      type: row.msg_type || "text",
      isSelf: row.is_self,
      timestamp: parseInt(row.timestamp) || 0,
    }));

    return NextResponse.json({ messages });
  } catch (err) {
    console.error("[API /zalo-inbox/messages]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!await getAuthorizedZaloInboxSendSession()) {
    return NextResponse.json({ error: "Không có quyền gửi tin nhắn Zalo Inbox" }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "recall": {
        const { msgId, cliMsgId, threadId, isGroup } = body;
        if (!msgId || !cliMsgId || !threadId) return NextResponse.json({ success: false, error: "msgId, cliMsgId, threadId required" }, { status: 400 });
        return NextResponse.json(await recallZaloMessage({ msgId, cliMsgId, threadId, isGroup }));
      }
      case "react": {
        const { threadId, msgId, cliMsgId, icon, isGroup } = body;
        if (!threadId || !msgId || !cliMsgId) return NextResponse.json({ success: false, error: "threadId, msgId, cliMsgId required" }, { status: 400 });
        return NextResponse.json(await addZaloReaction({ threadId, msgId, cliMsgId, icon: icon || "heart", isGroup }));
      }
      case "forward": {
        const { message, threadIds, isGroup } = body;
        if (!message || !threadIds?.length) return NextResponse.json({ success: false, error: "message and threadIds required" }, { status: 400 });
        return NextResponse.json(await forwardZaloMessage({ message, threadIds, isGroup }));
      }
      case "send-styled": {
        const { threadId, message, isGroup } = body;
        if (!threadId || !message) return NextResponse.json({ success: false, error: "threadId and message required" }, { status: 400 });
        return NextResponse.json(await sendZaloStyledMessage({ threadId, message, isGroup }));
      }
      case "send-sticker": {
        const { threadId, stickerId, stickerCateId, isGroup } = body;
        if (!threadId || stickerId == null || stickerCateId == null) return NextResponse.json({ success: false, error: "threadId, stickerId, stickerCateId required" }, { status: 400 });
        return NextResponse.json(await sendZaloSticker({ threadId, stickerId, stickerCateId, isGroup }));
      }
      case "send-typing": {
        const { threadId, isGroup } = body;
        if (!threadId) return NextResponse.json({ success: false, error: "threadId required" }, { status: 400 });
        return NextResponse.json(await sendZaloTypingEvent(threadId, isGroup));
      }
      case "send-to-stranger": {
        const { userId, message, qna } = body;
        if (!userId || !message) return NextResponse.json({ success: false, error: "userId and message required" }, { status: 400 });
        return NextResponse.json(await sendZaloMessageToStranger({ userId, message, qna }));
      }
      default:
        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
