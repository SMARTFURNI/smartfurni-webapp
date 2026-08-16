import {
  channelSequence,
  missingRequiredContext,
  scheduleJourneyStep,
  type B2BSofaJourneyDefinition,
  type B2BSofaJourneySettings,
  type JourneyChannel,
} from "@/lib/crm-b2b-sofa-journey";

export type WorkflowValidationStatus = "pass" | "warn" | "fail";

export interface WorkflowValidationCheck {
  id: string;
  label: string;
  status: WorkflowValidationStatus;
  detail: string;
  blocking: boolean;
}

export interface WorkflowValidationTimelineStep {
  id: string;
  day: number;
  title: string;
  scheduledAt: string;
  primaryChannel: JourneyChannel;
  fallbackChannels: JourneyChannel[];
  availableChannels: JourneyChannel[];
  missingContext: string[];
  missingMedia: string[];
  status: "ready" | "waiting_content" | "no_channel";
}

export interface WorkflowValidationInput {
  definition: B2BSofaJourneyDefinition;
  settings: B2BSofaJourneySettings;
  enrolledAt: Date;
  context?: Record<string, string>;
  leadSelected: boolean;
  eligibility?: { eligible: boolean; reason?: string } | null;
  providerReady: Record<JourneyChannel, boolean>;
  recipientReady: Record<JourneyChannel, boolean>;
  availableMediaIds: string[];
  scheduler: { lastRunAt: string | null; isRunning: boolean };
  recentProblems?: { failed: number; deliveryUnknown: number; waitingContent: number };
}

const CHANNEL_LABEL: Record<JourneyChannel, string> = {
  zalo_personal: "Zalo cá nhân",
  zalo_oa: "Zalo OA",
  email: "Email",
};

function check(
  id: string,
  label: string,
  status: WorkflowValidationStatus,
  detail: string,
  blocking = status === "fail",
): WorkflowValidationCheck {
  return { id, label, status, detail, blocking };
}

