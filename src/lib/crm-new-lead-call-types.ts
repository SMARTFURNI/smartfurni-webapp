import type { LeadStage } from "./crm-types";

export interface NewLeadCallPolicy {
  enabled: boolean;
  startHour: number;
  endHour: number;
  callsPerDay: number;
  intervalHours: number;
  maxDays: number;
  unlockMinAttempts: number;
  unlockMinAttemptsPerDay: number;
  popupIntervalMinutes: number;
  minAnsweredSeconds: number;
  successStage: LeadStage;
}

export interface NewLeadCallGate {
  enabled: boolean;
  locked: boolean;
  success: boolean;
  reason: string;
  attempts: number;
  requiredAttempts: number;
  qualifiedDays: number;
  requiredDays: number;
  scheduledToday: number;
  completedToday: number;
  nextCallAt: string | null;
  unlockAt: string | null;
}

export interface NewLeadCallReminder {
  scheduleId: string;
  leadId: string;
  leadName: string;
  phone: string;
  assignedTo: string;
  scheduledAt: string;
  dayNumber: number;
  slotNumber: number;
  status: "pending" | "attempted" | "connected";
}

export interface NewLeadCallDashboard {
  customerCount: number;
  dueNowCount: number;
  overdueCount: number;
  scheduledCallCount: number;
  popupIntervalMinutes: number;
  reminders: NewLeadCallReminder[];
}

export const DEFAULT_NEW_LEAD_CALL_POLICY: NewLeadCallPolicy = {
  enabled: true,
  startHour: 9,
  endHour: 20,
  callsPerDay: 3,
  intervalHours: 3,
  maxDays: 3,
  unlockMinAttempts: 6,
  unlockMinAttemptsPerDay: 2,
  popupIntervalMinutes: 60,
  minAnsweredSeconds: 1,
  successStage: "quoted",
};
