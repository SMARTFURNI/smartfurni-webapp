import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { query, queryOne } from "./db";
import {
  analyzeFacebookGroupRules,
  buildFacebookGroupContactCta,
} from "./facebook-group-marketing-business";
import {
  DEFAULT_FACEBOOK_GROUP_SETTINGS,
  type RuleAnalysis,
} from "./facebook-group-marketing-types";

export type FacebookGroupAiActor = {
  id: string;
  name: string;
  isAdmin?: boolean;
};

export type FacebookGroupAiCandidate = {
  key: string;
  section: string;
  agentType: string;
  targetType?: string;
  targetId?: string;
  title: string;
  summary: string;
  rationale: string;
  evidence: Record<string, unknown>;
  proposedAction: {
    type: "navigate" | "review" | "draft";
    label: string;
    href: string;
  };
  confidence: number;
  priority: "critical" | "high" | "medium" | "low";
  risk: "high" | "medium" | "low";
  requiresApproval: boolean;
};

type AiSnapshot = {
  groups: Array<Record<string, unknown>>;
  campaigns: Array<Record<string, unknown>>;
  content: Array<Record<string, unknown>>;
  tasks: Array<Record<string, unknown>>;
  posts: Array<Record<string, unknown>>;
  comments: Array<Record<string, unknown>>;
  timing: Array<Record<string, unknown>>;
  settings: Record<string, unknown>;
};

const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
const recommendationLimit = 18;
const aiPromptVersion = "fbg-ops-v1";

const stringValue = (value: unknown) => String(value ?? "").trim();
const numberValue = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const dateValue = (value: unknown) => {
  const parsed = value ? new Date(String(value)) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
};

function candidate(input: Omit<FacebookGroupAiCandidate, "key">): FacebookGroupAiCandidate {
  const identity = [
    input.agentType,
    input.targetType || input.section,
    input.targetId || "module",
    input.title,
  ].join(":");
  return { ...input, key: createHash("sha1").update(identity).digest("hex").slice(0, 20) };
}

