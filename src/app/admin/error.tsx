"use client";
import Link from "next/link";
import { useEffect } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#130e00] flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="w-24 h-24 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <TriangleAlert className="h-10 w-10 text-red-400" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">Đã xảy ra lỗi</h1>
        <p className="text-[rgba(245,237,214,0.55)] text-sm mb-2 leading-relaxed">
          Có lỗi xảy ra khi tải trang này. Vui lòng thử lại hoặc liên hệ hỗ trợ kỹ thuật.
        </p>
        {error.message && (
          <p className="text-red-400/60 text-xs font-mono bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2 mb-6 break-all">
            {error.message}
          </p>
        )}

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 bg-[#C9A84C] text-black text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#E2C97E] transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> Thử lại
          </button>
          <Link
            href="/admin"
            className="flex items-center gap-2 border border-[rgba(255,200,100,0.22)] text-[rgba(245,237,214,0.70)] hover:text-white text-sm px-5 py-2.5 rounded-xl hover:border-[#C9A84C]/40 transition-colors"
          >
            ← Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
