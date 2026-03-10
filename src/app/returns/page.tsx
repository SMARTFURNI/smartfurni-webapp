import { getTheme } from "@/lib/theme-store";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Chính sách đổi trả — SmartFurni",
  description: "Chính sách đổi trả 30 ngày dùng thử không rủi ro của SmartFurni.",
};

export default function ReturnsPage() {
  const theme = getTheme();
  const { colors, pageReturns } = theme;

  return (
    <main style={{ minHeight: "100vh", backgroundColor: colors.background }}>
      <Navbar theme={theme} />

      {/* Hero */}
      <section className="pt-28 pb-14 px-4 sm:px-6 text-center">
        <div className="inline-flex items-center gap-3 mb-4">
          <span className="w-8 h-px bg-[#C9A84C]" />
          <span className="text-xs font-medium tracking-wider uppercase text-[#C9A84C]">{pageReturns?.heroBadge ?? "Không rủi ro"}</span>
          <span className="w-8 h-px bg-[#C9A84C]" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-light text-[#F5EDD6] mb-4">
          {pageReturns?.heroTitle ?? "Chính sách Đổi trả"}
        </h1>
        <p className="text-sm text-[#F5EDD6]/50 max-w-xl mx-auto">
          {pageReturns?.heroSubtitle ?? "30 ngày dùng thử tại nhà — không thích, hoàn tiền 100%."}
        </p>
      </section>

      <div style={{ maxWidth: "900px" }} className="mx-auto px-4 sm:px-6 pb-20 space-y-8">
        {/* Key promises */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { icon: "📅", title: "30 ngày dùng thử", desc: "Dùng thử tại nhà trong 30 ngày. Không hài lòng, đổi trả không câu hỏi." },
            { icon: "🚚", title: "Miễn phí vận chuyển", desc: "SmartFurni chịu toàn bộ chi phí vận chuyển đổi trả, không trừ vào tiền hoàn." },
            { icon: "💰", title: "Hoàn tiền 100%", desc: "Hoàn tiền đầy đủ trong 3–5 ngày làm việc qua phương thức thanh toán ban đầu." },
          ].map((item) => (
            <div
              key={item.title}
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              className="rounded-2xl border p-6 text-center"
            >
              <div className="text-3xl mb-3">{item.icon}</div>
              <h3 className="text-sm font-semibold text-[#F5EDD6] mb-2">{item.title}</h3>
              <p className="text-xs text-[#F5EDD6]/50 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Conditions */}
        <div style={{ backgroundColor: colors.surface, borderColor: colors.border }} className="rounded-2xl border p-6 sm:p-8">
          <h2 className="text-xl font-light text-[#F5EDD6] mb-6">Điều kiện đổi trả</h2>
          <div className="space-y-3">
            {[
              "Yêu cầu đổi trả trong vòng 30 ngày kể từ ngày nhận hàng",
              "Sản phẩm phải còn đầy đủ phụ kiện, hộp đựng và tài liệu đi kèm",
              "Sản phẩm không bị hư hỏng do người dùng gây ra",
              "Áp dụng cho tất cả sản phẩm giường SmartFurni (Basic, Pro, Elite)",
              "Phụ kiện riêng lẻ (remote, đệm bổ sung) được đổi trả trong 14 ngày",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span style={{ color: "#C9A84C" }} className="mt-0.5 flex-shrink-0 text-sm">✓</span>
                <p className="text-sm text-[#F5EDD6]/60 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Process */}
        <div style={{ backgroundColor: colors.surface, borderColor: colors.border }} className="rounded-2xl border p-6 sm:p-8">
          <h2 className="text-xl font-light text-[#F5EDD6] mb-6">Quy trình đổi trả</h2>
          <div className="space-y-4">
            {[
              { step: "01", title: "Liên hệ trong 30 ngày", desc: `Gọi ${pageReturns?.hotline ?? "1900 1234"} hoặc email ${pageReturns?.email ?? "returns@smartfurni.vn"} với mã đơn hàng và lý do đổi trả.` },
              { step: "02", title: "Xác nhận & lên lịch thu hàng", desc: "Đội hỗ trợ xác nhận yêu cầu và lên lịch thu hàng tại nhà bạn trong 1–2 ngày làm việc." },
              { step: "03", title: "Thu hàng miễn phí", desc: "Đội vận chuyển đến thu hàng, đóng gói và vận chuyển về kho — bạn không cần làm gì thêm." },
              { step: "04", title: "Hoàn tiền 3–5 ngày", desc: "Sau khi kiểm tra hàng, SmartFurni hoàn tiền đầy đủ trong 3–5 ngày làm việc." },
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
        <div className="text-center py-4">
          <p className="text-sm text-[#F5EDD6]/50 mb-4">Muốn đổi trả sản phẩm?</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={`tel:${(pageReturns?.hotline ?? "19001234").replace(/\s/g, "")}`}
              style={{ background: "linear-gradient(135deg, #C9A84C, #8B6914)", color: "#fff" }}
              className="px-6 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              📞 Gọi {pageReturns?.hotline ?? "1900 1234"}
            </a>
            <a
              href={`mailto:${pageReturns?.email ?? "returns@smartfurni.vn"}`}
              style={{ borderColor: "#C9A84C", color: "#C9A84C" }}
              className="px-6 py-3 rounded-xl text-sm font-semibold border hover:opacity-70 transition-opacity"
            >
              ✉️ {pageReturns?.email ?? "returns@smartfurni.vn"}
            </a>
          </div>
        </div>
      </div>

      <Footer theme={theme} variant="minimal" />
    </main>
  );
}
