"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle, ArrowRight, BarChart3, BrainCircuit, CalendarDays, CheckCircle2, ClipboardCopy, ExternalLink,
  Bot, Facebook, FileText, Loader2, MapPin, MessageSquare, Pencil, Plus, RefreshCw,
  Search as SearchIcon, ShieldCheck, Sparkles, Tags, Trash2, Users, X,
} from "lucide-react";
import { parseFacebookGroupUrl } from "@/lib/facebook-group-marketing-business";
import { FACEBOOK_GROUP_TOPIC_TAXONOMY } from "@/lib/facebook-group-marketing-types";

type Row = Record<string, unknown>;
type FormOptions = {
  pages: Row[]; groups: Row[]; campaigns: Row[]; content: Row[]; posts: Row[];
  staff: Row[]; products: Row[]; leads: Row[]; topics: Row[];
};
type GroupDiscoveryResult = {
  suggestions: Row[];
  searchQueries: string[];
  notice: string;
  model: string;
};
type Permissions = {
  admin: boolean;
  manage: boolean; campaigns: boolean; content: boolean; approve: boolean;
  schedule: boolean; publish: boolean; sales: boolean; reports: boolean; settings: boolean;
};

const sections = [
  ["overview", "Tổng quan"], ["groups", "Danh sách Group"], ["campaigns", "Chiến dịch"],
  ["content", "Kho nội dung"], ["calendar", "Lịch đăng"], ["tasks", "Nhiệm vụ đăng bài"],
  ["posts", "Bài đã đăng"], ["comments", "Bình luận & khách hàng"],
  ["reports", "Báo cáo"], ["settings", "Cài đặt"],
] as const;

const labels: Record<string, string> = {
  groups: "Group", pages: "Fanpage", campaigns: "chiến dịch", content: "nội dung",
  tasks: "nhiệm vụ", posts: "bài đăng", comments: "bình luận", topics: "chủ đề",
};

const emptyOptions: FormOptions = {
  pages: [], groups: [], campaigns: [], content: [], posts: [], staff: [], products: [], leads: [], topics: [],
};

const statusLabel: Record<string, string> = {
  active: "Hoạt động", paused: "Tạm dừng", needs_review: "Cần kiểm tra",
  joined: "Đã tham gia", not_joined: "Chưa tham gia", pending: "Chờ duyệt",
  requested: "Đã gửi yêu cầu", draft: "Bản nháp", pending_approval: "Chờ duyệt",
  approved: "Đã duyệt", scheduled: "Đã xếp lịch", due: "Đến hạn", posted: "Đã đăng",
  pending_moderation: "Chờ group duyệt", rejected: "Bị từ chối", tracking: "Đang theo dõi",
  completed: "Đã hoàn tất",
};

function value(row: Row, ...keys: string[]) {
  for (const key of keys) if (row[key] !== undefined && row[key] !== null) return row[key];
  return "";
}

function formatDate(input: unknown) {
  if (!input) return "—";
  const date = new Date(String(input));
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("vi-VN");
}

function dateInputValue(input: unknown) {
  if (!input) return "";
  const date = new Date(String(input));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function datetimeLocalValue(input: unknown) {
  if (!input) return "";
  const date = new Date(String(input));
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function money(input: unknown) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 })
    .format(Number(input || 0));
}

