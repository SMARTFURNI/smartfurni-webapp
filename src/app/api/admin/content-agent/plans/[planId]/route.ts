import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin-auth";
import { initDbOnce } from "@/lib/db-init";
import { updateContentPlanItem } from "@/lib/content-agent-store";

const updateSchema = z.object({
  itemId: z.string().min(1),
  status: z.enum(["idea", "approved", "drafted", "review", "ready", "published"]),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ planId: string }> }) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await initDbOnce();
  try {
    const { planId } = await params;
    const body = updateSchema.parse(await req.json());
    const plan = await updateContentPlanItem(planId, body.itemId, { status: body.status });
    if (!plan) return NextResponse.json({ error: "Không tìm thấy kế hoạch hoặc bài viết" }, { status: 404 });
    return NextResponse.json({ success: true, plan });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues.map((issue) => issue.message).join(", ")
      : (error as Error).message;
    return NextResponse.json({ error: message || "Không thể cập nhật" }, { status: 400 });
  }
}
