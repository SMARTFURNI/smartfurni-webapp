"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3, Bot, BrainCircuit, Check, ChevronRight, Clock3, Database, FileSearch, LoaderCircle,
  Mail, MessagesSquare, Play, Plus, RefreshCw, Search, Send, ShieldCheck, Sparkles, Tag, UserRound, X, Zap,
} from "lucide-react";
import type { AiChatThread, AiCommandMode, AiCommandSnapshot } from "@/lib/ai-command/types";

type AccessInfo = { canApprove: boolean; actor: { id: string; name: string; kind: "admin" | "staff" } };

const suggestions = [
  "Phân tích sâu tình hình bán hàng hôm nay và đề xuất 5 việc ưu tiên",
  "Đối chiếu Zalo OA và Fanpage, tìm khách đang có khả năng chốt cao",
  "Lập kế hoạch nội dung Facebook Group cho 7 ngày tới từ dữ liệu hiện có",
  "Rà soát Email Marketing và đề xuất chiến dịch chăm sóc phù hợp",
];

const modeOptions: Array<{ id: AiCommandMode; label: string; description: string; icon: typeof Zap }> = [
  { id: "quick", label: "Nhanh", description: "Tra cứu tức thời", icon: Zap },
  { id: "deep", label: "Phân tích sâu", description: "Đối chiếu nhiều nguồn", icon: BrainCircuit },
  { id: "execute", label: "Thực thi", description: "Chuẩn bị hành động", icon: Play },
];

const toolLabels: Record<string, string> = {
  search_customers: "Hồ sơ khách hàng CRM", get_crm_summary: "Pipeline CRM", get_orders_snapshot: "Đơn hàng & doanh thu",
  get_customer_care_snapshot: "Zalo OA & Fanpage", search_zalo_customers: "Khách hàng Zalo OA",
  get_marketing_snapshot: "Email & Group Growth", search_business_knowledge: "Kho tri thức SmartFurni",
  get_admin_snapshot: "Vận hành Admin", list_specialist_agents: "Danh sách AI Agent",
  create_follow_up_task: "Tạo việc chăm sóc", add_customer_tags: "Gắn tag khách hàng", send_zalo_consultation: "Gửi Zalo OA",
};

function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index} className="font-bold text-inherit">{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index} className="rounded bg-[#e9eef6] px-1.5 py-0.5 text-[.9em] text-[#40506a]">{part.slice(1, -1)}</code>;
    return <span key={index}>{part}</span>;
  });
}

function MarkdownMessage({ content }: { content: string }) {
  const lines = content.split("\n");
  return <div className="space-y-2.5">{lines.map((raw, index) => {
    const line = raw.trimEnd();
    if (!line.trim()) return <div key={index} className="h-1" />;
    if (line.startsWith("### ")) return <h4 key={index} className="pt-1 text-sm font-extrabold text-[#1f2a40]">{renderInline(line.slice(4))}</h4>;
    if (line.startsWith("## ")) return <h3 key={index} className="pt-1 text-base font-black text-[#172033]">{renderInline(line.slice(3))}</h3>;
    if (line.startsWith("# ")) return <h2 key={index} className="pt-1 text-lg font-black text-[#172033]">{renderInline(line.slice(2))}</h2>;
    if (/^[-*] /.test(line)) return <div key={index} className="flex gap-2 pl-1"><span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c99a28]" /><div>{renderInline(line.slice(2))}</div></div>;
    if (/^\d+\. /.test(line)) { const match = line.match(/^(\d+)\. (.*)$/)!; return <div key={index} className="flex gap-2 pl-1"><span className="min-w-5 font-bold text-[#a87813]">{match[1]}.</span><div>{renderInline(match[2])}</div></div>; }
    if (line.startsWith("> ")) return <blockquote key={index} className="border-l-2 border-[#d5af47] bg-[#fff9e9] px-3 py-2 text-[#5f512e]">{renderInline(line.slice(2))}</blockquote>;
    return <p key={index}>{renderInline(line)}</p>;
  })}</div>;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) }, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Yêu cầu không thực hiện được.");
  return data as T;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }).format(new Date(value));
}

