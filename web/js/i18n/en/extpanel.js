/* Chữ chỉ dùng trong bảng "Dịch đoạn đã chọn" của add-on (extension/content.js có bảng EN riêng; ngôn ngữ khác đọc web/js/i18n/<lang>.js).
 * Nhóm tải lười (LAZY trong scripts/build-i18n.sh): KHÔNG gộp vào en.js của web → không tăng khung app; i18n-qa/i18n-missing vẫn kiểm đủ 13 ngôn ngữ. */
(function (g) { const D = g.I18N_DICT = g.I18N_DICT || {}; D.en = Object.assign(D.en || {}, {
  '⚡ Bật AI trên máy (miễn phí, riêng tư)': '⚡ Enable on-device AI (free, private)',
  'Chrome tải AI trên máy một lần (~2 GB) – sau đó dùng được cả khi ngoại tuyến.': 'Chrome downloads the on-device AI once (~2 GB) – after that it works even offline.',
  '⬇️ Đang tải AI trên máy… {pct}%': '⬇️ Downloading on-device AI… {pct}%',
  '✓ AI trên máy đã sẵn sàng': '✓ On-device AI is ready',
  'Không bật được AI trên máy – thử lại sau.': 'Could not enable on-device AI – try again later.',
  '💻 AI trên máy – riêng tư, không gửi đi đâu': '💻 On-device AI – private, nothing leaves your device',
  '🎁 Còn {n} lượt AI miễn phí hôm nay': '🎁 {n} free AI explanations left today',
  'Ngôn ngữ nhận diện → ngôn ngữ dịch': 'Detected language → translation language',
  'Chép bản dịch': 'Copy translation',
  'Đoạn này đã là tiếng Anh – nghe, tra từng từ hoặc xem giải thích sâu bên dưới.': 'This text is already in English – listen to it, look up words or get a deep explanation below.',
  'Đoạn này đã ở ngôn ngữ của bạn nên được dịch sang tiếng Anh.': 'This text is already in your language, so it was translated into English.',
}); })(typeof self !== 'undefined' ? self : this);
