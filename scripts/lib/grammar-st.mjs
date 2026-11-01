// 🎨 Dữ liệu THẬT cho khung Stitch web – ngữ pháp: bài /ngu-phap/<bài> + /en/grammar/<bài> (bind/grammar.json, mẫu brand/stitch/web/grammar-light|dark.html)
//   và mục lục /ngu-phap/ + /en/grammar/ (dùng lại khung danh sách vocab-hub – cùng dạng "nhóm → thẻ", hợp đồng d như vocabHubD).
//   Gọi từ build-samples.mjs (vi) / build-samples-en.mjs (en). CHỮ THÔ (khung tự escape) – trường *H / html là HTML dựng sẵn đã escape.
//   Cách map đã chốt: Cách dùng → thẻ · Công thức → bảng · Bảng 2 cột → cặp ví dụ (bảng ≥ 3 cột → bảng như công thức) · Lỗi thường gặp → Trap ·
//   Quiz → Mini Check (3 câu như bản en cũ) · IELTS → ô quan sát · Mẹo → Golden rule · Dấu hiệu nhận biết → ô "Dead giveaways" của thẻ cách dùng đầu.
//   Bỏ chữ mẫu bịa: "GRAMMAR NOTEBOOK", "Band 6.5 → 8.0", Tokyo/Fleming/…, "TEACHER SLOT", "Carlos 3-min drill", "Memory latch" (không có dữ liệu tương ứng).
// @icons school schedule edit_note translate account_tree auto_stories menu_book quiz category fact_check lock check_circle toc library_books local_cafe tips_and_updates
import { esc, teacher } from './st-web.mjs';

const V = {
  vi: { home: 'Trang chủ', lvl: l => `Trình độ ${l}`, read: m => `${m} phút đọc & tự kiểm tra`,
    s: [['Cách dùng', 'Khái niệm cốt lõi'], ['Công thức', 'Cấu trúc'], ['Ví dụ đối chiếu', 'Cặp ví dụ'], ['Lỗi hay gặp', 'Sửa lỗi'], ['Kiểm tra nhanh', 'Tự kiểm tra']],
    p: [n => `${n} cách dùng chính, mỗi cách kèm ví dụ.`, () => 'Cấu trúc câu khẳng định, phủ định, nghi vấn và ví dụ.', () => 'Đặt hai cách nói cạnh nhau để thấy khác biệt.', n => `${n} lỗi người Việt hay mắc – sai → đúng và vì sao.`, () => 'Chọn đáp án rồi bấm "Xem đáp án & giải thích".'],
    use: i => `Cách dùng ${i}`, sig: 'Dấu hiệu nhận biết:', ielts: 'Ứng dụng trong IELTS', trap: i => `Lỗi ${i}`, why: 'Vì sao?', q: (i, n) => `Câu ${i}/${n}`, ans: a => `Đáp án đúng: ${a}`,
    head: ['Loại câu', 'Công thức', 'Ví dụ'], toc: 'Nội dung bài', prev: '← Bài trước', next: 'Bài sau →', min: m => `${m} phút`,
    ctaH: 'Học bài này có minh họa & bài tập (miễn phí)', ctaP: 'Sơ đồ trực quan, công thức màu và bài tập chấm điểm ngay.', ctaBtn: 'Mở bài học →' },
  en: { home: 'Home', lvl: l => `Level ${l}`, read: m => `${m}-min read & self-test`,
    s: [['When to use', 'Core concept'], ['Formula', 'Syntax guide'], ['Contrast pairs', 'Contextual pairs'], ['Common mistakes', 'Fixes'], ['Quick quiz', 'Self-check']],
    p: [n => `${n} main uses, each with an example.`, () => 'Positive, negative and question forms with examples.', () => 'Two ways of saying it side by side, so the difference is clear.', n => `${n} frequent mistakes – wrong → right and why.`, () => 'Pick an answer, then open "Reveal Answer & Explanation".'],
    use: i => `Use ${i}`, sig: 'Signal words:', ielts: 'Using it in IELTS', trap: i => `Trap ${i}`, why: 'Why?', q: (i, n) => `Question ${i} of ${n}`, ans: a => `Correct answer: ${a}`,
    head: ['Sentence type', 'Formula', 'Example'], toc: 'Lesson contents', prev: '← Previous lesson', next: 'Next lesson →', min: m => `${m} min`,
    ctaH: 'Learn this lesson with visuals and exercises (free)', ctaP: 'Colour-coded formulas, timelines and instantly marked exercises.', ctaBtn: 'Practise in the app →' },
};
const hl = s => esc(s).replace(/\[\[(.+?)\]\]/g, '<b>$1</b>'), plain = s => String(s || '').replace(/\[\[(.+?)\]\]/g, '$1');
const words = l => JSON.stringify([l.summary, l.blocks, (l.quiz || []).slice(0, 3)]).split(/\s+/).length;
export const readMin = l => Math.max(3, Math.round(words(l) / 180));

