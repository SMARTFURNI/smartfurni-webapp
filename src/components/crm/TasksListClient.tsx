"use client";
import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Plus, Search, CheckSquare, Square, Trash2, Loader2,
  AlertCircle, Clock, Calendar, Flag, User, ChevronDown,
  ChevronUp, Filter, X, Edit3, Check, ArrowUpRight,
  ClipboardList, Bell,
} from "lucide-react";
import type { CrmTask } from "@/lib/crm-types";

interface Props {
  initialTasks: CrmTask[];
  isAdmin?: boolean;
  currentUserName?: string;
  staffList?: { id: string; fullName: string }[];
}

const PRIORITY_CONFIG = {
  high:   { label: "Cao",    color: "#ef4444", bg: "rgba(239,68,68,0.1)",   border: "#fca5a5" },
  medium: { label: "Trung bình", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "#fcd34d" },
  low:    { label: "Thấp",   color: "#22c55e", bg: "rgba(34,197,94,0.1)",   border: "#86efac" },
};

const PAGE_SIZE = 20;

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function isOverdue(dateStr: string, done: boolean) {
  if (done) return false;
  const d = new Date(dateStr);
  return d < new Date(new Date().toDateString());
}

function isDueToday(dateStr: string, done: boolean) {
  if (done) return false;
  const d = new Date(dateStr).toDateString();
  return d === new Date().toDateString();
}

function isDueSoon(dateStr: string, done: boolean) {
  if (done) return false;
  const d = new Date(dateStr);
  const threeDays = new Date();
  threeDays.setDate(threeDays.getDate() + 3);
  return d > new Date(new Date().toDateString()) && d <= threeDays;
}

interface AddTaskModalProps {
  onClose: () => void;
  onCreated: (task: CrmTask) => void;
  isAdmin?: boolean;
  currentUserName?: string;
  staffList?: { id: string; fullName: string }[];
}

