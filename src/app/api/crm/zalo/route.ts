import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { SITE_URL } from "@/lib/site-url";
import {
  assignZaloCustomerTag,
  createZaloCampaign,
  createZaloCustomerTag,
  deleteZaloTemplate,
  generateZaloAiDraft,
  getZaloConversationMessages,
  getZaloDashboard,
  markZaloConversationRead,
  reviewZaloAiQueue,
  refreshZaloOAAccessToken,
  saveZaloOAConfig,
  saveZaloCustomerSegment,
  saveZaloTemplate,
  sendZaloCampaign,
  sendZaloConsultation,
  sendZaloZbs,
  syncZaloOAHistory,
  syncZaloTemplates,
  syncZaloUserProfile,
  testZaloConnection,
  type ZaloMessageCategory,
  type ZaloOAConfig,
  type ZaloTemplate,
} from "@/lib/zalo-oa-store";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "Yêu cầu không hợp lệ";
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET(req: NextRequest) {
  if (!await getCrmSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const userId = req.nextUrl.searchParams.get("userId")?.trim();
    if (userId) {
      const [messages, conversation] = await Promise.all([
        getZaloConversationMessages(userId),
        syncZaloUserProfile(userId),
      ]);
      return NextResponse.json({ messages, conversation });
    }
    return NextResponse.json(await getZaloDashboard(SITE_URL));
  } catch (error) {
    return errorResponse(error, 500);
  }
}

export async function POST(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json() as Record<string, unknown>;
    const action = String(body.action || "");
    const adminActions = new Set([
      "save_config", "save_template", "delete_template", "test_connection", "refresh_token", "sync_history", "sync_templates",
      "create_customer_tag", "assign_customer_tag", "save_customer_segment", "create_campaign", "send_campaign",
    ]);
    if (adminActions.has(action) && !session.isAdmin) {
      return NextResponse.json({ ok: false, error: "Chỉ admin được thay đổi cấu hình Zalo OA." }, { status: 403 });
    }

    if (action === "save_config") {
      await saveZaloOAConfig((body.config || {}) as Partial<ZaloOAConfig>);
      return NextResponse.json({ ok: true });
    }
    if (action === "save_template") {
      const template = (body.template || {}) as Partial<ZaloTemplate>;
      if (!template.name?.trim() || !template.category) throw new Error("Tên và loại mẫu tin là bắt buộc.");
      const saved = await saveZaloTemplate(template as Partial<ZaloTemplate> & { name: string; category: ZaloMessageCategory });
      return NextResponse.json({ ok: true, template: saved });
    }
    if (action === "delete_template") {
      const id = String(body.id || "");
      if (!id) throw new Error("Thiếu mã mẫu tin.");
      await deleteZaloTemplate(id);
      return NextResponse.json({ ok: true });
    }
    if (action === "send_consultation") {
      const userId = String(body.userId || "").trim();
      const content = String(body.content || "").trim();
      if (!userId || !content) throw new Error("Tin tư vấn cần Zalo UID và nội dung.");
      const result = await sendZaloConsultation({ userId, content, source: "manual" });
      return NextResponse.json(result, { status: result.ok ? 200 : 422 });
    }
    if (action === "mark_conversation_read") {
      const userId = String(body.userId || "").trim();
      if (!userId) throw new Error("Thiếu Zalo UID của hội thoại.");
      await markZaloConversationRead(userId);
      return NextResponse.json({ ok: true });
    }
    if (action === "send_zbs") {
      const category = String(body.category || "") as "zbs_transaction" | "zbs_after_sale";
      if (!(["zbs_transaction", "zbs_after_sale"] as string[]).includes(category)) throw new Error("Loại ZBS không hợp lệ.");
      const result = await sendZaloZbs({
        userId: String(body.userId || "").trim() || undefined,
        phone: String(body.phone || "").trim() || undefined,
        templateId: String(body.templateId || "").trim(),
        templateData: (body.templateData || {}) as Record<string, string>,
        category,
        source: "manual",
      });
      return NextResponse.json(result, { status: result.ok ? 200 : 422 });
    }
    if (action === "generate_ai") {
      const userId = String(body.userId || "").trim();
      if (!userId) throw new Error("Thiếu Zalo UID của hội thoại.");
      const result = await generateZaloAiDraft({ userId });
      return NextResponse.json({ ok: true, ...result });
    }
    if (action === "review_ai") {
      const id = String(body.id || "");
      const decision = String(body.decision || "") as "approve" | "reject";
      if (!id || !["approve", "reject"].includes(decision)) throw new Error("Quyết định duyệt không hợp lệ.");
      const result = await reviewZaloAiQueue(id, decision);
      return NextResponse.json(result, { status: result.ok ? 200 : 422 });
    }
    if (action === "test_connection") {
      const result = await testZaloConnection();
      return NextResponse.json(result, { status: result.ok ? 200 : 422 });
    }
    if (action === "refresh_token") {
      const result = await refreshZaloOAAccessToken();
      return NextResponse.json(result, { status: result.ok ? 200 : 422 });
    }
    if (action === "sync_history") {
      const summary = await syncZaloOAHistory();
      return NextResponse.json({ ok: true, summary });
    }
    if (action === "sync_templates") {
      const result = await syncZaloTemplates();
      return NextResponse.json({ ok: result.status !== "failed", templateSync: result }, { status: result.status === "failed" ? 422 : 200 });
    }
    if (action === "create_customer_tag") {
      const tag = await createZaloCustomerTag({ name: String(body.name || ""), color: String(body.color || "") || undefined });
      return NextResponse.json({ ok: true, tag });
    }
    if (action === "assign_customer_tag") {
      await assignZaloCustomerTag({
        userIds: Array.isArray(body.userIds) ? body.userIds.map(String) : [],
        tagId: String(body.tagId || ""),
      });
      return NextResponse.json({ ok: true });
    }
    if (action === "save_customer_segment") {
      const segmentId = await saveZaloCustomerSegment({
        id: String(body.id || "") || undefined,
        name: String(body.name || ""),
        description: String(body.description || ""),
        tagIds: Array.isArray(body.tagIds) ? body.tagIds.map(String) : [],
        matchType: String(body.matchType) === "all" ? "all" : "any",
        activeWithinDays: Number(body.activeWithinDays || 0),
      });
      return NextResponse.json({ ok: true, segmentId });
    }
    if (action === "create_campaign") {
      const campaign = await createZaloCampaign({
        name: String(body.name || ""),
        content: String(body.content || ""),
        segmentId: String(body.segmentId || "") || undefined,
        userIds: Array.isArray(body.userIds) ? body.userIds.map(String) : [],
      });
      return NextResponse.json({ ok: true, campaign });
    }
    if (action === "send_campaign") {
      const campaign = await sendZaloCampaign(String(body.id || ""));
      return NextResponse.json({ ok: true, campaign });
    }
    throw new Error("Hành động Zalo OA không được hỗ trợ.");
  } catch (error) {
    return errorResponse(error);
  }
}
