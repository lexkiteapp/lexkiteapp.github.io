// Trang giới thiệu (landing) tĩnh cho 15 ngôn ngữ: / (vi) và /<lang>/ (14 ngôn ngữ còn lại) – giống duolingo.com → /learn.
// App học (SPA, hash route) nằm ở /app/ (web/app/index.html). Trang này: HTML thuần + CSS nội tuyến. Thân trang = khung Stitch v2.1 TỰ SINH
// (brand/stitch/web/home-light|dark.html + bind/home.json → web/js/st/web/home.js, đầu/chân trang chung chrome.js; CSS web/css/st-w-home.css) – ở đây chỉ dựng DỮ LIỆU thật.
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
import { orgNode } from './lib/authority-links.mjs'; // Organization chuẩn + sameAs kênh thật (docs/SEO-AUTHORITY.md)
import { esc, ld, siteChrome, STW_VARS, LANG_NAMES, FOOT, appHref, landingHref, langSwitch, LSW_CSS, LSW_JS, EXT_STORE, EXT_JS, GETAPP_JS } from './lib/site-layout.mjs';
import { render as stRender, teacher, compact } from './lib/st-web.mjs'; // khung Stitch v2.1 (brand/stitch/web/home-*.html → web/js/st/web/home.js + chrome.js) + CSS biên dịch sẵn

const R = new URL('../', import.meta.url), SITE = 'https://lexkite.com';
export const LANGS = Object.keys(LANG_NAMES); // vi, en, es, pt, fr, de, id, th, zh, ja, ko, hi, ar, ru, tr
const OG_LOCALE = { vi: 'vi_VN', en: 'en_US', es: 'es_ES', pt: 'pt_BR', fr: 'fr_FR', de: 'de_DE', id: 'id_ID', th: 'th_TH', zh: 'zh_CN', ja: 'ja_JP', ko: 'ko_KR', hi: 'hi_IN', ar: 'ar_AR', ru: 'ru_RU', tr: 'tr_TR' };
const rd = p => fs.readFileSync(new URL(p, R), 'utf8');
const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
const merge = (a, b) => { const o = { ...a }; for (const [k, v] of Object.entries(b || {})) o[k] = isObj(v) && isObj(a[k]) ? merge(a[k], v) : v; return o; };
const EN = JSON.parse(rd('content/landing/en.json'));
export const copyOf = l => l === 'en' ? EN : merge(EN, JSON.parse(rd(`content/landing/${l}.json`)));
// Nhãn ngắn lấy từ bản dịch giao diện app (cùng chữ với nút trong app): Quên/Khó/Nhớ/Dễ
const dictOf = l => { if (l === 'vi') return null; const g = {}; new Function('self', rd(`web/js/i18n/${l}.js`))(g); return (g.I18N_DICT || {})[l] || {}; };
const EN_UI = dictOf('en');
const ui = (l, k) => l === 'vi' ? k : ((dictOf._c ||= {})[l] ||= dictOf(l))[k] || EN_UI[k] || k;

