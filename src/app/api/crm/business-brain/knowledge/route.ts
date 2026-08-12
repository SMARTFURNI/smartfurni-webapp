import { NextRequest, NextResponse } from "next/server";
import { authorizeBusinessBrain } from "@/lib/business-brain-auth";
import {
  createKnowledgeDocument,
  deleteKnowledgeDocument,
  listKnowledgeDocuments,
  listKnowledgeDocumentVersions,
  restoreKnowledgeDocumentVersion,
  reviewKnowledgeDocument,
  updateKnowledgeDocument,
} from "@/lib/business-brain-store";
import type { KnowledgeCategory, KnowledgeStatus } from "@/types/business-brain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const access = await authorizeBusinessBrain("business_brain_view");
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get("documentId");
  if (documentId) {
    return NextResponse.json({ versions: await listKnowledgeDocumentVersions(documentId) });
  }
  const docs = await listKnowledgeDocuments({
    search: searchParams.get("search") || undefined,
    category: (searchParams.get("category") || "all") as KnowledgeCategory | "all",
    status: (searchParams.get("status") || "all") as KnowledgeStatus | "all",
    limit: Number(searchParams.get("limit") || 120),
  });

  return NextResponse.json({ documents: docs });
}

export async function POST(req: NextRequest) {
  const access = await authorizeBusinessBrain("business_brain_edit");
  if (!access) return NextResponse.json({ error: "Bạn không có quyền biên soạn." }, { status: 403 });

  const body = await req.json();
  if (!body.title || !body.category || !body.content) {
    return NextResponse.json({ error: "Thiếu tiêu đề, nhóm dữ liệu hoặc nội dung." }, { status: 400 });
  }

  const doc = await createKnowledgeDocument({
    title: String(body.title),
    category: body.category,
    status: "draft",
    content: String(body.content),
    summary: body.summary ? String(body.summary) : undefined,
    tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
    source: body.source ? String(body.source) : "manual",
    metadata: body.metadata || {},
    createdBy: access.actor.name,
    updatedBy: access.actor.name,
  });

  return NextResponse.json({ document: doc }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const access = await authorizeBusinessBrain("business_brain_edit");
  if (!access) return NextResponse.json({ error: "Bạn không có quyền biên soạn." }, { status: 403 });

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Thiếu ID tài liệu." }, { status: 400 });

  const doc = await updateKnowledgeDocument(String(body.id), {
    title: body.title,
    category: body.category,
    content: body.content,
    summary: body.summary,
    tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
    source: body.source,
    metadata: body.metadata,
    updatedBy: access.actor.name,
    changeNote: body.changeNote ? String(body.changeNote) : undefined,
  });

  if (!doc) return NextResponse.json({ error: "Không tìm thấy tài liệu." }, { status: 404 });
  return NextResponse.json({ document: doc });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const isSubmitForReview = body.action === "review" && body.toStatus === "in_review";
  const access = await authorizeBusinessBrain(isSubmitForReview ? "business_brain_edit" : "business_brain_review");
  if (!access) {
    return NextResponse.json({ error: isSubmitForReview ? "Bạn không có quyền gửi kiểm duyệt." : "Bạn không có quyền kiểm duyệt." }, { status: 403 });
  }
  if (body.action === "review") {
    const validStatuses: KnowledgeStatus[] = ["draft", "in_review", "approved", "scheduled", "active", "expired", "archived"];
    if (!validStatuses.includes(body.toStatus)) {
      return NextResponse.json({ error: "Trạng thái kiểm duyệt không hợp lệ." }, { status: 400 });
    }
    const publishStatuses = ["scheduled", "active", "expired", "archived"];
    if (publishStatuses.includes(String(body.toStatus)) && !access.actor.isAdmin && access.permissions?.business_brain_publish !== true) {
      return NextResponse.json({ error: "Bạn không có quyền xuất bản tài liệu." }, { status: 403 });
    }
    let document;
    try {
      document = await reviewKnowledgeDocument({
        documentId: String(body.id || ""),
        toStatus: body.toStatus,
        action: String(body.reviewAction || "Cập nhật kiểm duyệt"),
        actorId: access.actor.id,
        actorName: access.actor.name,
        note: body.note ? String(body.note) : undefined,
        effectiveAt: body.effectiveAt ? String(body.effectiveAt) : undefined,
        expiresAt: body.expiresAt ? String(body.expiresAt) : undefined,
      });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể đổi trạng thái." }, { status: 400 });
    }
    if (!document) return NextResponse.json({ error: "Không tìm thấy tài liệu." }, { status: 404 });
    return NextResponse.json({ document });
  }
  if (!body.id || !body.versionId) {
    return NextResponse.json({ error: "Thiếu tài liệu hoặc phiên bản cần khôi phục." }, { status: 400 });
  }
  const document = await restoreKnowledgeDocumentVersion(
    String(body.id),
    String(body.versionId),
    access.actor.name,
  );
  if (!document) return NextResponse.json({ error: "Không tìm thấy phiên bản." }, { status: 404 });
  return NextResponse.json({ document });
}

export async function DELETE(req: NextRequest) {
  const access = await authorizeBusinessBrain("business_brain_delete");
  if (!access) return NextResponse.json({ error: "Bạn không có quyền lưu trữ tài liệu." }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Thiếu ID tài liệu." }, { status: 400 });

  await deleteKnowledgeDocument(id, access.actor.id, access.actor.name);
  return NextResponse.json({ success: true });
}
