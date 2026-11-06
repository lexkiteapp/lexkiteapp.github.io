#!/usr/bin/env node
// 🎨 Một nguồn màu: brand/tokens.json → web/css/style.css (:root sáng + 2 khối tối) · scripts/lib/site-layout.mjs (trang tĩnh, đọc JSON lúc dựng)
//   · extension/content.js + writecheck.js (bong bóng dịch/kiểm câu: biến --d-*) · web/icons/icon.svg. Chỉ ghi văn bản, 0 phụ thuộc.
// PNG icon + logo + ảnh mạng xã hội: node scripts/build-social-kit.mjs (CI .github/workflows/brand-build.yml). Kiểm: scripts/test/brand-check.mjs.
//   · brand/stitch/tokens.dtcg.json (color: vai trò M3 cho màn Stitch + app native SwiftUI/Compose – scripts/native/gen.mjs đọc file này)
//   · biến --st-* + lớp lt:/dk: trung tính trong web/css/st-*.css (+ bản add-on) · Capacitor (nền WebView/cửa sổ Android, iOS) · bảng §2a docs/DESIGN-SYSTEM.md
// Dùng: node scripts/build-tokens.mjs [--check]   (--check: chỉ báo lệch, không ghi – brand-check gọi)
import fs from 'node:fs';
import { snapCss } from './lib/st-theme-snap.mjs';
const T = JSON.parse(fs.readFileSync('brand/tokens.json', 'utf8'));
const CHECK = process.argv.includes('--check'), drift = [];
const put = (f, next) => { const cur = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null; if (cur === next) return; if (CHECK) drift.push(f); else fs.writeFileSync(f, next); };
const decl = (o, sep = ' ') => Object.entries(o).map(([k, v]) => `${k}: ${v};`).join(sep);

// 1) style.css: bỏ khai báo cũ của các khóa token trong khối, chèn 1 dòng sinh tự động ngay sau "{"
const MARK = '/* @tokens brand/tokens.json */';
function block(css, head, set) {
  const i = css.indexOf(head); if (i < 0) throw new Error('thiếu khối ' + head);
  const a = i + head.length, b = css.indexOf('}', a);
  let body = css.slice(a, b).split('\n').filter(l => !l.includes(MARK)).join('\n');
  for (const k of Object.keys(set)) body = body.replace(new RegExp(`\\s*${k}:\\s*[^;]+;`, 'g'), '');
  const ind = head.startsWith('  ') ? '    ' : '  ', close = ind.slice(2);
  body = body.split('\n').map(l => l.trim()).filter(l => l && !/^\/\* đạt tương phản WCAG AAA/.test(l)).map(l => ind + l).join('\n');
  return css.slice(0, a) + `\n${ind}${MARK} ${decl(set)}\n` + body + '\n' + close + css.slice(b);
}
for (const f of ['web/css/style.css']) {
  let css = fs.readFileSync(f, 'utf8');
  css = block(css, ':root {', T.light);
  css = block(css, '  :root:not([data-theme="light"]) {', T.dark);
  css = block(css, ':root[data-theme="dark"] {', T.dark);
  put(f, css);
}

// 2) bong bóng dịch (content.js) + kiểm câu (writecheck.js): trang ngoài không có biến của app → khai báo --d-* trên .dark
const D = T.dark, ext = `--d-bg:${D['--bg']};--d-sf:${D['--surface']};--d-sf2:${D['--surface-2']};--d-sf3:${D['--surface-3']};--d-line:${D['--line']};--d-line2:${D['--line-2']};--d-text:${D['--text']};--d-muted:${D['--muted']}`;
for (const [f, sel] of [['extension/content.js', '.box.dark'], ['extension/writecheck.js', ':host,.card']]) {
  const s = fs.readFileSync(f, 'utf8'), re = /\/\*@tokens\*\/[^\n]*?\/\*@end\*\//;
  if (!re.test(s)) throw new Error(f + ': thiếu /*@tokens*/…/*@end*/');
  put(f, s.replace(re, `/*@tokens*/${sel}{${ext}}/*@end*/`));
}

