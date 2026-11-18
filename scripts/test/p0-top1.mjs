// Cổng chặn tái phát P0 của kiểm toán top-1 18/11 (reports/top1-audit/2026-11-18.md, docs/specs/top1-upgrade-plan.md):
//  1) nhãn phần thi (Nghe/Đọc/Viết/Nói) đi qua t() với khoá đã có bản dịch đủ 13 ngôn ngữ – không còn "Listening/Speaking" trần ở Cambridge/Mock/TOEIC;
//  2) vùng chạm ≥ 44 px: quy tắc CSS chung còn đó (link quay lại, ô chọn, summary, nút/chip nhỏ, số câu qe-n);
//  3) chép chính tả: ô chọn chế độ có nhãn nhìn thấy, ô điền có placeholder + aria-label, hàng nút không để nút rớt dòng lẻ.
import fs from 'node:fs';
let bad = 0; const fail = m => { console.error('✗ p0-top1: ' + m); bad++; };
const rd = f => fs.readFileSync(f, 'utf8');
const LANGS = fs.readFileSync('scripts/i18n-langs.txt', 'utf8').split('\n').filter(l => l.trim() && !l.startsWith('#')).join(' ').split(/\s+/);

// 1) nhãn phần thi
const cam = rd('web/js/cambridge.js');
if (!/const PN = nm =>/.test(cam) || (cam.match(/\$\{PN\(nm\)\}/g) || []).length < 2) fail('cambridge.js: nhãn phần thi phải qua PN()/t()');
for (const f of ['web/js/mock.js', 'web/js/toeic.js']) { const s = rd(f); for (const w of ['Listening', 'Reading', 'Writing', 'Speaking']) if (s.includes(`bar('${w}'`)) fail(`${f}: bar('${w}') là chữ Anh trần – dùng bar(t('<khoá>'))`); }
for (const l of LANGS) {
  const src = [`i18n/ui/${l}.js`, ...(fs.existsSync(`i18n/ui/${l}`) ? fs.readdirSync(`i18n/ui/${l}`).map(g => `i18n/ui/${l}/${g}`) : [])].map(rd).join('\n');
  for (const k of ['Nghe hiểu', 'Đọc hiểu', 'Viết', 'Nói']) if (!src.includes(`"${k}":`)) fail(`i18n/ui/${l}: thiếu khoá "${k}"`);
}

// 2) vùng chạm
const tac = rd('web/css/tactile.css'), lz = rd('web/css/lazy-ui.css'), sty = rd('web/css/style.css');
for (const re of [/#view>a\.small::after\{[^}]*top:-13px/, /#view select,#view details>summary\{min-height:44px/, /#view \.btn\.sm,#view button\.chip,#view a\.chip\{min-height:44px/]) if (!re.test(tac)) fail('tactile.css thiếu quy tắc vùng chạm ' + re);
if (!/\.qe-n::after \{ content: ""; position: absolute; inset: -6px; \}/.test(lz)) fail('lazy-ui.css: .qe-n mất vùng chạm mở rộng 44 px');

// 3) chép chính tả
const li = rd('web/js/listening.js');
if (!/<label class="tiny muted" for="dMode">/.test(li)) fail('listening.js: ô chọn chế độ #dMode cần <label for="dMode"> nhìn thấy');
if (!/class="dict-h"[^>]*placeholder="…" aria-label=/.test(li)) fail('listening.js: ô điền .dict-h cần placeholder + aria-label');
if (!/\.q-card \.row\.center #dPlay \{ flex: 1 1 100%/.test(lz) || !/#dPrev, \.q-card \.row\.center #dNext \{ flex: 1 1 0/.test(sty)) fail('lazy-ui.css/style.css: hàng nút chép chính tả mất quy tắc không-rớt-dòng ở ≤ 480 px');
if (bad) process.exit(1);
console.log(`✓ p0-top1: nhãn phần thi dịch ${LANGS.length} ngôn ngữ, vùng chạm 44 px, chép chính tả có nhãn`);
