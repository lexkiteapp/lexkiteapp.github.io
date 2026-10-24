// Bản tiếng Anh của các trang tĩnh SEO (cho người học quốc tế): dist/en/{samples,speaking,vocabulary}/…
// + hreflang vi ↔ en giữa 2 bản. Chạy sau build-samples.mjs. Giao diện chung: scripts/lib/site-layout.mjs.
import fs from 'node:fs'; import vm from 'node:vm'; import { execFileSync } from 'node:child_process';
import { clip, esc, ld, seoPage, sectionNav, filterBox, setCard, ctaBox, extBox, pwaBox, audioBtn, SEO_L, FIND_I18N } from './lib/site-layout.mjs';
import { loadWriting, loadSpeaking, loadVocab, vocabMeta, relatedOf, loadGrammar, loadLetters, loadTask1, loadPron } from './lib/seo-data.mjs';
import crypto from 'node:crypto';
import { embedWatermark } from '../content/protection/watermark.mjs';
import { S as SU, parseDoc, docStats, mins, docHtml, sideHtml, stats, hero2, promptBox, phraseCards, saveBox, ctaKit, pager2, typeCls, toneCls, topicEmoji, topicCls, smpCard, group2, typeFilter, itemList, smpHead, smpTail } from './lib/samples-ui.mjs';
const SITE = 'https://lexkite.com/', OG = `${SITE}og-default.png`, L = SEO_L.en, U = SU.en;
// URL công khai không đuôi .html (Cloudflare Pages chuyển 308 /x.html → /x); file trên đĩa vẫn là *.html
const today = new Date().toISOString().slice(0, 10);
const gitDate = (...f) => { try { return execFileSync('git', ['log', '-1', '--format=%cs', '--', ...f], { encoding: 'utf8' }).trim() || today; } catch { return today; } };
let lm = today; // ngày sửa dữ liệu của mục đang sinh (lastmod trong sitemap)
const sm = 'dist/sitemap.xml', urls = [];
const SEC = { samples: 'Writing samples', speaking: 'IELTS Speaking', vocabulary: 'Vocabulary', grammar: 'Grammar', pronunciation: 'Pronunciation', 'ielts-writing': 'IELTS Writing' };
const SUB = { 'task-1': 'Academic Task 1', 'general-task-1': 'General Training Task 1' }; // mục con 2 tầng: /en/<mục>/<mục con>/<bài>
const VI = { samples: 'samples', speaking: 'speaking', vocabulary: 'tu-vung' };
const crumbs = (path, name) => { const p = path.split('/'), it = [['Home', SITE + 'en/'], [SEC[p[1]] || p[1], `${SITE}en/${p[1]}/`]]; if (SUB[p[2]] && p[3]) it.push([SUB[p[2]], `${SITE}en/${p[1]}/${p[2]}/`]); if (p[2]) it.push([name, SITE + path]);
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: it.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: u })) }; };
// <!--HL--> được out() thay bằng hreflang vi/en/x-default nếu bản tiếng Việt tồn tại. <head> giữ nguyên từng thẻ như bản cũ.
// o: { lr: thuộc tính thêm cho LearningResource, ld: JSON-LD thêm } – trang bài mẫu/speaking tự gắn CSS samples-ui (.smp)
const head = (title, desc0, path, o = {}) => { const desc = clip(desc0); return `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><meta name="theme-color" content="#0F3D3E"><link rel="canonical" href="${SITE}${path}"><!--HL--><meta property="og:type" content="article"><meta property="og:site_name" content="Lexkite"><meta property="og:locale" content="en_US"><meta property="og:url" content="${SITE}${path}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${OG}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/icons/icon.svg?v=2" type="image/svg+xml"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png?v=2">${ld({ '@context': 'https://schema.org', '@type': 'LearningResource', name: title, description: desc, url: SITE + path, inLanguage: 'en', isAccessibleForFree: true, educationalLevel: 'IELTS / TOEIC', provider: { '@type': 'Organization', name: 'Lexkite', url: SITE }, ...(o.lr || {}) })}${ld(crumbs(path, title.replace(/\s*[–|]\s*Lexkite$/, '')))}${(o.ld || []).map(ld).join('')}${/^en\/(samples|speaking|ielts-writing)\//.test(path) ? smpHead() : ''}`; };
const page = (title, desc, path, viPath, body, name, o = {}) => {
  const p = path.split('/'), sec = p[1], id = p[2];
  const vis = [['Home', '/en/'], [SEC[sec] || sec, `/en/${sec}/`], ...(SUB[id] && p[3] ? [[SUB[id], `/en/${sec}/${id}/`]] : []), ...(id ? [[name || title, `/${path}`]] : [])];
  return seoPage({ lang: 'en', head: head(title, desc, path, o), crumbs: vis, body, alt: fs.existsSync(file(viPath)) ? `/${viPath}` : '', section: `/en/${sec}/` });
};
const file = p => 'dist/' + (p.endsWith('/') ? p + 'index.html' : p + '.html');
// Cặp vi ↔ en: hreflang hai chiều giống hệt nhau (vi, en, x-default → bản tiếng Anh cho người dùng ngôn ngữ khác)
// type: trang bài học mới (grammar/pronunciation/ielts-writing) → sitemap-<type>.xml riêng (đo GSC theo loại) + .seo-urls-en.txt (IndexNow, build-seo-pages.mjs gộp)
const typed = [];
const out = (path, viPath, html, type) => { fs.mkdirSync('dist/' + path.replace(/[^/]*$/, ''), { recursive: true }); if (type) typed.push([path, lm, type, fs.existsSync(file(viPath)) ? viPath : '', html]); else urls.push([path, lm]);
  const vf = file(viPath), hl = fs.existsSync(vf) ? `<link rel="alternate" hreflang="vi" href="${SITE}${viPath}"><link rel="alternate" hreflang="en" href="${SITE}${path}"><link rel="alternate" hreflang="x-default" href="${SITE}${path}">` : '';
  fs.writeFileSync(file(path), html.replace('<!--HL-->', hl));
  if (hl) { const v = fs.readFileSync(vf, 'utf8'); if (!v.includes('<link rel="alternate" hreflang="en"')) fs.writeFileSync(vf, v.replace('<meta property="og:type"', hl + '<meta property="og:type"')); } };
const hero = (h1, { emoji = '', lead = '', chips = [] } = {}) => `<header class="hero"><h1>${emoji ? `<span class="em" aria-hidden="true">${esc(emoji)}</span>` : ''}${h1}</h1>${lead ? `<p>${lead}</p>` : ''}${chips.length ? `<div class="sub">${chips.map(c => Array.isArray(c) ? `<span class="chip ${c[1]}">${esc(c[0])}</span>` : `<span class="chip">${esc(c)}</span>`).join('')}</div>` : ''}</header>`;
const indexHero = (h1, lead, sec) => `${hero(esc(h1), { lead })}\n${sectionNav('en', `/en/${sec}/`)}\n${filterBox('en')}`;
const related = (items, card) => items.length ? `<section class="grp" aria-labelledby="rel"><h2 id="rel">${L.related}</h2><div class="grid">${items.map(card).join('')}</div></section>` : '';
const group = (id, title, sub, cards) => `<section class="grp" aria-labelledby="g-${id}"><h2 id="g-${id}">${esc(title)} <small>${sub}</small></h2><div class="grid">${cards.join('')}</div></section>`;
const short = (s, n) => s.length > n ? s.slice(0, n - 3).replace(/\s+\S*$/, '') + '…' : s;
const APP = '/app/?hl=en#';
const SEEN = new Set(), uniqT = (a, b) => { const v = SEEN.has(a) ? b : a; SEEN.add(v); return v; }; // tiêu đề/mô tả không trùng (scripts/test/seo-pages.mjs)

