"use client";

import Link from "next/link";
import { ScrollReveal } from "./ScrollReveal";
import { SvgIcon } from "@/components/ui/SvgIcon";
import type { SiteTheme } from "@/lib/theme-store";

interface Props { theme: SiteTheme; }

const AUDIENCES = [
  { icon: "heart", title: "Người thường mỏi lưng, mỏi vai gáy", desc: "Đổi góc nằm để lưng, vai và đầu gối được nâng đỡ dễ chịu hơn sau một ngày dài." },
  { icon: "user", title: "Người lớn tuổi", desc: "Remote vật lý dễ bấm, đổi tư thế nhẹ nhàng và không cần kê nhiều gối." },
  { icon: "book", title: "Người đọc sách, xem phim tại giường", desc: "Lưu sẵn góc tựa lưng yêu thích, đổi tư thế chỉ với một chạm." },
  { icon: "hospital", title: "Gia đình cần chăm sóc tại nhà", desc: "Điều chỉnh đầu và chân độc lập, thuận tiện khi nghỉ ngơi hoặc hỗ trợ sinh hoạt." },
  { icon: "home", title: "Gia đình hiện đại", desc: "Thiết kế gọn, nhiều kích thước, dễ phối với phòng ngủ chung cư và nhà phố." },
  { icon: "hotel", title: "Khách sạn, showroom, căn hộ dịch vụ", desc: "Tạo điểm khác biệt trải nghiệm ngủ cao cấp cho khách hàng và đối tác." },
];

const SPECS = [
  ["Kích thước phổ biến", "1m6 x 2m, 1m8 x 2m, tùy chỉnh theo dự án"],
  ["Góc nâng đầu", "0-70 độ, điều chỉnh mượt từng cấp"],
  ["Góc nâng chân", "0-45 độ, hỗ trợ đổi tư thế nghỉ ngơi"],
  ["Tải trọng khuyến nghị", "Tối đa 300 kg tùy phiên bản khung"],
  ["Motor", "Motor điện vận hành êm, kiểm định nâng hạ cường độ cao"],
  ["Điều khiển", "Remote không dây, ứng dụng di động, preset tư thế"],
  ["Tương thích nệm", "Phù hợp nệm foam, latex, hybrid có độ linh hoạt tốt"],
  ["Nguồn điện", "Điện gia dụng, có tùy chọn pin dự phòng theo dòng sản phẩm"],
];

const PROCESS = [
  { step: "01", title: "Tư vấn nhu cầu", desc: "Chia sẻ kích thước phòng, ngân sách và thói quen sử dụng." },
  { step: "02", title: "Chọn mẫu phù hợp", desc: "Đề xuất phiên bản, kích thước, màu sắc và phụ kiện đi kèm." },
  { step: "03", title: "Giao & lắp đặt", desc: "Kỹ thuật viên lắp tận nhà, cân chỉnh và kiểm tra vận hành." },
  { step: "04", title: "Hướng dẫn & hậu mãi", desc: "Hướng dẫn remote/app, kích hoạt bảo hành và hỗ trợ sau bán." },
];

const SHOWROOMS = [
  { city: "TP. HCM", address: "74 Nguyễn Thị Nhung, KĐT Vạn Phúc City, TP. Thủ Đức" },
  { city: "Hà Nội", address: "B9-LK4, KĐT Geleximco B, Lê Trọng Tấn, Q. Hà Đông" },
  { city: "Xưởng sản xuất", address: "202 Nguyễn Thị Sáng, X. Đông Thạnh, H. Hóc Môn" },
];

const AFTER_SALES = [
  { icon: "shield", title: "Bảo hành 5 năm toàn diện", desc: "Khung, motor và linh kiện điện được hỗ trợ theo chính sách SmartFurni." },
  { icon: "refresh", title: "30 ngày đổi trả", desc: "Dùng thử tại nhà, đổi trả khi sản phẩm không phù hợp theo điều kiện chính sách." },
  { icon: "tool", title: "Kỹ thuật tận nơi", desc: "Đội ngũ kỹ thuật hỗ trợ kiểm tra, cân chỉnh và hướng dẫn sử dụng." },
  { icon: "phone-call", title: "Hỗ trợ 24/7", desc: "Tư vấn nhanh qua hotline, Zalo và các kênh chăm sóc khách hàng." },
];

