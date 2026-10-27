# ADS – Quảng cáo Lexkite (thiết kế 1 lần, mọi cờ TẮT)

> TL;DR: Thiết kế quảng cáo một lần, mọi cờ TẮT: AdMob (app), AdSense (web), add-on Chrome không bao giờ; chỉ đặt ở điểm nghỉ của bài học. Cờ ở Quản trị, đồng ý/quyền riêng tư, đo lường và cổng giữ chân; code xong, chờ chủ tạo tài khoản.
> Đọc khi: đụng tới quảng cáo, đồng ý, hoặc bật nền tảng quảng cáo mới.

Quyết định đã chốt: Lexkite **miễn phí, kiếm tiền bằng quảng cáo**. App gốc = **Google AdMob**, web = **Google AdSense**, add-on Chrome = **không bao giờ**.
Chuẩn tham chiếu: Duolingo / Quizlet – quảng cáo chỉ ở điểm nghỉ, không bao giờ cắt ngang việc học. Trạng thái 24/10/2026: code xong, **mọi cờ tắt**, chờ chủ tạo tài khoản.

## 0. Thiết kế 10 dòng (METHODS "Làm đúng 1 lần")
1. Mục tiêu đo được: doanh thu ước tính/ngày, tỉ lệ lấp đầy, eCPM; **D1/D7/thời lượng phiên của nhóm có quảng cáo không tụt quá X % (mặc định 5 %) so với nhóm đối chứng 10 %**.
2. Tài nguyên: khung app **−2,5 KB gz** (vỏ `js/ads.js` 0,95 KB thay cho 3,5 KB cũ); mã thật tải lười `js/ads/{config,policy,run}.js`; D1: ≤ 30 dòng ghi / phiên có quảng cáo (bảng `ext_events` sẵn có, 0 bảng mới); đọc: SEARCH theo PK, đệm 10 phút (Quản trị), cổng giữ chân ≤ 1 lần/giờ/trung tâm.
3. Điểm hỏng + chặn: quảng cáo trong bài học → danh sách CHO PHÉP (deny-by-default, test 30 route); CLS → ô cố định 290 px + `contain: strict` (test Chromium); quảng cáo trước đồng ý → `pauseAdRequests` tới khi CMP trả lời; giữ chân tụt → tự giảm tần suất; mã từ xa trong add-on → `build-extension.sh` loại `js/ads/`.
4. Công tắc tắt + quay lại: Quản trị › Quảng cáo › **TẮT TOÀN BỘ** (`ads_kill=1`, ≤ 1 giờ do đệm cấu hình); tắt từng nền tảng; `enabled: false` trong code; app gốc gỡ SDK: `node scripts/mobile-ads.mjs --disable`.
5. Chủ file: `web/js/ads.js`, `web/js/ads/*`, `web/js/ad-offers.js`, `web/js/i18n/*/adoffer.js`, `web/js/admin-ads.js`, `functions/api/_ads.js`, `functions/api/ads-reward.js`, `scripts/mobile-ads.mjs`, `scripts/test/ads*.mjs`, `docs/ADS.md`.

## 1. Vị trí (không bao giờ làm hại việc học)
| | Ở đâu | Luật |
|---|---|---|
| (a) Ô hiển thị | Trang **Hôm nay** của app web (cuối trang) · cuối bài **blog** (trước "Bài liên quan") | 300×250 trong ô cố định 290 px, nhãn "Quảng cáo/Advertisement" thấy được + `aria-label`, `<aside>` không nhận focus. App gốc: banner AdMob thích ứng ở đáy, CHỈ khi đang ở tab Hôm nay |
| (b) Toàn màn hình cuối phiên | Chỉ app gốc, khi người dùng **xong 1 phiên** (`lexkite:practice-done` / `lexkite:test-done`) **và đã về tab chính** (home/vocab/skills/tests/me) | ≤ 1 lần / 3 phiên, ≤ 1 lần / 10 phút, **không bao giờ trong 24 giờ / ngày lịch đầu tiên**; Quản trị chỉ nới (3–20 phiên, 10–240 phút, 24–336 giờ), không dày hơn |
| (c) Có thưởng (tự chọn) | Cứu chuỗi (modal sẵn có) · hết lượt AI chấm/giải thích (+3) · hết lượt Roleplay (+10) | Người dùng bấm "Xem video"; lượt AI cộng ở máy chủ qua **SSV** (chữ ký Google), ≤ 3 lần/tính năng/máy/ngày |
| (c2) Có thưởng ở thẻ kết quả (`js/ad-offers.js`, tải lười) | **🎯 Cơ hội thứ 2**: làm lại đúng các câu sai, đúng hết → điểm tính lại (qua bài nếu ≥ 80 %) · **⚡ Nhân đôi XP** (điểm ≥ 60 %) | Chỉ khi sai lẻ tẻ (≤ max(2, 40 %) số câu – sai nhiều thì học lại); không có video → cơ hội 2 **miễn phí 1 lần/ngày** (web vẫn được lợi); x2 XP chỉ khi có video; 1 lời mời/loại/lượt; không bao giờ cho máy Lớp học (điểm bài giao phải thật) |
| (d) Ô ở cuối trang kết quả (web) | Dưới thẻ kết quả cuối lượt luyện (điểm nghỉ) | Chỉ ≥ 24 giờ từ lần đầu, điểm ≥ 50 %, chèn dưới cùng (0 CLS), ô `done` trong `config.js` |

