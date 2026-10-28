#!/usr/bin/env node
// Uy tín / E-E-A-T + tài sản đáng dẫn link (docs/SEO-AUTHORITY.md), 15 ngôn ngữ, 100 % tĩnh (0 D1/Worker/AI):
//  /<lang>/about/ (+ editorial-team, editorial-policy, corrections, sources) · /<lang>/research/confused-words/ (bộ dữ liệu CC BY + biểu đồ + CSV)
//  /<lang>/embed/ (widget nhúng) · /embed/pair/ (iframe "cặp từ hôm nay", không cookie/không theo dõi) · /embed/cefr-<cấp>.svg (huy hiệu)
// Chỉ ĐỌC: content/authority/** (chuỗi + kênh thật), web/js/usage/pair.js + usage-core.js (cặp từ dễ nhầm do đội biên tập soạn – KHÔNG dữ liệu người dùng).
// Ghi: dist/<lang>/{about,research,embed}/**, dist/research/*, dist/embed/*, dist/sitemap-authority.xml. Tắt: AUTHORITY_PAGES=0.
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { execFileSync } from 'node:child_process';
import { CSS, SEO_CSS, UI_JS, esc, ld, siteHeader, siteFooter, crumbsHtml, landingHref, appHref } from './lib/site-layout.mjs';
import { S } from './lib/seo-pages-i18n.mjs';
import { AUTH_LANGS as LANGS, SITE, authPath, authStrings, orgNode, editorialNode, DATASET } from './lib/authority-links.mjs';
import { toolPath } from './lib/tools-links.mjs';

if (process.env.AUTHORITY_PAGES === '0') { console.log('· Uy tín: tắt (AUTHORITY_PAGES=0)'); process.exit(0); }
const D = process.env.AUTHORITY_DIST || 'dist';
const today = new Date().toISOString().slice(0, 10), PUBLISHED = '2026-10-26';
const gitDate = (...f) => { let d; try { d = execFileSync('git', ['log', '-1', '--format=%cs', '--', ...f], { encoding: 'utf8' }).trim() || today; } catch { d = today; } return d < PUBLISHED ? PUBLISHED : d; }; // ≥ ngày đăng (dateModified ≥ datePublished)
const RTL = new Set(['ar']);
const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (o[k] ?? m));
export const LV = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// ---------- Dữ liệu: cặp từ dễ nhầm (cùng nguồn với bài "Từ dễ nhầm" trong app) ----------
const plain = s => String(s || '').replace(/\*\*?([^*]+)\*\*?/g, '$1').replace(/\s+/g, ' ').trim();
const filled = s => String(s || '').replace(/\[([^\]|]+)(\|[^\]]*)?\]/g, '$1');
const POS1 = s => String(s || '').split(',')[0].split('/')[0].trim(); // "n, không đếm được" / "n/v" → "n" (chỉ từ loại chính, không lẫn ghi chú tiếng Việt)
export function loadPairs() {
  const ctx = { self: {} };
  for (const f of ['web/js/usage/pair.js', 'web/js/usage-core.js']) vm.runInNewContext(fs.readFileSync(f, 'utf8'), ctx);
  return ctx.self.LK_USAGE.load('c').map(e => {
    const words = e.items.map(i => { const m = i.h.match(/^(.*?)\s*\(([^)]+)\)\s*$/); return { w: (m ? m[1] : i.h).trim(), pos: m ? POS1(m[2]) : '', def: i.en, raw: (i.ex || [])[0] || '', ex: filled((i.ex || [])[0]) }; });
    const pos = [...new Set(words.map(w => w.pos).filter(Boolean))].sort();
    // Lỗi điển hình: ghi chú "!" của biên tập; nhóm không có → câu ví dụ với từ bị nhầm (phương án sai trong [đúng|nhầm])
    const swap = words.map(w => { const m = w.raw.match(/\[([^\]|]+)\|([^\]|]+)/); return m ? { wrong: w.raw.replace(/\[[^\]]*\]/, m[2]), right: w.ex, note: '' } : null; }).filter(Boolean);
    const mistakes = e.mis.length ? e.mis.map(m => ({ wrong: plain(m.w), right: plain(m.r), note: plain(m.en) })) : swap.slice(0, 1).map(x => ({ ...x, wrong: filled(x.wrong) }));
    return { id: e.key, words: words.map(({ raw, ...w }) => w), pos, pattern: pos.length > 1 ? pos.join(' ↔ ') : pos.length ? `${pos[0]} ↔ ${pos[0]}` : '—', diffPos: pos.length > 1,
      mistakes, noted: e.mis.length, tip: plain((e.notes[0] || {}).en).replace(/^Tip:\s*/i, ''), lesson: (e.lessons || [])[0] || '' };
  });
}
export function stats(pairs) {
  const n = pairs.length, m = pairs.reduce((a, p) => a + p.mistakes.length, 0), known = pairs.filter(p => p.pos.length);
  const d = Math.round(known.filter(p => p.diffPos).length / known.length * 100);
  const by = k => Object.entries(pairs.reduce((o, p) => (o[k(p)] = (o[k(p)] || 0) + 1, o), {})).sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
  const pat = by(p => p.pattern), big = pat.filter(([, v]) => v >= 3), rest = pat.filter(([, v]) => v < 3).reduce((a, [, v]) => a + v, 0);
  return { n, m, d, s: 100 - d, patterns: rest ? [...big, ['*', rest]] : big, perGroup: by(p => p.words.length >= 3 ? '3+' : String(p.words.length)).sort((a, b) => a[0].localeCompare(b[0])) };
}
const csvCell = v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
export function toCsv(pairs) {
  const head = ['id', 'words', 'parts_of_speech', 'pos_pattern', 'definitions', 'example', 'typical_mistake', 'correction', 'mistake_note', 'mistakes_documented', 'memory_tip', 'related_lesson'];
  return [head.join(','), ...pairs.map(p => [p.id, p.words.map(w => w.w).join(' / '), p.words.map(w => w.pos).join(' / '), p.pattern, p.words.map(w => `${w.w}: ${w.def}`).join(' | '), p.words.map(w => w.ex).filter(Boolean).join(' | '),
    (p.mistakes[0] || {}).wrong || '', (p.mistakes[0] || {}).right || '', (p.mistakes[0] || {}).note || '', p.mistakes.length, p.tip, p.lesson].map(csvCell).join(','))].join('\n') + '\n';
}

