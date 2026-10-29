// 🎨 Stitch → CSS: biên dịch class Tailwind của mẫu Google Stitch (web/js/st/*.js) thành CSS nhỏ theo nhóm màn, nạp lười (BCSS).
// Nguồn token: brand/stitch/tokens.dtcg.json (W3C DTCG; $value = tối A, $extensions.com.lexkite.mode.light = sáng B).
// Màu → biến CSS dạng "R G B" để 1 DOM chạy cả sáng/tối và giữ được /opacity của Tailwind. Không CDN, không preflight (không đụng phần còn lại của app).
// Dùng:  node scripts/build-stitch-css.mjs            → ghi web/css/st-<nhóm>.css, in kích thước gz (≤ 10 KB/nhóm)
//        node scripts/build-stitch-css.mjs --check    → CI: biên dịch lại, ĐỎ nếu khác bản đã commit (trôi) hoặc vượt ngân sách
//        node scripts/build-stitch-css.mjs --fonts    → tải lại font tự host (Plus Jakarta Sans latin/latin-ext/vietnamese + Material Symbols subset)
// Cần tailwindcss@3.4.17 (CI: npm i --no-save). TAILWIND_BIN=… để chỉ đường khác. docs/DESIGN-SYSTEM.md §Stitch.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import zlib from 'node:zlib'; import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const ROOT = process.cwd(), A = new Set(process.argv.slice(2)), BUDGET = 10 * 1024;
const TOK = JSON.parse(fs.readFileSync('brand/stitch/tokens.dtcg.json', 'utf8'));
// Nhóm màn = 1 file CSS. common.js (đầu trang, thanh tab, nút) góp vào mọi nhóm.
const GROUPS = { home: ['web/js/st/common.js', 'web/js/st/home.js'], lesson: ['web/js/st/common.js', 'web/js/st/lesson.js'], goal: ['web/js/st/common.js', 'web/js/st/goal.js'] };
// Màn Stitch v2 (khung TỰ SINH bởi scripts/stitch-v2-convert.mjs – web/js/st/v2/<màn>.js): mỗi màn 1 nhóm = vỏ chung + khung màn + file gắn dữ liệu.
//   Cấu hình Tailwind MẶC ĐỊNH thuần (như Stitch): tên màu/cỡ chữ/bo góc của Stitch đã được bộ chuyển đổi ra giá trị thật.
const V2 = fs.existsSync('web/js/st/v2') ? fs.readdirSync('web/js/st/v2').filter(f => f.endsWith('.js') && !/^(shell|runtime)\.js$/.test(f)).map(f => f.slice(0, -3)) : [];
const V2DATA = { path: ['web/js/ux1.js'], review: ['web/js/ux1.js'], practice: ['web/js/ux1.js'], me: ['web/js/ux1-me.js'], streak: ['web/js/retention.js'], 'exam-readiness': ['web/js/goal.js'], 'teacher-call': ['web/js/call.js'] }; // file JS dựng dữ liệu d cho khung (class viết nguyên văn trong đó cũng được biên dịch)
for (const k of V2) GROUPS['v2-' + k] = ['web/js/st/v2/runtime.js', 'web/js/st/v2/shell.js', `web/js/st/v2/${k}.js`, ...(V2DATA[k] || [])].filter(f => fs.existsSync(f));
const OUT = g => `web/css/st-${g}.css`;

const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(' ');
const C = Object.entries(TOK.color);
const vars = mode => C.map(([k, v]) => `--st-${k}:${rgb(mode === 'light' ? v.$extensions['com.lexkite.mode'].light : v.$value)}`).join(';');
const LIGHT = vars('light') + ';--st-hl:.7', DARK = vars('dark') + ';--st-hl:0'; // --st-hl: độ đậm viền mảnh (chỉ bản sáng B có viền)

