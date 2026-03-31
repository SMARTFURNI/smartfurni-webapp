import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";

/**
 * POST /api/crm/facebook-scheduler/verify-token
 * Kiểm tra Page Access Token có hợp lệ không
 * Body: { pageAccessToken: string }
 */
export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { pageAccessToken } = await req.json();
  if (!pageAccessToken) {
    return NextResponse.json({ error: "Thiếu pageAccessToken" }, { status: 400 });
  }

  try {
    // Gọi Facebook Graph API để lấy thông tin page
    const res = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,name,category,fan_count&access_token=${pageAccessToken}`
    );
    const data = await res.json();

    if (data.error) {
      return NextResponse.json({
        valid: false,
        error: data.error.message || "Token không hợp lệ",
      });
    }

    return NextResponse.json({
      valid: true,
      pageId: data.id,
      pageName: data.name,
      category: data.category,
      followerCount: data.fan_count,
    });
  } catch (err) {
    return NextResponse.json({
      valid: false,
      error: (err as Error).message,
    });
  }
}
