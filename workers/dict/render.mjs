// 📖 Trang từ điển Lexkite – bộ dựng HTML THUẦN (không fs, không Node API): chạy y hệt trong Worker lexkite-dict (trang đuôi dài, đọc JSON từ R2)
// và trong CI (scripts/dict/build.mjs dựng sẵn tầng tĩnh + scripts/test/dict-pages.mjs kiểm). Thiết kế: docs/SEO-DICT-PAGES.md.
// Vào: d = JSON một từ (v1, do build.mjs sinh), shell = khung chung (CSS/header/footer/JS, build.mjs sinh từ scripts/lib/site-layout.mjs).
import { adHold, AD_JS } from '../lib/ad-slot.mjs'; // 💰 1 ô dưới phần nghĩa/ví dụ chính khi shell.ad (docs/ADS.md §1) – mặc định 0 byte
export const SITE = 'https://lexkite.com';
// URL theo cách người bản địa tìm (§2). Chỉ ngôn ngữ trong ENABLED được dựng; còn lại là kế hoạch (cần nhãn giao diện dịch thật – docs/I18N-PIPELINE.md).
export const DICT_PATH = { vi: 'tu-dien', en: 'dictionary', es: 'diccionario', pt: 'dicionario', fr: 'dictionnaire', de: 'woerterbuch', id: 'kamus', tr: 'sozluk', ru: 'slovar', ja: 'jisho', ko: 'sajeon', zh: 'cidian', th: 'photchananukrom', hi: 'shabdkosh', ar: 'qamus' };
export const ENABLED = ['vi', 'en'];
export const hubPath = l => `/${l}/${DICT_PATH[l]}/`;
export const wordPath = (l, slug) => `${hubPath(l)}${slug}/`;
export const letterPath = (l, c) => `${hubPath(l)}${c.toLowerCase()}/`; // trang A–Z (slug 1 chữ – từ trong tập luôn ≥ 3 chữ, không trùng)
export const slugOf = w => String(w).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export const landing = l => (l === 'vi' ? '/' : `/${l}/`);

