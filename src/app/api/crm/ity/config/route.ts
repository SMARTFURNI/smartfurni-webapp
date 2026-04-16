/**
 * ITY Config API
 * GET /api/crm/ity/config
 *
 * Trả về cấu hình SIP/JsSIP cho softphone widget trên CRM.
 * Chỉ trả về thông tin cần thiết cho client (không expose password).
 */
import { NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireCrmAccess();

    // Cấu hình ITY từ env
    const ityDomain = process.env.ITY_DOMAIN || "c90408.ity.vn";
    const ityWss = process.env.ITY_WSS || "wss://vpbx.ity.vn:7443";
    const ityCustomer = process.env.ITY_CUSTOMER || "89866001";
    const itySecret = process.env.ITY_SECRET;

    // Extension của nhân viên (lấy từ session hoặc default)
    const extension = session.extension || process.env.ITY_DEFAULT_EXTENSION || "101";

    // SIP credentials cho JsSIP
    const sipUser = process.env.ITY_SIP_USER || ityCustomer;
    const sipPassword = process.env.ITY_SIP_PASSWORD;
    const sipDomain = process.env.ITY_SIP_DOMAIN || ityDomain;

    return NextResponse.json({
      enabled: !!(itySecret && sipPassword),
      sipConfig: {
        uri: `sip:${extension}@${sipDomain}`,
        wsServers: [ityWss],
        displayName: session.name || extension,
        authorizationUser: extension,
        // Password không được expose — client sẽ dùng endpoint riêng
        sessionTimersExpires: 120,
        registerExpires: 600,
        traceSip: false,
        hackViaTcp: false,
        hackIpInContact: false,
      },
      webphoneEnabled: !!(sipPassword),
      click2callEnabled: !!(itySecret),
      domain: ityDomain,
      wss: ityWss,
      extension,
      staffId: session.staffId,
      staffName: session.name,
      webhookUrls: {
        incomingCall: `/api/crm/ity/incoming-call`,
        outgoingCall: `/api/crm/ity/outgoing-call`,
        callCompleted: `/api/crm/ity/call-completed`,
      },
    });
  } catch (err) {
    console.error("[ITY config] Error:", err);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
