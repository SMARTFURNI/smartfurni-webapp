import { NextRequest, NextResponse } from "next/server";
import { getDriveClient, ROOT_FOLDER_ID } from "@/lib/google-drive";
import { Readable } from "stream";

// 10 phút timeout cho upload file lớn
export const maxDuration = 600;
export const dynamic = "force-dynamic";

/**
 * POST /api/crm/drive/upload
 * Upload file lên Google Drive bằng raw binary body
 *
 * Query params:
 *   - folderId: string (ID thư mục đích, mặc định ROOT_FOLDER_ID)
 *   - fileName: string (tên file)
 *   - mimeType: string (MIME type của file)
 *
 * Body: raw binary bytes của file
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId") || ROOT_FOLDER_ID;
    const fileName = searchParams.get("fileName") || "upload";
    const mimeType = searchParams.get("mimeType") || "application/octet-stream";

    // Đọc raw binary từ request body (không dùng formData để tránh giới hạn size)
    const arrayBuffer = await request.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return NextResponse.json({ error: "Không nhận được dữ liệu file" }, { status: 400 });
    }

    const buffer = Buffer.from(arrayBuffer);

    // Tạo Readable stream từ buffer để upload lên Google Drive
    const stream = new Readable({
      read() {
        this.push(buffer);
        this.push(null);
      },
    });

    const drive = getDriveClient();
    const uploaded = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: stream,
      },
      fields: "id, name, webViewLink, mimeType, size",
    });

    return NextResponse.json({ file: uploaded.data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Drive upload error]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
