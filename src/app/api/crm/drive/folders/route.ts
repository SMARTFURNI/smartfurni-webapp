import { NextRequest, NextResponse } from "next/server";
import { getDriveClient, ROOT_FOLDER_ID } from "@/lib/google-drive";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get("parentId") || ROOT_FOLDER_ID;

    const drive = getDriveClient();
    const res = await drive.files.list({
      q: `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id, name, mimeType, modifiedTime)",
      orderBy: "name",
      pageSize: 100,
    });

    const folders = res.data.files || [];
    return NextResponse.json({ folders, parentId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Drive folders error]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
