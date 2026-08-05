import type { RolePermissions } from "@/lib/crm-roles-store";

export type AiCommandSurface = "crm" | "admin";
export type AiCommandMode = "quick" | "deep" | "execute";
export type AiCommandActorKind = "admin" | "staff";
export type AiRunStatus = "running" | "awaiting_approval" | "completed" | "failed" | "cancelled";
export type AiApprovalStatus = "pending" | "approved" | "rejected" | "expired";
export type AiRiskLevel = "read" | "reversible" | "external" | "sensitive";

export interface AiCommandActor {
  kind: AiCommandActorKind;
  id: string;
  name: string;
  roleId?: string;
}

export interface AiCommandAccess {
  actor: AiCommandActor;
  permissions: RolePermissions | null;
  canView: boolean;
  canApprove: boolean;
}

export interface AiChatThread {
  id: string;
  ownerId: string;
  ownerKind: AiCommandActorKind;
  surface: AiCommandSurface;
  title: string;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
  previousResponseId?: string;
}

export interface AiChatMessage {
  id: string;
  threadId: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AiRunRecord {
  id: string;
  threadId: string;
  actorId: string;
  actorKind: AiCommandActorKind;
  model: string;
  status: AiRunStatus;
  input: string;
  output?: string;
  error?: string;
  usage: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  mode: AiCommandMode;
}

export interface AiToolCallRecord {
  id: string;
  runId: string;
  threadId: string;
  toolName: string;
  riskLevel: AiRiskLevel;
  status: "running" | "completed" | "failed";
  error?: string;
  durationMs: number;
  createdAt: string;
}

export interface AiApprovalRequest {
  id: string;
  runId: string;
  threadId: string;
  toolName: string;
  toolCallId: string;
  title: string;
  description: string;
  arguments: Record<string, unknown>;
  riskLevel: AiRiskLevel;
  status: AiApprovalStatus;
  expiresAt: string;
  decidedAt?: string;
  createdAt: string;
}

export interface AiCommandSnapshot {
  thread: AiChatThread;
  messages: AiChatMessage[];
  runs: AiRunRecord[];
  approvals: AiApprovalRequest[];
  toolCalls: AiToolCallRecord[];
}
