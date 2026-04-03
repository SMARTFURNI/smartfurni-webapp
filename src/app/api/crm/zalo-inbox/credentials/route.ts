/**
 * GET  /api/crm/zalo-inbox/credentials — lấy thông tin đăng nhập Zalo hiện tại
 * DELETE /api/crm/zalo-inbox/credentials — xóa credentials (đăng xuất)
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getActiveZaloCredentials } from "@/lib/zalo-inbox-store";
import { disconnectZaloGateway } from "@/lib/zalo-gateway";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const creds = await getActiveZaloCredentials();
    if (!creds) {
      return NextResponse.json(null);
    }
    return NextResponse.json({
      id: creds.id,
      phone: creds.phone,
      isActive: creds.isActive,
      lastConnected: creds.lastConnected,
      hasCredentials: true,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getCrmSession();
  if (!session || !session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await disconnectZaloGateway();
    const db = getDb();
    await db.query(`UPDATE zalo_credentials SET is_active = FALSE`);
    return NextResponse.json({ success: true, message: "Đã đăng xuất Zalo" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
