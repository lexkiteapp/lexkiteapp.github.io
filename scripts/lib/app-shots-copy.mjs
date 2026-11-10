// Nội dung & phong cách dùng chung cho ảnh cửa hàng app (Google Play: scripts/play-shots.mjs · App Store: scripts/ios-shots.mjs).
// Chữ trên ảnh chỉ nói đúng tính năng có thật trong web/js; không "best/#1", không giá, không tên nền tảng khác.
import fs from 'fs';
export const ICON = 'data:image/svg+xml;base64,' + fs.readFileSync('web/icons/icon.svg').toString('base64');
export const FONT = '<link rel="preconnect" href="https://fonts.gstatic.com"><link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@500;600;700;800&display=block" rel="stylesheet">';

// Màn hình (giao diện Stitch v2, 10/11): route, chữ theo ngôn ngữ [nhãn, tiêu đề (<em> = chữ nhấn), phụ đề], chip nổi 'emoji|chữ' tuỳ chọn.
// Chữ chỉ nói đúng tính năng có thật trong web/js (home = Hôm nay + Lộ trình, lesson = js/lesson, vocab-hub.js, hubs.js skills, call.js, retention.js streak).
export const SCREENS = [
  { r: 'home', wait: 6000, chip: { en: '🔥|Daily streak', vi: '🔥|Chuỗi ngày học' },
    en: ['Your daily path', 'Learn English <em>a little every day</em>', 'A short daily path of new words, reviews and practice – built around your goal.'],
    vi: ['Lộ trình mỗi ngày', 'Học tiếng Anh <em>mỗi ngày một chút</em>', 'Lộ trình ngắn mỗi ngày: từ mới, ôn tập và luyện tập theo mục tiêu của bạn.'] },
  { r: 'lesson?demo=1', wait: 6000, tap: ['.lsn-map .lsn-start'], en: ['Bite-size lessons', 'Short lessons <em>that really stick</em>', 'Listen, tap, speak and type – every answer checked instantly.'],
    vi: ['Bài học ngắn', 'Bài học ngắn, <em>nhớ thật lâu</em>', 'Nghe, chạm, nói và gõ – mỗi câu trả lời được chấm ngay.'] },
  { r: 'vocab', en: ['Vocabulary', 'Words you will <em>actually remember</em>', 'FSRS spaced repetition brings each word back right before you forget.'],
    vi: ['Từ vựng', 'Từ vựng <em>nhớ thật sự</em>', 'Lặp lại ngắt quãng FSRS đưa từ quay lại đúng lúc bạn sắp quên.'] },
  { r: 'skills', en: ['Four skills', 'Listening, speaking, <em>reading &amp; writing</em>', 'See which skill to practise next and watch every level grow.'],
    vi: ['Bốn kỹ năng', 'Nghe, nói, <em>đọc &amp; viết</em>', 'Biết ngay nên luyện kỹ năng nào tiếp và thấy từng cấp độ tăng lên.'] },
  { r: 'call', wait: 6000, chip: { en: '🎙️|Speak out loud', vi: '🎙️|Nói thành tiếng' },
    en: ['Speaking practice', 'Video calls with <em>Ama &amp; Carlos</em>', 'Your teachers ask, you answer out loud – then see fixes and a fluency note.'],
    vi: ['Luyện nói', 'Gọi video cùng <em>Ama &amp; Carlos</em>', 'Giáo viên hỏi, bạn trả lời thành tiếng – rồi xem lỗi đã sửa và nhận xét độ trôi chảy.'] },
  { r: 'streak', dark: true, en: ['Streaks &amp; goals', 'Keep your <em>streak alive</em>', 'Daily goals, streaks and XP – day or night, in 15 languages.'],
    vi: ['Chuỗi &amp; mục tiêu', 'Giữ <em>chuỗi ngày học</em>', 'Mục tiêu ngày, chuỗi ngày và XP – ngày hay đêm, 15 ngôn ngữ.'] },
  { r: 'tests', dark: true, en: ['IELTS · TOEIC · TOEFL', 'Practice tests <em>with explanations</em>', 'Placement test, timed mock tests and your score history.'],
    vi: ['IELTS · TOEIC · TOEFL', 'Đề luyện thi <em>có giải thích</em>', 'Kiểm tra trình độ, thi thử tính giờ và lịch sử điểm.'] },
];
export const FEATURE = {
  en: ['English vocabulary <em>&amp; exam practice</em>', ['No login', 'Works offline', 'FSRS flashcards', 'IELTS · TOEIC · TOEFL']],
  vi: ['Từ vựng tiếng Anh <em>&amp; luyện thi</em>', ['Không cần đăng nhập', 'Học offline', 'Flashcard FSRS', 'IELTS · TOEIC · TOEFL']],
};

// Ẩn thứ chỉ có trên web / thông báo tạm (toast "chế độ thử nghiệm", nút cài PWA, nút báo lỗi) – app Android không hiện
export const HIDE = '#toast,.install-nudge,#installBtn,.lk-rep,#lkRep{display:none!important}';

export const BG = `background:radial-gradient(900px 700px at 100% -5%,rgba(255,176,84,.30),transparent 60%),radial-gradient(900px 800px at -15% 105%,rgba(31,122,114,.55),transparent 60%),linear-gradient(165deg,#0B3233,#0F3D3E 45%,#123f40);`;
export const BASECSS = `*{box-sizing:border-box;margin:0}body{overflow:hidden;font-family:"Be Vietnam Pro","Noto Sans","Noto Sans CJK JP",system-ui,sans-serif;color:#fff;${BG}position:relative}
em{font-style:normal;background:linear-gradient(90deg,#FFB054,#F2553B);-webkit-background-clip:text;background-clip:text;color:transparent}
.brand{display:flex;align-items:center;gap:14px;font-weight:800;letter-spacing:-.02em}.brand img{border-radius:22%;box-shadow:0 8px 22px rgba(0,0,0,.35)}.brand b{color:#FFB054;font-weight:800}`;
