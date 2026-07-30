import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, getStaffSession } from "@/lib/admin-auth";
import { storeImageAsset } from "@/lib/media-assets";

async function checkAuth(): Promise<boolean> {
  return Boolean(await getAdminSession() || await getStaffSession());
}

export async function POST(request: NextRequest) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const slug = String(formData.get("slug") || "general");
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size exceeds 10MB" }, { status: 400 });
    }
    const stored = await storeImageAsset({
      buffer: Buffer.from(await file.arrayBuffer()),
      originalName: file.name,
      folder: "landing-pages",
      subfolder: slug,
      maxWidth: 1920,
      quality: 84,
      entityType: "landing-page",
      entityId: slug,
    });
    return NextResponse.json({
      url: stored.url,
      filename: stored.filename,
      size: stored.size,
      storage: stored.provider,
      storageId: stored.storageId,
      deploymentPending: stored.provider === "github",
    });
  } catch (error) {
    console.error("[lp-upload-image] Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}
