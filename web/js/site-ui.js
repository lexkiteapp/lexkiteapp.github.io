/* SINH TỰ ĐỘNG từ scripts/lib/site-layout.mjs (LSW_JS + TSW_JS + LANG_JS + FOOT_JS) – sửa ở đó rồi chạy node scripts/build-landing.mjs */
(function (w, d) {
function init(r) {
var b = r.querySelector('[aria-haspopup]'), m = r.querySelector('[role=menu]');
if (r.lsw || !b || !m) return; r.lsw = 1;
var all = function () { return [].slice.call(m.querySelectorAll('[role^=menuitem]')); };
var go = function (a, i) { if (a[i]) a[i].focus(); };
var close = function (f) { if (m.hidden) return; m.hidden = true; b.setAttribute('aria-expanded', 'false'); if (f) b.focus(); };
var open = function (last) {
var a = all(), i = 0, q;
m.hidden = false; b.setAttribute('aria-expanded', 'true');
m.classList.remove('lsw-s'); q = m.getBoundingClientRect(); if (q.left < 0 || q.right > d.documentElement.clientWidth) m.classList.add('lsw-s');
a.forEach(function (x, k) { if (x.getAttribute('aria-current') || x.getAttribute('aria-checked') == 'true') i = k; });
go(a, last ? a.length - 1 : i);
};
b.onclick = function () { if (m.hidden) open(); else close(); };
b.onkeydown = function (e) { if (/^Arrow(Up|Down)$/.test(e.key)) { e.preventDefault(); open(e.key == 'ArrowUp'); } };
m.onkeydown = function (e) {
var a = all(), n = a.length, i = a.indexOf(d.activeElement), k = e.key, j;
if (k == 'Escape') { e.preventDefault(); close(1); } else if (k == 'Tab') close();
else if (/^(Arrow(Up|Down)|Home|End)$/.test(k)) { e.preventDefault(); go(a, k == 'Home' ? 0 : k == 'End' ? n - 1 : (i + (k == 'ArrowDown' ? 1 : n - 1)) % n); }
else if (k == ' ' && a[i] && a[i].href) { e.preventDefault(); a[i].click(); }
else if (k.length == 1 && !e.ctrlKey && !e.metaKey && !e.altKey) for (j = 1; j <= n; j++) if (!a[(i + j) % n].textContent.toLowerCase().indexOf(k.toLowerCase())) { go(a, (i + j) % n); break; }
};
m.onclick = function (e) {
var a = e.target.closest('[role^=menuitem]'); if (!a) return;
try { localStorage.setItem('vb.uiLang', a.lang); } catch (x) {  }
close(1);
};
d.addEventListener('click', function (e) { if (!r.contains(e.target)) close(); });
r.addEventListener('focusout', function (e) { if (e.relatedTarget && !r.contains(e.relatedTarget)) close(); });
}
var run = function () { [].forEach.call(d.querySelectorAll('[data-lsw]'), init); };
w.LkLangMenu = init;
if (d.readyState == 'loading') d.addEventListener('DOMContentLoaded', run); else run();
})(window, document);
(function(d,r,K){var O=['auto','light','dark'],c=function(){return r.getAttribute('data-theme')||'auto'},f=function(t){t=='light'||t=='dark'?r.setAttribute('data-theme',t):r.removeAttribute('data-theme');[].forEach.call(d.querySelectorAll('[data-tsw]'),function(b){var L=b.getAttribute('data-l').split('|');b.title=L[3]+': '+L[O.indexOf(c())];b.setAttribute('aria-label',b.title)})};f(c());d.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-tsw]'),t=O[(O.indexOf(c())+1)%3],s,n=Date.now(),p;if(!b)return;f(t);try{s=localStorage;t=='auto'?s.removeItem(K):s.setItem(K,t);s.setItem('lk.themeAt',n);p=JSON.parse(s.getItem('ielts.settings')||'0');if(p&&typeof p=='object'&&!Array.isArray(p)){p.theme=t;s.setItem('ielts.settings',JSON.stringify(p));s.setItem('ielts.settingsAt',n)}}catch(x){}});addEventListener('storage',function(e){if(e.key==K)f(e.newValue);else if(e.key=='ielts.settings'&&typeof lkT=='function')f(lkT())})})(document,document.documentElement,'lk.theme');
(function(d){var S='vi en es pt fr de id th zh ja ko hi ar ru tr'.split(' '),s,L,M='[data-lsw],.flang,.flangs';try{s=localStorage;L=s.getItem('vb.uiLang')||s.getItem('lk.lang')}catch(e){return}
d.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[hreflang]');if(a&&a.closest(M)&&S.indexOf(a.hreflang)>=0)try{s.setItem('lk.lang',a.hreflang);s.setItem('vb.uiLang',a.hreflang)}catch(x){}},true);
if(S.indexOf(L)<0)return;[].forEach.call(d.querySelectorAll('a[href^="/"]'),function(a){if(a.closest(M)||a.hasAttribute('hreflang'))return;var h=a.getAttribute('href'),m,n;
if(m=h.match(/^\/app\/(\?hl=[a-z]{2})?(#.*)?$/))n='/app/'+(L=='vi'?'':'?hl='+L)+(m[2]||'');else if(h=='/'||(m=h.match(/^\/([a-z]{2})\/$/))&&S.indexOf(m[1])>=0)n=L=='vi'?'/':'/'+L+'/';else if((m=h.match(/^\/([a-z]{2})\/blog\/$/))&&S.indexOf(m[1])>=0)n='/'+L+'/blog/';
if(n&&n!=h)a.setAttribute('href',n)})})(document);
(function(d){var q=window.matchMedia?matchMedia('(max-width:720px)'):{matches:!1},G=d.querySelectorAll('.fg'),F=function(){[].forEach.call(G,function(x,i){x.open=!q.matches||!i})};F();q.addEventListener&&q.addEventListener('change',F);
[].forEach.call(G,function(x){x.addEventListener('toggle',function(){if(!q.matches&&!x.open)x.open=true})});
d.addEventListener('click',function(e){[].forEach.call(d.querySelectorAll('.flang[open]'),function(x){if(!x.contains(e.target))x.open=false})});d.addEventListener('keydown',function(e){var x=e.key=='Escape'&&e.target.closest&&e.target.closest('.flang[open]');if(x){x.open=false;x.querySelector('summary').focus()}})})(document);
window.LkUi=1;
