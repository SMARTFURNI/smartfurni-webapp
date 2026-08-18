"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle, CheckCircle2, Clock3, ExternalLink, Mail, MessageCircle,
  Pause, Play, RefreshCw, Save, ShieldCheck, UserPlus, XCircle,
} from "lucide-react";
import type {
  B2BSofaJourneyDefinition,
  B2BSofaJourneySettings,
  JourneyChannel,
  JourneyStepDefinition,
  JourneyStepOverride,
} from "@/lib/crm-b2b-sofa-journey";
import { B2C_ERGONOMIC_BED_JOURNEY_CODE } from "@/lib/crm-b2c-ergonomic-bed-journey";
import { B2C_SOFA_BED_JOURNEY_CODE } from "@/lib/crm-b2c-sofa-bed-journey";
import AutomationMediaField from "./AutomationMediaField";
import AutomationTemplateTest from "./AutomationTemplateTest";

interface EnrollmentItem {
  id: string;
  leadId: string;
  leadName: string;
  status: "active" | "paused" | "completed" | "cancelled";
  pausedReason: string;
  pauseUntil: string | null;
  enrolledAt: string;
  updatedAt: string;
  context: Record<string, string>;
  replyReview: {
    id: string;
    channel: string;
    inboundAt: string;
    message: string;
    intent: string;
    recommendation: "continue" | "pause" | "switch" | "stop" | "complete";
    reason: string;
    confidence: number;
    suggestedPauseUntil: string | null;
    status: "pending_review" | "accepted" | "dismissed";
  } | null;
}

interface ActionItem {
  id: string;
  leadId: string;
  stepId: string;
  status: string;
  sentChannel: JourneyChannel | null;
  error: string;
  scheduledAt: string;
  updatedAt: string;
}

interface DashboardPayload {
  definition: B2BSofaJourneyDefinition;
  settings: B2BSofaJourneySettings;
  stats: Record<string, number>;
  recentEnrollments: EnrollmentItem[];
  recentActions: ActionItem[];
}

const CHANNEL_LABELS: Record<JourneyChannel, string> = {
  zalo_personal: "Zalo cá nhân",
  zalo_oa: "Zalo OA",
  email: "Email",
};

const CHANNEL_COLORS: Record<JourneyChannel, string> = {
  zalo_personal: "#0ea5e9",
  zalo_oa: "#2563eb",
  email: "#8b5cf6",
};

const RECOMMENDATION_LABELS = {
  continue: "Tiếp tục workflow",
  pause: "Nên tạm dừng",
  switch: "Nên chuyển workflow",
  stop: "Nên dừng chăm sóc",
  complete: "Đánh dấu hoàn tất",
} as const;

const PROJECT_CONTEXT_FIELDS = [
  ["available_dimensions", "Kích thước mặt bằng"],
  ["mechanism_preference", "Kiểu cơ cấu ưu tiên"],
  ["fabric_preference", "Chất liệu/màu ưu tiên"],
  ["quantity", "Số lượng dự kiến"],
  ["option_a_model", "Phương án A - mẫu"],
  ["option_a_price", "Phương án A - giá dự kiến"],
  ["option_a_lead_time", "Phương án A - tiến độ"],
  ["option_b_model", "Phương án B - mẫu"],
  ["option_b_price", "Phương án B - giá dự kiến"],
  ["option_b_lead_time", "Phương án B - tiến độ"],
  ["objection_topic", "Vướng mắc cần xử lý"],
  ["next_step_date", "Ngày hẹn bước tiếp theo"],
] as const;

const RETAIL_CONTEXT_FIELDS = [
  ["primary_benefit", "Lợi ích khách quan tâm nhất"],
  ["solution_type", "Nguyên bộ hoặc khung nâng hạ"],
  ["user_profile", "Người sử dụng"],
  ["existing_bed_dimensions", "Kích thước lòng giường hiện tại"],
  ["mattress_type", "Loại nệm đang dùng"],
  ["benefit_summary", "Tóm tắt trải nghiệm đề xuất"],
  ["fit_reason", "Lý do cấu hình phù hợp"],
  ["recommended_size", "Kích thước đề xuất"],
  ["price_range", "Khoảng đầu tư"],
  ["included_items", "Hạng mục bao gồm"],
  ["purchase_timing", "Thời điểm dự kiến mua"],
  ["objection_topic", "Vướng mắc cần xử lý"],
] as const;

const RETAIL_SOFA_CONTEXT_FIELDS = [
  ["use_space", "Không gian dự kiến đặt"],
  ["available_dimensions", "Kích thước vị trí đặt"],
  ["usage_frequency", "Tần suất sử dụng để ngủ"],
  ["material_preference", "Ưu tiên chất liệu / vệ sinh"],
  ["primary_priority", "Tiêu chí ưu tiên chính"],
  ["purchase_timing", "Thời điểm dự kiến mua"],
] as const;

