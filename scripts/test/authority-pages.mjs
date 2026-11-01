#!/usr/bin/env node
// Cổng uy tín / E-E-A-T (docs/SEO-AUTHORITY.md) – chạy trong npm test, không mạng:
//  1) chuỗi 15 ngôn ngữ: cùng cấu trúc với en, giữ {biến}, không lẫn chữ Việt ngoài vi, không sót chuỗi tiếng Anh; chặn lời bịa (bằng cấp, chức danh, năm kinh nghiệm, đánh giá sao)
//  2) sameAs chỉ kênh THẬT: repo GitHub, add-on Chrome (ext-config.js) hoặc hồ sơ status=live trong content/pr/placements.json
//  3) bộ dữ liệu: không dữ liệu người dùng, CSV đúng số dòng/cột, mọi nhóm có lỗi điển hình, số liệu trang khớp dữ liệu
//  4) trang dựng: 105 trang, canonical = chính nó, hreflang 15 + x-default hai chiều, tiêu đề duy nhất, JSON-LD đủ thuộc tính bắt buộc của Google
//     (Organization, AboutPage, ProfilePage, Dataset, BreadcrumbList), widget nhúng không request ngoài/không cookie, sitemap đủ URL
//  5) hook dùng chung: chân trang trỏ trang Giới thiệu mới, blog ghi tác giả "Lexkite Editorial Team" + link hồ sơ, trang chủ dùng orgNode()
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const errs = [], ok = (c, m) => { if (!c) errs.push(m); };
const J = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const VI = /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
const { AUTH_LANGS, AUTH_SLUGS, authPath, sameAs, orgNode, editorialNode, blogByline, authFoot } = await import('../lib/authority-links.mjs');

// 1) Chuỗi
const en = J('content/authority/i18n/en.json');
const shape = o => Array.isArray(o) ? o.map(shape) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, shape(v)])) : typeof o;
const leaves = (o, p = '') => Array.isArray(o) || (o && typeof o === 'object') ? Object.entries(o).flatMap(([k, v]) => leaves(v, p ? `${p}.${k}` : k)) : [[p, o]];
const KEEP = /^(Blog|Lexkite|CSV|JSON|CC BY 4\.0)$/; // tên riêng giữ nguyên
const FAKE = /\b(PhD|Ph\.D|MA TESOL|CELTA|DELTA|\bprofessor\b|Dr\.|certified teacher|\d+\+? years of experience|★|4\.\d\/5|rated \d)/i;
for (const lang of AUTH_LANGS) {
  const f = `content/authority/i18n/${lang}.json`;
  if (!fs.existsSync(f)) { errs.push(`i18n: thiếu ${f}`); continue; }
  const s = J(f);
  ok(JSON.stringify(shape(s)) === JSON.stringify(shape(en)), `i18n ${lang}: cấu trúc khác en.json`);
  const E = Object.fromEntries(leaves(en));
  for (const [k, v] of leaves(s)) {
    if (typeof v !== 'string') continue;
    ok(v.trim().length > 0, `i18n ${lang}.${k}: rỗng`);
    const vars = x => (String(x).match(/\{\w+\}/g) || []).sort().join();
    ok(vars(v) === vars(E[k]), `i18n ${lang}.${k}: {biến} khác en`);
    ok(!FAKE.test(v), `i18n ${lang}.${k}: có lời có thể bịa (bằng cấp/chức danh/đánh giá) – trung thực tuyệt đối`);
    if (lang !== 'vi') ok(!VI.test(v), `i18n ${lang}.${k}: lẫn chữ Việt`);
    if (lang !== 'en' && E[k] && E[k].length > 24 && !KEEP.test(E[k])) ok(v !== E[k], `i18n ${lang}.${k}: chưa dịch (giống hệt en)`);
  }
  ok(/support@lexkite\.com/.test(JSON.stringify(s.corrections)), `i18n ${lang}: chính sách sửa lỗi thiếu email liên hệ`);
  ok(s.policy.steps.length === 6, `i18n ${lang}: quy trình phải đúng 6 bước (docs/BLOG-RUNBOOK.md)`);
}