async function api(path: string, init?: RequestInit) {
  const response = await fetch(`/api/crm/facebook-group-marketing/${path}`, {
    cache: "no-store", headers: { "Content-Type": "application/json", ...(init?.headers || {}) }, ...init,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Không thể xử lý yêu cầu.");
  return data;
}

function Status({ status }: { status: unknown }) {
  const key = String(status || "draft");
  const danger = ["rejected", "overdue", "blocked"].includes(key);
  const good = ["active", "approved", "posted", "joined", "completed"].includes(key);
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${
      danger ? "border-red-500/30 bg-red-500/10 text-red-300"
        : good ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          : "border-amber-500/30 bg-amber-500/10 text-amber-200"
    }`}>{statusLabel[key] || key}</span>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fbg-modal-overlay fixed inset-0 z-[120] flex items-end justify-center bg-black/70 p-3 md:items-center" onMouseDown={onClose}>
      <div className="fbg-modal-card max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-amber-300/15 bg-[#12151d] p-5 shadow-2xl"
        onMouseDown={event => event.stopPropagation()}>
        <div className="fbg-modal-header mb-5 flex items-center justify-between">
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[.18em] text-amber-300/80">Facebook Group Marketing</div>
            <h2 className="text-lg font-black text-white">{title}</h2>
          </div>
          <button onClick={onClose} className="fbg-modal-close rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">Đóng</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, name, type = "text", required = false, children }: {
  label: string; name: string; type?: string; required?: boolean; children?: React.ReactNode;
}) {
  return (
    <label className="fbg-field grid gap-1.5 text-sm text-slate-300">
      <span>{label}{required && <b className="text-red-400"> *</b>}</span>
      {children || <input name={name} type={type} required={required}
        className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white outline-none focus:border-amber-400/50" />}
    </label>
  );
}

export default function FacebookGroupMarketingClient({
  section, permissions,
}: { section: string; permissions: Permissions }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [checkRows, setCheckRows] = useState<Row[]>([]);
  const [dashboard, setDashboard] = useState<Row | null>(null);
  const [settingsData, setSettingsData] = useState<Row | null>(null);
  const [formOptions, setFormOptions] = useState<FormOptions>(emptyOptions);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<Row | null>(null);
  const [editingResource, setEditingResource] = useState<string | null>(null);
  const [deletingRow, setDeletingRow] = useState<Row | null>(null);
  const [deletingResource, setDeletingResource] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [topicEditor, setTopicEditor] = useState<Row | null>(null);
  const [search, setSearch] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [discoveryTopic, setDiscoveryTopic] = useState("Phòng trọ");
  const [discoveryRegion, setDiscoveryRegion] = useState("Hồ Chí Minh");
  const [discoveryKeywords, setDiscoveryKeywords] = useState("");
  const [discoveryBusy, setDiscoveryBusy] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<GroupDiscoveryResult | null>(null);
  const [aiRecommendations, setAiRecommendations] = useState<Row[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [page, setPage] = useState(0);

  const resource = section === "calendar" ? "tasks"
    : section === "overview" || section === "reports" || section === "settings" ? section
      : section;

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const aiQuery = section === "overview" || section === "reports"
        ? "ai/recommendations?status=all&limit=60"
        : `ai/recommendations?status=pending&limit=12&section=${encodeURIComponent(section)}`;
      const aiRequest = api(aiQuery).catch(() => []);
      if (section === "overview" || section === "reports") {
        setDashboard(await api("dashboard"));
      } else if (section === "settings") {
        const [settingsResult, pages] = await Promise.all([api("settings"), api("pages")]);
        setSettingsData(settingsResult);
        setRows(pages);
      } else if (section === "comments") {
        const [comments, checks, options] = await Promise.all([
          api(`comments?limit=50&offset=${page * 50}`),
          api("checks?status=pending&limit=50"),
          api("options"),
        ]);
        setRows(comments); setCheckRows(checks); setFormOptions(options);
      } else {
        const params = new URLSearchParams({ limit: "50", offset: String(page * 50) });
        if (section === "groups" && search) params.set("search", search);
        if (section === "groups" && selectedTopic) params.set("topic", selectedTopic);
        const query = `?${params.toString()}`;
        const needsOptions = ["groups", "campaigns", "content", "calendar", "tasks", "posts"].includes(section);
        const [result, options] = await Promise.all([
          api(`${resource}${query}`),
          needsOptions ? api("options") : Promise.resolve(emptyOptions),
        ]);
        setRows(result);
        if (needsOptions) setFormOptions(options);
      }
      setAiRecommendations(await aiRequest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, [page, resource, search, section, selectedTopic]);

  useEffect(() => { void load(); }, [load]);

  const runAiOperationsReview = async () => {
    setAiBusy(true); setError(""); setNotice("");
    try {
      const result = await api("ai/generate", {
        method: "POST",
        body: JSON.stringify({ section: section === "reports" ? "overview" : section }),
      });
      setNotice(`AI đã phân tích ${result.candidateCount} tín hiệu và cập nhật ${result.recommendationCount} đề xuất.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể chạy AI điều phối.");
    } finally {
      setAiBusy(false);
    }
  };

  const reviewAiRecommendation = async (
    recommendationId: string,
    status: "approved" | "dismissed" | "applied",
  ) => {
    try {
      await api(`ai/${recommendationId}/review`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      setAiRecommendations(current => section === "overview" || section === "reports"
        ? current.map(item => item.id === recommendationId ? { ...item, status } : item)
        : current.filter(item => item.id !== recommendationId));
      setNotice(status === "approved"
        ? "Đã duyệt đề xuất. Mở màn hình liên quan để thực hiện."
        : status === "applied"
          ? "Đã ghi nhận đề xuất được thực hiện."
          : "Đã bỏ qua đề xuất.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật đề xuất.");
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>, endpoint = resource) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload: Row = {};
    form.forEach((item, key) => {
      if (key === "groupIds" || key === "productIds") return;
      if (item === "") return;
      payload[key] = ["memberCount", "maxPostsPerDay", "minPostIntervalMinutes"].includes(key)
        ? Number(item) : item;
    });
    const groupIds = form.getAll("groupIds").map(String).filter(Boolean);
    if (groupIds.length) payload.groupIds = groupIds;
    const productIds = form.getAll("productIds").map(String).filter(Boolean);
    if (productIds.length) payload.productIds = productIds;
    try {
      const result = await api(endpoint, { method: "POST", body: JSON.stringify(payload) });
      const notification = result?.assignmentNotification as { matched?: number; sent?: number; error?: string } | undefined;
      setNotice(endpoint === "tasks"
        ? notification?.sent
          ? "Đã xếp lịch và gửi thông báo PWA cho nhân viên."
          : notification?.error
            ? `Đã xếp lịch nhưng Web Push gặp lỗi: ${notification.error}`
            : "Đã xếp lịch. Nhân viên chưa bật thông báo PWA trên thiết bị."
        : "Đã lưu thành công.");
      setModal(null); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Không thể lưu."); }
  };

  const submitEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingRow?.id) return;
    const targetResource = editingResource || resource;
    const form = new FormData(event.currentTarget);
    const payload: Row = {};
    const nullableKeys = new Set([
      "facebookPageId", "pageUrl", "brand", "region", "topic", "assignedStaffId",
      "ownerId", "startDate", "endDate", "phone", "leadId", "commentedAt",
    ]);
    const datetimeKeys = new Set(["scheduledAt", "dueAt", "actualPostedAt", "commentedAt", "lastCheckedAt"]);
    form.forEach((item, key) => {
      if (key === "groupIds" || key === "productIds" || key === "ruleText") return;
      if (item === "" && nullableKeys.has(key)) {
        payload[key] = null;
      } else if (datetimeKeys.has(key) && item) {
        payload[key] = new Date(String(item)).toISOString();
      } else {
        payload[key] = ["memberCount", "maxPostsPerDay", "minPostIntervalMinutes"].includes(key)
          ? Number(item) : item;
      }
    });
    if (targetResource === "campaigns") {
      payload.groupIds = form.getAll("groupIds").map(String).filter(Boolean);
      payload.productIds = form.getAll("productIds").map(String).filter(Boolean);
    }
    if (targetResource === "comments") {
      for (const key of ["replied", "invitedToMessenger", "enteredMessenger"]) {
        payload[key] = form.has(key);
      }
    }
    if (targetResource === "content" && ["approved", "scheduled", "used"].includes(String(editingRow.status))) {
      payload.status = "draft";
    }
    const nextModeration = targetResource === "posts" ? String(payload.moderationStatus || "") : "";
    if (targetResource === "posts") delete payload.moderationStatus;
    try {
      await api(`${targetResource}/${editingRow.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      if (targetResource === "posts"
          && nextModeration
          && nextModeration !== String(value(editingRow, "moderation_status", "moderationStatus"))
          && ["approved", "rejected"].includes(nextModeration)) {
        await api(`posts/${editingRow.id}/moderation`, {
          method: "POST",
          body: JSON.stringify({ status: nextModeration }),
        });
      }
      if (targetResource === "groups" && form.has("ruleText")) {
        const rawText = String(form.get("ruleText") || "");
        await api(`groups/${editingRow.id}/rules`, {
          method: "POST",
          body: JSON.stringify({ rawText }),
        });
        if (rawText.trim()) {
          await api(`groups/${editingRow.id}/analyze-rules`, { method: "POST", body: "{}" });
        }
      }
      setNotice(targetResource === "content" && payload.status === "draft"
        ? "Đã lưu bản sửa và đưa nội dung về Bản nháp để duyệt lại."
        : "Đã lưu thay đổi.");
      setEditingRow(null);
      setEditingResource(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu thay đổi.");
    }
  };

  const action = async (endpoint: string, body: Row = {}, method = "POST") => {
    try {
      await api(endpoint, { method, body: JSON.stringify(body) });
      setNotice("Đã cập nhật thành công."); setModal(null); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Không thể cập nhật."); }
  };

  const requestDelete = (targetResource: string, row: Row) => {
    if (!permissions.admin) return;
    setDeletingResource(targetResource);
    setDeletingRow(row);
  };

  const confirmDelete = async () => {
    if (!permissions.admin || !deletingResource || !deletingRow?.id) return;
    setDeleting(true);
    setError("");
    try {
      await api(`${deletingResource}/${encodeURIComponent(String(deletingRow.id))}`, { method: "DELETE" });
      setNotice("Đã xóa bản ghi. Thao tác đã được ghi vào nhật ký hệ thống.");
      setDeletingRow(null);
      setDeletingResource(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa bản ghi.");
    } finally {
      setDeleting(false);
    }
  };

  const submitTopic = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!permissions.manage || !topicEditor) return;
    const form = new FormData(event.currentTarget);
    const payload = {
      label: String(form.get("label") || ""),
      description: String(form.get("description") || ""),
      searchTerms: String(form.get("searchTerms") || "")
        .split(/[\n,]/)
        .map(item => item.trim())
        .filter(Boolean),
    };
    const currentKey = String(topicEditor.key || "");
    try {
      await api(currentKey ? `topics/${encodeURIComponent(currentKey)}` : "topics", {
        method: currentKey ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      setTopicEditor(null);
      setNotice(currentKey ? "Đã cập nhật chủ đề và đồng bộ các Group liên quan." : "Đã thêm chủ đề mới.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu chủ đề.");
    }
  };

  const importCsv = async (file: File) => {
    try {
      const source = await file.text();
      const parseLine = (line: string) => {
        const cells: string[] = []; let current = ""; let quoted = false;
        for (let index = 0; index < line.length; index += 1) {
          const char = line[index];
          if (char === '"' && line[index + 1] === '"') { current += '"'; index += 1; }
          else if (char === '"') quoted = !quoted;
          else if (char === "," && !quoted) { cells.push(current.trim()); current = ""; }
          else current += char;
        }
        cells.push(current.trim()); return cells;
      };
      const lines = source.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
      const headers = parseLine(lines[0] || "");
      const importedRows = lines.slice(1).map(line => Object.fromEntries(
        parseLine(line).map((cell, index) => [headers[index], cell]),
      ));
      const result = await api("groups/import", { method: "POST", body: JSON.stringify({ rows: importedRows }) });
      setNotice(`Đã nhập ${result.created} group; lỗi ${result.failed}.`); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Không thể nhập CSV."); }
  };

  const discoverGroups = async () => {
    setDiscoveryBusy(true);
    setError("");
    try {
      const result = await api("groups/discover", {
        method: "POST",
        body: JSON.stringify({
          topic: discoveryTopic,
          region: discoveryRegion,
          keywords: discoveryKeywords,
        }),
      }) as GroupDiscoveryResult;
      setDiscoveryResult(result);
      setNotice(result.suggestions.length
        ? `AI Agent đã tìm thấy ${result.suggestions.length} Group cần kiểm tra.`
        : result.searchQueries.length
          ? "AI chưa nhận được URL citation đủ tin cậy. Hãy mở kết quả Google bên dưới và chỉ thêm Group bạn xem được."
          : "Chưa tìm thấy nguồn Group đủ tin cậy. Hãy đổi từ khóa hoặc khu vực.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI Agent chưa thể tìm Group.");
    } finally {
      setDiscoveryBusy(false);
    }
  };

  const addSuggestedGroup = async (suggestion: Row) => {
    if (!permissions.manage || suggestion.alreadySaved) return;
    const confirmedGroupUrl = String(suggestion.groupUrl || suggestion.verifiedGroupUrl || "");
    if (!parseFacebookGroupUrl(confirmedGroupUrl)) {
      setError("Hãy dán URL Facebook Group hợp lệ sau khi mở nguồn kiểm tra.");
      return;
    }
    if (!suggestion.manualAccessConfirmed) {
      setError("Hãy mở Group và xác nhận xem được trước khi thêm vào CRM.");
      return;
    }
    setError("");
    try {
      const created = await api("groups", {
        method: "POST",
        body: JSON.stringify({
          name: suggestion.name,
          groupUrl: confirmedGroupUrl,
          topic: suggestion.topic || discoveryTopic,
          region: suggestion.region || discoveryRegion,
          allowsPages: "unknown",
          membershipStatus: "not_joined",
          allowsSales: "unknown",
          status: "needs_review",
          data: {
            source: "ai-google-search",
            discoveryReason: suggestion.reason,
            matchScore: suggestion.matchScore,
            discoveredAt: new Date().toISOString(),
          },
        }),
      });
      setDiscoveryResult(current => current ? {
        ...current,
        suggestions: current.suggestions.map(item => (item.sourceUrl || item.groupUrl) === (suggestion.sourceUrl || suggestion.groupUrl)
          ? { ...item, alreadySaved: true, existingGroupId: created.id }
          : item),
      } : current);
      setNotice("Đã thêm Group vào CRM với trạng thái Cần kiểm tra.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể thêm Group đề xuất.");
    }
  };

  const updateSuggestionReview = (identity: unknown, changes: Row) => {
    setDiscoveryResult(current => current ? {
      ...current,
      suggestions: current.suggestions.map(item => (item.sourceUrl || item.groupUrl) === identity
        ? { ...item, ...changes }
        : item),
    } : current);
  };

  const dismissSuggestion = (identity: unknown) => {
    setDiscoveryResult(current => current ? {
      ...current,
      suggestions: current.suggestions.filter(item => (item.sourceUrl || item.groupUrl) !== identity),
    } : current);
    setNotice("Đã loại đề xuất không truy cập được khỏi danh sách hiện tại.");
  };

  const canCreate = section === "groups" ? permissions.manage
    : section === "campaigns" ? permissions.campaigns
      : section === "content" ? permissions.content
        : ["calendar", "tasks"].includes(section) ? permissions.schedule
          : section === "comments" ? permissions.publish : false;

  const title = sections.find(item => item[0] === section)?.[1] || "Facebook Group Marketing";

  return (
    <div className="fbg-admin-shell min-h-full px-4 py-5 text-slate-100 md:px-7 md:py-7">
      <header className="fbg-admin-header mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="fbg-admin-eyebrow mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.2em] text-amber-300">
            <span className="fbg-admin-eyebrow-icon"><Facebook size={15} /></span>
            Facebook Group Marketing
          </div>
          <h1 className="fbg-admin-title text-3xl font-black text-white">{title}</h1>
          <p className="fbg-admin-subtitle mt-1.5 max-w-3xl text-sm text-slate-400">
            Quy trình đăng thủ công an toàn: CRM chuẩn bị và theo dõi, nhân viên trực tiếp đăng bằng Fanpage.
          </p>
        </div>
        <div className="fbg-admin-actions flex flex-wrap gap-2">
          <button onClick={() => void load()} className="fbg-secondary-button inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
            <RefreshCw size={15} /> Làm mới
          </button>
          {section === "groups" && (
            <>
              {permissions.manage && <label className="fbg-secondary-button cursor-pointer rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                Nhập CSV<input type="file" accept=".csv,text/csv" className="hidden" onChange={event => {
                  const file = event.target.files?.[0]; if (file) void importCsv(file);
                }} />
              </label>}
              <a href="/api/crm/facebook-group-marketing/groups/export" className="fbg-secondary-button rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">Xuất CSV</a>
            </>
          )}
          {canCreate && (
            <button onClick={() => setModal("create")} className="fbg-primary-button inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-black">
              <Plus size={16} /> Thêm {labels[resource]}
            </button>
          )}
        </div>
      </header>

      <nav className="fbg-admin-tabs mb-6 flex gap-1 overflow-x-auto">
        {sections.map(([key, label]) => (
          <Link key={key} href={key === "overview" ? "/crm/facebook-group-marketing" : `/crm/facebook-group-marketing/${key}`}
            className={`whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-bold ${
              section === key ? "is-active " : ""
            }${
              section === key ? "border-amber-400/50 bg-amber-400/15 text-amber-200" : "border-white/8 bg-white/[.03] text-slate-400"
            }`}>{label}</Link>
        ))}
      </nav>

      {notice && <div className="fbg-alert mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200"><CheckCircle2 size={16} />{notice}</div>}
      {error && <div className="fbg-alert mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200"><AlertTriangle size={16} />{error}</div>}

      {!loading && <AiOperationsCenter
        section={section}
        recommendations={aiRecommendations}
        busy={aiBusy}
        canGenerate={permissions.admin || permissions.manage || permissions.campaigns
          || permissions.content || permissions.approve || permissions.reports || permissions.settings}
        canReview={permissions.admin || permissions.manage}
        onGenerate={() => void runAiOperationsReview()}
        onReview={(id, status) => void reviewAiRecommendation(id, status)}
      />}

      {loading ? (
        <div className="grid min-h-64 place-items-center"><Loader2 className="animate-spin text-amber-300" /></div>
      ) : section === "overview" || section === "reports" ? (
        <Dashboard data={dashboard || {}} reports={section === "reports"} />
      ) : section === "settings" ? (
        <SettingsView data={settingsData || {}} pages={rows} canEdit={permissions.settings}
          canDelete={permissions.admin}
          onSave={async payload => { await action("settings", payload); }}
          onSyncPages={async () => {
            const result = await api("pages/sync", { method: "POST", body: "{}" });
            setNotice(`Đã đồng bộ ${result.found} Fanpage: thêm ${result.created}, cập nhật ${result.updated}.`);
            await load();
          }}
          onAddPage={() => setModal("page")}
          onEditPage={pageRow => { setEditingResource("pages"); setEditingRow(pageRow); }}
          onDeletePage={pageRow => requestDelete("pages", pageRow)} />
      ) : (
        <>
          {section === "groups" && (
            <>
              <GroupTopicPlanner groups={formOptions.groups} topics={formOptions.topics}
                selectedTopic={selectedTopic}
                canManage={permissions.manage}
                onAdd={() => setTopicEditor({})}
                onEdit={topic => setTopicEditor(topic)}
                onSelect={topic => {
                  setSelectedTopic(topic);
                  setPage(0);
                  if (topic && topic !== "__unclassified__") setDiscoveryTopic(topic);
                }} />
              <GroupDiscoveryAgent
                groups={formOptions.groups}
                configuredTopics={formOptions.topics}
                canManage={permissions.manage}
                topic={discoveryTopic}
                region={discoveryRegion}
                keywords={discoveryKeywords}
                busy={discoveryBusy}
                result={discoveryResult}
                onTopicChange={setDiscoveryTopic}
                onRegionChange={setDiscoveryRegion}
                onKeywordsChange={setDiscoveryKeywords}
                onDiscover={() => void discoverGroups()}
                onAdd={suggestion => void addSuggestedGroup(suggestion)}
                onReviewChange={updateSuggestionReview}
                onDismiss={dismissSuggestion}
              />
              <div className="fbg-filter mb-4 flex flex-wrap gap-2">
                <input value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} placeholder="Tìm tên hoặc mã group…"
                  className="min-w-64 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none" />
                <button onClick={() => void load()} className="fbg-secondary-button rounded-xl border px-4 text-sm">Lọc</button>
              </div>
            </>
          )}
          {section === "comments" && <>
            <h2 className="mb-3 mt-1 font-bold text-white">Hàng chờ cần kiểm tra bình luận</h2>
            <DataTable section="checks" rows={checkRows} permissions={permissions} onAction={action}
              onEdit={row => { setEditingResource("checks"); setEditingRow(row); }}
              onDelete={row => requestDelete("checks", row)} />
            <h2 className="mb-3 mt-6 font-bold text-white">Bình luận có nhu cầu đã nhập</h2>
          </>}
          <DataTable section={section} rows={rows} permissions={permissions} onAction={action}
            onEdit={row => { setEditingResource(resource); setEditingRow(row); }}
            onDelete={row => requestDelete(resource, row)} />
          <div className="fbg-pagination mt-4 flex items-center justify-end gap-2">
            <button disabled={page === 0} onClick={() => setPage(current => Math.max(0, current - 1))}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm disabled:opacity-30">Trang trước</button>
            <span className="text-xs text-slate-500">Trang {page + 1}</span>
            <button disabled={rows.length < 50} onClick={() => setPage(current => current + 1)}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm disabled:opacity-30">Trang sau</button>
          </div>
        </>
      )}

      {modal === "create" && (
        <Modal title={`Thêm ${labels[resource] || ""}`} onClose={() => setModal(null)}>
          <CreateForm resource={resource} options={formOptions} onSubmit={submit} />
        </Modal>
      )}
      {modal === "page" && (
        <Modal title="Thêm Fanpage" onClose={() => setModal(null)}>
          <CreateForm resource="pages" options={formOptions} onSubmit={(event) => submit(event, "pages")} />
        </Modal>
      )}
      {topicEditor && (
        <Modal title={topicEditor.key ? "Sửa chủ đề Group" : "Thêm chủ đề Group"}
          onClose={() => setTopicEditor(null)}>
          <TopicForm topic={topicEditor} canDelete={permissions.admin}
            onDelete={() => {
              const topic = topicEditor;
              setTopicEditor(null);
              requestDelete("topics", {
                ...topic,
                id: topic.key,
                name: topic.label,
              });
            }}
            onSubmit={submitTopic} />
        </Modal>
      )}
      {editingRow && (
        <Modal title={`Sửa ${labels[editingResource || resource] || ((editingResource || resource) === "posts" ? "bài đăng" : "bản ghi")}`}
          onClose={() => { setEditingRow(null); setEditingResource(null); }}>
          <EditForm resource={editingResource || resource} row={editingRow} options={formOptions} onSubmit={submitEdit} />
        </Modal>
      )}
      {deletingRow && deletingResource && (
        <Modal title="Xác nhận xóa bản ghi"
          onClose={() => {
            if (deleting) return;
            setDeletingRow(null);
            setDeletingResource(null);
          }}>
          <div className="space-y-5">
            <div className="flex items-start gap-3 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-100">
              <AlertTriangle className="mt-0.5 shrink-0 text-red-300" size={19} />
              <div>
                <b className="block">Chỉ quản trị viên mới được thực hiện thao tác này.</b>
                <p className="mt-1 text-red-100/75">
                  Bạn sắp xóa “{String(value(
                    deletingRow, "name", "opening", "facebook_name", "check_type", "sourceCode", "source_code", "id",
                  ))}”. Bản ghi sẽ bị ẩn khỏi các luồng vận hành và thao tác được lưu trong nhật ký.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" disabled={deleting}
                onClick={() => { setDeletingRow(null); setDeletingResource(null); }}
                className="fbg-secondary-button rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold disabled:opacity-50">
                Hủy
              </button>
              <button type="button" disabled={deleting} onClick={() => void confirmDelete()}
                className="fbg-danger-button inline-flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-2.5 text-sm font-black text-red-200 disabled:opacity-50">
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                {deleting ? "Đang xóa…" : "Xóa bản ghi"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function TopicForm({
  topic, canDelete, onDelete, onSubmit,
}: {
  topic: Row;
  canDelete: boolean;
  onDelete: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const controlClass = "rounded-xl border border-white/10 bg-[#161a23] px-3 py-2.5 text-white outline-none focus:border-amber-400/50";
  const searchTerms = Array.isArray(topic.searchTerms)
    ? topic.searchTerms.map(String).join(", ")
    : "";
  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <Field label="Tên chủ đề" name="label" required>
        <input name="label" required maxLength={120} defaultValue={String(topic.label || "")}
          className={controlClass} placeholder="Ví dụ: Nội thất văn phòng" />
      </Field>
      <Field label="Mô tả" name="description">
        <textarea name="description" rows={3} maxLength={500}
          defaultValue={String(topic.description || "")}
          className={controlClass}
          placeholder="Mô tả nhóm đối tượng và nội dung của chủ đề." />
      </Field>
      <Field label="Từ khóa để AI tìm Group" name="searchTerms">
        <textarea name="searchTerms" rows={3} defaultValue={searchTerms}
          className={controlClass}
          placeholder="Nhập các từ khóa, phân cách bằng dấu phẩy." />
      </Field>
      <div className={`flex items-center gap-3 ${topic.key && canDelete ? "justify-between" : "justify-end"}`}>
        {Boolean(topic.key) && canDelete && <button type="button" onClick={onDelete}
          className="fbg-danger-button inline-flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm font-black text-red-200">
          <Trash2 size={16} /> Xóa chủ đề
        </button>}
        <button className="fbg-primary-button rounded-xl bg-amber-400 px-5 py-2.5 font-black text-black">
          {topic.key ? "Lưu thay đổi" : "Thêm chủ đề"}
        </button>
      </div>
    </form>
  );
}

function GroupTopicPlanner({
  groups, topics: configuredTopics, selectedTopic, canManage,
  onSelect, onAdd, onEdit,
}: {
  groups: Row[];
  topics: Row[];
  selectedTopic: string;
  canManage: boolean;
  onSelect: (topic: string) => void;
  onAdd: () => void;
  onEdit: (topic: Row) => void;
}) {
  const counts = new Map<string, number>();
  for (const group of groups) {
    const topic = String(group.topic || "").trim() || "__unclassified__";
    counts.set(topic, (counts.get(topic) || 0) + 1);
  }
  const savedTopics = configuredTopics.length
    ? configuredTopics
    : FACEBOOK_GROUP_TOPIC_TAXONOMY;
  const canonicalKeys = new Set<string>(savedTopics.map(item => String(item.key)));
  const extraTopics = [...counts.keys()]
    .filter(topic => topic !== "__unclassified__" && !canonicalKeys.has(topic))
    .map(topic => ({
      key: topic,
      label: topic,
      description: "Chủ đề đang được sử dụng trong dữ liệu CRM.",
    }));
  const topics = [
    ...savedTopics,
    ...extraTopics,
    ...(counts.has("__unclassified__") ? [{
      key: "__unclassified__",
      label: "Chưa phân loại",
      description: "Group cần được rà soát và gán vào một chủ đề chuẩn.",
    }] : []),
  ];
  return (
    <section className="fbg-topic-planner mb-4 rounded-2xl border p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-white"><Tags size={17} className="text-amber-300" />Quy hoạch Group theo chủ đề</div>
          <p className="mt-1 text-xs text-slate-500">Bấm một chủ đề để lọc danh sách Group bên dưới.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && <button type="button" onClick={onAdd}
            className="fbg-topic-add-button inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-black">
            <Plus size={14} /> Thêm chủ đề
          </button>}
          <button type="button" onClick={() => onSelect("")}
            data-active={!selectedTopic}
            className={`fbg-topic-filter-all rounded-xl border px-3 py-2 text-xs font-bold ${
              !selectedTopic ? "border-amber-400/45 bg-amber-400/15 text-amber-200" : "border-white/10 bg-white/[.03] text-slate-400"
            }`}>
            Tất cả · {groups.length}
          </button>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {topics.map(topic => {
          const topicKey = String(topic.key);
          const active = selectedTopic === topicKey;
          const isUnclassified = topicKey === "__unclassified__";
          return <div key={topicKey} role="button" tabIndex={0}
            onClick={() => onSelect(topicKey)}
            onKeyDown={event => {
              if (event.key === "Enter" || event.key === " ") onSelect(topicKey);
            }}
            data-active={active}
            className={`fbg-topic-card group rounded-xl border p-3 text-left transition ${
              active
                ? "border-amber-400/45 bg-amber-400/[.11]"
                : "border-white/8 bg-black/10 hover:border-white/15 hover:bg-white/[.035]"
            }`}>
            <span className="flex items-center justify-between gap-3">
              <b className="fbg-topic-title">{String(topic.label)}</b>
              <span className="flex items-center gap-1.5">
                {!isUnclassified && canManage && <button type="button" title="Sửa chủ đề"
                  aria-label={`Sửa chủ đề ${String(topic.label)}`}
                  onClick={event => { event.stopPropagation(); onEdit(topic); }}
                  className="fbg-topic-edit-button rounded-lg border p-1.5">
                  <Pencil size={13} />
                </button>}
                <span className="fbg-topic-count rounded-full px-2 py-0.5 text-[11px] font-black">
                  {counts.get(topicKey) || 0}
                </span>
              </span>
            </span>
            <span className="fbg-topic-description mt-1.5 block text-xs leading-5">{String(topic.description || "")}</span>
          </div>;
        })}
      </div>
    </section>
  );
}

function GroupDiscoveryAgent({
  groups, configuredTopics, canManage, topic, region, keywords, busy, result,
  onTopicChange, onRegionChange, onKeywordsChange, onDiscover, onAdd,
  onReviewChange, onDismiss,
}: {
  groups: Row[];
  configuredTopics: Row[];
  canManage: boolean;
  topic: string;
  region: string;
  keywords: string;
  busy: boolean;
  result: GroupDiscoveryResult | null;
  onTopicChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  onKeywordsChange: (value: string) => void;
  onDiscover: () => void;
  onAdd: (suggestion: Row) => void;
  onReviewChange: (groupUrl: unknown, changes: Row) => void;
  onDismiss: (groupUrl: unknown) => void;
}) {
  const existingTopics = [...new Set(groups.map(group => String(group.topic || "")).filter(Boolean))];
  const topics = [...new Set([
    ...(configuredTopics.length ? configuredTopics : FACEBOOK_GROUP_TOPIC_TAXONOMY)
      .map(item => String(item.key)),
    ...existingTopics,
  ])];
  return (
    <section className="fbg-discovery-panel mb-4 overflow-hidden rounded-2xl border">
      <div className="grid gap-4 p-4 xl:grid-cols-[1.1fr_1.9fr]">
        <div>
          <div className="fbg-discovery-title flex items-center gap-2 text-sm font-black">
            <span className="fbg-discovery-icon grid h-8 w-8 place-items-center rounded-xl"><Bot size={17} /></span>
            AI Agent tìm Group liên quan
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Agent dùng Google Search công khai, không quét Facebook. Mọi đề xuất phải được nhân viên mở kiểm tra trước khi thêm.
          </p>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-300/80">
            <ShieldCheck size={14} /> Không tự tham gia Group, không tự đọc nội quy, không tự đăng bài.
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <label className="grid gap-1 text-xs text-slate-400">Chủ đề
            <select value={topic} onChange={event => onTopicChange(event.target.value)}
              className="rounded-xl border border-white/10 bg-[#111722] px-3 py-2.5 text-sm text-white">
              {topics.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-slate-400">Khu vực ưu tiên
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-3 text-slate-500" size={15} />
              <input value={region} onChange={event => onRegionChange(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#111722] py-2.5 pl-9 pr-3 text-sm text-white"
                placeholder="Ví dụ: Hồ Chí Minh" />
            </div>
          </label>
          <label className="grid gap-1 text-xs text-slate-400 md:col-span-2">Từ khóa hoặc yêu cầu bổ sung
            <input value={keywords} onChange={event => onKeywordsChange(event.target.value)}
              className="rounded-xl border border-white/10 bg-[#111722] px-3 py-2.5 text-sm text-white"
              placeholder="Ví dụ: ưu tiên nhóm sinh viên, người thuê căn hộ nhỏ" />
          </label>
          <div className="md:col-span-2 flex justify-end">
            <button type="button" disabled={!canManage || busy || !topic || !region.trim()} onClick={onDiscover}
              className="fbg-ai-button inline-flex items-center gap-2 rounded-xl border border-blue-300/25 bg-blue-400/15 px-4 py-2.5 text-sm font-black text-blue-100 disabled:cursor-not-allowed disabled:opacity-45">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {busy ? "Agent đang tìm và đối chiếu…" : "Tìm Group cùng chủ đề"}
            </button>
          </div>
        </div>
      </div>
      {result && <div className="fbg-discovery-results border-t p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <b className="text-sm text-white">Đề xuất cần kiểm tra ({result.suggestions.length})</b>
            <p className="mt-1 text-[11px] text-slate-500">{result.notice}</p>
          </div>
          {result.searchQueries.length > 0 && <span className="text-[11px] text-slate-500">
            {result.searchQueries.length} truy vấn Google có thể kiểm tra
          </span>}
        </div>
        {result.searchQueries.length > 0 && <div className="mb-3 flex flex-wrap gap-2">
          {result.searchQueries.map((query, index) => {
            const scopedQuery = query.includes("site:facebook.com/groups")
              ? query
              : `site:facebook.com/groups ${query}`;
            return <a key={`${query}-${index}`}
              href={`https://www.google.com/search?q=${encodeURIComponent(scopedQuery)}`}
              target="_blank" rel="noreferrer"
              className="fbg-secondary-button inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-bold">
              <SearchIcon size={13} /> Mở kết quả Google {index + 1}
            </a>;
          })}
        </div>}
        {result.suggestions.length ? <div className="grid gap-3 lg:grid-cols-2">
          {result.suggestions.map(suggestion => {
            const identity = suggestion.sourceUrl || suggestion.groupUrl;
            const confirmedUrl = String(suggestion.groupUrl || suggestion.verifiedGroupUrl || "");
            const hasValidGroupUrl = Boolean(parseFacebookGroupUrl(confirmedUrl));
            return <article key={String(identity)} className="fbg-discovery-result rounded-xl border p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <b className="block truncate text-sm text-[#f5edd6]">{String(suggestion.name)}</b>
                <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
                  <span className="rounded-full bg-amber-400/10 px-2 py-1 text-amber-200">{String(suggestion.topic)}</span>
                  <span className="rounded-full bg-white/[.05] px-2 py-1 text-slate-400">{String(suggestion.region)}</span>
                  <span className="fbg-match-chip rounded-full px-2 py-1">Phù hợp {Number(suggestion.matchScore || 0)}%</span>
                </div>
              </div>
              <SearchIcon size={16} className="fbg-discovery-search-icon shrink-0" />
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">{String(suggestion.reason)}</p>
            {Boolean(suggestion.requiresVerifiedUrl) && <label className="mt-3 grid gap-1.5 text-[11px] text-slate-400">
              URL Facebook Group sau khi đã mở nguồn
              <input value={String(suggestion.verifiedGroupUrl || "")}
                onChange={event => onReviewChange(identity, {
                  verifiedGroupUrl: event.target.value,
                  manualAccessConfirmed: false,
                })}
                placeholder="https://www.facebook.com/groups/..."
                className="rounded-lg border px-3 py-2 text-xs" />
            </label>}
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <a href={String(suggestion.sourceUrl || suggestion.groupUrl)} target="_blank" rel="noreferrer"
                onClick={() => onReviewChange(identity, { openedForReview: true })}
                className="fbg-secondary-button inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold">
                <ExternalLink size={14} /> {suggestion.requiresVerifiedUrl ? "Mở nguồn Google" : "Mở kiểm tra"}
              </a>
              {!suggestion.alreadySaved && <button type="button"
                disabled={!suggestion.openedForReview || !hasValidGroupUrl}
                onClick={() => onReviewChange(identity, { manualAccessConfirmed: true })}
                className="fbg-secondary-button inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40">
                <ShieldCheck size={14} />
                {suggestion.manualAccessConfirmed ? "Đã xác nhận xem được" : "Xác nhận xem được"}
              </button>}
              {!suggestion.alreadySaved && <button type="button" onClick={() => onDismiss(identity)}
                className="fbg-danger-button inline-flex items-center gap-1.5 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2 text-xs font-bold text-red-200">
                <Trash2 size={14} /> Không mở được
              </button>}
              {canManage && <button type="button"
                disabled={Boolean(suggestion.alreadySaved) || !Boolean(suggestion.manualAccessConfirmed)}
                onClick={() => onAdd(suggestion)}
                title={!suggestion.manualAccessConfirmed ? "Cần xác nhận xem được Group trước" : undefined}
                className="fbg-primary-button inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-2 text-xs font-black text-black disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-slate-500">
                {suggestion.alreadySaved ? <CheckCircle2 size={14} /> : <Plus size={14} />}
                {suggestion.alreadySaved ? "Đã có trong CRM" : "Thêm vào CRM"}
              </button>}
            </div>
          </article>;
          })}
        </div> : <div className="fbg-discovery-empty rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">
          Không hiển thị URL do AI tự viết. Hãy mở kết quả Google ở trên, kiểm tra Group thật rồi dùng nút “Thêm Group”.
        </div>}
      </div>}
    </section>
  );
}

