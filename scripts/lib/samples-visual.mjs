// Lớp "lướt bằng mắt" cho họ trang thư viện (/samples/, /speaking/, /tu-vung/, /ngu-phap/, /viet-thu/, /phat-am/ + bản /en/): docs/specs/samples-visual.md.
// Bố cục theo bản vẽ Stitch sv-hub (brand/stitch/web-library/); huy hiệu web/img/lib/*.svg tách từ tờ Stitch bằng scripts/stitch/art-extract.mjs.
// Đề bài đầy đủ vẫn là chữ hiển thị trên thẻ (kẹp 2 dòng), không ẩn – scripts/test/samples-seo-parity.mjs đỏ nếu mất chữ/link/thẻ SEO.
// Không import samples-ui/site-layout để site-layout nạp được file này (tránh vòng lặp).
import fs from 'node:fs';
import { teacher } from './st-web.mjs';

export const VIS_S = { vi: { more: 'Xem thêm bộ lọc', back: 'Bộ lọc trước' }, en: { more: 'More filters', back: 'Previous filters' } };

export const scrollBtns = lang => { const t = VIS_S[lang] || VIS_S.en; return `<button type="button" class="tfb tfb-l" aria-label="${t.back}"></button><button type="button" class="tfb tfb-r" aria-label="${t.more}"></button>`; };

// Hình: <img> ngoài (đệm dài, không phình HTML), có sẵn cỡ → CLS 0, lười tải; trang trí nên alt rỗng
export const art = (name, size = 56, cls = 'vart') => `<img class="${cls}" src="/img/lib/${name}.svg" width="${size}" height="${size}" alt="" loading="lazy" decoding="async">`;
const TYPE_ART = { 'Agree/Disagree': 'ad', Discussion: 'di', 'Problem–Solution': 'ps', 'Advantages–Disadvantages': 'av', 'Positive/Negative': 'pn', 'Two-part question': 'tp' };
export const typeArt = ty => TYPE_ART[ty] || 'doc';
const TOPICS = new Set(['education', 'technology', 'environment', 'work', 'travel', 'health', 'media', 'urban', 'architecture', 'society', 'culture', 'sport', 'food', 'consumerism', 'language', 'science', 'wildlife', 'government', 'crime', 'economy']);
export const topicArt = t => TOPICS.has(t) ? t : 'q';
export const toneArt = t => ({ formal: 'formal', 'semi-formal': 'semi', informal: 'informal' }[t] || 'letter');
export const task1Art = t => ({ line: 't-line', bar: 't-bar', pie: 't-pie', table: 't-table', process: 't-process', map: 't-map' }[t] || 'doc');
export const vocabArt = (id, group) => TOPICS.has(id) ? id : ({ topics: 'v-topics', writing: 'v-writing', speaking: 'v-speaking', awl: 'v-awl', core: 'v-core', toeic: 'v-toeic', domain: 'v-domain', exam: 'v-exam' }[group] || 'v-topics');
export const unitArt = u => ({ foundation: 'g-foundation', tenses: 'g-tenses', verbs: 'g-verbs', words: 'g-words', sentences: 'g-sentences', academic: 'g-academic' }[u] || 'notebook');
export const pronArt = g => ({ vowels: 'p-vowels', diphthongs: 'p-diphthongs', consonants: 'p-consonants', vn: 'p-vn', stress: 'p-stress' }[g] || 'audio');

// Tiêu đề ngắn trên thẻ: content/seo-en/sample-keys.json. Thiếu file (nội dung chuyển repo private, CONTENT-PROTECTION) hay thiếu khóa → vài từ đầu của đề.
let KEYS;
const keys = () => { if (KEYS) return KEYS; try { KEYS = JSON.parse(fs.readFileSync('content/seo-en/sample-keys.json', 'utf8')); } catch { KEYS = {}; } return KEYS; };
export const shortOf = (text, n = 6) => { const w = String(text).split(/[.?!]/)[0].trim().split(/\s+/); return w.slice(0, n).join(' ') + (w.length > n ? '…' : ''); };
export const t2Key = (id, lang, text) => keys().t2?.[id]?.[lang] || shortOf(text);
// Đề Task 1 "The line graph shows the percentage of…" → "Percentage of…"
export const t1Key = title => { const s = shortOf(String(title).replace(/^The [a-z ]+? (shows?|illustrates?|compares?|gives?|describes?) (the |how |information about )?/i, ''), 7); return s.charAt(0).toUpperCase() + s.slice(1); };

