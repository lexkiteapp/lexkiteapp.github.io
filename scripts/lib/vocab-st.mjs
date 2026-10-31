// 🎨 Dữ liệu THẬT cho khung Stitch web nhóm 2 – từ vựng: mục lục /tu-vung/ + /en/vocabulary/ (bind/vocab-hub.json) và trang bộ từ
//   /tu-vung/<bộ> + /en/vocabulary/<bộ> (bind/vocab-set.json). Khung TỰ SINH web/js/st/web/vocab-*.js; trang = stPage() (scripts/lib/samples-ui.mjs).
//   Gọi từ build-samples.mjs (vi) / build-samples-en.mjs (en). CHỮ THÔ (khung tự escape) – trường *H là HTML dựng sẵn đã escape.
//   Chữ trang = V.vi/V.en (trang chỉ có 2 ngôn ngữ, như S trong samples-ui); nhãn tĩnh của mẫu đi pipeline v2web (bind i18n → 15 ngôn ngữ).
//   Bỏ chữ mẫu bịa (docs/STITCH-V2-PORT.md › Từ vựng web): "42 Sets/580 Words/100% Audio", VERIFIED/BAND 8.5/EXAM CORE, "TEACHER SLOT", "+30 XP", "AI voice check"…
// @icons menu_book edit_note record_voice_over school style fact_check category translate volume_up headphones quiz checklist
import { esc, TOPIC_IDS } from './site-layout.mjs';
import { teacher } from './st-web.mjs';

