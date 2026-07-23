import "server-only";

import OpenAI, { toFile } from "openai";

export interface GeneratedImageVariant {
  id: string;
  dataUrl: string;
  createdAt: string;
}

interface GenerateBlogImageOptions {
  prompt: string;
  aspectRatio?: "16:9" | "3:2" | "4:3";
  referenceImageUrls?: string[];
  variantCount?: 1 | 2;
}

const MAX_REFERENCE_IMAGES = 3;
const MAX_REFERENCE_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_APPROVAL_IMAGE_BYTES = 15 * 1024 * 1024;

function getImageSize(aspectRatio: GenerateBlogImageOptions["aspectRatio"]) {
  if (aspectRatio === "16:9") return "1536x864" as const;
  if (aspectRatio === "4:3") return "1280x960" as const;
  return "1536x1024" as const;
}

function getAbsoluteReferenceUrl(value: string) {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.FRONTEND_URL ||
      "https://www.smartfurni.com.vn";
    const url = new URL(value.trim(), baseUrl);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

async function loadReferenceImages(urls: string[]) {
  const files = [];

  for (const [index, value] of urls.slice(0, MAX_REFERENCE_IMAGES).entries()) {
    const url = getAbsoluteReferenceUrl(value);
    if (!url) continue;

    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) continue;

    const contentType = response.headers.get("content-type")?.split(";")[0] || "";
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (!contentType.startsWith("image/") || contentLength > MAX_REFERENCE_IMAGE_BYTES) continue;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.length > MAX_REFERENCE_IMAGE_BYTES) continue;

    const extension = contentType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
    files.push(await toFile(buffer, `smartfurni-reference-${index + 1}.${extension}`, { type: contentType }));
  }

  return files;
}

function extractVariants(data: Array<{ b64_json?: string | null }> | undefined) {
  const now = new Date().toISOString();
  return (data || [])
    .map((image, index) => image.b64_json
      ? { id: `${Date.now()}-${index + 1}`, dataUrl: `data:image/webp;base64,${image.b64_json}`, createdAt: now }
      : null)
    .filter((image): image is GeneratedImageVariant => Boolean(image));
}

export async function generateBlogImageVariants({
  prompt,
  aspectRatio = "3:2",
  referenceImageUrls = [],
  variantCount = 2,
}: GenerateBlogImageOptions): Promise<{
  variants: GeneratedImageVariant[];
  model: string;
}> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY chưa được cấu hình trên Railway");
  const model = process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-2";
  const configuredTimeout = Number(process.env.OPENAI_IMAGE_TIMEOUT_MS || 80_000);
  const timeout = Number.isFinite(configuredTimeout)
    ? Math.min(Math.max(configuredTimeout, 30_000), 180_000)
    : 80_000;
  const client = new OpenAI({ apiKey, timeout, maxRetries: 1 });
  const size = getImageSize(aspectRatio);

  if (referenceImageUrls.length) {
    try {
      const referenceFiles = await loadReferenceImages(referenceImageUrls);
      if (referenceFiles.length) {
        const edited = await client.images.edit({
          model,
          image: referenceFiles.length === 1 ? referenceFiles[0] : referenceFiles,
          prompt: `${prompt}\n\nUse the attached SmartFurni product images as authoritative product references. Preserve recognizable geometry, materials and brand identity, but create an original editorial composition and background.`,
          input_fidelity: "high",
          n: variantCount,
          size,
          quality: "medium",
          output_format: "webp",
          output_compression: 88,
        });
        const variants = extractVariants(edited.data);
        if (variants.length) return { variants, model };
      }
    } catch (error) {
      console.warn("Không thể dùng ảnh sản phẩm tham chiếu, chuyển sang tạo ảnh từ prompt.", error);
    }
  }

  const result = await client.images.generate({
    model,
    prompt,
    n: variantCount,
    size,
    quality: "medium",
    output_format: "webp",
    output_compression: 88,
    background: "opaque",
  });
  const variants = extractVariants(result.data);
  if (variants.length === 0) throw new Error("OpenAI không trả về dữ liệu ảnh");
  return { variants, model };
}

export function getImageGenerationErrorMessage(error: unknown) {
  const details = error as { status?: number; code?: string; name?: string; message?: string };
  const message = details?.message || "";

  if (/OPENAI_API_KEY/i.test(message)) return message;
  if (details.status === 401 || details.status === 403) {
    return "OpenAI từ chối xác thực. Hãy kiểm tra OPENAI_API_KEY và quyền truy cập model trong Railway.";
  }
  if (details.status === 429) {
    return "OpenAI đang giới hạn yêu cầu hoặc tài khoản đã hết hạn mức. Hãy kiểm tra Usage và Billing của OpenAI rồi thử lại.";
  }
  if (details.status === 400) {
    return "OpenAI từ chối cấu hình tạo ảnh. Hãy kiểm tra OPENAI_IMAGE_MODEL và quyền sử dụng model của tài khoản.";
  }
  if ((details.status && details.status >= 500) || /upstream error|gateway|service unavailable/i.test(message)) {
    return "Dịch vụ tạo ảnh OpenAI đang tạm gián đoạn. Hãy thử lại sau 30–60 giây.";
  }
  if (/timeout|timed out|ETIMEDOUT|ECONNRESET|connection reset|aborted/i.test(message)) {
    return "Yêu cầu tạo ảnh vượt thời gian chờ. Hệ thống đã chuyển sang tạo từng phương án; hãy thử lại một lần nữa.";
  }

  return message || "Không thể tạo ảnh từ OpenAI";
}

export function decodeImageDataUrl(dataUrl: string): Buffer {
  const match = /^data:image\/(?:webp|png|jpeg);base64,([a-zA-Z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new Error("Dữ liệu ảnh xem trước không hợp lệ");
  const buffer = Buffer.from(match[1], "base64");
  if (!buffer.length || buffer.length > MAX_APPROVAL_IMAGE_BYTES) {
    throw new Error("Ảnh duyệt vượt quá giới hạn 15MB hoặc không có dữ liệu");
  }
  return buffer;
}