export const T = {
  vi: {
    hub: 'Từ điển Anh–Việt', home: 'Trang chủ', open: 'Mở app', skip: 'Bỏ qua đến nội dung',
    title: '{W} là gì? Nghĩa, phát âm và ví dụ – Từ điển Anh–Việt',
    desc: '{W} nghĩa là {m}. Phát âm {ipa} (có audio), ví dụ, collocation, từ dễ nhầm và bài tập nhỏ.',
    mean: 'Nghĩa của “{w}”', def: 'Định nghĩa tiếng Anh', pron: 'Phát âm', uk: 'Anh–Anh', us: 'Anh–Mỹ', play: 'Nghe phát âm',
    ex: 'Ví dụ', col: 'Collocation & cụm hay gặp', pat: 'Cấu trúc đi kèm', syn: 'Từ gần nghĩa', conf: 'Từ dễ nhầm với “{w}”', mis: 'Lỗi hay gặp',
    wrong: 'Sai', right: 'Đúng', note: 'Ghi chú cho người Việt', nm: 'Mẹo nhớ', ne: 'Lỗi thường gặp', nu: 'Cách dùng', nf: 'Họ từ',
    quiz: 'Kiểm tra nhanh', ans: 'Xem đáp án', faq: 'Câu hỏi thường gặp', blog: 'Bài viết liên quan', rel: 'Từ liên quan',
    qMean: '“{w}” nghĩa là gì?', qGap: 'Chọn từ đúng điền vào chỗ trống:', qRight: 'Câu nào đúng?',
    fMean: '{W} là gì?', aMean: '“{w}” nghĩa là {m}. Định nghĩa tiếng Anh: {d}.', fPron: 'Phát âm “{w}” thế nào?', fDiff: '“{a}” và “{b}” khác nhau thế nào?',
    aPron: 'Anh–Anh {uk}{us}. Bấm nút loa trên trang để nghe.', aPronUS: ', Anh–Mỹ {us}',
    cta: 'Học “{w}” bằng flashcard và ôn lặp lại ngắt quãng', ctaN: 'Miễn phí, có phát âm và nhắc ôn đúng lúc.', ctaB: 'Mở “{w}” trong app',
    goes: 'Hay đi với', synL: 'Đồng nghĩa', save: 'Lưu flashcard', speak: 'Luyện phát âm', more: 'Chi tiết', usage: 'Cách dùng', slow: 'Nghe chậm',
    lv: 'Cấp độ', pos: { n: 'danh từ', v: 'động từ', adj: 'tính từ', adv: 'trạng từ', prep: 'giới từ', conj: 'liên từ', pron: 'đại từ', det: 'hạn định từ', phr: 'cụm từ', phrv: 'cụm động từ', idiom: 'thành ngữ', int: 'thán từ', num: 'số từ' },
    hubTitle: 'Từ điển Anh–Việt: {n} từ thông dụng có phát âm và ví dụ', hubDesc: 'Tra nghĩa {n} từ tiếng Anh thông dụng: phát âm Anh–Anh/Anh–Mỹ có audio, ví dụ, collocation, từ dễ nhầm và bài tập nhỏ.',
    hubLead: 'Mỗi trang giải thích một từ: nghĩa, phát âm, ví dụ, cách dùng, lỗi người Việt hay mắc và câu hỏi tự kiểm tra.',
    foot: 'Lexkite – Từ điển Anh–Việt cho người học tiếng Anh',
    ant: 'Trái nghĩa', fam: 'Họ từ', wnH: 'Nghĩa khác của “{w}” (tiếng Anh)', wnSrc: 'Nguồn: Open English WordNet 2025 (CC BY 4.0)', toolsH: 'Luyện tiếp miễn phí',
    letter: 'Từ tiếng Anh bắt đầu bằng chữ {c} – Từ điển Anh–Việt', letterLead: '{n} từ bắt đầu bằng chữ {c}, mỗi từ có nghĩa tiếng Việt, phát âm và ví dụ.', top: 'Từ thông dụng nhất', azH: 'Tra theo chữ cái',
  },
  en: {
    hub: 'English dictionary', home: 'Home', open: 'Open app', skip: 'Skip to content',
    title: '{W} meaning, pronunciation and examples – English dictionary',
    desc: '{W} means {m}. UK and US pronunciation with audio, example sentences, collocations, commonly confused words and a short quiz.',
    mean: 'What does “{w}” mean?', def: 'Definition', pron: 'Pronunciation', uk: 'UK', us: 'US', play: 'Play pronunciation',
    ex: 'Examples', col: 'Collocations and common phrases', pat: 'Patterns', syn: 'Similar words', conf: 'Words often confused with “{w}”', mis: 'Common mistakes',
    wrong: 'Wrong', right: 'Right', note: '', nm: '', ne: '', nu: '', nf: '',
    quiz: 'Quick check', ans: 'Show answer', faq: 'FAQ', blog: 'Related articles', rel: 'Related words',
    qMean: 'What does “{w}” mean?', qGap: 'Choose the word that fits the gap:', qRight: 'Which sentence is correct?',
    fMean: 'What does {w} mean?', aMean: '“{w}” ({p}) means {d}.', fPron: 'How do you pronounce “{w}”?', fDiff: 'What is the difference between “{a}” and “{b}”?',
    aPron: 'UK {uk}{us}. Use the speaker button on this page to listen.', aPronUS: ', US {us}',
    cta: 'Learn “{w}” with flashcards and spaced review', ctaN: 'Free, with audio and reminders at the right time.', ctaB: 'Open “{w}” in the app',
    goes: 'Goes with', synL: 'Synonyms', save: 'Save to flashcards', speak: 'Practise pronunciation', more: 'Details', usage: 'Usage', slow: 'Listen slowly',
    lv: 'Level', pos: { n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb', prep: 'preposition', conj: 'conjunction', pron: 'pronoun', det: 'determiner', phr: 'phrase', phrv: 'phrasal verb', idiom: 'idiom', int: 'interjection', num: 'number' },
    hubTitle: 'English dictionary: {n} common words with audio and examples', hubDesc: 'Meanings of {n} common English words with UK/US pronunciation audio, example sentences, collocations, confusing pairs and quick quizzes.',
    hubLead: 'Each page explains one word: meaning, pronunciation, examples, usage, common mistakes and a self-check.',
    foot: 'Lexkite – English dictionary for learners',
    ant: 'Opposites', fam: 'Word family', wnH: 'Other meanings of “{w}”', wnSrc: 'Source: Open English WordNet 2025 (CC BY 4.0)', toolsH: 'Keep practising for free',
    letter: 'English words starting with {c} – English dictionary', letterLead: '{n} words starting with {c}, each with a definition, pronunciation and examples.', top: 'Most common words', azH: 'Browse A–Z',
  },
};

export const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => (o[k] ?? ''));
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const clip = (s, n = 158) => { s = String(s ?? '').replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; const c = s.slice(0, n - 1); return c.slice(0, Math.max(c.lastIndexOf(' '), n * 0.6)).replace(/[\s,;:–—-]+$/, '') + '…'; };
const ld = o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
const md = s => esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\*([^*]+)\*/g, '<i>$1</i>');
const en = (s, tag = 'span') => `<${tag} lang="en" dir="ltr">${esc(s)}</${tag}>`;