const V = {
  vi: { kick: 'IELTS · TOEIC · TOEFL', set: 'bộ', sets: n => `${n} bộ`, words: n => `${n} từ`, nWords: 'từ vựng', groups: 'nhóm chủ đề', audio: 'có phát âm', setsL: 'bộ từ miễn phí',
    b: ['Miễn phí', 'IPA', 'Nhóm', 'Audio'], teach: 'Ama · giáo viên', tSay: 'Chọn một bộ để xem danh sách từ, rồi học bằng flashcard: app tự nhắc ôn đúng lúc bạn sắp quên.',
    tBox: 'Học flashcard miễn phí', tFree: 'Miễn phí', search: 'Lọc theo tên, chủ đề…', searchL: 'Lọc danh sách', clear: 'Xóa', go: 'Lọc', filterL: 'Lọc theo nhóm', all: 'Tất cả',
    more: n => `Xem ${n} bộ`, lex: 'Từ tiêu biểu', free: 'Miễn phí · không cần tài khoản', ctaH: 'Mang các từ này vào bài nói và bài viết hằng ngày',
    ctaP: 'Ôn lặp lại ngắt quãng FSRS, nghe phát âm, tự kiểm tra – lưu tiến độ tự động.', ctaBtn: 'Học miễn phí', gram: 'Xem bài ngữ pháp', found: n => `${n} kết quả`, none: 'Không có mục nào khớp – thử từ khóa khác.',
    gdesc: (n, w) => `${n} bộ · ${w} từ có phiên âm, nghĩa tiếng Việt và ví dụ.`,
    // trang bộ từ
    ipa: 'Có phiên âm IPA', au: n => `${n} từ có phát âm`, sheet: 'Danh sách từ', showing: n => `(${n} từ)`, tap: 'Bấm nút loa để nghe phát âm', expand: 'Thu gọn', expandOn: 'Mở rộng',
    def: 'Nghĩa', ctx: 'Ví dụ', allShown: (n) => `Đủ ${n}/${n} từ của bộ`, learnAll: n => `Thuộc ${n} từ này trong vài ngày – Học ngay`, tipK: 'Mẹo', tip: 'Mỗi ngày vài phút, app tự nhắc đúng lúc bạn sắp quên.',
    tipNote: 'Ôn lặp lại ngắt quãng FSRS', drillK: 'Học miễn phí', drillH: 'Học bộ này bằng flashcard (miễn phí)', drillP: 'Ôn lặp lại ngắt quãng FSRS, nghe phát âm, tự kiểm tra – lưu tiến độ tự động.',
    rows: ['Flashcard FSRS', 'Nghe phát âm', 'Tự kiểm tra'], cards: n => `${n} thẻ`, saved: 'Lưu tiến độ', open: 'Mở bộ từ trong app', related: 'Bộ liên quan', viewAll: n => `Xem tất cả ${n}`,
    save: 'Lưu bộ này trong app', share: 'Chia sẻ trang này', copied: 'Đã chép liên kết' },
  en: { kick: 'IELTS · TOEIC · TOEFL', set: 'sets', sets: n => `${n} sets`, words: n => `${n} words`, nWords: 'words', groups: 'categories', audio: 'with audio', setsL: 'free word lists',
    b: ['Free', 'IPA', 'Groups', 'Audio'], teach: 'Ama · teacher', tSay: 'Pick a set to see the word list, then learn it with flashcards: the app reminds you right before you forget.',
    tBox: 'Free flashcards', tFree: 'Free', search: 'Filter by name or topic…', searchL: 'Filter the list', clear: 'Clear', go: 'Filter', filterL: 'Filter by category', all: 'All',
    more: n => `View ${n} sets`, lex: 'Key words', free: 'Free · no account needed', ctaH: 'Take these words into your daily speaking and writing',
    ctaP: 'FSRS spaced repetition, audio and self-tests – progress saved automatically.', ctaBtn: 'Start learning free', gram: 'Browse grammar lessons', found: n => `${n} results`, none: 'Nothing matches – try another word.',
    gdesc: (n, w) => `${n} sets · ${w} words with IPA, definitions and examples.`,
    ipa: 'IPA transcriptions included', au: n => `${n} words with audio`, sheet: 'Word list', showing: n => `(${n} words)`, tap: 'Tap the speaker button to hear the pronunciation', expand: 'Collapse', expandOn: 'Expand',
    def: 'Definition', ctx: 'Example', allShown: n => `All ${n} of ${n} words in this set`, learnAll: n => `Remember all ${n} words in a few days – Start learning`, tipK: 'Tip', tip: 'A few minutes a day – the app reminds you right before you forget.',
    tipNote: 'FSRS spaced repetition', drillK: 'Learn free', drillH: 'Learn this set with free flashcards', drillP: 'FSRS spaced repetition, audio and self-tests – progress saved automatically.',
    rows: ['FSRS flashcards', 'Audio', 'Self-tests'], cards: n => `${n} cards`, saved: 'Progress saved', open: 'Open this set in the app', related: 'Related sets', viewAll: n => `View all ${n}`,
    save: 'Save this set in the app', share: 'Share this page', copied: 'Link copied' },
};
const ICON = { topics: 'menu_book', writing: 'edit_note', speaking: 'record_voice_over', awl: 'school', core: 'style', toeic: 'fact_check', domain: 'category', exam: 'translate' };
const num = (n, lang) => Number(n).toLocaleString(lang === 'vi' ? 'vi' : 'en');
const crumbH = cs => cs.map(([n, h], i) => i < cs.length - 1 ? `<a href="${esc(h)}" class="underline-offset-2 hover:underline">${esc(n)}</a> › ` : `<span aria-current="page">${esc(n)}</span>`).join('');

