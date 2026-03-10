import type { SiteTheme } from "@/lib/theme-store";

interface Props {
  theme: SiteTheme;
}

const TESTIMONIALS = [
  {
    id: 1,
    name: "Nguyễn Thị Hương",
    role: "Giám đốc Marketing",
    city: "TP. Hồ Chí Minh",
    rating: 5,
    text: "Sau 3 tháng dùng SmartFurni Pro, tôi ngủ sâu hơn hẳn. Tính năng Zero Gravity thực sự giúp giảm đau lưng sau ngày làm việc dài. Đầu tư xứng đáng!",
    product: "SmartFurni Pro",
    initials: "NH",
    color: "#C9A84C",
  },
  {
    id: 2,
    name: "Trần Văn Minh",
    role: "Kỹ sư phần mềm",
    city: "Hà Nội",
    rating: 5,
    text: "Tích hợp Apple HomeKit hoạt động cực kỳ mượt. Tôi có thể ra lệnh giọng nói cho Siri để điều chỉnh giường mà không cần chạm vào điện thoại. Công nghệ đỉnh!",
    product: "SmartFurni Elite",
    initials: "TM",
    color: "#8B7355",
  },
  {
    id: 3,
    name: "Lê Thị Thu",
    role: "Bác sĩ nội khoa",
    city: "Đà Nẵng",
    rating: 5,
    text: "Tôi khuyến nghị SmartFurni cho bệnh nhân thoái hóa cột sống. Khả năng điều chỉnh góc nằm giúp giảm áp lực đĩa đệm đáng kể. Chất lượng y tế trong tầm tay.",
    product: "SmartFurni Basic",
    initials: "LT",
    color: "#6B8E6B",
  },
  {
    id: 4,
    name: "Phạm Đức Anh",
    role: "Doanh nhân",
    city: "TP. Hồ Chí Minh",
    rating: 5,
    text: "Mua cho cả gia đình 3 chiếc. Bố mẹ 70 tuổi dùng rất thích vì nút điều khiển đơn giản. Dịch vụ lắp đặt tận nhà trong 2 giờ, chuyên nghiệp từ đầu đến cuối.",
    product: "SmartFurni Pro",
    initials: "PA",
    color: "#7B6B8E",
  },
  {
    id: 5,
    name: "Võ Thị Lan",
    role: "Giáo viên",
    city: "Cần Thơ",
    rating: 5,
    text: "Ban đầu tôi lo ngại về giá, nhưng sau khi dùng thử 30 ngày thì không muốn trả lại nữa. Giấc ngủ cải thiện rõ rệt, sáng dậy tỉnh táo hơn nhiều.",
    product: "SmartFurni Basic",
    initials: "VL",
    color: "#8E6B6B",
  },
];

