// Tab mới: câu đố 10 s (extension/nt-quiz.js + nối trong newtab.js) – hàm thuần, không trình duyệt. Thoát 1 nếu lỗi.
import { createRequire } from 'node:module'; import fs from 'node:fs'; import assert from 'node:assert/strict';
const Q = createRequire(import.meta.url)('../../extension/nt-quiz.js');
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const pool = ['a', 'b', 'c', 'd', 'e'].map((w, i) => ({ word: w, meaning: 'nghĩa ' + i }));
const t = { word: 'house', meaning: 'nhà' };
for (let s = 0; s < 200; s++) {
  let x = s + 1; const rnd = () => ((x = (x * 16807) % 2147483647) / 2147483647);
  const q = Q.build(t, pool, rnd);
  ok(q && q.choices.length === 4 && new Set(q.choices).size === 4, 'đúng 4 lựa chọn khác nhau');
  ok(q.choices[q.answer] === 'nhà', 'chỉ số đáp án đúng');
}
ok(Q.build(t, pool.slice(0, 2)) === null, 'thiếu mồi → không dựng (vào thẳng hàng thẻ)');
ok(Q.build(t, [...pool.slice(0, 2), { word: 'x', meaning: 'NHÀ' }, { word: 'house', meaning: 'khác' }]) === null, 'mồi trùng nghĩa/trùng từ bị loại');
ok(Q.build({ word: 'w', meaning: '' }, pool) === null, 'thẻ không có nghĩa → bỏ');
ok(Q.meaning({ s: [['n', 'nhà', 'a building']] }, null, 'vi') === 'nhà' && Q.meaning({ s: [['n', 'nhà', 'a building']] }, null, 'es') === 'a building', 'nghĩa theo ngôn ngữ giao diện');
ok(Q.meaning(null, { vi: 'x' }, 'es') === 'x' && Q.meaning(null, null, 'vi') === '', 'dự phòng thẻ người dùng');
ok(Q.meaning({ s: [['n', 'a', 'w '.repeat(80)]] }, null, 'en').length <= 90, 'nghĩa dài bị cắt');
const now = 1e12;
ok(Q.canShow(0, now) && !Q.canShow(now - 60e3, now) && Q.canShow(now - Q.COOLDOWN_MS, now) && Q.canShow(now + 5e6, now), 'tối đa 1 câu / 30 phút (đồng hồ lùi vẫn cho)');
ok(Q.SECONDS === 10, '≤ 10 s');
// nối dây: html nạp nt-quiz.js trước newtab.js; newtab.js chấm FSRS, không quyền/mạng mới
const html = fs.readFileSync('extension/newtab.html', 'utf8'), js = fs.readFileSync('extension/newtab.js', 'utf8');
ok(html.indexOf('nt-quiz.js') > 0 && html.indexOf('nt-quiz.js') < html.indexOf('newtab.js'), 'nt-quiz.js nạp trước newtab.js');
ok(/SRS\.review\(card\.srs, graded\)/.test(js) && /ntQz/.test(js) && /ntQzSkip/.test(js), 'có chấm FSRS + Bỏ qua + giới hạn tần suất');
// hồi quy 06/11 (ext-e2e đỏ '0 ms'): thẻ đầu phải vẽ + đặt ntMs TRƯỚC câu đố, không bị câu đố (đến 10 s) chặn
const iShow = js.lastIndexOf('await show();'), iMs = js.indexOf('dataset.ntMs ='), iQz = js.indexOf('await runQuiz()');
ok(iShow > 0 && iMs > iShow && iQz > iMs, 'thẻ đầu vẽ + ntMs trước khi chạy câu đố');
ok(/reshow/.test(js.slice(iQz)), 'sau câu đố vẽ lại thẻ đang xem');
ok(!/fetch\(|XMLHttpRequest/.test(fs.readFileSync('extension/nt-quiz.js', 'utf8')), 'nt-quiz.js không mạng');
// 15 ngôn ngữ đủ khóa, giữ {s}
const keys = ['ntQzTag', 'ntQzQ', 'ntQzTime', 'ntQzRight', 'ntQzWrong', 'ntQzTimeout', 'ntQzSkip'];
const langs = fs.readdirSync('extension/_locales'); ok(langs.length === 15, '15 ngôn ngữ add-on');
const en = JSON.parse(fs.readFileSync('extension/_locales/en/messages.json', 'utf8'));
for (const l of langs) {
  const m = JSON.parse(fs.readFileSync(`extension/_locales/${l}/messages.json`, 'utf8'));
  for (const k of keys) { ok(m[k] && m[k].message && m[k].message.trim(), `${l}.${k}`); if (l !== 'en') ok(m[k].message !== en[k].message || /^(Skip)$/.test(m[k].message) === false, `${l}.${k} đã dịch`); }
  ok(m.ntQzTime.message.includes('{s}'), `${l}: giữ {s}`);
}
console.log(`ext-newtab-quiz: ${n} kiểm tra PASS`);
