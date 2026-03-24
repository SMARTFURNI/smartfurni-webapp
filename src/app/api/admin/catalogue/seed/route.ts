/**
 * Seed route: Tạo catalogue mẫu để demo.
 * POST /api/admin/catalogue/seed
 * Chỉ tạo nếu chưa có catalogue nào.
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  getCatalogues,
  createCatalogue,
  addCataloguePage,
  updateCatalogue,
} from "@/lib/catalogue-store";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await requireAdmin();

    const existing = await getCatalogues(false);
    if (existing.length > 0) {
      return NextResponse.json({ ok: true, message: "Catalogue đã tồn tại, bỏ qua seed." });
    }

    // Tạo catalogue mẫu
    const cat = await createCatalogue({
      title: "SmartFurni B2B Catalogue 2025",
      description: "Bộ sưu tập giường công thái học cao cấp dành cho đối tác B2B. Bảng giá, thông số kỹ thuật và chính sách phân phối.",
      coverImageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80",
      status: "draft",
    });

    // Trang 1: Bìa trước
    await addCataloguePage(cat.id, {
      type: "cover",
      title: "SmartFurni",
      subtitle: "B2B Catalogue 2025",
      imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80",
      bgColor: "#0a0800",
      textColor: "#C9A84C",
      content: "",
      badge: "2025",
    });

    // Trang 2: Giới thiệu
    await addCataloguePage(cat.id, {
      type: "content",
      title: "Về SmartFurni",
      subtitle: "Công nghệ giấc ngủ thông minh",
      imageUrl: "",
      bgColor: "#0d0b00",
      textColor: "#ffffff",
      content: "SmartFurni là thương hiệu nội thất công nghệ hàng đầu Việt Nam, chuyên sản xuất giường công thái học tích hợp công nghệ điều chỉnh tư thế thông minh.\n\nVới hơn 10 năm kinh nghiệm, chúng tôi cung cấp giải pháp toàn diện cho đối tác B2B: khách sạn, resort, bệnh viện và nhà ở cao cấp.",
      badge: "",
    });

    // Trang 3: Sản phẩm SmartFurni Pro
    await addCataloguePage(cat.id, {
      type: "product",
      title: "SmartFurni Pro",
      subtitle: "Giường công thái học cao cấp",
      imageUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80",
      bgColor: "#111",
      textColor: "#ffffff",
      content: "Điều chỉnh 7 vùng độc lập\nTích hợp massage 12 chế độ\nKết nối app SmartFurni\nBảo hành 7 năm toàn diện",
      badge: "BEST SELLER",
    });

    // Trang 4: Sản phẩm SmartFurni Lite
    await addCataloguePage(cat.id, {
      type: "product",
      title: "SmartFurni Lite",
      subtitle: "Giải pháp tối ưu chi phí",
      imageUrl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&q=80",
      bgColor: "#0d1117",
      textColor: "#ffffff",
      content: "Điều chỉnh 3 vùng cơ bản\nMassage 6 chế độ\nKhiển từ xa\nBảo hành 5 năm",
      badge: "PHỔ BIẾN",
    });

    // Trang 5: Bảng giá B2B
    await addCataloguePage(cat.id, {
      type: "content",
      title: "Bảng Giá B2B",
      subtitle: "Chính sách đại lý & phân phối",
      imageUrl: "",
      bgColor: "#0a0800",
      textColor: "#ffffff",
      content: "SmartFurni Pro\nGiá lẻ: 45.000.000đ\nGiá đại lý: Liên hệ\n\nSmartFurni Lite\nGiá lẻ: 28.000.000đ\nGiá đại lý: Liên hệ\n\nChính sách: Chiết khấu 15-30% theo số lượng\nHỗ trợ: Kỹ thuật & bảo hành tại chỗ",
      badge: "B2B",
    });

    // Trang 6: Bìa sau
    await addCataloguePage(cat.id, {
      type: "back-cover",
      title: "Liên hệ đặt hàng",
      subtitle: "",
      imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80",
      bgColor: "#0a0800",
      textColor: "#C9A84C",
      content: "Hotline: 1800-SMART\nEmail: b2b@smartfurni.vn\nWebsite: smartfurni.vn",
      badge: "",
    });

    // Xuất bản
    await updateCatalogue(cat.id, { status: "published" });

    return NextResponse.json({
      ok: true,
      message: "Đã tạo catalogue mẫu thành công!",
      catalogueId: cat.id,
    });
  } catch (err) {
    console.error("[catalogue/seed] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
