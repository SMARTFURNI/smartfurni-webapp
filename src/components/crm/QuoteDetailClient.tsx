"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Check, X, FileDown, MessageCircle, Building2, User, Phone, Mail, MapPin, CreditCard, Globe, AtSign } from "lucide-react";
import type { Quote, Lead } from "@/lib/crm-types";
import { formatVND } from "@/lib/crm-types";
import type { CompanyInfo } from "@/lib/crm-settings-store";

interface Props {
  quote: Quote;
  lead: Lead | null;
  company: CompanyInfo;
}

const STATUS_MAP = {
  draft: { label: "Nháp", color: "#6b7280" },
  sent: { label: "Đã gửi", color: "#3b82f6" },
  accepted: { label: "Chấp nhận", color: "#22c55e" },
  rejected: { label: "Từ chối", color: "#ef4444" },
};

export default function QuoteDetailClient({ quote: initialQuote, lead, company }: Props) {
  const [quote, setQuote] = useState(initialQuote);
  const [updating, setUpdating] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [sendingZalo, setSendingZalo] = useState(false);
  const [zaloMsg, setZaloMsg] = useState("");
  const [showZaloModal, setShowZaloModal] = useState(false);
  const [zaloSendResult, setZaloSendResult] = useState<{ ok: boolean; msg: string; pdfLink?: string } | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState(lead?.email || "");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailResult, setEmailResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  async function updateStatus(status: Quote["status"]) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/crm/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) setQuote(await res.json());
    } finally { setUpdating(false); }
  }

  async function exportPdf() {
    setExportingPdf(true);
    try {
      // Mở tab mới với HTML có auto-print → người dùng chọn "Save as PDF"
      window.open(`/api/crm/quotes/${quote.id}/pdf`, "_blank");
    } catch {
      alert("Không thể xuất PDF. Vui lòng thử lại.");
    } finally { setExportingPdf(false); }
  }

  async function sendZaloPersonal() {
    setSendingZalo(true);
    setZaloSendResult(null);
    try {
      const res = await fetch("/api/crm/quotes/send-zalo-personal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId: quote.id, message: zaloMsg }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setZaloSendResult({ ok: true, msg: data.message, pdfLink: data.pdfLink });
        // Tự động đánh dấu đã gửi nếu còn nháp
        if (quote.status === "draft") updateStatus("sent");
      } else {
        setZaloSendResult({
          ok: false,
          msg: data.error || "Gửi Zalo thất bại",
        });
      }
    } finally { setSendingZalo(false); }
  }

  // Tính toán tổng
  const subtotalBeforeDiscount = quote.items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const subtotalAfterQtyDiscount = quote.items.reduce((s, i) => s + i.finalPrice * i.qty, 0);
  const afterExtraDiscount = subtotalAfterQtyDiscount * (1 - (quote.extraDiscountPct || 0) / 100);
  const vatAmount = quote.includeVat ? afterExtraDiscount * 0.08 : 0;
  const hasQtyDiscount = subtotalBeforeDiscount !== subtotalAfterQtyDiscount;

  const s = STATUS_MAP[quote.status];

  const defaultZaloMsg = `Kính gửi ${quote.leadName},\n\n${company.name} xin gửi báo giá ${quote.quoteNumber} với tổng giá trị ${formatVND(quote.total)}.\n\nHiệu lực đến: ${new Date(quote.validUntil).toLocaleDateString("vi-VN")}\n\nVui lòng liên hệ ${company.phone || ""} để được tư vấn thêm.\n\nTrân trọng,\n${company.name}`;

  const defaultEmailSubject = `Báo giá ${quote.quoteNumber} từ ${company.name}`;
  const defaultEmailMessage = `Kính gửi Quý khách ${quote.leadName},\n\nCảm ơn bạn đã quan tâm đến sản phẩm của ${company.name}.\n\nVui lòng xem báo giá đính kèm và liên hệ chúng tôi nếu cần tư vấn thêm.\n\nTrân trọng,\n${company.representativeName || company.name}`;

  async function sendEmail() {
    if (!emailTo.trim()) return;
    setSendingEmail(true);
    setEmailResult(null);
    try {
      const res = await fetch("/api/crm/quotes/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId: quote.id,
          toEmail: emailTo.trim(),
          toName: quote.leadName,
          subject: emailSubject || defaultEmailSubject,
          message: emailMessage,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEmailResult({ ok: true, msg: data.mock ? `[Xem trước] ${data.message}` : data.message });
        if (!data.mock) {
          // Auto-mark as sent if still draft
          if (quote.status === "draft") updateStatus("sent");
        }
      } else {
        setEmailResult({ ok: false, msg: data.error || "Gửi email thất bại" });
      }
    } catch {
      setEmailResult({ ok: false, msg: "Lỗi kết nối, vui lòng thử lại" });
    } finally { setSendingEmail(false); }
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "#f0f2f5" }}>
      {/* Header */}
      <div className="flex-shrink-0 bg-white px-6 py-4" style={{ borderBottom: "1px solid #e5e7eb" }}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Link href="/crm/quotes" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
              <ArrowLeft size={16} /> Báo giá
            </Link>
            <h1 className="text-xl font-bold text-gray-900">{quote.quoteNumber}</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: `${s.color}15`, color: s.color }}>{s.label}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Xuất PDF */}
            <button onClick={exportPdf} disabled={exportingPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              <FileDown size={14} /> {exportingPdf ? "Đang xuất..." : "Xuất PDF"}
            </button>
            {/* Gửi Email */}
            <button onClick={() => { setEmailTo(lead?.email || ""); setEmailSubject(defaultEmailSubject); setEmailMessage(defaultEmailMessage); setEmailResult(null); setShowEmailModal(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
              <AtSign size={14} /> Gửi Email
            </button>
            {/* Gửi Zalo Personal */}
            {lead && (
              <button onClick={() => { setZaloMsg(defaultZaloMsg); setZaloSendResult(null); setShowZaloModal(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white"
                style={{ background: "#0068FF" }}>
                <MessageCircle size={14} /> Gửi Zalo
              </button>
            )}
            {/* Status actions */}
            {quote.status === "draft" && (
              <button onClick={() => updateStatus("sent")} disabled={updating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white"
                style={{ background: "#3b82f6" }}>
                <Send size={14} /> Đánh dấu đã gửi
              </button>
            )}
            {quote.status === "sent" && (
              <>
                <button onClick={() => updateStatus("accepted")} disabled={updating}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white"
                  style={{ background: "#22c55e" }}>
                  <Check size={14} /> Chấp nhận
                </button>
                <button onClick={() => updateStatus("rejected")} disabled={updating}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
                  <X size={14} /> Từ chối
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div ref={printRef} className="max-w-3xl mx-auto space-y-4">

          {/* ── Phần in / PDF ── */}
          {/* Header công ty + số báo giá */}
          <div className="rounded-2xl overflow-hidden shadow-sm" style={{ border: "1px solid #2a2a2a" }}>
            {/* Nền đen chì cho phần header công ty */}
            <div className="flex items-start justify-between gap-4 px-6 py-5" style={{ background: "#1c1c1e" }}>
              {/* Thông tin công ty */}
              <div className="flex-1">
                {company.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={company.logoUrl} alt={company.name} className="h-14 object-contain mb-3" style={{ filter: "brightness(1.05) drop-shadow(0 0 8px rgba(201,168,76,0.3))" }} />
                ) : (
                  <div className="text-2xl font-black mb-1" style={{ color: "#C9A84C" }}>{company.name}</div>
                )}
                <div className="space-y-1 mt-1">
                  {company.address && (
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: "#9ca3af" }}>
                      <MapPin size={11} className="flex-shrink-0" style={{ color: "#C9A84C" }} /> {company.address}
                    </div>
                  )}
                  <div className="flex items-center gap-3 flex-wrap">
                    {company.phone && (
                      <div className="flex items-center gap-1 text-xs" style={{ color: "#9ca3af" }}>
                        <Phone size={11} style={{ color: "#C9A84C" }} /> {company.phone}
                      </div>
                    )}
                    {company.email && (
                      <div className="flex items-center gap-1 text-xs" style={{ color: "#9ca3af" }}>
                        <Mail size={11} style={{ color: "#C9A84C" }} /> {company.email}
                      </div>
                    )}
                    {company.website && (
                      <div className="flex items-center gap-1 text-xs" style={{ color: "#9ca3af" }}>
                        <Globe size={11} style={{ color: "#C9A84C" }} /> {company.website}
                      </div>
                    )}
                  </div>
                  {company.taxCode && (
                    <div className="text-xs" style={{ color: "#6b7280" }}>MST: {company.taxCode}</div>
                  )}
                </div>
              </div>
              {/* Số báo giá */}
              <div className="text-right flex-shrink-0">
                <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#C9A84C", letterSpacing: "0.12em" }}>Báo giá</div>
                <div className="text-xl font-black" style={{ color: "#ffffff" }}>{quote.quoteNumber}</div>
                <div className="text-xs mt-1" style={{ color: "#9ca3af" }}>Ngày lập: {new Date(quote.createdAt).toLocaleDateString("vi-VN")}</div>
                <div className="text-xs" style={{ color: "#9ca3af" }}>Hiệu lực đến: <span className="font-semibold" style={{ color: "#C9A84C" }}>{new Date(quote.validUntil).toLocaleDateString("vi-VN")}</span></div>
                {quote.createdBy && <div className="text-xs mt-1" style={{ color: "#9ca3af" }}>Người lập: {quote.createdBy}</div>}
              </div>
            </div>

            {/* Phần dưới: nền trắng cho thông tin khách hàng */}
            <div className="bg-white px-6 py-5">
            {/* Thông tin khách hàng */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-xl" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  <User size={12} /> Thông tin khách hàng
                </div>
                <div className="font-bold text-gray-900 text-base">{quote.leadName}</div>
                {lead && (
                  <div className="space-y-0.5 mt-1.5">
                    {lead.company && (
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Building2 size={12} className="flex-shrink-0 text-gray-400" /> {lead.company}
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Phone size={12} className="flex-shrink-0 text-gray-400" /> {lead.phone}
                      </div>
                    )}
                    {lead.email && (
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Mail size={12} className="flex-shrink-0 text-gray-400" /> {lead.email}
                      </div>
                    )}
                    {lead.projectAddress && (
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <MapPin size={12} className="flex-shrink-0 text-gray-400" /> {lead.projectAddress}
                      </div>
                    )}
                    {lead.projectName && (
                      <div className="text-xs text-gray-500 mt-1">Dự án: {lead.projectName}{lead.unitCount ? ` · ${lead.unitCount} căn` : ""}</div>
                    )}
                  </div>
                )}
              </div>
              {/* Thông tin thanh toán */}
              {(company.bankAccount || company.bankName) && (
                <div className="p-3 rounded-xl" style={{ background: "#fffbf0", border: "1px solid #f3e8c0" }}>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
                    <CreditCard size={12} /> Thông tin thanh toán
                  </div>
                  <div className="space-y-0.5">
                    {company.bankName && <div className="text-sm font-semibold text-gray-800">{company.bankName}</div>}
                    {company.bankAccount && <div className="text-sm text-gray-700">STK: <span className="font-bold">{company.bankAccount}</span></div>}
                    {company.bankBranch && <div className="text-xs text-gray-500">{company.bankBranch}</div>}
                    <div className="text-xs text-gray-500 mt-1">Chủ TK: {company.name}</div>
                  </div>
                </div>
              )}
            </div>
            </div>{/* end bg-white */}
          </div>{/* end card */}

          {/* Bảng sản phẩm */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm" style={{ border: "1px solid #e5e7eb" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Sản phẩm</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase w-16">SL</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Đơn giá</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase w-20">CK</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {quote.items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{item.productName}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{item.sku}{item.selectedSizeLabel ? ` · ${item.selectedSizeLabel}` : ""}</div>
                    </td>
                    <td className="px-3 py-3 text-center text-gray-700 font-medium">{item.qty}</td>
                    <td className="px-3 py-3 text-right text-gray-600">{formatVND(item.unitPrice)}</td>
                    <td className="px-3 py-3 text-right">
                      {item.discountPct > 0 ? (
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">-{item.discountPct}%</span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold" style={{ color: "#C9A84C" }}>
                      {formatVND(item.finalPrice * item.qty)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {/* Tổng chưa chiết khấu */}
                <tr style={{ borderTop: "2px solid #e5e7eb" }}>
                  <td colSpan={4} className="px-4 py-2 text-right text-sm text-gray-500">Tổng chưa chiết khấu</td>
                  <td className="px-4 py-2 text-right text-sm text-gray-600">{formatVND(subtotalBeforeDiscount)}</td>
                </tr>
                {/* Chiết khấu số lượng */}
                {hasQtyDiscount && (
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right text-sm text-gray-500">Chiết khấu theo số lượng</td>
                    <td className="px-4 py-2 text-right text-sm text-green-600 font-medium">
                      -{formatVND(subtotalBeforeDiscount - subtotalAfterQtyDiscount)}
                    </td>
                  </tr>
                )}
                {/* Tổng sau CK SL */}
                {hasQtyDiscount && (
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right text-sm text-gray-600 font-medium">Tổng sau chiết khấu số lượng</td>
                    <td className="px-4 py-2 text-right text-sm font-semibold text-gray-700">{formatVND(subtotalAfterQtyDiscount)}</td>
                  </tr>
                )}
                {/* Chiết khấu bổ sung */}
                {quote.extraDiscountPct > 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right text-sm text-gray-500">Chiết khấu thêm ({quote.extraDiscountPct}%)</td>
                    <td className="px-4 py-2 text-right text-sm text-green-600 font-medium">
                      -{formatVND(subtotalAfterQtyDiscount * (quote.extraDiscountPct / 100))}
                    </td>
                  </tr>
                )}
                {/* Tổng sau chiết khấu */}
                {(hasQtyDiscount || quote.extraDiscountPct > 0) && (
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right text-sm text-gray-600 font-semibold">Tổng sau chiết khấu</td>
                    <td className="px-4 py-2 text-right text-sm font-bold text-gray-800">{formatVND(afterExtraDiscount)}</td>
                  </tr>
                )}
                {/* VAT */}
                {quote.includeVat && (
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right text-sm text-gray-500">VAT 8%</td>
                    <td className="px-4 py-2 text-right text-sm text-gray-600 font-medium">+{formatVND(vatAmount)}</td>
                  </tr>
                )}
                {/* Tổng cộng */}
                <tr style={{ background: "#fffbf0", borderTop: "2px solid #C9A84C" }}>
                  <td colSpan={4} className="px-4 py-4 text-right font-bold text-gray-900">
                    Tổng cộng {quote.includeVat && <span className="text-xs font-normal text-gray-500">(đã gồm VAT 8%)</span>}
                  </td>
                  <td className="px-4 py-4 text-right text-xl font-black" style={{ color: "#C9A84C" }}>
                    {formatVND(quote.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Ghi chú + Chữ ký */}
          <div className="grid grid-cols-2 gap-4">
            {quote.notes && (
              <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: "1px solid #e5e7eb" }}>
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">Điều khoản & Ghi chú</h3>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{quote.notes}</p>
              </div>
            )}
            {/* Chữ ký */}
            <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: "1px solid #e5e7eb" }}>
              <div className="flex justify-between gap-4">
                <div className="text-center flex-1">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-8">Đại diện bên bán</div>
                  <div className="border-t border-gray-300 pt-2">
                    <div className="text-xs font-semibold text-gray-700">{company.representativeName || company.name}</div>
                    <div className="text-xs text-gray-500">{company.representativeTitle || "Đại diện"}</div>
                  </div>
                </div>
                <div className="text-center flex-1">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-8">Đại diện bên mua</div>
                  <div className="border-t border-gray-300 pt-2">
                    <div className="text-xs font-semibold text-gray-700">{quote.leadName}</div>
                    <div className="text-xs text-gray-500">{lead?.company || ""}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <AtSign size={20} className="text-blue-600" />
              <h2 className="font-bold text-gray-900">Gửi báo giá qua Email</h2>
            </div>

            {/* Email To */}
            <div className="mb-3">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Gửi đến (Email)</label>
              <input
                type="email"
                value={emailTo}
                onChange={e => setEmailTo(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="email@example.com"
              />
              {lead?.email && emailTo !== lead.email && (
                <button onClick={() => setEmailTo(lead.email!)} className="text-xs text-blue-500 mt-1 hover:underline">
                  Dùng email khách hàng: {lead.email}
                </button>
              )}
            </div>

            {/* Subject */}
            <div className="mb-3">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Tiêu đề</label>
              <input
                type="text"
                value={emailSubject}
                onChange={e => setEmailSubject(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder={defaultEmailSubject}
              />
            </div>

            {/* Personal message */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Lời nhắn (hiển thị trong email)</label>
              <textarea
                value={emailMessage}
                onChange={e => setEmailMessage(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                placeholder="Lời nhắn cá nhân gửi kèm báo giá..."
              />
            </div>

            {/* Result */}
            {emailResult && (
              <div className={`mb-3 px-3 py-2 rounded-xl text-sm ${emailResult.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                {emailResult.msg}
              </div>
            )}

            <div className="text-xs text-gray-400 mb-3">
              Email sẽ được gửi kèm nội dung báo giá đầy đủ (sản phẩm, giá, chiết khấu, thông tin công ty).
            </div>

            <div className="flex gap-2">
              <button onClick={() => { setShowEmailModal(false); setEmailResult(null); }}
                className="flex-1 px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50">
                {emailResult?.ok ? "Đóng" : "Huỷ"}
              </button>
              {!emailResult?.ok && (
                <button onClick={sendEmail} disabled={sendingEmail || !emailTo.trim()}
                  className="flex-1 px-4 py-2 text-sm rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                  {sendingEmail ? "Đang gửi..." : "✉️ Gửi Email"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Zalo Modal */}
      {showZaloModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageCircle size={20} style={{ color: "#0068FF" }} />
                <h2 className="font-bold text-gray-900">Gửi báo giá qua Zalo Personal</h2>
              </div>
              <button onClick={() => { setShowZaloModal(false); setZaloSendResult(null); }}
                className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {/* Kết quả gửi */}
            {zaloSendResult ? (
              <div className="text-center py-4">
                {zaloSendResult.ok ? (
                  <>
                    <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "#dcfce7" }}>
                      <Check size={28} style={{ color: "#16a34a" }} />
                    </div>
                    <p className="font-semibold text-gray-900 mb-1">Gửi thành công!</p>
                    <p className="text-sm text-gray-500 mb-3">{zaloSendResult.msg}</p>
                    {zaloSendResult.pdfLink && (
                      <a href={zaloSendResult.pdfLink} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-600 underline break-all">
                        📄 Xem PDF báo giá
                      </a>
                    )}
                    <button onClick={() => { setShowZaloModal(false); setZaloSendResult(null); }}
                      className="mt-4 w-full px-4 py-2 text-sm rounded-xl font-semibold text-white"
                      style={{ background: "#0068FF" }}>
                      Đóng
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "#fee2e2" }}>
                      <X size={28} style={{ color: "#dc2626" }} />
                    </div>
                    <p className="font-semibold text-gray-900 mb-1">Gửi thất bại</p>
                    <p className="text-sm text-red-500 mb-4">{zaloSendResult.msg}</p>
                    <div className="flex gap-2">
                      <button onClick={() => setZaloSendResult(null)}
                        className="flex-1 px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50">
                        Thử lại
                      </button>
                      <button onClick={() => { setShowZaloModal(false); setZaloSendResult(null); }}
                        className="flex-1 px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50">
                        Đóng
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : sendingZalo ? (
              <div className="text-center py-8">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-500">Đang gửi qua Zalo Personal...</p>
              </div>
            ) : (
              <>
                {/* Thông tin khách */}
                {lead && (
                  <div className="flex items-center gap-2 mb-3 p-2 rounded-lg" style={{ background: "#f0f7ff" }}>
                    <Phone size={14} className="text-blue-500" />
                    <span className="text-sm text-gray-700">Gửi đến: <strong>{lead.name}</strong> · {lead.phone}</span>
                  </div>
                )}
                {/* Nội dung tin nhắn */}
                <textarea
                  value={zaloMsg}
                  onChange={e => setZaloMsg(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  placeholder="Nội dung tin nhắn Zalo..."
                />
                <p className="text-xs text-gray-400 mt-1">Link xem PDF báo giá sẽ được tự động thêm vào tin nhắn.</p>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setShowZaloModal(false)}
                    className="flex-1 px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50">
                    Huỷ
                  </button>
                  <button onClick={sendZaloPersonal} disabled={sendingZalo}
                    className="flex-1 px-4 py-2 text-sm rounded-xl font-semibold text-white disabled:opacity-50"
                    style={{ background: "#0068FF" }}>
                    Gửi Zalo Personal
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
