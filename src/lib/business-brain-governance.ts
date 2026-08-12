import type { KnowledgeDocument, KnowledgeStatus } from "@/types/business-brain";

const STATUS_TRANSITIONS: Record<KnowledgeStatus, KnowledgeStatus[]> = {
  draft: ["in_review", "archived"],
  in_review: ["draft", "approved"],
  approved: ["draft", "scheduled", "active", "archived"],
  scheduled: ["draft", "active", "archived"],
  active: ["draft", "expired", "archived"],
  expired: ["draft", "archived"],
  archived: ["draft"],
};

export function canTransitionKnowledgeStatus(fromStatus: KnowledgeStatus, toStatus: KnowledgeStatus) {
  return fromStatus === toStatus || STATUS_TRANSITIONS[fromStatus]?.includes(toStatus) === true;
}

export function calculateKnowledgeHealth(document: KnowledgeDocument) {
  const metadata = document.metadata || {};
  const checks = [
    { key: "owner", label: "Có người chịu trách nhiệm", pass: Boolean(metadata.owner) },
    { key: "audience", label: "Có đối tượng áp dụng", pass: Boolean(metadata.audience) },
    { key: "summary", label: "Có tóm tắt", pass: Boolean(document.summary) },
    { key: "tags", label: "Có tag tìm kiếm", pass: document.tags.length > 0 },
    { key: "content", label: "Nội dung đủ chi tiết", pass: document.content.trim().length >= 180 },
    { key: "review", label: "Có chu kỳ rà soát", pass: Boolean(metadata.reviewCycle) },
    { key: "flow", label: "Có sơ đồ/quy trình", pass: Array.isArray(metadata.flowSteps) && metadata.flowSteps.length > 0 },
    { key: "approved", label: "Đã qua kiểm soát", pass: ["approved", "scheduled", "active"].includes(document.status) },
  ];
  const score = Math.round((checks.filter(check => check.pass).length / checks.length) * 100);
  return { score, checks, missing: checks.filter(check => !check.pass).map(check => check.label) };
}