// Mục lục. o: { TP, G: {group: tên}, name(x), meta(x) → {level, exams}, audioKey, href(x), app(x), appHome, gram, crumbs }
export function vocabHubD(lang, o) {
  const U = V[lang], { TP, G, audioKey } = o, by = {}; for (const x of TP) (by[x.group] = by[x.group] || []).push(x);
  const total = TP.reduce((a, x) => a + x.words.length, 0), nAu = TP.reduce((a, x) => a + x.words.filter(w => audioKey(w.word)).length, 0);
  const card = x => { const { level, exams } = o.meta(x), au = x.words.some(w => audioKey(w.word)), d = lang === 'vi' && x.desc ? x.desc : '';
    return { key: `${x.id} ${G[x.group] || ''}`, level: level || '', au, title: o.name(x), href: o.href(x), sub: [U.words(x.words.length), d].filter(Boolean).join(' • '),
      words: x.words.slice(0, 3).map(w => w.word), exam: exams.join(' · ') || (G[x.group] || ''), app: o.app(x) }; };
  return { crumbH: crumbH(o.crumbs), h1: o.h1, lead: o.lead, kick: U.kick,
    stats: [{ icon: 'style', b: U.b[0], v: TP.length, l: U.setsL }, { icon: 'translate', b: U.b[1], v: num(total, lang), l: U.nWords },
      { icon: 'category', b: U.b[2], v: Object.keys(by).length, l: U.groups }, { icon: 'volume_up', b: U.b[3], v: num(nAu, lang), l: U.audio }],
    ama: teacher('ama', 'point', { size: 120, cls: 'chr mx-auto' }), tPill: U.tFree, tName: U.teach, tSay: U.tSay, tBox: U.tBox, tFree: U.tFree, appHref: o.appHome,
    search: U.search, searchL: U.searchL, clearL: U.clear, go: U.go, found: U.found('#'), none: U.none, filterL: U.filterL,
    filters: [{ on: 1, g: '', href: '#nd', label: `${U.all} (${TP.length})` }, ...Object.entries(by).map(([k, xs]) => ({ on: 0, g: `g-${k}`, href: `#g-${k}`, label: `${G[k] || k} (${xs.length})` }))],
    groups: Object.entries(by).map(([k, xs]) => ({ k, icon: ICON[k] || 'menu_book', name: G[k] || k, count: U.sets(xs.length), desc: U.gdesc(xs.length, num(xs.reduce((a, x) => a + x.words.length, 0), lang)),
      more: U.more(xs.length), items: xs.map(card) })),
    lexL: U.lex, free: U.free, ctaH: U.ctaH, ctaP: U.ctaP, ctaBtn: U.ctaBtn, gramHref: o.gram, gramL: U.gram };
}

// Đánh dấu lần xuất hiện đầu của từ (kể cả biến thể: -s, -ed, -ing…) trong câu ví dụ → HTML đã escape, <mark> = khuôn của mẫu
const markEx = (ex, w) => { const s = String(ex || ''), i = s.toLowerCase().indexOf(String(w).toLowerCase().replace(/e$/, '')); if (i < 0 || !w) return esc(s);
  let j = i + String(w).replace(/e$/, '').length; while (j < s.length && /[a-z]/i.test(s[j])) j++; return `${esc(s.slice(0, i))}${'\u0001'}${esc(s.slice(i, j))}${'\u0002'}${esc(s.slice(j))}`; };

