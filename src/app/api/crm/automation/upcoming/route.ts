import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getUpcomingAutomationReport } from "@/lib/crm-upcoming-automation";

export const dynamic = "force-dynamic";

function csvCell(value: unknown): string {
  const raw = String(value ?? "");
  const text = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(req: NextRequest) {
  if (!await getAdminSession()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const params = req.nextUrl.searchParams;
    const report = await getUpcomingAutomationReport({
      from: params.get("from") || undefined,
      to: params.get("to") || undefined,
      journeyCode: params.get("journeyCode") || undefined,
      channel: params.get("channel") || undefined,
      readiness: params.get("readiness") || undefined,
      source: params.get("source") || undefined,
      assignedTo: params.get("assignedTo") || undefined,
      search: params.get("search") || undefined,
    });

    if (params.get("format") === "csv") {
      const headers = [
        "Thời gian gửi", "Khách hàng", "Công ty", "Người nhận", "Kênh",
        "Workflow / Quy tắc", "Bước", "Trạng thái sẵn sàng", "Lý do",
        "Nhân viên", "Nguồn", "Tiêu đề", "Nội dung", "Lead ID",
      ];
      const rows = report.items.map(item => [
        item.effectiveSendAt, item.leadName, item.company, item.recipient, item.channel,
        item.journeyName, item.stepTitle, item.readiness, item.readinessReason,
        item.assignedTo, item.leadSource, item.subject, item.message, item.leadId,
      ]);
      const csv = `\uFEFF${[headers, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n")}`;
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="lich-sap-gui-${report.filters.from}-${report.filters.to}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[Upcoming automation]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không tải được lịch sắp gửi" },
      { status: 500 },
    );
  }
}
