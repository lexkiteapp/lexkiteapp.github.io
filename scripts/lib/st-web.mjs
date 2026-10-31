// 🎨 Trang web tĩnh theo Stitch v2.1 (Lexkite Kit) – dựng LÚC BUILD (Node, không DOM).
//   Khung TỰ SINH: web/js/st/web/<trang>.js + chrome.js (node scripts/stitch-v2-convert.mjs --web, từ brand/stitch/web/<trang>-light|dark.html + bind/<trang>.json).
//   CSS biên dịch sẵn: web/css/st-w-<trang>.css (node scripts/build-stitch-css.mjs) → nhúng vào <style> (không thêm request, không CDN).
//   Chữ tĩnh: khóa Việt → web/js/i18n/<lang>/v2web.js (pipeline i18n chung: i18n-fixed.json + i18n-fix.mjs, 15 ngôn ngữ).
//   1 DOM cho cả sáng/tối (class lt:/dk: = prefers-color-scheme, như app). Giáo viên chỉ qua chars() (web/teach/characters.json – Ama/Carlos 2D).
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';

const ROOT = process.cwd(), cache = new Map();
const load = f => { if (!cache.has(f)) cache.set(f, fs.readFileSync(path.join(ROOT, f), 'utf8')); return cache.get(f); };
// Cùng phép escape với scripts/lib/site-layout.mjs (thuộc tính luôn trong ngoặc kép → không cần đổi '): chữ trên trang khớp từng ký tự với JSON-LD/test
export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Từ điển v2web theo ngôn ngữ (vi = chính khóa; en = chữ Stitch; 13 ngôn ngữ khác do i18n-fix sinh)
const dicts = {};
export function tr(lang) {
  if (!dicts[lang]) { const g = {}; for (const l of new Set(['en', lang])) { const f = `web/js/i18n/${l}/v2web.js`; if (fs.existsSync(path.join(ROOT, f))) vm.runInNewContext(load(f), { self: g }); }
    const D = g.I18N_DICT || {}; dicts[lang] = s => lang === 'vi' ? s : (D[lang] && D[lang][s] != null ? D[lang][s] : (D.en && D.en[s] != null ? D.en[s] : s)); }
  return dicts[lang];
}

// Gọi khung TỰ SINH (cùng định dạng file với app: (self.ST2 ||= {})[k] = (d, t, e) => ({...}))
function frame(k) { const g = { self: {} }; g.self.ST2 = {}; vm.runInNewContext(load(`web/js/st/web/${k}.js`), g); return g.self.ST2[k]; }
const css = k => load(`web/css/st-w-${k}.css`).replace(/^\/\*[^*]*\*\/\n/, '');

// Trả { css, body }: body = vỏ chung (đầu trang + chân trang từ chrome.js) quanh main của trang. Generator giữ nguyên <head> SEO của mình.
//   d = dữ liệu thật của trang (biểu thức trong bind map dùng d.*), chrome = dữ liệu đầu/chân trang (siteChrome() bên dưới).
export function render(k, d, { lang = 'en', chrome } = {}) {
  const t = tr(lang), f = frame(k)(d, t, esc), c = frame('chrome')(chrome || d.chrome || {}, t, esc);
  const body = `<div class="v2s-web-${k}"><div class="${f.root}">${c.header}${f.header || ''}<main id="main">${f.main}</main>${f.footer || ''}${c.footer}</div></div>`;
  return { css: css(k), body };
}

