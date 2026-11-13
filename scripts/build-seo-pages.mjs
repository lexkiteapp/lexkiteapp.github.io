#!/usr/bin/env node
// Trang tĩnh index được cho nội dung app (docs/SEO-ARCH.md): Từ điển /<lang>/words/<slug> + Giao tiếp tự tin /<lang>/conversations/<id>, 15 ngôn ngữ.
// MỘT NGUỒN, chỉ đọc: kho từ + gói nghĩa + ghi chú qua scripts/lib/seo-words.mjs (chọn trang + nội dung trang từ, dùng chung với build-blog),
//   content/confidence/units/*.json + content/confidence/i18n/<lang>.json.
// Ghi: dist/<lang>/words/**, dist/<lang>/conversations/**, dist/sitemap-words-<lang>.xml, dist/sitemap-conversations.xml,
//   dist/data/seo-twins.json (app → bản tĩnh, web/js/seo-twin.js), .seo-urls.txt (URL + băm nội dung cho IndexNow – không deploy).
// Chạy trong build-web.sh sau build-samples*/blog, trước build-sitemap-index. Tắt: SEO_PAGES=0. N: SEO_N_MAIN (1500), SEO_N_PRIORITY (650), SEO_N_OTHER (400).
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { execFileSync } from 'node:child_process';
import { CSS, SEO_CSS, UI_JS, esc, themePage, clip, ld, siteHeader, siteFooter, crumbsHtml, landingHref, appHref, LANG_NAMES } from './lib/site-layout.mjs';
import { LANGS, S, POS, YOU, fill } from './lib/seo-pages-i18n.mjs';
import { toolPath, toolStrings } from './lib/tools-links.mjs';
import { lastmodStore } from './lib/lastmod.mjs';
import { measure, deep } from './lib/word-depth.mjs';
// Liên kết nội bộ sang bài kiểm tra trình độ miễn phí (docs/SEO-TOOLS.md) – chuỗi theo ngôn ngữ trang, thiếu bản dịch → không hiện
const toolLine = l => { const s = toolStrings(l); return s ? `<p><a href="${toolPath(l, 'test')}">${esc(s.toeic.otherTool)}</a></p>` : ''; };

if (process.env.SEO_PAGES === '0') { console.log('· SEO pages: tắt (SEO_PAGES=0)'); process.exit(0); }
const SITE = 'https://lexkite.com', D = process.env.SEO_DIST || 'dist';
// Chọn trang + nội dung trang từ: scripts/lib/seo-words.mjs (dùng chung với hộp từ của build-blog.mjs) – nạp sau công tắc SEO_PAGES
const { J, RTL, cap, setOf, idxW, slug, gloss, wPath, bodyOf, en, appLink, cta } = await import('./lib/seo-words.mjs');
const today = new Date().toISOString().slice(0, 10);
const gitDate = (...f) => { try { return execFileSync('git', ['log', '-1', '--format=%cs', '--', ...f], { encoding: 'utf8' }).trim() || today; } catch { return today; } };

