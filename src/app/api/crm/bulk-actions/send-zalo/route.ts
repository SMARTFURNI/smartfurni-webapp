import { NextRequest, NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/admin-auth";
import { getLeads } from "@/lib/crm-store";

export async function POST(request: NextRequest) {
  try {
    const session = await requireCrmAccess();
    if (!session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { leadIds, message } = await request.json();

    if (!leadIds || !Array.isArray(leadIds) || !message) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Get leads
    const leads = await getLeads();
    const targetLeads = leads.filter(l => leadIds.includes(l.id));

    if (targetLeads.length === 0) {
      return NextResponse.json({ error: "No leads found" }, { status: 404 });
    }

    // Send Zalo messages
    const results = [];
    for (const lead of targetLeads) {
      try {
        const response = await fetch("https://openapi.zalo.me/v2.0/oa/message/cs/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.ZALO_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            recipient: {
              user_id: lead.zaloId,
            },
            message: {
              text: message,
            },
          }),
        });

        if (response.ok) {
          results.push({ leadId: lead.id, status: "sent" });
        } else {
          results.push({ leadId: lead.id, status: "failed" });
        }
      } catch (err) {
        console.error(`Failed to send Zalo to ${lead.phone}:`, err);
        results.push({ leadId: lead.id, status: "failed" });
      }
    }

    console.log(`[Bulk Zalo] Sent to ${targetLeads.length} leads by ${session.staffId || "admin"}`);

    return NextResponse.json({
      success: true,
      totalSent: results.filter(r => r.status === "sent").length,
      totalFailed: results.filter(r => r.status === "failed").length,
      results,
    });
  } catch (err) {
    console.error("[Bulk Zalo Error]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
