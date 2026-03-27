import { NextRequest, NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/admin-auth";
import { getStaffById } from "@/lib/crm-staff-store";

export async function POST(request: NextRequest) {
  try {
    const session = await requireCrmAccess();
    if (!session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { leadIds, staffId } = await request.json();

    if (!leadIds || !Array.isArray(leadIds) || !staffId) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Get staff info
    const staff = await getStaffById(staffId);

    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    // Update leads
    const updated = [];
    for (const leadId of leadIds) {
      try {
        const response = await fetch(`${process.env.BASE_URL || ""}/api/crm/leads/${leadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignedTo: staff.fullName, assignedToId: staffId }),
        });

        if (response.ok) {
          updated.push(leadId);
        }
      } catch (err) {
        console.error(`Failed to assign lead ${leadId}:`, err);
      }
    }

    console.log(`[Bulk Assign] Assigned ${updated.length} leads to ${staff.fullName} by ${session.staffId || "admin"}`);

    return NextResponse.json({
      success: true,
      updated: updated.length,
      total: leadIds.length,
      assignedTo: staff.fullName,
    });
  } catch (err) {
    console.error("[Bulk Assign Error]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
