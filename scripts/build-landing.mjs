// Trang giới thiệu (landing) tĩnh cho 15 ngôn ngữ: / (vi) và /<lang>/ (14 ngôn ngữ còn lại) – giống duolingo.com → /learn.
// App học (SPA, hash route) nằm ở /app/ (web/app/index.html). Trang này: HTML thuần + CSS nội tuyến. Thân trang = khung Stitch v2.1 TỰ SINH
// (brand/stitch/web/home-light|dark.html + bind/home.json → brand/stitch/web/gen/home.js, đầu/chân trang chung chrome.js; CSS web/css/st-w-home.css) – ở đây chỉ dựng DỮ LIỆU thật.
// không tải JS nặng → LCP nhanh, crawl được trọn nội dung. Chỉ 2 script nội tuyến nhỏ:
//   1) #lk-route (đầu <head>, trước khi vẽ): /#/xxx (liên kết cũ) → /app/#/xxx; ?hl / ?sandbox / ?demo / ?source=pwa → app;
//      PWA cài từ trước (display-mode standalone) & người học cũ (lk.onb / lk.acct trong localStorage) → /app/,
//      trừ khi bấm "Trang giới thiệu" (?home=1 – nhớ trong phiên). KHÔNG chuyển theo IP/Accept-Language (bot thấy đúng trang).
//   2) gợi ý ngôn ngữ (cuối <body>): trình duyệt/ app dùng ngôn ngữ khác trang đang xem → dải nhỏ, đóng được (chỉ người thật, sau khi vẽ).
// Nội dung: content/landing/<lang>.json (en là gốc – khóa thiếu lấy từ en; vi viết riêng). Nhãn nhỏ dùng lại bản dịch app (web/js/i18n/<lang>.js).
// Dùng: node scripts/build-landing.mjs [--check]   (--check: không ghi, báo lỗi nếu file trong web/ chưa dựng lại – chạy trong npm test)
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { minify } from 'terser';
import { createHash } from 'node:crypto';
import { JSDOM } from 'jsdom';
import { orgNode } from './lib/authority-links.mjs'; // Organization chuẩn + sameAs kênh thật (docs/SEO-AUTHORITY.md)
import { CSS, HINT_FILE, FOOT_CSS, SEO_L, siteFooter, esc, ld, siteChrome, lswMenu, STW_VARS, LANG_NAMES, FOOT, appHref, landingHref, langSwitch, LSW_CSS, themePage, themeHead, LKT_JS, themeSwitch, themeLabels, themePill, TSW_CSS, TSP_CSS, SITE_UI, SITE_UI_LAZY, SITE_UI_JS, EXT_STORE, EXT_JS, GETAPP_JS } from './lib/site-layout.mjs';
import { render as stRender, tr as stTr, teacherIdle, IDLE_JS, compact, blocks, splitSel } from './lib/st-web.mjs'; // khung Stitch v2.1 (brand/stitch/web/home-*.html → brand/stitch/web/gen/home.js + chrome.js) + CSS biên dịch sẵn

const R = new URL('../', import.meta.url), SITE = 'https://lexkite.com';
export const LANGS = Object.keys(LANG_NAMES); // vi, en, es, pt, fr, de, id, th, zh, ja, ko, hi, ar, ru, tr
const OG_LOCALE = { vi: 'vi_VN', en: 'en_US', es: 'es_ES', pt: 'pt_BR', fr: 'fr_FR', de: 'de_DE', id: 'id_ID', th: 'th_TH', zh: 'zh_CN', ja: 'ja_JP', ko: 'ko_KR', hi: 'hi_IN', ar: 'ar_AR', ru: 'ru_RU', tr: 'tr_TR' };
const rd = p => fs.readFileSync(new URL(p, R), 'utf8');
const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
const merge = (a, b) => { const o = { ...a }; for (const [k, v] of Object.entries(b || {})) o[k] = isObj(v) && isObj(a[k]) ? merge(a[k], v) : v; return o; };
const EN = JSON.parse(rd('content/landing/en.json'));
export const copyOf = l => l === 'en' ? EN : merge(EN, JSON.parse(rd(`content/landing/${l}.json`)));
// Nhãn ngắn lấy từ bản dịch giao diện app (cùng chữ với nút trong app): Quên/Khó/Nhớ/Dễ
const dictOf = l => { if (l === 'vi') return null; const g = {}; new Function('self', rd(l === 'en' ? 'web/js/i18n/en.js' : `i18n/ui/${l}.js`))(g); return (g.I18N_DICT || {})[l] || {}; };
const EN_UI = dictOf('en');
const ui = (l, k) => l === 'vi' ? k : ((dictOf._c ||= {})[l] ||= dictOf(l))[k] || EN_UI[k] || k;

