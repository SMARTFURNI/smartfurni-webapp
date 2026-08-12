import { NextRequest, NextResponse } from "next/server";
import { authorizeBusinessBrain } from "@/lib/business-brain-auth";
import {
  decideKnowledgeDocumentChangeRequest,
  listKnowledgeDocumentChangeRequests,
} from "@/lib/business-brain-store";
import type { KnowledgeChangeRequestStatus } from "@/types/business-brain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const access = await authorizeBusinessBrain("business_brain_view");
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const params = new URL(req.url).searchParams;
  return NextResponse.json({
    requests: await listKnowledgeDocumentChangeRequests({
      documentId: params.get("documentId") || undefined,
      status: (params.get("status") || "all") as KnowledgeChangeRequestStatus | "all",
      limit: Number(params.get("limit") || 120),
    }),
  });
}

export async function PATCH(req: NextRequest) {
  const access = await authorizeBusinessBrain("business_brain_review");
  if (!access) return NextResponse.json({ error: "Bạn không có quyền xác nhận cập nhật tài liệu." }, { status: 403 });
  const body = await req.json();
  if (!body.id || !["approved", "rejected"].includes(String(body.decision))) {
    return NextResponse.json({ error: "Thiếu yêu cầu hoặc quyết định không hợp lệ." }, { status: 400 });
  }
  try {
    const result = await decideKnowledgeDocumentChangeRequest({
      requestId: String(body.id),
      decision: body.decision,
      reviewerId: access.actor.id,
      reviewerName: access.actor.name,
      reviewNote: body.note ? String(body.note) : undefined,
    });
    if (!result) return NextResponse.json({ error: "Không tìm thấy yêu cầu thay đổi." }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể xử lý yêu cầu." }, { status: 400 });
  }
}