// Giáo viên 2D: CHỈ qua Chars.* (web/js/characters.js – nguồn duy nhất, như app) → ảnh tĩnh tư thế, nền trong suốt, không khung/hào quang.
let CH = null;
export function teacher(who, pose, { size = 240, cls = 'chr', alt } = {}) {
  if (!CH) { const g = {}; vm.runInNewContext(load('web/js/characters.js'), { self: g }); CH = g.Chars; }
  return CH.img(who, { pose, size, cls, alt: alt ?? CH.name(who), lazy: true }).replace(/src="teach\//g, 'src="/teach/');
}

// ---- Thu gọn trang đã dựng (KHÔNG đổi hình): CSS Stitch biên dịch cho cả nhóm → chỉ giữ luật trang thật dùng + đổi tên lớp Tailwind dài thành tên ngắn ----
//   1) bỏ luật có lớp không xuất hiện trong trang (lớp trong <script> coi như có – JS thêm lúc chạy) · 2) trang không có data-theme (web tĩnh theo
//   prefers-color-scheme) → bỏ nhánh :root[data-theme=…] (không bao giờ khớp) · 3) bỏ biến --st-*/--tw-* không ai dùng · 4) đổi tên lớp (cùng lúc trong
//   class="" ngoài <script> và bộ chọn CSS). Giữ nguyên: lớp JS nhắc tới, v2s-web-* (cổng stitch-web-diff), lớp khớp [class*=…] trong CSS.
//   Dùng cho trang có ngân sách gzip cứng (landing ≤ 16 KB). html phải có đúng 1 <style>.
const blocks = s => { const out = []; let d = 0, st = 0; for (let i = 0; i < s.length; i++) { if (s[i] === '/' && s[i + 1] === '*') { i = s.indexOf('*/', i + 2) + 1; st = i + 1; continue; } if (s[i] === '{') d++; else if (s[i] === '}' && --d === 0) { out.push(s.slice(st, i + 1).trim()); st = i + 1; } } return out; };
const splitSel = s => { const r = []; let d = 0, a = 0; for (let i = 0; i < s.length; i++) { const c = s[i]; if (c === '\\') { i++; continue; } if (c === '(' || c === '[') d++; else if (c === ')' || c === ']') d--; else if (c === ',' && !d) { r.push(s.slice(a, i)); a = i + 1; } } r.push(s.slice(a)); return r.map(x => x.trim()).filter(Boolean); };
const CLS = /\.((?:\\.|[\w-])+)/g, unesc = s => s.replace(/\\(.)/g, '$1');
export function compact(html) {
  const m = html.match(/<style>([\s\S]*?)<\/style>/); if (!m) return html;
  const page = html.replace(m[0], () => '\u0000'), scripts = [...page.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(x => x[1]).join('\n'), markup = page.replace(/<script[^>]*>[\s\S]*?<\/script>/g, '');
  const used = new Map(); for (const a of markup.matchAll(/\sclass="([^"]*)"/g)) for (const c of a[1].split(/\s+/)) if (c) used.set(c, (used.get(c) || 0) + 1);
  const words = new Set(scripts.match(/[A-Za-z_][\w-]*/g) || []), theme = /data-theme/.test(page), have = c => used.has(c) || words.has(c);
  const keepSel = sel => (theme || !/(?<!:not\()\[data-theme=/.test(sel)) && [...sel.matchAll(CLS)].every(x => /^\d/.test(x[1]) || have(unesc(x[1])));
  const purge = css => blocks(css).map(b => { const j = b.indexOf('{'), sel = b.slice(0, j).trim();
    if (/^@(media|supports)/.test(sel)) { const inner = purge(b.slice(j + 1, -1)); return inner ? sel + '{' + inner + '}' : ''; }
    if (sel.startsWith('@')) return b; const k = splitSel(sel).filter(keepSel); return k.length ? k.join(',') + b.slice(j) : ''; }).join('');
  let css = purge(m[1]);
  if (!/<dialog/.test(markup)) css = css.replace(/(^|\})::backdrop\{[^}]*\}/, '$1'); // biến --tw-* cho ::backdrop: trang không có <dialog> Tailwind (hộp Tải app tự mang CSS)
  const refs = new Set([...css.matchAll(/var\((--(?:st|tw)-[\w-]+)/g), ...markup.matchAll(/var\((--(?:st|tw)-[\w-]+)/g)].map(x => x[1]));
  css = css.replace(/(--(?:st|tw)-[\w-]+):[^;}]*;?/g, (all, v) => refs.has(v) ? all : '').replace(/;}/g, '}').replace(/[^{}]+\{\}/g, '');
  // đổi tên: lớp có trong CSS lẫn trang, không bị JS/[class*=] nhắc tới → tên ngắn theo tần suất (cùng lúc trong bộ chọn CSS và class="" ngoài <script>)
  const inCss = new Set([...css.matchAll(CLS)].map(x => unesc(x[1]))), subs = [...css.matchAll(/\[class[*^]=["']?([^"'\]]+)/g)].map(x => x[1]);
  const names = [...used.keys()].filter(c => inCss.has(c) && !words.has(c) && !/^v2s-|^material-symbols/.test(c) && !subs.some(x => c.includes(x)) && c.length > 2).sort((a, b) => used.get(b) - used.get(a) || (a < b ? -1 : 1));
  const taken = new Set([...used.keys(), ...words]), map = new Map(); let n = 0;
  const id = i => { const A = 'abcdefghijklmnopqrstuvwxyz', B = A + '0123456789'; let s = A[i % 26]; i = Math.floor(i / 26); while (i > 0) { i--; s += B[i % 36]; i = Math.floor(i / 36); } return s; };
  for (const c of names) { let k; do k = id(n++); while (taken.has(k)); map.set(c, k); }
  css = css.replace(CLS, (all, e) => { const k = map.get(unesc(e)); return k ? '.' + k : all; });
  const re = s => s.replace(/(\sclass=")([^"]*)"/g, (_, a, v) => a + v.split(/\s+/).filter(Boolean).map(c => map.get(c) || c).join(' ') + '"');
  const body = page.split(/(<script[^>]*>[\s\S]*?<\/script>)/).map((x, i) => i % 2 ? x : re(x)).join('');
  return body.replace('\u0000', () => '<style>' + css + '</style>');
}
