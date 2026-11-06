// 📖 Proxy từ điển & dịch máy cùng nguồn (functions/api/dictlookup.js) + hợp đồng phía máy khách (web/js/dictionary.js, app.js, sw.js).
// Lỗi gốc 1/11: web gọi thẳng api.dictionaryapi.dev (500) & translate.googleapis.com gtx (429) → phản hồi không có CORS → console đỏ,
// mất IPA/định nghĩa, post-deploy-check đỏ trên #/dict/hello. Test: nguồn 500/429/mạng hỏng → 200 + null (dự phòng sạch, không lưu đệm lâu),
// trúng đệm không gọi lại nguồn, tham số lạ không chuyển tiếp, Origin lạ bị từ chối, hết hạn mức → 200 null (không 429),
// và kiểm tĩnh: web/js không còn gọi thẳng 2 nguồn này (trừ nhánh add-on `EXT ?` có host_permissions).
// Chạy: node scripts/test/dictlookup.mjs  (không mạng – Cache API/fetch giả lập)
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };

// Cache API giả: tôn trọng s-maxage (như Cloudflare) rồi max-age; no-store/0 → không lưu
const store = new Map();
const ttlOf = res => { const cc = res.headers.get('Cache-Control') || ''; if (/no-store/.test(cc)) return 0; const m = cc.match(/s-maxage=(\d+)/) || cc.match(/max-age=(\d+)/); return m ? +m[1] : 0; };
globalThis.caches = { default: {
  async match(req) { const k = typeof req === 'string' ? req : req.url, e = store.get(k); if (!e || e.exp <= Date.now()) return undefined; return new Response(e.body, { headers: e.headers }); },
  async put(req, res) { const t = ttlOf(res); if (!t) return; store.set(typeof req === 'string' ? req : req.url, { body: await res.text(), headers: [...res.headers], exp: Date.now() + t * 1000 }); },
  async delete(req) { return store.delete(typeof req === 'string' ? req : req.url); },
} };
// Nguồn giả: upstream(url) → { status, body } | Error
const upstreamCalls = []; let upstream = () => ({ status: 200, body: null });
globalThis.fetch = async url => {
  url = String(url); upstreamCalls.push(url);
  const r = upstream(url); if (r instanceof Error) throw r;
  return new Response(r.raw != null ? r.raw : JSON.stringify(r.body), { status: r.status, headers: { 'Content-Type': 'application/json' } });
};
const { onRequestGet, parse } = await import(path.join(ROOT, 'functions/api/dictlookup.js'));
let ip = 1;
const call = async (qs, headers = {}) => {
  const pend = [];
  const request = new Request('https://lexkite.com/api/dictlookup?' + qs, { headers: { 'CF-Connecting-IP': '10.0.0.' + (headers.ip || ip), ...headers } });
  const res = await onRequestGet({ request, env: {}, waitUntil: p => pend.push(p) });
  await Promise.all(pend);
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch (e) { body = Symbol('not-json'); }
  return { res, body, status: res.status, why: res.headers.get('X-Dictlookup'), cc: res.headers.get('Cache-Control') || '' };
};
const HELLO = [{ word: 'hello', phonetics: [{ text: '/həˈləʊ/', audio: 'https://api.dictionaryapi.dev/media/pronunciations/en/hello-uk.mp3' }], meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'A greeting.' }] }] }];

// 1) Nguồn lỗi → 200 + null (máy khách rơi sang Wiktionary/MyMemory), không lỗi console phía trình duyệt
upstream = () => ({ status: 500, body: { message: 'boom' } });
let r = await call('src=dapi&w=hello');
ok(r.status === 200 && r.body === null, `dictionaryapi 500 → 200 null (được ${r.status} ${String(r.body)})`);
ok(r.why === 'upstream-500', 'X-Dictlookup báo upstream-500 (dò lỗi qua header, không qua console)');
ok(!/s-maxage=(\d{3,})/.test(r.cc) && /s-maxage=60\b/.test(r.cc) && /max-age=0/.test(r.cc), `lỗi tạm chỉ che 60 s ở biên, trình duyệt không nhớ (Cache-Control: ${r.cc})`);
const before = upstreamCalls.length; r = await call('src=dapi&w=hello');
ok(upstreamCalls.length === before && r.body === null, 'trong 60 s che lỗi: không dội lại nguồn đang lỗi');
store.clear();

