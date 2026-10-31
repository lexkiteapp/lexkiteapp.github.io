#!/usr/bin/env node
// Công cụ miễn phí 15 ngôn ngữ (docs/SEO-TOOLS.md): bài kiểm tra trình độ CEFR thích ứng + 6 trang cấp độ + quiz TOEIC Part 5. 100 % tĩnh:
// chạy trên trình duyệt (web/js/tools/*.js), 0 lượt D1/Worker/AI. Chỉ ĐỌC: content/tools/** (ngân hàng câu + chuỗi), web/js/toeic/reading*.js
// (Part 5 tự soạn của app), web/i18n/explain/<lang>.json (lời giải đã dịch của app).
// Ghi: dist/<lang>/<slug>/**, dist/data/tools/*.json, dist/sitemap-tools.xml. Chạy trong build-web.sh trước build-sitemap-index. Tắt: TOOLS_PAGES=0.
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { execFileSync } from 'node:child_process';
import { CSS, SEO_CSS, UI_JS, esc, ld, themePage, siteHeader, siteFooter, crumbsHtml, landingHref, appHref } from './lib/site-layout.mjs';
import { S } from './lib/seo-pages-i18n.mjs';
import { TOOL_LANGS as LANGS, toolPath, toolStrings } from './lib/tools-links.mjs';

if (process.env.TOOLS_PAGES === '0') { console.log('· Công cụ: tắt (TOOLS_PAGES=0)'); process.exit(0); }
const SITE = 'https://lexkite.com', D = process.env.TOOLS_DIST || 'dist';
const J = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const today = new Date().toISOString().slice(0, 10);
const gitDate = (...f) => { try { return execFileSync('git', ['log', '-1', '--format=%cs', '--', ...f], { encoding: 'utf8' }).trim() || today; } catch { return today; } };
const RTL = new Set(['ar']);
export const LV = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (o[k] ?? m));
const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };

// ---------- Dữ liệu ----------
// Ngân hàng CEFR: đáp án đúng luôn viết đầu (a = 0) → xáo vị trí theo băm id (ổn định giữa các lần build, phân bố đều A–D – test kiểm)
export function publishBank(items) {
  return items.map(it => { const k = parseInt(fnv(it.id), 36) % 4, o = it.o.slice(k).concat(it.o.slice(0, k)); return { id: it.id, lv: it.lv, sk: it.sk, ...(it.p ? { p: it.p } : {}), q: it.q, o, a: (4 - k) % 4 }; });
}
// TOEIC Part 5 của app (7 đề × 30 câu, tự soạn) + lời giải theo ngôn ngữ (vi = gốc; khác = bản dịch app đang dùng, thiếu → bỏ câu đó ở ngôn ngữ đó)
export function loadToeic5() {
  const ctx = { self: {} };
  for (const f of fs.readdirSync('web/js/toeic').filter(f => /^reading\d+\.js$/.test(f)).sort()) vm.runInNewContext(fs.readFileSync('web/js/toeic/' + f, 'utf8'), ctx);
  return ctx.self.TOEIC.reading.flatMap(t => t.parts.filter(p => p.part === 5).flatMap(p => p.groups.flatMap(g => g.items.map(i => ({ id: `${t.id}-${i.n}`, q: i.q, o: i.options, a: i.a, x: i.explain })))));
}
const toeicFor = (lang, items) => {
  const tr = lang === 'vi' ? null : J(`web/i18n/explain/${lang}.json`);
  return items.map(i => ({ id: i.id, q: i.q, o: i.o, a: i.a, x: tr ? tr[fnv(i.x)] : i.x })).filter(i => i.x);
};
// Mốc điểm quy đổi gần đúng: Cambridge English (IELTS ↔ CEFR) · ETS (TOEIC Listening & Reading ↔ CEFR, điểm tối thiểu mỗi cấp)
export const EXAMS = { A1: ['—', '120–220'], A2: ['< 4.0', '225–545'], B1: ['4.0–5.0', '550–780'], B2: ['5.5–6.5', '785–940'], C1: ['7.0–8.0', '945–990'], C2: ['8.5–9.0', '945–990'] };
// Lộ trình theo cấp → route app (đều có trong web/js: routes.<tên> – test kiểm)
export const PLAN = { A1: ['grammar', 'vocab', 'pron', 'path'], A2: ['path', 'vocab', 'listening', 'confidence'], B1: ['reading', 'listening', 'confidence', 'toeic'], B2: ['write', 'tests', 'usage', 'mock'], C1: ['models', 'write', 'usage', 'mock'], C2: ['models', 'paraphrase', 'mock', 'usage'] };

