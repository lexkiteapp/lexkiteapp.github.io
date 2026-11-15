// Test giới hạn thân request (functions/api/_body.js) + mọi endpoint functions/api/* đọc body qua helper (bảo mật 02/11).
// Trước đây các endpoint chỉ tin header Content-Length → khai CL nhỏ (hoặc chunked, không CL) rồi gửi hàng MB vẫn bị request.json() đệm hết.
// Kiểm: CL giả nhỏ + thân lớn → 413 và dừng đọc sớm (hủy luồng) · CL khai lớn → 413 không đọc · chunked không CL · UTF-8 nhiều byte · JSON hỏng → 400
//       · quét mã nguồn: không endpoint nào còn gọi request.json()/text()/arrayBuffer()/formData() trực tiếp.
// Chạy: node scripts/test/body-limit.mjs  (không mạng)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const B = await import(new URL('../../functions/api/_body.js', import.meta.url));

// Luồng giả: phát `total` byte theo khúc `chunk`, đếm số byte đã bị kéo + có bị hủy không
const src = (text, chunk = 16384) => {
  const u8 = new TextEncoder().encode(text); const st = { pulled: 0, cancelled: false };
  const body = new ReadableStream({
    pull(c) { if (st.pulled >= u8.length) return c.close(); const part = u8.slice(st.pulled, st.pulled + chunk); st.pulled += part.length; c.enqueue(part); },
    cancel() { st.cancelled = true; },
  }, { highWaterMark: 0 });
  return { body, st };
};
const fake = (pathName, text, { cl, headers = {}, chunk } = {}) => {
  const s = src(text, chunk);
  const h = new Headers({ 'Content-Type': 'application/json', Origin: 'https://lexkite.com', 'CF-Connecting-IP': '198.51.100.9', ...headers });
  if (cl != null) h.set('Content-Length', String(cl));
  return { req: { url: 'https://lexkite.com' + pathName, method: 'POST', headers: h, body: s.body }, st: s.st };
};
const big = n => JSON.stringify({ prompt: 'a'.repeat(n) });

// ---------- 1) Helper ----------
{
  const { req, st } = fake('/x', big(2_000_000), { cl: 50 }); // Content-Length GIẢ nhỏ
  let e = null; try { await B.readJSON(req, 65536); } catch (x) { e = x; }
  ok(e instanceof B.BodyError && e.status === 413, 'CL giả 50 B + thân 2 MB → 413');
  ok(st.pulled < 65536 + 16384 * 2 && st.cancelled, `dừng đọc sớm + hủy luồng (đã kéo ${st.pulled} B)`);
}
{
  const { req, st } = fake('/x', big(10), { cl: 999999 });
  let e = null; try { await B.readText(req, 65536); } catch (x) { e = x; }
  ok(e && e.status === 413 && st.pulled === 0, 'CL khai > trần → 413, không đọc byte nào');
}
{
  const { req, st } = fake('/x', big(300000)); // chunked: không có Content-Length
  let e = null; try { await B.readJSON(req, 65536); } catch (x) { e = x; }
  ok(e && e.status === 413 && st.cancelled, 'không Content-Length (chunked) + thân lớn → 413');
}
{
  const { req } = fake('/x', 'abc', { cl: 'abc' });
  let e = null; try { await B.readText(req, 65536); } catch (x) { e = x; }
  ok(e && e.status === 413, 'Content-Length không phải số → 413');
}
{
  const txt = JSON.stringify({ s: 'Tiếng Việt có dấu ✓ 日本語 🙂'.repeat(50) });
  const { req } = fake('/x', txt, { chunk: 7 }); // cắt giữa ký tự nhiều byte
  const v = await B.readJSON(req, 65536);
  ok(v && v.s === JSON.parse(txt).s, 'UTF-8 nhiều byte bị cắt giữa khúc vẫn ghép đúng');
  const bytes = new TextEncoder().encode(txt).length;
  const { req: r2 } = fake('/x', txt, { chunk: 7 });
  let e = null; try { await B.readText(r2, bytes - 1); } catch (x) { e = x; }
  ok(e && e.status === 413, 'trần tính theo BYTE (không theo số ký tự)');
}
{
  const { req } = fake('/x', '{bad json');
  let e = null; try { await B.readJSON(req, 1024); } catch (x) { e = x; }
  ok(e && e.status === 400 && e.code === 'json', 'JSON hỏng → 400 json');
  ok(JSON.stringify(B.bodyFail(new B.BodyError(413, 'too-large'), 'size')) === '{"status":413,"error":"size"}', 'bodyFail giữ mã lỗi 413 riêng của endpoint');
  const empty = await B.readText({ headers: new Headers(), body: null }, 10);
  ok(empty === '', 'không có body → chuỗi rỗng');
}

