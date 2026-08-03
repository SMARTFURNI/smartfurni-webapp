import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { sendZaloAttachment } from "@/lib/zalo-oa-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const FILE_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "text/plain",
]);

function responseError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: NextRequest) {
  if (!await getCrmSession()) return responseError("Unauthorized", 401);

  try {
    const form = await req.formData();
    const userId = String(form.get("userId") || "").trim();
    const kind = String(form.get("kind") || "") as "image" | "file";
    const upload = form.get("file");

    if (!userId) return responseError("Thiếu Zalo UID của người nhận.");
    if (!["image", "file"].includes(kind)) return responseError("Loại đính kèm không hợp lệ.");
    if (!(upload instanceof File) || upload.size === 0) return responseError("Chưa chọn tệp cần gửi.");

    if (kind === "image") {
      if (!IMAGE_TYPES.has(upload.type)) return responseError("Zalo OA chỉ nhận ảnh JPG, PNG, GIF hoặc WebP từ CRM.");
      if (upload.size > 5 * 1024 * 1024) return responseError("Ảnh không được vượt quá 5 MB.");
    } else {
      if (upload.type && !FILE_TYPES.has(upload.type)) return responseError("Định dạng tệp này chưa được phép gửi từ CRM.");
      if (upload.size > 10 * 1024 * 1024) return responseError("Tệp không được vượt quá 10 MB.");
    }

    const result = await sendZaloAttachment({
      userId,
      file: upload,
      filename: upload.name || (kind === "image" ? "anh-zalo.jpg" : "tep-zalo"),
      mimeType: upload.type || "application/octet-stream",
      kind,
      source: "manual",
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  } catch (error) {
    return responseError(error instanceof Error ? error.message : "Không gửi được tệp qua Zalo OA.", 500);
  }
}
