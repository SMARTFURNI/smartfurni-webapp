import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getProductById, updateProduct } from "@/lib/product-store";
import { v2 as cloudinary } from "cloudinary";
import { initDbOnce } from "@/lib/db-init";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// POST /api/admin/products-mgmt/images — upload ảnh sản phẩm lên Cloudinary
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

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const uploadResult = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `smartfurni/products/${productId}`,
            resource_type: "image",
            transformation: [{ quality: "auto", fetch_format: "auto" }],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result as { secure_url: string; public_id: string });
          }
        );
        uploadStream.end(buffer);
      }
    );

    const url = uploadResult.secure_url;

    // Update product images array
    const currentImages = product.images || [];
    const newImages = [...currentImages, url];
    const newCoverImage = product.coverImage || url; // set as cover if no cover yet

    updateProduct(productId, {
      images: newImages,
      coverImage: newCoverImage,
    });

    return NextResponse.json({
      url,
      publicId: uploadResult.public_id,
      images: newImages,
      coverImage: newCoverImage,
    });
  } catch (error) {
    console.error("Product image upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

// DELETE /api/admin/products-mgmt/images — xóa ảnh sản phẩm khỏi Cloudinary
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

    updateProduct(productId, {
      images: newImages,
      coverImage: newCoverImage,
    });

    // Delete from Cloudinary if it's a Cloudinary URL
    if (imageUrl.includes("cloudinary.com")) {
      try {
        // Extract public_id from Cloudinary URL
        // URL format: https://res.cloudinary.com/{cloud}/image/upload/{transformations}/{public_id}.{ext}
        const urlParts = imageUrl.split("/");
        const uploadIndex = urlParts.indexOf("upload");
        if (uploadIndex !== -1) {
          // Get everything after "upload/" and before the extension
          const publicIdWithExt = urlParts.slice(uploadIndex + 1).join("/");
          const publicId = publicIdWithExt.replace(/\.[^/.]+$/, ""); // remove extension
          // Remove version prefix (v1234567890/) if present
          const cleanPublicId = publicId.replace(/^v\d+\//, "");
          await cloudinary.uploader.destroy(cleanPublicId);
        }
      } catch (cloudinaryError) {
        console.error("Cloudinary delete error:", cloudinaryError);
        // Don't fail the request if Cloudinary delete fails
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

    updateProduct(productId, { coverImage: imageUrl });

    return NextResponse.json({ success: true, coverImage: imageUrl });
  } catch (error) {
    console.error("Set cover error:", error);
    return NextResponse.json({ error: "Failed to set cover" }, { status: 500 });
  }
}
