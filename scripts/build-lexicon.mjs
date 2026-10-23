#!/usr/bin/env node
// Kho từ vựng MỘT NGUỒN: web/js/data.js + web/js/lib/*.js (+ content/lexicon/overrides.json) → chuẩn hoá → bản chép add-on + dist/lexicon.json
//   node scripts/build-lexicon.mjs            kiểm (không ghi): lệch → exit 1  (npm test: dict-consistency)
//   node scripts/build-lexicon.mjs --write    ghi chuẩn hoá vào nguồn + chép extension/app/js/{data.js,lib/*.js} + dist/lexicon.json
//   node scripts/build-lexicon.mjs --cmu <cmudict.dict>   làm mới content/lexicon/cmudict-subset.txt (chỉ từ có trong kho)
// Quy tắc chuẩn hoá (idempotent – chạy lại không đổi gì):
//   1. overrides.json theo "từ#loại" (sửa tay: nghĩa 1, định nghĩa, ví dụ, CEFR) thắng mọi bộ.
//   2. Cùng "từ#loại" ở nhiều bộ mà nghĩa vi khác → 1 chuỗi chung: nghĩa của nhiều bộ nhất (hoà → bộ tần suất chung NGSL trước chuyên ngành)
//      đứng đầu, nghĩa khác gộp sau "; ", bỏ trùng.
//   3. IPA Anh: sửa ký hiệu hỏng, r kiểu Mỹ, ˈ thừa ở từ 1 âm tiết. IPA Mỹ (ô 11): giữ bản tay, thiếu → CMUdict.
import fs from 'fs';
import { loadAll, saveAll, key, rd, wr, ROOT, SOURCES } from './lexicon/lib.mjs';
import { checkImg } from './lexicon/img.mjs';
import { fixBroken, fixUKr, stripMonoStress, arpaToIpa, stressIndex, arpaStressIndex, usSpellings, badChars } from './lexicon/ipa.mjs';

const WRITE = process.argv.includes('--write');
const ci = process.argv.indexOf('--cmu');
const all = loadAll();

