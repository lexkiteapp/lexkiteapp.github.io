// Giao diện riêng cho họ trang "bài mẫu" tĩnh: Writing Task 2 (/samples/, /en/samples/), IELTS Speaking (/speaking/, /en/speaking/),
// thư mẫu IELTS General (/viet-thu/). Dùng CHUNG hệ thiết kế của scripts/lib/site-layout.mjs (token màu, thẻ, chip, CTA) – file này
// chỉ thêm lớp .smp (CSS phạm vi riêng, chèn vào <head> bởi build-samples*.mjs) + JS nhỏ (~1.5 KB) cho popover nghĩa, bật/tắt tô màu, lọc theo dạng đề.
// Màu: chỉ token thương hiệu (docs/BRAND-RULES.md, EXTRA_TOKENS) – scripts/test/brand-check.mjs quét cả file này. Kit: chỉ từ web/js/kit.js.
// Chữ giao diện: S.vi / S.en (các trang này chỉ có 2 bản ngôn ngữ vi + en; x-default = en).
import fs from 'node:fs'; import vm from 'node:vm';
import { esc } from './site-layout.mjs';

// ---------- Chữ giao diện (vi / en) ----------
export const S = {
  vi: {
    prompt: 'Đề bài', task: 'Tình huống', outline: 'Dàn bài', legend: 'Chú thích màu', view: 'Hiển thị',
    legPh: 'Cụm từ hay – chạm để xem nghĩa', legLn: 'Từ nối', legLb: 'Vai trò của câu',
    tgHl: 'Tô màu', tgGl: 'Hiện nghĩa', print: 'In bài',
    para: (i, n) => `Đoạn ${i}/${n}`, words: 'từ', paras: 'đoạn', phrases: 'cụm từ', links: 'từ nối', min: n => `${n} phút đọc`, minL: 'phút đọc', questions: 'câu hỏi',
    prev: 'Bài trước', next: 'Bài sau', prevT: 'Chủ đề trước', nextT: 'Chủ đề sau', pagerL: 'Bài trước / bài sau',
    all: 'Tất cả', types: 'Lọc theo dạng đề', tones: 'Lọc theo giọng văn',
    save: ['Lưu các cụm từ này vào sổ của bạn', 'Mở bài mẫu trong app Lexkite, chạm vào cụm từ để lưu và ôn bằng flashcard.', 'Lưu trong app'],
    statEss: 'bài mẫu', statTypes: 'dạng đề', statBand: 'mỗi bài', statGl: 'cụm từ có nghĩa tiếng Việt', statTopics: 'chủ đề', statQ: 'câu trả lời mẫu', statLt: 'thư mẫu', statTone: 'giọng văn',
    parts: ['4–5 phút · câu hỏi quen thuộc về bản thân', '1 phút chuẩn bị · nói 1–2 phút', '4–5 phút · thảo luận sâu, trừu tượng hơn'], partsL: 'Các phần thi', vocab: 'Từ vựng',
    youShould: 'You should say:',
  },
  en: {
    prompt: 'Question', task: 'Task', outline: 'Structure', legend: 'Colour key', view: 'Display',
    legPh: 'High-scoring phrase', legLn: 'Linking word', legLb: 'Sentence role',
    tgHl: 'Highlights', tgGl: '', print: 'Print',
    para: (i, n) => `Paragraph ${i} of ${n}`, words: 'words', paras: 'paragraphs', phrases: 'phrases', links: 'linking words', min: n => `${n} min read`, minL: 'min read', questions: 'questions',
    prev: 'Previous sample', next: 'Next sample', prevT: 'Previous topic', nextT: 'Next topic', pagerL: 'Previous / next',
    all: 'All', types: 'Filter by question type', tones: 'Filter by tone',
    save: ['Save these phrases to your notebook', 'Open the model answer in Lexkite and tap any phrase to save it and review it with flashcards.', 'Save in the app'],
    statEss: 'model essays', statTypes: 'question types', statBand: 'every essay', statGl: 'highlighted phrases', statTopics: 'topics', statQ: 'sample answers', statLt: 'model letters', statTone: 'tones',
    parts: ['4–5 min · familiar questions about you', '1 min to prepare · speak for 1–2 min', '4–5 min · deeper, more abstract discussion'], partsL: 'Test parts', vocab: 'Useful language',
    youShould: 'You should say:',
  },
};

