# AI hình ảnh bài viết SmartFurni

## Luồng quản trị

1. Admin hoàn thiện nội dung và lưu bài viết.
2. Tại khối **AI hình ảnh bài viết**, chọn **Tạo bộ brief ảnh**.
3. Hệ thống phân tích tiêu đề, tóm tắt, từ khóa, đề mục, độ dài bài và sản phẩm liên quan để lập kế hoạch:
   - 1 ảnh bìa tỷ lệ 16:9.
   - 2 ảnh nội dung tỷ lệ 3:2 theo mặc định.
   - 3 ảnh nội dung nếu bài dài hơn 1.500 từ hoặc có trên 4 đề mục.
4. Admin chỉnh prompt, alt và chú thích nếu cần, rồi tạo 2 phương án cho từng vị trí.
5. Admin chọn phương án phù hợp và duyệt. Ảnh duyệt được chuyển sang WebP, lưu vào kho media GitHub trong một commit, gắn làm ảnh bìa hoặc chèn sau đề mục tương ứng.
6. Trạng thái bài viết không tự chuyển sang đã đăng. Admin vẫn kiểm tra và xuất bản thủ công.

## Biến môi trường Railway

```env
OPENAI_API_KEY=...
OPENAI_IMAGE_MODEL=gpt-image-2
GITHUB_MEDIA_TOKEN=...
GITHUB_MEDIA_OWNER=...
GITHUB_MEDIA_REPO=...
GITHUB_MEDIA_BRANCH=main
```

Các biến GitHub media hiện có của dự án vẫn được dùng theo cấu hình trong `src/lib/github-media.ts`.

## Nguyên tắc an toàn

- Mỗi brief được tạo lại tối đa 2 lần.
- Mỗi ảnh duyệt tối đa 15MB; cả bộ tối đa 50MB và 4 ảnh.
- Chỉ chấp nhận dữ liệu WebP, PNG hoặc JPEG từ phiên tạo ảnh đang chờ duyệt.
- Ảnh sản phẩm chính thức được truyền làm ảnh tham chiếu khi brief có sản phẩm liên quan.
- Lỗi tạo ảnh không làm mất nội dung hoặc tự xuất bản bài viết.
- Marker trong Markdown giúp cập nhật đúng vị trí mà không chèn trùng khi duyệt lại.
