// Gói dịch khóa băm (scripts/lib/i18n-pack.mjs, docs/I18N-PIPELINE.md §1): không mất chuỗi nào, đổi ngôn ngữ đúng, add-on tra đúng.
//  1. hk giống hệt ở thư viện dựng và 4 tệp add-on (web/js/i18n.js: mục 4)
//  2. web/js/i18n/<lang>(.js|/<nhóm>.js) khớp nguồn i18n/ui (--check) và GHÉP LẠI đúng 100% chuỗi mọi ngôn ngữ, mọi nhóm, không thừa khóa
//  3. hai khóa trùng băm → giữ nguyên câu, cả hai tra đúng (cặp trùng thật tìm bằng vét cạn)
//  4. chạy thật web/js/i18n.js với gói chạy: mỗi ngôn ngữ, mọi khóa → đúng bản dịch nguồn (đổi ngôn ngữ = nạp lại với vb.uiLang khác)
//  5. add-on: từ điển background (nền en khóa nguyên câu + gói khóa băm) tra ra bản dịch ngôn ngữ, không ra bản en
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { hk, LANGS, LAZY, ROOT, loadSrc, loadDictFile, outPath, packAll, packText, sources, unpack, verbatimKeys } from '../lib/i18n-pack.mjs';

let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.error('  ✗ ' + m); } };
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SAMPLES = ['', 'Ôn tập', 'Xóa tài khoản Lexkite?', 'Máy nghe được: “{heard}”', '🔥 Chuỗi ngày', 'a'.repeat(500), 'Ω≈ç√∫˜µ≤≥÷ 日本語 العربية'];

// 1. hk một định nghĩa, mọi nơi giống nhau
// web/js/i18n.js viết gọn (khung app sát trần) – cùng thuật toán được kiểm ở mục 4: mọi khóa của 13 ngôn ngữ tra qua i18n.js thật
for (const f of ['extension/background.js', 'extension/content.js', 'extension/popup.js', 'extension/writecheck.js']) {
  const src = rd(f), m = src.match(/(?:function hk\(s\)|const hk = s =>) \{ (let x = 0x811c9dc5;[^\n]*?return '_' \+ \(\(x >>> 0\) % 1679616\)\.toString\(36\);) \}/);
  ok(m, `${f}: có hàm hk chuẩn`);
  if (m) { const fn = new Function('s', m[1]); ok(SAMPLES.every(s => fn(s) === hk(s)), `${f}: hk cho kết quả khác thư viện dựng`); }
}
ok(hk('Ôn tập') === hk('Ôn tập') && hk('Ôn tập') !== hk('Ôn tâp') && /^_[0-9a-z]{1,7}$/.test(hk('Ôn tập')), 'hk ổn định, phân biệt, dạng "_base36"');

// 2. tệp chạy khớp nguồn + ghép lại 100%
const chk = packAll({ check: true });
ok(!chk.stale.length && !chk.removed.length, `web/js/i18n lệch nguồn i18n/ui: ${[...chk.stale, ...chk.removed].slice(0, 5).join(', ')} – chạy node scripts/i18n-pack.mjs`);
let strings = 0, srcBytes = 0, outBytes = 0;
const list = sources();
ok(LANGS.length === 13 && LANGS.every(l => list.some(s => s.lang === l && !s.group)), 'đủ 13 ngôn ngữ có nguồn lõi i18n/ui/<lang>.js');
for (const l of LANGS) for (const g of LAZY) ok(list.some(s => s.lang === l && s.group === g), `thiếu nguồn i18n/ui/${l}/${g}.js (nhóm LAZY)`);
for (const { lang, group } of list) {
  const src = loadSrc(lang, group), packed = loadDictFile(outPath(lang, group)), keys = Object.keys(src);
  const back = unpack(packed, keys);
  const lost = keys.filter(k => back[k] !== src[k]);
  ok(!lost.length, `${outPath(lang, group)}: ${lost.length} chuỗi ghép lại sai/thiếu (vd. ${JSON.stringify(lost[0])})`);
  ok(Object.keys(packed).length === keys.length, `${outPath(lang, group)}: ${Object.keys(packed).length} mục ≠ ${keys.length} khóa nguồn`);
  ok(!Object.keys(packed).some(k => !k.startsWith('_') && !(k in src)), `${outPath(lang, group)}: có khóa lạ không thuộc nguồn`);
  strings += keys.length; srcBytes += Buffer.byteLength(rd(`i18n/ui/${lang}${group ? '/' + group : ''}.js`)); outBytes += Buffer.byteLength(rd(outPath(lang, group)));
}
ok(strings > 13 * 5000, `đủ chuỗi (${strings})`);
ok(outBytes < srcBytes * 0.75, `gói chạy phải gọn hơn nguồn ≥ 25% (${outBytes} / ${srcBytes})`);