// Giáo viên trên sàn phần đầu trang (chỉ Ama/Carlos 2D, chạm mép dưới thẻ – không thân mờ)
const MOOD = { think: ['ama', 'thinking'], happy: ['carlos', 'happy'], cheer: ['ama', 'cheer'] };
export const heroTeacher = mood => { const [w, p] = MOOD[mood] || MOOD.happy; return `<span class="vh-t">${teacher(w, p, { size: 220 }).replace(' loading="lazy"', '')}</span>`; };

// Lưới khối: desktop 4 cột, điện thoại 2 cột, không để hở ô. Trả về kiểu từng ô: d2 = rộng 2 ở desktop, p2 = rộng 2 ở điện thoại.
export function bentoSpans(n) {
  const out = Array.from({ length: n }, () => ''), set = (i, c) => { out[i] = (out[i] + ' ' + c).trim(); };
  // Mỗi hàng đủ 4 đơn vị: 3 ô (1 ô rộng, luân phiên đầu/cuối hàng), 2 ô rộng, hoặc 4 ô thường
  for (let i = 0, flip = false; i < n;) { const left = n - i;
    if (left === 4) break;
    if (left <= 2) { for (let k = 0; k < left; k++) set(i + k, 'd2'); break; }
    set(flip ? i + 2 : i, 'd2'); i += 3; flip = !flip; }
  if (n % 2 === 1) set(0, 'p2'); else if (n > 2) { set(0, 'p2'); set(n - 1, 'p2'); }
  return out;
}

const icon = p => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E${p}%3C/svg%3E")`;
const I_W = icon("%3Cpath d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/%3E%3Cpath d='M14 2v6h6M16 13H8M16 17H8'/%3E"), I_P = icon("%3Cpath d='m12 3-1.9 5.8L4 11l6.1 2.2L12 19l1.9-5.8L20 11l-6.1-2.2z'/%3E"), I_T = icon("%3Ccircle cx='12' cy='12' r='9'/%3E%3Cpath d='M12 7v5l3 2'/%3E"), I_Q = icon("%3Cpath d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'/%3E"), I_C = icon("%3Cpath d='m9 18 6-6-6-6'/%3E");
const mask = u => `-webkit-mask:${u} center/contain no-repeat;mask:${u} center/contain no-repeat`;

