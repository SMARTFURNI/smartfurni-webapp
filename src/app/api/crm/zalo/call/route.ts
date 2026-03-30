/**
 * POST /api/crm/zalo/call
 * Gửi yêu cầu gọi điện qua Zalo Cloud Connect (ZCC)
 * Người dùng sẽ nhận thông báo Zalo để chấp nhận cuộc gọi
 *
 * Body: { phone, leadId?, leadName?, callType?, reasonCode?, staffId?, staffName? }
 */
import { getCrmSession } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";
import { requestZaloCall, checkZaloCallConsent, type ZaloCallType, type ZaloCallReasonCode } from "@/lib/zalo-cloud";
import { createCallLog } from "@/lib/crm-store";

export async function POST(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json() as {
      phone: string;
      leadId?: string;
      leadName?: string;
      callType?: ZaloCallType;
      reasonCode?: ZaloCallReasonCode;
      staffId?: string;
      staffName?: string;
    };

    if (!body.phone) {
      return NextResponse.json({ error: "Thiếu số điện thoại" }, { status: 400 });
    }

    // Gửi yêu cầu gọi qua Zalo
    const result = await requestZaloCall({
      phone: body.phone,
      callType: body.callType ?? "audio",
      reasonCode: body.reasonCode ?? "product_service_consulting",
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Lưu cuộc gọi vào call_logs
    const staffId = body.staffId ?? session.staffId ?? "system";
    const staffName = body.staffName ?? session.name ?? "Hệ thống";

    try {
      await createCallLog({
        callId: result.data?.id ?? `zcc-${Date.now()}`,
        callerNumber: "SmartFurni OA",
        receiverNumber: body.phone,
        direction: "outbound",
        status: "missed",          // Sẽ cập nhật qua webhook khi có phản hồi
        duration: 0,
        provider: "zalo",
        staffId,
        staffName,
        leadId: body.leadId,
        leadName: body.leadName,
        note: `Yêu cầu gọi Zalo Cloud - chờ phản hồi từ khách hàng`,
        startedAt: new Date().toISOString(),
      });
    } catch (dbErr) {
      console.error("[ZaloCall] Failed to save call log:", dbErr);
      // Không fail request nếu lưu DB lỗi
    }

    return NextResponse.json({
      ok: true,
      callId: result.data?.id,
      status: result.data?.status,
      deliveryStatus: result.data?.deliveryStatus,
      expiresAt: result.data?.expiresAt,
      message: "Đã gửi yêu cầu gọi Zalo đến khách hàng. Khách hàng sẽ nhận thông báo trong ứng dụng Zalo.",
    });
  } catch (e) {
    console.error("[ZaloCall] Error:", e);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

/**
 * GET /api/crm/zalo/call?phone=xxx
 * Kiểm tra khách hàng đã cấp quyền gọi chưa
 */
export async function GET(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone");

  if (!phone) {
    return NextResponse.json({ error: "Thiếu số điện thoại" }, { status: 400 });
  }

  const result = await checkZaloCallConsent(phone);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, hasConsent: result.hasConsent });
}
