#!/usr/bin/env node
// Cổng kho điểm ngữ pháp (docs/CONTENT-WORLD-PLAN.md P0.3 / P0-D). 0 token, chỉ đọc repo.
// content/framework/grammar-inventory.json: id duy nhất (slug), cấp A1…C2, mảng hợp lệ, can_do_en tự viết ("Can …"), ví dụ tiếng Anh;
// mỗi `lessons` là bài có thật trong web/js/grammar và lệch cấp điểm ≤ 1 bậc; MỌI bài (77) ↔ ≥ 1 điểm;
// điểm chưa được dạy ở đúng cấp (không bài nào cùng cấp gốc) PHẢI nằm trong hàng chờ targets.json "Ngữ pháp – bài <cấp>".points;
// hàng chờ không chứa điểm lạ/đã dạy; `have` của hàng chờ = số bài thật ở cấp đó (không để số tay lệch).
// --tl es (khóa ngôn ngữ đích, spanish-course.md W2): kho content/target/<tl>/grammar-inventory.json; ví dụ = câu ngôn ngữ đích qua lint TL_RULES
// (es-419: không vosotros…) + example_en; tenses = khóa của bộ chia động từ; lessons rỗng tới khi có bài <tl>; ≥ 200 điểm (≈ 220 theo spec).
// Dùng: node scripts/content-qa/grammar-map-check.mjs [--tl es] [--inv <file>] [--targets <file>] [--report <file>]  → ghi reports/grammar-inventory[-<tl>].json
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../lib/content-load.mjs';
import { TL_RULES, ltErrors } from '../target/lib.mjs';
import { TL_GEN } from '../target/tl-gen.mjs';
import { TENSES as ES_TENSES } from '../target/conjugate.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const P = f => path.resolve(ROOT, f), rd = f => fs.readFileSync(P(f), 'utf8');
const TL = arg('--tl'), TL_TENSES = { es: ES_TENSES }, MIN_TL = 200;
const INV = arg('--inv', TL ? `content/target/${TL}/grammar-inventory.json` : 'content/framework/grammar-inventory.json'), TGT = arg('--targets', 'content/pipeline/targets.json'), REPORT = arg('--report', TL ? `reports/grammar-inventory-${TL}.json` : 'reports/grammar-inventory.json');
if (TL && !TL_TENSES[TL]) { console.log(`✗ tl "${TL}" chưa có bộ chia động từ / luật`); process.exit(2); }
const LV = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], base = l => (String(l || '').match(/[ABC][12]/) || [])[0];
const QKEY = l => `Ngữ pháp – bài ${l}`;
const errs = [], E = m => errs.push(m);

