/**
 * GET  /api/crm/zalo-inbox/credentials — lấy thông tin đăng nhập Zalo hiện tại
 * DELETE /api/crm/zalo-inbox/credentials — xóa credentials (đăng xuất)
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { disconnectZalo, getGatewayStatus } from "@/lib/zalo-gateway";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Lấy trạng thái từ gateway (in-memory) trước
    const status = getGatewayStatus();
    if (status.isConnected) {
      return NextResponse.json({
        phone: status.phone || status.userId || null,
        isActive: true,
        hasCredentials: true,
      });
    }
    // Fallback: kiểm tra DB
    try {
      const res = await query(`SELECT user_id, display_name FROM zalo_inbox_credentials LIMIT 1`);
      if (res.rows && res.rows.length > 0) {
        const row = res.rows[0];
        return NextResponse.json({
          phone: row.display_name || row.user_id || null,
          isActive: false,
          hasCredentials: true,
        });
      }
    } catch {
      // Table chưa tồn tại — chưa từng đăng nhập
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
    await disconnectZalo();
    // ✅ Fix: xóa credentials trong đúng table (zalo_inbox_credentials)
    try {
      await query(`DELETE FROM zalo_inbox_credentials`);
    } catch {
      // Table chưa tồn tại — không sao
    }
    return NextResponse.json({ success: true, message: "Đã đăng xuất Zalo" });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
