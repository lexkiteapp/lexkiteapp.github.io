// Test Admin › Sổ tài khoản & khóa (functions/api/admin-accounts.js + _accounts_reg.js + web/js/admin-accounts.js) – docs/ACCOUNTS-LEDGER.md.
// Chạy: node scripts/test/accounts.mjs (không mạng, không tài khoản thật – D1 giả node:sqlite, token Firebase giả, GitHub API giả)
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const store = new Map();
globalThis.caches = { default: { async match(req) { const e = store.get(req.url); if (!e || e.exp <= Date.now()) return undefined; return new Response(e.body); },
  async put(req, res) { const age = +((res.headers.get('Cache-Control') || '').match(/max-age=(\d+)/) || [, 0])[1]; store.set(req.url, { body: await res.text(), exp: Date.now() + age * 1000 }); } } };
const sql = new DatabaseSync(':memory:');
const exec = (q, a) => /^\s*(SELECT|WITH)|RETURNING/i.test(q) ? { results: sql.prepare(q).all(...a) } : (sql.prepare(q).run(...a), { results: [] });
const DB = { prepare(q) { const st = { q, args: [], bind(...a) { return { ...st, args: a }; }, async run() { return exec(q, this.args); }, async all() { return exec(q, this.args); }, async first() { return exec(q, this.args).results[0] || null; } }; return st; },
  async batch(list) { const out = []; for (const x of list) out.push(await x.run()); return out; } };
