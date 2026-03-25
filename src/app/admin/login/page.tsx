"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
        setError(data.error || "Đăng nhập thất bại");
      } else {
        // Dùng window.location.href để full page reload, tránh Next.js router cache
        window.location.href = "/admin";
      }
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0D0B00] flex items-center justify-center px-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, #C9A84C 1px, transparent 0)",
          backgroundSize: "32px 32px"
        }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#E2C97E] to-[#9A7A2E] mb-4 shadow-lg shadow-[#C9A84C]/20">
            <span className="text-[#0D0B00] font-bold text-2xl">SF</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-widest">SMARTFURNI</h1>
          <p className="text-[#C9A84C]/60 text-sm mt-1">Trang Quản Trị</p>
        </div>

        {/* Login Card */}
        <div className="bg-[#1A1500]/80 backdrop-blur border border-[#C9A84C]/20 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">Đăng Nhập</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-[#C9A84C]/80 mb-2">Tên đăng nhập</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
                className="w-full bg-[#0D0B00] border border-[#C9A84C]/20 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#C9A84C]/60 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-[#C9A84C]/80 mb-2">Mật khẩu</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[#0D0B00] border border-[#C9A84C]/20 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#C9A84C]/60 transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#C9A84C] to-[#E2C97E] text-[#0D0B00] font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 mt-2"
            >
              {loading ? "Đang đăng nhập..." : "Đăng Nhập"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#C9A84C]/10">
            <p className="text-xs text-gray-600 text-center">
              Mặc định: admin / smartfurni2026
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-700 mt-6">
          © 2026 SmartFurni Admin Panel
        </p>
      </div>
    </div>
  );
}
