#!/usr/bin/env node
// 🧩 sense-check – cổng mô hình nghĩa từ v2 (P0.2, spec docs/specs/sense-v2.md). Tầng 0, tất định, 0 token.
// Nguồn: content/lexicon/senses.json  { "<từ#loại>": { fam?:[...], senses:[{ n, def, lvl, reg, ex:[...], col?:[...], pat?:[...], src }] } }
// Luật (lỗi CỨNG – mọi mục trong file phải xanh; mục chưa có trong file = chưa làm, không phải lỗi):
//  mục có trong kho từ · 1–6 nghĩa, n = 1..k · lvl hợp lệ, mọi nghĩa ≥ cấp từ, nghĩa dễ nhất = cấp từ (kho) · reg trong danh sách ·
//  def tiếng Anh 3–25 từ, không lặp chính từ đầu mục (từ nội dung) · ≥ 2 ví dụ/nghĩa, chứa đúng dạng từ, viết hoa đầu + dấu câu cuối,
//  độ dài theo cấp (A1 ≤ 8 … C2 ≤ 30 từ, ≥ 4 từ) · không trùng ví dụ trong toàn file · ≥ 3 collocation/mục, mỗi cái chứa dạng từ,
//  ≥ 1 cái được minh hoạ trong ví dụ của mục · pattern chứa dạng từ + chỗ trống (sb/sth/do/doing/that/wh-) · fam không chứa chính từ đó.
// Chạy: node scripts/content-qa/sense-check.mjs [--json] [--file f] · gọi trong npm test (scripts/test/suite.txt) và `content:score` sau này.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadAll, key } from '../lexicon/lib.mjs';
import { has } from '../lib/irregular.mjs';
import { coreList } from '../lexicon/core.mjs';

