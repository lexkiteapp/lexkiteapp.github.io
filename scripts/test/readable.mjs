// Test /api/readable (functions/api/readable.js, Nhập tài liệu từ liên kết – docs/specs/import-to-deck.md #5): chống SSRF + rút chữ + hạn mức.
// SSRF: http(s) duy nhất · localhost/tên nội bộ · 127.x · 10.x · 172.16/12 · 192.168 · 169.254.169.254 (metadata) · 100.64/10 · [::1] · IPv6 riêng/ULA/link-local · ::ffff:v4 · IP thập phân/hex/bát phân ·
// user:pass · cổng lạ · DNS trả IP riêng (kể cả lẫn công khai) · chuyển hướng tới IP riêng/giao thức lạ · vòng chuyển hướng · loại nội dung sai · quá 1 MB (khai báo + đọc luồng) · hết giờ.
// Chạy: node scripts/test/readable.mjs  (không mạng – fetch/DNS/Cache API giả)
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const store = new Map();
globalThis.caches = { default: {
  async match(req) { const e = store.get(req.url); if (!e || e.exp <= Date.now()) return undefined; return new Response(e.body); },
  async put(req, res) { const age = +((res.headers.get('Cache-Control') || '').match(/max-age=(\d+)/) || [, 0])[1]; store.set(req.url, { body: await res.text(), exp: Date.now() + age * 1000 }); },
  async delete(req) { return store.delete(req.url); },
} };
const R = await import(new URL('../../functions/api/readable.js', import.meta.url));
const code = async p => { try { await p; return 'ok'; } catch (e) { return e.code || 'other:' + e.message; } };

// ---------- 1. IP riêng ----------
for (const ip of ['0.0.0.0', '10.1.2.3', '127.0.0.1', '127.255.0.9', '169.254.169.254', '172.16.0.1', '172.31.255.255', '192.168.1.1', '100.64.0.1', '100.127.0.1', '192.0.2.5', '198.18.0.1', '224.0.0.1', '255.255.255.255', '1.2.3'])
  ok(R.isPrivateIp(ip), 'IPv4 riêng: ' + ip);
for (const ip of ['8.8.8.8', '1.1.1.1', '172.15.0.1', '172.32.0.1', '100.63.0.1', '93.184.216.34']) ok(!R.isPrivateIp(ip), 'IPv4 công khai: ' + ip);
for (const ip of ['::', '::1', '[::1]', 'fe80::1', 'fc00::1', 'fd12:3456::1', 'fec0::1', 'ff02::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:a00:1', '::ffff:169.254.169.254', '64:ff9b::7f00:1', '2002:7f00:1::', '2001:db8::1', '2001:0:4136:e378::1', '100::1', 'zz::1', '1:2:3:4:5:6:7:8:9'])
  ok(R.isPrivateIp(ip), 'IPv6 riêng/lạ: ' + ip);
for (const ip of ['2606:4700:4700::1111', '2001:4860:4860::8888', '::ffff:8.8.8.8', '2a00:1450:4001:81b::200e']) ok(!R.isPrivateIp(ip), 'IPv6 công khai: ' + ip);

// ---------- 2. checkUrl (chưa DNS) ----------
const blocked = ['http://127.0.0.1/', 'http://127.1/', 'http://2130706433/', 'http://0x7f000001/', 'http://0177.0.0.1/', 'http://0x7f.1/', 'http://10.0.0.5/a', 'http://169.254.169.254/latest/meta-data/', 'http://[::1]/', 'http://[::ffff:127.0.0.1]/', 'http://[fd00::1]/', 'http://[fe80::1]:80/',
  'http://localhost/', 'http://LOCALHOST./', 'http://foo.localhost/', 'http://printer.local/', 'http://metadata.google.internal/', 'http://intranet/', 'http://router.lan/', 'https://user:pw@example.com/', 'https://example.com:22/', 'https://example.com:8080/', 'http://192.168.0.1:80/', 'http://0.0.0.0/', 'http://[::]/'];
