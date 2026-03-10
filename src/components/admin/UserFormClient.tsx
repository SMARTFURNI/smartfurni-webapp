"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AppUser, UserRole, UserStatus, UserSource } from "@/lib/user-store";

// ─── Config ───────────────────────────────────────────────────────────────────

const ROLE_OPTIONS: { value: UserRole; label: string; color: string; icon: string }[] = [
  { value: "customer", label: "Khách hàng", color: "text-blue-400", icon: "👤" },
  { value: "dealer", label: "Đại lý", color: "text-purple-400", icon: "🏪" },
  { value: "vip", label: "VIP", color: "text-yellow-400", icon: "⭐" },
  { value: "blocked", label: "Bị khóa", color: "text-red-400", icon: "🚫" },
];

const STATUS_OPTIONS: { value: UserStatus; label: string; color: string }[] = [
  { value: "active", label: "Đang hoạt động", color: "text-green-400" },
  { value: "inactive", label: "Không hoạt động", color: "text-gray-400" },
  { value: "blocked", label: "Bị khóa", color: "text-red-400" },
];

const SOURCE_OPTIONS: { value: UserSource; label: string; icon: string }[] = [
  { value: "organic", label: "Tìm kiếm tự nhiên (SEO)", icon: "🔍" },
  { value: "referral", label: "Giới thiệu từ bạn bè", icon: "🤝" },
  { value: "social", label: "Mạng xã hội", icon: "📱" },
  { value: "ads", label: "Quảng cáo trả phí", icon: "📢" },
  { value: "direct", label: "Trực tiếp / Khác", icon: "🏠" },
];

const CITIES = [
  "TP. Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Hải Phòng", "Cần Thơ",
  "Biên Hòa", "Nha Trang", "Vũng Tàu", "Huế", "Đà Lạt",
  "Buôn Ma Thuột", "Quy Nhơn", "Long Xuyên", "Mỹ Tho", "Rạch Giá",
];

