// Trang đích "học thử ngay" cho kênh social/quảng bá: /go/<lang>/ (15 ngôn ngữ) + /go/ (chọn ngôn ngữ). Spec: docs/specs/go-landing.md
// Người lạ chạm 3 câu từ vựng ngay trên trang (không đăng ký, không tải app) → "Học tiếp trong app" = liên kết /app/ (liên kết xác minh → app đã cài tự mở).
// HTML thuần + CSS/JS nội tuyến nhỏ (token Stitch lấy từ web/css/st-w-home.css), 1 ảnh giáo viên Ama 2D (webp 7 KB) → LCP là chữ H1.
// UTM (utm_source|medium|campaign|content|term + c = mã kênh/bài) chỉ giữ khi khớp danh sách an toàn, truyền sang /app/ — không dữ liệu cá nhân trong URL.
// Dùng: node scripts/build-go.mjs [--check]   (--check: không ghi, lỗi nếu web/go chưa dựng lại – chạy trong npm test)
import fs from 'node:fs';
import { LANG_NAMES, esc, themeHead } from './lib/site-layout.mjs';

const R = new URL('../', import.meta.url), SITE = 'https://lexkite.com';
export const LANGS = Object.keys(LANG_NAMES);
export const KEYS = ['title', 'desc', 'h1', 'sub', 'q', 'ok', 'no', 'next', 'doneH', 'doneP', 'cta', 'start', 't1', 't2', 't3', 'have', 'badge', 'skip', 'alt'];
const COPY = JSON.parse(fs.readFileSync(new URL('content/go/copy.json', R), 'utf8'));
export const copyOf = l => Object.fromEntries(KEYS.map((k, i) => [k, COPY[l][i]]));
export const goUrl = l => `${SITE}/go/${l}/`;
export const fileOf = l => `web/go/${l}/index.html`;
const RTL = new Set(['ar']);
// 3 câu hỏi (emoji = hình, không chữ trong ảnh): đáp án đúng ở vị trí khác nhau
export const QUIZ = [{ e: '🍎', a: ['bus', 'apple', 'book'], c: 1 }, { e: '🚌', a: ['bus', 'tree', 'milk'], c: 0 }, { e: '☂️', a: ['key', 'chair', 'umbrella'], c: 2 }];

