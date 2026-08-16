"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, FlaskConical, Loader2,
  Mail, MessageCircle, Play, Search, Send, ShieldCheck, UserRound, XCircle,
} from "lucide-react";
import type { JourneyChannel } from "@/lib/crm-b2b-sofa-journey";

interface Props {
  channel: "zalo" | "email";
  subject?: string;
  body: string;
  mediaAssetIds?: string[];
  actualChannel?: JourneyChannel;
  emailFromName?: string;
  requiredVariables?: string[];
  journeyCode?: string;
}

interface TestLead {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  stage: string;
  assignedTo: string;
  blocked: boolean;
  canSend: boolean;
}

interface SendResult {
  kind: "success" | "error" | "unknown";
  message: string;
}

const SAMPLE_VALUES: Record<string, string> = {
  name: "Anh Minh",
  customer_name: "Anh Minh",
  contact_name: "Anh Minh",
  company: "An Nhiên Hospitality",
  company_name: "An Nhiên Hospitality",
  property_name: "An Nhiên Homestay",
  property_type: "homestay 12 phòng",
  city: "Đà Lạt",
  phone: "0901 234 567",
  email: "minh@annhien.vn",
  stage: "Đang tư vấn",
  assignedTo: "Nguyễn Lan",
  sales_name: "Nguyễn Lan",
  value: "180.000.000 đ",
  quantity: "12",
  available_dimensions: "1,6 × 2,2 m",
  main_priority: "dễ vận hành và vệ sinh",
  required_date: "15/11/2026",
  survey_form_line: "Điền nhanh tại: https://smartfurni.com.vn/khao-sat",
  survey_form_url: "https://smartfurni.com.vn/khao-sat",
  approved_demo_video_url: "[Video đính kèm từ thư viện]",
  project_brief_url: "https://smartfurni.com.vn/project-brief",
  comparison_pack_url: "https://smartfurni.com.vn/so-sanh",
  primary_benefit: "đọc sách, xem phim và nghỉ ngơi thuận tiện hơn",
  solution_type: "Khung nâng hạ lắp vào giường hiện có",
  benefit_summary: "giữ lại thiết kế phòng ngủ và bổ sung khả năng điều chỉnh tư thế",
  fit_reason: "lòng giường hiện tại phù hợp để kiểm tra bước tiếp theo",
  recommended_size: "1,6 × 2 m",
  price_range: "Cập nhật theo cấu hình đã xác nhận",
  included_items: "khung nâng hạ, motor, remote, bộ nguồn và phụ kiện lắp đặt",
  existing_bed_dimensions: "1,62 × 2,02 m",
  mattress_type: "nệm có độ linh hoạt phù hợp",
  user_profile: "hai vợ chồng",
  purchase_timing: "trong 30 ngày tới",
};

function renderSample(template: string) {
  return template.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, key: string) => SAMPLE_VALUES[key] || `[${key}]`);
}

const CHANNEL_LABELS: Record<JourneyChannel, string> = {
  zalo_personal: "Zalo cá nhân",
  zalo_oa: "Zalo OA",
  email: "Email",
};

