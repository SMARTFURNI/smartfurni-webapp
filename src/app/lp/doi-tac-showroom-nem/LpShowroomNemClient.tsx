"use client";

import { useState, useEffect, useRef } from "react";
import type { CrmProduct } from "@/lib/crm-types";
import Image from "next/image";

// ─── Color tokens ─────────────────────────────────────────────────────────────
const C = {
  bg: "#080600",
  surface: "#0F0C00",
  surface2: "#1A1500",
  gold: "#C9A84C",
  goldLight: "#E2C97E",
  goldDim: "rgba(201,168,76,0.15)",
  goldBorder: "rgba(201,168,76,0.25)",
  text: "#F5EDD6",
  textMuted: "rgba(245,237,214,0.55)",
  textDim: "rgba(245,237,214,0.35)",
  white: "#FFFFFF",
  green: "#22C55E",
  greenDim: "rgba(34,197,94,0.12)",
};

interface Props {
  products: CrmProduct[];
}

const PROVINCES = [
  "TP. Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Cần Thơ", "Hải Phòng",
  "Bình Dương", "Đồng Nai", "Long An", "Bà Rịa - Vũng Tàu", "Tiền Giang",
  "Khánh Hòa", "Lâm Đồng", "Đắk Lắk", "Gia Lai", "Bình Định",
  "Quảng Nam", "Thừa Thiên Huế", "Nghệ An", "Thanh Hóa", "Hải Dương",
  "Bắc Ninh", "Hưng Yên", "Thái Bình", "Nam Định", "Ninh Bình",
  "Quảng Ninh", "Lạng Sơn", "Bắc Giang", "Thái Nguyên", "Vĩnh Phúc",
  "Tỉnh khác",
];

const BENEFITS = [
  {
    icon: "💰",
    title: "Biên lợi nhuận cao",
    desc: "Chiết khấu đại lý hấp dẫn, tăng theo sản lượng. Sản phẩm cao cấp — khách hàng sẵn sàng chi trả.",
  },
  {
    icon: "🏪",
    title: "Hỗ trợ trưng bày showroom",
    desc: "SmartFurni hỗ trợ 1 sản phẩm demo tại showroom, thiết kế không gian trưng bày chuyên nghiệp.",
  },
  {
    icon: "📚",
    title: "Đào tạo bán hàng",
    desc: "Chương trình đào tạo nhân viên bán hàng, tài liệu kỹ thuật, video demo sản phẩm đầy đủ.",
  },
  {
    icon: "🚚",
    title: "Giao hàng & lắp đặt",
    desc: "SmartFurni đảm nhận toàn bộ logistics, lắp đặt tại nhà khách hàng. Đối tác không cần lo.",
  },
  {
    icon: "🛡️",
    title: "Bảo hành chính hãng",
    desc: "Bảo hành 3 năm khung giường, 2 năm động cơ điện. Đội kỹ thuật hỗ trợ 24/7.",
  },
  {
    icon: "📊",
    title: "Hỗ trợ marketing",
    desc: "Cung cấp ảnh, video, nội dung quảng cáo sẵn sàng. Hỗ trợ chạy ads Facebook, Google cùng đối tác.",
  },
];

const STEPS = [
  { num: "01", title: "Đăng ký tư vấn", desc: "Điền form bên dưới — đội ngũ SmartFurni liên hệ trong 2 giờ làm việc" },
  { num: "02", title: "Tư vấn & ký kết", desc: "Gặp gỡ trực tiếp hoặc online, thống nhất điều khoản hợp tác đại lý" },
  { num: "03", title: "Nhận demo & đào tạo", desc: "SmartFurni bàn giao sản phẩm demo, đào tạo đội ngũ bán hàng tại showroom" },
  { num: "04", title: "Bắt đầu kinh doanh", desc: "Tiếp nhận đơn hàng, SmartFurni giao hàng & lắp đặt — đối tác nhận hoa hồng" },
];