// Bài. o: { l, t (dịch chuỗi gốc → ngôn ngữ trang; vi = giữ nguyên), x (làm sạch câu ví dụ tiếng Anh; vi = giữ nguyên), h1, lead, unit [tên, href], app,
//   rel [{ l, href, title, sub, rel }] (bài trước + liên quan + bài sau) }
export function grammarD(lang, o) {
  const U = V[lang], { l, t = s => s, x = s => s } = o, bl = l.blocks || [], of = ty => bl.filter(b => b.type === ty);
  const sig = of('signals').flatMap(b => b.words.map(w => t(w))).filter(Boolean);
  const uses = of('uses').flatMap(b => b.items), ie = of('ielts').filter(b => t(b.text));
  const tables = [...of('formula').map(b => ({ cap: U.s[1][0], head: U.head, rows: b.rows.map(r => ({ label: t(r.label || ''), cells: [{ t: r.parts.map(p => t(p.t)).join(' + '), exH: '' }, { t: '', exH: r.ex ? hl(x(r.ex)) : '' }] })) })),
    ...of('table').filter(b => (b.head || b.rows[0] || []).length !== 2).map(b => ({ cap: (b.head || []).map(h => t(h)).join(' · ') || U.s[1][0], head: (b.head || []).map(h => t(h)),
      rows: (b.rows || []).map(r => ({ label: t(String(r[0])), cells: r.slice(1).map(c => ({ t: t(String(c)), exH: '' })) })) }))];
  const pairs = of('table').filter(b => (b.head || b.rows[0] || []).length === 2).flatMap(b => { const h = (b.head || ['', '']).map(z => t(z));
    return (b.rows || []).map((r, i) => ({ h: `${i + 1}. ${[h[0], h[1]].filter(Boolean).join(' ↔ ')}`, tag: '', a: [h[0], t(String(r[0])), ''], b: [h[1], t(String(r[1])), ''] })); });
  const traps = of('mistake').map((b, i) => ({ k: U.trap(i + 1), wrong: x(b.wrong), right: x(b.right), why: t(b.why || ''), whyL: U.why }));
  const qz = (l.quiz || []).slice(0, 3), L = 'ABCDEFGH';
  const qs = qz.map((q, i) => ({ k: U.q(i + 1, qz.length), q: plain(t(q.q)), name: `q${i + 1}`, opts: q.options.map((z, j) => `${L[j]}) ${t(z)}`), ans: U.ans(`${L[q.answer]}) ${t(q.options[q.answer])}`), why: t(q.explain || '') }));
  const S = [], add = (i, s) => { if (!s) return null; const n = S.length + 1, id = ['cach-dung', 'cong-thuc', 'vi-du', 'loi-hay-gap', 'kiem-tra'][i];
    const v = { n: String(n).padStart(2, '0'), id, h: i === 0 && lang === 'en' ? `${U.s[0][0]} ${l.en}` : U.s[i][0], tag: U.s[i][1], ...s }; S.push(v); return v; };
  const d = { unit: o.unit, kick: lang === 'vi' ? l.en || '' : o.unit[0], lvl: l.level ? U.lvl(l.level) : '', read: U.read(readMin(l)), h1: o.h1, lead: o.lead,
    tips: of('tip').map(b => t(b.text)).filter(Boolean), app: o.app, ctaH: U.ctaH, ctaP: lang === 'en' && l.quiz ? `${U.ctaP} ${l.quiz.length} more questions.` : U.ctaP, ctaBtn: U.ctaBtn };
  d.s1 = add(0, uses.length || ie.length ? { p: U.p[0](uses.length), items: uses.map((u, i) => ({ k: U.use(i + 1), tag: l.en || '', title: t(u.title), exH: u.ex ? hl(x(u.ex)) : '', vi: lang === 'vi' ? u.vi || '' : '',
      icon: i % 2 ? 'check_circle' : 'lock', sig: i === 0 ? sig : [], sigL: U.sig })), obs: ie.map(b => ({ h: U.ielts, html: esc(t(b.text)) + (b.ex ? `<br><i>${hl(x(b.ex))}</i>` : '') })) } : null);
  d.s2 = add(1, tables.length ? { p: U.p[1](), latch: null, tables } : null);
  d.s3 = add(2, pairs.length ? { p: U.p[2](), pairs } : null);
  d.s4 = add(3, traps.length ? { p: U.p[3](traps.length), traps } : null);
  d.s5 = add(4, qs.length ? { p: U.p[4](), qs } : null);
  d.toc = S.map(s => ({ n: s.n, id: s.id, h: s.h })); d.tocL = U.toc;
  d.ama = teacher('ama', 'point', { size: 120, cls: 'chr mx-auto' });
  d.amaTip = ie[0] && ie[0].ex ? plain(x(ie[0].ex)) : t(l.summary || '');
  d.rel = o.rel;
  return d;
}
// Thẻ bài cho cột "Bài liên quan" (bài trước/sau giữ rel prev/next như thanh pager cũ)
export const relItem = (lang, title, href, sub, rel = '') => ({ title, href, rel, sub: rel === 'prev' ? V[lang].prev : rel === 'next' ? V[lang].next : sub });

