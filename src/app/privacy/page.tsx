import { getTheme } from "@/lib/theme-store";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Chính sách bảo mật — SmartFurni",
  description: "Chính sách bảo mật thông tin khách hàng của SmartFurni. Chúng tôi cam kết bảo vệ dữ liệu cá nhân của bạn.",
};

const SECTIONS = [
  {
    icon: "🔒",
    title: "Thông tin chúng tôi thu thập",
    items: [
      "Họ tên, số điện thoại, địa chỉ email khi bạn đăng ký hoặc liên hệ",
      "Địa chỉ giao hàng và thông tin đơn hàng",
      "Lịch sử duyệt web và tương tác trên website (qua cookie)",
      "Thông tin thiết bị và trình duyệt (địa chỉ IP, loại thiết bị)",
      "Phản hồi và đánh giá sản phẩm bạn cung cấp",
    ],
  },
  {
    icon: "📋",
    title: "Mục đích sử dụng thông tin",
    items: [
      "Xử lý đơn hàng và giao hàng đến địa chỉ của bạn",
      "Liên hệ tư vấn, hỗ trợ sau bán hàng và bảo hành",
      "Gửi thông báo về đơn hàng, khuyến mãi (nếu bạn đồng ý)",
      "Cải thiện trải nghiệm người dùng trên website",
      "Phân tích dữ liệu để nâng cao chất lượng dịch vụ",
    ],
  },
  {
    icon: "🤝",
    title: "Chia sẻ thông tin",
    items: [
      "Chúng tôi không bán thông tin cá nhân của bạn cho bên thứ ba",
      "Thông tin có thể được chia sẻ với đối tác vận chuyển để giao hàng",
      "Dữ liệu có thể được xử lý bởi nhà cung cấp dịch vụ thanh toán",
      "Chúng tôi có thể tiết lộ thông tin khi có yêu cầu từ cơ quan pháp luật",
    ],
  },
  {
    icon: "🛡️",
    title: "Bảo mật dữ liệu",
    items: [
      "Dữ liệu được mã hóa SSL/TLS trong quá trình truyền tải",
      "Hệ thống được bảo vệ bởi tường lửa và kiểm soát truy cập",
      "Nhân viên chỉ được truy cập dữ liệu cần thiết cho công việc",
      "Chúng tôi thực hiện kiểm tra bảo mật định kỳ",
    ],
  },
  {
    icon: "✅",
    title: "Quyền của bạn",
    items: [
      "Quyền truy cập và xem thông tin cá nhân của mình",
      "Quyền yêu cầu chỉnh sửa thông tin không chính xác",
      "Quyền yêu cầu xóa dữ liệu cá nhân (trong phạm vi pháp luật cho phép)",
      "Quyền từ chối nhận email marketing bất kỳ lúc nào",
      "Quyền khiếu nại về việc xử lý dữ liệu của chúng tôi",
    ],
  },
  {
    icon: "🍪",
    title: "Cookie",
    items: [
      "Website sử dụng cookie để cải thiện trải nghiệm duyệt web",
      "Cookie phân tích giúp chúng tôi hiểu cách bạn sử dụng website",
      "Cookie tiếp thị có thể được dùng để hiển thị quảng cáo phù hợp",
      "Bạn có thể tắt cookie trong cài đặt trình duyệt",
    ],
  },
];

export default function PrivacyPage() {
  const theme = getTheme();
  const { colors } = theme;

  return (
    <main style={{ minHeight: "100vh", backgroundColor: colors.background }}>
      <Navbar theme={theme} />

      {/* Hero */}
      <div style={{ backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}` }} className="pt-24 pb-10 px-4 sm:px-6">
        <div style={{ maxWidth: 800 }} className="mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🔒</span>
            <span className="text-xs font-medium tracking-widest uppercase" style={{ color: colors.primary }}>
              Chính sách bảo mật
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-light mb-4" style={{ color: colors.foreground }}>
            Bảo vệ thông tin của bạn
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: `${colors.foreground}80` }}>
            Cập nhật lần cuối: Tháng 1, 2025 · SmartFurni cam kết bảo vệ quyền riêng tư và dữ liệu cá nhân của khách hàng theo đúng quy định pháp luật Việt Nam.
          </p>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 800 }} className="mx-auto px-4 sm:px-6 py-12 space-y-8">
        {SECTIONS.map((section) => (
          <div
            key={section.title}
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            className="rounded-2xl border p-6 sm:p-8"
          >
            <h2 className="text-lg font-medium mb-5 flex items-center gap-3" style={{ color: colors.foreground }}>
              <span className="text-xl">{section.icon}</span>
              {section.title}
            </h2>
            <ul className="space-y-3">
              {section.items.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-relaxed" style={{ color: `${colors.foreground}70` }}>
                  <span style={{ color: colors.primary }} className="mt-0.5 flex-shrink-0">◆</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Contact */}
        <div style={{ backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }} className="rounded-2xl border p-6 sm:p-8">
          <h2 className="text-lg font-medium mb-3" style={{ color: colors.foreground }}>Liên hệ về quyền riêng tư</h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: `${colors.foreground}70` }}>
            Nếu bạn có câu hỏi hoặc yêu cầu liên quan đến chính sách bảo mật, vui lòng liên hệ:
          </p>
          <div className="space-y-2 text-sm" style={{ color: `${colors.foreground}80` }}>
            <div>📧 Email: <a href="mailto:info@smartfurni.vn" style={{ color: colors.primary }}>info@smartfurni.vn</a></div>
            <div>📞 Hotline: <a href="tel:02871220818" style={{ color: colors.primary }}>028.7122.0818</a></div>
            <div>🏢 Địa chỉ: 74 Nguyễn Thị Nhung, KĐT Vạn Phúc City, TP. Thủ Đức, TP. HCM</div>
          </div>
        </div>
      </div>

      <Footer theme={theme} variant="minimal" />
    </main>
  );
}
