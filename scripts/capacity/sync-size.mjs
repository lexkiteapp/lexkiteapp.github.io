// Đo kích thước ảnh chụp đồng bộ (snapshot) của 1 người học theo đúng lược đồ web/js/core.js (Cards.make + SRS.newState) và slim() trong web/js/sync.js.
// Thẻ thư viện chỉ giữ phần riêng (lịch ôn, ngày thêm, L:1); 10 % thẻ tự thêm giữ đủ trường + 1 câu ngữ cảnh.
// Chạy: node scripts/capacity/sync-size.mjs  → bảng JSON thô / gzip cho 100 · 500 · 2.000 · 5.000 · 20.000 thẻ.
import zlib from 'node:zlib';
const T0 = 1_760_000_000_000, day = 864e5;
const srs = i => ({ ef: 2.5 - (i % 7) / 10, interval: (i % 60) + 1, reps: i % 12, lapses: i % 3, due: T0 + (i % 90) * day, last: T0 - (i % 30) * day, step: i % 3 });
const libCard = i => ({ word: 'word' + i, topic: 'ielts', imageCredit: null, added: T0 - (i % 365) * day, srs: srs(i), L: 1 });
const ownCard = i => ({ word: 'custom phrase ' + i, ipa: '/ˈkʌstəm/', pos: 'n', vi: 'cụm từ tự thêm ' + i, def: 'a phrase the learner saved while reading an article', ex: 'She saved this phrase from the news.', col: ['save a phrase'], syn: [], level: 'B2', topic: 'mine', emoji: '📘', imageCredit: null,
  contexts: [{ text: 'The learner met custom phrase ' + i + ' in a long article about climate.', source: 'https://example.com/a' + i, title: 'Article ' + i, at: T0 - i * 1000 }], added: T0 - (i % 365) * day, srs: srs(i) });
function snapshot(n) {
  const cards = {}; for (let i = 0; i < n; i++) { const c = i % 10 === 9 ? ownCard(i) : libCard(i); cards[c.word.toLowerCase()] = c; }
  const days = {}, gdays = {}; for (let d = 0; d < 365; d++) { const k = new Date(T0 - d * day).toISOString().slice(0, 10); days[k] = 20 + d % 30; gdays[k] = { xp: 120 + d, review: 20, quiz: 3, listen: 2 }; }
  const done = m => Object.fromEntries(Array.from({ length: m }, (_, i) => ['u' + i, 80 + i % 20]));
  const game = { xp: 50000, days: gdays, total: { review: 9000, quiz: 800 }, best: { match: 31 }, unitDone: done(200), listenDone: done(150), grammarDone: done(120), pronDone: done(80), listenBest: done(60), badges: done(30), readDone: done(100), freezes: 2, freezeAt: T0, frozen: {} };
  const deleted = Object.fromEntries(Array.from({ length: Math.round(n / 50) }, (_, i) => ['gone' + i, T0 - i * day]));
  return { v: 2, cards, deleted, stats: { days, newToday: { day: '2026-10-27', n: 12 }, hours: Array(24).fill(3) }, game, settings: { exam: 'ielts', goal: 20, lang: 'vi', sfx: true }, settingsAt: T0 };
}
const rows = [];
for (const n of [100, 500, 2000, 5000, 20000]) { const j = JSON.stringify(snapshot(n)); rows.push({ cards: n, rawKB: +(j.length / 1024).toFixed(1), gzipKB: +(zlib.gzipSync(j, { level: 6 }).length / 1024).toFixed(1) }); }
console.table(rows);
