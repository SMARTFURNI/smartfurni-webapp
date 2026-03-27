import { NextRequest, NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/admin-auth";
import { getLeads } from "@/lib/crm-store";

export async function POST(request: NextRequest) {
  try {
    const session = await requireCrmAccess();
    if (!session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { leadIds, tag } = await request.json();

    if (!leadIds || !Array.isArray(leadIds) || !tag) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Get current leads and add tag
    const leads = await getLeads();
    const updated = [];

    for (const leadId of leadIds) {
      try {
        const lead = leads.find(l => l.id === leadId);
        if (!lead) continue;

        const tags = lead.tags || [];
        if (!tags.includes(tag)) {
          tags.push(tag);
        }

        const response = await fetch(`${process.env.BASE_URL || ""}/api/crm/leads/${leadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tags }),
        });

        if (response.ok) {
          updated.push(leadId);
        }
      } catch (err) {
        console.error(`Failed to add tag to lead ${leadId}:`, err);
      }
    }

    console.log(`[Bulk Tag] Added tag "${tag}" to ${updated.length} leads by ${session.staffId || "admin"}`);

    return NextResponse.json({
      success: true,
      updated: updated.length,
      total: leadIds.length,
      tag,
    });
  } catch (err) {
    console.error("[Bulk Tag Error]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