**Thưởng cho người hợp tác / không "xát muối"** (`policy.js`): trần có thưởng/ngày `PER_DAY` (cứu chuỗi 1 · AI 3 · Roleplay 3 · cơ hội 2 · 3 · x2 XP 2) để thưởng có giá trị; vừa xem video có thưởng → **30 phút không toàn màn hình** (`CALM_MIN`); phiên vừa làm < 50 % → không toàn màn hình, không ô kết quả (`FAIL_PCT`). Vỏ: `Ads.rewarded(lý do, 1)` = chỉ hỏi "có video không" (không tải gì khi cờ tắt).

**Không bao giờ** (mã: `web/js/ads/policy.js` `blocked()` + danh sách cho phép): lúc học/quiz/thi/ôn/nói/roleplay; Lớp học (`lk.edu`, `#/class…`) giáo viên & học sinh; người dùng `lk.u13` (< 13 – COPPA/an toàn trường học); add-on Chrome (`chrome-extension:`); Quản trị; `?sandbox`/`?demo`; trình duyệt tự động; **nhóm đối chứng 10 %** (băm `lk.vid`). Thư viện bài đọc trước đây có ô `list` – đã bỏ.

## 2. Cờ & cấu hình (1 chỗ)
- **Từ xa** (`/api/config`, đệm biên 5 phút + máy 1 giờ; sửa ở **Quản trị › 💰 Quảng cáo**): `ads_kill`, `ads_web`, `ads_android`, `ads_ios`, `ads_inter`, `ads_rew`, `ads_cap_sessions|gap|firstday`, `ads_guard` (do cổng giữ chân tự ghi). Chỉ quản trị: `ads_ecpm_<plat>` (USD/1000, proxy doanh thu), `ads_guard_pct` (X, mặc định 5), `ads_guard_min` (cỡ mẫu/nhóm, mặc định 200).
- **Trong code** `web/js/ads/config.js`: `enabled`, mã nhà xuất bản AdSense + ô (`home`, `blog`), mã AdMob (hiện = **mã THỬ của Google**, `testing: true`); `web.rewarded` = đường dẫn ô GPT có thưởng (rỗng = TẮT), `web.testing` (chỉ test → ô demo `web.DEMO`).
- Hiệu lực = cờ từ xa **VÀ** `enabled` **VÀ** ngữ cảnh cho phép. Tất cả mặc định tắt → vỏ không tải gì.