// ---------- Khung trang ----------
const urls = []; // [url, lastmod, alts, type, lang]
const hashes = [];
const LM = lastmodStore();
const url = p => SITE + p;
const fileOf = p => path.join(D, p.endsWith('/') ? p + 'index.html' : p + '.html');
const usedT = new Set(), usedD = new Set(); // tiêu đề/mô tả duy nhất trong mỗi ngôn ngữ (cổng seo-pages)
const uniq = (set, l, s, alt) => { let v = s; if (set.has(l + v)) v = alt; set.add(l + v); return v; };
const write = (p, html, { lm, alts, type, lang, index }) => {
  const f = fileOf(p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html = themePage(html)); // chống nháy giao diện (site-layout themePage)
  // lastmod + băm IndexNow theo nội dung chính của từng trang (scripts/lib/lastmod.mjs) – đổi khung/asset không đẩy cả site về "hôm nay"
  if (index) { urls.push([url(p), LM.date(p, html, lm), alts, type, lang]); hashes.push(url(p) + ' ' + LM.hash(p)); }
};
const hl = alts => alts.map(([l, p]) => `<link rel="alternate" hreflang="${l}" href="${url(p)}">`).join('');
const withDefault = (alts, enPath) => (alts.length ? [...alts, ['x-default', enPath || alts[0][1]]] : []);
const CSS2 = `.wd .mean{font-size:1.25rem;margin:.2rem 0 .6rem}.wd .ipa{font-family:var(--ipa,inherit)}.wd .pr{display:flex;gap:1rem;flex-wrap:wrap;align-items:center}.wd blockquote{margin:.4rem 0;padding:.6rem .9rem;border-inline-start:4px solid var(--accent);background:var(--accent-soft);border-radius:8px}.wd .chips a,.wd .chips span{display:inline-flex;align-items:center;min-height:44px;box-sizing:border-box;margin:.2rem .3rem .2rem 0;padding:.25rem .6rem;border:1px solid var(--line);border-radius:999px;text-decoration:none;color:inherit}.wd .note{margin:.3rem 0}.wd .mt{font-size:.8rem;color:var(--muted)}.az{columns:3 12rem;column-gap:1.5rem}.az li{break-inside:avoid;margin:.15rem 0}.az small{color:var(--muted)}.letters{display:flex;flex-wrap:wrap;gap:.4rem;margin:.8rem 0}.letters a{display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;box-sizing:border-box;padding:.2rem .5rem;border:1px solid var(--line);border-radius:6px;text-decoration:none}.dlg p{margin:.35rem 0}.dlg b{display:inline-block;min-width:4.5rem}.ph{border:1px solid var(--line);border-radius:12px;padding:.8rem 1rem;margin:.7rem 0;background:var(--surface)}.ph .say{font-size:1.1rem;font-weight:600}.ph .no{color:var(--muted);text-decoration:line-through}.pager{display:flex;justify-content:space-between;gap:1rem;margin:1.2rem 0}.wd section{margin:1.1rem 0}.wd h2{font-size:1.15rem;margin:.2rem 0 .4rem}.wd h3{font-size:1rem;margin:.6rem 0 .3rem}.wd .senses{padding-inline-start:1.3rem}.wd .senses li,.wd .pat li,.wd .mis li,.wd .cf li,.wd .xt li{margin:.4rem 0}.wd .senses .mean{font-size:1.05rem}.wd .no{color:var(--muted);text-decoration:line-through}.wd details{border:1px solid var(--line);border-radius:10px;padding:0 .8rem;margin:.4rem 0}.wd summary{cursor:pointer;font-weight:600;min-height:44px;display:flex;align-items:center}.wd details p{margin:0 0 .6rem}.wd .chips small{margin-inline-start:.4em;color:var(--muted);font-size:.85em}`;
const page = ({ lang, title, desc, p, alts, crumbs, body, jsonld = [], robots = '', langHref, section }) => {
  const t = S[lang], dir = RTL.has(lang) ? ' dir="rtl"' : '';
  const nav = [[`/${lang}/blog/`, 'Blog'], [`/${lang}/words/`, t.words], [`/${lang}/conversations/`, t.conv]].map(([h, n]) => [h, esc(n), h === section ? ' aria-current="page"' : '']);
  const head = `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}">${robots ? `<meta name="robots" content="${robots}">` : ''}<meta name="theme-color" content="#0F3D3E"><link rel="canonical" href="${url(p)}">${hl(alts)}<meta property="og:type" content="article"><meta property="og:site_name" content="Lexkite"><meta property="og:url" content="${url(p)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${SITE}/og-default.png"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/icons/icon.svg?v=3" type="image/svg+xml"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png?v=3">${[...jsonld, crumbsLd(crumbs)].map(ld).join('')}`;
  return `<!doctype html><html lang="${lang}"${dir}><head>${head}<style>${CSS}\n${SEO_CSS}\n${CSS2}</style></head><body><a class="skip" href="#nd">${esc(t.skip)}</a>
${siteHeader({ nav, open: [appHref(lang), esc(t.open)], home: landingHref(lang), lang, langHref })}
<main id="nd">
${crumbsHtml(crumbs)}
${body}
</main>
${siteFooter({ lang, text: `Lexkite – ${esc(t.words)} · ${esc(t.conv)}`, langHref })}
<script>${UI_JS}</script></body></html>`;
};
const crumbsLd = items => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, u], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + u })) });

