"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Plus, Save, Trash2, Shield, ChevronDown, ChevronRight,
  Users, CheckCircle2, X, Edit3, AlertCircle, RefreshCw,
} from "lucide-react";
import type { CustomRole, RolePermissions } from "@/lib/crm-roles-store";
import { PERMISSION_LABELS, PERMISSION_GROUPS, ROLE_TEMPLATES } from "@/lib/crm-roles-store";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ICON_OPTIONS = ["👑", "⭐", "💼", "📣", "💰", "🎓", "🔧", "📊", "🛡️", "🎯", "💡", "🚀"];
const COLOR_OPTIONS = [
  "#C9A84C", "#8b5cf6", "#22c55e", "#f59e0b", "#06b6d4",
  "#ef4444", "#3b82f6", "#ec4899", "#6b7280", "#14b8a6",
];

const EMPTY_PERMISSIONS: RolePermissions = Object.fromEntries(
  Object.keys(PERMISSION_LABELS).map(k => [k, false])
) as unknown as RolePermissions;

// ─── Permission Toggle Cell ───────────────────────────────────────────────────

function PermToggle({
  value, onChange, disabled,
}: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className="w-7 h-7 rounded-lg flex items-center justify-center mx-auto transition-all"
      style={{
        background: value ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${value ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.08)"}`,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {value ? (
        <CheckCircle2 size={13} style={{ color: "#C9A84C" }} />
      ) : (
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
      )}
    </button>
  );
}

// ─── Role Card (sidebar list) ─────────────────────────────────────────────────

function RoleCard({
  role, selected, onClick,
}: { role: CustomRole; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-xl transition-all"
      style={{
        background: selected ? `${role.color}15` : "rgba(255,255,255,0.03)",
        border: `1px solid ${selected ? `${role.color}40` : "rgba(255,255,255,0.07)"}`,
        outline: "none",
      }}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-xl">{role.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold truncate" style={{ color: "#f5edd6" }}>{role.name}</span>
            {role.isSystem && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider"
                style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.3)" }}>
                Hệ thống
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <Users size={10} style={{ color: "rgba(255,255,255,0.3)" }} />
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
              {role.staffCount ?? 0} nhân viên
            </span>
          </div>
        </div>
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: role.color }} />
      </div>
    </button>
  );
}

// ─── Permission Matrix Editor ─────────────────────────────────────────────────

