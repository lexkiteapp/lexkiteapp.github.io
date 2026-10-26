// Trang giới thiệu (landing) tĩnh cho 15 ngôn ngữ: / (vi) và /<lang>/ (14 ngôn ngữ còn lại) – giống duolingo.com → /learn.
// App học (SPA, hash route) nằm ở /app/ (web/app/index.html). Trang này: HTML thuần + CSS nội tuyến (khung chung scripts/lib/site-layout.mjs),
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
import { orgNode } from './lib/authority-links.mjs'; // Organization chuẩn + sameAs kênh thật (docs/SEO-AUTHORITY.md)
import { CSS, esc, ld, siteHeader, siteFooter, LANG_NAMES, appHref, landingHref, langSwitch, LSW_CSS, LSW_JS, EXT_STORE, EXT_JS } from './lib/site-layout.mjs';

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
// Kit (linh vật) dựng sẵn từ nguồn duy nhất web/js/kit.js (docs/BRAND-RULES.md) – SVG tĩnh, không chạy JS ở trình duyệt
const KIT = (() => { const g = {}; new Function('window', 'self', rd('web/js/kit.js'))(g, g); return g.Kit.svg('cheer', 84, false); })();

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
// ----- Script 2: gợi ý trang đúng ngôn ngữ (chỉ người dùng thật, đóng được, nhớ lựa chọn) -----
const SUG = Object.fromEntries(LANGS.map(l => [l, copyOf(l).suggest]));
const URLS = Object.fromEntries(LANGS.map(l => [l, landingHref(l)]));
const hintJs = lang => `(function(){try{var P=${JSON.stringify(lang)},S=${JSON.stringify(SUG)},U=${JSON.stringify(URLS)},ls=window.localStorage;if(ls.getItem('lk.lhint'))return;
var n=ls.getItem('vb.uiLang')||(navigator.languages&&navigator.languages[0])||navigator.language||'';n=String(n).toLowerCase().split('-')[0];if(!S[n]||n===P)return;
var d=document.createElement('div');d.className='lhint';d.lang=n;if(n==='ar')d.dir='rtl';d.setAttribute('role','region');d.setAttribute('aria-label',S[n][0]);
d.innerHTML='<span></span><a class="btn"></a><button type="button">×</button>';d.firstChild.textContent=S[n][0];var a=d.querySelector('a'),b=d.querySelector('button');a.href=U[n];a.textContent=S[n][1];b.setAttribute('aria-label',S[n][2]);
var x=function(){try{ls.setItem('lk.lhint','1')}catch(e){}};a.onclick=x;b.onclick=function(){x();d.remove()};document.body.appendChild(d)}catch(e){}})();`;

