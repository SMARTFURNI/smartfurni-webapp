import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import {
  getJourneyEnrollmentTimeline,
  getJourneyWorkflowReport,
} from "@/lib/crm-journey-reporting";

export const dynamic = "force-dynamic";

function csvCell(value: unknown): string {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const params = req.nextUrl.searchParams;
    const enrollmentId = params.get("enrollmentId") || "";
    if (enrollmentId) {
      const timeline = await getJourneyEnrollmentTimeline(enrollmentId);
      if (!timeline) return NextResponse.json({ error: "Không tìm thấy enrollment" }, { status: 404 });
      return NextResponse.json(timeline);
    }

    const report = await getJourneyWorkflowReport({
      from: params.get("from") || undefined,
      to: params.get("to") || undefined,
      journeyCode: params.get("journeyCode") || undefined,
      channel: params.get("channel") || undefined,
      source: params.get("source") || undefined,
      assignedTo: params.get("assignedTo") || undefined,
    });

    if (params.get("format") === "csv") {
      const headers = [
        "Workflow", "Lead ID", "Khách hàng", "Công ty", "Nguồn", "Nhân viên",
        "Giai đoạn CRM", "Trạng thái workflow", "Ngày tham gia", "Lần gửi cuối",
        "Bước đã gửi", "Bước đến hạn", "Đã phản hồi", "Giá trị dự kiến", "Lý do tạm dừng",
      ];
      const rows = report.leads.map(item => [
        item.journeyCode, item.leadId, item.leadName, item.company, item.source,
        item.assignedTo, item.stage, item.enrollmentStatus, item.enrolledAt,
        item.lastOutboundAt || "", item.sentSteps, item.dueSteps,
        item.responded ? "Có" : "Chưa", item.expectedValue, item.pausedReason,
      ]);
      const csv = `\uFEFF${[headers, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n")}`;
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="workflow-report-${report.filters.from}-${report.filters.to}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[Journey reports]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không tạo được báo cáo" }, { status: 500 });
  }
}