// ---------- Khung trang ----------
const urls = []; // [path, lastmod, alts]
const url = p => SITE + p;
const write = (p, html) => { const f = path.join(D, p, 'index.html'); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, themePage(html)); }; // nút + script chống nháy giao diện (site-layout themePage)
const altsOf = fn => [...LANGS.map(l => [l, fn(l)]), ['x-default', fn('en')]];
const TOOL_CSS = `.tool .lead{font-size:1.1rem;max-width:62ch}.facts{display:flex;flex-wrap:wrap;gap:.5rem;padding:0;margin:1rem 0;list-style:none}.facts li{padding:.35rem .8rem;border-radius:999px;background:var(--accent-soft);color:var(--text);font-weight:600;font-size:.92rem}
.qz{border:1px solid var(--line);border-radius:var(--r);background:var(--surface);padding:1.1rem;margin:1.2rem 0;min-height:15rem}.qz[aria-busy=true]{opacity:.7}.qz .bar{height:6px;border-radius:3px;background:var(--line);overflow:hidden;margin:.2rem 0 .9rem}.qz .bar i{display:block;height:100%;background:var(--accent);transition:width .3s}
.qz .meta{display:flex;justify-content:space-between;gap:1rem;color:var(--muted);font-size:.9rem}.qz .psg{margin:.6rem 0;padding:.7rem .9rem;border-inline-start:4px solid var(--accent);background:var(--accent-soft);border-radius:8px}.qz .q{font-size:1.15rem;font-weight:600;margin:.7rem 0}
.qz .opts{display:grid;gap:.5rem;margin:.6rem 0}.qz .opts button{min-height:48px;text-align:start;padding:.6rem .9rem;border:1.5px solid var(--line);border-radius:12px;background:var(--bg);color:var(--text);font:inherit;cursor:pointer}.qz .opts button:hover{border-color:var(--accent)}.qz .opts button:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.qz .opts .ok{border-color:#2FBF71;background:color-mix(in srgb,#2FBF71 14%,var(--bg))}.qz .opts .no{border-color:var(--primary);background:var(--primary-soft)}.qz .idk{background:none;border:0;color:var(--link);text-decoration:underline;font:inherit;min-height:44px;cursor:pointer;padding:0}.qz .hint{color:var(--muted);font-size:.88rem}
.qz .fb{margin:.7rem 0;padding:.7rem .9rem;border-radius:10px;background:var(--bg)}.qz .row{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;margin-top:.8rem}.qz .big{font-size:3rem;font-weight:800;line-height:1;color:var(--brand)}.qz .sk{display:grid;grid-template-columns:auto 1fr auto;gap:.3rem .7rem;align-items:center;max-width:28rem}.qz .sk meter{width:100%;height:10px}
.lvls{display:grid;grid-template-columns:repeat(auto-fill,minmax(14rem,1fr));gap:.7rem;padding:0;list-style:none}.lvls a{display:block;padding:.8rem 1rem;border:1px solid var(--line);border-radius:12px;text-decoration:none;color:inherit;background:var(--surface);min-height:44px}.lvls b{color:var(--brand);margin-inline-end:.4rem}.lvls a[aria-current]{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-soft)}
.ex{border-collapse:collapse;margin:.6rem 0}.ex th,.ex td{border:1px solid var(--line);padding:.45rem .8rem;text-align:start}.steps{display:grid;gap:.6rem;padding:0;list-style:none;counter-reset:s}.steps a{display:block;padding:.75rem 1rem;border:1px solid var(--line);border-radius:12px;text-decoration:none;color:inherit;background:var(--surface)}.steps a b{color:var(--link)}.steps small{display:block;color:var(--muted)}
.sample{border:1px solid var(--line);border-radius:12px;padding:.8rem 1rem;margin:.6rem 0;background:var(--surface)}.sample ol{margin:.4rem 0}.sample summary{cursor:pointer;min-height:44px;display:flex;align-items:center;font-weight:600}
.qz .opts kbd{display:inline-flex;align-items:center;justify-content:center;min-width:1.6em;height:1.6em;margin-inline-end:.6rem;border:1px solid var(--line);border-radius:6px;font:600 .8rem/1 inherit;color:var(--muted)}@media (hover:none){.qz .opts kbd{display:none}}
.qz .q,.qz .opts,.qz .psg,.qz .fb,.qz h2{animation:qzin .18s ease-out both}@keyframes qzin{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}.qz .bar i{will-change:width}@media (prefers-reduced-motion:reduce){.qz *{animation:none!important;transition:none!important}}
@media (prefers-color-scheme:dark){.qz .big{color:#7fd6cc}.lvls b{color:#7fd6cc}}`;
const page = ({ lang, kind, lv, title, desc, crumbs, body, jsonld = [], og, script = '', data = null }) => {
  const p = toolPath(lang, kind, lv), alts = altsOf(l => toolPath(l, kind, lv));
  const t = S[lang], s = toolStrings(lang), dir = RTL.has(lang) ? ' dir="rtl"' : '';
  const nav = [[`/${lang}/blog/`, 'Blog', ''], [toolPath(lang, 'test'), esc(s.nav.levelTest), kind === 'test' ? ' aria-current="page"' : ''], [toolPath(lang, 'toeic'), esc(s.nav.toeic), kind === 'toeic' ? ' aria-current="page"' : '']];
  const head = `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><meta name="theme-color" content="#0F3D3E"><link rel="canonical" href="${url(p)}">${alts.map(([l, u]) => `<link rel="alternate" hreflang="${l}" href="${url(u)}">`).join('')}<meta property="og:type" content="website"><meta property="og:site_name" content="Lexkite"><meta property="og:locale" content="${lang}"><meta property="og:url" content="${url(p)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${SITE}${og}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(title)}"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/icons/icon.svg?v=2" type="image/svg+xml"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png?v=2">${[...jsonld, crumbsLd(crumbs)].map(ld).join('')}`;
  urls.push([p, lastmod, alts]);
  return `<!doctype html><html lang="${lang}"${dir}><head>${head}<style>${CSS}\n${SEO_CSS}\n${TOOL_CSS}</style></head><body><a class="skip" href="#nd">${esc(t.skip)}</a>
${siteHeader({ nav, open: [appHref(lang), esc(t.open)], home: landingHref(lang), lang, langHref: l => alts.find(a => a[0] === l)[1] })}
<main id="nd" class="tool">
${crumbsHtml(crumbs)}
${body}
</main>
${siteFooter({ lang, text: `Lexkite – ${esc(s.nav.tools)}`, langHref: l => alts.find(a => a[0] === l)[1] })}
${data ? `<script type="application/json" id="tool-data">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>` : ''}<script>${UI_JS}</script>${script ? `<script src="${script}" defer></script>` : ''}</body></html>`;
};
const crumbsLd = items => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, u], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + u })) });
const ORG = { '@type': 'Organization', name: 'Lexkite', url: SITE + '/' };
const app = (lang, route) => `${appHref(lang)}#/${route}`;
const steps = (lang, lv) => { const s = toolStrings(lang); return `<ol class="steps">${PLAN[lv].map(k => `<li><a href="${app(lang, k)}" data-hit="tool_plan_${k}"><b>${esc(s.steps[k][0])} →</b><small>${esc(s.steps[k][1])}</small></a></li>`).join('')}</ol>`; };
const examTable = (lang, lv) => `<table class="ex"><tbody><tr><th scope="row">IELTS</th><td>${EXAMS[lv][0]}</td></tr><tr><th scope="row">TOEIC Listening &amp; Reading</th><td>${EXAMS[lv][1]}</td></tr></tbody></table>`;
const levelList = (lang, cur) => { const s = toolStrings(lang); return `<ul class="lvls">${LV.map(l => `<li><a href="${toolPath(lang, 'test', l)}"${l === cur ? ' aria-current="page"' : ''}><b>${l}</b>${esc(s.levels[l].name)}</a></li>`).join('')}</ul>`; };
let lastmod = today;

