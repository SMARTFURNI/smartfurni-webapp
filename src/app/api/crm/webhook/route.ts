/**
 * CRM Webhook Endpoint
 * Nhận dữ liệu tự động từ Make.com, n8n, Zapier khi có khách hàng mới từ Facebook Ads, Zalo, v.v.
 *
 * POST /api/crm/webhook
 * Headers: x-webhook-secret: <your-secret>
 *
 * Body (Make.com / n8n format):
 * {
 *   "name": "Nguyễn Văn A",
 *   "phone": "0901234567",
 *   "email": "a@example.com",
 *   "company": "Công ty ABC",
 *   "source": "Facebook Ads",
 *   "type": "investor",         // architect | investor | dealer (optional, default: investor)
 *   "district": "Q7",           // optional
 *   "notes": "Quan tâm giường Pro Max",
 *   "projectName": "Dự án XYZ", // optional
 *   "unitCount": 20,            // optional
 *   "assignedTo": "Sales A",    // optional
 *   "expectedValue": 500000000, // optional, VND
 *   "tags": ["facebook", "hot"] // optional
 * }
 *
 * Response: { success: true, leadId: "...", message: "Lead created" }
 */

import { NextRequest, NextResponse } from "next/server";
import { createLead } from "@/lib/crm-store";

const WEBHOOK_SECRET = process.env.CRM_WEBHOOK_SECRET || "smartfurni-webhook-2025";

export async function POST(req: NextRequest) {
  try {
    // Verify secret
    const secret = req.headers.get("x-webhook-secret") || req.headers.get("authorization")?.replace("Bearer ", "");
    if (secret !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Validate required fields
    if (!body.name || !body.phone) {
      return NextResponse.json({ error: "name and phone are required" }, { status: 400 });
    }

    const lead = await createLead({
      name: body.name,
      phone: body.phone,
      email: body.email || "",
      company: body.company || "",
      type: body.type || "investor",
      stage: "new",
      district: body.district || "",
      source: body.source || "Webhook",
      assignedTo: body.assignedTo || "",
      notes: body.notes || "",
      lastContactAt: new Date().toISOString(),
      tags: body.tags || [],
      projectName: body.projectName || "",
      projectAddress: body.projectAddress || "",
      unitCount: body.unitCount || 0,
      expectedValue: body.expectedValue || 0,
    });

    console.log(`[CRM Webhook] New lead created: ${lead.name} (${lead.phone}) from ${lead.source}`);

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      message: `Lead "${lead.name}" created successfully`,
    }, { status: 201 });

  } catch (error) {
    console.error("[CRM Webhook] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET: Webhook health check & documentation
export async function GET() {
  return NextResponse.json({
    status: "active",
    endpoint: "POST /api/crm/webhook",
    description: "SmartFurni CRM Webhook - Nhận leads tự động từ Make.com / n8n",
    authentication: "Header: x-webhook-secret: <secret>",
    requiredFields: ["name", "phone"],
    optionalFields: ["email", "company", "source", "type", "district", "notes", "projectName", "unitCount", "expectedValue", "assignedTo", "tags"],
    typeValues: ["architect", "investor", "dealer"],
    sourceExamples: ["Facebook Ads", "Google Ads", "Zalo", "Website", "KTS giới thiệu"],
    examplePayload: {
      name: "Nguyễn Văn A",
      phone: "0901234567",
      source: "Facebook Ads",
      type: "investor",
      district: "Q7",
      notes: "Quan tâm 20 căn dự án Vinhomes",
      unitCount: 20,
    },
  });
}
