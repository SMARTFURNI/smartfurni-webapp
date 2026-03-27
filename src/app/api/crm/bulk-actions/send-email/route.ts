import { NextRequest, NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/admin-auth";
import { getLeads } from "@/lib/crm-store";
import nodemailer from "nodemailer";

export async function POST(request: NextRequest) {
  try {
    const session = await requireCrmAccess();
    if (!session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { leadIds, subject, body } = await request.json();

    if (!leadIds || !Array.isArray(leadIds) || !subject || !body) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Get lead emails
    const leads = await getLeads();
    const targetLeads = leads.filter(l => leadIds.includes(l.id));

    if (targetLeads.length === 0) {
      return NextResponse.json({ error: "No leads found" }, { status: 404 });
    }

    // Setup email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // Send emails
    const results = [];
    for (const lead of targetLeads) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || "noreply@smartfurni.com",
          to: lead.email,
          subject: subject,
          html: body,
        });
        results.push({ leadId: lead.id, status: "sent" });
      } catch (err) {
        console.error(`Failed to send email to ${lead.email}:`, err);
        results.push({ leadId: lead.id, status: "failed" });
      }
    }

    console.log(`[Bulk Email] Sent to ${targetLeads.length} leads by ${session.staffId || "admin"}`);

    return NextResponse.json({
      success: true,
      totalSent: results.filter(r => r.status === "sent").length,
      totalFailed: results.filter(r => r.status === "failed").length,
      results,
    });
  } catch (err) {
    console.error("[Bulk Email Error]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
