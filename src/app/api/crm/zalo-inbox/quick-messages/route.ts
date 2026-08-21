import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { canSendZaloInboxMessages } from "@/lib/zalo-inbox-access";
import { getZaloMediaAssets } from "@/lib/zalo-media-library-store";
import {
  archiveZaloQuickMessage,
  createZaloQuickMessage,
  listZaloQuickMessages,
  updateZaloQuickMessage,
} from "@/lib/zalo-quick-message-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function actorId(session: { isAdmin: boolean; staffId?: string } | null): string {
  return session?.staffId || (session?.isAdmin ? "admin" : "unknown");
}

async function authorized() {
  const session = await getCrmSession();
  return { session, allowed: await canSendZaloInboxMessages(session) };
}

async function validateMediaAssetIds(value: unknown): Promise<string[]> {
  const ids = Array.isArray(value)
    ? [...new Set(value.map(item => String(item || "").trim()).filter(Boolean))].slice(0, 10)
    : [];
  if (!ids.length) return [];
  const assets = await getZaloMediaAssets(ids);
  if (assets.length !== ids.length) throw new Error("Một số ảnh/video không còn trong thư viện");
  if (assets.some(asset => asset.mediaKind === "file")) throw new Error("Tin nhắn nhanh chỉ hỗ trợ ảnh và video");
  return ids;
}

export async function GET(req: NextRequest) {
  const { session, allowed } = await authorized();
  if (!allowed) return NextResponse.json({ error: "Không có quyền sử dụng tin nhắn nhanh" }, { status: session ? 403 : 401 });
  try {
    const templates = await listZaloQuickMessages({
      search: req.nextUrl.searchParams.get("q") || "",
      limit: Number(req.nextUrl.searchParams.get("limit") || 200),
    });
    return NextResponse.json({ templates });
  } catch (error) {
    console.error("[zalo-quick-messages] GET error:", error);
    return NextResponse.json({ error: "Không tải được tin nhắn nhanh" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, allowed } = await authorized();
  if (!allowed) return NextResponse.json({ error: "Không có quyền tạo tin nhắn nhanh" }, { status: session ? 403 : 401 });
  try {
    const body = await req.json() as { title?: string; category?: string; content?: string; messageParts?: string[]; mediaAssetIds?: string[] };
    const mediaAssetIds = await validateMediaAssetIds(body.mediaAssetIds);
    const template = await createZaloQuickMessage({ ...body, mediaAssetIds, actor: actorId(session) });
    return NextResponse.json({ success: true, template }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không lưu được tin nhắn nhanh" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const { session, allowed } = await authorized();
  if (!allowed) return NextResponse.json({ error: "Không có quyền sửa tin nhắn nhanh" }, { status: session ? 403 : 401 });
  try {
    const body = await req.json() as { id?: string; title?: string; category?: string; content?: string; messageParts?: string[]; mediaAssetIds?: string[] };
    if (!body.id) return NextResponse.json({ error: "Thiếu mẫu tin nhắn" }, { status: 400 });
    const mediaAssetIds = await validateMediaAssetIds(body.mediaAssetIds);
    const template = await updateZaloQuickMessage({ ...body, id: body.id, mediaAssetIds, actor: actorId(session) });
    if (!template) return NextResponse.json({ error: "Không tìm thấy mẫu tin nhắn" }, { status: 404 });
    return NextResponse.json({ success: true, template });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không cập nhật được tin nhắn nhanh" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const { session, allowed } = await authorized();
  if (!allowed) return NextResponse.json({ error: "Không có quyền xóa tin nhắn nhanh" }, { status: session ? 403 : 401 });
  const id = req.nextUrl.searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "Thiếu mẫu tin nhắn" }, { status: 400 });
  try {
    const archived = await archiveZaloQuickMessage(id);
    if (!archived) return NextResponse.json({ error: "Không tìm thấy mẫu tin nhắn" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[zalo-quick-messages] DELETE error:", error);
    return NextResponse.json({ error: "Không xóa được tin nhắn nhanh" }, { status: 500 });
  }
}