// Cổng mở index (§5): DICT_INDEX = '' (tắt – MẶC ĐỊNH) | '{"vi":50,"en":50}' = mở N trang ứng viên điểm cao nhất mỗi ngôn ngữ | 'all'.
export const parseOpen = v => { if (!v) return {}; if (v === 'all') return { vi: 1e9, en: 1e9 }; try { const o = JSON.parse(v); return o && typeof o === 'object' ? o : {}; } catch { return {}; } };
export const isIndexable = (d, open) => !!(d.quality && d.quality.index && d.quality.rank < (+open[d.lang] || 0));

// Trang một từ. alts: { vi: {slug, q:{index,rank}}, en: … } – hreflang chỉ giữa các bản ĐỀU index được (trang noindex không vào cụm, §4).
export function renderWord(d, shell, { open = {} } = {}) {
  const l = d.lang, t = T[l], w = d.word, W = cap(w), idx = isIndexable(d, open);
  const p = wordPath(l, d.slug), u = SITE + p;
  const alts = idx ? Object.entries(d.alts || {}).filter(([x, a]) => isIndexable({ lang: x, quality: a.q }, open)).map(([x, a]) => [x, wordPath(x, a.slug)]) : [];
  if (alts.length > 1 && alts.some(([x]) => x === 'en')) alts.push(['x-default', wordPath('en', d.alts.en.slug)]);
  const hreflang = alts.length > 1 ? alts.map(([x, q]) => `<link rel="alternate" hreflang="${x}" href="${SITE + q}">`).join('') : '';
  const title = fill(t.title, { W, w }), desc = clip(fill(t.desc, { W, w, m: d.meaning, ipa: d.ipa }));
  const posL = (t.pos[d.pos] || d.pos || '');
  const crumbs = [[t.home, landing(l)], [t.hub, hubPath(l)], [W, p]];
  const faq = [[fill(t.fMean, { W, w }), fill(t.aMean, { w, m: d.meaning, d: d.def, p: posL })], [fill(t.fPron, { w }), fill(t.aPron, { uk: d.ipa, us: d.ipaUS ? fill(t.aPronUS, { us: d.ipaUS }) : '' })]];
  for (const c of (d.confus || []).slice(0, 1)) if (c.tip && c.items.length >= 2) faq.push([fill(t.fDiff, { a: c.items[0].h, b: c.items[1].h }), c.tip.replace(/\*+/g, '')]);
  // Thẻ chính = CÙNG markup/CSS với màn tra từ của app & add-on (web/js/app.js paint(), web/css/style.css – build.mjs appCss()); các khối sau là thẻ .card
  const sec = (id, h, inner, ic = '') => `<section class="card blk" aria-labelledby="h-${id}"><h2 id="h-${id}">${ic ? `<span aria-hidden="true">${ic}</span> ` : ''}${esc(h)}</h2>${inner}</section>`;
  const link = x => (x.href ? `<a class="chip wc-chip" href="${x.href}" lang="en" dir="ltr">${esc(x.w)}</a>` : `<span class="chip wc-chip" lang="en" dir="ltr">${esc(x.w)}</span>`);
  const re = new RegExp(`\\b(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:s|es|d|ed|ing)?)\\b`, 'gi');
  const hl = x => esc(x).replace(re, '<mark>$1</mark>');
  const chips = (ic, lb, list) => (list.length ? `<div class="wc-chips"><span class="wc-clb">${ic} ${esc(lb)}</span>${list.join('')}</div>` : '');
  const pairs = list => `<ul class="wc-pairs">${list.map(x => `<li class="wc-pair"><div class="wc-wrong"><span class="wc-mk" aria-hidden="true">✕</span><span class="sr-only">${esc(t.wrong)}: </span><span><s lang="en">${esc(x.w)}</s></span></div><div class="wc-right"><span class="wc-mk" aria-hidden="true">✓</span><span class="sr-only">${esc(t.right)}: </span><span><b lang="en">${esc(x.r)}</b>${x.why ? ` <span class="wc-why">${md(x.why)}</span>` : ''}</span></div></li>`).join('')}</ul>`;
  const body = [
    // ① Khung tra từ y hệt cửa sổ add-on (CSS lấy từ extension/content.js – build.mjs addonCss())
    `<div class="lkb"><div class="head"><div class="pic${d.emoji ? '' : ' ltr'}" aria-hidden="true">${esc(d.emoji || w.charAt(0))}</div><div class="mw0">
<div><h1 class="w" lang="en" dir="ltr">${esc(w)}</h1>${d.pos ? `<span class="chip" title="${esc(posL)}">${esc(d.pos)}</span>` : ''}${d.level ? `<span class="chip lv" title="CEFR">${esc(d.level)}</span>` : ''}</div>
<div class="ipa" dir="ltr">${esc(d.ipa)}${d.ipaUS && d.ipaUS !== d.ipa ? ` · <span title="${esc(t.us)}">${esc(d.ipaUS)}</span>` : ''}</div>
<div class="spks"><button type="button" class="spk" data-acc="en-GB" data-w="${esc(w)}"${d.audio ? ` data-a="${esc(d.audio)}"` : ''} aria-label="${esc(t.play)} (${esc(t.uk)})">🔊 UK</button><button type="button" class="spk" data-acc="en-US" data-w="${esc(w)}" aria-label="${esc(t.play)} (${esc(t.us)})">🔊 US</button><button type="button" class="spk" data-acc="en-GB" data-w="${esc(w)}" data-slow aria-label="${esc(t.slow)}">🐢</button></div>
<h2 class="sr-only" id="h-m">${esc(fill(t.mean, { w }))}</h2><div class="vi"${l === 'en' ? ' lang="en"' : ''}>${esc(l === 'en' ? d.def : d.meaning)}</div>
</div></div>
<div class="body"><div class="pg">${posL ? `<span class="chip">${esc(posL)}</span>` : ''}${l === 'en' ? '' : `<span class="pvi">${esc(d.meaning)}</span>`}<div class="pdef" lang="en" dir="ltr">${esc(d.def)}<span class="pex">“${hl(d.examples[0])}” <button type="button" class="spk mini" data-text="${esc(d.examples[0])}" aria-label="${esc(t.play)}">🔊</button></span></div></div>
${d.note && (d.note.m || d.note.e) ? `<div class="wn-x">${d.note.m ? `<div>💡 ${esc(d.note.m)}</div>` : ''}${d.note.e ? `<div>⚠️ ${esc(d.note.e)}</div>` : ''}</div>` : ''}</div>
<div class="foot"><a class="btn p" href="${esc(d.app)}">+ ${esc(t.save)}</a><a class="btn" href="${esc(d.app)}">${esc(t.more)}</a>${d.usage ? `<a class="btn" href="${esc(d.app.replace(/#\/dict\/.*/, '#/usage/' + encodeURIComponent(w.toLowerCase())))}">📘 ${esc(t.usage)}</a>` : ''}</div></div>`,
    // ② Phần "Chi tiết" như màn tra từ của app: ví dụ, hay đi với, đồng nghĩa, 🧠 Hiểu sâu
    `<section class="card" aria-labelledby="h-e"><h2 id="h-e"><span aria-hidden="true">💬</span> ${esc(t.ex)}</h2><div class="example-box">${d.examples.map(x => `<p lang="en" dir="ltr">${hl(x)}</p>`).join('')}</div>
${chips('🔗', t.goes, d.col.map(x => `<span class="chip wc-chip" lang="en" dir="ltr">${esc(x)}</span>`))}${chips('≈', t.synL, d.syn.map(link))}${chips('↔', t.ant, (d.ant || []).map(link))}${chips('🌱', t.fam, (d.fam || []).map(link))}
${d.noteHtml || (d.note ? `<div class="notes">${[['m', t.nm], ['e', t.ne], ['u', t.nu], ['f', t.nf]].filter(([q]) => d.note[q]).map(([q, lb]) => `<p class="note"><b>${esc(lb)}:</b> ${esc(d.note[q])}</p>`).join('')}</div>` : '')}
</section>`,
    // 💰 ③ ô quảng cáo (chỉ khi shell.ad): DƯỚI thẻ chính + ví dụ – không bao giờ phía trên nội dung chính (giữ LCP), khung cao cố định (0 CLS)
    shell.ad ? adHold('dict', l) : '',
    d.patterns.length ? sec('t', t.pat, `<ul class="wc-use">${d.patterns.map(x => `<li><span class="wc-tag" lang="en">${esc(x.h)}</span><span>${esc(x.m)}${x.ex ? `<br><i lang="en" dir="ltr">${hl(x.ex)}</i>` : ''}</span></li>`).join('')}</ul>`, '📐') : '',
    d.confus.length ? sec('k', fill(t.conf, { w }), d.confus.map(c => `<div class="pair">${c.items.map(x => `<div class="pos-block"><div class="pos-head">${x.href ? `<a href="${x.href}" lang="en" dir="ltr"><b>${esc(x.h)}</b></a>` : `<b lang="en" dir="ltr">${esc(x.h)}</b>`}<span class="vi">${esc(x.m)}</span></div>${x.ex ? `<div class="ex" lang="en" dir="ltr">“${hl(x.ex)}”</div>` : ''}</div>`).join('')}${c.tip ? `<p class="tip">💡 ${md(c.tip)}</p>` : ''}</div>`).join(''), '⚖️') : '',
    d.mistakes.length ? sec('x', t.mis, pairs(d.mistakes), '⚠️') : '',
    (d.wn || []).length ? sec('w', fill(t.wnH, { w }), `<ol lang="en" dir="ltr">${d.wn.map(x => `<li>${esc(x.g)}${x.x ? `<br><i>“${hl(x.x)}”</i>` : ''}</li>`).join('')}</ol><p class="muted small"><a href="https://github.com/globalwordnet/english-wordnet" rel="noopener">${esc(t.wnSrc)}</a></p>`, '📗') : '',
    d.quiz.length ? sec('q', t.quiz, `<ol class="quiz">${d.quiz.map(q => `<li><p><b>${esc(q.q)}</b></p>${q.s ? `<p class="ex">${en(q.s)}</p>` : ''}<ul class="opts">${q.o.map(o => `<li><span class="chip">${q.oEn ? en(o) : esc(o)}</span></li>`).join('')}</ul><details><summary>${esc(t.ans)}</summary><p class="ok">✓ ${q.oEn ? en(q.o[q.a], 'b') : `<b>${esc(q.o[q.a])}</b>`}</p></details></li>`).join('')}</ol>`, '✍️') : '',
    `<div class="cta"><p><strong>${esc(fill(t.cta, { w }))}</strong><small>${esc(t.ctaN)}</small></p><a class="btn" href="${esc(d.app)}">${esc(fill(t.ctaB, { w }))} →</a></div>`,
    sec('f', t.faq, faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join(''), '❓'),
    d.blog.length ? sec('b', t.blog, `<ul>${d.blog.map(b => `<li><a href="${b.href}">${esc(b.t)}</a></li>`).join('')}</ul>`, '📚') : '',
    (d.tools || []).length ? sec('o', t.toolsH, `<ul>${d.tools.map(x => `<li><a href="${x.href}">${esc(x.t)}</a></li>`).join('')}</ul>`, '🎯') : '',
    d.related.length ? sec('r', t.rel, `<div class="wc-chips">${d.related.map(link).join('')}</div>`, '🔎') : '',
  ].filter(Boolean).join('\n');
  const jl = [
    { '@context': 'https://schema.org', '@type': 'DefinedTerm', name: w, description: l === 'en' ? d.def : `${d.meaning} – ${d.def}`, inLanguage: l, url: u, termCode: d.slug, inDefinedTermSet: { '@type': 'DefinedTermSet', name: `Lexkite – ${t.hub}`, url: SITE + hubPath(l) } },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    crumbsLd(crumbs),
  ];
  const lh = x => (d.alts && d.alts[x] ? wordPath(x, d.alts[x].slug) : ENABLED.includes(x) ? hubPath(x) : landing(x));
  return page({ l, title, desc, u, robots: idx ? '' : 'noindex,follow', hreflang, jl, crumbs, body, shell, lh, ad: !!shell.ad });
}

