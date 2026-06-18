"use client";

import Link from "next/link";
import { ScrollReveal } from "./ScrollReveal";
import type { SiteTheme, HomepageGenericSection, HomepageContentCard } from "@/lib/theme-store";

interface Props { theme: SiteTheme; }

const FW_MAP: Record<string, string> = {
  light: "300", normal: "400", medium: "500", semibold: "600", bold: "700",
};

function Header({ section, fallback }: { section?: HomepageGenericSection; fallback: HomepageGenericSection }) {
  const cfg = section ?? fallback;
  const badge = cfg.badge;
  const title = cfg.title;
  const titleAccent = cfg.titleAccent;
  const subtitle = cfg.subtitle;

  return (
    <ScrollReveal variant="fadeUp" delay={0}>
      <div className="text-center mb-10 sm:mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#C9A84C]/30 bg-[#C9A84C]/5 mb-4">
          <span style={{ fontSize: `${badge.fontSize}px`, color: badge.color, fontWeight: FW_MAP[badge.fontWeight] }} className="tracking-wider">
            {badge.text}
          </span>
        </div>
        <h2 className="mb-4">
          <span style={{ fontSize: `clamp(24px, 3vw, ${title.fontSize}px)`, color: title.color, fontWeight: FW_MAP[title.fontWeight], display: "block" }}>
            {title.text}
          </span>
          <span style={{ fontSize: `clamp(24px, 3vw, ${titleAccent.fontSize}px)`, color: titleAccent.color, fontWeight: FW_MAP[titleAccent.fontWeight], display: "block" }}>
            {titleAccent.text}
          </span>
        </h2>
        <p style={{ fontSize: `${subtitle.fontSize}px`, color: subtitle.color, fontWeight: FW_MAP[subtitle.fontWeight], opacity: 0.62 }} className="max-w-3xl mx-auto leading-relaxed">
          {subtitle.text}
        </p>
      </div>
    </ScrollReveal>
  );
}

function CardsGrid({ items, columns = "lg:grid-cols-4" }: { items: HomepageContentCard[]; columns?: string }) {
  return (
    <div className={`grid sm:grid-cols-2 ${columns} gap-4`}>
      {items.map((item, i) => (
        <ScrollReveal key={`${item.title}-${i}`} variant="fadeUp" delay={100 + i * 65}>
          <div className="group h-full p-5 sm:p-6 rounded-2xl bg-[#1A1600] border border-[#2E2800] hover:border-[#C9A84C]/45 hover:bg-[#221D00] transition-all duration-300">
            <div className="mb-4 flex items-center justify-center w-11 h-11 rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/20 text-xl group-hover:bg-[#C9A84C]/15 transition-colors">
              <span aria-hidden="true">{item.icon}</span>
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-[#F5EDD6] mb-2 group-hover:text-[#C9A84C] transition-colors">{item.title}</h3>
            <p className="text-xs sm:text-sm text-[#F5EDD6]/55 leading-relaxed">{item.desc}</p>
          </div>
        </ScrollReveal>
      ))}
    </div>
  );
}

function SectionShell({ id, section, fallback, children, className = "" }: { id: string; section?: HomepageGenericSection; fallback: HomepageGenericSection; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`py-14 sm:py-20 lg:py-24 px-4 sm:px-6 ${className}`}>
      <div className="max-w-7xl mx-auto">
        <Header section={section} fallback={fallback} />
        {children}
      </div>
    </section>
  );
}

