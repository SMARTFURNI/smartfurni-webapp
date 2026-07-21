import { dbLoadAll, dbSaveOneAndWait } from "./db-store";
import { registerDbLoader } from "./db-init";

export type FunnelStage = "TOFU" | "MOFU" | "BOFU";
export type ContentPlanItemStatus = "idea" | "approved" | "drafted" | "review" | "ready" | "published";

export interface ContentQaResult {
  score: number;
  passed: boolean;
  checks: Array<{ key: string; label: string; passed: boolean; note: string }>;
  riskFlags: string[];
}

export interface ContentPlanItem {
  id: string;
  funnelStage: FunnelStage;
  title: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  searchIntent: string;
  audiencePainPoint: string;
  angle: string;
  outline: string[];
  cta: string;
  category: "tips-giac-ngu" | "huong-dan-su-dung" | "cap-nhat-san-pham" | "suc-khoe";
  plannedWeek: number;
  status: ContentPlanItemStatus;
  postSlug?: string;
  qa?: ContentQaResult;
}

export interface ContentPlan {
  id: string;
  name: string;
  goal: string;
  audience: string;
  productFamilySlug: string;
  productFamilyLabel: string;
  horizonWeeks: number;
  weeklyCadence: number;
  strategySummary: string;
  funnelAllocation: Record<FunnelStage, number>;
  items: ContentPlanItem[];
  createdAt: string;
  updatedAt: string;
}

const TABLE = "content_agent_plans";
let plans: ContentPlan[] = [];

registerDbLoader(async () => {
  const rows = await dbLoadAll<ContentPlan>(TABLE);
  if (rows) plans = rows;
});

export function getContentPlans(): ContentPlan[] {
  return [...plans].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getContentPlan(id: string): ContentPlan | undefined {
  return plans.find((plan) => plan.id === id);
}

export async function saveContentPlan(plan: ContentPlan): Promise<ContentPlan> {
  const index = plans.findIndex((item) => item.id === plan.id);
  if (index >= 0) plans[index] = plan;
  else plans = [plan, ...plans];
  await dbSaveOneAndWait(TABLE, plan);
  return plan;
}

export async function updateContentPlanItem(
  planId: string,
  itemId: string,
  updates: Partial<ContentPlanItem>,
): Promise<ContentPlan | null> {
  const plan = getContentPlan(planId);
  if (!plan) return null;
  const itemIndex = plan.items.findIndex((item) => item.id === itemId);
  if (itemIndex < 0) return null;
  const updated: ContentPlan = {
    ...plan,
    items: plan.items.map((item, index) => index === itemIndex ? { ...item, ...updates } : item),
    updatedAt: new Date().toISOString(),
  };
  return saveContentPlan(updated);
}

export function createContentPlanId(): string {
  return `cap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createContentItemId(index: number): string {
  return `cai_${Date.now().toString(36)}_${index}_${Math.random().toString(36).slice(2, 6)}`;
}
