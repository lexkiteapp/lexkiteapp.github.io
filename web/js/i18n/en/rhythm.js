/* English UI – rhythm (lazy group, LAZY + CPACK_I18N: gói ngôn ngữ ra web/cpack/i18n/rhythm-<lang>.js, chỉ tải theo route game Nhịp điệu). Chuỗi của cpack/play-app/play-rhythm.js. */
(function (g) {
  const D = g.I18N_DICT = g.I18N_DICT || {};
  D.en = Object.assign(D.en || {}, {
   "Từ NHẤN (to, đậm, có chấm ●) thì chạm đúng nhịp; từ yếu (a, the, to…) thì để im.": "STRESSED words (big, bold, with ●): tap right on the beat. Weak words (a, the, to…): stay silent.",
   "Gõ phím Cách (Space) hoặc chạm nút to. Có {n} câu, nhịp nhanh dần.": "Press Space or tap the big button. {n} sentences, and the beat speeds up.",
   "Câu số {a}/{b}": "Sentence {a}/{b}",
   "CHẠM": "TAP",
   "Chạm vào từ nhấn": "Tap the stressed word",
   "Tắt âm": "Mute",
   "Bật âm": "Unmute",
   "Chuẩn!": "Spot on!",
   "Tốt": "Good",
   "Từ này yếu – để im": "Weak word – stay silent",
   "Lệch nhịp": "Off the beat",
   "Chạm đúng {a}/{b} từ nhấn": "Hit {a}/{b} stressed words",
   "Độ chính xác {n}%": "Accuracy {n}%",
   "Từ nhấn bị lỡ": "Stressed words you missed"
  });
})(typeof self !== 'undefined' ? self : this);