export const pageUrl = l => SITE + landingHref(l);
// ----- Script 1: định tuyến trước khi vẽ (giữ nhỏ; scripts/test/landing-routing.mjs chạy thử đúng đoạn này) -----
export const ROUTE_JS = `(function(){try{var l=location,q=new URLSearchParams(l.search),h=l.hash,s=null,d=/^#\\//.test(h);try{s=window.sessionStorage}catch(e){}
var deep=d||q.has('hl')||q.has('sandbox')||q.has('demo')||q.get('source')==='pwa';
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
const GA_CLS = { head: 'btn-3d-secondary inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-xl text-sm font-extrabold', icon: 'btn-3d-secondary inline-flex items-center justify-center w-11 h-11 rounded-xl', foot: 'btn-3d-secondary inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-xl text-sm font-extrabold' };
const gaBtn = (l, place, appQ, web, look = place) => `<a class="${GA_CLS[look]}" href="${appQ}" data-get-app="${place}"${web ? ` data-web="${appQ}"` : ` aria-label="${esc(ui(l, 'Tải app'))}"`} hidden>${PHONE}${look === 'icon' ? '' : `<span>${esc(ui(l, 'Tải app'))}</span>`}</a>`;
// ----- Script 2: gợi ý trang đúng ngôn ngữ (chỉ người dùng thật, đóng được, nhớ lựa chọn) -----
const SUG = Object.fromEntries(LANGS.map(l => [l, copyOf(l).suggest]));
const URLS = Object.fromEntries(LANGS.map(l => [l, landingHref(l)]));
const hintJs = lang => `(function(){try{var P=${JSON.stringify(lang)},S=${JSON.stringify(SUG)},U=${JSON.stringify(URLS)},ls=window.localStorage;if(ls.getItem('lk.lhint'))return;
var n=ls.getItem('vb.uiLang')||(navigator.languages&&navigator.languages[0])||navigator.language||'';n=String(n).toLowerCase().split('-')[0];if(!S[n]||n===P)return;
var d=document.createElement('div');d.className='lhint';d.lang=n;if(n==='ar')d.dir='rtl';d.setAttribute('role','region');d.setAttribute('aria-label',S[n][0]);
d.innerHTML='<span></span><a class="btn"></a><button type="button">×</button>';d.firstChild.textContent=S[n][0];var a=d.querySelector('a'),b=d.querySelector('button');a.href=U[n];a.textContent=S[n][1];b.setAttribute('aria-label',S[n][2]);
var x=function(){try{ls.setItem('lk.lhint','1')}catch(e){}};a.onclick=x;b.onclick=function(){x();d.remove()};document.body.appendChild(d)}catch(e){}})();`;

// ----- CSS riêng của landing (chỉ phần mẫu Stitch không vẽ: giữ chỗ nút add-on/Tải app chống CLS, link bỏ qua, dải gợi ý ngôn ngữ, menu đổi ngôn ngữ) -----
// Màu = token Stitch (--st-*, cùng nguồn brand/stitch/tokens.dtcg.json, tự đổi sáng/tối) → biến dùng chung của khối lsw/lhint.
const LCSS = `[hidden]{display:none!important}.dc [data-ext-cta][hidden]{display:inline-flex!important;visibility:hidden}.dc [data-get-app][hidden]:not([data-off]),.ga [data-get-app][hidden]:not([data-off]){display:inline-flex!important;visibility:hidden}
${STW_VARS}
[data-get-app] svg{flex:none}.skip{position:absolute;left:8px;top:-60px;background:var(--surface);color:var(--text);padding:8px 12px;z-index:60}.skip:focus{top:8px}[dir=rtl] .skip:not(:focus){left:auto;right:-999px}[dir=rtl] .skip:focus{left:auto;right:8px}
.lhint{position:fixed;left:12px;right:12px;bottom:12px;z-index:60;max-width:640px;margin:0 auto;display:flex;align-items:center;gap:12px;background:var(--surface);color:var(--text);border:2px solid var(--line);border-radius:14px;box-shadow:0 12px 30px rgba(15,61,62,.18);padding:10px 12px 10px 16px;font-size:15px}.lhint span{flex:1}.lhint .btn{display:inline-flex;align-items:center;min-height:44px;padding:0 14px;border-radius:999px;background:var(--primary);color:rgb(var(--st-on-secondary));font-weight:800;font-size:14px;white-space:nowrap;text-decoration:none}.lhint button{font:inherit;background:none;border:0;font-size:22px;line-height:1;color:var(--muted);cursor:pointer;padding:4px 8px;min-width:44px;min-height:44px}
${LSW_CSS}.lsw-m{z-index:60}`;

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
function renderPurged(lang) { return compact(renderFull(lang)); }
// ----- Thu gọn JS nội tuyến (terser: bỏ khoảng trắng/chú thích, đổi tên biến cục bộ – không đổi hành vi) sau khi đã lọc CSS (lọc CSS đọc tên lớp trong script
// từ bản gốc). 27/10: ru 16489 B gzip trên Node 22 > 16384 → còn ≈ 16 000 B, không cắt nội dung/tính năng, không nâng ngân sách.
// render() giữ đồng bộ: mọi đoạn script của 15 trang được thu gọn sẵn một lần lúc nạp module (await cấp cao nhất, xem MINI bên dưới).
const SCRIPT = /(<script(?: id="[\w-]+")?>)([\s\S]*?)(<\/script>)/g, MINI = new Map();
export function render(lang) {
  return renderPurged(lang).replace(SCRIPT, (all, a, code, b) => MINI.has(code) ? a + MINI.get(code) + b : all);
}
function renderFull(lang) {
  const c = copyOf(lang), rtl = lang === 'ar', url = pageUrl(lang), app = appHref(lang);
  const appQ = `/app/?hl=${lang}`, start = `${appQ}#/welcome/setup`, login = `${appQ}#/welcome/login`;
  const vi = lang === 'vi', vocab = vi ? '/tu-vung/' : '/en/vocabulary/', samples = vi ? '/samples/' : '/en/samples/', blog = `/${lang}/blog/`;
  const alt = LANGS.map(l => `<link rel="alternate" hreflang="${l}" href="${pageUrl(l)}">`).join('\n') + `\n<link rel="alternate" hreflang="x-default" href="${pageUrl('en')}">`;
  // ---- dữ liệu THẬT cho khung Stitch (biểu thức trong brand/stitch/web/bind/home.json; chữ thô – khung tự escape) ----
  const hlEn = vi ? 'vi' : 'en'; // trang Từ vựng/Bài mẫu chỉ có bản vi + en → hreflang đúng ngôn ngữ đích
  const chrome = siteChrome({ lang, nav: [[app, c.nav.app, lang], [blog, c.nav.blog, lang], [vocab, c.nav.vocab, hlEn], [samples, c.nav.samples, hlEn]],
    open: [start, c.nav.start], signin: [login, c.nav.login], home: landingHref(lang), extra: [gaBtn(lang, 'head', appQ), gaBtn(lang, 'head', appQ, false, 'icon')],
    langHref: landingHref, label: c.langL, text: c.foot, tm: c.tm, getApp: gaBtn(lang, 'foot', appQ, true) });
  const resCol = chrome.cols[1].items, find = re => resCol.find(([u]) => re.test(u));
  const third = (vi ? find(/^\/ngu-phap\//) : find(/\/words\/$/)) || resCol[4]; // thẻ thứ 3 (icon sách): Ngữ pháp (vi) / Từ điển (/<lang>/words/)
  const more = ui(lang, 'Xem thêm');
  const rescards = [
    { v: 'v1', href: samples, hl: hlEn, h: c.res.samples[0], p: c.res.samples[1], more },
    { v: 'v2', href: vi ? '/speaking/' : '/en/speaking/', hl: hlEn, h: (FOOT[lang] || FOOT.en)[8], p: '', more },
    { v: 'v3', href: third[0], hl: /^\/[a-z]{2}\//.test(third[0]) ? third[0].slice(1, 3) : 'vi', h: third[1], p: '', more },
    { v: 'v4', href: vocab, hl: hlEn, h: c.res.vocab[0], p: c.res.vocab[1], more },
    { v: 'v5', href: blog, hl: lang, h: c.res.blog[0], p: c.res.blog[1], more }];
  const wide = s => [...s].reduce((a, ch) => a + (/[\u3000-\u9fff\uac00-\ud7af\uff00-\uffef]/.test(ch) ? 1 : .62), 0) * 36; // bề rộng ước tính ở cỡ chữ h1 điện thoại (36 px)
  const d = { ...c, start, store: EXT_STORE, h1nw: wide(c.hero.h1b) <= 330,
    trust: [...c.trust.map(x => [x]), [c.hero.note], [c.hero.placement, `${appQ}#/placement`]],
    grades: ['Quên', 'Khó', 'Nhớ', 'Dễ'].map((k, i) => [ui(lang, k), i === 2]), cont: `${ui(lang, 'Tiếp tục')} ${rtl ? '←' : '→'}`, rescards,
    // giáo viên đứng cạnh điện thoại / trong dải kêu gọi = đúng ô hình người của mẫu Stitch (≈ cao bằng hình vẽ 261–270 px ở máy tính); ảnh tĩnh rộng 1108×960 (nửa người, lề trong suốt 2 bên)
    //   → width/height giữ tỉ lệ (CLS), cỡ hiển thị theo màn qua class; vị trí ô Ama (-left-*) chỉnh trong bind/home.json để thân người nằm đúng chỗ hình vẽ.
    ama: teacher('ama', 'point', { size: 340, cls: 'chr max-w-none w-[200px] sm:w-[270px] lg:w-[340px] h-auto' }), carlos: teacher('carlos', 'cheer', { size: 300, cls: 'chr max-w-full w-[220px] sm:w-[300px] h-auto' }),
    extImg: `<img class="w-full h-auto rounded-xl" src="/img/ext-lookup.webp" srcset="/img/ext-lookup-480.webp 480w, /img/ext-lookup.webp 752w" sizes="(max-width: 800px) 92vw, 752px" width="752" height="602" loading="lazy" decoding="async" alt="${esc(c.ext.alt)}">` };
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
<link rel="icon" href="/icons/icon.svg?v=2" type="image/svg+xml"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png?v=2">
<style>${page.css}
${LCSS}</style>
${ld(graph)}
</head>
<body class="stw st">
<a class="skip" href="#main">${esc(c.skip)}</a>
${page.body}
<script>${hintJs(lang)}</script>
<script>${EXT_JS}
self.LK_GETAPP_T='${gaFile(lang)}';
${GETAPP_JS}</script>
</body>
</html>
`;
}

export const fileOf = l => l === 'vi' ? 'web/index.html' : `web/${l}/index.html`;
// Trang 404 (web/404.html, viết tay, song ngữ vi/en): chèn nút đổi ngôn ngữ góc trên (→ trang chủ từng ngôn ngữ) vào giữa <!--lsw--><!--/lsw-->.
// Trang dùng token màu riêng (--card/--fg/--coral) → ánh xạ sang token của khối lsw dùng chung.
export const render404 = html => html.replace(/<!--lsw-->[\s\S]*?<!--\/lsw-->/, () => `<!--lsw--><style>.top{position:absolute;top:12px;inset-inline-end:16px;--surface:var(--card);--text:var(--fg);--primary:var(--coral);--accent-soft:var(--line)}.top .lsw-m{display:block}${LSW_CSS}</style>
  <div class="top">${langSwitch({ lang: 'vi', label: 'Ngôn ngữ · Language' })}</div><script>${LSW_JS}</script><!--/lsw-->`);
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
  for (const l of LANGS) { // chữ hướng dẫn "Tải app" theo ngôn ngữ
    const f = new URL('web' + gaFile(l), R), j = gaJson(l);
    if (check) { if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== j) stale.push('web' + gaFile(l)); continue; }
    fs.mkdirSync(new URL('.', f), { recursive: true }); fs.writeFileSync(f, j);
  }
  { const f = new URL('web/404.html', R), cur = fs.readFileSync(f, 'utf8'), html = render404(cur); if (check) { if (html !== cur) stale.push('web/404.html'); } else fs.writeFileSync(f, html); }
  if (stale.length && !process.env.CI) { // cục bộ (npm test): tự dựng lại cho khỏi dừng giữa chừng; trên CI (CI=true) vẫn nghiêm ngặt
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { stdio: 'inherit' });
    if (r.status) process.exit(r.status);
    console.warn(`! build-landing: ${stale.length} trang chưa dựng lại → đã dựng lại cục bộ, nhớ commit web/ (CI sẽ đỏ nếu quên)`); process.exit(0);
  }
  if (stale.length) { console.error(`✗ build-landing: ${stale.length} trang giới thiệu chưa dựng lại (${stale.slice(0, 4).join(', ')}…) → node scripts/build-landing.mjs`); process.exit(1); }
  console.log(`✓ build-landing: ${LANGS.length} trang giới thiệu ${check ? 'khớp nguồn' : 'đã dựng'} (/ + /<lang>/)` + (check ? '' : ` · ${(Buffer.byteLength(render('vi')) / 1024).toFixed(1)} KB/trang`));
}
