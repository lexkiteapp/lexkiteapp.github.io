// 📖 Cổng trang từ điển (docs/SEO-DICT-PAGES.md §7) – chạy trong npm test và CI dict-pages.yml. Dựng trong bộ nhớ (≈ 0,5 s), không mạng.
// (1) Mặc định DICT_INDEX rỗng: MỌI trang noindex, không hreflang, không sitemap. (2) Chế độ mở 'all': chỉ ứng viên đạt ngưỡng index được,
// hreflang hai chiều + x-default, sitemap = đúng tập index được. (3) Từng trang: canonical tuyệt đối = chính nó, tiêu đề/mô tả duy nhất,
// h1, JSON-LD hợp lệ (DefinedTerm, FAQPage khớp chữ hiển thị, BreadcrumbList), liên kết nội bộ tồn tại, bài blog đã đăng, audio có thật,
// quiz đúng 1 đáp án, trang en không lọt chữ Việt, ≤ 16 KB gzip. (4) Worker: trang đuôi dài từ R2 giả, 301 chuẩn hoá, 404, noindex header.
import fs from 'node:fs'; import zlib from 'node:zlib';
import { build, QUALITY_MIN, WORDS_MIN } from '../dict/build.mjs';
import { ENABLED, SITE, hubPath } from '../../workers/dict/render.mjs';
import worker, { parse } from '../../workers/dict/index.mjs';