export function buildWorkflowValidation(input: WorkflowValidationInput): {
  ready: boolean;
  score: number;
  checks: WorkflowValidationCheck[];
  timeline: WorkflowValidationTimelineStep[];
} {
  const availableMedia = new Set(input.availableMediaIds);
  const timeline = input.definition.steps.map(step => {
    const attachedMedia = step.mediaAssetIds || [];
    const missingMedia = attachedMedia.filter(id => !availableMedia.has(id));
    const hasAttachedMedia = attachedMedia.length > 0 && missingMedia.length === 0;
    const missingContext = input.leadSelected
      ? missingRequiredContext(step, input.context || {}).filter(variable =>
        !(variable === "approved_demo_video_url" && hasAttachedMedia),
      )
      : [];
    const availableChannels = channelSequence(step).filter(channel =>
      input.providerReady[channel] && (!input.leadSelected || input.recipientReady[channel]),
    );
    const status = missingContext.length > 0 || missingMedia.length > 0
      ? "waiting_content" as const
      : availableChannels.length === 0 ? "no_channel" as const : "ready" as const;
    return {
      id: step.id,
      day: step.day,
      title: step.title,
      scheduledAt: scheduleJourneyStep(input.enrolledAt, step).toISOString(),
      primaryChannel: step.primaryChannel,
      fallbackChannels: step.fallbackChannels,
      availableChannels,
      missingContext,
      missingMedia,
      status,
    };
  });

  const checks: WorkflowValidationCheck[] = [];
  checks.push(input.settings.enabled
    ? check("workflow_enabled", "Trạng thái workflow", "pass", "Workflow đang bật.")
    : check("workflow_enabled", "Trạng thái workflow", "fail", "Workflow đang tắt; scheduler sẽ không thêm lead hoặc gửi bước mới."));
  checks.push(input.settings.autoEnroll
    ? check("auto_enroll", "Tự động nhận lead", "pass", "Lead đủ điều kiện sẽ được kiểm tra ở lần scheduler kế tiếp.")
    : check("auto_enroll", "Tự động nhận lead", "warn", "Tự động thêm lead đang tắt; chỉ lead được thêm thủ công mới tham gia.", false));

  const schedulerAge = input.scheduler.lastRunAt
    ? Date.now() - new Date(input.scheduler.lastRunAt).getTime()
    : Number.POSITIVE_INFINITY;
  checks.push(!input.scheduler.lastRunAt
    ? check("scheduler", "Scheduler", "fail", "Chưa ghi nhận lần chạy scheduler nào.")
    : schedulerAge > 90 * 60_000
      ? check("scheduler", "Scheduler", "fail", `Scheduler đã không cập nhật từ ${input.scheduler.lastRunAt}.`)
      : schedulerAge > 45 * 60_000
        ? check("scheduler", "Scheduler", "warn", `Lần chạy gần nhất: ${input.scheduler.lastRunAt}; đã chậm hơn chu kỳ dự kiến.`, false)
        : check("scheduler", "Scheduler", "pass", `${input.scheduler.isRunning ? "Đang chạy" : "Hoạt động"}; lần gần nhất ${input.scheduler.lastRunAt}.`));

  (Object.keys(CHANNEL_LABEL) as JourneyChannel[]).forEach(channel => {
    checks.push(input.providerReady[channel]
      ? check(`provider_${channel}`, CHANNEL_LABEL[channel], "pass", "Kênh gửi đã sẵn sàng.")
      : check(`provider_${channel}`, CHANNEL_LABEL[channel], "warn", "Kênh chưa sẵn sàng; hệ thống chỉ có thể dùng kênh dự phòng.", false));
  });

  if (!input.leadSelected) {
    checks.push(check("lead_selected", "Lead mô phỏng", "warn", "Chọn một lead CRM để xác nhận điều kiện, biến nội dung và người nhận.", false));
  } else if (input.eligibility?.eligible) {
    checks.push(check("lead_eligible", "Điều kiện lead", "pass", "Lead đủ điều kiện tham gia workflow."));
  } else {
    checks.push(check("lead_eligible", "Điều kiện lead", "fail", input.eligibility?.reason || "Lead không đủ điều kiện."));
  }

  const missingMediaSteps = timeline.filter(step => step.missingMedia.length > 0);
  const dueContextBlocked = timeline.filter(step => step.day === 0 && step.missingContext.length > 0);
  const futureContextWaiting = timeline.filter(step => step.day > 0 && step.missingContext.length > 0);
  checks.push(missingMediaSteps.length
    ? check("content", "Biến và media", "fail", `${missingMediaSteps.length} bước tham chiếu media không còn trong thư viện.`)
    : dueContextBlocked.length
      ? check("content", "Biến và media", "fail", `${dueContextBlocked.length} bước ngày 0 còn thiếu dữ liệu bắt buộc.`)
      : futureContextWaiting.length
        ? check("content", "Biến và media", "warn", `${futureContextWaiting.length} bước tương lai cần bổ sung dữ liệu trước ngày gửi; hệ thống sẽ giữ ở Chờ dữ liệu nếu vẫn thiếu.`, false)
        : check("content", "Biến và media", "pass", "Tất cả bước mô phỏng có đủ dữ liệu và media."));

  const channelBlocked = timeline.filter(step => step.status === "no_channel");
  checks.push(channelBlocked.length
    ? check("channel_coverage", "Đường gửi dự phòng", "fail", `${channelBlocked.length} bước không có kênh khả dụng.`)
    : check("channel_coverage", "Đường gửi dự phòng", "pass", "Mỗi bước có ít nhất một kênh khả dụng."));

  if (input.settings.canaryMode) {
    checks.push(input.settings.canaryLeadIds.length > 0
      ? check("canary", "Chế độ canary", "pass", `Chỉ ${input.settings.canaryLeadIds.length} lead kiểm thử được phép chạy.`)
      : check("canary", "Chế độ canary", "fail", "Canary đang bật nhưng chưa chọn lead; workflow sẽ không gửi tin."));
  } else {
    checks.push(check("canary", "Chế độ canary", "warn", "Canary đang tắt; mọi lead đủ điều kiện đều có thể được thêm.", false));
  }

  const recent = input.recentProblems || { failed: 0, deliveryUnknown: 0, waitingContent: 0 };
  const problemCount = recent.failed + recent.deliveryUnknown + recent.waitingContent;
  checks.push(problemCount > 0
    ? check("recent_problems", "Sự cố đang tồn tại", "warn", `${recent.failed} thất bại, ${recent.deliveryUnknown} cần đối soát, ${recent.waitingContent} chờ dữ liệu.`, false)
    : check("recent_problems", "Sự cố đang tồn tại", "pass", "Không có bước lỗi hoặc chờ xử lý trong trạng thái hiện tại."));

  const blockingChecks = checks.filter(item => item.blocking && item.status === "fail");
  const weighted = checks.reduce((sum, item) => sum + (item.status === "pass" ? 1 : item.status === "warn" ? 0.5 : 0), 0);
  return {
    ready: blockingChecks.length === 0,
    score: Math.round((weighted / Math.max(1, checks.length)) * 100),
    checks,
    timeline,
  };
}
