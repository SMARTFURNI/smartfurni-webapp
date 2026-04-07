"use client";

import { useState } from "react";
import {
  Users, Plus, Edit2, Trash2, Shield, Eye, EyeOff,
  CheckCircle, XCircle, Crown, Star, UserCheck, User, GraduationCap,
  Phone, Mail, MapPin, Target, Lock, Unlock, Save, X, RefreshCw,
} from "lucide-react";
import type { StaffMember, StaffRole, StaffPermissions } from "@/lib/crm-staff-store";
import { ROLE_LABELS, ROLE_COLORS, DEFAULT_PERMISSIONS } from "@/lib/crm-staff-store";

interface Props {
  initialStaff: StaffMember[];
}

const ROLE_ICONS: Record<StaffRole, React.ElementType> = {
  super_admin: Crown,
  manager: Star,
  senior_sales: UserCheck,
  sales: User,
  intern: GraduationCap,
};

const PERMISSION_LABELS: Record<keyof StaffPermissions, string> = {
  canViewAllLeads: "Xem tất cả khách hàng",
  canCreateLead: "Tạo khách hàng mới",
  canEditLead: "Chỉnh sửa khách hàng",
  canDeleteLead: "Xóa khách hàng",
  canAssignLead: "Phân công khách hàng",
  canMovePipeline: "Di chuyển pipeline",
  canCreateQuote: "Tạo báo giá",
  canApproveQuote: "Duyệt báo giá",
  canGiveExtraDiscount: "Chiết khấu thêm",
  canViewReports: "Xem báo cáo",
  canViewOthersRevenue: "Xem doanh số người khác",
  canManageStaff: "Quản lý nhân viên",
  canEditProducts: "Chỉnh sửa sản phẩm/giá",
};

const PERMISSION_GROUPS = [
  {
    label: "Khách hàng",
    keys: ["canViewAllLeads", "canCreateLead", "canEditLead", "canDeleteLead", "canAssignLead", "canMovePipeline"] as (keyof StaffPermissions)[],
  },
  {
    label: "Báo giá",
    keys: ["canCreateQuote", "canApproveQuote", "canGiveExtraDiscount"] as (keyof StaffPermissions)[],
  },
  {
    label: "Báo cáo & Quản lý",
    keys: ["canViewReports", "canViewOthersRevenue", "canManageStaff", "canEditProducts"] as (keyof StaffPermissions)[],
  },
];

const VIETNAM_PROVINCES = [
  "Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ",
  "An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu",
  "Bắc Ninh", "Bến Tre", "Bình Định", "Bình Dương", "Bình Phước",
  "Bình Thuận", "Cà Mau", "Cao Bằng", "Đắk Lắk", "Đắk Nông",
  "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Giang",
  "Hà Nam", "Hà Tĩnh", "Hải Dương", "Hậu Giang", "Hòa Bình",
  "Hưng Yên", "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu",
  "Lâm Đồng", "Lạng Sơn", "Lào Cai", "Long An", "Nam Định",
  "Nghệ An", "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên",
  "Quảng Bình", "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị",
  "Sóc Trăng", "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên",
  "Thanh Hóa", "Thừa Thiên Huế", "Tiền Giang", "Trà Vinh", "Tuyên Quang",
  "Vĩnh Long", "Vĩnh Phúc", "Yên Bái",
];

