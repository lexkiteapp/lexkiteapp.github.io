// Bản tiếng Anh của các trang tĩnh SEO (cho người học quốc tế): dist/en/{samples,speaking,vocabulary}/…
// + hreflang vi ↔ en giữa 2 bản. Chạy sau build-samples.mjs. Giao diện chung: scripts/lib/site-layout.mjs.
import fs from 'node:fs'; import vm from 'node:vm'; import { execFileSync } from 'node:child_process';
import { clip, esc, ld, seoPage, sectionNav, filterBox, setCard, ctaBox, extBox, audioBtn, SEO_L } from './lib/site-layout.mjs';
import { loadWriting, loadSpeaking, loadVocab, vocabMeta, relatedOf } from './lib/seo-data.mjs';
import { embedWatermark } from '../content/protection/watermark.mjs';
const SITE = 'https://lexkite.com/', OG = `${SITE}og-default.png`, L = SEO_L.en;
// URL công khai không đuôi .html (Cloudflare Pages chuyển 308 /x.html → /x); file trên đĩa vẫn là *.html
const today = new Date().toISOString().slice(0, 10);
const gitDate = (...f) => { try { return execFileSync('git', ['log', '-1', '--format=%cs', '--', ...f], { encoding: 'utf8' }).trim() || today; } catch { return today; } };
let lm = today; // ngày sửa dữ liệu của mục đang sinh (lastmod trong sitemap)
const sm = 'dist/sitemap.xml', urls = [];
const SEC = { samples: 'Writing samples', speaking: 'IELTS Speaking', vocabulary: 'Vocabulary' };
const VI = { samples: 'samples', speaking: 'speaking', vocabulary: 'tu-vung' };
const crumbs = (path, name) => { const p = path.split('/'), it = [['Home', SITE], [SEC[p[1]] || p[1], `${SITE}en/${p[1]}/`]]; if (p[2]) it.push([name, SITE + path]);
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: it.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: u })) }; };
// <!--HL--> được out() thay bằng hreflang vi/en/x-default nếu bản tiếng Việt tồn tại. <head> giữ nguyên từng thẻ như bản cũ.
const head = (title, desc0, path) => { const desc = clip(desc0); return `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><meta name="theme-color" content="#0F3D3E"><link rel="canonical" href="${SITE}${path}"><!--HL--><meta property="og:type" content="article"><meta property="og:site_name" content="Lexkite"><meta property="og:locale" content="en_US"><meta property="og:url" content="${SITE}${path}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${OG}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/icons/icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">${ld({ '@context': 'https://schema.org', '@type': 'LearningResource', name: title, description: desc, url: SITE + path, inLanguage: 'en', isAccessibleForFree: true, educationalLevel: 'IELTS / TOEIC', provider: { '@type': 'Organization', name: 'Lexkite', url: SITE } })}${ld(crumbs(path, title.replace(/\s*[–|]\s*Lexkite$/, '')))}`; };
const page = (title, desc, path, viPath, body, name) => {
  const p = path.split('/'), sec = p[1], id = p[2];
  const vis = [['Home', '/?hl=en'], [SEC[sec] || sec, `/en/${sec}/`], ...(id ? [[name || title, `/${path}`]] : [])];
  return seoPage({ lang: 'en', head: head(title, desc, path), crumbs: vis, body, alt: fs.existsSync(file(viPath)) ? `/${viPath}` : '', section: `/en/${sec}/` });
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
const APP = '/?hl=en#';

// ---- Writing Task 2 ----
{
  lm = gitDate('web/js/write.js', 'web/js/models.js', 'web/js/write');
  const { PROMPTS: P, MODELS } = loadWriting();
  const rich = s => esc(s).replace(/&lt;&lt;([^&]*)&gt;&gt;\s*/g, '').replace(/\[\[([^|\]]*)\|([^\]]*)\]\]/g, '<mark>$1</mark>').replace(/\{\{([^}]*)\}\}/g, '<b class="ln">$1</b>');
  const done = []; for (const p of P) { const m = MODELS.find(x => x.id === 't2-' + p.id); if (m) done.push([p, m]); }
  const t2Card = ([p, m]) => setCard({ href: `/en/samples/${p.id}`, title: p.text, chips: [p.type, [`Band ${m.band}`, 'alt'], [`${m.words} words`, 'ink']], key: `${p.type} ${p.topic}` });
  for (const [p, m] of done) {
    const gl = [...m.text.matchAll(/\[\[([^|\]]*)\|/g)].map(x => x[1]);
    out(`en/samples/${p.id}`, `samples/${p.id}`, page(`IELTS Writing Task 2 Band ${m.band} Sample: ${short(p.text, 70)}`, `Band ${m.band} IELTS Writing Task 2 model answer (${p.type}, ${m.words} words) with ${gl.length} highlighted high-scoring phrases and linking words.`, `en/samples/${p.id}`, `samples/${p.id}`,
      `<article class="page">${hero(`IELTS Writing Task 2 – Band ${esc(m.band)} Sample`, { chips: [`Question type: ${p.type}`, [`${m.words} words`, 'ink'], [`Band ${m.band}`, 'alt']] })}
<div class="q">${esc(p.text)}</div>
${ctaBox(`${APP}/model/t2-${p.id}`, '✍️ Practise this question free on Lexkite', 'Open in the app', 'Interactive model answer, outline and linking words.')}
<h2>Model answer</h2><div class="ess">${embedWatermark(rich(m.text).split(/\n\s*\n/).map(x => `<p>${x.trim()}</p>`).join(''), `LK:en/samples/${p.id}:${lm.replace(/-/g, '')}`)}</div>
<h2>Useful phrases (${gl.length})</h2><p class="sig">${gl.map(e => `<span class="chip">${esc(e)}</span>`).join(' ')}</p>
${ctaBox(`${APP}/write/${p.id}`, '📝 Write your own answer and get instant feedback', 'Start writing', 'Word count, idea prompts and scoring on the 4 IELTS criteria.')}
${related(relatedOf(done, done.find(d => d[0] === p), d => d[0].type === p.type, 4), t2Card)}
${extBox('en')}</article>`, `Band ${m.band}: ${short(p.text, 50)}`));
  }
  const by = {}; for (const d of done) (by[d[0].type] = by[d[0].type] || []).push(d);
  out('en/samples/', 'samples/', page(`${done.length} IELTS Writing Task 2 Band 8 Sample Essays – Lexkite`, `${done.length} band 8 IELTS Writing Task 2 model essays by question type, with highlighted phrases. Practise and get feedback free.`, 'en/samples/', 'samples/',
    `${indexHero(`${done.length} IELTS Writing Task 2 sample essays (band 8)`, 'Original model answers grouped by question type, with high-scoring phrases highlighted.', 'samples')}
${Object.entries(by).map(([ty, xs], i) => group(`t${i}`, ty, `${xs.length} ${L.items}`, xs.map(t2Card))).join('\n')}`));
}

