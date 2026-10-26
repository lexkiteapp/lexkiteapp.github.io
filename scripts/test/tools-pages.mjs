#!/usr/bin/env node
// Cổng công cụ miễn phí (docs/SEO-TOOLS.md §5) – chạy trong npm test, không mạng:
//  1) ngân hàng CEFR hợp lệ (đủ cấp × kỹ năng, 4 phương án khác nhau, đáp án sau khi xáo vẫn đúng, vị trí A–D phân bố đều)
//  2) engine thích ứng: mô phỏng 1.800 người làm bài → đúng cấp ≥ 72 %, lệch ≤ 1 cấp ≥ 98 %, số câu trung bình trong [MIN, MAX], tái lập theo hạt giống
//  3) chuỗi 15 ngôn ngữ: cùng cấu trúc với en, giữ {biến} và thẻ <i>, không lẫn chữ Việt ngoài vi, không bỏ sót (chuỗi dài giống hệt en)
//  4) trang dựng: 120 trang, canonical = chính nó, hreflang 15 + x-default hai chiều, tiêu đề/mô tả duy nhất, JSON-LD hợp lệ (Quiz, WebApplication,
//     BreadcrumbList), og:image + script tồn tại, deep-link app trỏ route có thật, sitemap-tools đủ URL, liên kết nội bộ (chân trang, blog, trang từ)
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import vm from 'node:vm'; import { execFileSync } from 'node:child_process';
const errs = [], ok = (c, m) => { if (!c) errs.push(m); };
const J = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const VI = /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
const LV = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const { TOOL_LANGS, toolPath, blogToolBox, toolFoot } = await import('../lib/tools-links.mjs');

// 1) Ngân hàng
const raw = J('content/tools/cefr-bank.json').items;
ok(new Set(raw.map(i => i.id)).size === raw.length, 'bank: id trùng');
ok(new Set(raw.map(i => (i.p || '') + i.q)).size === raw.length, 'bank: câu hỏi trùng');
for (const lv of LV) for (const sk of ['g', 'v', 'r']) { const n = raw.filter(i => i.lv === lv && i.sk === sk).length; ok(n >= 3, `bank: ${lv}/${sk} chỉ ${n} câu (< 3)`); }
for (const lv of LV) ok(raw.filter(i => i.lv === lv).length >= 12, `bank: ${lv} < 12 câu`);
for (const i of raw) {
  ok(LV.includes(i.lv) && ['g', 'v', 'r'].includes(i.sk), `bank ${i.id}: lv/sk sai`);
  ok(Array.isArray(i.o) && i.o.length === 4 && new Set(i.o.map(x => x.trim().toLowerCase())).size === 4 && i.o.every(x => x.trim()), `bank ${i.id}: cần 4 phương án khác nhau`);
  ok(i.sk === 'r' ? !!(i.p && i.p.length > 40) : /___/.test(i.q), `bank ${i.id}: ${i.sk === 'r' ? 'thiếu đoạn đọc' : 'thiếu chỗ trống ___'}`);
  ok(!('a' in i), `bank ${i.id}: đáp án đúng phải viết đầu, không khai báo a`);
}
const { publishBank, loadToeic5, PLAN, EXAMS, build } = await import('../build-tools.mjs');
const pub = publishBank(raw), pos = [0, 0, 0, 0];
for (const [k, i] of pub.entries()) { ok(i.o[i.a] === raw[k].o[0], `bank ${i.id}: đáp án sai sau khi xáo`); pos[i.a]++; }
ok(pos.every(n => n >= raw.length * 0.15 && n <= raw.length * 0.35), `bank: vị trí đáp án lệch ${pos}`);

