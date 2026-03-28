import { NextRequest, NextResponse } from "next/server";

/**
 * API endpoint để ghi lại khi khách click vào link trong email
 * Gửi thông báo cho Sales team
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId, leadName, email, linkType, timestamp } = body;

    // Validate
    if (!leadId || !email || !linkType) {
      return NextResponse.json(
        { success: false, error: "Thiếu thông tin bắt buộc" },
        { status: 400 }
      );
    }

    // Log click event
    const clickEvent = {
      id: `click-${Date.now()}`,
      leadId,
      leadName: leadName || "Unknown",
      email,
      linkType, // "quotation", "product", "demo", etc.
      timestamp: timestamp || new Date().toISOString(),
      userAgent: request.headers.get("user-agent"),
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
    };

    console.log("[notify-click] Click event:", clickEvent);

    // TODO: Save to database
    // TODO: Send browser notification to sales team
    // TODO: Trigger automation workflow

    // Simulate sending notification to sales team
    const notificationMessage = `
      🔔 Khách hàng vừa tương tác với email!
      
      👤 ${leadName} (${email})
      🔗 Nhấp vào: ${getLinkTypeLabel(linkType)}
      ⏰ Lúc: ${new Date(clickEvent.timestamp).toLocaleString('vi-VN')}
    `;

    console.log("[notify-click] Notification:", notificationMessage);

    return NextResponse.json({
      success: true,
      message: "Click event recorded and notification sent",
      data: clickEvent,
    });
  } catch (error) {
    console.error("[notify-click] Error:", error);
    return NextResponse.json(
      { success: false, error: "Lỗi ghi lại click event" },
      { status: 500 }
    );
  }
}

function getLinkTypeLabel(linkType: string): string {
  const labels: Record<string, string> = {
    quotation: "Xem Báo Giá",
    product: "Xem Sản Phẩm",
    demo: "Đăng Ký Demo",
    contact: "Liên Hệ",
    website: "Website",
  };
  return labels[linkType] || linkType;
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Notify Click endpoint is ready",
    documentation: "POST với body: { leadId, leadName, email, linkType, timestamp }",
  });
}