export function buildFacebookGroupOperationalCandidates(
  snapshot: AiSnapshot,
  now = new Date(),
): FacebookGroupAiCandidate[] {
  const result: FacebookGroupAiCandidate[] = [];
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60_000);
  const responseTargetMinutes = Math.max(1, numberValue(snapshot.settings.responseTargetMinutes) || 30);
  const responseCutoff = new Date(now.getTime() - responseTargetMinutes * 60_000);

  for (const group of snapshot.groups) {
    const groupId = stringValue(group.id);
    const name = stringValue(group.name) || "Group chưa đặt tên";
    const status = stringValue(group.status);
    const analyzedAt = dateValue(group.analyzed_at);
    const allowsPages = stringValue(group.allows_pages);
    const membership = stringValue(group.membership_status);
    const grade = stringValue(group.grade) || "D";
    const rejected = numberValue(group.rejected_posts);
    const totalPosts = numberValue(group.total_posts);

    if (status === "needs_review" || !analyzedAt || allowsPages === "unknown") {
      result.push(candidate({
        section: "groups",
        agentType: "group_research",
        targetType: "group",
        targetId: groupId,
        title: `Hoàn thiện xác minh Group “${name}”`,
        summary: "Group chưa đủ dữ liệu để AI đánh giá và chưa nên đưa vào chiến dịch.",
        rationale: !analyzedAt
          ? "Chưa có lần phân tích nội quy được ghi nhận."
          : allowsPages === "unknown"
            ? "Chưa xác nhận Group có cho phép Fanpage."
            : "Group đang ở trạng thái cần kiểm tra.",
        evidence: { status, analyzedAt, allowsPages, membership, grade },
        proposedAction: {
          type: "navigate",
          label: "Mở danh sách Group",
          href: "/crm/facebook-group-marketing/groups",
        },
        confidence: 98,
        priority: status === "needs_review" ? "high" : "medium",
        risk: "medium",
        requiresApproval: true,
      }));
    }

    if (totalPosts >= 2 && rejected >= 2 && rejected / totalPosts >= 0.5) {
      result.push(candidate({
        section: "groups",
        agentType: "group_quality",
        targetType: "group",
        targetId: groupId,
        title: `Xem lại hiệu quả Group “${name}”`,
        summary: `${rejected}/${totalPosts} bài bị từ chối; nên kiểm tra nội quy và cách tiếp cận trước lần đăng tiếp theo.`,
        rationale: "Tỷ lệ từ chối cao làm tăng rủi ro cho Fanpage và lãng phí thời gian nhân viên.",
        evidence: { totalPosts, rejectedPosts: rejected, grade },
        proposedAction: {
          type: "review",
          label: "Kiểm tra Group",
          href: "/crm/facebook-group-marketing/groups",
        },
        confidence: 95,
        priority: "high",
        risk: "high",
        requiresApproval: true,
      }));
    }
  }

  for (const campaign of snapshot.campaigns) {
    const campaignId = stringValue(campaign.id);
    const name = stringValue(campaign.name) || "Chiến dịch";
    const status = stringValue(campaign.status);
    const groupCount = numberValue(campaign.group_count);
    const productCount = numberValue(campaign.product_count);
    const endDate = dateValue(campaign.end_date);

    if (status === "draft" && (groupCount === 0 || productCount === 0 || !campaign.page_id)) {
      const gradeOrder: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
      const suggestedGroups = snapshot.groups
        .filter(group => group.status === "active"
          && group.membership_status === "joined"
          && group.allows_pages === "yes")
        .sort((left, right) =>
          (gradeOrder[stringValue(left.grade)] ?? 4) - (gradeOrder[stringValue(right.grade)] ?? 4)
          || numberValue(right.quality_score) - numberValue(left.quality_score))
        .slice(0, 5)
        .map(group => ({
          id: group.id,
          name: group.name,
          grade: group.grade,
          score: numberValue(group.quality_score),
        }));
      result.push(candidate({
        section: "campaigns",
        agentType: "campaign_planner",
        targetType: "campaign",
        targetId: campaignId,
        title: `Hoàn thiện kế hoạch “${name}”`,
        summary: "Chiến dịch chưa đủ Fanpage, sản phẩm hoặc Group mục tiêu để kích hoạt.",
        rationale: "AI chỉ nên lập nội dung và lịch sau khi các đối tượng vận hành thật đã được chọn.",
        evidence: {
          pageId: campaign.page_id || null,
          groupCount,
          productCount,
          status,
          suggestedGroups,
        },
        proposedAction: {
          type: "review",
          label: "Mở chiến dịch",
          href: "/crm/facebook-group-marketing/campaigns",
        },
        confidence: 99,
        priority: "high",
        risk: "medium",
        requiresApproval: true,
      }));
    }

    if (status === "active" && endDate && endDate <= new Date(now.getTime() + 3 * 86400_000)) {
      result.push(candidate({
        section: "campaigns",
        agentType: "campaign_planner",
        targetType: "campaign",
        targetId: campaignId,
        title: `Chiến dịch “${name}” sắp kết thúc`,
        summary: "Cần đối chiếu mục tiêu, số bài, khách hàng và doanh thu trước khi đóng chiến dịch.",
        rationale: "Chiến dịch còn dưới ba ngày nhưng vẫn đang hoạt động.",
        evidence: { endDate: endDate.toISOString(), status, groupCount },
        proposedAction: {
          type: "navigate",
          label: "Xem báo cáo",
          href: "/crm/facebook-group-marketing/reports",
        },
        confidence: 96,
        priority: "high",
        risk: "medium",
        requiresApproval: true,
      }));
    }
  }

  for (const draft of snapshot.content) {
    const contentId = stringValue(draft.id);
    const status = stringValue(draft.status);
    const groupName = stringValue(draft.group_name) || "Group chưa chọn";
    const duplicateRatio = numberValue(draft.duplicate_ratio);
    const rulePassed = draft.rule_passed === true || stringValue(draft.rule_passed) === "true";

    if (status === "rewrite_required" || duplicateRatio > 50 || !rulePassed) {
      result.push(candidate({
        section: "content",
        agentType: "content_compliance",
        targetType: "content",
        targetId: contentId,
        title: `Viết lại nội dung cho ${groupName}`,
        summary: status === "rewrite_required"
          ? "Nội dung đã bị yêu cầu viết lại."
          : duplicateRatio > 50
            ? `Tỷ lệ trùng lặp ${duplicateRatio}% vượt ngưỡng an toàn.`
            : "Nội dung chưa đạt kiểm tra nội quy.",
        rationale: "Nội dung không đạt điều kiện sẽ không thể xếp lịch.",
        evidence: { status, duplicateRatio, rulePassed, sourceCode: draft.source_code || null },
        proposedAction: {
          type: "draft",
          label: "Mở kho nội dung",
          href: "/crm/facebook-group-marketing/content",
        },
        confidence: 99,
        priority: status === "rewrite_required" ? "high" : "medium",
        risk: "high",
        requiresApproval: true,
      }));
    } else if (status === "pending_approval" || status === "review") {
      result.push(candidate({
        section: "content",
        agentType: "content_compliance",
        targetType: "content",
        targetId: contentId,
        title: `Nội dung đang chờ duyệt cho ${groupName}`,
        summary: "Nội dung đã sẵn sàng để người có quyền kiểm tra và duyệt.",
        rationale: "Duyệt sớm giúp lịch đăng không bị nghẽn.",
        evidence: { status, duplicateRatio, rulePassed, sourceCode: draft.source_code || null },
        proposedAction: {
          type: "review",
          label: "Duyệt nội dung",
          href: "/crm/facebook-group-marketing/content",
        },
        confidence: 97,
        priority: "medium",
        risk: "medium",
        requiresApproval: true,
      }));
    }
  }

  for (const task of snapshot.tasks) {
    const taskId = stringValue(task.id);
    const groupName = stringValue(task.group_name) || "Group";
    const dueAt = dateValue(task.due_at);
    const scheduledAt = dateValue(task.scheduled_at);
    const status = stringValue(task.status);
    const unassigned = !task.assigned_staff_id;

    if (["scheduled", "due"].includes(status) && dueAt && dueAt < now) {
      result.push(candidate({
        section: "tasks",
        agentType: "task_dispatcher",
        targetType: "publishing_task",
        targetId: taskId,
        title: `Nhiệm vụ đăng bài vào ${groupName} đã quá hạn`,
        summary: "Cần phân công lại, hoãn lịch hoặc hoàn tất ngay để tránh sai nhịp chiến dịch.",
        rationale: "Hạn nhiệm vụ đã qua nhưng CRM chưa ghi nhận bài đăng.",
        evidence: {
          dueAt: dueAt.toISOString(),
          scheduledAt: scheduledAt?.toISOString() || null,
          assignedStaffId: task.assigned_staff_id || null,
          status,
        },
        proposedAction: {
          type: "review",
          label: "Xử lý nhiệm vụ",
          href: "/crm/facebook-group-marketing/tasks",
        },
        confidence: 100,
        priority: "critical",
        risk: "high",
        requiresApproval: true,
      }));
    } else if (["scheduled", "due"].includes(status) && unassigned) {
      result.push(candidate({
        section: "calendar",
        agentType: "schedule_optimizer",
        targetType: "publishing_task",
        targetId: taskId,
        title: `Lịch đăng ${groupName} chưa có nhân viên`,
        summary: "Nhiệm vụ cần người phụ trách trước giờ đăng.",
        rationale: "Không có nhân viên đồng nghĩa PWA không có đúng người nhận.",
        evidence: {
          scheduledAt: scheduledAt?.toISOString() || null,
          status,
        },
        proposedAction: {
          type: "review",
          label: "Phân công lịch",
          href: "/crm/facebook-group-marketing/calendar",
        },
        confidence: 100,
        priority: scheduledAt && scheduledAt <= todayEnd ? "high" : "medium",
        risk: "medium",
        requiresApproval: true,
      }));
    }
  }

  const bestTiming = snapshot.timing[0];
  if (bestTiming && numberValue(bestTiming.post_count) >= 3) {
    const hour = numberValue(bestTiming.post_hour);
    result.push(candidate({
      section: "calendar",
      agentType: "schedule_optimizer",
      targetType: "calendar",
      targetId: "recommended-time",
      title: `Khung giờ ${String(hour).padStart(2, "0")}:00 đang có tín hiệu tốt`,
      summary: `Dữ liệu ${numberValue(bestTiming.post_count)} bài cho thấy trung bình ${numberValue(bestTiming.average_comments).toFixed(1)} bình luận/bài.`,
      rationale: "Đây là gợi ý từ lịch sử nội bộ, không tự thay đổi các nhiệm vụ đã xếp.",
      evidence: {
        hour,
        postCount: numberValue(bestTiming.post_count),
        averageComments: numberValue(bestTiming.average_comments),
      },
      proposedAction: {
        type: "review",
        label: "Xem lịch đăng",
        href: "/crm/facebook-group-marketing/calendar",
      },
      confidence: Math.min(92, 60 + numberValue(bestTiming.post_count) * 3),
      priority: "low",
      risk: "low",
      requiresApproval: true,
    }));
  }

  for (const post of snapshot.posts) {
    const postId = stringValue(post.id);
    const groupName = stringValue(post.group_name) || "Group";
    const moderation = stringValue(post.moderation_status);
    const actualPostedAt = dateValue(post.actual_posted_at);

    if (moderation === "pending" && actualPostedAt && actualPostedAt < sixHoursAgo) {
      result.push(candidate({
        section: "posts",
        agentType: "post_monitor",
        targetType: "published_post",
        targetId: postId,
        title: `Bài trong ${groupName} chờ duyệt quá lâu`,
        summary: "Nhân viên cần mở bài, kiểm tra trạng thái thật và cập nhật CRM.",
        rationale: "Bài đã chờ duyệt trên sáu giờ, có thể đã bị ẩn hoặc từ chối.",
        evidence: {
          moderationStatus: moderation,
          actualPostedAt: actualPostedAt.toISOString(),
          postUrl: post.post_url || null,
        },
        proposedAction: {
          type: "review",
          label: "Kiểm tra bài đăng",
          href: "/crm/facebook-group-marketing/posts",
        },
        confidence: 98,
        priority: "high",
        risk: "medium",
        requiresApproval: true,
      }));
    }

    if (moderation === "rejected") {
      result.push(candidate({
        section: "posts",
        agentType: "post_monitor",
        targetType: "published_post",
        targetId: postId,
        title: `Phân tích bài bị từ chối trong ${groupName}`,
        summary: "Nên đối chiếu lý do từ chối với nội quy và tạo phiên bản mới trước khi đăng lại.",
        rationale: "Kết quả kiểm duyệt thật là tín hiệu quan trọng để AI học cách viết cho Group.",
        evidence: {
          moderationStatus: moderation,
          reason: post.moderation_reason || null,
          sourceCode: post.source_code || null,
        },
        proposedAction: {
          type: "draft",
          label: "Mở bài bị từ chối",
          href: "/crm/facebook-group-marketing/posts",
        },
        confidence: 99,
        priority: "high",
        risk: "high",
        requiresApproval: true,
      }));
    }
  }

  for (const comment of snapshot.comments) {
    const commentId = stringValue(comment.id);
    const groupName = stringValue(comment.group_name) || "Group";
    const commentedAt = dateValue(comment.commented_at);
    const temperature = stringValue(comment.temperature);
    const replied = Boolean(comment.replied);
    const leadId = stringValue(comment.lead_id);

    if (!replied && (temperature === "hot" || (commentedAt && commentedAt < responseCutoff))) {
      result.push(candidate({
        section: "comments",
        agentType: "engagement_assistant",
        targetType: "comment",
        targetId: commentId,
        title: `Phản hồi khách ${stringValue(comment.facebook_name) || "Facebook"} trong ${groupName}`,
        summary: temperature === "hot"
          ? "Bình luận được đánh dấu nóng nhưng chưa trả lời."
          : `Bình luận chưa được phản hồi trong ${responseTargetMinutes} phút.`,
        rationale: "Phản hồi sớm giúp tăng khả năng chuyển từ bình luận sang Messenger.",
        evidence: {
          commentedAt: commentedAt?.toISOString() || null,
          temperature,
          intent: comment.intent || "other",
          replied,
          leadId: leadId || null,
        },
        proposedAction: {
          type: "draft",
          label: "Soạn câu trả lời",
          href: "/crm/facebook-group-marketing/comments",
        },
        confidence: 99,
        priority: temperature === "hot" ? "critical" : "high",
        risk: "medium",
        requiresApproval: true,
      }));
    } else if (replied && !leadId && Boolean(comment.entered_messenger)) {
      result.push(candidate({
        section: "comments",
        agentType: "lead_attribution",
        targetType: "comment",
        targetId: commentId,
        title: "Gắn khách Messenger với hồ sơ CRM",
        summary: "Khách đã vào Messenger nhưng bình luận chưa liên kết với lead CRM.",
        rationale: "Thiếu liên kết sẽ làm sai báo cáo nguồn và doanh thu.",
        evidence: {
          sourceCode: comment.source_code || null,
          enteredMessenger: true,
          leadId: null,
        },
        proposedAction: {
          type: "review",
          label: "Gắn khách hàng",
          href: "/crm/facebook-group-marketing/comments",
        },
        confidence: 100,
        priority: "high",
        risk: "medium",
        requiresApproval: true,
      }));
    }
  }

  const duplicateThreshold = numberValue(snapshot.settings.maxDuplicateRatio);
  if (duplicateThreshold > 60) {
    result.push(candidate({
      section: "settings",
      agentType: "configuration_guard",
      targetType: "settings",
      targetId: "default",
      title: "Ngưỡng trùng lặp đang cao",
      summary: `Ngưỡng ${duplicateThreshold}% có thể khiến nội dung giữa các Group quá giống nhau.`,
      rationale: "Yêu cầu nghiệp vụ mặc định khuyến nghị tối đa 50%.",
      evidence: { maxDuplicateRatio: duplicateThreshold, recommended: 50 },
      proposedAction: {
        type: "review",
        label: "Kiểm tra cài đặt",
        href: "/crm/facebook-group-marketing/settings",
      },
      confidence: 94,
      priority: "medium",
      risk: "medium",
      requiresApproval: true,
    }));
  }

  const groupsWithPosts = snapshot.groups.filter(group => numberValue(group.total_posts) > 0);
  const totalMessenger = groupsWithPosts.reduce(
    (sum, group) => sum + numberValue(group.total_messenger_leads),
    0,
  );
  if (groupsWithPosts.length && totalMessenger === 0) {
    result.push(candidate({
      section: "reports",
      agentType: "performance_analyst",
      targetType: "report",
      targetId: "conversion-gap",
      title: "Đã có bài đăng nhưng chưa ghi nhận khách Messenger",
      summary: "Cần kiểm tra CTA, mã nguồn và quy trình gắn khách để phân biệt vấn đề nội dung với thiếu attribution.",
      rationale: "Không có Messenger sau khi đã đăng bài là tín hiệu cần điều tra, chưa đủ cơ sở kết luận Group không hiệu quả.",
      evidence: {
        groupsWithPosts: groupsWithPosts.length,
        posts: groupsWithPosts.reduce((sum, group) => sum + numberValue(group.total_posts), 0),
        messengerLeads: totalMessenger,
      },
      proposedAction: {
        type: "review",
        label: "Mở báo cáo",
        href: "/crm/facebook-group-marketing/reports",
      },
      confidence: 92,
      priority: "high",
      risk: "medium",
      requiresApproval: true,
    }));
  }

  const topRevenueGroup = [...snapshot.groups]
    .sort((left, right) => numberValue(right.total_revenue) - numberValue(left.total_revenue))[0];
  if (topRevenueGroup && numberValue(topRevenueGroup.total_revenue) > 0) {
    result.push(candidate({
      section: "reports",
      agentType: "performance_analyst",
      targetType: "group",
      targetId: stringValue(topRevenueGroup.id),
      title: `Nhân rộng tín hiệu từ “${stringValue(topRevenueGroup.name)}”`,
      summary: `Group đang dẫn đầu với doanh thu quy nguồn ${numberValue(topRevenueGroup.total_revenue).toLocaleString("vi-VN")} đồng.`,
      rationale: "Nên đối chiếu nội dung, sản phẩm, khung giờ và nhân viên đã tạo kết quả trước khi mở rộng.",
      evidence: {
        revenue: numberValue(topRevenueGroup.total_revenue),
        messengerLeads: numberValue(topRevenueGroup.total_messenger_leads),
        grade: topRevenueGroup.grade,
      },
      proposedAction: {
        type: "review",
        label: "Phân tích báo cáo",
        href: "/crm/facebook-group-marketing/reports",
      },
      confidence: 96,
      priority: "medium",
      risk: "low",
      requiresApproval: true,
    }));
  }

  if (!snapshot.groups.length) {
    result.push(candidate({
      section: "overview",
      agentType: "operations_coordinator",
      targetType: "module",
      targetId: "facebook-group-marketing",
      title: "Chưa có Group đủ điều kiện vận hành",
      summary: "Hãy thêm và xác minh ít nhất một Group thật trước khi tạo chiến dịch.",
      rationale: "Không có Group thì các bước nội dung, lịch và nhiệm vụ không thể chạy.",
      evidence: { groupCount: 0 },
      proposedAction: {
        type: "navigate",
        label: "Tìm Group",
        href: "/crm/facebook-group-marketing/groups",
      },
      confidence: 100,
      priority: "critical",
      risk: "low",
      requiresApproval: false,
    }));
  }

  return result.sort((left, right) =>
    priorityOrder[left.priority] - priorityOrder[right.priority]
    || right.confidence - left.confidence,
  );
}