export const pageUrl = l => SITE + landingHref(l);
// ----- Script 1: định tuyến trước khi vẽ (giữ nhỏ; scripts/test/landing-routing.mjs chạy thử đúng đoạn này) -----
export const ROUTE_JS = `(function(){try{var l=location,q=new URLSearchParams(l.search),h=l.hash,s=null,d=/^#\\//.test(h);try{s=window.sessionStorage}catch(e){}
var deep=d||q.has('hl')||q.has('sandbox')||q.has('demo')||q.get('source')==='pwa';
if(q.has('r')){q.delete('r');var u=q.toString();try{history.replaceState(null,'',l.pathname+(u?'?'+u:'')+h)}catch(e){}}
if(q.get('home')==='1'){try{s&&s.setItem('lk.home','1')}catch(e){}}
if(!deep){if(q.get('home')==='1')return;try{if(s&&s.getItem('lk.home'))return}catch(e){}
var sa=!!(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true,r=null;
try{r=localStorage.getItem('lk.onb')||localStorage.getItem('lk.acct')}catch(e){}
if(!sa&&!r)return}
q.delete('source');q.delete('home');var t=q.toString();document.documentElement.style.visibility='hidden';
l.replace('/app/'+(t?'?'+t:'')+(d?h:''))}catch(e){}})();`;
// ----- Script 1b: đánh dấu Chromium máy tính (cùng điều kiện js/ext-cta.js) → CSS giữ sẵn chỗ nút "Thêm vào Chrome" (js/ext-cta.js bỏ hidden sau ~0,9 s) → CLS 0 -----
export const DC_JS = `try{var u=navigator.userAgent;/Chrome\\/\\d/.test(u)&&!/Mobile|Android|CriOS|FxiOS|EdgiOS|iPhone|iPad|SamsungBrowser|YaBrowser|wv\\)|Firefox|Version\\/[\\d.]+ Safari/.test(u)&&(document.documentElement.className='dc')}catch(e){}`;
// ----- Script 1c: điện thoại/máy tính bảng (Android, iPhone, iPad) → giữ sẵn chỗ nút "Tải app" (js/get-app.js bỏ hidden ngay khi chạy) → CLS 0 -----
export const GA_JS = `try{var v=navigator.userAgent;(/Android|iPhone|iPad|iPod/.test(v)||/Macintosh/.test(v)&&navigator.maxTouchPoints>1)&&document.documentElement.classList.add('ga')}catch(e){}`;
// Nút "Tải app" (header + chân trang) – đích theo nền tảng do js/get-app.js chọn; chữ lấy từ bản dịch app (cùng chữ với menu trong app)
const PHONE = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M12 6.5v7m-3-3 3 3 3-3M10.5 18h3"/></svg>';
const gaText = l => ({ iph: ['Cài Lexkite lên iPhone', 'Bấm nút <b>Chia sẻ</b> <span style="font-size:1.2rem">⎋</span> ở thanh dưới của Safari', 'Chọn <b>“Thêm vào MH chính”</b> (Add to Home Screen)', 'Bấm <b>Thêm</b> – biểu tượng Lexkite sẽ xuất hiện như một app'].map(k => ui(l, k)),
  crios: ['Bấm nút <b>Chia sẻ</b> <span style="font-size:1.2rem">⎋</span> ở thanh địa chỉ của Chrome'].map(k => ui(l, k)),
  ipad: ['Cài Lexkite lên iPad', 'Bấm nút <b>Chia sẻ</b> <span style="font-size:1.2rem">⎋</span> trên thanh trên cùng của Safari'].map(k => ui(l, k)),
  mac: ['Cài Lexkite lên Mac', 'Trong Safari, chọn <b>Tệp › Thêm vào Dock</b>', 'Bấm <b>Thêm</b> – Lexkite sẽ mở như một app'].map(k => ui(l, k)), ok: ui(l, 'Đã hiểu') });
// Chữ hướng dẫn cài (iPhone/iPad/Mac) → web/js/get-app/<lang>.json, js/get-app.js chỉ nạp khi mở hướng dẫn (giữ landing ≤ 16 KB gzip)
export const gaFile = l => `/js/get-app/${l}.json`;
export const gaJson = l => JSON.stringify(gaText(l)) + '\n';
// Nút mang lớp thành phần Stitch (btn-3d-secondary của mẫu home) – đầu trang máy tính/điện thoại (chỉ icon, 44 px) + chân trang
// lớp = đúng nút "Get the app" của khung Stitch v3 TỰ SINH (brand/stitch/web/gen/home.js) – không chép tay màu (brand-check)
const GA_V3 = (rd('brand/stitch/web/gen/home.js').match(/<a href="\$\{e\(d\.appQ\)\}" class="([^"]+)" data-get-app/) || [])[1].replace(/\bgap-\d\b/, '') + ' gap-2';
const GA_CLS = { foot: GA_V3 + ' mt-4' }; // chân trang: đúng lớp nút "Get the app" của mẫu landing v3 (hero dùng chính nút Stitch, bind/home.json)
const gaBtn = (l, place, appQ, web, look = place) => `<a class="${GA_CLS[look]}" href="${appQ}" data-get-app="${place}"${web ? ` data-web="${appQ}"` : ` aria-label="${esc(ui(l, 'Tải app'))}"`} hidden>${PHONE}${look === 'icon' ? '' : `<span>${esc(ui(l, 'Tải app'))}</span>`}</a>`;
// ----- Script 2: gợi ý trang đúng ngôn ngữ (chỉ người dùng thật, đóng được, nhớ lựa chọn) -----
const SUG = Object.fromEntries(LANGS.map(l => [l, copyOf(l).suggest]));
// Gói chữ bỏ chính ngôn ngữ của trang (n===P không bao giờ hiện gợi ý) và URL suy từ mã (= landingHref) → nhẹ hơn, cùng hành vi
// Dải gợi ý ngôn ngữ: mã nằm trong js/site-ui.js (site-layout HINT_JS), chữ 15 ngôn ngữ → web/js/lhint.json (HINT_FILE); trang chỉ cần <body data-lhint="lhint btn tsp tsb"> (giá trị = tên lớp để purgeCss giữ luật .lhint: lớp do JS ngoài thêm)

