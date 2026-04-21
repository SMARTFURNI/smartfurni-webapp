"use client";
/**
 * HotlineInboundClient — Quản lý cuộc gọi đến từ 4 số hotline
 * Nhận webhook từ ITY Inbound, hiển thị lịch sử + file ghi âm
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  PhoneIncoming, PhoneMissed, Phone, PhoneOff,
  Play, Pause, Volume2, VolumeX,
  Search, RefreshCw, Download, Copy, Check,
  Clock, Calendar, Mic, ExternalLink,
  ChevronDown, ChevronUp, Info, Filter,
} from "lucide-react";

// ── Theme ─────────────────────────────────────────────────────────────────────
const T = {
  bg: "#F8FAFC",
  card: "#FFFFFF",
  cardBorder: "#E2E8F0",
  cardShadow: "0 1px 4px rgba(0,0,0,0.06)",
  primary: "#0F172A",
  accent: "#F59E0B",
  accentBg: "#FFFBEB",
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  divider: "#F1F5F9",
  green: "#059669", greenBg: "#ECFDF5",
  red: "#DC2626",   redBg: "#FEF2F2",
  gold: "#D97706",  goldBg: "#FFFBEB",
  blue: "#2563EB",  blueBg: "#EFF6FF",
  gray: "#64748B",  grayBg: "#F8FAFC",
};

// ── Types ─────────────────────────────────────────────────────────────────────
type CallStatus = "answered" | "missed" | "busy" | "failed";

interface HotlineCall {
  id: string;
  call_id: string;
  hotline_number: string;
  caller_number: string;
  extension: string;
  duration: number;
  billsec: number;
  status: string;
  recording_url: string | null;
  userfield: string | null;
  direction: string;
  started_at: string;
  created_at: string;
}

interface Stats {
  total: number;
  answered: number;
  missed: number;
  totalDuration: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDatetime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtDuration(secs: number) {
  if (!secs) return "0s";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}p ${s}s` : `${s}s`;
}

function today() { return new Date().toISOString().slice(0, 10); }
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    answered: { label: "Nghe máy", color: T.green, bg: T.greenBg, icon: <Phone size={10} /> },
    missed:   { label: "Nhỡ",      color: T.red,   bg: T.redBg,   icon: <PhoneMissed size={10} /> },
    busy:     { label: "Bận",      color: T.gold,  bg: T.goldBg,  icon: <PhoneOff size={10} /> },
    failed:   { label: "Lỗi",      color: T.gray,  bg: T.grayBg,  icon: <PhoneOff size={10} /> },
  };
  const s = map[status] || map.failed;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}30` }}>
      {s.icon}{s.label}
    </span>
  );
}

// ── Audio Player ──────────────────────────────────────────────────────────────
function AudioPlayer({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrentTime(a.currentTime);
    const onMeta = () => setDuration(a.duration);
    const onEnd  = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().catch(() => {}); setPlaying(true); }
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Number(e.target.value);
    setCurrentTime(Number(e.target.value));
  };

  const fmtTime = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-2 mt-2 p-2 rounded-lg" style={{ background: T.accentBg, border: `1px solid ${T.accent}30` }}>
      <audio ref={audioRef} src={url} preload="metadata" />
      <button onClick={toggle}
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: T.accent, color: "#fff" }}>
        {playing ? <Pause size={12} /> : <Play size={12} />}
      </button>
      <input type="range" min={0} max={duration || 100} value={currentTime}
        onChange={seek} className="flex-1 h-1 accent-amber-500" />
      <span className="text-[11px] flex-shrink-0" style={{ color: T.textMuted }}>
        {fmtTime(currentTime)} / {fmtTime(duration)}
      </span>
      <button onClick={() => { const a = audioRef.current; if (a) { a.muted = !muted; setMuted(!muted); } }}
        style={{ color: T.textMuted }}>
        {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
      </button>
      <a href={url} target="_blank" rel="noopener noreferrer" title="Mở ghi âm"
        style={{ color: T.textMuted }}>
        <ExternalLink size={13} />
      </a>
    </div>
  );
}

// ── Call Row ──────────────────────────────────────────────────────────────────
function CallRow({ call }: { call: HotlineCall }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="rounded-xl mb-2 overflow-hidden" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(e => !e)}>
        {/* Icon */}
        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: call.status === "answered" ? T.greenBg : T.redBg }}>
          {call.status === "answered"
            ? <PhoneIncoming size={16} style={{ color: T.green }} />
            : <PhoneMissed size={16} style={{ color: T.red }} />}
        </div>

        {/* Caller */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm" style={{ color: T.textPrimary }}>
              {call.caller_number || "Ẩn số"}
            </span>
            <button onClick={e => { e.stopPropagation(); copy(call.caller_number); }}
              className="opacity-50 hover:opacity-100 transition-opacity"
              style={{ color: T.textMuted }}>
              {copied ? <Check size={12} style={{ color: T.green }} /> : <Copy size={12} />}
            </button>
          </div>
          <div className="text-xs mt-0.5" style={{ color: T.textMuted }}>
            {call.hotline_number ? `→ Hotline: ${call.hotline_number}` : "→ Hotline không xác định"}
          </div>
        </div>

        {/* Status */}
        <StatusBadge status={call.status} />

        {/* Duration */}
        <div className="text-right hidden sm:block flex-shrink-0 w-16">
          <div className="flex items-center gap-1 justify-end" style={{ color: T.textMuted }}>
            <Clock size={11} />
            <span className="text-xs">{fmtDuration(call.billsec || call.duration)}</span>
          </div>
        </div>

        {/* Time */}
        <div className="text-right flex-shrink-0 hidden md:block w-32">
          <span className="text-xs" style={{ color: T.textMuted }}>{fmtDatetime(call.started_at)}</span>
        </div>

        {/* Recording indicator */}
        <div className="flex-shrink-0 w-6">
          {call.recording_url && <Mic size={13} style={{ color: T.accent }} title="Có ghi âm" />}
        </div>

        {/* Expand */}
        <div style={{ color: T.textMuted }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: T.divider }}>
          <div className="grid grid-cols-2 gap-3 mt-3 text-xs" style={{ color: T.textSecondary }}>
            <div>
              <span style={{ color: T.textMuted }}>Số gọi đến:</span>
              <span className="ml-1 font-medium">{call.caller_number}</span>
            </div>
            <div>
              <span style={{ color: T.textMuted }}>Hotline nhận:</span>
              <span className="ml-1 font-medium">{call.hotline_number || call.extension || "—"}</span>
            </div>
            <div>
              <span style={{ color: T.textMuted }}>Thời gian:</span>
              <span className="ml-1 font-medium">{fmtDatetime(call.started_at)}</span>
            </div>
            <div>
              <span style={{ color: T.textMuted }}>Đàm thoại:</span>
              <span className="ml-1 font-medium">{fmtDuration(call.billsec)} / Tổng: {fmtDuration(call.duration)}</span>
            </div>
            <div>
              <span style={{ color: T.textMuted }}>Call ID:</span>
              <span className="ml-1 font-mono text-[11px]">{call.call_id}</span>
            </div>
            {call.userfield && (
              <div>
                <span style={{ color: T.textMuted }}>Userfield:</span>
                <span className="ml-1 font-medium">{call.userfield}</span>
              </div>
            )}
          </div>

          {/* Audio player */}
          {call.recording_url && (
            <div className="mt-2">
              <div className="flex items-center gap-1 mb-1">
                <Mic size={12} style={{ color: T.accent }} />
                <span className="text-xs font-medium" style={{ color: T.textSecondary }}>Ghi âm cuộc gọi</span>
              </div>
              <AudioPlayer url={call.recording_url} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      <div className="text-xs mt-0.5" style={{ color: T.textMuted }}>{label}</div>
      {sub && <div className="text-[11px] mt-0.5" style={{ color: T.textMuted }}>{sub}</div>}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function HotlineInboundClient() {
  const [calls, setCalls] = useState<HotlineCall[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, answered: 0, missed: 0, totalDuration: 0 });
  const [hotlines, setHotlines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [hotlineFilter, setHotlineFilter] = useState("");
  const [dateFrom, setDateFrom] = useState(daysAgo(30));
  const [dateTo, setDateTo] = useState(today());

  // Webhook info modal
  const [showWebhookInfo, setShowWebhookInfo] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const WEBHOOK_URL = "https://smartfurni-webapp-production.up.railway.app/api/crm/hotline-inbound/webhook";

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (hotlineFilter) params.set("hotline", hotlineFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      params.set("limit", "200");

      const res = await fetch(`/api/crm/hotline-inbound/logs?${params}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setCalls(data.calls || []);
      setStats(data.stats || { total: 0, answered: 0, missed: 0, totalDuration: 0 });
      setHotlines(data.hotlines || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, hotlineFilter, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const copyWebhook = () => {
    navigator.clipboard.writeText(WEBHOOK_URL).then(() => {
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    });
  };

  const answerRate = stats.total > 0 ? Math.round((stats.answered / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen p-6" style={{ background: T.bg }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: T.accentBg, border: `1px solid ${T.accent}40` }}>
            <PhoneIncoming size={20} style={{ color: T.accent }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: T.textPrimary }}>Hotline Inbound</h1>
            <p className="text-sm" style={{ color: T.textMuted }}>
              Lịch sử cuộc gọi đến từ 4 số hotline · ITY Webhook
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowWebhookInfo(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: T.card, border: `1px solid ${T.cardBorder}`, color: T.textSecondary }}>
            <Info size={14} />
            Webhook URL
          </button>
          <button onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: T.accent, color: "#fff" }}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Webhook Info Banner */}
      {showWebhookInfo && (
        <div className="mb-5 p-4 rounded-xl" style={{ background: "#F0F9FF", border: "1px solid #BAE6FD" }}>
          <div className="flex items-start gap-3">
            <Info size={16} style={{ color: "#0284C7", flexShrink: 0, marginTop: 2 }} />
            <div className="flex-1">
              <p className="text-sm font-semibold mb-1" style={{ color: "#0C4A6E" }}>
                Cấu hình Webhook trong ITY Inbound
              </p>
              <p className="text-xs mb-2" style={{ color: "#0369A1" }}>
                Vào ITY Portal → Cài đặt tổng đài → Webhook → Dán URL sau vào ô "Call Completed Webhook":
              </p>
              <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: "#fff", border: "1px solid #BAE6FD" }}>
                <code className="flex-1 text-xs font-mono break-all" style={{ color: "#0C4A6E" }}>
                  {WEBHOOK_URL}
                </code>
                <button onClick={copyWebhook}
                  className="flex-shrink-0 px-2 py-1 rounded text-xs font-medium"
                  style={{ background: copiedWebhook ? T.greenBg : "#EFF6FF", color: copiedWebhook ? T.green : "#2563EB" }}>
                  {copiedWebhook ? <><Check size={11} className="inline mr-1" />Đã copy</> : <><Copy size={11} className="inline mr-1" />Copy</>}
                </button>
              </div>
              <p className="text-xs mt-2" style={{ color: "#0369A1" }}>
                <strong>Lưu ý:</strong> Cấu hình webhook này cho từng số hotline trong ITY. Không cần secret key — ITY Inbound gửi trực tiếp.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Tổng cuộc gọi" value={stats.total} color={T.textPrimary} />
        <StatCard label="Nghe máy" value={stats.answered} color={T.green}
          sub={`${answerRate}% tỷ lệ nghe`} />
        <StatCard label="Nhỡ / Bận" value={stats.missed} color={T.red} />
        <StatCard label="Tổng đàm thoại" value={fmtDuration(stats.totalDuration)} color={T.accent} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-xl"
        style={{ background: T.card, border: `1px solid ${T.cardBorder}` }}>
        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-48 px-3 py-1.5 rounded-lg"
          style={{ background: T.bg, border: `1px solid ${T.cardBorder}` }}>
          <Search size={14} style={{ color: T.textMuted }} />
          <input
            type="text"
            placeholder="Tìm số điện thoại..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: T.textPrimary }}
          />
        </div>

        {/* Status filter */}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm outline-none"
          style={{ background: T.bg, border: `1px solid ${T.cardBorder}`, color: T.textSecondary }}>
          <option value="">Tất cả trạng thái</option>
          <option value="answered">Nghe máy</option>
          <option value="missed">Nhỡ</option>
          <option value="busy">Bận</option>
        </select>

        {/* Hotline filter */}
        <select value={hotlineFilter} onChange={e => setHotlineFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm outline-none"
          style={{ background: T.bg, border: `1px solid ${T.cardBorder}`, color: T.textSecondary }}>
          <option value="">Tất cả hotline</option>
          {hotlines.map(h => <option key={h} value={h}>{h}</option>)}
        </select>

        {/* Date range */}
        <div className="flex items-center gap-1">
          <Calendar size={13} style={{ color: T.textMuted }} />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-2 py-1.5 rounded-lg text-sm outline-none"
            style={{ background: T.bg, border: `1px solid ${T.cardBorder}`, color: T.textSecondary }} />
          <span className="text-xs" style={{ color: T.textMuted }}>→</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-2 py-1.5 rounded-lg text-sm outline-none"
            style={{ background: T.bg, border: `1px solid ${T.cardBorder}`, color: T.textSecondary }} />
        </div>
      </div>

      {/* Call list */}
      {error && (
        <div className="p-4 rounded-xl mb-4 text-sm" style={{ background: T.redBg, color: T.red, border: `1px solid ${T.red}30` }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw size={24} className="animate-spin" style={{ color: T.textMuted }} />
          <span className="ml-3 text-sm" style={{ color: T.textMuted }}>Đang tải...</span>
        </div>
      ) : calls.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <PhoneIncoming size={40} style={{ color: T.textMuted, opacity: 0.4 }} />
          <p className="mt-3 text-sm font-medium" style={{ color: T.textMuted }}>Chưa có cuộc gọi nào</p>
          <p className="text-xs mt-1" style={{ color: T.textMuted }}>
            Cấu hình webhook ITY để nhận dữ liệu cuộc gọi đến
          </p>
          <button onClick={() => setShowWebhookInfo(true)}
            className="mt-3 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: T.accentBg, color: T.accent, border: `1px solid ${T.accent}40` }}>
            Xem hướng dẫn cấu hình
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm" style={{ color: T.textMuted }}>
              {calls.length} cuộc gọi
            </span>
          </div>
          {calls.map(call => <CallRow key={call.id} call={call} />)}
        </div>
      )}
    </div>
  );
}
