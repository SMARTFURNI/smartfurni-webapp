"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  User, Mail, Phone, Shield, Key, Save, ArrowLeft,
  CheckCircle, AlertCircle, Eye, EyeOff, Edit3
} from "lucide-react";
import type { StaffMember } from "@/lib/crm-staff-store";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Quản trị viên",
  manager: "Trưởng nhóm",
  senior_sales: "Kinh doanh cấp cao",
  sales: "Kinh doanh",
  support: "Hỗ trợ KH",
};

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  super_admin: { bg: "#fef3c7", text: "#92400e" },
  manager: { bg: "#ede9fe", text: "#5b21b6" },
  senior_sales: { bg: "#dbeafe", text: "#1e40af" },
  sales: { bg: "#dcfce7", text: "#166534" },
  support: { bg: "#fce7f3", text: "#9d174d" },
};

interface Props {
  staff: StaffMember;
}

export default function StaffProfileClient({ staff }: Props) {
  const router = useRouter();

  // Form thông tin cá nhân
  const [form, setForm] = useState({
    fullName: staff.fullName,
    email: staff.email,
    phone: staff.phone,
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form đổi mật khẩu
  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/crm/staff/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveMsg({ type: "success", text: "Đã lưu thông tin thành công!" });
        setTimeout(() => setSaveMsg(null), 3000);
      } else {
        setSaveMsg({ type: "error", text: data.error || "Lưu thất bại" });
      }
    } catch {
      setSaveMsg({ type: "error", text: "Lỗi kết nối, vui lòng thử lại" });
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMsg({ type: "error", text: "Mật khẩu mới không khớp" });
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwMsg({ type: "error", text: "Mật khẩu mới phải có ít nhất 6 ký tự" });
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch("/api/crm/staff/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: pwForm.currentPassword,
          newPassword: pwForm.newPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwMsg({ type: "success", text: "Đã đổi mật khẩu thành công!" });
        setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setTimeout(() => setPwMsg(null), 3000);
      } else {
        setPwMsg({ type: "error", text: data.error || "Đổi mật khẩu thất bại" });
      }
    } catch {
      setPwMsg({ type: "error", text: "Lỗi kết nối, vui lòng thử lại" });
    } finally {
      setPwSaving(false);
    }
  }

  const roleStyle = ROLE_COLORS[staff.role] ?? { bg: "#f3f4f6", text: "#374151" };
  const initials = staff.fullName
    .split(" ")
    .map(w => w[0])
    .slice(-2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col h-full bg-[#f4f5f7] overflow-y-auto">
      {/* Header */}
      <div className="flex-shrink-0 bg-white px-8 py-5 flex items-center gap-4"
        style={{ borderBottom: "1px solid #e8eaed" }}>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={16} />
          Quay lại
        </button>
        <div className="w-px h-5 bg-gray-200" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Hồ sơ cá nhân</h1>
          <p className="text-xs text-gray-500 mt-0.5">Xem và chỉnh sửa thông tin tài khoản của bạn</p>
        </div>
      </div>

      <div className="p-6 max-w-3xl mx-auto w-full space-y-5">

        {/* Avatar & tổng quan */}
        <div className="bg-white rounded-xl p-6 flex items-center gap-5"
          style={{ border: "1px solid #e8eaed" }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #C9A84C, #9A7A2E)" }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900">{staff.fullName}</h2>
            <p className="text-sm text-gray-500">@{staff.username}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: roleStyle.bg, color: roleStyle.text }}>
                <Shield size={10} />
                {ROLE_LABELS[staff.role] ?? staff.role}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                Đang hoạt động
              </span>
            </div>
          </div>
          <div className="text-right text-xs text-gray-400">
            <div>Tài khoản</div>
            <div className="font-mono font-semibold text-gray-600 mt-0.5">{staff.username}</div>
          </div>
        </div>

        {/* Form thông tin cá nhân */}
        <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1px solid #e8eaed" }}>
          <div className="px-6 py-4 flex items-center gap-2.5" style={{ borderBottom: "1px solid #f0f0f0" }}>
            <Edit3 size={16} className="text-gray-500" />
            <h3 className="font-semibold text-gray-800">Thông tin cá nhân</h3>
          </div>
          <form onSubmit={handleSaveInfo} className="p-6 space-y-4">
            {/* Họ tên */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                <User size={12} className="inline mr-1" />
                Họ và tên
              </label>
              <input
                type="text"
                value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                required
                className="w-full px-3 py-2.5 rounded-lg text-sm text-gray-800 bg-gray-50 outline-none transition-all"
                style={{ border: "1.5px solid #e5e7eb" }}
                onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
                placeholder="Nhập họ và tên đầy đủ"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                <Mail size={12} className="inline mr-1" />
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg text-sm text-gray-800 bg-gray-50 outline-none transition-all"
                style={{ border: "1.5px solid #e5e7eb" }}
                onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
                placeholder="email@smartfurni.vn"
              />
            </div>

            {/* Số điện thoại */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                <Phone size={12} className="inline mr-1" />
                Số điện thoại
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg text-sm text-gray-800 bg-gray-50 outline-none transition-all"
                style={{ border: "1.5px solid #e5e7eb" }}
                onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
                placeholder="0901 234 567"
              />
            </div>

            {/* Thông tin chỉ đọc */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Tên đăng nhập</label>
                <div className="px-3 py-2.5 rounded-lg text-sm text-gray-500 bg-gray-100 font-mono"
                  style={{ border: "1.5px solid #e5e7eb" }}>
                  {staff.username}
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Không thể thay đổi</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Vai trò</label>
                <div className="px-3 py-2.5 rounded-lg text-sm text-gray-500 bg-gray-100"
                  style={{ border: "1.5px solid #e5e7eb" }}>
                  {ROLE_LABELS[staff.role] ?? staff.role}
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Do quản trị viên cấp</p>
              </div>
            </div>

            {/* Thông báo */}
            {saveMsg && (
              <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm ${
                saveMsg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
              }`}>
                {saveMsg.type === "success"
                  ? <CheckCircle size={15} />
                  : <AlertCircle size={15} />}
                {saveMsg.text}
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #C9A84C, #9A7A2E)" }}
              >
                <Save size={14} />
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        </div>

        {/* Form đổi mật khẩu */}
        <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1px solid #e8eaed" }}>
          <div className="px-6 py-4 flex items-center gap-2.5" style={{ borderBottom: "1px solid #f0f0f0" }}>
            <Key size={16} className="text-gray-500" />
            <h3 className="font-semibold text-gray-800">Đổi mật khẩu</h3>
          </div>
          <form onSubmit={handleChangePassword} className="p-6 space-y-4">
            {/* Mật khẩu hiện tại */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mật khẩu hiện tại</label>
              <div className="relative">
                <input
                  type={showPw.current ? "text" : "password"}
                  value={pwForm.currentPassword}
                  onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
                  required
                  className="w-full px-3 py-2.5 pr-10 rounded-lg text-sm text-gray-800 bg-gray-50 outline-none transition-all"
                  style={{ border: "1.5px solid #e5e7eb" }}
                  onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                  onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
                  placeholder="Nhập mật khẩu hiện tại"
                />
                <button type="button" onClick={() => setShowPw(s => ({ ...s, current: !s.current }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw.current ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Mật khẩu mới */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mật khẩu mới</label>
              <div className="relative">
                <input
                  type={showPw.new ? "text" : "password"}
                  value={pwForm.newPassword}
                  onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                  required
                  minLength={6}
                  className="w-full px-3 py-2.5 pr-10 rounded-lg text-sm text-gray-800 bg-gray-50 outline-none transition-all"
                  style={{ border: "1.5px solid #e5e7eb" }}
                  onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                  onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
                  placeholder="Ít nhất 6 ký tự"
                />
                <button type="button" onClick={() => setShowPw(s => ({ ...s, new: !s.new }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw.new ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Xác nhận mật khẩu */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Xác nhận mật khẩu mới</label>
              <div className="relative">
                <input
                  type={showPw.confirm ? "text" : "password"}
                  value={pwForm.confirmPassword}
                  onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  required
                  className="w-full px-3 py-2.5 pr-10 rounded-lg text-sm text-gray-800 bg-gray-50 outline-none transition-all"
                  style={{ border: "1.5px solid #e5e7eb" }}
                  onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                  onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
                  placeholder="Nhập lại mật khẩu mới"
                />
                <button type="button" onClick={() => setShowPw(s => ({ ...s, confirm: !s.confirm }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">Mật khẩu không khớp</p>
              )}
            </div>

            {/* Thông báo */}
            {pwMsg && (
              <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm ${
                pwMsg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
              }`}>
                {pwMsg.type === "success"
                  ? <CheckCircle size={15} />
                  : <AlertCircle size={15} />}
                {pwMsg.text}
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={pwSaving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #C9A84C, #9A7A2E)" }}
              >
                <Key size={14} />
                {pwSaving ? "Đang lưu..." : "Đổi mật khẩu"}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
