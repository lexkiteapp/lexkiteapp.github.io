#!/bin/bash
# Gộp từ điển giao diện theo nhóm (web/js/i18n/en/*.js) thành 1 file js/i18n/en.js (1 request, thống nhất thuật ngữ)
cd "$(dirname "$0")/../web/js/i18n" || exit 1
# Nhóm tải lười: KHÔNG gộp vào en.js (khung app có ngân sách dung lượng) – module tự nạp js/i18n/en/<nhóm>.js khi mở.
# structs toefl league call handoff: chuỗi của trang tải lười → nạp qua gói i18nx (App.need luôn nạp trước mọi gói, js/app.js).
# verbs exams skills: chuỗi trang Chia động từ/Sửa ngữ pháp, đề thi, Ngữ pháp/Speaking/Phát âm → gói i18nl (App.need); khóa khung app/add-on cần ngay ở en/xcore.js.
# i18n-missing.mjs / i18n-qa.mjs đọc danh sách này để kiểm cả các nhóm đó.
LAZY="report anki usage explain account extpanel share export criteria notices pathx rpbasic resources qtips quick lfx wfeed classroom lvideo confidence rmodes nextstep ads remind structs toefl league call handoff pron ota speakt ideast verbs exams skills"
{
  echo '/* English UI – FILE SINH TỰ ĐỘNG từ js/i18n/en/*.js bằng scripts/build-i18n.sh. Đừng sửa tay. */'
  for f in core topics writing xcore study shell ext hubs writecheck roleplay streak; do cat "en/$f.js"; echo; done
  cat <<'X'
/* Thống nhất thuật ngữ khi nhiều nhóm dùng chung 1 khóa */
(function (g) { Object.assign(g.I18N_DICT.en, {
  'Kiểm tra': 'Check', 'Tiếp tục': 'Continue', 'Bỏ qua': 'Skip', 'Điền từ': 'Fill in the blank', 'Chọn nghĩa đúng': 'Choose the correct meaning',
  'Học thông minh': 'Smart Learn', 'Phòng viết': 'Writing room', 'Đọc hiểu': 'Reading', 'Đáp án': 'Answer', 'Tra từ': 'Look up a word', 'Dịch câu': 'Translate',
  'Máy nghe được: “{heard}”': 'We heard: “{heard}”', 'Chế độ luyện tập': 'Practice modes',
}); })(typeof self !== 'undefined' ? self : this);
X
} > en.js
node ../../../scripts/gen-hero.mjs >/dev/null  # khung trang chào mừng dựng sẵn (LCP nhanh)
node ../../../scripts/split-i18n.mjs >/dev/null # tách nhóm tải lười cho 13 ngôn ngữ ngoài en
