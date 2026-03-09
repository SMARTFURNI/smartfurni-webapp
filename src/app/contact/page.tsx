"use client";

import { useState } from "react";
import Link from "next/link";

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

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", phone: "", email: "", subject: "Tư vấn sản phẩm", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate form submission
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#0D0B00] text-[#F5EDD6]">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#2E2800] bg-[#0D0B00]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E2C97E] to-[#9A7A2E] flex items-center justify-center text-[#0D0B00] font-bold text-sm">
              SF
            </div>
            <span className="font-brand text-[#C9A84C] tracking-widest text-sm uppercase">SmartFurni</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-sm text-[#9A8A6A] hover:text-[#C9A84C] transition-colors">Trang chủ</Link>
            <Link href="/about" className="text-sm text-[#9A8A6A] hover:text-[#C9A84C] transition-colors">Giới thiệu</Link>
            <Link href="/contact" className="text-sm text-[#C9A84C] border-b border-[#C9A84C] pb-0.5">Liên hệ</Link>
            <Link href="/dashboard" className="text-sm px-4 py-2 rounded-full border border-[#C9A84C40] text-[#C9A84C] hover:bg-[#C9A84C15] transition-colors">
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs tracking-[0.3em] text-[#C9A84C] uppercase mb-4">Liên hệ</p>
          <h1 className="font-brand text-5xl md:text-6xl text-[#E2C97E] mb-6">
            Chúng tôi luôn<br />sẵn sàng hỗ trợ
          </h1>
          <p className="text-lg text-[#9A8A6A] leading-relaxed max-w-xl mx-auto">
            Đội ngũ tư vấn SmartFurni sẵn sàng giải đáp mọi thắc mắc và hỗ trợ bạn chọn giải pháp phù hợp nhất.
          </p>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-12 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {contactMethods.map((c) => (
            <div key={c.label} className="bg-[#1A1600] border border-[#2E2800] rounded-2xl p-5 text-center hover:border-[#C9A84C40] transition-colors">
              <div className="text-3xl mb-3">{c.icon}</div>
              <p className="text-xs text-[#C9A84C] uppercase tracking-wider mb-1">{c.label}</p>
              <p className="text-sm text-[#E2C97E] font-medium mb-1">{c.value}</p>
              <p className="text-xs text-[#9A8A6A]">{c.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Form + Showrooms */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div>
            <h2 className="font-brand text-3xl text-[#E2C97E] mb-2">Gửi tin nhắn</h2>
            <p className="text-sm text-[#9A8A6A] mb-8">Điền thông tin bên dưới và chúng tôi sẽ liên hệ lại trong vòng 2 giờ làm việc.</p>

            {submitted ? (
              <div className="bg-[#1A1600] border border-[#C9A84C40] rounded-2xl p-8 text-center">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-[#E2C97E] font-semibold text-xl mb-2">Đã nhận tin nhắn!</h3>
                <p className="text-[#9A8A6A] mb-6">Cảm ơn bạn đã liên hệ. Chúng tôi sẽ phản hồi trong vòng 2 giờ làm việc.</p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ name: "", phone: "", email: "", subject: "Tư vấn sản phẩm", message: "" }); }}
                  className="px-6 py-2 rounded-full border border-[#C9A84C40] text-[#C9A84C] text-sm hover:bg-[#C9A84C15] transition-colors"
                >
                  Gửi tin nhắn khác
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[#9A8A6A] uppercase tracking-wider mb-2 block">Họ và tên *</label>
                    <input
                      required
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Nguyễn Văn A"
                      className="w-full bg-[#1A1600] border border-[#2E2800] rounded-xl px-4 py-3 text-sm text-[#F5EDD6] placeholder-[#4A4030] focus:outline-none focus:border-[#C9A84C40] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#9A8A6A] uppercase tracking-wider mb-2 block">Số điện thoại *</label>
                    <input
                      required
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="0901 234 567"
                      className="w-full bg-[#1A1600] border border-[#2E2800] rounded-xl px-4 py-3 text-sm text-[#F5EDD6] placeholder-[#4A4030] focus:outline-none focus:border-[#C9A84C40] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[#9A8A6A] uppercase tracking-wider mb-2 block">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full bg-[#1A1600] border border-[#2E2800] rounded-xl px-4 py-3 text-sm text-[#F5EDD6] placeholder-[#4A4030] focus:outline-none focus:border-[#C9A84C40] transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#9A8A6A] uppercase tracking-wider mb-2 block">Chủ đề</label>
                  <select
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full bg-[#1A1600] border border-[#2E2800] rounded-xl px-4 py-3 text-sm text-[#F5EDD6] focus:outline-none focus:border-[#C9A84C40] transition-colors"
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
                  <label className="text-xs text-[#9A8A6A] uppercase tracking-wider mb-2 block">Nội dung *</label>
                  <textarea
                    required
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Mô tả nhu cầu hoặc câu hỏi của bạn..."
                    rows={5}
                    className="w-full bg-[#1A1600] border border-[#2E2800] rounded-xl px-4 py-3 text-sm text-[#F5EDD6] placeholder-[#4A4030] focus:outline-none focus:border-[#C9A84C40] transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#E2C97E] to-[#9A7A2E] text-[#0D0B00] font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
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
            <h2 className="font-brand text-3xl text-[#E2C97E] mb-2">Showroom</h2>
            <p className="text-sm text-[#9A8A6A] mb-8">Ghé thăm và trải nghiệm trực tiếp tại showroom gần bạn nhất.</p>

            <div className="space-y-4">
              {showrooms.map((s) => (
                <div key={s.city} className="bg-[#1A1600] border border-[#2E2800] rounded-2xl p-6 hover:border-[#C9A84C40] transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[#E2C97E] font-semibold">{s.city}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#C9A84C20] text-[#C9A84C] border border-[#C9A84C30]">
                          {s.badge}
                        </span>
                      </div>
                      <p className="text-sm text-[#9A8A6A]">📍 {s.address}</p>
                    </div>
                  </div>
                  <div className="space-y-1 mb-4">
                    <p className="text-sm text-[#9A8A6A]">📞 {s.phone}</p>
                    <p className="text-sm text-[#9A8A6A]">🕐 {s.hours}</p>
                  </div>
                  <a
                    href={s.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-[#C9A84C] hover:text-[#E2C97E] transition-colors"
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
                <p className="text-sm text-[#9A8A6A]">Bản đồ showroom SmartFurni</p>
                <a
                  href="https://maps.google.com/?q=SmartFurni+Vietnam"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#C9A84C] hover:text-[#E2C97E] transition-colors mt-1 block"
                >
                  Mở Google Maps →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6 bg-[#0F0D00] border-t border-[#2E2800]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs tracking-[0.3em] text-[#C9A84C] uppercase mb-4">FAQ</p>
            <h2 className="font-brand text-4xl text-[#E2C97E]">Câu hỏi thường gặp</h2>
          </div>
          <div className="space-y-4">
            {[
              { q: "Giường SmartFurni có bảo hành bao lâu?", a: "SmartFurni bảo hành 5 năm toàn diện cho khung giường và motor, 2 năm cho linh kiện điện tử và app." },
              { q: "Tôi có thể lắp đặt giường tự mình không?", a: "Có — bộ giường đi kèm hướng dẫn lắp đặt chi tiết. Tuy nhiên chúng tôi cũng cung cấp dịch vụ lắp đặt tận nhà miễn phí trong vòng 50km từ showroom." },
              { q: "App SmartFurni có hoạt động khi không có internet không?", a: "Có — app kết nối trực tiếp với giường qua Bluetooth, không cần internet. Chỉ cần internet để đồng bộ dữ liệu giấc ngủ lên cloud." },
              { q: "Giường có tương thích với Google Home / Apple HomeKit không?", a: "Hiện tại chúng tôi đang phát triển tích hợp với Google Home và Apple HomeKit, dự kiến ra mắt Q3 2026." },
            ].map((faq) => (
              <div key={faq.q} className="bg-[#1A1600] border border-[#2E2800] rounded-xl p-6 hover:border-[#C9A84C40] transition-colors">
                <h3 className="text-[#E2C97E] font-medium mb-2">❓ {faq.q}</h3>
                <p className="text-sm text-[#9A8A6A] leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-[#2E2800]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-[#E2C97E] to-[#9A7A2E] flex items-center justify-center text-[#0D0B00] font-bold text-xs">SF</div>
            <span className="font-brand text-[#C9A84C] tracking-widest text-xs uppercase">SmartFurni</span>
          </div>
          <p className="text-xs text-[#9A8A6A]">© 2026 SmartFurni. Nội thất thông minh Việt Nam.</p>
          <div className="flex gap-6">
            <Link href="/" className="text-xs text-[#9A8A6A] hover:text-[#C9A84C] transition-colors">Trang chủ</Link>
            <Link href="/about" className="text-xs text-[#9A8A6A] hover:text-[#C9A84C] transition-colors">Giới thiệu</Link>
            <Link href="/contact" className="text-xs text-[#9A8A6A] hover:text-[#C9A84C] transition-colors">Liên hệ</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
