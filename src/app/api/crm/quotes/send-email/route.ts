import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getQuote, getLead } from "@/lib/crm-store";
import { getCrmSettings } from "@/lib/crm-settings-store";
import { formatVND } from "@/lib/crm-types";

export async function POST(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { quoteId, toEmail, toName, subject, message } = await req.json();

    if (!quoteId || !toEmail) {
      return NextResponse.json({ error: "Thiếu quoteId hoặc toEmail" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(toEmail)) {
      return NextResponse.json({ error: "Địa chỉ email không hợp lệ" }, { status: 400 });
    }

    const [quote, settings] = await Promise.all([getQuote(quoteId), getCrmSettings()]);
    if (!quote) return NextResponse.json({ error: "Không tìm thấy báo giá" }, { status: 404 });

    const lead = await getLead(quote.leadId);
    const company = settings.company;

    // Tính toán
    const subtotalBeforeDiscount = quote.items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
    const subtotalAfterQtyDiscount = quote.items.reduce((s, i) => s + i.finalPrice * i.qty, 0);
    const afterExtraDiscount = subtotalAfterQtyDiscount * (1 - (quote.extraDiscountPct || 0) / 100);
    const vatAmount = quote.includeVat ? afterExtraDiscount * 0.08 : 0;
    const hasQtyDiscount = subtotalBeforeDiscount !== subtotalAfterQtyDiscount;

    // Build items table rows
    const itemsRows = quote.items.map((item, i) => `
      <tr style="background:${i % 2 === 1 ? '#f9fafb' : '#ffffff'};">
        <td style="padding:10px 14px; border-bottom:1px solid #f3f4f6;">
          <div style="font-weight:600;color:#111;font-size:13px;">${item.productName}</div>
          <div style="font-size:11px;color:#9ca3af;margin-top:2px;">${item.sku}${item.selectedSizeLabel ? ' · ' + item.selectedSizeLabel : ''}</div>
        </td>
        <td style="padding:10px 8px;text-align:center;font-weight:600;color:#374151;border-bottom:1px solid #f3f4f6;">${item.qty}</td>
        <td style="padding:10px 8px;text-align:right;color:#6b7280;border-bottom:1px solid #f3f4f6;">${formatVND(item.unitPrice)}</td>
        <td style="padding:10px 8px;text-align:right;border-bottom:1px solid #f3f4f6;">
          ${item.discountPct > 0 ? `<span style="font-size:11px;font-weight:700;color:#16a34a;background:#f0fdf4;padding:2px 6px;border-radius:4px;">-${item.discountPct}%</span>` : '<span style="color:#d1d5db;">—</span>'}
        </td>
        <td style="padding:10px 14px;text-align:right;font-weight:700;color:#C9A84C;border-bottom:1px solid #f3f4f6;">${formatVND(item.finalPrice * item.qty)}</td>
      </tr>
    `).join("");

    // Build totals rows
    const totalsRows = `
      <tr>
        <td colspan="4" style="padding:8px 14px;text-align:right;font-size:12px;color:#6b7280;border-top:2px solid #e5e7eb;">Tổng chưa chiết khấu</td>
        <td style="padding:8px 14px;text-align:right;font-size:12px;color:#374151;border-top:2px solid #e5e7eb;">${formatVND(subtotalBeforeDiscount)}</td>
      </tr>
      ${hasQtyDiscount ? `
      <tr>
        <td colspan="4" style="padding:6px 14px;text-align:right;font-size:12px;color:#6b7280;">Chiết khấu theo số lượng</td>
        <td style="padding:6px 14px;text-align:right;font-size:12px;color:#16a34a;font-weight:600;">-${formatVND(subtotalBeforeDiscount - subtotalAfterQtyDiscount)}</td>
      </tr>
      <tr>
        <td colspan="4" style="padding:6px 14px;text-align:right;font-size:12px;color:#374151;font-weight:600;">Tổng sau chiết khấu số lượng</td>
        <td style="padding:6px 14px;text-align:right;font-size:12px;font-weight:700;color:#111;">${formatVND(subtotalAfterQtyDiscount)}</td>
      </tr>` : ""}
      ${quote.extraDiscountPct > 0 ? `
      <tr>
        <td colspan="4" style="padding:6px 14px;text-align:right;font-size:12px;color:#6b7280;">Chiết khấu thêm (${quote.extraDiscountPct}%)</td>
        <td style="padding:6px 14px;text-align:right;font-size:12px;color:#16a34a;font-weight:600;">-${formatVND(subtotalAfterQtyDiscount * quote.extraDiscountPct / 100)}</td>
      </tr>` : ""}
      ${(hasQtyDiscount || quote.extraDiscountPct > 0) ? `
      <tr>
        <td colspan="4" style="padding:6px 14px;text-align:right;font-size:12px;color:#374151;font-weight:700;">Tổng sau chiết khấu</td>
        <td style="padding:6px 14px;text-align:right;font-size:12px;font-weight:700;color:#111;">${formatVND(afterExtraDiscount)}</td>
      </tr>` : ""}
      ${quote.includeVat ? `
      <tr>
        <td colspan="4" style="padding:6px 14px;text-align:right;font-size:12px;color:#6b7280;">VAT 8%</td>
        <td style="padding:6px 14px;text-align:right;font-size:12px;color:#374151;font-weight:600;">+${formatVND(vatAmount)}</td>
      </tr>` : ""}
      <tr style="background:#fffbf0;">
        <td colspan="4" style="padding:14px 14px;text-align:right;font-weight:700;font-size:14px;color:#111;border-top:2px solid #C9A84C;">
          TỔNG CỘNG ${quote.includeVat ? '<span style="font-size:11px;font-weight:400;color:#6b7280;">(đã gồm VAT 8%)</span>' : ''}
        </td>
        <td style="padding:14px 14px;text-align:right;font-size:18px;font-weight:900;color:#C9A84C;border-top:2px solid #C9A84C;">${formatVND(quote.total)}</td>
      </tr>
    `;

    const personalMessage = message ? `
      <div style="background:#f0f9ff;border-left:4px solid #0ea5e9;padding:16px 20px;margin-bottom:24px;border-radius:0 8px 8px 0;">
        <div style="font-size:12px;font-weight:700;color:#0369a1;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em;">Lời nhắn từ ${company.name}</div>
        <div style="font-size:13px;color:#374151;line-height:1.6;white-space:pre-line;">${message}</div>
      </div>
    ` : "";

    const htmlEmail = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Báo giá ${quote.quoteNumber}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;">

          <!-- Dark Header -->
          <tr>
            <td style="background:#1c1c1e;border-radius:12px 12px 0 0;padding:24px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:top;">
                    ${company.logoUrl
                      ? `<img src="${company.logoUrl}" alt="${company.name}" style="height:48px;object-fit:contain;margin-bottom:10px;display:block;">`
                      : `<div style="font-size:22px;font-weight:900;color:#C9A84C;margin-bottom:8px;">${company.name}</div>`
                    }
                    ${company.address ? `<div style="font-size:11px;color:#9ca3af;margin-bottom:3px;">&#9679; ${company.address}</div>` : ""}
                    ${company.phone ? `<div style="font-size:11px;color:#9ca3af;margin-bottom:3px;">&#9742; ${company.phone}</div>` : ""}
                    ${company.email ? `<div style="font-size:11px;color:#9ca3af;margin-bottom:3px;">&#9993; ${company.email}</div>` : ""}
                    ${company.taxCode ? `<div style="font-size:11px;color:#6b7280;margin-top:4px;">MST: ${company.taxCode}</div>` : ""}
                  </td>
                  <td style="text-align:right;vertical-align:top;">
                    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#C9A84C;margin-bottom:4px;">Báo giá</div>
                    <div style="font-size:20px;font-weight:900;color:#ffffff;">${quote.quoteNumber}</div>
                    <div style="font-size:11px;color:#9ca3af;margin-top:4px;">Ngày lập: ${new Date(quote.createdAt).toLocaleDateString("vi-VN")}</div>
                    <div style="font-size:11px;color:#9ca3af;">Hiệu lực: <span style="font-weight:700;color:#C9A84C;">${new Date(quote.validUntil).toLocaleDateString("vi-VN")}</span></div>
                    ${quote.createdBy ? `<div style="font-size:11px;color:#9ca3af;margin-top:2px;">Người lập: ${quote.createdBy}</div>` : ""}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- White body -->
          <tr>
            <td style="background:#ffffff;padding:24px 28px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">

              <!-- Greeting -->
              <div style="font-size:15px;color:#374151;margin-bottom:20px;line-height:1.6;">
                Kính gửi <strong>${toName || quote.leadName}</strong>,<br>
                <span style="color:#6b7280;font-size:13px;">Cảm ơn bạn đã quan tâm đến sản phẩm của ${company.name}. Chúng tôi xin gửi báo giá chi tiết như sau:</span>
              </div>

              ${personalMessage}

              <!-- Customer info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td width="50%" style="vertical-align:top;padding-right:8px;">
                    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px;">
                      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#9ca3af;margin-bottom:8px;">Thông tin khách hàng</div>
                      <div style="font-size:15px;font-weight:700;color:#111;margin-bottom:6px;">${quote.leadName}</div>
                      ${lead?.company ? `<div style="font-size:12px;color:#6b7280;margin-bottom:3px;">${lead.company}</div>` : ""}
                      ${lead?.phone ? `<div style="font-size:12px;color:#6b7280;margin-bottom:3px;">&#9742; ${lead.phone}</div>` : ""}
                      ${lead?.email ? `<div style="font-size:12px;color:#6b7280;margin-bottom:3px;">&#9993; ${lead.email}</div>` : ""}
                      ${lead?.projectAddress ? `<div style="font-size:12px;color:#6b7280;">&#9679; ${lead.projectAddress}</div>` : ""}
                    </div>
                  </td>
                  ${(company.bankAccount || company.bankName) ? `
                  <td width="50%" style="vertical-align:top;padding-left:8px;">
                    <div style="background:#fffbf0;border:1px solid #f3e8c0;border-radius:8px;padding:14px;">
                      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#92400e;margin-bottom:8px;">Thông tin thanh toán</div>
                      ${company.bankName ? `<div style="font-size:14px;font-weight:700;color:#111;margin-bottom:4px;">${company.bankName}</div>` : ""}
                      ${company.bankAccount ? `<div style="font-size:12px;color:#374151;margin-bottom:3px;">STK: <strong>${company.bankAccount}</strong></div>` : ""}
                      ${company.bankBranch ? `<div style="font-size:12px;color:#6b7280;margin-bottom:3px;">${company.bankBranch}</div>` : ""}
                      <div style="font-size:11px;color:#9ca3af;margin-top:4px;">Chủ TK: ${company.name}</div>
                    </div>
                  </td>` : "<td></td>"}
                </tr>
              </table>

              <!-- Products table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:8px;">
                <thead>
                  <tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb;">
                    <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;">Sản phẩm</th>
                    <th style="padding:10px 8px;text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;width:50px;">SL</th>
                    <th style="padding:10px 8px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;">Đơn giá</th>
                    <th style="padding:10px 8px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;width:60px;">CK</th>
                    <th style="padding:10px 14px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>${itemsRows}</tbody>
                <tfoot>${totalsRows}</tfoot>
              </table>

              ${quote.notes ? `
              <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin-top:16px;">
                <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:6px;">Điều khoản & Ghi chú</div>
                <div style="font-size:12px;color:#6b7280;line-height:1.6;white-space:pre-line;">${quote.notes}</div>
              </div>` : ""}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#1c1c1e;border-radius:0 0 12px 12px;padding:20px 28px;text-align:center;">
              <div style="font-size:12px;color:#9ca3af;line-height:1.8;">
                Mọi thắc mắc vui lòng liên hệ:<br>
                ${company.phone ? `<span style="color:#C9A84C;">&#9742; ${company.phone}</span>` : ""}
                ${company.email ? ` &nbsp;|&nbsp; <span style="color:#C9A84C;">&#9993; ${company.email}</span>` : ""}
              </div>
              <div style="font-size:11px;color:#4b5563;margin-top:8px;">&copy; ${new Date().getFullYear()} ${company.name}. Báo giá có hiệu lực đến ${new Date(quote.validUntil).toLocaleDateString("vi-VN")}.</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const resendApiKey = process.env.RESEND_API_KEY || "";
    const fromAddress = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    const fromName = company.name || "SmartFurni";
    const emailSubject = subject || `Báo giá ${quote.quoteNumber} từ ${company.name}`;

    if (!resendApiKey) {
      // Mock mode - log and return success
      console.log(`[Quote Email MOCK] Would send to ${toEmail}: ${emailSubject}`);
      return NextResponse.json({
        success: true,
        mock: true,
        message: `[Chế độ xem trước] Email báo giá đã được ghi nhận. Để gửi thực, vui lòng cấu hình RESEND_API_KEY trong Cài đặt.`,
        to: toEmail,
        subject: emailSubject,
      });
    }

    const { Resend } = await import("resend");
    const resend = new Resend(resendApiKey);

    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromAddress}>`,
      to: [toEmail],
      subject: emailSubject,
      html: htmlEmail,
    });

    if (error) {
      console.error("[Quote Email] Resend error:", error);
      return NextResponse.json({ error: `Gửi email thất bại: ${error.message}` }, { status: 500 });
    }

    console.log(`[Quote Email] Sent ${quote.quoteNumber} to ${toEmail} by ${session.staffId || "admin"}`);

    return NextResponse.json({
      success: true,
      mock: false,
      message: `Đã gửi báo giá ${quote.quoteNumber} tới ${toEmail}`,
      messageId: data?.id,
      to: toEmail,
      subject: emailSubject,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Quote Email Error]:", message);
    return NextResponse.json({ error: `Gửi email thất bại: ${message}` }, { status: 500 });
  }
}
