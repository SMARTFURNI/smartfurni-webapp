"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { SiteTheme } from "@/lib/theme-types";
import Footer from "@/components/landing/Footer";

interface Props {
  theme: SiteTheme;
}

function formatPrice(price: number) {
  if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toFixed(1)} tỷ đ`;
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(0)} triệu đ`;
  return price.toLocaleString("vi-VN") + " đ";
}

const PAYMENT_LABELS: Record<string, string> = {
  cod: "Thanh toán khi nhận hàng (COD)",
  bank_transfer: "Chuyển khoản ngân hàng",
  momo: "Ví MoMo",
  vnpay: "VNPay",
};

export default function CheckoutSuccessClient({ theme }: Props) {
  const { colors, layout } = theme;
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const orderNumber = searchParams.get("order") ?? "SF-2026-0000";
  const customerName = searchParams.get("name") ?? "Khách hàng";
  const total = Number(searchParams.get("total") ?? 0);
  const paymentMethod = searchParams.get("method") ?? "cod";

  const isBankTransfer = paymentMethod === "bank_transfer";
  const isMomo = paymentMethod === "momo";
  const isOnlinePayment = isBankTransfer || isMomo || paymentMethod === "vnpay";

  if (!mounted) {
    return (
      <div style={{ paddingTop: 120 }} className="flex items-center justify-center min-h-screen">
        <div style={{ color: `${colors.text}40` }} className="text-sm">Đang tải...</div>
      </div>
    );
  }

  return (
    <>
    <div style={{ maxWidth: 680, paddingTop: 80 }} className="mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Checkout Progress Steps — all done */}
      <div className="flex items-center justify-center gap-0 mb-8">
        {[
          { step: 1, label: "Giỏ hàng", done: true },
          { step: 2, label: "Đặt hàng", done: true },
          { step: 3, label: "Xác nhận", done: true, active: true },
        ].map((s, i) => (
          <div key={s.step} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                style={{
                  backgroundColor: s.done ? colors.primary : "transparent",
                  borderColor: s.done ? colors.primary : `${colors.primary}20`,
                  color: s.done ? colors.background : `${colors.text}20`,
                }}
                className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span style={{ color: colors.primary }} className="text-xs font-medium hidden sm:block">{s.label}</span>
            </div>
            {i < 2 && (
              <div style={{ backgroundColor: colors.primary }} className="w-16 sm:w-24 h-0.5 mx-2" />
            )}
          </div>
        ))}
      </div>
      {/* Success animation */}
      <div className="text-center mb-8">
        {/* Checkmark circle */}
        <div
          style={{
            background: `linear-gradient(135deg, ${colors.success}20, ${colors.success}10)`,
            borderColor: `${colors.success}30`,
          }}
          className="w-24 h-24 rounded-full border-2 flex items-center justify-center mx-auto mb-5"
        >
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <circle cx="22" cy="22" r="20" fill={`${colors.success}20`} stroke={colors.success} strokeWidth="2" />
            <path
              d="M13 22L19 28L31 16"
              stroke={colors.success}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-light text-[#F5EDD6] mb-2">
          Đặt hàng <span className="text-gold-gradient">thành công!</span>
        </h1>
        <p className="text-sm text-[#F5EDD6]/50 leading-relaxed">
          Cảm ơn <strong className="text-[#F5EDD6] font-semibold">{customerName}</strong> đã tin tưởng SmartFurni.
          Chúng tôi sẽ liên hệ xác nhận đơn hàng sớm nhất có thể.
        </p>
      </div>

      {/* Order details card */}
      <div
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
        className="rounded-2xl border p-4 sm:p-6 mb-6"
      >
        <div className="flex items-center gap-2 mb-4 sm:mb-5">
          <span className="w-5 h-px bg-[#C9A84C]" />
          <h2 className="font-semibold text-[#F5EDD6] text-base">
            Thông tin đơn hàng
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          {[
            { label: "Mã đơn hàng", value: orderNumber, highlight: true },
            { label: "Phương thức thanh toán", value: PAYMENT_LABELS[paymentMethod] ?? paymentMethod },
            { label: "Tổng tiền", value: formatPrice(total), highlight: true },
            { label: "Trạng thái", value: "Chờ xác nhận" },
          ].map((row) => (
            <div key={row.label} className="flex justify-between items-center py-2" style={{ borderBottom: `1px solid ${colors.border}20` }}>
              <span className="text-sm text-[#F5EDD6]/50">{row.label}</span>
              <span
                className={`text-sm ${row.highlight ? "font-semibold text-gold-gradient" : "font-medium text-[#F5EDD6]"}`}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Payment instructions (if online payment) */}
      {isOnlinePayment && (
        <div
          style={{ backgroundColor: `${colors.warning}08`, borderColor: `${colors.warning}25` }}
          className="rounded-2xl border p-5 mb-6"
        >
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-[#F5EDD6] mb-2">
                Vui lòng hoàn tất thanh toán
              </p>
              {isBankTransfer && (
                <div className="flex flex-col gap-1.5">
                  <p style={{ color: `${colors.text}70` }} className="text-xs">Chuyển khoản đến:</p>
                  {[
                    { label: "Ngân hàng", value: "Vietcombank" },
                    { label: "Số tài khoản", value: "1234567890" },
                    { label: "Chủ tài khoản", value: "CONG TY SMARTFURNI" },
                    { label: "Số tiền", value: formatPrice(total) },
                    { label: "Nội dung CK", value: `SF ${orderNumber}` },
                  ].map((row) => (
                    <div key={row.label} className="flex gap-2">
                      <span className="text-xs text-[#F5EDD6]/40 w-32 flex-shrink-0">{row.label}:</span>
                      <span className="text-xs font-semibold text-[#F5EDD6]">{row.value}</span>
                    </div>
                  ))}
                </div>
              )}
              {isMomo && (
                <div>
                  <p style={{ color: `${colors.text}70` }} className="text-xs mb-1">Chuyển tiền MoMo đến:</p>
                  <p style={{ color: colors.primary }} className="text-base font-bold">0912 345 678</p>
                  <p style={{ color: `${colors.text}50` }} className="text-xs">SmartFurni Vietnam</p>
                  <p style={{ color: `${colors.text}60` }} className="text-xs mt-1">
                    Nội dung: <strong style={{ color: colors.text }}>{orderNumber}</strong>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Next steps */}
      <div
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
        className="rounded-2xl border p-5 mb-8"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="w-5 h-px bg-[#C9A84C]" />
          <h3 className="font-semibold text-[#F5EDD6] text-sm">
            Các bước tiếp theo
          </h3>
        </div>
        <div className="flex flex-col gap-3">
          {[
            {
              step: "1",
              title: "Xác nhận đơn hàng",
              desc: "Nhân viên SmartFurni sẽ gọi điện xác nhận trong vòng 2 giờ làm việc",
              icon: "📞",
            },
            {
              step: "2",
              title: "Chuẩn bị hàng",
              desc: "Đơn hàng sẽ được đóng gói và chuẩn bị trong 1-2 ngày làm việc",
              icon: "📦",
            },
            {
              step: "3",
              title: "Giao hàng",
              desc: "Hàng được giao đến địa chỉ của bạn trong 3-7 ngày làm việc",
              icon: "🚚",
            },
            {
              step: "4",
              title: "Lắp đặt miễn phí",
              desc: "Kỹ thuật viên SmartFurni sẽ lắp đặt và hướng dẫn sử dụng tại nhà",
              icon: "🔧",
            },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <div
                style={{ backgroundColor: `${colors.primary}15`, color: colors.primary }}
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
              >
                {item.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#F5EDD6]">{item.title}</p>
                <p className="text-xs text-[#F5EDD6]/40 mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/products"
          style={{
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
            color: colors.background,
          }}
          className="flex-1 py-3.5 rounded-xl text-sm font-semibold text-center hover:opacity-90 transition-opacity"
        >
          Tiếp tục mua sắm
        </Link>
        <Link
          href="/"
          style={{ borderColor: colors.border, color: colors.text }}
          className="flex-1 py-3.5 rounded-xl text-sm font-medium text-center border hover:opacity-80 transition-opacity"
        >
          Về trang chủ
        </Link>
      </div>

      {/* Track order + Contact */}
      <div className="mt-6 flex flex-col gap-3 text-center">
        {/* Track order CTA */}
        <div
          style={{ backgroundColor: `${colors.primary}08`, borderColor: `${colors.primary}20` }}
          className="rounded-xl border p-4"
        >
          <p style={{ color: `${colors.text}60` }} className="text-xs mb-2">
            Đơn hàng <strong style={{ color: colors.primary }}>#{orderNumber}</strong> đã được ghi nhận. Theo dõi trạng thái qua:
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/contact"
              style={{ color: colors.primary, borderColor: `${colors.primary}30` }}
              className="flex items-center gap-1.5 text-xs font-medium border rounded-full px-3 py-1.5 hover:opacity-80 transition-opacity"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6 6l1.27-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              Hotline: 1800 1234 56
            </Link>
            <a
              href="https://zalo.me/smartfurni"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: colors.primary, borderColor: `${colors.primary}30` }}
              className="flex items-center gap-1.5 text-xs font-medium border rounded-full px-3 py-1.5 hover:opacity-80 transition-opacity"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Zalo OA
            </a>
            <Link
              href="/contact"
              style={{ color: colors.primary, borderColor: `${colors.primary}30` }}
              className="flex items-center gap-1.5 text-xs font-medium border rounded-full px-3 py-1.5 hover:opacity-80 transition-opacity"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Email
            </Link>
          </div>
        </div>
        <p style={{ color: `${colors.text}30` }} className="text-xs">
          Mã đơn hàng của bạn: <strong style={{ color: `${colors.text}50` }}>#{orderNumber}</strong> — Lưu lại để tra cứu khi cần
        </p>
      </div>
    </div>
    <Footer theme={theme} variant="minimal" />
    </>
  );
}
