import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getProductById, updateProduct } from "@/lib/product-store";
import { initDbOnce } from "@/lib/db-init";
import { deleteImageFromGitHub, storeImageOnGitHub } from "@/lib/github-media";

// POST /api/admin/products-mgmt/images — optimize to WebP and commit to GitHub media storage
export async function POST(request: NextRequest) {
  await initDbOnce();
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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadResult = await storeImageOnGitHub({
      buffer,
      originalName: file.name,
      folder: "products",
      subfolder: product.slug || product.id,
      maxWidth: 1600,
      quality: 84,
    });
    const url = uploadResult.url;

    // Update product images array
    const currentImages = product.images || [];
    const newImages = [...currentImages, url];
    const newCoverImage = product.coverImage || url; // set as cover if no cover yet

    await updateProduct(productId, {
      images: newImages,
      coverImage: newCoverImage,
    });

    return NextResponse.json({
      url,
      publicId: uploadResult.repositoryPath,
      images: newImages,
      coverImage: newCoverImage,
      size: uploadResult.size,
      format: "webp",
      deploymentPending: true,
    });
  } catch (error) {
    console.error("Product image upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/products-mgmt/images — remove image reference and GitHub file
export async function DELETE(request: NextRequest) {
  await initDbOnce();
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

    await updateProduct(productId, {
      images: newImages,
      coverImage: newCoverImage,
    });

    if (imageUrl.startsWith("/uploads/")) {
      try {
        await deleteImageFromGitHub(imageUrl);
      } catch (githubError) {
        console.error("GitHub media delete error:", githubError);
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
  await initDbOnce();
  const ok = await getAdminSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { productId, imageUrl } = await request.json();

    if (!productId || !imageUrl) {
      return NextResponse.json({ error: "productId and imageUrl are required" }, { status: 400 });
    }

    const product = getProductById(productId);
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    await updateProduct(productId, { coverImage: imageUrl });

    return NextResponse.json({ success: true, coverImage: imageUrl });
  } catch (error) {
    console.error("Set cover error:", error);
    return NextResponse.json({ error: "Failed to set cover" }, { status: 500 });
  }
}