// ---------- Trang từ ----------
// Độ dày (docs/specs/seo-words-depth.md): khối nào có dữ liệu thật mới hiện; trang dưới DEPTH_MIN → noindex,follow (vẫn sinh, vẫn được liên kết).
const lmW = gitDate('web/js/data.js', 'web/js/lib', 'web/packs', 'web/js/notes', 'web/js/usage', 'content/dict/wordnet.json', 'web/cpack/write/models.js', 'web/cpack/speak/samples.js', 'scripts/dict/build.mjs', 'scripts/build-seo-pages.mjs', 'scripts/lib/seo-words.mjs', 'scripts/lib/seo-pages-i18n.mjs', 'scripts/lib/word-depth.mjs');
const twins = { v: 1, w: {}, c: {}, t: {} };
const built = {}; // l → Map(mục → { body, faq, m }) – dựng ở scripts/lib/seo-words.mjs (bodyOf), cùng nguồn với hộp từ của blog
let nW = 0, nWthin = 0, nWshallow = 0;
for (const l of LANGS) {
  built[l] = new Map();
  for (const e of setOf[l]) {
    const b = bodyOf(l, e);
    if (idxW[l].has(e) && !deep(measure(b.body))) { idxW[l].delete(e); nWshallow++; } // dưới ngưỡng độ dày → noindex (trước khi dựng hreflang của mọi ngôn ngữ) – y hệt indexable() của lib
    built[l].set(e, b);
  }
}
for (const l of LANGS) {
  const t = S[l], list = setOf[l];
  twins.w[l] = {};
  list.forEach(e => {
    const w = e.word, k = w.toLowerCase(), idx = idxW[l].has(e), { body, faq, m } = built[l].get(e);
    const alts = idx ? withDefault(LANGS.filter(x => idxW[x].has(e)).map(x => [x, wPath(x, e)]), idxW.en.has(e) ? wPath('en', e) : '') : [];
    const p = wPath(l, e), W = cap(w);
    const title = fill(t.wTitle, { w: W }) + ' | Lexkite', desc = uniq(usedD, l, clip(fill(t.wDesc, { w: W, m, ipa: e.ipa || '' })), clip(`${W} – ${m}: “${e.ex}”`));
    const jl = { '@context': 'https://schema.org', '@type': 'DefinedTerm', name: w, description: m, inLanguage: l, url: url(p), inDefinedTermSet: { '@type': 'DefinedTermSet', name: t.words, url: `${SITE}/${l}/words/` } };
    const fq = faq && { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }; // chữ = đúng <details> trên trang (cổng seo-pages kiểm)
    const langHref = x => (idxW[x] && idxW[x].has(e) ? wPath(x, e) : `/${x}/words/`);
    write(p, page({ lang: l, title, desc, p, alts, crumbs: [[t.home, landingHref(l)], [t.words, `/${l}/words/`], [w, p]], body, jsonld: fq ? [jl, fq] : [jl], robots: idx ? '' : 'noindex,follow', langHref, section: `/${l}/words/` }), { lm: lmW, alts, type: 'words', lang: l, index: idx });
    nW++; if (!idx) nWthin++;
    if (idx) twins.w[l][k] = slug.get(e);
  });
  // Mục lục A–Z (chỉ liệt kê, mọi trang trong ngôn ngữ đều được liên kết → không mồ côi)
  const by = {}; for (const e of [...list].sort((a, b) => a.word.localeCompare(b.word, 'en'))) (by[e.word[0].toUpperCase()] ||= []).push(e);
  const hp = `/${l}/words/`, n = list.length, title = fill(t.hubW, { n }), desc = clip(fill(t.hubWd, { n }));
  const alts = withDefault(LANGS.map(x => [x, `/${x}/words/`]), '/en/words/');
  const body = `<article class="page"><header class="hero"><h1>${esc(title)}</h1><p>${esc(desc)}</p></header>
<nav class="letters" aria-label="A–Z">${Object.keys(by).map(c => `<a href="#l-${c}">${c}</a>`).join('')}</nav>
${Object.entries(by).map(([c, es]) => `<section aria-labelledby="l-${c}"><h2 id="l-${c}">${c}</h2><ul class="az">${es.map(e => `<li><a href="${wPath(l, e)}" lang="en" dir="ltr">${esc(e.word)}</a> <small>${esc(clip(l === 'en' ? e.def : l === 'vi' ? e.vi : gloss(l, e)[0], 40))}</small></li>`).join('')}</ul></section>`).join('\n')}
${cta(t.ctaB, t.ctaWn, appLink(l, 'vocab'), t.open)}${toolLine(l)}</article>`;
  const jl = { '@context': 'https://schema.org', '@type': 'DefinedTermSet', name: t.words, description: desc, inLanguage: l, url: url(hp) };
  write(hp, page({ lang: l, title: title + ' | Lexkite', desc, p: hp, alts, crumbs: [[t.home, landingHref(l)], [t.words, hp]], body, jsonld: [jl], langHref: x => `/${x}/words/`, section: hp }), { lm: lmW, alts, type: 'words', lang: l, index: true });
}