// Trang bộ từ. o: { x, g (tên nhóm), meta, audioKey, app, appHub, related [{x…}], name(x), href(x), G, total, crumbs, grpHref, lead }
export function vocabSetD(lang, o) {
  const U = V[lang], { x, audioKey } = o, n = x.words.length, { level, exams } = o.meta(x), nAu = x.words.filter(w => audioKey(w.word)).length;
  return { grpCrumb: [o.g, o.grpHref], kick: o.g, kIcon: ICON[x.group] || 'menu_book', lvl: [level, ...exams].filter(Boolean).join(' · '), h1: o.name(x), lead: o.lead,
    meta: [exams.join(' · ') || o.g, U.cards(n)], chips: [U.words(n), nAu ? U.au(nAu) : U.ipa], ipa: x.words.every(w => w.ipa) ? U.ipa : '', au: (k => k ? `UK · US: ${U.words(k)}` : '')(x.words.filter(w => w.ipaUS).length), hit: TOPIC_IDS.has(x.id) ? 'cta_topic_click' : '', save: U.save, share: U.share, copied: U.copied, app: o.app(x),
    sheet: U.sheet, showing: U.showing(n), tap: nAu ? U.tap : '', expand: U.expand, expandOn: U.expandOn, defL: U.def, ctxL: U.ctx,
    words: x.words.map(w => { const k = audioKey(w.word); return { w: w.word, pos: w.pos || '', lvl: w.level || '', ipa: w.ipa || '', us: w.ipaUS ? 'UK · US' : '', k: k || '',
      play: lang === 'vi' ? `Nghe phát âm ${w.word}` : `Play pronunciation of ${w.word}`, def: (lang === 'vi' ? w.vi : w.def) || w.def || '', exH: markEx(w.ex, w.word).replace(/\u0001/, '<mark class="ex-m">').replace(/\u0002/, '</mark>'), ex: w.ex || '' }; }),
    allShown: U.allShown(n), learnAll: U.learnAll(n), ama: teacher('ama', 'point', { size: 96, cls: 'chr' }), tName: 'Ama', tipK: U.tipK, tip: U.tip, tipNote: U.tipNote,
    drillK: U.drillK, drillH: U.drillH, drillP: U.drillP, rows: [[U.rows[0], U.cards(n)], [U.rows[1], nAu ? U.words(nAu) : '—'], [U.rows[2], U.saved]], open: U.open, free: V[lang].free,
    relH: U.related, viewAll: U.viewAll(o.total), hub: o.appHub,
    rel: o.related.map(y => { const m = o.meta(y); return { href: o.href(y), grp: o.G[y.group] || '', lvl: m.level || '', title: o.name(y), n: U.words(y.words.length), ex: m.exams.join(' · ') || '' }; }) };
}

// Phần mẫu không vẽ: lọc trên trang (UI_JS dùng #q/#qn/.filter/.tf/.grp – nhóm bị lọc = .off), thu gọn nghĩa (Thu gọn/Mở rộng), chia sẻ.
//   Chỉ token Stitch (--st-*), vùng chạm ≥ 44 px.
export const VOCAB_CSS = `.grp.off{display:none}
.v2s-web-vocab-hub main :is(a[href],button,input),.v2s-web-vocab-set main :is(a[href],button){min-height:44px;min-width:44px}
.v2s-web-vocab-hub main .tf a,.v2s-web-vocab-set main nav[aria-label]>a{display:inline-flex;align-items:center}
.v2s-web-vocab-hub h3 a,.v2s-web-vocab-set .vs-rel a{min-height:0;min-width:0}
.vs-list.vs-c .vs-body{display:none}
mark.ex-m{background:rgb(var(--st-secondary-container)/.35);color:inherit;font-weight:800;border-radius:4px;padding:0 4px}`;
export const VOCAB_JS = lang => `(function(d){d.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('[data-gf]'),f=a&&d.querySelector('.tf a[data-g="'+a.getAttribute('data-gf')+'"]');if(f){e.preventDefault();f.click();d.getElementById('nd').scrollIntoView()}});var b=d.querySelector('[data-qgo]'),q=d.getElementById('q');if(b&&q)b.onclick=function(){q.dispatchEvent(new Event('input'));q.focus()};
var x=d.querySelector('[data-xall]'),l=d.querySelector('.vs-list');if(x&&l){x.onclick=function(){var c=l.classList.toggle('vs-c');x.setAttribute('aria-expanded',c?'false':'true');x.firstChild.nodeValue=x.getAttribute(c?'data-on':'data-off')+' '}}
var s=d.querySelector('[data-share]');if(s)s.onclick=function(){var u=location.href;if(navigator.share)navigator.share({title:d.title,url:u}).catch(function(){});else if(navigator.clipboard)navigator.clipboard.writeText(u).then(function(){s.setAttribute('aria-label',s.getAttribute('data-ok'))})}})(document);`;
