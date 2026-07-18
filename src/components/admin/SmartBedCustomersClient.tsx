"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Copy,
  KeyRound,
  MonitorSmartphone,
  Search,
  ShieldCheck,
  Smartphone,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import type { SmartBedAdminCustomer } from "@/lib/smart-bed-auth";

function formatDate(value: string | null) {
  if (!value) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function platformLabel(platform: string) {
  if (platform === "ios-pwa") return "iPhone / iPad";
  if (platform === "android-pwa") return "Android";
  if (platform === "desktop-pwa") return "Máy tính";
  return platform || "PWA";
}

export default function SmartBedCustomersClient({ initialCustomers }: { initialCustomers: SmartBedAdminCustomer[] }) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "installed" | "not-installed">("all");
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<{ name: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const stats = useMemo(() => {
    const installed = customers.filter((customer) => customer.installedAt).length;
    const paired = customers.filter((customer) => customer.deviceCount > 0).length;
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = customers.filter((customer) => new Date(customer.createdAt).getTime() >= monthAgo).length;
    return { total: customers.length, installed, paired, recent };
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("vi");
    return customers.filter((customer) => {
      if (filter === "installed" && !customer.installedAt) return false;
      if (filter === "not-installed" && customer.installedAt) return false;
      if (!term) return true;
      return customer.fullName.toLocaleLowerCase("vi").includes(term)
        || customer.email.toLocaleLowerCase("vi").includes(term)
        || customer.phone.includes(term);
    });
  }, [customers, filter, search]);

  const refresh = async () => {
    const response = await fetch("/api/admin/app-customers", { cache: "no-store" });
    const data = await response.json() as { customers?: SmartBedAdminCustomer[] };
    if (response.ok && data.customers) setCustomers(data.customers);
  };

  const resetPassword = async (customer: SmartBedAdminCustomer) => {
    if (!window.confirm(`Cấp mật khẩu tạm thời mới cho ${customer.fullName}? Tài khoản sẽ đăng xuất khỏi các thiết bị hiện tại.`)) return;
    setResettingId(customer.id);
    setError("");
    try {
      const response = await fetch("/api/admin/app-customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_password", userId: customer.id }),
      });
      const data = await response.json() as { temporaryPassword?: string; error?: string };
      if (!response.ok || !data.temporaryPassword) throw new Error(data.error || "Không thể cấp lại mật khẩu.");
      setTemporaryPassword({ name: customer.fullName, password: data.temporaryPassword });
      setCopied(false);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể cấp lại mật khẩu.");
    } finally {
      setResettingId(null);
    }
  };

  const copyPassword = async () => {
    if (!temporaryPassword) return;
    await navigator.clipboard.writeText(temporaryPassword.password);
    setCopied(true);
  };

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: "Tài khoản đã tạo", value: stats.total, note: `${stats.recent} tài khoản trong 30 ngày`, icon: UsersRound, color: "#d7b957" },
          { label: "Đã cài ứng dụng", value: stats.installed, note: stats.total ? `${Math.round((stats.installed / stats.total) * 100)}% tổng tài khoản` : "Chưa có dữ liệu", icon: Smartphone, color: "#5ea0ff" },
          { label: "Đã ghép thiết bị", value: stats.paired, note: "Có giường hoặc nệm đã kết nối", icon: MonitorSmartphone, color: "#54d68b" },
          { label: "Bảo mật tài khoản", value: "Băm", note: "Không lưu mật khẩu dạng đọc được", icon: ShieldCheck, color: "#b985ff" },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="rounded-2xl border border-[rgba(224,197,111,.14)] bg-[linear-gradient(145deg,rgba(26,35,52,.84),rgba(35,25,13,.78))] p-4 shadow-xl shadow-black/10 md:p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/5 bg-black/20" style={{ color: card.color }}><Icon size={20} /></span>
                <strong className="text-2xl text-[#f5edd6] md:text-3xl">{card.value}</strong>
              </div>
              <h2 className="text-xs font-bold text-[#f5edd6] md:text-sm">{card.label}</h2>
              <p className="mt-1 text-[10px] leading-4 text-[rgba(245,237,214,.42)] md:text-xs">{card.note}</p>
            </article>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[rgba(224,197,111,.14)] bg-[linear-gradient(145deg,rgba(22,29,43,.88),rgba(30,23,14,.84))]">
        <div className="flex flex-col gap-3 border-b border-white/5 p-4 md:flex-row md:items-center md:justify-between md:p-5">
          <div>
            <h2 className="text-base font-bold text-[#f5edd6]">Danh sách khách hàng ứng dụng</h2>
            <p className="mt-1 text-xs text-[rgba(245,237,214,.42)]">{filteredCustomers.length} tài khoản phù hợp</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex h-10 min-w-0 items-center gap-2 rounded-xl border border-[rgba(224,197,111,.13)] bg-black/20 px-3 sm:w-64">
              <Search size={15} className="text-[#d7b957]" />
              <input className="min-w-0 flex-1 bg-transparent text-xs text-[#f5edd6] outline-none placeholder:text-white/25" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tên, email, số điện thoại..." />
            </label>
            <select className="h-10 rounded-xl border border-[rgba(224,197,111,.13)] bg-[#15191f] px-3 text-xs text-[#f5edd6] outline-none" value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}>
              <option value="all">Tất cả tài khoản</option>
              <option value="installed">Đã cài ứng dụng</option>
              <option value="not-installed">Chưa ghi nhận cài</option>
            </select>
          </div>
        </div>

        {error && <div className="m-4 rounded-xl border border-red-400/20 bg-red-500/5 px-4 py-3 text-xs text-red-300">{error}</div>}

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-black/15 text-[10px] uppercase tracking-wider text-white/35">
              <tr><th className="px-5 py-3">Khách hàng</th><th className="px-4 py-3">Liên hệ</th><th className="px-4 py-3">Cài ứng dụng</th><th className="px-4 py-3">Thiết bị</th><th className="px-4 py-3">Ngày tạo</th><th className="px-5 py-3 text-right">Hỗ trợ</th></tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="border-t border-white/5 text-xs hover:bg-white/[.025]">
                  <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#d7b957]/10 text-[#e5ca72]"><UserRound size={17} /></span><div><b className="block text-sm text-[#f5edd6]">{customer.fullName}</b><span className="text-[10px] text-white/30">{customer.id.slice(0, 14)}</span></div></div></td>
                  <td className="px-4 py-4"><span className="block text-[#f5edd6]/70">{customer.email}</span><span className="mt-1 block text-white/35">{customer.phone || "Chưa cập nhật SĐT"}</span></td>
                  <td className="px-4 py-4">{customer.installedAt ? <><span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-1 text-blue-300"><Check size={12} /> {platformLabel(customer.installPlatform)}</span><small className="mt-1 block text-white/30">{formatDate(customer.installedAt)}</small></> : <span className="text-white/30">Chưa ghi nhận</span>}</td>
                  <td className="px-4 py-4"><b className={customer.deviceCount ? "text-emerald-300" : "text-white/30"}>{customer.deviceCount} thiết bị</b><small className="mt-1 block text-white/30">{customer.lastDeviceSeenAt ? `Lần cuối ${formatDate(customer.lastDeviceSeenAt)}` : "Chưa ghép đôi"}</small></td>
                  <td className="px-4 py-4 text-white/45">{formatDate(customer.createdAt)}</td>
                  <td className="px-5 py-4 text-right"><button type="button" onClick={() => void resetPassword(customer)} disabled={resettingId === customer.id} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[#d7b957]/20 bg-[#d7b957]/5 px-3 text-[11px] font-bold text-[#e3c86d] hover:bg-[#d7b957]/10 disabled:opacity-50"><KeyRound size={14} /> {resettingId === customer.id ? "Đang cấp..." : "Cấp lại mật khẩu"}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 p-3 md:hidden">
          {filteredCustomers.map((customer) => (
            <article key={customer.id} className="rounded-2xl border border-white/7 bg-black/15 p-4">
              <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#d7b957]/10 text-[#e5ca72]"><UserRound size={18} /></span><div className="min-w-0 flex-1"><b className="block truncate text-sm text-[#f5edd6]">{customer.fullName}</b><span className="block truncate text-[10px] text-white/40">{customer.email}</span><span className="text-[10px] text-white/35">{customer.phone || "Chưa cập nhật SĐT"}</span></div>{customer.installedAt ? <span className="rounded-full bg-blue-500/10 px-2 py-1 text-[9px] text-blue-300">Đã cài</span> : <span className="rounded-full bg-white/5 px-2 py-1 text-[9px] text-white/30">Chưa cài</span>}</div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]"><div className="rounded-xl bg-white/[.025] p-2.5"><span className="block text-white/30">Thiết bị</span><b className="mt-1 block text-[#f5edd6]/75">{customer.deviceCount} đã ghép</b></div><div className="rounded-xl bg-white/[.025] p-2.5"><span className="block text-white/30">Ngày tạo</span><b className="mt-1 block text-[#f5edd6]/75">{formatDate(customer.createdAt)}</b></div></div>
              <button type="button" onClick={() => void resetPassword(customer)} disabled={resettingId === customer.id} className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#d7b957]/20 bg-[#d7b957]/5 text-[11px] font-bold text-[#e3c86d] disabled:opacity-50"><KeyRound size={14} /> {resettingId === customer.id ? "Đang cấp..." : "Cấp lại mật khẩu"}</button>
            </article>
          ))}
        </div>

        {filteredCustomers.length === 0 && <div className="px-5 py-14 text-center text-sm text-white/35">Không tìm thấy tài khoản phù hợp.</div>}
      </section>

      {temporaryPassword && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="presentation" onMouseDown={() => setTemporaryPassword(null)}>
          <section className="relative w-full max-w-md rounded-3xl border border-[rgba(224,197,111,.22)] bg-[linear-gradient(145deg,#182235,#21180d)] p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="temporary-password-title" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-white/45" onClick={() => setTemporaryPassword(null)} aria-label="Đóng"><X size={17} /></button>
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-[#d7b957]/20 bg-[#d7b957]/10 text-[#e5ca72]"><KeyRound size={23} /></span>
            <h2 id="temporary-password-title" className="mt-4 text-xl font-bold text-[#f5edd6]">Mật khẩu tạm thời</h2>
            <p className="mt-2 text-xs leading-5 text-white/45">Gửi mật khẩu này riêng cho <b className="text-[#f5edd6]/80">{temporaryPassword.name}</b>. Mật khẩu chỉ hiển thị trong lần này và các phiên đăng nhập cũ đã được đăng xuất.</p>
            <div className="mt-5 flex items-center gap-2 rounded-2xl border border-[#d7b957]/20 bg-black/25 p-2 pl-4"><code className="min-w-0 flex-1 text-lg font-bold tracking-wider text-[#f0db91]">{temporaryPassword.password}</code><button type="button" onClick={() => void copyPassword()} className="flex h-11 items-center gap-2 rounded-xl bg-[#d7b957] px-4 text-xs font-bold text-[#171205]">{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Đã chép" : "Sao chép"}</button></div>
          </section>
        </div>
      )}
    </div>
  );
}
