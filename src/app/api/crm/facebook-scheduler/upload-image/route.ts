import { NextRequest, NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/admin-auth";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    await requireCrmAccess();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size exceeds 10MB" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const allowedExts = ["jpg", "jpeg", "png", "webp", "gif"];
    if (!allowedExts.includes(ext)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadResult = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "smartfurni/facebook-posts", resource_type: "image" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result as { secure_url: string; public_id: string });
          }
        );
        uploadStream.end(buffer);
      }
    );

    return NextResponse.json({ url: uploadResult.secure_url });
  } catch (error) {
    console.error("Facebook image upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