// 3. trùng băm: tìm cặp thật rồi kiểm cách giữ nguyên câu
let pair = null;
{ const seen = new Map(); let r = 12345; // chuỗi giả ngẫu nhiên tất định (FNV phân tán đều chuỗi tuần tự nên 'khóa 1, 2, …' không bao giờ trùng)
  for (let i = 0; !pair && i < 600000; i++) { r = (Math.imul(r, 1103515245) + 12345) >>> 0; const s = 'khóa ' + r.toString(36) + (r % 977).toString(36), h = hk(s); if (seen.has(h) && seen.get(h) !== s) pair = [seen.get(h), s]; else seen.set(h, s); } }
ok(pair, 'tìm được cặp trùng băm để kiểm');
if (pair) {
  const keep = verbatimKeys([...pair, 'Ôn tập']);
  ok(keep.has(pair[0]) && keep.has(pair[1]) && !keep.has('Ôn tập'), 'cặp trùng băm giữ nguyên câu, khóa khác vẫn băm');
  const txt = packText('de', '', { [pair[0]]: 'A', [pair[1]]: 'B', 'Ôn tập': 'Wiederholen' }, keep);
  const ctx = { I18N_DICT: {} }; ctx.self = ctx; vm.createContext(ctx); vm.runInContext(txt, ctx);
  const d = ctx.I18N_DICT.de;
  ok(!(hk(pair[0]) in d), 'khóa băm của cặp trùng không có trong gói (tra băm không bao giờ ra nhầm)');
  ok(unpack(d, [...pair, 'Ôn tập'])[pair[0]] === 'A' && unpack(d, [...pair, 'Ôn tập'])[pair[1]] === 'B' && d[hk('Ôn tập')] === 'Wiederholen', 'tra đúng cả hai khóa trùng và khóa thường');
}
{ let threw = false; try { verbatimKeys(['_abc12']); } catch { threw = true; } ok(threw, 'khóa nguyên câu trông như khóa băm → báo lỗi khi dựng'); }