upstream = u => (/translate\.googleapis\.com/.test(u) ? { status: 429, body: null, raw: '<html>Too Many Requests</html>' } : { status: 500 });
r = await call('src=gtx&sl=en&tl=es&dj=1&dt=t&q=hello');
ok(r.status === 200 && r.body === null && r.why === 'upstream-429', `gtx 429 (HTML) → 200 null (được ${r.status} ${r.why})`);
store.clear();

upstream = () => new Error('network down');
r = await call('src=gtx&sl=en&tl=fr&dj=1&dt=t&q=world');
ok(r.status === 200 && r.body === null && r.why === 'upstream-error' && /no-store/.test(r.cc), 'mạng/hết giờ → 200 null, no-store');
ok(!store.size || ![...store.keys()].some(k => k.includes('dictlookup')), 'mạng hỏng không lưu đệm (lượt sau thử lại ngay)');

upstream = () => ({ status: 200, raw: 'not json' });
r = await call('src=dapi&w=badjson');
ok(r.status === 200 && r.body === null && r.why === 'upstream-badjson', 'nguồn trả 200 nhưng không phải JSON → 200 null');
store.clear();

// 2) Thành công: nguyên định dạng gốc, đệm biên dài (từ điển 30 ngày, dịch 1 ngày), trúng đệm không gọi lại nguồn
upstream = u => (/dictionaryapi/.test(u) ? { status: 200, body: HELLO } : { status: 200, body: { sentences: [{ trans: 'hola' }], src: 'en' } });
r = await call('src=dapi&w=Hello');
ok(r.status === 200 && JSON.stringify(r.body) === JSON.stringify(HELLO), 'dictionaryapi 200 → trả nguyên mảng gốc');
ok(/s-maxage=2592000/.test(r.cc) && /max-age=86400/.test(r.cc), `từ điển: biên 30 ngày, trình duyệt 1 ngày (${r.cc})`);
ok(upstreamCalls.at(-1) === 'https://api.dictionaryapi.dev/api/v2/entries/en/hello', 'chuẩn hóa chữ thường trước khi gọi nguồn (1 mục đệm/từ)');
let c0 = upstreamCalls.length; r = await call('src=dapi&w=hello');
ok(upstreamCalls.length === c0 && JSON.stringify(r.body) === JSON.stringify(HELLO), 'lượt 2 (Hello/hello) trúng đệm biên – 0 lượt gọi nguồn');
r = await call('src=gtx&sl=en&tl=es&hl=en&dj=1&dt=t&dt=bd&q=good%20morning');
ok(r.body && r.body.sentences[0].trans === 'hola' && /s-maxage=86400/.test(r.cc) && /max-age=3600/.test(r.cc), `gtx 200 → nguyên định dạng, biên 1 ngày, trình duyệt 1 giờ (${r.cc})`);
c0 = upstreamCalls.length; await call('src=gtx&sl=en&tl=es&hl=en&dj=1&dt=bd&dt=t&q=good%20morning');
ok(upstreamCalls.length === c0, 'thứ tự dt khác vẫn trúng cùng mục đệm');

upstream = () => ({ status: 404, body: { title: 'No Definitions Found' } });
r = await call('src=dapi&w=qwzxv');
ok(r.status === 200 && r.body === null && r.why === 'miss' && /s-maxage=86400/.test(r.cc), 'từ không có (404 thật) → 200 null, nhớ 1 ngày');

