import { getCrmSession } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";
import { getCallLogs, createCallLog, updateCallLog, deleteCallLog, createActivity } from "@/lib/crm-store";
import { getStaffById } from "@/lib/crm-staff-store";
import { formatDuration } from "@/lib/crm-types";

export const dynamic = "force-dynamic";

// GET /api/crm/call-logs — Lấy danh sách cuộc gọi
export async function GET(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filters: Parameters<typeof getCallLogs>[0] = {
    limit: Number(searchParams.get("limit") ?? 100),
    offset: Number(searchParams.get("offset") ?? 0),
  };

  // Nhân viên chỉ xem được cuộc gọi của mình, trừ khi query theo leadId (xem lịch sử khách hàng)
  const queryLeadId = searchParams.get("leadId");
  if (!session.isAdmin && session.staffId && !queryLeadId) {
    filters.staffId = session.staffId;
  } else if (searchParams.get("staffId")) {
    filters.staffId = searchParams.get("staffId")!;
  }

  if (searchParams.get("leadId")) filters.leadId = searchParams.get("leadId")!;
  if (searchParams.get("status")) filters.status = searchParams.get("status")!;
  if (searchParams.get("dateFrom")) filters.dateFrom = searchParams.get("dateFrom")!;
  if (searchParams.get("dateTo")) filters.dateTo = searchParams.get("dateTo")!;
  if (searchParams.get("search")) filters.search = searchParams.get("search")!;

  const logs = await getCallLogs(filters);
  return NextResponse.json(logs);
}

// POST /api/crm/call-logs — Tạo cuộc gọi thủ công
export async function POST(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  // Tự động lookup staffName từ DB nếu chưa có (trường hợp JsSIP lưu tự động)
  const resolvedStaffId = body.staffId ?? session.staffId;
  let resolvedStaffName = body.staffName;
  if (!resolvedStaffName && resolvedStaffId) {
    try {
      const staff = await getStaffById(resolvedStaffId);
      resolvedStaffName = staff?.fullName;
    } catch { /* bỏ qua lỗi lookup */ }
  }
  // Nếu là admin (không có staffId), dùng tên admin mặc định
  if (!resolvedStaffName && session.isAdmin) {
    resolvedStaffName = "Admin";
  }
  const callDuration = Number(body.duration ?? 0);
  const callStatus = body.status ?? "answered";
  const log = await createCallLog({
    callId: body.callId ?? `manual_${Date.now()}`,
    callerNumber: body.callerNumber ?? "",
    receiverNumber: body.receiverNumber ?? "",
    direction: body.direction ?? "outbound",
    status: callStatus,
    duration: callDuration,
    recordingUrl: body.recordingUrl,
    staffId: resolvedStaffId,
    staffName: resolvedStaffName,
    leadId: body.leadId,
    leadName: body.leadName,
    note: body.note,
    provider: body.provider ?? "manual",
    startedAt: body.startedAt ?? new Date().toISOString(),
    endedAt: body.endedAt,
  });

  // Tự động tạo activity "Gọi điện" trong Lịch sử tương tác nếu có leadId
  if (log.leadId) {
    try {
      const statusLabel = callStatus === "answered" ? "Thành công" : callStatus === "missed" ? "Không ngập máy" : callStatus === "busy" ? "Bận" : "Thất bại";
      const durationText = callDuration > 0 ? ` • ${formatDuration(callDuration)}` : "";
      const staffText = resolvedStaffName ? ` • ${resolvedStaffName}` : "";
      await createActivity({
        leadId: log.leadId,
        type: "call",
        title: "Gọi điện",
        content: `${statusLabel}${durationText}${staffText}`,
        createdBy: resolvedStaffName ?? resolvedStaffId ?? "Hệ thống",
        attachments: [],
      });
    } catch (e) {
      // Không để lỗi tạo activity ảnh hưởng đến việc lưu call log
      console.error("[call-logs] Failed to create activity:", e);
    }
  }

  return NextResponse.json(log, { status: 201 });
}

// PATCH /api/crm/call-logs — Cập nhật ghi chú
export async function PATCH(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const updated = await updateCallLog(id, updates);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

// DELETE /api/crm/call-logs?id=xxx — Xóa (chỉ admin)
export async function DELETE(req: NextRequest) {
  const session = await getCrmSession();
  if (!session?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await deleteCallLog(id);
  return NextResponse.json({ success: true });
}
