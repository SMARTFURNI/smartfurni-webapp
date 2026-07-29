# Facebook Group Marketing

Phân hệ quản lý quy trình đăng bài thủ công vào Facebook Group bằng Fanpage SmartFurni.
CRM chọn group, chuẩn bị nội dung, kiểm tra quy tắc, xếp lịch, giao việc, lưu link bài
đăng, theo dõi bình luận và quy nguồn doanh thu. Nhân viên luôn là người trực tiếp mở
Facebook và bấm đăng.

## Kiến trúc

- Next.js App Router: các trang nằm dưới `/crm/facebook-group-marketing`.
- PostgreSQL: migrations `004_create_facebook_group_marketing.sql` và
  `005_upgrade_facebook_group_marketing_operations.sql`.
- API nội bộ: catch-all route có whitelist tài nguyên tại
  `/api/crm/facebook-group-marketing/[...path]`.
- RBAC: dùng `crm_custom_roles`; không tạo hệ người dùng riêng.
- Fanpage: đồng bộ trực tiếp các Page ID đang kết nối trong Content Marketing/Facebook
  Inbox; không sao chép access token sang bảng Facebook Group Marketing.
- Messenger thật: khi Facebook Inbox tải tin nhắn từ Graph API, tin nhắn inbound có mã
  nguồn được xử lý idempotent theo `message_id`, kiểm tra đúng Fanpage rồi tạo/cập nhật
  lead theo PSID/conversation.
- Lead/báo giá/đơn hàng: attribution lưu ID của bản ghi CRM hiện có. Tạo báo giá và đơn
  hàng từ lead tự cập nhật nguồn; doanh thu chỉ được ghi nhận khi đơn đã thanh toán và
  không bị hủy/hoàn tiền.
- PWA: cron CRM hiện có cũng chạy hàng chờ Facebook Group để Railway chỉ cần một lịch
  gọi định kỳ.
- Audit: thao tác quan trọng vừa được ghi vào `facebook_group_activity_logs`, vừa có thể
  đối chiếu với audit CRM hiện có.
- Safety by design: schema không có cột password, cookie, browser session hay Facebook
  credential; module không gọi Graph API để đăng group và không điều khiển trình duyệt.

## Cài đặt

1. Cấu hình `DATABASE_URL`, `SESSION_SECRET`, `CRON_SECRET` và Web Push theo
   `.env.example`.
2. Chạy migration theo đúng thứ tự bằng công cụ quản trị PostgreSQL của môi trường:

   ```bash
   psql "$DATABASE_URL" -f migrations/004_create_facebook_group_marketing.sql
   psql "$DATABASE_URL" -f migrations/005_upgrade_facebook_group_marketing_operations.sql
   ```

   Với project Railway đã link:

   ```bash
   railway run --service Postgres npm run migrate:facebook-groups:production
   ```

3. Vào CRM → Quản lý vai trò và cấp các quyền `facebook_group_*` phù hợp.
4. Vào Facebook Group Marketing → Cài đặt → **Đồng bộ từ Content Marketing**, sau đó
   kiểm tra giới hạn của từng Fanpage.
5. Đảm bảo Railway scheduler gọi `/api/crm/automation/cron` với header
   `Authorization: Bearer $CRON_SECRET` mỗi 15–30 phút. Endpoint này chạy cả automation
   CRM và nhắc việc Facebook Group.

Không chạy seed trên production. Với database development:

```bash
npm run seed:facebook-groups
```

Script từ chối chạy nếu `NODE_ENV=production` và bắt buộc cờ xác nhận development.

## Quy trình sử dụng

1. **Danh sách Group**: Group được quy hoạch theo bộ chủ đề chuẩn. Bấm thẻ chủ đề để
   lọc danh sách; có thể nhập link thủ công hoặc dùng AI Agent tìm các Group liên quan
   theo chủ đề, khu vực và từ khóa bổ sung. Backend chỉ giữ URL xuất hiện trực tiếp
   trong nguồn Grounding của Google Search, không tin URL do mô hình tự viết. Nếu Google
   chỉ trả citation chuyển hướng, nhân viên mở nguồn rồi dán URL Facebook Group đang xem
   được; sau khi xác nhận, UI mới cho thêm vào CRM.
2. **Nội quy**: gọi `POST /groups/:id/analyze-rules`; bộ phân tích chỉ xử lý văn bản
   đã nhập, không truy cập Facebook.
3. **Chiến dịch**: chọn Fanpage, sản phẩm CRM, nhân viên, thời gian và các group đã sẵn
   sàng. Backend không cho kích hoạt chiến dịch thiếu dữ liệu thật.
