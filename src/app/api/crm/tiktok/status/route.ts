import { NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/admin-auth";
import { dbGetSetting } from "@/lib/db-store";

export const dynamic = "force-dynamic";

interface TikTokConnection {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  openId: string;
  displayName: string;
  avatarUrl: string;
  username: string;
  connectedAt: string;
}

export async function GET() {
  try {
    await requireCrmAccess();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = await dbGetSetting<TikTokConnection>("tiktok_connection");

  if (!connection) {
    return NextResponse.json({ connected: false });
  }

  const isExpired = Date.now() > connection.expiresAt;

  return NextResponse.json({
    connected: !isExpired,
    expired: isExpired,
    displayName: connection.displayName,
    username: connection.username,
    avatarUrl: connection.avatarUrl,
    connectedAt: connection.connectedAt,
    expiresAt: new Date(connection.expiresAt).toISOString(),
  });
}
