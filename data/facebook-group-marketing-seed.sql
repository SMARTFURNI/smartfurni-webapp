-- Development-only sample data for Facebook Group Marketing.
INSERT INTO facebook_pages
  (id, name, facebook_page_id, page_url, brand, status, created_by, updated_by)
VALUES
  ('fbp_demo_smartfurni', 'SmartFurni', 'SMARTFURNI_DEMO_PAGE', 'https://www.facebook.com/smartfurni', 'SmartFurni', 'active', 'seed', 'seed')
ON CONFLICT (id) DO NOTHING;

INSERT INTO facebook_groups
  (id, code, name, group_url, topic, region, member_count, allows_pages,
   membership_status, allows_sales, quality_score, grade, status, data, created_by, updated_by)
SELECT
  'fbg_demo_' || n,
  'GR' || LPAD(n::text, 2, '0'),
  'Group nội thất mẫu ' || n,
  'https://www.facebook.com/groups/smartfurni-demo-' || n,
  CASE WHEN n <= 4 THEN 'Nội thất' WHEN n <= 7 THEN 'Căn hộ' ELSE 'B2B' END,
  CASE WHEN n % 2 = 0 THEN 'TP.HCM' ELSE 'Hà Nội' END,
  10000 + n * 2500,
  CASE WHEN n IN (3, 8) THEN 'unknown' ELSE 'yes' END,
  CASE WHEN n IN (4, 9) THEN 'pending' ELSE 'joined' END,
  CASE WHEN n IN (5, 10) THEN 'limited' ELSE 'yes' END,
  35 + n * 5,
  CASE WHEN n >= 9 THEN 'A' WHEN n >= 5 THEN 'B' WHEN n >= 2 THEN 'C' ELSE 'D' END,
  CASE WHEN n IN (4, 9) THEN 'needs_review' ELSE 'active' END,
  jsonb_build_object('audienceFitPercent', LEAST(100, 45 + n * 5), 'isPublic', n % 2 = 0),
  'seed', 'seed'
FROM generate_series(1, 10) AS n
ON CONFLICT (id) DO NOTHING;

INSERT INTO facebook_group_rules (id, group_id, raw_text, analysis, created_by, updated_by)
SELECT
  'fbgr_demo_' || n,
  'fbg_demo_' || n,
  'Cho phép chia sẻ sản phẩm hữu ích. Không spam, tối đa một bài mỗi 7 ngày. Bài có thể chờ quản trị viên phê duyệt.',
  '{"allowsSales":true,"hasFrequencyLimit":true,"requiresApproval":true,"warnings":[]}'::jsonb,
  'seed', 'seed'
FROM generate_series(1, 10) AS n
ON CONFLICT (group_id) DO NOTHING;

INSERT INTO facebook_group_memberships
  (id, page_id, group_id, status, joined_at, created_by, updated_by)
SELECT
  'fbgm_demo_' || n, 'fbp_demo_smartfurni', 'fbg_demo_' || n,
  CASE WHEN n IN (4, 9) THEN 'pending' ELSE 'joined' END,
  CASE WHEN n IN (4, 9) THEN NULL ELSE NOW() - (n || ' days')::interval END,
  'seed', 'seed'
FROM generate_series(1, 10) AS n
ON CONFLICT (page_id, group_id) DO NOTHING;

INSERT INTO facebook_group_campaigns
  (id, code, name, page_id, product_ids, owner_id, start_date, end_date, status, targets, data, created_by, updated_by)
VALUES
  ('fbc_demo_1', 'FBG-SLEEP-0726', 'Giải pháp ngủ ngon tháng 7', 'fbp_demo_smartfurni', '["smf12"]', 'seed',
   CURRENT_DATE - 7, CURRENT_DATE + 21, 'active', '{"posts":20,"messenger":15,"orders":3,"revenue":150000000}', '{"region":"Toàn quốc"}', 'seed', 'seed'),
  ('fbc_demo_2', 'FBG-B2B-0826', 'Đối tác nội thất B2B', 'fbp_demo_smartfurni', '["khung-giuong"]', 'seed',
   CURRENT_DATE, CURRENT_DATE + 30, 'preparing', '{"posts":12,"messenger":10,"orders":2,"revenue":200000000}', '{"region":"TP.HCM"}', 'seed', 'seed')
ON CONFLICT (id) DO NOTHING;

