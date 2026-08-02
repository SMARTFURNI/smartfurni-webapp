/**
 * POST /api/crm/zalo/refresh-token
 * Làm mới Zalo access token bằng refresh token
 * Chỉ admin mới có quyền gọi API này
 */
import { getCrmSession } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { refreshZaloOAAccessToken } from "@/lib/zalo-oa-store";

export async function POST() {
  const session = await getCrmSession();
  if (!session || !session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await refreshZaloOAAccessToken();
    if (!result.ok) {
      return NextResponse.json({
        error: result.error || "Không thể làm mới token. Kiểm tra App ID, App Secret và Refresh Token.",
      }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      expiresIn: result.expiresIn,
      message: "Token đã được làm mới và lưu an toàn trong CRM.",
    });
  } catch (e) {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
