"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle, BarChart3, CalendarDays, CheckCircle2, ClipboardCopy, ExternalLink,
  Facebook, FileText, Loader2, MessageSquare, Plus, RefreshCw, Users,
} from "lucide-react";

type Row = Record<string, unknown>;
type FormOptions = {
  pages: Row[]; groups: Row[]; campaigns: Row[]; content: Row[]; posts: Row[];
  staff: Row[]; products: Row[]; leads: Row[];
};
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

const emptyOptions: FormOptions = {
  pages: [], groups: [], campaigns: [], content: [], posts: [], staff: [], products: [], leads: [],
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
  const [formOptions, setFormOptions] = useState<FormOptions>(emptyOptions);
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
        const [comments, checks, options] = await Promise.all([
          api(`comments?limit=50&offset=${page * 50}`),
          api("checks?status=pending&limit=50"),
          api("options"),
        ]);
        setRows(comments); setCheckRows(checks); setFormOptions(options);
      } else {
        const params = new URLSearchParams({ limit: "50", offset: String(page * 50) });
        if (section === "groups" && search) params.set("search", search);
        const query = `?${params.toString()}`;
        const needsOptions = ["campaigns", "content", "calendar", "tasks"].includes(section);
        const [result, options] = await Promise.all([
          api(`${resource}${query}`),
          needsOptions ? api("options") : Promise.resolve(emptyOptions),
        ]);
        setRows(result);
        if (needsOptions) setFormOptions(options);
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
      await api(endpoint, { method: "POST", body: JSON.stringify(payload) });
      setNotice("Đã lưu thành công."); setModal(null); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Không thể lưu."); }
  };

  const action = async (endpoint: string, body: Row = {}, method = "POST") => {
    try {
      await api(endpoint, { method, body: JSON.stringify(body) });
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
          onSave={async payload => { await action("settings", payload); }}
          onSyncPages={async () => {
            const result = await api("pages/sync", { method: "POST", body: "{}" });
            setNotice(`Đã đồng bộ ${result.found} Fanpage: thêm ${result.created}, cập nhật ${result.updated}.`);
            await load();
          }}
          onAddPage={() => setModal("page")} />
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
          <CreateForm resource={resource} options={formOptions} onSubmit={submit} />
        </Modal>
      )}
      {modal === "page" && (
        <Modal title="Thêm Fanpage" onClose={() => setModal(null)}>
          <CreateForm resource="pages" options={formOptions} onSubmit={(event) => submit(event, "pages")} />
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
  onAction: (endpoint: string, body?: Row, method?: string) => Promise<void>;
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
              </div>
            </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
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
      <form className="grid gap-4 md:grid-cols-2" onSubmit={handle}>
        <Field label="Tổng số bình luận hiện tại" name="commentCount" type="number" required />
        <Field label="Tổng số lượt phản ứng hiện tại" name="reactionCount" type="number" required />
        <div className="md:col-span-2 flex justify-end">
          <button className="rounded-xl bg-amber-400 px-5 py-2.5 font-black text-black">Xác nhận hoàn thành</button>
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
      <form className="grid gap-4" onSubmit={handle}>
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
          <button className="rounded-xl bg-amber-400 px-5 py-2.5 font-black text-black">Xác nhận đã đăng</button>
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
  const selectClass = "rounded-xl border border-white/10 bg-[#161a23] px-3 py-2.5 text-white";
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
  return <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
    {resource === "groups" && <>
      <Field label="Tên group" name="name" required /><Field label="Mã group" name="code" />
      <div className="md:col-span-2"><Field label="Link group" name="groupUrl" type="url" required /></div>
      <Field label="Khu vực" name="region" /><Field label="Chủ đề" name="topic" />
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
        <div className="grid max-h-40 gap-2 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-3 md:grid-cols-2">
          {options.products.map(product => <label key={String(product.id)} className="flex items-start gap-2 text-sm text-slate-200">
            <input type="checkbox" name="productIds" value={String(product.id)} className="mt-1" />
            <span>{String(product.name)} <small className="text-slate-500">({String(product.sku || "")})</small></span>
          </label>)}
          {!options.products.length && <span className="text-sm text-slate-500">Chưa có sản phẩm CRM.</span>}
        </div>
      </div>
      <div className="md:col-span-2">
        <span className="mb-2 block text-sm text-slate-300">Group mục tiêu</span>
        <div className="grid max-h-40 gap-2 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-3 md:grid-cols-2">
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
          className="inline-flex items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-400/10 px-4 py-2.5 text-sm font-bold text-blue-200 disabled:opacity-50">
          {aiBusy ? <Loader2 size={15} className="animate-spin" /> : <MessageSquare size={15} />}
          {aiBusy ? "AI đang đọc nội quy và sản phẩm…" : "AI gợi ý theo nội quy thật"}
        </button>
        {aiError && <p className="mt-2 text-xs text-red-300">{aiError}</p>}
      </div>
      <div className="md:col-span-2"><Field label="Câu mở đầu" name="opening"><textarea name="opening" rows={2} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5" /></Field></div>
      <div className="md:col-span-2"><Field label="Nội dung chính" name="body" required><textarea name="body" required rows={7} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5" /></Field></div>
      <div className="md:col-span-2"><Field label="CTA Messenger" name="cta"><textarea name="cta" rows={2} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5" /></Field></div>
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
    <div className="md:col-span-2 flex justify-end"><button className="rounded-xl bg-amber-400 px-5 py-2.5 font-black text-black">Lưu</button></div>
  </form>;
}

function SettingsView({ data, pages, canEdit, onSave, onSyncPages, onAddPage }: {
  data: Row;
  pages: Row[];
  canEdit: boolean;
  onSave: (payload: Row) => Promise<void>;
  onSyncPages: () => Promise<void>;
  onAddPage: () => void;
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-bold">Fanpage đang vận hành</h3>
          <p className="mt-1 text-xs text-slate-500">Dùng chung kết nối thật từ Content Marketing/Facebook Inbox.</p>
        </div>
        {canEdit && <div className="flex gap-2">
          <button onClick={() => void onSyncPages()} className="rounded-xl border border-blue-400/30 bg-blue-400/10 px-3 py-2 text-xs font-black text-blue-200">
            Đồng bộ từ Content Marketing
          </button>
          <button onClick={onAddPage} className="rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-black">Thêm thủ công</button>
        </div>}
      </div>
      <div className="grid gap-3 md:grid-cols-2">{pages.map(page => <div key={String(page.id)} className="rounded-xl border border-white/8 p-3"><b>{String(page.name)}</b><p className="mt-1 text-xs text-slate-500">{String(page.facebookPageId || "Chưa nhập Page ID")}</p></div>)}</div>
    </div>
    <div className="rounded-2xl border border-white/8 bg-white/[.03] p-5">
      <h3 className="mb-4 font-bold">Giới hạn vận hành</h3>
      <div className="grid gap-4 md:grid-cols-2">{fields.map(([key, label]) => <label key={key} className="grid gap-1 text-sm text-slate-300">{label}<input type="number" disabled={!canEdit} value={Number(form[key] || 0)} onChange={event => setForm(current => ({ ...current, [key]: Number(event.target.value) }))} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5" /></label>)}</div>
      {canEdit && <button onClick={() => void onSave(form)} className="mt-5 rounded-xl bg-amber-400 px-5 py-2.5 font-black text-black">Lưu cấu hình</button>}
    </div>
  </div>;
}