INSERT INTO facebook_group_campaign_targets (id, campaign_id, group_id, created_by, updated_by)
SELECT 'fbct_demo_' || n, CASE WHEN n <= 6 THEN 'fbc_demo_1' ELSE 'fbc_demo_2' END,
       'fbg_demo_' || n, 'seed', 'seed'
FROM generate_series(1, 10) AS n
ON CONFLICT (campaign_id, group_id) DO NOTHING;

INSERT INTO facebook_group_content_drafts
  (id, campaign_id, product_id, group_id, content_type, opening, body, cta, source_code,
   status, duplicate_ratio, spam_risk_score, rule_check, data, created_by, updated_by, approved_by, approved_at)
SELECT
  'fbcd_demo_' || n,
  CASE WHEN n <= 6 THEN 'fbc_demo_1' ELSE 'fbc_demo_2' END,
  CASE WHEN n <= 6 THEN 'smf12' ELSE 'khung-giuong' END,
  'fbg_demo_' || n,
  CASE WHEN n % 2 = 0 THEN 'solution' ELSE 'community_share' END,
  'Bạn đã từng thức dậy với cảm giác đau lưng?',
  'SmartFurni chia sẻ một số cách điều chỉnh tư thế ngủ và lựa chọn bề mặt nâng đỡ phù hợp. Đây là nội dung mẫu dành riêng cho group ' || n || '.',
  'Nhắn Fanpage SmartFurni và gửi mã GR' || LPAD(n::text, 2, '0') || '-SMF12-2807-A để nhận video và bảng kích thước.',
  'GR' || LPAD(n::text, 2, '0') || '-SMF12-2807-A',
  'approved', 12 + n, 8 + n,
  '{"passed":true,"warnings":[]}'::jsonb,
  '{"seed":true}'::jsonb, 'seed', 'seed', 'seed', NOW()
FROM generate_series(1, 10) AS n
ON CONFLICT (id) DO NOTHING;

INSERT INTO facebook_group_publishing_tasks
  (id, page_id, group_id, campaign_id, content_id, assigned_staff_id, scheduled_at,
   due_at, priority, status, warnings, created_by, updated_by)
SELECT
  'fbpt_demo_' || n, 'fbp_demo_smartfurni', 'fbg_demo_' || n,
  CASE WHEN n <= 6 THEN 'fbc_demo_1' ELSE 'fbc_demo_2' END,
  'fbcd_demo_' || n, 'seed',
  NOW() + ((n - 4) || ' hours')::interval,
  NOW() + ((n - 4) || ' hours')::interval + INTERVAL '30 minutes',
  CASE WHEN n <= 2 THEN 'high' ELSE 'medium' END,
  CASE WHEN n <= 5 THEN 'posted' ELSE 'scheduled' END,
  '[]'::jsonb, 'seed', 'seed'
FROM generate_series(1, 8) AS n
ON CONFLICT (id) DO NOTHING;

INSERT INTO facebook_group_published_posts
  (id, task_id, page_id, group_id, campaign_id, content_id, source_code, post_url,
   posted_by, scheduled_at, actual_posted_at, moderation_status, status, metrics, created_by, updated_by)
SELECT
  'fbgp_demo_' || n, 'fbpt_demo_' || n, 'fbp_demo_smartfurni', 'fbg_demo_' || n,
  'fbc_demo_1', 'fbcd_demo_' || n, 'GR' || LPAD(n::text, 2, '0') || '-SMF12-2807-A',
  'https://www.facebook.com/groups/smartfurni-demo-' || n || '/posts/demo-' || n,
  'seed', NOW() - (n || ' days')::interval, NOW() - (n || ' days')::interval,
  CASE WHEN n = 5 THEN 'pending' ELSE 'approved' END, 'tracking',
  jsonb_build_object('reactions', n * 3, 'comments', n), 'seed', 'seed'
FROM generate_series(1, 5) AS n
ON CONFLICT (id) DO NOTHING;

INSERT INTO facebook_group_comments
  (id, post_id, facebook_name, content, commented_at, intent, temperature,
   replied, invited_to_messenger, entered_messenger, created_by, updated_by)
