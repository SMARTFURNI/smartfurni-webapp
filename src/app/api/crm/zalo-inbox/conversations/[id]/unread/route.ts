import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { canAccessZaloInbox } from "@/lib/zalo-inbox-access";
import { markConversationAsUnread } from "@/lib/zalo-inbox-store";

export async function POST(
  req: NextRequest,
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
    const accountId = new URL(req.url).searchParams.get("accountId") || undefined;
    if (!accountId) return NextResponse.json({ error: "Thiếu accountId" }, { status: 400 });
    await markConversationAsUnread(id, accountId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[zalo-inbox/unread]", error);
    return NextResponse.json({ error: "Không thể đánh dấu chưa đọc" }, { status: 500 });
  }
}
