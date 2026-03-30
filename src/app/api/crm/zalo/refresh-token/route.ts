/**
 * POST /api/crm/zalo/refresh-token
 * Làm mới Zalo access token bằng refresh token
 * Chỉ admin mới có quyền gọi API này
 */
import { getCrmSession } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";
import { refreshZaloToken } from "@/lib/zalo-cloud";

export async function POST(req: NextRequest) {
  const session = await getCrmSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({})) as { refreshToken?: string };
    const result = await refreshZaloToken(body.refreshToken);

    if (!result) {
      return NextResponse.json({
        error: "Không thể làm mới token. Kiểm tra ZALO_APP_ID, ZALO_APP_SECRET và ZALO_REFRESH_TOKEN.",
      }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      expiresIn: result.expires_in,
      message: "Token đã được làm mới. Cập nhật ZALO_ACCESS_TOKEN và ZALO_REFRESH_TOKEN trong Railway.",
    });
  } catch (e) {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