const TRUST = [
  { value: "10.000+", label: "khách hàng đã trải nghiệm" },
  { value: "4.8/5", label: "điểm đánh giá trung bình" },
  { value: "50.000", label: "lần kiểm định nâng hạ motor" },
  { value: "2 giờ", label: "lắp đặt và hướng dẫn tại nhà" },
];

const PAYMENTS = [
  { icon: "credit-card", title: "Trả góp qua thẻ", desc: "Tư vấn phương án trả góp theo ngân sách và hạn mức thẻ." },
  { icon: "bank", title: "Chuyển khoản", desc: "Thanh toán minh bạch, hỗ trợ xuất hóa đơn cho khách cá nhân/doanh nghiệp." },
  { icon: "cash", title: "Đặt cọc linh hoạt", desc: "Giữ lịch giao lắp và hoàn tất phần còn lại khi nghiệm thu." },
  { icon: "file-text", title: "Báo giá B2B", desc: "Chính sách riêng cho showroom, khách sạn, căn hộ dịch vụ và dự án." },
];

const FAQS = [
  ["Mất điện có dùng được không?", "Giường vẫn giữ nguyên tư thế hiện tại. Một số phiên bản có tùy chọn pin dự phòng để đưa giường về vị trí nằm phẳng."],
  ["Giường có ồn khi nâng hạ không?", "Motor được tối ưu để vận hành êm trong phòng ngủ. Kỹ thuật viên sẽ cân chỉnh khi lắp đặt để hạn chế rung lắc."],
  ["Có dùng được nệm hiện tại không?", "Có thể dùng nếu nệm đủ linh hoạt. Đội ngũ tư vấn sẽ kiểm tra loại nệm, độ dày và kích thước trước khi chốt cấu hình."],
  ["Người lớn tuổi có dễ dùng không?", "Có. Remote vật lý có nút rõ ràng, có thể lưu tư thế quen thuộc để thao tác nhanh mỗi ngày."],
  ["Nhà chung cư có lắp được không?", "Có. SmartFurni hỗ trợ khảo sát lối vận chuyển, thang máy và vị trí lắp để giao hàng thuận lợi."],
  ["Bao lâu thì được giao và lắp?", "Thời gian tùy khu vực và phiên bản, thường được xác nhận khi tư vấn. Kỹ thuật viên lắp đặt và hướng dẫn sử dụng tại nhà."],
];

function SectionHeader({
  badge,
  title,
  accent,
  subtitle,
  primary,
  textColor,
}: {
  badge: string;
  title: string;
  accent: string;
  subtitle: string;
  primary: string;
  textColor: string;
}) {
  return (
    <ScrollReveal variant="fadeUp" delay={0}>
      <div className="text-center mb-9 sm:mb-12">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-4"
          style={{ borderColor: `${primary}30`, backgroundColor: `${primary}08` }}
        >
          <span style={{ color: primary }} className="text-[11px] font-medium tracking-widest uppercase">{badge}</span>
        </div>
        <h2 className="leading-tight">
          <span className="block font-light" style={{ fontSize: "clamp(24px, 3vw, 40px)", color: textColor }}>{title}</span>
          <span className="block font-light" style={{ fontSize: "clamp(24px, 3vw, 40px)", color: primary }}>{accent}</span>
        </h2>
        <p className="mt-3 text-sm max-w-2xl mx-auto leading-relaxed" style={{ color: `${textColor}55` }}>{subtitle}</p>
      </div>
    </ScrollReveal>
  );
}

