# Lexkite – App Android & iOS

App mobile là **chính web app Lexkite**, đóng gói bằng [Capacitor](https://capacitorjs.com) (mã nguồn mở, miễn phí).
Một bộ mã duy nhất cho web, add-on và app, nên sửa một chỗ là cả ba cùng được cập nhật. Dữ liệu và tài khoản dùng chung.

## Đã làm sẵn (tự động)
| Hạng mục | Trạng thái |
|---|---|
| Dự án Android (`android/`) + iOS (`ios/`) – Capacitor 8.5 | ✅ |
| Biểu tượng app: iOS vuông kín; Android adaptive (nền + hình chữ V tách riêng); màn hình chờ sáng/tối | ✅ |
| Nhắc học hằng ngày bằng **thông báo trên máy** (không cần máy chủ), bấm vào là mở thẳng trang Ôn tập | ✅ |
| Rung phản hồi khi trả lời (Haptics) | ✅ |
| Nút Back Android: đóng hộp thoại → lùi trang → ở trang chủ thì thu nhỏ app (không thoát mất trạng thái) | ✅ |
| Chạy offline: toàn bộ app nằm trong gói cài đặt | ✅ |
| Cập nhật: `./scripts/build-mobile.sh` build lại web rồi đồng bộ vào android/ios | ✅ |
| Đăng nhập Google trong app | ⏳ cần anh tạo cấu hình Firebase (bước 4) |

## Cài thử app Android ngay (không cần cài gì trên máy tính)
Mỗi lần cập nhật, GitHub tự build file cài đặt (`.github/workflows/android.yml`, miễn phí):
1. Trên điện thoại Android mở: https://github.com/lexkiteapp/lexkiteapp.github.io/releases/tag/android-latest
2. Tải **lexkite.apk** → mở file → cho phép "Cài ứng dụng không rõ nguồn gốc" cho trình duyệt → **Cài đặt**.
(Bản thử nghiệm ký bằng khóa debug; khi lên Google Play cần khóa phát hành – bước 2 bên dưới.)

## Việc anh cần làm (em không làm thay được vì cần tài khoản/cài phần mềm của anh)

### 1. Thử app trên điện thoại Android (miễn phí)
1. Cài **Android Studio** (miễn phí): https://developer.android.com/studio → kéo vào Applications → mở lần đầu, chọn *Standard* để nó tự tải Android SDK (~3 GB).
2. Trong Terminal:
   ```bash
   cd "/Users/mrquyenbk/Documents/addon dictionary" && ./scripts/build-mobile.sh && cd mobile && npx cap open android
   ```
3. Android Studio mở dự án → cắm điện thoại Android (bật *Tùy chọn nhà phát triển → Gỡ lỗi USB*) → bấm nút ▶ **Run**.

### 2. Đưa lên Google Play
- Tạo tài khoản **Google Play Console**: https://play.google.com/console (phí **25 USD một lần**).
- Android Studio → *Build → Generate Signed Bundle (.aab)* → tạo khóa ký. **Cất giữ file .keystore và mật khẩu cẩn thận**, mất là không cập nhật app được nữa.
- Tải file `.aab` lên Play Console, điền mô tả (có thể dùng nội dung trong `store/`), ảnh chụp màn hình, chính sách quyền riêng tư: https://lexkite.com/privacy.html

### 3. iPhone / App Store
- Cài **Xcode** từ App Store trên Mac (miễn phí, ~15 GB, cần đăng nhập Apple ID).
- Thử trên iPhone của anh: miễn phí, chỉ cần Apple ID: `npx cap open ios` → chọn iPhone → ▶ Run.
- Phát hành lên App Store: cần **Apple Developer Program 99 USD/năm**.
- Lưu ý: Apple từ chối app chỉ là trang web bọc lại. Lexkite có thông báo nhắc học trên máy, chạy offline và rung phản hồi, nên đáp ứng yêu cầu "có tính năng của app gốc".

### 4. Bật đăng nhập Google trong app (để đồng bộ giữa app – web – add-on)
Google chặn đăng nhập trong khung web của app, nên phải dùng đăng nhập gốc (miễn phí):
1. Firebase Console → dự án **lexkite-app** → *Add app* → Android, package name `com.lexkite.app`. Thêm luôn iOS với bundle ID `com.lexkite.app`.
2. Tải `google-services.json` (Android) và `GoogleService-Info.plist` (iOS) về thư mục `mobile/`, rồi nhắn em. Em sẽ cài plugin đăng nhập gốc và nối với hệ thống đồng bộ sẵn có.

Trong lúc chưa có bước 4, app vẫn học bình thường và lưu dữ liệu trên máy. Đồng bộ đa thiết bị thì đăng nhập trên lexkite.com.

## Widget màn hình chính / khóa
- **iOS** (`ios/App/LexkiteWidget/`, WidgetKit): nhỏ, vừa, màn hình khóa (accessoryRectangular, accessoryInline – iOS 16+). Target do `ruby scripts/ios-add-widget.rb` thêm vào `App.xcodeproj` (chạy lại an toàn).
- **Android** (`LexkiteWidget.kt`, RemoteViews): 2×2 và 4×2 (tự đổi bố cục theo độ rộng). Android không còn widget màn hình khóa trên điện thoại.
- **Dữ liệu**: `web/js/native.js` → plugin nội bộ `WidgetBridge.update({ json })` (iOS `WidgetBridgePlugin.swift` → App Group `group.com.lexkite.app`; Android `WidgetBridgePlugin.kt` → SharedPreferences). Snapshot ≤ 20 từ đến hạn + số thẻ + chuỗi ngày + nhãn đã dịch (15 ngôn ngữ). Ghi khi mở app, sau phiên ôn, sau đồng bộ. Widget không gọi mạng; từ đổi mỗi giờ.
- **Chạm widget** → `lexkite://review?w=từ` → app mở `#/review?w=từ` (thẻ đó lên đầu phiên ôn).
- Mô tả trong thư viện widget: `node scripts/gen-widget-i18n.mjs` (lấy từ i18n web).
- **Khi phát hành iOS**: tạo App Group `group.com.lexkite.app` trên Apple Developer, bật App Groups cho cả `com.lexkite.app` và `com.lexkite.app.widget`, chọn Team cho cả 2 target (entitlements đã có sẵn).