// ---------- Giao tiếp tự tin ----------
const UD = 'content/confidence/units';
const units = fs.readdirSync(UD).filter(f => f.endsWith('.json')).map(f => J(`${UD}/${f}`)).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
const CI = Object.fromEntries(LANGS.filter(l => l !== 'vi' && l !== 'en').map(l => [l, J(`content/confidence/i18n/${l}.json`)]));
const lmC = gitDate('content/confidence', 'scripts/build-seo-pages.mjs', 'scripts/lib/seo-pages-i18n.mjs');
const LEVELS = ['A1', 'A2', 'B1', 'B2'];
const cPath = (l, u) => `/${l}/conversations/${u.id}`;
// Độ phủ bản dịch: < 90 % chuỗi của bài có bản dịch → noindex (vẫn sinh trang, chữ thiếu hiện tiếng Anh)
const tr = (l, o, miss) => { if (!o) return ''; if (l === 'vi') return o.vi; if (l === 'en') return o.en; const v = CI[l][o.vi]; if (!v) miss.n++; miss.t++; return v || o.en; };
const cov = {}, idxC = {};
for (const l of LANGS) { idxC[l] = new Set(); for (const u of units) { const m = { n: 0, t: 0 }; [u.title, u.goal, ...u.phrases.flatMap(p => [p.mean, p.why])].forEach(o => tr(l, o, m)); cov[l + u.id] = m.t ? 1 - m.n / m.t : 1; if (cov[l + u.id] >= .9) idxC[l].add(u.id); } }
let nC = 0, nCthin = 0;
for (const l of LANGS) {
  const t = S[l], x = { n: 0, t: 0 }; twins.c[l] = [];
  units.forEach((u, i) => {
    const idx = idxC[l].has(u.id), p = cPath(l, u), ti = tr(l, u.title, x), goal = tr(l, u.goal, x);
    const alts = idx ? withDefault(LANGS.filter(y => idxC[y].has(u.id)).map(y => [y, cPath(y, u)]), idxC.en.has(u.id) ? cPath('en', u) : '') : [];
    const title = uniq(usedT, l, fill(t.cTitle, { t: ti }) + ' | Lexkite', fill(t.cTitle, { t: `${ti} (${u.title.en})` }) + ' | Lexkite'), desc = clip(fill(t.cDesc, { g: goal, n: u.phrases.length, lv: u.level }));
    const dl = u.dialogue || { lines: [] }, who = s => (s === 'a' ? dl.a || 'A' : YOU[l]);
    const prev = units[i - 1], next = units[i + 1];
    const body = `<article class="page wd">
<header class="hero"><h1><span class="em" aria-hidden="true">${esc(u.em || '')}</span>${esc(ti)}</h1><p>${esc(goal)}</p><div class="sub"><span class="chip">${esc(fill(t.lv, { l: u.level }))}</span><span class="chip">${esc(t.phrases)}: ${u.phrases.length}</span></div></header>
<section aria-labelledby="h-d"><h2 id="h-d">${esc(t.dlg)}</h2><div class="dlg" lang="en" dir="ltr">${dl.lines.map(([s, line]) => `<p><b>${esc(who(s))}:</b> ${esc(line)}</p>`).join('')}</div></section>
<section aria-labelledby="h-ph"><h2 id="h-ph">${esc(t.phrases)}</h2>${u.phrases.map(ph => `<div class="ph"><p class="say" lang="en" dir="ltr">${esc(ph.say)}</p><p>${esc(tr(l, ph.mean, x))}</p>${ph.not ? `<p><b>${esc(t.not)}:</b> <span class="no" lang="en" dir="ltr">${esc(ph.not)}</span></p>` : ''}${ph.why ? `<p><b>${esc(t.why)}:</b> ${esc(tr(l, ph.why, x))}</p>` : ''}</div>`).join('')}</section>
${cta(t.ctaC, t.ctaCn, appLink(l, 'confidence/' + u.id), t.ctaB)}
<nav class="pager" aria-label="${esc(t.conv)}">${prev ? `<a href="${cPath(l, prev)}" rel="prev">← ${esc(tr(l, prev.title, { n: 0, t: 0 }))}</a>` : '<span></span>'}${next ? `<a href="${cPath(l, next)}" rel="next">${esc(tr(l, next.title, { n: 0, t: 0 }))} →</a>` : ''}</nav>
</article>`;
    const jl = { '@context': 'https://schema.org', '@type': 'LearningResource', name: ti, description: goal, inLanguage: [l, 'en'], url: url(p), learningResourceType: 'Lesson', educationalLevel: u.level, isAccessibleForFree: true, teaches: u.phrases.map(q => q.say).slice(0, 8), isPartOf: { '@type': 'Course', name: t.conv, url: `${SITE}/${l}/conversations/` }, provider: { '@type': 'Organization', name: 'Lexkite', url: SITE + '/' } };
    write(p, page({ lang: l, title, desc, p, alts, crumbs: [[t.home, landingHref(l)], [t.conv, `/${l}/conversations/`], [ti, p]], body, jsonld: [jl], robots: idx ? '' : 'noindex,follow', langHref: y => (idxC[y].has(u.id) ? cPath(y, u) : `/${y}/conversations/`), section: `/${l}/conversations/` }), { lm: lmC, alts, type: 'conversations', lang: l, index: idx });
    nC++; if (!idx) nCthin++; else twins.c[l].push(u.id);
  });
  const hp = `/${l}/conversations/`, n = units.length, title = fill(t.hubC, { n }), desc = clip(fill(t.hubCd, { n }));
  const alts = withDefault(LANGS.map(y => [y, `/${y}/conversations/`]), '/en/conversations/');
  const body = `<article class="page"><header class="hero"><h1>${esc(title)}</h1><p>${esc(desc)}</p></header>
${LEVELS.map(lv => { const us = units.filter(u => u.level === lv); return us.length ? `<section class="grp" aria-labelledby="lv-${lv}"><h2 id="lv-${lv}">${esc(fill(t.lv, { l: lv }))}</h2><ul>${us.map(u => `<li><a href="${cPath(l, u)}">${esc(u.em || '')} ${esc(tr(l, u.title, { n: 0, t: 0 }))}</a> – ${esc(tr(l, u.goal, { n: 0, t: 0 }))}</li>`).join('')}</ul></section>` : ''; }).join('\n')}
${cta(t.ctaC, t.ctaCn, appLink(l, 'confidence'), t.ctaB)}</article>`;
  const jl = { '@context': 'https://schema.org', '@type': 'Course', name: t.conv, description: desc, inLanguage: l, url: url(hp), isAccessibleForFree: true, provider: { '@type': 'Organization', name: 'Lexkite', url: SITE + '/' }, hasPart: units.map(u => ({ '@type': 'LearningResource', name: tr(l, u.title, { n: 0, t: 0 }), url: url(cPath(l, u)) })) };
  write(hp, page({ lang: l, title: title + ' | Lexkite', desc, p: hp, alts, crumbs: [[t.home, landingHref(l)], [t.conv, hp]], body, jsonld: [jl], langHref: y => `/${y}/conversations/`, section: hp }), { lm: lmC, alts, type: 'conversations', lang: l, index: true });
}