export default function HomeDecisionSections({ theme }: Props) {
  const homepageSections = theme.homepageSections;
  const audiencesSection = homepageSections?.audiences;
  const specsSection = homepageSections?.specs;
  const processSection = homepageSections?.buyingProcess;
  const showroomsSection = homepageSections?.showrooms;
  const afterSalesSection = homepageSections?.afterSales;
  const proofStatsSection = homepageSections?.proofStats;
  const paymentsSection = homepageSections?.payments;
  const faqSection = homepageSections?.faq;

  const audienceItems = audiencesSection?.items?.length ? audiencesSection.items : AUDIENCES;
  const specItems = specsSection?.items?.length ? specsSection.items : SPECS.map(([title, desc]) => ({ title, desc }));
  const processItems = processSection?.items?.length ? processSection.items : PROCESS.map((item) => ({ icon: item.step, title: item.title, desc: item.desc }));
  const showroomItems = showroomsSection?.items?.length ? showroomsSection.items : SHOWROOMS.map((item) => ({ icon: "map-pin", title: item.city, desc: item.address }));
  const afterSalesItems = afterSalesSection?.items?.length ? afterSalesSection.items : AFTER_SALES;
  const proofStatItems = proofStatsSection?.items?.length ? proofStatsSection.items : TRUST.map((item) => ({ icon: item.value, title: item.value, desc: item.label }));
  const paymentItems = paymentsSection?.items?.length ? paymentsSection.items : PAYMENTS;
  const faqItems = faqSection?.items?.length ? faqSection.items : FAQS.map(([title, desc]) => ({ icon: "?", title, desc }));

  const primary = theme?.colors.primary ?? "#C9A84C";
  const secondary = theme?.colors.secondary ?? "#9A7A2E";
  const textColor = theme?.colors.text ?? "#F5EDD6";
  const borderColor = theme?.colors.border ?? "#2D2500";
  const surfaceColor = theme?.colors.surface ?? "#1A1500";
  const bgFrom = theme?.hero?.bgGradientFrom ?? "#080600";

  const cardStyle = { backgroundColor: surfaceColor, border: `1px solid ${borderColor}` };
  const quietCardStyle = { backgroundColor: bgFrom, border: `1px solid ${borderColor}` };

  return (
    <section className="py-14 sm:py-20 lg:py-24 px-4 sm:px-6" style={{ borderTop: `1px solid ${borderColor}40` }}>
      <div className="max-w-7xl mx-auto space-y-16 sm:space-y-20">
        <div>
          <SectionHeader
            badge={audiencesSection?.badge?.text ?? "Chọn đúng nhu cầu"}
            title={audiencesSection?.title?.text ?? "SmartFurni phù hợp"}
            accent={audiencesSection?.titleAccent?.text ?? "với ai?"}
            subtitle={audiencesSection?.subtitle?.text ?? "Thay vì chỉ xem tính năng, hãy bắt đầu từ tình huống sử dụng hằng ngày của bạn và gia đình."}
            primary={primary}
            textColor={textColor}
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {audienceItems.map((item, i) => (
              <ScrollReveal key={item.title} variant="fadeUp" delay={60 + i * 45}>
                <div className="p-5 rounded-2xl h-full" style={quietCardStyle}>
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${primary}10`, border: `1px solid ${primary}20` }}>
                      <SvgIcon name={item.icon || "star"} size={20} color={primary} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold mb-1.5" style={{ color: textColor }}>{item.title}</h3>
                      <p className="text-xs leading-relaxed" style={{ color: `${textColor}55` }}>{item.desc}</p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-5 lg:gap-6 items-start">
          <ScrollReveal variant="fadeRight" delay={0}>
            <div className="rounded-3xl overflow-hidden" style={cardStyle}>
              <div className="p-6 sm:p-8" style={{ borderBottom: `1px solid ${borderColor}` }}>
                <div className="flex items-center gap-3 mb-3">
                  <SvgIcon name="ruler" size={22} color={primary} />
                  <span className="text-[11px] font-medium tracking-widest uppercase" style={{ color: primary }}>{specsSection?.badge?.text ?? "Thông số kỹ thuật"}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-light" style={{ color: textColor }}>{specsSection?.title?.text ?? "Kiểm tra kích thước"} <span style={{ color: primary }}>{specsSection?.titleAccent?.text ?? "trước khi đặt mua"}</span></h2>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: `${textColor}55` }}>
                  {specsSection?.subtitle?.text ?? "Các thông số giúp bạn đối chiếu với phòng ngủ, nệm đang dùng và nhu cầu vận hành thực tế."}
                </p>
              </div>
              <div>
                {specItems.map((item, i) => (
                  <div
                    key={item.title}
                    className="grid sm:grid-cols-[180px_1fr] gap-1 sm:gap-4 px-5 sm:px-8 py-4"
                    style={{ borderBottom: i < SPECS.length - 1 ? `1px solid ${borderColor}40` : "none" }}
                  >
                    <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: `${textColor}40` }}>{item.title}</div>
                    <div className="text-sm leading-relaxed" style={{ color: `${textColor}75` }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal variant="fadeLeft" delay={80}>
            <div className="rounded-3xl p-6 sm:p-8 h-full" style={cardStyle}>
              <div className="flex items-center gap-3 mb-3">
                <SvgIcon name="truck" size={22} color={primary} />
                <span className="text-[11px] font-medium tracking-widest uppercase" style={{ color: primary }}>{processSection?.badge?.text ?? "Quy trình mua hàng"}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-light mb-6" style={{ color: textColor }}>{processSection?.title?.text ?? "Từ tư vấn đến lắp đặt"} <span style={{ color: primary }}>{processSection?.titleAccent?.text ?? "chỉ trong vài bước"}</span></h2>
              <div className="space-y-4">
                {processItems.map((item, i) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold" style={{ backgroundColor: `${primary}12`, color: primary, border: `1px solid ${primary}25` }}>
                      {item.icon || String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="pb-4" style={{ borderBottom: i < PROCESS.length - 1 ? `1px solid ${borderColor}40` : "none" }}>
                      <h3 className="text-sm font-semibold mb-1" style={{ color: textColor }}>{item.title}</h3>
                      <p className="text-xs leading-relaxed" style={{ color: `${textColor}55` }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href="/contact"
                className="mt-7 inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition-opacity hover:opacity-85"
                style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})`, color: bgFrom }}
              >
                Đặt lịch tư vấn lắp đặt
              </Link>
            </div>
          </ScrollReveal>
        </div>

        <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-5 lg:gap-6">
          <ScrollReveal variant="fadeRight" delay={0}>
            <div className="rounded-3xl p-6 sm:p-8 h-full" style={cardStyle}>
              <div className="flex items-center gap-3 mb-3">
                <SvgIcon name="map-pin" size={22} color={primary} />
                <span className="text-[11px] font-medium tracking-widest uppercase" style={{ color: primary }}>{showroomsSection?.badge?.text ?? "Trải nghiệm trực tiếp"}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-light mb-3" style={{ color: textColor }}>{showroomsSection?.title?.text ?? "Đặt lịch nằm thử"} <span style={{ color: primary }}>{showroomsSection?.titleAccent?.text ?? "tại showroom"}</span></h2>
              <p className="text-sm leading-relaxed mb-6" style={{ color: `${textColor}55` }}>
                {showroomsSection?.subtitle?.text ?? "Sản phẩm giường điện nên được trải nghiệm thực tế. Đến showroom để thử Zero Gravity, massage, remote và app trước khi quyết định."}
              </p>
              <div className="space-y-3">
                {showroomItems.map((item) => (
                  <div key={item.title} className="rounded-2xl p-4" style={quietCardStyle}>
                    <div className="text-sm font-semibold" style={{ color: textColor }}>{item.title}</div>
                    <div className="mt-1 text-xs leading-relaxed" style={{ color: `${textColor}55` }}>{item.desc}</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <Link href="/contact" className="flex-1 rounded-xl px-4 py-3 text-center text-sm font-semibold transition-opacity hover:opacity-85" style={{ backgroundColor: `${primary}14`, color: primary, border: `1px solid ${primary}25` }}>
                  Xem showroom
                </Link>
                <Link href="https://zalo.me/0918326552" className="flex-1 rounded-xl px-4 py-3 text-center text-sm font-semibold transition-opacity hover:opacity-85" style={{ color: `${textColor}70`, border: `1px solid ${borderColor}` }}>
                  Chat Zalo
                </Link>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal variant="fadeLeft" delay={80}>
            <div className="rounded-3xl p-6 sm:p-8 h-full" style={cardStyle}>
              <div className="flex items-center gap-3 mb-3">
                <SvgIcon name="shield" size={22} color={primary} />
                <span className="text-[11px] font-medium tracking-widest uppercase" style={{ color: primary }}>{afterSalesSection?.badge?.text ?? "Bảo hành & hậu mãi"}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-light mb-6" style={{ color: textColor }}>{afterSalesSection?.title?.text ?? "Yên tâm sau khi"} <span style={{ color: primary }}>{afterSalesSection?.titleAccent?.text ?? "mang giường về nhà"}</span></h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {afterSalesItems.map((item) => (
                  <div key={item.title} className="rounded-2xl p-4" style={quietCardStyle}>
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${primary}10`, border: `1px solid ${primary}20` }}>
                      <SvgIcon name={item.icon || "shield"} size={19} color={primary} />
                    </div>
                    <h3 className="text-sm font-semibold mb-1.5" style={{ color: textColor }}>{item.title}</h3>
                    <p className="text-xs leading-relaxed" style={{ color: `${textColor}55` }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>

        <ScrollReveal variant="fadeUp" delay={0}>
          <div className="rounded-3xl p-6 sm:p-8 lg:p-10" style={cardStyle}>
            <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-8 lg:gap-10 items-start">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <SvgIcon name="check-circle" size={22} color={primary} />
                  <span className="text-[11px] font-medium tracking-widest uppercase" style={{ color: primary }}>{proofStatsSection?.badge?.text ?? "Bằng chứng tin cậy"}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-light mb-3" style={{ color: textColor }}>{proofStatsSection?.title?.text ?? "Những con số trước khi"} <span style={{ color: primary }}>{proofStatsSection?.titleAccent?.text ?? "bạn đặt lịch demo"}</span></h2>
                <p className="text-sm leading-relaxed" style={{ color: `${textColor}55` }}>
                  {proofStatsSection?.subtitle?.text ?? "Kết hợp đánh giá khách hàng, quy trình lắp đặt và kiểm định vận hành để bạn có cơ sở ra quyết định rõ ràng hơn."}
                </p>
              </div>
              <div className="grid sm:grid-cols-4 gap-3">
                {proofStatItems.map((item) => (
                  <div key={item.title} className="rounded-2xl p-4 text-center" style={quietCardStyle}>
                    <div className="text-xl sm:text-2xl font-semibold" style={{ color: primary }}>{item.title}</div>
                    <div className="mt-1 text-xs leading-relaxed" style={{ color: `${textColor}50` }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>

        <div className="grid lg:grid-cols-2 gap-5 lg:gap-6">
          <ScrollReveal variant="fadeRight" delay={0}>
            <div className="rounded-3xl p-6 sm:p-8 h-full" style={cardStyle}>
              <div className="flex items-center gap-3 mb-3">
                <SvgIcon name="credit-card" size={22} color={primary} />
                <span className="text-[11px] font-medium tracking-widest uppercase" style={{ color: primary }}>{paymentsSection?.badge?.text ?? "Thanh toán linh hoạt"}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-light mb-6" style={{ color: textColor }}>{paymentsSection?.title?.text ?? "Dễ bắt đầu hơn"} <span style={{ color: primary }}>{paymentsSection?.titleAccent?.text ?? "với nhiều lựa chọn thanh toán"}</span></h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {paymentItems.map((item) => (
                  <div key={item.title} className="rounded-2xl p-4" style={quietCardStyle}>
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${primary}10`, border: `1px solid ${primary}20` }}>
                      <SvgIcon name={item.icon || "credit-card"} size={19} color={primary} />
                    </div>
                    <h3 className="text-sm font-semibold mb-1.5" style={{ color: textColor }}>{item.title}</h3>
                    <p className="text-xs leading-relaxed" style={{ color: `${textColor}55` }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal variant="fadeLeft" delay={80}>
            <div className="rounded-3xl p-6 sm:p-8 h-full" style={cardStyle}>
              <div className="flex items-center gap-3 mb-3">
                <SvgIcon name="info" size={22} color={primary} />
                <span className="text-[11px] font-medium tracking-widest uppercase" style={{ color: primary }}>{faqSection?.badge?.text ?? "Câu hỏi thường gặp"}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-light mb-6" style={{ color: textColor }}>{faqSection?.title?.text ?? "Giải đáp nhanh"} <span style={{ color: primary }}>{faqSection?.titleAccent?.text ?? "trước khi tư vấn"}</span></h2>
              <div className="space-y-3">
                {faqItems.map((item) => (
                  <details key={item.title} className="group rounded-2xl p-4" style={quietCardStyle}>
                    <summary className="cursor-pointer list-none text-sm font-semibold" style={{ color: textColor }}>
                      <span className="flex items-center justify-between gap-4">
                        {item.title}
                        <span className="text-lg transition-transform group-open:rotate-45" style={{ color: primary }}>+</span>
                      </span>
                    </summary>
                    <p className="mt-3 text-xs leading-relaxed" style={{ color: `${textColor}55` }}>{item.desc}</p>
                  </details>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