// Nút giao diện đầu trang = nút Stitch mang data-tsw (TSW_JS của PR 303 đổi trạng thái): chỉ lấy luật chọn nhóm biểu tượng ◐/☀/☾ của TSW_CSS (không lấy viền/nền .tsw → giữ hình Stitch)
const TSW_ICON = (TSW_CSS.match(/\.tsw svg>\*\{[^}]*\}[^{]*\{display:inline\}/) || [''])[0].replace(/\.tsw /g, '[data-tsw] ') + '[data-tsw] svg{width:20px;height:20px}[data-tsw]{flex:none;min-width:44px;min-height:44px}'; // flex:none: đầu trang ru/de chữ dài → nút bị co < 44 px (visual-qa tap<44 05/11)
// ----- CSS riêng của landing (chỉ phần mẫu Stitch không vẽ: giữ chỗ nút add-on/Tải app chống CLS, link bỏ qua, dải gợi ý ngôn ngữ, menu đổi ngôn ngữ) -----
// Màu = token Stitch (--st-*, cùng nguồn brand/stitch/tokens.dtcg.json, tự đổi sáng/tối) → biến dùng chung của khối lsw/lhint.
const LCSS = `[hidden]{display:none!important}.dc [data-ext-cta][hidden]{display:inline-flex!important;visibility:hidden}.dc [data-get-app][hidden]:not([data-off]),.ga [data-get-app][hidden]:not([data-off]){display:inline-flex!important;visibility:hidden}
${STW_VARS}
[data-get-app] svg{flex:none}.skip{position:absolute;left:8px;top:-60px;background:var(--surface);color:var(--text);padding:8px 12px;z-index:60;min-height:44px;display:inline-flex;align-items:center}.skip:focus{top:8px}[dir=rtl] .skip:not(:focus){left:auto;right:-999px}[dir=rtl] .skip:focus{left:auto;right:8px}
.lhint{position:fixed;left:12px;right:12px;bottom:12px;z-index:60;max-width:640px;margin:0 auto;display:flex;align-items:center;gap:12px;background:var(--surface);color:var(--text);border:2px solid var(--line);border-radius:14px;box-shadow:0 12px 30px rgba(15,61,62,.18);padding:10px 12px 10px 16px;font-size:15px}.lhint span{flex:1}.lhint .btn{display:inline-flex;align-items:center;min-height:44px;padding:0 14px;border-radius:999px;background:var(--primary);color:rgb(var(--st-surface));font-weight:800;font-size:14px;white-space:nowrap;text-decoration:none}.lhint button{font:inherit;background:none;border:0;font-size:22px;line-height:1;color:var(--muted);cursor:pointer;padding:4px 8px;min-width:44px;min-height:44px}
${LSW_CSS}.lsw-m{z-index:60}
${TSW_ICON}${TSP_CSS}summary::-webkit-details-marker{display:none}`;