const FALLBACKS: Record<string, HomepageGenericSection> = {
  problems: {
    badge: { text: "NHU CẦU THỰC TẾ", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
    title: { text: "Bạn có đang gặp", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
    titleAccent: { text: "những vấn đề này?", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
    subtitle: { text: "SmartFurni bắt đầu từ các tình huống rất đời thường: nằm đọc sách bị mỏi cổ, người lớn tuổi khó ngồi dậy, căn hộ nhỏ cần nội thất đa năng, hoặc gia đình muốn nâng cấp trải nghiệm nghỉ ngơi mỗi ngày.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
    items: [
      { icon: "🛏️", title: "Đau lưng, mỏi cổ khi nằm lâu", desc: "Không cần kê nhiều gối; giường nâng đầu và chân giúp cơ thể ở tư thế dễ chịu hơn khi đọc sách, xem TV hoặc nghỉ ngơi." },
      { icon: "🧓", title: "Người lớn tuổi khó ngồi dậy", desc: "Tư thế nâng đầu hỗ trợ chuyển từ nằm sang ngồi thuận tiện hơn, phù hợp chăm sóc bố mẹ tại nhà." },
      { icon: "🌙", title: "Ngủ không thoải mái khi nằm phẳng", desc: "Các preset như nâng đầu nhẹ, nâng chân hoặc Zero Gravity giúp cá nhân hóa tư thế nghỉ ngơi theo nhu cầu." },
      { icon: "🏙️", title: "Không gian sống cần đa năng", desc: "Các dòng sofa giường và giường thông minh giúp phòng ngủ, phòng khách hoặc căn hộ nhỏ linh hoạt hơn." },
    ],
  },
  solutions: {
    badge: { text: "CHỌN THEO NHU CẦU", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
    title: { text: "Giải pháp phù hợp", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
    titleAccent: { text: "cho từng gia đình", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
    subtitle: { text: "Thay vì bắt đầu bằng tên mẫu, trang chủ nên giúp khách hàng chọn theo người dùng, không gian sống và mục tiêu sử dụng. Đây là lớp định hướng giúp khách liên hệ tư vấn nhanh hơn.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
    items: [
      { icon: "👨‍👩‍👧", title: "Gia đình có người lớn tuổi", desc: "Ưu tiên remote đơn giản, nâng đầu/chân êm, chiều cao dễ lên xuống và chính sách bảo hành rõ ràng." },
      { icon: "💼", title: "Người làm việc nhiều, cần thư giãn", desc: "Gợi ý mẫu có Zero Gravity, massage và preset đọc sách/xem TV để phục hồi sau ngày dài." },
      { icon: "🏢", title: "Căn hộ nhỏ", desc: "Ưu tiên sofa giường hoặc thiết kế đa năng, tối ưu diện tích mà vẫn giữ thẩm mỹ cao cấp." },
      { icon: "📱", title: "Khách hàng yêu công nghệ", desc: "Tập trung vào app, preset, Bluetooth, đèn LED, hẹn giờ và các tiện ích điều khiển thông minh." },
      { icon: "🤝", title: "Đại lý và showroom", desc: "Gói B2B có catalogue, video demo, training tư vấn, chính sách trưng bày và hỗ trợ lead." },
    ],
  },
  technology: {
    badge: { text: "CÔNG NGHỆ BÊN TRONG", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
    title: { text: "Giá trị không chỉ nằm ở", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
    titleAccent: { text: "thiết kế bên ngoài", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
    subtitle: { text: "Một chiếc giường công thái học cần thuyết phục khách hàng bằng kết cấu, motor, độ êm, preset, khả năng điều khiển và quy trình kiểm tra trước khi giao.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
    items: [
      { icon: "⚙️", title: "Motor nâng hạ êm ái", desc: "Tập trung truyền thông về độ ổn định, độ ồn thấp và cảm giác vận hành mượt khi nâng đầu/chân." },
      { icon: "🧱", title: "Khung và cơ cấu chịu lực", desc: "Giải thích vật liệu khung, tải trọng khuyến nghị và quy trình kiểm tra an toàn trước khi bàn giao." },
      { icon: "🎛️", title: "Preset một chạm", desc: "Các tư thế ngủ, đọc sách, xem TV, chống ngáy, nâng chân và Zero Gravity giúp khách dễ hình dung giá trị." },
      { icon: "📲", title: "Remote, app và tiện ích", desc: "Điều khiển thuận tiện cho nhiều độ tuổi, có thể mở rộng sang app, hẹn giờ, đèn LED hoặc theo dõi giấc ngủ." },
    ],
  },
  postures: {
    badge: { text: "TƯ THẾ & SỨC KHỎE", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
    title: { text: "Mỗi tư thế phục vụ", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
    titleAccent: { text: "một nhu cầu khác nhau", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
    subtitle: { text: "Nội dung nên dùng ngôn ngữ an toàn: hỗ trợ tư thế, tạo cảm giác thoải mái và thư giãn; không đưa ra tuyên bố điều trị bệnh.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
    items: [
      { icon: "🌌", title: "Zero Gravity", desc: "Gợi ý cho người muốn thư giãn toàn thân, giảm cảm giác áp lực vùng lưng sau ngày làm việc dài." },
      { icon: "📖", title: "Đọc sách/xem TV", desc: "Không cần kê gối cao, giúp cổ và lưng ở tư thế ổn định hơn khi sinh hoạt trên giường." },
      { icon: "🫁", title: "Nâng đầu nhẹ", desc: "Phù hợp người không thoải mái khi nằm phẳng, cần tư thế nghỉ ngơi thoáng hơn." },
      { icon: "🦵", title: "Nâng chân", desc: "Tạo cảm giác thư giãn chân, phù hợp người đứng nhiều hoặc vận động nhiều trong ngày." },
      { icon: "🪑", title: "Hỗ trợ ngồi dậy", desc: "Giúp người lớn tuổi chuyển đổi tư thế thuận tiện hơn trong sinh hoạt hằng ngày." },
    ],
  },
  trust: {
    badge: { text: "BẰNG CHỨNG TIN CẬY", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
    title: { text: "An tâm hơn trước khi", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
    titleAccent: { text: "quyết định mua", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
    subtitle: { text: "Sản phẩm cơ điện giá trị cao cần nhiều lớp chứng thực: khách hàng thật, thông tin kỹ thuật, bảo hành rõ ràng và trải nghiệm showroom.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
    items: [
      { icon: "🧪", title: "Thông số và kiểm tra kỹ thuật", desc: "Công khai tải trọng, góc nâng, độ ồn, thời gian bảo hành motor và quy trình QC nếu đã có dữ liệu xác nhận." },
      { icon: "🏬", title: "Trải nghiệm showroom", desc: "Khuyến khích đặt lịch trải nghiệm trực tiếp để khách tự cảm nhận độ êm, chất liệu và tư thế phù hợp." },
      { icon: "🎥", title: "Video review tại nhà", desc: "Tăng độ tin cậy bằng video giao lắp thực tế, khách hàng thật và tình huống sử dụng trong gia đình Việt." },
    ],
  },
  process: {
    badge: { text: "MUA HÀNG AN TÂM", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
    title: { text: "Quy trình từ tư vấn đến", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
    titleAccent: { text: "giao lắp tại nhà", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
    subtitle: { text: "Khách hàng mua sản phẩm giá trị cao cần biết rõ từng bước: tư vấn, trải nghiệm, cá nhân hóa, giao lắp, hướng dẫn sử dụng và bảo hành.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
    items: [
      { icon: "1", title: "Tư vấn nhu cầu", desc: "Xác định mua cho ai, diện tích phòng, thói quen sử dụng, nhu cầu người lớn tuổi hoặc thư giãn." },
      { icon: "2", title: "Trải nghiệm/demo", desc: "Đặt lịch showroom hoặc nhận demo video để hiểu rõ tư thế, chất liệu và cách vận hành." },
      { icon: "3", title: "Chọn mẫu và cá nhân hóa", desc: "Chọn kích thước, chất liệu, màu sắc, tính năng, phụ kiện và phương án thanh toán phù hợp." },
      { icon: "4", title: "Giao lắp tận nơi", desc: "Đội kỹ thuật lắp đặt, kiểm tra vận hành, hướng dẫn remote/app và bàn giao sản phẩm." },
      { icon: "5", title: "Bảo hành và hỗ trợ", desc: "Kích hoạt bảo hành, lưu kênh hotline/Zalo và hỗ trợ kỹ thuật trong quá trình sử dụng." },
    ],
  },
  b2b: {
    badge: { text: "B2B & ĐẠI LÝ", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
    title: { text: "Mở rộng danh mục", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
    titleAccent: { text: "nội thất thông minh", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
    subtitle: { text: "Section riêng cho đối tác giúp SmartFurni chuyển đổi nhóm showroom nệm, đại lý nội thất, kiến trúc sư và đơn vị thiết kế căn hộ mẫu.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
    items: [
      { icon: "📘", title: "Catalogue và tư liệu bán hàng", desc: "Cung cấp hình ảnh, video demo, bảng thông số, kịch bản tư vấn và tài liệu đào tạo đội ngũ sales." },
      { icon: "🏷️", title: "Chính sách đại lý", desc: "Trình bày chiết khấu, khu vực phân phối, điều kiện trưng bày và quy trình tiếp nhận lead." },
      { icon: "🛠️", title: "Hỗ trợ kỹ thuật", desc: "Đào tạo lắp đặt, xử lý sự cố, bảo hành motor/khung và quy trình cung ứng linh kiện thay thế." },
      { icon: "📣", title: "Hỗ trợ marketing", desc: "Landing page riêng, tracking lead, nội dung quảng cáo địa phương, POSM và chiến dịch showroom." },
    ],
  },
  faq: {
    badge: { text: "FAQ NỔI BẬT", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
    title: { text: "Những câu hỏi trước khi", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
    titleAccent: { text: "đặt lịch tư vấn", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
    subtitle: { text: "Đưa FAQ lên trang chủ giúp giảm băn khoăn về độ bền, giao lắp, bảo hành, nệm tương thích và chi phí trước khi khách liên hệ.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
    items: [
      { icon: "?", title: "Giường điện có bền không?", desc: "Nên trả lời bằng thông tin motor, khung, tải trọng, quy trình kiểm tra và thời hạn bảo hành cụ thể." },
      { icon: "?", title: "Mất điện có dùng được không?", desc: "Giải thích cơ chế đưa giường về vị trí an toàn hoặc pin dự phòng nếu mẫu sản phẩm có hỗ trợ." },
      { icon: "?", title: "Có dùng với nệm hiện tại không?", desc: "Tư vấn theo loại nệm, độ dày, độ đàn hồi và kích thước khung để tránh mua sai." },
      { icon: "?", title: "Có giao lắp toàn quốc không?", desc: "Nên nêu khu vực phục vụ, thời gian dự kiến, phí vận chuyển và quy trình kỹ thuật." },
      { icon: "?", title: "Có phù hợp cho người lớn tuổi không?", desc: "Nhấn mạnh tư thế hỗ trợ ngồi dậy, remote dễ dùng, hướng dẫn sử dụng và hỗ trợ sau bán hàng." },
      { icon: "?", title: "Có trả góp hoặc đặt riêng không?", desc: "Giúp tăng chuyển đổi cho sản phẩm giá trị cao và nhu cầu cá nhân hóa kích thước/chất liệu." },
    ],
  },
};

export default function HomepageConversionSections({ theme }: Props) {
  const sections = theme.homepageSections;
  const getItems = (key: keyof typeof FALLBACKS) => sections?.[key]?.items?.length ? sections[key].items : FALLBACKS[key].items;

  return (
    <>
      <SectionShell id="problems" section={sections?.problems} fallback={FALLBACKS.problems}>
        <CardsGrid items={getItems("problems")} />
      </SectionShell>

      <SectionShell id="solutions" section={sections?.solutions} fallback={FALLBACKS.solutions} className="bg-[#0B0800]">
        <CardsGrid items={getItems("solutions")} columns="lg:grid-cols-5" />
      </SectionShell>

      <SectionShell id="technology" section={sections?.technology} fallback={FALLBACKS.technology}>
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-6 lg:gap-8 items-stretch">
          <ScrollReveal variant="fadeLeft" delay={80}>
            <div className="h-full rounded-3xl border border-[#C9A84C]/20 bg-gradient-to-br from-[#2A2100] via-[#151000] to-[#080600] p-6 sm:p-8 overflow-hidden relative">
              <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-[#C9A84C]/10 blur-2xl" />
              <div className="relative z-10">
                <p className="text-xs tracking-[0.22em] text-[#C9A84C] mb-5">SMARTFURNI ENGINEERING</p>
                <div className="aspect-[4/3] rounded-2xl border border-[#C9A84C]/20 bg-[#0D0A00] flex items-center justify-center">
                  <div className="text-center px-6">
                    <div className="text-6xl mb-5">🛌</div>
                    <h3 className="text-[#F5EDD6] text-xl font-semibold mb-2">Bóc tách giá trị sản phẩm</h3>
                    <p className="text-[#F5EDD6]/55 text-sm leading-relaxed">Dùng ảnh cắt lớp hoặc hotspot để hiển thị motor, khung, cơ cấu nâng, remote/app và các lớp hoàn thiện.</p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
          <CardsGrid items={getItems("technology")} columns="lg:grid-cols-2" />
        </div>
      </SectionShell>

      <SectionShell id="postures" section={sections?.postures} fallback={FALLBACKS.postures} className="bg-[#0B0800]">
        <CardsGrid items={getItems("postures")} columns="lg:grid-cols-5" />
      </SectionShell>

      <SectionShell id="comparison" section={sections?.comparison} fallback={{
        badge: { text: "SO SÁNH LỰA CHỌN", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
        title: { text: "Vì sao chọn", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
        titleAccent: { text: "SmartFurni?", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
        subtitle: { text: "Bảng so sánh giúp khách hàng hiểu SmartFurni khác giường thường, sofa giường phổ thông và giường y tế ở điểm nào, đặc biệt về thẩm mỹ gia đình và trải nghiệm sinh hoạt.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
        items: [
          { icon: "Giường thường: cao; Sofa giường: trung bình; Giường y tế: thấp", title: "Thẩm mỹ trong phòng ngủ", desc: "SmartFurni giữ thẩm mỹ cao cấp, phù hợp không gian gia đình." },
          { icon: "Giường thường: không; Sofa giường: hạn chế; Giường y tế: có", title: "Điều chỉnh tư thế", desc: "SmartFurni điều chỉnh tư thế sinh hoạt, thư giãn và nghỉ ngơi bằng preset một chạm." },
          { icon: "Giường thường cần kê gối; Sofa giường tạm được; Giường y tế không tối ưu thẩm mỹ", title: "Đọc sách/xem TV", desc: "SmartFurni hỗ trợ tư thế đọc sách, xem TV và nghỉ ngơi trên cùng một chiếc giường." },
          { icon: "Giường thường và sofa giường hạn chế; giường y tế tốt nhưng giống bệnh viện", title: "Hỗ trợ người lớn tuổi", desc: "SmartFurni thân thiện hơn trong không gian nhà, giúp chuyển đổi tư thế thuận tiện." },
          { icon: "Các lựa chọn phổ thông thường không có app/preset", title: "Công nghệ và tiện ích", desc: "SmartFurni khác biệt nhờ remote, preset, app và các tiện ích thông minh theo từng mẫu." },
        ],
      }}>
        <ScrollReveal variant="fadeUp" delay={120}>
          <div className="overflow-x-auto rounded-3xl border border-[#2E2800] bg-[#1A1600]">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[#221D00] text-[#C9A84C]">
                <tr><th className="p-4">Tiêu chí</th><th className="p-4">Các lựa chọn phổ thông</th><th className="p-4">SmartFurni</th></tr>
              </thead>
              <tbody className="divide-y divide-[#2E2800] text-[#F5EDD6]/70">
                {getItems("comparison").map((row) => (
                  <tr key={row.title}>
                    <td className="p-4 text-[#F5EDD6] font-medium">{row.title}</td>
                    <td className="p-4">{row.icon}</td>
                    <td className="p-4 text-[#F5EDD6] font-medium">{row.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollReveal>
      </SectionShell>

      <SectionShell id="trust" section={sections?.trust} fallback={FALLBACKS.trust}>
        <CardsGrid items={getItems("trust")} columns="lg:grid-cols-3" />
      </SectionShell>

      <SectionShell id="process" section={sections?.process} fallback={FALLBACKS.process} className="bg-[#0B0800]">
        <CardsGrid items={getItems("process")} columns="lg:grid-cols-5" />
      </SectionShell>

      <SectionShell id="b2b" section={sections?.b2b} fallback={FALLBACKS.b2b}>
        <CardsGrid items={getItems("b2b")} />
        <ScrollReveal variant="fadeUp" delay={420}>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/lp/doi-tac-showroom-nem#dang-ky" className="px-6 py-3 rounded-full bg-[#C9A84C] text-black text-sm font-semibold text-center hover:bg-[#E2C97E] transition-colors">Đăng ký đối tác B2B</Link>
            <Link href="/catalogue" className="px-6 py-3 rounded-full border border-[#C9A84C]/35 text-[#C9A84C] text-sm font-semibold text-center hover:bg-[#C9A84C]/10 transition-colors">Xem catalogue</Link>
          </div>
        </ScrollReveal>
      </SectionShell>

      <SectionShell id="faq" section={sections?.faq} fallback={FALLBACKS.faq} className="bg-[#0B0800]">
        <div className="grid md:grid-cols-2 gap-4">
          {getItems("faq").map((item, i) => (
            <ScrollReveal key={`${item.title}-${i}`} variant="fadeUp" delay={100 + i * 60}>
              <details className="group rounded-2xl bg-[#1A1600] border border-[#2E2800] open:border-[#C9A84C]/45 transition-colors">
                <summary className="cursor-pointer list-none p-5 flex items-center justify-between gap-4 text-[#F5EDD6] font-semibold">
                  <span>{item.title}</span><span className="text-[#C9A84C] group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="px-5 pb-5 text-sm text-[#F5EDD6]/58 leading-relaxed">{item.desc}</p>
              </details>
            </ScrollReveal>
          ))}
        </div>
      </SectionShell>
    </>
  );
}
