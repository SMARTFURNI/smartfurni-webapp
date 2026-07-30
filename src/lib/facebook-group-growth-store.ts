import "server-only";

import { randomUUID } from "node:crypto";
import { query, queryOne } from "./db";
import { parseFacebookGroupUrl } from "./facebook-group-marketing-business";
import {
  blueprintInputSchema,
  blueprintPlanSchema,
} from "./facebook-group-growth-business";
import { generateFacebookGroupAiJson } from "./facebook-group-ai-provider";

export type GroupGrowthActor = { id: string; name: string; isAdmin?: boolean };

const id = (prefix: string) => `${prefix}_${randomUUID()}`;
const text = (value: unknown, max = 2_000) => String(value ?? "").trim().slice(0, max);
const stringArray = (value: unknown, maxItems = 20, maxLength = 500) =>
  (Array.isArray(value) ? value : [])
    .map(item => text(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);

async function logActivity(
  actor: GroupGrowthActor,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> = {},
) {
  await query(
    `INSERT INTO facebook_group_activity_logs
     (id, action, entity_type, entity_id, actor_id, metadata)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
    [id("fbgal"), action, entityType, entityId, actor.id,
      JSON.stringify({ ...metadata, actorName: actor.name })],
  );
}

async function generateJson<T>(prompt: string, selection?: string) {
  return generateFacebookGroupAiJson<T>({
    prompt,
    selection,
    temperature: 0.35,
    maxOutputTokens: 8_192,
    timeoutMs: 90_000,
  });
}

export async function generateFacebookGroupBlueprint(
  input: Record<string, unknown>,
  actor: GroupGrowthActor,
) {
  const productIds = stringArray(input.productIds, 20, 160);
  const targetAudience = text(input.targetAudience, 2_000);
  const objective = text(input.objective, 2_000);
  const region = text(input.region, 200) || "Việt Nam";
  const groupKind = text(input.groupKind, 40) === "external_distribution"
    ? "external_distribution" : "owned";
  if (!productIds.length || !targetAudience || !objective) {
    throw new Error("Sản phẩm, khách hàng mục tiêu và mục tiêu Group là bắt buộc.");
  }
  const products = await query<{ id: string; data: Record<string, unknown> | string }>(
    `SELECT id, data FROM crm_products
     WHERE id = ANY($1::text[])
       AND COALESCE(data->>'isActive', 'true') = 'true'`,
    [productIds],
  );
  if (products.length !== productIds.length) {
    throw new Error("Có sản phẩm không tồn tại hoặc đã ngừng hoạt động.");
  }
  const groundedProducts = products.map(product => ({
    id: product.id,
    data: typeof product.data === "string" ? JSON.parse(product.data) : product.data,
  }));
  const runId = id("fbgair");
  await query(
    `INSERT INTO facebook_group_ai_runs
     (id, run_type, section, status, prompt_version, input_snapshot, started_by)
     VALUES ($1,'blueprint_builder','builder','running','fbg-growth-blueprint-v1',$2::jsonb,$3)`,
    [runId, JSON.stringify({ productIds, targetAudience, objective, region, groupKind }), actor.id],
  );
  try {
    const generated = await generateJson<unknown>(`Bạn là Group Strategist và Launch Planner của SmartFurni.
Hãy xây dựng bản thiết kế một Facebook Group có thể vận hành thật.

Ràng buộc bắt buộc:
- AI chỉ lập kế hoạch. Không tự tạo Group, tự tham gia, tự mời, tự đăng hay tự nhắn tin.
- Chỉ dùng thông tin sản phẩm CRM bên dưới; không bịa giá, thông số, bảo hành hoặc cam kết.
- Nội dung ưu tiên giá trị cộng đồng, không biến Group thành bảng quảng cáo.
- Viết bằng tiếng Việt rõ ràng, thực tế, phù hợp khu vực.

Loại Group: ${groupKind === "owned" ? "Group SmartFurni sở hữu/quản trị" : "Group cộng đồng bên ngoài để phân phối"}
Khu vực: ${region}
Khách hàng mục tiêu: ${targetAudience}
Mục tiêu: ${objective}
Sản phẩm CRM:
${JSON.stringify(groundedProducts).slice(0, 20_000)}

Trả về duy nhất JSON:
{
  "nameOptions":["ít nhất 3 tên"],
  "selectedName":"tên đề xuất tốt nhất",
  "positioning":"định vị khác biệt",
  "description":"mô tả Group có thể dán vào Facebook",
  "rules":["5-12 nội quy"],
  "membershipQuestions":["2-5 câu hỏi duyệt thành viên"],
  "pillars":[{
    "name":"tên trụ cột",
    "description":"mô tả",
    "objective":"mục tiêu",
    "audienceNeed":"nhu cầu người đọc",
    "contentRatio":25,
    "formats":["bài hỏi đáp"],
    "exampleTopics":["ý tưởng bài thật"]
  }],
  "launchPlan":{
    "setup":["việc cần làm trước khi mở"],
    "first7Days":["kế hoạch 7 ngày"],
    "first30Days":["kế hoạch 30 ngày"]
  },
  "kpis":{
    "memberTarget30Days":100,
    "postsPerWeek":4,
    "engagementTargetPercent":10,
    "qualifiedLeadTarget30Days":5
  }
}`, text(input.aiModel, 100) || undefined);
    const plan = blueprintPlanSchema.parse(generated.result);
    await query(
      `UPDATE facebook_group_ai_runs
       SET status='completed', model=$1, candidate_count=1, recommendation_count=1,
           completed_at=NOW()
       WHERE id=$2`,
      [generated.model, runId],
    );
    await logActivity(actor, "blueprint.ai_generated", "blueprint", runId, {
      provider: generated.provider,
      model: generated.model,
      fallbackUsed: generated.fallbackUsed,
      productIds,
    });
    return {
      runId,
      provider: generated.provider,
      model: generated.model,
      fallbackUsed: generated.fallbackUsed,
      promptVersion: "fbg-growth-blueprint-v1",
      productSnapshot: groundedProducts,
      plan,
    };
  } catch (error) {
    await query(
      `UPDATE facebook_group_ai_runs
       SET status='failed', error=$1, completed_at=NOW()
       WHERE id=$2`,
      [error instanceof Error ? error.message : "Không thể tạo blueprint.", runId],
    );
    throw error;
  }
}

export async function listFacebookGroupBlueprints() {
  return query(
    `SELECT b.id, b.code, b.name, b.status,
            b.group_kind AS "groupKind",
            b.product_ids AS "productIds",
            b.target_audience AS "targetAudience",
            b.region, b.objective, b.positioning,
            b.selected_name AS "selectedName",
            b.launch_plan AS "launchPlan", b.kpis,
            b.updated_at AS "updatedAt",
            COUNT(DISTINCT p.id)::int AS "pillarCount",
            COUNT(DISTINCT g.id)::int AS "groupCount"
     FROM facebook_group_blueprints b
     LEFT JOIN facebook_group_content_pillars p
       ON p.blueprint_id=b.id AND p.deleted_at IS NULL
     LEFT JOIN facebook_groups g
       ON g.blueprint_id=b.id AND g.deleted_at IS NULL
     WHERE b.deleted_at IS NULL
     GROUP BY b.id
     ORDER BY b.updated_at DESC`,
  );
}

export async function getFacebookGroupBlueprint(blueprintId: string) {
  const blueprint = await queryOne(
    `SELECT id, code, name, status, group_kind AS "groupKind",
            product_ids AS "productIds", target_audience AS "targetAudience",
            region, objective, positioning, name_options AS "nameOptions",
            selected_name AS "selectedName", description, rules,
            membership_questions AS "membershipQuestions",
            launch_plan AS "launchPlan", kpis, ai_metadata AS "aiMetadata",
            created_at AS "createdAt", updated_at AS "updatedAt"
     FROM facebook_group_blueprints
     WHERE id=$1 AND deleted_at IS NULL`,
    [blueprintId],
  );
  if (!blueprint) throw new Error("Không tìm thấy bản thiết kế Group.");
  const [pillars, groups] = await Promise.all([
    query(
      `SELECT id, name, description, objective,
              audience_need AS "audienceNeed",
              content_ratio AS "contentRatio", formats,
              example_topics AS "exampleTopics", status,
              sort_order AS "sortOrder"
       FROM facebook_group_content_pillars
       WHERE blueprint_id=$1 AND deleted_at IS NULL
       ORDER BY sort_order, created_at`,
      [blueprintId],
    ),
    query(
      `SELECT id, name, group_url AS "groupUrl", group_kind AS "groupKind",
              lifecycle_stage AS "lifecycleStage", status
       FROM facebook_groups
       WHERE blueprint_id=$1 AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [blueprintId],
    ),
  ]);
  return { ...blueprint as Record<string, unknown>, pillars, groups };
}