const PRESET_TAGS = ["Khách VIP", "Đại lý miền Nam", "Đại lý miền Bắc", "Khách tiềm năng", "Khách cũ", "Ưu tiên hỗ trợ", "Đã demo sản phẩm", "Chờ tư vấn"];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UserFormClient({ user }: { user?: AppUser }) {
  const router = useRouter();
  const isEdit = !!user;

  // Basic info
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [city, setCity] = useState(user?.city || "TP. Hồ Chí Minh");

  // Classification
  const [role, setRole] = useState<UserRole>(user?.role || "customer");
  const [status, setStatus] = useState<UserStatus>(user?.status || "active");
  const [source, setSource] = useState<UserSource>(user?.source || "direct");

  // Extra
  const [notes, setNotes] = useState(user?.notes || "");
  const [tags, setTags] = useState<string[]>(user?.tags || []);
  const [tagInput, setTagInput] = useState("");

  // UI state
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState("");

  function addTag(tag: string) {
    const t = tag.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Bắt buộc";
    if (!phone.trim()) errs.phone = "Bắt buộc";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Email không hợp lệ";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    setSuccessMsg("");
    try {
      const payload = { name: name.trim(), email: email.trim(), phone: phone.trim(), city, role, status, source, notes: notes.trim() || undefined, tags };
      const url = isEdit ? `/api/admin/users/${user!.id}` : "/api/admin/users";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const err = await res.json();
        setErrors({ submit: err.error || "Có lỗi xảy ra" });
        return;
      }
      setSuccessMsg(isEdit ? "Đã lưu thay đổi!" : "Đã thêm khách hàng mới!");
      setTimeout(() => router.push("/admin/users"), 1200);
    } finally {
      setSaving(false);
    }
  }

  const selectedRole = ROLE_OPTIONS.find((r) => r.value === role);
  const selectedStatus = STATUS_OPTIONS.find((s) => s.value === status);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-white mb-3 flex items-center gap-1 transition-colors">
            ← Quay lại
          </button>
          <h1 className="text-2xl font-bold text-white">
            {isEdit ? `Chỉnh sửa: ${user!.name}` : "Thêm khách hàng mới"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isEdit ? "Cập nhật thông tin khách hàng" : "Điền thông tin để thêm khách hàng vào hệ thống"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/admin/users")} className="text-sm text-gray-400 hover:text-white border border-gray-700 px-4 py-2 rounded-xl transition-colors">
            Hủy
          </button>
          <button onClick={handleSubmit} disabled={saving} className="flex items-center gap-2 text-sm font-semibold bg-[#C9A84C] text-black px-6 py-2 rounded-xl hover:bg-[#E2C97E] transition-colors disabled:opacity-50">
            {saving ? "Đang lưu..." : isEdit ? "💾 Lưu thay đổi" : "✨ Thêm khách hàng"}
          </button>
        </div>
      </div>

      {/* Banners */}
      {successMsg && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">✓ {successMsg}</div>
      )}
      {errors.submit && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">✕ {errors.submit}</div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Main form */}
        <div className="lg:col-span-2 space-y-6">

          {/* Basic Info */}
          <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-[#C9A84C] uppercase tracking-wider mb-5">👤 Thông tin cơ bản</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Họ tên <span className="text-red-400">*</span></label>
                <input
                  type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Nguyễn Văn A"
                  className={`w-full bg-[#0D0B00] border ${errors.name ? "border-red-500/50" : "border-[#C9A84C]/15"} text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]/40`}
                />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Số điện thoại <span className="text-red-400">*</span></label>
                <input
                  type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="VD: 0901234567"
                  className={`w-full bg-[#0D0B00] border ${errors.phone ? "border-red-500/50" : "border-[#C9A84C]/15"} text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]/40`}
                />
                {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Email</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="VD: khachhang@email.com"
                  className={`w-full bg-[#0D0B00] border ${errors.email ? "border-red-500/50" : "border-[#C9A84C]/15"} text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]/40`}
                />
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Tỉnh / Thành phố</label>
                <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full bg-[#0D0B00] border border-[#C9A84C]/15 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]/40">
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Classification */}
          <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-[#C9A84C] uppercase tracking-wider mb-5">🏷️ Phân loại khách hàng</h2>

            {/* Role selector */}
            <div className="mb-5">
              <label className="block text-xs text-gray-500 mb-3">Loại khách hàng</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ROLE_OPTIONS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setRole(r.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all ${
                      role === r.value
                        ? "border-[#C9A84C]/40 bg-[#C9A84C]/10 text-[#C9A84C]"
                        : "border-[#C9A84C]/10 bg-[#0D0B00] text-gray-500 hover:border-[#C9A84C]/20 hover:text-gray-300"
                    }`}
                  >
                    <span className="text-xl">{r.icon}</span>
                    <span>{r.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Trạng thái tài khoản</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as UserStatus)} className="w-full bg-[#0D0B00] border border-[#C9A84C]/15 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]/40">
                  {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Nguồn khách hàng</label>
                <select value={source} onChange={(e) => setSource(e.target.value as UserSource)} className="w-full bg-[#0D0B00] border border-[#C9A84C]/15 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]/40">
                  {SOURCE_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.icon} {s.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-[#C9A84C] uppercase tracking-wider mb-5">🔖 Tags & Nhãn</h2>

            {/* Preset tags */}
            <div className="mb-4">
              <p className="text-xs text-gray-600 mb-2">Tags có sẵn (click để thêm):</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_TAGS.map((t) => (
                  <button
                    key={t}
                    onClick={() => addTag(t)}
                    disabled={tags.includes(t)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      tags.includes(t)
                        ? "border-[#C9A84C]/30 bg-[#C9A84C]/10 text-[#C9A84C] cursor-default"
                        : "border-gray-700 text-gray-500 hover:border-[#C9A84C]/20 hover:text-gray-300"
                    }`}
                  >
                    {tags.includes(t) ? "✓ " : "+ "}{t}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom tag input */}
            <div className="flex gap-2 mb-4">
              <input
                type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }}
                placeholder="Nhập tag tùy chỉnh rồi nhấn Enter..."
                className="flex-1 bg-[#0D0B00] border border-[#C9A84C]/15 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]/40"
              />
              <button onClick={() => addTag(tagInput)} className="text-sm px-4 py-2.5 bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/20 rounded-xl hover:bg-[#C9A84C]/20 transition-colors">
                Thêm
              </button>
            </div>

            {/* Active tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <span key={t} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/20 text-[#C9A84C]">
                    {t}
                    <button onClick={() => removeTag(t)} className="text-[#C9A84C]/60 hover:text-red-400 transition-colors ml-0.5">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-[#C9A84C] uppercase tracking-wider mb-5">📝 Ghi chú nội bộ</h2>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
              placeholder="Ghi chú về khách hàng này (chỉ admin thấy)..."
              className="w-full bg-[#0D0B00] border border-[#C9A84C]/15 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C9A84C]/40 resize-none"
            />
          </div>
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-5">

          {/* Avatar placeholder */}
          <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-5 text-center">
            <div className="w-20 h-20 rounded-full bg-[#C9A84C]/10 border-2 border-[#C9A84C]/20 flex items-center justify-center mx-auto mb-3">
              <span className="text-3xl">{selectedRole?.icon || "👤"}</span>
            </div>
            <p className="text-white font-semibold text-sm">{name || "Tên khách hàng"}</p>
            <p className="text-gray-600 text-xs mt-1">{email || "email@example.com"}</p>
            <p className="text-gray-600 text-xs">{phone || "Số điện thoại"}</p>
            <div className="mt-3 flex justify-center gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/20 ${selectedRole?.color}`}>
                {selectedRole?.icon} {selectedRole?.label}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 ${selectedStatus?.color}`}>
                {selectedStatus?.label}
              </span>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-[#C9A84C] uppercase tracking-wider mb-4">📋 Tóm tắt</h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Họ tên:</span>
                <span className="text-gray-300 text-right max-w-[140px] truncate">{name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Điện thoại:</span>
                <span className="text-gray-300">{phone || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Thành phố:</span>
                <span className="text-gray-300">{city}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Loại:</span>
                <span className={selectedRole?.color}>{selectedRole?.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Trạng thái:</span>
                <span className={selectedStatus?.color}>{selectedStatus?.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Nguồn:</span>
                <span className="text-gray-300">{SOURCE_OPTIONS.find((s) => s.value === source)?.label.split(" (")[0]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tags:</span>
                <span className="text-gray-300">{tags.length > 0 ? `${tags.length} nhãn` : "Chưa có"}</span>
              </div>
            </div>
          </div>

          {/* Existing user stats (edit mode) */}
          {isEdit && (
            <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-[#C9A84C] uppercase tracking-wider mb-4">📊 Thống kê</h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tổng đơn hàng:</span>
                  <span className="text-white font-semibold">{user!.totalOrders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tổng chi tiêu:</span>
                  <span className="text-[#C9A84C] font-semibold">
                    {user!.totalSpent >= 1_000_000 ? `${(user!.totalSpent / 1_000_000).toFixed(0)}M` : user!.totalSpent.toLocaleString("vi-VN")}đ
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Thiết bị:</span>
                  <span className="text-gray-300">{user!.devices.length} thiết bị</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Đăng ký:</span>
                  <span className="text-gray-300">{new Date(user!.registeredAt).toLocaleDateString("vi-VN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Hoạt động:</span>
                  <span className="text-gray-300">{new Date(user!.lastActiveAt).toLocaleDateString("vi-VN")}</span>
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="space-y-2">
            <button onClick={handleSubmit} disabled={saving} className="w-full text-sm font-semibold bg-[#C9A84C] text-black py-3 rounded-xl hover:bg-[#E2C97E] transition-colors disabled:opacity-50">
              {saving ? "Đang lưu..." : isEdit ? "💾 Lưu thay đổi" : "✨ Thêm khách hàng"}
            </button>
            <button onClick={() => router.push("/admin/users")} className="w-full text-sm text-gray-500 hover:text-white py-2.5 rounded-xl border border-gray-700 transition-colors">
              Hủy bỏ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
