/* Cấu hình quảng cáo Lexkite – 1 chuẩn chung: web = Google AdSense, app iOS/Android = Google AdMob, add-on = không quảng cáo.
 * Điền mã khi tài khoản AdSense/AdMob được duyệt rồi đổi enabled → true. Để trống = tắt (không tải gì, không ảnh hưởng tốc độ). */
(function (g) {
  g.ADS_CONFIG = {
    enabled: false,
    // ---- Web: Google AdSense ----
    web: {
      client: '', // vd. 'ca-pub-1234567890123456'
      // Mỗi vị trí 1 ad unit (Ads → By ad unit → Display ads, kiểu Responsive)
      slots: { home: '', list: '', article: '', result: '' },
    },
    // ---- App: Google AdMob (Capacitor plugin @capacitor-community/admob) ----
    native: {
      testing: true, // true = dùng quảng cáo thử của Google (bắt buộc khi phát triển, tránh bị khóa tài khoản)
      android: { appId: '', banner: '', interstitial: '', rewarded: '' },
      ios: { appId: '', banner: '', interstitial: '', rewarded: '' },
    },
    // ---- Quy tắc trải nghiệm (áp dụng cho mọi nền tảng) ----
    rules: {
      interstitialGapMin: 4,     // tối thiểu 4 phút giữa 2 quảng cáo toàn màn hình
      interstitialAfterDays: 1,  // không hiện toàn màn hình trong ngày đầu dùng app
      // Không bao giờ hiện quảng cáo trong lúc học/làm bài
      quietRoutes: ['review', 'practice', 'listen', 'listen-test', 'dictation', 'toeic-test', 'toeic-r', 'toefl-p', 'mock', 'rtype', 'cbt', 'read', 'write', 'task1', 'letters', 'speaking', 'grammar', 'pron', 'placement', 'welcome'],
    },
  };
})(typeof self !== 'undefined' ? self : this);
