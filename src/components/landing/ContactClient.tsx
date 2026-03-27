"use client";

import { useState } from "react";
import Link from "next/link";
import type { SiteTheme } from "@/lib/theme-types";
import Footer from "@/components/landing/Footer";

const showrooms = [
  {
    city: "TP. Hồ Chí Minh",
    address: "123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
    phone: "028 3822 1234",
    hours: "8:00 – 21:00 (Thứ 2 – Chủ nhật)",
    mapUrl: "https://maps.google.com/?q=Nguyen+Hue+Ho+Chi+Minh",
    badge: "Flagship",
  },
  {
    city: "Hà Nội",
    address: "45 Tràng Tiền, Hoàn Kiếm, Hà Nội",
    phone: "024 3825 5678",
    hours: "8:00 – 21:00 (Thứ 2 – Chủ nhật)",
    mapUrl: "https://maps.google.com/?q=Trang+Tien+Hanoi",
    badge: "Showroom",
  },
  {
    city: "Đà Nẵng",
    address: "88 Bạch Đằng, Hải Châu, Đà Nẵng",
    phone: "0236 3822 9012",
    hours: "8:30 – 20:30 (Thứ 2 – Thứ 7)",
    mapUrl: "https://maps.google.com/?q=Bach+Dang+Da+Nang",
    badge: "Showroom",
  },
];

const contactMethods = [
  { icon: "📞", label: "Hotline", value: "1800 1234 56", sub: "Miễn phí · 8:00 – 22:00" },
  { icon: "✉️", label: "Email", value: "hello@smartfurni.vn", sub: "Phản hồi trong 2 giờ" },
  { icon: "💬", label: "Zalo OA", value: "SmartFurni Official", sub: "Phản hồi tức thì" },
  { icon: "📘", label: "Facebook", value: "fb.com/smartfurni", sub: "Cộng đồng 50K thành viên" },
];

interface Props {
  theme: SiteTheme;
}