export function renderHub(l, all, shell, { open = {}, letter = '' } = {}) {
  if (letter) return renderLetter(l, all, shell, { open, letter });
  const items = all.filter(d => !(d.quality && d.quality.pool)); // trang chính: N từ của bậc hiện tại; cả pool qua trang A–Z
  const t = T[l], p = hubPath(l), n = all.length;
  const title = fill(t.hubTitle, { n }), desc = clip(fill(t.hubDesc, { n }));
  const anyIdx = items.some(d => isIndexable(d, open));
  const crumbs = [[t.home, landing(l)], [t.hub, p]];
  const letters = [...new Set(items.map(d => d.word[0].toUpperCase()))].sort();
  const body = `<article class="page wd"><header class="hero"><h1>${esc(title)}</h1><p>${esc(t.hubLead)}</p></header>
<h2>${esc(t.azH)}</h2><nav class="letters" aria-label="A–Z">${[...new Set(all.map(d => d.word[0].toUpperCase()))].sort().map(c => `<a href="${letterPath(l, c)}">${c}</a>`).join('')}</nav>
<h2>${esc(t.top)}</h2>${letters.map(c => `<section aria-labelledby="l-${c}"><h2 id="l-${c}">${c}</h2><ul class="az">${items.filter(d => d.word[0].toUpperCase() === c).map(d => `<li><a href="${wordPath(l, d.slug)}" lang="en" dir="ltr">${esc(d.word)}</a> <small>${esc(d.meaning.split(/[;,]/)[0])}</small></li>`).join('')}</ul></section>`).join('\n')}</article>`;
  const alts = anyIdx ? [...ENABLED.map(x => [x, hubPath(x)]), ['x-default', hubPath('en')]] : [];
  const hreflang = alts.map(([x, q]) => `<link rel="alternate" hreflang="${x}" href="${SITE + q}">`).join('');
  const jl = [{ '@context': 'https://schema.org', '@type': 'DefinedTermSet', name: `Lexkite – ${t.hub}`, description: desc, inLanguage: l, url: SITE + p }, crumbsLd(crumbs)];
  const lh = x => (ENABLED.includes(x) ? hubPath(x) : landing(x));
  return page({ l, title: title + ' | Lexkite', desc, u: SITE + p, robots: anyIdx ? '' : 'noindex,follow', hreflang, jl, crumbs, body, shell, lh });
}