const kp = await webcrypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await webcrypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1' };
const b64u = b => Buffer.from(b).toString('base64url'), sec = Math.floor(Date.now() / 1000);
const tok = async email => { const h = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1' })), p = b64u(JSON.stringify({ aud: 'lexkite-app', iss: 'https://securetoken.google.com/lexkite-app', exp: sec + 3600, iat: sec, auth_time: sec, sub: 'u-' + email, email, email_verified: true })); return h + '.' + p + '.' + b64u(await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(h + '.' + p))); };
const GKEY = 'AIzaSyA_TEST_gemini_key_number_one_1111', ENCK = Buffer.alloc(32, 5).toString('base64');
const GEMV = 'AIzaSyENV_gemini_env_secret_key_000000', DISP = 'github_pat_TESTdispatchTOKENvalue0123456789abcd';
let ghMode = 'names', ghCalls = 0;
globalThis.fetch = async (url, init = {}) => { url = String(url);
  if (url.includes('googleapis.com/robot') || url.includes('securetoken') || url.includes('service_accounts')) return { ok: true, json: async () => ({ keys: [jwk] }) };
  if (url.includes('api.github.com/repos/lexkiteapp/lexkiteapp.github.io/actions/secrets')) { ghCalls++; if (ghMode === '403') return new Response('{}', { status: 403 }); return new Response(JSON.stringify({ secrets: [{ name: 'CLOUDFLARE_API_TOKEN' }, { name: 'CF_POOL' }, { name: 'NEW_UNREGISTERED_SECRET' }, { name: 'GITHUB_TOKEN' }] }), { status: 200 }); }
  return new Response('{}', { status: 200 }); };
const A_MAIL = 'alice.admin@example.test', B_MAIL = 'bob.admin@example.test', X_MAIL = 'stranger@example.test', OWN = 'owner.person@example.test';
const ENV = { DB, ADMIN_EMAILS: A_MAIL + ',' + B_MAIL, GEMINI_KEY: GEMV, GH_DISPATCH_TOKEN: DISP, KEYS_ENC_KEY: Buffer.alloc(32, 5).toString('base64') };
const log = console.log; console.log = (...a) => { if (!/^(gemini|ai error)/.test(String(a[0]))) log(...a); };
const ACC = await import(new URL('../../functions/api/admin-accounts.js', import.meta.url));
const SH = await import(new URL('../../functions/api/admin-shared.js', import.meta.url));
const REG = await import(new URL('../../functions/api/_accounts_reg.js', import.meta.url));
const K = await import(new URL('../../functions/api/_keys.js', import.meta.url));
const A = await tok(A_MAIL), B = await tok(B_MAIL), X = await tok(X_MAIL);
const post = (mod, env = ENV) => async (tk, body, origin = 'https://lexkite.com') => {
  const r = await mod.onRequestPost({ request: new Request('https://lexkite.com/api/x', { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.8', Origin: origin, ...(tk ? { Authorization: 'Bearer ' + tk } : {}) }, body: JSON.stringify(body) }), env, waitUntil: () => {} });
  const text = await r.text(); let j = {}; try { j = JSON.parse(text); } catch (e) { /* bỏ qua */ } return { s: r.status, j, text };
};
const acc = post(ACC), shared = post(SH), ALL = [];
const rec = async p => { const r = await p; ALL.push(r.text); return r; };

// 1) Sổ đăng ký: chỉ tên, không email/giá trị; mọi secret dùng trong CI/Functions đều có mặt (tự đồng bộ tên)
{
  const raw = fs.readFileSync(new URL('../../functions/api/_accounts_reg.js', import.meta.url), 'utf8');
  ok(!/@[a-z0-9-]+\.[a-z]{2,}/i.test(raw.replace(/\w+@example/g, '')) && !K.looksSecret(raw), 'sổ đăng ký không chứa email/giá trị bí mật');
  const ids = REG.ROWS.map(r => r.id); ok(new Set(ids).size === ids.length, 'id duy nhất');
  ok(REG.ROWS.every(r => r.service && r.names.length && ['pages', 'github', 'local'].includes(r.store) && /^https:\/\//.test(r.manage) && (!r.expires || /^\d{4}-\d{2}-\d{2}$/.test(r.expires))), 'mỗi dòng đủ dịch vụ/tên/nơi lưu/link https/hạn hợp lệ');
  const gh = new Set(REG.ROWS.filter(r => r.store === 'github').flatMap(r => r.names)), pg = new Set(REG.ROWS.filter(r => r.store === 'pages').flatMap(r => r.names));
  const wf = new Set(); for (const f of fs.readdirSync(new URL('../../.github/workflows/', import.meta.url))) for (const m of fs.readFileSync(new URL('../../.github/workflows/' + f, import.meta.url), 'utf8').matchAll(/secrets\.([A-Z][A-Z0-9_]+)/g)) wf.add(m[1]);
  wf.delete('GITHUB_TOKEN'); const miss = [...wf].filter(n => !gh.has(n)); ok(!miss.length, 'secrets.X trong workflows đều có trong sổ' + (miss.length ? ': ' + miss.join(',') : ''));
  const fn = new Set(); const dir = new URL('../../functions/api/', import.meta.url);
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.js')) for (const m of fs.readFileSync(new URL(f, dir), 'utf8').matchAll(/\benv\.([A-Z][A-Z0-9_]{3,})/g)) if (/(KEY|TOKEN|SECRET|_SA|JWK)$|^ADMIN_EMAILS$/.test(m[1]) && !/(PUBLIC|API_BASE)/.test(m[1])) fn.add(m[1]);
  const miss2 = [...fn].filter(n => !pg.has(n)); ok(!miss2.length, 'bí mật Pages dùng trong functions đều có trong sổ' + (miss2.length ? ': ' + miss2.join(',') : ''));
}
// 2) Quyền: người lạ 403
{
  for (const body of [{ op: 'list' }, { op: 'set', id: 'pages-admin', owner: '' }]) { const r = await rec(acc(X, body)); ok(r.s === 403 && !r.j.rows, 'người lạ ' + body.op + ' → 403'); }
  ok((await acc(null, { op: 'list' })).s === 403, 'không token → 403'); ok((await acc(A, { op: 'list' }, 'https://evil.example')).s === 403, 'Origin lạ → 403'); ok((await acc(A, { op: 'nope' })).s === 400, 'op lạ → 400');
}
// 3) Danh sách: trạng thái có/thiếu, không lộ giá trị, GitHub đọc tên
{
  const r = await rec(acc(A, { op: 'list' })); ok(r.s === 200 && r.j.rows.length === REG.ROWS.length, 'A xem sổ');
  const g = id => r.j.rows.find(x => x.id === id), st = (row, n) => row.names.find(x => x.n === n).state;
  ok(st(g('pages-mail-ai'), 'GEMINI_KEY') === 'set' && st(g('pages-mail-ai'), 'RESEND_API_KEY') === 'missing', 'Pages: có/thiếu theo biến môi trường');
  ok(st(g('pages-admin'), 'ADMIN_EMAILS') === 'set', 'ADMIN_EMAILS báo "có" (không in giá trị)');
  ok(st(g('gh-cloudflare'), 'CLOUDFLARE_API_TOKEN') === 'set' && st(g('gh-cloudflare'), 'CF_ACCOUNT_2') === 'missing' && r.j.gh.ok, 'GitHub: đọc tên qua API (chỉ tên)');
  ok(r.j.extra.join() === 'NEW_UNREGISTERED_SECRET', 'secret có trên GitHub mà chưa đăng ký → báo "extra" (bỏ GITHUB_TOKEN)');
  ok(st(g('local-stitch'), '~/.config/lexkite/stitch-key') === 'local', 'tệp máy chỉ ghi nhận');
  const all = ALL.join(''); ok(!all.includes(GEMV) && !all.includes(DISP) && !all.toLowerCase().includes('alice.admin'), 'không phản hồi nào chứa giá trị bí mật/email admin');
  const n0 = ghCalls; await rec(acc(B, { op: 'list' })); ok(ghCalls === n0, 'tên GitHub cache 10 phút (không gọi lại)');
  ok(g('pages-github').expires === '2027-11-02' && g('pages-github').days > 14 && !g('pages-github').due, 'GH_DISPATCH_TOKEN hết hạn 02/11/2027, chưa tới hạn nhắc');
}
// 4) GitHub không đọc được → "chưa rõ", không lỗi
{
  sql.exec("DELETE FROM config WHERE k = 'acct_gh'"); ghMode = '403';
  const r = await rec(acc(A, { op: 'list' })); ok(r.s === 200 && !r.j.gh.ok && r.j.rows.find(x => x.id === 'gh-cloudflare').names.every(n => n.state === 'unknown') && !r.j.extra.length, 'thiếu quyền Secrets:read → trạng thái "chưa rõ"');
  sql.exec("DELETE FROM config WHERE k = 'acct_gh'"); ghMode = 'names';
}
// 5) Dùng chung: A nhập → B thấy; hạn sắp tới nhắc 14 ngày; kiểm giá trị; nhật ký; stamp
{
  const soon = new Date(Date.now() + 10 * 86400e3).toISOString().slice(0, 10), far = new Date(Date.now() + 40 * 86400e3).toISOString().slice(0, 10);
  ok((await rec(acc(A, { op: 'set', id: 'pages-github-issues', owner: OWN, account: 'GitHub chủ', expires: soon, note: 'gia hạn ở github.com/settings/tokens' }))).s === 200, 'A ghi email chủ + hạn');
  const rb = await rec(acc(B, { op: 'list' })); const row = rb.j.rows.find(x => x.id === 'pages-github-issues');
  ok(row.owner === OWN && row.expires === soon && row.due && row.days >= 9 && row.days <= 11 && rb.j.due.some(d => d.id === 'pages-github-issues'), 'B thấy email chủ + hạn, nằm trong nhắc 14 ngày');
  ok(row.by === 'a***@example.test', 'ghi vết ai sửa (đã che)');
  await rec(acc(B, { op: 'set', id: 'pages-github-issues', owner: OWN, account: 'GitHub chủ', expires: far, note: '' }));
  ok(!(await rec(acc(A, { op: 'list' }))).j.due.some(d => d.id === 'pages-github-issues'), 'B gia hạn → A thấy hết nhắc');
  for (const [body, why] of [[{ id: 'nope', owner: '' }, 'id lạ'], [{ id: 'pages-admin', owner: 'khong-phai-email' }, 'email sai'], [{ id: 'pages-admin', owner: '', expires: '2027-13-99x' }, 'hạn sai'], [{ id: 'pages-admin', owner: '', note: 'khóa ' + GEMV }, 'dán khóa vào ghi chú'], [{ id: 'pages-admin', owner: '', account: 'sk-ant-api03-' + 'x'.repeat(30) }, 'khóa trong tài khoản']]) {
    const r = await rec(acc(A, { op: 'set', ...body })); ok(r.s === 400, 'từ chối: ' + why);
  }
  const lg = sql.prepare("SELECT email, op, ok FROM admin_log WHERE op LIKE 'acct.%'").all();
  ok(lg.some(x => x.email === A_MAIL && x.op === 'acct.list' && x.ok === 1) && lg.some(x => x.email === B_MAIL && x.op === 'acct.set'), 'xem + sửa đều ghi admin_log (ai/lúc nào)');
  const st = await shared(B, { op: 'stamp' }); ok(st.j.areas.accounts && st.j.areas.accounts.at > 0 && st.j.areas.accounts.by.endsWith('@example.test'), 'stamp.accounts → admin khác tự làm mới');
  ok(ACC.daysLeft('2027-11-02', Date.parse('2027-10-19T00:00:00Z')) === 15 && ACC.daysLeft('bad') === null && ACC.daysLeft('2026-01-01', Date.parse('2026-01-03T00:00:00Z')) < 0, 'daysLeft đúng');
}
// 6) Giao diện
{
  const ui = fs.readFileSync(new URL('../../web/js/admin-accounts.js', import.meta.url), 'utf8'), ad = fs.readFileSync(new URL('../../web/js/admin.js', import.meta.url), 'utf8');
  ok(/AdminSync\.watch\(\['accounts'\]/.test(ui) && /esc\(/.test(ui) && !/innerHTML\s*=\s*[^;`]*\+\s*r\./.test(ui), 'UI tự làm mới + thoát HTML');
  ok(/\['accounts', '🗂️'/.test(ad) && /async accounts\(main\)[^\n]*\n[^\n]*\n\s*AdminAccounts\.render\(main,/.test(ad), 'có mục (hub Tài khoản & khóa) + view vẽ vào đúng host main (R1)');
}
console.log = log;
if (fails) { console.log(`✗ accounts: ${fails}/${n} kiểm tra lỗi`); process.exit(1); }
console.log(`✓ accounts: ${n} kiểm tra – sổ chỉ tên, tự đồng bộ tên với CI/Functions, có/thiếu, GitHub, dùng chung A↔B, nhắc hạn 14 ngày, quyền, nhật ký`);
