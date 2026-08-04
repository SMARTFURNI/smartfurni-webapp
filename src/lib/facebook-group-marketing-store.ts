import "server-only";

import { randomUUID } from "crypto";
import { getDb, query, queryOne } from "./db";
import { sendPushNotification } from "./pwa-server";
import {
  calculateFacebookGroupScore, contentSimilarityPercent,
  buildFacebookGroupContactCta, extractFacebookGroupSourceCode, generateFacebookGroupSourceCode, parseFacebookGroupPostUrl,
  getNextFacebookGroupPostingSlot,
  keepGroundedFacebookGroupSuggestions, parseFacebookGroupAiSuggestion,
  parseFacebookGroupDiscoveryResponse, parseFacebookGroupUrl,
  validateFacebookGroupSchedule,
} from "./facebook-group-marketing-business";
import {
  DEFAULT_FACEBOOK_GROUP_SETTINGS, FACEBOOK_GROUP_TOPIC_TAXONOMY,
  normalizeFacebookGroupAiSettings,
  type DashboardData, type FacebookGroupLeadSource,
  type FacebookGroupSettings, type FacebookGroupTopicDefinition,
} from "./facebook-group-marketing-types";
import { analyzeFacebookGroupRulesWithAi } from "./facebook-group-marketing-ai";
import {
  generateFacebookGroupAiJson,
  getFacebookGroupAiModelCatalog,
} from "./facebook-group-ai-provider";

type Actor = { id: string; name: string; isAdmin?: boolean };
type Filters = Record<string, string | undefined>;

const id = (prefix: string) => `${prefix}_${randomUUID()}`;
const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown, max = 1000) => String(value ?? "").trim().slice(0, max);
const number = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

function normalizeGroupTopics(value: unknown): FacebookGroupTopicDefinition[] {
  if (!Array.isArray(value) || value.length === 0) {
    return DEFAULT_FACEBOOK_GROUP_SETTINGS.groupTopics.map(topic => ({
      ...topic,
      searchTerms: [...topic.searchTerms],
    }));
  }
  const seen = new Set<string>();
  return value.flatMap(item => {
    const source = asObject(item);
    const label = text(source.label || source.key, 120);
    const key = text(source.key || label, 120);
    const identity = key.toLocaleLowerCase("vi");
    if (!key || !label || seen.has(identity)) return [];
    seen.add(identity);
    const rawTerms = Array.isArray(source.searchTerms) ? source.searchTerms : [];
    return [{
      key,
      label,
      description: text(source.description, 500),
      searchTerms: rawTerms.map(term => text(term, 120)).filter(Boolean).slice(0, 20),
    }];
  });
}

function topicFromInput(input: Record<string, unknown>): FacebookGroupTopicDefinition {
  const label = text(input.label || input.key, 120);
  if (!label) throw new Error("Tên chủ đề là bắt buộc.");
  const rawTerms = Array.isArray(input.searchTerms)
    ? input.searchTerms
    : String(input.searchTerms || "").split(/[\n,]/);
  return {
    key: label,
    label,
    description: text(input.description, 500),
    searchTerms: rawTerms.map(term => text(term, 120)).filter(Boolean).slice(0, 20),
  };
}

export async function getFacebookGroupSettings(): Promise<FacebookGroupSettings> {
  const row = await queryOne<{ settings: FacebookGroupSettings | string }>(
    `SELECT settings FROM facebook_group_settings WHERE id = 'default'`,
  );
  if (!row) return DEFAULT_FACEBOOK_GROUP_SETTINGS;
  const value = typeof row.settings === "string" ? JSON.parse(row.settings) : row.settings;
  return {
    ...DEFAULT_FACEBOOK_GROUP_SETTINGS,
    ...value,
    groupTopics: normalizeGroupTopics(value.groupTopics),
    ai: normalizeFacebookGroupAiSettings(value.ai),
    contact: { ...DEFAULT_FACEBOOK_GROUP_SETTINGS.contact, ...value.contact },
    scoreWeights: { ...DEFAULT_FACEBOOK_GROUP_SETTINGS.scoreWeights, ...value.scoreWeights },
    gradeRules: { ...DEFAULT_FACEBOOK_GROUP_SETTINGS.gradeRules, ...value.gradeRules },
    manualPostingOnly: true,
    storeFacebookCredentials: false,
  };
}

export async function saveFacebookGroupSettings(input: Partial<FacebookGroupSettings>, actor: Actor) {
  const current = await getFacebookGroupSettings();
  const settings: FacebookGroupSettings = {
    ...current,
    ...input,
    ai: normalizeFacebookGroupAiSettings(input.ai || current.ai),
    contact: { ...current.contact, ...input.contact },
    scoreWeights: { ...current.scoreWeights, ...input.scoreWeights },
    gradeRules: { ...current.gradeRules, ...input.gradeRules },
    manualPostingOnly: true,
    storeFacebookCredentials: false,
  };
  await query(
    `INSERT INTO facebook_group_settings (id, settings, created_by, updated_by)
     VALUES ('default', $1::jsonb, $2, $2)
     ON CONFLICT (id) DO UPDATE SET settings = EXCLUDED.settings, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
    [JSON.stringify(settings), actor.id],
  );
  await logActivity(actor, "settings.updated", "settings", "default", undefined, { safeMode: true });
  return settings;
}

export async function getFacebookGroupMarketingOptions() {
  const [pages, groups, campaigns, content, posts, staff, products, leads, blueprints, pillars, settings, aiModels] = await Promise.all([
    query(
      `SELECT id, name, facebook_page_id AS "facebookPageId", status
       FROM facebook_pages
       WHERE deleted_at IS NULL
       ORDER BY name`,
    ),
    query(
      `SELECT id, name, code, topic, region, status,
              group_kind AS "groupKind", lifecycle_stage AS "lifecycleStage",
              blueprint_id AS "blueprintId",
              membership_status AS "membershipStatus",
              allows_pages AS "allowsPages"
       FROM facebook_groups
       WHERE deleted_at IS NULL
       ORDER BY name`,
    ),
    query(
      `SELECT campaign.id, campaign.name, campaign.code,
              campaign.page_id AS "pageId", campaign.product_ids AS "productIds",
              campaign.owner_id AS "ownerId", campaign.status,
              COALESCE(
                jsonb_agg(target.group_id ORDER BY target.created_at)
                  FILTER (WHERE target.id IS NOT NULL),
                '[]'::jsonb
              ) AS "groupIds"
       FROM facebook_group_campaigns campaign
       LEFT JOIN facebook_group_campaign_targets target ON target.campaign_id = campaign.id
       WHERE campaign.deleted_at IS NULL
       GROUP BY campaign.id
       ORDER BY campaign.created_at DESC`,
    ),
    query(
      `SELECT id, opening, source_code AS "sourceCode",
              group_id AS "groupId", campaign_id AS "campaignId", status
       FROM facebook_group_content_drafts
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC`,
    ),
    query(
      `SELECT p.id, p.source_code AS "sourceCode", p.post_url AS "postUrl",
              g.name AS "groupName"
       FROM facebook_group_published_posts p
       JOIN facebook_groups g ON g.id = p.group_id
       WHERE p.deleted_at IS NULL
       ORDER BY p.actual_posted_at DESC`,
    ),
    query(
      `SELECT id, data->>'fullName' AS name
       FROM crm_staff
       WHERE status = 'active'
       ORDER BY data->>'fullName'`,
    ),
    query(
      `SELECT id, data->>'name' AS name, data->>'sku' AS sku
       FROM crm_products
       WHERE COALESCE(data->>'isActive', 'true') = 'true'
       ORDER BY data->>'name'`,
    ),
    query(
      `SELECT id, data->>'name' AS name, data->>'phone' AS phone
       FROM crm_leads
       ORDER BY updated_at DESC
       LIMIT 200`,
    ),
    query(
      `SELECT id, code, name, selected_name AS "selectedName", status,
              group_kind AS "groupKind"
       FROM facebook_group_blueprints
       WHERE deleted_at IS NULL
       ORDER BY updated_at DESC`,
    ),
    query(
      `SELECT id, blueprint_id AS "blueprintId", group_id AS "groupId",
              name, content_ratio AS "contentRatio", status
       FROM facebook_group_content_pillars
       WHERE deleted_at IS NULL AND status='active'
       ORDER BY sort_order, name`,
    ),
    getFacebookGroupSettings(),
    getFacebookGroupAiModelCatalog(),
  ]);
  return {
    pages, groups, campaigns, content, posts, staff, products, leads,
    blueprints, pillars, topics: settings.groupTopics, aiModels,
  };
}

export async function createFacebookGroupTopic(input: Record<string, unknown>, actor: Actor) {
  const topic = topicFromInput(input);
  const settings = await getFacebookGroupSettings();
  if (settings.groupTopics.some(item =>
    item.key.localeCompare(topic.key, "vi", { sensitivity: "accent" }) === 0)) {
    throw new Error("Tên chủ đề đã tồn tại.");
  }
  await saveFacebookGroupSettings({
    groupTopics: [...settings.groupTopics, topic],
  }, actor);
  await logActivity(actor, "topic.created", "group_topic", topic.key, undefined, { topic });
  return topic;
}

export async function updateFacebookGroupTopic(
  currentKey: string, input: Record<string, unknown>, actor: Actor,
) {
  const settings = await getFacebookGroupSettings();
  const index = settings.groupTopics.findIndex(item => item.key === currentKey);
  if (index < 0) throw new Error("Không tìm thấy chủ đề.");
  const topic = topicFromInput(input);
  if (settings.groupTopics.some((item, itemIndex) =>
    itemIndex !== index
    && item.key.localeCompare(topic.key, "vi", { sensitivity: "accent" }) === 0)) {
    throw new Error("Tên chủ đề đã tồn tại.");
  }
  const nextSettings = {
    ...settings,
    groupTopics: settings.groupTopics.map((item, itemIndex) => itemIndex === index ? topic : item),
  };
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    if (topic.key !== currentKey) {
      await client.query(
        `UPDATE facebook_groups
         SET topic = $1, updated_by = $2, updated_at = NOW()
         WHERE topic = $3 AND deleted_at IS NULL`,
        [topic.key, actor.id, currentKey],
      );
    }
    await client.query(
      `INSERT INTO facebook_group_settings (id, settings, created_by, updated_by)
       VALUES ('default', $1::jsonb, $2, $2)
       ON CONFLICT (id) DO UPDATE
       SET settings = EXCLUDED.settings, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      [JSON.stringify(nextSettings), actor.id],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  await logActivity(actor, "topic.updated", "group_topic", topic.key, {
    previousKey: currentKey,
  }, { topic });
  return topic;
}

export async function deleteFacebookGroupTopic(topicKey: string, actor: Actor) {
  const settings = await getFacebookGroupSettings();
  const topic = settings.groupTopics.find(item => item.key === topicKey);
  if (!topic) throw new Error("Không tìm thấy chủ đề.");
  if (settings.groupTopics.length <= 1) throw new Error("Không được xóa chủ đề cuối cùng.");
  const usage = await queryOne<{ total: number }>(
    `SELECT COUNT(*)::int AS total
     FROM facebook_groups
     WHERE topic = $1 AND deleted_at IS NULL`,
    [topicKey],
  );
  if (Number(usage?.total || 0) > 0) {
    throw new Error(`Không được xóa: chủ đề đang có ${usage?.total} Group. Hãy chuyển các Group sang chủ đề khác trước.`);
  }
  await saveFacebookGroupSettings({
    groupTopics: settings.groupTopics.filter(item => item.key !== topicKey),
  }, actor);
  await logActivity(actor, "topic.deleted", "group_topic", topicKey, undefined, { topic });
}

export async function syncFacebookGroupPagesFromScheduler(actor: Actor) {
  const schedulerPages = await query<{
    id: string;
    pageId: string;
    pageName: string;
    isActive: boolean;
  }>(
    `SELECT id,
            data->>'pageId' AS "pageId",
            data->>'pageName' AS "pageName",
            COALESCE((data->>'isActive')::boolean, true) AS "isActive"
     FROM fb_scheduler_pages
     WHERE COALESCE(data->>'pageId', '') <> ''`,
  );
  let created = 0;
  let updated = 0;
  for (const page of schedulerPages) {
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM facebook_pages WHERE facebook_page_id = $1 LIMIT 1`,
      [page.pageId],
    );
    if (existing) {
      await query(
        `UPDATE facebook_pages
         SET name = $1, page_url = $2, status = $3, deleted_at = NULL,
             data = data || $4::jsonb, updated_by = $5, updated_at = NOW()
         WHERE id = $6`,
        [page.pageName, `https://www.facebook.com/${page.pageId}`,
          page.isActive ? "active" : "paused",
          JSON.stringify({ schedulerPageId: page.id, syncedFrom: "content-marketing" }),
          actor.id, existing.id],
      );
      updated += 1;
    } else {
      await query(
        `INSERT INTO facebook_pages
         (id,name,facebook_page_id,page_url,status,data,created_by,updated_by)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$7)`,
        [id("fbp"), page.pageName, page.pageId,
          `https://www.facebook.com/${page.pageId}`, page.isActive ? "active" : "paused",
          JSON.stringify({ schedulerPageId: page.id, syncedFrom: "content-marketing" }), actor.id],
      );
      created += 1;
    }
  }
  await logActivity(actor, "pages.synced", "page", undefined, undefined, {
    source: "content-marketing", created, updated,
  });
  return { ok: true, found: schedulerPages.length, created, updated };
}