export const LV = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
export const EX_MAX = { A1: 8, A2: 12, B1: 16, B2: 20, C1: 25, C2: 30 }, EX_MIN = 4;
export const REG = ['neutral', 'formal', 'informal', 'spoken', 'written', 'literary', 'technical', 'old-fashioned', 'offensive'];
const FUNC = /^(det|prep|conj|pron|aux|modal|art|num|int|interj|phr ?v|phrv|idiom|phrase|collocation)/i; // từ chức năng/cụm: def được nhắc lại đầu mục
const words = s => String(s || '').trim().split(/\s+/).filter(Boolean);
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
// Cụm nhiều từ: mọi từ của cụm phải có (từng từ chấp nhận dạng biến đổi), từ đầu tiên cho phép chia (go through → went through)
export const hasForm = (head, s) => { const ws = words(head.replace(/\b(sb|sth|one's|someone|something)\b/g, '')); return ws.length > 0 && ws.every(w => has(w, s)); };

export function checkEntry(k, e, ctx) {
  const errs = [], E = m => errs.push(`${k}: ${m}`);
  const row = ctx.rows.get(k); if (!row) { E('không có trong kho từ (web/js/lib, data.js)'); return errs; }
  const head = row[0], wl = row[8], content = !FUNC.test(row[2] || '');
  const S = Array.isArray(e && e.senses) ? e.senses : [];
  if (S.length < 1 || S.length > 6) E(`số nghĩa ${S.length} (cần 1–6)`);
  S.forEach((s, i) => {
    const at = `nghĩa ${i + 1}`;
    if (s.n !== i + 1) E(`${at}: n = ${s.n}, cần ${i + 1}`);
    if (!LV.includes(s.lvl)) E(`${at}: lvl "${s.lvl}" không hợp lệ`);
    else if (LV.includes(wl) && LV.indexOf(s.lvl) < LV.indexOf(wl)) E(`${at}: cấp nghĩa ${s.lvl} < cấp từ ${wl}`);
    if (!REG.includes(s.reg)) E(`${at}: reg "${s.reg}" ngoài danh sách`);
    const dw = words(s.def).length;
    if (dw < 3 || dw > 25) E(`${at}: def ${dw} từ (cần 3–25)`);
    if (content && !/\s/.test(head) && new RegExp(`\\b${head}\\b`, 'i').test(s.def || '')) E(`${at}: def lặp lại chính từ "${head}" (định nghĩa vòng)`);
    const ex = Array.isArray(s.ex) ? s.ex : [];
    if (ex.length < 2) E(`${at}: ${ex.length} ví dụ (cần ≥ 2)`);
    const max = EX_MAX[s.lvl] || 30;
    for (const x of ex) {
      const n = words(x).length;
      if (!hasForm(head, x)) E(`${at}: ví dụ không chứa "${head}": ${x}`);
      if (n < EX_MIN || n > max) E(`${at}: ví dụ ${n} từ, cấp ${s.lvl} cần ${EX_MIN}–${max}: ${x}`);
      if (!/^["'A-Z0-9]/.test(x) || !/[.!?]["']?$/.test(x)) E(`${at}: ví dụ cần viết hoa đầu câu và có dấu câu cuối: ${x}`);
      const nx = norm(x); if (ctx.seenEx.has(nx)) E(`${at}: ví dụ trùng với ${ctx.seenEx.get(nx)}: ${x}`); else ctx.seenEx.set(nx, k);
    }
    for (const p of s.pat || []) {
      if (!hasForm(head, p)) E(`${at}: pattern không chứa "${head}": ${p}`);
      if (!/\b(sb|sth|do|doing|to do|that|wh-|somebody|something|adj|n)\b|\+/.test(p)) E(`${at}: pattern thiếu chỗ trống (sb/sth/do/doing/that/wh-): ${p}`);
    }
  });
  if (S.length && LV.includes(wl)) { const lo = S.map(s => LV.indexOf(s.lvl)).filter(i => i >= 0).sort()[0]; if (lo !== undefined && LV[lo] !== wl) E(`nghĩa dễ nhất ${LV[lo]} ≠ cấp từ trong kho ${wl} (sửa kho qua content/lexicon/overrides.json hoặc thêm nghĩa đúng cấp)`); }
  const col = S.flatMap(s => s.col || []);
  if (col.length < 3) E(`${col.length} collocation (cần ≥ 3 / mục)`);
  for (const c of col) if (!hasForm(head, c)) E(`collocation không chứa "${head}": ${c}`);
  const exs = S.flatMap(s => s.ex || []), PH = /^(sb|sth|someone|something|one's|somebody)$/i;
  const shown = c => exs.some(x => words(c).filter(w => !PH.test(w)).every(w => has(w, x)));
  if (col.length && !col.some(shown)) E('không collocation nào được minh hoạ trong ví dụ');
  for (const f of e.fam || []) { const fp = (String(f).match(/\((.*?)\)/) || [])[1] || ''; if (norm(String(f).replace(/\(.*?\)/g, '')) === norm(head) && (!fp || norm(fp) === norm(row[2]) || norm(fp)[0] === norm(row[2])[0])) E(`fam chứa chính từ đầu mục (cùng từ loại): ${f}`); } // cùng chữ khác từ loại (struggle v → struggle n) là họ từ hợp lệ
  return errs;
}

// Nguồn: content/lexicon/senses.json (lô gold) + content/lexicon/senses/*.json (mỗi lô Sonnet một file – docs/content-lots.md). Một từ#loại chỉ ở MỘT file.
export function checkFile(file) {
  const R = new URL('../../', import.meta.url), J = p => JSON.parse(fs.readFileSync(new URL(p, R), 'utf8'));
  const files = file ? [file] : ['content/lexicon/senses.json', ...(fs.existsSync(new URL('content/lexicon/senses/', R)) ? fs.readdirSync(new URL('content/lexicon/senses/', R)).filter(f => f.endsWith('.json')).sort().map(f => 'content/lexicon/senses/' + f) : [])].filter(p => fs.existsSync(new URL(p, R)));
  const data = { entries: {} }, dupKey = [];
  for (const p of files) for (const [k, e] of Object.entries(J(p).entries || {})) { if (data.entries[k]) dupKey.push(`${k}: có ở 2 file (${p})`); data.entries[k] = e; }
  const all = loadAll(), rows = new Map(); for (const e of all) { const k = key(e.row); if (!rows.has(k)) rows.set(k, e.row); }
  const ctx = { rows, seenEx: new Map() }, errs = [...dupKey];
  const ent = data.entries || {};
  for (const [k, e] of Object.entries(ent)) errs.push(...checkEntry(k, e, ctx));
  const core = coreList(all), done = core.filter(c => ent[c.k]).length;
  const senses = Object.values(ent).reduce((n, e) => n + (e.senses || []).length, 0);
  return { errs, entries: Object.keys(ent).length, senses, core: core.length, coreDone: done };
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const fi = process.argv.indexOf('--file'), r = checkFile(fi > 0 ? process.argv[fi + 1] : undefined);
  if (process.argv.includes('--json')) console.log(JSON.stringify(r, null, 1));
  if (r.errs.length) { console.error(r.errs.slice(0, 80).join('\n')); console.error(`✗ sense-check: ${r.errs.length} lỗi`); process.exit(1); }
  console.log(`✓ sense-check: ${r.entries} mục · ${r.senses} nghĩa · lõi ${r.coreDone}/${r.core}`);
}
