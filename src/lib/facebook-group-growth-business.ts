import { z } from "zod";

export const facebookGroupGrowthPillarSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(1_000).default(""),
  objective: z.string().max(500).default(""),
  audienceNeed: z.string().max(500).default(""),
  contentRatio: z.coerce.number().min(0).max(100).default(0),
  formats: z.array(z.string().max(100)).max(12).default([]),
  exampleTopics: z.array(z.string().max(300)).max(20).default([]),
});

export const blueprintPlanSchema = z.object({
  nameOptions: z.array(z.string().min(1).max(200)).min(3).max(8),
  selectedName: z.string().min(1).max(200),
  positioning: z.string().min(1).max(2_000),
  description: z.string().min(1).max(5_000),
  rules: z.array(z.string().min(1).max(500)).min(5).max(20),
  membershipQuestions: z.array(z.string().min(1).max(500)).min(2).max(8),
  pillars: z.array(facebookGroupGrowthPillarSchema).min(3).max(8),
  launchPlan: z.object({
    setup: z.array(z.string().max(500)).max(20).default([]),
    first7Days: z.array(z.string().max(500)).max(30).default([]),
    first30Days: z.array(z.string().max(500)).max(60).default([]),
  }),
  kpis: z.object({
    memberTarget30Days: z.coerce.number().min(0).default(0),
    postsPerWeek: z.coerce.number().min(1).max(30).default(4),
    engagementTargetPercent: z.coerce.number().min(0).max(100).default(0),
    qualifiedLeadTarget30Days: z.coerce.number().min(0).default(0),
  }),
});

export const blueprintInputSchema = z.object({
  name: z.string().min(1).max(200),
  groupKind: z.enum(["owned", "external_distribution"]).default("owned"),
  productIds: z.array(z.string().min(1).max(160)).min(1).max(20),
  targetAudience: z.string().min(1).max(2_000),
  region: z.string().max(200).default("Việt Nam"),
  objective: z.string().min(1).max(2_000),
  plan: blueprintPlanSchema,
});

export function totalPillarRatio(plan: z.infer<typeof blueprintPlanSchema>) {
  return plan.pillars.reduce((sum, pillar) => sum + pillar.contentRatio, 0);
}
