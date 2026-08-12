'use client';

import React, { useState } from 'react';
import { MessageCircle, Phone, Mail, Copy, CheckCircle2, ExternalLink, X, UserPlus, PhoneCall } from 'lucide-react';
import type { Lead } from '@/lib/crm-types';
import ZaloPersonalAddFriendModal from '@/components/crm/ZaloPersonalAddFriendModal';

interface CustomerContactActionsProps {
  lead: Lead;
  className?: string;
}

// Light CRM palette, aligned with the Zalo OA workspace.
const D = {
  // Dropdown panel
  panelBg:     "rgba(255,255,255,0.98)",
  panelBorder: "rgba(203,213,225,0.92)",
  // Header per type
  zaloHeader:  "linear-gradient(135deg, #eff6ff, #dbeafe)",
  callHeader:  "linear-gradient(135deg, #ecfdf5, #d1fae5)",
  emailHeader: "linear-gradient(135deg, #faf5ff, #ede9fe)",
  // Item hover
  itemHover:   "rgba(212,175,69,0.10)",
  // Icon bg per type
  zaloIconBg:  "linear-gradient(135deg, #dbeafe, #bfdbfe)",
  callIconBg:  "linear-gradient(135deg, #d1fae5, #a7f3d0)",
  emailIconBg: "linear-gradient(135deg, #ede9fe, #ddd6fe)",
  copyIconBg:  "linear-gradient(135deg, #fef3c7, #fde68a)",
  // Colors
  zaloColor:   "#60a5fa",
  callColor:   "#4ade80",
  emailColor:  "#c084fc",
  goldColor:   "#f59e0b",
  textPrimary: "#172033",
  textMuted:   "#64748b",
  textDim:     "#94a3b8",
  divider:     "#e2e8f0",
};

