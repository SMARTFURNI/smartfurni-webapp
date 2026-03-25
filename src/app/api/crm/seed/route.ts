import { NextResponse } from "next/server";
import { createLead, createActivity, upsertCrmProduct, createTask } from "@/lib/crm-store";
import type { CrmProduct } from "@/lib/crm-store";

export async function POST() {
  try {
    // ─── Seed Products ────────────────────────────────────────────────────────
    const products: CrmProduct[] = [
      {
        id: "prod-pro-max",
        name: "SmartFurni Pro Max",
        category: "ergonomic_bed",
        sku: "SF-PRO-MAX",
        description: "Giường công thái học cao cấp nhất, tích hợp massage 8 điểm, sưởi hồng ngoại, điều chỉnh độ cứng 5 cấp độ. Phù hợp khách sạn 5 sao.",
        imageUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80",
        basePrice: 28900000,
        isActive: true,
        specs: {
          "Kích thước": "160x200cm / 180x200cm",
          "Tải trọng tối đa": "250kg",
          "Massage": "8 điểm, 6 chế độ",
          "Sưởi hồng ngoại": "Có",
          "Điều chỉnh độ cứng": "5 cấp độ",
          "Điều khiển": "App SmartFurni + Remote",
          "Bảo hành": "5 năm",
          "Xuất xứ": "Việt Nam",
        },
        discountTiers: [
          { minQty: 5, discountPct: 10, label: "≥5 bộ: -10%" },
          { minQty: 10, discountPct: 15, label: "≥10 bộ: -15%" },
          { minQty: 20, discountPct: 20, label: "≥20 bộ: -20%" },
          { minQty: 50, discountPct: 25, label: "≥50 bộ: -25%" },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "prod-pro",
        name: "SmartFurni Pro",
        category: "ergonomic_bed",
        sku: "SF-PRO",
        description: "Giường công thái học tầm trung, massage 4 điểm, điều chỉnh độ cứng 3 cấp độ. Lý tưởng cho căn hộ dịch vụ và khách sạn 3-4 sao.",
        imageUrl: "https://images.unsplash.com/photo-1505693314120-0d443867891c?w=600&q=80",
        basePrice: 18900000,
        isActive: true,
        specs: {
          "Kích thước": "160x200cm",
          "Tải trọng tối đa": "200kg",
          "Massage": "4 điểm, 4 chế độ",
          "Điều chỉnh độ cứng": "3 cấp độ",
          "Điều khiển": "App SmartFurni",
          "Bảo hành": "3 năm",
          "Xuất xứ": "Việt Nam",
        },
        discountTiers: [
          { minQty: 5, discountPct: 10, label: "≥5 bộ: -10%" },
          { minQty: 10, discountPct: 15, label: "≥10 bộ: -15%" },
          { minQty: 20, discountPct: 20, label: "≥20 bộ: -20%" },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "prod-lite",
        name: "SmartFurni Lite",
        category: "ergonomic_bed",
        sku: "SF-LITE",
        description: "Giường công thái học phổ thông, điều chỉnh độ cứng cơ bản, phù hợp dự án căn hộ bình dân.",
        imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80",
        basePrice: 12900000,
        isActive: true,
        specs: {
          "Kích thước": "160x200cm",
          "Tải trọng tối đa": "180kg",
          "Điều chỉnh độ cứng": "2 cấp độ",
          "Bảo hành": "2 năm",
          "Xuất xứ": "Việt Nam",
        },
        discountTiers: [
          { minQty: 10, discountPct: 10, label: "≥10 bộ: -10%" },
          { minQty: 20, discountPct: 15, label: "≥20 bộ: -15%" },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "prod-sofa-deluxe",
        name: "SmartFurni Sofa Giường Deluxe",
        category: "sofa_bed",
        sku: "SF-SOFA-DLX",
        description: "Sofa giường cao cấp, chuyển đổi trong 3 giây, chất liệu da Ý, phù hợp phòng khách căn hộ dịch vụ.",
        imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80",
        basePrice: 15900000,
        isActive: true,
        specs: {
          "Kích thước sofa": "220x90cm",
          "Kích thước giường": "220x140cm",
          "Chất liệu": "Da Ý nhập khẩu",
          "Cơ chế gập": "Tự động 3 giây",
          "Tải trọng": "200kg",
          "Bảo hành": "3 năm",
        },
        discountTiers: [
          { minQty: 5, discountPct: 10, label: "≥5 bộ: -10%" },
          { minQty: 10, discountPct: 15, label: "≥10 bộ: -15%" },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    for (const p of products) await upsertCrmProduct(p);

    // ─── Seed Leads ───────────────────────────────────────────────────────────
    const now = new Date();
    const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

    const leads = [
      {
        name: "Trần Minh Khoa",
        company: "KTS Khoa Design Studio",
        phone: "0901234567",
        email: "khoa@khoaDesign.vn",
        type: "architect" as const,
        stage: "negotiating" as const,
        district: "Q2",
        expectedValue: 580000000,
        source: "KTS giới thiệu",
        assignedTo: "Sales Hùng",
        notes: "KTS thiết kế dự án căn hộ 20 căn tại Q2. Quan tâm Pro Max cho phòng master.",
        lastContactAt: daysAgo(1),
        tags: ["hot", "kts"],
        projectName: "The River Residence Q2",
        projectAddress: "Đường 10, P. Thạnh Mỹ Lợi, Q2",
        unitCount: 20,
      },
      {
        name: "Nguyễn Thị Hoa",
        company: "Hoa Serviced Apartment",
        phone: "0912345678",
        email: "hoa@hoaapartment.com",
        type: "investor" as const,
        stage: "quoted" as const,
        district: "Q7",
        expectedValue: 1200000000,
        source: "Facebook Ads",
        assignedTo: "Sales Lan",
        notes: "Chủ đầu tư 40 căn hộ dịch vụ tại Q7. Cần báo giá gấp trước cuối tháng.",
        lastContactAt: daysAgo(2),
        tags: ["hot", "facebook"],
        projectName: "Hoa Apartment Q7",
        projectAddress: "Đường Nguyễn Thị Thập, Q7",
        unitCount: 40,
      },
      {
        name: "Lê Văn Bình",
        company: "Bình Đại Lý Nội Thất",
        phone: "0923456789",
        email: "binh@noithatbinh.vn",
        type: "dealer" as const,
        stage: "won" as const,
        district: "Bình Thạnh",
        expectedValue: 850000000,
        source: "Triển lãm",
        assignedTo: "Sales Hùng",
        notes: "Đại lý cấp 1 khu vực Bình Thạnh - Gò Vấp. Đã ký hợp đồng phân phối.",
        lastContactAt: daysAgo(0),
        tags: ["won", "dealer"],
        projectName: "",
        projectAddress: "",
        unitCount: 0,
      },
      {
        name: "Phạm Quốc Tuấn",
        company: "Tuấn Architecture",
        phone: "0934567890",
        email: "tuan@tuanarch.com",
        type: "architect" as const,
        stage: "surveyed" as const,
        district: "Q1",
        expectedValue: 420000000,
        source: "Google Ads",
        assignedTo: "Sales Lan",
        notes: "KTS thiết kế khách sạn boutique 15 phòng tại Q1. Đã khảo sát, chờ báo giá.",
        lastContactAt: daysAgo(1),
        tags: ["khach-san"],
        projectName: "Boutique Hotel Q1",
        projectAddress: "Đường Lê Lợi, Q1",
        unitCount: 15,
      },
      {
        name: "Vũ Thị Mai",
        company: "Mai Luxury Residences",
        phone: "0945678901",
        email: "mai@mailuxury.vn",
        type: "investor" as const,
        stage: "new" as const,
        district: "Thủ Đức",
        expectedValue: 2500000000,
        source: "Facebook Ads",
        assignedTo: "",
        notes: "Dự án lớn 80 căn hộ cao cấp tại Thủ Đức. Mới liên hệ qua Facebook.",
        lastContactAt: daysAgo(0),
        tags: ["facebook", "hot", "large"],
        projectName: "Mai Luxury Thủ Đức",
        projectAddress: "Đường Võ Văn Ngân, Thủ Đức",
        unitCount: 80,
      },
      {
        name: "Đặng Hữu Phúc",
        company: "",
        phone: "0956789012",
        email: "",
        type: "architect" as const,
        stage: "profile_sent" as const,
        district: "Q3",
        expectedValue: 280000000,
        source: "Zalo",
        assignedTo: "Sales Hùng",
        notes: "KTS tự do, dự án nhà phố 10 phòng ngủ. Đã gửi profile, chờ phản hồi.",
        lastContactAt: daysAgo(4), // Overdue!
        tags: ["zalo"],
        projectName: "Nhà phố Q3",
        projectAddress: "Đường Võ Văn Tần, Q3",
        unitCount: 10,
      },
    ];

    const createdLeads = [];
    for (const l of leads) {
      const lead = await createLead(l);
      createdLeads.push(lead);
    }

    // ─── Seed Activities ──────────────────────────────────────────────────────
    if (createdLeads[0]) {
      await createActivity({
        leadId: createdLeads[0].id,
        type: "meeting",
        title: "Họp tư vấn lần 1",
        content: "Gặp mặt tại văn phòng KTS. Khách quan tâm Pro Max cho phòng master, Lite cho phòng phụ. Yêu cầu báo giá 20 bộ.",
        createdBy: "Sales Hùng",
        attachments: [],
      });
      await createActivity({
        leadId: createdLeads[0].id,
        type: "call",
        title: "Gọi follow-up",
        content: "Khách đang xem xét, sẽ quyết định trong tuần tới. Cần gửi thêm tài liệu kỹ thuật.",
        createdBy: "Sales Hùng",
        attachments: [],
      });
    }

    if (createdLeads[1]) {
      await createActivity({
        leadId: createdLeads[1].id,
        type: "call",
        title: "Gọi tư vấn lần đầu",
        content: "Chị Hoa cần báo giá 40 căn, ưu tiên Pro cho phòng ngủ chính, Lite cho phòng phụ. Deadline báo giá: cuối tháng.",
        createdBy: "Sales Lan",
        attachments: [],
      });
      await createActivity({
        leadId: createdLeads[1].id,
        type: "quote_sent",
        title: "Gửi báo giá BG-2025-001",
        content: "Đã gửi báo giá 40 bộ Pro + 40 bộ Lite. Tổng giá trị 1.2 tỷ đồng, chiết khấu 20%.",
        createdBy: "Sales Lan",
        attachments: [],
      });
    }

    // ─── Seed Tasks ───────────────────────────────────────────────────────────
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    if (createdLeads[0]) {
      await createTask({
        leadId: createdLeads[0].id,
        leadName: createdLeads[0].name,
        title: "Gọi xác nhận quyết định cuối",
        dueDate: today,
        priority: "high",
        done: false,
        assignedTo: "Sales Hùng",
      });
    }
    if (createdLeads[1]) {
      await createTask({
        leadId: createdLeads[1].id,
        leadName: createdLeads[1].name,
        title: "Follow-up báo giá đã gửi",
        dueDate: today,
        priority: "high",
        done: false,
        assignedTo: "Sales Lan",
      });
    }
    if (createdLeads[4]) {
      await createTask({
        leadId: createdLeads[4].id,
        leadName: createdLeads[4].name,
        title: "Liên hệ tư vấn dự án 80 căn",
        dueDate: today,
        priority: "medium",
        done: false,
        assignedTo: "",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Seed dữ liệu CRM thành công",
      created: {
        products: products.length,
        leads: createdLeads.length,
        activities: 4,
        tasks: 3,
      },
    });

  } catch (error) {
    console.error("[CRM Seed] Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
