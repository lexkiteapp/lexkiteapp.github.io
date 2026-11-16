// Hàng đợi mở rộng kho trang từ (docs/SEO-DICT-PAGES.md §13): từ ngoài kho hiện tại, xếp theo điểm giá trị (CEFR + nhóm IELTS/AWL/TOEIC/NGSL + độ giàu dữ liệu),
// lọc cứng: 1 từ (hoặc cụm ngắn), có nghĩa bản địa thật (cờ ≠ 0) ở CẢ 13 ngôn ngữ + vi, chưa có trong pool-ext.json. In JSON (stdout) làm đầu vào cho người/AI soạn add/*-bN.json.
// Dùng: node scripts/dict/ext-queue.mjs [n=250]
import { all, ranked, gloss, topicOf } from '../lib/seo-words.mjs';
import { LANGS } from '../lib/seo-pages-i18n.mjs';
const N = +process.argv[2] || 250, have = new Set(ranked);
const L13 = LANGS.filter(l => l !== 'en' && l !== 'vi');
const rows = all.filter(e => !have.has(e) && e.vi && !/\s/.test(e.word) && e.word.length >= 3 && L13.every(l => { const g = gloss(l, e); return g && g[0] && g[1] !== 0 && g[0].toLowerCase() !== e.word.toLowerCase(); })).slice(0, N);
console.log(JSON.stringify(rows.map(e => ({ word: e.word, pos: e.pos, level: e.level, topic: (topicOf.get(e.topic) || {}).group || e.topic, ipa: e.ipa, ipaUS: e.ipaUS, def: e.def, ex: [e.ex, e.ex2].filter(Boolean), col: e.col || [], syn: e.syn || [] })), null, 1));
