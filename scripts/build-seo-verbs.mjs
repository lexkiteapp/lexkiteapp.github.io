#!/usr/bin/env node
// Trang SEO "Động từ bất quy tắc" /<lang>/irregular-verbs/ (15 ngôn ngữ) – cùng khung/CSS với trang từ (site-layout), dữ liệu MỘT nguồn web/cpack/irv/*.
// Ghi: dist/<lang>/irregular-verbs/index.html + dist/sitemap-irregular-verbs.xml. Chạy trong build-web.sh trước build-sitemap-index. Tắt: SEO_PAGES=0.
import fs from 'node:fs'; import path from 'node:path';
import { CSS, SEO_CSS, UI_JS, esc, themePage, ld, siteHeader, siteFooter, crumbsHtml, landingHref, appHref } from './lib/site-layout.mjs';
import { LANGS, S } from './lib/seo-pages-i18n.mjs';
if (process.env.SEO_PAGES === '0') process.exit(0);
const SITE = 'https://lexkite.com', D = process.env.SEO_DIST || 'dist', J = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const core = J('web/cpack/irv/core.json').rows, T = J('content/verbs/seo.json');
const P = l => `/${l}/irregular-verbs/`, today = new Date().toISOString().slice(0, 10);
const alts = LANGS.map(l => [l, P(l)]), hl = [...alts, ['x-default', P('en')]].map(([l, p]) => `<link rel="alternate" hreflang="${l}" href="${SITE + p}">`).join('');
globalThis.self = globalThis; await import(path.resolve('web/js/verbs-core.js'));
const forms = new Map(self.LK_VERBS.irregularList().map(v => [v.base, v]));
const css2 = '.irv{width:100%;border-collapse:collapse;font-size:.98rem}.irv th{text-align:start;padding:.5rem .4rem;border-bottom:2px solid var(--line,#ddd)}.irv td{padding:.5rem .4rem;border-bottom:1px solid var(--line,#eee);vertical-align:top}.irv small{display:block;opacity:.8;font-family:var(--ipa,inherit)}.irv-w{overflow-x:auto}.irv q{quotes:none}';
for (const l of LANGS) {
  const t = T[l], s = S[l], rtl = l === 'ar', d = l === 'en' ? null : J(`web/cpack/irv/${l}.json`).rows;
  const row = r => { const [b, cefr, , , ipa, p] = r, v = forms.get(b), g = d ? d[b][0] : r[7], tr = d ? d[b][1] : '';
    const cell = list => list.map(x => `<span lang="en" translate="no">${esc(x.w)}</span>${x.tag ? ` <small style="display:inline">${x.tag}</small>` : ''}<small translate="no">${esc((ipa[x.w] || [])[1] || '')}</small>`).join(' ');
    return `<tr><td><b lang="en" translate="no">${esc(b)}</b><small translate="no">${esc((r[9] || ipa[b] || [])[1] || '')}</small></td><td>${cell(v.past)}</td><td>${cell(v.pp)}</td><td>${esc(g)} <small>${cefr}</small><span lang="en">${esc(p)}</span>${tr ? `<small style="font-family:inherit">${esc(tr)}</small>` : ''}</td></tr>`; };
  const nav = [[`/${l}/blog/`, 'Blog', ''], [`/${l}/words/`, esc(s.words), '']];
  const title = `${t.h1} (${core.length}) – Lexkite`, desc = t.d.replace('{n}', core.length), app = appHref(l).replace(/#.*$/, '') + '#/irregular';
  const crumbs = [[landingHref(l), 'Lexkite'], [P(l), t.h1]];
  const jsonld = [{ '@context': 'https://schema.org', '@type': 'LearningResource', name: t.h1, description: desc, inLanguage: l, url: SITE + P(l), isAccessibleForFree: true, educationalLevel: 'A1-C2', teaches: 'English irregular verbs' }];
  const head = `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><meta name="theme-color" content="#0F3D3E"><link rel="canonical" href="${SITE + P(l)}">${hl}${jsonld.map(ld).join('')}`;
  const html = `<!doctype html><html lang="${l}"${rtl ? ' dir="rtl"' : ''}><head>${head}<style>${CSS}\n${SEO_CSS}\n${css2}</style></head><body><a class="skip" href="#nd">${esc(s.skip)}</a>
${siteHeader({ nav, open: [appHref(l), esc(s.open)], home: landingHref(l), lang: l, langHref: x => P(x) })}
<main id="nd">${crumbsHtml(crumbs)}<h1>${esc(t.h1)}</h1><p>${esc(desc)}</p><p><a class="btn primary" href="${esc(app)}">${esc(t.cta)}</a></p>
<div class="irv-w"><table class="irv"><thead><tr><th>V1</th><th>V2</th><th>V3</th><th>${esc(t.mean)}</th></tr></thead><tbody>${core.map(row).join('')}</tbody></table></div></main>
${siteFooter({ lang: l, text: `Lexkite – ${esc(t.h1)}`, langHref: x => P(x) })}<script>${UI_JS}</script></body></html>`;
  fs.mkdirSync(`${D}${P(l)}`, { recursive: true }); fs.writeFileSync(`${D}${P(l)}index.html`, themePage(html));
}
fs.writeFileSync(`${D}/sitemap-irregular-verbs.xml`, `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${LANGS.map(l => `<url><loc>${SITE + P(l)}</loc><lastmod>${today}</lastmod>${alts.map(([a, p]) => `<xhtml:link rel="alternate" hreflang="${a}" href="${SITE + p}"/>`).join('')}</url>`).join('')}</urlset>`);
console.log(`✓ SEO động từ bất quy tắc: ${LANGS.length} trang, ${core.length} động từ`);