function AiOperationsCenter({
  section, recommendations, busy, canGenerate, canReview, onGenerate, onReview,
}: {
  section: string;
  recommendations: Row[];
  busy: boolean;
  canGenerate: boolean;
  canReview: boolean;
  onGenerate: () => void;
  onReview: (id: string, status: "approved" | "dismissed" | "applied") => void;
}) {
  const isOverview = section === "overview" || section === "reports";
  const pending = recommendations.filter(item => String(item.status || "pending") === "pending");
  const visible = isOverview ? pending : pending.slice(0, 4);
  const learned = {
    approved: recommendations.filter(item => item.status === "approved").length,
    dismissed: recommendations.filter(item => item.status === "dismissed").length,
    applied: recommendations.filter(item => item.status === "applied").length,
  };
  const approvedItems = recommendations.filter(item => item.status === "approved").slice(0, 5);
  const priorityLabel: Record<string, string> = {
    critical: "Khẩn cấp", high: "Cao", medium: "Trung bình", low: "Thấp",
  };
  const agentLabel: Record<string, string> = {
    operations_coordinator: "Điều phối",
    group_research: "Nghiên cứu Group",
    group_quality: "Chất lượng Group",
    campaign_planner: "Lập chiến dịch",
    content_compliance: "Nội dung & nội quy",
    schedule_optimizer: "Tối ưu lịch",
    task_dispatcher: "Điều phối nhiệm vụ",
    post_monitor: "Theo dõi bài đăng",
    engagement_assistant: "Chăm sóc khách",
    lead_attribution: "Quy nguồn khách",
    performance_analyst: "Phân tích hiệu quả",
    configuration_guard: "Kiểm tra cấu hình",
  };
  return <section className="fbg-ai-operations mb-5 overflow-hidden rounded-2xl border">
    <div className="flex flex-col gap-3 border-b px-4 py-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-3">
        <span className="fbg-ai-operations-icon"><BrainCircuit size={19} /></span>
        <div>
          <h2 className="font-black text-[#f5edd6]">
            {isOverview ? "Trung tâm AI điều phối" : "AI đề xuất cho màn hình này"}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Dựa trên dữ liệu CRM thật; mọi thay đổi vận hành vẫn cần người có quyền xác nhận.
          </p>
          {isOverview && <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
            <span className="fbg-ai-confidence">Đang chờ {pending.length}</span>
            <span className="fbg-ai-agent-chip">Đã duyệt {learned.approved}</span>
            <span className="fbg-ai-agent-chip">Đã thực hiện {learned.applied}</span>
            <span className="fbg-ai-agent-chip">Đã bỏ qua {learned.dismissed}</span>
          </div>}
        </div>
      </div>
      {canGenerate && <button type="button" onClick={onGenerate} disabled={busy}
        className="fbg-ai-button inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-black disabled:opacity-50">
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
        {busy ? "AI đang phân tích…" : "Phân tích dữ liệu mới"}
      </button>}
    </div>
    {visible.length ? <div className={`grid gap-3 p-4 ${isOverview ? "xl:grid-cols-2" : ""}`}>
      {visible.map(item => {
        const action = item.proposedAction && typeof item.proposedAction === "object"
          ? item.proposedAction as Row : {};
        const evidence = item.evidence && typeof item.evidence === "object"
          ? item.evidence as Row : {};
        const priority = String(item.priority || "medium");
        const risk = String(item.risk || "low");
        return <article key={String(item.id)}
          className={`fbg-ai-recommendation priority-${priority} rounded-xl border p-4`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap gap-1.5 text-[10px] font-bold">
                <span className={`fbg-ai-priority priority-${priority}`}>
                  {priorityLabel[priority] || priority}
                </span>
                <span className="fbg-ai-agent-chip">
                  {agentLabel[String(item.agentType)] || String(item.agentType || "AI Agent")}
                </span>
                <span className="fbg-ai-confidence">
                  Tin cậy {Math.round(Number(item.confidence || 0))}%
                </span>
              </div>
              <h3 className="text-sm font-black text-[#f5edd6]">{String(item.title)}</h3>
            </div>
            {risk === "high" && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-300">
              <AlertTriangle size={12} /> Rủi ro cao
            </span>}
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-300">{String(item.summary)}</p>
          {Boolean(item.rationale) && <p className="mt-1.5 text-[11px] leading-5 text-slate-500">{String(item.rationale)}</p>}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Object.entries(evidence).slice(0, 4).map(([key, evidenceValue]) => (
              <span key={key} className="fbg-ai-evidence rounded-full px-2 py-1 text-[9px]">
                {key}: {typeof evidenceValue === "object" ? JSON.stringify(evidenceValue) : String(evidenceValue ?? "—")}
              </span>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            {canReview && <button type="button" onClick={() => onReview(String(item.id), "dismissed")}
              className="fbg-secondary-button inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-bold">
              <X size={13} /> Bỏ qua
            </button>}
            {canReview && <button type="button" onClick={() => onReview(String(item.id), "approved")}
              className="fbg-secondary-button inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-bold">
              <CheckCircle2 size={13} /> Duyệt đề xuất
            </button>}
            {Boolean(action.href) && <Link href={String(action.href)}
              className="fbg-primary-button inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-black">
              {String(action.label || "Mở xử lý")} <ArrowRight size={13} />
            </Link>}
          </div>
        </article>;
      })}
    </div> : <div className="flex flex-col items-center justify-center px-5 py-7 text-center">
      <CheckCircle2 size={24} className="text-emerald-300/70" />
      <p className="mt-2 text-sm font-bold text-slate-300">Chưa có cảnh báo AI đang chờ xử lý.</p>
      <p className="mt-1 text-xs text-slate-500">Chạy phân tích để đọc trạng thái mới nhất từ các tab.</p>
    </div>}
    {isOverview && approvedItems.length > 0 && <div className="border-t border-white/8 px-4 py-4">
      <h3 className="text-xs font-black uppercase tracking-[.1em] text-slate-400">
        Đã duyệt, chờ xác nhận kết quả
      </h3>
      <div className="mt-3 grid gap-2">
        {approvedItems.map(item => {
          const action = item.proposedAction && typeof item.proposedAction === "object"
            ? item.proposedAction as Row : {};
          return <div key={String(item.id)}
            className="flex flex-col gap-3 rounded-xl border border-white/8 bg-black/15 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <b className="block truncate text-xs text-[#f5edd6]">{String(item.title)}</b>
              <p className="mt-1 truncate text-[10px] text-slate-500">{String(item.summary)}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              {Boolean(action.href) && <Link href={String(action.href)}
                className="fbg-secondary-button inline-flex items-center gap-1 rounded-lg border px-2.5 py-2 text-[10px] font-bold">
                Mở xử lý <ArrowRight size={11} />
              </Link>}
              {canReview && <button type="button" onClick={() => onReview(String(item.id), "applied")}
                className="fbg-primary-button rounded-lg px-2.5 py-2 text-[10px] font-black">
                Đã thực hiện
              </button>}
            </div>
          </div>;
        })}
      </div>
    </div>}
  </section>;
}

function Dashboard({ data, reports }: { data: Row; reports: boolean }) {
  const metrics = (data.metrics || {}) as Row;
  const daily = (data.daily || []) as Row[];
  const funnel = (data.funnel || []) as Row[];
  const topLeads = (data.topGroupsByLeads || []) as Row[];
  const topRevenue = (data.topGroupsByRevenue || []) as Row[];
  const dailyMax = Math.max(1, ...daily.flatMap(row => [Number(row.posts || 0), Number(row.leads || 0)]));
  const funnelMax = Math.max(1, ...funnel.map(row => Number(row.value || 0)));
  const cards = [
    ["Group đã lưu", metrics.groups, Users, "#d7b957", "rgba(215,185,87,.18)"],
    ["Group cho phép Fanpage", metrics.groupsAllowPages, Facebook, "#6d9fdb", "rgba(85,132,190,.18)"],
    ["Fanpage đã tham gia", metrics.groupsJoined, CheckCircle2, "#66c59c", "rgba(68,177,129,.18)"],
    ["Nhiệm vụ hôm nay", metrics.tasksToday, CalendarDays, "#d9a94a", "rgba(217,169,74,.18)"],
    ["Nhiệm vụ quá hạn", metrics.overdue, AlertTriangle, "#e37a76", "rgba(209,78,73,.18)"],
    ["Cần kiểm tra bình luận", metrics.checksDue, MessageSquare, "#9b8ad2", "rgba(130,103,188,.18)"],
    ["Khách hôm nay", metrics.leadsToday, Users, "#61b8bd", "rgba(63,157,164,.18)"],
    ["Đơn hàng", metrics.orders, FileText, "#e0c86d", "rgba(215,185,87,.18)"],
  ] as const;
  return (
    <div className="fbg-dashboard space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(([label, amount, Icon, color, glow]) => (
          <div key={label} className="fbg-metric-card rounded-2xl border border-white/8 bg-white/[.035] p-4"
            style={{ "--metric-color": color, "--metric-glow": glow } as React.CSSProperties}>
            <div className="flex items-center justify-between gap-3">
              <span className="fbg-metric-label text-[10px] font-semibold">{label}</span>
              <span className="fbg-metric-icon"><Icon size={17} /></span>
            </div>
            <div className="fbg-metric-value mt-3 text-3xl font-black text-white">{Number(amount || 0).toLocaleString("vi-VN")}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="fbg-panel fbg-chart rounded-2xl border border-white/8 bg-white/[.035] p-5 xl:col-span-2">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="fbg-panel-title font-bold">Hiệu suất theo ngày</h3>
              <p className="fbg-panel-kicker mt-1 text-xs">Bài đã đăng và khách hàng quy nguồn từ Group</p>
            </div>
            <div className="fbg-chart-legend flex items-center gap-4 text-[10px] font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1.5"><i className="bg-[#d7b957]" /> Bài đăng</span>
              <span className="flex items-center gap-1.5"><i className="bg-[#5e89c3]" /> Khách hàng</span>
            </div>
          </div>
          <div className="fbg-chart-grid flex h-52 items-end gap-1.5 overflow-x-auto rounded-xl px-2 pt-3">
            {daily.length ? daily.map(row => {
              const postHeight = Math.max(5, (Number(row.posts || 0) / dailyMax) * 160);
              const leadHeight = Math.max(5, (Number(row.leads || 0) / dailyMax) * 160);
              return <div key={String(row.date)} className="fbg-chart-day group flex min-w-9 flex-1 flex-col items-center gap-1.5"
                title={`${row.date}: ${row.posts || 0} bài, ${row.leads || 0} khách`}>
                <div className="flex flex-1 items-end gap-1">
                  <div className="fbg-chart-column w-2.5 bg-gradient-to-t from-[#80651e] to-[#e6ce72]" style={{ height: postHeight }} />
                  <div className="fbg-chart-column w-2.5 bg-gradient-to-t from-[#304e79] to-[#6f9bd6]" style={{ height: leadHeight }} />
                </div>
                <span className="text-[9px] text-[rgba(245,237,214,.36)]">{String(row.date).slice(5)}</span>
              </div>;
            }) : <div className="grid h-full w-full place-items-center text-center">
              <div><BarChart3 className="mx-auto mb-2 text-amber-300/40" size={28} /><p className="text-xs text-slate-500">Chưa có dữ liệu theo ngày.</p></div>
            </div>}
          </div>
        </div>
        <div className="fbg-panel rounded-2xl border border-white/8 bg-white/[.035] p-5">
          <h3 className="fbg-panel-title font-bold">Phễu chuyển đổi</h3>
          <p className="fbg-panel-kicker mb-4 mt-1 text-xs">Từ tương tác đến đơn hàng ghi nhận</p>
          <div className="space-y-2">
            {funnel.map((row, index) => (
              <div key={String(row.label)} className="fbg-funnel-step rounded-xl px-3 py-2.5" style={{ marginInline: `${index * 4}px` }}>
                <div className="mb-2 flex justify-between gap-3 text-xs"><span className="text-slate-300">{String(row.label)}</span><b className="text-white">{Number(row.value || 0)}</b></div>
                <div className="fbg-funnel-track"><div className="fbg-funnel-fill" style={{ width: `${Math.max(3, Number(row.value || 0) / funnelMax * 100)}%` }} /></div>
              </div>
            ))}
            {!funnel.length && <p className="py-12 text-center text-sm text-slate-500">Chưa có dữ liệu chuyển đổi.</p>}
          </div>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Ranking title="Top group tạo khách hàng" rows={topLeads} format={String} />
        <Ranking title="Top group theo doanh thu" rows={topRevenue} format={money} />
      </div>
      <div className="fbg-revenue-card rounded-2xl border border-amber-400/15 bg-amber-400/[.06] p-6">
        <div className="relative z-[1] flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-amber-200"><BarChart3 size={18} /> Tổng doanh thu quy nguồn</div>
        <div className="relative z-[1] mt-2 text-4xl font-black tracking-[-.04em]">{money(metrics.revenue)}</div>
        {reports && <p className="mt-2 text-sm text-slate-400">Doanh thu được khử trùng theo revenue event key trước khi cộng vào group và chiến dịch.</p>}
      </div>
    </div>
  );
}

function Ranking({ title, rows, format }: { title: string; rows: Row[]; format: (input: unknown) => string }) {
  return <div className="fbg-ranking rounded-2xl border border-white/8 bg-white/[.035] p-5">
    <h3 className="fbg-panel-title mb-3 font-bold">{title}</h3>
    <div className="space-y-2">{rows.length ? rows.map((row, index) => (
      <div key={String(row.id)} className="fbg-ranking-row flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm">
        <span className="flex min-w-0 items-center gap-2.5 truncate"><b className="fbg-ranking-index">#{index + 1}</b><span className="truncate">{String(row.name)}</span></span>
        <b className="shrink-0 text-[#e5d386]">{format(row.value)}</b>
      </div>
    )) : <p className="text-sm text-slate-500">Chưa có dữ liệu.</p>}</div>
  </div>;
}

function DataTable({ section, rows, permissions, onAction, onEdit, onDelete }: {
  section: string; rows: Row[]; permissions: Permissions;
  onAction: (endpoint: string, body?: Row, method?: string) => Promise<void>;
  onEdit: (row: Row) => void;
  onDelete: (row: Row) => void;
}) {
  if (!rows.length) return <div className="fbg-empty-state grid min-h-64 place-items-center rounded-2xl border border-dashed border-white/10 text-sm text-slate-500">
    <div className="text-center"><span className="fbg-empty-icon"><FileText size={21} /></span><p className="mt-3 font-medium text-slate-400">Chưa có dữ liệu.</p><p className="mt-1 text-xs text-slate-600">Dữ liệu vận hành sẽ xuất hiện tại đây.</p></div>
  </div>;
  const columns: Record<string, Array<[string, string]>> = {
    groups: [["name", "Group"], ["region", "Khu vực"], ["topic", "Chủ đề"], ["membership_status", "Tham gia"], ["grade", "Hạng"], ["quality_score", "Điểm"], ["status", "Trạng thái"]],
    campaigns: [["name", "Chiến dịch"], ["code", "Mã"], ["pageName", "Fanpage"], ["groupCount", "Group"], ["start_date", "Bắt đầu"], ["end_date", "Kết thúc"], ["status", "Trạng thái"]],
    content: [["opening", "Mở đầu"], ["groupName", "Group"], ["source_code", "Mã nguồn"], ["duplicate_ratio", "Trùng lặp"], ["status", "Trạng thái"]],
    calendar: [["scheduled_at", "Thời gian"], ["groupName", "Group"], ["pageName", "Fanpage"], ["campaignName", "Chiến dịch"], ["staffName", "Nhân viên"], ["status", "Trạng thái"]],
    tasks: [["scheduled_at", "Giờ đăng"], ["groupName", "Group"], ["sourceCode", "Mã nguồn"], ["staffName", "Nhân viên"], ["status", "Trạng thái"]],
    posts: [["actual_posted_at", "Đã đăng"], ["groupName", "Group"], ["source_code", "Mã nguồn"], ["moderation_status", "Kiểm duyệt"], ["status", "Theo dõi"]],
    comments: [["commented_at", "Thời gian"], ["groupName", "Group"], ["facebook_name", "Facebook"], ["content", "Bình luận"], ["intent", "Nhu cầu"], ["temperature", "Mức độ"]],
    checks: [["due_at", "Hạn kiểm tra"], ["groupName", "Group"], ["actualPostedAt", "Đã đăng"], ["check_type", "Mốc"], ["status", "Trạng thái"]],
  };
  const selected = columns[section] || columns.tasks;
  const canEdit = section === "groups" ? permissions.manage
    : section === "campaigns" ? permissions.campaigns
      : section === "content" ? permissions.content
        : ["calendar", "tasks"].includes(section) ? permissions.schedule
          : ["posts", "comments", "checks"].includes(section) ? permissions.publish
            : false;
  return (
    <div className="fbg-table-wrap overflow-x-auto rounded-2xl border border-white/8 bg-white/[.025]">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="border-b border-white/8 bg-white/[.035] text-xs uppercase tracking-wide text-slate-500">
          <tr>{selected.map(([, label]) => <th key={label} className="px-4 py-3">{label}</th>)}<th className="px-4 py-3">Thao tác</th></tr>
        </thead>
        <tbody>{rows.map(row => (
          <tr key={String(row.id)} className="border-b border-white/[.055] hover:bg-white/[.025]">
            {selected.map(([key]) => {
              const item = value(row, key);
              const isStatus = key.includes("status");
              const isDate = key.includes("_at") || key.includes("date");
              return <td key={key} className="max-w-[280px] truncate px-4 py-3">
                {isStatus ? <Status status={item} /> : isDate ? formatDate(item) : key.includes("ratio") ? `${Number(item || 0)}%` : String(item || "—")}
              </td>;
            })}
            <td className="px-4 py-3">
              <div className="fbg-table-actions flex gap-2">
                {canEdit && <button onClick={() => onEdit(row)} title="Sửa bản ghi" aria-label="Sửa bản ghi"><Pencil size={16} /></button>}
                {permissions.admin && <button onClick={() => onDelete(row)} title="Xóa bản ghi" aria-label="Xóa bản ghi"
                  className="fbg-delete-button"><Trash2 size={16} /></button>}
                {section === "groups" && Boolean(row.group_url) && <a target="_blank" rel="noreferrer" href={String(row.group_url)} title="Mở group"><ExternalLink size={17} /></a>}
                {section === "groups" && permissions.manage && <button onClick={() => void onAction(`groups/${row.id}/recalculate-score`)} title="Tính lại điểm"><RefreshCw size={17} /></button>}
                {section === "groups" && permissions.manage && row.status !== "active" && <button
                  onClick={() => void onAction(`groups/${row.id}/set-status`, { status: "active" })}
                  title="Kích hoạt Group"><CheckCircle2 size={17} className="text-emerald-300" /></button>}
                {section === "groups" && permissions.manage && <button onClick={() => {
                  const rawText = window.prompt("Dán nội quy do nhân viên đọc từ group:", String(row.ruleText || ""));
                  if (rawText === null) return;
                  void onAction(`groups/${row.id}/rules`, { rawText }).then(() => onAction(`groups/${row.id}/analyze-rules`));
                }} title="Cập nhật và phân tích nội quy"><FileText size={17} /></button>}
                {section === "campaigns" && permissions.campaigns && ["draft", "paused"].includes(String(row.status)) && <button
                  onClick={() => void onAction(`campaigns/${row.id}`, { status: "active" }, "PATCH")}
                  title="Kích hoạt chiến dịch"><CheckCircle2 size={17} className="text-emerald-300" /></button>}
                {section === "campaigns" && permissions.campaigns && row.status === "active" && <button
                  onClick={() => void onAction(`campaigns/${row.id}`, { status: "completed" }, "PATCH")}
                  title="Hoàn tất chiến dịch"><CheckCircle2 size={17} className="text-blue-300" /></button>}
                {section === "content" && permissions.approve && row.status !== "approved" && <button onClick={() => void onAction(`content/${row.id}/approve`)} title="Duyệt"><CheckCircle2 size={17} /></button>}
                {section === "tasks" && <button onClick={() => navigator.clipboard.writeText(`${value(row, "opening")}\n\n${value(row, "body")}\n\n${value(row, "cta")}`)} title="Sao chép nội dung"><ClipboardCopy size={17} /></button>}
                {section === "tasks" && Boolean(row.groupUrl) && <a target="_blank" rel="noreferrer" href={String(row.groupUrl)} title="Mở group"><ExternalLink size={17} /></a>}
                {section === "tasks" && permissions.publish && !["posted", "approved"].includes(String(row.status)) && <MarkPosted task={row} onAction={onAction} />}
                {section === "posts" && Boolean(row.post_url) && <a target="_blank" rel="noreferrer" href={String(row.post_url)}><ExternalLink size={17} /></a>}
                {section === "posts" && permissions.publish && row.moderation_status === "pending" && <>
                  <button onClick={() => void onAction(`posts/${row.id}/moderation`, { status: "approved" })}
                    title="Xác nhận Group đã duyệt"><CheckCircle2 size={17} className="text-emerald-300" /></button>
                  <button onClick={() => {
                    const reason = window.prompt("Lý do Group từ chối bài (nếu biết):", "");
                    if (reason === null) return;
                    void onAction(`posts/${row.id}/moderation`, { status: "rejected", reason });
                  }} title="Đánh dấu bị từ chối"><AlertTriangle size={17} className="text-red-300" /></button>
                </>}
                {section === "checks" && Boolean(row.postUrl) && <a target="_blank" rel="noreferrer" href={String(row.postUrl)}><ExternalLink size={17} /></a>}
                {section === "checks" && permissions.publish && row.status === "pending" && <CompleteCheck check={row} onAction={onAction} />}
                {section === "comments" && permissions.sales && Boolean(row.sourceCode) && <button onClick={() => {
                  const leadId = window.prompt("Nhập ID khách hàng CRM cần gắn nguồn:");
                  if (!leadId) return;
                  void onAction("leads/link", {
                    leadId, sourceCode: row.sourceCode, firstMessengerAt: new Date().toISOString(),
                  });
                }} title="Gắn khách hàng CRM"><Users size={17} className="text-blue-300" /></button>}
                {section === "comments" && permissions.sales
                  && <CommentAiReply comment={row} onAction={onAction} />}
              </div>
            </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function CommentAiReply({
  comment, onAction,
}: {
  comment: Row;
  onAction: (endpoint: string, body?: Row, method?: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [suggestion, setSuggestion] = useState<Row | null>(null);
  const generate = async () => {
    setBusy(true); setError("");
    try {
      setSuggestion(await api(`comments/${comment.id}/suggest-reply`, {
        method: "POST",
        body: "{}",
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể soạn câu trả lời.");
    } finally {
      setBusy(false);
    }
  };
  const applyClassification = async () => {
    if (!suggestion) return;
    await onAction(`comments/${comment.id}`, {
      intent: suggestion.intent,
      temperature: suggestion.temperature,
    }, "PATCH");
    setOpen(false);
  };
  return <>
    <button type="button" onClick={() => { setOpen(true); void generate(); }}
      title="AI phân loại và soạn câu trả lời">
      <Sparkles size={17} className="text-amber-200" />
    </button>
    {open && <Modal title="AI hỗ trợ trả lời bình luận" onClose={() => setOpen(false)}>
      <div className="space-y-4">
        <div className="fbg-choice-list rounded-xl border p-3 text-sm text-slate-300">
          <b className="block text-[#f5edd6]">{String(value(comment, "facebook_name", "facebookName") || "Khách Facebook")}</b>
          <p className="mt-2 whitespace-pre-wrap text-xs leading-5">{String(value(comment, "content"))}</p>
        </div>
        {busy && <div className="flex items-center gap-2 py-8 text-sm text-slate-400">
          <Loader2 size={17} className="animate-spin" /> AI đang đọc nội dung, nội quy và dữ liệu sản phẩm…
        </div>}
        {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">{error}</div>}
        {suggestion && !busy && <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/8 bg-black/15 p-3 text-xs">
              <span className="text-slate-500">Nhu cầu</span>
              <b className="mt-1 block text-[#f5edd6]">{String(suggestion.intent)}</b>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/15 p-3 text-xs">
              <span className="text-slate-500">Mức độ</span>
              <b className="mt-1 block text-[#f5edd6]">{String(suggestion.temperature)}</b>
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-xs font-bold text-slate-300">Bản nháp trả lời</div>
            <div className="rounded-xl border border-amber-300/15 bg-amber-300/[.045] p-4 text-sm leading-6 text-[#f5edd6]">
              {String(suggestion.reply)}
            </div>
          </div>
          <p className="text-xs leading-5 text-slate-500">{String(suggestion.rationale || "")}</p>
          {Array.isArray(suggestion.warnings) && suggestion.warnings.length > 0 && <div className="rounded-xl border border-amber-400/20 bg-amber-400/[.06] p-3 text-xs text-amber-200">
            {suggestion.warnings.map((warning, index) => <p key={index}>• {String(warning)}</p>)}
          </div>}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => navigator.clipboard.writeText(String(suggestion.reply || ""))}
              className="fbg-secondary-button inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold">
              <ClipboardCopy size={14} /> Sao chép trả lời
            </button>
            <button type="button" onClick={() => void applyClassification()}
              className="fbg-primary-button rounded-xl px-4 py-2.5 text-xs font-black">
              Lưu phân loại vào CRM
            </button>
          </div>
          <p className="text-[10px] text-slate-600">AI không tự gửi bình luận. Nhân viên phải kiểm tra và tự trả lời trên Facebook.</p>
        </>}
      </div>
    </Modal>}
  </>;
}

function CompleteCheck({ check, onAction }: { check: Row; onAction: (endpoint: string, body?: Row) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const handle = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await onAction(`checks/${check.id}/complete`, {
      commentCount: Number(form.get("commentCount") || 0),
      reactionCount: Number(form.get("reactionCount") || 0),
    });
    setOpen(false);
  };
  return <>
    <button onClick={() => setOpen(true)} title="Hoàn thành kiểm tra"><CheckCircle2 size={17} className="text-emerald-300" /></button>
    {open && <Modal title="Hoàn thành kiểm tra bình luận" onClose={() => setOpen(false)}>
      <form className="fbg-form grid gap-4 md:grid-cols-2" onSubmit={handle}>
        <Field label="Tổng số bình luận hiện tại" name="commentCount" type="number" required />
        <Field label="Tổng số lượt phản ứng hiện tại" name="reactionCount" type="number" required />
        <div className="md:col-span-2 flex justify-end">
          <button className="fbg-primary-button rounded-xl bg-amber-400 px-5 py-2.5 font-black text-black">Xác nhận hoàn thành</button>
        </div>
      </form>
    </Modal>}
  </>;
}

function MarkPosted({ task, onAction }: { task: Row; onAction: (endpoint: string, body?: Row) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const localNow = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  const handle = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const localPostedAt = String(form.get("actualPostedAt") || "");
    await onAction(`tasks/${task.id}/mark-posted`, {
      postUrl: String(form.get("postUrl") || ""),
      actualPostedAt: new Date(localPostedAt).toISOString(),
      moderationStatus: String(form.get("moderationStatus") || "approved"),
    });
    setOpen(false);
  };
  return <>
    <button onClick={() => setOpen(true)} title="Đánh dấu đã đăng"><CheckCircle2 size={17} className="text-emerald-300" /></button>
    {open && <Modal title="Đánh dấu bài đã đăng" onClose={() => setOpen(false)}>
      <form className="fbg-form grid gap-4" onSubmit={handle}>
        <Field label="Đường dẫn bài đăng Facebook" name="postUrl" type="url" required />
        <Field label="Thời gian đăng thực tế" name="actualPostedAt" required>
          <input name="actualPostedAt" type="datetime-local" required defaultValue={localNow}
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white" />
        </Field>
        <Field label="Trạng thái kiểm duyệt" name="moderationStatus">
          <select name="moderationStatus" defaultValue="approved"
            className="rounded-xl border border-white/10 bg-[#161a23] px-3 py-2.5 text-white">
            <option value="approved">Đã hiển thị trong Group</option>
            <option value="pending">Đang chờ quản trị viên Group duyệt</option>
          </select>
        </Field>
        <div className="flex justify-end">
          <button className="fbg-primary-button rounded-xl bg-amber-400 px-5 py-2.5 font-black text-black">Xác nhận đã đăng</button>
        </div>
      </form>
    </Modal>}
  </>;
}

function CreateForm({ resource, options, onSubmit }: {
  resource: string; options: FormOptions;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const topicOptions = options.topics.length ? options.topics : FACEBOOK_GROUP_TOPIC_TAXONOMY;
  const selectClass = "fbg-form-control rounded-xl border border-white/10 bg-[#161a23] px-3 py-2.5 text-white";
  const suggestContent = async (button: HTMLButtonElement) => {
    const form = button.form;
    if (!form) return;
    const data = new FormData(form);
    setAiBusy(true); setAiError("");
    try {
      const result = await api("content/suggest", {
        method: "POST",
        body: JSON.stringify({
          groupId: data.get("groupId"),
          campaignId: data.get("campaignId"),
          productId: data.get("productId"),
          contentType: data.get("contentType"),
          brief: data.get("brief"),
        }),
      });
      const setValue = (name: string, value: unknown) => {
        const field = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
        if (field) field.value = String(value || "");
      };
      setValue("opening", result.opening);
      setValue("body", result.body);
      setValue("cta", result.cta);
      setValue("contentType", result.contentType);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Không thể tạo gợi ý AI.");
    } finally {
      setAiBusy(false);
    }
  };
  return <form className="fbg-form grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
    {resource === "groups" && <>
      <Field label="Tên group" name="name" required /><Field label="Mã group" name="code" />
      <div className="md:col-span-2"><Field label="Link group" name="groupUrl" type="url" required /></div>
      <Field label="Khu vực" name="region" />
      <Field label="Chủ đề" name="topic" required>
        <select name="topic" required defaultValue={String(topicOptions[0]?.key || "")} className={selectClass}>
          {topicOptions.map(topic => <option key={String(topic.key)} value={String(topic.key)}>{String(topic.label)}</option>)}
        </select>
      </Field>
      <Field label="Số thành viên" name="memberCount" type="number" />
      <Field label="Fanpage tham gia" name="membershipStatus"><select name="membershipStatus" className="rounded-xl border border-white/10 bg-[#161a23] px-3 py-2.5"><option value="not_joined">Chưa tham gia</option><option value="requested">Đã gửi yêu cầu</option><option value="pending">Chờ duyệt</option><option value="joined">Đã tham gia</option></select></Field>
      <Field label="Cho phép Fanpage" name="allowsPages"><select name="allowsPages" className="rounded-xl border border-white/10 bg-[#161a23] px-3 py-2.5"><option value="unknown">Chưa kiểm tra</option><option value="yes">Có</option><option value="no">Không</option></select></Field>
      <Field label="Cho phép bán hàng" name="allowsSales"><select name="allowsSales" className="rounded-xl border border-white/10 bg-[#161a23] px-3 py-2.5"><option value="unknown">Chưa kiểm tra</option><option value="yes">Có</option><option value="no">Không</option><option value="limited">Hạn chế</option></select></Field>
      <Field label="Trạng thái vận hành" name="status"><select name="status" defaultValue="needs_review" className={selectClass}><option value="needs_review">Cần kiểm tra</option><option value="active">Hoạt động</option><option value="paused">Tạm dừng</option></select></Field>
      <div className="md:col-span-2"><Field label="Nội quy do nhân viên nhập" name="ruleText"><textarea name="ruleText" rows={5} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5" /></Field></div>
    </>}
    {resource === "pages" && <>
      <Field label="Tên Fanpage" name="name" required /><Field label="Facebook Page ID" name="facebookPageId" />
      <Field label="Đường dẫn Fanpage" name="pageUrl" type="url" /><Field label="Thương hiệu" name="brand" />
      <Field label="Tối đa bài/ngày" name="maxPostsPerDay" type="number" /><Field label="Khoảng cách tối thiểu (phút)" name="minPostIntervalMinutes" type="number" />
    </>}
    {resource === "campaigns" && <>
      <Field label="Tên chiến dịch" name="name" required /><Field label="Mã chiến dịch" name="code" />
      <Field label="Fanpage" name="pageId" required><select name="pageId" required className={selectClass}><option value="">Chọn Fanpage</option>{options.pages.map(page => <option key={String(page.id)} value={String(page.id)}>{String(page.name)}</option>)}</select></Field>
      <Field label="Người phụ trách" name="ownerId"><select name="ownerId" className={selectClass}><option value="">Chọn nhân viên</option>{options.staff.map(staff => <option key={String(staff.id)} value={String(staff.id)}>{String(staff.name)}</option>)}</select></Field>
      <Field label="Ngày bắt đầu" name="startDate" type="date" /><Field label="Ngày kết thúc" name="endDate" type="date" />
      <div className="md:col-span-2">
        <span className="mb-2 block text-sm text-slate-300">Sản phẩm trong chiến dịch</span>
        <div className="fbg-choice-list grid max-h-40 gap-2 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-3 md:grid-cols-2">
          {options.products.map(product => <label key={String(product.id)} className="flex items-start gap-2 text-sm text-slate-200">
            <input type="checkbox" name="productIds" value={String(product.id)} className="mt-1" />
            <span>{String(product.name)} <small className="text-slate-500">({String(product.sku || "")})</small></span>
          </label>)}
          {!options.products.length && <span className="text-sm text-slate-500">Chưa có sản phẩm CRM.</span>}
        </div>
      </div>
      <div className="md:col-span-2">
        <span className="mb-2 block text-sm text-slate-300">Group mục tiêu</span>
        <div className="fbg-choice-list grid max-h-40 gap-2 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-3 md:grid-cols-2">
          {options.groups.map(group => <label key={String(group.id)} className="flex items-start gap-2 text-sm text-slate-200">
            <input type="checkbox" name="groupIds" value={String(group.id)} className="mt-1" />
            <span>{String(group.name)} <small className="text-slate-500">({String(group.status)})</small></span>
          </label>)}
          {!options.groups.length && <span className="text-sm text-slate-500">Chưa có Group.</span>}
        </div>
      </div>
    </>}
    {resource === "content" && <>
      <Field label="Group" name="groupId" required><select name="groupId" required className={selectClass}><option value="">Chọn Group</option>{options.groups.map(group => <option key={String(group.id)} value={String(group.id)}>{String(group.name)}</option>)}</select></Field>
      <Field label="Chiến dịch" name="campaignId"><select name="campaignId" className={selectClass}><option value="">Không thuộc chiến dịch</option>{options.campaigns.map(campaign => <option key={String(campaign.id)} value={String(campaign.id)}>{String(campaign.name)}</option>)}</select></Field>
      <Field label="Sản phẩm" name="productId" required><select name="productId" required className={selectClass}><option value="">Chọn sản phẩm</option>{options.products.map(product => <option key={String(product.id)} value={String(product.id)}>{String(product.name)} ({String(product.sku || "")})</option>)}</select></Field>
      <Field label="Mã sản phẩm dùng trong mã nguồn" name="productCode" />
      <Field label="Loại nội dung" name="contentType"><select name="contentType" className={selectClass}><option value="community_share">Chia sẻ cộng đồng</option><option value="sales">Bài bán hàng</option><option value="education">Kiến thức</option></select></Field>
      <Field label="Yêu cầu thêm cho AI" name="brief"><input name="brief" placeholder="Ví dụ: tập trung người cao tuổi, không nêu giá" className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white" /></Field>
      <div className="md:col-span-2">
        <button type="button" disabled={aiBusy} onClick={event => void suggestContent(event.currentTarget)}
          className="fbg-ai-button inline-flex items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-400/10 px-4 py-2.5 text-sm font-bold text-blue-200 disabled:opacity-50">
          {aiBusy ? <Loader2 size={15} className="animate-spin" /> : <MessageSquare size={15} />}
          {aiBusy ? "AI đang đọc nội quy và sản phẩm…" : "AI gợi ý theo nội quy thật"}
        </button>
        {aiError && <p className="mt-2 text-xs text-red-300">{aiError}</p>}
      </div>
      <div className="md:col-span-2"><Field label="Câu mở đầu" name="opening"><textarea name="opening" rows={2} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5" /></Field></div>
      <div className="md:col-span-2"><Field label="Nội dung chính" name="body" required><textarea name="body" required rows={7} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5" /></Field></div>
      <div className="md:col-span-2"><Field label="Kêu gọi hành động & liên hệ" name="cta"><textarea name="cta" rows={3} placeholder="Hệ thống sẽ bổ sung Messenger, Hotline/Zalo hoặc link theo nội quy Group." className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5" /></Field></div>
    </>}
    {resource === "tasks" && <>
      <Field label="Fanpage" name="pageId" required><select name="pageId" required className={selectClass}><option value="">Chọn Fanpage</option>{options.pages.map(page => <option key={String(page.id)} value={String(page.id)}>{String(page.name)}</option>)}</select></Field>
      <Field label="Group" name="groupId" required><select name="groupId" required className={selectClass}><option value="">Chọn Group</option>{options.groups.filter(group => group.status === "active").map(group => <option key={String(group.id)} value={String(group.id)}>{String(group.name)}</option>)}</select></Field>
      <Field label="Nội dung đã duyệt" name="contentId" required><select name="contentId" required className={selectClass}><option value="">Chọn nội dung</option>{options.content.filter(item => item.status === "approved").map(item => <option key={String(item.id)} value={String(item.id)}>{String(item.sourceCode || item.opening)}</option>)}</select></Field>
      <Field label="Chiến dịch" name="campaignId"><select name="campaignId" className={selectClass}><option value="">Không thuộc chiến dịch</option>{options.campaigns.map(campaign => <option key={String(campaign.id)} value={String(campaign.id)}>{String(campaign.name)}</option>)}</select></Field>
      <Field label="Nhân viên phụ trách" name="assignedStaffId"><select name="assignedStaffId" className={selectClass}><option value="">Chọn nhân viên</option>{options.staff.map(staff => <option key={String(staff.id)} value={String(staff.id)}>{String(staff.name)}</option>)}</select></Field>
      <Field label="Giờ đăng" name="scheduledAt" type="datetime-local" required />
    </>}
    {resource === "comments" && <>
      <Field label="Bài đã đăng" name="postId" required><select name="postId" required className={selectClass}><option value="">Chọn bài đăng</option>{options.posts.map(post => <option key={String(post.id)} value={String(post.id)}>{String(post.sourceCode)} — {String(post.groupName)}</option>)}</select></Field>
      <Field label="Tên Facebook" name="facebookName" required />
      <div className="md:col-span-2"><Field label="Nội dung bình luận" name="content" required><textarea name="content" required rows={4} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5" /></Field></div>
      <Field label="Số điện thoại công khai" name="phone" /><Field label="Thời gian bình luận" name="commentedAt" type="datetime-local" />
      <Field label="Nhu cầu" name="intent"><select name="intent" className="rounded-xl border border-white/10 bg-[#161a23] px-3 py-2.5"><option value="price">Hỏi giá</option><option value="size">Hỏi kích thước</option><option value="delivery">Hỏi giao hàng</option><option value="showroom">Hỏi showroom</option><option value="dealer">Muốn làm đại lý</option><option value="other">Khác</option></select></Field>
      <Field label="Mức độ" name="temperature"><select name="temperature" className="rounded-xl border border-white/10 bg-[#161a23] px-3 py-2.5"><option value="hot">Nóng</option><option value="warm">Ấm</option><option value="cold">Lạnh</option></select></Field>
      <Field label="Khách hàng CRM (nếu đã có)" name="leadId"><select name="leadId" className={selectClass}><option value="">Chưa gắn khách hàng</option>{options.leads.map(lead => <option key={String(lead.id)} value={String(lead.id)}>{String(lead.name)} {lead.phone ? `• ${String(lead.phone)}` : ""}</option>)}</select></Field>
      <Field label="Nhân viên xử lý" name="assignedStaffId"><select name="assignedStaffId" className={selectClass}><option value="">Chọn nhân viên</option>{options.staff.map(staff => <option key={String(staff.id)} value={String(staff.id)}>{String(staff.name)}</option>)}</select></Field>
    </>}
    <div className="fbg-form-actions md:col-span-2 flex justify-end"><button className="fbg-primary-button rounded-xl bg-amber-400 px-5 py-2.5 font-black text-black">Lưu</button></div>
  </form>;
}

function EditForm({ resource, row, options, onSubmit }: {
  resource: string;
  row: Row;
  options: FormOptions;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const [rewriteBusy, setRewriteBusy] = useState(false);
  const [rewriteError, setRewriteError] = useState("");
  const [rewriteInstruction, setRewriteInstruction] = useState("Viết tự nhiên hơn và giảm nguy cơ spam");
  const [rewriteSummary, setRewriteSummary] = useState("");
  const selectClass = "fbg-form-control rounded-xl border border-white/10 bg-[#161a23] px-3 py-2.5 text-white";
  const productIds = new Set((Array.isArray(row.product_ids) ? row.product_ids : []).map(String));
  const groupIds = new Set((Array.isArray(row.groupIds) ? row.groupIds : []).map(String));
  const currentStatus = String(value(row, "status") || "");
  const topicOptions = options.topics.length ? options.topics : FACEBOOK_GROUP_TOPIC_TAXONOMY;
  const rewriteContent = async (button: HTMLButtonElement, instruction = rewriteInstruction) => {
    const form = button.form;
    if (!form || resource !== "content") return;
    setRewriteBusy(true); setRewriteError(""); setRewriteSummary("");
    try {
      const result = await api(`content/${row.id}/ai-rewrite`, {
        method: "POST",
        body: JSON.stringify({ instruction }),
      });
      const setValue = (name: string, nextValue: unknown) => {
        const field = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
        if (field) field.value = String(nextValue || "");
      };
      setValue("opening", result.opening);
      setValue("body", result.body);
      setValue("cta", result.cta);
      setValue("contentType", result.contentType);
      setRewriteSummary(String(result.changeSummary || "AI đã tạo một phiên bản mới để bạn kiểm tra."));
    } catch (err) {
      setRewriteError(err instanceof Error ? err.message : "Không thể viết lại nội dung.");
    } finally {
      setRewriteBusy(false);
    }
  };
  return <form className="fbg-form grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
    {resource === "pages" && <>
      <Field label="Tên Fanpage" name="name" required>
        <input name="name" required defaultValue={String(value(row, "name"))} className={selectClass} />
      </Field>
      <Field label="Facebook Page ID" name="facebookPageId">
        <input name="facebookPageId" defaultValue={String(value(row, "facebookPageId", "facebook_page_id"))} className={selectClass} />
      </Field>
      <Field label="Đường dẫn Fanpage" name="pageUrl">
        <input name="pageUrl" type="url" defaultValue={String(value(row, "pageUrl", "page_url"))} className={selectClass} />
      </Field>
      <Field label="Thương hiệu" name="brand">
        <input name="brand" defaultValue={String(value(row, "brand"))} className={selectClass} />
      </Field>
      <Field label="Tối đa bài/ngày" name="maxPostsPerDay">
        <input name="maxPostsPerDay" type="number" min={1} defaultValue={Number(value(row, "maxPostsPerDay", "max_posts_per_day") || 4)} className={selectClass} />
      </Field>
      <Field label="Khoảng cách tối thiểu (phút)" name="minPostIntervalMinutes">
        <input name="minPostIntervalMinutes" type="number" min={0} defaultValue={Number(value(row, "minPostIntervalMinutes", "min_post_interval_minutes") || 60)} className={selectClass} />
      </Field>
      <Field label="Trạng thái" name="status">
        <select name="status" defaultValue={currentStatus || "active"} className={selectClass}>
          <option value="active">Hoạt động</option><option value="paused">Tạm dừng</option>
        </select>
      </Field>
      <div className="md:col-span-2"><Field label="Ghi chú" name="notes">
        <textarea name="notes" rows={3} defaultValue={String(value(row, "notes"))} className={selectClass} />
      </Field></div>
    </>}

    {resource === "groups" && <>
      <Field label="Tên Group" name="name" required>
        <input name="name" required defaultValue={String(value(row, "name"))} className={selectClass} />
      </Field>
      <Field label="Mã Group" name="code" required>
        <input name="code" required defaultValue={String(value(row, "code"))} className={selectClass} />
      </Field>
      <div className="md:col-span-2"><Field label="Link Group" name="groupUrl" required>
        <input name="groupUrl" type="url" required defaultValue={String(value(row, "group_url", "groupUrl"))} className={selectClass} />
      </Field></div>
      <Field label="Khu vực" name="region">
        <input name="region" defaultValue={String(value(row, "region"))} className={selectClass} />
      </Field>
      <Field label="Chủ đề" name="topic">
        <select name="topic" defaultValue={String(value(row, "topic") || "Phòng trọ")} className={selectClass}>
          {!topicOptions.some(topic => String(topic.key) === String(value(row, "topic")))
            && value(row, "topic")
            && <option value={String(value(row, "topic"))}>{String(value(row, "topic"))}</option>}
          {topicOptions.map(topic => <option key={String(topic.key)} value={String(topic.key)}>{String(topic.label)}</option>)}
        </select>
      </Field>
      <Field label="Số thành viên" name="memberCount">
        <input name="memberCount" type="number" min={0} defaultValue={Number(value(row, "member_count", "memberCount") || 0)} className={selectClass} />
      </Field>
      <Field label="Nhân viên phụ trách" name="assignedStaffId">
        <select name="assignedStaffId" defaultValue={String(value(row, "assigned_staff_id", "assignedStaffId"))} className={selectClass}>
          <option value="">Chưa phân công</option>
          {options.staff.map(staff => <option key={String(staff.id)} value={String(staff.id)}>{String(staff.name)}</option>)}
        </select>
      </Field>
      <Field label="Fanpage tham gia" name="membershipStatus">
        <select name="membershipStatus" defaultValue={String(value(row, "membership_status", "membershipStatus") || "not_joined")} className={selectClass}>
          <option value="not_joined">Chưa tham gia</option><option value="requested">Đã gửi yêu cầu</option>
          <option value="pending">Chờ duyệt</option><option value="joined">Đã tham gia</option>
          <option value="rejected">Bị từ chối</option><option value="blocked">Bị chặn</option>
        </select>
      </Field>
      <Field label="Cho phép Fanpage" name="allowsPages">
        <select name="allowsPages" defaultValue={String(value(row, "allows_pages", "allowsPages") || "unknown")} className={selectClass}>
          <option value="unknown">Chưa kiểm tra</option><option value="yes">Có</option><option value="no">Không</option>
        </select>
      </Field>
      <Field label="Cho phép bán hàng" name="allowsSales">
        <select name="allowsSales" defaultValue={String(value(row, "allows_sales", "allowsSales") || "unknown")} className={selectClass}>
          <option value="unknown">Chưa kiểm tra</option><option value="yes">Có</option>
          <option value="no">Không</option><option value="limited">Hạn chế</option>
        </select>
      </Field>
      <Field label="Trạng thái vận hành" name="status">
        <select name="status" defaultValue={currentStatus || "needs_review"} className={selectClass}>
          <option value="needs_review">Cần kiểm tra</option><option value="active">Hoạt động</option><option value="paused">Tạm dừng</option>
        </select>
      </Field>
      <div className="md:col-span-2"><Field label="Nội quy Group" name="ruleText">
        <textarea name="ruleText" rows={6} defaultValue={String(value(row, "ruleText"))} className={selectClass} />
      </Field>
        <p className="mt-1.5 text-xs text-slate-500">Nội quy sẽ được phân tích lại sau khi lưu.</p>
      </div>
    </>}

    {resource === "campaigns" && <>
      <Field label="Tên chiến dịch" name="name" required>
        <input name="name" required defaultValue={String(value(row, "name"))} className={selectClass} />
      </Field>
      <Field label="Mã chiến dịch" name="code" required>
        <input name="code" required defaultValue={String(value(row, "code"))} className={selectClass} />
      </Field>
      <Field label="Fanpage" name="pageId" required>
        <select name="pageId" required defaultValue={String(value(row, "page_id", "pageId"))} className={selectClass}>
          <option value="">Chọn Fanpage</option>
          {options.pages.map(page => <option key={String(page.id)} value={String(page.id)}>{String(page.name)}</option>)}
        </select>
      </Field>
      <Field label="Người phụ trách" name="ownerId">
        <select name="ownerId" defaultValue={String(value(row, "owner_id", "ownerId"))} className={selectClass}>
          <option value="">Chọn nhân viên</option>
          {options.staff.map(staff => <option key={String(staff.id)} value={String(staff.id)}>{String(staff.name)}</option>)}
        </select>
      </Field>
      <Field label="Ngày bắt đầu" name="startDate">
        <input name="startDate" type="date" defaultValue={dateInputValue(value(row, "start_date", "startDate"))} className={selectClass} />
      </Field>
      <Field label="Ngày kết thúc" name="endDate">
        <input name="endDate" type="date" defaultValue={dateInputValue(value(row, "end_date", "endDate"))} className={selectClass} />
      </Field>
      <Field label="Trạng thái" name="status">
        <select name="status" defaultValue={currentStatus || "draft"} className={selectClass}>
          <option value="draft">Bản nháp</option><option value="active">Hoạt động</option>
          <option value="paused">Tạm dừng</option><option value="completed">Hoàn tất</option>
        </select>
      </Field>
      <div className="md:col-span-2">
        <span className="mb-2 block text-sm text-slate-300">Sản phẩm trong chiến dịch</span>
        <div className="fbg-choice-list grid max-h-48 gap-2 overflow-y-auto rounded-xl border border-white/10 p-3 md:grid-cols-2">
          {options.products.map(product => <label key={String(product.id)} className="flex items-start gap-2 text-sm text-slate-200">
            <input type="checkbox" name="productIds" value={String(product.id)} defaultChecked={productIds.has(String(product.id))} className="mt-1" />
            <span>{String(product.name)} <small className="text-slate-500">({String(product.sku || "")})</small></span>
          </label>)}
        </div>
      </div>
      <div className="md:col-span-2">
        <span className="mb-2 block text-sm text-slate-300">Group mục tiêu</span>
        <div className="fbg-choice-list grid max-h-48 gap-2 overflow-y-auto rounded-xl border border-white/10 p-3 md:grid-cols-2">
          {options.groups.map(group => <label key={String(group.id)} className="flex items-start gap-2 text-sm text-slate-200">
            <input type="checkbox" name="groupIds" value={String(group.id)} defaultChecked={groupIds.has(String(group.id))} className="mt-1" />
            <span>{String(group.name)} <small className="text-slate-500">({statusLabel[String(group.status)] || String(group.status)})</small></span>
          </label>)}
        </div>
      </div>
    </>}

    {resource === "content" && <>
      <div className="fbg-choice-list md:col-span-2 rounded-xl border p-3 text-xs text-slate-400">
        <b className="mb-1 block text-slate-200">Ngữ cảnh được bảo vệ</b>
        Group: {String(value(row, "groupName") || "—")} · Chiến dịch: {String(value(row, "campaignName") || "Không có")} · Mã nguồn: {String(value(row, "source_code", "sourceCode") || "—")}
      </div>
      <div className="fbg-ai-editor md:col-span-2 rounded-xl border p-4">
        <div className="flex items-start gap-2">
          <Sparkles size={17} className="mt-0.5 shrink-0 text-amber-200" />
          <div>
            <b className="text-sm text-[#f5edd6]">AI viết lại theo dữ liệu thật</b>
            <p className="mt-1 text-xs text-slate-500">AI đọc sản phẩm và nội quy hiện có; bản sửa chỉ được điền vào form, chưa tự lưu hay duyệt.</p>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-2 md:flex-row">
          <input value={rewriteInstruction} onChange={event => setRewriteInstruction(event.target.value)}
            placeholder="Ví dụ: ngắn hơn, hướng tới người thuê căn hộ nhỏ…"
            className="min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-xs" />
          <button type="button" disabled={rewriteBusy}
            onClick={event => void rewriteContent(event.currentTarget)}
            className="fbg-ai-button inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-black disabled:opacity-50">
            {rewriteBusy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Viết lại
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            "Viết ngắn hơn, giữ đủ thông tin thật",
            "Chuyển sang phong cách chia sẻ cộng đồng",
            "Giảm tính bán hàng và tăng giá trị tư vấn",
            "Tạo câu mở đầu khác biệt rõ ràng",
          ].map(instruction => <button key={instruction} type="button" disabled={rewriteBusy}
            onClick={event => {
              setRewriteInstruction(instruction);
              void rewriteContent(event.currentTarget, instruction);
            }}
            className="fbg-secondary-button rounded-lg border px-2.5 py-1.5 text-[10px] font-bold">
            {instruction}
          </button>)}
        </div>
        {rewriteError && <p className="mt-2 text-xs text-red-300">{rewriteError}</p>}
        {rewriteSummary && <p className="mt-2 text-xs text-emerald-300">{rewriteSummary}</p>}
      </div>
      <Field label="Loại nội dung" name="contentType">
        <select name="contentType" defaultValue={String(value(row, "content_type", "contentType") || "community_share")} className={selectClass}>
          <option value="community_share">Chia sẻ cộng đồng</option><option value="sales">Bài bán hàng</option><option value="education">Kiến thức</option>
        </select>
      </Field>
      <Field label="Mã nguồn" name="sourceCode">
        <input name="sourceCode" defaultValue={String(value(row, "source_code", "sourceCode"))} className={selectClass} />
      </Field>
      <div className="md:col-span-2"><Field label="Câu mở đầu" name="opening">
        <textarea name="opening" rows={2} defaultValue={String(value(row, "opening"))} className={selectClass} />
      </Field></div>
      <div className="md:col-span-2"><Field label="Nội dung chính" name="body" required>
        <textarea name="body" required rows={8} defaultValue={String(value(row, "body"))} className={selectClass} />
      </Field></div>
      <div className="md:col-span-2"><Field label="Kêu gọi hành động & liên hệ" name="cta">
        <textarea name="cta" rows={3} defaultValue={String(value(row, "cta"))} className={selectClass} />
      </Field></div>
      {["approved", "scheduled", "used"].includes(currentStatus) && <div className="fbg-alert md:col-span-2 rounded-xl border border-amber-400/20 bg-amber-400/[.07] p-3 text-xs text-amber-200">
        Nội dung này đã qua duyệt hoặc đã được sử dụng. Sau khi sửa, hệ thống sẽ đưa về Bản nháp để duyệt lại.
      </div>}
    </>}

    {resource === "tasks" && <>
      <div className="fbg-choice-list md:col-span-2 rounded-xl border p-3 text-xs text-slate-400">
        <b className="mb-1 block text-slate-200">Ngữ cảnh nhiệm vụ</b>
        {String(value(row, "pageName") || "Fanpage")} → {String(value(row, "groupName") || "Group")} · {String(value(row, "sourceCode") || "Chưa có mã nguồn")}
      </div>
      <Field label="Nhân viên phụ trách" name="assignedStaffId">
        <select name="assignedStaffId" defaultValue={String(value(row, "assigned_staff_id", "assignedStaffId"))} className={selectClass}>
          <option value="">Chọn nhân viên</option>
          {options.staff.map(staff => <option key={String(staff.id)} value={String(staff.id)}>{String(staff.name)}</option>)}
        </select>
      </Field>
      <Field label="Mức ưu tiên" name="priority">
        <select name="priority" defaultValue={String(value(row, "priority") || "medium")} className={selectClass}>
          <option value="low">Thấp</option><option value="medium">Trung bình</option><option value="high">Cao</option>
        </select>
      </Field>
      <Field label="Giờ đăng" name="scheduledAt" required>
        <input name="scheduledAt" type="datetime-local" required defaultValue={datetimeLocalValue(value(row, "scheduled_at", "scheduledAt"))} className={selectClass} />
      </Field>
      <Field label="Hạn hoàn thành" name="dueAt" required>
        <input name="dueAt" type="datetime-local" required defaultValue={datetimeLocalValue(value(row, "due_at", "dueAt"))} className={selectClass} />
      </Field>
      <Field label="Trạng thái" name="status">
        <select name="status" defaultValue={currentStatus || "scheduled"} className={selectClass}>
          <option value="scheduled">Đã xếp lịch</option><option value="due">Đến hạn</option>
          <option value="postponed">Hoãn</option><option value="cancelled">Đã huỷ</option>
          <option value="posted">Đã đăng</option><option value="pending_moderation">Chờ Group duyệt</option>
        </select>
      </Field>
      <div className="md:col-span-2"><Field label="Ghi chú" name="notes">
        <textarea name="notes" rows={4} defaultValue={String(value(row, "notes"))} className={selectClass} />
      </Field></div>
    </>}

    {resource === "posts" && <>
      <div className="fbg-choice-list md:col-span-2 rounded-xl border p-3 text-xs text-slate-400">
        <b className="mb-1 block text-slate-200">Bài đăng đã ghi nhận</b>
        {String(value(row, "groupName") || "Group")} · {String(value(row, "pageName") || "Fanpage")} · {String(value(row, "source_code", "sourceCode") || "—")}
      </div>
      <div className="md:col-span-2"><Field label="Đường dẫn bài đăng Facebook" name="postUrl" required>
        <input name="postUrl" type="url" required defaultValue={String(value(row, "post_url", "postUrl"))} className={selectClass} />
      </Field></div>
      <Field label="Thời gian đăng thực tế" name="actualPostedAt" required>
        <input name="actualPostedAt" type="datetime-local" required defaultValue={datetimeLocalValue(value(row, "actual_posted_at", "actualPostedAt"))} className={selectClass} />
      </Field>
      <Field label="Kiểm duyệt" name="moderationStatus">
        <select name="moderationStatus" defaultValue={String(value(row, "moderation_status", "moderationStatus") || "pending")} className={selectClass}>
          {String(value(row, "moderation_status", "moderationStatus") || "pending") === "pending" && <option value="pending">Chờ Group duyệt</option>}
          <option value="approved">Đã duyệt</option><option value="rejected">Bị từ chối</option>
        </select>
      </Field>
      <Field label="Theo dõi" name="status">
        <select name="status" defaultValue={currentStatus || "tracking"} className={selectClass}>
          <option value="tracking">Đang theo dõi</option><option value="completed">Đã hoàn tất</option><option value="rejected">Bị từ chối</option>
        </select>
      </Field>
    </>}

    {resource === "comments" && <>
      <Field label="Tên Facebook" name="facebookName" required>
        <input name="facebookName" required defaultValue={String(value(row, "facebook_name", "facebookName"))} className={selectClass} />
      </Field>
      <Field label="Số điện thoại công khai" name="phone">
        <input name="phone" defaultValue={String(value(row, "phone"))} className={selectClass} />
      </Field>
      <div className="md:col-span-2"><Field label="Nội dung bình luận" name="content" required>
        <textarea name="content" required rows={5} defaultValue={String(value(row, "content"))} className={selectClass} />
      </Field></div>
      <Field label="Thời gian bình luận" name="commentedAt">
        <input name="commentedAt" type="datetime-local" defaultValue={datetimeLocalValue(value(row, "commented_at", "commentedAt"))} className={selectClass} />
      </Field>
      <Field label="Nhu cầu" name="intent">
        <select name="intent" defaultValue={String(value(row, "intent") || "other")} className={selectClass}>
          <option value="price">Hỏi giá</option><option value="size">Hỏi kích thước</option><option value="delivery">Hỏi giao hàng</option>
          <option value="showroom">Hỏi showroom</option><option value="dealer">Muốn làm đại lý</option><option value="other">Khác</option>
        </select>
      </Field>
      <Field label="Mức độ" name="temperature">
        <select name="temperature" defaultValue={String(value(row, "temperature") || "cold")} className={selectClass}>
          <option value="hot">Nóng</option><option value="warm">Ấm</option><option value="cold">Lạnh</option>
        </select>
      </Field>
      <Field label="Khách hàng CRM" name="leadId">
        <select name="leadId" defaultValue={String(value(row, "lead_id", "leadId"))} className={selectClass}>
          <option value="">Chưa gắn khách hàng</option>
          {options.leads.map(lead => <option key={String(lead.id)} value={String(lead.id)}>{String(lead.name)} {lead.phone ? `• ${String(lead.phone)}` : ""}</option>)}
        </select>
      </Field>
      <Field label="Nhân viên xử lý" name="assignedStaffId">
        <select name="assignedStaffId" defaultValue={String(value(row, "assigned_staff_id", "assignedStaffId"))} className={selectClass}>
          <option value="">Chọn nhân viên</option>
          {options.staff.map(staff => <option key={String(staff.id)} value={String(staff.id)}>{String(staff.name)}</option>)}
        </select>
      </Field>
      <div className="fbg-choice-list md:col-span-2 grid gap-2 rounded-xl border p-3 sm:grid-cols-3">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="replied" defaultChecked={Boolean(value(row, "replied"))} /> Đã trả lời</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="invitedToMessenger" defaultChecked={Boolean(value(row, "invited_to_messenger", "invitedToMessenger"))} /> Đã mời Messenger</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enteredMessenger" defaultChecked={Boolean(value(row, "entered_messenger", "enteredMessenger"))} /> Đã vào Messenger</label>
      </div>
      <div className="md:col-span-2"><Field label="Ghi chú" name="notes">
        <textarea name="notes" rows={3} defaultValue={String(value(row, "notes"))} className={selectClass} />
      </Field></div>
    </>}

    {resource === "checks" && <>
      <div className="fbg-choice-list md:col-span-2 rounded-xl border p-3 text-xs text-slate-400">
        <b className="mb-1 block text-slate-200">Mốc kiểm tra bài đăng</b>
        {String(value(row, "groupName") || "Group")} · {String(value(row, "check_type", "checkType") || "Kiểm tra bình luận")}
      </div>
      <Field label="Hạn kiểm tra" name="dueAt" required>
        <input name="dueAt" type="datetime-local" required defaultValue={datetimeLocalValue(value(row, "due_at", "dueAt"))} className={selectClass} />
      </Field>
      <Field label="Nhân viên phụ trách" name="assignedStaffId">
        <select name="assignedStaffId" defaultValue={String(value(row, "assigned_staff_id", "assignedStaffId"))} className={selectClass}>
          <option value="">Chọn nhân viên</option>
          {options.staff.map(staff => <option key={String(staff.id)} value={String(staff.id)}>{String(staff.name)}</option>)}
        </select>
      </Field>
      <Field label="Trạng thái" name="status">
        <select name="status" defaultValue={currentStatus || "pending"} className={selectClass}>
          <option value="pending">Chờ kiểm tra</option><option value="completed">Đã hoàn tất</option><option value="cancelled">Đã huỷ</option>
        </select>
      </Field>
    </>}

    <div className="fbg-form-actions md:col-span-2 flex justify-end">
      <button className="fbg-primary-button rounded-xl bg-amber-400 px-5 py-2.5 font-black text-black">Lưu thay đổi</button>
    </div>
  </form>;
}

function SettingsView({
  data, pages, canEdit, canDelete, onSave, onSyncPages, onAddPage, onEditPage, onDeletePage,
}: {
  data: Row;
  pages: Row[];
  canEdit: boolean;
  canDelete: boolean;
  onSave: (payload: Row) => Promise<void>;
  onSyncPages: () => Promise<void>;
  onAddPage: () => void;
  onEditPage: (page: Row) => void;
  onDeletePage: (page: Row) => void;
}) {
  const [form, setForm] = useState(data);
  useEffect(() => setForm(data), [data]);
  const contact = form.contact && typeof form.contact === "object" && !Array.isArray(form.contact)
    ? form.contact as Row : {};
  const updateContact = (key: string, nextValue: string) => {
    setForm(current => {
      const currentContact = current.contact && typeof current.contact === "object" && !Array.isArray(current.contact)
        ? current.contact as Row : {};
      return { ...current, contact: { ...currentContact, [key]: nextValue } };
    });
  };
  const fields = [
    ["maxPostsPerPagePerDay", "Tối đa bài/Fanpage/ngày"],
    ["minPagePostIntervalMinutes", "Khoảng cách hai bài (phút)"],
    ["minGroupPostIntervalDays", "Khoảng cách cùng group (ngày)"],
    ["maxDuplicateRatio", "Trùng lặp tối đa (%)"],
    ["consecutiveRejectionsBeforePause", "Từ chối liên tiếp trước khi tạm dừng"],
    ["responseTargetMinutes", "Mục tiêu phản hồi (phút)"],
  ];
  return <div className="space-y-5">
    <div className="fbg-safe-banner flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[.06] p-4 text-sm text-emerald-200">
      <CheckCircle2 className="mt-0.5 shrink-0" size={17} />
      <div><b className="block text-emerald-200">Chế độ vận hành an toàn đang bật</b><span className="mt-0.5 block text-xs text-emerald-200/65">Không tự động đăng và không lưu mật khẩu, cookie hoặc token Facebook.</span></div>
    </div>
    <div className="fbg-settings-card rounded-2xl border border-white/8 bg-white/[.03] p-5">
      <div className="mb-4">
        <h3 className="font-bold">Liên hệ dùng trong nội dung Group</h3>
        <p className="mt-1 text-xs text-slate-500">Chỉ tự chèn số điện thoại hoặc link khi nội quy của Group đã được xác minh cho phép.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[
          ["hotline", "Số liên hệ"],
          ["zalo", "Số Zalo"],
          ["zaloUrl", "Link Zalo"],
          ["website", "Website"],
          ["email", "Email"],
        ].map(([key, label]) => <label key={key} className="grid gap-1 text-sm text-slate-300">
          {label}
          <input type={key === "email" ? "email" : key.toLowerCase().includes("url") || key === "website" ? "url" : "text"}
            disabled={!canEdit} value={String(contact[key] || "")}
            onChange={event => updateContact(key, event.target.value)}
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5" />
        </label>)}
      </div>
      {canEdit && <button onClick={() => void onSave(form)} className="fbg-primary-button mt-5 rounded-xl bg-amber-400 px-5 py-2.5 font-black text-black">Lưu thông tin liên hệ</button>}
    </div>
    <div className="fbg-settings-card rounded-2xl border border-white/8 bg-white/[.03] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-bold">Fanpage đang vận hành</h3>
          <p className="mt-1 text-xs text-slate-500">Dùng chung kết nối thật từ Content Marketing/Facebook Inbox.</p>
        </div>
        {canEdit && <div className="flex gap-2">
          <button onClick={() => void onSyncPages()} className="fbg-ai-button rounded-xl border border-blue-400/30 bg-blue-400/10 px-3 py-2 text-xs font-black text-blue-200">
            Đồng bộ từ Content Marketing
          </button>
          <button onClick={onAddPage} className="fbg-primary-button rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-black">Thêm thủ công</button>
        </div>}
      </div>
      <div className="grid gap-3 md:grid-cols-2">{pages.map(page => <div key={String(page.id)} className="fbg-page-card flex items-center justify-between gap-3 rounded-xl border border-white/8 p-3.5">
        <div className="min-w-0"><b className="block truncate text-[13px] text-[#f5edd6]">{String(page.name)}</b><p className="mt-1 text-xs text-slate-500">{String(page.facebookPageId || "Chưa nhập Page ID")}</p></div>
        <div className="flex shrink-0 gap-2">
          {canEdit && <button type="button" onClick={() => onEditPage(page)} title="Sửa Fanpage" aria-label={`Sửa ${String(page.name)}`}
            className="fbg-secondary-button inline-flex h-9 w-9 items-center justify-center rounded-xl border"><Pencil size={15} /></button>}
          {canDelete && <button type="button" onClick={() => onDeletePage(page)} title="Xóa Fanpage" aria-label={`Xóa ${String(page.name)}`}
            className="fbg-delete-button inline-flex h-9 w-9 items-center justify-center rounded-xl border"><Trash2 size={15} /></button>}
        </div>
      </div>)}</div>
    </div>
    <div className="fbg-settings-card rounded-2xl border border-white/8 bg-white/[.03] p-5">
      <h3 className="mb-4 font-bold">Giới hạn vận hành</h3>
      <div className="grid gap-4 md:grid-cols-2">{fields.map(([key, label]) => <label key={key} className="grid gap-1 text-sm text-slate-300">{label}<input type="number" disabled={!canEdit} value={Number(form[key] || 0)} onChange={event => setForm(current => ({ ...current, [key]: Number(event.target.value) }))} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5" /></label>)}</div>
      {canEdit && <button onClick={() => void onSave(form)} className="fbg-primary-button mt-5 rounded-xl bg-amber-400 px-5 py-2.5 font-black text-black">Lưu cấu hình</button>}
    </div>
  </div>;
}
