// Sinh khung trang chào mừng dựng sẵn trong web/app/index.html (giữa <!--hero--> … <!--/hero-->) cho đủ 15 ngôn ngữ.
// Mục đích: chữ tiêu đề hiện ngay khi HTML về (LCP nhanh), không chờ ~300 KB JavaScript + bản dịch.
// Chuỗi lấy từ chính bản dịch giao diện (web/js/i18n/*.js) → không lệch nội dung với trang thật. Chạy trong build-i18n.sh.
import fs from 'fs';
const root = new URL('../web/', import.meta.url);
const load = f => { const g = {}; new Function('self', fs.readFileSync(new URL('js/i18n/' + f, root), 'utf8'))(g); return g.I18N_DICT; };
const KEYS = ['Nền tảng học từ vựng IELTS, TOEIC & tiếng Anh thực chiến', 'Từ vựng vững,', 'band điểm bứt phá.', 'Học 15 phút mỗi ngày với flashcard thông minh, trò chơi, bài đọc và luyện phát âm. Mọi từ đều có phiên âm chuẩn Anh–Anh, nghĩa tiếng Việt và câu ví dụ IELTS.', 'Bắt đầu miễn phí →', 'Tôi đã có tài khoản'];
const EN = load('en.js').en, T = { vi: KEYS };
T.en = KEYS.map(k => EN[k] || k);
for (const f of fs.readdirSync(new URL('js/i18n/', root))) {
  const m = f.match(/^([a-z]{2})\.js$/); if (!m || m[1] === 'en') continue;
  const D = (load(f) || {})[m[1]] || {}; T[m[1]] = KEYS.map((k, i) => D[k] || T.en[i]);
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
for (const l in T) T[l] = T[l].map(esc);
const js = `(function(){try{var T=${JSON.stringify(T)},S=${JSON.stringify(Object.keys(T))},L='en',q=new URLSearchParams(location.search).get('hl'),s=localStorage.getItem('vb.uiLang');
if(localStorage.getItem('lk.onb')||!/^(#\\/?(welcome|home)?)?$/.test(location.hash))return;
if(q&&S.indexOf(q)>=0)L=q;else if(s&&S.indexOf(s)>=0)L=s;else{var n=navigator.languages||[navigator.language];for(var i=0;i<n.length;i++){var b=String(n[i]||'').toLowerCase().split('-')[0];if(S.indexOf(b)>=0){L=b;break}}}
var t=T[L];document.body.classList.add('bare');document.documentElement.lang=L;
document.getElementById('view').innerHTML='<div style="max-width:980px;margin:0 auto" id="lkHero" data-hero-lang="'+L+'"><header class="w-head"><span class="brand" style="padding:0"><img class="logo" src="icons/icon.svg" alt=""><span class="wordmark">lex<b>kite</b></span></span></header><div class="grid g2" style="align-items:center;gap:2.5rem"><div><span class="chip lv">✨ '+t[0]+'</span><h1 style="font-size:clamp(2rem,5vw,3.2rem);line-height:1.1;margin:1rem 0">'+t[1]+'<br><span style="background:linear-gradient(90deg,#E5502F,#FFB054);-webkit-background-clip:text;background-clip:text;color:transparent">'+t[2]+'</span></h1><p class="muted" style="font-size:1.1rem">'+t[3]+'</p><div class="row w-cta" style="margin-top:1.5rem"><a class="btn primary lg" href="#/welcome/setup">'+t[4]+'</a><button type="button" class="btn lg" id="loginW">'+t[5]+'</button></div></div><div class="w-demo"></div></div></div>'}catch(e){}})();`;
const p = new URL('app/index.html', root); let html = fs.readFileSync(p, 'utf8');
const block = `<!--hero--><script>${js}</script><!--/hero-->`;
html = /<!--hero-->[\s\S]*?<!--\/hero-->/.test(html) ? html.replace(/<!--hero-->[\s\S]*?<!--\/hero-->/, () => block) : html.replace('<main id="view" class="view" tabindex="-1"></main>', m => m + '\n      ' + block);
fs.writeFileSync(p, html);
console.log('✓ gen-hero: ' + Object.keys(T).length + ' ngôn ngữ, ' + block.length + ' byte');
