"use client";

import { useState, useMemo } from "react";
import {
  Calendar, ChevronLeft, ChevronRight, Plus, Clock, MapPin,
  User, Phone, Building2, Eye, Trash2, X, Loader2, Bell,
  CheckCircle, XCircle, AlertCircle,
} from "lucide-react";
import type { Appointment, AppointmentType, AppointmentStatus } from "@/lib/crm-calendar-store";
import {
  APPOINTMENT_TYPE_LABELS, APPOINTMENT_TYPE_COLORS, APPOINTMENT_STATUS_LABELS,
} from "@/lib/crm-calendar-store";

interface LeadOption { id: string; name: string; company: string; }

interface Props {
  initialAppointments: Appointment[];
  upcomingAppointments: Appointment[];
  leads: LeadOption[];
}

const DAYS_OF_WEEK = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const MONTHS_VI = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6",
                   "Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];

const STATUS_CONFIG: Record<AppointmentStatus, { color: string; bg: string; icon: React.ElementType }> = {
  scheduled: { color: "#60a5fa", bg: "rgba(96,165,250,0.12)", icon: Clock },
  confirmed:  { color: "#22c55e", bg: "rgba(34,197,94,0.12)",  icon: CheckCircle },
  completed:  { color: "#94a3b8", bg: "rgba(148,163,184,0.1)", icon: CheckCircle },
  cancelled:  { color: "#f87171", bg: "rgba(248,113,113,0.1)", icon: XCircle },
  no_show:    { color: "#f97316", bg: "rgba(249,115,22,0.1)",  icon: AlertCircle },
};