// Token Stitch (một nguồn: web/css/st-w-home.css do build-stitch-css sinh) – chỉ lấy biến dùng ở đây
const NEED = ['background', 'on-background', 'on-surface', 'on-surface-variant', 'surface-container', 'surface-container-highest', 'outline-variant', 'primary', 'on-primary', 'primary-container', 'secondary', 'secondary-container', 'on-secondary-container', 'error-container', 'on-error-container', 'tertiary-container'];
const stCss = fs.readFileSync(new URL('web/css/st-w-home.css', R), 'utf8');
const pick = blk => NEED.map(n => { const m = new RegExp(`--st-${n}:([\\d ]+)[;}]`).exec(blk); if (!m) throw new Error('thiếu token --st-' + n); return `--${n}:${m[1].trim()}`; }).join(';');
const light = stCss.match(/:root\{([^}]*)\}/)[1];
const dark = stCss.match(/@media \(prefers-color-scheme:dark\)\{:root:not\(\[data-theme=light\]\)\{([^}]*)\}/)[1];
const darkForced = stCss.match(/:root\[data-theme=dark\]\{([^}]*)\}/)[1];
const CSS = `:root{${pick(light)};color-scheme:light dark}@media(prefers-color-scheme:dark){:root:not([data-theme=light]){${pick(dark)}}}:root[data-theme=dark]{${pick(darkForced)}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;background:rgb(var(--background));color:rgb(var(--on-background));font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans","Noto Sans Thai","Noto Sans Devanagari","Noto Sans Arabic","Noto Sans CJK SC",sans-serif;min-height:100vh}
.skip{position:absolute;left:8px;top:-60px;background:rgb(var(--surface-container));color:inherit;padding:10px 14px;min-height:44px;z-index:9}.skip:focus{top:8px}
main{max-width:520px;margin:0 auto;padding:16px 16px 40px}
.top{display:flex;align-items:center;justify-content:space-between;min-height:44px;margin-bottom:12px}.logo{display:inline-flex;align-items:center;gap:8px;font-weight:800;font-size:1.15rem;color:inherit;text-decoration:none;min-height:44px}.logo img{width:32px;height:32px;border-radius:8px}
.open{color:rgb(var(--secondary));font-weight:700;text-decoration:none;min-height:44px;display:inline-flex;align-items:center;padding:0 4px}
h1{font-size:1.75rem;line-height:1.2;margin:8px 0 6px;font-weight:800}.sub{margin:0 0 18px;color:rgb(var(--on-surface-variant));font-size:1.05rem}
.bar{display:flex;gap:6px;margin:0 0 14px}.bar i{flex:1;height:8px;border-radius:99px;background:rgb(var(--surface-container-highest));transition:background .25s}.bar i.on{background:rgb(var(--secondary-container))}
.card{background:rgb(var(--surface-container));border:2px solid rgb(var(--outline-variant));border-radius:24px;padding:18px;box-shadow:0 4px 0 rgb(var(--outline-variant))}
.ask{display:flex;align-items:center;gap:12px;margin-bottom:6px}.ask img{width:56px;height:56px;border-radius:50%;flex:none;background:rgb(var(--surface-container-highest))}.ask p{margin:0;font-weight:700}
.pic{font-size:5rem;line-height:1.1;text-align:center;margin:6px 0 12px;min-height:96px}
.opts{display:grid;gap:10px}.opt,.btn{font:inherit;font-weight:800;min-height:52px;border-radius:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;text-align:center;text-decoration:none;padding:0 18px;touch-action:manipulation}
.opt{background:rgb(var(--background));color:rgb(var(--on-background));border:2px solid rgb(var(--outline-variant));border-bottom-width:4px;font-size:1.1rem}
.opt:active{transform:translateY(2px);border-bottom-width:2px}.opt.good{background:rgb(var(--secondary-container));color:rgb(var(--on-secondary-container));border-color:rgb(var(--secondary))}.opt.bad{background:rgb(var(--error-container));color:rgb(var(--on-error-container))}.opt[disabled]{cursor:default}
.fb{min-height:28px;margin:12px 0 4px;font-weight:800;text-align:center}.btn{border:0;background:rgb(var(--primary));color:rgb(var(--on-primary));box-shadow:0 4px 0 rgb(var(--on-background)/.28);font-size:1.1rem;width:100%}.btn:active{transform:translateY(3px);box-shadow:0 1px 0 rgb(var(--on-background)/.28)}
.btn.s{background:transparent;color:rgb(var(--secondary));border:2px solid rgb(var(--outline-variant));box-shadow:none;width:auto;min-height:44px;font-size:.95rem}
.done{text-align:center}.done h2{margin:6px 0}.done p{margin:0 0 16px;color:rgb(var(--on-surface-variant))}
.trust{display:flex;flex-wrap:wrap;gap:8px 14px;justify-content:center;list-style:none;margin:22px 0 14px;padding:0;font-weight:700;font-size:.92rem}.trust li:before{content:"✓ ";color:rgb(var(--secondary))}
.stores{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-bottom:16px}.stores a[hidden]{display:none}
.langs{display:flex;flex-wrap:wrap;gap:4px 12px;justify-content:center;margin:18px 0 0;padding:0;list-style:none;font-size:.9rem}.langs a{color:rgb(var(--on-surface-variant));text-decoration:none;min-height:44px;min-width:44px;justify-content:center;display:inline-flex;align-items:center}.langs a[aria-current]{font-weight:800;color:rgb(var(--on-background))}
[hidden]{display:none!important}@media(prefers-reduced-motion:reduce){*{transition:none!important}}@media(min-width:600px){h1{font-size:2.1rem}}`;

