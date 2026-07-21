import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin-auth";
import { initDbOnce } from "@/lib/db-init";
import { generateContentPlan } from "@/lib/content-agent-engine";
import { getContentPlans, saveContentPlan } from "@/lib/content-agent-store";

const requestSchema = z.object({
  name: z.string().min(3).max(120),
  goal: z.string().min(10).max(600),
  audience: z.string().min(5).max(600),
  productFamilySlug: z.string().min(3),
  horizonWeeks: z.number().int().min(1).max(12),
  weeklyCadence: z.number().int().min(1).max(4),
});

export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await initDbOnce();
  return NextResponse.json({ plans: getContentPlans() });
}

export async function POST(req: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await initDbOnce();
  try {
    const input = requestSchema.parse(await req.json());
    const plan = await generateContentPlan(input);
    await saveContentPlan(plan);
    return NextResponse.json({ success: true, plan }, { status: 201 });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues.map((issue) => issue.message).join(", ")
      : (error as Error).message;
    return NextResponse.json({ error: message || "Không thể tạo kế hoạch nội dung" }, { status: 400 });
  }
}
