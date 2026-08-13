/**
 * GET  /api/crm/zalo-inbox/credentials — lấy thông tin đăng nhập Zalo hiện tại
 * DELETE /api/crm/zalo-inbox/credentials — xóa credentials (đăng xuất)
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { canAccessZaloInbox } from "@/lib/zalo-inbox-access";
import { disconnectZalo, getGatewayStatus } from "@/lib/zalo-gateway";
import { listZaloAccounts } from "@/lib/zalo-account-store";

export async function GET(req: NextRequest) {
  const session = await getCrmSession();
  if (!await canAccessZaloInbox(session)) {
    return NextResponse.json({ error: "Không có quyền truy cập Zalo Inbox" }, { status: session ? 403 : 401 });
  }

  try {
    // Lấy trạng thái từ gateway (in-memory) trước
    const accountId = new URL(req.url).searchParams.get("accountId") || undefined;
    const status = getGatewayStatus(accountId);
    if (status.isConnected) {
      return NextResponse.json({
        phone: status.phone || status.userId || null,
        isActive: true,
        hasCredentials: true,
      });
    }
    const account = accountId
      ? (await listZaloAccounts()).find(item => item.id === accountId)
      : (await listZaloAccounts())[0];
    if (account) {
      return NextResponse.json({
        phone: account.displayName || account.userId,
        isActive: account.isActive,
        hasCredentials: true,
      });
    }
    return NextResponse.json(null);
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getCrmSession();
  if (!session || !session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ✅ Fix: dùng disconnectZalo (tên đúng) thay vì disconnectZaloGateway
    const accountId = new URL(req.url).searchParams.get("accountId") || undefined;
    await disconnectZalo(accountId, true);
    return NextResponse.json({ success: true, message: "Đã đăng xuất Zalo" });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
