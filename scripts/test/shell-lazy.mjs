// 🧱 Khóa chỗ trống khung app (01/11): phần đã tách sang gói lười KHÔNG được quay lại khung, và thước đo khung luôn tất định.
//   1) Trang tách khỏi khung (phrases-model.js: #/model #/models #/phrases · dict-page.js: #/dict · league.js) không nằm trong
//      file nạp ngay (SHELL ∪ script/CSS của web/app/index.html), có trong BUNDLES, và route của chúng nạp đúng gói.
//   2) Định nghĩa route đó chỉ ở file lười; App.* mà file lười cần (lemmaT, cleanText, parseHash, extCta…) định nghĩa ở khung.
//   3) size-budget/shell-size đo bằng gzip chuẩn (scripts/lib/gz-canon.mjs, pako = zlib gốc) trên CÙNG danh sách file nạp ngay;
//      không dùng zlib của Node (lệch ~0,7% theo bản dựng/CPU → máy xanh, CI đỏ).
// Dùng: node scripts/test/shell-lazy.mjs   (chạy trong npm test, ngay sau size-budget)
import fs from 'fs';
import zlib from 'zlib';
import { gzSize, firstLoadFiles, swShell, eagerFiles } from '../lib/gz-canon.mjs';

let fail = 0; const ok = (c, m) => { if (c) console.log('✓ shell-lazy: ' + m); else { fail++; console.error('✗ shell-lazy: ' + m); } };
const rd = f => fs.readFileSync(f, 'utf8');
const first = firstLoadFiles(), firstSrc = first.filter(u => /\.js$/.test(u)).map(u => rd('web' + u)).join('\n');
const app = rd('web/js/app.js');
const a = app.indexOf("const G = 'js/grammar/', BUNDLES = {"), b = app.indexOf('\n  };', a);
const BUNDLES = new Function(app.slice(a, b + 4) + '; return BUNDLES;')();
const r0 = app.indexOf('const ROUTE_BUNDLE = {'), r1 = app.indexOf('};', r0);
const ROUTE_BUNDLE = new Function(app.slice(r0, r1 + 2) + '; return ROUTE_BUNDLE;')();

// 1) file lười + gói + route
const LAZY = [
  { file: 'js/phrases-model.js', bundle: 'writing', routes: ['model', 'models', 'phrases'] },
  { file: 'js/dict-page.js', bundle: 'dictp', routes: ['dict'] },
  { file: 'js/league.js', bundle: 'league', routes: ['league'] },
  { file: 'js/stats-page.js', bundle: 'statsp', routes: ['stats'] }, // 06/11: Tiến độ & huy hiệu + thời điểm vàng/tuần này/cấp độ nhớ
];
for (const L of LAZY) {
  ok(fs.existsSync('web/' + L.file), `${L.file} tồn tại`);
  ok(!first.includes('/' + L.file), `${L.file} KHÔNG nằm trong file nạp ngay (SHELL ∪ web/app/index.html)`);
  ok((BUNDLES[L.bundle] || []).includes(L.file), `${L.file} thuộc gói lười '${L.bundle}'`);
  for (const r of L.routes) {
    ok([].concat(ROUTE_BUNDLE[r] || []).includes(L.bundle), `route #/${r} nạp gói '${L.bundle}' trước khi vẽ`);
    const re = new RegExp(`routes\\.${r} = `);
    ok(re.test(rd('web/' + L.file)) && !re.test(firstSrc), `routes.${r} chỉ định nghĩa trong ${L.file} (không trong khung)`);
  }
}
// 2) cầu nối khung → file lười
for (const k of ['lemmaT', 'lemma', 'cleanText', 'phrasePop', 'savePhraseDialog', 'isPhrase', 'parseHash', 'extCta', 'bindCommon', 'guard'])
  ok(new RegExp(`App\\.${k} = `).test(firstSrc), `App.${k} định nghĩa ở khung (file lười dùng ngay khi nạp)`);
ok(/inDeck, [^}]*masteryDots/.test(app) && /\breward, addWord, inDeck\b/.test(app), 'App có state/routes/view/inDeck/masteryDots/reward/addWord (dict-page.js lấy từ App)');
ok(/masteryDots, view, avatarInner \}/.test(app) && /\bstreak\b[^}]*\bview\b/.test(app.slice(app.indexOf('const App = {'), app.indexOf('window.App = App'))), 'App có streak/view/avatarInner (stats-page.js lấy từ App)');