// ---------- Sinh ----------
export function build() {
  const missing = LANGS.filter(l => !toolStrings(l));
  if (missing.length) throw new Error('build-tools: thiếu content/tools/i18n/' + missing.join(', ') + '.json');
  const bank = publishBank(J('content/tools/cefr-bank.json').items), t5 = loadToeic5();
  fs.mkdirSync(path.join(D, 'data/tools'), { recursive: true });
  fs.writeFileSync(path.join(D, 'data/tools/cefr-bank.json'), JSON.stringify({ v: 1, items: bank }));
  const lmTest = gitDate('content/tools', 'scripts/build-tools.mjs', 'web/js/tools'), lmToeic = gitDate('web/js/toeic', 'web/i18n/explain', 'content/tools/i18n', 'scripts/build-tools.mjs');
  let n = 0;
  for (const lang of LANGS) {
    const t = S[lang], s = toolStrings(lang), T = s.test, home = [t.home, landingHref(lang)], pT = toolPath(lang, 'test');
    const ui = { ...T, levels: Object.fromEntries(LV.map(l => [l, s.levels[l].name])), steps: s.steps, plan: PLAN, exams: EXAMS, app: appHref(lang), lvUrl: Object.fromEntries(LV.map(l => [l, toolPath(lang, 'test', l)])), bank: '/data/tools/cefr-bank.json' };
    // Trang bài test
    lastmod = lmTest;
    write(pT, page({ lang, kind: 'test', title: T.title, desc: T.desc, og: '/img/tools/og-cefr.png', crumbs: [home, [s.nav.levelTest, pT]], script: '/js/tools/level-test.js', data: ui,
      jsonld: [
        { '@context': 'https://schema.org', '@type': 'WebApplication', name: T.h1, url: url(pT), applicationCategory: 'EducationalApplication', operatingSystem: 'Any', browserRequirements: 'Requires JavaScript', inLanguage: lang, isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, provider: ORG },
        { '@context': 'https://schema.org', '@type': 'Quiz', name: T.h1, description: T.desc, url: url(pT), inLanguage: 'en', isAccessibleForFree: true, timeRequired: 'PT15M', educationalLevel: 'A1–C2', about: { '@type': 'Thing', name: 'English language proficiency' }, educationalAlignment: { '@type': 'AlignmentObject', alignmentType: 'assesses', educationalFramework: 'Common European Framework of Reference for Languages (CEFR)', targetName: 'A1–C2' }, provider: ORG },
      ],
      body: `<h1>${esc(T.h1)}</h1><p class="lead">${esc(T.lead)}</p><ul class="facts">${T.facts.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
<section class="qz" id="qz" aria-live="polite"><noscript><p>${esc(T.noJs)}</p></noscript><p><button type="button" class="btn" id="qz-start" disabled>${esc(T.start)} →</button></p><p class="hint">${esc(T.privacy)}</p></section>
<section><h2>${esc(T.howH)}</h2>${T.how.map(x => `<p>${esc(x)}</p>`).join('')}</section>
<section><h2>${esc(T.levelsH)}</h2><p>${esc(T.levelsLead)}</p>${levelList(lang)}</section>
<section><h2>${esc(T.honestH)}</h2><p>${esc(T.honest)}</p><p><a href="${toolPath(lang, 'toeic')}">${esc(T.otherTool)}</a></p></section>` }));
    n++;
    // 6 trang cấp độ (đích chia sẻ kết quả; og:image theo cấp)
    for (const [i, lv] of LV.entries()) {
      const L = s.levels[lv], P = s.level, nx = LV[i + 1], p = toolPath(lang, 'test', lv), o = { lv, name: L.name, next: nx || '' };
      write(p, page({ lang, kind: 'test', lv, title: fill(P.title, o), desc: fill(nx ? P.desc : P.descTop, o), og: `/img/tools/og-cefr-${lv.toLowerCase()}.png`, crumbs: [home, [s.nav.levelTest, pT], [lv, p]],
        jsonld: [{ '@context': 'https://schema.org', '@type': 'WebPage', name: fill(P.title, o), url: url(p), inLanguage: lang, about: { '@type': 'DefinedTerm', name: `CEFR ${lv}`, alternateName: L.name, description: L.desc, inDefinedTermSet: { '@type': 'DefinedTermSet', name: 'Common European Framework of Reference for Languages (CEFR)' } }, publisher: ORG }],
        body: `<h1>${esc(fill(P.h1, o))}</h1><p class="lead">${esc(L.desc)}</p><p id="you" hidden data-t="${esc(P.you)}"></p>
<section><h2>${esc(fill(P.canH, o))}</h2><ul>${L.can.map(c => `<li>${esc(c)}</li>`).join('')}</ul></section>
<section><h2>${esc(T.examsH)}</h2>${examTable(lang, lv)}<p class="hint"><small>${esc(T.examsNote)}</small></p></section>
<section><h2>${esc(nx ? fill(P.planH, o) : P.planTop)}</h2>${steps(lang, lv)}</section>
<p><a class="btn" href="${pT}">${esc(P.takeTest)} →</a></p>
<section><h2>${esc(P.otherLevels)}</h2>${levelList(lang, lv)}</section>`, script: '/js/tools/level-test.js' }));
      n++;
    }
    // Quiz TOEIC Part 5
    lastmod = lmToeic;
    const X = s.toeic, items = toeicFor(lang, t5), pQ = toolPath(lang, 'toeic'), N = items.length;
    fs.writeFileSync(path.join(D, `data/tools/toeic5-${lang}.json`), JSON.stringify({ v: 1, items }));
    const sample = items.filter((_, k) => k % 70 === 0).slice(0, 3);
    write(pQ, page({ lang, kind: 'toeic', title: X.title, desc: fill(X.desc, { n: N }), og: '/img/tools/og-toeic5.png', crumbs: [home, [s.nav.toeic, pQ]], script: '/js/tools/toeic5.js',
      data: { ...X, loadErr: T.loadErr, desc: undefined, facts: undefined, tips: undefined, data: `/data/tools/toeic5-${lang}.json`, app: app(lang, 'toeic') },
      jsonld: [
        { '@context': 'https://schema.org', '@type': 'Quiz', name: X.h1, description: fill(X.desc, { n: N }), url: url(pQ), inLanguage: 'en', isAccessibleForFree: true, educationalLevel: 'B1–C1', about: { '@type': 'Thing', name: 'TOEIC Reading Part 5 – Incomplete Sentences' }, provider: ORG,
          hasPart: sample.map(q => ({ '@type': 'Question', eduQuestionType: 'Multiple choice', text: q.q, encodingFormat: 'text/plain', acceptedAnswer: { '@type': 'Answer', text: q.o[q.a], answerExplanation: { '@type': 'Comment', text: q.x } }, suggestedAnswer: q.o.filter((_, k) => k !== q.a).map(x => ({ '@type': 'Answer', text: x })) })) },
        { '@context': 'https://schema.org', '@type': 'WebApplication', name: X.h1, url: url(pQ), applicationCategory: 'EducationalApplication', operatingSystem: 'Any', browserRequirements: 'Requires JavaScript', inLanguage: lang, isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, provider: ORG },
      ],
      body: `<h1>${esc(X.h1)}</h1><p class="lead">${esc(X.lead)}</p><ul class="facts">${X.facts.map(f => `<li>${esc(fill(f, { n: N }))}</li>`).join('')}</ul>
<section class="qz" id="qz" aria-live="polite"><noscript><p>${esc(T.noJs)}</p></noscript><p><button type="button" class="btn" id="qz-start" disabled>${esc(X.start)} →</button></p><p class="hint">${esc(T.privacy)}</p></section>
<section><h2>${esc(X.tipsH)}</h2><ul>${X.tips.map(x => `<li>${x}</li>`).join('')}</ul></section>
<section><h2>${esc(X.aboutH)}</h2>${sample.map((q, k) => `<div class="sample"><p lang="en" dir="ltr"><b>${k + 1}.</b> ${esc(q.q)}</p><ol type="A" lang="en" dir="ltr">${q.o.map(x => `<li>${esc(x)}</li>`).join('')}</ol><details><summary>${esc(X.explain)}</summary><p><b lang="en" dir="ltr">${'ABCD'[q.a]}. ${esc(q.o[q.a])}</b> – ${esc(q.x)}</p></details></div>`).join('')}<p>${esc(X.about)}</p></section>
<section><h2>${esc(X.fullH)}</h2><p>${esc(X.full)}</p><p><a class="btn" href="${app(lang, 'toeic')}" data-hit="tool_toeic_app">${esc(X.openApp)} →</a></p><p><a href="${pT}">${esc(X.otherTool)}</a></p></section>` }));
    n++;
  }
  // Sitemap riêng (đo index theo loại trong GSC) – build-sitemap-index.mjs tự gom mọi dist/sitemap-*.xml
  fs.writeFileSync(path.join(D, 'sitemap-tools.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.map(([p, lm, alts]) => `<url><loc>${url(p)}</loc><lastmod>${lm}</lastmod>${alts.map(([l, u]) => `<xhtml:link rel="alternate" hreflang="${l}" href="${url(u)}"/>`).join('')}</url>`).join('\n')}\n</urlset>\n`);
  console.log(`✓ Công cụ: ${n} trang (${LANGS.length} ngôn ngữ × 8), ${bank.length} câu CEFR, ${t5.length} câu TOEIC Part 5 → sitemap-tools.xml`);
  return { n, urls };
}
if (/build-tools\.mjs$/.test(process.argv[1] || '')) build();