// ---- CMUdict (BSD-2, © Carnegie Mellon University – docs/CREDITS.md)
const SUB = 'content/lexicon/cmudict-subset.txt';
const tokens = w => w.toLowerCase().replace(/[’]/g, "'").split(/[\s/]+/).filter(Boolean);
if (ci > 0) {
  const need = new Set();
  for (const e of all) for (const t of tokens(e.row[0])) for (const p of [t, ...t.split('-')]) for (const v of usSpellings(p)) need.add(v);
  const keep = fs.readFileSync(process.argv[ci + 1], 'latin1').split('\n').filter(l => { const w = l.split(' ')[0].replace(/\(\d+\)$/, ''); return need.has(w); }).map(l => l.replace(/\s*#.*$/, ''));
  wr(SUB, '# Trích CMUdict (github.com/cmusphinx/cmudict) – BSD-2-Clause, © 1993-2015 Carnegie Mellon University. Chỉ giữ từ có trong kho Lexkite.\n' + keep.join('\n') + '\n');
  console.log(`✓ ${SUB}: ${keep.length} dòng`);
}
const CMU = new Map();
if (fs.existsSync(new URL(SUB, ROOT))) for (const l of rd(SUB).split('\n')) { if (!l || l[0] === '#') continue; const i = l.indexOf(' '); const w = l.slice(0, i).replace(/\(\d+\)$/, ''); (CMU.get(w) || CMU.set(w, []).get(w)).push(l.slice(i + 1)); }
function cmuWord(w, ukIpa) {
  for (const v of usSpellings(w)) {
    const vs = CMU.get(v); if (!vs) continue;
    const si = ukIpa ? stressIndex(ukIpa) : 0;
    return arpaToIpa(vs.find(p => arpaStressIndex(p) === si) || vs[0]);
  }
  if (w.includes('-')) { const ps = w.split('-').map(p => cmuWord(p)); if (ps.every(Boolean)) return ps.join(''); }
  return '';
}
const WEAK = { a: 'ə', an: 'ən', the: 'ðə', of: 'əv', to: 'tə', and: 'ənd', for: 'fər', at: 'ət', as: 'əz', than: 'ðən', from: 'frəm', or: 'ər', but: 'bət', some: 'səm', your: 'jər', can: 'kən', be: 'bi', been: 'bɪn', was: 'wəz', were: 'wər' };
function usIpa(word, ukIpa) {
  const ts = tokens(word); if (!ts.length || ts.some(t => !/^[a-z'-]+$/.test(t))) return '';
  if (ts.length === 1) { const s = cmuWord(ts[0], ukIpa.replace(/^\/|\/$/g, '')); return s ? '/' + s + '/' : ''; }
  // cụm: dạng yếu cho hư từ; trọng âm theo ô giọng Anh của cùng cụm (từ 1 âm tiết được đánh dấu như bản Anh)
  const ps = ts.map(t => WEAK[t] || cmuWord(t)); if (!ps.every(Boolean)) return '';
  const uk = ukIpa.replace(/^\/|\/$/g, '').split(/\s+/);
  const out = ps.map((p, i) => (uk.length === ps.length && /^[ˈˌ]/.test(uk[i]) && !/[ˈˌ]/.test(p) ? uk[i][0] + p : p));
  return '/' + out.join(' ') + '/';
}

// ---- overrides tay ("từ#loại" cho mọi bộ, "từ#loại@bộ" cho riêng một bộ) + IPA Mỹ viết tay (thắng CMUdict)
const OV = JSON.parse(rd('content/lexicon/overrides.json'));
const MUS = 'content/lexicon/ipaus-manual.json';
if (!fs.existsSync(new URL(MUS, ROOT))) wr(MUS, JSON.stringify(Object.fromEntries(all.filter(e => e.row[10]).map(e => [key(e.row), e.row[10]])), null, 1) + '\n');
const MANUAL_US = JSON.parse(rd(MUS));
const stats = { broken: 0, ukR: 0, mono: 0, usAdded: 0, viMerged: 0, override: 0 };
const ipaUK = s => { if (!s) return s; let o = fixBroken(s); if (o !== s) stats.broken++; const r = fixUKr(o.replace(/oʊ/g, 'əʊ')); if (r !== o) stats.ukR++; const m = stripMonoStress(r); if (m !== r) stats.mono++; return m; };

for (const e of all) {
  const r = e.row; while (r.length < 11) r.push('');
  for (const o of [OV[key(r)], OV[key(r) + '@' + e.set]]) if (o) { for (const [f, i] of Object.entries({ ipa: 1, vi: 3, def: 4, ex: 5, col: 6, syn: 7, level: 8, ipaUS: 10 })) if (o[f] != null && r[i] !== o[f]) { r[i] = o[f]; stats.override++; } }
  r[1] = ipaUK(r[1]);
  const man = MANUAL_US[key(r)];
  if (man) r[10] = stripMonoStress(fixBroken(man));
  else { const u = usIpa(r[0], r[1]); if (u) { e.us = 1; const v = u === r[1] ? '' : u; if (v !== r[10]) { if (!r[10]) stats.usAdded++; r[10] = v; } } } // trùng IPA Anh → bỏ trống (giao diện tự dùng IPA Anh)
  if (r[10]) e.us = 1;
}

// ---- gộp nghĩa vi lệch theo từ#loại
const split = s => s.split(/\s*[;,]\s*/).map(x => x.trim()).filter(Boolean);
const norm = s => s.toLowerCase().replace(/\s+/g, ' ').trim();
const groups = new Map();
for (const e of all) { const k = key(e.row); (groups.get(k) || groups.set(k, []).get(k)).push(e); }
for (const [k, list] of groups) {
  if (OV[k] && OV[k].vi != null) continue;
  const variants = [...new Set(list.map(e => e.row[3].trim()).filter(Boolean))];
  if (variants.length < 2) continue;
  const count = v => list.filter(e => e.row[3].trim() === v).length;
  const firstIdx = v => list.findIndex(e => e.row[3].trim() === v);
  variants.sort((a, b) => count(b) - count(a) || firstIdx(a) - firstIdx(b));
  const seen = new Set(split(variants[0]).map(norm)); const extra = [];
  for (const v of variants.slice(1)) for (const s of split(v)) { const n = norm(s); if ([...seen].some(x => x === n || x.includes(n) || n.includes(x))) continue; seen.add(n); extra.push(s); }
  const merged = variants[0] + (extra.length ? '; ' + extra.slice(0, 3).join(', ') : '');
  for (const e of list) if (e.row[3] !== merged) { e.row[3] = merged; stats.viMerged++; }
}

// ---- kiểm chất lượng (cổng dict-consistency)
const errs = [];
const single = all.filter(e => !/\s/.test(e.row[0].trim()));
for (const e of all) {
  const [w, ipa, , , , ex, , , , , us] = e.row;
  for (const [f, s] of [['ipa', ipa], ['ipaUS', us]]) { const b = badChars(s); if (b.length) errs.push(`${e.file}:${e.line + 1} ${w} ${f} ký hiệu ngoài bảng: ${[...new Set(b)].join(' ')}`); }
}
for (const [k, list] of groups) if (new Set(list.map(e => e.row[3])).size > 1) errs.push(`${k}: nghĩa vi khác nhau giữa các bộ`);
const usCov = single.filter(e => e.us).length / single.length;
if (usCov < 0.97) errs.push(`ipaUS phủ ${(usCov * 100).toFixed(1)}% từ đơn (< 97%)`);

// ---- ảnh minh hoạ theo nghĩa (content/lexicon/img.json → web/js/lexicon-img.json, mọi bề mặt đọc từ đây – docs/LEXICON.md § Ảnh minh hoạ)
const IMGF = 'content/lexicon/img.json';
const IMG = fs.existsSync(new URL(IMGF, ROOT)) ? JSON.parse(rd(IMGF)) : { v: 1, style: { v: 's1' }, base: 'https://media.lexkite.com/vimg/', items: {}, rejected: {} };
errs.push(...checkImg(IMG, new Set(groups.keys())));
const imgIndex = JSON.stringify({ v: IMG.v, base: IMG.base, sv: IMG.style.v, m: Object.fromEntries(Object.entries(IMG.items).map(([k, e]) => [k, e.h])) });
for (const f of ['web/js/lexicon-img.json', 'extension/app/js/lexicon-img.json']) {
  const ex = fs.existsSync(new URL(f, ROOT));
  if (WRITE) { if (!ex || rd(f) !== imgIndex + '\n') wr(f, imgIndex + '\n'); } else if (!ex || rd(f) !== imgIndex + '\n') errs.push(`${f} lệch content/lexicon/img.json → chạy: node scripts/build-lexicon.mjs --write`);
}

// ---- ghi / so sánh
const changed = WRITE ? saveAll(all) : (() => { let n = 0; const byLine = new Map(loadAll().map(x => [x.file + ':' + x.line, x.row])); for (const e of all) { const r = e.row.slice(); while (r.length > 10 && !r[r.length - 1]) r.pop(); if (JSON.stringify(byLine.get(e.file + ':' + e.line)) !== JSON.stringify(r)) n++; } return n; })();
if (!WRITE && changed) errs.push(`${changed} dòng nguồn chưa chuẩn hoá → chạy: node scripts/build-lexicon.mjs --write`);

// bản chép add-on (extension/app – build-extension.sh cũng rsync lại toàn bộ khi đóng gói)
const copies = SOURCES.map(s => [s, s.replace(/^web\//, 'extension/app/')]);
for (const [src, dst] of copies) {
  const a = rd(src); const exists = fs.existsSync(new URL(dst, ROOT));
  if (WRITE) { if (!exists || rd(dst) !== a) wr(dst, a); } else if (!exists || rd(dst) !== a) errs.push(`${dst} lệch ${src} → chạy: node scripts/build-lexicon.mjs --write`);
}

// dist/lexicon.json: mục theo từ#loại (pack đa ngôn ngữ, TTS, audit)
if (WRITE) {
  const lex = {};
  for (const [k, list] of groups) { const r = list[0].row; lex[k] = { w: r[0], pos: r[2], ipa: r[1], ipaUS: r[10] || '', vi: r[3], def: r[4], ex: r[5], level: r[8], sets: list.map(e => e.set) }; if (IMG.items[k]) lex[k].img = IMG.items[k]; }
  fs.mkdirSync(new URL('dist/', ROOT), { recursive: true });
  wr('dist/lexicon.json', JSON.stringify(lex));
}

// cùng 1 từ → cùng dữ liệu ở mọi giao diện (mảnh Lex, tab mới add-on, bản chép add-on, blog, gói nghĩa) – scripts/lexicon/surfaces.mjs
{ const { surfaceErrors } = await import('./lexicon/surfaces.mjs'); const sf = surfaceErrors(); errs.push(...sf.errs); if (sf.warn.length) console.log('⚠ ' + sf.warn.join(' · ')); }
console.log(`lexicon: ${all.length} dòng · ${groups.size} từ#loại · ipaUS ${(usCov * 100).toFixed(1)}% từ đơn · sửa: ${JSON.stringify(stats)}${WRITE ? ` · ghi ${changed} dòng` : ''}`);
if (errs.length) { console.error(errs.slice(0, 30).join('\n') + (errs.length > 30 ? `\n… +${errs.length - 30}` : '')); console.error(`✗ dict-consistency: ${errs.length} lỗi`); process.exit(1); }
console.log('✓ dict-consistency');
