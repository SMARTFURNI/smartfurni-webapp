import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import {
  getEmailCampaigns,
  updateEmailCampaign,
  createEmailLog,
  getEmailLogs,
} from "@/lib/crm-email-store";
import { getLeads } from "@/lib/crm-store";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@smartfurni.vn";
const FROM_NAME = "SmartFurni CRM";

// Thay thế biến động trong HTML content
function replaceVariables(html: string, lead: { name: string; company: string; email: string; phone: string; [key: string]: string | number | string[] }) {
  return html
    .replace(/\{\{name\}\}/g, lead.name || "Quý khách")
    .replace(/\{\{company\}\}/g, lead.company || "Quý công ty")
    .replace(/\{\{email\}\}/g, lead.email || "")
    .replace(/\{\{phone\}\}/g, lead.phone || "")
    .replace(/\{\{projectName\}\}/g, String(lead.projectName || ""))
    .replace(/\{\{district\}\}/g, String(lead.district || ""))
    .replace(/\{\{assignedTo\}\}/g, String(lead.assignedTo || "SmartFurni Team"));
}

// Thêm unsubscribe footer vào email
function addEmailFooter(html: string, campaignId: string, leadEmail: string): string {
  const unsubscribeUrl = `https://smartfurni-webapp-production.up.railway.app/unsubscribe?campaign=${campaignId}&email=${encodeURIComponent(leadEmail)}`;
  const footer = `
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #222;text-align:center">
      <p style="color:#666;font-size:11px;margin:0">
        Bạn nhận email này vì đã đăng ký nhận thông tin từ SmartFurni.<br/>
        <a href="${unsubscribeUrl}" style="color:#888;text-decoration:underline">Hủy đăng ký nhận email</a>
      </p>
    </div>`;
  // Chèn footer trước thẻ đóng </body> hoặc </div> cuối cùng
  if (html.includes("</body>")) {
    return html.replace("</body>", `${footer}</body>`);
  }
  return html + footer;
}

// Lọc leads theo segment
function filterLeadsBySegment(leads: { email: string; type: string; stage: string; name?: string; [key: string]: any }[], segment: string) {
  return leads.filter((l) => {
    if (!l.email) return false;
    if (segment === "all") return true;
    if (["architect", "investor", "dealer"].includes(segment)) return l.type === segment;
    if (["new", "profile_sent", "surveyed", "quoted", "negotiating", "won", "lost"].includes(segment))
      return l.stage === segment;
    return true;
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getAdminSession()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Lấy campaign
  const campaigns = await getEmailCampaigns();
  const campaign = campaigns.find((c) => c.id === id);
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  // Chỉ cho phép gửi nếu status là draft hoặc scheduled
  if (campaign.status === "sent" || campaign.status === "sending") {
    return NextResponse.json(
      { error: `Chiến dịch đang ở trạng thái "${campaign.status}", không thể gửi lại.` },
      { status: 400 }
    );
  }

  // Kiểm tra Resend API key
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "RESEND_API_KEY chưa được cấu hình. Vui lòng thêm vào Railway Variables." },
      { status: 500 }
    );
  }

  // Lấy danh sách leads theo segment
  const allLeads = await getLeads();
  const targetLeads = filterLeadsBySegment(allLeads, campaign.segment);

  if (targetLeads.length === 0) {
    return NextResponse.json(
      { error: "Không có khách hàng nào trong phân khúc này có địa chỉ email." },
      { status: 400 }
    );
  }

  // Cập nhật status sang "sending"
  await updateEmailCampaign(id, { status: "sending" });

  // Kiểm tra đã gửi trước đó chưa (tránh gửi trùng)
  const existingLogs = await getEmailLogs(id);
  const alreadySentEmails = new Set(
    existingLogs.filter((l) => l.status === "sent" || l.status === "opened").map((l) => l.email)
  );

  let sentCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  // Gửi từng email với rate limiting (tránh spam filter)
  for (const lead of targetLeads) {
    if (!lead.email) continue;
    if (alreadySentEmails.has(lead.email)) {
      sentCount++;
      continue;
    }

    try {
      const personalizedHtml = addEmailFooter(
        replaceVariables(campaign.htmlContent || `<p>Kính gửi ${lead.name || "Quý khách"},</p><p>${campaign.subject}</p>`, lead),
        id,
        lead.email
      );

      const result = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [lead.email],
        subject: campaign.subject,
        html: personalizedHtml,
        tags: [
          { name: "campaign_id", value: id },
          { name: "segment", value: campaign.segment },
        ],
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      // Ghi log thành công
      await createEmailLog({
        campaignId: id,
        leadId: lead.id,
        email: lead.email,
        status: "sent",
        messageId: result.data?.id,
      });
      sentCount++;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      errors.push(`${lead.email}: ${errMsg}`);
      failedCount++;

      // Ghi log thất bại
      await createEmailLog({
        campaignId: id,
        leadId: lead.id,
        email: lead.email,
        status: "failed",
        error: errMsg,
      });
    }

    // Rate limiting: delay 100ms giữa các email để tránh bị block
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Cập nhật campaign status và stats
  const finalStatus = failedCount > 0 && sentCount === 0 ? "failed" : "sent";
  await updateEmailCampaign(id, {
    status: finalStatus,
    sentCount,
    sentAt: new Date().toISOString(),
  });

  return NextResponse.json({
    success: true,
    campaignId: id,
    campaignName: campaign.name,
    totalTargeted: targetLeads.length,
    sentCount,
    failedCount,
    skippedCount: alreadySentEmails.size,
    status: finalStatus,
    errors: errors.slice(0, 10), // Chỉ trả về 10 lỗi đầu tiên
    sentAt: new Date().toISOString(),
  });
}

// GET: Lấy trạng thái và logs của campaign
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getAdminSession()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const campaigns = await getEmailCampaigns();
  const campaign = campaigns.find((c) => c.id === id);
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const logs = await getEmailLogs(id);
  const sentLogs = logs.filter((l) => l.status === "sent" || l.status === "opened");
  const failedLogs = logs.filter((l) => l.status === "failed");

  return NextResponse.json({
    campaign,
    stats: {
      total: logs.length,
      sent: sentLogs.length,
      failed: failedLogs.length,
      opened: logs.filter((l) => l.status === "opened").length,
    },
    recentLogs: logs.slice(0, 20),
  });
}
