import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { storeImageAsset } from "@/lib/media-assets";

export async function POST(request: NextRequest) {
  if (!(await getCrmSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const catalogueId = String(formData.get("catalogueId") || "editor");
    if (!file) return NextResponse.json({ error: "Thiếu file ảnh" }, { status: 400 });
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Chỉ chấp nhận file ảnh" }, { status: 400 });
    }
    if (file.size > 12 * 1024 * 1024) {
      return NextResponse.json({ error: "Ảnh vượt quá 12MB" }, { status: 400 });
    }
    const stored = await storeImageAsset({
      buffer: Buffer.from(await file.arrayBuffer()),
      originalName: file.name || "catalogue-image.jpg",
      folder: "catalogues",
      subfolder: catalogueId,
      maxWidth: 1800,
      quality: 84,
      entityType: "catalogue",
      entityId: catalogueId,
    });
    return NextResponse.json({
      url: stored.url,
      storage: stored.provider,
      storageId: stored.storageId,
      size: stored.size,
    });
  } catch (error) {
    console.error("[catalogue-media] Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể tải ảnh" },
      { status: 500 },
    );
  }
}