function AddTaskModal({ onClose, onCreated, isAdmin, currentUserName, staffList }: AddTaskModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    leadId: "",
    leadName: "",
    title: "",
    dueDate: new Date().toISOString().split("T")[0],
    priority: "medium" as CrmTask["priority"],
    assignedTo: currentUserName || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("Vui lòng nhập tiêu đề công việc"); return; }
    if (!form.dueDate) { setError("Vui lòng chọn ngày hết hạn"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/crm/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          done: false,
          leadId: form.leadId || "standalone",
          leadName: form.leadName || "Công việc chung",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const task = await res.json();
      onCreated(task);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tạo công việc");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-amber-600" />
            <h2 className="text-base font-semibold text-gray-900">Thêm công việc mới</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <X size={16} />
          </button>
        </div>
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tiêu đề công việc *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Ví dụ: Gọi điện tư vấn khách hàng..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tên khách hàng liên quan</label>
            <input
              type="text"
              value={form.leadName}
              onChange={e => setForm(f => ({ ...f, leadName: e.target.value }))}
              placeholder="Tên khách hàng (nếu có)"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Ngày hết hạn *</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Độ ưu tiên</label>
              <select
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value as CrmTask["priority"] }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              >
                <option value="high">🔴 Cao</option>
                <option value="medium">🟡 Trung bình</option>
                <option value="low">🟢 Thấp</option>
              </select>
            </div>
          </div>
          {isAdmin && staffList && staffList.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Giao cho nhân viên</label>
              <select
                value={form.assignedTo}
                onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              >
                <option value="">— Chưa phân công —</option>
                {staffList.map(s => (
                  <option key={s.id} value={s.fullName}>{s.fullName}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2"
              style={{ background: loading ? "#d1d5db" : "#C9A84C" }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {loading ? "Đang tạo..." : "Tạo công việc"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EditTaskModalProps {
  task: CrmTask;
  onClose: () => void;
  onUpdated: (task: CrmTask) => void;
  isAdmin?: boolean;
  staffList?: { id: string; fullName: string }[];
}

function EditTaskModal({ task, onClose, onUpdated, isAdmin, staffList }: EditTaskModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: task.title,
    leadName: task.leadName,
    dueDate: task.dueDate,
    priority: task.priority,
    assignedTo: task.assignedTo,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("Vui lòng nhập tiêu đề"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/crm/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi cập nhật");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Edit3 size={18} className="text-amber-600" />
            <h2 className="text-base font-semibold text-gray-900">Chỉnh sửa công việc</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tiêu đề *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Khách hàng liên quan</label>
            <input
              type="text"
              value={form.leadName}
              onChange={e => setForm(f => ({ ...f, leadName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Ngày hết hạn</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Độ ưu tiên</label>
              <select
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value as CrmTask["priority"] }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              >
                <option value="high">🔴 Cao</option>
                <option value="medium">🟡 Trung bình</option>
                <option value="low">🟢 Thấp</option>
              </select>
            </div>
          </div>
          {isAdmin && staffList && staffList.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Giao cho</label>
              <select
                value={form.assignedTo}
                onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              >
                <option value="">— Chưa phân công —</option>
                {staffList.map(s => (
                  <option key={s.id} value={s.fullName}>{s.fullName}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium">
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
              style={{ background: loading ? "#d1d5db" : "#C9A84C" }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {loading ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TasksListClient({ initialTasks, isAdmin = false, currentUserName = "", staffList = [] }: Props) {
  const [tasks, setTasks] = useState<CrmTask[]>(initialTasks);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "done" | "overdue" | "today">("all");
  const [filterPriority, setFilterPriority] = useState<CrmTask["priority"] | "">("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<CrmTask | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let list = tasks.filter(t => {
      if (search) {
        const q = search.toLowerCase();
        if (!t.title.toLowerCase().includes(q) && !t.leadName.toLowerCase().includes(q) && !t.assignedTo.toLowerCase().includes(q)) return false;
      }
      if (filterStatus === "pending" && t.done) return false;
      if (filterStatus === "done" && !t.done) return false;
      if (filterStatus === "overdue" && !isOverdue(t.dueDate, t.done)) return false;
      if (filterStatus === "today" && !isDueToday(t.dueDate, t.done)) return false;
      if (filterPriority && t.priority !== filterPriority) return false;
      if (filterAssignee && t.assignedTo !== filterAssignee) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      const da = new Date(a.dueDate).getTime();
      const db = new Date(b.dueDate).getTime();
      return sortDir === "asc" ? da - db : db - da;
    });
    return list;
  }, [tasks, search, filterStatus, filterPriority, filterAssignee, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => ({
    total: tasks.length,
    pending: tasks.filter(t => !t.done).length,
    done: tasks.filter(t => t.done).length,
    overdue: tasks.filter(t => isOverdue(t.dueDate, t.done)).length,
    today: tasks.filter(t => isDueToday(t.dueDate, t.done)).length,
  }), [tasks]);

  const handleToggleDone = useCallback(async (task: CrmTask) => {
    setTogglingId(task.id);
    try {
      const res = await fetch(`/api/crm/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !task.done }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
    } catch {
      alert("Lỗi cập nhật trạng thái");
    } finally {
      setTogglingId(null);
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/crm/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setTasks(prev => prev.filter(t => t.id !== id));
      setConfirmDeleteId(null);
    } catch {
      alert("Lỗi xóa công việc");
    } finally {
      setDeletingId(null);
    }
  }, []);

  const activeFilters = [filterPriority, filterAssignee, filterStatus !== "all" ? filterStatus : ""].filter(Boolean).length;

  // Unique assignees for filter
  const assignees = useMemo(() => {
    const set = new Set(tasks.map(t => t.assignedTo).filter(Boolean));
    return Array.from(set).sort();
  }, [tasks]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CheckSquare size={24} className="text-amber-600" />
            Việc cần làm
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isAdmin ? "Tất cả công việc trong hệ thống" : `Công việc của ${currentUserName || "bạn"}`}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm hover:shadow-md transition-all"
          style={{ background: "#C9A84C" }}
        >
          <Plus size={16} />
          Thêm công việc
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Tổng cộng", value: stats.total, color: "#6b7280", bg: "#f9fafb", icon: ClipboardList, filter: "all" },
          { label: "Đang chờ", value: stats.pending, color: "#f59e0b", bg: "#fffbeb", icon: Clock, filter: "pending" },
          { label: "Hôm nay", value: stats.today, color: "#3b82f6", bg: "#eff6ff", icon: Calendar, filter: "today" },
          { label: "Quá hạn", value: stats.overdue, color: "#ef4444", bg: "#fef2f2", icon: AlertCircle, filter: "overdue" },
          { label: "Hoàn thành", value: stats.done, color: "#22c55e", bg: "#f0fdf4", icon: Check, filter: "done" },
        ].map(s => (
          <button
            key={s.filter}
            onClick={() => { setFilterStatus(s.filter as typeof filterStatus); setPage(1); }}
            className={`p-3 rounded-xl border text-left transition-all hover:shadow-sm ${filterStatus === s.filter ? "ring-2 ring-offset-1" : ""}`}
            style={{
              background: s.bg,
              borderColor: filterStatus === s.filter ? s.color : "#e5e7eb",
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <s.icon size={14} style={{ color: s.color }} />
              <span className="text-lg font-bold" style={{ color: s.color }}>{s.value}</span>
            </div>
            <div className="text-xs text-gray-500 font-medium">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Search + Filter bar */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Tìm kiếm công việc, khách hàng..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setShowFilters(f => !f)}
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${showFilters ? "bg-amber-50 border-amber-300 text-amber-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
        >
          <Filter size={14} />
          Lọc
          {activeFilters > 0 && (
            <span className="ml-1 w-4 h-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center" style={{ background: "#C9A84C" }}>
              {activeFilters}
            </span>
          )}
        </button>
        <button
          onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          title={sortDir === "asc" ? "Ngày tăng dần" : "Ngày giảm dần"}
        >
          {sortDir === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Ngày
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 flex flex-wrap gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Độ ưu tiên</label>
            <select
              value={filterPriority}
              onChange={e => { setFilterPriority(e.target.value as CrmTask["priority"] | ""); setPage(1); }}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-amber-400"
            >
              <option value="">Tất cả</option>
              <option value="high">🔴 Cao</option>
              <option value="medium">🟡 Trung bình</option>
              <option value="low">🟢 Thấp</option>
            </select>
          </div>
          {isAdmin && assignees.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nhân viên</label>
              <select
                value={filterAssignee}
                onChange={e => { setFilterAssignee(e.target.value); setPage(1); }}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-amber-400"
              >
                <option value="">Tất cả</option>
                {assignees.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          )}
          {activeFilters > 0 && (
            <button
              onClick={() => { setFilterPriority(""); setFilterAssignee(""); setFilterStatus("all"); setPage(1); }}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors self-end"
            >
              <X size={12} />
              Xóa bộ lọc
            </button>
          )}
        </div>
      )}

      {/* Task list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <CheckSquare size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">
            {search || activeFilters > 0 ? "Không tìm thấy công việc phù hợp" : "Chưa có công việc nào"}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {!search && !activeFilters && "Nhấn \"Thêm công việc\" để bắt đầu"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {paginated.map(task => {
            const overdue = isOverdue(task.dueDate, task.done);
            const today = isDueToday(task.dueDate, task.done);
            const soon = isDueSoon(task.dueDate, task.done);
            const pCfg = PRIORITY_CONFIG[task.priority];
            const isToggling = togglingId === task.id;
            const isDeleting = deletingId === task.id;

            return (
              <div
                key={task.id}
                className={`bg-white rounded-xl border transition-all hover:shadow-sm ${
                  task.done ? "opacity-60" : overdue ? "border-red-200" : today ? "border-blue-200" : "border-gray-200"
                }`}
              >
                <div className="flex items-start gap-3 p-4">
                  {/* Checkbox */}
                  <button
                    onClick={() => handleToggleDone(task)}
                    disabled={isToggling}
                    className="mt-0.5 flex-shrink-0 transition-transform hover:scale-110"
                  >
                    {isToggling ? (
                      <Loader2 size={18} className="text-amber-500 animate-spin" />
                    ) : task.done ? (
                      <CheckSquare size={18} className="text-green-500" />
                    ) : (
                      <Square size={18} className="text-gray-400 hover:text-amber-500" />
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${task.done ? "line-through text-gray-400" : "text-gray-900"}`}>
                        {task.title}
                      </span>
                      {/* Status badges */}
                      {overdue && !task.done && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
                          <AlertCircle size={9} />
                          Quá hạn
                        </span>
                      )}
                      {today && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">
                          <Bell size={9} />
                          Hôm nay
                        </span>
                      )}
                      {soon && !today && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                          <Clock size={9} />
                          Sắp đến
                        </span>
                      )}
                      {task.done && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                          <Check size={9} />
                          Hoàn thành
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {/* Lead name */}
                      {task.leadName && task.leadName !== "Công việc chung" && task.leadId && task.leadId !== "standalone" && (
                        <Link
                          href={`/crm/leads/${task.leadId}`}
                          className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-800 hover:underline"
                        >
                          <ArrowUpRight size={10} />
                          {task.leadName}
                        </Link>
                      )}
                      {task.leadName && (task.leadId === "standalone" || !task.leadId) && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <User size={10} />
                          {task.leadName}
                        </span>
                      )}
                      {/* Due date */}
                      <span className={`flex items-center gap-1 text-xs ${overdue ? "text-red-600 font-medium" : today ? "text-blue-600 font-medium" : "text-gray-500"}`}>
                        <Calendar size={10} />
                        {formatDate(task.dueDate)}
                      </span>
                      {/* Priority */}
                      <span
                        className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium"
                        style={{ color: pCfg.color, background: pCfg.bg }}
                      >
                        <Flag size={9} />
                        {pCfg.label}
                      </span>
                      {/* Assignee (admin view) */}
                      {isAdmin && task.assignedTo && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <User size={10} />
                          {task.assignedTo}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setEditingTask(task)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                      title="Chỉnh sửa"
                    >
                      <Edit3 size={13} />
                    </button>
                    {confirmDeleteId === task.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(task.id)}
                          disabled={isDeleting}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          {isDeleting ? <Loader2 size={10} className="animate-spin" /> : "Xóa"}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 text-xs border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(task.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Xóa"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <span className="text-sm text-gray-500">
            Hiển thị {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} / {filtered.length} công việc
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              ← Trước
            </button>
            <span className="px-3 py-1.5 text-sm text-gray-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Tiếp →
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddTaskModal
          onClose={() => setShowAddModal(false)}
          onCreated={task => setTasks(prev => [task, ...prev])}
          isAdmin={isAdmin}
          currentUserName={currentUserName}
          staffList={staffList}
        />
      )}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onUpdated={updated => setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))}
          isAdmin={isAdmin}
          staffList={staffList}
        />
      )}
    </div>
  );
}
