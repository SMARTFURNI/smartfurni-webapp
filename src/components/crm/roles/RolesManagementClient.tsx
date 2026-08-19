"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentType, type CSSProperties } from "react";
import {
  AlertCircle,
  BadgeCheck,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronRight,
  ContactRound,
  Crown,
  Edit3,
  GraduationCap,
  Landmark,
  LayoutDashboard,
  Megaphone,
  MessagesSquare,
  PackageCheck,
  Plus,
  RefreshCw,
  Rocket,
  Save,
  ShieldCheck,
  ShieldEllipsis,
  Sparkles,
  Target,
  Trash2,
  UserRoundCog,
  Users,
  Wrench,
  X,
} from "lucide-react";
import type { CustomRole, RolePermissions } from "@/lib/crm-roles-store";
import { PERMISSION_GROUPS, PERMISSION_LABELS, ROLE_TEMPLATES } from "@/lib/crm-roles-store";

type IconComponent = ComponentType<{ size?: number; className?: string; style?: CSSProperties; strokeWidth?: number }>;

const ROLE_ICONS: Record<string, IconComponent> = {
  crown: Crown,
  "badge-check": BadgeCheck,
  "briefcase-business": BriefcaseBusiness,
  megaphone: Megaphone,
  landmark: Landmark,
  "graduation-cap": GraduationCap,
  "user-round-cog": UserRoundCog,
  target: Target,
  sparkles: Sparkles,
  rocket: Rocket,
  wrench: Wrench,
  "chart-no-axes-combined": ChartNoAxesCombined,
};

const LEGACY_ROLE_ICONS: Record<string, string> = {
  "👑": "crown",
  "⭐": "badge-check",
  "💼": "briefcase-business",
  "📣": "megaphone",
  "💰": "landmark",
  "🎓": "graduation-cap",
  "🔧": "wrench",
  "📊": "chart-no-axes-combined",
  "🛡️": "user-round-cog",
  "🎯": "target",
  "💡": "sparkles",
  "🚀": "rocket",
};

const GROUP_ICONS: Record<string, IconComponent> = {
  "layout-dashboard": LayoutDashboard,
  "contact-round": ContactRound,
  "messages-square": MessagesSquare,
  "package-check": PackageCheck,
  "chart-no-axes-combined": ChartNoAxesCombined,
  "shield-ellipsis": ShieldEllipsis,
};

const ROLE_ICON_OPTIONS = Object.keys(ROLE_ICONS);
const COLOR_OPTIONS = ["#b9851c", "#6d5bd0", "#128d68", "#d56b35", "#2978b5", "#c34a65", "#64748b", "#0f8f98"];
const EMPTY_PERMISSIONS = Object.fromEntries(
  Object.keys(PERMISSION_LABELS).map((key) => [key, false]),
) as unknown as RolePermissions;

function normalizeIcon(icon?: string) {
  return (icon && (LEGACY_ROLE_ICONS[icon] || icon)) || "user-round-cog";
}

function RoleIcon({ icon, size = 18, color }: { icon?: string; size?: number; color?: string }) {
  const Icon = ROLE_ICONS[normalizeIcon(icon)] || UserRoundCog;
  return <Icon size={size} strokeWidth={1.8} style={{ color: color || "currentColor" }} />;
}

function PermissionSwitch({ value, disabled, onChange }: { value: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={onChange}
      className="relative h-6 w-11 flex-shrink-0 rounded-full transition-all disabled:cursor-not-allowed disabled:opacity-60"
      style={{
        background: value ? "linear-gradient(135deg,#d8b447,#b9851c)" : "#d9e1eb",
        boxShadow: value ? "0 4px 12px rgba(185,133,28,.22)" : "inset 0 0 0 1px #c7d1de",
      }}
    >
      <span
        className="absolute top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition-all"
        style={{ left: value ? 22 : 2 }}
      >
        {value && <Check size={11} strokeWidth={3} style={{ color: "#a47112" }} />}
      </span>
    </button>
  );
}