async function generateJson<T>(prompt: string): Promise<{ result: T; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY chưa được cấu hình.");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.15,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
      signal: AbortSignal.timeout(60_000),
    },
  );
  const payload = await response.json().catch(() => ({})) as {
    error?: { message?: string };
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  if (!response.ok) throw new Error(payload.error?.message || "AI chưa trả về kết quả.");
  const raw = payload.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("") || "";
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  return { result: JSON.parse(cleaned) as T, model };
}

async function loadAiSnapshot(): Promise<AiSnapshot> {
  const [groups, campaigns, content, tasks, posts, comments, timing, settingsRow] = await Promise.all([
    query(
      `SELECT g.id, g.name, g.status, g.allows_pages, g.membership_status, g.grade,
              g.total_posts, g.rejected_posts, g.quality_score,
              g.total_messenger_leads, g.total_revenue, r.analyzed_at
       FROM facebook_groups g
       LEFT JOIN facebook_group_rules r ON r.group_id = g.id
       WHERE g.deleted_at IS NULL`,
    ),
    query(
      `SELECT c.id, c.name, c.page_id, c.status, c.end_date,
              jsonb_array_length(COALESCE(c.product_ids, '[]'::jsonb)) AS product_count,
              COUNT(t.group_id)::int AS group_count
       FROM facebook_group_campaigns c
       LEFT JOIN facebook_group_campaign_targets t ON t.campaign_id = c.id
       WHERE c.deleted_at IS NULL
       GROUP BY c.id`,
    ),
    query(
      `SELECT c.id, c.status, c.source_code, c.duplicate_ratio,
              COALESCE((c.rule_check->>'passed')::boolean, false) AS rule_passed,
              g.name AS group_name
       FROM facebook_group_content_drafts c
       LEFT JOIN facebook_groups g ON g.id = c.group_id
       WHERE c.deleted_at IS NULL
         AND c.status NOT IN ('archived', 'used')`,
    ),
    query(
      `SELECT t.id, t.status, t.scheduled_at, t.due_at, t.assigned_staff_id,
              g.name AS group_name
       FROM facebook_group_publishing_tasks t
       JOIN facebook_groups g ON g.id = t.group_id
       WHERE t.deleted_at IS NULL
         AND t.status IN ('scheduled', 'due')`,
    ),
    query(
      `SELECT p.id, p.moderation_status, p.actual_posted_at, p.post_url,
              p.source_code, p.metrics->>'moderationReason' AS moderation_reason,
              g.name AS group_name
       FROM facebook_group_published_posts p
       JOIN facebook_groups g ON g.id = p.group_id
       WHERE p.deleted_at IS NULL
         AND p.moderation_status IN ('pending', 'rejected')`,
    ),
    query(
      `SELECT c.id, c.facebook_name, c.commented_at, c.intent, c.temperature,
              c.replied, c.entered_messenger, c.lead_id, p.source_code,
              g.name AS group_name
       FROM facebook_group_comments c
       JOIN facebook_group_published_posts p ON p.id = c.post_id
       JOIN facebook_groups g ON g.id = p.group_id
       WHERE c.deleted_at IS NULL
         AND (c.replied = FALSE OR (c.entered_messenger = TRUE AND c.lead_id IS NULL))`,
    ),
    query(
      `SELECT EXTRACT(HOUR FROM p.actual_posted_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int AS post_hour,
              COUNT(*)::int AS post_count,
              AVG(COALESCE((p.metrics->>'comments')::numeric, 0))::float AS average_comments
       FROM facebook_group_published_posts p
       WHERE p.deleted_at IS NULL
         AND p.moderation_status = 'approved'
         AND p.actual_posted_at >= NOW() - INTERVAL '90 days'
       GROUP BY post_hour
       ORDER BY average_comments DESC, post_count DESC
       LIMIT 3`,
    ),
    queryOne<{ settings: Record<string, unknown> | string }>(
      `SELECT settings FROM facebook_group_settings WHERE id = 'default'`,
    ),
  ]);
  const settings = typeof settingsRow?.settings === "string"
    ? JSON.parse(settingsRow.settings)
    : settingsRow?.settings || {};
  return { groups, campaigns, content, tasks, posts, comments, timing, settings };
}

