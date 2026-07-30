import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, getStaffSession } from "@/lib/admin-auth";
import { storeImageAsset } from "@/lib/media-assets";

async function checkAuth(): Promise<boolean> {
  const isAdmin = await getAdminSession();
  if (isAdmin) return true;
  const staff = await getStaffSession();
  return !!staff;
}

export async function POST(request: NextRequest) {
  // Auth check - accept both admin and staff sessions
  const ok = await checkAuth();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }
    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size exceeds 5MB" }, { status: 400 });
    }
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const requestedFolder = String(formData.get("folder") || "content");
    const allowedFolders = ["content", "products", "blog", "landing-pages", "site-theme"] as const;
    const folder = allowedFolders.find((item) => item === requestedFolder) || "content";
    const subfolder = String(formData.get("subfolder") || "").trim() || undefined;
    const uploadResult = await storeImageAsset({
      buffer,
      originalName: file.name,
      folder,
      subfolder,
      maxWidth: folder === "blog" ? 1600 : 1920,
      quality: 82,
      entityType: folder,
      entityId: subfolder,
    });

    return NextResponse.json({
      url: uploadResult.url,
      filename: uploadResult.filename,
      size: uploadResult.size,
      format: "webp",
      storage: uploadResult.provider,
      storageId: uploadResult.storageId,
      deploymentPending: uploadResult.provider === "github",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}