export async function createFacebookGroupBlueprint(
  rawInput: Record<string, unknown>,
  actor: GroupGrowthActor,
) {
  const input = blueprintInputSchema.parse(rawInput);
  const blueprintId = id("fbgbp");
  const code = `BP-${Date.now().toString(36).toUpperCase()}`;
  const client = await (await import("./db")).getDb().connect();
  try {
    await client.query("BEGIN");
    const row = await client.query(
      `INSERT INTO facebook_group_blueprints
       (id,code,name,status,group_kind,product_ids,target_audience,region,objective,
        positioning,name_options,selected_name,description,rules,membership_questions,
        launch_plan,kpis,ai_metadata,created_by,updated_by)
       VALUES ($1,$2,$3,'draft',$4,$5::jsonb,$6,$7,$8,$9,$10::jsonb,$11,$12,
               $13::jsonb,$14::jsonb,$15::jsonb,$16::jsonb,$17::jsonb,$18,$18)
       RETURNING *`,
      [blueprintId, code, input.name, input.groupKind, JSON.stringify(input.productIds),
        input.targetAudience, input.region, input.objective, input.plan.positioning,
        JSON.stringify(input.plan.nameOptions), input.plan.selectedName,
        input.plan.description, JSON.stringify(input.plan.rules),
        JSON.stringify(input.plan.membershipQuestions), JSON.stringify(input.plan.launchPlan),
        JSON.stringify(input.plan.kpis), JSON.stringify({ generatedByAi: true }),
        actor.id],
    );
    for (const [index, pillar] of input.plan.pillars.entries()) {
      await client.query(
        `INSERT INTO facebook_group_content_pillars
         (id,blueprint_id,name,description,objective,audience_need,content_ratio,
          formats,example_topics,sort_order,ai_metadata,created_by,updated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11::jsonb,$12,$12)`,
        [id("fbgpl"), blueprintId, pillar.name, pillar.description, pillar.objective,
          pillar.audienceNeed, pillar.contentRatio, JSON.stringify(pillar.formats),
          JSON.stringify(pillar.exampleTopics), index, JSON.stringify({ generatedByAi: true }),
          actor.id],
      );
    }
    await client.query("COMMIT");
    await logActivity(actor, "blueprint.created", "blueprint", blueprintId, {
      code,
      pillarCount: input.plan.pillars.length,
    });
    return row.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateFacebookGroupBlueprint(
  blueprintId: string,
  input: Record<string, unknown>,
  actor: GroupGrowthActor,
) {
  const allowedStatus = new Set(["draft", "review", "approved", "launching", "active", "archived"]);
  const updates: string[] = [];
  const params: unknown[] = [];
  const add = (column: string, value: unknown, json = false) => {
    params.push(json ? JSON.stringify(value) : value);
    updates.push(`${column}=$${params.length}${json ? "::jsonb" : ""}`);
  };
  if ("name" in input) add("name", text(input.name, 200));
  if ("selectedName" in input) add("selected_name", text(input.selectedName, 200));
  if ("description" in input) add("description", text(input.description, 5_000));
  if ("positioning" in input) add("positioning", text(input.positioning, 2_000));
  if ("targetAudience" in input) add("target_audience", text(input.targetAudience, 2_000));
  if ("objective" in input) add("objective", text(input.objective, 2_000));
  if ("region" in input) add("region", text(input.region, 200));
  if ("rules" in input) add("rules", stringArray(input.rules, 20, 500), true);
  if ("membershipQuestions" in input) add(
    "membership_questions", stringArray(input.membershipQuestions, 8, 500), true,
  );
  if ("launchPlan" in input) add("launch_plan", input.launchPlan || {}, true);
  if ("kpis" in input) add("kpis", input.kpis || {}, true);
  if ("status" in input) {
    const status = text(input.status, 30);
    if (!allowedStatus.has(status)) throw new Error("Trạng thái blueprint không hợp lệ.");
    add("status", status);
    if (status === "approved") {
      add("approved_by", actor.id);
      updates.push("approved_at=NOW()");
    }
  }
  if (!updates.length) throw new Error("Không có thay đổi hợp lệ.");
  params.push(actor.id, blueprintId);
  const row = await queryOne(
    `UPDATE facebook_group_blueprints
     SET ${updates.join(",")}, updated_by=$${params.length - 1}, updated_at=NOW()
     WHERE id=$${params.length} AND deleted_at IS NULL
     RETURNING *`,
    params,
  );
  if (!row) throw new Error("Không tìm thấy bản thiết kế Group.");
  await logActivity(actor, "blueprint.updated", "blueprint", blueprintId, {
    fields: Object.keys(input),
  });
  return row;
}

export async function registerOwnedFacebookGroup(
  blueprintId: string,
  input: Record<string, unknown>,
  actor: GroupGrowthActor,
) {
  const groupUrl = text(input.groupUrl, 2_000);
  const parsed = parseFacebookGroupUrl(groupUrl);
  if (!parsed) throw new Error("Đường dẫn Facebook Group không hợp lệ.");
  const blueprint = await queryOne<{
    selected_name: string;
    region: string;
    target_audience: string;
    status: string;
  }>(
    `SELECT selected_name, region, target_audience, status
     FROM facebook_group_blueprints
     WHERE id=$1 AND deleted_at IS NULL`,
    [blueprintId],
  );
  if (!blueprint) throw new Error("Không tìm thấy bản thiết kế Group.");
  const duplicate = await queryOne<{ id: string }>(
    `SELECT id FROM facebook_groups
     WHERE deleted_at IS NULL
       AND (facebook_group_id=$1 OR group_url=$2)`,
    [parsed.groupKey, groupUrl],
  );
  if (duplicate) throw new Error("Group này đã có trong CRM.");
  const groupId = id("fbg");
  const name = text(input.name, 300) || blueprint.selected_name;
  const code = (text(input.code, 20) || name).normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || `GR${Date.now()}`;
  await query(
    `INSERT INTO facebook_groups
     (id,code,name,group_url,facebook_group_id,topic,region,group_kind,lifecycle_stage,
      blueprint_id,allows_pages,membership_status,allows_sales,assigned_staff_id,
      status,data,created_by,updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'owned','setup',$8,'yes','joined','yes',$9,
             'needs_review',$10::jsonb,$11,$11)`,
    [groupId, code, name, groupUrl, parsed.groupKey, text(input.topic, 120) || null,
      text(input.region, 120) || blueprint.region, blueprintId,
      text(input.assignedStaffId, 120) || null,
      JSON.stringify({ targetAudience: blueprint.target_audience, createdManuallyOnFacebook: true }),
      actor.id],
  );
  await query(
    `INSERT INTO facebook_group_rules
     (id,group_id,raw_text,created_by,updated_by)
     SELECT $1,$2,string_agg(value, E'\n'),$3,$3
     FROM facebook_group_blueprints b,
          jsonb_array_elements_text(b.rules) AS value
     WHERE b.id=$4`,
    [id("fbgr"), groupId, actor.id, blueprintId],
  );
  await query(
    `UPDATE facebook_group_blueprints
     SET status='launching', updated_by=$1, updated_at=NOW()
     WHERE id=$2`,
    [actor.id, blueprintId],
  );
  await logActivity(actor, "blueprint.group_registered", "group", groupId, {
    blueprintId,
    groupUrl,
  });
  return getFacebookGroupBlueprint(blueprintId);
}

export async function listFacebookGroupGrowthLeads(filters: Record<string, string | undefined> = {}) {
  const limit = Math.min(200, Math.max(1, Number(filters.limit || 50)));
  const offset = Math.max(0, Number(filters.offset || 0));
  return query(
    `SELECT a.id, a.lead_id AS "leadId",
            COALESCE(l.data->>'name','Khách chưa đặt tên') AS "leadName",
            l.data->>'phone' AS phone,
            l.data->>'stage' AS stage,
            l.data->>'assignedTo' AS "assignedTo",
            g.id AS "groupId", g.name AS "groupName",
            g.group_kind AS "groupKind",
            p.post_url AS "postUrl", p.source_code AS "sourceCode",
            c.name AS "campaignName",
            d.opening AS "contentOpening",
            a.first_messenger_at AS "firstMessengerAt",
            a.quote_id AS "quoteId", a.order_id AS "orderId",
            a.revenue, a.created_at AS "createdAt"
     FROM facebook_group_lead_attributions a
     JOIN facebook_groups g ON g.id=a.group_id
     JOIN facebook_group_published_posts p ON p.id=a.post_id
     LEFT JOIN facebook_group_campaigns c ON c.id=a.campaign_id
     LEFT JOIN facebook_group_content_drafts d ON d.id=a.content_id
     LEFT JOIN crm_leads l ON l.id=a.lead_id
     WHERE ($1::text IS NULL OR g.id=$1)
       AND ($2::text IS NULL OR COALESCE(l.data->>'stage','')=$2)
     ORDER BY a.created_at DESC
     LIMIT $3 OFFSET $4`,
    [filters.groupId || null, filters.stage || null, limit, offset],
  );
}

export async function softDeleteFacebookGroupBlueprint(
  blueprintId: string,
  actor: GroupGrowthActor,
) {
  if (!actor.isAdmin) throw new Error("Chỉ quản trị viên được xóa blueprint.");
  const linked = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM facebook_groups
     WHERE blueprint_id=$1 AND deleted_at IS NULL`,
    [blueprintId],
  );
  if (Number(linked?.count || 0) > 0) {
    throw new Error("Blueprint đã liên kết Group; hãy lưu trữ thay vì xóa.");
  }
  await query(
    `UPDATE facebook_group_blueprints
     SET deleted_at=NOW(), updated_by=$1, updated_at=NOW()
     WHERE id=$2 AND deleted_at IS NULL`,
    [actor.id, blueprintId],
  );
  await logActivity(actor, "blueprint.deleted", "blueprint", blueprintId);
}