// 3) Kiểm tham số: chỉ chuyển tiếp tham số đã biết; sai → null, không gọi nguồn
const p = parse(new URL('https://lexkite.com/api/dictlookup?src=gtx&sl=vi&tl=en&dt=t&q=xin%20ch%C3%A0o&client=evil&key=SECRET&tk=1'));
ok(p && /^https:\/\/translate\.googleapis\.com\/translate_a\/single\?client=gtx&sl=vi&tl=en&dt=t&q=/.test(p.upstream) && !/evil|SECRET|tk=/.test(p.upstream), `tham số lạ bị bỏ (${p && p.upstream})`);
ok(new URL(p.upstream).searchParams.get('q') === 'xin chào', 'q giữ nguyên nội dung (UTF-8)');
c0 = upstreamCalls.length;
for (const qs of ['src=gtx&sl=en&tl=../../x&dt=t&q=a', 'src=gtx&sl=en&tl=es&dt=evil&q=a', 'src=gtx&sl=en&tl=es&dt=t', 'src=gtx&sl=en&tl=auto&dt=t&q=a', 'src=dapi&w=', 'src=dapi&w=' + 'a'.repeat(80), 'src=dapi&w=%3Cscript%3E', 'src=other&w=a', 'src=gtx&sl=en&tl=es&dt=t&q=' + 'a'.repeat(5001)]) {
  r = await call(qs); ok(r.status === 200 && r.body === null && r.why === 'bad-params', `tham số sai → 200 null bad-params: ${qs.slice(0, 50)}`);
}
ok(upstreamCalls.length === c0, 'tham số sai không bao giờ gọi nguồn');
ok(parse(new URL('https://x/api/dictlookup?src=dapi&w=give%20up')).upstream.endsWith('/give%20up'), 'cụm từ (give up) hợp lệ');
ok(parse(new URL('https://x/api/dictlookup?src=gtx&sl=auto&tl=zh-CN&dt=t&q=a')), 'tl dạng zh-CN hợp lệ');

// 4) Origin: trang khác nhúng proxy → từ chối; app di động/add-on/localhost → CORS đúng nguồn
upstream = () => ({ status: 200, body: HELLO }); store.clear();
c0 = upstreamCalls.length;
r = await call('src=dapi&w=hello', { Origin: 'https://evil.example' });
ok(r.body === null && r.why === 'origin' && !r.res.headers.get('Access-Control-Allow-Origin') && upstreamCalls.length === c0, 'Origin lạ → null, không CORS, không gọi nguồn');
r = await call('src=dapi&w=hello', { 'Sec-Fetch-Site': 'cross-site' });
ok(r.why === 'origin', 'Sec-Fetch-Site cross-site không kèm Origin → từ chối');
for (const o of ['capacitor://localhost', 'https://localhost', 'http://localhost:8080', 'http://127.0.0.1:40639', 'http://[::1]:5173', 'chrome-extension://abcdefghijklmnopabcdefghijklmnop', 'https://lexkite.com', 'https://preview-1.lexkite.pages.dev', 'https://preview.lexkite-preview.pages.dev']) {
  r = await call('src=dapi&w=hello', { Origin: o });
  ok(r.res.headers.get('Access-Control-Allow-Origin') === o && JSON.stringify(r.body) === JSON.stringify(HELLO), `Origin ${o} → ACAO đúng nguồn`);
}
r = await call('src=dapi&w=hello', { 'Sec-Fetch-Site': 'same-origin' });
ok(!r.res.headers.get('Access-Control-Allow-Origin') && r.body, 'cùng nguồn: không cần CORS, bản đệm không mang ACAO của người khác');

// 5) Hạn mức (tính năng translate, chỉ lượt trượt đệm): vượt → 200 null 'quota', KHÔNG 429 (console sạch)
store.clear(); upstream = () => ({ status: 200, body: { sentences: [{ trans: 'x' }] } });
let quota = null; for (let i = 0; i < 70 && !quota; i++) { r = await call(`src=gtx&sl=en&tl=es&dj=1&dt=t&q=w${i}`, { ip: 77 }); if (r.why === 'quota') quota = r; }
ok(quota && quota.status === 200 && quota.body === null && /no-store/.test(quota.cc), 'vượt 60 lượt trượt đệm/phút → 200 null quota (không 429)');
r = await call('src=gtx&sl=en&tl=es&dj=1&dt=t&q=w0', { ip: 77 });
ok(r.body && r.why !== 'quota', 'đã hết lượt vẫn được phục vụ bản đã có trong đệm (không tính hạn mức)');