export default function TestimonialsSection({ theme }: Props) {
  const { colors } = theme;

  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 border-t" style={{ borderColor: `${colors.border}40` }}>
      <div style={{ maxWidth: "1200px" }} className="mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="w-8 h-px" style={{ backgroundColor: "#C9A84C" }} />
            <span className="text-xs font-medium tracking-wider uppercase" style={{ color: "#C9A84C" }}>
              Khách hàng nói gì
            </span>
            <span className="w-8 h-px" style={{ backgroundColor: "#C9A84C" }} />
          </div>
          <h2 className="text-3xl sm:text-4xl font-light text-[#F5EDD6] mb-3">
            Hơn <span className="text-gold-gradient">10.000 khách hàng</span> tin dùng
          </h2>
          <p className="text-sm text-[#F5EDD6]/50 max-w-xl mx-auto">
            Trải nghiệm thực tế từ khách hàng trên khắp Việt Nam — từ TP. Hồ Chí Minh đến Hà Nội, Đà Nẵng và Cần Thơ.
          </p>
        </div>

        {/* Overall rating bar */}
        <div
          style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          className="rounded-2xl border p-5 mb-8 flex flex-col sm:flex-row items-center gap-6"
        >
          <div className="text-center sm:text-left flex-shrink-0">
            <p className="text-5xl font-light text-gold-gradient">4.8</p>
            <div className="flex gap-0.5 justify-center sm:justify-start mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <svg key={s} width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 1.5L9.8 5.8L14.5 6.3L11.2 9.3L12.1 14L8 11.7L3.9 14L4.8 9.3L1.5 6.3L6.2 5.8L8 1.5Z"
                    fill={s <= 5 ? "#C9A84C" : "transparent"}
                    stroke="#C9A84C"
                    strokeWidth="1"
                  />
                </svg>
              ))}
            </div>
            <p className="text-xs text-[#F5EDD6]/40 mt-1">Dựa trên 10.247 đánh giá</p>
          </div>
          <div className="flex-1 w-full space-y-2">
            {[
              { stars: 5, pct: 82 },
              { stars: 4, pct: 12 },
              { stars: 3, pct: 4 },
              { stars: 2, pct: 1 },
              { stars: 1, pct: 1 },
            ].map(({ stars, pct }) => (
              <div key={stars} className="flex items-center gap-2">
                <span className="text-xs text-[#F5EDD6]/40 w-4 text-right">{stars}</span>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="#C9A84C">
                  <path d="M5 1L6.2 3.9L9.5 4.2L7.2 6.3L7.9 9.5L5 8L2.1 9.5L2.8 6.3L0.5 4.2L3.8 3.9L5 1Z" />
                </svg>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${colors.border}` }}>
                  <div
                    style={{ width: `${pct}%`, backgroundColor: "#C9A84C" }}
                    className="h-full rounded-full"
                  />
                </div>
                <span className="text-xs text-[#F5EDD6]/40 w-8">{pct}%</span>
              </div>
            ))}
          </div>
          <div className="hidden sm:flex flex-col gap-2 flex-shrink-0">
            {["Chất lượng sản phẩm", "Dịch vụ lắp đặt", "Ứng dụng điều khiển", "Hỗ trợ sau bán"].map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-xs text-[#F5EDD6]/50 w-36 text-right">{label}</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg key={s} width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M5 1L6.2 3.9L9.5 4.2L7.2 6.3L7.9 9.5L5 8L2.1 9.5L2.8 6.3L0.5 4.2L3.8 3.9L5 1Z"
                        fill={s <= [5, 5, 4, 5][i] ? "#C9A84C" : "transparent"}
                        stroke="#C9A84C"
                        strokeWidth="0.7"
                      />
                    </svg>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial cards — 2 rows, scrollable on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.id}
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              className="rounded-2xl border p-5 flex flex-col gap-4 hover:border-[#C9A84C]/30 transition-colors duration-200"
            >
              {/* Stars */}
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <svg key={s} width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path
                      d="M6.5 1L7.9 4.7L12 5.1L9.1 7.8L9.9 12L6.5 10.1L3.1 12L3.9 7.8L1 5.1L5.1 4.7L6.5 1Z"
                      fill={s <= t.rating ? "#C9A84C" : "transparent"}
                      stroke="#C9A84C"
                      strokeWidth="0.8"
                    />
                  </svg>
                ))}
              </div>

              {/* Quote */}
              <p className="text-sm text-[#F5EDD6]/60 leading-relaxed flex-1">
                &ldquo;{t.text}&rdquo;
              </p>

              {/* Product badge */}
              <span
                style={{ backgroundColor: `${colors.primary}15`, color: colors.primary, borderColor: `${colors.primary}25` }}
                className="text-xs px-2.5 py-1 rounded-full border w-fit"
              >
                {t.product}
              </span>

              {/* Author */}
              <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: `${colors.border}50` }}>
                <div
                  style={{ backgroundColor: t.color, color: "#fff" }}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                >
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#F5EDD6]">{t.name}</p>
                  <p className="text-xs text-[#F5EDD6]/40">{t.role} · {t.city}</p>
                </div>
                <svg className="ml-auto flex-shrink-0" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 7C3 5.3 4.3 4 6 4h1.5L6 8H8v5H3V7zm9 0c0-1.7 1.3-3 3-3h1.5L15 8h2v5h-5V7z"
                    fill="#C9A84C" opacity="0.2" />
                </svg>
              </div>
            </div>
          ))}
        </div>

        {/* Trust logos */}
        <div className="mt-10 pt-8 border-t" style={{ borderColor: `${colors.border}30` }}>
          <p className="text-center text-xs text-[#F5EDD6]/30 mb-5 uppercase tracking-wider">Được tin dùng bởi</p>
          <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-10">
            {["Vingroup", "FPT", "Masan", "VinHomes", "Techcombank"].map((brand) => (
              <span key={brand} className="text-sm font-semibold text-[#F5EDD6]/20 tracking-wider uppercase">
                {brand}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