// ---- Speaking ----
{
  lm = gitDate('web/js/speaking.js', 'web/js/speak');
  const { BANK, S } = loadSpeaking();
  const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  // Bản tiếng Việt đổi cả Đ → D ('Đọc sách' → speaking/doc-sach); URL tiếng Anh giữ nguyên (oc-sach) nhưng hreflang phải trỏ đúng bản vi
  const viSlug = s => slug(s.replace(/Đ/g, 'D'));
  const name = b => b.p2.q.replace(/^Describe\s+/i, '').replace(/\.$/, '');
  const qa = q => { const s = S[q]; return `<h3>${esc(q)}</h3>${s ? `<div class="ess"><p>${esc(s.a)}</p></div>${s.vocab && s.vocab.length ? `<p><b>Useful language:</b> ${s.vocab.map(v => esc(v[0])).join(' · ')}</p>` : ''}` : ''}`; };
  const made = BANK.map((b, i) => [slug(b.title), b, i]);
  const spCard = ([id, b]) => setCard({ href: `/en/speaking/${id}`, title: name(b), desc: b.p2.q, chips: ['Part 1–3', ...(b.topic ? [[b.topic.replace(/-/g, ' '), 'ink']] : [])], key: b.topic || '' });
  for (const [id, b, i] of made) {
    const topic = (b.topic || '').replace(/-/g, ' ');
    out(`en/speaking/${id}`, `speaking/${viSlug(b.title)}`, page(`IELTS Speaking: ${b.p2.q.replace(/\.$/, '')} – Part 1, 2, 3 Sample Answers`, `IELTS Speaking questions on ${topic} (Parts 1–3) with band 8 sample answers. Cue card: ${b.p2.q}`, `en/speaking/${id}`, `speaking/${viSlug(b.title)}`,
      `<article class="page">${hero(`IELTS Speaking – ${esc(name(b))}`, { chips: ['Part 1', 'Part 2', 'Part 3', ...(topic ? [[topic, 'ink']] : [])] })}
${ctaBox(`${APP}/speaking/p1/${i}`, '🎙️ Practise speaking this topic (record & get feedback)', 'Practise speaking', 'Record your answer and get feedback on pronunciation and fluency.')}
<h2>Part 1</h2>${b.p1.map(qa).join('')}<h2>Part 2 – Cue card</h2><div class="q">${esc(b.p2.q)}<ul>${b.p2.points.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>${qa(b.p2.q).replace(/^<h3>[^<]*<\/h3>/, '')}<h2>Part 3</h2>${b.p3.map(qa).join('')}
${related(relatedOf(made, made[i], () => true, 4), spCard)}
${extBox('en')}</article>`, name(b)));
  }
  out('en/speaking/', 'speaking/', page(`${made.length} IELTS Speaking Topics with Sample Answers – Lexkite`, `${made.length} IELTS Speaking topics: Part 1–3 questions, Part 2 cue cards and band 8 sample answers. Practise free.`, 'en/speaking/', 'speaking/',
    `${indexHero(`${made.length} IELTS Speaking topics`, 'Part 1–3 questions, Part 2 cue cards and original band 8 sample answers.', 'speaking')}
${group('all', 'Topics', `${made.length} ${L.items}`, made.map(spCard))}`));
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
${ctaBox(`${APP}/topic/${encodeURIComponent(x.id)}`, '🃏 Learn this set with free flashcards', 'Open this set in the app', 'FSRS spaced repetition, audio and self-tests – progress saved automatically.')}
<div class="tbl"><table class="wt"><thead><tr><th scope="col" class="no">${L.col.no}</th><th scope="col">${L.col.word}</th><th scope="col">${L.col.ipa}</th><th scope="col">${L.col.mean}</th><th scope="col">${L.col.ex}</th></tr></thead><tbody>${rows}</tbody></table></div>
${ctaBox(`${APP}/topic/${encodeURIComponent(x.id)}`, `Remember all ${n} words in a few days`, 'Start learning', 'A few minutes a day – the app reminds you right before you forget.')}
${related(relatedOf(TP, x, y => y.group === x.group), vCard)}
${extBox('en')}`, nm));
  }
  const by = {}; for (const x of TP) (by[x.group] = by[x.group] || []).push(x);
  const total = TP.reduce((a, x) => a + x.words.length, 0);
  out('en/vocabulary/', 'tu-vung/', page(`IELTS, TOEIC & TOEFL Vocabulary Lists – ${TP.length} Sets – Lexkite`, `${TP.length} vocabulary lists for IELTS, TOEIC and TOEFL with IPA, definitions and examples. Learn with free flashcards.`, 'en/vocabulary/', 'tu-vung/',
    `${indexHero(`Vocabulary lists (${TP.length} sets)`, `${total.toLocaleString('en')} words with IPA, definitions, examples and audio. Pick a set to see the list, then learn it with free flashcards.`, 'vocabulary')}
${Object.entries(by).map(([k, xs]) => group(k, G[k] || k, `${xs.length} ${L.sets}`, xs.map(vCard))).join('\n')}`));
}
fs.writeFileSync(sm, fs.readFileSync(sm, 'utf8').replace('</urlset>', urls.map(([u, d]) => `  <url><loc>${SITE}${u}</loc><lastmod>${d}</lastmod><changefreq>monthly</changefreq></url>`).join('\n') + '\n</urlset>'));
console.log(`✓ SEO (EN): ${urls.length} trang tiếng Anh + hreflang vi↔en`);
