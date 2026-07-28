"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle, BarChart3, CalendarDays, CheckCircle2, ClipboardCopy, ExternalLink,
  Facebook, FileText, Loader2, MessageSquare, Plus, RefreshCw, Users,
} from "lucide-react";

type Row = Record<string, unknown>;
type Permissions = {
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
  tasks: "nhiệm vụ", posts: "bài đăng", comments: "bình luận",
};

const statusLabel: Record<string, string> = {
  active: "Hoạt động", paused: "Tạm dừng", needs_review: "Cần kiểm tra",
  joined: "Đã tham gia", not_joined: "Chưa tham gia", pending: "Chờ duyệt",
  requested: "Đã gửi yêu cầu", draft: "Bản nháp", pending_approval: "Chờ duyệt",
  approved: "Đã duyệt", scheduled: "Đã xếp lịch", due: "Đến hạn", posted: "Đã đăng",
  pending_moderation: "Chờ group duyệt", rejected: "Bị từ chối", tracking: "Đang theo dõi",
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
  const good = ["active", "approved", "posted", "joined"].includes(key);
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
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 p-3 md:items-center" onMouseDown={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-amber-300/15 bg-[#12151d] p-5 shadow-2xl"
        onMouseDown={event => event.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-black text-white">{title}</h2>
          <button onClick={onClose} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">Đóng</button>
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
    <label className="grid gap-1.5 text-sm text-slate-300">
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const resource = section === "calendar" ? "tasks"
    : section === "overview" || section === "reports" || section === "settings" ? section
      : section;

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      if (section === "overview" || section === "reports") {
        setDashboard(await api("dashboard"));
      } else if (section === "settings") {
        const [settingsResult, pages] = await Promise.all([api("settings"), api("pages")]);
        setSettingsData(settingsResult);
        setRows(pages);
      } else if (section === "comments") {
        const [comments, checks] = await Promise.all([
          api(`comments?limit=50&offset=${page * 50}`),
          api("checks?status=pending&limit=50"),
        ]);
        setRows(comments); setCheckRows(checks);
      } else {
        const params = new URLSearchParams({ limit: "50", offset: String(page * 50) });
        if (section === "groups" && search) params.set("search", search);
        const query = `?${params.toString()}`;
        setRows(await api(`${resource}${query}`));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, [page, resource, search, section]);

  useEffect(() => { void load(); }, [load]);

  const submit = async (event: React.FormEvent<HTMLFormElement>, endpoint = resource) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload: Row = {};
    form.forEach((item, key) => {
      if (item === "") return;
      payload[key] = ["memberCount", "maxPostsPerDay", "minPostIntervalMinutes"].includes(key)
        ? Number(item) : item;
    });
    try {
      await api(endpoint, { method: "POST", body: JSON.stringify(payload) });
      setNotice("Đã lưu thành công."); setModal(null); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Không thể lưu."); }
  };

  const action = async (endpoint: string, body: Row = {}) => {
    try {
      await api(endpoint, { method: "POST", body: JSON.stringify(body) });
      setNotice("Đã cập nhật thành công."); setModal(null); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Không thể cập nhật."); }
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

  const canCreate = section === "groups" ? permissions.manage
    : section === "campaigns" ? permissions.campaigns
      : section === "content" ? permissions.content
        : ["calendar", "tasks"].includes(section) ? permissions.schedule
          : section === "comments" ? permissions.publish : false;

  const title = sections.find(item => item[0] === section)?.[1] || "Facebook Group Marketing";

  return (
    <div className="min-h-full bg-[#0d0f14] px-4 py-5 text-slate-100 md:px-7 md:py-7">
      <header className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-amber-300">
            <Facebook size={15} /> Facebook Group Marketing
          </div>
          <h1 className="text-2xl font-black text-white">{title}</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            Quy trình đăng thủ công an toàn: CRM chuẩn bị và theo dõi, nhân viên trực tiếp đăng bằng Fanpage.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
            <RefreshCw size={15} /> Làm mới
          </button>
          {section === "groups" && (
            <>
              {permissions.manage && <label className="cursor-pointer rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                Nhập CSV<input type="file" accept=".csv,text/csv" className="hidden" onChange={event => {
                  const file = event.target.files?.[0]; if (file) void importCsv(file);
                }} />
              </label>}
              <a href="/api/crm/facebook-group-marketing/groups/export" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">Xuất CSV</a>
            </>
          )}
          {canCreate && (
            <button onClick={() => setModal("create")} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-black">
              <Plus size={16} /> Thêm {labels[resource]}
            </button>
          )}
        </div>
      </header>

      <nav className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {sections.map(([key, label]) => (
          <Link key={key} href={key === "overview" ? "/crm/facebook-group-marketing" : `/crm/facebook-group-marketing/${key}`}
            className={`whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-bold ${
              section === key ? "border-amber-400/50 bg-amber-400/15 text-amber-200" : "border-white/8 bg-white/[.03] text-slate-400"
            }`}>{label}</Link>
        ))}
      </nav>

      {notice && <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200"><CheckCircle2 size={16} />{notice}</div>}
      {error && <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200"><AlertTriangle size={16} />{error}</div>}

      {loading ? (
        <div className="grid min-h-64 place-items-center"><Loader2 className="animate-spin text-amber-300" /></div>
      ) : section === "overview" || section === "reports" ? (
        <Dashboard data={dashboard || {}} reports={section === "reports"} />
      ) : section === "settings" ? (
        <SettingsView data={settingsData || {}} pages={rows} canEdit={permissions.settings}
          onSave={async payload => { await action("settings", payload); }} onAddPage={() => setModal("page")} />
      ) : (
        <>
          {section === "groups" && (
            <div className="mb-4 flex flex-wrap gap-2">
              <input value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} placeholder="Tìm tên hoặc mã group…"
                className="min-w-64 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none" />
              <button onClick={() => void load()} className="rounded-xl bg-white/10 px-4 text-sm">Lọc</button>
            </div>
          )}
          {section === "comments" && <>
            <h2 className="mb-3 mt-1 font-bold text-white">Hàng chờ cần kiểm tra bình luận</h2>
            <DataTable section="checks" rows={checkRows} permissions={permissions} onAction={action} />
            <h2 className="mb-3 mt-6 font-bold text-white">Bình luận có nhu cầu đã nhập</h2>
          </>}
          <DataTable section={section} rows={rows} permissions={permissions} onAction={action} />
          <div className="mt-4 flex items-center justify-end gap-2">
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
          <CreateForm resource={resource} onSubmit={submit} />
        </Modal>
      )}
      {modal === "page" && (
        <Modal title="Thêm Fanpage" onClose={() => setModal(null)}>
          <CreateForm resource="pages" onSubmit={(event) => submit(event, "pages")} />
        </Modal>
      )}
    </div>
  );
}

function Dashboard({ data, reports }: { data: Row; reports: boolean }) {
  const metrics = (data.metrics || {}) as Row;
  const daily = (data.daily || []) as Row[];
  const funnel = (data.funnel || []) as Row[];
  const topLeads = (data.topGroupsByLeads || []) as Row[];
  const topRevenue = (data.topGroupsByRevenue || []) as Row[];
  const cards = [
    ["Group đã lưu", metrics.groups, Users], ["Group cho phép Fanpage", metrics.groupsAllowPages, Facebook],
    ["Fanpage đã tham gia", metrics.groupsJoined, CheckCircle2], ["Nhiệm vụ hôm nay", metrics.tasksToday, CalendarDays],
    ["Nhiệm vụ quá hạn", metrics.overdue, AlertTriangle], ["Cần kiểm tra bình luận", metrics.checksDue, MessageSquare],
    ["Khách hôm nay", metrics.leadsToday, Users], ["Đơn hàng", metrics.orders, FileText],
  ] as const;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(([label, amount, Icon]) => (
          <div key={label} className="rounded-2xl border border-white/8 bg-white/[.035] p-4">
            <div className="flex items-center justify-between text-slate-400"><span className="text-xs">{label}</span><Icon size={17} /></div>
            <div className="mt-3 text-2xl font-black text-white">{Number(amount || 0).toLocaleString("vi-VN")}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-white/8 bg-white/[.035] p-5 xl:col-span-2">
          <h3 className="mb-4 font-bold">Bài đăng, khách hàng và doanh thu theo ngày</h3>
          <div className="flex h-52 items-end gap-1 overflow-x-auto">
            {daily.map(row => {
              const height = Math.max(6, Number(row.posts || 0) * 18);
              return <div key={String(row.date)} className="group flex min-w-7 flex-1 flex-col items-center gap-1" title={`${row.date}: ${row.posts} bài, ${row.leads} khách`}>
                <span className="text-[9px] text-slate-500">{Number(row.posts || 0)}</span>
                <div className="w-full rounded-t bg-gradient-to-t from-blue-600 to-cyan-300" style={{ height }} />
                <span className="rotate-[-45deg] text-[8px] text-slate-500">{String(row.date).slice(5)}</span>
              </div>;
            })}
          </div>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[.035] p-5">
          <h3 className="mb-4 font-bold">Phễu chuyển đổi</h3>
          <div className="space-y-2">
            {funnel.map((row, index) => (
              <div key={String(row.label)} className="rounded-lg bg-blue-500/10 px-3 py-2" style={{ marginInline: `${index * 5}px` }}>
                <div className="flex justify-between text-xs"><span>{String(row.label)}</span><b>{Number(row.value || 0)}</b></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Ranking title="Top group tạo khách hàng" rows={topLeads} format={String} />
        <Ranking title="Top group theo doanh thu" rows={topRevenue} format={money} />
      </div>
      <div className="rounded-2xl border border-amber-400/15 bg-amber-400/[.06] p-5">
        <div className="flex items-center gap-2 font-bold text-amber-200"><BarChart3 size={18} /> Tổng doanh thu quy nguồn</div>
        <div className="mt-2 text-3xl font-black">{money(metrics.revenue)}</div>
        {reports && <p className="mt-2 text-sm text-slate-400">Doanh thu được khử trùng theo revenue event key trước khi cộng vào group và chiến dịch.</p>}
      </div>
    </div>
  );
}

function Ranking({ title, rows, format }: { title: string; rows: Row[]; format: (input: unknown) => string }) {
  return <div className="rounded-2xl border border-white/8 bg-white/[.035] p-5">
    <h3 className="mb-3 font-bold">{title}</h3>
    <div className="space-y-2">{rows.length ? rows.map((row, index) => (
      <div key={String(row.id)} className="flex items-center justify-between rounded-lg bg-white/[.035] px-3 py-2 text-sm">
        <span className="truncate"><b className="mr-2 text-amber-300">#{index + 1}</b>{String(row.name)}</span>
        <b>{format(row.value)}</b>
      </div>
    )) : <p className="text-sm text-slate-500">Chưa có dữ liệu.</p>}</div>
  </div>;
}

function DataTable({ section, rows, permissions, onAction }: {
  section: string; rows: Row[]; permissions: Permissions;
  onAction: (endpoint: string, body?: Row) => Promise<void>;
}) {
  if (!rows.length) return <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-white/10 text-sm text-slate-500">Chưa có dữ liệu.</div>;
  const columns: Record<string, Array<[string, string]>> = {
    groups: [["name", "Group"], ["region", "Khu vực"], ["topic", "Chủ đề"], ["membership_status", "Tham gia"], ["grade", "Hạng"], ["quality_score", "Điểm"], ["status", "Trạng thái"]],
    campaigns: [["name", "Chiến dịch"], ["code", "Mã"], ["pageName", "Fanpage"], ["groupCount", "Group"], ["start_date", "Bắt đầu"], ["end_date", "Kết thúc"], ["status", "Trạng thái"]],
    content: [["opening", "Mở đầu"], ["groupName", "Group"], ["source_code", "Mã nguồn"], ["duplicate_ratio", "Trùng lặp"], ["status", "Trạng thái"]],
    calendar: [["scheduled_at", "Thời gian"], ["groupName", "Group"], ["pageName", "Fanpage"], ["campaignName", "Chiến dịch"], ["assigned_staff_id", "Nhân viên"], ["status", "Trạng thái"]],
    tasks: [["scheduled_at", "Giờ đăng"], ["groupName", "Group"], ["sourceCode", "Mã nguồn"], ["assigned_staff_id", "Nhân viên"], ["status", "Trạng thái"]],
    posts: [["actual_posted_at", "Đã đăng"], ["groupName", "Group"], ["source_code", "Mã nguồn"], ["moderation_status", "Kiểm duyệt"], ["status", "Theo dõi"]],
    comments: [["commented_at", "Thời gian"], ["groupName", "Group"], ["facebook_name", "Facebook"], ["content", "Bình luận"], ["intent", "Nhu cầu"], ["temperature", "Mức độ"]],
    checks: [["due_at", "Hạn kiểm tra"], ["groupName", "Group"], ["actualPostedAt", "Đã đăng"], ["check_type", "Mốc"], ["status", "Trạng thái"]],
  };
  const selected = columns[section] || columns.tasks;
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/8 bg-white/[.025]">
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
              <div className="flex gap-2">
                {section === "groups" && Boolean(row.group_url) && <a target="_blank" rel="noreferrer" href={String(row.group_url)} title="Mở group"><ExternalLink size={17} /></a>}
                {section === "groups" && permissions.manage && <button onClick={() => void onAction(`groups/${row.id}/recalculate-score`)} title="Tính lại điểm"><RefreshCw size={17} /></button>}
                {section === "groups" && permissions.manage && <button onClick={() => {
                  const rawText = window.prompt("Dán nội quy do nhân viên đọc từ group:", String(row.ruleText || ""));
                  if (rawText === null) return;
                  void onAction(`groups/${row.id}/rules`, { rawText }).then(() => onAction(`groups/${row.id}/analyze-rules`));
                }} title="Cập nhật và phân tích nội quy"><FileText size={17} /></button>}
                {section === "content" && permissions.approve && row.status !== "approved" && <button onClick={() => void onAction(`content/${row.id}/approve`)} title="Duyệt"><CheckCircle2 size={17} /></button>}
                {section === "tasks" && <button onClick={() => navigator.clipboard.writeText(`${value(row, "opening")}\n\n${value(row, "body")}\n\n${value(row, "cta")}`)} title="Sao chép nội dung"><ClipboardCopy size={17} /></button>}
                {section === "tasks" && Boolean(row.groupUrl) && <a target="_blank" rel="noreferrer" href={String(row.groupUrl)} title="Mở group"><ExternalLink size={17} /></a>}
                {section === "tasks" && permissions.publish && !["posted", "approved"].includes(String(row.status)) && <MarkPosted task={row} onAction={onAction} />}
                {section === "posts" && Boolean(row.post_url) && <a target="_blank" rel="noreferrer" href={String(row.post_url)}><ExternalLink size={17} /></a>}
                {section === "checks" && Boolean(row.postUrl) && <a target="_blank" rel="noreferrer" href={String(row.postUrl)}><ExternalLink size={17} /></a>}
                {section === "checks" && permissions.publish && <button onClick={() => {
                  const commentCount = window.prompt("Tổng số bình luận hiện tại:", "0");
                  if (commentCount === null) return;
                  const reactionCount = window.prompt("Tổng số lượt phản ứng hiện tại:", "0");
                  if (reactionCount === null) return;
                  void onAction(`checks/${row.id}/complete`, { commentCount: Number(commentCount), reactionCount: Number(reactionCount) });
                }} title="Hoàn thành kiểm tra"><CheckCircle2 size={17} className="text-emerald-300" /></button>}
                {section === "comments" && permissions.sales && Boolean(row.sourceCode) && <button onClick={() => {
                  const leadId = window.prompt("Nhập ID khách hàng CRM cần gắn nguồn:");
                  if (!leadId) return;
                  void onAction("leads/link", {
                    leadId, sourceCode: row.sourceCode, firstMessengerAt: new Date().toISOString(),
                  });
                }} title="Gắn khách hàng CRM"><Users size={17} className="text-blue-300" /></button>}
              </div>
            </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function MarkPosted({ task, onAction }: { task: Row; onAction: (endpoint: string, body?: Row) => Promise<void> }) {
  const handle = () => {
    const postUrl = window.prompt("Dán đường dẫn bài đăng Facebook:");
    if (!postUrl) return;
    const pending = window.confirm("Bài đang chờ quản trị viên group duyệt?");
    void onAction(`tasks/${task.id}/mark-posted`, {
      postUrl, actualPostedAt: new Date().toISOString(), moderationStatus: pending ? "pending" : "approved",
    });
  };
  return <button onClick={handle} title="Đánh dấu đã đăng"><CheckCircle2 size={17} className="text-emerald-300" /></button>;
}

function CreateForm({ resource, onSubmit }: { resource: string; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
    {resource === "groups" && <>
      <Field label="Tên group" name="name" required /><Field label="Mã group" name="code" />
      <div className="md:col-span-2"><Field label="Link group" name="groupUrl" type="url" required /></div>
      <Field label="Khu vực" name="region" /><Field label="Chủ đề" name="topic" />
      <Field label="Số thành viên" name="memberCount" type="number" />
      <Field label="Fanpage tham gia" name="membershipStatus"><select name="membershipStatus" className="rounded-xl border border-white/10 bg-[#161a23] px-3 py-2.5"><option value="not_joined">Chưa tham gia</option><option value="requested">Đã gửi yêu cầu</option><option value="pending">Chờ duyệt</option><option value="joined">Đã tham gia</option></select></Field>
      <Field label="Cho phép Fanpage" name="allowsPages"><select name="allowsPages" className="rounded-xl border border-white/10 bg-[#161a23] px-3 py-2.5"><option value="unknown">Chưa kiểm tra</option><option value="yes">Có</option><option value="no">Không</option></select></Field>
      <Field label="Cho phép bán hàng" name="allowsSales"><select name="allowsSales" className="rounded-xl border border-white/10 bg-[#161a23] px-3 py-2.5"><option value="unknown">Chưa kiểm tra</option><option value="yes">Có</option><option value="no">Không</option><option value="limited">Hạn chế</option></select></Field>
      <div className="md:col-span-2"><Field label="Nội quy do nhân viên nhập" name="ruleText"><textarea name="ruleText" rows={5} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5" /></Field></div>
    </>}
    {resource === "pages" && <>
      <Field label="Tên Fanpage" name="name" required /><Field label="Facebook Page ID" name="facebookPageId" />
      <Field label="Đường dẫn Fanpage" name="pageUrl" type="url" /><Field label="Thương hiệu" name="brand" />
      <Field label="Tối đa bài/ngày" name="maxPostsPerDay" type="number" /><Field label="Khoảng cách tối thiểu (phút)" name="minPostIntervalMinutes" type="number" />
    </>}
    {resource === "campaigns" && <>
      <Field label="Tên chiến dịch" name="name" required /><Field label="Mã chiến dịch" name="code" />
      <Field label="Fanpage ID" name="pageId" /><Field label="Người phụ trách ID" name="ownerId" />
      <Field label="Ngày bắt đầu" name="startDate" type="date" /><Field label="Ngày kết thúc" name="endDate" type="date" />
    </>}
    {resource === "content" && <>
      <Field label="Group ID" name="groupId" /><Field label="Chiến dịch ID" name="campaignId" />
      <Field label="Sản phẩm ID" name="productId" /><Field label="Mã sản phẩm" name="productCode" />
      <div className="md:col-span-2"><Field label="Câu mở đầu" name="opening"><textarea name="opening" rows={2} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5" /></Field></div>
      <div className="md:col-span-2"><Field label="Nội dung chính" name="body" required><textarea name="body" required rows={7} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5" /></Field></div>
      <div className="md:col-span-2"><Field label="CTA Messenger" name="cta"><textarea name="cta" rows={2} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5" /></Field></div>
    </>}
    {resource === "tasks" && <>
      <Field label="Fanpage ID" name="pageId" required /><Field label="Group ID" name="groupId" required />
      <Field label="Nội dung ID" name="contentId" required /><Field label="Chiến dịch ID" name="campaignId" />
      <Field label="Nhân viên phụ trách ID" name="assignedStaffId" /><Field label="Giờ đăng" name="scheduledAt" type="datetime-local" required />
    </>}
    {resource === "comments" && <>
      <Field label="Bài đăng ID" name="postId" required /><Field label="Tên Facebook" name="facebookName" required />
      <div className="md:col-span-2"><Field label="Nội dung bình luận" name="content" required><textarea name="content" required rows={4} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5" /></Field></div>
      <Field label="Số điện thoại công khai" name="phone" /><Field label="Thời gian bình luận" name="commentedAt" type="datetime-local" />
      <Field label="Nhu cầu" name="intent"><select name="intent" className="rounded-xl border border-white/10 bg-[#161a23] px-3 py-2.5"><option value="price">Hỏi giá</option><option value="size">Hỏi kích thước</option><option value="delivery">Hỏi giao hàng</option><option value="showroom">Hỏi showroom</option><option value="dealer">Muốn làm đại lý</option><option value="other">Khác</option></select></Field>
      <Field label="Mức độ" name="temperature"><select name="temperature" className="rounded-xl border border-white/10 bg-[#161a23] px-3 py-2.5"><option value="hot">Nóng</option><option value="warm">Ấm</option><option value="cold">Lạnh</option></select></Field>
    </>}
    <div className="md:col-span-2 flex justify-end"><button className="rounded-xl bg-amber-400 px-5 py-2.5 font-black text-black">Lưu</button></div>
  </form>;
}

function SettingsView({ data, pages, canEdit, onSave, onAddPage }: {
  data: Row; pages: Row[]; canEdit: boolean; onSave: (payload: Row) => Promise<void>; onAddPage: () => void;
}) {
  const [form, setForm] = useState(data);
  useEffect(() => setForm(data), [data]);
  const fields = [
    ["maxPostsPerPagePerDay", "Tối đa bài/Fanpage/ngày"],
    ["minPagePostIntervalMinutes", "Khoảng cách hai bài (phút)"],
    ["minGroupPostIntervalDays", "Khoảng cách cùng group (ngày)"],
    ["maxDuplicateRatio", "Trùng lặp tối đa (%)"],
    ["consecutiveRejectionsBeforePause", "Từ chối liên tiếp trước khi tạm dừng"],
    ["responseTargetMinutes", "Mục tiêu phản hồi (phút)"],
  ];
  return <div className="space-y-5">
    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[.06] p-4 text-sm text-emerald-200">
      Chế độ an toàn đang bật: không tự động đăng, không lưu mật khẩu/cookie/token Facebook.
    </div>
    <div className="rounded-2xl border border-white/8 bg-white/[.03] p-5">
      <div className="mb-4 flex items-center justify-between"><h3 className="font-bold">Fanpage</h3>{canEdit && <button onClick={onAddPage} className="rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-black">Thêm Fanpage</button>}</div>
      <div className="grid gap-3 md:grid-cols-2">{pages.map(page => <div key={String(page.id)} className="rounded-xl border border-white/8 p-3"><b>{String(page.name)}</b><p className="mt-1 text-xs text-slate-500">{String(page.facebookPageId || "Chưa nhập Page ID")}</p></div>)}</div>
    </div>
    <div className="rounded-2xl border border-white/8 bg-white/[.03] p-5">
      <h3 className="mb-4 font-bold">Giới hạn vận hành</h3>
      <div className="grid gap-4 md:grid-cols-2">{fields.map(([key, label]) => <label key={key} className="grid gap-1 text-sm text-slate-300">{label}<input type="number" disabled={!canEdit} value={Number(form[key] || 0)} onChange={event => setForm(current => ({ ...current, [key]: Number(event.target.value) }))} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5" /></label>)}</div>
      {canEdit && <button onClick={() => void onSave(form)} className="mt-5 rounded-xl bg-amber-400 px-5 py-2.5 font-black text-black">Lưu cấu hình</button>}
    </div>
  </div>;
}
