import pg from "pg";

const connectionString = process.env.DATABASE_PUBLIC_URL
  || process.env.POSTGRESQL_URL
  || process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL chưa được cấu hình.");

const pool = new pg.Pool({
  connectionString,
  ssl: connectionString.includes("localhost") || connectionString.includes("127.0.0.1")
    ? false : { rejectUnauthorized: false },
  max: 1,
});
try {
  const schema = await pool.query(`
    SELECT
      to_regclass('public.facebook_group_messenger_events') IS NOT NULL AS messenger_events,
      to_regclass('public.facebook_group_revenue_events') IS NOT NULL AS revenue_events
  `);
  const counts = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM fb_scheduler_pages) AS scheduler_pages,
      (SELECT COUNT(*)::int FROM facebook_pages WHERE deleted_at IS NULL) AS group_marketing_pages,
      (SELECT COUNT(*)::int
       FROM fb_scheduler_pages scheduler
       WHERE NOT EXISTS (
         SELECT 1 FROM facebook_pages page
         WHERE page.deleted_at IS NULL
           AND page.facebook_page_id = scheduler.data->>'pageId'
       )) AS unsynced_pages,
      (SELECT COUNT(*)::int FROM facebook_groups WHERE deleted_at IS NULL) AS groups,
      (SELECT COUNT(*)::int FROM facebook_group_campaigns WHERE deleted_at IS NULL) AS campaigns,
      (SELECT COUNT(*)::int FROM facebook_group_messenger_events) AS messenger_events
  `);
  const testRecords = await pool.query(`
    SELECT 'group' AS type, id, name
    FROM facebook_groups
    WHERE deleted_at IS NULL AND (name LIKE '[E2E]%' OR name LIKE '[E2E PASS]%')
    UNION ALL
    SELECT 'campaign', id, name
    FROM facebook_group_campaigns
    WHERE deleted_at IS NULL AND (name LIKE '[E2E]%' OR name LIKE '[E2E PASS]%')
    ORDER BY type, name
  `);
  console.log(JSON.stringify({
    schema: schema.rows[0],
    counts: counts.rows[0],
    testRecords: testRecords.rows,
  }, null, 2));
} finally {
  await pool.end();
}
