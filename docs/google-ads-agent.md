# AI Google Ads Agent

Module này nằm trong CRM tại `/crm/google-ads-agent`.

## MVP đã triển khai

- Danh sách sản phẩm quảng cáo mẫu: SMF12, SMF23, SMF18, SMF450, GSF150, GYT300.
- Tạo chiến dịch nháp bằng `AIAdGenerator`.
- Validate headline tối đa 30 ký tự, description tối đa 90 ký tự, số lượng assets, landing page và claim bị cấm.
- Bảng duyệt trước khi đăng: AI chỉ tạo nháp, người dùng phải duyệt thủ công.
- Google Ads OAuth scaffold và lưu refresh token đã mã hóa.
- Push chỉ cho draft đã được duyệt. Khi thiếu ENV Google Ads, hệ thống chạy dry-run an toàn.
- Báo cáo ngày và đề xuất tối ưu MVP từ dữ liệu mẫu/performance cache.

## ENV cần cấu hình

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini

GOOGLE_ADS_DEVELOPER_TOKEN=
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_ADS_REFRESH_TOKEN=
GOOGLE_ADS_LOGIN_CUSTOMER_ID=
GOOGLE_ADS_REDIRECT_URI=https://your-domain.com/api/google-ads-agent/connect
GOOGLE_ADS_ENCRYPTION_KEY=
```

Nếu chưa có `OPENAI_API_KEY`, module dùng bộ sinh nháp nội bộ theo rule SmartFurni để marketing vẫn test được.

## Google Ads API

1. Tạo OAuth Client trong Google Cloud Console.
2. Thêm redirect URI trỏ về `/api/google-ads-agent/connect`.
3. Điền `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_DEVELOPER_TOKEN`.
4. Vào tab “Kết nối Google Ads” trong CRM và mở OAuth URL.
5. Lưu `customer_id` đúng định dạng tài khoản Google Ads.

Giai đoạn MVP chưa tự bật campaign chạy live. Khi bấm “Đăng”, service chỉ cho phép sau trạng thái `human_approved` và tạo kết quả paused/dry-run an toàn nếu thiếu cấu hình live.

## Quy tắc nội dung

- Ưu tiên: sản xuất tại Việt Nam, đặt size/màu, giao lắp tận nơi, bảo hành 5 năm, tiết kiệm diện tích, khung thép chắc chắn.
- Không dùng claim: chữa khỏi bệnh, tốt nhất Việt Nam, giá rẻ nhất.
- Với giường y tế chỉ dùng ngôn ngữ hỗ trợ chăm sóc, không hứa điều trị.
