#!/usr/bin/env node
// Kiểm IPA toàn kho (docs/LEXICON.md § Kiểm IPA): ô giọng Anh ↔ Britfone (MIT), ô giọng Mỹ ↔ CMUdict (BSD-2), so theo ÂM VỊ – bỏ qua trọng âm, độ dài (ː),
// ký hiệu tương đương (ɛ/e, ɐ/ʌ, ɹ/r, g/ɡ). Biến thể từ điển được chấp nhận (không phải lỗi): đổi nguyên âm yếu (ə ɪ i ʊ u), thêm/bớt ə (ˈsekəndri ~ ˈsekəndəri),
// phụ âm thành âm tiết (ˈlɪsn ~ ˈlɪsən), hoà âm j (djuː ~ dʒuː, tj ~ tʃ). Còn lại = LỆCH:
//   - hai nguồn khớp nhau (so trung tính giọng) mà kho khác → tự sửa (--fix ghi content/lexicon/overrides.json, rồi build-lexicon --write)
//   - nguyên âm BATH (æ → ɑː trước s f θ / n+phụ âm, Britfone ɑː) ở ô giọng Anh → tự sửa
//   - còn lại → content/lexicon/ipa-review.json (hàng duyệt tay). Cổng (npm test): lệch MỚI chưa có trong hàng duyệt → exit 1.
//   node scripts/lexicon/ipa-audit.mjs              kiểm (cổng)
//   node scripts/lexicon/ipa-audit.mjs --fix        tự sửa + ghi lại hàng duyệt
//   node scripts/lexicon/ipa-audit.mjs --britfone <britfone.main.csv>   làm mới content/lexicon/britfone-subset.txt (chỉ từ có trong kho)
// Kèm: kiểm bảng dạng yếu/mạnh (web/js/ui.js khối LK_WEAK) và file âm thanh từ đơn theo từng giọng (web/audio/w/s3.tsv) – chỉ báo số.
import fs from 'fs';
import { loadAll, key, rd, wr, ROOT } from './lib.mjs';
import { usSpellings, stressIndex } from './ipa.mjs';
import { P, isV, exact, near, nNear, cmuIpa, bfToOx, bathFix, look } from './ipa-check.mjs'; // so âm vị dùng chung với cổng mở rộng (expand/job.mjs, promote.mjs)

const FIX = process.argv.includes('--fix');
const all = loadAll();
const BFS = 'content/lexicon/britfone-subset.txt', REV = 'content/lexicon/ipa-review.json', OVF = 'content/lexicon/overrides.json', MUS = 'content/lexicon/ipaus-manual.json';
const single = e => !/\s/.test(e.row[0].trim());

{ const i = process.argv.indexOf('--britfone'); if (i > 0) {
  const need = new Set(all.filter(single).flatMap(e => [e.row[0].toLowerCase(), ...usSpellings(e.row[0].toLowerCase())]));
  const keep = fs.readFileSync(process.argv[i + 1], 'utf8').split('\n').filter(l => need.has(l.split(',')[0].replace(/\(\d+\)$/, '').toLowerCase()));
  wr(BFS, ['# Trích Britfone 3.0.1 (github.com/JoseLlarena/Britfone) – MIT License, Copyright (c) 2017 Jose Llarena. Chỉ giữ từ có trong kho Lexkite.',
    '# Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.',
    '# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.',
    ...keep].join('\n') + '\n');
  console.log(`✓ ${BFS}: ${keep.length} dòng`);
} }

const load = (f, sep, enc) => { const m = new Map(); for (const l of fs.readFileSync(new URL(f, ROOT), enc).split('\n')) { if (!l || l[0] === '#') continue; const i = l.indexOf(sep); const w = l.slice(0, i).replace(/\(\d+\)$/, '').toLowerCase(); (m.get(w) || m.set(w, []).get(w)).push(l.slice(i + 1).trim()); } return m; };
const BF = load(BFS, ',', 'utf8'), CMU = load('content/lexicon/cmudict-subset.txt', ' ', 'latin1');

