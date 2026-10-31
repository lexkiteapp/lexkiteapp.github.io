// 🎨 Blog theo Stitch v2.1 (mẫu brand/stitch/web/post-*.html + hub-*.html): phần dựng lúc build mà khung tự sinh không làm được.
//   1) Thân bài: HTML markdown của render() (build-blog.mjs – vẫn sinh thẻ trơn để ô quảng cáo giữa bài/watermark/JSON-LD giữ nguyên) → khuôn Stitch
//      của mẫu bài viết: bind/post.json `protos` (h2/h3/h4, đoạn mở đầu 18 px, đoạn thường, danh sách ✓ / số, bảng, trích dẫn = hộp info, hình,
//      khung CTA "drill", FAQ = accordion <details>, mini-quiz = thẻ Self-Check). Mọi class lấy từ khuôn (không đặt màu/cỡ mới) – vài lớp bố cục
//      (ảnh lấp khung, khoảng đệm p-4 của chú thích/khối mã, gạch chân liên kết trong đoạn) là lớp có sẵn trong mẫu, ghi ở đây cho Tailwind biên dịch.
//   2) CSS phần cũ không có chỗ trong mẫu (khung video YouTube, sơ đồ SVG, menu ngôn ngữ, ô quảng cáo) – lấy nguyên từ CSS cũ, màu qua token --st-*.
// File này là "file dựng dữ liệu" của nhóm CSS w-post / w-hub (scripts/build-stitch-css.mjs WEBDATA) – class viết nguyên văn ở đây được biên dịch.
// @icons quiz translate smart_display
import { protos } from './st-web.mjs';
import { CSS as OLD_CSS, LSW_CSS, STW_VARS } from './site-layout.mjs';

export const IMG_FILL = 'w-full h-full object-cover';                 // ảnh bìa / thẻ liên quan / ảnh poster trong ô icon (img của mẫu)
export const IMG_ABS = 'absolute inset-0 w-full h-full object-cover'; // ảnh thẻ hub + thẻ nổi bật (nằm dưới viên chuyên mục / thời gian đọc)
export const EMPTY_CLS = 'text-base font-medium leading-relaxed';      // chữ "bài đầu tiên sắp ra mắt" (lớp đoạn giới thiệu hub)
export const TAGS_CLS = 'flex flex-wrap gap-2';                       // hàng thẻ #tag (viên chuyên mục của mẫu, liên kết inline)
export const CRUMB_A = 'underline inline-flex items-center justify-center min-h-[44px] min-w-[44px]';                                 // liên kết đường dẫn trong viên đầu hero hub
const PRE_X = 'p-4 font-mono text-[14px] leading-[20px]', CAP_X = 'p-4', LINK_X = 'underline';

const O = (f, d = {}) => f({ ...d, html: '\u0000' }).split('\u0000'); // khuôn → [thẻ mở, thẻ đóng]
const clsOf = h => (h.match(/class="([^"]*)"/) || [, ''])[1];
const keep = (c, re) => c.split(/\s+/).filter(x => re.test(x)).join(' ');
const addCls = (h, x) => h.replace('class="', `class="${x} `);