// ---- Writing Task 2 ---- (giao diện bài mẫu: scripts/lib/samples-ui.mjs – nhãn vai trò đoạn/câu bằng tiếng Anh, không có nghĩa tiếng Việt)
{
  lm = gitDate('web/js/write.js', 'web/js/models.js', 'web/js/write');
  const { PROMPTS: P, MODELS } = loadWriting();
  const done = []; for (const p of P) { const m = MODELS.find(x => x.id === 't2-' + p.id); if (m) done.push([p, m]); }
  const t2Card = ([p, m]) => smpCard({ href: `/en/samples/${p.id}`, cls: typeCls(p.type), tag: p.type, title: p.text, band: m.band, meta: [`${m.words} ${U.words}`, `${docStats(m.text).phrases} ${U.phrases}`, U.min(mins(m.words))], key: `${p.type} ${p.topic}` });
  done.forEach(([p, m], di) => {
    const gl = [...m.text.matchAll(/\[\[([^|\]]*)\|/g)].map(x => x[1]);
    const paras = parseDoc(m.text, 'en'), st = docStats(m.text), prev = done[di - 1], next = done[di + 1];
    out(`en/samples/${p.id}`, `samples/${p.id}`, page(`IELTS Writing Task 2 Band ${m.band} Sample: ${short(p.text, 70)}`, uniqT(`Band ${m.band} IELTS Writing Task 2 model answer (${p.type}, ${m.words} words) with ${gl.length} highlighted high-scoring phrases and linking words.`, `Band ${m.band} IELTS Writing Task 2 model answer (${p.type}, ${m.words} words): ${short(p.text, 90)}`), `en/samples/${p.id}`, `samples/${p.id}`,
      `<article class="page smp smp-doc ${typeCls(p.type)}">${hero2({ kicker: ['IELTS Writing Task 2', `Question type: ${p.type}`], h1: `IELTS Writing Task 2 – Band ${esc(m.band)} Sample`,
        statsHtml: stats([[m.band, 'Band', 'band'], [m.words, U.words], [paras.length, U.paras], [st.phrases, U.phrases], [st.links, U.links], [mins(m.words), U.minL]]) })}
${promptBox(U.prompt, `<p>${esc(p.text)}</p>`)}
${ctaBox(`${APP}/model/t2-${p.id}`, '✍️ Practise this question free on Lexkite', 'Open in the app', 'Interactive model answer, outline and linking words.')}
<div class="ess-grid">${sideHtml(paras, 'en')}<div class="ess-main"><h2>Model answer</h2>${embedWatermark(docHtml(paras, 'en'), `LK:en/samples/${p.id}:${lm.replace(/-/g, '')}`)}
<h2>Useful phrases (${gl.length})</h2>${phraseCards(gl.map(e => [e]))}${saveBox(`${APP}/model/t2-${p.id}`, 'en')}</div></div>
${ctaKit(`${APP}/write/${p.id}`, 'Write your own answer and get instant feedback', 'Start writing', 'Word count, idea prompts and scoring on the 4 IELTS criteria.')}
${pager2(prev && [`/en/samples/${prev[0].id}`, short(prev[0].text, 90)], next && [`/en/samples/${next[0].id}`, short(next[0].text, 90)], 'en')}
${related(relatedOf(done, done[di], d => d[0].type === p.type, 4), t2Card)}
${extBox('en', 'samples')}
${pwaBox('en', 'samples')}</article>${smpTail('en')}`, `Band ${m.band}: ${short(p.text, 50)}`,
      { lr: { learningResourceType: 'Sample essay', wordCount: m.words, timeRequired: `PT${mins(m.words)}M`, teaches: `IELTS Writing Task 2 – ${p.type}`, assesses: `IELTS Band ${m.band}` } }));
  });
  const by = {}; for (const d of done) (by[d[0].type] = by[d[0].type] || []).push(d);
  const types = Object.entries(by), gls = done.reduce((a, [, m]) => a + docStats(m.text).phrases, 0);
  out('en/samples/', 'samples/', page(`${done.length} IELTS Writing Task 2 Band 8 Sample Essays – Lexkite`, `${done.length} band 8 IELTS Writing Task 2 model essays by question type, with highlighted phrases. Practise and get feedback free.`, 'en/samples/', 'samples/',
    `<div class="page smp">${hero2({ h1: esc(`${done.length} IELTS Writing Task 2 sample essays (band 8)`), lead: 'Original model answers grouped by question type, with high-scoring phrases highlighted.', mood: 'think', cls: 'has-kit',
      statsHtml: stats([[done.length, U.statEss], [types.length, U.statTypes], ['8.0', 'Band', 'band'], [gls.toLocaleString('en'), U.statGl]]) })}
${sectionNav('en', '/en/samples/')}
${filterBox('en', typeFilter(types.map(([ty, xs], i) => [`t${i}`, ty, xs.length, typeCls(ty)]), done.length, 'en'))}
${types.map(([ty, xs], i) => group2(`t${i}`, ty, `${xs.length} ${L.items}`, xs.map(t2Card), typeCls(ty))).join('\n')}</div>${smpTail('en')}`, undefined,
    { ld: [itemList('IELTS Writing Task 2 sample essays', done.map(([p]) => `${SITE}en/samples/${p.id}`))] }));
}

// ---- Speaking ----
{
  lm = gitDate('web/js/speaking.js', 'web/js/speak');
  const { BANK, S } = loadSpeaking();
  const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  // Bản tiếng Việt đổi cả Đ → D ('Đọc sách' → speaking/doc-sach); URL tiếng Anh giữ nguyên (oc-sach) nhưng hreflang phải trỏ đúng bản vi
  const viSlug = s => slug(s.replace(/Đ/g, 'D'));
  const name = b => b.p2.q.replace(/^Describe\s+/i, '').replace(/\.$/, '');
  const vch = v => v && v.length ? `<ul class="vch"><li class="k">${U.vocab}</li>${v.map(e => `<li><b>${esc(e[0])}</b></li>`).join('')}</ul>` : '';
  const ans = q => { const s = S[q]; return s ? `<div class="ans"><p>${esc(s.a)}</p></div>${vch(s.vocab)}` : ''; };
  const qa = (q, n) => `<div class="qa"><h3><span class="qn" aria-hidden="true">Q${n}</span><span>${esc(q)}</span></h3>${ans(q)}</div>`;
  const qs = b => [...b.p1, b.p2.q, ...b.p3];
  const part = (n, icon, h, inner) => `<section class="part" id="part-${n}" aria-labelledby="ph-${n}"><h2 id="ph-${n}"><span class="pb" aria-hidden="true">${icon}</span>${h}</h2><p class="pdesc">${U.parts[n - 1]}</p>${inner}</section>`;
  const made = BANK.map((b, i) => [slug(b.title), b, i]);
  const spCard = ([id, b]) => smpCard({ href: `/en/speaking/${id}`, cls: topicCls(b.topic), tag: b.topic ? b.topic.replace(/-/g, ' ') : 'Part 1–3', emoji: topicEmoji(b.topic), title: name(b), desc: b.p2.q, meta: ['Part 1–3', `${qs(b).length} ${U.questions}`], key: b.topic || '' });
  for (const [id, b, i] of made) {
    const topic = (b.topic || '').replace(/-/g, ' '), prev = made[i - 1], next = made[i + 1];
    const nV = qs(b).reduce((a, q) => a + ((S[q] && S[q].vocab) || []).length, 0), nW = qs(b).reduce((a, q) => a + ((S[q] && S[q].a) || '').split(/\s+/).length, 0);
    out(`en/speaking/${id}`, `speaking/${viSlug(b.title)}`, page(uniqT(`IELTS Speaking: ${b.p2.q.replace(/\.$/, '')} – Part 1, 2, 3 Sample Answers`, `IELTS Speaking (${topic}): ${b.p2.q.replace(/\.$/, '')} – Sample Answers`), uniqT(`IELTS Speaking questions on ${topic} (Parts 1–3) with band 8 sample answers. Cue card: ${b.p2.q}`, `Band 8 IELTS Speaking sample answers (${topic}, Parts 1–3). Part 1: ${(b.p1 && b.p1[0] && (b.p1[0].q || b.p1[0])) || ''} Cue card: ${b.p2.q}`), `en/speaking/${id}`, `speaking/${viSlug(b.title)}`,
      `<article class="page smp smp-doc narrow ${topicCls(b.topic)}">${hero2({ kicker: ['IELTS Speaking', ...(topic ? [topic] : [])], h1: `IELTS Speaking – ${esc(name(b))}`,
        statsHtml: stats([[qs(b).length, U.questions], [nV, U.phrases], [mins(nW), U.minL]]) })}
<nav class="jump" aria-label="${U.partsL}"><a href="#part-1">Part 1</a><a href="#part-2">Part 2 – Cue card</a><a href="#part-3">Part 3</a></nav>
${ctaBox(`${APP}/speaking/p1/${i}`, '🎙️ Practise speaking this topic (record & get feedback)', 'Practise speaking', 'Record your answer and get feedback on pronunciation and fluency.')}
${part(1, '💬', 'Part 1', b.p1.map((q, k) => qa(q, k + 1)).join(''))}
${part(2, '🃏', 'Part 2 – Cue card', `<div class="q cue"><p class="ck">Cue card</p><p>${esc(b.p2.q)}</p><p class="ys">${U.youShould}</p><ul>${b.p2.points.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div><div class="qa">${ans(b.p2.q)}</div>`)}
${part(3, '🧠', 'Part 3', b.p3.map((q, k) => qa(q, k + 1)).join(''))}
${ctaKit(`${APP}/speaking/p2/${i}`, 'Try Part 2 with a timer', 'Start', '1 minute to prepare, 2 minutes to speak – just like the real test.')}
${pager2(prev && [`/en/speaking/${prev[0]}`, name(prev[1])], next && [`/en/speaking/${next[0]}`, name(next[1])], 'en', true)}
${related(relatedOf(made, made[i], () => true, 4), spCard)}
${extBox('en', 'speaking')}
${pwaBox('en', 'speaking')}</article>${smpTail('en')}`, name(b),
      { lr: { learningResourceType: 'Sample answers', teaches: `IELTS Speaking – ${topic || name(b)}`, timeRequired: `PT${mins(nW)}M` } }));
  }
  const nQ = made.reduce((a, [, b]) => a + qs(b).length, 0);
  out('en/speaking/', 'speaking/', page(`${made.length} IELTS Speaking Topics with Sample Answers – Lexkite`, `${made.length} IELTS Speaking topics: Part 1–3 questions, Part 2 cue cards and band 8 sample answers. Practise free.`, 'en/speaking/', 'speaking/',
    `<div class="page smp">${hero2({ h1: esc(`${made.length} IELTS Speaking topics`), lead: 'Part 1–3 questions, Part 2 cue cards and original band 8 sample answers.', mood: 'happy', cls: 'has-kit', statsHtml: stats([[made.length, U.statTopics], [nQ, U.statQ], ['Part 1–3', 'IELTS']]) })}
${sectionNav('en', '/en/speaking/')}
${filterBox('en')}
${group2('all', 'Topics', `${made.length} ${L.items}`, made.map(spCard))}</div>${smpTail('en')}`, undefined,
    { ld: [itemList('IELTS Speaking topics', made.map(([id]) => `${SITE}en/speaking/${id}`))] }));
}

// ---- Vocabulary ----
{
  lm = gitDate('web/js/data.js', 'web/js/lib', 'web/js/i18n/en.js');
  const { TOPICS: TP, audioKey } = loadVocab();
  const G = { topics: 'IELTS Vocabulary by Topic', writing: 'IELTS Writing Vocabulary', speaking: 'IELTS Speaking Vocabulary', awl: 'Academic Word List (AWL)', core: 'Core Vocabulary (NGSL)', toeic: 'TOEIC Vocabulary', domain: 'Vocabulary for Specific Fields', exam: 'Vocabulary by Exam' };
  const c = { self: {}, window: {} }; c.self = c.window = c; vm.createContext(c); vm.runInContext(fs.readFileSync('web/js/i18n/en.js', 'utf8'), c);
  const D = (c.I18N_DICT && c.I18N_DICT.en) || {};
  const enName = x => D[x.name] || x.id.replace(/^(ex|dom|awl|ngsl|tsl)-/, '').replace(/-/g, ' ').replace(/\b\w/g, m => m.toUpperCase());
  const chipsOf = x => { const { level, exams } = vocabMeta(x); return [[`${x.words.length} words`, 'ink'], ...(level ? [[level, 'alt']] : []), ...exams]; };
  const vCard = x => setCard({ href: `/en/vocabulary/${x.id}`, title: enName(x), emoji: x.emoji, chips: chipsOf(x), key: `${x.id} ${G[x.group] || ''}` });
  for (const x of TP) {
    const g = G[x.group] || 'Vocabulary', n = x.words.length, nm = enName(x);
    const rows = x.words.map((w, i) => { const k = audioKey(w.word); return `<tr><td class="no">${i + 1}</td><td><span class="w">${k ? audioBtn(k, w.word, 'en') : ''}${esc(w.word)}</span>${w.pos ? `<span class="pos">${esc(w.pos)}</span>` : ''}</td><td class="ipa">${esc(w.ipa || '')}</td><td>${esc(w.def || '')}</td><td class="ex">${esc(w.ex || '')}</td></tr>`; }).join('');
    out(`en/vocabulary/${x.id}`, `tu-vung/${x.id}`, page(`${g}: ${nm} – ${n} Words with IPA, Definitions & Examples`, `${n} ${g.toLowerCase()} words (${nm}) with IPA, English definitions and example sentences: ${x.words.slice(0, 8).map(w => w.word).join(', ')}… Learn with free flashcards.`, `en/vocabulary/${x.id}`, `tu-vung/${x.id}`,
      `${hero(esc(nm), { emoji: x.emoji || '📘', chips: [g, ...chipsOf(x)] })}
${ctaBox(`${APP}/topic/${encodeURIComponent(x.id)}`, '🃏 Learn this set with free flashcards', 'Open this set in the app', 'FSRS spaced repetition, audio and self-tests – progress saved automatically.', 'vocab')}
<div class="tbl"><table class="wt"><thead><tr><th scope="col" class="no">${L.col.no}</th><th scope="col">${L.col.word}</th><th scope="col">${L.col.ipa}</th><th scope="col">${L.col.mean}</th><th scope="col">${L.col.ex}</th></tr></thead><tbody>${rows}</tbody></table></div>
${ctaBox(`${APP}/topic/${encodeURIComponent(x.id)}`, `Remember all ${n} words in a few days`, 'Start learning', 'A few minutes a day – the app reminds you right before you forget.', 'vocab')}
${related(relatedOf(TP, x, y => y.group === x.group), vCard)}
${extBox('en', 'vocab')}
${pwaBox('en', 'vocab')}`, nm));
  }
  const by = {}; for (const x of TP) (by[x.group] = by[x.group] || []).push(x);
  const total = TP.reduce((a, x) => a + x.words.length, 0), nAu = TP.reduce((a, x) => a + x.words.filter(w => audioKey(w.word)).length, 0), F = FIND_I18N.en;
  out('en/vocabulary/', 'tu-vung/', page(`IELTS, TOEIC & TOEFL Vocabulary Lists – ${TP.length} Sets – Lexkite`, `${TP.length} vocabulary lists for IELTS, TOEIC and TOEFL with IPA, definitions and examples. Learn with free flashcards.`, 'en/vocabulary/', 'tu-vung/',
    `<div class="page smp">${hero2({ h1: esc(`Vocabulary lists (${TP.length} sets)`), lead: `${total.toLocaleString('en')} words with IPA, definitions, examples and audio. Pick a set to see the list, then learn it with free flashcards.`, mood: 'cheer', cls: 'has-kit',
  statsHtml: stats([[TP.length, F[2]], [total.toLocaleString('en'), F[3]], [Object.keys(by).length, F[4]], [nAu.toLocaleString('en'), F[5]]]) })}
${sectionNav('en', '/en/vocabulary/')}
${filterBox('en', typeFilter(Object.entries(by).map(([k, xs]) => [k, G[k] || k, xs.length, '']), TP.length, 'en', F[1]))}
${Object.entries(by).map(([k, xs]) => group(k, G[k] || k, `${xs.length} ${L.sets}`, xs.map(vCard))).join('\n')}</div>`));
}
// ===== Bài học app → trang tiếng Anh (docs/SEO-ARCH.md §6): ngữ pháp, phát âm, IELTS Writing Task 1 / General Task 1 =====
// Nội dung app soạn tiếng Việt → bản tiếng Anh viết riêng cho người học quốc tế ở content/seo-en/{grammar,pron}.json (khóa = chuỗi gốc tiếng Việt;
// "" = câu chỉ đúng với người Việt, bỏ). KHÔNG dùng bản dịch máy (web/i18n/content). Thiếu > 10 % chuỗi của 1 bài → noindex, không hreflang, không sitemap.
const VIRX = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
const enMap = f => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {});
const mkT = M => { const miss = { n: 0, t: 0 }; const T = s => { if (typeof s !== 'string' || !VIRX.test(s)) return s; miss.t++; const v = M[s]; if (v === undefined || VIRX.test(v)) { miss.n++; return ''; } return v; }; return [T, miss]; };
const ok = miss => !miss.t || miss.n / miss.t <= 0.1;
// Câu ví dụ/câu sai-đúng là tiếng Anh, đôi khi kèm chú thích tiếng Việt trong ngoặc "(ý: …)", "KHÔNG:" → bỏ chú thích, đổi KHÔNG → NOT
const enOnly = s => String(s ?? '').replace(/\s*\(([^)]*)\)/g, (m, x) => (VIRX.test(x) ? '' : m)).replace(/KHÔNG/g, 'NOT');
const hlEx = s => esc(enOnly(s)).replace(/\[\[(.+?)\]\]/g, '<b>$1</b>');
const quizHtml = (qs, T) => qs.length ? `<h2>Quick quiz (${qs.length} questions)</h2><ol class="uses">${qs.map(q => `<li><p><b>${hlEx(T(q.q))}</b></p><ol type="a">${q.options.map(o => `<li>${esc(T(o))}</li>`).join('')}</ol><details><summary>Show answer</summary><p>✅ <b>${esc(T(q.options[q.answer]))}</b>${T(q.explain) ? ` – ${esc(T(q.explain))}` : ''}</p></details></li>`).join('')}</ol>` : '';
const robotsOf = idx => (idx ? '' : '<meta name="robots" content="noindex,follow">');
const outL = (path, viPath, html, type, idx) => out(path, idx ? viPath : '-', idx ? html : html.replace('<meta name="theme-color"', robotsOf(false) + '<meta name="theme-color"'), idx ? type : '');
const nL = { grammar: [0, 0], pronunciation: [0, 0], 'ielts-writing': [0, 0] }; // [index được, noindex]
const cnt = (k, idx) => nL[k][idx ? 0 : 1]++;

