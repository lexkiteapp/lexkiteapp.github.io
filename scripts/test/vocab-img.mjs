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
{ const ix = J('web/js/lexicon-img.json'), img = J('content/lexicon/img.json');
  ok(ix.v === 2 && ix.base === img.base && Array.isArray(ix.x) && Array.isArray(ix.w) && Object.keys(ix.m).length === Object.values(img.items).filter(e => e.h).length, 'chỉ mục v2 {v, base, sv, m, x, w} khớp img.json');
  ok(Object.entries(ix.m).every(([k, h]) => img.items[k].h === h) && !/"(photo|src|by|lic)"/.test(rd('web/js/lexicon-img.json')) && /m: Object\.fromEntries\(imgKeys\.map\(k => \[k, IMG\.items\[k\]\.h\]\)\)/.test(rd('scripts/build-lexicon.mjs')) && Object.entries(ix.p || {}).every(([k, h]) => img.items[k].photo.h === h && !Object.values(ix.m).includes(h)), 'chỉ mục app chỉ mang h (biểu tượng/minh họa) – không dữ liệu ảnh chụp');
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
{ const m = /const vimgOn = [^\n]*\n\s*App\.vimgReady = [^\n]*\n\s*App\.vimg = [^\n]*\n\s*App\.vimgReady\(\);/.exec(appjs); ok(!!m, 'app.js có vimgOn/App.vimgReady/App.vimg');
  for (const [store, want] of [[{}, 1], [{ 'lk.cfg': JSON.stringify({ v: { vocab_img: false } }) }, 0], [{ 'lk.vimg': '0', 'lk.cfg': JSON.stringify({ v: { vocab_img: true } }) }, 0], [{ 'lk.vimg': '1' }, 1], [{ 'lk.cfg': JSON.stringify({ v: { vocab_img: true } }) }, 1]]) {
    const need = []; const ctx = { localStorage: { getItem: k => (k in store ? store[k] : null) }, App: { need: n => { need.push(n); return Promise.resolve(); } }, window: {} };
    vm.runInNewContext(m[0], ctx); ok(need.length === want && (!want || need[0] === 'vimg'), `cờ ${JSON.stringify(store)} → ${want ? 'tải bó vimg' : 'KHÔNG tải gì'}`);
    ok(ctx.App.vimg('apple', 'n') === '', 'App.vimg khi chưa có module → chuỗi rỗng (không hộp)'); } }
const SHELL = (/const SHELL = \[([\s\S]*?)\];/.exec(sw) || [])[1] || ''; ok(!/vocab-img|lexicon-img/.test(SHELL), 'SW SHELL không chứa vocab-img/chỉ mục');
ok(/await vimgP;/.test(appjs) && /App\.vimg\(e\.word, e\.pos, App\.meanOf\(e\), \{ w: 'dict', photo: true \}/.test(appjs), "tra từ: chờ ready() rồi vẽ hộp vai dict 160 px (ưu tiên ảnh Wikimedia – chỉ trang từ điển)");
// 3b. quy tắc tích hợp hình (docs/LEXICON.md § Quy tắc tích hợp hình): vai → cỡ, ảnh cảnh luôn kèm câu ví dụ, nền trong suốt cho chế độ tối, tiết kiệm dữ liệu → tắt
{ const mk = (store, ix, nav) => { store = { 'lk.vb': '3', ...store }; const ctx = { localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } }, fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve(ix) }), URL, location: { href: 'https://lexkite.com/app/' }, document: { currentScript: null }, navigator: nav || {} }; ctx.self = ctx; vm.runInNewContext(code, ctx); return ctx.VImg; };
  const ix = { v: 2, base, sv: 's1', on: true, m: { 'apple#n': H, 'consider#v': H2, 'although#conj': H3 }, x: [], w: [], a: ['although#conj', 'consider#v'], s: ['consider#v'] };
  const V = mk({}, ix); await V.ready();
  ok(V.SIZE.card === 120 && V.SIZE.back === 128 && V.SIZE.quiz === 64 && V.SIZE.dict === 160 && V.SIZE.words === 256, 'cỡ theo vai: thẻ 120 · mặt sau 128 · câu đố 64 · tra từ 160 · /words/ 256');
  ok(/width:64px/.test(V.slot('apple', 'n', '', 'quiz')) && /width="128"/.test(V.slot('apple', 'n', '', 'back')) && /width="160"/.test(V.slot('apple', 'n', '', { w: 'dict', photo: true })), 'slot nhận vai (cả dạng {w}) → đúng cỡ cố định');
  ok(V.slot('consider', 'v', 'xem xét', 'card') === '', 'ảnh CẢNH không có câu ví dụ → không hộp (không bao giờ cảnh thiếu câu)');
  const sc = V.slot('consider', 'v', 'xem xét', 'card', 'We are considering moving.'); ok(/class="vimg-ex"[^>]*>We are considering moving\.<\/span>$/.test(sc) && / data-a="1"/.test(sc), 'ảnh cảnh → câu ví dụ ngay dưới ảnh; nền trong suốt → data-a');
  ok(!/data-a/.test(V.slot('apple', 'n', '', 'card')) && !/vimg-ex/.test(V.slot('apple', 'n', '', 'card', 'x')), 'ảnh vật nền kem → không data-a (ẩn ở chế độ tối), không câu');
  ok(/border-radius:var\(--radius-sm/.test(sc), 'bo góc theo token thiết kế');
  const L = mk({}, ix, { connection: { saveData: true } }); ok(L.mode() === 0 && await L.ready() === null, 'tiết kiệm dữ liệu → tắt ảnh');
  const S = mk({ 'lk.vimg': '1' }, { ...ix, x: ['apple#n'] }, { deviceMemory: 1 }); await S.ready(); ok(!/@2x/.test(S.slot('apple', 'n', '', 'words')), 'máy yếu (≤ 2 GB) → không @2x');
  ok(/decode\(\)/.test(code) && /opacity \.15s/.test(code) && /prefers-reduced-motion:reduce/.test(code) && /classList\.add\('gone'\)/.test(code) && !/b\.remove\(\)/.test(code) && /requestIdleCallback/.test(code), 'decode() + mờ 150 ms, giảm chuyển động, lỗi CDN → ẩn hộp giữ chỗ (CLS 0), prefetch lúc rảnh');
  ok(/prefers-color-scheme:dark/.test(code) && /\.vimg:not\(\[data-a\]\)\{display:none!important\}/.test(code), 'chế độ tối: không hiện ảnh nền sáng (!important – hộp có display:block nội tuyến)'); }
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
{ const seo = rd('scripts/build-seo-pages.mjs');
  ok(/IMG\.style\.approved === true && Object\.keys\(IMG\.items \|\| \{\}\)\.length \?/.test(seo) && /ctx\.VImg\.pic/.test(seo), '/words/: chỉ dựng ảnh khi chủ duyệt + có mục, markup từ VImg.pic');
  ok((seo.match(/\$\{vimgOf\(/g) || []).length === 1 && /const vimgOf = \(e, alt, label\) => \(VPIC \? seoPic\(/.test(seo), '/words/: chưa duyệt → vimgOf trả rỗng (trang giữ nguyên từng byte)');
  const { V } = sandbox({}, index), IM = { base, items: { 'apple#n': { h: H, fmt: ['avif', 'webp'], x2: true, photo: { h: H2, fmt: ['webp'], src: { tier: 'photo', lic: 'Pexels', by: 'Jo <B>' } } }, 'kiss#v': { h: H3, fmt: ['avif', 'webp'] } } };
  const sp = seoPic(IM, 'apple#n', 'apple – táo', 'Foto', V.pic), si = seoPic(IM, 'kiss#v', 'kiss', 'Foto', V.pic);
  ok(sp.includes(`${base}${H2}.webp`) && !sp.includes(H + '.') && !/<source/.test(sp) && !/@2x/.test(sp), '/words/: ưu tiên photo (đúng định dạng của photo, không 2x)');
  ok(/<p class="vcred"[^>]*>Foto: Jo &lt;B&gt; \/ Pexels<\/p>$/.test(sp), '/words/: dòng ghi công "Ảnh: <by> / Pexels" (dịch nhãn, thoát ký tự)');
  ok(si.includes(`${base}${H3}.avif`) && !/vcred/.test(si) && seoPic(IM, 'run#v', 'run', 'Foto', V.pic) === '', '/words/: không photo → h, không ghi công; không mục → rỗng');
  ok(/ph: 'Ảnh'/.test(rd('scripts/lib/seo-pages-i18n.mjs')) && (rd('scripts/lib/seo-pages-i18n.mjs').match(/ ph: '/g) || []).length === 15, 'nhãn "Ảnh" của dòng ghi công đủ 15 ngôn ngữ');
  for (const f of ['web/js/study.js', 'extension/newtab.js']) ok(!/photo/.test(rd(f)), 'thẻ học / tab mới không dùng ảnh Wikimedia/ảnh chụp: ' + f);
  ok((rd('web/js/app.js').match(/photo: true/g) || []).length === 1 && !/\.photo\b/.test(rd('web/js/app.js')), 'app: ảnh Wikimedia CHỈ ở trang tra từ (1 chỗ photo: true)');
  ok(/o\.photo \? idx\.p\[k\] : ''/.test(rd('web/js/vocab-img.js')) && !/\.photo\b(?!\s*\?)/.test(rd('web/js/vocab-img.js').replace(/o\.photo \?/g, '')), 'VImg: p chỉ dùng khi bề mặt xin {photo:true}');
  ok(/IMG\.style\.approved === true && Object\.keys\(IMG\.items \|\| \{\}\)\.length/.test(rd('scripts/build-seo-pages.mjs')), 'img.json chưa duyệt HOẶC chưa có mục → /words/ không đổi (đã duyệt s1 24/10)'); }

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
  ok(Object.values(g.MODELS).every(m => cf.npiOf(m) < 1000 || /klein-9b/.test(m)), 'mọi mô hình trong MODELS có giá neuron ước tính');
  ok(cf.cfProvider(g.MODEL_DEFAULT, { CF_ACCOUNT_2: 'b', CF_AI_TOKEN_2: 'x' }).max === 0, 'VIMG_MAX_CF mặc định 0 = tắt');
  ok(cf.cfInput('@cf/black-forest-labs/flux-1-schnell', 'p').json.width === undefined && cf.cfInput('@cf/black-forest-labs/flux-2-dev', 'p').form, 'schnell không gửi cỡ; FLUX.2 gửi multipart');
}
console.log(`✓ vocab-img: ${n} kiểm`);