interface JourneyAutomationProps {
  variant?: "b2b" | "b2c_ergonomic" | "b2c_sofa";
}

interface LeadOption { id: string; name: string; company?: string; phone?: string; email?: string; blocked?: boolean }

function formatDate(value: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function statusLabel(status: string): string {
  return ({
    active: "Đang chạy", paused: "Đã tạm dừng", completed: "Hoàn tất", cancelled: "Đã hủy",
    pending: "Đang chờ", sent: "Đã gửi", waiting_content: "Chờ dữ liệu",
    delivery_unknown: "Cần đối soát", failed: "Gửi thất bại", skipped: "Đã bỏ qua",
  } as Record<string, string>)[status] || status;
}

export default function B2BSofaJourneyAutomation({ variant = "b2b" }: JourneyAutomationProps) {
  const isErgonomicRetailJourney = variant === "b2c_ergonomic";
  const isSofaRetailJourney = variant === "b2c_sofa";
  const isRetailJourney = isErgonomicRetailJourney || isSofaRetailJourney;
  const endpoint = isErgonomicRetailJourney
    ? "/api/crm/automation/b2c-ergonomic-bed-journey"
    : isSofaRetailJourney ? "/api/crm/automation/b2c-sofa-bed-journey" : "/api/crm/automation/b2b-sofa-journey";
  const journeyCode = isErgonomicRetailJourney ? B2C_ERGONOMIC_BED_JOURNEY_CODE : isSofaRetailJourney ? B2C_SOFA_BED_JOURNEY_CODE : undefined;
  const contextFields = isErgonomicRetailJourney ? RETAIL_CONTEXT_FIELDS : isSofaRetailJourney ? RETAIL_SOFA_CONTEXT_FIELDS : PROJECT_CONTEXT_FIELDS;
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [settings, setSettings] = useState<B2BSofaJourneySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [manualLeadId, setManualLeadId] = useState("");
  const [leadSearch, setLeadSearch] = useState("");
  const [leadOptions, setLeadOptions] = useState<LeadOption[]>([]);
  const [selectedEnrollments, setSelectedEnrollments] = useState<string[]>([]);
  const [contextDrafts, setContextDrafts] = useState<Record<string, Record<string, string>>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không tải được journey.");
      setData(payload);
      setSettings(payload.settings);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không tải được journey.");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/crm/automation/test-send?search=${encodeURIComponent(leadSearch)}`, { cache: "no-store" });
        const payload = await response.json();
        setLeadOptions(response.ok && Array.isArray(payload.leads) ? payload.leads : []);
      } catch { setLeadOptions([]); }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [leadSearch]);

  const post = async (body: Record<string, unknown>) => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Không thể thực hiện thao tác.");
    return payload;
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setError("");
    try {
      await post({ action: "save_settings", settings });
      setMessage(settings.enabled ? "Đã lưu và bật journey." : "Đã lưu cài đặt; journey đang tắt.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không lưu được cài đặt.");
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async () => {
    if (!settings) return;
    setSaving(true); setError("");
    try {
      const payload = await post({ action: "save_draft", settings });
      setMessage(`Đã lưu bản nháp v${payload.version?.version || "mới"}; workflow đang chạy chưa bị thay đổi.`);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Không lưu được bản nháp."); }
    finally { setSaving(false); }
  };

  const runNow = async () => {
    if (!settings?.enabled) {
      setError("Hãy bật và lưu journey trước khi chạy.");
      return;
    }
    if (!window.confirm("Chạy journey có thể gửi tin thật cho các bước đã đến hạn. Tiếp tục?")) return;
    setRunning(true);
    setError("");
    try {
      const payload = await post({ action: "run", limit: 20 });
      const result = payload.result as { sent: number; waitingContent: number; deliveryUnknown: number; replyRecommendations: number; autoEnrollment: { enrolled: number } };
      setMessage(`Đã chạy: thêm ${result.autoEnrollment.enrolled} lead, gửi ${result.sent}, tạo ${result.replyRecommendations || 0} đề xuất phản hồi, chờ dữ liệu ${result.waitingContent}, cần đối soát ${result.deliveryUnknown}.`);
      await load();
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Không chạy được journey.");
    } finally {
      setRunning(false);
    }
  };

  const enrollLead = async () => {
    const leadId = manualLeadId.trim();
    if (!leadId) return;
    setError("");
    try {
      const payload = await post({ action: "enroll", leadId });
      setMessage(payload.created ? "Đã thêm lead vào journey." : "Lead đã có trong journey.");
      setManualLeadId("");
      await load();
    } catch (enrollError) {
      setError(enrollError instanceof Error ? enrollError.message : "Không thêm được lead.");
    }
  };

  const changeEnrollment = async (action: "pause" | "resume" | "cancel" | "complete", enrollmentId: string) => {
    if (action === "cancel" && !window.confirm("Dừng toàn bộ bước chưa gửi của lead này?")) return;
    if (action === "complete" && !window.confirm("Đánh dấu workflow của khách này đã hoàn tất?")) return;
    try {
      await post(action === "pause" ? { action, enrollmentId, pauseHours: 24 } : { action, enrollmentId });
      setMessage(({ pause: "Đã tạm dừng workflow 24 giờ.", resume: "Đã tiếp tục workflow.", cancel: "Đã dừng workflow của lead.", complete: "Đã đánh dấu hoàn tất workflow." })[action]);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Không cập nhật được journey.");
    }
  };

  const bulkEnrollmentAction = async (action: "pause" | "resume" | "cancel") => {
    if (!selectedEnrollments.length) return;
    if (!window.confirm(`Áp dụng "${action}" cho ${selectedEnrollments.length} workflow đã chọn?`)) return;
    setError("");
    try {
      await Promise.all(selectedEnrollments.map(enrollmentId => post(action === "pause" ? { action, enrollmentId, pauseHours: 24 } : { action, enrollmentId })));
      setMessage(`Đã cập nhật ${selectedEnrollments.length} workflow.`); setSelectedEnrollments([]); await load();
    } catch (bulkError) { setError(bulkError instanceof Error ? bulkError.message : "Không cập nhật được danh sách workflow."); }
  };

  const reviewReply = async (
    reviewId: string,
    decision: "continue" | "pause" | "switch" | "stop" | "complete",
    pauseHours?: number,
  ) => {
    const destructive = decision === "stop" || decision === "switch" || decision === "complete";
    if (destructive && !window.confirm(`Xác nhận: ${RECOMMENDATION_LABELS[decision]}?`)) return;
    setError("");
    try {
      await post({ action: "review_reply", reviewId, decision, pauseHours });
      setMessage(decision === "continue"
        ? "Đã bỏ qua đề xuất; workflow vẫn tiếp tục theo lịch."
        : `Đã áp dụng: ${RECOMMENDATION_LABELS[decision]}.`);
      await load();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Không xử lý được đề xuất AI.");
    }
  };

  const saveContext = async (item: EnrollmentItem) => {
    setError("");
    try {
      await post({ action: "update_context", enrollmentId: item.id, context: contextDrafts[item.id] || {} });
      setMessage(`Đã cập nhật dữ liệu cá nhân hóa cho ${item.leadName}; bước đang chờ sẽ được xét lại.`);
      await load();
    } catch (contextError) {
      setError(contextError instanceof Error ? contextError.message : "Không cập nhật được dữ liệu dự án.");
    }
  };

  const updateStep = (step: JourneyStepDefinition, patch: Partial<JourneyStepOverride>) => {
    setSettings(current => {
      if (!current) return current;
      const existing = current.stepOverrides?.[step.id] || {};
      return {
        ...current,
        stepOverrides: {
          ...current.stepOverrides,
          [step.id]: {
            enabled: existing.enabled ?? step.enabled ?? true,
            day: existing.day ?? step.day,
            sendHour: existing.sendHour ?? step.sendHour,
            sendMinute: existing.sendMinute ?? step.sendMinute,
            primaryChannel: existing.primaryChannel ?? step.primaryChannel,
            fallbackChannels: existing.fallbackChannels ?? step.fallbackChannels,
            emailSubject: existing.emailSubject ?? step.emailSubject,
            emailBody: existing.emailBody ?? step.emailBody,
            zaloBody: existing.zaloBody ?? step.zaloBody,
            mediaAssetIds: existing.mediaAssetIds ?? step.mediaAssetIds ?? [],
            ...patch,
          },
        },
      };
    });
  };

  if (loading && !data) {
    return <div className="flex items-center justify-center py-20 text-sm text-gray-500"><RefreshCw size={16} className="animate-spin mr-2" />Đang tải journey...</div>;
  }
  if (!data || !settings) {
    return <div className="p-4 rounded-xl text-sm text-red-600 bg-red-50 border border-red-200">{error || "Không tải được journey."}</div>;
  }

  const demoStepHasAttachedMedia = Boolean(
    data.definition.steps.find(step => ["D5_DEMO", "D4_DEMO_MEDIA", "D4_DEMO"].includes(step.id))?.mediaAssetIds?.length,
  );
  const missingAssets = [
    !settings.approvedDemoVideoUrl && !demoStepHasAttachedMedia && "video demo đã duyệt",
    !isRetailJourney && !settings.projectBriefUrl && "mẫu hồ sơ dự án",
    !isRetailJourney && !settings.comparisonPackUrl && "bộ so sánh cấu hình",
  ].filter(Boolean);

  return (
    <div className={isRetailJourney ? "automation-b2c-ergonomic space-y-5" : "automation-b2b space-y-5"}>
      <div className="p-5 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={20} className="text-[#0068ff]" />
              <h2 className="font-bold text-gray-900">{data.definition.name}</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-900 text-white">V{data.definition.version}</span>
            </div>
            <p className="text-sm text-gray-600">{data.definition.description}</p>
            <p className="text-xs text-gray-500 mt-2 font-mono">{data.definition.code}</p>
          </div>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <span className="text-sm font-semibold text-gray-800">{settings.enabled ? "Đang bật" : "Đang tắt"}</span>
            <button type="button" onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
              className="relative w-12 h-7 rounded-full transition-colors"
              style={{ background: settings.enabled ? "#16a34a" : "#d1d5db" }}>
              <span className="absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all"
                style={{ left: settings.enabled ? 24 : 4 }} />
            </button>
          </label>
        </div>

        {missingAssets.length > 0 && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-amber-100/70 text-amber-900 text-xs">
            <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
            <span>Còn thiếu {missingAssets.join(", ")}. Các bước phụ thuộc tài liệu sẽ chờ dữ liệu, không gửi nội dung có biến trống.</span>
          </div>
        )}
      </div>

      {message && <div className="p-3 rounded-xl flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm"><CheckCircle2 size={16} />{message}</div>}
      {error && <div className="p-3 rounded-xl flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm"><XCircle size={16} />{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          ["Đang chạy", data.stats.active || 0, "#16a34a"],
          ["Đang chờ gửi", data.stats.pending || 0, "#2563eb"],
          ["Đã gửi", data.stats.sent || 0, "#7c3aed"],
          ["Chờ dữ liệu", data.stats.waiting_content || 0, "#d97706"],
          ["Cần đối soát", data.stats.delivery_unknown || 0, "#dc2626"],
          ["AI chờ duyệt", data.stats.pending_review || 0, "#ea580c"],
        ].map(([label, value, color]) => (
          <div key={String(label)} className="p-3 rounded-xl bg-white border border-gray-200">
            <div className="text-xl font-bold" style={{ color: String(color) }}>{String(value)}</div>
            <div className="text-xs text-gray-500">{String(label)}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-gray-200 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Điều kiện vận hành</h3>
            <p className="text-xs text-gray-500 mt-1">Journey chỉ tự thêm lead mới sau thời điểm bật, trừ khi cho phép lấy lead cũ.</p>
          </div>
          {[
            { key: "autoEnroll" as const, label: "Tự động thêm lead đủ điều kiện" },
            { key: "autoEnrollExisting" as const, label: "Cho phép thêm lead đã có trước khi bật" },
            isRetailJourney
              ? { key: "requireRetailSignal" as const, label: isSofaRetailJourney ? "Bắt buộc là khách lẻ quan tâm Sofa Giường" : "Bắt buộc là khách lẻ quan tâm Giường công thái học" }
              : { key: "requireHospitalitySignal" as const, label: "Bắt buộc có tín hiệu homestay/BnB/phòng trọ" },
          ].map(item => (
            <label key={item.key} className="flex items-center justify-between gap-3 text-sm text-gray-700">
              <span>{item.label}</span>
              <input type="checkbox" checked={Boolean(settings[item.key])}
                onChange={event => setSettings({ ...settings, [item.key]: event.target.checked })}
                className="w-4 h-4 accent-[#0068ff]" />
            </label>
          ))}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-xs text-gray-600">Giới hạn tin/7 ngày
              <input type="number" min={1} max={7} value={settings.maxMessagesPerSevenDays}
                onChange={event => setSettings({ ...settings, maxMessagesPerSevenDays: Number(event.target.value) })}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
            </label>
            <label className="text-xs text-gray-600">ID tài khoản Zalo SmartFurni
              <input value={settings.automationAccountId}
                onChange={event => setSettings({ ...settings, automationAccountId: event.target.value })}
                placeholder="Để trống để tự nhận diện SmartFurni"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
            </label>
            <label className="text-xs text-gray-600">Bắt đầu giờ gửi
              <input type="time" value={settings.businessHoursStart}
                onChange={event => setSettings({ ...settings, businessHoursStart: event.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
            </label>
            <label className="text-xs text-gray-600">Kết thúc giờ gửi
              <input type="time" value={settings.businessHoursEnd}
                onChange={event => setSettings({ ...settings, businessHoursEnd: event.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
            </label>
            <label className="md:col-span-2 text-xs text-gray-600">Nhãn không được liên hệ (phân cách bằng dấu phẩy)
              <input value={settings.doNotContactTags.join(", ")}
                onChange={event => setSettings({ ...settings, doNotContactTags: event.target.value.split(",").map(value => value.trim()).filter(Boolean) })}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
            </label>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-gray-200 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Tài liệu đã duyệt</h3>
            <p className="text-xs text-gray-500 mt-1">Không có URL thì bước liên quan sẽ chờ, không tự bịa nội dung.</p>
          </div>
          {(isSofaRetailJourney ? [
            ["approvedDemoVideoUrl", "Link video Sofa Giường đã duyệt"],
          ] : isRetailJourney ? [
            ["surveyFormUrl", "Link hướng dẫn gửi ảnh/kích thước"],
            ["approvedDemoVideoUrl", "Link video trải nghiệm đã duyệt"],
            ["comparisonPackUrl", "Link so sánh nguyên bộ/khung nâng hạ"],
          ] : [
            ["surveyFormUrl", "Link checklist/form khảo sát"],
            ["approvedDemoVideoUrl", "Link video demo đã duyệt"],
            ["projectBriefUrl", "Link mẫu Project Brief"],
            ["comparisonPackUrl", "Link bộ so sánh cấu hình"],
          ]).map(([key, label]) => (
            <label key={key} className="block text-xs text-gray-600">{label}
              <input value={String(settings[key as keyof B2BSofaJourneySettings] || "")}
                onChange={event => setSettings({ ...settings, [key]: event.target.value })}
                placeholder="https://..."
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={saveDraft} disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-blue-200 bg-white text-blue-700 text-sm font-semibold disabled:opacity-50">
          <Save size={14} /> Lưu bản nháp
        </button>
        <button onClick={save} disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0068ff] hover:bg-[#0056d6] text-white text-sm font-semibold shadow-sm disabled:opacity-50">
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} Lưu & xuất bản
        </button>
        <button onClick={runNow} disabled={running || !settings.enabled}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold disabled:opacity-40">
          {running ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />} Chạy các bước đến hạn
        </button>
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <input value={leadSearch} onChange={event => setLeadSearch(event.target.value)} list={`journey-leads-${variant || "b2b"}`}
            placeholder="Tìm tên, công ty, SĐT..."
            className="px-3 py-2 rounded-xl border border-gray-300 text-sm min-w-[260px]" />
          <datalist id={`journey-leads-${variant || "b2b"}`}>
            {leadOptions.map(lead => <option key={lead.id} value={`${lead.name}${lead.company ? ` · ${lead.company}` : ""}`}>{lead.phone || lead.email || lead.id}</option>)}
          </datalist>
          <select value={manualLeadId} onChange={event => setManualLeadId(event.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-300 bg-white text-sm min-w-[260px]">
            <option value="">Chọn khách hàng CRM ({leadOptions.length})</option>
            {leadOptions.map(lead => <option key={lead.id} value={lead.id} disabled={lead.blocked}>{lead.name}{lead.company ? ` · ${lead.company}` : ""}{lead.blocked ? " · Không liên hệ" : ""}</option>)}
          </select>
          <button onClick={enrollLead} disabled={!manualLeadId.trim()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-300 bg-white text-sm font-medium disabled:opacity-40">
            <UserPlus size={14} /> Thêm lead
          </button>
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-white border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">{isSofaRetailJourney ? "Chuỗi Zalo cá nhân 90 ngày · tập trung 14 ngày đầu" : isRetailJourney ? "Chuỗi lợi ích 90 ngày · tập trung 30 ngày đầu" : "Chuỗi nội dung 90 ngày"}</h3>
            <p className="text-xs text-gray-500 mt-1">{isSofaRetailJourney ? "Mỗi bước chỉ gửi qua Zalo cá nhân; không tự chuyển sang Zalo OA hoặc Email." : "Mỗi bước chỉ được ghi nhận gửi thành công trên một kênh; kênh dự phòng bị hủy khi đã gửi thành công."}</p>
          </div>
          <a href="https://www.smartfurni.com.vn/contact" target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">Thông tin liên hệ chuẩn <ExternalLink size={11} /></a>
        </div>
        <div className="space-y-2">
          {data.definition.steps.map(step => {
            const override = settings.stepOverrides?.[step.id] || {};
            const editableStep = {
              ...step,
              enabled: override.enabled ?? step.enabled ?? true,
              day: override.day ?? step.day,
              sendHour: override.sendHour ?? step.sendHour,
              sendMinute: override.sendMinute ?? step.sendMinute,
              primaryChannel: override.primaryChannel ?? step.primaryChannel,
              fallbackChannels: override.fallbackChannels ?? step.fallbackChannels,
              emailSubject: override.emailSubject ?? step.emailSubject,
              emailBody: override.emailBody ?? step.emailBody,
              zaloBody: override.zaloBody ?? step.zaloBody,
              mediaAssetIds: override.mediaAssetIds ?? step.mediaAssetIds ?? [],
            };
            const stepChannels = [editableStep.primaryChannel, ...editableStep.fallbackChannels];
            const zaloTestChannel = stepChannels.includes("zalo_personal")
              ? "zalo_personal"
              : stepChannels.find(channel => channel !== "email") as Exclude<JourneyChannel, "email"> | undefined;
            return (
            <details key={step.id} className="group rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
              <summary className="cursor-pointer list-none p-3 flex items-center gap-3">
                <div className="w-12 text-center flex-shrink-0">
                  <div className="text-xs font-bold text-gray-900">Ngày {editableStep.day}</div>
                  <div className="text-[10px] text-gray-500">{String(editableStep.sendHour).padStart(2, "0")}:{String(editableStep.sendMinute).padStart(2, "0")}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900">{step.title}</div>
                  <div className="text-xs text-gray-500 truncate">{step.objective}</div>
                </div>
                <div className="hidden md:flex items-center gap-1.5">
                  {[editableStep.primaryChannel, ...editableStep.fallbackChannels].map((channel, index) => (
                    <span key={channel} className="text-[10px] px-2 py-1 rounded-full border"
                      style={{ color: CHANNEL_COLORS[channel], borderColor: `${CHANNEL_COLORS[channel]}55`, background: `${CHANNEL_COLORS[channel]}0d` }}>
                      {index > 0 ? "→ " : ""}{CHANNEL_LABELS[channel]}
                    </span>
                  ))}
                </div>
              </summary>
              <div className="border-t border-gray-200 p-4 grid grid-cols-1 lg:grid-cols-2 gap-4 bg-white">
                <div className={`lg:col-span-2 grid grid-cols-2 ${isSofaRetailJourney ? "md:grid-cols-5" : "md:grid-cols-7"} gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3`}>
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-700"><input type="checkbox" checked={editableStep.enabled} onChange={event => updateStep(step, { enabled: event.target.checked })} className="accent-[#0068ff]" />Bật bước</label>
                  <label className="text-[10px] text-gray-500">Ngày<input type="number" min={0} max={365} value={editableStep.day} onChange={event => updateStep(step, { day: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs" /></label>
                  <label className="text-[10px] text-gray-500">Giờ<input type="number" min={0} max={23} value={editableStep.sendHour} onChange={event => updateStep(step, { sendHour: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs" /></label>
                  <label className="text-[10px] text-gray-500">Phút<input type="number" min={0} max={59} value={editableStep.sendMinute} onChange={event => updateStep(step, { sendMinute: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs" /></label>
                  <label className="text-[10px] text-gray-500">Kênh chính<select disabled={isSofaRetailJourney} value={editableStep.primaryChannel} onChange={event => updateStep(step, { primaryChannel: event.target.value as JourneyChannel })} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs disabled:bg-slate-100">{Object.entries(CHANNEL_LABELS).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  {!isSofaRetailJourney && <><label className="text-[10px] text-gray-500">Dự phòng 1<select value={editableStep.fallbackChannels[0] || ""} onChange={event => updateStep(step, { fallbackChannels: event.target.value ? [event.target.value as JourneyChannel, ...editableStep.fallbackChannels.slice(1)] : editableStep.fallbackChannels.slice(1) })} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs"><option value="">Không dùng</option>{Object.entries(CHANNEL_LABELS).filter(([value]) => value !== editableStep.primaryChannel).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label className="text-[10px] text-gray-500">Dự phòng 2<select value={editableStep.fallbackChannels[1] || ""} onChange={event => updateStep(step, { fallbackChannels: event.target.value ? [editableStep.fallbackChannels[0], event.target.value as JourneyChannel].filter(Boolean) as JourneyChannel[] : editableStep.fallbackChannels.slice(0, 1) })} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs"><option value="">Không dùng</option>{Object.entries(CHANNEL_LABELS).filter(([value]) => value !== editableStep.primaryChannel && value !== editableStep.fallbackChannels[0]).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label></>}
                </div>
                <div className={`min-w-0 ${isSofaRetailJourney ? "lg:col-span-2" : ""}`}>
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 mb-2"><MessageCircle size={13} /> Nội dung Zalo · có thể chỉnh sửa</div>
                  <textarea
                    value={editableStep.zaloBody}
                    onChange={event => updateStep(step, { zaloBody: event.target.value })}
                    rows={12}
                    className="w-full resize-y rounded-xl border border-blue-200 bg-blue-50/40 p-3 font-sans text-xs leading-5 text-gray-700 outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <AutomationTemplateTest
                    channel="zalo"
                    actualChannel={zaloTestChannel || "zalo_personal"}
                    body={editableStep.zaloBody}
                    mediaAssetIds={editableStep.mediaAssetIds}
                    requiredVariables={step.requiredContext}
                    journeyCode={journeyCode}
                  />
                </div>
                {!isSofaRetailJourney && <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-semibold text-violet-700 mb-2"><Mail size={13} /> Nội dung Email · có thể chỉnh sửa</div>
                  <label className="mb-2 block text-[10px] font-semibold text-gray-500">Tiêu đề email
                    <input
                      value={editableStep.emailSubject}
                      onChange={event => updateStep(step, { emailSubject: event.target.value })}
                      className="mt-1 w-full rounded-lg border border-violet-200 bg-violet-50/40 px-3 py-2 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-violet-200"
                    />
                  </label>
                  <textarea
                    value={editableStep.emailBody}
                    onChange={event => updateStep(step, { emailBody: event.target.value })}
                    rows={10}
                    className="w-full resize-y rounded-xl border border-violet-200 bg-violet-50/40 p-3 font-sans text-xs leading-5 text-gray-700 outline-none focus:ring-2 focus:ring-violet-200"
                  />
                  <AutomationTemplateTest channel="email" subject={editableStep.emailSubject} body={editableStep.emailBody} mediaAssetIds={editableStep.mediaAssetIds} requiredVariables={step.requiredContext} journeyCode={journeyCode} emailFromName={isRetailJourney ? "SmartFurni" : "SmartFurni B2B"} />
                </div>}
                <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <AutomationMediaField
                    assetIds={editableStep.mediaAssetIds}
                    onChange={mediaAssetIds => updateStep(step, { mediaAssetIds })}
                  />
                  <p className="mt-2 text-[10px] text-slate-500">{isSofaRetailJourney ? "Media chỉ được gửi qua Zalo cá nhân của bước này." : "Media đã chọn được dùng cho cả Zalo và Email của bước này. Khi fallback kênh, hệ thống giữ nguyên bộ media."}</p>
                </div>
                {step.requiredContext?.length ? (
                  <div className="lg:col-span-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                    Dữ liệu bắt buộc: {step.requiredContext.join(", ")}
                  </div>
                ) : null}
              </div>
            </details>
          );})}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-gray-200">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold text-gray-900">Lead trong journey</h3><div className="flex items-center gap-1"><button onClick={() => setSelectedEnrollments(data.recentEnrollments.filter(item => ["active","paused"].includes(item.status)).map(item => item.id))} className="rounded-lg border border-gray-200 px-2 py-1 text-[10px] text-gray-600">Chọn tất cả</button><button onClick={() => bulkEnrollmentAction("pause")} disabled={!selectedEnrollments.length} className="rounded-lg border border-amber-200 px-2 py-1 text-[10px] text-amber-700 disabled:opacity-40">Tạm dừng</button><button onClick={() => bulkEnrollmentAction("resume")} disabled={!selectedEnrollments.length} className="rounded-lg border border-green-200 px-2 py-1 text-[10px] text-green-700 disabled:opacity-40">Tiếp tục</button><button onClick={() => bulkEnrollmentAction("cancel")} disabled={!selectedEnrollments.length} className="rounded-lg border border-red-200 px-2 py-1 text-[10px] text-red-700 disabled:opacity-40">Dừng</button></div></div>
          <div className="space-y-2 max-h-96 overflow-auto">
            {data.recentEnrollments.length === 0 && <p className="text-xs text-gray-500 py-6 text-center">Chưa có lead nào.</p>}
            {data.recentEnrollments.map(item => (
              <div key={item.id} className="p-3 rounded-xl border border-gray-200 bg-gray-50">
                <div className="flex items-start justify-between gap-2">
                  <input type="checkbox" checked={selectedEnrollments.includes(item.id)} disabled={["completed","cancelled"].includes(item.status)} onChange={event => setSelectedEnrollments(current => event.target.checked ? [...new Set([...current,item.id])] : current.filter(id => id !== item.id))} className="mt-1 accent-[#0068ff]" />
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{item.leadName}</div>
                    <div className="text-[11px] text-gray-500">{statusLabel(item.status)} · {formatDate(item.updatedAt)}</div>
                    {item.pausedReason && <div className="text-[11px] text-amber-700 mt-1">{item.pausedReason}{item.pauseUntil ? ` · đến ${formatDate(item.pauseUntil)}` : ""}</div>}
                  </div>
                  <div className="flex gap-1">
                    {item.status === "paused" && <button title="Tiếp tục" onClick={() => changeEnrollment("resume", item.id)} className="p-1.5 rounded-lg border border-gray-200 bg-white"><Play size={12} /></button>}
                    {item.status === "active" && <button title="Tạm dừng 24 giờ" onClick={() => changeEnrollment("pause", item.id)} className="p-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700"><Pause size={12} /></button>}
                    {["active", "paused"].includes(item.status) && <button title="Hoàn tất" onClick={() => changeEnrollment("complete", item.id)} className="p-1.5 rounded-lg border border-green-200 bg-green-50 text-green-700"><CheckCircle2 size={12} /></button>}
                    {["active", "paused"].includes(item.status) && <button title="Dừng hẳn" onClick={() => changeEnrollment("cancel", item.id)} className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600"><XCircle size={12} /></button>}
                  </div>
                </div>
                {item.replyReview && (
                  <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[11px] font-bold text-orange-900">AI đề xuất · {RECOMMENDATION_LABELS[item.replyReview.recommendation]}</div>
                      <div className="text-[10px] text-orange-700">Tin đến {formatDate(item.replyReview.inboundAt)} · {Math.round(item.replyReview.confidence * 100)}%</div>
                    </div>
                    <blockquote className="mt-2 rounded-lg bg-white/80 px-2.5 py-2 text-[11px] text-gray-700 border-l-2 border-orange-300">
                      “{item.replyReview.message}”
                    </blockquote>
                    <p className="mt-2 text-[11px] text-orange-800">{item.replyReview.reason}</p>
                    <p className="mt-1 text-[10px] font-medium text-green-700">Workflow vẫn đang chạy cho đến khi nhân viên chọn một hành động.</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button onClick={() => reviewReply(item.replyReview!.id, "continue")} className="px-2 py-1 rounded-lg border border-green-200 bg-white text-[10px] font-semibold text-green-700">Bỏ qua · tiếp tục</button>
                      <button onClick={() => reviewReply(item.replyReview!.id, "pause", 24)} className="px-2 py-1 rounded-lg border border-amber-200 bg-white text-[10px] font-semibold text-amber-700">Dừng 24 giờ</button>
                      <button onClick={() => reviewReply(item.replyReview!.id, "pause", 72)} className="px-2 py-1 rounded-lg border border-amber-200 bg-white text-[10px] font-semibold text-amber-700">Dừng 3 ngày</button>
                      <button onClick={() => reviewReply(item.replyReview!.id, "switch")} className="px-2 py-1 rounded-lg border border-blue-200 bg-white text-[10px] font-semibold text-blue-700">Chuyển workflow</button>
                      <button onClick={() => reviewReply(item.replyReview!.id, "complete")} className="px-2 py-1 rounded-lg border border-violet-200 bg-white text-[10px] font-semibold text-violet-700">Hoàn tất</button>
                      <button onClick={() => reviewReply(item.replyReview!.id, "stop")} className="px-2 py-1 rounded-lg border border-red-200 bg-white text-[10px] font-semibold text-red-700">Dừng hẳn</button>
                    </div>
                  </div>
                )}
                {!["completed", "cancelled"].includes(item.status) && (
                  <details className="mt-2 border-t border-gray-200 pt-2">
                    <summary className="cursor-pointer text-[11px] font-semibold text-blue-600">Bổ sung dữ liệu cá nhân hóa</summary>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {contextFields.map(([key, label]) => (
                        <label key={key} className="text-[10px] text-gray-500">{label}
                          <input
                            value={contextDrafts[item.id]?.[key] ?? item.context?.[key] ?? ""}
                            onChange={event => setContextDrafts(current => ({
                              ...current,
                              [item.id]: { ...current[item.id], [key]: event.target.value },
                            }))}
                            className="mt-1 w-full px-2 py-1.5 rounded-lg border border-gray-300 bg-white text-xs text-gray-800"
                          />
                        </label>
                      ))}
                    </div>
                    <button onClick={() => saveContext(item)} disabled={!contextDrafts[item.id]}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold disabled:opacity-40">
                      <Save size={12} /> Lưu dữ liệu cá nhân hóa
                    </button>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-gray-200">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Hoạt động gần đây</h3>
          <div className="space-y-2 max-h-96 overflow-auto">
            {data.recentActions.length === 0 && <p className="text-xs text-gray-500 py-6 text-center">Chưa có hoạt động.</p>}
            {data.recentActions.map(item => (
              <div key={item.id} className="p-3 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Clock3 size={13} className="text-gray-400" />
                    <span className="text-xs font-semibold text-gray-800">{item.stepId}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{statusLabel(item.status)}</span>
                </div>
                <div className="text-[11px] text-gray-500 mt-1">Lịch: {formatDate(item.scheduledAt)}{item.sentChannel ? ` · ${CHANNEL_LABELS[item.sentChannel]}` : ""}</div>
                {item.error && <div className="text-[11px] text-red-600 mt-1">{item.error}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
