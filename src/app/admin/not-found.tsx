import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="min-h-screen bg-[#130e00] flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#E2C97E]/10 to-[#9A7A2E]/10 border border-[rgba(255,200,100,0.14)] flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">🔍</span>
        </div>

        {/* Error code */}
        <div className="text-8xl font-black text-[#C9A84C]/10 leading-none mb-2 select-none">404</div>

        {/* Message */}
        <h1 className="text-2xl font-bold text-white mb-3">Trang không tồn tại</h1>
        <p className="text-[rgba(245,237,214,0.55)] text-sm mb-8 leading-relaxed">
          Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển sang địa chỉ khác.
        </p>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { href: "/admin", label: "Dashboard", icon: "📊" },
            { href: "/admin/posts", label: "Bài viết", icon: "📝" },
            { href: "/admin/products", label: "Sản phẩm", icon: "🛏️" },
            { href: "/admin/orders", label: "Đơn hàng", icon: "📋" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#1a1200] border border-[rgba(255,200,100,0.14)] text-sm text-[rgba(245,237,214,0.70)] hover:text-white hover:border-[#C9A84C]/25 transition-all"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <Link
          href="/admin"
          className="inline-flex items-center gap-2 bg-[#C9A84C] text-black text-sm font-semibold px-6 py-3 rounded-xl hover:bg-[#E2C97E] transition-colors"
        >
          ← Về Dashboard
        </Link>
      </div>
    </div>
  );
}