// Script nội tuyến: câu hỏi + UTM + đếm (sendBeacon /api/hit, chỉ đếm; bot/webdriver không đếm). Giữ nhỏ.
const JS = d => `(function(){var D=document,W=window,Q=${JSON.stringify(QUIZ)},T=${JSON.stringify({ ok: d.ok, no: d.no })},L=${JSON.stringify(d.lang)},i=0,lock=0,S=null;
try{S=W.sessionStorage}catch(e){}
var K=/^(utm_(source|medium|campaign|content|term)|c)$/,V=/^[A-Za-z0-9._~-]{1,40}$/,p={};
try{new URLSearchParams(location.search).forEach(function(v,k){if(K.test(k)&&V.test(v))p[k]=v});var o=S&&S.getItem('lk.go');if(o&&!Object.keys(p).length)p=JSON.parse(o);if(Object.keys(p).length&&S)S.setItem('lk.go',JSON.stringify(p))}catch(e){}
var at={s:p.utm_source,m:p.utm_medium,c:p.utm_campaign,k:p.c};Object.keys(at).forEach(function(k){if(!at[k])delete at[k]});
var q='src=go&'+Object.keys(p).map(function(k){return k+'='+encodeURIComponent(p[k])}).join('&');q=q.replace(/&$/,'');
D.querySelectorAll('[data-app]').forEach(function(a){a.href=a.getAttribute('data-app')+(a.getAttribute('data-app').indexOf('?')<0?'?':'&')+q});
function ev(e){try{if(navigator.webdriver||(W.localStorage&&localStorage.getItem('lk.noTrack')==='1'))return;navigator.sendBeacon('/api/hit',JSON.stringify({t:'q',ev:e,lang:L,page:'go',at:at}))}catch(x){}}
ev('go_view');
var $=function(s){return D.querySelector(s)},bar=D.querySelectorAll('.bar i'),opts=$('.opts'),pic=$('.pic'),fb=$('.fb'),next=$('#next'),quiz=$('#quiz'),done=$('#done'),started=0;
function say(w){try{var u=new SpeechSynthesisUtterance(w);u.lang='en-US';u.rate=.9;speechSynthesis.cancel();speechSynthesis.speak(u)}catch(e){}}
function show(){var c=Q[i];lock=0;pic.textContent=c.e;fb.textContent='';fb.style.color='';next.hidden=true;opts.textContent='';
c.a.forEach(function(w,j){var b=D.createElement('button');b.type='button';b.className='opt';b.textContent=w;b.lang='en';b.onclick=function(){pick(b,j)};opts.appendChild(b)})}
function pick(b,j){if(lock)return;var c=Q[i];if(!started){started=1;ev('go_start')}
if(j===c.c){lock=1;b.classList.add('good');fb.textContent=T.ok;say(c.a[j]);bar[i].classList.add('on');[].forEach.call(opts.children,function(x){x.disabled=true});next.hidden=false;next.focus()}
else{b.classList.add('bad');b.disabled=true;fb.textContent=T.no+' '+c.a[c.c]}}
next.onclick=function(){i++;if(i>=Q.length){quiz.hidden=true;done.hidden=false;ev('go_done');done.querySelector('a').focus()}else show()};
D.querySelectorAll('[data-app]').forEach(function(a){a.addEventListener('click',function(){ev('go_cta')})});
show()})();`;