// Bộ khuôn theo ngôn ngữ (chữ tĩnh trong khuôn – vd "FREE INTERACTIVE DRILL" – đã dịch)
const KITS = {};
export function kit(lang) {
  if (KITS[lang]) return KITS[lang];
  const P = protos('post', lang), [liO, litC] = O(P.li), [oliO] = O(P.oli), [litO] = O(P.litext), [ulO] = O(P.ul), [strongO] = O(P.strong);
  const [tableO] = O(P.table), [thrO] = O(P.thr), [thO] = O(P.th), [tbodyO] = O(P.tbody), [trO] = O(P.tr), [tdO] = O(P.td);
  return (KITS[lang] = { ...P, liO, litC, oliO, litO, ulO, olO: ulO.replace('<ul', '<ol'), strongO, tableO, thrO, thO, tbodyO, trO, tdO,
    aCls: `${keep(clsOf(P.link({ html: '' })), /^((lt|dk):)?text-\[#/)} ${LINK_X}`, // màu liên kết "View all articles" + gạch chân (không chỉ phân biệt bằng màu)
    codeCls: keep(clsOf(P.code({ html: '' })), /^(font-mono|font-bold|((lt|dk):)?text-\[#)/), // chữ mono của cột "Example Headwords"
    preCls: `${clsOf(P.tbl({ html: '' }))} ${PRE_X}` });
}

// ---- chữ trong đoạn: in đậm, liên kết, mã ----
const inl = (h, K) => h.replace(/<strong>/g, K.strongO)
  .replace(/<a (?![^>]*\bclass=)/g, `<a class="${K.aCls}" `).replace(/<a ([^>]*?)class="app"/g, `<a $1class="app ${K.aCls}"`)
  .replace(/<code>/g, `<code class="${K.codeCls}">`);
// ---- bảng (markdown + bảng so sánh của sơ đồ) ----
const attrIn = (open, a) => a ? open.slice(0, -1) + a + '>' : open;
const tableSt = (h, K) => h.replace(/<table>/g, K.tableO).replace(/<thead><tr>/g, '<thead>' + K.thrO).replace(/<tbody>/g, K.tbodyO).replace(/<tr>/g, K.trO)
  .replace(/<th(\s[^>]*)?>/g, (m, a) => attrIn(K.thO, a)).replace(/<td(\s[^>]*)?>/g, (m, a) => attrIn(K.tdO, a));
const tbls = (h, K) => h.replace(/<div class="tbl" tabindex="0">(<table>[\s\S]*?<\/table>)<\/div>/g, (m, t) => K.tbl({ html: tableSt(t, K) }));
// ---- danh sách: ul → ✓ check_circle · ol → ô số "01" của mẫu ----
function lists(h, K) {
  const st = [];
  return h.replace(/<(\/?)(ul|ol|li)>/g, (m, c, t) => {
    if (t !== 'li') { if (!c) { st.push({ t, n: 0 }); return t === 'ul' ? K.ulO : K.olO; } st.pop(); return m; }
    const top = st[st.length - 1]; if (!top) return m;
    if (c) return K.litC;
    top.n++; return top.t === 'ol' ? K.oliO + K.num({ n: String(top.n).padStart(2, '0') }) + K.litO : K.liO;
  });
}
const caps = (h, K) => h.replace(/<figcaption>([\s\S]*?)<\/figcaption>/g, (m, c) => addCls(K.cap({ html: inl(c, K) }), CAP_X));

// Một khối cấp cao nhất của thân bài → HTML Stitch. st.lead: đoạn đầu tiên của bài dùng khuôn đoạn mở đầu (18 px).
function block(raw, K, st) {
  let m;
  if ((m = raw.match(/^<p>([\s\S]*)<\/p>$/))) { const f = st.lead ? K.lead : K.p; st.lead = false; return f({ html: inl(m[1], K) }); }
  if ((m = raw.match(/^<h([34]) id="([^"]*)">([\s\S]*)<\/h\1>$/))) return K['h' + m[1]]({ id: m[2], html: inl(m[3], K) });
  if (raw.startsWith('<div class="tbl"')) return tbls(inl(raw, K), K);
  if (/^<(ul|ol)>/.test(raw)) return lists(inl(raw, K), K);
  if ((m = raw.match(/^<blockquote>([\s\S]*)<\/blockquote>$/))) return K.quote({ html: inl(m[1], K) });
  if (raw.startsWith('<figure><picture>')) return K.fig({ html: caps(raw.slice(8, -9), K) });
  if (raw.startsWith('<figure class="diagram')) return caps(tbls(raw, K), K);
  if (raw.startsWith('<div class="yt"')) return K.fig({ html: raw });
  if ((m = raw.match(/^<pre><code>([\s\S]*)<\/code><\/pre>$/))) return `<pre class="${K.preCls}"><code>${m[1]}</code></pre>`;
  if (raw === '<hr>') return K.hr({});
  if ((m = raw.match(/^<aside class="cta( cta-topic)?"><p><strong>([\s\S]*?)<\/strong><\/p><a class="btn" href="([^"]*)"( data-hit="([^"]*)")?>([\s\S]*?)<\/a><\/aside>$/)))
    return K.cta({ h: inl(m[2], K), href: m[3].replace(/&amp;/g, '&'), hit: m[5] || '', btn: m[6].replace(/\s*[→←]\s*/g, ' ').trim() }); // mũi tên chữ → icon arrow_forward của mẫu
  return inl(raw, K); // ô quảng cáo giữ chỗ, chú thích HTML…
}

// Thân bài (các khối cấp cao nhất, đã chèn ô quảng cáo giữa bài + watermark) → các <section> của mẫu (mỗi h2 một section; FAQ = accordion)
export function stitchBody(pieces, K, faqRe) {
  const txt = h => h.replace(/<[^>]+>/g, ''), st = { lead: true }, secs = [{ id: '', blocks: [] }]; let faq = null, m;
  for (const raw of pieces) {
    const cur = secs[secs.length - 1];
    if ((m = raw.match(/^<h2 id="([^"]*)">([\s\S]*)<\/h2>$/))) {
      faq = faqRe.test(txt(m[2])) ? { id: m[1], h: inl(m[2], K), intro: '', items: [] } : null;
      secs.push(faq ? { faq } : { id: m[1], blocks: [K.h2({ id: m[1], html: inl(m[2], K) })] }); continue; }
    if (faq && (m = raw.match(/^<h3 id="([^"]*)">([\s\S]*)<\/h3>$/))) { faq.items.push({ id: m[1], q: inl(m[2], K), a: [] }); continue; }
    if (faq) { const q = faq.items[faq.items.length - 1], h = /^<p>/.test(raw) ? `<p>${inl(raw.slice(3, -4), K)}</p>` : block(raw, K, { lead: false }); if (q) q.a.push(h); else faq.intro += h; continue; }
    cur.blocks.push(block(raw, K, st));
  }
  return secs.map(s => s.faq ? (s.faq.items.length ? K.faq({ ...s.faq, items: s.faq.items.map(q => ({ ...q, a: `<div class="space-y-3">${q.a.join('')}</div>` })) })
    : K.sec({ id: s.faq.id, html: K.h2({ id: s.faq.id, html: s.faq.h }) + s.faq.intro }))
    : s.blocks.length ? K.sec({ id: s.id, html: s.blocks.join('') }) : '').join('');
}
// Mini-quiz: bản tĩnh (đáp án trong <details> – đọc được khi không có JS) trong thẻ Self-Check của mẫu; quiz.js thay nội dung .blog-quiz bằng bản tương tác
export const stitchQuiz = (K, { label, attrs, summary, items }) => K.quiz({ h: label, html: `<section class="blog-quiz" ${attrs}>${K.qa({ q: summary, a: lists(`<ol>${items}</ol>`, K) })}</section>` });

// ---- CSS phần cũ không có chỗ trong mẫu (nguyên luật cũ, màu qua token Stitch) ----
const pick = (css, re) => (css.match(/[^{}]+\{[^{}]*\}/g) || []).filter(r => re.test(r.slice(0, r.indexOf('{')))).join('');
export const LEGACY_CSS = '[hidden]{display:none!important}[data-dismissed="1"]{display:none!important}' + STW_VARS +
  '.skip{position:absolute;left:8px;top:-60px;background:var(--surface);color:var(--text);padding:8px 12px;z-index:60}.skip:focus{top:8px}[dir=rtl] .skip:not(:focus){left:auto;right:-999px}[dir=rtl] .skip:focus{left:auto;right:8px}' +
  pick(OLD_CSS, /^\s*\.(yt|diagram)\b/) + LSW_CSS + '.lsw-m{z-index:60}';
// lọc thẻ trên trang hub (ô tìm của mẫu): ẩn thẻ không khớp, cập nhật số đang hiện
export const HUB_JS = `(function(d){var q=d.querySelector('[data-hub-q]'),n=d.querySelector('[data-hub-n]');if(!q||!n)return;var it=[].slice.call(d.querySelectorAll('[data-hub-item]')),p=n.textContent.split('/'),tot=p[1];q.addEventListener('input',function(){var v=q.value.trim().toLowerCase(),c=0;it.forEach(function(e){var s=!v||e.textContent.toLowerCase().indexOf(v)>=0;e.hidden=!s;if(s)c++});n.textContent=c+(tot!=null?' /'+tot:'')})})(document);`;