async function rankCandidatesWithAi(
  candidates: FacebookGroupAiCandidate[],
  feedback: Array<Record<string, unknown>> = [],
) {
  if (!candidates.length) return { candidates, model: "rules-engine" };
  try {
    const { result, model } = await generateJson<{
      recommendations?: Array<{
        key?: string;
        summary?: string;
        rationale?: string;
        confidence?: number;
      }>;
    }>(`Bạn là AI điều phối vận hành Facebook Group Marketing của SmartFurni.
Hệ thống chỉ đăng thủ công. Không đề xuất bot đăng bài, tự tham gia Group, tự trả lời
bình luận, lưu cookie/token hoặc quét Group riêng tư.

Từ danh sách tín hiệu CRM dưới đây, chọn tối đa ${recommendationLimit} việc quan trọng nhất.
Chỉ được dùng key đã có; không bịa bản ghi, số liệu hoặc hành động mới.
Viết summary và rationale ngắn, rõ, bằng tiếng Việt.

Phản hồi lịch sử theo loại Agent (chỉ dùng để ưu tiên, không bỏ qua cảnh báo khẩn cấp):
${JSON.stringify(feedback)}

Tín hiệu:
${JSON.stringify(candidates)}

Trả về JSON:
{"recommendations":[{"key":"key có sẵn","summary":"việc cần làm","rationale":"lý do dựa trên bằng chứng","confidence":95}]}`);
    const byKey = new Map(candidates.map(item => [item.key, item]));
    const ranked = (result.recommendations || []).flatMap(item => {
      const source = item.key ? byKey.get(item.key) : null;
      if (!source) return [];
      byKey.delete(source.key);
      const confidence = Math.min(100, Math.max(0, numberValue(item.confidence) || source.confidence));
      return [{
        ...source,
        summary: stringValue(item.summary) || source.summary,
        rationale: stringValue(item.rationale) || source.rationale,
        confidence,
      }];
    });
    return {
      candidates: [...ranked, ...[...byKey.values()]].slice(0, recommendationLimit),
      model,
    };
  } catch (error) {
    console.error("[Facebook Group AI] Không thể xếp hạng bằng Gemini:", error);
    return { candidates: candidates.slice(0, recommendationLimit), model: "rules-engine-fallback" };
  }
}