// ---------- Vai trò đoạn / câu (nhãn <<…>> trong dữ liệu là tiếng Việt) ----------
const ROLE = { 'Mở bài': ['intro', 'Introduction'], 'Kết bài': ['concl', 'Conclusion'], 'Lời chào': ['greet', 'Greeting'], 'Mục đích thư': ['intro', 'Purpose of the letter'], 'Kết thư': ['greet', 'Closing'] };
const roleOf = l => ROLE[l] || (/^Thân bài (\d+)/.test(l) ? ['body', `Body paragraph ${RegExp.$1}`] : /^Ý (\d+)/.test(l) ? ['body', `Point ${RegExp.$1}`] : null);
const SENT = { 'Câu chủ đề': ['ts', 'Topic sentence'], 'Giải thích': ['xp', 'Explanation'], 'Ví dụ': ['ex', 'Example'], 'Nhượng bộ': ['cv', 'Concession'], 'Quan điểm': ['op', 'Opinion'], 'Tổng quan': ['ov', 'Overview'] };
const plainOf = s => s.replace(/<<[^>]*>>\s*/g, '').replace(/\[\[([^|\]]*)\|[^\]]*\]\]/g, '$1').replace(/\{\{([^}]*)\}\}/g, '$1');
const snip = (s, n = 9) => { const w = s.trim().split(/\s+/); return w.slice(0, n).join(' ') + (w.length > n ? '…' : ''); };