// 3) thước đo tất định, cùng danh sách
const sb = rd('scripts/test/size-budget.mjs'), ss = rd('scripts/test/shell-size.mjs');
const nodeZ = s => /zlib\.(gzip|deflate)|from '(node:)?zlib'|require\('(node:)?zlib'\)/.test(s);
ok(!nodeZ(sb) && !nodeZ(ss) && /gz-canon\.mjs/.test(sb) && /gz-canon\.mjs/.test(ss), 'size-budget & shell-size đo bằng gz-canon (pako), không dùng zlib của Node');
ok(/firstLoadFiles\(\)/.test(sb) && /firstLoadFiles\(\)/.test(ss), 'size-budget & shell-size cùng đếm SHELL ∪ file nạp ngay của /app/');
const sample = Buffer.from(Array.from({ length: 4000 }, (_, i) => `routes.x${i % 37} = function () { return '${'abcdefghij'.slice(i % 7)}' + ${i * 7919 % 1000}; };\n`).join(''));
const g1 = gzSize(sample);
ok(g1 === gzSize(Buffer.from(sample)) && g1 === 14781, `gzip chuẩn cố định trên mọi máy (mẫu = ${g1} B, mong đợi 14781 B)`);
ok(Math.abs(zlib.gzipSync(sample, { level: 9 }).length - g1) < g1 * 0.05, 'gzip chuẩn cùng cỡ zlib mức 9 (±5%) – vẫn là gzip thật');
ok(eagerFiles().every(u => first.includes(u)) && swShell().every(u => first.includes(u)), 'mọi script/CSS nạp ngay của /app/ đều được đếm vào khung');

// 4) Vẽ trước, kho từ sau (06/11, docs/PERF-SCROLL.md › Tải trang): Hôm nay/Ôn không chờ gói 'words' (~311 KB nén) trước lần vẽ đầu;
//    gói nạp sau khi trang vẽ xong; các chỗ dùng kho ở 2 trang này phải có dự phòng khi kho chưa về.
{
  const pf = /const PAINT_FIRST = new Set\(\[([^\]]*)\]\), PAINT_LATE = new Set\(\[([^\]]*)\]\)/.exec(app) || [];
  ok(/'home'/.test(pf[1] || '') && /'review'/.test(pf[1] || '') && /^'words'$/.test(pf[2] || ''), "PAINT_FIRST gồm home + review, PAINT_LATE = 'words'");
  const rt = app.slice(app.indexOf('const b = [].concat(ROUTE_BUNDLE[name]'), app.indexOf('await App.need(...b)'));
  ok(/const late = PAINT_FIRST\.has\(name\)/.test(rt) && /b\.splice\(0, b\.length, \.\.\.b\.filter\(x => !late\.includes\(x\)\)\)/.test(rt), "router bỏ 'words' khỏi danh sách chờ TRƯỚC await App.need(...b)");
  const rd2 = app.slice(app.indexOf('const render = async () => {'), app.indexOf('App.route = route;'));
  ok(rd2.indexOf('if (late.length) App.calm(() => App.need(...late)') > rd2.indexOf('await fn(arg, query)'), "gói 'words' nạp SAU khi trang vẽ (App.calm), không bỏ hẳn");
  ok(/skelHome/.test(app) && /skelReview/.test(app), 'Hôm nay/Ôn vẫn có khung chờ (skeleton) khi gói còn lại tải lâu');
  const st = rd('web/js/study.js');
  ok(/const libNorm = \(\) => libN && \(?libN\.length === TOPICS\.length/.test(st) && /if \(window\.Distract\)/.test(st) && /!window\.Distract \|\| !Distract\.pickAsync/.test(st), 'Ôn: phương án nhiễu có dự phòng khi chưa có distract.js, kho tự làm mới khi TOPICS lớn thêm');
  const ux = rd('web/js/ux1.js'), data = rd('web/js/data.js');
  const ids = ((/ielts: \[([^\]]*)\]/.exec(ux.slice(ux.indexOf('const ORDER'))) || [])[1] || '').match(/'[a-z]+'/g) || [];
  ok(ids.length >= 8 && ids.every(id => data.includes('T(' + id)), 'Hôm nay (ux1): mọi chặng của lộ trình lấy từ data.js (khung), không cần kho words: ' + ids.join(' '));
}

if (fail) { console.error(`✗ shell-lazy: ${fail} lỗi`); process.exit(1); }
console.log('✓ shell-lazy: đạt');