4. **Kho nội dung**: AI có thể đọc dữ liệu sản phẩm + nội quy đã nhập để gợi ý bản nháp.
   Nhân viên chỉnh sửa rồi lưu; CRM sinh mã nguồn để quy nguồn nội bộ và so sánh nội
   dung 30 ngày. Mã nguồn không bị tự chèn vào nội dung liên hệ hiển thị cho khách.
5. **Duyệt**: nội dung vượt ngưỡng trùng hoặc chưa đạt rule check không thể duyệt.
   Người tạo không được tự duyệt bài của mình.
6. **Lịch đăng**: backend kiểm tra giới hạn Fanpage, khoảng cách, ngày đăng lại,
   membership, trạng thái group, duyệt nội dung, nội quy và lịch nhân viên.
7. **Nhiệm vụ**: nhân viên sao chép nội dung, mở group và tự đăng bằng Fanpage.
8. **Đánh dấu đã đăng**: nhập đúng link `facebook.com/groups/.../posts/...` thuộc Group
   đã giao và trạng thái hiển thị/chờ duyệt. CRM tạo bài đã đăng và các check task
   15 phút, 1 giờ, 3 giờ, 12 giờ, 24 giờ, 3 ngày.
9. **Bình luận**: nhân viên mở bài, nhập comment có nhu cầu và mời khách nhắn Fanpage.
10. **Messenger**: nhân viên dùng Facebook Inbox hiện có. Khi tải hội thoại thật, hệ
    thống tự nhận mã, kiểm tra Fanpage, tạo/cập nhật lead, tạo việc tư vấn và gắn chính
    xác page/group/post/campaign/content/nhân viên. Không cần nhập lead ID thủ công.
11. **Báo giá và đơn hàng**: tạo từ trang lead. ID lead được giữ xuyên suốt sang đơn
    hàng; payment/status thay đổi sẽ tự cập nhật doanh thu quy nguồn, không cộng trùng.
12. **Lead detail**: tab **Nguồn Facebook Group** hiển thị mã, Group, bài gốc, chiến
    dịch, nhân viên đăng, Messenger đầu tiên, báo giá, đơn hàng và doanh thu.

## API

Các API đều yêu cầu session CRM và permission tương ứng.

- `GET|POST /pages`, `PATCH|DELETE /pages/:id`
- `POST /pages/sync` (đồng bộ Fanpage từ Content Marketing)
- `GET|POST /groups`, `PATCH|DELETE /groups/:id`
- `POST /groups/discover` (Gemini + Google Search, chỉ đề xuất URL công khai để duyệt)
- `POST /groups/import` (CSV đã được UI chuyển thành danh sách có validation từng dòng)
- `GET /groups/export`
- `POST /groups/:id/rules`
- `POST /groups/:id/analyze-rules`
- `POST /groups/:id/recalculate-score`
- `GET|POST /campaigns`, `PATCH|DELETE /campaigns/:id`
- `GET|POST /content`, `PATCH|DELETE /content/:id`
- `POST /content/suggest` (Gemini, dựa trên nội quy và sản phẩm CRM)
- `POST /content/:id/approve`, `POST /content/:id/reject`
- `GET|POST /tasks`, `PATCH|DELETE /tasks/:id`
- `POST /tasks/:id/mark-posted`
- `GET|PATCH /posts`, `DELETE /posts/:id`
- `POST /posts/:id/moderation`
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

## Ranh giới vận hành an toàn

- Import ở MVP nhận CSV qua quy trình CRM; workbook Excel định dạng giàu dữ liệu chưa
  có UI mapping cột riêng.
- Số reaction/comment và trạng thái kiểm duyệt được nhân viên cập nhật từ bài thật;
  module không scrape Group và không dùng browser automation.
- AI Agent tìm Group dùng kết quả Google Search công khai, chỉ nhận URL có citation
  Grounding, loại URL mô hình tự suy đoán, loại sai định dạng và chống trùng với CRM.
  Agent không tự tham gia Group, không đọc nội quy và không suy đoán số thành viên/quyền
  đăng; các thông tin này phải được nhân viên mở Facebook kiểm tra rồi cập nhật.
- Tự động nhận nguồn hiện chạy khi Facebook Inbox tải tin nhắn thật. Nếu cần nhận ngay
  cả khi không ai mở Inbox, webhook Messenger production phải gọi cùng hàm ingestion.
- AI chỉ tạo bản nháp/gợi ý. Nhân viên vẫn duyệt, mở Group và bấm đăng.
- Forecast, tối ưu tần suất và báo cáo cohort sâu là phần mở rộng; không thay thế luồng
  vận hành thật nêu trên.
