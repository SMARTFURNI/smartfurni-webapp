import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getQuote, getLead } from "@/lib/crm-store";
import { getCrmSettings } from "@/lib/crm-settings-store";
import { formatVND } from "@/lib/crm-types";

// Tạo HTML cho PDF rồi dùng browser print
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [quote, settings] = await Promise.all([getQuote(id), getCrmSettings()]);
  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const lead = await getLead(quote.leadId);
  const company = settings.company;

  // Tính toán
  const subtotalBeforeDiscount = quote.items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const subtotalAfterQtyDiscount = quote.items.reduce((s, i) => s + i.finalPrice * i.qty, 0);
  const afterExtraDiscount = subtotalAfterQtyDiscount * (1 - (quote.extraDiscountPct || 0) / 100);
  const vatAmount = quote.includeVat ? afterExtraDiscount * 0.08 : 0;
  const hasQtyDiscount = subtotalBeforeDiscount !== subtotalAfterQtyDiscount;

  const itemsHtml = quote.items.map((item, i) => `
    <tr style="border-bottom: 1px solid #f3f4f6; ${i % 2 === 1 ? 'background:#fafafa;' : ''}">
      <td style="padding: 10px 12px;">
        <div style="font-weight:600; color:#111;">${item.productName}</div>
        <div style="font-size:11px; color:#9ca3af; margin-top:2px;">${item.sku}${item.selectedSizeLabel ? ' · ' + item.selectedSizeLabel : ''}</div>
      </td>
      <td style="padding:10px 8px; text-align:center; font-weight:600;">${item.qty}</td>
      <td style="padding:10px 8px; text-align:right; color:#6b7280;">${formatVND(item.unitPrice)}</td>
      <td style="padding:10px 8px; text-align:right;">
        ${item.discountPct > 0 ? `<span style="font-size:11px; font-weight:700; color:#16a34a; background:#f0fdf4; padding:2px 6px; border-radius:4px;">-${item.discountPct}%</span>` : '<span style="color:#d1d5db;">—</span>'}
      </td>
      <td style="padding:10px 12px; text-align:right; font-weight:700; color:#C9A84C;">${formatVND(item.finalPrice * item.qty)}</td>
    </tr>
  `).join("");

  const footerRows = `
    <tr style="border-top: 2px solid #e5e7eb;">
      <td colspan="4" style="padding:8px 12px; text-align:right; font-size:13px; color:#6b7280;">Tổng chưa chiết khấu</td>
      <td style="padding:8px 12px; text-align:right; font-size:13px; color:#374151;">${formatVND(subtotalBeforeDiscount)}</td>
    </tr>
    ${hasQtyDiscount ? `
    <tr>
      <td colspan="4" style="padding:6px 12px; text-align:right; font-size:13px; color:#6b7280;">Chiết khấu theo số lượng</td>
      <td style="padding:6px 12px; text-align:right; font-size:13px; color:#16a34a; font-weight:600;">-${formatVND(subtotalBeforeDiscount - subtotalAfterQtyDiscount)}</td>
    </tr>
    <tr>
      <td colspan="4" style="padding:6px 12px; text-align:right; font-size:13px; color:#374151; font-weight:600;">Tổng sau chiết khấu số lượng</td>
      <td style="padding:6px 12px; text-align:right; font-size:13px; font-weight:700; color:#111;">${formatVND(subtotalAfterQtyDiscount)}</td>
    </tr>` : ""}
    ${quote.extraDiscountPct > 0 ? `
    <tr>
      <td colspan="4" style="padding:6px 12px; text-align:right; font-size:13px; color:#6b7280;">Chiết khấu thêm (${quote.extraDiscountPct}%)</td>
      <td style="padding:6px 12px; text-align:right; font-size:13px; color:#16a34a; font-weight:600;">-${formatVND(subtotalAfterQtyDiscount * quote.extraDiscountPct / 100)}</td>
    </tr>` : ""}
    ${(hasQtyDiscount || quote.extraDiscountPct > 0) ? `
    <tr>
      <td colspan="4" style="padding:6px 12px; text-align:right; font-size:13px; color:#374151; font-weight:600;">Tổng sau chiết khấu</td>
      <td style="padding:6px 12px; text-align:right; font-size:13px; font-weight:700; color:#111;">${formatVND(afterExtraDiscount)}</td>
    </tr>` : ""}
    ${quote.includeVat ? `
    <tr>
      <td colspan="4" style="padding:6px 12px; text-align:right; font-size:13px; color:#6b7280;">VAT 8%</td>
      <td style="padding:6px 12px; text-align:right; font-size:13px; color:#374151; font-weight:600;">+${formatVND(vatAmount)}</td>
    </tr>` : ""}
    <tr class="total-row">
      <td colspan="4" style="padding:14px 12px; text-align:right; font-weight:700; font-size:15px; color:#111;">
        TỔNG CỘNG ${quote.includeVat ? '<span style="font-size:11px; font-weight:400; color:#6b7280;">(đã gồm VAT 8%)</span>' : ''}
      </td>
      <td style="padding:14px 12px; text-align:right; font-size:20px; font-weight:900; color:#C9A84C;">${formatVND(quote.total)}</td>
    </tr>
  `;

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Báo giá ${quote.quoteNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #374151; background: #fff; padding: 0; }
    @media print {
      body { padding: 0; }
      @page { margin: 0; size: A4; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
    .page-wrap { padding: 24px 28px; }
    table { width: 100%; border-collapse: collapse; }
    /* Dark header */
    .dark-header { background: #1c1c1e !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; border-radius: 10px 10px 0 0; padding: 20px 24px; display: flex; justify-content: space-between; align-items: flex-start; }
    .company-name { font-size: 22px; font-weight: 900; color: #C9A84C; margin-bottom: 6px; }
    .info-row { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #9ca3af; margin-bottom: 3px; }
    .info-icon { color: #C9A84C; }
    .quote-badge { text-align: right; }
    .quote-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #C9A84C; margin-bottom: 4px; }
    .quote-number { font-size: 20px; font-weight: 900; color: #ffffff; }
    .quote-meta { font-size: 11px; color: #9ca3af; margin-top: 3px; }
    .quote-valid { font-weight: 700; color: #C9A84C; }
    /* White section below header */
    .white-section { background: #fff; border: 1px solid #2a2a2a; border-top: none; border-radius: 0 0 10px 10px; padding: 16px 24px 20px; margin-bottom: 20px; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
    .customer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .info-box { background: #f9fafb !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
    .info-box-gold { background: #fffbf0 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; border: 1px solid #f3e8c0; border-radius: 8px; padding: 12px; }
    .box-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; margin-bottom: 8px; }
    .box-title-gold { color: #92400e; }
    .customer-name { font-size: 15px; font-weight: 700; color: #111; margin-bottom: 5px; }
    .sig-section { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 28px; }
    .sig-box { text-align: center; }
    .sig-line { border-top: 1px solid #d1d5db; margin-top: 44px; padding-top: 8px; }
    .notes-section { background: #f9fafb !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; margin-top: 16px; }
    thead tr { background: #f9fafb !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; border-bottom: 2px solid #e5e7eb; }
    th { padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
    th.right { text-align: right; }
    th.center { text-align: center; }
    .total-row { background: #fffbf0 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; border-top: 2px solid #C9A84C !important; }
  </style>
</head>
<body>
<div class="page-wrap">
  <!-- Dark Header -->
  <div class="dark-header">
    <div>
      ${company.logoUrl ? `<img src="${company.logoUrl}" alt="${company.name}" style="height:52px; object-fit:contain; margin-bottom:10px; filter:brightness(1.05);">` : `<div class="company-name">${company.name}</div>`}
      ${company.address ? `<div class="info-row"><span class="info-icon">◎</span> ${company.address}</div>` : ""}
      <div style="display:flex; gap:16px; flex-wrap:wrap;">
        ${company.phone ? `<div class="info-row"><span class="info-icon">★</span> ${company.phone}</div>` : ""}
        ${company.email ? `<div class="info-row"><span class="info-icon">■</span> ${company.email}</div>` : ""}
        ${company.website ? `<div class="info-row"><span class="info-icon">▶</span> ${company.website}</div>` : ""}
      </div>
      ${company.taxCode ? `<div style="font-size:11px; color:#6b7280; margin-top:3px;">MST: ${company.taxCode}</div>` : ""}
    </div>
    <div class="quote-badge">
      <div class="quote-label">Báo giá</div>
      <div class="quote-number">${quote.quoteNumber}</div>
      <div class="quote-meta">Ngày lập: ${new Date(quote.createdAt).toLocaleDateString("vi-VN")}</div>
      <div class="quote-meta">Hiệu lực: <span class="quote-valid">${new Date(quote.validUntil).toLocaleDateString("vi-VN")}</span></div>
      ${quote.createdBy ? `<div class="quote-meta" style="margin-top:2px;">Người lập: ${quote.createdBy}</div>` : ""}
    </div>
  </div>

  <!-- White section: customer + payment -->
  <div class="white-section">
  <div class="customer-grid">
    <div class="info-box">
      <div class="box-title">Thông tin khách hàng</div>
      <div class="customer-name">${quote.leadName}</div>
      ${lead?.company ? `<div class="info-row">🏢 ${lead.company}</div>` : ""}
      ${lead?.phone ? `<div class="info-row">📞 ${lead.phone}</div>` : ""}
      ${lead?.email ? `<div class="info-row">✉️ ${lead.email}</div>` : ""}
      ${lead?.projectAddress ? `<div class="info-row">📍 ${lead.projectAddress}</div>` : ""}
      ${lead?.projectName ? `<div style="font-size:11px; color:#9ca3af; margin-top:4px;">Dự án: ${lead.projectName}${lead.unitCount ? ` · ${lead.unitCount} căn` : ""}</div>` : ""}
    </div>
    ${(company.bankAccount || company.bankName) ? `
    <div class="info-box-gold">
      <div class="box-title box-title-gold">Thông tin thanh toán</div>
      ${company.bankName ? `<div style="font-size:14px; font-weight:700; color:#111; margin-bottom:4px;">${company.bankName}</div>` : ""}
      ${company.bankAccount ? `<div class="info-row">STK: <strong>${company.bankAccount}</strong></div>` : ""}
      ${company.bankBranch ? `<div class="info-row">${company.bankBranch}</div>` : ""}
      <div style="font-size:11px; color:#9ca3af; margin-top:4px;">Chủ TK: ${company.name}</div>
    </div>` : ""}
  </div>
  </div>{/* end white-section */}

  <!-- Bảng sản phẩm -->
  <table>
    <thead>
      <tr>
        <th>Sản phẩm</th>
        <th class="center" style="width:60px;">SL</th>
        <th class="right">Đơn giá</th>
        <th class="right" style="width:80px;">CK</th>
        <th class="right">Thành tiền</th>
      </tr>
    </thead>
    <tbody>${itemsHtml}</tbody>
    <tfoot>${footerRows}</tfoot>
  </table>

  ${quote.notes ? `
  <div class="notes-section" style="margin-top:20px;">
    <div style="font-size:12px; font-weight:700; color:#374151; margin-bottom:6px;">Điều khoản & Ghi chú</div>
    <div style="font-size:12px; color:#6b7280; line-height:1.6; white-space:pre-line;">${quote.notes}</div>
  </div>` : ""}

  <!-- Chữ ký -->
  <div class="sig-section">
    <div class="sig-box">
      <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:#9ca3af;">Đại diện bên bán</div>
      <div class="sig-line">
        <div style="font-weight:700; color:#111;">${company.representativeName || company.name}</div>
        <div style="font-size:11px; color:#6b7280;">${company.representativeTitle || "Đại diện"}</div>
      </div>
    </div>
    <div class="sig-box">
      <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:#9ca3af;">Đại diện bên mua</div>
      <div class="sig-line">
        <div style="font-weight:700; color:#111;">${quote.leadName}</div>
        <div style="font-size:11px; color:#6b7280;">${lead?.company || ""}</div>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() { window.print(); }
  </script>
</div>{/* end page-wrap */}
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="${quote.quoteNumber}.html"`,
    },
  });
}
