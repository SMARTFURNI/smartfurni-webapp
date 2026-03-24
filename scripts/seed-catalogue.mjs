/**
 * Script seed catalogue mẫu cho SmartFurni B2B
 * Chạy: DATABASE_URL=... node scripts/seed-catalogue.mjs
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

async function createCatalogue(data) {
  const id = randomUUID();
  await query(
    `INSERT INTO catalogues (id, title, description, cover_image_url, status)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, data.title, data.description || "", data.coverImageUrl || "", data.status || "draft"]
  );
  return id;
}

async function addPage(catalogueId, data, pageNumber) {
  const id = randomUUID();
  await query(
    `INSERT INTO catalogue_pages
       (id, catalogue_id, page_number, type, title, subtitle, image_url, bg_color, text_color, content, badge)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      id, catalogueId, pageNumber,
      data.type || "content",
      data.title || "",
      data.subtitle || "",
      data.imageUrl || "",
      data.bgColor || "#1a1a1a",
      data.textColor || "#ffffff",
      data.content || "",
      data.badge || "",
    ]
  );
  await query(
    `UPDATE catalogues SET page_count = page_count + 1, updated_at = NOW() WHERE id = $1`,
    [catalogueId]
  );
  return id;
}

async function publish(id) {
  await query(`UPDATE catalogues SET status = 'published', updated_at = NOW() WHERE id = $1`, [id]);
}

async function main() {
  console.log("🚀 Bắt đầu seed catalogue mẫu...");
  await ensureTables();

  // Kiểm tra đã có catalogue chưa
  const existing = await query("SELECT COUNT(*) FROM catalogues");
  const count = parseInt(existing.rows[0].count);
  if (count > 0) {
    console.log(`⚠️  Đã có ${count} catalogue. Dùng --force để tạo lại.`);
    if (!process.argv.includes("--force")) {
      await pool.end();
      return;
    }
  }

  // ── Catalogue 1: SmartFurni B2B Catalogue 2025 ─────────────────────────────
  console.log("\n📋 Tạo catalogue 1: SmartFurni B2B Catalogue 2025...");
  const cat1 = await createCatalogue({
    title: "SmartFurni B2B Catalogue 2025",
    description: "Bộ sưu tập giường công thái học cao cấp dành cho đối tác B2B. Bảng giá, thông số kỹ thuật và chính sách phân phối.",
    coverImageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80",
  });

  const pages1 = [
    {
      type: "cover",
      title: "SMARTFURNI",
      subtitle: "B2B Product Catalogue 2025",
      imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200&q=85",
      bgColor: "#080600",
      textColor: "#C9A84C",
      content: "",
      badge: "2025",
    },
    {
      type: "content",
      title: "Về SmartFurni",
      subtitle: "Công nghệ giấc ngủ thông minh",
      imageUrl: "",
      bgColor: "#0d0b00",
      textColor: "#ffffff",
      content: "SmartFurni là thương hiệu nội thất công nghệ hàng đầu Việt Nam, chuyên sản xuất giường công thái học tích hợp công nghệ điều chỉnh tư thế thông minh.\n\nVới hơn 10 năm kinh nghiệm, chúng tôi cung cấp giải pháp toàn diện cho đối tác B2B: khách sạn 5 sao, resort cao cấp, bệnh viện và khu đô thị.\n\nMỗi sản phẩm được thiết kế theo tiêu chuẩn công thái học quốc tế, kết hợp vật liệu cao cấp và công nghệ điều khiển thông minh qua ứng dụng di động.",
      badge: "",
    },
    {
      type: "product",
      title: "SmartFurni Pro Max",
      subtitle: "Flagship · Công nghệ đỉnh cao",
      imageUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=85",
      bgColor: "#0a0a0a",
      textColor: "#ffffff",
      content: "✦ Điều chỉnh 9 vùng độc lập\n✦ Massage nhiệt 18 chế độ\n✦ Theo dõi giấc ngủ AI\n✦ Kết nối app + giọng nói\n✦ Chống ồn Zero-Noise™\n✦ Bảo hành 10 năm",
      badge: "FLAGSHIP",
    },
    {
      type: "product",
      title: "SmartFurni Pro",
      subtitle: "Best Seller · Cân bằng hoàn hảo",
      imageUrl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=85",
      bgColor: "#111",
      textColor: "#ffffff",
      content: "✦ Điều chỉnh 7 vùng độc lập\n✦ Massage 12 chế độ\n✦ Cảm biến áp lực thông minh\n✦ Kết nối app SmartFurni\n✦ Khung thép không gỉ 304\n✦ Bảo hành 7 năm",
      badge: "BEST SELLER",
    },
    {
      type: "product",
      title: "SmartFurni Lite",
      subtitle: "Tiêu chuẩn · Tối ưu chi phí",
      imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&q=85",
      bgColor: "#0d1117",
      textColor: "#ffffff",
      content: "✦ Điều chỉnh 3 vùng cơ bản\n✦ Massage 6 chế độ\n✦ Điều khiển từ xa\n✦ Thiết kế tối giản\n✦ Phù hợp khách sạn 3-4 sao\n✦ Bảo hành 5 năm",
      badge: "PHỔ BIẾN",
    },
    {
      type: "product",
      title: "SmartFurni Kids",
      subtitle: "Dòng trẻ em · An toàn tuyệt đối",
      imageUrl: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=1200&q=85",
      bgColor: "#0a1a0a",
      textColor: "#ffffff",
      content: "✦ Thiết kế an toàn cho trẻ 3-15 tuổi\n✦ Điều chỉnh chiều cao tự động\n✦ Cạnh bo tròn, không góc sắc\n✦ Chất liệu không độc hại\n✦ Chế độ ngủ thông minh\n✦ Bảo hành 5 năm",
      badge: "MỚI",
    },
    {
      type: "content",
      title: "Thông Số Kỹ Thuật",
      subtitle: "Tiêu chuẩn chất lượng quốc tế",
      imageUrl: "",
      bgColor: "#0a0800",
      textColor: "#ffffff",
      content: "PRO MAX\nKích thước: 200×180cm | 200×160cm\nTải trọng: 300kg\nĐộng cơ: 4 motor DC không chổi than\nCông suất: 150W\n\nPRO\nKích thước: 200×160cm | 200×140cm\nTải trọng: 250kg\nĐộng cơ: 2 motor DC\nCông suất: 100W\n\nLITE\nKích thước: 200×160cm | 200×120cm\nTải trọng: 200kg\nĐộng cơ: 1 motor DC\nCông suất: 60W",
      badge: "SPECS",
    },
    {
      type: "content",
      title: "Bảng Giá B2B",
      subtitle: "Chính sách đại lý & phân phối 2025",
      imageUrl: "",
      bgColor: "#1a0a00",
      textColor: "#ffffff",
      content: "SmartFurni Pro Max\nGiá lẻ: 68.000.000đ\nĐại lý cấp 1: Liên hệ\n\nSmartFurni Pro\nGiá lẻ: 45.000.000đ\nĐại lý cấp 1: Liên hệ\n\nSmartFurni Lite\nGiá lẻ: 28.000.000đ\nĐại lý cấp 1: Liên hệ\n\nSmartFurni Kids\nGiá lẻ: 22.000.000đ\nĐại lý cấp 1: Liên hệ\n\nChiết khấu: 15–30% theo số lượng\nThanh toán: 30% đặt cọc, 70% khi giao",
      badge: "B2B",
    },
    {
      type: "content",
      title: "Chính Sách Đại Lý",
      subtitle: "Quyền lợi & điều kiện hợp tác",
      imageUrl: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&q=85",
      bgColor: "#0d0d0d",
      textColor: "#ffffff",
      content: "ĐẠI LÝ CẤP 1\n✦ Chiết khấu 25-30%\n✦ Hỗ trợ trưng bày showroom\n✦ Đào tạo kỹ thuật miễn phí\n✦ Ưu tiên hàng mới\n\nĐẠI LÝ CẤP 2\n✦ Chiết khấu 15-20%\n✦ Hỗ trợ marketing\n✦ Bảo hành tại chỗ",
      badge: "ĐỐI TÁC",
    },
    {
      type: "back-cover",
      title: "Liên hệ đặt hàng B2B",
      subtitle: "",
      imageUrl: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=85",
      bgColor: "#080600",
      textColor: "#C9A84C",
      content: "Hotline B2B: 1800-SMART (miễn phí)\nEmail: b2b@smartfurni.vn\nZalo OA: SmartFurni Official\nWebsite: smartfurni.vn/catalogue\n\nVăn phòng: 123 Nguyễn Huệ, Q.1, TP.HCM\nShowroom: 456 Lê Văn Lương, Hà Nội",
      badge: "",
    },
  ];

  for (let i = 0; i < pages1.length; i++) {
    await addPage(cat1, pages1[i], i + 1);
    process.stdout.write(`  Trang ${i + 1}/${pages1.length} ✓\r`);
  }
  await publish(cat1);
  console.log(`\n✅ Catalogue 1 (${pages1.length} trang): ${cat1}`);

  // ── Catalogue 2: Hospitality ────────────────────────────────────────────────
  console.log("\n📋 Tạo catalogue 2: SmartFurni Hospitality 2025...");
  const cat2 = await createCatalogue({
    title: "SmartFurni Hospitality 2025",
    description: "Giải pháp nội thất thông minh chuyên biệt cho khách sạn 4-5 sao, resort cao cấp và khu nghỉ dưỡng.",
    coverImageUrl: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&q=80",
  });

  const pages2 = [
    {
      type: "cover",
      title: "HOSPITALITY",
      subtitle: "Giải pháp cho khách sạn & resort",
      imageUrl: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=1200&q=85",
      bgColor: "#0a0a14",
      textColor: "#E2C97E",
      content: "",
      badge: "HOTEL",
    },
    {
      type: "content",
      title: "SmartFurni Hospitality",
      subtitle: "Nâng tầm trải nghiệm lưu trú",
      imageUrl: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1200&q=85",
      bgColor: "#0a0a14",
      textColor: "#ffffff",
      content: "Dòng sản phẩm SmartFurni Hospitality được thiết kế đặc biệt cho ngành khách sạn, với độ bền vượt trội, dễ vệ sinh và tích hợp hệ thống quản lý phòng thông minh.\n\nĐã được lắp đặt tại hơn 200 khách sạn và resort trên toàn quốc.",
      badge: "",
    },
    {
      type: "product",
      title: "Hotel Pro Suite",
      subtitle: "Dành cho phòng Suite & Deluxe",
      imageUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=85",
      bgColor: "#0d0d1a",
      textColor: "#ffffff",
      content: "✦ Điều chỉnh 5 vùng\n✦ Tích hợp PMS khách sạn\n✦ Chế độ Turn-down tự động\n✦ Vải bọc kháng khuẩn\n✦ Bảo trì định kỳ miễn phí\n✦ Bảo hành 7 năm",
      badge: "5 SAO",
    },
    {
      type: "product",
      title: "Hotel Standard",
      subtitle: "Dành cho phòng Standard & Superior",
      imageUrl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=85",
      bgColor: "#111",
      textColor: "#ffffff",
      content: "✦ Điều chỉnh 3 vùng\n✦ Điều khiển từ xa\n✦ Vải bọc chống thấm\n✦ Lắp đặt nhanh 2 giờ\n✦ Phụ tùng thay thế sẵn có\n✦ Bảo hành 5 năm",
      badge: "3-4 SAO",
    },
    {
      type: "content",
      title: "Gói Dịch Vụ Trọn Gói",
      subtitle: "Từ tư vấn đến lắp đặt & bảo trì",
      imageUrl: "",
      bgColor: "#0a0a14",
      textColor: "#ffffff",
      content: "GÓI PLATINUM\n✦ Tư vấn thiết kế miễn phí\n✦ Lắp đặt chuyên nghiệp\n✦ Bảo trì 4 lần/năm\n✦ Hotline 24/7\n\nGÓI GOLD\n✦ Lắp đặt chuyên nghiệp\n✦ Bảo trì 2 lần/năm\n✦ Hotline giờ hành chính",
      badge: "SERVICE",
    },
    {
      type: "back-cover",
      title: "Tư vấn giải pháp khách sạn",
      subtitle: "",
      imageUrl: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&q=85",
      bgColor: "#0a0a14",
      textColor: "#E2C97E",
      content: "Chuyên gia tư vấn: 1800-HOTEL\nEmail: hotel@smartfurni.vn\nDự án đặc biệt: project@smartfurni.vn",
      badge: "",
    },
  ];

  for (let i = 0; i < pages2.length; i++) {
    await addPage(cat2, pages2[i], i + 1);
    process.stdout.write(`  Trang ${i + 1}/${pages2.length} ✓\r`);
  }
  await publish(cat2);
  console.log(`\n✅ Catalogue 2 (${pages2.length} trang): ${cat2}`);

  console.log("\n🎉 Seed hoàn thành!");
  console.log(`   Catalogue 1 ID: ${cat1}`);
  console.log(`   Catalogue 2 ID: ${cat2}`);

  await pool.end();
}

main().catch(err => {
  console.error("❌ Lỗi:", err);
  process.exit(1);
});