export function render(l) {
  const d = { ...copyOf('en'), ...copyOf(l), lang: l }, dir = RTL.has(l) ? 'rtl' : 'ltr';
  const appBase = l === 'vi' ? '/app/' : `/app/?hl=${l}`;
  const alts = LANGS.map(x => `<link rel="alternate" hreflang="${x}" href="${goUrl(x)}">`).join('\n') + `\n<link rel="alternate" hreflang="x-default" href="${goUrl('en')}">`;
  const ld = { '@context': 'https://schema.org', '@type': 'WebPage', name: d.title, description: d.desc, url: goUrl(l), inLanguage: l, isPartOf: { '@type': 'WebSite', name: 'Lexkite', url: SITE + '/' } };
  const ph = `<span class="bar-ph"></span>`.slice(0, 0);
  return `<!doctype html>
<html lang="${l}" dir="${dir}">
<head>
<meta charset="utf-8"><script data-lkt>function lkT(){try{var s=localStorage,t=s.getItem('lk.theme'),p;try{p=JSON.parse(s.getItem('ielts.settings')||'0')}catch(e){}if(p&&p.theme&&+s.getItem('ielts.settingsAt')>(+s.getItem('lk.themeAt')||0))t=p.theme;return t=='light'||t=='dark'?t:''}catch(e){return''}}lkT()&&document.documentElement.setAttribute('data-theme',lkT())</script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(d.title)}</title>
<meta name="description" content="${esc(d.desc)}">
<link rel="canonical" href="${goUrl(l)}">
${alts}
<meta property="og:type" content="website"><meta property="og:site_name" content="Lexkite"><meta property="og:title" content="${esc(d.h1)}"><meta property="og:description" content="${esc(d.sub)}"><meta property="og:url" content="${goUrl(l)}"><meta property="og:image" content="${SITE}/og-default.png">
<meta name="theme-color" content="#0f3d3e" media="(prefers-color-scheme:dark)"><meta name="theme-color" content="#fbf7f1" media="(prefers-color-scheme:light)">
<link rel="icon" href="/icons/icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<style>${CSS}</style>
</head>
<body>
<a class="skip" href="#quiz">${esc(d.skip)}</a>
<main>
<div class="top"><a class="logo" href="/${l}/"><img src="/icons/icon-48.png" width="32" height="32" alt="">Lexkite</a><a class="open" href="${appBase}" data-app="${appBase}">${esc(d.have)}</a></div>
<h1>${esc(d.h1)}</h1>
<p class="sub">${esc(d.sub)}</p>
<div class="bar" aria-hidden="true"><i></i><i></i><i></i></div>
<section class="card" id="quiz" aria-live="polite">
<div class="ask"><img src="/teach/ama/avatar.webp" width="56" height="56" alt="" decoding="async"><p>${esc(d.q)}</p></div>
<div class="pic" aria-hidden="true">${QUIZ[0].e}</div>
<div class="opts">${QUIZ[0].a.map(w => `<button type="button" class="opt" lang="en">${w}</button>`).join('')}</div>
<div class="fb" role="status"></div>
<button type="button" class="btn" id="next" hidden>${esc(d.next)}</button>
</section>
<section class="card done" id="done" hidden>
<img src="/teach/ama/avatar.webp" width="72" height="72" alt="" loading="lazy" style="border-radius:50%">
<h2>${esc(d.doneH)}</h2><p>${esc(d.doneP)}</p>
<a class="btn" href="${appBase}" data-app="${appBase}">${esc(d.cta)}</a>
</section>
<ul class="trust"><li>${esc(d.t1)}</li><li>${esc(d.t2)}</li><li>${esc(d.t3)}</li></ul>
<div class="stores"><a class="btn s" data-get-app="go" data-web="${appBase}" hidden>${esc(d.badge)}</a></div>
<nav aria-label="Language"><ul class="langs">${LANGS.map(x => `<li><a href="/go/${x}/" hreflang="${x}" lang="${x}"${x === l ? ' aria-current="page"' : ''}>${esc(LANG_NAMES[x])}</a></li>`).join('')}</ul></nav>
</main>
<script>${JS(d)}</script>
<script src="/js/ext-config.js" defer></script><script src="/js/get-app.js" defer></script>
</body>
</html>
`;
}

// /go/ → ngôn ngữ trình duyệt (không đoán theo IP), có liên kết thật cho bot/noscript
export function renderIndex() {
  const S = JSON.stringify(LANGS);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Lexkite – learn English free</title><meta name="description" content="Learn English free with Lexkite: pick your language to start a 1-minute lesson."><meta name="robots" content="noindex,follow"><link rel="canonical" href="${goUrl('en')}">
<script>(function(){try{var S=${S},s=localStorage.getItem('vb.uiLang'),l=s&&S.indexOf(s)>=0?s:null;if(!l){var n=navigator.languages||[navigator.language];for(var i=0;i<n.length;i++){var b=String(n[i]||'').toLowerCase().split('-')[0];if(S.indexOf(b)>=0){l=b;break}}}location.replace('/go/'+(l||'en')+'/'+location.search+location.hash)}catch(e){location.replace('/go/en/')}})();</script></head>
<body><ul>${LANGS.map(x => `<li><a href="/go/${x}/">${esc(LANG_NAMES[x])}</a></li>`).join('')}</ul></body></html>
`;
}

// themeHead: script chống nháy sáng/tối + theme-color theo nền (một nguồn với mọi trang tĩnh; theme-switch.mjs kiểm)
export const outputs = () => ({ ...Object.fromEntries(LANGS.map(l => [fileOf(l), themeHead(render(l))])), 'web/go/index.html': themeHead(renderIndex()) });

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  const bad = [];
  for (const [f, s] of Object.entries(outputs())) {
    const p = new URL(f, R);
    if (process.argv.includes('--check')) { if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== s) bad.push(f); continue; }
    fs.mkdirSync(new URL('./', p), { recursive: true }); fs.writeFileSync(p, s);
  }
  if (bad.length) { console.error('build-go: chưa dựng lại → node scripts/build-go.mjs:', bad.join(', ')); process.exit(1); }
  console.log(process.argv.includes('--check') ? 'go pages OK' : 'built ' + (LANGS.length + 1) + ' files');
}
