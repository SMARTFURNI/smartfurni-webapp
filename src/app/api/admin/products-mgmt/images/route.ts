import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getProductById, updateProduct } from "@/lib/product-store";
import { writeFile, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// POST /api/admin/products-mgmt/images — upload ảnh sản phẩm
export async function POST(request: NextRequest) {
  const ok = await getAdminSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const productId = formData.get("productId") as string | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!productId) return NextResponse.json({ error: "No productId provided" }, { status: 400 });

    const product = getProductById(productId);
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size exceeds 10MB" }, { status: 400 });
    }

    // Validate extension
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const allowedExts = ["jpg", "jpeg", "png", "webp", "gif", "avif"];
    if (!allowedExts.includes(ext)) {
      return NextResponse.json({ error: "Invalid file extension" }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const filename = `product-${productId}-${timestamp}-${random}.${ext}`;

    // Save to public/uploads/products/
    const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
    await mkdir(uploadDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(path.join(uploadDir, filename), buffer);

    const url = `/uploads/products/${filename}`;

    // Update product images array
    const currentImages = product.images || [];
    const newImages = [...currentImages, url];
    const newCoverImage = product.coverImage || url; // set as cover if no cover yet

    updateProduct(productId, {
      images: newImages,
      coverImage: newCoverImage,
    });

    return NextResponse.json({ url, filename, images: newImages, coverImage: newCoverImage });
  } catch (error) {
    console.error("Product image upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

// DELETE /api/admin/products-mgmt/images — xóa ảnh sản phẩm
export async function DELETE(request: NextRequest) {
  const ok = await getAdminSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { productId, imageUrl } = await request.json();

    if (!productId || !imageUrl) {
      return NextResponse.json({ error: "productId and imageUrl are required" }, { status: 400 });
    }

    const product = getProductById(productId);
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    // Remove from images array
    const newImages = (product.images || []).filter((img) => img !== imageUrl);

    // Update coverImage if deleted image was the cover
    let newCoverImage = product.coverImage;
    if (product.coverImage === imageUrl) {
      newCoverImage = newImages[0] || undefined;
    }

    updateProduct(productId, {
      images: newImages,
      coverImage: newCoverImage,
    });

    // Try to delete file from disk (only for locally uploaded files)
    if (imageUrl.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), "public", imageUrl);
      if (existsSync(filePath)) {
        await unlink(filePath).catch(() => {
          // ignore if file already deleted
        });
      }
    }

    return NextResponse.json({ success: true, images: newImages, coverImage: newCoverImage });
  } catch (error) {
    console.error("Product image delete error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}

// PATCH /api/admin/products-mgmt/images — set cover image
export async function PATCH(request: NextRequest) {
  const ok = await getAdminSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { productId, imageUrl } = await request.json();

    if (!productId || !imageUrl) {
      return NextResponse.json({ error: "productId and imageUrl are required" }, { status: 400 });
    }

    const product = getProductById(productId);
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    updateProduct(productId, { coverImage: imageUrl });

    return NextResponse.json({ success: true, coverImage: imageUrl });
  } catch (error) {
    console.error("Set cover error:", error);
    return NextResponse.json({ error: "Failed to set cover" }, { status: 500 });
  }
}