let n = 0, fails = 0; const ok = (c, m) => { n++; if (!c) { fails++; if (fails < 400) console.log('✗', m); } };
const N = 200, VI = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
const ldOf = h => [...h.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(m => JSON.parse(m[1]));
const text = h => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ');
const pathOf = f => f.replace(/^assets/, '').replace(/index\.html$/, '');

for (const mode of ['', 'all']) {
  const { files, pages, report } = build({ n: N, index: mode, write: false });
  const html = Object.entries(files).filter(([f]) => f.startsWith('assets/') && f.endsWith('.html'));
  const known = new Set(html.map(([f]) => pathOf(f)));
  for (const l of ENABLED) ok(pages[l].length === N, `${mode || 'mặc định'} ${l}: ${pages[l].length}/${N} trang`);
  const titles = new Set(), descs = new Set();
  for (const [f, h] of html) {
    const p = pathOf(f), lang = (h.match(/<html lang="(\w+)"/) || [])[1], noidx = /<meta name="robots" content="noindex/.test(h);
    const canon = (h.match(/<link rel="canonical" href="([^"]+)">/) || [])[1];
    ok(canon === SITE + p, `${p}: canonical ${canon}`);
    const t = (h.match(/<title>([^<]+)<\/title>/) || [])[1], d = (h.match(/<meta name="description" content="([^"]+)"/) || [])[1];
    ok(t && !titles.has(t), `${p}: tiêu đề trống/trùng`); titles.add(t); ok(d && d.length <= 160 && !descs.has(d), `${p}: mô tả trống/trùng/dài`); descs.add(d);
    ok(/<h1>/.test(h), `${p}: thiếu h1`);
    if (!mode) { ok(noidx, `${p}: mặc định phải noindex`); ok(!/hreflang=/.test(h.replace(/<(header|footer)[\s\S]*?<\/\1>/g, '')), `${p}: noindex không được có hreflang`); }
    const lds = ldOf(h), types = lds.map(x => x['@type']);
    ok(types.includes('BreadcrumbList'), `${p}: thiếu BreadcrumbList`);
    for (const x of lds) ok(x['@context'] === 'https://schema.org', `${p}: @context`);
    const isWord = p !== hubPath(lang);
    if (isWord) {
      const dt = lds.find(x => x['@type'] === 'DefinedTerm'), fq = lds.find(x => x['@type'] === 'FAQPage'), vis = text(h);
      ok(dt && dt.name && dt.description && dt.url === SITE + p && dt.inDefinedTermSet && dt.inDefinedTermSet.url === SITE + hubPath(lang), `${p}: DefinedTerm thiếu trường`);
      ok(fq && fq.mainEntity.length >= 2 && fq.mainEntity.every(q => q['@type'] === 'Question' && q.acceptedAnswer && q.acceptedAnswer.text && vis.includes(q.name) && vis.includes(q.acceptedAnswer.text)), `${p}: FAQPage không khớp chữ hiển thị`);
      ok(zlib.gzipSync(h).length <= 16 * 1024, `${p}: ${zlib.gzipSync(h).length} B gzip > 16 KB`);
      if (lang === 'en') ok(!VI.test(text(h.slice(h.indexOf('<main'), h.indexOf('</main>')))), `${p}: lọt chữ Việt vào trang en`);
    }
    for (const m of h.matchAll(/href="(\/(?:vi\/tu-dien|en\/dictionary)\/[^"]*)"/g)) ok(known.has(m[1]), `${p}: link hỏng ${m[1]}`);
    for (const m of h.slice(h.indexOf("<main"), h.indexOf("</main>")).matchAll(/href="\/(\w+)\/blog\/([^"/]+)\/"/g)) ok(fs.readdirSync(`content/blog/${m[1]}`).some(x => fs.readFileSync(`content/blog/${m[1]}/${x}`, 'utf8').includes(`\nslug: ${m[2]}\n`)), `${p}: bài blog không có ${m[2]}`);
  }
  for (const l of ENABLED) for (const d of pages[l]) {
    ok(d.audio && d.ipa && d.examples.length && d.meaning, `${l}/${d.slug}: thiếu audio/IPA/ví dụ/nghĩa`);
    for (const q of d.quiz) ok(q.o.length >= 2 && q.a >= 0 && new Set(q.o).size === q.o.length, `${l}/${d.slug}: quiz sai (${q.q})`);
    ok(d.quality.index === (d.quality.score >= QUALITY_MIN && d.quality.words >= WORDS_MIN), `${l}/${d.slug}: cờ index lệch ngưỡng`);
  }
  const sm = Object.entries(files).filter(([f]) => /sitemap-dict-/.test(f));
  if (!mode) ok(!sm.length, 'mặc định không được có sitemap'); else {
    const idxPages = html.filter(([, h]) => !/content="noindex/.test(h) && !/\/(tu-dien|dictionary)\/<\/loc>/.test(h)).map(([f]) => SITE + pathOf(f)).filter(u => !ENABLED.some(l => u === SITE + hubPath(l)));
    const locs = new Set(sm.flatMap(([, s]) => [...s.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])));
    ok(locs.size === idxPages.length && idxPages.every(u => locs.has(u)), `sitemap ${locs.size} ≠ trang index được ${idxPages.length}`);
    for (const l of ENABLED) ok(report.langs[l].indexable === report.langs[l].candidates && report.langs[l].candidates > 0, `${l}: mở 'all' phải index đúng tập ứng viên`);
    // hreflang hai chiều
    const hl = new Map(html.map(([f, h]) => [SITE + pathOf(f), [...h.matchAll(/<link rel="alternate" hreflang="([\w-]+)" href="([^"]+)">/g)].map(m => [m[1], m[2]])]));
    for (const [u, alts] of hl) for (const [x, v] of alts) { ok(hl.has(v), `${u}: hreflang ${x} → trang không tồn tại ${v}`); if (x !== 'x-default' && hl.has(v)) ok(hl.get(v).some(([, w]) => w === u), `${u} ↔ ${v}: hreflang không hai chiều`); }
    for (const [u, alts] of hl) if (alts.length) ok(alts.some(([, v]) => v === u) && alts.some(([x]) => x === 'x-default'), `${u}: hreflang thiếu chính nó/x-default`);
  }
  if (!mode) { // Worker: đuôi dài đọc R2 giả từ chính dữ liệu vừa dựng
    const R2 = { get: async k => (files['data/' + k] ? { etag: 'e1', json: async () => JSON.parse(files['data/' + k]) } : null) };
    const env = { DICT: R2, DICT_INDEX: '' }, go = (p, e = env) => worker.fetch(new Request('https://lexkite.com' + p), e, { waitUntil() {} });
    const slug = pages.vi[0].slug;
    let r = await go(`/vi/tu-dien/${slug}/`); const b = await r.text();
    ok(r.status === 200 && /noindex/.test(r.headers.get('x-robots-tag') || '') && b.includes('<h1>'), `worker: trang đuôi dài ${r.status}`);
    ok(b === files[`assets/vi/tu-dien/${slug}/index.html`], 'worker: HTML phải trùng từng byte với tầng tĩnh (cùng render.mjs)');
    r = await go(`/vi/tu-dien/${slug.toUpperCase()}`); ok(r.status === 301 && r.headers.get('location').endsWith(`/vi/tu-dien/${slug}/`), `worker: 301 chuẩn hoá ${r.status}`);
    r = await go('/en/dictionary/zzzz-not-a-word/'); ok(r.status === 404 && r.headers.get('x-robots-tag') === 'noindex', `worker: 404 ${r.status}`);
    r = await go('/vi/tu-dien/a/b/'); ok(r.status === 404, 'worker: đường dẫn lạ phải 404');
    r = await go(`/en/dictionary/${pages.en[0].slug}/`, { DICT: R2, DICT_INDEX: 'all' }); const be = await r.text();
    ok(r.status === 200 && (pages.en[0].quality.index ? !r.headers.get('x-robots-tag') : /noindex/.test(r.headers.get('x-robots-tag'))), 'worker: DICT_INDEX mở → header robots theo cổng chất lượng');
    ok(parse('/vi/tu-dien/make/').slug === 'make' && parse('/vi/tu-dien/%3Cx%3E/') === null, 'worker: parse');
    void be;
  }
}
console.log(fails ? `✗ dict-pages: ${fails}/${n} lỗi` : `✓ dict-pages: ${n} kiểm tra đạt (2 chế độ × ${ENABLED.length} ngôn ngữ × ${N} từ + Worker)`);
process.exit(fails ? 1 : 0);