function recommendationFingerprint(item: FacebookGroupAiCandidate) {
  return createHash("sha256").update(JSON.stringify({
    key: item.key,
    evidence: item.evidence,
    proposedAction: item.proposedAction,
  })).digest("hex");
}

async function logAiActivity(
  actor: FacebookGroupAiActor,
  action: string,
  entityId?: string,
  metadata: Record<string, unknown> = {},
) {
  await query(
    `INSERT INTO facebook_group_activity_logs
     (id, action, entity_type, entity_id, actor_id, metadata)
     VALUES ($1, $2, 'ai_recommendation', $3, $4, $5::jsonb)`,
    [
      `fbgal_${randomUUID()}`,
      action,
      entityId || null,
      actor.id,
      JSON.stringify({ ...metadata, actorName: actor.name }),
    ],
  );
}

export async function generateFacebookGroupAiRecommendations(
  actor: FacebookGroupAiActor,
  section?: string,
) {
  const recentRun = await queryOne<{
    id: string;
    model: string | null;
    candidate_count: number;
    recommendation_count: number;
  }>(
    `SELECT id, model, candidate_count, recommendation_count
     FROM facebook_group_ai_runs
     WHERE started_by = $1
       AND COALESCE(section, '') = COALESCE($2, '')
       AND started_at >= NOW() - INTERVAL '1 minute'
       AND status = 'completed'
     ORDER BY started_at DESC
     LIMIT 1`,
    [actor.id, section || null],
  );
  if (recentRun) {
    return {
      runId: recentRun.id,
      model: recentRun.model || "cached",
      candidateCount: recentRun.candidate_count,
      recommendationCount: recentRun.recommendation_count,
      cached: true,
    };
  }
  const runId = `fbgair_${randomUUID()}`;
  await query(
    `INSERT INTO facebook_group_ai_runs (id, run_type, section, started_by)
     VALUES ($1, 'operations_review', $2, $3)`,
    [runId, section || null, actor.id],
  );
  try {
    const snapshot = await loadAiSnapshot();
    const allCandidates = buildFacebookGroupOperationalCandidates(snapshot);
    const scoped = section && section !== "overview"
      ? allCandidates.filter(item => item.section === section || item.priority === "critical")
      : allCandidates;
    const feedback = await query(
      `SELECT agent_type AS "agentType",
              COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
              COUNT(*) FILTER (WHERE status = 'applied')::int AS applied,
              COUNT(*) FILTER (WHERE status = 'dismissed')::int AS dismissed
       FROM facebook_group_ai_recommendations
       WHERE reviewed_at IS NOT NULL
       GROUP BY agent_type`,
    );
    const ranked = await rankCandidatesWithAi(scoped, feedback);
    for (const item of ranked.candidates) {
      const fingerprint = recommendationFingerprint(item);
      await query(
        `INSERT INTO facebook_group_ai_recommendations
         (id, fingerprint, section, agent_type, target_type, target_id, title, summary,
          rationale, evidence, proposed_action, confidence, priority, risk,
          requires_approval, model, prompt_version, generated_by, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12,$13,$14,$15,$16,$17,$18,
                 NOW() + INTERVAL '14 days')
         ON CONFLICT (fingerprint) DO UPDATE SET
           title = EXCLUDED.title,
           summary = EXCLUDED.summary,
           rationale = EXCLUDED.rationale,
           evidence = EXCLUDED.evidence,
           proposed_action = EXCLUDED.proposed_action,
           confidence = EXCLUDED.confidence,
           priority = EXCLUDED.priority,
           risk = EXCLUDED.risk,
           model = EXCLUDED.model,
           expires_at = EXCLUDED.expires_at,
           updated_at = NOW(),
           status = CASE
             WHEN facebook_group_ai_recommendations.status IN ('approved','dismissed','applied')
               THEN facebook_group_ai_recommendations.status
             ELSE 'pending'
           END`,
        [
          `fbgai_${randomUUID()}`,
          fingerprint,
          item.section,
          item.agentType,
          item.targetType || null,
          item.targetId || null,
          item.title,
          item.summary,
          item.rationale,
          JSON.stringify(item.evidence),
          JSON.stringify(item.proposedAction),
          item.confidence,
          item.priority,
          item.risk,
          item.requiresApproval,
          ranked.model,
          aiPromptVersion,
          actor.id,
        ],
      );
    }
    await query(
      `UPDATE facebook_group_ai_runs
       SET status = 'completed', model = $1, candidate_count = $2,
           recommendation_count = $3, completed_at = NOW()
       WHERE id = $4`,
      [ranked.model, allCandidates.length, ranked.candidates.length, runId],
    );
    await logAiActivity(actor, "ai.recommendations_generated", runId, {
      section: section || "overview",
      candidateCount: allCandidates.length,
      recommendationCount: ranked.candidates.length,
      model: ranked.model,
    });
    return {
      runId,
      model: ranked.model,
      candidateCount: allCandidates.length,
      recommendationCount: ranked.candidates.length,
    };
  } catch (error) {
    await query(
      `UPDATE facebook_group_ai_runs
       SET status = 'failed', error = $1, completed_at = NOW()
       WHERE id = $2`,
      [error instanceof Error ? error.message : "Không thể phân tích.", runId],
    );
    throw error;
  }
}