// CSS chung cả họ (chèn trong seoPage). Chỉ token thương hiệu; huy hiệu tự mang màu nên hợp cả sáng lẫn tối.
export const VIS_CSS = `.vart{display:block;flex:none;object-fit:contain}
.card.vc{position:relative;border-width:2px;border-radius:20px;box-shadow:0 3px 0 var(--line);transition:transform .15s,border-color .15s}
.card.vc:hover,.card.vc:focus-within{transform:translateY(-2px);border-color:var(--tc,var(--accent));box-shadow:0 5px 0 var(--line)}
.card.vc .bd{display:flex;flex-direction:column;gap:6px;height:100%;box-sizing:border-box;padding:14px 16px}
.vc-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.card.vc h3.vc-t,.card.vc h2.vc-t{font-size:19px;line-height:1.25;font-weight:800;letter-spacing:-.01em;margin:4px 0 0;color:var(--text);overflow-wrap:anywhere}
.card.vc p.vc-q{margin:0;font-size:14.5px;line-height:1.45;color:var(--muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.vc-k{font-size:12px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.ring{--v:.89;flex:none;display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:conic-gradient(var(--tc,var(--accent)) calc(var(--v)*360deg),var(--line) 0)}
.ring b{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:var(--surface);color:var(--text);font-size:13.5px;font-weight:800;font-variant-numeric:tabular-nums}
.vc-m{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:auto;padding-top:8px;font-size:13.5px;font-weight:700;color:var(--muted)}
.vm{display:inline-flex;align-items:center;gap:5px;font-variant-numeric:tabular-nums}.vm::before{content:"";width:16px;height:16px;flex:none;background:currentColor}
.vm-w::before{${mask(I_W)}}.vm-p::before{${mask(I_P)}}.vm-t::before{${mask(I_T)}}.vm-q::before{${mask(I_Q)}}
.vu{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.card.vc .chips{margin-top:auto;padding-top:8px}
@media (min-width:700px){.grp>.grid>.vc:first-child{grid-column:span 2}.grp>.grid>.vc:first-child .vart{width:72px;height:72px}.grp>.grid>.vc:first-child .vc-t{font-size:25px}.grp>.grid>.vc:first-child p.vc-q{font-size:16px;-webkit-line-clamp:3}}
.grp>h2.vg{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.grp>h2.vg::before{display:none!important}.grp>h2.vg .vart{width:44px;height:44px}
.vb{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:18px 0}
.vb-i{--tc2:var(--tc,var(--accent));display:flex;flex-direction:column;gap:8px;justify-content:space-between;min-height:128px;box-sizing:border-box;padding:14px;background:var(--surface);border:2px solid var(--line);border-radius:20px;box-shadow:0 3px 0 var(--line);color:var(--text);text-decoration:none;transition:transform .15s,border-color .15s}
.vb-i:hover,.vb-i:focus-visible{transform:translateY(-2px);border-color:var(--tc2)}
.vb-i .row{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
.vb-i b{font-size:15.5px;line-height:1.25;font-weight:800;overflow-wrap:break-word}.vb-i .n{flex:none;min-width:30px;text-align:center;padding:2px 9px;border-radius:999px;background:var(--bg);border:1px solid var(--line);font-size:13px;font-weight:800;font-variant-numeric:tabular-nums}
.vb-i.p2{grid-column:span 2}
@media (min-width:700px){.vb{grid-template-columns:repeat(4,minmax(0,1fr))}.vb-i.p2{grid-column:auto}.vb-i.d2{grid-column:span 2}.vb-i.d2 .vart{width:80px;height:80px}.vb-i.d2 b{font-size:20px}}
.smp .hero2.vh{display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:16px;padding:22px 22px 0;background:linear-gradient(160deg,var(--surface) 55%,var(--accent-soft))}
.vh-c{padding-bottom:22px;min-width:0}
.vh-t{align-self:end;display:block;width:220px;overflow:hidden;line-height:0}.vh-t img{display:block;width:100%;height:auto;margin-bottom:-13%}
.smp .hero2.vh .stats{margin-top:16px}
@media (max-width:720px){.smp .hero2.vh{grid-template-columns:minmax(0,1fr) 124px;grid-template-rows:auto auto auto auto;padding:16px 12px 14px 16px;column-gap:4px}.vh-c{display:contents}.vh-c>.kick,.vh-c>h1,.vh-c>.lead{grid-column:1}.vh-t{grid-column:2;grid-row:1/4;width:124px}.smp .hero2.vh .stats{grid-column:1/-1;grid-row:4;margin-top:0;padding-top:12px;border-top:2px solid var(--line);max-width:none;grid-template-columns:repeat(2,minmax(0,1fr))}}
.stats.vs{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,108px),1fr));gap:8px;max-width:520px}
.stats.vs li{display:grid;grid-template-columns:auto minmax(0,1fr);column-gap:8px;align-items:center;align-content:center;padding:8px 10px;border-width:2px;border-radius:16px;background:var(--surface);box-shadow:0 2px 0 var(--line)}
.stats.vs .vart{grid-column:1;grid-row:1/3;width:34px;height:34px}.stats.vs b{grid-column:2;grid-row:1;font-size:19px;line-height:1.15;overflow-wrap:anywhere}.stats.vs span{grid-column:2;grid-row:2;font-size:12.5px;line-height:1.25;overflow-wrap:anywhere}
.stats.vs .band{background:var(--surface);border-color:var(--line);color:var(--muted)}.stats.vs .band b{color:var(--text)}
.smp-doc .hero2{padding-right:96px}.smp-doc .hero2::after{content:"";position:absolute;right:18px;top:20px;width:64px;height:64px;background:var(--vart) center/contain no-repeat}
.smp-doc{--vart:url(/img/lib/doc.svg)}.smp-doc.narrow{--vart:url(/img/lib/v-speaking.svg)}.smp-doc.t-ad{--vart:url(/img/lib/ad.svg)}.smp-doc.t-di{--vart:url(/img/lib/di.svg)}.smp-doc.t-av{--vart:url(/img/lib/av.svg)}.smp-doc.t-tp{--vart:url(/img/lib/tp.svg)}.smp-doc.t-fo{--vart:url(/img/lib/formal.svg)}
.smp-doc.t-ps{--vart:url(/img/lib/ps.svg)}.smp-doc.t-pn{--vart:url(/img/lib/pn.svg)}.smp-doc.narrow[class*=t-]{--vart:url(/img/lib/v-speaking.svg)}
.tfw{position:relative}.tfw>nav{scroll-snap-type:x proximity;scrollbar-width:none;scroll-padding:0 48px}.tfw>nav::-webkit-scrollbar{display:none}.tfw>nav a{scroll-snap-align:start}
@media (max-width:720px){.tfw>.cats{flex-wrap:nowrap;overflow-x:auto;padding:2px 2px 8px;margin:10px 0 0}.tfw>.cats a{flex:none;white-space:nowrap}}
.tfw::before,.tfw::after{content:"";position:absolute;top:0;bottom:6px;width:56px;pointer-events:none;opacity:0;transition:opacity .15s}
.tfw::before{left:0;background:linear-gradient(90deg,var(--bg) 35%,transparent)}.tfw::after{right:0;background:linear-gradient(270deg,var(--bg) 35%,transparent)}
.tfw.has-l::before,.tfw.has-r::after{opacity:1}
.tfb{position:absolute;z-index:1;top:2px;width:44px;height:44px;border-radius:50%;border:2px solid var(--line);background:var(--surface);color:var(--text);cursor:pointer;box-shadow:0 2px 0 var(--line);display:none;padding:0}
.tfb::before{content:"";display:block;width:20px;height:20px;margin:auto;background:currentColor;${mask(I_C)}}
.tfb-l{left:0}.tfb-l::before{transform:scaleX(-1)}.tfb-r{right:0}.tfw.has-l .tfb-l,.tfw.has-r .tfb-r{display:block}
[dir=rtl] .tfb-l{left:auto;right:0}[dir=rtl] .tfb-r{right:auto;left:0}[dir=rtl] .tfb-l::before{transform:none}[dir=rtl] .tfb-r::before{transform:scaleX(-1)}
/* Không cắt chữ, không giấu mục ngoài màn: breadcrumb xuống dòng thay vì "…"; dàn bài trên điện thoại xếp nhiều hàng thay vì cuộn ngang không dấu hiệu */
.crumbs [aria-current]{white-space:normal;overflow:visible;text-overflow:clip;min-width:0;overflow-wrap:anywhere}
@media (max-width:999px){.outline ol{flex-wrap:wrap;overflow:visible}}
@media (prefers-reduced-motion:reduce){.card.vc,.vb-i,.tfw::before,.tfw::after{transition:none}.card.vc:hover,.card.vc:focus-within,.vb-i:hover,.vb-i:focus-visible{transform:none}}
@media print{.vb,.vh-t,.tfb{display:none!important}}`;

