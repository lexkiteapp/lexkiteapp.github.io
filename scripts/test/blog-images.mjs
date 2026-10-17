// Test ảnh riêng từng bài blog (nhẹ, không mạng, không dựng ảnh): đặc tả front matter, mẫu SVG ảnh bìa (đầu vào), sơ đồ,
// alt tự sinh + luật alt đúng sự thật, trần dung lượng, schema sổ ảnh (media.json + media/*.json), luật blog-check, ký SigV4 R2.
// Dùng: node scripts/test/blog-images.mjs            (toàn bộ)
//       node scripts/test/blog-images.mjs --schema-only   (CI blog-images: chỉ kiểm sổ ảnh thật)
import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import * as BI from '../lib/blog-images.mjs';
import { parse, loadMedia, ROOT } from '../lib/blog-content.mjs';

let n = 0; const t = (name, fn) => { try { fn(); n++; } catch (e) { console.error(`✗ ${name}\n`, e); process.exit(1); } };
const IMG = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8')).images || {};

t('sổ ảnh thật: schema + trần dung lượng', () => {
  const { items } = loadMedia(ROOT), errs = Object.entries(items).flatMap(([id, m]) => BI.validateItem(id, m, { budgetKB: IMG.budgetKB || 60 }));
  assert.deepEqual(errs, [], errs.slice(0, 10).join('\n'));
  for (const [id, m] of Object.entries(items)) if (m.kind) assert.ok(id.endsWith('--cover') ? m.kind === 'cover' : m.kind === 'shot', `${id}: kind khớp khóa`);
});
if (process.argv.includes('--schema-only')) { console.log(`✓ blog-images: sổ ảnh hợp lệ`); process.exit(0); }

