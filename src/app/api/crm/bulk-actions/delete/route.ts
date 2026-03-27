import { NextRequest, NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  try {
    const session = await requireCrmAccess();
    if (!session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { leadIds } = await request.json();

    if (!leadIds || !Array.isArray(leadIds)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Delete leads
    const deleted = [];
    for (const leadId of leadIds) {
      try {
        const response = await fetch(`${process.env.BASE_URL || ""}/api/crm/leads/${leadId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          deleted.push(leadId);
        }
      } catch (err) {
        console.error(`Failed to delete lead ${leadId}:`, err);
      }
    }

    console.log(`[Bulk Delete] Deleted ${deleted.length} leads by ${session.staffId || "admin"}`);

    return NextResponse.json({
      success: true,
      deleted: deleted.length,
      total: leadIds.length,
    });
  } catch (err) {
    console.error("[Bulk Delete Error]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
