export type BlogCategory = "tips-giac-ngu" | "huong-dan-su-dung" | "cap-nhat-san-pham" | "suc-khoe";

export type PostStatus = "draft" | "published" | "scheduled";

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: BlogCategory;
  categoryLabel: string;
  author: string;
  authorRole: string;
  publishedAt: string;
  readTime: number; // minutes
  tags: string[];
  featured?: boolean;
  status?: PostStatus; // draft | published | scheduled (default: published)
  scheduledAt?: string; // ISO date string for scheduled posts
  coverImage?: string; // URL of cover image
}

export const CATEGORIES: Record<BlogCategory, { label: string; color: string }> = {
  "tips-giac-ngu": { label: "Tips Giấc Ngủ", color: "#4ADE80" },
  "huong-dan-su-dung": { label: "Hướng Dẫn Sử Dụng", color: "#60A5FA" },
  "cap-nhat-san-pham": { label: "Cập Nhật Sản Phẩm", color: "#C9A84C" },
  "suc-khoe": { label: "Sức Khỏe", color: "#F472B6" },
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "5-tu-the-ngu-tot-nhat-cho-suc-khoe-cot-song",
    title: "5 Tư Thế Ngủ Tốt Nhất Cho Sức Khỏe Cột Sống",
    excerpt: "Tư thế ngủ ảnh hưởng trực tiếp đến sức khỏe cột sống, chất lượng giấc ngủ và cả tâm trạng buổi sáng. Khám phá 5 tư thế được các chuyên gia khuyến nghị.",
    category: "tips-giac-ngu",
    categoryLabel: "Tips Giấc Ngủ",
    author: "BS. Nguyễn Thị Lan",
    authorRole: "Chuyên gia Cột Sống",
    publishedAt: "2026-03-01",
    readTime: 6,
    tags: ["tư thế ngủ", "cột sống", "sức khỏe", "giấc ngủ sâu"],
    featured: true,
    content: `## Tại sao tư thế ngủ quan trọng?

Chúng ta dành khoảng **1/3 cuộc đời** để ngủ. Tư thế ngủ không đúng có thể gây ra đau lưng, đau cổ, ngáy ngủ và thậm chí ảnh hưởng đến hệ tiêu hóa.

Với giường điều chỉnh SmartFurni, bạn có thể dễ dàng tìm được tư thế lý tưởng cho từng người.

## 1. Nằm ngửa với đầu nâng nhẹ (Góc 15–20°)

Đây là tư thế được nhiều chuyên gia cột sống khuyến nghị nhất. Khi nằm ngửa:

- Cột sống được giữ thẳng tự nhiên
- Giảm áp lực lên đĩa đệm
- Giảm nguy cơ trào ngược dạ dày

**Cài đặt SmartFurni:** Preset "Đọc sách" — đầu 20°, chân 0°

## 2. Tư thế Zero Gravity (Đầu 30°, Chân 15°)

Tư thế này mô phỏng trạng thái không trọng lực của phi hành gia NASA:

- Giảm áp lực lên cột sống lên đến **75%**
- Cải thiện tuần hoàn máu
- Giảm ngáy và chứng ngưng thở khi ngủ

**Cài đặp SmartFurni:** Preset "Zero Gravity" tích hợp sẵn

## 3. Nằm nghiêng bên trái

Nằm nghiêng trái đặc biệt tốt cho:

- Người bị trào ngược dạ dày
- Phụ nữ mang thai
- Người có vấn đề về tim mạch

## 4. Tư thế nửa ngồi (Đầu 45°)

Phù hợp cho người bị:

- Hội chứng ngưng thở khi ngủ (Sleep Apnea)
- Viêm xoang, nghẹt mũi
- Trào ngược dạ dày nặng

**Cài đặt SmartFurni:** Preset "Ngồi dậy" — đầu 45°

## 5. Tư thế chân nâng (Chân 15–20°)

Nâng nhẹ phần chân giúp:

- Giảm phù nề chân sau ngày dài đứng
- Cải thiện tuần hoàn máu về tim
- Giảm đau cơ bắp chân

**Cài đặt SmartFurni:** Chỉnh chân lên 15–20° trong phần Điều Khiển

## Kết luận

Không có một tư thế ngủ "hoàn hảo" cho tất cả mọi người. Hãy thử nghiệm và lắng nghe cơ thể. Với SmartFurni, bạn có thể lưu tư thế yêu thích và áp dụng ngay mỗi tối chỉ bằng một chạm.`,
  },
  {
    slug: "huong-dan-ket-noi-smartfurni-lan-dau",
    title: "Hướng Dẫn Kết Nối SmartFurni Lần Đầu Trong 5 Phút",
    excerpt: "Mới nhận giường SmartFurni? Hướng dẫn từng bước để kết nối Bluetooth và thiết lập app trong vòng 5 phút.",
    category: "huong-dan-su-dung",
    categoryLabel: "Hướng Dẫn Sử Dụng",
    author: "Đội Kỹ Thuật SmartFurni",
    authorRole: "Support Team",
    publishedAt: "2026-02-25",
    readTime: 4,
    tags: ["kết nối bluetooth", "hướng dẫn", "cài đặt lần đầu"],
    featured: true,
    content: `## Chuẩn bị

Trước khi bắt đầu, hãy đảm bảo:

- ✅ Giường đã được lắp đặt hoàn chỉnh và cắm điện
- ✅ Đèn LED trên hộp điều khiển sáng xanh
- ✅ Điện thoại bật Bluetooth
- ✅ Đã tải app SmartFurni từ App Store hoặc Google Play

## Bước 1 — Bật chế độ ghép đôi

Nhấn giữ nút nguồn trên hộp điều khiển **3 giây** cho đến khi đèn LED nhấp nháy xanh nhanh. Đây là dấu hiệu giường đang chờ kết nối.

## Bước 2 — Mở app và tìm kiếm

1. Mở app SmartFurni
2. Nhấn **"Kết nối giường"** trên màn hình chính
3. App tự động quét thiết bị Bluetooth gần đó
4. Chọn **"SmartFurni-XXXX"** (4 số cuối là số serial của giường bạn)

## Bước 3 — Xác nhận kết nối

Nhấn **"Kết nối"** → đèn LED chuyển sang xanh liên tục = kết nối thành công!

## Bước 4 — Thiết lập ban đầu

App sẽ hướng dẫn bạn:

1. **Đặt tên giường** — ví dụ "Phòng ngủ chính"
2. **Hiệu chỉnh góc** — đảm bảo 0° là vị trí phẳng hoàn toàn
3. **Thử preset đầu tiên** — nhấn "Zero Gravity" để trải nghiệm

## Xử lý sự cố thường gặp

| Vấn đề | Giải pháp |
|--------|-----------|
| Không tìm thấy thiết bị | Tắt/bật Bluetooth, đứng gần giường hơn (<3m) |
| Kết nối bị ngắt | Kiểm tra nguồn điện giường, khởi động lại app |
| Đèn LED đỏ | Lỗi motor — liên hệ hotline 1800 1234 56 |

## Kết nối thành công rồi, giờ làm gì?

Thử ngay **5 preset có sẵn**: Phẳng, Zero Gravity, Đọc sách, Xem TV, Ngồi dậy. Sau đó lưu tư thế yêu thích của bạn vào mục "Chế Độ Yêu Thích".`,
  },
  {
    slug: "smartfurni-pro-ra-mat-tinh-nang-moi-2026",
    title: "SmartFurni Pro 2026: Điều Khiển Giọng Nói Tiếng Việt & Theo Dõi Giấc Ngủ AI",
    excerpt: "Phiên bản SmartFurni Pro mới nhất tích hợp nhận dạng giọng nói tiếng Việt và AI phân tích giấc ngủ — nâng tầm trải nghiệm ngủ thông minh.",
    category: "cap-nhat-san-pham",
    categoryLabel: "Cập Nhật Sản Phẩm",
    author: "Trần Thị Lan Anh",
    authorRole: "CTO SmartFurni",
    publishedAt: "2026-02-20",
    readTime: 5,
    tags: ["smartfurni pro", "giọng nói", "AI", "cập nhật"],
    featured: true,
    content: `## SmartFurni Pro 2026 — Bước tiến lớn nhất từ trước đến nay

Sau 18 tháng nghiên cứu và phát triển, chúng tôi tự hào giới thiệu **SmartFurni Pro 2026** với hai tính năng đột phá.

## Điều Khiển Giọng Nói Tiếng Việt

Lần đầu tiên tại Việt Nam, một chiếc giường thông minh có thể hiểu và phản hồi bằng tiếng Việt tự nhiên:

- *"Nâng đầu lên 30 độ"*
- *"Bật chế độ Zero Gravity"*
- *"Tắt đèn LED"*
- *"Hẹn giờ tắt sau 30 phút"*

Hệ thống nhận dạng giọng nói được tối ưu cho **giọng Bắc, Nam và Trung** với độ chính xác >95%.

## AI Phân Tích Giấc Ngủ

SmartFurni Pro tích hợp cảm biến áp suất thông minh theo dõi:

- **Chu kỳ giấc ngủ** — REM, ngủ sâu, ngủ nhẹ
- **Nhịp thở** — phát hiện sớm chứng ngưng thở
- **Chuyển động** — đánh giá chất lượng giấc ngủ
- **Điểm Sleep Score** — từ 0–100 mỗi sáng

AI sẽ tự động điều chỉnh góc giường để tối ưu hóa từng giai đoạn giấc ngủ.

## Các Cải Tiến Khác

- Motor thế hệ mới — êm hơn 40%, nhanh hơn 25%
- Pin dự phòng 4 giờ khi mất điện
- Kết nối WiFi 6 song song với Bluetooth 5.2
- Tương thích Apple HomeKit và Google Home

## Giá và Thời Gian Ra Mắt

SmartFurni Pro 2026 sẽ có mặt tại các showroom từ **01/04/2026**. Đặt trước ngay để nhận ưu đãi 15% và quà tặng trị giá 2 triệu đồng.`,
  },
  {
    slug: "nguyen-nhan-mat-ngu-va-cach-khac-phuc",
    title: "7 Nguyên Nhân Mất Ngủ Phổ Biến Và Cách Khắc Phục Tại Nhà",
    excerpt: "Mất ngủ ảnh hưởng đến 40% người Việt Nam. Tìm hiểu nguyên nhân và giải pháp đơn giản bạn có thể áp dụng ngay tối nay.",
    category: "suc-khoe",
    categoryLabel: "Sức Khỏe",
    author: "ThS. Lê Văn Minh",
    authorRole: "Chuyên gia Tâm lý Giấc ngủ",
    publishedAt: "2026-02-15",
    readTime: 8,
    tags: ["mất ngủ", "sức khỏe", "tips", "giải pháp"],
    content: `## Mất ngủ — Vấn đề của thời đại

Theo nghiên cứu của Viện Sức Khỏe Tâm Thần Quốc Gia, **40% người Việt Nam** gặp vấn đề về giấc ngủ ít nhất một lần mỗi tuần. Con số này tăng đáng kể sau đại dịch COVID-19.

## 1. Ánh sáng xanh từ màn hình điện thoại

Ánh sáng xanh ức chế sản xuất melatonin — hormone điều tiết giấc ngủ.

**Giải pháp:** Tắt màn hình 1 giờ trước khi ngủ. Bật chế độ Night Shift/Eye Comfort trên điện thoại.

## 2. Nhiệt độ phòng không phù hợp

Nhiệt độ lý tưởng để ngủ là **18–22°C**. Phòng quá nóng hoặc quá lạnh đều ảnh hưởng đến chất lượng giấc ngủ.

## 3. Tư thế ngủ sai

Tư thế không phù hợp gây đau lưng, đau cổ và thức giấc nhiều lần.

**Giải pháp SmartFurni:** Thử preset Zero Gravity — giảm áp lực cột sống, cải thiện tuần hoàn máu.

## 4. Caffeine buổi chiều tối

Caffeine có thể tồn tại trong cơ thể **6–8 giờ**. Cà phê uống lúc 3 giờ chiều vẫn ảnh hưởng đến giấc ngủ lúc 11 giờ đêm.

## 5. Căng thẳng và lo lắng

Cortisol — hormone stress — giữ não trong trạng thái tỉnh táo.

**Giải pháp:** Viết nhật ký 5 phút trước khi ngủ, liệt kê những việc đã hoàn thành và kế hoạch ngày mai.

## 6. Giờ ngủ không cố định

Cơ thể hoạt động theo đồng hồ sinh học. Ngủ và thức dậy không đúng giờ làm rối loạn nhịp sinh học.

## 7. Môi trường ngủ không tối ưu

Tiếng ồn, ánh sáng và mùi lạ đều ảnh hưởng đến chất lượng giấc ngủ.

**Giải pháp:** Dùng rèm cản sáng, máy tạo tiếng ồn trắng (white noise) và đảm bảo phòng ngủ chỉ dùng để ngủ.

## Kết luận

Cải thiện giấc ngủ là một quá trình. Hãy thay đổi từng thói quen nhỏ và kiên trì trong 21 ngày để thấy sự khác biệt.`,
  },
  {
    slug: "cach-su-dung-tinh-nang-hen-gio-thong-minh",
    title: "Cách Sử Dụng Tính Năng Hẹn Giờ Thông Minh Để Thức Dậy Nhẹ Nhàng",
    excerpt: "Thay vì bị đánh thức đột ngột bởi chuông báo thức, hãy để SmartFurni nhẹ nhàng nâng đầu giường để bạn tỉnh giấc tự nhiên.",
    category: "huong-dan-su-dung",
    categoryLabel: "Hướng Dẫn Sử Dụng",
    author: "Đội Kỹ Thuật SmartFurni",
    authorRole: "Support Team",
    publishedAt: "2026-02-10",
    readTime: 3,
    tags: ["hẹn giờ", "báo thức", "hướng dẫn", "thức dậy"],
    content: `## Thức dậy thông minh với SmartFurni

Nghiên cứu cho thấy cách bạn thức dậy ảnh hưởng đến **tâm trạng cả ngày**. Thức dậy đột ngột bởi tiếng chuông to gây stress ngay từ đầu ngày.

SmartFurni cho phép bạn thiết lập lịch tự động nâng đầu giường từ từ — giúp cơ thể chuyển từ trạng thái ngủ sang thức một cách tự nhiên.

## Thiết lập hẹn giờ thức dậy

1. Mở app SmartFurni → tab **Hẹn Giờ**
2. Nhấn **"+ Thêm lịch trình"**
3. Chọn giờ thức dậy (ví dụ: 6:30 sáng)
4. Chọn hành động: **"Nâng đầu lên 30°"**
5. Chọn ngày lặp lại (Thứ 2 – Thứ 6)
6. Bật **"Chế độ từ từ"** — giường nâng dần trong 10 phút

## Kết hợp với đèn LED

Để trải nghiệm tốt hơn, kết hợp hẹn giờ giường với đèn LED:

- **6:20** — Đèn LED bật với độ sáng 10%, màu vàng ấm
- **6:25** — Đầu giường bắt đầu nâng từ 0° lên 30°
- **6:30** — Đèn LED tăng lên 50%, giường đạt 30°

## Mẹo tối ưu

- Đặt thời gian nâng **10–15 phút trước** giờ bạn cần thức dậy
- Kết hợp với nhạc nhẹ qua loa Bluetooth
- Góc 20–30° là lý tưởng — đủ để cơ thể nhận biết cần thức dậy nhưng không quá đột ngột`,
  },
  {
    slug: "zero-gravity-la-gi-loi-ich-suc-khoe",
    title: "Zero Gravity Là Gì? Lợi Ích Sức Khỏe Bạn Chưa Biết",
    excerpt: "Tư thế Zero Gravity được NASA phát triển cho phi hành gia. Khám phá tại sao đây là tư thế ngủ tốt nhất cho cột sống và tim mạch.",
    category: "suc-khoe",
    categoryLabel: "Sức Khỏe",
    author: "BS. Nguyễn Thị Lan",
    authorRole: "Chuyên gia Cột Sống",
    publishedAt: "2026-02-05",
    readTime: 5,
    tags: ["zero gravity", "cột sống", "tim mạch", "NASA"],
    content: `## Nguồn gốc của tư thế Zero Gravity

Tư thế Zero Gravity (không trọng lực) được các kỹ sư NASA phát triển vào những năm 1960 để giảm thiểu áp lực lên cơ thể phi hành gia trong quá trình phóng tên lửa.

Khi cơ thể ở tư thế này — **đầu và chân nâng cao hơn tim** — trọng lực được phân bổ đều nhất lên toàn bộ cột sống.

## Lợi ích khoa học đã được chứng minh

### 1. Giảm áp lực cột sống 75%

Nghiên cứu tại Đại học Vanderbilt (Mỹ) cho thấy tư thế Zero Gravity giảm áp lực lên đĩa đệm cột sống lên đến **75%** so với nằm phẳng.

### 2. Cải thiện tuần hoàn máu

Khi chân nâng cao hơn tim, máu từ chân trở về tim dễ dàng hơn, giảm phù nề và cải thiện tuần hoàn.

### 3. Giảm ngáy và ngưng thở khi ngủ

Đầu nâng 30° giúp đường thở thông thoáng hơn, giảm ngáy đến **50%** theo nghiên cứu của Sleep Foundation.

### 4. Giảm trào ngược dạ dày

Đầu cao hơn dạ dày ngăn acid trào ngược lên thực quản — đặc biệt hữu ích sau bữa tối.

## Cài đặt Zero Gravity trên SmartFurni

**Đầu:** 30–35° | **Chân:** 15–20°

Nhấn preset **"Zero Gravity"** trên trang chủ app để áp dụng ngay.

## Ai nên dùng tư thế Zero Gravity?

- Người bị đau lưng mãn tính
- Người bị ngáy hoặc ngưng thở khi ngủ
- Người bị trào ngược dạ dày
- Người cao tuổi
- Người làm việc văn phòng nhiều giờ`,
  },
  {
    slug: "bao-tri-giuong-thong-minh-hang-thang",
    title: "Checklist Bảo Trì Giường SmartFurni Hàng Tháng",
    excerpt: "Giữ giường SmartFurni hoạt động bền bỉ với checklist bảo trì đơn giản chỉ mất 10 phút mỗi tháng.",
    category: "huong-dan-su-dung",
    categoryLabel: "Hướng Dẫn Sử Dụng",
    author: "Đội Kỹ Thuật SmartFurni",
    authorRole: "Support Team",
    publishedAt: "2026-01-28",
    readTime: 4,
    tags: ["bảo trì", "hướng dẫn", "motor", "vệ sinh"],
    content: `## Tại sao cần bảo trì định kỳ?

Giường SmartFurni có tuổi thọ thiết kế **15 năm** với bảo trì đúng cách. Bảo trì định kỳ giúp:

- Motor hoạt động êm ái và bền lâu hơn
- Phát hiện sớm các vấn đề nhỏ trước khi thành lớn
- Duy trì bảo hành 5 năm (yêu cầu bảo trì định kỳ)

## Checklist Hàng Tháng (10 phút)

### Phần cơ học
- [ ] Kiểm tra tất cả bu lông và ốc vít — siết chặt nếu lỏng
- [ ] Nghe tiếng motor khi điều chỉnh — tiếng kêu lạ = cần kiểm tra
- [ ] Kiểm tra dây cáp không bị kẹt hoặc mài mòn
- [ ] Lau sạch bụi bẩn tại các khớp nối

### Phần điện tử
- [ ] Kiểm tra đèn LED hoạt động đều
- [ ] Cập nhật firmware qua app (nếu có thông báo)
- [ ] Kiểm tra kết nối Bluetooth ổn định
- [ ] Sạc pin dự phòng (nếu có)

### Phần app
- [ ] Cập nhật app lên phiên bản mới nhất
- [ ] Kiểm tra các lịch trình hẹn giờ còn hoạt động
- [ ] Xem lại lịch sử giấc ngủ 30 ngày qua

## Checklist Hàng Quý (30 phút)

- Bôi trơn các thanh trượt bằng dầu silicon (không dùng dầu WD-40)
- Kiểm tra khung giường không bị nứt hoặc biến dạng
- Vệ sinh hộp điều khiển bằng khăn khô

## Khi nào cần gọi kỹ thuật viên?

Liên hệ hotline **1800 1234 56** ngay khi:
- Motor phát ra tiếng kêu lạ hoặc rung mạnh
- Giường không phản hồi lệnh từ app
- Đèn LED trên hộp điều khiển sáng đỏ
- Giường di chuyển không đều hoặc bị kẹt`,
  },
  {
    slug: "tre-em-co-dung-giuong-dieu-chinh-duoc-khong",
    title: "Trẻ Em Có Dùng Được Giường Điều Chỉnh Không? Lưu Ý Quan Trọng",
    excerpt: "Nhiều phụ huynh thắc mắc về độ an toàn của giường điều chỉnh cho trẻ em. Bài viết này giải đáp chi tiết với khuyến nghị từ chuyên gia nhi khoa.",
    category: "suc-khoe",
    categoryLabel: "Sức Khỏe",
    author: "BS. Phạm Thị Hoa",
    authorRole: "Chuyên gia Nhi Khoa",
    publishedAt: "2026-01-20",
    readTime: 5,
    tags: ["trẻ em", "an toàn", "nhi khoa", "gia đình"],
    content: `## Giường điều chỉnh có an toàn cho trẻ em?

Câu trả lời ngắn gọn: **Có, nhưng cần tuân thủ một số nguyên tắc an toàn quan trọng.**

## Độ tuổi phù hợp

| Độ tuổi | Khuyến nghị |
|---------|-------------|
| 0–2 tuổi | **Không khuyến nghị** — trẻ sơ sinh cần nằm phẳng hoàn toàn |
| 2–6 tuổi | Chỉ dùng với sự giám sát của người lớn |
| 6–12 tuổi | Có thể dùng với góc điều chỉnh nhẹ (max 20°) |
| 12+ tuổi | Dùng như người lớn |

## Lợi ích cho trẻ lớn hơn

Trẻ từ 6 tuổi trở lên có thể hưởng lợi từ:

- Đầu nâng nhẹ khi bị cảm, nghẹt mũi
- Tư thế thoải mái khi đọc sách hoặc học bài trên giường
- Chân nâng nhẹ khi bị đau chân sau vận động

## Nguyên tắc an toàn bắt buộc

1. **Khóa điều khiển** khi trẻ nhỏ ở gần — SmartFurni có tính năng Child Lock trong Cài đặt
2. **Không để trẻ tự điều chỉnh** khi chưa được hướng dẫn
3. **Kiểm tra khe hở** — đảm bảo không có khe hở nguy hiểm khi giường di chuyển
4. **Góc tối đa** cho trẻ 6–12 tuổi: đầu 20°, chân 15°

## Tính năng Child Lock trên SmartFurni

Vào **Cài đặt → Bảo mật → Khóa Trẻ Em** để:
- Yêu cầu mã PIN trước khi điều chỉnh
- Giới hạn góc tối đa
- Tắt điều khiển giọng nói`,
  },
  {
    slug: "so-sanh-goi-smartfurni-basic-vs-pro",
    title: "So Sánh Chi Tiết SmartFurni Basic vs Pro: Nên Chọn Gói Nào?",
    excerpt: "Phân tích chi tiết sự khác biệt giữa hai dòng sản phẩm SmartFurni để giúp bạn đưa ra quyết định phù hợp với nhu cầu và ngân sách.",
    category: "cap-nhat-san-pham",
    categoryLabel: "Cập Nhật Sản Phẩm",
    author: "Nguyễn Minh Khoa",
    authorRole: "CEO SmartFurni",
    publishedAt: "2026-01-15",
    readTime: 6,
    tags: ["so sánh", "basic", "pro", "mua hàng"],
    content: `## Tổng quan hai dòng sản phẩm

SmartFurni hiện có hai dòng sản phẩm chính phục vụ các nhu cầu và ngân sách khác nhau.

## Bảng so sánh chi tiết

| Tính năng | Basic | Pro |
|-----------|-------|-----|
| Điều chỉnh đầu | ✅ 0–60° | ✅ 0–75° |
| Điều chỉnh chân | ✅ 0–40° | ✅ 0–50° |
| Motor | 1 motor | 2 motor độc lập |
| Kết nối | Bluetooth 5.0 | Bluetooth 5.2 + WiFi 6 |
| Điều khiển giọng nói | ❌ | ✅ Tiếng Việt |
| Theo dõi giấc ngủ | Cơ bản | AI nâng cao |
| Đèn LED | ✅ 16 triệu màu | ✅ 16 triệu màu + hiệu ứng |
| Massage | ✅ 3 vùng | ✅ 5 vùng |
| Pin dự phòng | ❌ | ✅ 4 giờ |
| Bảo hành | 3 năm | 5 năm |
| Giá | 25 triệu | 45 triệu |

## Nên chọn Basic nếu:

- Ngân sách dưới 30 triệu
- Chỉ cần điều chỉnh góc cơ bản
- Không cần điều khiển giọng nói
- Gia đình 1–2 người

## Nên chọn Pro nếu:

- Muốn trải nghiệm đầy đủ nhất
- Có vấn đề về giấc ngủ cần theo dõi chi tiết
- Muốn tích hợp với hệ sinh thái smart home
- Gia đình có người cao tuổi hoặc có vấn đề sức khỏe

## Chương trình trả góp 0%

Cả hai dòng đều hỗ trợ trả góp **0% lãi suất 24 tháng** qua các ngân hàng đối tác. Liên hệ showroom gần nhất để biết thêm chi tiết.`,
  },
  {
    slug: "10-thoi-quen-truoc-khi-ngu-cua-nguoi-thanh-cong",
    title: "10 Thói Quen Trước Khi Ngủ Của Người Thành Công",
    excerpt: "Từ Bill Gates đến Elon Musk, những người thành công đều có thói quen ngủ đặc biệt. Khám phá và áp dụng ngay tối nay.",
    category: "tips-giac-ngu",
    categoryLabel: "Tips Giấc Ngủ",
    author: "ThS. Lê Văn Minh",
    authorRole: "Chuyên gia Tâm lý Giấc ngủ",
    publishedAt: "2026-01-10",
    readTime: 7,
    tags: ["thói quen", "thành công", "buổi tối", "năng suất"],
    content: `## Tại sao thói quen buổi tối quan trọng?

Chất lượng giấc ngủ phụ thuộc nhiều vào những gì bạn làm **2 giờ trước khi ngủ**. Những người thành công hiểu điều này và xây dựng "wind-down routine" — thói quen thư giãn trước khi ngủ.

## 1. Đọc sách (không phải điện thoại)

Bill Gates đọc sách ít nhất 1 giờ mỗi tối. Đọc sách giấy giúp não chuyển sang chế độ thư giãn, khác với cuộn mạng xã hội gây kích thích.

## 2. Viết nhật ký 5 phút

Ghi lại 3 điều tốt đẹp trong ngày và 1 bài học. Thực hành này giảm lo lắng và cải thiện tâm trạng.

## 3. Thiết lập nhiệt độ phòng 20°C

Nhiệt độ cơ thể giảm tự nhiên khi ngủ. Phòng mát giúp quá trình này diễn ra nhanh hơn.

## 4. Tắt màn hình 1 giờ trước khi ngủ

Ánh sáng xanh ức chế melatonin — hormone giấc ngủ. Thay thế bằng đọc sách hoặc thiền.

## 5. Chuẩn bị cho ngày mai

Dành 10 phút viết danh sách việc cần làm ngày mai. Não sẽ không còn "nhắc nhở" bạn trong đêm nữa.

## 6. Tắm nước ấm

Tắm nước ấm 40°C trong 10–15 phút giúp nhiệt độ cơ thể giảm nhanh sau đó, tạo điều kiện ngủ sâu hơn.

## 7. Thiền hoặc thở sâu 5 phút

Kỹ thuật thở 4-7-8: hít vào 4 giây, giữ 7 giây, thở ra 8 giây. Lặp lại 4 lần để kích hoạt hệ thần kinh phó giao cảm.

## 8. Cài đặt giường về tư thế ngủ

Với SmartFurni, tạo một lịch trình tự động: 30 phút trước giờ ngủ, giường tự chuyển về tư thế Zero Gravity và đèn LED mờ dần.

## 9. Không ăn sau 8 giờ tối

Tiêu hóa hoạt động kém hiệu quả khi ngủ. Ăn muộn gây trào ngược và làm giảm chất lượng giấc ngủ.

## 10. Giờ ngủ cố định

Ngủ và thức dậy cùng một giờ mỗi ngày — kể cả cuối tuần. Đây là thói quen quan trọng nhất để có giấc ngủ chất lượng.

## Bắt đầu từ đâu?

Đừng cố áp dụng tất cả 10 thói quen cùng lúc. Chọn **1–2 thói quen** và duy trì trong 21 ngày trước khi thêm thói quen mới.`,
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getPostsByCategory(category: BlogCategory): BlogPost[] {
  return BLOG_POSTS.filter((p) => p.category === category);
}

export function getFeaturedPosts(): BlogPost[] {
  return BLOG_POSTS.filter((p) => p.featured);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "long", year: "numeric" });
}