// Bài mẫu có chú thích → các đoạn {role, label, html, snip}. lang 'en': nhãn tiếng Anh, không có nghĩa tiếng Việt.
export function parseDoc(text, lang, split = /\n\s*\n/) {
  const paras = text.split(split).map(p => p.trim()).filter(Boolean);
  return paras.map(p => {
    let role = 'body', label = '';
    const m = p.match(/^<<([^>]*)>>\s*/);
    if (m && roleOf(m[1])) { const r = roleOf(m[1]); role = r[0]; label = lang === 'en' ? r[1] : m[1]; p = p.slice(m[0].length); }
    const html = esc(p)
      .replace(/&lt;&lt;([^&]*)&gt;&gt;\s*/g, (_, l) => { const s = SENT[l] || ['xp', l]; return `<span class="lb lb-${s[0]}">${esc(lang === 'en' ? s[1] : l)}</span> `; })
      .replace(/\[\[([^|\]]*)\|([^\]]*)\]\]/g, (_, e, g) => lang === 'en' ? `<mark class="ph">${e}</mark>` : `<mark class="ph" tabindex="0" data-g="${g}" title="${g}">${e}</mark>`)
      .replace(/\{\{([^}]*)\}\}/g, '<b class="ln">$1</b>');
    return { role, label, html, snip: snip(plainOf(p)) };
  });
}
export const docStats = text => ({ phrases: (text.match(/\[\[/g) || []).length, links: (text.match(/\{\{/g) || []).length });
export const mins = words => Math.max(1, Math.round(words / 200));

// Thân bài mẫu: các thẻ đoạn có nhãn vai trò (id d1…dn để dàn bài nhảy tới)
export const docHtml = (paras, lang, wrap = '') => `<div class="ess2${wrap ? ' ' + wrap : ''}">${paras.map((p, i) => `<section class="para r-${p.role}" id="d${i + 1}"><div class="para-h">${p.label ? `<span class="role">${esc(p.label)}</span>` : '<span></span>'}<span class="pn">${S[lang].para(i + 1, paras.length)}</span></div><p>${p.html}</p></section>`).join('')}</div>`;

// Cột bên: dàn bài (nhảy tới đoạn) + chú thích màu + nút hiển thị. Dính (sticky) trên máy tính, dải gọn phía trên bài trên điện thoại.
export const sideHtml = (paras, lang, { gloss = lang === 'vi' } = {}) => { const t = S[lang];
  return `<div class="ess-side"><nav class="side-box outline" aria-labelledby="ol-h"><h2 id="ol-h">${t.outline}</h2><ol>${paras.map((p, i) => `<li><a class="r-${p.role}" href="#d${i + 1}"><span class="dot" aria-hidden="true"></span><span><b>${esc(p.label || t.para(i + 1, paras.length))}</b><small>${esc(p.snip)}</small></span></a></li>`).join('')}</ol></nav>
<div class="side-box legend"><h2>${t.legend}</h2><ul><li><mark class="ph">phrase</mark> ${t.legPh}</li><li><b class="ln">however</b> ${t.legLn}</li><li><span class="lb lb-ts">${lang === 'en' ? 'Topic sentence' : 'Câu chủ đề'}</span> ${t.legLb}</li></ul>
<div class="tools" role="group" aria-label="${t.view}"><button type="button" data-cls="plain" data-inv="1" aria-pressed="true">${t.tgHl}</button>${gloss ? `<button type="button" data-cls="gl-on" aria-pressed="false">${t.tgGl}</button>` : ''}<button type="button" data-print>${t.print}</button></div></div></div>`; };

// Dải số liệu dưới tiêu đề: [[giá trị, nhãn, lớp?]]
export const stats = items => `<ul class="stats">${items.filter(Boolean).map(([v, l, c]) => `<li${c ? ` class="${c}"` : ''}>${c === 'band' ? `<span>${esc(l)}</span><b>${esc(v)}</b>` : `<b>${esc(v)}</b><span>${esc(l)}</span>`}</li>`).join('')}</ul>`;

// Kit (linh vật) – lấy từ web/js/kit.js, tĩnh (không hoạt cảnh), trang trí → aria-hidden
let KIT;
export const kit = (mood = 'happy', size = 72) => { if (!KIT) { const c = {}; c.window = c.self = c; vm.createContext(c); vm.runInContext(fs.readFileSync('web/js/kit.js', 'utf8'), c); KIT = c.Kit; }
  return KIT.svg(mood, size, false).replace(/\s*role="img"\s*aria-label="[^"]*"/, ' aria-hidden="true" focusable="false"').replace(/<!--[\s\S]*?-->/g, '').replace(/>\s+</g, '><').trim(); };

// Phần đầu trang: dòng nhỏ (kicker) + h1 + mô tả + số liệu (+ Kit trên trang mục lục)
export const hero2 = ({ kicker = [], h1, lead = '', statsHtml = '', mood = '', cls = '' }) => `<header class="hero hero2${cls ? ' ' + cls : ''}">${kicker.length ? `<p class="kick">${kicker.map(k => `<span>${esc(k)}</span>`).join('<span aria-hidden="true">·</span>')}</p>` : ''}<h1>${h1}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}${statsHtml}${mood ? `<span class="kit">${kit(mood, 96)}</span>` : ''}</header>`;

// Ô đề bài / tình huống
export const promptBox = (label, inner, cls = '') => `<section class="prompt${cls ? ' ' + cls : ''}" aria-labelledby="pr-h"><h2 class="k" id="pr-h">${label}</h2>${inner}</section>`;

// Cụm từ & nghĩa → lưới thẻ (thay bảng 2 cột; trên điện thoại 1 cột). rows: [[cụm, nghĩa?]]
export const phraseCards = rows => `<ol class="phr">${rows.map(([e, v], i) => `<li><span class="n" aria-hidden="true">${i + 1}</span><span><b lang="en">${esc(e)}</b>${v ? `<span class="m">${esc(v)}</span>` : ''}</span></li>`).join('')}</ol>`;
export const saveBox = (href, lang) => { const t = S[lang].save; return `<div class="save"><span class="ic" aria-hidden="true">🔖</span><p><strong>${t[0]}</strong><small>${t[1]}</small></p><a class="btn" href="${href}">${t[2]} →</a></div>`; };

// CTA cuối bài có Kit
export const ctaKit = (href, title, btn, note = '', mood = 'cheer') => `<div class="cta2"><span class="kit">${kit(mood, 64)}</span><p><strong>${title}</strong>${note ? `<small>${note}</small>` : ''}</p><a class="btn" href="${href}">${btn} →</a></div>`;

// Bài trước / bài sau: [href, tiêu đề] | null
export const pager2 = (prev, next, lang, topic = false) => { const t = S[lang]; if (!prev && !next) return '';
  return `<nav class="pg2" aria-label="${t.pagerL}">${prev ? `<a rel="prev" href="${prev[0]}"><small>← ${topic ? t.prevT : t.prev}</small><span>${esc(prev[1])}</span></a>` : ''}${next ? `<a class="nx" rel="next" href="${next[0]}"><small>${topic ? t.nextT : t.next} →</small><span>${esc(next[1])}</span></a>` : ''}</nav>`; };

// ---------- Màu nhấn theo dạng đề / giọng văn / chủ đề ----------
const TYPE_C = { 'Agree/Disagree': 'ad', Discussion: 'di', 'Problem–Solution': 'ps', 'Advantages–Disadvantages': 'av', 'Positive/Negative': 'pn', 'Two-part question': 'tp' };
export const typeCls = ty => 't-' + (TYPE_C[ty] || 'x');
export const toneCls = tone => 't-' + ({ formal: 'fo', 'semi-formal': 'ps', informal: 'pn' }[tone] || 'x');
const TOPIC_EM = { education: '🎓', technology: '💻', environment: '🌿', work: '💼', travel: '✈️', health: '🩺', media: '📰', urban: '🏙️', architecture: '🏛️', society: '👥', culture: '🎭', sport: '⚽', food: '🍜', consumerism: '🛍️', language: '🗣️', science: '🔬', wildlife: '🦉', government: '⚖️' };
export const topicEmoji = t => TOPIC_EM[t] || '💬';
const PAL = ['di', 'ad', 'ps', 'av', 'pn', 'tp'];
export const topicCls = t => 't-' + PAL[[...String(t || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % PAL.length];

// Thẻ trong lưới (giữ .card.set + data-k để ô lọc chung của site-layout vẫn chạy)
export const smpCard = ({ href, cls = '', tag = '', emoji = '', title, desc = '', band = '', meta = [], key = '', h = 'h3' }) =>
  `<article class="card set sc ${cls}" data-k="${esc(key)}"><a class="ti" href="${href}"><div class="bd"><span class="sc-top">${tag ? `<span class="tchip">${esc(tag)}</span>` : '<span></span>'}${emoji ? `<span class="sc-em" aria-hidden="true">${esc(emoji)}</span>` : ''}</span><${h}>${esc(title)}</${h}>${desc ? `<p>${esc(desc)}</p>` : ''}<span class="sc-meta">${band ? `<span class="bnd">Band ${esc(band)}</span>` : ''}${meta.filter(Boolean).map(m => `<span>${esc(m)}</span>`).join('')}</span></div></a></article>`;

// Nhóm thẻ có màu nhấn; id = mốc cho chip lọc
export const group2 = (id, title, sub, cards, cls = '') => `<section class="grp ${cls}" aria-labelledby="g-${id}"><h2 id="g-${id}">${esc(title)} <small>${sub}</small></h2><div class="grid">${cards.join('')}</div></section>`;
// Chip lọc theo nhóm (không JS: là liên kết nhảy tới nhóm; có JS: ẩn/hiện nhóm)
export const typeFilter = (items, total, lang, label = S[lang].types) => `<nav class="tf" aria-label="${label}"><a href="#nd" data-g="">${S[lang].all} <b>${total}</b></a>${items.map(([id, name, n, cls]) => `<a class="${cls}" href="#g-${id}" data-g="g-${id}">${esc(name)} <b>${n}</b></a>`).join('')}</nav>`;

// JSON-LD danh sách (trang mục lục)
export const itemList = (name, urls) => ({ '@context': 'https://schema.org', '@type': 'ItemList', name, numberOfItems: urls.length, itemListElement: urls.map((url, i) => ({ '@type': 'ListItem', position: i + 1, url })) });

// ---------- CSS (phạm vi .smp – đè lên SEO_CSS chung nhờ độ đặc hiệu, không sửa site-layout.mjs) ----------
export const SMP_CSS = `.smp{--ac2:var(--accent);--tc:var(--ac2)}
@media (prefers-color-scheme:dark){.smp{--ac2:#7fd6cc}}
.t-ad{--tc:#E5502F}.t-di{--tc:#12807A}.t-ps{--tc:#FFB054}.t-av{--tc:#2FBF71}.t-pn{--tc:#FF8FA3}.t-tp{--tc:#FFC94A}.t-fo{--tc:var(--brand)}
.smp.page{max-width:1080px}.smp.narrow{max-width:820px}
.smp .hero2{position:relative;background:var(--surface);border:1px solid var(--line);border-radius:24px;padding:22px 22px 20px;margin:4px 0 18px;overflow:hidden}
.smp .hero2::before{content:"";position:absolute;left:0;right:0;top:0;height:5px;background:linear-gradient(90deg,#0F3D3E,#12807A 45%,#FFB054 78%,#E5502F)}
.smp .kick{display:flex;flex-wrap:wrap;gap:4px 8px;margin:4px 0 0;font-size:12.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--ac2)}
.smp .hero2 h1{font-size:clamp(26px,4vw,38px);line-height:1.2;margin:.25em 0 .15em;letter-spacing:-.02em;max-width:24em}
.smp .hero2 .lead{color:var(--muted);margin:.2em 0 0;max-width:60ch}
.smp .hero2.has-kit{padding-right:140px}.smp .hero2 .kit{position:absolute;right:22px;bottom:12px}
@media (max-width:720px){.smp .hero2.has-kit{padding-right:22px}.smp .hero2 .kit{display:none}.smp .hero2{border-radius:18px;padding:18px 16px 16px}}
.stats{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 0;padding:0;list-style:none}
.stats li{display:flex;align-items:baseline;gap:6px;background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:5px 12px;font-size:14px;color:var(--muted);line-height:1.5}
.stats b{font-size:18px;color:var(--text);font-variant-numeric:tabular-nums}
.stats .band{background:linear-gradient(135deg,#0F3D3E,#12807A);border-color:transparent;color:#fff;font-weight:700}.stats .band b{color:#FFC94A}
.smp .prompt{position:relative;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:16px 20px 16px 24px;margin:16px 0}
.smp .prompt::before{content:"";position:absolute;left:0;top:12px;bottom:12px;width:4px;border-radius:0 4px 4px 0;background:var(--tc)}
.smp .prompt .k{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:0 0 4px}
.smp .prompt>p{margin:0;font-size:18.5px;font-weight:600;line-height:1.55;max-width:62ch}.smp .prompt ul{margin:.5em 0 0;padding-left:22px}.smp .prompt .open{font-size:15px;color:var(--muted);margin-top:8px}
.smp .cta{border-radius:20px}
.ess-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;margin-top:8px}.ess-main{min-width:0}
@media (min-width:1000px){.ess-grid{grid-template-columns:minmax(0,1fr) 290px;gap:28px;align-items:start}.ess-side{grid-column:2;grid-row:1;position:sticky;top:16px;max-height:calc(100vh - 32px);overflow:auto}.ess-main{grid-column:1;grid-row:1}}
.ess-main>h2:first-child{margin-top:0}
.ess-side{display:flex;flex-direction:column;gap:12px;min-width:0}
.side-box{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:12px 14px}
.smp .side-box h2{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:0 0 8px;line-height:1.4}
.outline ol{list-style:none;margin:0;padding:0 0 2px;display:flex;gap:6px;overflow-x:auto;scrollbar-width:thin}
.outline a{display:flex;align-items:center;gap:8px;white-space:nowrap;border:1px solid var(--line);border-radius:999px;padding:4px 12px;font-size:14px;color:var(--text);text-decoration:none;line-height:1.4}
.outline a b{font-weight:700}.outline small{display:none}
.outline .dot{flex:none;width:9px;height:9px;border-radius:50%;background:var(--rc,var(--ac2))}
@media (min-width:1000px){.outline ol{flex-direction:column;gap:2px;overflow:visible}.outline a{white-space:normal;border:0;border-radius:10px;padding:6px 8px;align-items:flex-start}.outline .dot{margin-top:7px}.outline a:hover{background:var(--bg)}.outline small{display:block;color:var(--muted);font-size:13px;line-height:1.4}}
.legend ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px 16px;font-size:14px;color:var(--muted)}
@media (min-width:1000px){.legend ul{flex-direction:column}}
.tools{display:none;flex-wrap:wrap;gap:6px;margin-top:10px}.js .tools{display:flex}
.tools button{font:inherit;font-size:13px;font-weight:700;border:1px solid var(--line);background:var(--surface);color:var(--text);border-radius:999px;padding:4px 12px;cursor:pointer}
.tools button[aria-pressed=true]{background:var(--ac2);border-color:var(--ac2);color:var(--surface)}
.tools button[aria-pressed]::before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;border:1.5px solid currentColor;margin-right:6px;vertical-align:1px}.tools button[aria-pressed=true]::before{background:currentColor}
.r-intro{--rc:var(--brand)}.r-body{--rc:var(--ac2)}.r-concl{--rc:var(--link)}.r-greet{--rc:var(--muted)}
.ess2{font-size:18px;line-height:1.85}
.para{position:relative;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:12px 20px 14px 24px;margin:0 0 14px;scroll-margin-top:16px}
.para::before{content:"";position:absolute;left:0;top:14px;bottom:14px;width:4px;border-radius:0 4px 4px 0;background:var(--rc)}
.para-h{display:flex;justify-content:space-between;align-items:center;gap:8px;line-height:1.5;margin-bottom:2px}
.para .role{font-size:12px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--rc)}.para .pn{font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}
.para p{margin:0;overflow-wrap:break-word}.para:target{border-color:var(--rc);box-shadow:0 0 0 3px var(--accent-soft)}
.smp .lb{font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;border-radius:999px;padding:1px 8px;margin-right:2px;vertical-align:2px;background:var(--bg);color:var(--muted);border:1px solid var(--line);line-height:1.6;white-space:nowrap}
.smp .lb-ts{background:var(--accent-soft);color:var(--ac2);border-color:transparent}.smp .lb-ex{background:rgba(255,201,74,.22);color:var(--text);border-color:transparent}.smp .lb-cv{background:rgba(255,143,163,.2);color:var(--text);border-color:transparent}.smp .lb-op{background:var(--primary-soft);color:var(--link);border-color:transparent}
.smp mark.ph{background:rgba(255,176,84,.24);color:inherit;border-radius:4px;padding:0 2px;box-shadow:inset 0 -2px 0 #E5502F;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.smp mark.ph[tabindex]{cursor:help}.smp mark.ph:focus-visible{outline:2px solid var(--ac2);outline-offset:1px}
.smp .ln{color:var(--ac2);font-weight:700}
.ess2.plain mark.ph{background:none;box-shadow:none;padding:0}.ess2.plain .ln{color:inherit;font-weight:inherit}.ess2.plain .lb{display:none}
.ess2.gl-on mark.ph[data-g]::after{content:" · " attr(data-g);font-size:.8em;font-weight:600;color:var(--muted)}
#glp{position:fixed;z-index:30;max-width:min(300px,calc(100vw - 24px));background:var(--text);color:var(--surface);padding:8px 12px;border-radius:10px;font-size:15px;line-height:1.45;font-weight:600;box-shadow:0 10px 28px rgba(0,0,0,.22);pointer-events:none}
.letter{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:8px 22px;box-shadow:0 12px 32px rgba(15,61,62,.07)}
.letter .para{background:none;border:0;border-radius:0;padding:12px 0 12px 16px;margin:0;border-bottom:1px dashed var(--line)}.letter .para:last-child{border-bottom:0}.letter .para::before{top:14px;bottom:14px}
@media (min-width:700px){.letter .para{display:grid;grid-template-columns:150px minmax(0,1fr);gap:16px}.letter .para-h{display:block;margin:5px 0 0}.letter .pn{display:none}}
.smp .phr{list-style:none;margin:12px 0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,250px),1fr));gap:10px}
.smp .phr li{display:flex;gap:10px;align-items:flex-start;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:10px 14px;font-size:15px;line-height:1.45}
.smp .phr .n{flex:none;width:24px;height:24px;margin-top:1px;border-radius:50%;background:var(--primary-soft);color:var(--link);font-size:12px;font-weight:800;display:grid;place-items:center}
.smp .phr b{display:block;font-size:16px}.smp .phr .m{display:block;color:var(--muted)}
.save{display:flex;gap:12px 14px;align-items:center;flex-wrap:wrap;background:var(--accent-soft);border-radius:var(--r);padding:14px 18px;margin:16px 0 28px}.save .ic{font-size:26px}.save p{margin:0;flex:1 1 240px}.save small{display:block;color:var(--muted);font-size:14px}
.cta2{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px 18px;align-items:center;background:linear-gradient(135deg,#0F3D3E,#12807A);color:#fff;border-radius:20px;padding:16px 22px;margin:28px 0}
.cta2 .kit{background:radial-gradient(circle at 50% 50%,#FFEBE4 0 62%,rgba(255,235,228,.35) 63% 69%,transparent 70%);border-radius:50%;padding:6px;filter:drop-shadow(0 6px 14px rgba(0,0,0,.28))}.cta2 .kit svg{display:block}.cta2 p{margin:0}.cta2 strong{display:block;font-size:19px;line-height:1.35}.cta2 small{display:block;opacity:.9;font-size:14px}.cta2 .btn{background:#FFC94A;color:#0F3D3E!important;white-space:nowrap}
@media (max-width:560px){.cta2{grid-template-columns:auto minmax(0,1fr);padding:16px}.cta2 .btn{grid-column:1/-1;text-align:center}}
.pg2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:28px 0}
.pg2 a{display:flex;flex-direction:column;gap:2px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:12px 16px;text-decoration:none;color:var(--text);transition:border-color .15s}
.pg2 a:hover{border-color:var(--primary)}.pg2 small{color:var(--muted);font-weight:800;font-size:12px;text-transform:uppercase;letter-spacing:.06em}
.pg2 span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-weight:600;font-size:15px;line-height:1.45}.pg2 .nx{grid-column:2;text-align:right}
@media (max-width:560px){.pg2{grid-template-columns:1fr}.pg2 .nx{grid-column:1}}
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
@media (prefers-color-scheme:dark){.sc-meta .bnd{color:#0f1017}}
.smp .grp>h2{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.smp .grp.off{display:none}
.tf,.jump{display:flex;gap:8px;overflow-x:auto;padding:2px 2px 8px;margin:4px 0 0;scrollbar-width:thin}
.tf a,.jump a{flex:none;display:inline-flex;gap:8px;align-items:center;border:1px solid var(--line);background:var(--surface);color:var(--text);text-decoration:none;border-radius:999px;padding:6px 14px;font-weight:700;font-size:14px;line-height:1.4}
.tf a b{font-size:12px;color:var(--muted)}.tf a:hover,.jump a:hover{border-color:var(--tc)}
.tf a[aria-pressed=true]{background:var(--text);border-color:var(--text);color:var(--surface)}.tf a[aria-pressed=true] b{color:inherit;opacity:.8}
.smp .part{margin-top:30px;scroll-margin-top:16px}.smp .part>h2{display:flex;align-items:center;gap:10px;margin:0 0 2px}
.pb{display:inline-grid;place-items:center;min-width:36px;height:36px;border-radius:10px;background:var(--brand);color:#fff;font-size:16px;font-weight:800}
@media (prefers-color-scheme:dark){.pb{color:#0f1017}}
.pdesc{color:var(--muted);margin:0 0 8px;font-size:15px}
.qa{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:14px 18px;margin:12px 0}
.smp .qa h3{display:flex;gap:10px;align-items:flex-start;margin:0 0 8px;font-size:17px;line-height:1.45}
.qn{flex:none;font-size:12px;font-weight:800;color:var(--ac2);background:var(--accent-soft);border-radius:8px;padding:1px 8px;margin-top:2px}
.qa .ans{border-left:3px solid var(--accent-soft);padding-left:14px}.qa .ans p{margin:0;font-size:17px;line-height:1.75}
.vch{list-style:none;padding:0;margin:10px 0 0;display:flex;flex-wrap:wrap;gap:6px;font-size:14px}
.vch .k{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);align-self:center;margin-right:2px}
.vch li:not(.k){background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:2px 10px}.vch .m{color:var(--muted)}
.smp .cue{background:linear-gradient(var(--surface),var(--surface)) padding-box;border:1px solid var(--line);border-top:4px solid #FFB054;border-radius:var(--r);padding:16px 20px;margin:10px 0;box-shadow:0 12px 32px rgba(15,61,62,.07);font-weight:400}
.cue .ck{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:0}.cue>p{font-size:18.5px;font-weight:700;margin:4px 0 6px}.cue .ys{margin:0;color:var(--muted);font-size:15px}.cue ul{margin:4px 0 0;padding-left:22px}
@media (max-width:420px){.ess2{font-size:17px}.para{padding:10px 14px 12px 18px}.smp .prompt{padding:14px 16px 14px 20px}.smp .prompt>p{font-size:17px}.letter{padding:6px 14px}.qa{padding:12px 14px}}
@media print{header.top,footer,.crumbs,.cta,.cta2,.ext,.save,.pg2,.tools,.filter,.tf,.cats,.skip,.outline,#glp,.smp-doc .grp,.hero2 .kit{display:none!important}
body{background:#fff;color:#000;font-size:12pt}main{padding:0}.smp .hero2{border:0;padding:0}.smp .hero2::before{display:none}.ess-grid{display:block}.side-box,.para,.prompt,.phr li,.qa,.letter{box-shadow:none;break-inside:avoid;border-color:rgba(0,0,0,.25)}
.ess2 mark.ph[data-g]::after{content:" (" attr(data-g) ")";font-size:.85em;font-weight:400}}`;

// JS nhỏ (không chặn hiển thị): popover nghĩa cụm từ, bật/tắt tô màu/nghĩa, in, lọc nhóm bằng chip
export const SMP_JS = `(function(d){var P=d.getElementById('glp'),cur=null;
[].forEach.call(d.querySelectorAll('mark.ph[title]'),function(m){m.removeAttribute('title')});
function hide(){if(P){P.className='sr';}cur=null}
function show(m){if(!P)return;P.textContent=m.getAttribute('data-g');P.className='';var r=m.getClientRects()[0]||m.getBoundingClientRect(),vw=d.documentElement.clientWidth,w=P.offsetWidth,h=P.offsetHeight,x=Math.max(8,Math.min(r.left,vw-w-8)),y=r.top-h-8;if(y<8)y=r.bottom+8;P.style.left=x+'px';P.style.top=y+'px';cur=m}
d.addEventListener('click',function(e){var m=e.target.closest('mark.ph[data-g]');if(m){cur===m?hide():show(m);return}hide();
var b=e.target.closest('[data-cls]');if(b){var on=b.getAttribute('aria-pressed')!=='true',w=d.querySelector('.ess2');b.setAttribute('aria-pressed',on);if(w)w.classList.toggle(b.getAttribute('data-cls'),b.hasAttribute('data-inv')?!on:on);return}
if(e.target.closest('[data-print]')){window.print();return}
var f=e.target.closest('.tf a');if(f){e.preventDefault();var g=f.getAttribute('data-g');[].forEach.call(d.querySelectorAll('.tf a'),function(a){a.setAttribute('aria-pressed',a===f)});[].forEach.call(d.querySelectorAll('.grp[aria-labelledby^="g-"]'),function(s){s.classList.toggle('off',!!g&&s.getAttribute('aria-labelledby')!==g)})}});
d.addEventListener('focusin',function(e){var m=e.target.closest&&e.target.closest('mark.ph[data-g]');if(m)show(m)});
d.addEventListener('focusout',function(e){if(e.target.closest&&e.target.closest('mark.ph[data-g]'))hide()});
d.addEventListener('keydown',function(e){if(e.key==='Escape')hide()});window.addEventListener('scroll',function(){if(cur)hide()},{passive:true});
[].forEach.call(d.querySelectorAll('.tf a'),function(a,i){a.setAttribute('role','button');a.setAttribute('aria-pressed',i===0)})})(document);`;
// Popover (vùng thông báo – trình đọc màn hình đọc nghĩa khi chạm/Tab vào cụm từ) + script
export const smpTail = () => `<div id="glp" class="sr" role="status" aria-live="polite"></div><script>${SMP_JS}</script>`;
export const smpHead = () => `<style>${SMP_CSS}</style>`;
