/**
 * ITY Click-to-Call API
 * POST /api/crm/ity/click2call
 *
 * Gọi API click2call của ITY để khởi tạo cuộc gọi từ softphone/IP phone.
 * ITY sẽ gọi đến máy lẻ của nhân viên trước, sau đó kết nối với số khách hàng.
 *
 * Tài liệu: https://docs.ity.vn/Options/apicrm.html
 * API: GET https://{ip_tong_dai}/wsapi/{customer}/click2call.php?secret={secret}&extension={extension}&phone={phone}
 */
import { NextRequest, NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/admin-auth";
import { createCallLog } from "@/lib/crm-store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireCrmAccess();

    const body = await req.json();
    const { phone, leadId, leadName, extension, userfield } = body as {
      phone: string;
      leadId?: string;
      leadName?: string;
      extension?: string;
      userfield?: string;
    };

    if (!phone) {
      return NextResponse.json({ error: "Thiếu số điện thoại" }, { status: 400 });
    }

    // Lấy cấu hình ITY từ env
    const ityDomain = process.env.ITY_DOMAIN || "c89866.ity.vn";
    const itySecret = process.env.ITY_SECRET;
    const ityCustomer = process.env.ITY_CUSTOMER || "89866001";

    if (!itySecret) {
      return NextResponse.json({ error: "ITY chưa được cấu hình (thiếu ITY_SECRET)" }, { status: 503 });
    }

    // Xác định extension của nhân viên (từ session hoặc body)
    const staffExtension = extension || session.extension || "101";
    const callUserfield = userfield || leadId || `lead_${Date.now()}`;

    // Gọi API click2call của ITY theo đúng spec:
    // GET https://{ip_tong_dai}/wsapi/{customer}/click2call.php?secret=...&extension=...&phone=...&domain=...&userfield=...
    const ityHost = process.env.ITY_HOST || "vpbx.ity.vn";
    const ityUrl = `https://${ityHost}/wsapi/${ityCustomer}/click2call.php?secret=${itySecret}&extension=${staffExtension}&phone=${encodeURIComponent(phone)}&domain=${encodeURIComponent(ityDomain)}&userfield=${encodeURIComponent(callUserfield)}`;

    const ityRes = await fetch(ityUrl, {
      method: "GET",
      signal: AbortSignal.timeout(10000),
    }).catch(() => null);

    let ityData: Record<string, unknown> = {};
    if (ityRes) {
      try {
        ityData = await ityRes.json();
      } catch {
        const text = await ityRes.text().catch(() => "");
        ityData = { raw: text, status: ityRes.status };
      }
    }

    // Tạo call log với trạng thái "pending" (sẽ được cập nhật qua webhook)
    const callId = `ity_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const callLog = await createCallLog({
      callId,
      callerNumber: staffExtension,
      receiverNumber: phone,
      direction: "outbound",
      status: "missed", // Sẽ được cập nhật khi ITY gửi webhook
      duration: 0,
      staffId: session.staffId,
      staffName: session.name,
      leadId,
      leadName,
      provider: "ity",
      startedAt: new Date().toISOString(),
      note: `Click-to-call qua ITY (ext: ${staffExtension})`,
    }).catch(err => {
      console.error("[ITY click2call] Lỗi tạo call log:", err);
      return null;
    });

    return NextResponse.json({
      success: true,
      message: `Đang kết nối cuộc gọi đến ${phone}...`,
      callId: callLog?.id,
      ityCallId: ityData.callid ?? ityData.call_id ?? callId,
      ityResponse: ityData,
      extension: staffExtension,
    });
  } catch (err) {
    console.error("[ITY click2call] Error:", err);
    return NextResponse.json({ error: "Lỗi khởi tạo cuộc gọi" }, { status: 500 });
  }
}
