// Hệ thiết kế chung cho mọi trang tĩnh của lexkite.com: blog (scripts/build-blog.mjs) + trang SEO dựng từ dữ liệu app
// (scripts/build-samples.mjs, scripts/build-samples-en.mjs: /tu-vung/, /ngu-phap/, /samples/, /speaking/, /viet-thu/, /en/…).
// Một nguồn CSS + header + footer + breadcrumb → giao diện đồng bộ. Màu CHỈ từ token thương hiệu (web/css/style.css :root,
// docs/BRAND-RULES.md) + các sắc độ phái sinh khai báo trong EXTRA_TOKENS – scripts/test/brand-check.mjs chặn màu ngoài bảng.
// Không phụ thuộc gói ngoài; font hệ thống; CSS nội tuyến (< 14 KB/trang), không JS chặn hiển thị.

import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { toolFoot } from './tools-links.mjs';
import { authFoot, authAbout } from './authority-links.mjs'; // trang Giới thiệu / chính sách biên tập / nghiên cứu (docs/SEO-AUTHORITY.md)
import { S as SP } from './seo-pages-i18n.mjs';
import { art, scrollBtns, VIS_CSS, VIS_JS } from './samples-visual.mjs'; // lớp lướt bằng mắt của họ trang thư viện (docs/specs/samples-visual.md)
// ---------- Nút đổi ngôn ngữ đầu trang (mọi trang tĩnh) – nguồn DUY NHẤT dùng chung với app: web/js/lang-menu.js + khối /* lsw */ trong web/css/style.css ----------
// Màu tối trang tĩnh lấy thẳng từ nguồn duy nhất brand/tokens.json (scripts/build-tokens.mjs, docs/BRAND-RULES.md)
const TKALL = JSON.parse(fs.readFileSync(new URL('../../brand/tokens.json', import.meta.url), 'utf8')), TK = TKALL.dark;
const DK = ['--bg', '--surface', '--text', '--muted', '--line'].map(k => `${k}:${TK[k]}`).join(';');
const LT = ['--bg', '--surface', '--text', '--muted', '--line'].map(k => `${k}:${TKALL.light[k]}`).join(';'); // sáng = B Bright Day (cùng nguồn)
const rdWeb = p => fs.readFileSync(new URL(`../../web/${p}`, import.meta.url), 'utf8');
// ---------- Nút "Thêm vào Chrome" (add-on) – nguồn DUY NHẤT: web/js/ext-config.js (URL cửa hàng) + web/js/ext-cta.js (hiện/ẩn, đếm bấm) ----------
const jsLite = s => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//')).join('\n');
export const EXT_STORE = (rdWeb('js/ext-config.js').match(/store: '([^']+)'/) || [])[1];
export const EXT_JS = jsLite(rdWeb('js/ext-config.js')) + '\n' + jsLite(rdWeb('js/ext-cta.js').replace(/\/\/ <nudge>[\s\S]*?\/\/ <\/nudge>\n/, ''));
// Nút "Tải app" một chạm (CWS / Google Play / hướng dẫn cài PWA) – web/js/get-app.js; nội tuyến SAU EXT_JS (cần LK_EXT, LK_APPS, LKExt)
export const GETAPP_JS = jsLite(rdWeb('js/get-app.js'));
export const LSW_CSS = (rdWeb('css/style.css').match(/\/\* lsw [^*]*\*\/\n([\s\S]*?)\/\* \/lsw \*\//) || [, ''])[1].replace(/\n/g, '');
export const LSW_JS = rdWeb('js/lang-menu.js').replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map(l => l.trim().replace(/\s\/\/ [^'"]*$/, '')).filter(l => l && !l.startsWith('//')).join('\n');
// ---------- Nút giao diện Sáng/Tối/Tự động (mọi trang tĩnh) – cùng mẫu với app (web/css/style.css: :root:not([data-theme=light]) trong media + :root[data-theme=dark]) ----------
// Lựa chọn lưu localStorage 'lk.theme' (light|dark; tự động = không lưu, bỏ thuộc tính data-theme → theo prefers-color-scheme).
// THEME_HEAD đặt NGAY sau <meta charset>, trước mọi <style>/<link> → không nháy sáng khi tải (scripts/test/theme-switch.mjs kiểm).
export const THEME_KEY = 'lk.theme';
// Đồng bộ với app (/app/, cùng origin): app lưu localStorage 'ielts.settings' (JSON, .theme = auto|light|dark) + mốc 'ielts.settingsAt';
// web lưu 'lk.theme' + mốc 'lk.themeAt'. Bên nào đổi SAU thắng (so mốc). lkT() dùng chung cho <head> và nút (TSW_JS).
export const THEME_AT = 'lk.themeAt', APP_SET = 'ielts.settings', APP_SET_AT = 'ielts.settingsAt';
export const THEME_HEAD = `<script data-lkt>function lkT(){try{var s=localStorage,t=s.getItem('${THEME_KEY}'),p;try{p=JSON.parse(s.getItem('${APP_SET}')||'0')}catch(e){}if(p&&p.theme&&+s.getItem('${APP_SET_AT}')>(+s.getItem('${THEME_AT}')||0))t=p.theme;return t=='light'||t=='dark'?t:''}catch(e){return''}}lkT()&&document.documentElement.setAttribute('data-theme',lkT())</script>`;
// Thanh trình duyệt (meta theme-color) theo nền trang: sáng = B Bright Day, tối = A Tactile Night (brand/tokens.json --bg, nguồn duy nhất).
// Hai thẻ theo media → đúng ngay khi tải ở chế độ tự động; ép sáng/tối thì TSW_JS (trang tĩnh) / applyTheme (app) ghi đè cả hai thẻ.
export const THEME_COLOR = { light: TKALL.light['--bg'], dark: TKALL.dark['--bg'] };
export const THEME_META = `<meta name="theme-color" media="(prefers-color-scheme:light)" content="${THEME_COLOR.light}"><meta name="theme-color" media="(prefers-color-scheme:dark)" content="${THEME_COLOR.dark}">`;
// Chỉ phần <head> (chống nháy + theme-color), không đụng CSS – dùng cho trang tĩnh (qua themePage) và app web/app/index.html (build-landing.mjs)
// Quyền nội dung (docs/CONTENT-PROTECTION.md §8): từ chối khai thác văn bản/dữ liệu (TDMRep W3C, EU DSM Điều 4).
// Không có "noindex"/"nofollow" → Googlebot/Bingbot lập chỉ mục như cũ. Chèn 1 lần (idempotent) ngay sau chống nháy.
export const IP_META = '<meta name="tdm-reservation" content="1">'; // © hiển thị ở chân mọi trang (siteFooter, app) – không thêm meta copyright (trang giới thiệu sát ngân sách gzip)
const ipMeta = html => html.includes('name="tdm-reservation"') ? html : html.replace(/(<meta name="theme-color"[^>]*>(?:\s*<meta name="theme-color"[^>]*>)*)/i, x => x + IP_META);
export const themeHead = html => ipMeta(themeHead0(html));
const themeHead0 = html => {
  const meta = /<meta name="theme-color"/i.test(html); // trang chưa có theme-color → thêm ngay sau chống nháy
  html = html.replace(/<meta name="theme-color"[^>]*>(?:\s*<meta name="theme-color"[^>]*>)*/i, () => THEME_META);
  const H = meta ? THEME_HEAD : THEME_HEAD + THEME_META;
  if (html.includes('<script data-lkt>')) return html.replace(/<script data-lkt>[\s\S]*?<\/script>/, () => H); // bản cũ → bản mới
  return /<meta charset=[^>]*>/i.test(html) ? html.replace(/<meta charset=[^>]*>/i, x => x + H) : html.replace(/<head>/i, x => x + H);
};
// Add-on MV3 cấm script nội tuyến → cùng mã chống nháy ở file riêng web/js/lkt.js (sinh từ THEME_HEAD, build-landing.mjs), build-extension.sh đổi thẻ sang <script src>
export const LKT_JS = () => `/* SINH TỰ ĐỘNG từ scripts/lib/site-layout.mjs THEME_HEAD – sửa ở đó rồi chạy node scripts/build-landing.mjs */\n${THEME_HEAD.replace(/^<script data-lkt>|<\/script>$/g, '')}\n`;
// Nhãn nút lấy thẳng từ chuỗi giao diện app đã dịch đủ 15 ngôn ngữ (web/js/i18n/<lang>.js, pipeline docs/I18N-PIPELINE.md) – không chép bản dịch thứ hai
const TSW_KEYS = ['Giao diện theo hệ thống', 'Giao diện sáng', 'Giao diện tối', 'Đổi giao diện sáng/tối'], TSW_L = {};
export const themeLabels = lang => {
  if (TSW_L[lang]) return TSW_L[lang];
  let D = {};
  if (lang !== 'vi') try { const g = {}; vm.runInNewContext(lang === 'en' ? rdWeb('js/i18n/en.js') : fs.readFileSync(new URL(`../../i18n/ui/${lang}.js`, import.meta.url), 'utf8'), /* nguồn khóa nguyên câu – web/js/i18n/<lang>.js là gói khóa băm */ { self: g, window: g, globalThis: g }); D = (g.I18N_DICT || {})[lang] || {}; } catch (e) { D = {}; }
  const out = TSW_KEYS.map(k => lang === 'vi' ? k : D[k]);
  if (out.some(x => !x)) return (TSW_L[lang] = lang in LANG_NAMES && lang !== 'en' ? themeLabels('en') : out.map((x, i) => x || TSW_KEYS[i]));
  return (TSW_L[lang] = out);
};
// Một <svg>, ba nhóm biểu tượng; CSS chọn nhóm theo trạng thái hiện tại (không chờ JS → không nháy biểu tượng): ◐ tự động · ☀ sáng · ☾ tối
const TSW_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><g class="ta"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></g><g class="tl"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4m0-14.2-1.4 1.4M6.3 17.7l-1.4 1.4"/></g><path class="td" d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/></svg>';
// aria-label tĩnh = trạng thái "tự động" (đúng khi chưa chọn / không JS); TSW_JS cập nhật aria-label + title theo lựa chọn đã lưu
export const themeSwitch = lang => { const L = themeLabels(lang in LANG_NAMES ? lang : 'en'); return `<button type="button" class="tsw" data-tsw data-l="${esc(L.join('|'))}" aria-label="${esc(`${L[3]}: ${L[0]}`)}">${TSW_SVG}</button>`; };
export const TSW_CSS = `.tsw{display:inline-flex;align-items:center;justify-content:center;flex:none;min-width:var(--tap,44px);min-height:var(--tap,44px);padding:0;border:1px solid var(--line);border-radius:999px;background:var(--surface);color:var(--text);font:inherit;cursor:pointer}.tsw:hover{border-color:var(--primary)}.tsw svg{width:18px;height:18px}.tsw svg>*{display:none}:root:not([data-theme]) .tsw .ta,:root[data-theme=light] .tsw .tl,:root[data-theme=dark] .tsw .td{display:inline}@media(pointer:coarse){.tsw{min-width:45px;min-height:45px}}`;
// Chân trang: viên 3 nút Tự động/Sáng/Tối đúng bản vẽ Stitch (footer-*-390/1280: "Segmented 3-State Theme Toggle"): ô màn hình · mặt trời · trăng,
// nút đang chọn nổi lên (nền surface + gờ dưới, biểu tượng cam). CSS tô nút đang chọn theo data-theme (không chờ JS); TSW_JS cập nhật aria-pressed.
const TSP_ICO = ['<rect x="2.5" y="3.5" width="19" height="13" rx="2"/><path d="M8 20.5h8M12 16.5v4"/>', '<circle cx="12" cy="12" r="4" fill="currentColor"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4m0-14.2-1.4 1.4M6.3 17.7l-1.4 1.4"/>', '<path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/>'];
export const themePill = lang => { const L = themeLabels(lang in LANG_NAMES ? lang : 'en'); return `<div class="tsp" role="group" aria-label="${esc(L[3])}">${['auto', 'light', 'dark'].map((v, i) => `<button type="button" class="tsb" data-tsv="${v}" aria-pressed="${i ? 'false' : 'true'}" aria-label="${esc(L[i])}" title="${esc(L[i])}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${TSP_ICO[i]}</svg></button>`).join('')}</div>`; };
export const TSP_CSS = `.tsp{display:inline-flex;align-items:center;gap:2px;padding:3px;border:2px solid var(--line-2,var(--line));border-radius:999px;background:var(--surface-2,var(--bg))}.tsb{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;padding:0;border:1px solid transparent;border-radius:999px;background:none;color:var(--muted);font:inherit;cursor:pointer;transition:color .15s,background .15s}.tsb:hover{color:var(--text)}.tsb svg{width:18px;height:18px}.tsb:focus-visible{outline:2px solid var(--primary);outline-offset:1px}:root:not([data-theme]) .tsb[data-tsv=auto],:root[data-theme=light] .tsb[data-tsv=light],:root[data-theme=dark] .tsb[data-tsv=dark]{background:var(--surface);border-color:var(--line-2,var(--line));box-shadow:0 2px 0 var(--line-2,var(--line));color:var(--cta-lip,#B53A22)}:root[data-theme=dark] .tsb[data-tsv=dark]{color:var(--cta-1,#FFB054)}@media (prefers-color-scheme:dark){:root:not([data-theme]) .tsb[data-tsv=auto]{color:var(--cta-1,#FFB054)}}@media (max-width:720px),(pointer:coarse){.tsb{width:48px;height:48px}.tsb svg{width:20px;height:20px}}@media (prefers-reduced-motion:reduce){.tsb{transition:none}}`;
// Bấm: tự động → sáng → tối → tự động (cùng thứ tự nút app #themeBtn); đồng bộ giữa các tab qua sự kiện storage
// Bấm: lưu lk.theme (+ mốc lk.themeAt) VÀ vá ielts.settings.theme (+ ielts.settingsAt) nếu app đã có cài đặt (không tạo mới, không đụng khoá khác) → mở app cũng đúng.
export const TSW_JS = `(function(d,r,K){var O=['auto','light','dark'],c=function(){return r.getAttribute('data-theme')||'auto'},f=function(t){var F=t=='light'||t=='dark';F?r.setAttribute('data-theme',t):r.removeAttribute('data-theme');[].forEach.call(d.querySelectorAll('meta[name=theme-color]'),function(m){m.content=F?(t=='dark'?'${THEME_COLOR.dark}':'${THEME_COLOR.light}'):/dark/.test(m.getAttribute('media'))?'${THEME_COLOR.dark}':'${THEME_COLOR.light}'});[].forEach.call(d.querySelectorAll('[data-tsw]'),function(b){var L=b.getAttribute('data-l').split('|');b.title=L[3]+': '+L[O.indexOf(c())];b.setAttribute('aria-label',b.title)});[].forEach.call(d.querySelectorAll('[data-tsv]'),function(b){b.setAttribute('aria-pressed',b.getAttribute('data-tsv')==c())})};f(c());d.addEventListener('click',function(e){var v=e.target.closest&&e.target.closest('[data-tsv]'),b=v||e.target.closest&&e.target.closest('[data-tsw]'),t=v?v.getAttribute('data-tsv'):O[(O.indexOf(c())+1)%3],s,n=Date.now(),p;if(!b)return;f(t);try{s=localStorage;t=='auto'?s.removeItem(K):s.setItem(K,t);s.setItem('${THEME_AT}',n);p=JSON.parse(s.getItem('${APP_SET}')||'0');if(p&&typeof p=='object'&&!Array.isArray(p)){p.theme=t;s.setItem('${APP_SET}',JSON.stringify(p));s.setItem('${APP_SET_AT}',n)}}catch(x){}});addEventListener('storage',function(e){if(e.key==K)f(e.newValue);else if(e.key=='${APP_SET}'&&typeof lkT=='function')f(lkT())})})(document,document.documentElement,'${THEME_KEY}');`;
// Ngôn ngữ đã chọn (app: 'vb.uiLang'; web: 'lk.lang' – đổi trên web ghi CẢ HAI). Sau khi tải: link nội bộ có bản theo ngôn ngữ chắc chắn tồn tại
// (app /app/?hl=, trang chủ /<l>/, blog /<l>/blog/) trỏ về ngôn ngữ đã lưu – kể cả logo, "Mở app", nav, chân trang. Không chuyển trang; bot (không
// localStorage) thấy nguyên link + hreflang/x-default. Mục trong menu/danh sách ngôn ngữ giữ nguyên (đó là lựa chọn). Trang gốc: gợi ý ở landing (hintJs).
export const LANG_KEYS = ['lk.lang', 'vb.uiLang'];
// Cookie chức năng: ngôn ngữ người dùng ĐÃ BẤM CHỌN → "/" đưa về đúng ngôn ngữ đó (functions/api/_rootlang.js). Không đặt khi đoán tự động.
export const LANG_COOKIE = 'lk_lang';
export const LANG_JS = `(function(d){var S='vi en es pt fr de id th zh ja ko hi ar ru tr'.split(' '),s,L,M='[data-lsw],.flang,.flangs';try{s=localStorage;L=s.getItem('vb.uiLang')||s.getItem('lk.lang')}catch(e){return}
d.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[hreflang]');if(a&&a.closest(M)&&S.indexOf(a.hreflang)>=0)try{s.setItem('lk.lang',a.hreflang);s.setItem('vb.uiLang',a.hreflang);d.cookie='${LANG_COOKIE}='+a.hreflang+';path=/;max-age=31536000;samesite=lax;secure'}catch(x){}},true);
if(S.indexOf(L)<0)return;[].forEach.call(d.querySelectorAll('a[href^="/"]'),function(a){if(a.closest(M)||a.hasAttribute('hreflang'))return;var h=a.getAttribute('href'),m,n;
if(m=h.match(/^\\/app\\/(\\?hl=[a-z]{2})?(#.*)?$/))n='/app/'+(L=='vi'?'':'?hl='+L)+(m[2]||'');else if(h=='/'||(m=h.match(/^\\/([a-z]{2})\\/$/))&&S.indexOf(m[1])>=0)n='/'+L+'/';else if((m=h.match(/^\\/([a-z]{2})\\/blog\\/$/))&&S.indexOf(m[1])>=0)n='/'+L+'/blog/';
if(n&&n!=h)a.setAttribute('href',n)})})(document);`;
// Chân trang: nhóm gập mở trên điện thoại (≤720 px: chỉ mở nhóm đầu "Sản phẩm"), máy tính luôn mở; menu ngôn ngữ đóng khi bấm ra ngoài / Esc.
export const FOOT_JS = `(function(d){var q=window.matchMedia?matchMedia('(max-width:720px)'):{matches:!1},G=d.querySelectorAll('.fg'),F=function(){[].forEach.call(G,function(x,i){x.open=!q.matches})};F();q.addEventListener&&q.addEventListener('change',F);
[].forEach.call(G,function(x){x.addEventListener('toggle',function(){if(!q.matches&&!x.open)x.open=true})});
d.addEventListener('click',function(e){[].forEach.call(d.querySelectorAll('.flang[open]'),function(x){if(!x.contains(e.target))x.open=false})});d.addEventListener('keydown',function(e){var x=e.key=='Escape'&&e.target.closest&&e.target.closest('.flang[open]');if(x){x.open=false;x.querySelector('summary').focus()}})})(document);`;
// Đổi luật màu tối/sáng viết bằng @media (prefers-color-scheme) sang mẫu app: trong media thêm :root:not([data-theme=<ngược>]),
// rồi chép thêm một bản ép :root[data-theme=<chế độ>] ngoài media → nút ghi đè được hệ thống ở cả hai chiều. Khối đã có data-theme giữ nguyên.
const splitTop = s => { const out = []; let d = 0, st = 0; for (let i = 0; i < s.length; i++) { const c = s[i]; if (c === '(' || c === '[') d++; else if (c === ')' || c === ']') d--; else if (c === ',' && !d) { out.push(s.slice(st, i)); st = i + 1; } } out.push(s.slice(st)); return out.map(x => x.trim()).filter(Boolean); };
const blocksOf = s => { const out = []; let d = 0, st = 0; for (let i = 0; i < s.length; i++) { if (s[i] === '/' && s[i + 1] === '*') { i = s.indexOf('*/', i + 2) + 1; continue; } if (s[i] === '{') d++; else if (s[i] === '}' && --d === 0) { out.push(s.slice(st, i + 1).trim()); st = i + 1; } } return out; };
const prefixRules = (css, pre) => blocksOf(css).map(b => { const j = b.indexOf('{'), sel = b.slice(0, j).trim(), body = b.slice(j);
  if (sel.startsWith('@')) return /^@(media|supports)/.test(sel) ? `${sel}{${prefixRules(b.slice(j + 1, -1), pre)}}` : b;
  return splitTop(sel).map(x => /^(:root|html)(?![\w-])/.test(x) ? pre + x.replace(/^(:root|html)/, '') : /^\[dir=\w+\]/.test(x) ? pre + x : `${pre} ${x}`).join(',') + body; }).join(''); // [dir=…] nằm trên <html>
const SCHEME_MQ = /@media\s*([^{]*?)\(\s*prefers-color-scheme\s*:\s*(dark|light)\s*\)([^{]*)\{/g;
export function themeCss(css) {
  let out = '', i = 0, m, hit = false; SCHEME_MQ.lastIndex = 0;
  while ((m = SCHEME_MQ.exec(css))) {
    let d = 1, k = m.index + m[0].length; for (; k < css.length && d; k++) { if (css[k] === '{') d++; else if (css[k] === '}') d--; }
    const inner = css.slice(m.index + m[0].length, k - 1), mode = m[2], other = mode === 'dark' ? 'light' : 'dark';
    out += css.slice(i, m.index); i = k; SCHEME_MQ.lastIndex = k;
    if (/data-theme/.test(inner)) { out += css.slice(m.index, k); continue; }
    hit = true; const rest = (m[1] + m[3]).replace(/^\s*and\s+|\s+and\s*$/g, '').trim();
    out += `${m[0]}${prefixRules(inner, `:root:not([data-theme=${other}])`)}}` + (rest ? `@media ${rest}{${prefixRules(inner, `:root[data-theme=${mode}]`)}}` : prefixRules(inner, `:root[data-theme=${mode}]`));
  }
  out += css.slice(i);
  return hit && !/\[data-theme=dark\]\{color-scheme:dark\}/.test(out) ? out + ':root[data-theme=light]{color-scheme:light}:root[data-theme=dark]{color-scheme:dark}' : out;
}
// Hậu kỳ MỌI trang tĩnh: chèn THEME_HEAD sau <meta charset> + đổi luật màu trong mọi <style>. Gọi 2 lần vẫn ra một kết quả.
export const themePage = html => {
  return themeHead(html.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/g, (all, a, c, b) => a + themeCss(c) + b));
};
export const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Cắt mô tả meta ≤ n ký tự ở ranh giới từ (Google hiện ~155–160 ký tự; mô tả 200–320 ký tự bị cắt giữa chừng trên kết quả tìm kiếm)
export const clip = (s, n = 158) => { s = String(s ?? '').replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; const c = s.slice(0, n - 1); return c.slice(0, Math.max(c.lastIndexOf(' '), n * .6)).replace(/[\s,;:–—-]+$/, '') + '…'; };
export const ld = o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;

// Sắc độ phái sinh dùng trong CSS dưới đây nhưng không nằm ở :root của style.css (link, chữ phụ chế độ tối, nền code, gradient CTA)
export const EXTRA_TOKENS = ['#B93A1D', '#9fd8cf', '#7fd6cc', '#12807A', '#e3e5ef', '#6b6f85', '#000', '#fff'];

// ---------- CSS gốc của blog (giữ nguyên từng byte – trang blog dựng ra không đổi) ----------
// CSS footer chung (cũng dùng ở trang pháp lý scripts/build-legal.mjs – trang đó nạp /css/style.css của app nên dùng biến có sẵn ở cả 2 nơi)
export const FOOT_CSS = `footer.site-foot{border-top:1px solid var(--line);color:var(--muted);font-size:14px;background:var(--bg);margin-top:40px}.site-foot .bar{display:block;max-width:1200px;margin:0 auto;padding:28px 32px 0}.fcols{display:grid;grid-template-columns:minmax(200px,3fr) 9fr;gap:32px}.fbrand{display:flex;flex-direction:column;align-items:flex-start;gap:8px}.flogo{display:inline-flex;align-items:center;min-height:44px;gap:10px;font-weight:900;font-size:22px;color:var(--text);text-decoration:none}.flogo b{color:var(--primary)}.flogo img{width:32px;height:32px}.site-foot p{margin:0}.fbrand p{max-width:32ch;font-size:13px;line-height:1.55}.fbtns{display:flex;flex-wrap:wrap;gap:8px}.fbtn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 14px;border:1px solid var(--line-2,var(--line));border-radius:12px;background:var(--surface);color:var(--text);font-weight:800;font-size:13px;text-decoration:none;}.fbtn.pri{background:var(--cta-1,#FFB054);border-color:transparent;color:var(--cta-ink,#1A0E0B);box-shadow:0 2px 0 var(--cta-lip,#B53A22)}.fgrid{display:grid;grid-template-columns:1fr 2fr 1fr;gap:24px}.fg summary{display:flex;align-items:center;min-height:44px;list-style:none;pointer-events:none}.fg summary::-webkit-details-marker{display:none}.site-foot h2{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:0}.site-foot ul{list-style:none;margin:0;padding:0}.site-foot li{margin:0;break-inside:avoid}.fw ul{columns:2;column-gap:24px}.site-foot .fg a,.flegal a{display:flex;align-items:center;min-height:44px;min-width:44px;color:var(--muted);text-decoration:none}.site-foot .fg a:hover,.flegal a:hover{color:var(--text);text-decoration:underline}.fbot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:4px 24px;margin-top:16px;padding:8px 0;border-top:1px solid var(--line);font-size:13px}.fbot b{color:var(--text)}.fcopy,.flegal{display:flex;flex-wrap:wrap;align-items:center;gap:0 14px}.ftm{padding:0 0 20px;font-size:12px;line-height:1.5}.fctl{display:flex;align-items:center;gap:8px;margin-inline-start:auto}.flang{position:relative}.flang summary{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 12px;border:1px solid var(--line-2,var(--line));border-radius:12px;background:var(--surface);color:var(--text);font-weight:600;cursor:pointer;list-style:none}.flang summary::-webkit-details-marker{display:none}.flang summary::after{content:"";width:6px;height:6px;margin:0 2px 3px 4px;border:solid currentColor;border-width:0 2px 2px 0;transform:rotate(45deg)}.flang summary svg{width:16px;height:16px}.flangs{position:absolute;bottom:calc(100% + 8px);inset-inline-end:0;z-index:20;display:grid;grid-template-columns:repeat(3,auto);gap:0 4px;padding:8px;background:var(--surface);border:1px solid var(--line-2,var(--line));border-radius:12px;box-shadow:0 12px 28px rgba(0,0,0,.18)}.site-foot .flangs a{display:flex;align-items:center;min-height:44px;padding:0 12px;border-radius:8px;color:var(--text);text-decoration:none;white-space:nowrap}.site-foot .flangs a:hover{background:var(--surface-2,var(--bg));text-decoration:underline}.flangs a[aria-current]{font-weight:800}.flangs{width:max-content;max-width:calc(100vw - 32px)}.flangs a{min-width:max-content}.site-foot .tsw{width:44px;height:44px;border-radius:12px}@media (max-width:1024px){.fcols{grid-template-columns:1fr;gap:20px}.fbrand{flex-direction:row;flex-wrap:wrap;align-items:center;gap:8px 20px}.fbrand p{flex:1 1 260px}}@media (max-width:720px){.site-foot .bar{padding:28px 16px 0}.fbrand{flex-direction:column;align-items:stretch}.fbtns{flex-wrap:nowrap}.fbtn{flex:1 1 0;min-height:48px;font-size:14px}.fgrid{grid-template-columns:1fr;gap:0}.fg{border-bottom:1px solid var(--line)}.fg:first-child{border-top:1px solid var(--line)}.fg summary{justify-content:space-between;min-height:48px;pointer-events:auto;cursor:pointer}.fg summary::after{content:"";width:8px;height:8px;margin-inline-end:8px;border:solid var(--text);border-width:0 2px 2px 0;transform:rotate(45deg)}.fg[open] summary::after{transform:rotate(-135deg)}.site-foot .fg h2{font-size:15px;letter-spacing:0;text-transform:none;color:var(--text);font-weight:700}.fw ul{columns:1;padding-bottom:8px}.site-foot .fg a,.flegal a{min-height:48px}.fbot{flex-direction:column;align-items:flex-start;margin-top:16px}.fctl{order:-1;margin-inline-start:0}.flang summary,.site-foot .tsw{min-height:48px;height:48px}.site-foot .tsw{width:48px}.flangs{grid-template-columns:repeat(2,auto);inset-inline-end:auto;inset-inline-start:0}.site-foot .flangs a{min-height:48px}}${TSP_CSS}`;
export const CSS = `:root{${LT};--primary:#CC3F1C;--primary-ink:#fff;--primary-soft:#FFEBE4;--accent:#0D6964;--accent-soft:#DDF1EE;--brand:#0F3D3E;--link:#B93A1D;--r:16px;color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{${DK};--primary:#FF8466;--primary-ink:#1A0E0B;--primary-soft:#3A221C;--accent-soft:#10302f;--brand:#9fd8cf;--link:#FFA582}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;background:var(--bg);color:var(--text);font:17px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}
a{color:var(--link);text-underline-offset:2px}a:focus-visible,button:focus-visible{outline:3px solid var(--accent);outline-offset:2px;border-radius:4px}
.skip{position:absolute;left:8px;top:-60px;background:var(--surface);padding:8px 12px;z-index:9;min-height:44px;display:inline-flex;align-items:center}.skip:focus{top:8px}
header.top{background:var(--surface);border-bottom:1px solid var(--line)}.bar{max-width:1080px;margin:0 auto;padding:10px 16px;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.logo{display:flex;align-items:center;min-height:44px;gap:8px;font-weight:800;font-size:20px;color:var(--text);text-decoration:none;letter-spacing:-.02em}.logo b{color:var(--primary)}.logo img{border-radius:8px}
nav.main{display:flex;gap:4px 14px;flex-wrap:wrap;font-weight:600;font-size:15px;margin-left:auto;align-items:center}nav.main a{color:var(--text);text-decoration:none}nav.main a:hover{color:var(--primary)}
@media(pointer:coarse){.btn,.lsw .lsw-b,a.chip,summary{min-height:45px}summary{align-content:center}}.btn{display:inline-block;background:var(--primary);color:var(--primary-ink)!important;padding:9px 16px;border-radius:999px;font-weight:700;text-decoration:none;font-size:15px}
main{max-width:1080px;margin:0 auto;padding:20px 16px 40px}
.crumbs{font-size:14px;color:var(--muted);margin:4px 0 12px}.crumbs a{color:var(--muted)}
article.post{max-width:740px;margin:0 auto}.post h1{font-size:clamp(28px,4.4vw,40px);line-height:1.2;margin:.2em 0 .4em;letter-spacing:-.02em;color:var(--text)}
.meta{color:var(--muted);font-size:14px;display:flex;flex-wrap:wrap;gap:4px 14px;margin-bottom:18px}.chip{display:inline-block;background:var(--accent-soft);color:var(--accent);padding:2px 10px;border-radius:999px;font-size:13px;font-weight:700;text-decoration:none}
@media (prefers-color-scheme:dark){.chip{color:#7fd6cc}}
.post h2{font-size:26px;line-height:1.3;margin:1.8em 0 .5em;letter-spacing:-.01em;scroll-margin-top:16px}.post h3{font-size:20px;margin:1.4em 0 .3em;scroll-margin-top:16px}.post h4{font-size:18px;margin:1.2em 0 .3em}
.post p,.post li{max-width:70ch}.post img{max-width:100%;height:auto;display:block;border-radius:12px}
figure{margin:24px 0}figure picture{display:block;border:1px solid var(--line);border-radius:12px;overflow:hidden;box-shadow:0 8px 28px rgba(20,20,60,.08)}figcaption{font-size:14px;color:var(--muted);text-align:center;margin-top:8px}
.cover{margin:0 0 20px}.diagram{margin:24px 0}.diagram svg{display:block;margin:0 auto;max-width:100%;height:auto}.diagram caption{caption-side:top;font-weight:700;padding:6px 0}
.toc{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:12px 18px;margin:18px 0}.toc summary{font-weight:700;cursor:pointer}.toc ol{margin:8px 0 0;padding-left:20px;font-size:15px;line-height:1.6}
blockquote{margin:20px 0;padding:10px 18px;background:var(--primary-soft);border-left:4px solid var(--primary);border-radius:0 12px 12px 0}blockquote p{margin:.4em 0}
.tbl{overflow-x:auto;margin:18px 0}table{border-collapse:collapse;width:100%;font-size:15px;background:var(--surface)}th,td{border:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top}th{background:var(--accent-soft)}
code{background:var(--accent-soft);padding:1px 5px;border-radius:5px;font-size:.92em}pre{background:${TK['--bg']};color:${TK['--text']};padding:14px;border-radius:12px;overflow:auto}pre code{background:none;padding:0}
a.app{font-weight:600}
.copy{font-size:13px;color:var(--muted,#6b6f85);border-top:1px solid var(--line,#e3e5ef);padding-top:12px;margin-top:28px}.cta{background:linear-gradient(135deg,#0F3D3E,#12807A);color:#fff;border-radius:var(--r);padding:18px 20px;margin:28px 0;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.cta p{margin:0;max-width:52ch}.cta-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.cta .btn-hide{background:none;border:0;color:#fff;opacity:.8;font:inherit;font-size:13px;cursor:pointer;text-decoration:underline;padding:4px 6px}.cta .btn-hide:hover{opacity:1}.cta[data-dismissed="1"]{display:none!important}
.yt{position:relative;aspect-ratio:16/9;background:#000;border-radius:12px;overflow:hidden;margin:24px 0}.yt img,.yt iframe{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border:0}.yt button{position:absolute;inset:0;margin:auto;width:72px;height:50px;border:0;border-radius:14px;background:#E5502F;cursor:pointer}.yt button::after{content:"";position:absolute;left:29px;top:15px;border-style:solid;border-width:10px 0 10px 17px;border-color:transparent transparent transparent #fff}
.tags{display:flex;gap:8px;flex-wrap:wrap;margin:24px 0}.tags a{border:1px solid var(--line);border-radius:999px;padding:3px 12px;font-size:14px;text-decoration:none;color:var(--text);background:var(--surface)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:18px;margin:18px 0}.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);overflow:hidden;display:flex;flex-direction:column}.card a.ti{color:var(--text);text-decoration:none}.card a.ti:hover h3,.card a.ti:hover h2{color:var(--primary)}
.card .pic picture{display:block;aspect-ratio:16/10;overflow:hidden}.card .pic img{width:100%;height:100%;object-fit:cover;object-position:top}.card .pic.fit picture{background:#0F3D3E}.card .pic.fit img{object-fit:contain;object-position:center}.card .bd{padding:12px 16px 16px}.card h2,.card h3{font-size:18px;line-height:1.35;margin:6px 0}.card p{font-size:15px;color:var(--muted);margin:0}
.hero{padding:10px 0 4px}.hero h1{font-size:clamp(28px,4vw,40px);margin:.1em 0;letter-spacing:-.02em}.hero p{color:var(--muted);max-width:70ch;margin:.3em 0 0}
.cats{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.cats a{padding:5px 14px;border-radius:999px;border:1px solid var(--line);background:var(--surface);text-decoration:none;color:var(--text);font-weight:600;font-size:15px}.cats a[aria-current]{background:var(--brand);border-color:var(--brand);color:#fff}
@media (prefers-color-scheme:dark){.cats a[aria-current]{color:var(--bg)}}
.pager{display:flex;justify-content:space-between;gap:12px;margin:24px 0;font-weight:700}
.trybox{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:18px 20px;margin:32px 0}.trybox h2{margin:0 0 6px;font-size:20px}.trybox p{margin:0 0 12px;color:var(--muted)}
[dir=rtl] blockquote{border-left:0;border-right:4px solid var(--primary);border-radius:12px 0 0 12px}[dir=rtl] .toc ol{padding-left:0;padding-right:20px}[dir=rtl] th,[dir=rtl] td{text-align:right}[dir=rtl] .skip:focus{left:auto;right:8px}
${LSW_CSS}
${TSW_CSS}
${FOOT_CSS}
@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}`;

// ---------- CSS bổ sung cho trang SEO dựng từ dữ liệu app (chỉ dùng biến màu ở trên + token style.css) ----------
// Sáng: nút cam đậm #CC3F1C (= --primary của app, chữ trắng đạt AA 4.9:1); tối giữ #FF8466 với chữ tối.
// Vùng chạm ≥ 44px + thanh đầu một hàng trên điện thoại – dùng chung cho MỌI trang tĩnh có siteHeader/crumbs/footer (trang SEO + blog; quality-sweep touch-target)
export const TAP_CSS = `.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:0 18px;line-height:1.2;transition:filter .15s,transform .15s}.btn:hover{filter:brightness(1.06)}.btn:active{transform:translateY(1px)}
nav.main a:not(.btn){display:inline-flex;align-items:center;justify-content:center;min-height:44px;min-width:44px;padding:0 4px}.lsw .lsw-b{min-height:44px;padding:0 14px}.tsw{min-width:44px;min-height:44px}
.crumbs{display:flex;flex-wrap:wrap;align-items:center;gap:0 6px;margin:0 0 8px}.crumbs a{display:inline-flex;align-items:center;justify-content:center;min-height:44px;min-width:44px}.crumbs [aria-current]{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
.cats a,.tf a,.jump a{display:inline-flex;align-items:center;min-height:44px;padding-top:0;padding-bottom:0}
.site-foot li a,.flangs a{display:inline-flex;align-items:center;justify-content:center;min-height:44px;min-width:44px}.site-foot li a{justify-content:flex-start}.pager a{display:inline-flex;align-items:center;min-height:44px}.site-foot li{margin:0}
@media (max-width:640px){header.top .bar{flex-wrap:nowrap;gap:8px;padding:6px 16px}nav.main{flex-wrap:nowrap;gap:8px}nav.main>a:not(.btn){display:none}.logo span{font-size:19px}main{padding-top:4px}}`;
export const SEO_CSS = `@media (prefers-color-scheme:light){:root{--primary:#CC3F1C}}
:root{--srch:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M10 2a8 8 0 0 1 6.3 12.9l5.4 5.4-1.4 1.4-5.4-5.4A8 8 0 1 1 10 2zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12z'/%3E%3C/svg%3E")}
:root{--spk:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z'/%3E%3C/svg%3E")}
[hidden]{display:none!important}nav.main a[aria-current]{color:var(--primary)}
.lang{border:1px solid var(--line);border-radius:999px;padding:3px 10px;font-size:14px}
.hero .em{font-size:.95em;margin-right:10px}.hero .sub{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 0}
.chip.alt{background:var(--primary-soft);color:var(--link)}.chip.ink{background:var(--surface);color:var(--text);border:1px solid var(--line)}
.page{max-width:820px;margin:0 auto}.page h2{font-size:24px;line-height:1.3;margin:1.6em 0 .5em;letter-spacing:-.01em}.page h3{font-size:18px;margin:1.3em 0 .3em}
.cta{color:#fff}.cta strong{font-size:18px}.cta .btn{background:#fff;color:#0F3D3E!important}.cta small{display:block;opacity:.9;font-size:14px}
.cta-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.cta .btn-hide{background:none;border:0;color:#fff;opacity:.8;font:inherit;font-size:13px;cursor:pointer;text-decoration:underline;padding:4px 6px}.cta .btn-hide:hover{opacity:1}.cta[data-dismissed="1"]{display:none!important}
.q{background:var(--surface);border:1px solid var(--line);border-left:4px solid var(--brand);border-radius:12px;padding:14px 18px;font-weight:600}.q ul{font-weight:400;margin:.5em 0 0}.q .open{font-weight:400;font-size:15px;color:var(--muted)}
.ess{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:6px 22px;font-size:17.5px;line-height:1.8}.ess p{margin:.9em 0}
mark{background:var(--primary-soft);color:inherit;border-radius:4px;padding:0 2px;box-shadow:inset 0 -2px 0 var(--primary)}.ln{color:var(--accent)}@media (prefers-color-scheme:dark){.ln{color:#7fd6cc}}
.lb{display:inline-block;font-size:12px;font-weight:700;color:var(--accent);background:var(--accent-soft);border-radius:6px;padding:0 6px;margin-right:4px;vertical-align:1px}
.wt{border-collapse:separate;border-spacing:0;border:1px solid var(--line);border-radius:var(--r);overflow:hidden;font-size:16px;margin:12px 0}.wt th{color:var(--accent);font-size:12px;text-transform:uppercase;letter-spacing:.05em;border:0;border-bottom:1px solid var(--line);padding:10px 14px}.wt td{border:0;border-bottom:1px solid var(--line);padding:12px 14px}.wt tr:last-child td{border-bottom:0}.wt tbody tr:hover{background:var(--bg)}
.wt .w{font-weight:800;font-size:18px;white-space:nowrap}.ipa{font-family:"Lucida Sans Unicode","Arial Unicode MS","Segoe UI",sans-serif;color:var(--muted);font-size:15px}.pos{font-size:12px;font-weight:700;color:var(--muted);border:1px solid var(--line);border-radius:6px;padding:0 5px;margin-left:4px}
.ex{color:var(--muted);font-style:italic;font-size:15px}.wt .no{color:var(--muted);font-size:13px;width:2.5em}
.au{visibility:hidden;width:32px;height:32px;border:0;border-radius:50%;background:var(--accent-soft);color:var(--accent);cursor:pointer;vertical-align:middle;margin-right:8px;padding:0;display:inline-grid;place-items:center}.js .au{visibility:visible}.au::before{content:"";width:16px;height:16px;background:currentColor;-webkit-mask:var(--spk) center/contain no-repeat;mask:var(--spk) center/contain no-repeat}.au[aria-pressed=true]{background:var(--accent);color:var(--surface)}
@media (max-width:640px){.wt thead{display:none}.wt,.wt tbody,.wt tr,.wt td{display:block}.wt tr{padding:12px 14px;border-bottom:1px solid var(--line)}.wt tr:last-child{border-bottom:0}.wt td{border:0;padding:2px 0}.wt .no{display:none}}
.set .bd{display:flex;flex-direction:column;gap:4px;height:100%}.set .em{font-size:30px;line-height:1.2}.set .chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:auto;padding-top:10px}.has-em .bd{display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto 1fr;gap:2px 14px}.has-em .bd>*{grid-column:2}.has-em .em{grid-column:1;grid-row:1/span 2}.has-em .chips{align-self:end}.set h2,.set h3{margin:2px 0}
.card a.ti{display:block;height:100%}.card a.ti:focus-visible{outline-offset:-3px}
.filter{visibility:hidden;margin:16px 0 4px}.js .filter{visibility:visible}.filter input{width:100%;max-width:520px;font:inherit;font-size:16px;padding:10px 16px;border:1px solid var(--line);border-radius:999px;background:var(--surface);color:var(--text)}.filter input:focus-visible{outline:3px solid var(--accent);outline-offset:2px}.filter output{display:block;font-size:14px;color:var(--muted);min-height:1.5em;margin-top:4px}
.grp{margin-top:28px}.grp h2{font-size:22px;margin:0 0 4px}.grp>p{color:var(--muted);margin:0}.grp h2 small{font-size:14px;color:var(--muted);font-weight:600;margin-left:6px}
.tip{background:var(--accent-soft);border-radius:12px;padding:12px 16px;margin:14px 0}.err{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:10px 16px;margin:10px 0}.err s{color:var(--muted)}.err .why{color:var(--muted);font-size:15px}
.uses li{margin:.4em 0}.sig{display:flex;flex-wrap:wrap;gap:6px}.fx td:first-child{white-space:nowrap}
.ext{border:1px dashed var(--line);border-radius:var(--r);padding:14px 18px;margin:28px 0;display:flex;gap:12px;align-items:center;flex-wrap:wrap;background:var(--surface)}.ext p{margin:0;flex:1 1 260px;font-size:15px;color:var(--muted)}.ext strong{color:var(--text)}.ext button{background:none;border:0;color:var(--muted);font:inherit;font-size:14px;cursor:pointer;text-decoration:underline}.ext[data-dismissed="1"],.pwa-box[data-dismissed="1"]{display:none!important}
.pager a{max-width:48%}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (prefers-color-scheme:dark){.wt th,.au,.lb{color:#7fd6cc}.au[aria-pressed=true]{color:var(--bg);background:#7fd6cc}}
.smp{--ac2:var(--accent);--tc:var(--ac2)}
@media (prefers-color-scheme:dark){.smp{--ac2:#7fd6cc}}
.t-ad{--tc:#E5502F}.t-di{--tc:#12807A}.t-ps{--tc:#FFB054}.t-av{--tc:#2FBF71}.t-pn{--tc:#FF8FA3}.t-tp{--tc:#FFC94A}.t-fo{--tc:var(--brand)}
.smp.page{max-width:1080px}.smp.narrow{max-width:820px}
.smp .hero2{position:relative;background:var(--surface);border:1px solid var(--line);border-radius:24px;padding:22px 22px 20px;margin:4px 0 18px;overflow:hidden}
.smp .hero2::before{content:"";position:absolute;left:0;right:0;top:0;height:5px;background:linear-gradient(90deg,#0F3D3E,#12807A 45%,#FFB054 78%,#E5502F)}
.smp .kick span{white-space:nowrap}.smp .kick span:not(:last-child)::after{content:"·";margin-left:8px}
.smp .kick{display:flex;flex-wrap:wrap;gap:4px 8px;margin:4px 0 0;font-size:12.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--ac2)}
.smp .hero2 h1{font-size:clamp(26px,4vw,38px);line-height:1.2;margin:.25em 0 .15em;letter-spacing:-.02em;max-width:24em}
.smp .hero2 .lead{color:var(--muted);margin:.2em 0 0;max-width:60ch}
.smp .hero2.has-kit{padding-right:140px}.smp .hero2 .kit{position:absolute;right:22px;bottom:12px}
@media (max-width:720px){.smp .hero2.has-kit{padding-right:22px}.smp .hero2 .kit{display:none}.smp .hero2{border-radius:18px;padding:18px 16px 16px}}
.stats{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 0;padding:0;list-style:none}
.stats li{display:flex;align-items:baseline;gap:6px;background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:5px 12px;font-size:14px;color:var(--muted);line-height:1.5}
.stats b{font-size:18px;color:var(--text);font-variant-numeric:tabular-nums}
.stats .band{background:linear-gradient(135deg,#0F3D3E,#12807A);border-color:transparent;color:#fff;font-weight:700}.stats .band b{color:#FFC94A}
.smp .grid{grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:16px}
.sc{position:relative;transition:transform .15s,box-shadow .15s,border-color .15s}
.sc::before{content:"";position:absolute;left:0;right:0;top:0;height:4px;background:var(--tc)}
.sc:hover,.sc:focus-within{transform:translateY(-2px);box-shadow:0 12px 28px rgba(15,61,62,.12)}
@media (prefers-reduced-motion:reduce){.sc,.pg2 a{transition:none}.sc:hover,.sc:focus-within{transform:none}}
.smp .sc .bd{padding:16px 18px 14px}
.sc-top{display:flex;justify-content:space-between;align-items:center;gap:8px;min-height:24px}
.tchip{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:800;color:var(--text);background:var(--bg);border:1px solid var(--line);border-radius:999px;padding:1px 10px}
.tchip::before,.tf a[class]::before,.smp .grp>h2::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--tc);flex:none}
.sc-em{font-size:24px;line-height:1}
.smp .sc h3{font-size:16.5px;line-height:1.45;margin:8px 0 2px;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
.smp .sc p{font-size:14.5px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.sc-meta{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center;margin-top:auto;padding-top:12px;font-size:13px;color:var(--muted)}
.sc-meta .bnd{background:var(--brand);color:#fff;border-radius:8px;padding:0 8px;font-weight:800}
@media (prefers-color-scheme:dark){.sc-meta .bnd{color:var(--bg)}}
.smp .grp>h2{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.grp.off{display:none}
.tf,.jump{display:flex;gap:8px;overflow-x:auto;padding:2px 2px 8px;margin:4px 0 0;scrollbar-width:thin}
.tf a,.jump a{flex:none;display:inline-flex;gap:8px;align-items:center;border:1px solid var(--line);background:var(--surface);color:var(--text);text-decoration:none;border-radius:999px;padding:6px 14px;font-weight:700;font-size:14px;line-height:1.4}
.tf a b{font-size:12px;color:var(--muted)}.tf a:hover,.jump a:hover{border-color:var(--tc)}
.tf a[aria-pressed=true]{background:var(--text);border-color:var(--text);color:var(--surface)}.tf a[aria-pressed=true] b{color:inherit;opacity:.8}
/* ux – shared list/search components for every static SEO page (docs/UX-PUBLIC.md): ≥44px targets, one-row phone header, sticky find bar, empty state */
${TAP_CSS}
.find{position:sticky;top:0;z-index:15;margin:12px -16px 4px;padding:8px 16px 2px;background:var(--bg);box-shadow:0 1px 0 var(--line)}
.find .filter{margin:0}.find .tf{padding-bottom:6px}
.filter .fi{position:relative;display:block;max-width:560px}.filter .fi::before{content:"";position:absolute;left:16px;top:50%;width:18px;height:18px;margin-top:-9px;background:var(--muted);-webkit-mask:var(--srch) center/contain no-repeat;mask:var(--srch) center/contain no-repeat;pointer-events:none}
.filter input{max-width:none;min-height:48px;padding:0 48px 0 46px;font-size:16px;transition:border-color .15s,box-shadow .15s}.filter input:hover{border-color:var(--muted)}.filter input:focus{border-color:var(--accent);box-shadow:0 0 0 4px var(--accent-soft);outline:none}
.filter input::-webkit-search-cancel-button{display:none}
.filter .qc{position:absolute;right:2px;top:2px;width:44px;height:44px;border:0;border-radius:50%;background:none;color:var(--muted);font:inherit;font-size:22px;line-height:1;cursor:pointer}.filter .qc:hover{color:var(--text)}
.filter kbd{position:absolute;right:14px;top:50%;transform:translateY(-50%);font:600 12px/1 inherit;color:var(--muted);border:1px solid var(--line);border-radius:6px;padding:4px 7px;pointer-events:none}.filter .fi:focus-within kbd,.filter .has-q kbd{display:none}
@media (hover:none){.filter kbd{display:none}}
.filter output{padding:0 4px}.filter.none output{display:flex;align-items:center;gap:10px;margin:10px 0 6px;padding:14px 16px;background:var(--surface);border:1px dashed var(--line);border-radius:var(--r);color:var(--text);font-size:15px}.filter.none output::before{content:"🔍";font-size:20px}
.grp{scroll-margin-top:132px}.grp[hidden]{display:none}
.card{transition:transform .15s,box-shadow .15s,border-color .15s}.card.set:hover,.card.set:focus-within{transform:translateY(-2px);box-shadow:0 12px 28px rgba(15,61,62,.12);border-color:var(--accent)}
.au{width:44px;height:44px;margin:-6px 2px -6px -6px}
[dir=rtl] .filter .fi::before{left:auto;right:16px}[dir=rtl] .filter input{padding:0 46px 0 48px}[dir=rtl] .filter .qc{right:auto;left:2px}[dir=rtl] .filter kbd{right:auto;left:14px}
@media (prefers-reduced-motion:reduce){.btn,.card,.filter input{transition:none}.card.set:hover,.card.set:focus-within{transform:none}}
/* /ux */`;

// ---------- Khối khung trang (header, footer, breadcrumb) – blog và trang SEO dùng chung ----------
// lang + langHref(l): thêm nút đổi ngôn ngữ (langSwitch) cuối thanh điều hướng
export const siteHeader = ({ nav, open, home = '/', extra = '', lang, langHref, label }) => `<header class="top"><div class="bar"><a class="logo" href="${home}"><img src="/icons/icon.svg?v=3" width="32" height="32" alt=""><span>lex<b>kite</b></span></a>
<nav class="main" aria-label="Lexkite">${nav.map(([h, t, a = '']) => `<a href="${h}"${a}>${t}</a>`).join('')}<a class="btn" href="${open[0]}">${open[1]}</a>${extra}${lang ? themeSwitch(lang) + langSwitch({ lang, langHref, label }) : ''}</nav></div></header>`;
export const GLOBE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c2.6 2.6 4 6 4 9.5s-1.4 6.9-4 9.5c-2.6-2.6-4-6-4-9.5s1.4-6.9 4-9.5z"/></svg>';
// Nút 🌐 + mã ngôn ngữ → menu 15 ngôn ngữ (tên bản địa, lang/hreflang từng mục). langHref(l) = trang TƯƠNG ĐƯƠNG bằng ngôn ngữ l
// (cùng ánh xạ với hreflang của trang), không có thì trang cha gần nhất (blog ngôn ngữ đó → trang chủ ngôn ngữ đó). Không JS: menu ẩn,
// danh sách ngôn ngữ ở chân trang vẫn dùng được. label: chữ "Ngôn ngữ" theo ngôn ngữ trang (mặc định FOOT[lang][16]).
export const langSwitch = ({ lang, langHref = landingHref, label }) => {
  const L = esc(label || (FOOT[lang] || FOOT.en)[16]), cur = lang in LANG_NAMES ? lang : 'en';
  return `<div class="lsw" data-lsw><button type="button" class="lsw-b" aria-haspopup="true" aria-expanded="false" aria-controls="lsw-m" aria-label="${cur.toUpperCase()} – ${L}: ${LANG_NAMES[cur]}">${GLOBE}<span class="lsw-c">${cur.toUpperCase()}</span></button><ul class="lsw-m" id="lsw-m" role="menu" aria-label="${L}" translate="no" hidden>${Object.entries(LANG_NAMES).map(([l, n]) => `<li role="none"><a role="menuitem" href="${langHref(l)}" lang="${l}" hreflang="${l}"${l === 'ar' ? ' dir="rtl"' : ''}${l === cur ? ' aria-current="page"' : ''}>${n}</a></li>`).join('')}</ul></div>`;
};
// Nút ngôn ngữ trỏ đúng bản dịch: twins = { lang: đường dẫn } lấy từ CHÍNH danh sách hreflang của trang; ngôn ngữ chưa có bản dịch → /<l>/blog/
// (blog có đủ 15 ngôn ngữ – content/blog/<lang>/), không bao giờ về trang nháp/noindex hay đoán URL.
export const twinOr = twins => l => twins[l] || `/${l}/blog/`;
// Footer chung cho MỌI trang tĩnh (blog 15 ngôn ngữ, trang SEO, 404, chọn ngôn ngữ blog): thương hiệu · Sản phẩm · Học miễn phí · Thông tin & pháp lý · đổi ngôn ngữ · ©.
// Trang pháp lý /<lang>/privacy|terms có đủ 15 ngôn ngữ (scripts/build-legal.mjs); #cookies, #delete là mốc trong trang privacy.
export const LANG_NAMES = { vi: 'Tiếng Việt', en: 'English', es: 'Español', pt: 'Português', fr: 'Français', de: 'Deutsch', id: 'Bahasa Indonesia', th: 'ไทย', zh: '简体中文', ja: '日本語', ko: '한국어', hi: 'हिन्दी', ar: 'العربية', ru: 'Русский', tr: 'Türkçe' };
//            [Sản phẩm, Học miễn phí, Thông tin, Ứng dụng web, Add-on Chrome, Blog, Từ vựng, Bài mẫu Writing, IELTS Speaking, Ngữ pháp, Giới thiệu, Liên hệ, Quyền riêng tư, Điều khoản, Cookie, Xóa dữ liệu, Ngôn ngữ, Nguồn hình ảnh, Học, Công cụ miễn phí, Mở app, Thêm vào Chrome, Tải app điện thoại]
export const FOOT = {
  vi: ['Sản phẩm', 'Học miễn phí', 'Thông tin', 'Ứng dụng web', 'Add-on Chrome', 'Blog', 'Từ vựng', 'Bài mẫu Writing', 'IELTS Speaking', 'Ngữ pháp', 'Giới thiệu', 'Liên hệ', 'Quyền riêng tư', 'Điều khoản', 'Cookie & lưu trữ', 'Xóa dữ liệu', 'Ngôn ngữ', 'Nguồn hình ảnh', 'Học', 'Công cụ miễn phí', 'Mở app', 'Thêm vào Chrome', 'Tải app điện thoại'],
  en: ['Product', 'Resources', 'Company', 'Web app', 'Chrome add-on', 'Blog', 'Vocabulary', 'Writing samples', 'IELTS Speaking', 'Grammar', 'About', 'Contact', 'Privacy', 'Terms', 'Cookies & storage', 'Delete my data', 'Language', 'Image credits', 'Learn', 'Free tools', 'Open web app', 'Add to Chrome', 'Get the mobile app'],
  es: ['Producto', 'Recursos', 'Empresa', 'App web', 'Extensión de Chrome', 'Blog', 'Vocabulario', 'Ensayos modelo', 'IELTS Speaking', 'Gramática', 'Acerca de', 'Contacto', 'Privacidad', 'Términos', 'Cookies y almacenamiento', 'Eliminar mis datos', 'Idioma', 'Créditos de imágenes', 'Aprender', 'Herramientas gratis', 'Abrir app web', 'Añadir a Chrome', 'Descarga la app móvil'],
  pt: ['Produto', 'Recursos', 'Empresa', 'App web', 'Extensão do Chrome', 'Blog', 'Vocabulário', 'Redações modelo', 'IELTS Speaking', 'Gramática', 'Sobre', 'Contato', 'Privacidade', 'Termos', 'Cookies e armazenamento', 'Excluir meus dados', 'Idioma', 'Créditos das imagens', 'Aprender', 'Ferramentas grátis', 'Abrir app web', 'Adicionar ao Chrome', 'Baixe o app para celular'],
  fr: ['Produit', 'Ressources', 'Entreprise', 'Application web', 'Extension Chrome', 'Blog', 'Vocabulaire', 'Essais modèles', 'IELTS Speaking', 'Grammaire', 'À propos', 'Contact', 'Confidentialité', 'Conditions', 'Cookies et stockage', 'Supprimer mes données', 'Langue', 'Crédits des images', 'Apprendre', 'Outils gratuits', 'Ouvrir l’app web', 'Ajouter à Chrome', 'Télécharger l’app mobile'],
  de: ['Produkt', 'Ressourcen', 'Unternehmen', 'Web-App', 'Chrome-Erweiterung', 'Blog', 'Wortschatz', 'Musteressays', 'IELTS Speaking', 'Grammatik', 'Über uns', 'Kontakt', 'Datenschutz', 'Nutzungsbedingungen', 'Cookies & Speicher', 'Meine Daten löschen', 'Sprache', 'Bildnachweise', 'Lernen', 'Kostenlose Tools', 'Web-App öffnen', 'Zu Chrome hinzufügen', 'Mobile App laden'],
  id: ['Produk', 'Sumber belajar', 'Perusahaan', 'Aplikasi web', 'Ekstensi Chrome', 'Blog', 'Kosakata', 'Contoh esai', 'IELTS Speaking', 'Tata bahasa', 'Tentang', 'Kontak', 'Privasi', 'Ketentuan', 'Cookie & penyimpanan', 'Hapus data saya', 'Bahasa', 'Kredit gambar', 'Belajar', 'Alat gratis', 'Buka aplikasi web', 'Tambahkan ke Chrome', 'Unduh aplikasi seluler'],
  th: ['ผลิตภัณฑ์', 'แหล่งเรียนรู้', 'เกี่ยวกับเรา', 'เว็บแอป', 'ส่วนขยาย Chrome', 'บล็อก', 'คำศัพท์', 'เรียงความตัวอย่าง', 'IELTS Speaking', 'ไวยากรณ์', 'เกี่ยวกับ', 'ติดต่อ', 'ความเป็นส่วนตัว', 'ข้อกำหนด', 'คุกกี้และพื้นที่จัดเก็บ', 'ลบข้อมูลของฉัน', 'ภาษา', 'เครดิตภาพ', 'เรียนรู้', 'เครื่องมือฟรี', 'เปิดเว็บแอป', 'เพิ่มใน Chrome', 'ดาวน์โหลดแอปมือถือ'],
  zh: ['产品', '学习资源', '公司', '网页版应用', 'Chrome 扩展', '博客', '词汇', '范文', '雅思口语', '语法', '关于', '联系我们', '隐私政策', '使用条款', 'Cookie 与本地存储', '删除我的数据', '语言', '图片来源', '学习', '免费工具', '打开网页版', '添加到 Chrome', '下载手机应用'],
  ja: ['製品', '学習リソース', '運営', 'Web アプリ', 'Chrome 拡張機能', 'ブログ', '語彙', '模範エッセイ', 'IELTS スピーキング', '文法', '概要', 'お問い合わせ', 'プライバシー', '利用規約', 'Cookie とストレージ', 'データの削除', '言語', '画像クレジット', '学ぶ', '無料ツール', 'Web アプリを開く', 'Chrome に追加', 'モバイルアプリを入手'],
  ko: ['제품', '학습 자료', '회사', '웹 앱', 'Chrome 확장 프로그램', '블로그', '어휘', '모범 에세이', 'IELTS 스피킹', '문법', '소개', '문의하기', '개인정보처리방침', '이용약관', '쿠키 및 저장소', '내 데이터 삭제', '언어', '이미지 출처', '학습', '무료 도구', '웹 앱 열기', 'Chrome에 추가', '모바일 앱 받기'],
  hi: ['उत्पाद', 'संसाधन', 'कंपनी', 'वेब ऐप', 'Chrome एक्सटेंशन', 'ब्लॉग', 'शब्दावली', 'नमूना निबंध', 'IELTS स्पीकिंग', 'व्याकरण', 'हमारे बारे में', 'संपर्क करें', 'गोपनीयता', 'शर्तें', 'कुकीज़ और स्टोरेज', 'मेरा डेटा हटाएँ', 'भाषा', 'चित्र श्रेय', 'सीखें', 'मुफ़्त टूल', 'वेब ऐप खोलें', 'Chrome में जोड़ें', 'मोबाइल ऐप पाएँ'],
  ar: ['المنتج', 'الموارد', 'الشركة', 'تطبيق الويب', 'إضافة Chrome', 'المدونة', 'المفردات', 'مقالات نموذجية', 'محادثة IELTS', 'القواعد', 'من نحن', 'اتصل بنا', 'الخصوصية', 'الشروط', 'ملفات تعريف الارتباط والتخزين', 'حذف بياناتي', 'اللغة', 'مصادر الصور', 'تعلّم', 'أدوات مجانية', 'افتح تطبيق الويب', 'أضِف إلى Chrome', 'نزّل تطبيق الجوال'],
  ru: ['Продукт', 'Материалы', 'Компания', 'Веб-приложение', 'Расширение Chrome', 'Блог', 'Слова', 'Примеры эссе', 'IELTS Speaking', 'Грамматика', 'О нас', 'Контакты', 'Конфиденциальность', 'Условия', 'Cookie и хранилище', 'Удалить мои данные', 'Язык', 'Источники изображений', 'Обучение', 'Бесплатные инструменты', 'Открыть веб-приложение', 'Добавить в Chrome', 'Скачать мобильное приложение'],
  tr: ['Ürün', 'Kaynaklar', 'Şirket', 'Web uygulaması', 'Chrome eklentisi', 'Blog', 'Kelime', 'Örnek yazılar', 'IELTS Speaking', 'Dil bilgisi', 'Hakkında', 'İletişim', 'Gizlilik', 'Koşullar', 'Çerezler ve depolama', 'Verilerimi sil', 'Dil', 'Görsel kaynakları', 'Öğren', 'Ücretsiz araçlar', 'Web uygulamasını aç', 'Chrome’a ekle', 'Mobil uygulamayı indir'],
};
const ABOUT = { vi: 'gioi-thieu', en: 'about', es: 'acerca-de', pt: 'sobre', fr: 'a-propos', de: 'ueber-uns', id: 'tentang', tr: 'hakkinda' };
// App học nằm ở /app/ (SPA, hash route); /<lang>/ là trang giới thiệu tĩnh (scripts/build-landing.mjs); / chuyển theo ngôn ngữ (functions/index.js)
export const appHref = lang => lang === 'vi' ? '/app/' : `/app/?hl=${lang}`;
export const landingHref = lang => `/${lang}/`;
// getApp: HTML nút "Tải app" dưới đoạn giới thiệu (chỉ landing truyền)
// lang: ngôn ngữ trang; text/tm: câu giới thiệu + ghi chú nhãn hiệu (theo ngôn ngữ); langHref(l): link bản ngôn ngữ l (mặc định trang chủ blog l)
// Ghi chú nhãn hiệu (docs/BRAND-RULES.md § Nhãn hiệu): "Lexkite™" chỉ ở lần nhắc nổi bật đầu tiên + chân trang/pháp lý – không đổi logo/wordmark
export const TM_OWNER = 'MODIAN LUXURY JEWELRY LLC';
export const TM_NOTE = {
  vi: `Lexkite™ là nhãn hiệu của ${TM_OWNER}.`,
  en: `Lexkite™ is a trademark of ${TM_OWNER}.`,
  es: `Lexkite™ es una marca de ${TM_OWNER}.`,
  pt: `Lexkite™ é uma marca de ${TM_OWNER}.`,
  fr: `Lexkite™ est une marque de ${TM_OWNER}.`,
  de: `Lexkite™ ist eine Marke der ${TM_OWNER}.`,
  id: `Lexkite™ adalah merek dagang ${TM_OWNER}.`,
  th: `Lexkite™ เป็นเครื่องหมายการค้าของ ${TM_OWNER}`,
  zh: `Lexkite™ 是 ${TM_OWNER} 的商标。`,
  ja: `Lexkite™ は ${TM_OWNER} の商標です。`,
  ko: `Lexkite™는 ${TM_OWNER}의 상표입니다.`,
  hi: `Lexkite™, ${TM_OWNER} का ट्रेडमार्क है।`,
  ar: `Lexkite™ علامة تجارية لشركة ${TM_OWNER}.`,
  ru: `Lexkite™ — товарный знак компании ${TM_OWNER}.`,
  tr: `Lexkite™, ${TM_OWNER} şirketinin ticari markasıdır.`,
};
// Lần nhắc đầu trong đoạn giới thiệu chân trang: "Lexkite – …" → "Lexkite™ – …" (không thêm nếu đã có)
export const tmFirst = s => String(s || '').replace(/Lexkite(?!™)/, 'Lexkite™');
// Nhóm liên kết chân trang (Sản phẩm · Học · Công cụ miễn phí · Thông tin) – NGUỒN DUY NHẤT cho siteFooter (trang tĩnh) và siteChrome (khung Stitch landing)
export const footGroups = (lang, extra = [], coExtra = []) => {
  const cur = lang in LANG_NAMES ? lang : 'en', f = FOOT[cur], fe = i => f[i] || FOOT.en[i], app = appHref(lang), vi = lang === 'vi', lg = `/${cur}`;
  const product = [[app, f[3]], [`${app}#/settings`, f[4]], ...(PLAY_STORE ? [[PLAY_STORE, fe(22), ' rel="noopener"']] : [])];
  const learn = [[`${lg}/blog/`, f[5]], [vi ? '/tu-vung/' : '/en/vocabulary/', f[6]], ...(vi ? [['/ngu-phap/', f[9]]] : []), [vi ? '/samples/' : '/en/samples/', f[7]], [vi ? '/speaking/' : '/en/speaking/', f[8]], ...(SP[lang] ? [[`/${lang}/words/`, SP[lang].words], [`/${lang}/conversations/`, SP[lang].conv]] : []), ...extra]; // trang tĩnh Từ điển + Giao tiếp (docs/SEO-ARCH.md)
  const tools = toolFoot(lang); // công cụ miễn phí (scripts/lib/tools-links.mjs)
  const co = [[authAbout(lang) || `${lg}/blog/${ABOUT[lang] || 'about'}/`, f[10]], ...authFoot(lang), [`${app}#/contact`, f[11]], [`${lg}/privacy`, f[12]], [`${lg}/terms`, f[13]], [`${lg}/privacy#cookies`, f[14]], [`${lg}/privacy#delete`, f[15]], [`${lg}/credits`, fe(17)], ...coExtra];
  return { cur, f, product, learn, tools, co };
};
// Chân trang theo thiết kế Stitch (docs: PR #303): cột thương hiệu (logo diều + câu giới thiệu + "Mở app" + "Add to Chrome") · 4 nhóm
// Sản phẩm / Học / Công cụ miễn phí / Thông tin (gập mở trên điện thoại) · thanh đáy © + nhãn hiệu + menu ngôn ngữ (<details>, link <a> cho bot) + nút giao diện.
// Đủ mọi link cũ; "Tải app điện thoại" = link Google Play thật (web/js/ext-config.js LK_APPS.play; iOS chưa phát hành → chưa thêm).
export const PLAY_STORE = (rdWeb('js/ext-config.js').match(/play: '([^']+)'/) || [])[1];
export const LEGAL_RE = /\/(privacy|terms)(#|$)/; // Quyền riêng tư · Điều khoản · Cookie · Xóa dữ liệu → hàng đáy (gọn, vẫn là <a> cho bot)
export const siteFooter = ({ lang = 'en', text = '', tm = '', year = new Date().getFullYear(), extra = [], langHref, getApp = '', coExtra = [] }) => {
  const { cur, f, product, learn, tools, co } = footGroups(lang, extra, coExtra), app = appHref(lang), fe = i => f[i] || FOOT.en[i];
  const col = (h, items, c = '') => items.length ? `<details class="fg${c}" open><summary><h2>${h}</h2></summary><ul>${items.map(([u, n, a = '']) => `<li><a href="${u}"${a}>${n}</a></li>`).join('')}</ul></details>` : '';
  const legal = co.filter(([u]) => LEGAL_RE.test(u)), info = co.filter(([u]) => !LEGAL_RE.test(u)); // 3 cột cân: Sản phẩm · Học + Công cụ (2 cột con) · Thông tin
  const langs = Object.entries(LANG_NAMES).map(([l, n]) => `<a href="${langHref ? langHref(l) : `/${l}/blog/`}" lang="${l}" hreflang="${l}"${l === 'ar' ? ' dir="rtl"' : ''}${l === lang ? ' aria-current="true"' : ''}>${n}</a>`).join('');
  return `<footer class="site-foot"><div class="bar"><div class="fcols"><div class="fbrand"><a class="flogo" href="${landingHref(cur)}"><img src="/icons/icon.svg?v=3" width="36" height="36" alt=""><span>lex<b>kite</b></span></a><p>${tmFirst(text)}</p><div class="fbtns"><a class="fbtn pri" href="${app}">${fe(20)}</a>${EXT_STORE ? `<a class="fbtn" href="${EXT_STORE}" target="_blank" rel="noopener">${fe(21)}</a>` : ''}${getApp}</div></div><div class="fgrid">${col(f[0], product)}${col(`${fe(18)} · ${fe(19)}`, [...learn, ...tools], ' fw')}${col(f[2], info)}</div></div>
<div class="fbot"><p class="fcopy"><b>© ${year} Lexkite</b><span class="flegal">${legal.map(([u, n]) => `<a href="${u}">${n}</a>`).join('')}</span></p><div class="fctl"><details class="flang"><summary aria-label="${esc(`${f[16]}: ${LANG_NAMES[cur]}`)}">${GLOBE}<span>${LANG_NAMES[cur]}</span></summary><nav class="flangs" aria-label="${esc(f[16])}" translate="no">${langs}</nav></details>${themePill(cur)}</div></div>
<p class="ftm">${TM_NOTE[lang] || TM_NOTE.en}${tm ? ` ${tm}` : ''}</p></div></footer>
${SITE_UI}`;
};
// JS dùng chung mọi trang tĩnh (menu ngôn ngữ đầu trang + nút giao diện + đồng bộ ngôn ngữ + chân trang) → 1 file tĩnh có cache (web/js/site-ui.js,
// sinh bởi scripts/build-landing.mjs; --check báo cũ). Không nằm inline → landing nhẹ hơn (≤ 16 KB gz). Chống nháy vẫn inline (THEME_HEAD).
// Dải gợi ý ngôn ngữ của trang giới thiệu (chỉ trang có <body data-lhint>): trình duyệt/app dùng ngôn ngữ khác trang đang xem → dải nhỏ, đóng được, chỉ người thật sau khi vẽ.
// Nằm trong site-ui.js (có cache, nạp sau load) thay vì script nội tuyến → mỗi landing nhẹ hơn ~0,5 KB gzip (ngân sách 16 KB, ru sát trần). Chữ 15 ngôn ngữ → HINT_FILE, chỉ tải khi cần hiện.
export const HINT_FILE = '/js/lhint.json';
export const HINT_JS = `(function(d){var b=d.body,P=d.documentElement.lang,ls;if(!b||!b.hasAttribute('data-lhint'))return;try{ls=window.localStorage;if(ls.getItem('lk.lhint'))return;
var n=ls.getItem('vb.uiLang')||ls.getItem('lk.lang')||(navigator.languages&&navigator.languages[0])||navigator.language||'';n=String(n).toLowerCase().split('-')[0];if(n===P||${JSON.stringify(Object.keys(LANG_NAMES).join(' '))}.split(' ').indexOf(n)<0)return;
fetch('${HINT_FILE}').then(function(r){return r.json()}).then(function(A){var S=A[n];if(!S)return;
var e=d.createElement('div');e.className='lhint';e.lang=n;if(n==='ar')e.dir='rtl';e.setAttribute('role','region');e.setAttribute('aria-label',S[0]);
e.innerHTML='<span></span><a class="btn"></a><button type="button">×</button>';e.firstChild.textContent=S[0];var a=e.querySelector('a'),c=e.querySelector('button');a.href='/'+n+'/';a.textContent=S[1];c.setAttribute('aria-label',S[2]);
var x=function(){try{ls.setItem('lk.lhint','1')}catch(z){}};a.onclick=function(){x();d.cookie='${LANG_COOKIE}='+n+';path=/;max-age=31536000;samesite=lax;secure'};c.onclick=function(){x();e.remove()};b.appendChild(e)})['catch'](function(){})}catch(z){}})(document);`;
// Nguồn thật (docs/SEO-ARCH.md §9): khách từ ngoài vào trang tĩnh → chỉ tên miền nguồn + loại trang: giữ 30 phút cho app (lk.src, web/js/app.js) và đếm 1 lần/nguồn/30 phút (/api/hit t:'l'). Không cookie, không gửi URL đầy đủ.
export const SRC_JS = `(function(d,l){try{var r=d.referrer,s=window.localStorage,h,o,a;if(!r||l.protocol!=='https:'||navigator.webdriver||s.getItem('lk.noTrack')==='1')return;h=new URL(r).hostname.replace(/^www\\./,'');if(h===l.hostname)return;
o=JSON.parse(s.getItem('lk.src')||'0');if(o&&o.h===h&&Date.now()-o.t<18e5)return;s.setItem('lk.src',JSON.stringify({h:h,t:Date.now()}));a=l.pathname.split('/').filter(Boolean);
navigator.sendBeacon&&navigator.sendBeacon('/api/hit',JSON.stringify({t:'l',ref:h,p:(/^[a-z]{2}$/.test(a[0])?a[1]:a[0])||'',lang:d.documentElement.lang}))}catch(z){}})(document,location);`;
export const SITE_UI_JS = () => `/* SINH TỰ ĐỘNG từ scripts/lib/site-layout.mjs (LSW_JS + TSW_JS + LANG_JS + FOOT_JS + HINT_JS + SRC_JS) – sửa ở đó rồi chạy node scripts/build-landing.mjs */\n${LSW_JS}\n${TSW_JS}\n${LANG_JS}\n${FOOT_JS}\n${HINT_JS}\n${SRC_JS}\nwindow.LkUi=1;\n`;
export const SITE_UI_V = createHash('sha256').update(SITE_UI_JS()).digest('hex').slice(0, 8);
export const SITE_UI = `<script src="/js/site-ui.js?v=${SITE_UI_V}" defer></script>`;
// Landing (giữ LCP: không <script src> trong HTML – landing-routing kiểm): nạp cùng file SAU sự kiện load, như js/get-app.js nạp khi cần
export const SITE_UI_LAZY = `<script>addEventListener('load',function(){var s=document.createElement('script');s.src='/js/site-ui.js?v=${SITE_UI_V}';document.head.appendChild(s)})</script>`;
// ---------- Vỏ chung theo Stitch v2.1 (brand/stitch/web/gen/chrome.js – TỰ SINH từ brand/stitch/web/home-*.html + bind/home.json) ----------
// Trả dữ liệu THẬT cho ST2.chrome(d) (scripts/lib/st-web.mjs render(…, {chrome})): cùng liên kết với siteHeader/siteFooter (footCols, langSwitch, TM_NOTE).
//   CHỮ THÔ (chưa escape – khung tự escape); các trường *html (menu, extra, getApp) là HTML dựng sẵn. Trang nào cũng truyền được (blog, bài mẫu…):
//   nav [[href, chữ, hreflang]] · open/signin [href, chữ] · extra: HTML chèn cạnh nút (vd "Tải app") · langHref(l) = trang tương đương bằng ngôn ngữ l.
//   Menu ngôn ngữ = khối lsw cũ (LSW_JS + LSW_CSS: aria-haspopup, 1 menu ẩn 15 mục lang/hreflang) gắn lên thanh đầu trang Stitch: nút 🌐 máy tính là nút chính,
//   nút 🌐 điện thoại (data-lsw-alt) bấm hộ nút chính + soi aria-expanded. Nút ☰ (aria-controls/expanded) bật lớp `hidden` của khung menu Stitch.
//   Cả hai trong MNAV_JS (nối sau LSW_JS, không handler nội tuyến → hợp CSP).
export const MNAV_JS = `(function(d){var g=d.querySelector('[data-lsw-alt]'),r=g&&g.closest('[data-lsw]'),q=r&&r.querySelector('[aria-haspopup]');if(q&&q!==g){g.onclick=function(){q.click()};new MutationObserver(function(){g.setAttribute('aria-expanded',q.getAttribute('aria-expanded'))}).observe(q,{attributes:true,attributeFilter:['aria-expanded']})}
var b=d.querySelector('[data-mnav]'),m=b&&d.getElementById(b.getAttribute('aria-controls'));if(!m)return;b.onclick=function(){var o=m.classList.toggle('hidden');b.setAttribute('aria-expanded',o?'false':'true')};d.addEventListener('keydown',function(e){if(e.key==='Escape'&&!m.classList.contains('hidden')){m.classList.add('hidden');b.setAttribute('aria-expanded','false');b.focus()}})})(document);`;
export const lswMenu = ({ lang, langHref = landingHref, label, id = 'lsw-m' }) => { const L = esc(label || (FOOT[lang] || FOOT.en)[16]), cur = lang in LANG_NAMES ? lang : 'en';
  return `<ul class="lsw-m" id="${id}" role="menu" aria-label="${L}" translate="no" hidden>${Object.entries(LANG_NAMES).map(([l, n]) => `<li role="none"><a href="${langHref(l)}" lang="${l}" hreflang="${l}" role="menuitem"${l === 'ar' ? ' dir="rtl"' : ''}${l === cur ? ' aria-current="page"' : ''}>${n}</a></li>`).join('')}</ul>`; };
// Biến màu chung của khối cũ (lsw, lhint, quiz.js, ô quảng cáo…) trên trang khung Stitch (body.stw) = token Stitch --st-* (tự đổi sáng/tối) – landing + blog
export const STW_VARS = 'body.stw{--surface:rgb(var(--st-surface-container-lowest));--line:rgb(var(--st-outline-variant));--text:rgb(var(--st-on-surface));--muted:rgb(var(--st-on-surface-variant));--primary:rgb(var(--st-secondary));--accent-soft:rgb(var(--st-secondary-container)/.25);--tap:44px;color:var(--text)}';
export const siteChrome = ({ lang = 'en', nav = [], open, signin, home, extra = '', langHref = landingHref, label, text = '', tm = '', year = new Date().getFullYear(), extraRes = [], getApp = '', js = '' }) => {
  const { f, product, learn, tools, co } = footGroups(lang, extraRes), cur = lang in LANG_NAMES ? lang : 'en', L = label || f[16];
  const cols = [[f[0], product], [f[1], [...learn, ...tools]], [f[2], co]]; // 3 cột của mẫu Stitch: công cụ miễn phí nối sau nhóm Học (đủ mọi link chân trang tĩnh)
  return { lang: cur, code: cur.toUpperCase(), home: home || landingHref(cur), nav, start: open, signin: signin || open,
    lswLabel: `${cur.toUpperCase()} – ${L}: ${LANG_NAMES[cur]}`, langLabel: L,
    menu: lswMenu({ lang: cur, langHref, label: L }), globe: GLOBE.replace('<svg ', '<svg width="16" height="16" '), extra: Array.isArray(extra) ? extra : [extra, extra],
    cols: cols.map(([h, items]) => ({ h, items })), foot: tmFirst(text), getApp, tm, copy: `© ${year} Lexkite · ${TM_NOTE[lang] || TM_NOTE.en}`,
    langs: Object.entries(LANG_NAMES).map(([l, name]) => ({ l, name, href: langHref(l), cur: l === cur })), js: MNAV_JS + (js ? '\n' + js : '') }; // LSW_JS/TSW_JS/FOOT_JS ở /js/site-ui.js (SITE_UI_LAZY)
};
export const crumbsHtml = items => `<nav class="crumbs" aria-label="Breadcrumb">${items.map(([n, u], i) => i === items.length - 1 ? `<span aria-current="page">${esc(n)}</span>` : `<a href="${u}">${esc(n)}</a>`).join(' › ')}</nav>`;
export const crumbsLd = (site, items) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, u], i) => ({ '@type': 'ListItem', position: i + 1, name, item: site + u })) });

// ---------- Trang SEO từ dữ liệu app (vi/en) ----------
export const SEO_L = {
  vi: {
    home: 'Trang chủ', skip: 'Bỏ qua đến nội dung', open: 'Mở app', app: '/app/',
    nav: [['/vi/blog/', 'Blog'], ['/tu-vung/', 'Từ vựng'], ['/ngu-phap/', 'Ngữ pháp'], ['/samples/', 'Bài mẫu'], ['/speaking/', 'Speaking']],
    sections: [['/tu-vung/', 'Từ vựng'], ['/ngu-phap/', 'Ngữ pháp'], ['/samples/', 'Bài mẫu Writing'], ['/speaking/', 'IELTS Speaking'], ['/viet-thu/', 'Thư mẫu IELTS General'], ['/phat-am/', 'Phát âm']],
    foot: 'Lexkite – học từ vựng & luyện thi IELTS, TOEIC, TOEFL miễn phí. Nội dung tự biên soạn, miễn phí cho người học.',
    tm: 'IELTS, TOEIC, TOEFL là nhãn hiệu của chủ sở hữu tương ứng; Lexkite là sản phẩm độc lập.',
    links: [['/vi/blog/', 'Blog'], ['/app/', 'Ứng dụng'], ['/vi/privacy', 'Quyền riêng tư'], ['/vi/terms', 'Điều khoản']],
    switchTo: ['English', 'en'], sectionsL: 'Chuyên mục', search: 'Lọc theo tên, chủ đề…', searchL: 'Lọc danh sách', found: n => `${n} kết quả`, none: 'Không có mục nào khớp – thử từ khóa khác.',
    play: w => `Nghe phát âm “${w}”`, related: 'Có thể bạn quan tâm', ext: ['Tra từ ngay khi đọc web.', 'Cài add-on Lexkite cho Chrome: bấm đúp vào từ bất kỳ để xem nghĩa, phiên âm và lưu vào flashcard.', 'Xem add-on', 'Ẩn'], extHref: '/app/#/settings',
    col: { no: '#', word: 'Từ', ipa: 'Phiên âm', mean: 'Nghĩa', ex: 'Ví dụ' }, words: 'từ', sets: 'bộ', lessons: 'bài', items: 'bài',
  },
  en: {
    home: 'Home', skip: 'Skip to content', open: 'Open app', app: '/app/?hl=en',
    nav: [['/en/blog/', 'Blog'], ['/en/vocabulary/', 'Vocabulary'], ['/en/grammar/', 'Grammar'], ['/en/ielts-writing/', 'Writing'], ['/en/speaking/', 'Speaking']],
    sections: [['/en/vocabulary/', 'Vocabulary'], ['/en/grammar/', 'Grammar'], ['/en/pronunciation/', 'Pronunciation'], ['/en/ielts-writing/', 'IELTS Writing'], ['/en/samples/', 'Writing Task 2'], ['/en/speaking/', 'IELTS Speaking']],
    foot: 'Lexkite – free vocabulary and IELTS, TOEIC, TOEFL practice. Original learning content, free for learners.',
    tm: 'IELTS, TOEIC and TOEFL are trademarks of their respective owners; Lexkite is independent.',
    links: [['/en/blog/', 'Blog'], ['/app/?hl=en', 'App'], ['/en/privacy', 'Privacy'], ['/en/terms', 'Terms']],
    switchTo: ['Tiếng Việt', 'vi'], sectionsL: 'Sections', search: 'Filter by name or topic…', searchL: 'Filter the list', found: n => `${n} results`, none: 'Nothing matches – try another word.',
    play: w => `Play pronunciation of “${w}”`, related: 'You may also like', ext: ['Look up words while you read.', 'Get the Lexkite add-on for Chrome: double-click any word for its meaning and IPA, then save it to your flashcards.', 'See the add-on', 'Hide'], extHref: '/app/?hl=en#/settings',
    col: { no: '#', word: 'Word', ipa: 'IPA', mean: 'Meaning', ex: 'Example' }, words: 'words', sets: 'sets', lessons: 'lessons', items: 'items',
  },
};

// Chữ mới của thanh tìm/lọc + số liệu trang danh sách (15 ngôn ngữ – trang tĩnh hiện có vi/en, các ngôn ngữ khác dùng khi mở thêm)
// [Xóa, Lọc theo nhóm, bộ từ, từ, nhóm, có phát âm]
export const FIND_I18N = {
  vi: ['Xóa', 'Lọc theo nhóm', 'bộ từ', 'từ', 'nhóm', 'có phát âm'],
  en: ['Clear', 'Filter by category', 'word lists', 'words', 'categories', 'with audio'],
  es: ['Borrar', 'Filtrar por categoría', 'listas', 'palabras', 'categorías', 'con audio'],
  pt: ['Limpar', 'Filtrar por categoria', 'listas', 'palavras', 'categorias', 'com áudio'],
  fr: ['Effacer', 'Filtrer par catégorie', 'listes', 'mots', 'catégories', 'avec audio'],
  de: ['Löschen', 'Nach Kategorie filtern', 'Listen', 'Wörter', 'Kategorien', 'mit Audio'],
  id: ['Hapus', 'Saring menurut kategori', 'daftar', 'kata', 'kategori', 'dengan audio'],
  th: ['ล้าง', 'กรองตามหมวดหมู่', 'ชุดคำศัพท์', 'คำ', 'หมวดหมู่', 'มีเสียงอ่าน'],
  zh: ['清除', '按类别筛选', '个词表', '个单词', '个类别', '含发音'],
  ja: ['クリア', 'カテゴリで絞り込む', 'リスト', '語', 'カテゴリ', '音声付き'],
  ko: ['지우기', '카테고리별 필터', '개 목록', '개 단어', '개 카테고리', '발음 포함'],
  hi: ['साफ़ करें', 'श्रेणी के अनुसार फ़िल्टर करें', 'सूचियाँ', 'शब्द', 'श्रेणियाँ', 'ऑडियो सहित'],
  ar: ['مسح', 'التصفية حسب الفئة', 'قوائم', 'كلمة', 'فئات', 'مع النطق'],
  ru: ['Очистить', 'Фильтр по категории', 'списков', 'слов', 'категорий', 'с озвучкой'],
  tr: ['Temizle', 'Kategoriye göre filtrele', 'liste', 'kelime', 'kategori', 'sesli'],
};

export const SMART_CTA_I18N = {
  vi: { saveTopic: '＋ Lưu bộ từ này vào thẻ ôn', pwaH: 'Thêm Lexkite vào màn hình chính', pwaP: 'Mở nhanh như ứng dụng, ôn từ mọi lúc không cần cài đặt phức tạp.', pwaBtn: 'Mở ứng dụng', extH: 'Tra từ ngay khi đọc web', extP: 'Cài add-on Lexkite cho Chrome: bấm đúp vào từ bất kỳ để xem nghĩa, phiên âm và lưu vào flashcard.', extBtn: 'Xem add-on', hide: 'Ẩn' },
  en: { saveTopic: '＋ Save this word list to review', pwaH: 'Add Lexkite to your Home Screen', pwaP: 'Fast app-like experience, review vocabulary anytime without app store install.', pwaBtn: 'Open app', extH: 'Look up words while you read', extP: 'Get the Lexkite add-on for Chrome: double-click any word for meanings, IPA, and flashcards.', extBtn: 'See the add-on', hide: 'Hide' },
  id: { saveTopic: '＋ Simpan daftar kata ini untuk ditinjau', pwaH: 'Tambahkan Lexkite ke Layar Utama', pwaP: 'Akses cepat seperti aplikasi, tinjau kosakata kapan saja tanpa instalasi rumit.', pwaBtn: 'Buka aplikasi', extH: 'Cari kata saat membaca web', extP: 'Pasang add-on Lexkite untuk Chrome: klik ganda kata apa pun untuk arti, fonetik, dan flashcard.', extBtn: 'Lihat add-on', hide: 'Sembunyikan' },
  es: { saveTopic: '＋ Guardar esta lista para repasar', pwaH: 'Añade Lexkite a tu pantalla de inicio', pwaP: 'Acceso rápido como una app, repasa vocabulario en cualquier momento.', pwaBtn: 'Abrir app', extH: 'Busca palabras mientras navegas', extP: 'Instala la extensión de Lexkite para Chrome: haz doble clic para ver significados y guardar en tarjetas.', extBtn: 'Ver extensión', hide: 'Ocultar' },
  pt: { saveTopic: '＋ Salvar esta lista para revisar', pwaH: 'Adicione o Lexkite à tela inicial', pwaP: 'Acesso rápido como um app, revise o vocabulário a qualquer momento.', pwaBtn: 'Abrir app', extH: 'Consulte palavras enquanto lê', extP: 'Instale a extensão do Lexkite para Chrome: clique duas vezes para significados e flashcards.', extBtn: 'Ver extensão', hide: 'Ocultar' },
  fr: { saveTopic: '＋ Enregistrer cette liste pour réviser', pwaH: "Ajoutez Lexkite à votre écran d'accueil", pwaP: 'Accès rapide comme une appli, révisez vos mots à tout moment sans installation.', pwaBtn: "Ouvrir l'appli", extH: 'Cherchez des mots en naviguant', extP: 'Installez le module Lexkite pour Chrome : double-cliquez sur un mot pour sa définition et ses cartes mémo.', extBtn: 'Voir le module', hide: 'Masquer' },
  de: { saveTopic: '＋ Diese Wortliste zum Wiederholen speichern', pwaH: 'Lexkite zum Startbildschirm hinzufügen', pwaP: 'Schnell wie eine App, jederzeit Vokabeln wiederholen ohne App-Store.', pwaBtn: 'App öffnen', extH: 'Wörter beim Lesen nachschlagen', extP: 'Hole dir die Lexkite-Erweiterung für Chrome: Doppelklick für Bedeutungen, Lautschrift und Karteikarten.', extBtn: 'Erweiterung ansehen', hide: 'Ausblenden' },
  tr: { saveTopic: '＋ Bu kelime listesini tekrara kaydet', pwaH: "Lexkite'ı Ana Ekrana Ekleyin", pwaP: 'Uygulama gibi hızlı erişim, karmaşık kurulum olmadan istediğiniz zaman kelime tekrarı yapın.', pwaBtn: 'Uygulamayı aç', extH: 'Okurken kelimeleri anında arayın', extP: 'Chrome için Lexkite eklentisini edinin: anlamlar, telaffuz ve bilgi kartları için kelimeye çift tıklayın.', extBtn: 'Eklentiyi gör', hide: 'Gizle' },
  ru: { saveTopic: '＋ Сохранить этот список для повторения', pwaH: 'Добавьте Lexkite на главный экран', pwaP: 'Быстрый доступ как в приложении, повторяйте слова в любое время.', pwaBtn: 'Открыть приложение', extH: 'Переводите слова во время чтения', extP: 'Установите расширение Lexkite для Chrome: двойной клик для перевода, транскрипции и карточек.', extBtn: 'Смотреть расширение', hide: 'Скрыть' },
  ar: { saveTopic: '＋ حفظ قائمة الكلمات هذه للمراجعة', pwaH: 'أضف Lexkite إلى الشاشة الرئيسية', pwaP: 'وصول سريع كالتطبيق، راجع المفردات في أي وقت دون تثبيت معقد.', pwaBtn: 'افتح التطبيق', extH: 'ابحث عن الكلمات أثناء التصفح', extP: 'ثبّت إضافة Lexkite لمتصفح Chrome: انقر نقرًا مزدوجًا لمعرفة المعاني وحفظ البطاقات.', extBtn: 'عرض الإضافة', hide: 'إخفاء' },
  hi: { saveTopic: '＋ दोहराने के लिए इस शब्द सूची को सहेजें', pwaH: 'Lexkite को होम स्क्रीन पर जोड़ें', pwaP: 'ऐप जैसा तेज़ अनुभव, बिना किसी जटिलता के कभी भी शब्दावली दोहराएँ।', pwaBtn: 'ऐप खोलें', extH: 'वेब पढ़ते समय तुरंत शब्द खोजें', extP: 'Chrome के लिए Lexkite एक्सटेंशन इंस्टॉल करें: अर्थ और फ़्लैशकार्ड के लिए किसी भी शब्द पर डबल क्लिक करें।', extBtn: 'एक्सटेंशन देखें', hide: 'छिपाएँ' },
  ko: { saveTopic: '＋ 이 단어장을 복습 목록에 저장', pwaH: '홈 화면에 Lexkite 추가하기', pwaP: '앱처럼 빠른 실행, 복잡한 설치 없이 언제 어디서나 단어를 복습하세요.', pwaBtn: '앱 열기', extH: '웹 서핑 중 바로 단어 검색', extP: 'Chrome용 Lexkite 확장 프로그램을 추가하세요: 단어를 두 번 클릭해 뜻과 플래시카드를 확인하세요.', extBtn: '확장 프로그램 보기', hide: '숨기기' },
  zh: { saveTopic: '＋ 保存此词表到复习卡片', pwaH: '将 Lexkite 添加至主屏幕', pwaP: '如原生应用般快捷打开，无需繁琐安装，随时随地背单词。', pwaBtn: '打开应用', extH: '网页阅读随时查词', extP: '安装 Lexkite Chrome 扩展：双击任意单词即可查看释义、音标并保存到卡片。', extBtn: '查看扩展', hide: '隐藏' },
  ja: { saveTopic: '＋ この単語リストを復習に保存', pwaH: 'ホーム画面に Lexkite を追加', pwaP: 'アプリのようにすばやく起動、面倒なインストールなしでいつでも単語を復習。', pwaBtn: 'アプリを開く', extH: 'Web閲覧中にその場で単語検索', extP: 'Chrome版Lexkite拡張機能を追加：単語をダブルクリックして意味と発音を確認、暗記カードに保存。', extBtn: '拡張機能を見る', hide: '非表示' },
  th: { saveTopic: '＋ บันทึกชุดคำศัพท์นี้ไว้ทบทวน', pwaH: 'เพิ่ม Lexkite ไปยังหน้าจอหลัก', pwaP: 'เปิดเร็วเหมือนแอป ทบทวนคำศัพท์ได้ทุกเมื่อโดยไม่ต้องติดตั้งให้ยุ่งยาก', pwaBtn: 'เปิดแอป', extH: 'ค้นหาคำศัพท์ขณะท่องเว็บ', extP: 'ติดตั้งส่วนขยาย Lexkite สำหรับ Chrome: ดับเบิลคลิกที่คำใดก็ได้เพื่อดูความหมายและบันทึกลงแฟลชการ์ด', extBtn: 'ดูส่วนขยาย', hide: 'ซ่อน' },
};

export const TOPIC_IDS = new Set([
  'architecture', 'awl1', 'awl10', 'awl2', 'awl3', 'awl4', 'awl5', 'awl6', 'awl7', 'awl8', 'awl9',
  'collocations', 'consumerism', 'crime', 'culture', 'describe', 'dom-biz', 'dom-edu', 'dom-eng',
  'dom-env', 'dom-hosp', 'dom-it', 'dom-law', 'dom-log', 'dom-med', 'dom-mkt', 'economy',
  'education', 'energy', 'environment', 'ex-c2', 'ex-ielts-gt-letter', 'ex-ielts-gt-life',
  'ex-ielts-listen', 'ex-ielts-read', 'ex-ielts-speak', 'ex-ielts-write', 'ex-toefl',
  'ex-toefl-campus', 'ex-toefl-lecture', 'ex-toeic-l', 'ex-toeic-office', 'ex-toeic-r',
  'ex-toeic-travel', 'food', 'government', 'health', 'idioms', 'language', 'linking',
  'media', 'ngsl1', 'ngsl2', 'ngsl3', 'ngsl4', 'ngsl5', 'ngsl6', 'ngsl7', 'ngsl8',
  'ngsl9', 'opinion', 'phrasal', 'science', 'society', 'space', 'sport', 'task1',
  'task2', 'technology', 'toeic1', 'toeic10', 'toeic2', 'toeic3', 'toeic4', 'toeic5',
  'toeic6', 'toeic7', 'toeic8', 'toeic9', 'travel', 'urban', 'wildlife', 'work'
]);

const COPY_MSG = { vi: 'Nguồn: ', en: 'Source: ' };
// Gắn nguồn khi sao chép > 200 ký tự (P1 chống cào – giống blog)
export const copyJs = lang => `document.addEventListener('copy',e=>{const s=window.getSelection();if(!s||s.rangeCount===0)return;const t=s.toString();if(t.length<=200)return;const m="\\n\\n${COPY_MSG[lang] || COPY_MSG.en}"+document.title.replace(/\\s*[–|]\\s*Lexkite$/i,'')+" – "+location.href.split('#')[0]+" (Lexkite)";e.clipboardData.setData('text/plain',t+m);e.preventDefault();});`;
// JS nhỏ cuối trang (không chặn hiển thị): bật .js (hiện nút nghe/ô lọc – chỗ đã giữ sẵn, CLS 0), phát âm từ CDN audio, lọc thẻ, gợi ý add-on Chrome máy tính & PWA di động
export const UI_JS = `(function(d){var r=d.documentElement;r.classList.add('js');var L=['https://audio.lexkite.com/audio/l/','https://lexkiteapp.github.io/lexkite-media-2/audio/l/','https://lexkiteapp.github.io/audio/l/'],cur;
d.addEventListener('click',function(e){var b=e.target.closest('.au');if(!b)return;if(cur){cur.pause();if(cur.btn)cur.btn.setAttribute('aria-pressed','false')}var k=b.getAttribute('data-a'),i=0,a=new Audio(L[0]+k+'.mp3');a.btn=b;cur=a;b.setAttribute('aria-pressed','true');a.onended=function(){b.setAttribute('aria-pressed','false')};a.onerror=function(){if(++i<L.length){a.src=L[i]+k+'.mp3';a.play().catch(function(){})}else b.setAttribute('aria-pressed','false')};a.play().catch(function(){})});
var q=d.getElementById('q');if(q){var o=d.getElementById('qn'),fb=q.closest('.filter'),qc=fb.querySelector('.qc'),n=function(s){return s.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/đ/g,'d').toLowerCase()},cs=[].slice.call(d.querySelectorAll('[data-k]')),gs=[].slice.call(d.querySelectorAll('.grp'));cs.forEach(function(c){c._k=n(c.getAttribute('data-k')+' '+c.textContent)});
var run=function(){var v=n(q.value.trim()),c=0;cs.forEach(function(x){var h=v&&x._k.indexOf(v)<0;x.hidden=h;if(!h)c++});gs.forEach(function(g){g.hidden=!!v&&!g.querySelector('[data-k]:not([hidden])')});o.textContent=v?(c?o.getAttribute('data-f').replace('#',c):o.getAttribute('data-n')):'';fb.classList.toggle('none',!!v&&!c);fb.classList.toggle('has-q',!!q.value);if(qc)qc.hidden=!q.value};
q.addEventListener('input',run);if(qc)qc.onclick=function(){q.value='';run();q.focus()};
q.addEventListener('keydown',function(e){if(e.key==='Escape'&&q.value){q.value='';run()}});
d.addEventListener('keydown',function(e){var t=e.target;if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)&&!t.isContentEditable){e.preventDefault();q.focus()}});if(q.value)run()}
var tfs=[].slice.call(d.querySelectorAll('.tf a'));tfs.forEach(function(a,i){a.setAttribute('role','button');a.setAttribute('aria-pressed',i===0)});
d.addEventListener('click',function(e){var f=e.target.closest&&e.target.closest('.tf a');if(!f)return;e.preventDefault();var g=f.getAttribute('data-g');tfs.forEach(function(a){a.setAttribute('aria-pressed',a===f)});[].forEach.call(d.querySelectorAll('.grp[aria-labelledby^="g-"]'),function(s){s.classList.toggle('off',!!g&&s.getAttribute('aria-labelledby')!==g)})});
var ls=function(k,v){try{return v===undefined?localStorage.getItem(k):localStorage.setItem(k,v)}catch(e){return null}};
var u=navigator.userAgent||'',now=Date.now(),lang=r.lang||'vi';
var isMob=/Mobile|Android|iPhone|iPad|iPod|CriOS|FxiOS/i.test(u);
var isStand=(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;
var isDeskChrome=/Chrome\\//.test(u)&&!isMob&&!r.getAttribute('data-lexkite-ext');
var hit=function(ev,pg){try{if(navigator.sendBeacon)navigator.sendBeacon('/api/hit',JSON.stringify({t:'q',ev:ev,lang:lang,page:pg||'vocab'}))}catch(e){}};
var xb=d.getElementById('ext')||d.querySelector('[data-ext-cta]');
if(xb){var xt=+ls('lk.extHide')||+ls('lkExtHide')||0;if(isDeskChrome&&now-xt>=6048e5){xb.hidden=false;hit('cta_addon_view',xb.getAttribute('data-ext-cta')||'vocab')}var xh=xb.querySelector('[data-ext-hide]')||xb.querySelector('button');if(xh){xh.onclick=function(){xb.hidden=true;xb.setAttribute('data-dismissed','1');ls('lk.extHide',String(now));ls('lkExtHide',String(now))}}}
var pb=d.getElementById('pwa')||d.querySelector('[data-pwa-cta]');
if(pb){var pt=+ls('lk.pwaHide')||+ls('lkPwaHide')||0;if(isMob&&!isStand&&now-pt>=6048e5){pb.hidden=false;hit('cta_pwa_view',pb.getAttribute('data-pwa-cta')||'vocab')}var ph=pb.querySelector('[data-pwa-hide]')||pb.querySelector('button');if(ph){ph.onclick=function(){pb.hidden=true;pb.setAttribute('data-dismissed','1');ls('lk.pwaHide',String(now));ls('lkPwaHide',String(now))}}}
d.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a[data-hit]');if(a){var ev=a.getAttribute('data-hit');if(ev)hit(ev,a.getAttribute('data-page')||'vocab')}});})(document);`;

export const audioBtn = (key, word, lang) => `<button type="button" class="au" data-a="${esc(key)}" aria-label="${esc(SEO_L[lang].play(word))}"></button>`;

// Thanh tìm (dính đầu màn hình khi cuộn): ô lọc (giữ chỗ sẵn → không xô lệch bố cục khi JS bật) + chip nhóm (chips, tùy chọn)
export const filterBox = (lang, chips = '') => { const t = SEO_L[lang] || SEO_L.en, f = FIND_I18N[lang] || FIND_I18N.en; return `<div class="find"><div class="filter" role="search"><label for="q" class="sr">${t.searchL}</label><span class="fi"><input id="q" type="search" placeholder="${esc(t.search)}" autocomplete="off" enterkeyhint="search"><kbd aria-hidden="true">/</kbd><button type="button" class="qc" aria-label="${esc(f[0])}" hidden>×</button></span><output id="qn" for="q" aria-live="polite" data-f="${esc(t.found('#'))}" data-n="${esc(t.none)}"></output></div>${chips}</div>`; };
// Thẻ trong lưới danh sách: tên, mô tả ngắn, chip (số từ / trình độ / kỳ thi), emoji nếu có
export const setCard = ({ href, title, desc = '', art: a = 'v-topics', chips = [], key = '', h = 'h3' }) => `<article class="card set vc" data-k="${esc(key)}"><a class="ti" href="${href}"><div class="bd"><span class="vc-top">${art(a, 56)}</span><${h} class="vc-t">${esc(title)}</${h}>${desc ? `<p class="vc-q">${esc(desc)}</p>` : ''}${chips.length ? `<span class="chips">${chips.map(c => Array.isArray(c) ? `<span class="chip ${c[1]}">${esc(c[0])}</span>` : `<span class="chip">${esc(c)}</span>`).join('')}</span>` : ''}</div></a></article>`;
// Khối CTA chính (mở đúng bộ/bài trong app, gắn data-hit nếu là topic có thật)
export const ctaBox = (href, title, btn, note = '', page = 'vocab') => {
  const m = String(href).match(/#\/topic\/([a-zA-Z0-9_-]+)/);
  const isRealTopic = m && TOPIC_IDS.has(decodeURIComponent(m[1]));
  const hitAttr = isRealTopic ? ` data-hit="cta_topic_click" data-page="${esc(page)}"` : '';
  return `<div class="cta"><p><strong>${title}</strong>${note ? `<small>${note}</small>` : ''}</p><a class="btn" href="${href}"${hitAttr}>${btn} →</a></div>`;
};
// Gợi ý add-on – chỉ hiện trên Chrome máy tính (JS bật hidden=false)
export const extBox = (lang, page = 'vocab') => {
  const t = SEO_L[lang] || SEO_L.en, sc = SMART_CTA_I18N[lang] || SMART_CTA_I18N.en;
  const h = (t.ext && t.ext[0]) || sc.extH, p = (t.ext && t.ext[1]) || sc.extP, btn = (t.ext && t.ext[2]) || sc.extBtn, hide = (t.ext && t.ext[3]) || sc.hide;
  return `<aside class="ext" id="ext" data-ext-cta="${esc(page)}" hidden><p><strong>🧩 ${esc(h)}</strong> ${esc(p)}</p><div class="cta-actions"><a class="btn" href="${EXT_STORE}" target="_blank" rel="noopener" data-hit="cta_addon_click" data-page="${esc(page)}">${esc(btn)}</a><button type="button" class="btn-hide" data-ext-hide>${esc(hide)}</button></div></aside>`;
};
// Gợi ý PWA – chỉ hiện trên Mobile chưa cài standalone
export const pwaBox = (lang, page = 'vocab') => {
  const sc = SMART_CTA_I18N[lang] || SMART_CTA_I18N.en, app = appHref(lang);
  return `<aside class="cta pwa-box" id="pwa" data-pwa-cta="${esc(page)}" hidden><p><strong>📲 ${esc(sc.pwaH)}</strong><br>${esc(sc.pwaP)}</p><div class="cta-actions"><a class="btn" href="${app}" data-hit="cta_pwa_click" data-page="${esc(page)}">${esc(sc.pwaBtn)} →</a><button type="button" class="btn-hide" data-pwa-hide>${esc(sc.hide)}</button></div></aside>`;
};

// Khung trang SEO: head (meta/canonical/hreflang/JSON-LD do builder tạo, giữ nguyên) + header + breadcrumb + nội dung + footer
// alt: [đường dẫn bản ngôn ngữ kia] → nút đổi ngôn ngữ; section: đường dẫn mục đang xem (đánh dấu aria-current)
export function seoPage({ lang, head, crumbs, body, alt, section }) {
  const t = SEO_L[lang];
  const nav = t.nav.map(([h, n]) => [h, n, h === section ? ' aria-current="page"' : '']);
  // Đổi ngôn ngữ: chính trang này (mục cuối breadcrumb) · bản vi↔en (alt, cũng là hreflang) · ngôn ngữ khác (chưa có bản dịch) → blog ngôn ngữ đó
  const self = crumbs[crumbs.length - 1][1], langHref = twinOr({ [lang]: self, ...(alt ? { [t.switchTo[1]]: alt } : {}) });
  return themePage(`<!doctype html><html lang="${lang}"><head>${head}<style>${CSS}\n${SEO_CSS}\n${VIS_CSS}</style></head><body><a class="skip" href="#nd">${t.skip}</a>
${siteHeader({ nav, open: [t.app, t.open], home: landingHref(lang), lang, langHref })}
<main id="nd">
${crumbsHtml(crumbs)}
${body}
</main>
${siteFooter({ lang, text: t.foot, tm: t.tm, langHref })}
<script>${copyJs(lang)}${UI_JS}${VIS_JS}</script></body></html>`);
}
// Thanh chuyển mục (Từ vựng · Ngữ pháp · Bài mẫu…) trên trang danh sách
export const sectionNav = (lang, cur) => `<div class="tfw"><nav class="cats" aria-label="${SEO_L[lang].sectionsL}">${SEO_L[lang].sections.map(([h, n]) => `<a href="${h}"${h === cur ? ' aria-current="page"' : ''}>${esc(n)}</a>`).join('')}</nav>${scrollBtns(lang)}</div>`;