export default function StaffManagementClient({ initialStaff }: Props) {
  const [staff, setStaff] = useState(initialStaff);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [permissionStaff, setPermissionStaff] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Xóa nhân viên "${name}"?`)) return;
    await fetch(`/api/crm/staff/${id}`, { method: "DELETE" });
    setStaff(prev => prev.filter(s => s.id !== id));
  }

  async function handleToggleStatus(member: StaffMember) {
    const newStatus = member.status === "active" ? "suspended" : "active";
    const updated = await fetch(`/api/crm/staff/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    }).then(r => r.json());
    setStaff(prev => prev.map(s => s.id === member.id ? updated : s));
  }

  async function handleSavePermissions(member: StaffMember, permissions: StaffPermissions) {
    setLoading(true);
    const updated = await fetch(`/api/crm/staff/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions }),
    }).then(r => r.json());
    setStaff(prev => prev.map(s => s.id === member.id ? updated : s));
    setPermissionStaff(null);
    setLoading(false);
  }

  const activeCount = staff.filter(s => s.status === "active").length;

  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto">

      {/* Header */}
      <div className="flex-shrink-0 px-8 py-5 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.06)" }}>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Quản lý nhân viên</h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(245,237,214,0.50)" }}>
            {activeCount}/{staff.length} nhân viên đang hoạt động
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-black transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #C9A84C, #E2C97E)" }}>
          <Plus size={15} />
          Thêm nhân viên
        </button>
      </div>

      {/* Role Summary */}
      <div className="px-8 py-4 grid grid-cols-5 gap-3">
        {(Object.keys(ROLE_LABELS) as StaffRole[]).map(role => {
          const count = staff.filter(s => s.role === role).length;
          const Icon = ROLE_ICONS[role];
          return (
            <div key={role} className="rounded-xl p-3 text-center"
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.10)" }}>
              <Icon size={18} className="mx-auto mb-1.5" style={{ color: ROLE_COLORS[role] }} />
              <div className="text-lg font-black text-gray-900">{count}</div>
              <div className="text-[10px] font-medium" style={{ color: "rgba(245,237,214,0.50)" }}>
                {ROLE_LABELS[role]}
              </div>
            </div>
          );
        })}
      </div>

      {/* Staff Table */}
      <div className="px-8 pb-8">
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: "transparent", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["Nhân viên", "Cấp bậc", "Liên hệ", "Khu vực", "Trạng thái", "Đăng nhập lần cuối", "Thao tác"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: "rgba(245,237,214,0.40)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "#e5e7eb" }}>
              {staff.map(member => {
                const Icon = ROLE_ICONS[member.role];
                const isActive = member.status === "active";
                return (
                  <tr key={member.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                          style={{ background: `${ROLE_COLORS[member.role]}20`, color: ROLE_COLORS[member.role] }}>
                          {member.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{member.fullName}</div>
                          <div className="text-[11px]" style={{ color: "rgba(245,237,214,0.40)" }}>@{member.username}</div>
                        </div>
                      </div>
                    </td>
                    {/* Role */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg w-fit"
                        style={{ background: `${ROLE_COLORS[member.role]}15`, border: `1px solid ${ROLE_COLORS[member.role]}30` }}>
                        <Icon size={12} style={{ color: ROLE_COLORS[member.role] }} />
                        <span className="text-xs font-semibold" style={{ color: ROLE_COLORS[member.role] }}>
                          {ROLE_LABELS[member.role]}
                        </span>
                      </div>
                    </td>
                    {/* Contact */}
                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-900/70">{member.phone}</div>
                      <div className="text-[11px] text-gray-900/35">{member.email}</div>
                    </td>
                    {/* Districts */}
                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-900/50">
                        {member.assignedDistricts.length > 0
                          ? member.assignedDistricts.slice(0, 2).join(", ") + (member.assignedDistricts.length > 2 ? `...+${member.assignedDistricts.length - 2}` : "")
                          : <span className="text-gray-900/20">Toàn quốc</span>}
                      </div>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggleStatus(member)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                        style={{
                          background: isActive ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                          color: isActive ? "#22c55e" : "#ef4444",
                          border: `1px solid ${isActive ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                        }}>
                        {isActive ? <CheckCircle size={11} /> : <XCircle size={11} />}
                        {isActive ? "Hoạt động" : "Tạm khóa"}
                      </button>
                    </td>
                    {/* Last Login */}
                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-900/40">
                        {member.lastLoginAt
                          ? new Date(member.lastLoginAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                          : "Chưa đăng nhập"}
                      </div>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setPermissionStaff(member)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-amber-500/20"
                          style={{ color: "#C9A84C" }} title="Phân quyền">
                          <Shield size={14} />
                        </button>
                        <button onClick={() => setEditingStaff(member)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-blue-500/20"
                          style={{ color: "#60a5fa" }} title="Chỉnh sửa">
                          <Edit2 size={14} />
                        </button>
                        {member.role !== "super_admin" && (
                          <button onClick={() => handleDelete(member.id, member.fullName)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-red-500/20"
                            style={{ color: "#f87171" }} title="Xóa">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {staff.length === 0 && (
            <div className="text-center py-16 text-gray-900/30">
              <Users size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Chưa có nhân viên nào</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <AddStaffModal
          onClose={() => setShowAddModal(false)}
          onCreated={(s) => { setStaff(prev => [...prev, s]); setShowAddModal(false); }}
        />
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <EditStaffModal
          staff={editingStaff}
          onClose={() => setEditingStaff(null)}
          onSaved={(s) => { setStaff(prev => prev.map(m => m.id === s.id ? s : m)); setEditingStaff(null); }}
        />
      )}

      {/* Permission Modal */}
      {permissionStaff && (
        <PermissionModal
          staff={permissionStaff}
          loading={loading}
          onClose={() => setPermissionStaff(null)}
          onSave={(perms) => handleSavePermissions(permissionStaff, perms)}
        />
      )}
    </div>
  );
}

// ── Add Staff Modal ────────────────────────────────────────────────────────────
function AddStaffModal({ onClose, onCreated }: { onClose: () => void; onCreated: (s: StaffMember) => void }) {
  const [form, setForm] = useState({
    username: "", password: "", fullName: "", email: "", phone: "",
    role: "sales" as StaffRole, targetRevenue: "", assignedDistricts: [] as string[],
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); }
  function toggleDistrict(d: string) {
    setForm(p => ({
      ...p,
      assignedDistricts: p.assignedDistricts.includes(d)
        ? p.assignedDistricts.filter(x => x !== d)
        : [...p.assignedDistricts, d],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.username || !form.password || !form.fullName) { setError("Vui lòng điền đầy đủ thông tin bắt buộc"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/crm/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, targetRevenue: parseFloat(form.targetRevenue) || 0 }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Lỗi"); }
      onCreated(await res.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally { setLoading(false); }
  }

  return (
    <ModalWrapper onClose={onClose} title="Thêm nhân viên mới">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && <div className="p-3 rounded-lg text-sm text-red-400 bg-red-500/10 border border-red-500/20">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Họ và tên *"><DarkInput value={form.fullName} onChange={v => set("fullName", v)} placeholder="Nguyễn Văn A" /></Field>
          <Field label="Cấp bậc *">
            <select value={form.role} onChange={e => set("role", e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg text-gray-900"
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.10)" }}>
              {(Object.keys(ROLE_LABELS) as StaffRole[]).filter(r => r !== "super_admin").map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tên đăng nhập *"><DarkInput value={form.username} onChange={v => set("username", v)} placeholder="nguyenvana" /></Field>
          <Field label="Mật khẩu *">
            <div className="relative">
              <DarkInput value={form.password} onChange={v => set("password", v)} placeholder="••••••••" type={showPw ? "text" : "password"} />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-900/30 hover:text-gray-900/60">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Số điện thoại"><DarkInput value={form.phone} onChange={v => set("phone", v)} placeholder="0901234567" /></Field>
          <Field label="Email"><DarkInput value={form.email} onChange={v => set("email", v)} placeholder="email@smartfurni.vn" type="email" /></Field>
        </div>

        <Field label="Doanh số mục tiêu / tháng (VND)">
          <DarkInput value={form.targetRevenue} onChange={v => set("targetRevenue", v)} placeholder="500000000" type="number" />
        </Field>

        <Field label="Khu vực phụ trách (chọn nhiều)">
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 rounded-lg" style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.10)" }}>
            {VIETNAM_PROVINCES.map(p => (
              <button key={p} type="button" onClick={() => toggleDistrict(p)}
                className="px-2 py-0.5 rounded-md text-[11px] font-medium transition-all"
                style={{
                  background: form.assignedDistricts.includes(p) ? "rgba(201,168,76,0.2)" : "rgba(255,255,255,0.04)",
                  color: form.assignedDistricts.includes(p) ? "#C9A84C" : "#6b7280",
                  border: `1px solid ${form.assignedDistricts.includes(p) ? "rgba(201,168,76,0.3)" : "#e5e7eb"}`,
                }}>
                {p}
              </button>
            ))}
          </div>
        </Field>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium rounded-xl text-gray-900/50 hover:text-gray-900/80 transition-colors"
            style={{ border: "1px solid rgba(255,255,255,0.10)" }}>Hủy</button>
          <button type="submit" disabled={loading}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-black transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #C9A84C, #E2C97E)" }}>
            {loading && <RefreshCw size={14} className="animate-spin" />}
            {loading ? "Đang lưu..." : "Tạo tài khoản"}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

// ── Edit Staff Modal ───────────────────────────────────────────────────────────
function EditStaffModal({ staff, onClose, onSaved }: { staff: StaffMember; onClose: () => void; onSaved: (s: StaffMember) => void }) {
  const [form, setForm] = useState({
    fullName: staff.fullName, email: staff.email, phone: staff.phone,
    role: staff.role, targetRevenue: staff.targetRevenue.toString(),
    assignedDistricts: staff.assignedDistricts,
    newPassword: "",
  });
  const [loading, setLoading] = useState(false);

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); }
  function toggleDistrict(d: string) {
    setForm(p => ({
      ...p,
      assignedDistricts: p.assignedDistricts.includes(d)
        ? p.assignedDistricts.filter(x => x !== d)
        : [...p.assignedDistricts, d],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const payload: Record<string, unknown> = {
      fullName: form.fullName, email: form.email, phone: form.phone,
      role: form.role, targetRevenue: parseFloat(form.targetRevenue) || 0,
      assignedDistricts: form.assignedDistricts,
    };
    if (form.newPassword) payload.newPassword = form.newPassword;
    const updated = await fetch(`/api/crm/staff/${staff.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(r => r.json());
    onSaved(updated);
    setLoading(false);
  }

  return (
    <ModalWrapper onClose={onClose} title={`Chỉnh sửa: ${staff.fullName}`}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Họ và tên"><DarkInput value={form.fullName} onChange={v => set("fullName", v)} /></Field>
          <Field label="Cấp bậc">
            <select value={form.role} onChange={e => set("role", e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg text-gray-900"
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.10)" }}>
              {(Object.keys(ROLE_LABELS) as StaffRole[]).filter(r => r !== "super_admin").map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Số điện thoại"><DarkInput value={form.phone} onChange={v => set("phone", v)} /></Field>
          <Field label="Email"><DarkInput value={form.email} onChange={v => set("email", v)} type="email" /></Field>
        </div>
        <Field label="Đổi mật khẩu (để trống nếu không đổi)">
          <DarkInput value={form.newPassword} onChange={v => set("newPassword", v)} placeholder="Mật khẩu mới..." type="password" />
        </Field>
        <Field label="Doanh số mục tiêu / tháng">
          <DarkInput value={form.targetRevenue} onChange={v => set("targetRevenue", v)} type="number" />
        </Field>
        <Field label="Khu vực phụ trách">
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 rounded-lg" style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.10)" }}>
            {VIETNAM_PROVINCES.map(p => (
              <button key={p} type="button" onClick={() => toggleDistrict(p)}
                className="px-2 py-0.5 rounded-md text-[11px] font-medium transition-all"
                style={{
                  background: form.assignedDistricts.includes(p) ? "rgba(201,168,76,0.2)" : "rgba(255,255,255,0.04)",
                  color: form.assignedDistricts.includes(p) ? "#C9A84C" : "#6b7280",
                  border: `1px solid ${form.assignedDistricts.includes(p) ? "rgba(201,168,76,0.3)" : "#e5e7eb"}`,
                }}>
                {p}
              </button>
            ))}
          </div>
        </Field>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium rounded-xl text-gray-900/50 hover:text-gray-900/80"
            style={{ border: "1px solid rgba(255,255,255,0.10)" }}>Hủy</button>
          <button type="submit" disabled={loading}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-black flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #C9A84C, #E2C97E)" }}>
            {loading && <RefreshCw size={14} className="animate-spin" />}
            {loading ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

// ── Permission Modal ───────────────────────────────────────────────────────────
function PermissionModal({ staff, loading, onClose, onSave }: {
  staff: StaffMember; loading: boolean;
  onClose: () => void; onSave: (p: StaffPermissions) => void;
}) {
  const [perms, setPerms] = useState<StaffPermissions>({ ...staff.permissions });

  function toggle(key: keyof StaffPermissions) {
    setPerms(p => ({ ...p, [key]: !p[key] }));
  }

  function resetToDefault() {
    setPerms({ ...DEFAULT_PERMISSIONS[staff.role] });
  }

  return (
    <ModalWrapper onClose={onClose} title={`Phân quyền: ${staff.fullName}`} wide>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between p-3 rounded-xl"
          style={{ background: `${ROLE_COLORS[staff.role]}10`, border: `1px solid ${ROLE_COLORS[staff.role]}20` }}>
          <div className="flex items-center gap-2">
            <Shield size={15} style={{ color: ROLE_COLORS[staff.role] }} />
            <span className="text-sm font-semibold text-gray-900">Cấp bậc: {ROLE_LABELS[staff.role]}</span>
          </div>
          <button onClick={resetToDefault}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-[rgba(255,255,255,0.08)]"
            style={{ color: "rgba(245,237,214,0.50)" }}>
            <RefreshCw size={11} /> Đặt lại mặc định
          </button>
        </div>

        {PERMISSION_GROUPS.map(group => (
          <div key={group.label}>
            <div className="text-[11px] font-semibold uppercase tracking-wider mb-2.5"
              style={{ color: "rgba(245,237,214,0.40)" }}>{group.label}</div>
            <div className="space-y-1.5">
              {group.keys.map(key => (
                <button key={key} onClick={() => toggle(key)}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all hover:bg-[rgba(255,255,255,0.05)]"
                  style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
                  <span className="text-sm text-gray-900/70">{PERMISSION_LABELS[key]}</span>
                  <div className="w-9 h-5 rounded-full relative transition-all flex-shrink-0"
                    style={{ background: perms[key] ? "#C9A84C" : "#e5e7eb" }}>
                    <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                      style={{ left: perms[key] ? "calc(100% - 18px)" : "2px" }} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium rounded-xl text-gray-900/50 hover:text-gray-900/80"
            style={{ border: "1px solid rgba(255,255,255,0.10)" }}>Hủy</button>
          <button onClick={() => onSave(perms)} disabled={loading}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-black flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #C9A84C, #E2C97E)" }}>
            {loading && <RefreshCw size={14} className="animate-spin" />}
            <Save size={14} /> Lưu phân quyền
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}

// ── Shared UI ──────────────────────────────────────────────────────────────────
function ModalWrapper({ onClose, title, children, wide }: {
  onClose: () => void; title: string; children: React.ReactNode; wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`rounded-2xl w-full ${wide ? "max-w-2xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto`}
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}>
        <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10 rounded-t-2xl"
          style={{ background: "rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[rgba(255,255,255,0.08)] flex items-center justify-center text-gray-900/40">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(245,237,214,0.50)" }}>{label}</label>
      {children}
    </div>
  );
}

function DarkInput({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-3 py-2 text-sm rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none transition-all"
      style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.10)" }} />
  );
}