// ---- tiền tố CSS viết tay (không qua Tailwind): biến màu sáng/tối theo đúng cơ chế style.css, font tự host, icon, khung màn ----
const UR = { latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  'latin-ext': 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
  vietnamese: 'U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB' };
const PRE = [
  `:root{${LIGHT}}@media (prefers-color-scheme:dark){:root:not([data-theme=light]){${DARK}}}:root[data-theme=dark]{${DARK}}`,
  ...Object.entries(UR).map(([s, r]) => `@font-face{font-family:"Plus Jakarta Sans";font-style:normal;font-weight:400 800;font-display:swap;src:url(../fonts/pjs-${s}.woff2) format("woff2");unicode-range:${r}}`),
  // Font dự phòng khớp số đo (capsize: size-adjust 104.98 %, ascent 98.88 %, descent 21.15 %) → không CLS khi font web tới
  '@font-face{font-family:"Plus Jakarta Sans Fallback";src:local("Arial"),local("ArialMT"),local("Liberation Sans"),local("Helvetica"),local("Roboto");size-adjust:104.98%;ascent-override:98.88%;descent-override:21.15%;line-gap-override:0%}',
  '@font-face{font-family:"Material Symbols Outlined";font-style:normal;font-weight:400 700;font-display:block;src:url(../fonts/msym.woff2) format("woff2")}',
  // Stitch v2.1 dùng cả bản Rounded (Luyện/Tôi/Chuỗi…) → tự host bản Rounded cùng danh sách icon (web/fonts/msymr.woff2)
  '@font-face{font-family:"Material Symbols Rounded";font-style:normal;font-weight:400 700;font-display:block;src:url(../fonts/msymr.woff2) format("woff2")}.material-symbols-rounded{font-family:"Material Symbols Rounded";font-weight:400;font-style:normal;font-size:24px;line-height:1;letter-spacing:normal;text-transform:none;display:inline-block;white-space:nowrap;word-wrap:normal;direction:ltr;-webkit-font-feature-settings:"liga";font-feature-settings:"liga";-webkit-font-smoothing:antialiased;width:1em;height:1em;overflow:hidden;flex-shrink:0;font-variation-settings:"FILL" 0}.material-symbols-rounded.fill{font-variation-settings:"FILL" 1}',
  '.material-symbols-outlined{font-family:"Material Symbols Outlined";font-weight:400;font-style:normal;font-size:24px;line-height:1;letter-spacing:normal;text-transform:none;display:inline-block;white-space:nowrap;word-wrap:normal;direction:ltr;-webkit-font-feature-settings:"liga";font-feature-settings:"liga";-webkit-font-smoothing:antialiased;width:1em;height:1em;overflow:hidden;flex-shrink:0;font-variation-settings:"FILL" 0}',
  '.material-symbols-outlined.fill{font-variation-settings:"FILL" 1}[dir=rtl] .st .ms-flip{transform:scaleX(-1)}',
  // Màn Stitch chiếm trọn #view (bỏ đệm/khung của app cũ); chuyển động: chỉ mờ dần 180 ms, tôn trọng giảm chuyển động
  'body.st #view{padding:0;max-width:none;background:rgb(var(--st-surface))}.st{font-family:"Plus Jakarta Sans","Plus Jakarta Sans Fallback",system-ui,sans-serif;word-spacing:.08em;-webkit-tap-highlight-color:transparent}.st .grid:not([class*=gap-]){gap:0}.st .grid.grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))!important}.st button,.st a{font-family:inherit;-webkit-tap-highlight-color:transparent}.st :focus-visible{outline:3px solid rgb(var(--st-secondary));outline-offset:2px}',
  // Vỏ app theo Stitch khi bật ux1: đầu trang (nền mờ + viên thuốc 44 px) và thanh tab dưới (lớp Tailwind đặt trên #bnav, ở đây chỉ gỡ kiểu cũ đè lên)
  'body.ux1 .topbar{background:rgb(var(--st-surface)/.85);border-bottom:0;box-shadow:0 1px 8px rgba(0,0,0,.3);font-family:"Plus Jakarta Sans","Plus Jakarta Sans Fallback",system-ui,sans-serif}body.ux1 .topbar .pill,body.ux1 .topbar .icon-btn,body.ux1 .topbar .lsw-b,body.ux1 .gsearch input{background:rgb(var(--st-surface-container));border:1px solid rgb(var(--st-outline-variant)/var(--st-hl));border-radius:9999px;min-height:44px}body.ux1 .topbar .pill{font-size:12px;line-height:16px;font-weight:800;letter-spacing:.06em;padding:.375rem .625rem}body.ux1 #examChip{color:rgb(var(--st-secondary));text-transform:uppercase}body.ux1 .topbar .pill.fire{color:rgb(var(--st-star));}@media (prefers-color-scheme:light){:root:not([data-theme=dark]) body.ux1 .topbar .pill.fire{color:rgb(var(--st-tertiary))}}:root[data-theme=light] body.ux1 .topbar .pill.fire{color:rgb(var(--st-tertiary))}body.ux1 .topbar .pill.fire{border-color:rgb(var(--st-star)/.45);background:rgb(var(--st-star)/.1)}body.ux1 .topbar .pill.xp{color:rgb(var(--st-secondary))}',
  // Điện thoại: ô tra từ thu thành nút tròn 44 px (chạm → mở rộng, gõ như cũ) – đầu trang gọn như app lớn, không bỏ chức năng
  '@media (max-width:600px){body.ux1 .gsearch{flex:0 0 44px;max-width:none;transition:flex-basis .18s ease}body.ux1 .gsearch:focus-within{flex:1 1 auto}body.ux1 .gsearch input{height:44px;padding:0 0 0 44px!important;color:transparent;cursor:pointer}body.ux1 .gsearch input::placeholder{color:transparent}body.ux1 .gsearch:focus-within input{padding:0 .8rem 0 2.4rem!important;color:rgb(var(--st-on-surface));cursor:text}body.ux1 .gsearch:focus-within input::placeholder{color:rgb(var(--st-on-surface-variant))}body.ux1 .gsearch .sicon{left:13px!important;color:rgb(var(--st-on-surface))}body.ux1 .gsearch:focus-within .sicon{left:.8rem!important}body.ux1 .topbar .icon-btn{width:44px;height:44px;display:inline-grid;place-items:center;padding:0}}',
  // Máy tính (≥ 1024 px, ux1): menu trái + cột phải theo Stitch – chữ Plus Jakarta, mục đang chọn có khung + gờ, thẻ cột phải viền 2 px + gờ 5 px
  '@media (min-width:1024px){body.ux1 .shell,body.ux1 .sidebar{background:rgb(var(--st-surface))}body.ux1 .sidebar{border-right:2px solid rgb(var(--st-outline-variant)/.7)}body.ux1 .sidebar #nav a{font-family:"Plus Jakarta Sans","Plus Jakarta Sans Fallback",system-ui,sans-serif;font-weight:800;font-size:13px;letter-spacing:.06em;min-height:52px;border-radius:16px;border:2px solid transparent;color:rgb(var(--st-on-surface-variant))}body.ux1 .sidebar #nav a:hover{background:rgb(var(--st-surface-container))}body.ux1 .sidebar #nav a.active{color:rgb(var(--st-secondary));background:rgb(var(--st-secondary-container)/.14);border-color:rgb(var(--st-secondary)/.6);border-bottom-width:4px}body.ux1 .ux1-rail{font-family:"Plus Jakarta Sans","Plus Jakarta Sans Fallback",system-ui,sans-serif}body.ux1 .ux1-rail .card,body.ux1 .ux1-rail .ux1-exam,body.ux1 .ux1-rail .lg-card{background:rgb(var(--st-surface-container));border:2px solid rgb(var(--st-outline-variant)/.8);border-bottom-width:5px;border-radius:16px;box-shadow:none;color:rgb(var(--st-on-surface))}body.ux1 .ux1-rail .btn{border-radius:9999px;border:2px solid rgb(var(--st-outline-variant));border-bottom-width:4px;font-weight:800}body.ux1 .ux1-rail .btn.primary{background:linear-gradient(90deg,rgb(var(--st-primary-container)),rgb(var(--st-tertiary)));color:rgb(var(--st-on-primary-container));border:0;box-shadow:inset 0 3px 0 rgba(255,255,255,.35),0 5px 0 0 rgb(var(--st-lip-primary))}body.ux1 .ux1-stat{font-family:inherit;font-weight:800}body.ux1 .ux1-rail .progress{height:12px;border-radius:9999px;background:rgb(var(--st-surface-container-highest))}body.ux1 .ux1-rail .progress i{background:linear-gradient(90deg,rgb(var(--st-secondary-container)),rgb(var(--st-secondary)));border-radius:9999px}}',
  '.bottom-nav.st-nav{border-top-color:transparent;padding:0;align-items:stretch}.bottom-nav.st-nav a.st-tab{flex:1;font-size:12px;color:rgb(var(--st-on-surface-variant))}.bottom-nav.st-nav a.st-tab.active{color:rgb(var(--st-secondary))}.bottom-nav.st-nav a.st-tab span{font-size:11px;line-height:16px}.bottom-nav.st-nav a.st-tab .material-symbols-outlined{font-size:22px;line-height:1}.bottom-nav.st-nav a.st-tab.active{border-color:rgb(var(--st-secondary-container));background:rgb(var(--st-secondary-container)/.15)}:root:not([data-theme=dark]) .bottom-nav.st-nav a.st-tab.active .st-tabi{background:rgb(var(--st-secondary-container)/.15)}@media (prefers-color-scheme:dark){:root:not([data-theme=light]) .bottom-nav.st-nav a.st-tab.active .st-tabi{background:rgb(var(--st-surface-container-high));border-color:rgb(var(--st-secondary));box-shadow:0 4px 0 rgb(var(--st-lip-secondary))}}',
  // Chuyển động (chủ 28/10 mở luật): nút nhún 120 ms (lớp active: của Tailwind) · ăn mừng khi xong bài = pop ≤ 200 ms + vài hạt ≤ 1 s · tắt hết khi giảm chuyển động
  '.st [class*="active:translate-y"]{transition-duration:120ms}.st-pop{animation:st-pop .2s cubic-bezier(.2,.9,.3,1.25) both}@keyframes st-pop{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:none}}.st-burst{position:absolute;inset:0;pointer-events:none;overflow:visible}.st-burst i{position:absolute;left:50%;top:45%;width:8px;height:8px;border-radius:2px;opacity:0;animation:st-burst .9s cubic-bezier(.15,.7,.3,1) .1s both}@keyframes st-burst{0%{opacity:1;transform:translate(-50%,-50%) scale(.6)}100%{opacity:0;transform:translate(calc(-50% + var(--x)),calc(-50% + var(--y))) rotate(var(--r)) scale(1)}}@media (prefers-reduced-motion:reduce){.st-pop{animation:none}.st-burst{display:none}}',
  // v2: reset tối thiểu CHỈ trong .v2 (thay preflight của Tailwind mà Stitch dựa vào) – không đụng phần còn lại của app
  ':where(.v2),:where(.v2) *,:where(.v2) ::before,:where(.v2) ::after{box-sizing:border-box;border:0 solid}:where(.v2) :where(h1,h2,h3,h4,h5,p,figure,blockquote,dl,dd,ol,ul){margin:0}:where(.v2) :where(h1,h2,h3,h4,h5){font-size:inherit;font-weight:inherit}:where(.v2) :where(ol,ul){list-style:none;padding:0}:where(.v2) :where(button){background-color:transparent;background-image:none;padding:0;font:inherit;color:inherit;cursor:pointer;line-height:inherit}:where(.v2) :where(a){color:inherit;text-decoration:inherit}:where(.v2) :where(img,svg,video){display:block;vertical-align:middle}:where(.v2) :where(img,video){max-width:100%;height:auto}:where(.v2) [hidden]{display:none}', // :where = độ ưu tiên 0 (như preflight gốc) → class Stitch luôn thắng (gradient nút, cỡ chữ h1, màu icon trong link)
  // v2 vỏ app: điện thoại (< 1024 px) dùng đầu trang + thanh tab Stitch (ẩn topbar/#bnav cũ) · máy tính giữ menu trái + đầu trang của app, ẩn vỏ Stitch
  '@media (max-width:1023px){body.v2on .topbar,body.v2on #bnav{display:none!important}}body.v2on #view{padding:0;max-width:none}@media (min-width:1024px){body.v2on .v2>header,body.v2on .v2>nav{display:none}body.v2on .v2>main{padding-top:0;padding-bottom:0}body.v2on .v2{max-width:480px;margin:0 auto;min-height:0}}',
  '.st-fade{animation:st-fade .18s cubic-bezier(.2,0,0,1) both}@keyframes st-fade{from{opacity:0}to{opacity:1}}.st-rise{animation:st-rise .2s cubic-bezier(.2,0,0,1) both}@keyframes st-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){.st-fade,.st-rise{animation:none}.st *{transition:none!important}}',
].join('\n');

