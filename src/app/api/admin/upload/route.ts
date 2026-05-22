import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, getStaffSession } from "@/lib/admin-auth";
import { v2 as cloudinary } from "cloudinary";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
    // Generate unique filename
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const allowedExts = ["jpg", "jpeg", "png", "webp", "gif"];
    if (!allowedExts.includes(ext)) {
      return NextResponse.json({ error: "Invalid file extension" }, { status: 400 });
    }
    // Upload to Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadResult = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "smartfurni/lp-content", resource_type: "image" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result as { secure_url: string; public_id: string });
          }
        );
        uploadStream.end(buffer);
      }
    );
    // Inject Cloudinary transformation: auto format (WebP/AVIF), auto quality, max width 900px
    // e.g. https://res.cloudinary.com/xxx/image/upload/v123/file.jpg
    //   -> https://res.cloudinary.com/xxx/image/upload/f_auto,q_auto:good,w_900,c_limit/v123/file.jpg
    const optimizedUrl = uploadResult.secure_url.replace(
      /\/image\/upload\/(?!f_auto)/,
      "/image/upload/f_auto,q_auto:good,w_900,c_limit/"
    );
    return NextResponse.json({ url: optimizedUrl, filename: uploadResult.public_id });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