export default function CustomerContactActions({
  lead,
  className = '',
}: CustomerContactActionsProps) {
  const [activeMenu, setActiveMenu] = useState<'zalo' | 'call' | 'email' | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);

  const zaloPhone = lead.zaloPhone || lead.phone;
  const normalizedPhone = zaloPhone.replace(/\D/g, '');
  const zaloLink = `https://zalo.me/${normalizedPhone}`;

  const handleOpenZalo = () => { window.open(zaloLink, '_blank'); setActiveMenu(null); };
  const handleCopyZaloPhone = () => { navigator.clipboard.writeText(normalizedPhone); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleCall = () => { window.location.href = `tel:${lead.phone}`; setActiveMenu(null); };
  const handleCallViaTongDai = () => {
    window.dispatchEvent(new CustomEvent("ity:call", {
      detail: { phone: lead.phone, leadId: lead.id, leadName: lead.name }
    }));
    setActiveMenu(null);
  };
  const handleCopyPhone = () => { navigator.clipboard.writeText(lead.phone); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleSendEmail = () => { window.location.href = `mailto:${lead.email}`; setActiveMenu(null); };
  const handleCopyEmail = () => { navigator.clipboard.writeText(lead.email); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  // Nút icon nhỏ — glass morphism style
  function ActionBtn({
    type, disabled, onClick, color, icon: Icon, label,
  }: {
    type: 'zalo' | 'call' | 'email';
    disabled: boolean;
    onClick: () => void;
    color: string;
    icon: React.ElementType;
    label: string;
  }) {
    const isActive = activeMenu === type;
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        title={label}
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: disabled
            ? "linear-gradient(135deg, #f8fafc, #e2e8f0)"
            : type === "zalo"
            ? "linear-gradient(135deg, #eff6ff, #dbeafe)"
            : type === "call"
            ? "linear-gradient(135deg, #ecfdf5, #d1fae5)"
            : "linear-gradient(135deg, #faf5ff, #ede9fe)",
          border: `1px solid ${isActive ? `${color}70` : `${color}32`}`,
          color: disabled ? "#cbd5e1" : color,
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "all 0.15s ease",
          flexShrink: 0,
          boxShadow: isActive ? `0 6px 14px ${color}26` : "0 3px 8px rgba(15,23,42,0.06)",
        }}
        onMouseEnter={e => {
          if (!disabled && !isActive) {
            (e.currentTarget as HTMLElement).style.filter = "saturate(1.12)";
            (e.currentTarget as HTMLElement).style.borderColor = `${color}40`;
            (e.currentTarget as HTMLElement).style.transform = "translateY(-1px) scale(1.06)";
          }
        }}
        onMouseLeave={e => {
          if (!disabled && !isActive) {
            (e.currentTarget as HTMLElement).style.filter = "none";
            (e.currentTarget as HTMLElement).style.borderColor = `${color}32`;
            (e.currentTarget as HTMLElement).style.transform = "scale(1)";
          }
        }}
      >
        <Icon size={13} />
      </button>
    );
  }

  // Dropdown item row
  function DropdownItem({
    onClick, iconBg, iconColor, icon: Icon, title, subtitle, arrow = false,
  }: {
    onClick: () => void;
    iconBg: string;
    iconColor: string;
    icon: React.ElementType;
    title: string;
    subtitle: string;
    arrow?: boolean;
  }) {
    return (
      <button
        onClick={onClick}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "9px 12px",
          borderRadius: 10,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          transition: "background 0.12s",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = D.itemHover)}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: iconBg, flexShrink: 0,
        }}>
          <Icon size={14} style={{ color: iconColor }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: D.textPrimary, margin: 0 }}>{title}</p>
          <p style={{ fontSize: 11, color: D.textMuted, margin: 0 }}>{subtitle}</p>
        </div>
        {arrow && <span style={{ color: D.textDim, fontSize: 14 }}>→</span>}
      </button>
    );
  }

  // Dropdown panel wrapper
  const dropdownStyle: React.CSSProperties = {
    position: "absolute",
    top: "calc(100% + 6px)",
    right: 0,
    width: 264,
    background: D.panelBg,
    border: `1px solid ${D.panelBorder}`,
    borderRadius: 14,
    boxShadow: "0 22px 60px rgba(15,23,42,0.18), 0 4px 16px rgba(15,23,42,0.08)",
    zIndex: 9999,
    overflow: "hidden",
    backdropFilter: "blur(20px)",
  };

  return (
    <div className={`flex items-center gap-1 ${className}`} style={{ position: "relative" }}>

      {/* ── Zalo Button ── */}
      <div style={{ position: "relative" }}>
        <ActionBtn
          type="zalo" disabled={!zaloPhone}
          onClick={() => setActiveMenu(activeMenu === 'zalo' ? null : 'zalo')}
          color={D.zaloColor} icon={MessageCircle} label="Kết bạn Zalo"
        />
        {activeMenu === 'zalo' && zaloPhone && (
          <div style={dropdownStyle}>
            {/* Header */}
            <div style={{ padding: "12px 14px 10px", borderBottom: `1px solid ${D.divider}`, background: D.zaloHeader }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: D.zaloColor, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>💬 Kết Bạn Zalo</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: D.textPrimary, marginTop: 6, marginBottom: 2 }}>{lead.name}</p>
                  <p style={{ fontSize: 12, fontFamily: "monospace", color: D.zaloColor, fontWeight: 600, margin: 0 }}>{normalizedPhone}</p>
                </div>
                <button onClick={() => setActiveMenu(null)} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 6, padding: 4, cursor: "pointer", color: D.textMuted, lineHeight: 0 }}>
                  <X size={13} />
                </button>
              </div>
            </div>
            <div style={{ padding: "6px 6px" }}>
              <DropdownItem onClick={handleOpenZalo} iconBg={D.zaloIconBg} iconColor={D.zaloColor} icon={ExternalLink} title="Mở Zalo" subtitle="Kết bạn trực tiếp" arrow />
              <DropdownItem onClick={handleCopyZaloPhone} iconBg={copied ? "rgba(74,222,128,0.15)" : D.copyIconBg} iconColor={copied ? D.callColor : D.goldColor} icon={copied ? CheckCircle2 : Copy} title={copied ? "✓ Đã sao chép" : "Sao chép số"} subtitle="Dán vào Zalo" />
              <div style={{ height: 1, background: D.divider, margin: "4px 6px" }} />
              <p style={{ fontSize: 10, fontWeight: 700, color: D.textDim, textTransform: "uppercase", letterSpacing: "0.08em", padding: "2px 6px 4px" }}>Zalo Personal</p>
              <DropdownItem onClick={() => { setActiveMenu(null); setShowAddFriendModal(true); }} iconBg={D.zaloIconBg} iconColor={D.zaloColor} icon={UserPlus} title="Gửi lời mời kết bạn" subtitle="Tự động qua Zalo cá nhân" arrow />
            </div>
          </div>
        )}
      </div>

      {/* ── Call Button ── */}
      <div style={{ position: "relative" }}>
        <ActionBtn
          type="call" disabled={!lead.phone}
          onClick={() => setActiveMenu(activeMenu === 'call' ? null : 'call')}
          color={D.callColor} icon={Phone} label="Gọi điện"
        />
        {activeMenu === 'call' && lead.phone && (
          <div style={dropdownStyle}>
            <div style={{ padding: "12px 14px 10px", borderBottom: `1px solid ${D.divider}`, background: D.callHeader }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: D.callColor, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>☎️ Gọi Điện</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: D.textPrimary, marginTop: 6, marginBottom: 2 }}>{lead.name}</p>
                  <p style={{ fontSize: 12, fontFamily: "monospace", color: D.callColor, fontWeight: 600, margin: 0 }}>{lead.phone}</p>
                </div>
                <button onClick={() => setActiveMenu(null)} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 6, padding: 4, cursor: "pointer", color: D.textMuted, lineHeight: 0 }}>
                  <X size={13} />
                </button>
              </div>
            </div>
            <div style={{ padding: "6px 6px" }}>
              <DropdownItem onClick={handleCallViaTongDai} iconBg="rgba(74,222,128,0.20)" iconColor={D.callColor} icon={PhoneCall} title="Gọi qua tổng đài" subtitle="Webphone ITY" arrow />
              <DropdownItem onClick={handleCall} iconBg={D.callIconBg} iconColor={D.callColor} icon={Phone} title="Gọi ngay" subtitle="Khởi động ứng dụng gọi" arrow />
              <DropdownItem onClick={handleCopyPhone} iconBg={copied ? "rgba(74,222,128,0.15)" : D.copyIconBg} iconColor={copied ? D.callColor : D.goldColor} icon={copied ? CheckCircle2 : Copy} title={copied ? "✓ Đã sao chép" : "Sao chép số"} subtitle="Dán vào điện thoại" />
            </div>
          </div>
        )}
      </div>

      {/* ── Email Button ── */}
      <div style={{ position: "relative" }}>
        <ActionBtn
          type="email" disabled={!lead.email}
          onClick={() => setActiveMenu(activeMenu === 'email' ? null : 'email')}
          color={D.emailColor} icon={Mail} label="Gửi Email"
        />
        {activeMenu === 'email' && lead.email && (
          <div style={dropdownStyle}>
            <div style={{ padding: "12px 14px 10px", borderBottom: `1px solid ${D.divider}`, background: D.emailHeader }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: D.emailColor, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>✉️ Gửi Email</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: D.textPrimary, marginTop: 6, marginBottom: 2 }}>{lead.name}</p>
                  <p style={{ fontSize: 12, fontFamily: "monospace", color: D.emailColor, fontWeight: 600, margin: 0, wordBreak: "break-all" }}>{lead.email}</p>
                </div>
                <button onClick={() => setActiveMenu(null)} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 6, padding: 4, cursor: "pointer", color: D.textMuted, lineHeight: 0 }}>
                  <X size={13} />
                </button>
              </div>
            </div>
            <div style={{ padding: "6px 6px" }}>
              <DropdownItem onClick={handleSendEmail} iconBg={D.emailIconBg} iconColor={D.emailColor} icon={Mail} title="Soạn email" subtitle="Mở ứng dụng email" arrow />
              <DropdownItem onClick={handleCopyEmail} iconBg={copied ? "rgba(74,222,128,0.15)" : D.copyIconBg} iconColor={copied ? D.callColor : D.goldColor} icon={copied ? CheckCircle2 : Copy} title={copied ? "✓ Đã sao chép" : "Sao chép email"} subtitle="Dán vào email" />
            </div>
          </div>
        )}
      </div>

      {/* Backdrop */}
      {activeMenu && (
        <div className="fixed inset-0" style={{ zIndex: 9998 }} onClick={() => setActiveMenu(null)} />
      )}

      {/* Zalo Personal Add Friend Modal */}
      {showAddFriendModal && (
        <ZaloPersonalAddFriendModal
          leadName={lead.name}
          leadPhone={zaloPhone}
          onClose={() => setShowAddFriendModal(false)}
        />
      )}
    </div>
  );
}
