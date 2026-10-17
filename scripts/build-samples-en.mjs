// Bản tiếng Anh của các trang tĩnh SEO (cho người học quốc tế): dist/en/{samples,speaking,vocabulary}/…
// + hreflang vi ↔ en giữa 2 bản. Chạy sau build-samples.mjs.
import fs from 'node:fs'; import vm from 'node:vm'; import { execFileSync } from 'node:child_process';
const SITE = 'https://lexkite.com/', OG = `${SITE}og-default.png`;
// URL công khai không đuôi .html (Cloudflare Pages chuyển 308 /x.html → /x); file trên đĩa vẫn là *.html
const today = new Date().toISOString().slice(0, 10);
const gitDate = (...f) => { try { return execFileSync('git', ['log', '-1', '--format=%cs', '--', ...f], { encoding: 'utf8' }).trim() || today; } catch { return today; } };
let lm = today; // ngày sửa dữ liệu của mục đang sinh (lastmod trong sitemap)
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const load = (files, extra = {}) => { const c = { self: {}, window: {}, t: s => s, localStorage: { getItem() {}, setItem() {} }, ...extra }; c.self = c.window = c; vm.createContext(c); for (const f of files) vm.runInContext(fs.readFileSync(`web/js/${f}.js`, 'utf8'), c); return c; };
const css = fs.readFileSync('scripts/build-samples.mjs', 'utf8').match(/const css = `([^`]*)`/)[1];
const sm = 'dist/sitemap.xml', urls = [];
const SEC = { samples: 'Writing samples', speaking: 'IELTS Speaking', vocabulary: 'Vocabulary' };
const ld = o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
const crumbs = (path, name) => { const p = path.split('/'), it = [['Home', SITE], [SEC[p[1]] || p[1], `${SITE}en/${p[1]}/`]]; if (p[2]) it.push([name, SITE + path]);
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: it.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: u })) }; };
// <!--HL--> được out() thay bằng hreflang vi/en/x-default nếu bản tiếng Việt tồn tại
const page = (title, desc, path, viPath, body, nav) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><meta name="theme-color" content="#0F3D3E"><link rel="canonical" href="${SITE}${path}"><!--HL--><meta property="og:type" content="article"><meta property="og:site_name" content="Lexkite"><meta property="og:locale" content="en_US"><meta property="og:url" content="${SITE}${path}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${OG}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/icons/icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/icons/icon-192.png">${ld({ '@context': 'https://schema.org', '@type': 'LearningResource', name: title, description: desc, url: SITE + path, inLanguage: 'en', isAccessibleForFree: true, educationalLevel: 'IELTS / TOEIC', provider: { '@type': 'Organization', name: 'Lexkite', url: SITE } })}${ld(crumbs(path, title.replace(/\s*[–|]\s*Lexkite$/, '')))}<style>${css}</style></head><body><main><div class="top"><a href="/?hl=en" style="text-decoration:none">Lexkite</a>${nav}</div>${body}<p style="color:#888;font-size:13px">© Lexkite – original learning content, free for learners.</p></main><script>document.addEventListener('copy',e=>{const s=window.getSelection();if(!s||s.rangeCount===0)return;const t=s.toString();if(t.length<=200)return;const m="\\n\\nSource: "+document.title.replace(/\\s*[–|]\\s*Lexkite$/i,'')+" – "+location.href.split('#')[0]+" (Lexkite)";e.clipboardData.setData('text/plain',t+m);e.preventDefault();});</script></body></html>`;
const file = p => 'dist/' + (p.endsWith('/') ? p + 'index.html' : p + '.html');
// Cặp vi ↔ en: hreflang hai chiều giống hệt nhau (vi, en, x-default → bản tiếng Anh cho người dùng ngôn ngữ khác)
const out = (path, viPath, html) => { fs.mkdirSync('dist/' + path.replace(/[^/]*$/, ''), { recursive: true }); urls.push([path, lm]);
  const vf = file(viPath), hl = fs.existsSync(vf) ? `<link rel="alternate" hreflang="vi" href="${SITE}${viPath}"><link rel="alternate" hreflang="en" href="${SITE}${path}"><link rel="alternate" hreflang="x-default" href="${SITE}${path}">` : '';
  fs.writeFileSync(file(path), html.replace('<!--HL-->', hl));
  if (hl) { const v = fs.readFileSync(vf, 'utf8'); if (!v.includes('hreflang="en"')) fs.writeFileSync(vf, v.replace('<meta property="og:type"', hl + '<meta property="og:type"')); } };
const NAV = '<span><a href="/en/samples/">Writing</a> · <a href="/en/speaking/">Speaking</a> · <a href="/en/vocabulary/">Vocabulary</a></span>';

