#!/usr/bin/env node
// Hồi quy bộ chấm sư phạm learnability (P0-H, docs/specs/learnability.md): luật đo đúng trên ca biết trước + báo cáo đủ mảng/tiêu chí
// + hồi quy lỗi 02/11: cặp dễ nhầm soạn tay (content/video/scripts/bank/mixups.jsonl, pid c:mixup:a-b) phải vào web/js/lesson/gold.js.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('✗', m); } };
const L = await import('../content-qa/learnability.mjs'); // chạy bộ chấm 1 lần (ghi reports/learnability.json + content/pipeline/LEARN.md)

// 1. Phản hồi "vì sao": chỉ "Đúng" hoặc quá ngắn = 0; nhắc đáp án/ lý do = 1
ok(L.specific('Đúng.', ['was cooking']) === 0, 'specific: "Đúng." phải = 0');
ok(L.specific('Hành động đang diễn ra thì bị xen ngang → was cooking.', ['was cooking']) === 1, 'specific: giải thích có lý do + đáp án phải = 1');
// 2. i+1: câu A1 toàn từ A1 → 0 % vượt; chèn từ C1/C2 → > 0
ok(L.overRate(['I like my dog and my house.'], 'A1') === 0, 'overRate: câu A1 dễ phải 0 %');
ok(L.overRate(['The ubiquitous paradigm is inherently ambiguous.'], 'A1') > 0.3, 'overRate: câu đầy từ C1–C2 ở bài A1 phải > 30 %');
// 3. Nhóm dễ nhầm (tầng 0): cặp thật vào, cùng họ / biến thể chính tả ra
for (const [a, b, want] of [['country', 'county', false], ['adopt', 'adapt', false], ['connect', 'connector', true], ['stabilize', 'stabilise', true], ['office', 'officer', true]])
  ok(L.sameFamily(a, b) === want, `sameFamily(${a}, ${b}) phải = ${want}`);
for (const w of ['thank', 'think', 'among', 'along']) ok(L.CONF.has(w), `CONF thiếu cặp dễ nhầm thật "${w}"`);

// 4. Báo cáo: đủ 4 mảng, mọi điểm 0–100, mỗi mảng có đơn vị; LEARN.md có bảng + 30 bài yếu nhất
const R = JSON.parse(fs.readFileSync('reports/learnability.json', 'utf8'));
for (const k of Object.keys(L.AREAS)) ok(R.areas[k] && R.areas[k].units > 0, `mảng ${k} không có đơn vị nào (nguồn hỏng?)`);
ok(R.units.every(u => u.score >= 0 && u.score <= 100 && Object.values(u.crit).every(v => v == null || (v >= 0 && v <= 1))), 'điểm/tiêu chí ngoài khoảng');
ok(R.units.filter(u => u.area === 'grammar').length >= 77, 'ngữ pháp phải chấm ≥ 77 bài');
const md = fs.readFileSync('content/pipeline/LEARN.md', 'utf8');
ok(/## 30 bài yếu nhất/.test(md) && (md.match(/^\| \d+ \|/gm) || []).length === 30, 'LEARN.md thiếu danh sách 30 bài yếu nhất');
ok(Object.keys(L.CRIT).length === 12, 'phải đủ 12 tiêu chí a…l');

// 5. Hồi quy: mọi từ trong pid c:mixup:a-b có mục trong gold.js (trước 02/11 build-gold bỏ sót cả tệp mixups)
const g = {}; new Function('self', fs.readFileSync('web/js/lesson/gold.js', 'utf8'))(g);
for (const l of fs.readFileSync('content/video/scripts/bank/mixups.jsonl', 'utf8').split('\n').filter(Boolean)) {
  const d = JSON.parse(l), m = /^c:mixup:(.+)$/.exec(d.pid || ''); if (!m) continue;
  for (const w of m[1].split('-')) ok(g.LESSON_GOLD[w.toLowerCase()], `gold.js thiếu "${w}" từ ${d.pid}`);
  ok(d.quiz && d.quiz.options[d.quiz.answer] && d.wrong !== d.right && d.ex && d.ex.length >= 2, `${d.pid}: thiếu quiz/ví dụ hoặc wrong = right`);
}
const chk = spawnSync('node', ['scripts/lesson/build-gold.mjs', '--check'], { encoding: 'utf8' });
ok(chk.status === 0, 'gold.js cũ so với gold bank: ' + (chk.stderr || '').trim());

if (bad) { console.log(`✗ learnability: ${bad} lỗi`); process.exit(1); }
console.log(`✓ learnability: luật đo + báo cáo + gold mixups (tổng ${R.total}/100)`);
