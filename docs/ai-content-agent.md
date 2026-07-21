# AI Content Agent SmartFurni

## Mục tiêu

AI Content Agent hỗ trợ đội ngũ lập kế hoạch và tạo bản nháp theo hành trình TOFU–MOFU–BOFU. Hệ thống không tự xuất bản bài viết.

## Luồng vận hành

1. Vào **Quản trị website → AI Content Agent**.
2. Chọn dòng sản phẩm, mục tiêu, khách hàng mục tiêu, số tuần và số bài mỗi tuần.
3. AI tạo chiến lược và các brief theo tỷ lệ mục tiêu: 50% TOFU, 30% MOFU, 20% BOFU.
4. Quản trị viên duyệt từng brief hoặc duyệt hàng loạt.
5. Chỉ brief đã duyệt mới có thể tạo bản nháp.
6. AI tạo nội dung, meta SEO, từ khóa, liên kết nội bộ, nguồn và báo cáo QA.
7. Biên tập viên mở bài trong CMS, kiểm tra nội dung và claim.
8. Bản nháp AI chỉ được đăng hoặc lên lịch sau khi claim được duyệt. Nội dung sức khỏe phải có người kiểm duyệt khi hệ thống yêu cầu.

## Trạng thái

- `idea`: brief mới, chưa duyệt.
- `approved`: brief đã được admin duyệt.
- `drafted`: AI đã tạo bài nháp trong CMS.
- `review`: đang biên tập.
- `ready`: sẵn sàng xuất bản.
- `published`: đã xuất bản.

## Cấu hình môi trường

- `GEMINI_API_KEY`: bắt buộc để tạo kế hoạch và bài nháp.
- `GEMINI_MODEL`: không bắt buộc, mặc định `gemini-2.5-flash`.
- `DATABASE_URL`: dùng để lưu kế hoạch vào bảng `content_agent_plans` và bài viết vào bảng `posts`.

## Hàng rào an toàn

- Không tự bịa số liệu, nghiên cứu, chuyên gia, giá, bảo hành hoặc đánh giá khách hàng.
- Không dùng claim chữa bệnh, điều trị, phòng bệnh hoặc cam kết tuyệt đối.
- Dữ liệu chưa được SmartFurni xác nhận phải được đánh dấu để biên tập viên bổ sung.
- Nội dung sức khỏe cần nguồn và người có chuyên môn duyệt.
- Mỗi bài được kiểm tra độ dài, heading, từ khóa, liên kết nội bộ, meta SEO và các mẫu claim rủi ro.

## Kiểm tra

Chạy bài kiểm tra riêng của Content Agent:

```bash
npx vitest run src/__tests__/content-agent.test.ts
```