// ---- kiểm từng từ#loại (từ đơn)
const OV = JSON.parse(rd(OVF)), MAN = JSON.parse(rd(MUS));
const oldRev = fs.existsSync(new URL(REV, ROOT)) ? JSON.parse(rd(REV)) : { items: {} };
const st = { checked: 0, uk: { checked: 0, ok: 0, variant: 0, fixed: 0, review: 0, noSrc: 0 }, us: { checked: 0, ok: 0, variant: 0, fixed: 0, review: 0, noSrc: 0 } };
const review = {}, fixes = [], seen = new Set();
const posN = new Map(); for (const e of all) if (single(e)) { const w = e.row[0].toLowerCase(); posN.set(w, new Set([...(posN.get(w) || []), e.row[2]])); } for (const [w, s] of posN) posN.set(w, s.size);
for (const e of all) {
  if (!single(e)) continue;
  const r = e.row, k = key(r); if (seen.has(k)) continue; seen.add(k); st.checked++;
  const w = r[0].toLowerCase(), uk = r[1], us = r[10] || r[1], bf = look(BF, w), cmu = cmuIpa(look(CMU, w));
  const bfI = (bf || []).map(b => '/' + b.replace(/\s+/g, '') + '/');
  if (uk) { st.uk.checked++;
    if (!bf) st.uk.noSrc++;
    else if (bfI.some(b => exact(uk, b))) st.uk.ok++;
    else if (bfI.some(b => near(uk, b))) st.uk.variant++;
    else {
      // tự sửa chỉ khi AN TOÀN: chưa được duyệt "giữ", từ chỉ có 1 từ loại trong kho (record n/v), không đổi vị trí trọng âm (contractor ˈkɒn-/kənˈ-)
      const kept = oldRev.items[k + '|uk'] && oldRev.items[k + '|uk'].note && oldRev.items[k + '|uk'].ours === uk;
      const bath = bathFix(uk, bf), bfA = bf.find(b => cmu.some(c => nNear('/' + b.replace(/\s+/g, '') + '/', c))), to = bath || (bfA && !cmu.some(c => nNear(uk, c)) ? bfToOx(bfA) : '');
      if (!kept && to && (bath || (posN.get(w) === 1 && stressIndex(to) === stressIndex(uk)))) { st.uk.fixed++; fixes.push({ k, f: 'ipa', from: uk, to, why: bath ? 'bath' : 'britfone+cmu' }); }
      else { st.uk.review++; review[k + '|uk'] = { ours: uk, britfone: bf.join(' | '), cmu: cmu.join(' | '), why: cmu.some(c => nNear(uk, c)) ? 'nguồn trái nhau (CMU giống kho)' : 'lệch Britfone' }; }
    } }
  if (us && cmu.length) { st.us.checked++;
    if (cmu.some(c => exact(us, c))) st.us.ok++;
    else if (cmu.some(c => near(us, c))) st.us.variant++;
    else if (MAN[k] && posN.get(w) === 1 && !(oldRev.items[k + '|us'] && oldRev.items[k + '|us'].note) && bfI.some(b => cmu.some(c => nNear(b, c))) && !bfI.some(b => nNear(us, b))) { st.us.fixed++; fixes.push({ k, f: 'ipaUS', from: us, to: '(CMUdict)', why: 'cmu+britfone' }); }
    else { st.us.review++; review[k + '|us'] = { ours: us, cmu: cmu.join(' | '), britfone: (bf || []).join(' | '), why: MAN[k] ? 'IPA Mỹ viết tay lệch CMU' : 'lệch CMU' }; }
  } else if (us) { st.us.checked++; st.us.noSrc++; }
}

// ---- bảng dạng yếu/mạnh (web/js/ui.js LK_WEAK): đủ ô; dạng yếu Mỹ có trong biến thể CMUdict → đếm "xác nhận" (CMU thiếu nhiều dạng yếu → chỉ báo, không chặn)
const weakErr = [], weakUnconfirmed = [];
{ const src = rd('web/js/ui.js'), m = /\/\* LK_WEAK-START \*\/\s*const WEAK = (\{[\s\S]*?\});\s*\/\* LK_WEAK-END \*\//.exec(src);
  if (!m) weakErr.push('web/js/ui.js: thiếu khối LK_WEAK');
  const WF = m ? Function('return ' + m[1])() : {};
  for (const [w, [wuk, wus, ex]] of Object.entries(WF)) {
    if (!wuk || !wus || !ex) { weakErr.push(`${w}: thiếu dạng yếu/câu mẫu`); continue; }
    if (!new RegExp(`\\b${w}\\b`, 'i').test(ex)) weakErr.push(`${w}: câu mẫu "${ex}" không chứa từ`);
    const cmu = cmuIpa(look(CMU, w)); if (!cmu.some(c => near('/' + wus + '/', c))) weakUnconfirmed.push(w);
  }
  st.weak = { n: Object.keys(WF).length, cmuConfirmed: Object.keys(WF).length - weakUnconfirmed.length }; }