// ---- Writing Task 2 ----
{
  lm = gitDate('web/js/write.js', 'web/js/models.js', 'web/js/write');
  const c = load(['write/task2-more', 'models', 'write/models2', 'write/models3', 'write/models4', 'write/models5']);
  const w = fs.readFileSync('web/js/write.js', 'utf8'), T = (id, type, topic, text) => ({ id, type, topic, text });
  const P = vm.runInNewContext(w.slice(w.indexOf('const PROMPTS = [') + 16, w.indexOf('];', w.indexOf('const PROMPTS = [')) + 1), { T });
  for (const a of c.WRITE_MORE || []) if (!P.some(p => p.id === a[0])) P.push(T(...a));
  const rich = s => esc(s).replace(/&lt;&lt;([^&]*)&gt;&gt;\s*/g, '').replace(/\[\[([^|\]]*)\|([^\]]*)\]\]/g, '<mark>$1</mark>').replace(/\{\{([^}]*)\}\}/g, '<b class="ln">$1</b>');
  const done = [];
  for (const p of P) {
    const m = c.MODELS.find(x => x.id === 't2-' + p.id); if (!m) continue;
    const gl = [...m.text.matchAll(/\[\[([^|\]]*)\|/g)].map(x => x[1]);
    const short = p.text.length > 70 ? p.text.slice(0, 67).replace(/\s+\S*$/, '') + '…' : p.text;
    out(`en/samples/${p.id}`, `samples/${p.id}`, page(`IELTS Writing Task 2 Band ${m.band} Sample: ${short}`, `Band ${m.band} IELTS Writing Task 2 model answer (${p.type}, ${m.words} words) with ${gl.length} highlighted high-scoring phrases and linking words.`, `en/samples/${p.id}`, `samples/${p.id}`,
      `<h1 style="font-size:24px;line-height:1.3">IELTS Writing Task 2 – Band ${esc(m.band)} Sample</h1><p>Question type: <b>${esc(p.type)}</b> · ${m.words} words</p><div class="q">${esc(p.text)}</div><a class="cta" href="/?hl=en#/model/t2-${p.id}">✍️ Practise this question free on Lexkite →</a>
<h2>Model answer</h2><div class="ess">${rich(m.text).split(/\n\s*\n/).map(x => `<p>${x.trim()}</p>`).join('')}</div><h2>Useful phrases (${gl.length})</h2><ul class="l">${gl.map(e => `<li>${esc(e)}</li>`).join('')}</ul><a class="cta" href="/?hl=en#/write/${p.id}">📝 Write your own answer and get instant feedback →</a>`, NAV));
    done.push([p, m]);
  }
  const by = {}; for (const [p] of done) (by[p.type] = by[p.type] || []).push(p);
  out('en/samples/', 'samples/', page(`${done.length} IELTS Writing Task 2 Band 8 Sample Essays – Lexkite`, `${done.length} band 8 IELTS Writing Task 2 model essays by question type, with highlighted phrases. Practise and get feedback free.`, 'en/samples/', 'samples/',
    `<h1>${done.length} IELTS Writing Task 2 sample essays (band 8)</h1>${Object.entries(by).map(([ty, xs]) => `<h2>${esc(ty)}</h2><ul class="l">${xs.map(p => `<li><a href="/en/samples/${p.id}">${esc(p.text)}</a></li>`).join('')}</ul>`).join('')}`, NAV));
}

// ---- Speaking ----
{
  lm = gitDate('web/js/speaking.js', 'web/js/speak');
  const sp = fs.readFileSync('web/js/speaking.js', 'utf8'), i0 = sp.indexOf('const BANK = [') + 13;
  const BANK = vm.runInNewContext(sp.slice(i0, sp.indexOf('\n  ];', i0) + 4), { t: s => s });
  const c = load(['speak/samples', 'speak/more', 'speak/more2', 'speak/more3']);
  for (const x of c.SPEAK_MORE || []) if (!BANK.some(b => b.title === x.title)) BANK.push(x);
  const S = c.SPEAK_SAMPLES || {};
  const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const name = b => b.p2.q.replace(/^Describe\s+/i, '').replace(/\.$/, '');
  const qa = q => { const s = S[q]; return `<h3>${esc(q)}</h3>${s ? `<div class="ess"><p>${esc(s.a)}</p></div>${s.vocab && s.vocab.length ? `<p><b>Useful language:</b> ${s.vocab.map(v => esc(v[0])).join(' · ')}</p>` : ''}` : ''}`; };
  const made = [];
  BANK.forEach((b, i) => {
    const id = slug(b.title), topic = (b.topic || '').replace(/-/g, ' ');
    out(`en/speaking/${id}`, `speaking/${id}`, page(`IELTS Speaking: ${b.p2.q.replace(/\.$/, '')} – Part 1, 2, 3 Sample Answers`, `IELTS Speaking questions on ${topic} (Parts 1–3) with band 8 sample answers. Cue card: ${b.p2.q}`, `en/speaking/${id}`, `speaking/${id}`,
      `<h1 style="font-size:24px;line-height:1.3">IELTS Speaking – ${esc(name(b))}</h1><a class="cta" href="/?hl=en#/speaking/p1/${i}">🎙️ Practise speaking this topic (record & get feedback) →</a>
<h2>Part 1</h2>${b.p1.map(qa).join('')}<h2>Part 2 – Cue card</h2><div class="q">${esc(b.p2.q)}<ul class="l">${b.p2.points.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>${qa(b.p2.q).replace(/^<h3>[^<]*<\/h3>/, '')}<h2>Part 3</h2>${b.p3.map(qa).join('')}`, NAV));
    made.push([id, b]);
  });
  out('en/speaking/', 'speaking/', page(`${made.length} IELTS Speaking Topics with Sample Answers – Lexkite`, `${made.length} IELTS Speaking topics: Part 1–3 questions, Part 2 cue cards and band 8 sample answers. Practise free.`, 'en/speaking/', 'speaking/',
    `<h1>${made.length} IELTS Speaking topics</h1><ul class="l">${made.map(([id, b]) => `<li><a href="/en/speaking/${id}">${esc(b.p2.q)}</a></li>`).join('')}</ul>`, NAV));
}

