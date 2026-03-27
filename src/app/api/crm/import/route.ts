import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { createLead, getLeads } from "@/lib/crm-store";
import type { Lead, LeadStage, LeadType } from "@/lib/crm-store";

// ─── Export ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "csv";

  if (format === "template") {
    const headerRow = [
      "Tên khách hàng", "Điện thoại", "Email", "Công ty",
      "Phân loại (architect/investor/dealer)",
      "Giai đoạn (new/profile_sent/surveyed/quoted/negotiating/won/lost)",
      "Nguồn (Facebook Ads/Google Ads/KTS giới thiệu/...)",
      "Tỉnh/Thành phố", "Quận/Huyện",
      "Giá trị dự kiến (VND)", "Số lượng dự kiến",
      "Tên dự án", "Ghi chú",
    ].join(",");
    const exampleRow = [
      "Nguyễn Văn A", "0901234567", "a@example.com", "Công ty ABC",
      "investor", "new", "Facebook Ads",
      "TP. Hồ Chí Minh", "Quận 7",
      "500000000", "20",
      "Dự án căn hộ XYZ", "Quan tâm giường Pro Max",
    ].join(",");
    return new NextResponse(`${headerRow}\n${exampleRow}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="smartfurni_crm_template.csv"`,
      },
    });
  }

  // Export actual data
  const leads = await getLeads({}) as Lead[];
  const csvHeaders = [
    "ID", "Tên khách hàng", "Điện thoại", "Email", "Công ty",
    "Phân loại", "Giai đoạn", "Nguồn", "Quận/Huyện",
    "Giá trị dự kiến", "Số lượng", "Tên dự án", "Ghi chú",
    "Ngày tạo", "Tương tác cuối",
  ];
  const csvRows = leads.map((l: Lead) => [
    l.id, l.name, l.phone, l.email, l.company,
    l.type, l.stage, l.source, l.district,
    l.expectedValue, l.unitCount, l.projectName, l.notes,
    l.createdAt, l.lastContactAt,
  ].map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
  const csv = [csvHeaders.join(","), ...csvRows].join("\n");
  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="smartfurni_crm_export_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

// ─── Helper: parse row to createLead input ────────────────────────────────────

function parseRow(row: Record<string, string>, lineNum: number): Omit<Lead, "id" | "createdAt" | "updatedAt"> | null {
  const name = row["Tên khách hàng"]?.trim() || row["name"]?.trim();
  if (!name) return null;

  const validTypes: LeadType[] = ["architect", "investor", "dealer"];
  const typeMap: Record<string, LeadType> = {
    "kiến trúc sư": "architect", "architect": "architect",
    "chủ đầu tư chdv": "investor", "investor": "investor",
    "đại lý": "dealer", "dealer": "dealer",
  };
  const typeRaw = (
    row["Phân loại (architect/investor/dealer)"] ??
    row["Loại khách hàng"] ??
    row["type"] ?? ""
  ).trim().toLowerCase();
  const type: LeadType = typeMap[typeRaw] ?? (validTypes.includes(typeRaw as LeadType) ? typeRaw as LeadType : "investor");

  const validStages: LeadStage[] = ["new", "profile_sent", "surveyed", "quoted", "negotiating", "won", "lost"];
  const stageMap: Record<string, LeadStage> = {
    "khách hàng mới": "new", "new": "new",
    "đã gửi profile": "profile_sent", "profile_sent": "profile_sent",
    "đã khảo sát": "surveyed", "surveyed": "surveyed",
    "đã báo giá": "quoted", "quoted": "quoted",
    "thương thảo": "negotiating", "negotiating": "negotiating",
    "đã chốt": "won", "won": "won",
    "thất bại": "lost", "lost": "lost",
  };
  const stageRaw = (
    row["Giai đoạn (new/profile_sent/surveyed/quoted/negotiating/won/lost)"] ??
    row["Giai đoạn"] ??
    row["stage"] ?? ""
  ).trim().toLowerCase();
  const stage: LeadStage = stageMap[stageRaw] ?? (validStages.includes(stageRaw as LeadStage) ? stageRaw as LeadStage : "new");

  const evRaw = row["Giá trị dự kiến (VND)"] ?? row["Giá trị dự kiến"] ?? row["expectedValue"] ?? "";
  const ucRaw = row["Số lượng dự kiến"] ?? row["Số lượng"] ?? row["unitCount"] ?? "";

  return {
    name,
    company: row["Công ty"]?.trim() || row["company"]?.trim() || "",
    phone: row["Điện thoại"]?.trim() || row["phone"]?.trim() || "",
    email: row["Email"]?.trim() || row["email"]?.trim() || "",
    type,
    stage,
    district: (row["Quận/Huyện"] ?? row["district"] ?? "").trim(),
    expectedValue: evRaw ? parseInt(evRaw.replace(/\D/g, "")) || 0 : 0,
    source: (row["Nguồn (Facebook Ads/Google Ads/KTS giới thiệu/...)"] ?? row["Nguồn"] ?? row["source"] ?? "").trim(),
    assignedTo: (row["Phụ trách"] ?? row["assignedTo"] ?? "").trim(),
    notes: (row["Ghi chú"] ?? row["notes"] ?? "").trim(),
    lastContactAt: new Date().toISOString(),
    tags: [],
    projectName: (row["Tên dự án"] ?? row["projectName"] ?? "").trim(),
    projectAddress: (row["Địa chỉ dự án"] ?? row["projectAddress"] ?? "").trim(),
    unitCount: ucRaw ? parseInt(ucRaw) || 0 : 0,
  };
}

// ─── Import ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = req.headers.get("content-type") ?? "";
  let rows: Record<string, string>[] = [];

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
    const text = await file.text();
    const lines = text.split("\n").map((l: string) => l.trim()).filter(Boolean);
    if (lines.length < 2) return NextResponse.json({ success: 0, errors: ["File rỗng"] });
    const headers = lines[0].split(",").map((h: string) => h.replace(/^"|"$/g, "").trim());
    rows = lines.slice(1).map((line: string) => {
      const cols = line.split(",").map((c: string) => c.replace(/^"|"$/g, "").trim());
      const row: Record<string, string> = {};
      headers.forEach((h: string, idx: number) => { row[h] = cols[idx] ?? ""; });
      return row;
    });
  } else {
    const body = await req.json();
    rows = body.rows ?? [];
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const results = { success: 0, failed: 0, errors: [] as string[] };
  for (let i = 0; i < rows.length; i++) {
    try {
      const input = parseRow(rows[i], i + 2);
      if (!input) {
        results.failed++;
        results.errors.push(`Dòng ${i + 2}: Thiếu tên khách hàng`);
        continue;
      }
      await createLead(input);
      results.success++;
    } catch (e) {
      results.failed++;
      results.errors.push(`Dòng ${i + 2}: ${(e as Error).message}`);
    }
  }
  return NextResponse.json(results);
}