// Mục lục (khung vocab-hub). o: { G, units [{ k, name, desc, items }], href(l), app(l), title(l), sub(l), unitName(l), appHome, vocab, crumbs, h1, lead }
const ICON = { foundation: 'school', tenses: 'schedule', verbs: 'edit_note', words: 'translate', sentences: 'account_tree', academic: 'auto_stories' };
const H = {
  vi: { kick: 'IELTS · TOEIC · TOEFL', b: ['Miễn phí', 'Quiz', 'Chủ điểm', 'Lỗi'], l: ['bài ngữ pháp', 'câu hỏi kiểm tra', 'chủ điểm', 'lỗi hay gặp có sửa'], teach: 'Ama · giáo viên',
    tSay: 'Chọn một bài để xem công thức, cách dùng và lỗi hay gặp, rồi làm bài tập chấm điểm ngay trong app.', tBox: 'Học ngữ pháp miễn phí', tFree: 'Miễn phí', search: 'Lọc theo tên bài, chủ điểm…',
    searchL: 'Lọc danh sách', clear: 'Xóa', go: 'Lọc', filterL: 'Lọc theo chủ điểm', all: 'Tất cả', more: n => `Xem ${n} bài`, n: n => `${n} bài`, lex: 'Dấu hiệu', free: 'Miễn phí · không cần tài khoản',
    ctaH: 'Học ngữ pháp có minh họa và bài tập chấm điểm ngay', ctaP: 'Sơ đồ trực quan, công thức màu, quiz có giải thích – lưu tiến độ tự động.', ctaBtn: 'Học miễn phí', vocab: 'Xem bộ từ vựng',
    found: n => `${n} kết quả`, none: 'Không có mục nào khớp – thử từ khóa khác.', gdesc: n => `${n} bài` },
  en: { kick: 'IELTS · TOEIC · TOEFL', b: ['Free', 'Quiz', 'Units', 'Fixes'], l: ['grammar lessons', 'quiz questions', 'units', 'common mistakes fixed'], teach: 'Ama · teacher',
    tSay: 'Pick a lesson to see the formula, uses and common mistakes, then practise with instantly marked exercises in the app.', tBox: 'Free grammar lessons', tFree: 'Free', search: 'Filter by lesson or unit…',
    searchL: 'Filter the list', clear: 'Clear', go: 'Filter', filterL: 'Filter by unit', all: 'All', more: n => `View ${n} lessons`, n: n => `${n} lessons`, lex: 'Signal words', free: 'Free · no account needed',
    ctaH: 'Learn grammar with visuals and instantly marked exercises', ctaP: 'Colour-coded formulas, quizzes with explanations – progress saved automatically.', ctaBtn: 'Start learning free', vocab: 'Browse vocabulary sets',
    found: n => `${n} results`, none: 'Nothing matches – try another word.', gdesc: n => `${n} lessons` },
};
const crumbH = cs => cs.map(([n, h], i) => i < cs.length - 1 ? `<a href="${esc(h)}" class="underline-offset-2 hover:underline">${esc(n)}</a> › ` : `<span aria-current="page">${esc(n)}</span>`).join('');
export function grammarHubD(lang, o) {
  const U = H[lang], { G, units } = o, num = n => Number(n).toLocaleString(lang === 'vi' ? 'vi' : 'en');
  const nQ = G.reduce((a, l) => a + (l.quiz || []).length, 0), nM = G.reduce((a, l) => a + (l.blocks || []).filter(b => b.type === 'mistake').length, 0);
  const card = l => ({ key: `${l.en || ''} ${o.unitName(l)}`, level: l.level || '', au: false, title: o.title(l), href: o.href(l), sub: o.sub(l),
    words: (l.blocks || []).filter(b => b.type === 'signals').flatMap(b => b.words).slice(0, 3).map(w => o.t ? o.t(l)(w) : w).filter(Boolean), exam: o.unitName(l), app: o.app(l) });
  return { crumbH: crumbH(o.crumbs), h1: o.h1, lead: o.lead, kick: U.kick,
    stats: [{ icon: 'menu_book', b: U.b[0], v: G.length, l: U.l[0] }, { icon: 'quiz', b: U.b[1], v: num(nQ), l: U.l[1] }, { icon: 'category', b: U.b[2], v: units.length, l: U.l[2] }, { icon: 'fact_check', b: U.b[3], v: num(nM), l: U.l[3] }],
    ama: teacher('ama', 'point', { size: 120, cls: 'chr mx-auto' }), tPill: U.tFree, tName: U.teach, tSay: U.tSay, tBox: U.tBox, tFree: U.tFree, appHref: o.appHome,
    search: U.search, searchL: U.searchL, clearL: U.clear, go: U.go, found: U.found('#'), none: U.none, filterL: U.filterL,
    filters: [{ on: 1, g: '', href: '#nd', label: `${U.all} (${G.length})` }, ...units.map(u => ({ on: 0, g: `g-${u.k}`, href: `#g-${u.k}`, label: `${u.name} (${u.items.length})` }))],
    groups: units.map(u => ({ k: u.k, icon: ICON[u.k] || 'menu_book', name: u.name, count: U.n(u.items.length), desc: u.desc || U.gdesc(u.items.length), more: U.more(u.items.length), items: u.items.map(card) })),
    lexL: U.lex, free: U.free, ctaH: U.ctaH, ctaP: U.ctaP, ctaBtn: U.ctaBtn, gramHref: o.vocab, gramL: U.vocab };
}

// Phần mẫu không vẽ: in ghi chú (nút Print của mẫu), vùng chạm ≥ 44 px, bảng cuộn trong khung. Chỉ token Stitch (--st-*).
export const GRAM_CSS = `.v2s-web-grammar main :is(a[href],button,summary,label){min-height:44px;min-width:44px}
.v2s-web-grammar main nav[aria-label]>a,.v2s-web-grammar main summary,.v2s-web-grammar main label{display:inline-flex;align-items:center}
.v2s-web-grammar main label{display:flex}
.v2s-web-grammar main i b{font-weight:800}
@media print{.v2s-web-grammar header,.v2s-web-grammar footer,.v2s-web-grammar aside,[data-print]{display:none!important}}`;
export const GRAM_JS = `(function(d){d.querySelectorAll('[data-print]').forEach(function(b){b.addEventListener('click',function(){window.print()})})})(document);`;
