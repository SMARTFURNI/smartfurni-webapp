import { getTheme } from "@/lib/theme-store";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Điều khoản sử dụng — SmartFurni",
  description: "Điều khoản và điều kiện sử dụng dịch vụ, mua hàng tại SmartFurni.",
};

const SECTIONS = [
  {
    icon: "📜",
    title: "1. Chấp nhận điều khoản",
    content: `Khi truy cập và sử dụng website smartfurni.vn hoặc thực hiện mua hàng tại SmartFurni, bạn đồng ý tuân thủ các điều khoản và điều kiện được quy định trong tài liệu này. Nếu bạn không đồng ý với bất kỳ điều khoản nào, vui lòng không sử dụng dịch vụ của chúng tôi.`,
  },
  {
    icon: "🛒",
    title: "2. Đặt hàng và thanh toán",
    content: `Tất cả đơn hàng được xác nhận qua email hoặc điện thoại. Giá sản phẩm được niêm yết bằng VNĐ và đã bao gồm VAT. SmartFurni chấp nhận thanh toán qua chuyển khoản ngân hàng, thẻ tín dụng/ghi nợ và tiền mặt khi giao hàng. Đơn hàng chỉ được xử lý sau khi thanh toán được xác nhận (đối với thanh toán trước).`,
  },
  {
    icon: "🚚",
    title: "3. Giao hàng và lắp đặt",
    content: `SmartFurni giao hàng toàn quốc. Thời gian giao hàng từ 3-7 ngày làm việc tùy khu vực. Dịch vụ lắp đặt miễn phí trong bán kính 30km từ showroom. Khách hàng cần có mặt tại địa điểm giao hàng để kiểm tra và ký nhận. Phí giao hàng được thông báo trước khi xác nhận đơn hàng.`,
  },
  {
    icon: "🔄",
    title: "4. Đổi trả và hoàn tiền",
    content: `SmartFurni chấp nhận đổi trả trong vòng 7 ngày kể từ ngày nhận hàng nếu sản phẩm bị lỗi do nhà sản xuất. Sản phẩm cần còn nguyên vẹn, chưa qua sử dụng và có đầy đủ phụ kiện, hộp đựng. Hoàn tiền được thực hiện trong vòng 7-14 ngày làm việc sau khi xác nhận đổi trả. Chi tiết xem tại trang Chính sách đổi trả.`,
  },
  {
    icon: "🛡️",
    title: "5. Bảo hành sản phẩm",
    content: `Tất cả sản phẩm SmartFurni đều được bảo hành theo chính sách bảo hành chính thức: khung giường 5 năm, động cơ 3 năm, bo mạch điều khiển 2 năm, đệm và phụ kiện 1 năm. Bảo hành không áp dụng cho hư hỏng do sử dụng sai cách, tai nạn hoặc sửa chữa ngoài ủy quyền. Chi tiết xem tại trang Chính sách bảo hành.`,
  },
  {
    icon: "💡",
    title: "6. Sở hữu trí tuệ",
    content: `Toàn bộ nội dung trên website bao gồm hình ảnh, văn bản, logo, thiết kế và phần mềm là tài sản của Công ty Cổ phần SmartFurni. Nghiêm cấm sao chép, phân phối hoặc sử dụng bất kỳ nội dung nào mà không có sự cho phép bằng văn bản của SmartFurni.`,
  },
  {
    icon: "⚠️",
    title: "7. Giới hạn trách nhiệm",
    content: `SmartFurni không chịu trách nhiệm về các thiệt hại gián tiếp, ngẫu nhiên hoặc hậu quả phát sinh từ việc sử dụng sản phẩm hoặc dịch vụ. Trách nhiệm tối đa của SmartFurni không vượt quá giá trị đơn hàng thực tế. SmartFurni không đảm bảo website hoạt động liên tục và không có lỗi.`,
  },
  {
    icon: "📝",
    title: "8. Thay đổi điều khoản",
    content: `SmartFurni có quyền cập nhật điều khoản sử dụng bất kỳ lúc nào mà không cần thông báo trước. Phiên bản mới nhất luôn được đăng tải trên website. Việc tiếp tục sử dụng dịch vụ sau khi điều khoản được cập nhật đồng nghĩa với việc bạn chấp nhận các thay đổi đó.`,
  },
  {
    icon: "⚖️",
    title: "9. Luật áp dụng",
    content: `Các điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Mọi tranh chấp phát sinh sẽ được giải quyết tại Tòa án nhân dân có thẩm quyền tại TP. Hồ Chí Minh. Các bên ưu tiên giải quyết tranh chấp thông qua thương lượng trước khi đưa ra tòa án.`,
  },
];

export default function TermsPage() {
  const theme = getTheme();
  const { colors } = theme;

  return (
    <main style={{ minHeight: "100vh", backgroundColor: colors.background }}>
      <Navbar theme={theme} />

      {/* Hero */}
      <div style={{ backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}` }} className="pt-24 pb-10 px-4 sm:px-6">
        <div style={{ maxWidth: 800 }} className="mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">📜</span>
            <span className="text-xs font-medium tracking-widest uppercase" style={{ color: colors.primary }}>
              Điều khoản sử dụng
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-light mb-4" style={{ color: colors.foreground }}>
            Điều khoản &amp; Điều kiện
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: `${colors.foreground}80` }}>
            Cập nhật lần cuối: Tháng 1, 2025 · Vui lòng đọc kỹ các điều khoản này trước khi sử dụng dịch vụ của SmartFurni.
          </p>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 800 }} className="mx-auto px-4 sm:px-6 py-12 space-y-6">
        {SECTIONS.map((section) => (
          <div
            key={section.title}
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            className="rounded-2xl border p-6 sm:p-8"
          >
            <h2 className="text-base font-semibold mb-4 flex items-center gap-3" style={{ color: colors.foreground }}>
              <span className="text-xl">{section.icon}</span>
              {section.title}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: `${colors.foreground}70` }}>
              {section.content}
            </p>
          </div>
        ))}

        {/* Contact */}
        <div style={{ backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }} className="rounded-2xl border p-6 sm:p-8">
          <h2 className="text-lg font-medium mb-3" style={{ color: colors.foreground }}>Liên hệ hỗ trợ</h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: `${colors.foreground}70` }}>
            Nếu bạn có câu hỏi về điều khoản sử dụng, vui lòng liên hệ:
          </p>
          <div className="space-y-2 text-sm" style={{ color: `${colors.foreground}80` }}>
            <div>📧 Email: <a href="mailto:info@smartfurni.vn" style={{ color: colors.primary }}>info@smartfurni.vn</a></div>
            <div>📞 Hotline: <a href="tel:02871220818" style={{ color: colors.primary }}>028.7122.0818</a></div>
            <div>🏢 Công ty Cổ phần SmartFurni — 74 Nguyễn Thị Nhung, KĐT Vạn Phúc City, TP. Thủ Đức, TP. HCM</div>
          </div>
        </div>
      </div>

      <Footer theme={theme} variant="minimal" />
    </main>
  );
}