## 3. Đồng ý & quyền riêng tư
- **Web:** CMP chứng nhận của Google (AdSense › *Privacy & messaging*, miễn phí) – thông điệp GDPR (TCF v2.2: EEA/UK/CH) + luật bang Mỹ (CCPA/CPRA…). `run.js` nạp `adsbygoogle.js` với `pauseAdRequests = 1`, chờ `__tcfapi` (`tcloaded`/`useractioncomplete`, tối đa ~3 s): từ chối mục đích 1 → **không yêu cầu quảng cáo**; thiếu mục đích 3/4, không có CMP, **DNT** hoặc **GPC** → `requestNonPersonalizedAds = 1` (+ `google_restrict_data_processing` với DNT/GPC).
- **App:** UMP (`requestConsentInfo` → `showConsentForm` khi `REQUIRED`), `canRequestAds = false` → không quảng cáo; iOS hỏi ATT sau UMP; `maxAdContentRating: General`, `tagForChildDirectedTreatment: false` (đối tượng 13+).
- Chính sách: `content/legal/{en,vi}/privacy.html` §7 (vị trí, đồng ý, Google nhận gì, Lexkite đo gì, SSV) + §10 (< 13, Lớp học) → 13 ngôn ngữ dịch bằng `i18n.yml` (`build-legal.mjs --translate`). Store: `docs/STORE-READINESS.md` §E. Niêm yết iOS đổi "Không quảng cáo, không theo dõi" → "Không quảng cáo trong lúc học, làm quiz hay thi" (đúng cả trước và sau khi bật).

## 4. Kỹ thuật
- **Vỏ** `web/js/ads.js` (trong SHELL, ≤ 1 KB gz): `Ads.on/slot/rewarded/quota`; cờ tắt → `slot()` = '' và không tải. Cờ bật → sau `load` + rảnh 3 s tải `js/ads/config.js → policy.js → run.js`.
- **Web có thưởng** `run.js` (`webRewarded`): Google Publisher Tag `defineOutOfPageSlot(path, OutOfPageFormat.REWARDED)` sau cùng cổng CMP (từ chối → không tải; NPA/RDP qua `setPrivacySettings`); `rewardedSlotReady` → `makeRewardedVisible`, `rewardedSlotGranted` = được thưởng, `rewardedSlotClosed` → `destroySlots`, 10 s không sẵn sàng / `isEmpty` = không có quảng cáo. Luật: web chỉ khi có ô và lý do không cần SSV (`WEB_REW`: streak/retry/xp2 – +lượt AI/Roleplay chỉ app).
- **Web** `run.js`: lấp `.ad-slot[data-ad]` (MutationObserver trên `#view`), `<ins>` 300×250 cố định; `data-ad-status=unfilled` → ô giữ chỗ, ẩn `ins` (0 CLS). Trang tĩnh: `scripts/build-blog.mjs` chèn ô + `/js/ads/static.js` **chỉ khi** `enabled` + có ô `blog` (hiện 0 byte).
- **App** `@capacitor-community/admob` (cài bằng `ADS_NATIVE=1 bash scripts/build-mobile.sh` → `scripts/mobile-ads.mjs`: dependency + `APPLICATION_ID` Android + `GADApplicationIdentifier`/ATT/SKAdNetwork iOS; `--disable` gỡ sạch). Mặc định build KHÔNG có SDK → khai báo store "No ads" vẫn đúng.
- **SSV** `GET /api/ads-reward` (bật bằng biến Pages `ADS_SSV=1`; URL này dán vào AdMob › ad unit có thưởng › Server-side verification): xác minh ECDSA P-256 bằng `gstatic.com/admob/reward/verifier-keys.json`, chống trùng `transaction_id`, trừ `quota_count` của `ai|d:<máy>` (+ `u:<uid>`).
- **ads.txt / app-ads.txt** ở gốc (`web/`) với `pub-0000000000000000` giữ chỗ; `scripts/build-ads.mjs` ghi số thật vào `dist/` khi `web.client` có giá trị.
- Add-on: `scripts/build-extension.sh` loại `js/ads/` + `js/i18n/*/ads.js`; vỏ tự tắt trên `chrome-extension:`.