const TESTIMONIALS = [
  {
    name: "Anh Minh Tuấn",
    role: "Chủ Showroom Nệm Thiên Phú, Bình Dương",
    content:
      "Từ khi đưa giường điều chỉnh điện SmartFurni vào showroom, doanh thu tăng 35%. Khách hàng rất ấn tượng với sản phẩm, tỷ lệ chốt đơn cao hơn hẳn.",
    avatar: "MT",
  },
  {
    name: "Chị Lan Phương",
    role: "Chủ Showroom Chăn Ga Gối Hoa Lý, Long An",
    content:
      "SmartFurni hỗ trợ rất tốt từ trưng bày đến bán hàng. Sản phẩm chất lượng cao, khách hàng tin tưởng, ít phát sinh bảo hành.",
    avatar: "LP",
  },
  {
    name: "Anh Đức Thành",
    role: "Chủ Chuỗi Nội Thất Đức Thành, Đồng Nai",
    content:
      "Biên lợi nhuận tốt, chính sách đại lý rõ ràng. Đặc biệt SmartFurni lo toàn bộ lắp đặt nên showroom không cần đội kỹ thuật riêng.",
    avatar: "ĐT",
  },
];

function formatPrice(price: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
}

function ProductCard({ product }: { product: CrmProduct }) {
  const [imgError, setImgError] = useState(false);
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${C.surface2} 0%, ${C.surface} 100%)`,
        border: `1px solid ${C.goldBorder}`,
        borderRadius: 16,
        overflow: "hidden",
        transition: "transform 0.2s, box-shadow 0.2s",
      }}
      className="hover:scale-[1.02] hover:shadow-2xl"
    >
      {/* Product image */}
      <div style={{ position: "relative", width: "100%", paddingTop: "66.67%", background: C.surface }}>
        {product.imageUrl && !imgError ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            style={{ objectFit: "cover" }}
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: C.textDim, fontSize: 48,
            }}
          >
            🛏️
          </div>
        )}
        {/* Badge */}
        <div
          style={{
            position: "absolute", top: 12, left: 12,
            background: C.gold, color: C.bg,
            padding: "4px 10px", borderRadius: 20,
            fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
          }}
        >
          GIƯỜNG ĐIỀU CHỈNH ĐIỆN
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "20px 24px 24px" }}>
        <p style={{ color: C.gold, fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", marginBottom: 6 }}>
          {product.sku}
        </p>
        <h3 style={{ color: C.text, fontSize: 18, fontWeight: 700, marginBottom: 10, lineHeight: 1.3 }}>
          {product.name}
        </h3>
        {product.description && (
          <p style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
            {product.description.slice(0, 120)}{product.description.length > 120 ? "..." : ""}
          </p>
        )}

        {/* Specs */}
        {product.specs && Object.keys(product.specs).length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {Object.entries(product.specs).slice(0, 4).map(([key, val]) => (
              <div
                key={key}
                style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "6px 0",
                  borderBottom: `1px solid ${C.goldBorder}`,
                  fontSize: 12,
                }}
              >
                <span style={{ color: C.textMuted }}>{key}</span>
                <span style={{ color: C.text, fontWeight: 600 }}>{val}</span>
              </div>
            ))}
          </div>
        )}

        {/* Price */}
        <div
          style={{
            background: C.goldDim,
            border: `1px solid ${C.goldBorder}`,
            borderRadius: 10,
            padding: "12px 16px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}
        >
          <div>
            <p style={{ color: C.textDim, fontSize: 11, marginBottom: 2 }}>Giá đại lý từ</p>
            <p style={{ color: C.gold, fontSize: 20, fontWeight: 800 }}>
              {formatPrice(product.basePrice * 0.7)}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: C.textDim, fontSize: 11, marginBottom: 2 }}>Giá bán lẻ</p>
            <p style={{ color: C.textMuted, fontSize: 14, fontWeight: 600, textDecoration: "line-through" }}>
              {formatPrice(product.basePrice)}
            </p>
          </div>
        </div>

        {/* Discount tiers */}
        {product.discountTiers && product.discountTiers.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <p style={{ color: C.textDim, fontSize: 11, marginBottom: 6 }}>Chiết khấu theo sản lượng:</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {product.discountTiers.map((tier, i) => (
                <span
                  key={i}
                  style={{
                    background: C.greenDim,
                    border: "1px solid rgba(34,197,94,0.3)",
                    color: C.green,
                    padding: "3px 8px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {tier.label || `≥${tier.minQty} cái: -${tier.discountPct}%`}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LeadForm() {
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    showroomName: "",
    province: "",
    businessType: "Chủ Showroom Nệm",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  // Lấy UTM từ URL
  const [utms, setUtms] = useState<Record<string, string>>({});
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setUtms({
      utmSource: params.get("utm_source") || "",
      utmMedium: params.get("utm_medium") || "",
      utmCampaign: params.get("utm_campaign") || "",
      utmContent: params.get("utm_content") || "",
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim() || !form.phone.trim()) {
      setError("Vui lòng nhập họ tên và số điện thoại");
      return;
    }
    if (!/^(0|\+84)[0-9]{8,10}$/.test(form.phone.replace(/\s/g, ""))) {
      setError("Số điện thoại không hợp lệ");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/lp/submit-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ...utms, landingPage: "doi-tac-showroom-nem" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Có lỗi xảy ra");
      }
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(255,255,255,0.05)",
    border: `1px solid ${C.goldBorder}`,
    borderRadius: 10,
    padding: "12px 16px",
    color: C.text,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    color: C.textMuted,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.05em",
    marginBottom: 6,
    display: "block",
  };

  if (success) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "48px 32px",
          background: C.greenDim,
          border: "1px solid rgba(34,197,94,0.3)",
          borderRadius: 16,
        }}
      >
        <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
        <h3 style={{ color: C.text, fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
          Đăng ký thành công!
        </h3>
        <p style={{ color: C.textMuted, fontSize: 15, lineHeight: 1.6 }}>
          Cảm ơn <strong style={{ color: C.text }}>{form.fullName}</strong>! Đội ngũ SmartFurni sẽ liên hệ với bạn qua số{" "}
          <strong style={{ color: C.gold }}>{form.phone}</strong> trong vòng{" "}
          <strong style={{ color: C.text }}>2 giờ làm việc</strong>.
        </p>
        <div
          style={{
            marginTop: 24,
            padding: "16px",
            background: C.goldDim,
            border: `1px solid ${C.goldBorder}`,
            borderRadius: 10,
          }}
        >
          <p style={{ color: C.gold, fontSize: 13, fontWeight: 600 }}>
            📞 Hotline hỗ trợ ngay: 028.7122.0818
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={formRef}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>HỌ VÀ TÊN *</label>
            <input
              style={inputStyle}
              placeholder="Nguyễn Văn A"
              value={form.fullName}
              onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>SỐ ĐIỆN THOẠI *</label>
            <input
              style={inputStyle}
              placeholder="0912 345 678"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              required
              type="tel"
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>TÊN SHOWROOM / CỬA HÀNG</label>
          <input
            style={inputStyle}
            placeholder="Showroom Nệm ABC"
            value={form.showroomName}
            onChange={e => setForm(f => ({ ...f, showroomName: e.target.value }))}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>LOẠI HÌNH KINH DOANH</label>
            <select
              style={{ ...inputStyle, cursor: "pointer" }}
              value={form.businessType}
              onChange={e => setForm(f => ({ ...f, businessType: e.target.value }))}
            >
              <option value="Chủ Showroom Nệm">Showroom Nệm</option>
              <option value="Chủ Showroom Chăn Ga Gối">Showroom Chăn Ga Gối</option>
              <option value="Chuỗi Nội Thất">Chuỗi Nội Thất</option>
              <option value="Đại lý Nội Thất">Đại lý Nội Thất</option>
              <option value="Khác">Khác</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>TỈNH / THÀNH PHỐ</label>
            <select
              style={{ ...inputStyle, cursor: "pointer" }}
              value={form.province}
              onChange={e => setForm(f => ({ ...f, province: e.target.value }))}
            >
              <option value="">Chọn tỉnh/thành phố</option>
              {PROVINCES.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label style={labelStyle}>EMAIL (TÙY CHỌN)</label>
          <input
            style={inputStyle}
            placeholder="email@showroom.com"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            type="email"
          />
        </div>

        <div>
          <label style={labelStyle}>NHU CẦU / GHI CHÚ</label>
          <textarea
            style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
            placeholder="Mô tả nhu cầu hợp tác, quy mô showroom, câu hỏi..."
            value={form.message}
            onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
          />
        </div>

        {error && (
          <p style={{ color: "#F87171", fontSize: 13, padding: "8px 12px", background: "rgba(239,68,68,0.1)", borderRadius: 8 }}>
            ⚠️ {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            background: loading ? "rgba(201,168,76,0.4)" : `linear-gradient(135deg, ${C.gold} 0%, ${C.goldLight} 100%)`,
            color: C.bg,
            border: "none",
            borderRadius: 12,
            padding: "16px 32px",
            fontSize: 16,
            fontWeight: 800,
            cursor: loading ? "not-allowed" : "pointer",
            letterSpacing: "0.05em",
            transition: "all 0.2s",
            width: "100%",
          }}
        >
          {loading ? "⏳ Đang gửi..." : "🤝 ĐĂNG KÝ HỢP TÁC NGAY"}
        </button>

        <p style={{ color: C.textDim, fontSize: 11, textAlign: "center" }}>
          🔒 Thông tin được bảo mật tuyệt đối. Không spam.
        </p>
      </form>
    </div>
  );
}

export default function LpShowroomNemClient({ products }: Props) {
  function scrollToForm() {
    document.getElementById("dang-ky-hop-tac")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'Inter', sans-serif" }}>

      {/* ── HEADER ── */}
      <header
        style={{
          position: "sticky", top: 0, zIndex: 100,
          background: "rgba(8,6,0,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${C.goldBorder}`,
          padding: "14px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: 8,
              background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldLight} 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 900, fontSize: 16, color: C.bg,
            }}
          >
            SF
          </div>
          <div>
            <p style={{ color: C.text, fontWeight: 700, fontSize: 15, lineHeight: 1 }}>SMARTFURNI</p>
            <p style={{ color: C.gold, fontSize: 10, letterSpacing: "0.1em" }}>CHƯƠNG TRÌNH ĐỐI TÁC B2B</p>
          </div>
        </div>
        <button
          onClick={scrollToForm}
          style={{
            background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldLight} 100%)`,
            color: C.bg, border: "none", borderRadius: 8,
            padding: "8px 18px", fontSize: 13, fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Đăng ký ngay
        </button>
      </header>

      {/* ── HERO ── */}
      <section
        style={{
          padding: "80px 24px 72px",
          textAlign: "center",
          background: `linear-gradient(180deg, #0F0C00 0%, ${C.bg} 100%)`,
          position: "relative", overflow: "hidden",
        }}
      >
        {/* Decorative glow */}
        <div
          style={{
            position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)",
            width: 600, height: 400,
            background: "radial-gradient(ellipse, rgba(201,168,76,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ maxWidth: 800, margin: "0 auto", position: "relative" }}>
          {/* Badge */}
          <div
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: C.goldDim, border: `1px solid ${C.goldBorder}`,
              borderRadius: 20, padding: "6px 16px", marginBottom: 28,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.gold, display: "inline-block" }} />
            <span style={{ color: C.gold, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em" }}>
              CHƯƠNG TRÌNH ĐỐI TÁC PHÂN PHỐI ĐỘC QUYỀN 2025
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(28px, 5vw, 52px)",
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: 20,
              background: `linear-gradient(135deg, ${C.text} 0%, ${C.goldLight} 60%, ${C.gold} 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Mở rộng doanh thu showroom với<br />
            Giường Công Thái Học<br />
            Điều Chỉnh Điện SmartFurni
          </h1>

          <p
            style={{
              color: C.textMuted, fontSize: "clamp(15px, 2vw, 18px)",
              lineHeight: 1.7, marginBottom: 36, maxWidth: 600, margin: "0 auto 36px",
            }}
          >
            Dành riêng cho chủ Showroom Nệm & Chăn Ga Gối — Đưa sản phẩm cao cấp vào danh mục,
            tăng giá trị đơn hàng, hưởng chiết khấu đại lý hấp dẫn.
          </p>

          {/* Stats row */}
          <div
            style={{
              display: "flex", justifyContent: "center", gap: 40, flexWrap: "wrap",
              marginBottom: 40,
            }}
          >
            {[
              { val: "30–45%", label: "Biên lợi nhuận" },
              { val: "3 năm", label: "Bảo hành khung" },
              { val: "200+", label: "Đối tác toàn quốc" },
              { val: "2 giờ", label: "Phản hồi tư vấn" },
            ].map(s => (
              <div key={s.val} style={{ textAlign: "center" }}>
                <p style={{ color: C.gold, fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{s.val}</p>
                <p style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>{s.label}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={scrollToForm}
              style={{
                background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldLight} 100%)`,
                color: C.bg, border: "none", borderRadius: 12,
                padding: "16px 36px", fontSize: 16, fontWeight: 800,
                cursor: "pointer", letterSpacing: "0.03em",
              }}
            >
              🤝 Đăng ký hợp tác ngay
            </button>
            <a
              href="tel:02871220818"
              style={{
                background: "transparent",
                color: C.text,
                border: `1px solid ${C.goldBorder}`,
                borderRadius: 12,
                padding: "16px 28px", fontSize: 15, fontWeight: 600,
                cursor: "pointer", textDecoration: "none",
                display: "inline-flex", alignItems: "center", gap: 8,
              }}
            >
              📞 028.7122.0818
            </a>
          </div>
        </div>
      </section>

      {/* ── WHY PARTNER ── */}
      <section style={{ padding: "72px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <p style={{ color: C.gold, fontSize: 12, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 12 }}>
            TẠI SAO NÊN HỢP TÁC
          </p>
          <h2 style={{ color: C.text, fontSize: "clamp(22px, 3.5vw, 36px)", fontWeight: 800, lineHeight: 1.2 }}>
            6 lý do chủ showroom nệm<br />chọn SmartFurni làm đối tác
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 20,
          }}
        >
          {BENEFITS.map((b, i) => (
            <div
              key={i}
              style={{
                background: C.surface2,
                border: `1px solid ${C.goldBorder}`,
                borderRadius: 14,
                padding: "24px 28px",
                display: "flex", gap: 16, alignItems: "flex-start",
              }}
            >
              <span style={{ fontSize: 32, flexShrink: 0 }}>{b.icon}</span>
              <div>
                <h3 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{b.title}</h3>
                <p style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.6 }}>{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRODUCTS ── */}
      {products.length > 0 && (
        <section
          style={{
            padding: "72px 24px",
            background: `linear-gradient(180deg, ${C.bg} 0%, ${C.surface} 50%, ${C.bg} 100%)`,
          }}
        >
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <p style={{ color: C.gold, fontSize: 12, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 12 }}>
                DÒNG SẢN PHẨM ĐỐI TÁC
              </p>
              <h2 style={{ color: C.text, fontSize: "clamp(22px, 3.5vw, 36px)", fontWeight: 800, lineHeight: 1.2 }}>
                Giường Công Thái Học Điều Chỉnh Điện
              </h2>
              <p style={{ color: C.textMuted, fontSize: 15, marginTop: 12, maxWidth: 500, margin: "12px auto 0" }}>
                Dòng sản phẩm cao cấp phù hợp với phân khúc khách hàng showroom nệm, chăn ga gối
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 24,
              }}
            >
              {products.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>

            {/* Fallback nếu chưa có sản phẩm ergonomic_bed */}
            {products.length === 0 && (
              <div
                style={{
                  textAlign: "center", padding: "48px",
                  border: `1px dashed ${C.goldBorder}`, borderRadius: 16,
                  color: C.textMuted,
                }}
              >
                <p style={{ fontSize: 40, marginBottom: 12 }}>🛏️</p>
                <p>Danh mục sản phẩm đang được cập nhật. Liên hệ hotline để xem catalogue đầy đủ.</p>
              </div>
            )}

            <div style={{ textAlign: "center", marginTop: 36 }}>
              <button
                onClick={scrollToForm}
                style={{
                  background: C.goldDim, border: `1px solid ${C.goldBorder}`,
                  color: C.gold, borderRadius: 10, padding: "12px 28px",
                  fontSize: 14, fontWeight: 700, cursor: "pointer",
                }}
              >
                Nhận báo giá đại lý đầy đủ →
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: "72px 24px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <p style={{ color: C.gold, fontSize: 12, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 12 }}>
            QUY TRÌNH HỢP TÁC
          </p>
          <h2 style={{ color: C.text, fontSize: "clamp(22px, 3.5vw, 36px)", fontWeight: 800 }}>
            4 bước để bắt đầu kinh doanh
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {STEPS.map((step, i) => (
            <div
              key={i}
              style={{
                display: "flex", gap: 24, alignItems: "flex-start",
                paddingBottom: i < STEPS.length - 1 ? 32 : 0,
                position: "relative",
              }}
            >
              {/* Line connector */}
              {i < STEPS.length - 1 && (
                <div
                  style={{
                    position: "absolute", left: 27, top: 56,
                    width: 2, height: "calc(100% - 24px)",
                    background: `linear-gradient(180deg, ${C.gold} 0%, transparent 100%)`,
                    opacity: 0.3,
                  }}
                />
              )}
              {/* Number */}
              <div
                style={{
                  width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
                  background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldLight} 100%)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: C.bg, fontWeight: 900, fontSize: 18,
                }}
              >
                {step.num}
              </div>
              <div style={{ paddingTop: 8 }}>
                <h3 style={{ color: C.text, fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{step.title}</h3>
                <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section
        style={{
          padding: "72px 24px",
          background: C.surface,
          borderTop: `1px solid ${C.goldBorder}`,
          borderBottom: `1px solid ${C.goldBorder}`,
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{ color: C.gold, fontSize: 12, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 12 }}>
              ĐỐI TÁC NÓI GÌ
            </p>
            <h2 style={{ color: C.text, fontSize: "clamp(22px, 3.5vw, 36px)", fontWeight: 800 }}>
              Đối tác tin tưởng SmartFurni
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                style={{
                  background: C.surface2,
                  border: `1px solid ${C.goldBorder}`,
                  borderRadius: 14,
                  padding: "28px",
                }}
              >
                <p style={{ color: C.gold, fontSize: 24, marginBottom: 12 }}>"</p>
                <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.7, marginBottom: 20, fontStyle: "italic" }}>
                  {t.content}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 40, height: 40, borderRadius: "50%",
                      background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldLight} 100%)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: C.bg, fontWeight: 800, fontSize: 13,
                    }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <p style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>{t.name}</p>
                    <p style={{ color: C.textDim, fontSize: 12 }}>{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LEAD FORM ── */}
      <section
        id="dang-ky-hop-tac"
        style={{
          padding: "80px 24px",
          background: `linear-gradient(180deg, ${C.bg} 0%, #0F0C00 100%)`,
        }}
      >
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          {/* Form header */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <p style={{ color: C.gold, fontSize: 12, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 12 }}>
              ĐĂNG KÝ HỢP TÁC
            </p>
            <h2 style={{ color: C.text, fontSize: "clamp(22px, 3.5vw, 36px)", fontWeight: 800, marginBottom: 12 }}>
              Trở thành đối tác SmartFurni
            </h2>
            <p style={{ color: C.textMuted, fontSize: 15, lineHeight: 1.6 }}>
              Điền thông tin bên dưới — đội ngũ tư vấn sẽ liên hệ trong <strong style={{ color: C.text }}>2 giờ làm việc</strong>
            </p>
          </div>

          {/* Form card */}
          <div
            style={{
              background: C.surface2,
              border: `1px solid ${C.goldBorder}`,
              borderRadius: 20,
              padding: "36px",
              boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
            }}
          >
            <LeadForm />
          </div>

          {/* Trust badges */}
          <div
            style={{
              display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap",
              marginTop: 32,
            }}
          >
            {[
              "✅ Phản hồi trong 2 giờ",
              "🔒 Bảo mật thông tin",
              "🤝 Không ràng buộc",
            ].map(b => (
              <span key={b} style={{ color: C.textMuted, fontSize: 13 }}>{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        style={{
          background: C.surface,
          borderTop: `1px solid ${C.goldBorder}`,
          padding: "40px 24px",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 32, marginBottom: 32 }}>
            <div>
              <p style={{ color: C.gold, fontWeight: 800, fontSize: 16, marginBottom: 12 }}>SMARTFURNI</p>
              <p style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.7 }}>
                Công ty Cổ phần SmartFurni — Chuyên sản xuất và phân phối Giường Công Thái Học Điều Chỉnh Điện cao cấp.
              </p>
            </div>
            <div>
              <p style={{ color: C.text, fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Showroom & Xưởng</p>
              {[
                "📍 HCM: 74 Nguyễn Thị Nhung, KĐT Vạn Phúc, TP. Thủ Đức",
                "📍 HN: B46-29, KĐT Geleximco B, Lê Trọng Tấn, Hà Đông",
                "🏭 Xưởng: 202 Nguyễn Thị Sáng, Đông Thạnh, Hóc Môn, HCM",
              ].map(a => (
                <p key={a} style={{ color: C.textMuted, fontSize: 12, lineHeight: 1.7 }}>{a}</p>
              ))}
            </div>
            <div>
              <p style={{ color: C.text, fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Liên hệ</p>
              {[
                { icon: "📞", text: "028.7122.0818", href: "tel:02871220818" },
                { icon: "💬", text: "Zalo: 0918.326.552", href: "https://zalo.me/0918326552" },
                { icon: "🌐", text: "smartfurni.vn", href: "https://smartfurni.vn" },
              ].map(c => (
                <a
                  key={c.text}
                  href={c.href}
                  style={{ display: "block", color: C.gold, fontSize: 13, lineHeight: 1.8, textDecoration: "none" }}
                >
                  {c.icon} {c.text}
                </a>
              ))}
            </div>
          </div>

          <div
            style={{
              borderTop: `1px solid ${C.goldBorder}`,
              paddingTop: 20,
              display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
            }}
          >
            <p style={{ color: C.textDim, fontSize: 12 }}>
              © 2025 Công ty Cổ phần SmartFurni. Bảo lưu mọi quyền.
            </p>
            <p style={{ color: C.textDim, fontSize: 12 }}>
              Chương trình đối tác B2B — Dành riêng cho Showroom Nệm & Chăn Ga Gối
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