function RoleCard({ role, selected, onSelect, onEdit, onDelete }: {
  role: CustomRole;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onSelect}
        className="w-full rounded-2xl p-3.5 pr-20 text-left transition-all"
        style={{
          background: selected ? `linear-gradient(135deg,${role.color}14,#ffffff)` : "#ffffff",
          border: `1px solid ${selected ? `${role.color}55` : "#dce4ee"}`,
          boxShadow: selected ? "0 10px 28px rgba(37,52,78,.09)" : "0 4px 14px rgba(37,52,78,.035)",
        }}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: `${role.color}12`, border: `1px solid ${role.color}28` }}>
            <RoleIcon icon={role.icon} size={19} color={role.color} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-sm font-bold" style={{ color: "#17233c" }}>{role.name}</span>
              {role.isSystem && <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">Hệ thống</span>}
            </span>
            <span className="mt-1 flex items-center gap-1 text-[11px]" style={{ color: "#8190a5" }}>
              <Users size={11} /> {role.staffCount ?? 0} nhân viên
            </span>
          </span>
        </div>
      </button>
      {!role.isSystem && (
        <div className="absolute right-2.5 top-1/2 flex -translate-y-1/2 gap-1 opacity-70 transition-opacity group-hover:opacity-100">
          <button type="button" onClick={onEdit} aria-label={`Sửa ${role.name}`} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-amber-300 hover:text-amber-700">
            <Edit3 size={13} />
          </button>
          <button type="button" onClick={onDelete} aria-label={`Xóa ${role.name}`} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-red-200 hover:text-red-600">
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

function PermissionEditor({ role, permissions, onChange }: { role: CustomRole; permissions: RolePermissions; onChange: (permissions: RolePermissions) => void }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => Object.fromEntries(PERMISSION_GROUPS.map((group) => [group.label, true])));

  return (
    <div className="space-y-3">
      {PERMISSION_GROUPS.map((group) => {
        const GroupIcon = GROUP_ICONS[group.icon] || ShieldCheck;
        const isExpanded = expanded[group.label];
        const enabledCount = group.keys.filter((key) => permissions[key]).length;
        const allEnabled = enabledCount === group.keys.length;

        return (
          <section key={group.label} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_7px_24px_rgba(37,52,78,.045)]">
            <div className="flex cursor-pointer items-center gap-3 px-4 py-3.5" onClick={() => setExpanded((current) => ({ ...current, [group.label]: !isExpanded }))}>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${group.color}12`, color: group.color }}>
                <GroupIcon size={18} strokeWidth={1.8} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold" style={{ color: "#26344d" }}>{group.label}</h3>
                <p className="mt-0.5 text-[11px]" style={{ color: "#8a98aa" }}>{enabledCount}/{group.keys.length} quyền đang bật</p>
              </div>
              {!role.isSystem && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    const next = { ...permissions };
                    group.keys.forEach((key) => { next[key] = !allEnabled; });
                    onChange(next);
                  }}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                >
                  {allEnabled ? "Bỏ chọn nhóm" : "Bật cả nhóm"}
                </button>
              )}
              {isExpanded ? <ChevronDown size={17} className="text-slate-400" /> : <ChevronRight size={17} className="text-slate-400" />}
            </div>
            {isExpanded && (
              <div className="grid border-t border-slate-100 md:grid-cols-2">
                {group.keys.map((key, index) => (
                  <div
                    key={key}
                    className="flex min-h-14 items-center gap-3 px-4 py-3"
                    style={{
                      background: permissions[key] ? `${group.color}06` : "#ffffff",
                      borderTop: index > 1 ? "1px solid #eef2f6" : undefined,
                      borderLeft: index % 2 === 1 ? "1px solid #eef2f6" : undefined,
                    }}
                  >
                    <PermissionSwitch
                      value={permissions[key]}
                      disabled={role.isSystem}
                      onChange={() => !role.isSystem && onChange({ ...permissions, [key]: !permissions[key] })}
                    />
                    <span className="text-[13px] font-medium" style={{ color: permissions[key] ? "#28364e" : "#748399" }}>{PERMISSION_LABELS[key]}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function RoleFormModal({ initial, onSave, onClose }: {
  initial?: CustomRole;
  onSave: (data: { name: string; color: string; icon: string; description: string; permissions: RolePermissions }) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [color, setColor] = useState(initial?.color || "#b9851c");
  const [icon, setIcon] = useState(normalizeIcon(initial?.icon || "briefcase-business"));
  const [description, setDescription] = useState(initial?.description || "");
  const [template, setTemplate] = useState("sales");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        color,
        icon,
        description: description.trim(),
        permissions: initial?.permissions || ROLE_TEMPLATES[template]?.permissions || EMPTY_PERMISSIONS,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể lưu vai trò");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white bg-white shadow-[0_30px_90px_rgba(15,23,42,.28)]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-6 py-5 backdrop-blur">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{initial ? "Chỉnh sửa vai trò" : "Tạo vai trò mới"}</h2>
            <p className="mt-0.5 text-xs text-slate-500">Đặt tên rõ ràng theo chức năng thực tế trong CRM.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"><X size={17} /></button>
        </div>

        <div className="space-y-5 p-6">
          {error && <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={15} />{error}</div>}

          <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Biểu tượng</label>
              <div className="grid grid-cols-6 gap-2">
                {ROLE_ICON_OPTIONS.map((option) => (
                  <button key={option} type="button" onClick={() => setIcon(option)} className="flex h-10 items-center justify-center rounded-xl transition-all" style={{ color: icon === option ? color : "#718096", background: icon === option ? `${color}12` : "#f8fafc", border: `1px solid ${icon === option ? `${color}55` : "#e2e8f0"}` }}>
                    <RoleIcon icon={option} size={18} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Màu nhận diện</label>
              <div className="grid grid-cols-4 gap-2">
                {COLOR_OPTIONS.map((option) => (
                  <button key={option} type="button" onClick={() => setColor(option)} className="h-10 rounded-xl transition-transform hover:scale-105" style={{ background: option, boxShadow: color === option ? `0 0 0 3px #fff,0 0 0 5px ${option}66` : undefined }} aria-label={`Chọn màu ${option}`} />
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Tên vai trò *</label>
            <input value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-amber-400 focus:bg-white" placeholder="Ví dụ: Chăm sóc khách hàng" />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Mô tả phạm vi công việc</label>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-amber-400 focus:bg-white" placeholder="Vai trò này chịu trách nhiệm gì trong CRM?" />
          </div>

          {!initial && (
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Mẫu quyền khởi tạo</label>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(ROLE_TEMPLATES).filter(([key]) => key !== "super_admin").map(([key, roleTemplate]) => (
                  <button key={key} type="button" onClick={() => setTemplate(key)} className="flex items-center gap-3 rounded-xl p-3 text-left" style={{ background: template === key ? `${roleTemplate.color}0e` : "#f8fafc", border: `1px solid ${template === key ? `${roleTemplate.color}55` : "#e2e8f0"}` }}>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${roleTemplate.color}12`, color: roleTemplate.color }}><RoleIcon icon={roleTemplate.icon} size={18} /></span>
                    <span><span className="block text-sm font-bold text-slate-800">{roleTemplate.name}</span><span className="mt-0.5 block text-[11px] text-slate-500">{roleTemplate.description}</span></span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${color}12`, color }}><RoleIcon icon={icon} size={21} /></span>
            <div className="min-w-0"><p className="truncate text-sm font-bold" style={{ color }}>{name || "Tên vai trò"}</p><p className="truncate text-xs text-slate-500">{description || "Mô tả phạm vi công việc"}</p></div>
          </div>
        </div>

        <div className="sticky bottom-0 flex gap-3 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Hủy</button>
          <button type="button" onClick={submit} disabled={saving || !name.trim()} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#d8b447] to-[#b9851c] py-2.5 text-sm font-bold text-white shadow-lg shadow-amber-900/10 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}{initial ? "Lưu thay đổi" : "Tạo vai trò"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RolesManagementClient() {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editedPermissions, setEditedPermissions] = useState<RolePermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<CustomRole | null>(null);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/crm/roles", { cache: "no-store" });
      if (!response.ok) throw new Error("Không thể tải danh sách vai trò");
      const data = await response.json() as CustomRole[];
      setRoles(data);
      setSelectedId((currentId) => {
        const active = data.find((role) => role.id === currentId) || data[0];
        setEditedPermissions(active ? { ...active.permissions } : null);
        return active?.id || null;
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải dữ liệu phân quyền");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadRoles(); }, [loadRoles]);

  const selectedRole = useMemo(() => roles.find((role) => role.id === selectedId) || null, [roles, selectedId]);
  const currentPermissions = editedPermissions || selectedRole?.permissions || null;
  const enabledCount = currentPermissions ? Object.values(currentPermissions).filter(Boolean).length : 0;
  const totalPermissions = Object.keys(PERMISSION_LABELS).length;

  const selectRole = (role: CustomRole) => {
    setSelectedId(role.id);
    setEditedPermissions({ ...role.permissions });
    setSaved(false);
  };

  const savePermissions = async () => {
    if (!selectedRole || !editedPermissions) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/crm/roles/${selectedRole.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ permissions: editedPermissions }) });
      if (!response.ok) throw new Error((await response.json()).error || "Không thể lưu quyền");
      setSaved(true);
      await loadRoles();
      window.setTimeout(() => setSaved(false), 2200);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể lưu quyền");
    } finally {
      setSaving(false);
    }
  };

  const createRole = async (data: { name: string; color: string; icon: string; description: string; permissions: RolePermissions }) => {
    const response = await fetch("/api/crm/roles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Không thể tạo vai trò");
    setShowCreateModal(false);
    await loadRoles();
    setSelectedId(result.id);
    setEditedPermissions({ ...result.permissions });
  };

  const editRole = async (data: { name: string; color: string; icon: string; description: string; permissions: RolePermissions }) => {
    if (!editingRole) return;
    const response = await fetch(`/api/crm/roles/${editingRole.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: data.name, color: data.color, icon: data.icon, description: data.description }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Không thể cập nhật vai trò");
    setEditingRole(null);
    await loadRoles();
  };

  const deleteRole = async () => {
    if (!deleteConfirm) return;
    const response = await fetch(`/api/crm/roles/${deleteConfirm.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      setError(result.error || "Không thể xóa vai trò");
      setDeleteConfirm(null);
      return;
    }
    setDeleteConfirm(null);
    await loadRoles();
  };

  return (
    <div className="min-h-full bg-[linear-gradient(145deg,#f8fafc_0%,#f1f5f9_55%,#f8f6ef_100%)] p-4 text-slate-900 md:p-6">
      <header className="mb-5 flex flex-col gap-4 rounded-3xl border border-amber-200/80 bg-[linear-gradient(120deg,#fffdf8_0%,#ffffff_60%,#f5f9ff_100%)] p-5 shadow-[0_15px_45px_rgba(37,52,78,.07)] lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white text-amber-700 shadow-sm"><ShieldCheck size={25} strokeWidth={1.7} /></span>
          <div><p className="text-[11px] font-extrabold uppercase tracking-[.22em] text-amber-700">Bảo mật & vận hành</p><h1 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900 md:text-2xl">Quản lý vai trò & phân quyền</h1><p className="mt-1 text-sm text-slate-500">Phân quyền đúng theo chức năng CRM và quyền truy cập khu vực quản trị website.</p></div>
        </div>
        <button type="button" onClick={() => setShowCreateModal(true)} className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#d8b447] to-[#b9851c] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-amber-900/10 hover:brightness-105"><Plus size={17} />Tạo vai trò mới</button>
      </header>

      {error && <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span className="flex items-center gap-2"><AlertCircle size={16} />{error}</span><button type="button" onClick={() => setError(null)}><X size={15} /></button></div>}

      {loading ? (
        <div className="flex h-72 items-center justify-center rounded-3xl border border-slate-200 bg-white text-sm text-slate-500"><RefreshCw size={18} className="mr-2 animate-spin" />Đang tải vai trò...</div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[310px_minmax(0,1fr)]">
          <aside className="self-start rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_12px_38px_rgba(37,52,78,.055)] xl:sticky xl:top-4">
            <div className="mb-3 flex items-center justify-between px-1"><div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-slate-500">Danh sách vai trò</p><p className="mt-1 text-xs text-slate-400">{roles.length} vai trò · {roles.reduce((sum, role) => sum + (role.staffCount || 0), 0)} nhân viên</p></div><Users size={19} className="text-amber-600" /></div>
            <div className="space-y-2">{roles.map((role) => <RoleCard key={role.id} role={role} selected={role.id === selectedId} onSelect={() => selectRole(role)} onEdit={() => setEditingRole(role)} onDelete={() => setDeleteConfirm(role)} />)}</div>
          </aside>

          <main className="min-w-0">
            {selectedRole && currentPermissions ? (
              <>
                <div className="mb-4 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_38px_rgba(37,52,78,.055)] md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 items-center gap-4"><span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl" style={{ background: `${selectedRole.color}12`, border: `1px solid ${selectedRole.color}32` }}><RoleIcon icon={selectedRole.icon} size={22} color={selectedRole.color} /></span><div className="min-w-0"><div className="flex items-center gap-2"><h2 className="truncate text-lg font-extrabold" style={{ color: selectedRole.color }}>{selectedRole.name}</h2>{selectedRole.isSystem && <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">Hệ thống</span>}</div><p className="mt-1 truncate text-sm text-slate-500">{selectedRole.description || "Chưa có mô tả phạm vi công việc"}</p></div></div>
                  <div className="flex items-center gap-3"><div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right"><p className="text-sm font-extrabold text-slate-800">{enabledCount}/{totalPermissions}</p><p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">quyền đang bật</p></div>{!selectedRole.isSystem && <button type="button" onClick={savePermissions} disabled={saving} className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/10 disabled:opacity-60">{saving ? <RefreshCw size={15} className="animate-spin" /> : saved ? <Check size={16} /> : <Save size={15} />}{saved ? "Đã lưu" : "Lưu quyền"}</button>}</div>
                </div>

                {selectedRole.isSystem && <div className="mb-4 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900"><ShieldCheck size={17} className="flex-shrink-0" /><span>Vai trò <strong>{selectedRole.name}</strong> có toàn quyền hệ thống và không thể chỉnh sửa. Quyền vào trang Admin đã được bật sẵn.</span></div>}

                <PermissionEditor role={selectedRole} permissions={currentPermissions} onChange={(permissions) => { setEditedPermissions(permissions); setSaved(false); }} />
              </>
            ) : <div className="flex h-72 items-center justify-center rounded-3xl border border-slate-200 bg-white text-sm text-slate-500">Chưa có vai trò để hiển thị.</div>}
          </main>
        </div>
      )}

      {showCreateModal && <RoleFormModal onSave={createRole} onClose={() => setShowCreateModal(false)} />}
      {editingRole && <RoleFormModal initial={editingRole} onSave={editRole} onClose={() => setEditingRole(null)} />}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-white bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,.28)]"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600"><Trash2 size={19} /></span><h3 className="mt-4 text-lg font-bold text-slate-900">Xóa vai trò “{deleteConfirm.name}”?</h3><p className="mt-2 text-sm leading-6 text-slate-500">Chỉ có thể xóa khi không còn nhân viên sử dụng vai trò này. Hành động không thể hoàn tác.</p><div className="mt-5 flex gap-3"><button type="button" onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600">Hủy</button><button type="button" onClick={() => void deleteRole()} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white">Xóa vai trò</button></div></div>
        </div>
      )}
    </div>
  );
}
