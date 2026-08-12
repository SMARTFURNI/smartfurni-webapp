"use client";

import { useEffect, useMemo, useState } from "react";
import { Link2, Loader2, Search, Unlink, X } from "lucide-react";

interface LeadOption {
  id: string;
  name: string;
  phone?: string;
  company?: string;
  type?: string;
  stage?: string;
}

export default function ZaloLeadLinkModal({
  conversationId,
  currentLeadId,
  onClose,
  onLinked,
}: {
  conversationId: string;
  currentLeadId?: string | null;
  onClose: () => void;
  onLinked: () => void;
}) {
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/crm/leads", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Không tải được danh sách khách hàng");
        return response.json();
      })
      .then((data) => setLeads(Array.isArray(data) ? data : []))
      .catch((reason) => setError(reason.message || "Không tải được danh sách khách hàng"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return leads.slice(0, 30);
    return leads.filter((lead) => [lead.name, lead.phone, lead.company]
      .some((value) => String(value || "").toLowerCase().includes(normalized))).slice(0, 30);
  }, [leads, query]);

  const submit = async (leadId: string | null) => {
    setSaving(leadId || "unlink");
    setError(null);
    try {
      const response = await fetch("/api/crm/zalo-inbox/conversations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, leadId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Không thể liên kết hồ sơ");
      onLinked();
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể liên kết hồ sơ");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10020, display: "grid", placeItems: "center", padding: 18, background: "rgba(15,23,42,.58)", backdropFilter: "blur(5px)" }} onMouseDown={onClose}>
      <div style={{ width: "min(560px, 100%)", maxHeight: "min(720px, 88dvh)", display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid #e8d69b", borderRadius: 20, background: "#fff", boxShadow: "0 28px 80px rgba(15,23,42,.25)" }} onMouseDown={(event) => event.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 20px", borderBottom: "1px solid #e4eaf1", background: "linear-gradient(120deg,#fff,#fffaf0)" }}>
          <div style={{ width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: 12, color: "#87620d", background: "linear-gradient(145deg,#fff8de,#ffe89a)" }}><Link2 size={20} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#172033", fontSize: 16, fontWeight: 800 }}>Liên kết hồ sơ CRM</div>
            <div style={{ marginTop: 2, color: "#738196", fontSize: 12 }}>Chọn đúng khách hàng để đồng bộ loại, giai đoạn và nhân viên phụ trách.</div>
          </div>
          <button onClick={onClose} aria-label="Đóng" style={{ width: 34, height: 34, display: "grid", placeItems: "center", cursor: "pointer", border: "1px solid #dbe3ee", borderRadius: 10, color: "#738196", background: "#fff" }}><X size={17} /></button>
        </div>
        <div style={{ padding: 16, borderBottom: "1px solid #edf1f6" }}>
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#8290a4" }} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} autoFocus placeholder="Tìm theo tên, số điện thoại hoặc công ty..." style={{ width: "100%", boxSizing: "border-box", padding: "11px 14px 11px 39px", border: "1px solid #d6e0ec", borderRadius: 12, outline: "none", color: "#172033", background: "#f8fafc", font: "inherit", fontSize: 13 }} />
          </div>
          {currentLeadId && <button onClick={() => submit(null)} disabled={!!saving} style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 10, padding: "8px 11px", cursor: "pointer", border: "1px solid #fecaca", borderRadius: 10, color: "#b42318", background: "#fff5f5", fontSize: 12, fontWeight: 700 }}><Unlink size={14} /> Bỏ liên kết hiện tại</button>}
          {error && <div style={{ marginTop: 10, padding: "9px 11px", borderRadius: 10, color: "#b42318", background: "#fff1f2", fontSize: 12 }}>{error}</div>}
        </div>
        <div style={{ minHeight: 180, overflowY: "auto", padding: 10 }}>
          {loading ? <div style={{ height: 190, display: "grid", placeItems: "center", color: "#738196" }}><Loader2 size={22} style={{ animation: "spin .8s linear infinite" }} /></div> : filtered.length === 0 ? <div style={{ padding: 48, textAlign: "center", color: "#738196", fontSize: 13 }}>Không tìm thấy hồ sơ phù hợp.</div> : filtered.map((lead) => (
            <button key={lead.id} onClick={() => submit(lead.id)} disabled={!!saving} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", cursor: saving ? "wait" : "pointer", border: 0, borderRadius: 12, textAlign: "left", color: "#172033", background: lead.id === currentLeadId ? "#fff8df" : "transparent" }}>
              <div style={{ width: 38, height: 38, display: "grid", placeItems: "center", flex: "0 0 auto", borderRadius: "50%", color: "#fff", background: "linear-gradient(145deg,#3b82f6,#2563eb)", fontWeight: 800 }}>{lead.name?.trim()?.[0]?.toUpperCase() || "K"}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13, fontWeight: 750 }}>{lead.name || "Khách hàng chưa đặt tên"}</div>
                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 3, color: "#738196", fontSize: 12 }}>{[lead.phone, lead.company, lead.type].filter(Boolean).join(" · ") || "Chưa có thông tin liên hệ"}</div>
              </div>
              {saving === lead.id ? <Loader2 size={17} style={{ animation: "spin .8s linear infinite" }} color="#9a7418" /> : lead.id === currentLeadId ? <span style={{ color: "#8a6714", fontSize: 11, fontWeight: 800 }}>Đang liên kết</span> : <Link2 size={16} color="#8290a4" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