export async function listFacebookGroupMarketing(resource: string, filters: Filters = {}) {
  const limit = Math.min(200, Math.max(1, number(filters.limit, 50)));
  const offset = Math.max(0, number(filters.offset, 0));
  if (resource === "pages") {
    return query(
      `SELECT id, name, facebook_page_id AS "facebookPageId", avatar_url AS "avatarUrl",
              page_url AS "pageUrl", brand, manager_id AS "managerId", status,
              max_posts_per_day AS "maxPostsPerDay",
              min_post_interval_minutes AS "minPostIntervalMinutes",
              allowed_posting_hours AS "allowedPostingHours", notes, data,
              created_at::text AS "createdAt", updated_at::text AS "updatedAt"
       FROM facebook_pages WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
  }
  if (resource === "groups") {
    const conditions = ["g.deleted_at IS NULL"];
    const params: unknown[] = [];
    const add = (clause: string, value: unknown) => { params.push(value); conditions.push(clause.replace("?", `$${params.length}`)); };
    if (filters.search) {
      params.push(`%${filters.search}%`);
      conditions.push(`(g.name ILIKE $${params.length} OR g.code ILIKE $${params.length})`);
    }
    if (filters.status) add("g.status = ?", filters.status);
    if (filters.grade) add("g.grade = ?", filters.grade);
    if (filters.region) add("g.region = ?", filters.region);
    if (filters.topic === "__unclassified__") {
      conditions.push("(g.topic IS NULL OR BTRIM(g.topic) = '')");
    } else if (filters.topic) {
      add("g.topic = ?", filters.topic);
    }
    if (filters.membershipStatus) add("g.membership_status = ?", filters.membershipStatus);
    params.push(limit, offset);
    const searchSql = conditions.join(" AND ");
    return query(
      `SELECT g.*, r.raw_text AS "ruleText", r.analysis AS "ruleAnalysis"
       FROM facebook_groups g LEFT JOIN facebook_group_rules r ON r.group_id = g.id
       WHERE ${searchSql} ORDER BY g.updated_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
  }
  if (resource === "campaigns") {
    return query(
      `SELECT c.*, p.name AS "pageName",
              COUNT(t.id)::int AS "groupCount",
              COALESCE(
                jsonb_agg(t.group_id ORDER BY t.created_at) FILTER (WHERE t.id IS NOT NULL),
                '[]'::jsonb
              ) AS "groupIds"
       FROM facebook_group_campaigns c
       LEFT JOIN facebook_pages p ON p.id = c.page_id
       LEFT JOIN facebook_group_campaign_targets t ON t.campaign_id = c.id
       WHERE c.deleted_at IS NULL
       GROUP BY c.id, p.name ORDER BY c.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
  }
  if (resource === "content") {
    return query(
      `SELECT c.*, g.name AS "groupName", x.name AS "campaignName",
              pillar.name AS "pillarName",
              COALESCE((
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'id', asset.id,
                    'assetType', asset.asset_type,
                    'url', asset.url,
                    'name', asset.name,
                    'metadata', asset.metadata,
                    'createdAt', asset.created_at
                  )
                  ORDER BY asset.created_at DESC
                )
                FROM facebook_group_content_assets asset
                WHERE asset.content_id = c.id
              ), '[]'::jsonb) AS assets
       FROM facebook_group_content_drafts c
       LEFT JOIN facebook_groups g ON g.id = c.group_id
       LEFT JOIN facebook_group_campaigns x ON x.id = c.campaign_id
       LEFT JOIN facebook_group_content_pillars pillar ON pillar.id = c.pillar_id
       WHERE c.deleted_at IS NULL
       ORDER BY c.updated_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
  }
  if (resource === "tasks") {
    const assigned = filters.assignedStaffId;
    return query(
      `SELECT t.*, g.name AS "groupName", g.group_url AS "groupUrl", p.name AS "pageName",
              c.opening, c.body, c.cta, c.source_code AS "sourceCode",
              x.name AS "campaignName",
              COALESCE(staff.data->>'fullName', staff.username) AS "staffName",
              COALESCE((
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'id', asset.id,
                    'assetType', asset.asset_type,
                    'url', asset.url,
                    'name', asset.name,
                    'metadata', asset.metadata,
                    'createdAt', asset.created_at
                  )
                  ORDER BY COALESCE((asset.metadata->>'isPrimary')::boolean, false) DESC,
                           asset.created_at DESC
                )
                FROM facebook_group_content_assets asset
                WHERE asset.content_id = c.id
              ), '[]'::jsonb) AS assets
       FROM facebook_group_publishing_tasks t
       JOIN facebook_groups g ON g.id = t.group_id
       JOIN facebook_pages p ON p.id = t.page_id
       JOIN facebook_group_content_drafts c ON c.id = t.content_id
       LEFT JOIN facebook_group_campaigns x ON x.id = t.campaign_id
       LEFT JOIN crm_staff staff ON staff.id = t.assigned_staff_id
       WHERE t.deleted_at IS NULL AND ($1::text IS NULL OR t.assigned_staff_id = $1)
       ORDER BY t.scheduled_at ASC LIMIT $2 OFFSET $3`,
      [assigned || null, limit, offset],
    );
  }
  if (resource === "posts") {
    return query(
      `SELECT p.*, g.name AS "groupName", g.group_url AS "groupUrl", f.name AS "pageName",
              c.opening, c.body, c.cta, x.name AS "campaignName"
       FROM facebook_group_published_posts p
       JOIN facebook_groups g ON g.id = p.group_id
       JOIN facebook_pages f ON f.id = p.page_id
       JOIN facebook_group_content_drafts c ON c.id = p.content_id
       LEFT JOIN facebook_group_campaigns x ON x.id = p.campaign_id
       WHERE p.deleted_at IS NULL ORDER BY p.actual_posted_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
  }
  if (resource === "comments") {
    return query(
      `SELECT c.*, p.post_url AS "postUrl", p.source_code AS "sourceCode", g.name AS "groupName"
       FROM facebook_group_comments c
       JOIN facebook_group_published_posts p ON p.id = c.post_id
       JOIN facebook_groups g ON g.id = p.group_id
       WHERE c.deleted_at IS NULL AND p.deleted_at IS NULL AND g.deleted_at IS NULL
       ORDER BY c.commented_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
  }
  if (resource === "checks") {
    return query(
      `SELECT c.*, p.post_url AS "postUrl", g.name AS "groupName",
              p.actual_posted_at AS "actualPostedAt"
       FROM facebook_group_post_check_tasks c
       JOIN facebook_group_published_posts p ON p.id = c.post_id
       JOIN facebook_groups g ON g.id = p.group_id
       WHERE c.deleted_at IS NULL AND p.deleted_at IS NULL AND g.deleted_at IS NULL
         AND ($1::text IS NULL OR c.status = $1)
       ORDER BY c.due_at ASC LIMIT $2 OFFSET $3`,
      [filters.status || null, limit, offset],
    );
  }
  throw new Error("Tài nguyên không hợp lệ.");
}

export async function createFacebookGroupMarketing(resource: string, input: Record<string, unknown>, actor: Actor) {
  if (resource === "pages") {
    const name = text(input.name, 200);
    if (!name) throw new Error("Tên Fanpage là bắt buộc.");
    const entityId = id("fbp");
    const row = await queryOne(
      `INSERT INTO facebook_pages
       (id, name, facebook_page_id, avatar_url, page_url, brand, manager_id, status,
        max_posts_per_day, min_post_interval_minutes, allowed_posting_hours, notes, data, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13::jsonb,$14,$14)
       RETURNING *`,
      [entityId, name, text(input.facebookPageId, 100) || null, text(input.avatarUrl, 2000) || null,
        text(input.pageUrl, 2000) || null, text(input.brand, 120) || "SmartFurni",
        text(input.managerId, 120) || null, text(input.status, 30) || "active",
        Math.max(1, number(input.maxPostsPerDay, 4)), Math.max(0, number(input.minPostIntervalMinutes, 60)),
        JSON.stringify(input.allowedPostingHours || ["08:00-11:30", "13:30-21:00"]),
        text(input.notes, 5000), JSON.stringify(asObject(input.data)), actor.id],
    );
    await logActivity(actor, "page.created", "page", entityId);
    return row;
  }
  if (resource === "groups") {
    const name = text(input.name, 300);
    const groupUrl = text(input.groupUrl, 2000);
    const parsedGroupUrl = parseFacebookGroupUrl(groupUrl);
    if (!name || !parsedGroupUrl) {
      throw new Error("Tên và đường dẫn Facebook Group hợp lệ là bắt buộc.");
    }
    const existingGroups = await query<{ id: string; name: string; group_url: string }>(
      `SELECT id, name, group_url FROM facebook_groups WHERE deleted_at IS NULL`,
    );
    const duplicate = existingGroups.find(group => parseFacebookGroupUrl(group.group_url)?.groupKey === parsedGroupUrl.groupKey);
    if (duplicate) throw new Error(`Group “${duplicate.name}” đã có trong CRM.`);
    const entityId = id("fbg");
    const code = (text(input.code, 20) || name).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || `GR${Date.now()}`;
    const row = await queryOne(
      `INSERT INTO facebook_groups
       (id, code, name, group_url, facebook_group_id, topic, region, member_count,
        allows_pages, membership_status, allows_sales, assigned_staff_id,
        next_allowed_post_at, quality_score, grade, status, group_kind,
        lifecycle_stage, blueprint_id, data, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20::jsonb,$21,$21)
       RETURNING *`,
      [entityId, code, name, groupUrl, text(input.facebookGroupId, 100) || null,
        text(input.topic, 120) || null, text(input.region, 120) || null,
        Math.max(0, number(input.memberCount)), text(input.allowsPages, 20) || "unknown",
        text(input.membershipStatus, 30) || "not_joined", text(input.allowsSales, 20) || "unknown",
        text(input.assignedStaffId, 120) || null, input.nextAllowedPostAt || null,
        0, "D", text(input.status, 30) || "needs_review",
        text(input.groupKind, 40) === "owned" ? "owned" : "external_distribution",
        text(input.lifecycleStage, 40) || "active", text(input.blueprintId, 120) || null,
        JSON.stringify(asObject(input.data)), actor.id],
    );
    await query(
      `INSERT INTO facebook_group_rules (id, group_id, raw_text, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$4)`,
      [id("fbgr"), entityId, text(input.ruleText, 30_000), actor.id],
    );
    await logActivity(actor, "group.created", "group", entityId, undefined, { code });
    return row;
  }
  if (resource === "campaigns") {
    const name = text(input.name, 300);
    if (!name) throw new Error("Tên chiến dịch là bắt buộc.");
    const entityId = id("fbc");
    const code = text(input.code, 40).toUpperCase() || `FBG-${Date.now().toString(36).toUpperCase()}`;
    const row = await queryOne(
      `INSERT INTO facebook_group_campaigns
       (id, code, name, page_id, product_ids, owner_id, start_date, end_date, status, targets, data, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12,$12) RETURNING *`,
      [entityId, code, name, input.pageId || null, JSON.stringify(input.productIds || []),
        input.ownerId || null, input.startDate || null, input.endDate || null,
        text(input.status, 30) || "draft", JSON.stringify(asObject(input.targets)),
        JSON.stringify(asObject(input.data)), actor.id],
    );
    for (const groupId of Array.isArray(input.groupIds) ? input.groupIds : []) {
      await query(
        `INSERT INTO facebook_group_campaign_targets
         (id, campaign_id, group_id, created_by, updated_by)
         VALUES ($1,$2,$3,$4,$4) ON CONFLICT (campaign_id, group_id) DO NOTHING`,
        [id("fbct"), entityId, groupId, actor.id],
      );
    }
    await logActivity(actor, "campaign.created", "campaign", entityId);
    return row;
  }
  if (resource === "content") return createContent(input, actor);
  if (resource === "tasks") return createPublishingTask(input, actor);
  if (resource === "comments") return addFacebookGroupComment(input, actor);
  throw new Error("Tài nguyên không hỗ trợ tạo mới.");
}

async function createContent(input: Record<string, unknown>, actor: Actor) {
  const body = text(input.body, 30_000);
  if (!body) throw new Error("Nội dung chính là bắt buộc.");
  const productId = text(input.productId, 120);
  if (!productId) throw new Error("Sản phẩm CRM là bắt buộc để nội dung có dữ liệu thật.");
  const productExists = await queryOne<{ id: string }>(
    `SELECT id FROM crm_products WHERE id = $1`,
    [productId],
  );
  if (!productExists) throw new Error("Không tìm thấy sản phẩm CRM.");
  const group = input.groupId ? await queryOne<{
    code: string; allows_sales: string; rule_analysis: Record<string, unknown> | string | null;
  }>(
    `SELECT g.code, g.allows_sales, r.analysis AS rule_analysis
     FROM facebook_groups g LEFT JOIN facebook_group_rules r ON r.group_id = g.id
     WHERE g.id = $1 AND g.deleted_at IS NULL`, [input.groupId],
  ) : null;
  if (input.campaignId) {
    const campaignContext = await queryOne<{ targets_group: boolean; contains_product: boolean }>(
      `SELECT EXISTS (
                SELECT 1 FROM facebook_group_campaign_targets target
                WHERE target.campaign_id = campaign.id AND target.group_id = $2
              ) AS targets_group,
              campaign.product_ids ? $3 AS contains_product
       FROM facebook_group_campaigns campaign
       WHERE campaign.id = $1 AND campaign.deleted_at IS NULL`,
      [input.campaignId, input.groupId || null, productId],
    );
    if (!campaignContext) throw new Error("Không tìm thấy chiến dịch.");
    if (!campaignContext.targets_group) throw new Error("Group không thuộc chiến dịch.");
    if (!campaignContext.contains_product) throw new Error("Sản phẩm không thuộc chiến dịch.");
  }
  const settings = await getFacebookGroupSettings();
  const ruleAnalysis = group?.rule_analysis
    ? (typeof group.rule_analysis === "string" ? JSON.parse(group.rule_analysis) : group.rule_analysis)
    : {};
  const versionRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM facebook_group_content_drafts
     WHERE group_id IS NOT DISTINCT FROM $1 AND created_at::date = CURRENT_DATE`,
    [input.groupId || null],
  );
  const sourceCode = text(input.sourceCode, 80) || generateFacebookGroupSourceCode({
    groupCode: group?.code || "GROUP",
    productCode: text(input.productCode, 20) || "SMF",
    date: new Date(),
    version: Number(versionRow?.count || 0) + 1,
  });
  const cta = buildFacebookGroupContactCta({
    rawCta: text(input.cta, 5000),
    ruleAnalysis,
    contact: settings.contact,
  });
  const recent = await query<{ id: string; opening: string; body: string; cta: string; created_at: Date }>(
    `SELECT id, opening, body, cta, created_at FROM facebook_group_content_drafts
     WHERE deleted_at IS NULL AND created_at >= NOW() - INTERVAL '30 days'
       AND ($1::text IS NULL OR group_id = $1)
       AND ($2::text IS NULL OR campaign_id = $2)
       AND ($3::text IS NULL OR product_id = $3)
     ORDER BY created_at DESC LIMIT 100`,
    [input.groupId || null, input.campaignId || null, productId],
  );
  const full = `${text(input.opening, 5000)} ${body} ${cta}`;
  const match = recent.map(item => ({
    id: item.id,
    ratio: contentSimilarityPercent(full, `${item.opening} ${item.body} ${item.cta}`),
  })).sort((a, b) => b.ratio - a.ratio)[0];
  const duplicateRatio = match?.ratio || 0;
  const violations: string[] = [];
  if (group?.allows_sales === "no" && ["sales", "direct_sale"].includes(text(input.contentType, 50))) {
    violations.push("Group không cho phép bài bán hàng.");
  }
  if (ruleAnalysis.allowsPrice === false && /\b\d[\d.,]*\s*(đ|vnd|triệu|tr)\b/i.test(full)) {
    violations.push("Nội quy không cho phép đăng giá.");
  }
  if (ruleAnalysis.allowsPhone === false && /(?:\+?84|0)(?:[\s.\-]?\d){8,10}/.test(full)) {
    violations.push("Nội quy không cho phép số điện thoại.");
  }
  if (ruleAnalysis.allowsLink === false && /https?:\/\//i.test(full)) {
    violations.push("Nội quy không cho phép đường dẫn.");
  }
  const rulesPassed = violations.length === 0 && duplicateRatio <= settings.maxDuplicateRatio;
  const status = duplicateRatio > 60 || violations.length ? "rewrite_required" : text(input.status, 30) || "draft";
  const aiMetadata = asObject(input.aiMetadata);
  const entityId = id("fbcd");
  const row = await queryOne(
    `INSERT INTO facebook_group_content_drafts
     (id,campaign_id,product_id,group_id,pillar_id,experiment_id,content_type,opening,body,cta,source_code,status,
      duplicate_ratio,spam_risk_score,rule_check,ai_metadata,data,created_by,updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16::jsonb,$17::jsonb,$18,$18)
     RETURNING *`,
    [entityId, input.campaignId || null, productId, input.groupId || null,
      text(input.pillarId, 120) || null, text(input.experimentId, 120) || null,
      text(input.contentType, 50) || "community_share", text(input.opening, 5000), body,
      cta, sourceCode, status, duplicateRatio,
      Math.min(100, Math.max(0, number(input.spamRiskScore))),
      JSON.stringify({ passed: rulesPassed, violations, closestContentId: match?.id || null }),
      JSON.stringify({ generatedByAi: Boolean(aiMetadata.generatedByAi), ...aiMetadata }),
      JSON.stringify(asObject(input.data)), actor.id],
  );
  await logActivity(actor, "content.created", "content", entityId, undefined, { duplicateRatio, sourceCode });
  return row;
}

async function resolveGroundedFacebookGroupSource(source: { title?: string; uri?: string }) {
  const uri = text(source.uri, 4000);
  if (!uri) return null;
  const direct = parseFacebookGroupUrl(uri);
  if (direct) {
    return {
      title: text(source.title, 300),
      sourceUrl: uri,
      groupUrl: `https://www.facebook.com/groups/${direct.groupKey}/`,
    };
  }
  let redirectUrl: URL;
  try {
    redirectUrl = new URL(uri);
  } catch {
    return {
      title: text(source.title, 300),
      sourceUrl: uri,
      groupUrl: null,
    };
  }
  const host = redirectUrl.hostname.toLowerCase();
  const trustedGoogleRedirect = host === "google.com"
    || host.endsWith(".google.com")
    || host.endsWith(".googleusercontent.com");
  if (redirectUrl.protocol !== "https:") return null;
  if (!trustedGoogleRedirect) {
    return {
      title: text(source.title, 300),
      sourceUrl: uri,
      groupUrl: null,
    };
  }
  try {
    const response = await fetch(uri, {
      method: "GET",
      redirect: "manual",
      headers: { "User-Agent": "SmartFurni-CRM/1.0 (grounding-source-verification)" },
      signal: AbortSignal.timeout(8_000),
    });
    const location = response.headers.get("location");
    if (!location) {
      return {
        title: text(source.title, 300),
        sourceUrl: uri,
        groupUrl: null,
      };
    }
    const target = new URL(location, uri).toString();
    const parsed = parseFacebookGroupUrl(target);
    if (!parsed) {
      return {
        title: text(source.title, 300),
        sourceUrl: uri,
        groupUrl: null,
      };
    }
    return {
      title: text(source.title, 300),
      sourceUrl: uri,
      groupUrl: `https://www.facebook.com/groups/${parsed.groupKey}/`,
    };
  } catch {
    return {
      title: text(source.title, 300),
      sourceUrl: uri,
      groupUrl: null,
    };
  }
}

