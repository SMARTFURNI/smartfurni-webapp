# Tính Năng Giao Diện Làm Việc Hiệu Suất Cao (High-Performance UI Features)

## Tổng Quan

Tính năng này cung cấp một bộ công cụ toàn diện để nâng cao hiệu suất làm việc của đội ngũ Sales trong CRM, đặc biệt khi xử lý khối lượng lớn leads (2,000+/tháng).

## Các Tính Năng Chính

### 1. Thao Tác Hàng Loạt (Bulk Actions)

Cho phép nhân viên Sales thực hiện các hành động trên nhiều leads cùng lúc mà không cần thao tác từng cái một.

**Tính năng:**
- Chọn/bỏ chọn tất cả leads
- Gửi Email hàng loạt
- Gửi tin nhắn Zalo hàng loạt
- Thay đổi Stage cho nhiều leads
- Gán leads cho nhân viên khác
- Thêm tag cho nhiều leads
- Xóa leads hàng loạt

**Lợi ích:**
- Tiết kiệm 80% thời gian thao tác lặp đi lặp lại
- Giảm lỗi nhân công
- Tăng tốc độ xử lý leads

### 2. Bảng Tương Tác Nhanh (Quick Interaction Panel)

Giao diện tích hợp cho phép nhân viên gọi điện, nhắn tin và ghi chú mà không cần chuyển đổi ứng dụng.

**Tính năng:**
- **Call Tab:** Click-to-call, ghi âm tự động, ghi chú cuộc gọi
- **Message Tab:** Gửi SMS/Zalo trực tiếp, xem lịch sử tin nhắn
- **History Tab:** Xem toàn bộ lịch sử tương tác (gọi, tin nhắn, email)

**Lợi ích:**
- Tăng tốc độ phản hồi khách hàng
- Giữ luồng công việc liền mạch
- Không mất mát thông tin tương tác

### 3. Ghi Âm & Chuyển Đổi Giọng Nói (Speech-to-Text)

Tự động ghi âm cuộc gọi và chuyển đổi thành văn bản để dễ dàng tra cứu và phân tích.

**Tính năng:**
- Ghi âm tự động khi gọi
- Chuyển đổi giọng nói thành văn bản
- Lưu bản ghi chép vào hồ sơ lead
- Tải về dạng .txt

**Lợi ích:**
- Không mất mát thông tin cuộc gọi
- Dễ dàng tra cứu nội dung cuộc gọi cũ
- Hỗ trợ đào tạo nhân viên

## Cấu Trúc File

```
src/
├── components/crm/high-performance-features/
│   ├── BulkActionsToolbar.tsx
│   └── QuickInteractionPanel.tsx
├── app/api/crm/
│   ├── bulk-actions/
│   │   ├── send-email/route.ts
│   │   ├── send-zalo/route.ts
│   │   ├── change-stage/route.ts
│   │   ├── assign/route.ts
│   │   ├── add-tag/route.ts
│   │   └── delete/route.ts
│   └── interactions/
│       ├── initiate-call/route.ts
│       ├── send-message/route.ts
│       └── [other interaction routes]
```

## Cài Đặt

### 1. Cài Đặt Dependencies

```bash
npm install twilio nodemailer
npm install --save-dev @types/nodemailer
```

### 2. Cấu Hình Environment Variables

Thêm vào `.env.local`:

```env
# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@smartfurni.com

# Zalo
ZALO_ACCESS_TOKEN=your-zalo-token
ZALO_OA_ID=your-oa-id

# Twilio
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Google Cloud
GOOGLE_CLOUD_API_KEY=your-google-cloud-key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_UPLOAD_PRESET=your-preset

# Base URL
BASE_URL=https://your-domain.com
```

### 3. Tích Hợp vào LeadsListClient

Xem file `integration-guide.md` để hướng dẫn chi tiết.

## Sử Dụng

### Thao Tác Hàng Loạt

1. Chọn các leads bằng checkbox
2. Thanh công cụ sẽ hiển thị ở dưới
3. Chọn hành động mong muốn (Email, Zalo, Stage, etc.)
4. Điền thông tin và xác nhận

### Tương Tác Nhanh

1. Nhấp vào nút "Quick Interaction" trên hồ sơ lead
2. Chọn tab (Call, Message, History)
3. Thực hiện hành động mong muốn
4. Tất cả sẽ được lưu tự động

## API Endpoints

### Bulk Actions

- `POST /api/crm/bulk-actions/send-email` - Gửi email hàng loạt
- `POST /api/crm/bulk-actions/send-zalo` - Gửi Zalo hàng loạt
- `POST /api/crm/bulk-actions/change-stage` - Thay đổi stage
- `POST /api/crm/bulk-actions/assign` - Gán leads
- `POST /api/crm/bulk-actions/add-tag` - Thêm tag
- `POST /api/crm/bulk-actions/delete` - Xóa leads

### Interactions

- `POST /api/crm/interactions/initiate-call` - Bắt đầu cuộc gọi
- `POST /api/crm/interactions/send-message` - Gửi tin nhắn
- `POST /api/crm/interactions/save-call` - Lưu bản ghi cuộc gọi
- `POST /api/crm/interactions/transcribe` - Chuyển đổi giọng nói

## Performance

- Xử lý tối đa 100 leads/lần cho bulk actions
- Ghi âm tối đa 60 phút
- Chuyển đổi giọng nói trong vòng 30 giây (tùy độ dài)

## Security

- Tất cả API endpoints yêu cầu xác thực
- Admin chỉ có thể thực hiện bulk actions
- Tất cả hành động được ghi log
- Dữ liệu nhạy cảm được mã hóa

## Troubleshooting

### Gửi email không thành công
- Kiểm tra SMTP credentials
- Bật "Less secure app access" nếu dùng Gmail
- Kiểm tra firewall/proxy

### Gọi điện không hoạt động
- Kiểm tra Twilio credentials
- Đảm bảo số điện thoại có định dạng đúng
- Kiểm tra quota Twilio

### Chuyển đổi giọng nói không chính xác
- Đảm bảo âm thanh rõ ràng
- Kiểm tra ngôn ngữ cấu hình (hiện tại: Tiếng Việt)
- Thử lại nếu lần đầu không thành công

## Future Enhancements

- Batch processing với progress bar
- Scheduled message sending
- AI-powered call sentiment analysis
- Integration với automation rules
- Real-time notification
- Call recording playback với transcript sync

## Support

Để báo cáo lỗi hoặc yêu cầu tính năng mới, vui lòng tạo issue trên GitHub.
