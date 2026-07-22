import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getPostById, updatePost } from "@/lib/admin-store";
import { initDbOnce } from "@/lib/db-init";
import { dbSaveOneAndWait } from "@/lib/db-store";
import { applyApprovedImagesToMarkdown } from "@/lib/blog-image-agent";
import { storeImagesOnGitHubBatch } from "@/lib/github-media";
import { decodeImageDataUrl } from "@/lib/openai-blog-images";

interface Params { params: Promise<{ slug: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await initDbOnce();
  const { slug } = await params;
  const body = await req.json() as { selections?: Array<{ imageId: string; dataUrl: string }> };
  const post = getPostById(slug);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const selections = body.selections || [];
  if (selections.length === 0) return NextResponse.json({ error: "Chưa chọn ảnh để duyệt" }, { status: 400 });
  if (selections.length > 4) return NextResponse.json({ error: "Mỗi bài chỉ duyệt tối đa 4 ảnh" }, { status: 400 });
  if (new Set(selections.map((selection) => selection.imageId)).size !== selections.length) {
    return NextResponse.json({ error: "Danh sách duyệt có ảnh bị trùng" }, { status: 400 });
  }
  try {
    const selectedImages = selections.map((selection) => {
      const image = (post.articleImages || []).find((item) => item.id === selection.imageId);
      if (!image) throw new Error(`Không tìm thấy brief ${selection.imageId}`);
      if (image.status !== "review") throw new Error(`Ảnh ${selection.imageId} chưa ở trạng thái chờ duyệt`);
      return { image, buffer: decodeImageDataUrl(selection.dataUrl) };
    });
    const totalBytes = selectedImages.reduce((sum, item) => sum + item.buffer.length, 0);
    if (totalBytes > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "Tổng dung lượng bộ ảnh vượt quá 50MB" }, { status: 400 });
    }
    const stored = await storeImagesOnGitHubBatch(selectedImages.map(({ image, buffer }) => ({
      buffer,
      originalName: `${slug}-${image.role}-${image.order}.webp`,
      folder: "blog" as const,
      subfolder: slug,
      width: 1200,
      height: image.role === "cover" ? 675 : 800,
      quality: 84,
    })));
    const urlById = new Map(selectedImages.map(({ image }, index) => [image.id, stored[index].url]));
    const images = (post.articleImages || []).map((image) => urlById.has(image.id)
      ? { ...image, url: urlById.get(image.id), status: "approved" as const, variants: undefined, error: undefined }
      : image);
    const coverImage = images.find((image) => image.role === "cover" && image.status === "approved")?.url || post.coverImage;
    const content = applyApprovedImagesToMarkdown(post.content, images);
    const allApproved = images.length > 0 && images.every((image) => image.status === "approved");
    const updated = updatePost(slug, {
      articleImages: images,
      articleImagePlan: post.articleImagePlan ? { ...post.articleImagePlan, status: allApproved ? "approved" : "draft" } : undefined,
      coverImage,
      content,
    });
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await dbSaveOneAndWait("posts", { ...updated, id: updated.slug });
    return NextResponse.json({ images, coverImage, content, plan: updated.articleImagePlan });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể lưu bộ ảnh" }, { status: 500 });
  }
}
