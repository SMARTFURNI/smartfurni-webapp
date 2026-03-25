"use client";

import { useState, useEffect } from "react";
import {
  Key, Plus, Trash2, Save, RefreshCw, Eye, EyeOff,
  CheckCircle2, Copy, Shield, Lock, Unlock,
} from "lucide-react";
import type { PermissionSet, ApiKey, ApiKeyPermission } from "@/lib/crm-audit-store";
import { PERMISSION_LABELS, PERMISSION_GROUPS } from "@/lib/crm-audit-store";

// ─── Permission Matrix Tab ────────────────────────────────────────────────────

function PermissionMatrixTab() {
  const [matrix, setMatrix] = useState<PermissionSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/crm/permissions").then(r => r.json()).then(d => { setMatrix(d); setLoading(false); });
  }, []);

  const toggle = (roleIdx: number, perm: keyof PermissionSet["permissions"]) => {
    setMatrix(prev => prev.map((ps, i) =>
      i === roleIdx ? { ...ps, permissions: { ...ps.permissions, [perm]: !ps.permissions[perm] } } : ps
    ));
  };

  const save = async () => {
    setSaving(true);
    await fetch("/api/crm/permissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(matrix),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-40" style={{ color: "rgba(255,255,255,0.3)" }}>
      <RefreshCw size={18} className="animate-spin mr-2" /> Đang tải...
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
          Cấu hình quyền hạn cho từng cấp bậc nhân viên
        </p>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
              style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>
              <CheckCircle2 size={12} /> Đã lưu
            </span>
          )}
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #C9A84C, #E2C97E)", color: "#000" }}>
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            Lưu phân quyền
          </button>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                <th className="px-4 py-3 text-left text-xs font-semibold w-48" style={{ color: "rgba(255,255,255,0.35)" }}>Quyền hạn</th>
                {matrix.map(ps => (
                  <th key={ps.role} className="px-4 py-3 text-center text-xs font-semibold">
                    <div className="flex flex-col items-center gap-1">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: `${ps.color}20`, color: ps.color }}>
                        {ps.label}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_GROUPS.map(group => (
                <>
                  <tr key={group.label} style={{ background: "rgba(255,255,255,0.02)" }}>
                    <td colSpan={matrix.length + 1} className="px-4 py-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: "rgba(255,255,255,0.25)" }}>{group.label}</span>
                    </td>
                  </tr>
                  {group.keys.map(perm => (
                    <tr key={perm} className="transition-all hover:bg-white/2"
                      style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      <td className="px-4 py-2.5">
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
                          {PERMISSION_LABELS[perm]}
                        </span>
                      </td>
                      {matrix.map((ps, roleIdx) => (
                        <td key={ps.role} className="px-4 py-2.5 text-center">
                          <button
                            onClick={() => ps.role !== "admin" ? toggle(roleIdx, perm) : undefined}
                            disabled={ps.role === "admin"}
                            className="w-6 h-6 rounded-lg flex items-center justify-center mx-auto transition-all"
                            style={{
                              background: ps.permissions[perm] ? `${ps.color}20` : "rgba(255,255,255,0.04)",
                              border: `1px solid ${ps.permissions[perm] ? `${ps.color}40` : "rgba(255,255,255,0.08)"}`,
                              cursor: ps.role === "admin" ? "default" : "pointer",
                            }}>
                            {ps.permissions[perm] ? (
                              <CheckCircle2 size={12} style={{ color: ps.color }} />
                            ) : (
                              <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
                            )}
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-3 rounded-xl flex items-start gap-2"
        style={{ background: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.15)" }}>
        <Lock size={13} className="mt-0.5 flex-shrink-0" style={{ color: "#C9A84C" }} />
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
          Quyền của <strong style={{ color: "#C9A84C" }}>Quản trị viên</strong> không thể thay đổi — luôn có toàn quyền hệ thống.
          Các thay đổi phân quyền sẽ áp dụng cho nhân viên khi đăng nhập lần tiếp theo.
        </p>
      </div>
    </div>
  );
}

// ─── API Keys Tab ─────────────────────────────────────────────────────────────

const ALL_PERMISSIONS: { key: ApiKeyPermission; label: string }[] = [
  { key: "leads:read", label: "Đọc KH" },
  { key: "leads:write", label: "Ghi KH" },
  { key: "quotes:read", label: "Đọc báo giá" },
  { key: "quotes:write", label: "Ghi báo giá" },
  { key: "activities:read", label: "Đọc hoạt động" },
  { key: "activities:write", label: "Ghi hoạt động" },
  { key: "webhook:receive", label: "Nhận webhook" },
  { key: "reports:read", label: "Đọc báo cáo" },
  { key: "settings:read", label: "Đọc cài đặt" },
];

function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyPerms, setNewKeyPerms] = useState<ApiKeyPermission[]>(["leads:read", "webhook:receive"]);
  const [newKeyExpiry, setNewKeyExpiry] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/crm/apikeys");
    setKeys(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/crm/apikeys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newKeyName, permissions: newKeyPerms, expiresAt: newKeyExpiry || null }),
    });
    const data = await res.json();
    setRevealedKey(data.rawKey);
    setNewKeyName("");
    setShowCreate(false);
    setCreating(false);
    load();
  };

  const revoke = async (id: string) => {
    await fetch("/api/crm/apikeys", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: "revoke" }) });
    load();
  };

  const deleteKey = async (id: string) => {
    if (!confirm("Xóa API key này?")) return;
    await fetch("/api/crm/apikeys", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: "delete" }) });
    load();
  };

  const copyKey = () => {
    if (revealedKey) { navigator.clipboard.writeText(revealedKey); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  return (
    <div className="space-y-5">
      {/* Revealed key banner */}
      {revealedKey && (
        <div className="p-4 rounded-xl"
          style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold" style={{ color: "#22c55e" }}>
              ✓ API Key đã tạo — Sao chép ngay, sẽ không hiển thị lại!
            </span>
            <button onClick={() => setRevealedKey(null)} className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>✕</button>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs px-3 py-2 rounded-lg font-mono break-all"
              style={{ background: "rgba(0,0,0,0.3)", color: "#22c55e" }}>
              {revealedKey}
            </code>
            <button onClick={copyKey}
              className="p-2 rounded-lg transition-all flex-shrink-0"
              style={{ background: copied ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.08)", color: copied ? "#22c55e" : "rgba(255,255,255,0.4)" }}>
              {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
          {keys.length} API key — dùng cho Make.com, n8n, tích hợp bên thứ 3
        </p>
        <button onClick={() => setShowCreate(v => !v)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
          style={{ background: "rgba(201,168,76,0.12)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.25)" }}>
          <Plus size={12} /> Tạo API Key mới
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="p-4 rounded-xl space-y-4"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,168,76,0.2)" }}>
          <h3 className="text-sm font-semibold text-white">Tạo API Key mới</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>Tên key</label>
              <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
                placeholder="VD: Make.com Integration"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>Hết hạn (để trống = không hết hạn)</label>
              <input type="date" value={newKeyExpiry} onChange={e => setNewKeyExpiry(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
            </div>
          </div>
          <div>
            <label className="block text-xs mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>Quyền truy cập</label>
            <div className="flex flex-wrap gap-2">
              {ALL_PERMISSIONS.map(p => (
                <button key={p.key}
                  onClick={() => setNewKeyPerms(prev =>
                    prev.includes(p.key) ? prev.filter(x => x !== p.key) : [...prev, p.key]
                  )}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: newKeyPerms.includes(p.key) ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.04)",
                    color: newKeyPerms.includes(p.key) ? "#C9A84C" : "rgba(255,255,255,0.35)",
                    border: `1px solid ${newKeyPerms.includes(p.key) ? "rgba(201,168,76,0.3)" : "rgba(255,255,255,0.07)"}`,
                  }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-sm"
              style={{ color: "rgba(255,255,255,0.4)" }}>Hủy</button>
            <button onClick={create} disabled={creating || !newKeyName.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #C9A84C, #E2C97E)", color: "#000" }}>
              {creating ? <RefreshCw size={13} className="animate-spin" /> : <Key size={13} />}
              Tạo Key
            </button>
          </div>
        </div>
      )}

      {/* Keys list */}
      {loading ? (
        <div className="text-center py-8" style={{ color: "rgba(255,255,255,0.3)" }}>
          <RefreshCw size={18} className="animate-spin mx-auto" />
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center py-12" style={{ color: "rgba(255,255,255,0.25)" }}>
          <Key size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Chưa có API Key nào</p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map(k => (
            <div key={k.id} className="p-4 rounded-xl"
              style={{
                background: k.enabled ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.01)",
                border: `1px solid ${k.enabled ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)"}`,
              }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: k.enabled ? "rgba(201,168,76,0.1)" : "rgba(255,255,255,0.04)" }}>
                    <Key size={14} style={{ color: k.enabled ? "#C9A84C" : "rgba(255,255,255,0.2)" }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: k.enabled ? "#fff" : "rgba(255,255,255,0.3)" }}>
                        {k.name}
                      </span>
                      {!k.enabled && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>Thu hồi</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <code className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
                        {k.keyPrefix}••••••••••••••••
                      </code>
                      {k.lastUsedAt && (
                        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>
                          Dùng lần cuối: {new Date(k.lastUsedAt).toLocaleDateString("vi-VN")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {k.enabled && (
                    <button onClick={() => revoke(k.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all hover:opacity-80"
                      style={{ background: "rgba(251,191,36,0.08)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.2)" }}>
                      <Lock size={11} /> Thu hồi
                    </button>
                  )}
                  <button onClick={() => deleteKey(k.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 transition-all"
                    style={{ color: "rgba(255,255,255,0.2)" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {k.permissions.map(p => (
                  <span key={p} className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                    style={{ background: "rgba(96,165,250,0.08)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.15)" }}>
                    {p}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type TabId = "permissions" | "apikeys";

export default function PermissionsClient() {
  const [tab, setTab] = useState<TabId>("permissions");

  const TABS = [
    { id: "permissions" as TabId, label: "Ma trận phân quyền", icon: Shield },
    { id: "apikeys" as TabId, label: "API Keys", icon: Key },
  ];

  return (
    <div className="space-y-5" style={{ color: "#fff" }}>
      <div>
        <h1 className="text-lg font-bold text-white">Bảo mật & Truy cập</h1>
        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
          Phân quyền chi tiết và quản lý API Keys tích hợp
        </p>
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === t.id ? "rgba(201,168,76,0.12)" : "transparent",
              color: tab === t.id ? "#C9A84C" : "rgba(255,255,255,0.4)",
            }}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "permissions" && <PermissionMatrixTab />}
      {tab === "apikeys" && <ApiKeysTab />}
    </div>
  );
}
