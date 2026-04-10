import { NextRequest, NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/admin-auth";
import { dbGetSetting } from "@/lib/db-store";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface TikTokConnection {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  openId: string;
  displayName: string;
}

/**
 * POST /api/crm/tiktok/post
 * Khởi tạo upload video lên TikTok
 * Body: { action: "init_upload", fileSize: number, chunkSize: number, totalChunks: number }
 *       { action: "publish", uploadId: string, title: string, privacy: string, disableComment: boolean, disableDuet: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    await requireCrmAccess();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = await dbGetSetting<TikTokConnection>("tiktok_connection");
  if (!connection || Date.now() > connection.expiresAt) {
    return NextResponse.json({ error: "TikTok chưa kết nối hoặc token đã hết hạn" }, { status: 401 });
  }

  const { accessToken } = connection;
  const body = await request.json();
  const { action } = body;

  if (action === "publish") {
    // Khởi tạo Direct Post session - browser sẽ upload video trực tiếp lên uploadUrl
    const { title, privacyLevel, disableComment, disableDuet, disableStitch, fileSize, chunkSize, totalChunks } = body;

    const publishRes = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        post_info: {
          title: (title || "").substring(0, 2200),
          privacy_level: privacyLevel || "PUBLIC_TO_EVERYONE",
          disable_comment: disableComment || false,
          disable_duet: disableDuet || false,
          disable_stitch: disableStitch || false,
        },
        source_info: {
          source: "FILE_UPLOAD",
          video_size: fileSize || 0,
          chunk_size: chunkSize || 0,
          total_chunk_count: totalChunks || 1,
        },
      }),
    });

    const publishData = await publishRes.json();
    console.log("TikTok publish init response:", JSON.stringify(publishData));

    if (publishData.error?.code !== "ok") {
      console.error("TikTok publish error:", publishData);
      return NextResponse.json({
        ok: false,
        error: publishData.error?.message || "Không thể khởi tạo đăng bài TikTok",
        raw: publishData,
      }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      publishId: publishData.data?.publish_id,
      uploadUrl: publishData.data?.upload_url,
    });
  }

  if (action === "check_status") {
    const { publishId } = body;
    const statusRes = await fetch("https://open.tiktokapis.com/v2/post/publish/status/fetch/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({ publish_id: publishId }),
    });
    const statusData = await statusRes.json();
    return NextResponse.json(statusData);
  }

  return NextResponse.json({ error: "Action không hợp lệ" }, { status: 400 });
}
