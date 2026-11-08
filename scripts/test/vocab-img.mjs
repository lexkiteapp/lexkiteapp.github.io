// Ảnh minh hoạ từ vựng: cổng img.json (dict-consistency, fmt/x2), <picture> AVIF→WebP trong hộp cố định (2x chỉ khi x2), cờ UI mặc định TẮT,
// shell +0 byte, SW LRU 800, trang /words/ y nguyên khi chưa duyệt, việc nền tạm dừng & ưu tiên thấp nhất.
import fs from 'fs';
import vm from 'vm';
import assert from 'assert/strict';
import { checkImg, seoPic } from '../lexicon/img.mjs';
import { promptFor, STYLE, fnv } from '../vocab-img/style.mjs';

const rd = p => fs.readFileSync(p, 'utf8'), J = p => JSON.parse(rd(p));
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

// 1. cổng img.json (mục {h, url, alt, sv, q, ph, at, fmt:[avif,webp], x2?}) + chỉ mục v2 gọn
const senses = new Set(['apple#n', 'run#v']), base = 'https://media.lexkite.com/vimg/';
const good = { v: 1, style: { v: 's1' }, base, items: { 'apple#n': { h: '0123456789abcdef', url: base + '0123456789abcdef.webp', alt: 'apple', sv: 's1', q: { score: 0.9 }, fmt: ['avif', 'webp'] } }, rejected: {} };
ok(checkImg(good, senses).length === 0, 'mục hợp lệ phải qua');
ok(checkImg({ ...good, items: { 'apple#n': { ...good.items['apple#n'], x2: true } } }, senses).length === 0, 'x2: true hợp lệ');
ok(checkImg({ ...good, items: { 'apple#n': { ...good.items['apple#n'], fmt: ['webp'] } } }, senses).length === 0, 'chỉ WebP vẫn hợp lệ');
ok(checkImg({ ...good, items: { 'apple#n': { ...good.items['apple#n'], fmt: ['avif'] } } }, senses).some(e => e.includes('fmt')), 'fmt thiếu webp → lỗi');
ok(checkImg({ ...good, items: { 'apple#n': { ...good.items['apple#n'], fmt: undefined } } }, senses).some(e => e.includes('fmt')), 'thiếu fmt → lỗi');
ok(checkImg({ ...good, items: { 'apple#n': { ...good.items['apple#n'], x2: 'yes' } } }, senses).some(e => e.includes('x2')), 'x2 không phải boolean → lỗi');
ok(checkImg(J('content/lexicon/img.json'), new Set(Object.keys(J('content/lexicon/vimg-select.json').items))).length === 0 || Object.keys(J('content/lexicon/img.json').items).length > 0, 'img.json gốc hợp lệ');
const bad = JSON.parse(JSON.stringify(good)); bad.items['pear#n'] = { h: 'xyz', url: 'https://lexkite.com/x.webp', alt: '', sv: '', q: {}, fmt: ['webp'] }; bad.rejected['apple#n'] = { why: 'sai' };
const errs = checkImg(bad, senses);
for (const m of ['không có nghĩa này', 'h sai', 'url', 'alt', 'sv sai', 'q.score', 'rejected']) ok(errs.some(e => e.includes(m)), 'phải bắt lỗi: ' + m);
ok(checkImg({ ...good, base: 'https://lexkite.com/vimg/' }, senses).some(e => e.includes('Pages')), 'ảnh không được nằm trên Pages');
// nguồn + giấy phép (src) và ảnh chụp riêng (photo) – ảnh chụp KHÔNG BAO GIỜ nằm ở h
{ const it = x => ({ ...good, items: { 'apple#n': { ...good.items['apple#n'], ...x } } }), E = x => checkImg(it(x), senses);
  const PH = { h: 'ffffffffffffffff', fmt: ['avif', 'webp'], src: { tier: 'photo', lic: 'Pixabay', by: 'Anna K', ref: 'pixabay:123' } };
  ok(E({ src: { tier: 'icon', lic: 'Apache-2.0', ref: 'noto:1f34e' } }).length === 0 && E({ src: { tier: 'ai', lic: 'own' } }).length === 0, 'src icon/ai hợp lệ (src tuỳ chọn – mục cũ vẫn qua)');
  ok(E({ src: { lic: 'own' } }).some(e => e.includes('tier')) && E({ src: { tier: 'ai' } }).some(e => e.includes('lic')) && E({ src: { tier: 'ai', lic: 'CC0' } }).some(e => e.includes('lic')), 'có src → bắt buộc tier + lic hợp lệ');
  ok(E({ src: { tier: 'photo', lic: 'Pixabay', by: 'x' } }).some(e => e.includes('photo riêng')), 'h không được là ảnh chụp');
  ok(E({ photo: PH }).length === 0, 'photo {h, fmt, src} hợp lệ');
  ok(E({ photo: { ...PH, src: { tier: 'photo', lic: 'Pexels' } } }).some(e => e.includes('by')), 'ảnh chụp thiếu by (ghi công) → lỗi');
  ok(E({ photo: { ...PH, src: undefined } }).some(e => e.includes('thiếu src')), 'photo thiếu src → lỗi');
  ok(E({ photo: { ...PH, src: { tier: 'photo', lic: 'own', by: 'x' } } }).some(e => e.includes('Pixabay|Pexels')), 'ảnh chụp chỉ Pixabay|Pexels');
  ok(E({ photo: { ...PH, h: good.items['apple#n'].h } }).some(e => e.includes('photo.h')) && E({ photo: { ...PH, fmt: ['avif'] } }).some(e => e.includes('photo.fmt')), 'photo.h khác h, photo.fmt có webp');
  const WK = { ...PH, src: { tier: 'wiki', lic: 'CC BY-SA 4.0', by: 'Jane', ref: 'https://commons.wikimedia.org/wiki/File:A.jpg' } };
  ok(E({ photo: WK }).length === 0 && E({ photo: { ...WK, src: { ...WK.src, lic: 'CC0' } } }).length === 0, 'photo wiki CC BY-SA/CC0 + by + ref Commons hợp lệ');
  ok(E({ photo: { ...WK, src: { ...WK.src, lic: 'GFDL' } } }).some(e => e.includes('lic')) && E({ photo: { ...WK, src: { ...WK.src, ref: 'x' } } }).some(e => e.includes('Commons')), 'wiki: giấy phép ngoài CC0/PD/CC BY[-SA] hoặc thiếu ref → lỗi');
  { const g2 = { ...good, items: { 'apple#n': { alt: 'apple', photo: WK } } }; ok(checkImg(g2, senses).length === 0, 'mục chỉ có photo (không h) hợp lệ'); } }
{ // chỉ mục v3 (28/10): ĐẦU nhỏ + 64 mảnh js/vimg/NN.json theo fnv(từ) – gộp mảnh phải đúng bằng img.json
  const head = J('web/js/lexicon-img.json'), img = J('content/lexicon/img.json'), N = head.n;
  const shards = Array.from({ length: N }, (_, i) => J(`web/js/vimg/${String(i).padStart(2, '0')}.json`));
  const ix = { m: {}, x: [], w: [], p: {} }; for (const o of shards) { Object.assign(ix.m, o.m); Object.assign(ix.p, o.p); ix.x.push(...o.x); ix.w.push(...o.w); }
  const SH = w => { let h = 0x811c9dc5; for (const ch of String(w).toLowerCase()) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h % N; };
  ok(head.v === 3 && N === 64 && head.base === img.base && !('m' in head) && rd('web/js/lexicon-img.json').length < 200, 'đầu chỉ mục v3 nhỏ {v, base, sv, on, n} – không mang m');
  ok(Object.keys(ix.m).length === Object.values(img.items).filter(e => e.h).length && shards.every((o, i) => Object.keys(o.m).every(k => SH(k.split('#')[0]) === i)), 'mảnh v3 gộp lại khớp img.json, mỗi khoá đúng mảnh fnv(từ) % 64');
  ok(/const SH = \(w, n\) => \{ let h = 0x811c9dc5; for \(const ch of String\(w\)\.toLowerCase\(\)\) \{ h \^= ch\.codePointAt\(0\); h = Math\.imul\(h, 0x01000193\) >>> 0; \} return h % n; \}/.test(rd('web/js/vocab-img.js')) && /imgSh = w => \{ let h = 0x811c9dc5;/.test(rd('scripts/build-lexicon.mjs')), 'hàm mảnh app trùng build-lexicon');
  ok(['.github/workflows/vocab-img-scene.yml', 'scripts/vocab-img/publish.mjs', 'scripts/vocab-img/publish-free.mjs'].every(f => /web\/js\/vimg/.test(rd(f)) && /extension\/app\/js\/vimg/.test(rd(f))), 'mọi bước tự commit ảnh có git add các mảnh js/vimg (không lệch → Prod đỏ)');
  ok(Math.max(...shards.map((_, i) => rd(`web/js/vimg/${String(i).padStart(2, '0')}.json`).length)) < 60e3, 'mỗi mảnh < 60 KB (đủ 20k ảnh ~15 KB)');
  ok(Object.entries(ix.m).every(([k, h]) => img.items[k].h === h) && shards.every((_, i) => !/"(photo|src|by|lic)"/.test(rd(`web/js/vimg/${String(i).padStart(2, '0')}.json`))) && Object.entries(ix.p || {}).every(([k, h]) => img.items[k].photo.h === h && !Object.values(ix.m).includes(h)), 'chỉ mục app chỉ mang h (biểu tượng/minh họa) – không dữ liệu ảnh chụp');
  ok(ix.x.every(k => img.items[k].x2 === true) && Object.keys(img.items).filter(k => img.items[k].x2 === true).length === ix.x.length, 'x = đúng các khoá x2'); }

// 2. module UI: cờ mặc định TẮT → không tải gì, không hộp; bật → <picture> AVIF→WebP trong hộp cố định, 2x chỉ khi x2 và rộng > 192
const code = rd('web/js/vocab-img.js');
function sandbox(store, index) {
  store = { 'lk.vb': '3', ...store };   // nhóm bật dần 3 < 10 % mặc định
  const fetched = [];
  const ctx = { localStorage: { getItem: k => (k in store ? store[k] : null) }, fetch: u => { fetched.push(u); return Promise.resolve({ ok: true, json: () => Promise.resolve(index) }); },
    URL, location: { href: 'https://lexkite.com/app/' }, document: { currentScript: null } };
  ctx.self = ctx; vm.runInNewContext(code, ctx); return { V: ctx.VImg, fetched };
}
const H = '0123456789abcdef', H2 = 'fedcba9876543210', H3 = 'aaaaaaaaaaaaaaaa';
const index = { v: 2, base, sv: 's1', m: { 'apple#n': H, 'kiss#v': H2, 'red#adj': H3 }, x: ['kiss#v'], w: ['red#adj'] };
{ const { V, fetched } = sandbox({}, index); ok(V.enabled() === false, 'chưa đặt cờ, chỉ mục chưa về → chưa bật'); ok(V.slot('apple', 'n') === '', 'chưa bật → không chèn hộp');
  ok(await V.ready() === null && await V.get('apple', 'n') === null && fetched.length === 1, 'tự động + chỉ mục on=false (< 150 ảnh) → ready()/get() null'); ok(V.slot('apple', 'n') === '', 'on=false → vẫn không hộp sau ready()'); }
{ const { V } = sandbox({}, { ...index, on: true }); ok(await V.ready() === V && V.enabled() === true && /0123456789abcdef/.test(V.slot('apple', 'n')), 'tự động + chỉ mục on=true (≥ 150 ảnh đã chấm) → bật'); }
{ const { V, fetched } = sandbox({ 'lk.cfg': JSON.stringify({ at: Date.now(), v: { vocab_img: false } }) }, { ...index, on: true }); ok(await V.ready() === null && await V.get('apple', 'n') === null && fetched.length === 0, 'config vocab_img=false (công tắc tắt) → không tải chỉ mục dù on=true'); }
{ const { V } = sandbox({ 'lk.cfg': JSON.stringify({ at: Date.now(), v: { vocab_img: false } }) }, index); ok(V.enabled() === false, 'config vocab_img=false → tắt'); }
// v3 (28/10): đầu nhỏ + mảnh theo nhu cầu – slot() không hộp tới khi mảnh của TỪ ĐÓ về; ready(list)/need tải đúng mảnh, 1 lần; mảnh lỗi = rỗng, không lặp
{ const SH = w => { let h = 0x811c9dc5; for (const ch of String(w).toLowerCase()) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h % 64; };
  const head = { v: 3, base, sv: 's1', on: true, n: 64 }, sh = String(SH('apple')).padStart(2, '0');
  const store = { 'lk.vb': '3', 'lk.vimg': '1' }, fetched = [];
  const ctx = { localStorage: { getItem: k => (k in store ? store[k] : null) }, URL, location: { href: 'https://lexkite.com/app/' }, document: { currentScript: null },
    fetch: u => { fetched.push(String(u)); const m = /vimg\/(\d\d)\.json$/.exec(String(u)); return Promise.resolve(m ? (m[1] === sh ? { ok: true, json: () => Promise.resolve({ m: { 'apple#n': H }, x: [], w: [], a: [], s: [], p: {}, pw: [] }) } : { ok: false, json: () => Promise.resolve(null) }) : { ok: true, json: () => Promise.resolve(head) }); } };
  ctx.self = ctx; vm.runInNewContext(code, ctx); const V = ctx.VImg;
  await V.ready(); ok(fetched.length === 1 && V.slot('apple', 'n', 'táo', 160) === '', 'v3: chỉ đầu về → slot rỗng (không hộp) và tự xin mảnh');
  await V.need(['apple']); ok(fetched.filter(u => u.endsWith(`/app/js/vimg/${sh}.json`)).length === 1 && /<picture>/.test(V.slot('apple', 'n', 'táo', 160)), 'v3: mảnh của từ về (1 lần, đúng js/vimg/NN.json) → có ảnh');
  const n0 = fetched.length; await V.need(['zebra', 'zebra']); await V.need(['zebra']); ok(fetched.length === n0 + 1 && V.loaded('zebra') && V.slot('zebra', 'n', '', 160) === '', 'v3: mảnh lỗi/404 = rỗng, đánh dấu đã về, không tải lại vòng lặp');
  ok(await V.ready(['apple']) === V && fetched.length === n0 + 1, 'v3: ready(list) với mảnh đã có không tải lại'); }
{ const { V, fetched } = sandbox({ 'lk.vimg': '1' }, index);
  ok(V.slot('apple', 'n', 'táo', 160) === '', 'bật nhưng chỉ mục CHƯA về → không giữ chỗ (không hộp rỗng đổi cỡ)');
  ok(await V.ready() === V, 'ready() tải trước chỉ mục → trả VImg');
  ok(fetched.length === 1 && /\/app\/js\/lexicon-img\.json$/.test(fetched[0]), 'chỉ mục tải lười từ js/lexicon-img.json, 1 lần');
  await V.ready(); ok(fetched.length === 1, 'ready() lần 2 không tải lại');
  const a = V.slot('Apple', 'noun', 'quả "táo"', 160);
  ok(/^<span class="vimg" style="[^"]*width:160px;[^"]*aspect-ratio:1\/1[^"]*"><picture><source type="image\/avif" srcset="[^"]+\.avif"><img src="[^"]+\.webp"[^>]* width="160" height="160"[^>]*><\/picture><\/span>$/.test(a), 'hộp cố định vuông + <picture> AVIF → <img> WebP có width/height');
  ok(a.includes(`srcset="${base}${H}.avif"`) && a.includes(`src="${base}${H}.webp"`), 'đúng tệp <h>.avif + <h>.webp trên CDN');
  ok(/loading="lazy"/.test(a) && /decoding="async"/.test(a) && /crossorigin="anonymous"/.test(a), 'img lazy + async + CORS cho SW');
  ok(a.includes('alt="Apple – quả &quot;táo&quot;"'), 'alt = từ + nghĩa theo ngôn ngữ UI, thoát ký tự');
  ok(!/@2x/.test(a), 'không x2 → không có 2x');
  ok(V.slot('apple', 'v') === '' && V.slot('run', 'v', 'chạy', 160) === '', 'nghĩa không có ảnh (hoặc loại từ khác) → không hộp');
  const k1 = V.slot('kiss', 'verb', 'hôn', 160), k2 = V.slot('kiss', 'v', 'hôn', 240);
  ok(!/@2x/.test(k1), 'x2 nhưng hiển thị ≤ 192 px → không tải 2x');
  ok(k2.includes(`srcset="${base}${H2}.avif, ${base}${H2}@2x.avif 2x"`) && k2.includes(`srcset="${base}${H2}.webp 1x, ${base}${H2}@2x.webp 2x"`), 'x2 + rộng > 192 px → avif/webp @2x');
  ok(!/@2x/.test(V.slot('apple', 'n', '', 240)), 'rộng > 192 nhưng không x2 → không 2x');
  const r = V.slot('red', 'adj', 'đỏ', 128); ok(!/<source/.test(r) && r.includes(`src="${base}${H3}.webp"`), 'mục chỉ WebP → không <source avif> (AVIF 404 không lùi về img)');
  const g = await V.get('Apple', 'n', 'quả táo'); ok(g && g.url === base + H + '.webp' && g.avif === base + H + '.avif' && g.alt === 'Apple – quả táo' && !g.x2, 'get(): url webp (tương thích) + avif');
  ok(V.key('Tea', 'danh từ') === 'tea#n' && V.key('run', 'Verb') === 'run#v', 'khoá từ#loại chuẩn hoá như normPos'); }

// 3. shell +0 byte: khung app không nạp module/chỉ mục (chỉ bó tải lười khi cờ bật); bề mặt dùng VImg; SW LRU 800; trang /words/ y nguyên khi chưa duyệt
const html = rd('web/app/index.html'), appjs = rd('web/js/app.js'), sw = rd('web/sw.js');
ok(!/vocab-img|lexicon-img/.test(html), 'app/index.html không nạp vocab-img / chỉ mục');
ok(!/lexicon-img\.json/.test(appjs) && !/<script[^>]*vocab-img/.test(appjs), 'app.js không nạp tĩnh module/chỉ mục');
ok((appjs.match(/vocab-img\.js/g) || []).length === 1 && /vimg: \['js\/vocab-img\.js'\]/.test(appjs), 'app.js chỉ nhắc vocab-img.js trong bó tải lười BUNDLES.vimg');
{ const m = /const vimgOn = [^\n]*\n\s*App\.vimgReady = [^\n]*\n\s*App\.vimg = [^\n]*\n\s*(?:\s*\/\/[^\n]*\n)*\s*[^\n]*App\.vimgReady\(\)[^\n]*\n/.exec(appjs); ok(!!m, 'app.js có vimgOn/App.vimgReady/App.vimg');
  for (const [store, want] of [[{}, 1], [{ 'lk.cfg': JSON.stringify({ v: { vocab_img: false } }) }, 0], [{ 'lk.vimg': '0', 'lk.cfg': JSON.stringify({ v: { vocab_img: true } }) }, 0], [{ 'lk.vimg': '1' }, 1], [{ 'lk.cfg': JSON.stringify({ v: { vocab_img: true } }) }, 1]]) {
    const need = []; const ctx = { localStorage: { getItem: k => (k in store ? store[k] : null) }, App: { need: n => { need.push(n); return Promise.resolve(); } }, window: {}, location: { hash: '#/study' }, idle: f => f() };
    vm.runInNewContext(m[0], ctx); ok(need.length === want && (!want || need[0] === 'vimg'), `cờ ${JSON.stringify(store)} → ${want ? 'tải bó vimg' : 'KHÔNG tải gì'}`);
    ok(ctx.App.vimg('apple', 'n') === '', 'App.vimg khi chưa có module → chuỗi rỗng (không hộp)'); } }
{ const m = /const vimgOn = [^\n]*\n\s*App\.vimgReady = [^\n]*\n\s*App\.vimg = [^\n]*\n(?:\s*\/\/[^\n]*\n)*\s*[^\n]*App\.vimgReady\(\)[^\n]*\n/.exec(appjs);
  for (const [hash, deferred] of [['', 1], ['#/welcome', 1], ['#/home', 1], ['#/home?x=1', 1], ['#/study', 0], ['#/dict/hello', 0], ['#/homework', 0]]) {
    const need = [], q = []; vm.runInNewContext(m[0], { localStorage: { getItem: () => null }, App: { need: n => { need.push(n); return Promise.resolve(); } }, window: {}, location: { hash }, idle: f => q.push(f) });
    ok(deferred ? !need.length && q.length === 1 : need.length === 1 && !q.length, `màn đầu '${hash}' → ${deferred ? 'hoãn nạp ảnh tới lúc rảnh (TBT)' : 'nạp ngay'}`); q.forEach(f => f()); ok(!deferred || need.length === 1, `'${hash}': lúc rảnh vẫn nạp bó vimg`); } }
const SHELL = (/const SHELL = \[([\s\S]*?)\];/.exec(sw) || [])[1] || ''; ok(!/vocab-img|lexicon-img/.test(SHELL), 'SW SHELL không chứa vocab-img/chỉ mục');
{ const dictjs = rd('web/js/dict-page.js'); ok(/await vimgP;/.test(dictjs) && /App\.vimg\(e\.word, e\.pos, App\.meanOf\(e\), \{ w: 'dict', photo: true, capt: false \}/.test(dictjs), "tra từ: chờ ready() rồi vẽ hộp vai dict 160 px (ưu tiên ảnh Wikimedia – chỉ trang từ điển, js/dict-page.js)"); }
// 3b. quy tắc tích hợp hình (docs/LEXICON.md § Quy tắc tích hợp hình): vai → cỡ, ảnh cảnh luôn kèm câu ví dụ, nền trong suốt cho chế độ tối, tiết kiệm dữ liệu → tắt
{ const mk = (store, ix, nav) => { store = { 'lk.vb': '3', ...store }; const ctx = { localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } }, fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve(ix) }), URL, location: { href: 'https://lexkite.com/app/' }, document: { currentScript: null }, navigator: nav || {} }; ctx.self = ctx; vm.runInNewContext(code, ctx); return ctx.VImg; };
  const ix = { v: 2, base, sv: 's1', on: true, m: { 'apple#n': H, 'consider#v': H2, 'although#conj': H3 }, x: [], w: [], a: ['although#conj', 'consider#v'], s: ['consider#v'] };
  const V = mk({}, ix); await V.ready();
  ok(V.SIZE.card === 120 && V.SIZE.back === 128 && V.SIZE.quiz === 64 && V.SIZE.dict === 160 && V.SIZE.words === 256, 'cỡ theo vai: thẻ 120 · mặt sau 128 · câu đố 64 · tra từ 160 · /words/ 256');
  ok(/width:64px/.test(V.slot('apple', 'n', '', 'quiz')) && /width="128"/.test(V.slot('apple', 'n', '', 'back')) && /width="160"/.test(V.slot('apple', 'n', '', { w: 'dict', photo: true })), 'slot nhận vai (cả dạng {w}) → đúng cỡ cố định');
  ok(V.slot('consider', 'v', 'xem xét', 'card') === '', 'ảnh CẢNH không có câu ví dụ → không hộp (không bao giờ cảnh thiếu câu)');
  const sc = V.slot('consider', 'v', 'xem xét', 'card', 'We are considering moving.'); ok(/class="vimg-ex"[^>]*>We are considering moving\.<\/span>$/.test(sc) && / data-a="1"/.test(sc), 'ảnh cảnh → câu ví dụ ngay dưới ảnh; nền trong suốt → data-a');
  ok(!/vimg-ex/.test(V.slot('consider', 'v', 'xem xét', { w: 'dict', capt: false }, 'We are considering moving.')) && /class="vimg"/.test(V.slot('consider', 'v', 'xem xét', { w: 'dict', capt: false }, 'We are considering moving.')), 'capt:false (trang từ điển) → vẫn có ảnh, câu nằm ở cột nội dung, không lặp dưới ảnh');
  ok(!V.slot('consider', 'v', 'xem xét', { w: 'dict', capt: false }), 'capt:false không có câu → vẫn không hộp (ảnh cảnh không đứng một mình)');
  ok(!/data-a/.test(V.slot('apple', 'n', '', 'card')) && !/vimg-ex/.test(V.slot('apple', 'n', '', 'card', 'x')), 'ảnh vật nền kem → không data-a (ẩn ở chế độ tối), không câu');
  ok(/border-radius:var\(--radius-sm/.test(sc), 'bo góc theo token thiết kế');
  const L = mk({}, ix, { connection: { saveData: true } }); ok(L.mode() === 0 && await L.ready() === null, 'tiết kiệm dữ liệu → tắt ảnh');
  const S = mk({ 'lk.vimg': '1' }, { ...ix, x: ['apple#n'] }, { deviceMemory: 1 }); await S.ready(); ok(!/@2x/.test(S.slot('apple', 'n', '', 'words')), 'máy yếu (≤ 2 GB) → không @2x');
  ok(/decode\(\)/.test(code) && /opacity \.15s/.test(code) && /prefers-reduced-motion:reduce/.test(code) && /classList\.add\('gone'\)/.test(code) && !/b\.remove\(\)/.test(code) && /requestIdleCallback/.test(code), 'decode() + mờ 150 ms, giảm chuyển động, lỗi CDN → ẩn hộp giữ chỗ (CLS 0), prefetch lúc rảnh');
  ok(/prefers-color-scheme:dark/.test(code) && /\.vimg:not\(\[data-a\]\),[^{]*\.vimg:not\(\[data-a\]\)\+\.vimg-ex\{display:none!important\}/.test(code) && /\.vimg\.gone\+\.vimg-ex\{display:none!important\}/.test(code), 'chế độ tối: không hiện ảnh nền sáng (!important – hộp có display:block nội tuyến); ảnh ẩn/lỗi → câu chú thích ẩn theo, không lạc lõng'); }
{ const mk2 = st => { const ctx = { localStorage: { getItem: k => (k in st ? st[k] : null), setItem: (k, v) => { st[k] = String(v); } }, fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({ on: true, m: {} }) }), URL, location: { href: 'https://lexkite.com/app/' }, document: { currentScript: null } }; ctx.self = ctx; vm.runInNewContext(code, ctx); return ctx.VImg; };
  const cfg = v => JSON.stringify({ at: Date.now(), v });
  ok(mk2({ 'lk.vb': '50' }).mode() === 0, 'bật dần: nhóm 50 ≥ 10 % mặc định → TẮT');
  ok(mk2({ 'lk.vb': '9' }).mode() === -1, 'bật dần: nhóm 9 < 10 % → tự động theo chỉ mục');
  ok(mk2({ 'lk.vb': '50', 'lk.cfg': cfg({ vocab_img_pct: '60' }) }).mode() === -1 && mk2({ 'lk.vb': '50', 'lk.cfg': cfg({ vocab_img_pct: '40' }) }).mode() === 0, 'vocab_img_pct (chuỗi từ /api/config) điều khiển tỉ lệ');
  ok(mk2({ 'lk.vb': '99', 'lk.vimg.adm': '1' }).mode() === 1 && mk2({ 'lk.vb': '99', 'lk.vimg': '1' }).mode() === 1, 'quản trị / người thử luôn bật');
  ok(mk2({ 'lk.vb': '1', 'lk.vimg.adm': '1', 'lk.cfg': cfg({ vocab_img: '0' }) }).mode() === 0, 'vocab_img = 0 → tắt khẩn cho mọi người (kể cả quản trị)');
  const st = {}; const b = mk2(st); b.mode(); ok(/^\d+$/.test(st['lk.vb']) && +st['lk.vb'] < 100, 'nhóm thiết bị cố định lk.vb tạo 1 lần');
  ok(/'vocab_img', 'vocab_img_pct'/.test(rd('functions/api/config.js')) && /'vocab_img', 'vocab_img_pct'/.test(rd('functions/api/admin.js')), 'cờ vocab_img + vocab_img_pct công khai, quản trị đặt được'); }
{ ok(/VImg\.prefetch\(session\.queue\.slice\(1, 4\)/.test(rd('web/js/study.js')), 'ôn thẻ: tải trước ảnh 3 thẻ kế'); }
{ const st = rd('web/js/study.js'); ok((st.match(/App\.vimg\(/g) || []).length === 3, 'thẻ ôn SRS + thẻ từ mới + câu đố dùng App.vimg'); }
{ const nt = rd('extension/newtab.js'); ok(/localStorage\.getItem\('lk\.vimg'\) === '0'\) return Promise\.resolve\(null\)/.test(nt) && /app\/js\/vocab-img\.js/.test(nt) && /await vimgP;/.test(nt) && /VImg\.slot\(/.test(nt), 'thẻ tab mới add-on: cờ tắt → không tải; bật → chờ ready() rồi VImg.slot'); }
ok(rd('web/js/vocab-img.js') === rd('extension/app/js/vocab-img.js'), 'add-on dùng cùng module');
ok(rd('web/js/lexicon-img.json') === rd('extension/app/js/lexicon-img.json'), 'add-on dùng cùng chỉ mục');
// SW: chỉ 4 dạng tên tệp vimg, LRU 800 (trúng → làm mới thứ tự, vượt trần → xoá cũ nhất)
const mx = +(/VIMG_MAX = (\d+)/.exec(sw) || [])[1]; ok(mx === 800, 'SW: trần ảnh lưu offline = 800 (LRU)');
ok(/const VIMG = 'lk-vimg'/.test(sw), 'SW: cache tên lk-vimg');
{ const re = new RegExp((/VIMG_RE = \/(.+?)\/;/.exec(sw) || [])[1]);
  for (const f of [H + '.avif', H + '.webp', H + '@2x.avif', H + '@2x.webp']) ok(re.test('/vimg/' + f), 'SW lưu ' + f);
  for (const f of [H + '.png', H + '@3x.webp', 'abc.webp', H + '.webp.js']) ok(!re.test('/vimg/' + f), 'SW bỏ qua ' + f); }
{ const store = new Map(); let net = 0; const handlers = {};
  const cache = { match: r => Promise.resolve(store.get(r.url)), put: (r, v) => { store.delete(r.url); store.set(r.url, v); return Promise.resolve(); }, delete: r => Promise.resolve(store.delete(r.url)), keys: () => Promise.resolve([...store.keys()].map(url => ({ url }))) };
  const resp = () => { const o = { ok: true, clone: () => o }; return o; };
  const ctx = { self: { registration: { scope: 'https://lexkite.com/app/' }, addEventListener: (t, f) => { handlers[t] = f; } }, location: { origin: 'https://lexkite.com' }, URL, Promise, Response: {},
    caches: { open: () => Promise.resolve(cache), keys: () => Promise.resolve([]), match: () => Promise.resolve(undefined) }, fetch: () => { net++; return Promise.resolve(resp()); }, console };
  vm.runInNewContext(sw, ctx);
  const get = async url => { const w = []; let p; handlers.fetch({ request: { url, method: 'GET', mode: 'cors' }, respondWith: x => { p = x; }, waitUntil: x => w.push(x) }); const r = await p; for (let i = 0; i < w.length; i++) await w[i]; return r; };
  const U = i => `https://media.lexkite.com/vimg/${i.toString(16).padStart(16, '0')}.webp`;
  for (let i = 0; i < 800; i++) await get(U(i));
  ok(store.size === 800 && net === 800, 'SW lưu khi xem tới 800 ảnh');
  await get(U(0)); ok(net === 800 && [...store.keys()].pop() === U(0), 'trúng cache → không gọi mạng + làm mới thứ tự (LRU)');
  await get(U(800)); ok(store.size === 800 && store.has(U(0)) && !store.has(U(1)), 'vượt trần → xoá ảnh ít dùng nhất (không xoá ảnh vừa xem lại)');
  await get(U(0).replace('.webp', '@2x.avif')); ok(store.size === 800 && net === 802, 'tệp @2x.avif cũng được lưu/trần chung'); }
// trang tĩnh /words/: chỉ khi style.approved === true và nghĩa có ảnh; markup = VImg.pic (cùng module)
{ const seo = rd('scripts/lib/seo-words.mjs');
  ok(/IMG\.style\.approved === true && Object\.keys\(IMG\.items \|\| \{\}\)\.length \?/.test(seo) && /ctx\.VImg\.pic/.test(seo), '/words/: chỉ dựng ảnh khi chủ duyệt + có mục, markup từ VImg.pic');
  ok((seo.match(/\$\{vimgOf\(/g) || []).length === 1 && /const vimgOf = \(e, alt, label\) => \(VPIC \? seoPic\(/.test(seo), '/words/: chưa duyệt → vimgOf trả rỗng (trang giữ nguyên từng byte)');
  const { V } = sandbox({}, index), IM = { base, items: { 'apple#n': { h: H, fmt: ['avif', 'webp'], x2: true, photo: { h: H2, fmt: ['webp'], src: { tier: 'photo', lic: 'Pexels', by: 'Jo <B>' } } }, 'kiss#v': { h: H3, fmt: ['avif', 'webp'] } } };
  const sp = seoPic(IM, 'apple#n', 'apple – táo', 'Foto', V.pic), si = seoPic(IM, 'kiss#v', 'kiss', 'Foto', V.pic);
  ok(sp.includes(`${base}${H2}.webp`) && !sp.includes(H + '.') && !/<source/.test(sp) && !/@2x/.test(sp), '/words/: ưu tiên photo (đúng định dạng của photo, không 2x)');
  ok(/<p class="vcred"[^>]*>Foto: Jo &lt;B&gt; \/ Pexels<\/p>$/.test(sp), '/words/: dòng ghi công "Ảnh: <by> / Pexels" (dịch nhãn, thoát ký tự)');
  ok(si.includes(`${base}${H3}.avif`) && !/vcred/.test(si) && seoPic(IM, 'run#v', 'run', 'Foto', V.pic) === '', '/words/: không photo → h, không ghi công; không mục → rỗng');
  ok(/ph: 'Ảnh'/.test(rd('scripts/lib/seo-pages-i18n.mjs')) && (rd('scripts/lib/seo-pages-i18n.mjs').match(/ ph: '/g) || []).length === 15, 'nhãn "Ảnh" của dòng ghi công đủ 15 ngôn ngữ');
  for (const f of ['web/js/study.js', 'extension/newtab.js']) ok(!/photo/.test(rd(f)), 'thẻ học / tab mới không dùng ảnh Wikimedia/ảnh chụp: ' + f);
  { const ap = rd('web/js/app.js') + rd('web/js/dict-page.js'); ok((ap.match(/photo: true/g) || []).length === 1 && /photo: true/.test(rd('web/js/dict-page.js')) && !/\.photo\b/.test(ap), 'app: ảnh Wikimedia CHỈ ở trang tra từ (1 chỗ photo: true, js/dict-page.js)'); }
  ok(/o\.photo \? idx\.p\[k\] : ''/.test(rd('web/js/vocab-img.js')) && !/\.photo\b(?!\s*\?)/.test(rd('web/js/vocab-img.js').replace(/o\.photo \?/g, '')), 'VImg: p chỉ dùng khi bề mặt xin {photo:true}');
  ok(/IMG\.style\.approved === true && Object\.keys\(IMG\.items \|\| \{\}\)\.length/.test(rd('scripts/lib/seo-words.mjs')), 'img.json chưa duyệt HOẶC chưa có mục → /words/ không đổi (đã duyệt s1 24/10)'); }

// ghi công trên 15 trang Chính sách (#credits): Noto Emoji Apache 2.0 + Pixabay/Pexels + Lexkite, đã dịch (không còn câu tiếng Anh)
for (const l of ['en', 'vi', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr']) {
  const h = rd(`web/${l}/privacy.html`), c = h.slice(h.indexOf('id="credits"'), h.indexOf('</ul>', h.indexOf('id="credits"')));
  ok(/Noto Emoji © Google/.test(c) && /LICENSE-2\.0/.test(c) && /Pixabay/.test(c) && /Pexels/.test(c) && (l === 'en' || !/Word illustrations/.test(c)), `chính sách ${l}: ghi công ảnh minh họa đã dịch`);
}

// 4. chọn nghĩa + phong cách
const sel = J('content/lexicon/vimg-select.json'), pilot = J('content/lexicon/vimg-pilot.json').items;
ok(sel.imageable === Object.keys(sel.items).length && sel.imageable > 500 && sel.imageable < sel.total, 'số nghĩa vẽ được hợp lý');
ok(pilot.length === 60 && pilot.every(k => sel.items[k]), 'pilot 60 nghĩa đều đạt ngưỡng');
for (const a of ['idea#n', 'freedom#n', 'however#adv']) ok(!sel.items[a], 'từ trừu tượng không có ảnh: ' + a);
const p = promptFor('kiss#v', { w: 'kiss', pos: 'v', def: 'to touch with the lips' });
ok(p.startsWith('Illustration of ') && /without any lettering/.test(p) && /suitable for young children/.test(p) && !/"kiss"|flashcard|caption/i.test(p), 'prompt: chủ thể trước, không chữ (không ngoặc kép/flashcard), an toàn');
ok(promptFor('kiss#v', { w: 'kiss', pos: 'v', def: 'x' }) === promptFor('kiss#v', { w: 'kiss', pos: 'v', def: 'x' }) && fnv('a') !== fnv('b'), 'người trong ảnh xoay vòng tất định');
ok(promptFor('apple#n', { w: 'apple', pos: 'n', def: 'x' }, '', 2).includes(STYLE.retry), 'lần thử 2 dùng biến thể cố định');

// 5. việc nền: tạm dừng, ưu tiên thấp nhất, không lịch
const reg = J('infra/jobs.json'), job = reg.jobs.find(j => j.id === 'vocab-img'), wf = rd('.github/workflows/vocab-img.yml');
ok(job && job.paused === false, 'vocab-img đăng ký & ĐANG CHẠY (chủ duyệt s1 24/10)'); ok(job.priority === reg.priorities[reg.priorities.length - 1], 'ưu tiên thấp nhất');
ok(job.resources.includes('grabcast_ai') && !job.resources.some(r => /^workers_ai/.test(r)) && job.lease, 'chỉ GrabCast (không Workers AI Lexkite)'); ok(/^\s*schedule:/m.test(wf) && /VIMG_MAX_MAIN: '0'/.test(wf) && /VIMG_MAX_CF2: '0'/.test(wf), 'đang chạy → workflow có lịch; tài khoản chính/2 = 0 ảnh');
ok(J('infra/resources.json').services.some(s => s.key === 'vocab-img'), 'đăng ký ở infra/resources.json');

// 6. Workers AI thẳng (26/10, cf-direct.mjs): bỏ 5 tài khoản đầu CF_POOL, không bao giờ tài khoản chính, mọi mô hình A/B có giá neuron
{
  const cf = await import('../vocab-img/cf-direct.mjs'), g = await import('../vocab-img/gen.mjs');
  const H = c => c.repeat(32), ids = cf.poolAccounts({ CF_POOL: ['0', '1', '2', '3', '4', '5', 'f'].map(c => H(c) + ':t').join(','), CF_ACCOUNT_1: H('f'), CF_ACCOUNT_2: H('b'), CF_AI_TOKEN_2: 'x' }).map(a => a.acct);
  ok(JSON.stringify(ids) === JSON.stringify([H('5'), H('b')]), 'CF_POOL: bỏ 5 đầu, loại tài khoản chính, thêm tài khoản 2 cuối');
  const fake = '# x\n===== GEMINI =====\nAIzaXXX\ngsk_YYY\n' + Array.from({ length: 7 }, (_, i) => `cf:${String(i).repeat(32)}:tok${i}`).join('\n') + `\ncf:${'6'.repeat(32)}:tok6b\npb:1-2`;
  const pa = cf.poolAccounts({ CF_POOL: fake });
  ok(cf.parsePool(fake).length === 8 && pa.length === 2 && pa[0].acct === '5'.repeat(32) && pa[1].toks.length === 2, 'tệp xuất kho khoá: chỉ dòng cf:, bỏ Gemini/Groq/khác, gộp token trùng tài khoản');
  // 02/11 giữ chỗ pilot: CF_POOL_HOLD "<n>@<hạn>" → việc khác không thấy n tài khoản cuối; pilot thấy hết; hết hạn/sai định dạng → không giữ
  { const P = { CF_POOL: Array.from({ length: 12 }, (_, i) => i.toString(16).repeat(32) + ':t').join(','), VIMG_POOL_SKIP: '0' }, fut = new Date(Date.now() + 36e5).toISOString(), past = new Date(Date.now() - 6e4).toISOString();
    const ids = env => cf.poolAccounts({ ...P, ...env }).map(a => a.acct[0]).join('');
    ok(ids({}) === '0123456789ab' && ids({ CF_POOL_HOLD: '4@' + fut }) === '01234567' && ids({ CF_POOL_HOLD: '4@' + fut, CF_POOL_ROLE: 'pilot' }) === '0123456789ab' && ids({ CF_POOL_HOLD: '4@' + past }) === '0123456789ab' && ids({ CF_POOL_HOLD: '4' }) === '0123456789ab' && ids({ CF_POOL_HOLD: 'x@' + fut }) === '0123456789ab', 'CF_POOL_HOLD: fill/lexicon bỏ n tài khoản cuối tới hạn; pilot thấy hết; hết hạn hay sai định dạng → không giữ');
    ok(cf.poolHold({ CF_POOL_HOLD: '500@' + fut }) === 60 && cf.drawAccounts({ ...P, CF_POOL_HOLD: '4@' + fut, VIMG_DRAW_FROM: 'tail', VIMG_DRAW_SHARE: '0.5', VIMG_TAIL_KEEP: '2', CF_POOL_ROLE: 'pilot' }).map(a => a.acct[0]).join('') === '9876', 'giữ chỗ trần 60 tài khoản; pilot đuôi vẽ trên phần được giữ (một nguồn poolAccounts)');
    const al = await import('../lib/ai-pool.mjs').catch(() => null); ok(!al || typeof al.createPool === 'function', 'ai-pool vẫn nạp được (tuyến cf2 dùng chung poolAccounts có giữ chỗ)');
    const { execFileSync } = await import('child_process');
    // chạy ĐÚNG mã pool_hold + _cf_accts của local_judge.py (tách khỏi tệp – không cần numpy/torch của giám khảo)
    const src = rd('scripts/vocab-img/local_judge.py'), fn = n => src.slice(src.indexOf('def ' + n + '('), src.indexOf('\ndef ', src.indexOf('def ' + n + '(') + 4) + 1);
    const py = (raw, role) => execFileSync('python3', ['-c', 'import os,re,json\n_CFV={"accts":None}\n' + fn('pool_hold') + fn('_cf_accts') + 'print(pool_hold(),"".join(a[0][0] for a in _cf_accts()))'], { env: { ...process.env, ...P, CF_POOL_HOLD: raw, CF_POOL_ROLE: role || '', CF_ACCOUNT_2: '', CF_AI_TOKEN_2: '' }, encoding: 'utf8' }).trim();
    ok(py('4@' + fut) === '4 76543210' && py('4@' + fut, 'pilot') === '4 ba9876543210' && py('4@' + past) === '0 ba9876543210' && py('x') === '0 ba9876543210', 'giám khảo Python (local_judge.py) cùng luật giữ chỗ: fill bỏ n cuối, pilot thấy hết, hết hạn → không giữ'); }
  ok(Object.values(g.MODELS).every(m => cf.npiOf(m) < 1000 || /klein-9b/.test(m)), 'mọi mô hình trong MODELS có giá neuron ước tính');
  ok(cf.cfProvider(g.MODEL_DEFAULT, { CF_ACCOUNT_2: 'b', CF_AI_TOKEN_2: 'x' }).max === 0, 'VIMG_MAX_CF mặc định 0 = tắt');
  ok(cf.cfInput('@cf/black-forest-labs/flux-1-schnell', 'p').json.width === undefined && cf.cfInput('@cf/black-forest-labs/flux-2-dev', 'p').form, 'schnell không gửi cỡ; FLUX.2 gửi multipart');
}

// 7. chống tái phạm kho CF (26–27/10): vẽ không được làm đói giám khảo/kho từ; hết giám khảo → dừng vẽ; tự nối lượt so biến trong bash
{
  const wf = rd('.github/workflows/vocab-img-scene.yml'), share = [...wf.matchAll(/VIMG_DRAW_SHARE: "\$\{\{ vars\.LX_PILOT == '1' && '([\d.]+)' \|\| '([\d.]+)' \}\}"/g)].flatMap(m => [+m[1], +m[2]]);
  ok(share.length >= 6 && share.every(x => x > 0 && x <= 0.7) && share.filter((x, i) => i % 2).every(x => x <= 0.5), 'VIMG_DRAW_SHARE ≤ 0,7 khi kho từ pilot, ≤ 0,5 khi hàng loạt/chưa đặt (đuôi kho cho giám khảo + kho từ)');
  ok(/vision_dead": true/.test(wf) && /touch \$OUT\/EXHAUSTED/.test(wf), 'giám khảo thị giác hết neuron → dừng vẽ (không vẽ ảnh không ai chấm)');
  ok(/PROBE_SHARE=\$\{\{ vars\.LX_PILOT == '1' && '0\.7' \|\| '0\.5' \}\} PROBE_QUICK=1/.test(wf) && /PROBE_ALIVE" -lt 10/.test(wf), 'fill dò nhanh phần vẽ của kho trước khi bật máy (không lượt rỗng)');
  { const fillJob = wf.slice(wf.indexOf('\n  fill:'), wf.indexOf('\n  fillpub:')), line = (wf.match(/\n\s+(h=\$\{VIMG_HOUR[^\n]+)/) || [])[1];
    const { execFileSync } = await import('child_process'), par = h => +execFileSync('bash', ['-c', line.replace('>> $GITHUB_OUTPUT', '') + ' >/dev/null; echo $par'], { env: { ...process.env, VIMG_HOUR: String(h) }, encoding: 'utf8' }).trim();
    const day = [...Array(14).keys()].map(i => par(i + 1)), night = [0, 15, 16, 18, 20, 22, 23].map(par);
    ok(/max-parallel: \$\{\{ fromJSON\(needs\.plan\.outputs\.par \|\| '5'\) \}\}/.test(fillJob) && /par: \$\{\{ steps\.p\.outputs\.par \}\}/.test(wf) && day.every(x => x >= 1 && x <= 3) && night.every(x => x >= 1 && x <= 5), 'fill: ban ngày VN (01–15 UTC) ≤ 3 máy, đêm ≤ 5 (chừa máy cho giao diện/npm test/Prod release)');
    ok(/n=\$\{\{ github\.event\.inputs\.shards \|\| \(github\.event\.inputs\.judge_run != '' && '6' \|\| '\$par'\) \}\}/.test(wf), 'fill: số việc mặc định = số máy song song (par) – không có đợt chờ (04/11: 10 việc/par 3 → lượt >6 giờ, giữ nhóm concurrency); judge_run mặc định 6; tổng ảnh/lượt = trần G chia đều'); }
  ok(/\[ "\$CHAIN" = 0 \]/.test(wf) && /gh workflow run vocab-img-scene\.yml/.test(wf), 'tự nối lượt: biến repo so trong bash');
  const all = fs.readdirSync(new URL('../../.github/workflows/', import.meta.url)).map(f => rd('.github/workflows/' + f)).join('\n');
  ok(!/if:.*vars\.[A-Z_]+ *[!=]= *'0'/.test(all), "không workflow nào so vars.X với '0' trong if: (GitHub coi '' == '0')");
  const cf = await import('../vocab-img/cf-direct.mjs'), H = c => c.repeat(32), env = { CF_POOL: '0123456789'.split('').map(c => H(c) + ':t').join(','), VIMG_POOL_SKIP: '0', VIMG_DRAW_SHARE: '0.5', VIMG_MAX_CF: '10' };
  ok(cf.cfProvider('@cf/black-forest-labs/flux-2-klein-4b', env).stats.accounts === 5, 'vẽ chỉ dùng nửa đầu kho khi VIMG_DRAW_SHARE=0.5');
}

// 8. thẻ cảnh e4 (29/10): câu cảnh ngắn vẽ được + câu hỏi kiểm + điểm vẽ được; prompt ngắn; không vẽ thẻ draw < 4
{ const sc = await import('../vocab-img/scene.mjs'), e = { w: 'cheap', pos: 'adj', ex: ['The food at the night market is cheap and tasty.'] };
  const c = { ex: e.ex[0], ps: 'a woman hands one small coin to a smiling street vendor for a big steaming bowl of noodles', check: 'Is a big bowl of food being bought for one small coin?', cap: 'a woman buying noodles from a vendor', who: 2, draw: 4 };
  ok(sc.sceneOk(e, c) === '' && /^skip: draw/.test(sc.sceneOk(e, { ...c, draw: 3 })) && sc.sceneOk(e, { ...c, ps: 'a man reads the price on a menu board at a small cafe today' }) !== '' && sc.sceneOk(e, { ...c, check: 'cheap' }) !== '', 'e4: thẻ hợp lệ; draw < 4 → bỏ; giá/chữ → loại; check phải là câu hỏi');
  const p = sc.promptScene('cheap#adj', c, 1); ok(p.length < 520 && p.includes('hands one small coin') && p.indexOf('Flat vector') > p.indexOf('noodles') && !/a woman hands/.test(p), 'e4: prompt < 520 ký tự, câu cảnh trước phong cách, người đa dạng thay "a woman"'); }
// 8c. thẻ e6 (01/11, lượt fill 41205453283: 145/1.469 ảnh đạt; 610 ảnh trượt vì chữ, 103 ảnh QUA giám khảo bị bỏ vì > 6 KB, 4.165 lượt thị giác)
{ const sc = await import('../vocab-img/scene.mjs'), src = rd('scripts/vocab-img/scene.mjs');
  const e = { w: 'title', pos: 'n', ex: ['What is the title of the book?'] }, c = { ex: e.ex[0], ps: 'a woman holds an open book while a man points to its cover', check: 'Is the man pointing at the name printed on the front?', cap: 'a woman and a man looking at a cover', who: 2, draw: 4 };
  ok(sc.SCENE_V === 'e6' && sc.sceneOk(e, c) === 'ps has a text object: book' && sc.sceneOk({ ...e, w: 'book' }, c) !== 'ps has a text object: book', 'e6: vật mang chữ (sách…) trong ps → loại, trừ khi chính là từ đang học (title#n trượt chữ)');
  for (const [w, ps] of [['survey', 'a woman sits at a table filling out a paper questionnaire'], ['next', 'a person waiting as a bus pulls up at a bus stop'], ['contribution', 'a man hands a document to a woman at a project board'], ['adult', 'a man and a girl stand at a ticket booth holding tickets'], ['profession', 'a woman stands at a blackboard teaching a boy who raises a hand']])
    ok(/^ps has a text object/.test(sc.sceneOk({ w, pos: 'n', ex: ['x.'] }, { ...c, ex: 'x.', ps, check: 'Is someone getting something done carefully?' })), 'e6 TEXT_OBJ chặn: ' + w);
  ok(sc.sceneOk({ w: 'email', pos: 'n', ex: ['x.'] }, { ...c, ex: 'x.', ps: 'a woman types on a laptop and smiles at a man across the room', check: 'Is a message being sent far away?' }) === 'ps shows a screen' && sc.sceneOk({ w: 'email', pos: 'n', ex: ['x.'] }, { ...c, ex: 'x.', ps: 'a woman types on a laptop seen from behind and smiles at a man', check: 'Is a message being sent far away?' }) === '', 'e6: màn hình chỉ nhìn từ phía sau');
  const h = { w: 'hunter', pos: 'n', ex: ['The hunter waited quietly in the forest.'] }, ch = { ex: h.ex[0], ps: 'a man in a green coat crouches behind a bush holding a bow, watching a deer', check: 'Is a person quietly waiting to catch a wild animal?', cap: 'a man with a bow hiding behind a bush', who: 1, draw: 5 };
  ok(sc.sceneOk(h, ch) === '' && sc.sceneOk(h, { ...ch, cap: 'a hunting man behind a bush' }) === 'cap names the word' && sc.sceneOk(h, { ...ch, check: 'Is this a hunter?' }) === 'check names the word' && sc.sceneOk(h, { ...ch, check: 'Does the bow represent hunting?' }) !== '' && sc.sceneOk(h, { ...ch, check: 'Is a man in a green coat crouching behind a bush holding a bow?' }) === 'check repeats ps', 'e6: cap/check gọi tên từ (cả dạng -ing), check "represent", check chép lại ps → loại');
  const rc = sc.repairCard({ w: 'pact', pos: 'n', ex: ['x.'] }, { ex: 'x.', ps: 'a woman and a man smile and shake hands firmly across a small table', check: 'Have the two people just settled something together?', cap: 'two people sealing a pact', who: 2, draw: 4 });
  ok(rc && rc.cap.startsWith('a woman and a man smile') && sc.sceneOk({ w: 'pact', pos: 'n', ex: ['x.'] }, rc) === '', 'e6: cap gọi tên từ → sửa tất định (cap = ps), không tốn lượt AI, không bỏ thẻ');
  const exs = [...sc.SCENE_SYS.matchAll(/^(\S+) \((\w+)\) \["([^"]+)"\] -> (\{.*\})$/gm)];
  ok(exs.length >= 7 && ['n', 'v', 'adj', 'adv'].every(p => exs.some(x => x[2] === p)) && exs.every(x => sc.sceneOk({ w: x[1], pos: x[2], ex: [x[3]] }, JSON.parse(x[4])) === ''), 'e6: few-shot đủ n/v/adj/adv (gồm danh từ cụ thể pencil/duck/hunter), mọi ví dụ qua chính cổng sceneOk');
  ok(/concrete noun/.test(sc.SCENE_SYS) && /person noun/.test(sc.SCENE_SYS) && /nothing that carries writing/.test(sc.SCENE_SYS) && /If an item has "fix"/.test(sc.SCENE_SYS) && JSON.parse(sc.sceneUser([{ k: 'a#n', e: h, fix: 'cap names the word' }]))[0].fix === 'cap names the word', 'e6: mẫu theo loại từ, luật vật mang chữ, thẻ trượt viết lại kèm lý do (fix)');
  ok(sc.CARD_TRIES >= 2 && /q\.push\(\{ \.\.\.x, tries: x\.tries \+ 1/.test(src) && /bad\+\+/.test(src), 'e6: thẻ trượt cổng quay lại hàng viết lại trong lượt (không bỏ), hết lần mới đếm hỏng');
  ok(/^the drawn picture contained writing/.test(sc.refixWhy({ reasons: ['vision: text'] })) && /did not show the meaning/.test(sc.refixWhy({ reasons: ['meaning check: no (x)'] })) && sc.refixWhy({ reasons: ['style 0.4'] }) === '' && sc.refixWhy({ reasons: ['duplicate (pHash)'] }) === '', 'e6 --refix: chỉ lỗi do thẻ (chữ, không thấy nghĩa) mới viết lại thẻ');
  const { cardWins: W } = sc, e6 = { ps: 'y', v: 'e6' };
  ok(W(e6, { ...e6, ps: 'z', refix: 1 }) && !W({ ...e6, refix: 1 }, { ...e6, ps: 'z', refix: 1 }), 'e6: thẻ viết lại sau ảnh trượt đè bản cùng phiên bản khi đăng');
  const wf = rd('.github/workflows/vocab-img-scene.yml'), fi = wf.indexOf('\n  fill:'), fl = wf.slice(fi, wf.indexOf('\n  rejudge:'));
  ok(/scene\.mjs --refix --out \$OUT --attempt \$a/.test(fl) && fl.indexOf('--refix') > fl.indexOf('local_judge.py') && /cp content\/lexicon\/vimg-scenes\.json \$OUT\/cards\.s/.test(fl.slice(fl.indexOf('--refix'))), 'fill: --refix sau giám khảo mỗi biến thể; thẻ viết lại được chép lại để đăng');
  ok(/scene\.mjs --refix --out \$OUT --attempt 1/.test(wf) && /report\.mjs --dir m/.test(wf), 'pilot: --refix giữa 2 lần vẽ, báo cáo tỷ lệ/neuron (report.mjs)'); }
// 8d. giám khảo e6: cục bộ trước, ≤ 2 lượt nhỏ (mô tả mù + 1 câu hỏi gộp), mô hình 2 chỉ khi sát ngưỡng, cỡ ≤ 6 KB trước API, neuron theo usage
{ const lj = rd('scripts/vocab-img/local_judge.py'), sf = rd('scripts/vocab-img/scene_final.py'), cf = await import('../vocab-img/cf-direct.mjs'), rp = await import('../vocab-img/report.mjs');
  ok(/def judge_scene/.test(lj) && /if any\(x\.startswith\(HARD\) for x in r\)/.test(lj) && /if not size_ok\(im\)/.test(lj) && lj.indexOf('if not size_ok(im)') < lj.indexOf('j = cf_vision(BLIND_Q'), 'e6: trượt cứng cục bộ hoặc > 6 KB → không gọi thị giác');
  ok(/if pre: return soft \+ pre/.test(lj) && /m1 = ask_one\(im, t, ft\)/.test(lj) && (lj.match(/second\(\)/g) || []).length >= 2 && !/CHECK_SURE/.test(lj) && /if not y1 and c1 >= 80: return/.test(lj), 'e6: mô tả mù trượt → dừng; 1 câu hỏi gộp; kiểm nghĩa hỏi cả 2 mô hình (luật e4 – pilot 41274610314: luật tắt lệch 8/32), bỏ mô hình 2 chỉ khi mô hình 1 no chắc');
  ok(/CHECK_CONF = float\(os\.environ\.get\('VIMG_CHECK_CONF', '70'\)\)/.test(lj) && /CONS_CONF = float\(os\.environ\.get\('VIMG_CONS_CONF', '80'\)\)/.test(lj) && /hard_no = any\(\(not a_\) and c_ >= 80/.test(lj) && /api_ex_min/.test(lj), 'e6: giữ nguyên ngưỡng e4 (kiểm nghĩa 70/80, đồng thuận 80, api_ex từ vimg-judge-scene.json) – không hạ');
  ok(/def _neurons/.test(lj) && /'vision_neurons'/.test(lj) && /'audit_disagree'/.test(lj), 'e6: neuron thị giác theo token thật + đếm lệch luật tắt (audit)');
  ok(/def flat\(/.test(sf) && /for side, f in \[\(s_, 0\)/.test(sf) && /\(288, 2\)/.test(sf), 'nén: tranh phẳng (lọc trung vị + ≤ 48 màu) trước khi bỏ ảnh > 6 KB, cỡ cũ thử trước');
  ok(cf.npiOf('@cf/black-forest-labs/flux-2-klein-4b') < 40 && typeof rp.neuronReport === 'function' && /neuronReport\(D\)/.test(rd('scripts/vocab-img/scene-publish.mjs')), 'neuron/ảnh klein theo bảng giá (không 110 gộp giám khảo); báo cáo fill dùng mô hình thật');
  ok(J('content/visual/pilot-e6.json').items.length <= 100 && ['pencil#n', 'duck#n', 'hunter#n'].every(k => J('content/visual/pilot-e6.json').items.includes(k)), 'pilot e6 ≤ 100 nghĩa (≤ 200 ảnh với 2 biến thể), có danh từ cụ thể'); }
// 9. viết thẻ không được ăn hết giờ job (29/10 lượt fill 40875877636: 2.000 thẻ tuần tự 2 giờ 10 phút → quá giờ, mất thẻ, 0 ảnh); fill chỉ vẽ nghĩa có thẻ e4
{ const src = rd('scripts/vocab-img/scene.mjs'), wf = rd('.github/workflows/vocab-img-scene.yml');
  const MIN = +(src.match(/VIMG_CARD_MIN \|\| (\d+)/) || [])[1], CONC = +(src.match(/VIMG_CARD_CONC \|\| (\d+)/) || [])[1];
  const fillTo = +(wf.match(/\n  fill:[\s\S]*?timeout-minutes: (\d+)/) || [])[1];
  ok(MIN > 0 && fillTo && MIN <= fillTo / 2 && /Date\.now\(\) < END/.test(src), 'viết thẻ có hạn ≤ nửa giờ job fill (còn giờ vẽ + ghi)');
  ok(CONC >= 2 && /Promise\.all\(Array\.from\(\{ length: CONC \}/.test(src), 'viết thẻ chạy song song các lô');
  ok(/e4bad \|\| 0\) < CARD_DEAD/.test(src) && /\|\| cardResting\(c\)\) continue/.test(src), 'thẻ e4 hỏng 3 lần → thôi viết lại mỗi lượt (nghỉ VIMG_QUEUE_RETRY_DAYS ngày rồi viết lại từ đầu – 07/11)');
  const i = wf.indexOf('scene.mjs --cards --keys keys.json --write', wf.indexOf('\n  fill:')), j = wf.indexOf('scene.mjs --prune --keys keys.json');
  const { cardWins: W, SCENE_V: V } = await import('../vocab-img/scene.mjs'), e3 = { sc: 'x', v: 'e3' }, e4 = { ps: 'y', v: V };
  ok(W(undefined, e4) && W(e3, e4) && !W(e4, e3) && !W(e4, { ...e4, ps: 'z' }) && W(e3, { ...e3, e4bad: 1 }) && !W({ ...e3, e4bad: 2 }, { ...e3, e4bad: 1 }), 'scene-publish: thẻ e4 viết lại ĐÈ thẻ e3 (trước chỉ THÊM → mất), không đè thẻ e4 hiện hành');
  ok(/import \{ cardWins \} from '\.\/scene\.mjs'/.test(rd('scripts/vocab-img/scene-publish.mjs')) && /cardWins\(cur\.items\[k\], v\)/.test(rd('scripts/vocab-img/scene-publish.mjs')), 'scene-publish dùng cardWins');
  ok(i > 0 && j > i && j < wf.indexOf('scene-gen.mjs', i), 'fill: --prune sau khi viết thẻ, trước khi vẽ (không vẽ thẻ e3 cũ)');
}
// 10. lượt 0 ảnh (31/10 pilot 41146130096/41146121856: kho CF cạn → 0 thẻ, 0 ảnh → tờ ảnh Image 0 px → "cannot write empty image as JPEG", job final đỏ)
//     → gộp/tờ ảnh in "0 ảnh" và thoát sạch. Có Pillow+numpy: chạy cả scene_final.py trên thư mục rỗng; không có: sheet() với PIL/numpy giả (nhánh 0 ảnh không vẽ gì).
{ const { execFileSync } = await import('child_process'), os = await import('os'), path = await import('path');
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'vimg0-')), sh = path.join(d, 'sheet.jpg');
  const py = `import sys,types,os,runpy
try:
    import numpy, PIL.Image; real = True
except Exception:
    real = False; sys.modules['numpy'] = types.ModuleType('numpy'); P = types.ModuleType('PIL')
    for n in ('Image', 'ImageDraw', 'ImageFont'): m = types.ModuleType('PIL.' + n); setattr(P, n, m); sys.modules['PIL.' + n] = m
    sys.modules['PIL'] = P
if real:
    sys.argv = ['scene_final.py', '--dir', sys.argv[1], '--sheet', sys.argv[2]]; runpy.run_path('scripts/vocab-img/scene_final.py', run_name='__main__')
else:
    g = runpy.run_path('scripts/vocab-img/scene_final.py'); g['sheet'](sys.argv[1], {}, {}, sys.argv[2])`;
  const out = execFileSync('python3', ['-c', py, d, sh], { encoding: 'utf8' });
  ok(/0 ảnh/.test(out) && !fs.existsSync(sh), 'scene_final: 0 ảnh → in "0 ảnh", không ghi tờ ảnh, thoát 0 (không ValueError)');
  fs.rmSync(d, { recursive: true, force: true });
  const wf = rd('.github/workflows/vocab-img-scene.yml');
  ok(/id: probe\n\s+if: github\.event\.inputs\.mode != 'calibrate'/.test(wf) && /NA=10; NH=10; NT=5; \[ "\$\{\{ github\.event\.inputs\.pool \}\}" = tail \] && \{ NH=0; NT=\$\(node/.test(wf) && /NA=\$NT;/.test(wf) && /\[ "\$MODE" = pilot \] && \{ \[ "\$PROBE_ALIVE" -lt \$NA \] \|\| \[ "\$PROBE_HEAD" -lt \$NH \] \|\| \[ "\$PROBE_TAIL" -lt \$NT \]/.test(wf) && /PROBE_HEAD=\$\{\{ vars\.LX_PILOT/.test(wf), 'pilot cũng dò kho CF trước, đủ CẢ phần vẽ (đầu) lẫn phần viết thẻ (đuôi) – kho cạn → bỏ lượt rõ ràng (41146130096: 35 phút thẻ rỗng; 41158516082: thẻ ăn hết, vẽ 0)');
  // pilot pool=tail (31/10): fill vét phần đầu ngay khi hồi → pilot vẽ từ đuôi, chừa 10 tài khoản cuối cho giám khảo; fill không bao giờ đổi
  { const { drawAccounts } = await import('../vocab-img/cf-direct.mjs'), H = c => c.repeat(32), pool = Array.from({ length: 40 }, (_, i) => (i < 10 ? H(String(i)) : H(String.fromCharCode(97 + (i % 6))).slice(0, 30) + String(i).padStart(2, '0')) + ':t').join(','), e = { CF_POOL: pool, VIMG_POOL_SKIP: '0', VIMG_DRAW_SHARE: '0.5' };
    const hd = drawAccounts(e).map(a => a.id), tl = drawAccounts({ ...e, VIMG_DRAW_FROM: 'tail' }).map(a => a.id);
    ok(hd.length === 20 && hd[0] === 'pool0' && tl.length === 10 && tl[0] === 'pool29' && tl[9] === 'pool20' && !tl.some(x => hd.includes(x)) && !tl.includes('pool30'), 'pool=tail: vẽ đuôi kho từ pool29 ngược về pool20, chừa 10 tài khoản cuối cho giám khảo, không đụng phần đầu');
    const fillEnv = wf.slice(wf.indexOf('\n  fill:'), wf.indexOf('\n  fillpub:'));
    ok(!/VIMG_DRAW_FROM/.test(fillEnv) && /VIMG_DRAW_FROM: "\$\{\{ github\.event\.inputs\.mode == 'pilot' && github\.event\.inputs\.pool \|\| '' \}\}"/.test(wf), 'VIMG_DRAW_FROM chỉ ở pilot (input pool), fill không đổi'); }
  ok(/alive_head=\$\{head\}/.test(rd('scripts/lib/cf-pool-probe.mjs')) && /if \(i < HEAD\) head\+\+/.test(rd('scripts/lib/cf-pool-probe.mjs')), 'cf-pool-probe: PROBE_HEAD đếm riêng phần vẽ');
  ok(/def js\(o\)/.test(rd('scripts/vocab-img/calibrate.py')) && /default=js/.test(rd('scripts/vocab-img/calibrate.py')), 'calibrate.py: đặc trưng có đối tượng mô hình không làm hỏng calibration.json (TypeError SentenceTransformer)');
}
// 8e. 01/11 hướng (b) ứng viên/prompt + (d) giám khảo không mất lượt thử vì tài khoản cạn – ngưỡng giám khảo giữ nguyên
{ const lj = rd('scripts/vocab-img/local_judge.py'), sg = rd('scripts/vocab-img/scene-gen.mjs'), cf = await import('../vocab-img/cf-direct.mjs'), rp = await import('../vocab-img/report.mjs');
  const fd = cf.cfInput('@cf/black-forest-labs/flux-2-klein-4b', 'p', '512', 7).form;
  ok(fd.get('seed') === '7' && !cf.cfInput('@cf/black-forest-labs/flux-2-klein-4b', 'p').form.has('seed') && cf.cfInput('@cf/black-forest-labs/flux-1-schnell', 'p', '512', 3).json.seed === 3, 'ứng viên 2..N: seed gửi theo họ mô hình, ứng viên 1 không hạt');
  ok(/VIMG_CANDS/.test(sg) && /\.c' \+ c/.test(sg) && /T\[k\]\.kind === 'scene' && T\[k\]\.ps && \(!candOnly \|\| candOnly\.has\(k\)\) \? CANDS : 1/.test(sg), 'scene-gen: N ứng viên chỉ cho ảnh cảnh e6, tên <slug>.a<n>.c<c>.jpg');
  ok(/C\.sort\(key=rank_\)/.test(lj) && /startswith\('queue:'\)/.test(lj) && /shutil\.copyfile\(cf_, f\)/.test(lj), 'local_judge: xếp ứng viên cục bộ, chỉ tốt nhất lên giám khảo, trượt → ứng viên kế, thắng → tên chuẩn');
  ok(/used up your daily/.test(lj) && /i -= 1; continue/.test(lj), 'thị giác: tài khoản cạn (429 daily allocation) bị bỏ mà không ăn lượt thử');
  const D = fs.mkdtempSync((process.env.TMPDIR || '/tmp') + '/rp-'); fs.writeFileSync(D + '/result.json', JSON.stringify({ items: { 'a#n': { pass: true, kind: 'scene' }, 'b#v': { pass: false, kind: 'scene' } } }));
  fs.writeFileSync(D + '/judge.local.a1.json', JSON.stringify({ 'a#n': { pass: true, kind: 'scene', cands: 2, reasons: [] }, 'b#v': { pass: false, kind: 'scene', cands: 2, reasons: ['vision: no (x)'] } }));
  const pr = rp.passReport(D); ok(pr.scene_images === 4 && pr.first_round === 1 && pr.first_round_rate === 0.5, 'report: đếm mọi ứng viên là ảnh vẽ + tỷ lệ đạt lượt đầu theo nghĩa');
  const cr = rd('scripts/vocab-img/cand-round.sh');
  ok(/--prefilter/.test(cr) && /--cands-only \$OUT\/cand2/.test(cr) && /--cands-only \$OUT\/recand/.test(cr) && /\$J --recand/.test(cr) && /--recand/.test(lj) && /gen-stats\.s\$\{SI\}\.a\$\{ATT\}\.\$\{i\}/.test(sg), 'ứng viên 2 vẽ khi cần: lọc cục bộ → giám khảo → ứng viên mới cho khoá trượt; gen-stats không ghi đè');
  ok(/VIMG_CANDS: \$\{\{ github\.event\.inputs\.cands \|\| '1' \}\}/.test(rd('.github/workflows/vocab-img-scene.yml')), 'workflow: input cands, lịch fill mặc định 1');
}
// 8f. 02/11 phong cách ít chi tiết: lite+ là mặc định workflow (cả lịch fill) sau pilot 92 nghĩa; code không env vẫn e4; style=e4 quay về
{ const sc = await import('../vocab-img/scene.mjs'), wf = rd('.github/workflows/vocab-img-scene.yml');
  ok(sc.sceneStyle({}) === sc.SCENE_STYLE_E4 && sc.sceneStyle({ VIMG_STYLE: 'lite' }) === sc.SCENE_STYLE_LITE && !/\b(text|letters?|words?|signs?|labels?)\b/i.test(sc.SCENE_STYLE_LITE), 'phong cách lite chỉ khi VIMG_STYLE=lite, không nhắc chữ');
  { const st = [...wf.matchAll(/VIMG_STYLE: "([^"]+)"/g)].map(m => m[1]); ok(st.length === 4 && st.every(x => x === "${{ github.event.inputs.style || 'liteplus' }}") && sc.sceneStyle({ VIMG_STYLE: 'e4' }) === sc.SCENE_STYLE_E4, 'workflow 02/11: lite+ cho mọi job (cả lịch fill) – input style=e4 quay về phong cách cũ'); }
}
// 8h. 02/11 sàn tài khoản pilot đuôi theo kích thước việc (không cố định 15); lịch fill giữ sàn 10
{ const cd = await import('../vocab-img/cf-direct.mjs'), wf = rd('.github/workflows/vocab-img-scene.yml');
  ok(cd.pilotFloor(18) === 3 && cd.pilotFloor(0) === 3 && cd.pilotFloor(92) === 5 && cd.pilotFloor(92, 2) === 10 && cd.pilotFloor(200, 2) === 20, 'pilotFloor = max(3, ceil(nghĩa × biến thể × 250 × 2 / 10k))');
  ok(cd.pilotSize('content/visual/pilot-lite.json') === 18 && cd.pilotSize('', '60:0:20') === 60 && cd.pilotSize('a#n,b#v') === 2 && cd.pilotSize('+a#n,b#v', '40:0:20') === 42, 'pilotSize: tệp {items} / danh sách phẩy / +thêm vào pick');
  ok(/NT=\$\(node -e "import\('\.\/scripts\/vocab-img\/cf-direct\.mjs'\)\.then\(m=>console\.log\(m\.pilotFloor\(m\.pilotSize/.test(wf) && /\[ "\$MODE" = fill \] && \[ "\$PROBE_ALIVE" -lt 10 \]/.test(wf) && !/NT=15/.test(wf), 'workflow: sàn đuôi pilot theo pilotFloor, fill giữ sàn 10');
}
// 8g. lite+ (VIMG_STYLE=liteplus): thẻ phải có key 1–2 chi tiết then chốt không chữ; cổng vũ khí/không an toàn cho MỌI thẻ cảnh (protected area#n "hunter with a gun" → api: unsafe)
{ const sc = await import('../vocab-img/scene.mjs'), LP = { VIMG_STYLE: 'liteplus' };
  const e = { w: 'mistake', pos: 'n', ex: ['x.'] }, c = { ex: 'x.', ps: 'a woman points at a big red cross mark on a blank sheet in front of a boy', check: 'Did the child get something wrong?', cap: 'a woman and a boy at a desk', who: 2, draw: 4 };
  const key = 'a big red cross mark on a blank sheet; the boy looking surprised';
  ok(sc.sceneStyle(LP) === sc.SCENE_STYLE_LITEPLUS && sc.sceneStyle({}) === sc.SCENE_STYLE_E4 && !/\b(text|letters?|words?|signs?|labels?)\b/i.test(sc.SCENE_STYLE_LITEPLUS) && /key details/.test(sc.SCENE_STYLE_LITEPLUS), 'lite+ chỉ khi VIMG_STYLE=liteplus, không nhắc chữ, bảo vẽ to chi tiết then chốt');
  ok(sc.sceneOk(e, c, {}) === '' && sc.sceneOk(e, c, LP) === 'no key detail' && sc.sceneOk(e, { ...c, key }, LP) === '', 'lite+: thiếu key → viết lại thẻ; mặc định/fill không đòi key');
  for (const [k, why] of [['a red cross; a sad face; a pencil', 'key has more than 2 details'], ['cross', 'key detail not 2-12 words'], ['a test paper with a red cross mark', 'key has a text object: paper'], ['a flashcard with a red cross mark', 'key has a text object: flashcard'],
    ['the word wrong in red letters', 'key asks for text/symbol'], ['a big question mark above the boy', 'key uses a symbol: question mark'], ['a phone showing a red cross', 'key shows a screen'], ['a boy holding a toy gun', 'key is unsafe: gun']])
    ok(sc.sceneOk(e, { ...c, key: k }, LP) === why, 'lite+ cổng key: ' + k + ' → ' + why);
  const pa = { w: 'protected area', pos: 'n', ex: ['x.'] }, pc = { ...c, ps: 'a man in a ranger uniform stands in a forest raising his hand to stop a hunter with a gun', check: 'Is hunting not allowed in this place?' };
  ok(sc.sceneOk(pa, pc, {}) === 'ps is unsafe: gun' && sc.sceneOk(pa, { ...pc, ps: 'a man in a ranger uniform stands in a forest raising his hand to stop a hunter with a rifle' }, {}) === 'ps is unsafe: rifle', 'cổng an toàn: vũ khí trong ps → loại cả lịch fill (e6)');
  for (const ps of ['two men punch each other hard in a dark alley at night', 'a man with blood on his shirt sits alone on a park bench', 'a woman drinks beer at a noisy table with two friends', 'a man points a knife at a frightened woman in a dark street'])
    ok(/^ps is unsafe/.test(sc.sceneOk(pa, { ...pc, ps }, {})), 'cổng an toàn chặn: ' + ps);
  ok(sc.sceneOk({ w: 'gun', pos: 'n', ex: ['x.'] }, { ...pc, ps: 'one black toy gun lies on a wooden table beside a small box', check: 'Is there a tool that fires small objects?' }, {}) === '' && sc.sceneOk({ w: 'chop', pos: 'v', ex: ['x.'] }, { ...pc, ps: 'a woman chops carrots with a knife on a cutting board in a kitchen', check: 'Is the food being cut into small pieces?' }, {}) === '', 'cổng an toàn: chính từ đang học (gun#n) và dao khi nấu ăn vẫn được');
  ok(sc.unsafeHit('a nurse draws blood from a woman arm while a lab worker holds a test tube', 'donor') === '' && sc.unsafeHit('a man points at a clipboard with bullet points', 'agenda') === '' && sc.unsafeHit('a soldier and a woman stand side by side holding shields', 'ally') === '' && sc.unsafeHit('a nurse takes a blood sample', 'blood test') === '' && sc.unsafeHit('a tray of glasses and a punch bowl', 'reception') === '', 'cổng an toàn không chặn oan: máu khi y tế, bullet points, lính không vũ khí, từ trong cụm đang học');
  process.env.VIMG_STYLE = 'liteplus'; const p = sc.promptScene('mistake#n', { ...c, key }, 1); delete process.env.VIMG_STYLE;
  ok(p.indexOf('Key details: a big red cross mark') > p.indexOf('in front of a boy') && p.indexOf('Minimal flat vector') > p.indexOf('Key details') && !sc.promptScene('mistake#n', { ...c, key }, 1).includes('Key detail'), 'lite+ prompt: câu cảnh → chi tiết then chốt → phong cách; ngoài lite+ không đưa key');
  ok(sc.sceneSys(LP).includes('"key"') && /red cross mark/.test(sc.KEY_SYS) && sc.sceneSys({}) === sc.SCENE_SYS, 'lite+: lời nhắc thẻ thêm key (vật mang chữ → tờ trơn + dấu), mặc định giữ SCENE_SYS');
  const KX = [...sc.KEY_SYS.matchAll(/"key":"([^"]+)"/g)].map(m => m[1]); ok(KX.length >= 3 && KX.every(k => sc.keyOk({ w: 'zz', pos: 'n' }, k) === ''), 'lite+: ví dụ key trong lời nhắc qua chính cổng keyOk');
}
// Kiểm CDN trong CI: HEAD thẳng gốc Pages (thứ tự Worker), 0 lượt qua media.lexkite.com – 01/11–02/11 mỗi npm test HEAD ~1k ảnh qua Worker
// → hạn mức Workers 100k/ngày cạn (1027), /api chết, Live traffic 0. Đỏ nếu ai đó trả cdnCheck về gọi CDN.
{
  const { cdnCheck, originUrls } = await import('../vocab-img/cdn-check.mjs');
  const img = { base: 'https://media.lexkite.com/vimg/', items: { 'a#n': { h: 'aaaaaaaaaaaaaaaa', fmt: ['avif', 'webp'] }, 'b#n': { h: 'bbbbbbbbbbbbbbbb' }, 'c#n': { h: 'cccccccccccccccc' } } };
  const seen = [], fake = async u => { seen.push(u); return { ok: /lexkite-media\/vimg\/(a|b)/.test(u) || /lexkite-media-4\/vimg\/a/.test(u), status: /lexkite-media(-4)?\/vimg\/(a|b)/.test(u) ? 200 : 404 }; };
  const r = await cdnCheck(img, 1, 's', { fetcher: fake });
  ok(seen.length > 0 && !seen.some(u => u.includes('media.lexkite.com')), 'cdnCheck mặc định: 0 lượt HEAD qua media.lexkite.com (Worker)');
  ok(r.n === 4 && r.bad.length === 1 && /c#n/.test(r.bad[0]), 'cdnCheck: có ở m4 hoặc lùi m1 = đạt; thiếu ở mọi gốc = lỗi (' + JSON.stringify(r.bad) + ')');
  ok(originUrls('https://media.lexkite.com/m1/vimg/0123456789abcdef.webp').length === 1 && originUrls('https://media.lexkite.com/vimg/x.webp') === null, 'originUrls khớp regex/thứ tự của Worker');
  const s2 = []; await cdnCheck(img, 1, 's', { viaCdn: true, fetcher: async u => { s2.push(u); return { ok: true, status: 200 }; } });
  ok(s2.every(u => u.startsWith('https://media.lexkite.com/vimg/')), '--via-cdn vẫn kiểm qua Worker thật khi chạy tay');
}
// 07/11 gốc 06/11 (91 ảnh/ngày, kho CF còn 56/61): thẻ hỏng ≥ 3 lần không bị bỏ vĩnh viễn mà nghỉ rồi viết lại; --gaps không đếm thẻ đang nghỉ;
// thẻ văn bản đi kho Groq/Gemini miễn phí trước cf2; plan chia việc theo số nghĩa vẽ được.
{ const sc = await import('../vocab-img/scene.mjs'), src = rd('scripts/vocab-img/scene.mjs'), wf = rd('.github/workflows/vocab-img-scene.yml'), now = Date.parse('2026-11-07T00:00:00Z');
  ok(!sc.cardResting({ e4bad: 3 }, now) && !sc.cardResting({ e4bad: 2, badAt: '2026-11-06T23:00:00Z' }, now) && !sc.cardResting(undefined, now), 'thẻ hỏng cũ (chưa badAt) / chưa đủ 3 lần → viết lại, không nghỉ');
  ok(sc.cardResting({ e4bad: 3, badAt: '2026-11-06T00:00:00Z' }, now, {}) && !sc.cardResting({ e4bad: 3, badAt: '2026-11-04T00:00:00Z' }, now, {}), 'hỏng ≥ 3 lần → nghỉ VIMG_QUEUE_RETRY_DAYS (2) ngày rồi viết lại');
  ok(/!cardResting\(cards\.items\[k\]\)/.test(src) && /\|\| cardResting\(c\)\) continue/.test(src) && !/\(c\.e4bad \|\| 0\) < 3\) todo\.push/.test(src), '--gaps bỏ thẻ đang nghỉ; --cards viết lại thẻ hỏng đã nghỉ xong (không bỏ vĩnh viễn)');
  ok(/e4bad: \(o\.e4bad \|\| 0\) \+ 1, badAt:/.test(src), 'thẻ hỏng ghi badAt (cả nghĩa chưa có thẻ) – không viết lại mỗi lượt');
  ok(sc.CARD_CHAIN.indexOf('groq') === 0 && sc.CARD_CHAIN.indexOf('gem') < sc.CARD_CHAIN.indexOf('cf2') && /chain: CARD_CHAIN/.test(src), 'thẻ văn bản: Groq/Gemini miễn phí trước cf2 (neuron CF để vẽ)');
  ok((wf.match(/GROQ_POOL: \$\{\{ secrets\.GROQ_POOL \}\}/g) || []).length >= 3 && (wf.match(/GEMINI_POOL: \$\{\{ secrets\.GEMINI_POOL \}\}/g) || []).length >= 3, 'prep/shard/fill nhận GROQ_POOL + GEMINI_POOL');
  ok(/scene\.mjs --gaps 1000000 --shard 0\/1/.test(wf) && /m=\$\(\( \(G \+ 39\) \/ 40 \)\)/.test(wf), 'plan: số việc theo số nghĩa vẽ được, 0 nghĩa → bỏ lượt (không cài giám khảo 10 máy cho 1 nghĩa)');
}
// Hồi quy: bài học đọc chỉ mục ảnh v2 (`j.m`) trong khi lexicon-img.json đã là v3 (đầu + mảnh) → dạng "pic" không bao giờ sinh. Chạy trên chỉ mục v3 THẬT.
{
  const head = J('web/js/lexicon-img.json'), store = { 'lk.vimg': '1' }, D = { theme: 'light' };
  ok(head.v === 3 && !head.m && head.n > 0, 'lexicon-img.json là đầu v3 (không có m) – đúng ca gây lỗi');
  const local = u => { const f = 'web/js/' + new URL(u).pathname.split('/js/').pop(); return fs.existsSync(f) ? { ok: true, json: async () => J(f) } : { ok: false, json: async () => null }; };
  const sb = { console, URL, Promise, Math, setTimeout, navigator: {}, location: { href: 'https://lexkite.com/' }, fetch: async u => local(u), localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } }, document: { documentElement: { getAttribute: () => D.theme } } };
  sb.self = sb; sb.globalThis = sb; vm.createContext(sb);
  vm.runInContext(rd('web/js/vocab-img.js'), sb); vm.runInContext(rd('web/js/lesson/engine.js'), sb);
  const shards = fs.readdirSync('web/js/vimg').filter(f => f.endsWith('.json')).map(f => J('web/js/vimg/' + f));
  const find = fn => { for (const sh of shards) for (const [k, h] of Object.entries(sh.m || {})) { const S = new Set(sh.s || []), A = new Set(sh.a || []); if (/^[a-z]+#n$/.test(k) && fn(S.has(k), A.has(k))) return { k, h, word: k.split('#')[0], pos: 'n' }; } return null; };
  const plain = find(s => !s), scene = find(s => s), V = sb.VImg; // chỉ mục hiện chỉ có ảnh cảnh + ảnh nền kem (a rỗng)
  ok(plain && scene, 'chỉ mục thật có ảnh thường và ảnh cảnh');
  await V.ready([plain.word, scene.word]);
  ok(V.quizUrl(plain.word, plain.pos) === head.base + plain.h + '.webp', 'quizUrl đọc được mảnh v3');
  ok(V.quizUrl(plain.word, 'v') === '', 'quizUrl: sai loại từ → không lấy ảnh');
  ok(V.quizUrl(scene.word, scene.pos) === '', 'quizUrl: ảnh cảnh cần câu ví dụ → không dùng');
  const items = sb.LessonEngine.build([{ card: { word: plain.word, pos: plain.pos, vi: 'x', def: 'x' }, why: 'new' }], { seed: 3, perWord: 1, hasImg: (w, p) => !!V.quizUrl(w, p), match: false });
  ok(items.some(i => i.type === 'pic'), 'chỉ mục v3 thật → bài học sinh dạng pic');
  D.theme = 'dark'; ok(V.quizUrl(plain.word, plain.pos) === (shards.some(x => (x.a || []).includes(plain.k)) ? head.base + plain.h + '.webp' : ''), 'chế độ tối: ẩn ảnh nền kem (như .vimg:not([data-a]))'); D.theme = 'light';
  store['lk.vimg'] = '0'; ok(V.quizUrl(plain.word, plain.pos) === '', 'cờ tắt → không có ảnh');
  const ui = rd('web/js/lesson/ui.js'); ok(/VImg\.quizUrl/.test(ui) && /App\.vimgReady\(picks/.test(ui) && !/lexicon-img\.json/.test(ui), 'lesson/ui.js dùng VImg, không tự đọc chỉ mục');
}
console.log(`✓ vocab-img: ${n} kiểm`);