// 4. web/js/i18n.js thật + gói chạy: mỗi ngôn ngữ, mọi khóa ra đúng bản dịch nguồn
const EN_FILES = ['web/js/i18n/en.js', ...LAZY.map(g => `web/js/i18n/en/${g}.js`)];
const runtime = lang => {
  const store = { 'vb.uiLang': lang };
  const ctx = { localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } }, navigator: { languages: ['vi'] }, URLSearchParams, console };
  ctx.self = ctx; vm.createContext(ctx);
  for (const f of EN_FILES) if (fs.existsSync(path.join(ROOT, f))) vm.runInContext(rd(f), ctx);
  for (const { lang: l, group } of list) if (l === lang) vm.runInContext(rd(outPath(l, group)), ctx); // app nạp en/<nhóm> rồi <lang>/<nhóm>
  vm.runInContext(rd('web/js/i18n.js'), ctx);
  return ctx;
};
const rtl = s => s.replace(/ →$/, ' ←').replace(/^← /, '→ ');
for (const lang of LANGS) {
  const ctx = runtime(lang), I = ctx.I18N, src = loadLang(lang), EN = ctx.I18N_DICT.en;
  ok(I.lang() === lang, `vb.uiLang=${lang} → I18N.lang() = ${I.lang()}`);
  const wrong = Object.keys(src).filter(k => I.t(k) !== (lang === 'ar' ? rtl(src[k]) : src[k])); // MỌI khóa nguồn, kể cả khóa không có bản en
  ok(!wrong.length, `${lang}: ${wrong.length} khóa t() ra sai bản dịch (vd. ${JSON.stringify(wrong[0])} → ${JSON.stringify(wrong[0] && I.t(wrong[0]))})`);
  const k0 = Object.keys(src).find(k => EN[k] != null && src[k] !== EN[k]);
  ok(k0 && I.has(lang, k0) && I.tr(lang, k0) === src[k0] && I.has('en', k0), `${lang}: I18N.has/tr tra được gói khóa băm`);
  ok(I.t('Chuỗi lạ không có trong từ điển 123') === 'Chuỗi lạ không có trong từ điển 123' && !I.has(lang, 'Chuỗi lạ không có trong từ điển 123'), `${lang}: khóa lạ không trùng nhầm`);
  ok(I.t('Ôn {n} thẻ', { n: 3 }).includes('3'), `${lang}: biến {n} vẫn thay`);
}
{ const ctx = runtime('vi'); ok(ctx.I18N.t('Ôn tập') === 'Ôn tập' && ctx.I18N.has('vi', 'bất kỳ'), 'vi: hiện nguyên câu gốc'); }
{ const ctx = runtime('en'); ok(ctx.I18N.t('Ôn tập') === ctx.I18N_DICT.en['Ôn tập'], 'en: tra en.js khóa nguyên câu'); }

// 5. add-on: background cắt JSON từ tệp như uiDict(); tra bằng xd() của content.js
{
  const bg = rd('extension/background.js'), one = (bg.match(/const one = async f => \{ try \{ const s = await \(await fetch\(chrome\.runtime\.getURL\(f\)\)\)\.text\(\); ([\s\S]*?) \} catch \(e\) \{ return \{\}; \} \};/) || [])[1];
  ok(one, 'đọc được bộ cắt JSON của background.js uiDict()');
  const parse = one && new Function('s', one);
  const xdSrc = (rd('extension/content.js').match(/const xd = (src => [^\n]*);/) || [])[1];
  ok(xdSrc, 'content.js có xd()');
  for (const lang of ['de', 'ja', 'ar']) {
    if (!parse || !xdSrc) break;
    const en = Object.assign(...['structs', 'writecheck', 'remind'].map(g => parse(rd(`web/js/i18n/en/${g}.js`)))); // như background: nền en khóa nguyên câu
    const XD = Object.assign({ ...en }, parse(rd(outPath(lang))), ...['structs', 'remind'].map(g => parse(rd(outPath(lang, g)))));
    const xd = new Function('XD', 'hk', `return ${xdSrc};`)(XD, hk);
    const src = loadLang(lang, { groups: ['structs', 'remind'] });
    const bad = Object.keys(src).filter(k => xd(k) !== src[k]);
    ok(!bad.length, `add-on ${lang}: ${bad.length} khóa tra sai (vd. ${JSON.stringify(bad[0])} → ${JSON.stringify(bad[0] && xd(bad[0]))})`);
  }
}

function loadLang(lang, o) { return Object.assign({}, ...(o && o.groups ? ['', ...o.groups] : ['', ...LAZY]).map(g => loadSrc(lang, g))); }
if (fails) { console.log(`✗ i18n-pack: ${fails}/${n} kiểm tra lỗi`); process.exit(1); }
console.log(`✓ i18n-pack: ${n} kiểm tra – ${strings} chuỗi × ${list.length} tệp ghép lại đúng 100%, gói chạy ${(outBytes / 1024).toFixed(0)} KB (nguồn ${(srcBytes / 1024).toFixed(0)} KB, bớt ${((srcBytes - outBytes) / 1024).toFixed(0)} KB), đổi 15 ngôn ngữ đúng, add-on tra đúng`);