// 2) Engine
const ctx = { self: {} }; vm.runInNewContext(fs.readFileSync('web/js/tools/cefr-engine.js', 'utf8'), ctx); const E = ctx.self.CEFRTest;
let ex = 0, w1 = 0, N = 0, len = 0;
for (const lv of LV) for (let s = 0; s < 300; s++) {
  const th = E.B[lv] + (s % 5 - 2) * 0.15, R = E.rng(s * 31 + lv.charCodeAt(0) * 7), t = E.create(pub, s + 1); let it;
  while ((it = t.next())) t.answer(it.id, R() < 0.04 ? 'idk' : R() < E.pRight(th, it) ? 'right' : 'wrong');
  const r = t.result(), d = Math.abs(LV.indexOf(r.level) - LV.indexOf(lv)); len += r.n; N++; if (!d) ex++; if (d <= 1) w1++;
  ok(LV.indexOf(r.lo) <= LV.indexOf(r.level) && LV.indexOf(r.level) <= LV.indexOf(r.hi), 'engine: khoảng lo–hi không chứa cấp');
}
ok(ex / N >= 0.72, `engine: đúng cấp ${(ex / N * 100).toFixed(1)} % < 72 %`); ok(w1 / N >= 0.98, `engine: lệch ≤ 1 cấp ${(w1 / N * 100).toFixed(1)} % < 98 %`);
ok(len / N >= E.MIN && len / N <= E.MAX, `engine: trung bình ${(len / N).toFixed(1)} câu ngoài [${E.MIN}, ${E.MAX}]`);
{ const seq = s => { const t = E.create(pub, s), o = []; let it; while ((it = t.next())) { o.push(it.id); t.answer(it.id, o.length % 3 ? 'right' : 'wrong'); } return o.join(); };
  ok(seq(42) === seq(42), 'engine: cùng hạt giống phải ra cùng chuỗi câu');
  const t = E.create(pub, 7); const a = t.next(); t.answer(a.id, 'right'); const t2 = E.create(pub, 1).load(JSON.parse(JSON.stringify(t.state))); ok(t2.next().id === t.next().id, 'engine: khôi phục bài dở phải ra cùng câu kế'); }

// 3) Chuỗi 15 ngôn ngữ
const en = J('content/tools/i18n/en.json');
const flat = (o, p = '') => Array.isArray(o) ? o.flatMap((x, i) => flat(x, `${p}[${i}]`)) : o && typeof o === 'object' ? Object.entries(o).filter(([k]) => k !== '_doc').flatMap(([k, v]) => flat(v, p ? `${p}.${k}` : k)) : [[p, o]];
const EN = new Map(flat(en)), KEEP = /^(Blog|IELTS|TOEIC|CEFR|A1–C2|Lexkite)$/;
for (const l of TOOL_LANGS) {
  const f = `content/tools/i18n/${l}.json`; if (!fs.existsSync(f)) { errs.push(`i18n: thiếu ${f}`); continue; }
  const m = new Map(flat(J(f)));
  for (const k of EN.keys()) if (!m.has(k)) errs.push(`i18n ${l}: thiếu ${k}`);
  for (const [k, v] of m) {
    if (!EN.has(k)) { errs.push(`i18n ${l}: khóa thừa ${k}`); continue; }
    const e = String(EN.get(k)), s = String(v);
    ok(s.trim(), `i18n ${l}: ${k} rỗng`);
    for (const ph of e.match(/\{\w+\}/g) || []) ok(s.includes(ph), `i18n ${l}: ${k} mất ${ph}`);
    ok((s.match(/<i>/g) || []).length === (e.match(/<i>/g) || []).length, `i18n ${l}: ${k} lệch thẻ <i>`);
    if (l !== 'vi') ok(!VI.test(s), `i18n ${l}: ${k} lẫn chữ Việt`);
    if (l !== 'en' && e.length > 14 && s === e && !KEEP.test(e)) errs.push(`i18n ${l}: ${k} chưa dịch (giống en)`);
  }
}