// 2) sameAs = kênh thật
const pl = J('content/pr/placements.json'), live = (pl.placements || pl.items || Object.values(pl).find(Array.isArray)).filter(x => x.status === 'live').map(x => x.url || x.link).filter(Boolean);
const store = (fs.readFileSync('web/js/ext-config.js', 'utf8').match(/store: '([^']+)'/) || [])[1];
const origin = u => { try { return new URL(u).origin; } catch { return ''; } };
for (const u of sameAs()) ok(u === store || u === 'https://github.com/lexkiteapp' || live.some(l => l === u || origin(l) === origin(u) && new URL(u).pathname.replace(/\/$/, '') === new URL(l).pathname.replace(/\/$/, '').slice(0, new URL(u).pathname.replace(/\/$/, '').length)), `sameAs: ${u} không phải kênh thật đang live (placements.json/ext-config/repo)`);
ok(sameAs().length >= 3 && new Set(sameAs()).size === sameAs().length, 'sameAs: < 3 kênh hoặc trùng');
const org = orgNode();
ok(org['@id'] === 'https://lexkite.com/#org' && org.logo && org.url && org.publishingPrinciples && org.correctionsPolicy, 'orgNode: thiếu @id/logo/url/publishingPrinciples/correctionsPolicy');
ok(!/Educational/.test(org['@type']), 'orgNode: Lexkite là app, không khai EducationalOrganization');