// 3) icon app (chủ duyệt, brand-check khóa sha256 – chỉ đổi khi chủ đồng ý): nền teal phẳng, diều cam → san hô (tương phản ≥ 3:1)
const I = T.icon, [k0, k1] = I.kite;
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024"><defs><linearGradient id="pg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${k0}"/><stop offset="1" stop-color="${k1}"/></linearGradient>
    <linearGradient id="pg2" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${k0}"/><stop offset="1" stop-color="${k1}"/></linearGradient>
    </defs><rect width="1024" height="1024" rx="230" ry="230" fill="${I.bg}"/><svg x="112" y="112" width="800" height="800" viewBox="0 0 120 120">
      <path d="M58 54 C46 40 26 30 4 30 C6 44 9 58 12 70 C30 68 46 72 58 84 Z" fill="url(#pg)"/><path d="M62 54 C74 40 94 30 116 30 C114 44 111 58 108 70 C90 68 74 72 62 84 Z" fill="url(#pg2)"/>
      <path d="M52 56 C42 47 29 41 14 40 M52 64 C42 56 30 51 16 51 M52 72 C42 66 31 62 18 62 M68 56 C78 47 91 41 106 40 M68 64 C78 56 90 51 104 51 M68 72 C78 66 89 62 102 62" stroke="${T.brand.cream}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".9"/>
      <path d="M54 80 C52 92 46 102 34 113 C49 109 57 101 60 94 C63 101 71 109 86 113 C74 102 68 92 66 80 Z" fill="${T.brand.sun}"/>
      <circle cx="60" cy="42" r="11" fill="${T.brand.sun}"/><path d="M61 33 l8 -5 l-2 8 Z" fill="${T.brand.sun}"/><circle cx="63.5" cy="40" r="2.3" fill="${I.bg}"/>
    </svg></svg>
`;
put('web/icons/icon.svg', icon);

for (const f of ['brand/lexkite-app-icon.svg', 'store/logo.svg']) put(f, icon); // bản sao icon cho bộ brand + thư mục cửa hàng
// Logo trên nền tối (end card video, mạng xã hội): diều dùng cùng cặp màu của icon
{ const f = 'brand/lexkite-logo-dark.svg';
  put(f, fs.readFileSync(f, 'utf8').replace(/(<linearGradient id="pg2?"[^>]*><stop offset="0" stop-color=")[^"]+("\/><stop offset="1" stop-color=")[^"]+"/g, `$1${k0}$2${k1}"`)); }

// 4) Vai trò M3 (Stitch + native): brand/tokens.json "roles" → brand/stitch/tokens.dtcg.json color ($value = tối, $extensions…light = sáng)
export const roleHex = (r, mode) => { const v = T.roles[r], x = typeof v === 'string' ? v : v[mode]; return x.startsWith('--') ? T[mode][x] : x; };
{ const f = 'brand/stitch/tokens.dtcg.json', D = JSON.parse(fs.readFileSync(f, 'utf8'));
  const miss = Object.keys(D.color).filter(k => !T.roles[k]).concat(Object.keys(T.roles).filter(k => !D.color[k]));
  if (miss.length) throw new Error('tokens.json roles ↔ dtcg color lệch khóa: ' + miss.join(', '));
  for (const [k, v] of Object.entries(D.color)) { v.$value = roleHex(k, 'dark'); v.$extensions['com.lexkite.mode'].light = roleHex(k, 'light'); }
  put(f, JSON.stringify(D, null, 1) + '\n'); }

// 5) Màn Stitch: tiền tố biến --st-* (giống build-stitch-css PRE) + lớp lt:/dk: trung tính → biến vai trò (st-theme-snap) – không cần Tailwind
{ const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(' ');
  const vars = m => Object.keys(T.roles).map(k => `--st-${k}:${rgb(roleHex(k, m))}`).join(';');
  const PRE = `:root{${vars('light')};--st-hl:.7}@media (prefers-color-scheme:dark){:root:not([data-theme=light]){${vars('dark')};--st-hl:0}}:root[data-theme=dark]{${vars('dark')};--st-hl:0}`;
  const RE = /:root\{--st-[^}]*\}@media \(prefers-color-scheme:dark\)\{:root:not\(\[data-theme=light\]\)\{[^}]*\}\}:root\[data-theme=dark\]\{[^}]*\}/;
  for (const dir of ['web/css', 'extension/app/css']) if (fs.existsSync(dir)) for (const n of fs.readdirSync(dir).filter(n => /^st-.*\.css$/.test(n))) {
    const f = `${dir}/${n}`, s = fs.readFileSync(f, 'utf8'); put(f, snapCss(s.replace(RE, () => PRE), T)); } }