// ---- âm thanh từ đơn theo giọng (s3.tsv: từ \t bf_emma \t af_heart) – từ thiếu file dùng giọng máy cùng giọng (đúng thiết kế, docs/WORD-AUDIO.md)
{ const S = new Map(rd('web/audio/w/s3.tsv').split('\n').filter(Boolean).map(l => l.split('\t')).map(([w, a, b]) => [w.toLowerCase(), [a, b]]));
  let both = 0, ukOnly = 0, usOnly = 0, none = 0, pending = 0;
  for (const w of new Set(all.filter(single).map(e => e.row[0].toLowerCase()))) { const s = S.get(w); if (!s) { pending++; continue; } const a = s[0] === 'ok', b = s[1] === 'ok'; if (a && b) both++; else if (a) ukOnly++; else if (b) usOnly++; else none++; }
  st.audio = { both, ukOnly, usOnly, machineOnly: none, notYet: pending }; }

// ---- ghi / cổng
const items = Object.fromEntries(Object.entries(review).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, { ...v, ...(oldRev.items[k] && oldRev.items[k].note ? { note: oldRev.items[k].note } : {}) }]));
const body = { _doc: 'Hàng duyệt IPA (scripts/lexicon/ipa-audit.mjs). Sửa đúng: content/lexicon/overrides.json (ipa/ipaUS) → build-lexicon --write → ipa-audit --fix. Giữ (đúng, nguồn sai): thêm "note".', stats: st, items };
// overrides.json: giữ lối 1 mục/dòng như bản viết tay (diff nhỏ)
const fmtOV = o => '{\n' + Object.entries(o).map(([k, v]) => `  ${JSON.stringify(k)}: ${v && typeof v === 'object' ? '{ ' + Object.entries(v).map(([a, b]) => JSON.stringify(a) + ': ' + JSON.stringify(b)).join(', ') + ' }' : JSON.stringify(v)}`).join(',\n') + '\n}\n';
if (FIX) {
  for (const x of fixes) { if (x.f === 'ipaUS') { delete MAN[x.k]; continue; } OV[x.k] = { ...(OV[x.k] || {}), ipa: x.to }; }
  if (fixes.length) { wr(OVF, fmtOV(OV)); wr(MUS, JSON.stringify(MAN, null, 1) + '\n'); }
  wr(REV, JSON.stringify(body, null, 1) + '\n');
  console.log(fixes.map(x => `  sửa ${x.k} ${x.f} ${x.from} → ${x.to} (${x.why})`).join('\n'));
}
console.log(`ipa-audit: ${st.checked} từ#loại · UK ${JSON.stringify(st.uk)} · US ${JSON.stringify(st.us)} · dạng yếu ${st.weak.n} (CMU xác nhận ${st.weak.cmuConfirmed}) · âm thanh ${JSON.stringify(st.audio)}`);
const errs = [...weakErr];
if (!FIX) {
  if (fixes.length) errs.push(`${fixes.length} IPA sửa được tự động chưa áp → node scripts/lexicon/ipa-audit.mjs --fix && node scripts/build-lexicon.mjs --write`);
  const fresh = Object.keys(review).filter(k => !oldRev.items[k] || oldRev.items[k].ours !== review[k].ours);
  if (fresh.length) errs.push(`${fresh.length} IPA lệch nguồn MỚI chưa duyệt: ${fresh.slice(0, 8).map(k => `${k} ${review[k].ours} (${review[k].britfone || review[k].cmu})`).join(' · ')} → sửa ở overrides.json hoặc chạy --fix để đưa vào hàng duyệt`);
}
if (errs.length) { console.error(errs.join('\n')); console.error(`✗ ipa-audit: ${errs.length} lỗi`); process.exit(1); }
console.log('✓ ipa-audit');