// Hàng chip: hiện dấu cuộn đúng khi còn chỗ cuộn; khối bento bấm = chip lọc tương ứng rồi cuộn tới nhóm
export const VIS_JS = `(function(d){[].forEach.call(d.querySelectorAll('.tfw'),function(w){var s=w.querySelector('nav'),rtl=d.documentElement.dir==='rtl';function u(){var x=Math.abs(s.scrollLeft),m=s.scrollWidth-s.clientWidth;w.classList.toggle('has-l',x>2);w.classList.toggle('has-r',x<m-2)}s.addEventListener('scroll',u,{passive:true});addEventListener('resize',u);var c=s.querySelector('[aria-current]');if(c&&c.offsetLeft+c.offsetWidth>s.clientWidth)s.scrollLeft=c.offsetLeft-16;u();
[].forEach.call(w.querySelectorAll('.tfb'),function(b){b.addEventListener('click',function(){var n=b.classList.contains('tfb-r')?1:-1;s.scrollBy({left:(rtl?-n:n)*s.clientWidth*.7,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'})})})});
d.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('.vb-i[data-g]');if(!a)return;var i=a.getAttribute('data-g'),f=[].filter.call(d.querySelectorAll('.tf a'),function(x){return x.getAttribute('data-g')===i})[0];if(!f)return;e.preventDefault();f.click();f.scrollIntoView({block:'nearest',inline:'center'});var g=d.getElementById(i);if(g)g.scrollIntoView({block:'start'})})})(document);`;

// Khối đầu trang theo dạng/nhóm: items [[id nhóm, tên, số, lớp màu, hình]]
export const bento = (items, label, escF) => { const sp = bentoSpans(items.length);
  return `<nav class="vb" aria-label="${escF(label)}">${items.map(([id, name, n, cls, a], i) => `<a class="vb-i${cls ? ' ' + cls : ''}${sp[i] ? ' ' + sp[i] : ''}" href="#g-${id}" data-g="g-${id}"><span class="row">${art(a, 56)}<span class="n">${n}</span></span><b>${escF(name).replace(/\//g, '/<wbr>')}</b></a>`).join('')}</nav>`; };
