// Nội dung & phong cách dùng chung cho ảnh cửa hàng app (Google Play: scripts/play-shots.mjs · App Store: scripts/ios-shots.mjs).
// Chữ trên ảnh chỉ nói đúng tính năng có thật trong web/js; không "best/#1", không giá, không tên nền tảng khác.
import fs from 'fs';
export const ICON = 'data:image/svg+xml;base64,' + fs.readFileSync('web/icons/icon.svg').toString('base64');
// Linh vật Kit: chỉ từ nguồn duy nhất web/js/kit.js (docs/BRAND-RULES.md)
export const KIT = (() => { const g = {}; new Function('window', 'self', fs.readFileSync('web/js/kit.js', 'utf8'))(g, g); return g.Kit.svg('cheer', 230, false); })();
export const FONT = '<link rel="preconnect" href="https://fonts.gstatic.com"><link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@500;600;700;800&display=block" rel="stylesheet">';

// Màn hình: [route, chữ trên ảnh theo ngôn ngữ, tùy chọn]. Chữ chỉ nói đúng tính năng có thật trong web/js.
export const SCREENS = [
  { r: 'home', en: ['No login needed', 'Learn English words <em>a little every day</em>', 'A daily plan of new words and reviews, built around your goal.'],
    vi: ['Không cần đăng nhập', 'Học từ vựng tiếng Anh <em>mỗi ngày một chút</em>', 'Kế hoạch học từ mới và ôn tập mỗi ngày theo mục tiêu của bạn.'] },
  { r: 'review', flip: true, en: ['FSRS spaced repetition', 'Review right <em>before you forget</em>', 'Rate how well you remembered – FSRS schedules the next review.'],
    vi: ['Lặp lại ngắt quãng FSRS', 'Ôn đúng lúc <em>sắp quên</em>', 'Chấm mức độ nhớ – FSRS tự hẹn lần ôn tiếp theo.'] },
  { r: 'dict/resilience', wait: 6000, en: ['Dictionary', 'Every word, <em>clearly explained</em>', 'UK & US pronunciation, meanings by part of speech and examples.'],
    vi: ['Tra từ', 'Mỗi từ <em>giải thích rõ ràng</em>', 'Phát âm Anh–Anh, Anh–Mỹ, nghĩa theo từ loại và ví dụ.'] },
  { r: 'tests', en: ['IELTS · TOEIC · TOEFL', 'Practice tests <em>with explanations</em>', 'Placement test, timed mock tests and your score history.'],
    vi: ['IELTS · TOEIC · TOEFL', 'Đề luyện thi <em>có giải thích</em>', 'Kiểm tra trình độ, thi thử tính giờ và lịch sử điểm.'] },
  { r: 'usage/affect-effect', en: ['Usage & grammar', 'Fix the mistakes <em>learners often make</em>', 'Affect or effect? Short, clear notes with examples.'],
    vi: ['Cách dùng & ngữ pháp', 'Sửa những lỗi <em>người học hay mắc</em>', 'Affect hay effect? Giải thích ngắn gọn, có ví dụ.'] },
  { r: 'stats', en: ['Progress', 'Watch your <em>streak grow</em>', 'Daily goals, streaks, XP and words you have mastered.'],
    vi: ['Tiến độ', 'Chuỗi ngày học <em>dài thêm mỗi ngày</em>', 'Mục tiêu ngày, chuỗi ngày, XP và số từ đã thuộc.'] },
  { r: 'practice', dark: true, en: ['Dark mode · 15 languages', 'Study your way, <em>day or night</em>', 'Flashcards, games, listening and speaking practice.'],
    vi: ['Chế độ tối · 15 ngôn ngữ', 'Học theo cách của bạn, <em>ngày hay đêm</em>', 'Flashcard, trò chơi, luyện nghe và luyện nói.'] },
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
