# Facebook Group Marketing

Phân hệ quản lý quy trình đăng bài thủ công vào Facebook Group bằng Fanpage SmartFurni.
CRM chọn group, chuẩn bị nội dung, kiểm tra quy tắc, xếp lịch, giao việc, lưu link bài
đăng, theo dõi bình luận và quy nguồn doanh thu. Nhân viên luôn là người trực tiếp mở
Facebook và bấm đăng.

## Kiến trúc

- Next.js App Router: các trang nằm dưới `/crm/facebook-group-marketing`.
- PostgreSQL: migration `migrations/004_create_facebook_group_marketing.sql`.
- API nội bộ: catch-all route có whitelist tài nguyên tại
  `/api/crm/facebook-group-marketing/[...path]`.
- RBAC: dùng `crm_custom_roles`; không tạo hệ người dùng riêng.
- Lead/báo giá/đơn hàng: attribution lưu ID của bản ghi CRM hiện có. Lead được cập nhật
  `source = "Facebook Group"`, tag mã nguồn và metadata nguồn.
- PWA: cron 15 phút dùng subscription CRM hiện có để nhắc đăng bài/kiểm tra comment.
- Audit: thao tác quan trọng vừa được ghi vào `facebook_group_activity_logs`, vừa có thể
  đối chiếu với audit CRM hiện có.
- Safety by design: schema không có cột password, cookie, browser session hay Facebook
  credential; module không gọi Graph API để đăng group và không điều khiển trình duyệt.

## Cài đặt

1. Cấu hình `DATABASE_URL`, `SESSION_SECRET`, `CRON_SECRET` và Web Push theo
   `.env.example`.
2. Chạy migration bằng công cụ quản trị PostgreSQL của môi trường:

   ```bash
   psql "$DATABASE_URL" -f migrations/004_create_facebook_group_marketing.sql
   ```

3. Vào CRM → Quản lý vai trò và cấp các quyền `facebook_group_*` phù hợp.
4. Vào Facebook Group Marketing → Cài đặt, tạo Fanpage SmartFurni và kiểm tra giới hạn.
5. Đảm bảo scheduler gọi
   `/api/crm/facebook-group-marketing/cron` với header
   `Authorization: Bearer $CRON_SECRET` mỗi 15 phút.

Không chạy seed trên production. Với database development:

```bash
npm run seed:facebook-groups
```

Script từ chối chạy nếu `NODE_ENV=production` và bắt buộc cờ xác nhận development.

## Quy trình sử dụng

1. **Danh sách Group**: nhập link, phân loại, xác nhận Fanpage đã tham gia và dán nội
   quy do nhân viên tự đọc.
2. **Nội quy**: gọi `POST /groups/:id/analyze-rules`; bộ phân tích chỉ xử lý văn bản
   đã nhập, không truy cập Facebook.
3. **Chiến dịch**: chọn Fanpage, sản phẩm, thời gian, mục tiêu và các group.
4. **Kho nội dung**: tạo phiên bản riêng; CRM sinh mã nguồn và so sánh nội dung 30 ngày.
5. **Duyệt**: nội dung vượt ngưỡng trùng hoặc chưa đạt rule check không thể duyệt.
   Người tạo không được tự duyệt bài của mình.
6. **Lịch đăng**: backend kiểm tra giới hạn Fanpage, khoảng cách, ngày đăng lại,
   membership, trạng thái group, duyệt nội dung, nội quy và lịch nhân viên.
7. **Nhiệm vụ**: nhân viên sao chép nội dung, mở group và tự đăng bằng Fanpage.
8. **Đánh dấu đã đăng**: nhập link Facebook và trạng thái hiển thị/chờ duyệt. CRM tạo
   bài đã đăng và các check task 15 phút, 1 giờ, 3 giờ, 12 giờ, 24 giờ, 3 ngày.
9. **Bình luận**: nhân viên mở bài, nhập comment có nhu cầu và mời khách nhắn Fanpage.
10. **Messenger**: gọi `POST /source-code/resolve` với nội dung tin nhắn; nếu có mã,
    gọi `POST /leads/link` để gắn lead vào page/group/post/campaign/content/nhân viên.
11. **Doanh thu**: gọi `POST /revenue/attribute` với `revenueEventKey` duy nhất.
    Unique constraint và transaction ngăn cộng trùng.

## API

Các API đều yêu cầu session CRM và permission tương ứng.

- `GET|POST /pages`, `PATCH|DELETE /pages/:id`
- `GET|POST /groups`, `PATCH|DELETE /groups/:id`
- `POST /groups/import` (CSV đã được UI chuyển thành danh sách có validation từng dòng)
- `GET /groups/export`
- `POST /groups/:id/rules`
- `POST /groups/:id/analyze-rules`
- `POST /groups/:id/recalculate-score`
- `GET|POST /campaigns`, `PATCH|DELETE /campaigns/:id`
- `GET|POST /content`, `PATCH|DELETE /content/:id`
- `POST /content/:id/approve`, `POST /content/:id/reject`
- `GET|POST /tasks`, `PATCH|DELETE /tasks/:id`
- `POST /tasks/:id/mark-posted`
- `GET|PATCH /posts`, `DELETE /posts/:id`
- `GET|POST /comments`
- `GET /checks`
- `POST /checks/:id/complete`
- `GET /dashboard`, `GET /reports`
- `GET|POST /settings`
- `POST /source-code/resolve`
- `POST /leads/link`
- `POST /revenue/attribute`
- `GET /cron` (chỉ cron secret)

Danh sách dùng `limit`, `offset` và các filter phù hợp. Group hỗ trợ `search`, `status`,
`grade`, `region`, `topic`, `membershipStatus`.

## Quyền

- `facebook_group_marketing_view`
- `facebook_group_manage`
- `facebook_group_campaign_manage`
- `facebook_group_content_create`
- `facebook_group_content_approve`
- `facebook_group_schedule`
- `facebook_group_publish_task`
- `facebook_group_sales`
- `facebook_group_reports`
- `facebook_group_settings`

## Kiểm thử

```bash
npm test
npx tsc --noEmit
npm run build
```

Test nghiệp vụ mới nằm tại `src/__tests__/facebook-group-marketing.test.ts`, bao gồm
giới hạn lịch, membership, duyệt nội dung, trùng lặp, mã nguồn, parser Messenger,
phân tích nội quy và chấm điểm.

## Giới hạn hiện tại và giai đoạn tiếp theo

- Import ở MVP nhận CSV qua quy trình CRM; workbook Excel định dạng giàu dữ liệu chưa
  có UI mapping cột riêng.
- Số reaction/comment được nhân viên cập nhật; module không tự quét group.
- Parser mã nguồn đã sẵn sàng để webhook Facebook Inbox/Pancake gọi, nhưng việc bật
  tự động trên production phụ thuộc cấu hình webhook hiện hữu.
- AI sinh nội dung, AI trả lời comment và gợi ý lịch thuộc Giai đoạn 2. Lớp dữ liệu đã
  có `ai_metadata`, `rule_check`, điểm spam và duplicate để bổ sung mà không đổi schema.
- Forecast, tối ưu tần suất và báo cáo cohort doanh thu thuộc Giai đoạn 3.
