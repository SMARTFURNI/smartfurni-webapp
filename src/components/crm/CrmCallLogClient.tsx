"use client";
/**
 * CrmCallLogClient — Trung tâm Cuộc gọi SmartFurni CRM
 * Tính năng: Danh sách cuộc gọi, Audio Player, Analytics, Ghi chú nhanh
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Phone, PhoneMissed, PhoneIncoming, PhoneOutgoing,
  Play, Pause, Volume2, VolumeX, SkipForward,
  Search, Filter, Download, Plus, RefreshCw,
  Clock, User, Users, TrendingUp, BarChart2,
  ChevronDown, ChevronUp, X, Check, Edit3, Trash2,
  Mic, MicOff, Calendar, ArrowUpRight, Info,
  FileText, ExternalLink, Zap,
} from "lucide-react";
import type { CallLog, CallAnalytics, CallStatus } from "@/lib/crm-types";
import {
  CALL_STATUS_LABELS, CALL_STATUS_COLORS, CALL_STATUS_BG, formatDuration,
} from "@/lib/crm-types";

// ── Theme ─────────────────────────────────────────────────────────────────────
const T = {
  bg: "#F0F4FF", card: "#FFFFFF", cardBorder: "#E0E7FF",
  cardShadow: "0 1px 4px rgba(79,70,229,0.08)",
  primary: "#4F46E5", primaryBg: "#EEF2FF", primaryLight: "#C7D2FE",
  textPrimary: "#111827", textSecondary: "#374151", textMuted: "#6B7280",
  divider: "#F3F4F6",
  green: "#059669", greenBg: "#ECFDF5",
  red: "#DC2626", redBg: "#FEF2F2",
  gold: "#D97706", goldBg: "#FFFBEB",
  gray: "#6B7280", grayBg: "#F9FAFB",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDatetime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}
function today() { return new Date().toISOString().slice(0, 10); }
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: CallStatus }) {
  const icons: Record<CallStatus, React.ReactNode> = {
    answered: <Phone size={10} />,
    missed:   <PhoneMissed size={10} />,
    busy:     <PhoneIncoming size={10} />,
    failed:   <X size={10} />,
  };
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: CALL_STATUS_BG[status], color: CALL_STATUS_COLORS[status], border: `1px solid ${CALL_STATUS_COLORS[status]}30` }}>
      {icons[status]}
      {CALL_STATUS_LABELS[status]}
    </span>
  );
}

// ── Audio Player ──────────────────────────────────────────────────────────────
function AudioPlayer({ url, callId }: { url: string; callId: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const speeds = [0.75, 1, 1.25, 1.5, 2];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration);
    const onEnd  = () => setPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
    };
  }, []);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };
  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Number(e.target.value);
    setCurrentTime(Number(e.target.value));
  };
  const changeSpeed = () => {
    const a = audioRef.current;
    if (!a) return;
    const next = speeds[(speeds.indexOf(speed) + 1) % speeds.length];
    a.playbackRate = next;
    setSpeed(next);
  };
  const toggleMute = () => {
    const a = audioRef.current;
    if (!a) return;
    a.muted = !muted;
    setMuted(!muted);
  };
  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = audioRef.current;
    if (!a) return;
    const v = Number(e.target.value);
    a.volume = v;
    setVolume(v);
  };

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Waveform bars (decorative)
  const bars = Array.from({ length: 40 }, (_, i) => {
    const h = 20 + Math.sin(i * 0.8 + callId.charCodeAt(i % callId.length) * 0.1) * 15
              + Math.cos(i * 1.3) * 10;
    return Math.max(4, Math.min(40, h));
  });

  return (
    <div className="rounded-xl p-3" style={{ background: T.primaryBg, border: `1px solid ${T.primaryLight}` }}>
      <audio ref={audioRef} src={url} preload="metadata" />

      {/* Waveform */}
      <div className="flex items-center gap-0.5 h-10 mb-2 overflow-hidden">
        {bars.map((h, i) => {
          const played = (i / bars.length) * 100 <= pct;
          return (
            <div key={i} className="rounded-full flex-1 transition-all duration-100"
              style={{ height: `${h}px`, background: played ? T.primary : `${T.primary}30` }} />
          );
        })}
      </div>

      {/* Seek bar */}
      <input type="range" min={0} max={duration || 100} step={0.1} value={currentTime}
        onChange={seek}
        className="w-full h-1 mb-2 cursor-pointer accent-indigo-600"
        style={{ accentColor: T.primary }}
      />

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button onClick={togglePlay}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-transform active:scale-95"
          style={{ background: T.primary }}>
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>

        <span className="text-xs font-mono" style={{ color: T.textMuted }}>
          {formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(duration))}
        </span>

        <div className="flex-1" />

        {/* Speed */}
        <button onClick={changeSpeed}
          className="px-2 py-0.5 rounded text-xs font-bold transition-colors"
          style={{ background: speed !== 1 ? T.primary : `${T.primary}20`, color: speed !== 1 ? "#fff" : T.primary }}>
          {speed}×
        </button>

        {/* Volume */}
        <button onClick={toggleMute} style={{ color: T.textMuted }}>
          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
        <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
          onChange={changeVolume}
          className="w-14 h-1 cursor-pointer"
          style={{ accentColor: T.primary }}
        />

        {/* Download */}
        <a href={url} download target="_blank" rel="noreferrer"
          className="p-1 rounded hover:bg-indigo-100 transition-colors"
          style={{ color: T.textMuted }}>
          <Download size={13} />
        </a>
      </div>
    </div>
  );
}