for (const u of blocked) ok(await code(Promise.resolve().then(() => R.checkUrl(u))) === 'blocked', 'chặn: ' + u);
for (const u of ['ftp://example.com/', 'file:///etc/passwd', 'gopher://example.com/', 'javascript:alert(1)', 'data:text/html,hi', 'not a url', '', '//example.com', 'https://']) ok(['badurl'].includes(await code(Promise.resolve().then(() => R.checkUrl(u)))), 'URL/giao thức sai: ' + u);
ok(R.checkUrl('https://Example.com/a?b=1#c').hostname === 'example.com' && R.checkUrl('http://example.com:80/').port === '' && R.checkUrl('https://example.com:443/x').hostname === 'example.com', 'URL hợp lệ giữ nguyên (80/443)');

// ---------- 3. readArticle: DNS, chuyển hướng, loại nội dung, trần byte ----------
const ARTICLE = '<html><head><title>Fallback title</title><meta property="og:title" content="The &amp; Great Article"><style>.x{color:red}</style><script>var secret = 1;</script></head><body><nav>Home About Contact</nav><header>Menu</header>'
  + '<article><h1>Heading here</h1>' + Array.from({ length: 6 }, (_, i) => `<p>Paragraph ${i}: the ephemeral glow of the nebula faded slowly, &ldquo;ambiguous&rdquo; &amp; skeptical &#8212; readers wondered why.</p>`).join('\n') + '</article><aside>Related stuff that should vanish</aside><footer>Copyright</footer><script>alert(1)</script></body></html>';
