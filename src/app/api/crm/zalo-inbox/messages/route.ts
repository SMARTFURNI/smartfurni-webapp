import { NextRequest, NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/admin-auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

interface MessageRow {
  msg_id: string;
  thread_id: string;
  from_id: string;
  to_id: string;
  content: string;
  attachments: string;
  msg_type: string;
  is_self: boolean;
  timestamp: string;
}

export async function GET(request: NextRequest) {
  try {
    await requireCrmAccess();

    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get("threadId");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!threadId) {
      return NextResponse.json({ error: "threadId is required" }, { status: 400 });
    }

    const rows = await query<MessageRow>(
      `SELECT msg_id, thread_id, from_id, to_id, content, attachments, msg_type, is_self, timestamp
       FROM zalo_inbox_messages
       WHERE thread_id = $1
       ORDER BY timestamp ASC
       LIMIT $2`,
      [threadId, limit]
    );

    const messages = rows.map((row) => ({
      msgId: row.msg_id,
      threadId: row.thread_id,
      fromId: row.from_id,
      toId: row.to_id,
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