function configV2(content, g) { // Tailwind mặc định + biến thể lt:/dk:/rtl: (không token cũ của app → bo góc/khoảng cách y như Stitch)
  // important: '.v2s-<màn>' = khóa phạm vi: gói ux1 nạp CSS NHIỀU màn cùng lúc → rule cùng tên ở file nạp sau đè file trước (vd from-* đặt lại --tw-gradient-to → mất màu cuối gradient).
  // Có phạm vi: rule chỉ áp trong khung màn đó, độ ưu tiên cao hơn CSS chung → thứ tự nạp file không còn ảnh hưởng. runtime.js bọc khung trong <div class="v2s-<màn>">.
  return `const plugin = require(${JSON.stringify(path.join(twDir(), 'plugin'))});
module.exports = { important: ${JSON.stringify('.v2s-' + g.slice(3))}, content: ${JSON.stringify(content.map(f => path.join(ROOT, f)))}, corePlugins: { preflight: false },
  plugins: [plugin(({ addVariant }) => { addVariant('lt', ['@media (prefers-color-scheme: light) { :root:not([data-theme=dark]) & }', ':root[data-theme=light] &']); addVariant('dk', ['@media (prefers-color-scheme: dark) { :root:not([data-theme=light]) & }', ':root[data-theme=dark] &']); addVariant('rtl', '[dir=rtl] &'); })] };`; }