export async function refreshFacebookGroupAiRecommendationsIfStale() {
  const refreshHours = Math.max(
    1,
    Number(process.env.FACEBOOK_GROUP_AI_REFRESH_HOURS || 6),
  );
  const recent = await queryOne<{ id: string; started_at: Date }>(
    `SELECT id, started_at
     FROM facebook_group_ai_runs
     WHERE run_type = 'operations_review'
       AND status = 'completed'
       AND started_at >= NOW() - ($1::text || ' hours')::interval
     ORDER BY started_at DESC
     LIMIT 1`,
    [refreshHours],
  );
  if (recent) {
    return { skipped: "fresh", runId: recent.id, refreshHours };
  }
  return generateFacebookGroupAiRecommendations({
    id: "system",
    name: "AI Operations Scheduler",
    isAdmin: true,
  });
}

export async function listFacebookGroupAiRecommendations(filters: {
  section?: string;
  status?: string;
  limit?: number;
}) {
  const limit = Math.min(100, Math.max(1, filters.limit || 30));
  const status = filters.status || "pending";
  return query(
    `SELECT id, section, agent_type AS "agentType", target_type AS "targetType",
            target_id AS "targetId", title, summary, rationale, evidence,
            proposed_action AS "proposedAction", confidence::float, priority, risk,
            status, requires_approval AS "requiresApproval", model,
            generated_by AS "generatedBy", reviewed_by AS "reviewedBy",
            reviewed_at AS "reviewedAt", created_at AS "createdAt",
            updated_at AS "updatedAt"
     FROM facebook_group_ai_recommendations
     WHERE ($1::text IS NULL OR section = $1)
       AND ($2::text = 'all' OR status = $2)
       AND (expires_at IS NULL OR expires_at > NOW() OR status IN ('approved','applied'))
     ORDER BY
       CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1
                     WHEN 'medium' THEN 2 ELSE 3 END,
       confidence DESC, updated_at DESC
     LIMIT $3`,
    [filters.section || null, status, limit],
  );
}