## 5. Đo lường + cổng giữ chân
- 1 beacon/phiên `POST /api/hit {t:'ad', plat, c:'a'|'h', ev:{'imp:home':n…}, m:{n1,r1,r7,ses,dur}, k:'pa'|'npa'|'deny'|'na'}` → `ext_events` kind `ad:<ev>:<plat>:<place>`, `adc:<cohort>:<metric>`, `adk:<eea|us|row>:<consent>` (vùng suy từ mã nước Cloudflare, không lưu IP), `adg:<hệ số%>` (lịch sử cổng). Máy quản trị (`lk.noTrack`) không gửi.
- **Doanh thu = proxy** (hiển thị × eCPM đặt tay) tới khi nối AdSense Management API / AdMob Reporting API (`_ads.js reporting()` – stub, cần OAuth của chủ).
- **Cổng giữ chân** (`guardOf`): cửa sổ 14 ngày kết thúc hôm qua; mỗi nhóm ≥ `ads_guard_min` máy mới; tụt (D1, D7, thời lượng phiên) > X % → ×0,5 (giãn gấp đôi), > 2X % → ×0,25 (**tắt toàn màn hình**); tốt lại → hồi 1 nấc mỗi lượt. Chạy trong `hit.js` ≤ 1 lần/giờ, ghi `config.ads_guard` + `adg:` rồi xoá đệm cấu hình.
- **Quản trị › 💰 Quảng cáo** (`web/js/admin-ads.js`, tải lười, kiểu trung tâm Video): Tổng quan (cờ 3 nền tảng + công tắc khẩn cấp + doanh thu/ngày, eCPM, lượt hiển thị, lấp đầy) · Vị trí (yêu cầu/hiển thị/lấp đầy/CTR/thưởng/doanh thu theo nền tảng × vị trí) · Tần suất (sửa trong khoảng an toàn + eCPM + X) · Giữ chân (D1/D7/thời lượng a vs h, xu hướng tuần, trạng thái + lịch sử tự giảm) · Đồng ý theo vùng.

## 6. Test (npm test + CI)
`scripts/test/ads.mjs` (103: luật đặt chỗ 30 route + ngữ cảnh cấm, tần suất, kẹp quản trị, cổng giữ chân, khung +0 ≤ 1 KB, add-on, a11y nhãn/focus/bẫy focus hộp thoại, SSV chữ ký thật, ads.txt, EXPLAIN không SCAN, mobile-ads bật/tắt sạch) · `scripts/test/ads-admin.mjs` (5 mục, công tắc khẩn cấp có xác nhận, tần suất ngoài khoảng bị chặn, EN không lộ chữ Việt, axe) · `scripts/test/ads-cls.mjs` (Chromium, `dist-ui.yml`: CLS = 0 có/không quảng cáo, không yêu cầu trước CMP, EEA từ chối → 0 yêu cầu, DNT → NPA + RDP) · `size-budget` (khung 375/377 KB).
- **Quảng cáo demo THẬT của Google (mạng thật, KHÔNG trong npm test)** – `.github/workflows/ads-demo.yml` (workflow_dispatch + thứ Hai hằng tuần + PR sửa chính các file test):
  - Web `scripts/test/ads-demo.mjs` (Google Chrome thật – Chromium thiếu H.264 nên video demo không chạy; Pixel 7): vỏ `Ads.rewarded('retry')` → GPT ô công khai `/22639388115/rewarded_web_example` (`web.testing` chỉ bật trong test): GPT tải sau CMP, `rewardedSlotReady` có fill, lớp phủ hiện, ghi `granted`, đếm `req/show:rew`, **CLS = 0**. Ảnh + JSON ở artifact `ads-web`.
  - Android `scripts/test/ads-demo-android.mjs` (giả lập API 34, `ADS_NATIVE=1`, `testing: true` → chỉ mã thử `3940256099942544`; bước đầu chặn nếu không phải mã thử, log có mã thật = đỏ): `lk.cfg` `ads_android=1` qua DevTools WebView, `AdsRun.rewarded('ai')` → `onRewardedVideoAdLoaded` + `onRewardedVideoAdReward`, `AdsRun.inter()` → `interstitialAdLoaded` + `interstitialAdShowed`; ảnh ở artifact `ads-android`.

## 7. Bật dần (khi chủ đã có tài khoản)
1. Dán `ca-pub-…` + mã ô `home`/`blog` vào `web/js/ads/config.js`, `enabled: true` → ship (ads.txt tự đúng số). AdSense › Sites: thêm lexkite.com, chờ "Ready"; Privacy & messaging: GDPR + US states → Publish.
2. Quản trị › Quảng cáo › bật **Web** → theo dõi 7 ngày: CLS (Quản trị › Phân tích), lấp đầy, cổng giữ chân.
3. AdMob: tạo app iOS/Android + 3 ad unit (banner, interstitial, rewarded – rewarded bật SSV trỏ `https://lexkite.com/api/ads-reward`) → dán mã, `testing:false` chỉ ở bản phát hành; `ADS_SSV=1`; build `ADS_NATIVE=1`; store §E; bật **Android** rồi **iOS**.
4. Nối Reporting API (thay proxy doanh thu) – việc sau.
