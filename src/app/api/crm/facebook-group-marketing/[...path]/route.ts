import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  addRevenueAttribution, analyzeGroupRules, approveContent,
  attachFacebookGroupContentImage,
  completePostCheckTask, createFacebookGroupMarketing, exportFacebookGroupsCsv, getFacebookGroupDashboard, importFacebookGroups,
  createFacebookGroupTopic, deleteFacebookGroupTopic, discoverFacebookGroups,
  getFacebookGroupMarketingOptions, getFacebookGroupSettings,
  linkFacebookGroupLead, listFacebookGroupMarketing,
  markPublishingTaskPosted, recalculateGroupScore, saveFacebookGroupSettings,
  resolveFacebookGroupSourceCode, sendFacebookGroupTaskDigest, suggestFacebookGroupContent,
  softDeleteFacebookGroupMarketing, syncFacebookGroupPagesFromScheduler,
  updateFacebookGroupMarketing, updateFacebookGroupTopic, updateGroupRules, updatePublishedPostModeration,
} from "@/lib/facebook-group-marketing-store";
import {
  authorizeFacebookGroupMarketing, authorizeFacebookGroupMarketingAdmin,
  type FacebookGroupPermission,
} from "@/lib/facebook-group-marketing-auth";
import {
  generateFacebookGroupAiRecommendations,
  listFacebookGroupAiRecommendations,
  reviewFacebookGroupAiRecommendation,
  rewriteFacebookGroupContentWithAi,
  suggestFacebookGroupCommentReply,
} from "@/lib/facebook-group-marketing-ai";
import {
  createFacebookGroupBlueprint,
  generateFacebookGroupBlueprint,
  getFacebookGroupBlueprint,
  listFacebookGroupBlueprints,
  listFacebookGroupGrowthLeads,
  registerOwnedFacebookGroup,
  softDeleteFacebookGroupBlueprint,
  updateFacebookGroupBlueprint,
} from "@/lib/facebook-group-growth-store";
import {
  generateFacebookGroupContentImages,
  persistFacebookGroupGeneratedImage,
} from "@/lib/facebook-group-content-images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

const resourcePermission: Record<string, {
  view: FacebookGroupPermission;
  mutate: FacebookGroupPermission;
}> = {
  pages: { view: "facebook_group_marketing_view", mutate: "facebook_group_settings" },
  groups: { view: "facebook_group_marketing_view", mutate: "facebook_group_manage" },
  campaigns: { view: "facebook_group_marketing_view", mutate: "facebook_group_campaign_manage" },
  content: { view: "facebook_group_marketing_view", mutate: "facebook_group_content_create" },
  tasks: { view: "facebook_group_marketing_view", mutate: "facebook_group_schedule" },
  posts: { view: "facebook_group_marketing_view", mutate: "facebook_group_publish_task" },
  comments: { view: "facebook_group_marketing_view", mutate: "facebook_group_publish_task" },
  checks: { view: "facebook_group_marketing_view", mutate: "facebook_group_publish_task" },
  topics: { view: "facebook_group_marketing_view", mutate: "facebook_group_manage" },
  blueprints: { view: "facebook_group_marketing_view", mutate: "facebook_group_manage" },
};

const safeBody = z.record(z.string(), z.unknown());

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Không thể xử lý yêu cầu.";
  const known = /bắt buộc|không hợp lệ|không tìm thấy|chưa |đã |vượt|trùng|không được|không hỗ trợ/i.test(message);
  return NextResponse.json({ error: message }, { status: known ? 400 : 500 });
}