// ---- Grammar ----
{
  lm = gitDate('web/js/grammar', 'content/seo-en/grammar.json');
  const { G, UNITS } = loadGrammar(), [T, M0] = [null, null];
  const MAP = enMap('content/seo-en/grammar.json');
  const UN = { foundation: 'Foundations', tenses: 'Verb tenses', verbs: 'Verb patterns', words: 'Word classes & phrases', sentences: 'Complex sentences', academic: 'Advanced academic grammar' };
  const UD = { foundation: 'Parts of speech, word formation, pronouns, questions and numbers – the basics for beginners.', tenses: 'The 12 tenses and ways to talk about the future.', verbs: 'Modal verbs, the passive, conditionals and reported speech.', words: 'Articles, countable nouns, comparisons, prepositions and subject–verb agreement.', sentences: 'Relative clauses, noun clauses, linking and inversion for band 7+.', academic: 'Participle clauses, the subjunctive, nominalisation, hedging and punctuation for band 7.5+.' };
  const idxG = new Set(), tr = new Map();
  for (const l of G) { const [t, m] = mkT(MAP); tr.set(l, t); const walk = o => { if (typeof o === 'string') t(o); else if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (!['ex', 'vi', 'wrong', 'right', 'marks', 'c'].includes(k)) walk(v); }; walk([l.summary, l.blocks.filter(b => ['formula', 'uses', 'tip', 'mistake', 'ielts', 'table', 'signals'].includes(b.type)), l.quiz.slice(0, 3)]); if (ok(m)) idxG.add(l.id); }
  const gCard = l => setCard({ href: `/en/grammar/${l.id}`, title: l.en, desc: short(tr.get(l)(l.summary) || '', 110), emoji: l.emoji, chips: [[l.level || '', 'alt']].filter(c => c[0]), key: `${l.en} ${UN[l.unit] || ''}` });
  G.forEach((l, gi) => {
    const t = tr.get(l), idx = idxG.has(l.id), bl = l.blocks || [], prev = G[gi - 1], next = G[gi + 1];
    const blk = b => {
      if (b.type === 'formula') return `<h2>Formula</h2><div class="tbl"><table class="fx"><tbody>${b.rows.map(r => `<tr><th scope="row">${esc(t(r.label || ''))}</th><td>${r.parts.map(p => esc(t(p.t))).join(' + ')}${r.ex ? `<br><i class="ex">${hlEx(r.ex)}</i>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
      if (b.type === 'uses') return `<h2>When to use ${esc(l.en)}</h2><ol class="uses">${b.items.map(u => `<li><b>${esc(t(u.title))}</b>${u.ex ? `<br><i>${hlEx(u.ex)}</i>` : ''}</li>`).join('')}</ol>`;
      if (b.type === 'signals') return `<h2>Signal words</h2><p class="sig">${b.words.map(w => `<span class="chip">${esc(t(w))}</span>`).join(' ')}</p>`;
      if (b.type === 'table') return `<div class="tbl"><table>${b.head ? `<thead><tr>${b.head.map(h => `<th scope="col">${esc(t(h))}</th>`).join('')}</tr></thead>` : ''}<tbody>${(b.rows || []).map(r => `<tr>${r.map(x => `<td>${esc(t(String(x)))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      if (b.type === 'tip') return t(b.text) ? `<div class="tip">💡 ${esc(t(b.text))}</div>` : '';
      if (b.type === 'mistake') return `<div class="err">❌ <s>${esc(enOnly(b.wrong))}</s><br>✅ <b>${esc(enOnly(b.right))}</b>${t(b.why) ? `<br><span class="why">${esc(t(b.why))}</span>` : ''}</div>`;
      if (b.type === 'ielts') return t(b.text) ? `<h2>Using it in IELTS</h2><p>${esc(t(b.text))}</p>${b.ex ? `<p><i>${hlEx(b.ex)}</i></p>` : ''}` : '';
      return '';
    };
    const fm = bl.findIndex(b => b.type === 'mistake'), sum = t(l.summary), href = `${APP}/grammar/${encodeURIComponent(l.id)}`;
    const body = `<article class="page">${hero(esc(l.en), { emoji: l.emoji || '📘', lead: esc(sum), chips: [...(l.level ? [[l.level, 'alt']] : []), UN[l.unit] || l.unit] })}
${ctaBox(href, '🧠 Learn this lesson with visuals and exercises (free)', 'Open in the app', 'Colour-coded formulas, timelines and instantly marked exercises.')}
${bl.map((b, i) => (i === fm ? '<h2>Common mistakes</h2>' : '') + blk(b)).join('\n')}
${quizHtml(l.quiz.slice(0, 3), t)}
${ctaBox(href, `✏️ Practise ${esc(l.en)}: ${l.quiz.length} more questions`, 'Practise in the app')}
<nav class="pager" aria-label="Previous / next lesson">${prev ? `<a rel="prev" href="/en/grammar/${prev.id}">← ${esc(prev.en)}</a>` : '<span></span>'}${next ? `<a rel="next" href="/en/grammar/${next.id}">${esc(next.en)} →</a>` : ''}</nav>
${related(relatedOf(G, l, y => y.unit === l.unit, 4), gCard)}
${extBox('en', 'grammar')}
${pwaBox('en', 'grammar')}</article>`;
    const title = uniqT(`${l.en}: Formula, Uses, Examples & Common Mistakes | Lexkite`, `${l.en} (${l.id}) – English Grammar Lesson | Lexkite`);
    outL(`en/grammar/${l.id}`, `ngu-phap/${l.id}`, page(title, `${l.en} (${l.level}): ${sum} Formula, examples, common mistakes and a free quiz with answers.`, `en/grammar/${l.id}`, `ngu-phap/${l.id}`, body, l.en,
      { lr: { learningResourceType: 'Lesson', educationalLevel: l.level, teaches: `English grammar – ${l.en}` } }), 'grammar', idx);
    cnt('grammar', idx);
  });
  const units = {}; for (const l of G) (units[l.unit] ||= []).push(l);
  const order = [...UNITS.map(u => u.id).filter(id => units[id]), ...Object.keys(units).filter(k => !UNITS.some(u => u.id === k))];
  outL('en/grammar/', 'ngu-phap/', page(`English Grammar Lessons: ${G.length} Topics from Basics to IELTS | Lexkite`, `${G.length} free English grammar lessons: all 12 tenses, conditionals, the passive, relative clauses and more, with formulas, examples, common mistakes and quizzes.`, 'en/grammar/', 'ngu-phap/',
    `${indexHero(`English grammar (${G.length} lessons)`, 'From the basics to band 7+: formulas, uses, signal words, common mistakes and quick quizzes with answers.', 'grammar')}
${order.map(k => group(k, `${(UNITS.find(u => u.id === k) || {}).emoji || ''} ${UN[k] || k}`.trim(), `${units[k].length} ${L.lessons}`, units[k].map(gCard)).replace('</h2>', `</h2>${UD[k] ? `<p>${esc(UD[k])}</p>` : ''}`)).join('\n')}`, undefined,
    { ld: [itemList('English grammar lessons', G.map(l => `${SITE}en/grammar/${l.id}`))] }), 'grammar', true);
}

// ---- Pronunciation ----
{
  lm = gitDate('web/js/pron', 'content/seo-en/pron.json');
  const P = loadPron(), MAP = enMap('content/seo-en/pron.json'), META = MAP._meta || {}, { audioKey } = loadVocab();
  const GN = { vowels: 'Short and long vowels', diphthongs: 'Diphthongs', consonants: 'Consonants', vn: 'Common problem areas', stress: 'Stress, rhythm and intonation' };
  const slugP = x => (META[x.id] || {}).slug || x.id, nameP = x => (META[x.id] || {}).name || x.ipa;
  const tr = new Map(), idxP = new Set();
  for (const x of P) { const [t, m] = mkT(MAP); tr.set(x, t); [x.title, x.how, x.vn, x.tip, ...(x.rules || []).flatMap(r => [r.label, r.when, ...(r.ex || [])]), ...(x.sentences || []), ...(x.words || []).map(w => w.note), ...(x.quiz || []).slice(0, 3).flatMap(q => [q.q, q.explain, ...(q.options || [])])].forEach(t); if (ok(m) && META[x.id]) idxP.add(x.id); }
  const au = w => { const k = audioKey(w); return k ? audioBtn(k, w, 'en') : ''; };
  const pCard = x => setCard({ href: `/en/pronunciation/${slugP(x)}`, title: nameP(x), desc: short(tr.get(x)(x.how) || '', 110), emoji: x.emoji, chips: [[x.level || '', 'alt']].filter(c => c[0]), key: `${x.ipa} ${GN[x.group] || ''}` });
  P.forEach((x, i) => {
    const t = tr.get(x), idx = idxP.has(x.id), s = slugP(x), nm = nameP(x), prev = P[i - 1], next = P[i + 1], href = `${APP}/pron/${encodeURIComponent(x.id)}`, sound = x.mouth;
    const ws = (x.words || []).slice(0, 12), pairs = x.pairs || [];
    const body = `<article class="page">${hero(esc(nm), { emoji: x.emoji || '🗣️', lead: sound ? `Mouth position, ${(x.words || []).length} example words with IPA, ${(x.pairs || []).length} minimal pairs and practice sentences for ${esc(x.ipa)}.` : esc(t(x.how)), chips: [[x.ipa, 'ink'], ...(x.level ? [[x.level, 'alt']] : []), GN[x.group] || x.group] })}
${ctaBox(href, '🎙️ Practise this sound with your microphone (free)', 'Open in the app', 'Listen, record yourself and get instant feedback on each word.')}
${sound ? `<h2>How to pronounce ${esc(x.ipa)}</h2><p>${esc(t(x.how))}</p><p class="sig">${[sound.voiced === true ? 'voiced' : sound.voiced === false ? 'voiceless' : '', sound.long ? 'long' : '', sound.lips ? `lips: ${sound.lips}` : '', sound.tongue ? `tongue: ${sound.tongue}` : '', sound.jaw ? `jaw: ${sound.jaw}` : ''].filter(Boolean).map(c => `<span class="chip">${esc(c)}</span>`).join(' ')}</p>` : ''}
${(x.rules || []).length ? `<h2>Rules</h2><div class="tbl"><table><thead><tr><th scope="col">Rule</th><th scope="col">When</th><th scope="col">Examples</th></tr></thead><tbody>${x.rules.map(r => `<tr><td><b>${esc(t(r.label))}</b></td><td>${esc(t(r.when))}</td><td lang="en">${(r.ex || []).map(e => esc(t(e))).join('<br>')}</td></tr>`).join('')}</tbody></table></div>` : ''}
${t(x.vn) ? `<h2>Common mistakes</h2><div class="err">${esc(t(x.vn))}</div>` : ''}
${t(x.tip) ? `<div class="tip">💡 ${esc(t(x.tip))}</div>` : ''}
${ws.length ? `<h2>Example words</h2><div class="tbl"><table class="wt"><thead><tr><th scope="col">${L.col.word}</th><th scope="col">${L.col.ipa}</th></tr></thead><tbody>${ws.map(w => `<tr><td><span class="w">${au(w.w)}${esc(w.w)}</span>${t(w.note) ? ` <small>${esc(t(w.note))}</small>` : ''}</td><td class="ipa">${esc(w.ipa || '')}</td></tr>`).join('')}</tbody></table></div>` : ''}
${pairs.length ? `<h2>Minimal pairs</h2><p>Each pair differs by one sound only – say them aloud and hear the difference.</p><div class="tbl"><table class="wt"><tbody>${pairs.map(([a, b]) => `<tr><td><span class="w">${au(a)}${esc(a)}</span></td><td>vs</td><td><span class="w">${au(b)}${esc(b)}</span></td></tr>`).join('')}</tbody></table></div>` : ''}
${(x.sentences || []).length ? `<h2>Practice sentences</h2><ul class="uses">${x.sentences.map(z => `<li lang="en">${esc(t(z))}</li>`).join('')}</ul>` : ''}
${quizHtml((x.quiz || []).slice(0, 3), t)}
${ctaBox(href, `🗣️ Record yourself saying ${esc(x.ipa)} words`, 'Practise in the app')}
<nav class="pager" aria-label="Previous / next sound">${prev ? `<a rel="prev" href="/en/pronunciation/${slugP(prev)}">← ${esc(nameP(prev))}</a>` : '<span></span>'}${next ? `<a rel="next" href="/en/pronunciation/${slugP(next)}">${esc(nameP(next))} →</a>` : ''}</nav>
${related(relatedOf(P, x, y => y.group === x.group, 4), pCard)}
${extBox('en', 'pron')}
${pwaBox('en', 'pron')}</article>`;
    const isSound = !!sound, ex3 = ws.slice(0, 3).map(w => w.w).join(', ');
    const title = uniqT(isSound ? `How to Pronounce ${x.ipa} in English (${ex3}) – Minimal Pairs & Audio | Lexkite` : `${nm}: Rules, Examples & Practice | Lexkite`, `${nm} – English Pronunciation | Lexkite`);
    const desc = isSound ? `How to pronounce ${x.ipa}: mouth position, ${ws.length} example words with IPA and audio, ${pairs.length} minimal pairs and practice sentences. ${short(t(x.how), 60)}` : `${nm}: ${short(t(x.how), 110)} Rules, examples and practice.`;
    outL(`en/pronunciation/${s}`, `phat-am/${s}`, page(title, desc, `en/pronunciation/${s}`, `phat-am/${s}`, body, nm, { lr: { learningResourceType: 'Lesson', educationalLevel: x.level, teaches: `English pronunciation – ${x.ipa}` } }), 'pronunciation', idx);
    cnt('pronunciation', idx);
  });
  const by = {}; for (const x of P) (by[x.group] ||= []).push(x);
  outL('en/pronunciation/', 'phat-am/', page(`English Pronunciation: All 44 IPA Sounds with Audio & Minimal Pairs | Lexkite`, `Learn all 44 English IPA sounds plus word stress, -ed/-s endings and intonation: mouth position, example words with audio and minimal pairs. Free.`, 'en/pronunciation/', 'phat-am/',
    `${indexHero(`English pronunciation (${P.length} lessons)`, 'The 44 IPA sounds of English plus stress, endings and intonation – with example words, audio and minimal pairs.', 'pronunciation')}
${Object.entries(by).map(([k, xs]) => group(k, GN[k] || k, `${xs.length} ${L.lessons}`, xs.map(pCard))).join('\n')}`, undefined,
    { ld: [itemList('English pronunciation lessons', P.map(x => `${SITE}en/pronunciation/${slugP(x)}`))] }), 'pronunciation', true);
}

// ---- IELTS Writing: Academic Task 1 (mới) + General Task 1 (bản en của /viet-thu/); Task 2 đã có ở /en/samples/ (không nhân đôi) ----
{
  lm = gitDate('web/js/task1.js', 'web/js/models.js', 'web/js/write');
  const { SETS, MODELS } = loadTask1(), TY = { line: 'Line graph', bar: 'Bar chart', pie: 'Pie chart', table: 'Table', process: 'Process diagram', map: 'Maps' };
  const made = SETS.map(x => [x, MODELS.find(m => m.id === 't1-' + x.id)]).filter(([, m]) => m);
  const dataHtml = x => {
    if (x.x && x.series) return `<div class="tbl"><table><thead><tr><th scope="col">${x.unit ? esc(x.unit) : ''}</th>${x.x.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${x.series.map(([n, v]) => `<tr><th scope="row">${esc(n)}</th>${v.map(y => `<td>${esc(y)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    if (x.head && x.rows) return `<div class="tbl"><table><thead><tr>${x.head.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${x.rows.map(r => `<tr>${r.map(y => `<td>${esc(y)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    if (x.pies) return x.pies.map(([n, sl]) => `<p><b>${esc(n)}:</b> ${sl.map(([a, b]) => `${esc(a)} ${esc(b)}%`).join(' · ')}</p>`).join('');
    if (x.steps) return `<ol>${x.steps.map(z => `<li>${esc(z)}</li>`).join('')}</ol>`;
    if (x.maps) return x.maps.map(([n, ps]) => `<p><b>${esc(n)}:</b> ${ps.map(p => esc(p[0])).join(', ')}</p>`).join('');
    return '';
  };
  const c1 = ([x, m]) => smpCard({ href: `/en/ielts-writing/task-1/${x.id}`, cls: 't-x', tag: TY[x.type] || x.type, title: x.title, band: m.band, meta: [`${m.words} ${U.words}`, `${docStats(m.text).phrases} ${U.phrases}`], key: `${x.type} ${x.id}` });
  made.forEach(([x, m], di) => {
    const gl = [...m.text.matchAll(/\[\[([^|\]]*)\|[^\]]*\]\]/g)].map(z => [z[1], '']), paras = parseDoc(m.text, 'en'), st = docStats(m.text), prev = made[di - 1], next = made[di + 1], ty = TY[x.type] || x.type;
    const body = `<article class="page smp smp-doc t-x">${hero2({ kicker: ['IELTS Academic Writing Task 1', ty], h1: `IELTS Writing Task 1 ${esc(ty)} – Band ${esc(m.band)} Sample`, statsHtml: stats([[m.band, 'Band', 'band'], [m.words, U.words], [paras.length, U.paras], [st.phrases, U.phrases], [mins(m.words), U.minL]]) })}
${promptBox(U.prompt, `<p>${esc(x.title)} Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.</p>${dataHtml(x)}`)}
${ctaBox(`${APP}/model/t1-${x.id}`, '📈 See the chart and the annotated model in the app', 'Open in the app', 'Interactive chart, paragraph roles and phrase notes – free.')}
<div class="ess-grid">${sideHtml(paras, 'en')}<div class="ess-main"><h2>Model answer</h2>${embedWatermark(docHtml(paras, 'en'), `LK:en/ielts-writing/task-1/${x.id}:${lm.replace(/-/g, '')}`)}
${x.overview ? `<h2>Overview sentence</h2><p>${esc(x.overview)}</p>` : ''}
<h2>Key vocabulary (${gl.length})</h2>${phraseCards(gl)}${saveBox(`${APP}/model/t1-${x.id}`, 'en')}</div></div>
${ctaKit(`${APP}/task1/${x.id}`, 'Write your own answer to this task', 'Start writing', 'Word count, timer and instant feedback on your report.')}
${pager2(prev && [`/en/ielts-writing/task-1/${prev[0].id}`, short(prev[0].title, 90)], next && [`/en/ielts-writing/task-1/${next[0].id}`, short(next[0].title, 90)], 'en')}
${related(relatedOf(made, made[di], d => d[0].type === x.type, 4), c1)}
${extBox('en', 'samples')}</article>${smpTail('en')}`;
    outL(`en/ielts-writing/task-1/${x.id}`, '-', page(uniqT(`IELTS Writing Task 1 ${ty} Band ${m.band} Sample: ${short(x.title.replace(/^The [a-z ]+? (shows?|illustrates?|compares?|gives?) /i, ''), 60)}`, `IELTS Task 1 ${ty} model answer: ${x.id}`), `Band ${m.band} IELTS Academic Writing Task 1 ${ty.toLowerCase()} model answer (${m.words} words) with the data, an overview sentence and ${gl.length} key phrases: ${short(x.title, 80)}`, `en/ielts-writing/task-1/${x.id}`, '-', body, short(x.title, 60),
      { lr: { learningResourceType: 'Sample answer', wordCount: m.words, teaches: `IELTS Academic Writing Task 1 – ${ty}`, assesses: `IELTS Band ${m.band}` } }), 'ielts-writing', true);
    cnt('ielts-writing', true);
  });
  const byT = Object.keys(TY).map(k => [k, made.filter(([x]) => x.type === k)]).filter(([, xs]) => xs.length);
  outL('en/ielts-writing/task-1/', '-', page(`${made.length} IELTS Academic Writing Task 1 Band 8 Samples (Charts, Maps, Processes) | Lexkite`, `${made.length} band 8 IELTS Academic Writing Task 1 model answers: line graphs, bar charts, pie charts, tables, maps and processes, with data and key vocabulary.`, 'en/ielts-writing/task-1/', '-',
    `<div class="page smp">${hero2({ h1: esc(`${made.length} IELTS Writing Task 1 samples`), lead: 'Original band 8 reports for every Academic Task 1 type, with the data and key phrases.', mood: 'think', cls: 'has-kit', statsHtml: stats([[made.length, U.statEss], [byT.length, U.statTypes], ['8.0', 'Band', 'band']]) })}
${sectionNav('en', '/en/ielts-writing/')}
${filterBox('en')}
${typeFilter(byT.map(([k, xs]) => [k, TY[k], xs.length, 't-x']), made.length, 'en')}
${byT.map(([k, xs]) => group2(k, TY[k], `${xs.length} ${L.items}`, xs.map(c1), 't-x')).join('\n')}</div>${smpTail('en')}`, undefined,
    { ld: [itemList('IELTS Academic Writing Task 1 samples', made.map(([x]) => `${SITE}en/ielts-writing/task-1/${x.id}`))] }), 'ielts-writing', true);

  const { LT, MD } = loadLetters(), TONE = { formal: 'Formal letter', 'semi-formal': 'Semi-formal letter', informal: 'Informal letter' };
  const ml = LT.map(x => [x, MD.find(y => y.id === 'gt-' + x.id)]).filter(([, m]) => m);
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const c2 = ([x, m]) => smpCard({ href: `/en/ielts-writing/general-task-1/${x.id}`, cls: toneCls(x.tone), tag: TONE[x.tone] || x.tone, emoji: '✉️', title: cap(x.topic), desc: short(x.situation, 120), band: m.band, meta: [`${m.words} ${U.words}`, `${docStats(m.text).phrases} ${U.phrases}`], key: `${x.topic} ${x.tone}` });
  ml.forEach(([x, m], di) => {
    const gl = [...m.text.matchAll(/\[\[([^|\]]*)\|[^\]]*\]\]/g)].map(z => [z[1], '']), paras = parseDoc(m.text, 'en', /\n\s*\n|\n/), st = docStats(m.text), prev = ml[di - 1], next = ml[di + 1], tn = TONE[x.tone] || x.tone;
    const body = `<article class="page smp smp-doc ${toneCls(x.tone)}">${hero2({ kicker: ['IELTS General Training', 'Writing Task 1', tn], h1: `${esc(cap(x.topic))} – IELTS General Task 1 sample letter`, statsHtml: stats([[m.band, 'Band', 'band'], [m.words, U.words], [st.phrases, U.phrases], [st.links, U.links], [mins(m.words), U.minL]]) })}
${promptBox(U.task, `<p>${esc(x.situation)}</p><p>Write a letter to ${esc(x.to)}. In your letter:</p><ul>${x.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul><div class="open">Begin your letter: <b>${esc(x.open)}</b></div>`)}
${ctaBox(`${APP}/letters/${x.id}`, '✍️ Practise this letter (word count, self-check, AI feedback)', 'Open in the app')}
<div class="ess-grid">${sideHtml(paras, 'en')}<div class="ess-main"><h2>Model letter</h2>${embedWatermark(docHtml(paras, 'en', 'letter'), `LK:en/ielts-writing/general-task-1/${x.id}:${lm.replace(/-/g, '')}`)}
<h2>Useful phrases (${gl.length})</h2>${phraseCards(gl)}${saveBox(`${APP}/model/gt-${x.id}`, 'en')}</div></div>
${ctaKit(`${APP}/letters/${x.id}`, 'Your turn: write this letter', 'Start writing', 'Word count, self-check and AI feedback in the app.')}
${pager2(prev && [`/en/ielts-writing/general-task-1/${prev[0].id}`, cap(prev[0].topic)], next && [`/en/ielts-writing/general-task-1/${next[0].id}`, cap(next[0].topic)], 'en')}
${related(relatedOf(ml, ml[di], d => d[0].tone === x.tone, 4), c2)}
${extBox('en', 'letters')}</article>${smpTail('en')}`;
    outL(`en/ielts-writing/general-task-1/${x.id}`, `viet-thu/${x.id}`, page(uniqT(`IELTS General Writing Task 1 ${tn}: ${cap(x.topic)} – Band ${m.band} Sample`, `IELTS General Task 1 ${tn.toLowerCase()} sample (${x.id}): ${short(x.situation, 50)}`), `Band ${m.band} IELTS General Training Writing Task 1 ${tn.toLowerCase()} (${m.words} words): ${short(x.situation, 110)}`, `en/ielts-writing/general-task-1/${x.id}`, `viet-thu/${x.id}`, body, cap(x.topic),
      { lr: { learningResourceType: 'Sample letter', wordCount: m.words, teaches: `IELTS General Training Writing Task 1 – ${x.tone}`, assesses: `IELTS Band ${m.band}` } }), 'ielts-writing', true);
    cnt('ielts-writing', true);
  });
  const tones = Object.keys(TONE).map(k => [k, ml.filter(([x]) => x.tone === k)]).filter(([, xs]) => xs.length);
  outL('en/ielts-writing/general-task-1/', 'viet-thu/', page(`${ml.length} IELTS General Writing Task 1 Sample Letters (Formal, Semi-formal, Informal) | Lexkite`, `${ml.length} band 8 IELTS General Training Task 1 letters in three tones, with useful phrases. Practise letter writing free.`, 'en/ielts-writing/general-task-1/', 'viet-thu/',
    `<div class="page smp">${hero2({ h1: esc(`${ml.length} IELTS General Task 1 letters`), lead: 'Formal, semi-formal and informal model letters with useful phrases highlighted.', mood: 'happy', cls: 'has-kit', statsHtml: stats([[ml.length, U.statLt], [tones.length, U.statTone], ['8.0', 'Band', 'band']]) })}
${sectionNav('en', '/en/ielts-writing/')}
${filterBox('en')}
${typeFilter(tones.map(([k, xs]) => [k, TONE[k], xs.length, toneCls(k)]), ml.length, 'en', U.tones)}
${tones.map(([k, xs]) => group2(k, TONE[k], `${xs.length} ${L.items}`, xs.map(c2), toneCls(k))).join('\n')}</div>${smpTail('en')}`, undefined,
    { ld: [itemList('IELTS General Training Writing Task 1 letters', ml.map(([x]) => `${SITE}en/ielts-writing/general-task-1/${x.id}`))] }), 'ielts-writing', true);
  // Mục lục IELTS Writing: Task 1 (Academic) · Task 1 (General) · Task 2 (/en/samples/) · Speaking (/en/speaking/)
  const { PROMPTS: P2, MODELS: M2 } = loadWriting(), nT2 = P2.filter(p => M2.some(m => m.id === 't2-' + p.id)).length, nSp = fs.readdirSync('dist/en/speaking').filter(f => f.endsWith('.html') && f !== 'index.html').length;
  const hubCard = (href, title, desc, emoji, n) => setCard({ href, title, desc, emoji, chips: [[`${n} samples`, 'ink']] });
  outL('en/ielts-writing/', '-', page(`IELTS Writing Samples: Task 1 & Task 2 Band 8 Model Answers | Lexkite`, `Free band 8 IELTS Writing model answers: ${made.length} Academic Task 1 reports, ${ml.length} General Training letters and ${nT2} Task 2 essays, with key vocabulary.`, 'en/ielts-writing/', '-',
    `${indexHero('IELTS Writing model answers', 'Original band 8 answers for every part of the Writing test – with the task, the data, the model answer and the key vocabulary.', 'ielts-writing')}
<section class="grp"><div class="grid">${[hubCard('/en/ielts-writing/task-1/', 'Academic Writing Task 1', 'Line graphs, bar and pie charts, tables, maps and processes.', '📈', made.length), hubCard('/en/ielts-writing/general-task-1/', 'General Training Task 1 letters', 'Formal, semi-formal and informal letters.', '✉️', ml.length), hubCard('/en/samples/', 'Writing Task 2 essays', 'Opinion, discussion, problem–solution and two-part questions.', '📝', nT2), hubCard('/en/speaking/', 'IELTS Speaking', 'Part 1–3 questions and band 8 sample answers.', '🎤', nSp)].join('')}</div></section>`), 'ielts-writing', true);
}

// Sitemap riêng theo loại (vi/en hreflang khi có bản tiếng Việt) + IndexNow (.seo-urls-en.txt, build-seo-pages.mjs gộp vào .seo-urls.txt)
{
  const xl = (p, v) => (v ? `<xhtml:link rel="alternate" hreflang="vi" href="${SITE}${v}"/><xhtml:link rel="alternate" hreflang="en" href="${SITE}${p}"/><xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${p}"/>` : '');
  for (const k of Object.keys(nL)) fs.writeFileSync(`dist/sitemap-${k}.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${typed.filter(u => u[2] === k).map(([p, d, , v]) => `  <url><loc>${SITE}${p}</loc><lastmod>${d}</lastmod>${xl(p, v)}</url>`).join('\n')}\n</urlset>\n`);
  fs.writeFileSync('.seo-urls-en.txt', typed.map(([p, , , , h]) => `${SITE}${p} ${crypto.createHash('sha1').update(h).digest('hex').slice(0, 12)}`).join('\n') + '\n');
  console.log(`✓ SEO (EN bài học): ${Object.entries(nL).map(([k, [a, b]]) => `${k} ${a}${b ? ` (+${b} noindex)` : ''}`).join(' · ')}`);
}

fs.writeFileSync(sm, fs.readFileSync(sm, 'utf8').replace('</urlset>', urls.map(([u, d]) => `  <url><loc>${SITE}${u}</loc><lastmod>${d}</lastmod><changefreq>monthly</changefreq></url>`).join('\n') + '\n</urlset>'));
console.log(`✓ SEO (EN): ${urls.length} trang tiếng Anh + hreflang vi↔en`);
