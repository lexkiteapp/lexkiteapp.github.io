// 🎨 Cổng tương phản TỪ TOKEN (sáng "Bright Day" + tối "Tactile Night"), chạy trong npm test – không cần trình duyệt.
// Nguồn: brand/tokens.json (biến web + vai trò M3 dùng chung Stitch/iOS/Android). Chữ thường ≥ 4.5:1, chữ lớn/icon/viền điều khiển ≥ 3:1 (WCAG 2.2 AA).
// Ngưỡng chỉ được TĂNG (luật no-cuts). Kèm: bước gom màu Stitch (st-theme-snap) phải idempotent và chỉ trỏ tới vai trò có thật.
// Dùng: node scripts/test/token-contrast.mjs
import fs from 'node:fs';
import { snapCss, pick, oklab, roleHex as rh } from '../lib/st-theme-snap.mjs';
const T = JSON.parse(fs.readFileSync('brand/tokens.json', 'utf8')), err = [];
const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
let n = 0;
const need = (a, b, min, what) => { n++; if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return err.push(`${what}: không phải hex 6 số (${a} / ${b})`); const r = cr(a, b); if (r < min) err.push(`${what}: ${a} trên ${b} = ${r.toFixed(2)}:1 < ${min}:1`); };
for (const m of ['light', 'dark']) {
  const v = k => T[m][k] || T.light[k]; // tối không khai báo = kế thừa sáng (giống CSS)
  // 1) Biến web: chữ thường trên mọi nền
  for (const s of ['--bg', '--surface', '--surface-2', '--surface-3']) {
    need(v('--text'), v(s), 4.5, `${m} --text/${s}`); need(v('--muted'), v(s), 4.5, `${m} --muted/${s}`); need(v('--heading'), v(s), 4.5, `${m} --heading/${s}`);
    for (const k of ['primary', 'accent', 'good', 'again', 'gold']) need(v(`--${k}-text`), v(s), 4.5, `${m} --${k}-text/${s}`);
    need(v('--faint'), v(s), 3, `${m} icon --faint/${s}`); need(v('--done'), v(s), 3, `${m} tiến độ --done/${s}`);
  }
  for (const k of ['primary', 'accent', 'good', 'again', 'gold']) need(v(`--${k}-text`), v(`--${k}-soft`), 4.5, `${m} --${k}-text/--${k}-soft`);
  need(v('--primary-ink'), v('--primary'), 4.5, `${m} chữ nút --primary`); need(v('--on-done'), v('--done'), 4.5, `${m} chữ trên --done`);
  for (const c of ['--cta-1', '--cta-2']) need(v('--cta-ink'), v(c), 4.5, `${m} chữ CTA/${c}`);
  // 2) Vai trò M3 (màn Stitch, SwiftUI, Compose): chữ trên mọi bề mặt; viền điều khiển ≥ 3:1 trên nền
  const R = r => rh(T, r, m), SURF = ['background', 'surface', 'surface-container-lowest', 'surface-container-low', 'surface-container', 'surface-container-high', 'surface-container-highest', 'surface-variant'];
  for (const s of SURF) {
    for (const t of ['on-surface', 'on-surface-variant', 'on-background', 'primary', 'secondary', 'error']) need(R(t), R(s), 4.5, `${m} ${t}/${s}`);
    need(R('outline'), R(s), 3, `${m} outline (viền ô nhập)/${s}`);
  }
  for (const [on, bg] of [['on-primary', 'primary'], ['on-secondary', 'secondary'], ['on-error', 'error'], ['on-primary-container', 'primary-container'], ['on-secondary-container', 'secondary-container'], ['on-tertiary-container', 'tertiary-container'], ['on-error-container', 'error-container'], ['inverse-on-surface', 'inverse-surface']]) need(R(on), R(bg), 4.5, `${m} ${on}/${bg}`);
}
// 3) Gom màu Stitch: idempotent + chỉ dùng vai trò có trong tokens
for (const dir of ['web/css', 'extension/app/css']) if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir).filter(f => /^st-.*\.css$/.test(f))) {
  const s = fs.readFileSync(`${dir}/${f}`, 'utf8');
  if (snapCss(s, T) !== s) err.push(`${dir}/${f}: còn lớp lt:/dk: trung tính chưa gom → node scripts/build-tokens.mjs`);
  for (const [, r] of s.matchAll(/var\(--st-([a-z0-9-]+)\)/g)) if (!T.roles[r] && r !== 'hl') { err.push(`${dir}/${f}: --st-${r} không có trong brand/tokens.json roles`); break; }
}
// 3b) Gom màu giữ BẬC: ô/viên/rãnh Stitch tối hơn nền trang (#f2f4f3 trên thanh/thẻ trắng) không được gộp vào nền trang (viên XP/chuỗi ngày,
//     rãnh tiến độ biến mất – stitch-diff header review/practice/leagues sáng); viền mảnh tối của Kit (#233942) = hairline --line, không sáng hơn --line-2
{ const sh = (h, m) => oklab(h)[0], bg = rh(T, 'background', 'light');
  for (const h of ['#F2F4F3', '#E9EFEB']) { const r = pick(T, 'bg', 'light', h); if (!r || sh(rh(T, r, 'light')) >= sh(bg)) err.push(`st-theme-snap: ${h} (sáng) gom vào ${r} – mất bậc nền so với ${bg}`); }
  need(T.light['--cta-2'], rh(T, 'surface-container-low', 'light'), 3.1, 'icon cam CTA (chuỗi ngày, mic, edit_note) trên viên/ô surface-container-low sáng – đo pixel thấp hơn ~.06');
  const ov = rh(T, 'outline-variant', 'dark'); if (sh(ov) > sh(T.dark['--line-2'])) err.push(`outline-variant tối ${ov} sáng hơn --line-2 ${T.dark['--line-2']} – viền thẻ Stitch nổi hơn viền web`);
  if (pick(T, 'border', 'dark', '#233942') !== 'outline-variant') err.push('st-theme-snap: viền Kit #233942 (tối) phải gom vào outline-variant'); }
