/**
 * ITY SIP Credentials API (Server-side only)
 * GET /api/crm/ity/sip-credentials
 *
 * Trả về SIP password cho JsSIP webphone.
 * Chỉ accessible khi đã đăng nhập CRM.
 * Password được lưu trong env var, không expose trong config API.
 */
import { NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireCrmAccess();

    const sipPassword = process.env.ITY_SIP_PASSWORD;
    const sipDomain = process.env.ITY_SIP_DOMAIN || process.env.ITY_DOMAIN || "c90408.ity.vn";
    const extension = session.extension || process.env.ITY_DEFAULT_EXTENSION || "101";

    if (!sipPassword) {
      return NextResponse.json({ error: "SIP password chưa được cấu hình" }, { status: 503 });
    }

    return NextResponse.json({
      uri: `sip:${extension}@${sipDomain}`,
      password: sipPassword,
      extension,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