function PermissionEditor({
  role, roles, onChange,
}: {
  role: CustomRole;
  roles: CustomRole[];
  onChange: (perms: RolePermissions) => void;
}) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(PERMISSION_GROUPS.map(g => [g.label, true]))
  );

  const toggle = (key: keyof RolePermissions) => {
    if (role.isSystem) return;
    onChange({ ...role.permissions, [key]: !role.permissions[key] });
  };

  const toggleGroup = (groupLabel: string, value: boolean) => {
    if (role.isSystem) return;
    const group = PERMISSION_GROUPS.find(g => g.label === groupLabel);
    if (!group) return;
    const updates: Partial<RolePermissions> = {};
    group.keys.forEach(k => { updates[k] = value; });
    onChange({ ...role.permissions, ...updates });
  };

  const isGroupAllOn = (groupLabel: string) => {
    const group = PERMISSION_GROUPS.find(g => g.label === groupLabel);
    return group?.keys.every(k => role.permissions[k]) ?? false;
  };

  return (
    <div className="space-y-2">
      {PERMISSION_GROUPS.map(group => {
        const isExpanded = expandedGroups[group.label];
        const allOn = isGroupAllOn(group.label);
        const onCount = group.keys.filter(k => role.permissions[k]).length;
        return (
          <div key={group.label} className="rounded-xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
            {/* Group header */}
            <div className="flex items-center gap-3 px-4 py-3 cursor-pointer"
              onClick={() => setExpandedGroups(prev => ({ ...prev, [group.label]: !prev[group.label] }))}>
              <span className="text-base">{group.icon}</span>
              <span className="text-sm font-semibold flex-1" style={{ color: group.color }}>{group.label}</span>
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: `${group.color}15`, color: group.color, border: `1px solid ${group.color}30` }}>
                {onCount}/{group.keys.length}
              </span>
              {!role.isSystem && (
                <button
                  onClick={e => { e.stopPropagation(); toggleGroup(group.label, !allOn); }}
                  className="text-[10px] px-2 py-1 rounded-lg transition-all"
                  style={{
                    background: allOn ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.05)",
                    color: allOn ? "#C9A84C" : "rgba(255,255,255,0.4)",
                    border: `1px solid ${allOn ? "rgba(201,168,76,0.3)" : "rgba(255,255,255,0.08)"}`,
                  }}>
                  {allOn ? "Bỏ tất cả" : "Chọn tất cả"}
                </button>
              )}
              {isExpanded ? (
                <ChevronDown size={14} style={{ color: "rgba(255,255,255,0.3)" }} />
              ) : (
                <ChevronRight size={14} style={{ color: "rgba(255,255,255,0.3)" }} />
              )}
            </div>
            {/* Permission rows */}
            {isExpanded && (
              <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                {group.keys.map((key, idx) => (
                  <div key={key}
                    className="flex items-center gap-3 px-4 py-2.5 transition-all"
                    style={{
                      borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.04)" : undefined,
                      background: role.permissions[key] ? "rgba(201,168,76,0.03)" : "transparent",
                    }}>
                    <PermToggle
                      value={role.permissions[key]}
                      onChange={() => toggle(key)}
                      disabled={role.isSystem}
                    />
                    <span className="text-sm flex-1" style={{ color: role.permissions[key] ? "#f5edd6" : "rgba(255,255,255,0.45)" }}>
                      {PERMISSION_LABELS[key]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Create/Edit Role Modal ───────────────────────────────────────────────────

function RoleFormModal({
  initial, onSave, onClose,
}: {
  initial?: Partial<CustomRole>;
  onSave: (data: { name: string; color: string; icon: string; description: string; permissions: RolePermissions }) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? "#22c55e");
  const [icon, setIcon] = useState(initial?.icon ?? "💼");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [template, setTemplate] = useState<string>("sales");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const tpl = ROLE_TEMPLATES[template];
    await onSave({
      name: name.trim(),
      color,
      icon,
      description: description.trim(),
      permissions: tpl?.permissions ?? EMPTY_PERMISSIONS,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10,15,30,0.75)", backdropFilter: "blur(8px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl p-6 space-y-5"
        style={{
          background: "linear-gradient(145deg, #1a1200, #0f0d00)",
          border: "1px solid rgba(201,168,76,0.25)",
          boxShadow: "0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.1)",
        }}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold" style={{ color: "#f5edd6" }}>
              {initial ? "Chỉnh sửa vai trò" : "Tạo vai trò mới"}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              Quyền sẽ được thiết lập sau khi tạo
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-all">
            <X size={16} style={{ color: "rgba(255,255,255,0.5)" }} />
          </button>
        </div>

        {/* Icon + Color */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block" style={{ color: "rgba(255,255,255,0.4)" }}>
              Icon
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ICON_OPTIONS.map(ic => (
                <button key={ic} onClick={() => setIcon(ic)}
                  className="w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all"
                  style={{
                    background: icon === ic ? "rgba(201,168,76,0.2)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${icon === ic ? "rgba(201,168,76,0.5)" : "rgba(255,255,255,0.08)"}`,
                  }}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block" style={{ color: "rgba(255,255,255,0.4)" }}>
              Màu
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {COLOR_OPTIONS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-lg transition-all"
                  style={{
                    background: c,
                    border: `2px solid ${color === c ? "#fff" : "transparent"}`,
                    boxShadow: color === c ? `0 0 8px ${c}80` : undefined,
                  }} />
              ))}
            </div>
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest mb-1.5 block" style={{ color: "rgba(255,255,255,0.4)" }}>
            Tên vai trò *
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="VD: Kinh doanh, Marketing, Kế toán..."
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#f5edd6",
            }}
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest mb-1.5 block" style={{ color: "rgba(255,255,255,0.4)" }}>
            Mô tả
          </label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Mô tả ngắn về vai trò này..."
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#f5edd6",
            }}
          />
        </div>

        {/* Template */}
        {!initial && (
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest mb-1.5 block" style={{ color: "rgba(255,255,255,0.4)" }}>
              Khởi tạo quyền từ mẫu
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ROLE_TEMPLATES).filter(([k]) => k !== "super_admin").map(([key, tpl]) => (
                <button key={key} onClick={() => setTemplate(key)}
                  className="flex items-center gap-2 p-2.5 rounded-xl text-left transition-all"
                  style={{
                    background: template === key ? `${tpl.color}15` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${template === key ? `${tpl.color}40` : "rgba(255,255,255,0.07)"}`,
                  }}>
                  <span className="text-base">{tpl.icon}</span>
                  <div>
                    <div className="text-xs font-semibold" style={{ color: template === key ? tpl.color : "#f5edd6" }}>{tpl.name}</div>
                    <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>{tpl.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Preview badge */}
        <div className="flex items-center gap-2 p-3 rounded-xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <span className="text-xl">{icon}</span>
          <div>
            <span className="text-sm font-bold" style={{ color: color }}>{name || "Tên vai trò"}</span>
            <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{description || "Mô tả vai trò"}</p>
          </div>
          <div className="ml-auto w-3 h-3 rounded-full" style={{ background: color }} />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}>
            Hủy
          </button>
          <button onClick={handleSave} disabled={!name.trim() || saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
            style={{
              background: name.trim() ? "linear-gradient(135deg, #d97706, #b45309)" : "rgba(255,255,255,0.06)",
              color: name.trim() ? "#fff" : "rgba(255,255,255,0.3)",
              boxShadow: name.trim() ? "0 4px 16px rgba(217,119,6,0.3)" : undefined,
            }}>
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
            {initial ? "Lưu thay đổi" : "Tạo vai trò"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RolesManagementClient() {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editedPerms, setEditedPerms] = useState<RolePermissions | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/crm/roles");
    const data = await res.json();
    setRoles(data);
    setLoading(false);
    if (!selectedId && data.length > 0) {
      setSelectedId(data[0].id);
      setEditedPerms({ ...data[0].permissions });
    }
  }, [selectedId]);

  useEffect(() => { load(); }, []);

  const selectedRole = roles.find(r => r.id === selectedId) ?? null;
  const currentPerms = editedPerms ?? selectedRole?.permissions ?? null;

  const selectRole = (role: CustomRole) => {
    setSelectedId(role.id);
    setEditedPerms({ ...role.permissions });
    setSaved(false);
  };

  const handlePermChange = (perms: RolePermissions) => {
    setEditedPerms(perms);
    setSaved(false);
  };

  const handleSavePerms = async () => {
    if (!selectedRole || !editedPerms) return;
    setSaving(true);
    const res = await fetch(`/api/crm/roles/${selectedRole.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: editedPerms }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      await load();
    }
    setSaving(false);
  };

  const handleCreate = async (data: { name: string; color: string; icon: string; description: string; permissions: RolePermissions }) => {
    const res = await fetch("/api/crm/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const created = await res.json();
    setShowCreateModal(false);
    await load();
    setSelectedId(created.id);
    setEditedPerms({ ...created.permissions });
  };

  const handleEditMeta = async (data: { name: string; color: string; icon: string; description: string; permissions: RolePermissions }) => {
    if (!editingRole) return;
    await fetch(`/api/crm/roles/${editingRole.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: data.name, color: data.color, icon: data.icon, description: data.description }),
    });
    setEditingRole(null);
    await load();
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/crm/roles/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!data.ok) {
      setError(data.error);
      setTimeout(() => setError(null), 4000);
    } else {
      setDeleteConfirm(null);
      if (selectedId === id) setSelectedId(null);
      await load();
    }
  };

  const permCount = currentPerms
    ? Object.values(currentPerms).filter(Boolean).length
    : 0;
  const totalPerms = Object.keys(PERMISSION_LABELS).length;

  return (
    <div className="min-h-screen p-6" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1a0e 50%, #1a1200 100%)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #d97706, #b45309)", boxShadow: "0 4px 16px rgba(217,119,6,0.3)" }}>
            <Shield size={20} style={{ color: "#fff" }} />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "#f5edd6" }}>Quản lý Vai trò & Phân quyền</h1>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              Tạo và cấu hình quyền truy cập cho từng nhóm nhân viên
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{
            background: "linear-gradient(135deg, #d97706, #b45309)",
            color: "#fff",
            boxShadow: "0 4px 16px rgba(217,119,6,0.3)",
          }}>
          <Plus size={15} /> Tạo vai trò mới
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 flex items-center gap-2 p-3 rounded-xl"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
          <AlertCircle size={14} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64" style={{ color: "rgba(255,255,255,0.4)" }}>
          <RefreshCw size={20} className="animate-spin mr-2" /> Đang tải...
        </div>
      ) : (
        <div className="flex gap-5">
          {/* Left: Role list */}
          <div className="w-64 flex-shrink-0 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest px-1 mb-3"
              style={{ color: "rgba(255,255,255,0.3)" }}>
              {roles.length} vai trò
            </p>
            {roles.map(role => (
              <div key={role.id} className="relative group">
                <RoleCard role={role} selected={selectedId === role.id} onClick={() => selectRole(role)} />
                {/* Action buttons on hover */}
                {!role.isSystem && (
                  <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                    <button
                      onClick={e => { e.stopPropagation(); setEditingRole(role); }}
                      className="w-6 h-6 rounded-lg flex items-center justify-center transition-all"
                      style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}>
                      <Edit3 size={11} style={{ color: "rgba(255,255,255,0.6)" }} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteConfirm(role.id); }}
                      className="w-6 h-6 rounded-lg flex items-center justify-center transition-all"
                      style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                      <Trash2 size={11} style={{ color: "#f87171" }} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Right: Permission editor */}
          {selectedRole && currentPerms ? (
            <div className="flex-1 min-w-0">
              {/* Role header */}
              <div className="flex items-center justify-between mb-4 p-4 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{selectedRole.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold" style={{ color: selectedRole.color }}>{selectedRole.name}</h2>
                      {selectedRole.isSystem && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider"
                          style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.3)" }}>
                          Hệ thống
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{selectedRole.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-bold" style={{ color: "#f5edd6" }}>{permCount}/{totalPerms}</div>
                    <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>quyền được bật</div>
                  </div>
                  {!selectedRole.isSystem && (
                    <button
                      onClick={handleSavePerms}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                      style={{
                        background: saved
                          ? "linear-gradient(135deg, #22c55e, #16a34a)"
                          : "linear-gradient(135deg, #d97706, #b45309)",
                        color: "#fff",
                        boxShadow: saved
                          ? "0 4px 16px rgba(34,197,94,0.3)"
                          : "0 4px 16px rgba(217,119,6,0.3)",
                      }}>
                      {saving ? (
                        <RefreshCw size={13} className="animate-spin" />
                      ) : saved ? (
                        <CheckCircle2 size={13} />
                      ) : (
                        <Save size={13} />
                      )}
                      {saved ? "Đã lưu!" : "Lưu quyền"}
                    </button>
                  )}
                </div>
              </div>

              {selectedRole.isSystem && (
                <div className="mb-4 flex items-center gap-2 p-3 rounded-xl"
                  style={{ background: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.15)" }}>
                  <Shield size={13} style={{ color: "#C9A84C" }} />
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Vai trò <strong style={{ color: "#C9A84C" }}>{selectedRole.name}</strong> là vai trò hệ thống — không thể chỉnh sửa quyền.
                  </p>
                </div>
              )}

              <PermissionEditor
                role={{ ...selectedRole, permissions: currentPerms }}
                roles={roles}
                onChange={handlePermChange}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center" style={{ color: "rgba(255,255,255,0.3)" }}>
              <div className="text-center">
                <Shield size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Chọn một vai trò để xem và chỉnh sửa quyền</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <RoleFormModal
          onSave={handleCreate}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Edit meta modal */}
      {editingRole && (
        <RoleFormModal
          initial={editingRole}
          onSave={handleEditMeta}
          onClose={() => setEditingRole(null)}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(10,15,30,0.75)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4"
            style={{
              background: "linear-gradient(145deg, #1a1200, #0f0d00)",
              border: "1px solid rgba(239,68,68,0.3)",
              boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
            }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                <Trash2 size={18} style={{ color: "#f87171" }} />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: "#f5edd6" }}>Xóa vai trò?</h3>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Hành động này không thể hoàn tác
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}>
                Hủy
              </button>
              <button onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "#fff" }}>
                Xóa vai trò
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