// ----- Bỏ CSS không dùng: khung chung (site-layout CSS) phục vụ cả trang SEO/blog; landing chỉ giữ luật có lớp/id/thẻ xuất hiện trong trang
// (kể cả trong script nội tuyến – lớp do JS thêm như .lhint, .dc, .ga, lsw vẫn được giữ) → landing ≤ 16 KB gzip (scripts/test/landing-routing.mjs)
const cssBlocks = s => { const out = []; let d = 0, st = 0; for (let i = 0; i < s.length; i++) { if (s[i] === '/' && s[i + 1] === '*') { i = s.indexOf('*/', i + 2) + 1; continue; } if (s[i] === '{') d++; else if (s[i] === '}' && --d === 0) { out.push(s.slice(st, i + 1)); st = i + 1; } } return out; };
export function purgeCss(css, page) {
  const has = new Map(), word = w => has.has(w) ? has.get(w) : has.set(w, new RegExp(`(?<![\\w-])${w.replace(/[-]/g, '\\-')}(?![\\w-])`).test(page)).get(w);
  const used = sel => { const x = sel.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').replace(/::?[\w-]+/g, '');
    return (x.match(/[.#][A-Za-z_][\w-]*/g) || []).every(t => word(t.slice(1))) && [...x.matchAll(/(?:^|[\s>+~])([a-z][a-z0-9]*)/g)].every(([, t]) => t === 'html' || t === 'body' || page.includes('<' + t + ' ') || page.includes('<' + t + '>')); };
  return cssBlocks(css).map(b => { b = b.replace(/\/\*[\s\S]*?\*\//g, '').trim(); const j = b.indexOf('{'), sel = b.slice(0, j).trim();
    if (/^@(media|supports)/.test(sel)) { const inner = purgeCss(b.slice(j + 1, -1), page); return inner ? sel + '{' + inner + '}' : ''; }
    if (sel.startsWith('@')) return b;
    const keep = sel.split(',').filter(used); return keep.length ? keep.join(',') + b.slice(j) : ''; }).join('');
}
// Khung Stitch: CSS biên dịch cho cả nhóm trang → compact() (scripts/lib/st-web.mjs) chỉ giữ luật trang dùng, bỏ nhánh data-theme (trang tĩnh theo
// prefers-color-scheme), bỏ biến --st-* thừa và đổi tên lớp Tailwind dài thành tên ngắn – không đổi hình, giữ landing ≤ 16 KB gzip.
function renderPurged(lang) { return compact(themePage(renderFull(lang))); } // themePage (PR 303): chống nháy + luật màu theo nút giao diện → compact giữ nhánh [data-theme]
// ----- Thu gọn JS nội tuyến (terser: bỏ khoảng trắng/chú thích, đổi tên biến cục bộ – không đổi hành vi) sau khi đã lọc CSS (lọc CSS đọc tên lớp trong script
// từ bản gốc). 27/10: ru 16489 B gzip trên Node 22 > 16384 → còn ≈ 16 000 B, không cắt nội dung/tính năng, không nâng ngân sách.
// render() giữ đồng bộ: mọi đoạn script của 15 trang được thu gọn sẵn một lần lúc nạp module (await cấp cao nhất, xem MINI bên dưới).
const SCRIPT = /(<script(?: id="[\w-]+")?>)([\s\S]*?)(<\/script>)/g, MINI = new Map();
const renderInline = lang => renderPurged(lang).replace(SCRIPT, (all, a, code, b) => MINI.has(code) ? a + MINI.get(code) + b : all);

// ----- Tách khỏi HTML (giữ landing ≤ 16 KB gzip, không cắt nội dung) -----
//   JS: mọi <script> nội tuyến trong <body> (menu ngôn ngữ + menu điện thoại, gợi ý ngôn ngữ, nút add-on, Tải app) → MỘT file cùng gốc /js/site.js
//     (<script defer>, ?v=<hash nội dung> → cache dài). Đoạn script giống hệt nhau ở 15 trang (ngôn ngữ trang đọc từ <html lang>) → build kiểm tra bằng nhau.
//     #lk-route / #lk-dc vẫn nội tuyến đầu <head> (phải chạy trước khi vẽ).
//   CSS: <style> chỉ giữ CSS TỚI HẠN = luật khớp (bộ chọn, jsdom) một phần tử nằm trong vùng đầu trang: mọi thứ đứng trước/thuộc <section> đầu tiên
//     (link bỏ qua + đầu trang chung + hero) và tổ tiên của nó (html/body/khung), ở mọi @media (390 lẫn 1280, sáng lẫn tối), cùng @font-face/@property
//     và @keyframes được CSS tới hạn dùng. Lớp do #lk-dc gắn lên <html> trước khi vẽ (dc/ga) coi như có. Bộ chọn trạng thái (:hover, ::before…) bỏ phần
//     giả lớp khi so; bộ chọn jsdom không hiểu → coi là tới hạn (an toàn).
//     Phần còn lại nạp không chặn: /css/home-<lang>.css (media="print" data-swap, site.js đổi sang "all" khi tải xong; <noscript> có bản thường).
//     File ngoài = TOÀN BỘ CSS của trang theo đúng thứ tự gốc (không chỉ phần dư) → thứ tự cascade y hệt bản nội tuyến cũ dù 2 khối bị tách.
//     Mỗi ngôn ngữ một file vì compact() đổi tên lớp theo tần suất trong từng trang (tên ngắn khác nhau giữa các ngôn ngữ) – mỗi trang chỉ cần file của mình.
const h8 = s => createHash('sha256').update(s).digest('hex').slice(0, 8);
export const cssFile = l => `/css/home-${l}.css`;
export const SITE_JS_FILE = '/js/site.js';
const SWAP_JS = `document.querySelectorAll('link[data-swap]').forEach(function(l){function s(){l.media='all'}l.sheet?s():l.addEventListener('load',s)});`;
const HEAD_CLS = [...(DC_JS + GA_JS).matchAll(/(?:className=|classList\.add\()'([\w-]+)'/g)].map(x => x[1]); // lớp #lk-dc gắn trước khi vẽ
const PSEUDO_EL = /::?(?:before|after|first-line|first-letter)\b|::[\w-]+(?:\([^)]*\))?/g;
const PSEUDO_DYN = /:(?:hover|focus(?:-visible|-within)?|active|visited|link|any-link|checked|disabled|enabled|placeholder-shown|target|open|popover-open|invalid|valid|required|optional|autofill|-webkit-autofill|indeterminate|default|read-only|read-write|user-invalid|user-valid)(?![\w-])/g;
// Luật chỉ có tác dụng khi người dùng tương tác (rê/chạm/focus) không ảnh hưởng lần vẽ đầu → để ở CSS đầy đủ (nạp ngay sau), không nhân đôi trong CSS tới hạn
const INTERACT = /:(?:hover|active|focus|focus-visible|focus-within|visited)(?![\w-])/;
const LAYOUT = /^(display|grid(-[\w-]+)?|gap|row-gap|column-gap|flex(-[\w-]+)?|order|(min-|max-)?(width|height)|aspect-ratio|margin(-[\w-]+)?|padding(-[\w-]+)?|(align|justify|place)-[\w-]+|font-size|line-height|letter-spacing|white-space|box-sizing|border(-(top|right|bottom|left))?-width)$/;
export function criticalCss(css, html) {
  const doc = new JSDOM(html.replace(/<script[^>]*>[\s\S]*?<\/script>/g, '')).window.document;
  doc.documentElement.classList.add(...HEAD_CLS);
  // vùng đầu trang = tới hết section thứ 2 (hero + dải tin cậy hiện trọn ở 1280×900 của mẫu v3) – CSS tới muộn cho phần đã hiện = CLS (CI 3/11: 0,12–0,18)
  const S = doc.querySelectorAll('section'), first = S[Math.min(1, S.length - 1)], crit = new Set();
  for (const e of doc.querySelectorAll('*')) if (e === first || first.contains(e) || e.contains(first) || (e.compareDocumentPosition(first) & 4)) crit.add(e);
  // + section thứ 3 chỉ lấy THUỘC TÍNH BỐ CỤC (lưới/khoảng cách/cỡ chữ): ở 1440×900 bản chữ ngắn (es) lưới tính năng lọt màn đầu → lưới tới muộn = CLS 0,395 (visual-qa 05/11);
  //   phần trang trí (màu/bóng/bo góc) vẫn tới muộn – không xê dịch, giữ CSS nội tuyến dưới trần 16 KB gz của trang giới thiệu
  const third = S[2], lay = new Set(third ? [third, ...third.querySelectorAll('*')].filter(e => !crit.has(e)) : []);
  const memo = new Map(), hit = sel => { if (memo.has(sel)) return memo.get(sel);
    let q = sel.replace(/:root(?::not\(\[data-theme=\w+\]\)|\[data-theme=\w+\])/g, ':root').replace(PSEUDO_EL, '').replace(PSEUDO_DYN, '') /* nhánh nút giao diện (PR 303): trang lúc build không có data-theme → so như :root, kẻo vẽ đầu sai nền khi ép tối/sáng */.replace(/:not\(\s*\)/g, '').trim(); if (!q || /[>+~]$/.test(q)) q += '*';
    let r; try { const all = [...doc.querySelectorAll(q)]; r = all.some(e => crit.has(e)) ? true : all.some(e => lay.has(e)) ? 'lay' : false; } catch { r = true; }
    memo.set(sel, r); return r; };
  const pick = c => blocks(c).map(b => { const j = b.indexOf('{'), sel = b.slice(0, j).trim();
    if (/^@(media|supports|layer|container)/.test(sel)) { const inner = pick(b.slice(j + 1, -1)); return inner ? sel + '{' + inner + '}' : ''; }
    if (sel.startsWith('@')) return /^@(-\w+-)?keyframes/.test(sel) ? '\u0001' + b : b;
    const ss = splitSel(sel).filter(x => !INTERACT.test(x)), k = ss.filter(x => hit(x) === true), l = ss.filter(x => hit(x) === 'lay');
    const lb = l.length ? b.slice(j + 1, -1).split(';').filter(d => LAYOUT.test(d.split(':')[0].trim())).join(';') : '';
    return (k.length ? k.join(',') + b.slice(j) : '') + (lb ? l.join(',') + '{' + lb + '}' : ''); }).join('');
  const out = pick(css);
  const anim = new Set([...out.matchAll(/animation(?:-name)?:([^;}]+)/g)].flatMap(x => x[1].split(/[\s,]+/)));
  return out.replace(/\u0001(@(?:-\w+-)?keyframes\s+([\w-]+)\s*\{(?:[^{}]|\{[^{}]*\})*\})/g, (_, b, name) => anim.has(name) ? b : '');
}
const BUILT = new Map();
function build(lang) {
  if (BUILT.has(lang)) return BUILT.get(lang);
  const full = renderInline(lang), at = full.indexOf('<body'), js = [];
  const body = full.slice(at).replace(/<script>([\s\S]*?)<\/script>\n?/g, (_, c) => { js.push(c); return ''; });
  const head = full.slice(0, at), m = head.match(/<style>([\s\S]*?)<\/style>/), css = m[1] + '\n';
  const crit = criticalCss(m[1], head + body), href = `${cssFile(lang)}?v=${h8(css)}`;
  const r = { head, body, css, crit, href, js: [SWAP_JS, ...js].join('\n') + '\n' };
  BUILT.set(lang, r); return r;
}
// /js/site.js: dựng từ trang en; build (ghi lẫn --check) xác nhận 15 trang tách ra đúng cùng đoạn này
export const siteJs = () => build('en').js;
export const siteCss = l => build(l).css;
export function render(lang) {
  const { head, body, crit, href } = build(lang), js = `${SITE_JS_FILE}?v=${h8(siteJs())}`;
  return head.replace(/<style>[\s\S]*?<\/style>/, () => `<style>${crit}</style>
<link rel="stylesheet" href="${href}" media="print" data-swap><noscript><link rel="stylesheet" href="${href}"></noscript>
<script defer src="${js}"></script>`) + body;
}
function renderFull(lang) {
  const c = copyOf(lang), rtl = lang === 'ar', url = pageUrl(lang), app = appHref(lang);
  const appQ = `/app/?hl=${lang}`, start = `${appQ}#/welcome/setup`, login = `${appQ}#/welcome/login`;
  const vi = lang === 'vi', vocab = vi ? '/tu-vung/' : '/en/vocabulary/', samples = vi ? '/samples/' : '/en/samples/', blog = `/${lang}/blog/`;
  const alt = LANGS.map(l => `<link rel="alternate" hreflang="${l}" href="${pageUrl(l)}">`).join('\n') + `\n<link rel="alternate" hreflang="x-default" href="${SITE}/">`;
  // ---- dữ liệu THẬT cho khung Stitch (biểu thức trong brand/stitch/web/bind/home.json; chữ thô – khung tự escape) ----
  const hlEn = vi ? 'vi' : 'en'; // trang Từ vựng/Bài mẫu chỉ có bản vi + en → hreflang đúng ngôn ngữ đích
  const chrome0 = siteChrome({ lang, nav: [[app, c.nav.app, lang], [blog, c.nav.blog, lang], [vocab, c.nav.vocab, hlEn], [samples, c.nav.samples, hlEn]],
    open: [start, c.nav.start], signin: [login, c.nav.login], home: landingHref(lang),
    langHref: landingHref, label: c.langL, text: c.foot, tm: c.tm, getApp: gaBtn(lang, 'foot', appQ, true) });
  // đầu trang v3: nút 🌐 hiện tên ngôn ngữ; chân trang v3: nút "Interface" mở menu ngôn ngữ thứ hai (cùng 15 liên kết hreflang, id riêng)
  // nút giao diện (PR 303, một nguồn với app 'lk.theme'): nút Stitch đầu trang mang data-tsw + nhãn 15 ngôn ngữ; chân trang: viên Tự động/Sáng/Tối themePill
  const TL = themeLabels(chrome0.lang), tsw = themeSwitch(chrome0.lang);
  const chrome = { ...chrome0, langName: LANG_NAMES[chrome0.lang], menu2: lswMenu({ lang, langHref: landingHref, label: chrome0.langLabel, id: 'lsw-m2' }),
    tswL: TL.join('|'), tswA: `${TL[3]}: ${TL[0]}`, tswSvg: tsw.slice(tsw.indexOf('<svg'), tsw.lastIndexOf('</button>')), pill: themePill(chrome0.lang) };
  const resCol = chrome.cols[1].items, find = re => resCol.find(([u]) => re.test(u));
  const third = (vi ? find(/^\/ngu-phap\//) : find(/\/words\/$/)) || resCol[4]; // thẻ thứ 3: Ngữ pháp (vi) / Từ điển (/<lang>/words/)
  const more = ui(lang, 'Xem thêm');
  // 5 thẻ tài nguyên (giữ mọi liên kết cũ cho SEO) theo 3 khuôn của mẫu v3: blog (sách) · doc (tài liệu) · list (danh sách)
  const rescards = [
    { v: 'blog', href: blog, hl: lang, h: c.res.blog[0], p: c.res.blog[1], more },
    { v: 'doc', href: samples, hl: hlEn, h: c.res.samples[0], p: c.res.samples[1], more },
    { v: 'list', href: vocab, hl: hlEn, h: c.res.vocab[0], p: c.res.vocab[1], more },
    { v: 'doc', href: vi ? '/speaking/' : '/en/speaking/', hl: hlEn, h: (FOOT[lang] || FOOT.en)[8], p: '', more },
    { v: 'list', href: third[0], hl: /^\/[a-z]{2}\//.test(third[0]) ? third[0].slice(1, 3) : 'vi', h: third[1], p: '', more }];
  // 6 tính năng: 4 thẻ có minh hoạ của mẫu (FSRS · gọi giáo viên AI = chấm nói/viết · luyện thi · add-on) + 2 thẻ trơn cùng khuôn
  const F = c.features, feat = [['fsrs', 0], ['call', 2], ['exam', 1], ['ext', 3], ['plain', 4], ['plain', 5]].map(([v, i]) => ({ v, h: F[i][1], p: F[i][2] }));
  const d = { ...c, start, login, appQ, heroLinks: [[login, ui(lang, 'Tôi đã có tài khoản')], [`${appQ}#/placement`, c.hero.placement]], store: EXT_STORE, getAppL: ui(lang, 'Tải app'), feat, rescards,
    // giáo viên 2D (Chars.idle – PR 480): ảnh poster mắt mở giữ chỗ (width/height → CLS 0) + vòng nghỉ 1–3 s tắt tiếng, chỉ chạy khi không bật giảm chuyển động
    ama: teacherIdle('ama', { w: 260, cls: 'relative z-10 -mb-5 w-[220px] sm:w-[260px] h-auto', eager: true }),
    carlos: teacherIdle('carlos', { w: 240, cls: 'relative z-10 -mb-5 w-[200px] sm:w-[240px] h-auto' }) };
  const page = stRender('home', d, { lang, chrome });
  const faqLd = { '@type': 'FAQPage', mainEntity: c.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
  const graph = { '@context': 'https://schema.org', '@graph': [
    orgNode(),
    { '@type': 'WebSite', '@id': `${SITE}/#website`, name: 'Lexkite', url: `${SITE}/`, inLanguage: LANGS, publisher: { '@id': `${SITE}/#org` } },
    { '@type': 'WebPage', '@id': `${url}#page`, url, name: c.title, description: c.description, inLanguage: lang, isPartOf: { '@id': `${SITE}/#website` }, about: { '@id': `${SITE}/#app` } },
    { '@type': 'WebApplication', '@id': `${SITE}/#app`, name: 'Lexkite', url: `${SITE}/app/`, applicationCategory: 'EducationalApplication', operatingSystem: 'Web browser, Chrome', browserRequirements: 'Requires JavaScript. Works in modern browsers.', isAccessibleForFree: true, inLanguage: LANGS, image: `${SITE}/og-default.png`, featureList: c.features.map(f => f[1]), offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, publisher: { '@id': `${SITE}/#org` } },
    faqLd] };
  return `<!doctype html>
<html lang="${lang}"${rtl ? ' dir="rtl"' : ''}>
<head>
<meta charset="utf-8">
<script id="lk-route">${ROUTE_JS}</script>
<script id="lk-dc">${DC_JS}${GA_JS}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="google-adsense-account" content="ca-pub-2290668854727752">
<title>${esc(c.title)}</title>
<meta name="description" content="${esc(c.description)}">
<link rel="canonical" href="${url}">
${alt}
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="website"><meta property="og:site_name" content="Lexkite"><meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(c.ogTitle || c.title)}"><meta property="og:description" content="${esc(c.ogDescription || c.description)}">
<meta property="og:image" content="${SITE}/og-default.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(c.ogTitle || c.title)}">
<meta property="og:locale" content="${OG_LOCALE[lang]}">${LANGS.filter(l => l !== lang).map(l => `<meta property="og:locale:alternate" content="${OG_LOCALE[l]}">`).join('')}
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(c.ogTitle || c.title)}"><meta name="twitter:image" content="${SITE}/og-default.png">
<meta name="theme-color" content="#0F3D3E">
<link rel="icon" href="/icons/icon.svg?v=3" type="image/svg+xml"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png?v=3">
<style>${page.css}
${LCSS}</style>
${ld(graph)}
</head>
<body class="stw st" data-lhint="lhint btn tsp tsb">
<a class="skip" href="#main">${esc(c.skip)}</a>
${page.body}
<script>${SITE_UI_LAZY.replace(/^<script>|<\/script>$/g, '')}</script>
<script>${IDLE_JS}</script>
<script>${EXT_JS}
self.LK_GETAPP_T='${gaFile("'+document.documentElement.lang+'")}';
${GETAPP_JS}</script>
</body>
</html>
`;
}

export const fileOf = l => `web/${l}/index.html`;
// "/" tĩnh (web/index.html): trang chọn ngôn ngữ, x-default. Bình thường functions/index.js 302 trước khi tới đây; dùng khi gỡ "/" khỏi web/_routes.json (công tắc tắt) hoặc xem qua máy chủ tĩnh.
// Bảng nước → ngôn ngữ: GEO trong web/js/i18n.js là nguồn duy nhất; functions/api/_geo.gen.js sinh từ đó (Pages Function không nạp được script cổ điển), --check báo cũ.
export const geoGen = () => { const m = /const GEO = (\{[^}]+\});/.exec(rd('web/js/i18n.js')); if (!m) throw new Error('build-landing: không thấy GEO trong web/js/i18n.js'); return `/* SINH TỰ ĐỘNG từ GEO trong web/js/i18n.js – sửa ở đó rồi chạy node scripts/build-landing.mjs */\nexport const GEO = ${m[1]};\n`; };
export const renderRoot = () => themePage(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lexkite – choose your language</title><meta name="description" content="Lexkite is a free English learning app: vocabulary, grammar, IELTS and TOEIC practice. Choose your language to start.">
<meta name="google-adsense-account" content="ca-pub-2290668854727752"><link rel="canonical" href="${SITE}/"><meta property="og:type" content="website"><meta property="og:site_name" content="Lexkite"><meta property="og:url" content="${SITE}/"><meta property="og:title" content="Lexkite – choose your language"><meta property="og:description" content="Lexkite is a free English learning app: vocabulary, grammar, IELTS and TOEIC practice. Choose your language to start."><meta property="og:image" content="${SITE}/og-default.png">
${LANGS.map(l => `<link rel="alternate" hreflang="${l}" href="${pageUrl(l)}">`).join('\n')}
<link rel="alternate" hreflang="x-default" href="${SITE}/">
<link rel="icon" href="/icons/icon.svg?v=2" type="image/svg+xml"><script id="lk-route">${ROUTE_JS}</script>
<style>${CSS}
body{margin:0}main{max-width:40rem;margin:0 auto;padding:2.5rem 1rem}h1{font-size:1.6rem;margin:0 0 1rem}ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(10rem,1fr));gap:.5rem}a{display:flex;align-items:center;min-height:44px;padding:0 .8rem;border:1px solid var(--line);border-radius:10px;color:inherit;text-decoration:none}.tsw{font:inherit}</style></head>
<body><main><h1>Lexkite – choose your language</h1><ul>${LANGS.map(l => `<li><a href="${landingHref(l)}" lang="${l}" hreflang="${l}"${l === 'ar' ? ' dir="rtl"' : ''}>${LANG_NAMES[l]}</a></li>`).join('')}</ul><p>© Lexkite</p></main>${themeSwitch('en')}${SITE_UI}</body></html>
`);
// Trang 404 (web/404.html, viết tay, song ngữ vi/en): chèn nút đổi ngôn ngữ góc trên (→ trang chủ từng ngôn ngữ) vào giữa <!--lsw--><!--/lsw-->.
// Trang dùng token màu riêng (--card/--fg/--coral) → ánh xạ sang token của khối lsw dùng chung.
// Chân trang chung (siteFooter vi + Privacy/Terms tiếng Anh như chân trang mini cũ) giữa <!--foot--><!--/foot-->; token riêng của 404 → token chân trang
const FOOT404 = () => `<!--foot--><style>${FOOT_CSS}.site-foot{align-self:stretch;margin:40px -16px -24px;--surface:var(--card);--text:var(--fg);--muted:var(--mut);--primary:var(--coral)}</style>${siteFooter({ lang: 'vi', text: SEO_L.vi.foot, tm: SEO_L.vi.tm, langHref: landingHref, coExtra: [['/en/privacy', 'Privacy', ' lang="en"'], ['/en/terms', 'Terms', ' lang="en"']] }).replace(SITE_UI, '')}<!--/foot-->`;
export const render404 = html => themePage(html).replace(/<!--foot-->[\s\S]*?<!--\/foot-->/, FOOT404).replace(/<!--lsw-->[\s\S]*?<!--\/lsw-->/, () => `<!--lsw--><style>.top{position:absolute;top:12px;inset-inline-end:16px;--surface:var(--card);--text:var(--fg);--primary:var(--coral);--accent-soft:var(--line)}.top{display:flex;gap:8px}.top .lsw-m{display:block}${LSW_CSS}${TSW_CSS}</style>
  <div class="top">${themeSwitch('vi')}${langSwitch({ lang: 'vi', label: 'Ngôn ngữ · Language' })}</div>${SITE_UI}<!--/lsw-->`);
for (const l of LANGS) for (const [, , code] of renderPurged(l).matchAll(SCRIPT)) {
  if (MINI.has(code) || !code.trim()) continue;
  const r = await minify(code, { compress: { passes: 2 }, mangle: true, format: { comments: false } }); // không ép ascii: giữ chữ UTF-8 (gợi ý 15 ngôn ngữ)
  MINI.set(code, r.code.replace(/<\/(script)/gi, '<\\/$1')); // không để chuỗi "</script" kết thúc thẻ sớm
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file://').href) {
  const check = process.argv.includes('--check'), stale = [];
  for (const l of LANGS) {
    const html = render(l), f = new URL(fileOf(l), R);
    if (check) { if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== html) stale.push(fileOf(l)); continue; }
    fs.mkdirSync(new URL('.', f), { recursive: true }); fs.writeFileSync(f, html);
  }
  for (const [n, txt] of [['web/index.html', renderRoot()], ['functions/api/_geo.gen.js', geoGen()]]) { const f = new URL(n, R); if (check) { if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== txt) stale.push(n); } else fs.writeFileSync(f, txt); }
  for (const l of LANGS) { // chữ hướng dẫn "Tải app" theo ngôn ngữ
    const f = new URL('web' + gaFile(l), R), j = gaJson(l);
    if (check) { if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== j) stale.push('web' + gaFile(l)); continue; }
    fs.mkdirSync(new URL('.', f), { recursive: true }); fs.writeFileSync(f, j);
  }
  for (const l of LANGS) if (build(l).js !== siteJs()) { console.error(`✗ build-landing: script trang ${fileOf(l)} khác /js/site.js (đoạn script phải chung cho 15 ngôn ngữ)`); process.exit(1); }
  for (const [p, txt] of [[SITE_JS_FILE, siteJs()], ...LANGS.map(l => [cssFile(l), siteCss(l)])]) { // file tách ra (site.js chung + CSS đầy đủ từng ngôn ngữ)
    const f = new URL('web' + p, R);
    if (check) { if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== txt) stale.push('web' + p); continue; }
    fs.writeFileSync(f, txt);
  }
  { const f = new URL('web' + HINT_FILE, R), j = JSON.stringify(SUG) + '\n'; if (check) { if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== j) stale.push('web' + HINT_FILE); } else fs.writeFileSync(f, j); }
  // App /app/: CÙNG chống nháy + theme-color với trang ngoài (một nguồn site-layout THEME_HEAD/THEME_META); add-on dùng bản file web/js/lkt.js (MV3 cấm nội tuyến)
  { const f = new URL('web/app/index.html', R), cur = fs.readFileSync(f, 'utf8'), html = themeHead(cur); if (check) { if (html !== cur) stale.push('web/app/index.html'); } else if (html !== cur) fs.writeFileSync(f, html); }
  { const f = new URL('web/js/lkt.js', R), j = LKT_JS(); if (check) { if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== j) stale.push('web/js/lkt.js'); } else fs.writeFileSync(f, j); }
  { const f = new URL('web/js/site-ui.js', R), j = SITE_UI_JS(); if (check) { if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== j) stale.push('web/js/site-ui.js'); } else fs.writeFileSync(f, j); } // JS dùng chung trang tĩnh (site-layout SITE_UI)
  for (const n of ['bye', 'blog-lang']) { const f = new URL(`web/${n}.html`, R), cur = fs.readFileSync(f, 'utf8'), html = themePage(cur); if (check) { if (html !== cur) stale.push(`web/${n}.html`); } else if (html !== cur) fs.writeFileSync(f, html); } // trang viết tay: chống nháy bản mới
  { const f = new URL('web/404.html', R), cur = fs.readFileSync(f, 'utf8'), html = render404(cur); if (check) { if (html !== cur) stale.push('web/404.html'); } else fs.writeFileSync(f, html); }
  if (stale.length && !process.env.CI) { // cục bộ (npm test): tự dựng lại cho khỏi dừng giữa chừng; trên CI (CI=true) vẫn nghiêm ngặt
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { stdio: 'inherit' });
    if (r.status) process.exit(r.status);
    console.warn(`! build-landing: ${stale.length} trang chưa dựng lại → đã dựng lại cục bộ, nhớ commit web/ (CI sẽ đỏ nếu quên)`); process.exit(0);
  }
  if (stale.length) { console.error(`✗ build-landing: ${stale.length} trang giới thiệu chưa dựng lại (${stale.slice(0, 4).join(', ')}…) → node scripts/build-landing.mjs`); process.exit(1); }
  console.log(`✓ build-landing: ${LANGS.length} trang giới thiệu ${check ? 'khớp nguồn' : 'đã dựng'} (/ + /<lang>/)` + (check ? '' : ` · ${(Buffer.byteLength(render('vi')) / 1024).toFixed(1)} KB/trang`));
}
