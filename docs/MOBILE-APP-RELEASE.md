# Đóng gói SmartFurni Bed cho App Store và Google Play

Ứng dụng sử dụng cùng giao diện và tài khoản với `https://www.smartfurni.com.vn/dashboard`, đồng thời bổ sung Bluetooth native cho iOS/Android bằng Capacitor.

## Cấu trúc

- Mã ứng dụng web: `src/app/dashboard`
- Đăng nhập khách hàng: `src/app/smart-bed/login`
- API tài khoản/thiết bị: `src/app/api/bed`
- Dự án iOS: `ios/App/App.xcodeproj`
- Dự án Android: `android/`
- App ID: `vn.com.smartfurni.bed`
- Tên hiển thị: `SmartFurni Bed`

## Đồng bộ mã trước khi mở dự án native

```bash
npm install
npm run app:assets
npm run app:sync
```

Ứng dụng native tải bản dashboard đã triển khai trên website. Vì vậy, thay đổi giao diện và phần lớn logic sẽ có hiệu lực sau khi deploy website. Thay đổi quyền hệ điều hành, Bluetooth plugin, App ID hoặc native shell cần phát hành bản mới trên store.

## iOS / App Store

1. Cài Xcode bản đầy đủ trên macOS.
2. Chạy `npm run app:ios` hoặc mở `ios/App/App.xcodeproj`.
3. Chọn Team trong Signing & Capabilities và giữ Bundle ID `vn.com.smartfurni.bed`.
4. Xác nhận quyền Bluetooth trong `Info.plist` và chế độ `bluetooth-central`.
5. Kiểm thử trên iPhone thật; Simulator không mô phỏng đầy đủ Bluetooth LE.
6. Tạo Archive, upload bằng Xcode Organizer rồi hoàn thiện App Store Connect.

Cần chuẩn bị: tài khoản Apple Developer, chính sách quyền riêng tư, URL hỗ trợ, ảnh chụp màn hình, mô tả ứng dụng, phân loại độ tuổi và thông tin thu thập dữ liệu.

## Android / Google Play

1. Cài Android Studio và JDK được Android Studio khuyến nghị.
2. Chạy `npm run app:android` hoặc mở thư mục `android` trong Android Studio.
3. Kiểm thử Bluetooth trên điện thoại Android thật và kiểm tra quyền Nearby devices.
4. Tạo upload key, cấu hình signing, sau đó Build > Generate Signed Bundle / APK > Android App Bundle.
5. Upload `.aab` lên Play Console và hoàn thiện Data safety, nội dung ứng dụng, ảnh chụp và track kiểm thử nội bộ.

## Kiểm thử trước khi phát hành

- Đăng ký, đăng nhập, đăng xuất và khôi phục phiên.
- Ghép đôi từng model giường/nệm bằng Bluetooth.
- Kết nối lại sau khi tắt/mở Bluetooth và sau khi ứng dụng vào nền.
- Kết nối Wi-Fi Gateway, sai token, mất mạng và đổi mạng.
- Dừng khẩn, khóa trẻ em, giới hạn góc, hai vùng trái/phải.
- Không gửi lại lệnh cũ khi reconnect.
- Kiểm tra font, safe area, bàn phím và màn hình nhỏ.
- Xóa tài khoản/thiết bị và chính sách dữ liệu theo yêu cầu store.

## Điều kiện để điều khiển thiết bị thật

Mã ứng dụng đã có client Bluetooth/Wi-Fi và giao thức chuẩn. Trước khi đưa cho khách hàng, firmware hoặc Gateway của sản phẩm phải triển khai đúng `docs/SMART-BED-PROTOCOL.md`; UUID, lệnh động cơ, giới hạn an toàn và xác thực phải được đối chiếu trên phần cứng thật.