const html = (body, extra = {}) => new Response(body, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', ...extra } });
const PUB = ['93.184.216.34'];
const mk = routes => { const log = []; const f = async (u, o) => { log.push({ u, o }); const r = routes[new URL(u).host]; if (!r) throw new Error('no route ' + u); return typeof r === 'function' ? r(u, o) : r; }; return { f, log }; };
const dns = map => async h => { if (!map[h]) throw Object.assign(new Error('dns'), { code: 'dns' }); return map[h]; };
{
  const { f, log } = mk({ 'example.com': () => html(ARTICLE) });
  const out = await R.readArticle('https://example.com/post', { fetch: f, resolve: dns({ 'example.com': PUB }) });
  ok(out.title === 'The & Great Article' && out.host === 'example.com', 'tiêu đề lấy og:title + giải mã thực thể: ' + out.title);
  ok(/ephemeral glow/.test(out.text) && /“ambiguous” & skeptical — readers/.test(out.text), 'rút chữ bài + giải mã &ldquo; &amp; &#8212;');
  ok(!/secret|alert|Home About|Menu|Copyright|Related stuff|color:red/.test(out.text), 'bỏ script/style/nav/header/footer/aside');
  ok(log[0].o.redirect === 'manual' && log[0].o.credentials === 'omit' && !('Cookie' in log[0].o.headers) && !('Authorization' in log[0].o.headers), 'không theo chuyển hướng tự động, không cookie/Authorization');
  ok(out.chars === out.text.length && out.text.length > 200, 'trả số ký tự');
}
{ // text/plain
  const { f } = mk({ 'example.com': () => new Response('Plain words. '.repeat(60), { headers: { 'Content-Type': 'text/plain' } }) });
  const out = await R.readArticle('http://example.com/a.txt', { fetch: f, resolve: dns({ 'example.com': PUB }) });
  ok(/Plain words/.test(out.text) && out.title === '', 'text/plain đọc thẳng');
}
{ // DNS trả IP riêng (đơn, lẫn công khai, IPv6) → chặn, KHÔNG gọi fetch
  for (const ips of [['10.0.0.1'], ['93.184.216.34', '169.254.169.254'], ['::1'], ['fd00::5'], ['::ffff:10.0.0.1']]) {
    const { f, log } = mk({ 'evil.example': () => html(ARTICLE) });
    ok(await code(R.readArticle('https://evil.example/', { fetch: f, resolve: dns({ 'evil.example': ips }) })) === 'blocked' && !log.length, 'DNS → IP riêng bị chặn trước khi tải: ' + ips.join(','));
  }
  const { f } = mk({}); ok(await code(R.readArticle('https://nx.example/', { fetch: f, resolve: dns({}) })) === 'dns', 'DNS lỗi/không có → từ chối (không cho qua)');
}
{ // chuyển hướng: tới IP riêng, giao thức lạ, tên nội bộ, DNS riêng ở bước 2, quá nhiều bước, vòng lặp
  const to = loc => ({ 'a.example': () => new Response(null, { status: 302, headers: { Location: loc } }) });
  for (const loc of ['http://127.0.0.1/admin', 'http://169.254.169.254/latest/meta-data/', 'http://[::1]/', 'http://localhost:80/', 'http://metadata.google.internal/', 'ftp://a.example/x', 'file:///etc/passwd', 'https://user:p@b.example/', 'http://2130706433/']) {
    const { f, log } = mk(to(loc));
    const c = await code(R.readArticle('https://a.example/', { fetch: f, resolve: dns({ 'a.example': PUB }) }));
    ok((c === 'blocked' || c === 'badurl') && log.length === 1, 'chuyển hướng tới ' + loc + ' bị chặn (' + c + ')');
  }
  { const { f, log } = mk({ 'a.example': () => new Response(null, { status: 301, headers: { Location: 'https://b.example/x' } }), 'b.example': () => html(ARTICLE) });
    ok(await code(R.readArticle('https://a.example/', { fetch: f, resolve: dns({ 'a.example': PUB, 'b.example': ['192.168.1.9'] }) })) === 'blocked' && log.length === 1, 'chuyển hướng sang tên có DNS riêng bị chặn ở bước 2'); }
  { const { f, log } = mk({ 'a.example': () => new Response(null, { status: 301, headers: { Location: '/next' } }), }); // vòng: tự chuyển về chính nó
    ok(await code(R.readArticle('https://a.example/', { fetch: f, resolve: dns({ 'a.example': PUB }) })) === 'fetch' && log.length === R.MAX_HOPS + 1, 'chuyển hướng vô hạn dừng sau ' + R.MAX_HOPS + ' bước'); }
  { const { f } = mk({ 'a.example': () => new Response(null, { status: 301, headers: { Location: 'https://b.example/ok' } }), 'b.example': () => html(ARTICLE) });
    const out = await R.readArticle('https://a.example/', { fetch: f, resolve: dns({ 'a.example': PUB, 'b.example': PUB }) }); ok(out.host === 'b.example' && /ephemeral/.test(out.text), 'chuyển hướng hợp lệ được theo, host cuối = b.example'); }
  { const { f } = mk({ 'a.example': () => new Response(null, { status: 302 }) }); ok(await code(R.readArticle('https://a.example/', { fetch: f, resolve: dns({ 'a.example': PUB }) })) === 'fetch', '3xx không có Location → lỗi'); }
}
{ // loại nội dung + trần byte + mã lỗi + trang rỗng
  const run = (res, over = {}) => { const { f } = mk({ 'example.com': () => res }); return code(R.readArticle('https://example.com/', { fetch: f, resolve: dns({ 'example.com': PUB }), ...over })); };
  for (const ct of ['application/pdf', 'application/json', 'image/png', 'application/octet-stream', 'application/zip', 'text/css', '']) ok(await run(new Response(new Uint8Array(500).fill(120), { headers: ct ? { 'Content-Type': ct } : {} })) === 'type', 'loại nội dung bị từ chối: ' + (ct || '(không có)'));
  ok(await run(new Response('x', { headers: { 'Content-Type': 'text/html', 'Content-Length': String(R.MAX_BYTES + 1) } })) === 'toobig', 'Content-Length > 1 MB → toobig (không đọc)');
  let pulled = 0, cancelled = false; // khai man Content-Length: đọc luồng, cắt ngay khi vượt trần
  const stream = new ReadableStream({ pull(c) { pulled++; c.enqueue(new Uint8Array(65536).fill(97)); }, cancel() { cancelled = true; } });
  ok(await run(new Response(stream, { headers: { 'Content-Type': 'text/html' } })) === 'toobig' && cancelled && pulled <= 18, 'luồng vô hạn bị cắt ở 1 MB (pull=' + pulled + ')');
  ok(await run(new Response('nope', { status: 404, headers: { 'Content-Type': 'text/html' } })) === 'fetch' && await run(new Response('x', { status: 500 })) === 'fetch', '4xx/5xx → fetch');
  ok(await run(html('<html><body><script>app()</script><div id=root></div></body></html>')) === 'empty', 'trang chỉ có JS (không có chữ) → empty');
  ok(await code((async () => { const { f } = mk({ 'example.com': () => { throw new Error('boom'); } }); return R.readArticle('https://example.com/', { fetch: f, resolve: dns({ 'example.com': PUB }) }); })()) === 'fetch', 'lỗi mạng/hết giờ → fetch');
  const big = '<article>' + '<p>word word word word word word word. '.repeat(20000) + '</article>'; // < 1 MB nhưng chữ dài → cắt ở MAX_TEXT
  const { f } = mk({ 'example.com': () => html(big) }); const out = await R.readArticle('https://example.com/', { fetch: f, resolve: dns({ 'example.com': PUB }) }); ok(out.text.length <= R.MAX_TEXT, 'chữ trả về ≤ ' + R.MAX_TEXT + ' ký tự');
}
{ // không bị "bom" thẻ: 100k thẻ mở không đóng / '<' liên tiếp xử lý nhanh
  const t0 = Date.now(), bomb = '<script>'.repeat(100000) + '<' .repeat(300000) + ' tail words. '.repeat(30);
  const o = R.extract(bomb); const bomb2 = R.extract('<div>'.repeat(120000) + 'Real sentence here that is long enough to keep around. '.repeat(10) + '<article'.repeat(40000));
  ok(Date.now() - t0 < 3000 && typeof o.text === 'string' && /Real sentence/.test(bomb2.text), 'rút chữ tuyến tính với đầu vào độc hại (' + (Date.now() - t0) + ' ms)');
}

// ---------- 4. Endpoint: CORS, hạn mức, mã lỗi, không lộ chi tiết ----------
{
  const realFetch = globalThis.fetch; let upstream = 0;
  globalThis.fetch = async (u, o) => { // DoH + trang đích giả
    const s = String(u); upstream++;
    if (s.startsWith('https://cloudflare-dns.com/dns-query')) { const q = new URL(s); const t = q.searchParams.get('type'), h = q.searchParams.get('name'); const ans = h === 'example.com' && t === 'A' ? [{ type: 1, data: '93.184.216.34' }] : h === 'private.example' && t === 'A' ? [{ type: 1, data: '10.0.0.8' }] : []; return new Response(JSON.stringify({ Answer: ans }), { headers: { 'Content-Type': 'application/dns-json' } }); }
    if (s.startsWith('https://example.com/')) return html(ARTICLE);
    throw new Error('mạng bị chặn trong test: ' + s);
  };
  let seq = 1; const call = (body, { origin = 'https://lexkite.com', ip = `203.0.113.${seq++}`, raw } = {}) => R.onRequestPost({ request: new Request('https://lexkite.com/api/readable', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, 'CF-Connecting-IP': ip }, body: raw ?? JSON.stringify(body) }), env: {} }).then(async r => ({ s: r.status, j: await r.json().catch(() => ({})), h: r.headers }));
  let r = await call({ url: 'https://example.com/post' });
  ok(r.s === 200 && r.j.title === 'The & Great Article' && /ephemeral/.test(r.j.text) && r.h.get('Access-Control-Allow-Origin') === 'https://lexkite.com' && r.h.get('Cache-Control') === 'no-store', 'GET bài hợp lệ → 200 + CORS + no-store');
  ok((await call({ url: 'http://169.254.169.254/latest/meta-data/' })).s === 403 && (await call({ url: 'http://127.0.0.1:80/' })).j.error === 'blocked', 'metadata/loopback → 403 blocked');
  ok((await call({ url: 'https://private.example/' })).j.error === 'blocked', 'DNS riêng → blocked');
  ok((await call({ url: 'ftp://example.com/' })).s === 400 && (await call({ url: 5 })).s === 400 && (await call({})).s === 400 && (await call(null, { raw: '{bad' })).s === 400, 'URL/giao thức/JSON sai → 400');
  ok((await call({ url: 'https://example.com/' + 'a'.repeat(2100) })).s === 400, 'URL > 2048 ký tự → 400');
  ok((await call({ url: 'https://example.com/' }, { origin: 'https://evil.example' })).s === 403, 'Origin lạ → 403');
  const before = upstream; await call({ url: 'http://localhost/' }); ok(upstream === before, 'URL bị chặn không gây lượt tải/DNS nào');
  const ip = '198.51.100.99'; let last; for (let i = 0; i < 4; i++) last = await call({ url: 'https://example.com/' }, { ip });
  ok(last.s === 429 && last.j.error === 'quota' && last.j.msg === 'quota.burst' && last.j.feature === 'readable', 'khách vượt 3 lượt/phút → 429 quota.burst (' + last.s + ')');
  globalThis.fetch = realFetch;
}

console.log(fails ? `✗ ${fails}/${n} lỗi` : `✓ ${n} kiểm tra – readable`);
process.exit(fails ? 1 : 0);
