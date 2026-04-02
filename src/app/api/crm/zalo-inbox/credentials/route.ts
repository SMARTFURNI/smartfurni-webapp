/**
 * POST /api/crm/zalo-inbox/credentials — lưu credentials Zalo
 * GET  /api/crm/zalo-inbox/credentials — lấy credentials hiện tại (ẩn sensitive fields)
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { saveZaloCredentials, getActiveZaloCredentials } from "@/lib/zalo-inbox-store";

export async function GET() {
  const session = await getCrmSession() as any;
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Chỉ Admin mới có thể xem thông tin này" }, { status: 403 });
  }

  const creds = await getActiveZaloCredentials();
  if (!creds) return NextResponse.json(null);

  // Ẩn cookies và IMEI đầy đủ
  return NextResponse.json({
    phone: creds.phone,
    isActive: creds.isActive,
    lastConnected: creds.lastConnected,
    createdAt: creds.createdAt,
    hasCredentials: true,
    imeiPreview: creds.imei.slice(0, 8) + "...",
  });
}

export async function POST(req: NextRequest) {
  const session = await getCrmSession() as any;
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Chỉ Admin mới có thể cấu hình Zalo" }, { status: 403 });
  }

  const body = await req.json();
  const { phone, imei, cookies, userAgent } = body;

  if (!phone || !imei || !cookies) {
    return NextResponse.json(
      { error: "Thiếu thông tin: phone, imei, cookies là bắt buộc" },
      { status: 400 }
    );
  }

  // Validate cookies là JSON hợp lệ
  try {
    JSON.parse(cookies);
  } catch {
    return NextResponse.json({ error: "Cookies phải là JSON hợp lệ" }, { status: 400 });
  }

  const creds = await saveZaloCredentials({
    phone,
    imei,
    cookies,
    userAgent: userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  });

  return NextResponse.json({
    success: true,
    phone: creds.phone,
    message: "Đã lưu thông tin đăng nhập Zalo. Nhấn 'Kết nối' để bắt đầu.",
  });
}