// 6) Máy khách: web/js/dictionary.js trên lexkite.com → chỉ gọi /api/dictlookup; nguồn 500/429 → tra từ vẫn xong, không ném lỗi
{
  store.clear(); upstream = u => (/dictionaryapi/.test(u) ? { status: 500 } : { status: 429, raw: 'Too Many Requests' });
  const net = [];
  const viaProxy = async u => {
    u = String(u); net.push(u);
    if (u.startsWith('/api/dictlookup?')) { const x = await call(u.slice('/api/dictlookup?'.length), { 'Sec-Fetch-Site': 'same-origin' }); return { ok: x.status === 200, status: x.status, json: async () => x.body }; }
    return { ok: false, status: 404, json: async () => null };
  };
  const ctx = { console, setTimeout, clearTimeout, AbortController, TextEncoder, URL, URLSearchParams, Promise, fetch: viaProxy, location: { hostname: 'lexkite.com', protocol: 'https:' } };
  ctx.self = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'web/js/dictionary.js'), 'utf8'), ctx);
  let res, err = null; try { res = await ctx.Dict.lookup('zymurgyx', { image: false, examples: false }); } catch (e) { err = e; }
  ok(!err, 'Dict.lookup không ném lỗi khi cả 2 nguồn hỏng (' + (err && err.message) + ')');
  ok(net.some(u => u.startsWith('/api/dictlookup?src=dapi&w=')) && net.some(u => u.startsWith('/api/dictlookup?src=gtx&')), 'web gọi từ điển + gtx qua /api/dictlookup cùng nguồn');
  ok(!net.some(u => /translate\.googleapis\.com|api\.dictionaryapi\.dev\/api/.test(u)), 'web không gọi thẳng translate.googleapis.com / api.dictionaryapi.dev');
  void res;
  // Phản hồi lỗi (404/500) mà thân chưa đọc → request phải bị hủy ngay (thân trả chậm từng giữ trang > 30 s, font audit 1/11)
  const sigs = []; const ctxA = { ...ctx, fetch: async (u, init = {}) => { sigs.push(init.signal); return { ok: false, status: 404, json: async () => { throw new Error('html'); } }; }, location: { hostname: 'lexkite.com', protocol: 'https:' } };
  ctxA.self = ctxA; vm.createContext(ctxA); vm.runInContext(fs.readFileSync(path.join(ROOT, 'web/js/dictionary.js'), 'utf8'), ctxA);
  await ctxA.Dict.lookup('zymurgyy', { image: false, examples: false }).catch(() => {});
  ok(sigs.length && sigs.every(sg => sg && sg.aborted), `fetchJSON hủy mọi request trả lỗi (${sigs.filter(sg => sg && sg.aborted).length}/${sigs.length} đã hủy)`);
  // Bản trong app di động (capacitor://localhost) → proxy trên lexkite.com
  const net2 = []; const ctx2 = { ...ctx, fetch: async u => { net2.push(String(u)); return { ok: true, json: async () => null }; }, location: { hostname: 'localhost', protocol: 'capacitor:' } };
  ctx2.self = ctx2; vm.createContext(ctx2); vm.runInContext(fs.readFileSync(path.join(ROOT, 'web/js/dictionary.js'), 'utf8'), ctx2);
  await ctx2.Dict.lookup('zymurgyx', { image: false, examples: false }).catch(() => {});
  ok(net2.some(u => u.startsWith('https://lexkite.com/api/dictlookup?src=dapi')) && !net2.some(u => /translate\.googleapis|dictionaryapi\.dev\/api/.test(u)), 'app di động → https://lexkite.com/api/dictlookup');
  // Add-on (chrome-extension:) có host_permissions → gọi thẳng (không CORS, không tốn trần Functions)
  const net3 = []; const ctx3 = { ...ctx, fetch: async u => { net3.push(String(u)); return { ok: true, json: async () => null }; }, location: { hostname: 'abcdefghijklmnopabcdefghijklmnop', protocol: 'chrome-extension:' } };
  ctx3.self = ctx3; vm.createContext(ctx3); vm.runInContext(fs.readFileSync(path.join(ROOT, 'web/js/dictionary.js'), 'utf8'), ctx3);
  await ctx3.Dict.lookup('zymurgyx', { image: false, examples: false }).catch(() => {});
  ok(net3.some(u => u.startsWith('https://api.dictionaryapi.dev/api/v2/entries/en/')) && !net3.some(u => /dictlookup/.test(u)), 'add-on → gọi thẳng nguồn (host_permissions)');
}

