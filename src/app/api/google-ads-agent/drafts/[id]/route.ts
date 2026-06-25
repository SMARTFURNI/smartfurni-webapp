import { NextRequest, NextResponse } from "next/server";
import { getGoogleAdsAgentSession } from "@/lib/google-ads-agent/auth";
import { getDraftById, saveDraft } from "@/lib/google-ads-agent/store";
import { validateAIOutput } from "@/lib/google-ads-agent/validation";
import type { AIAdDraftOutput } from "@/lib/google-ads-agent/types";

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getGoogleAdsAgentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const draft = await getDraftById(id);
  if (!draft) return NextResponse.json({ error: "Không tìm thấy bản nháp" }, { status: 404 });

  const body = (await req.json()) as { output?: AIAdDraftOutput };
  if (!body.output) return NextResponse.json({ error: "Thiếu nội dung quảng cáo cần lưu" }, { status: 400 });

  const output: AIAdDraftOutput = {
    ...body.output,
    landingPageUrl: draft.product.landingPageUrl,
  };
  const validationErrors = validateAIOutput(output, draft.product);
  const updated = await saveDraft({
    ...draft,
    output,
    status: "ai_created",
    validationErrors,
    approvedBy: undefined,
    rejectedReason: undefined,
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({
    ...updated,
    savedBy: session.actor,
  });
}