t('cấu hình images', () => {
  assert.equal(typeof IMG.enforce, 'boolean'); assert.match(IMG.enforceFrom, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(IMG.budgetKB > 0 && IMG.budgetKB <= 60, 'trần AVIF ≤ 60 KB'); assert.deepEqual(IMG.widths, [480, 960, 1440]);
  assert.match(IMG.app, /^https:\/\/lexkite\.com\/app\/\?sandbox=1/, 'chụp bản sandbox (không tài khoản thật)');
});

t('parseFlow: danh sách/đối tượng, chuỗi, số, chữ trần có #', () => {
  assert.deepEqual(BI.parseFlow(`[{route: '#/dict/resilient', crop: main, wait: 3000}, "#/verb/take", {crop: {selector: '.card'}}]`),
    [{ route: '#/dict/resilient', crop: 'main', wait: 3000 }, '#/verb/take', { crop: { selector: '.card' } }]);
  assert.deepEqual(BI.parseFlow(`{a: 'it''s', b: "x\\"y", c: true, d: null, e: -2.5, f: [ ]}`), { a: "it's", b: 'x"y', c: true, d: null, e: -2.5, f: [] });
  assert.deepEqual(BI.parseFlow('[{t: She, r: S}, {t: has finished, r: V},]'), [{ t: 'She', r: 'S' }, { t: 'has finished', r: 'V' }]);
  assert.throws(() => BI.parseFlow('[{route: x}'), /flow/); assert.throws(() => BI.parseFlow('{a 1}'), /flow/);
  assert.equal(BI.bracketDepth("[{t: 'a [b'},"), 1);
});

t('front matter: shots/diagrams nhiều dòng, tags cũ không đổi', () => {
  const src = `---\ntitle: "X"\ntags: [a, b]\nshots: [\n  {route: '#/dict/resilient', crop: main},\n  {route: '#/grammar/present-perfect'}\n]\ndiagrams: [{type: compare, cols: [A, B], rows: [[x, y]]}]\ncoverArt: {mood: think, icon: blocks}\nstatus: ready\n---\nBody`;
  const { data, body } = parse(src);
  assert.deepEqual(data.tags, ['a', 'b']); assert.equal(data.status, 'ready'); assert.equal(body, 'Body');
  assert.equal(data.shots.length, 2); assert.equal(data.shots[0].crop, 'main'); assert.equal(data.diagrams[0].type, 'compare'); assert.equal(data.coverArt.mood, 'think');
  assert.throws(() => parse('---\nshots: [{route: x\n---\nB', 'f.md'), /shots/);
});

const post = (o = {}) => ({ lang: 'en', slug: 'present-perfect-vs-past-simple', title: 'Present Perfect vs Past Simple: The Clear Way to Choose', category: 'ngu-phap', tags: ['grammar', 'tenses'], ...o });
t('specOf: mặc định, id, lỗi đặc tả', () => {
  const s = BI.specOf(post({ shots: ['#/dict/resilient', { route: '#/grammar/present-perfect', crop: 'main', lang: 'auto' }], diagrams: [{ type: 'timeline', events: [{ at: -2, label: 'visited' }] }] }));
  assert.deepEqual(s.errors, []); assert.deepEqual(s.shots.map(o => [o.id, o.lang, o.device, o.crop]), [['s1', 'en', 'desktop', 'viewport'], ['s2', 'en', 'desktop', 'main']]);
  assert.equal(s.diagrams[0].id, 'd1'); assert.equal(s.cover.chip, 'Grammar & usage'); assert.equal(s.cover.mood, 'think'); assert.equal(s.cover.icon, 'blocks');
  assert.equal(BI.specOf(post({ lang: 'zh', tags: ['ielts'] })).cover.chip, '雅思', 'thẻ kỳ thi theo ngôn ngữ');
  const bad = BI.specOf(post({ shots: [{ route: 'dict/x', alt: 'x' }, { route: '#/a', crop: 'half', id: 'S 1' }, { route: '#/b', id: 's1' }], diagrams: [{ type: 'pie' }], coverArt: { mood: 'angry' } })).errors.join('\n');
  for (const re of [/route "dict\/x"/, /khóa lạ "alt"/, /crop phải/, /id "S 1"/, /trùng/, /type phải/, /mood/]) assert.match(bad, re);
  assert.match(BI.specOf(post({ diagrams: [{ type: 'compare', cols: ['a', 'b'], rows: [['1']] }] })).errors.join(), /đúng 2 ô/);
});

t('mã băm đầu vào: ổn định, đổi khi tiêu đề/route đổi', () => {
  const a = BI.wantedItems(post({ shots: ['#/dict/x'] })), b = BI.wantedItems(post({ shots: ['#/dict/x'] }));
  assert.deepEqual(a.map(x => x.in), b.map(x => x.in)); assert.deepEqual(a.map(x => x.id), ['en-present-perfect-vs-past-simple--cover', 'en-present-perfect-vs-past-simple--s1']);
  assert.notEqual(BI.wantedItems(post({ title: 'Other title here for test' }))[0].in, a[0].in);
  assert.notEqual(BI.wantedItems(post({ shots: ['#/dict/y'] }))[1].in, a[1].in);
  assert.equal(BI.wantedItems(post(), { covers: false }).length, 0);
});

t('ngắt dòng: Thái/Trung/Ấn/Ả Rập không vỡ chữ, vừa ≤ 4 dòng', () => {
  const cases = { th: 'ทำไมการท่องศัพท์แบบเดิมถึงไม่ได้ผล และควรทำอย่างไรแทนเพื่อสอบ IELTS', zh: '现在完成时和一般过去时的区别：一看就懂的选择方法与练习', hi: 'प्रेज़ेंट परफ़ेक्ट टेंस: नियम, उदाहरण और आम गलतियाँ जो हिंदी बोलने वाले करते हैं', ar: 'المضارع التام أم الماضي البسيط: الطريقة الواضحة للاختيار', ja: '現在完了と過去形の違い：迷わない使い分けのコツ' };
  for (const [lang, s] of Object.entries(cases)) {
    const r = BI.fitTitle(s, lang); assert.ok(r.lines.length <= 4 && !r.truncated, `${lang}: ${r.lines.length} dòng`);
    assert.equal(r.lines.join('').replace(/\s/g, ''), s.replace(/\s/g, ''), `${lang}: không mất ký tự`);
    for (const l of r.lines) { assert.ok(!/^\p{M}/u.test(l), `${lang}: dòng bắt đầu bằng dấu: ${l}`); assert.ok(BI.textW(l, r.size) <= 800 + 1, `${lang}: dòng quá rộng`); }
  }
  const long = BI.fitTitle('word '.repeat(80), 'en'); assert.equal(long.lines.length, 4); assert.ok(long.lines[3].endsWith('…'));
});

t('mẫu ảnh bìa SVG: tiêu đề thoát ký tự, RTL, phông theo ngôn ngữ, Kit từ kit.js, không màu cũ', () => {
  const spec = l => BI.specOf(post({ lang: l, title: 'A <b>& "C" test title for cover', tags: ['ielts'] })).cover;
  const en = BI.coverSvg(spec('en')); assert.match(en, /&lt;b&gt;&amp;/); assert.ok(!en.includes('<b>'));
  assert.match(en, /^<svg[^>]+width="1440" height="756"/); assert.match(en, /text-anchor="start"/); assert.match(en, />IELTS</);
  { const k = BI.kitSvg(spec('en').mood, 360), inner = k.slice(k.indexOf('>') + 1); assert.ok(inner.length > 500 && en.includes(inner), 'Kit lấy nguyên từ web/js/kit.js'); }
  assert.ok(!new RegExp('#(2F62' + 'C0|244E' + '9E)', 'i').test(en), 'màu Kit cũ bị cấm (BRAND-RULES)');
  assert.match(en, /fill="#0F3D3E"/); assert.match(en, /lexkite\.com/); assert.match(en, /id="mk-pg"/);
  const ar = BI.coverSvg(spec('ar')); assert.match(ar, /<text x="1344"[^>]*text-anchor="end"/, 'ar: tiêu đề canh phải');
  assert.match(BI.coverSvg(spec('hi')), /font-family="'Noto Sans Devanagari'/); assert.match(BI.coverSvg(spec('ja')), /'Noto Sans CJK JP'/);
  assert.match(BI.coverSvg(spec('ru')), /font-family="'Noto Sans', 'Be Vietnam Pro'/);
  const ids = [...en.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]); assert.equal(new Set(ids).size, ids.length, 'id SVG không trùng');
});

t('sơ đồ: chữ thật (chọn được), thoát ký tự, bảng so sánh có th scope', () => {
  const s = BI.specOf(post({ diagrams: [
    { type: 'timeline', title: 'Open vs closed', now: 'now', span: [-3, 1], events: [{ at: -2, label: 'I visited Rome <2019>' }, { from: -1, to: 0, label: 'this week' }] },
    { type: 'boxes', parts: [{ t: 'She', r: 'S' }, { t: 'has finished', r: 'V' }, { t: 'the report', r: 'O' }], note: 'have/has + V3' },
    { type: 'compare', title: 'say vs tell', cols: ['say', 'tell'], rows: [['say + something', 'tell + someone']] },
  ] }));
  assert.deepEqual(s.errors, []);
  const [tl, bx, cp] = s.diagrams.map(d => BI.diagramHtml(d, 'en', 'cap'));
  assert.match(tl, /<svg[^>]+viewBox="0 0 720 260"/); assert.match(tl, />I visited Rome &lt;2019&gt;</); assert.match(tl, />now</); assert.match(tl, /<figcaption>cap<\/figcaption>/);
  assert.match(bx, />has finished</); assert.match(bx, />have\/has \+ V3</);
  assert.match(cp, /<table><caption>say vs tell<\/caption>/); assert.match(cp, /<th scope="row">say \+ something<\/th>/);
  assert.ok(tl.length + bx.length + cp.length < 12000, 'sơ đồ nhẹ');
  assert.match(BI.diagramHtml(s.diagrams[0], 'ar'), /dir="rtl"/);
});

const shotRec = { kind: 'shot', cap: { route: '#/dict/resilient', lang: 'en', headings: ['resilient', 'Examples'], texts: ['/rɪˈzɪliənt/', 'able to recover quickly', 'Save to flashcards', 'B2'], at: '2026-10-17T00:00:00Z' } };
t('alt tự sinh: đúng ngôn ngữ, từ chữ trên màn hình', () => {
  const a = BI.autoAlt(shotRec, 'en'); assert.match(a, /^Lexkite screen: resilient – Examples, \/rɪˈzɪliənt\//); assert.ok([...a].length <= 160);
  assert.match(BI.autoAlt({ ...shotRec, cap: { ...shotRec.cap, lang: 'vi' } }, 'vi'), /^Màn hình Lexkite: resilient/);
  const c = BI.autoAlt({ kind: 'cover', title: '现在完成时和一般过去时', chip: '英语语法' }, 'zh'); assert.match(c, /^Lexkite 封面: 现在完成时和一般过去时 – 英语语法, 吉祥物 Kit$/);
  for (const l of BI.LANGS) assert.ok(BI.LABEL[l] && BI.CATS[l], `nhãn/chuyên mục cho ${l}`);
});

t('alt đúng sự thật: chặn số/cụm/từ không có trên ảnh', () => {
  assert.deepEqual(BI.altUntruths('Lexkite dictionary entry for "resilient" with a B2 level tag', shotRec, 'en'), []);
  assert.deepEqual(BI.altUntruths('Entry for "resilient" showing 3,000 words and a "real-time" score', shotRec, 'en'), ['số "3000"', 'cụm "real-time"']);
  assert.deepEqual(BI.altUntruths('Экран Lexkite: слово resilient и кнопка Save to flashcards', shotRec, 'ru'), []);
  assert.deepEqual(BI.altUntruths('Экран Lexkite: слово resilient и таймер TOEIC', shotRec, 'ru'), ['từ "TOEIC"']);
  assert.deepEqual(BI.altUntruths("Kit's view of «Examples»", shotRec, 'fr'), []);
  assert.deepEqual(BI.altUntruths('ảnh bìa 12 thì', { kind: 'cover', title: 'Ngữ pháp: 12 thì tiếng Anh', chip: 'IELTS' }, 'vi'), []);
});

t('trần dung lượng + schema bản ghi', () => {
  assert.deepEqual(BI.overBudget({ '480.avif': 9000, '1440.avif': 61440, '1440.webp': 300000 }, 60), []);
  assert.match(BI.overBudget({ '480.avif': 9000, '1440.avif': 61441 }, 60)[0], /1440 px = 60\.0 KB > 60 KB/);
  const good = { kind: 'shot', key: 'p/0123456789abcdef', hash: '0123456789abcdef', in: '0123456789ab', w: 1440, h: 900, widths: [480, 960, 1440], post: 'en/x-y', alt: BI.autoAlt(shotRec, 'en'), cap: shotRec.cap, bytes: { '1440.avif': 40000 } };
  assert.deepEqual(BI.validateItem('en-x-y--s1', good), []);
  const errs = BI.validateItem('en-x-y--s1', { ...good, key: 'p/zzz', widths: [960, 480], cap: { route: 'x' }, bytes: { '1440.avif': 90000 }, alt: 'short' }).join('\n');
  for (const re of [/key = p\/<hash>/, /widths/, /cap/, /KB > 60 KB/, /alt/]) assert.match(errs, re);
  assert.match(BI.validateItem('vi-a--s1', good).join(), /post/);
  assert.deepEqual(BI.validateItem('dict', { hash: 'be03bbeed5', w: 1920, h: 1200, widths: [480, 960, 1440] }), [], 'ảnh chung cũ vẫn hợp lệ');
});

t('CATS khớp bảng chuyên mục của build-blog.mjs', () => {
  const src = fs.readFileSync('scripts/build-blog.mjs', 'utf8'), got = {};
  for (const m of src.matchAll(/^ {2}([a-z]{2}): \{[^\n]*\n {4}cats: (\{[^\n]*\}) \},?$/gm)) got[m[1]] = Function(`return (${m[2]})`)();
  assert.ok(Object.keys(got).length >= 14);
  for (const [l, c] of Object.entries(got)) assert.deepEqual(BI.CATS[l], c, `cats ${l}`);
});

t('route app thật (web/js routes.*)', () => {
  const r = BI.appRoutes(); for (const x of ['dict', 'grammar', 'verb', 'review', 'practice']) assert.ok(r.has(x), x);
  assert.equal(BI.routeName('#/grammar/present-perfect?x=1'), 'grammar');
});

const { signV4, sha256hex, r2Config } = await import('../lib/media-store.mjs');
t('R2: ký SigV4 đúng vector mẫu AWS, không có secret → không dùng R2', () => {
  const h = signV4({ method: 'GET', host: 'examplebucket.s3.amazonaws.com', path: '/test.txt', headers: { Range: 'bytes=0-9' }, payloadHash: sha256hex(''), keyId: 'AKIAIOSFODNN7EXAMPLE', secret: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', region: 'us-east-1', date: new Date('2013-05-24T00:00:00Z') });
  assert.match(h.authorization, /Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41$/);
  assert.equal(r2Config({}), null); assert.equal(r2Config({ R2_ACCESS_KEY_ID: 'a', R2_SECRET_ACCESS_KEY: 'b' }).bucket, 'lexkite-blog-media');
});

// ——— blog-check: luật ảnh riêng trên kho tạm (bật enforce) ———
const { checkPosts } = await import('../blog-check.mjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lk-bi-')), mk = (f, s) => { fs.mkdirSync(path.dirname(path.join(tmp, f)), { recursive: true }); fs.writeFileSync(path.join(tmp, f), s); };
mk('config.json', JSON.stringify({ images: { ...IMG, enforce: true, enforceFrom: '2026-10-20', leadHours: 36 } }));
mk('briefs.json', '{"briefs":[]}'); mk('media.json', JSON.stringify({ items: { grammar: { hash: '1de55385a5', w: 1920, h: 1200, widths: [480, 960, 1440] } } }));
const P = (fm, body) => ({ lang: 'en', slug: 'pp', file: path.join(tmp, 'en/pp.md'), status: 'ready', factChecked: '2026-10-21', title: 'Present perfect test title for images ok', cover: 'grammar', coverAlt: 'Lexkite grammar roadmap screen', ...fm, body });
const rules = r => checkPosts([r], { all: [r], root: tmp, now: Date.parse('2026-10-25T00:00:00Z') }).errors.filter(e => /\[(images?|spec|alt-truth|diagram|media)\]/.test(e));
t('blog-check: bài mới thiếu shots → lỗi; đủ đặc tả + tham chiếu → chỉ còn "chưa render" khi sắp đăng', () => {
  assert.match(rules(P({}, 'Hi')).join('\n'), /cần ≥ 1 ảnh chụp riêng[\s\S]*≥ 2 hình riêng/);
  const ok = P({ shots: [{ route: '#/grammar/present-perfect' }], diagrams: [{ type: 'compare', cols: ['a', 'b'], rows: [['1', '2']] }] }, '![](media:@s1 "Lesson")\n\n{{diagram: d1 | Bảng}}\n');
  assert.deepEqual(rules(ok), []);
  assert.match(rules({ ...ok, publishAt: '2026-10-25T20:00:00Z' }).join(), /chưa render: cover, s1/);
  assert.deepEqual(rules({ ...ok, publishAt: '2026-11-30T20:00:00Z' }), [], 'còn xa giờ đăng → chưa bắt');
  assert.deepEqual(rules({ ...ok, factChecked: '2026-10-15' }).filter(e => /\[images\]/.test(e)), [], 'bài cũ (trước enforceFrom) không bị bắt');
});
t('blog-check: route lạ, @id chưa khai báo, sơ đồ chưa khai báo, alt sai sự thật', () => {
  const r = P({ shots: [{ route: '#/khong-co-trang/x' }] }, '![](media:@s9 "a")\n\n{{diagram: d7}}\n');
  const e = rules(r).join('\n'); for (const re of [/trang "khong-co-trang" không có trong app/, /media:@s9 chưa khai báo/, /\{\{diagram: d7\}\} chưa khai báo/, /shots s1 khai báo nhưng không dùng/]) assert.match(e, re);
  const items = { 'en-pp--s1': { kind: 'shot', key: 'p/0123456789abcdef', hash: '0123456789abcdef', in: BI.wantedItems(P({ shots: ['#/dict/resilient'] }))[1].in, w: 1440, h: 900, widths: [480, 960, 1440], post: 'en/pp', alt: BI.autoAlt(shotRec, 'en'), cap: shotRec.cap, bytes: { '1440.avif': 30000 } } };
  mk('media/en.json', JSON.stringify({ items }));
  const bad = rules(P({ shots: ['#/dict/resilient'] }, '![Dictionary with a "real-time" pronunciation score](media:@s1 "x")\n\n![](media:@s1 "y")\n')).join('\n');
  assert.match(bad, /\[alt-truth\] alt media:@s1 khẳng định cụm "real-time"/);
  fs.rmSync(path.join(tmp, 'media'), { recursive: true });
});
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`✓ blog-images: ${n} nhóm test đạt`);
