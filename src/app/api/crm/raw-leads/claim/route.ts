import { getCrmSession } from "@/lib/admin-auth";
import { getStaffById } from "@/lib/crm-staff-store";
import { claimRawLead, convertRawLead, releaseRawLeadClaim } from "@/lib/crm-raw-lead-store";
import { createOrMergeStandardizedLead } from "@/lib/crm-store";
import { buildLeadFromRawLead } from "@/lib/crm-lead-standardization";
import { NextRequest, NextResponse } from "next/server";

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
      const result = await createOrMergeStandardizedLead(buildLeadFromRawLead(rawLead, staffName));
      const crmLead = result.lead;

      // 3. Đánh dấu raw lead là converted
      await convertRawLead(id, crmLead.id);

      return NextResponse.json({
        rawLead: { ...rawLead, status: "converted", convertedLeadId: crmLead.id },
        crmLead,
        autoConverted: true,
        created: result.created,
        deduplicated: !result.created,
        matchedBy: result.matchedBy,
      });
    } catch (convertErr) {
      await releaseRawLeadClaim(id, staffId).catch(() => undefined);
      console.error("[raw-leads claim] Failed to auto-create CRM lead:", convertErr);
      return NextResponse.json({ error: "Không thể chuẩn hóa khách hàng. Data đã được hoàn lại hàng chờ để không bị thất lạc." }, { status: 500 });
    }
  } catch (e) {
    console.error("[raw-leads claim]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
