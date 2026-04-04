import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getQuote } from "@/lib/crm-quotes-store";
import { getLead } from "@/lib/crm-leads-store";
import {
  initZaloGateway,
  ensureZaloConnected,
  isZaloConnected,
  findZaloUserByPhone,
  sendZaloMessage,
} from "@/lib/zalo-gateway";
import { getCompanyInfo } from "@/lib/crm-settings-store";
import { formatVND } from "@/lib/crm-types";

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { quoteId, message: customMessage } = await req.json();
    if (!quoteId) return NextResponse.json({ error: "quoteId is required" }, { status: 400 });

    // Lấy thông tin báo giá
    const quote = await getQuote(quoteId);
    if (!quote) return NextResponse.json({ error: "Không tìm thấy báo giá" }, { status: 404 });

    // Lấy thông tin khách hàng
    const lead = quote.leadId ? await getLead(quote.leadId) : null;
    const phone = lead?.phone;
    if (!phone) {
      return NextResponse.json({ error: "Khách hàng không có số điện thoại" }, { status: 400 });
    }

    // Lấy thông tin công ty
    const company = await getCompanyInfo();

    // Đảm bảo Zalo Personal đã kết nối
    await initZaloGateway();
    // Chờ tối đa 5 giây để kết nối
    let waited = 0;
    while (!isZaloConnected() && waited < 5000) {
      await new Promise(r => setTimeout(r, 500));
      waited += 500;
    }
    if (!isZaloConnected()) {
      return NextResponse.json({
        error: "Zalo Personal chưa được kết nối. Vui lòng đăng nhập tại mục Zalo Inbox.",
        notConnected: true,
      }, { status: 503 });
    }

    // Tìm Zalo userId từ số điện thoại
    const findResult = await findZaloUserByPhone(phone);
    if (!findResult.success || !findResult.userId) {
      return NextResponse.json({
        error: findResult.error || `Không tìm thấy tài khoản Zalo cho số ${phone}`,
      }, { status: 404 });
    }

    const userId = findResult.userId;
    const displayName = findResult.displayName || quote.leadName;

    // Lấy base URL để tạo link PDF
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
      || process.env.RAILWAY_PUBLIC_DOMAIN && `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      || "https://smartfurni-webapp-production.up.railway.app";

    const pdfLink = `${baseUrl}/api/crm/quotes/${quoteId}/pdf`;

    // Nội dung tin nhắn
    const defaultMsg = `Kính gửi ${displayName},\n\n${company.name} xin gửi báo giá ${quote.quoteNumber} với tổng giá trị ${formatVND(quote.total)}.\n\n📄 Xem báo giá tại: ${pdfLink}\n\nHiệu lực đến: ${new Date(quote.validUntil).toLocaleDateString("vi-VN")}\n\nVui lòng liên hệ ${company.phone || ""} để được tư vấn thêm.\n\nTrân trọng,\n${company.name}`;
    const finalMessage = customMessage?.trim() || defaultMsg;

    // Gửi tin nhắn qua Zalo Personal
    const sendResult = await sendZaloMessage({
      conversationId: userId,
      message: finalMessage,
    });

    if (!sendResult.success) {
      return NextResponse.json({
        error: sendResult.error || "Gửi tin nhắn Zalo thất bại",
      }, { status: 500 });
    }

    console.log(`[Quote Zalo Personal] Sent ${quote.quoteNumber} to ${displayName} (${phone})`);
    return NextResponse.json({
      success: true,
      message: `Đã gửi báo giá ${quote.quoteNumber} tới ${displayName} qua Zalo Personal`,
      displayName,
      pdfLink,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Quote Zalo Personal Error]:", message);
    return NextResponse.json({ error: `Lỗi gửi Zalo: ${message}` }, { status: 500 });
  }
}
