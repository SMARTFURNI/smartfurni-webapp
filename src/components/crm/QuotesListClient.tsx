"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import type { Quote } from "@/lib/crm-store";
import { formatVND } from "@/lib/crm-store";

interface Props { initialQuotes: Quote[] }

const STATUS_MAP = {
  draft: { label: "Nháp", color: "#6b7280" },
  sent: { label: "Đã gửi", color: "#3b82f6" },
  accepted: { label: "Chấp nhận", color: "#22c55e" },
  rejected: { label: "Từ chối", color: "#ef4444" },
};

export default function QuotesListClient({ initialQuotes }: Props) {
  const [quotes] = useState(initialQuotes);

  return (
    <div className="flex flex-col h-full" style={{ background: "#f0f2f5" }}>
      <div className="flex-shrink-0 bg-white px-6 py-4" style={{ borderBottom: "1px solid #e5e7eb" }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Báo giá</h1>
            <p className="text-sm text-gray-500 mt-0.5">{quotes.length} báo giá</p>
          </div>
          <Link href="/crm/quotes/new"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-gray-900"
            style={{ background: "#C9A84C" }}>
            <Plus size={15} /> Tạo báo giá
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
          {quotes.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <FileText size={40} className="mx-auto mb-3 opacity-20" />
              <p>Chưa có báo giá nào</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Số BG</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Khách hàng</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ngày tạo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Hiệu lực</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tổng tiền</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map(q => {
                  const s = STATUS_MAP[q.status];
                  return (
                    <tr key={q.id} className="hover:bg-amber-50/30 transition-colors cursor-pointer"
                      style={{ borderBottom: "1px solid #f9fafb" }}>
                      <td className="px-4 py-3">
                        <Link href={`/crm/quotes/${q.id}`} className="font-semibold text-gray-900 hover:text-amber-600">
                          {q.quoteNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{q.leadName}</td>
                      <td className="px-4 py-3 text-gray-500">{new Date(q.createdAt).toLocaleDateString("vi-VN")}</td>
                      <td className="px-4 py-3 text-gray-500">{new Date(q.validUntil).toLocaleDateString("vi-VN")}</td>
                      <td className="px-4 py-3 text-right font-bold" style={{ color: "#C9A84C" }}>{formatVND(q.total)}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: `${s.color}15`, color: s.color }}>{s.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