// ---------- Bản tĩnh có sẵn (bộ từ, ngữ pháp) cho app → canonical ----------
const ids = dir => (fs.existsSync(path.join(D, dir)) ? fs.readdirSync(path.join(D, dir)).filter(f => f.endsWith('.html') && f !== 'index.html').map(f => f.slice(0, -5)) : []);
twins.t = { vi: { topic: ['/tu-vung/', ids('tu-vung')], grammar: ['/ngu-phap/', ids('ngu-phap')] }, en: { topic: ['/en/vocabulary/', ids('en/vocabulary')], grammar: ['/en/grammar/', ids('en/grammar')] } };
fs.mkdirSync(path.join(D, 'data'), { recursive: true });
fs.writeFileSync(path.join(D, 'data/seo-twins.json'), JSON.stringify(twins));

// ---------- Sitemap theo loại × ngôn ngữ ----------
const xl = alts => alts.map(([l, p]) => `<xhtml:link rel="alternate" hreflang="${l}" href="${url(p)}"/>`).join('');
const sm = (f, list) => fs.writeFileSync(path.join(D, f), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${list.map(([u, lm, alts]) => `  <url><loc>${u}</loc><lastmod>${lm}</lastmod>${xl(alts)}</url>`).join('\n')}\n</urlset>\n`);
for (const l of LANGS) sm(`sitemap-words-${l}.xml`, urls.filter(u => u[3] === 'words' && u[4] === l));
sm('sitemap-conversations.xml', urls.filter(u => u[3] === 'conversations'));
// + trang bài học tiếng Anh (build-samples-en.mjs: ngữ pháp, phát âm, IELTS Writing) → cùng một danh sách IndexNow
const extra = fs.existsSync('.seo-urls-en.txt') ? fs.readFileSync('.seo-urls-en.txt', 'utf8').split('\n').filter(Boolean) : [];
fs.writeFileSync('.seo-urls.txt', [...hashes, ...extra].join('\n') + '\n');
if (LM.save({ prefixes: LANGS.flatMap(l => [`/${l}/words/`, `/${l}/conversations/`]) })) console.log('· lastmod: đã ghi sổ content/seo/lastmod.json');
const per = LANGS.map(l => `${l} ${setOf[l].length}`).join(', ');
console.log(`✓ SEO trang app: ${nW} trang từ (${nWthin} noindex, trong đó ${nWshallow} vì dưới ngưỡng độ dày; ${per}) + ${nC} bài giao tiếp (${nCthin} noindex) + ${LANGS.length * 2} mục lục · ${urls.length} URL index được · dist/data/seo-twins.json`);
