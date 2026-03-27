import { getTheme } from "@/lib/theme-store";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Chính sách bảo hành — SmartFurni",
  description: "Chính sách bảo hành 5 năm toàn diện cho tất cả sản phẩm giường điều khiển SmartFurni.",
};

const WARRANTY_ITEMS = [
  {
    icon: "🛡️",
    title: "Bảo hành 5 năm khung giường",
    desc: "Khung giường bằng thép không gỉ được bảo hành 5 năm toàn diện, bao gồm lỗi sản xuất, biến dạng và gãy vỡ do chất lượng vật liệu.",
  },
  {
    icon: "⚙️",
    title: "Bảo hành 3 năm động cơ",
    desc: "Hệ thống động cơ điện tử điều chỉnh tư thế được bảo hành 3 năm. Bao gồm thay thế miễn phí nếu lỗi phần cứng.",
  },
  {
    icon: "📱",
    title: "Bảo hành 2 năm bo mạch điều khiển",
    desc: "Mạch điều khiển Bluetooth, cảm biến theo dõi giấc ngủ và hệ thống đèn LED được bảo hành 2 năm.",
  },
  {
    icon: "🛏️",
    title: "Bảo hành 1 năm đệm & phụ kiện",
    desc: "Đệm memory foam, gối và các phụ kiện đi kèm được bảo hành 1 năm về lỗi sản xuất.",
  },
];

const COVERED = [
  "Lỗi sản xuất và khuyết tật vật liệu",
  "Hỏng hóc do sử dụng bình thường",
  "Lỗi phần mềm firmware và ứng dụng điều khiển",
  "Động cơ không hoạt động hoặc hoạt động bất thường",
  "Kết nối Bluetooth không ổn định (lỗi phần cứng)",
  "Biến dạng khung giường trong điều kiện sử dụng bình thường",
];

const NOT_COVERED = [
  "Hư hỏng do tai nạn, rơi vỡ, va đập mạnh",
  "Hư hỏng do nước, ẩm ướt quá mức",
  "Tự ý tháo lắp, sửa chữa không qua SmartFurni",
  "Hư hỏng do thiên tai, hỏa hoạn, sét đánh",
  "Trầy xước, bạc màu bề mặt do sử dụng",
  "Hư hỏng do sử dụng sai mục đích (tải trọng vượt quá 300kg)",
];

export default function WarrantyPage() {
  const theme = getTheme();
  const { colors, pageWarranty } = theme;

  return (
    <main style={{ minHeight: "100vh", backgroundColor: colors.background }}>
      <Navbar theme={theme} />

      {/* Hero */}
      <section className="pt-28 pb-14 px-4 sm:px-6 text-center">
        <div className="inline-flex items-center gap-3 mb-4">
          <span className="w-8 h-px bg-[#C9A84C]" />
          <span className="text-xs font-medium tracking-wider uppercase text-[#C9A84C]">{pageWarranty?.heroBadge ?? "Cam kết chất lượng"}</span>
          <span className="w-8 h-px bg-[#C9A84C]" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-light text-[#F5EDD6] mb-4">
          {pageWarranty?.heroTitle ?? "Chính sách Bảo hành"}
        </h1>
        <p className="text-sm text-[#F5EDD6]/50 max-w-xl mx-auto">
          {pageWarranty?.heroSubtitle ?? "SmartFurni cam kết bảo hành toàn diện cho mọi sản phẩm."}
        </p>
      </section>

      <div style={{ maxWidth: "900px" }} className="mx-auto px-4 sm:px-6 pb-20 space-y-10">
        {/* Warranty cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {WARRANTY_ITEMS.map((item) => (
            <div
              key={item.title}
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              className="rounded-2xl border p-6 hover:border-[#C9A84C]/30 transition-colors"
            >
              <div className="text-3xl mb-3">{item.icon}</div>
              <h3 className="text-base font-semibold text-[#F5EDD6] mb-2">{item.title}</h3>
              <p className="text-sm text-[#F5EDD6]/50 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Covered / Not covered */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div style={{ backgroundColor: `${colors.success}08`, borderColor: `${colors.success}25` }} className="rounded-2xl border p-6">
            <h3 className="text-sm font-semibold text-[#F5EDD6] mb-4 flex items-center gap-2">
              <span style={{ color: colors.success }}>✓</span> Được bảo hành
            </h3>
            <ul className="space-y-2.5">
              {COVERED.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[#F5EDD6]/60">
                  <span style={{ color: colors.success }} className="mt-0.5 flex-shrink-0">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div style={{ backgroundColor: `${colors.error}08`, borderColor: `${colors.error}25` }} className="rounded-2xl border p-6">
            <h3 className="text-sm font-semibold text-[#F5EDD6] mb-4 flex items-center gap-2">
              <span style={{ color: colors.error }}>✗</span> Không được bảo hành
            </h3>
            <ul className="space-y-2.5">
              {NOT_COVERED.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[#F5EDD6]/60">
                  <span style={{ color: colors.error }} className="mt-0.5 flex-shrink-0">✗</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Process */}
        <div style={{ backgroundColor: colors.surface, borderColor: colors.border }} className="rounded-2xl border p-6 sm:p-8">
          <h2 className="text-xl font-light text-[#F5EDD6] mb-6">Quy trình yêu cầu bảo hành</h2>
          <div className="space-y-4">
            {[
              { step: "01", title: "Liên hệ SmartFurni", desc: `Gọi hotline ${pageWarranty?.hotline ?? "1900 1234"} hoặc email ${pageWarranty?.email ?? "warranty@smartfurni.vn"} với mã đơn hàng và mô tả sự cố.` },
              { step: "02", title: "Kỹ thuật viên kiểm tra", desc: "Đội kỹ thuật sẽ liên hệ trong vòng 24 giờ để xác nhận lỗi và hướng dẫn xử lý." },
              { step: "03", title: "Sửa chữa hoặc thay thế", desc: "Tùy mức độ lỗi, SmartFurni sẽ sửa chữa tại nhà hoặc thay thế linh kiện/sản phẩm mới." },
              { step: "04", title: "Hoàn thành & xác nhận", desc: "Sau khi xử lý xong, bạn nhận được biên bản bảo hành có chữ ký và thời hạn bảo hành mới." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4">
                <div
                  style={{ background: "linear-gradient(135deg, #C9A84C, #8B6914)", color: "#fff" }}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                >
                  {step}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#F5EDD6] mb-0.5">{title}</p>
                  <p className="text-sm text-[#F5EDD6]/50 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center py-6">
          <p className="text-sm text-[#F5EDD6]/50 mb-4">Cần hỗ trợ bảo hành?</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={`tel:${(pageWarranty?.hotline ?? "19001234").replace(/\s/g, "")}`}
              style={{ background: "linear-gradient(135deg, #C9A84C, #8B6914)", color: "#fff" }}
              className="px-6 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              📞 Gọi {pageWarranty?.hotline ?? "1900 1234"}
            </a>
            <a
              href={`mailto:${pageWarranty?.email ?? "warranty@smartfurni.vn"}`}
              style={{ borderColor: "#C9A84C", color: "#C9A84C" }}
              className="px-6 py-3 rounded-xl text-sm font-semibold border hover:opacity-70 transition-opacity"
            >
              ✉️ {pageWarranty?.email ?? "warranty@smartfurni.vn"}
            </a>
          </div>
        </div>
      </div>

      <Footer theme={theme} variant="minimal" />
    </main>
  );
}
