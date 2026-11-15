// Sinh khung trang chào mừng dựng sẵn trong web/app/index.html (giữa <!--hero--> … <!--/hero-->) cho đủ 15 ngôn ngữ.
// Mục đích: chữ tiêu đề hiện ngay khi HTML về (LCP nhanh), không chờ ~300 KB JavaScript + bản dịch.
// Chuỗi lấy từ chính bản dịch giao diện (web/js/i18n/en.js + nguồn i18n/ui/<lang>.js) → không lệch nội dung với trang thật. Chạy trong build-i18n.sh.
import fs from 'fs';
import { loadSrc, loadLang } from './lib/i18n-pack.mjs';
const root = new URL('../web/', import.meta.url);
const load = f => { const g = {}; new Function('self', fs.readFileSync(new URL('js/i18n/' + f, root), 'utf8'))(g); return g.I18N_DICT; };
const KEYS = ['Nền tảng học từ vựng IELTS, TOEIC & tiếng Anh thực chiến', 'Từ vựng vững,', 'band điểm bứt phá.', 'Học 15 phút mỗi ngày với flashcard thông minh, trò chơi, bài đọc và luyện phát âm. Mọi từ đều có phiên âm chuẩn Anh–Anh, nghĩa tiếng Việt và câu ví dụ IELTS.', 'Bắt đầu miễn phí →', 'Tôi đã có tài khoản'];
// Chuỗi hero có thể nằm ở lõi hoặc nhóm tải lười (4a141cbf chuyển khóa kicker sang en/lazyui.js → hero non-vi hiện tiếng Việt + app gọi dịch máy /api/dictlookup, e2e 503 ở CI): luôn gộp lõi + MỌI nhóm.
const EN = load('en.js').en;
for (const f of fs.readdirSync(new URL('js/i18n/en/', root)).filter(f => f.endsWith('.js')).sort()) { const g = { I18N_DICT: { en: {} } }; new Function('self', fs.readFileSync(new URL('js/i18n/en/' + f, root), 'utf8'))(g); Object.assign(EN, g.I18N_DICT.en); }
const T = { vi: KEYS };
T.en = KEYS.map(k => EN[k] || k);
// 13 ngôn ngữ: đọc NGUỒN i18n/ui/<lang>.js (khóa nguyên câu) – web/js/i18n/<lang>.js là gói khóa băm (scripts/lib/i18n-pack.mjs)
for (const f of fs.readdirSync(new URL('../i18n/ui/', import.meta.url)).sort()) {
  const m = f.match(/^([a-z]{2})\.js$/); if (!m || m[1] === 'en') continue;
  const D = loadLang(m[1]); T[m[1]] = KEYS.map((k, i) => D[k] || T.en[i]);
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
for (const l in T) T[l] = T[l].map(esc);
// Giáo viên: khung đầu chỉ giữ chỗ đúng cỡ (ô .m b) – ảnh Ama chỉ vẽ qua Chars khi Welcome.draw mount (characters-gate: ngoài trang landing không ghi đường dẫn teach/…).
// Khung đầu = đúng số đo khung Stitch (web/js/st/v2/welcome.js < 1024 px, welcome-desk.js ≥ 1024 px): CSS bám class mẫu; màu sáng/tối theo cùng phép lt:/dk:. Welcome.draw thay cả khung khi gói tải xong → không nhảy (CLS ≈ 0).
const V = '--b:#081518;--i:#EEF6F7;--m:#A9BFC1;--l:#45D1C5;--c:#3A5F66;--s:#162E33;--g:#0E1F22;--f:#5E8A92;--t:#1B0B04;--z:#8E2816';
const CSS = '#lkHero{--b:#FFF8F5;--i:#191C1B;--m:#4B5554;--l:#00504B;--c:#E6D7CD;--s:#FFF;--g:#D5C4B8;--f:#D5C4B8;--t:#2A0700;--z:#B53A22;background:var(--b);color:var(--i);min-height:100vh}'
  + `@media (prefers-color-scheme:dark){:root:not([data-theme=light]) #lkHero{${V}}}:root[data-theme=dark] #lkHero{${V}}`
  + '#lkHero *{box-sizing:border-box;margin:0}#lkHero header{height:64px;padding:0 16px;display:flex;align-items:center;border-bottom:1px solid var(--c)}#lkHero .b{display:flex;align-items:center;gap:8px;font-weight:800;font-size:20px;letter-spacing:-.025em}#lkHero .b img{width:32px;height:32px;border-radius:8px}'
  + '#lkHero section{max-width:600px;margin:0 auto;padding:24px 16px 0}#lkHero .k{font-size:12px;line-height:16px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--l);margin-bottom:8px}#lkHero h1{font-size:28px;line-height:1.2;font-weight:800;letter-spacing:-.025em;margin-bottom:12px}#lkHero .d{font-size:15px;line-height:1.625;font-weight:500;color:var(--m);margin-bottom:24px}'
  + '#lkHero .m{display:flex;flex-direction:column;align-items:center;margin-bottom:24px}#lkHero .m b{display:block;width:200px;height:170px}#lkHero .m i{display:block;width:240px;height:4px;border-radius:9999px;background:var(--f)}#lkHero .r{display:none}'
  + '#lkHero .w-cta{display:flex;flex-direction:column;gap:12px}#lkHero .w-cta>*{width:100%;height:48px;display:flex;align-items:center;justify-content:center;border-radius:9999px;font:inherit;font-size:14px;font-weight:700;color:var(--i);background:var(--s);border:2px solid var(--c);box-shadow:0 4px 0 var(--g);text-decoration:none}#lkHero .w-cta .p{font-size:16px;letter-spacing:.025em;border:0;color:var(--t);background:linear-gradient(to right,#F2553B,#FF9E3B);box-shadow:0 4px 0 var(--z)}'
  + '@media (min-width:1024px){#lkHero header{height:82px;padding:0 max(24px,calc(50% - 576px));border-bottom-width:2px}#lkHero .b{gap:12px;font-size:24px}#lkHero .b img{width:40px;height:40px;border-radius:12px}#lkHero section{max-width:1200px;padding:48px 24px 64px;display:grid;grid-template-columns:repeat(12,1fr);gap:48px;align-items:start}#lkHero .l{grid-column:span 7;padding-top:16px}#lkHero .r{display:block;grid-column:span 5}#lkHero .s1{display:none}'
  + '#lkHero .k{display:inline-flex;padding:6px 12px 6px 38px;border-radius:9999px;background:var(--s);border:1px solid var(--c);font-size:13px;line-height:20px;letter-spacing:.025em;text-transform:none;margin-bottom:24px}#lkHero h1{font-size:44px;line-height:1.15;margin-bottom:20px}#lkHero .d{font-size:18px;line-height:1.5;max-width:560px;margin-bottom:32px}#lkHero .w-cta{flex-direction:row;gap:16px}#lkHero .w-cta>*{width:auto;height:auto;min-height:52px;padding:0 24px;font-size:16px}#lkHero .w-cta .p{font-size:17px;padding:0 32px}#lkHero .m{margin:0}#lkHero .m b{width:100%;height:240px}#lkHero .m i{width:80%}}';
const js = `(function(){try{var T=${JSON.stringify(T)},S=${JSON.stringify(Object.keys(T))},L='en',q=new URLSearchParams(location.search).get('hl'),s=localStorage.getItem('vb.uiLang');
if(localStorage.getItem('lk.onb')||!/^(#\\/?(welcome|home)?)?$/.test(location.hash))return;
if(q&&S.indexOf(q)>=0)L=q;else if(s&&S.indexOf(s)>=0)L=s;else{var n=navigator.languages||[navigator.language];for(var i=0;i<n.length;i++){var b=String(n[i]||'').toLowerCase().split('-')[0];if(S.indexOf(b)>=0){L=b;break}}}
var t=T[L];document.body.classList.add('bare');document.documentElement.lang=L;
document.getElementById('view').innerHTML='<div id="lkHero" data-hero-lang="'+L+'"><style>${CSS}</style><header><div class="b"><img src="icons/icon.svg" alt=""><span>lexkite</span></div></header><section><div class="l"><p class="k">'+t[0]+'</p><h1>'+t[1]+'<br>'+t[2]+'</h1><p class="d">'+t[3]+'</p><div class="m s1"><b></b><i></i></div><div class="w-cta"><a class="p" href="#/welcome/setup">'+t[4]+'</a><button type="button" id="loginW">'+t[5]+'</button></div></div><div class="r"><div class="m"><b></b><i></i></div></div></section></div>'}catch(e){}})();`;
const p = new URL('app/index.html', root); let html = fs.readFileSync(p, 'utf8');
const block = `<!--hero--><script>${js}</script><!--/hero-->`;
html = /<!--hero-->[\s\S]*?<!--\/hero-->/.test(html) ? html.replace(/<!--hero-->[\s\S]*?<!--\/hero-->/, () => block) : html.replace('<main id="view" class="view" tabindex="-1"></main>', m => m + '\n      ' + block);
fs.writeFileSync(p, html);
console.log('✓ gen-hero: ' + Object.keys(T).length + ' ngôn ngữ, ' + block.length + ' byte');