// ---- Vocabulary ----
{
  lm = gitDate('web/js/data.js', 'web/js/lib', 'web/js/i18n/en.js');
  const c = load(['data', ...['topics-more', 'skills', 'awl', 'ngsl', 'tsl-a', 'tsl-b', 'domain-a', 'domain-b', 'exam-vocab', 'exam-vocab2', 'exam-vocab3'].map(f => 'lib/' + f)]);
  const G = { topics: 'IELTS Vocabulary by Topic', writing: 'IELTS Writing Vocabulary', speaking: 'IELTS Speaking Vocabulary', awl: 'Academic Word List (AWL)', core: 'Core Vocabulary (NGSL)', toeic: 'TOEIC Vocabulary', domain: 'Vocabulary for Specific Fields', exam: 'Vocabulary by Exam' };
  const TP = c.IELTS_DATA.TOPICS.filter(x => x.words && x.words.length >= 8);
  const D = load(['i18n/en']).I18N_DICT.en || {};
  const enName = x => D[x.name] || x.id.replace(/^(ex|dom|awl|ngsl|tsl)-/, '').replace(/-/g, ' ').replace(/\b\w/g, m => m.toUpperCase());
  for (const x of TP) {
    const g = G[x.group] || 'Vocabulary', n = x.words.length, nm = enName(x);
    out(`en/vocabulary/${x.id}`, `tu-vung/${x.id}`, page(`${g}: ${nm} – ${n} Words with IPA, Definitions & Examples`, `${n} ${g.toLowerCase()} words (${nm}) with IPA, English definitions and example sentences: ${x.words.slice(0, 8).map(w => w.word).join(', ')}… Learn with free flashcards.`, `en/vocabulary/${x.id}`, `tu-vung/${x.id}`,
      `<h1 style="font-size:24px;line-height:1.3">${esc(x.emoji || '📘')} ${esc(nm)} <span style="font-size:15px;color:#888">· ${esc(g)} · ${n} words</span></h1><a class="cta" href="/?hl=en#/topic/${encodeURIComponent(x.id)}">🃏 Learn this set with free flashcards →</a>
<table>${x.words.map(w => `<tr><td><b>${esc(w.word)}</b><br><span style="color:#888;font-size:14px">${esc(w.ipa || '')} ${esc(w.pos || '')}</span></td><td>${esc(w.def || '')}${w.ex ? `<br><i style="font-size:14px;color:#666">${esc(w.ex)}</i>` : ''}</td></tr>`).join('')}</table>`, NAV));
  }
  const by = {}; for (const x of TP) (by[x.group] = by[x.group] || []).push(x);
  out('en/vocabulary/', 'tu-vung/', page(`IELTS, TOEIC & TOEFL Vocabulary Lists – ${TP.length} Sets – Lexkite`, `${TP.length} vocabulary lists for IELTS, TOEIC and TOEFL with IPA, definitions and examples. Learn with free flashcards.`, 'en/vocabulary/', 'tu-vung/',
    `<h1>Vocabulary lists (${TP.length} sets)</h1>${Object.entries(by).map(([k, xs]) => `<h2>${esc(G[k] || k)}</h2><ul class="l">${xs.map(x => `<li><a href="/en/vocabulary/${x.id}">${esc(enName(x))}</a> – ${x.words.length} words</li>`).join('')}</ul>`).join('')}`, NAV));
}
fs.writeFileSync(sm, fs.readFileSync(sm, 'utf8').replace('</urlset>', urls.map(([u, d]) => `  <url><loc>${SITE}${u}</loc><lastmod>${d}</lastmod><changefreq>monthly</changefreq></url>`).join('\n') + '\n</urlset>'));
console.log(`✓ SEO (EN): ${urls.length} trang tiếng Anh + hreflang vi↔en`);
