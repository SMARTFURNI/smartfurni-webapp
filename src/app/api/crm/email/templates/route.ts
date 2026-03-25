import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import {
  getEmailTemplates, createEmailTemplate, updateEmailTemplate, deleteEmailTemplate,
} from "@/lib/crm-email-store";

export async function GET() {
  if (!await getAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const templates = await getEmailTemplates();
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const template = await createEmailTemplate({
    name: body.name || "Template mới",
    subject: body.subject || "",
    category: body.category || "custom",
    htmlContent: body.htmlContent || "",
    previewText: body.previewText || "",
  });
  return NextResponse.json(template);
}

export async function PATCH(req: NextRequest) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { id, ...data } = body;
  const updated = await updateEmailTemplate(id, data);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await deleteEmailTemplate(id);
  return NextResponse.json({ ok: true });
}