export default function ContactClient({ theme }: Props) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", subject: "Tư vấn sản phẩm", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Vui lòng nhập họ tên";
    if (!form.phone.trim()) errs.phone = "Vui lòng nhập số điện thoại";
    else if (!/^(0|\+84)[0-9]{9}$/.test(form.phone.replace(/\s/g, ""))) errs.phone = "Số điện thoại không hợp lệ";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Email không hợp lệ";
    if (!form.message.trim()) errs.message = "Vui lòng nhập nội dung tin nhắn";
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitError("");
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 1500));
      setLoading(false);
      setSubmitted(true);
    } catch {
      setLoading(false);
      setSubmitError("Có lỗi xảy ra. Vui lòng thử lại hoặc gọi hotline 1800 1234 56.");
    }
  };

  return (
    <>
      {/* Hero */}
      <section className="pt-28 sm:pt-32 pb-12 sm:pb-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Section label — giống trang chủ */}
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="w-6 h-px bg-[#C9A84C]" />
            <span className="text-xs text-[#C9A84C] font-medium tracking-wider uppercase">{theme.pageContact.heroBadge}</span>
            <span className="w-6 h-px bg-[#C9A84C]" />
          </div>
          {/* H1 — font-light + text-gold-gradient giống trang chủ */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-light text-[#F5EDD6] leading-tight mb-6"
            dangerouslySetInnerHTML={{ __html: theme.pageContact.heroTitle }}
          />
          <p className="text-base sm:text-lg text-[#F5EDD6]/50 leading-relaxed max-w-xl mx-auto">
            {theme.pageContact.heroSubtitle}
          </p>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-10 sm:py-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[
            { icon: "📞", label: "Hotline", value: theme.pageContact.phone, sub: theme.pageContact.workingHours },
            { icon: "✉️", label: "Email", value: theme.pageContact.email, sub: "Phản hồi trong 2 giờ" },
            { icon: "💬", label: "Zalo OA", value: "SmartFurni Official", sub: "Phản hồi tức thì" },
            { icon: "📌", label: "Showroom", value: theme.pageContact.address, sub: theme.pageContact.workingHours },
          ].map((c) => (
            <div
              key={c.label}
              className="bg-[#1A1600] border border-[#2E2800] rounded-2xl p-4 sm:p-5 text-center hover:border-[#C9A84C]/40 transition-colors group"
            >
              <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">{c.icon}</div>
              {/* Label — giống section label trang chủ */}
              <p className="text-xs text-[#C9A84C] font-medium tracking-wider uppercase mb-1">{c.label}</p>
              {/* Value — font-semibold giống card heading trang chủ */}
              <p className="text-xs sm:text-sm text-[#F5EDD6] font-semibold mb-1 break-all group-hover:text-[#C9A84C] transition-colors">{c.value}</p>
              {/* Sub — text mờ giống body trang chủ */}
              <p className="text-xs text-[#F5EDD6]/40 hidden sm:block">{c.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Form + Showrooms */}
      <section className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
          {/* Contact Form */}
          <div>
            {/* Section heading — giống FeaturesSection trang chủ */}
            <h2 className="text-3xl sm:text-4xl font-light text-[#F5EDD6] mb-2">
              Gửi <span className="text-gold-gradient">tin nhắn</span>
            </h2>
            <p className="text-sm text-[#F5EDD6]/50 mb-6 sm:mb-8 leading-relaxed">
              Điền thông tin bên dưới và chúng tôi sẽ liên hệ lại trong vòng 2 giờ làm việc.
            </p>

            {submitted ? (
              <div className="bg-[#1A1600] border border-[#C9A84C]/40 rounded-2xl p-6 sm:p-8 text-center">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-[#F5EDD6] font-semibold text-xl mb-2">Đã nhận tin nhắn!</h3>
                <p className="text-[#F5EDD6]/50 mb-6 leading-relaxed">
                  Cảm ơn bạn đã liên hệ. Chúng tôi sẽ phản hồi trong vòng 2 giờ làm việc.
                </p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ name: "", phone: "", email: "", subject: "Tư vấn sản phẩm", message: "" }); }}
                  className="px-6 py-2 rounded-full border border-[#C9A84C]/40 text-[#C9A84C] text-sm font-medium hover:bg-[#C9A84C]/10 transition-colors"
                >
                  Gửi tin nhắn khác
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Submit error */}
                {submitError && (
                  <div className="flex items-start gap-3 bg-[#EF444415] border border-[#EF444430] rounded-xl px-4 py-3">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <p className="text-xs text-[#EF4444]">{submitError}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    {/* Label — tracking-wider giống trang chủ */}
                    <label className="text-xs text-[#F5EDD6]/40 font-medium tracking-wider uppercase mb-2 block">
                      Họ và tên <span className="text-[#C9A84C]">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => { setForm({ ...form, name: e.target.value }); if (errors.name) setErrors({ ...errors, name: "" }); }}
                      placeholder="Nguyễn Văn A"
                      className={`w-full bg-[#1A1600] border rounded-xl px-4 py-3 text-sm text-[#F5EDD6] placeholder-[#F5EDD6]/20 focus:outline-none transition-colors ${errors.name ? "border-[#EF4444]" : "border-[#2E2800] focus:border-[#C9A84C]/40"}`}
                    />
                    {errors.name && <p className="text-xs text-[#EF4444] mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <label className="text-xs text-[#F5EDD6]/40 font-medium tracking-wider uppercase mb-2 block">
                      Số điện thoại <span className="text-[#C9A84C]">*</span>
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => { setForm({ ...form, phone: e.target.value }); if (errors.phone) setErrors({ ...errors, phone: "" }); }}
                      placeholder="0901 234 567"
                      className={`w-full bg-[#1A1600] border rounded-xl px-4 py-3 text-sm text-[#F5EDD6] placeholder-[#F5EDD6]/20 focus:outline-none transition-colors ${errors.phone ? "border-[#EF4444]" : "border-[#2E2800] focus:border-[#C9A84C]/40"}`}
                    />
                    {errors.phone && <p className="text-xs text-[#EF4444] mt-1">{errors.phone}</p>}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[#F5EDD6]/40 font-medium tracking-wider uppercase mb-2 block">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => { setForm({ ...form, email: e.target.value }); if (errors.email) setErrors({ ...errors, email: "" }); }}
                    placeholder="email@example.com"
                    className={`w-full bg-[#1A1600] border rounded-xl px-4 py-3 text-sm text-[#F5EDD6] placeholder-[#F5EDD6]/20 focus:outline-none transition-colors ${errors.email ? "border-[#EF4444]" : "border-[#2E2800] focus:border-[#C9A84C]/40"}`}
                  />
                  {errors.email && <p className="text-xs text-[#EF4444] mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="text-xs text-[#F5EDD6]/40 font-medium tracking-wider uppercase mb-2 block">Chủ đề</label>
                  <select
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full bg-[#1A1600] border border-[#2E2800] rounded-xl px-4 py-3 text-sm text-[#F5EDD6] focus:outline-none focus:border-[#C9A84C]/40 transition-colors"
                  >
                    <option>Tư vấn sản phẩm</option>
                    <option>Đặt hàng</option>
                    <option>Hỗ trợ kỹ thuật</option>
                    <option>Bảo hành & sửa chữa</option>
                    <option>Hợp tác kinh doanh</option>
                    <option>Khác</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-[#F5EDD6]/40 font-medium tracking-wider uppercase mb-2 block">
                    Nội dung <span className="text-[#C9A84C]">*</span>
                  </label>
                  <textarea
                    value={form.message}
                    onChange={(e) => { setForm({ ...form, message: e.target.value }); if (errors.message) setErrors({ ...errors, message: "" }); }}
                    placeholder="Mô tả nhu cầu hoặc câu hỏi của bạn..."
                    rows={5}
                    className={`w-full bg-[#1A1600] border rounded-xl px-4 py-3 text-sm text-[#F5EDD6] placeholder-[#F5EDD6]/20 focus:outline-none transition-colors resize-none ${errors.message ? "border-[#EF4444]" : "border-[#2E2800] focus:border-[#C9A84C]/40"}`}
                  />
                  {errors.message && <p className="text-xs text-[#EF4444] mt-1">{errors.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#E2C97E] to-[#9A7A2E] text-[#0D0B00] font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#0D0B00] border-t-transparent rounded-full animate-spin" />
                      Đang gửi...
                    </>
                  ) : (
                    "Gửi tin nhắn"
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Showrooms */}
          <div>
            <h2 className="text-3xl sm:text-4xl font-light text-[#F5EDD6] mb-2">
              <span className="text-gold-gradient">Showroom</span>
            </h2>
            <p className="text-sm text-[#F5EDD6]/50 mb-6 sm:mb-8 leading-relaxed">
              Ghé thăm và trải nghiệm trực tiếp tại showroom gần bạn nhất.
            </p>

            <div className="space-y-4">
              {showrooms.map((s) => (
                <div key={s.city} className="bg-[#1A1600] border border-[#2E2800] rounded-2xl p-4 sm:p-6 hover:border-[#C9A84C]/40 transition-colors group">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {/* City name — font-semibold giống card heading trang chủ */}
                        <h3 className="text-[#F5EDD6] font-semibold group-hover:text-[#C9A84C] transition-colors">{s.city}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#C9A84C]/20 text-[#C9A84C] border border-[#C9A84C]/30 font-medium">
                          {s.badge}
                        </span>
                      </div>
                      <p className="text-sm text-[#F5EDD6]/50">📍 {s.address}</p>
                    </div>
                  </div>
                  <div className="space-y-1 mb-4">
                    <p className="text-sm text-[#F5EDD6]/50">📞 {s.phone}</p>
                    <p className="text-sm text-[#F5EDD6]/50">🕐 {s.hours}</p>
                  </div>
                  <a
                    href={s.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-[#C9A84C] font-medium hover:text-[#E2C97E] transition-colors"
                  >
                    🗺️ Xem trên Google Maps →
                  </a>
                </div>
              ))}
            </div>

            {/* Map placeholder */}
            <div className="mt-6 bg-[#1A1600] border border-[#2E2800] rounded-2xl overflow-hidden h-48 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-2">🗺️</div>
                <p className="text-sm text-[#F5EDD6]/50">Bản đồ showroom SmartFurni</p>
                <a
                  href="https://maps.google.com/?q=SmartFurni+Vietnam"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#C9A84C] font-medium hover:text-[#E2C97E] transition-colors mt-1 block"
                >
                  Mở Google Maps →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-[#0F0D00] border-t border-[#2E2800]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            {/* Section label — giống trang chủ */}
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="w-6 h-px bg-[#C9A84C]" />
              <span className="text-xs text-[#C9A84C] font-medium tracking-wider uppercase">FAQ</span>
              <span className="w-6 h-px bg-[#C9A84C]" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-light text-[#F5EDD6]">
              Câu hỏi <span className="text-gold-gradient">thường gặp</span>
            </h2>
          </div>
          <div className="space-y-4">
            {[
              { q: "Giường SmartFurni có bảo hành bao lâu?", a: "SmartFurni bảo hành 5 năm toàn diện cho khung giường và motor, 2 năm cho linh kiện điện tử và app." },
              { q: "Tôi có thể lắp đặt giường tự mình không?", a: "Có — bộ giường đi kèm hướng dẫn lắp đặt chi tiết. Tuy nhiên chúng tôi cũng cung cấp dịch vụ lắp đặt tận nhà miễn phí trong vòng 50km từ showroom." },
              { q: "App SmartFurni có hoạt động khi không có internet không?", a: "Có — app kết nối trực tiếp với giường qua Bluetooth, không cần internet. Chỉ cần internet để đồng bộ dữ liệu giấc ngủ lên cloud." },
              { q: "Giường có tương thích với Google Home / Apple HomeKit không?", a: "Hiện tại chúng tôi đang phát triển tích hợp với Google Home và Apple HomeKit, dự kiến ra mắt Q3 2026." },
            ].map((faq) => (
              <div key={faq.q} className="bg-[#1A1600] border border-[#2E2800] rounded-xl p-4 sm:p-6 hover:border-[#C9A84C]/40 transition-colors group">
                {/* Q — font-semibold giống card heading trang chủ */}
                <h3 className="text-[#F5EDD6] font-semibold mb-2 text-sm sm:text-base group-hover:text-[#C9A84C] transition-colors">
                  {faq.q}
                </h3>
                {/* A — text mờ giống body trang chủ */}
                <p className="text-sm text-[#F5EDD6]/50 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer theme={theme} variant="full" />
    </>
  );
}
