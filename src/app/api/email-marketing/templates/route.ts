import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getEmailTemplates, saveEmailTemplate, initEmailMarketingSchema } from "@/lib/email-marketing-store";
import type { EmailTemplate } from "@/lib/email-marketing-store";

export async function GET() {
  try {
    await initEmailMarketingSchema();
    const templates = await getEmailTemplates();
    return NextResponse.json({ success: true, data: templates });
  } catch (error) {
    console.error("[email-templates] GET error:", error);
    return NextResponse.json({ success: false, error: "Lỗi lấy danh sách mẫu email" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await initEmailMarketingSchema();
    const body = await request.json();
    const { name, subject, bodyHtml, variables } = body;

    // Validate
    if (!name || !subject || !bodyHtml) {
      return NextResponse.json(
        { success: false, error: "Thiếu thông tin bắt buộc" },
        { status: 400 }
      );
    }

    const template: EmailTemplate = {
      id: randomUUID(),
      name,
      subject,
      bodyHtml,
      variables: variables || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveEmailTemplate(template);
    return NextResponse.json({ success: true, data: template });
  } catch (error) {
    console.error("[email-templates] POST error:", error);
    return NextResponse.json({ success: false, error: "Lỗi tạo mẫu email" }, { status: 500 });
  }
}
