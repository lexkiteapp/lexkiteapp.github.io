// 🎨 Trang web tĩnh theo Stitch v2.1 (Lexkite Kit) – dựng LÚC BUILD (Node, không DOM).
//   Khung TỰ SINH: web/js/st/web/<trang>.js + chrome.js (node scripts/stitch-v2-convert.mjs --web, từ brand/stitch/web/<trang>-light|dark.html + bind/<trang>.json).
//   CSS biên dịch sẵn: web/css/st-w-<trang>.css (node scripts/build-stitch-css.mjs) → nhúng vào <style> (không thêm request, không CDN).
//   Chữ tĩnh: khóa Việt → web/js/i18n/<lang>/v2web.js (pipeline i18n chung: i18n-fixed.json + i18n-fix.mjs, 15 ngôn ngữ).
//   1 DOM cho cả sáng/tối (class lt:/dk: = prefers-color-scheme, như app). Giáo viên chỉ qua chars() (web/teach/characters.json – Ama/Carlos 2D).
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';

const ROOT = process.cwd(), cache = new Map();
const load = f => { if (!cache.has(f)) cache.set(f, fs.readFileSync(path.join(ROOT, f), 'utf8')); return cache.get(f); };
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

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
