import { getCrmSession } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";
import { getCallLogs, createCallLog, updateCallLog, deleteCallLog } from "@/lib/crm-store";

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

  // Nhân viên chỉ xem được cuộc gọi của mình
  if (!session.isAdmin && session.staffId) {
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
  const log = await createCallLog({
    callId: body.callId ?? `manual_${Date.now()}`,
    callerNumber: body.callerNumber ?? "",
    receiverNumber: body.receiverNumber ?? "",
    direction: body.direction ?? "outbound",
    status: body.status ?? "answered",
    duration: Number(body.duration ?? 0),
    recordingUrl: body.recordingUrl,
    staffId: body.staffId ?? session.staffId,
    staffName: body.staffName,
    leadId: body.leadId,
    leadName: body.leadName,
    note: body.note,
    provider: body.provider ?? "manual",
    startedAt: body.startedAt ?? new Date().toISOString(),
    endedAt: body.endedAt,
  });
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