export async function discoverFacebookGroups(input: Record<string, unknown>, actor: Actor) {
  const topic = text(input.topic, 120);
  const region = text(input.region, 120) || "Việt Nam";
  const keywords = text(input.keywords, 500);
  if (!topic) throw new Error("Chọn một chủ đề trước khi yêu cầu AI Agent tìm Group.");
  const topicSettings = await getFacebookGroupSettings();
  const topicConfig = topicSettings.groupTopics.find(item => item.key === topic)
    || FACEBOOK_GROUP_TOPIC_TAXONOMY.find(item => item.key === topic);
  const searchTerms = topicConfig?.searchTerms.join(", ") || topic;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY chưa được cấu hình.");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const existing = await query<{ id: string; name: string; group_url: string }>(
    `SELECT id, name, group_url FROM facebook_groups WHERE deleted_at IS NULL`,
  );
  const existingKeys = new Map(existing.flatMap(group => {
    const parsed = parseFacebookGroupUrl(group.group_url);
    return parsed ? [[parsed.groupKey, { id: group.id, name: group.name }]] : [];
  }));
  const prompt = `Bạn là AI Agent nghiên cứu cộng đồng cho SmartFurni.
Dùng Google Search để tìm tối đa 6 Facebook Group công khai, còn tồn tại và liên quan trực tiếp.

Tiêu chí:
- Chủ đề chuẩn: ${topic}
- Từ khóa chủ đề: ${searchTerms}
- Khu vực ưu tiên: ${region}
- Yêu cầu bổ sung: ${keywords || "không có"}
- Mọi truy vấn Google phải giới hạn bằng site:facebook.com/groups.
- Chỉ chấp nhận URL chính xác có dạng https://www.facebook.com/groups/<id-hoặc-slug>/
- Không đưa Fanpage, profile, bài viết riêng lẻ hoặc URL tìm kiếm.
- Không đưa các Group CRM đã có: ${existing.map(group => group.group_url).join(", ") || "chưa có"}.
- Không suy đoán số thành viên, nội quy, khả năng cho Fanpage hoặc khả năng bán hàng.
- Mỗi đề xuất phải nêu ngắn gọn lý do liên quan dựa trên tên/mô tả xuất hiện trong kết quả tìm kiếm.
- matchScore phải là số nguyên từ 0 đến 100 (ví dụ 92), không dùng thang 0 đến 1.
- Nếu không xác minh được URL chính xác từ Google Search thì bỏ qua, không bịa.

Trả về duy nhất JSON hợp lệ:
{"groups":[{"name":"Tên Group","groupUrl":"https://www.facebook.com/groups/.../","topic":"${topic}","region":"${region}","reason":"Lý do phù hợp","matchScore":92}]}`;

  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
        signal: AbortSignal.timeout(65_000),
      },
    );
  } catch (error) {
    if (error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name)) {
      throw new Error("Google Search đang phản hồi chậm. Hãy thử lại hoặc thu hẹp khu vực/từ khóa.");
    }
    throw error;
  }
  const payload = await response.json().catch(() => ({})) as {
    error?: { message?: string };
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      groundingMetadata?: {
        webSearchQueries?: string[];
        groundingChunks?: Array<{ web?: { title?: string; uri?: string } }>;
      };
    }>;
  };
  if (!response.ok) {
    throw new Error(payload.error?.message || "Gemini Google Search chưa trả về được đề xuất Group.");
  }
  const candidate = payload.candidates?.[0];
  const rawText = candidate?.content?.parts?.map(part => part.text || "").join("\n") || "";
  const parsedSuggestions = parseFacebookGroupDiscoveryResponse(rawText, { topic, region });
  const groundedSources = (await Promise.all(
    (candidate?.groundingMetadata?.groundingChunks || [])
      .map(chunk => resolveGroundedFacebookGroupSource(chunk.web || {})),
  )).filter((source): source is NonNullable<typeof source> => Boolean(source));
  const suggestions = keepGroundedFacebookGroupSuggestions(
    parsedSuggestions,
    groundedSources.flatMap(source => source.groupUrl ? [{
      title: source.title,
      groupUrl: source.groupUrl,
    }] : []),
    { topic, region },
  );
  const verifiedResult = suggestions.map(item => {
    const parsed = parseFacebookGroupUrl(item.groupUrl);
    const saved = parsed ? existingKeys.get(parsed.groupKey) : undefined;
    return {
      ...item,
      alreadySaved: Boolean(saved),
      existingGroupId: saved?.id || null,
      verificationStatus: "grounded_needs_manual_confirmation",
    };
  });
  const verifiedSourceUrls = new Set(groundedSources
    .filter(source => source.groupUrl)
    .map(source => source.sourceUrl));
  const seenSourceUrls = new Set<string>();
  const sourceOnlyResult = groundedSources
    .filter(source => {
      if (verifiedSourceUrls.has(source.sourceUrl) || seenSourceUrls.has(source.sourceUrl)) return false;
      seenSourceUrls.add(source.sourceUrl);
      return true;
    })
    .map((source, index) => ({
      name: source.title || `Nguồn Google Search ${index + 1}`,
      groupUrl: source.groupUrl || "",
      sourceUrl: source.sourceUrl,
      topic,
      region,
      reason: `Mở nguồn Google, kiểm tra Group trên Facebook rồi dán lại URL đang truy cập được.`,
      matchScore: 70,
      alreadySaved: false,
      existingGroupId: null,
      groundedSource: true,
      requiresVerifiedUrl: !source.groupUrl,
      verificationStatus: "grounded_source_needs_verified_url",
    }));
  const result = [...verifiedResult, ...sourceOnlyResult].slice(0, 10);
  await logActivity(actor, "groups.ai_discovered", "group", undefined, undefined, {
    topic, region, keywords: keywords || null, resultCount: result.length, model,
  });
  return {
    suggestions: result,
    searchQueries: candidate?.groundingMetadata?.webSearchQueries || [],
    model,
    notice: "Chỉ hiển thị nguồn Google Search thật; nếu citation không lộ URL Facebook, hãy mở nguồn và dán URL Group đang xem được để xác nhận.",
  };
}

