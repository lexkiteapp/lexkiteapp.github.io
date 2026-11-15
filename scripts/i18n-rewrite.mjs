// Công cụ hiệu đính bản dịch giao diện hàng loạt (de/fr/ja/ko…): rút lô → người viết lại → kiểm → áp.
//   node scripts/i18n-rewrite.mjs extract <lang> <nhóm,nhóm|core|all> [--size 100] <thư mục ra>
//   node scripts/i18n-rewrite.mjs apply <lang> <tệp kết quả .json {khóa: bản mới}>   (kiểm biến/thẻ/tiếng Anh mẫu/VI trước khi ghi)
// Bản hiệu lực = nguồn i18n/ui đè bởi scripts/i18n-fixed.json (bản tay luôn thắng) → áp vào ĐÚNG chỗ đang thắng. Khóa native bị khóa: bỏ qua.
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { loadSrc, LAZY, writeSrc, ROOT } from './lib/i18n-pack.mjs';
import { missingSegments } from './i18n-english.mjs';
import { VI, BAD, INFORMAL } from './lib/i18n-rules.mjs';
const [, , cmd, lang, grp, ...rest] = process.argv;
const FIX = path.join(ROOT, 'scripts/i18n-fixed.json'), fixed = JSON.parse(fs.readFileSync(FIX, 'utf8'));
const loadEn = f => { const c = { self: {} }; c.self = c; vm.createContext(c); vm.runInContext(fs.readFileSync(path.join(ROOT, 'web/js/i18n', f), 'utf8'), c); return c.I18N_DICT.en; };
const EN = { ...loadEn('en.js') }, enGroup = {};
for (const g of LAZY) { const d = loadEn(`en/${g}.js`); Object.assign(EN, d); for (const k in d) enGroup[k] = g; }
const lockedIds = (() => { try { const ids = JSON.parse(fs.readFileSync(path.join(ROOT, 'native/shared/strings.json'), 'utf8')); return new Set(Object.values(ids).filter(x => typeof x === 'string')); } catch { return new Set(); } })();
const groups = ['', ...LAZY];
const where = {}; // khóa → nhóm nguồn (''=lõi)
const SRCD = {}; for (const g of groups) { SRCD[g] = loadSrc(lang, g); for (const k in SRCD[g]) where[k] = g; }
const eff = k => (fixed[k] && fixed[k][lang] != null ? fixed[k][lang] : SRCD[where[k]]?.[k]);
const vars = s => (String(s).match(/\{[a-zA-Z0-9_]+\}/g) || []).sort().join(',');
const tags = s => (String(s).match(/<\/?[a-z]+/gi) || []).map(x => x.toLowerCase()).sort().join(',');
if (cmd === 'extract') {
  const want = grp === 'all' ? null : new Set(grp.split(','));
  const size = +(rest[rest.indexOf('--size') + 1] || 100), out = rest.filter((x, i) => rest[i - 1] !== '--size' && x !== '--size')[0];
  const items = [], lockedInf = [];
  for (const k of Object.keys(EN)) { const g = where[k] ?? ''; const gname = g || 'core'; const inG = !want || want.has(gname), isInf = !!(want && want.has('informal') && INFORMAL[lang]?.test(eff(k) ?? '')); if (!inG && !isInf) continue; if (lockedIds.has(k)) { if (isInf) lockedInf.push(k); continue; } items.push({ k, en: EN[k], cur: eff(k), g: gname }); }
  fs.mkdirSync(out, { recursive: true });
  for (let i = 0; i * size < items.length; i++) fs.writeFileSync(path.join(out, `b${String(i).padStart(3, '0')}.json`), JSON.stringify(items.slice(i * size, (i + 1) * size).map(({ k, en, cur }) => ({ k, en, cur })), null, 0));
  console.log('khóa native còn xưng sai (bỏ qua, nguồn bị i18n-fix đè):', lockedInf.length); fs.writeFileSync(path.join(out, 'locked-informal.json'), JSON.stringify(lockedInf)); console.log(items.length + ' mục, ' + Math.ceil(items.length / size) + ' lô');
} else if (cmd === 'apply') {
  const res = JSON.parse(fs.readFileSync(grp, 'utf8')); let ok = 0, bad = [], same = 0; const dirty = new Set(); let fx = 0;
  for (const [k, v] of Object.entries(res)) {
    if (!(k in EN) || typeof v !== 'string') { bad.push([k, 'khóa lạ']); continue; }
    if (v === eff(k)) { same++; continue; }
    const why = vars(v) !== vars(EN[k]) || tags(v) !== tags(EN[k]) ? 'biến/thẻ' : VI.test(v) ? 'tiếng Việt' : BAD.test(v) ? 'BAD' : missingSegments(k, EN[k], v).length ? 'mất tiếng Anh mẫu' : null;
    if (why) { bad.push([k, why]); continue; }
    if (fixed[k] && fixed[k][lang] != null) { fixed[k][lang] = v; fx++; } else { SRCD[where[k]][k] = v; dirty.add(where[k]); }
    ok++;
  }
  for (const g of dirty) writeSrc(lang, g, SRCD[g]);
  if (fx) fs.writeFileSync(FIX, JSON.stringify(fixed, null, 2).replace(/\n/g, '\n') + (fs.readFileSync(FIX, 'utf8').endsWith('\n') ? '\n' : ''));
  console.log(`áp ${ok} (fixed ${fx}), giữ nguyên ${same}, từ chối ${bad.length}`); if (bad.length) { fs.writeFileSync(grp + '.rejected.json', JSON.stringify(bad, null, 1)); console.log(bad.slice(0, 8).map(x => x.join(' ⇒ ')).join('\n')); }
}
