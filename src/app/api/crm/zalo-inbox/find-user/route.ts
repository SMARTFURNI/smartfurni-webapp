import { NextRequest, NextResponse } from "next/server";
import { findZaloUserByPhone } from "@/lib/zalo-gateway";
import { getAuthorizedZaloInboxSession } from "@/lib/zalo-inbox-access";

/**
 * GET /api/crm/zalo-inbox/find-user?phone=0912345678
 * Tìm user Zalo qua số điện thoại
 */
export async function GET(req: NextRequest) {
  if (!await getAuthorizedZaloInboxSession()) return NextResponse.json({ error: "Không có quyền truy cập Zalo Inbox" }, { status: 403 });
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");
    const accountId = searchParams.get("accountId") || undefined;

    if (!phone) {
      return NextResponse.json({ success: false, error: "Thiếu tham số phone" }, { status: 400 });
    }

    // Chuẩn hóa số điện thoại (bỏ dấu + nếu có, đảm bảo bắt đầu bằng 0 hoặc 84)
    const normalizedPhone = phone.replace(/\s+/g, "").replace(/^\+84/, "0");

    const result = await findZaloUserByPhone(normalizedPhone, accountId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