export async function suggestFacebookGroupContent(input: Record<string, unknown>, actor: Actor) {
  const groupId = text(input.groupId, 120);
  const productId = text(input.productId, 120);
  if (!groupId || !productId) throw new Error("Chọn Group và sản phẩm trước khi yêu cầu AI gợi ý.");
  const context = await queryOne<{
    group_name: string;
    group_topic: string | null;
    group_region: string | null;
    allows_sales: string;
    rule_text: string;
    rule_analysis: Record<string, unknown> | string;
    product: Record<string, unknown> | string;
    campaign_name: string | null;
  }>(
    `SELECT g.name AS group_name, g.topic AS group_topic, g.region AS group_region,
            g.allows_sales, COALESCE(r.raw_text, '') AS rule_text,
            COALESCE(r.analysis, '{}'::jsonb) AS rule_analysis,
            product.data AS product, campaign.name AS campaign_name
     FROM facebook_groups g
     JOIN crm_products product ON product.id = $2
     LEFT JOIN facebook_group_rules r ON r.group_id = g.id
     LEFT JOIN facebook_group_campaigns campaign ON campaign.id = $3
     WHERE g.id = $1 AND g.deleted_at IS NULL`,
    [groupId, productId, input.campaignId || null],
  );
  if (!context) throw new Error("Không tìm thấy Group hoặc sản phẩm.");
  const product = typeof context.product === "string" ? JSON.parse(context.product) : context.product;
  const analysis = typeof context.rule_analysis === "string"
    ? JSON.parse(context.rule_analysis) : context.rule_analysis;
  const settings = await getFacebookGroupSettings();
  const prompt = `Bạn là chuyên viên nội dung Facebook Group của SmartFurni.
Hãy viết một bài chia sẻ có ích, tự nhiên, phù hợp đúng cộng đồng; không giả làm khách hàng,
không bịa trải nghiệm, không dùng ngôn ngữ spam và không tự động đăng.

Group:
- Tên: ${context.group_name}
- Chủ đề: ${context.group_topic || "chưa phân loại"}
- Khu vực: ${context.group_region || "không giới hạn"}
- Cho phép bán hàng: ${context.allows_sales}
- Nội quy do nhân viên nhập: ${context.rule_text || "chưa có văn bản"}
- Phân tích nội quy: ${JSON.stringify(analysis)}

Sản phẩm CRM (chỉ dùng dữ liệu có thật, không tự bịa thông số/giá):
${JSON.stringify(product).slice(0, 8000)}

Chiến dịch: ${context.campaign_name || "nội dung thường xuyên"}
Góc nội dung mong muốn: ${text(input.contentType, 50) || "community_share"}
Gợi ý thêm của nhân viên: ${text(input.brief, 2000) || "không có"}

Trả về DUY NHẤT JSON hợp lệ:
{"opening":"câu mở đầu","body":"nội dung chính 120-250 từ","cta":"lời mời hành động ngắn, không tự đặt mã nguồn và không tự bịa liên hệ","contentType":"community_share|education|story|sales"}
Nếu nội quy không cho bán hàng, phải ưu tiên education hoặc community_share.
Không tự chèn giá, số điện thoại hoặc link; hệ thống sẽ bổ sung liên hệ chính thức theo nội quy đã xác minh.`;
  const generated = await generateFacebookGroupAiJson<Record<string, unknown>>({
    prompt,
    settings: settings.ai,
    selection: text(input.aiModel, 100) || null,
    temperature: 0.65,
    maxOutputTokens: 1800,
  });
  const suggestion = parseFacebookGroupAiSuggestion(JSON.stringify(generated.result));
  const result = {
    opening: text(suggestion.opening, 5000),
    body: text(suggestion.body, 30_000),
    cta: buildFacebookGroupContactCta({
      rawCta: text(suggestion.cta, 5000),
      ruleAnalysis: analysis,
      contact: settings.contact,
    }),
    contentType: text(suggestion.contentType, 50) || "community_share",
    ai: {
      provider: generated.provider,
      model: generated.model,
      fallbackUsed: generated.fallbackUsed,
    },
  };
  if (!result.body) throw new Error("AI chưa tạo được nội dung chính.");
  await logActivity(actor, "content.ai_suggested", "content", undefined, undefined, {
    groupId,
    productId,
    provider: generated.provider,
    model: generated.model,
    fallbackUsed: generated.fallbackUsed,
  });
  return result;
}

type AssignmentNotificationResult = {
  matched: number;
  sent: number;
  removed: number;
  failed?: number;
  errors?: string[];
  error?: string;
};

async function notifyPublishingTaskAssignment(taskId: string): Promise<AssignmentNotificationResult> {
  const task = await queryOne<{
    id: string;
    assigned_staff_id: string | null;
    scheduled_at: Date;
    group_name: string;
    page_name: string;
  }>(
    `SELECT t.id, t.assigned_staff_id, t.scheduled_at,
            g.name AS group_name, p.name AS page_name
     FROM facebook_group_publishing_tasks t
     JOIN facebook_groups g ON g.id = t.group_id
     JOIN facebook_pages p ON p.id = t.page_id
     WHERE t.id = $1 AND t.deleted_at IS NULL`,
    [taskId],
  );
  if (!task?.assigned_staff_id) return { matched: 0, sent: 0, removed: 0 };
  try {
    return await sendPushNotification({
      ownerScope: "crm",
      ownerId: task.assigned_staff_id,
      title: "Bạn được giao nhiệm vụ đăng Facebook Group",
      body: `${task.page_name} → ${task.group_name} • ${new Date(task.scheduled_at).toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
      })}`,
      url: "/crm/facebook-group-marketing/tasks",
      tag: `fbg-assigned-${task.id}`,
      data: { taskId: task.id, module: "facebook-group-marketing", type: "task-assigned" },
      urgency: "high",
    });
  } catch (error) {
    console.error("[Facebook Group Marketing] Không thể gửi thông báo giao nhiệm vụ:", error);
    return {
      matched: 0,
      sent: 0,
      removed: 0,
      error: error instanceof Error ? error.message : "Không thể gửi Web Push.",
    };
  }
}

export async function sendFacebookGroupTaskDigest(actor: Actor) {
  if (!actor.id || actor.id === "admin") {
    return { matched: 0, sent: 0, removed: 0, taskCount: 0 };
  }
  const tasks = await query<{
    id: string;
    scheduled_at: Date;
    group_name: string;
  }>(
    `SELECT t.id, t.scheduled_at, g.name AS group_name
     FROM facebook_group_publishing_tasks t
     JOIN facebook_groups g ON g.id = t.group_id
     WHERE t.deleted_at IS NULL
       AND t.assigned_staff_id = $1
       AND t.status IN ('scheduled', 'due')
       AND t.due_at >= NOW() - INTERVAL '1 day'
     ORDER BY t.scheduled_at ASC
     LIMIT 5`,
    [actor.id],
  );
  if (!tasks.length) return { matched: 0, sent: 0, removed: 0, taskCount: 0 };
  const first = tasks[0];
  const result = await sendPushNotification({
    ownerScope: "crm",
    ownerId: actor.id,
    title: tasks.length === 1 ? "Bạn có 1 nhiệm vụ đăng Facebook Group" : `Bạn có ${tasks.length} nhiệm vụ đăng Facebook Group`,
    body: `${first.group_name} • ${new Date(first.scheduled_at).toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
    })}${tasks.length > 1 ? ` • và ${tasks.length - 1} nhiệm vụ khác` : ""}`,
    url: "/crm/facebook-group-marketing/tasks",
    tag: `fbg-task-digest-${actor.id}`,
    data: { taskId: first.id, module: "facebook-group-marketing", type: "task-digest" },
  });
  return { ...result, taskCount: tasks.length };
}

async function createPublishingTask(input: Record<string, unknown>, actor: Actor) {
  const pageId = text(input.pageId, 120);
  const groupId = text(input.groupId, 120);
  const contentId = text(input.contentId, 120);
  const scheduledAt = text(input.scheduledAt, 60);
  if (!pageId || !groupId || !contentId || !scheduledAt) {
    throw new Error("Fanpage, group, nội dung và thời gian đăng là bắt buộc.");
  }
  const settings = await getFacebookGroupSettings();
  const context = await queryOne<{
    content_status: import("./facebook-group-marketing-types").ContentStatus;
    content_group_id: string | null;
    content_campaign_id: string | null;
    duplicate_ratio: number;
    rule_check: { passed?: boolean } | string;
    group_status: import("./facebook-group-marketing-types").EntityStatus;
    membership_status: import("./facebook-group-marketing-types").MembershipStatus;
    next_allowed_post_at: Date | null;
    campaign_page_id: string | null;
    campaign_status: string | null;
    campaign_targets_group: boolean | null;
  }>(
    `SELECT c.status AS content_status, c.group_id AS content_group_id,
            c.campaign_id AS content_campaign_id, c.duplicate_ratio, c.rule_check,
            g.status AS group_status,
            COALESCE(m.status, g.membership_status) AS membership_status,
            g.next_allowed_post_at,
            campaign.page_id AS campaign_page_id,
            campaign.status AS campaign_status,
            CASE WHEN campaign.id IS NULL THEN NULL ELSE EXISTS (
              SELECT 1 FROM facebook_group_campaign_targets target
              WHERE target.campaign_id = campaign.id AND target.group_id = g.id
            ) END AS campaign_targets_group
     FROM facebook_group_content_drafts c
     JOIN facebook_groups g ON g.id = $2
     LEFT JOIN facebook_group_memberships m ON m.page_id = $3 AND m.group_id = g.id
     LEFT JOIN facebook_group_campaigns campaign ON campaign.id = COALESCE($4, c.campaign_id)
     WHERE c.id = $1 AND c.deleted_at IS NULL AND g.deleted_at IS NULL`,
    [contentId, groupId, pageId, input.campaignId || null],
  );
  if (!context) throw new Error("Không tìm thấy nội dung hoặc group.");
  if (context.content_group_id && context.content_group_id !== groupId) {
    throw new Error("Nội dung không được viết cho Group đã chọn.");
  }
  if (input.campaignId && context.content_campaign_id && input.campaignId !== context.content_campaign_id) {
    throw new Error("Nội dung không thuộc chiến dịch đã chọn.");
  }
  if (context.campaign_page_id && context.campaign_page_id !== pageId) {
    throw new Error("Fanpage không khớp với Fanpage của chiến dịch.");
  }
  if (context.campaign_status && context.campaign_status !== "active") {
    throw new Error("Chiến dịch phải ở trạng thái hoạt động trước khi xếp lịch.");
  }
  if (context.campaign_targets_group === false) {
    throw new Error("Group không nằm trong danh sách mục tiêu của chiến dịch.");
  }
  const target = new Date(scheduledAt);
  const start = new Date(target); start.setHours(0, 0, 0, 0);
  const end = new Date(target); end.setHours(23, 59, 59, 999);
  const pagePosts = await query<{ scheduled_at: Date }>(
    `SELECT scheduled_at FROM facebook_group_publishing_tasks
     WHERE page_id = $1 AND deleted_at IS NULL AND status NOT IN ('cancelled')
       AND scheduled_at BETWEEN $2 AND $3`,
    [pageId, start.toISOString(), end.toISOString()],
  );
  const employee = text(input.assignedStaffId, 120) || null;
  const employeeTasks = employee ? await query<{ scheduled_at: Date }>(
    `SELECT scheduled_at FROM facebook_group_publishing_tasks
     WHERE assigned_staff_id = $1 AND deleted_at IS NULL AND status NOT IN ('cancelled')
       AND scheduled_at BETWEEN $2 AND $3`,
    [employee, start.toISOString(), end.toISOString()],
  ) : [];
  const ruleCheck = typeof context.rule_check === "string" ? JSON.parse(context.rule_check) : context.rule_check;
  const validation = validateFacebookGroupSchedule({
    scheduledAt,
    contentStatus: context.content_status,
    duplicateRatio: Number(context.duplicate_ratio),
    ruleCheckPassed: ruleCheck?.passed === true,
    groupStatus: context.group_status,
    membershipStatus: context.membership_status,
    groupNextAllowedPostAt: context.next_allowed_post_at?.toISOString(),
    pagePostsSameDay: pagePosts.map(item => item.scheduled_at.toISOString()),
    employeeTasksAt: employeeTasks.map(item => item.scheduled_at.toISOString()),
  }, settings);
  if (!validation.ok) throw new Error(validation.errors.join(" "));
  const entityId = id("fbpt");
  const dueAt = text(input.dueAt, 60) || new Date(target.getTime() + 30 * 60_000).toISOString();
  const idempotencyKey = [
    "facebook-group-publishing-task",
    pageId,
    groupId,
    contentId,
    target.toISOString(),
  ].join(":");
  const row = await queryOne<Record<string, unknown>>(
    `INSERT INTO facebook_group_publishing_tasks
     (id,page_id,group_id,campaign_id,content_id,assigned_staff_id,scheduled_at,due_at,
      priority,status,warnings,notes,idempotency_key,created_by,updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'scheduled',$10::jsonb,$11,$12,$13,$13)
     ON CONFLICT (idempotency_key)
       WHERE idempotency_key IS NOT NULL AND deleted_at IS NULL
     DO NOTHING
     RETURNING *`,
    [entityId, pageId, groupId, input.campaignId || null, contentId, employee, scheduledAt, dueAt,
      text(input.priority, 20) || "medium", JSON.stringify(validation.warnings),
      text(input.notes, 5000), idempotencyKey, actor.id],
  );
  if (!row) {
    const existing = await queryOne<Record<string, unknown>>(
      `SELECT * FROM facebook_group_publishing_tasks
       WHERE idempotency_key = $1 AND deleted_at IS NULL`,
      [idempotencyKey],
    );
    if (!existing) throw new Error("Không thể xác định nhiệm vụ đã được tạo.");
    return { ...existing, duplicate: true, assignmentNotification: null };
  }
  await query(`UPDATE facebook_group_content_drafts SET status = 'scheduled', updated_at = NOW() WHERE id = $1`, [contentId]);
  await logActivity(actor, "task.scheduled", "publishing_task", entityId, undefined, { scheduledAt });
  const assignmentNotification = await notifyPublishingTaskAssignment(entityId);
  return { ...row, assignmentNotification };
}