// Trang A–Z: mọi từ trong pool bắt đầu bằng 1 chữ (noindex,follow – chỉ để điều hướng, không cạnh tranh với trang từ)
function renderLetter(l, all, shell, { letter }) {
  const t = T[l], C = letter.toUpperCase(), p = letterPath(l, letter), items = all.filter(d => d.word[0].toUpperCase() === C), title = fill(t.letter, { c: C });
  const crumbs = [[t.home, landing(l)], [t.hub, hubPath(l)], [C, p]];
  const body = `<article class="page wd"><header class="hero"><h1>${esc(title)}</h1><p>${esc(fill(t.letterLead, { n: items.length, c: C }))}</p></header>
<nav class="letters" aria-label="A–Z">${[...new Set(all.map(d => d.word[0].toUpperCase()))].sort().map(c => (c === C ? `<span aria-current="page">${c}</span>` : `<a href="${letterPath(l, c)}">${c}</a>`)).join('')}</nav>
<ul class="az">${items.map(d => `<li><a href="${wordPath(l, d.slug)}" lang="en" dir="ltr">${esc(d.word)}</a> <small>${esc(d.meaning.split(/[;,]/)[0])}</small></li>`).join('')}</ul></article>`;
  const lh = x => (ENABLED.includes(x) ? letterPath(x, letter) : landing(x));
  return page({ l, title: title + ' | Lexkite', desc: clip(fill(t.letterLead, { n: items.length, c: C })), u: SITE + p, robots: 'noindex,follow', hreflang: '', jl: [crumbsLd(crumbs)], crumbs, body, shell, lh });
}

