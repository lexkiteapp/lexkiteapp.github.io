// Bản tiếng Anh của các trang tĩnh SEO (cho người học quốc tế): dist/en/{samples,speaking,vocabulary}/…
// + hreflang vi ↔ en giữa 2 bản. Chạy sau build-samples.mjs. Giao diện chung: scripts/lib/site-layout.mjs.
import fs from 'node:fs'; import vm from 'node:vm'; import { execFileSync } from 'node:child_process';
import { clip, esc, ld, seoPage, sectionNav, filterBox, setCard, ctaBox, extBox, pwaBox, audioBtn, SEO_L } from './lib/site-layout.mjs';
import { loadWriting, loadSpeaking, loadVocab, vocabMeta, relatedOf } from './lib/seo-data.mjs';
import { embedWatermark } from '../content/protection/watermark.mjs';
import { S as SU, parseDoc, docStats, mins, docHtml, sideHtml, stats, hero2, promptBox, phraseCards, saveBox, ctaKit, pager2, typeCls, topicEmoji, topicCls, smpCard, group2, typeFilter, itemList, smpHead, smpTail } from './lib/samples-ui.mjs';
const SITE = 'https://lexkite.com/', OG = `${SITE}og-default.png`, L = SEO_L.en, U = SU.en;
// URL công khai không đuôi .html (Cloudflare Pages chuyển 308 /x.html → /x); file trên đĩa vẫn là *.html
const today = new Date().toISOString().slice(0, 10);
const gitDate = (...f) => { try { return execFileSync('git', ['log', '-1', '--format=%cs', '--', ...f], { encoding: 'utf8' }).trim() || today; } catch { return today; } };
let lm = today; // ngày sửa dữ liệu của mục đang sinh (lastmod trong sitemap)
const sm = 'dist/sitemap.xml', urls = [];
const SEC = { samples: 'Writing samples', speaking: 'IELTS Speaking', vocabulary: 'Vocabulary' };
const VI = { samples: 'samples', speaking: 'speaking', vocabulary: 'tu-vung' };
const crumbs = (path, name) => { const p = path.split('/'), it = [['Home', SITE + 'en/'], [SEC[p[1]] || p[1], `${SITE}en/${p[1]}/`]]; if (p[2]) it.push([name, SITE + path]);
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: it.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: u })) }; };
// <!--HL--> được out() thay bằng hreflang vi/en/x-default nếu bản tiếng Việt tồn tại. <head> giữ nguyên từng thẻ như bản cũ.
// o: { lr: thuộc tính thêm cho LearningResource, ld: JSON-LD thêm } – trang bài mẫu/speaking tự gắn CSS samples-ui (.smp)
const head = (title, desc0, path, o = {}) => { const desc = clip(desc0); return `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><meta name="theme-color" content="#0F3D3E"><link rel="canonical" href="${SITE}${path}"><!--HL--><meta property="og:type" content="article"><meta property="og:site_name" content="Lexkite"><meta property="og:locale" content="en_US"><meta property="og:url" content="${SITE}${path}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${OG}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/icons/icon.svg?v=2" type="image/svg+xml"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png?v=2">${ld({ '@context': 'https://schema.org', '@type': 'LearningResource', name: title, description: desc, url: SITE + path, inLanguage: 'en', isAccessibleForFree: true, educationalLevel: 'IELTS / TOEIC', provider: { '@type': 'Organization', name: 'Lexkite', url: SITE }, ...(o.lr || {}) })}${ld(crumbs(path, title.replace(/\s*[–|]\s*Lexkite$/, '')))}${(o.ld || []).map(ld).join('')}${/^en\/(samples|speaking)\//.test(path) ? smpHead() : ''}`; };
const page = (title, desc, path, viPath, body, name, o = {}) => {
  const p = path.split('/'), sec = p[1], id = p[2];
  const vis = [['Home', '/en/'], [SEC[sec] || sec, `/en/${sec}/`], ...(id ? [[name || title, `/${path}`]] : [])];
  return seoPage({ lang: 'en', head: head(title, desc, path, o), crumbs: vis, body, alt: fs.existsSync(file(viPath)) ? `/${viPath}` : '', section: `/en/${sec}/` });
};
const file = p => 'dist/' + (p.endsWith('/') ? p + 'index.html' : p + '.html');
// Cặp vi ↔ en: hreflang hai chiều giống hệt nhau (vi, en, x-default → bản tiếng Anh cho người dùng ngôn ngữ khác)
const out = (path, viPath, html) => { fs.mkdirSync('dist/' + path.replace(/[^/]*$/, ''), { recursive: true }); urls.push([path, lm]);
  const vf = file(viPath), hl = fs.existsSync(vf) ? `<link rel="alternate" hreflang="vi" href="${SITE}${viPath}"><link rel="alternate" hreflang="en" href="${SITE}${path}"><link rel="alternate" hreflang="x-default" href="${SITE}${path}">` : '';
  fs.writeFileSync(file(path), html.replace('<!--HL-->', hl));
  if (hl) { const v = fs.readFileSync(vf, 'utf8'); if (!v.includes('<link rel="alternate" hreflang="en"')) fs.writeFileSync(vf, v.replace('<meta property="og:type"', hl + '<meta property="og:type"')); } };