function config(content) {
  const colors = Object.fromEntries(C.map(([k]) => [k, `rgb(var(--st-${k}) / <alpha-value>)`]));
  const fontSize = Object.fromEntries(Object.entries(TOK.typography).map(([k, { $value: v }]) => [k, [v.fontSize, { lineHeight: v.lineHeight, letterSpacing: v.letterSpacing, fontWeight: String(v.fontWeight) }]]));
  const fam = TOK.font.family.sans.$value, fontFamily = Object.fromEntries(Object.keys(TOK.typography).map(k => [k, fam]));
  const dim = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.$value]));
  const sh = TOK.shadow['card-soft'].$value.map(s => `${s.offsetX} ${s.offsetY} ${s.blur} ${s.spread} ${hexA(s.color)}`).join(', ');
  return `const plugin = require(${JSON.stringify(path.join(twDir(), 'plugin'))});
module.exports = { content: ${JSON.stringify(content.map(f => path.join(ROOT, f)))}, corePlugins: { preflight: false },
  theme: { extend: { colors: ${JSON.stringify(colors)}, borderRadius: ${JSON.stringify(dim(TOK.radius))}, spacing: ${JSON.stringify(dim(TOK.spacing))},
    fontFamily: ${JSON.stringify(fontFamily)}, fontSize: ${JSON.stringify(fontSize)}, boxShadow: { 'card-soft': ${JSON.stringify(sh)} } } },
  plugins: [plugin(({ addVariant }) => { addVariant('lt', ['@media (prefers-color-scheme: light) { :root:not([data-theme=dark]) & }', ':root[data-theme=light] &']); addVariant('dk', ['@media (prefers-color-scheme: dark) { :root:not([data-theme=light]) & }', ':root[data-theme=dark] &']); addVariant('rtl', '[dir=rtl] &'); })] };`;
}
function hexA(h) { const a = h.length > 7 ? (parseInt(h.slice(7, 9), 16) / 255).toFixed(2) : 1; return `rgba(${rgb(h).replace(/ /g, ',')},${a})`; }
function twDir() { if (process.env.TAILWIND_DIR) return process.env.TAILWIND_DIR; return path.dirname(createRequire(path.join(ROOT, 'package.json')).resolve('tailwindcss/package.json')); }

