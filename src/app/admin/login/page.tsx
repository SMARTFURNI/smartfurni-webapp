"use client";
import { useState } from "react";
import { Eye, EyeOff, LogIn, ShieldCheck } from "lucide-react";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Tên đăng nhập hoặc mật khẩu không đúng");
      } else {
        // Full page reload để tránh Next.js router cache
        window.location.href = "/admin/choose-module";
      }
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center px-4">
      {/* Subtle dot pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, #C9A84C 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#E2C97E] to-[#9A7A2E] mb-4 shadow-lg shadow-[#C9A84C]/20">
            <span className="text-white font-bold text-2xl">SF</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-widest">SMARTFURNI</h1>
          {/* Admin badge — phân biệt với trang nhân viên */}
          <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/30">
            <ShieldCheck size={13} className="text-[#C9A84C]" />
            <span className="text-[#9A7A2E] text-xs font-semibold tracking-wide">
              Cổng Quản Trị Viên
            </span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Đăng nhập</h2>
            <p className="text-sm text-gray-500 mt-1">
              Dành riêng cho quản trị viên hệ thống SmartFurni
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Tên đăng nhập
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập username admin..."
                required
                autoComplete="username"
                autoFocus
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-[#C9A84C] focus:bg-white transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  required
                  autoComplete="current-password"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-11 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-[#C9A84C] focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0">⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full flex items-center justify-center gap-2 bg-[#C9A84C] hover:bg-[#b8963e] text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={18} />
                  Đăng nhập
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              Quên mật khẩu? Liên hệ kỹ thuật viên để được cấp lại
            </p>
          </div>
        </div>

        {/* Staff link */}
        <p className="text-center text-xs text-gray-400 mt-5">
          Là nhân viên CRM?{" "}
          <a href="/crm-login" className="text-[#C9A84C] hover:underline font-medium">
            Đăng nhập tại đây
          </a>
        </p>

        <p className="text-center text-xs text-gray-300 mt-3">
          © 2026 SmartFurni — Hệ thống quản trị nội bộ
        </p>
      </div>
    </div>
  );
}
