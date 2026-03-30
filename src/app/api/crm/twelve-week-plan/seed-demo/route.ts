import { NextRequest, NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/admin-auth";
import { savePlan } from "@/lib/twelve-week-plan-store";
import type { TwelveWeekPlan, Goal, WeeklyTask, GoalColor, GoalKpi } from "@/lib/twelve-week-plan-store";

export const dynamic = "force-dynamic";

function nanoid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function getWeekStart(startDate: string, week: number): string {
  const s = new Date(startDate);
  s.setDate(s.getDate() + (week - 1) * 7);
  return s.toISOString().split("T")[0];
}

// GET - tạo kế hoạch demo mẫu (chỉ admin)
export async function GET(req: NextRequest) {
  try {
    const session = await requireCrmAccess();
    if (!session.isAdmin) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const now = new Date().toISOString();
    const startDate = "2026-01-06";
    const endDate = addDays(startDate, 12 * 7 - 1);
    const planId = "plan_demo_" + nanoid();

    // ── 4 Mục tiêu chiến lược ──────────────────────────────────────────────────
    const goals: Goal[] = [
      {
        id: "goal_rev_" + nanoid(),
        planId,
        title: "Tăng Doanh Thu 40% - Đạt 2.8 Tỷ VNĐ",
        description: "Tập trung vào các deal lớn B2B, khách sạn và chung cư cao cấp. Mục tiêu từ 2B → 2.8B VND",
        color: "gold" as GoalColor,
        targetMetric: "2.8 tỷ VNĐ",
        currentMetric: "1.85 tỷ VNĐ (66%)",
        kpis: [
          {
            label: "Doanh Thu Thực Tế",
            unit: "VNĐ",
            targetTotal: 2_800_000_000,
            weeklyTarget: 233_333_333,
            currentValue: 1_850_000_000,
            format: "currency",
          },
          {
            label: "Số Đơn Hàng",
            unit: "đơn",
            targetTotal: 150,
            weeklyTarget: 12.5,
            currentValue: 95,
            format: "number",
          },
        ] as GoalKpi[],
        order: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "goal_cust_" + nanoid(),
        planId,
        title: "Mở Rộng 10 Khách Hàng B2B Mới",
        description: "Tập trung vào phân khúc khách sạn 4-5 sao, resort và căn hộ dịch vụ. Từ 15 → 25 KH B2B",
        color: "indigo" as GoalColor,
        targetMetric: "25 KH B2B",
        currentMetric: "18 KH (72%)",
        kpis: [
          {
            label: "Số KH B2B Mới",
            unit: "khách",
            targetTotal: 25,
            weeklyTarget: 2.08,
            currentValue: 18,
            format: "number",
          },
          {
            label: "Hợp Đồng Ký Được",
            unit: "hợp đồng",
            targetTotal: 12,
            weeklyTarget: 1,
            currentValue: 8,
            format: "number",
          },
        ] as GoalKpi[],
        order: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "goal_prod_" + nanoid(),
        planId,
        title: "Phát Triển & Ra Mắt 12 Sản Phẩm Pro",
        description: "Hoàn thiện catalog, demo sản phẩm và tài liệu kỹ thuật cho dòng SmartBed Pro 2026",
        color: "green" as GoalColor,
        targetMetric: "12 sản phẩm",
        currentMetric: "5 sản phẩm (42%)",
        kpis: [
          {
            label: "Sản Phẩm Hoàn Thành",
            unit: "sản phẩm",
            targetTotal: 12,
            weeklyTarget: 1,
            currentValue: 5,
            format: "number",
          },
          {
            label: "Doanh Thu Sản Phẩm Pro",
            unit: "VNĐ",
            targetTotal: 500_000_000,
            weeklyTarget: 41_666_667,
            currentValue: 180_000_000,
            format: "currency",
          },
        ] as GoalKpi[],
        order: 2,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "goal_proc_" + nanoid(),
        planId,
        title: "Tối Ưu Hóa Quy Trình Bán Hàng",
        description: "Chuẩn hóa quy trình từ lead → chốt → after-sales trong CRM. Tăng tỷ lệ chốt từ 28% → 35%",
        color: "purple" as GoalColor,
        targetMetric: "Tỷ lệ chốt ≥ 35%",
        currentMetric: "85% hoàn thành",
        kpis: [
          {
            label: "Tỷ Lệ Hoàn Thành",
            unit: "%",
            targetTotal: 100,
            weeklyTarget: 8.33,
            currentValue: 85,
            format: "percent",
          },
          {
            label: "Thời Gian Xử Lý",
            unit: "ngày",
            targetTotal: 2,
            weeklyTarget: 2,
            currentValue: 2.5,
            format: "number",
          },
        ] as GoalKpi[],
        order: 3,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const [g0, g1, g2, g3] = goals.map((g) => g.id);

    const tasks: WeeklyTask[] = [];

    function addTask(
      goalId: string,
      week: number,
      title: string,
      status: "pending" | "done" | "skipped" = "pending"
    ) {
      const dueDate = addDays(getWeekStart(startDate, week), 5);
      tasks.push({
        id: "task_" + nanoid(),
        goalId,
        planId,
        weekNumber: week,
        title,
        status,
        dueDate,
        completedAt: status === "done" ? addDays(dueDate, -1) : undefined,
        createdAt: now,
        updatedAt: now,
      });
    }

    // ── Goal 1: Tăng Doanh Thu (16 tasks) ──────────────────────────────────────
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

    // ── Goal 2: Mở Rộng KH B2B (16 tasks) ──────────────────────────────────────
    addTask(g1, 1, "Xây dựng ICP (Ideal Customer Profile) cho phân khúc khách sạn 4-5 sao", "done");
    addTask(g1, 1, "Tạo danh sách 50 khách sạn mục tiêu tại TP.HCM và Hà Nội", "done");
    addTask(g1, 2, "Kết nối LinkedIn với 20 procurement manager khách sạn", "done");
    addTask(g1, 2, "Tham dự sự kiện Vietnam Hotel Investment Conference", "done");
    addTask(g1, 3, "Cold call 20 khách sạn trong danh sách, đặt lịch gặp 5 KH", "done");
    addTask(g1, 3, "Onboard KH mới #1 — khách sạn 5 sao Quận 1", "done");
    addTask(g1, 4, "Onboard KH mới #2 và #3 từ referral");
    addTask(g1, 4, "Gửi case study thành công cho 10 prospect đang cân nhắc");
    addTask(g1, 5, "Tiếp cận 15 resort tại Đà Nẵng qua email campaign");
    addTask(g1, 5, "Onboard KH mới #4 và #5");
    addTask(g1, 6, "Tham dự triển lãm nội thất VIFA EXPO 2026");
    addTask(g1, 6, "Thu thập 20 business card từ triển lãm, follow-up trong 48h");
    addTask(g1, 7, "Onboard KH mới #6, #7, #8 từ triển lãm");
    addTask(g1, 7, "Xây dựng chương trình referral cho KH hiện tại");
    addTask(g1, 8, "Onboard KH mới #9 và #10");
    addTask(g1, 9, "Tiếp cận 10 chung cư cao cấp đang bàn giao");

    // ── Goal 3: Phát Triển Sản Phẩm Pro (16 tasks) ──────────────────────────────
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

    // ── Goal 4: Tối Ưu Quy Trình (16 tasks) ───────────────────────────────────
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

    // ── Tạo kế hoạch demo ──────────────────────────────────────────────────────
    const plan: TwelveWeekPlan = {
      id: planId,
      staffId: "admin",
      title: "🎓 Demo Mẫu - Kế Hoạch Kinh Doanh Q1 2026",
      vision:
        "Đưa SmartFurni trở thành thương hiệu giường thông minh B2B hàng đầu Việt Nam trong năm 2026. Mục tiêu: tăng doanh thu 40%, mở rộng 10 KH B2B mới, phát triển 12 sản phẩm Pro và tối ưu hóa quy trình bán hàng.",
      startDate,
      endDate,
      isActive: true,
      goals,
      tasks,
      createdAt: now,
      updatedAt: now,
    };

    await savePlan(plan);

    return NextResponse.json({
      ok: true,
      planId,
      message: "Kế hoạch demo mẫu đã được tạo thành công!",
      stats: {
        goals: goals.length,
        tasks: tasks.length,
        doneTasks: tasks.filter((t) => t.status === "done").length,
        startDate,
        endDate,
      },
    });
  } catch (err) {
    console.error("Error seeding demo plan:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
