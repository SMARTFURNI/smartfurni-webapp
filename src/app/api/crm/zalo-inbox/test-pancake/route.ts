import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const creds = await db.query(
    `SELECT page_id, page_name, page_access_token FROM pancake_credentials WHERE is_active = TRUE LIMIT 1`
  );

  if (!creds.rows[0]) return NextResponse.json({ error: "No credentials in DB" });

  const { page_id, page_name, page_access_token } = creds.rows[0];
  const tokenLen = page_access_token?.length || 0;

  // Test Pancake API trực tiếp
  const url = `https://pages.fm/api/public_api/v2/pages/${page_id}/conversations?page_access_token=${page_access_token}&type=${encodeURIComponent(JSON.stringify(["INBOX"]))}`;

  try {
    const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* ignore */ }

    return NextResponse.json({
      page_id,
      page_name,
      token_length: tokenLen,
      token_preview: page_access_token?.substring(0, 30) + "...",
      pancake_status: res.status,
      pancake_ok: res.ok,
      pancake_response: json || text.substring(0, 1000),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, page_id, token_length: tokenLen });
  }
}