export async function GET(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params;
    const [resource, entityId, action] = path;
    const auth = await authorizeFacebookGroupMarketing(
      resource === "settings" ? "facebook_group_settings"
        : resource === "reports" ? "facebook_group_reports"
          : "facebook_group_marketing_view",
    );
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const filters = Object.fromEntries(new URL(req.url).searchParams.entries());
    if (resource === "dashboard") return NextResponse.json(await getFacebookGroupDashboard(filters));
    if (resource === "options") return NextResponse.json(await getFacebookGroupMarketingOptions());
    if (resource === "settings") return NextResponse.json(await getFacebookGroupSettings());
    if (resource === "blueprints") {
      return NextResponse.json(entityId
        ? await getFacebookGroupBlueprint(entityId)
        : await listFacebookGroupBlueprints());
    }
    if (resource === "growth-leads") {
      const salesAuth = await authorizeFacebookGroupMarketing("facebook_group_sales");
      if (!salesAuth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      return NextResponse.json(await listFacebookGroupGrowthLeads(filters));
    }
    if (resource === "ai" && entityId === "recommendations") {
      return NextResponse.json(await listFacebookGroupAiRecommendations({
        section: filters.section,
        status: filters.status,
        limit: Number(filters.limit || 30),
      }));
    }
    if (resource === "topics") {
      const settings = await getFacebookGroupSettings();
      return NextResponse.json(settings.groupTopics);
    }
    if (resource === "groups" && entityId === "export") {
      const csv = await exportFacebookGroupsCsv();
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="facebook-groups.csv"',
        },
      });
    }
    if (resource === "reports") return NextResponse.json(await getFacebookGroupDashboard(filters));
    if (!resourcePermission[resource]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(await listFacebookGroupMarketing(resource, filters));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params;
    const [resource, entityId, action] = path;
    const body = safeBody.parse(await req.json());
    let permission = resourcePermission[resource]?.mutate || "facebook_group_marketing_view";
    if (resource === "content" && action === "approve") permission = "facebook_group_content_approve";
    if (resource === "tasks" && action === "mark-posted") permission = "facebook_group_publish_task";
    if (resource === "comments" && action === "suggest-reply") permission = "facebook_group_sales";
    if (resource === "leads") permission = "facebook_group_sales";
    if (resource === "source-code") permission = "facebook_group_sales";
    if (resource === "revenue") permission = "facebook_group_sales";
    if (resource === "settings") permission = "facebook_group_settings";
    if (resource === "ai" && action === "review") permission = "facebook_group_manage";
    if (resource === "blueprints") permission = "facebook_group_manage";
    if (resource === "growth-leads") permission = "facebook_group_sales";
    const auth = await authorizeFacebookGroupMarketing(permission);
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (resource === "groups" && entityId && action === "analyze-rules") {
      return NextResponse.json(await analyzeGroupRules(entityId, auth.actor));
    }
    if (resource === "blueprints" && entityId === "generate") {
      return NextResponse.json(await generateFacebookGroupBlueprint(body, auth.actor));
    }
    if (resource === "blueprints" && entityId && action === "register-group") {
      return NextResponse.json(await registerOwnedFacebookGroup(entityId, body, auth.actor));
    }
    if (resource === "blueprints" && !entityId) {
      return NextResponse.json(await createFacebookGroupBlueprint(body, auth.actor), { status: 201 });
    }
    if (resource === "content" && entityId === "suggest") {
      return NextResponse.json(await suggestFacebookGroupContent(body, auth.actor));
    }
    if (resource === "content" && entityId && action === "ai-rewrite") {
      return NextResponse.json(await rewriteFacebookGroupContentWithAi(
        entityId,
        String(body.instruction || ""),
        auth.actor,
      ));
    }
    if (resource === "content" && entityId && action === "generate-image") {
      return NextResponse.json(await generateFacebookGroupContentImages(entityId, body, auth.actor));
    }
    if (resource === "content" && entityId && action === "approve-image") {
      const dataUrl = String(body.dataUrl || "");
      if (!dataUrl) {
        return NextResponse.json({ error: "Chưa chọn ảnh để dùng cho bài viết." }, { status: 400 });
      }
      const stored = await persistFacebookGroupGeneratedImage(entityId, dataUrl);
      return NextResponse.json(await attachFacebookGroupContentImage(entityId, {
        ...stored,
        model: String(body.model || ""),
        aspectRatio: String(body.aspectRatio || ""),
        usedProductReferences: Boolean(body.usedProductReferences),
      }, auth.actor));
    }
    if (resource === "comments" && entityId && action === "suggest-reply") {
      return NextResponse.json(await suggestFacebookGroupCommentReply(entityId, auth.actor));
    }
    if (resource === "ai" && entityId === "generate") {
      return NextResponse.json(await generateFacebookGroupAiRecommendations(
        auth.actor,
        String(body.section || "") || undefined,
      ));
    }
    if (resource === "ai" && entityId && action === "review") {
      const status = String(body.status || "");
      if (!["approved", "dismissed", "applied"].includes(status)) {
        return NextResponse.json({ error: "Trạng thái duyệt đề xuất AI không hợp lệ." }, { status: 400 });
      }
      return NextResponse.json(await reviewFacebookGroupAiRecommendation(
        entityId,
        status as "approved" | "dismissed" | "applied",
        auth.actor,
        String(body.notes || ""),
      ));
    }
    if (resource === "notifications" && entityId === "sync") {
      return NextResponse.json(await sendFacebookGroupTaskDigest(auth.actor));
    }
    if (resource === "pages" && entityId === "sync") {
      return NextResponse.json(await syncFacebookGroupPagesFromScheduler(auth.actor));
    }
    if (resource === "groups" && entityId === "import") {
      return NextResponse.json(await importFacebookGroups(Array.isArray(body.rows) ? body.rows : [], auth.actor));
    }
    if (resource === "groups" && entityId === "discover") {
      return NextResponse.json(await discoverFacebookGroups(body, auth.actor));
    }
    if (resource === "groups" && entityId && action === "rules") {
      await updateGroupRules(entityId, String(body.rawText || ""), auth.actor);
      return NextResponse.json({ ok: true });
    }
    if (resource === "groups" && entityId && action === "recalculate-score") {
      return NextResponse.json(await recalculateGroupScore(entityId, auth.actor));
    }
    if (resource === "groups" && entityId && action === "set-status") {
      const status = String(body.status || "");
      if (!["active", "paused", "needs_review"].includes(status)) {
        return NextResponse.json({ error: "Trạng thái Group không hợp lệ." }, { status: 400 });
      }
      return NextResponse.json(await updateFacebookGroupMarketing("groups", entityId, { status }, auth.actor));
    }
    if (resource === "content" && entityId && action === "approve") {
      await approveContent(entityId, true, auth.actor);
      return NextResponse.json({ ok: true });
    }
    if (resource === "content" && entityId && action === "reject") {
      await approveContent(entityId, false, auth.actor, String(body.reason || ""));
      return NextResponse.json({ ok: true });
    }
    if (resource === "tasks" && entityId && action === "mark-posted") {
      return NextResponse.json(await markPublishingTaskPosted(entityId, body, auth.actor));
    }
    if (resource === "checks" && entityId && action === "complete") {
      return NextResponse.json(await completePostCheckTask(entityId, body, auth.actor));
    }
    if (resource === "posts" && entityId && action === "moderation") {
      const status = String(body.status || "");
      if (!["approved", "rejected"].includes(status)) {
        return NextResponse.json({ error: "Trạng thái kiểm duyệt không hợp lệ." }, { status: 400 });
      }
      return NextResponse.json(await updatePublishedPostModeration(
        entityId,
        status as "approved" | "rejected",
        auth.actor,
        String(body.reason || ""),
      ));
    }
    if (resource === "leads" && action === "link") {
      return NextResponse.json(await linkFacebookGroupLead(body, auth.actor));
    }
    if (resource === "source-code" && action === "resolve") {
      return NextResponse.json(await resolveFacebookGroupSourceCode(String(body.message || "")));
    }
    if (resource === "revenue" && action === "attribute") {
      return NextResponse.json(await addRevenueAttribution(body, auth.actor));
    }
    if (resource === "settings") {
      return NextResponse.json(await saveFacebookGroupSettings(body, auth.actor));
    }
    if (resource === "topics") {
      return NextResponse.json(await createFacebookGroupTopic(body, auth.actor), { status: 201 });
    }
    if (!resourcePermission[resource]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(await createFacebookGroupMarketing(resource, body, auth.actor), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ.", details: error.flatten() }, { status: 400 });
    }
    return errorResponse(error);
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params;
    const [resource, entityId] = path;
    if (!entityId || !resourcePermission[resource]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    let auth = await authorizeFacebookGroupMarketing(resourcePermission[resource].mutate);
    if (!auth && resource === "comments") {
      auth = await authorizeFacebookGroupMarketing("facebook_group_sales");
    }
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const body = safeBody.parse(await req.json());
    if (resource === "blueprints") {
      return NextResponse.json(await updateFacebookGroupBlueprint(entityId, body, auth.actor));
    }
    if (resource === "topics") {
      return NextResponse.json(await updateFacebookGroupTopic(entityId, body, auth.actor));
    }
    if (resource === "campaigns" && body.status && !["draft", "active", "paused", "completed"].includes(String(body.status))) {
      return NextResponse.json({ error: "Trạng thái chiến dịch không hợp lệ." }, { status: 400 });
    }
    return NextResponse.json(await updateFacebookGroupMarketing(resource, entityId, body, auth.actor));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params;
    const [resource, entityId] = path;
    if (!entityId || !resourcePermission[resource]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const auth = await authorizeFacebookGroupMarketingAdmin();
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (resource === "blueprints") {
      await softDeleteFacebookGroupBlueprint(entityId, auth.actor);
      return NextResponse.json({ ok: true });
    }
    if (resource === "topics") {
      await deleteFacebookGroupTopic(entityId, auth.actor);
      return NextResponse.json({ ok: true });
    }
    await softDeleteFacebookGroupMarketing(resource, entityId, auth.actor);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