const hero = (h1, { emoji = '', lead = '', chips = [] } = {}) => `<header class="hero"><h1>${emoji ? `<span class="em" aria-hidden="true">${esc(emoji)}</span>` : ''}${h1}</h1>${lead ? `<p>${lead}</p>` : ''}${chips.length ? `<div class="sub">${chips.map(c => Array.isArray(c) ? `<span class="chip ${c[1]}">${esc(c[0])}</span>` : `<span class="chip">${esc(c)}</span>`).join('')}</div>` : ''}</header>`;
const indexHero = (h1, lead, sec) => `${hero(esc(h1), { lead })}\n${sectionNav('en', `/en/${sec}/`)}\n${filterBox('en')}`;
const related = (items, card) => items.length ? `<section class="grp" aria-labelledby="rel"><h2 id="rel">${L.related}</h2><div class="grid">${items.map(card).join('')}</div></section>` : '';
const group = (id, title, sub, cards) => `<section class="grp" aria-labelledby="g-${id}"><h2 id="g-${id}">${esc(title)} <small>${sub}</small></h2><div class="grid">${cards.join('')}</div></section>`;
const short = (s, n) => s.length > n ? s.slice(0, n - 3).replace(/\s+\S*$/, '') + '…' : s;
const APP = '/app/?hl=en#';

// ---- Writing Task 2 ---- (giao diện bài mẫu: scripts/lib/samples-ui.mjs – nhãn vai trò đoạn/câu bằng tiếng Anh, không có nghĩa tiếng Việt)
{
  lm = gitDate('web/js/write.js', 'web/js/models.js', 'web/js/write');
  const { PROMPTS: P, MODELS } = loadWriting();
  const done = []; for (const p of P) { const m = MODELS.find(x => x.id === 't2-' + p.id); if (m) done.push([p, m]); }
  const t2Card = ([p, m]) => smpCard({ href: `/en/samples/${p.id}`, cls: typeCls(p.type), tag: p.type, title: p.text, band: m.band, meta: [`${m.words} ${U.words}`, `${docStats(m.text).phrases} ${U.phrases}`, U.min(mins(m.words))], key: `${p.type} ${p.topic}` });
  done.forEach(([p, m], di) => {
    const gl = [...m.text.matchAll(/\[\[([^|\]]*)\|/g)].map(x => x[1]);
    const paras = parseDoc(m.text, 'en'), st = docStats(m.text), prev = done[di - 1], next = done[di + 1];
    out(`en/samples/${p.id}`, `samples/${p.id}`, page(`IELTS Writing Task 2 Band ${m.band} Sample: ${short(p.text, 70)}`, `Band ${m.band} IELTS Writing Task 2 model answer (${p.type}, ${m.words} words) with ${gl.length} highlighted high-scoring phrases and linking words.`, `en/samples/${p.id}`, `samples/${p.id}`,
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
${filterBox('en')}
${typeFilter(types.map(([ty, xs], i) => [`t${i}`, ty, xs.length, typeCls(ty)]), done.length, 'en')}
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
    out(`en/speaking/${id}`, `speaking/${viSlug(b.title)}`, page(`IELTS Speaking: ${b.p2.q.replace(/\.$/, '')} – Part 1, 2, 3 Sample Answers`, `IELTS Speaking questions on ${topic} (Parts 1–3) with band 8 sample answers. Cue card: ${b.p2.q}`, `en/speaking/${id}`, `speaking/${viSlug(b.title)}`,
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
  const total = TP.reduce((a, x) => a + x.words.length, 0);
  out('en/vocabulary/', 'tu-vung/', page(`IELTS, TOEIC & TOEFL Vocabulary Lists – ${TP.length} Sets – Lexkite`, `${TP.length} vocabulary lists for IELTS, TOEIC and TOEFL with IPA, definitions and examples. Learn with free flashcards.`, 'en/vocabulary/', 'tu-vung/',
    `${indexHero(`Vocabulary lists (${TP.length} sets)`, `${total.toLocaleString('en')} words with IPA, definitions, examples and audio. Pick a set to see the list, then learn it with free flashcards.`, 'vocabulary')}
${Object.entries(by).map(([k, xs]) => group(k, G[k] || k, `${xs.length} ${L.sets}`, xs.map(vCard))).join('\n')}`));
}
fs.writeFileSync(sm, fs.readFileSync(sm, 'utf8').replace('</urlset>', urls.map(([u, d]) => `  <url><loc>${SITE}${u}</loc><lastmod>${d}</lastmod><changefreq>monthly</changefreq></url>`).join('\n') + '\n</urlset>'));
console.log(`✓ SEO (EN): ${urls.length} trang tiếng Anh + hreflang vi↔en`);