// ---------- Khung trang ----------
const urls = [];
const url = p => SITE + p;
const write = (p, html) => { const f = path.join(D, p, p.endsWith('/') ? 'index.html' : ''); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };
const altsOf = kind => [...LANGS.map(l => [l, authPath(l, kind)]), ['x-default', authPath('en', kind)]];
const AUTH_CSS = `.auth .lead{font-size:1.1rem;max-width:62ch}.auth section{max-width:72ch}.auth .rel{display:grid;grid-template-columns:repeat(auto-fill,minmax(13rem,1fr));gap:.6rem;padding:0;list-style:none}.auth .rel a{display:flex;align-items:center;min-height:48px;padding:.6rem 1rem;border:1px solid var(--line);border-radius:12px;background:var(--surface);text-decoration:none;color:inherit;font-weight:600}.auth .rel a[aria-current]{border-color:var(--accent)}
.auth ol.steps{padding-inline-start:1.3rem}.auth ol.steps li{margin:.7rem 0}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(9rem,1fr));gap:.7rem;margin:1rem 0;padding:0;list-style:none}.stats li{padding:.8rem 1rem;border-radius:12px;background:var(--accent-soft)}.stats b{display:block;font-size:1.8rem;line-height:1.1;color:var(--brand)}
.chart{max-width:40rem;margin:1rem 0}.chart svg{width:100%;height:auto;display:block}.chart figcaption{font-weight:700;margin-bottom:.4rem}.chart .bar{fill:var(--accent)}.chart text{fill:var(--text);font:13px system-ui,sans-serif}
.tbl{overflow-x:auto;border:1px solid var(--line);border-radius:12px;max-height:36rem}.tbl table{border-collapse:collapse;min-width:44rem;font-size:.92rem}.tbl th,.tbl td{border-bottom:1px solid var(--line);padding:.45rem .7rem;text-align:start;vertical-align:top}.tbl thead th{position:sticky;top:0;background:var(--surface)}.tbl s{color:var(--muted)}
.cite,.code{display:block;white-space:pre-wrap;word-break:break-word;padding:.8rem 1rem;border-radius:10px;background:var(--surface);border:1px solid var(--line);font:.86rem/1.5 ui-monospace,Menlo,monospace}.dl{display:flex;flex-wrap:wrap;gap:.6rem}.embed-prev{border:1px dashed var(--line);border-radius:12px;padding:.6rem;max-width:440px}.badges{display:flex;flex-wrap:wrap;gap:.6rem}
@media (prefers-color-scheme:dark){.stats b{color:#7fd6cc}}`;
const page = ({ lang, kind, title, desc, crumbs, body, jsonld = [], script = '' }) => {
  const p = authPath(lang, kind), alts = altsOf(kind), t = S[lang], s = authStrings(lang), dir = RTL.has(lang) ? ' dir="rtl"' : '';
  const nav = [[authPath(lang, 'hub'), esc(s.nav.hub), kind === 'hub' ? ' aria-current="page"' : ''], [authPath(lang, 'research'), esc(s.nav.research), kind === 'research' ? ' aria-current="page"' : ''], [`/${lang}/blog/`, 'Blog', '']];
  const head = `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><meta name="theme-color" content="#0F3D3E"><link rel="canonical" href="${url(p)}">${alts.map(([l, u]) => `<link rel="alternate" hreflang="${l}" href="${url(u)}">`).join('')}<meta property="og:type" content="website"><meta property="og:site_name" content="Lexkite"><meta property="og:locale" content="${lang}"><meta property="og:url" content="${url(p)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${SITE}/og-default.png"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/icons/icon.svg?v=2" type="image/svg+xml"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png?v=2">${[...jsonld, crumbsLd(crumbs)].map(ld).join('')}`;
  urls.push([p, lastmod, alts]);
  return `<!doctype html><html lang="${lang}"${dir}><head>${head}<style>${CSS}\n${SEO_CSS}\n${AUTH_CSS}</style></head><body><a class="skip" href="#nd">${esc(t.skip)}</a>
${siteHeader({ nav, open: [appHref(lang), esc(t.open)], home: landingHref(lang), lang, langHref: l => alts.find(a => a[0] === l)[1] })}
<main id="nd" class="auth">
${crumbsHtml(crumbs)}
${body}
${related(lang, kind)}
</main>
${siteFooter({ lang, text: `Lexkite – ${esc(s.nav.hub)}`, langHref: l => alts.find(a => a[0] === l)[1] })}
<script>${UI_JS}</script>${script ? `<script>${script}</script>` : ''}</body></html>`;
};
const crumbsLd = items => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, u], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + u })) });
const KINDS = ['hub', 'team', 'policy', 'corrections', 'sources', 'research', 'embed'];
const related = (lang, cur) => { const s = authStrings(lang); return `<nav aria-label="${esc(s.related)}"><h2>${esc(s.related)}</h2><ul class="rel">${KINDS.filter(k => k !== 'hub').map(k => `<li><a href="${authPath(lang, k)}"${k === cur ? ' aria-current="page"' : ''}>${esc(s.nav[k])}</a></li>`).join('')}</ul></nav>`; };
const secs = list => list.map(([h, p]) => `<section><h2>${esc(h)}</h2><p>${esc(p).replace(/support@lexkite\.com/g, '<a href="mailto:support@lexkite.com">support@lexkite.com</a>')}</p></section>`).join('\n');
const webPage = (lang, kind, type, name, desc, extra = {}) => ({ '@context': 'https://schema.org', '@type': type, '@id': `${url(authPath(lang, kind))}#page`, name, description: desc, url: url(authPath(lang, kind)), inLanguage: lang, isPartOf: { '@type': 'WebSite', '@id': `${SITE}/#website`, name: 'Lexkite', url: `${SITE}/` }, publisher: { '@id': `${SITE}/#org` }, datePublished: PUBLISHED, dateModified: lastmod, ...extra });
let lastmod = today;