// ----- CSS riêng của landing (chỉ token màu của site-layout / BRAND-RULES) -----
const LCSS = `[hidden]{display:none!important}.dc [data-ext-cta][hidden]{display:inline-block!important;visibility:hidden}main{padding-top:8px}.lh{display:grid;grid-template-columns:1.1fr .9fr;gap:40px;align-items:center;padding:28px 0 12px}
.eyebrow{display:inline-block;background:var(--accent-soft);color:var(--accent);font-weight:700;font-size:14px;padding:4px 12px;border-radius:999px}
.lh h1{font-size:clamp(34px,5.4vw,56px);line-height:1.08;letter-spacing:-.03em;margin:16px 0 14px}.grad{background:linear-gradient(90deg,#E5502F,#FFB054);-webkit-background-clip:text;background-clip:text;color:transparent}
.lead{font-size:19px;color:var(--muted);max-width:56ch;margin:0}.ctas{display:flex;flex-wrap:wrap;gap:12px;margin:24px 0 10px;align-items:center}.btn.lg{font-size:17px;padding:13px 24px}
.btn.ghost{background:var(--surface);color:var(--text)!important;border:1px solid var(--line)}.note{font-size:14px;color:var(--muted);margin:6px 0 0}.note a{font-weight:700}
.demo{position:relative}.fc{background:var(--surface);border:1px solid var(--line);border-radius:22px;overflow:hidden;box-shadow:0 18px 50px rgba(20,20,60,.12)}
.fc .top{background:linear-gradient(135deg,#0F3D3E,#12807A);color:#fff;text-align:center;padding:26px 16px 22px}.fc .w{font-size:34px;font-weight:800;letter-spacing:-.01em}.fc .ipa{opacity:.92;font-size:15px}
.fc .bd{padding:16px 20px 20px}.fc .mean{font-size:20px;font-weight:700;margin:0 0 8px}.fc .exs{background:var(--accent-soft);border-radius:12px;padding:10px 14px;font-size:15px;margin:0}.fc mark{background:none;color:var(--accent);font-weight:700}
.gr{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px}.gr span{text-align:center;border-radius:999px;padding:7px 4px;font-size:14px;font-weight:700;background:var(--bg);border:1px solid var(--line)}.gr .ok{background:var(--accent-soft);color:var(--accent);border-color:transparent}
.kit{position:absolute;right:-6px;top:-34px;width:84px;height:84px;padding:6px;box-sizing:content-box;background:radial-gradient(circle at 50% 50%,#FFEBE4 0 62%,rgba(255,235,228,.35) 63% 69%,transparent 70%);border-radius:50%;filter:drop-shadow(0 6px 14px rgba(0,0,0,.28))}.kit svg{display:block;width:100%;height:100%}
.trust{display:flex;flex-wrap:wrap;gap:8px 22px;justify-content:center;color:var(--muted);font-size:15px;font-weight:600;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:14px 0;margin:28px 0 8px;list-style:none}
.sec{padding:34px 0 6px}.sec>h2{font-size:clamp(26px,3.4vw,34px);letter-spacing:-.02em;line-height:1.2;margin:0 0 6px}.sec>p.sub{color:var(--muted);margin:0 0 8px;max-width:70ch}
.feat{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin:18px 0 0;padding:0;list-style:none}.feat li{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:18px 20px}.feat .ic{font-size:30px;line-height:1}.feat h3{font-size:19px;margin:10px 0 6px;line-height:1.3}.feat p{margin:0;color:var(--muted);font-size:16px;line-height:1.6}
.steps{counter-reset:s;display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin:18px 0 0;padding:0;list-style:none}.steps li{counter-increment:s;padding:6px 4px}.steps li::before{content:counter(s);display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:var(--brand);color:#fff;font-weight:800;margin-bottom:10px}.steps h3{margin:0 0 4px;font-size:19px}.steps p{margin:0;color:var(--muted);font-size:16px}
.res{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin:18px 0 0}.res a{display:block;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:18px 20px;text-decoration:none;color:var(--text)}.res a:hover{border-color:var(--primary)}.res b{display:block;font-size:19px;margin-bottom:4px}.res span{color:var(--muted);font-size:16px}
.faq details{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:4px 18px;margin:10px 0}.faq summary{cursor:pointer;font-weight:700;padding:12px 0;font-size:17px}.faq details p{margin:0 0 14px;color:var(--muted)}
.final{background:linear-gradient(135deg,#0F3D3E,#12807A);color:#fff;border-radius:24px;padding:34px 28px;text-align:center;margin:40px 0 0}.final h2{margin:0 0 8px;font-size:clamp(24px,3.2vw,32px)}.final p{margin:0 auto 18px;max-width:56ch;opacity:.92}.final .btn{background:#fff;color:#0F3D3E!important}
[dir=rtl] .skip:not(:focus){left:auto;right:-999px}[dir=rtl] .kit{right:auto;left:-6px}@media (max-width:600px){[dir=rtl] .kit{left:0}}
.lhint{position:fixed;left:12px;right:12px;bottom:12px;z-index:20;max-width:640px;margin:0 auto;display:flex;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--line);border-radius:14px;box-shadow:0 12px 30px rgba(20,20,60,.18);padding:10px 12px 10px 16px;font-size:15px}.lhint span{flex:1}.lhint .btn{padding:6px 14px;font-size:14px;white-space:nowrap}.lhint button{background:none;border:0;font-size:22px;line-height:1;color:var(--muted);cursor:pointer;padding:4px 8px}
@media (max-width:900px){nav.main{flex-wrap:nowrap}nav.main .hm{display:none}.lh{grid-template-columns:1fr;gap:44px}.demo{max-width:440px;margin:0 auto;width:100%}.feat,.res{grid-template-columns:1fr 1fr}}
@media (max-width:600px){nav.main>a:not(.btn){display:none}nav.main{gap:8px}header.top .bar{flex-wrap:nowrap}.feat,.res,.steps{grid-template-columns:1fr}.lh{padding-top:12px}.lead{font-size:17px}.final{padding:28px 18px}.kit{top:-28px;right:0;width:64px;height:64px}}
.xf h2{font-size:clamp(26px,3.4vw,34px);letter-spacing:-.02em;line-height:1.2;margin:0 0 6px}.xf{display:grid;grid-template-columns:1fr 1.15fr;gap:36px;align-items:center}.xf ul{list-style:none;padding:0;margin:16px 0 20px;display:grid;gap:8px}.xf li::before{content:'✓ ';color:var(--accent);font-weight:800}.xf img{display:block;width:100%;height:auto;border-radius:14px;border:1px solid var(--line);box-shadow:0 18px 40px rgba(15,61,62,.18)}
@media (max-width:820px){.xf{grid-template-columns:1fr}}
@media (prefers-color-scheme:dark){.eyebrow,.fc mark,.gr .ok{color:#7fd6cc}.final .btn{color:#0F3D3E!important}.steps li::before{color:#0f1017}}`;

