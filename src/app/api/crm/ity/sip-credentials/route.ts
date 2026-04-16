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
    const sipDomain = process.env.ITY_SIP_DOMAIN || process.env.ITY_DOMAIN || "c89866.ity.vn";
    const ityCustomer = process.env.ITY_CUSTOMER || "89866001";
    // Extension của nhân viên (nếu có), nếu không dùng customer ID
    const extension = session.extension || process.env.ITY_DEFAULT_EXTENSION || "";
    // SIP user: nếu có extension thì dùng extension, nếu không dùng customer ID
    const sipUser = extension || ityCustomer;

    if (!sipPassword) {
      return NextResponse.json({ error: "SIP password chưa được cấu hình" }, { status: 503 });
    }

    return NextResponse.json({
      uri: `sip:${sipUser}@${sipDomain}`,
      password: sipPassword,
      extension: sipUser,
      authorizationUser: sipUser,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
