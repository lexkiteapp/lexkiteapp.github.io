#!/usr/bin/env node
// 🌐 App.need nạp chuỗi lười CHỌN LỌC (js/app.js › I18N_NEED): gói trong bảng chỉ chờ tệp en/*.js nó thật sự dùng → #/dict, #/review, #/me bớt ~25–40 KB trước lần vẽ đầu (LCP, 21/11).
// Gác: (1) bảng phủ MỌI khóa của 9 tệp (structs toefl league call handoff verbs exams skills lazyui) mà tệp nào trong gói đó dùng (khớp chữ nghĩa lỏng → thừa an toàn, thiếu = đỏ);
// (2) khung app (thẻ <script> của web/app/index.html) không gọi t('…') bằng khóa chỉ có trong 9 tệp đó (không thì chữ Việt lộ ra ở màn nạp sớm); (3) tên trong bảng có trong bundles.js.
import fs from 'fs'; import vm from 'vm';
const rd = f => fs.readFileSync(f, 'utf8'), bad = [];
const load = f => { const w = {}; w.window = w; vm.runInNewContext(rd(f), w); return Object.keys((w.I18N_DICT || {}).en || {}); };
const app = rd('web/js/app.js');
const all = (/const I18N_ALL = (\[[^\]]*\])/.exec(app) || [])[1], tbl = (/const I18N_NEED = (\{[^}]*\})/.exec(app) || [])[1];
if (!all || !tbl) { console.error('✗ i18n-need: không thấy I18N_ALL / I18N_NEED trong js/app.js'); process.exit(1); }
const ALL = JSON.parse(all.replace(/'/g, '"')), NEED = new Function('return ' + tbl)();
const bw = {}; bw.window = bw; vm.runInNewContext(rd('web/js/bundles.js'), bw); const B = bw.LK_BUNDLES;
const lazyList = n => (B[n] || []).map(f => f.replace(/^js\/i18n\/en\/(.+)\.js$/, '$1'));
const want = [...lazyList('i18nx'), ...lazyList('i18nl')].sort().join();
if (want !== [...ALL].sort().join()) bad.push(`I18N_ALL (${ALL}) lệch bundles.js i18nx+i18nl (${want})`);
const grp = {}; for (const g of ALL) for (const k of load(`web/js/i18n/en/${g}.js`)) if (k.length > 3) (grp[k] = grp[k] || new Set()).add(g);
const keys = Object.keys(grp);
const lit = (t, k) => t.includes("'" + k + "'") || t.includes('`' + k + '`') || t.includes('"' + k + '"');
for (const [n, need] of Object.entries(NEED)) {
  if (!B[n]) { bad.push(`I18N_NEED.${n}: không có trong bundles.js`); continue; }
  for (const g of need) if (!ALL.includes(g)) bad.push(`I18N_NEED.${n}: nhóm lạ ${g}`);
  for (const f of B[n]) { if (/^js\/i18n\//.test(f) || !fs.existsSync('web/' + f)) continue; const t = rd('web/' + f);
    for (const k of keys) if (lit(t, k)) for (const g of grp[k]) if (!need.includes(g)) bad.push(`I18N_NEED.${n} thiếu "${g}": ${f} dùng khóa "${k.slice(0, 40)}"`); }
}
const shell = new Set(load('web/js/i18n/en.js')), idx = rd('web/app/index.html');
for (const m of idx.matchAll(/<script[^>]* src="js\/([^"]+\.js)"/g)) { const f = 'web/js/' + m[1]; if (!fs.existsSync(f)) continue; const t = rd(f);
  for (const k of keys) if (!shell.has(k) && new RegExp('\\bt\\(\\s*[\'"`]' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\'"`]').test(t)) bad.push(`khung app ${m[1]} gọi t("${k.slice(0, 40)}") mà khóa chỉ có ở nhóm lười ${[...grp[k]]} – chuyển khóa vào en/xcore.js`); }
if (bad.length) { console.error('✗ i18n-need:\n- ' + [...new Set(bad)].slice(0, 40).join('\n- ')); process.exit(1); }
console.log(`✓ i18n-need: ${Object.keys(NEED).length} gói chỉ nạp tệp chuỗi lười mình dùng (${keys.length} khóa lười) · khung app không phụ thuộc nhóm lười`);
