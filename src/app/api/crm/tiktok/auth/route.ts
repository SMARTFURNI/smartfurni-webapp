import { NextRequest, NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY || "";
const SCOPES = [
  "user.info.basic",
  "video.publish",
  "video.upload",
].join(",");

export async function GET(request: NextRequest) {
  try {
    await requireCrmAccess();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!TIKTOK_CLIENT_KEY) {
    return NextResponse.json({ error: "TikTok Client Key chưa được cấu hình" }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get("host")}`;
  const redirectUri = `${baseUrl}/api/crm/tiktok/callback`;
  const state = Math.random().toString(36).substring(2);

  const params = new URLSearchParams({
    client_key: TIKTOK_CLIENT_KEY,
    scope: SCOPES,
    response_type: "code",
    redirect_uri: redirectUri,
    state,
  });

  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;

  return NextResponse.json({ authUrl, redirectUri });
}