export function render(lang) {
  const c = copyOf(lang), rtl = lang === 'ar', url = pageUrl(lang), app = appHref(lang);
  const appQ = `/app/?hl=${lang}`, start = `${appQ}#/welcome/setup`, login = `${appQ}#/welcome/login`;
  const vi = lang === 'vi', vocab = vi ? '/tu-vung/' : '/en/vocabulary/', samples = vi ? '/samples/' : '/en/samples/', blog = `/${lang}/blog/`;
  const enOnly = vi || lang === 'en' ? '' : ' hreflang="en"';
  const alt = LANGS.map(l => `<link rel="alternate" hreflang="${l}" href="${pageUrl(l)}">`).join('\n') + `\n<link rel="alternate" hreflang="x-default" href="${pageUrl('en')}">`;
  const nav = [[app, esc(c.nav.app)], [blog, esc(c.nav.blog)], [vocab, esc(c.nav.vocab), ` class="hm"${enOnly}`], [samples, esc(c.nav.samples), ` class="hm"${enOnly}`], [login, esc(c.nav.login)]];
  const grades = ['Quên', 'Khó', 'Nhớ', 'Dễ'].map((k, i) => `<span${i === 2 ? ' class="ok"' : ''}>${esc(ui(lang, k))}</span>`).join('');
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
<script id="lk-dc">${DC_JS}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
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
${ld(graph)}
<style>${CSS}
${LCSS}</style>
</head>
<body>
<a class="skip" href="#nd">${esc(c.skip)}</a>
${siteHeader({ nav, open: [start, esc(c.nav.start)], home: landingHref(lang), lang, langHref: landingHref, label: c.langL })}
<main id="nd">
<section class="lh" aria-labelledby="h1">
<div>
<span class="eyebrow">${esc(c.hero.eyebrow)}</span>
<h1 id="h1">${esc(c.hero.h1a)} <span class="grad">${esc(c.hero.h1b)}</span></h1>
<p class="lead">${esc(c.hero.lead)}</p>
<div class="ctas"><a class="btn lg" href="${start}">${esc(c.hero.cta)} ${rtl ? '←' : '→'}</a><a class="btn lg ghost" href="${login}">${esc(c.hero.login)}</a><a class="btn lg ghost" href="${EXT_STORE}" target="_blank" rel="noopener" data-ext-cta="land" hidden>🧩 ${esc(c.ext.btn)}</a></div>
<p class="note">${esc(c.hero.note)} · <a href="${appQ}#/placement">${esc(c.hero.placement)}</a></p>
</div>
<div class="demo" aria-hidden="true">
<span class="kit">${KIT}</span>
<div class="fc"><div class="top"><div class="w" lang="en" dir="ltr">sustainable</div><div class="ipa" lang="en" dir="ltr">/səˈsteɪnəbl/ · adj · B2</div></div>
<div class="bd"><p class="mean">${esc(c.card.meaning)}</p><p class="exs" lang="en" dir="ltr">Governments must invest in <mark>sustainable</mark> energy to protect future generations.</p>
<div class="gr">${grades}</div></div></div>
</div>
</section>
<ul class="trust">${c.trust.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
<section class="sec" id="features" aria-labelledby="hf"><h2 id="hf">${esc(c.featuresH)}</h2><p class="sub">${esc(c.featuresSub)}</p>
<ul class="feat">${c.features.map(([ic, h, p]) => `<li><span class="ic" aria-hidden="true">${ic}</span><h3>${esc(h)}</h3><p>${esc(p)}</p></li>`).join('')}</ul></section>
<section class="sec xf" id="addon" aria-labelledby="hx"><div><h2 id="hx">${esc(c.ext.h)}</h2><p class="sub">${esc(c.ext.p)}</p><ul>${c.ext.pts.map(x => `<li>${esc(x)}</li>`).join('')}</ul><a class="btn lg" href="${EXT_STORE}" target="_blank" rel="noopener" data-ext-cta="feat" hidden>🧩 ${esc(c.ext.btn)}</a></div>
<img src="/img/ext-lookup.webp" srcset="/img/ext-lookup-480.webp 480w, /img/ext-lookup.webp 752w" sizes="(max-width: 800px) 92vw, 752px" width="752" height="602" loading="lazy" decoding="async" alt="${esc(c.ext.alt)}"></section>
<section class="sec" id="how" aria-labelledby="hh"><h2 id="hh">${esc(c.stepsH)}</h2>
<ol class="steps">${c.steps.map(([h, p]) => `<li><h3>${esc(h)}</h3><p>${esc(p)}</p></li>`).join('')}</ol></section>
<section class="sec" id="free" aria-labelledby="hr"><h2 id="hr">${esc(c.resH)}</h2><p class="sub">${esc(c.resSub)}</p>
<div class="res"><a href="${blog}"><b>${esc(c.res.blog[0])}</b><span>${esc(c.res.blog[1])}</span></a><a href="${vocab}"${enOnly}><b>${esc(c.res.vocab[0])}</b><span>${esc(c.res.vocab[1])}</span></a><a href="${samples}"${enOnly}><b>${esc(c.res.samples[0])}</b><span>${esc(c.res.samples[1])}</span></a></div></section>
<section class="sec faq" id="faq" aria-labelledby="hq"><h2 id="hq">${esc(c.faqH)}</h2>
${c.faq.map(([q, a], i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n')}</section>
<section class="final" aria-labelledby="hc"><h2 id="hc">${esc(c.finalH)}</h2><p>${esc(c.finalP)}</p><a class="btn lg" href="${start}">${esc(c.hero.cta)} ${rtl ? '←' : '→'}</a></section>
</main>
${siteFooter({ lang, text: esc(c.foot), tm: esc(c.tm), langHref: landingHref })}
<script>${hintJs(lang)}</script>
<script>${EXT_JS}</script>
</body>
</html>
`;
}

export const fileOf = l => l === 'vi' ? 'web/index.html' : `web/${l}/index.html`;
// Trang 404 (web/404.html, viết tay, song ngữ vi/en): chèn nút đổi ngôn ngữ góc trên (→ trang chủ từng ngôn ngữ) vào giữa <!--lsw--><!--/lsw-->.
// Trang dùng token màu riêng (--card/--fg/--coral) → ánh xạ sang token của khối lsw dùng chung.
export const render404 = html => html.replace(/<!--lsw-->[\s\S]*?<!--\/lsw-->/, () => `<!--lsw--><style>.top{position:absolute;top:12px;inset-inline-end:16px;--surface:var(--card);--text:var(--fg);--primary:var(--coral);--accent-soft:var(--line)}.top .lsw-m{display:block}${LSW_CSS}</style>
  <div class="top">${langSwitch({ lang: 'vi', label: 'Ngôn ngữ · Language' })}</div><script>${LSW_JS}</script><!--/lsw-->`);
if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file://').href) {
  const check = process.argv.includes('--check'), stale = [];
  for (const l of LANGS) {
    const html = render(l), f = new URL(fileOf(l), R);
    if (check) { if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== html) stale.push(fileOf(l)); continue; }
    fs.mkdirSync(new URL('.', f), { recursive: true }); fs.writeFileSync(f, html);
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