function build(g) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'st-')), cfg = path.join(tmp, 'tw.config.cjs'), inp = path.join(tmp, 'in.css'), out = path.join(tmp, 'out.css');
  fs.writeFileSync(cfg, (g.startsWith('v2-') ? configV2 : config)(GROUPS[g], g)); fs.writeFileSync(inp, '@tailwind base;\n@tailwind utilities;\n'); // base (preflight tắt) = chỉ biến mặc định --tw-* cho gradient/bóng/vòng
  execFileSync(process.execPath, [path.join(twDir(), 'lib/cli.js'), '-c', cfg, '-i', inp, '-o', out, '--minify'], { stdio: ['ignore', 'ignore', 'pipe'] });
  return `/* Stitch → Tailwind 3.4.17 (biên dịch sẵn, KHÔNG sửa tay): node scripts/build-stitch-css.mjs · nguồn web/js/st/${g}.js + brand/stitch/tokens.dtcg.json */\n${PRE}\n${fs.readFileSync(out, 'utf8').replace(/\/\*![^*]*\*\/\s*/, '')}\n`;
}

// ---- font tự host (chạy khi đổi danh sách icon): Google Fonts CSS2 API, UA Chrome để nhận WOFF2 ----
async function fonts() {
  const UA = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' };
  const get = async u => { const r = await fetch(u, { headers: UA }); if (!r.ok) throw new Error(`${r.status} ${u}`); return r; };
  fs.mkdirSync('web/fonts', { recursive: true });
  const css = await (await get('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400..800&display=swap')).text();
  for (const s of Object.keys(UR)) { const m = css.match(new RegExp(`/\\* ${s} \\*/[^}]*?url\\((https:[^)]+\\.woff2)\\)`)); if (!m) throw new Error('thiếu subset ' + s); fs.writeFileSync(`web/fonts/pjs-${s}.woff2`, Buffer.from(await (await get(m[1])).arrayBuffer())); }
  const names = icons(), mcss = await (await get(`https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400..700,0..1,0&icon_names=${names.join(',')}&display=block`)).text();
  const mu = mcss.match(/url\((https:[^)]+)\)/); if (!mu) throw new Error('Material Symbols: không có url');
  fs.writeFileSync('web/fonts/msym.woff2', Buffer.from(await (await get(mu[1])).arrayBuffer()));
  const rcss = await (await get(`https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400..700,0..1,0&icon_names=${names.join(',')}&display=block`)).text(), ru = rcss.match(/url\((https:[^)]+)\)/);
  if (!ru) throw new Error('Material Symbols Rounded: không có url'); fs.writeFileSync('web/fonts/msymr.woff2', Buffer.from(await (await get(ru[1])).arrayBuffer()));
  fs.writeFileSync('web/fonts/msym.json', JSON.stringify(names) + '\n');
  console.log('font:', fs.readdirSync('web/fonts').map(f => `${f} ${(fs.statSync('web/fonts/' + f).size / 1024).toFixed(1)} KB`).join(' · '));
}
// Tên icon dùng trong mẫu: ms('tên') hoặc chú thích "@icons a b c" (icon chọn theo dữ liệu)
function icons() { const s = new Set(); for (const f of new Set(Object.values(GROUPS).flat())) { const t = fs.readFileSync(f, 'utf8'); for (const m of t.matchAll(/\bms\(\s*'([a-z_0-9]+)'/g)) s.add(m[1]); for (const m of t.matchAll(/@icons ([a-z_0-9 ]+)/g)) m[1].trim().split(/\s+/).forEach(x => s.add(x)); for (const m of t.matchAll(/material-symbols-(?:outlined|rounded)[^>]*>\s*([a-z_0-9]+)\s*</g)) s.add(m[1]); } return [...s].sort(); }

if (A.has('--fonts')) await fonts();
const bad = [];
// Cổng ảnh: mẫu Stitch có ảnh giữ chỗ (người/ảnh ngẫu nhiên trên lh3.googleusercontent.com…) – KHÔNG BAO GIỜ dùng. Chỉ ảnh của mình (đường dẫn tương đối: teach/ = 2D Ama/Carlos, icons/, fonts/).
const IMGBAD = /(googleusercontent|unsplash|pravatar|picsum\.photos|placeholder\.com|placehold\.co|randomuser\.me|lorempixel|gstatic\.com\/images)/i, EXT = /(?:src|href|url)\s*[=(]\s*["']?https?:\/\//i;
for (const f of [...new Set(Object.values(GROUPS).flat()), ...Object.keys(GROUPS).map(OUT), 'web/design/gallery.html'].filter(f => fs.existsSync(f))) { const t = fs.readFileSync(f, 'utf8');
  if (IMGBAD.test(t)) bad.push(`${f}: có URL ảnh giữ chỗ/ngoài (${t.match(IMGBAD)[0]}) – chỉ dùng ảnh của Lexkite`);
  if (EXT.test(t)) bad.push(`${f}: src/href/url trỏ ra ngoài (${t.match(EXT)[0]}…) – chỉ đường dẫn nội bộ`); }
const used = icons(), have = fs.existsSync('web/fonts/msym.json') ? JSON.parse(fs.readFileSync('web/fonts/msym.json', 'utf8')) : [];
const lack = used.filter(n => !have.includes(n)); if (lack.length) bad.push(`icon chưa có trong web/fonts/msym.woff2: ${lack.join(', ')} → chạy --fonts`);
for (const g of Object.keys(GROUPS)) {
  const css = build(g), gz = zlib.gzipSync(css, { level: 9 }).length;
  console.log(`st-${g}.css: ${(css.length / 1024).toFixed(1)} KB · gz ${(gz / 1024).toFixed(2)} KB (ngân sách 10 KB)`);
  if (gz > BUDGET) bad.push(`st-${g}.css gz ${gz} B > ${BUDGET} B`);
  if (A.has('--check')) { if (!fs.existsSync(OUT(g)) || fs.readFileSync(OUT(g), 'utf8') !== css) bad.push(`${OUT(g)} lệch bản biên dịch (sửa web/js/st/* hoặc token mà chưa chạy node scripts/build-stitch-css.mjs)`); }
  else fs.writeFileSync(OUT(g), css);
}
if (bad.length) { console.error('✗ stitch-css:\n  - ' + bad.join('\n  - ')); process.exit(1); }
console.log('✓ stitch-css');
