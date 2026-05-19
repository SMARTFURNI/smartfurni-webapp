import { NextRequest, NextResponse } from "next/server";
import { getDriveClient, ROOT_FOLDER_ID } from "@/lib/google-drive";
import { Readable } from "stream";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folderId = (formData.get("folderId") as string) || ROOT_FOLDER_ID;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const stream = Readable.from(buffer);

    const drive = getDriveClient();
    const uploaded = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: [folderId],
      },
      media: {
        mimeType: file.type || "application/octet-stream",
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

// Increase body size limit for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};