// Biểu đồ cột ngang SVG tĩnh (0 JS, chữ đọc được, nhãn số ngay trên cột)
const barChart = (caption, rows, label) => {
  const W = 560, rowH = 30, lw = 150, max = Math.max(...rows.map(r => r[1])), H = rows.length * rowH + 8;
  return `<figure class="chart"><figcaption>${esc(caption)}</figcaption><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(caption + ': ' + rows.map(([k, v]) => `${k} ${v}`).join(', '))}">${rows.map(([k, v], i) => { const y = i * rowH + 4, w = Math.max(2, Math.round((W - lw - 50) * v / max)); return `<text x="${lw - 8}" y="${y + 19}" text-anchor="end" direction="ltr">${esc(label(k))}</text><rect class="bar" x="${lw}" y="${y + 4}" width="${w}" height="${rowH - 10}" rx="4"/><text x="${lw + w + 6}" y="${y + 19}">${v}</text>`; }).join('')}</svg></figure>`;
};

// ---------- Sinh ----------
export function build() {
  const missing = LANGS.filter(l => !authStrings(l));
  if (missing.length) throw new Error('build-authority: thiếu content/authority/i18n/' + missing.join(', ') + '.json');
  const pairs = loadPairs(), st = stats(pairs), N = { n: st.n, m: st.m, d: st.d, s: st.s };
  // Bộ dữ liệu tải về (CC BY 4.0) – 1 bản tiếng Anh cho mọi ngôn ngữ
  fs.mkdirSync(path.join(D, 'research'), { recursive: true });
  fs.writeFileSync(path.join(D, DATASET.csv), toCsv(pairs));
  fs.writeFileSync(path.join(D, DATASET.json), JSON.stringify({ name: 'Commonly confused English words (Lexkite)', license: 'CC BY 4.0', licenseUrl: DATASET.license, creator: 'Lexkite Editorial Team', url: `${SITE}${authPath('en', 'research')}`, version: gitDate('web/js/usage/pair.js'), groups: pairs.map(p => ({ id: p.id, words: p.words, pattern: p.pattern, mistakes: p.mistakes, tip: p.tip, lesson: p.lesson })) }, null, 1));
  const lmPairs = gitDate('web/js/usage/pair.js', 'content/authority', 'scripts/build-authority.mjs'), lmText = gitDate('content/authority', 'scripts/build-authority.mjs');
  let n = 0;
  for (const lang of LANGS) {
    const t = S[lang], s = authStrings(lang), home = [t.home, landingHref(lang)], hub = [s.nav.hub, authPath(lang, 'hub')];
    lastmod = lmText;
    // Giới thiệu (hub)
    write(authPath(lang, 'hub'), page({ lang, kind: 'hub', title: s.about.title, desc: s.about.desc, crumbs: [home, hub],
      jsonld: [webPage(lang, 'hub', 'AboutPage', s.about.title, s.about.desc, { about: { '@id': `${SITE}/#org` }, mainEntity: { '@id': `${SITE}/#org` } }), { '@context': 'https://schema.org', ...orgNode() }],
      body: `<h1>${esc(s.about.h1)}</h1><p class="lead">${esc(s.about.lead)}</p>\n${secs(s.about.sections)}` })); n++;
    // Đội biên tập (hồ sơ tác giả của mọi bài blog)
    write(authPath(lang, 'team'), page({ lang, kind: 'team', title: s.team.title, desc: s.team.desc, crumbs: [home, hub, [s.nav.team, authPath(lang, 'team')]],
      jsonld: [webPage(lang, 'team', 'ProfilePage', s.team.title, s.team.desc, { mainEntity: { ...editorialNode(lang), description: s.team.lead, publishingPrinciples: url(authPath(lang, 'policy')) } })],
      body: `<h1>${esc(s.team.h1)}</h1><p class="lead">${esc(s.team.lead)}</p>\n${secs(s.team.sections)}<p><a class="btn" href="/${lang}/blog/">Blog →</a></p>` })); n++;
    // Quy trình biên tập & kiểm chứng (đúng 6 bước của docs/BLOG-RUNBOOK.md + content/blog/prompts/1…6)
    write(authPath(lang, 'policy'), page({ lang, kind: 'policy', title: s.policy.title, desc: s.policy.desc, crumbs: [home, hub, [s.nav.policy, authPath(lang, 'policy')]],
      jsonld: [webPage(lang, 'policy', 'WebPage', s.policy.title, s.policy.desc, { about: { '@id': `${SITE}/#org` }, mainEntity: { '@type': 'ItemList', name: s.policy.stepsH, itemListElement: s.policy.steps.map(([h], i) => ({ '@type': 'ListItem', position: i + 1, name: h })) } })],
      body: `<h1>${esc(s.policy.h1)}</h1><p class="lead">${esc(s.policy.lead)}</p><section><h2>${esc(s.policy.stepsH)}</h2><ol class="steps">${s.policy.steps.map(([h, p]) => `<li><b>${esc(h)}.</b> ${esc(p)}</li>`).join('')}</ol></section><section><h2>${esc(s.policy.rulesH)}</h2><ul>${s.policy.rules.map(r => `<li>${esc(r)}</li>`).join('')}</ul></section>` })); n++;
    // Chính sách sửa lỗi
    write(authPath(lang, 'corrections'), page({ lang, kind: 'corrections', title: s.corrections.title, desc: s.corrections.desc, crumbs: [home, hub, [s.nav.corrections, authPath(lang, 'corrections')]],
      jsonld: [webPage(lang, 'corrections', 'WebPage', s.corrections.title, s.corrections.desc, { about: { '@id': `${SITE}/#org` } })],
      body: `<h1>${esc(s.corrections.h1)}</h1><p class="lead">${esc(s.corrections.lead)}</p>\n${secs(s.corrections.sections)}` })); n++;
    // Nguồn tham khảo (chỉ nguồn app thật sự dùng – content/wordlists/README.md, content/lexicon, FSRS)
    const SRC = [
      [['IELTS', 'https://ielts.org/'], ['TOEIC – ETS', 'https://www.ets.org/toeic.html'], ['TOEFL – ETS', 'https://www.ets.org/toefl.html'], ['Cambridge English', 'https://www.cambridgeenglish.org/']],
      [['CEFR – Council of Europe', 'https://www.coe.int/en/web/common-european-framework-reference-languages']],
      [['NGSL, NAWL, BSL (CC BY-SA 4.0)', 'https://www.newgeneralservicelist.com/'], ['Oxford 3000/5000 (CEFR levels only)', 'https://www.oxfordlearnersdictionaries.com/wordlists/oxford3000-5000'], ['Wiktionary – IPA (CC BY-SA)', 'https://en.wiktionary.org/'], ['CMU Pronouncing Dictionary', 'http://www.speech.cs.cmu.edu/cgi-bin/cmudict']],
      [['FSRS – open-spaced-repetition', 'https://github.com/open-spaced-repetition']],
    ];
    write(authPath(lang, 'sources'), page({ lang, kind: 'sources', title: s.sources.title, desc: s.sources.desc, crumbs: [home, hub, [s.nav.sources, authPath(lang, 'sources')]],
      jsonld: [webPage(lang, 'sources', 'WebPage', s.sources.title, s.sources.desc, { citation: SRC.flat().map(([name, u]) => ({ '@type': 'CreativeWork', name, url: u })) })],
      body: `<h1>${esc(s.sources.h1)}</h1><p class="lead">${esc(s.sources.lead)}</p>${s.sources.groups.map(([h, p], i) => `<section><h2>${esc(h)}</h2><p>${esc(p)}</p><ul>${SRC[i].map(([nm, u]) => `<li><a href="${u}" rel="noopener" lang="en" dir="ltr">${esc(nm)}</a></li>`).join('')}</ul></section>`).join('\n')}<p><a href="/${lang}/credits">${esc(s.sources.creditsNote)}</a></p>` })); n++;
    // Nghiên cứu dữ liệu gốc: cặp từ dễ nhầm (Dataset + biểu đồ + CSV, CC BY 4.0)
    lastmod = lmPairs;
    const R = s.research, pR = authPath(lang, 'research'), title = fill(R.title, N), desc = fill(R.desc, N);
    const cite = `Lexkite Editorial Team (${lastmod.slice(0, 4)}). Commonly confused English words: an open dataset (version ${lastmod}). Lexkite. ${url(authPath('en', 'research'))}. https://doi.org/${DATASET.doi}. CC BY 4.0.`;
    write(pR, page({ lang, kind: 'research', title, desc, crumbs: [home, hub, [s.nav.research, pR]],
      jsonld: [webPage(lang, 'research', 'WebPage', title, desc, { mainEntity: { '@id': `${url(authPath('en', 'research'))}#dataset` } }),
        { '@context': 'https://schema.org', '@type': 'Dataset', '@id': `${url(authPath('en', 'research'))}#dataset`, name: 'Commonly confused English words (Lexkite)', alternateName: title, description: fill(desc, N) + ' ' + R.privacy, url: url(pR), sameAs: [url(authPath('en', 'research')), `https://doi.org/${DATASET.doi}`, DATASET.repo], identifier: `https://doi.org/${DATASET.doi}`, inLanguage: 'en', keywords: ['English', 'commonly confused words', 'ESL', 'vocabulary', 'learner errors', 'CEFR'], license: DATASET.license, isAccessibleForFree: true, creator: editorialNode(lang), publisher: { '@id': `${SITE}/#org` }, datePublished: PUBLISHED, dateModified: lastmod, version: lastmod, citation: cite,
          variableMeasured: ['words', 'parts_of_speech', 'pos_pattern', 'definitions', 'example', 'typical_mistake', 'correction', 'mistake_note', 'mistakes_documented', 'memory_tip', 'related_lesson'],
          distribution: [{ '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: SITE + DATASET.csv }, { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: SITE + DATASET.json }] }],
      body: `<h1>${esc(R.h1)}</h1><p class="lead">${esc(fill(R.lead, N))}</p>
<section><h2>${esc(R.keyH)}</h2><ul>${R.keys.map(k => `<li>${esc(fill(k, N))}</li>`).join('')}</ul></section>
${barChart(R.chart1, st.patterns, k => k === '*' ? R.other : k)}
${barChart(R.chart2, st.perGroup, k => k)}
<section><h2>${esc(R.downloadH)}</h2><p>${esc(R.download)}</p><p class="dl"><a class="btn" href="${DATASET.csv}" download>${esc(R.csv)} (CSV)</a><a class="btn" href="${DATASET.json}" download>${esc(R.json)} (JSON)</a></p><p><a href="${DATASET.license}" rel="license noopener">CC BY 4.0</a></p></section>
<section><h2>${esc(R.citeH)}</h2><code class="cite" lang="en" dir="ltr">${esc(cite)}</code></section>
<section><h2>${esc(R.tableH)}</h2><div class="tbl" tabindex="0" role="region" aria-label="${esc(R.tableH)}"><table lang="en" dir="ltr"><thead><tr>${R.cols.map(c => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${pairs.map(p => `<tr id="${esc(p.id)}"><th scope="row">${esc(p.words.map(w => w.w).join(' / '))}</th><td>${esc(p.pattern)}</td><td>${p.mistakes[0] ? `<s>${esc(p.mistakes[0].wrong)}</s> → ${esc(p.mistakes[0].right)}` : '—'}</td><td>${esc(p.tip || p.mistakes[0]?.note || '—')}</td></tr>`).join('')}</tbody></table></div></section>
<section><h2>${esc(R.methodH)}</h2>${R.method.map(x => `<p>${esc(x)}</p>`).join('')}</section>
<section><h2>${esc(R.privacyH)}</h2><p>${esc(R.privacy)}</p></section>
<section><h2>${esc(R.limitsH)}</h2><p>${esc(R.limits)}</p></section>
<p><a class="btn" href="${appHref(lang)}#/usage" data-hit="research_app">${esc(t.open)} →</a> <a href="${authPath(lang, 'embed')}">${esc(R.embedLink)}</a></p>` })); n++;
    // Widget nhúng
    lastmod = lmText;
    const E = s.embed, pE = authPath(lang, 'embed');
    const pairSnip = `<iframe src="${SITE}/embed/pair/?hl=${lang}" title="${esc(E.widgetLabel)} – Lexkite" width="100%" height="230" loading="lazy" style="border:0;max-width:420px"></iframe>\n<p><a href="${url(pR)}">${esc(s.nav.research)} – Lexkite</a></p>`;
    const badgeSnip = lv => `<a href="${SITE}${toolPath(lang, 'test', lv)}"><img src="${SITE}/embed/cefr-${lv.toLowerCase()}.svg" width="220" height="60" alt="CEFR ${lv} – Lexkite"></a>`;
    write(pE, page({ lang, kind: 'embed', title: E.title, desc: E.desc, crumbs: [home, hub, [s.nav.embed, pE]],
      jsonld: [webPage(lang, 'embed', 'WebPage', E.title, E.desc)],
      script: `document.querySelectorAll('[data-copy]').forEach(function(b){b.addEventListener('click',function(){var c=document.getElementById(b.dataset.copy).textContent;(navigator.clipboard?navigator.clipboard.writeText(c):Promise.reject()).then(function(){b.textContent=b.dataset.ok}).catch(function(){})})})`,
      body: `<h1>${esc(E.h1)}</h1><p class="lead">${esc(E.lead)}</p>
<section><h2>${esc(E.pairH)}</h2><p>${esc(E.pair)}</p><code class="code" id="snip-pair" lang="en" dir="ltr">${esc(pairSnip)}</code><p><button type="button" class="btn" data-copy="snip-pair" data-ok="${esc(E.copied)}">${esc(E.copy)}</button></p><h3>${esc(E.previewH)}</h3><div class="embed-prev"><iframe src="/embed/pair/?hl=${lang}" title="${esc(E.widgetLabel)}" width="100%" height="230" loading="lazy" style="border:0"></iframe></div></section>
<section><h2>${esc(E.badgeH)}</h2><p>${esc(E.badge)} <a href="${toolPath(lang, 'test')}">→</a></p><div class="badges">${LV.map(lv => `<img src="/embed/cefr-${lv.toLowerCase()}.svg" width="220" height="60" alt="CEFR ${lv} – Lexkite" loading="lazy">`).join('')}</div><code class="code" id="snip-badge" lang="en" dir="ltr">${esc(badgeSnip('B2'))}</code><p><button type="button" class="btn" data-copy="snip-badge" data-ok="${esc(E.copied)}">${esc(E.copy)}</button></p></section>
<section><h2>${esc(E.rulesH)}</h2><p>${esc(E.rules)}</p></section>` })); n++;
  }
  // Tài nguyên nhúng dùng chung (không theo ngôn ngữ URL): iframe cặp từ hôm nay + 6 huy hiệu CEFR
  writeEmbedAssets(pairs);
  fs.writeFileSync(path.join(D, 'sitemap-authority.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.map(([p, lm, alts]) => `<url><loc>${url(p)}</loc><lastmod>${lm}</lastmod>${alts.map(([l, u]) => `<xhtml:link rel="alternate" hreflang="${l}" href="${url(u)}"/>`).join('')}</url>`).join('\n')}\n</urlset>\n`);
  console.log(`✓ Uy tín: ${n} trang (${LANGS.length} ngôn ngữ × ${KINDS.length}), bộ dữ liệu ${st.n} nhóm / ${st.m} lỗi điển hình (CSV+JSON, CC BY 4.0), widget nhúng → sitemap-authority.xml`);
  return { n, urls, st };
}

// iframe nhẹ (< 30 KB, 0 request ngoài, 0 cookie/storage, 0 phân tích): chọn cặp theo ngày UTC; nhãn theo ?hl= (15 ngôn ngữ)
function writeEmbedAssets(pairs) {
  const L = Object.fromEntries(LANGS.map(l => { const e = authStrings(l).embed; return [l, [e.widgetLabel, e.mistake, e.tip, e.more, RTL.has(l) ? 1 : 0]]; }));
  const data = pairs.map(p => [p.id, p.words.map(w => w.w).join(' / '), p.mistakes[0] ? `${p.mistakes[0].wrong} → ${p.mistakes[0].right}` : '', p.tip || (p.mistakes[0] || {}).note || '']);
  const js = `(function(){var D=${JSON.stringify(data)},L=${JSON.stringify(L)},q=/[?&]hl=([a-z]{2})/.exec(location.search),hl=q&&L[q[1]]?q[1]:'en',t=L[hl],p=D[Math.floor(Date.now()/864e5)%D.length],d=document;d.documentElement.lang=hl;if(t[4])d.documentElement.dir='rtl';function s(id,v){d.getElementById(id).textContent=v}s('h',t[0]);s('w',p[1]);s('ml',t[1]);s('m',p[2]);s('tl',t[2]);s('tp',p[3]);var a=d.getElementById('a');a.textContent=t[3]+' →';a.href='${SITE}/'+hl+'/research/confused-words/#'+p[0];d.getElementById('mr').hidden=!p[2];d.getElementById('tr').hidden=!p[3]})()`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><meta name="referrer" content="no-referrer"><title>Word pair of the day – Lexkite</title><link rel="canonical" href="${SITE}${authPath('en', 'embed')}">
<style>:root{color-scheme:light dark;--bg:#fff;--tx:#171827;--mu:#4e526b;--ac:#0D6964;--br:#0F3D3E;--ln:#e2e4ef}@media (prefers-color-scheme:dark){:root{--bg:#10191B;--tx:#EAF2F1;--mu:#A3B9B7;--ac:#7fd6cc;--br:#7fd6cc;--ln:#2A3E42}}
body{margin:0;font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;background:var(--bg);color:var(--tx)}.c{border:1px solid var(--ln);border-radius:14px;padding:12px 14px;box-sizing:border-box;min-height:200px}.h{margin:0;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--mu)}.w{margin:4px 0 8px;font-size:22px;font-weight:800;color:var(--br)}p{margin:4px 0}b{font-weight:700}a{display:inline-flex;align-items:center;min-height:44px;color:var(--ac);font-weight:700}</style></head>
<body><div class="c"><p class="h" id="h"></p><p class="w" id="w" lang="en" dir="ltr"></p><p id="mr"><b id="ml"></b>: <span id="m" lang="en" dir="ltr"></span></p><p id="tr"><b id="tl"></b>: <span id="tp" lang="en" dir="ltr"></span></p><a id="a" target="_blank" rel="noopener" href="${SITE}${authPath('en', 'research')}">Lexkite</a></div><script>${js}</script></body></html>`;
  write('/embed/pair/', html);
  for (const lv of LV) fs.writeFileSync(path.join(D, `embed/cefr-${lv.toLowerCase()}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="60" viewBox="0 0 220 60" role="img" aria-label="CEFR ${lv} English level – Lexkite"><title>CEFR ${lv} English level – Lexkite</title><rect width="220" height="60" rx="12" fill="#0F3D3E"/><rect x="8" y="8" width="56" height="44" rx="9" fill="#FFC94A"/><text x="36" y="38" text-anchor="middle" font-family="system-ui,Segoe UI,Arial,sans-serif" font-size="20" font-weight="800" fill="#0F3D3E">${lv}</text><text x="76" y="27" font-family="system-ui,Segoe UI,Arial,sans-serif" font-size="13" font-weight="700" fill="#fff">CEFR English level</text><text x="76" y="45" font-family="system-ui,Segoe UI,Arial,sans-serif" font-size="12" fill="#DDF1EE">Tested free · lexkite.com</text></svg>\n`);
}
if (/build-authority\.mjs$/.test(process.argv[1] || '')) build();