const J = JSON.parse(rd(INV)), T = TL ? {} : JSON.parse(rd(TGT));
const lessons = new Map(TL ? [] : (loadContent().GRAMMAR || []).map(g => [g.id, g]));
const AREAS = J.areas || {};
const pts = new Map(), seenText = new Map();
for (const p of J.points || []) {
  const w = `điểm ${p.id}`;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.id || '')) E(`${w}: id phải là slug a-z0-9-`);
  if (pts.has(p.id)) E(`${w}: id trùng`);
  pts.set(p.id, p);
  if (!LV.includes(p.level)) E(`${w}: cấp "${p.level}" không thuộc A1…C2`);
  if (!AREAS[p.area]) E(`${w}: mảng "${p.area}" không có trong areas`);
  if (!String(p.name || '').trim()) E(`${w}: thiếu name`);
  const t = String(p.can_do_en || '');
  if (!/^Can [a-z]/.test(t) || t.length < 25 || t.length > 200 || !/[.]$/.test(t)) E(`${w}: can_do_en phải là câu "Can …" 25–200 ký tự, kết thúc bằng dấu chấm`);
  const k = t.toLowerCase(); if (seenText.has(k)) E(`${w}: trùng can_do_en với ${seenText.get(k)}`); else seenText.set(k, p.id);
  const VI = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
  if (!TL && (!String(p.example || '').trim() || VI.test(p.example))) E(`${w}: ví dụ phải là tiếng Anh, không rỗng`);
  if (TL) {
    if (!String(p.example || '').trim() || VI.test(p.example)) E(`${w}: ví dụ phải là câu ${TL}, không rỗng`);
    else if ((TL_RULES[TL]?.lint || []).some(re => re.test(p.example))) E(`${w}: ví dụ lệch chuẩn ${TL} (vosotros/từ vùng): ${p.example}`);
    const en = String(p.example_en || ''); if (en.trim().length < 3 || VI.test(en) || !/^[\p{Script=Latin}\p{N}\p{P}\p{S}\s]+$/u.test(en)) E(`${w}: thiếu example_en (bản dịch tiếng Anh của ví dụ)`);
    for (const t of p.tenses || []) if (!TL_TENSES[TL].includes(t)) E(`${w}: thì "${t}" không có trong bộ chia động từ`);
    if ((p.lessons || []).length) E(`${w}: lessons phải rỗng tới khi có bài ${TL}`);
  }
  for (const id of p.lessons || []) {
    const g = lessons.get(id);
    if (!g) { E(`${w}: bài "${id}" không có trong web/js/grammar`); continue; }
    if (Math.abs(LV.indexOf(base(g.level)) - LV.indexOf(p.level)) > 1) E(`${w} (${p.level}): bài ${id} (${g.level}) lệch quá 1 bậc`);
  }
}
// LanguageTool 0 lỗi trên mọi ví dụ <tl> (spanish-course.md §5.1) – CI dựng LT_URL (scripts/ci/lt-up.sh); thiếu LT_URL trên CI = lỗi, máy cục bộ = bỏ qua có ghi chú
const LTL = TL && TL_GEN[TL]?.lt;
if (LTL && process.env.LT_URL) { for (const p of pts.values()) if (p.example) for (const m of await ltErrors(process.env.LT_URL, LTL, p.example)) E(`điểm ${p.id}: LanguageTool – ${m}`); }
else if (LTL && process.env.CI) E(`thiếu LT_URL – cổng LanguageTool bắt buộc cho ${TL}`);
else if (LTL) console.log(`(bỏ qua LanguageTool – chưa có LT_URL; CI chạy đủ)`);
if (TL && pts.size < MIN_TL) E(`kho ${TL}: ${pts.size} điểm < ${MIN_TL} (spec ≈ 220, không cắt)`);
// mọi bài ↔ ≥ 1 điểm
const lessonPts = new Map([...lessons.keys()].map(id => [id, []]));
for (const p of pts.values()) for (const id of p.lessons || []) lessonPts.get(id)?.push(p.id);
for (const [id, list] of lessonPts) if (!list.length) E(`bài ${id}: chưa gắn điểm ngữ pháp nào`);
// dạy đúng cấp vs hàng chờ
const taught = p => (p.lessons || []).some(id => base(lessons.get(id)?.level) === p.level);
const untaught = Object.fromEntries(LV.map(l => [l, [...pts.values()].filter(p => p.level === l && !taught(p)).map(p => p.id)]));
for (const l of TL ? [] : LV) {
  const q = T[QKEY(l)], need = untaught[l], have = [...lessons.values()].filter(g => base(g.level) === l).length;
  if (!q) { if (need.length) E(`targets.json: thiếu hàng chờ "${QKEY(l)}" cho ${need.length} điểm chưa dạy (${need.slice(0, 5).join(', ')}…)`); continue; }
  const qs = new Set(q.points || []);
  for (const id of need) if (!qs.has(id)) E(`hàng chờ ${l}: thiếu điểm chưa dạy "${id}"`);
  for (const id of qs) { const p = pts.get(id); if (!p) E(`hàng chờ ${l}: điểm "${id}" không có trong kho`); else if (p.level !== l) E(`hàng chờ ${l}: điểm "${id}" thuộc ${p.level}`); else if (taught(p)) E(`hàng chờ ${l}: điểm "${id}" đã có bài cùng cấp – xoá khỏi hàng chờ`); }
  if (+q.have !== have) E(`hàng chờ ${l}: have = ${q.have} nhưng thực có ${have} bài ${l}`);
}
const byLv = Object.fromEntries(LV.map(l => [l, [...pts.values()].filter(p => p.level === l).length]));
const tAt = Object.fromEntries(LV.map(l => [l, byLv[l] - untaught[l].length]));
const report = { points: pts.size, byLevel: byLv, taughtAtLevel: tAt, taught: Object.values(tAt).reduce((a, b) => a + b, 0),
  lessons: lessons.size, lessonsMapped: [...lessonPts.values()].filter(l => l.length).length, queued: Object.values(untaught).reduce((a, l) => a + l.length, 0), errors: errs.length };
fs.mkdirSync(path.dirname(P(REPORT)), { recursive: true });
fs.writeFileSync(P(REPORT), JSON.stringify(report, null, 1) + '\n');
if (errs.length) { errs.slice(0, 60).forEach(e => console.log('✗', e)); if (errs.length > 60) console.log(`… +${errs.length - 60} lỗi`); console.log(`✗ grammar-map-check: ${errs.length} lỗi`); process.exit(1); }
console.log(`✓ grammar-map-check${TL ? ' ' + TL : ''}: ${pts.size} điểm (${LV.map(l => `${l} ${tAt[l]}/${byLv[l]}`).join(' · ')} đã dạy đúng cấp), ${report.lessonsMapped}/${lessons.size} bài ↔ điểm, ${report.queued} điểm trong hàng chờ`);
