// 🧩 Dùng chung cho thẻ chia sẻ / OG / email: tách Tailwind CDN khỏi mẫu Stitch, biên dịch class bằng tailwindcss@3.4.17 (CI: npm i --no-save), điền data-slot.
// Cùng nguồn token với scripts/build-stitch-css.mjs (brand/stitch/tokens.dtcg.json). KHÔNG BAO GIỜ nạp Tailwind CDN. docs/DESIGN-SYSTEM.md §Cards.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { execFileSync } from 'node:child_process'; import { createRequire } from 'node:module';

export const ROOT = process.cwd();
const TOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'brand/stitch/tokens.dtcg.json'), 'utf8')), C = Object.entries(TOK.color);
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(' ');
const mode = (v, m) => m === 'light' ? v.$extensions['com.lexkite.mode'].light : v.$value;
const VARS = m => C.map(([k, v]) => `--st-${k}:${rgb(mode(v, m))}`).join(';');
export const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function twDir() { if (process.env.TAILWIND_DIR) return process.env.TAILWIND_DIR; try { return path.dirname(createRequire(path.join(ROOT, 'package.json')).resolve('tailwindcss/package.json')); } catch { throw new Error('thiếu tailwindcss — CI: npm i --no-save tailwindcss@3.4.17'); } }