export async function updateFacebookGroupMarketing(
  resource: string, entityId: string, input: Record<string, unknown>, actor: Actor,
) {
  if (resource === "posts" && input.postUrl) {
    const parsedPost = parseFacebookGroupPostUrl(text(input.postUrl, 2000));
    const postContext = await queryOne<{ group_url: string }>(
      `SELECT g.group_url
       FROM facebook_group_published_posts p
       JOIN facebook_groups g ON g.id = p.group_id
       WHERE p.id = $1 AND p.deleted_at IS NULL`,
      [entityId],
    );
    const configuredGroup = postContext ? parseFacebookGroupUrl(postContext.group_url) : null;
    if (!parsedPost || !configuredGroup || parsedPost.groupKey !== configuredGroup.groupKey) {
      throw new Error("Link bài đăng phải thuộc đúng Facebook Group đã cấu hình.");
    }
  }
  if (resource === "groups" && input.status === "active") {
    const readiness = await queryOne<{
      allows_pages: string;
      membership_status: string;
      analyzed_at: Date | null;
    }>(
      `SELECT g.allows_pages, g.membership_status, r.analyzed_at
       FROM facebook_groups g
       LEFT JOIN facebook_group_rules r ON r.group_id = g.id
       WHERE g.id = $1 AND g.deleted_at IS NULL`,
      [entityId],
    );
    if (!readiness) throw new Error("Không tìm thấy Group.");
    if (readiness.allows_pages !== "yes") throw new Error("Chưa xác nhận Group cho phép Fanpage đăng bài.");
    if (readiness.membership_status !== "joined") throw new Error("Chưa xác nhận Fanpage đã tham gia Group.");
    if (!readiness.analyzed_at) throw new Error("Phải nhập và phân tích nội quy trước khi kích hoạt Group.");
  }
  if (resource === "campaigns" && input.status === "active") {
    const current = await queryOne<{ page_id: string | null; product_ids: unknown }>(
      `SELECT page_id, product_ids
       FROM facebook_group_campaigns
       WHERE id = $1 AND deleted_at IS NULL`,
      [entityId],
    );
    if (!current) throw new Error("Không tìm thấy chiến dịch.");
    const pageId = text(input.pageId, 120) || current.page_id;
    const currentProducts = Array.isArray(current.product_ids)
      ? current.product_ids
      : typeof current.product_ids === "string" ? JSON.parse(current.product_ids) : [];
    const productIds = Array.isArray(input.productIds) ? input.productIds : currentProducts;
    const currentTargets = await query<{ group_id: string }>(
      `SELECT group_id FROM facebook_group_campaign_targets WHERE campaign_id = $1`,
      [entityId],
    );
    const groupIds = Array.isArray(input.groupIds)
      ? input.groupIds.map(item => text(item, 120)).filter(Boolean)
      : currentTargets.map(item => item.group_id);
    const page = pageId ? await queryOne<{ status: string }>(
      `SELECT status FROM facebook_pages WHERE id = $1 AND deleted_at IS NULL`,
      [pageId],
    ) : null;
    const targetReadiness = groupIds.length ? await queryOne<{ valid_count: number }>(
      `SELECT COUNT(*) FILTER (
         WHERE status = 'active' AND membership_status = 'joined' AND allows_pages = 'yes'
       )::int AS valid_count
       FROM facebook_groups
       WHERE id = ANY($1::text[]) AND deleted_at IS NULL`,
      [groupIds],
    ) : null;
    if (!pageId || page?.status !== "active") {
      throw new Error("Chiến dịch cần một Fanpage đang hoạt động.");
    }
    if (!groupIds.length) throw new Error("Chiến dịch chưa có Group mục tiêu.");
    if (!productIds.length) throw new Error("Chiến dịch chưa có sản phẩm.");
    if (Number(targetReadiness?.valid_count || 0) !== groupIds.length) {
      throw new Error("Có Group mục tiêu chưa sẵn sàng: cần hoạt động, đã tham gia và cho phép Fanpage.");
    }
  }
  if (resource === "content") {
    const current = await queryOne<{
      opening: string;
      body: string;
      cta: string;
      rule_analysis: Record<string, unknown> | string | null;
    }>(
      `SELECT content.opening, content.body, content.cta,
              rules.analysis AS rule_analysis
       FROM facebook_group_content_drafts content
       LEFT JOIN facebook_group_rules rules ON rules.group_id = content.group_id
       WHERE content.id = $1 AND content.deleted_at IS NULL`,
      [entityId],
    );
    if (!current) throw new Error("Không tìm thấy nội dung.");
    const ruleAnalysis = current.rule_analysis
      ? (typeof current.rule_analysis === "string" ? JSON.parse(current.rule_analysis) : current.rule_analysis)
      : {};
    // Khi chỉnh sửa, nội dung người dùng nhập là nguồn dữ liệu chính xác.
    // Hệ thống chỉ kiểm tra nội quy, không tự chèn lại mã nguồn hoặc liên hệ đã bị xóa.
    const cta = "cta" in input ? text(input.cta, 5000) : current.cta;
    const full = `${"opening" in input ? text(input.opening, 5000) : current.opening} ${
      "body" in input ? text(input.body, 30_000) : current.body
    } ${cta}`;
    const violations: string[] = [];
    if (ruleAnalysis.allowsPrice === false && /\b\d[\d.,]*\s*(đ|vnd|triệu|tr)\b/i.test(full)) {
      violations.push("Nội quy không cho phép đăng giá.");
    }
    if (ruleAnalysis.allowsPhone === false && /(?:\+?84|0)(?:[\s.\-]?\d){8,10}/.test(full)) {
      violations.push("Nội quy không cho phép số điện thoại.");
    }
    if (ruleAnalysis.allowsLink === false && /https?:\/\//i.test(full)) {
      violations.push("Nội quy không cho phép đường dẫn.");
    }
    input.cta = cta;
    input.ruleCheck = { passed: violations.length === 0, violations, checkedAfterEdit: true };
    if (violations.length) input.status = "rewrite_required";
  }
  const allowed: Record<string, { table: string; columns: Record<string, string> }> = {
    pages: { table: "facebook_pages", columns: {
      name: "name", facebookPageId: "facebook_page_id", avatarUrl: "avatar_url", pageUrl: "page_url",
      brand: "brand", managerId: "manager_id", status: "status", maxPostsPerDay: "max_posts_per_day",
      minPostIntervalMinutes: "min_post_interval_minutes", allowedPostingHours: "allowed_posting_hours",
      notes: "notes", data: "data",
    } },
    groups: { table: "facebook_groups", columns: {
      code: "code", name: "name", groupUrl: "group_url", facebookGroupId: "facebook_group_id",
      topic: "topic", region: "region", memberCount: "member_count", allowsPages: "allows_pages",
      membershipStatus: "membership_status", allowsSales: "allows_sales",
      assignedStaffId: "assigned_staff_id", nextAllowedPostAt: "next_allowed_post_at",
      status: "status", groupKind: "group_kind", lifecycleStage: "lifecycle_stage",
      blueprintId: "blueprint_id", data: "data",
    } },
    campaigns: { table: "facebook_group_campaigns", columns: {
      code: "code", name: "name", pageId: "page_id", productIds: "product_ids", ownerId: "owner_id",
      startDate: "start_date", endDate: "end_date", status: "status", targets: "targets", data: "data",
    } },
    content: { table: "facebook_group_content_drafts", columns: {
      opening: "opening", body: "body", cta: "cta", sourceCode: "source_code",
      contentType: "content_type", pillarId: "pillar_id", experimentId: "experiment_id",
      status: "status", ruleCheck: "rule_check", data: "data",
    } },
    tasks: { table: "facebook_group_publishing_tasks", columns: {
      assignedStaffId: "assigned_staff_id", scheduledAt: "scheduled_at", dueAt: "due_at",
      priority: "priority", status: "status", notes: "notes",
    } },
    posts: { table: "facebook_group_published_posts", columns: {
      postUrl: "post_url", actualPostedAt: "actual_posted_at",
      moderationStatus: "moderation_status", status: "status", metrics: "metrics",
      lastCheckedAt: "last_checked_at",
    } },
    comments: { table: "facebook_group_comments", columns: {
      facebookName: "facebook_name", facebookUrl: "facebook_url", content: "content",
      commentedAt: "commented_at", phone: "phone", intent: "intent",
      temperature: "temperature", replied: "replied",
      invitedToMessenger: "invited_to_messenger", enteredMessenger: "entered_messenger",
      leadId: "lead_id", assignedStaffId: "assigned_staff_id", notes: "notes",
    } },
    checks: { table: "facebook_group_post_check_tasks", columns: {
      dueAt: "due_at", assignedStaffId: "assigned_staff_id", status: "status", result: "result",
    } },
  };
  const config = allowed[resource];
  if (!config) throw new Error("Tài nguyên không hỗ trợ cập nhật.");
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [key, column] of Object.entries(config.columns)) {
    if (!(key in input)) continue;
    const raw = key === "notes" && input[key] == null ? "" : input[key];
    values.push(["data", "targets", "productIds", "allowedPostingHours", "ruleCheck", "metrics"].includes(key)
      ? JSON.stringify(raw) : raw);
    fields.push(`${column} = $${values.length}${["data", "targets", "productIds", "allowedPostingHours", "ruleCheck", "metrics"].includes(key) ? "::jsonb" : ""}`);
  }
  if (
    resource === "tasks"
    && (
      "scheduledAt" in input
      || "assignedStaffId" in input
      || input.status === "scheduled"
      || input.status === "due"
    )
  ) {
    // A changed schedule or assignee must produce a fresh due-time reminder.
    fields.push("notification_sent_at = NULL");
  }
  const hasCampaignGroups = resource === "campaigns" && Array.isArray(input.groupIds);
  if (!fields.length && !hasCampaignGroups) throw new Error("Không có dữ liệu hợp lệ để cập nhật.");
  let row: Record<string, unknown> | null = null;
  const activeRowClause = " AND deleted_at IS NULL";
  if (fields.length) {
    values.push(actor.id, entityId);
    row = await queryOne(
      `UPDATE ${config.table} SET ${fields.join(", ")}, updated_by = $${values.length - 1}, updated_at = NOW()
       WHERE id = $${values.length}${activeRowClause} RETURNING *`,
      values,
    );
  } else {
    row = await queryOne(`SELECT * FROM ${config.table} WHERE id = $1${activeRowClause}`, [entityId]);
  }
  if (!row) throw new Error("Không tìm thấy bản ghi.");
  if (resource === "content" && input.status === "draft") {
    await query(
      `UPDATE facebook_group_content_drafts
       SET approved_by = NULL, approved_at = NULL
       WHERE id = $1`,
      [entityId],
    );
  }
  if (hasCampaignGroups) {
    const groupIds = [...new Set((input.groupIds as unknown[]).map(item => text(item, 120)).filter(Boolean))];
    await query(
      `DELETE FROM facebook_group_campaign_targets
       WHERE campaign_id = $1 AND NOT (group_id = ANY($2::text[]))`,
      [entityId, groupIds],
    );
    for (const groupId of groupIds) {
      await query(
        `INSERT INTO facebook_group_campaign_targets
         (id, campaign_id, group_id, created_by, updated_by)
         VALUES ($1,$2,$3,$4,$4)
         ON CONFLICT (campaign_id, group_id) DO UPDATE
         SET updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
        [id("fbct"), entityId, groupId, actor.id],
      );
    }
  }
  await logActivity(actor, `${resource}.updated`, resource, entityId, undefined, { fields: Object.keys(input) });
  if (resource === "tasks") {
    const assignmentNotification = await notifyPublishingTaskAssignment(entityId);
    return { ...row, assignmentNotification };
  }
  return row;
}

export async function softDeleteFacebookGroupMarketing(resource: string, entityId: string, actor: Actor) {
  const table = {
    pages: "facebook_pages", groups: "facebook_groups", campaigns: "facebook_group_campaigns",
    content: "facebook_group_content_drafts", tasks: "facebook_group_publishing_tasks",
    posts: "facebook_group_published_posts", comments: "facebook_group_comments",
    checks: "facebook_group_post_check_tasks",
  }[resource];
  if (!table) throw new Error("Tài nguyên không hỗ trợ xóa.");
  const deleted = await queryOne(
    `UPDATE ${table}
     SET deleted_at = NOW(), updated_by = $1, updated_at = NOW()
     WHERE id = $2 AND deleted_at IS NULL
     RETURNING id`,
    [actor.id, entityId],
  );
  if (!deleted) throw new Error("Không tìm thấy bản ghi hoặc bản ghi đã được xóa.");
  await logActivity(actor, `${resource}.deleted`, resource, entityId);
}

export async function analyzeGroupRules(groupId: string, actor: Actor) {
  const row = await queryOne<{ raw_text: string }>(`SELECT raw_text FROM facebook_group_rules WHERE group_id = $1`, [groupId]);
  if (!row) throw new Error("Không tìm thấy nội quy group.");
  const result = await analyzeFacebookGroupRulesWithAi(row.raw_text);
  const analysis = result.analysis;
  await query(
    `UPDATE facebook_group_rules SET analysis = $1::jsonb, analyzed_at = NOW(),
     analyzed_by = $2, updated_by = $2, updated_at = NOW() WHERE group_id = $3`,
    [JSON.stringify(analysis), actor.id, groupId],
  );
  await logActivity(actor, "group.rules_analyzed", "group", groupId, undefined, {
    model: result.model,
    mode: result.mode,
  });
  return { ...analysis, _ai: { model: result.model, mode: result.mode } };
}

export async function updateGroupRules(groupId: string, rawText: string, actor: Actor) {
  await query(
    `INSERT INTO facebook_group_rules (id, group_id, raw_text, created_by, updated_by)
     VALUES ($1,$2,$3,$4,$4)
     ON CONFLICT (group_id) DO UPDATE SET raw_text = EXCLUDED.raw_text,
       analysis = '{}'::jsonb, analyzed_at = NULL, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
    [id("fbgr"), groupId, text(rawText, 30_000), actor.id],
  );
  await logActivity(actor, "group.rules_updated", "group", groupId);
}

export async function recalculateGroupScore(groupId: string, actor: Actor) {
  const group = await queryOne<Record<string, unknown>>(`SELECT * FROM facebook_groups WHERE id = $1`, [groupId]);
  if (!group) throw new Error("Không tìm thấy group.");
  const data = asObject(group.data);
  const result = calculateFacebookGroupScore({
    audienceFitPercent: number(data.audienceFitPercent, 50),
    allowsPages: group.allows_pages === "yes",
    allowsSales: group.allows_sales === "yes",
    totalPosts: number(group.total_posts),
    approvedPosts: number(group.approved_posts),
    messengerLeads: number(group.total_messenger_leads),
    qualifiedLeads: number(group.total_qualified_leads),
    orders: number(group.total_orders),
    revenue: number(group.total_revenue),
  }, await getFacebookGroupSettings());
  await query(`UPDATE facebook_groups SET quality_score = $1, grade = $2, updated_at = NOW(), updated_by = $3 WHERE id = $4`,
    [result.score, result.grade, actor.id, groupId]);
  return result;
}

export async function approveContent(contentId: string, approved: boolean, actor: Actor, reason?: string) {
  if (approved) {
    const content = await queryOne<{ duplicate_ratio: number; rule_check: { passed?: boolean } | string; created_by: string }>(
      `SELECT duplicate_ratio, rule_check, created_by FROM facebook_group_content_drafts WHERE id = $1`, [contentId],
    );
    if (!content) throw new Error("Không tìm thấy nội dung.");
    const rules = typeof content.rule_check === "string" ? JSON.parse(content.rule_check) : content.rule_check;
    const settings = await getFacebookGroupSettings();
    if (Number(content.duplicate_ratio) > settings.maxDuplicateRatio) throw new Error("Nội dung trùng lặp vượt ngưỡng.");
    if (rules?.passed !== true) throw new Error("Nội dung chưa đạt kiểm tra nội quy.");
    if (content.created_by === actor.id && !actor.isAdmin) {
      throw new Error("Người tạo không được tự duyệt nội dung của mình.");
    }
  }
  await query(
    `UPDATE facebook_group_content_drafts SET status = $1, approved_by = $2,
     approved_at = CASE WHEN $3 THEN NOW() ELSE NULL END,
     data = data || $4::jsonb, updated_by = $2, updated_at = NOW() WHERE id = $5`,
    [approved ? "approved" : "rewrite_required", actor.id, approved,
      JSON.stringify(reason ? { rejectionReason: reason } : {}), contentId],
  );
  await logActivity(actor, approved ? "content.approved" : "content.rejected", "content", contentId);
}

export async function approveContentAndPreparePublishingTask(
  contentId: string,
  input: Record<string, unknown>,
  actor: Actor,
) {
  const context = await queryOne<{
    group_id: string | null;
    campaign_id: string | null;
    page_id: string | null;
    campaign_owner_id: string | null;
    assigned_staff_id: string | null;
    next_allowed_post_at: Date | null;
    group_status: string | null;
    membership_status: string | null;
    campaign_status: string | null;
    page_status: string | null;
    asset_count: number;
  }>(
    `SELECT content.group_id, content.campaign_id,
            campaign.page_id, campaign.owner_id AS campaign_owner_id,
            groups.assigned_staff_id, groups.next_allowed_post_at,
            groups.status AS group_status,
            COALESCE(membership.status, groups.membership_status) AS membership_status,
            campaign.status AS campaign_status, pages.status AS page_status,
            (SELECT COUNT(*)::int FROM facebook_group_content_assets asset
             WHERE asset.content_id = content.id) AS asset_count
     FROM facebook_group_content_drafts content
     LEFT JOIN facebook_groups groups ON groups.id = content.group_id
     LEFT JOIN facebook_group_campaigns campaign ON campaign.id = content.campaign_id
     LEFT JOIN facebook_pages pages ON pages.id = campaign.page_id
     LEFT JOIN facebook_group_memberships membership
       ON membership.group_id = groups.id AND membership.page_id = campaign.page_id
     WHERE content.id = $1 AND content.deleted_at IS NULL`,
    [contentId],
  );
  if (!context) throw new Error("Không tìm thấy nội dung.");
  if (input.requireImage !== false && Number(context.asset_count || 0) === 0) {
    throw new Error("Bài viết chưa có ảnh đã lưu. Hãy tạo hoặc chọn ảnh trước khi duyệt.");
  }

  await approveContent(contentId, true, actor);

  const warnings: string[] = [];
  if (!context.group_id) warnings.push("Nội dung chưa gắn Group.");
  if (!context.campaign_id) warnings.push("Nội dung chưa gắn chiến dịch.");
  if (!context.page_id) warnings.push("Chiến dịch chưa chọn Fanpage.");
  if (context.group_status !== "active") warnings.push("Group chưa ở trạng thái hoạt động.");
  if (context.membership_status !== "joined") warnings.push("Fanpage chưa được xác nhận đã tham gia Group.");
  if (context.campaign_status !== "active") warnings.push("Chiến dịch chưa hoạt động.");
  if (context.page_status && context.page_status !== "active") warnings.push("Fanpage đang tạm dừng.");
  if (warnings.length || !context.group_id || !context.page_id) {
    return { approved: true, task: null, warnings };
  }

  const settings = await getFacebookGroupSettings();
  const requestedAt = text(input.scheduledAt, 60);
  const requestedDate = requestedAt ? new Date(requestedAt) : null;
  const floor = new Date(Math.max(
    Date.now() + 30 * 60_000,
    context.next_allowed_post_at?.getTime() || 0,
    requestedDate && !Number.isNaN(requestedDate.getTime()) ? requestedDate.getTime() : 0,
  ));
  let candidate = getNextFacebookGroupPostingSlot(floor, settings);
  let lastError = "Không tìm được lịch đăng phù hợp.";
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const task = await createPublishingTask({
        pageId: context.page_id,
        groupId: context.group_id,
        campaignId: context.campaign_id,
        contentId,
        assignedStaffId: text(input.assignedStaffId, 120)
          || context.assigned_staff_id
          || context.campaign_owner_id
          || null,
        scheduledAt: candidate.toISOString(),
        dueAt: new Date(candidate.getTime() + 45 * 60_000).toISOString(),
        priority: text(input.priority, 20) || "medium",
        notes: "Nhiệm vụ được tự động tạo sau khi nội dung và ảnh được duyệt.",
      }, actor);
      return { approved: true, task, scheduledAt: candidate.toISOString(), warnings };
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
      candidate = getNextFacebookGroupPostingSlot(
        new Date(candidate.getTime() + Math.max(30, settings.minPagePostIntervalMinutes) * 60_000),
        settings,
      );
    }
  }
  return { approved: true, task: null, warnings: [...warnings, lastError] };
}

