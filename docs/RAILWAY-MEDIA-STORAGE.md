# Railway Media Storage

CRM dùng Railway Storage Bucket làm kho tệp chính. GitHub chỉ còn là phương án
dự phòng tạm thời cho ảnh công khai khi Bucket chưa được cấu hình. Chữ ký hợp
đồng và tệp riêng tư không được đưa lên GitHub.

## 1. Kết nối Bucket với dịch vụ CRM

Tạo một Storage Bucket trong cùng Railway project, sau đó tạo variable
references từ Bucket sang dịch vụ web cho các biến:

```text
BUCKET
ENDPOINT
REGION
ACCESS_KEY_ID
SECRET_ACCESS_KEY
```

Ứng dụng cũng chấp nhận bộ tên riêng sau nếu project đã dùng các tên biến chung
cho dịch vụ khác:

```text
RAILWAY_MEDIA_BUCKET
RAILWAY_MEDIA_ENDPOINT
RAILWAY_MEDIA_REGION
RAILWAY_MEDIA_ACCESS_KEY_ID
RAILWAY_MEDIA_SECRET_ACCESS_KEY
RAILWAY_MEDIA_FORCE_PATH_STYLE=false
```

Redeploy dịch vụ web. Trong `Quản trị Admin > Cài đặt`, trạng thái
`Railway Media` phải hiển thị `Đã kết nối`.

## 2. Chính sách lưu trữ

- `public/`: ảnh sản phẩm, bài viết, landing page, catalogue và nội dung mạng xã hội.
- `private/`: chữ ký hợp đồng, báo giá và tệp CRM riêng tư; API yêu cầu phiên đăng nhập.
- `temporary/`: bản nháp có `expires_at`; tiến trình production dọn tệp hết hạn mỗi ngày.
- URL trong cơ sở dữ liệu dùng dạng ổn định `/api/media/...`, không lưu URL có thời hạn.
- Không xoá dữ liệu cũ trong GitHub hoặc `public/uploads` ngay sau migration.

## 3. Chuyển dữ liệu hiện có

Chạy ở môi trường có đủ biến Bucket và `DATABASE_URL`.

```bash
npm run media:railway:plan
npm run media:railway:upload
npm run media:railway:verify
```

Quy trình an toàn:

1. `plan` chỉ lập danh sách, không upload và không sửa database.
2. `upload` sao chép tệp lên Bucket và tạo manifest cục bộ.
3. `upload` tự xác minh đủ số file và đúng kích thước trên Bucket.
4. Giữ nguyên URL `/uploads/...` trong database, metadata, sitemap và dữ liệu có
   cấu trúc để không làm Google Images lập chỉ mục lại.
5. Không xoá bản GitHub. Nếu sau này cần bỏ file khỏi repository, đặt
   `MEDIA_SERVE_LEGACY_UPLOADS_FROM_BUCKET=true` rồi redeploy. Rewrite nội bộ sẽ
   tiếp tục phục vụ đúng URL `/uploads/...` cũ từ Bucket.

Lệnh `npm run media:railway:apply` cố ý bị khóa vì thay URL hàng loạt có thể ảnh
hưởng SEO. Chỉ sau khi có kế hoạch đổi URL riêng mới dùng
`npm run media:railway:apply:url-change`.

File `.media-migration-manifest.json` có thể chứa ánh xạ nội bộ nên đã được bỏ
qua khỏi Git.

## 4. Kiểm tra sau deploy

- Upload ảnh sản phẩm, bài blog, landing page và ảnh Facebook Group.
- Mở lại Catalogue để xác nhận ảnh không còn là chuỗi `data:image/...`.
- Tạo hợp đồng thử và xác nhận chữ ký chỉ xem được khi đã đăng nhập CRM.
- Kiểm tra `/api/media/public/...` tải được công khai.
- Kiểm tra `robots.txt` cho phép `/api/media/public/` dù các API khác vẫn bị chặn.
- Kiểm tra `sitemap.xml` có thẻ ảnh cho trang sản phẩm, chuyên mục và bài blog.
- Kiểm tra `/api/media/private/...` trả `401` khi không có phiên đăng nhập.
- Theo dõi log `[Production Scheduler] Media cleanup` nếu có tệp hết hạn.