// ---------- 2) Endpoint thật: Content-Length giả nhỏ + thân vượt trần → 413 ----------
const DB = { prepare() { throw new Error('không được chạm DB khi body vượt trần'); }, batch() { throw new Error('db'); } };
globalThis.caches = { default: { async match() {}, async put() {}, async delete() {} } };
globalThis.fetch = async u => { throw new Error('mạng bị chặn trong test: ' + u); };
const ep = async (file, env, body, extra = {}) => {
  const m = await import(new URL('../../functions/api/' + file, import.meta.url));
  const { req, st } = fake('/api/' + file.replace(/\.js$/, ''), body, { cl: 10, ...extra });
  const r = await m.onRequestPost({ request: req, env, waitUntil: () => {} });
  return { s: r.status, st, text: await r.text() };
};
const ENV = { DB, TURNSTILE_SECRET_KEY: 'ts_test_SECRET', MAIL: {} };
for (const [file, size] of [['ai.js', 200000], ['contact.js', 100000], ['report.js', 1_000_000], ['human.js', 50000], ['handoff.js', 2_000_000], ['push.js', 50000]]) {
  const r = await ep(file, ENV, big(size));
  ok(r.s === 413, `${file}: Content-Length giả + thân ${size} B → 413 (được ${r.s})`);
  ok(r.st.cancelled || r.st.pulled < size, `${file}: không đệm hết thân (kéo ${r.st.pulled} B)`);
}
{ // hit: beacon thống kê – vượt trần → bỏ qua im lặng (204/200), không đọc hết
  const m = await import(new URL('../../functions/api/hit.js', import.meta.url));
  const { req, st } = fake('/api/hit', big(500000), { cl: 10 });
  const r = await m.onRequestPost({ request: req, env: { DB }, waitUntil: () => {} }).catch(e => ({ status: 'ném lỗi: ' + e.message }));
  ok(typeof r.status === 'number' && r.status < 400 && st.pulled < 500000, `hit: thân lớn → bỏ qua im lặng (${r.status})`);
}

// ---------- 3) Quét mã nguồn: mọi endpoint đọc body qua _body.js ----------
const dir = fileURLToPath(new URL('../../functions', import.meta.url));
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.js') ? [path.join(d, e.name)] : []);
const raw = /\b(request|req|context\.request)\.(json|text|arrayBuffer|formData|blob)\s*\(/;
for (const f of walk(dir)) {
  if (f.endsWith('_body.js')) continue;
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  const bad = lines.map((l, i) => (raw.test(l) ? i + 1 : 0)).filter(Boolean);
  ok(!bad.length, `${path.relative(dir, f)}:${bad.join(",")} đọc body trực tiếp – dùng readJSON/readText của _body.js`);
}

console.log(fails ? `✗ body-limit: ${fails}/${n} lỗi` : `✓ body-limit: ${n} kiểm tra – CL giả, chunked, UTF-8, mọi endpoint qua _body.js`);
process.exit(fails ? 1 : 0);