// Sitemap shard (≤ 10.000 URL/file – nhỏ để GSC báo tỷ lệ index theo lô): chỉ trang index được, kèm hreflang như <head>.
export function renderSitemap(rows) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${rows.map(r => `<url><loc>${r.loc}</loc><lastmod>${r.lastmod}</lastmod>${(r.alts || []).map(([x, q]) => `<xhtml:link rel="alternate" hreflang="${x}" href="${q}"/>`).join('')}</url>`).join('\n')}\n</urlset>\n`;
}

const crumbsLd = items => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, u], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + u })) });
const crumbsHtml = items => `<nav class="crumbs" aria-label="Breadcrumb">${items.map(([n, u], i) => (i === items.length - 1 ? `<span aria-current="page">${esc(n)}</span>` : `<a href="${u}">${esc(n)}</a>`)).join(' › ')}</nav>`;

function page({ l, title, desc, u, robots, hreflang, jl, crumbs, body, shell, lh, ad = false }) {
  const t = T[l], sh = (s = '') => s.replace(/__LH_([a-z]{2})__/g, (_, x) => lh(x));
  const head = `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}">${robots ? `<meta name="robots" content="${robots}">` : ''}<meta name="theme-color" content="#0F3D3E"><link rel="canonical" href="${u}">${hreflang}<meta property="og:type" content="article"><meta property="og:site_name" content="Lexkite"><meta property="og:url" content="${u}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${SITE}/og-default.png"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/icons/icon.svg?v=2" type="image/svg+xml"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png?v=2">${jl.map(ld).join('')}`;
  return `<!doctype html><html lang="${l}"><head>${head}<style>${shell.css}</style></head><body><a class="skip" href="#nd">${esc(t.skip)}</a>
${sh(shell.header[l])}
<main id="nd">
${crumbsHtml(crumbs)}
${body.startsWith('<article') ? body : `<article class="page wd">\n${body}\n</article>`}
</main>
${sh(shell.footer[l])}
<script>${shell.js}</script>${ad ? AD_JS : ''}</body></html>`;
}
