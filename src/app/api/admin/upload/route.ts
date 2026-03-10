import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/admin-auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  // Auth check
  const cookieStore = await cookies();
  const token = cookieStore.get("sf_admin_session")?.value;
  if (!token || !verifySessionToken(token)) {
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

    // Generate unique filename
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const allowedExts = ["jpg", "jpeg", "png", "webp", "gif"];
    if (!allowedExts.includes(ext)) {
      return NextResponse.json({ error: "Invalid file extension" }, { status: 400 });
    }

    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const filename = `blog-${timestamp}-${random}.${ext}`;

    // Save to public/uploads/blog/
    const uploadDir = path.join(process.cwd(), "public", "uploads", "blog");
    await mkdir(uploadDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(path.join(uploadDir, filename), buffer);

    const url = `/uploads/blog/${filename}`;
    return NextResponse.json({ url, filename });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