// 4) Dựng vào thư mục tạm
const D = fs.mkdtempSync(path.join(os.tmpdir(), 'tools-pages-'));
process.env.TOOLS_DIST = D;
const { n, urls } = await (async () => { const mod = await import('../build-tools.mjs?d=' + Date.now()); return mod.build(); })();
ok(n === TOOL_LANGS.length * 8, `pages: ${n} trang ≠ ${TOOL_LANGS.length * 8}`);
const SITE = 'https://lexkite.com';
const routes = new Set(execFileSync('grep', ['-rhoE', 'routes\\.[a-zA-Z]+ *=', 'web/js'], { encoding: 'utf8' }).split('\n').map(s => s.replace(/routes\.| *=/g, '')).filter(Boolean));
for (const k of new Set(Object.values(PLAN).flat().concat('toeic'))) ok(routes.has(k), `deep-link #/${k}: không có routes.${k} trong web/js`);
const pathsAll = new Set(urls.map(u => u[0])), titles = new Map(), descs = new Map();
for (const [p, , alts] of urls) {
  ok(/^\/[a-z]{2}\/[a-z0-9-]+\/([abc][12]\/)?$/.test(p), `url không phải ASCII gọn: ${p}`);
  const f = path.join(D, p, 'index.html'), h = fs.readFileSync(f, 'utf8'), lang = p.split('/')[1];
  ok(h.includes(`<html lang="${lang}"${lang === 'ar' ? ' dir="rtl"' : ''}>`), `${p}: thiếu lang/dir`);
  const can = [...h.matchAll(/<link rel="canonical" href="([^"]+)">/g)].map(m => m[1]); ok(can.length === 1 && can[0] === SITE + p, `${p}: canonical sai`);
  const hl = [...h.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)].map(m => [m[1], m[2].replace(SITE, '')]);
  ok(hl.length === TOOL_LANGS.length + 1 && hl.some(([l, u]) => l === lang && u === p) && hl.some(([l]) => l === 'x-default'), `${p}: hreflang thiếu (${hl.length})`);
  for (const [l, u] of hl) { ok(pathsAll.has(u), `${p}: hreflang ${l} trỏ trang không tồn tại ${u}`); if (l !== 'x-default' && pathsAll.has(u)) { const h2 = fs.readFileSync(path.join(D, u, 'index.html'), 'utf8'); ok(h2.includes(`hreflang="${lang}" href="${SITE + p}"`), `hreflang không hai chiều: ${u} → ${p}`); } }
  const title = (h.match(/<title>([^<]+)<\/title>/) || [])[1] || '', desc = (h.match(/<meta name="description" content="([^"]+)"/) || [])[1] || '';
  ok(title && !titles.has(lang + title), `${p}: tiêu đề trống/trùng`); titles.set(lang + title, p);
  ok(desc.length >= 50 && desc.length <= 320 && !descs.has(lang + desc), `${p}: mô tả trống/trùng/độ dài ${desc.length}`); descs.set(lang + desc, p);
  ok((h.match(/<h1>/g) || []).length === 1, `${p}: cần đúng 1 <h1>`);
  const lds = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => { try { return JSON.parse(m[1]); } catch { errs.push(`${p}: JSON-LD hỏng`); return {}; } });
  const types = lds.map(x => x['@type']); ok(types.includes('BreadcrumbList'), `${p}: thiếu BreadcrumbList`);
  if (p === toolPath(lang, 'test')) ok(types.includes('Quiz') && types.includes('WebApplication'), `${p}: trang test thiếu Quiz/WebApplication`);
  if (/toeic/.test(p)) { const q = lds.find(x => x['@type'] === 'Quiz'); ok(q && q.hasPart && q.hasPart.length === 3 && q.hasPart.every(x => x.acceptedAnswer && x.acceptedAnswer.text), `${p}: Quiz TOEIC thiếu câu mẫu`); }
  const og = (h.match(/<meta property="og:image" content="https:\/\/lexkite\.com([^"]+)"/) || [])[1]; ok(og && fs.existsSync('web' + og), `${p}: og:image không tồn tại ${og}`);
  if (/[abc][12]\/$/.test(p)) ok(og === `/img/tools/og-cefr-${p.slice(-3, -1)}.png`, `${p}: og:image phải theo cấp`);
  for (const m of h.matchAll(/<script src="([^"]+)"/g)) ok(fs.existsSync('web' + m[1]), `${p}: script ${m[1]} không tồn tại`);
  for (const m of h.matchAll(/href="\/app\/[^"#]*#\/([a-z]+)/g)) ok(routes.has(m[1]), `${p}: deep-link #/${m[1]} không có route`);
  for (const [k] of [['test'], ['toeic']]) ok(h.includes(`href="${toolPath(lang, k)}"`), `${p}: thiếu liên kết nội bộ tới ${toolPath(lang, k)}`);
  if (lang !== 'vi') ok(!VI.test(h.replace(/<script>[\s\S]*?<\/script>/g, '').replace(/<a [^>]*lang="vi"[^>]*>[^<]*<\/a>/g, '').replace(/hreflang="vi"[^>]*>[^<]*/g, '')), `${p}: lẫn chữ Việt`);
}
for (const l of TOOL_LANGS) { const x = J(path.join(D, `data/tools/toeic5-${l}.json`)).items; ok(x.length >= 200, `toeic5-${l}: chỉ ${x.length} câu`); if (l !== 'vi') ok(!x.some(i => VI.test(i.x)), `toeic5-${l}: lời giải lẫn chữ Việt`); }
ok(loadToeic5().length >= 200, 'toeic5: thiếu dữ liệu Part 5 của app');
const sm = fs.readFileSync(path.join(D, 'sitemap-tools.xml'), 'utf8'); ok((sm.match(/<loc>/g) || []).length === n, 'sitemap-tools: thiếu URL');
ok(Object.keys(EXAMS).length === 6, 'EXAMS: thiếu cấp');
// Liên kết nội bộ từ nơi khác: chân trang chung, bài blog cùng chủ đề, trang từ
for (const l of TOOL_LANGS) ok(toolFoot(l).length === 2, `chân trang ${l}: thiếu liên kết công cụ`);
const box = blogToolBox({ lang: 'es', slug: 'toeic-vocabulario', title: 'TOEIC', tags: ['toeic'] });
ok(box.includes(toolPath('es', 'toeic')) && box.includes(toolPath('es', 'test')), 'blog: hộp công cụ thiếu link');
ok(blogToolBox({ lang: 'xx', slug: 'toeic', title: 'x' }) === '', 'blog: ngôn ngữ không có chuỗi phải trả rỗng');
ok(fs.readFileSync('scripts/build-blog.mjs', 'utf8').includes('blogToolBox(p)'), 'blog: build-blog.mjs không chèn hộp công cụ');
ok(fs.readFileSync('scripts/build-seo-pages.mjs', 'utf8').includes('toolLine(l)'), 'trang từ: build-seo-pages.mjs không liên kết tới bài test');
ok(fs.readFileSync('scripts/build-web.sh', 'utf8').includes('build-tools.mjs'), 'build-web.sh: chưa chạy build-tools.mjs');
// 5) Chạy THẬT script trang trong jsdom (không mạng): làm hết bài test như người học B2 → kết quả + lộ trình deep-link; quiz TOEIC 10 câu → điểm
{
  const { JSDOM } = await import('jsdom');
  const tick = () => new Promise(r => setTimeout(r, 0));
  const open = (p, js) => {
    const dom = new JSDOM(fs.readFileSync(path.join(D, p, 'index.html'), 'utf8'), { url: SITE + p, runScripts: 'outside-only', pretendToBeVisual: true }), w = dom.window;
    w.fetch = async u => { const f = path.join(D, u); const has = fs.existsSync(f); return { ok: has, status: has ? 200 : 404, json: async () => J(f) }; };
    w.eval(fs.readFileSync('web/js/tools/cefr-engine.js', 'utf8')); w.eval(fs.readFileSync('web' + js, 'utf8')); return w;
  };
  const byQ = new Map(pub.map(i => [(i.p || '') + '|' + i.q, i]));
  for (const lang of ['en', 'vi', 'ar']) {
    const p = toolPath(lang, 'test'), w = open(p, '/js/tools/level-test.js'), d = w.document, U = JSON.parse(d.getElementById('tool-data').textContent);
    ok(!d.getElementById('qz-start').disabled, `e2e ${p}: nút Bắt đầu chưa bật`);
    d.getElementById('qz-start').click(); for (let k = 0; k < 5; k++) await tick();
    let asked = 0;
    while (d.querySelector('#qz .opts button') && asked < 40) {
      const q = d.getElementById('qz-q').textContent.replace(/_____/g, '___'), psg = (d.querySelector('#qz .psg') || {}).textContent || '', it = byQ.get(psg + '|' + q);
      if (!it) { errs.push(`e2e ${p}: không khớp câu "${q}"`); break; }
      const good = LV.indexOf(it.lv) <= LV.indexOf('B2'), btns = [...d.querySelectorAll('#qz .opts button')];
      const pick = good ? it.a : (it.a + 1) % 4;
      if (asked % 2) d.dispatchEvent(new w.KeyboardEvent('keydown', { key: asked % 4 === 1 ? '1234'[pick] : 'ABCD'[pick], bubbles: true })); else btns[pick].click(); // xen kẽ phím tắt 1–4 / A–D và bấm chuột
      asked++;
    }
    const res = d.querySelector('#qz .big');
    ok(res && ['B1', 'B2', 'C1'].includes(res.textContent), `e2e ${p}: kết quả ${res && res.textContent} (mong đợi quanh B2) sau ${asked} câu`);
    ok(asked >= E.MIN && asked <= E.MAX, `e2e ${p}: ${asked} câu ngoài [${E.MIN}, ${E.MAX}]`);
    const links = [...d.querySelectorAll('#qz .steps a')].map(a => a.getAttribute('href'));
    ok(links.length === 4 && links.every(h => h.startsWith(U.app + '#/') && routes.has(h.split('#/')[1])), `e2e ${p}: lộ trình deep-link sai ${links}`);
    ok(d.querySelector(`#qz a[href="${U.lvUrl[res && res.textContent]}"]`), `e2e ${p}: thiếu link trang cấp độ`);
    ok(JSON.parse(w.localStorage.getItem('lk-tool-cefr') || '{}').level === (res && res.textContent), `e2e ${p}: chưa lưu kết quả`);
    if (lang !== 'vi') ok(!VI.test(d.getElementById('qz').textContent), `e2e ${p}: kết quả lẫn chữ Việt`);
    // Trang cấp độ của chính kết quả → hiện "Kết quả của bạn"
    const lvp = U.lvUrl[res.textContent], w2 = open(lvp, '/js/tools/level-test.js'); w2.localStorage.setItem('lk-tool-cefr', w.localStorage.getItem('lk-tool-cefr'));
    w2.eval(fs.readFileSync('web/js/tools/level-test.js', 'utf8')); ok(!w2.document.getElementById('you').hidden, `e2e ${lvp}: không hiện kết quả của người xem`);
  }
  for (const lang of ['en', 'ja']) {
    const p = toolPath(lang, 'toeic'), w = open(p, '/js/tools/toeic5.js'), d = w.document, U = JSON.parse(d.getElementById('tool-data').textContent);
    d.getElementById('qz-start').click(); for (let k = 0; k < 5; k++) await tick();
    let n = 0; while (d.querySelector('#qz .opts button:not([disabled])') && n < 12) { if (n % 2) d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'b', bubbles: true })); else d.querySelector('#qz .opts button').click(); ok(d.querySelector('#qz .opts button[disabled]'), `e2e ${p}: phím tắt/bấm không chọn được đáp án`); ok(d.querySelector('#qz .fb'), `e2e ${p}: thiếu giải thích`); d.getElementById('qz-next').click(); n++; }
    ok(n === 10 && /\d/.test((d.getElementById('qz-r') || {}).textContent || ''), `e2e ${p}: lượt ${n} câu, không có điểm`);
    ok(d.querySelector(`#qz a[href="${U.app}"]`), `e2e ${p}: thiếu deep-link app #/toeic`);
  }
}
fs.rmSync(D, { recursive: true, force: true });
if (errs.length) { console.error(`✗ tools-pages: ${errs.length} lỗi\n  ` + errs.slice(0, 40).join('\n  ')); process.exit(1); }
console.log(`✓ tools-pages: ${raw.length} câu CEFR, engine đúng cấp ${(ex / N * 100).toFixed(1)} % / ±1 ${(w1 / N * 100).toFixed(1)} % (${(len / N).toFixed(1)} câu), ${n} trang × hreflang ${TOOL_LANGS.length + 1}, i18n ${TOOL_LANGS.length} ngôn ngữ`);
