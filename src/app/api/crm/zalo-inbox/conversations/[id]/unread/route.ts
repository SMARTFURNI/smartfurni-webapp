import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { canAccessZaloInbox } from "@/lib/zalo-inbox-access";
import { markConversationAsUnread } from "@/lib/zalo-inbox-store";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCrmSession();
  if (!await canAccessZaloInbox(session)) {
    return NextResponse.json(
      { error: "Không có quyền truy cập Zalo Inbox" },
      { status: session ? 403 : 401 }
    );
  }

  try {
    const { id } = await params;
    await markConversationAsUnread(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[zalo-inbox/unread]", error);
    return NextResponse.json({ error: "Không thể đánh dấu chưa đọc" }, { status: 500 });
  }
}
