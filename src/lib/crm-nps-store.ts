/**
 * CRM NPS Store
 * Handles: NPS surveys, responses, analytics after deal closing
 */
import { query } from "@/lib/db";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NpsSurveyStatus = "pending" | "sent" | "completed" | "expired";
export type NpsCategory = "promoter" | "passive" | "detractor";

export interface NpsSurvey {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  leadEmail: string;
  contractId?: string;
  status: NpsSurveyStatus;
  sentAt?: string;
  completedAt?: string;
  expiresAt: string;
  // Response data
  score?: number;           // 0-10
  category?: NpsCategory;  // promoter (9-10), passive (7-8), detractor (0-6)
  feedback?: string;
  // What they liked
  likedAspects?: string[];
  // What to improve
  improvementAreas?: string[];
  // Would recommend?
  wouldRecommend?: boolean;
  // Custom questions answers
  customAnswers?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface NpsConfig {
  isActive: boolean;
  sendAfterDays: number;      // Days after contract signed to send survey
  reminderAfterDays: number;  // Days after send to send reminder
  surveyTitle: string;
  surveyIntro: string;
  thankYouMessage: string;
  channels: ("zalo" | "sms" | "email")[];
  updatedAt: string;
}

export interface NpsStats {
  total: number;
  completed: number;
  responseRate: number;
  npsScore: number;           // -100 to 100
  promoters: number;
  passives: number;
  detractors: number;
  promoterPct: number;
  passivePct: number;
  detractorPct: number;
  avgScore: number;
  trend: { month: string; score: number; count: number }[];
}

// ─── Schema Init ──────────────────────────────────────────────────────────────

export async function initNpsSchema(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS crm_nps_surveys (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      lead_name TEXT NOT NULL,
      lead_phone TEXT NOT NULL DEFAULT '',
      lead_email TEXT NOT NULL DEFAULT '',
      contract_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      sent_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ NOT NULL,
      score INTEGER,
      category TEXT,
      feedback TEXT,
      liked_aspects JSONB DEFAULT '[]',
      improvement_areas JSONB DEFAULT '[]',
      would_recommend BOOLEAN,
      custom_answers JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS crm_nps_config (
      id TEXT PRIMARY KEY DEFAULT 'default',
      is_active BOOLEAN NOT NULL DEFAULT true,
      send_after_days INTEGER NOT NULL DEFAULT 7,
      reminder_after_days INTEGER NOT NULL DEFAULT 3,
      survey_title TEXT NOT NULL DEFAULT 'Khảo sát độ hài lòng SmartFurni',
      survey_intro TEXT NOT NULL DEFAULT 'Xin chào! SmartFurni trân trọng ý kiến của bạn. Vui lòng dành 2 phút để đánh giá trải nghiệm của bạn với chúng tôi.',
      thank_you_message TEXT NOT NULL DEFAULT 'Cảm ơn bạn đã dành thời gian phản hồi! Ý kiến của bạn giúp SmartFurni không ngừng cải thiện chất lượng dịch vụ.',
      channels JSONB NOT NULL DEFAULT ''["zalo","sms"]'',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    INSERT INTO crm_nps_config (id) VALUES (''default'') ON CONFLICT (id) DO NOTHING;
  `);
}

// ─── NPS Surveys CRUD ─────────────────────────────────────────────────────────

export async function getNpsSurveys(filters?: { leadId?: string; status?: NpsSurveyStatus }): Promise<NpsSurvey[]> {
  try {
    await initNpsSchema();
    let sql = `SELECT * FROM crm_nps_surveys WHERE 1=1`;
    const params: unknown[] = [];
    if (filters?.leadId) { params.push(filters.leadId); sql += ` AND lead_id = $${params.length}`; }
    if (filters?.status) { params.push(filters.status); sql += ` AND status = $${params.length}`; }
    sql += ` ORDER BY created_at DESC`;
    const rows = await query(sql, params);
    return rows.map(mapSurvey);
  } catch { return []; }
}

export async function getNpsSurvey(id: string): Promise<NpsSurvey | null> {
  try {
    await initNpsSchema();
    const rows = await query(`SELECT * FROM crm_nps_surveys WHERE id = $1`, [id]);
    return rows[0] ? mapSurvey(rows[0]) : null;
  } catch { return null; }
}

export async function createNpsSurvey(input: { leadId: string; leadName: string; leadPhone: string; leadEmail: string; contractId?: string }): Promise<NpsSurvey> {
  await initNpsSchema();
  const id = `nps-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const rows = await query(
    `INSERT INTO crm_nps_surveys (id, lead_id, lead_name, lead_phone, lead_email, contract_id, status, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7) RETURNING *`,
    [id, input.leadId, input.leadName, input.leadPhone, input.leadEmail, input.contractId ?? null, expiresAt.toISOString()]
  );
  return mapSurvey(rows[0]);
}

export async function submitNpsResponse(id: string, response: {
  score: number;
  feedback?: string;
  likedAspects?: string[];
  improvementAreas?: string[];
  wouldRecommend?: boolean;
  customAnswers?: Record<string, string>;
}): Promise<NpsSurvey | null> {
  const category: NpsCategory = response.score >= 9 ? "promoter" : response.score >= 7 ? "passive" : "detractor";
  const rows = await query(
    `UPDATE crm_nps_surveys SET
      score = $1, category = $2, feedback = $3,
      liked_aspects = $4, improvement_areas = $5,
      would_recommend = $6, custom_answers = $7,
      status = 'completed', completed_at = NOW(), updated_at = NOW()
     WHERE id = $8 RETURNING *`,
    [
      response.score, category, response.feedback ?? null,
      JSON.stringify(response.likedAspects ?? []),
      JSON.stringify(response.improvementAreas ?? []),
      response.wouldRecommend ?? null,
      JSON.stringify(response.customAnswers ?? {}),
      id,
    ]
  );
  return rows[0] ? mapSurvey(rows[0]) : null;
}

export async function updateNpsSurveyStatus(id: string, status: NpsSurveyStatus): Promise<void> {
  const updates: Record<string, string> = { status };
  if (status === "sent") updates.sent_at = "NOW()";
  await query(
    `UPDATE crm_nps_surveys SET status = $1, updated_at = NOW() ${status === "sent" ? ", sent_at = NOW()" : ""} WHERE id = $2`,
    [status, id]
  );
}

export async function getNpsStats(): Promise<NpsStats> {
  try {
    await initNpsSchema();
    const rows = await query(`SELECT * FROM crm_nps_surveys WHERE status = 'completed'`);
    const surveys = rows.map(mapSurvey);
    const total = await query(`SELECT COUNT(*) as cnt FROM crm_nps_surveys`);
    const totalCount = parseInt((total[0] as Record<string, unknown>).cnt as string);

    if (!surveys.length) {
      return { total: totalCount, completed: 0, responseRate: 0, npsScore: 0, promoters: 0, passives: 0, detractors: 0, promoterPct: 0, passivePct: 0, detractorPct: 0, avgScore: 0, trend: [] };
    }

    const promoters = surveys.filter(s => s.category === "promoter").length;
    const passives = surveys.filter(s => s.category === "passive").length;
    const detractors = surveys.filter(s => s.category === "detractor").length;
    const n = surveys.length;
    const npsScore = Math.round(((promoters - detractors) / n) * 100);
    const avgScore = Math.round((surveys.reduce((sum, s) => sum + (s.score ?? 0), 0) / n) * 10) / 10;

    // Trend by month (last 6 months)
    const trendMap: Record<string, { total: number; sum: number }> = {};
    surveys.forEach(s => {
      if (!s.completedAt) return;
      const month = s.completedAt.slice(0, 7);
      if (!trendMap[month]) trendMap[month] = { total: 0, sum: 0 };
      trendMap[month].total++;
      trendMap[month].sum += s.score ?? 0;
    });
    const trend = Object.entries(trendMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, d]) => ({ month, score: Math.round((d.sum / d.total) * 10) / 10, count: d.total }));

    return {
      total: totalCount, completed: n,
      responseRate: Math.round((n / totalCount) * 100),
      npsScore, promoters, passives, detractors,
      promoterPct: Math.round((promoters / n) * 100),
      passivePct: Math.round((passives / n) * 100),
      detractorPct: Math.round((detractors / n) * 100),
      avgScore, trend,
    };
  } catch {
    return { total: 0, completed: 0, responseRate: 0, npsScore: 0, promoters: 0, passives: 0, detractors: 0, promoterPct: 0, passivePct: 0, detractorPct: 0, avgScore: 0, trend: [] };
  }
}

export async function getNpsConfig(): Promise<NpsConfig> {
  try {
    await initNpsSchema();
    const rows = await query(`SELECT * FROM crm_nps_config WHERE id = 'default'`);
    if (!rows[0]) return getDefaultNpsConfig();
    const r = rows[0] as Record<string, unknown>;
    return {
      isActive: r.is_active as boolean,
      sendAfterDays: r.send_after_days as number,
      reminderAfterDays: r.reminder_after_days as number,
      surveyTitle: r.survey_title as string,
      surveyIntro: r.survey_intro as string,
      thankYouMessage: r.thank_you_message as string,
      channels: (typeof r.channels === "string" ? JSON.parse(r.channels) : r.channels) as NpsConfig["channels"],
      updatedAt: String(r.updated_at),
    };
  } catch { return getDefaultNpsConfig(); }
}

export async function saveNpsConfig(config: Partial<NpsConfig>): Promise<void> {
  await initNpsSchema();
  await query(
    `UPDATE crm_nps_config SET
      is_active = COALESCE($1, is_active),
      send_after_days = COALESCE($2, send_after_days),
      reminder_after_days = COALESCE($3, reminder_after_days),
      survey_title = COALESCE($4, survey_title),
      survey_intro = COALESCE($5, survey_intro),
      thank_you_message = COALESCE($6, thank_you_message),
      channels = COALESCE($7, channels),
      updated_at = NOW()
     WHERE id = 'default'`,
    [
      config.isActive, config.sendAfterDays, config.reminderAfterDays,
      config.surveyTitle, config.surveyIntro, config.thankYouMessage,
      config.channels ? JSON.stringify(config.channels) : null,
    ]
  );
}

function getDefaultNpsConfig(): NpsConfig {
  return {
    isActive: true, sendAfterDays: 7, reminderAfterDays: 3,
    surveyTitle: "Khảo sát độ hài lòng SmartFurni",
    surveyIntro: "Xin chào! SmartFurni trân trọng ý kiến của bạn. Vui lòng dành 2 phút để đánh giá trải nghiệm của bạn với chúng tôi.",
    thankYouMessage: "Cảm ơn bạn đã dành thời gian phản hồi! Ý kiến của bạn giúp SmartFurni không ngừng cải thiện chất lượng dịch vụ.",
    channels: ["zalo", "sms"],
    updatedAt: new Date().toISOString(),
  };
}

function mapSurvey(r: Record<string, unknown>): NpsSurvey {
  return {
    id: r.id as string,
    leadId: r.lead_id as string,
    leadName: r.lead_name as string,
    leadPhone: r.lead_phone as string,
    leadEmail: r.lead_email as string,
    contractId: r.contract_id as string | undefined,
    status: r.status as NpsSurveyStatus,
    sentAt: r.sent_at ? String(r.sent_at) : undefined,
    completedAt: r.completed_at ? String(r.completed_at) : undefined,
    expiresAt: String(r.expires_at),
    score: r.score as number | undefined,
    category: r.category as NpsCategory | undefined,
    feedback: r.feedback as string | undefined,
    likedAspects: (typeof r.liked_aspects === "string" ? JSON.parse(r.liked_aspects) : r.liked_aspects) as string[] | undefined,
    improvementAreas: (typeof r.improvement_areas === "string" ? JSON.parse(r.improvement_areas) : r.improvement_areas) as string[] | undefined,
    wouldRecommend: r.would_recommend as boolean | undefined,
    customAnswers: (typeof r.custom_answers === "string" ? JSON.parse(r.custom_answers) : r.custom_answers) as Record<string, string> | undefined,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}