function approvalArgumentLabel(key: string) {
  return ({ leadId: "Khách hàng", title: "Nội dung", dueDate: "Hạn xử lý", priority: "Ưu tiên", tags: "Tag" } as Record<string, string>)[key] || key;
}

export default function AiCommandClient({ surface, initialAccess }: { surface: "crm" | "admin"; initialAccess: AccessInfo }) {
  const [threads, setThreads] = useState<AiChatThread[]>([]);
  const [snapshot, setSnapshot] = useState<AiCommandSnapshot | null>(null);
  const [access, setAccess] = useState(initialAccess);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deciding, setDeciding] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<AiCommandMode>("deep");
  const [pendingContent, setPendingContent] = useState("");
  const [progressStep, setProgressStep] = useState(0);
  const messagesEnd = useRef<HTMLDivElement>(null);

  async function loadThreads(selectFirst = true) {
    const data = await api<{ threads: AiChatThread[]; access: AccessInfo }>("/api/ai-command/threads");
    setThreads(data.threads);
    setAccess(data.access);
    if (selectFirst && !snapshot && data.threads[0]) {
      await loadThread(data.threads[0].id);
      return;
    }
    setLoading(false);
  }

  async function loadThread(threadId: string) {
    setLoading(true);
    try {
      const data = await api<{ snapshot: AiCommandSnapshot; access: AccessInfo }>(`/api/ai-command/threads?threadId=${encodeURIComponent(threadId)}`);
      setSnapshot(data.snapshot);
      setAccess(data.access);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải cuộc hội thoại.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadThreads().catch(err => { setError(err.message); setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [snapshot?.messages.length, sending]);

  useEffect(() => {
    if (!sending) { setProgressStep(0); return; }
    const timer = window.setInterval(() => setProgressStep(step => Math.min(step + 1, 3)), 1800);
    return () => window.clearInterval(timer);
  }, [sending]);

  const activeRun = snapshot?.runs.find(run => run.status === "running" || run.status === "awaiting_approval");
  const pendingApprovals = useMemo(() => snapshot?.approvals.filter(item => item.status === "pending") || [], [snapshot]);

  async function sendMessage(message = draft) {
    const content = message.trim();
    if (!content || sending) return;
    setSending(true);
    setPendingContent(content);
    setDraft("");
    setError("");
    try {
      const data = await api<{ snapshot: AiCommandSnapshot; access: AccessInfo }>("/api/ai-command/chat", {
        method: "POST",
        body: JSON.stringify({ threadId: snapshot?.thread.id, message: content, surface, mode }),
      });
      setSnapshot(data.snapshot);
      setAccess(data.access);
      await loadThreads(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể gửi yêu cầu.");
      setDraft(content);
    } finally {
      setSending(false);
      setPendingContent("");
    }
  }

  async function decide(approvalId: string, decision: "approve" | "reject") {
    if (deciding) return;
    setDeciding(approvalId);
    setError("");
    try {
      const data = await api<{ snapshot: AiCommandSnapshot; access: AccessInfo }>(`/api/ai-command/approvals/${approvalId}`, {
        method: "POST", body: JSON.stringify({ decision }),
      });
      setSnapshot(data.snapshot);
      setAccess(data.access);
      await loadThreads(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xử lý phê duyệt.");
    } finally {
      setDeciding(null);
    }
  }

  function newChat() {
    setSnapshot(null);
    setDraft("");
    setError("");
  }

  return (
    <div className="min-h-screen p-3 text-[#172033] sm:p-5 lg:p-7" style={{ background: "radial-gradient(circle at 8% 0%,rgba(107,139,214,.17),transparent 28rem),radial-gradient(circle at 92% 4%,rgba(231,190,70,.20),transparent 30rem),linear-gradient(145deg,#eef3fb,#fbf8ee 58%,#f5efe0)" }}>
      <section className="mx-auto max-w-[1680px] overflow-hidden rounded-[26px] border border-[#d5bd70]/45 bg-white/90 shadow-[0_24px_70px_rgba(48,58,85,.14)] backdrop-blur-xl">
        <header className="flex flex-col gap-5 border-b border-[#d9e0ed] px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-7">
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-[#d8b84f]/50 text-[#5a430a] shadow-sm" style={{ background: "linear-gradient(135deg,#fff9dc,#f0ce68 55%,#d29d25)" }}>
              <Sparkles size={25} />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[.22em] text-[#a87913]">SmartFurni AI Command Center</div>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-[#172033] sm:text-[30px]">Trợ lý Điều hành AI</h1>
              <p className="mt-1 max-w-3xl text-sm text-[#66728a]">Nghiên cứu dữ liệu SmartFurni, điều phối agent chuyên trách và biến yêu cầu thành hành động có kiểm soát.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"><ShieldCheck size={15} /> Chế độ an toàn</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#e2d195] bg-[#fffaf0] px-3 py-2 text-xs font-semibold text-[#73570e]"><UserRound size={15} /> {access.actor.name}</span>
            <button onClick={() => snapshot && void loadThread(snapshot.thread.id)} className="grid h-10 w-10 place-items-center rounded-xl border border-[#d7dfeb] bg-white text-[#5d6a82] transition hover:bg-[#f4f7fb]" title="Làm mới"><RefreshCw size={17} /></button>
          </div>
        </header>

        <div className="grid min-h-[680px] lg:grid-cols-[280px_minmax(0,1fr)_320px]">
          <aside className="border-b border-[#dbe2ed] bg-[#f8fafc] p-4 lg:border-b-0 lg:border-r">
            <button onClick={newChat} className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-[#271d05] shadow-sm transition hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg,#fff0a9,#e8c24e,#c99625)" }}><Plus size={17} /> Cuộc trò chuyện mới</button>
            <div className="relative mt-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a96aa]" size={15} /><input className="w-full rounded-xl border border-[#d9e1ec] bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#d2aa36]" placeholder="Tìm hội thoại..." /></div>
            <div className="mt-4 space-y-2 lg:max-h-[570px] lg:overflow-y-auto">
              {threads.map(thread => {
                const active = snapshot?.thread.id === thread.id;
                return <button key={thread.id} onClick={() => void loadThread(thread.id)} className={`w-full rounded-xl border p-3 text-left transition ${active ? "border-[#d7b957] bg-[#fff9e9] shadow-sm" : "border-transparent hover:border-[#dce3ee] hover:bg-white"}`}>
                  <div className="flex items-start gap-2"><Bot size={16} className={active ? "text-[#b07b0e]" : "text-[#7f8ca2]"} /><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-[#263147]">{thread.title}</div><div className="mt-1 text-[11px] text-[#8a95a8]">{formatTime(thread.updatedAt)}</div></div><ChevronRight size={14} className="mt-0.5 text-[#aab2c0]" /></div>
                </button>;
              })}
              {!loading && threads.length === 0 && <div className="rounded-xl border border-dashed border-[#d6deea] p-5 text-center text-xs text-[#8490a4]">Chưa có hội thoại nào.</div>}
            </div>
          </aside>

          <main className="flex min-h-[680px] min-w-0 flex-col bg-white">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:max-h-[690px]">
              {loading ? <div className="grid h-full min-h-[420px] place-items-center text-[#7d899c]"><LoaderCircle className="animate-spin" /></div> : !snapshot ? (
                <div className="mx-auto flex min-h-[540px] max-w-2xl flex-col items-center justify-center text-center">
                  <div className="grid h-20 w-20 place-items-center rounded-[28px] border border-[#dbc262]/55 shadow-[0_16px_42px_rgba(177,132,24,.16)]" style={{ background: "linear-gradient(145deg,#fffdf3,#f7dfa0)" }}><BrainCircuit size={38} className="text-[#a97915]" /></div>
                  <h2 className="mt-5 text-2xl font-black text-[#1e293b]">Tôi có thể hỗ trợ điều hành gì?</h2>
                  <p className="mt-2 text-sm leading-6 text-[#738096]">Hỏi như đang làm việc với ChatGPT: tôi sẽ tự tra cứu CRM, đối chiếu nhiều nguồn, đưa đề xuất và chuẩn bị hành động để bạn duyệt.</p>
                  <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">{suggestions.map(item => <button key={item} onClick={() => void sendMessage(item)} className="rounded-xl border border-[#dce3ed] bg-[#f9fbfd] p-3 text-left text-sm text-[#40506a] transition hover:border-[#d2b24c] hover:bg-[#fffaf0]">{item}</button>)}</div>
                </div>
              ) : (
                <div className="mx-auto max-w-4xl space-y-5">
                  {snapshot.messages.map(message => <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    {message.role !== "user" && <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#fff3c7] text-[#a47612]"><Bot size={17} /></div>}
                    <div className={`max-w-[84%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${message.role === "user" ? "rounded-br-md bg-[#1d2b43] text-white" : "rounded-bl-md border border-[#e0e6ef] bg-[#f9fbfd] text-[#344159]"}`}>
                      {message.role === "assistant" ? <MarkdownMessage content={message.content} /> : <div className="whitespace-pre-wrap">{message.content}</div>}
                      <div className={`mt-2 flex items-center gap-2 text-[10px] ${message.role === "user" ? "text-white/45" : "text-[#98a2b3]"}`}><span>{formatTime(message.createdAt)}</span>{typeof message.metadata.mode === "string" && <span className="rounded-full border border-current/20 px-1.5 py-0.5">{modeOptions.find(item => item.id === message.metadata.mode)?.label}</span>}</div>
                    </div>
                  </div>)}
                  {pendingContent && <div className="flex justify-end"><div className="max-w-[84%] rounded-2xl rounded-br-md bg-[#1d2b43] px-4 py-3 text-sm leading-6 text-white shadow-sm"><div className="whitespace-pre-wrap">{pendingContent}</div><div className="mt-1 text-[10px] text-white/45">Đang gửi · {modeOptions.find(item => item.id === mode)?.label}</div></div></div>}
                  {pendingApprovals.map(approval => <div key={approval.id} className="ml-11 overflow-hidden rounded-2xl border border-amber-300 bg-gradient-to-br from-[#fffdf4] to-[#fff4cd] shadow-[0_12px_35px_rgba(160,113,13,.12)]">
                    <div className="flex items-start gap-3 border-b border-amber-200/80 p-4"><div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-700"><ShieldCheck size={19} /></div><div><div className="text-xs font-bold uppercase tracking-[.12em] text-amber-700">Chờ phê duyệt</div><h3 className="mt-1 font-bold text-[#3c2c08]">{approval.title}</h3><p className="mt-1 text-xs text-[#796326]">{approval.description}</p></div></div>
                    <div className="grid gap-2 p-4 sm:grid-cols-2">{Object.entries(approval.arguments).map(([key, value]) => <div key={key} className="rounded-xl border border-amber-200/70 bg-white/75 p-3"><div className="text-[10px] font-bold uppercase tracking-wider text-[#9b7c25]">{approvalArgumentLabel(key)}</div><div className="mt-1 break-words text-sm font-semibold text-[#3d4657]">{Array.isArray(value) ? value.join(", ") : String(value)}</div></div>)}</div>
                    <div className="flex flex-wrap justify-end gap-2 border-t border-amber-200/80 p-3"><button onClick={() => void decide(approval.id, "reject")} disabled={!!deciding} className="inline-flex items-center gap-2 rounded-xl border border-[#d9dee8] bg-white px-4 py-2 text-sm font-semibold text-[#596579] disabled:opacity-50"><X size={15} /> Từ chối</button><button onClick={() => void decide(approval.id, "approve")} disabled={!access.canApprove || !!deciding} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#d39f24] to-[#ebc652] px-4 py-2 text-sm font-bold text-[#2c2005] shadow-sm disabled:cursor-not-allowed disabled:opacity-45">{deciding === approval.id ? <LoaderCircle size={15} className="animate-spin" /> : <Check size={15} />} Phê duyệt & thực hiện</button></div>
                  </div>)}
                  {sending && <div className="flex items-start gap-3 text-sm text-[#58667e]"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#fff3c7] text-[#a47612]"><LoaderCircle size={17} className="animate-spin" /></div><div><div className="font-semibold">{["Đang hiểu yêu cầu và lập kế hoạch...", "Đang kết nối dữ liệu SmartFurni...", "Đang đối chiếu kết quả từ các agent...", "Đang hoàn thiện đề xuất và bước thực hiện..."][progressStep]}</div><div className="mt-1 text-xs text-[#939daf]">{mode === "deep" ? "Phân tích sâu có thể cần thêm thời gian để kiểm chứng dữ liệu." : mode === "execute" ? "Các hành động có tác động bên ngoài sẽ dừng ở bước phê duyệt." : "Ưu tiên tốc độ và dữ liệu thiết yếu."}</div></div></div>}
                  <div ref={messagesEnd} />
                </div>
              )}
            </div>
            {error && <div className="mx-4 mb-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 sm:mx-6">{error}</div>}
            <div className="border-t border-[#e0e6ef] bg-[#fbfcfe] p-4 sm:p-5">
              <div className="mx-auto mb-2 flex max-w-4xl flex-wrap gap-2">{modeOptions.map(item => { const Icon = item.icon; const active = mode === item.id; return <button key={item.id} onClick={() => setMode(item.id)} disabled={sending} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition ${active ? "border-[#d4aa34] bg-gradient-to-br from-[#fff8dd] to-[#f7e5a5] text-[#62490d] shadow-sm" : "border-[#dde4ee] bg-white text-[#69768c] hover:border-[#d6bd73]"}`}><Icon size={15} /><span><span className="block text-xs font-bold">{item.label}</span><span className="hidden text-[9px] opacity-70 sm:block">{item.description}</span></span></button>; })}</div>
              <div className="mx-auto flex max-w-4xl items-end gap-2 rounded-2xl border border-[#ced8e6] bg-white p-2 shadow-[0_10px_30px_rgba(38,51,77,.08)] focus-within:border-[#d0a832]">
                <textarea value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }} rows={2} className="max-h-36 min-h-[46px] flex-1 resize-none bg-transparent px-3 py-2 text-sm text-[#253149] outline-none" placeholder="Nhập yêu cầu... Enter để gửi, Shift + Enter để xuống dòng" />
                <button onClick={() => void sendMessage()} disabled={!draft.trim() || sending} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#f1d570] to-[#c8911f] text-[#271b03] shadow-sm disabled:opacity-40"><Send size={18} /></button>
              </div>
              <div className="mx-auto mt-2 flex max-w-4xl items-center gap-2 text-[10px] text-[#8b96a8]"><ShieldCheck size={12} /> Đọc và phân tích tự động; gửi tin hoặc thay đổi dữ liệu chỉ chạy sau khi bạn phê duyệt.</div>
            </div>
          </main>

          <aside className="border-t border-[#dbe2ed] bg-[#f8fafc] p-4 lg:border-l lg:border-t-0">
            <div className="text-[10px] font-bold uppercase tracking-[.18em] text-[#8995a8]">Trạng thái điều phối</div>
            <div className="mt-3 rounded-2xl border border-[#dce3ed] bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3"><div className={`grid h-10 w-10 place-items-center rounded-xl ${activeRun ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{activeRun ? <LoaderCircle size={20} className={activeRun.status === "running" ? "animate-spin" : ""} /> : <ShieldCheck size={20} />}</div><div><div className="text-sm font-bold text-[#2a354b]">{activeRun?.status === "awaiting_approval" ? "Đang chờ duyệt" : activeRun ? "Agent đang xử lý" : "Sẵn sàng"}</div><div className="text-xs text-[#8994a7]">{activeRun ? activeRun.model : "Không có tác vụ đang chạy"}</div></div></div>
            </div>
            <div className="mt-5 text-[10px] font-bold uppercase tracking-[.18em] text-[#8995a8]">Agent chuyên trách</div>
            <div className="mt-3 space-y-2">{[
              [Database, "CRM & Sales", "Khách hàng, pipeline, đơn hàng"],
              [MessagesSquare, "Customer Care", "Zalo OA & Fanpage"],
              [Mail, "Marketing Planner", "Email & Group Growth"],
              [BrainCircuit, "Knowledge", "Sản phẩm & chính sách"],
              [Bot, "Admin Operations", "Nhân sự, agent & audit"],
            ].map(([Icon, name, desc]) => { const Cmp = Icon as typeof Bot; return <div key={String(name)} className="flex items-center gap-3 rounded-xl border border-[#e0e6ee] bg-white p-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#eef3ff] to-[#fff5d6] text-[#6a5a2a]"><Cmp size={17} /></div><div className="min-w-0"><div className="truncate text-sm font-semibold text-[#344057]">{String(name)}</div><div className="text-[11px] text-[#8a95a7]">{String(desc)}</div></div><span className="ml-auto h-2 w-2 rounded-full bg-emerald-500" /></div>; })}</div>
            <div className="mt-5 text-[10px] font-bold uppercase tracking-[.18em] text-[#8995a8]">Nguồn vừa sử dụng</div>
            <div className="mt-3 space-y-2">{(snapshot?.toolCalls || []).slice(0, 6).map(call => <div key={call.id} className="rounded-xl border border-[#e0e6ee] bg-white p-3"><div className="flex items-center gap-2"><FileSearch size={14} className="text-[#a87a16]" /><span className="min-w-0 flex-1 truncate text-xs font-semibold text-[#40506a]">{toolLabels[call.toolName] || call.toolName}</span><span className={`h-2 w-2 rounded-full ${call.status === "completed" ? "bg-emerald-500" : call.status === "failed" ? "bg-red-400" : "bg-amber-400"}`} /></div><div className="mt-1 pl-6 text-[10px] text-[#95a0b1]">{call.status === "failed" ? call.error || "Không đọc được" : `${call.durationMs} ms · ${formatTime(call.createdAt)}`}</div></div>)}{snapshot && snapshot.toolCalls.length === 0 && <div className="rounded-xl border border-dashed border-[#dce3ed] p-3 text-xs text-[#8d98aa]">Chưa dùng nguồn dữ liệu trong cuộc trò chuyện này.</div>}</div>
            <div className="mt-5 rounded-2xl border border-[#e4d49d] bg-gradient-to-br from-[#fffdf4] to-[#fff7df] p-4"><div className="flex items-center gap-2 text-sm font-bold text-[#6f5410]"><Clock3 size={16} /> Quyền tự chủ</div><ul className="mt-3 space-y-2 text-xs leading-5 text-[#776943]"><li className="flex gap-2"><Check size={13} className="mt-1 shrink-0" /> Tự nghiên cứu trong phạm vi quyền</li><li className="flex gap-2"><BarChart3 size={13} className="mt-1 shrink-0" /> Đối chiếu và chủ động đề xuất</li><li className="flex gap-2"><Tag size={13} className="mt-1 shrink-0" /> Hành động bên ngoài cần duyệt</li></ul></div>
          </aside>
        </div>
      </section>
    </div>
  );
}