// 3) + 4) Dựng vào thư mục tạm
const D = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-'));
const out = execFileSync('node', ['scripts/build-authority.mjs'], { env: { ...process.env, AUTHORITY_DIST: D }, encoding: 'utf8' });
const { loadPairs, stats } = await import('../build-authority.mjs');
const pairs = loadPairs(), st = stats(pairs);
ok(pairs.length >= 60, `dataset: chỉ ${pairs.length} nhóm`);
ok(pairs.every(p => p.mistakes.length && p.words.length >= 2 && p.words.every(w => w.w && w.def)), `dataset: nhóm thiếu từ/định nghĩa/lỗi điển hình: ${pairs.filter(p => !p.mistakes.length || p.words.some(w => !w.def)).map(p => p.id).join(', ')}`);
// Mô tả công khai (trang, Zenodo, Figshare, HF, Kaggle) ghi "each group has a memory tip" → mọi nhóm phải có mẹo (dòng # trong web/js/usage/pair.js)
ok(pairs.every(p => p.tip.length >= 20), `dataset: nhóm thiếu memory_tip (thêm dòng # vi | en vào web/js/usage/pair.js): ${pairs.filter(p => p.tip.length < 20).map(p => p.id).join(', ')}`);
// mistake_note: chỉ được trống ở nhóm không có lỗi điển hình rõ ràng (đã xét tay); nhóm mới phải có dòng ! … => … | vi | en
const NO_NOTE = new Set(['emigrate-immigrate', 'convince-persuade']);
ok(pairs.every(p => (p.mistakes[0] || {}).note || NO_NOTE.has(p.id)), `dataset: nhóm thiếu mistake_note: ${pairs.filter(p => !(p.mistakes[0] || {}).note && !NO_NOTE.has(p.id)).map(p => p.id).join(', ')}`);
ok(pairs.every(p => !VI.test(JSON.stringify({ ...p, words: p.words.map(w => [w.w, w.pos, w.def, w.ex]) }))), 'dataset: lẫn chữ Việt trong bản tiếng Anh tải về');
const csv = fs.readFileSync(path.join(D, 'research/confused-words.csv'), 'utf8').trim().split('\n');
ok(csv.length === pairs.length + 1 && csv[0].split(',').length === 12, `csv: ${csv.length - 1} dòng / ${csv[0].split(',').length} cột`);
const dj = J(path.join(D, 'research/confused-words.json'));
ok(dj.license === 'CC BY 4.0' && dj.groups.length === pairs.length, 'json: thiếu giấy phép hoặc lệch số nhóm');
ok(!/@[a-z0-9-]+\.[a-z]{2,}|uid|user_?id|email/i.test(JSON.stringify(dj.groups)), 'dataset: có dấu hiệu dữ liệu người dùng (email/uid)');
const pages = AUTH_LANGS.flatMap(l => Object.keys(AUTH_SLUGS).map(k => [l, k, authPath(l, k)]));
ok(pages.length === 105, `trang: ${pages.length} (cần 105)`);
const titles = new Set(), ldTypes = {};
const need = { Organization: ['name', 'url', 'logo', 'sameAs'], Dataset: ['name', 'description', 'license', 'creator', 'distribution', 'url'], BreadcrumbList: ['itemListElement'], ProfilePage: ['mainEntity'], AboutPage: ['mainEntity'] };
for (const [lang, kind, p] of pages) {
  const f = path.join(D, p, 'index.html'); if (!fs.existsSync(f)) { errs.push(`trang thiếu: ${p}`); continue; }
  const h = fs.readFileSync(f, 'utf8');
  ok(h.includes(`<link rel="canonical" href="https://lexkite.com${p}">`), `${p}: canonical sai`);
  ok(new RegExp(`<html lang="${lang}"`).test(h), `${p}: lang sai`);
  for (const l of AUTH_LANGS) ok(h.includes(`hreflang="${l}" href="https://lexkite.com${authPath(l, kind)}"`), `${p}: thiếu hreflang ${l}`);
  ok(h.includes(`hreflang="x-default" href="https://lexkite.com${authPath('en', kind)}"`), `${p}: thiếu x-default`);
  const t = (h.match(/<title>([^<]+)/) || [])[1]; ok(t && !titles.has(t), `${p}: tiêu đề trùng/thiếu`); titles.add(t);
  const d = (h.match(/name="description" content="([^"]+)/) || [])[1] || ''; ok(d.length >= 50 && d.length <= 200, `${p}: mô tả ${d.length} ký tự`);
  ok((h.match(/<h1>/g) || []).length === 1, `${p}: cần đúng 1 h1`);
  for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let o; try { o = JSON.parse(m[1]); } catch { errs.push(`${p}: JSON-LD hỏng`); continue; }
    const t2 = o['@type']; ldTypes[t2] = (ldTypes[t2] || 0) + 1;
    for (const k of need[t2] || []) ok(o[k] !== undefined && o[k] !== '', `${p}: ${t2} thiếu ${k}`);
    if (t2 === 'BreadcrumbList') ok(o.itemListElement.every((x, i) => x.position === i + 1 && /^https:\/\/lexkite\.com\//.test(x.item)), `${p}: breadcrumb sai`);
    if (o.datePublished && o.dateModified) ok(o.dateModified >= o.datePublished && /^\d{4}-\d\d-\d\d$/.test(o.dateModified), `${p}: dateModified sai`);
    if (t2 === 'ProfilePage') ok(o.mainEntity.name === 'Lexkite Editorial Team' && o.mainEntity.parentOrganization, `${p}: ProfilePage phải là đội biên tập (không người bịa)`);
    if (t2 === 'Dataset') ok(o.license === 'https://creativecommons.org/licenses/by/4.0/' && o.distribution.some(x => x.encodingFormat === 'text/csv'), `${p}: Dataset thiếu CC BY/CSV`);
  }
  if (kind === 'research') ok(h.includes(`>${st.n}<`) || h.includes(String(st.n)), `${p}: thiếu số nhóm`), ok((h.match(/<figure class="chart">/g) || []).length === 2, `${p}: cần 2 biểu đồ`), ok(h.includes('/research/confused-words.csv'), `${p}: thiếu link CSV`);
  ok(!/<script[^>]+src="https?:\/\//.test(h), `${p}: script ngoài`);
}
for (const t of ['AboutPage', 'Organization', 'ProfilePage', 'Dataset', 'BreadcrumbList']) ok(ldTypes[t] >= 15, `JSON-LD: ${t} chỉ ${ldTypes[t] || 0} trang`);
const emb = fs.readFileSync(path.join(D, 'embed/pair/index.html'), 'utf8');
ok(/noindex/.test(emb) && !/cookie|localStorage|sessionStorage|fetch\(|XMLHttpRequest|sendBeacon|<img|<link rel="stylesheet"|src="http/i.test(emb), 'embed: phải noindex, không cookie/storage/request ngoài');
ok(emb.length < 30000, `embed: ${emb.length} B (> 30 KB)`);
for (const lv of ['a1', 'a2', 'b1', 'b2', 'c1', 'c2']) ok(fs.existsSync(path.join(D, `embed/cefr-${lv}.svg`)) && /<title>/.test(fs.readFileSync(path.join(D, `embed/cefr-${lv}.svg`), 'utf8')), `embed: thiếu huy hiệu ${lv}`);
const sm = fs.readFileSync(path.join(D, 'sitemap-authority.xml'), 'utf8');
ok((sm.match(/<url>/g) || []).length === 105, 'sitemap-authority: cần 105 URL');
ok(!/\/embed\/pair/.test(sm), 'sitemap-authority: không đưa iframe vào sitemap');
fs.rmSync(D, { recursive: true, force: true });
const hd = fs.readFileSync('web/_headers', 'utf8'), eb = hd.slice(hd.indexOf('/embed/*'));
ok(/\/embed\/\*\n\s+! X-Frame-Options/.test(hd) && /frame-ancestors \*/.test(eb.split('\n\n')[0]), '_headers: /embed/* phải gỡ X-Frame-Options + frame-ancestors *');

// 5) Hook dùng chung
const { siteFooter } = await import('../lib/site-layout.mjs');
for (const l of AUTH_LANGS) { const f = siteFooter({ lang: l }); ok(f.includes(`href="${authPath(l, 'hub')}"`) && f.includes(`href="${authPath(l, 'policy')}"`), `chân trang ${l}: thiếu link Giới thiệu/chính sách biên tập`); }
ok(authFoot('xx').length === 0, 'authFoot: ngôn ngữ lạ phải rỗng');
ok(editorialNode('ja').url === 'https://lexkite.com/ja/about/editorial-team/', 'editorialNode: url hồ sơ sai');
ok(/rel="author"/.test(blogByline('en', '2026-10-15', () => 'x')) && blogByline('xx', '', () => '') === '', 'blogByline sai');
const bb = fs.readFileSync('scripts/build-blog.mjs', 'utf8');
ok(/author: editorialNode\(p\.lang\)/.test(bb) && /blogByline\(p\.lang/.test(bb) && /content="Lexkite Editorial Team"/.test(bb), 'build-blog: chưa ghi tác giả Lexkite Editorial Team');
ok(/orgNode\(\)/.test(fs.readFileSync('scripts/build-landing.mjs', 'utf8')), 'build-landing: chưa dùng orgNode()');
ok(/build-authority\.mjs && node scripts\/build-sitemap-index/.test(fs.readFileSync('scripts/build-web.sh', 'utf8')), 'build-web.sh: chưa chạy build-authority trước sitemap index');

if (errs.length) { console.error(errs.slice(0, 40).map(e => '✗ ' + e).join('\n') + (errs.length > 40 ? `\n… +${errs.length - 40}` : '')); console.error(`✗ authority-pages: ${errs.length} lỗi`); process.exit(1); }
console.log(out.trim()); console.log(`✓ authority-pages: 15 ngôn ngữ, sameAs ${sameAs().length} kênh thật, ${st.n} nhóm dữ liệu, JSON-LD hợp lệ, widget không theo dõi`);
