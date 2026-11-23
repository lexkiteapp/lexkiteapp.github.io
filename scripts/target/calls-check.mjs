#!/usr/bin/env node
// Cổng máy cho cuộc gọi ngôn ngữ đích (W4; MỘT máy gác, bảng CK theo tl): chuẩn tl (es-419 spec §8 · fr: từ vùng/thông tục + MỘT xưng hô tu|vous mỗi cuộc) + cấu trúc nút. 0 mạng.
// Dùng: node scripts/target/calls-check.mjs [--tl fr] [--lt]  (--lt = bắt buộc có LT_URL: LanguageTool 0 lỗi trên từng câu nói/mẫu/phản hồi, bỏ cụm ngắn; CI target-content)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { TL_RULES, ltErrors } from './lib.mjs'; import { TL_GEN } from './tl-gen.mjs';
const ti = process.argv.indexOf('--tl'), TL = ti > 0 ? process.argv[ti + 1] : 'es', CK = {
  es: { name: 'es-419', extra: [/(^|[^\p{L}])(tío|tía|molar|guay|chaval|móvil|coche|patata|gilipollas)(?=$|[^\p{L}])/iu] },
  fr: { name: 'fr', extra: [] },
  // ja (japanese-course.md W4): không có LanguageTool → câu mẫu của người học PHẢI ở thể lịch sự (end), từ đếm bằng Intl.Segmenter (cùng engine web), nhánh regex theo kana đã chuẩn hoá (engine foldRe)
  ja: { name: 'ja', extra: [], sub: true, end: /(です|ます|ました|ません|でした|ましょう|ください|ませ|でしょう|ございます|ありません|お願いします|お願いいたします)(ね|よ|か|ょうか|が|から)?[。？！]$/u,
    words: t => { try { return [...new Intl.Segmenter('ja', { granularity: 'word' }).segment(String(t).normalize('NFKC'))].filter(x => x.isWordLike).length; } catch { return 0; } },
    re: s => String(s).normalize('NFKC').replace(/[\u30a1-\u30f6]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60)).toLowerCase() },
}[TL];
if (!CK) { console.error(`✗ tl "${TL}" chưa có dòng CK (calls-check.mjs)`); process.exit(2); }
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), DIR = path.join(ROOT, `content/target/${TL}/calls`);
const fold = s => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const LV = ['A1', 'A2', 'B1', 'B2', 'C1'], bad = [];
const lint = TL_RULES[TL].lint || [], extra = CK.extra, mix = TL_RULES[TL].mix;
const fs_ = fs.readdirSync(DIR).filter(f => /^calls-\d+\.json$/.test(f)).sort(), all = [];
for (const f of fs_) for (const c of JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))) all.push(c);
const ids = new Set();
for (const c of all) {
  const e = m => bad.push(c.id + ': ' + m);
  if (!new RegExp(`^${TL}-[a-z0-9-]+$`).test(c.id)) e('id'); if (ids.has(c.id)) e('id trùng'); ids.add(c.id);
  if (!LV.includes(c.lv)) e('lv ' + c.lv); if (!['chat', 'role'].includes(c.kind)) e('kind'); if (!['ama', 'carlos'].includes(c.who)) e('who');
  for (const k of ['em', 'title', 'tr', 'role']) if (!c[k]) e('thiếu ' + k);
  if (!(c.words || []).length || !(c.phrases || []).length) e('thiếu words/phrases');
  const N = c.nodes || {}, keys = Object.keys(N); if (!N[c.start]) e('start không có');
  const reach = new Set(), q = [c.start];
  while (q.length) { const k = q.pop(); if (reach.has(k) || !N[k]) continue; reach.add(k); for (const b of N[k].br || []) if (b[2]) q.push(b[2]); if (N[k].next) q.push(N[k].next); }
  for (const k of keys) if (!reach.has(k)) e('nút mồ côi ' + k);
  const texts = [c.title, c.end, ...(c.phrases || []).map(p => p[0])].filter(Boolean);
  for (const [k, n] of Object.entries(N)) {
    if (!n.m) e(k + ': thiếu m'); if (!n.re) e(k + ': thiếu re'); if (!(n.o || []).length || n.o.length < 3) e(k + ': <3 câu mẫu');
    if (n.next && !N[n.next] && n.next !== 'end') e(k + ': next lạ ' + n.next);
    for (const b of n.br || []) { if (b[2] && !N[b[2]] && b[2] !== 'end') e(k + ': nhánh lạ ' + b[2]); try { new RegExp(CK.re ? CK.re(b[0]) : b[0]); } catch { e(k + ': regex hỏng'); } texts.push(b[1]); }
    if (CK.end) for (const o of n.o || []) if (!CK.end.test(o)) e(k + ': câu mẫu không ở thể lịch sự です/ます: ' + o);
    const W = t => (CK.words ? CK.words(t) : (fold(t).match(/[a-z]+/g) || []).length); for (const o of n.o || []) if (n.min && W(o) < n.min) e(k + ': câu mẫu ngắn hơn min ' + n.min + ': ' + o);
    texts.push(n.m, n.re, ...(n.o || []));
  }
  for (const t of texts) { if (typeof t !== 'string') continue; if (lint.some(r => r.test(t)) || extra.some(r => r.test(t))) e(`lệch ${CK.name}: ` + t); if (/\p{Script=Latin}/u.test(t) && /\b(the|and|you|is)\b/i.test(t)) e('lẫn tiếng Anh: ' + t); }
  if (mix) { const ss = texts.filter(x => typeof x === 'string'), inf = ss.find(x => mix.informal.test(x)), fo = ss.find(x => mix.formal.test(x)); if (inf && fo) e(`trộn tu + vous trong một cuộc gọi: «${inf}» / «${fo}»`); } // một cuộc = MỘT xưng hô (người học nghe/nói một giọng điệu nhất quán)
}
// LanguageTool (CI: LT_URL từ scripts/ci/lt-up.sh): mọi câu nói của giáo viên + câu mẫu + phản hồi nhánh phải 0 lỗi; cụm ngắn (c.phrases) và regex không kiểm
if (process.env.LT_URL || process.argv.includes('--lt')) {
  if (!process.env.LT_URL) bad.push('thiếu LT_URL – cổng LanguageTool bắt buộc cho cuộc gọi ' + TL);
  else { let n = 0; const seen = new Set();
    for (const c of all) for (const nd of Object.values(c.nodes)) for (const x of [nd.m, nd.re, ...(nd.o || []), ...(nd.br || []).map(b => b[1])].concat(c.end || [])) {
      if (!x || seen.has(x)) continue; seen.add(x); n++;
      for (const m of await ltErrors(process.env.LT_URL, TL_GEN[TL].lt, x)) bad.push(`${c.id}: LanguageTool – ${m}: ${x}`);
    }
    console.log(`LanguageTool: ${n} câu của cuộc gọi ${TL}`); }
} else console.log('(bỏ qua LanguageTool – chưa có LT_URL; CI chạy đủ)');

const byLv = {}; for (const c of all) byLv[c.lv] = (byLv[c.lv] || 0) + 1;
if (all.length < 24) bad.push('cần ≥ 24 cuộc, có ' + all.length); for (const l of LV) if (!byLv[l]) bad.push('thiếu cấp ' + l);
if (bad.length) { console.error(bad.join('\n')); console.error(`✗ ${bad.length} lỗi`); process.exit(1); }
console.log(`✓ ${all.length} cuộc gọi ${TL} OK`, JSON.stringify(byLv));
