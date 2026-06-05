"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type LpEditPasswordGateProps = {
  slug: string;
  isEditor: boolean;
  hasPassword?: boolean;
};

export default function LpEditPasswordGate({ slug, isEditor, hasPassword = false }: LpEditPasswordGateProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editRequested = useMemo(() => {
    const edit = searchParams?.get("edit");
    const admin = searchParams?.get("admin");
    return edit === "1" || edit === "true" || admin === "1" || admin === "true";
  }, [searchParams]);

  if (!editRequested || isEditor) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!password) {
      setError("Vui lòng nhập mật khẩu quản trị landing page.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/lp-content", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify-edit-password",
          slug,
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "Sai mật khẩu quản trị landing page.");
        return;
      }
      router.refresh();
    } catch {
      setError("Không thể xác thực mật khẩu. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-3xl border border-[#C9A84C]/30 bg-white p-6 shadow-2xl"
      >
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#B08A2E]">SmartFurni Admin</p>
        <h1 className="mt-3 text-2xl font-black text-slate-950">Nhập mật khẩu chỉnh sửa landing page</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Landing page <span className="font-mono font-semibold text-slate-900">{slug}</span> được bảo vệ bằng mật khẩu riêng. Nhập đúng mật khẩu để bật chế độ chỉnh sửa nội dung trực tiếp trên trang.
        </p>

        {!hasPassword && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Trang này chưa được cài mật khẩu riêng. Vui lòng vào mục quản trị Landing Pages và bấm <strong>Mật khẩu</strong> để cài trước khi chỉnh sửa.
          </div>
        )}

        <label className="mt-5 block text-sm font-bold text-slate-800">Mật khẩu quản trị</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-[#C9A84C] focus:ring-4 focus:ring-[#C9A84C]/15"
          placeholder="Nhập mật khẩu của landing page này"
        />
        {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={submitting || !hasPassword}
            className="flex-1 rounded-2xl bg-gradient-to-r from-[#C9A84C] to-[#9A7A2E] px-4 py-3 text-sm font-bold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Đang kiểm tra..." : "Mở khóa chỉnh sửa"}
          </button>
          <button
            type="button"
            onClick={() => window.location.href = window.location.pathname}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Thoát
          </button>
        </div>
      </form>
    </div>
  );
}