export async function reviewFacebookGroupAiRecommendation(
  recommendationId: string,
  status: "approved" | "dismissed" | "applied",
  actor: FacebookGroupAiActor,
  notes = "",
) {
  const row = await queryOne(
    `UPDATE facebook_group_ai_recommendations
     SET status = $1, reviewed_by = $2, reviewed_at = NOW(),
         review_notes = $3,
         applied_at = CASE WHEN $1 = 'applied' THEN NOW() ELSE applied_at END,
         updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [status, actor.id, notes.slice(0, 2000), recommendationId],
  );
  if (!row) throw new Error("Không tìm thấy đề xuất AI.");
  await logAiActivity(actor, `ai.recommendation_${status}`, recommendationId, { notes });
  return row;
}

export async function analyzeFacebookGroupRulesWithAi(rawText: string) {
  const fallback = analyzeFacebookGroupRules(rawText);
  if (!rawText.trim()) return { analysis: fallback, model: "rules-engine", mode: "fallback" };
  try {
    const { result, model } = await generateJson<Partial<RuleAnalysis>>(
      `Phân tích nội quy Facebook Group do nhân viên đã sao chép vào CRM.
Không truy cập Facebook, không suy đoán điều không có trong văn bản.
Mỗi giá trị cho phép/cấm phải là true, false hoặc null nếu không rõ.

Nội quy:
${rawText.slice(0, 30_000)}

Trả về JSON đúng cấu trúc:
{"allowsSales":null,"allowsPrice":null,"allowsPhone":null,"allowsLink":null,
"requiresSource":null,"hasFrequencyLimit":null,"bannedKeywords":[],
"requiresApproval":null,"suitableFormats":["text"],"warnings":[]}`,
    );
    const tri = (value: unknown) => value === true ? true : value === false ? false : null;
    const analysis: RuleAnalysis = {
      allowsSales: tri(result.allowsSales),
      allowsPrice: tri(result.allowsPrice),
      allowsPhone: tri(result.allowsPhone),
      allowsLink: tri(result.allowsLink),
      requiresSource: tri(result.requiresSource),
      hasFrequencyLimit: tri(result.hasFrequencyLimit),
      bannedKeywords: Array.isArray(result.bannedKeywords)
        ? result.bannedKeywords.map(stringValue).filter(Boolean).slice(0, 30)
        : [],
      requiresApproval: tri(result.requiresApproval),
      suitableFormats: Array.isArray(result.suitableFormats)
        ? result.suitableFormats.map(stringValue).filter(Boolean).slice(0, 10)
        : fallback.suitableFormats,
      warnings: Array.isArray(result.warnings)
        ? result.warnings.map(stringValue).filter(Boolean).slice(0, 20)
        : fallback.warnings,
    };
    return { analysis, model, mode: "ai" };
  } catch (error) {
    console.error("[Facebook Group AI] Phân tích nội quy dùng fallback:", error);
    return { analysis: fallback, model: "rules-engine-fallback", mode: "fallback" };
  }
}

export async function suggestFacebookGroupCommentReply(commentId: string, actor: FacebookGroupAiActor) {
  const context = await queryOne<Record<string, unknown>>(
    `SELECT c.id, c.facebook_name, c.content, c.intent, c.temperature,
            p.source_code, d.opening, d.body, d.cta,
            g.name AS group_name, g.topic, g.region,
            COALESCE(r.raw_text, '') AS rule_text,
            COALESCE(r.analysis, '{}'::jsonb) AS rule_analysis,
            product.data AS product
     FROM facebook_group_comments c
     JOIN facebook_group_published_posts p ON p.id = c.post_id
     JOIN facebook_group_content_drafts d ON d.id = p.content_id
     JOIN facebook_groups g ON g.id = p.group_id
     LEFT JOIN facebook_group_rules r ON r.group_id = g.id
     LEFT JOIN crm_products product ON product.id = d.product_id
     WHERE c.id = $1 AND c.deleted_at IS NULL`,
    [commentId],
  );
  if (!context) throw new Error("Không tìm thấy bình luận.");
  const fallback = {
    intent: stringValue(context.intent) || "other",
    temperature: stringValue(context.temperature) || "cold",
    reply: `Chào ${stringValue(context.facebook_name) || "bạn"}, SmartFurni đã nhận được câu hỏi. Bạn vui lòng nhắn Fanpage để đội ngũ tư vấn kiểm tra thông tin chính xác giúp bạn nhé.`,
    rationale: "Câu trả lời an toàn, không tự bịa giá hoặc thông số.",
    warnings: ["Nhân viên cần kiểm tra lại thông tin trước khi sao chép trả lời."],
  };
  try {
    const { result, model } = await generateJson<{
      intent?: string;
      temperature?: string;
      reply?: string;
      rationale?: string;
      warnings?: string[];
    }>(`Bạn là trợ lý chăm sóc khách hàng SmartFurni trong Facebook Group.
Chỉ soạn bản nháp để nhân viên đọc và tự trả lời. Không tự gửi.
Không bịa giá, kích thước, tồn kho, giao hàng hoặc chính sách.
Không vi phạm nội quy và ưu tiên mời khách nhắn Fanpage khi cần thông tin riêng.

Ngữ cảnh:
${JSON.stringify(context).slice(0, 14_000)}

Trả về JSON:
{"intent":"price|size|delivery|showroom|video|dealer|other",
"temperature":"hot|warm|cold","reply":"câu trả lời ngắn, tự nhiên",
"rationale":"lý do phân loại","warnings":[]}`);
    const intents = new Set(["price", "size", "delivery", "showroom", "video", "dealer", "other"]);
    const temperatures = new Set(["hot", "warm", "cold"]);
    const output = {
      intent: intents.has(stringValue(result.intent)) ? stringValue(result.intent) : fallback.intent,
      temperature: temperatures.has(stringValue(result.temperature))
        ? stringValue(result.temperature)
        : fallback.temperature,
      reply: stringValue(result.reply) || fallback.reply,
      rationale: stringValue(result.rationale) || fallback.rationale,
      warnings: Array.isArray(result.warnings)
        ? result.warnings.map(stringValue).filter(Boolean).slice(0, 10)
        : [],
      model,
    };
    await logAiActivity(actor, "ai.comment_reply_suggested", commentId, {
      model,
      intent: output.intent,
      temperature: output.temperature,
    });
    return output;
  } catch (error) {
    console.error("[Facebook Group AI] Soạn trả lời dùng fallback:", error);
    await logAiActivity(actor, "ai.comment_reply_fallback", commentId);
    return { ...fallback, model: "rules-engine-fallback" };
  }
}

export async function rewriteFacebookGroupContentWithAi(
  contentId: string,
  instruction: string,
  actor: FacebookGroupAiActor,
) {
  const [context, settingsRow] = await Promise.all([
    queryOne<Record<string, unknown>>(
    `SELECT c.id, c.opening, c.body, c.cta, c.content_type, c.source_code,
            g.name AS group_name, g.topic, g.region, g.allows_sales,
            COALESCE(r.raw_text, '') AS rule_text,
            COALESCE(r.analysis, '{}'::jsonb) AS rule_analysis,
            product.data AS product
     FROM facebook_group_content_drafts c
     JOIN facebook_groups g ON g.id = c.group_id
     LEFT JOIN facebook_group_rules r ON r.group_id = g.id
     LEFT JOIN crm_products product ON product.id = c.product_id
     WHERE c.id = $1 AND c.deleted_at IS NULL`,
    [contentId],
    ),
    queryOne<{ settings: Record<string, unknown> | string }>(
      `SELECT settings FROM facebook_group_settings WHERE id = 'default'`,
    ),
  ]);
  if (!context) throw new Error("Không tìm thấy nội dung.");
  const { result, model } = await generateJson<{
    opening?: string;
    body?: string;
    cta?: string;
    contentType?: string;
    changeSummary?: string;
  }>(`Bạn là biên tập viên Facebook Group của SmartFurni.
Viết lại nội dung dựa hoàn toàn trên dữ liệu CRM và nội quy bên dưới.
Không bịa thông số, giá, trải nghiệm khách hàng hoặc cam kết.
Không đổi mã nguồn. Không tự đăng. Mỗi phiên bản phải khác thực chất, không chỉ thay vài từ.

Yêu cầu của nhân viên: ${instruction.slice(0, 2000) || "Viết tự nhiên hơn và giảm nguy cơ spam"}
Ngữ cảnh:
${JSON.stringify(context).slice(0, 16_000)}

Trả về JSON:
{"opening":"câu mở đầu","body":"nội dung chính","cta":"CTA tuân thủ nội quy",
"contentType":"community_share|education|story|sales","changeSummary":"đã thay đổi gì"}`);
  const ruleAnalysis = context.rule_analysis && typeof context.rule_analysis === "object"
    ? context.rule_analysis as Partial<RuleAnalysis>
    : typeof context.rule_analysis === "string"
      ? JSON.parse(context.rule_analysis) as Partial<RuleAnalysis>
      : {};
  const settings = typeof settingsRow?.settings === "string"
    ? JSON.parse(settingsRow.settings)
    : settingsRow?.settings || {};
  const contact = {
    ...DEFAULT_FACEBOOK_GROUP_SETTINGS.contact,
    ...(settings.contact && typeof settings.contact === "object" ? settings.contact : {}),
  };
  let rawCta = stringValue(result.cta);
  if (ruleAnalysis.allowsPhone !== true) {
    rawCta = rawCta.replace(/(?:\+?84|0)(?:[\s.\-]?\d){8,10}/g, "").replace(/[ \t]{2,}/g, " ").trim();
  }
  if (ruleAnalysis.allowsLink !== true) {
    rawCta = rawCta.replace(/https?:\/\/\S+/gi, "").replace(/[ \t]{2,}/g, " ").trim();
  }
  const output = {
    opening: stringValue(result.opening),
    body: stringValue(result.body),
    cta: buildFacebookGroupContactCta({ rawCta, ruleAnalysis, contact }),
    contentType: stringValue(result.contentType) || stringValue(context.content_type),
    changeSummary: stringValue(result.changeSummary),
    model,
  };
  if (!output.body) throw new Error("AI chưa trả về nội dung có thể sử dụng.");
  await logAiActivity(actor, "ai.content_rewritten", contentId, { model, instruction });
  return output;
}
