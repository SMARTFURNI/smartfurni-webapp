import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import {
  createKnowledgeDocument,
  deleteKnowledgeDocument,
  listKnowledgeDocuments,
  updateKnowledgeDocument,
} from "@/lib/business-brain-store";
import type { KnowledgeCategory, KnowledgeStatus } from "@/types/business-brain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function actorFromSession(session: Awaited<ReturnType<typeof getCrmSession>>) {
  return session?.staffId || (session?.isAdmin ? "admin" : "unknown");
}

export async function GET(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const docs = await listKnowledgeDocuments({
    search: searchParams.get("search") || undefined,
    category: (searchParams.get("category") || "all") as KnowledgeCategory | "all",
    status: (searchParams.get("status") || "all") as KnowledgeStatus | "all",
    limit: Number(searchParams.get("limit") || 120),
  });

  return NextResponse.json({ documents: docs });
}

export async function POST(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.title || !body.category || !body.content) {
    return NextResponse.json({ error: "Thiếu tiêu đề, nhóm dữ liệu hoặc nội dung." }, { status: 400 });
  }

  const doc = await createKnowledgeDocument({
    title: String(body.title),
    category: body.category,
    status: body.status || "draft",
    content: String(body.content),
    summary: body.summary ? String(body.summary) : undefined,
    tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
    source: body.source ? String(body.source) : "manual",
    metadata: body.metadata || {},
    createdBy: actorFromSession(session),
    updatedBy: actorFromSession(session),
  });

  return NextResponse.json({ document: doc }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Thiếu ID tài liệu." }, { status: 400 });

  const doc = await updateKnowledgeDocument(String(body.id), {
    title: body.title,
    category: body.category,
    status: body.status,
    content: body.content,
    summary: body.summary,
    tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
    source: body.source,
    metadata: body.metadata,
    updatedBy: actorFromSession(session),
  });

  if (!doc) return NextResponse.json({ error: "Không tìm thấy tài liệu." }, { status: 404 });
  return NextResponse.json({ document: doc });
}

export async function DELETE(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Thiếu ID tài liệu." }, { status: 400 });

  await deleteKnowledgeDocument(id);
  return NextResponse.json({ success: true });
}