// 6) Native Capacitor (mobile/): nền trước khi web vẽ = --bg theo sáng/tối hệ thống → không chớp trắng/kem khi mở app ở chế độ tối
{ const L = T.light['--bg'], Dk = T.dark['--bg'];
  const xml = (c, note) => { if (note.includes('--')) throw new Error('chú thích XML không được chứa "--" (aapt từ chối)'); return `<?xml version="1.0" encoding="utf-8"?>\n<!-- SINH bởi scripts/build-tokens.mjs từ brand/tokens.json – không sửa tay. ${note} -->\n<resources>\n    <color name="lk_bg">${c}</color>\n</resources>\n`; };
  put('mobile/android/app/src/main/res/values/lk_theme.xml', xml(L, 'Sáng "Bright Day" token bg; tối ở values-night/.'));
  put('mobile/android/app/src/main/res/values-night/lk_theme.xml', xml(Dk, 'Tối "Tactile Night" token bg.'));
  const f = 'mobile/ios/App/App/LexkiteBridgeViewController.swift', s = fs.readFileSync(f, 'utf8'), re = /\/\*@tokens\*\/[^\n]*?\/\*@end\*\//;
  if (!re.test(s)) throw new Error(f + ': thiếu /*@tokens*/…/*@end*/');
  put(f, s.replace(re, `/*@tokens*/ static let bgLight: UInt32 = 0x${L.slice(1)}, bgDark: UInt32 = 0x${Dk.slice(1)} /*@end*/`)); }

// 7) Bảng token trong docs/DESIGN-SYSTEM.md §2a (một nơi để đọc; giá trị chỉ sửa ở brand/tokens.json)
{ const f = 'docs/DESIGN-SYSTEM.md', s = fs.readFileSync(f, 'utf8'), A = '<!-- @tokens:start (SINH bởi scripts/build-tokens.mjs – sửa brand/tokens.json) -->', B = '<!-- @tokens:end -->';
  const i = s.indexOf(A), j = s.indexOf(B); if (i < 0 || j < i) throw new Error(f + ': thiếu dấu @tokens:start/@tokens:end');
  const keys = [...new Set([...Object.keys(T.light), ...Object.keys(T.dark)])].filter(k => !/shadow/.test(k));
  const row = k => `| \`${k}\` | ${T.light[k] || '='} | ${T.dark[k] || '(= sáng)'} |`;
  const rrow = k => { const v = T.roles[k]; return `| ${k} | ${typeof v === 'string' ? `\`${v}\`` : `${v.light.startsWith('--') ? '`' + v.light + '`' : v.light} / ${v.dark.startsWith('--') ? '`' + v.dark + '`' : v.dark}`} | ${roleHex(k, 'light')} | ${roleHex(k, 'dark')} |`; };
  const body = `\n| Biến web | Sáng "Bright Day" | Tối "Tactile Night" |\n|---|---|---|\n${keys.map(row).join('\n')}\n\nVai trò M3 (màn Stitch \`--st-*\`, SwiftUI \`LKColor\`, Compose) – một giá trị cho mọi nền tảng:\n\n| Vai trò | Nguồn | Sáng | Tối |\n|---|---|---|---|\n${Object.keys(T.roles).map(rrow).join('\n')}\n`;
  put(f, s.slice(0, i + A.length) + body + s.slice(j)); }

if (CHECK) { if (drift.length) { console.error('✗ tokens: lệch brand/tokens.json → chạy node scripts/build-tokens.mjs:\n  - ' + drift.join('\n  - ')); process.exit(1); } console.log('✓ tokens: CSS/add-on/icon/Stitch/dtcg/native/DESIGN-SYSTEM khớp brand/tokens.json'); }
else console.log('✓ build-tokens: đã ghi style.css, st-*.css, tokens.dtcg.json, content.js, writecheck.js, icon.svg, logo tối, Capacitor, DESIGN-SYSTEM.md từ brand/tokens.json');