// 4) Đổi theme mượt + không chớp: chuyển màu ≤ 200 ms chỉ khi KHÔNG giảm chuyển động; app gọi fadeTheme; nền native theo sáng/tối hệ thống
{ const css = fs.readFileSync('web/css/style.css', 'utf8'), js = fs.readFileSync('web/js/app.js', 'utf8');
  const m = css.match(/@media \(prefers-reduced-motion: no-preference\) \{ html\.lk-theming[^{]*\{([^}]*)\}/);
  if (!m) err.push('style.css: thiếu quy tắc html.lk-theming trong @media (prefers-reduced-motion: no-preference)');
  else for (const [, ms] of m[1].matchAll(/\.(\d+)s/g)) if (+('0.' + ms) > .2) err.push(`style.css lk-theming: chuyển màu ${ms} > 200 ms`);
  if (!/fadeTheme\(\); fadeTheme\.on = 1;/.test(js) || !/prefers-reduced-motion: reduce/.test(js)) err.push('web/js/app.js: applyTheme phải gọi fadeTheme (bỏ qua lần đầu + giảm chuyển động)');
  const lt = f => (fs.readFileSync(f, 'utf8').match(/<color name="lk_bg">(#[0-9A-F]{6})</i) || [])[1];
  if (lt('mobile/android/app/src/main/res/values/lk_theme.xml') !== T.light['--bg'] || lt('mobile/android/app/src/main/res/values-night/lk_theme.xml') !== T.dark['--bg']) err.push('Android lk_theme.xml lệch --bg → node scripts/build-tokens.mjs');
  if (!/android:windowBackground">@color\/lk_bg/.test(fs.readFileSync('mobile/android/app/src/main/res/values/styles.xml', 'utf8'))) err.push('Android styles.xml: AppTheme.NoActionBar thiếu windowBackground @color/lk_bg (chớp nền khi mở)');
  if (!/themeBackground\(\)/.test(fs.readFileSync('mobile/ios/App/App/LexkiteBridgeViewController.swift', 'utf8'))) err.push('iOS LexkiteBridgeViewController: thiếu nền WebView theo sáng/tối');
  // XML cấm "--" trong chú thích → aapt mergeDebugResources đỏ (android.yml 06/11: "--bg" trong chú thích lk_theme.xml/styles.xml)
  const walkX = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walkX(d + '/' + e.name) : /\.xml$/.test(e.name) ? [d + '/' + e.name] : []);
  for (const f of walkX('mobile/android/app/src/main/res')) for (const [, c] of fs.readFileSync(f, 'utf8').matchAll(/<!--([\s\S]*?)-->/g)) if (/--/.test(c)) err.push(`${f}: chú thích XML chứa "--" (aapt không dựng được)`);
  const cap = JSON.parse(fs.readFileSync('mobile/capacitor.config.json', 'utf8')); if (!/^#0{8}$/.test(cap.backgroundColor || '')) err.push('capacitor.config.json backgroundColor phải trong suốt (#00000000) để thấy nền cửa sổ theo theme'); }
if (err.length) { console.error('✗ token-contrast:\n  - ' + err.join('\n  - ')); process.exit(1); }
console.log(`✓ token-contrast: ${n} cặp chữ/nền sáng + tối đạt (chữ ≥ 4.5:1, icon/viền ≥ 3:1); màn Stitch dùng chung thang màu`);