// 7) Kiểm tĩnh: web/js không còn fetch thẳng 2 nguồn; chỉ nhánh `EXT ?` của dictionary.js được chứa tên miền nguồn
{
  const HOST = /translate\.googleapis\.com\/translate_a|api\.dictionaryapi\.dev\/api\//;
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.m?js$/.test(e.name) ? [path.join(d, e.name)] : []));
  const bad = [];
  for (const f of walk(path.join(ROOT, 'web/js'))) fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
    if (HOST.test(line) && !(f.endsWith(path.join('web', 'js', 'dictionary.js')) && /\(EXT \? /.test(line))) bad.push(`${path.relative(ROOT, f)}:${i + 1}`);
  });
  ok(!bad.length, 'web/js gọi thẳng translate.googleapis.com / api.dictionaryapi.dev (phải qua /api/dictlookup): ' + bad.join(', '));
  const dj = fs.readFileSync(path.join(ROOT, 'web/js/dictionary.js'), 'utf8');
  ok(/const EXT = !!\(g\.location && \/\^\(chrome\|moz\)-extension:\$\/\.test\(location\.protocol\)\)/.test(dj), 'EXT chỉ đúng trong add-on (chrome-extension:/moz-extension:)');
  const app = fs.readFileSync(path.join(ROOT, 'web/js/app.js'), 'utf8');
  ok(/\$\{Dict\.gtxURL\('vi', to\)\}&dt=t&q=/.test(app) && /x\.ok \? x\.json\(\) : \(x\.body && x\.body\.cancel\(\)\.catch\(\(\) => \{\}\), null\)/.test(app), 'app.js: dịch nội dung qua proxy, phản hồi lỗi → null + hủy thân chưa đọc');
  ok(/\$\{Dict\.gtxURL\('vi', to\)\}[^\n]*signal: AbortSignal\.timeout \? AbortSignal\.timeout\(\d+\) : undefined/.test(app), 'app.js: lô dịch nội dung có giới hạn thời gian (request treo không giữ trang mãi)');
  const nt = fs.readFileSync(path.join(ROOT, 'web/js/notices.js'), 'utf8');
  ok(/fetch\(`\$\{API\}\?lang=[^\n]*signal: AbortSignal\.timeout \? AbortSignal\.timeout\(\d+\) : undefined/.test(nt) && /if \(!res\.ok\) \{ if \(res\.body\) res\.body\.cancel\(\)/.test(nt), 'notices.js: GET thông báo có giới hạn thời gian + hủy thân khi lỗi (không treo trang)');
  const sw = fs.readFileSync(path.join(ROOT, 'web/sw.js'), 'utf8');
  const byp = sw.indexOf("if (url.pathname === '/api/dictlookup') return;"), xo = sw.indexOf("url.hostname === 'lexkite.com'"), so = sw.indexOf('url.origin !== location.origin) return;');
  ok(byp > 0, "sw.js: /api/dictlookup đi mạng thẳng (không ignoreSearch trả nhầm mục từ khác)");
  ok(byp > 0 && byp < xo && byp < so, 'sw.js: bỏ qua /api/dictlookup TRƯỚC nhánh khác nguồn lexkite.com (app di động/127.0.0.1) – SW không giữ request đã hủy (font audit treo)');
}

console.log(fails ? `✗ dictlookup: ${fails}/${n} kiểm tra hỏng` : `✓ dictlookup: ${n} kiểm tra – proxy từ điển/dịch máy dự phòng sạch, web không gọi thẳng nguồn`);
process.exit(fails ? 1 : 0);
