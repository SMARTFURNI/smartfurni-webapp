/**
 * Seed script: Tạo kế hoạch 12 tuần mẫu cho SmartFurni
 * Chạy: npx tsx scripts/seed-twelve-week-plan.ts
 */

import { Pool } from "pg";
import { readFileSync } from "fs";
import { join } from "path";

// Load .env.local manually
try {
  const envFile = readFileSync(join(process.cwd(), ".env.local"), "utf8");
  for (const line of envFile.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, "");
  }
} catch {}
try {
  const envFile = readFileSync(join(process.cwd(), ".env"), "utf8");
  for (const line of envFile.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, "");
  }
} catch {}

const connectionString = process.env.POSTGRESQL_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

function nanoid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

async function main() {
  // Tạo bảng nếu chưa có
  await pool.query(`
    CREATE TABLE IF NOT EXISTS twelve_week_plans (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const now = new Date().toISOString();
  // Bắt đầu từ đầu tháng 1/2026
  const startDate = "2026-01-06";
  const endDate = addDays(startDate, 12 * 7 - 1);
  const planId = "plan_sample_" + nanoid();

  // ── 4 Mục tiêu ──────────────────────────────────────────────────────────────
  const goals = [
    {
      id: "goal_revenue_" + nanoid(),
      planId,
      title: "Đạt doanh thu 1.2 tỷ trong 12 tuần",
      description: "Tập trung vào các deal lớn B2B, khách sạn và chung cư cao cấp",
      color: "gold",
      targetMetric: "1.2 tỷ VNĐ",
      currentMetric: "850 triệu",
      order: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "goal_customers_" + nanoid(),
      planId,
      title: "Mở rộng 15 khách hàng B2B mới",
      description: "Tập trung vào phân khúc khách sạn 4-5 sao, resort và căn hộ dịch vụ",
      color: "indigo",
      targetMetric: "15 KH mới",
      currentMetric: "3 KH",
      order: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "goal_product_" + nanoid(),
      planId,
      title: "Ra mắt dòng sản phẩm SmartBed Pro 2026",
      description: "Hoàn thiện catalog, demo sản phẩm và tài liệu kỹ thuật cho dòng mới",
      color: "green",
      targetMetric: "Ra mắt Q1/2026",
      currentMetric: "Đang phát triển",
      order: 2,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "goal_process_" + nanoid(),
      planId,
      title: "Tối ưu quy trình bán hàng & chăm sóc KH",
      description: "Chuẩn hóa quy trình từ lead → chốt → after-sales trong CRM",
      color: "purple",
      targetMetric: "Tỷ lệ chốt ≥ 35%",
      currentMetric: "28%",
      order: 3,
      createdAt: now,
      updatedAt: now,
    },
  ];

  // ── Công việc chi tiết cho từng tuần ────────────────────────────────────────
  const tasks: Array<{
    id: string; goalId: string; planId: string; weekNumber: number;
    title: string; description?: string; status: string;
    dueDate?: string; completedAt?: string; createdAt: string; updatedAt: string;
  }> = [];

  function addTask(goalId: string, week: number, title: string, status: string = "pending", description?: string) {
    const { start } = getWeekRange(startDate, week);
    const dueDate = addDays(start.toISOString().split("T")[0], 5); // Thứ 6 trong tuần
    tasks.push({
      id: "task_" + nanoid(),
      goalId,
      planId,
      weekNumber: week,
      title,
      description,
      status,
      dueDate,
      completedAt: status === "done" ? addDays(dueDate, -1) : undefined,
      createdAt: now,
      updatedAt: now,
    });
  }

  function getWeekRange(sd: string, week: number) {
    const s = new Date(sd);
    s.setDate(s.getDate() + (week - 1) * 7);
    const e = new Date(s);
    e.setDate(s.getDate() + 6);
    return { start: s, end: e };
  }

  const [g0, g1, g2, g3] = goals.map((g) => g.id);

  // ── Goal 1: Doanh thu 1.2 tỷ ────────────────────────────────────────────────
  addTask(g0, 1, "Lập danh sách 30 prospect khách sạn tiềm năng tại TP.HCM", "done");
  addTask(g0, 1, "Gửi email giới thiệu dòng SmartBed đến 30 prospect", "done");
  addTask(g0, 2, "Theo dõi và gọi điện cho 15 prospect đã mở email", "done");
  addTask(g0, 2, "Lên lịch demo sản phẩm cho 5 khách hàng quan tâm", "done");
  addTask(g0, 3, "Demo sản phẩm tại showroom cho 3 KH đã xác nhận", "done");
  addTask(g0, 3, "Gửi báo giá chi tiết cho 5 KH sau demo", "done");
  addTask(g0, 4, "Follow-up báo giá, xử lý objection từ KH", "done");
  addTask(g0, 4, "Chốt hợp đồng đầu tiên — target 200 triệu", "done");
  addTask(g0, 5, "Tìm kiếm thêm 20 prospect mới từ referral và LinkedIn");
  addTask(g0, 5, "Gửi proposal cho 3 dự án căn hộ đang xây dựng");
  addTask(g0, 6, "Thương thảo hợp đồng với 2 KH đang xem xét");
  addTask(g0, 6, "Chốt hợp đồng thứ 2 — target 250 triệu");
  addTask(g0, 7, "Review pipeline và điều chỉnh chiến lược nếu cần");
  addTask(g0, 7, "Tiếp cận 5 resort/khách sạn tại Đà Nẵng, Phú Quốc");
  addTask(g0, 8, "Demo online cho KH ngoài TP.HCM");
  addTask(g0, 8, "Gửi báo giá cho 3 dự án resort");
  addTask(g0, 9, "Chốt hợp đồng thứ 3 — target 300 triệu");
  addTask(g0, 9, "Upsell thêm phụ kiện và gói bảo hành cho KH cũ");
  addTask(g0, 10, "Tổng kết doanh thu 9 tuần, điều chỉnh kế hoạch 3 tuần cuối");
  addTask(g0, 10, "Tập trung chốt các deal đang trong giai đoạn negotiating");
  addTask(g0, 11, "Sprint chốt deal — gọi điện và gặp trực tiếp tất cả KH hot");
  addTask(g0, 11, "Chốt hợp đồng thứ 4 — target 250 triệu");
  addTask(g0, 12, "Tổng kết kết quả 12 tuần, lập báo cáo doanh thu");
  addTask(g0, 12, "Lên kế hoạch cho chu kỳ 12 tuần tiếp theo");

  // ── Goal 2: 15 KH B2B mới ───────────────────────────────────────────────────
  addTask(g1, 1, "Xây dựng ICP (Ideal Customer Profile) cho phân khúc khách sạn 4-5 sao", "done");
  addTask(g1, 1, "Tạo danh sách 50 khách sạn mục tiêu tại TP.HCM và Hà Nội", "done");
  addTask(g1, 2, "Kết nối LinkedIn với 20 procurement manager khách sạn", "done");
  addTask(g1, 2, "Tham dự sự kiện Vietnam Hotel Investment Conference", "done");
  addTask(g1, 3, "Cold call 20 khách sạn trong danh sách, đặt lịch gặp 5 KH", "done");
  addTask(g1, 3, "Onboard KH mới #1 — khách sạn 5 sao Quận 1", "done");
  addTask(g1, 4, "Onboard KH mới #2 và #3 từ referral", "done");
  addTask(g1, 4, "Gửi case study thành công cho 10 prospect đang cân nhắc");
  addTask(g1, 5, "Tiếp cận 15 resort tại Đà Nẵng qua email campaign");
  addTask(g1, 5, "Onboard KH mới #4 và #5");
  addTask(g1, 6, "Tham dự triển lãm nội thất VIFA EXPO 2026");
  addTask(g1, 6, "Thu thập 20 business card từ triển lãm, follow-up trong 48h");
  addTask(g1, 7, "Onboard KH mới #6, #7, #8 từ triển lãm");
  addTask(g1, 7, "Xây dựng chương trình referral cho KH hiện tại");
  addTask(g1, 8, "Onboard KH mới #9 và #10");
  addTask(g1, 8, "Tổng kết 8 tuần, điều chỉnh chiến lược acquisition");
  addTask(g1, 9, "Tiếp cận 10 chung cư cao cấp đang bàn giao");
  addTask(g1, 9, "Onboard KH mới #11 và #12");
  addTask(g1, 10, "Onboard KH mới #13");
  addTask(g1, 10, "Nurture 5 prospect đang trong giai đoạn cân nhắc");
  addTask(g1, 11, "Onboard KH mới #14 và #15 — hoàn thành mục tiêu!");
  addTask(g1, 12, "Tổng kết 15 KH mới, phân tích nguồn và ROI từng kênh");

  // ── Goal 3: Ra mắt SmartBed Pro 2026 ────────────────────────────────────────
  addTask(g2, 1, "Hoàn thiện spec kỹ thuật SmartBed Pro 2026 với R&D", "done");
  addTask(g2, 1, "Thiết kế catalog sản phẩm mới (giao cho designer)", "done");
  addTask(g2, 2, "Review và approve bản thiết kế catalog lần 1", "done");
  addTask(g2, 2, "Chụp ảnh sản phẩm tại showroom", "done");
  addTask(g2, 3, "Hoàn thiện catalog PDF và web version", "done");
  addTask(g2, 3, "Chuẩn bị demo unit tại showroom Quận 7");
  addTask(g2, 4, "Tạo video demo sản phẩm 3 phút cho sales team");
  addTask(g2, 4, "Training sales team về tính năng mới SmartBed Pro");
  addTask(g2, 5, "Soft launch nội bộ — demo cho 10 KH VIP hiện tại");
  addTask(g2, 5, "Thu thập feedback từ KH VIP, điều chỉnh nếu cần");
  addTask(g2, 6, "Chuẩn bị press release và bài đăng LinkedIn");
  addTask(g2, 6, "Official launch SmartBed Pro 2026 — event tại showroom");
  addTask(g2, 7, "Đăng bài PR trên các kênh: website, LinkedIn, Zalo OA");
  addTask(g2, 7, "Gửi thông báo ra mắt đến toàn bộ database KH");
  addTask(g2, 8, "Theo dõi phản hồi thị trường, update FAQ");
  addTask(g2, 9, "Review doanh số SmartBed Pro sau 3 tuần ra mắt");
  addTask(g2, 10, "Chuẩn bị gói bundle: SmartBed Pro + phụ kiện");
  addTask(g2, 11, "Tạo case study từ 3 KH đầu tiên dùng SmartBed Pro");
  addTask(g2, 12, "Tổng kết kết quả ra mắt sản phẩm, lên roadmap Q2");

  // ── Goal 4: Tối ưu quy trình ────────────────────────────────────────────────
  addTask(g3, 1, "Audit toàn bộ quy trình bán hàng hiện tại, ghi nhận bottleneck", "done");
  addTask(g3, 1, "Vẽ sơ đồ quy trình mới từ lead → chốt → after-sales", "done");
  addTask(g3, 2, "Cập nhật pipeline stages trong CRM theo quy trình mới", "done");
  addTask(g3, 2, "Tạo email template cho từng giai đoạn trong pipeline", "done");
  addTask(g3, 3, "Training toàn team về quy trình mới (2 buổi)", "done");
  addTask(g3, 3, "Thiết lập automation rules: nhắc nhở follow-up tự động");
  addTask(g3, 4, "Tạo checklist onboarding KH mới chuẩn hóa");
  addTask(g3, 4, "Implement NPS survey sau mỗi hợp đồng ký kết");
  addTask(g3, 5, "Review kết quả 4 tuần đầu, đo tỷ lệ chốt mới");
  addTask(g3, 5, "Điều chỉnh quy trình dựa trên dữ liệu thực tế");
  addTask(g3, 6, "Tạo playbook bán hàng SmartFurni B2B v1.0");
  addTask(g3, 6, "Chia sẻ playbook với toàn team, thu thập feedback");
  addTask(g3, 7, "Cập nhật playbook v1.1 dựa trên feedback team");
  addTask(g3, 7, "Thiết lập dashboard báo cáo KPI hàng tuần cho manager");
  addTask(g3, 8, "Review tỷ lệ chốt 8 tuần — target ≥ 30%");
  addTask(g3, 9, "Tối ưu email sequence nurturing cho lead chưa chốt");
  addTask(g3, 9, "Tạo quy trình xử lý khiếu nại và after-sales");
  addTask(g3, 10, "Đo NPS score lần đầu, phân tích kết quả");
  addTask(g3, 11, "Điều chỉnh quy trình after-sales dựa trên NPS feedback");
  addTask(g3, 12, "Tổng kết: tỷ lệ chốt đạt ≥ 35%? Lên kế hoạch cải tiến tiếp");

  // ── Build plan object ────────────────────────────────────────────────────────
  const plan = {
    id: planId,
    staffId: "admin",
    title: "Kế hoạch 12 Tuần — Q1/2026 SmartFurni",
    vision: "Đưa SmartFurni trở thành thương hiệu giường thông minh B2B hàng đầu Việt Nam trong năm 2026. Mục tiêu: doanh thu 1.2 tỷ trong 12 tuần đầu, 15 KH B2B mới, ra mắt SmartBed Pro 2026 thành công và chuẩn hóa toàn bộ quy trình bán hàng.",
    startDate,
    endDate,
    isActive: true,
    goals,
    tasks,
    createdAt: now,
    updatedAt: now,
  };

  // Xóa plan mẫu cũ nếu có
  await pool.query(`DELETE FROM twelve_week_plans WHERE id LIKE 'plan_sample_%'`);

  // Insert plan mới
  await pool.query(
    `INSERT INTO twelve_week_plans (id, staff_id, data, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (id) DO UPDATE SET data = $3, updated_at = NOW()`,
    [planId, "admin", JSON.stringify(plan)]
  );

  console.log(`✅ Đã tạo kế hoạch 12 tuần mẫu: "${plan.title}"`);
  console.log(`   - ${goals.length} mục tiêu`);
  console.log(`   - ${tasks.length} công việc`);
  console.log(`   - Từ ${startDate} đến ${endDate}`);
  console.log(`   - ${tasks.filter((t) => t.status === "done").length} công việc đã hoàn thành`);

  await pool.end();
}

main().catch((err) => {
  console.error("❌ Lỗi:", err.message);
  process.exit(1);
});
