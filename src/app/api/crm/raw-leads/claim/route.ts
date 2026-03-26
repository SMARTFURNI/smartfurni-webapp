import { getCrmSession } from "@/lib/admin-auth";
import { getStaffById } from "@/lib/crm-staff-store";
import { claimRawLead, convertRawLead } from "@/lib/crm-raw-lead-store";
import { createLead } from "@/lib/crm-store";
import { NextRequest, NextResponse } from "next/server";

// Mapping nguồn raw lead → source string trong CRM lead
const SOURCE_MAP: Record<string, string> = {
  facebook_lead: "Facebook Ads",
  tiktok_lead: "TikTok Ads",
  manual: "Nhập tay",
  other: "Khác",
};

export async function POST(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    let staffId: string;
    let staffName: string;

    if (session.isAdmin) {
      staffId = "admin";
      staffName = "Admin";
    } else {
      if (!session.staffId) return NextResponse.json({ error: "No staff session" }, { status: 401 });
      const staff = await getStaffById(session.staffId);
      if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });
      staffId = staff.id;
      staffName = staff.fullName;
    }

    // 1. Claim raw lead (FIFO check)
    const claimResult = await claimRawLead(id, staffId, staffName);
    if (!claimResult.success) {
      return NextResponse.json({ error: claimResult.error }, { status: 409 });
    }

    const rawLead = claimResult.lead!;

    // 2. Tự động tạo CRM lead gán cho nhân viên vừa nhận
    try {
      const notesArr = [
        rawLead.message ? `Ghi chú từ form: ${rawLead.message}` : "",
        rawLead.adName ? `Quảng cáo: ${rawLead.adName}` : "",
        rawLead.campaignName ? `Chiến dịch: ${rawLead.campaignName}` : "",
        rawLead.formName ? `Form: ${rawLead.formName}` : "",
      ].filter(Boolean);

      const crmLead = await createLead({
        name: rawLead.fullName || "Khách hàng mới",
        company: "",
        phone: rawLead.phone || "",
        email: rawLead.email || "",
        type: "investor",
        stage: "new",
        district: "",
        expectedValue: 0,
        source: SOURCE_MAP[rawLead.source] || rawLead.source,
        assignedTo: staffName,
        notes: notesArr.join("\n"),
        lastContactAt: new Date().toISOString(),
        tags: [SOURCE_MAP[rawLead.source] || rawLead.source],
        projectName: "",
        projectAddress: "",
        unitCount: 0,
      });

      // 3. Đánh dấu raw lead là converted
      await convertRawLead(id, crmLead.id);

      return NextResponse.json({
        rawLead: { ...rawLead, status: "converted", convertedLeadId: crmLead.id },
        crmLead,
        autoConverted: true,
      });
    } catch (convertErr) {
      // Nếu tạo lead thất bại, vẫn trả về claimed (không rollback claim)
      console.error("[raw-leads claim] Failed to auto-create CRM lead:", convertErr);
      return NextResponse.json({
        rawLead,
        autoConverted: false,
        warning: "Đã nhận data nhưng không thể tự động tạo khách hàng. Vui lòng tạo thủ công.",
      });
    }
  } catch (e) {
    console.error("[raw-leads claim]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
