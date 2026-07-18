# Giao thức thiết bị SmartFurni Bed v1

Tài liệu này là hợp đồng giữa ứng dụng SmartFurni, bộ điều khiển trong giường/nệm và Wi-Fi Gateway. Ứng dụng đã hỗ trợ giao thức này qua Web Bluetooth, Bluetooth native iOS/Android, Wi-Fi và chế độ mô phỏng.

## 1. Cấu hình mặc định

| Thành phần | Giá trị mặc định |
| --- | --- |
| Tên thiết bị BLE | Bắt đầu bằng `SmartFurni` |
| Service UUID | `0000fff0-0000-1000-8000-00805f9b34fb` |
| Notify characteristic | `0000fff1-0000-1000-8000-00805f9b34fb` |
| Write characteristic | `0000fff2-0000-1000-8000-00805f9b34fb` |
| Giao thức | `smartfurni-bed-v1` |
| Mã hóa | UTF-8, mỗi bản tin kết thúc bằng `\n` |

Các UUID và tiền tố tên thiết bị đều có thể chỉnh trong màn hình kết nối. Khi chốt bo mạch/firmware chính thức, nên khóa chúng theo từng model và không để khách hàng tự sửa.

## 2. Khung lệnh

```json
{
  "protocol": "smartfurni-bed-v1",
  "requestId": "0c9e7fd2-66d0-44f0-b31a-65b4dfe5d2f0",
  "sentAt": "2026-07-18T08:30:00.000Z",
  "command": {
    "type": "sync_state",
    "zone": "all",
    "profileId": "ergonomic-elite",
    "headAngle": 35,
    "footAngle": 12,
    "led": { "on": true, "color": "#D7B957", "brightness": 60 },
    "massage": { "on": false, "level": 0, "mode": "wave" },
    "childLock": false
  }
}
```

BLE có thể chia một bản tin thành nhiều gói 180 byte. Firmware phải ghép dữ liệu cho đến ký tự xuống dòng rồi mới phân tích JSON.

## 3. Các lệnh bắt buộc

### `sync_state`

Đồng bộ trạng thái điều khiển. `zone` nhận `all`, `left` hoặc `right`. Firmware phải giới hạn góc theo cơ khí thực tế, không chỉ tin giới hạn từ ứng dụng.

### `stop_flat`

```json
{ "type": "stop_flat", "zone": "all" }
```

Dừng chuyển động đang chạy và đưa vùng được chọn về vị trí phẳng theo quy trình an toàn của firmware.

### `set_routine`

```json
{
  "type": "set_routine",
  "enabled": true,
  "bedtime": "22:30",
  "wakeTime": "06:30",
  "sleepPresetId": "flat",
  "wakePresetId": "zero-gravity",
  "ledAtBedtime": true
}
```

### `ping`

Firmware phản hồi telemetry để kiểm tra kết nối và độ trễ.

## 4. Telemetry thiết bị

Thiết bị gửi JSON qua Notify characteristic hoặc phản hồi Wi-Fi:

```json
{
  "deviceId": "SF-ELITE-A1B2C3",
  "deviceName": "SmartFurni Elite",
  "firmware": "2.1.0",
  "batteryLevel": 92,
  "headAngle": 35,
  "footAngle": 12,
  "ledOn": true,
  "ledColor": "#D7B957",
  "ledBrightness": 60,
  "massageLevel": 0,
  "online": true,
  "temperature": 31.4
}
```

Thiết bị có thể gửi trực tiếp object trên hoặc bọc trong `{ "telemetry": { ... } }`.

## 5. Wi-Fi Gateway

Gateway phải cùng mạng LAN với điện thoại/máy tính hoặc được bảo vệ bằng TLS khi truy cập từ Internet. Ứng dụng native có thể gọi Gateway HTTP trong mạng cục bộ. Bản website chạy HTTPS chỉ kết nối trực tiếp tới Gateway HTTPS hợp lệ; nếu Gateway chỉ có HTTP, hãy dùng Bluetooth hoặc một relay HTTPS được xác thực.

- `GET /api/v1/status`: trả về telemetry.
- `POST /api/v1/command`: nhận khung lệnh ở mục 2.
- Header tùy chọn: `Authorization: Bearer <device-token>`.
- Header phản hồi: `Content-Type: application/json`.
- Nếu điều khiển từ website khác origin, Gateway cần CORS chỉ cho phép miền SmartFurni chính thức.

Không đưa mật khẩu Wi-Fi hoặc khóa điều khiển dài hạn vào log. Token của từng thiết bị phải có thể thu hồi và thay mới.

## 6. Yêu cầu an toàn bắt buộc ở firmware

- Công tắc hành trình và giới hạn góc phải nằm trong firmware/driver động cơ.
- Có nút dừng vật lý, giới hạn dòng, chống kẹt và watchdog độc lập với ứng dụng.
- Lệnh cũ phải hết hạn; không chạy lại lệnh sau khi mất điện hoặc reconnect.
- Khóa trẻ em phải được lưu và thực thi ở thiết bị.
- Khi mất kết nối, động cơ phải dừng theo trạng thái an toàn.
- Firmware phải kiểm tra `profileId`, vùng điều khiển và khả năng phần cứng trước khi chạy.
- Bản cập nhật firmware cần ký số và có phương án rollback.

Ứng dụng không thể thay thế các lớp bảo vệ cơ khí và điện này.
