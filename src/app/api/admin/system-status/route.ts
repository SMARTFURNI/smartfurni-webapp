import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let database = false;
  try {
    await query("SELECT 1");
    database = true;
  } catch {
    database = false;
  }

  return NextResponse.json({
    database,
    githubMedia: Boolean(process.env.GITHUB_MEDIA_TOKEN && process.env.GITHUB_MEDIA_OWNER && process.env.GITHUB_MEDIA_REPO),
    resend: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
    smtp: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && (process.env.SMTP_PASS || process.env.SMTP_PASSWORD)),
    zalo: Boolean((process.env.ZALO_ACCESS_TOKEN || process.env.ZALO_REFRESH_TOKEN) && (process.env.ZALO_OA_ID || process.env.ZALO_OFFICIAL_ACCOUNT_ID)),
    sessionSecret: Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32),
  });
}