// Gỡ thẻ Tailwind CDN (script src=*tailwind*), lấy `tailwind.config = {...}` của Stitch (nếu có) rồi bỏ mọi <script>; thẻ link ngoài (Google Fonts…) cũng bỏ — font dùng bản tự host.
export function prepare(html, { allowExtImg = false } = {}) {
  let cfg = {};
  html = html.replace(/<script\b[^>]*\bsrc\s*=\s*["'][^"']*tailwind[^"']*["'][^>]*>\s*<\/script>/gi, '');
  const m = html.match(/<script\b[^>]*>([\s\S]*?tailwind\.config\s*=[\s\S]*?)<\/script>/i);
  if (m) { try { const tailwind = {}; new Function('tailwind', m[1])(tailwind); cfg = tailwind.config || {}; } catch (e) { throw new Error('tailwind.config trong mẫu không đọc được: ' + e.message); } }
  html = html.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<link\b[^>]*\bhref\s*=\s*["']https?:[^>]*>/gi, '');
  if (/tailwind(css)?\.com|cdn\.tailwindcss/i.test(html)) throw new Error('mẫu còn tham chiếu Tailwind CDN');
  const ext = [/<(?:script|link|iframe|source|video|audio)\b[^>]*\b(?:src|href)\s*=\s*["']?(?:https?:)?\/\//i, /url\(\s*["']?(?:https?:)?\/\//i, ...(allowExtImg ? [] : [/<img\b[^>]*\bsrc\s*=\s*["']?(?:https?:)?\/\//i])];
  for (const r of ext) { const x = html.match(r); if (x) throw new Error('mẫu còn tài nguyên ngoài: ' + x[0].slice(0, 80)); }
  return { html, cfg };
}

const UR = { latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122', 'latin-ext': 'U+0100-02BA,U+1E00-1EFF,U+20A0-20C0', vietnamese: 'U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0309,U+0323,U+1EA0-1EF9,U+20AB' };
export function fontFaces() { // font tự host trong web/fonts (file://) — chỉ cho thẻ ảnh; email dùng font hệ thống
  const u = f => 'file://' + path.join(ROOT, 'web/fonts', f), ok = f => fs.existsSync(path.join(ROOT, 'web/fonts', f));
  return Object.entries(UR).filter(([s]) => ok(`pjs-${s}.woff2`)).map(([s, r]) => `@font-face{font-family:"Plus Jakarta Sans";font-weight:400 800;src:url(${u(`pjs-${s}.woff2`)}) format("woff2");unicode-range:${r}}`).join('')
    + (ok('msym.woff2') ? `@font-face{font-family:"Material Symbols Outlined";font-weight:400 700;src:url(${u('msym.woff2')}) format("woff2")}.material-symbols-outlined{font-family:"Material Symbols Outlined";font-size:24px;line-height:1;display:inline-block;white-space:nowrap;font-feature-settings:"liga"}` : '')
    + (ok('msymr.woff2') ? `@font-face{font-family:"Material Symbols Rounded";font-weight:400 700;src:url(${u('msymr.woff2')}) format("woff2")}.material-symbols-rounded{font-family:"Material Symbols Rounded";font-size:24px;line-height:1;display:inline-block;white-space:nowrap;font-feature-settings:"liga"}` : '');
}

// Biên dịch CSS cho 1 mẫu. kind 'card': có preflight + biến màu token (sáng/tối) + font; kind 'email': màu token cố định (bản sáng), dark: = @media prefers-color-scheme, không biến CSS/không preflight.
export function compile(html, userCfg = {}, kind = 'card') {
  const email = kind === 'email', ext = userCfg.theme?.extend || {};
  const colors = Object.fromEntries(C.map(([k, v]) => [k, email ? mode(v, 'light') : `rgb(var(--st-${k}) / <alpha-value>)`]));
  const fam = TOK.font.family.sans.$value, dim = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.$value]));
  const cfg = { ...userCfg, content: [{ raw: html, extension: 'html' }], corePlugins: { preflight: !email }, darkMode: email ? 'media' : (userCfg.darkMode || 'class'),
    theme: { ...(userCfg.theme || {}), extend: { ...ext, colors: { ...colors, ...(ext.colors || {}) }, borderRadius: { ...dim(TOK.radius), ...(ext.borderRadius || {}) }, fontFamily: { sans: [fam], ...(ext.fontFamily || {}) } } } };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cards-')), f = n => path.join(tmp, n);
  try {
    fs.writeFileSync(f('tw.config.cjs'), 'module.exports=' + JSON.stringify(cfg)); fs.writeFileSync(f('in.css'), email ? '@tailwind utilities;\n' : '@tailwind base;\n@tailwind utilities;\n');
    execFileSync(process.execPath, [path.join(twDir(), 'lib/cli.js'), '-c', f('tw.config.cjs'), '-i', f('in.css'), '-o', f('out.css'), '--minify'], { stdio: ['ignore', 'ignore', 'pipe'] });
    const css = fs.readFileSync(f('out.css'), 'utf8').replace(/\/\*![^*]*\*\/\s*/, '');
    return email ? css : `:root{${VARS('light')}}:root[data-theme=dark]{${VARS('dark')}}${fontFaces()}body{font-family:"Plus Jakarta Sans","Noto Sans","Noto Sans CJK SC",system-ui,sans-serif;margin:0}${css}`;
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

// Giáo viên: teacher:"ama"|"carlos" (+ pose tuỳ chọn) → tệp trong web/teach/ (đúng danh sách web/teach/characters.json) → data URI.
export function teacherFile(data) {
  const chars = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/teach/characters.json'), 'utf8')), who = data.teacher;
  if (!chars.people?.[who]) throw new Error(`teacher "${who}" không có trong web/teach/characters.json`);
  const pose = data.pose, cand = [pose && `${who}/still-${pose}.webp`, `${who}/avatar-2x.webp`, `${who}/avatar.webp`].filter(Boolean).find(k => chars.files?.[k] && fs.existsSync(path.join(ROOT, 'web/teach', k)));
  if (!cand) throw new Error(`không có ảnh cho teacher ${who}`);
  return path.join(ROOT, 'web/teach', cand);
}
export const teacherDataUri = data => 'data:image/webp;base64,' + fs.readFileSync(teacherFile(data)).toString('base64');
export function srcFor(key, data) { // data-slot-src="teacher" → ảnh giáo viên; khác → data.src[key] (data: URI hoặc đường dẫn tệp trong repo)
  if (key === 'teacher') return teacherDataUri(data);
  const v = data.src?.[key]; if (!v) return null;
  if (/^data:/.test(v)) return v;
  const p = path.resolve(ROOT, v); if (!p.startsWith(ROOT) || !fs.existsSync(p)) throw new Error(`src.${key}: không có tệp ${v}`);
  return `data:${/\.png$/i.test(p) ? 'image/png' : /\.svg$/i.test(p) ? 'image/svg+xml' : /\.webp$/i.test(p) ? 'image/webp' : 'image/jpeg'};base64,` + fs.readFileSync(p).toString('base64');
}

// Điền slot bằng chuỗi (dùng cho email, không cần DOM). Slot phải là phần tử lá (không lồng thẻ cùng tên). Trả { html, missing, unused }.
export function fillStatic(html, data, { srcMode = 'url' } = {}) {
  const used = new Set(), missing = [], hasKey = k => Object.prototype.hasOwnProperty.call(data, k);
  html = html.replace(/<([a-zA-Z][\w-]*)([^>]*?)\sdata-slot="([^"]+)"([^>]*)>([\s\S]*?)<\/\1>/g, (all, tag, a, key, b) => {
    if (!hasKey(key)) { missing.push(key); return all; } used.add(key); return `<${tag}${a} data-slot="${key}"${b}>${esc(data[key])}</${tag}>`; });
  const setAttr = (tagStr, attr, val) => (new RegExp(`\\s${attr}\\s*=\\s*("[^"]*"|'[^']*')`).test(tagStr) ? tagStr.replace(new RegExp(`(\\s${attr}\\s*=\\s*)("[^"]*"|'[^']*')`), `$1"${esc(val)}"`) : tagStr.replace(/^<([\w-]+)/, `<$1 ${attr}="${esc(val)}"`));
  html = html.replace(/<[a-zA-Z][\w-]*\b[^>]*\bdata-slot-href="([^"]+)"[^>]*>/g, (t, key) => { const v = data.href?.[key]; if (!v) { missing.push('href.' + key); return t; } used.add('href'); return setAttr(t, 'href', v); });
  html = html.replace(/<[a-zA-Z][\w-]*\b[^>]*\bdata-slot-src="([^"]+)"[^>]*>/g, (t, key) => { const v = srcMode === 'data' ? srcFor(key, data) : data.src?.[key]; if (!v) { missing.push('src.' + key); return t; } used.add('src'); return setAttr(t, 'src', v); });
  return { html, missing, unused: Object.keys(data).filter(k => !used.has(k) && !k.startsWith('_') && !['teacher', 'pose', 'src', 'href'].includes(k)) };
}

export function parseArgs(argv) { const pos = [], opt = {}; for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith('--')) opt[argv[i].slice(2)] = argv[++i]; else pos.push(argv[i]); } return { pos, opt }; }
export const die = msg => { console.error('✗ ' + msg); process.exit(1); };