export async function markPublishingTaskPosted(taskId: string, input: Record<string, unknown>, actor: Actor) {
  const postUrl = text(input.postUrl, 2000);
  const actualPostedAt = text(input.actualPostedAt, 60);
  const moderationStatus = text(input.moderationStatus, 30);
  const parsedPostUrl = parseFacebookGroupPostUrl(postUrl);
  if (!parsedPostUrl || !actualPostedAt
      || !["approved", "pending"].includes(moderationStatus)) {
    throw new Error("Cần đúng link bài trong Facebook Group (…/groups/{group}/posts/{post}), thời gian đăng và trạng thái kiểm duyệt.");
  }
  if (Number.isNaN(new Date(actualPostedAt).getTime())) throw new Error("Thời gian đăng thực tế không hợp lệ.");
  const db = getDb();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const taskResult = await client.query(
      `SELECT t.*, c.source_code, g.group_url FROM facebook_group_publishing_tasks t
       JOIN facebook_group_content_drafts c ON c.id = t.content_id
       JOIN facebook_groups g ON g.id = t.group_id
       WHERE t.id = $1 AND t.deleted_at IS NULL FOR UPDATE`, [taskId],
    );
    const task = taskResult.rows[0];
    if (!task) throw new Error("Không tìm thấy nhiệm vụ.");
    if (["posted", "approved"].includes(task.status)) throw new Error("Nhiệm vụ đã được đánh dấu đăng.");
    const configuredGroup = parseFacebookGroupUrl(task.group_url);
    if (!configuredGroup || configuredGroup.groupKey !== parsedPostUrl.groupKey) {
      throw new Error("Link bài đăng không thuộc đúng Group đã chọn trong nhiệm vụ.");
    }
    const postId = id("fbgp");
    await client.query(
      `INSERT INTO facebook_group_published_posts
       (id,task_id,page_id,group_id,campaign_id,content_id,source_code,post_url,posted_by,
        scheduled_at,actual_posted_at,moderation_status,status,created_by,updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'tracking',$9,$9)`,
      [postId, taskId, task.page_id, task.group_id, task.campaign_id, task.content_id,
        task.source_code, postUrl, actor.id, task.scheduled_at, actualPostedAt, moderationStatus],
    );
    await client.query(
      `UPDATE facebook_group_publishing_tasks SET status = $1, updated_by = $2, updated_at = NOW() WHERE id = $3`,
      [moderationStatus === "pending" ? "pending_moderation" : "posted", actor.id, taskId],
    );
    const settings = await getFacebookGroupSettings();
    const checkMinutes = Array.from(new Set([
      ...settings.commentCheckMinutes,
      1440,
      4320,
      10080,
    ])).sort((left, right) => left - right);
    for (const minutes of checkMinutes) {
      await client.query(
        `INSERT INTO facebook_group_post_check_tasks
         (id,post_id,check_type,due_at,assigned_staff_id,created_by,updated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$6)
         ON CONFLICT (post_id, check_type) DO NOTHING`,
        [id("fbgck"), postId, `after_${minutes}m`,
          new Date(new Date(actualPostedAt).getTime() + minutes * 60_000).toISOString(),
          task.assigned_staff_id, actor.id],
      );
    }
    await client.query(
      `UPDATE facebook_groups SET total_posts = total_posts + 1, last_posted_at = $1,
       next_allowed_post_at = $1::timestamptz + ($2 || ' days')::interval,
       updated_at = NOW() WHERE id = $3`,
      [actualPostedAt, settings.minGroupPostIntervalDays, task.group_id],
    );
    await client.query(`UPDATE facebook_group_content_drafts SET status = 'used', updated_at = NOW() WHERE id = $1`, [task.content_id]);
    await client.query("COMMIT");
    await logActivity(actor, "task.marked_posted", "publishing_task", taskId, undefined, { postId, postUrl });
    return { id: postId, taskId, postUrl, checksCreated: checkMinutes.length };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function completePostCheckTask(checkId: string, input: Record<string, unknown>, actor: Actor) {
  const comments = Math.max(0, number(input.commentCount));
  const reactions = Math.max(0, number(input.reactionCount));
  const shares = Math.max(0, number(input.shareCount));
  const messengerLeads = Math.max(0, number(input.messengerLeadCount));
  const qualifiedLeads = Math.max(0, number(input.qualifiedLeadCount));
  const memberCount = input.memberCount == null ? null : Math.max(0, number(input.memberCount));
  const client = await getDb().connect();
  let row: { post_id: string; check_type: string } | undefined;
  try {
    await client.query("BEGIN");
    const checkResult = await client.query<{ post_id: string; check_type: string }>(
      `UPDATE facebook_group_post_check_tasks SET
         status = 'completed', result = $1::jsonb, completed_at = NOW(),
         updated_by = $2, updated_at = NOW()
       WHERE id = $3 AND status = 'pending' AND deleted_at IS NULL
       RETURNING post_id, check_type`,
      [JSON.stringify(input), actor.id, checkId],
    );
    row = checkResult.rows[0];
    if (!row) throw new Error("Nhiệm vụ kiểm tra không tồn tại hoặc đã hoàn thành.");
    await client.query(
      `UPDATE facebook_group_published_posts SET
         metrics = metrics || jsonb_build_object(
           'comments', $1::int,
           'reactions', $2::int,
           'shares', $3::int,
           'messengerLeads', $4::int,
           'qualifiedLeads', $5::int
         ),
         last_checked_at = NOW(), updated_by = $6, updated_at = NOW()
       WHERE id = $7`,
      [comments, reactions, shares, messengerLeads, qualifiedLeads, actor.id, row.post_id],
    );
    await client.query(
      `INSERT INTO facebook_group_post_metric_snapshots
       (id,post_id,horizon,member_count,reactions,comments,shares,messenger_leads,
        qualified_leads,metrics,entered_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)
       ON CONFLICT (post_id, horizon) DO UPDATE SET
         captured_at = NOW(),
         member_count = EXCLUDED.member_count,
         reactions = EXCLUDED.reactions,
         comments = EXCLUDED.comments,
         shares = EXCLUDED.shares,
         messenger_leads = EXCLUDED.messenger_leads,
         qualified_leads = EXCLUDED.qualified_leads,
         metrics = EXCLUDED.metrics,
         entered_by = EXCLUDED.entered_by,
         updated_at = NOW()`,
      [id("fbgms"), row.post_id, row.check_type, memberCount, reactions, comments, shares,
        messengerLeads, qualifiedLeads, JSON.stringify(input), actor.id],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  if (!row) throw new Error("Không thể lưu kết quả kiểm tra bài đăng.");
  await logActivity(actor, "post.check_completed", "post_check_task", checkId, undefined, {
    horizon: row.check_type,
    comments,
    reactions,
    shares,
    messengerLeads,
    qualifiedLeads,
  });
  return { ok: true, postId: row.post_id, horizon: row.check_type };
}

export async function updatePublishedPostModeration(
  postId: string,
  moderationStatus: "approved" | "rejected",
  actor: Actor,
  reason?: string,
) {
  if (!["approved", "rejected"].includes(moderationStatus)) {
    throw new Error("Trạng thái kiểm duyệt bài đăng không hợp lệ.");
  }
  const post = await queryOne<{ group_id: string; task_id: string; content_id: string }>(
    `UPDATE facebook_group_published_posts
     SET moderation_status = $1,
         status = CASE WHEN $1 = 'rejected' THEN 'rejected' ELSE 'tracking' END,
         metrics = COALESCE(metrics, '{}'::jsonb) || $2::jsonb,
         updated_by = $3, updated_at = NOW()
     WHERE id = $4 AND deleted_at IS NULL
     RETURNING group_id, task_id, content_id`,
    [moderationStatus, JSON.stringify(reason ? { moderationReason: reason } : {}), actor.id, postId],
  );
  if (!post) throw new Error("Không tìm thấy bài đã đăng.");
  await query(
    `UPDATE facebook_group_publishing_tasks
     SET status = $1, updated_by = $2, updated_at = NOW()
     WHERE id = $3`,
    [moderationStatus, actor.id, post.task_id],
  );
  if (moderationStatus === "rejected") {
    await query(
      `UPDATE facebook_group_content_drafts
       SET status = 'rewrite_required',
           data = data || $1::jsonb,
           updated_by = $2, updated_at = NOW()
       WHERE id = $3`,
      [JSON.stringify({ moderationRejectionReason: reason || "" }), actor.id, post.content_id],
    );
  }
  await query(
    `UPDATE facebook_groups g SET
       approved_posts = (
         SELECT COUNT(*) FROM facebook_group_published_posts p
         WHERE p.group_id = g.id AND p.deleted_at IS NULL AND p.moderation_status = 'approved'
       ),
       rejected_posts = (
         SELECT COUNT(*) FROM facebook_group_published_posts p
         WHERE p.group_id = g.id AND p.deleted_at IS NULL AND p.moderation_status = 'rejected'
       ),
       updated_at = NOW()
     WHERE g.id = $1`,
    [post.group_id],
  );
  if (moderationStatus === "rejected") {
    const settings = await getFacebookGroupSettings();
    const recent = await query<{ moderation_status: string }>(
      `SELECT moderation_status FROM facebook_group_published_posts
       WHERE group_id = $1 AND deleted_at IS NULL
       ORDER BY actual_posted_at DESC
       LIMIT $2`,
      [post.group_id, settings.consecutiveRejectionsBeforePause],
    );
    if (recent.length >= settings.consecutiveRejectionsBeforePause
        && recent.every(item => item.moderation_status === "rejected")) {
      await query(
        `UPDATE facebook_groups
         SET status = 'paused',
             data = data || $1::jsonb,
             updated_by = $2, updated_at = NOW()
         WHERE id = $3`,
        [JSON.stringify({ pausedReason: "consecutive_post_rejections" }), actor.id, post.group_id],
      );
    }
  }
  await logActivity(actor, `post.moderation_${moderationStatus}`, "published_post", postId, undefined, { reason });
  return { ok: true, postId, moderationStatus };
}

async function addFacebookGroupComment(input: Record<string, unknown>, actor: Actor) {
  const postId = text(input.postId, 120);
  const facebookName = text(input.facebookName, 300);
  const content = text(input.content, 10_000);
  if (!postId || !facebookName || !content) throw new Error("Bài đăng, tên Facebook và nội dung bình luận là bắt buộc.");
  const entityId = id("fbgcm");
  const row = await queryOne(
    `INSERT INTO facebook_group_comments
     (id,post_id,facebook_name,facebook_url,content,commented_at,phone,intent,temperature,
      replied,invited_to_messenger,entered_messenger,lead_id,assigned_staff_id,notes,created_by,updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$16) RETURNING *`,
    [entityId, postId, facebookName, text(input.facebookUrl, 2000) || null, content,
      input.commentedAt || new Date().toISOString(), text(input.phone, 30) || null,
      text(input.intent, 50) || "other", text(input.temperature, 20) || "cold",
      Boolean(input.replied), Boolean(input.invitedToMessenger), Boolean(input.enteredMessenger),
      input.leadId || null, input.assignedStaffId || null, text(input.notes, 5000), actor.id],
  );
  await query(
    `UPDATE facebook_group_published_posts SET metrics = jsonb_set(
      metrics, '{comments}', to_jsonb(COALESCE((metrics->>'comments')::int, 0) + 1)
    ), updated_at = NOW() WHERE id = $1`, [postId],
  );
  return row;
}

export async function linkFacebookGroupLead(input: Record<string, unknown>, actor: Actor) {
  const sourceCode = text(input.sourceCode, 80).toUpperCase();
  const leadId = text(input.leadId, 120);
  if (!sourceCode || !leadId) throw new Error("Mã nguồn và khách hàng CRM là bắt buộc.");
  const post = await queryOne<Record<string, unknown>>(
    `SELECT * FROM facebook_group_published_posts WHERE source_code = $1 AND deleted_at IS NULL`, [sourceCode],
  );
  if (!post) throw new Error("Không tìm thấy bài đăng theo mã nguồn.");
  const attributionId = id("fbgla");
  const row = await queryOne(
    `INSERT INTO facebook_group_lead_attributions
     (id,lead_id,page_id,group_id,post_id,campaign_id,content_id,source_code,
      posting_employee_id,first_messenger_at,conversation_id,message_id,messenger_participant_id,
      data,created_by,updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$15)
     ON CONFLICT (lead_id, post_id) DO UPDATE SET
       first_messenger_at = COALESCE(facebook_group_lead_attributions.first_messenger_at, EXCLUDED.first_messenger_at),
       conversation_id = COALESCE(facebook_group_lead_attributions.conversation_id, EXCLUDED.conversation_id),
       message_id = COALESCE(facebook_group_lead_attributions.message_id, EXCLUDED.message_id),
       messenger_participant_id = COALESCE(
         facebook_group_lead_attributions.messenger_participant_id,
         EXCLUDED.messenger_participant_id
       ),
       data = facebook_group_lead_attributions.data || EXCLUDED.data,
       updated_by = EXCLUDED.updated_by, updated_at = NOW()
     RETURNING *`,
    [attributionId, leadId, post.page_id, post.group_id, post.id, post.campaign_id,
      post.content_id, sourceCode, post.posted_by, input.firstMessengerAt || new Date().toISOString(),
      input.conversationId || null, input.messageId || null, input.participantId || null,
      JSON.stringify({
        contentVersion: input.contentVersion || null,
        participantName: input.participantName || null,
        firstMessage: input.message || null,
      }), actor.id],
  );
  const lead = await queryOne<{ data: Record<string, unknown> }>(`SELECT data FROM crm_leads WHERE id = $1`, [leadId]);
  if (lead) {
    const tags = Array.isArray(lead.data.tags) ? lead.data.tags.map(String) : [];
    const updated = {
      ...lead.data,
      source: "Facebook Group",
      tags: [...new Set([...tags, "Facebook Group", sourceCode])],
      facebookGroupSource: {
        pageId: post.page_id, groupId: post.group_id, postId: post.id,
        campaignId: post.campaign_id, sourceCode,
        conversationId: input.conversationId || null,
        messageId: input.messageId || null,
      },
      updatedAt: new Date().toISOString(),
    };
    await query(`UPDATE crm_leads SET data = $1::jsonb, updated_at = NOW() WHERE id = $2`, [JSON.stringify(updated), leadId]);
  }
  await query(
    `UPDATE facebook_groups g SET
       total_messenger_leads = (
         SELECT COUNT(DISTINCT lead_id)
         FROM facebook_group_lead_attributions
         WHERE group_id = g.id
       ),
       total_qualified_leads = (
         SELECT COUNT(DISTINCT a.lead_id)
         FROM facebook_group_lead_attributions a
         JOIN crm_leads l ON l.id = a.lead_id
         WHERE a.group_id = g.id AND l.stage <> 'new'
       ),
       updated_at = NOW()
     WHERE g.id = $1`,
    [post.group_id],
  );
  await logActivity(actor, "lead.linked", "lead_attribution", String((row as { id?: string })?.id || attributionId), undefined, { leadId, sourceCode });
  return row;
}

export async function getFacebookGroupLeadSources(leadId: string): Promise<FacebookGroupLeadSource[]> {
  return query<FacebookGroupLeadSource>(
    `SELECT a.id AS "attributionId", a.source_code AS "sourceCode",
            g.name AS "groupName", g.group_url AS "groupUrl",
            p.post_url AS "postUrl", c.name AS "campaignName",
            d.opening AS "contentOpening",
            s.data->>'fullName' AS "postingEmployeeName",
            a.first_messenger_at::text AS "firstMessengerAt",
            a.conversation_id AS "conversationId", a.message_id AS "messageId",
            a.quote_id AS "quoteId", a.order_id AS "orderId",
            a.revenue::float AS revenue
     FROM facebook_group_lead_attributions a
     JOIN facebook_groups g ON g.id = a.group_id
     JOIN facebook_group_published_posts p ON p.id = a.post_id
     JOIN facebook_group_content_drafts d ON d.id = a.content_id
     LEFT JOIN facebook_group_campaigns c ON c.id = a.campaign_id
     LEFT JOIN crm_staff s ON s.id = a.posting_employee_id
     WHERE a.lead_id = $1
     ORDER BY a.first_messenger_at ASC NULLS LAST, a.created_at ASC`,
    [leadId],
  );
}

export async function resolveFacebookGroupSourceCode(message: string) {
  const sourceCode = extractFacebookGroupSourceCode(message);
  if (!sourceCode) return { matched: false, sourceCode: null, attribution: null };
  const post = await queryOne<Record<string, unknown>>(
    `SELECT p.id AS "postId", p.source_code AS "sourceCode", p.post_url AS "postUrl",
            p.page_id AS "pageId", p.group_id AS "groupId", p.campaign_id AS "campaignId",
            p.content_id AS "contentId", p.posted_by AS "postingEmployeeId",
            g.name AS "groupName", c.name AS "campaignName",
            fp.facebook_page_id AS "facebookPageId",
            s.data->>'fullName' AS "postingEmployeeName"
     FROM facebook_group_published_posts p
     JOIN facebook_groups g ON g.id = p.group_id
     JOIN facebook_pages fp ON fp.id = p.page_id
     LEFT JOIN facebook_group_campaigns c ON c.id = p.campaign_id
     LEFT JOIN crm_staff s ON s.id = p.posted_by
     WHERE p.source_code = $1 AND p.deleted_at IS NULL`,
    [sourceCode],
  );
  return { matched: Boolean(post), sourceCode, attribution: post };
}

export async function addRevenueAttribution(input: Record<string, unknown>, actor: Actor) {
  const attributionId = text(input.attributionId, 120);
  const eventKey = text(input.revenueEventKey, 200);
  const revenue = Math.max(0, number(input.revenue));
  if (!attributionId || !eventKey) throw new Error("Attribution và mã sự kiện doanh thu là bắt buộc.");
  const db = getDb();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const attributionResult = await client.query(
      `SELECT group_id, campaign_id, content_id
       FROM facebook_group_lead_attributions
       WHERE id = $1 FOR UPDATE`,
      [attributionId],
    );
    if (!attributionResult.rows[0]) throw new Error("Attribution không tồn tại.");
    await client.query(
      `INSERT INTO facebook_group_revenue_events
       (id,attribution_id,event_key,event_type,quote_id,order_id,revenue,data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
       ON CONFLICT (event_key) DO UPDATE SET
         revenue = EXCLUDED.revenue,
         quote_id = COALESCE(EXCLUDED.quote_id, facebook_group_revenue_events.quote_id),
         order_id = COALESCE(EXCLUDED.order_id, facebook_group_revenue_events.order_id),
         data = EXCLUDED.data,
         updated_at = NOW()
       WHERE facebook_group_revenue_events.attribution_id = EXCLUDED.attribution_id`,
      [id("fbgre"), attributionId, eventKey, text(input.eventType, 50) || "manual",
        input.quoteId || null, input.orderId || null, revenue,
        JSON.stringify({ source: "facebook-group-marketing-api", actorId: actor.id })],
    );
    await client.query(
      `UPDATE facebook_group_lead_attributions a
       SET order_id = COALESCE($1, a.order_id),
           quote_id = COALESCE($2, a.quote_id),
           revenue = (
             SELECT COALESCE(SUM(e.revenue), 0)
             FROM facebook_group_revenue_events e
             WHERE e.attribution_id = a.id
           ),
           updated_by = $3, updated_at = NOW()
       WHERE a.id = $4`,
      [input.orderId || null, input.quoteId || null, actor.id, attributionId],
    );
    await client.query(
      `UPDATE facebook_groups g SET
       total_orders = (
         SELECT COUNT(DISTINCT e.order_id)
         FROM facebook_group_revenue_events e
         JOIN facebook_group_lead_attributions a ON a.id = e.attribution_id
         WHERE a.group_id = g.id AND e.order_id IS NOT NULL
       ),
       total_revenue = (
         SELECT COALESCE(SUM(e.revenue), 0)
         FROM facebook_group_revenue_events e
         JOIN facebook_group_lead_attributions a ON a.id = e.attribution_id
         WHERE a.group_id = g.id
       ),
       updated_at = NOW() WHERE g.id = $1`,
      [attributionResult.rows[0].group_id],
    );
    await client.query("COMMIT");
    return { ok: true, revenue };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getFacebookGroupDashboard(filters: Filters = {}): Promise<DashboardData> {
  const from = filters.from || new Date(Date.now() - 29 * 86400_000).toISOString().slice(0, 10);
  const to = filters.to || new Date().toISOString().slice(0, 10);
  const metrics = await queryOne<Record<string, string>>(
    `SELECT
       (SELECT COUNT(*) FROM facebook_groups WHERE deleted_at IS NULL)::text AS groups,
       (SELECT COUNT(*) FROM facebook_groups WHERE deleted_at IS NULL AND allows_pages = 'yes')::text AS "groupsAllowPages",
       (SELECT COUNT(*) FROM facebook_groups WHERE deleted_at IS NULL AND membership_status = 'joined')::text AS "groupsJoined",
       (SELECT COUNT(*) FROM facebook_groups WHERE deleted_at IS NULL AND membership_status IN ('requested','pending'))::text AS "groupsPending",
       (SELECT COUNT(*) FROM facebook_groups WHERE deleted_at IS NULL AND status = 'active')::text AS "groupsActive",
       (SELECT COUNT(*) FROM facebook_group_publishing_tasks WHERE deleted_at IS NULL AND scheduled_at::date = CURRENT_DATE AND status IN ('scheduled','due'))::text AS "tasksToday",
       (SELECT COUNT(*) FROM facebook_group_publishing_tasks WHERE deleted_at IS NULL AND due_at < NOW() AND status IN ('scheduled','due'))::text AS overdue,
       (SELECT COUNT(*) FROM facebook_group_published_posts WHERE deleted_at IS NULL AND moderation_status = 'pending')::text AS "pendingModeration",
       (SELECT COUNT(*) FROM facebook_group_post_check_tasks WHERE deleted_at IS NULL AND status = 'pending' AND due_at <= NOW())::text AS "checksDue",
       (SELECT COUNT(*) FROM facebook_group_lead_attributions WHERE created_at::date = CURRENT_DATE)::text AS "leadsToday",
       (SELECT COUNT(*) FROM facebook_group_lead_attributions WHERE created_at::date BETWEEN $1 AND $2)::text AS leads,
       (SELECT COUNT(*) FROM facebook_group_lead_attributions WHERE quote_id IS NOT NULL AND created_at::date BETWEEN $1 AND $2)::text AS quotes,
       (SELECT COUNT(*) FROM facebook_group_lead_attributions WHERE order_id IS NOT NULL AND created_at::date BETWEEN $1 AND $2)::text AS orders,
       (SELECT COALESCE(SUM(revenue),0) FROM facebook_group_lead_attributions WHERE created_at::date BETWEEN $1 AND $2)::text AS revenue`,
    [from, to],
  ) || {};
  const daily = await query<{ date: string; posts: number; leads: number; revenue: number }>(
    `WITH days AS (SELECT generate_series($1::date, $2::date, '1 day')::date AS day)
     SELECT day::text AS date,
       (SELECT COUNT(*)::int FROM facebook_group_published_posts WHERE deleted_at IS NULL AND actual_posted_at::date = day) AS posts,
       (SELECT COUNT(*)::int FROM facebook_group_lead_attributions WHERE created_at::date = day) AS leads,
       (SELECT COALESCE(SUM(revenue),0)::float FROM facebook_group_lead_attributions WHERE created_at::date = day) AS revenue
     FROM days ORDER BY day`, [from, to],
  );
  const topGroupsByLeads = await query<{ id: string; name: string; value: number }>(
    `SELECT g.id, g.name, COUNT(a.id)::int AS value FROM facebook_groups g
     LEFT JOIN facebook_group_lead_attributions a ON a.group_id = g.id AND a.created_at::date BETWEEN $1 AND $2
     WHERE g.deleted_at IS NULL GROUP BY g.id ORDER BY value DESC LIMIT 10`, [from, to],
  );
  const topGroupsByRevenue = await query<{ id: string; name: string; value: number }>(
    `SELECT g.id, g.name, COALESCE(SUM(a.revenue),0)::float AS value FROM facebook_groups g
     LEFT JOIN facebook_group_lead_attributions a ON a.group_id = g.id AND a.created_at::date BETWEEN $1 AND $2
     WHERE g.deleted_at IS NULL GROUP BY g.id ORDER BY value DESC LIMIT 10`, [from, to],
  );
  const numeric = Object.fromEntries(Object.entries(metrics).map(([key, value]) => [key, Number(value)]));
  const posts = daily.reduce((sum, row) => sum + Number(row.posts), 0);
  const approved = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM facebook_group_published_posts
     WHERE moderation_status = 'approved' AND actual_posted_at::date BETWEEN $1 AND $2`, [from, to],
  );
  const comments = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM facebook_group_comments
     WHERE deleted_at IS NULL AND commented_at::date BETWEEN $1 AND $2`, [from, to],
  );
  return {
    metrics: numeric,
    daily,
    topGroupsByLeads,
    topGroupsByRevenue,
    funnel: [
      { label: "Bài đăng", value: posts },
      { label: "Được duyệt", value: Number(approved?.count || 0) },
      { label: "Bình luận", value: Number(comments?.count || 0) },
      { label: "Messenger", value: numeric.leads || 0 },
      { label: "Báo giá", value: numeric.quotes || 0 },
      { label: "Đơn hàng", value: numeric.orders || 0 },
    ],
  };
}

export async function exportFacebookGroupsCsv() {
  const rows = await query<Record<string, unknown>>(
    `SELECT code, name, group_url, topic, region, member_count, allows_pages,
            membership_status, allows_sales, grade, status, quality_score,
            total_posts, approved_posts, rejected_posts, total_messenger_leads,
            total_orders, total_revenue
     FROM facebook_groups WHERE deleted_at IS NULL ORDER BY name`,
  );
  const headers = Object.keys(rows[0] || { code: "", name: "", group_url: "" });
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  return "\uFEFF" + [headers.join(","), ...rows.map(row => headers.map(key => escape(row[key])).join(","))].join("\n");
}

export async function importFacebookGroups(rows: unknown[], actor: Actor) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("Tệp nhập không có dữ liệu.");
  if (rows.length > 1000) throw new Error("Mỗi lần chỉ nhập tối đa 1.000 group.");
  const result = { created: 0, failed: 0, errors: [] as Array<{ row: number; error: string }> };
  for (const [index, raw] of rows.entries()) {
    try {
      const source = asObject(raw);
      await createFacebookGroupMarketing("groups", {
        ...source,
        groupUrl: source.groupUrl || source.group_url,
        facebookGroupId: source.facebookGroupId || source.facebook_group_id,
        memberCount: source.memberCount || source.member_count,
        allowsPages: source.allowsPages || source.allows_pages,
        membershipStatus: source.membershipStatus || source.membership_status,
        allowsSales: source.allowsSales || source.allows_sales,
        assignedStaffId: source.assignedStaffId || source.assigned_staff_id,
        nextAllowedPostAt: source.nextAllowedPostAt || source.next_allowed_post_at,
        ruleText: source.ruleText || source.rule_text,
      }, actor);
      result.created += 1;
    } catch (error) {
      result.failed += 1;
      result.errors.push({ row: index + 2, error: error instanceof Error ? error.message : "Dữ liệu không hợp lệ." });
    }
  }
  return result;
}

export async function attachFacebookGroupContentImage(
  contentId: string,
  image: {
    url: string;
    storage: string;
    storageId: string;
    size: number;
    width?: number;
    height?: number;
    format: string;
    model?: string;
    aspectRatio?: string;
    usedProductReferences?: boolean;
  },
  actor: Actor,
) {
  const current = await queryOne<{ id: string; source_code: string | null; status: string }>(
    `SELECT id, source_code, status
     FROM facebook_group_content_drafts
     WHERE id = $1 AND deleted_at IS NULL`,
    [contentId],
  );
  if (!current) throw new Error("Không tìm thấy bài viết để lưu ảnh.");
  if (!image.url) throw new Error("Đường dẫn ảnh là bắt buộc.");

  const assetId = id("fbgca");
  const metadata = {
    isPrimary: true,
    generatedByAi: true,
    provider: "openai",
    model: text(image.model, 120) || null,
    aspectRatio: text(image.aspectRatio, 20) || null,
    usedProductReferences: Boolean(image.usedProductReferences),
    storage: text(image.storage, 40),
    storageId: text(image.storageId, 1000),
    size: number(image.size),
    width: number(image.width),
    height: number(image.height),
    format: text(image.format, 20) || "webp",
    approvedAt: new Date().toISOString(),
    approvedBy: actor.id,
  };
  const client = await getDb().connect();
  let row: Record<string, unknown> | null = null;
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE facebook_group_content_assets
       SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"isPrimary":false}'::jsonb,
           updated_by = $2,
           updated_at = NOW()
       WHERE content_id = $1`,
      [contentId, actor.id],
    );
    const inserted = await client.query<Record<string, unknown>>(
      `INSERT INTO facebook_group_content_assets
       (id,content_id,asset_type,url,name,metadata,created_by,updated_by)
       VALUES ($1,$2,'ai_image',$3,$4,$5::jsonb,$6,$6)
       RETURNING id, content_id AS "contentId", asset_type AS "assetType", url, name,
                 metadata, created_at AS "createdAt"`,
      [
        assetId,
        contentId,
        image.url,
        `${current.source_code || contentId}-facebook-group.webp`,
        JSON.stringify(metadata),
        actor.id,
      ],
    );
    row = inserted.rows[0] || null;
    if (["approved", "scheduled", "used"].includes(current.status)) {
      await client.query(
        `UPDATE facebook_group_content_drafts
         SET status = 'draft', approved_by = NULL, approved_at = NULL,
             updated_by = $2, updated_at = NOW()
         WHERE id = $1`,
        [contentId, actor.id],
      );
    } else {
      await client.query(
        `UPDATE facebook_group_content_drafts
         SET updated_by = $2, updated_at = NOW()
         WHERE id = $1`,
        [contentId, actor.id],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  await logActivity(actor, "content.image_attached", "content", contentId, undefined, {
    assetId,
    storage: metadata.storage,
    model: metadata.model,
    previousStatus: current.status,
    requiresReapproval: ["approved", "scheduled", "used"].includes(current.status),
  });
  return {
    ...row,
    contentStatus: ["approved", "scheduled", "used"].includes(current.status) ? "draft" : current.status,
  };
}

async function logActivity(
  actor: Actor, action: string, entityType: string, entityId?: string,
  changes?: Record<string, unknown>, metadata?: Record<string, unknown>,
) {
  await query(
    `INSERT INTO facebook_group_activity_logs
     (id,action,entity_type,entity_id,actor_id,changes,metadata)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)`,
    [id("fbgal"), action, entityType, entityId || null, actor.id,
      JSON.stringify(changes || null), JSON.stringify({ ...metadata, actorName: actor.name })],
  );
}
