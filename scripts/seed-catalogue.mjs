/**
 * seed-catalogue.mjs
 * Seed catalogue B2B SmartFurni với nội dung THỰC TẾ từ PDF catalogue 20 trang
 * Chạy: DATABASE_URL="..." node scripts/seed-catalogue.mjs --force
 */
import pg from "pg";
import { randomUUID } from "crypto";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

async function ensureTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS catalogues (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      cover_image_url TEXT DEFAULT '',
      status TEXT DEFAULT 'draft',
      page_count INTEGER DEFAULT 0,
      view_count INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS catalogue_pages (
      id TEXT PRIMARY KEY,
      catalogue_id TEXT NOT NULL REFERENCES catalogues(id) ON DELETE CASCADE,
      page_number INTEGER NOT NULL DEFAULT 1,
      type TEXT DEFAULT 'content',
      title TEXT DEFAULT '',
      subtitle TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      bg_color TEXT DEFAULT '#1a1a1a',
      text_color TEXT DEFAULT '#ffffff',
      content TEXT DEFAULT '',
      product_ids TEXT DEFAULT '[]',
      badge TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log("✅ Tables ensured");
}

async function clearAll() {
  await query("DELETE FROM catalogue_pages");
  await query("DELETE FROM catalogues");
  console.log("🗑️  Cleared old data");
}

async function createCatalogue(data) {
  const id = randomUUID();
  await query(
    `INSERT INTO catalogues (id, title, description, cover_image_url, status, page_count)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, data.title, data.description || "", data.coverImageUrl || "", "published", data.pages.length]
  );
  for (let i = 0; i < data.pages.length; i++) {
    const p = data.pages[i];
    const pid = randomUUID();
    await query(
      `INSERT INTO catalogue_pages
         (id, catalogue_id, page_number, type, title, subtitle, image_url, bg_color, text_color, content, badge)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        pid, id, i + 1,
        p.type || "content",
        p.title || "",
        p.subtitle || "",
        p.imageUrl || "",
        p.bgColor || "#1a1a1a",
        p.textColor || "#ffffff",
        p.content || "",
        p.badge || "",
      ]
    );
    process.stdout.write(`  Trang ${i + 1}/${data.pages.length} ✓\r`);
  }
  console.log(`\n✅ "${data.title}" (${data.pages.length} trang): ${id}`);
  return id;
}