// ── Call Row Detail Panel ─────────────────────────────────────────────────────
function CallDetailPanel({
  log, onClose, onUpdateNote, isAdmin,
}: {
  log: CallLog;
  onClose: () => void;
  onUpdateNote: (id: string, note: string) => void;
  isAdmin: boolean;
}) {
  const [note, setNote] = useState(log.note ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const saveNote = async () => {
    setSaving(true);
    await onUpdateNote(log.id, note);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: T.card, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-5 py-4 flex items-center gap-3" style={{ background: T.primaryBg, borderBottom: `1px solid ${T.primaryLight}` }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: T.primary }}>
            <Phone size={18} color="#fff" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm" style={{ color: T.textPrimary }}>
              {log.leadName ?? log.receiverNumber}
            </p>
            <p className="text-xs" style={{ color: T.textMuted }}>{fmtDatetime(log.startedAt)}</p>
          </div>
          <StatusBadge status={log.status} />
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-indigo-100 transition-colors" style={{ color: T.textMuted }}>
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Nhân viên", value: log.staffName ?? log.staffId ?? "—" },
              { label: "Khách hàng", value: log.leadName ?? "—" },
              { label: "Số gọi đi", value: log.callerNumber },
              { label: "Số nhận", value: log.receiverNumber },
              { label: "Thời lượng", value: formatDuration(log.duration) },
              { label: "Hướng", value: log.direction === "outbound" ? "Gọi ra" : "Gọi vào" },
              { label: "Tổng đài", value: log.provider ?? "Manual" },
              { label: "Call ID", value: log.callId.slice(0, 20) + (log.callId.length > 20 ? "..." : "") },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg p-2.5" style={{ background: T.grayBg }}>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: T.textMuted }}>{label}</p>
                <p className="text-xs font-medium" style={{ color: T.textPrimary }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Audio Player */}
          {log.recordingUrl && (isAdmin || log.staffId) && (
            <div>
              <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: T.textSecondary }}>
                <Mic size={12} /> Ghi âm cuộc gọi
              </p>
              <AudioPlayer url={log.recordingUrl} callId={log.id} />
            </div>
          )}
          {log.recordingUrl && !isAdmin && !log.staffId && (
            <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: T.goldBg }}>
              <MicOff size={14} style={{ color: T.gold }} />
              <p className="text-xs" style={{ color: T.gold }}>Bạn không có quyền nghe ghi âm này.</p>
            </div>
          )}

          {/* AI Summary */}
          {log.aiSummary && (
            <div className="rounded-lg p-3" style={{ background: T.primaryBg, border: `1px solid ${T.primaryLight}` }}>
              <p className="text-xs font-semibold mb-1 flex items-center gap-1.5" style={{ color: T.primary }}>
                <Zap size={12} /> Tóm tắt AI
              </p>
              <p className="text-xs leading-relaxed" style={{ color: T.textSecondary }}>{log.aiSummary}</p>
            </div>
          )}

          {/* Note */}
          <div>
            <p className="text-xs font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: T.textSecondary }}>
              <FileText size={12} /> Ghi chú sau cuộc gọi
            </p>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder="Nhập ghi chú về cuộc gọi này..."
              className="w-full rounded-xl px-3 py-2 text-sm resize-none outline-none transition-all"
              style={{ background: T.grayBg, border: `1px solid ${T.divider}`, color: T.textPrimary }}
            />
            <div className="flex justify-end mt-2">
              <button onClick={saveNote} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
                style={{ background: saved ? T.green : T.primary, opacity: saving ? 0.7 : 1 }}>
                {saved ? <><Check size={12} /> Đã lưu</> : saving ? "Đang lưu..." : <><Edit3 size={12} /> Lưu ghi chú</>}
              </button>
            </div>
          </div>

          {/* Lead link */}
          {log.leadId && (
            <a href={`/crm/leads/${log.leadId}`}
              className="flex items-center gap-2 p-3 rounded-xl transition-colors hover:opacity-80"
              style={{ background: T.primaryBg, border: `1px solid ${T.primaryLight}` }}>
              <User size={14} style={{ color: T.primary }} />
              <span className="text-xs font-medium flex-1" style={{ color: T.primary }}>
                Xem hồ sơ: {log.leadName}
              </span>
              <ExternalLink size={12} style={{ color: T.primary }} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Add Call Modal ────────────────────────────────────────────────────────────
function AddCallModal({ onClose, onSave }: { onClose: () => void; onSave: (data: Partial<CallLog>) => void }) {
  const [form, setForm] = useState({
    callerNumber: "", receiverNumber: "", direction: "outbound" as const,
    status: "answered" as CallStatus, duration: 0,
    staffName: "", leadName: "", note: "", recordingUrl: "",
    startedAt: new Date().toISOString().slice(0, 16),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: T.card, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
        onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ background: T.primaryBg, borderBottom: `1px solid ${T.primaryLight}` }}>
          <h3 className="font-bold text-sm" style={{ color: T.textPrimary }}>Thêm cuộc gọi thủ công</h3>
          <button onClick={onClose}><X size={16} style={{ color: T.textMuted }} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Số gọi đi", key: "callerNumber", type: "tel" },
              { label: "Số nhận", key: "receiverNumber", type: "tel" },
              { label: "Nhân viên", key: "staffName", type: "text" },
              { label: "Khách hàng", key: "leadName", type: "text" },
              { label: "Thời lượng (giây)", key: "duration", type: "number" },
              { label: "Thời điểm gọi", key: "startedAt", type: "datetime-local" },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className="text-[11px] font-semibold block mb-1" style={{ color: T.textMuted }}>{label}</label>
                <input type={type} value={(form as Record<string, unknown>)[key] as string}
                  onChange={e => setForm(f => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: T.grayBg, border: `1px solid ${T.divider}`, color: T.textPrimary }}
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold block mb-1" style={{ color: T.textMuted }}>Trạng thái</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as CallStatus }))}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: T.grayBg, border: `1px solid ${T.divider}`, color: T.textPrimary }}>
                {(["answered","missed","busy","failed"] as CallStatus[]).map(s => (
                  <option key={s} value={s}>{CALL_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold block mb-1" style={{ color: T.textMuted }}>Hướng</label>
              <select value={form.direction} onChange={e => setForm(f => ({ ...f, direction: e.target.value as "outbound" }))}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: T.grayBg, border: `1px solid ${T.divider}`, color: T.textPrimary }}>
                <option value="outbound">Gọi ra</option>
                <option value="inbound">Gọi vào</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold block mb-1" style={{ color: T.textMuted }}>URL ghi âm (tùy chọn)</label>
            <input type="url" value={form.recordingUrl}
              onChange={e => setForm(f => ({ ...f, recordingUrl: e.target.value }))}
              placeholder="https://..."
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: T.grayBg, border: `1px solid ${T.divider}`, color: T.textPrimary }}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold block mb-1" style={{ color: T.textMuted }}>Ghi chú</label>
            <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              rows={2} className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
              style={{ background: T.grayBg, border: `1px solid ${T.divider}`, color: T.textPrimary }}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-semibold"
              style={{ background: T.grayBg, color: T.textMuted }}>Hủy</button>
            <button onClick={() => onSave(form)} className="flex-1 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: T.primary }}>Lưu cuộc gọi</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Analytics Panel ───────────────────────────────────────────────────────────
function AnalyticsPanel({ analytics }: { analytics: CallAnalytics | null }) {
  if (!analytics) return (
    <div className="flex items-center justify-center h-40" style={{ color: T.textMuted }}>
      <div className="text-center">
        <BarChart2 size={32} className="mx-auto mb-2 opacity-30" />
        <p className="text-sm">Chưa có dữ liệu</p>
      </div>
    </div>
  );

  const maxDay = Math.max(...analytics.callsByDay.map(d => d.total), 1);
  const maxHour = Math.max(...analytics.callsByHour.map(h => h.total), 1);

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Tổng cuộc gọi", value: analytics.totalCalls, icon: Phone, color: T.primary, bg: T.primaryBg },
          { label: "Thành công", value: analytics.answeredCalls, icon: PhoneOutgoing, color: T.green, bg: T.greenBg },
          { label: "Nhỡ / Bận", value: analytics.missedCalls, icon: PhoneMissed, color: T.red, bg: T.redBg },
          { label: "Tỷ lệ thành công", value: `${analytics.answerRate}%`, icon: TrendingUp, color: T.gold, bg: T.goldBg },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-xl p-3" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                <Icon size={14} style={{ color }} />
              </div>
              <p className="text-[11px] font-medium" style={{ color: T.textMuted }}>{label}</p>
            </div>
            <p className="text-xl font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Daily chart */}
        <div className="rounded-xl p-4" style={{ background: T.card, border: `1px solid ${T.cardBorder}` }}>
          <p className="text-xs font-semibold mb-3 flex items-center gap-1.5" style={{ color: T.textSecondary }}>
            <Calendar size={12} /> Cuộc gọi theo ngày
          </p>
          {analytics.callsByDay.length === 0 ? (
            <p className="text-xs text-center py-6" style={{ color: T.textMuted }}>Chưa có dữ liệu</p>
          ) : (
            <div className="flex items-end gap-1 h-24">
              {analytics.callsByDay.slice(-14).map(d => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 group">
                  <div className="w-full rounded-t relative" style={{ height: `${(d.total / maxDay) * 80}px`, background: T.primaryLight }}>
                    <div className="w-full rounded-t absolute bottom-0" style={{ height: `${(d.answered / maxDay) * 80}px`, background: T.primary }} />
                  </div>
                  <span className="text-[8px] rotate-45 origin-left" style={{ color: T.textMuted }}>{fmtDate(d.date)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-[10px]" style={{ color: T.textMuted }}>
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: T.primary }} /> Thành công
            </span>
            <span className="flex items-center gap-1 text-[10px]" style={{ color: T.textMuted }}>
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: T.primaryLight }} /> Tổng
            </span>
          </div>
        </div>

        {/* Hourly heatmap */}
        <div className="rounded-xl p-4" style={{ background: T.card, border: `1px solid ${T.cardBorder}` }}>
          <p className="text-xs font-semibold mb-3 flex items-center gap-1.5" style={{ color: T.textSecondary }}>
            <Clock size={12} /> Phân bổ theo giờ
          </p>
          <div className="grid grid-cols-12 gap-1">
            {analytics.callsByHour.map(h => {
              const intensity = maxHour > 0 ? h.total / maxHour : 0;
              return (
                <div key={h.hour} className="aspect-square rounded flex items-center justify-center cursor-default"
                  title={`${h.hour}h: ${h.total} cuộc`}
                  style={{ background: intensity > 0 ? `rgba(79,70,229,${0.1 + intensity * 0.9})` : T.grayBg }}>
                  <span className="text-[8px] font-bold" style={{ color: intensity > 0.5 ? "#fff" : T.textMuted }}>
                    {h.hour}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] mt-2" style={{ color: T.textMuted }}>Màu đậm = nhiều cuộc gọi hơn</p>
        </div>
      </div>

      {/* Staff ranking */}
      {analytics.callsByStaff.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: T.card, border: `1px solid ${T.cardBorder}` }}>
          <p className="text-xs font-semibold mb-3 flex items-center gap-1.5" style={{ color: T.textSecondary }}>
            <Users size={12} /> Hiệu suất nhân viên
          </p>
          <div className="space-y-2">
            {analytics.callsByStaff.slice(0, 5).map((s, i) => (
              <div key={s.staffId} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                  style={{ background: i === 0 ? "#D97706" : i === 1 ? "#6B7280" : i === 2 ? "#92400E" : T.primary }}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium truncate" style={{ color: T.textPrimary }}>{s.staffName}</span>
                    <span className="text-xs font-bold ml-2 flex-shrink-0" style={{ color: T.primary }}>{s.total} cuộc</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: T.divider }}>
                      <div className="h-full rounded-full" style={{ width: `${s.total > 0 ? (s.answered / s.total) * 100 : 0}%`, background: T.green }} />
                    </div>
                    <span className="text-[10px]" style={{ color: T.textMuted }}>
                      {formatDuration(s.totalDuration)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
interface Props {
  initialLogs: CallLog[];
  isAdmin: boolean;
  staffId?: string;
}

export default function CrmCallLogClient({ initialLogs, isAdmin, staffId }: Props) {
  const [logs, setLogs] = useState<CallLog[]>(initialLogs);
  const [analytics, setAnalytics] = useState<CallAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"list" | "analytics" | "webhook">("list");
  const [selectedLog, setSelectedLog] = useState<CallLog | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterStaff, setFilterStaff] = useState("");
  const [dateFrom, setDateFrom] = useState(daysAgo(30));
  const [dateTo, setDateTo] = useState(today());

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterStatus) params.set("status", filterStatus);
      if (filterStaff && isAdmin) params.set("staffId", filterStaff);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      params.set("limit", "200");

      const [logsRes, analyticsRes] = await Promise.all([
        fetch(`/api/crm/call-logs?${params}`),
        fetch(`/api/crm/call-logs/analytics?dateFrom=${dateFrom}&dateTo=${dateTo}${filterStaff && isAdmin ? `&staffId=${filterStaff}` : ""}`),
      ]);
      if (logsRes.ok) setLogs(await logsRes.json());
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, filterStaff, dateFrom, dateTo, isAdmin]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleUpdateNote = async (id: string, note: string) => {
    const res = await fetch("/api/crm/call-logs", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, note }),
    });
    if (res.ok) {
      const updated = await res.json();
      setLogs(prev => prev.map(l => l.id === id ? updated : l));
      if (selectedLog?.id === id) setSelectedLog(updated);
    }
  };

  const handleAddCall = async (data: Partial<CallLog>) => {
    const res = await fetch("/api/crm/call-logs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const newLog = await res.json();
      setLogs(prev => [newLog, ...prev]);
      setShowAddModal(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa cuộc gọi này?")) return;
    const res = await fetch(`/api/crm/call-logs?id=${id}`, { method: "DELETE" });
    if (res.ok) setLogs(prev => prev.filter(l => l.id !== id));
  };

  // Unique staff list for filter
  const staffList = Array.from(new Map(logs.filter(l => l.staffId).map(l => [l.staffId, l.staffName ?? l.staffId])).entries());

  const totalDuration = analytics?.totalDuration ?? 0;
  const answerRate = analytics?.answerRate ?? 0;

  return (
    <div className="min-h-screen" style={{ background: T.bg }}>
      {/* Header */}
      <div className="sticky top-0 z-30" style={{ background: T.card, borderBottom: `1px solid ${T.cardBorder}`, boxShadow: "0 1px 4px rgba(79,70,229,0.06)" }}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: T.primaryBg }}>
                <Phone size={20} style={{ color: T.primary }} />
              </div>
              <div>
                <h1 className="text-lg font-bold" style={{ color: T.textPrimary }}>Trung tâm Cuộc gọi</h1>
                <p className="text-xs" style={{ color: T.textMuted }}>
                  {logs.length} cuộc gọi · {formatDuration(totalDuration)} tổng · {answerRate}% thành công
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchLogs} disabled={loading}
                className="p-2 rounded-xl transition-colors hover:bg-indigo-50"
                style={{ color: T.textMuted }}>
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              </button>
              <button onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: T.primary }}>
                <Plus size={14} /> Thêm cuộc gọi
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {([
              { id: "list", label: "Danh sách", icon: Phone },
              { id: "analytics", label: "Phân tích", icon: BarChart2 },
              { id: "webhook", label: "Tích hợp API", icon: Zap },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: activeTab === id ? T.primary : "transparent",
                  color: activeTab === id ? "#fff" : T.textMuted,
                }}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* ── List Tab ── */}
        {activeTab === "list" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
              <div className="flex flex-wrap gap-3">
                {/* Search */}
                <div className="flex-1 min-w-48 relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.textMuted }} />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Tìm số điện thoại, tên KH, nhân viên..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: T.grayBg, border: `1px solid ${T.divider}`, color: T.textPrimary }}
                  />
                </div>

                {/* Status filter */}
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: T.grayBg, border: `1px solid ${T.divider}`, color: T.textPrimary }}>
                  <option value="">Tất cả trạng thái</option>
                  {(["answered","missed","busy","failed"] as CallStatus[]).map(s => (
                    <option key={s} value={s}>{CALL_STATUS_LABELS[s]}</option>
                  ))}
                </select>

                {/* Staff filter (admin only) */}
                {isAdmin && staffList.length > 0 && (
                  <select value={filterStaff} onChange={e => setFilterStaff(e.target.value)}
                    className="px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: T.grayBg, border: `1px solid ${T.divider}`, color: T.textPrimary }}>
                    <option value="">Tất cả nhân viên</option>
                    {staffList.map(([id, name]) => (
                      <option key={id} value={id!}>{name}</option>
                    ))}
                  </select>
                )}

                {/* Date range */}
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: T.grayBg, border: `1px solid ${T.divider}`, color: T.textPrimary }}
                />
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: T.grayBg, border: `1px solid ${T.divider}`, color: T.textPrimary }}
                />
              </div>
            </div>

            {/* Quick stats */}
            {analytics && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: "Tổng", value: analytics.totalCalls, color: T.primary },
                  { label: "Thành công", value: analytics.answeredCalls, color: T.green },
                  { label: "Nhỡ", value: analytics.missedCalls, color: T.red },
                  { label: "Tổng thời lượng", value: formatDuration(analytics.totalDuration), color: T.gold },
                  { label: "TB/cuộc", value: formatDuration(analytics.avgDuration), color: T.gray },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-xl p-3 text-center" style={{ background: T.card, border: `1px solid ${T.cardBorder}` }}>
                    <p className="text-lg font-bold" style={{ color }}>{value}</p>
                    <p className="text-[11px]" style={{ color: T.textMuted }}>{label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Table */}
            <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
              {/* Table header */}
              <div className="grid gap-2 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide"
                style={{ gridTemplateColumns: "1fr 1.2fr 1fr 80px 100px 80px 80px", background: T.primaryBg, color: T.textMuted, borderBottom: `1px solid ${T.primaryLight}` }}>
                <span>Nhân viên</span>
                <span>Khách hàng</span>
                <span>Thời điểm</span>
                <span>Thời lượng</span>
                <span>Trạng thái</span>
                <span>Ghi âm</span>
                <span>Hành động</span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <RefreshCw size={24} className="animate-spin" style={{ color: T.primary }} />
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Phone size={40} style={{ color: `${T.textMuted}40` }} />
                  <p className="text-sm" style={{ color: T.textMuted }}>Chưa có cuộc gọi nào</p>
                  <button onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                    style={{ background: T.primary }}>
                    <Plus size={14} /> Thêm cuộc gọi đầu tiên
                  </button>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: T.divider }}>
                  {logs.map(log => (
                    <div key={log.id}
                      className="grid gap-2 px-4 py-3 items-center hover:bg-indigo-50/30 transition-colors cursor-pointer group"
                      style={{ gridTemplateColumns: "1fr 1.2fr 1fr 80px 100px 80px 80px" }}
                      onClick={() => setSelectedLog(log)}>

                      {/* Staff */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                          style={{ background: T.primary }}>
                          {(log.staffName ?? "?")[0].toUpperCase()}
                        </div>
                        <span className="text-xs font-medium truncate" style={{ color: T.textPrimary }}>
                          {log.staffName ?? log.staffId ?? "—"}
                        </span>
                      </div>

                      {/* Lead */}
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: T.textPrimary }}>
                          {log.leadName ?? (log.direction === "outbound" ? log.receiverNumber : log.callerNumber)}
                        </p>
                        <p className="text-[10px] truncate" style={{ color: T.textMuted }}>
                          {log.direction === "outbound" ? `→ ${log.receiverNumber}` : `← ${log.callerNumber}`}
                        </p>
                      </div>

                      {/* Time */}
                      <div>
                        <p className="text-xs" style={{ color: T.textPrimary }}>{fmtDatetime(log.startedAt)}</p>
                      </div>

                      {/* Duration */}
                      <div className="flex items-center gap-1">
                        <Clock size={11} style={{ color: T.textMuted }} />
                        <span className="text-xs font-medium" style={{ color: T.textSecondary }}>
                          {formatDuration(log.duration)}
                        </span>
                      </div>

                      {/* Status */}
                      <div><StatusBadge status={log.status} /></div>

                      {/* Recording */}
                      <div>
                        {log.recordingUrl ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: T.greenBg, color: T.green }}>
                            <Mic size={9} /> Có
                          </span>
                        ) : (
                          <span className="text-[10px]" style={{ color: T.textMuted }}>—</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedLog(log)}
                          className="p-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                          title="Xem chi tiết" style={{ color: T.primary }}>
                          <ArrowUpRight size={13} />
                        </button>
                        {isAdmin && (
                          <button onClick={() => handleDelete(log.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            title="Xóa" style={{ color: T.red }}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Analytics Tab ── */}
        {activeTab === "analytics" && (
          <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-sm flex items-center gap-2" style={{ color: T.textPrimary }}>
                <BarChart2 size={16} style={{ color: T.primary }} /> Phân tích cuộc gọi
              </h2>
              <div className="flex items-center gap-2">
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="px-3 py-1.5 rounded-xl text-xs outline-none"
                  style={{ background: T.grayBg, border: `1px solid ${T.divider}` }} />
                <span className="text-xs" style={{ color: T.textMuted }}>→</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="px-3 py-1.5 rounded-xl text-xs outline-none"
                  style={{ background: T.grayBg, border: `1px solid ${T.divider}` }} />
              </div>
            </div>
            <AnalyticsPanel analytics={analytics} />
          </div>
        )}

        {/* ── Webhook Tab ── */}
        {activeTab === "webhook" && (
          <div className="space-y-4">
            {/* ITY Integration Guide */}
            <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
              <h2 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: T.textPrimary }}>
                <Zap size={16} style={{ color: "#C9A84C" }} />
                <span style={{ color: "#C9A84C" }}>Tổng đài ITY — Hướng dẫn tích hợp</span>
              </h2>
              {/* Status card */}
              <div className="rounded-xl p-4 mb-4" style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <p className="text-xs font-bold" style={{ color: "#92400E" }}>Cấu hình biến môi trường trong .env</p>
                </div>
                <pre className="text-xs font-mono p-3 rounded-lg overflow-x-auto" style={{ background: "#1e1b4b", color: "#c7d2fe" }}>
{`# ITY Tổng đài Configuration
ITY_DOMAIN=c90408.ity.vn
ITY_CUSTOMER=89866001
ITY_SECRET=<secret_key_từ_ITY>
ITY_WSS=wss://vpbx.ity.vn:7443
ITY_WEBHOOK_SECRET=<mật_khẩu_webhook>
ITY_DEFAULT_EXTENSION=101

# SIP/Webphone (tùy chọn)
ITY_SIP_USER=89866001
ITY_SIP_PASSWORD=<mật_khẩu_SIP>
ITY_SIP_DOMAIN=c90408.ity.vn`}
                </pre>
              </div>
              {/* Webhook URLs */}
              <div className="space-y-3">
                <p className="text-xs font-bold" style={{ color: T.textSecondary }}>Cấu hình Webhook URL trên ITY Portal</p>
                {[
                  { label: "Cuộc gọi đến (Incoming)", url: "/api/crm/ity/incoming-call", method: "GET", color: "#059669" },
                  { label: "Cuộc gọi ra (Outgoing)", url: "/api/crm/ity/outgoing-call", method: "GET", color: "#3b82f6" },
                  { label: "Kết thúc cuộc gọi (Call Completed)", url: "/api/crm/ity/call-completed", method: "POST", color: "#8b5cf6" },
                ].map(item => (
                  <div key={item.url} className="rounded-xl p-3" style={{ background: T.grayBg, border: `1px solid ${T.divider}` }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${item.color}20`, color: item.color }}>{item.method}</span>
                      <p className="text-xs font-semibold" style={{ color: T.textPrimary }}>{item.label}</p>
                    </div>
                    <code className="text-xs font-mono" style={{ color: item.color }}>{item.url}?secret=&#123;ITY_WEBHOOK_SECRET&#125;</code>
                  </div>
                ))}
              </div>
            </div>
            {/* Click-to-Call guide */}
            <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
              <h2 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: T.textPrimary }}>
                <Phone size={16} style={{ color: T.primary }} /> Click-to-Call API
              </h2>
              <div className="rounded-xl p-4" style={{ background: T.primaryBg, border: `1px solid ${T.primaryLight}` }}>
                <p className="text-xs font-semibold mb-2" style={{ color: T.primary }}>Endpoint (từ CRM)</p>
                <code className="text-sm font-mono block p-3 rounded-lg" style={{ background: "#1e1b4b", color: "#c7d2fe" }}>
                  POST /api/crm/ity/click2call
                </code>
              </div>
              <div className="mt-3 rounded-xl p-4" style={{ background: T.grayBg, border: `1px solid ${T.divider}` }}>
                <p className="text-xs font-semibold mb-2" style={{ color: T.textSecondary }}>Body JSON</p>
                <pre className="text-xs font-mono p-3 rounded-lg overflow-x-auto" style={{ background: "#1e1b4b", color: "#c7d2fe" }}>
{`{
  "phone": "0901234567",
  "leadId": "lead_abc123",
  "leadName": "Nguyễn Văn A",
  "extension": "101"  // máy lẻ nhân viên
}`}
                </pre>
              </div>
              <div className="mt-3 flex items-start gap-3 p-3 rounded-xl" style={{ background: T.goldBg, border: `1px solid ${T.gold}30` }}>
                <Info size={14} style={{ color: T.gold, flexShrink: 0, marginTop: 1 }} />
                <p className="text-xs" style={{ color: T.textSecondary }}>
                  ITY sẽ gọi đến máy lẻ của nhân viên trước, sau đó kết nối với số khách hàng.
                  Nhân viên cần cấu hình số máy lẻ (extension) trong hồ sơ tài khoản.
                </p>
              </div>
            </div>
            {/* Original generic webhook */}
            <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
              <h2 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: T.textPrimary }}>
                <Zap size={16} style={{ color: T.primary }} /> Tích hợp Tổng đài khác (Generic)
              </h2>
              <div className="space-y-4">
                <div className="rounded-xl p-4" style={{ background: T.primaryBg, border: `1px solid ${T.primaryLight}` }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: T.primary }}>Webhook Endpoint</p>
                  <code className="text-sm font-mono block p-3 rounded-lg" style={{ background: "#1e1b4b", color: "#c7d2fe" }}>
                    POST /api/crm/call-logs/webhook
                  </code>
                </div>

                <div className="rounded-xl p-4" style={{ background: T.grayBg, border: `1px solid ${T.divider}` }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: T.textSecondary }}>Headers bắt buộc</p>
                  <pre className="text-xs font-mono p-3 rounded-lg overflow-x-auto" style={{ background: "#1e1b4b", color: "#c7d2fe" }}>
{`Content-Type: application/json
x-webhook-secret: <CALL_WEBHOOK_SECRET>
x-provider: stringee | zalo | vnpt | generic`}
                  </pre>
                </div>

                <div className="rounded-xl p-4" style={{ background: T.grayBg, border: `1px solid ${T.divider}` }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: T.textSecondary }}>Body mẫu (Generic)</p>
                  <pre className="text-xs font-mono p-3 rounded-lg overflow-x-auto" style={{ background: "#1e1b4b", color: "#c7d2fe" }}>
{`{
  "call_id": "call_abc123",
  "caller_number": "0901234567",
  "receiver_number": "0987654321",
  "duration": 185,
  "status": "answered",
  "direction": "outbound",
  "recording_url": "https://cdn.example.com/rec.mp3",
  "staff_id": "staff_001",
  "staff_name": "Nguyễn Văn A",
  "started_at": "2026-03-30T09:15:00Z"
}`}
                  </pre>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { name: "Stringee", desc: "Tổng đài cloud phổ biến tại VN", color: "#0EA5E9" },
                    { name: "Zalo Cloud", desc: "Tích hợp qua Zalo Business API", color: "#0068FF" },
                    { name: "VNPT / Viettel", desc: "Tổng đài doanh nghiệp", color: "#059669" },
                  ].map(p => (
                    <div key={p.name} className="rounded-xl p-3" style={{ background: T.card, border: `1px solid ${T.cardBorder}` }}>
                      <div className="w-8 h-8 rounded-lg mb-2 flex items-center justify-center" style={{ background: `${p.color}15` }}>
                        <Phone size={16} style={{ color: p.color }} />
                      </div>
                      <p className="text-sm font-semibold" style={{ color: T.textPrimary }}>{p.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>{p.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: T.goldBg, border: `1px solid ${T.gold}30` }}>
                  <Info size={14} style={{ color: T.gold, flexShrink: 0, marginTop: 1 }} />
                  <p className="text-xs" style={{ color: T.textSecondary }}>
                    Đặt biến môi trường <code className="font-mono bg-amber-100 px-1 rounded">CALL_WEBHOOK_SECRET</code> để bảo mật webhook.
                    Hệ thống tự động đối soát số điện thoại để liên kết cuộc gọi với hồ sơ khách hàng.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedLog && (
        <CallDetailPanel
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
          onUpdateNote={handleUpdateNote}
          isAdmin={isAdmin}
        />
      )}
      {showAddModal && (
        <AddCallModal onClose={() => setShowAddModal(false)} onSave={handleAddCall} />
      )}
    </div>
  );
}
