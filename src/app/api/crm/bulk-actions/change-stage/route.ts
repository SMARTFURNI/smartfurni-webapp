import { NextRequest, NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  try {
    const session = await requireCrmAccess();
    if (!session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { leadIds, stage } = await request.json();

    if (!leadIds || !Array.isArray(leadIds) || !stage) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Update leads in database
    const updated = [];
    for (const leadId of leadIds) {
      try {
        const response = await fetch(`${process.env.BASE_URL || ""}/api/crm/leads/${leadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage }),
        });

        if (response.ok) {
          updated.push(leadId);
        }
      } catch (err) {
        console.error(`Failed to update lead ${leadId}:`, err);
      }
    }

    console.log(`[Bulk Stage Update] Updated ${updated.length} leads to ${stage} by ${session.staffId || "admin"}`);

    return NextResponse.json({
      success: true,
      updated: updated.length,
      total: leadIds.length,
    });
  } catch (err) {
    console.error("[Bulk Stage Update Error]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
