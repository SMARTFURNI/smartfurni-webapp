"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Check, X, Printer } from "lucide-react";
import type { Quote, Lead } from "@/lib/crm-store";
import { formatVND } from "@/lib/crm-store";

interface Props { quote: Quote; lead: Lead | null }

const STATUS_MAP = {
  draft: { label: "Nháp", color: "#6b7280" },
  sent: { label: "Đã gửi", color: "#3b82f6" },
  accepted: { label: "Chấp nhận", color: "#22c55e" },
  rejected: { label: "Từ chối", color: "#ef4444" },
};

export default function QuoteDetailClient({ quote: initialQuote, lead }: Props) {
  const [quote, setQuote] = useState(initialQuote);
  const [updating, setUpdating] = useState(false);

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

  const s = STATUS_MAP[quote.status];

  return (
    <div className="flex flex-col h-full" style={{ background: "#f0f2f5" }}>
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
          <div className="flex items-center gap-2">
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
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Quote header */}
          <div className="bg-white rounded-2xl p-6 shadow-sm" style={{ border: "1px solid #e5e7eb" }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-2xl font-black" style={{ color: "#C9A84C" }}>SmartFurni</div>
                <div className="text-xs text-gray-500 mt-0.5">Giải pháp nội thất thông minh B2B</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">{quote.quoteNumber}</div>
                <div className="text-xs text-gray-500">Ngày: {new Date(quote.createdAt).toLocaleDateString("vi-VN")}</div>
                <div className="text-xs text-gray-500">Hiệu lực: {new Date(quote.validUntil).toLocaleDateString("vi-VN")}</div>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-gray-50">
              <div className="text-xs text-gray-500 mb-1">Khách hàng</div>
              <div className="font-semibold text-gray-900">{quote.leadName}</div>
              {lead && (
                <div className="text-sm text-gray-600 mt-0.5">{lead.phone} {lead.company ? `· ${lead.company}` : ""}</div>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm" style={{ border: "1px solid #e5e7eb" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Sản phẩm</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">SL</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Đơn giá</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">CK</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {quote.items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f9fafb" }}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{item.productName}</div>
                      <div className="text-xs text-gray-500">{item.sku}</div>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">{item.qty}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatVND(item.unitPrice)}</td>
                    <td className="px-4 py-3 text-right">
                      {item.discountPct > 0 ? (
                        <span className="text-xs font-bold text-green-600">-{item.discountPct}%</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold" style={{ color: "#C9A84C" }}>
                      {formatVND(item.finalPrice * item.qty)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "2px solid #e5e7eb" }}>
                  <td colSpan={4} className="px-4 py-3 text-right text-sm text-gray-600">Tạm tính</td>
                  <td className="px-4 py-3 text-right font-medium">{formatVND(quote.subtotal)}</td>
                </tr>
                {quote.extraDiscountPct > 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right text-sm text-gray-600">Chiết khấu thêm ({quote.extraDiscountPct}%)</td>
                    <td className="px-4 py-2 text-right text-sm text-green-600 font-medium">
                      -{formatVND(quote.subtotal * quote.extraDiscountPct / 100)}
                    </td>
                  </tr>
                )}
                <tr style={{ background: "#fffbf0" }}>
                  <td colSpan={4} className="px-4 py-3 text-right font-bold text-gray-900">Tổng cộng</td>
                  <td className="px-4 py-3 text-right text-xl font-black" style={{ color: "#C9A84C" }}>
                    {formatVND(quote.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {quote.notes && (
            <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: "1px solid #e5e7eb" }}>
              <h3 className="font-semibold text-gray-900 mb-2">Ghi chú</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{quote.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