// ─── Catalogue chính: 20 trang từ PDF thực tế ─────────────────────────────────
const catalogue = {
  title: "Catalogue B2B SmartFurni — Giải Pháp Nội Thất Thông Minh 2025",
  description: "Bộ catalogue B2B đầy đủ gồm giường công thái học và sofa giường thông minh. Bảng giá, thông số kỹ thuật, chính sách đại lý và điều kiện hợp tác dành cho đối tác doanh nghiệp.",
  coverImageUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80",
  pages: [
    // ── P01: BÌA TRƯỚC ──────────────────────────────────────────────────────
    {
      type: "cover",
      title: "GIẢI PHÁP NỘI THẤT THÔNG MINH",
      subtitle: "B2B CATALOGUE 2025",
      imageUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1400&q=85",
      bgColor: "#0d0d0d",
      textColor: "#C9A84C",
      badge: "",
      content: "GIƯỜNG CÔNG THÁI HỌC  ·  SOFA GIƯỜNG ĐA NĂNG\n\nNhà sản xuất nội thất thông minh hàng đầu Việt Nam\nwww.smartfurni.vn  |  Hotline B2B: 0287 122 0818",
    },

    // ── P02: VỀ SMARTFURNI ──────────────────────────────────────────────────
    {
      type: "content",
      title: "KIẾN TẠO KHÔNG GIAN SỐNG ĐẲNG CẤP",
      subtitle: "VỀ SMARTFURNI",
      imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200&q=80",
      bgColor: "#ffffff",
      textColor: "#1a1a1a",
      badge: "",
      content: "SmartFurni là thương hiệu tiên phong trong lĩnh vực nội thất thông minh tại Việt Nam, chuyên cung cấp giải pháp tối ưu không gian kết hợp thẩm mỹ cao cấp và công năng vượt trội.\n\n✦ THIẾT KẾ TINH TẾ\nPhong cách minimalist luxury, phù hợp mọi không gian kiến trúc hiện đại.\n\n✦ CHẤT LƯỢNG BỀN BỈ\nVật liệu cao cấp, quy trình kiểm định nghiêm ngặt, tuổi thọ sản phẩm vượt trội.\n\n✦ CÔNG NĂNG VƯỢT TRỘI\nTích hợp công nghệ thông minh, tối đa hóa diện tích sử dụng cho người dùng.",
    },

    // ── P03: HỆ THỐNG SHOWROOM ──────────────────────────────────────────────
    {
      type: "content",
      title: "MẠNG LƯỚI SHOWROOM & DỊCH VỤ B2B",
      subtitle: "HỆ THỐNG PHÂN PHỐI",
      imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&q=80",
      bgColor: "#f8f5f0",
      textColor: "#1a1a1a",
      badge: "",
      content: "📍 SHOWROOM HỒ CHÍ MINH\n74 Nguyễn Thị Nhung, KĐT Vạn Phúc City\nP. Hiệp Bình Phước, TP. Thủ Đức, TP. HCM\n\n📍 SHOWROOM HÀ NỘI\nB46 - căn 29, KĐT Geleximco B, Lê Trọng Tấn\nP. Dương Nội, Q. Hà Đông, TP. Hà Nội\n\n✔ Hỗ trợ B2B 24/7 — Chuyên viên tư vấn dự án chuyên nghiệp\n✔ Giao hàng đúng tiến độ — Cam kết theo hợp đồng\n✔ Miễn phí vận chuyển & lắp đặt — Áp dụng đơn B2B nội thành",
    },

    // ── P04: GIƯỜNG CÔNG THÁI HỌC - TỔNG QUAN ──────────────────────────────
    {
      type: "content",
      title: "GIẢI PHÁP CHO PHÒNG NGỦ HẠNH PHÚC",
      subtitle: "GIƯỜNG CÔNG THÁI HỌC",
      imageUrl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80",
      bgColor: "#1a1a1a",
      textColor: "#ffffff",
      badge: "",
      content: "Giường công thái học SmartFurni được thiết kế dựa trên nguyên lý ergonomic, kết hợp công nghệ điều chỉnh điện hiện đại, mang lại sự thoải mái tối đa và hỗ trợ sức khỏe toàn diện.\n\n★ HỖ TRỢ SỨC KHỎE — Nâng lưng và duỗi chân linh hoạt, hỗ trợ cột sống, giảm đau mỏi\n★ TĂNG LƯU THÔNG MÁU — Thiết kế tối ưu cải thiện tuần hoàn máu trong khi ngủ\n★ ĐA CHỨC NĂNG — Lý tưởng cho ngủ, đọc sách, xem phim, làm việc\n\nỨNG DỤNG B2B\n▸ Khách sạn & Resort — Nâng cấp dịch vụ phòng 5 sao\n▸ Bệnh viện & Phòng khám — Hỗ trợ phục hồi sức khỏe\n▸ Căn hộ cao cấp — Nội thất thông minh cho bất động sản",
    },

    // ── P05: GSF100/102 - LUXURY ────────────────────────────────────────────
    {
      type: "product",
      title: "GSF100 / 102",
      subtitle: "GIƯỜNG CÔNG THÁI HỌC — DÒNG LUXURY",
      imageUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=85",
      bgColor: "#ffffff",
      textColor: "#1a1a1a",
      badge: "LUXURY",
      content: "Tuyệt tác giường công thái học cao cấp nhất, mang đến trải nghiệm nghỉ ngơi đỉnh cao cho resort 5 sao, penthouse và biệt thự hạng sang.\n\nGIÁ B2B THAM KHẢO: 26,800,000đ\n\nTHÔNG SỐ KỸ THUẬT\n▸ Kích thước: Double Bed (1.6m × 2m)\n▸ Động cơ: Động cơ kép Okin (Đức) siêu êm\n▸ Chất liệu: Khung thép hợp kim chịu lực cao\n▸ Điều khiển: Remote không dây & App Mobile\n\nTÍNH NĂNG NỔI BẬT\n✦ Nâng hạ lưng và chân độc lập, tùy chỉnh góc độ linh hoạt\n✦ Chế độ Zero Gravity (Không trọng lực) giảm áp lực cột sống\n✦ Tích hợp hệ thống massage đa điểm thư giãn chuyên sâu",
    },

    // ── P06: GSF200/300 - PREMIUM ───────────────────────────────────────────
    {
      type: "product",
      title: "GSF200 / 300",
      subtitle: "GIƯỜNG CÔNG THÁI HỌC — DÒNG PREMIUM",
      imageUrl: "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200&q=85",
      bgColor: "#f8f5f0",
      textColor: "#1a1a1a",
      badge: "BEST SELLER",
      content: "Dòng sản phẩm bán chạy nhất, cân bằng hoàn hảo giữa tính năng thông minh và chi phí đầu tư. Lựa chọn tối ưu cho khách sạn 4 sao và căn hộ dịch vụ cao cấp.\n\nGIÁ B2B THAM KHẢO: 12,900,000đ – 16,990,000đ\n\nTHÔNG SỐ KỸ THUẬT\n▸ Kích thước: Single / Double (0.9m – 1.8m × 2m)\n▸ Động cơ: Động cơ Okin (Đức) bền bỉ\n▸ Chất liệu: Khung thép hợp kim sơn tĩnh điện\n▸ Điều khiển: Remote không dây tiện lợi\n\nTÍNH NĂNG NỔI BẬT\n✦ Nâng hạ lưng và chân linh hoạt, hỗ trợ đọc sách, xem TV\n✦ Thiết kế công thái học hỗ trợ đường cong tự nhiên của cột sống\n✦ Động cơ vận hành êm ái, không gây tiếng ồn khi sử dụng",
    },

    // ── P07: GSF150/180 - STANDARD ──────────────────────────────────────────
    {
      type: "product",
      title: "GSF150 / 180",
      subtitle: "GIƯỜNG CÔNG THÁI HỌC — DÒNG STANDARD",
      imageUrl: "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=1200&q=85",
      bgColor: "#ffffff",
      textColor: "#1a1a1a",
      badge: "STANDARD",
      content: "Giải pháp giường công thái học tiêu chuẩn, tối ưu chi phí đầu tư nhưng vẫn đảm bảo độ bền và công năng cơ bản. Phù hợp cho khách sạn 3 sao, bệnh viện, phòng khám.\n\nGIÁ B2B THAM KHẢO: 9,790,000đ – 16,900,000đ\n\nTHÔNG SỐ KỸ THUẬT\n▸ Kích thước: Single Bed (0.9m – 1.2m × 2m)\n▸ Động cơ: Động cơ đơn tiêu chuẩn\n▸ Chất liệu: Khung thép hợp kim chắc chắn\n▸ Điều khiển: Remote có dây / không dây\n\nTÍNH NĂNG NỔI BẬT\n✦ Chức năng nâng hạ lưng cơ bản, hỗ trợ ngồi dậy dễ dàng\n✦ Kết cấu khung thép chịu lực cao, bền trong môi trường B2B\n✦ Thiết kế tối giản, dễ vệ sinh và bảo trì định kỳ",
    },

    // ── P08: GYT215A - GIƯỜNG Y TẾ ─────────────────────────────────────────
    {
      type: "product",
      title: "GYT215A",
      subtitle: "GIƯỜNG Y TẾ CHUYÊN DỤNG",
      imageUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&q=85",
      bgColor: "#f0f4f8",
      textColor: "#1a1a1a",
      badge: "Y TẾ",
      content: "Giường y tế chuyên dụng với thiết kế công thái học, đảm bảo an toàn và hỗ trợ tối đa cho quá trình điều trị, phục hồi của bệnh nhân.\n\nGIÁ B2B THAM KHẢO: Liên Hệ Báo Giá\n\nTHÔNG SỐ KỸ THUẬT\n▸ Kích thước: Single Bed Y Tế\n▸ Động cơ: Động cơ y tế chuyên dụng\n▸ Chất liệu: Thép sơn tĩnh điện kháng khuẩn\n▸ Di chuyển: Bánh xe chịu lực có khóa an toàn\n\nTÍNH NĂNG NỔI BẬT\n✦ Nâng hạ lưng và chân bằng điện, hỗ trợ thay đổi tư thế dễ dàng\n✦ Lan can bảo vệ hai bên có thể gập gọn, đảm bảo an toàn\n✦ Bề mặt kháng khuẩn, dễ vệ sinh và khử trùng theo chuẩn y tế",
    },

    // ── P09: SOFA GIƯỜNG - TỔNG QUAN ────────────────────────────────────────
    {
      type: "content",
      title: "TỐI ƯU KHÔNG GIAN — NHÂN ĐÔI TIỆN ÍCH",
      subtitle: "SOFA GIƯỜNG THÔNG MINH",
      imageUrl: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=1200&q=80",
      bgColor: "#1a1a1a",
      textColor: "#ffffff",
      badge: "",
      content: "Sofa giường SmartFurni là giải pháp hoàn hảo cho không gian sống hiện đại. Thiết kế thông minh tích hợp nhiều công năng trong một sản phẩm, dễ dàng chuyển đổi từ phòng khách sang phòng ngủ chỉ trong vài thao tác đơn giản.\n\n★ TIẾT KIỆM DIỆN TÍCH — Giải phóng không gian, lý tưởng cho căn hộ diện tích khiêm tốn\n★ ĐA NĂNG 4 TRONG 1 — Tích hợp Sofa, Giường ngủ, Bàn làm việc và Hộc chứa đồ\n★ THẨM MỸ CAO — Thiết kế hiện đại, chất liệu cao cấp (Gỗ tự nhiên, Da PU)\n\nỨNG DỤNG B2B\n▸ Căn hộ Studio / 1PN — Giải pháp nội thất trọn gói\n▸ Homestay & Airbnb — Tăng sức chứa khách lưu trú\n▸ Văn phòng — Không gian nghỉ ngơi linh hoạt",
    },

    // ── P10: SMF30 - PREMIUM 4 IN 1 ─────────────────────────────────────────
    {
      type: "product",
      title: "SMF30",
      subtitle: "SOFA GIƯỜNG THÔNG MINH — PREMIUM 4 IN 1",
      imageUrl: "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=1200&q=85",
      bgColor: "#ffffff",
      textColor: "#1a1a1a",
      badge: "PREMIUM",
      content: "Tuyệt tác sofa giường cao cấp nhất với thiết kế thông minh 4 trong 1. Giải pháp hoàn hảo cho căn hộ studio cao cấp và văn phòng lãnh đạo.\n\nGIÁ B2B THAM KHẢO: 11,990,000đ\n\nTHÔNG SỐ KỸ THUẬT\n▸ Chức năng: Sofa · Giường · Bàn làm việc · Bàn ăn\n▸ Chất liệu: Gỗ tự nhiên cao cấp, chống mối mọt\n▸ Lưu trữ: Hộc để đồ rộng rãi dưới nệm ngồi\n▸ Màu sắc: Đa dạng vân gỗ tự nhiên\n\nTÍNH NĂNG NỔI BẬT\n✦ Chuyển đổi linh hoạt giữa 4 công năng chỉ trong vài thao tác\n✦ Thiết kế sang trọng, nâng tầm đẳng cấp không gian nội thất\n✦ Kết cấu gỗ tự nhiên vững chắc, chịu tải trọng lớn, độ bền vượt trội",
    },

    // ── P11: SMF28A ──────────────────────────────────────────────────────────
    {
      type: "product",
      title: "SMF28A",
      subtitle: "SOFA GIƯỜNG THÔNG MINH — PREMIUM 4 IN 1",
      imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200&q=85",
      bgColor: "#f8f5f0",
      textColor: "#1a1a1a",
      badge: "4 IN 1",
      content: "Giải pháp sofa giường 4 trong 1 với mức giá cực kỳ cạnh tranh. Lựa chọn hoàn hảo để tối ưu không gian và chi phí cho các dự án căn hộ dịch vụ.\n\nGIÁ B2B THAM KHẢO: 6,490,000đ\n\nTHÔNG SỐ KỸ THUẬT\n▸ Chức năng: Sofa · Giường · Bàn làm việc · Bàn ăn\n▸ Chất liệu: Gỗ MDF phủ Melamin chống trầy\n▸ Lưu trữ: Hộc để đồ tiện lợi dưới nệm\n▸ Màu sắc: Đa dạng vân gỗ hiện đại\n\nTÍNH NĂNG NỔI BẬT\n✦ Tích hợp 4 công năng trong 1 sản phẩm, tiết kiệm tối đa diện tích\n✦ Bề mặt Melamin chống trầy xước, chống thấm nước, dễ vệ sinh\n✦ Cơ cấu chuyển đổi nhẹ nhàng, an toàn cho mọi đối tượng",
    },

    // ── P12: SMF23-PU-GTN ────────────────────────────────────────────────────
    {
      type: "product",
      title: "SMF23-PU-GTN",
      subtitle: "SOFA GIƯỜNG THÔNG MINH — DÒNG STANDARD",
      imageUrl: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1200&q=85",
      bgColor: "#ffffff",
      textColor: "#1a1a1a",
      badge: "STANDARD",
      content: "Sofa giường tiêu chuẩn với sự kết hợp hoàn hảo giữa khung gỗ tự nhiên vững chắc và lớp bọc da PU cao cấp. Lựa chọn lý tưởng cho căn hộ dịch vụ và homestay.\n\nGIÁ B2B THAM KHẢO: 5,490,000đ\n\nTHÔNG SỐ KỸ THUẬT\n▸ Chức năng: Sofa phòng khách & Giường ngủ\n▸ Khung sườn: 100% Gỗ tự nhiên chịu lực tốt\n▸ Chất liệu bọc: Da PU cao cấp chống thấm nước\n▸ Lưu trữ: Hộc chứa đồ rộng rãi bên dưới\n\nTÍNH NĂNG NỔI BẬT\n✦ Bề mặt da PU dễ lau chùi, đặc biệt phù hợp không gian cho thuê\n✦ Khung gỗ tự nhiên đã qua xử lý chống mối mọt, tuổi thọ lâu dài\n✦ Chuyển đổi từ sofa thành giường chỉ trong 3 giây",
    },

    // ── P13: SMF23-GTN - BEST SELLER ────────────────────────────────────────
    {
      type: "product",
      title: "SMF23-GTN",
      subtitle: "SOFA GIƯỜNG THÔNG MINH — BEST SELLER",
      imageUrl: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=1200&q=85",
      bgColor: "#f8f5f0",
      textColor: "#1a1a1a",
      badge: "BEST SELLER",
      content: "Mẫu sofa giường bán chạy nhất với hơn 260 sản phẩm đã được giao. Thiết kế mộc mạc từ 100% gỗ tự nhiên, mang lại độ bền vượt thời gian và vẻ đẹp ấm cúng.\n\nGIÁ B2B THAM KHẢO: 4,990,000đ\n\nTHÔNG SỐ KỸ THUẬT\n▸ Chức năng: Sofa phòng khách & Giường ngủ\n▸ Chất liệu: 100% Gỗ tự nhiên nguyên khối\n▸ Lưu trữ: Hộc chứa đồ siêu rộng bên dưới\n▸ Thành tích: Best-seller (>260 sản phẩm đã giao)\n\nTÍNH NĂNG NỔI BẬT\n✦ Kết cấu gỗ tự nhiên 100%, chịu tải trọng lên đến 300kg\n✦ Bề mặt gỗ xử lý kỹ lưỡng, chống mối mọt, cong vênh\n✦ Mức giá hợp lý cho các dự án homestay, nhà cho thuê dài hạn",
    },

    // ── P14: SMF600 - TOP 1 BÁN CHẠY ────────────────────────────────────────
    {
      type: "product",
      title: "SMF600",
      subtitle: "SOFA GIƯỜNG THÔNG MINH — TOP 1 BÁN CHẠY",
      imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&q=85",
      bgColor: "#1a1a1a",
      textColor: "#ffffff",
      badge: "TOP 1",
      content: "Mẫu sofa giường phổ thông với doanh số Top 1. Giải pháp tối ưu chi phí đầu tư nhất cho các dự án homestay, phòng trọ và căn hộ cho thuê sinh viên.\n\nGIÁ B2B THAM KHẢO: 3,990,000đ\n\nTHÔNG SỐ KỸ THUẬT\n▸ Chức năng: Sofa phòng khách & Giường ngủ\n▸ Khung sườn: Khung thép chịu lực sơn tĩnh điện\n▸ Chất liệu bọc: Da PU chống thấm nước\n▸ Thành tích: Top 1 doanh số bán ra\n\nTÍNH NĂNG NỔI BẬT\n✦ Mức giá siêu tiết kiệm, tối ưu hóa ngân sách dự án\n✦ Khung thép chịu lực cao, bền bỉ trong môi trường sử dụng tần suất cao\n✦ Thiết kế nhỏ gọn, dễ vận chuyển và lắp đặt trong không gian hẹp",
    },

    // ── P15: BẢNG SO SÁNH GIƯỜNG CÔNG THÁI HỌC ─────────────────────────────
    {
      type: "content",
      title: "BẢNG SO SÁNH GIƯỜNG CÔNG THÁI HỌC",
      subtitle: "TỔNG QUAN",
      imageUrl: "",
      bgColor: "#ffffff",
      textColor: "#1a1a1a",
      badge: "",
      content: "TIÊU CHÍ | GSF100/102 (Luxury) | GSF200/300 (Premium) | GSF150/180 (Standard)\n\nPhân Khúc | Luxury (Cao Cấp) | Premium (Trung Cấp) | Standard (Tiêu Chuẩn)\n\nKích Thước | Double 1.6m × 2m | Single/Double 0.9–1.8m × 2m | Single 0.9–1.2m × 2m\n\nTính Năng Chính | Nâng lưng/chân độc lập, Zero Gravity, Động cơ kép êm ái | Nâng lưng/chân, Remote không dây, Hỗ trợ cột sống | Nâng lưng cơ bản, Remote có dây/không dây\n\nỨng Dụng B2B | Resort 5 sao, Penthouse, Biệt thự cao cấp | Khách sạn 4 sao, Căn hộ dịch vụ cao cấp | Khách sạn 3 sao, Bệnh viện, Phòng khám\n\nGiá B2B Tham Khảo | 26,800,000đ | 12,900,000đ – 16,990,000đ | 9,790,000đ – 16,900,000đ",
    },

    // ── P16: BẢNG SO SÁNH SOFA GIƯỜNG ──────────────────────────────────────
    {
      type: "content",
      title: "BẢNG SO SÁNH SOFA GIƯỜNG THÔNG MINH",
      subtitle: "TỔNG QUAN",
      imageUrl: "",
      bgColor: "#f8f5f0",
      textColor: "#1a1a1a",
      badge: "",
      content: "TIÊU CHÍ | SMF30/28A (Premium) | SMF23 Series (Standard) | SMF600 (Basic)\n\nPhân Khúc | Premium (4 trong 1) | Standard (Tiêu Chuẩn) | Basic (Phổ Thông)\n\nChất Liệu Chính | Gỗ tự nhiên cao cấp / Gỗ MDF phủ Melamin | Khung gỗ tự nhiên, Bọc Da PU cao cấp | Khung thép chịu lực, Bọc Da PU chống thấm\n\nTính Năng Tích Hợp | Sofa, Giường, Bàn làm việc, Bàn ăn, Hộc đồ | Sofa, Giường, Hộc đựng đồ rộng rãi | Sofa, Giường, Gấp gọn dễ dàng\n\nỨng Dụng B2B | Căn hộ Studio cao cấp, Văn phòng lãnh đạo | Căn hộ dịch vụ, Homestay chất lượng cao | Phòng trọ sinh viên, Homestay tối ưu chi phí\n\nGiá B2B Tham Khảo | 6,490,000đ – 11,990,000đ | 4,990,000đ – 5,490,000đ | 3,990,000đ",
    },

    // ── P17: CHÍNH SÁCH & ĐIỀU KIỆN B2B ────────────────────────────────────
    {
      type: "content",
      title: "CHÍNH SÁCH & ĐIỀU KIỆN B2B",
      subtitle: "ĐỐI TÁC DOANH NGHIỆP",
      imageUrl: "",
      bgColor: "#1a1a1a",
      textColor: "#ffffff",
      badge: "",
      content: "💰 GIÁ & CHIẾT KHẤU\n✔ Áp dụng bảng giá B2B ưu đãi đặc biệt\n✔ Chiết khấu lũy tiến theo số lượng đơn hàng\n✔ Cam kết bình ổn giá theo hợp đồng nguyên tắc\n✔ Hỗ trợ làm hồ sơ, báo giá dự thầu chuyên nghiệp\n\n🚚 GIAO HÀNG & LẮP ĐẶT\n✔ Miễn phí giao hàng & lắp đặt nội thành (có điều kiện)\n✔ Hỗ trợ chi phí vận chuyển cho các dự án tỉnh\n✔ Đội ngũ kỹ thuật thi công chuyên nghiệp, tận tâm\n✔ Đảm bảo tuyệt đối tiến độ bàn giao theo hợp đồng\n\n🛡️ BẢO HÀNH & ĐỔI TRẢ\n✔ Bảo hành chính hãng từ 12 đến 24 tháng\n✔ Chính sách 1 đổi 1 trong 7 ngày nếu có lỗi từ NSX\n✔ Hỗ trợ gói bảo trì, bảo dưỡng định kỳ với giá ưu đãi\n✔ Cam kết thời gian xử lý bảo hành nhanh chóng (24–48h)\n\n💳 THANH TOÁN & CÔNG NỢ\n✔ Phương thức thanh toán linh hoạt, đa dạng\n✔ Chính sách công nợ ưu đãi dành riêng cho đối tác thân thiết\n✔ Chia nhỏ thanh toán theo từng giai đoạn của dự án\n✔ Cung cấp đầy đủ hóa đơn VAT và chứng từ hợp lệ",
    },

    // ── P18: LỢI ÍCH KHI HỢP TÁC ──────────────────────────────────────────
    {
      type: "content",
      title: "LỢI ÍCH KHI HỢP TÁC CÙNG SMARTFURNI",
      subtitle: "TẠI SAO CHỌN CHÚNG TÔI",
      imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80",
      bgColor: "#ffffff",
      textColor: "#1a1a1a",
      badge: "",
      content: "📈 TỐI ƯU CHI PHÍ\nMức chiết khấu B2B hấp dẫn cùng các sản phẩm đa năng giúp chủ đầu tư tiết kiệm tối đa diện tích không gian và chi phí đầu tư nội thất ban đầu.\n\n💎 NÂNG TẦM GIÁ TRỊ\nThiết kế sang trọng, vật liệu cao cấp và công nghệ hiện đại giúp nâng tầm đẳng cấp dự án, mang lại trải nghiệm vượt trội cho khách hàng cuối.\n\n🤝 GIẢI PHÁP TOÀN DIỆN\nĐồng hành cùng đối tác từ khâu tư vấn thiết kế, cung cấp sản phẩm đến thi công lắp đặt và dịch vụ bảo hành, bảo trì chuyên nghiệp trọn đời.",
    },

    // ── P19: LIÊN HỆ ────────────────────────────────────────────────────────
    {
      type: "content",
      title: "BẮT ĐẦU DỰ ÁN CỦA BẠN",
      subtitle: "LIÊN HỆ VỚI CHÚNG TÔI",
      imageUrl: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1200&q=80",
      bgColor: "#f8f5f0",
      textColor: "#1a1a1a",
      badge: "",
      content: "📞 HOTLINE B2B (24/7)\n0287 122 0818\n\n🌐 WEBSITE & EMAIL\nwww.smartfurni.vn\nb2b@smartfurni.vn\n\n📍 SHOWROOM HỒ CHÍ MINH\n74 Nguyễn Thị Nhung, KĐT Vạn Phúc City\nP. Hiệp Bình Phước, TP. Thủ Đức, TP. HCM\n\n📍 SHOWROOM HÀ NỘI\nB46 - căn 29, KĐT Geleximco B, Lê Trọng Tấn\nP. Dương Nội, Q. Hà Đông, TP. Hà Nội",
    },

    // ── P20: BÌA SAU ────────────────────────────────────────────────────────
    {
      type: "back-cover",
      title: "CHÂN THÀNH CẢM ƠN",
      subtitle: "SMARTFURNI",
      imageUrl: "",
      bgColor: "#0d0d0d",
      textColor: "#C9A84C",
      badge: "",
      content: "Rất hân hạnh được đồng hành cùng sự phát triển\nvà thành công của Quý Đối Tác.\n\nwww.smartfurni.vn",
    },
  ],
};

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🚀 Bắt đầu seed catalogue SmartFurni B2B 2025 (nội dung thực tế từ PDF)...\n");
  await ensureTables();

  const existing = await query("SELECT COUNT(*) FROM catalogues");
  const count = parseInt(existing.rows[0].count);
  if (count > 0 && !process.argv.includes("--force")) {
    console.log(`⚠️  Đã có ${count} catalogue. Thêm --force để tạo lại.`);
    await pool.end();
    return;
  }

  if (count > 0) {
    await clearAll();
  }

  const id = await createCatalogue(catalogue);

  console.log("\n🎉 Seed hoàn thành!");
  console.log(`   Catalogue ID: ${id}`);
  console.log(`   URL: /catalogue/${id}`);
  await pool.end();
}

main().catch((e) => {
  console.error("❌ Lỗi:", e.message);
  process.exit(1);
});