export default function CalendarClient({ initialAppointments, upcomingAppointments, leads }: Props) {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [appointments, setAppointments] = useState(initialAppointments);
  const [upcoming, setUpcoming] = useState(upcomingAppointments);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [newModalDate, setNewModalDate] = useState<Date | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month - 1, daysInPrevMonth - i), isCurrentMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    return days;
  }, [year, month]);

  // Map appointments by date key
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const apt of appointments) {
      const key = new Date(apt.startAt).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(apt);
    }
    return map;
  }, [appointments]);

  async function loadMonth(y: number, m: number) {
    const res = await fetch(`/api/crm/appointments?month=${m + 1}&year=${y}`);
    if (res.ok) setAppointments(await res.json());
  }

  function prevMonth() {
    const d = new Date(year, month - 1, 1);
    setCurrentDate(d);
    loadMonth(d.getFullYear(), d.getMonth());
  }

  function nextMonth() {
    const d = new Date(year, month + 1, 1);
    setCurrentDate(d);
    loadMonth(d.getFullYear(), d.getMonth());
  }

  async function deleteAppointment(id: string) {
    if (!confirm("Xóa lịch hẹn này?")) return;
    await fetch("/api/crm/appointments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setAppointments(prev => prev.filter(a => a.id !== id));
    setUpcoming(prev => prev.filter(a => a.id !== id));
    setSelectedAppointment(null);
  }

  async function updateStatus(id: string, status: AppointmentStatus) {
    const res = await fetch("/api/crm/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setAppointments(prev => prev.map(a => a.id === id ? updated : a));
      setUpcoming(prev => prev.map(a => a.id === id ? updated : a));
      setSelectedAppointment(updated);
    }
  }

  const selectedDateAppointments = selectedDate
    ? (appointmentsByDate.get(selectedDate.toDateString()) || [])
    : [];

  const isToday = (d: Date) => d.toDateString() === today.toDateString();
  const isSelected = (d: Date) => selectedDate?.toDateString() === d.toDateString();

  return (
    <div className="flex h-full" style={{ background: "rgba(255,255,255,0.06)" }}>
      {/* Left: Calendar */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Calendar size={20} style={{ color: "#C9A84C" }} />
              Lịch hẹn
            </h1>
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-transparent transition-colors"
                style={{ color: "rgba(245,237,214,0.50)" }}><ChevronLeft size={14} /></button>
              <span className="text-sm font-semibold text-gray-900 px-2 min-w-[120px] text-center">
                {MONTHS_VI[month]} {year}
              </span>
              <button onClick={nextMonth} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-transparent transition-colors"
                style={{ color: "rgba(245,237,214,0.50)" }}><ChevronRight size={14} /></button>
            </div>
            <button onClick={() => { setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1)); loadMonth(today.getFullYear(), today.getMonth()); setSelectedDate(today); }}
              className="px-3 py-1 text-xs font-semibold rounded-lg transition-colors hover:bg-transparent"
              style={{ border: "1px solid rgba(255,255,255,0.10)", color: "rgba(245,237,214,0.50)" }}>
              Hôm nay
            </button>
          </div>
          <button onClick={() => { setNewModalDate(selectedDate || today); setShowNewModal(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-black"
            style={{ background: "linear-gradient(135deg, #C9A84C, #E2C97E)" }}>
            <Plus size={14} /> Thêm lịch hẹn
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS_OF_WEEK.map(d => (
              <div key={d} className="text-center text-[11px] font-semibold py-2"
                style={{ color: d === "CN" ? "#ef4444" : "#6b7280" }}>{d}</div>
            ))}
          </div>
          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(({ date, isCurrentMonth }, idx) => {
              const dayApts = appointmentsByDate.get(date.toDateString()) || [];
              const isTd = isToday(date);
              const isSel = isSelected(date);
              return (
                <div key={idx}
                  onClick={() => setSelectedDate(date)}
                  className="min-h-[80px] rounded-xl p-1.5 cursor-pointer transition-all"
                  style={{
                    background: isSel ? "rgba(201,168,76,0.08)" : isTd ? "#fffbf0" : "#ffffff",
                    border: isSel ? "1px solid rgba(201,168,76,0.5)" : isTd ? "1px solid #C9A84C" : "1px solid #e5e7eb",
                    opacity: isCurrentMonth ? 1 : 0.35,
                  }}>
                  <div className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isTd ? "text-black" : ""}`}
                    style={{
                      background: isTd ? "#C9A84C" : "transparent",
                      color: isTd ? "#000" : isSel ? "#C9A84C" : "#374151",
                    }}>
                    {date.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {dayApts.slice(0, 2).map(apt => (
                      <div key={apt.id}
                        onClick={e => { e.stopPropagation(); setSelectedAppointment(apt); }}
                        className="text-[9px] font-medium px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                        style={{
                          background: `${APPOINTMENT_TYPE_COLORS[apt.type]}20`,
                          color: APPOINTMENT_TYPE_COLORS[apt.type],
                          borderLeft: `2px solid ${APPOINTMENT_TYPE_COLORS[apt.type]}`,
                        }}>
                        {new Date(apt.startAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} {apt.title}
                      </div>
                    ))}
                    {dayApts.length > 2 && (
                      <div className="text-[9px] px-1" style={{ color: "rgba(245,237,214,0.40)" }}>
                        +{dayApts.length - 2} khác
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Sidebar */}
      <div className="w-72 flex-shrink-0 flex flex-col overflow-hidden"
        style={{ borderLeft: "1px solid rgba(255,255,255,0.08)", background: "transparent" }}>
        {/* Selected day */}
        <div className="p-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="text-xs font-semibold mb-3" style={{ color: "rgba(245,237,214,0.50)" }}>
            {selectedDate
              ? selectedDate.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" })
              : "Chọn ngày để xem lịch"}
          </div>
          {selectedDate && selectedDateAppointments.length === 0 && (
            <div className="text-center py-6">
              <div className="text-xs mb-2" style={{ color: "rgba(245,237,214,0.40)" }}>Không có lịch hẹn</div>
              <button onClick={() => { setNewModalDate(selectedDate); setShowNewModal(true); }}
                className="text-xs px-3 py-1.5 rounded-lg font-medium"
                style={{ background: "rgba(201,168,76,0.1)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.2)" }}>
                + Thêm lịch hẹn
              </button>
            </div>
          )}
          <div className="space-y-2">
            {selectedDateAppointments.map(apt => {
              const typeColor = APPOINTMENT_TYPE_COLORS[apt.type];
              const sc = STATUS_CONFIG[apt.status];
              return (
                <div key={apt.id}
                  onClick={() => setSelectedAppointment(apt)}
                  className="rounded-xl p-3 cursor-pointer hover:border-white/10 transition-all"
                  style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.10)", borderLeft: `3px solid ${typeColor}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-900 truncate">{apt.title}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: "rgba(245,237,214,0.50)" }}>
                        {new Date(apt.startAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} –{" "}
                        {new Date(apt.endAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      {apt.leadName && (
                        <div className="text-[10px] mt-0.5 truncate" style={{ color: "rgba(245,237,214,0.40)" }}>
                          {apt.leadName}
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: sc.bg, color: sc.color }}>
                      {APPOINTMENT_STATUS_LABELS[apt.status]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-xs font-semibold mb-3" style={{ color: "rgba(245,237,214,0.50)" }}>
            Sắp tới (7 ngày)
          </div>
          {upcoming.length === 0 ? (
            <div className="text-xs text-center py-4" style={{ color: "rgba(245,237,214,0.40)" }}>
              Không có lịch hẹn sắp tới
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map(apt => {
                const typeColor = APPOINTMENT_TYPE_COLORS[apt.type];
                const aptDate = new Date(apt.startAt);
                const isAptToday = aptDate.toDateString() === today.toDateString();
                return (
                  <div key={apt.id}
                    onClick={() => setSelectedAppointment(apt)}
                    className="rounded-xl p-3 cursor-pointer hover:border-white/10 transition-all"
                    style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.10)" }}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: typeColor }} />
                      <span className="text-[10px] font-semibold flex-shrink-0"
                        style={{ color: isAptToday ? "#C9A84C" : "#6b7280" }}>
                        {isAptToday ? "Hôm nay" : aptDate.toLocaleDateString("vi-VN", { day: "numeric", month: "short" })}
                        {" "}{aptDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-gray-900 truncate">{apt.title}</div>
                    {apt.leadName && (
                      <div className="text-[10px] mt-0.5 truncate" style={{ color: "rgba(245,237,214,0.40)" }}>
                        {apt.leadName}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showNewModal && (
        <NewAppointmentModal
          leads={leads}
          defaultDate={newModalDate || today}
          onClose={() => setShowNewModal(false)}
          onCreated={apt => {
            setAppointments(prev => [...prev, apt]);
            if (new Date(apt.startAt) >= today) setUpcoming(prev => [...prev, apt].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()));
            setShowNewModal(false);
          }}
        />
      )}
      {selectedAppointment && (
        <AppointmentDetailModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onDelete={deleteAppointment}
          onUpdateStatus={updateStatus}
        />
      )}
    </div>
  );
}

// ── New Appointment Modal ──────────────────────────────────────────────────────
function NewAppointmentModal({ leads, defaultDate, onClose, onCreated }: {
  leads: LeadOption[];
  defaultDate: Date;
  onClose: () => void;
  onCreated: (apt: Appointment) => void;
}) {
  const formatDate = (d: Date) => d.toISOString().slice(0, 16);
  const defaultStart = new Date(defaultDate);
  defaultStart.setHours(9, 0, 0, 0);
  const defaultEnd = new Date(defaultDate);
  defaultEnd.setHours(10, 0, 0, 0);

  const [form, setForm] = useState({
    title: "", type: "meeting" as AppointmentType, leadId: "",
    leadName: "", assignedTo: "Admin",
    startAt: formatDate(defaultStart), endAt: formatDate(defaultEnd),
    location: "", notes: "", reminderMinutes: 30,
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.startAt || !form.endAt) return;
    setLoading(true);
    const selectedLead = leads.find(l => l.id === form.leadId);
    const res = await fetch("/api/crm/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        leadName: selectedLead ? `${selectedLead.name} — ${selectedLead.company}` : form.leadName,
        status: "scheduled",
      }),
    });
    if (res.ok) onCreated(await res.json());
    setLoading(false);
  }

  return (
    <DarkModal title="Thêm lịch hẹn mới" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <DarkField label="Tiêu đề *">
          <DarkInput value={form.title} onChange={v => setForm(p => ({ ...p, title: v }))} placeholder="VD: Họp khảo sát dự án Vinhomes" />
        </DarkField>
        <div className="grid grid-cols-2 gap-3">
          <DarkField label="Loại lịch hẹn">
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as AppointmentType }))}
              className="w-full px-3 py-2 text-sm rounded-xl text-gray-900 focus:outline-none"
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.10)" }}>
              {(Object.entries(APPOINTMENT_TYPE_LABELS) as [AppointmentType, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </DarkField>
          <DarkField label="Nhắc nhở">
            <select value={form.reminderMinutes} onChange={e => setForm(p => ({ ...p, reminderMinutes: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 text-sm rounded-xl text-gray-900 focus:outline-none"
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.10)" }}>
              <option value={15}>15 phút trước</option>
              <option value={30}>30 phút trước</option>
              <option value={60}>1 giờ trước</option>
              <option value={1440}>1 ngày trước</option>
            </select>
          </DarkField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DarkField label="Bắt đầu *">
            <input type="datetime-local" value={form.startAt} onChange={e => setForm(p => ({ ...p, startAt: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-xl text-gray-900 focus:outline-none"
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.10)" }} />
          </DarkField>
          <DarkField label="Kết thúc *">
            <input type="datetime-local" value={form.endAt} onChange={e => setForm(p => ({ ...p, endAt: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-xl text-gray-900 focus:outline-none"
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.10)" }} />
          </DarkField>
        </div>
        <DarkField label="Khách hàng liên quan">
          <select value={form.leadId} onChange={e => setForm(p => ({ ...p, leadId: e.target.value }))}
            className="w-full px-3 py-2 text-sm rounded-xl text-gray-900 focus:outline-none"
            style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.10)" }}>
            <option value="">Không liên kết</option>
            {leads.map(l => <option key={l.id} value={l.id}>{l.name} — {l.company}</option>)}
          </select>
        </DarkField>
        <DarkField label="Địa điểm">
          <DarkInput value={form.location} onChange={v => setForm(p => ({ ...p, location: v }))} placeholder="VD: Showroom Q7 hoặc địa chỉ dự án" />
        </DarkField>
        <DarkField label="Ghi chú">
          <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            rows={2} placeholder="Nội dung cuộc họp, yêu cầu chuẩn bị..."
            className="w-full px-3 py-2 text-sm rounded-xl text-gray-900 placeholder-[rgba(245,237,214,0.35)] focus:outline-none resize-none"
            style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.10)" }} />
        </DarkField>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium rounded-xl hover:bg-transparent/5"
            style={{ border: "1px solid rgba(255,255,255,0.10)", color: "rgba(245,237,214,0.50)" }}>Hủy</button>
          <button type="submit" disabled={loading}
            className="flex-1 py-2.5 text-sm font-bold rounded-xl text-black flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #C9A84C, #E2C97E)" }}>
            {loading && <Loader2 size={14} className="animate-spin" />}
            Lưu lịch hẹn
          </button>
        </div>
      </form>
    </DarkModal>
  );
}

// ── Appointment Detail Modal ───────────────────────────────────────────────────
function AppointmentDetailModal({ appointment: apt, onClose, onDelete, onUpdateStatus }: {
  appointment: Appointment;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: AppointmentStatus) => void;
}) {
  const typeColor = APPOINTMENT_TYPE_COLORS[apt.type];
  const sc = STATUS_CONFIG[apt.status];
  const StatusIcon = sc.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}>
        {/* Header */}
        <div className="px-5 py-4 flex items-start justify-between gap-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", borderLeft: `4px solid ${typeColor}` }}>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-gray-900 mb-1">{apt.title}</div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: `${typeColor}15`, color: typeColor }}>
                {APPOINTMENT_TYPE_LABELS[apt.type]}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{ background: sc.bg, color: sc.color }}>
                <StatusIcon size={9} />
                {APPOINTMENT_STATUS_LABELS[apt.status]}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-transparent flex-shrink-0"
            style={{ color: "rgba(245,237,214,0.50)" }}><X size={14} /></button>
        </div>

        {/* Details */}
        <div className="p-5 space-y-3">
          <DetailRow icon={<Clock size={13} />} label="Thời gian">
            {new Date(apt.startAt).toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            {" · "}
            {new Date(apt.startAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
            {" – "}
            {new Date(apt.endAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
          </DetailRow>
          {apt.leadName && <DetailRow icon={<User size={13} />} label="Khách hàng">{apt.leadName}</DetailRow>}
          {apt.location && <DetailRow icon={<MapPin size={13} />} label="Địa điểm">{apt.location}</DetailRow>}
          <DetailRow icon={<User size={13} />} label="Phụ trách">{apt.assignedTo}</DetailRow>
          <DetailRow icon={<Bell size={13} />} label="Nhắc nhở">{apt.reminderMinutes} phút trước</DetailRow>
          {apt.notes && (
            <div className="rounded-xl p-3" style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.10)" }}>
              <div className="text-[10px] font-semibold mb-1" style={{ color: "rgba(245,237,214,0.40)" }}>GHI CHÚ</div>
              <div className="text-xs text-gray-900 leading-relaxed">{apt.notes}</div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 space-y-2">
          {apt.status === "scheduled" && (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onUpdateStatus(apt.id, "completed")}
                className="py-2 text-xs font-semibold rounded-xl transition-colors"
                style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>
                ✓ Hoàn thành
              </button>
              <button onClick={() => onUpdateStatus(apt.id, "cancelled")}
                className="py-2 text-xs font-semibold rounded-xl transition-colors"
                style={{ background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>
                ✕ Hủy lịch
              </button>
            </div>
          )}
          <button onClick={() => onDelete(apt.id)}
            className="w-full py-2 text-xs font-medium rounded-xl flex items-center justify-center gap-2 transition-colors hover:bg-red-500/10"
            style={{ border: "1px solid rgba(255,255,255,0.10)", color: "rgba(245,237,214,0.40)" }}>
            <Trash2 size={12} /> Xóa lịch hẹn
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 flex-shrink-0" style={{ color: "rgba(245,237,214,0.40)" }}>{icon}</div>
      <div>
        <div className="text-[10px] font-semibold mb-0.5" style={{ color: "rgba(245,237,214,0.40)" }}>{label}</div>
        <div className="text-xs text-gray-900">{children}</div>
      </div>
    </div>
  );
}

function DarkModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}>
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 className="text-sm font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-transparent"
            style={{ color: "rgba(245,237,214,0.50)" }}><X size={14} /></button>
        </div>
        <div className="p-5 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function DarkField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold mb-1.5" style={{ color: "rgba(245,237,214,0.50)" }}>{label}</label>
      {children}
    </div>
  );
}

function DarkInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-3 py-2 text-sm rounded-xl text-gray-900 placeholder-[rgba(245,237,214,0.35)] focus:outline-none"
      style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.10)" }} />
  );
}
