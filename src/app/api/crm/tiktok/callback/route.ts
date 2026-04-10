import { NextRequest, NextResponse } from "next/server";
import { dbSaveSetting } from "@/lib/db-store";

export const dynamic = "force-dynamic";

const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY || "";
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET || "";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get("host")}`;

  if (error || !code) {
    return NextResponse.redirect(`${baseUrl}/crm/facebook-scheduler?tiktok_error=${error || "no_code"}&tab=tiktok`);
  }

  try {
    const redirectUri = `${baseUrl}/api/crm/tiktok/callback`;

    // Đổi code lấy access token
    const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: TIKTOK_CLIENT_KEY,
        client_secret: TIKTOK_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error("TikTok token error:", tokenData);
      return NextResponse.redirect(`${baseUrl}/crm/facebook-scheduler?tiktok_error=${tokenData.error_description || tokenData.error}&tab=tiktok`);
    }

    const { access_token, refresh_token, expires_in, open_id, scope } = tokenData;

    // Lấy thông tin user TikTok
    let userInfo: { display_name?: string; avatar_url?: string; username?: string } = {};
    try {
      const userRes = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url,username", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const userData = await userRes.json();
      if (userData.data?.user) {
        userInfo = userData.data.user;
      }
    } catch (e) {
      console.error("TikTok user info error:", e);
    }

    // Lưu token vào DB
    await dbSaveSetting("tiktok_connection", {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: Date.now() + (expires_in * 1000),
      openId: open_id,
      scope,
      displayName: userInfo.display_name || "TikTok User",
      avatarUrl: userInfo.avatar_url || "",
      username: userInfo.username || "",
      connectedAt: new Date().toISOString(),
    });

    return NextResponse.redirect(`${baseUrl}/crm/facebook-scheduler?tiktok_connected=1&tab=tiktok`);
  } catch (err) {
    console.error("TikTok callback error:", err);
    return NextResponse.redirect(`${baseUrl}/crm/facebook-scheduler?tiktok_error=${encodeURIComponent((err as Error).message)}&tab=tiktok`);
  }
}
