import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, getStaffSession } from "@/lib/admin-auth";
import {
  getContentVideos,
  createContentVideo,
  loadContentMarketingFromDb,
  type ContentPlatform,
  type ContentStatus,
} from "@/lib/crm-content-store";

let loaded = false;
async function ensureLoaded() {
  if (!loaded) {
    await loadContentMarketingFromDb();
    loaded = true;
  }
}

async function getSession() {
  const admin = await getAdminSession();
  if (admin) {
    return {
      id: "admin",
      name: (admin as unknown as { username?: string }).username || "Admin",
      isAdmin: true,
    };
  }
  const staff = await getStaffSession();
  if (staff) {
    return { id: staff.staffId, name: staff.staffId, isAdmin: false };
  }
  return null;
}

// GET /api/crm/content/videos?status=idea&platform=tiktok
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureLoaded();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as ContentStatus | null;
  const platform = searchParams.get("platform") as ContentPlatform | null;

  const videos = getContentVideos({
    status: status ?? undefined,
    platform: platform ?? undefined,
  });

  return NextResponse.json(videos);
}

// POST /api/crm/content/videos — Tạo video mới
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureLoaded();

  const body = await req.json();
  const {
    title,
    topic,
    platform = "tiktok",
    script,
    scriptGeneratedBy,
    aiPrompt,
    durationSeconds,
    hashtags = [],
    notes,
    scheduledAt,
    assignedTo,
    assignedToName,
  } = body;

  if (!title) {
    return NextResponse.json(
      { error: "Thiếu thông tin bắt buộc: title" },
      { status: 400 }
    );
  }

  const video = await createContentVideo({
    title,
    topic,
    platform: platform as ContentPlatform,
    script,
    scriptGeneratedBy,
    aiPrompt,
    durationSeconds,
    hashtags,
    notes,
    scheduledAt,
    createdBy: session.id,
    createdByName: session.name,
    assignedTo,
    assignedToName,
  });

  return NextResponse.json(video, { status: 201 });
}