export default function AutomationTemplateTest({
  channel,
  subject = "",
  body,
  mediaAssetIds = [],
  actualChannel,
  emailFromName,
  requiredVariables = [],
  journeyCode,
}: Props) {
  const [open, setOpen] = useState(false);
  const [realOpen, setRealOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [leads, setLeads] = useState<TestLead[]>([]);
  const [selectedLead, setSelectedLead] = useState<TestLead | null>(null);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const sendingRef = useRef(false);
  const renderedBody = useMemo(() => renderSample(body), [body]);
  const renderedSubject = useMemo(() => renderSample(subject), [subject]);
  const deliveryChannel: JourneyChannel = actualChannel || (channel === "email" ? "email" : "zalo_personal");

  useEffect(() => {
    if (!realOpen) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoadingLeads(true);
      try {
        const params = new URLSearchParams({ channel: deliveryChannel });
        if (search.trim()) params.set("search", search.trim());
        const response = await fetch(`/api/crm/automation/test-send?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Không tải được khách hàng CRM.");
        setLeads(Array.isArray(payload.leads) ? payload.leads : []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setLeads([]);
          setSendResult({ kind: "error", message: error instanceof Error ? error.message : "Không tải được khách hàng CRM." });
        }
      } finally {
        if (!controller.signal.aborted) setLoadingLeads(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [deliveryChannel, realOpen, search]);

  const chooseLead = (lead: TestLead) => {
    setSelectedLead(lead);
    setConfirmed(false);
    setSendResult(null);
  };

  const sendRealTest = async () => {
    if (!selectedLead || !confirmed || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setSendResult(null);
    try {
      const requestId = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `test_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const response = await fetch("/api/crm/automation/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          confirmed: true,
          leadId: selectedLead.id,
          channel: deliveryChannel,
          subject,
          body,
          mediaAssetIds,
          emailFromName,
          requiredVariables,
          journeyCode,
        }),
      });
      const payload = await response.json();
      if (payload.ok) {
        setSendResult({
          kind: "success",
          message: `Đã gửi thật qua ${CHANNEL_LABELS[deliveryChannel]} tới ${selectedLead.name}.`,
        });
        setConfirmed(false);
        return;
      }
      if (payload.outcome === "delivery_unknown") {
        setSendResult({
          kind: "unknown",
          message: `${payload.error || "Chưa xác định được kết quả gửi."} Không nên gửi lại ngay để tránh khách nhận trùng.`,
        });
        setConfirmed(false);
        return;
      }
      throw new Error(payload.error || "Không gửi được tin test thật.");
    } catch (error) {
      setSendResult({ kind: "error", message: error instanceof Error ? error.message : "Không gửi được tin test thật." });
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/60">
      <button type="button" onClick={() => setOpen(value => !value)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><FlaskConical size={14} /></span>
        <span className="min-w-0 flex-1"><strong className="block text-xs text-emerald-900">Test thử mẫu này</strong><span className="block text-[10px] text-emerald-700">Xem nội dung sau khi thay biến và media trước khi gửi thật</span></span>
        {open ? <ChevronUp size={15} className="text-emerald-700" /> : <ChevronDown size={15} className="text-emerald-700" />}
      </button>
      {open && (
        <div className="border-t border-emerald-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
              {channel === "email" ? <Mail size={11} /> : <MessageCircle size={11} />}
              {channel === "email" ? "Bản xem trước Email" : "Bản xem trước Zalo"}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700"><CheckCircle2 size={11} /> Không gửi tới khách hàng</span>
          </div>
          <div className={`rounded-2xl border p-3 ${channel === "zalo" ? "ml-auto max-w-[88%] border-blue-200 bg-blue-50" : "border-slate-200 bg-slate-50"}`}>
            {channel === "email" && renderedSubject && <div className="mb-2 border-b border-slate-200 pb-2 text-xs font-bold text-slate-900">Chủ đề: {renderedSubject}</div>}
            <div className="whitespace-pre-wrap text-xs leading-5 text-slate-700">{renderedBody || "Chưa có nội dung."}</div>
            {mediaAssetIds.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {mediaAssetIds.map(id => (
                  <div key={id} className="relative aspect-square overflow-hidden rounded-lg border border-white bg-slate-100 shadow-sm">
                    <img src={`/api/crm/zalo-inbox/media-library/thumbnail?id=${encodeURIComponent(id)}`} alt="Media kiểm thử" className="h-full w-full object-cover" />
                    <span className="absolute bottom-1 right-1 rounded bg-slate-950/70 px-1 py-0.5 text-[8px] font-bold text-white">MEDIA</span>
                  </div>
                ))}
              </div>
            )}
            {channel === "email" && mediaAssetIds.length > 0 && (
              <p className="mt-2 text-[10px] text-slate-500">
                Ảnh được gửi dưới dạng tệp đính kèm; video được chuẩn hóa MP4 trước khi đính kèm.
              </p>
            )}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500"><Play size={10} /> Dữ liệu mẫu: Anh Minh · An Nhiên Homestay · 12 sản phẩm</div>

          <div className="mt-3 overflow-hidden rounded-xl border border-amber-200 bg-amber-50/60">
            <button
              type="button"
              onClick={() => setRealOpen(value => !value)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700"><Send size={14} /></span>
              <span className="min-w-0 flex-1">
                <strong className="block text-xs text-amber-950">Gửi test thật cho khách hàng</strong>
                <span className="block text-[10px] text-amber-700">Chọn khách hàng CRM và gửi thật qua {CHANNEL_LABELS[deliveryChannel]}</span>
              </span>
              {realOpen ? <ChevronUp size={15} className="text-amber-700" /> : <ChevronDown size={15} className="text-amber-700" />}
            </button>

            {realOpen && (
              <div className="space-y-3 border-t border-amber-200 bg-white p-3">
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[10px] leading-4 text-amber-800">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  Đây là thao tác gửi thật. Khách hàng sẽ nhận nội dung và media hiện tại; hệ thống sẽ lưu vào nhật ký CRM.
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-semibold text-slate-600">Tìm khách hàng CRM</label>
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={search}
                      onChange={event => setSearch(event.target.value)}
                      placeholder="Tên, công ty hoặc số điện thoại..."
                      className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-8 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                    {loadingLeads && <Loader2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-blue-500" />}
                  </div>
                </div>

                <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-1">
                  {!loadingLeads && leads.length === 0 && (
                    <div className="px-3 py-5 text-center text-[10px] text-slate-500">Không tìm thấy khách hàng phù hợp.</div>
                  )}
                  {leads.map(lead => (
                    <button
                      key={lead.id}
                      type="button"
                      disabled={!lead.canSend}
                      onClick={() => chooseLead(lead)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition ${
                        selectedLead?.id === lead.id ? "bg-blue-50 ring-1 ring-blue-300" : "hover:bg-slate-50"
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700"><UserRound size={14} /></span>
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-xs text-slate-800">{lead.name || "Khách hàng chưa đặt tên"}</strong>
                        <span className="block truncate text-[10px] text-slate-500">{lead.company || lead.assignedTo || "Khách hàng CRM"}</span>
                      </span>
                      <span className="max-w-[42%] truncate text-right text-[10px] text-slate-500">
                        {deliveryChannel === "email" ? lead.email : lead.phone}
                        {!lead.canSend && <em className="block not-italic text-red-500">{lead.blocked ? "Đã chặn liên hệ" : "Thiếu kênh gửi"}</em>}
                      </span>
                    </button>
                  ))}
                </div>

                {selectedLead && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3">
                    <div className="flex items-start gap-2">
                      <ShieldCheck size={15} className="mt-0.5 shrink-0 text-blue-600" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-blue-950">Người nhận: {selectedLead.name}</p>
                        <p className="mt-0.5 truncate text-[10px] text-blue-700">
                          {CHANNEL_LABELS[deliveryChannel]} · {deliveryChannel === "email" ? selectedLead.email : selectedLead.phone}
                        </p>
                      </div>
                    </div>
                    <label className="mt-3 flex cursor-pointer items-start gap-2 text-[10px] leading-4 text-slate-700">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={event => setConfirmed(event.target.checked)}
                        className="mt-0.5 h-3.5 w-3.5 accent-blue-600"
                      />
                      Tôi xác nhận gửi thật mẫu hiện tại tới đúng khách hàng này.
                    </label>
                    <button
                      type="button"
                      disabled={!confirmed || sending}
                      onClick={() => void sendRealTest()}
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0068ff] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#0056d6] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                      {sending ? "Đang gửi thật..." : `Gửi thật qua ${CHANNEL_LABELS[deliveryChannel]}`}
                    </button>
                  </div>
                )}

                {sendResult && (
                  <div className={`flex items-start gap-2 rounded-lg border p-2 text-[10px] leading-4 ${
                    sendResult.kind === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : sendResult.kind === "unknown"
                        ? "border-amber-300 bg-amber-50 text-amber-900"
                        : "border-red-200 bg-red-50 text-red-700"
                  }`}>
                    {sendResult.kind === "success"
                      ? <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
                      : sendResult.kind === "unknown"
                        ? <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                        : <XCircle size={13} className="mt-0.5 shrink-0" />}
                    {sendResult.message}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
