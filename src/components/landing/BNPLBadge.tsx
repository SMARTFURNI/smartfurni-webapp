"use client";
import { useState } from "react";

interface Props {
  price: number; // VND
  primary?: string;
  bg?: string;
  text?: string;
  border?: string;
  surface?: string;
}

const BNPL_PLANS = [
  { id: "momo", label: "MoMo Pay Later", icon: "💜", months: [3, 6, 12], fee: 0, note: "0% lãi suất" },
  { id: "kredivo", label: "Kredivo", icon: "🔵", months: [3, 6, 12, 24], fee: 0, note: "0% lãi 3 tháng" },
  { id: "vpbank", label: "VPBank BNPL", icon: "🟢", months: [6, 12, 18, 24], fee: 0, note: "Duyệt trong 5 phút" },
  { id: "home_credit", label: "Home Credit", icon: "🔴", months: [6, 12, 18, 24, 36], fee: 0.8, note: "Lãi suất thấp" },
];

function formatPrice(price: number) {
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(1)} tr`;
  return price.toLocaleString("vi-VN");
}

function formatPriceFull(price: number) {
  if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toFixed(1)} tỷ đ`;
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(0)} triệu đ`;
  return price.toLocaleString("vi-VN") + " đ";
}

function calcMonthly(price: number, months: number, feePercent: number) {
  const total = price * (1 + (feePercent / 100) * months);
  return Math.ceil(total / months / 1000) * 1000;
}

export default function BNPLBadge({
  price,
  primary = "#C9A84C",
  bg = "#0a0800",
  text = "#F5EDD6",
  border = "#2a2000",
  surface = "#1a1500",
}: Props) {
  const [open, setOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(BNPL_PLANS[0]);
  const [selectedMonths, setSelectedMonths] = useState(12);

  const monthly = calcMonthly(price, selectedMonths, selectedPlan.fee);

  return (
    <div>
      {/* Inline badge — shown on product page */}
      <button
        onClick={() => setOpen(true)}
        style={{ background: `${primary}15`, border: `1px solid ${primary}40`, color: primary }}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:opacity-90 transition-opacity w-full"
      >
        <span className="text-base">💳</span>
        <span className="font-medium">
          Trả góp từ <strong>{formatPrice(calcMonthly(price, 12, 0))}đ/tháng</strong>
        </span>
        <span className="ml-auto text-xs opacity-70">0% lãi suất →</span>
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            style={{ background: bg, border: `1px solid ${border}`, maxWidth: 480, width: "100%" }}
            className="rounded-2xl p-6 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold" style={{ color: text }}>Trả góp 0% lãi suất</h3>
                <p className="text-sm" style={{ color: `${text}60` }}>Tổng giá trị: {formatPriceFull(price)}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{ color: `${text}60`, border: `1px solid ${border}` }}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80"
              >
                ✕
              </button>
            </div>

            {/* Plan selector */}
            <div className="mb-4">
              <p className="text-xs font-semibold mb-2" style={{ color: `${text}60` }}>CHỌN ĐƠN VỊ TRẢ GÓP</p>
              <div className="grid grid-cols-2 gap-2">
                {BNPL_PLANS.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => {
                      setSelectedPlan(plan);
                      setSelectedMonths(plan.months[Math.min(1, plan.months.length - 1)]);
                    }}
                    style={{
                      background: selectedPlan.id === plan.id ? `${primary}20` : surface,
                      border: `1px solid ${selectedPlan.id === plan.id ? primary : border}`,
                      color: text,
                    }}
                    className="flex items-center gap-2 p-3 rounded-xl text-left transition-all"
                  >
                    <span className="text-xl">{plan.icon}</span>
                    <div>
                      <div className="text-xs font-semibold">{plan.label}</div>
                      <div className="text-xs" style={{ color: primary }}>{plan.note}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Month selector */}
            <div className="mb-5">
              <p className="text-xs font-semibold mb-2" style={{ color: `${text}60` }}>SỐ THÁNG TRẢ GÓP</p>
              <div className="flex gap-2 flex-wrap">
                {selectedPlan.months.map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMonths(m)}
                    style={{
                      background: selectedMonths === m ? primary : surface,
                      color: selectedMonths === m ? bg : text,
                      border: `1px solid ${selectedMonths === m ? primary : border}`,
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  >
                    {m} tháng
                  </button>
                ))}
              </div>
            </div>

            {/* Monthly payment highlight */}
            <div
              style={{ background: `${primary}15`, border: `1px solid ${primary}40` }}
              className="rounded-xl p-4 mb-5 text-center"
            >
              <p className="text-sm mb-1" style={{ color: `${text}70` }}>Mỗi tháng chỉ trả</p>
              <p className="text-3xl font-bold" style={{ color: primary }}>
                {formatPriceFull(monthly)}
              </p>
              <p className="text-xs mt-1" style={{ color: `${text}50` }}>
                trong {selectedMonths} tháng
                {selectedPlan.fee === 0 ? " · 0% lãi suất" : ` · Lãi ${selectedPlan.fee}%/tháng`}
              </p>
            </div>

            {/* CTA */}
            <button
              style={{ background: primary, color: bg }}
              className="w-full py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
              onClick={() => setOpen(false)}
            >
              Chọn trả góp qua {selectedPlan.label} →
            </button>

            <p className="text-xs text-center mt-3" style={{ color: `${text}40` }}>
              Điều kiện: CMND/CCCD + Hợp đồng lao động. Duyệt trong 5–15 phút.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
