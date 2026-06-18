"use client";
import { useState } from "react";
import { ScrollReveal } from "./ScrollReveal";
import type { SiteTheme } from "@/lib/theme-store";
import Link from "next/link";

interface Props { theme: SiteTheme; }

const FW_MAP: Record<string, string> = {
  light: "300", normal: "400", medium: "500", semibold: "600", bold: "700",
};

const GUARANTEES = [
  { icon: "🔒", text: "Bảo hành 5 năm toàn diện" },
  { icon: "🚚", text: "Giao & lắp đặt miễn phí" },
  { icon: "↩️", text: "30 ngày đổi trả không lý do" },
  { icon: "📞", text: "Hỗ trợ kỹ thuật 24/7" },
];

export default function DownloadSection({ theme }: Props) {
  const dl = theme.homepageSections?.download;
  const primary = theme?.colors.primary ?? "#C9A84C";
  const secondary = theme?.colors.secondary ?? "#9A7A2E";
  const textColor = theme?.colors.text ?? "#F5EDD6";
  const borderColor = theme?.colors.border ?? "#2D2500";
  const surfaceColor = theme?.colors.surface ?? "#1A1500";
  const bgFrom = theme?.hero?.bgGradientFrom ?? "#080600";

  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, source: "homepage-cta" }),
      });
    } catch {
      // silent
    }
    setLoading(false);
    setSent(true);
  };

  return (
    <section id="download" className="py-14 sm:py-20 lg:py-24 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal variant="fadeUp" delay={0}>
          <div
            className="relative rounded-3xl overflow-hidden"
            style={{ border: `1px solid ${primary}25`, backgroundColor: surfaceColor }}
          >
            {/* Background glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: `radial-gradient(ellipse at 50% 0%, ${primary}10, transparent 60%)` }}
            />

            <div className="relative grid lg:grid-cols-2 gap-0">
              {/* ── LEFT: Copy ── */}
              <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-center gap-6">
                <div>
                  <div
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-4"
                    style={{ borderColor: `${primary}30`, backgroundColor: `${primary}08` }}
                  >
                    <div style={{ backgroundColor: primary }} className="w-1.5 h-1.5 rounded-full" />
                    <span style={{ fontSize: dl?.badge ? `${dl.badge.fontSize}px` : "11px", color: dl?.badge?.color ?? primary, fontWeight: dl?.badge ? FW_MAP[dl.badge.fontWeight] : "500" }} className="tracking-widest uppercase">
                      {dl?.badge?.text ?? "Nhận Tư Vấn Miễn Phí"}
                    </span>
                  </div>

                  <h2 className="mb-3 leading-tight">
                    <span style={{ fontSize: dl?.title ? `clamp(22px, 3vw, ${dl.title.fontSize}px)` : "clamp(22px, 3vw, 36px)", color: dl?.title?.color ?? textColor, fontWeight: dl?.title ? FW_MAP[dl.title.fontWeight] : "300", display: "block" }}>
                      {dl?.title?.text ?? "Không biết chọn mẫu nào?"}
                    </span>
                    <span style={{ fontSize: "clamp(22px, 3vw, 36px)", color: primary, fontWeight: "300", display: "block" }}>
                      Để chuyên gia tư vấn cho bạn
                    </span>
                  </h2>

                  <p style={{ fontSize: dl?.subtitle ? `${dl.subtitle.fontSize}px` : "14px", color: dl?.subtitle?.color ?? textColor, fontWeight: dl?.subtitle ? FW_MAP[dl.subtitle.fontWeight] : "400", opacity: 0.55 }} className="leading-relaxed">
                    {dl?.subtitle?.text ?? "Chia sẻ kích thước phòng, ngân sách và nhu cầu — chuyên gia SmartFurni sẽ gợi ý mẫu phù hợp nhất và báo giá trong 30 phút."}
                  </p>
                </div>

                {/* Guarantees */}
                <div className="grid grid-cols-2 gap-2.5">
                  {GUARANTEES.map((g) => (
                    <div key={g.text} className="flex items-center gap-2">
                      <span className="text-base">{g.icon}</span>
                      <span className="text-xs" style={{ color: `${textColor}60` }}>{g.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── RIGHT: Form ── */}
              <div
                className="p-8 sm:p-10 lg:p-12 flex flex-col justify-center"
                style={{ borderLeft: `1px solid ${borderColor}40` }}
              >
                {sent ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="text-5xl">✅</div>
                    <h3 className="text-xl font-semibold" style={{ color: textColor }}>Đã nhận thông tin!</h3>
                    <p className="text-sm" style={{ color: `${textColor}55` }}>
                      Chuyên gia SmartFurni sẽ liên hệ với bạn trong vòng 30 phút (giờ hành chính).
                    </p>
                    <Link
                      href="/products"
                      className="inline-block mt-2 text-sm underline"
                      style={{ color: primary }}
                    >
                      Xem sản phẩm trong khi chờ →
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: `${textColor}60` }}>
                        Họ và tên
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nguyễn Văn A"
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                        style={{
                          backgroundColor: `${bgFrom}`,
                          border: `1px solid ${borderColor}`,
                          color: textColor,
                        }}
                        onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = `${primary}60`; }}
                        onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = borderColor; }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: `${textColor}60` }}>
                        Số điện thoại <span style={{ color: primary }}>*</span>
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0901 234 567"
                        required
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                        style={{
                          backgroundColor: `${bgFrom}`,
                          border: `1px solid ${borderColor}`,
                          color: textColor,
                        }}
                        onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = `${primary}60`; }}
                        onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = borderColor; }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-60"
                      style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})`, color: bgFrom }}
                    >
                      {loading ? "Đang gửi..." : "Nhận tư vấn miễn phí →"}
                    </button>
                    <p className="text-center text-xs" style={{ color: `${textColor}30` }}>
                      Thông tin của bạn được bảo mật tuyệt đối
                    </p>

                    <div style={{ borderTopColor: `${borderColor}40` }} className="pt-3 border-t flex gap-3">
                      <Link
                        href="/products"
                        className="flex-1 py-2.5 rounded-xl text-sm font-medium text-center transition-opacity hover:opacity-70"
                        style={{ border: `1px solid ${borderColor}`, color: `${textColor}60` }}
                      >
                        Xem sản phẩm
                      </Link>
                      <Link
                        href="/catalogue"
                        className="flex-1 py-2.5 rounded-xl text-sm font-medium text-center transition-opacity hover:opacity-70"
                        style={{ border: `1px solid ${borderColor}`, color: `${textColor}60` }}
                      >
                        Tải catalogue
                      </Link>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
