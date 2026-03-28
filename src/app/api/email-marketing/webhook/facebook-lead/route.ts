import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

/**
 * Webhook endpoint để nhận dữ liệu từ Facebook Lead Ads
 * Có thể được gọi từ Make.com hoặc n8n
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate webhook signature (optional, tùy vào cấu hình Make.com/n8n)
    const webhookSecret = process.env.FACEBOOK_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = request.headers.get("x-webhook-signature");
      if (signature !== webhookSecret) {
        return NextResponse.json(
          { success: false, error: "Invalid webhook signature" },
          { status: 401 }
        );
      }
    }

    // Extract lead data
    const { name, email, phone, company, source = "facebook_lead_ads", tags = [] } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email là bắt buộc" },
        { status: 400 }
      );
    }

    // Create lead object
    const lead = {
      id: randomUUID(),
      name: name || "",
      email,
      phone: phone || "",
      company: company || "",
      source,
      tags: Array.isArray(tags) ? tags : [tags],
      unsubscribed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // TODO: Save lead to database and trigger automation workflows
    // await saveLead(lead);
    // await triggerWorkflows(lead);

    console.log("[facebook-webhook] Lead received:", lead);

    return NextResponse.json({
      success: true,
      message: "Lead nhận được thành công",
      data: lead,
    });
  } catch (error) {
    console.error("[facebook-webhook] Error:", error);
    return NextResponse.json(
      { success: false, error: "Lỗi xử lý webhook" },
      { status: 500 }
    );
  }
}

// GET endpoint để test webhook
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Facebook Lead Webhook endpoint is ready",
    documentation: "POST dữ liệu lead với format: { name, email, phone, company, source, tags }",
  });
}