SELECT
  'fbgcm_demo_' || n, 'fbgp_demo_' || n, 'Khách Facebook ' || n,
  CASE WHEN n % 2 = 0 THEN 'Cho mình xin giá và kích thước' ELSE 'Có giao hàng về tỉnh không?' END,
  NOW() - (n || ' hours')::interval,
  CASE WHEN n % 2 = 0 THEN 'price' ELSE 'delivery' END,
  CASE WHEN n <= 2 THEN 'hot' ELSE 'warm' END,
  n <= 3, n <= 3, n <= 2, 'seed', 'seed'
FROM generate_series(1, 5) AS n
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF to_regclass('public.crm_leads') IS NOT NULL THEN
    INSERT INTO crm_leads (id, data, stage, last_contact_at, updated_at)
    SELECT
      'lead_fbg_demo_' || n,
      jsonb_build_object(
        'id', 'lead_fbg_demo_' || n, 'name', 'Khách Group mẫu ' || n,
        'company', '', 'phone', '090000000' || n, 'email', '',
        'type', 'investor', 'stage', CASE WHEN n = 3 THEN 'won' ELSE 'new' END,
        'district', 'TP.HCM', 'expectedValue', n * 20000000,
        'source', 'Facebook Group', 'assignedTo', 'Seed',
        'notes', 'Dữ liệu development', 'lastContactAt', NOW()::text,
        'createdAt', NOW()::text, 'updatedAt', NOW()::text,
        'tags', jsonb_build_array('Facebook Group', 'GR0' || n || '-SMF12-2807-A'),
        'projectName', '', 'projectAddress', '', 'unitCount', 1
      ),
      CASE WHEN n = 3 THEN 'won' ELSE 'new' END, NOW(), NOW()
    FROM generate_series(1, 3) AS n
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.crm_quotes') IS NOT NULL THEN
    INSERT INTO crm_quotes (id, lead_id, data, updated_at)
    SELECT
      'quote_fbg_demo_' || n,
      'lead_fbg_demo_' || n,
      jsonb_build_object(
        'id', 'quote_fbg_demo_' || n, 'leadId', 'lead_fbg_demo_' || n,
        'leadName', 'Khách Group mẫu ' || n, 'quoteNumber', 'BG-FBG-DEMO-' || n,
        'items', '[]'::jsonb, 'subtotal', n * 20000000, 'extraDiscountPct', 0,
        'total', n * 20000000, 'validUntil', (CURRENT_DATE + 15)::text,
        'status', CASE WHEN n = 2 THEN 'accepted' ELSE 'sent' END,
        'notes', 'Báo giá development từ Facebook Group', 'createdBy', 'seed',
        'createdAt', NOW()::text, 'updatedAt', NOW()::text
      ),
      NOW()
    FROM generate_series(1, 2) AS n
    ON CONFLICT (id) DO NOTHING;
  END IF;
  IF to_regclass('public.orders') IS NOT NULL THEN
    INSERT INTO orders (id, data, updated_at)
    VALUES (
      'order_fbg_demo_3',
      jsonb_build_object(
        'id', 'order_fbg_demo_3', 'customerName', 'Khách Group mẫu 3',
        'status', 'confirmed', 'total', 60000000, 'source', 'Facebook Group',
        'sourceCode', 'GR03-SMF12-2807-A', 'createdAt', NOW()::text, 'updatedAt', NOW()::text
      ),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

INSERT INTO facebook_group_lead_attributions
  (id, lead_id, page_id, group_id, post_id, campaign_id, content_id, source_code,
   posting_employee_id, first_messenger_at, order_id, revenue, revenue_event_key, data, created_by, updated_by)
SELECT
  'fbgla_demo_' || n, 'lead_fbg_demo_' || n, 'fbp_demo_smartfurni',
  'fbg_demo_' || n, 'fbgp_demo_' || n, 'fbc_demo_1', 'fbcd_demo_' || n,
  'GR' || LPAD(n::text, 2, '0') || '-SMF12-2807-A', 'seed', NOW() - (n || ' hours')::interval,
  CASE WHEN n = 3 THEN 'order_fbg_demo_3' ELSE NULL END,
  CASE WHEN n = 3 THEN 60000000 ELSE 0 END,
  CASE WHEN n = 3 THEN 'seed-order-fbg-3-paid' ELSE NULL END,
  '{"seed":true}'::jsonb, 'seed', 'seed'
FROM generate_series(1, 3) AS n
ON CONFLICT (lead_id, post_id) DO NOTHING;
