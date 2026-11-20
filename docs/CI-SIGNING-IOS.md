# Ký iOS trên CI – chứng chỉ Distribution cố định

> TL;DR: CI ký iOS Manual bằng 1 chứng chỉ Apple Distribution + hồ sơ App Store trong secret (scripts/native/ios-sign.sh); cấm ký Automatic/-allowProvisioningUpdates (ci-policy luật 13). Tạo/gia hạn: Actions → Apple signing (create-dist; chỉ làm lại hồ sơ: profiles) rồi scripts/native/ios-signing-secrets.sh; dọn chứng chỉ Development do CI tạo: mode revoke-ci-dev.

**Vì sao.** Trước 08/11, `ios-testflight.yml` (Capacitor) và `native-release.yml` (native) ký theo kiểu Automatic, có `-allowProvisioningUpdates`. Mỗi máy CI mới lại tạo thêm một chứng chỉ Development "Created via API". Đến lượt native-m1 thì tài khoản đã hết hạn mức chứng chỉ, và bước archive đỏ.

**Cách làm bây giờ.** Cả hai workflow gọi [`scripts/native/ios-sign.sh`](../scripts/native/ios-sign.sh). Script này:

- Nạp chứng chỉ Apple Distribution (.p12) vào một keychain tạm.
- Cài hồ sơ App Store.
- Đặt chế độ ký Manual, chỉ cho cấu hình Release của đúng các bundle id đã khai.
- Ghi `ExportOptions.plist` dạng manual.

Khoá ASC (`ASC_KEY_*`) giờ chỉ dùng để tải bản build lên. Luật 13 trong ci-policy chặn ký Automatic quay lại trên mọi workflow.

## Secret

| Secret | Nội dung |
|---|---|
| `IOS_DIST_P12_BASE64` | Chứng chỉ Apple Distribution kèm khoá riêng (.p12), mã base64 |
| `IOS_DIST_P12_PASSWORD` | Mật khẩu của file .p12 |
| `IOS_PROFILE_APP_BASE64` | Hồ sơ App Store của `com.lexkite.app` |
| `IOS_PROFILE_WIDGET_BASE64` | Hồ sơ App Store của `com.lexkite.app.widget` (chỉ Capacitor dùng) |

## Tạo lần đầu, hoặc gia hạn mỗi năm khi chứng chỉ/hồ sơ hết hạn

Các thao tác dưới đây đụng tới tài khoản Apple nên chủ tài khoản phải tự bấm.

1. **Tạo CSR.** Khoá riêng nằm trên máy, không bao giờ lên CI:
   `openssl genrsa -out ~/.config/lexkite/ios-dist.key 2048`
   `openssl req -new -key ~/.config/lexkite/ios-dist.key -out ~/.config/lexkite/ios-dist.csr -subj "/CN=LexKite CI Distribution"`
   Lần 08/11 em đã tạo sẵn hai file này.
2. **Tạo chứng chỉ và hồ sơ.**
   - Lấy CSR ở dạng base64: `base64 -i ~/.config/lexkite/ios-dist.csr | tr -d '\n' | pbcopy`.
   - Vào Actions → **Apple signing** → Run workflow, chọn mode `create-dist` và dán CSR vào ô `csr`.
   - Khi lượt chạy xong, tải artifact `ios-signing-public` về rồi giải nén. Artifact chỉ có .cer và .mobileprovision, đều là dữ liệu công khai.
3. **Đặt secret:** `bash scripts/native/ios-signing-secrets.sh <thư mục artifact>`. Script tự kiểm khoá riêng khớp chứng chỉ, đóng gói .p12 với mật khẩu ngẫu nhiên, rồi gọi `gh secret set` cho cả 4 secret.
4. **Chạy lại bản build:** Actions → *Native → TestFlight + Play*, hoặc *iOS → TestFlight*.

## Capability của App ID

Hồ sơ App Store chỉ mang những capability đang bật trên App ID. Nếu thiếu một cái, archive đỏ với lỗi `requires a provisioning profile with the … features`; lần 08/11 thiếu Associated Domains. Có hai lớp gác:

- `asc-signing.mjs`: trước khi tạo hồ sơ, bật đủ các capability ghi trong `CAPS` qua ASC API. Script chỉ bật, không bao giờ tắt. Danh sách hiện tại:
  - `com.lexkite.app`: App Groups, Associated Domains, Sign In with Apple, Push.
  - widget: App Groups.
- `ios-sign.sh`: trước khi archive, so entitlements của target (`CODE_SIGN_ENTITLEMENTS`) với hồ sơ. Thiếu thì báo đúng tên capability.

Khi thêm một capability vào app, sửa `CAPS` trong cùng PR. Cách sửa khi hồ sơ thiếu, không tạo chứng chỉ mới:

1. Vào Actions → **Apple signing**, chọn mode `profiles`, dán vào ô `ids` id chứng chỉ Distribution đang dùng. Lần 08/11 là `456NVP9789`.
2. Chạy bước 3 ở mục trên (`ios-signing-secrets.sh`) với artifact mới.

## Dọn chứng chỉ Development cũ do CI tạo

Vào Actions → **Apple signing**:

- Mode `list` để xem danh sách. Cột cuối ghi `CI-dev` cho chứng chỉ được phép thu hồi.
- Mode `revoke-ci-dev`, dán vào ô `ids` các id cần thu hồi.

Script từ chối mọi id không phải chứng chỉ Development "Created via API". Chứng chỉ Distribution và chứng chỉ do người tạo tay luôn được giữ.

Danh sách lấy ngày 08/11 có 10 id thuộc loại CI-dev:

`63RM7K74HK,68D8Y7HD9U,6P4V387FRN,9A5KX8AGD7,9H7H3PP2S5,DTG88RGV6G,LC649765W4,P3DDV4HQH5,YA8387P493,ZL593S2ST3`

Các chứng chỉ được giữ: 4 chứng chỉ Development mang tên "Quyen Khieu Dinh", và chứng chỉ Distribution `9H9AL8Q9NM` của bản App Store 1.0.
