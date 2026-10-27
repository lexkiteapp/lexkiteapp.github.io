/* Cấu hình quảng cáo Lexkite (tải lười – KHÔNG nằm trong khung app). Thiết kế + quy trình bật: docs/ADS.md.
 * Web = Google AdSense · app iOS/Android = Google AdMob · add-on Chrome = KHÔNG BAO GIỜ có quảng cáo.
 * Bật thật cần CẢ HAI: (1) enabled = true + mã nhà xuất bản ở đây, (2) Quản trị › Cài đặt › Quảng cáo bật đúng nền tảng (cờ từ xa ads_web/ads_android/ads_ios).
 * Hiện mọi cờ TẮT; app gốc chỉ dùng mã QUẢNG CÁO THỬ của Google (testing: true) cho tới khi chủ dán mã thật. */
(function (g) {
  g.ADS_CONFIG = {
    enabled: false,
    // ---- Web: Google AdSense (Ads → By ad unit → Display, kích thước cố định 300×250 / responsive trong ô cố định) ----
    web: {
      client: 'ca-pub-2290668854727752', // tài khoản AdSense của LLC (27/10/2026) – cùng số với web/ads.txt; enabled vẫn false
      slots: { home: '', blog: '', done: '' }, // done = thẻ kết quả cuối lượt luyện (điểm nghỉ, ô cố định 0 CLS)
    },
    // ---- App: Google AdMob (@capacitor-community/admob, cài bằng ADS_NATIVE=1 scripts/mobile-ads.mjs) ----
    native: {
      testing: true, // true = mã thử của Google (bắt buộc khi phát triển – bấm quảng cáo thật của chính mình = khóa tài khoản)
      // Mã thử chính thức của Google (developers.google.com/admob/android/test-ads, /ios/test-ads) – thay bằng mã thật khi tài khoản AdMob được duyệt
      android: { appId: 'ca-app-pub-3940256099942544~3347511713', banner: 'ca-app-pub-3940256099942544/9214589741', interstitial: 'ca-app-pub-3940256099942544/1033173712', rewarded: 'ca-app-pub-3940256099942544/5224354917' },
      ios: { appId: 'ca-app-pub-3940256099942544~1458002511', banner: 'ca-app-pub-3940256099942544/2435281174', interstitial: 'ca-app-pub-3940256099942544/4411468910', rewarded: 'ca-app-pub-3940256099942544/1712485313' },
    },
  };
})(typeof self !== 'undefined' ? self : this);
